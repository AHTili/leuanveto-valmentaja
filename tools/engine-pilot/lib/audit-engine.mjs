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
} from "./audit-baselines.mjs";

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
// Pää-funktio: audita yksi trace
// ──────────────────────────────────────────────────────────────
export function auditTrace(trace, sessionIndex = 0, allTracesForProfile = [], profile = null) {
  const flags = [];

  const checks = [
    auditK1(trace),
    auditK2(trace),
    auditK3(trace),
    auditDeltaPctClamp(trace, profile),
    auditE1RMContinuity(trace, sessionIndex, allTracesForProfile),
    auditFailureLockout(trace),
    auditWarmupRampShape(trace),
    auditErrorState(trace),
    auditDeloadDayType(trace),
  ];

  for (const c of checks) {
    if (c) flags.push(c);
  }

  trace.auditFlags = flags;
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

  return allFlags;
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
