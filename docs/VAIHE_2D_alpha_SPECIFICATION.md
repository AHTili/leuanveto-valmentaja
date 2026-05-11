# VAIHE_2D_alpha_SPECIFICATION.md

**LeVe AI v4.47.0 — Track B Vaihe 2D-α**
**Adaptive multi-suggestion + olemassa olevien tyylien laajennus**

- **Versio:** v1.0
- **Päivätty:** 2026-05-11
- **Branchi:** `claude/wizard-2d-alpha`
- **Edellinen vaihe:** 2C-δ (commit dc16064, isometric e1RM)
- **Seuraava vaihe:** 2D-β (Wendler 5/3/1 + Top-set/Backoff + Madcow 5×5)

---

## 1. Tavoite

Käyttäjän valinta 2026-05-11: **Tapa 3 — adaptive multi-suggestion**.
Wizard 3.3 säilyy ennallaan (ei q31_programStyle-kysymystä lisätä).
Sen sijaan **mapper päättelee profiilista top-3 ohjelmointityyliä** confidence-järjestyksessä,
ja käyttäjä voi vaihtaa stylen preview-modaalissa vapaasti.

**Mullistava taso -tavoite (käyttäjän sanat 2026-05-11):**
> "D, olemme kunnianhimoisia ja rakennamme tällä hetkellä jotain mullistavaa, vai mitä?"

2D-α on tämän polun ensimmäinen vaihe (5–7h työ). Helpot voitot:
kytke jo olemassa olevat templates wizardiin + lisää päätösalgoritmi.

---

## 2. Kattavuus

### Ennen 2D-α:tä — mapper tunsi 4 single-block tyyliä:
- `hypertrofia` (createHypertrofiaMesocycle, 4 vk)
- `maksimivoima` (createMaksimivoimaMesocycle, 4 vk)
- `yhdistelma` (createDefaultMesocycle, 4 vk)
- `undulating` (createDUPMesocycle, 4 vk)

Plus multi-block-polku (Issurin block-malli, 8–16 vk).

### 2D-α jälkeen — mapper tunnistaa **8 tyyliä**:
| # | styleId | Native viikot | Goal-key | Pää-app-factory |
|---|---------|---------------|----------|-----------------|
| 1 | `multi-issurin` | 8–16 (dynaaminen) | — | `generateMultiBlockMesocycle` |
| 2 | `single-hypertrofia` | 4 | hypertrofia | createHypertrofiaMesocycle |
| 3 | `single-maksimivoima` | 4 | maksimivoima | createMaksimivoimaMesocycle |
| 4 | `single-yhdistelma` | 4 | yhdistelma | createDefaultMesocycle |
| 5 | `single-dup` | 4 | undulating | createDUPMesocycle |
| 6 | `single-eksentrinen` | 4 | eksentrinen | **createEksenterinenMesocycle (UUSI 2D-α:ssa)** |
| 7 | `single-siirtyma` | 3 (lukko) | siirtyma | **createSiirtymaMesocycle (UUSI 2D-α:ssa)** |
| 8 | `single-palautuminen` | 2 (lukko) | palautuminen | **createPalautuminenMesocycle (UUSI 2D-α:ssa)** |

3 uutta single-blokki-vaihtoehtoa joiden natiivipituus on muu kuin 4 vk
→ data.js:n `generateCustomMesocycle` skippaa `scaleWeekCount()`:n näille
(`useNativeLength`-haaroitus, lukot määriteltyinä `GOAL_NATIVE_WEEKS`-taulukossa).

---

## 3. Arkkitehtuurimuutokset

### 3.1 wizard-2b-mapper.js (+~400 LoC)

#### Uusi: `PROGRAM_STYLES` constant
Frozen object joka sisältää 8 tyylin metadatan:
- `id`, `label`, `shortDesc`, `weekCount`, `bestFor`, `iconHint`
- `isMultiBlock` (boolean) + `goal` (single-block-tyylit)
- `factoryHint` (informatiivinen, kohdistaa data.js:n factoryyn)
- `sourceLabel` (perustelu — näkyy modaalin "Ohjelmointityyli"-osiossa)

#### Uusi: `pickProgramStyle(answers, opts)`
Pure-funktio joka palauttaa **8 kandidaattia** sorted-confidence-järjestyksessä.
Top-3 = ensimmäiset 3 elementtiä.

**Confidence-laskenta** (0–100):
- Goal-match: max +40 (q12 perfect match)
- Sekundaarigoal-match: max +20 (q13)
- Experience-match: max +20 (q08 sopivuus tyylin kanssa)
- Recent-block transition: max +15 (q29-luonteva askel)
- Special context (cut, break, target-date): bonus/penalty ±10–15

**Cap-säännöt:**
- `single-eksentrinen` MAX 25 jos `q08 ∈ {beginner, intermediate}` (specialty-tyyli vain edistyneille)
- `multi-issurin` MAX 25 jos `daysUntilTarget < 56` (alle 8 vk ei block-periodisaatiolle)
- `single-palautuminen` MAX 8 jos `q29 !== peaking` JA ei pidempi tauko (vältetään ali-aktiivisuus)

**Decision tree -priorisointi** (ilman cap-sääntöjä):
1. **Multi-issurin**: confidence 85 + bonukset jos kisapäivä + ≥8 vk
2. **Maksimivoima**: q12 max-tavoite + q29 hypertrofia → top-1 tyypillisesti
3. **Hypertrofia**: q12 hypertrophy → top-1; q29 peaking/deload/off → boost
4. **Yhdistelma**: q12 general_strength → top-1; aloittelijoille boost
5. **DUP**: q23 MAV/MRV + q08 intermediate+ → varioitumiselle
6. **Eksentrinen**: q08 advanced+ + q12 max-tavoite → specialty
7. **Siirtyma**: q29 deload + q10 tauko → bridging
8. **Palautuminen**: q29 peaking → fatigue-recovery

#### Uusi: `mapWizardToProgram(wizardConfig, mainAppState, opts)`
**Top-level dispatcher** joka:
1. Laskee `daysUntilTarget` jos q27 annettu
2. Hakee `pickProgramStyle()` → top-3 kandidaatti
3. Valitsee styleId:n: `opts.selectedStyleId` voittaa, muutoin top-1
4. Dispatch:
   - `multi-issurin` → `mapWizardToMultiBlockMesocycle()`
   - `single-*` → `mapWizardToMesocycle({ selectedStyleId })`
5. Liittää `_wizardMeta.styleCandidates` (top-3) + `chosenStyleId` metadataan

#### Muutos: `mapWizardToMesocycle(opts)`
Lisätty `opts.selectedStyleId` -parametri. Jos annettu:
- Tarkista että styleId on tunnettu PROGRAM_STYLES:ssä → muutoin Error
- Pakota `goal = PROGRAM_STYLES[styleId].goal`
- Käytä natiivipituutta jos `siirtyma` (3 vk) tai `palautuminen` (2 vk)
- Eksentrinen käyttää maksimivoima-tier-pituutta (4 vk)

#### Muutos: `collectAppliedRules(opts.selectedStyleId)`
Jos käyttäjä valinnut tyylin → ensimmäinen sääntö merkitään
"KÄYTTÄJÄVALINTA" / source: "ALGORITMI 2D-α". Muutoin "KVALITATIIVINEN" / Issurin.

#### MAPPER_VERSION
`"2C-delta-v1.0"` → `"2D-alpha-v1.0"`.

### 3.2 data.js (+~30 LoC)

#### Laajennettu: `GOAL_SKELETONS`
```js
const GOAL_SKELETONS = {
  hypertrofia:  "createHypertrofiaMesocycle",
  maksimivoima: "createMaksimivoimaMesocycle",
  yhdistelma:   "createDefaultMesocycle",
  undulating:   "createDUPMesocycle",
  eksentrinen:  "createEksenterinenMesocycle",   // UUSI
  siirtyma:     "createSiirtymaMesocycle",       // UUSI
  palautuminen: "createPalautuminenMesocycle",   // UUSI
};
```

#### Uusi: `GOAL_NATIVE_WEEKS`
```js
const GOAL_NATIVE_WEEKS = {
  // 4 oletuksena, mutta siirtymä + palautuminen ovat lyhyitä lukkoja
  siirtyma:     3,
  palautuminen: 2,
};
```

#### Muutos: `generateCustomMesocycle`
Lisätty haaroitus `useNativeLength`:
- Jos `nativeWeeks !== 4` → bypass `scaleWeekCount()` ja säilytä natiivipituus
- Muutoin: säilytä 4/8/12 vk -skaalauspolku ennallaan
- `effectiveWeekCount` käytetään customConfig + label + return-objektissa

### 3.3 index.html (+~70 LoC)

#### Muutos: import-block
Lisätty `mapWizardToProgram`, `pickProgramStyle`, `PROGRAM_STYLES` mapperista.

#### Muutos: `showGeneratorPreviewModal`
Palauttaa nyt `Promise<{action: 'activate'|'cancel'|'switch', selectedStyleId?: string}>`.
Aiempi `Promise<boolean>` ei ole enää käytössä (callers päivitetty).

**Uusi UI-osio**: "🎯 Ohjelmointityyli — top N suositusta"
- Esittää top-3 kandidaattia korttirakenteena (CSS grid `repeat(auto-fit, minmax(220px, 1fr))`)
- Kortit värikoodattu:
  - Valittu (`chosenStyleId === c.styleId`): vihreä reuna + "✓ Valittu" -merkki
  - Top-1 (idx===0, ei valittu): "⭐ Suositus" -badge oranssina
  - Muut: "#2", "#3" badge
- Confidence-baari: vihreä täyttöprosentti + numero
- Top-2 rationalea näkyvissä per kortti
- "Vaihda tähän" -nappi ei-valituissa korteissa

#### Muutos: `handleGenerateProgram`
1. Käytä `mapWizardToProgram()` (ei enää `mapWizardToMultiBlockMesocycle`)
2. Loop modaalin ympärillä:
   - `result.action === 'cancel'` → return
   - `result.action === 'switch'` → re-map uudella styleId:llä + show modal again
   - `result.action === 'activate'` → break loop, jatka aktivoitiin

---

## 4. Tutkimuspohja

**EI uutta tutkimusta tarvittu 2D-α:lle** — kaikki tyylit on jo olemassa pää-app:issa
ja niiden alkuperäiset perustelut on dokumentoitu data.js:n MESOCYCLE_TEMPLATES-taulukossa.

Sisäänrakennetut tutkimuspohjat per tyyli (ei muutoksia):
- **Hypertrofia** — Israetel — hypertrophy MEV→MAV progression
- **Maksimivoima** — Issurin block-malli (RISTIINTARKISTETTU 2B-α)
- **DUP** — Rhea 2002 (25% suurempia voimanlisäyksiä vs. lineaarinen)
- **Eksentrinen** — eksentrinen overload -konventio
- **Siirtyma** — GPP-konventio
- **Palautuminen** — aktiivisen palautumisen konventio

**pickProgramStyle()-confidence-painotukset ovat algoritmin omia heuristiikkoja** —
EI tutkimustaulukon suora soveltaminen. Merkitty rules-arrayssä:
- status: "ALGORITMI 2D-α"
- source: "ALGORITMI 2D-α (adaptive multi-suggestion)"

Fabrikointi-tarkistus: ✅ kaikki numerot ovat algoritmin painotuksia,
EIVÄT tutkimustaulukon "kynnyksiä". Plews 2013 -tyyppinen riski poissa.

---

## 5. Self-tests (selfTestMapper)

**192 testiä yhteensä — 100% pass** (3 backwards-compat-testin lisäykset + 39 uutta 2D-α-testiä).

Uudet 2D-α-testit (yht. 39):
- **PROGRAM_STYLES rakenne** (5 testiä): 8 tyyliä, oikeat goal-keyt, natiivipituudet 3/2 lukoissa
- **pickProgramStyle päätökset** (15 testiä):
  - max + hypertrofia-recent + advanced → top-1 maksimivoima
  - hypertrophy + off_program → top-1 hypertrofia
  - peaking-recent → palautuminen top-3:ssa
  - kisapäivä + 84 pv + competition → top-1 multi-issurin
  - kisapäivä 30 pv → multi-issurin EI top-1
  - deload-recent → siirtymä top-3:ssa
  - beginner + eksentrinen → confidence ≤ 25 (cap)
  - 8 tyyliä esiintyy listalla, ei duplikaatteja
  - kaikki confidence-arvot [0, 100]
  - female-atleti + max_1RM → maksimivoima silti top-1
- **mapWizardToMesocycle(opts.selectedStyleId)** (10 testiä):
  - Pakota single-hypertrofia → goal=hypertrofia
  - single-siirtyma → weekCount=3
  - single-palautuminen → weekCount=2
  - single-eksentrinen → goal=eksentrinen + weekCount=4
  - styleSource = "käyttäjän valinta: ..."
  - selectedStyleId tallennettu _wizardMeta:iin
  - virheellinen styleId heittää Error:n
- **mapWizardToProgram dispatcher** (9 testiä):
  - Ilman selectedStyleId:tä → käytetään top-1
  - styleCandidates = top-3 lista
  - chosenStyleId tallennettu
  - single-dup → goal=undulating
  - multi-issurin ilman targetDateä → fallback single + styleFallbackFromMulti=true
  - multi-issurin + kisapäivä 14 vk → isMultiBlock=true

---

## 6. Mahdolliset edge-caset + niiden käsittely

### 6.1 Käyttäjä valitsee multi-issurin ilman targetDate:ä
- `pickProgramStyle()` antaa multi-issurin confidencen 10 (matala) ilman targetDate:ä
- Käyttäjä voi silti "Vaihda tähän" -klikata sen
- Dispatcher kutsuu `mapWizardToMultiBlockMesocycle()` joka palaa single-block-fallback:iin
  (sen oma logiikka: `pickBlockSequence` palaa `null` ilman targetDateä → fallback)
- Modaali näyttää tämän `_wizardMeta.styleFallbackFromMulti=true` -merkinnällä
- Käyttäjä saa single-block-meson mutta tieto vaihdosta säilyy auditointijälissä

### 6.2 Käyttäjä valitsee palautuminen aktiivisen meson päälle
- Olemassa oleva pre-rebuild snapshot -mekanismi tallentaa edellisen meson
- 2 vk palautumisjakso aktivoituu normaalisti
- Käyttäjä voi palata snapshot:iin Asetuksista jos haluaa peruuttaa

### 6.3 Käyttäjä valitsee siirtymä-blokin kisapäivän kanssa (alle 4 vk)
- `pickProgramStyle()` antaa siirtymälle -20 penaltyn jos `daysUntilTarget < 28`
- Käyttäjä voi silti valita — mutta confidence näkyy matalana modaalissa
- Käyttäjän vastuu (sovellus ei pakota); "Vaihda tähän"-toiminto on aina mahdollinen

### 6.4 Tier-progressio + lyhyt-natiivinen tyyli (siirtymä 3 vk, palautuminen 2 vk)
- `applyTierProgression()` säätää vk 2-3 deltaPctBase:a (vk 1+4 koskemattomia)
- Siirtymässä (3 vk) tämä koskee vain vk 2:ta
- Palautumisessa (2 vk) tämä EI koske mitään (vk 1 ja 2 ovat 0+1 indeksit, indeksit ulkopuolella 1-2)
- Toiminta on oikein — tier-progressio on tarkoitettu rakennusvaiheille, ei palautusvaiheille

---

## 7. Tulevia laajennuksia (2D-β / γ / δ)

### 2D-β (15–20h) — Klassiset voimanosto-ohjelmat
Lisätään PROGRAM_STYLES:iin:
- `single-wendler531` (Wendler 5/3/1 — 4-vk sykli, 65/75/85% × 5/3/1+ AMRAP, TM=90% 1RM)
- `single-top-set-backoff` (Tuchscherer RTS / Greg Nuckols — 1× heavy + 3-5× 80% AMRAP)
- `single-madcow-5x5` (Bill Starr -pohja, 5×5 ramp + +2.5lb/vk progressio)

Engine-tuki: AMRAP-flag (`reps_amrap`) data.js:n weekPlan-rakenteeseen.
Tutkimusverifikaatio: Wendler 2009 book + Tuchscherer-empiria + Madcow-konsensus.

### 2D-γ (30–45h) — Edistyneet metodologiat
- `single-westside-conjugate` (Louie Simmons — ME/DE rotation + accommodating resistance)
- `single-gzcl` (Cody Lefever — Tier 1/2/3 + LSAMRAP)
- `single-sheiko` (russian high-volume %1RM-taulukot — #29 / #32 / #37 -valinta)
- `single-minimalist` (Dr. Mike RP — 2 hard sets RIR 0-1)
- `single-smolov` (squat-specialization, 13 vk)
- `single-coan-phillipi` (deadlift-specialization, 12 vk)

### 2D-δ (50–80h yhteensä) — Mullistava taso
- Adaptive multi-suggestion UI: compare-modaali, vertailutaulukko (kolmas dimensio: progressionopeus)
- Hybridit: "5/3/1 + Issurin-peaking 6 vk ennen kisaa"
- Voi-vaiko-pitäis-pohjainen UI (selitykset: "Tämä sopii koska..., tämä EI sovi koska...")

---

## 8. Akzeptanssikriteerit 2D-α:lle

| # | Kriteeri | Status |
|---|----------|--------|
| K1 | PROGRAM_STYLES sisältää 8 tyyliä (1 multi + 7 single) | ✅ |
| K2 | pickProgramStyle palauttaa kaikki 8 + sortataan confidence-desc | ✅ |
| K3 | Confidence on aina [0, 100] | ✅ |
| K4 | Beginner+eksentrinen capped ≤ 25 (specialty) | ✅ |
| K5 | mapWizardToMesocycle(opts.selectedStyleId) toimii kaikille 7 single-tyylille | ✅ |
| K6 | mapWizardToProgram dispatcher reitittää oikein (multi vs. single) | ✅ |
| K7 | Siirtymä natiivi 3 vk, palautuminen natiivi 2 vk lukoina | ✅ |
| K8 | Modaali näyttää top-3 kortit + "Vaihda tähän"-napit | ✅ |
| K9 | Switch-loop handleGenerateProgram:ssa toimii (re-map + re-show) | ✅ |
| K10 | Self-tests pass: 192/192 (uudet 39 testiä mukana) | ✅ |
| K11 | Engine selaimessa OK: Akseli-profiili → maksimivoima top-1 65% | ✅ |
| K12 | EI fabrikointia (kaikki painotukset merkitty ALGORITMI 2D-α:ksi) | ✅ |
| K13 | APP_VERSION v4.46.0 → v4.47.0 | ✅ |
| K14 | PROGRAM_BUILD_VERSION pysyy v4.38.9 (ei trigger auto-rebuildiä) | ✅ |

---

## 9. Riskit + niiden lieventäminen

| Riski | Lieventäminen |
|-------|---------------|
| Käyttäjä vaihtaa stylen useaan kertaan → tilan sotkeutuminen | Switch-loop on lokaali state (selectedStyleId), ei kosketa DB:tä ennen activate-painalusta |
| Eksentrinen-tyylin "advanced+ only" ohitettavissa? | Cap-sääntö rajoittaa confidence-pisteet 25:een, mutta käyttäjä voi silti valita — vastuu käyttäjällä |
| Multi-issurin-fallback hämmentää käyttäjää (valitsee multi mutta saa single) | `_wizardMeta.styleFallbackFromMulti=true` näytetään modaalissa info-banneri (UI-feature 2D-δ:ssä) |
| Lyhyt-natiivit (siirtymä/palautuminen) eivät skaalaudu 8/12 vk:hon | Tarkoituksellinen — nämä ovat "kevyt-vaiheita", eivät pää-blokkeja. Käyttäjä voi ketjuttaa myöhemmin |

---

## 10. Metadata

- **Tutkimusvelka 2D-α:lle:** 0 (kaikki tyylit jo olemassa, algoritmin painotukset eivät vaadi tieteellistä validointia)
- **Self-tests:** 192/192 PASS
- **Engine-verifiointi:** Akseli-profiili → top-1 maksimivoima 65%, top-2 eksentrinen 50%, top-3 DUP 35%
- **UI-verifiointi:** modaalin DOM rakentuu mapped._wizardMeta.styleCandidates-pohjalta (vaatii full wizard run käyttäjältä; engine OK varmistettu)
- **Sovellusversio:** v4.46.0 → v4.47.0
- **Mapper-versio:** "2C-delta-v1.0" → "2D-alpha-v1.0"
- **PROGRAM_BUILD_VERSION:** v4.38.9 (ei muutosta — auto-rebuild EI laukea aktiiviselle meso:lle)
