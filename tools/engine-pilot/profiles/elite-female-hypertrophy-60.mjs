// elite-female-hypertrophy-60.mjs
// Elite-naisatleetti, hypertrofiblokki, 60 kg.
// Erityispiirre: Huiberts 2024 sex-modifier voi triggeröityä.

export const ELITE_FEMALE_HYP_60 = {
  id: "elite-female-hypertrophy-60",
  meta: {
    age: 29,
    sex: "female",
    bodyweightKg: 60,
    heightCm: 165,
    experienceYears: 10,
    level: "elite",
    sport: "hypertrophy",
  },
  prs: {
    "Takakyykky": { weightKg: 110, reps: 1, dateISO: "2025-09-01", loadType: "external" },
    "Penkkipunnerrus": { weightKg: 65, reps: 1, dateISO: "2025-09-15", loadType: "external" },
    "Maastaveto": { weightKg: 140, reps: 1, dateISO: "2025-09-10", loadType: "external" },
  },
  cfgBaselines: {
    "Takakyykky": 110,
    "Penkkipunnerrus": 65,
    "Maastaveto": 140,
  },
  bias: {
    grindy: 0.1, // hyvin kalibroinut
    varaJitter: 0.3,
    dayQualitySigma: 0.13,
    velocityRep1Mean: { foundation: 0.92, strength: 0.82, intensity: 0.72, peaking: 0.60, speed: 1.02 },
    velocityDeclinePerRep: { foundation: 0.04, strength: 0.055, intensity: 0.075, peaking: 0.095, speed: 0.035 },
    repFailureProb: { foundation: 0.02, strength: 0.04, intensity: 0.10, peaking: 0.18, speed: 0.01 },
  },
  injuries: [],
  hrvBaselineMs: 60,
  hrvVarianceMs: 9,
  mesoConfig: {
    type: "hypertrofia",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: [], // ei tunnettuja K-issueita, mutta sex-modifier testaa H6/H7
  seed: 40000,
};

export default ELITE_FEMALE_HYP_60;
