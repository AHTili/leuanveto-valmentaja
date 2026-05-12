// shoulder-limit-no-ohp.mjs
// Olkapää-rajoitus: OHP kielletty mutta leuka/dippi OK. Testaa injury-rajoitukset.

export const SHOULDER_LIMIT = {
  id: "shoulder-limit-no-ohp",
  meta: {
    age: 32,
    sex: "male",
    bodyweightKg: 82,
    heightCm: 176,
    experienceYears: 6,
    level: "intermediate",
    sport: "general_strength",
  },
  prs: {
    "Takakyykky": { weightKg: 150, reps: 1, dateISO: "2025-11-15", loadType: "external" },
    "Penkkipunnerrus": { weightKg: 105, reps: 1, dateISO: "2025-11-20", loadType: "external" },
    "Maastaveto": { weightKg: 170, reps: 1, dateISO: "2025-11-25", loadType: "external" },
  },
  cfgBaselines: {
    "Takakyykky": 150,
    "Penkkipunnerrus": 105,
    "Maastaveto": 170,
  },
  bias: {
    grindy: 0.2,
    varaJitter: 0.5,
    dayQualitySigma: 0.17,
    velocityRep1Mean: { foundation: 0.88, strength: 0.78, intensity: 0.68, peaking: 0.56, speed: 0.96 },
    velocityDeclinePerRep: { foundation: 0.048, strength: 0.06, intensity: 0.078, peaking: 0.098, speed: 0.04 },
    repFailureProb: { foundation: 0.03, strength: 0.06, intensity: 0.14, peaking: 0.20, speed: 0.02 },
  },
  injuries: [{ area: "olkapää", type: "modified", note: "OHP / Pystypunnerrus kielletty" }],
  avoidedExercises: ["Pystypunnerrus", "Overhead press"],
  hrvBaselineMs: 50,
  hrvVarianceMs: 10,
  mesoConfig: {
    type: "default",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: [], // tarkistus: engine pitää respektoida injury-rajoituksia
  seed: 70000,
};

export default SHOULDER_LIMIT;
