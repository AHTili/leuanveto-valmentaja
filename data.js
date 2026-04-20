// data.js — IndexedDB, stores, migration, CRUD, import/export, backup/restore, guards
// LeVe Coach v3.0.0 — Schema version 3

const APP_VERSION = "3.2.0";
const SCHEMA_VERSION = 3;
const DB_NAME = "LeVeCoachDB";
const TIMEZONE = "Europe/Helsinki";

// ── Store names ──
const STORES = {
  appMeta: "appMeta",
  movements: "movements",
  variants: "variants",
  sessions: "sessions",
  sets: "sets",
  measurements: "measurements",
  protocols: "protocols",
  baselines: "baselines",
  mesocycles: "mesocycles",
  recommendations: "recommendations",
  decisionTraces: "decisionTraces",
  movementProgress: "movementProgress",
};

// ── Movement categories ──
const CATEGORIES = [
  "vertikaaliveto",
  "horisontaaliveto",
  "hauisfleksio",
  "vertikaalityöntö",
  "horisontaalityöntö",
  "ojentajaekstensio",
  "core",
  "alaraaja",
  "muu",
];

const PULL_VOLUME_CATEGORIES = new Set([
  "vertikaaliveto",
  "horisontaaliveto",
  "hauisfleksio",
]);

// ── Preset movements (40+ across all categories) ──
const PRESET_MOVEMENTS = [
  // ─── Primary ───
  { name: "Lisäpainoleuanveto", category: "vertikaaliveto", isPrimary: true, isPreset: true },
  // ─── Vertical pull ───
  { name: "Ylätalja", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Lat pulldown", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Pullover kone", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Leuanveto (kehonpaino)", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Ylätalja neutraaliote", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Single-arm lat pulldown", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  // ─── Horizontal pull ───
  { name: "Penkkiveto", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Alatalja", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Seated row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Cable row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "T-bar row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Chest-supported row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Kulmasoutu käsipainot", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Seal row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Face pull", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  // ─── Bicep flexion ───
  { name: "Hauiskääntö tanko", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Hauiskääntö käsipainot", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Hammer curl", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Preacher curl", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Incline curl", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Spider curl", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Cable curl", category: "hauisfleksio", isPrimary: false, isPreset: true },
  { name: "Bayesian curl", category: "hauisfleksio", isPrimary: false, isPreset: true },
  // ─── Vertical push ───
  { name: "Pystypunnerrus", category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  { name: "Shoulder press laite", category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  { name: "Pystypunnerrus käsipainot", category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  { name: "Sivunosto", category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  { name: "Lateral raise kone", category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  // ─── Horizontal push ───
  { name: "Penkkipunnerrus", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Chest press", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Pec deck", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Vinopenkkipunnerrus", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Cable fly", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Dippi", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  // ─── Tricep extension ───
  { name: "Tricep pushdown", category: "ojentajaekstensio", isPrimary: false, isPreset: true },
  { name: "French press", category: "ojentajaekstensio", isPrimary: false, isPreset: true },
  { name: "Overhead tricep ext", category: "ojentajaekstensio", isPrimary: false, isPreset: true },
  { name: "Skull crusher", category: "ojentajaekstensio", isPrimary: false, isPreset: true },
  { name: "Kickback", category: "ojentajaekstensio", isPrimary: false, isPreset: true },
  // ─── Core ───
  { name: "Ab crunch", category: "core", isPrimary: false, isPreset: true },
  { name: "Cable crunch", category: "core", isPrimary: false, isPreset: true },
  { name: "Hanging leg raise", category: "core", isPrimary: false, isPreset: true },
  { name: "Ab wheel rollout", category: "core", isPrimary: false, isPreset: true },
  { name: "Pallof press", category: "core", isPrimary: false, isPreset: true },
  // ─── Lower body ───
  { name: "Jalkaprässi", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Kyykky", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Maastaveto", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Leg curl", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Leg extension", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Bulgarian split squat", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Hip thrust", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Pohjenosto", category: "alaraaja", isPrimary: false, isPreset: true },
  // ─── Other / grip ───
  { name: "Rannekoukistus", category: "muu", isPrimary: false, isPreset: true },
  { name: "Wrist roller", category: "muu", isPrimary: false, isPreset: true },
  { name: "Dead hang", category: "muu", isPrimary: false, isPreset: true },
  { name: "Shrug", category: "muu", isPrimary: false, isPreset: true },
  // ─── Streetlifting competition lifts ───
  { name: "Muscle-up", category: "vertikaaliveto", isPrimary: false, isPreset: true, isCompetitionLift: true, loadType: "system" },
  { name: "Lisäpainodippi", category: "horisontaalityöntö", isPrimary: false, isPreset: true, isCompetitionLift: true, loadType: "system" },
  { name: "Takakyykky", category: "alaraaja", isPrimary: false, isPreset: true, isCompetitionLift: true, loadType: "external" },
  // ─── Streetlifting-spesifiset tukiliikkeet (v4.11) ───
  { name: "Leuanveto chest-to-bar", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "False grip pull-up", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "False grip row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Archer pull-up", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Scapular pull-up", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Band-assisted muscle-up", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Räjähtävä leuka", category: "vertikaaliveto", isPrimary: false, isPreset: true },
  { name: "Pendlay row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Weighted inverted row", category: "horisontaaliveto", isPrimary: false, isPreset: true },
  { name: "Ring dip", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Close-grip dip", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Straight bar dip", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Russian dip", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Close-grip bench", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "L-sit hold", category: "core", isPrimary: false, isPreset: true },
  { name: "Hollow body hold", category: "core", isPrimary: false, isPreset: true },
  { name: "Front-foot elevated split squat", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Paused squat", category: "alaraaja", isPrimary: false, isPreset: true },
];

// ─── Movement descriptions (v4.12) ───────────────────────────────
// Tiiviit suoritusohjeet + cue per liike. Näytetään workout-näkymän ⓘ-modalissa
// yhdessä slot-perustelun kanssa, jotta käyttäjä ymmärtää liikkeen roolin.
const MOVEMENT_DESCRIPTIONS = {
  // ─── Kisaliikkeet ───
  "Lisäpainoleuanveto": { howTo: "Leveä vastaote, rinta tankoon. Vedä lapaluut ensin alas, sitten kyynärpäät sivuille-taakse. Täysi alapysähdys ilman svingausta.", cue: "Lapaluut alas ennen kuin käsivarret vetävät" },
  "Muscle-up": { howTo: "Leuanveto explosiivisesti rinnan yli, false grip, transition kyynärvarsi pystyyn, lopuksi dippi lukitukseen. Koko liike yhtenä ketjuna.", cue: "Vedä itsesi tangon yli, älä tangolle" },
  "Lisäpainodippi": { howTo: "Kahvat hartianleveydellä, rinta hieman eteen, kyynärpäät taakse. Alas täyteen dippiin, ylös lukitukseen. Kontrolloitu alas.", cue: "Alas, kunnes olkapäät ovat kyynärpäiden alla" },
  "Takakyykky": { howTo: "Tanko takakulmalle, jalat hartianleveydellä. Istu taaksepäin, polvet kääntyvät varpaiden suuntaan. Reiden yläpinta alle vaakatason.", cue: "Rintakehä auki koko liikeradan ajan" },

  // ─── Streetlifting-spesifiset (v4.11) ───
  "Räjähtävä leuka": { howTo: "Kehonpainoleuka maksimaalisella kiihdytyksellä — yritä saada rinta tangon yli. 3 räjähtävää toistoa/sarja, 2 min palautus.", cue: "Nopeus > volyymi — keskeytä jos hidastuu" },
  "Leuanveto chest-to-bar": { howTo: "Vastaote, vedä kunnes rinta koskettaa tangon. Rintaranka taakse, lapaluut kokoon. Kontrolloitu alas.", cue: "Rinta tankoon, ei leuka" },
  "False grip pull-up": { howTo: "Ranteet tangon yli (false grip), vedä chest-to-bar. Valmistaa muscle-upin transition-vaiheen — ranteiden täytyy olla tangon yläpuolella.", cue: "Rannekulma pysyy — ei pudota pohjalla" },
  "False grip row": { howTo: "Matala tanko, false grip, vedä rintaa tankoon. Kehonpaino-soutu — jalat maassa, vartalo suora.", cue: "Harjoittaa tranistionin voimaa ilman koko MU:n kuormaa" },
  "Archer pull-up": { howTo: "Leuanveto toiselle sivulle, toinen käsi suorana sivulle. Tee 3-5/sivu. Asymmetrinen veto rakentaa yksittäisen käden voimaa.", cue: "Vetävä käsi tekee työn, tukikäsi vain ohjaa" },
  "Scapular pull-up": { howTo: "Roiku tangossa, aktivoi vain lapaluut — lasku alas ja nosto ylös ILMAN kyynärpäiden koukistusta. 10 s holdeja mukaan.", cue: "Kyynärpäät suoriksi — vain lapalihakset työskentelevät" },
  "Band-assisted muscle-up": { howTo: "Kuminauha tangon ympäri, jalat/polvet nauhaan. Tee koko MU-liikerata kevyemmällä kuormalla.", cue: "Harjoittele transition-liikerataa, älä pelkkää vetoa" },
  "Pendlay row": { howTo: "Tanko maasta, selkä vaakatasossa, vedä tanko alarintaan, tanko PALAA maahan joka toistolla. Ei selän rullaamista.", cue: "Pysähdys maahan = nollasta starttaus joka toisto" },
  "Weighted inverted row": { howTo: "Matala tanko, vartalo suora, lisäpaino vyötäröllä/rinnassa. Vedä tanko rintaan.", cue: "Tanko rintaan, ei napaan" },
  "Ring dip": { howTo: "Dippi renkailla — epävakaus pakottaa olkapäät stabiloimaan. Aloita pienemmällä kuormalla kuin tankodipissä.", cue: "Renkaat pysyvät vartalon lähellä — ei levitä" },
  "Close-grip dip": { howTo: "Kapea dippiote (harppuna lähes kohtaa), kyynärpäät taakse. Triceps-fokus, vähemmän rintaa.", cue: "Kyynärpäät aivan vartalon vieressä" },
  "Straight bar dip": { howTo: "Dippi suoralla tangolla — spesifi kisa-asento MU:n lukitukseen. Tanko vartalon edessä, nojaa eteen.", cue: "Sama asento kuin MU:n huipulla" },
  "Russian dip": { howTo: "Dippi, laske kyynärvarret tangolle, nosta sieltä takaisin ylös täydeksi dipiksi. MU:n transition-loppuvaiheen spesifi.", cue: "Hallittu lasku kyynärvarsille — älä pudota" },
  "Close-grip bench": { howTo: "Penkkipunnerrus kapealla otteella (~hartiain leveys), kyynärpäät lähellä vartaloa. Tricepsin voimaliike.", cue: "Kyynärpäät 45° — ei sivulle" },
  "L-sit hold": { howTo: "Istu käsiin tukeutuen, jalat suorat ja vaakatasossa. Pidä. Core + hollow body = MU:n läpipuhallus.", cue: "Lantio rullaa taakse, alaselkä pyöristyy" },
  "Hollow body hold": { howTo: "Selällään, alaselkä painuu maahan, jalat ja ylävartalo irti matosta. Pidä 20-40 s.", cue: "Alaselkä ei saa irrota maasta" },
  "Front-foot elevated split squat": { howTo: "Takajalan askelkyykky etujalka 5-10 cm korokkeella. Syvempi polven ekstensio, quad-fokus.", cue: "Laskeudu suoraan alas, ei eteenpäin" },
  "Paused squat": { howTo: "Takakyykky 2 s pysähdys alaasennossa. Ei pomppua — startti nollasta. Rakentaa pohjalukituksen.", cue: "Laske 1-2 sekunnissa, pysähdy, nouse räjähtävästi" },

  // ─── Pull (legacy slot-variantit) ───
  "Chest-supported row": { howTo: "Soutu penkin päälle kasvot alaspäin — estää selän rullaamisen. Raskas volyymi turvallisesti.", cue: "Rinta pysyy penkissä — kyynärpäät taakse" },
  "Seal row": { howTo: "Vaakapenkin päällä makuulla — tanko lattialta rintaan. Eliminoi hipsit ja svingin täysin.", cue: "Pää pysyy penkissä" },
  "T-bar row": { howTo: "T-tangon kulmasoutu, jalat hartianleveydellä, vedä rintaan. Raskas variantti.", cue: "Selkä neutraali — ei pyöristy" },
  "Face pull": { howTo: "Yläaljasta kasvojen korkeudelle, vedä kahvat korvien tasolle, kyynärpäät korkealla. Takaolka + lapaluut.", cue: "Lapaluut taakse, ei vain käsivarret" },
  "Hauiskääntö tanko": { howTo: "Tanko alaotteella, kyynärpäät paikallaan, käännä ilman svingausta. Täysi liikerata.", cue: "Kyynärpäät eivät liiku — vain kyynärvarret" },
  "Hauiskääntö käsipainot": { howTo: "Käsipainot sivuilla, käännä yksi kerrallaan tai samanaikaisesti. Supinoi otetta liikkeessä.", cue: "Pikkurilli ylös liikkeen huipussa" },
  "Hammer curl": { howTo: "Käsipainokääntö neutraaliotteella (vasara-asento). Kohdistaa brachialisiin + hauis.", cue: "Peukalo kohti kattoa koko ajan" },
  "Preacher curl": { howTo: "Saarnaajan penkissä — kyynärpäät tuetaan, eliminoi svingausmahdollisuus.", cue: "Älä lukitse kyynärpäitä suoriksi alhaalla" },
  "Incline curl": { howTo: "Vinopenkissä takanoja 45-60°, käsipainot roikkuvat — suurempi venytys hauikseen.", cue: "Kyynärpäät pysyvät vartalon takana" },

  // ─── Push (legacy slot-variantit) ───
  "Penkkipunnerrus": { howTo: "Tanko rintalastaan, ranteet tangon alla, lapaluut penkissä. Jalat maassa, lantio kontaktissa.", cue: "Lapaluut pysyvät sisäänvedettyinä koko liikkeen ajan" },
  "Pystypunnerrus": { howTo: "Seisten tai istuen, tanko leuan alta ylös pään yli. Takapuoli kireänä, kylkiluut alas.", cue: "Älä työnnä lantiota eteen — tanko suoraa linjaa" },
  "Pystypunnerrus käsipainot": { howTo: "Käsipainot hartioilla, työnnä ylös pään yli, ala hartiatasolle.", cue: "Tanko suoraan ylös, ei eteen" },
  "Shoulder press laite": { howTo: "Laite tukee selkää — puhdas isolaatio hartioille.", cue: "Pidä kylkiluut alhaalla, ei selkää kaareen" },
  "Sivunosto": { howTo: "Käsipainot sivuille hartiatasolle, pikkurilli ylös. Kyynärpää hieman koukussa.", cue: "Nosta kyynärpäillä, ei käsipainoilla" },
  "Lateral raise kone": { howTo: "Laiteen sivunosto — konsistentti kuorma koko liikerataan.", cue: "Laskeudu hallitusti" },
  "Tricep pushdown": { howTo: "Yläaljasta köydellä tai tangolla, kyynärpäät paikallaan, työnnä alas.", cue: "Vain kyynärvarret liikkuvat" },
  "Overhead tricep ext": { howTo: "Käsipaino/köysi pään taakse, kyynärpäät osoittavat ylös. Ojentajan pitkän pään fokus.", cue: "Kyynärpäät eivät levitä sivuille" },
  "Skull crusher": { howTo: "Selinmakuulla, tanko suoraan ylhäällä, laske otsaa/pään taakse kyynärpäät koukistuen.", cue: "Kyynärpäät osoittavat kattoon koko ajan" },
  "Vinopenkkipunnerrus": { howTo: "30-45° vinopenkki, ylärinnan fokus. Muuten kuin tasopenkki.", cue: "Tanko ylärintaan, ei kaulaan" },

  // ─── Lower (legacy slot-variantit) ───
  "Maastaveto": { howTo: "Tanko lähellä säären, lantio liikkuu taaksepäin (hinge), selkä neutraali. RDL-tyyli: tanko liukuu jalkoja pitkin.", cue: "Pyllyä taakse — ei kyykkää alas" },
  "Hip thrust": { howTo: "Yläselkä penkillä, tanko lantion päällä, työnnä lantio ylös. Pakara puree huipussa.", cue: "Leuka rintaan — älä kaareudu lannerankaan" },
  "Jalkaprässi": { howTo: "Jalat laitteella hartianleveydellä, laske reidet rintaa kohti. Älä lukitse polvia yläpisteessä.", cue: "Kantapää painaa koko liikkeen ajan" },
  "Leg extension": { howTo: "Polven ekstensio laitteella — puhdas quad-isolaatio.", cue: "Huiput lukitaan 1 s pohjalla" },
  "Bulgarian split squat": { howTo: "Takajalka penkillä, etujalka ~1 m edessä. Laskeudu suoraan alas. Pakara + quad unilateraalisti.", cue: "Etujalan polvi ei ylitä varvasta" },
  "Leg curl": { howTo: "Takareiden koukistus laitteella — makuulla tai istuen. Kontrolloitu alas.", cue: "Lantio pysyy penkissä — ei irtoa" },

  // ─── Core ───
  "Ab wheel rollout": { howTo: "Polvillaan, työnnä rulla eteen mahdollisimman kauas, palaa aktiivisesti. Hollow body asento koko ajan.", cue: "Alaselkä ei saa notkahdella" },
  "Hanging leg raise": { howTo: "Roiku tangossa, nosta suorat jalat vaakatasoon tai ylempäänkin. Ei svingiä.", cue: "Aloita lantion rullauksella, ei jalkojen swingillä" },

  // ─── Primääreiden variantit (osa jo PRIMARY_VARIANTS:ssa) ───
  "Leuanveto (kehonpaino)": { howTo: "Kehonpainoleuka täydellä liikeradalla — alas täyteen hangiin, ylös leuka tangon yli.", cue: "Lapaluut aktivoituvat ENNEN käsivarsia" },
};

// Each slot represents a FUNCTION (what biomechanical role it fills),
// not a fixed movement. Phase variants rotate only at block boundaries or
// on detected stagnation — otherwise stay persistent so adaptation compounds.
//
// Phase order: foundation (vk 1-4), strength (vk 5-8), intensity (vk 9-12), peaking (vk 13-16).
// First item in each phase = default. If stagnation detected, engine advances index.
const ACCESSORY_SLOT_CATALOG = {
  // ─── PULL PATTERNS ───
  "pull-horizontal-heavy": {
    function: "Raskas horisontaaliveto, selän paksuus",
    rationale: "Paksuntaa keskiselkää → suora tuki leuanvedolle ja MU-transitiolle. Hypertrofiassa chest-supported/seal (turvallinen volyymi), voimablokissa Pendlay (raskas ja eksplosiivinen).",
    phaseVariants: {
      foundation: ["Chest-supported row", "Seal row", "T-bar row"],
      strength:   ["Pendlay row", "T-bar row", "Chest-supported row"],
      intensity:  ["Pendlay row", "Chest-supported row"],
      peaking:    ["Chest-supported row"],
    },
    repScheme: {
      foundation: { sets: 4, reps: 8, targetVx: null },
      strength:   { sets: 4, reps: 6, targetVx: 3 },
      intensity:  { sets: 3, reps: 5, targetVx: 2 },
      peaking:    { sets: 2, reps: 6, targetVx: 4 },
    },
  },
  "pull-vertical-explosive": {
    function: "Räjähtävä veto, speed-strength leuanvetoon",
    rationale: "Kisaveto kehittyy vain kun konsentrinen vaihe tehdään maksiminopeudella. Pitää Rate of Force Developmentin korkealla — ilman tätä raskas veto hidastuu ja seuraavat PR:t karkaavat.",
    phaseVariants: {
      foundation: ["Räjähtävä leuka", "Leuanveto chest-to-bar"],
      strength:   ["Leuanveto chest-to-bar", "Archer pull-up"],
      intensity:  ["Archer pull-up", "Leuanveto chest-to-bar"],
      peaking:    ["Räjähtävä leuka"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 5, targetVx: 3 },
      strength:   { sets: 3, reps: 4, targetVx: 3 },
      intensity:  { sets: 3, reps: 3, targetVx: 3 },
      peaking:    { sets: 2, reps: 3, targetVx: 4 },
    },
  },
  "scapular-control": {
    function: "Lapa- ja takaolka, prehab + asennonhallinta",
    rationale: "Face pull estää olkapään impingement-ongelmia raskaissa blokkeissa. Scapular pull opettaa lapalukon, joka on MU:n käynnistyksen perusta. Pieni investointi, iso vammansuoja.",
    phaseVariants: {
      foundation: ["Face pull", "Scapular pull-up"],
      strength:   ["Face pull", "Scapular pull-up"],
      intensity:  ["Face pull"],
      peaking:    ["Face pull"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 15, targetVx: null },
      strength:   { sets: 3, reps: 12, targetVx: null },
      intensity:  { sets: 2, reps: 12, targetVx: null },
      peaking:    { sets: 2, reps: 15, targetVx: null },
    },
  },
  "bicep-chain": {
    function: "Hauiskoukistajat, vetovoiman tuki",
    rationale: "Kun selkä on vahva, leuanvedon rajoittava tekijä siirtyy usein hauiksiin. Hypertrofiablokissa volyymi (curls), voimablokissa raskaammat variantit (barbell curl).",
    phaseVariants: {
      foundation: ["Hauiskääntö tanko", "Preacher curl", "Incline curl"],
      strength:   ["Hauiskääntö tanko", "Hauiskääntö käsipainot", "Hammer curl"],
      intensity:  ["Hammer curl", "Hauiskääntö tanko"],
      peaking:    ["Hauiskääntö käsipainot"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 12, targetVx: null },
      strength:   { sets: 3, reps: 10, targetVx: null },
      intensity:  { sets: 2, reps: 10, targetVx: null },
      peaking:    { sets: 2, reps: 12, targetVx: null },
    },
  },

  // ─── PUSH PATTERNS ───
  "bench-heavy": {
    function: "Kapean otteen rintapunnerrus, ojentajan veto",
    rationale: "Kapea ote = ojentajan voimaraja → suoraan kisadipin lukitus ja MU:n huippuasento. Raskas kompoundiliike ilman kisa-CNS-kuormaa.",
    phaseVariants: {
      foundation: ["Penkkipunnerrus", "Close-grip bench", "Vinopenkkipunnerrus"],
      strength:   ["Close-grip bench", "Penkkipunnerrus"],
      intensity:  ["Close-grip bench"],
      peaking:    ["Penkkipunnerrus"],
    },
    repScheme: {
      foundation: { sets: 4, reps: 6, targetVx: 3, note: "kapea ote" },
      strength:   { sets: 4, reps: 5, targetVx: 3 },
      intensity:  { sets: 3, reps: 4, targetVx: 2 },
      peaking:    { sets: 2, reps: 5, targetVx: 4 },
    },
  },
  "shoulder-vertical": {
    function: "Vertikaalityöntö, hartiaseudun voima",
    rationale: "Pystypunnerrus tukee sekä dipin yläasentoa että MU:n 'standing on top' -lukitusta. Ilman pystyvoimaa dipin huippu on epästabiili kisapainoilla.",
    phaseVariants: {
      foundation: ["Pystypunnerrus", "Pystypunnerrus käsipainot", "Shoulder press laite"],
      strength:   ["Pystypunnerrus", "Pystypunnerrus käsipainot"],
      intensity:  ["Pystypunnerrus käsipainot", "Shoulder press laite"],
      peaking:    ["Shoulder press laite"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 8, targetVx: null },
      strength:   { sets: 3, reps: 6, targetVx: 3 },
      intensity:  { sets: 3, reps: 5, targetVx: 2 },
      peaking:    { sets: 2, reps: 8, targetVx: 4 },
    },
  },
  "tricep-lockout": {
    function: "Ojentajan lockout, dipin lukitusvoima",
    rationale: "Dipin ja MU:n viimeiset 10 cm ovat puhdasta ojentajan voimaa. Skull crusher + close-grip bench kehittävät juuri lukitusta, ei lihasmassaa yleisesti.",
    phaseVariants: {
      foundation: ["Tricep pushdown", "Overhead tricep ext"],
      strength:   ["Skull crusher", "Close-grip bench"],
      intensity:  ["Skull crusher", "Tricep pushdown"],
      peaking:    ["Tricep pushdown"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 12, targetVx: null },
      strength:   { sets: 3, reps: 8, targetVx: null },
      intensity:  { sets: 3, reps: 8, targetVx: null },
      peaking:    { sets: 2, reps: 12, targetVx: null },
    },
  },
  "shoulder-isolation": {
    function: "Deltoideusten isolaatio",
    rationale: "Kasvattaa hartialihakset turvallisesti ilman CNS-kuormaa. Isot deltoidit = vakaampi dipin yläasento ja parempi MU:n ylävartalon lukitus.",
    phaseVariants: {
      foundation: ["Sivunosto", "Lateral raise kone"],
      strength:   ["Sivunosto", "Lateral raise kone"],
      intensity:  ["Lateral raise kone"],
      peaking:    ["Sivunosto"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 15, targetVx: null },
      strength:   { sets: 3, reps: 12, targetVx: null },
      intensity:  { sets: 2, reps: 12, targetVx: null },
      peaking:    { sets: 2, reps: 15, targetVx: null },
    },
  },

  // ─── LOWER ───
  "hip-hinge": {
    function: "Lonkkahinge, takaketju",
    rationale: "RDL rakentaa takaketjun (hamstring + pakara + alaselkä), joka on kyykyn alaosan räjähtävyyden moottori. Peakingissä siirrytään hip thrustiin — matalampi CNS-kuorma.",
    phaseVariants: {
      foundation: ["Maastaveto", "Hip thrust"],
      strength:   ["Maastaveto", "Hip thrust"],
      intensity:  ["Maastaveto"],
      peaking:    ["Hip thrust"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 8, targetVx: null, note: "RDL" },
      strength:   { sets: 3, reps: 6, targetVx: 3, note: "RDL" },
      intensity:  { sets: 3, reps: 5, targetVx: 2, note: "RDL" },
      peaking:    { sets: 2, reps: 8, targetVx: 4 },
    },
  },
  "knee-dominant-accessory": {
    function: "Polven ekstensio, quadien volyymi",
    rationale: "Jalkaprässi antaa quad-volyymia turvallisesti (ei selkä-CNS:ää). Voima/intensiteettiblokissa paused squat opettaa pohjalukon — suoraan kisakyykyn startin räjähtävyys.",
    phaseVariants: {
      foundation: ["Jalkaprässi", "Leg extension"],
      strength:   ["Jalkaprässi", "Paused squat"],
      intensity:  ["Paused squat", "Jalkaprässi"],
      peaking:    ["Jalkaprässi"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 10, targetVx: null },
      strength:   { sets: 3, reps: 8, targetVx: null },
      intensity:  { sets: 3, reps: 6, targetVx: 2 },
      peaking:    { sets: 2, reps: 10, targetVx: 4 },
    },
  },
  "knee-unilateral": {
    function: "Yksijalkaisuus, asymmetrian hallinta",
    rationale: "Korjaa oikea/vasen-epäsymmetriaa, stabiloi lantio. Pudotetaan peakingissä (vk 13-16) CNS-säästön vuoksi — kisakyykky tarvitsee kaiken palautumisen.",
    phaseVariants: {
      foundation: ["Bulgarian split squat", "Front-foot elevated split squat"],
      strength:   ["Bulgarian split squat"],
      intensity:  ["Bulgarian split squat"],
      peaking:    [],
    },
    repScheme: {
      foundation: { sets: 3, reps: 10, targetVx: null },
      strength:   { sets: 3, reps: 8, targetVx: null },
      intensity:  { sets: 2, reps: 8, targetVx: null },
      peaking:    null,
    },
  },
  "hamstring-isolation": {
    function: "Takareiden isolaatio",
    rationale: "Balansoi kyykyn etureiden dominanssia, suojaa polvia. Vahva hamstring = parempi lonkkahinge kyykyn alaosassa ja pienempi rasitusvammariski.",
    phaseVariants: {
      foundation: ["Leg curl"],
      strength:   ["Leg curl"],
      intensity:  ["Leg curl"],
      peaking:    ["Leg curl"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 12, targetVx: null },
      strength:   { sets: 3, reps: 10, targetVx: null },
      intensity:  { sets: 2, reps: 10, targetVx: null },
      peaking:    { sets: 2, reps: 12, targetVx: null },
    },
  },

  // ─── MU-SPESIFI (LA-päivä) ───
  "mu-transition": {
    function: "Muscle-up -transition, false grip + räjähtävä veto",
    rationale: "MU:n kriittisin kohta: veto loppuu ja siirrytään työntöön. Hypertrofiassa false grip row (volyymi), voimablokissa band-MU (koko liikerata kevyemmällä), peakingissä räjähtävä leuka (nopeus).",
    phaseVariants: {
      foundation: ["False grip row", "Leuanveto chest-to-bar"],
      strength:   ["Band-assisted muscle-up", "False grip row"],
      intensity:  ["Band-assisted muscle-up", "Räjähtävä leuka"],
      peaking:    ["Räjähtävä leuka"],
    },
    repScheme: {
      foundation: { sets: 4, reps: 5, targetVx: 3 },
      strength:   { sets: 3, reps: 4, targetVx: 3 },
      intensity:  { sets: 3, reps: 3, targetVx: 3 },
      peaking:    { sets: 2, reps: 3, targetVx: 4 },
    },
  },
  "mu-dip-support": {
    function: "MU:n lukitus — dippi-spesifi",
    rationale: "MU:n yläasento = kisa-dippi. Variantit kuormittavat eri kulmista (ring = stabiliteetti, Russian = transition-loppuvaihe, straight bar = spesifi MU-huippu) ilman pääliikkeen kuormaa.",
    phaseVariants: {
      foundation: ["Lisäpainodippi", "Ring dip"],
      strength:   ["Lisäpainodippi", "Russian dip"],
      intensity:  ["Straight bar dip", "Lisäpainodippi"],
      peaking:    ["Lisäpainodippi"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 8, targetVx: 3, note: "Kevyt — prehab" },
      strength:   { sets: 3, reps: 5, targetVx: 3 },
      intensity:  { sets: 2, reps: 4, targetVx: 3 },
      peaking:    { sets: 2, reps: 5, targetVx: 4 },
    },
  },

  // ─── CORE ───
  "core-hollow": {
    function: "Hollow body / L-sit, MU:n keskivartalon lukitus",
    rationale: "Ilman hollow body -lukkoa MU:n transition 'pettää' — keskivartalo yhdistää vedon ja työnnön. L-sit on hollow:n ultimate-muoto: MU-painoja kannatteleva koko kehon jäykkyys.",
    phaseVariants: {
      foundation: ["Ab wheel rollout", "Hollow body hold"],
      strength:   ["L-sit hold", "Hanging leg raise"],
      intensity:  ["L-sit hold", "Ab wheel rollout"],
      peaking:    ["Hollow body hold"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 10, targetVx: null },
      strength:   { sets: 3, reps: 8, targetVx: null, note: "Holdit 10-20 s" },
      intensity:  { sets: 2, reps: 8, targetVx: null },
      peaking:    { sets: 2, reps: 10, targetVx: null },
    },
  },
};


// ── Primary variants ──
const PRIMARY_VARIANTS = [
  { name: "Kilpaveto (leveä vastaote)", movementName: "Lisäpainoleuanveto", isDefault: true, tags: ["competition", "heavy"] },
  { name: "Korokeveto", movementName: "Lisäpainoleuanveto", isDefault: false, tags: ["supramaximal", "peaking"] },
  { name: "Nopeusveto kuminauhalla", movementName: "Lisäpainoleuanveto", isDefault: false, tags: ["speed", "explosive"] },
  { name: "Myötäoteveto", movementName: "Lisäpainoleuanveto", isDefault: false, tags: ["grip", "heavy", "volume"] },
  { name: "Neutraaliote", movementName: "Lisäpainoleuanveto", isDefault: false, tags: ["grip", "volume"] },
  { name: "2s ylipito", movementName: "Lisäpainoleuanveto", isDefault: false, tags: ["isometric", "volume"] },
  { name: "1.5-toisto hiissaus", movementName: "Lisäpainoleuanveto", isDefault: false, tags: ["tempo", "volume"] },
];

// ── Variant ↔ day type mapping ──
// Heavy: kilpaveto aina (vastaote on kilpailuote), myötäote rotaationa
// Volume: myötäote, neutraali, ylipito, hiissaus
// Speed: kuminauha
// Peaking-only: korokeveto (supramaksimaalinen, ei normaalisyklissä)
const VARIANT_DAY_TYPE_MAP = {
  heavy: ["Kilpaveto (leveä vastaote)"],
  speed: ["Nopeusveto kuminauhalla"],
  volume: ["Myötäoteveto", "Neutraaliote", "2s ylipito", "1.5-toisto hiissaus"],
  peaking: ["Kilpaveto (leveä vastaote)", "Korokeveto"],
};

// ── Utility ──
function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function nowISO() {
  return new Date().toISOString();
}

function todayISO() {
  return new Date()
    .toLocaleDateString("sv-SE", { timeZone: TIMEZONE })
    .slice(0, 10);
}

function parseNumericInput(v) {
  if (v === null || v === undefined || v === "") return null;
  const cleaned = String(v).trim().replace(/,/g, ".").replace(/[^0-9.+\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ── Measurement quality guards ──
const GUARDS = {
  velocity: (v) => v > 0 && v <= 3.0,
  load: (v) => v >= 0,
  reps: (v) => v >= 1 && v <= 30,
  hrv: (v) => v >= 10 && v <= 200,
  bodyweight: (v) => v >= 30 && v <= 250,
};

function validateVelocity(v) {
  if (v === null || v === undefined) return { valid: true, value: null };
  const n = parseNumericInput(v);
  if (n === null) return { valid: false, value: null, error: "Virheellinen arvo" };
  if (!GUARDS.velocity(n))
    return { valid: false, value: n, error: "Velocity oltava 0–3.0 m/s" };
  return { valid: true, value: n };
}

function validateLoad(v) {
  if (v === null || v === undefined) return { valid: true, value: null };
  const n = parseNumericInput(v);
  if (n === null) return { valid: false, value: null, error: "Virheellinen arvo" };
  if (!GUARDS.load(n)) return { valid: false, value: n, error: "Kuorma ei voi olla negatiivinen" };
  return { valid: true, value: n };
}

function validateReps(v) {
  if (v === null || v === undefined) return { valid: true, value: null };
  const n = parseNumericInput(v);
  if (n === null) return { valid: false, value: null, error: "Virheellinen arvo" };
  if (!GUARDS.reps(n)) return { valid: false, value: n, error: "Toistot oltava 1–30" };
  return { valid: true, value: Math.round(n) };
}

function validateHRV(v) {
  if (v === null || v === undefined) return { valid: true, value: null };
  const n = parseNumericInput(v);
  if (n === null) return { valid: false, value: null, error: "Virheellinen arvo" };
  if (!GUARDS.hrv(n)) return { valid: false, value: n, error: "HRV oltava 10–200 ms" };
  return { valid: true, value: n };
}

function validateBodyweight(v) {
  if (v === null || v === undefined) return { valid: true, value: null };
  const n = parseNumericInput(v);
  if (n === null) return { valid: false, value: null, error: "Virheellinen arvo" };
  if (!GUARDS.bodyweight(n)) return { valid: false, value: n, error: "Kehonpaino oltava 30–250 kg" };
  return { valid: true, value: n };
}

// ── Typo detection ──
function isVelocityTypo(value, baselineMedian, threshold = 0.4) {
  if (baselineMedian === null || baselineMedian === undefined || baselineMedian === 0) return false;
  if (value === null || value === undefined) return false;
  const deviation = Math.abs(value - baselineMedian) / baselineMedian;
  return deviation > threshold;
}

// ── IndexedDB ──
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) {
      console.warn("IndexedDB not available");
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Create all stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.appMeta)) {
        db.createObjectStore(STORES.appMeta, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.movements)) {
        const store = db.createObjectStore(STORES.movements, { keyPath: "movementId" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("isPrimary", "isPrimary", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.variants)) {
        const store = db.createObjectStore(STORES.variants, { keyPath: "variantId" });
        store.createIndex("movementId", "movementId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const store = db.createObjectStore(STORES.sessions, { keyPath: "sessionId" });
        store.createIndex("dateISO", "dateISO", { unique: false });
        store.createIndex("mesocycleId", "mesocycleId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.sets)) {
        const store = db.createObjectStore(STORES.sets, { keyPath: "setId" });
        store.createIndex("sessionId", "sessionId", { unique: false });
        store.createIndex("movementId", "movementId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.measurements)) {
        const store = db.createObjectStore(STORES.measurements, { keyPath: "measurementId" });
        store.createIndex("dateISO", "dateISO", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.protocols)) {
        db.createObjectStore(STORES.protocols, { keyPath: "protocolId" });
      }
      if (!db.objectStoreNames.contains(STORES.baselines)) {
        const store = db.createObjectStore(STORES.baselines, { keyPath: "baselineId" });
        store.createIndex("protocolId", "protocolId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.mesocycles)) {
        db.createObjectStore(STORES.mesocycles, { keyPath: "mesocycleId" });
      }
      if (!db.objectStoreNames.contains(STORES.recommendations)) {
        const store = db.createObjectStore(STORES.recommendations, { keyPath: "recId" });
        store.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.decisionTraces)) {
        const store = db.createObjectStore(STORES.decisionTraces, { keyPath: "traceId" });
        store.createIndex("recId", "recId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.movementProgress)) {
        db.createObjectStore(STORES.movementProgress, { keyPath: "movementId" });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => {
      console.error("IndexedDB open failed:", req.error);
      resolve(null);
    };
  });
}

function getDB() {
  return _db;
}

// ── Generic CRUD ──
function dbPut(storeName, obj) {
  return new Promise((resolve) => {
    if (!_db) { resolve(false); return; }
    try {
      const tx = _db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(obj);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => { console.error("dbPut error:", tx.error); resolve(false); };
    } catch (e) {
      console.error("dbPut exception:", e);
      resolve(false);
    }
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve) => {
    if (!_db) { resolve(null); return; }
    try {
      const tx = _db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve) => {
    if (!_db) { resolve([]); return; }
    try {
      const tx = _db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve) => {
    if (!_db) { resolve([]); return; }
    try {
      const tx = _db.transaction(storeName, "readonly");
      const idx = tx.objectStore(storeName).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve) => {
    if (!_db) { resolve(false); return; }
    try {
      const tx = _db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

function dbClear(storeName) {
  return new Promise((resolve) => {
    if (!_db) { resolve(false); return; }
    try {
      const tx = _db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

// ── Bulk put (transactional) ──
function dbPutBulk(storeName, items) {
  return new Promise((resolve) => {
    if (!_db || !items.length) { resolve(true); return; }
    try {
      const tx = _db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => { console.error("dbPutBulk error:", tx.error); resolve(false); };
    } catch (e) {
      console.error("dbPutBulk exception:", e);
      resolve(false);
    }
  });
}

// ── Initialization: seed preset movements + variants ──
async function seedPresets() {
  const existingMovements = await dbGetAll(STORES.movements);
  if (existingMovements.length > 0) return; // Already seeded

  const movements = PRESET_MOVEMENTS.map((m) => ({
    movementId: uid(),
    name: m.name,
    category: m.category,
    isPrimary: m.isPrimary,
    countsAsPullVolume: PULL_VOLUME_CATEGORIES.has(m.category),
    isPreset: true,
    tags: [],
  }));

  await dbPutBulk(STORES.movements, movements);

  // Create variants for primary movement
  const primaryMov = movements.find((m) => m.isPrimary);
  if (primaryMov) {
    const variants = PRIMARY_VARIANTS.map((v) => ({
      variantId: uid(),
      movementId: primaryMov.movementId,
      name: v.name,
      isDefault: v.isDefault,
      notes: "",
    }));
    await dbPutBulk(STORES.variants, variants);
  }

  // Store app meta
  await dbPut(STORES.appMeta, {
    key: "meta",
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAtISO: nowISO(),
    lastOpenedISO: nowISO(),
    timezone: TIMEZONE,
  });
}

// ── High-level data access ──

// Movements
async function getAllMovements() {
  return dbGetAll(STORES.movements);
}

async function getMovementsByCategory(category) {
  return dbGetByIndex(STORES.movements, "category", category);
}

async function getPrimaryMovement() {
  const all = await dbGetAll(STORES.movements);
  return all.find((m) => m.isPrimary) || null;
}

async function addMovement(name, category, tutorialUrl = "") {
  const mov = {
    movementId: uid(),
    name,
    category,
    isPrimary: false,
    countsAsPullVolume: PULL_VOLUME_CATEGORIES.has(category),
    isPreset: false,
    tags: [],
    tutorialUrl: tutorialUrl || "",
  };
  await dbPut(STORES.movements, mov);
  return mov;
}

async function updateMovement(movementId, updates) {
  const existing = await dbGet(STORES.movements, movementId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  if (updates.category !== undefined) {
    updated.countsAsPullVolume = PULL_VOLUME_CATEGORIES.has(updates.category);
  }
  await dbPut(STORES.movements, updated);
  return updated;
}

async function deleteMovement(movementId) {
  return dbDelete(STORES.movements, movementId);
}

// Variants
async function getVariantsForMovement(movementId) {
  return dbGetByIndex(STORES.variants, "movementId", movementId);
}

async function addVariant(movementId, name, notes = "") {
  const v = { variantId: uid(), movementId, name, isDefault: false, notes };
  await dbPut(STORES.variants, v);
  return v;
}

// Sessions
async function getAllSessions() {
  const sessions = await dbGetAll(STORES.sessions);
  return sessions.sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
}

async function getSession(sessionId) {
  return dbGet(STORES.sessions, sessionId);
}

async function saveSession(session) {
  if (!session.sessionId) session.sessionId = uid();
  return dbPut(STORES.sessions, session);
}

async function deleteSession(sessionId) {
  // Delete associated sets
  const sets = await dbGetByIndex(STORES.sets, "sessionId", sessionId);
  for (const s of sets) {
    await dbDelete(STORES.sets, s.setId);
  }
  // Delete associated recommendations
  const recs = await dbGetByIndex(STORES.recommendations, "sessionId", sessionId);
  for (const r of recs) {
    // Delete associated traces
    const traces = await dbGetByIndex(STORES.decisionTraces, "recId", r.recId);
    for (const t of traces) await dbDelete(STORES.decisionTraces, t.traceId);
    await dbDelete(STORES.recommendations, r.recId);
  }
  return dbDelete(STORES.sessions, sessionId);
}

// Sets
async function getSetsForSession(sessionId) {
  return dbGetByIndex(STORES.sets, "sessionId", sessionId);
}

async function getSetsForMovement(movementId) {
  return dbGetByIndex(STORES.sets, "movementId", movementId);
}

async function getAllSets() {
  return dbGetAll(STORES.sets);
}

async function saveSet(set) {
  if (!set.setId) set.setId = uid();
  return dbPut(STORES.sets, set);
}

async function saveSets(sets) {
  return dbPutBulk(STORES.sets, sets);
}

async function deleteSet(setId) {
  return dbDelete(STORES.sets, setId);
}

// Measurements
async function getMeasurementsByType(type) {
  return dbGetByIndex(STORES.measurements, "type", type);
}

async function getMeasurementsByDate(dateISO) {
  return dbGetByIndex(STORES.measurements, "dateISO", dateISO);
}

async function saveMeasurement(measurement) {
  if (!measurement.measurementId) measurement.measurementId = uid();
  return dbPut(STORES.measurements, measurement);
}

/**
 * Palauttaa viimeisimmän kehonpainokirjauksen (kg).
 * Fallback: settings.bodyweightKg tai 91.
 * @param {object|null} settings — sovelluksen asetukset
 * @returns {Promise<number>} kehonpaino kiloina
 */
async function getLatestBodyweight(settings = null) {
  const bwMeasurements = await getMeasurementsByType("bodyweight");
  if (bwMeasurements.length > 0) {
    bwMeasurements.sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
    if (bwMeasurements[0].value !== null && bwMeasurements[0].value !== undefined) {
      return bwMeasurements[0].value;
    }
  }
  return settings?.bodyweightKg || 91;
}

/**
 * Tallentaa päivän kehonpainon mittaustaulukkoon.
 * @param {number} weightKg — kehonpaino kiloina
 * @param {string} dateISO — päivämäärä ISO-muodossa
 */
async function saveBodyweightEntry(weightKg, dateISO) {
  return saveMeasurement({
    type: "bodyweight",
    dateISO: dateISO || todayISO(),
    value: weightKg,
    valueTransformed: weightKg,
    source: "manual",
  });
}

// ── PRs (stored in measurements with type:"pr") ──
async function getAllPRs() {
  return getMeasurementsByType("pr");
}

async function savePR(pr) {
  if (!pr.measurementId) pr.measurementId = uid();
  pr.type = "pr";
  if (!pr.source) pr.source = "manual";
  return dbPut(STORES.measurements, pr);
}

async function deletePR(measurementId) {
  return dbDelete(STORES.measurements, measurementId);
}

const HISTORICAL_PRS_SEED = [
  { dateISO: "2025-04-04", movementName: "Lisäpainoleuanveto", value: 97, bodyweightKg: null, context: "Leuanvetofokus-kausi (ennen voimanostoblokkia)", isCompetition: false },
  { dateISO: "2025-08-02", movementName: "Penkkipunnerrus",    value: 170, bodyweightKg: 90, context: "Voimanostokisa 1", isCompetition: true },
  { dateISO: "2025-09-27", movementName: "Penkkipunnerrus",    value: 180, bodyweightKg: 90, context: "Voimanostokisa 2", isCompetition: true },
  { dateISO: "2025-09-27", movementName: "Takakyykky",          value: 200, bodyweightKg: 90, context: "Voimanostokisa 2", isCompetition: true },
  { dateISO: "2025-09-27", movementName: "Maastaveto",          value: 235, bodyweightKg: 90, context: "Voimanostokisa 2", isCompetition: true },
  { dateISO: "2026-04-13", movementName: "Lisäpainoleuanveto", value: 98, bodyweightKg: 90.3, context: "Maanantain testi (kisaa edeltävä)", isCompetition: false },
  { dateISO: "2026-04-18", movementName: "Lisäpainoleuanveto", value: 94, bodyweightKg: 88.5, context: "Leuanvetokisa 2026", isCompetition: true },
];

async function seedHistoricalPRsIfNeeded() {
  const meta = (await getAppMeta()) || { key: "meta" };
  if (meta.prsSeeded) return { seeded: false, count: 0 };
  const existing = await getAllPRs();
  if (existing.length > 0) {
    meta.prsSeeded = true;
    await dbPut(STORES.appMeta, meta);
    return { seeded: false, count: 0 };
  }
  let count = 0;
  for (const pr of HISTORICAL_PRS_SEED) {
    await savePR({
      type: "pr",
      dateISO: pr.dateISO,
      movementName: pr.movementName,
      value: pr.value,
      bodyweightKg: pr.bodyweightKg,
      context: pr.context,
      isCompetition: pr.isCompetition,
      source: "seed",
    });
    count++;
  }
  meta.prsSeeded = true;
  await dbPut(STORES.appMeta, meta);
  return { seeded: true, count };
}

// Mesocycles
async function getAllMesocycles() {
  return dbGetAll(STORES.mesocycles);
}

async function getActiveMesocycle() {
  const all = await getAllMesocycles();
  if (!all.length) return null;
  // Return the most recent mesocycle
  all.sort((a, b) => (b.startDateISO || "").localeCompare(a.startDateISO || ""));
  return all[0];
}

async function saveMesocycle(meso) {
  if (!meso.mesocycleId) meso.mesocycleId = uid();
  return dbPut(STORES.mesocycles, meso);
}

// Baselines
async function getBaseline(protocolId) {
  const all = await dbGetByIndex(STORES.baselines, "protocolId", protocolId);
  return all[0] || null;
}

async function saveBaseline(baseline) {
  if (!baseline.baselineId) baseline.baselineId = uid();
  return dbPut(STORES.baselines, baseline);
}

// Recommendations
async function saveRecommendation(rec) {
  if (!rec.recId) rec.recId = uid();
  return dbPut(STORES.recommendations, rec);
}

// Decision Traces
async function saveDecisionTrace(trace) {
  if (!trace.traceId) trace.traceId = uid();
  return dbPut(STORES.decisionTraces, trace);
}

async function getTracesForRec(recId) {
  return dbGetByIndex(STORES.decisionTraces, "recId", recId);
}

// Movement Progress
async function getMovementProgress(movementId) {
  return dbGet(STORES.movementProgress, movementId);
}

async function getAllMovementProgress() {
  return dbGetAll(STORES.movementProgress);
}

async function saveMovementProgress(progress) {
  progress.updatedAtISO = nowISO();
  return dbPut(STORES.movementProgress, progress);
}

// Protocols
async function getAllProtocols() {
  return dbGetAll(STORES.protocols);
}

async function saveProtocol(protocol) {
  if (!protocol.protocolId) protocol.protocolId = uid();
  return dbPut(STORES.protocols, protocol);
}

// App Meta
async function getAppMeta() {
  return dbGet(STORES.appMeta, "meta");
}

async function updateLastOpened() {
  const meta = (await getAppMeta()) || {
    key: "meta",
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAtISO: nowISO(),
    timezone: TIMEZONE,
  };
  meta.lastOpenedISO = nowISO();
  meta.appVersion = APP_VERSION;
  return dbPut(STORES.appMeta, meta);
}

// Settings (stored in appMeta store)
async function getSettings() {
  const s = await dbGet(STORES.appMeta, "settings");
  return s || {
    key: "settings",
    bodyweightKg: 91,
    maxDelta: 0.25,
    readinessVelocityWindowN: 10,
    readinessHrvWindowN: 14,
    readinessVaraWindowN: 5,
    velocityTypoThreshold: 0.4,
    vlStopPercent: 20,
    accessoryIncrementUpper: 2.5,
    accessoryIncrementLower: 5,
    stagnationThresholdWeeks: 3,
  };
}

async function saveSettings(settings) {
  settings.key = "settings";
  return dbPut(STORES.appMeta, settings);
}

// ── Backup / Restore ──
async function exportFullBackup() {
  const data = {};
  for (const storeName of Object.values(STORES)) {
    data[storeName] = await dbGetAll(storeName);
  }
  data._meta = {
    exportedAtISO: nowISO(),
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
  };
  return data;
}

async function importFullBackup(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Virheellinen backup-tiedosto");
  }

  // Clear all stores
  for (const storeName of Object.values(STORES)) {
    await dbClear(storeName);
  }

  // Import each store
  for (const storeName of Object.values(STORES)) {
    if (Array.isArray(data[storeName]) && data[storeName].length > 0) {
      await dbPutBulk(storeName, data[storeName]);
    }
  }

  // Re-seed presets if movements were empty
  const movements = await dbGetAll(STORES.movements);
  if (movements.length === 0) {
    await seedPresets();
  }
}

// ── CSV Import (historical data) ──
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else if (ch === ";" && !inQuotes) {
      // Support semicolon-separated CSV (common in Finnish locale)
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((l) => parseCSVLine(l));
  return { headers, rows };
}

async function importHistoricalCSV(text, columnMapping) {
  // columnMapping: { date: colIdx, movement: colIdx, weight: colIdx, reps: colIdx, sets: colIdx, vara: colIdx }
  const { headers, rows } = parseCSV(text);
  if (!rows.length) throw new Error("CSV on tyhjä");

  const movements = await getAllMovements();
  const movementByName = new Map(movements.map((m) => [m.name.toLowerCase(), m]));

  const sessionsByDate = new Map();
  const newSets = [];

  for (const row of rows) {
    const dateISO = row[columnMapping.date] || todayISO();
    const movementName = row[columnMapping.movement] || "Lisäpainoleuanveto";
    const weightKg = parseNumericInput(row[columnMapping.weight]);
    const reps = parseNumericInput(row[columnMapping.reps]);
    const setCount = parseNumericInput(row[columnMapping.sets]) || 1;
    const vara = columnMapping.vara !== undefined ? parseNumericInput(row[columnMapping.vara]) : null;

    if (reps === null || reps < 1) continue;

    // Find or create movement
    let mov = movementByName.get(movementName.toLowerCase());
    if (!mov) {
      mov = await addMovement(movementName, "muu");
      movementByName.set(movementName.toLowerCase(), mov);
    }

    // Find or create session for this date
    if (!sessionsByDate.has(dateISO)) {
      const session = {
        sessionId: uid(),
        dateISO,
        plannedDayType: null,
        mesocycleWeek: null,
        mesocycleId: null,
        bodyweightKg: null,
        notes: "CSV import",
        readinessCapLevel: null,
        readinessDetails: null,
      };
      sessionsByDate.set(dateISO, session);
    }

    const session = sessionsByDate.get(dateISO);

    for (let i = 0; i < setCount; i++) {
      newSets.push({
        setId: uid(),
        sessionId: session.sessionId,
        movementId: mov.movementId,
        variantId: null,
        setRole: "top",
        externalLoadKg: weightKg,
        reps: reps,
        targetReps: reps,
        targetVx: null,
        actualVx: vara,
        velocityMean: null,
        velocityPeak: null,
        velocityRep1: null,
        velocityLossPercent: null,
        tempo: null,
        restSec: null,
        deviceMeta: null,
        manualOverride: null,
      });
    }
  }

  // Save sessions and sets
  const sessions = Array.from(sessionsByDate.values());
  await dbPutBulk(STORES.sessions, sessions);
  await dbPutBulk(STORES.sets, newSets);

  return { sessionsImported: sessions.length, setsImported: newSets.length };
}

// ── Create default mesocycle ──
// ── Periodisaatiomalli ──
// Golden standard konjugoitu/blokkihybridi lisäpainoleuanvedolle:
//
// VIIKKORAKENNE (3 päivää):
//   Ma = MAKSIMIVOIMA  — kilpaveto, 2-3 toistoa, korkea intensiteetti, V1-V2
//   Ke = PERUSVOIMA    — variaatioveto, 4-6 toistoa, volyymi + hypertrofia, V2-V3
//   Pe = NOPEUSVOIMA   — kuminauhaveto, 2-3 toistoa max nopeus, V4+, kevyt kuorma
//
// MESOSYKLIRAKENNE (4 viikkoa):
//   Vk1 = Adaptaatio (0%)   — Totuttelevat kuormat, kaikkia osa-alueita
//   Vk2 = Loading (+2.5%)   — Progressiivinen ylikuorma
//   Vk3 = Overreach (+3.5%) — Maksimaalinen ärsyke, pienin Vara
//   Vk4 = Deload (-25%)     — Superkompensaatio, EI nopeuspäivää, vain kevyt ylläpito
//
// TUKILIIKKEET progressoivat:
//   Vk1-2: Täysi volyymi (perusvoimatyö + hypertrofia)
//   Vk3: Sama volyymi mutta korkeampi intensiteetti (pienemmät Vara-arvot)
//   Vk4: -30% volyymi, korkeat Varat (aktiivinen palautuminen)
//
// VOIMAOMINAISUUDET:
//   Maksimivoima = Ma (heavy) — hermoston adaptaatio, suurin kuorma
//   Perusvoima   = Ke (volume) — lihasten poikkipinta-ala + voimakestävyys
//   Nopeusvoima  = Pe (speed) — voimantuottonopeus, kuminauha, max intent

function createDefaultMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "default",
    startDateISO: startDateISO || todayISO(),
    weekCount: 4,
    weekDefs: [
      { week: 1, deltaPctBase: 0, label: "Adaptaatio", heavyReps: 3, heavyTargetVx: 2 },
      { week: 2, deltaPctBase: 0.025, label: "Loading", heavyReps: 3, heavyTargetVx: 1 },
      { week: 3, deltaPctBase: 0.035, label: "Overreach", heavyReps: 2, heavyTargetVx: 1 },
      { week: 4, deltaPctBase: -0.25, label: "Deload", heavyReps: 3, heavyTargetVx: 4 },
    ],
    weekPlans: [
      // ── VIIKKO 1: ADAPTAATIO ──
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 3, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 6, targetVx: 3 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 5, targetVx: 3 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 2: LOADING ──
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 3, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 6, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 5, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 3: OVERREACH ──
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (overreach)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 4, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 5, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 6, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima (overreach)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 4, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 8, targetVx: null },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 2, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 4: DELOAD (superkompensaatio) ──
      // Ei nopeuspäivää — vain kevyt maksimivoima + perusvoima
      {
        week: 4,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 3, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 2, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 4 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 2, reps: 8, targetVx: 4 },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Peaking mesocycle (4-week competition prep) ──
// Redesign 2026-03: Gradual volume taper, maintain frequency, sufficient accessories
// Vk1: 3×/vk kova, täydet tukiliikkeet
// Vk2: 3×/vk kova intensiteetti, tukiliikkeet -30%
// Vk3: 2×/vk taper, intensiteetti ylläpidossa, volyymi -50%, minimaaliset tukiliikkeet
// Vk4: 2 päivää — opener-harjoitus + kilpailu
function createPeakingMesocycle(startDateISO, e1rmExternal, bodyweightKg) {
  const e1rm = e1rmExternal || 93;
  const bw = bodyweightKg || 91;

  // Peaking config for attempt calculation
  const peakingConfig = {
    e1rmExternal: e1rm,
    bodyweightKg: bw,
    openerPct: 0.92,    // ~92% of e1RM as opener
    secondPct: 0.97,    // ~97% for 2nd attempt
    thirdPct: 1.02,     // ~102% for 3rd attempt (PR attempt)
    warmupPcts: [0.40, 0.60, 0.75, 0.85, 0.90],
  };

  return {
    mesocycleId: uid(),
    type: "peaking",
    startDateISO: startDateISO || todayISO(),
    weekCount: 4,
    peakingConfig,
    weekDefs: [
      { week: 1, deltaPctBase: 0.02, label: "Intensification", heavyReps: 2, heavyTargetVx: 1 },
      { week: 2, deltaPctBase: 0.04, label: "Realization", heavyReps: 1, heavyTargetVx: 1 },
      { week: 3, deltaPctBase: -0.10, label: "Taper", heavyReps: 2, heavyTargetVx: 3 },
      { week: 4, deltaPctBase: 0, label: "Kilpailu", heavyReps: 1, heavyTargetVx: 0 },
    ],
    weekPlans: [
      // ── VIIKKO 1: INTENSIFICATION (3×/vk) ──
      // Kova maksimivoima + volyymipäivä + nopeuspäivä
      // Täydet tukiliikkeet — ylläpidetään kuntoa
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (kilpaveto)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 4, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 6, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 6, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima + tuki",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 4, reps: 4, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 5, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 8, targetVx: null },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 2: REALIZATION (3×/vk) ──
      // Kovempi intensiteetti pääliikkeessä, tukiliikkeitä -30%
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (kova)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 4, reps: 1, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 2, reps: 3, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 6, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 6, targetVx: 2 },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima + ylläpito",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 3, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 4, reps: 2, targetVx: 4 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 2, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 3: TAPER (2×/vk) ──
      // Volyymi -50%, intensiteetti ylläpidossa, minimaaliset tukiliikkeet
      // Ei nopeuspäivää — superkompensaatio alkaa
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (taper)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 2, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 6, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 2, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Kevyt ylläpito",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 2, reps: 3, targetVx: 3 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
            ],
          },
        ],
      },
      // ── VIIKKO 4: KILPAILU (2 päivää) ──
      // Ma: Kevyt opener-harjoitus (aktivointi, ei kuormita)
      // Pe: Kilpailupäivä — lämmittely + 3 yritystä
      {
        week: 4,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Opener (aktivointi)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 2, reps: 2, targetVx: 4 },
            ],
          },
          {
            dayOfWeek: 5, dayType: "competition", label: "Kilpailupäivä",
            slots: [
              { role: "warmup", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 5, reps: 1, targetVx: null, loadPctE1RM: [0.40, 0.60, 0.75, 0.85, 0.90] },
              { role: "opener", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 1, reps: 1, targetVx: 0, loadPctE1RM: 0.92 },
              { role: "attempt2", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 1, reps: 1, targetVx: 0, loadPctE1RM: 0.97 },
              { role: "attempt3", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 1, reps: 1, targetVx: 0, loadPctE1RM: 1.02 },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Mesocycle template registry ──
// All available mesocycle templates with metadata for UI
const MESOCYCLE_TEMPLATES = [
  { id: "default",       label: "Perusjakso (Ma/Pe/No)",     icon: "⚡", desc: "3×/vk — Maksimivoima + Perusvoima + Nopeusvoima, 4 viikkoa", weeks: 4, factory: "createDefaultMesocycle" },
  { id: "hypertrofia",   label: "Hypertrofiajakso",          icon: "💪", desc: "3×/vk — Korkea volyymi, 6-8 toistoa, lihasmassan kasvatus, 4 viikkoa", weeks: 4, factory: "createHypertrofiaMesocycle" },
  { id: "maksimivoima",  label: "Maksimivoima-blokki",       icon: "🏋️", desc: "3×/vk — 2× maksimivoima + nopeusvoima, 1-3 toistoa, hermostollinen, 4 viikkoa", weeks: 4, factory: "createMaksimivoimaMesocycle" },
  { id: "eksentrinen",   label: "Eksentrinen blokki",        icon: "⬇️", desc: "2×/vk — Korokeveto + isometria, supramaksimaalinen, 4 viikkoa", weeks: 4, factory: "createEksenterinenMesocycle" },
  { id: "dup",           label: "DUP-jakso",                 icon: "🔄", desc: "3×/vk — Undulating: voima/hypertrofia/nopeus vaihtuu päivittäin, 4 viikkoa", weeks: 4, factory: "createDUPMesocycle" },
  { id: "siirtyma",      label: "Siirtymäjakso (GPP)",       icon: "🌿", desc: "2-3×/vk — Yleiskunto, ote, prehab, kevyt, 3 viikkoa", weeks: 3, factory: "createSiirtymaMesocycle" },
  { id: "palautuminen",  label: "Palautumisjakso",           icon: "😴", desc: "2×/vk — Aktiivinen palautuminen, matala intensiteetti, 2 viikkoa", weeks: 2, factory: "createPalautuminenMesocycle" },
  { id: "peaking",          label: "Peaking (kilpailuun)",          icon: "🏆", desc: "4 viikkoa — Kilpailuun virittäytyminen, vaatii e1RM:n", weeks: 4, factory: "createPeakingMesocycle" },
  { id: "streetlifting_16w", label: "Streetlifting 16 vk 🏋️",       icon: "🏋️", desc: "16 viikkoa — 4 kisaliikettä (MU/Leuka/Dippi/Kyykky), Hybrid Block-DUP, kisa-elokuu 2026", weeks: 16, factory: "createStreetlifting16WMesocycle" },
];

// ── Hypertrofiajakso (4 viikkoa, 3×/vk) ──
// Tavoite: Lihasmassan kasvu leuanveto-spesifisessä lihaksistossa
// Korkea volyymi, kohtuullinen intensiteetti, V2-V3
function createHypertrofiaMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "hypertrofia",
    startDateISO: startDateISO || todayISO(),
    weekCount: 4,
    weekDefs: [
      { week: 1, deltaPctBase: -0.10, label: "Volyymipohja",  heavyReps: 6, heavyTargetVx: 3 },
      { week: 2, deltaPctBase: -0.05, label: "Volyymilataus",  heavyReps: 6, heavyTargetVx: 2 },
      { week: 3, deltaPctBase: 0,     label: "Volyymipeak",    heavyReps: 8, heavyTargetVx: 2 },
      { week: 4, deltaPctBase: -0.25, label: "Deload",         heavyReps: 6, heavyTargetVx: 4 },
    ],
    weekPlans: [
      // ── VIIKKO 1: VOLYYMIPOHJA ──
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Perusvoima A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 6, targetVx: 3 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima B",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 10, targetVx: 3 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 10, targetVx: 3 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "volume", label: "Perusvoima C",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 6, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 4, reps: 10, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Cable crunch", sets: 3, reps: 15, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 2: VOLYYMILATAUS ──
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Perusvoima A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 6, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima B",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 10, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 10, targetVx: 2 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "volume", label: "Perusvoima C",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 6, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 4, reps: 10, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Cable crunch", sets: 3, reps: 15, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 3: VOLYYMIPEAK ──
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Perusvoima A (peak)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 8, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 10, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 4, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima B (peak)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 10, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 10, targetVx: 2 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "volume", label: "Perusvoima C (peak)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 8, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 4, reps: 10, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 4, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Cable crunch", sets: 3, reps: 15, targetVx: null },
            ],
          },
        ],
      },
      // ── VIIKKO 4: DELOAD ──
      {
        week: 4,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Perusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 6, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 2, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Maksimivoima-blokki (4 viikkoa, 3×/vk) ──
// Tavoite: Hermostollinen adaptaatio, suurin kuorma, 1-3 toistoa
// 2× heavy + 1× speed, vähemmän tukiliikkeitä
function createMaksimivoimaMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "maksimivoima",
    startDateISO: startDateISO || todayISO(),
    weekCount: 4,
    weekDefs: [
      { week: 1, deltaPctBase: 0.01, label: "Pohja",     heavyReps: 3, heavyTargetVx: 2 },
      { week: 2, deltaPctBase: 0.03, label: "Lataus",    heavyReps: 2, heavyTargetVx: 1 },
      { week: 3, deltaPctBase: 0.05, label: "Peak",      heavyReps: 1, heavyTargetVx: 1 },
      { week: 4, deltaPctBase: -0.20, label: "Deload",   heavyReps: 3, heavyTargetVx: 4 },
    ],
    weekPlans: [
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 3, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 4, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 5, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "heavy", label: "Maksimivoima B",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 3 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 6, targetVx: 2 },
            ],
          },
        ],
      },
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 4, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 5, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "heavy", label: "Maksimivoima B",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 2, reps: 4, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 6, targetVx: 2 },
            ],
          },
        ],
      },
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima A (peak)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 1, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 3, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 5, targetVx: 2 },
            ],
          },
          {
            dayOfWeek: 3, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "heavy", label: "Maksimivoima B (peak)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 1, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 2, reps: 3, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 5, targetVx: 2 },
            ],
          },
        ],
      },
      {
        week: 4,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 3, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 6, targetVx: 4 },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Perusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 4 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 2, reps: 10, targetVx: null },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Eksentrinen blokki (4 viikkoa, 2×/vk) ──
// Tavoite: Supramaksimaalinen eksentrinen kuorma + isometria
// Korokeveto (eksentrisesti) + ylipito, harvempi frekvenssi
function createEksenterinenMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "eksentrinen",
    startDateISO: startDateISO || todayISO(),
    weekCount: 4,
    weekDefs: [
      { week: 1, deltaPctBase: 0,     label: "Totuttelu",   heavyReps: 3, heavyTargetVx: 2 },
      { week: 2, deltaPctBase: 0.03,  label: "Lataus",      heavyReps: 2, heavyTargetVx: 1 },
      { week: 3, deltaPctBase: 0.05,  label: "Overload",    heavyReps: 2, heavyTargetVx: 1 },
      { week: 4, deltaPctBase: -0.20, label: "Deload",      heavyReps: 3, heavyTargetVx: 4 },
    ],
    weekPlans: [
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Eksentrinen A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Korokeveto", sets: 4, reps: 3, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 5, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 6, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Isometria + volyymi",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "2s ylipito", sets: 4, reps: 4, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Eksentrinen A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Korokeveto", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 4, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 6, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Isometria + volyymi",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "2s ylipito", sets: 4, reps: 3, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Eksentrinen A (overload)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Korokeveto", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 3, targetVx: 2 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 5, targetVx: 2 },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Isometria (overload)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "2s ylipito", sets: 5, reps: 3, targetVx: 1 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 4,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Kilpaveto (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 3, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 4 },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Perusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Kilpaveto (leveä vastaote)", sets: 3, reps: 5, targetVx: 4 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── DUP-jakso (4 viikkoa, 3×/vk) ──
// Daily Undulating Periodization: voima/hypertrofia/nopeus vaihtelee päivittäin
// Sama viikkorakenne kuin default mutta eri painotus: H-V-S aina eri järjestyksessä
function createDUPMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "dup",
    startDateISO: startDateISO || todayISO(),
    weekCount: 4,
    weekDefs: [
      { week: 1, deltaPctBase: 0,     label: "Adaptaatio",  heavyReps: 3, heavyTargetVx: 2 },
      { week: 2, deltaPctBase: 0.02,  label: "Loading",     heavyReps: 2, heavyTargetVx: 1 },
      { week: 3, deltaPctBase: 0.04,  label: "Overreach",   heavyReps: 2, heavyTargetVx: 1 },
      { week: 4, deltaPctBase: -0.25, label: "Deload",      heavyReps: 3, heavyTargetVx: 4 },
    ],
    weekPlans: [
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 3, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 6, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 8, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 4, reps: 6, targetVx: 3 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 10, targetVx: 3 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 12, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: null },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 6, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: null },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "heavy", label: "Maksimivoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 4, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 6, targetVx: 2 },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "volume", label: "Perusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 6, targetVx: 2 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 8, targetVx: 2 },
              { role: "accessory", category: "ojentajaekstensio", defaultMovementName: "Tricep pushdown", sets: 3, reps: 12, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Perusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 6, targetVx: 2 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 8, targetVx: 2 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "speed", label: "Nopeusvoima",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 8, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "heavy", label: "Maksimivoima (peak)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 5, reps: 2, targetVx: 1 },
              { role: "backoff", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 2, reps: 3, targetVx: 2 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 5, targetVx: 2 },
            ],
          },
        ],
      },
      {
        week: 4,
        days: [
          {
            dayOfWeek: 1, dayType: "heavy", label: "Maksimivoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 3, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 4 },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Perusvoima (kevyt)",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 4 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Siirtymäjakso / GPP (3 viikkoa, 2-3×/vk) ──
// Tavoite: Yleiskunnon ylläpito, oteharjoittelu, prehab, aktiivinen palautuminen
// Ei raskaita sarjoja, painotus otteessa ja liikkuvuudessa
function createSiirtymaMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "siirtyma",
    startDateISO: startDateISO || todayISO(),
    weekCount: 3,
    weekDefs: [
      { week: 1, deltaPctBase: -0.15, label: "GPP pohja",    heavyReps: 5, heavyTargetVx: 3 },
      { week: 2, deltaPctBase: -0.10, label: "GPP lataus",   heavyReps: 5, heavyTargetVx: 3 },
      { week: 3, deltaPctBase: -0.10, label: "GPP huippu",   heavyReps: 5, heavyTargetVx: 3 },
    ],
    weekPlans: [
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Ote + veto",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Neutraaliote", sets: 4, reps: 5, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "muu", defaultMovementName: "Dead hang", sets: 3, reps: 1, targetVx: null },
              { role: "accessory", category: "muu", defaultMovementName: "Rannekoukistus", sets: 3, reps: 15, targetVx: null },
            ],
          },
          {
            dayOfWeek: 3, dayType: "volume", label: "Ylävartalo",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Myötäoteveto", sets: 4, reps: 6, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 10, targetVx: 3 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "core", defaultMovementName: "Pallof press", sets: 3, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 5, dayType: "volume", label: "Tempo + prehab",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "1.5-toisto hiissaus", sets: 3, reps: 5, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 12, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 12, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Ote + veto",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Neutraaliote", sets: 4, reps: 5, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "muu", defaultMovementName: "Dead hang", sets: 3, reps: 1, targetVx: null },
              { role: "accessory", category: "muu", defaultMovementName: "Rannekoukistus", sets: 3, reps: 15, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Ylävartalo",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Myötäoteveto", sets: 4, reps: 6, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 10, targetVx: 3 },
              { role: "accessory", category: "horisontaalityöntö", defaultMovementName: "Penkkipunnerrus", sets: 3, reps: 8, targetVx: 3 },
              { role: "accessory", category: "core", defaultMovementName: "Pallof press", sets: 3, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 3,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Ote + veto",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "Neutraaliote", sets: 4, reps: 6, targetVx: 3 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 4, reps: 8, targetVx: 3 },
              { role: "accessory", category: "muu", defaultMovementName: "Dead hang", sets: 4, reps: 1, targetVx: null },
              { role: "accessory", category: "muu", defaultMovementName: "Rannekoukistus", sets: 3, reps: 15, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Ylävartalo + tempo",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", variantName: "1.5-toisto hiissaus", sets: 3, reps: 5, targetVx: 3 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 3, reps: 10, targetVx: 3 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 3, reps: 12, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 3, reps: 12, targetVx: null },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Palautumisjakso (2 viikkoa, 2×/vk) ──
// Tavoite: Aktiivinen palautuminen, superkompensaatio ennen uutta blokkia
// Hyvin matala intensiteetti ja volyymi, ei progressiota
function createPalautuminenMesocycle(startDateISO) {
  return {
    mesocycleId: uid(),
    type: "palautuminen",
    startDateISO: startDateISO || todayISO(),
    weekCount: 2,
    weekDefs: [
      { week: 1, deltaPctBase: -0.25, label: "Aktiivinen lepo",     heavyReps: 5, heavyTargetVx: 4 },
      { week: 2, deltaPctBase: -0.20, label: "Aktivointi",           heavyReps: 4, heavyTargetVx: 4 },
    ],
    weekPlans: [
      {
        week: 1,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Kevyt ylläpito A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Alatalja", sets: 3, reps: 10, targetVx: 4 },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 2, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Kevyt ylläpito B",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 5, targetVx: 4 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hauiskääntö tanko", sets: 2, reps: 10, targetVx: null },
            ],
          },
        ],
      },
      {
        week: 2,
        days: [
          {
            dayOfWeek: 1, dayType: "volume", label: "Aktivointi A",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 4, targetVx: 4 },
              { role: "accessory", category: "horisontaaliveto", defaultMovementName: "Penkkiveto", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "hauisfleksio", defaultMovementName: "Hammer curl", sets: 2, reps: 10, targetVx: null },
              { role: "accessory", category: "core", defaultMovementName: "Hanging leg raise", sets: 2, reps: 10, targetVx: null },
            ],
          },
          {
            dayOfWeek: 4, dayType: "volume", label: "Aktivointi B",
            slots: [
              { role: "primary", category: "vertikaaliveto", defaultMovementName: "Lisäpainoleuanveto", sets: 3, reps: 4, targetVx: 4 },
              { role: "accessory", category: "vertikaaliveto", defaultMovementName: "Ylätalja", sets: 3, reps: 8, targetVx: 4 },
              { role: "accessory", category: "vertikaalityöntö", defaultMovementName: "Pystypunnerrus", sets: 2, reps: 10, targetVx: 4 },
            ],
          },
        ],
      },
    ],
    postCycleAnalysis: null,
  };
}

// ── Ensure all variant presets exist (migration) ──
async function ensureAllVariantsSeeded() {
  const movements = await dbGetAll(STORES.movements);
  const primaryMov = movements.find(m => m.isPrimary);
  if (!primaryMov) return;

  const existingVariants = await dbGetByIndex(STORES.variants, "movementId", primaryMov.movementId);
  const existingNames = new Set(existingVariants.map(v => v.name));

  const toAdd = PRIMARY_VARIANTS.filter(pv => !existingNames.has(pv.name));
  if (toAdd.length === 0) return;

  const newVariants = toAdd.map(v => ({
    variantId: uid(),
    movementId: primaryMov.movementId,
    name: v.name,
    isDefault: v.isDefault,
    tags: v.tags || [],
    notes: "",
  }));
  await dbPutBulk(STORES.variants, newVariants);

  // Also update existing variants to include tags if missing
  for (const ev of existingVariants) {
    const preset = PRIMARY_VARIANTS.find(pv => pv.name === ev.name);
    if (preset && (!ev.tags || ev.tags.length === 0)) {
      ev.tags = preset.tags || [];
      await dbPut(STORES.variants, ev);
    }
  }
}

// ── Variant helpers ──
async function getVariantByName(name) {
  const allVariants = await dbGetAll(STORES.variants);
  return allVariants.find(v => v.name === name) || null;
}

async function getAllVariants() {
  return dbGetAll(STORES.variants);
}

// ── Initialize database ──
async function initDB() {
  await openDB();
  if (_db) {
    await seedPresets();
    await ensureAllVariantsSeeded();
    await updateLastOpened();
  }
  return _db;
}

// ── Streetlifting 16-week mesocycle (Hybrid Block-DUP, 4 lifts) ──
// Calibration defaults: Leuka ext=85, Dippi ext=75, Kyykky=160, BW=91
// Loads from Excel Ohjelma-viikot (2026-04) scaled by athlete's e1RM ratio.
function createStreetlifting16WMesocycle(startDateISO, cal = {}) {
  const BW = cal.bwKg || 91;
  const L  = cal.leukaExtKg  || 85;
  const D  = cal.dippiExtKg  || 75;
  const K  = cal.kyykkyExtKg || 160;

  const lS = L / 85;
  const dS = D / 75;
  const kS = K / 160;

  // round helpers
  const l = kg => Math.round(Math.max(0, kg * lS) * 4) / 4;    // nearest 0.25 kg
  const d = kg => Math.round(Math.max(0, kg * dS) * 4) / 4;
  const k = kg => Math.round(Math.max(0, kg * kS) / 2.5) * 2.5; // nearest 2.5 kg

  // ─── Slot-driven accessory arrays (v4.11) ───
  // Each slot carries slotId → engine resolves movement + rep scheme at render time
  // based on current phase + mesocycle overrides + stagnation signals.
  // The defaultMovementName here is a fallback for legacy renderers and initial view.
  const slotAccessory = (slotId, category, fallbackName, overrides = {}) => ({
    role: "accessory",
    slotId,
    category,
    defaultMovementName: fallbackName,
    // repScheme is resolved per phase by engine; these are foundation-phase defaults.
    sets: overrides.sets ?? 3,
    reps: overrides.reps ?? 10,
    targetVx: overrides.targetVx ?? null,
    ...(overrides.note ? { note: overrides.note } : {}),
  });

  const pullAcc = () => [
    slotAccessory("pull-vertical-explosive", "vertikaaliveto",   "Leuanveto chest-to-bar", { sets:3, reps:5,  targetVx:3 }),
    slotAccessory("pull-horizontal-heavy",   "horisontaaliveto", "Chest-supported row",    { sets:4, reps:8 }),
    slotAccessory("bicep-chain",             "hauisfleksio",     "Hauiskääntö tanko",       { sets:3, reps:12 }),
    slotAccessory("scapular-control",        "horisontaaliveto", "Face pull",              { sets:3, reps:15 }),
  ];
  const lowerAcc = () => [
    slotAccessory("hip-hinge",                  "alaraaja", "Maastaveto",              { sets:3, reps:8,  note:"RDL" }),
    slotAccessory("knee-dominant-accessory",    "alaraaja", "Jalkaprässi",             { sets:3, reps:10 }),
    slotAccessory("knee-unilateral",            "alaraaja", "Bulgarian split squat",   { sets:3, reps:10 }),
    slotAccessory("hamstring-isolation",        "alaraaja", "Leg curl",                { sets:3, reps:12 }),
  ];
  const pushAcc = () => [
    slotAccessory("bench-heavy",         "horisontaalityöntö", "Penkkipunnerrus",    { sets:4, reps:6,  targetVx:3, note:"kapea ote" }),
    slotAccessory("shoulder-vertical",   "vertikaalityöntö",   "Pystypunnerrus",     { sets:3, reps:8 }),
    slotAccessory("tricep-lockout",      "ojentajaekstensio",  "Tricep pushdown",    { sets:3, reps:12 }),
    slotAccessory("shoulder-isolation",  "vertikaalityöntö",   "Sivunosto",          { sets:3, reps:15 }),
  ];
  const mixAcc = () => [
    slotAccessory("core-hollow",     "core",             "Ab wheel rollout",   { sets:3, reps:10 }),
    slotAccessory("scapular-control","horisontaaliveto", "Face pull",          { sets:2, reps:15 }),
  ];

  // ─── Day builders ───

  function maDay(label, sets, reps, vx, lLoad, lBackoff, topSingle) {
    const slots = [
      { role:"primary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
        sets, reps, targetVx:vx, suggestedLoadKg:l(lLoad), competitionLift:true },
    ];
    if (lBackoff) {
      slots.push({ role:"backoff", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
        sets:2, reps:reps+1, targetVx:vx+1, suggestedLoadKg:l(lBackoff) });
    }
    if (topSingle) {
      slots.push({ role:"secondary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
        sets:1, reps:1, targetVx:1, suggestedLoadKg:l(topSingle), note:"Top single RPE 8" });
    }
    return { dayOfWeek:1, dayType:"heavy", label:label || "MA — Leuka + Selkä",
      warmup: [
        { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely" },
        { name: "Face pull", desc: "2×15, kevyt — hartiat ja lapaluut liikkeeseen" },
        { name: "Scapular hang", desc: "3×10 s, lapa-aktivaatio ennen vetoja" },
      ],
      slots:[...slots, ...pullAcc()] };
  }

  function tiDay(label, sets, reps, vx, kLoad, topSingle) {
    const kPause = Math.round(k(kLoad) * 0.85 / 2.5) * 2.5;
    const slots = [
      { role:"primary", category:"alaraaja", defaultMovementName:"Takakyykky",
        sets, reps, targetVx:vx, suggestedLoadKg:k(kLoad), competitionLift:true, isBarbell:true },
      { role:"backoff", category:"alaraaja", defaultMovementName:"Takakyykky",
        sets:3, reps:reps, targetVx:vx+1, suggestedLoadKg:kPause, note:"Pause squat 2s" },
    ];
    if (topSingle) {
      slots.push({ role:"secondary", category:"alaraaja", defaultMovementName:"Takakyykky",
        sets:1, reps:1, targetVx:1, suggestedLoadKg:k(topSingle), note:"Top single RPE 8", isBarbell:true });
    }
    return { dayOfWeek:2, dayType:"heavy", label:label || "TI — Kyykky + Alavartalo",
      warmup: [
        { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely" },
        { name: "Heel Elevated Goblet Squat", desc: "2×10, 2s alas · 1s pohja · 2s ylös" },
      ],
      slots:[...slots, ...lowerAcc()] };
  }

  function toDay(label, sets, reps, vx, dLoad, dBackoff, topSingle) {
    const slots = [
      { role:"primary", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
        sets, reps, targetVx:vx, suggestedLoadKg:d(dLoad), competitionLift:true },
    ];
    if (dBackoff) {
      slots.push({ role:"backoff", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
        sets:2, reps:reps+1, targetVx:vx+1, suggestedLoadKg:d(dBackoff) });
    }
    if (topSingle) {
      slots.push({ role:"secondary", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
        sets:1, reps:1, targetVx:1, suggestedLoadKg:d(topSingle), note:"Top single RPE 8" });
    }
    return { dayOfWeek:4, dayType:"heavy", label:label || "TO — Dippi + Työntö",
      warmup: [
        { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely" },
        { name: "Face pull", desc: "2×15, kevyt — hartiakapselit liikkeeseen" },
        { name: "Band pull-apart", desc: "2×15, takaolka auki" },
      ],
      slots:[...slots, ...pushAcc()] };
  }

  function laDay(label, muLoad, muSets, muNote, muVx) {
    const isSkill = muLoad === 0;
    const slots = [
      { role:"primary", category:"vertikaaliveto", defaultMovementName:"Muscle-up",
        sets:muSets || 5, reps:isSkill ? 3 : 1, targetVx:isSkill ? null : (muVx ?? null),
        suggestedLoadKg:muLoad, competitionLift:true, muSkillPhase:isSkill,
        note:muNote || (isSkill ? "Skill: eksentriset + transitiot + banded" : `+${muLoad} kg`) },
      slotAccessory("mu-transition",   "vertikaaliveto",     "Leuanveto chest-to-bar", { sets:4, reps:isSkill?8:5, targetVx:3, note:"Kevyt — nopeus" }),
      slotAccessory("mu-dip-support",  "horisontaalityöntö", "Lisäpainodippi",         { sets:3, reps:isSkill?8:5, targetVx:3, note:"Kevyt — prehab" }),
      ...mixAcc(),
    ];
    return { dayOfWeek:6, dayType:"volume", label:label || "LA — Muscle-up + Kevyt",
      warmup: [
        { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely" },
        { name: "Scapular pull-up", desc: "2×10, lapa-aktivaatio ennen MU:ta" },
        { name: "False Grip hang", desc: "3×20 s, ranteiden asento kuntoon" },
        { name: "Räjähtävä leuka", desc: "3×3 BW, maksimaalinen nopeus ylös" },
      ],
      slots };
  }

  // ─── 16-week plan ───
  const weekPlans = [
    // ── BLOKKI 1: PERUSTA — Hypertrofia + MU tekniikka (vk 1-4) ──
    { week:1, days:[
      maDay("MA — Leuka + Selkä",        4,6,3, 50,  null,  null),
      tiDay("TI — Kyykky + Alavartalo",  4,6,3, 120, null),
      toDay("TO — Dippi + Työntö",       4,6,3, 38,  null,  null),
      laDay("LA — MU tekniikka",         0, 5, "Eksentriset 5×1-2 · transitiot 5×3 · räjähtävät leuat 4×3"),
    ]},
    { week:2, days:[
      maDay("MA — Leuka",  4,6,3, 55,  null, null),
      tiDay("TI — Kyykky", 4,6,3, 130, null),
      toDay("TO — Dippi",  4,6,3, 43,  null, null),
      laDay("LA — MU tekniikka", 0, 5, "Eksentriset + banded MU + transitiot — eteneminen tärkeä"),
    ]},
    { week:3, days:[
      maDay("MA — Leuka (raskas)",  4,6,2, 60,  null, null),
      tiDay("TI — Kyykky",         4,6,3, 140, null),
      toDay("TO — Dippi (raskas)", 4,6,2, 48,  null, null),
      laDay("LA — MU tavoite: ENSIMMÄINEN STRICT", 0, 5, "🎯 Tavoite: ensimmäinen puhdas strict muscle-up"),
    ]},
    { week:4, days:[
      maDay("MA — Deload",  3,5,4, 40,  null, null),
      tiDay("TI — Deload",  3,5,4, 110, null),
      toDay("TO — Deload",  3,5,4, 30,  null, null),
      laDay("LA — Deload + testaus", 0, 3, "Kevyt tekninen · 3RM testit (leuka/dippi/kyykky)"),
    ]},

    // ── BLOKKI 2: VOIMA — Akkumulaatio (vk 5-8) ──
    { week:5, days:[
      maDay("MA — Leuka 5×4",  5,4,2, 55,  45,   null),
      tiDay("TI — Kyykky 5×4", 5,4,2, 150, null),
      toDay("TO — Dippi 5×4",  5,4,2, 50,  40,   null),
      laDay("LA — MU +2.5 kg", 2.5, 3, "Ensimmäinen painolla (+2.5 kg) — jos strict puhdas", 2),
    ]},
    { week:6, days:[
      maDay("MA — Leuka 5×4",  5,4,2, 60,  50,  null),
      tiDay("TI — Kyykky 5×4", 5,4,2, 160, null),
      toDay("TO — Dippi 5×4",  5,4,2, 55,  45,  null),
      laDay("LA — MU +2.5 kg", 2.5, 3, "+2.5 kg (tai +5 jos edellinen meni hyvin)", 2),
    ]},
    { week:7, days:[
      maDay("MA — Leuka 5×4 (raskas)", 5,4,1, 65,  52.5, null),
      tiDay("TI — Kyykky 5×4",         5,4,2, 170, null),
      toDay("TO — Dippi 5×4 (raskas)", 5,4,1, 60,  50,   null),
      laDay("LA — MU +5 kg",           5, 3, "+5 kg — raskas viikko", 1),
    ]},
    { week:8, days:[
      maDay("MA — Deload + leuka testi", 3,3,4, 35,  null, 80),
      tiDay("TI — Deload + kyykky testi",3,3,4, 110, 180),
      toDay("TO — Deload + dippi testi", 3,3,4, 25,  null, 65),
      laDay("LA — Deload", 0, 2, "Kevyt tekninen — lepo ennen blokki 3"),
    ]},

    // ── BLOKKI 3: INTENSIFIKAATIO (vk 9-12) ──
    { week:9, days:[
      maDay("MA — Leuka 4×3 + top single", 4,3,1, 75, null, 85),
      tiDay("TI — Kyykky 4×3 + top single",4,3,1, 165,185),
      toDay("TO — Dippi 4×3 + top single", 4,3,1, 65, null, 72.5),
      laDay("LA — MU +7.5 kg", 7.5, 4, "+7.5 kg — intensifikaatio", 1),
    ]},
    { week:10, days:[
      maDay("MA — Leuka 4×3 + top single", 4,3,1, 80, null, 90),
      tiDay("TI — Kyykky 4×3 + top single",4,3,1, 175,190),
      toDay("TO — Dippi 4×3 + top single", 4,3,1, 70, null, 77.5),
      laDay("LA — MU +10 kg", 10, 3, "+10 kg", 1),
    ]},
    { week:11, days:[
      maDay("MA — Leuka 4×3 + top single", 4,3,1, 85, null, 92.5),
      tiDay("TI — Kyykky 4×3 + top single",4,3,1, 180,195),
      toDay("TO — Dippi 4×3 + top single", 4,3,1, 75, null, 82.5),
      laDay("LA — MU +12.5 kg (viimeinen raskas)", 12.5, 3, "+12.5 kg", 1),
    ]},
    { week:12, days:[
      maDay("MA — Deload + RPE9 leuka testi 🎯", 2,2,4, 50,  null, 92),
      tiDay("TI — Deload + RPE9 kyykky testi 🎯",2,2,4, 130, 200),
      toDay("TO — Deload + RPE9 dippi testi 🎯",  2,2,4, 35,  null, 80),
      laDay("LA — Kevyt aktivointi", 0, 2, "Lepo — kevyt liike"),
    ]},

    // ── BLOKKI 4: REALIZATION + TAPER (vk 13-16) ──
    // vk 13: 3×2 @~100% (Vx=1) + backoff 3×3 @~75% fatiikan hallintaan
    // vk 14: 2×1 @~108% PR-yritys + backoff 2×2 @~78% (ei pelkkiä singletejä — KoW/CA-benchmark)
    { week:13, days:[
      maDay("MA — Realization 3×2 + backoff", 3,2,1, 85,  65, null),
      tiDay("TI — Realization 3×2 + backoff", 3,2,1, 190,null),
      toDay("TO — Realization 3×2 + backoff", 3,2,1, 75,  57.5, null),
      laDay("LA — MU +15 kg",        15, 4, "+15 kg — competition ready", 1),
    ]},
    { week:14, days:[
      maDay("MA — Peaking 2×1 PR-yritys + backoff", 2,1,1, 92,  67.5, null),
      tiDay("TI — Peaking 2×1 PR-yritys + backoff", 2,1,1, 195, null),
      toDay("TO — Peaking 2×1 PR-yritys + backoff", 2,1,1, 80,  60,   null),
      laDay("LA — MU opener rehearsal", 15, 3, "Opener harjoitus +15 kg", 1),
    ]},
    { week:15, days:[
      { dayOfWeek:1, dayType:"heavy", label:"MA — Taper opener-harjoitus", slots:[
        { role:"primary",   category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:l(70),  note:"@85% = lämmittely" },
        { role:"secondary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:l(75),  note:"Opener +75 kg", competitionLift:true },
      ]},
      { dayOfWeek:2, dayType:"heavy", label:"TI — Taper kyykky", slots:[
        { role:"primary",   category:"alaraaja", defaultMovementName:"Takakyykky",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:k(170), note:"@85%", isBarbell:true },
        { role:"secondary", category:"alaraaja", defaultMovementName:"Takakyykky",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:k(180), note:"Opener 180 kg", isBarbell:true, competitionLift:true },
      ]},
      { dayOfWeek:4, dayType:"heavy", label:"TO — Taper dippi", slots:[
        { role:"primary",   category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:d(55),  note:"@85%" },
        { role:"secondary", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:d(65),  note:"Opener +65 kg", competitionLift:true },
      ]},
      { dayOfWeek:6, dayType:"volume", label:"LA — MU opener", slots:[
        { role:"primary", category:"vertikaaliveto", defaultMovementName:"Muscle-up",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:5,   note:"Opener +5 kg", competitionLift:true },
      ]},
    ]},
    { week:16, days:[
      { dayOfWeek:1, dayType:"heavy", label:"MA T-6 — Kevyt aktivointi", slots:[
        { role:"primary",   category:"vertikaaliveto",   defaultMovementName:"Lisäpainoleuanveto",
          sets:2, reps:1, targetVx:4, suggestedLoadKg:l(67.5), note:"90% openerista — RPE 6" },
        { role:"accessory", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:2, reps:1, targetVx:4, suggestedLoadKg:d(58.5), note:"90% openerista" },
      ]},
      { dayOfWeek:2, dayType:"heavy", label:"TI T-5 — Kevyt kyykky", slots:[
        { role:"primary", category:"alaraaja", defaultMovementName:"Takakyykky",
          sets:2, reps:1, targetVx:4, suggestedLoadKg:k(162), isBarbell:true, note:"90% openerista" },
      ]},
      { dayOfWeek:4, dayType:"heavy", label:"TO T-3 — Herättely + opener", slots:[
        { role:"primary",   category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:l(64),  note:"@85%" },
        { role:"secondary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:l(75),  note:"Opener", competitionLift:true },
        { role:"accessory", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:1, reps:1, targetVx:3, suggestedLoadKg:d(65),  note:"Opener" },
        { role:"accessory", category:"vertikaaliveto", defaultMovementName:"Muscle-up",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:5,   note:"Opener practice" },
      ]},
      { dayOfWeek:7, dayType:"competition", label:"SU T-0 — KISA 🏆", slots:[
        { role:"primary",   category:"vertikaaliveto",   defaultMovementName:"Muscle-up",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:5,    note:"1. Muscle-up — Opener +5 · 2nd +10 · 3rd +15 kg (~92/~97/~102% 1RM)", competitionLift:true },
        { role:"secondary", category:"vertikaaliveto",   defaultMovementName:"Lisäpainoleuanveto",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:l(75), note:"2. Leuanveto — Opener +75 · 2nd +85 · 3rd +95 kg (~92/~97/~102% 1RM)", competitionLift:true },
        { role:"backoff",   category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:d(65), note:"3. Dippi — Opener +65 · 2nd +75 · 3rd +82.5 kg (~92/~97/~102% 1RM)", competitionLift:true },
        { role:"accessory", category:"alaraaja",         defaultMovementName:"Takakyykky",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:k(180), note:"4. Kyykky — Opener 180 · 2nd 195 · 3rd 205 kg (~92/~97/~102% 1RM)", competitionLift:true, isBarbell:true },
      ]},
    ]},
  ];

  return {
    mesocycleId: uid(),
    type: "streetlifting_16w",
    startDateISO: startDateISO || todayISO(),
    weekCount: 16,
    streetliftingConfig: {
      calibration: { leukaExtKg: L, dippiExtKg: D, kyykkyExtKg: K, bwKg: BW },
      competitionDate: null,
    },
    weekDefs: [
      { week:1,  deltaPctBase:0,     label:"Vk 1 — Hypertrofia: aloitus",     heavyReps:6, heavyTargetVx:3 },
      { week:2,  deltaPctBase:0.03,  label:"Vk 2 — Hypertrofia: kasvu",        heavyReps:6, heavyTargetVx:3 },
      { week:3,  deltaPctBase:0.06,  label:"Vk 3 — Hypertrofia: piikki",       heavyReps:6, heavyTargetVx:2 },
      { week:4,  deltaPctBase:-0.25, label:"Vk 4 — Deload + testaus",          heavyReps:5, heavyTargetVx:4 },
      { week:5,  deltaPctBase:0.02,  label:"Vk 5 — Voima: aloitus",           heavyReps:4, heavyTargetVx:2 },
      { week:6,  deltaPctBase:0.05,  label:"Vk 6 — Voima: kasvu",             heavyReps:4, heavyTargetVx:2 },
      { week:7,  deltaPctBase:0.08,  label:"Vk 7 — Voima: piikki",            heavyReps:4, heavyTargetVx:1 },
      { week:8,  deltaPctBase:-0.25, label:"Vk 8 — Deload + välitesti",       heavyReps:3, heavyTargetVx:4 },
      { week:9,  deltaPctBase:0.05,  label:"Vk 9 — Intensiteetti",             heavyReps:3, heavyTargetVx:1 },
      { week:10, deltaPctBase:0.08,  label:"Vk 10 — Intensiteetti+",           heavyReps:3, heavyTargetVx:1 },
      { week:11, deltaPctBase:0.10,  label:"Vk 11 — Intensiteetti: piikki",   heavyReps:3, heavyTargetVx:1 },
      { week:12, deltaPctBase:-0.20, label:"Vk 12 — Deload + RPE9 testi 🎯", heavyReps:2, heavyTargetVx:4 },
      { week:13, deltaPctBase:0.08,  label:"Vk 13 — Realization",             heavyReps:2, heavyTargetVx:1 },
      { week:14, deltaPctBase:0.10,  label:"Vk 14 — Peaking",                 heavyReps:1, heavyTargetVx:1 },
      { week:15, deltaPctBase:-0.15, label:"Vk 15 — Taper",                   heavyReps:1, heavyTargetVx:3 },
      { week:16, deltaPctBase:-0.25, label:"Vk 16 — Kisaviikko 🏆",           heavyReps:1, heavyTargetVx:0 },
    ],
    weekPlans,
    postCycleAnalysis: null,
    accessorySlotOverrides: {}, // { [slotId]: { movementName, locked, variantIndex, reason, swappedAt } }
  };
}

// ── Export module ──
export {
  // Constants
  APP_VERSION,
  SCHEMA_VERSION,
  TIMEZONE,
  STORES,
  CATEGORIES,
  PULL_VOLUME_CATEGORIES,
  PRESET_MOVEMENTS,
  ACCESSORY_SLOT_CATALOG,
  MOVEMENT_DESCRIPTIONS,
  PRIMARY_VARIANTS,
  VARIANT_DAY_TYPE_MAP,
  // Utilities
  uid,
  nowISO,
  todayISO,
  parseNumericInput,
  // Guards
  GUARDS,
  validateVelocity,
  validateLoad,
  validateReps,
  validateHRV,
  validateBodyweight,
  isVelocityTypo,
  // DB operations
  openDB,
  getDB,
  initDB,
  dbPut,
  dbGet,
  dbGetAll,
  dbGetByIndex,
  dbDelete,
  dbClear,
  dbPutBulk,
  seedPresets,
  // Movements
  getAllMovements,
  getMovementsByCategory,
  getPrimaryMovement,
  addMovement,
  updateMovement,
  deleteMovement,
  // Variants
  getVariantsForMovement,
  addVariant,
  getVariantByName,
  getAllVariants,
  ensureAllVariantsSeeded,
  // Sessions
  getAllSessions,
  getSession,
  saveSession,
  deleteSession,
  // Sets
  getSetsForSession,
  getSetsForMovement,
  getAllSets,
  saveSet,
  saveSets,
  deleteSet,
  // Measurements
  getMeasurementsByType,
  getMeasurementsByDate,
  saveMeasurement,
  getLatestBodyweight,
  saveBodyweightEntry,
  // PRs
  getAllPRs,
  savePR,
  deletePR,
  seedHistoricalPRsIfNeeded,
  // Mesocycles
  MESOCYCLE_TEMPLATES,
  getAllMesocycles,
  getActiveMesocycle,
  saveMesocycle,
  createDefaultMesocycle,
  createPeakingMesocycle,
  createHypertrofiaMesocycle,
  createMaksimivoimaMesocycle,
  createEksenterinenMesocycle,
  createDUPMesocycle,
  createSiirtymaMesocycle,
  createPalautuminenMesocycle,
  createStreetlifting16WMesocycle,
  // Baselines
  getBaseline,
  saveBaseline,
  // Recommendations
  saveRecommendation,
  // Decision Traces
  saveDecisionTrace,
  getTracesForRec,
  // Movement Progress
  getMovementProgress,
  getAllMovementProgress,
  saveMovementProgress,
  // Protocols
  getAllProtocols,
  saveProtocol,
  // App Meta & Settings
  getAppMeta,
  updateLastOpened,
  getSettings,
  saveSettings,
  // Backup / Restore
  exportFullBackup,
  importFullBackup,
  // CSV
  parseCSV,
  importHistoricalCSV,
};
