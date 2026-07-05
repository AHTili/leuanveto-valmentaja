// audit-engine.mjs
// Deterministinen sääntö-pohjainen auditori. Käy läpi traces[], lisää auditFlags
// jokaiseen trace-snapshottiin. Tarkoitus tunnistaa ≥80% issueista ilman LLM-tukea.
//
// Severity-luokat:
//   🐛 ERROR    — selkeä bug, tarvitsee korjauksen
//   ⚠️ WARN     — design-mismatch tai mahdollinen issue
//   📋 INFO     — havainto, ei välitön toimi
//   💬 UX       — UI-kommunikaatio-aukko
//   ✅ OK       — sääntö passi (omitettu auditFlags:sta default:lla)

import {
  VL_CAP_BASELINES,
  BLOCK_PHASE_TARGET_RIR_EXPECTED,
  DELOAD_DELTA_RANGE,
  RAMP_EXPECTED_TOP_PCT,
  CUT_DEFICIT_THRESHOLD,
  DELTA_PCT_HARD_CLAMP,
  DELTA_PCT_EXPECTED_RANGE,
  // ENG-14: lisätyt invariantit (Latella, Refalo, Sánchez-Moreno)
  TIER_PROGRESSION_MULT_BASELINES,
  FAILURE_DROP_BASELINE,
  REP1_MPV_SLOPE_BASELINE,
} from "./audit-baselines.mjs";

// v4.52.16 H-007 B3 (A4): K-β-HRV-tarkistuksia varten — engine.js:stä
// computeHrvBaseline + computeHrvBaselineDrift. Käytössä auditInvariants:in
// K-β-HRV-haarassa kun trace.input.measurements on annettu.
import {
  computeHrvBaseline,
  computeHrvBaselineDrift,
  // H-010 P1c (A2): elävä identity-gate
  detectPrimaryMovementIdentityMismatch,
} from "../../../engine.js";

function flag(code, severity, msg, extra = {}) {
  return { code, severity, msg, ...extra };
}

// Päättele blockPhase trace:sta tai mesocycle-tyypistä.
// Default-mesoeille käytetään heuristista mappingia:
//   vk 1-3 = foundation (volyymipohjainen),
//   vk 4   = deload (default-mesolla aina vk 4 = deload).
function deriveBlockPhase(trace) {
  const weekLabel = trace.output?.weekLabel || "";
  // Eksplisiittiset weekLabel-matchit
  if (/deload|kevennys|recovery/i.test(weekLabel)) return "deload";
  if (/peak|peaking|kisaviikko|taper/i.test(weekLabel)) return "peaking";
  // v4.49.2 Q1: default-meson "Loading" + "Overreach" labelit ovat strength/intensity-
  // vaihetta (RIR 0-3), eivät foundation (RIR 2-5). Tunnista ne ennen yleistä
  // foundation-matchia.
  if (/load(ing)?|overreach|realisoint|maks/i.test(weekLabel)) return "intensity";
  if (/strength/i.test(weekLabel)) return "strength";

  // v4.49.2 MED-4: hypertrofia-meso ennen yleistä label-foundation-matchia, koska
  // labelit ("Volyymipohja", "Volyymilataus", "Volyymipeak") laukaisevat "vol"-regexin
  // mutta hypertrofia on oma vaihe (MAV-zone RIR 2.5, ei foundation RIR 4).
  if (trace.input?.mesocycleType === "hypertrofia") {
    const w = trace.weekNum;
    if (w === 4) return "deload";
    if (w >= 1 && w <= 3) return "hypertrophy";
    return "unknown";
  }

  if (/adapt(aatio)?/i.test(weekLabel)) return "foundation";
  if (/hyper|foundation|vol|progress/i.test(weekLabel)) return "foundation";

  // Streetlifting_16w mapping:
  if (trace.input?.mesocycleType === "streetlifting_16w") {
    const w = trace.weekNum;
    if (w === 4 || w === 8 || w === 12) return "deload";
    if (w <= 3) return "foundation";
    if (w <= 7) return "strength";
    if (w <= 11) return "intensity";
    return "peaking";
  }

  // Single-block-mesoille (default, wendler531 jne.): vk 4 deload, muutoin foundation
  const w = trace.weekNum;
  if (w === 4) return "deload";
  if (w <= 3) return "foundation";
  return "unknown";
}

// ──────────────────────────────────────────────────────────────
// K1: warmup-skeleton vs UI hardcoded ramp
// ──────────────────────────────────────────────────────────────
// Detection:
//   slot.warmupSets on määritelty engine-output:issa MUTTA
//   UI hardcodes [0.30, 0.55, 0.75, 0.90] — yliraskas neural primer foundation V3-V4:lle.
//   Trace-tasolla emme näe UI-koodia, joten käytetään proxy-sääntöä:
//     - jos primary-slot.warmupSets sisältää viimeisen step:n joka on ≤ 0.85
//     - JA ko. trace on heavy-day + foundation/strength-phase + targetVx ≥ 3
//     → UI tulisi näyttää slot.warmupSets:in viim. step (0.85) MUTTA hardcodaa 0.90
//     → K1 päättely: warmup-skeleton ei toteudu UI:ssa
function auditK1(trace) {
  const slots = trace.output?.slots || [];
  const primary = slots.find((s) => s.role === "primary");
  if (!primary) return null;
  const phase = deriveBlockPhase(trace);
  const isHeavyDay = trace.output?.dayType === "heavy";
  // K1 koskee heavy-day + foundation/strength/intensity -phasea. Peaking sallii 90% ramp:in.
  const phaseHeavyEnough = phase === "foundation" || phase === "strength" || phase === "intensity";
  const targetVx = primary.targetVx;
  if (!isHeavyDay || !phaseHeavyEnough) return null;
  if (typeof targetVx !== "number") return null;

  // v4.49.2 QF-1: Variant B (UI hardkoodaa 0.90) POISTETTU — UI lukee nyt slot.warmupSets:in
  // skeletonia (index.html:11816 v4.49.2 -korjaus). Variant A jää regression-suojaksi
  // mutta WARN-tasolla (UI:n hardcoded fallback [0.30,0.55,0.75,0.90] on Helms 2017
  // -ramp; ei tappavaa virhettä, mutta engine voisi tarjota täsmällisemmän skeletonin).
  if (!Array.isArray(primary.warmupSets) || primary.warmupSets.length === 0) {
    return flag(
      "K1",
      "⚠️ WARN",
      `Primary slot.warmupSets puuttuu (heavy ${phase} V${targetVx}, ${primary.movementName}). ` +
        `Engine ei tarjoa warmup-skeletonia → UI:n hardcoded ramp [0.30,0.55,0.75,0.90] fallback käytössä.`,
      { phase, targetVx, slotMov: primary.movementName, variant: "skeleton-missing" },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// K2: rep1Range käyttää BLOCK_PHASE_TARGET_RIR, ei slot.targetVx
// ──────────────────────────────────────────────────────────────
// v4.49.2 Q1: Engine.js targetRep1VelocityRange ottaa nyt slot.targetVx parametrina
// ja toteuttaa hybridi-päätöksen (RTF-reliable + ei-bias → slot luotettu, muuten
// min(slot, block-default)). SLOT_TARGETVx_RESOLVED-trace dokumentoi miten päätös
// tehtiin.
//
// K2 laukeaa nyt vain genuine mismatch-tilanteissa:
//   - slot.targetVx on selvästi ulkona tutkimusrangesta ko. phase:lle
//     (Pareja-Blanco 2017 / Sánchez-Moreno 2017 VL-RIR-kartta), TAI
//   - SLOT_TARGETVx_RESOLVED-trace puuttuu mutta primary-slot on olemassa
//     (engine ei kutsu targetRep1VelocityRange:a primary-slotille)
//
// Phase-RIR-rangeт (VL %-pohjaiset):
//   foundation   25-35 % → RIR 2-5
//   hypertrophy  25-35 % → RIR 1-4 (MAV-zone)
//   strength     15-20 % → RIR 1-4
//   intensity    10-15 % → RIR 0-3
//   peaking      5-10 %  → RIR 0-2
//   speed-streng 10-15 % → RIR 2-5 (nopeuden säilytys)
const K2_RIR_RANGES = {
  foundation: { min: 2, max: 5 },
  hypertrophy: { min: 1, max: 4 },
  strength: { min: 1, max: 4 },
  intensity: { min: 0, max: 3 },
  peaking: { min: 0, max: 2 },
  "speed-strength": { min: 2, max: 5 },
};

function auditK2(trace) {
  const slots = trace.output?.slots || [];
  const primary = slots.find((s) => s.role === "primary");
  if (!primary || typeof primary.targetVx !== "number") return null;
  let phase = deriveBlockPhase(trace);
  if (phase === "unknown" || phase === "deload") return null;
  const slotVx = primary.targetVx;

  // v4.49.2 Q1: Speed-strength-variant tunnistus movement name:sta (sama logiikka
  // kuin engine.js targetRep1VelocityRange). Räjähtävä leuka/leuanveto + nopeusveto
  // -variantit eivät käytä ko. blokin RIR-rangea, vaan speed-strength-rangea (RIR 2-5).
  const movName = primary.movementName || "";
  const variantName = primary.variantName || "";
  const isSpeedStrength = /räjähtävä\s+(leuka|leuanveto)|nopeus(?:veto)?/i.test(movName) ||
                          /räjähtävä|nopeus/i.test(variantName);
  if (isSpeedStrength) {
    phase = "speed-strength";
  }

  // 1) Slot.targetVx ulkona tutkimusrangesta
  const range = K2_RIR_RANGES[phase];
  if (range && (slotVx < range.min || slotVx > range.max)) {
    // v4.49.2 Q1: Hand-tuned preset opt-out. Sama logiikka kuin DELTA_PCT_TIER_
    // AGGRESSIVE → PRESET_PROGRESSION_BY_DESIGN — _programMeta.handTuned=true tai
    // tierProgressionApplied=false viittaa siihen että ohjelmatekijä on tarkoituk-
    // sellisesti valinnut targetVx-arvot tutkimuspohjan ulkopuolelta (esim. Akselin
    // streetlifting_16w peaking-singlet V3 raskailla kuormilla).
    const programMeta = trace.input?.programMeta || {};
    const isHandTuned = programMeta.handTuned === true || programMeta.tierProgressionApplied === false;
    if (isHandTuned) {
      return flag(
        "PRESET_TARGETVX_BY_DESIGN",
        "📋 INFO",
        `Primary slot.targetVx=${slotVx} ulkona tutkimusrangesta ${phase} (RIR ${range.min}–${range.max}), ` +
          `mutta meso _programMeta.handTuned=true → presetti-tekijä valinnut tämän tarkoituksellisesti.`,
        { phase, slotVx, expectedRange: range, slotMov: primary.movementName, variant: "out-of-range-hand-tuned" },
      );
    }
    return flag(
      "K2",
      "🐛 ERROR",
      `Primary slot.targetVx=${slotVx} ulkona tutkimusrangesta ${phase} (RIR ${range.min}–${range.max}). ` +
        `Pareja-Blanco 2017 / Sánchez-Moreno 2017: ko. phase:n VL-RIR-kartta ei tue tätä arvoa.`,
      { phase, slotVx, expectedRange: range, slotMov: primary.movementName, variant: "out-of-range" },
    );
  }

  // 2) Engine ei käytä slot.targetVx:ää — SLOT_TARGETVx_RESOLVED-trace puuttuu
  const hasResolvedTrace = (trace.traces || []).some((t) => t?.ruleId === "SLOT_TARGETVx_RESOLVED");
  if (!hasResolvedTrace) {
    return flag(
      "K2",
      "⚠️ WARN",
      `Primary slot.targetVx=${slotVx} on tutkimusrangessa, mutta SLOT_TARGETVx_RESOLVED-trace puuttuu — ` +
        `engine ei näytä käyttävän slot.targetVx:ää rep1Range-laskennassa (engine.js targetRep1VelocityRange).`,
      { phase, slotVx, slotMov: primary.movementName, variant: "no-resolved-trace" },
    );
  }

  return null;
}

// ──────────────────────────────────────────────────────────────
// K3: backoff-velocityStop + primary-rep1Range samalla UI-panelilla
// ──────────────────────────────────────────────────────────────
// v4.49.2 QF-3: UI-korjaus rakennettu — velocityStop näkyy per-slot exercise-
// heading-subBits:issä ("💎 Velocity-ankkuri · zone ≥ X.XX m/s", index.html:5975),
// EI vel-panelin "Zone-kynnys"-rivissä. Primary ja backoff renderöityvät erikseen
// omina exercise:inä, joten atletti näkee oikean arvon ko. slotille.
//
// Säilytetty regression-suojaksi mutta laukea vain jos:
//   - Molemmilla slot:eilla on velocityStop
//   - JA arvot eroavat ≥ 0.10 m/s (selkeästi erottuva, ei pieni jitter)
//   - JA velocityStopRenderedPerSlot-marker puuttuu (eli UI ei nimenomaisesti
//     ilmoita per-slot-renderöintiä)
//
// Tällä kynnyksellä streetlifting_16w:n primary 0.45 / backoff 0.55 ei laukea (ero
// 0.10), mutta jos jossain meso:ssa primary 0.40 / backoff 0.60 (ero 0.20), se
// nostaa lipun jolla atletti tarkistaa että UI selvittää eron.
function auditK3(trace) {
  const slots = trace.output?.slots || [];
  const primary = slots.find((s) => s.role === "primary");
  const backoff = slots.find((s) => s.role === "backoff");
  if (!primary || !backoff) return null;
  const pStop = primary.velocityStop ?? null;
  const bStop = backoff.velocityStop ?? null;
  if (pStop === null || bStop === null) return null;
  const diff = Math.abs(pStop - bStop);
  if (diff < 0.15) return null; // by-design ero (esim. 0.45 vs 0.55), UI näyttää per-slot
  return flag(
    "K3",
    "💬 UX",
    `Primary+backoff velocityStop eroaa ${diff.toFixed(2)} m/s (primary=${pStop}, backoff=${bStop}). ` +
      `Tarkista että UI näyttää molemmat selkeästi per-slot-tasolla.`,
    {
      primaryStop: pStop,
      backoffStop: bStop,
      primaryVx: primary.targetVx,
      backoffVx: backoff.targetVx,
      diff,
    },
  );
}

// ──────────────────────────────────────────────────────────────
// OBS-CORE SP-2 (2026-05-30): slot-load-johdonmukaisuus.
// Saman liikkeen ei-primary-slotti (back-off/secondary) jonka engine resolvoi
// kuorman (resolvedLoadKg) ei saa olla raskaampi kuin primary-slotin kuorma.
// Olisi napannut OBS-CORE-bugin: sessionEffectiveE1RM = target/loadPct inflatoi
// e1RM:n (193.6 vs tosi 181.3) → back-off 64 > pää 62, apuliike 73,5 > pää.
// 0.5 kg toleranssi pyöristykselle.
// ──────────────────────────────────────────────────────────────
function auditSp2SlotLoad(trace) {
  const slots = trace.output?.slots || [];
  const primary = slots.find((s) => s.role === "primary");
  if (!primary) return null;
  const primaryName = primary.movementName || primary.defaultMovementName || null;
  const primaryLoad =
    typeof trace.output?.targetExternalLoad === "number"
      ? trace.output.targetExternalLoad
      : typeof primary.resolvedLoadKg === "number"
        ? primary.resolvedLoadKg
        : null;
  if (primaryName == null || primaryLoad == null) return null;
  // Intensiteetti-tietoinen (2026-06-02): raskaampi-by-design (top single / opener — VÄHEMMÄN
  // efektiivisiä toistoja kuin pää) EI ole SP-2-rikko. Vain suunniteltu kevyemmäksi/yhtä raskaaksi
  // (slot.reps+Vx ≥ pään reps+Vx) joka resolvoituu > pää = aito inflaatio. Cal pl. (belt-and-suspenders).
  const primMax = (primary.reps != null && primary.targetVx != null) ? primary.reps + primary.targetVx : null;
  const violators = slots.filter((s) => {
    if (s.role === "primary" || s.role === "calibration") return false;
    if ((s.movementName || s.defaultMovementName) !== primaryName) return false;
    if (typeof s.resolvedLoadKg !== "number" || s.resolvedLoadKg <= primaryLoad + 0.5) return false;
    const slotMax = (s.reps != null && s.targetVx != null) ? s.reps + s.targetVx : null;
    const heavierByDesign = slotMax != null && primMax != null && slotMax < primMax;
    return !heavierByDesign;
  });
  if (violators.length === 0) return null;
  const worst = violators.reduce((a, b) => (b.resolvedLoadKg > a.resolvedLoadKg ? b : a));
  return flag(
    "SP-2",
    "🐛 ERROR",
    `Saman liikkeen ei-primary-slotti raskaampi kuin pää: ${worst.role} ${primaryName} ${worst.resolvedLoadKg} kg > pää ${primaryLoad} kg. ` +
      `Slot-resolveri-inflaatio (vrt. OBS-CORE: sessionEffectiveE1RM = target/loadPct).`,
    {
      primaryName,
      primaryLoad,
      violatorRole: worst.role,
      violatorLoad: worst.resolvedLoadKg,
      violatorCount: violators.length,
    },
  );
}

// ──────────────────────────────────────────────────────────────
// Sääntö: deltaPct hard-clamp (engine.js:3733 maxDelta default 0.25)
// + heuristinen progression-range per tier (Latella 2020)
// ──────────────────────────────────────────────────────────────
function auditDeltaPctClamp(trace, profile = null) {
  const dp = trace.output?.deltaPct;
  if (typeof dp !== "number") return null;
  const phase = deriveBlockPhase(trace);

  // Deload-vk: range [-30%, -15%]
  if (phase === "deload" || trace.output?.weekLabel?.match(/deload/i)) {
    if (dp < DELOAD_DELTA_RANGE.min || dp > DELOAD_DELTA_RANGE.max) {
      return flag(
        "DELOAD_DELTA_OUT_OF_RANGE",
        "⚠️ WARN",
        `Deload-vk deltaPct=${(dp * 100).toFixed(1)}% ulkopuolella range:n [${(DELOAD_DELTA_RANGE.min * 100).toFixed(0)}%, ${(DELOAD_DELTA_RANGE.max * 100).toFixed(0)}%].`,
        { deltaPct: dp, expected: DELOAD_DELTA_RANGE },
      );
    }
    return null;
  }

  // Hard-clamp: engine sallii ±25% — Error vain tämän ulkopuolelta
  if (dp < DELTA_PCT_HARD_CLAMP.minDefault - 0.001 || dp > DELTA_PCT_HARD_CLAMP.maxDefault + 0.001) {
    return flag(
      "DELTA_PCT_HARD_CLAMP_VIOLATION",
      "🐛 ERROR",
      `deltaPct=${(dp * 100).toFixed(2)}% ulkona [-25%, +25%] hard-clamp:sta — engine.js:3734 clamp ohitettu?`,
      { deltaPct: dp, capLevel: trace.output?.capLevel },
    );
  }

  // Heuristinen tier-pohjainen warn — vain positiivinen deltaPct
  // OHITUS: hand-tuned presetit (esim. streetlifting_16w) joissa tier-progression EI sovellu.
  // Akseli (2026-05-12): _programMeta.tierProgressionApplied:false -mesoeille emit
  // PRESET_PROGRESSION_BY_DESIGN INFO-flag, ei TIER_AGGRESSIVE WARN.
  if (dp > 0 && profile?.meta?.level) {
    const programMeta = trace.input?.programMeta || trace.input?._programMeta;
    const isHandTunedPreset = programMeta?.handTuned === true || programMeta?.tierProgressionApplied === false;

    const tierLimit =
      profile.meta.level === "beginner"
        ? DELTA_PCT_EXPECTED_RANGE.beginnerMax
        : profile.meta.level === "elite"
          ? DELTA_PCT_EXPECTED_RANGE.eliteMax
          : DELTA_PCT_EXPECTED_RANGE.advancedMax;

    if (dp > tierLimit) {
      if (isHandTunedPreset) {
        return flag(
          "PRESET_PROGRESSION_BY_DESIGN",
          "📋 INFO",
          `deltaPct=${(dp * 100).toFixed(1)}% ylittää ${profile.meta.level}-tier:in expected max ${(tierLimit * 100).toFixed(1)}%, ` +
            `mutta meso _programMeta.handTuned=true → tier-progression opt-out (skeleton-tekijä määrittää curven).`,
          { deltaPct: dp, tier: profile.meta.level, tierLimit, source: programMeta?.source },
        );
      }
      return flag(
        "DELTA_PCT_TIER_AGGRESSIVE",
        "⚠️ WARN",
        `deltaPct=${(dp * 100).toFixed(1)}% ylittää ${profile.meta.level}-tier:in expected max ${(tierLimit * 100).toFixed(1)}% (Latella 2020 / Helms 2018).`,
        { deltaPct: dp, tier: profile.meta.level, tierLimit },
      );
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// Sääntö: e1RM peräkkäin null kun historiaa on
// ──────────────────────────────────────────────────────────────
function auditE1RMContinuity(trace, sessionIndex, allTracesForProfile) {
  const e1rm = trace.output?.e1rmExternal;
  if (e1rm !== null) return null;
  if (sessionIndex < 3) return null; // ensimmäiset 3 sessiota OK olla null
  // Tarkista että lasketuksi olisi pitänyt: trace.input.allSetsCount >= 3
  if ((trace.input?.allSetsCount ?? 0) < 3) return null;
  return flag(
    "E1RM_NULL_PERSISTENT",
    "⚠️ WARN",
    `e1rmExternal=null vaikka historiaa on (sessio ${sessionIndex}, sets=${trace.input.allSetsCount}). ` +
      `Engine ei laskeneet e1RM:ää — todennäköisesti puuttuvat top/calibration-sarjat.`,
    { sessionIndex, allSetsCount: trace.input.allSetsCount },
  );
}

// ──────────────────────────────────────────────────────────────
// Sääntö: peräkkäin failure (FAILURE_DETECTED) ilman block-aware-vastausta
// ──────────────────────────────────────────────────────────────
function auditFailureLockout(trace) {
  const hasFailure = trace.traces?.some((t) => t.ruleId === "FAILURE_DETECTED");
  const hasLockout = trace.traces?.some((t) => t.ruleId === "FAILURE_LOCKOUT");
  if (hasFailure && !hasLockout && trace.output?.deltaPct > 0) {
    return flag(
      "FAILURE_NO_LOCKOUT",
      "🐛 ERROR",
      "FAILURE_DETECTED tracessa mutta deltaPct > 0 — failure-lockout ei aktivoitunut (engine.js:3720-3730).",
      { deltaPct: trace.output.deltaPct },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// Sääntö: ramp-skeleton:in viimeinen pct < 0.5 — anomalia
// ──────────────────────────────────────────────────────────────
function auditWarmupRampShape(trace) {
  const primary = (trace.output?.slots || []).find((s) => s.role === "primary");
  if (!primary || !Array.isArray(primary.warmupSets) || primary.warmupSets.length === 0) return null;
  const last = primary.warmupSets[primary.warmupSets.length - 1];
  if (last?.pct < 0.5) {
    return flag(
      "WARMUP_RAMP_SHALLOW",
      "📋 INFO",
      `Warmup-ramp:in viim. step on vain ${(last.pct * 100).toFixed(0)}% — saattaa olla riittämätön heavy-day:llä.`,
      { lastPct: last.pct },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// Sääntö: error-state recommend():issa
// ──────────────────────────────────────────────────────────────
function auditErrorState(trace) {
  if (trace.output?.error) {
    return flag(
      "REC_ERROR",
      "🐛 ERROR",
      `recommend() palautti error: ${trace.output.error} — ${trace.output.errorMessage ?? "(no message)"}`,
      { error: trace.output.error },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// Sääntö: deload-mismatch — pitäisi olla volume-day-tyyppi
// ──────────────────────────────────────────────────────────────
function auditDeloadDayType(trace) {
  const phase = deriveBlockPhase(trace);
  const isDeload = phase === "deload" || trace.output?.weekLabel?.match(/deload/i);
  if (!isDeload) return null;
  const dt = trace.output?.dayType;
  if (dt === "heavy") {
    return flag(
      "DELOAD_HEAVY_DAYTYPE",
      "⚠️ WARN",
      `Deload-vk:lla dayType="heavy" — engine.js:n deload-override tulisi pakottaa volume-day.`,
      { dayType: dt, weekLabel: trace.output?.weekLabel },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// Sääntö: adaptive multi-suggestion -rakenne (v4.50.0 Track B 2D-δ)
// ──────────────────────────────────────────────────────────────
// Verifioi että rec.suggestions on rakenteellisesti kunnossa:
//   - suggestions[] sisältää 1-3 alkiota (1 jos fallback, 2 jos AGGRESSIVE
//     piilotettu, 3 normaalitilanteessa)
//   - TARGET-suggestion on aina olemassa
//   - defaultSuggestionId viittaa olemassa olevaan suggestion-id:hen
//   - jokaisella suggestion:lla on validi id ("safe" | "target" | "aggressive")
//   - TARGET-tier:n arvot vastaavat rec.targetExternalLoad / targetVx /
//     deltaPct (backward compat — kriittinen olemassa olevien lukijoiden
//     toiminnalle)
function auditSuggestions(trace) {
  const suggestions = trace.output?.suggestions;
  const defaultSuggestionId = trace.output?.defaultSuggestionId;

  // Error-state recommend():ssa → ei suggestions-vaatimusta
  if (trace.output?.error) return null;
  // Maintenance-mode tai before-start → ei suggestions-vaatimusta
  if (trace.output?.dayType === "maintenance") return null;

  if (suggestions === null || suggestions === undefined) {
    return flag(
      "SUGGESTIONS_MISSING",
      "🐛 ERROR",
      "rec.suggestions puuttuu kokonaan — adaptive multi-suggestion -rakenne ei ole generoitunut.",
      {},
    );
  }
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return flag(
      "SUGGESTIONS_EMPTY",
      "🐛 ERROR",
      `rec.suggestions tyhjä — odotetaan vähintään TARGET-tier (sai ${Array.isArray(suggestions) ? suggestions.length : "ei-array"}).`,
      { suggestionsLength: Array.isArray(suggestions) ? suggestions.length : null },
    );
  }

  const validIds = new Set(["safe", "target", "aggressive"]);
  const seenIds = new Set();
  for (const s of suggestions) {
    if (!s || !validIds.has(s.id)) {
      return flag(
        "SUGGESTION_INVALID_ID",
        "🐛 ERROR",
        `rec.suggestions sisältää väärän id:n: ${s?.id ?? "(null)"}. Validit: safe / target / aggressive.`,
        { invalidId: s?.id ?? null },
      );
    }
    seenIds.add(s.id);
  }

  if (!seenIds.has("target")) {
    return flag(
      "SUGGESTIONS_TARGET_MISSING",
      "🐛 ERROR",
      "TARGET-suggestion puuttuu — engine ei voi palauttaa rec:ä ilman TARGET-tier:iä.",
      { ids: Array.from(seenIds) },
    );
  }

  if (!defaultSuggestionId || !seenIds.has(defaultSuggestionId)) {
    return flag(
      "SUGGESTION_DEFAULT_INVALID",
      "🐛 ERROR",
      `defaultSuggestionId="${defaultSuggestionId}" ei ole suggestions-listalla [${Array.from(seenIds).join(", ")}].`,
      { defaultSuggestionId, availableIds: Array.from(seenIds) },
    );
  }

  // Backward compat: TARGET-tier:n arvot vastaavat rec.targetExternalLoad /
  // targetVx / deltaPct. Q4 A-päätös — kaikki olemassa olevat lukijat luottavat
  // tähän pariteettiin.
  const targetTier = suggestions.find((s) => s.id === "target");
  const recLoad = trace.output?.targetExternalLoad;
  const recVx = trace.output?.targetVx;
  const recDeltaPct = trace.output?.deltaPct;
  if (
    targetTier.targetExternalLoad !== recLoad ||
    targetTier.targetVx !== recVx ||
    Math.abs((targetTier.deltaPct ?? 0) - (recDeltaPct ?? 0)) > 1e-6
  ) {
    return flag(
      "SUGGESTION_TARGET_PARITY",
      "🐛 ERROR",
      `TARGET-suggestionin arvot eivät vastaa rec.targetExternalLoad/targetVx/deltaPct — backward compat rikkoutunut.`,
      {
        targetTier: {
          load: targetTier.targetExternalLoad,
          vx: targetTier.targetVx,
          deltaPct: targetTier.deltaPct,
        },
        rec: { load: recLoad, vx: recVx, deltaPct: recDeltaPct },
      },
    );
  }

  return null;
}

// ──────────────────────────────────────────────────────────────
// Pää-funktio: audita yksi trace
// ──────────────────────────────────────────────────────────────
export function auditTrace(trace, sessionIndex = 0, allTracesForProfile = [], profile = null) {
  const flags = [];

  const checks = [
    auditK1(trace),
    auditK2(trace),
    auditK3(trace),
    auditSp2SlotLoad(trace),
    auditDeltaPctClamp(trace, profile),
    auditE1RMContinuity(trace, sessionIndex, allTracesForProfile),
    auditFailureLockout(trace),
    auditWarmupRampShape(trace),
    auditErrorState(trace),
    auditDeloadDayType(trace),
    auditSuggestions(trace),
  ];

  // ENG-14: auditInvariants palauttaa arrayn (0..N flagia) — flatataan checks:iin
  const invariantFlags = auditInvariants(trace, profile);
  if (Array.isArray(invariantFlags)) {
    for (const f of invariantFlags) checks.push(f);
  }

  for (const c of checks) {
    if (c) flags.push(c);
  }

  trace.auditFlags = flags;
  return flags;
}

// ──────────────────────────────────────────────────────────────
// ENG-14: auditInvariants — tarkista että engine ehdottaa arvoja
// tutkimuspohjaisten turvarajojen sisällä.
//
// Yksi totuuden lähde: audit-baselines.mjs (ei kovakoodausta).
//
// INVARIANT-KATE (mikä invariantti tarkistetaan miltä trace-kanavalta):
//   A VL-cap (VL_CAP_BASELINES)              → trace.traces[VL_CAP_RESOLVED].after.cap
//   C Deload Δ% (DELOAD_DELTA_RANGE)         → trace.output.deltaPct + deload-detect
//   D Tier-mult (TIER_PROGRESSION_MULT_BASELINES) → trace.output.deltaPct vs tier-mult
//      Tarkistus aktivoituu vain jos programMeta.tierProgressionApplied !== false
//      (Akselin streetlifting_16w-preset on by-design opt-out).
//   G Slot-Vx (BLOCK_PHASE_TARGET_RIR_EXPECTED) → trace.traces[SLOT_TARGETVx_RESOLVED]
//
// EI INVARIANTTIKATETTA (engine-säätökanavat joita ei voi auditoida runtime-traceista):
//   B Rep1 MPV slope (REP1_MPV_SLOPE_BASELINE): engine.js-vakio targetRep1VelocityRange-
//      funktiossa, ei runtime-trace. Henkilökohtainen RTF-malli (kun reliable) voi
//      poiketa priorin keskiarvosta tolerance-arvon verran — tämä on engine-side-
//      tarkistus jota ei voi audita ulkopuolelta. Toistaiseksi: EI tarkasteta.
//   E Failure-drop (FAILURE_DROP_BASELINE): engine.js failureReaction-funktion
//      sisäinen laskenta. Tulos näkyy e1RM:ssä mutta tarkkaa drop-%:tia ei
//      emit:ata erilliseen traceen. Toistaiseksi: EI tarkasteta.
//   F Block-residual (ISSURIN_BLOCK_RESIDUALS): mesocycle-compile-time-rakenne
//      (data.js generateMultiBlockMesocycle), ei runtime-päätös. Auditoidaan
//      mesocycle-luonti-vaiheessa, ei trace-tasolla.
//   H Sex modifier (SEX_MODIFIER): wizard-mapper-tasoinen (q15+q08+q02 →
//      recoveryCapacity), ei engine-runtime. Auditoidaan wizard-mapping-
//      vaiheessa, ei trace-tasolla.
//
// Tämä eksplisiittinen "ei katetta" -lista on ohjeen ENG-14 vaatimuksen mukainen
// — älä jätä kanavia hiljaa pois. Niiden auditointi on jätetty myöhempään
// vaiheeseen (ENG-15 voi tuottaa edge-case-dataa B:tä varten, F+H tarvitsevat
// erillisen compile-time-auditorin).
//
// INVARIANT_VIOLATION-flagin sisältö: kanava, ehdotettu arvo, invariantti,
// rikkonut raja (min tai max), ylityksen suuruus.
// ──────────────────────────────────────────────────────────────
export function auditInvariants(trace, profile = null) {
  const flags = [];
  const traces = Array.isArray(trace.traces) ? trace.traces : [];

  // ─── A: VL-cap per phase ────────────────────────────────────
  // ENG-16 Round B / hypoteesi (b) opt-out (Akselin valinta 2026-05-18):
  // default-mesotyypin VL-cap-tarkistus ohitetaan tunnettuna aukkona.
  // Default-meso on hybridi (Ma=heavy + Ke=volume + Pe=speed,
  // data.js:2888), joka ei seuraa puhtaita Pareja-Blanco-rangeja.
  // Pareja-Blanco-rangeihin nojaava A-kanava ei sovellu sellaisenaan.
  //
  // TÄRKEÄÄ — opt-out EI väitä enginen oikeaksi. Oikeellisuus on AVOIN
  // ja LYKÄTTY: jos default-meso nostetaan eliittitason tavoitelistaan,
  // VL-cap-oikeellisuus on avattava omana syvätutkimuksena (=(c) ankku-
  // roituna omiin DEFAULT_MESO_VL_CAP_BASELINES-rangeihin TAI tietoinen
  // harjoitusteoreettinen määritys). Liputettu tunnettuna aukkona
  // ledgeriin (L9, ks. korjauskierroksen raportti).
  //
  // SCOPE: opt-out rajattu vain default-mesotyyppiin. C (Deload), D
  // (Tier-mult), G (Slot-Vx) säilyvät tarkistettuina default-mesolle.
  // Muut mesotyypit (streetlifting_16w, hypertrofia, wendler531,
  // ...) säilyvät A-kanavan tarkistuksen alla.
  const isDefaultMeso = trace.input?.mesocycleType === "default";
  if (!isDefaultMeso) {
    const vlCapTrace = traces.find((t) => t.ruleId === "VL_CAP_RESOLVED");
    if (vlCapTrace && typeof vlCapTrace.after?.cap === "number") {
      // L8 / Round B Commit 2 — (ii)-vertailu, ei (i)-romahdus.
      // Engine.js:2992 emittoi tracen kentällä `effectivePhase` mutta tämä
      // koodi luki aiemmin kenttää `phase` (rivi: `vlCapTrace.after.phase ||
      // deriveBlockPhase(trace)`). Kenttä-mismatch → after.phase oli AINA
      // undefined → audit fallbackasi aina deriveBlockPhase-luokitukseen,
      // näkemättä enginen omaa phase-arviota. (i)-romahdusratkaisu olisi
      // vaihtanut nimen ja antanut auditin korvata oman arvionsa enginen
      // arviolla; sen sijaan tehdään (ii)-vertailu:
      //   1. Audit LUKEE enginen effectivePhase-arvon (näkee sen)
      //   2. Audit SÄILYTTÄÄ itsenäisen deriveBlockPhase-arvionsa
      //   3. Audit FLAGAA PHASE_MISMATCH eksplisiittisesti kun arviot eroavat
      // VL-cap-vertailu pysyy auditPhase:n pohjalla — itsenäinen vastapaine
      // säilyy. Mismatch on diagnostinen signaali, ei rikkomus → INFO-taso.
      const enginePhase = vlCapTrace.after?.effectivePhase;
      const auditPhase = deriveBlockPhase(trace);

      if (enginePhase && enginePhase !== auditPhase) {
        flags.push(
          flag(
            "PHASE_MISMATCH",
            "📋 INFO",
            `L8 phase-mismatch: engine sanoo "${enginePhase}", audit sanoo "${auditPhase}". Itsenäinen vastapaine — engine luokittelee dayType+blockPhase+targetVx-yhdistelmällä, audit weekLabel-tekstistä. Aito erimielisyys tai weekLabel-heuristiikan rajaus; ei automaattinen rikkomus.`,
            {
              channel: "phase_mismatch",
              enginePhase,
              auditPhase,
              vlCap: vlCapTrace.after.cap,
            },
          ),
        );
      }

      const phase = auditPhase;
      const baseline = VL_CAP_BASELINES[phase];
      if (baseline) {
        const cap = vlCapTrace.after.cap;
        if (cap < baseline.min || cap > baseline.max) {
          flags.push(
            flag(
              "INVARIANT_VIOLATION",
              "🐛 ERROR",
              `Invariantti A (VL-cap): phase=${phase}, ehdotettu cap=${cap}% on ulkona rajasta [${baseline.min}%, ${baseline.max}%]. Ylitys: ${cap < baseline.min ? (baseline.min - cap).toFixed(1) + "% alle min:n" : (cap - baseline.max).toFixed(1) + "% yli max:n"}.`,
              {
                channel: "vl_cap",
                invariant: "A",
                phase,
                proposedValue: cap,
                boundMin: baseline.min,
                boundMax: baseline.max,
                source: baseline.source,
              },
            ),
          );
        }
      }
    }
  }

  // ─── C: Deload Δ% ────────────────────────────────────────────
  // Tarkistetaan vain deload-viikoilla. Päällekkäinen auditDeltaPctClamp:in
  // (WARN) kanssa — ENG-14 emittoi ERROR-tason INVARIANT_VIOLATION:n
  // täydentäväksi (samalla rangella).
  const phaseForDelta = deriveBlockPhase(trace);
  const isDeload = phaseForDelta === "deload" || /deload|kevennys|recovery/i.test(trace.output?.weekLabel || "");
  if (isDeload && typeof trace.output?.deltaPct === "number") {
    const dp = trace.output.deltaPct;
    if (dp < DELOAD_DELTA_RANGE.min || dp > DELOAD_DELTA_RANGE.max) {
      flags.push(
        flag(
          "INVARIANT_VIOLATION",
          "🐛 ERROR",
          `Invariantti C (Deload Δ%): deltaPct=${(dp * 100).toFixed(2)}% on ulkona rajasta [${(DELOAD_DELTA_RANGE.min * 100).toFixed(0)}%, ${(DELOAD_DELTA_RANGE.max * 100).toFixed(0)}%].`,
          {
            channel: "deload_delta_pct",
            invariant: "C",
            proposedValue: dp,
            boundMin: DELOAD_DELTA_RANGE.min,
            boundMax: DELOAD_DELTA_RANGE.max,
            source: DELOAD_DELTA_RANGE.source,
          },
        ),
      );
    }
  }

  // ─── D: Tier-progression multiplier ──────────────────────────
  // Tarkistetaan vain jos tier on tunnettu JA tierProgressionApplied != false.
  // Streetlifting_16w (Akseli) -preset käyttää by-design suurempia hyppyjä
  // tierProgressionApplied:false-flagilla — se on tarkoituksellinen poikkeus,
  // ei rajaylitys.
  const tier = profile?.meta?.level;
  const programMeta = trace.input?.programMeta || trace.input?._programMeta;
  const tierProgressionApplied = programMeta?.tierProgressionApplied;
  if (
    tier &&
    TIER_PROGRESSION_MULT_BASELINES[tier] &&
    tierProgressionApplied !== false &&
    typeof trace.output?.deltaPct === "number" &&
    trace.output.deltaPct > 0 &&
    !isDeload
  ) {
    const baseline = TIER_PROGRESSION_MULT_BASELINES[tier];
    const dp = trace.output.deltaPct;
    if (dp > baseline.max) {
      flags.push(
        flag(
          "INVARIANT_VIOLATION",
          "🐛 ERROR",
          `Invariantti D (Tier-progression): tier=${tier}, deltaPct=${(dp * 100).toFixed(2)}% ylittää tier-mult-rajan ${(baseline.max * 100).toFixed(2)}%/vk. Ylitys: ${((dp - baseline.max) * 100).toFixed(2)}%.`,
          {
            channel: "tier_progression_mult",
            invariant: "D",
            tier,
            proposedValue: dp,
            boundMax: baseline.max,
            source: baseline.source,
          },
        ),
      );
    }
  }

  // ─── G: Slot target Vx per phase ─────────────────────────────
  const slotVxTrace = traces.find((t) => t.ruleId === "SLOT_TARGETVx_RESOLVED");
  if (slotVxTrace && typeof slotVxTrace.after?.targetVx === "number") {
    const phase = slotVxTrace.after.phase || deriveBlockPhase(trace);
    const expected = BLOCK_PHASE_TARGET_RIR_EXPECTED[phase];
    if (typeof expected === "number") {
      const actual = slotVxTrace.after.targetVx;
      // Tolerance ±1 RIR-yksikkö (engine voi pyöristää, slot.targetVx voi
      // overridata block-defaultin). INVARIANT_VIOLATION laukeaa vain
      // selvistä poikkeamista (esim. peaking-vaiheessa Vx=5 = liian helppo).
      const tolerance = 1;
      if (Math.abs(actual - expected) > tolerance) {
        flags.push(
          flag(
            "INVARIANT_VIOLATION",
            "🐛 ERROR",
            `Invariantti G (Slot target Vx): phase=${phase}, targetVx=${actual} poikkeaa odotetusta ${expected} enemmän kuin tolerance ±${tolerance}.`,
            {
              channel: "slot_target_vx",
              invariant: "G",
              phase,
              proposedValue: actual,
              expected,
              tolerance,
            },
          ),
        );
      }
    }
  }

  // ─── K-A2: SAFE↔target e1RM-monotonia (AC-A2) ────────────────
  // R-kierros 1 / mittari-infra. STAATINEN detektio: jos sessio palauttaa
  // SAFE- ja TARGET-suggestiot, Epley e1RM = kg × (1 + (reps+Vx)/30) on
  // monotoninen internal-load-mitta. SAFE on määritelmällisesti
  // konservatiivisempi vaihtoehto — sen e1RM EI saa olla suurempi kuin
  // TARGET:n e1RM. Jos näin on (esim. target 69×5 V3 → safe 68×5 V4:
  // target e1RM=87,40 vs safe e1RM=88,40), label "varovainen" ja todellinen
  // internal load erkanevat. EI muutosta engineen.
  const suggestionsForA2 = Array.isArray(trace.output?.suggestions)
    ? trace.output.suggestions
    : [];
  const targetSugg = suggestionsForA2.find((s) => s.id === "target");
  const safeSugg = suggestionsForA2.find((s) => s.id === "safe");
  if (
    targetSugg && safeSugg &&
    typeof targetSugg.targetExternalLoad === "number" &&
    typeof targetSugg.targetReps === "number" &&
    typeof targetSugg.targetVx === "number" &&
    typeof safeSugg.targetExternalLoad === "number" &&
    typeof safeSugg.targetReps === "number" &&
    typeof safeSugg.targetVx === "number"
  ) {
    const targetE1RM =
      targetSugg.targetExternalLoad * (1 + (targetSugg.targetReps + targetSugg.targetVx) / 30);
    const safeE1RM =
      safeSugg.targetExternalLoad * (1 + (safeSugg.targetReps + safeSugg.targetVx) / 30);
    if (safeE1RM > targetE1RM) {
      flags.push(
        flag(
          "INVARIANT_VIOLATION_K_A2",
          "🐛 ERROR",
          `K-A2 SAFE↔target e1RM-monotonia: safe ${safeSugg.targetExternalLoad}×${safeSugg.targetReps} V${safeSugg.targetVx} (e1RM=${safeE1RM.toFixed(2)}) vaatii korkeamman 1RM:n kuin target ${targetSugg.targetExternalLoad}×${targetSugg.targetReps} V${targetSugg.targetVx} (e1RM=${targetE1RM.toFixed(2)}). Label "varovainen" ja internal load erkanevat (engine.js:3131-3164).`,
          {
            channel: "k_a2",
            ac: "A2",
            targetLoad: targetSugg.targetExternalLoad,
            targetReps: targetSugg.targetReps,
            targetVx: targetSugg.targetVx,
            targetE1RM,
            safeLoad: safeSugg.targetExternalLoad,
            safeReps: safeSugg.targetReps,
            safeVx: safeSugg.targetVx,
            safeE1RM,
            delta: safeE1RM - targetE1RM,
          },
        ),
      );
    }
  }

  // ─── K-A1: intra-session-feedback rooli-leikkaus (AC-A1) — SULJETTU 2026-07-04 ─────
  // R-kierros 1 / mittari-infra loi tämän STAATTISEN detektion olettaen että UI:n
  // intra-session-filter on primary/backoff-only. Kanava flagasi ehdoitta JOKAISEN
  // secondary-slotin (targetVx + sets ≥ 2) verifioimatta UI:n todellista tilaa →
  // detektori vanheni: nykyinen kattavuus (verifioitu koodista, KORI 5 -triage):
  //   1. Near-failure-säätö (deficit ≥2 → −2,5 %, index.html ~13796) kattaa roolit
  //      primary + backoff + SECONDARY.
  //   2. V0-failurereaktio (K3-3 D1-v2: loput sarjat −5 % kaikissa blokeissa) kattaa
  //      KAIKKI roolit — ei roolifiltteriä.
  //   3. Top-single-re-ankkurointi (K3-2) kattaa primary/secondary/backoff.
  //   4. H-017 D1 (cross-slot backoff-re-resolve) on tarkoituksella backoff-only —
  //      ratifioitu rajaus (raskaita openereita ei kosketa), EI AC-A1:n aukko.
  // → AC-A1:n vaatima intra-session-feedback secondary-rooleille TOTEUTUU. Kanava
  // eläkkeistetty (10 väärää 🐛-flagia/16 vk poistuu). Jos secondary-kattavuus joskus
  // regressoituu, oikea vahti on selaintesti UI-filtterille — ei sokea staattinen flag.

  // ─── K-A6D: velocity-stop ↔ Vx-tavoite -ristiriita (AC-A6-DET) ─
  // R-kierros 1 / mittari-infra. STAATINEN konfiguraatiotarkistus: jos slot:lla
  // on velocityStop määritelty (UI laukaisee "harkitse kuorman laskua tai
  // sarjan lopettamista" -varoituksen index.html:12925-12939 kun
  // velocity < velocityStop) JA samalla targetVx >= 2 (atletilla yhä reilu
  // vara Vx-mittarin mukaan), signaalit voivat olla ristiriidassa: velocity
  // → "lopeta", Vx → "jatka". Legitiimit konfiguraatiot (peaking-rangea,
  // targetVx ≤ 1) jäävät pois — tällöin sekä velocity- että Vx-signaali
  // sopivat near-failure-tilaan. EI muutosta engineen.
  const slotsForA6D = trace.output?.slots || [];
  for (const slot of slotsForA6D) {
    if (typeof slot.velocityStop !== "number" || slot.velocityStop <= 0) continue;
    // K-A6D-korjaus (VELOCITY_VX_RECONCILE, 2026-06-02): RTF-reconciled velocityStop
    // (= velocityAtTargetRir) laukeaa TÄSMÄLLEEN targetVx-varalla → ei ennenaikainen → ei
    // konflikti. Ohita. AITO invariantti, EI mute: staattinen/reconciloimaton velocityStop
    // + targetVx≥2 laukeaisi yhä (engine-korjauksen jälkeen sellaista ei enää synny).
    if (slot.velocityStopSource === "rtf-reconciled") continue;
    if (typeof slot.targetVx !== "number") continue;
    if (slot.targetVx < 2) continue;
    flags.push(
      flag(
        "INVARIANT_VIOLATION_K_A6D",
        "🐛 ERROR",
        `K-A6D velocity-stop ↔ Vx -ristiriita: slot "${slot.movementName || "?"}" velocityStop=${slot.velocityStop} m/s + targetVx=${slot.targetVx} (≥2 vara). UI-varoitus "harkitse kuorman laskua tai sarjan lopettamista" voi laueta vaikka atletilla on Vx-mittarin mukaan vielä reilu vara — signaalit ristiriidassa ilman VELOCITY_VX_RECONCILE-yhteensovitusta.`,
        {
          channel: "k_a6d",
          ac: "A6_DET",
          role: slot.role,
          movementName: slot.movementName,
          velocityStop: slot.velocityStop,
          targetVx: slot.targetVx,
        },
      ),
    );
  }

  // ─── B2/A3: slot-mismatch — kuorma-intentti-kenttien ristiriita (AC-A3) ─
  // H-001 B2/A3 (HANDOFF.md §6 K2(1)-A "tiukka" ratifiointi 2026-05-25):
  // detektoi slotin note "@XX%" ristiriidan slot.loadPct:n kanssa. loadPct
  // on kanoninen kuorma-intentti-kenttä (HANDOFF.md §5 kohta 6) — note
  // tulisi johtaa siitä. Toleranssi 0,5 prosenttiyksikköä.
  //
  // resolvedLoadKg ei sisälly tähän detektoriin (K2(2)-OK ratifiointi) —
  // se on ajonaikainen resolvoitu arvo, legitiimisti poikkeava
  // loadPct × e1RM-arvosta (esim. Lähde 1 V/reps-pohjainen pct, cross-ref
  // cfgFloor, rate-limit + progressio-laskelma).
  //
  // Detektori on TIUKKA (Akselin K2(1)-A): pause/pin/tempo-variantti-
  // spesifikaatiosta riippumatta, kaikki note-pct ≠ loadPct -ristiriidat
  // laukeavat. B2/A2 normalisoi AI Block Tuning -syötteen sloteille
  // (upcomingBlock.prescribed); tämä detektori toimii varakeinona
  // runtime-trace-sloteille (rec.dayPlan.slots) joiden lähde on
  // data.js-mesosyklitemplaatti (B2:n scope-rajaus ulkopuolella).
  const slotsForSlotMismatch = trace.output?.slots || [];
  for (const slot of slotsForSlotMismatch) {
    if (typeof slot.loadPct !== "number" || slot.loadPct <= 0) continue;
    if (typeof slot.note !== "string") continue;
    const m = slot.note.match(/@\s*(\d+(?:[.,]\d+)?)\s*%/);
    if (!m) continue;
    const notePct = parseFloat(m[1].replace(",", ".")) / 100;
    if (!Number.isFinite(notePct)) continue;
    // H-002 B3: cross-ref-haara. Jos slot kantaa refScale + nominalLoadPct
    // -metadatan (data.js laDay tuottaa cross-ref-with-scaling -sloteille),
    // validoi (a) loadPct ≈ nominalLoadPct × refScale JA (b) notePct ≈
    // nominalLoadPct. Jos MOLEMMAT checkit pitävät (≤ 0,5 pp) → legitiimi
    // cross-ref-slot, ei flagia. Muuten putoaa nykyiseen tiukkaan
    // |notePct − loadPct| -tarkistukseen (HANDOFF.md §2 A3).
    if (typeof slot.refScale === "number" && typeof slot.nominalLoadPct === "number") {
      const scaledPct = slot.nominalLoadPct * slot.refScale;
      const loadPctDeltaPp = Math.abs(slot.loadPct - scaledPct) * 100;
      const noteDeltaPp = Math.abs(notePct - slot.nominalLoadPct) * 100;
      if (loadPctDeltaPp <= 0.5 && noteDeltaPp <= 0.5) continue;
    }
    const deltaPp = Math.abs(notePct - slot.loadPct) * 100;
    if (deltaPp <= 0.5) continue; // toleranssi 0,5 pp
    flags.push(
      flag(
        "INVARIANT_VIOLATION_SLOT_MISMATCH",
        "🐛 ERROR",
        `B2/A3 slot-mismatch: slot "${slot.movementName || "?"}" (role=${slot.role}) note "${(slot.note || "").slice(0, 80)}" sisältää @${(notePct * 100).toFixed(1)}% mutta slot.loadPct=${(slot.loadPct * 100).toFixed(1)}% (Δ ${deltaPp.toFixed(1)} pp, toleranssi 0,5 pp). loadPct on kanoninen kuorma-intentti-kenttä (HANDOFF.md §5 kohta 6) — note tulisi johtaa loadPct:stä. B2/A2 normalisoi AI Block Tuning -syötteen serialisoinnissa; tämä flag laukeaa runtime-sloteille joiden lähde on data.js-mesosyklitemplaatti.`,
        {
          channel: "slot_mismatch",
          ac: "A3",
          role: slot.role,
          movementName: slot.movementName,
          note: slot.note,
          notePct,
          loadPct: slot.loadPct,
          deltaPp,
        },
      ),
    );
  }

  // ─── K-β-HRV-1/2/4: HRV-baseline data-availability + drift (H-007 A4) ──
  // H-007 B3 (HANDOFF H-007 §2 A4): tunnista HRV-tila trace.input.measurements
  // -arrayn pohjalta computeHrvBaseline + computeHrvBaselineDrift -funktioilla.
  // Pilot-skenaariot eivät yleensä syötä measurements:ia (HRV ei vaikuta
  // recommend()-laskentaan H-007:ssa) → tämä haara skippaa hiljaisesti
  // pilot-skenaarioissa ja säilyttää 136 audit-flagia baseline-tason.
  // K-β-HRV-3 (bias-mekanismi) ja K-β-HRV-5 (MVT-guard) eivät kuulu H-007:n
  // scopeen — bias-puoli lykätty H-007b:lle empiriaan rakentumisen jälkeen.
  const measurements = trace.input?.measurements;
  const currentDateISO = trace.input?.dateISO || trace.dateISO;
  if (Array.isArray(measurements) && currentDateISO) {
    // K-β-HRV-1: HRV_DATA_AVAILABILITY — n < 7 viim. 30 päivänä
    const cutoff30Ts = new Date(currentDateISO).getTime() - 30 * 86400000;
    const hrv30 = measurements.filter(m =>
      m && m.type === "HRV" && typeof m.value === "number" && m.value > 0 &&
      m.dateISO && new Date(m.dateISO).getTime() >= cutoff30Ts
    );
    if (hrv30.length > 0 && hrv30.length < 7) {
      flags.push(flag(
        "HRV_DATA_AVAILABILITY",
        "⚠️ WARN",
        `K-β-HRV-1 HRV_DATA_AVAILABILITY: HRV-syöttö epätasaista (n=${hrv30.length} / 30 päivänä, alle 7 kynnyksen). Plews 2013 -baseline-luotettavuus vaatii vähintään 7 mittausta — harkitse päivittäistä syöttöä.`,
        { channel: "K-β-HRV", subFlag: "K-β-HRV-1", ac: "A4", n30: hrv30.length, threshold: 7 },
      ));
    }
    // K-β-HRV-2: BASELINE_SIZE — rolling-7 baseline.n < 14 (ideaali)
    const baseline = computeHrvBaseline(measurements, currentDateISO);
    if (baseline && baseline.n > 0 && baseline.n < 14) {
      flags.push(flag(
        "HRV_BASELINE_SIZE",
        "💬 INFO",
        `K-β-HRV-2 HRV_BASELINE_SIZE: rolling-7-baseline rakentumassa (n=${baseline.n} / 14 ideaali, status="${baseline.status}"). Plews 2013: 7 minimi luotettavalle baselinelle, 14 ideaali HRV-ohjattuun treeniin.`,
        { channel: "K-β-HRV", subFlag: "K-β-HRV-2", ac: "A4", n: baseline.n, status: baseline.status, idealN: 14 },
      ));
    }
    // K-β-HRV-4: DRIFT_DETECTION — |driftPct| > 10% recent vs historical
    const drift = computeHrvBaselineDrift(measurements, currentDateISO);
    if (drift && drift.status === "warning") {
      const sign = drift.driftPct > 0 ? "+" : "";
      flags.push(flag(
        "HRV_BASELINE_DRIFT",
        "⚠️ WARN",
        `K-β-HRV-4 HRV_BASELINE_DRIFT: HRV-mediaani siirtynyt ${sign}${(drift.driftPct * 100).toFixed(1)}% recent-7 vs historical-7 (recent=${drift.recentMedian?.toFixed(1)} ms, n=${drift.recentN}; historical=${drift.historicalMedian?.toFixed(1)} ms, n=${drift.historicalN}). Plews 2013: yli 10% drift = signaali joko teknisestä kehityksestä/regressiosta, palautumiskuorma-muutoksesta tai mittauslaite-virheestä — vaatii atletin tarkistuksen.`,
        { channel: "K-β-HRV", subFlag: "K-β-HRV-4", ac: "A4",
          driftPct: drift.driftPct, recentMedian: drift.recentMedian, historicalMedian: drift.historicalMedian,
          recentN: drift.recentN, historicalN: drift.historicalN },
      ));
    }
  }

  // ─── K-β-1/2/4/5: Primer-pohjainen sys-1RM-päivitys (H-006b A3) ──
  // H-006b B3 (HANDOFF H-006b §2 A3): tunnista recommend()-traces:sta
  // PRIMER_SYS1RM_OVERRIDE-rivit ja emittoi K-β-flagit kBetaFlags-arrayn pohjalta.
  // Severity-aste:
  //   - K-β-1 PRIMER_DATA_AVAILABILITY: WARN (primer-flow käynnistetty, velocity null)
  //   - K-β-2 BASELINE_SIZE: INFO (baseline rakentumassa n<5)
  //   - K-β-4 DRIFT_DETECTION: WARN (baseline-mediaani siirtynyt >10% / 4 vk)
  //   - K-β-5 MVT_GUARD: WARN (sys-1RM clamp ±15% extreme-suoja aktivoitui)
  const primerOverrideTraces = traces.filter(t => t.ruleId === "PRIMER_SYS1RM_OVERRIDE");
  for (const pt of primerOverrideTraces) {
    const kBetaFlags = Array.isArray(pt.after?.kBetaFlags) ? pt.after.kBetaFlags : [];
    for (const kf of kBetaFlags) {
      if (!kf || typeof kf.code !== "string") continue;
      if (kf.code === "K-β-1") {
        flags.push(flag(
          "PRIMER_DATA_AVAILABILITY",
          "⚠️ WARN",
          `K-β-1 PRIMER_DATA_AVAILABILITY: primer-flow käynnistetty mutta velocityRep1 null (reason=${kf.reason}). Sys-1RM-päivitys ei aktivoitunut — fallback nimelliseen e1RM:ään. Tarkista Enode-mittaus / manuaalisyöttö.`,
          { channel: "K-β", subFlag: "K-β-1", ac: "A3", reason: kf.reason },
        ));
      } else if (kf.code === "K-β-2") {
        flags.push(flag(
          "BASELINE_SIZE",
          "💬 INFO",
          `K-β-2 BASELINE_SIZE: primer-baseline rakentumassa (n=${kf.n || 0} / 5). Sys-1RM-päivitys ei vielä aktivoidu — tarvitaan vähintään 5 primer-mittausta per liike luotettavaa baseline-mediaania varten.`,
          { channel: "K-β", subFlag: "K-β-2", ac: "A3", n: kf.n || 0, threshold: 5 },
        ));
      } else if (kf.code === "K-β-4") {
        flags.push(flag(
          "BASELINE_DRIFT_DETECTED",
          "⚠️ WARN",
          `K-β-4 BASELINE_DRIFT_DETECTED: primer-baseline-mediaani siirtynyt ${(kf.driftPct * 100).toFixed(1)}% 4 vk:n yli (recent=${kf.currentMedian?.toFixed(3)} m/s, n=${kf.recentN}; historical=${kf.historicalMedian?.toFixed(3)} m/s, n=${kf.historicalN}). Atletti voi olla teknisesti kehittynyt TAI mittauslaite kalibroitu väärin — harkitse retest-protokollaa.`,
          { channel: "K-β", subFlag: "K-β-4", ac: "A3",
            driftPct: kf.driftPct, currentMedian: kf.currentMedian, historicalMedian: kf.historicalMedian,
            recentN: kf.recentN, historicalN: kf.historicalN },
        ));
      } else if (kf.code === "K-β-5") {
        flags.push(flag(
          "MVT_GUARD_CLAMPED",
          "⚠️ WARN",
          `K-β-5 MVT_GUARD_CLAMPED: sys-1RM-deltaPct clampattiin ±15% extreme-rajaan (preClamp=${(kf.preClampDelta * 100).toFixed(1)}% → clamped=${(kf.clampedDelta * 100).toFixed(1)}%, limit=±${(kf.limit * 100).toFixed(0)}%). Pareja-Blanco 2017: extreme = neuromuskulaarinen fatiikka tai mittausvirhe — tarkista primer-mittauksen luotettavuus.`,
          { channel: "K-β", subFlag: "K-β-5", ac: "A3",
            preClampDelta: kf.preClampDelta, clampedDelta: kf.clampedDelta, limit: kf.limit },
        ));
      }
    }
  }

  // ─── H-010 P1c (A2): Elävä identity-coherence-gate ──────────────
  // Vertaa e1RM-source-movementId (recommend()-syöte, trace.input.primaryMovementId)
  // näytettyyn primary-slot-liikkeeseen (trace.output.slots primary). Mismatch =
  // H-008-bugiluokka: ankkuroitu liike näyttää TOISEN liikkeen e1RM:stä johdettua
  // kuormaa (esim. MU +82 leuanveto-e1RM:stä). Tuning-vapaa identity-invariantti
  // (detectPrimaryMovementIdentityMismatch, H-009 P1a a12e766). ERROR-gate.
  //
  // Edellytys puhtaalle ajolle: pilot-harnessin per-päivä-pmid-fideliteetti
  // (H-010 A1) — ilman sitä kiinteä catalog[0]-pmid tuottaisi 72 false-positivea.
  const idE1rmSource = trace.input?.primaryMovementId ?? null;
  const idShownSlot = (trace.output?.slots || []).find((s) => s.role === "primary");
  const idShown = idShownSlot ? (idShownSlot.movementName || null) : null;
  const idResult = detectPrimaryMovementIdentityMismatch(idE1rmSource, idShown);
  if (idResult.mismatch) {
    flags.push(
      flag(
        "PRIMARY_MOVEMENT_IDENTITY_MISMATCH",
        "🐛 ERROR",
        `Identity-mismatch (H-008-luokka): näytetty primary-liike "${idShown}" mutta e1RM/target johdettu liikkeestä "${idE1rmSource}" (X≠Y). Ankkuroitu liike näyttää toisen liikkeen e1RM:stä johdettua kuormaa — fyysisesti epäuskottava (vrt. H-008 MU +82 kg leuanveto-e1RM:stä). Tuning-vapaa identity-invariantti.`,
        { channel: "identity", e1rmSource: idE1rmSource, shown: idShown, reason: idResult.reason },
      ),
    );
  }

  return flags;
}

// Pää-funktio: audita koko profile:n trace-array
export function auditProfile(profileResult, profile = null) {
  const allFlags = [];
  profileResult.traces.forEach((t, idx) => {
    const flags = auditTrace(t, idx, profileResult.traces, profile);
    flags.forEach((f) =>
      allFlags.push({
        weekNum: t.weekNum,
        dayOfWeek: t.dayOfWeek,
        dateISO: t.dateISO,
        ...f,
      }),
    );
  });

  // Cross-trace audits (esim. progression-monotonisuus, K4)
  crossTraceProgression(profileResult, allFlags);

  // K6-2: preskriptio-sanity (jokainen iso kuormamuutos selittyy tai flagataan)
  crossTracePrescriptionSanity(profileResult, allFlags, profile);

  return allFlags;
}

// ─── K6-2 (2026-07-05, Akselin ratifioima "vahti ensin"): PRESCRIPTION_SANITY ───
// Kenttäjuuri: atletti joutui korjaamaan kuormia käsin joka treenissä (Heavy negative
// 69,5 vs tehty 77,5; hammer curl 42,5 vs 24) — "outous" ei jäänyt koneellisesti kiinni.
// Kanava vertaa saman liikkeen PERÄKKÄISIÄ preskriptioita SAMALLA toistomäärällä
// (pilotissa simulaattorin toteuma ≈ preskriptio → proxy "viime toteumalle"; sama
// vertailu jonka atletti tekee päässään). Muutos alle −10 % tai yli +15 % vaatii
// SELITTÄVÄN säännön saman päivän traceista: selitetty → 📋-jälki (audit trail),
// selittämätön → 🐛 PRESCRIPTION_SANITY. v1-epätarkkuus dokumentoitu: selittäjä-
// joukko on päivätasoinen (ei slot-kohtainen) — riittää kenttäluokan kiinniottoon.
function crossTracePrescriptionSanity(profileResult, allFlags, profile = null) {
  const DOWN_RULES = new Set([
    "BREAK_RELOAD_SLOT", "RETURN_FROM_BREAK", "BREAK_MODIFIER",
    "POST_BREAK_ANCHOR_CAP", "POST_BREAK_ANCHOR_CAP_SLOT", "SUSTAINABILITY_CAP",
    "MU_AUTO_REGULATE", "DELOAD_OVERRIDE", "E1RM_DEFLATION_CAP",
    "VARA_TREND_CORRECTION", "INTRA_SESSION_ADJUST", "READINESS_CAP",
  ]);
  const UP_RULES = new Set([
    "PLAN_BASED_E1RM", "ACCESSORY_FLOOR_CAP", "FIRST_SET_CAPACITY_BONUS",
    "E1RM_INFLATION_CAP", "CFG_DRIFT_APPLIED", "CAL_OVERRIDE", "CALIBRATION_E1RM",
    "PROGRESSION_FLOOR_CAP",
  ]);
  const DOWN_T = 0.90, UP_T = 1.15;
  const last = new Map(); // "movement|reps" → { load, weekNum, dayOfWeek, deload }
  const deloadWeeks = new Set(); // blokkiraja-selittäjä: deload-viikko edellisen ja nykyisen välissä
  for (const trace of profileResult.traces) {
    const slots = trace.output?.slots || [];
    const ruleIds = new Set((trace.traces || []).map((x) => x.ruleId));
    const deltaPct = trace.output?.deltaPct;
    const capLevel = trace.output?.capLevel || 0;
    const deloadWeek = typeof deltaPct === "number" && deltaPct <= -0.10;
    if (deloadWeek) deloadWeeks.add(trace.weekNum);
    for (const slot of slots) {
      if (!slot.movementName || typeof slot.resolvedLoadKg !== "number" || slot.resolvedLoadKg <= 0) continue;
      // Kalibrointi/attempt-protokollakuormat ja lämmittelyt eivät kuulu vertailuun.
      if (["warmup", "calibration", "opener", "attempt2", "attempt3"].includes(slot.role)) continue;
      const key = slot.movementName + "|" + (slot.reps ?? "?");
      const prev = last.get(key);
      last.set(key, { load: slot.resolvedLoadKg, weekNum: trace.weekNum, dayOfWeek: trace.dayOfWeek, deload: deloadWeek });
      if (!prev || prev.load <= 0) continue;
      // BW-KALLIO: pienillä lisäkuormilla (< 20 kg) external-suhde on harhaanjohtava
      // (dippi 10,5 → 0,5 kg = −95 % ext MUTTA −10 % system-kuormana, jonka atleetti
      // tuntee). Kallion alueella verrataan system-kuormia (ext + BW).
      const _bw = profile?.meta?.bodyweightKg ?? 91;
      const _cliff = Math.min(prev.load, slot.resolvedLoadKg) < 20;
      const ratio = _cliff
        ? (slot.resolvedLoadKg + _bw) / (prev.load + _bw)
        : slot.resolvedLoadKg / prev.load;
      if (ratio >= DOWN_T && ratio <= UP_T) continue;
      const isDown = ratio < DOWN_T;
      // Deload-rajat ovat legitiimiä ohjelmadynamiikkaa molempiin suuntiin:
      // deload-viikon sisällä pudotus selittyy deltaPct:llä; deload-viikon JÄLKEEN
      // nousu on paluu suunnitelmaan (vertailukohta oli suppressoitu kuorma).
      // BLOKKIRAJA: deload-viikko edellisen ja nykyisen havainnon VÄLISSÄ →
      // intensiteettiprofiili vaihtuu ohjelmadesignista (esim. strength-backoff 70 %
      // → intensity-backoff 85 %) — selitetty molempiin suuntiin.
      const blockBoundary = [...deloadWeeks].some((w) => w > prev.weekNum && w < trace.weekNum);
      const explained = isDown
        ? (deloadWeek || blockBoundary || capLevel >= 1 || [...ruleIds].some((r) => DOWN_RULES.has(r)))
        : (prev.deload || blockBoundary || [...ruleIds].some((r) => UP_RULES.has(r)));
      allFlags.push({
        weekNum: trace.weekNum, dayOfWeek: trace.dayOfWeek, dateISO: trace.dateISO,
        code: explained ? "PRESCRIPTION_DELTA_EXPLAINED" : "PRESCRIPTION_SANITY",
        severity: explained ? "📋 INFO" : "🐛 ERROR",
        msg: `${slot.movementName} (${slot.sets ?? "?"}×${slot.reps ?? "?"}): ${prev.load} → ${slot.resolvedLoadKg} kg (${((ratio - 1) * 100).toFixed(0)} % vs vk${prev.weekNum}/pv${prev.dayOfWeek})${explained ? " — selitetty" : " — EI selittävää sääntöä päivän traceissa"}.`,
        movement: slot.movementName, prevLoad: prev.load, newLoad: slot.resolvedLoadKg,
        ratio: Number(ratio.toFixed(3)), explained,
      });
    }
  }
}

// Cross-trace: tarkista progression-monotonisuus per liike
function crossTraceProgression(profileResult, allFlags) {
  const byMovement = new Map();
  for (const trace of profileResult.traces) {
    const phase = deriveBlockPhase(trace);
    if (phase === "deload") continue;
    const slots = trace.output?.slots || [];
    for (const slot of slots) {
      if (slot.role !== "primary") continue;
      const name = slot.movementName;
      if (!name || typeof slot.resolvedLoadKg !== "number") continue;
      if (!byMovement.has(name)) byMovement.set(name, []);
      byMovement.get(name).push({
        weekNum: trace.weekNum,
        dayOfWeek: trace.dayOfWeek,
        load: slot.resolvedLoadKg,
        phase,
      });
    }
  }

  for (const [name, entries] of byMovement.entries()) {
    if (entries.length < 4) continue;
    // Etsi epäsymmetrinen sequence: vk1→vk2 +A, vk2→vk3 +B jossa |A/B|>3
    const sorted = entries.sort((a, b) => a.weekNum - b.weekNum || a.dayOfWeek - b.dayOfWeek);
    for (let i = 2; i < sorted.length; i++) {
      const dA = sorted[i - 1].load - sorted[i - 2].load;
      const dB = sorted[i].load - sorted[i - 1].load;
      if (dA > 1 && dB > 0 && dA / Math.max(dB, 0.5) > 4) {
        allFlags.push({
          weekNum: sorted[i].weekNum,
          dayOfWeek: sorted[i].dayOfWeek,
          dateISO: null,
          code: "K4_PROGRESSION_NON_LINEAR",
          severity: "⚠️ WARN",
          msg: `${name}: progression vaihtelee (vk${sorted[i - 2].weekNum}→${sorted[i - 1].weekNum} +${dA.toFixed(1)}kg vs vk${sorted[i - 1].weekNum}→${sorted[i].weekNum} +${dB.toFixed(1)}kg).`,
          movement: name,
          deltaA: dA,
          deltaB: dB,
        });
        break; // yksi flag per liike riittää
      }
    }
  }
}

// Aggregaatio koko profiili-tasolla
export function summarizeFlags(allFlags) {
  const summary = {
    total: allFlags.length,
    bySeverity: { "🐛 ERROR": 0, "⚠️ WARN": 0, "📋 INFO": 0, "💬 UX": 0 },
    byCode: {},
  };
  for (const f of allFlags) {
    summary.bySeverity[f.severity] = (summary.bySeverity[f.severity] || 0) + 1;
    summary.byCode[f.code] = (summary.byCode[f.code] || 0) + 1;
  }
  return summary;
}
