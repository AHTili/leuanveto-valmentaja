// data.js — IndexedDB, stores, migration, CRUD, import/export, backup/restore, guards
// LeVe Coach v4.28.0 — Elite-level audit implementation (L1, L2, M1-M4, H1-H7). Full findings-first audit suite applied. (L1) TI paused squat block-invariance poistettu: uusi SQUAT_BACKOFF_STYLES-katalogi (regular/paused/tempo/kisastyle) + block-aware backoffConfig-parametrit (vk 1-3 regular @0.52-0.58, vk 5-7 paused @0.60-0.66, vk 9-11 tempo @0.68-0.72, vk 13 kisastyle @0.74, vk 14 ei backoffia). Kisastyle ei käytä paused-stopia peakingissa — CNS-konservointi. (L2) vk 15 & 16 saivat täydet warmup-arrayt (taper → kilpailuproto "Liikekohtainen ramp: MU bändi → BW → +5, Leuka 50→65→80%, Dippi 50→65→80%, Kyykky 40→60→75→85%"). (M2) maDay/toDay backoff-symmetria: 2→3 sarjaa, reps+1 (matches TI — H7). (M3) PULL_BACKOFF_STYLES kytketty PRIMARY_VARIANTSiin: vk 5-7 MA "myotaote" + TO "kapea" (DIP_BACKOFF_STYLES), vk 9-11 MA + TO "kilpaote" — progressiivinen specificity. (M4) LA skill-vaihe restructure: primary "Muscle-up eksentrinen" 5×2 (konkreettinen liike) + uusi pull-vertical-explosive-slot (Räjähtävä leuka 4×3). (H1) shoulder-isolation ja hamstring-isolation saivat phaseVariants-progression: shoulder foundation 3×15 stretch (Maeo 2022) → strength 4×10 Vx4 → intensity 2×12 drop-set → peaking 2×15; hamstring foundation 3×12 Leg curl → strength 3×6 Vx3 Nordic (Ristolainen 2022) → intensity 3×6 Vx3 → peaking 2×12 Vx4. (H2) Peaking-warmup: uudet MA/TI/TO_WARMUP_PEAKING-vakiot (singles-focused neural primer, ei hypertrofia-prehabia) aktivoituvat phase="peaking" kautta. (H3) Deload-kalibrointierot dokumentoitu (vk 4 LA AMRAP vs vk 8/12 ilman — CNS-fatiikkiprofiilit eroavat blokkien välillä). (H4) Near-max density: vk 7 top@88 poistettu — 5→4 raskasta sessiota 6 viikossa (vastaa Zourdos 2016 taperausta). (H5) vk 9 MU muSets 4→3 (standardisoitu intensity-blokkiin). (H6) dip-eccentric-bw lisätty ACCESSORY_SLOT_CATALOGiin (foundation-only, "BW eksentrinen dippi" 3×3 Vx4, LA skill-support). (H7) Backoff-schemat symmetriset: MA/TI/TO kaikki 3×(reps+1). Neljä uutta PRESET_MOVEMENTSia (BW eksentrinen dippi, Nordic curl, Muscle-up eksentrinen, Tempo squat) + MOVEMENT_DESCRIPTIONS (evidence-based: Ristolainen 2022, Maeo 2022). v4.27.20 (edellinen): LA-päivän 2. kyykky-eksposointi blokki-progressiivisesti (general → specific). Aiempi v4.27.19: LA käytti etukyykky-variaatiota kaikissa 11 työviikossa — block-periodization-oppi (Matvejev, Issurin, Stone) vaatii progressiota kohti kisaspesifisyyttä. Uusi FS-rakenne: (1) Foundation vk 1-3: Etukyykky (motor pattern, quad-dominant variation), (2) Strength vk 5-7: Etukyykky (GPP, volyymi), (3) Intensity vk 9-11: Box squat (sticking-point specificity — TI:ssä jo Paused squat backoffissa, LA tarvitsee eri spesifisyyden; box squat nollaa stretch-refleksin → puhdas concentric "kuopasta" = 200 kg+ kisakyykyn klassinen sticking point), (4) Peaking vk 13-14: Takakyykky kisastyle kevyt (opener rehearsal + motor groove, maksimi-specificity ilman CNS-fatiikkaa). Tekninen toteutus: FS.wN-objektit saivat movement- ja refScale-kentät; laDay() lukee ne ja valitsee defaultMovementNamen, velocity-stopin (Box squat räjähtävämpi 0.60, Takakyykky kisastyle 0.55, Etukyykky konservatiivinen 0.55) sekä warmup-rampin (Takakyykky käyttää RAMP_BARBELLia, muut kevyemmän teknisen rampin). Cross-reference säilyy Takakyykky-e1RM:ssä; refScale 0.85 (Etukyykky/Box squat) tai 1.00 (Takakyykky self). Viikkoplaanien labelit päivitetty: vk 9-11 "box squat", vk 13-14 "kisakyykky kevyt". Warmup-rivin teksti dynaaminen (${fsWeek.movement}-lämmittely). Etukyykky lisätty PRESET_MOVEMENTS-seediin (oli orphan — defaultMovementName käytti "Etukyykky" mutta seedissä oli vain englanninkielinen "Front squat"). Deload-viikot 4, 8, 12 edelleen intentionaalisesti ilman LA-kyykkyä. v4.27.19: streetlifting-alignment (peru grip-endurance mixAcc:sta).: peruttu v4.27.18 grip-endurance-lisäys mixAcc:sta. Kontekstivirhe: v4.27.18:ssa lisättiin Farmer carry LA-päivän mixAcc:iin "MU false grip -tueksi", mutta streetlifterille (kisaliikkeet MU + Leuka + Dippi + Takakyykky) erillinen carry on dedikoitua harjoitusaikaa ilman kisahyötyä — ote tulee jo 94 kg leuka-primarysta ja MU-transitionin false grip -pidosta. Palautettu: mixAcc = [core-hollow] (1 slot, sama kuin MA/TI/TO:n coreSlot). Grip-endurance-entry poistettu ACCESSORY_SLOT_CATALOGista (seed-liikkeet Farmer carry/Dead hang/Heavy dead hang/Heavy farmer carry säilyvät mahdollista manuaalista accessorySlotOverrides-lisäystä varten). SAMALLA tunnustettu: etukyykky ON jo LA:ssa (v4.25 P1-1 fsWeek-parametri) 11/16 viikkoa — vk 1-3 motor pattern @55-62%, vk 5-7 strength @65-70%, vk 9-11 neural @70-75%, vk 13-14 taper @65-70% (kaikki suhteessa Takakyykky e1RM × 0.85). Deload-viikot 4, 8, 12 intentionaalisesti ilman: vk 4 sisältää Takakyykky AMRAP-kalibroinnin (v4.27.15), vk 8 + 12 puhdas palautuminen ennen seuraavaa blokkia. 2×/vk kyykky-frekvenssi toteutuu: TI raskas primary + LA tekninen etukyykky. Face pull foundation-volyymi pysyy 90 reps/wk (MA pullAcc 3×15 + TO pushAccPrehab 3×15) — sama v4.27.18 target ilman LA-redundanssia. v4.27.18: Anti-rotation core + grip-endurance + triple-coverage fix (grip-endurance-osa nyt peruttu). (anti-rotation core + grip-endurance + triple-coverage fix). (1) Uusi slotId "core-antirotation" ACCESSORY_SLOT_CATALOGiin: Pallof press / Bird dog / Landmine anti-rotation / Pallof press hold, phase-taperaus foundation 3×10/side Vx3 → strength 3×8/side Vx3 → intensity 2×8/side Vx2 → peaking 2×10/side Vx4. Perustelu: raskas kyykky (230 kg+) luo epäsymmetristä kuormaa jonka vasta-kerääntyvä rotational-shear pettää hollow-only-coren; anti-rotation palvelee frontaalitasoa jota sagittal hollow ei kata. (2) TI-päivä (kyykky) saa core-antirotationin, MA+TO säilyttävät core-hollow:n (sagittal flexion tukee leuka/dippi/MU-chainia — biomechaaniseti eri tarve). (3) Uusi slotId "grip-endurance": Farmer carry / Dead hang / Heavy farmer carry, foundation 3×30s → strength 3×40s → intensity 2×45s → peaking 2×30s. (4) Foundation face pull triple-coverage -korjaus: mixAcc:ssa (LA-päivä) scapular-control → grip-endurance. Perustelu: MA pullAcc + TO pushAccPrehab + LA mixAcc = 9 sets × 15 reps = 135 reps/wk face pull foundation-blokissa (liikaa low-fatigue-liikkeelle); vaihto pudottaa volyymin 135 → 90 reps/wk ja tukee suoraan LA:n MU-työtä koska MU:n transition on false grip -endurance-rajoitettu. (5) Seed-liikkeet päivitetty: Pohkeenkohotus + Standing/Seated calf raise (v4.27.17 täydennys), Pallof press hold + Landmine anti-rotation + Bird dog + Hollow body hold + L-sit hold + Farmer carry + Heavy farmer carry + Heavy dead hang (kaikki 58 catalog-varianttia resolvoituu seediin). v4.27.17: Accessory audit -korjaukset (calf-isolation 5. slotina, pushAcc face pull swap, MA warmup band external rotation). (composition fixes, viikosta riippumatta optimaaliset treenit). Kolme täsmämuutosta: (1) lowerAcc sai 5. slotin — Pohkeenkohotus 3×15 Vx4 ("calf-isolation", alaraaja). Perustelu: 230 kg+ kyykyn lockout vaatii nilkan rigidityä (soleus-toorque + gastrocnemius-elastic), aiemmin isolaatioo nolla — ankkurikohta puuttui plantariflexion ketjusta. (2) pushAcc (strength-blokki vk 5+) vaihdettu: Sivunosto 3×15 → Face pull 2×12 Vx4 ("scapular-control", horisontaaliveto). Perustelu: strength-blokissa viikottainen dippivolyymi nousee (primary 24–30 raskasta toistoa + backoff + skill-slotin tempo dippi) — posterior delt + rotator cuff balance kriittinen, ja foundation-blokissa (vk 1–4) pushAccPrehab tarjoaa jo face pullin 3×15 joten strength-blokissa riittää 2×12 (complementary volume). Sivunosto redundantti Pystypunnerruksen V3/8-rep-rangessa. (3) maDay warmup sai Band external rotation 2×12 per puoli — symmetria TO:n prehab-depthin kanssa (rotator cuff aktivaatio ennen vetoja, ei aiemmin ollut MA:lla mutta oli TO:lla). Manuaalinen muokkaus tuettu: accessorySlotOverrides-mekanismi salvaa slotId-pohjaisen vaihdon UI:n 🔒-lukolla, stagnation-swap ehdottaa automaattisesti vaihtoehtoa jos slot junnaa — rakenne pysyy pseudonyymisti eheänä. v4.27.16: MU-autoregulaation Vx-gradientti laajennettu. Aiempi adjustMULoad: −5 / −2.5 / 0 / +2.5 (avgVx:n mukaan). Kun atleetti raportoi avgVx ≥ 4 (selvästi liian kevyt), +2.5 kg oli liian varovainen — ohjelma eteni vain 2.5 kg/vk vaikka signaali sanoi että varaa on enemmänkin. Uusi porrastus lisää +5 kg -askeleen kun avgVx ≥ 4 JA minVx ≥ 3 (estää harhaanjohtavaa keskiarvoa jos 1 sarja oli V0-2). +5 kg on enimmäisaskel — MU:n bimodaalisen luonteen takia isommat kertahypyt ovat liian riskialttiita. v4.27.15: AMRAP-kalibrointiprotokolla W4 LA:lle. W4 LA-sessio (streetlifting_16w) vaihdettu "3RM testi"-labelista todelliseen AMRAP-kalibrointisessioon: kolme setRole:"calibration"-slotia (Leuka/Dippi/Kyykky) @85 % × tekninen failure, actualVx pakotetaan 0:aan. Engine.computeMovementProgress tunnistaa calibration-setit ja override:aa e1RM:n kun viim. 3 top-setissä on kalibrointi — sen sijaan että mediaani sekoittaisi Vx-biasoidut ja kalibrointi-setit. Epley+Vara actualVx=0:lla redusoituu puhtaaksi Epleyksi (load × (1 + reps/30)), joten kalibrointi antaa Vx-biasista vapaan ground-truth-mittauksen. Rate-limit-ankkuri ei muutu — kalibrointi-sessio suodatetaan computeRateLimitAnchorissa (Vx=0 drop), joten ankkuri pysyy todellisissa treenisessioissa. v4.27.14: rate-limit-ankkuri robustimmaksi (viim. 3 session raskain median). Pre-v4.27.14: rate-limit-cap (session-to-session +6/+10/+15 % Vx-deltan mukaan) käytti yksittäistä viim. setriä ankkurina (recentTopSets[length-1] primaryssa, selfSets[last] cross-referencessä) — altis yksittäisen anomalian vaikutukselle: deload-session kevein setti sulki capin keinotekoisesti alas, 3RM-testin failure-setti (Vx0) päätyi ankkuriksi, yksittäinen grind vinoutti cappia. KORJAUS: uusi computeRateLimitAnchor(recentTopSets)-helperi: ryhmittää setit sessionId:n mukaan, ottaa viim. 3 sessiota, laskee kunkin MEDIAN load + MEDIAN Vx (suodattaa readiness_testin ja Vx0-failuret), ankkuri = RASKAIN median-load näistä — deload/test ei vedä cappia alas, mutta yksittäinen spiikkikään ei nosta cappia perusteettomasti. Käytössä sekä primary-polussa (PROGRESSION_RATE_LIMIT) että cross-reference-haarassa (PROGRESSION_RATE_LIMIT_CROSSREF). v4.27.13: loadPct-slottien resolvointi (engine resolvoi jokaisen loadPct-slotin kuorman: sama liike → session-effective-e1RM primaryn rate-limitatusta targetista; cross-reference esim. Etukyykky→Takakyykky → referenssin e1RM + oma rate-limit; UI lukee slot.resolvedLoadKg:n).

const APP_VERSION = "3.2.0";
const SCHEMA_VERSION = 4;
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
  // v4.26.0: viikottaiset auto-backup-snapshotit (rolling 4 viimeisintä)
  backupSnapshots: "backupSnapshots",
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

// MRV (Maximum Recoverable Volume) — hard sets per muscle/category per week.
// Conservative Helms/Schoenfeld lower bound; user can override via settings.mrvOverrides.
const MRV_SETS_PER_CATEGORY = {
  vertikaaliveto:      22,
  horisontaaliveto:    20,
  vertikaalityöntö:    18,
  horisontaalityöntö:  16,
  hauisfleksio:        14,
  ojentajaekstensio:   14,
  alaraaja:            18,
  core:                20,
  muu:                 16,
};

const CATEGORY_LABELS_SHORT = {
  vertikaaliveto:     "Vert. veto",
  horisontaaliveto:   "Hor. veto",
  vertikaalityöntö:   "Vert. työntö",
  horisontaalityöntö: "Hor. työntö",
  hauisfleksio:       "Hauis",
  ojentajaekstensio:  "Ojentaja",
  alaraaja:           "Alaraaja",
  core:               "Core",
  muu:                "Muu",
};

const CATEGORY_COLORS = {
  vertikaaliveto:     "#4f8cff",
  horisontaaliveto:   "#22c55e",
  vertikaalityöntö:   "#06b6d4",
  horisontaalityöntö: "#a855f7",
  hauisfleksio:       "#84cc16",
  ojentajaekstensio:  "#ec4899",
  alaraaja:           "#f59e0b",
  core:               "#8899bb",
  muu:                "#5a6a8a",
};

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
  // v4.27.18: anti-rotation + grip-endurance + hollow variants
  { name: "Pallof press hold", category: "core", isPrimary: false, isPreset: true },
  { name: "Landmine anti-rotation", category: "core", isPrimary: false, isPreset: true },
  { name: "Bird dog", category: "core", isPrimary: false, isPreset: true },
  { name: "Hollow body hold", category: "core", isPrimary: false, isPreset: true },
  { name: "L-sit hold", category: "core", isPrimary: false, isPreset: true },
  { name: "Farmer carry", category: "core", isPrimary: false, isPreset: true },
  { name: "Heavy farmer carry", category: "core", isPrimary: false, isPreset: true },
  { name: "Heavy dead hang", category: "core", isPrimary: false, isPreset: true },
  // ─── Lower body ───
  { name: "Jalkaprässi", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Kyykky", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Maastaveto", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Leg curl", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Leg extension", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Bulgarian split squat", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Hip thrust", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Pohjenosto", category: "alaraaja", isPrimary: false, isPreset: true },
  // v4.27.18: calf-isolation variants (Pohkeenkohotus = yleisempi suomenkielinen termi vs Pohjenosto)
  { name: "Pohkeenkohotus", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Standing calf raise", category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Seated calf raise", category: "alaraaja", isPrimary: false, isPreset: true },
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
  // v4.27.20: Etukyykky (suomenkielinen) — laDay fsWeek default foundation/strength vaiheissa
  { name: "Etukyykky", category: "alaraaja", isPrimary: false, isPreset: true },
  // ─── Alaraaja-variantit (v4.27.1) — maaveto/kyykky-spesifiset tukiliikkeet
  //     räätälöityyn ohjelmageneraattoriin. COMPLEMENT/SECONDARY-rooleihin alaraaja-primaryille.
  { name: "Romanian DL",       category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Deficit DL",        category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Front squat",       category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Pin squat",         category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Walking lunge",     category: "alaraaja", isPrimary: false, isPreset: true },
  // ─── Lift-spesifit variantit (v4.27.2) — primaryn nimen perusteella ohjautuvat
  //     tukiliikkeet. Maaveto-primaryille DL-spesifit; penkki-primaryille pause/CGBP;
  //     OHP-primaryille push press / Z-press / Seated.
  // DL-spesifit
  { name: "Block pull",        category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Paused DL",         category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Snatch-grip DL",    category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Good morning",      category: "alaraaja", isPrimary: false, isPreset: true },
  // Kyykky-spesifit
  { name: "Safety bar squat",  category: "alaraaja", isPrimary: false, isPreset: true },
  { name: "Box squat",         category: "alaraaja", isPrimary: false, isPreset: true },
  // Penkki-spesifit
  { name: "Paused bench press",    category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Spoto press",           category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Larsen press",          category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Board press",           category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  // OHP-spesifit
  { name: "Push press",        category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  { name: "Seated OHP",        category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  { name: "Z-press",           category: "vertikaalityöntö", isPrimary: false, isPreset: true },
  // ─── Dippi-prehab-variantit (v4.27.4) — sternum/pec-insertion-kestävyys
  //     ROM-kapasiteetti + stretch-hypertrofia. Käytetään foundation-blokissa (vk 1–4)
  //     dippi-päivän pushAccPrehab-tukiliikepaketissa kuormituksen nosto ennen voima-blokkia.
  { name: "Tempo pause dippi",      category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Incline dumbbell press", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Dumbbell pullover",      category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Incline deficit pushup", category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  // v4.28.0: dip-eccentric-bw (LA skill-vaihe) ja Nordic curl (hamstring-isolation strength/intensity)
  { name: "BW eksentrinen dippi",   category: "horisontaalityöntö", isPrimary: false, isPreset: true },
  { name: "Nordic curl",            category: "alaraaja",           isPrimary: false, isPreset: true },
  // v4.28.0: MU skill-vaiheen strukturoidut slotit (laDay isSkill-haara)
  { name: "Muscle-up eksentrinen",  category: "vertikaaliveto",     isPrimary: false, isPreset: true },
  // v4.28.0: Tempo squat + Kilpakyykky kevyt (tiDay backoff block-progression L1)
  { name: "Tempo squat",            category: "alaraaja",           isPrimary: false, isPreset: true },
];

// ─── Movement descriptions (v4.12) ───────────────────────────────
// Tiiviit suoritusohjeet + cue per liike. Näytetään workout-näkymän ⓘ-modalissa
// yhdessä slot-perustelun kanssa, jotta käyttäjä ymmärtää liikkeen roolin.
const MOVEMENT_DESCRIPTIONS = {
  // ─── Kisaliikkeet ───
  "Lisäpainoleuanveto": { howTo: "Leveä vastaote. Kilpasääntö: leuka tangon yli (ei rintaa tankoon — se on eri liike). Vedä lapaluut ensin alas, sitten kyynärpäät sivuille-taakse. Täysi alapysähdys, kyynärvarret lukkoon alhaalla ennen seuraavaa toistoa — ei svingausta.", cue: "Lapaluut alas ennen kuin käsivarret vetävät" },
  "Muscle-up": { howTo: "Leuanveto explosiivisesti rinnan yli, false grip, transition kyynärvarsi pystyyn, lopuksi dippi lukitukseen. Koko liike yhtenä ketjuna.", cue: "Vedä itsesi tangon yli, älä tangolle" },
  "Lisäpainodippi": { howTo: "Kahvat hartianleveydellä, rinta hieman eteen, kyynärpäät taakse. Alas täyteen dippiin, ylös lukitukseen. Kontrolloitu alas.", cue: "Alas, kunnes olkapäät ovat kyynärpäiden alla" },
  "Takakyykky": { howTo: "Tanko takakulmalle, jalat hartianleveydellä. Istu taaksepäin, polvet kääntyvät varpaiden suuntaan. Reiden yläpinta alle vaakatason.", cue: "Rintakehä auki koko liikeradan ajan" },

  // ─── Streetlifting-spesifiset (v4.11) ───
  "Räjähtävä leuka": { howTo: "Leuanveto maksimaalisella kiihdytyksellä — yritä saada leuka reilusti tangon yli. Speed-strength-zone on ~30–60% 1RM: jos BW on yli 55% 1RM:stä (vahvat vetäjät), käytä kuminauha-assistia ylävaiheessa nopeuden säilyttämiseksi. Jos BW on alle 40% 1RM:stä, lisää kuormaa (vyö) 30–50% 1RM tasolle. 3 räjähtävää toistoa/sarja, 2 min palautus.", cue: "Nopeus > volyymi — keskeytä jos hidastuu" },
  "Leuanveto chest-to-bar": { howTo: "Myötäote (pronated) — streetlifting/CrossFit-standardi, vastaote tekee liikkeestä helpomman ja vähentää C2B-spesifisyyttä. Vedä kunnes rinta koskettaa tangon, rintaranka taakse, lapaluut kokoon. Kontrolloitu alas.", cue: "Rinta tankoon, ei leuka" },
  "False grip pull-up": { howTo: "Ranteet tangon yli (false grip), vedä chest-to-bar. Valmistaa muscle-upin transition-vaiheen — ranteiden täytyy olla tangon yläpuolella.", cue: "Rannekulma pysyy — ei pudota pohjalla" },
  "False grip row": { howTo: "Matala tanko, false grip, vedä rintaa tankoon. Kehonpaino-soutu — jalat maassa, vartalo suora.", cue: "Harjoittaa tranistionin voimaa ilman koko MU:n kuormaa" },
  "Archer pull-up": { howTo: "Leuanveto toiselle sivulle, toinen käsi suorana sivulle. Tee 3-5/sivu. Asymmetrinen veto rakentaa yksittäisen käden voimaa.", cue: "Vetävä käsi tekee työn, tukikäsi vain ohjaa" },
  "Scapular pull-up": { howTo: "Roiku tangossa, aktivoi vain lapaluut — lasku alas ja nosto ylös ILMAN kyynärpäiden koukistusta. 10 s holdeja mukaan.", cue: "Kyynärpäät suoriksi — vain lapalihakset työskentelevät" },
  "Band-assisted muscle-up": { howTo: "Kuminauha tangon ympäri, jalat/polvet nauhaan. Tee koko MU-liikerata kevyemmällä kuormalla.", cue: "Harjoittele transition-liikerataa, älä pelkkää vetoa" },
  "Pendlay row": { howTo: "Tanko maasta, selkä vaakatasossa, vedä tanko alarintaan, tanko PALAA maahan joka toistolla. Ei selän rullaamista.", cue: "Pysähdys maahan = nollasta starttaus joka toisto" },
  "Weighted inverted row": { howTo: "Matala tanko, vartalo suora, lisäpaino vyötäröllä/rinnassa. Vedä tanko rintaan.", cue: "Tanko rintaan, ei napaan" },
  "Ring dip": { howTo: "Dippi renkailla — epävakaus pakottaa olkapäät stabiloimaan. Aloita pienemmällä kuormalla kuin tankodipissä.", cue: "Renkaat pysyvät vartalon lähellä — ei levitä" },
  "Close-grip dip": { howTo: "Kapea dippiote (kahvat lähes koskettavat toisiaan), kyynärpäät taakse. Triceps-fokus, vähemmän rintaa.", cue: "Kyynärpäät aivan vartalon vieressä" },
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
  // ─── Alaraaja-variantit (v4.27.1) ───
  "Romanian DL": { howTo: "Maastaveto lähes suorin polvin. Lonkan saranaliike — työnnä takapuoli taakse ja laske tanko sääriä pitkin polviin tai alemmas. Takareidet + pakara. Tanko ei osu maahan toistojen välissä.", cue: "Lonkka taakse ensin, tanko seuraa — ei kyykyksi" },
  "Deficit DL": { howTo: "Maastaveto 3–10 cm korokkeelta. Pidempi matka alapositiossa → lisää vetotyötä ja alkuradan voimaa. Selkä suora, pakara tiukka.", cue: "Sama tekniikka kuin mavessa — älä kumarra enemmän" },
  "Front squat": { howTo: "Tanko etukulmalle (olympic-grip tai ristikahvat). Pysty asento kyykyn läpi, kyynärpäät korkealla. Alle vaakatason.", cue: "Kyynärpäät ylös — älä päästä tangon vajoamaan" },
  "Pin squat": { howTo: "Takakyykky häkissä turvapalikoiden päälle — istu tangon tangon pinnin päälle, starttaa nollasta. Heikkouden pisteen voimaa.", cue: "Pinnille istuminen poistaa stretch-refleksin" },
  "Walking lunge": { howTo: "Kävelyaskellus tangolla tai käsipainoilla. 10–20 askelta/sarja. Etujalka + unilateraalinen vakaus.", cue: "Takapolvi pehmeästi lähelle lattiaa, etujalka työtää" },

  // ─── Lift-spesifit variantit (v4.27.2) ───
  // DL-spesifit maaveto-primaryille
  "Block pull": { howTo: "Maastaveto 5–15 cm korotuksella (levyt blokkien päällä tai pukit). Lyhyempi matka alapositiossa → suurempi lockout-kuorma. Helms & Bromley: supramaksimaalinen overload lockout-vahvuudelle.", cue: "Starttaa polvista — ei käytä jalkojen työntöä" },
  "Paused DL": { howTo: "Maastaveto 1–2 s pysähdyksellä polven korkeudella nousussa. Eliminoi stretch-reflex-apu lockoutiin ja opettaa asennon ylläpitoa kriittisessä kohdassa.", cue: "Pysähdys polvessa = tanko lähellä, lapaluut lukossa" },
  "Snatch-grip DL": { howTo: "Maastaveto leveällä (tempaus-)otteella. Suurempi liikerata + yläselän työ. Pidä selkä neutraali — ote pakottaa lantion alas.", cue: "Lapaluut sisäänvedetyt — leveä ote heikentää niitä" },
  "Good morning": { howTo: "Tanko takakulmalle, taivuta lantiosta eteen polvet lievässä koukussa, takareidet puree. Nouse pakaralla. Erinomainen posterior chain hinge-liike.", cue: "Lonkka menee taakse — ei polvet eteen" },
  // Kyykky-spesifit
  "Safety bar squat": { howTo: "SSB-tanko (kaarevat kahvat) takakulmalle — pakottaa pystymmän asennon ja vähentää olkapäiden kuormaa. Quad-dominantti variantti.", cue: "Pidä kahvoista kiinni, ei työnnä ylöspäin" },
  "Box squat": { howTo: "Takakyykky boksille istuen (ei pomppu). Pysähdys boksilla 1 s, nouse räjähtävästi. Opettaa posterior chain + startti-voimaa pohjalta.", cue: "Istu, älä vain kosketa — pysähdys nollaa stretch-refleksin" },
  // Penkki-spesifit
  "Paused bench press": { howTo: "Penkkipunnerrus 1–3 s pysähdyksellä rinnalla (ei pomppua). Voimanostajan kisakäytäntö — startti nollasta alhaalta.", cue: "Rinta pysyy tiukkana pysähdyksessä — ei vajoa" },
  "Spoto press": { howTo: "Penkkipunnerrus 2–3 cm rinnasta pysähdyksellä (tanko ei kosketa rintaa). Rakentaa 'bottom-position overload' -voimaa ja eliminoi pomppu täysin.", cue: "Tanko hengähtää ilmassa — ei koskaan rintaan" },
  "Larsen press": { howTo: "Penkkipunnerrus jalat penkin päällä (ei maakontaktia). Eliminoi leg drive → puhdas ylävartalon voima. Erinomainen kontrollin ja teknisen puhtauden rakentamiseen.", cue: "Pakara penkissä, jalat ilmassa — ei pomppua" },
  "Board press": { howTo: "Penkkipunnerrus lauta rinnalla (1–3 lautaa päällekkäin). Lyhyempi liikerata → raskaampi kuorma lockout-vaiheeseen. Supramaksimaalinen tricep + lockout.", cue: "Tanko koskee lautaan, pysähdys, työnnä ylös" },
  // OHP-spesifit
  "Push press": { howTo: "Pystypunnerrus jaloilla autetulla starttikäynnistyksellä: dip 5–10 cm polvista, räjähtävä ylös. Suurempi kuorma kuin strict press — rakentaa lockoutia ja hermostollista kapasiteettia.", cue: "Dip pysty — ei eteen — ja räjähtävä ylös" },
  "Seated OHP": { howTo: "Pystypunnerrus istuen tuetulla selällä. Eliminoi lantion kompensaation ja pakottaa puhtaan hartia + tricep -työn.", cue: "Selkä tiukkana selkänojaa vasten — ei kaareudu" },
  "Z-press": { howTo: "Pystypunnerrus istuen lattialla jalat suorina edessä. Pakottaa täydellisen core-hallinnan + pystyn ryhdin. Ei mitään tukea selälle.", cue: "Jalat lukossa, rintakehä ylös — korjaa ryhtivirheet" },

  // ─── Dippi-prehab-variantit (v4.27.4) ───
  // Sternum/pec-insertion-kestävyyden rakennus foundation-blokissa (vk 1–4).
  // Fokus: ROM-ääripään kudoskapasiteetti (stretch-mediated hypertrophy) +
  // posterior shoulder balance. Evidence: Warneke 2022–2024 stretch-hypertrofia,
  // Green & Comfort 2007 pec-tear-riski dipissä, Durall 2001 pec-major-insertion.
  "Tempo pause dippi": { howTo: "Lisäpainodippi 3 s:n kontrolloidulla eksentrisellä ja 1–2 s pysähdyksellä alapositiossa (olkapää kyynärpään alla, ei ylemmäs kuin mitä liikkuvuus sallii kivuttomasti). Nouse sujuvasti. Kuorma ~60–70 % normaalista dipistä — tämä on kudoskapasiteettia, ei voimaa.", cue: "Laskeudu kolme sekuntia, pysähdy alhaalla — ÄLÄ pomppaa" },
  "Incline dumbbell press": { howTo: "Vinopenkki 30–45°, käsipainot rinnan sivuilla, työnnä ylös. Ylärinta + etudelta ja kevyempi GH-nivelen stressi kuin tasopenkissä. Täysi ROM, kontrolloitu eksentri.", cue: "Käsipainot koskettavat melkein yläpisteessä — älä lukitse kyynärpäitä täysin" },
  "Dumbbell pullover": { howTo: "Vaakapenkillä makuulla, yksi käsipaino molemmin käsin pidellen, lantio alempana kuin hartiat. Laske paino pään taakse suorin/melkein suorin kyynärvarsin täyteen pec+lats-venytykseen, palauta rintakehän päälle. Stretch-hypertrofian priimusliike pecille.", cue: "Kyynärpäät pehmeässä kulmassa koko ajan — jos kipeää rintalastassa, lyhennä ROMia" },
  "Incline deficit pushup": { howTo: "Punnerrus kahvoilla tai käsipainoilla korokkeena, kädet korokkeilla niin että rintakehä laskeutuu käsien alapuolelle. Täysi ROM alhaalla, taukopysähdys 1 s, ylös kontrolloidusti. Korkea reps (15–35) matalalla kuormalla = kudoksen verenkierto + ROM-kapasiteetti.", cue: "Alas kunnes olkapäät ovat kyynärpäiden alapuolella — nosta itsesi korkealla volyymilla, ei intensiteetillä" },

  // ─── v4.28.0 liikkeet ───
  "BW eksentrinen dippi": { howTo: "BW dippi: laskeudu 5 s hallitusti alaasentoon, nouse ylös hyppäämällä/avustettuna (ei concentric triceps-työtä). Harjoittaa pec-insertion eccentric-kapasiteettia ilman lisäämällä triceps-fatiikkaa → sopii LA skill-vaiheeseen 48 h ennen MA:n leuka-primaryä.", cue: "Lasku viisi sekuntia — älä lennä alas" },
  "Nordic curl": { howTo: "Polvillaan, nilkat lukittuina (partneri tai laite), laske vartalo eteen hallitusti pelkällä hamstringin eksentrisellä voimalla. Käytä käsiä tarvittaessa avustamaan pohjalla. Regressio: Slider curl (liukumatto-kantapää + polvien koukistus selinmakuulla). Evidenssi: Ristolainen 2022, Van Dyk 2019 hamstring strain prevention + kyykky-1RM-parannus.", cue: "Kontrolloitu lasku — jos putoat, kuorma on liian raskas" },
  "Muscle-up eksentrinen": { howTo: "Aloita MU:n yläasennosta (hyppy/avustettu), laske 5–8 s hallitusti koko MU-liikerata takaisin alas (transition + veto). Ei ylös-työvaihetta — pelkkä eksentrinen. Harjoittaa pec/lats/triceps-kapasiteetin kontrollin yli transitionin.", cue: "Jarruta transitionia — tunne että olkapäät kannattelevat" },
  "Tempo squat": { howTo: "Takakyykky 3 s kontrolloidulla eksentrisellä laskulla, ei pysähdystä alhaalla, räjähtävä nousu. Rakentaa eccentric-kapasiteettia ja opettaa bottom-position hallintaa ilman stretch-reflex-etua. Intensity-blokin vaihtoehto paused squatille — eri CNS-stimulus kuin LA:n box squat (joka eliminoi stretch-refleksin kokonaan).", cue: "Laske kolme sekuntia — ei pysähdystä, vaan hallittu käänne" },

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
    rationale: "Paksuntaa keskiselkää → suora tuki leuanvedolle ja MU-transitiolle. Hypertrofiassa chest-supported/seal pysäytyksellä (stretch-mediated volyymi), voimablokissa Pendlay (raskas ja eksplosiivinen).",
    phaseVariants: {
      foundation: ["Chest-supported row", "Seal row", "T-bar row"],
      strength:   ["Pendlay row", "T-bar row", "Chest-supported row"],
      intensity:  ["Pendlay row", "Chest-supported row"],
      peaking:    ["Chest-supported row"],
    },
    repScheme: {
      foundation: { sets: 4, reps: 8, targetVx: null, note: "1-2 s pysäytys alaosassa (venyneessä) — stretch-mediated hypertrofia, lisää selän paksuusärsykettä" },
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
    rationale: "Kun selkä on vahva, leuanvedon rajoittava tekijä siirtyy usein hauiksiin. Foundation-faasi priorisoi stretch-mediated hypertrofiaa (incline curl = hauis venytetty, Pedrosa 2022: ~1.5× enemmän kasvua vs pystyote). Voimablokissa raskaampi barbell curl.",
    phaseVariants: {
      foundation: ["Incline curl", "Preacher curl", "Hauiskääntö tanko"],
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
      foundation: ["Close-grip bench", "Penkkipunnerrus", "Vinopenkkipunnerrus"],
      strength:   ["Close-grip bench", "Penkkipunnerrus"],
      intensity:  ["Close-grip bench"],
      peaking:    ["Penkkipunnerrus"],
    },
    repScheme: {
      foundation: { sets: 4, reps: 6, targetVx: 3, note: "kapea ote — ojentaja-spesifi" },
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
    rationale: "Dipin ja MU:n viimeiset 10 cm ovat puhdasta ojentajan voimaa. Foundation-faasi rakentaa massaa overhead ext:llä (Maeo 2023: ~1.4× enemmän kasvua pitkäpäälle vs pushdown). Strength/intensity siirtyy skull crusheriin ja close-gripiin — lukituskulma-spesifi voima.",
    phaseVariants: {
      foundation: ["Overhead tricep ext", "Tricep pushdown"],
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
    rationale: "Kasvattaa hartialihakset turvallisesti ilman CNS-kuormaa. Isot deltoidit = vakaampi dipin yläasento ja parempi MU:n ylävartalon lukitus. Foundation-faasi stretch-mediated (lean-away lateral raise, Maeo 2022), strength-faasi raskaampi, intensity drop-set -tekniikka, peaking vain maintenance.",
    phaseVariants: {
      foundation: ["Sivunosto", "Lateral raise kone"],
      strength:   ["Sivunosto", "Lateral raise kone"],
      intensity:  ["Lateral raise kone", "Sivunosto"],
      peaking:    ["Sivunosto"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 15, targetVx: null, note: "Lean-away asento — stretch-mediated hypertrofia (Maeo 2022)" },
      strength:   { sets: 4, reps: 10, targetVx: 4, note: "Raskaampi kuorma — mekaaninen jännitys" },
      intensity:  { sets: 2, reps: 12, targetVx: null, note: "Drop-set viim. sarjassa — metabolinen stimulus pienellä fatiikka-budjetilla" },
      peaking:    { sets: 2, reps: 15, targetVx: null, note: "Maintenance — vain aktivaatio" },
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
    function: "Takareiden isolaatio + eksentrinen kapasiteetti",
    rationale: "Balansoi kyykyn etureiden dominanssia, suojaa polvia. Vahva hamstring = parempi lonkkahinge kyykyn alaosassa ja pienempi rasitusvammariski. Foundation=volyymi (leg curl, helppo kontrolli), strength=eksentrinen voima (Nordic curl tai slider curl — Ristolainen 2022: hamstring eccentric → 3–5 % 1RM-kyykky 6 vk:ssa), intensity=säilyttävä volyymi, peaking=light maintenance.",
    phaseVariants: {
      foundation: ["Leg curl"],
      strength:   ["Nordic curl", "Leg curl"],
      intensity:  ["Nordic curl", "Leg curl"],
      peaking:    ["Leg curl"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 12, targetVx: null, note: "Kontrolloitu eksentrinen — base volume" },
      strength:   { sets: 3, reps: 6,  targetVx: 3, note: "Eksentrinen 3–4 s lasku — hamstring-specific strength (slider curl = regressio jos Nordic liian raskas)" },
      intensity:  { sets: 3, reps: 6,  targetVx: 3, note: "Eksentrinen fokus — säilytä strength-adaptaatiot" },
      peaking:    { sets: 2, reps: 12, targetVx: 4, note: "Kevyt maintenance — ei eksentristä fatiikkaa peakingissa" },
    },
  },
  "calf-isolation": {
    function: "Pohkeiden isolaatio, nilkan rigidity",
    rationale: "Raskaan kyykyn (230 kg+) lockout vaatii nilkan jäykkyyttä — soleus-toorque (staattinen plantariflexion) + gastrocnemius-elastic (reaktivinen). Ilman pohje-isolaatiota ankle-ketju on heikoin lenkki ja lockout karkaa. Seisten = gastrocnemius (bi-articular), istuen = soleus (mono-articular). Peakingissä kevyempi volyymi CNS-säästön vuoksi.",
    phaseVariants: {
      foundation: ["Pohkeenkohotus", "Standing calf raise"],
      strength:   ["Pohkeenkohotus", "Seated calf raise"],
      intensity:  ["Pohkeenkohotus", "Seated calf raise"],
      peaking:    ["Pohkeenkohotus"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 15, targetVx: 3, note: "Täysi venytys pohjassa — stretch-mediated hypertrofia" },
      strength:   { sets: 3, reps: 12, targetVx: 3 },
      intensity:  { sets: 3, reps: 10, targetVx: 2 },
      peaking:    { sets: 2, reps: 12, targetVx: 4 },
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
  // v4.28.0: BW eksentrinen dippi skill-vaiheelle (vk 1-4). Korvaa aiemman tempo-pause-dipin
  // LA-päivänä — eksentrinen faasi harjoittaa pec-insertion ROM-kapasiteettia ilman
  // concentric-triceps-kuormaa, joten 48 h palautuminen MA:n leuka-primaryä varten säilyy.
  // Tämä slot oli v4.27.12:ssa jo käytössä laDay:ssa mutta puuttui catalogista →
  // accessorySlotOverrides + stagnation-detection eivät tunnistaneet sitä. Nyt täysin
  // integroitu: lukitus, swap, progressio — kaikki slotId-pohjainen UI toimii.
  "dip-eccentric-bw": {
    function: "BW eksentrinen dippi — pec-insertion ROM skill-vaiheessa",
    rationale: "5 s BW eksentrinen lasku + hyppy/avustettu ylös. Harjoittaa pec-insertion eccentric kapasiteettia ILMAN concentric-triceps-kuormaa → ei lisää palautumisvelkaa TO:n dippi-primaryyn eikä MA:n leuka-primaryyn. Käytössä vain foundation-blokissa skill-vaiheen aikana; voima-blokista eteenpäin mu-dip-support (Lisäpainodippi) ottaa yli.",
    phaseVariants: {
      foundation: ["BW eksentrinen dippi", "Tempo pause dippi"],
      strength:   [],
      intensity:  [],
      peaking:    [],
    },
    repScheme: {
      foundation: { sets: 3, reps: 3, targetVx: 4, note: "5 s lasku BW:lla, hyppy/avustettu ylös — vain eksentrinen pec-ROM" },
    },
  },

  // ─── Dippi-prehab-slotit (v4.27.4, refaktoroitu v4.27.7) ───
  // v4.27.7: Slot siirtynyt torstailta (pushAccPrehab) LAUANTAILLE skill-vaiheessa —
  // korvaa mu-dip-support -slotin foundation-blokissa (vk 1-4, muLoad=0). Perustelu:
  // Tempo pause dippi vaatii tuoretta kudosta ja hermolihaskontrolloa ROM-kapasiteetti-
  // stimuluksena; torstaina primary-dipin jälkeen se on junk volumea. Lauantailla MU
  // on primary (ei dippi-liikemalli), 48+ h palautumista edellisestä dipistä → oikea
  // konteksti stretch-mediated-hypertrofialle pec-insertiossa (Warneke 2022-2024).
  "dip-tempo-rom": {
    function: "Dippi-ROM + eksentrinen kapasiteetti (prehab)",
    rationale: "Sternum/pec-insertion-kestävyyden rakennus foundation-blokissa. Tempo pause + täysi ROM matalalla kuormalla (~60–70 % normaalista dipistä) = stretch-mediated hypertrophy pec-insertioon ennen kuin voima-blokki kuormittaa raskailla dipeillä. Tehdään lauantailla MU-päivänä tuoreena; torstaina se olisi junk volumea primary-dipin jälkeen. Close-grip dip on vaihtoehto jos kudos ärsyyntyy tempo-työstä.",
    phaseVariants: {
      foundation: ["Tempo pause dippi", "Close-grip dip"],
      strength:   [],  // skill-vaihe ohi → mu-dip-support (Lisäpainodippi) ottaa yli
      intensity:  [],
      peaking:    [],
    },
    repScheme: {
      foundation: { sets: 3, reps: 8, targetVx: 3, note: "Tempo 3 s alas + 1–2 s pysähdys" },
    },
  },
  "pec-stretch": {
    function: "Pec/rintakehän stretch-hypertrofia",
    rationale: "Pec-majorin pitkäradan kapasiteetti = pec-tear-riskin pienennin (Warneke 2022–2024). Dumbbell pullover täydessä ROM:ssa lataa pec:in ja lats:in venytyksessä — uniikki stimulus jota pushAcc-peruspaketissa ei ole. Incline DB press on vaihtoehto jos pullover on liikkuvuuden kannalta hankala.",
    phaseVariants: {
      foundation: ["Dumbbell pullover", "Incline dumbbell press"],
      strength:   [],
      intensity:  [],
      peaking:    [],
    },
    repScheme: {
      foundation: { sets: 2, reps: 12, targetVx: 4, note: "Stretch-fokus — ei maksimikuorma" },
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
  "core-antirotation": {
    function: "Anti-rotation core, spine-stability lateraalikuormassa",
    rationale: "Raskas kyykky (230 kg+) luo epäsymmetristä kuormaa — oikean ja vasemman puolen mikrokompensaatiot summautuvat spinal-shear-voimaksi jos anti-rotation-core pettää. Pallof press opettaa keskivartalon ignoraamaan ulkoista rotaatiovääntöä, mikä näkyy suoraan kyykyn lantion linjassa ja alaosan räjähtävyydessä. Toisin kuin hollow (sagittal flexion), anti-rotation palvelee frontaalitason stability:ä joka on kyykyn erityistarve.",
    phaseVariants: {
      foundation: ["Pallof press", "Bird dog"],
      strength:   ["Pallof press", "Landmine anti-rotation"],
      intensity:  ["Pallof press hold", "Pallof press"],
      peaking:    ["Pallof press"],
    },
    repScheme: {
      foundation: { sets: 3, reps: 10, targetVx: 3, note: "10 toistoa per puoli — kontrolloitu tempo, ei jerkkaa" },
      strength:   { sets: 3, reps: 8,  targetVx: 3, note: "8 toistoa per puoli — raskaampi kuorma" },
      intensity:  { sets: 2, reps: 8,  targetVx: 2, note: "Iso-hold 8–10 s per puoli tai 8 reps" },
      peaking:    { sets: 2, reps: 10, targetVx: 4, note: "10 toistoa per puoli — kevyt kontrolli" },
    },
  },
  // v4.27.19: grip-endurance catalog-entry poistettu. Perustelu: streetlifting-
  // kisaliikkeet (MU + Leuka + Dippi + Takakyykky) kouluttavat jo kaiken tarvittavan
  // grip-kapasiteetin (94 kg+ leuka + MU-transition false grip -pito). Erillinen
  // farmer carry / dead hang -volyymi on dedikoitua harjoitusaikaa ilman kisahyötyä.
  // Farmer carry + Dead hang -liikkeet säilytetään PRESET_MOVEMENTS-seedissä
  // mahdollista manuaalista accessorySlotOverrides-lisäystä varten, mutta eivät
  // oletuksena ohjelmoinnissa.
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

// ── Pre-migration backup (v4.26.0) ──
// Jokainen IDB-skeeman bumppaus (esim. v3 → v4) on mahdollinen riski että data
// korruptoituu migraation aikana. Tämä funktio ajetaan ENNEN openDB:tä ja
// tarkistaa onko tietokannan nykyinen versio pienempi kuin SCHEMA_VERSION.
// Jos on, se dumppaa KAIKKI olemassaolevat storet JSONiksi localStorageen
// avaimella kuten "leve-coach-backup-premigration-v3-to-v4". Näin käyttäjä
// voi palauttaa datansa manuaalisesti, jos migraatio hajoaa.
// Idempotentti: jos backup samalle siirtymälle on jo olemassa, ei tehdä mitään.
async function createPreMigrationBackupIfNeeded() {
  if (!("indexedDB" in self)) return;
  if (typeof localStorage === "undefined") return;

  // Avaa olemassaoleva DB ilman versiota → saa nykyisen version
  let currentVersion;
  let storeNames;
  try {
    const db = await new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
    if (!db) return;
    currentVersion = db.version;
    storeNames = Array.from(db.objectStoreNames);
    db.close();
  } catch (e) {
    console.warn("[data.js] Pre-migration check failed:", e);
    return;
  }

  // Ensiasennus (versio 1 ja tyhjä) tai jo oikeassa versiossa → ei tarvetta
  if (currentVersion >= SCHEMA_VERSION) return;
  if (storeNames.length === 0) return;

  const backupKey = `leve-coach-backup-premigration-v${currentVersion}-to-v${SCHEMA_VERSION}`;
  if (localStorage.getItem(backupKey)) {
    console.log(`[data.js] Pre-migration backup already exists: ${backupKey}`);
    return;
  }

  // Dumppaa kaikki olemassaolevat storet
  const dump = {};
  try {
    const db = await new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, currentVersion);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (!db) return;

    for (const storeName of storeNames) {
      dump[storeName] = await new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, "readonly");
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch (e) {
          resolve([]);
        }
      });
    }
    db.close();
  } catch (e) {
    console.error("[data.js] Pre-migration dump failed:", e);
    return;
  }

  // Tallenna localStorageen
  try {
    const payload = {
      backupType: "pre-migration",
      fromVersion: currentVersion,
      toVersion: SCHEMA_VERSION,
      createdAtISO: new Date().toISOString(),
      data: dump,
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(backupKey, serialized);
    const sizeKB = Math.round(serialized.length / 1024);
    console.log(`[data.js] ✓ Pre-migration backup created: ${backupKey} (${sizeKB} KB)`);
  } catch (e) {
    // QuotaExceededError — localStorage täynnä. Ei blokata migraatiota.
    console.error("[data.js] ⚠️ Pre-migration backup failed (quota?):", e);
  }
}

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
      // v4.26.0: backupSnapshots-store (viikottaiset auto-backupit, rolling 4)
      if (!db.objectStoreNames.contains(STORES.backupSnapshots)) {
        const store = db.createObjectStore(STORES.backupSnapshots, { keyPath: "snapshotId" });
        store.createIndex("createdAtISO", "createdAtISO", { unique: false });
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
  // v4.27.10: aiemmin palautettiin AINA uusin startDateISO:n mukaan. Tämä aiheutti
  // virheellisiä "ejektioita" kun DB:ssä oli vanha jäänne (esim. default-meso),
  // jonka startDateISO oli uudempi kuin käyttäjän aktiivisesti treenaama meso
  // (esim. streetlifting_16w aloitettu 3 kk sitten). Tällöin getActiveMesocycle
  // palautti jäänteen, jonka weekCount+startDateISO asetti UI:n "päättynyt"-tilaan.
  //
  // Korjaus: jos kaikkien mesosyklien joukossa on useita, suosi sitä jonka
  // mesocycleId:tä viimeisin sessio käytti. Jos sessioita ei ole (tai niiden
  // mesocycleId ei vastaa mitään olemassa olevaa), fallback-säännöksi jää vanha
  // "uusin startDateISO".
  if (all.length === 1) return all[0];
  try {
    const sessions = await dbGetAll(STORES.sessions);
    // Sort sessions descending by dateISO then timestamp; find latest with mesocycleId
    sessions.sort((a, b) => {
      const d = (b.dateISO || "").localeCompare(a.dateISO || "");
      if (d !== 0) return d;
      return (b.sessionId || "").localeCompare(a.sessionId || "");
    });
    for (const s of sessions) {
      if (!s.mesocycleId) continue;
      const match = all.find(m => m.mesocycleId === s.mesocycleId);
      if (match) return match;
    }
  } catch (_) {
    // fall through to startDateISO-sort
  }
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
  const defaults = {
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
    // Readiness primer (v4.21): ennen ensimmäistä työsarjaa pääliikkeellä
    readinessPrimerEnabled: true,
    readinessPrimerPct: 0.60,       // % e1rmExternal → primer-kuorma
    readinessPrimerReps: 3,         // toistojen määrä (best-of-N)
  };
  if (!s) return defaults;
  // Täytä puuttuvat kentät oletuksilla (esim. päivitetylle käyttäjälle)
  return { ...defaults, ...s };
}

async function saveSettings(settings) {
  settings.key = "settings";
  return dbPut(STORES.appMeta, settings);
}

// ── Backup / Restore ──
// v4.26.0: backupSnapshots-store EI sisälly full exportiin (rekursio-suoja).
// Snapshot-data koostuu kaikista MUISTA storeista — snapshotit ovat itsenäinen
// kerros jota ei dumpata takaisin snapshottiin.
const BACKUP_EXCLUDED_STORES = new Set(["backupSnapshots"]);

async function exportFullBackup() {
  const data = {};
  for (const storeName of Object.values(STORES)) {
    if (BACKUP_EXCLUDED_STORES.has(storeName)) continue;
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

  // Clear all stores (paitsi backupSnapshots — ne säilyvät restoren yli)
  for (const storeName of Object.values(STORES)) {
    if (BACKUP_EXCLUDED_STORES.has(storeName)) continue;
    await dbClear(storeName);
  }

  // Import each store (paitsi excluded)
  for (const storeName of Object.values(STORES)) {
    if (BACKUP_EXCLUDED_STORES.has(storeName)) continue;
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

// ── Auto-Backup (v4.26.0) ──
// Viikottainen snapshot IDB:hen backupSnapshots-storeen. Rolling 4 viimeisintä.
// Suojaa sen kohdilta jotka import/export ei tavoita: käyttäjä ei muista vientiä.

const MAX_SNAPSHOTS = 4;              // rolling buffer
const BACKUP_INTERVAL_DAYS = 7;

async function getLatestBackupSnapshot() {
  const all = await dbGetAll(STORES.backupSnapshots);
  if (!all.length) return null;
  all.sort((a, b) => (b.createdAtISO || "").localeCompare(a.createdAtISO || ""));
  return all[0];
}

async function getBackupStatus() {
  const latest = await getLatestBackupSnapshot();
  if (!latest) {
    return { hasBackup: false, daysSince: null, status: "missing" };
  }
  const ms = Date.now() - new Date(latest.createdAtISO).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  let status = "fresh"; // vihreä
  if (days >= BACKUP_INTERVAL_DAYS) status = "stale"; // keltainen
  if (days >= BACKUP_INTERVAL_DAYS * 2) status = "overdue"; // oranssi
  return { hasBackup: true, daysSince: days, status, snapshotId: latest.snapshotId };
}

async function createBackupSnapshot(triggerReason = "manual") {
  const data = await exportFullBackup();
  const snapshot = {
    snapshotId: uid(),
    createdAtISO: nowISO(),
    triggerReason, // "weekly-auto" | "manual" | "pre-import"
    sizeBytes: JSON.stringify(data).length,
    data, // täysi dump
  };
  await dbPut(STORES.backupSnapshots, snapshot);
  // Rolling: poista vanhimmat jos > MAX_SNAPSHOTS
  const all = await dbGetAll(STORES.backupSnapshots);
  if (all.length > MAX_SNAPSHOTS) {
    all.sort((a, b) => (a.createdAtISO || "").localeCompare(b.createdAtISO || ""));
    const toDelete = all.slice(0, all.length - MAX_SNAPSHOTS);
    for (const old of toDelete) {
      await dbDelete(STORES.backupSnapshots, old.snapshotId);
    }
  }
  return snapshot;
}

async function maybeCreateWeeklyBackup() {
  const status = await getBackupStatus();
  if (!status.hasBackup || status.daysSince >= BACKUP_INTERVAL_DAYS) {
    try {
      const snap = await createBackupSnapshot("weekly-auto");
      console.log(`[data.js] ✓ Weekly auto-backup created (${Math.round(snap.sizeBytes/1024)} KB)`);
      return snap;
    } catch (e) {
      console.error("[data.js] Weekly auto-backup failed:", e);
      return null;
    }
  }
  return null;
}

async function getAllBackupSnapshots() {
  const all = await dbGetAll(STORES.backupSnapshots);
  all.sort((a, b) => (b.createdAtISO || "").localeCompare(a.createdAtISO || ""));
  return all;
}

async function restoreFromSnapshot(snapshotId) {
  const snap = await dbGet(STORES.backupSnapshots, snapshotId);
  if (!snap || !snap.data) {
    throw new Error("Snapshotia ei löydy tai se on rikki");
  }
  // Pre-restore safety: luo nykyisestä tilasta snapshot ensin
  await createBackupSnapshot("pre-restore");
  // Restore
  await importFullBackup(snap.data);
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
// v4.26.3: `about` kuvaa ohjelman TARKOITUKSEN + odotukset — näkyy mesosykli-näkymän
// "Ohjelman idea" -kortilla kaikille ohjelmatyypeille, jotta käyttäjä ymmärtää
// mihin ohjelma sopii ja mitä odottaa.
const MESOCYCLE_TEMPLATES = [
  { id: "default",       label: "Perusjakso (Ma/Pe/No)",     icon: "⚡", desc: "3×/vk — Maksimivoima + Perusvoima + Nopeusvoima, 4 viikkoa", weeks: 4, factory: "createDefaultMesocycle",
    about: "Yleispätevä 4 vk rakennusjakso jossa yhdistyy maksimivoima, perusvoima ja nopeusvoima saman viikon sisällä. Kuorma nousee viikoilta 1→3 (+0, +2.5%, +5%) ja viikko 4 on deload (-25%). Käytä kun: et ole kisaamassa, haluat pitää kaikki ominaisuudet samanaikaisesti työn alla. Soveltuu useimmille." },
  { id: "hypertrofia",   label: "Hypertrofiajakso",          icon: "💪", desc: "3×/vk — Korkea volyymi, 6-8 toistoa, lihasmassan kasvatus, 4 viikkoa", weeks: 4, factory: "createHypertrofiaMesocycle",
    about: "Lihasmassaa rakentava jakso: korkea volyymi (6-8 toistoa), kohtuullinen intensiteetti (Vx 2-3), runsaasti accessory-työtä. Progressive overload sarjojen kautta. Käytä kun: haluat kasvattaa lihasmassaa ennen voimablokkia, tai fyysinen koko on pullonkaula. Evidenssi: Israetel — hypertrophy MEV→MAV progression." },
  { id: "maksimivoima",  label: "Maksimivoima-blokki",       icon: "🏋️", desc: "3×/vk — 2× maksimivoima + nopeusvoima, 1-3 toistoa, hermostollinen, 4 viikkoa", weeks: 4, factory: "createMaksimivoimaMesocycle",
    about: "Hermostollinen blokki: 1-3 toistoa maksimikuormilla (Vx 1-4), 2 raskasta päivää + 1 nopeuspäivä. Kevyempi accessory-kuorma jotta keskushermosto ehtii palautua. Käytä kun: olet jo hypertrofiablokin jälkeen, tavoitteena PR tai kisaan valmistautuminen (ei vielä peaking-vaiheessa). Varoitus: vaatii hyvää palautumista." },
  { id: "eksentrinen",   label: "Eksentrinen blokki",        icon: "⬇️", desc: "2×/vk — Korokeveto + isometria, supramaksimaalinen, 4 viikkoa", weeks: 4, factory: "createEksenterinenMesocycle",
    about: "Erikoisblokki 2×/vk: 'Korokeveto' (supramaksimaalinen, hidas eksentrinen vaihe) + '2s ylipito' (isometria yläasennossa). Tavoite: sietokyky yli 1RM:n kuormille ja lockout-vahvuus. Käytä kun: olet kokenut nostaja jolla 1RM on pysähtynyt perusblokeissa. Varoitus: ei aloittelijoille — palautumiskuorma on korkea." },
  { id: "dup",           label: "DUP-jakso",                 icon: "🔄", desc: "3×/vk — Undulating: voima/hypertrofia/nopeus vaihtuu päivittäin, 4 viikkoa", weeks: 4, factory: "createDUPMesocycle",
    about: "Daily Undulating Periodization: intensiteetti vaihtuu joka päivä (raskas/volyymi/nopeus kierto) sen sijaan että se vaihtuisi viikottain. Viikko 1 = H-V-S, viikko 2 = S-H-V, jne. Käytä kun: vasteet perinteiseen lineaariseen progressioon ovat hiipuneet, tai haluat varioida ärsykettä. Evidenssi: Rhea et al. 2002 — DUP tuotti 25% suurempia voimanlisäyksiä vs lineaarinen." },
  { id: "siirtyma",      label: "Siirtymäjakso (GPP)",       icon: "🌿", desc: "2-3×/vk — Yleiskunto, ote, prehab, kevyt, 3 viikkoa", weeks: 3, factory: "createSiirtymaMesocycle",
    about: "Yleinen valmistautumisjakso (General Physical Preparation): matala intensiteetti, monipuoliset variantit (Neutraaliote, Myötäoteveto, 1.5-toisto hiissaus), grip-työ ja prehab. Viikkorakenne harvenee 3→2 sessioon tarkoituksellisesti — palautuminen on pääfokus. Käytä kun: siirryt blokista toiseen, tai palaat tauolta. Pidä mielessä: ei ole PR-jakso, vaan pohja." },
  { id: "palautuminen",  label: "Palautumisjakso",           icon: "😴", desc: "2×/vk — Aktiivinen palautuminen, matala intensiteetti, 2 viikkoa", weeks: 2, factory: "createPalautuminenMesocycle",
    about: "⚠ LYHYT SILTA — vain 2 viikkoa × 2 sessio/vk = 4 treeniä yhteensä. Ei täysi mesosykli, vaan aktiivinen palautumissilta raskaiden blokkien välissä (esim. kisan jälkeen tai ennen uutta intensiteettivaihetta). Super-kevyt kuorma (-25→-20%), Vx 4 kaikissa sarjoissa. Käytä kun: olet loppuunajettu tai kisan jälkeen. Älä käytä: itsenäisenä ohjelmana." },
  { id: "peaking",          label: "Peaking (kilpailuun)",          icon: "🏆", desc: "4 viikkoa — Kilpailuun virittäytyminen, vaatii e1RM:n", weeks: 4, factory: "createPeakingMesocycle",
    about: "Kilpajakson erityistapaus: 4 vk taper + kisapäivä jolloin suoritetaan opener/2. yritys/3. yritys järjestyksessä (oletuksena 92%/97%/102% e1RM:stä). Readiness-capit poistettu — luotat omaan säätelyysi. Vaatii: ajantasainen e1RM (pyytää sen aloituksessa). Käytä kun: kisa 4 vk päästä. Kisa-päivän automatiikka hoitaa opener- ja attempt-kuormalaskennan." },
  { id: "streetlifting_16w", label: "Streetlifting 16 vk 🏋️",       icon: "🏋️", desc: "16 viikkoa — 4 kisaliikettä (MU/Leuka/Dippi/Kyykky), Hybrid Block-DUP, kisa-elokuu 2026", weeks: 16, factory: "createStreetlifting16WMesocycle",
    about: "Akken referenssi-ohjelma: 16 vk jaettu 4 blokkiin (vk 1-4 Hypertrofia, 5-8 Voima, 9-12 Intensifikaatio, 13-16 Realization/Peak) Issurin 2010 -metodologialla. 4 kisaliikettä: Muscle-up, Leuka, Dippi, Kyykky. Kuormat loadPct-skaalattuja käyttäjän e1RM:ään — vaatii kalibroinnin aloituksessa. Accessory-volyymi taperoituu automaattisesti loppua kohti. Käytä kun: treenaat streetlifting-kisoihin nimenomaan näillä 4 liikkeellä." },
  { id: "custom",            label: "🎯 Räätälöity ohjelma (kysely)", icon: "🎯", desc: "Vastaa kysymyksiin → sovellus rakentaa optimaalisen ohjelman tavoitteesi + liikkeidesi pohjalta", weeks: null, factory: "generateCustomMesocycle",
    about: "Ohjelmageneraattori rakentaa sinulle mesosyklin vastauksiesi pohjalta (tavoite, päälikkeet, päivät/vk, viikkomäärä, palautumiskyky). Käyttää olemassaolevia preseettejä pohjana ja substituoi päälikkeet + accessoryt funktionaalisten roolien kautta (antagonist/synergist-mappaus). Laatu = preseettien laatu, mutta sovitettuna sinun valintoihisi. Käytä kun: haluat treenata muita päälikkeitä kuin leuanveto (esim. penkki + mave), tai viikkomäärä/päivämäärä eivät sovi vakio-preseetteihin." },
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

// ═══════════════════════════════════════════════════════════════
// PROGRAM GENERATOR / WIZARD (v4.27)
// ═══════════════════════════════════════════════════════════════
//
// Tavoite: käyttäjän vastauksista optimaalinen mesosykli.
//
// Lähestymistapa: "Skeleton + Role-pohjainen accessory-remapping".
// 1. Käyttäjän tavoite (hypertrofia/maksimivoima/yhdistelmä/undulating)
//    valitsee POHJAPRESEETIN. Sen weekPlans on asiantuntijan käsintehty ja
//    sisältää optimaalit rep/Vx/sets/deltaPct-skeemat per viikko.
// 2. Kaikki primary + backoff -slottien liikkeet vaihdetaan käyttäjän
//    valitsemiksi päälikkeiksi (useita → rotatoidaan eri päiville).
// 3. Accessory-slottien alkuperäinen kategoria mapataan FUNKTIONAALISEEN
//    ROOLIIN (COMPLEMENT/SECONDARY/BALANCE/ARM_SYN/ARM_ANT/CORE) — tämä
//    on rooli jonka slot täyttää suhteessa leuka-primaryyn skeletissa.
//    Sitten rooli kartoitetaan UUDEN primaryn kontekstiin: "mikä kategoria
//    ja mikä liike täyttäisi tämän saman roolin kun primary on penkki/kyykky/jne?"
// 4. weekCount ja daysPerWeek skaalautuvat: 4→8→12 vk toistamalla
//    blokkirakennetta; 3→4 pv lisäämällä upper/lower-split-päivä.
// 5. Palautumiskyky kertoo accessory-sarjat (hyva 1.0, keski 0.85, heikko 0.70).
//
// EVIDENSSI: liikevalinnat louhittu preseeteistä (Akken ja kirjallisuus-
// pohjaiset valinnat), ei generoitu algoritmisesti. ROLE-mappaus perustuu
// voima-harjoittelun antagonisti/synergisti-teoriaan (Schoenfeld, Helms).

// ── PRIMARY CATEGORY PROFILES ──
// Jokaiselle mahdolliselle primary-kategorialle: mikä liike/kategoria
// täyttää kunkin roolin. "top"-listan järjestys = preferenssijärjestys.
const PRIMARY_CATEGORY_PROFILES = {
  vertikaaliveto: {
    label: "Vertikaaliveto (leuka, pull-up)",
    COMPLEMENT:  { category: "vertikaaliveto",    top: ["Ylätalja", "Lat pulldown", "Ylätalja neutraaliote", "Pullover kone"] },
    SECONDARY:   { category: "horisontaaliveto",  top: ["Penkkiveto", "Alatalja", "Seated row", "Chest-supported row", "T-bar row"] },
    BALANCE_1:   { category: "horisontaalityöntö", top: ["Penkkipunnerrus", "Dippi", "Vinopenkkipunnerrus", "Chest press"] },
    BALANCE_2:   { category: "vertikaalityöntö",   top: ["Pystypunnerrus", "Pystypunnerrus käsipainot", "Shoulder press laite"] },
    ARM_SYN:     { category: "hauisfleksio",      top: ["Hauiskääntö tanko", "Hammer curl", "Hauiskääntö käsipainot", "Preacher curl"] },
    ARM_ANT:     { category: "ojentajaekstensio", top: ["Tricep pushdown", "Overhead tricep ext", "Skull crusher"] },
    CORE:        { category: "core",              top: ["Hanging leg raise", "Cable crunch", "Ab wheel rollout", "Pallof press"] },
  },
  horisontaalityöntö: {
    label: "Horisontaalityöntö (penkkipunnerrus, dippi)",
    COMPLEMENT:  { category: "horisontaalityöntö", top: ["Vinopenkkipunnerrus", "Chest press", "Close-grip bench"] },
    SECONDARY:   { category: "vertikaalityöntö",   top: ["Pystypunnerrus käsipainot", "Shoulder press laite"] },
    BALANCE_1:   { category: "vertikaaliveto",    top: ["Ylätalja", "Lat pulldown", "Pullover kone"] },
    BALANCE_2:   { category: "horisontaaliveto",  top: ["Seated row", "Chest-supported row", "T-bar row"] },
    ARM_SYN:     { category: "ojentajaekstensio", top: ["Tricep pushdown", "Skull crusher", "Overhead tricep ext", "French press"] },
    ARM_ANT:     { category: "hauisfleksio",      top: ["Hauiskääntö tanko", "Hammer curl"] },
    CORE:        { category: "core",              top: ["Hanging leg raise", "Cable crunch", "Ab wheel rollout"] },
  },
  alaraaja: {
    label: "Alaraaja (kyykky, maave)",
    // COMPLEMENT rikastettu v4.27.1: RDL, Front squat, Paused squat ym. variantit ovat
    // aitoja kyykky/maaveto-spesifisiä tukiliikkeitä (Brookfield, Bromley). "Paused squat"
    // ja "Front squat" parantavat kyykkyä suoraan, "Romanian DL" ja "Deficit DL" maavetoa.
    COMPLEMENT:  { category: "alaraaja",          top: ["Romanian DL", "Front squat", "Paused squat", "Deficit DL", "Hip thrust", "Pin squat", "Bulgarian split squat"] },
    SECONDARY:   { category: "alaraaja",          top: ["Jalkaprässi", "Leg extension", "Front-foot elevated split squat", "Leg curl", "Walking lunge"] },
    BALANCE_1:   { category: "horisontaaliveto",  top: ["Seated row", "Chest-supported row"] },
    BALANCE_2:   { category: "horisontaalityöntö", top: ["Vinopenkkipunnerrus", "Chest press"] },
    ARM_SYN:     { category: "alaraaja",          top: ["Pohjenosto", "Leg curl"] },
    ARM_ANT:     { category: "hauisfleksio",      top: ["Hauiskääntö tanko", "Hammer curl"] },
    CORE:        { category: "core",              top: ["Hanging leg raise", "Ab wheel rollout", "Pallof press", "Cable crunch"] },
  },
  vertikaalityöntö: {
    label: "Vertikaalityöntö (pystypunnerrus)",
    COMPLEMENT:  { category: "vertikaalityöntö",   top: ["Pystypunnerrus käsipainot", "Shoulder press laite", "Sivunosto"] },
    SECONDARY:   { category: "horisontaalityöntö", top: ["Vinopenkkipunnerrus", "Close-grip bench", "Chest press"] },
    BALANCE_1:   { category: "vertikaaliveto",    top: ["Ylätalja", "Lat pulldown", "Pullover kone"] },
    BALANCE_2:   { category: "horisontaaliveto",  top: ["Seated row", "Chest-supported row"] },
    ARM_SYN:     { category: "ojentajaekstensio", top: ["Tricep pushdown", "Overhead tricep ext", "Skull crusher"] },
    ARM_ANT:     { category: "hauisfleksio",      top: ["Hauiskääntö tanko", "Hammer curl"] },
    CORE:        { category: "core",              top: ["Hanging leg raise", "Cable crunch"] },
  },
  horisontaaliveto: {
    label: "Horisontaaliveto (soutuliikkeet)",
    COMPLEMENT:  { category: "horisontaaliveto",  top: ["Seal row", "T-bar row", "Cable row", "Chest-supported row"] },
    SECONDARY:   { category: "vertikaaliveto",    top: ["Ylätalja", "Lat pulldown", "Pullover kone"] },
    BALANCE_1:   { category: "horisontaalityöntö", top: ["Vinopenkkipunnerrus", "Chest press"] },
    BALANCE_2:   { category: "vertikaalityöntö",   top: ["Pystypunnerrus käsipainot", "Shoulder press laite"] },
    ARM_SYN:     { category: "hauisfleksio",      top: ["Hauiskääntö tanko", "Hammer curl"] },
    ARM_ANT:     { category: "ojentajaekstensio", top: ["Tricep pushdown"] },
    CORE:        { category: "core",              top: ["Hanging leg raise", "Cable crunch"] },
  },
  hauisfleksio: {
    label: "Hauisfleksio (hauiskääntö primaryna — epätavallinen)",
    COMPLEMENT:  { category: "hauisfleksio",      top: ["Hammer curl", "Preacher curl", "Incline curl", "Spider curl", "Cable curl"] },
    SECONDARY:   { category: "vertikaaliveto",    top: ["Ylätalja neutraaliote", "Ylätalja", "Lat pulldown"] },
    BALANCE_1:   { category: "ojentajaekstensio", top: ["Tricep pushdown", "Skull crusher"] },
    BALANCE_2:   { category: "horisontaalityöntö", top: ["Vinopenkkipunnerrus"] },
    ARM_SYN:     { category: "horisontaaliveto",  top: ["Seated row", "Cable row"] },
    ARM_ANT:     { category: "vertikaalityöntö",   top: ["Pystypunnerrus käsipainot"] },
    CORE:        { category: "core",              top: ["Hanging leg raise"] },
  },
  ojentajaekstensio: {
    label: "Ojentajaekstensio (primaryna — epätavallinen)",
    COMPLEMENT:  { category: "ojentajaekstensio", top: ["Overhead tricep ext", "Skull crusher", "French press", "Kickback"] },
    SECONDARY:   { category: "horisontaalityöntö", top: ["Close-grip bench", "Vinopenkkipunnerrus", "Chest press"] },
    BALANCE_1:   { category: "hauisfleksio",      top: ["Hauiskääntö tanko", "Hammer curl"] },
    BALANCE_2:   { category: "vertikaaliveto",    top: ["Ylätalja", "Lat pulldown"] },
    ARM_SYN:     { category: "vertikaalityöntö",   top: ["Pystypunnerrus käsipainot"] },
    ARM_ANT:     { category: "horisontaaliveto",  top: ["Seated row"] },
    CORE:        { category: "core",              top: ["Hanging leg raise"] },
  },
};

// v4.27.2 — PRIMARY-NIMEN perusteella ohjautuvat profiilit.
// Kun käyttäjä valitsee spesifin päälikkeen (esim. "Maastaveto"), COMPLEMENT-
// ja SECONDARY-roolit ohjautuvat LIIKE-SPESIFEIHIN variantteihin eivätkä vain
// yleiseen alaraaja-kategoriaan. Tämä nostaa penkki/maave/kyykky-ohjelmat
// eliittitasolle: alaraaja-bucket ei enää niputa maaveto-variantteja kyykkyyn.
//
// Prioriteetti: PRIMARY_SPECIFIC_PROFILES[primaryName][role] > PRIMARY_CATEGORY_PROFILES[category][role]
// Jos primaryName ei löydy tai rooli puuttuu overridesta → fallback kategoriaprofiiliin.
//
// Lähteet:
// - Bromley "Base Strength" (DL-variantit: RDL, pause DL, deficit, block pull)
// - Calgary Barbell (pause bench, spoto, Larsen penkkipunnerruksen rakentajina)
// - Juggernaut (SSB squat, front squat, pin squat kyykyn tukiliikkeinä)
// - Helms "Muscle & Strength Pyramid" (variant selection principles per lift)
const PRIMARY_SPECIFIC_PROFILES = {
  "Maastaveto": {
    // COMPLEMENT = maaveto-spesifit variantit. RDL ensin (pakaran + takareiden volyymi
    // joka tukee suoraan kisamaavetoa), sitten pausat/deficit/block → range of motion
    // ja spesifit heikkoudet.
    COMPLEMENT: { category: "alaraaja", top: ["Romanian DL", "Paused DL", "Deficit DL", "Block pull", "Snatch-grip DL", "Good morning"] },
    // SECONDARY = kyykky-variantit posterior chainille + unilateraaliset.
    SECONDARY:  { category: "alaraaja", top: ["Front squat", "Bulgarian split squat", "Hip thrust", "Walking lunge", "Jalkaprässi"] },
  },
  "Takakyykky": {
    COMPLEMENT: { category: "alaraaja", top: ["Front squat", "Pin squat", "Paused squat", "Safety bar squat", "Box squat", "Bulgarian split squat"] },
    SECONDARY:  { category: "alaraaja", top: ["Romanian DL", "Hip thrust", "Walking lunge", "Jalkaprässi", "Leg curl"] },
  },
  "Kyykky": { // alias — sama kuin Takakyykky
    COMPLEMENT: { category: "alaraaja", top: ["Front squat", "Pin squat", "Paused squat", "Safety bar squat", "Box squat", "Bulgarian split squat"] },
    SECONDARY:  { category: "alaraaja", top: ["Romanian DL", "Hip thrust", "Walking lunge", "Jalkaprässi", "Leg curl"] },
  },
  "Penkkipunnerrus": {
    // COMPLEMENT = penkki-spesifit: pause/spoto/Larsen rakentavat kisapenkkiä;
    // CGBP + board = triceps/lockout; incline = pec volume.
    COMPLEMENT: { category: "horisontaalityöntö", top: ["Paused bench press", "Close-grip bench", "Spoto press", "Larsen press", "Board press", "Vinopenkkipunnerrus"] },
    // SECONDARY = vertikaalityöntö penkkiä tukevat (olkavoima → lockout tuki).
    SECONDARY:  { category: "vertikaalityöntö", top: ["Pystypunnerrus käsipainot", "Push press", "Seated OHP", "Shoulder press laite"] },
  },
  "Pystypunnerrus": {
    // COMPLEMENT = OHP-spesifit: push press (raskaampi overload), seated (pelkkä olka),
    // Z-press (core + ryhti), käsipainot (asymmetria/liikerata).
    COMPLEMENT: { category: "vertikaalityöntö", top: ["Push press", "Seated OHP", "Z-press", "Pystypunnerrus käsipainot", "Shoulder press laite"] },
    // SECONDARY = penkki-variantit (olkapunnerrus + tricep tuki).
    SECONDARY:  { category: "horisontaalityöntö", top: ["Vinopenkkipunnerrus", "Close-grip bench", "Larsen press", "Chest press"] },
  },
};

// Skelettien (leuka-primary-preseettien) kategoria → funktionaalinen rooli.
// Käytetään kun clooni-preseetistä haetaan uuden primaryn vastaavaa slotia.
const SKELETON_CATEGORY_TO_ROLE = {
  vertikaaliveto:     "COMPLEMENT",    // Ylätalja = saman pattern variaatio
  horisontaaliveto:   "SECONDARY",     // Penkkiveto/Alatalja = toisen pull-akselin liike
  horisontaalityöntö: "BALANCE_1",     // Penkkipunnerrus = antagonist push (horizontal)
  vertikaalityöntö:   "BALANCE_2",     // Pystypunnerrus = antagonist push (vertical)
  hauisfleksio:       "ARM_SYN",       // Hauiskääntö = pull-synergist
  ojentajaekstensio:  "ARM_ANT",       // Tricep = push-antagonist (tasapainotus)
  core:               "CORE",          // Core stays core
  alaraaja:           "SECONDARY",     // fallback (leuka-presetit eivät käytä)
  muu:                "CORE",          // grip/other → core-ekvivalentti
};

// Goal → skeleton preset factory name
const GOAL_SKELETONS = {
  hypertrofia:  "createHypertrofiaMesocycle",
  maksimivoima: "createMaksimivoimaMesocycle",
  yhdistelma:   "createDefaultMesocycle",
  undulating:   "createDUPMesocycle",
};

// ── Generator helpers ──

// Saa uuden accessory-slotin rooli-pohjaisesti.
// orig = alkuperäinen accessory-slot leuka-skeletissä.
// userPrimaryCategory = käyttäjän valitseman päälikkeen kategoria.
// primaryName (v4.27.2) = käyttäjän päälikkeen NIMI — käytetään PRIMARY_SPECIFIC_PROFILES-
//   overridekenttien valintaan. Fallback: jos primaryName ei löydy tai tietty rooli
//   puuttuu overridesta, käytetään kategoriapohjaista profiilia kuten ennen.
// weekIndex (v4.27.2) = mesosyklin viikon 0-indeksi — käytetään rotaatiokaavassa,
//   jotta variantit KIERTÄVÄT viikosta toiseen eikä sama variantti toistu 4 viikkoa.
function remapAccessorySlot(orig, userPrimaryCategory, primaryName, dayIndex, slotIndex, weekIndex = 0) {
  const role = SKELETON_CATEGORY_TO_ROLE[orig.category] || "CORE";
  const categoryProfile = PRIMARY_CATEGORY_PROFILES[userPrimaryCategory] || PRIMARY_CATEGORY_PROFILES.vertikaaliveto;
  const specificProfile = primaryName ? PRIMARY_SPECIFIC_PROFILES[primaryName] : null;
  // Override vain jos spesifinen profiili MÄÄRITTÄÄ tämän roolin. Muuten kategoria.
  const target = (specificProfile && specificProfile[role]) || categoryProfile[role] || categoryProfile.CORE;
  const movements = target.top;

  // IDENTITY PRESERVATION: jos alkuperäinen liike löytyy targetin top-listasta JA
  // kategoriat täsmäävät, pidä se. Tämä takaa että kun käyttäjä valitsee primaryn
  // jolle ei ole override-profiilia (esim. leuka = Lisäpainoleuanveto), ja sen kategoria
  // on sama kuin preset-skeletonin → accessoryt pysyvät bit-for-bit identtisinä.
  // Tärkeää: tämä guard ajetaan ENNEN rotaatiota, joten weekIndex ei voi rikkoa identtisyyttä.
  if (movements.includes(orig.defaultMovementName) && orig.category === target.category) {
    return { ...orig, variantName: null };
  }

  // Eri kategoria tai liikettä ei ole top-listassa → valitse rotation-idx:llä.
  // v4.27.2 rotation: weekIndex*1 + dayIndex*2 + slotIndex*3
  //   — weekIndex-kerroin 1: 4 vk yli saadaan 4 eri indeksiä (kunhan n≥4).
  //   — päivä/slot-kertoimet (2, 3): antaa hyvän intra-week-permutaation
  //     eri slot-paikoille, eikä kollisioita muodostu n∈{4,6,7}.
  //   — n=5 kanssa voi olla yksi kollision per viikko, mutta variantit
  //     kuitenkin kiertävät viikoittain, joten 4 vk:ssa nähdään kaikki.
  const movementIdx = (weekIndex + dayIndex * 2 + slotIndex * 3) % movements.length;
  return {
    ...orig,
    category: target.category,
    defaultMovementName: movements[movementIdx],
    // Älä siirrä variantName:ä — se on leuka-spesifinen
    variantName: null,
  };
}

// Substituoi primary/backoff-slotin uudeksi päälikkeeksi.
function substitutePrimarySlot(orig, primaryName, primaryCategory) {
  return {
    ...orig,
    category: primaryCategory,
    defaultMovementName: primaryName,
    variantName: null, // leuka-variantit ("Kilpaveto", "Korokeveto") eivät siirry muille primaryille
  };
}

// Kloonaa päivä uudella päälikkeellä + remapatuilla accessoryilla.
// v4.27.2: weekIndex välitetään rotaatiokaavaan jotta variantit kiertävät viikoittain.
function cloneDayWithPrimary(origDay, primaryName, primaryCategory, dayIndex, weekIndex = 0) {
  const newSlots = [];
  let slotIdx = 0;
  for (const s of origDay.slots) {
    if (s.role === "primary" || s.role === "backoff") {
      newSlots.push(substitutePrimarySlot(s, primaryName, primaryCategory));
    } else if (s.role === "accessory") {
      newSlots.push(remapAccessorySlot(s, primaryCategory, primaryName, dayIndex, slotIdx, weekIndex));
    } else {
      // warmup/opener/attempt — kopioi sellaisenaan (eivät esiinny perusskelete-presseteissä)
      newSlots.push({ ...s });
    }
    slotIdx++;
  }
  return {
    ...origDay,
    slots: newSlots,
  };
}

// Skaalaa accessoryjen set-määrät palautumiskyvyn mukaan.
// scalar < 1 vähentää sarjamäärää (floor min 1).
function applyRecoveryScalar(weekPlans, scalar) {
  if (scalar >= 0.99) return weekPlans;
  return weekPlans.map(wp => ({
    ...wp,
    days: wp.days.map(d => ({
      ...d,
      slots: d.slots.map(s => {
        if (s.role !== "accessory") return s;
        return { ...s, sets: Math.max(1, Math.round((s.sets || 0) * scalar)) };
      }),
    })),
  }));
}

// Jaa päälikkeet eri päiville. Jos 1 primary → kaikki päivät käyttävät sitä.
// Jos 2+ → rotatoidaan.
function distributePrimariesToDays(weekPlans, primaries) {
  // primaries = [{ name, category }]
  if (primaries.length === 0) return weekPlans;
  // v4.27.2: viikko-indeksi (0-based wp.week-1) välitetään cloneDayWithPrimary-funktioon
  // → remapAccessorySlot-rotaatio kiertää variantteja viikosta toiseen.
  if (primaries.length === 1) {
    // Kaikki päivät saavat saman päälikkeen
    return weekPlans.map(wp => ({
      ...wp,
      days: wp.days.map((d, dIdx) => cloneDayWithPrimary(d, primaries[0].name, primaries[0].category, dIdx, (wp.week || 1) - 1)),
    }));
  }
  // Useita päälikkeitä: rotaatio päivien yli
  return weekPlans.map(wp => ({
    ...wp,
    days: wp.days.map((d, dIdx) => {
      const primary = primaries[dIdx % primaries.length];
      return cloneDayWithPrimary(d, primary.name, primary.category, dIdx, (wp.week || 1) - 1);
    }),
  }));
}

// Skaalaa daysPerWeek: 3 → 4 tai 3 → 2.
// 4 pv: lisää ylimääräinen "volume"-tyyppinen päivä edellisen volume-päivän kopiona
// 2 pv: pudota viimeinen päivä
function adjustDaysPerWeek(weekPlans, targetDaysPerWeek) {
  return weekPlans.map(wp => {
    const currentDays = wp.days.length;
    if (currentDays === targetDaysPerWeek) return wp;

    if (targetDaysPerWeek > currentDays) {
      // Lisää päivä: kloonaa volume-päivä, siirrä eri dayOfWeek:lle
      const volumeDay = wp.days.find(d => d.dayType === "volume") || wp.days[wp.days.length - 1];
      const usedDows = new Set(wp.days.map(d => d.dayOfWeek));
      const candidateDows = [1, 2, 3, 4, 5, 6, 7].filter(d => !usedDows.has(d));
      const newDow = candidateDows[0] || 6;
      const newDay = {
        ...volumeDay,
        dayOfWeek: newDow,
        label: (volumeDay.label || "Perusvoima") + " (lisä)",
      };
      return { ...wp, days: [...wp.days, newDay].sort((a, b) => a.dayOfWeek - b.dayOfWeek) };
    }
    // targetDaysPerWeek < currentDays: pudota viimeiset
    return { ...wp, days: wp.days.slice(0, targetDaysPerWeek) };
  });
}

// Skaalaa weekCount: 4 → 8 tai 4 → 12.
// 8 vk: toista 4 vk skeleton kahdesti, toinen iteraatio hieman haastavampi (+0.02 deltaPctBase loadingissa)
// 12 vk: toista 3 kertaa, progressio Hyp → Voima → Peak -tyylinen
function scaleWeekCount(weekPlans, weekDefs, targetWeekCount, goal) {
  const origCount = weekPlans.length;
  if (origCount === targetWeekCount) return { weekPlans, weekDefs };

  if (targetWeekCount === 4) return { weekPlans: weekPlans.slice(0, 4), weekDefs: weekDefs.slice(0, 4) };

  if (targetWeekCount === 8 && origCount === 4) {
    // Tee kopio blokista 2 vk 5-8, nosta intensiteettiä
    const block2Plans = weekPlans.map(wp => ({
      ...wp,
      week: wp.week + 4,
      days: wp.days.map(d => ({
        ...d,
        // Labeloi bloki 2 esim. "Perusvoima A (blokki 2)"
        label: d.label ? d.label + " (blokki 2)" : d.label,
      })),
    }));
    const block2Defs = weekDefs.map(wd => ({
      ...wd,
      week: wd.week + 4,
      // Blokki 2: jos wd.deltaPctBase > 0, nosta +0.02; deload-viikkoon älä koske
      deltaPctBase: wd.week === 4 ? wd.deltaPctBase : (wd.deltaPctBase + 0.02),
      label: wd.label + " (blokki 2)",
    }));
    return {
      weekPlans: [...weekPlans, ...block2Plans],
      weekDefs: [...weekDefs, ...block2Defs],
    };
  }

  if (targetWeekCount === 12 && origCount === 4) {
    // 3 blokkia: vk 1-4 (pohja), 5-8 (lataus +2%), 9-12 (peak +4%)
    const block2Plans = weekPlans.map(wp => ({ ...wp, week: wp.week + 4, days: wp.days.map(d => ({ ...d, label: d.label ? d.label + " (B2)" : d.label })) }));
    const block3Plans = weekPlans.map(wp => ({ ...wp, week: wp.week + 8, days: wp.days.map(d => ({ ...d, label: d.label ? d.label + " (B3)" : d.label })) }));
    const block2Defs = weekDefs.map(wd => ({ ...wd, week: wd.week + 4, deltaPctBase: wd.week === 4 ? wd.deltaPctBase : (wd.deltaPctBase + 0.02), label: wd.label + " (B2)" }));
    const block3Defs = weekDefs.map(wd => ({ ...wd, week: wd.week + 8, deltaPctBase: wd.week === 4 ? wd.deltaPctBase : (wd.deltaPctBase + 0.04), label: wd.label + " (B3)" }));
    return {
      weekPlans: [...weekPlans, ...block2Plans, ...block3Plans],
      weekDefs: [...weekDefs, ...block2Defs, ...block3Defs],
    };
  }

  // Tuntematon yhdistelmä — palauta sellaisenaan
  return { weekPlans, weekDefs };
}

// Korjaa viikonpäivät käyttäjän preferenssin mukaan (esim. Ma/Ti/To).
function applyDayOfWeekPreference(weekPlans, preferredDows) {
  if (!preferredDows || preferredDows.length === 0) return weekPlans;
  return weekPlans.map(wp => ({
    ...wp,
    days: wp.days.map((d, idx) => ({
      ...d,
      dayOfWeek: preferredDows[idx % preferredDows.length] || d.dayOfWeek,
    })),
  }));
}

// Päägeneraattorifunktio.
// answers = {
//   goal: "hypertrofia" | "maksimivoima" | "yhdistelma" | "undulating",
//   primaries: [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }, ...],
//   daysPerWeek: 2 | 3 | 4,
//   weekCount: 4 | 8 | 12,
//   recoveryCapacity: "hyva" | "keski" | "heikko",
//   preferredDaysOfWeek: [1, 3, 5] (optional),
//   startDateISO: "2026-04-23",
//   customLabel: "Oma ohjelma" (optional)
// }
function generateCustomMesocycle(answers, startDateISOArg) {
  const {
    goal = "yhdistelma",
    primaries = [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }],
    daysPerWeek = 3,
    weekCount = 4,
    recoveryCapacity = "keski",
    preferredDaysOfWeek = null,
    customLabel = null,
  } = answers;
  const startDateISO = startDateISOArg || answers.startDateISO || todayISO();

  // 1. Hae skeleton
  const skeletonFactoryName = GOAL_SKELETONS[goal] || GOAL_SKELETONS.yhdistelma;
  const skeletonFactories = {
    createHypertrofiaMesocycle,
    createMaksimivoimaMesocycle,
    createDefaultMesocycle,
    createDUPMesocycle,
  };
  const factory = skeletonFactories[skeletonFactoryName];
  if (!factory) {
    throw new Error("generateCustomMesocycle: tuntematon goal " + goal);
  }
  const skeleton = factory(startDateISO);

  // 2. Skaalaa daysPerWeek ENSIN (skeleton-primaryllä vielä — tämä takaa että
  //    primary-rotaatio jakautuu OIKEALLE päivämäärälle, ei skeletin oletukselle.
  //    v4.27.1 korjaus: aiemmin 4. päivä sai saman primaryn kuin 3. päivä,
  //    mikä teki Ti/Pe-päivistä identtiset voimanostaja-skenaarioissa.)
  let weekPlans = skeleton.weekPlans;
  if (daysPerWeek !== 3) {
    weekPlans = adjustDaysPerWeek(weekPlans, daysPerWeek);
  }

  // 3. Substituoi päälikkeet + accessoryt (nyt lopulliselle päivälistalle)
  weekPlans = distributePrimariesToDays(weekPlans, primaries);

  // 4. Skaalaa weekCount
  let weekDefs = skeleton.weekDefs;
  const scaled = scaleWeekCount(weekPlans, weekDefs, weekCount, goal);
  weekPlans = scaled.weekPlans;
  weekDefs = scaled.weekDefs;

  // 5. Applikoi palautumisskaala accessoryihin
  const recoveryScalars = { hyva: 1.0, keski: 0.85, heikko: 0.70 };
  weekPlans = applyRecoveryScalar(weekPlans, recoveryScalars[recoveryCapacity] ?? 0.85);

  // 6. Käyttäjän viikonpäivä-preferenssi
  if (preferredDaysOfWeek) {
    weekPlans = applyDayOfWeekPreference(weekPlans, preferredDaysOfWeek);
  }

  // 7. Kokoa mesosykli
  const primaryLabel = primaries.map(p => p.name).join(" + ");
  const label = customLabel || `Räätälöity: ${primaryLabel} (${goal}, ${weekCount}vk)`;

  return {
    mesocycleId: uid(),
    type: "custom",
    customConfig: {
      goal,
      primaries,
      daysPerWeek,
      weekCount,
      recoveryCapacity,
      preferredDaysOfWeek,
      label,
      skeletonFactoryName,
      generatedAt: nowISO(),
    },
    startDateISO,
    weekCount,
    weekDefs,
    weekPlans,
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
  // v4.26.0: tarkista ja luo pre-migration-backup ENNEN openDB:tä
  // (openDB triggaa onupgradeneeded jos versio on bumpattu)
  await createPreMigrationBackupIfNeeded();

  await openDB();
  if (_db) {
    await seedPresets();
    await ensureAllVariantsSeeded();
    await updateLastOpened();
    // v4.26.0: viikottainen auto-backup (tarkistaa onko 7+ pv edellisestä)
    await maybeCreateWeeklyBackup();
  }
  return _db;
}

// ── Streetlifting 16-week mesocycle (Hybrid Block-DUP, 4 lifts) ──
// Calibration defaults: Leuka ext=85, Dippi ext=75, Kyykky=160, BW=91
// Loads from Excel Ohjelma-viikot (2026-04) scaled by athlete's e1RM ratio.
function createStreetlifting16WMesocycle(startDateISO, cal = {}) {
  // v4.22 P2 REFACTOR: Relative loading (% current e1RM).
  //
  // Aikaisemmin: loadingsit kovakoodattu absoluuttisissa kg:issa jotka
  // skaalattiin L/85-suhteella käyttäjän 1RM:ään. Tämä tuotti viikoilla
  // 10–11 ja 13–14 kuormia jotka olivat matemaattisesti >100 % 1RM:stä
  // kun kehitystä ei tapahtunut oletetulla tahdilla.
  //
  // Nyt: jokainen primary/backoff/topSingle/opener-slot tallentaa loadPct:n
  // (0.0–1.05), ja moottori laskee `currentE1RMExternal × loadPct` render-
  // ajassa. Kun käyttäjä vahvistaa e1RM:n (primer / top-set / testi), kuormat
  // skaalautuvat automaattisesti — peaking-haarassa (vk 13–16) tämä tarkoittaa
  // että jos kehitystä oli vain +3 %, peak-kuormat ovat ±3 % nykyisestä 1RM:stä,
  // ei 110 % kuvitellusta tulevaisuudesta.
  //
  // Seed-kuormitus: ensimmäinen sessio ilman e1RM-historiaa käyttää slot.suggestedLoadKg:tä
  // joka lasketaan tässä kalibroinnista. Tämä on vain lähtöpiste — moottori ottaa
  // ajantasaisen datan käyttöön välittömästi kun historiaa kertyy.
  const BW = cal.bwKg || 91;
  const L  = cal.leukaExtKg  || 85;   // lähtöarvio, nopeasti ylikirjoitettuna
  const D  = cal.dippiExtKg  || 75;
  const K  = cal.kyykkyExtKg || 160;

  // seedLoad: tuottaa kuorma-seed käyttäjän alkuperäisestä 1RM-arviosta
  // jotta ensimmäinen sessio ennen e1RM-dataa saa järkeviä painoja.
  // Pyöristys 0.25 kg (lisäpaino) / 2.5 kg (tanko) tarkkuuteen.
  const seedL = pct => Math.round(L * pct * 4) / 4;
  const seedD = pct => Math.round(D * pct * 4) / 4;
  const seedK = pct => Math.round(K * pct / 2.5) * 2.5;

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
    // v4.27.17: Pohkeenkohotus 5. slotiksi — nilkan jäykkyys kyykyn lockoutiin (230 kg+ rakenne)
    slotAccessory("calf-isolation",             "alaraaja", "Pohkeenkohotus",          { sets:3, reps:15, targetVx:3, note:"Ankle rigidity — kyykyn lockout-tuki, soleus+gastrocnemius" }),
  ];
  const pushAcc = () => [
    slotAccessory("bench-heavy",         "horisontaalityöntö", "Penkkipunnerrus",    { sets:4, reps:6,  targetVx:3, note:"kapea ote" }),
    slotAccessory("shoulder-vertical",   "vertikaalityöntö",   "Pystypunnerrus",     { sets:3, reps:8 }),
    slotAccessory("tricep-lockout",      "ojentajaekstensio",  "Tricep pushdown",    { sets:3, reps:12 }),
    // v4.27.17: Sivunosto → Face pull — strength-blokin (vk 5+) raskas dippivolyymi vaatii posterior balance; ei foundation-blokin pushAccPrehab:n 3×15 vaan 2×12 koska volyymi jo täyttynyt muualla
    slotAccessory("scapular-control",    "horisontaaliveto",   "Face pull",          { sets:2, reps:12, targetVx:4, note:"Posterior delt + rotator cuff — strength-blokin dippivolyymin tueksi" }),
  ];

  // ─── Dippi-prehab-accessory-paketti (v4.27.7 REFACTOR) ───
  // Foundation-blokissa (vk 1–4) käytetään pushAcc:n sijaan tätä pakettia.
  //
  // v4.27.7 muutos: Tempo pause dippi POISTETTU torstailta — siirtyy lauantailla
  // mu-dip-support-slotin tilalle (skill-vaiheessa). Perustelu: Tempo pause dippi
  // vaatii tuoretta kudosta ja hermolihaskontrolloa toimiakseen ROM-kapasiteetti-
  // liikkeenä. Torstaina primary-dipin (24–30 raskasta toistoa) JÄLKEEN se on
  // junk volumea — kontrolli rapissut, kudos kuormitettu. Lauantailla 48+h palautu-
  // misen jälkeen MU-päivällä (ei-dippi primary) se pääsee oikeuksiinsa, ja VK:n
  // kokonaisdippivolyymi vähenee 72→48–54 reps.
  //
  // Palautettu alkuperäisestä pushAcc:sta: Penkkipunnerrus (kapea ote) ja
  // Ab wheel (jälkimmäisen lisää toDay() automaattisesti).
  //
  // Säilytetty v4.27.4:stä: Dumbbell pullover (uniikki stretch-ROM pec-insertio-
  // kapasiteetille) + Face pull (posterior balance, "kriittinen dippi-volyymille").
  //
  // Pudotettu: Sivunosto (redundantti Pystypunnerruksen kanssa V3/8-rep-rangessa),
  // Tricep pushdown (korvautuu kapea-ote penkillä kompoundina).
  //
  // Liikkeet (4 kpl + Ab wheel = 5 slottia, sama kpl-määrä kuin pushAcc):
  //   1) Penkkipunnerrus kapea ote — triceps-dominantti, dip-lockout-spesifi
  //   2) Pystypunnerrus — vertikaali-työnnön balanssi vs horisontaalidippi
  //   3) Dumbbell pullover — stretch-mediated pec+lats hypertrofia (UNIIKKI ROM)
  //   4) Face pull — posterior scapular + rotator cuff
  const pushAccPrehab = () => [
    slotAccessory("bench-heavy",         "horisontaalityöntö", "Penkkipunnerrus",    { sets:4, reps:6,  targetVx:3, note:"Kapea ote — triceps-dominantti, dip-lockout-spesifi" }),
    slotAccessory("shoulder-vertical",   "vertikaalityöntö",   "Pystypunnerrus",     { sets:3, reps:8,  targetVx:3 }),
    slotAccessory("pec-stretch",         "horisontaalityöntö", "Dumbbell pullover",  { sets:2, reps:12, targetVx:4, note:"Täysi venytys — pec+lats stretch-hypertrofia" }),
    slotAccessory("scapular-control",    "horisontaaliveto",   "Face pull",          { sets:3, reps:15, targetVx:4, note:"Posterior shoulder balance — kriittinen dippi-volyymille" }),
  ];
  // v4.27.19: mixAcc redukoitu pelkäksi core-slotiksi. Perustelu: LA-päivä
  // sisältää jo etukyykyn (fsWeek, 11/16 vk), MU primaryn, MU-dip-supportin ja
  // mu-transitionin — kaikki streetlifting-spesifistä komposito-volyymia. Erillinen
  // scapular-control (Face pull) LA:lla oli foundation-blokissa triple-coverage
  // (MA + TO + LA = 135 reps/wk, liikaa); v4.27.18 yritti korvata grip-endurancella
  // (Farmer carry) mutta streetlifterille carry on dedikoitua volyymia ilman
  // kisahyötyä (ote tulee jo 94 kg leuka-primarysta + MU-transitionista). Kun
  // slot-pakotetta ei ole, cleanin poiston jälkeen LA-core jää ainoaksi mixAcc:n
  // slotiksi. Face pull foundation-volyymi pysyy 90 reps/wk (MA pullAcc 3×15 +
  // TO pushAccPrehab 3×15) — sama v4.27.18 target, mutta ilman LA-redundanssia.
  const mixAcc = () => [
    slotAccessory("core-hollow",     "core",             "Ab wheel rollout",   { sets:3, reps:10 }),
  ];

  // ─── Warmup ramp helper (v4.25 P2-15) ───
  // Neural primer + liikemallin herätys ennen ensimmäistä workset-sarjaa.
  // UI renderoi nämä listana atleetille. Kuormat lasketaan primary-slotin
  // loadPct:stä × current e1RM; fallback seed-arvo laskelman tueksi.
  const RAMP_DEFAULT = [
    { pct: 0.40, reps: 5, note: "Liikemalli, kevyt" },
    { pct: 0.55, reps: 3, note: "Lämpö" },
    { pct: 0.70, reps: 2, note: "Aktivaatio" },
    { pct: 0.85, reps: 1, note: "Neural primer" },
  ];
  const RAMP_BARBELL = [
    { pct: 0.35, reps: 5, note: "Tyhjä tanko + kevyt" },
    { pct: 0.50, reps: 3, note: "Liikemalli" },
    { pct: 0.65, reps: 2, note: "Lämpö" },
    { pct: 0.78, reps: 1, note: "Aktivaatio" },
    { pct: 0.88, reps: 1, note: "Neural primer (vain top single -päivinä)" },
  ];

  // ─── Day builders (v4.25 P1: warmup-sekvenssit, ramp, core, MU Vx-min 2) ───
  //
  // Kaikki primary/backoff/topSingle käyttää loadPct:tä (v4.22 P2). Moottori laskee
  // actualLoad = currentE1RMExternal × loadPct render-ajassa. Seed-kuormitus
  // (suggestedLoadKg) lasketaan seedL/seedD/seedK:sta kalibroinnista.
  // velocityStop: referenssikynnys (aktiivinen kun Enode/VBT-mittari käytössä);
  // ilman mittaria Vx-logging toimii subjektiivisena auto-regulaationa.
  // warmupSets: neural primer -ramp ennen workset-sarjoja (v4.25 P2-15).

  // v4.25: accessoryList-parametri antaa kutsujalle kontrollin tukiliikkeisiin.
  // null/undefined → default (pullAcc/pushAcc/lowerAcc + core).
  // [] → vain core.
  // [...slots] → erikoislistaus (esim. finisherAcc taper-viikoille).

  // ─── v4.28.0 Backoff-tyylikatalogi (L1/M2/M3) ───
  //
  // Block-periodization: yleinen → spesifi. Sama logiikka sovelletaan kaikkiin
  // kolmeen primaryyn (leuka/kyykky/dippi) yhdenmukaisesti — ei enää asymmetriaa,
  // jossa TI olisi hardkoodattu paused squat ja MA/TO olisivat pelkkä sama liike.
  //
  // Foundation  (vk 1-3):  yleinen volyymi samalla liikkeellä (motor pattern)
  // Strength    (vk 5-7):  tekninen variantti (pause/grip variation) — sticking-point
  // Intensity   (vk 9-11): eccentric-focus tai spesifi ote — CNS-moduloitu
  // Peaking     (vk 13-14): competition-style (ei pause, ei teknisiä modifikaatioita)
  //
  // Grip/tekniikka-variantit: PRIMARY_VARIANTS-katalogi wireataan tähän nyt
  // aktiivisena — foundation=neutraaliote, strength=myötäote, intensity+=kilpaote.
  const SQUAT_BACKOFF_STYLES = {
    regular:   { note: "Takakyykky — yleinen volyymi (motor pattern)", velocityStop: 0.45 },
    paused:    { note: "Paused squat 2s — sticking-point specificity", velocityStop: 0.40 },
    tempo:     { note: "Tempo squat 3s eksentrinen — eccentric control + bottom-position", velocityStop: 0.40 },
    kisastyle: { note: "Takakyykky kisastyle — competition-specific (EI paused peakingissa)", velocityStop: 0.45 },
  };
  const PULL_BACKOFF_STYLES = {
    // Foundation: neutraaliote = hauis-akti + grip-variaatio, volyymi-ote
    neutraaliote: { variantHint: "Neutraaliote",   note: "Neutraaliote — volyymi + hauis-akti (foundation grip-variation)", velocityStop: 0.55 },
    // Strength: myötäote = eri ote, vielä raskas mutta ei kisaspesifi → hauis-overload
    myotaote:     { variantHint: "Myötäoteveto",   note: "Myötäoteveto — eri ote, hauis-overload (strength grip-rotation)", velocityStop: 0.55 },
    // Intensity/peaking: kisaote, sama spesifinen variantti
    kilpaote:     { variantHint: "Kilpaveto (leveä vastaote)", note: "Kilpaveto — spesifi backoff-volyymi",             velocityStop: 0.55 },
  };
  const DIP_BACKOFF_STYLES = {
    // Foundation: ei backoffia (pushAccPrehab hoitaa volyymin)
    // Strength: kapea ote -dippi = tricep-overload backoff, silti kisaspec
    kapea:        { note: "Kapea ote — ojentaja-overload (strength backoff-variation)", velocityStop: 0.55 },
    // Intensity+: kisaspec leveä ote
    kilpaote:     { note: "Kilpaote leveä — kisaspesifi backoff-volyymi",               velocityStop: 0.55 },
  };

  // v4.28.0 (H2): Peaking-specific warmup. Vk 13-14 singleille tarvitaan neural primer
  // joka painottaa räjähtävyyttä, ei prehab-volyymia. Valitaan warmup-variantti
  // phase-parametrilla ("peaking" | null).
  const MA_WARMUP_PEAKING = [
    { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely — kevyempi taperissa" },
    { name: "Band pull-apart", desc: "1×15 — posterior delt aktivaatio" },
    { name: "Thoracic extension", desc: "1×8 per puoli — T-rangan liikkuvuus" },
    { name: "Band external rotation", desc: "1×10 per puoli — rotator cuff" },
    { name: "Scapular hang", desc: "2×10 s — lapa-aktivaatio" },
    { name: "Räjähtävä leuka BW", desc: "3×1 maksimi nopeus — neural primer singleille (ei 3 toistoa, vaan 3 yksittäistä räjähdystä)" },
    { name: "Warmup ramp (singles)", desc: "60% × 1 · 75% × 1 · 85% × 1 · 90% × 1 → workset" },
  ];
  const TI_WARMUP_PEAKING = [
    { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely" },
    { name: "Hip 90/90 + Cossack", desc: "1 min per puoli — lonkka-mobiliteetti" },
    { name: "Empty bar squat", desc: "1×5 — liikemallin herätys (ei 1×8, riittää taperissa)" },
    { name: "Warmup ramp (singles)", desc: "40% × 3 · 60% × 2 · 75% × 1 · 85% × 1 → workset" },
  ];
  const TO_WARMUP_PEAKING = [
    { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely" },
    { name: "Band dislocations", desc: "1×10 — olka-mobiliteetti" },
    { name: "Band external rotation", desc: "1×10 per puoli — rotator cuff" },
    { name: "Band pull-apart", desc: "1×15 — posterior balance" },
    { name: "Scapular push-up", desc: "1×8 — serratus aktivaatio" },
    { name: "BW dippi", desc: "1×3 räjähtävä — neural primer" },
    { name: "Warmup ramp (singles)", desc: "60% × 2 · 75% × 1 · 85% × 1 · 90% × 1 → workset" },
  ];

  function maDay(label, sets, reps, vx, primaryPct, backoffPct, topPct, accessoryList, backoffStyle, phase) {
    // v4.25.1 (Enode): allowVelocityInput merkitsee ankkuripisteet joissa
    // per-sarja-velocity on puhdas signaali (ei grind-kontaminaatiota).
    // Primary: vain jos reps===1 JA loadPct ≥ 0.85 (top single/peaking).
    // Top single -slot: aina.
    const primaryIsAnchor = reps === 1 && primaryPct >= 0.85;
    const slots = [
      { role:"primary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
        sets, reps, targetVx:vx, loadPct:primaryPct, suggestedLoadKg:seedL(primaryPct),
        competitionLift:true, velocityStop: vx <= 1 ? 0.45 : vx <= 2 ? 0.50 : 0.60,
        warmupSets: RAMP_DEFAULT, allowVelocityInput: primaryIsAnchor },
    ];
    if (backoffPct) {
      // v4.28.0 (M2/M3/H7): block-aware backoff-tyyli (grip-variaatio wireattu)
      //   foundation ei käytä backoffia (null), strength=myotaote, intensity=kilpaote, peaking=finisher erikseen
      const styleKey = backoffStyle || "kilpaote";
      const style = PULL_BACKOFF_STYLES[styleKey] || PULL_BACKOFF_STYLES.kilpaote;
      slots.push({
        role:"backoff", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
        sets:3, reps:reps+1, targetVx:vx+1,             // H7: 2→3 sarjaa yhdenmukaistus TI:n kanssa
        loadPct:backoffPct, suggestedLoadKg:seedL(backoffPct),
        velocityStop: style.velocityStop,
        note: style.note,
        ...(style.variantHint ? { variantHint: style.variantHint } : {}),
      });
    }
    if (topPct) {
      // v4.25 P2-14: RPE-label korjattu vastaamaan %1RM:ää (92% ≈ RPE 8, 95% ≈ RPE 9)
      const rpeLabel = topPct >= 0.97 ? "RPE 9.5" : topPct >= 0.95 ? "RPE 9" : topPct >= 0.92 ? "RPE 8–8.5" : "RPE 8";
      slots.push({ role:"secondary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
        sets:1, reps:1, targetVx:1, loadPct:topPct, suggestedLoadKg:seedL(topPct),
        note:`Top single ${rpeLabel}`, velocityStop: 0.40, allowVelocityInput: true });
    }
    // v4.25 P2-17: Core-slot MA/TI/TO-päiviin lisätään accessoryna
    const accessories = accessoryList === undefined ? pullAcc() : accessoryList;
    const coreSlot = slotAccessory("core-hollow", "core", "Ab wheel rollout", { sets:2, reps:10, targetVx:3 });
    const warmupArr = phase === "peaking" ? MA_WARMUP_PEAKING : [
      { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely — veren virtaus + lihaslämpö ylös" },
      { name: "Band pull-apart", desc: "2×15 — posterior delt + lapa-retraktio" },
      { name: "Thoracic extension (foam roller)", desc: "2×8 per puoli — T-rangan liikkuvuus avautuu" },
      // v4.27.17: Band external rotation symmetriaan TO:n prehab-depthin kanssa — rotator cuff aktivaatio ennen vetoja
      { name: "Band external rotation", desc: "2×12 per puoli — rotator cuff ext, symmetria TO:n prehab-depthin kanssa" },
      { name: "Scapular hang", desc: "3×10 s — lapa-aktivaatio ennen vetoja" },
      { name: "BW-leuka (kevyt)", desc: "1×5 — liikemallin herätys" },
      { name: "Räjähtävä leuka BW", desc: "1×3 — max nopeus ylös, neural primer" },
      { name: "Warmup ramp (primary)", desc: "40% × 5 · 55% × 3 · 70% × 2 · 85% × 1 → workset" },
    ];
    return { dayOfWeek:1, dayType:"heavy", label:label || "MA — Leuka + Selkä",
      warmup: warmupArr,
      slots:[...slots, ...accessories, coreSlot] };
  }

  // v4.28.0 (L1/M2): tiDay käyttää nyt eksplisiittistä backoffConfig-objektia, ei
  // hardkoodattua paused squat -backoffia. Tämä korjaa block-periodization-loukkauksen
  // jossa 2s paused singles esiintyi vielä peaking-viikolla (vk 14, 10 pv ennen kisaa).
  //   backoffConfig = { style: "regular"|"paused"|"tempo"|"kisastyle", pct?: number } | null
  //   jos pct puuttuu, käytetään primaryPct × 0.80 defaulttia.
  //   null = ei backoffia (esim. realization/taper-viikot jos halutaan).
  function tiDay(label, sets, reps, vx, primaryPct, topPct, accessoryList, backoffConfig, phase) {
    const primaryIsAnchor = reps === 1 && primaryPct >= 0.85;
    const slots = [
      { role:"primary", category:"alaraaja", defaultMovementName:"Takakyykky",
        sets, reps, targetVx:vx, loadPct:primaryPct, suggestedLoadKg:seedK(primaryPct),
        competitionLift:true, isBarbell:true,
        velocityStop: vx <= 1 ? 0.35 : vx <= 2 ? 0.40 : 0.50,
        warmupSets: RAMP_BARBELL.slice(0, topPct ? 5 : 4),
        allowVelocityInput: primaryIsAnchor },
    ];
    // Backoff: block-aware tyyli (L1 korjaus)
    if (backoffConfig !== null) {
      const cfg = backoffConfig || { style: "paused" };  // legacy-default jos kutsuja ei anna mitään
      const style = SQUAT_BACKOFF_STYLES[cfg.style] || SQUAT_BACKOFF_STYLES.paused;
      const backoffPct = cfg.pct ?? Math.round(primaryPct * 0.80 * 100) / 100;
      const backoffReps = cfg.reps ?? (reps + 1);   // H7: yhdenmukaistus +1 rep MA/TO:n kanssa
      slots.push({
        role:"backoff", category:"alaraaja", defaultMovementName:"Takakyykky",
        sets:3, reps:backoffReps, targetVx:vx+1,
        loadPct:backoffPct, suggestedLoadKg:seedK(backoffPct),
        note: style.note,
        isBarbell:true,
        velocityStop: style.velocityStop,
      });
    }
    if (topPct) {
      const rpeLabel = topPct >= 0.97 ? "RPE 9.5" : topPct >= 0.95 ? "RPE 9" : topPct >= 0.92 ? "RPE 8–8.5" : "RPE 8";
      slots.push({ role:"secondary", category:"alaraaja", defaultMovementName:"Takakyykky",
        sets:1, reps:1, targetVx:1, loadPct:topPct, suggestedLoadKg:seedK(topPct),
        note:`Top single ${rpeLabel}`, isBarbell:true, velocityStop: 0.30,
        allowVelocityInput: true });
    }
    const accessories = accessoryList === undefined ? lowerAcc() : accessoryList;
    // v4.27.18: TI saa anti-rotation coren (frontaalitason spine-stability raskaassa kyykyssä)
    // MA + TO säilyttävät hollow:n (sagittal flexion tukee leuka/dippi/MU-chainia)
    const coreSlot = slotAccessory("core-antirotation", "core", "Pallof press", { sets:3, reps:10, targetVx:3, note:"10 toistoa per puoli — anti-rotation, spine-stability raskaaseen kyykkyyn" });
    const warmupArr = phase === "peaking" ? TI_WARMUP_PEAKING : [
      { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely" },
      { name: "Hip 90/90 stretch", desc: "1 min per puoli — lonkan sisä- ja ulkorotaatio" },
      { name: "Cossack squat", desc: "2×5 per puoli — adduktorit + lonkkamobiliteetti" },
      { name: "Heel Elevated Goblet Squat", desc: "2×8, 2s alas · 1s pohja · 2s ylös — kvad-aktivaatio" },
      { name: "Empty bar squat", desc: "1×8 — liikemallin herätys" },
      { name: "Warmup ramp (primary)", desc: `35% × 5 · 50% × 3 · 65% × 2 · 78% × 1${topPct ? " · 88% × 1" : ""} → workset` },
    ];
    return { dayOfWeek:2, dayType:"heavy", label:label || "TI — Kyykky + Alavartalo",
      warmup: warmupArr,
      slots:[...slots, ...accessories, coreSlot] };
  }

  function toDay(label, sets, reps, vx, primaryPct, backoffPct, topPct, accessoryList, backoffStyle, phase) {
    const primaryIsAnchor = reps === 1 && primaryPct >= 0.85;
    const slots = [
      { role:"primary", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
        sets, reps, targetVx:vx, loadPct:primaryPct, suggestedLoadKg:seedD(primaryPct),
        competitionLift:true,
        velocityStop: vx <= 1 ? 0.45 : vx <= 2 ? 0.50 : 0.60,
        warmupSets: RAMP_DEFAULT,
        allowVelocityInput: primaryIsAnchor,
        techniqueNote: "Kontrolloitu alakohta — ei bouncea. Olkapää noin 90° tai hieman yli. Pec-tear-riski korkea bounce-variaatiossa raskailla kuormilla." },
    ];
    if (backoffPct) {
      // v4.28.0 (M2/H7): block-aware backoff. Foundation pushAccPrehab hoitaa prehab-volyymin;
      // tästä on backoff aktiivinen vain strength+ kun backoffPct annetaan kutsujalta.
      const styleKey = backoffStyle || "kilpaote";
      const style = DIP_BACKOFF_STYLES[styleKey] || DIP_BACKOFF_STYLES.kilpaote;
      slots.push({
        role:"backoff", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
        sets:3, reps:reps+1, targetVx:vx+1,           // H7: 2→3 sarjaa
        loadPct:backoffPct, suggestedLoadKg:seedD(backoffPct),
        velocityStop: style.velocityStop,
        note: style.note,
      });
    }
    if (topPct) {
      const rpeLabel = topPct >= 0.97 ? "RPE 9.5" : topPct >= 0.95 ? "RPE 9" : topPct >= 0.92 ? "RPE 8–8.5" : "RPE 8";
      slots.push({ role:"secondary", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
        sets:1, reps:1, targetVx:1, loadPct:topPct, suggestedLoadKg:seedD(topPct),
        note:`Top single ${rpeLabel}`, velocityStop: 0.40,
        allowVelocityInput: true });
    }
    // v4.25 P1-2: Kattava olkapäälämmittely dippi-päivälle — atleetilla rajallinen
    // kokemus raskaasta dipistä, olka-pehmytkudokset vaativat kattavan prepin.
    // Evidenssi: Andersen et al. 2017 "Shoulder injury prevention in strength sports",
    // Kibler et al. 2006 "Scapular dyskinesis", Bishop & Spencer 2004 "Warm-up strategies".
    const warmupArr = phase === "peaking" ? TO_WARMUP_PEAKING : [
      { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely — veren virtaus + lihaslämpö ylös" },
      { name: "Band dislocations", desc: "2×10 — olkapään dislokaatiot kuminauhalla, täysi ROM etu-taka" },
      { name: "Thoracic extension (foam roller)", desc: "2×8 per puoli — T-rangan ekstensio kuntoon" },
      { name: "Band external rotation", desc: "2×15 per puoli — kuminauha kyynärpäässä, rotator cuff aktivaatio" },
      { name: "Band pull-apart", desc: "2×15 — posterior delt + rhomboid" },
      { name: "Scapular push-up", desc: "2×8 — serratus anterior (kyynärpäät suorina, liike lavassa)" },
      { name: "Wall slide", desc: "2×10 — scapular upward rotation seinää vasten" },
      { name: "Bodyweight dippi", desc: "2×5–8 — liikemallin herätys ennen kuormaa" },
      { name: "Warmup ramp (primary)", desc: "40% × 5 · 55% × 3 · 70% × 2 · 85% × 1 → workset" },
    ];
    return { dayOfWeek:4, dayType:"heavy", label:label || "TO — Dippi + Työntö",
      warmup: warmupArr,
      slots:[...slots, ...(accessoryList === undefined ? pushAcc() : accessoryList), slotAccessory("core-hollow", "core", "Ab wheel rollout", { sets:2, reps:10, targetVx:3 })] };
  }

  // ─── Finisher-accessory blokki 4:lle (v4.25 P1-11) ───
  // Vk 13–15: kevyt aktivointi ilman fatiikkaa. 2 sarjaa ydin-lihasryhmille,
  // korkea reps + matala intensiteetti → verenkierto + tekninen ylläpito.
  // Tarkoitus: estää "alitreenattu"-tunne taperin aikana, ei lisätä kuormaa.
  const finisherAcc = (intensityLabel = "aktivointi") => [
    slotAccessory("scapular-control", "horisontaaliveto", "Face pull",
      { sets:2, reps:15, targetVx:4, note:`Kevyt — ${intensityLabel}` }),
    slotAccessory("tricep-lockout",   "ojentajaekstensio", "Tricep pushdown",
      { sets:2, reps:12, targetVx:4, note:`Kevyt — ${intensityLabel}` }),
  ];
  const finisherMinimal = (intensityLabel = "vain aktivointi") => [
    slotAccessory("scapular-control", "horisontaaliveto", "Face pull",
      { sets:2, reps:12, targetVx:4, note:`Kevyt — ${intensityLabel}` }),
  ];

  // MU pysyy absoluuttisena kg:ina — MU:ssa e1RM ei ole luotettava (bimodaalinen:
  // joko onnistuu tai ei), ja progressio on pieninä askelina BW:n yli (2.5-5 kg).
  //
  // v4.25 P1-1: fsWeek-parametri lisää etukyykky-secondary-slotin LA:lle.
  // Perustelu: atleetin tavoite 175 → 200+ kg 16 vk:ssa vaatii 2×/vk kyykky-
  // frekvenssin (muscle memory retraining, Psilander et al. 2019). LA-päivä
  // 72h TI:n jälkeen = hyvä palautuminen. Etukyykky (ei takakyykky) = eri
  // motor pattern, matalampi selkäfatiikka. Intensiteetti 55–75% V3–V4 =
  // tekninen volyymi, ei raskas toinen kyykky.
  //
  // v4.25 P1-8: MU targetVx pakotetaan minimiin 2 (ei koskaan Vx1 MU:lle).
  // Perustelu: MU on teknis-voimahybridi, tekniikka rikkoutuu ennen voimaa
  // väsymyksen alla. V1 = RIR 1 = seuraava toisto failure → 4. sarja on
  // "epäpuhdas" kuormitettuna. Riskinhallintapäätös.
  function laDay(label, muLoad, muSets, muNote, muVx, fsWeek, finisher) {
    // v4.28.0 (M4): isSkill-haarassa ei enää käytetä vapaatekstistä muNotea vaan
    // rakennetaan primary-MU-slotin rinnalle skill-spesifiset slotit:
    //   1) Muscle-up eksentrinen (5 × 2, 5-8 s lasku, pec/lats/triceps-kapasiteetti)
    //   2) mu-transition (jo olemassa slotAccessory — nostetaan skill-sarjamäärä 5:een)
    //   3) pull-vertical-explosive (Räjähtävä leuka BW 4×3, neural primer MU:n vedolle)
    // Engine autotrakkaa jokaisen, UI renderöi omalla slot-kohtaisella näkymällä.
    const isSkill = muLoad === 0;
    const slots = [];

    // LA:n 2. kyykky-eksposointi — variaatio etenee blokin mukaan (v4.27.20):
    //   Foundation/Strength (vk 1-7): Etukyykky — quad-dominant, motor diversity
    //   Intensity (vk 9-11):           Box squat — stretch-reflex nollattu,
    //                                  puhdas concentric "kuopasta" (sticking
    //                                  point specificity; TI:ssä jo Paused squat
    //                                  backoffissa, LA tarvitsee eri kulman)
    //   Peaking (vk 13-14):            Takakyykky kisastyle kevyt — opener
    //                                  rehearsal + motor groove, maksimi-
    //                                  specificity ennen kisaa
    //
    // Cross-reference loading: kaikki laskevat Takakyykky-e1RM:stä. refScale
    // skaalaa liikkeen RM-suhteeseen takakyykky-e1RM:än kanssa (Etukyykky
    // ~85 %, Box squat ~85 %, Takakyykky self 100 %).
    if (fsWeek && fsWeek.pct > 0) {
      const fsLoadPct = fsWeek.pct;
      const movement  = fsWeek.movement  ?? "Etukyykky";   // default = v4.25 P1-1 käyttäytyminen
      const refScale  = fsWeek.refScale  ?? 0.85;          // default = etukyykky-skaalaus
      const fsLoadScaled = fsLoadPct * refScale;
      // Velocity-stop per liike (biomechanicsin ja CNS:n mukaan):
      //   Etukyykky: konservatiivinen (tekninen, rintakehän asento)
      //   Box squat: räjähtävämpi (puhdas concentric boksilta)
      //   Takakyykky: normaali (kisaliike)
      const vStop = movement === "Box squat"
        ? (fsWeek.vx <= 2 ? 0.50 : 0.60)
        : movement === "Takakyykky"
          ? (fsWeek.vx <= 2 ? 0.40 : 0.55)
          : (fsWeek.vx <= 2 ? 0.45 : 0.55);  // Etukyykky default
      // Warmup: takakyykky käyttää standardi tanko-rampia (kisalift),
      // etukyykky/box squat kevyempi tekninen ramp.
      const wUp = movement === "Takakyykky"
        ? RAMP_BARBELL.slice(0, 4)
        : [
            { pct: 0.30, reps: 5, note: "Tyhjä tanko + kevyt" },
            { pct: 0.50, reps: 3, note: "Liikemalli" },
            { pct: 0.70, reps: 2, note: "Aktivaatio" },
          ];
      slots.push({
        role: "secondary",
        category: "alaraaja",
        defaultMovementName: movement,
        sets: fsWeek.sets,
        reps: fsWeek.reps,
        targetVx: fsWeek.vx,
        loadPct: fsLoadScaled,
        // v4.27.13: loadPct viittaa Takakyykky-e1RM:ään (refScale-skaalaus
        // sisäänrakennettu fsLoadScaled:iin). Engine hakee Takakyykky-liikkeen
        // e1RM:n ja kertoo loadPct:llä → liike saa oikean suhteellisen kuorman.
        loadPctReferenceMovementName: "Takakyykky",
        suggestedLoadKg: Math.round(K * fsLoadScaled / 2.5) * 2.5,
        isBarbell: true,
        note: `${movement} ${fsWeek.note || "— tekninen 2. frekvenssi"}`,
        velocityStop: vStop,
        warmupSets: wUp,
      });
    }

    // MU primary (v4.28.0 M4: skill-vaiheessa Muscle-up eksentrinen rakenteellisena slottina)
    if (isSkill) {
      // Skill-vaihe (vk 1-4): rakenteellinen multi-slot — ei vapaatekstiä muNotessa
      slots.push({
        role: "primary",
        category: "vertikaaliveto",
        defaultMovementName: "Muscle-up eksentrinen",
        sets: muSets || 5,
        reps: 2,
        targetVx: null,
        suggestedLoadKg: 0,
        competitionLift: true,
        muSkillPhase: true,
        muAutoRegulate: false,
        note: muNote || "5-8 s lasku MU-yläasennosta — hyppy/avustettu ylös. Pec/lats/triceps eksentrinen kapasiteetti MU:n transitiolle."
      });
    } else {
      // Kuormitettu MU (vk 5+): primary-slotti lisäkuormalla, autoregulaatio käytössä
      slots.push({
        role: "primary",
        category: "vertikaaliveto",
        defaultMovementName: "Muscle-up",
        sets: muSets || 5,
        reps: 1,
        // v4.25 P1-8: kuormitetut MU:t pakotetaan Vx ≥ 2 (ei koskaan Vx1)
        targetVx: Math.max(muVx ?? 2, 2),
        suggestedLoadKg: muLoad,
        competitionLift: true,
        muSkillPhase: false,
        // v4.25 P1-9 flag: engine voi säätää kuormaa viim. session Vx:n mukaan
        muAutoRegulate: true,
        note: muNote || `+${muLoad} kg`
      });
    }

    // MU-tukiliikkeet
    // v4.27.12 KORJAUS: Skill-vaiheen Tempo pause dippi 3×8 V3 poistettu —
    // palautumisvelka-analyysi osoitti sen olevan netto-negatiivinen torstain
    // raskaan push-volyymin (dippi-primary + kapea penkki + pystäri + pullover =
    // ~96 ojentaja/pec-toistoa) jälkeen. 48 h ei riitä tempo-työn oikeaan
    // toteutukseen (triceps/pec-fatiikka → tekniikka rapisee, pec-insertion
    // stretch-stimulus menetetään). Korvattu BW eksentrisellä dipillä: eksentrinen
    // faasi harjoittaa pec-insertion ROM-hallintaa ILMAN concentric-triceps-
    // kuormitusta → ei lisää palautumisvelkaa MA:n leuka-primaryä varten.
    //
    // Samoin mu-transition skill-vaiheessa 4×8 V3 → 3×5 V3 BW: 32 → 15 leuka-
    // toistoa 48 h ennen MA:n leuka-primaryä (selkä/bicep-tuoreus säilyy).
    //
    // Load-vaiheissa säilyy Lisäpainodippi 3×5 V3 MU-lockout-tukena (kevyt
    // volyymi, spesifi MU:n työnnölle).
    const dipSupport = isSkill
      ? slotAccessory("dip-eccentric-bw", "horisontaalityöntö", "BW eksentrinen dippi",
          { sets:3, reps:3, targetVx:4, note:"5 s lasku BW:lla, hyppy/avustettu ylös — vain eksentrinen pec-ROM, ei concentric triceps-kuormaa (TO:n 48 h palautuminen säilyy)" })
      : slotAccessory("mu-dip-support", "horisontaalityöntö", "Lisäpainodippi",
          { sets:3, reps:5, targetVx:3, note:"Kevyt — MU-lockout-tuki" });

    // v4.28.0 (M4): Skill-vaiheessa räjähtävä leuka BW on nyt rakenteellinen slot
    // (pull-vertical-explosive, neural primer MU:n vedolle), ei pelkkä warmup-rivi.
    // Load-vaiheessa mu-transition hoitaa räjähtävyyden — ei duplikaatiota.
    slots.push(
      slotAccessory("mu-transition", "vertikaaliveto", "Leuanveto chest-to-bar",
        { sets: isSkill ? 4 : 4, reps: isSkill ? 3 : 5, targetVx: 3,
          note: isSkill
            ? "Transition-veto chest-to-bar — räjähtävä, 4×3 neural primer MU:n vedolle (M4: rakenteellinen, ei enää vapaatekstinä muNotessa)"
            : "Kevyt — nopeus" })
    );
    // Skill-vaihe saa ylimääräisen räjähtävän leuka-slotin (pull-vertical-explosive)
    if (isSkill) {
      slots.push(slotAccessory("pull-vertical-explosive", "vertikaaliveto", "Räjähtävä leuka",
        { sets: 4, reps: 3, targetVx: 3,
          note: "BW räjähtävä — maksimi nopeus ylös, RFD-stimulus. Rakentaa MU-vedon concentric-nopeutta 48 h ennen MA:n leuka-primaryä." }));
    }
    slots.push(
      dipSupport,
      ...mixAcc()
    );

    // Mahdollinen "finisher"-override (vk 15 käyttää minimiä)
    if (finisher === "minimal") {
      // Korvataan mixAcc pelkällä 1 slotilla vk 15:lle
      const coreIdx = slots.findIndex(s => s.slotId === "core-hollow");
      if (coreIdx >= 0) slots.splice(coreIdx, 1);
    }

    return { dayOfWeek:6, dayType:"volume", label:label || "LA — Muscle-up + Kevyt",
      warmup: [
        { name: "Hyppynaru / Jumping Jacks", desc: "2–3 min yleislämmittely" },
        { name: "Scapular pull-up", desc: "2×10 — lapa-aktivaatio ennen MU:ta" },
        { name: "False Grip hang", desc: "3×20 s — ranteiden asento kuntoon" },
        { name: "Band dislocations", desc: "2×10 — olka-mobiliteetti MU:n push-osaan" },
        { name: "Räjähtävä leuka BW", desc: "3×3 — maksimaalinen nopeus ylös, neural primer" },
        // v4.27.20: warmup-rivin nimi heijastaa block-specific variaatiota
        ...(fsWeek ? [{ name: `${fsWeek.movement ?? "Etukyykky"}-lämmittely`, desc: "Ks. slotin warmupSets — ennen MU:ta" }] : []),
      ],
      slots };
  }

  // ─── Calibration day (v4.27.15) ───
  //
  // AMRAP-kalibrointisessio deload-viikon lopuksi. Tarkoitus: korvata Vx-
  // biasoitunut Epley+Vara-pohjainen e1RM-estimaatti ground-truth-mittauksella.
  //
  // Protokolla per liike:
  //   1. Lämmittely (ramppi 40% → 75% × 2)
  //   2. 1 sarja @85 % × AMRAP tekniseen failureen asti (EI grindiä — pysäytä
  //      kun seuraava toisto ei lähde puhtaalla tekniikalla).
  //   3. Atleetti raportoi toistot + actualVx = 0 (failure).
  //   4. Engine laskee puhtaan Epleyn: e1RM = kuorma × (1 + toistot/30).
  //
  // Odotettu toistomäärä @85 %: 4-8 reps terve atleetti.
  //   • < 2 reps → kuorma oli liian raskas (e1RM oli yliarvioitu → korjaus alas)
  //   • > 12 reps → kuorma oli liian kevyt (e1RM oli aliarvioitu → korjaus ylös)
  //
  // Rate-limit: AMRAP-setti EI ankkuroi progression rate-limittiä
  // (actualVx=0 suodatetaan computeRateLimitAnchorissa). Kalibrointi on
  // "reset", ei progression-anchor.
  //
  // Miksi @85 % (ei @90 %+)? Epley-mallin tarkkuus on paras 2-10 rep-rangessa;
  // @85 % antaa 4-8 reps keskivertoatleetilla. @90 %+ antaisi 2-4 reps mutta
  // CNS-kuormitus korkeampi (epäsuositeltavaa deload-viikolla).
  function calibrationDay(weekLabel = "Vk 4") {
    const slots = [
      {
        role: "calibration",
        category: "vertikaaliveto",
        defaultMovementName: "Lisäpainoleuanveto",
        sets: 1,
        reps: null,             // AMRAP — ei kiinteää toistotavoitetta
        targetVx: 0,            // tekninen failure
        loadPct: 0.85,
        suggestedLoadKg: seedL(0.85),
        isCalibration: true,    // UI-flag: renderöi AMRAP-reps-kenttä
        amrapTargetRange: [4, 8],
        note: `${weekLabel} kalibrointi — Leuka AMRAP @85 % → tekninen failure (4–8 toistoa odotettu). Tulos päivittää e1RM:n puhtaalla Epleyllä.`,
        velocityStop: 0.40,
        allowVelocityInput: true,
        warmupSets: [
          { pct: 0.40, reps: 5, note: "Lämmittely" },
          { pct: 0.55, reps: 3, note: "Ramppi" },
          { pct: 0.70, reps: 2, note: "Viim. lämmittely" },
          { pct: 0.80, reps: 1, note: "Ankkuri ennen AMRAPia" },
        ],
      },
      {
        role: "calibration",
        category: "horisontaalityöntö",
        defaultMovementName: "Lisäpainodippi",
        sets: 1,
        reps: null,
        targetVx: 0,
        loadPct: 0.85,
        suggestedLoadKg: seedD(0.85),
        isCalibration: true,
        amrapTargetRange: [4, 8],
        note: `${weekLabel} kalibrointi — Dippi AMRAP @85 % → tekninen failure. Lopeta kun liikemalli alkaa hajota (bounce/pec-stretch-raja).`,
        velocityStop: 0.40,
        allowVelocityInput: true,
        warmupSets: [
          { pct: 0.40, reps: 5, note: "Lämmittely" },
          { pct: 0.55, reps: 3, note: "Ramppi" },
          { pct: 0.70, reps: 2, note: "Viim. lämmittely" },
          { pct: 0.80, reps: 1, note: "Ankkuri" },
        ],
      },
      {
        role: "calibration",
        category: "alaraaja",
        defaultMovementName: "Takakyykky",
        sets: 1,
        reps: null,
        targetVx: 0,
        loadPct: 0.85,
        suggestedLoadKg: seedK(0.85),
        isBarbell: true,
        isCalibration: true,
        amrapTargetRange: [4, 8],
        note: `${weekLabel} kalibrointi — Kyykky AMRAP @85 % → tekninen failure (säilytä syvyys + selän neutraali — ei grindiä kompensoivalla tekniikalla).`,
        velocityStop: 0.30,
        allowVelocityInput: true,
        warmupSets: [
          { pct: 0.35, reps: 5, note: "Tyhjä tanko + kevyt" },
          { pct: 0.50, reps: 3, note: "Ramppi" },
          { pct: 0.65, reps: 2, note: "Lämmittely" },
          { pct: 0.78, reps: 1, note: "Ankkuri" },
        ],
      },
    ];
    return {
      dayOfWeek: 6,
      dayType: "heavy",     // kalibrointi on raskas diagnoosi, ei volyymi
      label: `LA — Kalibrointi AMRAP (${weekLabel}) 🎯`,
      warmup: [
        { name: "Hyppynaru / Jumping Jacks", desc: "3 min — perusteellinen lämmittely" },
        { name: "Band pull-apart + dislocations", desc: "2×15 — olkapäät ja lavat valmiiksi" },
        { name: "Hip 90/90 + Cossack", desc: "1 min per puoli — lonkka-mobilitetti kyykyjä varten" },
        { name: "Scapular pull-up / push-up", desc: "2×8 — lapa-aktivaatio" },
        { name: "Dynaaminen priming", desc: "Räjähtävä BW-leuka 2×3, BW-dippi 2×5 — neural primer" },
      ],
      slots,
    };
  }

  // ─── 16-week plan (v4.22 P2 REFACTOR) ───
  //
  // Kaikki kuormat RELATIIVISIA nykyiseen e1RM:ään (loadPct). Moottori skaalaa
  // automaattisesti viikolta toiselle kun top-sarjat rakentavat e1RM-historian.
  // Peaking-haara (vk 13–16) skaalautuu vk 12:n RPE9-testissä päivitettyyn
  // e1RM:ään, joten jos kehitys oli 3 %, peak-kuormat eivät ole 108 % vaan 103 %.
  //
  // Volyymiprogressio: blokki 1 nouseva (MEV→MAV), blokki 2 tasainen, blokki 3
  // laskeva (MAV→MEV), blokki 4 minimaalinen (realization).
  //
  // Intensiteetti: 65% → 85% → 92% primary-progressio. 100+ % kuormia EI
  // suunnitella — vain "Top single RPE 8" -kohdissa (vk 12 ja vk 14 PR-yritys).
  // ─── LA:n 2. kyykky-progressio (v4.25 P1-1, v4.27.20 block-specific variation) ───
  // % on suhteessa takakyykky-e1RM:ään; laDay() skaalaa movementin mukaan
  // (refScale: Etukyykky 0.85, Box squat 0.85, Takakyykky self 1.00).
  //
  // Block-periodization-rakenne (general → specific):
  //   Foundation vk 1-3: Etukyykky — motor pattern, quad-dominant variation
  //   Strength  vk 5-7:  Etukyykky — GPP, moderate strength
  //   Intensity vk 9-11: Box squat — sticking-point specificity (stretch-reflex
  //                      nollattu, puhdas concentric; TI:ssä on Paused squat)
  //   Peaking   vk 13-14: Takakyykky kisastyle kevyt — opener rehearsal,
  //                       motor groove, CNS primer ilman fatiikkaa
  //
  // Deload-viikot 4, 8, 12 intentionaalisesti ilman LA-kyykkyä:
  //   vk 4  = Takakyykky AMRAP-kalibrointi (calibrationDay, v4.27.15)
  //   vk 8  = puhdas palautuminen ennen intensity-blokkia
  //   vk 12 = puhdas palautuminen ennen peakingia
  // Vk 15-16 taperissa ei myöskään — viimeinen raskas on vk 14.
  //
  // Volyymirakenne: Foundation nouseva (3→4 sarjaa), Strength tasainen,
  // Intensity laskeva volyymi/raskaampi, Peaking minimaalinen (realization).
  const FS = {
    // Foundation — Etukyykky, motor pattern + hypertrofia
    w1:  { sets:3, reps:5, vx:4, pct:0.55, movement:"Etukyykky", refScale:0.85, note:"@55 % — motor pattern palautus" },
    w2:  { sets:3, reps:5, vx:4, pct:0.60, movement:"Etukyykky", refScale:0.85, note:"@60 %" },
    w3:  { sets:4, reps:5, vx:3, pct:0.62, movement:"Etukyykky", refScale:0.85, note:"@62 % — volyymi-peak blokki 1" },
    // Strength — Etukyykky, volyymi + voima
    w5:  { sets:3, reps:5, vx:3, pct:0.65, movement:"Etukyykky", refScale:0.85, note:"@65 % — voima-blokki alkaa" },
    w6:  { sets:3, reps:5, vx:3, pct:0.68, movement:"Etukyykky", refScale:0.85, note:"@68 %" },
    w7:  { sets:4, reps:5, vx:3, pct:0.70, movement:"Etukyykky", refScale:0.85, note:"@70 %" },
    // Intensity — Box squat, sticking-point specificity
    // Box squat takakyykyn nosturiin nähden ~80–85 % RM → @58–65 % Takakyykky-e1RM
    // vastaa box-squat-RM:stä ~68–76 %, joka on intensity-vaiheen moderate-heavy.
    w9:  { sets:3, reps:5, vx:3, pct:0.58, movement:"Box squat", refScale:0.85, note:"@58 % Takakyykky — Box squat, pysähtys 1 s boksilla, räjähtävä nousu" },
    w10: { sets:3, reps:5, vx:3, pct:0.62, movement:"Box squat", refScale:0.85, note:"@62 % Takakyykky — Box squat" },
    w11: { sets:3, reps:4, vx:2, pct:0.65, movement:"Box squat", refScale:0.85, note:"@65 % Takakyykky — Box squat, viim. raskaampi" },
    // Peaking — Takakyykky kisastyle kevyt, maksimi-specificity
    // refScale 1.00 = ei skaalausta; % suoraan Takakyykky-e1RM:stä.
    // Löydetään opener-tunne ilman CNS-fatiikkaa.
    w13: { sets:3, reps:3, vx:3, pct:0.65, movement:"Takakyykky", refScale:1.00, note:"@65 % kisakyykky — opener rehearsal, kisastyle" },
    w14: { sets:2, reps:3, vx:3, pct:0.60, movement:"Takakyykky", refScale:1.00, note:"@60 % kisakyykky — motor groove, kevyt" },
  };

  // v4.28.0 backoffConfig-builderit — block-aware backoff kaikille kolmelle primaryille.
  // Tämä korvaa aiemmat null/numero-argumentit rakennetulla objektilla joka
  // eksplisiittisesti ilmaisee sekä % että block-phaseen sidotun tyylin.
  const tiBackoffRegular   = (pct) => ({ style: "regular",   pct });   // foundation
  const tiBackoffPaused    = (pct) => ({ style: "paused",    pct });   // strength
  const tiBackoffTempo     = (pct) => ({ style: "tempo",     pct });   // intensity
  const tiBackoffKisastyle = (pct) => ({ style: "kisastyle", pct });   // peaking/realization

  const weekPlans = [
    // ── BLOKKI 1: HYPERTROFIA + MU-tekniikka (vk 1–4) ──
    // Volyymiprogressio 4→5 sarjaa × 6 toistoa @ 65→72 % · V3→V2
    // v4.28.0 (L1): TI saa foundation-blokissa yleisen Takakyykky-backoffin (ei paused) —
    // motor pattern + hypertrofia, ei teknistä ylikuormitusta. Paused squat palaa strength-blokissa.
    { week:1, days:[
      maDay("MA — Leuka 4×6 @65%",        4,6,3, 0.65, null, null),
      tiDay("TI — Kyykky 4×6 @65%",       4,6,3, 0.65, null, undefined, tiBackoffRegular(0.52)),
      // v4.27.4: Foundation-blokissa dippi-päivälle pushAccPrehab (tempo+stretch+face pull)
      //          — pec-insertion- ja sternum-alueen kudoskapasiteetti ennen voima-blokkia.
      toDay("TO — Dippi 4×6 @65%",        4,6,3, 0.65, null, null, pushAccPrehab()),
      // v4.28.0 (M4): muNote poistettu, skill-struktuuri nyt laDay:n slot-rakenne itsestään
      laDay("LA — MU skill + etukyykky (eksentrinen + transition + räjähtävä)", 0, 5, null, null, FS.w1),
    ]},
    { week:2, days:[
      maDay("MA — Leuka 5×6 @68%",        5,6,3, 0.68, null, null),
      tiDay("TI — Kyykky 5×6 @68%",       5,6,3, 0.68, null, undefined, tiBackoffRegular(0.54)),
      toDay("TO — Dippi 5×6 @68%",        5,6,3, 0.68, null, null, pushAccPrehab()),
      laDay("LA — MU skill + etukyykky", 0, 5, null, null, FS.w2),
    ]},
    { week:3, days:[
      maDay("MA — Leuka 5×6 @72%",        5,6,2, 0.72, null, null),
      tiDay("TI — Kyykky 5×6 @72%",       5,6,2, 0.72, null, undefined, tiBackoffRegular(0.58)),
      toDay("TO — Dippi 5×6 @72%",        5,6,2, 0.72, null, null, pushAccPrehab()),
      laDay("LA — MU: ENSIMMÄINEN STRICT 🎯 + etukyykky", 0, 5, "🎯 Tavoite: ensimmäinen puhdas strict muscle-up (eksentrinen → full MU)", null, FS.w3),
    ]},
    { week:4, days:[
      maDay("MA — Deload 3×5 @55%",       3,5,4, 0.55, null, null),
      // Deload TI käyttää regular-backoffia (ei paused) — matala kuorma, motor pattern only
      tiDay("TI — Deload 3×5 @55%",       3,5,4, 0.55, null, undefined, tiBackoffRegular(0.44)),
      toDay("TO — Deload 3×5 @55%",       3,5,4, 0.55, null, null),
      // v4.27.15: AMRAP-kalibrointi. v4.28.0 (H3): Vk 4 on AMRAP-piste KOKO SYKLIN e1RM-
      // lähtötasolle (post-foundation, volyymin jälkeen matala CNS-velka → tolereoi
      // @85% AMRAPin). Vk 8 ja 12 käyttävät tarkoituksella top single -metodia (ks. ao.
      // viikkojen kommentit) koska niiden fatiikka-profiilit eroavat tarkasti.
      calibrationDay("Vk 4"),
    ]},

    // ── BLOKKI 2: VOIMA — Akkumulaatio (vk 5–8) ──
    // v4.25 P1-3: volyymi LASKEE hypertrofia-blokista voima-blokkiin (block-teoria):
    // vk 5: 4×4 @75% + backoff 3×5 @65% (strength-spec backoff)
    // vk 6: 4×4 @78% + backoff 3×5 @65%
    // vk 7: 4×4 @82% + backoff 3×5 @68% (EI top @88% — v4.28.0 H4: near-max density vähennetty
    //       5→4 session/6 viikossa; strength-piikki on 4×4@82 volyymin piikki, ei intensity-testi.
    //       Vk 8 väliteste @92% on luotettavampi e1RM-päivitys kuin duplikoitu vk 7 @88%.)
    // v4.28.0 (L1/M3): TI backoff = Paused squat 2s (sticking-point, strength-spec).
    //                  MA backoff grip-variation = Myötäoteveto (hauis-overload, strength-rotation).
    //                  TO backoff = Kapea ote -dippi (ojentaja-overload, strength-spec).
    { week:5, days:[
      maDay("MA — Leuka 4×4 @75%",        4,4,2, 0.75, 0.65, null, undefined, "myotaote"),
      tiDay("TI — Kyykky 4×4 @75%",       4,4,2, 0.75, null, undefined, tiBackoffPaused(0.60)),
      toDay("TO — Dippi 4×4 @75%",        4,4,2, 0.75, 0.65, null, undefined, "kapea"),
      laDay("LA — MU +2.5 kg + etukyykky", 2.5, 3, "Ensimmäinen painolla (+2.5 kg) — jos strict puhdas", 2, FS.w5),
    ]},
    { week:6, days:[
      maDay("MA — Leuka 4×4 @78%",        4,4,2, 0.78, 0.65, null, undefined, "myotaote"),
      tiDay("TI — Kyykky 4×4 @78%",       4,4,2, 0.78, null, undefined, tiBackoffPaused(0.62)),
      toDay("TO — Dippi 4×4 @78%",        4,4,2, 0.78, 0.65, null, undefined, "kapea"),
      laDay("LA — MU +2.5–5 kg + etukyykky", 2.5, 3, "+2.5 kg (tai +5 jos edellinen meni hyvin)", 2, FS.w6),
    ]},
    { week:7, days:[
      // v4.28.0 (H4): Vk 7 top single @88% POISTETTU kaikilta kolmelta — strength-blokin
      // piikki on volyymi-intensiteetti 4×4@82 (26 reps), ei near-max-test. Top @88%
      // oli duplikaatti vk 8 välitestille @92%. Vähentää near-max-sessioita 5→4 (vk 7–12).
      maDay("MA — Leuka 4×4 @82%",  4,4,2, 0.82, 0.68, null, undefined, "myotaote"),
      tiDay("TI — Kyykky 4×4 @82%", 4,4,2, 0.82, null, undefined, tiBackoffPaused(0.66)),
      toDay("TO — Dippi 4×4 @82%",  4,4,2, 0.82, 0.68, null, undefined, "kapea"),
      laDay("LA — MU +5 kg + etukyykky",      5, 3, "+5 kg — raskas viikko", 2, FS.w7),
    ]},
    { week:8, days:[
      // Deload + välitesti: top single @ 92 % rakentaa e1RM-näkymää ennen blokki 3:a.
      // Vx-target deloadissa 4 + top single RPE 8 → atleetti ei Vx0:aan.
      // v4.28.0 (H3): Miksi top single eikä AMRAP? Vk 8 on voima-blokin JÄLKEEN,
      // CNS-kuorma kertynyt 3 viikon raskaasta treenistä. AMRAP @85% tuottaisi
      // 4-8 heavy reps = 8-16 near-max-reps CNS-budjettiin päälle. Top single
      // on 1 rep @92% = minimaalinen CNS, tarkka e1RM-päivitys post-strength-blokki.
      maDay("MA — Deload + top single @92%", 3,3,4, 0.58, null, 0.92),
      // L1: deload-välitestissä ei paused backoffia — regular light volume
      tiDay("TI — Deload + top single @92%", 3,3,4, 0.58, 0.92, undefined, tiBackoffRegular(0.46)),
      toDay("TO — Deload + top single @92%", 3,3,4, 0.58, null, 0.92),
      laDay("LA — Deload",                0, 2, "Kevyt tekninen — lepo ennen blokki 3"),
    ]},

    // ── BLOKKI 3: INTENSIFIKAATIO (vk 9–12) ──
    // v4.25 P1-4: Vk 9 ei top singleä — 7 near-max-session 7 viikossa oli liikaa.
    // Vk 10 on ensimmäinen intensifikaation top @92%, vk 11 top @95% (ei 97%).
    // MEV-volyymia, intensiteetti rakentuu asteittain.
    // v4.28.0 (L1): TI backoff = Tempo squat 3s eksentrinen (ei paused) — intensity-blokissa
    //    eri CNS-stimulus kuin LA:n box squat (joka eliminoi stretch-refleksin kokonaan).
    //    Kaksi eri mutta toisiaan täydentävää sticking-point-ärsykettä samassa viikossa.
    // v4.28.0 (H5): Vk 9 muSets 4→3 — yhdenmukaistus muiden intensity-viikkojen kanssa,
    //    ei erillistä "bump" ilman perustelua. Intensifikaatio nostaa kuormaa, ei sarjoja.
    { week:9, days:[
      maDay("MA — Leuka 4×3 @85%",  4,3,1, 0.85, 0.70, null, undefined, "kilpaote"),
      tiDay("TI — Kyykky 4×3 @85%", 4,3,1, 0.85, null, undefined, tiBackoffTempo(0.68)),
      toDay("TO — Dippi 4×3 @85%",  4,3,1, 0.85, 0.70, null, undefined, "kilpaote"),
      // H5: 4→3 sarjaa (yhdenmukaistus vk 10-11 kanssa)
      laDay("LA — MU +7.5 kg + box squat", 7.5, 3, "+7.5 kg — intensifikaatio alkaa", 2, FS.w9),
    ]},
    { week:10, days:[
      maDay("MA — Leuka 4×3 @87% + top 92%",  4,3,1, 0.87, null, 0.92),
      tiDay("TI — Kyykky 4×3 @87% + top 92%", 4,3,1, 0.87, 0.92, undefined, tiBackoffTempo(0.70)),
      toDay("TO — Dippi 4×3 @87% + top 92%",  4,3,1, 0.87, null, 0.92),
      laDay("LA — MU +10 kg + box squat",     10, 3, "+10 kg", 2, FS.w10),
    ]},
    { week:11, days:[
      // v4.25 P1-5: 4×3 → 3×3 (Prilepin: 85–95% max 14 reps/sessio, optimal 10).
      // Top @97% → @95% (edelleen near-max, mutta CNS-palautuminen parempi vk 12:een).
      maDay("MA — Leuka 3×3 @90% + top 95%",  3,3,1, 0.90, null, 0.95),
      tiDay("TI — Kyykky 3×3 @90% + top 95%", 3,3,1, 0.90, 0.95, undefined, tiBackoffTempo(0.72)),
      toDay("TO — Dippi 3×3 @90% + top 95%",  3,3,1, 0.90, null, 0.95),
      laDay("LA — MU +12.5 kg (viim. raskas) + box squat", 12.5, 3, "+12.5 kg", 2, FS.w11),
    ]},
    { week:12, days:[
      // RPE9-testi: 2×2 @ kevyt, 1 × top @ 95 % RPE9. Tulos päivittää e1RM:n
      // jota vk 13–16 käyttää uudelleenkalibroidussa peaking-laskennassa.
      // v4.25: 97% → 95% (97% on RPE 9.5+, ei 9) — testi luotettavampi ja turvallisempi.
      // v4.28.0 (H3): Miksi RPE9 top single eikä AMRAP? Vk 12 on KISAA edeltävä
      // RPE-testi — tarkoitus on saada e1RM, jonka kehitys PEAK-kuormien laskentaan.
      // AMRAP tuottaisi 4-8 reps joka on liian pitkä lähellä kisaa. RPE9 single on
      // 1 rep ja antaa suoraan near-max-datapisteen kevyellä CNS-kuormalla.
      maDay("MA — Deload + RPE9 leuka testi 🎯",  2,2,4, 0.55, null, 0.95),
      // Deload-viikolla TI käyttää kevyttä regular-backoffia (ei paused/tempo)
      tiDay("TI — Deload + RPE9 kyykky testi 🎯", 2,2,4, 0.55, 0.95, undefined, tiBackoffRegular(0.44)),
      toDay("TO — Deload + RPE9 dippi testi 🎯",  2,2,4, 0.55, null, 0.95),
      laDay("LA — Kevyt aktivointi",              0, 2, "Lepo — kevyt liike"),
    ]},

    // ── BLOKKI 4: REALIZATION + TAPER (vk 13–16) ──
    // Huom: kuormat skaalautuvat AUTOMAATTISESTI vk 12:n RPE9-testissä
    // päivittyneen e1RM:n mukaan. Jos kehitys oli +3 %, peak 95 % = 0.98 × old_1RM.
    // v4.25 P1-6: Vk 13 backoff 3×3 @75 % POISTETTU — realization ei saa olla
    // volyymipiikki. Pidetään top single @93 % valinnaisena intensiteettiärsykkeenä.
    // v4.25 P1-11: Vk 13–15 saavat kevyet finisher-accessoryt ("alitreenattu"-tunne).
    // v4.28.0 (L1): TI peaking = Takakyykky kisastyle (EI paused!) — Zourdos 2016,
    //    Stone 2000: T-10 pv ennen kisaa ei teknisiä modifikaatioita. Competition-style
    //    motor groove ensisijainen, paused squat -spesifisyys tarpeeton.
    // v4.28.0 (H2): phase="peaking" → MA/TI/TO saavat tiivistetyn peaking-warmupin
    //    (singles-focused neural primer, ei hypertrofia-blokin laajaa prehabia).
    { week:13, days:[
      // Realization: 3×2 @92% V1 + finisher (ei pullAcc/pushAcc/lowerAcc).
      // Alkuperäinen vk 13 oli 3×2 @92% + backoff 3×3 @75% V2, mikä teki
      // realization-viikosta volyymipiikin — taperin logiikka rikki.
      // Evidenssi: Bosquet 2007 taper meta-analyysi, Stone 2000 block periodization.
      // v4.25 P1-6: backoff poistettu. Top @93% antaa intensiteettiärsykkeen fatiikattomasti.
      maDay("MA — Realization 3×2 @92% + finisher",       3,2,1, 0.92, null, 0.93, finisherAcc("taper-aktivointi"), undefined, "peaking"),
      // TI realization: kisastyle backoff 2×2 @74% — EI enää paused singles (vanha bugi)
      tiDay("TI — Realization kyykky 3×2 @92% + finisher", 3,2,1, 0.92, 0.93, finisherAcc("taper-aktivointi"), tiBackoffKisastyle(0.74), "peaking"),
      toDay("TO — Realization 3×2 @92% + finisher",       3,2,1, 0.92, null, 0.93, finisherAcc("taper-aktivointi"), undefined, "peaking"),
      laDay("LA — MU +15 kg + kisakyykky kevyt", 15, 3, "+15 kg — competition ready (3 sarjaa, ei 4)", 2, FS.w13),
    ]},
    { week:14, days:[
      // v4.25 P1-7: Peaking intensiteetti 97% → 93% (97% 12 pv ennen kisaa liian raskas,
      // Zourdos 2016 tapering, Stone 2000). Backoff poistettu. PR-yritys tulee kisapäivänä.
      // Finisher minimal = vain 1 slot, 2×12 kevyt.
      // v4.28.0 (L1): TI peaking = ei backoffia KOKONAAN (backoffConfig=null). Primary
      //    kisakyykky singles riittää — paused/tempo 10 pv ennen kisaa on motor-pattern-
      //    interferenssi. Samoin MA/TO = vain primary + finisher, ei backoffia.
      maDay("MA — Peaking 2×1 @93% + kevyt",       2,1,1, 0.93, null, null, finisherMinimal("kevyt"), undefined, "peaking"),
      tiDay("TI — Peaking kyykky 2×1 @93% + kevyt", 2,1,1, 0.93, null, finisherMinimal("kevyt"), null, "peaking"),
      toDay("TO — Peaking 2×1 @93% + kevyt",       2,1,1, 0.93, null, null, finisherMinimal("kevyt"), undefined, "peaking"),
      laDay("LA — MU opener rehearsal + kisakyykky kevyt", 15, 3, "Opener harjoitus +15 kg (V2 — tekniikka edellä)", 2, FS.w14),
    ]},
    { week:15, days:[
      // Taper: opener-harjoitus vk 15. Kuormat suhteessa atleetin nykyiseen
      // e1RM:ään. Opener = 88 %, "lämmittely" = 82 %.
      //
      // v4.25 P1-11: Finisher-slot (2×12 face pull V4) jokaiselle raskaalle
      // päivälle. Perustelu (user): "vk 13–15 pitää olla tukiliikkeitä,
      // muuten tulee alitreenattu tunne". Face pull V4 = ei lisäkuormaa,
      // scapular/rotator cuff aktivointi = parempaa kisavalmistautumista.
      // v4.28.0 (L2): Taper-viikon warmupit lisätty — taper on TUEN paikka, ei aukko.
      // Lyhyempi kuin hypertrofia/strength-warmup (alempi volyymi, low prehab),
      // mutta singles-focused neural primer säilyy.
      { dayOfWeek:1, dayType:"heavy", label:"MA — Taper opener-harjoitus",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely — kevyt" },
          { name: "Band pull-apart", desc: "1×12 — posterior delt" },
          { name: "Band external rotation", desc: "1×10 per puoli — rotator cuff" },
          { name: "Scapular hang", desc: "2×10 s — lapa-aktivaatio" },
          { name: "Räjähtävä leuka BW", desc: "3×1 maksimi nopeus — neural primer opener-singleille" },
          { name: "Warmup ramp", desc: "60% × 2 · 72% × 1 → workset (@82% lämmittely, @88% opener)" },
        ],
        slots:[
        { role:"primary",   category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, loadPct:0.82, suggestedLoadKg:seedL(0.82), note:"@82% = lämmittely", velocityStop:0.55, allowVelocityInput:true },
        { role:"secondary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, loadPct:0.88, suggestedLoadKg:seedL(0.88), note:"Opener @88%", competitionLift:true, velocityStop:0.50, allowVelocityInput:true },
        ...finisherMinimal("taper-aktivointi"),
      ]},
      { dayOfWeek:2, dayType:"heavy", label:"TI — Taper kyykky",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely" },
          { name: "Hip 90/90 + Cossack", desc: "30 s per puoli — lonkka-mobiliteetti" },
          { name: "Empty bar squat", desc: "1×5 — liikemallin herätys" },
          { name: "Warmup ramp", desc: "50% × 3 · 65% × 2 · 78% × 1 → workset (@85% lämmittely, @90% opener)" },
        ],
        slots:[
        { role:"primary",   category:"alaraaja", defaultMovementName:"Takakyykky",
          sets:1, reps:1, targetVx:3, loadPct:0.85, suggestedLoadKg:seedK(0.85), note:"@85%", isBarbell:true, velocityStop:0.45, allowVelocityInput:true },
        { role:"secondary", category:"alaraaja", defaultMovementName:"Takakyykky",
          sets:1, reps:1, targetVx:3, loadPct:0.90, suggestedLoadKg:seedK(0.90), note:"Opener @90%", isBarbell:true, competitionLift:true, velocityStop:0.40, allowVelocityInput:true },
        ...finisherMinimal("taper-aktivointi"),
      ]},
      { dayOfWeek:4, dayType:"heavy", label:"TO — Taper dippi",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely" },
          { name: "Band dislocations", desc: "1×10 — olka-mobiliteetti" },
          { name: "Band external rotation", desc: "1×10 per puoli — rotator cuff" },
          { name: "Scapular push-up", desc: "1×8 — serratus aktivaatio" },
          { name: "BW dippi", desc: "1×3 räjähtävä — neural primer" },
          { name: "Warmup ramp", desc: "60% × 2 · 72% × 1 → workset (@82% lämmittely, @88% opener)" },
        ],
        slots:[
        { role:"primary",   category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:1, reps:1, targetVx:3, loadPct:0.82, suggestedLoadKg:seedD(0.82), note:"@82%", velocityStop:0.55, allowVelocityInput:true },
        { role:"secondary", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:1, reps:1, targetVx:3, loadPct:0.88, suggestedLoadKg:seedD(0.88), note:"Opener @88%", competitionLift:true, velocityStop:0.50, allowVelocityInput:true },
        ...finisherMinimal("taper-aktivointi"),
      ]},
      { dayOfWeek:6, dayType:"volume", label:"LA — MU opener",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min kevyt" },
          { name: "Scapular pull-up", desc: "2×10 — lapa-aktivaatio" },
          { name: "False Grip hang", desc: "2×15 s — ranteiden asento" },
          { name: "Band dislocations", desc: "1×10 — olka-mobiliteetti MU:n lukitukseen" },
          { name: "Räjähtävä leuka BW", desc: "3×1 — maksimi nopeus, MU-vedon primer" },
          { name: "Band MU -harjoitus", desc: "2×1 — MU-liikemallin herätys kevyemmällä assistilla" },
        ],
        slots:[
        { role:"primary", category:"vertikaaliveto", defaultMovementName:"Muscle-up",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:5, note:"Opener +5 kg", competitionLift:true },
      ]},
    ]},
    { week:16, days:[
      { dayOfWeek:1, dayType:"heavy", label:"MA T-6 — Kevyt aktivointi",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min yleislämmittely" },
          { name: "Band pull-apart", desc: "1×12 — posterior delt" },
          { name: "Band dislocations", desc: "1×10 — olka-mobiliteetti" },
          { name: "Scapular hang", desc: "2×10 s — lapa-aktivaatio" },
          { name: "BW-leuka", desc: "1×3 kevyt — liikemallin herätys" },
          { name: "Warmup ramp", desc: "50% × 2 · 65% × 1 → workset (@75% RPE 6)" },
        ],
        slots:[
        { role:"primary",   category:"vertikaaliveto",   defaultMovementName:"Lisäpainoleuanveto",
          sets:2, reps:1, targetVx:4, loadPct:0.75, suggestedLoadKg:seedL(0.75), note:"75 % openerista — RPE 6", velocityStop:0.65, allowVelocityInput:true },
        { role:"accessory", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:2, reps:1, targetVx:4, loadPct:0.75, suggestedLoadKg:seedD(0.75), note:"75 % openerista", velocityStop:0.65, allowVelocityInput:true },
      ]},
      { dayOfWeek:2, dayType:"heavy", label:"TI T-5 — Kevyt kyykky",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min kevyt" },
          { name: "Hip 90/90 + Cossack", desc: "30 s per puoli — mobiliteetti" },
          { name: "Empty bar squat", desc: "1×5 — liikemallin herätys" },
          { name: "Warmup ramp", desc: "50% × 2 · 65% × 1 → workset (@78% RPE 6)" },
        ],
        slots:[
        { role:"primary", category:"alaraaja", defaultMovementName:"Takakyykky",
          sets:2, reps:1, targetVx:4, loadPct:0.78, suggestedLoadKg:seedK(0.78), isBarbell:true, note:"78 % openerista", velocityStop:0.55, allowVelocityInput:true },
      ]},
      // v4.25 P1-6 (user-agreed): TO T-3 -sessio oli 5–10 % liian kuormittava 72 h
      // ennen kisaa. 88 % → 85 %, MU 3×1 → 2×1. Zourdos 2016 tapering:
      // T-3 -session tarkoitus = neural priming, EI voimatestaus. 85 % riittää
      // "herättely"-efektiin mutta jättää CNS-varastot täyteen kisapäivään.
      { dayOfWeek:4, dayType:"heavy", label:"TO T-3 — Herättely + opener-rehearsal",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "2 min kevyt" },
          { name: "Band dislocations", desc: "1×10 — olka-mobiliteetti" },
          { name: "Band external rotation", desc: "1×10 per puoli — rotator cuff" },
          { name: "Scapular pull-up + push-up", desc: "1×5 kumpaakin — lapa-aktivaatio" },
          { name: "BW-leuka + BW-dippi", desc: "1×3 kumpaakin kevyt — liikemallien primer" },
          { name: "Warmup ramp", desc: "50% × 2 · 65% × 1 · 75% × 1 → workset" },
        ],
        slots:[
        { role:"primary",   category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, loadPct:0.80, suggestedLoadKg:seedL(0.80), note:"@80% lämmittely", velocityStop:0.55, allowVelocityInput:true },
        { role:"secondary", category:"vertikaaliveto", defaultMovementName:"Lisäpainoleuanveto",
          sets:1, reps:1, targetVx:3, loadPct:0.85, suggestedLoadKg:seedL(0.85), note:"Opener rehearsal @85% (EI openeri — liian lähellä kisaa)", competitionLift:true, velocityStop:0.50, allowVelocityInput:true },
        { role:"accessory", category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:1, reps:1, targetVx:3, loadPct:0.85, suggestedLoadKg:seedD(0.85), note:"Opener rehearsal @85%", velocityStop:0.50, allowVelocityInput:true },
        { role:"accessory", category:"vertikaaliveto", defaultMovementName:"Muscle-up",
          sets:2, reps:1, targetVx:null, suggestedLoadKg:5, note:"Opener practice (2 sarjaa, ei 3 — CNS-säästö)" },
      ]},
      // Kisapäivä: avauspainot realistisiksi. Opener 88 %, 2nd 96 %, 3rd 102 % —
      // tämä olettaa realistista ~2–5 % kehitystä, ei 10 %+. Jos kehitys on ollut
      // suurempi, vk 12:n RPE9-testi nostaa e1RM:n, ja kaikki lasketaan sen päälle.
      { dayOfWeek:7, dayType:"competition", label:"SU T-0 — KISA 🏆",
        warmup: [
          { name: "Hyppynaru / Jumping Jacks", desc: "3 min perusteellinen lämmittely — kisalämpö" },
          { name: "Band pull-apart + dislocations", desc: "1×15 kumpaakin — olkapäät ja lavat" },
          { name: "Hip 90/90 + Cossack", desc: "30 s per puoli — lonkat kisakyykkyyn" },
          { name: "Scapular pull-up / push-up", desc: "1×5 kumpaakin — lapa-aktivaatio" },
          { name: "Dynaaminen priming", desc: "BW-leuka 1×3 räjähtävä + BW-dippi 1×3 — CNS-primer" },
          { name: "Liikekohtainen ramp", desc: "Jokaisen liikkeen ramp erikseen: MU bändi → BW → +5, Leuka 50→65→80%, Dippi 50→65→80%, Kyykky 40→60→75→85% — kisaproto" },
        ],
        slots:[
        { role:"primary",   category:"vertikaaliveto",   defaultMovementName:"Muscle-up",
          sets:3, reps:1, targetVx:null, suggestedLoadKg:5, note:"1. Muscle-up — Opener +5 · 2nd +10 · 3rd +15 kg", competitionLift:true },
        { role:"secondary", category:"vertikaaliveto",   defaultMovementName:"Lisäpainoleuanveto",
          sets:3, reps:1, targetVx:null, loadPct:0.88, suggestedLoadKg:seedL(0.88),
          note:"2. Leuanveto — Opener 88% · 2nd 96% · 3rd 102% (laskettuna vk 12 RPE9-testissä)",
          competitionLift:true, attemptsPct:[0.88, 0.96, 1.02], allowVelocityInput:true },
        { role:"backoff",   category:"horisontaalityöntö", defaultMovementName:"Lisäpainodippi",
          sets:3, reps:1, targetVx:null, loadPct:0.88, suggestedLoadKg:seedD(0.88),
          note:"3. Dippi — Opener 88% · 2nd 96% · 3rd 102%",
          competitionLift:true, attemptsPct:[0.88, 0.96, 1.02], allowVelocityInput:true },
        { role:"accessory", category:"alaraaja",         defaultMovementName:"Takakyykky",
          sets:3, reps:1, targetVx:null, loadPct:0.90, suggestedLoadKg:seedK(0.90),
          note:"4. Kyykky — Opener 90% · 2nd 97% · 3rd 103%",
          competitionLift:true, isBarbell:true, attemptsPct:[0.90, 0.97, 1.03], allowVelocityInput:true },
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
    insertedDeloads: [], // [{ afterProgramWeek: N, invokedDateISO, reason }] — laajentaa kalenteripituutta
    replacedWithDeload: [], // [{ programWeek: N, invokedDateISO, reason }] — korvaa kyseisen vk:n kevennyksellä, ei pidennä
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
  MRV_SETS_PER_CATEGORY,
  CATEGORY_LABELS_SHORT,
  CATEGORY_COLORS,
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
  // Custom program generator (v4.27)
  generateCustomMesocycle,
  PRIMARY_CATEGORY_PROFILES,
  PRIMARY_SPECIFIC_PROFILES,
  GOAL_SKELETONS,
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
  // Auto-backup (v4.26.0)
  getBackupStatus,
  getLatestBackupSnapshot,
  getAllBackupSnapshots,
  createBackupSnapshot,
  maybeCreateWeeklyBackup,
  restoreFromSnapshot,
  // CSV
  parseCSV,
  importHistoricalCSV,
};
