// akseli-elite-streetlifter.mjs
// Akselin atletti-profiili: streetlifting elite, grindy-bias, 15+ vuoden kokemus.
//
// Bias-arvot pohjautuvat user-memory:in (CLAUDE.md):
//  - Lisäpainoleuka 85 kg, Lisäpainodippi 95 kg, Takakyykky 185 kg (cfg-arvot 2026-05-08)
//  - Grindy-bias: raportoi Vx optimistisemmin kuin todellisuus
//  - Kalibroitunut Vara, Enode-velocity, Garmin HRV
//
// VBT-velocityRep1Mean ja declinePerRep -arvot pohjaa Sánchez-Moreno 2017
// VBT-tutkimukseen + Akselin 2025 voimanostoblokin todelliseen datasta
// (engine.js streetliftingConfig.cfgDriftHistory).

export const AKSELI_ELITE = {
  id: "akseli-elite-streetlifter",
  meta: {
    age: 34,
    sex: "male",
    bodyweightKg: 91,
    heightCm: 178,
    experienceYears: 15,
    level: "elite",
    sport: "streetlifting",
  },
  prs: {
    "Lisäpainoleuanveto": { weightKg: 85, reps: 1, dateISO: "2025-11-10", loadType: "system" },
    "Lisäpainodippi": { weightKg: 95, reps: 1, dateISO: "2025-11-15", loadType: "system" },
    "Takakyykky": { weightKg: 185, reps: 1, dateISO: "2025-10-20", loadType: "external" },
    "Muscle-up": { weightKg: 0, reps: 5, dateISO: "2025-09-01", loadType: "system" },
  },
  cfgBaselines: {
    // Engine.js streetliftingConfig.cfgBaselines (akselin asetusten mukaan)
    "Lisäpainoleuanveto": 85,
    "Lisäpainodippi": 95,
    "Takakyykky": 185,
  },
  bias: {
    grindy: 0.7, // Systemaattinen +0.7 Vx-overshoot (raportoi V3 kun todellinen V2)
    varaJitter: 0.4,
    dayQualitySigma: 0.15,
    velocityRep1Mean: {
      foundation: 0.90,
      strength: 0.80,
      intensity: 0.70,
      peaking: 0.60,
      speed: 1.00,
    },
    velocityDeclinePerRep: {
      foundation: 0.04,
      strength: 0.05,
      intensity: 0.07,
      peaking: 0.09,
      speed: 0.03,
    },
    repFailureProb: {
      foundation: 0.02,
      strength: 0.05,
      intensity: 0.12,
      peaking: 0.20,
      speed: 0.01,
    },
  },
  injuries: [],
  hrvBaselineMs: 45,
  hrvVarianceMs: 8,
  mesoConfig: {
    type: "streetlifting_16w",
    startDateISO: "2026-01-05", // monday
  },
  knownIssueExpectations: ["K2", "K3"], // grindy-bias amplifies K2; backoff-slots trigger K3
  seed: 12345,
};

export default AKSELI_ELITE;
