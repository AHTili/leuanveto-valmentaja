# VAIHE_2B_beta_SPECIFICATION.md
## Track B Vaihe 2B-β — Generaattorin UI-integraatio pää-sovellukseen

**Versio:** v1.0 (2026-05-11)
**Status:** Spec-vaihe. Track B Vaihe 2B-β toteuttaa koodin pohjalta.
**Onnistumiskriteeri:** "Wizardin suorittanut käyttäjä voi yhdellä klikkauksella
Asetuksista nähdä preview:n räätälöidystä ohjelmasta + aktivoida sen
mesocycleksi. Aktivointi luo pre-rebuild snapshotin jolloin käyttäjä voi
palauttaa edellisen aktiivisen ohjelman (esim. Akselin streetlifting_16w)
jos vaihto oli erehdys."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET 2B-α → 2B-β
═══════════════════════════════════════════════════════════════

2B-α toi pure-function-mapperin (`wizard/wizard-2b-mapper.js`) joka muuntaa
wizardConfig:n → generateCustomMesocycle-input. EI vielä UI:ta, ei
DB-kirjoituksia.

2B-β lisää:
- **"Generoi ohjelma" -painikkeen** Asetukset-näkymän "Henkilökohtainen ohjelma"
  -korttiin (näkyy kun wizard on valmis)
- **Preview-modaalin** joka näyttää generoidun mesocyclen yhteenvedon ennen
  aktivointia (goal, weekCount, primaries, recoveryCapacity, päätös-rules
  toggle:n takana)
- **Aktivoinnin** joka tallentaa mesocyclen LeVeCoachDB:hen + setActiveMesocycle
- **Pre-rebuild snapshot** turvanetiksi: käyttäjä voi palauttaa edellisen
  aktiivisen ohjelman (Akselin streetlifting_16w) jos vaihto oli erehdys
- **Kaksoisvahvistuksen** kun aktiivinen meso korvataan
- **Sovellusversion bumppi** v4.39.0 → v4.40.0 (käyttäjälle näkyvä ominaisuus
  + sw.js APP_VERSION PWA-päivitysbannerille)

2B-γ (myöhemmin) lisää q26-PR:t → movementProgress -migraation + q30-
energiabudjetti → volyymileikkauksen.

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

2B-β on **kapean skoopin UI-integraatio** joka käyttää 2B-α:n mapperia +
pää-app:in `generateCustomMesocycle`:a + olemassa olevia
`saveMesocycle`/`setActiveMesocycle`/`createPreRebuildSnapshot` -funktioita.

Käyttäjäpolku:
1. Asetukset-näkymä → "Henkilökohtainen ohjelma" -kortti → wizard valmis ✓
2. Klikki "Generoi ohjelma →" → preview-modaali avautuu
3. Käyttäjä näkee yhteenvedon: goal, weekCount, daysPerWeek, primaries[]
4. Käyttäjä voi toggle:lla nähdä "Näytä päätökset" → rules[] (selkeää suomea)
5. Klikki "Aktivoi tämä ohjelma" → (jos aktiivinen meso on olemassa)
   kaksoisvahvistus-dialogi → pre-rebuild snapshot → uuden meson tallennus
   + aktivointi → modaali sulkeutuu → redirect Dashboard:lle + toast

═══════════════════════════════════════════════════════════════
1. SCOPE — MITÄ TEHDÄÄN, MITÄ EI
═══════════════════════════════════════════════════════════════

### Tehdään 2B-β:ssa
- ✅ Asetukset-kortin laajennus: "Generoi ohjelma →" -painike (wizard-valmis-tila)
- ✅ Preview-modaali: renderGeneratorPreviewModal()
- ✅ handleGenerateProgram() — koko polku: validointi → mapping → preview → vahvistus → snapshot → save → activate
- ✅ Pre-rebuild snapshot ennen mesocycle-vaihtoa
- ✅ DecisionTrace-tallennus auditointia varten
- ✅ Kaksoisvahvistus jos aktiivinen meso on olemassa
- ✅ APP_VERSION-bumppi v4.40.0 + PROGRAM_BUILD_VERSION SÄILYY 4.38.9
  (sama logiikka kuin 2A:ssa — UI-vain-muutos)
- ✅ Toast onnistumiselle + virheille
- ✅ Redirect Dashboard:lle aktivoinnin jälkeen

### EI tehdä 2B-β:ssa (jää 2B-γ:lle)
- ❌ q26-PR:t → LeVeCoachDB.movementProgress -migraatio (ehdotetaan modaalissa
  mutta toteutus 2B-γ:ssa)
- ❌ q30-energiabudjetti → volyymileikkaus (preview näyttää että cut-tila on
  tunnistettu, mutta volyymin säätö tulee 2B-γ:ssa)
- ❌ Generoidun mesocyclen muokkausnäkymä (käyttäjä joko aktivoi tai peruu —
  säätö tehdään uudella wizard-kierroksella)

### Lukko-tiedostot
- ❌ engine.js (laskenta)
- ❌ test-runner.js (golden fixture)
- ❌ wizard/wizard-2b-mapper.js (2B-α:n pure-function — käytetään black-boxina)
- ❌ wizard/wizard-{schema,data,core,sw,styles,movement-bank,html}* (1A-1D)
- ❌ manifest.webmanifest

═══════════════════════════════════════════════════════════════
2. INPUT — Asetukset-näkymän tila
═══════════════════════════════════════════════════════════════

Asetukset-näkymä lukee jo 2A:ssa state.wizardStatus -kentästä:
```js
{
  exists: bool,
  completed: bool,
  schemaVersion: "3.3",
  migratedFrom: "v3.2" | null,
  lastStepIndex: 0-7,
  wizardId: string,
  completedAtISO: ISO | null,
}
```

2B-β:n logiikka renderWizardSettingsCard:lle:
- `!wizardStatus?.exists` → "Aloita wizard →" (ei muutosta)
- `wizardStatus.exists && !wizardStatus.completed` → "Jatka wizardia →"
- `wizardStatus.exists && wizardStatus.completed && wizardStatus.migratedFrom === "v3.2"`
  → "Täydennä wizard →" (oranssi korostus, kuten 2A:ssa)
- **UUSI: `wizardStatus.exists && wizardStatus.completed && !migratedFrom`**
  → kaksi painiketta: "Avaa wizard uudelleen →" + "Generoi ohjelma →"

═══════════════════════════════════════════════════════════════
3. ALGORITMI — handleGenerateProgram() askeleittain
═══════════════════════════════════════════════════════════════

```js
async function handleGenerateProgram() {
  // 1. Lue wizardConfig + mainAppState
  const wizardConfig = await getActiveWizardConfig(); // wizard-data.js
  if (!wizardConfig || !wizardConfig.completedAtISO) {
    showToast("Wizard pitää suorittaa loppuun ennen ohjelman generointia", "bad");
    return;
  }

  // 2. Rakenna mainAppState (luku-vain) 2B-α:n mapperia varten
  const mainAppState = {
    canRead: true,
    hasMovementProgress: state.allSets.length > 0, // 2A:n logiikalla
    hasMesocycles: !!state.mesocycle?.active,
    movementProgressData: await getAllMovementProgress(),
    activeMesocycle: state.mesocycle,
    allMovements: state.movements,
  };

  // 3. Mapping (2B-α)
  let mapped;
  try {
    mapped = mapWizardToMesocycle(wizardConfig, mainAppState);
  } catch (e) {
    showToast(`Mapping epäonnistui: ${e.message}`, "bad");
    return;
  }

  // 4. Avaa preview-modaali — käyttäjä päättää aktivointi/peruu
  const userConfirm = await showGeneratorPreviewModal(mapped);
  if (!userConfirm) return; // peruttu

  // 5. Pre-rebuild snapshot (TURVANETTI)
  // Jos aktiivinen meso on olemassa, snapshotataan ennen vaihtoa.
  // Käyttäjä voi palauttaa snapshot:sta jos vaihto oli erehdys.
  try {
    const snapName = `pre-wizard-generate-${nowISO().slice(0,10)}`;
    await createPreRebuildSnapshot(snapName);
    console.info(`[LeVe] ✓ Pre-rebuild snapshot luotu: ${snapName}`);
  } catch (e) {
    console.warn("[LeVe] Pre-rebuild snapshot epäonnistui (jatketaan):", e);
    // Ei keskeytetä — snapshot on suoja, ei välttämätön
  }

  // 6. Generoi mesocycle pää-app:n funktiolla (BLACK BOX)
  let newMeso;
  try {
    newMeso = generateCustomMesocycle(mapped, mapped.startDateISO);
    // Liitä 2B-α:n metadata customConfig:iin auditointia varten
    if (!newMeso.customConfig) newMeso.customConfig = {};
    newMeso.customConfig._wizardMeta = mapped._wizardMeta;
  } catch (e) {
    showToast(`Ohjelman generointi epäonnistui: ${e.message}`, "bad");
    return;
  }

  // 7. Tallenna + aktivoi
  try {
    await saveMesocycle(newMeso);
    await setActiveMesocycle(newMeso.mesocycleId);
    // Decision-trace audit-trail:iin
    await saveDecisionTrace({
      traceId: uid(),
      kind: "wizard-generate",
      createdAtISO: nowISO(),
      summary: `Räätälöity ohjelma generoitu wizardista — ${mapped.goal}, ${mapped.weekCount} vk`,
      data: { wizardId: wizardConfig.wizardId, mesocycleId: newMeso.mesocycleId,
              mapperVersion: mapped._wizardMeta.mapperVersion,
              rules: mapped._wizardMeta.rules },
    });
  } catch (e) {
    showToast(`Tallennus epäonnistui: ${e.message}`, "bad");
    return;
  }

  // 8. Päivitä state + redirect Dashboard:lle + toast
  state.mesocycle = newMeso;
  state.view = "dashboard";
  await computeRecommendation();
  render();
  showToast("Räätälöity ohjelma aktivoitu ✓", "ok", 5000);
}
```

═══════════════════════════════════════════════════════════════
4. PREVIEW-MODAALI — renderGeneratorPreviewModal(mapped)
═══════════════════════════════════════════════════════════════

### Rakenne (HTML-string innerHTML:llä, kuten pää-app käyttää)

```
┌─────────────────────────────────────────────────────────┐
│ Räätälöity ohjelma — preview                         × │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Tavoite: Hypertrofia (perustuen wizardin vastauksiin)   │
│ Kesto: 4 viikkoa                                        │
│ Päivät: 4 / viikko (Ma, Ke, Pe, La)                     │
│ Palautumiskapasiteetti: Keski                           │
│                                                         │
│ ─── Päämääräliikkeet (4) ───                            │
│ • Lisäpainoleuanveto (vertikaaliveto)                  │
│ • Lisäpainodippi (horisontaalityöntö)                  │
│ • Takakyykky (alaraaja)                                │
│ • Muscle-up (vertikaaliveto)                           │
│                                                         │
│ [▶ Näytä päätökset] ← toggle                            │
│                                                         │
│ ⚠ Korvaat aktiivisen ohjelman:                          │
│   Streetlifting 16 vk (vk 3/16)                         │
│   Edellinen ohjelmasi tallennetaan snapshot:ksi —       │
│   voit palauttaa sen Asetuksista jos vaihto oli väärin. │
│                                                         │
├─────────────────────────────────────────────────────────┤
│         [Peru]   [Aktivoi tämä ohjelma]                 │
└─────────────────────────────────────────────────────────┘
```

### Toggle: "Näytä päätökset" — laajennettu näkymä

```
─── Päätökset (auditointi) ───
• Aiempi blokki "Peaking" → aloitusblokki "Hypertrofia"
  [Issurin block-malli]
• Elite-taso → 4 vk hypertrofia-blokki
  [Petré 2021 kvalitatiivinen]
• Volyymipreferenssi "MAV" → palautumiskapasiteetti "Keski"
  [Käytännöllinen tier-mapping]
• Liikejärjestys: päämääräliikkeet → kategoria-järjestyksessä
  [Standardi voimaharjoittelu-konventio]
```

**KRIITTINEN:** UI:ssa näytettävät source-stringit ovat **selkeää suomea ilman
tutkijaviittauksia** (auto-memory:n `feedback_ui_no_research_names.md` mukaisesti).
Tutkijaviittaukset (Issurin, Petré, Huiberts, Nunes, ACSM) säilyvät vain
`_wizardMeta.rules`-objektissa joka tallennetaan decisionTrace:n kautta —
ne ovat käytettävissä auditoinnissa mutta EIVÄT näy käyttäjälle.

Mapping selkeät suomenkieliset selitykset:
- "Issurin 2010 block-malli" → "Periodisaatio-perusperiaate"
- "Petré 2021 kvalitatiivinen" → "Kokemustason mukainen tavanomainen pituus"
- "Huiberts 2024" → "Lisäkestävyysharjoittelu + miehet + edistynyt"
- "Pää-app:in volume-tier-konventio" → "Volyymipreferenssin mukainen"

Tämä mapping tehdään render-vaiheessa renderRuleSourceLabel(rule.source).

### Kaksoisvahvistus (jos aktiivinen meso korvataan)

Jos `state.mesocycle?.active === true`, modaalissa näytetään lisäosio:
```
⚠ Korvaat aktiivisen ohjelman: <state.mesocycle.label> (vk X/Y)
  Edellinen ohjelmasi tallennetaan snapshot:ksi.

  ☐ Ymmärrän — korvataan
```

Käyttäjän pitää klikata checkbox aktiivisuussäännön mukaisesti ennen kuin
"Aktivoi tämä ohjelma" -painike on enabled.

═══════════════════════════════════════════════════════════════
5. SOVELLUSVERSIO v4.40.0
═══════════════════════════════════════════════════════════════

sw.js:n APP_VERSION nostetaan 4.39.0 → 4.40.0. Perustelu: käyttäjälle näkyvä
uusi ominaisuus joka muuttaa pää-app:n toimintaa.

data.js:n PROGRAM_BUILD_VERSION **SÄILYY 4.38.9:ssä** (sama logiikka kuin 2A).
Syy: weekPlans-rakenne / PRESET_MOVEMENTS / DayN-funktiot eivät muutu →
streetlifting_16w-mesocyclen auto-rebuild EI saa laueta.

═══════════════════════════════════════════════════════════════
6. AKSELIN POLKU 2B-β:n jälkeen
═══════════════════════════════════════════════════════════════

### Skenaario A: Akseli haluaa kokeilla wizardia 16w:n aikana
1. Akseli avaa Asetukset → näkee uuden kortin "Henkilökohtainen ohjelma — Ei aloitettu"
2. Klikkaa "Aloita wizard →" → täyttää 22 kysymystä (q26 + q29 skipataan
   koska movementProgress + mesocycles aktiivinen)
3. Wizard valmis ✓ — paluu Asetuksiin
4. Klikkaa "Generoi ohjelma →" → preview-modaali näyttää:
   - "Tavoite: Hypertrofia (4 vk, elite-tier)"
   - "⚠ Korvaat aktiivisen ohjelman: Streetlifting 16 vk (vk 3/16)"
   - Akseli päättää **peruuttaa** koska ei halua keskeyttää 16w-mesoa
5. Streetlifting_16w jatkuu ennallaan, wizard-konfig tallessa

### Skenaario B: Akseli haluaa vaihtaa ohjelman wizardin pohjalta
1. Sama 1-4 kuin yllä
2. Akseli tikkaa checkbox "Ymmärrän — korvataan"
3. Klikkaa "Aktivoi tämä ohjelma" → snapshot luodaan automaattisesti
4. Streetlifting_16w korvautuu uudella hypertrofia-4vk-mesolla
5. Dashboard näyttää uuden ohjelman vk 1/4
6. **Jos Akseli haluaa palauttaa streetlifting_16w:n:** Asetukset →
   "Auto-backup snapshots" → valitse "pre-wizard-generate-2026-05-11" →
   "Palauta"

### Skenaario C: 16w päättyy elokuussa, Akseli generoi uuden
1. Streetlifting_16w vk 16/16 päättyy
2. Akseli avaa wizardin uudelleen → täydentää q26 (PR:t, jos haluaa) +
   q29 (= "peaking" tai "deload" joko itse valitsemansa mukaan)
3. Klikkaa "Generoi ohjelma →" → preview näyttää:
   - "Tavoite: Hypertrofia (peakingin jälkeen suositeltu — Issurin block-malli)"
   - "4 vk, 4 päämääräliikettä, recoveryCapacity hyva"
4. Klikkaa "Aktivoi" → koska aktiivinen meso on jo päättynyt, ei
   kaksoisvahvistusta tarvita → suoraan aktivointi → uusi blokki alkaa

═══════════════════════════════════════════════════════════════
7. UUDEN KÄYTTÄJÄN POLKU 2B-β:n jälkeen
═══════════════════════════════════════════════════════════════

1. Uusi käyttäjä avaa sovelluksen → onboarding-banneri (2A:n logiikka) →
   klikkaa "Aloita wizard"
2. Täyttää 30 kysymystä → wizard valmis ✓
3. Sovellus palaa pää-app:iin → Dashboard näyttää default-meson (jonka init()
   loi 2A:ssa)
4. Käyttäjä menee Asetukset → "Henkilökohtainen ohjelma" → "Generoi ohjelma"
5. Preview-modaali: "Tavoite: Hypertrofia (8 vk, beginner-tier)" + "1
   päämääräliike: Lisäpainoleuanveto"
6. Aktivointi → default-mesocycle korvautuu räätälöidyllä
7. Snapshot luodaan ennen vaihtoa → käyttäjä voi palauttaa default:n jos
   haluaa

═══════════════════════════════════════════════════════════════
8. EDGE CASES
═══════════════════════════════════════════════════════════════

### Wizard kesken (ei valmis)
- Painike "Generoi ohjelma →" EI näy. Sen tilalla "Jatka wizardia →".

### Wizard 3.2 migratoitu mutta ei täydennetty
- migratoitu-bannerissa "Täydennä wizard →" — generoi ei sallittu kunnes
  wizard 3.3 valmis (q26-q30 vastattu).

### Wizard valmis mutta validateMappingInput palauttaa virheitä
- handleGenerateProgram katchaa Error:n → showToast("Mapping epäonnistui:
  <reason>", "bad") → modaali EI avaudu

### generateCustomMesocycle palauttaa virheen (esim. tuntematon goal)
- Sama showToast-virhepolku. Käyttäjä näkee virheilmoituksen.

### Pre-rebuild snapshot epäonnistuu (kiintolevy täynnä, IDB-quota)
- Lokitetaan console.warn. EI keskeytetä aktivointia — snapshot on suoja,
  mutta jos se epäonnistuu, käyttäjä saa silti uuden meson. Toastissa
  selvitys: "Räätälöity ohjelma aktivoitu ✓ (HUOM: snapshot epäonnistui)"

### Käyttäjä peruuttaa modaalin
- Mitään muutosta ei tehdä. wizardConfig säilyy LeVeWizardDB:ssä.

### Käyttäjä avaa preview-modaalin, sulkee selaimen
- Modaali on UI-tila, ei DB-tallennusta → seuraava avaus aloittaa tyhjältä.

### Aktivoitu mesocycle on samankaltainen kuin nykyinen
- Ei erityiskäsittelyä. Käyttäjä saa identtisen meson — pre-rebuild snapshot
  on silti turvassa.

═══════════════════════════════════════════════════════════════
9. ROADMAP — VAIHE 2B-β (~4-6h)
═══════════════════════════════════════════════════════════════

**T1: Importit + renderWizardSettingsCard-laajennus** (~30 min)
- Lisää index.html:ään import mapWizardToMesocycle, MAPPER_VERSION
  wizard-2b-mapper.js:stä
- Lisää importit saveMesocycle, setActiveMesocycle, saveDecisionTrace,
  createPreRebuildSnapshot, generateCustomMesocycle data.js:stä (jo siellä)
- Lisää importit getAllMovementProgress, getActiveWizardConfig
  wizard-data.js:stä (jälkimmäinen vaatii import)
- renderWizardSettingsCard:n laajennus uudella "Generoi ohjelma →" -painikkeella
  wizard-valmis-tilassa

**T2: renderGeneratorPreviewModal(mapped) — uusi funktio** (~90 min)
- Modaali-DOM-rakenne (overlay + sisältökontteli)
- Yhteenveto-osio: goal, weekCount, daysPerWeek, primaries
- Toggle "Näytä päätökset" — _wizardMeta.rules käyttäjäystävällisesti
- Korvaa-aktiivinen-meso -varoitus + checkbox
- Peru-/Aktivoi-painikkeet
- renderRuleSourceLabel(source) — tutkijanimien sanaston mappaus

**T3: handleGenerateProgram() — main async-funktio** (~60 min)
- Spec §3:n koko algoritmi
- Virheen käsittely + showToast-virheviestit
- decisionTrace-tallennus
- State-päivitys + redirect Dashboard:lle

**T4: Painike + modaalin kytkentä** (~30 min)
- data-action="generate-program" → handleGenerateProgram
- $$("[data-action='generate-program']")-event-listener (sama pattern kuin 2A)

**T5: APP_VERSION-bumppi + sw.js cache-tarkistus** (~10 min)
- sw.js APP_VERSION 4.39.0 → 4.40.0
- CORE_ASSETS sisältää jo wizardin (2A:sta), tarkista että
  wizard-2b-mapper.js on listalla

**T6: Manuaalitestit selaimessa** (~30-60 min)
- Akselin profiili (preview näkyy, kaksoisvahvistus, snapshot luodaan,
  aktivointi onnistuu, dashboard päivittyy)
- Uusi käyttäjä (sama mutta ilman aktiivista mesoa → ei kaksoisvahvistusta)
- Wizard 3.2 migratoitu (ei "Generoi ohjelma" -painiketta)
- Virhe-skenaario (wizardConfig.completedAtISO=null → toast)
- Palautus snapshot:sta toimii

**T7: commit + push**

═══════════════════════════════════════════════════════════════
10. HYVÄKSYMISKRITEERIT — VAIHE 2B-β
═══════════════════════════════════════════════════════════════

1. `node --check sw.js data.js` OK (index.html testataan selaimessa)
2. Pää-app:in `test-runner.js` golden fixture edelleen vihreä (engine.js
   koskematon → laskenta säilyy ennallaan)
3. Wizardin suorittanut käyttäjä näkee "Generoi ohjelma →" -painikkeen
   Asetukset-näkymässä
4. Painikkeen klikki avaa preview-modaalin jossa näkyy goal, weekCount,
   daysPerWeek, primaries[]
5. Toggle "Näytä päätökset" laajentaa rules[]-listan käyttäjäystävällisesti
   (EI tutkijaviittauksia)
6. Jos aktiivinen meso on olemassa: kaksoisvahvistus-checkbox näkyy +
   "Aktivoi"-painike on disabled kunnes checkbox tikattu
7. Aktivointi luo pre-rebuild snapshot:n ennen mesocycle-vaihtoa
8. Aktivointi tallentaa uuden mesocyclen + setActiveMesocycle + saveDecisionTrace
9. Aktivointi sulkee modaalin + redirect Dashboard:lle + toast "Räätälöity
   ohjelma aktivoitu ✓"
10. Snapshot löytyy Asetukset-näkymästä → palautus toimii (= edellinen meso
    palautuu)
11. Sovellusversio v4.40.0 + PROGRAM_BUILD_VERSION säilyy 4.38.9
12. wizard-2b-mapper.js on käytetty mutta EI muokattu
    (`git diff origin/main -- wizard/wizard-2b-mapper.js` tyhjä)
13. Akselin streetlifting_16w-skenaario: ennen aktivointia näkyy varoitus,
    aktivointi luo snapshot:n joka palauttaa 16w-meson kunnioittaen vk 3/16-positiota

═══════════════════════════════════════════════════════════════
11. KIELLETYT
═══════════════════════════════════════════════════════════════

1. **Älä muokkaa 2B-α:n mapperia.** `wizard/wizard-2b-mapper.js` käytetään
   black-boxina. Jos mapping vaatii muutosta, korjataan 2B-α erillisessä
   commitissa.

2. **Älä lisää tutkijaviittauksia UI-stringeihin.** Issurin/Petré/Huiberts
   /Nunes/ACSM säilyvät vain `_wizardMeta.rules`-objektissa joka tallennetaan
   decisionTrace:n kautta. Preview-modaalissa käytetään selkeää suomea
   (`renderRuleSourceLabel`-mappaus).

3. **Älä muokkaa engine.js:ää eikä test-runner.js:ää.** Laskenta säilyy
   ennallaan. 2B-β on UI- ja DB-kerroksen lisäys.

4. **Älä muokkaa pää-app:in generateCustomMesocycle-funktiota.** Käytetään
   black-boxina.

5. **Älä lisää uusia kysymyksiä wizardiin eikä uusia kenttiä
   wizardConfig.answers:iin.** 3.3 on lukko.

6. **Älä aktivoi uutta mesocyclea ilman pre-rebuild snapshot:a JOS aktiivinen
   meso on olemassa.** Snapshot on KÄYTÄNNÖSSÄ pakollinen turvallisuussyistä.
   Jos snapshot epäonnistuu, lokitus console.warn:lle ja jatketaan, mutta
   tämä on jälkimmäisen vain hätätilanteita varten.

7. **Älä bumppaa PROGRAM_BUILD_VERSION:ä** (2B-β on UI-vain-muutos, weekPlans
   ei muutu → auto-rebuild EI saa laueta).

8. **Älä yritä mergata 2B-β:tä ennen testausta selaimessa.** Hyväksymiskriteerit
   8-10 (snapshot + palautus) vaativat manuaalisen testauksen.

9. **Älä lisää generaattorin ohjelmaan ohjelma-laskentaa wizard-3.3:ssa
   olemattomille parametreille.** Esim. q26-PR:t → movementProgress on
   2B-γ:n työ — jätä huomioimatta tässä vaiheessa.

10. **Kolmas paikkaus = signaali refaktoroida.** Sama kuri kuin 1A-1D + 2A + 2B-α.

═══════════════════════════════════════════════════════════════
12. RIIPPUVUUDET JA TARKISTUSLISTA
═══════════════════════════════════════════════════════════════

### Vaaditut funktiot pää-app:ista (kaikki olemassa)
- `generateCustomMesocycle(answers, startDateISO)` — data.js 3810
- `saveMesocycle(meso)` — data.js
- `setActiveMesocycle(mesoId)` — data.js
- `createPreRebuildSnapshot(name)` — data.js
- `saveDecisionTrace(trace)` — data.js
- `getActiveWizardConfig()` — wizard-data.js
- `getAllMovementProgress()` — data.js
- `nowISO()`, `uid()` — data.js

### Vaaditut funktiot 2B-α-mapperista (kaikki olemassa)
- `mapWizardToMesocycle(config, state)` — wizard-2b-mapper.js
- `MAPPER_VERSION` — wizard-2b-mapper.js

### Lisättävät tiedostoluokat (CSS pää-app:in tyyleihin pohjautuen)
- `.wiz-generator-modal` (modal-overlay)
- `.wiz-generator-content` (white card center)
- `.wiz-generator-summary-row` (label: value)
- `.wiz-generator-rules` (collapse content)
- `.wiz-generator-warning` (active meso replace warning)

═══════════════════════════════════════════════════════════════
13. VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v1.0 (2026-05-11):** Spec-pohja. 2B-β:n scope, UI-rakenne, algoritmi,
  Akselin polut. APP_VERSION 4.40.0, PROGRAM_BUILD_VERSION 4.38.9.

═══════════════════════════════════════════════════════════════
LOPPUSANAT
═══════════════════════════════════════════════════════════════

2B-β on **kapean skoopin UI-integraatio** joka kytkee 2B-α:n pure-function-
mapperin pää-app:n DB:hen ja Dashboard:lle. Käyttää olemassa olevia
saveMesocycle/setActiveMesocycle/createPreRebuildSnapshot -funktioita —
EI rakenneta uusia DB-rajapintoja.

Pre-rebuild snapshot on **kriittinen turvallisuus-mekanismi** Akselin
streetlifting_16w-meso:n suojaamiseksi: jos käyttäjä vahingossa korvaa
aktiivisen ohjelman, snapshot:sta voi palauttaa edellisen tilan
kunnioittaen vk-positiota ja edistystä.

2B-γ:lle jää q26-PR-migraatio (movementProgress:n täyttö) + q30-
energiabudjetin volyymileikkaus. 2B-β tarjoaa UI-rajapinnan johon nämä
voidaan kytkeä myöhemmin.
