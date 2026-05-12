// athlete-simulator.mjs
// Per-profile log-generator: Vara + velocity + reps deterministisesti seeded RNG:llä.
//
// Profiilin bias-parametrit:
//  - grindy: +/- offset todelliseen Vx-arvioon (Akseli: +0.7 = systemaattisesti +1 luokka liian optimistinen)
//  - varaJitter: standardideviaatio Vx-arvioissa
//  - velocityRep1Mean[phase]: rep1 MPV per blokki
//  - velocityDeclinePerRep[phase]: declineprosentti per toisto
//  - repFailureProb[phase]: todennäköisyys että rep epäonnistuu
//  - dayQualitySigma: päivien välinen varianssi (uni, ravinto)

import { mulberry32, gaussianFromRng, clamp, roundStep } from "./seeded-rng.mjs";

const PHASE_FOR_WEEK_DEFAULT = (weekNum) => {
  // Default mesotyyppi-mapping streetlifting_16w:lle:
  // 1-3 foundation, 4 deload, 5-7 strength, 8 deload, 9-11 intensity, 12 deload, 13-16 peaking
  if (weekNum <= 3) return "foundation";
  if (weekNum === 4) return "deload-foundation";
  if (weekNum <= 7) return "strength";
  if (weekNum === 8) return "deload-strength";
  if (weekNum <= 11) return "intensity";
  if (weekNum === 12) return "deload-intensity";
  return "peaking";
};

const PHASE_FOR_DEFAULT_MESO = (weekNum) => {
  // createDefaultMesocycle: 4 vk, ei explicit phases
  if (weekNum <= 3) return "foundation";
  return "deload-foundation";
};

function resolveBlockPhase(weekNum, mesocycleType) {
  if (mesocycleType === "streetlifting_16w") return PHASE_FOR_WEEK_DEFAULT(weekNum);
  if (mesocycleType === "hypertrofia" || mesocycleType === "maksimivoima") return "strength";
  return PHASE_FOR_DEFAULT_MESO(weekNum);
}

// Mappaa actualVx -> rep1 MPV (Sánchez-Moreno 2017-tyylisesti, intercept-slope-approks)
// Tämä on simulator-puoli, EI engine.js:n laskenta — emme yritä matchata 1:1.
function approxRep1Velocity(profile, phase, actualVx, dayDelta) {
  const phaseKey = phase.replace("deload-", "");
  const mean = profile.bias.velocityRep1Mean?.[phaseKey] ?? 0.75;
  // Vx 5 = lähellä rep1 maxia, Vx 0 = lähellä failurea
  // Adjustment: kun actualVx pienempi, rep1 hidastuu (raskaampi kuorma)
  const vxAdjust = (actualVx - 2) * 0.02; // V0 → -0.04, V4 → +0.04
  return clamp(mean + vxAdjust + dayDelta * 0.05, 0.20, 1.20);
}

// Pääfunktio: generoi yhden setin simuloitu palautusarvo, sama struktuuri kuin Set-objekti
export function simulateSet({
  profile,
  weekNum,
  dayOfWeek,
  setIndex, // index within session (0-based)
  slot, // dayPlan slot
  rngFn, // seeded RNG functio
}) {
  const phase = resolveBlockPhase(weekNum, profile.mesoConfig?.type);
  const targetVx = slot.targetVx ?? 2;
  const targetReps = slot.reps ?? 5;

  // Päivän laatu — vaikuttaa kaikkiin tämän päivän setteihin
  const dayDelta = gaussianFromRng(rngFn) * (profile.bias.dayQualitySigma ?? 0.15);

  // Failure-todennäköisyys
  const phaseKey = phase.replace("deload-", "");
  const failureProb = profile.bias.repFailureProb?.[phaseKey] ?? 0.05;
  const isDeload = phase.startsWith("deload-");
  const adjustedFailureProb = isDeload ? failureProb * 0.3 : failureProb;

  // Aktuaali Vx — kuinka monta toistoa varaa todellisuudessa
  // Tämä on profiilin "todellinen" suorituskyky tällä kuormalla
  // V5 = kevyt (paljon varaa), V0 = failure
  const baselineActualVx = targetVx + dayDelta * 1.5;
  const noiseActual = gaussianFromRng(rngFn) * 0.5;
  let actualVx = Math.round(clamp(baselineActualVx + noiseActual, 0, 5));

  // Failure-tarkistus: jos todennäköisyys osuu, atletti epäonnistuu = V0 + reps-leikkaus
  let actualReps = targetReps;
  if (rngFn() < adjustedFailureProb) {
    actualVx = 0;
    actualReps = Math.max(1, targetReps - Math.floor(rngFn() * 3) - 1);
  }

  // Raportoitu Vx — atletin biased estimaatti
  const grindy = profile.bias.grindy ?? 0;
  const jitter = gaussianFromRng(rngFn) * (profile.bias.varaJitter ?? 0.4);
  const reportedVx = Math.round(clamp(actualVx + grindy + jitter, 0, 5));

  // Velocity per rep (mvReps[])
  const declineKey = phaseKey;
  const declinePerRep = profile.bias.velocityDeclinePerRep?.[declineKey] ?? 0.05;
  const rep1Velocity = approxRep1Velocity(profile, phase, actualVx, dayDelta);
  const mvReps = [];
  for (let r = 0; r < actualReps; r++) {
    const declineJitter = 1 + gaussianFromRng(rngFn) * 0.15;
    const v = clamp(rep1Velocity - declinePerRep * r * declineJitter, 0.10, 1.30);
    mvReps.push(Math.round(v * 1000) / 1000);
  }

  // VL = (rep1 - lastRep) / rep1 × 100
  const lastRep = mvReps[mvReps.length - 1] ?? rep1Velocity;
  const velocityLoss = ((rep1Velocity - lastRep) / rep1Velocity) * 100;

  // Set-objekti — sama rakenne kuin data.js Set-store.
  // KRIITTINEN: movementId pitää olla SAMA arvo kuin movementCatalog:issa (= movementName),
  // jotta engine.js:n recentTopSets-filtter (set.movementId === primaryMovementId) matchaa.
  // systemLoadKg täytetään (= externalLoadKg + bodyweightKg jos competition-lift), jotta
  // engine.js:n Epley+Vara-laskenta toimii.
  const externalLoadKg = slot.resolvedLoadKg ?? slot.suggestedLoadKg ?? 100;
  const isCompetitionLift = !!slot.competitionLift;
  const systemLoadKg = isCompetitionLift ? externalLoadKg + (profile.meta.bodyweightKg ?? 91) : externalLoadKg;

  return {
    setId: `sim-${profile.id}-w${weekNum}-d${dayOfWeek}-s${setIndex}`,
    sessionId: null, // täytetään scenario-runneri:lla
    movementId: slot.movementName || slot.defaultMovementName, // = movementCatalog.movementId
    movementName: slot.movementName || slot.defaultMovementName,
    variantName: slot.variantName ?? null,
    setRole: slot.role === "primary" ? "top" : slot.role === "backoff" ? "backoff" : slot.role === "calibration" ? "calibration" : "accessory",
    externalLoadKg,
    systemLoadKg,
    reps: actualReps,
    targetReps,
    vara: reportedVx,
    targetVx,
    actualVx, // ground truth — säilytetään auditia varten
    mvReps,
    rep1Velocity: Math.round(rep1Velocity * 1000) / 1000,
    velocityLoss: Math.round(velocityLoss * 10) / 10,
    completedAtISO: null, // täytetään scenario-runneri:lla
  };
}

// Apuri: rakenna seeded RNG per (profile.seed, weekNum, dayOfWeek)
// Tämä takaa ettei vk1-d1 -setti vaikuta vk1-d2-arvontaan.
export function rngForDay(profile, weekNum, dayOfWeek) {
  const seed = (profile.seed ?? 12345) ^ (weekNum * 1000 + dayOfWeek * 13);
  return mulberry32(seed >>> 0);
}
