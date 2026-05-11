# VAIHE_2B_alpha_SPECIFICATION.md
## Track B Vaihe 2B-α — Wizard → ohjelma -mapping (engine, ei UI)

**Versio:** v1.0 (2026-05-11)
**Status:** Spec-vaihe. Track B Vaihe 2B-α toteuttaa koodin pohjalta.
**Onnistumiskriteeri:** "Wizard-config + mainAppState → valid mesocycle-objekti
joka on yhteensopiva LeVeCoachDB.mesocycles-storen ja pää-app:in dashboardin
kanssa. Generaattori tuottaa identtisen tuloksen samoilla inputeilla
(deterministinen) ja perustuu RISTIINTARKISTETTUUN tutkimukseen."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET 2A → 2B-α
═══════════════════════════════════════════════════════════════

2A toi wizardin pää-sovelluksen käyttäjien ulottuville (onboarding-banneri,
Asetukset-kortti, migraatio-banneri). Wizard-vastaukset tallentuvat
LeVeWizardDB:hen mutta eivät vaikuta pää-app:in ohjelmaan.

2B-α luo **mapping-funktion** joka muuntaa 30 wizard-vastausta valid
mesocycle-objektiksi käyttäen pää-app:in olemassa olevaa
`generateCustomMesocycle()`-funktiota. EI vielä UI:ta eikä DB-kirjoituksia —
puhdas pure-function `mapWizardToMesocycle(wizardConfig, mainAppState)`.

2B-β (myöhemmin) lisää "Generoi ohjelma" -painikkeen Asetukset-näkymään,
preview-modaalin, ja `setActiveMesocycle`-kytkennän.

2B-γ (myöhemmin) lisää q26-PR:t → movementProgress -migraation ja
q30-energiabudjetti → volyymileikkauksen.

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

2B-α on **mapping-kerros** wizardConfig (30 vastausta) → custom-mesocycle.
Mapping perustuu 4 tutkimuspohjaiseen sääntöön + 1 heuristic:

| # | Sääntö | Tutkimus | Wizard-vaikutus |
|---|--------|----------|-----------------|
| 1 | Aloitusblokki Issurin Table V -residuaaleilla | Issurin 2008 (RISTIINTARKISTETTU) | q29_recentBlock → goal |
| 2 | Block-pituudet kvalitatiivisesti tier-pohjaisesti | Issurin 2010 + Petré 2021 (PDF) | q08_selfLevel → weekCount |
| 3 | Sex-modifier vain CT+lower-body -tilanteessa | Huiberts 2024 (PDF) | q02_sex + q15 → recoveryCapacity-säätö |
| 4 | Liikejärjestys MJ-before-SJ + priority-first | Nunes 2021 + ACSM 2009 | (Pää-app distributePrimariesToDays hoitaa) |
| - | Hypertrofia-residuaali ≥80% 1RM -säännöllä (heuristic) | Issurin-kategorioiden soveltaminen | q29_recentBlock="hypertrophy" tulkinta |

Generaattori palauttaa **valid mesocycle-objektin** joka voidaan tallentaa
LeVeCoachDB.mesocycles-storeen ja aktivoida `setActiveMesocycle`:llä.

═══════════════════════════════════════════════════════════════
1. INPUT — wizardConfig + mainAppState
═══════════════════════════════════════════════════════════════

### 1.1 wizardConfig (LeVeWizardDB.wizardConfigs)

```js
{
  wizardId: "wiz_xxx",
  schemaVersion: "3.3",
  completedAtISO: "2026-08-15T10:00:00Z",  // pitää olla != null!
  answers: {
    // Pakolliset käytössä:
    q01_age, q02_sex, q03_weight,
    q06_yearsTraining, q08_selfLevel, q09_sport,
    q11_injuries,                  // affect liikevalintoja (modify/absolute)
    q12_primaryGoal,               // affect goal-mappausta
    q14_cutting, q15_aerobicModality, q17_equipment,
    q21_splitPreference, q22_avoidedExercises,
    q23_volumePref, q24_frequency, q25_rpePrecision,
    q29_recentBlock,               // affect pickStartingBlock
    // Valinnaiset:
    q05_bodyfat, q07_autoregYears, q10_trainingBreakMonths,
    q13_secondaryGoal, q16_aerobicVolume,
    q18_hrvDevice, q19_vbtDevice, q20_sleepTracker,
    // 2B-α EI käytä näitä (jää 2B-γ:lle):
    q26_personalRecords,           // → 2B-γ: e1RM-migraatio
    q27_targetDate, q28_targetType, // → 2B-α (ohjelman pituuden ankkurointi)
    q30_energyBudget,              // → 2B-γ: volyymileikkaus
  }
}
```

### 1.2 mainAppState (LeVeCoachDB-snapshot, luku-vain)

```js
{
  canRead: boolean,
  hasMovementProgress: boolean,
  hasMesocycles: boolean,
  movementProgressData: [...],   // existing e1RM-baselines
  activeMesocycle: { ... } | null,
  allMovements: [...],            // pää-app movement-pankki
}
```

### 1.3 Validointi

Mapping kutsuu `validateMappingInput(wizardConfig, mainAppState)` ennen
muunnosta. Validointi tarkistaa:

- `wizardConfig.completedAtISO != null` (wizard valmis)
- `wizardConfig.schemaVersion === "3.3"`
- `wizardConfig.answers.q08_selfLevel` ∈ valid options
- `wizardConfig.answers.q09_sport` ∈ valid options
- `wizardConfig.answers.q29_recentBlock` ∈ valid options
- `wizardConfig.answers.q24_frequency.daysPerWeek` ∈ [1,7]
- `wizardConfig.answers.q24_frequency.sessionLengthMinutes` ∈ [15,240]

Palauttaa `{ valid: bool, errors: [{ reason, qid }] }`. Jos invalid,
mapping HEITTÄÄ `Error` joka napataan 2B-β:n UI-puolella.

═══════════════════════════════════════════════════════════════
2. OUTPUT — generateCustomMesocycle-yhteensopiva input
═══════════════════════════════════════════════════════════════

Mapping palauttaa **OBJEKTIN joka annetaan suoraan
`generateCustomMesocycle(answers, startDateISO)`:lle**:

```js
{
  goal: "hypertrofia" | "maksimivoima" | "yhdistelma" | "undulating",
  primaries: [{ name, category }],
  daysPerWeek: 1-7,
  weekCount: 2-16,
  recoveryCapacity: "hyva" | "keski" | "heikko",
  preferredDaysOfWeek: [0-6, ...] | null,
  customLabel: "Räätälöity: <wizard 3.3>",
  startDateISO: "YYYY-MM-DD",  // q27 ankkuroitu jos annettu
  // 2B-α-spesifit metadata-kentät (kulkee mesocycleen.customConfig:iin):
  _wizardMeta: {
    wizardId, schemaVersion, sourceVersion: "2B-α-v1.0",
    pickedStartingBlock: "hypertrofia",      // Issurin-perusteinen
    blockLengthRationale: "advanced-tier",   // Petré-kvalitatiivinen
    sexModifierApplied: false,               // Huiberts-kapea
    rules: [
      { rule: "Issurin Table V residual: maximal_strength 30±5 vrk",
        status: "RISTIINTARKISTETTU", source: "Issurin 2008/Issurin & Lustig 2004" },
      { rule: "Block length advanced-tier 4-4-3-2-1",
        status: "KVALITATIIVINEN", source: "Issurin 2010 + Petré 2021" },
      // ...
    ]
  }
}
```

Lopullisen mesocycle-objektin tuottaa pää-app:in `generateCustomMesocycle()`.
2B-α EI luo mesocycle-objektia suoraan — vain mapping-input.

═══════════════════════════════════════════════════════════════
3. ALGORITMI VAIHEITTAIN
═══════════════════════════════════════════════════════════════

### Vaihe 1: pickStartingBlock(q29_recentBlock, daysSinceLastBlock?)

**Tutkimuspohja:** Issurin Table V residuaalit (RISTIINTARKISTETTU)

```js
const RESIDUAL_DAYS = {
  // Päivissä — Issurin & Lustig 2004 / Issurin 2008 Table V
  aerobic_endurance:    { mean: 30, sd: 5 },
  maximal_strength:     { mean: 30, sd: 5 },
  anaerobic_glycolytic: { mean: 18, sd: 4 },
  strength_endurance:   { mean: 15, sd: 5 },
  maximal_speed:        { mean: 5,  sd: 3 },
};

function pickStartingBlock(q29, q12_primaryGoal) {
  // Mappaus q29 → Issurin-kategoria
  const blockToCategory = {
    hypertrophy:     "strength_endurance",   // K1: ≥80% 1RM exception below
    strength:        "maximal_strength",
    intensification: "maximal_strength",
    peaking:         "maximal_speed",
    deload:          null,                    // tyhjä residuaali
    off_program:     null,
  };
  const cat = blockToCategory[q29];

  // Päätä uusi blokki kategorian ja tavoitteen perusteella:
  if (q29 === "peaking" || q29 === "deload" || q29 === "off_program") {
    // Peakingin/deloadin/off_programin jälkeen → aloita hypertrofialla
    // turvallisuussyistä (Issurin block-malli)
    return "hypertrofia";
  }
  if (q29 === "hypertrophy") {
    // Hypertrofiasta seuraava on tyypillisesti voima/maksimi
    return q12_primaryGoal === "max_1RM" || q12_primaryGoal === "powerlifting"
      ? "maksimivoima"
      : "yhdistelma";
  }
  if (q29 === "strength") {
    // Voimasta intensifikaatioon — pää-app:issa "yhdistelma" sis. intensiteettiä
    return q12_primaryGoal === "max_1RM" ? "maksimivoima" : "yhdistelma";
  }
  if (q29 === "intensification") {
    // Intensifikaation jälkeen peaking — pää-app:n peaking-template hoitaa
    // (mutta peaking on erillinen mesocycle-tyyppi, ei custom-goal)
    // → palauta "maksimivoima" + lyhyt weekCount
    return "maksimivoima";
  }
  return "yhdistelma"; // turvallinen default
}
```

**Heuristic-sääntö K1** (≥80% 1RM-tarkennus):
- Wizardissa EI kysytä mikä %1RM hypertrofia-blokki oli. Sääntö on
  konservatiivinen: tulkita q29="hypertrophy" "strength_endurance"-kategoriaksi
  (= 15±5 vrk residuaali). Tämä on _Issurin-kategorioiden soveltaminen_.
- Vaihtoehto: jos q12_primaryGoal viittaa max-voimaan (max_1RM, powerlifting,
  streetlifting_with_explosive_components), aletaan suoraan
  maksimivoima-blokilla — vrt. Issurin block-malli. Tämä päätös on Vaiheen 1
  koodissa eksplisiittinen.

### Vaihe 2: pickBlockLengths(q08_selfLevel) — weekCount

**Tutkimuspohja:** Petré 2021 (PDF-VERIFIOITU kvalitatiivinen) + Issurin 2010

```js
function pickWeekCount(q08_selfLevel, pickedBlock) {
  // Kvalitatiiviset blokki-pituudet — Petré 2021 tukee advanced-suuremmalla
  // interferenssillä, Issurin 2010 block-malli tukee yleistä rakennetta.
  // EI numeerisia progressio-kertoimia — vain pituudet jotka empiirisesti
  // sopivat tasoille.
  const lengthByTier = {
    beginner:     { hypertrofia: 8, maksimivoima: 4, yhdistelma: 6,  undulating: 4 },
    intermediate: { hypertrofia: 6, maksimivoima: 4, yhdistelma: 4,  undulating: 4 },
    advanced:     { hypertrofia: 4, maksimivoima: 4, yhdistelma: 4,  undulating: 4 },
    elite:        { hypertrofia: 4, maksimivoima: 4, yhdistelma: 4,  undulating: 4 },
  };
  return lengthByTier[q08_selfLevel]?.[pickedBlock] || 4;
}
```

**Kvalitatiivinen perustelu** (KOMMENTTI koodissa):
- Beginner saa pidemmän hypertrofia-blokin (8 vk) koska tekniikka + lihasrakenne
  rakentuu hitaammin. Petré: untrained ES ≈ 0 → ei vaaraa interferenssistä.
- Intermediate keskitaso (6 vk hypertrofia, 4 vk maksimi).
- Advanced/elite lyhyemmät blokit (4 vk) koska Petré ES = −0.35 / −0.66
  same-session → tarvitsee enemmän vaihtelua. Lyhyt blokki + uusi ärsyke =
  vähemmän stagnaatio-riskiä.

**EI numeerista progressio-kerrointa K2:n päätöksen mukaan.**

### Vaihe 3: pickRecoveryCapacity(q02_sex, q15, q08, q23)

**Tutkimuspohja:** Huiberts 2024 (PDF) + Petré 2021 + q23-volume-pref

```js
function pickRecoveryCapacity(answers) {
  const hasCT = answers.q15_aerobicModality !== "none";
  const isMale = answers.q02_sex === "male";
  const isAdvancedPlus = ["advanced", "elite"].includes(answers.q08_selfLevel);
  const volumePref = answers.q23_volumePref;

  // Sex-modifier: vain CT + male + advanced kohdassa interferenssi merkitsevä
  // (Huiberts 2024: SMD −0.43 lower-body strength, vain miehillä, vain CT-skenaariossa)
  if (hasCT && isMale && isAdvancedPlus) {
    return "heikko"; // alentaa accessory-volyymin recoveryScalar 0.70:llä
  }

  // q23 volume-preference primary signaali:
  if (volumePref === "MEV") return "heikko";
  if (volumePref === "MRV") return "hyva";
  if (volumePref === "MAV") return "keski";

  // "auto" + q08:n kanssa:
  if (isAdvancedPlus) return "hyva";
  return "keski";
}
```

**Note:** Huiberts-modifier on KAPEA — applicable vain:
- atletti tekee concurrent training (q15 != "none")
- ATLETTI ON MIES (q02_sex === "male")
- atletti on advanced/elite (q08 == "advanced" tai "elite")

Akselin tapauksessa: q15 = "none" (streetlifting-pää, ei juoksua) →
Huiberts-modifier EI sovellu → "keski" (q23="MAV" pohjalta) tai "hyva".

### Vaihe 4: pickPrimaries(q09_sport, q12_primaryGoal, q11_injuries, q17_equipment)

```js
function pickPrimaries(answers, mainAppMovements) {
  // Lähtökohta: päälaji määrää default-primaryt
  const SPORT_DEFAULTS = {
    streetlifting: [
      { name: "Lisäpainoleuanveto", category: "vertikaaliveto" },
      { name: "Lisäpainodippi",     category: "horisontaalityöntö" },
      { name: "Takakyykky",         category: "alaraaja" },
      { name: "Muscle-up",          category: "vertikaaliveto" },
    ],
    powerlifting: [
      { name: "Penkkipunnerrus", category: "horisontaalityöntö" },
      { name: "Takakyykky",      category: "alaraaja" },
      { name: "Maastaveto",      category: "lonkkahingaus" },
    ],
    hypertrophy:  [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }],
    sport:        [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }],
    hybrid:       [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }],
  };
  let primaries = SPORT_DEFAULTS[answers.q09_sport] || SPORT_DEFAULTS.hybrid;

  // q11_injuries: poista absolute-rajoittuneet liikkeet
  // (modify ei poista — säilytetään, käyttäjä mukauttaa itse pää-app:in puolella)
  if (Array.isArray(answers.q11_injuries)) {
    const absoluteAreas = answers.q11_injuries
      .filter(i => i.type === "absolute")
      .map(i => i.area.toLowerCase());
    primaries = primaries.filter(p => {
      const nameL = p.name.toLowerCase();
      // Konservatiivinen mapping: jos vamma-alue mainitsee "olka" tai "rinta" →
      // poista bench/dip-tyyppiset; "polvi" → poista kyykky-tyyppiset; jne.
      if (absoluteAreas.some(a => a.includes("olka")) &&
          (nameL.includes("dippi") || nameL.includes("punnerrus"))) return false;
      if (absoluteAreas.some(a => a.includes("polvi") || a.includes("nivel")) &&
          (nameL.includes("kyykky") || nameL.includes("squat"))) return false;
      if (absoluteAreas.some(a => a.includes("selk") || a.includes("alaselk")) &&
          (nameL.includes("maavet") || nameL.includes("deadlift"))) return false;
      return true;
    });
  }

  // q22_avoidedExercises: poista kategorisesti
  if (Array.isArray(answers.q22_avoidedExercises) && answers.q22_avoidedExercises.length > 0) {
    primaries = primaries.filter(p => !answers.q22_avoidedExercises.some(
      ae => p.name.toLowerCase().includes(ae.toLowerCase())
    ));
  }

  // q17_equipment: poista liikkeet jotka vaativat puuttuvan kaluston
  // (esim. ei tankoa → ei takakyykkyä; ei leukatangoa → ei lisäpainoleuanvetoa)
  const eq = new Set(answers.q17_equipment || []);
  primaries = primaries.filter(p => {
    if (p.name === "Lisäpainoleuanveto" && !eq.has("pullup_bar")) return false;
    if (p.name === "Lisäpainodippi"     && !eq.has("dip_station")) return false;
    if ((p.name === "Takakyykky" || p.name === "Penkkipunnerrus" || p.name === "Maastaveto")
        && !eq.has("barbell_rack")) return false;
    if (p.name === "Muscle-up" && !eq.has("pullup_bar")) return false;
    return true;
  });

  // Fallback: jos kaikki poistettu, pidä yksi turvallinen liike
  if (primaries.length === 0) {
    primaries = [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }];
  }

  return primaries;
}
```

### Vaihe 5: pickPreferredDaysOfWeek(q24_frequency)

```js
function pickPreferredDaysOfWeek(q24_frequency) {
  const days = q24_frequency?.daysPerWeek;
  if (!days || days < 1) return null;
  // Standardi-jakaumat ml. lepopäivät:
  if (days === 2) return [1, 4];                // Ti, Pe
  if (days === 3) return [1, 3, 5];             // Ti, To, La
  if (days === 4) return [1, 2, 4, 5];          // Ti, Ke, Pe, La
  if (days === 5) return [1, 2, 4, 5, 6];       // Ti, Ke, Pe, La, Su
  if (days === 6) return [0, 1, 2, 4, 5, 6];    // Ma, Ti, Ke, Pe, La, Su
  if (days === 7) return [0, 1, 2, 3, 4, 5, 6];
  return null;
}
```

### Vaihe 6: applyTargetDate(q27_targetDate, weekCount)

Jos `q27_targetDate` on annettu, lasketaan weekCount niin että viimeinen
viikko osuu kisapäivän viikolle. Tämä **YLIKIRJOITTAA** Vaiheen 2:n
pickWeekCount-tuloksen jos q27 on annettu.

```js
function applyTargetDateAnchor(weekCountFromTier, q27_targetDate, startDateISO) {
  if (!q27_targetDate) return { weekCount: weekCountFromTier, anchored: false };
  const start = new Date(startDateISO);
  const target = new Date(q27_targetDate);
  const diffWeeks = Math.floor((target.getTime() - start.getTime()) / (7 * 86400000));
  if (diffWeeks < 2) {
    // Liian lähellä — käytä tier-pohjaista ja varoita
    return { weekCount: Math.max(2, weekCountFromTier), anchored: false,
             warning: "Kisapäivä liian lähellä — käytetään tier-pohjaista pituutta" };
  }
  return { weekCount: Math.min(diffWeeks, 16), anchored: true };
}
```

### Vaihe 7: composeMappingResult

```js
export function mapWizardToMesocycle(wizardConfig, mainAppState) {
  const errors = validateMappingInput(wizardConfig, mainAppState);
  if (!errors.valid) throw new Error(`mapWizardToMesocycle: ${errors.errors[0].reason}`);
  const a = wizardConfig.answers;

  const startDateISO = todayISO();
  const goal = pickStartingBlock(a.q29_recentBlock, a.q12_primaryGoal);
  let weekCount = pickWeekCount(a.q08_selfLevel, goal);
  const { weekCount: wAnchored, anchored, warning } = applyTargetDateAnchor(weekCount, a.q27_targetDate, startDateISO);
  weekCount = wAnchored;

  const recoveryCapacity = pickRecoveryCapacity(a);
  const primaries = pickPrimaries(a, mainAppState?.allMovements || []);
  const preferredDaysOfWeek = pickPreferredDaysOfWeek(a.q24_frequency);

  return {
    // generateCustomMesocycle-yhteensopivat parametrit:
    goal, primaries, daysPerWeek: a.q24_frequency?.daysPerWeek || 3,
    weekCount, recoveryCapacity, preferredDaysOfWeek,
    customLabel: `Räätälöity wizardilla (${goal}, ${weekCount} vk, ${primaries.length} liiketta)`,
    startDateISO,
    // 2B-α metadata kulkee mesocycle.customConfig._wizardMeta:han:
    _wizardMeta: {
      wizardId: wizardConfig.wizardId,
      wizardSchemaVersion: wizardConfig.schemaVersion,
      mapperVersion: "2B-α-v1.0",
      pickedStartingBlock: goal,
      blockLengthRationale: a.q08_selfLevel + "-tier",
      sexModifierApplied: recoveryCapacity === "heikko" && a.q15_aerobicModality !== "none" && a.q02_sex === "male",
      targetDateAnchored: anchored,
      targetDateWarning: warning || null,
      rules: collectAppliedRules(a, goal, weekCount, recoveryCapacity),
    },
  };
}
```

═══════════════════════════════════════════════════════════════
4. PÄÄTÖSKOHDAT — TUTKIMUSPOHJAN TILA
═══════════════════════════════════════════════════════════════

| Päätöskohta | Tutkimusstatus | 2B-α toteutuksessa |
|-------------|----------------|---------------------|
| #1 pickStartingBlock | RISTIINTARKISTETTU (Issurin Table V) | Vaihe 1, suora käyttö |
| #2 applySexModifier  | PDF-VERIFIOITU kapea (Huiberts) | pickRecoveryCapacity (CT+male+lower-body) |
| #3 applyTrainingStatusModifier | PDF-VERIFIOITU kvalitatiivinen (Petré) | pickWeekCount (block-pituudet) + pickRecoveryCapacity (advanced) |
| #4 orderMovementsInSession | RISTIINTARKISTETTU (Nunes + ACSM) | Delegoidaan pää-app:in `distributePrimariesToDays`:lle |

**Päätöskohta #4 ei vaadi 2B-α:lta uutta koodia** koska pää-app:in
`distributePrimariesToDays` jakaa primaryt päivittäisille slot:eille kategoria-
roolien (vertikaaliveto, horisontaalityöntö jne.) perusteella. Single-joint
accessoryt ovat skeleton-mesocyclen sisällä JÄLKEEN primaryjen (MJ-before-SJ
toteutuu automaattisesti).

═══════════════════════════════════════════════════════════════
5. HEURISTISET OLETUKSET (eksplisiittinen ei-tutkimuspohjainen merkkaus)
═══════════════════════════════════════════════════════════════

Seuraavat säännöt EIVÄT ole tutkimuspohjaisia mutta ovat välttämättömiä
toteutukselle. Merkitään koodikommentilla `// HEURISTIC — ei tutkimuspohjainen`:

1. **q11_injuries-mappaus** (absolute-rajoitukset → primary-suodatus):
   keyword-haku ("olka"/"polvi"/"selk") on heuristinen.
   Vaihtoehto: 2B-γ:ssa rakennetaan tarkempi injury-to-movement-mapping.

2. **q17_equipment-puuttuva-kaluston-tarkistus**:
   Lisäpainoleuanveto vaatii pullup_bar:n on triviaali, mutta liikkeen
   määritelmissä ei ole formal "requires"-kenttää → keyword-pohjainen.

3. **Hypertrofia → strength_endurance -tulkinta** (K1):
   Wizardissa ei kysytä %1RM-tasoa hypertrofia-blokille. Sääntö:
   - q29="hypertrophy" + q12 sis. "maksimi"/"voima" → maksimivoima-aloitus
   - muutoin → yhdistelma-aloitus
   Tämä on Issurin-kategorioiden soveltaminen, ei keksitty luku.

4. **Block-pituudet kvalitatiivisesti** (K2):
   `lengthByTier`-taulukko on heuristic — Petré ei anna numeerisia pituuksia.

═══════════════════════════════════════════════════════════════
6. UNIT-TESTIT — käytännön kattavuus
═══════════════════════════════════════════════════════════════

Testit ajetaan node-pohjaisesti (kuten 1D:n logiikkatestit). Tiedosto:
`wizard/wizard-2b-mapper.test.js` (manuaalisesti ajettava, ei automaattinen
CI). Selaimessa lisätään testit `__wizardSelfTest()`-kokoelmaan.

**Pakolliset testit (vähintään 30):**

A. pickStartingBlock-testit (kaikki q29-arvot × eri q12):
- q29="peaking" → "hypertrofia" (turvallisuussyistä)
- q29="deload" → "hypertrofia"
- q29="off_program" → "hypertrofia"
- q29="hypertrophy" + q12="max_1RM" → "maksimivoima"
- q29="hypertrophy" + q12="hypertrophy" → "yhdistelma"
- q29="strength" + q12="powerlifting" → "maksimivoima"
- q29="intensification" + q12="streetlifting_with_explosive_components" → "maksimivoima"

B. pickWeekCount-testit:
- beginner + hypertrofia → 8
- intermediate + hypertrofia → 6
- advanced + hypertrofia → 4
- elite + maksimivoima → 4
- advanced + yhdistelma → 4

C. pickRecoveryCapacity-testit:
- q02="male" + q15="running" + q08="elite" → "heikko" (Huiberts)
- q02="female" + q15="running" + q08="elite" → q23-pohjainen (ei Huiberts)
- q02="male" + q15="none" + q08="elite" + q23="MAV" → "keski" (ei CT, ei Huiberts)
- q23="MEV" → "heikko"
- q23="MRV" → "hyva"
- q23="auto" + q08="elite" → "hyva"

D. pickPrimaries-testit:
- q09="streetlifting" + q17 sis. all → 4 primaries
- q09="streetlifting" + q11=[absolute olkapää] → poistaa dippi
- q09="powerlifting" + q22=["maastaveto"] → poistaa maastaveto
- q09="streetlifting" + q17 ei sis. pullup_bar → poistaa lisäpaino-leuanveto + muscle-up
- Kaikki poistettu → fallback Lisäpainoleuanveto

E. pickPreferredDaysOfWeek-testit:
- 3 → [1,3,5]
- 4 → [1,2,4,5]
- 0 → null
- 8 → null

F. applyTargetDateAnchor-testit:
- q27=undefined → ei muutosta
- q27=14 päivän päässä → diffWeeks=2 → 2 vk (anchored)
- q27=8 viikon päässä → 8 vk (anchored)
- q27=20 viikon päässä → 16 vk (cap)
- q27=10 päivän päässä → warning (alle 2 vk)

G. Päästä-päähän-skenaariot:
- **Akselin profiili** (intensification, advanced, streetlifting,
  q15=none, q14=no, q21=upper_lower, q24=4 päivää): output goal=maksimivoima,
  weekCount=4, recoveryCapacity=keski/hyva, primaries=4
- **Uusi käyttäjä** (off_program, beginner, streetlifting, q14=no,
  q24=3 päivää): output goal=hypertrofia, weekCount=8, recoveryCapacity=keski
- **Female + CT-skenaario** (q02=female, q15=running, q08=advanced):
  recoveryCapacity EI = "heikko" Huiberts-säännön mukaan
- **Vamma-skenaario** (q11=[absolute polvi]): kyykky poistuu primaryista

═══════════════════════════════════════════════════════════════
7. RAJOITTEET
═══════════════════════════════════════════════════════════════

1. **2B-α EI kirjoita LeVeCoachDB:hen.** Pure-function: input → output. 2B-β
   tallentaa mesocyclen + setActiveMesocycle.
2. **2B-α EI kirjoita movementProgress:iin.** Q26-PR:t käsitellään 2B-γ:ssa.
3. **2B-α EI muokkaa wizard-tiedostoja eikä pää-app:in tiedostoja
   (engine.js, index.html, sw.js, test-runner.js).** Pelkkä uusi tiedosto
   `wizard/wizard-2b-mapper.js` lisätään.
4. **Sovellusversio v4.39.0 säilyy** — 2B-α on uusi mapping-funktio joka ei
   ole vielä kytketty UI:hin → ei käyttäjälle näkyvää muutosta → ei
   APP_VERSION-bumppia ennen 2B-β:tä.
5. **Vain `wizardConfig.schemaVersion === "3.3"` tuetaan.** v3.2-configit pitää
   migroida 3.3:ksi (wizard-data.js:n migrateWizardV32ToV33 hoitaa).

═══════════════════════════════════════════════════════════════
8. RAJAPINTA pää-appiin (2B-β:n pohja)
═══════════════════════════════════════════════════════════════

Uuteen tiedostoon `wizard/wizard-2b-mapper.js`:

```js
// Exports
export {
  mapWizardToMesocycle,
  validateMappingInput,
  // Apurit testattaviksi yksikkötesteissä:
  pickStartingBlock,
  pickWeekCount,
  pickRecoveryCapacity,
  pickPrimaries,
  pickPreferredDaysOfWeek,
  applyTargetDateAnchor,
  // Vakiot:
  RESIDUAL_DAYS,
  // Self-test:
  selfTestMapper,
};
```

Imports:
- `wizard-schema.js` (validointi, kysymys-skeema)
- `wizard-data.js` (createEmptyWizardConfig vain testikäyttöön)
- EI importoi `data.js`:ää (= pää-app) — riippuvuus käännetään ympäri,
  pää-app importoi mapperia 2B-β:ssa.

**Käyttöesimerkki (2B-β tekee tämän):**
```js
// Asetuksissa "Generoi ohjelma" -painike:
import { mapWizardToMesocycle } from "./wizard/wizard-2b-mapper.js";
import { generateCustomMesocycle } from "./data.js";

const config = await getActiveWizardConfig();
const mainAppState = { /* movementProgressData, mesocycles, allMovements */ };
const mapped = mapWizardToMesocycle(config, mainAppState);
const mesocycle = generateCustomMesocycle(mapped, mapped.startDateISO);
// Liitä metadata:
mesocycle.customConfig._wizardMeta = mapped._wizardMeta;
// Näytä preview-modaali → "Aktivoi" → saveMesocycle + setActiveMesocycle.
```

═══════════════════════════════════════════════════════════════
9. ROADMAP — VAIHE 2B-α (~4-6h)
═══════════════════════════════════════════════════════════════

**T1: validateMappingInput**
- Tarkistaa wizardConfig + mainAppState validity
- Palauttaa virheet jos puutteita

**T2: pickStartingBlock + RESIDUAL_DAYS-vakiot**
- Issurin Table V (5 ominaisuutta) → JS-vakio
- Päätöslogiikka q29 + q12 → goal

**T3: pickWeekCount**
- lengthByTier-taulukko
- Block-pituudet kvalitatiivisesti

**T4: pickRecoveryCapacity**
- Huiberts CT-male-lower-body -tarkistus
- q23-volume-pref pohjana

**T5: pickPrimaries**
- SPORT_DEFAULTS-taulukko
- q11_injuries + q22_avoidedExercises + q17_equipment -suodatukset

**T6: pickPreferredDaysOfWeek + applyTargetDateAnchor**

**T7: composeMappingResult (mapWizardToMesocycle main function) + _wizardMeta**

**T8: selfTestMapper (~30 testiä) + manuaaliset testit selaimessa**

**T9: commit + push**

═══════════════════════════════════════════════════════════════
10. HYVÄKSYMISKRITEERIT — VAIHE 2B-α
═══════════════════════════════════════════════════════════════

1. `node --check wizard/wizard-2b-mapper.js` OK
2. `selfTestMapper()` 30+ checkin vihreänä
3. Pää-sovellus 100% koskematon (`git diff main -- engine.js data.js index.html sw.js test-runner.js` tyhjä)
4. Wizard 1A-1D 100% koskematon (`git diff main -- wizard/wizard-{schema,data,core,sw,styles,movement-bank,html}*` tyhjä)
5. 2A-toteutus (data.js detection-funktiot + index.html banneri) 100% koskematon
6. mapWizardToMesocycle(config, state) palauttaa OBJEKTIN, ei mesocyclea
   suoraan — pelkkä generateCustomMesocycle-input
7. _wizardMeta sisältää: wizardId, wizardSchemaVersion, mapperVersion,
   pickedStartingBlock, blockLengthRationale, sexModifierApplied, rules[]
8. Akselin testi-skenaario tuottaa odotetun output:n (vk-määrä 4,
   goal "maksimivoima", 4 primaries, recoveryCapacity "keski"/"hyva")
9. Uuden käyttäjän testi-skenaario tuottaa odotetun output:n (vk-määrä 8,
   goal "hypertrofia", 1 primary fallback, recoveryCapacity "keski")
10. Generaattori on **deterministinen** — sama input → sama output joka kerta
11. Sovellusversio v4.39.0 säilyy

═══════════════════════════════════════════════════════════════
11. KIELLETYT (laajennetut 1D:n säännöt)
═══════════════════════════════════════════════════════════════

1. **Älä lisää uutta numeraalista kynnystä ilman primäärilähde-verifikaatiota.**
   Issurin Table V on RISTIINTARKISTETTU. Petré-blokki-pituudet ovat
   kvalitatiivisia heuristisia oletuksia jotka MUST merkitä
   `// HEURISTIC — ei tutkimuspohjainen, Petré tukee kvalitatiivisesti`.
2. **Älä kirjoita LeVeCoachDB:hen tai movementProgress:iin 2B-α:ssa.**
   Pure-function: input → output. 2B-β + 2B-γ tekevät DB-kirjoitukset.
3. **Älä muokkaa data.js:n generateCustomMesocycle-funktiota tai
   skeleton-factoryja.** 2B-α käyttää niitä BLACK BOX:nä.
4. **Älä lisää uusia kysymyksiä wizardiin.** 3.3 on lukko.
5. **Älä lisää numeerisia tier-kerroin-arvoja** (esim. `1.0 / 0.5 / 0.25 /
   0.15`-tyyppisiä) — K2:n päätös: jätä pois 2B-α:sta.
6. **Älä lisää sex-modifieria muihin skenaarioihin kuin CT+male+advanced**
   (Huiberts 2024 ei tue niitä).
7. **Älä viittaa tutkijoihin UI-stringeissä.** "Helms 2014", "Petré 2021"
   yms. vain koodikommenteissa, EI customLabel:ssa eikä _wizardMeta.rules:ssa
   joka voi näkyä käyttäjälle.
8. **Älä lisää PMC12885173-viittausta — se on Zhang Feng et al. 2025**, ei
   Liu Y. Korvaava lähde Nunes 2021 + ACSM 2009 (RTKV-dokumenttiin viitatessa).
9. **Älä käytä Huiberts 2024:lle DOI:ta 10.1007/s40279-023-01978-y** — se on
   eri paperi. Oikea DOI: 10.1007/s40279-023-01943-9.
10. **Kolmas paikkaus = signaali refaktoroida.** Sama kuri kuin 1A-1D.

═══════════════════════════════════════════════════════════════
12. AKSELIN POLKU 2B-α:n jälkeen
═══════════════════════════════════════════════════════════════

Lähtötilanne: 16-viikon streetlifting-meso päättynyt, Akseli on tehnyt
wizardin loppuun (vastannut ~22 kysymystä — q26 + q29 skipattu mainAppState:n
takia jos siellä on aktiivinen meso; mutta kun meso on päättynyt, q29 EI
ehkä skippaa).

Wizard-vastaukset (Akseli):
- q08 = "elite", q09 = "streetlifting", q12 = "streetlifting_with_explosive_components"
- q14 = "no" (ei cut), q15 = "none" (ei juoksua)
- q21 = "upper_lower", q24 = { daysPerWeek: 4, sessionLengthMinutes: 90 }
- q23 = "MAV", q25 = "vara_calibrated"
- q29 = "peaking" (juuri päättynyt streetlifting_16w peaking-vaihe)

`mapWizardToMesocycle()` palauttaa:
```js
{
  goal: "hypertrofia",         // peakingin jälkeen aloita hypertrofialla
  primaries: [
    { name: "Lisäpainoleuanveto", category: "vertikaaliveto" },
    { name: "Lisäpainodippi",     category: "horisontaalityöntö" },
    { name: "Takakyykky",         category: "alaraaja" },
    { name: "Muscle-up",          category: "vertikaaliveto" },
  ],
  daysPerWeek: 4,
  weekCount: 4,                 // advanced/elite-tier hypertrofialle
  recoveryCapacity: "hyva",     // q23=MAV + elite ilman CT
  preferredDaysOfWeek: [1, 2, 4, 5], // Ti Ke Pe La
  customLabel: "Räätälöity wizardilla (hypertrofia, 4 vk, 4 liiketta)",
  startDateISO: todayISO(),
  _wizardMeta: {
    wizardId: "wiz_axxx", mapperVersion: "2B-α-v1.0",
    pickedStartingBlock: "hypertrofia",
    blockLengthRationale: "elite-tier",
    sexModifierApplied: false,
    targetDateAnchored: false,
    rules: [
      { rule: "q29=peaking → hypertrofia-aloitus (Issurin block-malli)",
        status: "KVALITATIIVINEN", source: "Issurin 2010" },
      { rule: "elite-tier weekCount 4 vk hypertrofialle",
        status: "HEURISTIC", source: "Petré 2021 kvalitatiivinen" },
      // ...
    ],
  }
}
```

2B-β (myöhemmin) syöttää tämän `generateCustomMesocycle`:lle ja saa valid
mesocyclen jonka voi aktivoida.

═══════════════════════════════════════════════════════════════
13. UUDEN KÄYTTÄJÄN POLKU 2B-α:n jälkeen
═══════════════════════════════════════════════════════════════

Lähtötilanne: täysin uusi käyttäjä, ei mesocycleja, ei movementProgressia.
Tehnyt wizardin loppuun 30 kysymyksellä.

Wizard-vastaukset:
- q08 = "beginner", q09 = "streetlifting", q12 = "hypertrophy"
- q14 = "no", q15 = "none"
- q17 = ["pullup_bar"] (vain leukatanko)
- q21 = "fullbody", q24 = { daysPerWeek: 3, sessionLengthMinutes: 60 }
- q23 = "auto", q25 = "vara_loose"
- q29 = "off_program"
- q26 = [{ movementId: "fb_pullup", movementName: "Leuanveto", loadType: "system", weightKg: 0, reps: 10 }]
  (käsitellään 2B-γ:ssa)

`mapWizardToMesocycle()`:
```js
{
  goal: "hypertrofia",            // off_program → hypertrofia
  primaries: [{ name: "Lisäpainoleuanveto", category: "vertikaaliveto" }],
                                  // muut poistettu (ei dip_station, ei barbell_rack)
  daysPerWeek: 3,
  weekCount: 8,                   // beginner-tier hypertrofialle
  recoveryCapacity: "keski",      // q23=auto + beginner → default
  preferredDaysOfWeek: [1, 3, 5], // Ti To La
  ...
}
```

═══════════════════════════════════════════════════════════════
14. VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v1.0 (2026-05-11):** Spec-pohja. 2B-α:n scope, algoritmi, päätöskohdat,
  hyväksymiskriteerit. Tutkimusvelka kuitattu (docs/VAIHE_2B_RESEARCH_VERIFICATION.md
  toimii pohjana). K1-K4-päätökset integroitu. 2B-β + 2B-γ jää erilliseksi
  toteutukseksi spec:in mukaisesti.

═══════════════════════════════════════════════════════════════
LOPPUSANAT
═══════════════════════════════════════════════════════════════

2B-α on **kapean skoopin mapping-kerros** joka käyttää pää-app:in olemassa
olevaa `generateCustomMesocycle`:a black-boxina. Tämä on huomattavasti
turvallisempi kuin rakentaa rinnakkainen generaattori, ja yhdessä
tutkimusvelan kanssa (Issurin RISTIINTARKISTETTU, Huiberts + Petré PDF,
Nunes + ACSM RISTIINTARKISTETTU) muodostaa solidin pohjan ohjelman
generoinnille.

2B-β (UI + DB-kirjoitukset) ja 2B-γ (PR-migraatio + energiabudjetti) jäävät
erillisiksi vaiheiksi jotka voivat hyödyntää 2B-α:n pure-function-rajapintaa.
