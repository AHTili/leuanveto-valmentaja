// wizard-2b-mapper.js — Track B Vaihe 2B-α (mapping wizardConfig → ohjelma)
// LeVe AI v4.39.0+
//
// Pure-function: wizardConfig (30 vastausta v3.3) + mainAppState (LeVeCoachDB
// luku-vain snapshot) → generateCustomMesocycle-yhteensopiva input-objekti.
//
// Tutkimuspohja: docs/VAIHE_2B_RESEARCH_VERIFICATION.md (2026-05-11):
//   - Issurin Table V residuaalit (RISTIINTARKISTETTU, 4 itsenäistä lähdettä)
//   - Huiberts 2024 sex-modifier CT-skenaariossa (PDF-VERIFIOITU)
//   - Petré 2021 training-status kvalitatiivisena (PDF-VERIFIOITU)
//   - Nunes 2021 + ACSM 2009 liikejärjestys (RISTIINTARKISTETTU, delegoidaan
//     pää-app:in distributePrimariesToDays:lle)
//
// Spec: docs/VAIHE_2B_alpha_SPECIFICATION.md.
//
// SUUNNITTELUPÄÄTÖKSET (K1-K4):
//   K1: Hypertrofia → strength_endurance kategoria, paitsi q12 viittaa
//       max-voimaan → maksimivoima-aloitus (Issurin-kategorioiden soveltaminen,
//       EI uusi luku)
//   K2: Block-pituudet kvalitatiivisesti lengthByTier-taulukolla.
//       EI numeerisia progressio-kertoimia (Petré ei tue niitä).
//   K3: q26-PR-migraatio jätetty 2B-γ:lle (skipIfMainAppHas-pohjaisesti).
//   K4: Jako 2B-α (mapping, tämä tiedosto) + 2B-β (UI+DB) + 2B-γ (PR+energia).
//
// FABRIKOINTI-KIELTO: Plews 2013 -tyyppinen "lisätty kynnys" on KIELLETTY.
// Heuristic-säännöt merkitään eksplisiittisesti // HEURISTIC -kommentilla.
// Tutkijaviittaukset vain koodikommenteissa, EI UI-näkyviin stringeihin.
//
// EI riippuvuutta data.js:stä — pure mapping. Pää-app:in puoli (2B-β)
// importoi tämän mapperin ja syöttää output:n generateCustomMesocycle:lle.

import { SCHEMA_INVARIANTS } from "./wizard-schema.js";

export const MAPPER_VERSION = "2B-alpha-v1.0";

// ─── Issurin Table V residuaalit (RISTIINTARKISTETTU) ──────────────────
// Lähde: Issurin & Lustig 2004 / Issurin 2008 Table V, modifoitu.
// 4 itsenäistä ristiviittauslähdettä toistavat täsmälleen samat luvut
// (Sportlyzer, TrainHeroic, Jastrzębski 2011, ExRx.net) — ks.
// docs/VAIHE_2B_RESEARCH_VERIFICATION.md §1.2.
//
// Yksikkö: päivää. Muoto: mean ± SD.
// HUOM: Hypertrofialle ja RFD:lle EI MAINITTU omia rivejä alkuperäisessä
// taulukossa — heuristic-sääntö K1 hoitaa hypertrofian tulkinnan.
export const RESIDUAL_DAYS = Object.freeze({
  aerobic_endurance:    { mean: 30, sd: 5, source: "Issurin Table V" },
  maximal_strength:     { mean: 30, sd: 5, source: "Issurin Table V" },
  anaerobic_glycolytic: { mean: 18, sd: 4, source: "Issurin Table V" },
  strength_endurance:   { mean: 15, sd: 5, source: "Issurin Table V" },
  maximal_speed:        { mean: 5,  sd: 3, source: "Issurin Table V" },
});

// ─── Validointi ───────────────────────────────────────────────────────
// Tarkistaa että wizardConfig + mainAppState sisältävät mapping:ille
// vaaditut tiedot. Palauttaa { valid: bool, errors: [{ reason, qid }] }.
//
// 2B-α EI tee koko wizardConfig-skeeman validointia (sen tekee wizard-data.js
// validateWizardConfig:ssa); tämä on KEVYT pre-flight-tarkistus että
// mapping ei kaadu undefined-arvoihin.
export function validateMappingInput(wizardConfig, mainAppState) {
  const errors = [];
  const push = (reason, qid) => errors.push({ reason, qid: qid || null });

  if (!wizardConfig || typeof wizardConfig !== "object") {
    push("wizardConfig puuttuu tai virheellinen");
    return { valid: false, errors };
  }
  if (!wizardConfig.completedAtISO) {
    push("Wizard pitää suorittaa loppuun ennen ohjelman generointia");
  }
  if (wizardConfig.schemaVersion !== "3.3") {
    push(`Vain wizard-skeema 3.3 tuetaan, sait: ${wizardConfig.schemaVersion}`);
  }
  const a = wizardConfig.answers;
  if (!a || typeof a !== "object") {
    push("wizardConfig.answers puuttuu");
    return { valid: false, errors };
  }

  // Pakolliset kentät joita ilman mapping ei voi toimia
  const REQUIRED_KEYS = [
    ["q08_selfLevel",       ["beginner", "intermediate", "advanced", "elite"]],
    ["q09_sport",           ["powerlifting", "streetlifting", "hypertrophy", "sport", "hybrid"]],
    ["q12_primaryGoal",     null], // string, ei spesifiä validointia
    ["q14_cutting",         ["yes", "no"]],
    ["q15_aerobicModality", ["none", "running", "cycling", "rowing", "swimming", "other"]],
    ["q21_splitPreference", ["fullbody", "upper_lower", "ppl", "broscience", "custom"]],
    ["q23_volumePref",      ["MEV", "MAV", "MRV", "auto"]],
    ["q29_recentBlock",     ["hypertrophy", "strength", "intensification", "peaking", "deload", "off_program"]],
  ];
  for (const [qid, validValues] of REQUIRED_KEYS) {
    const v = a[qid];
    if (v === undefined || v === null || v === "") {
      push(`Pakollinen kysymys ${qid} puuttuu`, qid);
    } else if (validValues && !validValues.includes(v)) {
      push(`${qid}: tuntematon arvo "${v}"`, qid);
    }
  }

  // q24_frequency on composite
  const freq = a.q24_frequency;
  if (!freq || typeof freq !== "object") {
    push("q24_frequency puuttuu", "q24_frequency");
  } else {
    const d = Number(freq.daysPerWeek);
    if (Number.isNaN(d) || d < 1 || d > 7) {
      push("q24_frequency.daysPerWeek 1-7 vaaditaan", "q24_frequency");
    }
    const s = Number(freq.sessionLengthMinutes);
    if (Number.isNaN(s) || s < 15 || s > 240) {
      push("q24_frequency.sessionLengthMinutes 15-240 vaaditaan", "q24_frequency");
    }
  }

  // q17_equipment array (vähintään yksi)
  if (!Array.isArray(a.q17_equipment) || a.q17_equipment.length === 0) {
    push("q17_equipment: valitse vähintään yksi kaluston tyyppi", "q17_equipment");
  }

  // mainAppState voi olla null (uusi käyttäjä) — sallittu
  if (mainAppState !== null && mainAppState !== undefined && typeof mainAppState !== "object") {
    push("mainAppState virheellinen tyyppi");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Vaihe 1: pickStartingBlock ───────────────────────────────────────
//
// Tutkimuspohja: Issurin 2010 block-malli + Issurin Table V residuaalit.
// K1-päätös: hypertrofia tulkitaan strength_endurance-kategoriaksi paitsi
// kun q12 viittaa max-voimaan, jolloin aletaan maksimivoima-blokilla
// (= Issurin-kategorioiden suora soveltaminen, ei keksitty luku).
//
// Päätöslogiikka:
//   q29="peaking"/"deload"/"off_program" → hypertrofia-aloitus (turvallisuus)
//   q29="hypertrophy" + q12 max-voima-target → maksimivoima-aloitus
//   q29="hypertrophy" + muu → yhdistelma
//   q29="strength" + q12 max-target → maksimivoima
//   q29="strength" + muu → yhdistelma
//   q29="intensification" → maksimivoima (= peaking-valmistus)
//
// Output: "hypertrofia" | "maksimivoima" | "yhdistelma" | "undulating"
//         (vastaa GOAL_SKELETONS-avaimia pää-app:issa)
export function pickStartingBlock(q29_recentBlock, q12_primaryGoal) {
  const MAX_GOALS = new Set([
    "max_1RM",
    "powerlifting",
    "streetlifting_with_explosive_components",
  ]);
  const isMaxGoal = MAX_GOALS.has(q12_primaryGoal);

  switch (q29_recentBlock) {
    case "peaking":
    case "deload":
    case "off_program":
      return "hypertrofia";
    case "hypertrophy":
      // K1 heuristic: hypertrofiasta seuraava on tyypillisesti voima.
      // Jos atletilla on max-tavoite, mennään suoraan maksimivoimaan.
      // Muutoin yhdistelma joka antaa pohjaa ja siirtää maksimi-vaiheen myöhemmäksi.
      return isMaxGoal ? "maksimivoima" : "yhdistelma";
    case "strength":
      return isMaxGoal ? "maksimivoima" : "yhdistelma";
    case "intensification":
      // Intensifikaation jälkeen peaking-valmistus — koska pää-app:in custom-
      // generaattori ei tue peaking-blokkia (vain default/hyp/maks/dup), valitaan
      // maksimivoima ja jätetään käyttäjälle valinta vaihtaa peaking-template:iin
      // myöhemmin manuaalisesti pää-app:in puolella.
      return "maksimivoima";
    default:
      return "yhdistelma"; // turvallinen fallback
  }
}

// ─── Vaihe 2: pickWeekCount ────────────────────────────────────────────
//
// Tutkimuspohja: Petré 2021 (PDF-VERIFIOITU kvalitatiivinen) — advanced/elite
// suurempi interferenssi → lyhyemmät blokit; Issurin 2010 block-malli.
//
// K2-päätös: kvalitatiiviset pituudet, EI numeerisia progressio-kertoimia.
// // HEURISTIC — Petré ei anna numeerisia kg/vk-arvoja, vain ES per status.
//
// lengthByTier-taulukko: alle 80 LoC, helppo päivittää jos tutkimus tuo
// uusia evidenssejä.
const _BLOCK_LENGTHS_BY_TIER = Object.freeze({
  beginner:     { hypertrofia: 8, maksimivoima: 4, yhdistelma: 6, undulating: 4 },
  intermediate: { hypertrofia: 6, maksimivoima: 4, yhdistelma: 4, undulating: 4 },
  advanced:     { hypertrofia: 4, maksimivoima: 4, yhdistelma: 4, undulating: 4 },
  elite:        { hypertrofia: 4, maksimivoima: 4, yhdistelma: 4, undulating: 4 },
});

export function pickWeekCount(q08_selfLevel, pickedBlock) {
  const tier = _BLOCK_LENGTHS_BY_TIER[q08_selfLevel];
  if (!tier) return 4;
  return tier[pickedBlock] || 4;
}

// ─── Vaihe 3: pickRecoveryCapacity ─────────────────────────────────────
//
// Tutkimuspohja: Huiberts 2024 (PDF-VERIFIOITU): sex-difference vain
// concurrent training -skenaariossa miehillä alaraajoilla (SMD = -0.43).
// Petré 2021: advanced/elite suurempi interferenssi same-session-cardiosta.
//
// Sääntö:
//   1. CT + male + advanced+ + lower-body-fokus → "heikko"
//      (Huiberts-pohja, ei eksplisiittinen lower-body-tarkistus tässä koska
//      pää-app:in custom-meso jakaa primary-volyymin automaattisesti)
//   2. q23_volumePref primary signaali:
//      MEV → heikko, MRV → hyva, MAV → keski
//   3. q23="auto" + q08="advanced"/"elite" → hyva
//   4. Default → keski
export function pickRecoveryCapacity(answers) {
  const hasCT = answers.q15_aerobicModality !== "none";
  const isMale = answers.q02_sex === "male";
  const isAdvancedPlus = answers.q08_selfLevel === "advanced" || answers.q08_selfLevel === "elite";
  const volumePref = answers.q23_volumePref;

  // Huiberts-modifier kapea ehto:
  if (hasCT && isMale && isAdvancedPlus) {
    return "heikko";
  }

  // q23 primary signaali (sex-modifier ei laukea, joten käytetään suoraan)
  if (volumePref === "MEV") return "heikko";
  if (volumePref === "MRV") return "hyva";
  if (volumePref === "MAV") return "keski";

  // "auto" + advanced/elite → korkea palautuminen
  if (isAdvancedPlus) return "hyva";

  return "keski";
}

// ─── Vaihe 4: pickPrimaries ────────────────────────────────────────────
//
// Tutkimuspohja: ei suoraa tutkimusta (käytännön ohjelmointi). Lähtökohta:
// päälaji määrää default-primaryt, sitten suodatetaan q11_injuries
// (absolute-rajoitukset), q22_avoidedExercises ja q17_equipment perusteella.
//
// // HEURISTIC: q11-injury-mapping perustuu keyword-hakuun ("olka", "polvi",
// "selk") koska liikkeille ei ole formal injury-affinity-kenttää.
// 2B-γ voi rakentaa tarkemman mapping:n jos tarpeen.
const _SPORT_DEFAULTS = Object.freeze({
  streetlifting: [
    { name: "Lisäpainoleuanveto", category: "vertikaaliveto",     requires: ["pullup_bar"] },
    { name: "Lisäpainodippi",     category: "horisontaalityöntö", requires: ["dip_station"] },
    { name: "Takakyykky",         category: "alaraaja",           requires: ["barbell_rack"] },
    { name: "Muscle-up",          category: "vertikaaliveto",     requires: ["pullup_bar"] },
  ],
  powerlifting: [
    { name: "Penkkipunnerrus", category: "horisontaalityöntö", requires: ["barbell_rack"] },
    { name: "Takakyykky",      category: "alaraaja",           requires: ["barbell_rack"] },
    { name: "Maastaveto",      category: "lonkkahingaus",      requires: ["barbell_rack"] },
  ],
  hypertrophy: [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto", requires: ["pullup_bar"] }],
  sport:       [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto", requires: ["pullup_bar"] }],
  hybrid:      [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto", requires: ["pullup_bar"] }],
});

// Injury-keyword → liike-keyword -mapping. // HEURISTIC.
const _INJURY_BLOCKLIST = [
  { injuryKeywords: ["olka", "olkapää", "shoulder"], movementKeywords: ["dippi", "punnerrus", "press"] },
  { injuryKeywords: ["polvi", "knee"],               movementKeywords: ["kyykky", "squat"] },
  { injuryKeywords: ["selk", "alaselk", "back"],     movementKeywords: ["maavet", "deadlift"] },
];

export function pickPrimaries(answers) {
  let primaries = _SPORT_DEFAULTS[answers.q09_sport] || _SPORT_DEFAULTS.hybrid;
  primaries = primaries.map(p => ({ ...p })); // shallow copy jotta original ei muutu

  // 1. q11_injuries (absolute) → poista
  if (Array.isArray(answers.q11_injuries)) {
    const absoluteAreas = answers.q11_injuries
      .filter(i => i && i.type === "absolute" && typeof i.area === "string")
      .map(i => i.area.toLowerCase());
    if (absoluteAreas.length > 0) {
      primaries = primaries.filter(p => {
        const nameL = p.name.toLowerCase();
        return !_INJURY_BLOCKLIST.some(b => {
          const injuryHit = absoluteAreas.some(a => b.injuryKeywords.some(k => a.includes(k)));
          if (!injuryHit) return false;
          return b.movementKeywords.some(k => nameL.includes(k));
        });
      });
    }
  }

  // 2. q22_avoidedExercises → poista nimi-osumat
  if (Array.isArray(answers.q22_avoidedExercises)) {
    const avoided = answers.q22_avoidedExercises
      .filter(s => typeof s === "string" && s.trim().length > 0)
      .map(s => s.toLowerCase().trim());
    if (avoided.length > 0) {
      primaries = primaries.filter(p => {
        const nameL = p.name.toLowerCase();
        return !avoided.some(av => nameL.includes(av) || av.includes(nameL));
      });
    }
  }

  // 3. q17_equipment → poista jos vaadittu kalusto puuttuu
  const eq = new Set(Array.isArray(answers.q17_equipment) ? answers.q17_equipment : []);
  primaries = primaries.filter(p => {
    if (!Array.isArray(p.requires) || p.requires.length === 0) return true;
    return p.requires.every(req => eq.has(req));
  });

  // 4. Fallback: jos kaikki poistettu, turvallinen yksi liike
  // (Lisäpainoleuanveto ei vaadi tankoa/dippitelinettä — toimii bodyweightina
  // jos pullup_bar löytyy. Jos sekään ei löydy, palautetaan Leuanveto.)
  if (primaries.length === 0) {
    if (eq.has("pullup_bar")) {
      primaries = [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }];
    } else {
      primaries = [{ name: "Leuanveto (kehonpaino)", category: "vertikaaliveto" }];
    }
  }

  // Palauta vain name+category (generateCustomMesocycle:n vaatima rakenne)
  return primaries.map(({ name, category }) => ({ name, category }));
}

// ─── Vaihe 5: pickPreferredDaysOfWeek ──────────────────────────────────
//
// Yksinkertainen kuvio: ottaen huomioon että pää-app:n createDefaultMesocycle
// käyttää Ma/Ke/Pe-rakenteen ja distributePrimariesToDays jakaa primaryt
// roolien perusteella, palautamme tasaisesti jaetut päivät joissa on
// lepopäivä raskaiden treenien välissä.
//
// Päivänumerot: 0=Ma, 1=Ti, 2=Ke, 3=To, 4=Pe, 5=La, 6=Su.
export function pickPreferredDaysOfWeek(q24_frequency) {
  const days = Number(q24_frequency?.daysPerWeek);
  if (Number.isNaN(days) || days < 1) return null;
  // Tasaisesti jaetut päivät lepopäivän kanssa raskaiden treenien välissä:
  if (days === 1) return [0];                       // Ma
  if (days === 2) return [1, 4];                    // Ti, Pe
  if (days === 3) return [1, 3, 5];                 // Ti, To, La
  if (days === 4) return [0, 2, 4, 5];              // Ma, Ke, Pe, La
  if (days === 5) return [0, 1, 3, 4, 5];           // Ma, Ti, To, Pe, La
  if (days === 6) return [0, 1, 2, 4, 5, 6];        // Ma, Ti, Ke, Pe, La, Su
  if (days === 7) return [0, 1, 2, 3, 4, 5, 6];
  return null;
}

// ─── Vaihe 6: applyTargetDateAnchor ────────────────────────────────────
//
// Jos q27_targetDate on annettu, lasketaan weekCount niin että viimeinen
// viikko osuu kisapäivän viikolle. Ylikirjoittaa pickWeekCount-tuloksen.
//
// Rajat: minDaysFromNow 14 (= 2 vk) wizardissa varmistettu, mutta tarkistetaan
// täällä uudelleen. maxWeekCount 16 (= pää-app:n streetlifting_16w-pituus).
export function applyTargetDateAnchor(weekCountFromTier, q27_targetDate, startDateISO) {
  if (!q27_targetDate || typeof q27_targetDate !== "string") {
    return { weekCount: weekCountFromTier, anchored: false, warning: null };
  }
  const start = new Date(startDateISO);
  const target = new Date(q27_targetDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
    return { weekCount: weekCountFromTier, anchored: false, warning: "Päivämäärät virheellisiä" };
  }
  const diffMs = target.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 86400000));
  if (diffWeeks < 2) {
    return {
      weekCount: Math.max(2, weekCountFromTier),
      anchored: false,
      warning: "Kisapäivä on alle 2 viikon päässä — peakingin ankkurointi ei mahdollista",
    };
  }
  const anchoredWeeks = Math.min(diffWeeks, 16);
  return { weekCount: anchoredWeeks, anchored: true, warning: null };
}

// ─── Vaihe 7: mapWizardToMesocycle (main) ──────────────────────────────
//
// Yhdistää kaikki mapping-funktiot. Palauttaa generateCustomMesocycle:lle
// suoraan annettavan input-objektin + _wizardMeta-kentän jota 2B-β tallentaa
// mesocycleen.customConfig:iin.
//
// Heittää Error:n jos input on virheellinen — 2B-β:n UI-puoli nappaa ja
// näyttää käyttäjälle.
export function mapWizardToMesocycle(wizardConfig, mainAppState) {
  const validation = validateMappingInput(wizardConfig, mainAppState);
  if (!validation.valid) {
    const firstErr = validation.errors[0];
    throw new Error(`mapWizardToMesocycle: ${firstErr.reason}`);
  }
  const a = wizardConfig.answers;

  const startDateISO = _todayISO();
  const goal = pickStartingBlock(a.q29_recentBlock, a.q12_primaryGoal);

  const weekCountTier = pickWeekCount(a.q08_selfLevel, goal);
  const anchorResult = applyTargetDateAnchor(weekCountTier, a.q27_targetDate, startDateISO);
  const weekCount = anchorResult.weekCount;

  const recoveryCapacity = pickRecoveryCapacity(a);
  const primaries = pickPrimaries(a);
  const preferredDaysOfWeek = pickPreferredDaysOfWeek(a.q24_frequency);
  const daysPerWeek = Number(a.q24_frequency?.daysPerWeek) || 3;

  const sexModifierApplied =
    a.q15_aerobicModality !== "none" &&
    a.q02_sex === "male" &&
    (a.q08_selfLevel === "advanced" || a.q08_selfLevel === "elite");

  const customLabel = `Räätälöity wizardilla (${_goalLabel(goal)}, ${weekCount} vk, ${primaries.length} ${primaries.length === 1 ? "päämääräliike" : "päämääräliikettä"})`;

  return {
    // generateCustomMesocycle-yhteensopivat parametrit:
    goal,
    primaries,
    daysPerWeek,
    weekCount,
    recoveryCapacity,
    preferredDaysOfWeek,
    customLabel,
    startDateISO,
    // 2B-α metadata (kulkee mesocycle.customConfig._wizardMeta:iin 2B-β:ssa):
    _wizardMeta: {
      wizardId: wizardConfig.wizardId,
      wizardSchemaVersion: wizardConfig.schemaVersion,
      mapperVersion: MAPPER_VERSION,
      pickedStartingBlock: goal,
      blockLengthRationale: `${a.q08_selfLevel}-tier`,
      sexModifierApplied,
      targetDateAnchored: anchorResult.anchored,
      targetDateWarning: anchorResult.warning,
      rules: collectAppliedRules(a, goal, weekCount, recoveryCapacity, sexModifierApplied, anchorResult.anchored),
    },
  };
}

// ─── Helper: rules-array (auditointi-jälki) ────────────────────────────
function collectAppliedRules(a, goal, weekCount, recoveryCapacity, sexModifierApplied, targetDateAnchored) {
  const rules = [];
  rules.push({
    rule: `q29_recentBlock="${a.q29_recentBlock}" → aloitusblokki "${goal}"`,
    status: "KVALITATIIVINEN",
    source: "Issurin 2010 block-malli + Issurin Table V residuaalit",
  });
  rules.push({
    rule: `q08_selfLevel="${a.q08_selfLevel}" → ${weekCount} vk ${goal}-blokille`,
    status: "HEURISTIC",
    source: "Petré 2021 kvalitatiivinen (advanced suurempi interferenssi → lyhyemmät blokit)",
  });
  if (sexModifierApplied) {
    rules.push({
      rule: `Concurrent training + miehillä + advanced → recoveryCapacity="heikko"`,
      status: "PDF-VERIFIOITU",
      source: "Huiberts 2024 (SMD -0.43 lower-body strength)",
    });
  }
  rules.push({
    rule: `q23_volumePref="${a.q23_volumePref}" → recoveryCapacity="${recoveryCapacity}"`,
    status: "KÄYTÄNNÖLLINEN",
    source: "Pää-app:in volume-tier-konventio",
  });
  if (targetDateAnchored) {
    rules.push({
      rule: `q27_targetDate annettu → weekCount ankkuroitu ${weekCount} vk:hon`,
      status: "KÄYTÄNNÖLLINEN",
      source: "Helms 2014 peaking ≥ 2 vk",
    });
  }
  rules.push({
    rule: `Liikejärjestys delegoidaan pää-app:in distributePrimariesToDays:lle`,
    status: "RISTIINTARKISTETTU",
    source: "Nunes 2021 (MJ-before-SJ, ES=-0.58 SJ-suorituksille) + ACSM 2009 Position Stand",
  });
  return rules;
}

// ─── Yksityishelpperit ─────────────────────────────────────────────────
function _todayISO() {
  // Suomi-aikavyöhykkeessä, mutta riittää YYYY-MM-DD-merkkijonona.
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function _goalLabel(goal) {
  const labels = { hypertrofia: "hypertrofia", maksimivoima: "maksimivoima", yhdistelma: "yhdistelmä", undulating: "DUP" };
  return labels[goal] || goal;
}

// ─── Self-test (Vaihe 1D:n tyyliin) ────────────────────────────────────
// Ajetaan node:lla tai selaimen konsolista. Palauttaa { ok, checks, errors }.
export function selfTestMapper() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => {
    report.checks.push({ label, ok: !!cond });
    if (!cond) { report.ok = false; report.errors.push(label); }
  };

  // ─── 1. RESIDUAL_DAYS + invariantit ─────────────────────────────────
  ck("RESIDUAL_DAYS sisältää 5 ominaisuutta",
     Object.keys(RESIDUAL_DAYS).length === 5);
  ck("RESIDUAL_DAYS maximal_strength = 30 ± 5 (Issurin)",
     RESIDUAL_DAYS.maximal_strength.mean === 30 && RESIDUAL_DAYS.maximal_strength.sd === 5);
  ck("RESIDUAL_DAYS maximal_speed = 5 ± 3 (Issurin)",
     RESIDUAL_DAYS.maximal_speed.mean === 5 && RESIDUAL_DAYS.maximal_speed.sd === 3);
  ck("MAPPER_VERSION on 2B-alpha-v1.0", MAPPER_VERSION === "2B-alpha-v1.0");

  // ─── 2. pickStartingBlock ──────────────────────────────────────────
  ck("pickStartingBlock: peaking → hypertrofia",
     pickStartingBlock("peaking", "any") === "hypertrofia");
  ck("pickStartingBlock: deload → hypertrofia",
     pickStartingBlock("deload", "any") === "hypertrofia");
  ck("pickStartingBlock: off_program → hypertrofia",
     pickStartingBlock("off_program", "any") === "hypertrofia");
  ck("pickStartingBlock: hypertrophy + max_1RM → maksimivoima",
     pickStartingBlock("hypertrophy", "max_1RM") === "maksimivoima");
  ck("pickStartingBlock: hypertrophy + powerlifting → maksimivoima",
     pickStartingBlock("hypertrophy", "powerlifting") === "maksimivoima");
  ck("pickStartingBlock: hypertrophy + streetlifting_with_explosive_components → maksimivoima",
     pickStartingBlock("hypertrophy", "streetlifting_with_explosive_components") === "maksimivoima");
  ck("pickStartingBlock: hypertrophy + hypertrophy-goal → yhdistelma",
     pickStartingBlock("hypertrophy", "hypertrophy") === "yhdistelma");
  ck("pickStartingBlock: strength + max_1RM → maksimivoima",
     pickStartingBlock("strength", "max_1RM") === "maksimivoima");
  ck("pickStartingBlock: strength + general_strength → yhdistelma",
     pickStartingBlock("strength", "general_strength") === "yhdistelma");
  ck("pickStartingBlock: intensification → maksimivoima",
     pickStartingBlock("intensification", "any") === "maksimivoima");

  // ─── 3. pickWeekCount ──────────────────────────────────────────────
  ck("pickWeekCount: beginner + hypertrofia → 8",
     pickWeekCount("beginner", "hypertrofia") === 8);
  ck("pickWeekCount: intermediate + hypertrofia → 6",
     pickWeekCount("intermediate", "hypertrofia") === 6);
  ck("pickWeekCount: advanced + hypertrofia → 4",
     pickWeekCount("advanced", "hypertrofia") === 4);
  ck("pickWeekCount: elite + maksimivoima → 4",
     pickWeekCount("elite", "maksimivoima") === 4);
  ck("pickWeekCount: beginner + yhdistelma → 6",
     pickWeekCount("beginner", "yhdistelma") === 6);
  ck("pickWeekCount: tuntematon → 4 fallback",
     pickWeekCount("xxx", "hypertrofia") === 4);

  // ─── 4. pickRecoveryCapacity ───────────────────────────────────────
  ck("pickRecoveryCapacity: male + CT + elite → heikko (Huiberts)",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "running", q08_selfLevel: "elite", q23_volumePref: "auto" }) === "heikko");
  ck("pickRecoveryCapacity: female + CT + elite → ei Huiberts (q23-pohjainen)",
     pickRecoveryCapacity({ q02_sex: "female", q15_aerobicModality: "running", q08_selfLevel: "elite", q23_volumePref: "MAV" }) === "keski");
  ck("pickRecoveryCapacity: male + ei CT + elite + q23=MAV → keski",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MAV" }) === "keski");
  ck("pickRecoveryCapacity: q23=MEV → heikko",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "beginner", q23_volumePref: "MEV" }) === "heikko");
  ck("pickRecoveryCapacity: q23=MRV → hyva",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "elite", q23_volumePref: "MRV" }) === "hyva");
  ck("pickRecoveryCapacity: q23=auto + advanced → hyva",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "advanced", q23_volumePref: "auto" }) === "hyva");
  ck("pickRecoveryCapacity: q23=auto + intermediate → keski (default)",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "none", q08_selfLevel: "intermediate", q23_volumePref: "auto" }) === "keski");
  ck("pickRecoveryCapacity: male + CT + intermediate (ei advanced) → ei Huiberts → q23-pohjainen",
     pickRecoveryCapacity({ q02_sex: "male", q15_aerobicModality: "running", q08_selfLevel: "intermediate", q23_volumePref: "MAV" }) === "keski");

  // ─── 5. pickPrimaries ──────────────────────────────────────────────
  const streetFull = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: ["pullup_bar", "dip_station", "barbell_rack"], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: streetlifting + full equipment → 4 primaries",
     streetFull.length === 4);
  ck("pickPrimaries: streetlifting sis. Lisäpainoleuanveto",
     streetFull.some(p => p.name === "Lisäpainoleuanveto"));
  ck("pickPrimaries: streetlifting sis. Muscle-up",
     streetFull.some(p => p.name === "Muscle-up"));

  const streetInjuryShoulder = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: ["pullup_bar", "dip_station", "barbell_rack"],
    q11_injuries: [{ area: "olkapää", type: "absolute" }], q22_avoidedExercises: [] });
  ck("pickPrimaries: streetlifting + olkapää-absolute → poistaa Lisäpainodipin",
     !streetInjuryShoulder.some(p => p.name === "Lisäpainodippi"));

  const streetNoEq = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: ["pullup_bar"], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: streetlifting + vain leukatanko → poistaa dipin + takakyykyn",
     !streetNoEq.some(p => p.name === "Lisäpainodippi") && !streetNoEq.some(p => p.name === "Takakyykky"));

  const plFull = pickPrimaries({ q09_sport: "powerlifting",
    q17_equipment: ["barbell_rack"], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: powerlifting + barbell_rack → 3 primaries",
     plFull.length === 3);
  ck("pickPrimaries: powerlifting sis. Penkkipunnerrus",
     plFull.some(p => p.name === "Penkkipunnerrus"));

  const plPolvi = pickPrimaries({ q09_sport: "powerlifting",
    q17_equipment: ["barbell_rack"], q11_injuries: [{ area: "polvi", type: "absolute" }], q22_avoidedExercises: [] });
  ck("pickPrimaries: powerlifting + polvi-absolute → poistaa Takakyykky",
     !plPolvi.some(p => p.name === "Takakyykky"));

  const allRemoved = pickPrimaries({ q09_sport: "streetlifting",
    q17_equipment: [], q11_injuries: [], q22_avoidedExercises: [] });
  ck("pickPrimaries: ei kalustoa → fallback Leuanveto (kehonpaino)",
     allRemoved.length === 1 && allRemoved[0].name === "Leuanveto (kehonpaino)");

  const avoided = pickPrimaries({ q09_sport: "powerlifting",
    q17_equipment: ["barbell_rack"], q11_injuries: [],
    q22_avoidedExercises: ["maastaveto"] });
  ck("pickPrimaries: q22 'maastaveto' poistaa Maastaveto",
     !avoided.some(p => p.name === "Maastaveto"));

  // ─── 6. pickPreferredDaysOfWeek ────────────────────────────────────
  ck("pickPreferredDaysOfWeek: 3 → [1,3,5]",
     JSON.stringify(pickPreferredDaysOfWeek({ daysPerWeek: 3 })) === JSON.stringify([1, 3, 5]));
  ck("pickPreferredDaysOfWeek: 4 → [0,2,4,5]",
     JSON.stringify(pickPreferredDaysOfWeek({ daysPerWeek: 4 })) === JSON.stringify([0, 2, 4, 5]));
  ck("pickPreferredDaysOfWeek: 7 → [0..6]",
     JSON.stringify(pickPreferredDaysOfWeek({ daysPerWeek: 7 })) === JSON.stringify([0, 1, 2, 3, 4, 5, 6]));
  ck("pickPreferredDaysOfWeek: 0 → null",
     pickPreferredDaysOfWeek({ daysPerWeek: 0 }) === null);
  ck("pickPreferredDaysOfWeek: undefined → null",
     pickPreferredDaysOfWeek(undefined) === null);

  // ─── 7. applyTargetDateAnchor ──────────────────────────────────────
  const today = _todayISO();
  const r1 = applyTargetDateAnchor(4, undefined, today);
  ck("applyTargetDateAnchor: q27=undefined → ei muutosta",
     r1.weekCount === 4 && r1.anchored === false);
  // 2 vk päästä
  const twoW = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const r2 = applyTargetDateAnchor(4, twoW, today);
  ck("applyTargetDateAnchor: q27=2 vk päästä → 2 vk (anchored)",
     r2.weekCount === 2 && r2.anchored === true);
  // 8 vk päästä
  const eightW = new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10);
  const r3 = applyTargetDateAnchor(4, eightW, today);
  ck("applyTargetDateAnchor: q27=8 vk päästä → 8 vk (anchored)",
     r3.weekCount === 8 && r3.anchored === true);
  // 20 vk päästä → cap 16
  const twentyW = new Date(Date.now() + 140 * 86400000).toISOString().slice(0, 10);
  const r4 = applyTargetDateAnchor(4, twentyW, today);
  ck("applyTargetDateAnchor: q27=20 vk päästä → cap 16",
     r4.weekCount === 16 && r4.anchored === true);
  // 10 päivän päästä → warning
  const tenD = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const r5 = applyTargetDateAnchor(4, tenD, today);
  ck("applyTargetDateAnchor: q27=10 päivän päästä → warning",
     r5.anchored === false && typeof r5.warning === "string");

  // ─── 8. validateMappingInput ───────────────────────────────────────
  const v1 = validateMappingInput(null, null);
  ck("validateMappingInput: null → invalid",
     v1.valid === false);
  const v2 = validateMappingInput({ schemaVersion: "3.2", completedAtISO: "2026-05-11", answers: {} }, null);
  ck("validateMappingInput: schemaVersion=3.2 → invalid",
     v2.valid === false && v2.errors.some(e => e.reason.includes("3.3")));
  const v3 = validateMappingInput({ schemaVersion: "3.3", completedAtISO: null, answers: {} }, null);
  ck("validateMappingInput: completedAtISO=null → invalid",
     v3.valid === false);

  // ─── 9. mapWizardToMesocycle päästä-päähän — Akseli ────────────────
  const akseliConfig = {
    wizardId: "wiz_akseli_test",
    schemaVersion: "3.3",
    completedAtISO: "2026-05-11T10:00:00Z",
    answers: {
      q01_age: 34, q02_sex: "male", q03_weight: 91,
      q06_yearsTraining: 15, q08_selfLevel: "elite", q09_sport: "streetlifting",
      q11_injuries: [], q12_primaryGoal: "streetlifting_with_explosive_components",
      q14_cutting: "no", q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station"],
      q21_splitPreference: "upper_lower",
      q22_avoidedExercises: [],
      q23_volumePref: "MAV",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 90 },
      q25_rpePrecision: "vara_calibrated",
      q29_recentBlock: "peaking",
    },
  };
  const akseliResult = mapWizardToMesocycle(akseliConfig, { canRead: true, hasMovementProgress: true, hasMesocycles: false });
  ck("Akseli mapping: goal === hypertrofia (peakingin jälkeen)",
     akseliResult.goal === "hypertrofia");
  ck("Akseli mapping: weekCount === 4 (elite-tier hypertrofia)",
     akseliResult.weekCount === 4);
  ck("Akseli mapping: 4 primaries (streetlifting)",
     akseliResult.primaries.length === 4);
  ck("Akseli mapping: daysPerWeek === 4",
     akseliResult.daysPerWeek === 4);
  ck("Akseli mapping: recoveryCapacity === keski (q23=MAV, ei CT)",
     akseliResult.recoveryCapacity === "keski");
  ck("Akseli mapping: sexModifierApplied === false (ei CT)",
     akseliResult._wizardMeta.sexModifierApplied === false);
  ck("Akseli mapping: rules array sisältää Issurin-säännön",
     akseliResult._wizardMeta.rules.some(r => r.source.includes("Issurin")));

  // ─── 10. mapWizardToMesocycle päästä-päähän — uusi käyttäjä ────────
  const newUserConfig = {
    wizardId: "wiz_new_user_test",
    schemaVersion: "3.3",
    completedAtISO: "2026-05-11T10:00:00Z",
    answers: {
      q01_age: 28, q02_sex: "female", q03_weight: 65,
      q06_yearsTraining: 1, q08_selfLevel: "beginner", q09_sport: "hypertrophy",
      q11_injuries: [],
      q12_primaryGoal: "hypertrophy", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["pullup_bar"],
      q21_splitPreference: "fullbody",
      q22_avoidedExercises: [],
      q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 60 },
      q25_rpePrecision: "vara_loose",
      q29_recentBlock: "off_program",
    },
  };
  const newUserResult = mapWizardToMesocycle(newUserConfig, null);
  ck("Uusi käyttäjä mapping: goal === hypertrofia (off_program)",
     newUserResult.goal === "hypertrofia");
  ck("Uusi käyttäjä mapping: weekCount === 8 (beginner-tier)",
     newUserResult.weekCount === 8);
  ck("Uusi käyttäjä mapping: 1 primary (vain pullup_bar)",
     newUserResult.primaries.length === 1);
  ck("Uusi käyttäjä mapping: recoveryCapacity === keski (default)",
     newUserResult.recoveryCapacity === "keski");

  // ─── 11. mapWizardToMesocycle — female-CT-skenaario (sex-modifier EI laukea) ──
  const femaleCTConfig = {
    ...akseliConfig,
    answers: { ...akseliConfig.answers, q02_sex: "female", q15_aerobicModality: "running",
               q16_aerobicVolume: { frequencyPerWeek: 3, durationMinutes: 30, sameSession: false } },
  };
  const femaleCTResult = mapWizardToMesocycle(femaleCTConfig, null);
  ck("Female + CT: sexModifierApplied === false (Huiberts ei tue naisille)",
     femaleCTResult._wizardMeta.sexModifierApplied === false);
  ck("Female + CT: recoveryCapacity ei ole 'heikko' Huibertsin takia",
     femaleCTResult.recoveryCapacity !== "heikko" || femaleCTResult.recoveryCapacity === "heikko" && akseliConfig.answers.q23_volumePref === "MEV");

  // ─── 12. mapWizardToMesocycle — male-CT-advanced (sex-modifier laukea) ──
  const maleCTAdvancedConfig = {
    ...akseliConfig,
    answers: { ...akseliConfig.answers, q15_aerobicModality: "running",
               q16_aerobicVolume: { frequencyPerWeek: 3, durationMinutes: 30, sameSession: false } },
  };
  const maleCTResult = mapWizardToMesocycle(maleCTAdvancedConfig, null);
  ck("Male + CT + elite: sexModifierApplied === true",
     maleCTResult._wizardMeta.sexModifierApplied === true);
  ck("Male + CT + elite: recoveryCapacity === heikko (Huiberts)",
     maleCTResult.recoveryCapacity === "heikko");

  // ─── 13. Deterministisyys (sama input → sama output) ───────────────
  const det1 = mapWizardToMesocycle(akseliConfig, null);
  const det2 = mapWizardToMesocycle(akseliConfig, null);
  // _wizardMeta:n rules-array on sama; startDateISO on sama päivä mutta
  // funktio kutsutaan ms-tarkkuudella → eroja voi syntyä keskiyöllä.
  // Vertaillaan pääparametrejä.
  ck("Deterministisyys: goal sama",     det1.goal === det2.goal);
  ck("Deterministisyys: weekCount sama", det1.weekCount === det2.weekCount);
  ck("Deterministisyys: primaries.length sama", det1.primaries.length === det2.primaries.length);
  ck("Deterministisyys: recoveryCapacity sama", det1.recoveryCapacity === det2.recoveryCapacity);

  // ─── 14. _wizardMeta-rakenteen täydellisyys ─────────────────────────
  ck("_wizardMeta sisältää mapperVersion",        akseliResult._wizardMeta.mapperVersion === MAPPER_VERSION);
  ck("_wizardMeta sisältää wizardSchemaVersion",  akseliResult._wizardMeta.wizardSchemaVersion === "3.3");
  ck("_wizardMeta sisältää rules-array",          Array.isArray(akseliResult._wizardMeta.rules) && akseliResult._wizardMeta.rules.length > 0);
  ck("_wizardMeta.rules sisältää ACSM-säännön (Nunes + ACSM 2009)",
     akseliResult._wizardMeta.rules.some(r => r.source.includes("ACSM 2009")));

  // ─── 15. Schema-invariantit (1A:n säilytys) ─────────────────────────
  ck("SCHEMA_INVARIANTS.totalQuestions === 30", SCHEMA_INVARIANTS.totalQuestions === 30);
  ck("SCHEMA_INVARIANTS.totalStages === 8",     SCHEMA_INVARIANTS.totalStages === 8);

  return report;
}
