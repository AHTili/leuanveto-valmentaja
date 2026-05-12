// wizard-schema.js — Wizard 3.3 kysymys-skeema (Track B Vaihe 1A + 1D)
// LeVe AI v4.38.9+ — 30 kysymystä, 8 vaihetta, 18 dimensiota
//
// Lähde: docs/WIZARD_SPECIFICATION_v3.3.md (Track A 100% valmis, Plews 2013
// -verifikaatio integroitu). Kysymyspuu seuraa D1–D18-dimensioita; D10
// käyttää SWC-pohjaista (0.5 × within-subject SD) viitekehystä, EI
// kiinteää −7% kynnystä (ks. docs/PLEWS_2013_VERIFICATION.md).
//
// 1D laajentaa 1A:n schemaa:
//   - 5 uutta kysymystä (q26 PR-list, q27 kisapäivä, q28 peaking-tyyppi,
//     q29 aiempi blokki, q30 energiabudjetti)
//   - Uusi 8. vaihe "Voimataso (PR:t)" performance-stage
//   - 3 uutta dimensiota: D16 (PR:t), D17 (kisapäivä), D18 (aiempi blokki)
//   - Uudet kysymystyypit: pr-list, date
//   - Uusi requiredIf-ehto: isSet (true|false) — selkeämpi kuin
//     `notEquals: undefined` joka on JSON-serialisaatiossa epävakaa.
//   - skipIfMainAppHas-ehto: kysymyksen ohittaminen kun pää-sovelluksen
//     LeVeCoachDB:ssä on jo riittävä data (movementProgress / mesocycles)
//
// TÄRKEÄ SUUNNITTELUPÄÄTÖS Phase 1A:lle (säilyy 1D:ssä):
// Tämä skeema KERÄÄ raw-datan käyttäjältä. Engine-mappaus (signaalien
// tulkinta, kynnysarvot, deload-triggerit) on Vaihe 1B/1C/Vaihe 2 -työ.
// Phase 1A:ssa EI hardkoodata yhtään verifioimatonta numerokynnystä.
// Verifioidut menetelmäreferenssit (SWC-formula, 7-day rolling mean)
// dokumentoidaan THRESHOLD_METHODS-objektissa pelkkinä viittauksina,
// ei käyttöönotettuina lukuina.
//
// Wizard 3.3:n smart-defaultit (proteiini 2.0 g/kg cut-vaiheessa,
// deficit 350 kcal) ovat verifioituja (Helms 2014, Helms 2018) —
// ks. spec §6.3 ja docs/WIZARD_SPECIFICATION_v3.3.md.

export const WIZARD_SCHEMA_VERSION = "3.3";

// ── Vaiheet (8 kpl, 1D lisää performance-vaiheen) ──
// performance (idx 3 / order 4) on UUSI 1D:ssä. Stage voi olla kokonaan
// skipattu olemassa olevalle käyttäjälle jos q26.skipIfMainAppHas täyttyy
// (movementProgress sisältää ≥3 baselinea). Progress-bar laajenee 7→8
// segmenttiin uudelle käyttäjälle; olemassa olevalle palautuu 7 koska
// performance-stage on tyhjä.
//
// experience saa +D18 (aiempi blokki, q29), goals saa +D17 (kisapäivä, q27).
export const WIZARD_STAGES = [
  { id: "profile",      titleFi: "Profiili",                  order: 1, dimensions: ["D1"] },
  { id: "experience",   titleFi: "Kokemus ja laji",           order: 2, dimensions: ["D2", "D3", "D18"] },
  { id: "constraints",  titleFi: "Vammat ja rajoitukset",     order: 3, dimensions: ["D4"] },
  { id: "performance",  titleFi: "Voimataso (PR:t)",          order: 4, dimensions: ["D16"] },
  { id: "goals",        titleFi: "Tavoitteet",                order: 5, dimensions: ["D5", "D6", "D7", "D17"] },
  { id: "metrics",      titleFi: "Kalusto ja mittarit",       order: 6, dimensions: ["D8", "D9", "D10"] },
  { id: "movements",    titleFi: "Liikevalinnat",             order: 7, dimensions: ["D11", "D12"] },
  { id: "loading",      titleFi: "Volyymi, frekvenssi, RPE",  order: 8, dimensions: ["D13", "D14", "D15"] },
];

// ── 30 kysymystä jaettuna vaiheisiin ──
// Jokaisella kysymyksellä: id, stage, dimension, type, required, options/range,
// smartDefault (staattinen — varsinaiset profiili-pohjaiset defaultit Phase 1C+1D),
// labelFi (käyttäjälle näkyvä teksti — selkeää suomea, EI tutkijaviittauksia,
// vrt. feedback_ui_no_research_names.md).
//
// 1D:n uudet kysymykset:
//   - q26_personalRecords: stage "performance", type "pr-list", skipIfMainAppHas
//   - q27_targetDate:      stage "goals",       type "date",    minDaysFromNow 14
//   - q28_targetType:      stage "goals",       type "radio",   requiredIf q27 isSet
//   - q29_recentBlock:     stage "experience",  type "radio",   skipIfMainAppHas
//   - q30_energyBudget:    stage "goals",       type "composite", requiredIf q14 = "yes"
export const WIZARD_QUESTIONS = [
  // ─── Vaihe 1: Profiili (D1, 5 kysymystä) ─────────────────────────────
  {
    id: "q01_age", stage: "profile", dimension: "D1",
    type: "number", labelFi: "Ikä (vuosia)",
    range: { min: 13, max: 90 }, required: true,
  },
  {
    id: "q02_sex", stage: "profile", dimension: "D1",
    type: "radio", labelFi: "Sukupuoli",
    options: [
      { value: "male",   labelFi: "Mies" },
      { value: "female", labelFi: "Nainen" },
      { value: "other",  labelFi: "Muu / en halua kertoa" },
    ],
    required: true,
  },
  {
    id: "q03_weight", stage: "profile", dimension: "D1",
    type: "number", labelFi: "Paino (kg)",
    range: { min: 30, max: 250 }, step: 0.1, required: true,
  },
  {
    id: "q04_height", stage: "profile", dimension: "D1",
    type: "number", labelFi: "Pituus (cm)",
    range: { min: 120, max: 230 }, required: false,
  },
  {
    id: "q05_bodyfat", stage: "profile", dimension: "D1",
    type: "number", labelFi: "Rasvaprosentti (jos tiedossa)",
    range: { min: 3, max: 60 }, required: false,
    helperFi: "Vaikuttaa proteiinitarpeen arvioon. Jätä tyhjäksi jos et tiedä.",
  },

  // ─── Vaihe 2: Kokemus ja laji (D2 + D3 + D18, 5 kysymystä) ───────────
  {
    id: "q06_yearsTraining", stage: "experience", dimension: "D2",
    type: "number", labelFi: "Kuinka monta vuotta olet treenannut säännöllisesti?",
    range: { min: 0, max: 60 }, required: true,
  },
  {
    id: "q07_autoregYears", stage: "experience", dimension: "D2",
    type: "number", labelFi: "Kuinka monta vuotta olet käyttänyt autoregulaatiota (RPE/RIR/velocity)?",
    range: { min: 0, max: 30 }, required: false, smartDefault: 0,
    helperFi: "0 jos et ole käyttänyt RPE- tai RIR-asteikkoa systemaattisesti.",
  },
  {
    id: "q08_selfLevel", stage: "experience", dimension: "D2",
    type: "radio", labelFi: "Oma arviosi tasostasi",
    options: [
      { value: "beginner",     labelFi: "Aloittelija (alle 1 v)" },
      { value: "intermediate", labelFi: "Keskitaso (1–3 v)" },
      { value: "advanced",     labelFi: "Edistynyt (3–8 v)" },
      { value: "elite",        labelFi: "Kilpataso / huippu (8+ v)" },
    ],
    required: true,
  },
  {
    id: "q09_sport", stage: "experience", dimension: "D3",
    type: "radio", labelFi: "Päälaji",
    options: [
      { value: "powerlifting",   labelFi: "Voimanosto" },
      { value: "streetlifting",  labelFi: "Streetlifting" },
      { value: "hypertrophy",    labelFi: "Lihasmassa (bodybuilding)" },
      { value: "sport",          labelFi: "Muu urheilu (taustaharjoittelu)" },
      { value: "hybrid",         labelFi: "Yhdistelmä" },
    ],
    required: true,
  },
  // 1D uusi: aiempi blokki / treenitausta (D18). Skip jos pää-app:in mesocycles
  // sisältää aktiivisen meson (käyttäjä on jo strukturoidussa ohjelmassa).
  {
    id: "q29_recentBlock", stage: "experience", dimension: "D18",
    type: "radio", labelFi: "Mistä treenivaiheesta olet juuri tulossa?",
    required: true,
    skipIfMainAppHas: {
      store: "mesocycles",
      minCount: 1,
      minFieldCount: { active: true },
    },
    options: [
      { value: "hypertrophy",     labelFi: "Hypertrofia / lihasmassa" },
      { value: "strength",        labelFi: "Voima / 5×5-tyyli" },
      { value: "intensification", labelFi: "Intensifikaatio / 80–90% työ" },
      { value: "peaking",         labelFi: "Peaking (juuri kisa/testaus)" },
      { value: "deload",          labelFi: "Deload tai pidempi tauko" },
      { value: "off_program",     labelFi: "Ei rakenteellista ohjelmaa" },
    ],
    helperFi: "Tämä vaikuttaa siihen mistä blokista uusi ohjelma alkaa. " +
              "Esim. peakingin jälkeen LeVe aloittaa hypertrofialla, ei toisella peakingilla.",
  },

  // ─── Vaihe 3: Vammat ja rajoitukset (D4, 2 kysymystä) ────────────────
  {
    id: "q10_trainingBreakMonths", stage: "constraints", dimension: "D4",
    type: "number", labelFi: "Edellinen pitempi treenitauko (kk)",
    range: { min: 0, max: 120 }, required: false, smartDefault: 0,
    helperFi: "0 jos ei ole ollut yli kuukauden taukoa viimeisen vuoden aikana.",
  },
  {
    id: "q11_injuries", stage: "constraints", dimension: "D4",
    type: "injury-list", labelFi: "Vammat tai liikerajoitukset",
    required: false,
    helperFi: "Lisää nykyinen vammat ja kerro vaikuttaako se kategorisesti (ehdoton kielto) vai liikettä muokaten.",
    schema: {
      area:  { type: "string", labelFi: "Alue (esim. olkapää, polvi, alaselkä)" },
      type:  { type: "enum", values: ["absolute", "modified"], labelFi: "Rajoitustyyppi" },
      note:  { type: "string", labelFi: "Lisätieto" },
    },
  },

  // ─── Vaihe 4: Voimataso (D16, 1 kysymys) — UUSI 1D:ssä ───────────────
  // Skip jos pää-app:in movementProgress sisältää ≥3 movementia joilla e1RM > 0
  // (käyttäjä on jo tehnyt cal-session ja PR:t ovat ohjelmassa). Tällöin koko
  // performance-stage on tyhjä eikä näy progress-barissa.
  {
    id: "q26_personalRecords", stage: "performance", dimension: "D16",
    type: "pr-list",
    labelFi: "Henkilökohtaiset ennätykset (PR:t) — anna 1–5 päämittaa",
    required: false,
    skipIfMainAppHas: {
      store: "movementProgress",
      minCount: 3,
      minFieldCount: { e1RM: 1 },
    },
    // Item-rivien rakenne. Validointi tehdään wizard-data.js:n
    // validateWizardConfig:ssa loadType:n mukaan (conditional fields).
    itemSchema: {
      movementId:    { type: "string",                                                             labelFi: "Liike" },
      movementName:  { type: "string",                                                             labelFi: "Liikkeen nimi" },
      loadType:      { type: "enum", values: ["external", "system", "isometric_hold"],            labelFi: "Kuorma-tyyppi" },
      weightKg:      { type: "number", range: { min: 0,   max: 500 }, requiredIf: { field: "loadType", in: ["external", "system"] },   labelFi: "Paino (kg)" },
      reps:          { type: "number", range: { min: 1,   max: 30  }, requiredIf: { field: "loadType", in: ["external", "system"] },   labelFi: "Toistot" },
      holdSeconds:   { type: "number", range: { min: 1,   max: 180 }, requiredIf: { field: "loadType", equals: "isometric_hold" },     labelFi: "Pidon kesto (s)" },
      addedWeightKg: { type: "number", range: { min: 0,   max: 100 },                                                                  labelFi: "Lisäpaino isometric:ssa (kg, valinnainen)" },
      dateISO:       { type: "date",                                                                                                   labelFi: "Päivä (jos tiedossa)" },
    },
    helperFi: "Anna 1–5 päämittaa joiden PR:t tiedät. LeVe käyttää nämä %1RM-suosituksiin.\n" +
              "Jos olet jo tehnyt LeVe:llä kalibrointi-session, voit jättää tämän tyhjäksi — LeVe lukee PR:t ohjelmasta.\n" +
              "Vinkki: 1-toiston max EI tarvita — voit antaa esim. 'penkki 140 kg × 5'.\n" +
              "Calisthenics-pidot (Front Lever, Planche): valitse kuorma-tyypiksi 'staattinen pito' ja anna pidon kesto sekunteina.",
    uiHints: {
      presetSuggestions: ["competitionLifts"],
      maxItems: 5,
    },
  },

  // ─── Vaihe 5: Tavoitteet (D5 + D6 + D7 + D17, 5 kysymystä) ───────────
  {
    id: "q12_primaryGoal", stage: "goals", dimension: "D5",
    type: "radio", labelFi: "Päätavoite seuraavalle 8–16 viikolle",
    options: [
      { value: "max_1RM",                                labelFi: "Maksimivoima (1RM nousu)" },
      { value: "hypertrophy",                            labelFi: "Lihasmassa" },
      { value: "powerlifting",                           labelFi: "Voimanostokisa" },
      { value: "streetlifting_with_explosive_components", labelFi: "Streetlifting (sis. räjähtävää työtä)" },
      { value: "power_output",                           labelFi: "Räjähtävä voima / nopeus" },
      { value: "sport_RFD",                              labelFi: "Lajin RFD-kehitys" },
      { value: "general_strength",                       labelFi: "Yleinen voima ja terveys" },
    ],
    required: true,
  },
  {
    id: "q13_secondaryGoal", stage: "goals", dimension: "D6",
    type: "radio", labelFi: "Sivutavoite (jos eri kuin päätavoite)",
    options: [
      { value: "none",          labelFi: "Ei sivutavoitetta" },
      { value: "hypertrophy",   labelFi: "Lihasmassa" },
      { value: "endurance",     labelFi: "Kestävyys" },
      { value: "fat_loss",      labelFi: "Rasvanpudotus" },
      { value: "mobility",      labelFi: "Liikkuvuus" },
    ],
    required: false, smartDefault: "none",
  },
  {
    id: "q14_cutting", stage: "goals", dimension: "D7",
    type: "radio", labelFi: "Oletko aktiivisessa cut-vaiheessa (energiavaje)?",
    options: [
      { value: "yes", labelFi: "Kyllä" },
      { value: "no",  labelFi: "Ei" },
    ],
    required: true,
  },
  // 1D uusi: kisapäivä (D17). Valinnainen — jos annettu, q28 aktivoituu.
  // Range minDaysFromNow / maxDaysFromNow rajaa peaking-blokin mielekkääksi
  // (alle 2 vk → ei periodisointia, yli 1 vuosi → liian kauas suunniteltavaksi).
  {
    id: "q27_targetDate", stage: "goals", dimension: "D17",
    type: "date", labelFi: "Onko sinulla kisa- tai testauspäivä jonka haluat tähdätä?",
    required: false,
    helperFi: "Kun annat päivän, LeVe ankkuroi peaking-blokin loppuun. " +
              "Jätä tyhjäksi jos ei deadlinea — ohjelma käyttää vakio-blokkeja.",
    range: {
      minDaysFromNow: 14,
      maxDaysFromNow: 365,
    },
  },
  // 1D uusi: peaking-tyyppi (D17). Pakollinen vain jos q27 on annettu.
  // HUOM: requiredIf käyttää uutta isSet-ehtoa (3.3:ssa lisätty 1A:n
  // equals/notEquals-syntaksin täydennykseksi). isSet:true = "vaadittu kun
  // refVal on määritelty (ei undefined/null/tyhjä string)". Tämä on selkeämpi
  // kuin spec:n alkuperäinen `notEquals: undefined` joka on JSON-undefined
  // -epävakauden takia ongelmallinen.
  {
    id: "q28_targetType", stage: "goals", dimension: "D17",
    type: "radio", labelFi: "Mikä on tavoitepäivän luonne?",
    required: true,
    requiredIf: { questionId: "q27_targetDate", isSet: true },
    options: [
      { value: "competition",       labelFi: "Kilpailu" },
      { value: "max_test",          labelFi: "1RM-testaus" },
      { value: "peaking_block",     labelFi: "Henkilökohtainen peaking-blokki" },
      { value: "intermediate_test", labelFi: "Välitesti (ei lopullinen peaking)" },
    ],
  },
  // 1D uusi: energiabudjetti (D7, q14:n laajennus). Pakollinen vain jos
  // q14 = "yes" (cut-vaihe). q14:n säilyy yes/no — q30 EI korvaa sitä,
  // vaan kerää tarkemmat numerot kun cut on aktiivinen.
  {
    id: "q30_energyBudget", stage: "goals", dimension: "D7",
    type: "composite", labelFi: "Energiabudjetti tarkemmin",
    required: true,
    requiredIf: { questionId: "q14_cutting", equals: "yes" },
    fields: [
      { id: "deficitKcal",         type: "number", labelFi: "Päivittäinen energiavaje (kcal)",   range: { min: 100, max: 1000 }, step: 50 },
      { id: "proteinGPerKg",       type: "number", labelFi: "Proteiinin tavoite (g/kg)",          range: { min: 1.0, max: 3.5  }, step: 0.1 },
      { id: "weeklyWeightLossKg",  type: "number", labelFi: "Tavoiteltu painonpudotus (kg/vk)",   range: { min: 0.2, max: 1.5  }, step: 0.1 },
    ],
    helperFi: "Aggressiivinen vaje (>500 kcal) vaatii enemmän volyymileikkausta " +
              "kuin lievä. Anna paras arvio — LeVe säätää volyymin näiden pohjalta.",
  },

  // ─── Vaihe 6: Kalusto ja mittarit (D8 + D9 + D10, 6 kysymystä) ──────
  {
    id: "q15_aerobicModality", stage: "metrics", dimension: "D8",
    type: "radio", labelFi: "Teetkö aerobista harjoittelua voimaharjoittelun rinnalla?",
    options: [
      { value: "none",      labelFi: "En tee" },
      { value: "running",   labelFi: "Juoksu" },
      { value: "cycling",   labelFi: "Pyöräily" },
      { value: "rowing",    labelFi: "Soutu" },
      { value: "swimming",  labelFi: "Uinti" },
      { value: "other",     labelFi: "Muu" },
    ],
    required: true,
  },
  {
    id: "q16_aerobicVolume", stage: "metrics", dimension: "D8",
    type: "composite", labelFi: "Aerobisen frekvenssi ja kesto",
    fields: [
      { id: "frequencyPerWeek", type: "number", labelFi: "Kertaa viikossa", range: { min: 0, max: 14 } },
      { id: "durationMinutes",  type: "number", labelFi: "Yhden kerran kesto (min)", range: { min: 0, max: 240 } },
      { id: "sameSession",      type: "boolean", labelFi: "Samassa istunnossa voiman kanssa?" },
    ],
    requiredIf: { questionId: "q15_aerobicModality", notEquals: "none" },
  },
  {
    id: "q17_equipment", stage: "metrics", dimension: "D9",
    type: "checkboxes", labelFi: "Mitä kalustoa sinulla on käytössä?",
    options: [
      { value: "barbell_rack",   labelFi: "Tanko + räkki" },
      { value: "pullup_bar",     labelFi: "Leukatanko" },
      { value: "dip_station",    labelFi: "Dippiteline" },
      { value: "cable_machine",  labelFi: "Vaijerilaite" },
      { value: "machines",       labelFi: "Yleiset kuntosalilaitteet" },
      { value: "dumbbells",      labelFi: "Käsipainot" },
      { value: "rings",          labelFi: "Renkaat / TRX" },
    ],
    required: true,
  },
  {
    id: "q18_hrvDevice", stage: "metrics", dimension: "D10",
    type: "radio", labelFi: "HRV-mittari (sykevälivaihtelu)",
    options: [
      { value: "none",            labelFi: "En seuraa" },
      { value: "oura",            labelFi: "Oura Ring" },
      { value: "garmin_polar",    labelFi: "Garmin / Polar" },
      { value: "whoop",           labelFi: "Whoop" },
      { value: "hrv4training",    labelFi: "HRV4Training" },
      { value: "other",           labelFi: "Muu" },
    ],
    required: true,
    helperFi: "LeVe käyttää yksilöllistä SWC-pohjaista vertailua (Smallest Worthwhile Change): kynnys = baseline miinus 0,5 × oma sisäinen hajonta 7 päivän liukuvasta keskiarvosta. Tämä sopeutuu sinun HRV-profiiliisi — ei kiinteä prosenttiraja. Vaatii ≥ 4 viikon baseline-keräyksen ennen kynnyksen aktivoitumista.",
  },
  {
    id: "q19_vbtDevice", stage: "metrics", dimension: "D10",
    type: "radio", labelFi: "Liikkenopeusmittari (VBT)",
    options: [
      { value: "none",        labelFi: "En mittaa" },
      { value: "enode",       labelFi: "Enode" },
      { value: "push",        labelFi: "PUSH" },
      { value: "vitruve",     labelFi: "Vitruve" },
      { value: "beast",       labelFi: "Beast" },
      { value: "perceptual",  labelFi: "Vain havainnollinen (ilman laitetta)" },
    ],
    required: true,
  },
  {
    id: "q20_sleepTracker", stage: "metrics", dimension: "D10",
    type: "radio", labelFi: "Unen seuranta",
    options: [
      { value: "none",          labelFi: "En seuraa" },
      { value: "oura",          labelFi: "Oura" },
      { value: "apple_fitbit",  labelFi: "Apple Watch / Fitbit" },
      { value: "garmin",        labelFi: "Garmin" },
      { value: "other",         labelFi: "Muu" },
    ],
    required: true,
  },

  // ─── Vaihe 7: Liikevalinnat (D11 + D12, 2 kysymystä) ─────────────────
  {
    id: "q21_splitPreference", stage: "movements", dimension: "D11",
    type: "radio", labelFi: "Mieluisin viikon jako",
    options: [
      { value: "fullbody",    labelFi: "Full body (koko keho joka treeni)" },
      { value: "upper_lower", labelFi: "Upper / Lower (ylä/ala)" },
      { value: "ppl",         labelFi: "Push / Pull / Legs" },
      { value: "broscience",  labelFi: "Lihasryhmäkohtainen jako" },
      { value: "custom",      labelFi: "Räätälöity" },
    ],
    required: true,
  },
  {
    id: "q22_avoidedExercises", stage: "movements", dimension: "D12",
    type: "string-list", labelFi: "Liikkeet joita haluat välttää (esim. kivun, mieltymyksen tai kaluston takia)",
    required: false, smartDefault: [],
    helperFi: "Yksi liike per rivi. Jätä tyhjäksi jos ei ole.",
  },

  // ─── Vaihe 8: Volyymi, frekvenssi, RPE-tarkkuus (D13 + D14 + D15, 3 kysymystä) ──
  {
    id: "q23_volumePref", stage: "loading", dimension: "D13",
    type: "radio", labelFi: "Volyymipreferenssi",
    options: [
      { value: "MEV",  labelFi: "Minimi (palautun helposti, vähän aikaa)" },
      { value: "MAV",  labelFi: "Maksimi tuotteliaisuus" },
      { value: "MRV",  labelFi: "Korkea (sietää paljon)" },
      { value: "auto", labelFi: "Anna LeVe:n säätää automaattisesti" },
    ],
    required: true, smartDefault: "auto",
  },
  {
    id: "q24_frequency", stage: "loading", dimension: "D14",
    type: "composite", labelFi: "Frekvenssi ja sessio-pituus",
    fields: [
      { id: "daysPerWeek",          type: "number", labelFi: "Treenipäiviä viikossa", range: { min: 1, max: 7 } },
      { id: "sessionLengthMinutes", type: "number", labelFi: "Yhden sessio pituus (min)", range: { min: 15, max: 240 } },
    ],
    required: true,
  },
  {
    id: "q25_rpePrecision", stage: "loading", dimension: "D15",
    type: "radio", labelFi: "Kuinka tarkka olet RPE/Vara-arviossasi?",
    options: [
      { value: "vara_loose",       labelFi: "Karkea (Vara ±2)" },
      { value: "vara_calibrated",  labelFi: "Kalibroitunut (Vara ±1)" },
      { value: "vbt_only",         labelFi: "En käytä — luotan vain VBT-mittariin" },
    ],
    required: true,
  },
  // v4.51.0 (Track B 2D-δ-C): atletin oletusvalinta-tyyli adaptiiviselle
  // multi-suggestion -näkymälle. Vastaus seedaa settings.preferredSuggestionBias:n
  // ja aggressivenessLearned:in. Engine oppii valintahistoriasta automaattisesti
  // — atletti voi vaihtaa preferenssin Asetuksista jälkikäteen.
  {
    id: "q33_aggressivenessDefault", stage: "loading", dimension: "D15",
    type: "radio", labelFi: "Mikä on harjoittelutyylisi?",
    options: [
      { value: "stable",       labelFi: "Vakaa — engine suosii varovaisempia ehdotuksia (sopii palautuvalle tai epävarmalle tilanteelle)" },
      { value: "balanced",     labelFi: "Tasapainoinen — engine valitsee kontekstin perusteella (suositus)" },
      { value: "challenging",  labelFi: "Haastava — engine suosii rohkeampia ehdotuksia (kokenut atletti, tunnet kapasiteettisi)" },
    ],
    smartDefault: "balanced",
    required: false,
  },
];

// ── Verifioidut menetelmäreferenssit (D10 SWC-kehys) ─────────────────
// PELKKIÄ VIITTAUKSIA — ei käyttöönotettuja numerokynnyksiä.
// Engine-toteutus (Vaihe 1B+) lukee tästä mitä menetelmää käyttää.
// Lähde-vetuksen tila: ks. docs/WIZARD_SPECIFICATION_v3.2.md taulukko 1.
export const THRESHOLD_METHODS = {
  hrv_deload_signal: {
    primary: {
      methodId: "swc_within_subject",
      description: "Smallest Worthwhile Change: kynnys = baseline-mean − 0,5 × within-subject SD 7-päivän liukuvasta Ln rMSSD:stä",
      requiresBaselineDays: 28,
      sources: [
        { ref: "Hopkins WG 2009 MSSE 41(1):3-13",          verification: "PDF-VERIFIOITU" },
        { ref: "Plews DJ 2013 Sports Med 43(9):773-781",    verification: "ABSTRAKTI + 10 JATKOPAPERIN RISTIINTARKISTUS" },
        { ref: "Buchheit M 2014 Front Physiol 5:73",        verification: "PDF-VERIFIOITU" },
        { ref: "Vesterinen V 2016 MSSE",                    verification: "ABSTRAKTI" },
      ],
    },
    secondary: [
      {
        methodId: "cv_trend_7day",
        description: "7-päivän liukuvan Ln rMSSD:n variation laskee tai litistyy",
        sources: [{ ref: "Plews DJ 2012 EJAP 112(11):3729-3741", verification: "ABSTRAKTI" }],
      },
      // HUOM: leposyke-sekundaari mainitaan WIZARD_SPECIFICATION_v3.2:ssa kynnyksellä
      // ">5 bpm baselinesta", mutta tarkkaa numeroa EI ole verifioitu Plews-paperista
      // (ks. docs/PLEWS_2013_VERIFICATION.md kohta B). Phase 1A kerää HR-datan
      // muttei hardkoodaa kynnystä — engine-tasolla (Vaihe 1B+) joko verifioidaan
      // numeronä tai jätetään "watch"-signaaliksi ilman tarkkaa rajaa.
      {
        methodId: "resting_hr_rise",
        description: "Leposyke nousee yli yksilön baseline-tason — tarkka numerokynnys EI VERIFIOITU",
        verificationStatus: "PENDING — älä käytä numerokynnystä ennen primaarilähde-tarkastusta",
      },
    ],
    forbidden: [
      // Tämä on dokumentoitu kielto Track B:lle: −7 % kynnys on fabrikoitu attribuutio
      // Plews 2013 -paperiin. Älä koskaan lisää tätä takaisin koodiin.
      { pattern: "−7%", reason: "FABRIKOITU — ei löydy Plews 2013 -paperista, ks. PLEWS_2013_VERIFICATION.md" },
    ],
  },
};

// ── Apufunktiot ──
export function getQuestionsForStage(stageId) {
  return WIZARD_QUESTIONS.filter(q => q.stage === stageId);
}

export function getQuestionById(qid) {
  return WIZARD_QUESTIONS.find(q => q.id === qid) || null;
}

export function getStageByOrder(order) {
  return WIZARD_STAGES.find(s => s.order === order) || null;
}

// Yht. 31 kysymystä (30 alkuperäistä + q33_aggressivenessDefault v4.51.0),
// 8 vaihetta, 18 dimensiota (D1–D18). q33 lukeutuu D15:n alle (RPE/Vara-tarkkuus
// + valintatyyli muodostavat yhdessä loading-vaiheen psyko-fysiologisen profiilin).
export const SCHEMA_INVARIANTS = {
  totalQuestions: 31,
  totalStages: 8,
  totalDimensions: 18,
  schemaVersion: WIZARD_SCHEMA_VERSION,
};
