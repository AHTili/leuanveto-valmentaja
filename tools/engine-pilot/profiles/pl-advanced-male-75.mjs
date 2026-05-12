// pl-advanced-male-75.mjs
// Voimanostaja, advanced-tier, mies, 75 kg. Klassinen Wendler 5/3/1 -taustainen.

export const PL_ADVANCED_MALE_75 = {
  id: "pl-advanced-male-75",
  meta: {
    age: 28,
    sex: "male",
    bodyweightKg: 75,
    heightCm: 178,
    experienceYears: 8,
    level: "advanced",
    sport: "powerlifting",
  },
  prs: {
    "Penkkipunnerrus": { weightKg: 140, reps: 1, dateISO: "2025-11-01", loadType: "external" },
    "Takakyykky": { weightKg: 180, reps: 1, dateISO: "2025-10-15", loadType: "external" },
    "Maastaveto": { weightKg: 200, reps: 1, dateISO: "2025-10-20", loadType: "external" },
  },
  cfgBaselines: {
    "Penkkipunnerrus": 140,
    "Takakyykky": 180,
    "Maastaveto": 200,
  },
  bias: {
    grindy: 0.3,
    varaJitter: 0.5,
    dayQualitySigma: 0.18,
    velocityRep1Mean: { foundation: 0.85, strength: 0.75, intensity: 0.68, peaking: 0.55, speed: 0.95 },
    velocityDeclinePerRep: { foundation: 0.045, strength: 0.06, intensity: 0.08, peaking: 0.10, speed: 0.04 },
    repFailureProb: { foundation: 0.03, strength: 0.07, intensity: 0.15, peaking: 0.22, speed: 0.02 },
  },
  injuries: [],
  hrvBaselineMs: 50,
  hrvVarianceMs: 10,
  mesoConfig: {
    type: "wendler531",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: ["K3"], // top-set+backoff -tyylinen ohjelma → K3 backoff-velocityStop
  seed: 22222,
};

export default PL_ADVANCED_MALE_75;
