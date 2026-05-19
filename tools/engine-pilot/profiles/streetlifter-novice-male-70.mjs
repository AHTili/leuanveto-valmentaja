// streetlifter-novice-male-70.mjs
// Uudenpuoleinen streetliftaaja, mies, 70 kg, 2 vuoden kokemus.
// Käyttää streetlifting_16w-mesocycleä L7 K-A1/K-A6D-kattavuuslaajennukseen.
//
// Eroaa akselista:
//  - novice-taso (cfg-arvot huomattavasti matalammat: leuka 30 kg, dippi 40, kyykky 110)
//  - ei grindy-bias (objektiivinen Vx-raportointi)
//  - velocityRep1Mean ja declinePerRep konservatiivisemmat
//  - oma seed
//
// Slot-rakenne on streetlifting_16w-templaatin staattinen — K-A1 ja K-A6D
// emittoituvat samalla logiikalla kuin akselilla, jotta polku exerseerataan
// useammalla profiililla (L7 PURKUEHTO).

export const STREETLIFTER_NOVICE_MALE_70 = {
  id: "streetlifter-novice-male-70",
  meta: {
    age: 24,
    sex: "male",
    bodyweightKg: 70,
    heightCm: 175,
    experienceYears: 2,
    level: "novice",
    sport: "streetlifting",
  },
  prs: {
    "Lisäpainoleuanveto": { weightKg: 30, reps: 1, dateISO: "2025-11-10", loadType: "system" },
    "Lisäpainodippi": { weightKg: 40, reps: 1, dateISO: "2025-11-15", loadType: "system" },
    "Takakyykky": { weightKg: 110, reps: 1, dateISO: "2025-10-20", loadType: "external" },
    "Muscle-up": { weightKg: 0, reps: 3, dateISO: "2025-09-01", loadType: "system" },
  },
  cfgBaselines: {
    "Lisäpainoleuanveto": 30,
    "Lisäpainodippi": 40,
    "Takakyykky": 110,
  },
  bias: {
    grindy: 0.0, // novice, ei grindy-overshoot — objektiivinen
    varaJitter: 0.6, // korkeampi (epävarmuus Vx-tasoissa)
    dayQualitySigma: 0.20,
    velocityRep1Mean: {
      foundation: 0.85,
      strength: 0.72,
      intensity: 0.62,
      peaking: 0.52,
      speed: 0.95,
    },
    velocityDeclinePerRep: {
      foundation: 0.05,
      strength: 0.06,
      intensity: 0.08,
      peaking: 0.10,
      speed: 0.035,
    },
    repFailureProb: {
      foundation: 0.03,
      strength: 0.07,
      intensity: 0.15,
      peaking: 0.25,
      speed: 0.02,
    },
  },
  injuries: [],
  hrvBaselineMs: 55,
  hrvVarianceMs: 9,
  mesoConfig: {
    type: "streetlifting_16w",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: ["K_A1", "K_A6D"], // streetlifting_16w-template tuottaa secondary-roolisia slotteja
  seed: 67890,
};

export default STREETLIFTER_NOVICE_MALE_70;
