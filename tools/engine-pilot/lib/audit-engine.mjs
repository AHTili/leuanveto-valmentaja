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
  if (/peak|peaking|kisaviikko/i.test(weekLabel)) return "peaking";
  if (/intens|realisoint|maks/i.test(weekLabel)) return "intensity";
  if (/strength/i.test(weekLabel)) return "strength";
  if (/hyper|foundation|vol|adapt|progress/i.test(weekLabel)) return "foundation";

  // Streetlifting_16w mapping:
  if (trace.input?.mesocycleType === "streetlifting_16w") {
    const w = trace.weekNum;
    if (w === 4 || w === 8 || w === 12) return "deload";
    if (w <= 3) return "foundation";
    if (w <= 7) return "strength";
    if (w <= 11) return "intensity";
    return "peaking";
  }

  // Single-block-mesoille (default, hypertrofia, wendler531 jne.): vk 4 deload, muutoin foundation
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

  // Variant A: slot.warmupSets puuttuu kokonaan → engine ei tarjoa skeletonia, UI fallback hardcoded ramp
  if (!Array.isArray(primary.warmupSets) || primary.warmupSets.length === 0) {
    return flag(
      "K1",
      "🐛 ERROR",
      `Primary slot.warmupSets puuttuu (heavy ${phase} V${targetVx}, ${primary.movementName}). ` +
        `Engine ei tarjoa warmup-skeletonia → UI:n hardcoded ramp [0.30,0.55,0.75,0.90] (index.html:11816) ainoa lähde.`,
      { phase, targetVx, slotMov: primary.movementName, variant: "skeleton-missing" },
    );
  }

  // Variant B: slot.warmupSets viim. step ≤ 0.85 mutta UI hardkoodaa 0.90 (V3-V4 -tavoitteella liian raskas neural primer)
  const lastStep = primary.warmupSets[primary.warmupSets.length - 1];
  const lastPct = lastStep?.pct ?? null;
  if (lastPct !== null && lastPct <= 0.85 && targetVx >= 3) {
    return flag(
      "K1",
      "🐛 ERROR",
      `Slot.warmupSets viim. step ${(lastPct * 100).toFixed(0)}%, mutta UI hardkoodaa 90% (index.html:11816). ` +
        `Foundation V${targetVx}-tavoitteella tämä tappaa neural-primer:in.`,
      { phase, targetVx, slotWarmupTop: lastPct, uiHardcodedTop: 0.90, slotMov: primary.movementName, variant: "skeleton-vs-ui-mismatch" },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// K2: rep1Range käyttää BLOCK_PHASE_TARGET_RIR, ei slot.targetVx
// ──────────────────────────────────────────────────────────────
// Detection:
//   Primary slot.targetVx ≠ BLOCK_PHASE_TARGET_RIR[phase] → rep1Range biased
//   Tämä on design-mismatch joka näkyy aina streetlifting_16w-foundationissa
//     (slot.targetVx=3, block-default=4)
function auditK2(trace) {
  const slots = trace.output?.slots || [];
  const primary = slots.find((s) => s.role === "primary");
  if (!primary || typeof primary.targetVx !== "number") return null;
  const phase = deriveBlockPhase(trace);
  if (phase === "unknown" || phase === "deload") return null;
  const blockDefaultRir = BLOCK_PHASE_TARGET_RIR_EXPECTED[phase];
  if (typeof blockDefaultRir !== "number") return null;
  const slotVx = primary.targetVx;
  if (Math.abs(slotVx - blockDefaultRir) >= 1) {
    return flag(
      "K2",
      "⚠️ WARN",
      `Primary slot.targetVx=${slotVx} mutta BLOCK_PHASE_TARGET_RIR[${phase}]=${blockDefaultRir}. ` +
        `rep1Range käyttää block-default:ia (engine.js:2670) → grindy-bias amplifioi virhettä.`,
      { phase, slotVx, blockDefaultRir, slotMov: primary.movementName },
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// K3: backoff-velocityStop + primary-rep1Range samalla UI-panelilla
// ──────────────────────────────────────────────────────────────
// Detection:
//   Trace sisältää primary + backoff JA molemmilla on velocityStop
//   JA primary.velocityStop ≠ backoff.velocityStop (eli erilliset arvot)
//   → UI yhdistää nämä samaan vel-panel:iin (index.html:6248)
function auditK3(trace) {
  const slots = trace.output?.slots || [];
  const primary = slots.find((s) => s.role === "primary");
  const backoff = slots.find((s) => s.role === "backoff");
  if (!primary || !backoff) return null;
  const pStop = primary.velocityStop ?? null;
  const bStop = backoff.velocityStop ?? null;
  if (pStop === null && bStop === null) return null;
  if (pStop !== null && bStop !== null && Math.abs(pStop - bStop) < 0.01) return null; // sama arvo, ei K3
  // Käytä targetVx-eroa toissijaisena detektorina (jos velocityStop puuttuu yhdessä)
  const targetVxDiff = (primary.targetVx ?? 0) !== (backoff.targetVx ?? 0);
  if (pStop !== bStop || targetVxDiff) {
    return flag(
      "K3",
      "💬 UX",
      `Primary+backoff slot:eilla eri velocity-kontekstit (primary stop=${pStop} Vx=${primary.targetVx}, ` +
        `backoff stop=${bStop} Vx=${backoff.targetVx}). UI yhdistää nämä samalla vel-panel:iin (index.html:6248).`,
      {
        primaryStop: pStop,
        backoffStop: bStop,
        primaryVx: primary.targetVx,
        backoffVx: backoff.targetVx,
      },
    );
  }
  return null;
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
