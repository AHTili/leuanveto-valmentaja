// wizard-dump-harness.mjs — KAPSTONI pilari 3 W1-dumppi (read-only diagnostiikka)
// Ajaa Wizard-mapperin + mesosykligeneraattorin + post-process-pipelinen 8 profiilille
// ja kirjoittaa SOKKOUTETUN dumpin (ohjelmat erillään tyylivalinnoista) → docs/wizard-dump-8profiles.md.
// EI engine-muutoksia. Replikoi index.html:n finalize-ketjun (4019→4122) uskollisesti.
import { writeFileSync } from "node:fs";
globalThis.self = globalThis; // data.js IDB-tarkistus (engine-bridge-malli)

import {
  mapWizardToProgram,
  applySplitFilter, applyVolumeCap, applySessionFocusLabels, applyTierProgression,
  // Pilari 3 C2/C3: kalusto-suodatin + alaraaja-guarantor (osa index.html finalize-ketjua)
  applyEquipmentFilter, ensureLowerBody,
  // Pilari 3 R2 (A+C): aloitus-kapasiteetti-intensiteetti-degradaatio
  applyStartingCapacityDegradation,
  // Pilari 3 R2 (Cowork AUKKO 2): sessiotason slot.targetVx-propagaatio
  applyStartingCapacityToSlots,
  // Pilari 3 R2 (B): aikabudjetti rajaa työsarjat
  applyTimeBudgetCap,
  // Pilari 3 R3 (P2): hypertrofia MEV-floor + komposiitti-advisory
  applyHypertrophyMevFloor, mevTimeBudgetAdvisory,
  // Pilari 3 R2 (F): apuliike-tason vamma-suodatin
  applyInjuryFilter,
} from "../wizard/wizard-2b-mapper.js";
import { generateCustomMesocycle, generateMultiBlockMesocycle } from "../data.js";

const GEN_DATE = "2026-06-14"; // ohjelmien startDate-ankkuri (vakio → vertailukelpoisuus; EI dumpin generointipäivä)
const DUMP_DATE = "2026-06-30"; // dumpin re-generointipäivä (header) — eri kuin start-ankkuri
const APP_VERSION = "4.52.50";  // pidä synkassa sw.js APP_VERSION:in kanssa (header-tuoreusportti)

// ─────────────────────────────────────────────────────────────────────────
// 11 PROFIILIA — 33Q-vektorit. neutralNotes = persona ei määritä → neutraali/tyypillinen.
// ─────────────────────────────────────────────────────────────────────────
const profiles = [
  {
    id: "P1", persona: "Mies 28 v, <6 kk tausta, yleisvoima, täysi sali, 3 pv/vk, ei rajoitteita.",
    answers: {
      q01_age: 28, q02_sex: "male", q03_weight: 80,
      q06_yearsTraining: 0.5, q07_autoregYears: 0, q08_selfLevel: "beginner",
      q09_sport: "hybrid", q29_recentBlock: "off_program",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "general_strength", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "fullbody", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 60 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "q03_weight 80: paino ei annettu → tyypillinen mies",
      "q04/q05 (pituus/rasva-%): valinnaiset, jätetty pois",
      "q06 0.5: '<6 kk' → 0,5 vuotta",
      "q09 hybrid: 'yleisvoima' ei ole nimetty laji → hybrid (ei spesifiä lajia)",
      "q29 off_program: aloittelija ilman aiempaa rakenteellista blokkia",
      "q24 session 60 min: ei annettu → tyypillinen",
      "q21 fullbody: 3 pv yleisvoima → fullbody (ei-sl smartDefault-henki)",
      "q15/q18/q19/q20 none, q23 auto, q25 vara_loose (q07<3), q33 balanced: ei mainittu → neutraali",
    ],
  },
  {
    id: "P2", persona: "Mies 32 v, 2–3 v, hypertrofia, koti (käsipainot ≤32 kg, leuanvetotanko, kuminauhat; ei penkkiä/tankoa), 4 pv/vk.",
    answers: {
      q01_age: 32, q02_sex: "male", q03_weight: 85,
      q06_yearsTraining: 2.5, q07_autoregYears: 0, q08_selfLevel: "intermediate",
      q09_sport: "hypertrophy", q29_recentBlock: "hypertrophy",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "hypertrophy", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["dumbbells", "pullup_bar"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 60 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "q03_weight 85: ei annettu → tyypillinen",
      "q06 2.5: '2–3 v' → keskiarvo",
      "q08 intermediate: 2–3 v",
      "q29 hypertrophy: säännöllinen hypertrofia-treenaaja → tyypillinen edellinen blokki",
      "q17 [dumbbells, pullup_bar]: KUMINAUHAT ei vastaa mitään equipment-koodia (barbell_rack/pullup_bar/dip_station/cable_machine/machines/dumbbells/rings) → jätetty pois; käsipainot + leuanvetotanko mukana; EI penkkiä/tankoa",
      "q21 upper_lower: 4 pv hypertrofia → tyypillinen jako (ei mainittu)",
      "q24 session 60: ei annettu",
      "q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali",
    ],
  },
  {
    id: "P3", persona: "Mies 27 v / 75 kg, 5+ v (2 v lajispesifistä), streetlifting (painollinen leuanveto/dippi/kyykky + muscle-up), kisa 10–12 vk päässä, sali + vyöpaino, 4–5 pv/vk, edistyneet suhteelliset voimatasot.",
    answers: {
      q01_age: 27, q02_sex: "male", q03_weight: 75,
      q06_yearsTraining: 5, q07_autoregYears: 2, q08_selfLevel: "advanced",
      q09_sport: "streetlifting", q29_recentBlock: "strength",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "streetlifting_with_explosive_components", q13_secondaryGoal: "none", q14_cutting: "no",
      q27_targetDate: "2026-08-30", q28_targetType: "competition",
      q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 90 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "q07 2: '2 v lajispesifistä' → autoregulaatiovuodet ~2",
      "q29 strength: kisaan 10–12 vk → edellinen blokki tyypillisesti voima/intensifikaatio ennen peakingia",
      "q26 []: 'edistyneet suhteelliset voimatasot' mutta EI numeroita → PR-lista tyhjä (HUOM: jotkin tyylit, esim. Wendler/Sheiko, käyttävät PR-dataa precheckissä → tyhjä vaikuttaa)",
      "q27 2026-08-30: 'kisa 10–12 vk' → ~11 vk startista 2026-06-14 (≈77 pv)",
      "q24 daysPerWeek 4: '4–5 pv' → valittu 4 (alaraja); session 90 min (advanced, ei annettu)",
      "q21 upper_lower: sl 4–5 pv → smartDefault-henki (ei mainittu)",
      "q23 auto: advanced volyymipref ei mainittu",
      "q25 vara_loose: q07=2<3 → sääntö antaa vara_loose (advanced kisaaja käyttäisi ehkä calibrated — neutraali rule-mukainen)",
      "q15/q18/q19/q20 none, q33 balanced: ei mainittu → neutraali",
    ],
  },
  {
    id: "P4", persona: "Nainen 30 v / 63 kg, ~2 v, maksimivoima, täysi sali, 3–4 pv/vk.",
    answers: {
      q01_age: 30, q02_sex: "female", q03_weight: 63,
      q06_yearsTraining: 2, q07_autoregYears: 0, q08_selfLevel: "intermediate",
      q09_sport: "hybrid", q29_recentBlock: "strength",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "max_1RM", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "q06 2: '~2 v'",
      "q09 hybrid: 'maksimivoima' on tavoite, ei nimetty laji → hybrid (q12=max_1RM kantaa tavoitteen)",
      "q29 strength: max-tavoite → edellinen blokki tyypillisesti voima",
      "q24 daysPerWeek 4: '3–4 pv' → valittu 4 (yläraja); session 75 (ei annettu)",
      "q21 upper_lower: 4 pv → tyypillinen (ei mainittu)",
      "q26 []: ei PR-numeroita annettu",
      "q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali. HUOM q02=female → sexModifier (Huiberts 2024) voi aktivoitua mapperissa",
    ],
  },
  {
    id: "P5", persona: "Mies 56 v / 88 kg, epäsäännöllinen ~1 v (tauolla), terveys/voima/toimintakyky, täysi sali, 2–3 pv/vk, itse raportoitu palautumisrajoite (hidas palautuminen, työstressi, vaihteleva uni).",
    answers: {
      q01_age: 56, q02_sex: "male", q03_weight: 88,
      q06_yearsTraining: 1, q07_autoregYears: 0, q08_selfLevel: "beginner",
      q09_sport: "hybrid", q29_recentBlock: "off_program",
      q10_trainingBreakMonths: 2, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "general_strength", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "fullbody", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 2, sessionLengthMinutes: 60 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
      q34_recoveryStatus: "heikko",
    },
    neutralNotes: [
      "q06 1: 'epäsäännöllinen ~1 v'; q08 beginner (epäsäännöllinen ~1 v)",
      "q09 hybrid: terveys/toimintakyky → ei nimetty laji",
      "q29 off_program + q10 2 kk: 'tauolla' → ei aktiivista ohjelmaa, ~2 kk tauko",
      "q12 general_strength: terveys/voima/toimintakyky → yleisvoima",
      "q24 daysPerWeek 2: '2–3 pv' → valittu 2 (alaraja, palautumisrajoite); session 60",
      "q21 fullbody: 2 pv → fullbody",
      "★ PALAUTUMISRAJOITE (hidas palautuminen / työstressi / vaihteleva uni) → q34_recoveryStatus='heikko' (Pilari 3 R2 lisäsi q34-palautumiskysymyksen, 33Q). pickRecoveryCapacity → 'heikko' → applyRecoveryScalar (apuliike-volyymi −30 %) + applyStartingCapacity (aloitusintensiteetti submaks.). Aiemmin (32Q) tämä captureoitui vain epäsuorasti iästä → korjattu.",
      "q13 none (ei mobility, vaikka 'toimintakyky' voisi viitata siihen → neutraali none); q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali",
    ],
  },
  {
    id: "P6", persona: "Mies 35 v / 90 kg, 3 v, voima+massa, täysi sali, 3–4 pv/vk, krooninen olkapääkipu (kivulias kaari pystypunnerruksessa + syvässä dipissä).",
    answers: {
      q01_age: 35, q02_sex: "male", q03_weight: 90,
      q06_yearsTraining: 3, q07_autoregYears: 0, q08_selfLevel: "intermediate",
      q09_sport: "hybrid", q29_recentBlock: "strength",
      q10_trainingBreakMonths: 0,
      q11_injuries: [{ area: "olkapää", type: "modified", note: "krooninen kipu — kivulias kaari pystypunnerruksessa ja syvässä dipissä" }],
      q26_personalRecords: [],
      q12_primaryGoal: "general_strength", q13_secondaryGoal: "hypertrophy", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 75 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "q06 3; q08 intermediate (3 v)",
      "q09 hybrid: 'voima+massa' → ei nimetty laji",
      "q12 general_strength + q13 hypertrophy: 'voima+massa' → voima primary, massa secondary",
      "q29 strength: tyypillinen edellinen blokki",
      "q11 olkapää/modified: krooninen olkapääkipu kirjattu vamma-listaan (type modified, ei absolute → atletti voi treenata muokaten). Spesifit kipuliikkeet (pystypunnerrus, syvä dippi) note-kentässä",
      "q22 []: ei erikseen kiellettyjä liikkeitä — kipuliikkeet captureoituvat q11-vamman kautta (HUOM: vaihtoehtoisesti pystypunnerrus/dippi voisi listata q22:een; neutraali = luotetaan q11-vammalogiikkaan)",
      "q24 daysPerWeek 4 ('3–4' → yläraja); session 75",
      "q21 upper_lower (4 pv); q15/q18/q19/q20 none, q23 auto, q25 vara_loose, q33 balanced: neutraali",
    ],
  },
  {
    id: "P7", persona: "(known-negative A) Mies 19 v / 72 kg, 2 kk tausta, toive: 'maksimivoima nopeasti' + halu 6–7 pv/vk + raskaat maksiminostot, korkea motivaatio, ei rajoitteita.",
    answers: {
      q01_age: 19, q02_sex: "male", q03_weight: 72,
      q06_yearsTraining: 0.2, q07_autoregYears: 0, q08_selfLevel: "beginner",
      q09_sport: "powerlifting", q29_recentBlock: "off_program",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "max_1RM", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["barbell_rack", "pullup_bar", "dip_station", "cable_machine", "machines", "dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "ppl", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 6, sessionLengthMinutes: 60 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "challenging",
    },
    neutralNotes: [
      "q06 0.2: '2 kk' → ~0,17–0,2 v; q08 beginner",
      "q09 powerlifting: 'raskaat maksiminostot' + max-tavoite → max-voimalaji",
      "q29 off_program: 2 kk, juuri aloittanut",
      "q12 max_1RM: 'maksimivoima nopeasti'",
      "q24 daysPerWeek 6: 'halu 6–7 pv' → valittu 6 (alaraja)",
      "q21 ppl: 6 pv korkea frekvenssi → tyypillinen jako (ei mainittu)",
      "q33 challenging: 'korkea motivaatio' + 'nopeasti' + 'raskaat maksiminostot' → aggressiivinen engine-bias (persona määrittää)",
      "q17 full gym: 'raskaat maksiminostot' edellyttää tankoa → täysi sali (ei eksplisiittisesti annettu)",
      "★ KNOWN-NEGATIVE: 2 kk aloittelija haluaa max-voimaa nopeasti + 6 pv/vk raskaita maksinostoja. W2 arvioi pidättääkö wizard (beginner-sopiva tyyli) vai myötäileekö ylimitoitettua syötettä.",
    ],
  },
  {
    id: "P8", persona: "(known-negative B) Nainen 41 v / 70 kg, <1 v, ristiriitainen vektori: SEKÄ kilpailutason maksimivoima ETTÄ maksimaalinen lihaskasvu nopeasti; 2 pv/vk × 30 min; ei välineitä (koti); heikko palautuminen.",
    answers: {
      q01_age: 41, q02_sex: "female", q03_weight: 70,
      q06_yearsTraining: 0.5, q07_autoregYears: 0, q08_selfLevel: "beginner",
      q09_sport: "hybrid", q29_recentBlock: "off_program",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "max_1RM", q13_secondaryGoal: "hypertrophy", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["pullup_bar"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "fullbody", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 2, sessionLengthMinutes: 30 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
      q34_recoveryStatus: "heikko",
    },
    neutralNotes: [
      "q06 0.5: '<1 v'; q08 beginner",
      "q09 hybrid: ristiriitainen tavoite → ei nimetty laji",
      "q12 max_1RM + q13 hypertrophy: 'SEKÄ kilpailutason maksimivoima ETTÄ maksimaalinen lihaskasvu' → schema pakottaa primary/secondary-jaon (q12 single-choice) → max ensisijaiseksi, hypertrofia toissijaiseksi",
      "★ q17 ['pullup_bar'] PAKOTETTU: alkuperäinen [] ('ei välineitä, koti') → wizard HYLKÄSI validoinnissa: 'q17_equipment: valitse vähintään yksi kaluston tyyppi'. DIAGNOSTINEN LÖYDÖS W2:lle: wizard EI salli tyhjää kalustoa → puhdas kehonpaino-koti ei ole ilmaistavissa. Pakotettu minimivalinta = pullup_bar (edustavin kehonpaino-koti-minimi) jotta ohjelma generoituu arvioitavaksi.",
      "q29 off_program: <1 v",
      "q24: 2 pv × 30 min (annettu)",
      "q21 fullbody (2 pv); q23 auto, q25 vara_loose, q33 balanced: neutraali",
      "★ KNOWN-NEGATIVE: 'heikko palautuminen' → q34_recoveryStatus='heikko' (Pilari 3 R2, 33Q) → pickRecoveryCapacity 'heikko' → apuliike-volyymi −30 % + aloitusintensiteetti submaks. 2×30 min/vk + ei välineitä + beginner + ristiriitainen max+hypertrofia 'nopeasti' = realistisesti mahdoton tavoiteyhdistelmä. W2 arvioi tunnistaako/käsitteleekö wizard ristiriidan + resurssirajat.",
    ],
  },
  // ─── Pilari 3 (b) KATTAVUUSLISÄYS: adversariaalin paljastamat kalusto-osajoukot ───
  // Aiemmin nämä pyyhkivät ylävartalon (0 push/pull, vain jalat). Todistavat että korjaus
  // tuottaa tasapainoisen push+legs-ohjelman + rehellisen veto-rajoite-advisoryn.
  {
    id: "P9", persona: "Mies 30 v / 85 kg, 2 v, hypertrofia, KOTI vain käsipainot (ei leukatankoa/tankoa), 4 pv/vk.",
    answers: {
      q01_age: 30, q02_sex: "male", q03_weight: 85,
      q06_yearsTraining: 2, q07_autoregYears: 0, q08_selfLevel: "intermediate",
      q09_sport: "hypertrophy", q29_recentBlock: "hypertrophy",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "hypertrophy", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["dumbbells"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "upper_lower", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 4, sessionLengthMinutes: 60 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "★ KATTAVUUSLISÄYS (b): vain käsipainot — aiemmin ylävartalo-pyyhkiytyminen (0 push/pull). Odotus: push (käsipainopenkki) + legs (Bulgarian); veto rajoittunut → rehellinen advisory.",
      "q17 ['dumbbells']: ei leukatankoa eikä tankoa → veto vaatii leukatangon/renkaat (katalogissa ei käsipaino-soutua, OBS-053)",
      "q08 intermediate (2 v); q29 hypertrophy; q21 upper_lower; muut neutraali",
    ],
  },
  {
    id: "P10", persona: "Nainen 34 v / 64 kg, 3 v, yleisvoima, KOTI vain renkaat/TRX, 3 pv/vk.",
    answers: {
      q01_age: 34, q02_sex: "female", q03_weight: 64,
      q06_yearsTraining: 3, q07_autoregYears: 0, q08_selfLevel: "intermediate",
      q09_sport: "hybrid", q29_recentBlock: "off_program",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "general_strength", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["rings"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "fullbody", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 50 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "★ KATTAVUUSLISÄYS (b): vain renkaat — renkaat mahdollistaisivat veto/työnnön, mutta katalogissa ei rengasliikkeitä (OBS-053). Degradoituu kehonpaino-push (HSPU) + legs + advisory. EI keksittyä liikettä.",
      "q17 ['rings']: aito kalusto-vuoto-tapaus jonka adversariaali löysi",
      "q12 general_strength; q21 fullbody (3 pv); muut neutraali",
    ],
  },
  {
    id: "P11", persona: "Mies 25 v / 78 kg, <1 v, yleiskunto, KOTI ei välineitä (pelkkä kehonpaino), 3 pv/vk.",
    answers: {
      q01_age: 25, q02_sex: "male", q03_weight: 78,
      q06_yearsTraining: 0.5, q07_autoregYears: 0, q08_selfLevel: "beginner",
      q09_sport: "hybrid", q29_recentBlock: "off_program",
      q10_trainingBreakMonths: 0, q11_injuries: [], q26_personalRecords: [],
      q12_primaryGoal: "general_strength", q13_secondaryGoal: "none", q14_cutting: "no",
      q15_aerobicModality: "none",
      q17_equipment: ["bodyweight"],
      q18_hrvDevice: "none", q19_vbtDevice: "none", q20_sleepTracker: "none",
      q21_splitPreference: "fullbody", q22_avoidedExercises: [], q23_volumePref: "auto",
      q24_frequency: { daysPerWeek: 3, sessionLengthMinutes: 45 },
      q31_preferredDays: [], q25_rpePrecision: "vara_loose", q33_aggressivenessDefault: "balanced",
    },
    neutralNotes: [
      "★ KATTAVUUSLISÄYS (b): 'bodyweight' (C4:n lisäämä arvo) kanonisessa käytössään — aiemmin pyyhki ylävartalon. Odotus: push (HSPU) + legs (Bulgarian) + advisory ettei veto onnistu ilman leukatankoa/renkaita.",
      "q17 ['bodyweight']: ei välineitä → veto vaatii leukatangon/renkaat (rehellinen advisory)",
      "q08 beginner (<1 v); q21 fullbody (3 pv); muut neutraali",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// AJO: replikoi index.html finalize-ketju (4019 → 4122) per profiili.
// ─────────────────────────────────────────────────────────────────────────
function runProfile(p) {
  const cfg = { wizardId: `wiz_${p.id}`, schemaVersion: "3.3", completedAtISO: `${GEN_DATE}T10:00:00Z`, answers: p.answers };
  const out = { id: p.id, persona: p.persona, neutralNotes: p.neutralNotes, error: null };
  try {
    const mapped = mapWizardToProgram(cfg, null);
    let meso = mapped.isMultiBlock
      ? generateMultiBlockMesocycle(mapped, mapped.startDateISO)
      : generateCustomMesocycle(mapped, mapped.startDateISO);
    if (!meso.customConfig) meso.customConfig = {};
    meso.customConfig._wizardMeta = mapped._wizardMeta;
    const splitPref = cfg.answers.q21_splitPreference;
    if (mapped.isMultiBlock && Array.isArray(meso.customConfig?.blocks)) {
      meso.weekPlans = applySplitFilter(meso.weekPlans, splitPref);
      const capped = [];
      for (const block of meso.customConfig.blocks) {
        const bw = meso.weekPlans.filter(wp => wp.week >= block.startWeek && wp.week <= block.endWeek);
        capped.push(...applyVolumeCap(bw, block.goal));
      }
      meso.weekPlans = capped;
    } else {
      meso.weekPlans = applySplitFilter(meso.weekPlans, splitPref);
      meso.weekPlans = applyVolumeCap(meso.weekPlans, mapped.goal);
    }
    // Pilari 3 R2 (F): apuliike-tason vamma-suodatin (ennen kalusto-suodatinta)
    meso.weekPlans = applyInjuryFilter(meso.weekPlans, cfg.answers.q11_injuries);
    // Pilari 3 C2/C3: kalusto-suodatin + alaraaja-takuu (index.html finalize-ketju)
    meso.weekPlans = applyEquipmentFilter(meso.weekPlans, cfg.answers.q17_equipment);
    meso.weekPlans = ensureLowerBody(meso.weekPlans, cfg.answers.q17_equipment);
    // Pilari 3 R3 (P2): hypertrofia MEV-floor ENNEN aikabudjettia (aikabudjetti voittaa)
    meso.weekPlans = applyHypertrophyMevFloor(meso.weekPlans, meso.weekDefs, cfg.answers.q12_primaryGoal, mapped._wizardMeta?._capacityTriggers, cfg.answers.q17_equipment, cfg.answers.q11_injuries);
    // Pilari 3 R2 (B): aikabudjetti rajaa työsarjat (index.html finalize-ketju)
    meso.weekPlans = applyTimeBudgetCap(meso.weekPlans, cfg.answers.q24_frequency, mapped.goal);
    // Pilari 3 R2 (Cowork AUKKO 2): sessiotason slot.targetVx-propagaatio (näyttö = live)
    meso.weekPlans = applyStartingCapacityToSlots(meso.weekPlans, mapped._wizardMeta?._capacityTriggers);
    meso.weekPlans = applySessionFocusLabels(meso.weekPlans);
    // Pilari 3 R3 (P2): komposiitti-advisory POST-B (aikabudjetti trimmasi MEV-flooratun lihasryhmän)
    const _volAdv = mevTimeBudgetAdvisory(meso.weekPlans, meso.weekDefs, cfg.answers.q12_primaryGoal, mapped._wizardMeta?._capacityTriggers);
    if (_volAdv && mapped._wizardMeta) mapped._wizardMeta.goalConflictAdvisory = [mapped._wizardMeta.goalConflictAdvisory, _volAdv].filter(Boolean).join(" ");
    if (Array.isArray(meso.weekDefs)) {
      meso.weekDefs = applyTierProgression(meso.weekDefs, cfg.answers.q08_selfLevel, cfg.answers.q02_sex);
      // Pilari 3 R2 (A+C): aloitus-kapasiteetti-intensiteetti-degradaatio (index.html finalize-ketju)
      meso.weekDefs = applyStartingCapacityDegradation(meso.weekDefs, mapped._wizardMeta?._capacityTriggers);
    }
    out.mapped = mapped;
    out.meso = meso;
  } catch (e) {
    out.error = e.message + "\n" + (e.stack || "").split("\n").slice(0, 3).join("\n");
  }
  return out;
}

const results = profiles.map(runProfile);

// ─────────────────────────────────────────────────────────────────────────
// FORMATOINTI
// ─────────────────────────────────────────────────────────────────────────
function fmtSlots(slots) {
  return (slots || []).map(s => {
    const vx = (s.targetVx === null || s.targetVx === undefined) ? "—" : `V${s.targetVx}`;
    const v = s.variantName ? ` [${s.variantName}]` : "";
    return `      · ${s.role}: ${s.defaultMovementName}${v} — ${s.sets}×${s.reps} @ ${vx} (${s.category})`;
  }).join("\n");
}
function fmtProgramBlinded(r) {
  if (r.error) return `### ${r.id}\n> ${r.persona}\n\n**❌ GENEROINTI EPÄONNISTUI:** \`${r.error}\`\n`;
  const m = r.meso, mp = r.mapped;
  let s = `### ${r.id}\n> ${r.persona}\n\n`;
  s += `- **Liikevalinta (primaryt):** ${mp.primaries.map(x => x.name).join(" + ")}\n`;
  s += `- **Frekvenssi:** ${mp.daysPerWeek} pv/vk · **Palautumiskapasiteetti (johdettu):** ${mp.recoveryCapacity}\n`;
  // Pilari 3: rehellinen advisory (ristiriita / resurssirajoite / aloitusturvallisuus / MEV-aikabudjetti)
  const _gca = mp._wizardMeta && mp._wizardMeta.goalConflictAdvisory;
  if (_gca) s += `- **ℹ Huomio:** ${_gca}\n`;
  const materialized = Array.isArray(m.weekDefs) ? m.weekDefs.length : (m.weekPlans?.length || 0);
  let wcNote = "";
  if (typeof mp.weekCount === "number" && mp.weekCount !== materialized) wcNote += ` · mapper-aikomus ${mp.weekCount} vk`;
  if (m.weekCount !== materialized) wcNote += ` · ⚠ deklaroitu weekCount=${m.weekCount} ≠ materialisoitu ${materialized}`;
  s += `- **Periodisaatio:** ${materialized} vk (materialisoitu)${wcNote}${mp.isMultiBlock ? ` · MULTI-BLOKKI (blokkiperiodisaatio)` : ""}\n`;
  if (mp.isMultiBlock && Array.isArray(m.customConfig?.blocks)) {
    // Näytä blokkien GOAL-sekvenssi (rakenteellinen periodisaatio), EI style-nimeävää labelia
    s += `- **Blokkisekvenssi:** ${m.customConfig.blocks.map(b => `${b.goal} (vk ${b.startWeek}–${b.endWeek})`).join(" → ")}\n`;
  }
  s += `\n**Viikkomääritykset (periodisaatio/progressio — numeerinen, sokko):**\n`;
  // Labelit siirretty Section B:hen (jotkin labelit nimeävät tyylin, esim. "RP Min")
  s += (m.weekDefs || []).map(w => `  - vk ${w.week}: ΔPct ${w.deltaPctBase}% · pää ${w.heavyReps ?? "?"} × V${w.heavyTargetVx ?? "?"}`).join("\n");
  s += `\n\n**Viikko-ohjelmat (liikkeet · volyymi sets×reps · intensiteetti V):**\n`;
  // Näytä vk 1 + (jos eri) viimeinen vk edustavasti; muut tiivistettynä määränä
  const wpToShow = m.weekPlans.length <= 2 ? m.weekPlans : [m.weekPlans[0], m.weekPlans[m.weekPlans.length - 1]];
  for (const wp of wpToShow) {
    s += `  **Viikko ${wp.week}:**\n`;
    for (const d of (wp.days || [])) {
      s += `    Päivä (dow ${d.dayOfWeek}, ${d.dayType})${d.sessionFocus ? ` — fokus: ${d.sessionFocus}` : ""}:\n`;
      s += fmtSlots(d.slots) + "\n";
    }
  }
  if (m.weekPlans.length > 2) s += `  *(vk 2…${m.weekPlans.length - 1} rakenne progressoituu weekDefs-ΔPct:n mukaan; näytetty vk 1 + vk ${m.weekPlans.length})*\n`;
  return s;
}
function fmtStyle(r) {
  if (r.error) return `### ${r.id}\n**❌ generointi epäonnistui** (ks. Section A)\n`;
  const wm = r.meso.customConfig._wizardMeta || r.mapped._wizardMeta;
  let s = `### ${r.id} — ${r.persona.split(",")[0]}\n`;
  s += `- **VALITTU TYYLI:** \`${wm.chosenStyleId}\` — ${wm.chosenStyleLabel}\n`;
  const goalStr = r.mapped.isMultiBlock
    ? `multi-blokki [${(r.meso.customConfig?.blocks || []).map(b => b.goal).join(" → ")}]`
    : r.mapped.goal;
  s += `- **goal:** ${goalStr} · **skeleton:** ${r.meso.customConfig.skeletonFactoryName || (r.mapped.isMultiBlock ? "multi-block-chain" : "?")} · **weekCount:** ${r.meso.weekCount}\n`;
  s += `- **Top-3 kandidaatit (confidence):**\n`;
  s += (wm.styleCandidates || []).map((c, i) =>
    `    ${i + 1}. \`${c.styleId}\` (${c.label}) — **conf ${c.confidence}**` +
    (c.rationale && c.rationale.length ? `\n        rationale: ${c.rationale.join("; ")}` : "")
  ).join("\n");
  // Viikkomääritysten labelit (siirretty Section A:sta koska osa nimeää tyylin)
  const labels = (r.meso.weekDefs || []).map(w => `vk${w.week}: ${w.label}`).join(" · ");
  if (labels) s += `\n- **Viikko-labelit:** ${labels}\n`;
  s += "\n";
  return s;
}
function fmtVector(r) {
  let s = `### ${r.id}\n> ${r.persona}\n\n**33Q-vektori:**\n\`\`\`json\n${JSON.stringify(r.id ? profiles.find(p => p.id === r.id).answers : {}, null, 1)}\n\`\`\`\n`;
  s += `**Neutraalivalinnat (persona ei määritä → neutraali/tyypillinen):**\n`;
  s += r.neutralNotes.map(n => `- ${n}`).join("\n");
  s += "\n";
  return s;
}

const okCount = results.filter(r => !r.error).length;
let md = `# Wizard-dumppi — ${profiles.length} profiilia (KAPSTONI pilari 3, W1-standardi)

> **POST-FIX RE-DUMPPI — round 3 (P2 + P6)**. Generoitu ${DUMP_DATE} · APP_VERSION ${APP_VERSION} ·
> ohjelmien start-ankkuri ${GEN_DATE}. Ajettu repon oikealla Wizard-mapperilla
> (\`wizard/wizard-2b-mapper.js\` \`mapWizardToProgram\`) + mesosykligeneraattorilla (\`data.js\`) +
> KORJATULLA post-process-pipelinella (\`applySplitFilter\` → \`applyVolumeCap\` → \`applyInjuryFilter\` →
> \`applyEquipmentFilter\` → \`ensureLowerBody\` → \`applyHypertrophyMevFloor\` → \`applyTimeBudgetCap\` →
> \`applyStartingCapacityToSlots\` → \`applySessionFocusLabels\` → \`applyTierProgression\` →
> \`applyStartingCapacityDegradation\`), joka replikoi index.html:n finalize-ketjun.
> Round 1: goal-aware primaarit + K kategoria-slot-täyttö + kalusto-suodatin + alaraaja-takuu + P8 kehonpaino/advisory.
> Round 2 (A–F): A aloittelija-turvaraja (freq-cap + V3-aloitus, sessiotaso) · B aikabudjetti-cap ·
> C q34-palautuminen (volyymi −30 % + intensiteetti) · D primaari-demote (ei katoa) · E Käsipainosoutu-substituutio · F vamma-modified.
> Round 3 (P2 + P6): P2 hypertrofia MEV-floor (≥10 settiä/päälihas/vk, recovery/aikabudjetti voittaa + advisory) ·
> P6 kavennettu olkapää-blocklist (penkki säilyy, vain pystypunnerrus/dippi poistuu). P3 LYKÄTTY γ/M2 (pilotti bittitarkka).
> mapper-versio 2D-gamma-v1.0. Mainappstate = null (synteettiset personat, ei DB-dataa).
>
> **Tulos: ${okCount}/${profiles.length} profiilia generoitui onnistuneesti.** (P1–P8 W2-perusprofiilit + P9–P11 pilari 3 (b) kalusto-kattavuuslisäys.)
>
> ## ⚠️ SOKKOUTUSOHJE W2-ARVIOIJALLE
> Tämä dumppi on **kolmessa erillisessä lohkossa**. Lue järjestyksessä:
> 1. **SECTION A — OHJELMAT (sokko):** lue VAIN ohjelmat. Arvioi kukin ohjelma ja **päättele itse mikä ohjelmointityyli se on** ja sopiiko se personalle. Tyylin nimeä EI ole tässä lohkossa.
> 2. **SECTION B — TYYLIVALINNAT:** vasta kun olet tehnyt sokkoarviot, lue todelliset tyylivalinnat + confidence + top-3 kandidaatit ja vertaa päätelmääsi.
> 3. **SECTION C — VEKTORIT + NEUTRAALIVALINNAT:** syöte-audit (33Q-vektorit + jokainen neutraalivalinta).
>
> Älä lue Section B ennen Section A:n arviota.

---

# SECTION A — GENEROIDUT OHJELMAT (sokko: tyyliä ei nimetty)

${results.map(fmtProgramBlinded).join("\n---\n\n")}

---
---

# SECTION B — WIZARDIN TYYLIVALINNAT (lue vasta Section A:n arvion jälkeen)

${results.map(fmtStyle).join("\n")}

---
---

# SECTION C — 33Q-VEKTORIT + NEUTRAALIVALINNAT (syöte-audit)

${results.map(fmtVector).join("\n---\n\n")}
`;

writeFileSync(new URL("../docs/wizard-dump-8profiles.md", import.meta.url), md, "utf8");
console.log(`DUMP VALMIS: ${okCount}/${profiles.length} onnistui → docs/wizard-dump-8profiles.md (${md.length} merkkiä)`);
for (const r of results) {
  if (r.error) console.log(`  ${r.id}: ❌ ${r.error.split("\n")[0]}`);
  else console.log(`  ${r.id}: ✓ style=${(r.meso.customConfig._wizardMeta||r.mapped._wizardMeta).chosenStyleId} goal=${r.mapped.goal} weeks=${r.meso.weekCount} days=${r.mapped.daysPerWeek}${r.mapped.isMultiBlock?" MULTI":""}`);
}
