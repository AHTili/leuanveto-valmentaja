// beginner-male-60.mjs
// Aloittelija, mies, 60 kg, 6 kk kokemus. Ei kalibrointi-historiaa.

export const BEGINNER_MALE_60 = {
  id: "beginner-male-60",
  meta: {
    age: 21,
    sex: "male",
    bodyweightKg: 60,
    heightCm: 170,
    experienceYears: 0.5,
    level: "beginner",
    sport: "general_strength",
  },
  prs: {}, // ei PR-historiaa
  cfgBaselines: {}, // ei kalibrointia
  bias: {
    grindy: -0.2, // aloittelija aliarvioi varaa (varovainen)
    varaJitter: 1.2, // korkea jitter — vara-arviot epävakaita
    dayQualitySigma: 0.22,
    velocityRep1Mean: { foundation: 0.95, strength: 0.85, intensity: 0.75, peaking: 0.65, speed: 1.05 },
    velocityDeclinePerRep: { foundation: 0.05, strength: 0.06, intensity: 0.08, peaking: 0.10, speed: 0.04 },
    repFailureProb: { foundation: 0.05, strength: 0.10, intensity: 0.18, peaking: 0.25, speed: 0.03 },
  },
  injuries: [],
  hrvBaselineMs: 55,
  hrvVarianceMs: 12,
  mesoConfig: {
    type: "default",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: ["K1"], // RTF-model pending — UI ei kommunikoi
  seed: 30000,
};

export default BEGINNER_MALE_60;
