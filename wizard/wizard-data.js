// wizard-data.js — Wizard 3.2 IndexedDB-skeema + CRUD + migraatio v2 → v3.2
// LeVe AI v4.37+ — Track B Vaihe 1A
//
// Suunnitteluvalinta: erillinen DB ("LeVeWizardDB") päätietokannasta
// "LeVeCoachDB" — wizard-konfiguraatio on uusi rakenne (v3.2 25 kysymystä)
// joka ei kosketa olemassaolevaa harjoituspuolta (sessions, sets, mesocycles).
// Versionointi seuraa wizard-skeeman omaa elinkaarta (v1: alkuperäinen 5 kys.,
// v2: laajennettu 15 kys., v3.2: 25 kys. tieteellisesti verifioitu).
//
// IDB-versionointi noudattaa data.js:n vakiintunutta vanilla-IDB-tyyliä
// (openDB → onupgradeneeded → CRUD-helpers). Dexie.js -kirjastoa EI tuoda —
// CLAUDE.md "Vanilla JS, no npm/build" -arkkitehtuurirajaus pidetään.
//
// Schema-version-mapping (IDB-versiot vs wizard-skeema-versiot):
//   IDB v1 → wizard schema v1 (alkuperäinen, 5 kysymystä, pre-Track-A)
//   IDB v2 → wizard schema v2 (15 kysymystä, v3 spec)
//   IDB v3 → wizard schema v3.2 (25 kysymystä, Plews-verifioitu Track A)
//
// Tämä tiedosto exporttaa initWizardDB, saveWizardConfig, getActiveWizardConfig,
// listWizardConfigs, deleteWizardConfig, migrateWizardV2ToV32.

import {
  WIZARD_SCHEMA_VERSION,
  WIZARD_QUESTIONS,
  WIZARD_STAGES,
  SCHEMA_INVARIANTS,
} from "./wizard-schema.js";

export const WIZARD_DB_NAME = "LeVeWizardDB";
export const WIZARD_DB_VERSION = 3; // IDB-versio (vrt. ylävasenkulma yllä)

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
export function validateWizardConfig(config) {
  const errors = [];
  if (!config || typeof config.answers !== "object") {
    return { valid: false, errors: [{ questionId: null, reason: "Ei vastauksia" }] };
  }
  for (const q of WIZARD_QUESTIONS) {
    const v = config.answers[q.id];
    if (q.required && (v === undefined || v === null || v === "")) {
      // requiredIf-poikkeus: kysymys vaaditaan vain jos toinen vastaus täyttää ehdon
      if (q.requiredIf) {
        const refVal = config.answers[q.requiredIf.questionId];
        if (q.requiredIf.notEquals !== undefined && refVal === q.requiredIf.notEquals) continue;
        if (q.requiredIf.equals    !== undefined && refVal !== q.requiredIf.equals)    continue;
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
  }
  return { valid: errors.length === 0, errors };
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

// ── Pending-migraation suoritus (lazy onnistuneen DB-avauksen jälkeen) ──
async function runPendingWizardMigration() {
  const pending = await txGet(WIZARD_STORES.meta, "pendingMigration");
  if (!pending) return;

  const all = await listWizardConfigs();
  let migratedCount = 0;
  for (const cfg of all) {
    if (cfg.schemaVersion === WIZARD_SCHEMA_VERSION) continue;
    // Jos v2-konfig: muunna v3.2:n vastausrakenteeseen v2-mappauksen kautta
    if (!cfg.schemaVersion || cfg.schemaVersion === "v2" || cfg.schemaVersion === "2") {
      const migrated = migrateWizardV2ToV32(cfg);
      if (migrated) {
        migrated.wizardId = cfg.wizardId; // säilytä alkuperäinen ID viittausten takia
        migrated.createdAtISO = cfg.createdAtISO || migrated.createdAtISO;
        await saveWizardConfig(migrated);
        migratedCount++;
      }
    } else {
      // Tuntematon versio — merkitse tarkistettavaksi muttei pakkomuunneta
      cfg.schemaVersion = `${cfg.schemaVersion}-pending`;
      await saveWizardConfig(cfg);
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

// ── Smoke-test apuri (Phase 1A hyväksymiskriteeri) ──
// Palauttaa true jos: 25 kysymystä, 7 vaihetta, IDB avautuu, saveWizardConfig + getWizardConfig
// pyörähtää roundtrip-onnistuneesti ja migrateWizardV2ToV32 tuottaa validin objektin.
export async function selfTest() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => { report.checks.push({ label, ok: !!cond }); if (!cond) { report.ok = false; report.errors.push(label); } };

  ck("25 kysymystä", WIZARD_QUESTIONS.length === SCHEMA_INVARIANTS.totalQuestions);
  ck("7 vaihetta",   WIZARD_STAGES.length    === SCHEMA_INVARIANTS.totalStages);
  ck("schemaVersion = 3.2", WIZARD_SCHEMA_VERSION === "3.2");

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

  const v2 = { age: 35, sex: "Mies", weight: 90, primaryGoal: "streetlifting", daysPerWeek: 4 };
  const mig = migrateWizardV2ToV32(v2);
  ck("v2→v3.2 migraatio", mig && mig.migratedFrom === "v2" && mig.answers.q12_primaryGoal === "streetlifting_with_explosive_components");

  if (loaded) await deleteWizardConfig(loaded.wizardId);
  return report;
}
