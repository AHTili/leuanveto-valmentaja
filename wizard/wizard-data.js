// wizard-data.js — Wizard 3.3 IndexedDB-skeema + CRUD + migraatio v2/v3.2 → v3.3
// LeVe AI v4.38.9+ — Track B Vaihe 1A + 1D
//
// Suunnitteluvalinta: erillinen DB ("LeVeWizardDB") päätietokannasta
// "LeVeCoachDB" — wizard-konfiguraatio on uusi rakenne (v3.3 30 kysymystä)
// joka ei kosketa olemassaolevaa harjoituspuolta (sessions, sets, mesocycles).
// Versionointi seuraa wizard-skeeman omaa elinkaarta (v1: alkuperäinen 5 kys.,
// v2: laajennettu 15 kys., v3.2: 25 kys. tieteellisesti verifioitu,
// v3.3: 30 kys. + eliittitason kattavuus).
//
// IDB-versionointi noudattaa data.js:n vakiintunutta vanilla-IDB-tyyliä
// (openDB → onupgradeneeded → CRUD-helpers). Dexie.js -kirjastoa EI tuoda —
// CLAUDE.md "Vanilla JS, no npm/build" -arkkitehtuurirajaus pidetään.
//
// Schema-version-mapping (IDB-versiot vs wizard-skeema-versiot):
//   IDB v1 → wizard schema v1   (alkuperäinen, 5 kysymystä, pre-Track-A)
//   IDB v2 → wizard schema v2   (15 kysymystä, v3 spec)
//   IDB v3 → wizard schema v3.2 (25 kysymystä, Plews-verifioitu Track A)
//   IDB v4 → wizard schema v3.3 (30 kysymystä, 1D — PR:t + kisapäivä +
//             energiabudjetti + aiempi blokki + conditional skipping)
//
// Tämä tiedosto exporttaa initWizardDB, saveWizardConfig, getActiveWizardConfig,
// listWizardConfigs, deleteWizardConfig, migrateWizardV2ToV32, migrateWizardV32ToV33.

import {
  WIZARD_SCHEMA_VERSION,
  WIZARD_QUESTIONS,
  WIZARD_STAGES,
  SCHEMA_INVARIANTS,
} from "./wizard-schema.js";

export const WIZARD_DB_NAME = "LeVeWizardDB";
export const WIZARD_DB_VERSION = 4; // 1D: IDB v3 (3.2) → IDB v4 (3.3)

export const WIZARD_STORES = {
  configs:       "wizardConfigs",       // tallenetut WizardConfig-oliot
  draftSessions: "wizardDraftSessions", // keskeneräiset wizard-istunnot (autosave)
  meta:          "wizardMeta",          // key-value (activeWizardId, lastMigratedFromVersion jne.)
};

// ── DB-yhteyden hallinta ──
let _wizardDb = null;

// Pre-migration backup: dumpaa olemassaolevan wizard-DB:n sisällön localStorageen
// ennen IDB-version bumppausta. Sama design kuin data.js createPreMigrationBackupIfNeeded
// — pienempi pinta, mutta sama periaate: skeeman muutos ei saa vaarantaa käyttäjän dataa.
async function createWizardPreMigrationBackup() {
  if (!("indexedDB" in self) || typeof localStorage === "undefined") return;

  let currentVersion = 0;
  let storeNames = [];
  try {
    const db = await new Promise((resolve) => {
      const req = indexedDB.open(WIZARD_DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
    if (!db) return;
    currentVersion = db.version;
    storeNames = Array.from(db.objectStoreNames);
    db.close();
  } catch (e) {
    console.warn("[wizard-data] pre-migration check failed:", e);
    return;
  }

  if (currentVersion >= WIZARD_DB_VERSION) return;
  if (storeNames.length === 0) return; // ensikertainen avaus, ei dataa varjeltavaa

  const backupKey = `leve-wizard-backup-premigration-v${currentVersion}-to-v${WIZARD_DB_VERSION}`;
  if (localStorage.getItem(backupKey)) return;

  const dump = {};
  try {
    const db = await new Promise((resolve) => {
      const req = indexedDB.open(WIZARD_DB_NAME, currentVersion);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => resolve(null);
    });
    if (!db) return;
    for (const storeName of storeNames) {
      dump[storeName] = await new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, "readonly");
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror   = () => resolve([]);
        } catch { resolve([]); }
      });
    }
    db.close();
  } catch (e) {
    console.error("[wizard-data] pre-migration dump failed:", e);
    return;
  }

  try {
    const payload = {
      backupType: "wizard-pre-migration",
      fromVersion: currentVersion,
      toVersion: WIZARD_DB_VERSION,
      schemaVersion: WIZARD_SCHEMA_VERSION,
      createdAtISO: new Date().toISOString(),
      data: dump,
    };
    localStorage.setItem(backupKey, JSON.stringify(payload));
    console.log(`[wizard-data] ✓ pre-migration backup: ${backupKey}`);
  } catch (e) {
    console.error("[wizard-data] backup failed (quota?):", e);
  }
}

export function initWizardDB() {
  return new Promise(async (resolve) => {
    if (!("indexedDB" in self)) { console.warn("IndexedDB ei käytössä"); resolve(null); return; }

    await createWizardPreMigrationBackup();

    const req = indexedDB.open(WIZARD_DB_NAME, WIZARD_DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(WIZARD_STORES.configs)) {
        const s = db.createObjectStore(WIZARD_STORES.configs, { keyPath: "wizardId" });
        s.createIndex("createdAtISO",   "createdAtISO",   { unique: false });
        s.createIndex("schemaVersion",  "schemaVersion",  { unique: false });
        s.createIndex("completedAtISO", "completedAtISO", { unique: false });
      }
      if (!db.objectStoreNames.contains(WIZARD_STORES.draftSessions)) {
        const s = db.createObjectStore(WIZARD_STORES.draftSessions, { keyPath: "draftId" });
        s.createIndex("updatedAtISO", "updatedAtISO", { unique: false });
      }
      if (!db.objectStoreNames.contains(WIZARD_STORES.meta)) {
        db.createObjectStore(WIZARD_STORES.meta, { keyPath: "key" });
      }

      // Migraatio-hookit IDB-versioiden välillä:
      // - oldVersion 0 → uusi DB, ei migraatiota
      // - oldVersion 1 tai 2 → v3.2 -kenttäkartoitus tehdään LAZILY ensimmäisessä
      //   lukuoperaatiossa (getActiveWizardConfig), koska upgradeneededin sisällä
      //   kursorit + asynkroniset kutsut ovat hauraita. Tämä koodipolku tallentaa
      //   vain `lastMigratedFromVersion` -lipun metaan.
      if (oldVersion > 0 && oldVersion < WIZARD_DB_VERSION) {
        try {
          const tx = event.target.transaction;
          const metaStore = tx.objectStore(WIZARD_STORES.meta);
          metaStore.put({
            key: "pendingMigration",
            fromIdbVersion: oldVersion,
            toIdbVersion: WIZARD_DB_VERSION,
            toSchemaVersion: WIZARD_SCHEMA_VERSION,
            queuedAtISO: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("[wizard-data] migration flag write failed:", e);
        }
      }
    };
    req.onsuccess = async () => {
      _wizardDb = req.result;
      // Suorita pending-migraatio lazy-tilassa onnistuneen avauksen jälkeen
      await runPendingWizardMigration();
      resolve(_wizardDb);
    };
    req.onerror = () => { console.error("Wizard IDB open failed:", req.error); resolve(null); };
  });
}

// ── CRUD-perusapurit ──
function txPut(storeName, obj) {
  return new Promise((resolve) => {
    if (!_wizardDb) return resolve(false);
    try {
      const tx = _wizardDb.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(obj);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    } catch { resolve(false); }
  });
}
function txGet(storeName, key) {
  return new Promise((resolve) => {
    if (!_wizardDb) return resolve(null);
    try {
      const tx = _wizardDb.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    } catch { resolve(null); }
  });
}
function txGetAll(storeName) {
  return new Promise((resolve) => {
    if (!_wizardDb) return resolve([]);
    try {
      const tx = _wizardDb.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => resolve([]);
    } catch { resolve([]); }
  });
}
function txDelete(storeName, key) {
  return new Promise((resolve) => {
    if (!_wizardDb) return resolve(false);
    try {
      const tx = _wizardDb.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    } catch { resolve(false); }
  });
}

// ── WizardConfig CRUD ──
function uid() { return `wiz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

export function createEmptyWizardConfig() {
  return {
    wizardId: uid(),
    schemaVersion: WIZARD_SCHEMA_VERSION,
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
    completedAtISO: null,
    migratedFrom: null,
    answers: {}, // { [questionId]: value }
  };
}

export async function saveWizardConfig(config) {
  if (!config || !config.wizardId) return false;
  config.updatedAtISO = new Date().toISOString();
  if (!config.schemaVersion) config.schemaVersion = WIZARD_SCHEMA_VERSION;
  return await txPut(WIZARD_STORES.configs, config);
}

export async function getWizardConfig(wizardId) {
  return await txGet(WIZARD_STORES.configs, wizardId);
}

export async function listWizardConfigs() {
  return await txGetAll(WIZARD_STORES.configs);
}

export async function deleteWizardConfig(wizardId) {
  return await txDelete(WIZARD_STORES.configs, wizardId);
}

export async function getActiveWizardConfig() {
  const active = await txGet(WIZARD_STORES.meta, "activeWizardId");
  if (!active || !active.value) return null;
  return await getWizardConfig(active.value);
}

export async function setActiveWizardConfig(wizardId) {
  return await txPut(WIZARD_STORES.meta, { key: "activeWizardId", value: wizardId });
}

// ── Validointi ──
// Tarkistaa että answers-mappi täyttää vaaditut kysymykset ja range-rajat.
// Palauttaa { valid: bool, errors: [{ questionId, reason }] }.
// EI hardkoodaa muita kuin skeeman omia raja-arvoja.
//
// 1D laajentaa 1A:n validointia:
//   - requiredIf.isSet (true|false) — uusi ehto: "vaadittu kun refVal on
//     määritelty / ei määritelty". Selkeämpi kuin notEquals: undefined.
//   - pr-list -tyyppi: array of objects, jokainen item validoidaan
//     itemSchema:n mukaan + conditional fields loadType:n perusteella.
//   - date -tyyppi: ISO-päivämäärä-string + range minDaysFromNow / maxDaysFromNow.
//
// HUOM: 1D:n composite-sub-field-validointi (q30 deficitKcal range jne.) on
// UI-tasolla wizard-core.js:n validateCurrentStep:ssä (sama pattern kuin 1C:n
// q16/q24). Tämä validateWizardConfig hoitaa vain perus-validoinnit
// (required, range, radio-options, pr-list, date) — UI-puoli täydentää.
export function validateWizardConfig(config) {
  const errors = [];
  if (!config || typeof config.answers !== "object") {
    return { valid: false, errors: [{ questionId: null, reason: "Ei vastauksia" }] };
  }
  for (const q of WIZARD_QUESTIONS) {
    const v = config.answers[q.id];
    if (q.required && isEmpty(v)) {
      // requiredIf-poikkeus: kysymys vaaditaan vain jos toinen vastaus täyttää ehdon
      if (q.requiredIf) {
        const refVal = config.answers[q.requiredIf.questionId];
        if (q.requiredIf.notEquals !== undefined && refVal === q.requiredIf.notEquals) continue;
        if (q.requiredIf.equals    !== undefined && refVal !== q.requiredIf.equals)    continue;
        // 1D uusi: isSet-ehto
        if (q.requiredIf.isSet === true  && isEmpty(refVal)) continue;
        if (q.requiredIf.isSet === false && !isEmpty(refVal)) continue;
      }
      errors.push({ questionId: q.id, reason: "Pakollinen kenttä puuttuu" });
      continue;
    }
    if (v === undefined || v === null) continue;
    if (q.type === "number" && q.range) {
      const num = Number(v);
      if (Number.isNaN(num))               errors.push({ questionId: q.id, reason: "Ei numero" });
      else if (num < q.range.min)          errors.push({ questionId: q.id, reason: `Alle minimiä (${q.range.min})` });
      else if (num > q.range.max)          errors.push({ questionId: q.id, reason: `Yli maksimia (${q.range.max})` });
    }
    if (q.type === "radio" && q.options) {
      if (!q.options.some(o => o.value === v)) errors.push({ questionId: q.id, reason: "Tuntematon vaihtoehto" });
    }
    // 1D: date-tyyppi
    if (q.type === "date" && typeof v === "string" && v.length > 0) {
      const dateErr = validateDateValue(v, q.range);
      if (dateErr) errors.push({ questionId: q.id, reason: dateErr });
    }
    // 1D: pr-list-tyyppi — array of objects
    if (q.type === "pr-list" && Array.isArray(v)) {
      const maxItems = (q.uiHints && q.uiHints.maxItems) || 5;
      if (v.length > maxItems) {
        errors.push({ questionId: q.id, reason: `Liian monta PR:ää (max ${maxItems})` });
      }
      v.forEach((item, idx) => {
        const itemErrs = validatePrListItem(item, q.itemSchema || {});
        for (const reason of itemErrs) {
          errors.push({ questionId: q.id, reason: `PR #${idx + 1}: ${reason}` });
        }
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

// Tyhjyyden tarkistus joka kattaa: undefined, null, "", [] (tyhjä lista) ja
// {} (tyhjä objekti). Tarvitaan isSet-ehdolle koska q27_targetDate voi olla
// joko undefined (ei annettu) tai "2026-08-15" (annettu) — ei null/empty.
function isEmpty(v) {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === "object" && Object.keys(v).length === 0) return true;
  return false;
}

// Date-string validointi. v on ISO-päivä "YYYY-MM-DD" (HTML5 date-input
// palauttaa tämän muodon). range voi sisältää minDaysFromNow/maxDaysFromNow.
function validateDateValue(v, range) {
  // ISO YYYY-MM-DD regex (perusrakenne; tarkka validointi Date-konstruktorilla)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Päivämäärä-muoto: YYYY-MM-DD";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Virheellinen päivämäärä";
  if (range && (range.minDaysFromNow !== undefined || range.maxDaysFromNow !== undefined)) {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // päivän alkuun, jotta minDaysFromNow lasketaan päivinä
    const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (range.minDaysFromNow !== undefined && diffDays < range.minDaysFromNow) {
      return `Päivämäärän pitää olla vähintään ${range.minDaysFromNow} päivän päässä`;
    }
    if (range.maxDaysFromNow !== undefined && diffDays > range.maxDaysFromNow) {
      return `Päivämäärän pitää olla enintään ${range.maxDaysFromNow} päivän päässä`;
    }
  }
  return null;
}

// PR-list-itemin validointi. itemSchema kuvaa kentät ja niiden range:t.
// Conditional fields: weightKg+reps vaaditaan kun loadType in [external, system];
// holdSeconds vaaditaan kun loadType = isometric_hold. addedWeightKg on aina
// valinnainen. dateISO on valinnainen kaikille tyypeille.
//
// Palauttaa array virhe-reason-stringeistä (tyhjä jos validi).
function validatePrListItem(item, itemSchema) {
  const errs = [];
  if (!item || typeof item !== "object") {
    errs.push("rakenne virheellinen");
    return errs;
  }
  const loadType = item.loadType;
  if (!["external", "system", "isometric_hold"].includes(loadType)) {
    errs.push("Kuorma-tyyppi puuttuu tai virheellinen");
    return errs;
  }
  // movementId voi olla joko pää-app-id (mov_xxx), fallback-id (fb_xxx)
  // tai custom-nimen kanssa fb_custom_other. Vaaditaan että string on annettu.
  if (typeof item.movementId !== "string" || item.movementId.length === 0) {
    errs.push("Liike puuttuu");
  }
  // Conditional rangevalidointi loadType:n mukaan
  if (loadType === "external" || loadType === "system") {
    if (item.weightKg === undefined || item.weightKg === null || item.weightKg === "") {
      errs.push("Paino (kg) puuttuu");
    } else {
      const rangeW = itemSchema.weightKg && itemSchema.weightKg.range;
      const numErr = validateNumericRange(item.weightKg, rangeW, "Paino");
      if (numErr) errs.push(numErr);
    }
    if (item.reps === undefined || item.reps === null || item.reps === "") {
      errs.push("Toistot puuttuvat");
    } else {
      const rangeR = itemSchema.reps && itemSchema.reps.range;
      const numErr = validateNumericRange(item.reps, rangeR, "Toistot");
      if (numErr) errs.push(numErr);
    }
  } else if (loadType === "isometric_hold") {
    if (item.holdSeconds === undefined || item.holdSeconds === null || item.holdSeconds === "") {
      errs.push("Pidon kesto (s) puuttuu");
    } else {
      const rangeH = itemSchema.holdSeconds && itemSchema.holdSeconds.range;
      const numErr = validateNumericRange(item.holdSeconds, rangeH, "Pidon kesto");
      if (numErr) errs.push(numErr);
    }
    // addedWeightKg valinnainen — vain range jos annettu
    if (item.addedWeightKg !== undefined && item.addedWeightKg !== null && item.addedWeightKg !== "") {
      const rangeA = itemSchema.addedWeightKg && itemSchema.addedWeightKg.range;
      const numErr = validateNumericRange(item.addedWeightKg, rangeA, "Lisäpaino");
      if (numErr) errs.push(numErr);
    }
  }
  // dateISO valinnainen, mutta jos annettu, muoto validoidaan
  if (item.dateISO !== undefined && item.dateISO !== null && item.dateISO !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.dateISO)) {
      errs.push("Päivämäärän muoto: YYYY-MM-DD");
    } else if (Number.isNaN(new Date(item.dateISO).getTime())) {
      errs.push("Virheellinen päivämäärä");
    }
  }
  return errs;
}

function validateNumericRange(v, range, fieldName) {
  const num = Number(v);
  if (Number.isNaN(num)) return `${fieldName}: ei numero`;
  if (range) {
    if (range.min !== undefined && num < range.min) return `${fieldName}: alle minimiä (${range.min})`;
    if (range.max !== undefined && num > range.max) return `${fieldName}: yli maksimia (${range.max})`;
  }
  return null;
}

// ── Migraatio v2 → v3.2 ──
// Vanha v2-formaatti (oletettu rakenne 5–15 kysymystä):
//   { sex, age, weight, experienceLevel, primaryGoal }
// Tämä funktio mappaa tunnetut kentät v3.2:n answers-rakenteeseen kysymys-ID:ihin.
// Tuntemattomat / puuttuvat kentät jäävät tyhjäksi → käyttäjä täydentää wizardin.
// Migraatio tagaa `migratedFrom: "v2"` jotta UI voi näyttää "Täydennä uudet kysymykset".
export function migrateWizardV2ToV32(v2Config) {
  if (!v2Config || typeof v2Config !== "object") return null;
  const fresh = createEmptyWizardConfig();
  fresh.migratedFrom = "v2";
  fresh.answers = {};

  // 1:1-mappaukset v2 → v3.2 (vain varmasti tunnetut kentät)
  if (typeof v2Config.age           === "number") fresh.answers.q01_age    = v2Config.age;
  if (typeof v2Config.sex           === "string") fresh.answers.q02_sex    = mapLegacySex(v2Config.sex);
  if (typeof v2Config.weight        === "number") fresh.answers.q03_weight = v2Config.weight;
  if (typeof v2Config.height        === "number") fresh.answers.q04_height = v2Config.height;
  if (typeof v2Config.bodyFatPct    === "number") fresh.answers.q05_bodyfat = v2Config.bodyFatPct;
  if (typeof v2Config.yearsTraining === "number") fresh.answers.q06_yearsTraining = v2Config.yearsTraining;
  if (typeof v2Config.experienceLevel === "string") fresh.answers.q08_selfLevel  = mapLegacyLevel(v2Config.experienceLevel);
  if (typeof v2Config.sport          === "string") fresh.answers.q09_sport       = mapLegacySport(v2Config.sport);
  if (typeof v2Config.primaryGoal    === "string") fresh.answers.q12_primaryGoal = mapLegacyGoal(v2Config.primaryGoal);
  if (typeof v2Config.daysPerWeek    === "number") {
    fresh.answers.q24_frequency = {
      daysPerWeek: v2Config.daysPerWeek,
      sessionLengthMinutes: v2Config.sessionLengthMinutes || 60,
    };
  }
  return fresh;
}

function mapLegacySex(s) {
  if (!s) return undefined;
  const k = String(s).toLowerCase();
  if (k === "m" || k === "male" || k === "mies")   return "male";
  if (k === "f" || k === "female" || k === "nainen") return "female";
  return "other";
}
function mapLegacyLevel(s) {
  const k = String(s).toLowerCase();
  if (k.includes("begin") || k.includes("aloitt")) return "beginner";
  if (k.includes("inter") || k.includes("keski"))  return "intermediate";
  if (k.includes("adv")   || k.includes("edist"))  return "advanced";
  if (k.includes("elite") || k.includes("huipp") || k.includes("kilp")) return "elite";
  return "intermediate";
}
function mapLegacySport(s) {
  const k = String(s).toLowerCase();
  if (k.includes("power"))      return "powerlifting";
  if (k.includes("street"))     return "streetlifting";
  if (k.includes("hyper") || k.includes("bb")) return "hypertrophy";
  if (k.includes("sport") || k.includes("urheilu")) return "sport";
  return "hybrid";
}
function mapLegacyGoal(s) {
  const k = String(s).toLowerCase();
  if (k.includes("1rm") || k.includes("maks"))     return "max_1RM";
  if (k.includes("hyper") || k.includes("massa"))  return "hypertrophy";
  if (k.includes("power"))                          return "powerlifting";
  if (k.includes("street"))                         return "streetlifting_with_explosive_components";
  if (k.includes("rfd") || k.includes("räj"))      return "power_output";
  return "general_strength";
}

// ── Migraatio v3.2 → v3.3 (Vaihe 1D) ──
// Yksinkertainen versionkasvatus: 3.2-configin answers säilyy 1:1, vain
// uusien kysymysten (q26-q30) avaimet jäävät undefiniksi. Conditional logiikka
// hoitaa pakottomuuden — esim. q30 vaaditaan vain jos q14 = "yes", joten
// undefined ei laukaise virhettä jos q14 = "no".
//
// schemaVersion-lippu bumpataan ja migratedFrom-kenttä tagataan jotta UI
// (Vaihe 2:n integraatio) voi näyttää "Täydennä uudet kysymykset" -bannerin
// vanhalle käyttäjälle. Vastausten data EI muutu.
export function migrateWizardV32ToV33(v32Config) {
  if (!v32Config || typeof v32Config !== "object") return null;
  const migrated = {
    ...v32Config,
    schemaVersion: WIZARD_SCHEMA_VERSION,
    migratedFrom: v32Config.migratedFrom || "v3.2",
    updatedAtISO: new Date().toISOString(),
    answers: { ...(v32Config.answers || {}) },
  };
  return migrated;
}

// ── Pending-migraation suoritus (lazy onnistuneen DB-avauksen jälkeen) ──
async function runPendingWizardMigration() {
  const pending = await txGet(WIZARD_STORES.meta, "pendingMigration");
  if (!pending) return;

  const all = await listWizardConfigs();
  let migratedCount = 0;
  for (const cfg of all) {
    if (cfg.schemaVersion === WIZARD_SCHEMA_VERSION) continue;
    // 1D: ketju-migraatio. v2 → v3.2 → v3.3 yhdessä putkessa jotta vanha v2
    // ei jää väliin. v3.2 → v3.3 on yksinkertainen kentät-puuttuu-migraatio.
    let migrated = null;
    if (!cfg.schemaVersion || cfg.schemaVersion === "v2" || cfg.schemaVersion === "2") {
      // Vanha v2: ensin v3.2:n vastausrakenteeseen
      migrated = migrateWizardV2ToV32(cfg);
      if (migrated) {
        migrated.wizardId = cfg.wizardId;
        migrated.createdAtISO = cfg.createdAtISO || migrated.createdAtISO;
        // Sitten v3.2 → v3.3 (yksinkertainen versio-bumppi, vastaukset säilyvät)
        migrated = migrateWizardV32ToV33(migrated);
      }
    } else if (cfg.schemaVersion === "3.2") {
      // Suora v3.2 → v3.3
      migrated = migrateWizardV32ToV33(cfg);
    } else {
      // Tuntematon versio — merkitse tarkistettavaksi muttei pakkomuunneta
      cfg.schemaVersion = `${cfg.schemaVersion}-pending`;
      await saveWizardConfig(cfg);
      continue;
    }
    if (migrated) {
      await saveWizardConfig(migrated);
      migratedCount++;
    }
  }
  await txDelete(WIZARD_STORES.meta, "pendingMigration");
  await txPut(WIZARD_STORES.meta, {
    key: "lastMigrationISO",
    value: new Date().toISOString(),
    fromIdbVersion: pending.fromIdbVersion,
    toIdbVersion: pending.toIdbVersion,
    migratedCount,
  });
  if (migratedCount > 0) console.log(`[wizard-data] migrated ${migratedCount} configs to v${WIZARD_SCHEMA_VERSION}`);
}

// ── Smoke-test apuri (Phase 1A + 1D hyväksymiskriteeri) ──
// Palauttaa true jos: 33 kysymystä, 8 vaihetta, IDB v4 avautuu, save/get
// roundtrip toimii, v2→v3.2 + v3.2→v3.3 migraatiot tuottavat valideja objekteja
// ja pr-list-validointi havaitsee virheelliset itemit.
export async function selfTest() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => { report.checks.push({ label, ok: !!cond }); if (!cond) { report.ok = false; report.errors.push(label); } };

  ck("33 kysymystä", WIZARD_QUESTIONS.length === SCHEMA_INVARIANTS.totalQuestions);
  ck("8 vaihetta",   WIZARD_STAGES.length    === SCHEMA_INVARIANTS.totalStages);
  ck("schemaVersion = 3.3", WIZARD_SCHEMA_VERSION === "3.3");
  ck("IDB v4", WIZARD_DB_VERSION === 4);

  await initWizardDB();
  ck("IDB avattu", !!_wizardDb);

  const cfg = createEmptyWizardConfig();
  cfg.answers.q01_age = 30;
  cfg.answers.q02_sex = "male";
  cfg.answers.q03_weight = 91;
  const ok = await saveWizardConfig(cfg);
  ck("save roundtrip", ok);

  const loaded = await getWizardConfig(cfg.wizardId);
  ck("get roundtrip", loaded && loaded.answers.q01_age === 30);

  // v2 → v3.2 migraatio
  const v2 = { age: 35, sex: "Mies", weight: 90, primaryGoal: "streetlifting", daysPerWeek: 4 };
  const migV32 = migrateWizardV2ToV32(v2);
  ck("v2→v3.2 migraatio", migV32 && migV32.migratedFrom === "v2" && migV32.answers.q12_primaryGoal === "streetlifting_with_explosive_components");

  // v3.2 → v3.3 migraatio: vastaukset säilyy, schemaVersion bumppaa
  const v32 = createEmptyWizardConfig();
  v32.schemaVersion = "3.2";
  v32.answers.q01_age = 28;
  v32.answers.q12_primaryGoal = "max_1RM";
  const migV33 = migrateWizardV32ToV33(v32);
  ck("v3.2→v3.3: schemaVersion bumppaa",  migV33 && migV33.schemaVersion === "3.3");
  ck("v3.2→v3.3: vastaukset säilyy",       migV33 && migV33.answers.q01_age === 28 && migV33.answers.q12_primaryGoal === "max_1RM");
  ck("v3.2→v3.3: migratedFrom tagattu",    migV33 && migV33.migratedFrom === "v3.2");

  // pr-list-validointi
  const prCfg = createEmptyWizardConfig();
  prCfg.answers.q26_personalRecords = [
    { movementId: "fb_backsquat", loadType: "external", weightKg: 185, reps: 3 },     // OK
    { movementId: "fb_addedweight_pullup", loadType: "system", weightKg: 85, reps: 1 }, // OK
    { movementId: "fb_front_lever", loadType: "isometric_hold", holdSeconds: 12 },     // OK
  ];
  // Täytetään profile/experience/goals/metrics/loading pakolliset jotta vain pr-list testataan
  prCfg.answers.q01_age = 30; prCfg.answers.q02_sex = "male"; prCfg.answers.q03_weight = 91;
  prCfg.answers.q06_yearsTraining = 15; prCfg.answers.q08_selfLevel = "elite"; prCfg.answers.q09_sport = "streetlifting";
  prCfg.answers.q29_recentBlock = "intensification";
  prCfg.answers.q12_primaryGoal = "max_1RM"; prCfg.answers.q14_cutting = "no";
  prCfg.answers.q15_aerobicModality = "none"; prCfg.answers.q17_equipment = ["barbell_rack"];
  prCfg.answers.q18_hrvDevice = "none"; prCfg.answers.q19_vbtDevice = "none"; prCfg.answers.q20_sleepTracker = "none";
  prCfg.answers.q21_splitPreference = "upper_lower"; prCfg.answers.q23_volumePref = "MAV";
  prCfg.answers.q24_frequency = { daysPerWeek: 4, sessionLengthMinutes: 90 };
  prCfg.answers.q25_rpePrecision = "vara_calibrated";
  const vPr = validateWizardConfig(prCfg);
  ck("pr-list: 3 validia rivin (external+system+isometric) läpäisee", vPr.valid === true);

  // pr-list: virheellinen rivin (puuttuva paino external:lle)
  prCfg.answers.q26_personalRecords = [
    { movementId: "fb_backsquat", loadType: "external", reps: 3 }, // weightKg puuttuu
  ];
  const vPrBad = validateWizardConfig(prCfg);
  ck("pr-list: puuttuva weightKg external:lle havaitaan",
     !vPrBad.valid && vPrBad.errors.some(e => e.questionId === "q26_personalRecords"));

  if (loaded) await deleteWizardConfig(loaded.wizardId);
  return report;
}
