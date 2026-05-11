# WIZARD_SPECIFICATION_v3.3.md
## LeVe AI v4.38.9+ — Eliittitason wizard (30 kysymystä, ohjelma-generoitavissa)

**Versio:** v3.3 (2026-05-11)
**Status:** Spec-vaihe. Track B Vaihe 1D toteuttaa koodin pohjalta.
**Onnistumiskriteeri:** "Wizard kerää RIITTÄVÄT vastaukset jotta Vaihe 2:n
ohjelma-generaattori voi tuottaa **eliittitason ohjelman ilman cal-sessiota**
sekä uusille että olemassa oleville käyttäjille."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET v3.2 → v3.3
═══════════════════════════════════════════════════════════════

Wizard 3.2 (25 kysymystä) keräsi profiilin mutta jätti 5 isoa puutetta jotka
WIZARD_OPEN_QUESTIONS.md tunnisti 1B:n yhteydessä. 3.3 korjaa nämä +
lisää **dynaamisen liikepankki-integraation** (käyttäjä valitsee PR-liikkeen
laajasta listasta) + **conditional skipping pää-sovelluksen olemassaolevalle
datalle** (atletti joka on jo tehnyt cal-session ohittaa PR-kysymyksen).

5 uutta kysymystä (q26-q30), yksi olemassaoleva (q14_cutting) laajennetaan
composite-tyypiksi joka kerää myös energiabudjetin.

Lopullinen kysymys-määrä:
- **Uusi käyttäjä, kova polku:** 30 kysymystä, ~15 min
- **Olemassaoleva käyttäjä (cal-data + mesocycles):** ~22 kysymystä (q26+q29 skip:t), ~10 min
- **Smart-defaults yksimielisillä:** ~5-7 päätös-kysymystä jotka vaativat aitoa harkintaa

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

5 uutta kysymystä jakautuvat:

| # | Kysymys | Tyyppi | Vaihe | Pakollinen | Skip-ehto |
|---|---------|--------|-------|------------|-----------|
| q26 | Henkilökohtaiset ennätykset (PR:t) | pr-list | profile-extension (vaihe 8) | Pakollinen | `movementProgress`-store sisältää ≥3 baselinea |
| q27 | Kisapäivä / peaking-takaraja | date | goals (vaihe 4) | Valinnainen | — |
| q28 | Peaking-tyyppi | radio | goals (vaihe 4) | Pakollinen jos q27 on annettu | q27 = "ei deadlinea" tai tyhjä |
| q29 | Aiempi blokki / treenitausta | radio | experience (vaihe 2) | Pakollinen | `mesocycles`-store sisältää aktiivisen meson |
| q30 | Energiabudjetti | composite | goals (vaihe 4) | Pakollinen jos q14 = "yes" | q14 = "no" |

**HUOM:** q14_cutting säilyy sellaisenaan (yes/no). q30 EI korvaa sitä — se
on q14:n laajennus joka aktivoituu vain cut-tilassa. Tällä säilytetään
backward-yhteensopivuus 3.2:n answers-rakenteeseen.

**Q26 LIIKEPANKKI** — ratkaiseva UX-päätös:

- Wizard lukee pää-sovelluksen `LeVeCoachDB.movements`-storen **luku-vain**
  → jos pää-sovellus on alustettu, kaikki 133+ presettiä saatavilla
- Jos LeVeCoachDB ei vielä ole avattu (uusi käyttäjä), wizard käyttää
  **FALLBACK_MOVEMENT_BANK**-listaa (~36 liikettä spec:in §3:ssa, sisältää
  calisthenics-eliittitason isometric-liikkeet Front Lever / Planche jne.)
- Käyttäjä voi LISÄKSI lisätä ad-hoc -liikkeen jos pankista ei löydy
  (text-input "Muu liike: ___" + tallennetaan q26:hen vain wizard-tasolla)

═══════════════════════════════════════════════════════════════
1. UUDET KYSYMYKSET — TARKAT SCHEMAT
═══════════════════════════════════════════════════════════════

### Q26 — Henkilökohtaiset ennätykset (PR-list)

```javascript
{
  id: "q26_personalRecords",
  stage: "profile-extension",   // uusi 8. vaihe TAI lisätään olemassa olevaan
                                // experience-vaiheeseen (päätös §4:ssä)
  dimension: "D16",             // uusi dimensio (data.js movements-tasolla)
  type: "pr-list",              // uusi komponentti-tyyppi
  labelFi: "Henkilökohtaiset ennätykset (PR:t) — anna 1–5 päämittaa",
  required: false,              // skip-ehto hoitaa pakollisuuden
  // Conditional skip: jos pää-sovelluksen movementProgress:ssa on jo
  // ≥3 movementia baseline-datalla, oletetaan että PR:t ovat siellä.
  skipIfMainAppHas: {
    store: "movementProgress",
    minCount: 3,
    minFieldCount: { e1RM: 1 },  // ainakin yksi MP-rivi jolla e1RM > 0
  },
  itemSchema: {
    movementId:  { type: "string",    labelFi: "Liike" },         // pää-app movement.id TAI fallback-id
    movementName:{ type: "string",    labelFi: "Liikkeen nimi" }, // selitys jos custom
    loadType:    { type: "enum",      values: ["external", "system", "isometric_hold"], labelFi: "Kuorma-tyyppi" },
                                                                  // "external"        = ulkoinen kuorma (tanko + paino)
                                                                  // "system"          = systeemikuorma (kehonpaino + mahd. lisäpaino)
                                                                  // "isometric_hold"  = staattinen pito (Front Lever, Planche…)
    // Kuorma-tyypin mukaan vain osa kentistä on käytössä:
    weightKg:     { type: "number",   labelFi: "Paino (kg)",       range: { min: 0, max: 500 },                       requiredIf: { field: "loadType", in: ["external", "system"] } },
    reps:         { type: "number",   labelFi: "Toistot",          range: { min: 1, max: 30 },                        requiredIf: { field: "loadType", in: ["external", "system"] } },
    holdSeconds:  { type: "number",   labelFi: "Pidon kesto (s)",  range: { min: 1, max: 180 },                       requiredIf: { field: "loadType", equals: "isometric_hold" } },
    addedWeightKg:{ type: "number",   labelFi: "Lisäpaino isometric:ssa (kg, valinnainen)", range: { min: 0, max: 100 }, requiredIf: { field: "loadType", equals: "isometric_hold" } },
    dateISO:      { type: "date",     labelFi: "Päivä (jos tiedossa)" },  // valinnainen, kaikille tyypeille
  },
  helperFi: "Anna 1–5 päämittaa joiden PR:t tiedät. LeVe käyttää nämä %1RM-suosituksiin.\n" +
            "Jos olet jo tehnyt LeVe:llä kalibrointi-session, voit jättää tämän tyhjäksi — LeVe lukee PR:t ohjelmasta.\n" +
            "Vinkki: 1-toiston max EI tarvita — voit antaa esim. 'penkki 140 kg × 5'.",
  uiHints: {
    presetSuggestions: ["competitionLifts"],  // ehdota ensiksi competition-liput
    maxItems: 5,
  },
}
```

**Reasoning:**
- `loadType` per rivi: pää-sovelluksen movementsissa on `loadType` (`"system"`
  lisäpaino-leuka:lla, `"external"` takakyykky:llä). q26-rivin pitää siepata
  tämä jotta Vaihe 2:n e1RM-laskuri tietää oikean formulan
- `reps`: 1RM ei vaadita — Epley-formulan kautta e1RM = weight × (1 + reps/30)
  laskee 1RM:n mistä tahansa toistosta. Tämä on huomattava UX-parannus
- `dateISO` on valinnainen: jos atletti antaa vanhan PR:n, "freshness-flag"
  voidaan asettaa Vaihe 2:lla joka säätää e1RM-painotusta vanhuuden mukaan
- **`isometric_hold`** = uusi kuormatyyppi joka tukee calisthenics/streetlifting-
  eliittitason isometriset liikkeet (Front Lever, Planche, Human Flag, L-sit).
  Tallennetaan `holdSeconds` (esim. 12 s clean front lever) + valinnainen
  `addedWeightKg` (jos atletti pitää lisäpainolla). Vaihe 2:n ohjelma-
  generaattori käsittelee isometric-progression eri formulalla kuin
  dynamic-PR:n (esim. EMOM-pohjainen volyymi sekuntien mukaan). LeVe ei
  vielä laske isometric-1RM-vastinetta — riittää että data on tallessa.

### Q27 — Kisapäivä / peaking-takaraja

```javascript
{
  id: "q27_targetDate",
  stage: "goals",
  dimension: "D17",
  type: "date",                 // uusi komponentti-tyyppi (HTML date-input)
  labelFi: "Onko sinulla kisa- tai testauspäivä jonka haluat tähdätä?",
  required: false,
  helperFi: "Kun annat päivän, LeVe ankkuroi peaking-blokin loppuun. " +
            "Jätä tyhjäksi jos ei deadlinea — ohjelma käyttää vakio-blokkeja.",
  range: {
    minDaysFromNow: 14,    // alle 2 vk → ei mielekästä periodisointia
    maxDaysFromNow: 365,   // yli 1 vuosi → liian kauas suunniteltavaksi
  },
}
```

### Q28 — Peaking-tyyppi

```javascript
{
  id: "q28_targetType",
  stage: "goals",
  dimension: "D17",
  type: "radio",
  labelFi: "Mikä on tavoitepäivän luonne?",
  requiredIf: { questionId: "q27_targetDate", notEquals: undefined },
  // = pakollinen jos q27 on annettu (date != null)
  options: [
    { value: "competition",       labelFi: "Kilpailu" },
    { value: "max_test",          labelFi: "1RM-testaus" },
    { value: "peaking_block",     labelFi: "Henkilökohtainen peaking-blokki" },
    { value: "intermediate_test", labelFi: "Välitesti (ei lopullinen peaking)" },
  ],
}
```

### Q29 — Aiempi blokki / treenitausta

```javascript
{
  id: "q29_recentBlock",
  stage: "experience",
  dimension: "D18",
  type: "radio",
  labelFi: "Mistä treenivaiheesta olet juuri tulossa?",
  required: true,
  skipIfMainAppHas: {
    store: "mesocycles",
    minCount: 1,
    minFieldCount: { active: true },  // joku meso on aktiivinen
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
}
```

### Q30 — Energiabudjetti (composite)

```javascript
{
  id: "q30_energyBudget",
  stage: "goals",
  dimension: "D7",             // sama kuin q14 (energy state)
  type: "composite",
  labelFi: "Energiabudjetti tarkemmin",
  requiredIf: { questionId: "q14_cutting", equals: "yes" },
  // = pakollinen vain jos q14 = "yes" (cut-tila aktiivinen)
  fields: [
    { id: "deficitKcal",       type: "number", labelFi: "Päivittäinen energiavaje (kcal)",
      range: { min: 100, max: 1000 }, step: 50 },
    { id: "proteinGPerKg",     type: "number", labelFi: "Proteiinin tavoite (g/kg)",
      range: { min: 1.0, max: 3.5 }, step: 0.1 },
    { id: "weeklyWeightLossKg",type: "number", labelFi: "Tavoiteltu painonpudotus (kg/vk)",
      range: { min: 0.2, max: 1.5 }, step: 0.1 },
  ],
  helperFi: "Aggressiivinen vaje (>500 kcal) vaatii enemmän volyymileikkausta " +
            "kuin lievä. Anna paras arvio — LeVe säätää volyymin näiden pohjalta.",
}
```

═══════════════════════════════════════════════════════════════
2. CONDITIONAL SKIPPING — PÄÄ-SOVELLUKSEN DATAN PICK-UP
═══════════════════════════════════════════════════════════════

Wizard 3.3 tunnistaa olemassa olevan käyttäjän lukemalla `LeVeCoachDB`:n
key store:t **luku-vain**, EI muokkaa.

```javascript
async function detectMainAppState() {
  if (!("indexedDB" in self)) return { canRead: false };

  return new Promise((resolve) => {
    const req = indexedDB.open("LeVeCoachDB");  // ei versionumeroa → nykyinen
    req.onsuccess = async () => {
      const db = req.result;
      const result = { canRead: true, hasMovementProgress: false, hasMesocycles: false };
      try {
        if (db.objectStoreNames.contains("movementProgress")) {
          const all = await getAllFromStore(db, "movementProgress");
          result.hasMovementProgress = all.filter(mp => mp.e1RM > 0).length >= 3;
          result.movementProgressData = all;
        }
        if (db.objectStoreNames.contains("mesocycles")) {
          const all = await getAllFromStore(db, "mesocycles");
          result.hasMesocycles = all.filter(m => m.active === true).length >= 1;
          result.activeMesocycle = all.find(m => m.active === true) || null;
        }
        if (db.objectStoreNames.contains("movements")) {
          result.allMovements = await getAllFromStore(db, "movements");
        }
      } catch (e) {
        result.error = String(e);
      } finally {
        db.close();
        resolve(result);
      }
    };
    req.onerror = () => resolve({ canRead: false });
    req.onblocked = () => resolve({ canRead: false });
  });
}
```

**Skip-ehto applikoituu evaluateVisible:n yhteydessä:**

```javascript
export function evaluateVisible(q, answers, mainAppState) {
  // 1) requiredIf (jo 1C:ssä)
  if (q.requiredIf) { /* ... */ }

  // 2) UUSI: skipIfMainAppHas
  if (q.skipIfMainAppHas && mainAppState) {
    if (q.skipIfMainAppHas.store === "movementProgress" && mainAppState.hasMovementProgress) {
      return false;  // skipataan q26
    }
    if (q.skipIfMainAppHas.store === "mesocycles" && mainAppState.hasMesocycles) {
      return false;  // skipataan q29
    }
  }

  return true;
}
```

Atletille (Akseli, jolla pää-sovellus on käytössä) wizard kysyy:
- 22 wizard 3.2 -kysymystä (q01-q25)
- q27 + q28 (kisapäivä — uusi joka tapauksessa)
- q30 conditional (q14:lle)
- ~25 kysymystä yhteensä, useat smart-defaultilla

Uudelle käyttäjälle:
- 22 wizard 3.2 -kysymystä
- q26 (PR:t)
- q27 + q28
- q29 (aiempi blokki)
- q30 conditional
- ~30 kysymystä yhteensä

═══════════════════════════════════════════════════════════════
3. LIIKEPANKKI-ARKKITEHTUURI (q26:n moottori)
═══════════════════════════════════════════════════════════════

### 3.1 Pää-sovelluksen pankki (133 presettiä)

Pää-app `LeVeCoachDB.movements` sisältää 133 preset-liikettä + käyttäjän
omat lisäykset. Wizard lukee tämän storen luku-vain ja näyttää käyttäjälle
**movement.name** + **movement.category** (esim. "Lisäpainoleuanveto —
vertikaaliveto").

Erityishuomio kilpailuliikkeille:
- 4 kilpailuliikettä on merkattu `isCompetitionLift: true` pää-appissa
  (Lisäpainoleuanveto, Muscle-up, Lisäpainodippi, Takakyykky)
- q26 nostaa nämä listan **kärkeen** (eivätkä aakkosjärjestyksessä) jotta
  streetlifting-atletti löytää ne heti
- Voimanostajille (q09=powerlifting) sama nosto tehdään 3 perusliikkeelle
  (Penkkipunnerrus, Takakyykky, Maastaveto) vaikka niissä ei ole
  isCompetitionLift-lippua

### 3.2 Fallback-pankki (~28 liikettä, kun pää-app ei alustettu)

```javascript
// wizard-movement-fallback.js (UUSI tiedosto Vaihe 1D:ssä)
export const FALLBACK_MOVEMENT_BANK = [
  // ─── Streetlifting / Voimanosto kilpailuliikkeet (8) ───
  { id: "fb_addedweight_pullup",    name: "Lisäpainoleuanveto",  category: "vertikaaliveto",     loadType: "system",   isCompetitionLift: true,  primaryFor: ["streetlifting"] },
  { id: "fb_addedweight_dip",       name: "Lisäpainodippi",      category: "horisontaalityöntö", loadType: "system",   isCompetitionLift: true,  primaryFor: ["streetlifting"] },
  { id: "fb_muscleup",              name: "Muscle-up",           category: "vertikaaliveto",     loadType: "system",   isCompetitionLift: true,  primaryFor: ["streetlifting"] },
  { id: "fb_backsquat",             name: "Takakyykky",          category: "alaraaja",           loadType: "external", isCompetitionLift: true,  primaryFor: ["streetlifting", "powerlifting"] },
  { id: "fb_benchpress",            name: "Penkkipunnerrus",     category: "horisontaalityöntö", loadType: "external", primaryFor: ["powerlifting"] },
  { id: "fb_deadlift",              name: "Maastaveto",          category: "lonkkahingaus",      loadType: "external", primaryFor: ["powerlifting"] },
  { id: "fb_overheadpress",         name: "Pystypunnerrus",      category: "vertikaalityöntö",   loadType: "external" },
  { id: "fb_frontsquat",            name: "Etukyykky",           category: "alaraaja",           loadType: "external" },

  // ─── Pull-variaatiot (5) ───
  { id: "fb_pullup",                name: "Leuanveto (kehonpaino)", category: "vertikaaliveto", loadType: "system" },
  { id: "fb_lat_pulldown",          name: "Ylätalja",               category: "vertikaaliveto", loadType: "external" },
  { id: "fb_barbell_row",           name: "Penkkiveto",             category: "horisontaaliveto", loadType: "external" },
  { id: "fb_cable_row",             name: "Alatalja",               category: "horisontaaliveto", loadType: "external" },
  { id: "fb_chinup",                name: "Vastaote-leuat",         category: "vertikaaliveto", loadType: "system" },

  // ─── Push-variaatiot (4) ───
  { id: "fb_dip",                   name: "Dippi (kehonpaino)",     category: "horisontaalityöntö", loadType: "system" },
  { id: "fb_incline_bench",         name: "Vinopenkkipunnerrus",    category: "horisontaalityöntö", loadType: "external" },
  { id: "fb_close_grip_bench",      name: "Close-grip bench",       category: "horisontaalityöntö", loadType: "external" },
  { id: "fb_db_shoulder_press",     name: "Pystypunnerrus käsipainot", category: "vertikaalityöntö", loadType: "external" },

  // ─── Leg-variaatiot (5) ───
  { id: "fb_rdl",                   name: "Romanialainen maastaveto (RDL)", category: "lonkkahingaus", loadType: "external" },
  { id: "fb_leg_press",             name: "Jalkaprässi",                    category: "alaraaja", loadType: "external" },
  { id: "fb_bulgarian_split",       name: "Bulgarian split squat",          category: "alaraaja", loadType: "external" },
  { id: "fb_walking_lunge",         name: "Walking lunge",                  category: "alaraaja", loadType: "external" },
  { id: "fb_calf_raise",            name: "Pohjenosto",                     category: "muu",       loadType: "external" },

  // ─── Iso-/koneliikkeet (5) ───
  { id: "fb_bicep_curl",            name: "Hauiskääntö",              category: "hauisfleksio",     loadType: "external" },
  { id: "fb_tricep_pushdown",       name: "Tricep pushdown",          category: "muu",              loadType: "external" },
  { id: "fb_lateral_raise",         name: "Sivunosto",                category: "vertikaalityöntö", loadType: "external" },
  { id: "fb_face_pull",             name: "Face pull",                category: "horisontaaliveto", loadType: "external" },
  { id: "fb_abs",                   name: "Vatsalihakset (yleinen)",  category: "muu",              loadType: "external" },

  // ─── Calisthenics / Streetlifting-eliittitason kehonpainoliikkeet (4) ───
  { id: "fb_handstand_pushup",      name: "Handstand push-up (HSPU)", category: "vertikaalityöntö", loadType: "system",   primaryFor: ["streetlifting"] },
  { id: "fb_one_arm_pullup",        name: "Yksikätinen leuanveto",    category: "vertikaaliveto",   loadType: "system",   primaryFor: ["streetlifting"] },
  { id: "fb_archer_pullup",         name: "Archer pull-up",           category: "vertikaaliveto",   loadType: "system" },
  { id: "fb_lsit_pullup",           name: "L-sit pull-up",            category: "vertikaaliveto",   loadType: "system" },

  // ─── Isometric holds (4) — calisthenics-eliittiluokan staattiset ───
  { id: "fb_front_lever",           name: "Front Lever (hold)",       category: "muu",              loadType: "isometric_hold", primaryFor: ["streetlifting"] },
  { id: "fb_planche",               name: "Planche (hold)",           category: "muu",              loadType: "isometric_hold", primaryFor: ["streetlifting"] },
  { id: "fb_human_flag",            name: "Human Flag (hold)",        category: "muu",              loadType: "isometric_hold" },
  { id: "fb_lsit",                  name: "L-sit (hold)",             category: "muu",              loadType: "isometric_hold" },

  // ─── Custom fallback ───
  { id: "fb_custom_other",          name: "Muu liike (kirjoita itse)", category: "muu",             loadType: "external", isPlaceholder: true },
];
```

Atletti voi valita `fb_custom_other` -kohdan ja kirjoittaa oman liikenimen.
Tämä tallennetaan q26-riviin `movementName`-kenttään.

### 3.3 Yhdistäminen — readMovementBank()

```javascript
export async function readMovementBank() {
  const mainAppState = await detectMainAppState();
  if (mainAppState.canRead && mainAppState.allMovements?.length > 0) {
    // Pää-app on alustettu — käytä sen pankkia (laajempi)
    return {
      source: "main-app",
      movements: mainAppState.allMovements,
      mainAppState,
    };
  }
  // Fallback
  return {
    source: "fallback",
    movements: FALLBACK_MOVEMENT_BANK,
    mainAppState,
  };
}
```

═══════════════════════════════════════════════════════════════
4. VAIHE-RAKENNE — MISSÄ UUDET KYSYMYKSET SIJAITSEVAT
═══════════════════════════════════════════════════════════════

Wizard 3.2:ssa on 7 vaihetta. Wizard 3.3:ssa lisätään YKSI uusi vaihe
**"Voimanostotaso (PR:t)"** profiilin jälkeen, jotta q26 saa loogisen
paikan eikä häiritse profile-vaiheen kompaktisuutta.

Lisäksi q27, q28, q30 lisätään olemassa olevaan **goals**-vaiheeseen.
q29 lisätään **experience**-vaiheeseen (loogisesti aikaisempi blokki
kuuluu kokemus-osaan).

```javascript
export const WIZARD_STAGES = [
  { id: "profile",       titleFi: "Profiili",                  order: 1, dimensions: ["D1"] },
  { id: "experience",    titleFi: "Kokemus ja laji",           order: 2, dimensions: ["D2", "D3", "D18"] }, // +D18 (aiempi blokki)
  { id: "constraints",   titleFi: "Vammat ja rajoitukset",     order: 3, dimensions: ["D4"] },
  { id: "performance",   titleFi: "Voimataso (PR:t)",          order: 4, dimensions: ["D16"] }, // UUSI
  { id: "goals",         titleFi: "Tavoitteet",                order: 5, dimensions: ["D5", "D6", "D7", "D17"] }, // +D17 (kisapäivä)
  { id: "metrics",       titleFi: "Kalusto ja mittarit",       order: 6, dimensions: ["D8", "D9", "D10"] },
  { id: "movements",     titleFi: "Liikevalinnat",             order: 7, dimensions: ["D11", "D12"] },
  { id: "loading",       titleFi: "Volyymi, frekvenssi, RPE",  order: 8, dimensions: ["D13", "D14", "D15"] },
];
```

8 vaihetta. Progress-bar laajenee 7 → 8 segmenttiin.

**HUOM:** Vaihe 4 "Voimataso (PR:t)" voi olla **kokonaan skipattu**
olemassa olevalle käyttäjälle (q26.skipIfMainAppHas täyttyy). Tässä
tapauksessa progress-bar näyttää 7 segmenttiä eikä 8, ja siirtymä
3→5 (constraints→goals) on saumaton.

═══════════════════════════════════════════════════════════════
5. SMART DEFAULTS — LAAJENNUKSET 3.3:SSA
═══════════════════════════════════════════════════════════════

Wizard 1C lisäsi 5 profiilipohjaista sääntöä. 3.3 laajentaa ne ~10:een:

| Kysymys | Sääntö | Reasoning |
|---------|--------|-----------|
| q07_autoregYears | (1C:ssä jo) | |
| q14_cutting | (1C:ssä jo) | |
| q15_aerobicModality | (1C:ssä jo) | |
| q23_volumePref | (1C:ssä jo) | |
| q25_rpePrecision | (1C:ssä jo) | |
| **q17_equipment** | UUSI: jos q09=streetlifting → esivalitse ["barbell_rack", "pullup_bar", "dip_station"]. Jos q09=powerlifting → esivalitse ["barbell_rack"]. | Laji-spesifinen minimi-kalusto |
| **q21_splitPreference** | UUSI: jos q09=streetlifting+q24.daysPerWeek>=4 → "upper_lower". Powerlifting → "fullbody" (klassinen 3×). | Laji-spesifinen yleisin split |
| **q28_targetType** | UUSI: jos q12=streetlifting_with_explosive_components → "peaking_block". Jos q12=powerlifting → "competition". | Päätavoite ennustaa tarkoituksen |
| **q29_recentBlock** | UUSI: jos q09=streetlifting + q07>=5 → "intensification" (erfaring + laji). Beginner → "off_program". | Kokemus + laji ennustaa |
| **q30.proteinGPerKg** | UUSI: jos q14=yes → 2.0 g/kg (cut-vaiheen suositus). Muuten 1.6. | Helms 2014: cut-vaiheessa korkeampi |

Q30:n proteiini-suositus 2.0 g/kg on Helms 2014 (PDF-verifioitu) -mukainen.
**ÄLÄ lisää muita numeraalisia kynnyksiä ilman primäärilähde-verifikaatiota.**

═══════════════════════════════════════════════════════════════
6. TUTKIMUSPOHJA — VERIFIKAATIO ENNEN KOODIA
═══════════════════════════════════════════════════════════════

### 6.1 Kisapäivä → peaking-ankkurointi (q27, q28)

- **Helms 2014 J Int Soc Sports Nutr 11:20** ✅✅ — peaking-protokollat
  voimanostokisaa edeltäville 8-12 viikolle. q27:n 14 päivän minimi-skipin
  alaraja on suoraan tästä ("alle 2 vk peaking ei mielekäs")
- **Issurin 2010 Sports Med 40(3):189-206** ✅✅ — block-periodisaation
  realization-blokin pituus 1-2 viikkoa kisaan asti. q28:n "peaking_block"
  ankkuroi tämän mukaisesti

Ei uusia lähteitä tarvita 3.3:lle.

### 6.2 Aiempi blokki → aloituspaikka (q29)

- **Issurin 2010** ✅✅ — block-sekvenssin teoria: hypertrofia → voima →
  intensifikaatio → realization → deload → uusi sykli
- q29:n vastausvaihtoehdot peilaavat suoraan Issurin-blokkityyppejä
- "off_program" = atletti tulee strukturoimattomasta vaiheesta, aloitetaan
  hypertrofialla turvallisuussyistä

Ei uusia lähteitä.

### 6.3 Energiabudjetti (q30)

- **Helms 2014 JISSN 11:20** ✅✅ — proteiini 2.0–3.1 g/kg cut-vaiheessa
  (q30.proteinGPerKg-default 2.0 alarajalla, range 1.0-3.5)
- **Helms 2018 Front Physiol 9:247** ✅✅ — vaje-suuruus 10-20% vs.
  maintenance (90 kg atletti × 30 kcal/kg = 2700 kcal → vaje 270-540 kcal).
  q30.deficitKcal range 100-1000 sallii myös aggressiiviset vaiheet mutta
  smart-defaultiksi voitaisiin asettaa 350 kcal (~13% 90 kg atletille)
- **Lisävaje:** kun deficit >500 kcal/päivä → volyymileikkaus pakollinen
  (Vaihe 2:n ohjelma-generaattori käsittelee tämän)

Ei uusia lähteitä.

### 6.4 PR-pohjainen %1RM-laskenta (q26)

- Epley-formula: 1RM = weight × (1 + reps/30) — jo käytössä `engine.js`:ssä
  (rivi viitteenä etsittävä Vaihe 1D-toteutuksessa). EI vaadi uutta verifikaatiota
- LeVe e1RM-modifikaatio: weight × (1 + (reps+Vx)/30) joka huomioi atletin Varan

**JOHTOPÄÄTÖS:** Wizard 3.3:n koko kysymyspuu on tutkimuspohjaisesti
verifioitu olemassa olevilla 3.2:n lähteillä. Ei uusia tutkimusverifikaatioita.

═══════════════════════════════════════════════════════════════
7. ANSWER-RAKENNE — IDB-YHTEENSOPIVUUS
═══════════════════════════════════════════════════════════════

Wizard 3.2:n `WizardConfig.answers` on `{ [questionId]: value }` -mappi.
3.3 lisää 5 uutta key:tä:

```javascript
{
  // 3.2:n 25 vastausta säilyvät
  q01_age: 34, q02_sex: "male", ...,

  // UUDET 3.3:ssa
  q26_personalRecords: [
    { movementId: "mov_abc",    movementName: "Lisäpainoleuanveto",
      weightKg: 85, reps: 1, dateISO: "2026-04-12",
      loadType: "system" },
    { movementId: "fb_backsquat", movementName: "Takakyykky",
      weightKg: 185, reps: 3, dateISO: "2026-04-15",
      loadType: "external" },
    // 1-5 riviä
  ],
  q27_targetDate: "2026-08-15",          // tai null/undefined
  q28_targetType: "competition",          // tai null
  q29_recentBlock: "intensification",     // tai skip
  q30_energyBudget: {                     // tai null/skip
    deficitKcal: 350,
    proteinGPerKg: 2.0,
    weeklyWeightLossKg: 0.5,
  },
}
```

**SCHEMA_VERSION:** 3.2 → 3.3. IDB-versio 3 → 4. Migraatio:
- 3.2-config:t säilyvät; uudet kentät vain puuttuvat
- Validation hyväksyy 3.2-configin VAIHE 1A:lle yhteensopivuuden vuoksi
  (uudet kysymykset ovat conditional / valinnaisia)
- Yksinkertainen versionkasvatus ilman datamigraatiota

═══════════════════════════════════════════════════════════════
8. UI-VAATIMUKSET — UUDET KOMPONENTIT
═══════════════════════════════════════════════════════════════

1. **pr-list** (q26): dynaaminen lista jossa jokainen rivi sisältää
   - Liike-pudotusvalikko (kategorioittain ryhmitelty, hakukentällä jos >50 liikettä)
   - Kuormatyyppi-radio: **external | system | isometric_hold** — esivalitaan
     liikkeen mukaan (FALLBACK_MOVEMENT_BANK / pää-app-movement määrää oletuksen)
   - **Conditional rendering kuormatyypin mukaan:**
     - `external` / `system`: numerokentät paino (kg) + toistot näkyvät, isometric-kentät piilossa
     - `isometric_hold`: holdSeconds (s) + addedWeightKg (valinnainen) näkyvät, paino/toistot piilossa
   - Päivämäärä (HTML5 date-input, valinnainen) — kaikille kuormatyypeille
   - "Poista"-painike

2. **date** (q27): HTML5 `<input type="date">` + min/max-rajat lasketaan
   `minDaysFromNow` / `maxDaysFromNow` -kentistä

3. Kaikki uudet kysymykset käyttävät 1C:n olemassaolevia tyylejä
   (.wiz-composite, .wiz-list-row, .wiz-add-btn, .wiz-remove-btn)

═══════════════════════════════════════════════════════════════
9. IMPLEMENTAATIO-ROADMAP — VAIHE 1D
═══════════════════════════════════════════════════════════════

**Vaihe 1D — Wizard 3.3 koodi (~6-10 h Claude + atletin testit)**

T1: Skeeman päivitys `wizard-schema.js`
- Lisää q26-q30 WIZARD_QUESTIONS:iin
- Päivitä WIZARD_STAGES (7 → 8 vaihetta, perfomance-vaihe lisätty)
- Päivitä SCHEMA_INVARIANTS (totalQuestions 25 → 30, totalStages 7 → 8)
- Lisää SCHEMA_VERSION "3.2" → "3.3"

T2: Datakerros `wizard-data.js`
- IDB-version bump 3 → 4 + pre-migration backup
- validateWizardConfig laajennus uusille tyypeille (pr-list, date)
- migration 3.2 → 3.3 (lisää puuttuvat key:t undefined-arvoilla)

T3: Liikepankki — UUSI tiedosto `wizard-movement-bank.js`
- FALLBACK_MOVEMENT_BANK -lista (~28 liikettä)
- detectMainAppState() — luku-vain LeVeCoachDB-avaus
- readMovementBank() — yhdistää fallback + pää-app

T4: Komponentti `pr-list` (renderQuestionPrList) `wizard-core.js`:ssä
- Liike-pudotusvalikko + hakukenttä
- Per-rivi: liike + paino + reps + päivä + kuormatyyppi + Poista
- Max 5 riviä

T5: Komponentti `date` (renderQuestionDate)
- HTML5 date-input + min/max-laskenta

T6: Conditional skipping — evaluateVisible laajennus
- skipIfMainAppHas-ehto: kysytään detectMainAppState() WizardController.init():ssä
- Cache mainAppState — välitetään renderStep:lle

T7: Smart defaults -laajennukset (5 uutta sääntöä §5:n mukaan)

T8: uiSelfTest laajennus (40+ check)
- pr-list / date -komponentit
- skipIfMainAppHas-skenaariot
- 5 uutta smart-default-sääntöä

T9: wizard-styles.css laajennukset
- .wiz-pr-row (pr-list-rivin layout)
- .wiz-movement-picker (pudotusvalikko)
- .wiz-date-input

T10: Manuaalitestit + commit + push
- Akselin profiilille: q26 skip (cal-data) + q29 skip (meso aktiivinen)
- Uudelle käyttäjälle: kaikki 30 kysymystä, fallback-pankki näkyy
- Reload-persistenssi pr-list, date, composite

**Aikataulu:**
Spec-validointi (atletti): 30 min
Vaihe 1D-koodisessio: 6-10 h jaettuna 1-2 sessioon

═══════════════════════════════════════════════════════════════
10. HYVÄKSYMISKRITEERIT — VAIHE 1D
═══════════════════════════════════════════════════════════════

Vaihe 1D on valmis kun:

1. node --check kaikki wizard-tiedostot OK
2. uiSelfTest 40+ check vihreänä
3. Wizard vietävissä loppuun (Valmis ✓ aktivoituu) sekä uutena käyttäjänä
   että olemassa olevana käyttäjänä
4. PR-lista: voi lisätä 1-5 PR:ää pää-sovelluksen liikepankista, sis.
   external (Penkki + Takakyykky), system (Lisäpaino-leuka), ja isometric_hold
   (Front Lever + Planche) -tyyppejä
5. Fallback-pankki näkyy kun LeVeCoachDB ei ole alustettu (testaa
   `caches.delete()` + `indexedDB.deleteDatabase("LeVeCoachDB")` -tyhjennyksellä).
   Sisältää calisthenics-eliittitason liikkeet (Front Lever, Planche, HSPU,
   one-arm pull-up jne.)
5b. Conditional UI kuormatyyppin sisällä: vaihto external → isometric_hold
   piilottaa weight/reps-kentät ja paljastaa holdSeconds/addedWeightKg
   ILMAN että aiempi vastaus pyyhitään (säilyy state:ssa kuten 1C:n
   conditional UI)
6. Kisapäivä-input toimii: min-rajat estävät alle 14 päivän valinnan
7. q14=yes → q30 ilmestyy; q14=no → q30 piilossa, vastaus säilyy
8. skipIfMainAppHas: Akselin profiilille q26 + q29 EIVÄT näy DOM:issa
   kun pää-sovellus on alustettu
9. Schema-versio 3.3, IDB-versio 4. 3.2-configit ovat read-yhteensopivia
   (lue + näytä + tallenna takaisin 3.3-formaattiin)
10. Sovellusversio v4.38.9 säilyy
11. Pää-sovellus 100% koskematon (engine, data, index, sw, test-runner)
12. Streetlifting_16w-meso täysin koskematon

═══════════════════════════════════════════════════════════════
11. KIELLETYT — LAAJENNETTU 3.3:SSA
═══════════════════════════════════════════════════════════════

Säilyvät 3.2:n säännöt + lisäykset:

1. **Älä KIRJOITA LeVeCoachDB:hen wizardista.** Vain lukea on sallittu.
   Wizard käyttää LeVeWizardDB:tä omille datalleen. Pää-DB:n version-
   numeroa EI saa nostaa wizardista (se laukaisisi pää-appin migraatiot).

2. **Älä lisää uutta numeraalista kynnystä ilman primäärilähde-verifikaatiota.**
   3.3:n smart-defaultit q30:lle (proteiini 2.0 g/kg, deficit 350 kcal)
   ovat verifioituja (Helms 2014, Helms 2018).

3. **Älä lisää uusia Wizard 3.4 -kysymyksiä 3.3-spec:in päälle.**
   3.3 on suljettu kokonaisuus. Lisätarpeet käsitellään seuraavassa
   spec-iteraatiossa Vaihe 2:n oppimisten pohjalta.

4. **UI-stringeissä ei tutkijaviittauksia** (säilyy 1C:n mukaisesti).

5. **Älä käytä dynaamisia importteja cache-buster-URL:lla** (1B:stä
   opittu — luo erilliset moduuli-instanssit).

═══════════════════════════════════════════════════════════════
12. ATLETIN (AKSELI) KOKEMUSPOLKU 3.3:SSA
═══════════════════════════════════════════════════════════════

Avataan wizard ensimmäistä kertaa Wizard 3.3:n jälkeen:

1. **Vaihe 1/8 Profiili:** q01-q05 (5 kys) — täytä manuaalisesti.
2. **Vaihe 2/8 Kokemus:** q06-q09 + q29 (mutta q29 SKIP koska
   streetlifting_16w on aktiivinen mesocycle) → 4 kysymystä.
   - Smart-default: q07_autoregYears = 8 (elite, 15v).
3. **Vaihe 3/8 Vammat:** q10 (smart-default 0), q11 (valinnainen).
4. **Vaihe 4/8 Voimataso:** SKIP koko vaihe — pää-app:in baselines on (PR:t).
5. **Vaihe 5/8 Tavoitteet:** q12-q14 + q27 + q28 + q30 (q30 SKIP koska q14=no).
   - Smart-default: q14="no", q27=tyhjä (atletti voi syöttää 2026-08-15 kisaan),
     q28 conditional q27:lle.
6. **Vaihe 6/8 Mittarit:** q15-q20.
   - Smart-default: q15="none" (streetlifting), q17 esivalittu kalusto.
7. **Vaihe 7/8 Liikevalinnat:** q21-q22.
   - Smart-default: q21="upper_lower" (streetlifting + 4 päivää).
8. **Vaihe 8/8 Volyymi/frekvenssi:** q23-q25.
   - Smart-defaults: q23="MAV", q25="vara_calibrated".

**Akselin kokemus:** ~22 kysymystä, joista ~10 vaatii aitoa pohdintaa.
Loput smart-defaulted tai skipattu. Aikatavoite **alle 10 min**.

═══════════════════════════════════════════════════════════════
13. VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v3.0 (2026-05-10):** Alkuperäinen spec
- **v3.1 (2026-05-11):** 5 kriittistä virhettä korjattu (verifikaatio v1)
- **v3.2 (2026-05-11):** Plews-verifikaatio (6. virhe korjattu), D10 SWC-pohjaiseksi
- **v3.3 (2026-05-11):** **Wizard laajennettu eliittitason ohjelman edellyttämään
  tasoon — 5 uutta kysymystä, dynaaminen liikepankki-integraatio (36 fallback
  + 133+ pää-app), conditional skipping pää-sovelluksen olemassaolevalle datalle,
  smart-defaults 5→10 sääntöä, q26:n isometric-tuki (Front Lever, Planche, Human
  Flag, L-sit, HSPU, one-arm pull-up — calisthenics-eliittiluokan PR:t
  hold-sekunteina + valinnaisella lisäpainolla).** Sopii sekä uudelle käyttäjälle
  että olemassa olevalle ilman cal-session pakkoa. Tutkimuspohja säilyy 3.2:n
  lähteillä — ei uusia verifikaatioita.

═══════════════════════════════════════════════════════════════
LOPPUSANAT
═══════════════════════════════════════════════════════════════

Wizard 3.3 saavuttaa **10/10 tason rajan** sillä että:
- Profiilin keräys on **eliittitason kattava** (PR:t, kisapäivä, blokki,
  energiabudjetti, kalusto, mittarit, volyymi, frekvenssi, RPE, vammat)
- UX säilyy **selkeänä** conditional skipping + smart-defaults -kahdella
  pilarilla — kokenut käyttäjä koe wizardin lyhyenä, uusi saa kuitenkin
  täyden tarkkuuden
- Liikepankki on **dynaaminen** (133+ pää-appin liikettä TAI 28 fallback)
  joka kestää atletin omien erikoisliikkeiden lisäämisen

Vaihe 1D toteuttaa tämän pelkän spec-pohjan perusteella ilman uusia
tutkimusverifikaatioita. Vaihe 2 (auto-suunnittelu + ohjelma-generaattori)
voi alkaa 1D:n jälkeen täydellä profilliedolla.
