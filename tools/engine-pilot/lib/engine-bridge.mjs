// engine-bridge.mjs
// Tuo engine.js + data.js Node-ympäristöön headless-ajoja varten.
// data.js käyttää `"indexedDB" in self` -tarkistusta → tarvitsemme self-shimin.
// dbPut/dbGet/dbGetAll -wrapperit palauttavat fail-safe-arvot kun _db === null,
// joten emme tarvitse fake-IDB:tä — käytämme dryRun-ctx-injektiota recommend():ssa.

if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}

// Node 20+:ssa indexedDB on undefined → data.js openDB resolvoi null
// → kaikki dbPut/dbGet -wrapperit palauttavat null/false/[].
// Tämä on tarkoituksellinen: ohitamme persistence-kerroksen täysin.

import * as Engine from "../../../engine.js";
import * as Data from "../../../data.js";

export { Engine, Data };

// Convenience re-exports — kriittisimmät funktiot harness:ille
export const {
  recommend,
  recommendPeaking,
  e1rmSystem,
  e1rmExternal,
  e1rmAccessory,
  combineReadiness,
  generateBlockTuningPackage,
  generateGenericBlockTuningPackage,
  computeProgressionTarget,
  velocityReadiness,
  hrvReadiness,
  varaReadiness,
  upperBodyMpvReadiness,
  classifyReadinessZ,
  computeBaseline,
  // H-010 P1c (A1): per-päivä-primary-resoluutio pilot-buildCtx:lle (sama kuin recommend)
  getTodayPlan,
  PROGRESSION_CONFIG,
  DAY_TYPE_MULTIPLIERS,
  DAY_TYPE_SET_RECIPES,
} = Engine;

export const {
  STORES,
  SCHEMA_VERSION,
  DB_NAME,
  RAMP_DEFAULT,
  RAMP_BARBELL,
  createDefaultMesocycle,
  createPeakingMesocycle,
  createHypertrofiaMesocycle,
  createMaksimivoimaMesocycle,
  createEksenterinenMesocycle,
  createDUPMesocycle,
  createSiirtymaMesocycle,
  createPalautuminenMesocycle,
  createStreetlifting16WMesocycle,
  createIntensifikaatioMesocycle,
  createWendler531Mesocycle,
  createTopSetBackoffMesocycle,
  createMadcow5x5Mesocycle,
  createWestsideConjugateMesocycle,
  createGZCLMesocycle,
  createSheikoDerivedMesocycle,
  PRESET_MOVEMENTS,
  ACCESSORY_SLOT_CATALOG,
  CATEGORIES,
  uid,
  nowISO,
  todayISO,
} = Data;

// Tarkistus: kaikki kriittiset funktiot ovat saatavilla
const required = { recommend, e1rmSystem, combineReadiness, createDefaultMesocycle };
for (const [name, fn] of Object.entries(required)) {
  if (typeof fn !== "function") {
    throw new Error(`engine-bridge: kriittinen export puuttuu tai ei ole funktio: ${name} (sai ${typeof fn})`);
  }
}
