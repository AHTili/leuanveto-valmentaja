// wizard-movement-bank.js — Liikepankki q26 PR-listalle (Track B Vaihe 1D)
// LeVe AI v4.38.9+
//
// Kaksi lähdettä:
//   1) Pää-sovelluksen LeVeCoachDB.movements (luku-vain) — 133+ liikettä
//      jos pää-app on alustettu. Käyttäjän omat lisäykset mukana.
//   2) FALLBACK_MOVEMENT_BANK — ~36 liikettä jos LeVeCoachDB ei vielä ole
//      avattu (uusi käyttäjä). Sisältää calisthenics-eliittiluokan isometric-
//      liikkeet (Front Lever, Planche, Human Flag, L-sit, HSPU, one-arm pull-up).
//
// KRIITTINEN: indexedDB.open("LeVeCoachDB") avataan ILMAN versionumeroa.
// Tämä avaa NYKYISEN version JA EI laukaise migraatioita pää-sovellukseen.
// Jos versionumero annetaan ja se on > nykyinen, IDB ajaa onupgradeneeded:n
// joka voi rikkoa pää-sovelluksen sisäisen tilan. Wizard EI saa kirjoittaa
// LeVeCoachDB:hen missään tilanteessa.
//
// Normalisointi: pää-app:in liikkeet käyttävät `movementId`-keyPath:ia,
// fallback-pankki käyttää `id`-kenttää. readMovementBank palauttaa
// yhtenäisen rakenteen jossa kummassakin tapauksessa on:
//   { id, name, category, loadType, isCompetitionLift?, primaryFor? }

const MAIN_APP_DB_NAME = "LeVeCoachDB";

// ─── Fallback-pankki ~36 liikettä ──────────────────────────────────
// Spec §3.2 (docs/WIZARD_SPECIFICATION_v3.3.md). Sisältää:
//   - 8 kilpailuliikettä (streetlifting + voimanosto)
//   - 5 pull-, 4 push-, 5 leg-variaatiota
//   - 5 iso-/koneliikettä
//   - 4 calisthenics-eliittitason kehonpainoliikettä
//   - 4 isometric hold (Front Lever, Planche, Human Flag, L-sit)
//   - 1 custom fallback ("Muu liike")
//
// Kategoriat seuraavat pää-app:in CATEGORIES-rakennetta (data.js rivi ~43).
// loadType-kenttä määrää q26-rivin oletuskuormatyypin:
//   "external"       = ulkoinen kuorma (tanko + paino)
//   "system"         = systeemikuorma (kehonpaino + mahd. lisäpaino)
//   "isometric_hold" = staattinen pito sekunteina
//
// primaryFor on array lajeista joille tämä on kilpailu-/päämääräliike —
// käytetään liikevalikon järjestelyyn q09_sport:n perusteella.
export const FALLBACK_MOVEMENT_BANK = [
  // ─── Streetlifting / Voimanosto kilpailuliikkeet (8) ───
  { id: "fb_addedweight_pullup",    name: "Lisäpainoleuanveto",     category: "vertikaaliveto",     loadType: "system",         isCompetitionLift: true, primaryFor: ["streetlifting"] },
  { id: "fb_addedweight_dip",       name: "Lisäpainodippi",         category: "horisontaalityöntö", loadType: "system",         isCompetitionLift: true, primaryFor: ["streetlifting"] },
  { id: "fb_muscleup",              name: "Muscle-up",              category: "vertikaaliveto",     loadType: "system",         isCompetitionLift: true, primaryFor: ["streetlifting"] },
  { id: "fb_backsquat",             name: "Takakyykky",             category: "alaraaja",           loadType: "external",       isCompetitionLift: true, primaryFor: ["streetlifting", "powerlifting"] },
  { id: "fb_benchpress",            name: "Penkkipunnerrus",        category: "horisontaalityöntö", loadType: "external",                                primaryFor: ["powerlifting"] },
  { id: "fb_deadlift",              name: "Maastaveto",             category: "lonkkahingaus",      loadType: "external",                                primaryFor: ["powerlifting"] },
  { id: "fb_overheadpress",         name: "Pystypunnerrus",         category: "vertikaalityöntö",   loadType: "external" },
  { id: "fb_frontsquat",            name: "Etukyykky",              category: "alaraaja",           loadType: "external" },

  // ─── Pull-variaatiot (5) ───
  { id: "fb_pullup",                name: "Leuanveto (kehonpaino)", category: "vertikaaliveto",     loadType: "system" },
  { id: "fb_lat_pulldown",          name: "Ylätalja",               category: "vertikaaliveto",     loadType: "external" },
  { id: "fb_barbell_row",           name: "Penkkiveto",             category: "horisontaaliveto",   loadType: "external" },
  { id: "fb_cable_row",             name: "Alatalja",               category: "horisontaaliveto",   loadType: "external" },
  { id: "fb_chinup",                name: "Vastaote-leuat",         category: "vertikaaliveto",     loadType: "system" },

  // ─── Push-variaatiot (4) ───
  { id: "fb_dip",                   name: "Dippi (kehonpaino)",         category: "horisontaalityöntö", loadType: "system" },
  { id: "fb_incline_bench",         name: "Vinopenkkipunnerrus",        category: "horisontaalityöntö", loadType: "external" },
  { id: "fb_close_grip_bench",      name: "Close-grip bench",           category: "horisontaalityöntö", loadType: "external" },
  { id: "fb_db_shoulder_press",     name: "Pystypunnerrus käsipainot",  category: "vertikaalityöntö",   loadType: "external" },

  // ─── Leg-variaatiot (5) ───
  { id: "fb_rdl",                   name: "Romanialainen maastaveto (RDL)", category: "lonkkahingaus",  loadType: "external" },
  { id: "fb_leg_press",             name: "Jalkaprässi",                    category: "alaraaja",       loadType: "external" },
  { id: "fb_leg_press_unilateral",  name: "Yhden jalan jalkaprässi",        category: "alaraaja",       loadType: "external" },
  { id: "fb_bulgarian_split",       name: "Bulgarian split squat",          category: "alaraaja",       loadType: "external" },
  { id: "fb_walking_lunge",         name: "Walking lunge",                  category: "alaraaja",       loadType: "external" },
  { id: "fb_calf_raise",            name: "Pohjenosto",                     category: "muu",            loadType: "external" },

  // ─── Iso-/koneliikkeet (5) ───
  { id: "fb_bicep_curl",            name: "Hauiskääntö",              category: "hauisfleksio",       loadType: "external" },
  { id: "fb_tricep_pushdown",       name: "Tricep pushdown",          category: "ojentajaekstensio",  loadType: "external" },
  { id: "fb_lateral_raise",         name: "Sivunosto",                category: "vertikaalityöntö",   loadType: "external" },
  { id: "fb_face_pull",             name: "Face pull",                category: "horisontaaliveto",   loadType: "external" },
  { id: "fb_abs",                   name: "Vatsalihakset (yleinen)",  category: "muu",                loadType: "external" },

  // ─── Calisthenics / Streetlifting-eliittitason kehonpainoliikkeet (4) ───
  { id: "fb_handstand_pushup",      name: "Handstand push-up (HSPU)", category: "vertikaalityöntö",   loadType: "system", primaryFor: ["streetlifting"] },
  { id: "fb_one_arm_pullup",        name: "Yksikätinen leuanveto",    category: "vertikaaliveto",     loadType: "system", primaryFor: ["streetlifting"] },
  { id: "fb_archer_pullup",         name: "Archer pull-up",           category: "vertikaaliveto",     loadType: "system" },
  { id: "fb_lsit_pullup",           name: "L-sit pull-up",            category: "vertikaaliveto",     loadType: "system" },

  // ─── Isometric holds (4) — calisthenics-eliittiluokan staattiset ───
  { id: "fb_front_lever",           name: "Front Lever (hold)",       category: "muu", loadType: "isometric_hold", primaryFor: ["streetlifting"] },
  { id: "fb_planche",               name: "Planche (hold)",           category: "muu", loadType: "isometric_hold", primaryFor: ["streetlifting"] },
  { id: "fb_human_flag",            name: "Human Flag (hold)",        category: "muu", loadType: "isometric_hold" },
  { id: "fb_lsit",                  name: "L-sit (hold)",             category: "muu", loadType: "isometric_hold" },

  // ─── Custom fallback (käyttäjä kirjoittaa oman liikenimen) ───
  { id: "fb_custom_other",          name: "Muu liike (kirjoita itse)", category: "muu", loadType: "external", isPlaceholder: true },
];

// ─── Pää-sovelluksen tilan tunnistus (LeVeCoachDB lukuvain) ────────
// Avaa LeVeCoachDB:n nykyisellä versiolla (ilman versionumeroa) ja lukee:
//   - movementProgress: onko ≥3 movementia joilla e1RM > 0 (= cal-data on tehty)
//   - mesocycles:       onko aktiivinen meso (= käyttäjällä on jo strukturoitu ohjelma)
//   - movements:        kaikki preset+custom -liikkeet liikepankkia varten
//
// Suunnittelu: PROMISIFIOITU IDB-avaus. onsuccess + onerror + onblocked
// kaikki resolveavat. Jos DB ei avaudu (selain ei tue, käyttäjällä on
// active=true read-block tms.), palautetaan { canRead: false } eikä
// koskaan throw:ata — pyrkimys "fallback toimii aina".
//
// Suorituskyky: kutsutaan kerran WizardController.init():ssä ja cachetaan
// instance-muuttujaan. Älä kutsu joka render:llä.
export async function detectMainAppState() {
  if (typeof indexedDB === "undefined" || !indexedDB) {
    return { canRead: false, reason: "indexedDB unavailable" };
  }

  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(MAIN_APP_DB_NAME);
    } catch (e) {
      resolve({ canRead: false, reason: `open exception: ${String(e)}` });
      return;
    }

    // onupgradeneeded EI saa kutsuttua kun avaamme ilman versionumeroa
    // OLEMASSAOLEVALLE DB:lle. Mutta jos LeVeCoachDB ei vielä ole olemassa
    // (uusi käyttäjä), tämä luo TYHJÄN DB:n versiolla 1. Tämä on ei-toivottua —
    // se voi rikkoa pää-sovelluksen ensimmäisen avauksen.
    // Ratkaisu: jos onupgradeneeded laukeaa, tiedämme että DB:tä ei ollut.
    // Keskeytetään ja palautetaan fallback-tila. Käyttäjä ei ole vielä
    // avannut pää-sovellusta → ei lukea olematonta dataa.
    req.onupgradeneeded = (event) => {
      try {
        event.target.transaction.abort();
      } catch { /* ignore */ }
    };

    req.onsuccess = async () => {
      const db = req.result;
      const result = {
        canRead: true,
        hasMovementProgress: false,
        hasMesocycles: false,
        movementProgressData: [],
        activeMesocycle: null,
        allMovements: [],
      };
      try {
        if (db.objectStoreNames.contains("movementProgress")) {
          const all = await getAllFromStore(db, "movementProgress");
          result.movementProgressData = all;
          // ≥3 movementia joilla e1RM > 0 = "cal-data on tehty"
          const withE1rm = all.filter(mp => mp && typeof mp.e1RM === "number" && mp.e1RM > 0);
          result.hasMovementProgress = withE1rm.length >= 3;
        }
        if (db.objectStoreNames.contains("mesocycles")) {
          const all = await getAllFromStore(db, "mesocycles");
          const active = all.filter(m => m && m.active === true);
          result.hasMesocycles = active.length >= 1;
          result.activeMesocycle = active[0] || null;
        }
        if (db.objectStoreNames.contains("movements")) {
          const all = await getAllFromStore(db, "movements");
          // Normalisoi: pää-app käyttää movementId-keypathia. Mapataan
          // yhteiseen rakenteeseen { id, name, category, loadType, ... }.
          // Suodataan custom-archived (jos sellaisia kenttiä on).
          result.allMovements = all
            .filter(m => m && m.name)
            .map(m => ({
              id: m.movementId || m.id || `mainapp_${m.name}`,
              name: m.name,
              category: m.category || "muu",
              loadType: m.loadType || "external",
              isCompetitionLift: m.isCompetitionLift === true,
              isPrimary: m.isPrimary === true,
              isPreset: m.isPreset === true,
              _source: "main-app",
            }));
        }
      } catch (e) {
        result.error = String(e);
      } finally {
        try { db.close(); } catch { /* ignore */ }
        resolve(result);
      }
    };

    req.onerror   = () => resolve({ canRead: false, reason: `open error: ${req.error && req.error.message}` });
    req.onblocked = () => resolve({ canRead: false, reason: "open blocked" });
  });
}

// Apuri: lue object storen kaikki rivit. Promisifioitu wrapper.
function getAllFromStore(db, storeName) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror   = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

// ─── Yhdistäminen — readMovementBank() ──────────────────────────────
// Palauttaa { source, movements, mainAppState }.
// Jos pää-app on alustettu JA siellä on movementeja → käytetään pää-app:in
// laajempaa pankkia. Muutoin fallback (~36 liikettä).
//
// mainAppState palautetaan myös erikseen jotta wizard-core voi käyttää sen
// skipIfMainAppHas-arviointiin (q26 + q29) ilman toista IDB-avausta.
export async function readMovementBank() {
  const mainAppState = await detectMainAppState();
  if (
    mainAppState &&
    mainAppState.canRead &&
    Array.isArray(mainAppState.allMovements) &&
    mainAppState.allMovements.length > 0
  ) {
    return {
      source: "main-app",
      movements: mainAppState.allMovements,
      mainAppState,
    };
  }
  return {
    source: "fallback",
    movements: FALLBACK_MOVEMENT_BANK.map(m => ({ ...m, _source: "fallback" })),
    mainAppState: mainAppState || { canRead: false },
  };
}

// ─── Liike-listan järjestys q09_sport:n perusteella ──────────────────
// Kilpailuliikkeet lajin mukaan kärkeen, sitten loput kategoria-järjestyksessä.
// Tämä on UI-puolen apuri jota renderQuestionPrList käyttää.
//
// Streetlifting → 4 kilpailuliikettä (lisäpaino-leuka, dippi, muscle-up, takakyykky)
// Powerlifting  → 3 päämääräliikettä (penkki, kyykky, maave)
// Muut          → ei lajipohjaista nostoa
export function sortMovementsForSport(movements, sport) {
  if (!Array.isArray(movements) || movements.length === 0) return [];
  const priority = new Map(); // id → priority (pienempi = aiemmin listalla)

  if (sport === "streetlifting") {
    // isCompetitionLift true → priority 0 (kärki)
    movements.forEach(m => {
      if (m.isCompetitionLift) priority.set(m.id, 0);
      else if (Array.isArray(m.primaryFor) && m.primaryFor.includes("streetlifting")) priority.set(m.id, 1);
    });
  } else if (sport === "powerlifting") {
    // Pää-app:in data.js:ssä Penkkipunnerrus + Maastaveto eivät ole
    // isCompetitionLift=true (vain Takakyykky on). Tunnistetaan EKSAKTI
    // nimi-täsmäys jotta vinopenkkipunnerrus / close-grip bench eivät
    // sotke kärkilistaa. Lisätään englanninkieliset vaihtoehdot
    // pää-app:in mahdollisten lokalisaatioiden varalle (tällä hetkellä
    // suomi on ainoa).
    const plExactNames = new Set([
      "penkkipunnerrus", "takakyykky", "maastaveto",
      "bench press", "back squat", "deadlift",
    ]);
    movements.forEach(m => {
      const nameL = m.name.toLowerCase().trim();
      if (plExactNames.has(nameL)) priority.set(m.id, 0);
      else if (m.isCompetitionLift) priority.set(m.id, 1);
    });
  }
  // Muille lajeille kaikki priority null → säilytetään alkuperäinen järjestys

  // Custom fallback (fb_custom_other) viedään aina listan loppuun
  const sorted = [...movements].sort((a, b) => {
    if (a.id === "fb_custom_other") return 1;
    if (b.id === "fb_custom_other") return -1;
    const pa = priority.has(a.id) ? priority.get(a.id) : 100;
    const pb = priority.has(b.id) ? priority.get(b.id) : 100;
    if (pa !== pb) return pa - pb;
    // Sama priority: kategoria-järjestys sitten nimi
    if (a.category !== b.category) return a.category.localeCompare(b.category, "fi");
    return a.name.localeCompare(b.name, "fi");
  });
  return sorted;
}

// ─── skipIfMainAppHas-arviointi ──────────────────────────────────────
// Kysymyksen schema voi sisältää skipIfMainAppHas-ehdon (q26, q29):
//   { store: "movementProgress", minCount: 3, minFieldCount: { e1RM: 1 } }
//   { store: "mesocycles",       minCount: 1, minFieldCount: { active: true } }
//
// Tämä funktio arvioi ehdon mainAppState:n perusteella (detectMainAppState
// on jo cachetannut datan).
//
// Palauttaa true jos kysymys PITÄÄ skipata. wizard-core.js:n evaluateVisible
// käyttää tätä.
export function shouldSkipForMainApp(question, mainAppState) {
  if (!question || !question.skipIfMainAppHas) return false;
  if (!mainAppState || !mainAppState.canRead) return false;
  const cond = question.skipIfMainAppHas;
  if (cond.store === "movementProgress") {
    return mainAppState.hasMovementProgress === true;
  }
  if (cond.store === "mesocycles") {
    return mainAppState.hasMesocycles === true;
  }
  return false;
}

// ─── Self-test (Vaihe 1D acceptance) ─────────────────────────────────
export function selfTestMovementBank() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => { report.checks.push({ label, ok: !!cond }); if (!cond) { report.ok = false; report.errors.push(label); } };

  // Fallback-pankin perusrakenne
  ck("FALLBACK_MOVEMENT_BANK on array",   Array.isArray(FALLBACK_MOVEMENT_BANK));
  ck("Fallback ≥ 30 liikettä",             FALLBACK_MOVEMENT_BANK.length >= 30);
  ck("Fallback sisältää 4 kilpailuliikettä (isCompetitionLift)",
     FALLBACK_MOVEMENT_BANK.filter(m => m.isCompetitionLift).length === 4);
  ck("Fallback sisältää 4 isometric_hold-liikettä",
     FALLBACK_MOVEMENT_BANK.filter(m => m.loadType === "isometric_hold").length === 4);
  ck("Fallback sisältää Front Lever",     FALLBACK_MOVEMENT_BANK.some(m => m.id === "fb_front_lever"));
  ck("Fallback sisältää Planche",         FALLBACK_MOVEMENT_BANK.some(m => m.id === "fb_planche"));
  ck("Fallback sisältää HSPU",            FALLBACK_MOVEMENT_BANK.some(m => m.id === "fb_handstand_pushup"));
  ck("Fallback sisältää one-arm pull-up", FALLBACK_MOVEMENT_BANK.some(m => m.id === "fb_one_arm_pullup"));
  ck("Fallback sisältää custom-fallback", FALLBACK_MOVEMENT_BANK.some(m => m.id === "fb_custom_other"));

  // Kaikilla item:eilla on id+name+loadType
  const malformed = FALLBACK_MOVEMENT_BANK.filter(m =>
    typeof m.id !== "string" || typeof m.name !== "string" || typeof m.loadType !== "string"
  );
  ck("Fallback: jokaisella on id+name+loadType", malformed.length === 0);

  // sortMovementsForSport: streetlifting nostaa kilpailuliikkeet kärkeen
  const sortedStreet = sortMovementsForSport(FALLBACK_MOVEMENT_BANK, "streetlifting");
  const firstFourIds = sortedStreet.slice(0, 4).map(m => m.id).sort();
  const expectedStreetIds = ["fb_addedweight_dip", "fb_addedweight_pullup", "fb_backsquat", "fb_muscleup"].sort();
  ck("sortMovementsForSport(streetlifting) nostaa 4 kilpailuliikettä kärkeen",
     JSON.stringify(firstFourIds) === JSON.stringify(expectedStreetIds));

  // sortMovementsForSport: powerlifting nostaa penkki+kyykky+maave kärkeen
  const sortedPL = sortMovementsForSport(FALLBACK_MOVEMENT_BANK, "powerlifting");
  const firstThreeIds = sortedPL.slice(0, 3).map(m => m.id).sort();
  const expectedPLIds = ["fb_backsquat", "fb_benchpress", "fb_deadlift"].sort();
  ck("sortMovementsForSport(powerlifting) nostaa 3 päämääräliikettä kärkeen",
     JSON.stringify(firstThreeIds) === JSON.stringify(expectedPLIds));

  // shouldSkipForMainApp: q26-skenaario
  const q26 = {
    id: "q26_personalRecords",
    skipIfMainAppHas: { store: "movementProgress", minCount: 3, minFieldCount: { e1RM: 1 } },
  };
  ck("shouldSkipForMainApp: ei mainAppState → ei skip",
     shouldSkipForMainApp(q26, null) === false);
  ck("shouldSkipForMainApp: mainAppState.hasMovementProgress=true → skip",
     shouldSkipForMainApp(q26, { canRead: true, hasMovementProgress: true }) === true);
  ck("shouldSkipForMainApp: hasMovementProgress=false → ei skip",
     shouldSkipForMainApp(q26, { canRead: true, hasMovementProgress: false }) === false);

  // q29-skenaario
  const q29 = {
    id: "q29_recentBlock",
    skipIfMainAppHas: { store: "mesocycles", minCount: 1, minFieldCount: { active: true } },
  };
  ck("shouldSkipForMainApp: q29 hasMesocycles=true → skip",
     shouldSkipForMainApp(q29, { canRead: true, hasMesocycles: true }) === true);

  // Custom fallback aina listan lopussa
  const customLast = sortedStreet[sortedStreet.length - 1];
  ck("sortMovementsForSport: fb_custom_other on aina viimeisenä",
     customLast.id === "fb_custom_other");

  return report;
}
