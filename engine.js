// engine.js — Computation engine: e1RM, baselines, readiness, recommend(), mesocycle, decisionTrace
// LeVe AI v4.34.12 — engine logic muuttumaton (index.html v4.34.12-muutokset: skip-set/skip-exercise/skip-warmup-element UX-parannukset).

import {
  uid, todayISO, parseNumericInput,
  getAllSessions, getSetsForSession, getAllSets, getSetsForMovement,
  getActiveMesocycle, saveMesocycle, createDefaultMesocycle, createPeakingMesocycle,
  getSettings, saveBaseline, getBaseline,
  saveRecommendation, saveDecisionTrace,
  getAllMovements, getMovementProgress, saveMovementProgress,
  getMeasurementsByType,
  getAllMesocycles,
  PULL_VOLUME_CATEGORIES,
  VARIANT_DAY_TYPE_MAP,
  ACCESSORY_SLOT_CATALOG,
} from "./data.js";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DAY_TYPE_MULTIPLIERS = {
  heavy: 1.0,
  volume: 0.6,
  speed: 0.4,
  competition: 1.0,
  accessory: 0.0,
  rest: 0,
};

const DAY_TYPE_SET_RECIPES = {
  heavy: { sets: 5, repsRange: [2, 3], targetVxRange: [1, 2] },
  volume: { sets: [4, 5], repsRange: [4, 6], targetVxRange: [2, 3] },
  speed: { sets: [4, 5], repsRange: [2, 2], targetVxRange: [4, 5] },
};

const REST_RECOMMENDATIONS = {
  heavy: { minSec: 180, maxSec: 300, label: "3–5 min" },
  volume: { minSec: 120, maxSec: 180, label: "2–3 min" },
  speed: { minSec: 90, maxSec: 120, label: "1.5–2 min" },
  competition: { minSec: 300, maxSec: 600, label: "5–10 min" },
  accessory: { minSec: 90, maxSec: 150, label: "1.5–2.5 min" },
  accessoryCompound: { minSec: 120, maxSec: 180, label: "2–3 min" },
  accessoryIsolation: { minSec: 60, maxSec: 90, label: "1–1.5 min" },
};

/**
 * Pick the appropriate rest recommendation for an exercise based on its role,
 * category, target Vx and reps. Compound accessories with loaded targetVx need
 * more rest to avoid grinding; isolation work (curls, delt raises) stays short.
 *
 * v4.27.8 korjaukset:
 *  1) Heavy-single-detektio (reps ≤ 3 AND targetVx ≤ 2) → heavy rest 3-5 min
 *     riippumatta roolista tai dayType:stä. Fix: MU primary 3×1 V2 Saturday
 *     (dayType=volume → sai 2-3 min, pitäisi 3-5), top-single RPE 9+ secondary
 *     (sai 2-3, pitäisi 3-5), heavy secondary etukyykky 3×3 V2.
 *  2) Backoff V ≥ 3 → volume rest 2-3 min (ei heavy 3-5) — backoff on määritelmän
 *     mukaan kevyempi toisto-volyymin lisä, ei max-lift.
 *  3) "alaraaja" lisätty compoundCategories-settiin — etukyykky/takakyykky
 *     ilman alaryhmää saivat aiemmin generic accessory 1.5-2.5 min.
 *
 * @param {object} exercise - { role, category, targetVx, reps }
 * @param {string} dayType - "heavy" | "volume" | "speed" | "competition"
 * @returns {{ minSec: number, maxSec: number, label: string }}
 */
function pickRestForExercise(exercise, dayType) {
  if (!exercise) return REST_RECOMMENDATIONS.heavy;

  // Competition attempts always get long rest — katkaistaan ensimmäiseksi.
  if (exercise.role === "opener" || exercise.role === "attempt2" || exercise.role === "attempt3") {
    return REST_RECOMMENDATIONS.competition;
  }

  // Heavy singles / top sets: reps ≤ 3 AND Vx ≤ 2 → heavy rest riippumatta roolista.
  // Kattaa MU 3×1 V2 (Saturday volume), top single RPE 9+ secondary, heavy secondary
  // etukyykky 3×3 V2. Näille 2-3 min ei riitä palauttamaan CNS:ää.
  if (typeof exercise.reps === "number" && exercise.reps <= 3 &&
      typeof exercise.targetVx === "number" && exercise.targetVx <= 2) {
    return REST_RECOMMENDATIONS.heavy;
  }

  // Primary seuraa dayType:ä (heavy-heavy, volume-volume, speed-speed).
  if (exercise.role === "primary") {
    return REST_RECOMMENDATIONS[dayType] || REST_RECOMMENDATIONS.heavy;
  }

  // Backoff: V ≥ 3 = tavanomainen volume-backoff → volume rest (2-3 min).
  // V ≤ 2 backoff = raskas (harvinainen) → seuraa dayType:ä.
  if (exercise.role === "backoff") {
    if (typeof exercise.targetVx === "number" && exercise.targetVx >= 3) {
      return REST_RECOMMENDATIONS.volume;
    }
    return REST_RECOMMENDATIONS[dayType] || REST_RECOMMENDATIONS.heavy;
  }

  // Accessory / support / secondary: erottele compound vs isolation.
  const compoundCategories = new Set([
    "vertikaaliveto", "vertikaalityöntö",
    "horisontaaliveto", "horisontaalityöntö",
    "polvidominantti", "lonkkadominantti",
    "alaraaja",  // v4.27.8: etukyykky/takakyykky kun kategoriana yleinen alaraaja
  ]);
  const isCompoundCategory = compoundCategories.has(exercise.category);
  const hasLoadedTarget = exercise.targetVx !== null && exercise.targetVx !== undefined && exercise.targetVx <= 3;
  const isLowRep = typeof exercise.reps === "number" && exercise.reps <= 8;

  if (isCompoundCategory && (hasLoadedTarget || isLowRep)) {
    return REST_RECOMMENDATIONS.accessoryCompound;
  }
  if (!hasLoadedTarget && (typeof exercise.reps !== "number" || exercise.reps >= 10)) {
    return REST_RECOMMENDATIONS.accessoryIsolation;
  }
  return REST_RECOMMENDATIONS.accessory;
}

const READINESS_CLASSES = { GREEN: 0, YELLOW: 1, RED: 2 };

// ═══════════════════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mad(arr) {
  const med = median(arr);
  return median(arr.map((x) => Math.abs(x - med)));
}

function madSigma(arr) {
  const rawMad = mad(arr);
  const sigma = 1.4826 * rawMad;
  return sigma === 0 ? 1e-6 : sigma;
}

function zScore(value, med, sigma) {
  return (value - med) / Math.max(1e-6, sigma);
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

// ═══════════════════════════════════════════════════════════════
// e1RM CALCULATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * System e1RM: uses bodyweight + external load + Epley with Vara
 * e1RM_system = systemLoadKg × (1 + (reps + Vx) / 30)
 */
function e1rmSystem(bodyweightKg, externalLoadKg, reps, vara) {
  const systemLoad = bodyweightKg + externalLoadKg;
  if (systemLoad <= 0 || reps < 1) return null;
  // Vx ??= 1: käyttäjällä grinding-taipumus, tyhjä raportointi tarkoittaa tyypillisesti V0-V1
  const effectiveReps = reps + (vara ?? 1);
  return systemLoad * (1 + effectiveReps / 30);
}

/**
 * External e1RM: e1RM_system - bodyweight
 */
function e1rmExternal(bodyweightKg, externalLoadKg, reps, vara) {
  const sys = e1rmSystem(bodyweightKg, externalLoadKg, reps, vara);
  if (sys === null) return null;
  return Math.max(0, sys - bodyweightKg);
}

/**
 * Accessory / external-load e1RM.
 * Ilman Vx:ää: simple Epley = weight × (1 + reps / 30)
 * Vx annettu: Epley-Vara = weight × (1 + (reps + Vx) / 30)
 */
function e1rmAccessory(weightKg, reps, vara = null) {
  if (weightKg <= 0 || reps < 1) return null;
  const effectiveReps = reps + (vara ?? 0);
  return weightKg * (1 + effectiveReps / 30);
}

/**
 * Calculate target load from e1RM backward:
 * targetSystemLoad = e1RM_system / (1 + effectiveReps / 30)
 * targetExternalLoad = targetSystemLoad - bodyweightKg
 */
function targetLoadFromE1RM(e1rmSys, bodyweightKg, targetReps, targetVx) {
  if (e1rmSys === null || e1rmSys <= 0) return null;
  const effectiveReps = targetReps + targetVx;
  const targetSystemLoad = e1rmSys / (1 + effectiveReps / 30);
  const external = targetSystemLoad - bodyweightKg;
  return roundToHalf(Math.max(0, external));
}

// ═══════════════════════════════════════════════════════════════
// BASELINE CALCULATIONS (rolling median + MAD)
// ═══════════════════════════════════════════════════════════════

function computeBaseline(values, windowN) {
  const windowed = values.slice(-windowN);
  if (windowed.length < 3) return null;
  const med = median(windowed);
  const sigma = madSigma(windowed);
  return { median: med, madSigma: sigma, n: windowed.length };
}

function classifyReadinessZ(z) {
  // v4.28.0 bugfix: boundary tulkittu konservatiivisesti. Aiemmin z === -0.5 palautti GREEN
  // ja z === -1.0 palautti YELLOW (if z >= ...) — readiness-järjestelmässä rajalla on
  // turvallisempaa valita alempi luokka, jotta grinder ei ohita YELLOW/RED-varoitusta.
  if (z > -0.5) return "GREEN";
  if (z > -1.0) return "YELLOW";
  return "RED";
}

// ═══════════════════════════════════════════════════════════════
// READINESS SYSTEM: 2/3 rule + velocity veto
// ═══════════════════════════════════════════════════════════════

/**
 * Compute velocity readiness from readiness test rep1 velocity
 */
function velocityReadiness(todayVelocity, baselineValues, windowN = 10) {
  if (todayVelocity === null || todayVelocity === undefined) {
    return { z: null, class: null, channel: "velocity" };
  }
  const bl = computeBaseline(baselineValues, windowN);
  if (!bl) return { z: null, class: null, channel: "velocity" };
  const z = zScore(todayVelocity, bl.median, bl.madSigma);
  return { z, class: classifyReadinessZ(z), channel: "velocity", baseline: bl };
}

/**
 * Compute HRV readiness from Oura night HRV (already as lnRMSSD)
 *
 * v4.33.0 M20d: Rolling 7-päivän keskiarvo-vertailu (Plews 2013, Plews & Laursen 2017).
 * Yksittäinen päivä-HRV on kohinaiseempi kuin rolling-keskiarvo. Vertaillaan TÄMÄN
 * PÄIVÄN HRV vs viim. 7 päivän keskiarvoa (rolling-7) baseline-Median sijasta jos
 * 7+ datapistettä saatavilla. Jos vähemmän, fallback baseline-vertailuun.
 *
 * Smallest worthwhile change ±0.5 SD viikkokeskiarvosta = optimi readiness-marker.
 */
function hrvReadiness(todayLnRMSSD, baselineValues, windowN = 14) {
  if (todayLnRMSSD === null || todayLnRMSSD === undefined) {
    return { z: null, class: null, channel: "hrv" };
  }
  // v4.33.0 M20d: Rolling 7-päivän keskiarvo (Plews 2013)
  if (Array.isArray(baselineValues) && baselineValues.length >= 7) {
    const last7 = baselineValues.slice(-7);
    const rolling7Mean = last7.reduce((a, b) => a + b, 0) / last7.length;
    // Käytetään koko baseline-windowin MAD-sigma:a varianssin estimaattina
    const bl = computeBaseline(baselineValues, windowN);
    if (bl) {
      const z = zScore(todayLnRMSSD, rolling7Mean, bl.madSigma);
      return {
        z,
        class: classifyReadinessZ(z),
        channel: "hrv",
        baseline: bl,
        rolling7Mean,
        method: "rolling7",
      };
    }
  }
  // Fallback: baseline median -vertailu (legacy)
  const bl = computeBaseline(baselineValues, windowN);
  if (!bl) return { z: null, class: null, channel: "hrv" };
  const z = zScore(todayLnRMSSD, bl.median, bl.madSigma);
  return { z, class: classifyReadinessZ(z), channel: "hrv", baseline: bl, method: "baseline-median" };
}

/**
 * v4.33.0 M20a: Yläraaja-readiness MPV warmup-singlessä @ 60-65% 1RM
 *
 * Sánchez-Moreno 2017 (IJSPP 12:1378) osoitti pull-up-spesifin load-velocity-relaation
 * r = -0.96 ja stabiilin V-%1RM-suhteen 12 vk:n harjoittelun yli; Sánchez-Moreno 2020
 * (JSCR 34:911) vahvisti VL-thresholdit (VL25, VL50). Sánchez-Medina &
 * González-Badillo 2011 (MSSE 43:1725) osoittaa, että velocity loss korreloi
 * voimakkaasti neuromuskulaarisen fatiguen kanssa.
 *
 * Käyttö: lisäpainoleuka warmup-single @ 60-65% 1RM aamulla MA + TO + LA.
 * Vertaa tämän päivän MPV vs viim. 7 pv rolling-mediania.
 *
 * Kynnysarvot (heuristiset, johdettu Pareja-Blanco/González-Badillo VL-thresholdeista):
 *   ≥ +3 %   → "Green light", top-set OK, harkitse +2.5 kg
 *   −0..3 %  → Normaali, ohjelman mukaan
 *   −3..−5 % → Pieni varovaisuus, ei testiyrityksiä
 *   −5..−10% → Vähennä top-set 5-10 % (esim. 90 %→82.5 %), volume tai -1 setti
 *   > −10 %  → Lepopäivä TAI kevyt tekniikkasessio @ 50 %
 *   > −15 %  → Mahdollinen NFOR, review koko viikko
 *
 * Returns: { mpv, baseline7Mean, deltaPct, class: "GREEN"|"YELLOW"|"RED", message, recommendedLoadAdjust }
 */
function upperBodyMpvReadiness(todayMpv, recent7DaysMpv) {
  if (todayMpv === null || todayMpv === undefined) {
    return { mpv: null, baseline7Mean: null, deltaPct: null, class: null, message: "Ei MPV-dataa", recommendedLoadAdjust: 0 };
  }
  if (!Array.isArray(recent7DaysMpv) || recent7DaysMpv.length < 3) {
    // Rakenna baseline ensin — alle 3 datapistettä ei riitä luotettavaan vertailuun
    return { mpv: todayMpv, baseline7Mean: null, deltaPct: null, class: null, message: "Baseline rakentuu (3+ MPV-mittausta tarvitaan)", recommendedLoadAdjust: 0 };
  }
  const baseline7Mean = recent7DaysMpv.reduce((a, b) => a + b, 0) / recent7DaysMpv.length;
  if (baseline7Mean <= 0) {
    return { mpv: todayMpv, baseline7Mean, deltaPct: null, class: null, message: "Baseline ei luotettava (≤0)", recommendedLoadAdjust: 0 };
  }
  const deltaPct = ((todayMpv - baseline7Mean) / baseline7Mean) * 100;
  let cls, message, recommendedLoadAdjust;
  if (deltaPct >= 3) {
    cls = "GREEN";
    message = `MPV +${deltaPct.toFixed(1)}% baseline — Green light, top-set OK, harkitse +2.5 kg`;
    recommendedLoadAdjust = 0.025;  // +2.5%
  } else if (deltaPct >= -3) {
    cls = "GREEN";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Normaali, ohjelman mukaan`;
    recommendedLoadAdjust = 0;
  } else if (deltaPct >= -5) {
    cls = "YELLOW";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Pieni varovaisuus, ei testiyrityksiä`;
    recommendedLoadAdjust = 0;
  } else if (deltaPct >= -10) {
    cls = "YELLOW";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Vähennä top-set 5-10% (esim. 90% → 82.5%)`;
    recommendedLoadAdjust = -0.075;  // -7.5%
  } else if (deltaPct >= -15) {
    cls = "RED";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Lepopäivä TAI kevyt tekniikka @50%`;
    recommendedLoadAdjust = -0.50;  // dramatic cut
  } else {
    cls = "RED";
    message = `MPV ${deltaPct.toFixed(1)}% baseline — Mahdollinen NFOR, review koko viikko (Plews 2013)`;
    recommendedLoadAdjust = -1.0;  // skip session
  }
  return { mpv: todayMpv, baseline7Mean, deltaPct, class: cls, message, recommendedLoadAdjust };
}

/**
 * Compute Vara readiness from recent top-set overshoot
 */
function varaReadiness(recentTopSets, windowN = 5) {
  const sets = recentTopSets.slice(-windowN).filter(
    (s) => s.targetVx !== null && s.targetVx !== undefined &&
           s.actualVx !== null && s.actualVx !== undefined
  );
  if (sets.length < 2) return { z: null, class: null, channel: "vara", meanOvershoot: null };

  const overshoots = sets.map((s) => s.targetVx - s.actualVx);
  const meanOvershoot = avg(overshoots);

  let cls;
  if (meanOvershoot >= 2) cls = "RED";
  else if (meanOvershoot >= 1) cls = "YELLOW";
  else cls = "GREEN";

  return { z: null, class: cls, channel: "vara", meanOvershoot };
}

/**
 * Combine readiness channels using 2/3 rule + velocity veto
 */
function combineReadiness(velocityR, hrvR, varaR) {
  const channels = [velocityR, hrvR, varaR];
  const active = channels.filter((c) => c.class !== null);

  if (active.length === 0) {
    return { combined: "GREEN", capLevel: 0, channels: { velocity: velocityR, hrv: hrvR, vara: varaR } };
  }

  // Count colors
  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const ch of active) counts[ch.class]++;

  let combined;

  // 2/3 rule
  if (counts.GREEN >= 2) combined = "GREEN";
  else if (counts.RED >= 2 || (counts.RED >= 1 && counts.YELLOW >= 1)) combined = "RED";
  else combined = "YELLOW";

  // Velocity VETO
  if (velocityR.class === "RED") {
    if (combined === "GREEN") combined = "YELLOW";
    const othersYellowOrRed = [hrvR, varaR].filter(
      (c) => c.class === "YELLOW" || c.class === "RED"
    ).length;
    if (othersYellowOrRed >= 1) combined = "RED";
  }

  const capLevel = combined === "GREEN" ? 0 : combined === "YELLOW" ? 1 : 2;

  return {
    combined,
    capLevel,
    channels: { velocity: velocityR, hrv: hrvR, vara: varaR },
  };
}

// ═══════════════════════════════════════════════════════════════
// MESOCYCLE LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve full mesocycle position — handles inserted deload weeks.
 * Returns { programWeek, isInsertedDeload, calendarWeek } or null if past end.
 *
 * Inserted deload: occupies a calendar week between program weeks, extending
 * the effective mesocycle length by 1 week per insert. The `programWeek`
 * returned during a deload insert = the program week just completed (so phase
 * logic, accessory slot lookups etc. resolve against the pre-deload state).
 */
function resolveMesocyclePosition(mesocycle, dateISO) {
  if (!mesocycle || !mesocycle.startDateISO) return null;
  const start = new Date(mesocycle.startDateISO);
  const current = new Date(dateISO);
  const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24));
  // v4.22: erotellaan "ennen alkua" vs "lopun jälkeen" -tilanteet. Aiemmin
  // molemmat palauttivat null, ja recommend() korvasi mesosyklin default:illa
  // kun pääsy ennen startDateISO:a pyyttiin (esim. backfill-polku). Nyt
  // palautetaan strukturoitu result jossa kutsuja näkee miksi.
  if (diffDays < 0) return { programWeek: null, reason: "before-start", diffDays };
  const calendarWeek = Math.floor(diffDays / 7) + 1;

  const inserts = [...(mesocycle.insertedDeloads || [])]
    .map(d => (typeof d === "number" ? d : d.afterProgramWeek))
    .filter(n => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b);

  const effectiveWeekCount = mesocycle.weekCount + inserts.length;
  if (calendarWeek > effectiveWeekCount) return { programWeek: null, reason: "after-end", diffDays, calendarWeek };

  let programWeek = 0;
  let insertIdx = 0;
  let isDeload = false;
  for (let cw = 1; cw <= calendarWeek; cw++) {
    isDeload = false;
    if (insertIdx < inserts.length && inserts[insertIdx] === programWeek) {
      isDeload = true;
      insertIdx++;
    } else {
      programWeek++;
    }
  }
  return { programWeek: Math.max(programWeek, 1), isInsertedDeload: isDeload, calendarWeek, reason: "in-range" };
}

/**
 * Determine which program week of the mesocycle we're in based on date.
 * Backward-compatible: returns a number (or null). For full state including
 * inserted-deload flag, use resolveMesocyclePosition().
 */
function getMesocycleWeek(mesocycle, dateISO) {
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  return pos && pos.programWeek ? pos.programWeek : null;
}

function isInsertedDeloadWeek(mesocycle, dateISO) {
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  return pos && pos.programWeek ? pos.isInsertedDeload : false;
}

function isReplacedDeloadWeek(mesocycle, dateISO) {
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  if (!pos || !pos.programWeek || pos.isInsertedDeload) return false;
  const replaced = (mesocycle?.replacedWithDeload || [])
    .map(r => (typeof r === "number" ? r : r.programWeek))
    .filter(Number.isInteger);
  return replaced.includes(pos.programWeek);
}

function isDeloadOverrideWeek(mesocycle, dateISO) {
  return isInsertedDeloadWeek(mesocycle, dateISO) || isReplacedDeloadWeek(mesocycle, dateISO);
}

function getEffectiveWeekCount(mesocycle) {
  if (!mesocycle) return 0;
  const inserts = mesocycle.insertedDeloads?.length || 0;
  return (mesocycle.weekCount || 0) + inserts;
}

/**
 * Get the week definition for a given week number
 */
function getWeekDef(mesocycle, weekNum) {
  if (!mesocycle || !mesocycle.weekDefs) return null;
  return mesocycle.weekDefs.find((w) => w.week === weekNum) || null;
}

/**
 * Get the planned day for today from the week plan.
 * If no exact match for dayOfWeek, finds the NEXT training day (forward-first)
 * so rest days show the upcoming session, not the one already completed.
 *
 * v4.27.11: Aiempi "nearest" logiikka palautti eiliseen planin tasapelitilanteissa.
 * Esim. perjantaina (dow=5) TO (4) ja LA (6) ovat molemmat 1 päivän päässä,
 * mutta TO listataan ensin weekPlans.days:ssa → TO voitti → dashboard näytti
 * eilisen treenin uudelleen. Uusi logiikka laskee forward-etäisyyden (wrap-around
 * seuraavaan viikkoon), joten perjantaina LA voittaa TO:n (fwd=1 vs fwd=6).
 */
function getTodayPlan(mesocycle, weekNum, dayOfWeek) {
  if (!mesocycle || !mesocycle.weekPlans) return null;
  const weekPlan = mesocycle.weekPlans.find((w) => w.week === weekNum);
  if (!weekPlan || !weekPlan.days || !weekPlan.days.length) return null;
  // Exact match
  const exact = weekPlan.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (exact) return exact;
  // Forward-first: pienin päivien määrä TÄNÄÄN → d (wrap-around = ensi vk)
  let best = null;
  let bestFwd = Infinity;
  for (const d of weekPlan.days) {
    let fwd = d.dayOfWeek - dayOfWeek;
    if (fwd <= 0) fwd += 7; // wrap to next week if day already passed
    if (fwd < bestFwd) {
      bestFwd = fwd;
      best = d;
    }
  }
  return best;
}

/**
 * deltaPct_raw calculation: mesocycle week coefficient × day type multiplier
 */
function deltaPctRaw(weekDef, dayType) {
  if (!weekDef) return 0;
  const weekCoeff = weekDef.deltaPctBase || 0;
  const dayMult = DAY_TYPE_MULTIPLIERS[dayType] ?? 1.0;
  return weekCoeff * dayMult;
}

/**
 * Adaptive mesocycle calibration after cycle completion
 * Returns adjustment to deltaPct values for next cycle
 */
function calibrateMesocycle(varaFeedbackSets) {
  if (!varaFeedbackSets.length) return { adjustment: 0, reason: "Ei dataa" };
  const overshoots = varaFeedbackSets
    .filter((s) => s.targetVx !== null && s.actualVx !== null)
    .map((s) => s.targetVx - s.actualVx);
  if (!overshoots.length) return { adjustment: 0, reason: "Ei Vara-dataa" };

  const avgOvershoot = avg(overshoots);
  let adj = 0;
  let reason = "";

  // v4.28.0 bugfix: sign-konventio yhtenäistetty varaTrendCorrection-dokumentaation kanssa.
  // overshoot = targetVx - actualVx. actualVx > targetVx ⇒ overshoot < 0 ⇒ TOO EASY (crushed)
  // → lisää painoa. actualVx < targetVx ⇒ overshoot > 0 ⇒ TOO HARD (struggled) → vähennä.
  // Aiemmin merkit olivat väärin päin: grinderille (actual=0, target=2 → overshoot=+2)
  // engine suositteli +1% vaikka oli selvästi liian raskas. Kynnys-asymmetria säilytetty:
  // +1% vaatii vahvan crush-signaalin (≤ -1.0), -1% lievemmälläkin struggle-signaalilla (≥ 0.5).
  if (avgOvershoot < -1.0) {
    adj = 0.01; // +1%
    reason = `Liian kevyt (avgOvershoot=${avgOvershoot.toFixed(2)}) → +1%`;
  } else if (avgOvershoot > 0.5) {
    adj = -0.01; // -1%
    reason = `Liian raskas (avgOvershoot=${avgOvershoot.toFixed(2)}) → -1%`;
  } else {
    reason = `Sopiva (avgOvershoot=${avgOvershoot.toFixed(2)})`;
  }

  return { adjustment: adj, avgOvershoot, reason };
}

// ═══════════════════════════════════════════════════════════════
// VARA FEEDBACK LOOP
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze recent Vara data for session-level calibration
 */
function varaFeedback(recentSets) {
  const withVara = recentSets.filter(
    (s) => s.actualVx !== null && s.actualVx !== undefined &&
           s.targetVx !== null && s.targetVx !== undefined
  );
  if (withVara.length < 3) return { suggestion: null, type: null };

  const last3 = withVara.slice(-3);
  const allTooEasy = last3.every((s) => s.actualVx > s.targetVx + 1);
  const tooHard = last3.filter((s) => s.actualVx < s.targetVx - 1).length >= 2;

  if (allTooEasy) {
    return { suggestion: "Kuorma liian kevyt, harkitse +1-2 kg", type: "too_easy" };
  }
  if (tooHard) {
    return { suggestion: "Kuorma liian raskas, harkitse -1-2 kg", type: "too_hard" };
  }
  return { suggestion: null, type: null };
}

/**
 * Compute Vara trend correction for recommend().
 * Asymmetric: more aggressive UP when crushing (acceleration mode),
 * conservative DOWN when struggling (safety).
 *
 * meanOvr > 0 ⇒ sarjat olivat helpompia kuin target (target-Vx > actual-Vx väärin päin? ei)
 * meanOvr = targetVx - actualVx; actualVx > targetVx ⇒ meanOvr < 0 ⇒ TOO EASY (crushed)
 * actualVx < targetVx ⇒ meanOvr > 0 ⇒ TOO HARD (struggled)
 *
 * Convention in this codebase (varaFeedback etc.): if actualVx > targetVx, set is "easier than target"
 * because more reps in reserve means less effort. overshoot here = target - actual, so:
 *   meanOvr < 0 (actual > target) = crushed → ACCELERATE (+)
 *   meanOvr > 0 (actual < target) = struggled → HOLD BACK (-)
 */
function varaTrendCorrection(recentTopSets, opts = {}) {
  const maxUp = opts.maxUp ?? 0.035;   // aggressive acceleration
  const maxDown = opts.maxDown ?? 0.020; // conservative hold-back
  const withVara = recentTopSets.filter(
    (s) => s.actualVx !== null && s.targetVx !== null
  ).slice(-6);
  if (withVara.length < 4) return 0;

  // v4.32.8 (Phase 1 -tutkimuslöydös): straight-set-protokollissa Vx vaihtelee
  // freshness-akselilla (esim. sarja 1 V5 fresh → sarja 5 V1 cumulative).
  // Pelkkä mean overshoot voi johtaa harhaan jos sarjat raportoidaan ramp-pattern:nä
  // (V5, V4, V2, V1, V0 → mean = -0.4 mutta sarja 5 V0 = liian raskas).
  //
  // RATKAISU: PAINOTETTU mean joka korostaa viim. session viim. sarjaa (modern
  // strength-doktriini Tulkinta C: "viim. sarja = target Vx, V0 missä tahansa = warning").
  // Painot: viimeinen sarja 2.0×, toiseksi viimeinen 1.5×, muut 1.0×.
  // crushingStreak -säännös myös päivitetty: tarkista että viim. session viim. 3 sarjaa
  // (ei 3 setin slice yli sessioiden) ovat consistently crushed.
  const overshoots = withVara.map((s) => s.targetVx - s.actualVx);
  const weights = withVara.map((_, i) => {
    const fromEnd = withVara.length - 1 - i;
    if (fromEnd === 0) return 2.0;       // viim. sarja painoa eniten
    if (fromEnd === 1) return 1.5;       // toiseksi viimeinen
    return 1.0;
  });
  const weightedSum = overshoots.reduce((acc, ovr, i) => acc + ovr * weights[i], 0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedMeanOvr = weightedSum / totalWeight;

  // V0 missä tahansa viim. 3 sarjassa = "warning" — älä accelerate
  const last3HasFailure = withVara.slice(-3).some(s => s.actualVx === 0);

  // Consecutive crushing: viim. 3 sarjaa kaikki crushed (actualVx >= targetVx+1)
  const last3 = withVara.slice(-3);
  const crushingStreak = last3.length === 3 && last3.every(s => (s.actualVx - s.targetVx) >= 1);

  if (weightedMeanOvr < -0.5 && !last3HasFailure) {
    // Crushed (painotettu): accelerate. Mutta EI accelerate jos viim. sarjoissa V0.
    const base = clamp(Math.abs(weightedMeanOvr) * 0.015, 0, maxUp);
    const bonus = crushingStreak ? 0.010 : 0;
    return Math.min(base + bonus, maxUp);
  }
  if (weightedMeanOvr > 0.5 || last3HasFailure) {
    // Struggled (painotettu) tai viim. sarjoissa V0: hold back.
    // V0 viim. sarjoissa override aina hold-backiksi vaikka mean olisi kurssassa.
    const adjustment = last3HasFailure ? -0.015 : clamp(-weightedMeanOvr * 0.008, -maxDown, 0);
    return Math.max(adjustment, -maxDown);
  }
  return 0;
}

/**
 * Gross-mismatch correction: when the prescribed load is FAR off from
 * the athlete's true capacity (overshoot ≥ 1.5 reps consistently), the
 * normal ±3.5% cap is too slow. This mechanism escalates to up to +8%
 * per session when the mismatch is severe AND persistent (2+ sessions).
 *
 * Guard rails: requires 4+ recent top sets, mean overshoot ≤ -1.5
 * (actualVx ≥ targetVx + 1.5 on average), and at least 2 sessions worth.
 */
function grossMismatchCorrection(recentTopSets) {
  const withVara = recentTopSets.filter(
    (s) => s.actualVx !== null && s.targetVx !== null
  ).slice(-8);
  if (withVara.length < 4) return 0;

  const overshoots = withVara.map((s) => s.targetVx - s.actualVx);
  const meanOvr = avg(overshoots);

  // Require sustained large mismatch: mean overshoot ≥ 1.5 (target - actual ≤ -1.5)
  if (meanOvr > -1.5) return 0;

  // Require that ALL recent sets show ≥ 1 overshoot (no outliers)
  const allOvershoot = withVara.every(s => (s.actualVx - s.targetVx) >= 1);
  if (!allOvershoot) return 0;

  // Scale: −1.5 → +5 %, −2.0 → +6.5 %, −2.5+ → +8 %
  const magnitude = Math.abs(meanOvr);
  return clamp((magnitude - 1.5) * 0.030 + 0.050, 0.050, 0.080);
}

/**
 * e1RM momentum bonus: if recent e1RM shows a PR trend,
 * add additional deltaPct to accelerate future sessions.
 *
 * Trigger: latest e1RM >= 1.02 × max(previous 3 e1RMs)
 *   AND 3+ consecutive sessions with rising e1RM.
 * Bonus: +0.5–1.5% depending on magnitude.
 */
function e1rmMomentumBonus(e1rmHistory, maxBonus = 0.015) {
  if (!e1rmHistory || e1rmHistory.length < 4) return 0;
  const recent = e1rmHistory.slice(-4).map(h => h.e1rm).filter(v => v != null);
  if (recent.length < 4) return 0;

  const [a, b, c, latest] = recent;
  const priorMax = Math.max(a, b, c);
  if (priorMax <= 0) return 0;

  const pctJump = (latest - priorMax) / priorMax;
  const rising = (b > a) && (c > b) && (latest > c);

  if (pctJump >= 0.02 && rising) {
    // Scale linearly: 2% jump → 0.5%, 5% jump → 1.5%
    return clamp(pctJump * 0.30, 0.005, maxBonus);
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
// RETURN FROM BREAK
// ═══════════════════════════════════════════════════════════════

function breakAnalysis(lastSessionDateISO, todayDateISO) {
  if (!lastSessionDateISO) return { breakDays: null, modifier: 0, forcedDayType: null, message: null };

  const last = new Date(lastSessionDateISO);
  const today = new Date(todayDateISO || todayISO());
  const breakDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

  if (breakDays < 7) return { breakDays, modifier: 0, forcedDayType: null, message: null };

  if (breakDays < 14) {
    return {
      breakDays,
      modifier: -0.05,
      forcedDayType: null,
      message: "Viikon tauko — aloitetaan hieman kevyemmin",
    };
  }
  if (breakDays < 28) {
    return {
      breakDays,
      modifier: -0.10,
      forcedDayType: "volume",
      message: "2 viikon tauko — volume-päivä ensin",
    };
  }
  return {
    breakDays,
    modifier: -0.15,
    forcedDayType: "volume",
    message: "Pitkä tauko — aloitetaan konservatiivisesti, 1-2 viikossa normaaliin",
  };
}

/**
 * Check if mesocycle needs reset after break
 */
function mesocycleBreakReset(mesocycle, skippedWeeks) {
  if (skippedWeeks >= 2) {
    return { reset: true, reason: "2+ viikkoa skipattiin → mesosykli nollattu viikkoon 1" };
  }
  return { reset: false, reason: null };
}

// ═══════════════════════════════════════════════════════════════
// FAILURE REACTION
// ═══════════════════════════════════════════════════════════════

// v4.32.8: failureReaction nyt block-aware. Vaiheen 1 syvätutkimuksen löydös
// (ChatGPT + Claude + Refalo 2023):
//   Foundation: Strategia A — säilytä kuorma, kirjaa V0, kevennä ENSI VIIKOLLE.
//                Failure-protokolla EI kuulu foundation-blokkiin (24-48h recovery).
//   Strength:   Strategia B — laske 5% seuraavaan sarjaan. Strength sietää failure-
//                stimuluksen mutta loput sarjat tarvitsevat alennetun kuorman.
//   Intensity:  Strategia C — lopeta liike (2-failure rule, Tuchscherer RTS).
//                Intensity-V0 = CNS-signaali, säilytä recovery seuraaville päiville.
//   Peaking:    Strategia C — lopeta liike. Peaking-V0 = punainen lippu.
//
// Block-aware-parametri valinnainen — vanhat kutsut (ilman blockPhase) saavat
// legacy-Strategia-B:n (10% drop) yhteensopivuuden vuoksi.
function failureReaction(currentLoadKg, targetReps, isPrimary, consecutiveFailures, blockPhase = null) {
  // Block-aware reactions (v4.32.8)
  if (blockPhase === "foundation") {
    return {
      nextSetLoad: currentLoadKg,  // säilytä kuorma — Strategia A
      nextSetReps: isPrimary ? Math.max(targetReps - 1, 1) : targetReps,
      shouldStop: consecutiveFailures >= 1,  // 1× V0 foundationissa = stop, EI sallita 2x
      strategy: "A",
      message: consecutiveFailures >= 1
        ? "Foundation V0 → lopeta liike. Foundation EI ole failure-protokolla. Ensi viikolla -2.5 kg."
        : "Foundation V0 → kirjaa, jatka samalla kuormalla loppuun. Ensi viikolla -2.5 kg.",
      nextWeekLoadAdjust: -0.025,
    };
  }
  if (blockPhase === "intensity" || blockPhase === "peaking") {
    return {
      nextSetLoad: currentLoadKg,  // ei merkitystä, lopetetaan
      nextSetReps: 0,
      shouldStop: true,             // Strategia C — lopeta heti
      strategy: "C",
      message: blockPhase === "peaking"
        ? "Peaking V0 → STOP. CNS säilytetään kisaa varten. Älä jatka."
        : "Intensity V0 → STOP liike. 2-failure rule (Tuchscherer RTS). Recovery seuraavalle päivälle.",
      nextWeekLoadAdjust: blockPhase === "peaking" ? 0 : -0.05,
    };
  }
  // Strength (default) — Strategia B (5% drop)
  const nextSetLoad = roundToHalf(currentLoadKg * 0.95);  // v4.32.8: 10% → 5% (Refalo 2023)
  const nextSetReps = isPrimary ? Math.max(targetReps - 1, 1) : targetReps;
  if (consecutiveFailures >= 2) {
    return {
      nextSetLoad,
      nextSetReps,
      shouldStop: true,
      strategy: "B",
      message: "2× failure strengthissä — lopeta liike, palautuminen primaryksi.",
      nextWeekLoadAdjust: -0.05,
    };
  }
  return {
    nextSetLoad,
    nextSetReps,
    shouldStop: false,
    strategy: "B",
    message: `Strength V0 → seuraava sarja ${nextSetLoad} kg (-5%, Refalo 2023).`,
    nextWeekLoadAdjust: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// ACCESSORY PROGRESSION LOGIC
// ═══════════════════════════════════════════════════════════════

function accessoryProgression(progress, isLowerBody = false) {
  if (!progress) return { action: "hold", suggestedLoad: null, reason: "Ei progressiodataa" };

  const increment = isLowerBody ? 5 : 2.5;

  if (progress.consecutiveTargetMetSessions >= 2) {
    const newLoad = roundToHalf((progress.lastLoadKg || 0) + increment);
    return {
      action: "increase",
      suggestedLoad: newLoad,
      reason: `Target saavutettu ${progress.consecutiveTargetMetSessions}× peräkkäin → +${increment}kg`,
    };
  }

  if (progress.stagnationWeeks >= 3) {
    return {
      action: "hold",
      suggestedLoad: progress.lastLoadKg,
      reason: `Stagnaatio ${progress.stagnationWeeks} viikkoa — harkitse liikkeen vaihtoa`,
      stagnationWarning: true,
    };
  }

  return {
    action: "hold",
    suggestedLoad: progress.lastLoadKg,
    reason: "Jatka samalla painolla",
  };
}

/**
 * Update movement progress after a session
 */
function updateMovementProgressFromSets(existingProgress, sessionSets, targetReps, targetVx) {
  if (!sessionSets.length) return existingProgress;

  const lastSet = sessionSets[sessionSets.length - 1];
  const lastLoadKg = lastSet.externalLoadKg;
  const lastReps = lastSet.reps;

  // Calculate e1RM for accessory
  const e1rm = e1rmAccessory(lastLoadKg, lastReps);

  // Check if target was met for all sets
  const allTargetMet = sessionSets.every((s) => {
    const repsMet = s.reps >= (s.targetReps || targetReps);
    const varaMet = targetVx === null || s.actualVx === null || s.actualVx >= targetVx;
    return repsMet && varaMet;
  });

  const progress = existingProgress || {
    movementId: lastSet.movementId,
    currentE1RM: null,
    e1rmHistory: [],
    lastLoadKg: null,
    lastReps: null,
    suggestedLoadKg: null,
    suggestedAction: "hold",
    consecutiveTargetMetSessions: 0,
    stagnationWeeks: 0,
    stagnationFlagged: false,
    stagnationNotifiedAt: null,
    status: "active",
    restingSince: null,
  };

  // Update e1RM
  const prevE1RM = progress.currentE1RM;
  progress.currentE1RM = e1rm;
  progress.e1rmHistory = progress.e1rmHistory || [];
  if (e1rm !== null) {
    progress.e1rmHistory.push({ dateISO: todayISO(), e1rm });
  }
  progress.lastLoadKg = lastLoadKg;
  progress.lastReps = lastReps;

  // Update target met counter
  if (allTargetMet) {
    progress.consecutiveTargetMetSessions = (progress.consecutiveTargetMetSessions || 0) + 1;
  } else {
    progress.consecutiveTargetMetSessions = 0;
  }

  // Update stagnation
  if (prevE1RM !== null && e1rm !== null && e1rm <= prevE1RM) {
    progress.stagnationWeeks = (progress.stagnationWeeks || 0) + 1;
  } else if (e1rm !== null && prevE1RM !== null && e1rm > prevE1RM) {
    progress.stagnationWeeks = 0;
    progress.stagnationFlagged = false;
  }

  if (progress.stagnationWeeks >= 3) {
    progress.stagnationFlagged = true;
  }

  // Compute suggestion
  const prog = accessoryProgression(progress);
  progress.suggestedLoadKg = prog.suggestedLoad;
  progress.suggestedAction = prog.action;

  return progress;
}

// ═══════════════════════════════════════════════════════════════
// NEW MOVEMENT INITIAL WEIGHT
// ═══════════════════════════════════════════════════════════════

function initialWeightFrom1RM(oneRepMax) {
  return roundToHalf(oneRepMax * 0.70);
}

// ═══════════════════════════════════════════════════════════════
// BLOCK RESOLUTION & ACCESSORY SCALAR (v4.25 P1-10)
// ═══════════════════════════════════════════════════════════════
//
// Periodisointiteoria (Issurin 2010, Israetel 2017):
// Accessory-volyymin tulisi laskea kun primary-intensiteetti nousee.
// Blokki 1 (hypertrofia) = full volume; blokki 4 (realization) = minimal.
// Tämä estää kumulatiivisen väsymyksen ennen kisaa ja pitää
// primary-liikkeiden palautumisen priorisoituna loppukaudella.
//
// Skaalarit (soveltuvat vain streetlifting_16w-mesosykleihin):
//   Vk 1-4  → 1.00 (hypertrofia: full accessory volume)
//   Vk 5-8  → 0.85 (voima: -15% accessory)
//   Vk 9-12 → 0.70 (intensifikaatio: -30% accessory)
//   Vk 13-16 → 0.50 (realization/taper: -50% accessory)

function getBlockForWeek(weekNum) {
  if (weekNum <= 4) return 1;
  if (weekNum <= 8) return 2;
  if (weekNum <= 12) return 3;
  return 4;
}

const ACCESSORY_BLOCK_SCALARS = { 1: 1.00, 2: 0.85, 3: 0.70, 4: 0.50 };

function getAccessoryBlockScalar(weekNum) {
  return ACCESSORY_BLOCK_SCALARS[getBlockForWeek(weekNum)] ?? 1.0;
}

// ═══════════════════════════════════════════════════════════════
// MU LOAD AUTOREGULATION (v4.25 P1-9)
// ═══════════════════════════════════════════════════════════════
//
// MU on teknis-voimahybridi: e1RM ei ole luotettava (bimodaalinen
// success/fail), joten progressio tapahtuu absoluuttisina kg-askelina
// edellisen session Vx-havainnoista:
//
//   Kaikki sarjat Vx ≥ 3  → +2.5 kg (helppo, nosta)
//   Keskimäärin Vx 2-3    → +0 kg (optimaalinen kuormitus, pidä)
//   Keskimäärin Vx 1-2    → -2.5 kg (liian raskas, pudota)
//   Yksikin sarja Vx 0    → -5 kg (failure, reset)
//
// Returns: { suggestedDeltaKg, reason, avgVx }

// v4.27.16: MU autoregulation Vx-gradient laajennettu (alkuperäinen).
// v4.32.9 M15: Gradient pienennetty puoleen — MU on suhteellisesti raskaampi liike
// kuin takakyykky. 91 kg atleetti, MU 1RM ≈ BW + 30-50 kg lisäpaino → +2.5 kg lisäys
// = 5-8% suhteellisesti, kun BS:ssä +5 kg / 200 kg = 2.5%. Eli MU:n +2.5 kg on
// funktionaalisesti yhtä iso askel kuin BS:n +5 kg. Pere Coll käytännössä +1-2.5 kg
// microloading WPU/MU:hun; Schulz (KoW) RPE-pohjainen 1.25-2.5 kg WPU/Dipissä,
// MU vielä konservatiivisemmin. Tutkimus: ei peer-reviewed-RCT MU-spesifisesti,
// mutta calisthenics-coaching-konsensus tukee pienempää askelta skill-painotteisille
// liikkeille.
//
// Uusi taso:
//   minVx === 0        → −2.5 kg (failure reset — pienempi pudotus kuin BS:ssä)
//   avgVx ≥ 4 & min≥3  → +2.5 kg (clearly easy — entinen +5 jaettu kahteen)
//   avgVx ≥ 3          → +1.25 kg (all-easy, microloading)
//   avgVx ≥ 2          →  0 kg   (optimal-hold)
//   avgVx < 2          → −1.25 kg (liian raskas, kevennä konservatiivisesti)
function adjustMULoad(recentMUSets) {
  if (!recentMUSets || recentMUSets.length === 0) {
    return { suggestedDeltaKg: 0, reason: "no-history", avgVx: null };
  }
  const lastSession = recentMUSets.slice(-3); // viim. 3 sarjaa ~= viim. sessio
  const varas = lastSession.map(s => s.actualVx).filter(v => v !== null && v !== undefined);
  if (varas.length === 0) {
    return { suggestedDeltaKg: 0, reason: "no-vx-data", avgVx: null };
  }
  const minVx = Math.min(...varas);
  const avgVx = varas.reduce((a, b) => a + b, 0) / varas.length;

  // v4.32.9 M15: gradient pienennetty puoleen MU-spesifyydelle
  if (minVx === 0) return { suggestedDeltaKg: -2.5, reason: "failure-reset", avgVx };
  if (avgVx >= 4 && minVx >= 3) return { suggestedDeltaKg: 2.5, reason: "very-easy-big-jump", avgVx };
  if (avgVx >= 3) return { suggestedDeltaKg: 1.25, reason: "all-easy-progress", avgVx };
  if (avgVx >= 2) return { suggestedDeltaKg: 0, reason: "optimal-hold", avgVx };
  return { suggestedDeltaKg: -1.25, reason: "too-hard-backoff", avgVx };
}

// ═══════════════════════════════════════════════════════════════
// FAILURE LOCKOUT (v4.25 P2-16)
// ═══════════════════════════════════════════════════════════════
//
// Jos edellisen primary-session jokin sarja päättyi Vx 0 (failure), seuraava
// sessio ei saa nostaa kuormaa. Tämä estää kumulatiivista ylikuormaa atleetin
// tunnetun grinding-taipumuksen alla (user_athlete_profile.md: "aliarvioi Vx").
//
// Returns: true if last session had Vx=0, false otherwise.

function hadFailureLastSession(recentTopSets) {
  if (!recentTopSets || recentTopSets.length === 0) return false;
  // Group by sessionId to find the most recent session
  const lastSessionId = recentTopSets[recentTopSets.length - 1].sessionId;
  if (!lastSessionId) return false;
  const lastSessionSets = recentTopSets.filter(s => s.sessionId === lastSessionId);
  return lastSessionSets.some(s => s.actualVx === 0);
}

// ═══════════════════════════════════════════════════════════════
// RATE-LIMIT ANCHOR (v4.27.14)
// ═══════════════════════════════════════════════════════════════
//
// Rate-limitin ankkurin valinta: session-vs-session -cappia varten tarvitaan
// "mistä cap nousee" -viitearvo. Aiempi v4.27.12-toteutus käytti viim. settiä
// (recentTopSets[length-1]) — altis yksittäisen anomalian vaikutukselle:
//   • Deload-session viim. setti @55% kevyt → cap sulkeutuu valloittavasti
//   • 3RM-testin 3. setti Vx0 → cap perustuu failure-settiin
//   • Grindiin päätynyt yksittäinen sarja vinouttaa cappia
//
// v4.27.14-strategia:
//   1. Ryhmitä sets sessionId:n mukaan (viim. 3 sessiota)
//   2. Kussakin sessiossa suodata pois: readiness_test, Vx0, externalLoad<=0
//   3. Laske kunkin session MEDIAN load + MEDIAN Vx
//   4. Ankkuri = RASKAIN median-load näistä → estää deload/test-session
//      vetämästä cappia keinotekoisesti alas
//
// v4.34.14: Palautetaan myös LAST-session-profiili. Kutsuva koodi voi ottaa
// MIN(heaviest × cap, last × cap_per_session) → estää historia-PR-bounce-back-ongelman:
// jos atleetilla on vanhoja korkeita kuormia mutta viim. sessio oli paljon kevyempi,
// vanha "heaviest" sallisi takaisinpalaamisen lähelle PR-tasoja yhdessä viikossa
// vaikka edellinen sessio osoitti aktuaalisen tason olevan matalampi.
//
// Returns: { medianLoad, medianVx, fromSessions, lastSession: { medianLoad, medianVx } } tai null.

function computeRateLimitAnchor(recentTopSets) {
  if (!recentTopSets || recentTopSets.length === 0) return null;

  // Ryhmitä sessionId:n mukaan (säilytä aikajärjestys — recentTopSets on jo sortattu asc)
  const sessionOrder = [];
  const sessionGroups = new Map();
  for (const s of recentTopSets) {
    const sid = s.sessionId || `__no_session_${s.timestamp || ""}`;
    if (!sessionGroups.has(sid)) {
      sessionGroups.set(sid, []);
      sessionOrder.push(sid);
    }
    sessionGroups.get(sid).push(s);
  }

  // Ota viim. 3 sessiota
  const recentSessionIds = sessionOrder.slice(-3);

  // Kustakin sessiosta: median load + median Vx (suodata häiriöt)
  const profiles = [];
  for (const sid of recentSessionIds) {
    const sets = (sessionGroups.get(sid) || []).filter(s =>
      (s.externalLoadKg || 0) > 0 &&
      s.setRole !== "readiness_test" &&
      s.actualVx !== 0  // Vx0 = failure, ei käytetä ankkurina
    );
    if (!sets.length) continue;
    const medianLoad = median(sets.map(s => s.externalLoadKg));
    const vxVals = sets.map(s => s.actualVx ?? s.targetVx ?? 2).filter(v => v !== null && v !== undefined);
    const medianVx = vxVals.length ? median(vxVals) : 2;
    profiles.push({ sessionId: sid, medianLoad, medianVx });
  }

  if (profiles.length === 0) return null;

  // Ankkuri = raskain median-load → deload/test-sessio ei vedä cappia alas
  const anchor = profiles.reduce((best, p) => p.medianLoad > best.medianLoad ? p : best);
  // Last-session-profiili — taso josta atleetti on viimeksi nostanut
  const last = profiles[profiles.length - 1];
  return {
    medianLoad: anchor.medianLoad,
    medianVx: anchor.medianVx,
    fromSessions: profiles.length,
    lastSession: { medianLoad: last.medianLoad, medianVx: last.medianVx },
  };
}

// ═══════════════════════════════════════════════════════════════
// LOAD-VELOCITY PROFILE (v4.25.1 — Enode-valmistelu)
// ═══════════════════════════════════════════════════════════════
//
// Rakentaa henkilökohtaisen load-velocity-käyrän ankkuripiste-sarjoista
// (top singlet, openerit, kalibrointitestit). Käyrän avulla voidaan:
//   1. estimoida e1RM ilman failurea (velocity @95% 1RM ≈ liikekohtainen)
//   2. ristiinverrata Vx-pohjaista e1RM:ää (diagnostiikka)
//   3. seurata neurovoiman muutosta kuorma-vakiolla (velocity nousee samalla kuormalla → PR-momentum)
//
// Käyttö: vain sarjoille joilla velocityMean !== null JA setRole on
// "top" | "readiness_test" JA reps === 1 (puhdas 1RM-arvion pohjadata).
// Multi-rep-setit (2+) jäävät ulos koska MCV riippuu rep-positiosta.
//
// Input: sets[] (sessions-store-tasoisia), bodyweightKg, isBarbell
// Output: {
//   points: [{ loadPct, velocity, dateISO, externalLoadKg, systemLoadKg }],
//   slope: number,        // m/s per %1RM (tyypillisesti negatiivinen)
//   intercept: number,    // y-intercept regressioviivasta
//   v1rmEstimate: number, // velocity @100% 1RM (liikekohtainen "minimum velocity threshold")
//   e1rmCrossCheck: number | null, // velocity-pohjainen 1RM arvio (kg)
//   n: number             // pisteiden lukumäärä
// }
//
// Evidenssi: González-Badillo & Sánchez-Medina 2010 — LV-relaatio lineaarinen
// luotettavasti välillä 30-100% 1RM samalle liikkeelle samalle henkilölle.
// Yksilölliset MVT:t: kyykky ~0.30 m/s, penkki ~0.17 m/s, leuka tuntematon
// (streetlifting-data puuttuu). Atleetti rakentaa oman MVT:n ajan myötä.

function computeLoadVelocityProfile(sets, bodyweightKg, options = {}) {
  const { isBarbell = false, currentE1RMExternal = null } = options;
  if (!sets || sets.length === 0) {
    return { points: [], slope: null, intercept: null, v1rmEstimate: null, e1rmCrossCheck: null, n: 0 };
  }

  // Suodata: vain single-rep-setit joilla velocityMean tallennettuna.
  // Velocity-input-gating (index.html) varmistaa että vain ankkuripisteisiin
  // kirjataan velocity → presence of velocityMean + reps===1 on riittävä suodatin.
  // Ei rajoiteta setRoleen koska secondary-slot-top-singlet tallentuvat
  // "accessory"-rolena save-layerissa.
  const anchors = sets.filter(s =>
    s.reps === 1 &&
    (s.velocityMean !== null && s.velocityMean !== undefined) &&
    (s.externalLoadKg !== null && s.externalLoadKg !== undefined)
  );

  if (anchors.length < 2) {
    return { points: anchors.map(a => ({
      loadPct: null, velocity: a.velocityMean, dateISO: a.dateISO || a.timestamp || null,
      externalLoadKg: a.externalLoadKg, systemLoadKg: isBarbell ? a.externalLoadKg : (a.externalLoadKg + bodyweightKg),
    })), slope: null, intercept: null, v1rmEstimate: null, e1rmCrossCheck: null, n: anchors.length };
  }

  // Laske loadPct jokaiselle: suhteessa ikkunan max-kuormaan
  const systemLoads = anchors.map(s => isBarbell ? s.externalLoadKg : (s.externalLoadKg + bodyweightKg));
  const maxLoad = Math.max(...systemLoads);
  const points = anchors.map((s, i) => ({
    loadPct: systemLoads[i] / maxLoad,
    velocity: s.velocityMean,
    dateISO: s.dateISO || s.timestamp || null,
    externalLoadKg: s.externalLoadKg,
    systemLoadKg: systemLoads[i],
  }));

  // Lineaarinen regressio: velocity = slope × loadPct + intercept
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.loadPct, 0);
  const sumY = points.reduce((a, p) => a + p.velocity, 0);
  const sumXY = points.reduce((a, p) => a + p.loadPct * p.velocity, 0);
  const sumXX = points.reduce((a, p) => a + p.loadPct * p.loadPct, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0 || Math.abs(denom) < 1e-9) {
    return { points, slope: null, intercept: null, v1rmEstimate: null, e1rmCrossCheck: null, n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Velocity @100% 1RM (MVT = Minimum Velocity Threshold)
  const v1rmEstimate = slope * 1.0 + intercept;

  // E1RM cross-check: jos meillä on Vx-pohjainen e1RM, laske velocity-pohjainen ja vertaa.
  // Idea: hae setti jossa velocity lähinnä odotettua MVT-arvoa, laske sen kuorma / loadPct.
  // Tämä on heuristiikka — kunnollinen toteutus tarvitsisi liikekohtaiset MVT-vakiot.
  let e1rmCrossCheck = null;
  if (currentE1RMExternal !== null && currentE1RMExternal > 0 && v1rmEstimate > 0) {
    // Käytä regressiota: jokaisesta pisteestä estimoi 1RM = systemLoad / loadPctAtV1RM
    // jossa loadPctAtV1RM = (velocity - intercept) / slope → palauttaa loadPct:n.
    // Jos mallinnus on oikein, kaikki pisteet kertovat saman 1RM:n.
    const estimates = points.map(p => {
      const pctAt1RM = 1.0; // MVT-kohta
      // Inverse: load at MVT = systemLoad / (p.loadPct / pctAt1RM) = systemLoad / p.loadPct
      return p.systemLoadKg / p.loadPct;
    }).filter(v => v > 0 && isFinite(v));
    if (estimates.length > 0) {
      const avgSystemAt1RM = estimates.reduce((a, b) => a + b, 0) / estimates.length;
      e1rmCrossCheck = isBarbell ? avgSystemAt1RM : Math.max(0, avgSystemAt1RM - bodyweightKg);
    }
  }

  return { points, slope, intercept, v1rmEstimate, e1rmCrossCheck, n };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT DAY PLAN GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a full day plan with primary + accessories based on dayType.
 * This ensures the user ALWAYS gets a complete program, even if the
 * mesocycle weekPlan didn't have an entry for today's weekday.
 */
function generateDefaultDayPlan(dayType, weekDef, accessoryCapActive) {
  const primaryReps = weekDef?.heavyReps || (dayType === "volume" ? 5 : dayType === "speed" ? 2 : 3);
  const primaryVx = weekDef?.heavyTargetVx || (dayType === "volume" ? 3 : dayType === "speed" ? 4 : 2);
  const primarySets = dayType === "volume" ? 5 : dayType === "speed" ? 4 : 5;

  const slots = [
    { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: primarySets, reps: primaryReps, targetVx: primaryVx },
  ];

  // Heavy: add back-off sets (3×5 @-10% with higher Vara target)
  if (dayType === "heavy") {
    slots.push(
      { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto (back-off)", sets: 3, reps: 5, targetVx: 3 },
      { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 4, reps: 6, targetVx: 3 },
      { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 3 },
      { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
    );
  } else if (dayType === "volume") {
    slots.push(
      { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 4, reps: 8, targetVx: 3 },
      { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 10, targetVx: 3 },
      { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
    );
  } else if (dayType === "speed") {
    slots.push(
      { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: 4 },
      { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 2, reps: 10, targetVx: null },
    );
  }

  return { dayOfWeek: null, dayType, slots };
}

// ═══════════════════════════════════════════════════════════════
// VELOCITY LOSS %
// ═══════════════════════════════════════════════════════════════

function velocityLossPercent(rep1Velocity, lastRepVelocity) {
  if (!rep1Velocity || !lastRepVelocity || rep1Velocity <= 0) return null;
  return ((rep1Velocity - lastRepVelocity) / rep1Velocity) * 100;
}

// ═══════════════════════════════════════════════════════════════
// RECOMMEND() — DETERMINISTIC RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Main recommendation function.
 * Input: mesocycle state, e1RM, readiness, settings
 * Output: recommended load, set prescription, decisionTrace
 */
async function recommend(options = {}) {
  const settings = options.settings || (await getSettings());
  const bodyweightKg = options.bodyweightKg || settings.bodyweightKg || 91;
  const dateISO = options.dateISO || todayISO();

  const traces = [];
  function trace(ruleId, before, after, why) {
    traces.push({ traceId: uid(), recId: null, ruleId, before: { ...before }, after: { ...after }, why });
  }

  // 1. Get mesocycle
  let mesocycle = options.mesocycle || (await getActiveMesocycle());
  if (!mesocycle) {
    mesocycle = createDefaultMesocycle(dateISO);
    if (!options.dryRun) await saveMesocycle(mesocycle);
    trace("MESOCYCLE_CREATED", {}, { mesocycleId: mesocycle.mesocycleId }, "Uusi mesosykli luotu automaattisesti");
  }

  // 1b. Delegate peaking mesocycles to dedicated engine
  if (mesocycle.type === "peaking") {
    return recommendPeaking({ ...options, mesocycle });
  }

  // 2. Determine week and day
  // v4.22: erottelu "ennen alkua" (pyyntö backfillille ennen mesosyklin
  // startDateISO:a) ja "lopun jälkeen" (sykli päättynyt). Aiemmin molemmat
  // johtivat default-mesosyklin hiljaiseen luomiseen → treeni-näkymä näytti
  // eri dataa kuin sykli-näkymä kun käyttäjä yritti backfillata ennen alkua.
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  let weekNum = pos?.programWeek ?? null;
  if (weekNum === null) {
    if (pos?.reason === "before-start") {
      // Ei luoda uutta mesosykliä — palautetaan selkeä virhe jotta kutsuja
      // (UI) voi estää backfillin ennen mesosyklin alkua.
      trace("MESOCYCLE_BEFORE_START", {}, { startDateISO: mesocycle.startDateISO, requestedDate: dateISO },
        `Pyydetty päivämäärä ${dateISO} on ennen mesosyklin alkua (${mesocycle.startDateISO})`);
      return {
        dateISO,
        error: "before-start",
        errorMessage: `Mesosykli alkoi ${mesocycle.startDateISO} — ei voida laskea suositusta aiemmalle päivälle`,
        traces,
        dayPlan: null,
        dayType: null,
        weekNum: null,
        weekLabel: null,
        targetExternalLoad: null,
        e1rmExternal: null,
        e1rmSystem: null,
      };
    }
    // after-end: mesosykli on päättynyt → EI luoda hiljaisesti uutta.
    // v4.27.3 korjaus: aiempi versio loi automaattisesti createDefaultMesocycle:n
    // (leuka-focus) vaikka käyttäjä olisi ollut esim. streetlifting_16w-ohjelmassa.
    // Tämä tarkoitti että treeni-sessionin tallennuksen jälkeen sovellus saattoi
    // "vaihtaa ohjelman" ilman käyttäjän lupaa, koska getActiveMesocycle() palautti
    // tuoreimman mesosyklin = uuden defaultin.
    //
    // Nyt palautetaan sama pattern kuin MESOCYCLE_BEFORE_START: virhe jonka UI
    // käsittelee näyttämällä "Aloita uusi sykli" -painikkeen käyttäjälle.
    trace("MESOCYCLE_ENDED", {}, {
      prevType: mesocycle.type,
      prevStartDateISO: mesocycle.startDateISO,
      requestedDate: dateISO,
    }, `Edellinen mesosykli (${mesocycle.type}) on päättynyt — käyttäjän tulee valita seuraava`);
    return {
      dateISO,
      error: "mesocycle-ended",
      errorMessage: `Edellinen mesosykli (${mesocycle.type}) on päättynyt — aloita uusi sykli Mesosykli-näkymästä`,
      prevMesocycleType: mesocycle.type,
      prevMesocycleId: mesocycle.mesocycleId,
      traces,
      dayPlan: null,
      dayType: null,
      weekNum: null,
      weekLabel: null,
      targetExternalLoad: null,
      e1rmExternal: null,
      e1rmSystem: null,
    };
  }

  let weekDef = getWeekDef(mesocycle, weekNum);
  const dayOfWeek = new Date(dateISO).getDay() || 7; // 1=Mon, 7=Sun
  let dayPlan = getTodayPlan(mesocycle, weekNum, dayOfWeek);
  let dayType = dayPlan?.dayType || options.dayType || "heavy";

  const isInsertedDeload = isInsertedDeloadWeek(mesocycle, dateISO);
  const isReplacedDeload = isReplacedDeloadWeek(mesocycle, dateISO);
  const isDeloadOverride = isInsertedDeload || isReplacedDeload;
  if (isDeloadOverride) {
    // Override: käyttäjän kevennysviikko (lisätty tai korvaava).
    // Volyymi ~50%, kuorma -20%, Vx +2, pakotetaan volume-päivä.
    dayType = "volume";
    const deloadLabel = isInsertedDeload
      ? `Kevennysviikko (lisätty vk ${weekNum} jälkeen)`
      : `Kevennysviikko (korvaa vk ${weekNum})`;
    weekDef = { ...(weekDef || {}), week: weekNum, deltaPctBase: -0.20, label: deloadLabel, heavyReps: weekDef?.heavyReps || 5, heavyTargetVx: (weekDef?.heavyTargetVx ?? 2) + 2 };
    if (dayPlan && dayPlan.slots) {
      const prunedSlots = dayPlan.slots
        .filter(s => s.role === "primary" || s.role === "backoff" || s.slotId === "scapular-control" || s.slotId === "core-hollow")
        .map(s => ({
          ...s,
          sets: Math.max(1, Math.ceil((s.sets || 3) / 2)),
          targetVx: s.targetVx !== null && s.targetVx !== undefined ? s.targetVx + 2 : null,
        }));
      dayPlan = { ...dayPlan, slots: prunedSlots, dayType: "volume" };
    }
    trace("DELOAD_OVERRIDE", {}, { weekNum, dayType, mode: isInsertedDeload ? "insert" : "replace" }, `Käyttäjän kevennysviikko (${isInsertedDeload ? "lisätty" : "korvaava"}): volyymi ~50%, kuorma -20%, Vx +2`);
  }

  trace("MESOCYCLE_PHASE", {}, { weekNum, dayType, label: weekDef?.label }, `Viikko ${weekNum}: ${weekDef?.label || "?"}`);

  // 3. Break analysis
  const sessions = options.sessions || (await getAllSessions());
  const lastSession = sessions[sessions.length - 1];
  const breakInfo = breakAnalysis(lastSession?.dateISO, dateISO);

  if (breakInfo.modifier !== 0) {
    if (breakInfo.forcedDayType) {
      const oldDayType = dayType;
      dayType = breakInfo.forcedDayType;
      trace("RETURN_FROM_BREAK_DAYTYPE", { dayType: oldDayType }, { dayType }, breakInfo.message);
    }
    trace("RETURN_FROM_BREAK", { modifier: 0 }, { modifier: breakInfo.modifier, breakDays: breakInfo.breakDays }, breakInfo.message);

    // Check mesocycle reset
    if (breakInfo.breakDays >= 14) {
      const skippedWeeks = Math.floor(breakInfo.breakDays / 7);
      const resetInfo = mesocycleBreakReset(mesocycle, skippedWeeks);
      if (resetInfo.reset) {
        mesocycle = createDefaultMesocycle(dateISO);
        if (!options.dryRun) await saveMesocycle(mesocycle);
        weekNum = 1;
        trace("MESOCYCLE_BREAK_RESET", {}, { weekNum: 1 }, resetInfo.reason);
      }
    }
  }

  // 4. Compute e1RM from recent top sets
  const allSets = options.allSets || (await getAllSets());
  const primaryMovementId = options.primaryMovementId || null;

  // Detect barbell-only lift (squat): no bodyweight added to system load
  const primarySlotMeta = dayPlan?.slots?.find(s => s.role === "primary");
  const isBarbell = primarySlotMeta?.isBarbell === true;

  // Filter to primary movement top sets, sorted by date
  // v4.27.15: calibration-setit (AMRAP-testit deload-viikoilla) lasketaan mukaan
  // e1RM-laskentaan. Niillä actualVx === 0 (tekninen failure), jolloin Epley+Vara
  // redusoituu puhtaaksi Epleyksi: e1RM = kuorma × (1 + toistot/30) — vapaa
  // Vx-biasista.
  const topSets = allSets
    .filter((s) => {
      if (primaryMovementId && s.movementId !== primaryMovementId) return false;
      return s.setRole === "top" || s.setRole === "readiness_test" || s.setRole === "calibration";
    })
    .sort((a, b) => {
      // Sort by session date via sessionId lookup or timestamp
      return (a.timestamp || "").localeCompare(b.timestamp || "");
    });

  // e1RM from last 4-6 top sets
  // Barbell lifts (squat): external-load-only formula. CKC lifts: system load (BW + ext).
  const recentTopSets = topSets.slice(-6);
  const e1rmValues = recentTopSets
    .map((s) => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      if (isBarbell) {
        return e1rmAccessory(s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
      }
      return e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
    })
    .filter((v) => v !== null);

  // v4.27.15 → v4.32.8: CALIBRATION OVERRIDE
  //
  // Kalibrointisetti (setRole === "calibration") antaa tarkkuus-prioritisoidun
  // e1RM-mittauksen. Jos TOP-sarjoissa on viim. 3 setissä yksi tai useampi
  // kalibrointi, override: käytä pelkästään kalibrointisettien mediaania
  // (ohita Vx-kontaminoidut top-singlet).
  //
  // v4.32.8 PROTOKOLLAMUUTOS: AMRAP @85 % × failure (V0) → 92 % × 3 V1 (RPE 8).
  //   Tarkkuusparannus DiStasio 2014 + Helms MASS 2023:
  //   - Low-rep e1RM-tarkkuus ±2.7 kg vs AMRAP-extrapoloinnin ±5+ kg
  //   - CNS-kuorma matalampi → deload-viikolla turvallisempi
  //   - actualVx-fallback: ?? targetVx ?? 1 (yhdenmukainen e1RM-laskennan kanssa)
  //
  // Ikkunat:
  //   • Kalibrointi viim. 3 topissa → override (tuore kalibrointi hallitsee)
  //   • Vanhempi kalibrointi       → takaisin mediaaniin (strength changes
  //                                   drift + uutta data kertyy)
  //
  // Backward compat: vanhat V0-AMRAP-kalibroinnit toimivat edelleen
  //   (s.actualVx === 0 → vara = 0 → puhdas Epley).
  const last3Sets = recentTopSets.slice(-3);
  const recentCalibSets = last3Sets.filter(s => s.setRole === "calibration");
  let currentE1RMSystem;
  let e1rmSource = "median";
  if (recentCalibSets.length > 0) {
    const calibE1rms = recentCalibSets.map(s => {
      // v4.32.8: fallback chain — actualVx (raportoitu) → targetVx (V1 uudessa, V0 vanhassa) → 1
      const vara = s.actualVx ?? s.targetVx ?? 1;
      if (isBarbell) {
        return e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara);
      }
      return e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, vara);
    }).filter(v => v !== null);
    currentE1RMSystem = calibE1rms.length > 0 ? median(calibE1rms) : (e1rmValues.length > 0 ? median(e1rmValues) : null);
    if (calibE1rms.length > 0) e1rmSource = `calibration (${recentCalibSets.length} setti${recentCalibSets.length > 1 ? "ä" : ""})`;
  } else {
    currentE1RMSystem = e1rmValues.length > 0 ? median(e1rmValues) : null;
  }
  let currentE1RMExternal = currentE1RMSystem !== null
    ? (isBarbell ? currentE1RMSystem : Math.max(0, currentE1RMSystem - bodyweightKg))
    : null;

  // v4.34.15 FIX #1: E1RM-INFLAATION CAP — Epley + Vara -kaava ylimitatoi 1RM:n
  // varsinkin korkeilla toistoilla (V3+ × 6 reps → +20 % seedista yhden session perusteella).
  // Käyttäjäpalaute simulaatiosta: "vk 1 e1RM 106 vs todellinen ~89 — vk 8 cal yli PR".
  //
  // Logiikka:
  //   1. Jos kalibrointi-setti on viim. 12 setissä → ceiling = cal-derived e1RM × 1.05
  //      (cal on validoitu mittaus, salli max +5 % parannus seuraavaan caliin asti)
  //   2. Muuten käytä mesocyclen streetliftingConfig.calibration.leukaExtKg × 1.10
  //      (ei vielä validoitu mittausta, salli max +10 % seedistä)
  //   3. Jos ei kumpaakaan, ei capata (legacy-yhteensopivuus)
  //
  // Cap pätee vain kun currentE1RMExternal > ceiling. Alaspäin ei capata
  // (oikea heikkous-signaali pitää näkyä rate-limit-anchorissa, ei piilottaa).
  if (currentE1RMExternal !== null && primaryMovementId) {
    const allCalSets = topSets.filter(s => s.setRole === "calibration");
    const recentCalForCeiling = allCalSets.slice(-3); // viim. 3 cal-settiä
    let ceiling_ext = null;
    let ceilingSource = null;

    if (recentCalForCeiling.length > 0) {
      // Käytä viim. cal-setin e1RM:ää × 1.05
      const calE1RMs = recentCalForCeiling.map(s => {
        const cv = s.actualVx ?? s.targetVx ?? 1;
        const e1rmSys = isBarbell
          ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, cv)
          : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, cv);
        return isBarbell ? e1rmSys : (e1rmSys - bodyweightKg);
      }).filter(v => v !== null);
      if (calE1RMs.length > 0) {
        ceiling_ext = Math.max(...calE1RMs) * 1.05;
        ceilingSource = `cal-derived (max ${Math.max(...calE1RMs).toFixed(1)} × 1.05)`;
      }
    }

    if (ceiling_ext === null) {
      // Ei cal-historiaa → käytä konfiguroitu PR × 1.10
      const cfg = mesocycle?.streetliftingConfig?.calibration || {};
      // Map movement → config key (Lisäpainoleuanveto → leukaExtKg, etc.)
      const movName = primarySlotMeta?.defaultMovementName;
      const initialPR = movName === "Lisäpainoleuanveto" ? cfg.leukaExtKg
                      : movName === "Lisäpainodippi"     ? cfg.dippiExtKg
                      : movName === "Takakyykky"          ? cfg.kyykkyExtKg
                      : null;
      if (initialPR && initialPR > 0) {
        ceiling_ext = initialPR * 1.10;
        ceilingSource = `${movName} PR ${initialPR} × 1.10`;
      }
    }

    if (ceiling_ext !== null && currentE1RMExternal > ceiling_ext) {
      const original = currentE1RMExternal;
      currentE1RMExternal = ceiling_ext;
      currentE1RMSystem = isBarbell ? ceiling_ext : (ceiling_ext + bodyweightKg);
      trace("E1RM_INFLATION_CAP",
        { e1rmExternal: original },
        { e1rmExternal: currentE1RMExternal, ceiling: ceiling_ext, source: ceilingSource },
        `e1RM ${original.toFixed(1)} kg → ${currentE1RMExternal.toFixed(1)} kg (cap: ${ceilingSource})`);
    }
  }

  trace("E1RM_COMPUTED", {}, {
    e1rmSystem: currentE1RMSystem?.toFixed(1),
    e1rmExternal: currentE1RMExternal?.toFixed(1),
    fromSets: recentTopSets.length,
    source: e1rmSource,
  }, `e1RM laskettu ${recentTopSets.length} viimeisimmästä top-setistä (lähde: ${e1rmSource})`);

  // v4.25.1: LV-profiilin cross-check (Enode-valmistelu). Ei vaikuta kuormaan —
  // diagnostiikka kun velocity-dataa kertyy ankkuripisteistä. Jos ristiinveto
  // eroaa yli ±7% Vx-pohjaisesta e1RM:stä, tämä on *signaali* että joko:
  //   (a) Vx-raportointi on systemaattisesti biased (atleetin tunnettu taipumus), tai
  //   (b) velocity-anturi on kalibroimaton, tai
  //   (c) LV-profiili on vielä rakentumassa (n < 5 pistettä — vähemmän luotettava).
  if (currentE1RMExternal !== null) {
    // Anchor-set haku: primary-liikkeen KAIKKI setit joilla velocityMean
    // (riippumatta setRole:sta — secondary-slot-top-singlet tallentuvat "accessory"-rolena).
    const anchorSetsForLV = primaryMovementId
      ? allSets.filter(s =>
          s.movementId === primaryMovementId &&
          s.velocityMean !== null && s.velocityMean !== undefined &&
          s.reps === 1
        )
      : [];
    const lvProfile = computeLoadVelocityProfile(anchorSetsForLV, bodyweightKg, {
      isBarbell,
      currentE1RMExternal,
    });
    if (lvProfile.n >= 3 && lvProfile.e1rmCrossCheck !== null) {
      const diffPct = (lvProfile.e1rmCrossCheck - currentE1RMExternal) / currentE1RMExternal;
      const absDiff = Math.abs(diffPct);
      const severity = absDiff > 0.07 ? "SIGNIFICANT" : absDiff > 0.03 ? "MODERATE" : "ALIGNED";
      trace("VBT_E1RM_CROSSCHECK", {},
        {
          e1rmVx: currentE1RMExternal.toFixed(1),
          e1rmVelocity: lvProfile.e1rmCrossCheck.toFixed(1),
          diffPct: (diffPct * 100).toFixed(1) + "%",
          v1rmEstimate: lvProfile.v1rmEstimate?.toFixed(2),
          points: lvProfile.n,
          severity,
        },
        `LV-profiili ${lvProfile.n} pistettä · Vx-e1RM ${currentE1RMExternal.toFixed(1)} kg vs. velocity-e1RM ${lvProfile.e1rmCrossCheck.toFixed(1)} kg (${(diffPct * 100).toFixed(1)}%) · ${severity}`);
    }
  }

  // 5. Readiness
  const readiness = options.readiness || { combined: "GREEN", capLevel: 0, channels: {} };
  const capLevel = readiness.capLevel;

  // 6. deltaPct calculation
  const dayMult = DAY_TYPE_MULTIPLIERS[dayType] ?? 1.0;
  let deltaPctRawValue = (weekDef?.deltaPctBase || 0) * dayMult;
  trace("DELTA_PCT_RAW", {}, { deltaPctRaw: deltaPctRawValue }, `deltaPct_raw = ${weekDef?.deltaPctBase || 0} × ${dayMult}`);

  // 7. Vara trend correction (asymmetric: aggressive up, conservative down)
  const varaCorr = varaTrendCorrection(recentTopSets);
  if (varaCorr !== 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += varaCorr;
    trace("VARA_TREND_CORRECTION", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `Vara-trendikorjaus: ${varaCorr > 0 ? "+" : ""}${(varaCorr * 100).toFixed(2)}% ${varaCorr > 0.015 ? "(AKSELEROINTI 🚀)" : ""}`);
  }

  // 7b. e1RM momentum bonus (PR-trendi kiihdyttää)
  const e1rmSeries = e1rmValues.map(v => ({ e1rm: v }));
  const momentumBonus = e1rmMomentumBonus(e1rmSeries);
  if (momentumBonus > 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += momentumBonus;
    trace("E1RM_MOMENTUM_BONUS", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `PR-momentum +${(momentumBonus * 100).toFixed(2)}% (e1RM nousutrendi)`);
  }

  // 7c. Gross-mismatch correction (ohjelma aivan väärin skaalattu → escalointi)
  const grossCorr = grossMismatchCorrection(recentTopSets);
  if (grossCorr > 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += grossCorr;
    trace("GROSS_MISMATCH_CORRECTION", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `Ohjelman skaalausvirhe havaittu — pikakorjaus +${(grossCorr * 100).toFixed(2)}%`);
  }

  // 8. Break modifier
  if (breakInfo.modifier !== 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue += breakInfo.modifier;
    trace("BREAK_MODIFIER", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue }, `Tauko-modifikaattori: ${breakInfo.modifier * 100}%`);
  }

  // 8b. Failure lockout (v4.25 P2-16): jos edellinen sessio meni failureen
  // (Vx 0), ei nosteta kuormaa. Suojaa atleetin grinding-taipumukselta.
  if (hadFailureLastSession(recentTopSets) && deltaPctRawValue > 0) {
    const oldDelta = deltaPctRawValue;
    deltaPctRawValue = Math.min(deltaPctRawValue, 0);
    trace("FAILURE_LOCKOUT", { deltaPct: oldDelta }, { deltaPct: deltaPctRawValue },
      "Edellinen sessio Vx 0 → kuormaa ei nosteta (failure-lockout)");
  }

  // 9. Clamp
  const maxDelta = settings.maxDelta || 0.25;
  let deltaPct = clamp(deltaPctRawValue, -maxDelta, maxDelta);

  // 10. Apply readiness cap + active load reduction
  //     RED  → -5 % kuormaan (tai -8 % jos sekä velocity että Vara punaisia)
  //     YELLOW → -2 % kuormaan
  //     Samalla + targetVx +1 (kevennä varaa) jotta sarjat eivät mene failureen.
  let readinessLoadReduction = 0;
  let readinessVxBump = 0;
  if (capLevel === 2) {
    const oldDelta = deltaPct;
    deltaPct = Math.min(deltaPct, 0);
    if (dayType === "heavy") {
      const oldDayType = dayType;
      dayType = "volume";
      trace("CAP_RED_DAYTYPE", { dayType: oldDayType }, { dayType: "volume" }, "RED readiness → heavy vaihdettu volume:ksi");
    }
    // Double-red (velocity + Vara molemmat RED) = syvä väsymys → isompi vähennys
    const velRed = readiness.channels?.velocity?.class === "RED";
    const varaRed = readiness.channels?.vara?.class === "RED";
    readinessLoadReduction = (velRed && varaRed) ? -0.08 : -0.05;
    readinessVxBump = 1;
    deltaPct += readinessLoadReduction;
    trace("CAP_RED", { deltaPct: oldDelta }, { deltaPct }, `RED readiness → kuorma ${(readinessLoadReduction * 100).toFixed(1)}% + targetVx +${readinessVxBump}${velRed && varaRed ? " (double-red: velocity + Vara)" : ""}`);
  } else if (capLevel === 1) {
    const oldDelta = deltaPct;
    deltaPct = deltaPct * 0.5;
    readinessLoadReduction = -0.02;
    deltaPct += readinessLoadReduction;
    trace("CAP_YELLOW", { deltaPct: oldDelta }, { deltaPct }, `YELLOW readiness → deltaPct puolitettu + kuorma ${(readinessLoadReduction * 100).toFixed(1)}%`);
  }

  // 11. Compute target load — use actual slot reps/Vx when available
  let targetReps, targetVx;
  const primarySlotForLoad = dayPlan?.slots?.find(s => s.role === "primary");
  if (primarySlotForLoad) {
    // Use actual dayPlan slot values (from weekPlan)
    targetReps = primarySlotForLoad.reps;
    targetVx = primarySlotForLoad.targetVx ?? (dayType === "heavy" ? 2 : dayType === "volume" ? 3 : 4);
  } else if (weekDef) {
    targetReps = dayType === "heavy" ? weekDef.heavyReps : (dayType === "volume" ? 5 : 2);
    targetVx = dayType === "heavy" ? weekDef.heavyTargetVx : (dayType === "volume" ? 3 : 4);
  } else {
    targetReps = 3;
    targetVx = 2;
  }

  // Apply readiness Vx bump (RED day → +1 Vx kaikkiin sarjoihin, turvapuskuri)
  if (readinessVxBump > 0 && targetVx !== null) {
    targetVx = targetVx + readinessVxBump;
  }

  let targetExternalLoad;

  // v4.22 P2: Relative-loading -polku. Kun slot määrittelee loadPct (% nykyisestä
  // ext e1RM:stä), engine kunnioittaa sitä suoraan. Tämä on ohjelma-tekijän
  // eksplisiittinen ilmaus: "viikko 11 primary = 90 % current e1RM" — ei
  // mitään deltaPct + effReps -taikuutta päälle. Mahdottomia >100 % 1RM
  // kuormia ei voi syntyä ellei loadPct ole itsessään > 1.0.
  //
  // Käyttö: slot.loadPct = 0.90. Backward-compat: jos loadPct puuttuu, fallback
  // alempaan deltaPct-pohjaiseen laskentaan (ylläpito vanhoille mesosykleille).
  if (primarySlotMeta?.loadPct !== undefined && primarySlotMeta?.loadPct !== null) {
    const pct = primarySlotMeta.loadPct;
    if (currentE1RMExternal !== null && currentE1RMExternal > 0) {
      // Lisäpainoliikkeet: kuorma = extE1RM × pct suoraan
      // Tankoliikkeet (isBarbell): kuorma = extE1RM × pct suoraan
      targetExternalLoad = roundToHalf(Math.max(0, currentE1RMExternal * pct));
      trace("LOAD_PCT_RESOLVED", {}, { pct, currentE1RMExternal, targetExternalLoad },
        `${(pct*100).toFixed(0)}% × current e1RM (${currentE1RMExternal} kg) = ${targetExternalLoad} kg`);

      // v4.27.12: SESSION-TO-SESSION PROGRESSION RATE LIMIT
      // v4.27.14: ROBUST ANCHOR — viim. 3 session raskain MEDIAN, ei yksittäistä setriä
      //
      // Suojaus yksittäisen session e1RM-spiikiltä. Cap-only-ohjelma EI saa
      // suosittaa fysiologisesti mahdottomia hyppyjä viikossa (esim. +19%
      // samalla Vx:llä). Epley+Vara e1RM on herkkä Vx-aliarvioinnille, ja
      // median viimeisistä N sarjasta heiluu rajusti kun historiaa on vähän.
      //
      // Sääntö (session-vs-session):
      //   • Vx pysyy samana tai vaikeutuu → max +6 % / viikko
      //   • Vx helpottuu +1                → max +10 % / viikko
      //   • Vx helpottuu +2 tai enemmän    → max +15 % / viikko
      //
      // Ankkurin valinta (v4.27.14):
      //   1. Ryhmitä sets sessionId:n mukaan, ota viim. 3 sessiota
      //   2. Kustakin: median load + median Vx (suodata readiness_test + Vx0)
      //   3. Ankkuri = RASKAIN median-load — estää deload- tai test-session
      //      vetävän cappia alas (ongelma v4.27.12:ssa: viim. setti voi olla
      //      deloadin kevein setti → cap sulkeutuu vääristyneelle tasolle).
      //
      // v4.34.15 FIX: DUAL-ANCHOR + DELOAD-AWARE LOGIC.
      // v4.34.14:n MIN(heaviest, last) -dual-anchor rikkoi post-deload-viikot:
      // jos last-session = deload (V4-V5 kevyttä), uusi raskas viikko (V1) sai capin
      // 50 × 1.06 = 53 kg vaikka heaviest oli 78 V1 cal. Korjaus:
      //   - lastVxDelta < 0 (uusi sarja VAIKEAMPI kuin viime) → IGNORE last-anchor.
      //     Last-sessio oli helpompi (deload), ei relevantti rajoitin.
      //   - lastVxDelta >= 0 (sama tai helpompi Vx) → käytä MIN molemmista.
      //     Tällöin last-anchor estää historia-PR-bounce-back-ongelman.
      const anchor = computeRateLimitAnchor(recentTopSets);
      if (anchor) {
        const newVx = targetVx ?? 2;
        const vxDelta = newVx - anchor.medianVx;
        const weeklyCap = vxDelta >= 2 ? 0.15 : vxDelta >= 1 ? 0.10 : 0.06;
        const cappedHeaviest = anchor.medianLoad * (1 + weeklyCap);

        const lastVxDelta = newVx - anchor.lastSession.medianVx;
        const useLastAnchor = lastVxDelta >= 0;  // KRIITTINEN — vain jos sama/helpompi
        let cappedLast = Infinity;
        let lastWeeklyCap = null;
        if (useLastAnchor) {
          lastWeeklyCap = lastVxDelta >= 2 ? 0.15 : lastVxDelta >= 1 ? 0.10 : 0.06;
          cappedLast = anchor.lastSession.medianLoad * (1 + lastWeeklyCap);
        }

        const capped = Math.min(cappedHeaviest, cappedLast);
        const cappedBy = !useLastAnchor ? "heaviest-only (last was easier=deload)"
                       : cappedLast < cappedHeaviest ? "last-session" : "heaviest-median";
        if (targetExternalLoad > capped) {
          const original = targetExternalLoad;
          targetExternalLoad = roundToHalf(capped);
          const lastNote = useLastAnchor
            ? `last ${anchor.lastSession.medianLoad.toFixed(1)}@V${anchor.lastSession.medianVx.toFixed(1)} +${(lastWeeklyCap*100).toFixed(0)}% = ${cappedLast.toFixed(1)}`
            : `last @V${anchor.lastSession.medianVx.toFixed(1)} (helpompi → ohitettu)`;
          trace("PROGRESSION_RATE_LIMIT", { targetExternalLoad: original },
            { targetExternalLoad, anchorLoad: anchor.medianLoad, anchorVx: anchor.medianVx,
              lastLoad: anchor.lastSession.medianLoad, lastVx: anchor.lastSession.medianVx,
              newVx, weeklyCap, lastWeeklyCap, cappedBy, useLastAnchor, fromSessions: anchor.fromSessions },
            `Rate-limit (${cappedBy}): ${original} → ${targetExternalLoad} kg (heaviest ${anchor.medianLoad.toFixed(1)}@V${anchor.medianVx.toFixed(1)} +${(weeklyCap*100).toFixed(0)}% = ${cappedHeaviest.toFixed(1)} | ${lastNote})`);
        }
      }
    } else if (primarySlotMeta?.suggestedLoadKg) {
      // Ei vielä e1RM-historiaa → käytä plan-seedattua kuormaa
      targetExternalLoad = primarySlotMeta.suggestedLoadKg;
      trace("LOAD_PCT_SEED", {}, { targetExternalLoad, pct },
        `loadPct ${(pct*100).toFixed(0)}% mutta ei e1RM-historiaa → seed ${targetExternalLoad} kg`);
    } else {
      targetExternalLoad = null;
    }
  } else if (currentE1RMSystem !== null) {
    // Legacy-polku: deltaPct-pohjainen laskenta (käytössä default-mesosyklissä
    // ja vanhemmissa streetlifting_16w-sessioissa jotka eivät vielä tunne loadPct:tä)
    const effectiveReps = targetReps + targetVx;
    if (isBarbell) {
      targetExternalLoad = roundToHalf(Math.max(0,
        (currentE1RMSystem / (1 + effectiveReps / 30)) * (1 + deltaPct)));
    } else {
      const targetSystemLoad = currentE1RMSystem / (1 + effectiveReps / 30);
      const rawExternal = targetSystemLoad * (1 + deltaPct) - bodyweightKg;
      targetExternalLoad = roundToHalf(Math.max(0, rawExternal));
    }
  } else {
    targetExternalLoad = null;
  }

  // Fallback: use slot's suggestedLoadKg when no e1RM history (e.g. new lift / start of program)
  if (targetExternalLoad === null && primarySlotMeta?.suggestedLoadKg !== undefined && primarySlotMeta.suggestedLoadKg !== null) {
    targetExternalLoad = primarySlotMeta.suggestedLoadKg;
    trace("SUGGESTED_LOAD_FALLBACK", {}, { targetExternalLoad },
      "Ei e1RM-dataa — käytetään ohjelman ehdotettu lähtökuorma");
  }

  // v4.27.13: NON-PRIMARY SLOT LOAD RESOLUTION
  //
  // Pre-v4.27.13-bug: UI renderöi backoff-slotin aina "primary × 0.85" (riippumatta
  // slotin omasta loadPct:stä), ja secondary-slotit (top singlet, etukyykky LA)
  // eivät koskaan lukeneet loadPct:tään — UI haki MovementProgress-historiasta.
  // Tämä romautti streetlifting_16w:n relative-loading-arkkitehtuurin: vk 7-16
  // "Top single @88-95%" ja LA:n etukyykky-progressio eivät ikinä toteutuneet
  // suunnitellusti.
  //
  // Ratkaisu: Engine resolvoi jokaisen loadPct-slotin kuorman:
  //   1. Sama liike kuin primary → johdetaan session-effective-e1RM primaryn
  //      (mahdollisesti rate-limitatusta) targetExternalLoad:sta. Näin
  //      primaryn rate-limit säteilee automaattisesti backoff/secondaryyn.
  //   2. Eri liike (loadPctReferenceMovementName asetettu, esim. etukyykky
  //      → Takakyykky) → haetaan referenssi-liikkeen e1RM sen omasta
  //      historiasta, ja sovelletaan erillinen rate-limit slotin oman
  //      liikkeen viim. sarjasta jos historiaa on.
  // Resolvoitu kuorma asetetaan slot.resolvedLoadKg:ksi; UI lukee sen.
  if (dayPlan?.slots) {
    const primaryHasLoadPct = primarySlotMeta?.loadPct !== undefined &&
                              primarySlotMeta?.loadPct !== null &&
                              primarySlotMeta.loadPct > 0;
    const sessionEffectiveE1RM = (primaryHasLoadPct && targetExternalLoad !== null)
      ? targetExternalLoad / primarySlotMeta.loadPct
      : null;
    const primaryMovementName = primarySlotMeta?.defaultMovementName || null;

    // Haetaan liikeluettelo kerran (tarvitaan cross-reference-haaralle)
    let allMovsForResolve = null;
    const needsAllMovs = dayPlan.slots.some(s => s.loadPctReferenceMovementName);
    if (needsAllMovs) {
      allMovsForResolve = options.allMovements || await getAllMovements();
    }

    for (const slot of dayPlan.slots) {
      if (slot.role === "primary") continue;
      if (slot.loadPct === undefined || slot.loadPct === null || slot.loadPct <= 0) continue;

      // v4.34.15 FIX #2: CALIBRATION-SLOT RESOLVER + PR-CAP.
      // Cal-päivissä ei ole primary-slottia (kaikki role:"calibration"), joten Haara A ei laukea.
      // Cal-load = pct × currentE1RMExternal (jos sama liike) JA capattu PR × 1.025 (turva).
      // Fix #1 (e1RM-inflaatiocap) on jo rajoittanut currentE1RMExternalia, joten cal-load
      // on luonnollisesti turvarajoissa, mutta lisätään silti eksplisiittinen PR-cap defenseksi.
      if (slot.role === "calibration" &&
          !slot.loadPctReferenceMovementName &&
          slot.defaultMovementName) {
        // Etsi tämän liikkeen oma e1RM (ei välttämättä primaryMovementId)
        const calMovName = slot.defaultMovementName;
        const cfg = mesocycle?.streetliftingConfig?.calibration || {};
        const initialPR = calMovName === "Lisäpainoleuanveto" ? cfg.leukaExtKg
                        : calMovName === "Lisäpainodippi"     ? cfg.dippiExtKg
                        : calMovName === "Takakyykky"          ? cfg.kyykkyExtKg
                        : null;
        // Jos cal-liike == primary-liike (joka ohjaa currentE1RMExternalia), käytä sitä
        let calBaseE1RM = null;
        if (primaryMovementName === calMovName && currentE1RMExternal !== null) {
          calBaseE1RM = currentE1RMExternal;
        } else if (initialPR && initialPR > 0) {
          // Muuten käytä konfiguroitu PR (cal-liike voi olla eri kuin primary tällä päivällä)
          calBaseE1RM = initialPR;
        }
        if (calBaseE1RM !== null) {
          let calLoad = calBaseE1RM * slot.loadPct;
          // PR-cap: cal-load ei koskaan yli PR × 1.025 (max +2.5 kg uutta ennätystä testissä)
          let prCapped = false;
          if (initialPR && calLoad > initialPR * 1.025) {
            calLoad = initialPR * 1.025;
            prCapped = true;
          }
          slot.resolvedLoadKg = roundToHalf(Math.max(0, calLoad));
          trace("SLOT_LOAD_RESOLVED_CAL",
            { slotRole: slot.role, slotMovement: calMovName },
            { resolvedLoadKg: slot.resolvedLoadKg, pct: slot.loadPct,
              baseE1RM: calBaseE1RM.toFixed(1), PR: initialPR, prCapped },
            `${calMovName} cal: ${(slot.loadPct*100).toFixed(0)}% × ${calBaseE1RM.toFixed(1)} kg = ${slot.resolvedLoadKg} kg${prCapped ? ` (PR-cap = ${initialPR}×1.025)` : ""}`);
          continue;
        }
      }

      // Haara A: slot jakaa primaryn liikkeen → käytä session-effective-e1RM
      if (!slot.loadPctReferenceMovementName &&
          sessionEffectiveE1RM !== null &&
          primaryMovementName &&
          slot.defaultMovementName === primaryMovementName) {
        slot.resolvedLoadKg = roundToHalf(Math.max(0, sessionEffectiveE1RM * slot.loadPct));
        trace("SLOT_LOAD_RESOLVED",
          { slotRole: slot.role, slotMovement: slot.defaultMovementName },
          { resolvedLoadKg: slot.resolvedLoadKg, pct: slot.loadPct, sessionE1RM: sessionEffectiveE1RM.toFixed(1) },
          `${slot.role} ${slot.defaultMovementName}: ${(slot.loadPct*100).toFixed(0)}% × ${sessionEffectiveE1RM.toFixed(1)} kg = ${slot.resolvedLoadKg} kg (primary-rate-limit säteilee)`);
        continue;
      }

      // Haara B: cross-reference (esim. etukyykky → takakyykky-e1RM)
      if (slot.loadPctReferenceMovementName && allMovsForResolve) {
        const refMov = allMovsForResolve.find(m => m.name === slot.loadPctReferenceMovementName);
        if (!refMov) continue;
        const refSets = allSets
          .filter(s => s.movementId === refMov.movementId &&
                       (s.setRole === "top" || s.setRole === "readiness_test"))
          .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
        if (refSets.length === 0) continue;
        const refIsBarbell = slot.isBarbell === true;
        const refRecent = refSets.slice(-6);
        const refVals = refRecent.map(s => {
          const vara = s.actualVx ?? s.targetVx ?? 1;
          if (refIsBarbell) return e1rmAccessory(s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
          return e1rmExternal(bodyweightKg, s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
        }).filter(v => v !== null);
        const refE1RM = refVals.length ? median(refVals) : null;
        if (refE1RM === null || refE1RM <= 0) continue;

        let baseLoad = roundToHalf(Math.max(0, refE1RM * slot.loadPct));

        // Rate-limit slotin oman liikkeen historiasta
        // v4.27.14: käyttää computeRateLimitAnchor-helperiä (viim. 3 session
        // raskain median) sen sijaan että käytettäisiin yksittäistä viim. setriä.
        // Robustimpi deload/test-sessioille ja yksittäisille anomalioille.
        const selfMov = allMovsForResolve.find(m => m.name === slot.defaultMovementName);
        if (selfMov) {
          const selfSets = allSets
            .filter(s => s.movementId === selfMov.movementId && s.externalLoadKg > 0)
            .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
          const selfAnchor = computeRateLimitAnchor(selfSets);
          if (selfAnchor) {
            // v4.34.15: deload-aware dual-anchor (sama korjaus kuin primary-haarassa)
            const newVx = slot.targetVx ?? 2;
            const vxDelta = newVx - selfAnchor.medianVx;
            const weeklyCap = vxDelta >= 2 ? 0.15 : vxDelta >= 1 ? 0.10 : 0.06;
            const cappedHeaviest = selfAnchor.medianLoad * (1 + weeklyCap);
            const lastVxDelta = newVx - selfAnchor.lastSession.medianVx;
            const useLastAnchor = lastVxDelta >= 0;
            let cappedLast = Infinity;
            let lastWeeklyCap = null;
            if (useLastAnchor) {
              lastWeeklyCap = lastVxDelta >= 2 ? 0.15 : lastVxDelta >= 1 ? 0.10 : 0.06;
              cappedLast = selfAnchor.lastSession.medianLoad * (1 + lastWeeklyCap);
            }
            const capped = Math.min(cappedHeaviest, cappedLast);
            const cappedBy = !useLastAnchor ? "heaviest-only (last was easier=deload)"
                           : cappedLast < cappedHeaviest ? "last-session" : "heaviest-median";
            if (baseLoad > capped) {
              const original = baseLoad;
              baseLoad = roundToHalf(capped);
              const lastNote = useLastAnchor
                ? `last ${selfAnchor.lastSession.medianLoad.toFixed(1)}@V${selfAnchor.lastSession.medianVx.toFixed(1)} +${(lastWeeklyCap*100).toFixed(0)}% = ${cappedLast.toFixed(1)}`
                : `last @V${selfAnchor.lastSession.medianVx.toFixed(1)} (helpompi → ohitettu)`;
              trace("PROGRESSION_RATE_LIMIT_CROSSREF",
                { resolvedLoadKg: original },
                { resolvedLoadKg: baseLoad,
                  anchorLoad: selfAnchor.medianLoad,
                  anchorVx: selfAnchor.medianVx,
                  lastLoad: selfAnchor.lastSession.medianLoad,
                  lastVx: selfAnchor.lastSession.medianVx,
                  newVx, weeklyCap, lastWeeklyCap, cappedBy, useLastAnchor,
                  fromSessions: selfAnchor.fromSessions,
                  slotMovement: slot.defaultMovementName },
                `${slot.defaultMovementName} rate-limit (${cappedBy}): ${original} → ${baseLoad} kg (heaviest ${selfAnchor.medianLoad.toFixed(1)}@V${selfAnchor.medianVx.toFixed(1)} +${(weeklyCap*100).toFixed(0)}% = ${cappedHeaviest.toFixed(1)} | ${lastNote})`);
            }
          }
        }

        slot.resolvedLoadKg = baseLoad;
        trace("SLOT_LOAD_RESOLVED_CROSSREF",
          { slotRole: slot.role, slotMovement: slot.defaultMovementName,
            referenceMovement: slot.loadPctReferenceMovementName },
          { resolvedLoadKg: slot.resolvedLoadKg, pct: slot.loadPct, refE1RM: refE1RM.toFixed(1) },
          `${slot.defaultMovementName}: ${(slot.loadPct*100).toFixed(0)}% × ${slot.loadPctReferenceMovementName}-e1RM (${refE1RM.toFixed(1)} kg) = ${slot.resolvedLoadKg} kg`);
      }
    }
  }

  trace("TARGET_LOAD", {}, {
    targetExternalLoad,
    deltaPct: (deltaPct * 100).toFixed(2) + "%",
    targetReps,
    targetVx,
    isBarbell,
  }, `Ehdotettu kuorma: +${targetExternalLoad} kg`);

  // v4.34.2: Sanity diagnostic — primary-kuorman pitäisi tyypillisesti olla
  // korkeintaan ~1.6× seed-arvo (loadPct × kalibrointi). Jos enemmän, jokin
  // e1RM-ketjussa on pielessä: Vx-bias ylöspäin, väärä movement match,
  // bodyweight-asetus pielessä, calibration manuaalisesti väärin syötetty.
  // Käyttäjäpalaute v4.34.1 (TO-treeni): dippi 4×6 × 125 kg ehdotuksena vaikka
  // calibration D=80 kg → odotettu @68.6% = 55 kg. Ei pystytty toistaa
  // tyhjästä DB:stä, joten lisätty tämä diagnostic tunnistamaan tilanne kun
  // se toistuu. Älä silmukoi tästä ulos — tämä on informational only,
  // varsinainen kuorma palautetaan käyttäjälle muuttumattomana.
  if (targetExternalLoad !== null && primarySlotMeta?.suggestedLoadKg) {
    const seed = primarySlotMeta.suggestedLoadKg;
    const ratio = seed > 0 ? targetExternalLoad / seed : null;
    if (ratio !== null && ratio > 1.6) {
      trace("LOAD_SANITY_WARNING", {},
        { targetExternalLoad, seed, ratio: ratio.toFixed(2),
          currentE1RMExternal: currentE1RMExternal?.toFixed(1),
          primaryMovementName: primarySlotMeta.defaultMovementName,
          recentTopSetsCount: recentTopSets.length,
          e1rmSource },
        `⚠ Primary-kuorma ${targetExternalLoad} kg on ${ratio.toFixed(1)}× seed-arvo (${seed} kg) — tarkista e1RM-historia ja kalibrointi (movement: ${primarySlotMeta.defaultMovementName})`);
      if (typeof console !== "undefined" && console.warn) {
        console.warn(`[LeVe AI sanity] ${primarySlotMeta.defaultMovementName}: target ${targetExternalLoad} kg, seed ${seed} kg, ratio ${ratio.toFixed(2)}, e1RM_ext ${currentE1RMExternal?.toFixed(1) ?? "null"} kg, source ${e1rmSource}, top-sets ${recentTopSets.length} — investigate e1RM chain`);
      }
    }
  }

  // 12. Set prescription
  let setCount;
  const recipe = DAY_TYPE_SET_RECIPES[dayType];
  if (recipe) {
    setCount = Array.isArray(recipe.sets) ? recipe.sets[0] : recipe.sets;
  } else {
    setCount = 3;
  }

  // 13. Vara feedback
  const varaFB = varaFeedback(recentTopSets);
  if (varaFB.suggestion) {
    trace("VARA_FEEDBACK", {}, { suggestion: varaFB.suggestion, type: varaFB.type }, varaFB.suggestion);
  }

  // 14. Accessory cap (independent from primary)
  let accessoryCapActive = false;
  if (capLevel === 2) {
    // Check if ALL 3 channels are RED/YELLOW
    const channels = readiness.channels || {};
    const allBad = [channels.velocity, channels.hrv, channels.vara]
      .filter((c) => c && c.class)
      .every((c) => c.class === "RED" || c.class === "YELLOW");
    if (allBad) {
      accessoryCapActive = true;
      trace("ACCESSORY_CAP_ACTIVE", {}, { volumeReduction: "30%" }, "3/3 kanavaa RED/YELLOW → tukiliikkeet -30% volyymi");
    }
  }

  // 15. Ensure dayPlan always has slots (fallback if mesocycle plan didn't match)
  if (!dayPlan || !dayPlan.slots || dayPlan.slots.length === 0) {
    dayPlan = generateDefaultDayPlan(dayType, weekDef, accessoryCapActive);
    trace("DAY_PLAN_GENERATED", {}, { dayType, slotsCount: dayPlan.slots.length },
      "Päivän ohjelma generoitu oletusliikkeillä");
  }

  // Apply accessory cap: reduce accessory set counts by 30% if active
  if (accessoryCapActive && dayPlan && dayPlan.slots) {
    dayPlan = { ...dayPlan, slots: dayPlan.slots.map(s => {
      if (s.role === "accessory") {
        return { ...s, sets: Math.max(2, Math.round(s.sets * 0.7)) };
      }
      return s;
    })};
  }

  // v4.25 P1-10: Block-based accessory volume scaling.
  // Vain streetlifting_16w. Skaalaa accessory-sarjojen määrää alaspäin
  // myöhemmissä blokeissa (hypertrofia → voima → intensifikaatio → realization).
  // Ei vaikuta primary/secondary/backoff-sarjoihin — vain accessory.
  if (mesocycle.type === "streetlifting_16w" && dayPlan && dayPlan.slots) {
    const blockScalar = getAccessoryBlockScalar(weekNum);
    if (blockScalar < 1.0) {
      const blockNum = getBlockForWeek(weekNum);
      dayPlan = { ...dayPlan, slots: dayPlan.slots.map(s => {
        if (s.role === "accessory" && s.sets > 1) {
          const scaledSets = Math.max(1, Math.round(s.sets * blockScalar));
          return { ...s, sets: scaledSets, _blockScaled: true };
        }
        return s;
      })};
      trace("ACCESSORY_BLOCK_SCALAR", {}, { block: blockNum, scalar: blockScalar, weekNum },
        `Blokki ${blockNum} (vk ${weekNum}) → accessory-volyymi × ${blockScalar} (Issurin 2010)`);
    }
  }

  // v4.25 P1-9: MU load autoregulation.
  // Jos primary-slot on Muscle-up (tai slot.muAutoRegulate=true), säädä
  // suggestedLoadKg edellisen MU-session Vx-havaintojen perusteella.
  // Vaikuttaa vain MU-slotteihin joilla on muAutoRegulate=true (laDay:ssa
  // asetettu skillwork-polulle false, kuormitetuille true).
  if (dayPlan && dayPlan.slots) {
    const muSlot = dayPlan.slots.find(s =>
      s.muAutoRegulate === true &&
      (s.defaultMovementName === "Muscle-up" || s.defaultMovementName === "Muscle up")
    );
    if (muSlot && typeof muSlot.suggestedLoadKg === "number") {
      // Hae viim. MU-setit
      const allMovs = options.allMovements || await getAllMovements();
      const muMov = allMovs.find(m => m.name === "Muscle-up" || m.name === "Muscle up");
      if (muMov) {
        const muSets = allSets
          .filter(s => s.movementId === muMov.movementId && (s.setRole === "top" || !s.setRole))
          .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
          .slice(-6);
        const adj = adjustMULoad(muSets);
        if (adj.suggestedDeltaKg !== 0) {
          const newKg = Math.max(0, muSlot.suggestedLoadKg + adj.suggestedDeltaKg);
          dayPlan = { ...dayPlan, slots: dayPlan.slots.map(s =>
            s === muSlot ? { ...s, suggestedLoadKg: newKg, _muAdjusted: adj } : s
          )};
          trace("MU_AUTO_REGULATE", { loadKg: muSlot.suggestedLoadKg },
            { loadKg: newKg, reason: adj.reason, avgVx: adj.avgVx?.toFixed(1) },
            `MU kuorma ${adj.suggestedDeltaKg > 0 ? "+" : ""}${adj.suggestedDeltaKg} kg (${adj.reason}, edell. Vx ka. ${adj.avgVx?.toFixed(1) ?? "–"})`);
        }
      }
    }
  }

  // 15b. Resolve accessory slots (slotId → phase-appropriate movement, honoring overrides + stagnation)
  if (dayPlan && dayPlan.slots && dayPlan.slots.some(s => s.slotId)) {
    const allMovements = options.allMovements || (await getAllMovements());
    const movementsByName = {};
    for (const m of allMovements) movementsByName[m.name] = m;
    const progressByMovementId = {};
    for (const m of allMovements) {
      const p = await getMovementProgress(m.movementId);
      if (p) progressByMovementId[m.movementId] = p;
    }
    dayPlan = resolveDayPlanSlots(dayPlan, {
      mesocycle, weekNum, movementsByName, progressByMovementId,
    });
    const swaps = dayPlan.slots.filter(s => s._resolvedFrom?.source === "stagnation-swap");
    if (swaps.length) {
      trace("ACCESSORY_SWAP_AUTO", {},
        { count: swaps.length, slots: swaps.map(s => s._resolvedFrom.slotId) },
        `Automaattinen tukiliikevaihto stagnaation perusteella (${swaps.length} liikettä)`);
    }
  }

  // 16. Enrich dayPlan with variant names (if not already assigned from mesocycle)
  if (dayPlan && dayPlan.slots) {
    const variantMap = VARIANT_DAY_TYPE_MAP[dayType] || VARIANT_DAY_TYPE_MAP.heavy;
    for (const slot of dayPlan.slots) {
      if ((slot.role === "primary" || slot.role === "backoff") && slot.category === "vertikaaliveto" && !slot.variantName) {
        slot.variantName = variantMap[0]; // Default variant for this day type
      }
    }
    // Trace if variant assigned
    const primarySlot = dayPlan.slots.find(s => s.role === "primary" && s.variantName);
    if (primarySlot?.variantName) {
      trace("VARIANT_ASSIGNED", {}, { variant: primarySlot.variantName, dayType },
        `Variaatio: ${primarySlot.variantName}`);
    }
  }

  // Build recommendation
  const rec = {
    recId: uid(),
    dateISO,
    mesocycleId: mesocycle.mesocycleId,
    mesocycleType: mesocycle.type || "default",
    weekNum,
    weekLabel: weekDef?.label || "?",
    dayType,
    targetExternalLoad,
    targetReps,
    targetVx,
    setCount,
    deltaPct,
    capLevel,
    readiness,
    e1rmSystem: currentE1RMSystem,
    e1rmExternal: currentE1RMExternal,
    bodyweightKg,
    varaFeedback: varaFB,
    breakInfo: breakInfo.breakDays >= 7 ? breakInfo : null,
    accessoryCapActive,
    dayPlan,
    traces,
  };

  // Assign recId to all traces
  for (const t of traces) t.recId = rec.recId;

  // Save if not dry run
  if (!options.dryRun) {
    await saveRecommendation({
      recId: rec.recId,
      sessionId: null,
      variantId: null,
      targetSetRole: "top",
      targetLoadKg: targetExternalLoad,
      deltaPct,
      capLevel,
      mesocycleWeek: weekNum,
      dayType,
      targetReps,
      targetVx,
      createdAtISO: new Date().toISOString(),
    });
    for (const t of traces) {
      await saveDecisionTrace(t);
    }
  }

  return rec;
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY STIMULUS TRACKER
// ═══════════════════════════════════════════════════════════════

function weeklyStimulus(sets, movements) {
  const movementMap = new Map(movements.map((m) => [m.movementId, m]));

  let pullVolumeSets = 0;
  let pullVolumeTonnage = 0;
  let heavyExposures = 0;
  let totalTonnageExternal = 0;
  let totalTonnageSystem = 0;
  const byCategory = {};

  for (const s of sets) {
    const mov = movementMap.get(s.movementId);
    const category = mov?.category || "muu";
    const loadKg = s.externalLoadKg || 0;
    const reps = s.reps || 0;
    const tonnage = loadKg * reps;

    totalTonnageExternal += tonnage;

    if (PULL_VOLUME_CATEGORIES.has(category)) {
      pullVolumeSets++;
      pullVolumeTonnage += tonnage;
    }

    const effectiveReps = reps + (s.actualVx ?? s.targetVx ?? 1);
    if (effectiveReps <= 4) heavyExposures++;

    if (!byCategory[category]) byCategory[category] = { sets: 0, tonnage: 0 };
    byCategory[category].sets++;
    byCategory[category].tonnage += tonnage;
  }

  return {
    pullVolumeSets,
    pullVolumeTonnage,
    heavyExposures,
    totalTonnageExternal,
    byCategory,
  };
}

// ═══════════════════════════════════════════════════════════════
// STAGNATION DETECTION
// ═══════════════════════════════════════════════════════════════

function checkStagnation(progress) {
  if (!progress || progress.stagnationWeeks < 3) {
    return { stagnated: false, severity: null, message: null };
  }
  if (progress.stagnationWeeks >= 6) {
    return {
      stagnated: true,
      severity: "orange",
      message: `${progress.stagnationWeeks} viikkoa ilman edistystä — suosittelemme liikkeen vaihtoa`,
    };
  }
  return {
    stagnated: true,
    severity: "yellow",
    message: `${progress.stagnationWeeks} viikkoa ilman edistystä — harkitse liikkeen vaihtoa`,
  };
}

// ═══════════════════════════════════════════════════════════════
// ACCESSORY SLOT RESOLUTION (v4.11)
// Each accessory slot has a function (role) + phase variants. Engine resolves
// movement at render time: priority 1) user lock, 2) user soft-override,
// 3) stagnation-advanced variant, 4) phase default (variant index 0).
// ═══════════════════════════════════════════════════════════════

function phaseForWeek(weekNum) {
  if (weekNum <= 4)  return "foundation";
  if (weekNum <= 8)  return "strength";
  if (weekNum <= 12) return "intensity";
  return "peaking";
}

/**
 * Resolve an accessory slot into a concrete movement + rep scheme.
 *
 * @param {object} slot — slot object from weekPlan.days[].slots[]. Must have slotId to be resolvable.
 * @param {object} ctx — { mesocycle, weekNum, movementsByName, progressByMovementId }
 * @returns {object} { movementName, sets, reps, targetVx, note, source, variantIndex, slotFunction }
 *   source: "legacy" | "user-locked" | "user-override" | "stagnation-swap" | "phase-default" | "fallback"
 */
function resolveAccessorySlot(slot, ctx = {}) {
  const { mesocycle, weekNum, movementsByName, progressByMovementId } = ctx;

  // Legacy slot without slotId — fall through untouched
  if (!slot?.slotId) {
    return {
      movementName: slot.defaultMovementName,
      sets: slot.sets, reps: slot.reps, targetVx: slot.targetVx,
      note: slot.note,
      source: "legacy",
      variantIndex: null,
      slotFunction: null,
    };
  }

  const catalog = ACCESSORY_SLOT_CATALOG?.[slot.slotId];
  if (!catalog) {
    return {
      movementName: slot.defaultMovementName,
      sets: slot.sets, reps: slot.reps, targetVx: slot.targetVx,
      note: slot.note,
      source: "fallback",
      variantIndex: null,
      slotFunction: null,
    };
  }

  const phase = phaseForWeek(weekNum || 1);
  const variants = catalog.phaseVariants?.[phase] || [];
  const phaseRep = catalog.repScheme?.[phase] || null;

  // Phase may have no variants (e.g. knee-unilateral during peaking) → drop slot
  if (!variants.length) {
    return { movementName: null, sets: 0, reps: 0, targetVx: null,
             source: "dropped-for-phase", variantIndex: null, slotFunction: catalog.function };
  }

  const overrides = mesocycle?.accessorySlotOverrides || {};
  const ov = overrides[slot.slotId];

  // Honor hard lock absolutely
  if (ov?.locked && ov.movementName) {
    return {
      movementName: ov.movementName,
      sets:    phaseRep?.sets    ?? slot.sets,
      reps:    phaseRep?.reps    ?? slot.reps,
      targetVx: phaseRep?.targetVx ?? slot.targetVx,
      note: ov.reason || phaseRep?.note || slot.note,
      source: "user-locked",
      variantIndex: variants.indexOf(ov.movementName),
      slotFunction: catalog.function,
    };
  }

  // Determine variant index: user-picked, stagnation-advanced, or 0
  let idx = 0;
  let source = "phase-default";
  let reason = null;

  if (Number.isInteger(ov?.variantIndex)) {
    idx = Math.max(0, Math.min(variants.length - 1, ov.variantIndex));
    source = "user-override";
    reason = ov.reason || null;
  } else if (ov?.movementName && variants.includes(ov.movementName)) {
    idx = variants.indexOf(ov.movementName);
    source = "user-override";
    reason = ov.reason || null;
  } else {
    // Auto: stagnation on default variant → advance
    const defaultMov = movementsByName?.[variants[0]];
    if (defaultMov && progressByMovementId) {
      const prog = progressByMovementId[defaultMov.movementId];
      if (prog && prog.stagnationWeeks >= 3 && variants.length > 1) {
        idx = 1;
        source = "stagnation-swap";
        reason = `Stagnaatio ${prog.stagnationWeeks} vk — vaihto variantin 2 liikkeeseen`;
      }
    }
  }

  return {
    movementName: variants[idx],
    sets:    phaseRep?.sets    ?? slot.sets    ?? 3,
    reps:    phaseRep?.reps    ?? slot.reps    ?? 8,
    targetVx: phaseRep?.targetVx ?? slot.targetVx ?? null,
    // v4.34.16: phaseRep.loadPct välitetään resolvoituun slottiin → loadPct-resolver
    // applioi sessionEffectiveE1RM × loadPct (Branch A) jos slot.defaultMovementName === primary.
    loadPct: phaseRep?.loadPct ?? slot.loadPct ?? null,
    note: phaseRep?.note || slot.note || reason,
    source,
    variantIndex: idx,
    slotFunction: catalog.function,
    availableVariants: variants,
    reason,
  };
}

/**
 * Resolve all accessory slots in a dayPlan; return new dayPlan with resolved slots.
 * Drops slots whose phase has no variants (e.g. unilateral during peaking).
 * Preserves primary/backoff/secondary slots as-is (they never have slotId).
 */
function resolveDayPlanSlots(dayPlan, ctx) {
  if (!dayPlan?.slots) return dayPlan;
  const resolvedSlots = [];
  for (const slot of dayPlan.slots) {
    if (!slot.slotId) { resolvedSlots.push(slot); continue; }
    const r = resolveAccessorySlot(slot, ctx);
    if (r.source === "dropped-for-phase" || !r.movementName) continue;
    resolvedSlots.push({
      ...slot,
      defaultMovementName: r.movementName,
      sets: r.sets,
      reps: r.reps,
      targetVx: r.targetVx,
      // v4.34.16: kopio loadPct resolvoituun slottiin (jos phaseRep määritteli)
      ...(r.loadPct !== null && r.loadPct !== undefined ? { loadPct: r.loadPct } : {}),
      note: r.note || slot.note,
      _resolvedFrom: { slotId: slot.slotId, source: r.source, variantIndex: r.variantIndex,
                      availableVariants: r.availableVariants, slotFunction: r.slotFunction },
    });
  }
  return { ...dayPlan, slots: resolvedSlots };
}

/**
 * Compute stagnation-driven swap suggestions for the whole mesocycle.
 * Returns list of { slotId, currentMovement, suggestedMovement, reason }.
 * Used for decision-trace logging + surfacing suggestions to the user.
 */
function suggestAccessorySwaps(mesocycle, weekNum, movementsByName, progressByMovementId) {
  const suggestions = [];
  const phase = phaseForWeek(weekNum || 1);
  const overrides = mesocycle?.accessorySlotOverrides || {};

  for (const [slotId, catalog] of Object.entries(ACCESSORY_SLOT_CATALOG)) {
    if (overrides[slotId]?.locked) continue; // respect lock
    const variants = catalog.phaseVariants?.[phase] || [];
    if (variants.length < 2) continue;
    const currentIdx = overrides[slotId]?.variantIndex ?? 0;
    const currentName = variants[Math.min(currentIdx, variants.length - 1)];
    const mov = movementsByName?.[currentName];
    const prog = mov ? progressByMovementId?.[mov.movementId] : null;
    if (prog && prog.stagnationWeeks >= 3 && currentIdx < variants.length - 1) {
      suggestions.push({
        slotId,
        slotFunction: catalog.function,
        currentMovement: currentName,
        suggestedMovement: variants[currentIdx + 1],
        stagnationWeeks: prog.stagnationWeeks,
        reason: `${prog.stagnationWeeks} vk stagnaatio — vaihto seuraavaan varianttiin`,
      });
    }
  }
  return suggestions;
}

// ═══════════════════════════════════════════════════════════════
// READINESS TEST LOAD (skaalautuva)
// ═══════════════════════════════════════════════════════════════

/**
 * Laskee readiness-velocity-testin kuorman e1RM:n perusteella.
 * ~60% e1RM:stä, pyöristettynä lähimpään 2.5 kg. Min 20, max 80.
 * @param {number|null} e1rmExternal — urheilijan e1RM lisäpaino (kg)
 * @returns {number} readiness-testikuorma (kg)
 */
function readinessTestLoad(e1rmExternal) {
  if (e1rmExternal === null || e1rmExternal === undefined || e1rmExternal <= 0) return 40;
  const raw = e1rmExternal * 0.6;
  const rounded = Math.round(raw / 2.5) * 2.5;
  return clamp(rounded, 20, 80);
}

// ═══════════════════════════════════════════════════════════════
// SPEED DAY LOAD
// ═══════════════════════════════════════════════════════════════

function speedDayLoad(e1rmExternal, bodyweightKg) {
  // Speed day: ~55-60% of 1RM, max intent
  if (e1rmExternal === null) return null;
  const pct = 0.575; // midpoint of 55-60%
  const systemE1RM = e1rmExternal + bodyweightKg;
  const targetSystem = systemE1RM * pct;
  return roundToHalf(Math.max(0, targetSystem - bodyweightKg));
}

// ═══════════════════════════════════════════════════════════════
// OURA HRV CONVERSION
// ═══════════════════════════════════════════════════════════════

function ouraHRVtoLnRMSSD(hrvMs) {
  if (hrvMs === null || hrvMs === undefined || hrvMs <= 0) return null;
  return Math.log(hrvMs);
}

// ═══════════════════════════════════════════════════════════════
// ADAPTIVE VOLUME OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze a completed session and compute adaptive adjustments
 * for future workouts. If the user did extra sets/exercises or
 * skipped some, the engine learns and adjusts.
 */
function analyzeSessionAdaptation(sessionExercises, dayPlanSlots) {
  const adjustments = [];

  // 1. Check per-slot: did the user do more or fewer sets than planned?
  //    Use originalCategory if available (survives mid-workout swaps)
  for (const slot of dayPlanSlots) {
    const matchedExercises = sessionExercises.filter(
      (ex) => (ex.originalCategory || ex.category) === slot.category && ex.role === slot.role
    );

    if (matchedExercises.length === 0) continue;

    for (const ex of matchedExercises) {
      const completedSets = ex.sets.filter((s) => s.completed && !s.isWarmup).length;
      const plannedSets = slot.sets;
      const delta = completedSets - plannedSets;

      if (delta >= 2) {
        // User consistently does more → suggest increasing volume
        adjustments.push({
          category: slot.category,
          role: slot.role,
          movementName: ex.name,
          type: "volume_up",
          delta,
          suggestedSets: Math.min(plannedSets + 1, 6),
          reason: `${ex.name}: ${completedSets} sarjaa tehty (suunniteltu ${plannedSets}) → +1 sarja`,
        });
      } else if (delta <= -1 && completedSets > 0) {
        // User did fewer → reduce volume next time
        adjustments.push({
          category: slot.category,
          role: slot.role,
          movementName: ex.name,
          type: "volume_down",
          delta,
          suggestedSets: Math.max(plannedSets - 1, 2),
          reason: `${ex.name}: ${completedSets} sarjaa tehty (suunniteltu ${plannedSets}) → -1 sarja`,
        });
      }
    }
  }

  // 2. Check for extra exercises the user added (not in plan)
  const plannedCategories = new Set(dayPlanSlots.map((s) => s.category));
  const extraExercises = sessionExercises.filter(
    (ex) => !plannedCategories.has(ex.originalCategory || ex.category) && ex.sets.some((s) => s.completed && !s.isWarmup)
  );

  for (const ex of extraExercises) {
    adjustments.push({
      category: ex.category,
      role: "accessory",
      movementName: ex.name,
      type: "new_exercise",
      suggestedSets: ex.sets.filter((s) => s.completed).length,
      reason: `${ex.name}: lisätty käsin → harkitaan lisäämistä ohjelmaan`,
    });
  }

  return adjustments;
}

/**
 * Apply accumulated session adaptations to mesocycle weekPlan.
 * Only applies after 2+ consistent sessions with same pattern.
 */
function applyAdaptations(mesocycle, adaptationHistory) {
  if (!adaptationHistory || adaptationHistory.length < 2) return { applied: false, changes: [] };

  // Group by category+type and count occurrences
  const counts = {};
  for (const adj of adaptationHistory) {
    const key = `${adj.category}:${adj.type}`;
    if (!counts[key]) counts[key] = { ...adj, count: 0 };
    counts[key].count++;
  }

  const changes = [];
  for (const [key, entry] of Object.entries(counts)) {
    if (entry.count < 2) continue; // Need 2+ sessions with same pattern

    // Apply to all matching weekPlan slots
    for (const wp of mesocycle.weekPlans) {
      for (const day of wp.days) {
        for (const slot of day.slots) {
          if (slot.category === entry.category && slot.role === entry.role) {
            if (entry.type === "volume_up" && entry.suggestedSets > slot.sets) {
              const oldSets = slot.sets;
              slot.sets = entry.suggestedSets;
              changes.push(`${entry.movementName}: ${oldSets} → ${slot.sets} sarjaa`);
            } else if (entry.type === "volume_down" && entry.suggestedSets < slot.sets) {
              const oldSets = slot.sets;
              slot.sets = entry.suggestedSets;
              changes.push(`${entry.movementName}: ${oldSets} → ${slot.sets} sarjaa`);
            }
          }
        }
      }
    }

    if (entry.type === "new_exercise") {
      changes.push(`${entry.movementName}: harkitse ohjelmaan lisäämistä`);
    }
  }

  return { applied: changes.length > 0, changes };
}

// ═══════════════════════════════════════════════════════════════
// FUTURE WORKOUTS PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Generate preview of upcoming workouts for N days ahead.
 * Returns array of { dateISO, dayOfWeek, dayType, weekNum, weekLabel, slots }
 */
function getFutureWorkouts(mesocycle, currentDateISO, daysAhead = 14) {
  if (!mesocycle || !mesocycle.weekPlans) return [];

  const results = [];
  const startDate = new Date(currentDateISO);

  for (let d = 1; d <= daysAhead; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateISO = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay() || 7; // 1=Mon, 7=Sun

    const weekNum = getMesocycleWeek(mesocycle, dateISO);
    if (weekNum === null) continue; // Past end of mesocycle

    const weekDef = getWeekDef(mesocycle, weekNum);
    const weekPlan = mesocycle.weekPlans.find((w) => w.week === weekNum);
    if (!weekPlan) continue;

    const dayPlan = weekPlan.days.find((dp) => dp.dayOfWeek === dayOfWeek);
    if (!dayPlan) continue;

    results.push({
      dateISO,
      dayOfWeek,
      dayType: dayPlan.dayType,
      weekNum,
      weekLabel: weekDef?.label || "",
      label: dayPlan.label || "",
      deltaPctBase: weekDef?.deltaPctBase || 0,
      slots: dayPlan.slots,
      // v4.30.4: warmup mukaan jotta sykli-näkymä voi näyttää koko treenin tarkasteluun
      warmup: dayPlan.warmup || [],
    });
  }

  return results;
}

/**
 * Etsii menneet, toteuttamatta jääneet treenipäivät mesosyklistä.
 * "Toteutettu" = jokin sessio on seurannut tuon päivän planiä, ts. sen
 * session.planSourceDateISO (tai vanhoissa sessioissa dateISO) osuu
 * tähän päivään. Tämä tunnistaa oikein myös tilanteet joissa käyttäjä
 * teki Ti:nä Ke:n planin — Ti:n oma plan on edelleen tekemättä.
 *
 * @param {Object} mesocycle
 * @param {Array} sessions — state.sessions
 * @param {string} currentDateISO — "tänään"
 * @param {number} daysBack — kuinka monta vuorokautta taakse tarkistetaan (oletus 3)
 * @returns {Array<{dateISO, dayOfWeek, weekNum, weekLabel, dayType, dayLabel, slots, substitutedPlan}>}
 *   substitutedPlan on { plannedDayType, dateISO } jos samalla kalenteripäivällä
 *   oli eri plan-lähteen sessio (plan-override); muuten null.
 */
function findMissedPriorSessions(mesocycle, sessions, currentDateISO, daysBack = 3) {
  if (!mesocycle || !mesocycle.weekPlans || !currentDateISO) return [];
  const skipped = new Set(mesocycle.skippedDays || []);
  // Päivät joiden plan on toteutettu (planSourceDateISO || dateISO backward-compat)
  const executedPlans = new Set();
  // Sessiot kalenteripäivittäin (jotta voidaan näyttää "teit X sijaan")
  const sessionsByDate = new Map();
  for (const s of (sessions || [])) {
    const planISO = s.planSourceDateISO || s.dateISO;
    if (planISO) executedPlans.add(planISO);
    if (s.dateISO) {
      if (!sessionsByDate.has(s.dateISO)) sessionsByDate.set(s.dateISO, []);
      sessionsByDate.get(s.dateISO).push(s);
    }
  }
  const results = [];
  const base = new Date(currentDateISO);

  for (let d = 1; d <= daysBack; d++) {
    const date = new Date(base);
    date.setDate(date.getDate() - d);
    const iso = date.toISOString().slice(0, 10);
    if (skipped.has(iso)) continue;
    if (executedPlans.has(iso)) continue; // plan on toteutettu jollain päivällä

    const weekNum = getMesocycleWeek(mesocycle, iso);
    if (weekNum === null) continue;

    const dayOfWeek = date.getDay() || 7;
    const weekPlan = mesocycle.weekPlans.find(w => w.week === weekNum);
    const dayPlan = weekPlan?.days?.find(x => x.dayOfWeek === dayOfWeek);
    if (!dayPlan) continue;

    // Jos samalla pv:llä on eri plan-lähteen sessio (override), merkitään korvaus
    const sameDateSessions = sessionsByDate.get(iso) || [];
    const substituted = sameDateSessions[sameDateSessions.length - 1] || null;
    const substitutedPlan = substituted ? {
      plannedDayType: substituted.plannedDayType,
      planSourceDateISO: substituted.planSourceDateISO || substituted.dateISO,
    } : null;

    const weekDef = getWeekDef(mesocycle, weekNum);
    results.push({
      dateISO: iso,
      dayOfWeek,
      weekNum,
      weekLabel: weekDef?.label || "",
      dayType: dayPlan.dayType,
      dayLabel: dayPlan.label || null,
      slots: dayPlan.slots || [],
      substitutedPlan,
    });
  }
  // Uusin ensin
  return results.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

// ═══════════════════════════════════════════════════════════════
// ELITE VOLUME/INTENSITY CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check if weekly volume meets elite-level minimum thresholds.
 * Returns warnings if below recommended minimums.
 */
function eliteVolumeCheck(weekSets, movements) {
  const stimulus = weeklyStimulus(weekSets, movements);
  const warnings = [];

  // Elite pull volume: minimum ~15 hard sets/week for vertical + horizontal pull
  if (stimulus.pullVolumeSets < 12) {
    warnings.push({
      type: "low_pull_volume",
      current: stimulus.pullVolumeSets,
      target: 15,
      message: `Vetosarjoja ${stimulus.pullVolumeSets}/viikko — eliittitasolla suositus ≥15`,
    });
  }

  // Heavy exposure frequency: at least 4 heavy sets/week
  if (stimulus.heavyExposures < 3) {
    warnings.push({
      type: "low_heavy_exposure",
      current: stimulus.heavyExposures,
      target: 6,
      message: `Heavy-altistuksia ${stimulus.heavyExposures}/viikko — suositus ≥6`,
    });
  }

  // Check push-pull balance
  const pushSets = (stimulus.byCategory["horisontaalityöntö"]?.sets || 0) +
                   (stimulus.byCategory["vertikaalityöntö"]?.sets || 0);
  const pullSets = stimulus.pullVolumeSets;
  if (pullSets > 0 && pushSets < pullSets * 0.5) {
    warnings.push({
      type: "push_pull_imbalance",
      pushSets,
      pullSets,
      message: `Työntö/veto-suhde ${pushSets}:${pullSets} — lisää työntöliikkeitä (tavoite ≥1:2)`,
    });
  }

  return { stimulus, warnings, isEliteReady: warnings.length === 0 };
}

// ═══════════════════════════════════════════════════════════════
// ALL-MOVEMENT e1RM COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute e1RM for any movement from its set history.
 * Uses accessory Epley for non-primary, system Epley for primary.
 */
function computeMovementE1RM(movementSets, isPrimary, bodyweightKg) {
  if (!movementSets.length) return null;

  // Take last 6 sets with valid data
  const recent = movementSets
    .filter((s) => s.externalLoadKg > 0 && s.reps >= 1)
    .slice(-6);

  if (!recent.length) return null;

  const values = recent.map((s) => {
    const vara = s.actualVx ?? s.targetVx ?? 1;
    if (isPrimary) {
      return e1rmSystem(bodyweightKg, s.externalLoadKg, s.reps, vara);
    } else {
      return e1rmAccessory(s.externalLoadKg, s.reps, vara);
    }
  }).filter((v) => v !== null);

  return values.length > 0 ? median(values) : null;
}

/**
 * Compute e1RM history (time series) for any movement
 */
function computeMovementE1RMHistory(movementSets, sessions, isPrimary, bodyweightKg) {
  const sessionMap = new Map(sessions.map((s) => [s.sessionId, s]));
  const points = [];

  for (const s of movementSets) {
    if (s.externalLoadKg <= 0 || s.reps < 1) continue;
    const session = sessionMap.get(s.sessionId);
    if (!session) continue;

    const vara = s.actualVx ?? s.targetVx ?? 1;
    let e1rm;
    if (isPrimary) {
      e1rm = e1rmSystem(bodyweightKg, s.externalLoadKg, s.reps, vara);
    } else {
      e1rm = e1rmAccessory(s.externalLoadKg, s.reps, vara);
    }

    if (e1rm !== null) {
      points.push({ dateISO: session.dateISO, e1rm, load: s.externalLoadKg, reps: s.reps });
    }
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT PERIODIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get default variant name for a given day type.
 */
function getDefaultVariantForDayType(dayType) {
  const variants = VARIANT_DAY_TYPE_MAP[dayType] || VARIANT_DAY_TYPE_MAP.heavy;
  return variants[0]; // First variant is default
}

/**
 * Load modifier for each variant.
 * Returns a multiplier to apply to target load.
 * e.g., koroke = +5% (supramaximal eccentric), kuminauha = -40% (speed work)
 */
// Default load modifiers (used when no custom overrides exist)
const DEFAULT_VARIANT_MODIFIERS = {
  "Kilpaveto (leveä vastaote)": 0,
  "Korokeveto":                 0.05,    // +5% supramaximal
  "Nopeusveto kuminauhalla":   -0.40,   // -40% speed
  "Myötäoteveto":              -0.05,   // -5% grip weakness
  "Neutraaliote":              -0.03,   // -3% grip neutral
  "2s ylipito":                -0.05,   // -5% isometric hold
  "1.5-toisto hiissaus":       -0.10,   // -10% tempo reps
};

/**
 * Variant load modifier. Uses customModifiers (from settings) when available,
 * falls back to defaults.
 * @param {string} variantName
 * @param {Object|null} customModifiers — { variantName: number } from settings
 * @returns {number} modifier as a fraction (e.g. -0.05 = -5%)
 */
function variantLoadModifier(variantName, customModifiers = null) {
  if (!variantName) return 0;
  if (customModifiers && variantName in customModifiers) {
    return customModifiers[variantName];
  }
  return DEFAULT_VARIANT_MODIFIERS[variantName] ?? 0;
}

/**
 * Rep/tempo override for specific variants.
 * Returns override info (repsLabel, tempoNotes) or null.
 */
function variantRepOverride(variantName) {
  switch (variantName) {
    case "2s ylipito":
      return { tempoNote: "2s pito yläasennossa", label: "ylipito" };
    case "1.5-toisto hiissaus":
      return { tempoNote: "1.5 toistoa: ylös → puoleen väliin → ylös", label: "hiissaus" };
    case "Nopeusveto kuminauhalla":
      return { tempoNote: "Räjähtävästi, max nopeus", label: "nopeus" };
    case "Korokeveto":
      return { tempoNote: "Eksentrisesti hitaasti (3-4s)", label: "koroke" };
    default:
      return null;
  }
}

/**
 * Assign variants to mesocycle week plans via smart rotation.
 * Heavy days rotate: Kilpaveto ↔ Korokeveto
 * Speed days: always Nopeusveto kuminauhalla
 * Volume days: rotate through Myötäote → Neutraaliote → 2s ylipito → 1.5-toisto hiissaus
 */
function assignVariantRotation(weekPlans) {
  let heavyIdx = 0;
  let volumeIdx = 0;
  const heavyVariants = VARIANT_DAY_TYPE_MAP.heavy;
  const volumeVariants = VARIANT_DAY_TYPE_MAP.volume;
  const speedVariant = VARIANT_DAY_TYPE_MAP.speed[0];

  for (const wp of weekPlans) {
    for (const day of wp.days) {
      for (const slot of day.slots) {
        if (slot.role !== "primary" && slot.role !== "backoff") continue;
        if (slot.category !== "vertikaaliveto") continue;

        if (day.dayType === "heavy") {
          slot.variantName = heavyVariants[heavyIdx % heavyVariants.length];
          // backoff uses same variant as primary
          if (slot.role === "primary") heavyIdx++;
        } else if (day.dayType === "speed") {
          slot.variantName = speedVariant;
        } else if (day.dayType === "volume") {
          slot.variantName = volumeVariants[volumeIdx % volumeVariants.length];
          if (slot.role === "primary") volumeIdx++;
        } else {
          slot.variantName = heavyVariants[0]; // default
        }
      }
    }
  }
  return weekPlans;
}

// ═══════════════════════════════════════════════════════════════
// PEAKING ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * v4.30.3: e1RM-ennuste ohjelman loppuun saakka.
 *
 * Käyttää käyttäjän historiallista trendiä jos saatavilla (≥3 mittauspistettä),
 * muuten edistyneelle harjoittelijalle realistista 0.5 % / vk -default-tahtia.
 * Block-aware: peaking-vaiheessa (viim. 4 vk) gain-rate puolitetaan koska
 * realization ei tuota uusia gainsia, vaan toteuttaa olemassa olevia.
 *
 * @param {Array} history - computeMovementE1RMHistory:n output [{dateISO, e1rm, ...}]
 * @param {number} currentWeekNum - nykyinen viikko (1–totalWeeks)
 * @param {number} totalWeeks - ohjelman pituus (default 16)
 * @returns {Object|null} { predictedFinal, weeklyGainPct, weeksRemaining,
 *                         confidence: "high"|"medium"|"low", projection: [{week, e1rm}] }
 */
function predictE1RMEndOfProgram(history, currentWeekNum, totalWeeks = 16) {
  if (!history || history.length === 0) return null;
  const currentE1RM = history[history.length - 1].e1rm;
  if (!currentE1RM || currentE1RM <= 0) return null;
  const remainingWeeks = Math.max(0, totalWeeks - currentWeekNum);
  if (remainingWeeks === 0) {
    return { predictedFinal: currentE1RM, weeklyGainPct: 0,
             weeksRemaining: 0, confidence: "exact", projection: [] };
  }

  // 1. Arvioi viikoittainen kasvuprosentti historiasta (jos riittävästi dataa)
  let weeklyGainPct = 0.005; // default 0.5% / vk edistyneelle harjoittelijalle
  let confidence = "low";
  if (history.length >= 3) {
    const first = history[0];
    const last = history[history.length - 1];
    const firstMs = new Date(first.dateISO).getTime();
    const lastMs = new Date(last.dateISO).getTime();
    const weeksSpan = (lastMs - firstMs) / (7 * 24 * 60 * 60 * 1000);
    if (weeksSpan >= 1 && first.e1rm > 0) {
      const totalGainPct = (last.e1rm - first.e1rm) / first.e1rm;
      const observed = totalGainPct / weeksSpan;
      // Clamp realistisiin haarukoihin: −0.5%/vk … +1.5%/vk (eliittilifter)
      weeklyGainPct = Math.max(-0.005, Math.min(0.015, observed));
      confidence = history.length >= 6 ? "high" : "medium";
    }
  }

  // 2. Block-aware projektio: peaking (viim. 4 vk) → puolet gain-ratesta
  //    Deload-viikot (4, 8, 12) → ei kasvua (CNS-konservointi)
  const peakingStart = totalWeeks - 3; // vk 13–16 (jos totalWeeks=16)
  let projectedE1RM = currentE1RM;
  const projection = [];
  for (let w = currentWeekNum + 1; w <= totalWeeks; w++) {
    const isPeaking = w >= peakingStart;
    const isDeload = w === 4 || w === 8 || w === 12;
    const weeklyGain = isDeload ? 0 : (isPeaking ? weeklyGainPct * 0.5 : weeklyGainPct);
    projectedE1RM *= (1 + weeklyGain);
    projection.push({ week: w, e1rm: Math.round(projectedE1RM * 10) / 10 });
  }

  return {
    predictedFinal: Math.round(projectedE1RM * 10) / 10,
    weeklyGainPct,
    weeksRemaining: remainingWeeks,
    confidence,
    projection,
  };
}

/**
 * v4.30.3: Streetlifting kisapäivän tavoite-ennuste.
 *
 * Yhdistää e1RM-ennusteen + opener-strategian: ennustaa per kilpailu­liike
 * mitä kuormat kisapäivänä tulevat olemaan, jos käyttäjän nykyinen
 * etenemistahti jatkuu.
 *
 * @param {Object} historyByMovement - { "Lisäpainoleuanveto": [...e1rmHistory], ... }
 * @param {number} currentWeekNum
 * @param {number} totalWeeks
 * @returns {Object|null} per liike: { current, predicted, opener, second, third, weeklyGainPct }
 */
function computeStreetliftingFinalProjection(historyByMovement, currentWeekNum, totalWeeks = 16) {
  if (!historyByMovement) return null;
  // v4.32.7 bugfix: Maastaveto poistettu — streetlifting-kisaliikkeet ovat MU + Leuka + Dippi + Takakyykky.
  // Maastaveto oli aiemmin virheellisesti listalla; ennuste-kortti näytti maavedon "kisaliikkeenä"
  // streetlifting_16w-mesosyklissä vaikka mesosykli ei tue maavetoa kisaliikkeenä.
  const COMPETITION_LIFTS = ["Lisäpainoleuanveto", "Muscle-up", "Lisäpainodippi", "Takakyykky"];
  const result = {};
  for (const liftName of COMPETITION_LIFTS) {
    const history = historyByMovement[liftName];
    if (!history || history.length === 0) continue;
    const currentE1RM = history[history.length - 1].e1rm;
    if (!currentE1RM || currentE1RM <= 0) continue;
    const prediction = predictE1RMEndOfProgram(history, currentWeekNum, totalWeeks);
    if (!prediction) continue;
    const finalE1RM = prediction.predictedFinal;
    result[liftName] = {
      current: Math.round(currentE1RM * 10) / 10,
      predicted: finalE1RM,
      gainKg: Math.round((finalE1RM - currentE1RM) * 10) / 10,
      gainPct: Math.round(((finalE1RM - currentE1RM) / currentE1RM) * 1000) / 10, // 1 desimaali
      opener: roundToHalf(finalE1RM * 0.88),
      second: roundToHalf(finalE1RM * 0.95),
      third: roundToHalf(finalE1RM * 1.02),
      weeklyGainPct: prediction.weeklyGainPct,
      confidence: prediction.confidence,
      weeksRemaining: prediction.weeksRemaining,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * v4.29.0 (P2): Streetlifting opener-strategia kisapäivälle.
 *
 * Laskee per kilpailu­liike opener / 2nd / 3rd -prosentit e1RM:n perusteella.
 * Lähde: StrengthLog/IPF World Classic 2021 -data (voittajien openerit ~88 %),
 * Helms 2018 ja Bromley Peak Strength.
 *
 * Käyttö: peaking-vaiheessa (vk 13–16) dashboard näyttää tämän taulukon
 * jotta käyttäjä voi suunnitella kisapäivän nostot ennalta.
 *
 * @param {Object} e1rmsByMovementName — { "Lisäpainoleuanveto": 94, ... }
 * @returns {Object|null} per liike: { e1rm, opener, second, third } tai null
 */
function computeStreetliftingOpenerStrategy(e1rmsByMovementName) {
  if (!e1rmsByMovementName || typeof e1rmsByMovementName !== "object") return null;
  // v4.32.7 bugfix: streetlifting-kisaliikkeet ovat MU + Leuka + Dippi + Takakyykky.
  // SSW-formaatti ei sisällä maavetoa. Aiemmassa listassa oli Maastaveto mutta ei
  // Muscle-upia — molemmat virheelliset. Korjattu kanoniseen streetlifting-listaan.
  const COMPETITION_LIFTS = [
    "Lisäpainoleuanveto",
    "Muscle-up",
    "Lisäpainodippi",
    "Takakyykky",
  ];
  // Eliittikäytäntö (Helms, Bromley, IPF World Classic 2021 -data):
  //   Opener:  88–90 % 1RM (= "viimeisin treenisingle prep-blokin lopussa")
  //   2nd:     94–96 % 1RM
  //   3rd:    100–103 % 1RM (PR-yritys)
  const OPENER_PCT = 0.88;
  const SECOND_PCT = 0.95;
  const THIRD_PCT = 1.02;
  const result = {};
  for (const liftName of COMPETITION_LIFTS) {
    const e1rm = e1rmsByMovementName[liftName];
    if (!e1rm || e1rm <= 0) continue;
    result[liftName] = {
      e1rm: Math.round(e1rm * 10) / 10,
      opener: roundToHalf(e1rm * OPENER_PCT),
      second: roundToHalf(e1rm * SECOND_PCT),
      third: roundToHalf(e1rm * THIRD_PCT),
      openerPct: OPENER_PCT,
      secondPct: SECOND_PCT,
      thirdPct: THIRD_PCT,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Compute attempt loads for competition day.
 * Returns { warmupLoads: [...], opener, second, third } in external kg.
 */
function computeAttemptLoads(e1rmExternal, bw, peakingConfig) {
  if (!e1rmExternal || !peakingConfig) return null;

  const warmupLoads = (peakingConfig.warmupPcts || [0.40, 0.60, 0.75, 0.85]).map(pct =>
    roundToHalf(Math.max(0, e1rmExternal * pct))
  );

  return {
    warmupLoads,
    opener: roundToHalf(e1rmExternal * (peakingConfig.openerPct || 0.92)),
    second: roundToHalf(e1rmExternal * (peakingConfig.secondPct || 0.97)),
    third: roundToHalf(e1rmExternal * (peakingConfig.thirdPct || 1.02)),
    e1rmExternal,
  };
}

/**
 * Recommend function specifically for peaking mesocycles.
 * Key differences from normal recommend():
 * - No readiness caps (athlete decides)
 * - Competition day: enriches slots with computed loads
 * - Normal peaking days: load from weekDef deltaPctBase
 */
async function recommendPeaking(options = {}) {
  const settings = options.settings || (await getSettings());
  const bodyweightKg = options.bodyweightKg || settings.bodyweightKg || 91;
  const dateISO = options.dateISO || todayISO();
  const mesocycle = options.mesocycle;

  if (!mesocycle || mesocycle.type !== "peaking") {
    return recommend(options); // fallback to normal
  }

  const traces = [];
  function trace(ruleId, before, after, why) {
    traces.push({ traceId: uid(), recId: null, ruleId, before: { ...before }, after: { ...after }, why });
  }

  // Determine week
  // v4.22: erottele before-start / after-end — peaking-mesosyklissä myös
  // ennen alkua -pyynnöt eivät saa muuttaa käyttäjän valitsemaa mesosykliä
  const pos = resolveMesocyclePosition(mesocycle, dateISO);
  let weekNum = pos?.programWeek ?? null;
  if (weekNum === null) {
    if (pos?.reason === "before-start") {
      return {
        dateISO,
        error: "before-start",
        errorMessage: `Peaking-mesosykli alkoi ${mesocycle.startDateISO} — ei voida laskea suositusta aiemmalle päivälle`,
        traces,
        dayPlan: null,
        dayType: null,
        weekNum: null,
        weekLabel: null,
        targetExternalLoad: null,
      };
    }
    // after-end → create new default mesocycle with -5% deload start
    const newMeso = createDefaultMesocycle(dateISO);
    newMeso.weekDefs[0].deltaPctBase = -0.05;
    if (!options.dryRun) await saveMesocycle(newMeso);
    trace("PEAKING_TRANSITION", {}, { type: "default" }, "Peaking päättynyt → normaali mesosykli (-5% start)");
    return recommend({ ...options, mesocycle: newMeso });
  }

  const weekDef = getWeekDef(mesocycle, weekNum);
  const dayOfWeek = new Date(dateISO).getDay() || 7;
  const dayPlan = getTodayPlan(mesocycle, weekNum, dayOfWeek);
  const dayType = dayPlan?.dayType || "heavy";

  trace("PEAKING_PHASE", {}, { weekNum, dayType, label: weekDef?.label },
    `PEAKING Vk ${weekNum}: ${weekDef?.label || "?"}`);

  // e1RM from sets
  const allSets = options.allSets || (await getAllSets());
  const primaryMovementId = options.primaryMovementId || null;
  // v4.27.15: calibration-setit mukaan topSets-filtteriin myös peaking-polussa.
  const topSets = allSets
    .filter(s => {
      if (primaryMovementId && s.movementId !== primaryMovementId) return false;
      return s.setRole === "top" || s.setRole === "readiness_test" || s.setRole === "calibration";
    })
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  const recentTopSets = topSets.slice(-6);
  // Detect barbell-only lift (squat): no bodyweight added to system load
  const peakingPrimarySlot = dayPlan?.slots?.find(s => s.role === "primary");
  const isBarbellPeaking = peakingPrimarySlot?.isBarbell === true
    || options.primaryLoadType === "external";
  const e1rmValues = recentTopSets
    .map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      return isBarbellPeaking
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara)
        : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || s.targetReps || 3, vara);
    })
    .filter(v => v !== null);

  // v4.27.15: Calibration override — ks. recommend()-pääpolun kommentti.
  const peakingLast3Sets = recentTopSets.slice(-3);
  const peakingCalibSets = peakingLast3Sets.filter(s => s.setRole === "calibration");
  let currentE1RMSystem;
  if (peakingCalibSets.length > 0) {
    const calibE1rms = peakingCalibSets.map(s => {
      const vara = s.actualVx ?? 0;
      return isBarbellPeaking
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara)
        : e1rmSystem(bodyweightKg, s.externalLoadKg || 0, s.reps || 1, vara);
    }).filter(v => v !== null);
    currentE1RMSystem = calibE1rms.length > 0 ? median(calibE1rms) : (e1rmValues.length > 0 ? median(e1rmValues) : null);
  } else {
    currentE1RMSystem = e1rmValues.length > 0 ? median(e1rmValues) : null;
  }
  // Barbell: external = system (ei BW-vähennystä). Muut: sys - BW.
  const currentE1RMExternal = currentE1RMSystem !== null
    ? (isBarbellPeaking ? currentE1RMSystem : Math.max(0, currentE1RMSystem - bodyweightKg))
    : null;

  // Use peakingConfig e1RM if no computed e1RM
  const useE1RM = currentE1RMExternal || mesocycle.peakingConfig?.e1rmExternal || 93;

  trace("PEAKING_E1RM", {}, {
    e1rmExternal: useE1RM.toFixed(1),
    source: currentE1RMExternal ? "computed" : "peakingConfig",
  }, `Peaking e1RM: ${useE1RM.toFixed(1)} kg`);

  // Competition day: compute attempt loads
  let attemptLoads = null;
  if (dayType === "competition") {
    attemptLoads = computeAttemptLoads(useE1RM, bodyweightKg, mesocycle.peakingConfig);
    trace("COMPETITION_LOADS", {}, attemptLoads, "Kilpailukuormat laskettu");
  }

  // Normal peaking day: compute load from slot reps/vx (not weekDef!)
  // Apply dayMult to delta like normal recommend() does
  const dayMult = DAY_TYPE_MULTIPLIERS[dayType] ?? 1.0;
  const deltaPct = (weekDef?.deltaPctBase || 0) * dayMult;

  // Read reps/vx from primary slot (accurate per-day prescription)
  const primarySlot = dayPlan?.slots?.find(s => s.role === "primary");
  let targetReps, targetVx;
  if (primarySlot) {
    targetReps = primarySlot.reps;
    targetVx = primarySlot.targetVx ?? (dayType === "heavy" ? 1 : dayType === "volume" ? 2 : 4);
  } else {
    // Fallback to weekDef if no slot found
    targetReps = weekDef?.heavyReps || 2;
    targetVx = weekDef?.heavyTargetVx || 1;
    if (dayType === "volume") {
      targetReps = Math.max(3, targetReps + 2);
      targetVx = Math.min(4, targetVx + 1);
    }
  }

  let targetExternalLoad;
  if (currentE1RMSystem !== null) {
    const effectiveReps = targetReps + targetVx;
    const targetSystemLoad = currentE1RMSystem / (1 + effectiveReps / 30);
    const rawExternal = targetSystemLoad * (1 + deltaPct) - bodyweightKg;
    targetExternalLoad = roundToHalf(Math.max(0, rawExternal));
  } else {
    targetExternalLoad = null;
  }

  const rec = {
    recId: uid(),
    dateISO,
    mesocycleId: mesocycle.mesocycleId,
    mesocycleType: "peaking",
    weekNum,
    weekLabel: weekDef?.label || "?",
    dayType,
    targetExternalLoad,
    targetReps,
    targetVx,
    setCount: dayPlan?.slots?.find(s => s.role === "primary")?.sets || 3,
    deltaPct,
    capLevel: 0, // No caps in peaking
    readiness: options.readiness || { combined: "GREEN", capLevel: 0, channels: {} },
    e1rmSystem: currentE1RMSystem,
    e1rmExternal: currentE1RMExternal,
    bodyweightKg,
    varaFeedback: { suggestion: null, type: null },
    breakInfo: null,
    accessoryCapActive: false,
    dayPlan,
    attemptLoads,
    peakingConfig: mesocycle.peakingConfig,
    traces,
  };

  for (const t of traces) t.recId = rec.recId;

  if (!options.dryRun) {
    await saveRecommendation({
      recId: rec.recId,
      sessionId: null,
      variantId: null,
      targetSetRole: "top",
      targetLoadKg: targetExternalLoad,
      deltaPct,
      capLevel: 0,
      mesocycleWeek: weekNum,
      dayType,
      targetReps,
      targetVx,
      createdAtISO: new Date().toISOString(),
    });
    for (const t of traces) await saveDecisionTrace(t);
  }

  return rec;
}

// ═══════════════════════════════════════════════════════════════
// ANNUAL PERIODIZATION — SUGGESTED NEXT TEMPLATE
// ═══════════════════════════════════════════════════════════════

// Mapping: current mesocycle type → recommended next template(s)
// First entry is the primary recommendation, rest are alternatives
const SUGGESTED_NEXT_TEMPLATE = {
  default:       ["hypertrofia", "maksimivoima", "dup"],           // Perusjaksosta eteenpäin
  hypertrofia:   ["maksimivoima", "default", "dup"],               // Lihasmassasta voimaan
  maksimivoima:  ["peaking", "eksentrinen", "palautuminen"],       // Maksimivoima → kilpailu tai palautuminen
  eksentrinen:   ["palautuminen", "default", "maksimivoima"],      // Eksentrinen → palaudu ensin
  dup:           ["maksimivoima", "hypertrofia", "eksentrinen"],    // DUP → voimablokkiin
  siirtyma:      ["hypertrofia", "default", "dup"],                // GPP → uusi kasvujakso
  palautuminen:  ["hypertrofia", "default", "siirtyma"],           // Palautuminen → uusi kasvu
  peaking:       ["palautuminen", "siirtyma", "hypertrofia"],      // Kilpailun jälkeen → lepo
};

// ═══════════════════════════════════════════════════════════════
// v4.34.0 AI-BLOCK-TUNING (deload-pohjainen analyysipaketti)
// ═══════════════════════════════════════════════════════════════
//
// Generoi rikkaan analyysipaketin atleetin viedäkseen Claude/ChatGPT:lle
// deload-viikolla (vk 4, 8, 12). AI palauttaa block-tuning-suosituksia
// kolmessa kategoriassa:
//   A) Sovellus-tason muutokset (atleetti applaa UI:ssa: slot-swap, e1RM, BW)
//   B) Rakenteelliset muutokset (Claude Code -tasolla: %-progressio,
//      set/rep, backoff-tyyli, engine-säätö)
//   C) Mentaalinen koutsaus (atleetti sisäistää: tekniikkavinkit,
//      pattern-tunnistus, riskimanagement)
//
// Output: { markdown, json, prompt, meta }
//   markdown = atleetin luettava 1500-2000 sanan narratiivi
//   json     = strukturoitu data Claude AI:lle ristivertailuun
//   prompt   = valmis copy-paste AI-prompt jossa kaikki konteksti

function generateBlockTuningPackage(ctx) {
  const { mesocycle, sessions, allSets, measurements, prs, currentWeekNum, settings, decisionTraces } = ctx;

  if (!mesocycle || mesocycle.type !== "streetlifting_16w") {
    return { error: "AI-Block-Tuning vaatii streetlifting_16w-mesosyklin." };
  }

  const wk = currentWeekNum;
  // Deload-tunnistus: vk 4, 8, 12. Vk 16 (kisaviikko) ei generoi.
  const deloadWeeks = [4, 8, 12];
  if (!deloadWeeks.includes(wk)) {
    return {
      error: `AI-Block-Tuning aktivoituu vain deload-viikoilla (vk 4, 8, 12). Olet vk ${wk}. Seuraava deload: vk ${deloadWeeks.find(d => d > wk) || "16 (kisaviikko)"}.`
    };
  }

  // Blokki-rakenne
  const blockMap = {
    4:  { prevBlock: "Foundation",   prevWeeks: [1,2,3], nextBlock: "Strength",  nextWeeks: [5,6,7] },
    8:  { prevBlock: "Strength",     prevWeeks: [5,6,7], nextBlock: "Intensity", nextWeeks: [9,10,11] },
    12: { prevBlock: "Intensity",    prevWeeks: [9,10,11], nextBlock: "Peaking",   nextWeeks: [13,14] },
  };
  const block = blockMap[wk];

  // ── Atleettiprofile ──
  const cal = mesocycle.streetliftingConfig?.calibration || {};
  const bw = settings?.bodyweightKg || 91;
  const profile = {
    bw,
    weekCount: mesocycle.weekCount || 16,
    competitionDate: mesocycle.streetliftingConfig?.competitionDate || "elokuu 2026",
    calibration: cal,
    prs: (prs || []).map(p => ({ movement: p.movementName, value: p.value, dateISO: p.dateISO, context: p.context })),
  };

  // ── Edellisen blokin sessio-data ──
  const prevBlockSessions = (sessions || []).filter(s => {
    const sw = getMesocycleWeek(mesocycle, s.dateISO);
    return block.prevWeeks.includes(sw);
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const sessionAnalysis = prevBlockSessions.map(sess => {
    const sessSets = (allSets || []).filter(set => set.sessionId === sess.sessionId);
    const sw = getMesocycleWeek(mesocycle, sess.dateISO);
    const slots = sessSets.map(set => ({
      movementName: set.movementName,
      role: set.setRole,
      prescribed: { reps: set.targetReps, vx: set.targetVx, loadKg: set.targetLoadKg, loadPct: set.targetLoadPct },
      actual: { reps: set.reps, actualVx: set.actualVx, loadKg: set.externalLoadKg, velocity: set.velocityMs },
      vxDelta: (set.targetVx != null && set.actualVx != null) ? (set.targetVx - set.actualVx) : null,
    }));
    return {
      week: sw,
      dateISO: sess.dateISO,
      label: sess.label,
      dayType: sess.dayType,
      slots,
      notes: sess.notes || null,
    };
  });

  // ── e1RM-trendit per kisaliike ──
  const compLifts = ["Lisäpainoleuanveto", "Muscle-up", "Lisäpainodippi", "Takakyykky"];
  const e1rmTrends = {};
  for (const liftName of compLifts) {
    const liftSets = (allSets || []).filter(set => set.movementName === liftName && set.externalLoadKg > 0);
    if (liftSets.length === 0) continue;
    const sortedSets = liftSets.sort((a, b) => (a.timestamp || a.dateISO || "").localeCompare(b.timestamp || b.dateISO || ""));
    const dataPoints = sortedSets.slice(-12).map(s => {
      const vara = s.actualVx ?? s.targetVx ?? 1;
      const e1rm = liftName === "Takakyykky"
        ? e1rmAccessory(s.externalLoadKg || 0, s.reps || 1, vara)
        : e1rmSystem(bw, s.externalLoadKg || 0, s.reps || 1, vara);
      return { dateISO: s.dateISO, e1rm: Math.round(e1rm * 10) / 10, load: s.externalLoadKg, reps: s.reps, vx: s.actualVx };
    });
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].e1rm;
      const latest = dataPoints[dataPoints.length - 1].e1rm;
      const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
      e1rmTrends[liftName] = {
        first, latest, deltaPct: Math.round(deltaPct * 10) / 10,
        dataPoints,
      };
    }
  }

  // ── HRV / MPV / BW-trendit ──
  const blockMeasurements = (measurements || []).filter(m => {
    const mw = getMesocycleWeek(mesocycle, m.dateISO);
    return block.prevWeeks.includes(mw) || mw === wk;
  }).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  const trends = {
    hrv: blockMeasurements.filter(m => m.hrv != null).map(m => ({ dateISO: m.dateISO, value: m.hrv })),
    mpv: blockMeasurements.filter(m => m.mpv != null).map(m => ({ dateISO: m.dateISO, value: m.mpv })),
    bodyweight: blockMeasurements.filter(m => m.bodyweightKg != null).map(m => ({ dateISO: m.dateISO, value: m.bodyweightKg })),
  };

  // ── Anomaliat ──
  const anomalies = [];
  for (const sess of sessionAnalysis) {
    for (const slot of sess.slots) {
      if (slot.actual.actualVx === 0 && slot.role === "primary") {
        anomalies.push({ type: "failure-primary", week: sess.week, day: sess.label, movement: slot.movementName, prescribed: slot.prescribed, actual: slot.actual });
      }
      if (slot.vxDelta != null && Math.abs(slot.vxDelta) >= 2 && slot.role === "primary") {
        anomalies.push({ type: "vx-mismatch", week: sess.week, day: sess.label, movement: slot.movementName, vxDelta: slot.vxDelta, prescribed: slot.prescribed, actual: slot.actual });
      }
    }
  }

  // ── Aggregaatit ──
  const totalSessions = sessionAnalysis.length;
  const completedSets = sessionAnalysis.reduce((sum, s) => sum + s.slots.length, 0);
  const vxHits = sessionAnalysis.reduce((acc, s) => {
    for (const slot of s.slots) {
      if (slot.prescribed.vx != null && slot.actual.actualVx != null) {
        acc.total++;
        // Hit: actual within ±1 of target
        if (Math.abs(slot.vxDelta || 0) <= 1) acc.hits++;
      }
    }
    return acc;
  }, { hits: 0, total: 0 });
  const aggregates = {
    totalSessions,
    completedSets,
    vxHitRate: vxHits.total > 0 ? Math.round((vxHits.hits / vxHits.total) * 100) : null,
    failureCount: anomalies.filter(a => a.type === "failure-primary").length,
  };

  // ── Seuraavan blokin prescribed ──
  const wp = mesocycle.weekPlans || [];
  const nextBlockPrescribed = block.nextWeeks.map(nw => {
    const wkPlan = wp[nw - 1];
    if (!wkPlan?.days) return null;
    return {
      week: nw,
      days: wkPlan.days.map(d => ({
        label: d.label,
        primary: (d.slots || []).find(s => s.role === "primary"),
        backoff: (d.slots || []).find(s => s.role === "backoff"),
        topSet: (d.slots || []).find(s => s.role === "secondary" || s.role === "calibration"),
      })),
    };
  }).filter(Boolean);

  // ── Markdown-narratiivi (atleetille) ──
  const markdown = buildMarkdownNarrative({ profile, block, currentWeek: wk, sessionAnalysis, e1rmTrends, trends, anomalies, aggregates, nextBlockPrescribed });

  // ── JSON-data (AI:lle) ──
  const json = {
    meta: {
      version: "4.34.0",
      generatedAt: new Date().toISOString(),
      currentWeek: wk,
      blockTransition: `${block.prevBlock} → ${block.nextBlock}`,
    },
    profile,
    completedBlock: {
      name: block.prevBlock,
      weeks: block.prevWeeks,
      sessions: sessionAnalysis,
      e1rmTrends,
      trends,
      anomalies,
      aggregates,
    },
    upcomingBlock: {
      name: block.nextBlock,
      weeks: block.nextWeeks,
      prescribed: nextBlockPrescribed,
    },
  };

  // ── AI-prompt (valmis copy-paste) ──
  const prompt = buildAiPrompt({ profile, block, currentWeek: wk, json, markdown });

  return {
    markdown,
    json,
    prompt,
    meta: {
      currentWeek: wk,
      blockTransition: `${block.prevBlock} → ${block.nextBlock}`,
      generatedAt: new Date().toISOString(),
      sessionsAnalyzed: totalSessions,
      anomaliesFound: anomalies.length,
    },
  };
}

function buildMarkdownNarrative({ profile, block, currentWeek, sessionAnalysis, e1rmTrends, trends, anomalies, aggregates, nextBlockPrescribed }) {
  const lines = [];
  lines.push(`# AI-Block-Tuning -analyysi — ${block.prevBlock} → ${block.nextBlock} (vk ${currentWeek})`);
  lines.push("");
  lines.push(`**Generoitu**: ${new Date().toLocaleDateString("fi-FI")}`);
  lines.push(`**Mesosykli**: streetlifting_16w, vk ${currentWeek}/16`);
  lines.push(`**Atleettiprofile**: ${profile.bw} kg bw, K=${profile.calibration.kyykkyExtKg} kg, L=${profile.calibration.leukaExtKg} kg, D=${profile.calibration.dippiExtKg} kg`);
  lines.push("");

  lines.push(`## Edellisen blokin yhteenveto (${block.prevBlock}, vk ${block.prevWeeks.join("-")})`);
  lines.push("");
  lines.push(`- Sessioita kirjattu: **${aggregates.totalSessions}**`);
  lines.push(`- Sarjoja yhteensä: **${aggregates.completedSets}**`);
  if (aggregates.vxHitRate != null) {
    lines.push(`- Vx-target-hit-rate (±1): **${aggregates.vxHitRate}%**`);
  }
  lines.push(`- Failure-tapauksia (V0 primary): **${aggregates.failureCount}**`);
  lines.push("");

  if (Object.keys(e1rmTrends).length > 0) {
    lines.push("### e1RM-trendit per kisaliike");
    lines.push("");
    lines.push("| Liike | Lähtö | Loppu | Δ% |");
    lines.push("|---|---|---|---|");
    for (const [name, t] of Object.entries(e1rmTrends)) {
      const arrow = t.deltaPct > 0 ? "📈" : t.deltaPct < 0 ? "📉" : "→";
      lines.push(`| ${name} | ${t.first} kg | ${t.latest} kg | ${arrow} ${t.deltaPct >= 0 ? "+" : ""}${t.deltaPct}% |`);
    }
    lines.push("");
  }

  if (trends.hrv.length > 0 || trends.mpv.length > 0 || trends.bodyweight.length > 0) {
    lines.push("### Recovery-/mittari-trendit");
    lines.push("");
    if (trends.hrv.length > 0) {
      const hrvFirst = trends.hrv[0].value, hrvLast = trends.hrv[trends.hrv.length - 1].value;
      const hrvDelta = hrvFirst > 0 ? Math.round(((hrvLast - hrvFirst) / hrvFirst) * 1000) / 10 : 0;
      lines.push(`- **HRV**: ${trends.hrv.length} mittausta, ${hrvFirst.toFixed(1)} → ${hrvLast.toFixed(1)} (${hrvDelta >= 0 ? "+" : ""}${hrvDelta}%)`);
    }
    if (trends.mpv.length > 0) {
      const mpvFirst = trends.mpv[0].value, mpvLast = trends.mpv[trends.mpv.length - 1].value;
      const mpvDelta = mpvFirst > 0 ? Math.round(((mpvLast - mpvFirst) / mpvFirst) * 1000) / 10 : 0;
      lines.push(`- **MPV** (yläraaja-readiness): ${trends.mpv.length} mittausta, ${mpvFirst.toFixed(2)} → ${mpvLast.toFixed(2)} m/s (${mpvDelta >= 0 ? "+" : ""}${mpvDelta}%)`);
    }
    if (trends.bodyweight.length > 0) {
      const bwFirst = trends.bodyweight[0].value, bwLast = trends.bodyweight[trends.bodyweight.length - 1].value;
      const bwDelta = Math.round((bwLast - bwFirst) * 10) / 10;
      lines.push(`- **Bodyweight**: ${bwFirst} → ${bwLast} kg (${bwDelta >= 0 ? "+" : ""}${bwDelta} kg)`);
    }
    lines.push("");
  }

  if (anomalies.length > 0) {
    lines.push("### Anomaliat / risk-flags");
    lines.push("");
    for (const a of anomalies.slice(0, 8)) {
      if (a.type === "failure-primary") {
        lines.push(`- 🔴 **Failure (V0)** vk ${a.week} ${a.day}: ${a.movement} prescribed Vx${a.prescribed.vx}, actual V0 — paino oli liian raskas`);
      } else if (a.type === "vx-mismatch") {
        const direction = a.vxDelta > 0 ? "raskaampaa kuin target" : "kevyempää kuin target";
        lines.push(`- ⚠️ **Vx-mismatch** vk ${a.week} ${a.day}: ${a.movement} target Vx${a.prescribed.vx}, actual V${a.actual.actualVx} (${a.vxDelta > 0 ? "+" : ""}${a.vxDelta} delta — ${direction})`);
      }
    }
    lines.push("");
  }

  lines.push(`## Seuraava blokki (${block.nextBlock}, vk ${block.nextWeeks.join("-")})`);
  lines.push("");
  lines.push("Suunniteltu rakenne (prescribed):");
  lines.push("");
  for (const wk of nextBlockPrescribed) {
    lines.push(`### Vk ${wk.week}`);
    for (const d of wk.days) {
      const p = d.primary;
      const b = d.backoff;
      const t = d.topSet;
      const parts = [];
      if (p) parts.push(`Primary: ${p.defaultMovementName} ${p.sets}×${p.reps} V${p.targetVx} @${Math.round((p.loadPct || 0) * 100)}%`);
      if (b) parts.push(`Backoff: ${b.sets}×${b.reps} @${Math.round((b.loadPct || 0) * 100)}%`);
      if (t) parts.push(`Top: ${t.note || ""}`);
      lines.push(`- ${d.label}: ${parts.join(" | ")}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("**Ohje**: vie tämä paketti Claude AI:lle (Claude.ai) tai ChatGPT:lle. Paste:aa AI-prompt, joka sisältää koko datan + kysymykset. AI palauttaa A/B/C-kategorisoidut suositukset.");
  return lines.join("\n");
}

function buildAiPrompt({ profile, block, currentWeek, json, markdown }) {
  return `KONTEKSTI:
Streetlifter, ${profile.bw} kg bw, 15+ v kokemus.
Mesosykli: streetlifting_16w, currently vk ${currentWeek}/16.
Block-transition: ${block.prevBlock} → ${block.nextBlock}.
Kisapäivä: ${profile.competitionDate}.
Tavoite: takakyykky 200+ kg muscle memory -palautuksena.

PR-historia: ${profile.prs.map(p => `${p.movement} ${p.value} kg (${p.context})`).join(", ") || "ei kirjattu"}

DATA (edellinen blokki + recovery-trendit + anomaliat + seuraava blokki suunniteltuna):

${markdown}

═══════════════════════════════════════════════════════════════════
RAW JSON (tarkka data):
═══════════════════════════════════════════════════════════════════

\`\`\`json
${JSON.stringify(json, null, 2)}
\`\`\`

═══════════════════════════════════════════════════════════════════
TEHTÄVÄ:
═══════════════════════════════════════════════════════════════════

Analysoi edellisen blokin (${block.prevBlock}, vk ${block.prevWeeks.join("-")}) suoritus
ja ehdota seuraavan blokin (${block.nextBlock}, vk ${block.nextWeeks.join("-")})
optimointia atleettispesifisesti.

KÄYTÄ:
- Pelland 2024, Refalo 2023, Robinson 2025, Helms 2018, Tuchscherer RTS,
  Israetel JTS/RP, Bruusgaard 2010, Sánchez-Moreno 2017/2020, Plews 2013
- Streetlifting-no-evidence-guard: jos kysymys streetlifting-spesifi
  (SSW/SLRY) ja peer-reviewed-data ei löydy → mainitse eksplisiittisesti

VASTAA TÄSSÄ FORMAATISSA (atleetti vie suositukset eri kategorioihin):

\`\`\`json
{
  "blockExecutionVerdict": {
    "summary": "1-2 lausetta yleisarvio",
    "progressionRate": "actual vs predicted (%)",
    "recoveryStatus": "GREEN | YELLOW | RED",
    "concerns": ["list of risk flags"]
  },

  "categoryA_appOverrides": [
    {
      "type": "movement_swap | load_calibration | bodyweight_update | extra_deload | accessory_drop",
      "details": "exact UI action atleetti tekee",
      "rationale": "1-2 lausetta + sitaatti",
      "priority": "high | medium | low"
    }
  ],

  "categoryB_codeChanges": [
    {
      "type": "loadPct_adjust | sets_reps_adjust | backoff_style | engine_param | new_movement",
      "scope": "vk X-Y, päivä, slot",
      "from": "current value",
      "to": "proposed value",
      "rationale": "perustelut + sitaatti",
      "priority": "high | medium | low",
      "claudeCodePromptHint": "valmis prompt minulle (Claude Code) toteutusta varten"
    }
  ],

  "categoryC_athleteCoaching": [
    {
      "topic": "technique | recovery | mental | nutrition | risk-management",
      "observation": "mitä datasta nähdään",
      "advice": "konkreettinen toiminta atleetille",
      "rationale": "perustelut"
    }
  ],

  "criticalQuestions": [
    "kysymyksiä joihin Claude haluaa atleetin vastaavan ennen finaalin lukitsemista"
  ],

  "citations": [
    "Tekijä Vuosi — relevantti löydös"
  ]
}
\`\`\`

OUTPUT-VAATIMUKSET:
- Ole spesifi (kg, %, sets/reps tarkasti — ei yleistasoisia neuvoja)
- Erottele vakaa konsensus / aktiivinen debate / heuristiikka
- Kategoria B: anna minulle (Claude Code) tarpeeksi tietoa toteutukseen
  ilman lisäkysymyksiä
- Älä ehdota muutoksia jotka ovat jo toteutettu (esim. v4.32.9 M14
  topSingleFirst — tarkista että et päällekkäistä työtä)
- Älä myöntäile — jos block-execution oli puutteellinen, sano se`;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Constants
  DAY_TYPE_MULTIPLIERS,
  DAY_TYPE_SET_RECIPES,
  REST_RECOMMENDATIONS,
  pickRestForExercise,
  READINESS_CLASSES,
  SUGGESTED_NEXT_TEMPLATE,
  // Math
  median,
  mad,
  madSigma,
  zScore,
  avg,
  clamp,
  roundToHalf,
  // e1RM
  e1rmSystem,
  e1rmExternal,
  e1rmAccessory,
  targetLoadFromE1RM,
  // Baseline
  computeBaseline,
  classifyReadinessZ,
  // Readiness
  velocityReadiness,
  hrvReadiness,
  varaReadiness,
  upperBodyMpvReadiness,
  // v4.34.0 AI-Block-Tuning
  generateBlockTuningPackage,
  combineReadiness,
  // Mesocycle
  getMesocycleWeek,
  getWeekDef,
  getTodayPlan,
  deltaPctRaw,
  calibrateMesocycle,
  // Vara
  varaFeedback,
  varaTrendCorrection,
  e1rmMomentumBonus,
  grossMismatchCorrection,
  // Break
  breakAnalysis,
  mesocycleBreakReset,
  // Failure
  failureReaction,
  // Accessory
  accessoryProgression,
  updateMovementProgressFromSets,
  initialWeightFrom1RM,
  // Velocity
  velocityLossPercent,
  // Recommend
  recommend,
  recommendPeaking,
  // v4.34.14: rate-limit-anchor exposed for tests + diagnostics
  computeRateLimitAnchor,
  // Variant periodization
  DEFAULT_VARIANT_MODIFIERS,
  getDefaultVariantForDayType,
  variantLoadModifier,
  variantRepOverride,
  assignVariantRotation,
  // Peaking
  computeAttemptLoads,
  computeStreetliftingOpenerStrategy,
  // v4.30.3: ennuste
  predictE1RMEndOfProgram,
  computeStreetliftingFinalProjection,
  // Weekly
  weeklyStimulus,
  // Stagnation
  checkStagnation,
  // Accessory slot resolution (v4.11)
  phaseForWeek,
  resolveAccessorySlot,
  resolveMesocyclePosition,
  isInsertedDeloadWeek,
  isReplacedDeloadWeek,
  isDeloadOverrideWeek,
  getEffectiveWeekCount,
  resolveDayPlanSlots,
  suggestAccessorySwaps,
  // Default plan
  generateDefaultDayPlan,
  // Block periodization (v4.25 P1-10)
  getBlockForWeek,
  getAccessoryBlockScalar,
  // MU autoregulation (v4.25 P1-9)
  adjustMULoad,
  // Failure lockout (v4.25 P2-16)
  hadFailureLastSession,
  // Load-velocity profile (v4.25.1 — Enode)
  computeLoadVelocityProfile,
  // Readiness test
  readinessTestLoad,
  // Speed
  speedDayLoad,
  // HRV
  ouraHRVtoLnRMSSD,
  // Adaptive
  analyzeSessionAdaptation,
  applyAdaptations,
  // Future workouts
  getFutureWorkouts,
  // Missed prior sessions
  findMissedPriorSessions,
  // Elite check
  eliteVolumeCheck,
  // Movement e1RM
  computeMovementE1RM,
  computeMovementE1RMHistory,
};
