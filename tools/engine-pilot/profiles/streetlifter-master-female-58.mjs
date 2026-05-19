// streetlifter-master-female-58.mjs
// Master-naisstreetliftaaja, 58 kg, 8 vuoden kokemus, ikä 42.
// Käyttää streetlifting_16w-mesocycleä L7 K-A1/K-A6D-kattavuuslaajennukseen.
//
// Eroaa akselista:
//  - master-tier nainen (eri ikä/sukupuoli/painoluokka)
//  - cfg-arvot naispuolisille streetliftaajille tyypilliset (leuka 30, dippi 35, kyykky 115)
//  - ei grindy-bias (kokenut, kalibroitunut Vx-arvio)
//  - HRV-baseline matalampi (ikä-riippuvuus)
//  - oma seed
//
// Slot-rakenne on streetlifting_16w-templaatin staattinen — K-A1 ja K-A6D
// emittoituvat samalla logiikalla kuin akselilla, jotta polku exerseerataan
// useammalla profiililla (L7 PURKUEHTO).

export const STREETLIFTER_MASTER_FEMALE_58 = {
  id: "streetlifter-master-female-58",
  meta: {
    age: 42,
    sex: "female",
    bodyweightKg: 58,
    heightCm: 165,
    experienceYears: 8,
    level: "advanced",
    sport: "streetlifting",
  },
  prs: {
    "Lisäpainoleuanveto": { weightKg: 30, reps: 1, dateISO: "2025-11-10", loadType: "system" },
    "Lisäpainodippi": { weightKg: 35, reps: 1, dateISO: "2025-11-15", loadType: "system" },
    "Takakyykky": { weightKg: 115, reps: 1, dateISO: "2025-10-20", loadType: "external" },
    "Muscle-up": { weightKg: 0, reps: 2, dateISO: "2025-09-01", loadType: "system" },
  },
  cfgBaselines: {
    "Lisäpainoleuanveto": 30,
    "Lisäpainodippi": 35,
    "Takakyykky": 115,
  },
  bias: {
    grindy: 0.0, // kokenut, ei grindy-overshoot
    varaJitter: 0.35,
    dayQualitySigma: 0.16,
    velocityRep1Mean: {
      foundation: 0.88,
      strength: 0.78,
      intensity: 0.68,
      peaking: 0.58,
      speed: 0.98,
    },
    velocityDeclinePerRep: {
      foundation: 0.045,
      strength: 0.055,
      intensity: 0.075,
      peaking: 0.095,
      speed: 0.035,
    },
    repFailureProb: {
      foundation: 0.02,
      strength: 0.06,
      intensity: 0.13,
      peaking: 0.21,
      speed: 0.01,
    },
  },
  injuries: [],
  hrvBaselineMs: 40, // matalampi, ikä-riippuva
  hrvVarianceMs: 7,
  mesoConfig: {
    type: "streetlifting_16w",
    startDateISO: "2026-01-05",
  },
  knownIssueExpectations: ["K_A1", "K_A6D"], // streetlifting_16w-template tuottaa secondary-roolisia slotteja
  seed: 31415,
};

export default STREETLIFTER_MASTER_FEMALE_58;
