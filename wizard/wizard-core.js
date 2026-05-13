// wizard-core.js — Wizard 3.3 UI core (Track B Vaihe 1B + 1C + 1D)
// UI_VERSION_TAG: Track-B-1D-0  (käytetty wizard.html-konsoliloggissa)
// LeVe AI v4.38.9+ — step-navigaatio + progress + state-management + validation
//                  + composite/injury-list/string-list -komponentit
//                  + smart defaults + conditional UI (Vaihe 1C)
//                  + pr-list/date-komponentit + skipIfMainAppHas
//                  + 5 uutta smart-default-sääntöä (Vaihe 1D)
//
// Käyttää 1A:n + 1D:n moduuleita rajapintoina:
//   wizard-schema.js       — kysymys-skeema (3.3, 30 kys, 8 vaihetta)
//   wizard-data.js         — IDB-tallennus + validointi
//   wizard-movement-bank.js — pää-app-tilan tunnistus + fallback-pankki (1D)
//
// EI muokkaa 1A:n koodia eikä koske pää-sovellukseen (engine.js, data.js,
// index.html, sw.js). Wizard on erillinen sivu (wizard/wizard.html) jonka
// pää-UI-integraatio tehdään Vaiheessa 2.
//
// Suunnitteluvalinnat:
//
// 1) State-malli: shallow Proxy ulkokerroksessa. config-objekti vaihdetaan
//    kokonaan kun answers muuttuu (immutable update -tyyli) jotta yksitasoinen
//    Proxy-set havaitsee muutoksen. Tämä on selvempi malli kuin syvä proxy
//    ja riittää 1B:n state-management-vaatimuksiin (debounced save IDB:hen).
//
// 2) Input-komponentit: 1B toteutti number/radio/checkboxes. 1C täydentää
//    composite/injury-list/string-list -tyypit toimiviksi komponenteiksi.
//    Boolean-fieldit composite-tyypissä renderöidään radio-pareina (Kyllä/Ei)
//    — selvempi UX kuin checkbox jonka tyhjä tila on epäselvä.
//
// 3) Rerender-strategia: yksittäisen kysymyksen visuaalinen tila (radion
//    valittu vaihtoehto, checkboxin tickaus) päivittyy paikallisesti
//    kysymyssolmun sisällä — koko step ei renderöidy uudelleen joka näppäimellä,
//    jotta number-inputin keskitys ei katoa. Nav-palkki + virhe-yhteenveto
//    rerenderöityvät kevyemmin (vain DOM-tasolla) input/change-eventeistä.
//    Lista-komponentit (injury/string-list) ja kysymyksen näkyvyyden muutos
//    (conditional UI, esim. q15→q16) rerenderöivät koko stepin koska
//    DOM-rakenteen mutaatio on liian iso paikallisesti hallittavaksi.
//
// 4) Smart defaults: 1A:n staattiset smartDefault-arvot (q07=0, q13="none",
//    q22=[]) säilyvät. 1C lisää profiilipohjaisia sääntöjä jotka tuottavat
//    arvon vasta kun toinen vastaus on kerätty (esim. q07 katsoo q06+q08).
//    Sääntö EI korvaa olemassaolevaa vastausta — vain täyttää tyhjän.
//
// 5) Conditional UI: 1A:n requiredIf-rakennetta käytetään kahteen tarkoitukseen:
//    (a) näkyvyys — q16 piiloutuu DOM:ista jos q15="none"
//    (b) pakollisuus — q16 vaaditaan vain jos näkyvissä
//    Piilotetun kysymyksen vastaus EI tuhoudu, jotta atletti voi muuttaa
//    mieltä ilman pyyhittyä tietoa.

import {
  WIZARD_STAGES,
  WIZARD_QUESTIONS,
  SCHEMA_INVARIANTS,
  getQuestionsForStage,
} from "./wizard-schema.js";
import {
  createEmptyWizardConfig,
  saveWizardConfig,
  getActiveWizardConfig,
  setActiveWizardConfig,
  validateWizardConfig,
} from "./wizard-data.js";
// 1D: liikepankki + pää-app-tilan tunnistus q26 + q29 ohjaukseen
import {
  readMovementBank,
  shouldSkipForMainApp,
  sortMovementsForSport,
  FALLBACK_MOVEMENT_BANK,
} from "./wizard-movement-bank.js";

// ── State store (Proxy-pohjainen reactive) ────────────────────────

export function createWizardState(initialConfig) {
  const listeners = new Set();
  const internal = {
    config: initialConfig,
    currentStepIndex: 0,
  };
  const proxy = new Proxy(internal, {
    set(target, key, value) {
      target[key] = value;
      for (const fn of listeners) {
        try { fn(key, value); } catch (e) { console.error("[wizard-core] listener error:", e); }
      }
      return true;
    },
  });
  return {
    state: proxy,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getAnswer(qid) { return proxy.config && proxy.config.answers ? proxy.config.answers[qid] : undefined; },
    setAnswer(qid, value) {
      const answers = { ...(proxy.config.answers || {}), [qid]: value };
      proxy.config = { ...proxy.config, answers };
    },
  };
}

// ── Navigation ────────────────────────────────────────────────────

export function nextStep(state) {
  const max = WIZARD_STAGES.length - 1;
  if (state.currentStepIndex < max) {
    state.currentStepIndex = state.currentStepIndex + 1;
    return true;
  }
  return false;
}

export function prevStep(state) {
  if (state.currentStepIndex > 0) {
    state.currentStepIndex = state.currentStepIndex - 1;
    return true;
  }
  return false;
}

export function goToStep(state, idx) {
  const max = WIZARD_STAGES.length - 1;
  if (idx < 0 || idx > max) return false;
  state.currentStepIndex = idx;
  return true;
}

// ── Smart Defaults runtime (Vaihe 1C) ─────────────────────────────
//
// 1A:n kysymyksissä on staattinen `smartDefault`-kenttä joillekin kysymyksille
// (q07=0, q13="none", q22=[]). 1C laajentaa tämän profiilipohjaisilla
// säännöillä jotka katsovat aiempia vastauksia (esim. q08, q06).
//
// Periaatteet:
//   1) Sääntö EI korvaa olemassaolevaa vastausta — se asetetaan vain kun
//      answers[qid] === undefined. Käyttäjän muokkaus pysyy reloadissa
//      koska IDB säilyttää sen arvon ja sääntö näkee sen olevan != undefined.
//   2) Profiilipohjainen sääntö palauttaa undefined jos lähde-data puuttuu
//      (esim. q07 vaatii q06+q08). Tällöin fallback on 1A:n staattinen
//      smartDefault (jos olemassa) tai EI defaultia.
//   3) Säännöt ovat puhtaita funktioita (answers) => value | undefined.
//      Ei sivuvaikutuksia, helppoa testata.
//
// REASONING per sääntö (kommenteissa, EI näytetä käyttäjälle):
//   q07_autoregYears — autoregulaatio (RPE/RIR/velocity) opitaan tyypillisesti
//   muutaman vuoden treenin jälkeen, ei alusta. Beginner/intermediate → 0.
//   Pidempi treeni + edistynyt+ → arvio (years - 2) catteröitynä 0..8.
//
//   q14_cutting — suurin osa atleeteista ei ole aktiivisessa deficitissä.
//   "Ei" on safe default; käyttäjä vaihtaa "kyllä" jos cuttaa.
//
//   q15_aerobicModality — voimalajeissa (powerlifting, streetlifting,
//   hypertrophy) aerobinen ei ole tyypillinen prioriteetti. Sport/hybrid
//   jätetään ilman defaulttia koska riippuu lajista.
//
//   q23_volumePref — elite-atletti ilman cuttia sietää korkeampaa volyymia
//   (MAV = maximum adaptive volume). Cut-tilassa volyymileikkaus → MEV.
//   Muille "auto" antaa LeVe:n säätää.
//
//   q25_rpePrecision — pitkä autoregulaatio-historia ennustaa kalibroidun
//   RPE-arvion. Lyhyt tai puuttuva → "loose" (Vara ±2).

export const SMART_DEFAULT_RULES = {
  q07_autoregYears(answers) {
    const yrs = answers.q06_yearsTraining;
    const lvl = answers.q08_selfLevel;
    if (typeof yrs !== "number") return undefined;
    if (yrs < 3) return 0;
    if (lvl === "beginner" || lvl === "intermediate") return 0;
    if (lvl === "advanced" || lvl === "elite") {
      return Math.max(0, Math.min(yrs - 2, 8));
    }
    return undefined;
  },
  q14_cutting() {
    return "no";
  },
  q15_aerobicModality(answers) {
    const sport = answers.q09_sport;
    if (sport === "powerlifting" || sport === "streetlifting" || sport === "hypertrophy") {
      return "none";
    }
    return undefined;
  },
  q23_volumePref(answers) {
    const lvl = answers.q08_selfLevel;
    const cut = answers.q14_cutting;
    if (lvl === "elite" && cut === "no")  return "MAV";
    if (lvl === "elite" && cut === "yes") return "MEV";
    return undefined;
  },
  q25_rpePrecision(answers) {
    const ar = answers.q07_autoregYears;
    if (typeof ar !== "number") return undefined;
    return ar >= 3 ? "vara_calibrated" : "vara_loose";
  },

  // ─── 1D:n 5 uutta sääntöä (spec §5) ──────────────────────────────
  // REASONING per sääntö:
  //
  // q17_equipment — laji-spesifinen minimi-kalusto. Streetlifting vaatii
  // tankoräkkin + leukatangon + dippitelineen (3 perusasiaa). Voimanostaja
  // pärjää usein pelkällä räkillä jos teknisesti vahva. Smart-default
  // tarjoaa lähtökohdan, käyttäjä lisää muut itse.
  q17_equipment(answers) {
    const sport = answers.q09_sport;
    if (sport === "streetlifting") return ["barbell_rack", "pullup_bar", "dip_station"];
    if (sport === "powerlifting")  return ["barbell_rack"];
    return undefined;
  },

  // q21_splitPreference — laji + frekvenssi ennustaa yleisimmän splittin.
  // Streetlifting 4+ päivää → upper/lower (klassinen lift-split).
  // Powerlifting → fullbody 3× (klassinen Starting Strength / SBD).
  // Muut → odota q24 ennen päätöstä.
  q21_splitPreference(answers) {
    const sport = answers.q09_sport;
    const freq = answers.q24_frequency;
    const daysPerWeek = (freq && typeof freq === "object") ? Number(freq.daysPerWeek) : undefined;
    if (sport === "streetlifting" && typeof daysPerWeek === "number" && daysPerWeek >= 4) {
      return "upper_lower";
    }
    if (sport === "powerlifting") return "fullbody";
    return undefined;
  },

  // q28_targetType — peaking-tyypin ennuste päätavoitteesta. q12-arvo
  // "powerlifting" → kilpailu. "streetlifting_with_explosive_components"
  // → peaking_block (atletti ei välttämättä kisaa mutta peakkaa
  // räjähtävälle treenikaudelle). max_1RM-tavoite → max_test.
  q28_targetType(answers) {
    const goal = answers.q12_primaryGoal;
    if (goal === "powerlifting") return "competition";
    if (goal === "streetlifting_with_explosive_components") return "peaking_block";
    if (goal === "max_1RM") return "max_test";
    return undefined;
  },

  // q29_recentBlock — kokemus + laji ennustaa aiemman blokin.
  // Streetlifting/powerlifting + ≥5 v kokemus → intensifikaatio
  // (tyypillinen pre-peaking-vaihe). Beginner → off_program (aloittelija
  // ei ole strukturoidussa ohjelmassa). Muut → ei oletusta.
  q29_recentBlock(answers) {
    const sport = answers.q09_sport;
    const lvl = answers.q08_selfLevel;
    const yrs = answers.q06_yearsTraining;
    if (lvl === "beginner") return "off_program";
    if ((sport === "streetlifting" || sport === "powerlifting") &&
        typeof yrs === "number" && yrs >= 5) {
      return "intensification";
    }
    return undefined;
  },

  // q30_energyBudget — composite-fieldit. Smart-default vain jos q14=yes
  // (cut-vaihe), muutoin koko kysymys on piilossa eikä defaulttia tarvita.
  // Proteinin osalta: Helms 2014 (JISSN 11:20) suositus cut-vaiheessa
  // 2.0–3.1 g/kg → alarajalla 2.0. Muut kentät jätetään käyttäjälle
  // (deficitKcal ja weeklyWeightLossKg vaihtelevat liikaa profiilista).
  q30_energyBudget(answers) {
    const cut = answers.q14_cutting;
    if (cut !== "yes") return undefined;
    // Olemassa oleva arvo objekti → täydennetään vain puuttuvat kentät
    const cur = (answers.q30_energyBudget && typeof answers.q30_energyBudget === "object")
      ? answers.q30_energyBudget : {};
    // Jos proteinGPerKg jo asetettu, ei smart-defaultata
    if (cur.proteinGPerKg !== undefined) return undefined;
    return { ...cur, proteinGPerKg: 2.0 };
  },
};

// applySmartDefaults: käy WIZARD_QUESTIONS läpi, asettaa tyhjiin kohtiin
// joko profiilipohjaisen säännön tai 1A:n staattisen smartDefault-arvon.
// Palauttaa Set qid joille uusi arvo on smart-defaultattu (= "smart default
// aktiivinen tällä renderöinnillä", näytetään vihje).
//
// prevApplied: aiempi smart-default-set jota voidaan ylikirjoittaa.
//   - Jos qid on prev:ssä JA profiilipohjainen sääntö nyt aktivoituu (esim.
//     q08 vastattu vasta nyt → q23 MAV korvaa aiemman "auto"-fallback:n),
//     uusi arvo asetetaan.
//   - Jos qid EI ole prev:ssä JA arvo on jo asetettu, käsitellään se
//     käyttäjän asettamaksi ja jätetään koskemattomaksi.
// WizardController syöttää tämän Setin eteenpäin niin että UI-puolella
// renderöityjen kysymysten käyttäjä-muokkaukset (renderStep:n onChange)
// poistavat qid:n setistä → suojaa käyttäjän valintaa korvautumiselta.
// 1D laajentaa applySmartDefaults:n mainAppState-parametrilla. Kysymyksiä
// jotka skipataan (q26+q29 olemassa olevalle käyttäjälle) ei smart-defaultata
// — sääntö arvioi vain näkyvät kysymykset.
export function applySmartDefaults(stateStore, prevApplied, mainAppState) {
  const state = stateStore.state;
  const answersBefore = (state.config && state.config.answers) || {};
  const updated = { ...answersBefore };
  const applied = new Set();
  const prev = prevApplied instanceof Set ? prevApplied : new Set();

  for (const q of WIZARD_QUESTIONS) {
    // 1D: skipIfMainAppHas-kysymyksiä ei smart-defaultata. Jos pää-app:in
    // data täyttää ehdon (esim. movementProgress >=3) → kysymys piilossa →
    // smart-defaultia ei aseteta jotta validointi ei laukea.
    if (mainAppState && q.skipIfMainAppHas && shouldSkipForMainApp(q, mainAppState)) {
      continue;
    }
    const hasValue = updated[q.id] !== undefined;
    const isPrevSmartDefault = prev.has(q.id);
    // Käyttäjän asettama arvo = on arvo JA EI ollut aiemmin smart-default
    if (hasValue && !isPrevSmartDefault) continue;

    // 1) Profiilipohjainen sääntö — yritetään aina (myös kun arvo on
    //    aiemmin smart-defaultattu mutta sääntö ei silloin aktivoitunut).
    const rule = SMART_DEFAULT_RULES[q.id];
    if (typeof rule === "function") {
      const val = rule(updated);
      if (val !== undefined) {
        updated[q.id] = val;
        applied.add(q.id);
        continue;
      }
    }
    // 2) Säilytä aiempi smart-default-arvo jos profiilipohjainen ei tuottanut
    //    arvoa (esim. q23 säilyy "auto" kunnes q08 vastataan).
    if (hasValue && isPrevSmartDefault) {
      applied.add(q.id);
      continue;
    }
    // 3) 1A:n staattinen smartDefault — käytetään fallback:nä tyhjälle
    //    kentälle. Profiilipohjainen sääntö voi korvata tämän myöhemmin.
    if (q.smartDefault !== undefined) {
      const def = q.smartDefault;
      updated[q.id] = Array.isArray(def) ? [...def] : (def && typeof def === "object" ? { ...def } : def);
      applied.add(q.id);
    }
  }

  // Persistoi vain jos jotain todella muuttui (arvot tai applied-setti).
  const changed = applied.size !== prev.size
    || [...applied].some(qid => updated[qid] !== answersBefore[qid])
    || [...prev].some(qid => !applied.has(qid));
  if (changed) {
    state.config = { ...state.config, answers: updated };
  }
  return applied;
}

// ── Conditional UI: näkyvyys + tehollinen pakollisuus (Vaihe 1C) ──
//
// 1A:n requiredIf-rakenne ({ questionId, equals|notEquals }) kuvaa milloin
// kysymys on pakollinen. 1C käyttää SAMAA rakennetta myös näkyvyyteen —
// kysymys joka EI ole vaadittu nykyisten vastausten perusteella on myös
// piilotettu DOM:ista. Tämä on tietoinen suunnitteluvalinta: kysymys joka
// ei vaikuta validointiin ei myöskään näy käyttäjälle.
//
// HUOM: 1A:n validateWizardConfig tarkastaa requiredIf:n vain jos
// q.required === true. Wizard 3.2:ssa kaikki requiredIf-kysymykset (q16)
// kuitenkin OVAT käytännössä pakollisia ehdon täyttyessä. Lisätään se
// tarkistus alle (evaluateConditional + validateCurrentStep) jotta UI
// pakottaa täyttämään aerobisen volyymin kun moodi != "none".

// 1D laajentaa 1C:n requiredIf:n isSet-ehdolla. isSet:true tarkoittaa
// "refVal on määritelty" (ei undefined/null/tyhjä string). Tämä on selkeämpi
// kuin spec:n alkuperäinen `notEquals: undefined` joka on JSON-undefined-
// epävakaa.
export function evaluateConditional(q, answers) {
  if (!q.requiredIf) {
    return { visible: true, required: q.required === true };
  }
  const refVal = answers ? answers[q.requiredIf.questionId] : undefined;
  let conditionMet;
  if (q.requiredIf.notEquals !== undefined) {
    conditionMet = refVal !== q.requiredIf.notEquals;
  } else if (q.requiredIf.equals !== undefined) {
    conditionMet = refVal === q.requiredIf.equals;
  } else if (q.requiredIf.isSet === true) {
    // 1D: vaadittu kun refVal on määritelty
    conditionMet = !isEmptyValue(refVal);
  } else if (q.requiredIf.isSet === false) {
    // 1D: vaadittu kun refVal on tyhjä (harvinainen, mutta tuetaan)
    conditionMet = isEmptyValue(refVal);
  } else {
    conditionMet = false;
  }
  return {
    visible: conditionMet,
    required: conditionMet || q.required === true,
  };
}

// Tyhjyyden tarkistus: undefined, null, "", [], {} — sama logiikka kuin
// wizard-data.js:n isEmpty(). Duplikointi tarkoituksellinen jotta core ei
// vaadi data-importtia tähän tarkoitukseen.
function isEmptyValue(v) {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === "object" && Object.keys(v).length === 0) return true;
  return false;
}

// 1D laajentaa 1C:n evaluateVisible:n kolmannella parametrilla mainAppState.
// Jos kysymyksellä on skipIfMainAppHas-ehto JA pää-app-data täyttää sen,
// kysymys piilotetaan (q26 jos cal-data tehty, q29 jos meso aktiivinen).
//
// Backward-compat: 1C:n kutsut (kaksi parametria) toimivat edelleen — kolmas
// parametri on optionaali ja defaultaa null:ksi.
export function evaluateVisible(q, answers, mainAppState) {
  // 1) requiredIf-pohjainen näkyvyys (1C:n logiikka)
  const cond = evaluateConditional(q, answers);
  if (!cond.visible) return false;
  // 2) skipIfMainAppHas (1D:n logiikka)
  if (q.skipIfMainAppHas && mainAppState && shouldSkipForMainApp(q, mainAppState)) {
    return false;
  }
  return true;
}

// ── Composite-sub-field-validointi (Vaihe 1C) ─────────────────────
// 1A:n validateWizardConfig ei käsittele composite-kysymyksen sub-fieldejä
// (esim. q24.daysPerWeek range-rajat). 1C tekee sen UI-tasolla — pidetään
// 1A koskemattomana mutta vaaditaan ettei käyttäjä pääse eteenpäin sub-
// fieldien ollessa virheellisiä.

function validateCompositeField(field, value) {
  if (value === undefined || value === null || value === "") return null;
  if (field.type === "number" && field.range) {
    const num = Number(value);
    if (Number.isNaN(num))         return "Ei numero";
    if (num < field.range.min)     return `Alle minimiä (${field.range.min})`;
    if (num > field.range.max)     return `Yli maksimia (${field.range.max})`;
  }
  return null;
}

// 1D: itse PR-list-itemin validointi UI-tasolla (rivin sub-virhe). Kutsutaan
// renderQuestionPrList:n alla. Validointi-logiikka on identinen wizard-data.js:n
// validatePrListItem-funktion kanssa — tämä on UI-tason peilaus rivi-tason
// virhe-bannerille. Pidetään yksinkertaisena: palautetaan virhe-stringi tai null.
function validatePrListItemUI(item) {
  if (!item || typeof item !== "object") return "Rivi virheellinen";
  const lt = item.loadType;
  if (!["external", "system", "isometric_hold"].includes(lt)) return "Valitse kuorma-tyyppi";
  if (typeof item.movementId !== "string" || item.movementId.length === 0) return "Valitse liike";
  if (lt === "external" || lt === "system") {
    if (item.weightKg === undefined || item.weightKg === null || item.weightKg === "") return "Anna paino (kg)";
    if (item.reps === undefined || item.reps === null || item.reps === "") return "Anna toistot";
    const w = Number(item.weightKg), r = Number(item.reps);
    if (Number.isNaN(w) || w < 0 || w > 500) return "Paino 0–500 kg";
    if (Number.isNaN(r) || r < 1 || r > 30)  return "Toistot 1–30";
  } else if (lt === "isometric_hold") {
    if (item.holdSeconds === undefined || item.holdSeconds === null || item.holdSeconds === "") return "Anna pidon kesto (s)";
    const s = Number(item.holdSeconds);
    if (Number.isNaN(s) || s < 1 || s > 180) return "Pidon kesto 1–180 s";
    if (item.addedWeightKg !== undefined && item.addedWeightKg !== "") {
      const a = Number(item.addedWeightKg);
      if (Number.isNaN(a) || a < 0 || a > 100) return "Lisäpaino 0–100 kg";
    }
  }
  return null;
}

// 1D: date-validointi UI-tasolla. min/max-rajat lasketaan minDaysFromNow /
// maxDaysFromNow -kentistä, jotka tulevat schema-tason range-objektista.
function validateDateUI(v, range) {
  if (v === undefined || v === null || v === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Päivämäärän muoto: YYYY-MM-DD";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Virheellinen päivämäärä";
  if (range) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
    if (range.minDaysFromNow !== undefined && diffDays < range.minDaysFromNow) {
      return `Vähintään ${range.minDaysFromNow} päivän päässä`;
    }
    if (range.maxDaysFromNow !== undefined && diffDays > range.maxDaysFromNow) {
      return `Enintään ${range.maxDaysFromNow} päivän päässä`;
    }
  }
  return null;
}

// Laskee ISO-päivän diffDaysFromNow-rajat HTML5 date-inputin min/max-attribuuteille.
// Palauttaa { minISO, maxISO } tai { minISO: null, maxISO: null }.
function computeDateInputBounds(range) {
  if (!range) return { minISO: null, maxISO: null };
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  let minISO = null, maxISO = null;
  if (range.minDaysFromNow !== undefined) {
    const d = new Date(now.getTime() + range.minDaysFromNow * 86400000);
    minISO = fmt(d);
  }
  if (range.maxDaysFromNow !== undefined) {
    const d = new Date(now.getTime() + range.maxDaysFromNow * 86400000);
    maxISO = fmt(d);
  }
  return { minISO, maxISO };
}

// ── Validation per step ───────────────────────────────────────────

// 1D: validateCurrentStep saa optionaalin mainAppState-parametrin.
// Backward-compat: ilman parametria toimii kuten 1C (skipIfMainAppHas-
// kysymyksiä ei piiloteta). WizardController välittää mainAppState:n.
export function validateCurrentStep(state, mainAppState) {
  const stage = WIZARD_STAGES[state.currentStepIndex];
  const stageQuestions = getQuestionsForStage(stage.id);
  const stageQids = new Set(stageQuestions.map(q => q.id));
  const answers = (state.config && state.config.answers) || {};

  // 1A:n base-validointi (required, range, radio-options, pr-list, date — 1D laajennukset)
  // Suodatetaan stage-ID:n perusteella + filtteröidään pois piilotettujen
  // kysymysten virheet (ei pitäisi tulla, mutta varmuuden vuoksi).
  const baseErrors = validateWizardConfig(state.config).errors.filter(e => {
    if (!stageQids.has(e.questionId)) return false;
    const q = stageQuestions.find(qq => qq.id === e.questionId);
    if (q && !evaluateVisible(q, answers, mainAppState)) return false;
    return true;
  });

  const extraErrors = [];

  for (const q of stageQuestions) {
    if (!evaluateVisible(q, answers, mainAppState)) continue;
    const v = answers[q.id];
    const cond = evaluateConditional(q, answers);

    // Composite-tarkistus: sub-fielden range + required-sub-fieldit
    if (q.type === "composite") {
      const obj = (v && typeof v === "object") ? v : {};
      for (const field of q.fields || []) {
        const subV = obj[field.id];
        const subErr = validateCompositeField(field, subV);
        if (subErr) {
          extraErrors.push({
            questionId: q.id,
            subFieldId: field.id,
            reason: `${field.labelFi}: ${subErr}`,
          });
          continue;
        }
        // Jos kysymys on tehollisesti pakollinen, vaadi kaikki number/boolean
        // -kentät täytetyksi. (string-tyyppisiä ei composite-skeemassa esiinny
        // tällä hetkellä, mutta varaudutaan tulevaisuuteen.)
        if (cond.required && (subV === undefined || subV === null || subV === "")) {
          extraErrors.push({
            questionId: q.id,
            subFieldId: field.id,
            reason: `${field.labelFi}: Pakollinen kenttä puuttuu`,
          });
        }
      }
    }

    // requiredIf-kysymys joka EI ole q.required=true: 1A ei valida tätä.
    // Tarkistetaan käsin että pakollinen arvo on annettu kun ehto täyttyy.
    if (q.requiredIf && q.required !== true && cond.required) {
      const isEmpty = v === undefined || v === null || v === ""
        || (q.type === "composite" && (!v || typeof v !== "object" || Object.keys(v).length === 0));
      if (isEmpty && q.type !== "composite") {
        extraErrors.push({ questionId: q.id, reason: "Pakollinen kenttä puuttuu" });
      }
    }

    // Injury-list: yksittäisten rivien rakennetarkistus (alueen pakollisuus)
    if (q.type === "injury-list" && Array.isArray(v)) {
      v.forEach((item, idx) => {
        if (!item || typeof item !== "object") {
          extraErrors.push({ questionId: q.id, reason: `Vamma #${idx + 1}: rakenne virheellinen` });
          return;
        }
        const hasArea = typeof item.area === "string" && item.area.trim().length > 0;
        const hasType = item.type === "absolute" || item.type === "modified";
        if (!hasArea) extraErrors.push({ questionId: q.id, reason: `Vamma #${idx + 1}: alue puuttuu` });
        if (!hasType) extraErrors.push({ questionId: q.id, reason: `Vamma #${idx + 1}: rajoitustyyppi puuttuu` });
      });
    }

    // String-list: tyhjät rivit eivät ole virhe — listataan toleranssilla.
  }

  const errors = [...baseErrors, ...extraErrors];
  return { isValid: errors.length === 0, errors, stageQuestions };
}

export function validateAllSteps(state, mainAppState) {
  // Käymme jokaisen vaiheen läpi 1C:n laajennettujen sääntöjen kanssa.
  // 1A:n validateWizardConfig pelkkänä ei riitä — emme havaitsisi
  // composite-sub-fieldien rangevirheitä eikä requiredIf-vaateita
  // ei-required-kysymyksille. 1D: mainAppState piilottaa skipIfMainAppHas-
  // kysymykset (q26, q29) jos pää-app-data täyttää ehdon.
  const allErrors = [];
  const original = state.currentStepIndex;
  for (let i = 0; i < WIZARD_STAGES.length; i++) {
    state.currentStepIndex = i;
    const v = validateCurrentStep(state, mainAppState);
    allErrors.push(...v.errors);
  }
  state.currentStepIndex = original;
  return { valid: allErrors.length === 0, errors: allErrors };
}

// ── Kysymys-rendering (input-komponentit) ─────────────────────────

function renderQuestionNumber(q, value, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "wiz-input--number";
  input.id = `wiz-input-${q.id}`;
  input.name = q.id;
  if (q.range) {
    if (q.range.min !== undefined) input.min = String(q.range.min);
    if (q.range.max !== undefined) input.max = String(q.range.max);
  }
  if (q.step !== undefined) input.step = String(q.step);
  input.inputMode = q.step ? "decimal" : "numeric";
  if (value !== undefined && value !== null && value !== "") input.value = String(value);
  input.addEventListener("input", () => {
    const raw = input.value;
    const num = raw === "" ? undefined : Number(raw);
    onChange(num);
  });
  return input;
}

function renderQuestionRadio(q, value, onChange) {
  const group = document.createElement("div");
  group.className = "wiz-radio-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-labelledby", `wiz-label-${q.id}`);
  let selected = value;
  for (const opt of q.options) {
    const label = document.createElement("label");
    label.className = "wiz-radio-option" + (selected === opt.value ? " is-selected" : "");
    label.dataset.optionValue = opt.value;
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `wiz-radio-${q.id}`;
    radio.value = opt.value;
    radio.checked = selected === opt.value;
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      selected = opt.value;
      const options = group.querySelectorAll(".wiz-radio-option");
      options.forEach(el => {
        el.classList.toggle("is-selected", el.dataset.optionValue === selected);
      });
      onChange(opt.value);
    });
    const text = document.createElement("span");
    text.className = "wiz-radio-label";
    text.textContent = opt.labelFi;
    label.appendChild(radio);
    label.appendChild(text);
    group.appendChild(label);
  }
  return group;
}

function renderQuestionCheckboxes(q, value, onChange) {
  const group = document.createElement("div");
  group.className = "wiz-checkbox-group";
  const selected = new Set(Array.isArray(value) ? value : []);
  for (const opt of q.options) {
    const label = document.createElement("label");
    label.className = "wiz-checkbox-option" + (selected.has(opt.value) ? " is-selected" : "");
    label.dataset.optionValue = opt.value;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.name = `wiz-checkbox-${q.id}`;
    cb.value = opt.value;
    cb.checked = selected.has(opt.value);
    cb.addEventListener("change", () => {
      if (cb.checked) selected.add(opt.value); else selected.delete(opt.value);
      label.classList.toggle("is-selected", cb.checked);
      onChange(Array.from(selected));
    });
    const text = document.createElement("span");
    text.className = "wiz-checkbox-label";
    text.textContent = opt.labelFi;
    label.appendChild(cb);
    label.appendChild(text);
    group.appendChild(label);
  }
  return group;
}

// ── Komponentti: boolean-radio (Kyllä/Ei) ─────────────────────────
// Käytetään composite-tyypin boolean-fieldeissä. Selvempi UX kuin checkbox
// jonka tyhjä tila on epäselvä (ei valittu = "ei" vai "ei vielä vastattu"?).
function renderBooleanRadio(field, value, onChange) {
  const group = document.createElement("div");
  group.className = "wiz-bool-group";
  group.setAttribute("role", "radiogroup");
  const opts = [
    { val: true,  labelFi: "Kyllä" },
    { val: false, labelFi: "Ei" },
  ];
  let selected = (value === true || value === false) ? value : undefined;
  for (const opt of opts) {
    const label = document.createElement("label");
    label.className = "wiz-bool-option" + (selected === opt.val ? " is-selected" : "");
    label.dataset.optValue = String(opt.val);
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `wiz-bool-${field.id}`;
    radio.checked = selected === opt.val;
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      selected = opt.val;
      group.querySelectorAll(".wiz-bool-option").forEach(el => {
        el.classList.toggle("is-selected", el.dataset.optValue === String(selected));
      });
      onChange(opt.val);
    });
    const text = document.createElement("span");
    text.className = "wiz-bool-label";
    text.textContent = opt.labelFi;
    label.appendChild(radio);
    label.appendChild(text);
    group.appendChild(label);
  }
  return group;
}

// ── Komponentti: composite (q16, q24) ─────────────────────────────
// q.fields[] kuvaa sisäkkäiset kentät. Value on object { fieldId: value }.
// Mutaatiot triggeröivät koko object-päivityksen (immutable update -tyyli
// säilyy state-storen kanssa).
function renderQuestionComposite(q, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "wiz-composite";

  const current = (value && typeof value === "object") ? { ...value } : {};

  for (const field of (q.fields || [])) {
    const row = document.createElement("div");
    row.className = "wiz-composite-row";

    const lbl = document.createElement("div");
    lbl.className = "wiz-composite-label";
    lbl.textContent = field.labelFi;
    row.appendChild(lbl);

    const errSlot = document.createElement("div");
    errSlot.className = "wiz-composite-error";

    const update = (newVal) => {
      current[field.id] = newVal;
      onChange({ ...current });
      const subErr = validateCompositeField(field, newVal);
      if (subErr) {
        errSlot.textContent = subErr;
        errSlot.style.display = "block";
      } else {
        errSlot.textContent = "";
        errSlot.style.display = "none";
      }
    };

    let input;
    if (field.type === "number") {
      input = document.createElement("input");
      input.type = "number";
      input.className = "wiz-input--number wiz-composite-input";
      if (field.range) {
        if (field.range.min !== undefined) input.min = String(field.range.min);
        if (field.range.max !== undefined) input.max = String(field.range.max);
      }
      input.inputMode = field.step ? "decimal" : "numeric";
      if (current[field.id] !== undefined && current[field.id] !== null && current[field.id] !== "") {
        input.value = String(current[field.id]);
      }
      input.addEventListener("input", () => {
        const raw = input.value;
        const num = raw === "" ? undefined : Number(raw);
        update(num);
      });
    } else if (field.type === "boolean") {
      input = renderBooleanRadio(field, current[field.id], update);
    } else {
      // Fallback: tekstikenttä jos joskus lisätään muita tyyppejä
      input = document.createElement("input");
      input.type = "text";
      input.className = "wiz-input--text wiz-composite-input";
      if (current[field.id] !== undefined && current[field.id] !== null) {
        input.value = String(current[field.id]);
      }
      input.addEventListener("input", () => {
        const raw = input.value;
        update(raw === "" ? undefined : raw);
      });
    }

    row.appendChild(input);

    // Alustus: jos arvo on jo virheellinen ladattaessa, näytä virhe
    const initErr = validateCompositeField(field, current[field.id]);
    if (initErr) {
      errSlot.textContent = initErr;
      errSlot.style.display = "block";
    } else {
      errSlot.style.display = "none";
    }
    row.appendChild(errSlot);

    wrap.appendChild(row);
  }

  return wrap;
}

// ── Komponentti: injury-list (q11) ────────────────────────────────
// value on array { area: string, type: "absolute"|"modified", note: string }.
// Tyhjä lista on validi (q11.required = false).
// HUOM: rerenderöi koko listan jokaisella add/remove:lla, jotta indeksit ja
// radio-name:t pysyvät yhtenäisinä. Yksittäisen kentän muokkaus mutatoi
// vain item-objektia eikä rerender:iä tehdä — input-fokus säilyy.
function renderQuestionInjuryList(q, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "wiz-injury-list";

  // Toimi paikallisella kopiolla; rerender ei tee vain DOM:in osalta
  let items = Array.isArray(value) ? value.map(it => ({ ...it })) : [];

  const renderRows = () => {
    wrap.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wiz-list-empty";
      empty.textContent = "Ei vammoja lisätty.";
      wrap.appendChild(empty);
    }

    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "wiz-list-row wiz-injury-row";

      const head = document.createElement("div");
      head.className = "wiz-list-row-head";
      const title = document.createElement("strong");
      title.textContent = `Vamma #${idx + 1}`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wiz-remove-btn";
      removeBtn.textContent = "Poista";
      removeBtn.addEventListener("click", () => {
        items.splice(idx, 1);
        onChange(items.map(it => ({ ...it })));
        renderRows();
      });
      head.appendChild(title);
      head.appendChild(removeBtn);
      row.appendChild(head);

      // area
      const areaLabel = document.createElement("label");
      areaLabel.className = "wiz-list-field-label";
      areaLabel.textContent = "Alue (esim. olkapää, polvi, alaselkä)";
      const areaInput = document.createElement("input");
      areaInput.type = "text";
      areaInput.className = "wiz-input--text";
      areaInput.value = item.area || "";
      areaInput.addEventListener("input", () => {
        item.area = areaInput.value;
        onChange(items.map(it => ({ ...it })));
      });
      row.appendChild(areaLabel);
      row.appendChild(areaInput);

      // type — radio: absolute / modified
      const typeLabel = document.createElement("div");
      typeLabel.className = "wiz-list-field-label";
      typeLabel.textContent = "Rajoitustyyppi";
      row.appendChild(typeLabel);

      const typeGroup = document.createElement("div");
      typeGroup.className = "wiz-radio-group";
      const typeOpts = [
        { value: "absolute", labelFi: "Ehdoton kielto (älä tee liikettä)" },
        { value: "modified", labelFi: "Liikettä muokaten (esim. ROM, paino)" },
      ];
      typeOpts.forEach(opt => {
        const optLabel = document.createElement("label");
        optLabel.className = "wiz-radio-option" + (item.type === opt.value ? " is-selected" : "");
        optLabel.dataset.optionValue = opt.value;
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `wiz-injury-type-${idx}`;
        radio.value = opt.value;
        radio.checked = item.type === opt.value;
        radio.addEventListener("change", () => {
          if (!radio.checked) return;
          item.type = opt.value;
          typeGroup.querySelectorAll(".wiz-radio-option").forEach(el => {
            el.classList.toggle("is-selected", el.dataset.optionValue === opt.value);
          });
          onChange(items.map(it => ({ ...it })));
        });
        const text = document.createElement("span");
        text.className = "wiz-radio-label";
        text.textContent = opt.labelFi;
        optLabel.appendChild(radio);
        optLabel.appendChild(text);
        typeGroup.appendChild(optLabel);
      });
      row.appendChild(typeGroup);

      // note
      const noteLabel = document.createElement("label");
      noteLabel.className = "wiz-list-field-label";
      noteLabel.textContent = "Lisätieto (valinnainen)";
      const noteInput = document.createElement("textarea");
      noteInput.className = "wiz-input--textarea";
      noteInput.rows = 2;
      noteInput.value = item.note || "";
      noteInput.addEventListener("input", () => {
        item.note = noteInput.value;
        onChange(items.map(it => ({ ...it })));
      });
      row.appendChild(noteLabel);
      row.appendChild(noteInput);

      wrap.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "wiz-add-btn";
    addBtn.textContent = "+ Lisää vamma";
    addBtn.addEventListener("click", () => {
      items.push({ area: "", type: "modified", note: "" });
      onChange(items.map(it => ({ ...it })));
      renderRows();
    });
    wrap.appendChild(addBtn);
  };

  renderRows();
  return wrap;
}

// ── Komponentti: string-list (q22) ────────────────────────────────
// value on array of strings. Tyhjä lista on validi.
// Tyhjä riveä on tyhjennetty filteröidään pois persistointi-vaiheessa
// jotta IDB ei tallenna pelkkiä whitespace-arvoja.
function renderQuestionStringList(q, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "wiz-string-list";

  let items = Array.isArray(value) ? value.slice() : [];

  const emit = () => {
    // Tyhjät rivit jäävät listaan ux-tilan vuoksi, mutta tallennuksen
    // yhteydessä trimmataan ja suodatetaan pois.
    const cleaned = items.map(s => (typeof s === "string" ? s.trimEnd() : "")).filter(s => s.length > 0);
    onChange(cleaned);
  };

  const renderRows = () => {
    wrap.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wiz-list-empty";
      empty.textContent = "Ei liikkeitä lisätty.";
      wrap.appendChild(empty);
    }

    items.forEach((str, idx) => {
      const row = document.createElement("div");
      row.className = "wiz-list-row wiz-string-row";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "wiz-input--text wiz-string-input";
      input.placeholder = "esim. takaraivontaakse-leuat";
      input.value = str || "";
      input.addEventListener("input", () => {
        items[idx] = input.value;
        emit();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wiz-remove-btn";
      removeBtn.textContent = "Poista";
      removeBtn.addEventListener("click", () => {
        items.splice(idx, 1);
        emit();
        renderRows();
      });

      row.appendChild(input);
      row.appendChild(removeBtn);
      wrap.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "wiz-add-btn";
    addBtn.textContent = "+ Lisää liike";
    addBtn.addEventListener("click", () => {
      items.push("");
      // Ei emit() — tyhjä rivi suodattuu pois cleanedissä, mutta jätetään DOM:iin
      // jotta käyttäjä voi kirjoittaa.
      renderRows();
      // Kohdista focus uusimpaan inputtiin
      const inputs = wrap.querySelectorAll(".wiz-string-input");
      const last = inputs[inputs.length - 1];
      if (last) last.focus();
    });
    wrap.appendChild(addBtn);
  };

  renderRows();
  return wrap;
}

// ── Komponentti: date (q27) ───────────────────────────────────────
// HTML5 `<input type="date">`. min/max-rajat lasketaan range:n
// minDaysFromNow / maxDaysFromNow -kentistä. Tyhjä on validi (q27 ei pakollinen).
function renderQuestionDate(q, value, onChange) {
  const input = document.createElement("input");
  input.type = "date";
  input.className = "wiz-input--date";
  input.id = `wiz-input-${q.id}`;
  input.name = q.id;
  const { minISO, maxISO } = computeDateInputBounds(q.range);
  if (minISO) input.min = minISO;
  if (maxISO) input.max = maxISO;
  if (typeof value === "string" && value.length > 0) input.value = value;

  // Virhe-bannerille oma slot — näytetään mobiilissa input:n alapuolella
  const wrap = document.createElement("div");
  wrap.className = "wiz-date-wrap";
  wrap.appendChild(input);
  const errSlot = document.createElement("div");
  errSlot.className = "wiz-date-error";
  errSlot.style.display = "none";
  wrap.appendChild(errSlot);

  const update = () => {
    const raw = input.value;
    const err = validateDateUI(raw, q.range);
    if (err) {
      errSlot.textContent = err;
      errSlot.style.display = "block";
    } else {
      errSlot.textContent = "";
      errSlot.style.display = "none";
    }
    // Tyhjä string → undefined (jotta isSet-ehto toimii oikein q28:lle)
    onChange(raw === "" ? undefined : raw);
  };
  input.addEventListener("change", update);
  input.addEventListener("input", update);

  // Initial validation näkyy jos arvo on jo ladattu virheellisenä
  const initErr = validateDateUI(input.value, q.range);
  if (initErr) {
    errSlot.textContent = initErr;
    errSlot.style.display = "block";
  }

  return wrap;
}

// ── Komponentti: pr-list (q26) ────────────────────────────────────
//
// Dynaaminen lista 0–5 PR-riviä. Per rivi:
//   - Liike-pudotusvalikko (sortMovementsForSport q09:n perusteella)
//   - loadType-radio: external | system | isometric_hold
//   - Conditional rendering loadType:n sisällä:
//       external/system → weightKg + reps näkyvät, isometric piilossa
//       isometric_hold  → holdSeconds + addedWeightKg näkyvät, weight/reps piilossa
//   - dateISO (valinnainen)
//   - "Poista"-painike
// + "Lisää PR" -painike (disabled kun rivit >= maxItems)
//
// Suunnitteluvalinnat:
// 1) loadType:n vaihto EI pyyhi aiempia kenttiä (esim. weightKg säilyy
//    vaikka loadType vaihtuu external→isometric_hold). Sama pattern kuin
//    1C:n q15→q16 (vastauksen säilyminen kun se on piilossa). Käyttäjä
//    voi vaihtaa mieltä molempien suuntaan menettämättä dataa.
// 2) Movement bank ladataan opts.movementBank:sta (controller välittää).
//    Jos ladataan myöhemmin (asynkroni), näytetään väliaikainen "Ladataan…".
// 3) Liike-valikko on `<select>` jossa `<optgroup>` per kategoria. HTML5-
//    standardi mobiili-yhteensopiva (Android/iOS näyttää natiivin valikon).
//    Tämä on parempi UX kuin custom-pudotusvalikko isolle listalle
//    (133+ pää-app-liikettä).
// 4) Custom "Muu liike" -valinta avaa text-inputin movementName:lle.
function renderQuestionPrList(q, value, onChange, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "wiz-pr-list";

  let items = Array.isArray(value)
    ? value.map(it => (it && typeof it === "object") ? { ...it } : null).filter(Boolean)
    : [];
  const maxItems = (q.uiHints && q.uiHints.maxItems) || 5;

  // Hae liikepankki opts.movementBank:sta (controller välittää). Jos puuttuu,
  // fallback suoraan FALLBACK_MOVEMENT_BANK:iin synkronisesti.
  const movementBank = (opts.movementBank && Array.isArray(opts.movementBank.movements))
    ? opts.movementBank
    : { source: "fallback", movements: FALLBACK_MOVEMENT_BANK };
  const sportAnswer = (opts.answers && opts.answers.q09_sport) || null;
  const sortedMovements = sortMovementsForSport(movementBank.movements, sportAnswer);

  const emit = () => {
    onChange(items.map(it => ({ ...it })));
  };

  const renderRows = () => {
    wrap.innerHTML = "";

    // Tietoteksti (ei tutkijanimiä — selkeää suomea)
    if (movementBank.source === "main-app") {
      const info = document.createElement("div");
      info.className = "wiz-pr-source-info";
      info.textContent = `Liikepankissa ${movementBank.movements.length} liikettä (sovelluksesta).`;
      wrap.appendChild(info);
    } else {
      const info = document.createElement("div");
      info.className = "wiz-pr-source-info wiz-pr-source-fallback";
      info.textContent = `Liikepankissa ${movementBank.movements.length} perusliikettä. ` +
                         `Avaa sovelluksen liikevalikko myöhemmin saadaksesi laajemman listan.`;
      wrap.appendChild(info);
    }

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wiz-list-empty";
      empty.textContent = "Ei PR:ää lisätty. Klikkaa alla 'Lisää PR' jatkaaksesi.";
      wrap.appendChild(empty);
    }

    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "wiz-list-row wiz-pr-row";
      row.dataset.rowIndex = String(idx);

      // Otsikko + poisto
      const head = document.createElement("div");
      head.className = "wiz-list-row-head";
      const title = document.createElement("strong");
      title.textContent = `PR #${idx + 1}`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wiz-remove-btn";
      removeBtn.textContent = "Poista";
      removeBtn.addEventListener("click", () => {
        items.splice(idx, 1);
        emit();
        renderRows();
      });
      head.appendChild(title);
      head.appendChild(removeBtn);
      row.appendChild(head);

      // Liike-pudotusvalikko (kategoria-ryhmittely)
      const movLabel = document.createElement("label");
      movLabel.className = "wiz-list-field-label";
      movLabel.textContent = "Liike";
      row.appendChild(movLabel);

      const movSelect = document.createElement("select");
      movSelect.className = "wiz-movement-picker";
      const placeholderOpt = document.createElement("option");
      placeholderOpt.value = "";
      placeholderOpt.textContent = "— Valitse liike —";
      placeholderOpt.disabled = true;
      placeholderOpt.selected = !item.movementId;
      movSelect.appendChild(placeholderOpt);

      // Ryhmittele kategoria-järjestyksessä
      const byCategory = new Map();
      for (const m of sortedMovements) {
        if (!byCategory.has(m.category)) byCategory.set(m.category, []);
        byCategory.get(m.category).push(m);
      }
      // Kilpailuliikkeet erikseen kärjessä (priority 0/1 sortMovementsForSport:sta)
      // — jos custom_other on omassa kategoriassa "muu", se on viimeisenä
      for (const [cat, movs] of byCategory) {
        const og = document.createElement("optgroup");
        og.label = formatCategoryLabel(cat);
        for (const m of movs) {
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = m.name + (m.isCompetitionLift ? " ★" : "");
          opt.dataset.loadType = m.loadType;
          opt.dataset.movementName = m.name;
          if (item.movementId === m.id) opt.selected = true;
          og.appendChild(opt);
        }
        movSelect.appendChild(og);
      }
      movSelect.addEventListener("change", () => {
        const movId = movSelect.value;
        const selectedOpt = movSelect.options[movSelect.selectedIndex];
        const defLoadType = selectedOpt ? selectedOpt.dataset.loadType : "external";
        item.movementId = movId;
        // Aseta movementName automaattisesti (paitsi custom-fallback jossa
        // käyttäjä syöttää nimen text-inputilla)
        if (movId === "fb_custom_other") {
          item.movementName = item.movementName || "";
        } else if (selectedOpt && selectedOpt.dataset.movementName) {
          item.movementName = selectedOpt.dataset.movementName;
        }
        // Esivalitse loadType liikkeen mukaan VAIN jos käyttäjä ei ole
        // vielä muuttanut sitä manuaalisesti. Jos loadType on jo asetettu,
        // pidetään se (käyttäjä on saattanut vaihtaa esim. lisäpaino-leuasta
        // isometric-pidoksi).
        if (!item.loadType) item.loadType = defLoadType;
        emit();
        renderRows(); // koko rivin rerender koska loadType voi muuttua
      });
      row.appendChild(movSelect);

      // Custom-liikkeen nimen syöttö (jos fb_custom_other valittu)
      if (item.movementId === "fb_custom_other") {
        const nameLabel = document.createElement("label");
        nameLabel.className = "wiz-list-field-label";
        nameLabel.textContent = "Liikkeen nimi (kirjoita itse)";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "wiz-input--text";
        nameInput.value = item.movementName || "";
        nameInput.placeholder = "esim. Yksikätinen punnerrus";
        nameInput.addEventListener("input", () => {
          item.movementName = nameInput.value;
          emit();
        });
        row.appendChild(nameLabel);
        row.appendChild(nameInput);
      }

      // Kuorma-tyyppi-radio
      const ltLabel = document.createElement("div");
      ltLabel.className = "wiz-list-field-label";
      ltLabel.textContent = "Kuorma-tyyppi";
      row.appendChild(ltLabel);

      const ltGroup = document.createElement("div");
      ltGroup.className = "wiz-radio-group wiz-load-type-radio";
      const ltOpts = [
        { value: "external",       labelFi: "Ulkoinen kuorma (paino)" },
        { value: "system",         labelFi: "Systeemikuorma (kehonpaino + lisäpaino)" },
        { value: "isometric_hold", labelFi: "Staattinen pito (sekunteina)" },
      ];
      ltOpts.forEach(opt => {
        const lbl = document.createElement("label");
        lbl.className = "wiz-radio-option" + (item.loadType === opt.value ? " is-selected" : "");
        lbl.dataset.optionValue = opt.value;
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `wiz-pr-loadtype-${idx}`;
        radio.value = opt.value;
        radio.checked = item.loadType === opt.value;
        radio.addEventListener("change", () => {
          if (!radio.checked) return;
          item.loadType = opt.value;
          emit();
          renderRows(); // rerender koska conditional fields muuttuu
        });
        const text = document.createElement("span");
        text.className = "wiz-radio-label";
        text.textContent = opt.labelFi;
        lbl.appendChild(radio);
        lbl.appendChild(text);
        ltGroup.appendChild(lbl);
      });
      row.appendChild(ltGroup);

      // Conditional fields loadType:n mukaan
      const lt = item.loadType;
      if (lt === "external" || lt === "system") {
        // Paino + toistot
        const weightLabel = document.createElement("label");
        weightLabel.className = "wiz-list-field-label";
        weightLabel.textContent = "Paino (kg)";
        const weightInput = document.createElement("input");
        weightInput.type = "number";
        weightInput.className = "wiz-input--number";
        weightInput.min = "0"; weightInput.max = "500";
        weightInput.step = "0.5";
        weightInput.inputMode = "decimal";
        if (item.weightKg !== undefined && item.weightKg !== null && item.weightKg !== "") {
          weightInput.value = String(item.weightKg);
        }
        weightInput.addEventListener("input", () => {
          item.weightKg = weightInput.value === "" ? undefined : Number(weightInput.value);
          emit();
        });
        row.appendChild(weightLabel);
        row.appendChild(weightInput);

        const repsLabel = document.createElement("label");
        repsLabel.className = "wiz-list-field-label";
        repsLabel.textContent = "Toistot";
        const repsInput = document.createElement("input");
        repsInput.type = "number";
        repsInput.className = "wiz-input--number";
        repsInput.min = "1"; repsInput.max = "30";
        repsInput.inputMode = "numeric";
        if (item.reps !== undefined && item.reps !== null && item.reps !== "") {
          repsInput.value = String(item.reps);
        }
        repsInput.addEventListener("input", () => {
          item.reps = repsInput.value === "" ? undefined : Number(repsInput.value);
          emit();
        });
        row.appendChild(repsLabel);
        row.appendChild(repsInput);
      } else if (lt === "isometric_hold") {
        // Pidon kesto + valinnainen lisäpaino
        const holdLabel = document.createElement("label");
        holdLabel.className = "wiz-list-field-label";
        holdLabel.textContent = "Pidon kesto (s)";
        const holdInput = document.createElement("input");
        holdInput.type = "number";
        holdInput.className = "wiz-input--number";
        holdInput.min = "1"; holdInput.max = "180";
        holdInput.inputMode = "numeric";
        if (item.holdSeconds !== undefined && item.holdSeconds !== null && item.holdSeconds !== "") {
          holdInput.value = String(item.holdSeconds);
        }
        holdInput.addEventListener("input", () => {
          item.holdSeconds = holdInput.value === "" ? undefined : Number(holdInput.value);
          emit();
        });
        row.appendChild(holdLabel);
        row.appendChild(holdInput);

        const addLabel = document.createElement("label");
        addLabel.className = "wiz-list-field-label";
        addLabel.textContent = "Lisäpaino (kg, valinnainen)";
        const addInput = document.createElement("input");
        addInput.type = "number";
        addInput.className = "wiz-input--number";
        addInput.min = "0"; addInput.max = "100";
        addInput.step = "0.5";
        addInput.inputMode = "decimal";
        if (item.addedWeightKg !== undefined && item.addedWeightKg !== null && item.addedWeightKg !== "") {
          addInput.value = String(item.addedWeightKg);
        }
        addInput.addEventListener("input", () => {
          item.addedWeightKg = addInput.value === "" ? undefined : Number(addInput.value);
          emit();
        });
        row.appendChild(addLabel);
        row.appendChild(addInput);
      }

      // Päivämäärä (valinnainen kaikille tyypeille)
      const dateLabel = document.createElement("label");
      dateLabel.className = "wiz-list-field-label";
      dateLabel.textContent = "Päivä (valinnainen)";
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.className = "wiz-input--date";
      if (typeof item.dateISO === "string") dateInput.value = item.dateISO;
      dateInput.addEventListener("change", () => {
        item.dateISO = dateInput.value === "" ? undefined : dateInput.value;
        emit();
      });
      row.appendChild(dateLabel);
      row.appendChild(dateInput);

      // Rivi-tason virhe
      const errSlot = document.createElement("div");
      errSlot.className = "wiz-pr-row-error";
      const rowErr = validatePrListItemUI(item);
      if (rowErr) {
        errSlot.textContent = rowErr;
        errSlot.style.display = "block";
      } else {
        errSlot.style.display = "none";
      }
      row.appendChild(errSlot);

      wrap.appendChild(row);
    });

    // Lisää-painike
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "wiz-add-btn";
    addBtn.textContent = "+ Lisää PR";
    addBtn.disabled = items.length >= maxItems;
    if (addBtn.disabled) addBtn.title = `Max ${maxItems} PR:ää`;
    addBtn.addEventListener("click", () => {
      // Uusi rivi tyhjillä kentillä — käyttäjä valitsee liikkeen, joka
      // esivalitsee loadType:n (movSelect.change-eventti)
      items.push({});
      emit();
      renderRows();
    });
    wrap.appendChild(addBtn);
  };

  renderRows();
  return wrap;
}

// Käännetään kategoria-id käyttäjälle ystävälliseksi otsikoksi.
// Pää-app:in data.js:n CATEGORIES (rivi ~43) -listan mukaiset suomenkieliset
// merkkijonot säilyvät — vain ensimmäinen kirjain isolla otsikkoa varten.
function formatCategoryLabel(cat) {
  if (!cat) return "Muu";
  const map = {
    "vertikaaliveto":     "Vertikaaliveto",
    "horisontaaliveto":   "Horisontaaliveto",
    "hauisfleksio":       "Hauiskääntö",
    "vertikaalityöntö":   "Vertikaalityöntö",
    "horisontaalityöntö": "Horisontaalityöntö",
    "ojentajaekstensio":  "Ojentajaliikkeet",
    "alaraaja":           "Alaraaja",
    "lonkkahingaus":      "Lonkkahingaus / takaketju",
    "muu":                "Muut",
  };
  return map[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
}

export function renderQuestion(q, value, onChange, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "wiz-question";
  wrap.dataset.questionId = q.id;

  const label = document.createElement("label");
  label.className = "wiz-question-label";
  label.id = `wiz-label-${q.id}`;
  label.setAttribute("for", `wiz-input-${q.id}`);
  label.appendChild(document.createTextNode(q.labelFi));

  // Tehollinen pakollisuus huomioi requiredIf-ehdon — esim. q16 on
  // pakollinen vain jos q15 != "none".
  const cond = opts.answers ? evaluateConditional(q, opts.answers) : { required: q.required === true };
  if (cond.required) {
    const req = document.createElement("span");
    req.className = "wiz-required";
    req.textContent = " *";
    req.setAttribute("aria-label", "pakollinen");
    label.appendChild(req);
  } else {
    const optTag = document.createElement("span");
    optTag.className = "wiz-optional";
    optTag.textContent = "(valinnainen)";
    label.appendChild(optTag);
  }
  wrap.appendChild(label);

  // Smart default -vihje näytetään harmaalla kun arvo on jo asetettu
  // smart-default-säännön kautta mutta käyttäjä ei ole vielä muokannut.
  if (opts.smartDefaultActive) {
    const hint = document.createElement("div");
    hint.className = "wiz-smart-default-hint";
    hint.textContent = "Esivalittu profiilisi perusteella — voit vaihtaa.";
    wrap.appendChild(hint);
  }

  if (q.helperFi) {
    const helper = document.createElement("div");
    helper.className = "wiz-helper";
    helper.textContent = q.helperFi;
    wrap.appendChild(helper);
  }

  let inputEl;
  switch (q.type) {
    case "number":      inputEl = renderQuestionNumber(q, value, onChange); break;
    case "radio":       inputEl = renderQuestionRadio(q, value, onChange); break;
    case "checkboxes":  inputEl = renderQuestionCheckboxes(q, value, onChange); break;
    case "composite":   inputEl = renderQuestionComposite(q, value, onChange); break;
    case "injury-list": inputEl = renderQuestionInjuryList(q, value, onChange); break;
    case "string-list": inputEl = renderQuestionStringList(q, value, onChange); break;
    // 1D: uudet tyypit
    case "date":        inputEl = renderQuestionDate(q, value, onChange); break;
    case "pr-list":     inputEl = renderQuestionPrList(q, value, onChange, opts); break;
    default: {
      inputEl = document.createElement("div");
      inputEl.className = "wiz-unknown-type";
      inputEl.textContent = `Tuntematon kysymystyyppi: ${q.type}`;
    }
  }
  wrap.appendChild(inputEl);

  const errSlot = document.createElement("div");
  errSlot.className = "wiz-error";
  errSlot.id = `wiz-error-${q.id}`;
  errSlot.style.display = "none";
  wrap.appendChild(errSlot);

  return wrap;
}

// ── Step + progress + nav + error-summary rendering ───────────────

export function renderStep(stateStore, container, opts = {}) {
  const state = stateStore.state;
  const stage = WIZARD_STAGES[state.currentStepIndex];
  if (!stage) return;
  const answers = (state.config && state.config.answers) || {};
  const smartDefaulted = opts.smartDefaulted instanceof Set ? opts.smartDefaulted : new Set();
  const mainAppState = opts.mainAppState || null;
  const movementBank = opts.movementBank || null;

  const step = document.createElement("section");
  step.className = "wiz-step";

  // 1D: laske efektiiviset näkyvät vaiheet (poislukien skipattu performance).
  // Jos q26 on skipattu (movementProgress >=3), performance-stage on tyhjä ja
  // näkyy progress-barissa "ohitettuna" — mutta otsikossa näytämme silti
  // alkuperäisen order:n (1..8) jotta vaiheiden sijainti pysyy ennustettavana.
  step.setAttribute("aria-label", `Vaihe ${stage.order} / ${WIZARD_STAGES.length}: ${stage.titleFi}`);

  const h2 = document.createElement("h2");
  h2.textContent = `${stage.order}/${WIZARD_STAGES.length} — ${stage.titleFi}`;
  step.appendChild(h2);

  const allQuestions = getQuestionsForStage(stage.id);
  // Conditional UI: suodata pois piilotetut kysymykset. Vastauksia EI poisteta —
  // ne säilyvät IDB:ssä, jotta atletti voi vaihtaa esim. q15 takaisin "running"
  // -tilaan ja saa aiemman q16-vastauksensa takaisin näkyviin.
  // 1D: mainAppState piilottaa skipIfMainAppHas-kysymykset (q26 + q29).
  const questions = allQuestions.filter(q => evaluateVisible(q, answers, mainAppState));

  // v4.51.3: Reaktiivinen näkyvyys — jos kysymyksen vastaus on TOISEN kysymyksen
  // requiredIf-referenssinä, sen muutos voi tehdä piilotetusta kysymyksestä
  // näkyvän (tai päinvastoin). Esim. q27_targetDate asettaminen tekee
  // q28_targetType:n pakolliseksi/näkyväksi. Ilman tätä uusi kysymys ei
  // ilmestyisi DOM:iin → käyttäjä ei näe sitä → validation hylkää
  // "Pakollinen kenttä puuttuu" alapalkissa.
  // Kerää triggerQuestionIds: id:t joiden vastaus on jonkin toisen kysymyksen
  // requiredIf.questionId. Re-render stage kun trigger muuttuu.
  const triggerQuestionIds = new Set(
    allQuestions
      .map(q => q.requiredIf?.questionId)
      .filter(Boolean)
  );

  // 1D: jos vaihe on kokonaan tyhjä skip-ehtojen takia (esim. performance-
  // stage Akselille), näytä selventävä viesti. Käyttäjä ymmärtää miksi
  // vaihe on "tyhjä".
  if (questions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "wiz-step-skipped";
    if (stage.id === "performance") {
      empty.textContent =
        "Voimataso-vaihe ohitettu — LeVe käyttää sovelluksen aiempaa PR-dataa. " +
        "Jatka seuraavaan vaiheeseen klikkaamalla 'Seuraava'.";
    } else if (stage.id === "experience") {
      empty.textContent = "Kysymykset täytetty pää-sovelluksen tiedoista.";
    } else {
      empty.textContent = "Ei näytettäviä kysymyksiä tälle vaiheelle.";
    }
    step.appendChild(empty);
  }

  for (const q of questions) {
    const currentValue = stateStore.getAnswer(q.id);
    const smartActive = smartDefaulted.has(q.id);
    const node = renderQuestion(q, currentValue, (newValue) => {
      stateStore.setAnswer(q.id, newValue);
      // Käyttäjän muokkaus poistaa smart-default-vihjeen kentästä.
      if (smartActive) {
        const hint = node.querySelector(".wiz-smart-default-hint");
        if (hint) hint.style.display = "none";
        smartDefaulted.delete(q.id);
      }
      // v4.51.3: Re-renderöi stage jos vastattava kysymys on TOISEN kysymyksen
      // requiredIf-referenssi. Tämä paljastaa piilotetut conditional-kysymykset
      // välittömästi käyttäjälle (esim. q27 → q28).
      if (triggerQuestionIds.has(q.id)) {
        renderStep(stateStore, container, opts);
      }
    }, { answers, smartDefaultActive: smartActive, movementBank });
    step.appendChild(node);
  }

  container.innerHTML = "";
  container.appendChild(step);
}

export function renderProgressBar(stateStore, container, opts = {}) {
  const state = stateStore.state;
  const answers = (state.config && state.config.answers) || {};
  const mainAppState = opts.mainAppState || null;

  // 1D: tunnista vaiheet joissa kaikki kysymykset ohitetaan (esim. performance
  // jos q26 skipataan). Näytä nämä "skipped"-tilassa progress-barissa jotta
  // käyttäjä näkee että vaihetta ei tarvitse käydä — tämä on selvempi UX
  // kuin että vaihe katoaisi kokonaan.
  const isStageEmpty = (stageIdx) => {
    const stage = WIZARD_STAGES[stageIdx];
    if (!stage) return false;
    const qs = getQuestionsForStage(stage.id);
    return qs.length > 0 && qs.every(q => !evaluateVisible(q, answers, mainAppState));
  };

  const ul = document.createElement("ul");
  ul.className = "wiz-progress";
  ul.setAttribute("role", "list");
  ul.setAttribute("aria-label", "Edistymispalkki");
  for (let i = 0; i < WIZARD_STAGES.length; i++) {
    const li = document.createElement("li");
    li.className = "wiz-progress-seg";
    if (i < state.currentStepIndex) li.classList.add("is-done");
    if (i === state.currentStepIndex) li.classList.add("is-current");
    if (isStageEmpty(i)) li.classList.add("is-skipped");
    li.setAttribute("aria-label", `Vaihe ${i + 1}: ${WIZARD_STAGES[i].titleFi}`);
    ul.appendChild(li);
  }
  const label = document.createElement("div");
  label.className = "wiz-progress-label";
  label.textContent = `Vaihe ${state.currentStepIndex + 1} / ${WIZARD_STAGES.length}`;

  container.innerHTML = "";
  container.appendChild(ul);
  container.appendChild(label);
}

export function renderNav(stateStore, container, controller) {
  const state = stateStore.state;
  const isLast = state.currentStepIndex === WIZARD_STAGES.length - 1;
  const isFirst = state.currentStepIndex === 0;
  // 1D: validointi käyttää controllerin cachettamaa mainAppState:a jotta
  // skipattujen kysymysten pakottomuus pidetään.
  const mainAppState = controller && controller._mainAppState ? controller._mainAppState : null;
  const validation = validateCurrentStep(state, mainAppState);

  const wrap = document.createElement("nav");
  wrap.className = "wiz-nav";
  const inner = document.createElement("div");
  inner.className = "wiz-nav-inner";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "wiz-btn";
  prevBtn.id = "wiz-btn-prev";
  prevBtn.textContent = "← Taakse";
  prevBtn.disabled = isFirst;
  prevBtn.addEventListener("click", () => controller.prev());

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "wiz-btn wiz-btn--primary";
  nextBtn.id = "wiz-btn-next";
  nextBtn.textContent = isLast ? "Valmis ✓" : "Seuraava →";
  nextBtn.disabled = !validation.isValid;
  nextBtn.addEventListener("click", () => controller.next());

  inner.appendChild(prevBtn);
  inner.appendChild(nextBtn);
  wrap.appendChild(inner);

  container.innerHTML = "";
  container.appendChild(wrap);
}

function renderErrorSummary(state, container, mainAppState) {
  container.innerHTML = "";
  const v = validateCurrentStep(state, mainAppState);
  if (v.isValid) return;
  const div = document.createElement("div");
  div.className = "wiz-step-error-summary";
  const title = document.createElement("strong");
  title.textContent = "Tarkista pakolliset kentät:";
  div.appendChild(title);
  const ul = document.createElement("ul");
  for (const err of v.errors) {
    const q = WIZARD_QUESTIONS.find(qq => qq.id === err.questionId);
    const li = document.createElement("li");
    li.textContent = `${q ? q.labelFi : err.questionId}: ${err.reason}`;
    ul.appendChild(li);
  }
  div.appendChild(ul);
  container.appendChild(div);
}

export function renderDoneView(stateStore, container, controller) {
  const state = stateStore.state;
  const cfg = state.config;
  const answersCount = Object.keys(cfg.answers || {}).length;
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "wiz-done";

  const h2 = document.createElement("h2");
  h2.textContent = "Wizard valmis ✓";
  wrap.appendChild(h2);

  const p1 = document.createElement("p");
  p1.textContent = `Tallensit ${answersCount} vastausta. Konfiguraatio tallennettu paikallisesti.`;
  wrap.appendChild(p1);

  const p2 = document.createElement("p");
  p2.textContent = "Vaihe 2 integroi wizardin pää-sovellukseen ja luo räätälöidyn ohjelman vastausten pohjalta.";
  wrap.appendChild(p2);

  const summary = document.createElement("div");
  summary.className = "wiz-done-summary";
  summary.style.whiteSpace = "pre-line";
  summary.textContent =
    `wizardId: ${cfg.wizardId}\n` +
    `schemaVersion: ${cfg.schemaVersion}\n` +
    `completedAt: ${cfg.completedAtISO || "—"}`;
  wrap.appendChild(summary);

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.className = "wiz-btn";
  restartBtn.style.marginTop = "16px";
  restartBtn.textContent = "Aloita uudelleen";
  restartBtn.addEventListener("click", () => controller.restart());
  wrap.appendChild(restartBtn);

  container.appendChild(wrap);
}

// ── Controller (yhdistää kaiken) ──────────────────────────────────

const DEBOUNCE_MS = 500;

function debounce(fn, ms) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn.apply(null, args); }, ms);
  };
}

export class WizardController {
  constructor(opts) {
    this.container = opts.container;
    this.stateStore = null;
    this.progressEl = null;
    this.stepEl = null;
    this.errorSummaryEl = null;
    this.navEl = null;
    this.isDone = false;
    this._unsubscribeState = null;
    this._debouncedSave = debounce(() => this._save(), DEBOUNCE_MS);
    this._onStepInteraction = this._onStepInteraction.bind(this);
    // Smart-default-tila: qid:t joille tämä render-pyörähdys asetti
    // profiilipohjaisen arvon. Vihje näytetään näille — käyttäjän muokkaus
    // poistaa setistä, jolloin vihje katoaa. Transient (ei tallenneta IDB:hen).
    this._smartDefaulted = new Set();
    // 1D: pää-app-tilan + liikepankin cache. Ladataan kerran init():ssä.
    this._mainAppState = null;
    this._movementBank = null;
  }

  async init() {
    let cfg = await getActiveWizardConfig();
    if (!cfg) {
      cfg = createEmptyWizardConfig();
      await saveWizardConfig(cfg);
      await setActiveWizardConfig(cfg.wizardId);
    }
    const startInDoneView = !!cfg.completedAtISO;

    this.stateStore = createWizardState(cfg);
    // Palauta käyttäjä viimeksi tallennetulle vaiheelle (hyväksymiskriteeri 6:
    // reload palauttaa state:n). lastStepIndex on uusi kenttä — 1A:n createEmpty
    // ei aseta sitä, joten fallback on 0. 1A:n saveWizardConfig hyväksyy
    // ylimääräiset kentät (löyhä schema), joten 1A:han ei tarvita muutoksia.
    if (
      typeof cfg.lastStepIndex === "number" &&
      cfg.lastStepIndex >= 0 &&
      cfg.lastStepIndex < WIZARD_STAGES.length
    ) {
      this.stateStore.state.currentStepIndex = cfg.lastStepIndex;
    }
    this._unsubscribeState = this.stateStore.subscribe((key) => {
      if (key === "config") this._debouncedSave();
    });

    // 1D: Lataa pää-app-tila + liikepankki KERRAN init():ssä. readMovementBank
    // sisältää detectMainAppState:n joten yhdessä Promise:ssa molemmat — ei
    // tarvitse erillistä detectMainAppState-kutsua.
    try {
      this._movementBank = await readMovementBank();
      this._mainAppState = this._movementBank.mainAppState || null;
    } catch (e) {
      console.warn("[wizard-core] readMovementBank failed:", e);
      this._movementBank = { source: "fallback", movements: FALLBACK_MOVEMENT_BANK, mainAppState: { canRead: false } };
      this._mainAppState = this._movementBank.mainAppState;
    }

    // Smart defaults — aja heti init():n jälkeen jotta atletti näkee
    // esivalitut arvot ensimmäisestä vaiheesta alkaen. 1D: mainAppState
    // välitetään jotta skipattuihin kysymyksiin (q26+q29) ei aseteta
    // defaulttia.
    this._smartDefaulted = applySmartDefaults(this.stateStore, this._smartDefaulted, this._mainAppState);

    this._mountSkeleton();

    if (startInDoneView) {
      this.isDone = true;
      this.progressEl.style.display = "none";
      this.navEl.style.display = "none";
      renderDoneView(this.stateStore, this.stepEl, this);
    } else {
      this._renderAll();
    }
  }

  _persistStepIndex() {
    // Päivittää config.lastStepIndex ennen tallennusta. Ilman tätä reload
    // palauttaa vastaukset mutta ei vaihetta.
    const idx = this.stateStore.state.currentStepIndex;
    this.stateStore.state.config = { ...this.stateStore.state.config, lastStepIndex: idx };
  }

  _mountSkeleton() {
    this.container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "wiz-header";
    const h1 = document.createElement("h1");
    h1.textContent = "LeVe AI — Räätälöity ohjelma";
    const subtitle = document.createElement("p");
    subtitle.className = "wiz-subtitle";
    subtitle.textContent = "Vastaa kysymyksiin niin LeVe luo sinulle henkilökohtaisen ohjelman.";
    header.appendChild(h1);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    this.progressEl = document.createElement("div");
    this.progressEl.id = "wiz-progress-area";
    this.container.appendChild(this.progressEl);

    this.stepEl = document.createElement("div");
    this.stepEl.id = "wiz-step-area";
    this.stepEl.addEventListener("input", this._onStepInteraction);
    this.stepEl.addEventListener("change", this._onStepInteraction);
    this.container.appendChild(this.stepEl);

    this.errorSummaryEl = document.createElement("div");
    this.errorSummaryEl.id = "wiz-error-summary-area";
    this.container.appendChild(this.errorSummaryEl);

    // Nav-palkki menee body:n loppuun (sticky alaosa), ei root-containerin sisään
    this.navEl = document.createElement("div");
    this.navEl.id = "wiz-nav-area";
    document.body.appendChild(this.navEl);
  }

  _onStepInteraction() {
    // Kun käyttäjä syöttää/muuttaa, nav-tila ja virheyhteenveto päivittyvät.
    // Itse kysymyssolmu hoitaa oman visuaalisen tilansa (radion is-selected jne.).
    this._refreshNav();
    renderErrorSummary(this.stateStore.state, this.errorSummaryEl, this._mainAppState);
  }

  _renderAll() {
    renderProgressBar(this.stateStore, this.progressEl, { mainAppState: this._mainAppState });
    renderStep(this.stateStore, this.stepEl, {
      smartDefaulted: this._smartDefaulted,
      mainAppState: this._mainAppState,
      movementBank: this._movementBank,
    });
    renderErrorSummary(this.stateStore.state, this.errorSummaryEl, this._mainAppState);
    this._refreshNav();
  }

  _refreshNav() {
    renderNav(this.stateStore, this.navEl, this);
  }

  async _save() {
    if (!this.stateStore) return false;
    return await saveWizardConfig(this.stateStore.state.config);
  }

  async next() {
    if (this.isDone) return;
    const v = validateCurrentStep(this.stateStore.state, this._mainAppState);
    if (!v.isValid) return;

    const isLast = this.stateStore.state.currentStepIndex === WIZARD_STAGES.length - 1;
    if (isLast) {
      await this.complete();
      return;
    }
    nextStep(this.stateStore.state);
    this._persistStepIndex();
    // Profiilipohjaiset säännöt voivat aktivoitua vasta nyt (esim. q23 katsoo
    // q08+q14 jotka kerätään aiempien vaiheiden aikana). Ajetaan uudelleen
    // jokaisen vaihtonsa jälkeen — sääntö ei korvaa olemassaolevaa arvoa,
    // joten aiemmat smart-defaultit eivät palaudu.
    this._smartDefaulted = applySmartDefaults(this.stateStore, this._smartDefaulted, this._mainAppState);
    await this._save();
    this._renderAll();
  }

  async prev() {
    if (this.isDone) return;
    if (prevStep(this.stateStore.state)) {
      this._persistStepIndex();
      this._smartDefaulted = applySmartDefaults(this.stateStore, this._smartDefaulted, this._mainAppState);
      await this._save();
      this._renderAll();
    }
  }

  async complete() {
    const fullValidation = validateAllSteps(this.stateStore.state, this._mainAppState);
    if (!fullValidation.valid) {
      console.warn("[wizard] complete: validation failed", fullValidation.errors);
      return false;
    }
    const cfg = { ...this.stateStore.state.config, completedAtISO: new Date().toISOString() };
    this.stateStore.state.config = cfg;
    await saveWizardConfig(cfg);
    this.isDone = true;
    this.progressEl.style.display = "none";
    this.navEl.style.display = "none";
    this.errorSummaryEl.innerHTML = "";
    renderDoneView(this.stateStore, this.stepEl, this);
    return true;
  }

  async restart() {
    const fresh = createEmptyWizardConfig();
    await saveWizardConfig(fresh);
    await setActiveWizardConfig(fresh.wizardId);
    this.isDone = false;
    if (this._unsubscribeState) this._unsubscribeState();
    this.stateStore = createWizardState(fresh);
    this._unsubscribeState = this.stateStore.subscribe((key) => {
      if (key === "config") this._debouncedSave();
    });
    this._smartDefaulted = applySmartDefaults(this.stateStore, this._smartDefaulted, this._mainAppState);
    this.progressEl.style.display = "";
    this.navEl.style.display = "";
    this._renderAll();
  }

  async runSelfTest() {
    return await uiSelfTest();
  }
}

// ── uiSelfTest — ohjelmallinen acceptance (Vaihe 1B + 1C) ─────────
// Avaa selaimen konsolista: await window.__wizardSelfTest()
// Palauttaa { ok, checks: [{ label, ok }], errors: [string] }.
//
// 1B-testit (state, navigation, base-validation, schema-invariantit) säilyvät.
// 1C-testit lisäävät: composite/injury-list/string-list -validointi,
// smart defaults -säännöt, conditional UI -näkyvyys, applySmartDefaults
// -käyttäytyminen olemassaolevien arvojen kanssa.

export async function uiSelfTest() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => {
    report.checks.push({ label, ok: !!cond });
    if (!cond) { report.ok = false; report.errors.push(label); }
  };

  // ─── 1B: state + navigation ─────────────────────────────────────
  const cfg = createEmptyWizardConfig();
  const store = createWizardState(cfg);
  let notified = 0;
  const unsub = store.subscribe(() => { notified++; });
  store.setAnswer("q01_age", 30);
  ck("setAnswer triggeröi listenerin", notified >= 1);
  ck("getAnswer palauttaa asetetun arvon", store.getAnswer("q01_age") === 30);

  for (let i = 0; i < WIZARD_STAGES.length - 1; i++) nextStep(store.state);
  ck(
    `nextStep liikkuu ${WIZARD_STAGES.length - 1} askelta loppuun`,
    store.state.currentStepIndex === WIZARD_STAGES.length - 1
  );
  const overshoot = nextStep(store.state);
  ck(
    "nextStep ei ylitä viimeistä vaihetta",
    overshoot === false && store.state.currentStepIndex === WIZARD_STAGES.length - 1
  );

  prevStep(store.state);
  ck("prevStep liikuttaa askel taaksepäin", store.state.currentStepIndex === WIZARD_STAGES.length - 2);
  for (let i = 0; i < 20; i++) prevStep(store.state);
  ck("prevStep ei alittaa nollaa", store.state.currentStepIndex === 0);

  // ─── 1B: validation ─────────────────────────────────────────────
  store.state.currentStepIndex = 0;
  const v0 = validateCurrentStep(store.state);
  ck(
    "validateCurrentStep havaitsee puuttuvan q02_sex",
    !v0.isValid && v0.errors.some(e => e.questionId === "q02_sex")
  );

  store.setAnswer("q02_sex", "male");
  store.setAnswer("q03_weight", 91);
  const v0b = validateCurrentStep(store.state);
  ck("validateCurrentStep läpäisee kun pakolliset täytetty", v0b.isValid);

  store.setAnswer("q01_age", 200);
  const v0c = validateCurrentStep(store.state);
  ck(
    "validateCurrentStep havaitsee range-virheen",
    !v0c.isValid && v0c.errors.some(e => e.questionId === "q01_age")
  );
  store.setAnswer("q01_age", 30);

  // ─── 1D: schema-invariantit (30 kysymystä, 8 vaihetta) ──────────
  ck("WIZARD_QUESTIONS.length = 30", WIZARD_QUESTIONS.length === 30);
  ck("WIZARD_STAGES.length = 8", WIZARD_STAGES.length === 8);
  ck("SCHEMA_INVARIANTS.totalQuestions = 30", SCHEMA_INVARIANTS.totalQuestions === 30);
  ck("SCHEMA_INVARIANTS.schemaVersion = 3.3", SCHEMA_INVARIANTS.schemaVersion === "3.3");

  goToStep(store.state, 3);
  ck("goToStep liikuttaa annettuun indeksiin", store.state.currentStepIndex === 3);
  const bad = goToStep(store.state, 99);
  ck("goToStep hylkää virheellisen indeksin", bad === false && store.state.currentStepIndex === 3);

  // ─── 1C: Composite-validointi ───────────────────────────────────
  // q24_frequency on viimeisellä vaiheella (loading, idx 7 uudessa 8-vaiheen
  // rakenteessa). Asetetaan loading-vaiheen tarvitsema data + sub-field-validointi.
  const loadingIdx = WIZARD_STAGES.findIndex(s => s.id === "loading");
  goToStep(store.state, loadingIdx);
  store.setAnswer("q23_volumePref", "auto");
  store.setAnswer("q25_rpePrecision", "vara_loose");

  store.setAnswer("q24_frequency", undefined);
  const vComp1 = validateCurrentStep(store.state);
  ck(
    "composite-required: tyhjä q24 ei läpäise",
    !vComp1.isValid && vComp1.errors.some(e => e.questionId === "q24_frequency")
  );

  store.setAnswer("q24_frequency", { daysPerWeek: 4 });
  const vComp2 = validateCurrentStep(store.state);
  ck(
    "composite-required: puuttuva sub-field havaitaan",
    !vComp2.isValid && vComp2.errors.some(e => e.questionId === "q24_frequency" && e.subFieldId === "sessionLengthMinutes")
  );

  store.setAnswer("q24_frequency", { daysPerWeek: 10, sessionLengthMinutes: 90 });
  const vComp3 = validateCurrentStep(store.state);
  ck(
    "composite range-virhe havaitaan sub-fieldissä",
    !vComp3.isValid && vComp3.errors.some(e => e.subFieldId === "daysPerWeek")
  );

  store.setAnswer("q24_frequency", { daysPerWeek: 4, sessionLengthMinutes: 90 });
  const vComp4 = validateCurrentStep(store.state);
  ck("composite läpäisee kun molemmat sub-fieldit kunnossa", vComp4.isValid);

  // ─── 1C: Conditional UI (q15 → q16 näkyvyys) ────────────────────
  // metrics on idx 5 uudessa 8-vaiheen rakenteessa.
  const metricsIdx = WIZARD_STAGES.findIndex(s => s.id === "metrics");
  goToStep(store.state, metricsIdx);
  store.setAnswer("q15_aerobicModality", "none");
  store.setAnswer("q17_equipment", ["barbell_rack"]);
  store.setAnswer("q18_hrvDevice", "none");
  store.setAnswer("q19_vbtDevice", "none");
  store.setAnswer("q20_sleepTracker", "none");
  const answersWhenNone = store.state.config.answers;
  const q16schema = WIZARD_QUESTIONS.find(q => q.id === "q16_aerobicVolume");
  ck("evaluateVisible: q16 piilossa kun q15=none", evaluateVisible(q16schema, answersWhenNone) === false);
  const vCond1 = validateCurrentStep(store.state);
  ck("conditional: q15=none salli vaiheen ilman q16:tä", vCond1.isValid);

  store.setAnswer("q15_aerobicModality", "running");
  ck("evaluateVisible: q16 näkyvissä kun q15=running", evaluateVisible(q16schema, store.state.config.answers) === true);
  const vCond2 = validateCurrentStep(store.state);
  ck(
    "conditional: q15=running vaatii q16:n",
    !vCond2.isValid && vCond2.errors.some(e => e.questionId === "q16_aerobicVolume")
  );

  store.setAnswer("q16_aerobicVolume", { frequencyPerWeek: 3, durationMinutes: 45, sameSession: false });
  store.setAnswer("q15_aerobicModality", "none");
  const q16After = store.getAnswer("q16_aerobicVolume");
  ck(
    "conditional: piilotetun q16:n vastaus säilyy state:ssa",
    q16After && q16After.frequencyPerWeek === 3 && q16After.durationMinutes === 45
  );

  // ─── 1C: Smart defaults — säännöt (puhtaat funktiot) ────────────
  ck("rule q07: beginner+1v → 0",        SMART_DEFAULT_RULES.q07_autoregYears({ q06_yearsTraining: 1, q08_selfLevel: "beginner" }) === 0);
  ck("rule q07: edistynyt+10v → 8",       SMART_DEFAULT_RULES.q07_autoregYears({ q06_yearsTraining: 10, q08_selfLevel: "advanced" }) === 8);
  ck("rule q07: elite+5v → 3",            SMART_DEFAULT_RULES.q07_autoregYears({ q06_yearsTraining: 5, q08_selfLevel: "elite" }) === 3);
  ck("rule q14: aina 'no'",               SMART_DEFAULT_RULES.q14_cutting({}) === "no");
  ck("rule q15: powerlifting → none",     SMART_DEFAULT_RULES.q15_aerobicModality({ q09_sport: "powerlifting" }) === "none");
  ck("rule q15: sport → undefined",        SMART_DEFAULT_RULES.q15_aerobicModality({ q09_sport: "sport" }) === undefined);
  ck("rule q23: elite+no-cut → MAV",      SMART_DEFAULT_RULES.q23_volumePref({ q08_selfLevel: "elite", q14_cutting: "no" }) === "MAV");
  ck("rule q23: elite+cut → MEV",         SMART_DEFAULT_RULES.q23_volumePref({ q08_selfLevel: "elite", q14_cutting: "yes" }) === "MEV");
  ck("rule q25: autoreg ≥ 3v → calibrated", SMART_DEFAULT_RULES.q25_rpePrecision({ q07_autoregYears: 5 }) === "vara_calibrated");
  ck("rule q25: autoreg < 3v → loose",     SMART_DEFAULT_RULES.q25_rpePrecision({ q07_autoregYears: 1 }) === "vara_loose");

  // ─── 1C: applySmartDefaults — runtime-käyttäytyminen ────────────
  const cfgFresh = createEmptyWizardConfig();
  const storeFresh = createWizardState(cfgFresh);
  const applied1 = applySmartDefaults(storeFresh);
  ck("applySmartDefaults asettaa 1A:n staattisen q22=[] tyhjälle storelle",
     applied1.has("q22_avoidedExercises") && Array.isArray(storeFresh.getAnswer("q22_avoidedExercises")));
  ck("applySmartDefaults: q14 saa 'no' säännön kautta",
     storeFresh.getAnswer("q14_cutting") === "no");
  ck("applySmartDefaults: q23 saa 'auto'-fallback ennen q08-vastausta",
     applied1.has("q23_volumePref") && storeFresh.getAnswer("q23_volumePref") === "auto");

  storeFresh.setAnswer("q08_selfLevel", "elite");
  const applied2 = applySmartDefaults(storeFresh, applied1);
  ck("applySmartDefaults: profiilipohjainen sääntö korvaa staattisen fallback:n",
     applied2.has("q23_volumePref") && storeFresh.getAnswer("q23_volumePref") === "MAV");

  storeFresh.setAnswer("q23_volumePref", "MRV");
  const appliedAfterUserEdit = new Set(applied2);
  appliedAfterUserEdit.delete("q23_volumePref");
  const applied3 = applySmartDefaults(storeFresh, appliedAfterUserEdit);
  ck("applySmartDefaults EI korvaa käyttäjän ylikirjoitusta",
     storeFresh.getAnswer("q23_volumePref") === "MRV" && !applied3.has("q23_volumePref"));

  // ════════════════════════════════════════════════════════════════
  // ─── 1D: Uudet kysymykset + skipIfMainAppHas + smart defaults ───
  // ════════════════════════════════════════════════════════════════

  // ─── 1D: q26-q30 ovat skeemassa ────────────────────────────────
  ck("schema sisältää q26_personalRecords (pr-list)",
     WIZARD_QUESTIONS.some(q => q.id === "q26_personalRecords" && q.type === "pr-list"));
  ck("schema sisältää q27_targetDate (date)",
     WIZARD_QUESTIONS.some(q => q.id === "q27_targetDate" && q.type === "date"));
  ck("schema sisältää q28_targetType (radio, requiredIf isSet)",
     WIZARD_QUESTIONS.some(q => q.id === "q28_targetType" && q.requiredIf && q.requiredIf.isSet === true));
  ck("schema sisältää q29_recentBlock (radio, skipIfMainAppHas mesocycles)",
     WIZARD_QUESTIONS.some(q => q.id === "q29_recentBlock" && q.skipIfMainAppHas && q.skipIfMainAppHas.store === "mesocycles"));
  ck("schema sisältää q30_energyBudget (composite, requiredIf q14=yes)",
     WIZARD_QUESTIONS.some(q => q.id === "q30_energyBudget" && q.type === "composite" &&
       q.requiredIf && q.requiredIf.equals === "yes"));

  // ─── 1D: performance-vaihe ─────────────────────────────────────
  ck("performance-vaihe (D16) on WIZARD_STAGES:ssa",
     WIZARD_STAGES.some(s => s.id === "performance" && s.dimensions.includes("D16")));
  ck("experience-vaihe sisältää D18 (aiempi blokki)",
     WIZARD_STAGES.find(s => s.id === "experience").dimensions.includes("D18"));
  ck("goals-vaihe sisältää D17 (kisapäivä)",
     WIZARD_STAGES.find(s => s.id === "goals").dimensions.includes("D17"));

  // ─── 1D: skipIfMainAppHas (q26 + q29) ──────────────────────────
  const q26 = WIZARD_QUESTIONS.find(q => q.id === "q26_personalRecords");
  const q29 = WIZARD_QUESTIONS.find(q => q.id === "q29_recentBlock");
  const mainAppEmpty = { canRead: true, hasMovementProgress: false, hasMesocycles: false };
  const mainAppExisting = { canRead: true, hasMovementProgress: true, hasMesocycles: true };

  ck("evaluateVisible: q26 näkyvä kun mainApp ei ole alustettu",
     evaluateVisible(q26, {}, null) === true);
  ck("evaluateVisible: q26 näkyvä kun hasMovementProgress=false",
     evaluateVisible(q26, {}, mainAppEmpty) === true);
  ck("evaluateVisible: q26 PIILOSSA kun hasMovementProgress=true",
     evaluateVisible(q26, {}, mainAppExisting) === false);
  ck("evaluateVisible: q29 näkyvä kun hasMesocycles=false",
     evaluateVisible(q29, {}, mainAppEmpty) === true);
  ck("evaluateVisible: q29 PIILOSSA kun hasMesocycles=true",
     evaluateVisible(q29, {}, mainAppExisting) === false);

  // ─── 1D: requiredIf isSet — q28 ────────────────────────────────
  const q28 = WIZARD_QUESTIONS.find(q => q.id === "q28_targetType");
  ck("evaluateConditional q28: q27 tyhjä → ei näy, ei pakollinen",
     evaluateConditional(q28, {}).visible === false);
  ck("evaluateConditional q28: q27 annettu → näkyvä + pakollinen",
     evaluateConditional(q28, { q27_targetDate: "2026-08-15" }).visible === true &&
     evaluateConditional(q28, { q27_targetDate: "2026-08-15" }).required === true);

  // ─── 1D: q30 requiredIf q14=yes ───────────────────────────────
  const q30 = WIZARD_QUESTIONS.find(q => q.id === "q30_energyBudget");
  ck("evaluateConditional q30: q14=no → ei näy", evaluateConditional(q30, { q14_cutting: "no" }).visible === false);
  ck("evaluateConditional q30: q14=yes → näkyvä", evaluateConditional(q30, { q14_cutting: "yes" }).visible === true);

  // ─── 1D: pr-list validointi (data.js:n validateWizardConfig kautta) ───
  const cfgPr = createEmptyWizardConfig();
  cfgPr.answers.q01_age = 30; cfgPr.answers.q02_sex = "male"; cfgPr.answers.q03_weight = 91;
  cfgPr.answers.q06_yearsTraining = 15; cfgPr.answers.q08_selfLevel = "elite"; cfgPr.answers.q09_sport = "streetlifting";
  cfgPr.answers.q29_recentBlock = "intensification";
  cfgPr.answers.q12_primaryGoal = "max_1RM"; cfgPr.answers.q14_cutting = "no";
  cfgPr.answers.q15_aerobicModality = "none"; cfgPr.answers.q17_equipment = ["barbell_rack"];
  cfgPr.answers.q18_hrvDevice = "none"; cfgPr.answers.q19_vbtDevice = "none"; cfgPr.answers.q20_sleepTracker = "none";
  cfgPr.answers.q21_splitPreference = "upper_lower"; cfgPr.answers.q23_volumePref = "MAV";
  cfgPr.answers.q24_frequency = { daysPerWeek: 4, sessionLengthMinutes: 90 };
  cfgPr.answers.q25_rpePrecision = "vara_calibrated";
  cfgPr.answers.q26_personalRecords = [
    { movementId: "fb_backsquat", movementName: "Takakyykky", loadType: "external", weightKg: 185, reps: 3 },
    { movementId: "fb_addedweight_pullup", movementName: "Lisäpainoleuanveto", loadType: "system", weightKg: 85, reps: 1 },
    { movementId: "fb_front_lever", movementName: "Front Lever", loadType: "isometric_hold", holdSeconds: 12 },
  ];
  const vPrAll = validateWizardConfig(cfgPr);
  ck("pr-list: 3 validia (external+system+isometric) ei tuota virhettä",
     vPrAll.errors.every(e => e.questionId !== "q26_personalRecords"));

  cfgPr.answers.q26_personalRecords = [
    { movementId: "fb_backsquat", loadType: "external", reps: 3 }, // weightKg puuttuu
  ];
  const vPrBad = validateWizardConfig(cfgPr);
  ck("pr-list: external ilman weightKg havaitaan",
     vPrBad.errors.some(e => e.questionId === "q26_personalRecords"));

  cfgPr.answers.q26_personalRecords = [
    { movementId: "fb_front_lever", loadType: "isometric_hold", holdSeconds: 300 }, // yli max 180
  ];
  const vPrRange = validateWizardConfig(cfgPr);
  ck("pr-list: holdSeconds yli max 180 havaitaan",
     vPrRange.errors.some(e => e.questionId === "q26_personalRecords"));

  // ─── 1D: date validointi ────────────────────────────────────
  const dateUI1 = validateDateUI("2026-08-15", { minDaysFromNow: 14, maxDaysFromNow: 365 });
  ck("date: 2026-08-15 (kauempana kuin 14 päivää) on validi", dateUI1 === null);

  const dateUI2 = validateDateUI("2026-05-12", { minDaysFromNow: 14 });
  // 2026-05-12 on yksi päivä nykypäivästä (2026-05-11 muistio currentDate) → alle 14
  ck("date: alle minDaysFromNow havaitaan",
     typeof dateUI2 === "string" && dateUI2.includes("Vähintään"));

  const dateUI3 = validateDateUI("not-a-date");
  ck("date: virheellinen muoto havaitaan", typeof dateUI3 === "string");

  // ─── 1D: 5 uutta smart-default-sääntöä ──────────────────────
  const q17Street = SMART_DEFAULT_RULES.q17_equipment({ q09_sport: "streetlifting" });
  ck("rule q17: streetlifting → [barbell_rack, pullup_bar, dip_station]",
     Array.isArray(q17Street) && q17Street.includes("barbell_rack") &&
     q17Street.includes("pullup_bar") && q17Street.includes("dip_station"));
  const q17PL = SMART_DEFAULT_RULES.q17_equipment({ q09_sport: "powerlifting" });
  ck("rule q17: powerlifting → [barbell_rack]",
     Array.isArray(q17PL) && q17PL.length === 1 && q17PL[0] === "barbell_rack");
  ck("rule q21: streetlifting + 4 päivää → upper_lower",
     SMART_DEFAULT_RULES.q21_splitPreference({ q09_sport: "streetlifting", q24_frequency: { daysPerWeek: 4 } }) === "upper_lower");
  ck("rule q21: powerlifting → fullbody",
     SMART_DEFAULT_RULES.q21_splitPreference({ q09_sport: "powerlifting" }) === "fullbody");
  ck("rule q28: q12=powerlifting → competition",
     SMART_DEFAULT_RULES.q28_targetType({ q12_primaryGoal: "powerlifting" }) === "competition");
  ck("rule q28: q12=streetlifting_with_explosive → peaking_block",
     SMART_DEFAULT_RULES.q28_targetType({ q12_primaryGoal: "streetlifting_with_explosive_components" }) === "peaking_block");
  ck("rule q28: q12=max_1RM → max_test",
     SMART_DEFAULT_RULES.q28_targetType({ q12_primaryGoal: "max_1RM" }) === "max_test");
  ck("rule q29: beginner → off_program",
     SMART_DEFAULT_RULES.q29_recentBlock({ q08_selfLevel: "beginner" }) === "off_program");
  ck("rule q29: streetlifting + 8v → intensification",
     SMART_DEFAULT_RULES.q29_recentBlock({ q08_selfLevel: "advanced", q09_sport: "streetlifting", q06_yearsTraining: 8 }) === "intensification");
  const q30CutResult = SMART_DEFAULT_RULES.q30_energyBudget({ q14_cutting: "yes" });
  ck("rule q30: cut → proteinGPerKg = 2.0",
     q30CutResult && q30CutResult.proteinGPerKg === 2.0);
  ck("rule q30: no-cut → undefined",
     SMART_DEFAULT_RULES.q30_energyBudget({ q14_cutting: "no" }) === undefined);

  // ─── 1D: applySmartDefaults mainAppState:n kanssa ──────────────
  // Kun mainAppState.hasMovementProgress=true → q26 EI saa smart-defaultia
  // (kysymys on piilossa).
  const cfgSkip = createEmptyWizardConfig();
  const storeSkip = createWizardState(cfgSkip);
  const appliedSkip = applySmartDefaults(storeSkip, new Set(), mainAppExisting);
  ck("applySmartDefaults skip-tilassa: q26 EI saa arvoa",
     !appliedSkip.has("q26_personalRecords") && storeSkip.getAnswer("q26_personalRecords") === undefined);
  ck("applySmartDefaults skip-tilassa: q29 EI saa arvoa",
     !appliedSkip.has("q29_recentBlock") && storeSkip.getAnswer("q29_recentBlock") === undefined);

  // ─── 1D: Akselin profiili — q26 + q29 ohitetaan ─────────────────
  // Simulaatio: pää-app on alustettu, atletille luodaan koko valid config
  // ja varmistetaan että wizard "läpäisee" loppuun saakka.
  const cfgAkseli = createEmptyWizardConfig();
  const storeAkseli = createWizardState(cfgAkseli);
  storeAkseli.setAnswer("q01_age", 34); storeAkseli.setAnswer("q02_sex", "male"); storeAkseli.setAnswer("q03_weight", 91);
  storeAkseli.setAnswer("q06_yearsTraining", 15); storeAkseli.setAnswer("q08_selfLevel", "elite");
  storeAkseli.setAnswer("q09_sport", "streetlifting");
  // q29 + q26 EI aseteta (pää-app data niiden tilalla)
  storeAkseli.setAnswer("q12_primaryGoal", "streetlifting_with_explosive_components");
  storeAkseli.setAnswer("q14_cutting", "no");
  // q27/q28/q30 valinnaiset
  storeAkseli.setAnswer("q15_aerobicModality", "none"); storeAkseli.setAnswer("q17_equipment", ["barbell_rack"]);
  storeAkseli.setAnswer("q18_hrvDevice", "oura"); storeAkseli.setAnswer("q19_vbtDevice", "perceptual");
  storeAkseli.setAnswer("q20_sleepTracker", "oura");
  storeAkseli.setAnswer("q21_splitPreference", "upper_lower");
  storeAkseli.setAnswer("q23_volumePref", "MAV");
  storeAkseli.setAnswer("q24_frequency", { daysPerWeek: 4, sessionLengthMinutes: 90 });
  storeAkseli.setAnswer("q25_rpePrecision", "vara_calibrated");
  const vAkseli = validateAllSteps(storeAkseli.state, mainAppExisting);
  ck("Akselin profiili (q26+q29 skip): kaikki vaiheet läpäisee", vAkseli.valid);

  // ─── 1D: requiredIf isSet — q28 vaadittu kun q27 annettu ───────
  storeAkseli.setAnswer("q27_targetDate", "2026-08-15");
  // q28 nyt pakollinen (isSet:true)
  const vAks2 = validateAllSteps(storeAkseli.state, mainAppExisting);
  ck("requiredIf isSet: q27 annettu → q28 pakollinen",
     !vAks2.valid && vAks2.errors.some(e => e.questionId === "q28_targetType"));
  storeAkseli.setAnswer("q28_targetType", "competition");
  const vAks3 = validateAllSteps(storeAkseli.state, mainAppExisting);
  ck("requiredIf isSet: q28 täytetty → kaikki vaiheet läpäisee", vAks3.valid);

  unsub();
  return report;
}
