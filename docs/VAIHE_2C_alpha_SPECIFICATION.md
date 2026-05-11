# VAIHE_2C_alpha_SPECIFICATION.md
## Track B Vaihe 2C-α — Multi-blokki-mesocycle (Issurin block-sekvenssi)

**Versio:** v1.0 (2026-05-11)
**Status:** Spec-vaihe. Track B Vaihe 2C-α toteuttaa koodin pohjalta.
**Onnistumiskriteeri:** "Wizard-config + mainAppState → multi-blokki-mesocycle
(esim. hyp 4 vk + strength 4 vk + intensification 3 vk + peaking 2 vk = 13 vk
yhdessä paketissa). Akseli voi vk 16:n päättymisen jälkeen valita
streetlifting-kisan tavoittaen mesocyclen joka kestää kisapäivään asti
ilman wizard-uudelleenajamista välissä."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET 2B-γ → 2C-α
═══════════════════════════════════════════════════════════════

2B-γ tuotti _yhden blokin_ kerrallaan — kun 4 vk hypertrofia päättyy,
käyttäjä joutuu joko ajamaan wizardin uudelleen tai valitsemaan manuaalisesti
pää-app:n template:n. EI auto-progressiota läpi Issurin-blokki-syklin.

2C-α lisää multi-blokki-mahdollisuuden:
- Wizard-config voi tuottaa **N peräkkäistä blokkia** yhdessä mesocyclessa
- Block-sekvenssi noudattaa Issurin 2010 -block-mallia:
  hypertrofia → strength → intensification → peaking
- Block-pituudet kvalitatiivisesti tier-pohjaisia (jo 2B-α:ssa)
- Kisapäivä (q27) ANKKUROI peakingin loppuun

EI sisällä 2C-α:ssa:
- Tier-pohjainen vk-progressio kunkin blokin sisällä (= 2C-γ)
- Session-fokus per päivä (= 2C-β)
- Isometric e1RM-mallinnus (= 2C-δ)

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

2C-α luo **multi-blokki-meson** käyttäen pää-app:in olemassa olevia
skeleton-factory:itä yhdistämällä ne. Lähestymistapa:

1. **mapWizardToMultiBlockMesocycle** wizard-2b-mapper.js:ssä
   - Päättää blokki-sekvenssin q29_recentBlock + q27_targetDate + q08_selfLevel
     -pohjalta (Issurin 2010 block-malli + Petré 2021 advanced-tier-pituudet)
   - Palauttaa: `{ blocks: [{ goal, weekCount }], primaries, daysPerWeek, ... }`

2. **generateMultiBlockMesocycle** data.js:ssä (UUSI funktio)
   - Ottaa block-sekvenssin + primaries + start-date
   - Käyttää pää-app:in skeleton-factory:itä kunkin blokin pohjana
   - Ketjuttaa weekPlans-array:t yhdeksi koko mesocyclen weekPlans:iksi
   - Palauttaa valid mesocycle-objektin (type: "custom-multi-block")

3. **handleGenerateProgram laajennus**
   - Tunnistaa wizard-config:sta multi-blokki-mahdollisuuden
   - Jos q27_targetDate annettu JA blokki-sekvenssi >1 blokki → multi-blokki
   - Muutoin single-blokki kuten 2B-α/β/γ

4. **Preview-modaali laajennus**
   - Näyttää blokki-aikajanan: "Hyp 4 vk → Strength 4 vk → Intensification 3 vk → Peaking 2 vk"
   - Käyttäjä näkee kokonais-keston ja kisapäivä-ankkuroinnin

═══════════════════════════════════════════════════════════════
1. ALGORITMI — Block-sekvenssin valinta
═══════════════════════════════════════════════════════════════

### pickBlockSequence(answers, daysUntilTarget)

**Tutkimuspohja:** Issurin 2010 block-malli (PDF-VERIFIOITU 2B-α-tutkimuksessa)
+ Issurin Table V residuaalit (RISTIINTARKISTETTU).

**Sääntö:**

```js
function pickBlockSequence(answers, daysUntilTarget) {
  // Jos q27_targetDate puuttuu TAI alle 5 vk → single-blokki (=2B-α-logiikka)
  if (!daysUntilTarget || daysUntilTarget < 35) {
    return null; // = single-block, käytä mapWizardToMesocycle
  }

  const isElite = answers.q08_selfLevel === "elite" || answers.q08_selfLevel === "advanced";
  const isMaxGoal = ["max_1RM", "powerlifting", "streetlifting_with_explosive_components"]
    .includes(answers.q12_primaryGoal);

  // Issurin block-sekvenssi: hypertrofia → strength → intensification → peaking
  // Block-pituudet tier-pohjaisesti (2B-α:n lengthByTier:in kvalitatiivinen jatke):

  const totalWeeks = Math.min(Math.floor(daysUntilTarget / 7), 20); // cap 20 vk

  // 4-blokin standardirakenne kun ≥13 vk käytettävissä
  if (totalWeeks >= 13 && isMaxGoal) {
    return {
      blocks: [
        { goal: "hypertrofia",  weekCount: isElite ? 4 : 6 },
        { goal: "maksimivoima", weekCount: 4 },
        { goal: "yhdistelma",   weekCount: isElite ? 3 : 2 }, // intensifikaatio
        { goal: "maksimivoima", weekCount: 2, label: "peaking" }, // realization
      ],
      totalWeeks: isElite ? 13 : 14,
      anchored: true,
    };
  }

  // 3-blokin rakenne kun 8-12 vk
  if (totalWeeks >= 8 && totalWeeks < 13) {
    return {
      blocks: [
        { goal: "hypertrofia",  weekCount: isElite ? 3 : 4 },
        { goal: "maksimivoima", weekCount: 4 },
        { goal: "maksimivoima", weekCount: 2, label: "peaking" },
      ],
      totalWeeks: isElite ? 9 : 10,
      anchored: true,
    };
  }

  // 2-blokin rakenne kun 5-7 vk
  if (totalWeeks >= 5) {
    return {
      blocks: [
        { goal: "hypertrofia",  weekCount: 3 },
        { goal: "maksimivoima", weekCount: 2, label: "peaking" },
      ],
      totalWeeks: 5,
      anchored: true,
    };
  }

  return null; // fallback single-block
}
```

**Heuristic-osa (K2:n päätöksen mukaan, KOMMENTTI koodissa):**
- Block-pituudet ovat kvalitatiivisia, ei numeerisesti optimoituja
- Issurin 2010 antaa block-mallin _periaate_-tasolla, ei tarkkoja vk-pituuksia
- Tier-säätö (elite = 1 vk lyhyemmät blokit) on Petré 2021 -kvalitatiivinen

### Block-järjestyksen logiikka

Issurin block-sekvenssi:
1. **Hypertrofia** — perustyö, residuaali 15±5 vrk (Strength endurance -kategoria)
2. **Strength** — maksimivoima-blokki, residuaali 30±5 vrk
3. **Intensification** — pieni volyymi, korkea intensiteetti
4. **Peaking/Realization** — 1-2 vk taper kisaan

q29_recentBlock vaikuttaa aloitusblokkiin:
- q29 = "peaking" → aloita hypertrofia (peakingista palautuminen)
- q29 = "hypertrophy" + max-goal → SKIP hypertrofia, aloita strength
- q29 = "strength" → SKIP hypertrofia + strength, aloita intensifikaatio
- q29 = "intensification" → aloita peaking (jos q27 annettu) tai strength

═══════════════════════════════════════════════════════════════
2. generateMultiBlockMesocycle (UUSI funktio data.js:ssä)
═══════════════════════════════════════════════════════════════

### Sijainti

`data.js` rivin ~3887 jälkeen (generateCustomMesocyclen viereen).
Importattu exports-blokkiin samaan tapaan kuin generateCustomMesocycle.

### Toteutus

```js
function generateMultiBlockMesocycle(config, startDateISOArg) {
  const {
    blocks,           // [{ goal, weekCount, label? }]
    primaries,        // [{ name, category }]
    daysPerWeek,
    recoveryCapacity,
    preferredDaysOfWeek,
    customLabel,
  } = config;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error("generateMultiBlockMesocycle: blocks-array puuttuu");
  }

  const startDateISO = startDateISOArg || config.startDateISO || todayISO();
  const totalWeeks = blocks.reduce((sum, b) => sum + b.weekCount, 0);

  // Rakennetaan weekPlans ketjuttamalla kunkin blokin weekPlans
  const factories = {
    hypertrofia:  createHypertrofiaMesocycle,
    maksimivoima: createMaksimivoimaMesocycle,
    yhdistelma:   createDefaultMesocycle,
    undulating:   createDUPMesocycle,
  };

  let combinedWeekPlans = [];
  let combinedWeekDefs = [];
  let weekOffset = 0;
  const blockMetadata = []; // tracking per-blokki

  for (const block of blocks) {
    const factory = factories[block.goal];
    if (!factory) {
      throw new Error(`generateMultiBlockMesocycle: tuntematon goal "${block.goal}"`);
    }
    // Generoi blokki yksinään (alkuperäinen startDate ei merkityksellinen,
    // weekPlans-indeksit lasketaan uudelleen)
    const blockMeso = factory(startDateISO);

    // Skaalaa daysPerWeek
    let blockWeekPlans = blockMeso.weekPlans;
    if (daysPerWeek !== 3) {
      blockWeekPlans = adjustDaysPerWeek(blockWeekPlans, daysPerWeek);
    }
    // Skaalaa weekCount
    if (block.weekCount !== blockWeekPlans.length) {
      const scaled = scaleWeekCount(blockWeekPlans, blockMeso.weekDefs, block.weekCount, block.goal);
      blockWeekPlans = scaled.weekPlans;
    }
    // Substituoi päämääräliikkeet
    blockWeekPlans = distributePrimariesToDays(blockWeekPlans, primaries);
    // Applikoi palautumiskerroin
    const recoveryScalars = { hyva: 1.0, keski: 0.85, heikko: 0.70 };
    blockWeekPlans = applyRecoveryScalar(blockWeekPlans, recoveryScalars[recoveryCapacity] ?? 0.85);
    // Päivänumerointi: jokainen viikko saa weekIndex = weekOffset + i
    blockWeekPlans = blockWeekPlans.map((wp, i) => ({
      ...wp,
      weekIndex: weekOffset + i,
      blockGoal: block.goal,
      blockLabel: block.label || block.goal,
    }));
    combinedWeekPlans = combinedWeekPlans.concat(blockWeekPlans);
    blockMetadata.push({
      goal: block.goal,
      label: block.label || block.goal,
      weekCount: block.weekCount,
      startWeekIndex: weekOffset,
      endWeekIndex: weekOffset + block.weekCount - 1,
    });
    weekOffset += block.weekCount;
  }

  // Käyttäjän viikonpäivä-preferenssi
  if (preferredDaysOfWeek) {
    combinedWeekPlans = applyDayOfWeekPreference(combinedWeekPlans, preferredDaysOfWeek);
  }

  const primaryLabel = primaries.map(p => p.name).join(" + ");
  const label = customLabel || `Räätälöity multi-blokki: ${primaryLabel} (${totalWeeks} vk, ${blocks.length} vaihetta)`;

  return {
    mesocycleId: uid(),
    type: "custom-multi-block",
    customConfig: {
      blocks: blockMetadata,
      primaries,
      daysPerWeek,
      recoveryCapacity,
      preferredDaysOfWeek,
      label,
      generatedAt: nowISO(),
    },
    startDateISO,
    weekCount: totalWeeks,
    weekDefs: combinedWeekDefs, // tyhjä — block-pohjaiset viikkomäärittelyt
    weekPlans: combinedWeekPlans,
    postCycleAnalysis: null,
  };
}
```

### Avoimet kysymykset koodausvaiheessa

1. **scaleWeekCount yhteensopivuus**: pää-app:n nykyinen scaleWeekCount on suunniteltu
   yhdelle blokille. Voi vaatia kevyttä laajennusta multi-blokki-tapaukseen.
2. **VIIKKO-INDEXIT**: blockWeekPlans.weekIndex pitää saada Dashboard:lle näkymään
   "Hyp vk 1/4" vs. globaali "Vk 1/13".
3. **engine.js recommend()**: Tarkistettava että `recommend(mesocycle, today, ...)`
   toimii multi-blokki-mesocyclen kanssa — viikkoindeksi pitäisi olla "globaali" 1..totalWeeks.

═══════════════════════════════════════════════════════════════
3. mapWizardToMultiBlockMesocycle (laajennus 2B-α-mapperiin)
═══════════════════════════════════════════════════════════════

Lisätään `wizard-2b-mapper.js`:ään uusi exportoitu funktio:

```js
export function mapWizardToMultiBlockMesocycle(wizardConfig, mainAppState) {
  // 1. Validointi (sama kuin mapWizardToMesocycle)
  const validation = validateMappingInput(wizardConfig, mainAppState);
  if (!validation.valid) throw new Error(`mapWizardToMultiBlockMesocycle: ${validation.errors[0].reason}`);

  const a = wizardConfig.answers;
  const startDateISO = _todayISO();

  // 2. Laske daysUntilTarget jos q27 annettu
  let daysUntilTarget = null;
  if (a.q27_targetDate) {
    const target = new Date(a.q27_targetDate);
    const start = new Date(startDateISO);
    daysUntilTarget = Math.floor((target.getTime() - start.getTime()) / 86400000);
  }

  // 3. Päätä block-sekvenssi (jos q27 ja >= 5 vk)
  const sequence = pickBlockSequence(a, daysUntilTarget);
  if (!sequence) {
    // Fallback: single-blokki (2B-α-logiikka)
    return mapWizardToMesocycle(wizardConfig, mainAppState);
  }

  // 4. Yhteiset kentät (sama logiikka kuin 2B-α/γ)
  const recoveryCapacity = pickRecoveryCapacity(a);
  const primaries = pickPrimaries(a);
  const preferredDaysOfWeek = pickPreferredDaysOfWeek(a.q24_frequency);
  const daysPerWeek = Number(a.q24_frequency?.daysPerWeek) || 3;

  const customLabel = `Räätälöity multi-blokki (${sequence.totalWeeks} vk, ${sequence.blocks.length} vaihetta)`;

  return {
    // generateMultiBlockMesocycle-yhteensopivat parametrit:
    blocks: sequence.blocks,
    primaries, daysPerWeek, recoveryCapacity, preferredDaysOfWeek,
    customLabel, startDateISO,
    isMultiBlock: true, // flag handleGenerateProgram:ille
    // 2C-α metadata:
    _wizardMeta: {
      wizardId: wizardConfig.wizardId,
      wizardSchemaVersion: wizardConfig.schemaVersion,
      mapperVersion: "2C-alpha-v1.0",
      blockSequenceRationale: `${sequence.blocks.length}-blokin sekvenssi (${sequence.totalWeeks} vk)`,
      targetDateAnchored: true,
      rules: collectMultiBlockRules(a, sequence, recoveryCapacity),
    },
  };
}

function collectMultiBlockRules(a, sequence, recoveryCapacity) {
  const rules = [];
  rules.push({
    rule: `q27_targetDate annettu + ${sequence.totalWeeks} vk → multi-blokki-sekvenssi`,
    status: "KVALITATIIVINEN",
    source: "Issurin 2010 block-sekvenssi (hyp → str → int → peak)",
  });
  rules.push({
    rule: `Block-pituudet ${sequence.blocks.map(b => b.weekCount).join("+")} vk (${a.q08_selfLevel}-tier)`,
    status: "HEURISTIC",
    source: "Petré 2021 kvalitatiivinen (advanced lyhyemmät blokit)",
  });
  // ... muut säännöt
  return rules;
}
```

═══════════════════════════════════════════════════════════════
4. handleGenerateProgram-laajennus
═══════════════════════════════════════════════════════════════

```js
async function handleGenerateProgram() {
  // ... (1-3 kuten 2B-γ)

  // 3. Mapping: tunnista multi-blokki vai single
  let mapped;
  try {
    // 2C-α: jos q27_targetDate ≥ 5 vk päässä → multi-blokki
    mapped = mapWizardToMultiBlockMesocycle(wizardConfig, mainAppState);
  } catch (e) {
    showToast(`Mapping epäonnistui: ${e.message}`, "bad");
    return;
  }

  // ... (4-5 kuten 2B-γ — preview-modaali + snapshot)

  // 6. Generoi mesocycle — uusi multi-blokki-haara
  let newMeso;
  try {
    if (mapped.isMultiBlock) {
      newMeso = generateMultiBlockMesocycle(mapped, mapped.startDateISO);
    } else {
      newMeso = generateCustomMesocycle(mapped, mapped.startDateISO);
    }
    if (!newMeso.customConfig) newMeso.customConfig = {};
    newMeso.customConfig._wizardMeta = mapped._wizardMeta;
  } catch (e) {
    showToast(`Ohjelman generointi epäonnistui: ${e.message}`, "bad");
    return;
  }

  // ... (7-9 kuten 2B-γ — save, activate, decisionTrace, PR-migraatio, redirect)
}
```

═══════════════════════════════════════════════════════════════
5. Preview-modaali — Block-aikajana
═══════════════════════════════════════════════════════════════

Jos `mapped.isMultiBlock`, lisätään modaalin body:hyn block-aikajana:

```
┌──────────────────────────────────────────────────────────────┐
│ Räätälöity ohjelma — preview                              ×  │
├──────────────────────────────────────────────────────────────┤
│ Multi-blokki: 13 vk yhteensä, kisapäivä 2026-08-15           │
│                                                              │
│ ┌─Hyp 4vk─┬─Str 4vk──┬─Int 3vk──┬─Peak 2vk─┐                │
│ │ vk 1-4  │  vk 5-8  │  vk 9-11 │ vk 12-13 │                │
│ └─────────┴──────────┴──────────┴──────────┘                │
│                                                              │
│ Päämääräliikkeet (4): ...                                    │
│ Palautumiskapasiteetti: Keski                                │
└──────────────────────────────────────────────────────────────┘
```

Toteutus stringinä innerHTML:llä, ASCII-bokseja ei käytetä — käytetään
CSS-grid:iä blokki-paneeleille värikoodattuina (hyp=sininen, str=oranssi,
int=keltainen, peak=punainen).

═══════════════════════════════════════════════════════════════
6. ROADMAP — VAIHE 2C-α (~10-15h)
═══════════════════════════════════════════════════════════════

**T1: pickBlockSequence wizard-2b-mapper.js:ssä** (~90 min)
- Block-sekvenssin logiikka (4/3/2-blokin rakenteet)
- q08_selfLevel-tier-säädöt
- q29_recentBlock vaikutus aloitusblokkiin
- selfTestMapper laajennus (~10 uutta testiä)

**T2: mapWizardToMultiBlockMesocycle** (~60 min)
- Multi-blokki-mapping-funktio
- collectMultiBlockRules
- selfTestMapper laajennus (~5 uutta testiä, päästä-päähän skenaariot)

**T3: generateMultiBlockMesocycle data.js:ssä** (~3-4h)
- Skeleton-factory-ketjutus
- weekPlans-yhdistäminen + weekIndex-numerointi
- daysPerWeek + scaleWeekCount + distributePrimariesToDays-integraatio
- type: "custom-multi-block" -ymmärrys
- Export data.js:n exports-blokissa

**T4: handleGenerateProgram-laajennus** (~30 min)
- Multi-blokki-haaran kytkentä
- isMultiBlock-flag

**T5: Preview-modaali Block-aikajana** (~90 min)
- CSS-grid block-paneelit värikoodattuina
- renderBlockTimeline()-helperi
- Mobiili-säätö

**T6: engine.js + index.html testaus multi-blokki-meson kanssa** (~60 min)
- recommend()-toiminta multi-blokki-mesocyclellä
- Dashboard-näkymä "Hyp vk 1/4" + globaali "vk 1/13"
- KORJATAAN jos näkymä rikkoutuu

**T7: APP_VERSION 4.41.0 → 4.42.0** (~5 min)

**T8: Manuaalitestit selaimessa** (~60 min)
- Akselin profiili + q27=2026-08-15 (=14 vk päässä) → 4-blokin sekvenssi
- Pelkkä q27 puuttuu → single-blokki (fallback)
- Lyhyt q27 (alle 5 vk) → single-blokki
- Aktivointi + Dashboard-näkymä toimii

**T9: Commit + push**

═══════════════════════════════════════════════════════════════
7. HYVÄKSYMISKRITEERIT — VAIHE 2C-α
═══════════════════════════════════════════════════════════════

1. node --check sw.js data.js wizard-2b-mapper.js OK
2. selfTestMapper 81 → ~95 testiä vihreänä
3. Pää-app:in test-runner.js golden fixture edelleen vihreä (engine.js koskematon)
4. Wizard-config + q27=14 vk päässä → multi-blokki 4 vaiheessa
5. Wizard-config ilman q27:ta → single-blokki (fallback)
6. Preview-modaali näyttää block-aikajanan kun isMultiBlock
7. generateMultiBlockMesocycle palauttaa valid mesocyclen tyypillä
   "custom-multi-block" + blocks-array customConfig:ssa
8. Dashboard-näkymä toimii multi-blokki-meson kanssa (vk näkymä OK)
9. Sovellusversio v4.42.0; PROGRAM_BUILD_VERSION SÄILYY 4.38.9 jos mahdollista
   (jos engine.js vaatii muutoksia → bumppi voi olla pakollinen)
10. Wizard 1A-2B-γ koskemattomia

═══════════════════════════════════════════════════════════════
8. KIELLETYT
═══════════════════════════════════════════════════════════════

1. **Älä lisää tier-pohjaisia vk-progressio-kertoimia.** Tämä on 2C-γ:n
   työ — vaatii tutkimusta (Rhea 2003, Helms RIR, Williams 2017).
2. **Älä lisää isometric e1RM-mallinnusta.** Tämä on 2C-δ:n työ — vaatii
   tutkimusta (Overcoming Gravity, GST).
3. **Älä muokkaa pää-app:in `createHypertrofiaMesocycle` / `createMaksimivoima`
   / `createDefaultMesocycle` -funktioita.** Käytä niitä black-box:ina.
4. **Älä muokkaa wizard-tiedostoja paitsi wizard-2b-mapper.js:ää.** 1A-1D
   wizard-koodi koskematon.
5. **Älä lisää uusia kysymyksiä wizardiin.** 3.3 on lukko.
6. **Älä tuplaa pää-app:in distributePrimariesToDays / adjustDaysPerWeek /
   scaleWeekCount / applyRecoveryScalar -funktioita.** Käytä niitä
   yhteisesti (jos eivät ole exporteja, tuodaan ne explicitly).
7. **Pre-rebuild snapshot pakollinen** kun aktiivinen meso korvataan (sama
   sääntö kuin 2B-β).

═══════════════════════════════════════════════════════════════
9. AKSELIN POLKU 2C-α:n jälkeen
═══════════════════════════════════════════════════════════════

### Skenaario: Streetlifting-kisa 2026-08-15 (= ~14 vk päässä 2026-05-11)
1. Avaa Asetukset → Henkilökohtainen ohjelma → "Avaa wizard"
2. Täyttää ~22 kysymystä, sis. q27_targetDate = "2026-08-15"
3. Klikki "Generoi ohjelma →" → preview-modaali näyttää:
   ```
   Multi-blokki: 13 vk, kisapäivä 2026-08-15
   Hyp 4vk → Str 4vk → Int 3vk → Peak 2vk
   Päämääräliikkeet: lisäpaino-leuka, dippi, kyykky, muscle-up
   Palautumiskapasiteetti: Keski (q23=MAV)
   ```
4. Kaksoisvahvistus (korvaa streetlifting_16w jos vielä aktiivinen) →
   pre-rebuild snapshot → aktivointi
5. Dashboard näyttää "Hyp vk 1/4 — kokonais-vk 1/13"
6. Käyttäjä etenee automaattisesti läpi 4 blokin yhdellä mesocyclellä,
   ei tarvitse ajaa wizardia uudelleen välissä

### Skenaario: Ei kisapäivää
- q27_targetDate puuttuu → mapWizardToMultiBlockMesocycle palauttaa
  single-blokki-mapping (= 2B-α-logiikka jatkuu)
- Akseli saa "Hyp 4 vk" -meson kuten ennenkin
- 4 vk:n päättyessä avaa wizardin uudelleen, päivittää q29:n
  ("hypertrophy" tällä kertaa), generoi seuraavan

═══════════════════════════════════════════════════════════════
10. VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v1.0 (2026-05-11):** Spec-pohja. 2C-α tehtävät, hyväksymiskriteerit.
  Issurin 2010 block-malli + Petré 2021 tier-pituudet pohjana.

═══════════════════════════════════════════════════════════════
LOPPUSANAT
═══════════════════════════════════════════════════════════════

2C-α tuo Track B:hen **multi-blokki-mahdollisuuden**: yksi wizard-kierros
+ kisapäivä → koko 13-16 vk ohjelma yhdessä paketissa. Akseli voi
hyödyntää tämän elokuun 2026 streetlifting-kisaan valmistautuessaan.

EI sisällä tier-pohjaista kg-progressiota (= 2C-γ, vaatii tutkimusta)
eikä isometric-mallinnusta (= 2C-δ, vaatii tutkimusta). Nämä toteutetaan
kun tutkimuskehotteen tuotos `docs/VAIHE_2C_RESEARCH_VERIFICATION.md`
on valmis.
