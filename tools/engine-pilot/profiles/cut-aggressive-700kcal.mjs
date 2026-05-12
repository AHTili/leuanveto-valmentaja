// cut-aggressive-700kcal.mjs
// Aggressiivinen kalorivaje (700 kcal/päivä), volyymileikkaus. Testaa recovery + sex-modifier-rajan.

export const CUT_AGGRESSIVE = {
  id: "cut-aggressive-700kcal",
  meta: {
    age: 30,
    sex: "male",
    bodyweightKg: 78,
    heightCm: 175,
    experienceYears: 4,
    level: "intermediate",
    sport: "general_strength",
    cuttingDeficitKcal: 700,
  },
  prs: {
    "Takakyykky": { weightKg: 160, reps: 1, dateISO: "2025-12-01", loadType: "external" },
    "Penkkipunnerrus": { weightKg: 120, reps: 1, dateISO: "2025-12-10", loadType: "external" },
    "Maastaveto": { weightKg: 180, reps: 1, dateISO: "2025-12-15", loadType: "external" },
  },
  cfgBaselines: {
    "Takakyykky": 160,
    "Penkkipunnerrus": 120,
    "Maastaveto": 180,
  },
  bias: {
    grindy: 0.3,
    varaJitter: 0.6,
    dayQualitySigma: 0.30, // huono palautuminen → korkea variability
    velocityRep1Mean: { foundation: 0.86, strength: 0.74, intensity: 0.64, peaking: 0.52, speed: 0.94 },
    velocityDeclinePerRep: { foundation: 0.055, strength: 0.07, intensity: 0.09, peaking: 0.11, speed: 0.045 },
    repFailureProb: { foundation: 0.07, strength: 0.13, intensity: 0.22, peaking: 0.30, speed: 0.04 },
  },
  injuries: [],
  hrvBaselineMs: 42,
  hrvVarianceMs: 14,
  mesoConfig: {
    type: "default",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: [], // testaa H8 cut-threshold 500 kcal — 700 ylittää, recovery="heikko"
  seed: 60000,
};

export default CUT_AGGRESSIVE;
