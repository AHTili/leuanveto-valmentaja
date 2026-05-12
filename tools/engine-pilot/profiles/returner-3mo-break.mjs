// returner-3mo-break.mjs
// 3 kuukauden tauon jälkeen palaava atletti (intermediate). Testaa breakAnalysis + detraining.

export const RETURNER_3MO = {
  id: "returner-3mo-break",
  meta: {
    age: 35,
    sex: "male",
    bodyweightKg: 80,
    heightCm: 180,
    experienceYears: 5,
    level: "intermediate",
    sport: "general_strength",
  },
  prs: {
    "Takakyykky": { weightKg: 140, reps: 1, dateISO: "2025-08-01", loadType: "external" }, // 3 kk vanha
    "Penkkipunnerrus": { weightKg: 100, reps: 1, dateISO: "2025-08-05", loadType: "external" },
  },
  cfgBaselines: {
    "Takakyykky": 140,
    "Penkkipunnerrus": 100,
  },
  bias: {
    grindy: 0.4, // ylimitoittaa palatessaan
    varaJitter: 0.7,
    dayQualitySigma: 0.20,
    velocityRep1Mean: { foundation: 0.88, strength: 0.78, intensity: 0.68, peaking: 0.55, speed: 0.95 },
    velocityDeclinePerRep: { foundation: 0.05, strength: 0.065, intensity: 0.085, peaking: 0.10, speed: 0.04 },
    repFailureProb: { foundation: 0.04, strength: 0.09, intensity: 0.16, peaking: 0.23, speed: 0.02 },
  },
  injuries: [],
  hrvBaselineMs: 48,
  hrvVarianceMs: 12,
  mesoConfig: {
    type: "default",
    startDateISO: "2026-01-05",
    lastSessionDateISO: "2025-10-05", // 92 päivää ennen
  },
  knownIssueExpectations: ["K1"], // RTF-model pending detraining:n jälkeen
  seed: 50000,
};

export default RETURNER_3MO;
