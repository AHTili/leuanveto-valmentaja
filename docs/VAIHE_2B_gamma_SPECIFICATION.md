# VAIHE_2B_gamma_SPECIFICATION.md
## Track B Vaihe 2B-γ — PR-migraatio + energiabudjetti

**Versio:** v1.0 (2026-05-11)
**Status:** Viimeinen Track B -vaihe. Toteuttaa Vaihe 2B:n loppuun.
**Onnistumiskriteeri:** "Uusi käyttäjä voi täyttää wizard 3.3:n (sis. q26-PR:t
ja q30-energiabudjetti) ja generoida ohjelman jonka pohjana on PR-datasta
laskettu e1RM (= kalibrointi-session ohittaminen). Cut-tilassa ohjelman
volyymitavoite leikataan Helms 2018 -pohjaisesti."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET 2B-β → 2B-γ
═══════════════════════════════════════════════════════════════

2B-β kytki wizard-pohjaisen generaattorin pää-app:n UI:hin ja DB:hen,
mutta q26 (PR:t) ja q30 (energiabudjetti) jätettiin _tiedoksi_ —
generaattori ei käyttänyt niitä.

2B-γ lisää:
- **q26-PR-migraatio**: external/system-tyyppiset PR:t (penkki, kyykky,
  lisäpaino-leuka jne.) tallentuvat LeVeCoachDB.movementProgress:iin
  e1RM-baselineiksi. Cal-session ohittaminen uudelle käyttäjälle.
- **q30-energiabudjetti**: cut-tilassa (q14=yes) syvä vaje (q30.deficitKcal
  ≥ 500) säätää generaattorin recoveryCapacity:n "heikko" → volyymileikkaus.
- **Preview-modaali laajennus**: cut-tilan tiedotus + PR-migraation
  yhteenveto (näkyy jos q26 sisältää migroitavia rivejä)
- **APP_VERSION bumppi** v4.40.0 → v4.41.0

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

| # | Tehtävä | Sijainti |
|---|---------|----------|
| 1 | q26 → movementProgress -migraatio | handleGenerateProgram (index.html) |
| 2 | q30 → recoveryCapacity-säätö (cut-aggressive) | pickRecoveryCapacity (wizard-2b-mapper.js) |
| 3 | Preview-modaali: cut-banneri + PR-migraatio-yhteenveto | renderGeneratorPreviewModal |
| 4 | _wizardMeta.rules-laajennus | collectAppliedRules |
| 5 | APP_VERSION 4.40.0 → 4.41.0 | sw.js |

**HUOM:** 2B-γ on **AINOA poikkeus** 2B-β:n § 11 -säännöstä joka sanoi
"Älä muokkaa 2B-α:n mapperia". Energiabudjetti-logiikka kuuluu MAPPING-
alueeseen (kysymys → recoveryCapacity-päätös), joten 2B-α:n
`pickRecoveryCapacity` LAAJENNETAAN q30-säännöllä. Tämä on tarkkaan
rajattu muutos — selfTestMapper-testit päivitetään vastaavasti.

═══════════════════════════════════════════════════════════════
1. PR-MIGRAATIO — q26 → movementProgress
═══════════════════════════════════════════════════════════════

### Lähtötilanne

q26_personalRecords on array:
```js
[
  { movementId: "fb_backsquat", movementName: "Takakyykky", loadType: "external", weightKg: 185, reps: 3 },
  { movementId: "fb_addedweight_pullup", movementName: "Lisäpainoleuanveto", loadType: "system", weightKg: 85, reps: 1 },
  { movementId: "fb_front_lever", movementName: "Front Lever", loadType: "isometric_hold", holdSeconds: 12 },
]
```

### Migraatio-säännöt

**GUARD** (spec K3): EI ylikirjoita olemassa olevia movementProgress.e1RM-arvoja.
Jos pää-app:in storessa on jo `movement.e1RM > 0` kyseiselle liikkeelle,
SKIP + log decisionTrace:en.

**Vain external + system migroidaan e1RM-baselineina.** isometric_hold
jää wizard-config:iin tiedoksi mutta EI tallennu movementProgress:iin —
isometric e1RM-malli on oma kokonaisuutensa (mahdollinen 2B-δ).

**Movement-id-mappaus**:
- fb-prefixed id (esim. "fb_backsquat") → etsi pää-app:in `movements`-storesta
  movement jonka name vastaa fallback-pankin nimeä
- Pää-app-id (esim. "abc123-...") → suora käyttö
- "fb_custom_other" + movementName → ohitetaan (uutta liikettä ei luoda
  automaattisesti pää-app:in puolelle, käyttäjä lisää manuaalisesti)

### e1RM-laskenta

Epley-formula (standardi, käytössä pää-app:in engine.js:ssä):
```js
e1RM = weight × (1 + reps / 30)
```

System-tyyppisille liikkeille (lisäpaino-leuka, lisäpaino-dippi, muscle-up):
e1RM = (weight + bodyweight) × (1 + reps / 30) — koska systeemikuorma sisältää
kehonpainon. Pää-app:in `e1rmSystem`-funktio engine.js:ssä tekee tämän, mutta
yksinkertaistettuna kun reps on jo huomioitu Epley:llä, voimme käyttää
suoraan `weight` -arvoa joka edustaa _lisäpainoa_ ja säilyttää movementProgress:n
loadKg-kentässä bodyweight-osuus erikseen.

**Toteutus 2B-γ:ssa konservatiivinen**: tallennetaan `loadKg = item.weightKg`
ja `reps = item.reps`, ja LASKETAAN e1RM Epley:llä ulkoiselle kuormalle.
Pää-app:n recommend-engine huomioi system/external-eron omalla logiikallaan.

```js
function computeE1RMFromPR(item) {
  if (item.loadType !== "external" && item.loadType !== "system") return null;
  const w = Number(item.weightKg);
  const r = Number(item.reps);
  if (Number.isNaN(w) || Number.isNaN(r) || w < 0 || r < 1) return null;
  return w * (1 + r / 30);
}
```

### Movement-storen tarkistus

```js
async function findMatchingMovement(prItem, allMovements) {
  // 1. Jos pr-item.movementId on pää-app-id (UUID-tyylinen, ei "fb_"-prefix)
  if (!prItem.movementId.startsWith("fb_")) {
    return allMovements.find(m => m.movementId === prItem.movementId) || null;
  }
  // 2. Fallback-pankin id → mappaa name:n perusteella
  const nameL = prItem.movementName.toLowerCase().trim();
  return allMovements.find(m => m.name.toLowerCase().trim() === nameL) || null;
}
```

### Migraatio-funktio

```js
async function migrateWizardPRsToMovementProgress(wizardConfig, allMovements) {
  const prs = wizardConfig.answers.q26_personalRecords;
  if (!Array.isArray(prs) || prs.length === 0) {
    return { migrated: 0, skipped: 0, isometricCount: 0, errors: [] };
  }
  let migrated = 0, skipped = 0, isometricCount = 0;
  const errors = [];

  for (const pr of prs) {
    if (pr.loadType === "isometric_hold") {
      isometricCount++; // wizard-config:iin tiedoksi, ei DB-migraatiota
      continue;
    }
    const movement = await findMatchingMovement(pr, allMovements);
    if (!movement) {
      errors.push({ pr, reason: "Liike ei löydy pää-app:n liikepankista" });
      continue;
    }
    // GUARD: tarkista olemassa oleva movementProgress
    const existing = await getMovementProgress(movement.movementId);
    if (existing && typeof existing.e1RM === "number" && existing.e1RM > 0) {
      skipped++;
      continue;
    }
    const e1RM = computeE1RMFromPR(pr);
    if (e1RM === null) {
      errors.push({ pr, reason: "e1RM-laskenta epäonnistui (paino/reps virheellinen)" });
      continue;
    }
    await saveMovementProgress({
      movementId: movement.movementId,
      e1RM,
      lastUpdatedISO: nowISO(),
      source: "wizard-2b-gamma",
      sourceWizardId: wizardConfig.wizardId,
      // Kopioi alkuperäinen PR-data auditointia varten
      _originalPR: { ...pr },
    });
    migrated++;
  }

  return { migrated, skipped, isometricCount, errors };
}
```

═══════════════════════════════════════════════════════════════
2. q30 → recoveryCapacity (energiabudjetti)
═══════════════════════════════════════════════════════════════

### Sääntö

**Helms 2018 Front Physiol 9:247** (PDF-VERIFIOITU 2B:n tutkimusvelassa):
- Vaje 10-20% maintenance:sta on _kestävä_ → ei volyymileikkausta tarvitse
- Vaje > 20% (= >500 kcal/päivä 91 kg atletille) → aggressiivinen,
  volyymileikkaus pakollinen

### pickRecoveryCapacity-laajennus

Lisätään cut-aggressive-tarkistus ENNEN nykyistä Huiberts-CT-tarkistusta:

```js
export function pickRecoveryCapacity(answers) {
  // 1. UUSI (2B-γ): aggressive cut → heikko (Helms 2018)
  // Cut + suuri vaje → volyymileikkaus pakollinen.
  if (answers.q14_cutting === "yes" && answers.q30_energyBudget) {
    const deficitKcal = Number(answers.q30_energyBudget.deficitKcal);
    if (!Number.isNaN(deficitKcal) && deficitKcal >= 500) {
      return "heikko";
    }
  }

  // 2. (2B-α): Huiberts CT-male-advanced → heikko
  const hasCT = answers.q15_aerobicModality !== "none";
  const isMale = answers.q02_sex === "male";
  const isAdvancedPlus = answers.q08_selfLevel === "advanced" || answers.q08_selfLevel === "elite";
  if (hasCT && isMale && isAdvancedPlus) {
    return "heikko";
  }

  // 3-5. (2B-α): q23-pohjainen, q23="auto" + advanced, default
  // ... (entinen logiikka)
}
```

### Test-case-laajennus

selfTestMapper saa uusia testejä:
- `q14=yes + q30.deficitKcal=600 → heikko` (cut aggressive)
- `q14=yes + q30.deficitKcal=300 → q23-pohjainen` (cut mieto, ei muutosta)
- `q14=no + q30 missing → q23-pohjainen` (ei cut)

═══════════════════════════════════════════════════════════════
3. PREVIEW-MODAALI — laajennus
═══════════════════════════════════════════════════════════════

### Cut-banneri (jos q14=yes)

Lisätään modaalin body:hyn varoitus jos cut on aktiivinen:
```
💧 Cut-tila aktiivinen
  Energiavaje: 600 kcal/päivä (aggressive)
  → Palautumiskapasiteetti säädetty "heikko":ksi (volyymileikkaus)
```

### PR-migraation yhteenveto (jos q26 sisältää migroitavia)

Lisätään modaalin body:hyn:
```
📊 PR-data
  • 2 PR:ää tallennetaan e1RM-baselineiksi:
    - Takakyykky: 185 kg × 3 → e1RM 203 kg
    - Lisäpainoleuanveto: 85 kg × 1 → e1RM 88 kg
  • 1 isometric-pito jätetään tiedoksi (ei migroidu):
    - Front Lever: 12 s
  • 0 ohitettu (olemassa olevat baselinet säilyvät)
```

Tämä lasketaan ENNEN aktivointia (read-only). Aktivointi tekee
varsinaisen migraation handleGenerateProgram:ssa.

═══════════════════════════════════════════════════════════════
4. HANDLEGENERATEPROGRAM — laajennus
═══════════════════════════════════════════════════════════════

Lisätään vaiheen 6 jälkeen (saveMesocycle/setActiveMesocycle):

```js
// 9. UUSI (2B-γ): q26-PR-migraatio movementProgress:iin
const prResult = await migrateWizardPRsToMovementProgress(wizardConfig, state.movements);
if (prResult.migrated > 0) {
  // Päivitä state.movementProgress
  state.movementProgress = await getAllMovementProgress();
}
// Lisää decisionTrace:en
await saveDecisionTrace({
  traceId: uid(),
  kind: "wizard-pr-migration",
  createdAtISO: nowISO(),
  summary: `PR-migraatio: ${prResult.migrated} migroitu, ${prResult.skipped} ohitettu, ${prResult.isometricCount} isometric-tiedoksi`,
  data: { wizardId: wizardConfig.wizardId, ...prResult },
});

// 10. Toast-viestin laajennus
const prMsg = prResult.migrated > 0
  ? ` + ${prResult.migrated} PR e1RM-baselineiksi`
  : "";
showToast(`Räätälöity ohjelma aktivoitu ✓${prMsg}`, "ok", 6000);
```

═══════════════════════════════════════════════════════════════
5. ROADMAP — VAIHE 2B-γ (~3-5h)
═══════════════════════════════════════════════════════════════

**T1: pickRecoveryCapacity-laajennus wizard-2b-mapper.js:ssä** (~30 min)
- Cut-aggressive-tarkistus ennen Huiberts-säännön
- selfTestMapper-testien laajennus (3 uutta testiä)
- _wizardMeta.rules: lisätään cut-aggressive-sääntö kun se aktivoituu

**T2: migrateWizardPRsToMovementProgress index.html:ssä** (~60 min)
- findMatchingMovement-helperi
- computeE1RMFromPR Epley-formulalla
- GUARD: olemassa olevien e1RM-arvojen säilytys
- Isometric-tyyppien tunnistus (vain laskenta, ei migraatio)

**T3: Preview-modaali laajennus** (~30 min)
- Cut-banneri (renderCutWarning)
- PR-migraatio-yhteenveto (renderPRMigrationSummary)
- Preview-laskenta käyttää computeE1RMFromPR + findMatchingMovement (read-only)

**T4: handleGenerateProgram-laajennus** (~30 min)
- Vaihe 9 + 10 (migraatio + decisionTrace + toast-laajennus)

**T5: APP_VERSION 4.40.0 → 4.41.0** (~5 min)

**T6: Manuaalitestit selaimessa** (~30-60 min)
- Akseli (q26 skippautuu mainAppState:n takia → ei migraatiota)
- Uusi käyttäjä + q26 = 3 PR:ää → 2 migroidaan, 1 isometric-tiedoksi
- Cut-skenaario: q14=yes + q30.deficitKcal=600 → recoveryCapacity=heikko
- GUARD: jos movementProgress:ssa on jo arvoja, skip-counter kasvaa

**T7: Commit + push**

═══════════════════════════════════════════════════════════════
6. HYVÄKSYMISKRITEERIT
═══════════════════════════════════════════════════════════════

1. node --check wizard/wizard-2b-mapper.js + sw.js + data.js OK
2. selfTestMapper 76 → 80+ testiä vihreänä (uusia testejä cut-aggressive:lle)
3. Pää-sovellus 100% koskematon (engine.js, test-runner.js, data.js,
   manifest.webmanifest, wizard/wizard-{schema,data,core,sw,styles,
   movement-bank,html}* tyhjä diff)
4. Akselin profiilille (movementProgress jo olemassa) q26 EI näy →
   migraatio-laskuri = 0 (skip-määrä mahdollinen)
5. Uudelle käyttäjälle q26-PR:t migroidaan e1RM-baselineiksi
6. Cut-aggressive-sääntö aktivoituu kun q14=yes + q30.deficitKcal ≥ 500
7. PR-migraatio EI ylikirjoita olemassa olevia movementProgress.e1RM-arvoja
8. Isometric_hold-PR:t jätetään wizard-config:iin, EI migroida
9. decisionTrace kind="wizard-pr-migration" tallennettu
10. Sovellusversio v4.41.0; PROGRAM_BUILD_VERSION säilyy 4.38.9
11. _wizardMeta.rules sisältää cut-aggressive-säännön kun se aktivoituu

═══════════════════════════════════════════════════════════════
7. KIELLETYT
═══════════════════════════════════════════════════════════════

1. **Älä luo uusia liikkeitä pää-app:in movements-storeen.** Jos
   findMatchingMovement palauttaa null → SKIP + error log.
2. **Älä migroidaan isometric_hold-PR:itä.** Ne ovat 2B-δ:n työ.
3. **Älä lisää tutkijaviittauksia UI-stringeihin.** Cut-banneri sanoo
   "Energiavaje 600 kcal/päivä → palautumiskapasiteetti 'heikko'"
   — EI "Helms 2018 mukaan".
4. **Älä muokkaa engine.js:n e1rm-laskentaa.** PR-migraatio käyttää
   yksinkertaista Epley:tä. Engine:n recommend käsittelee
   system/external-erot omalla logiikallaan.
5. **GUARD on pakollinen.** Olemassa olevien e1RM-arvojen
   ylikirjoittaminen on KIELLETTY.
6. **Älä bumppaa PROGRAM_BUILD_VERSION:ä.** Sama logiikka kuin 2A + 2B-β:
   ohjelma-rakenne ei muutu → auto-rebuild EI saa laueta.

═══════════════════════════════════════════════════════════════
8. AKSELIN POLKU 2B-γ:n jälkeen
═══════════════════════════════════════════════════════════════

### Skenaario A: Akseli avaa wizardin 16w:n aikana
- mainAppState.hasMovementProgress = true → q26 EI näy (skipIfMainAppHas)
- Mapping → goal=hypertrofia (peakingin jälkeen), recoveryCapacity=keski
  (q23=MAV, ei CT, q14=no)
- Aktivointi: ei PR-migraatiota (q26 array on tyhjä)
- decisionTrace logaa: "PR-migraatio: 0 migroitu (q26 skipattu mainAppState)"

### Skenaario B: Uusi käyttäjä cut-vaiheessa
- Käyttäjä täyttää wizardin → q14=yes, q30={deficitKcal: 600, proteinGPerKg: 2.0}
- q26 sis. 3 PR:ää (2 external + 1 isometric)
- mapWizardToMesocycle → recoveryCapacity=heikko (cut-aggressive)
- Preview-modaali näyttää: cut-banneri + PR-migraatio-yhteenveto
  "2 migroidaan, 1 isometric-tiedoksi, 0 ohitettu"
- Aktivointi: PR-migraatio onnistuu, e1RM-baselinet tallessa,
  ohjelma volyymileikattu

═══════════════════════════════════════════════════════════════
9. VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v1.0 (2026-05-11):** Spec-pohja. 2B-γ tehtävät, hyväksymiskriteerit,
  Akselin polut. APP_VERSION 4.41.0.

═══════════════════════════════════════════════════════════════
LOPPUSANAT
═══════════════════════════════════════════════════════════════

2B-γ on **Track B:n viimeistely**. PR-migraatio mahdollistaa cal-session
ohittamisen uudelle käyttäjälle (q26 → e1RM-baselinet). Energiabudjetti
säätää generaattorin volyymitavoitetta cut-tilassa Helms 2018 -pohjaisesti.

Tämän jälkeen Track B on kokonaisuutena valmis: wizard kerää 30 vastausta
→ mapper kääntää ne mesocycle-inputiksi → generaattori tuottaa ohjelman
→ aktivointi tallentaa + kytkee + suojaa snapshot:lla → PR:t täyttävät
e1RM-baselinet → ohjelma alkaa toimia ensimmäisestä päivästä.

Akseli voi käyttää järjestelmää 16w:n päättymisen jälkeen täydellisessä
konfiguraatiossa: wizard nopeasti (q26 + q29 skipataan jo olemassa olevan
datan takia), generaattori tuottaa hypertrofia-blokin Issurin-säännön
mukaisesti, ja ohjelma alkaa kunnioittaen aiempaa edistymistä.
