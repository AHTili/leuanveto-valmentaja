// uncalibrated-intermediate.mjs
// Intermediate atletti ilman kalibrointia ja PR-historiaa. Vara_loose-precision, perceptual-vbt.
// Testaa miten engine käyttäytyy kun e1RM seed:taan vain SUGGESTED_LOAD_FALLBACK:lla.

export const UNCAL_INTER = {
  id: "uncalibrated-intermediate",
  meta: {
    age: 27,
    sex: "male",
    bodyweightKg: 72,
    heightCm: 174,
    experienceYears: 2,
    level: "intermediate",
    sport: "general_strength",
  },
  prs: {}, // ei PR-historiaa
  cfgBaselines: {}, // ei kalibrointia
  bias: {
    grindy: 0.1,
    varaJitter: 1.0, // korkea jitter — vara_loose
    dayQualitySigma: 0.20,
    velocityRep1Mean: { foundation: 0.90, strength: 0.80, intensity: 0.70, peaking: 0.58, speed: 1.00 },
    velocityDeclinePerRep: { foundation: 0.05, strength: 0.06, intensity: 0.08, peaking: 0.10, speed: 0.04 },
    repFailureProb: { foundation: 0.04, strength: 0.08, intensity: 0.15, peaking: 0.22, speed: 0.02 },
  },
  injuries: [],
  hrvBaselineMs: 52,
  hrvVarianceMs: 11,
  mesoConfig: {
    type: "default",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: ["K1", "K3"], // RTF pending + UI ei kommunikoi
  seed: 80000,
};

export default UNCAL_INTER;
