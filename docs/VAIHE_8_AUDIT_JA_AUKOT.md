# Vaihe 8 — Auditoitu nykytila + aukkokartta visioon

**Versio:** v4.51.11
**Tehty:** strategisen prosessinsiirron askeleet A ja B.
**Ei muutoksia koodissa.** Tämä on diagnostiikka, joka ankkuroi syvätutkimuskehotteet α ja β todelliseen koodiin — ei oletuksiin tai visiotekstiin.

---

## A1 — AI Block tuning -moduuli

### Mitä se faktisesti tekee

Mekanismi on **sääntöpohjainen + tilastollinen hybridi**, ei aidosti oppiva malli. Säätökanavat:

| Kanava | Tyyppi | Vaikuttaa kuormaan? | Persistointi |
|---|---|---|---|
| `varaTrendCorrection` (viim. 6 sarjan Vx-overshoot) | Deterministinen sääntö, kynnyspohjainen, palauttaa Δ±3,5 % | ✅ Suora — feed forward `deltaPct`-laskuun (engine.js rivi 3962) | Stateless, lasketaan joka ajossa |
| `readiness-cap` (HRV + velocity + vara z-score, MAD-sigma) | Tilastollinen, z-score kiintein kynnyksin (GREEN/YELLOW/RED) | ✅ YELLOW puolittaa deltaPct, RED estää nousun | Stateless |
| `CFG_DRIFT_APPLIED` (3+ perfect-sessio Vx-overshoot-streak) | Deterministinen streak-laskuri, +1 %/sessio, max +5 %/blokki | ✅ Muuttaa e1RM-ceilingia (engine.js rivi 3745) | ⚠️ **Bug:** lasketaan in-memory, ei näy persistoituvan `mesocycle.cfgDriftHistory`:yn |
| `computeRtfVelocityModel` (rep-by-rep MV-lineaariregressio) | Tilastollinen, r²-arvio | ❌ Vain rep1-velocity-range + VBT-promootio. Ei suoraa kuormasäätöä | Stateless |
| `aggressivenessLearned` ∈ [-1, +1] | 3 session valintastreikkilippu (+0,15 / -0,15 / -0,30) | ❌ Vain `defaultSuggestionId` (SAFE/TARGET/AGGRESSIVE), ei kuorma | ✅ `settings.aggressivenessLearned` |
| `firstSetCapacityBonus` | Sääntö (V≥overshoot → +X%) | ✅ Kuormaan | Stateless |

### Mitä kerätään mutta EI hyödynnetä säätöön

- **`mvReps[]`** (rep-by-rep mean velocity): käytetään vain RTF-mallin regressio-r²:n laskentaan, ei kuormamallinnukseen, ei väsymyksen ennusteeseen, ei oppimiseen.
- **Bodyweight-mittaukset**: tallentuvat, käytetään `e1rmSystem`-normalisaatioon, **eivät** ohjelman säätöön (esim. paino-trendi yli 4 viikon → ei mitään).
- **RPE**: **ei kerätä lainkaan** (`grep "rpe"` koodissa = 0 esiintymää). Vara (Vx) on suomalainen RIR-vastine, mutta erillistä RPE-asteikkoa ei ole.
- **Session-trendit (HRV/MPV) block-pakettiin**: kerätään `generateBlockTuningPackage`:iin, näkyy Claude-AI:lle annetussa **markdown-narratiivissa**, ei feed-forward-säätöön.
- **CFG_DRIFT-historia**: laskettu drift emitoidaan `cfgDriftApplied`-kenttään mutta ei näy persistoituvan takaisin mesocycleen.

### Epävarmuuden ilmaisu

✅ Olemassa, mutta laadukasta vain RTF-mallille. `RTF_MODEL_STATUS` ∈ {`reliable`, `preview`, `unreliable`, `insufficient-sessions`, `no-data`} ja se aidosti suppressoi AGGRESSIVE-tier:n. Muille kanaville **ei luottamusvälejä**: varaTrendCorrection palauttaa joka kerta Δ-arvon kynnyssäännöstä ilman virherajaa, CFG_DRIFT vaatii vain ≥3 perfectia ilman bayesilaista posterior-painotusta.

### Trace: aito säätö vs. lokitus

| Trace ID | Aito säätö | Lokitus |
|---|---|---|
| `CFG_DRIFT_APPLIED` | ✅ | |
| `VARA_TREND_CORRECTION` | ✅ | |
| `GROSS_MISMATCH_CORRECTION` | ✅ | |
| `VBT_PRIMARY_USED` | ✅ (kun promoted) | |
| `RTF_MODEL_STATUS` | | ✅ (suppressoi tier:n, ei muuta load:a) |
| `SUGGESTIONS_GENERATED` | | ✅ |
| `AGGRESSIVENESS_LEARNED_UPDATED` | | ⚠️ **Trace-ID puuttuu** kokonaan vaikka tila päivittyy `settings`-tasolla |

### Yhteenveto

Engine **säätää kuormaa** sääntöpohjaisesti varaTrend + readiness + CFG_DRIFT + GROSS_MISMATCH -ketjulla. Tämä toimii. Mutta engine **ei opi** parametriensa optimaalisia arvoja yksilölle: kaikki kynnykset (3,5 %, +1 %/sessio, z=-0,5/-1,0) ovat staattisia vakioita koodissa. mvReps[] + HRV-trendit kerätään mutta jäävät narratiiviksi Claude:lle, eivät palautuvaksi opetussignaaliksi engine:lle itselleen.

---

## A2 — Liikepankki ja liikevalinta

### Tietomalli

`PRESET_MOVEMENTS` ([data.js:150](data.js#L150)) — n. 60 liikettä, kullakin **6 attribuuttia**:
- `name`, `category`, `isPrimary`, `isPreset`, `isCompetitionLift`, `loadType` (`system` / `external` / `isometric_hold`)

`FALLBACK_MOVEMENT_BANK` (wizard/wizard-movement-bank.js) — n. 45 liikettä, sama suppea metadata + `primaryFor`-lista (`["streetlifting"]` jne.) ohjelmointityyleille.

### Mitä metadataa **EI** ole

- Heikkokohta-kohdistus (esim. *lockout / off-the-floor / bottom-of-squat*)
- Vamma-contraindications per liike (esim. olkavamma → estä OHP)
- Kalustovaatimukset attribuuttina (vain `_SPORT_DEFAULTS.requires`-listassa)
- Kokemustaso-suositus (`minExperienceLevel`)
- Antagonisti-pari (esim. *Pendlay row* ↔ *Bench press* lihastasapaino-rotaatioon)
- Stimulus-to-fatigue -arvio (SFR)
- Velocity-arkkityyppi (concentric-explosive vs. controlled-eccentric)

### Valintamekanismi

`pickPrimaries()` (wizard-2b-mapper.js:1105) toimii 3 vaiheessa:

1. **Lajidefault**: `_SPORT_DEFAULTS[q09_sport]` antaa 3–4 liikettä (streetlifting: leuanveto/dippi/kyykky/muscle-up; powerlifting: penkki/kyykky/maave)
2. **Vammasuodatus**: `q11_injuries.type==="absolute"` + keyword-haku (`olka` → poista dippi/punnerrus) — *karkea keyword-mätsäys, ei per-liike-contraindication-kenttä*
3. **Kalustosuodatus**: `q17_equipment` vs. `requires`-lista lajidefaultissa

**`q11_injuries.type==="modified"`** ei vaikuta valintaan lainkaan (ohjataan engine-tason kuormamuokkaukseen, mutta ei mihinkään aktiiviseen logiikkaan).

**Accessory-slotit** (`resolveAccessorySlot`) valitsevat liikkeitä `phaseVariants[phase]`-listoista (käsin kirjoitettuja), eivät käyttäjäkohtaisesta heikkokohta-profiilista. Variantti-rotaatio aktivoituu vain `stagnationThresholdWeeks=3` -kynnyksen jälkeen, ja se vaihtaa seuraavaan listan jäseneen — ei optimoi suhteessa atletin painoprofiiliin.

### 17 ohjelmointityyliä ja jaetut primary-listat

Kriittinen havainto: **kaikki 17 ohjelmointityyliä** (Wendler / GZCL / Westside / Sheiko / Madcow / Smolov Jr / Coan–Phillipi / DUP / yhdistelma / siirtymä / palautuminen / multi-issurin / hypertrofia / maksimivoima / eksentrinen / top-set-backoff / RP Minimalist) **jakavat saman `pickPrimaries()`-funktion**. Tyyli vaikuttaa weekDefs:iin (kuormaprosenttiketju), week-rakenteeseen (AMRAP vs. set/rep-skeema) ja blokki-pituuksiin, mutta **ei liikevalintaan**. Wendler-poikkeuksena säilyttää 4 kanonista kisaliikettä (v4.51.7 -korjaus).

### Yhteenveto

Liikepankki on **kategoria-pohjainen, ei attribuutti-pohjainen**. Valinta on **lajidefault + vammakeyword + kalustosuodatus** — yksilöllinen kohdistus heikkoihin kohtiin tai stimulus-fatigue-ratio:n optimointi puuttuu kokonaan. Liikkeen valinta riippuu vain lajista ja vamma/kalusto-poissuljennista.

---

## A3 — Wizard

### Kysymykset → ohjelma -mappaus

Wizard kerää **32 kysymystä** 18 dimensiossa. Mapper ([wizard-2b-mapper.js:298 `pickProgramStyle`](wizard/wizard-2b-mapper.js#L298)) laskee 17 ohjelmatyylille `confidence`-pisteet (0–100), näyttää top-3 ehdotusta, käyttäjä valitsee.

Valittu styleId → `mapWizardToProgram()` → `generateCustomMesocycle()` → factorit (`createWendler531Mesocycle`, `createHypertrofiaMesocycle`, jne.).

### Mitä mapperista tulee factorylle

```javascript
{
  goal: "wendler531" | "hypertrofia" | ...,        // 1 string
  primaries: [{ name, category }, ...],             // 3–4 liikettä
  daysPerWeek: 2 | 3 | 4,
  weekCount: 4 | 8 | 12,
  recoveryCapacity: "hyva" | "keski" | "heikko",
  preferredDaysOfWeek: [0..6] | null,
  customLabel: string,
}
```

### Lookup vs. yksilöllinen rakentaminen

| Mitä wizard kerää | Vaikuttaa rakenteeseen? |
|---|---|
| Ikä, sukupuoli, paino, pituus, rasvaprosentti (q01–q05) | ❌ Vain BW-normalisaatio kuorman laskennassa |
| Kokemustaso (q08) | ⚠️ Vaikuttaa vain `confidence`-rankaukseen, ei rakenteen sisältöön |
| Aiempi blokki (q29) | ⚠️ Vain `confidence`-rankaukseen |
| Vammat (q11): absolute | ✅ Suodattaa primaries |
| Vammat (q11): modified | ❌ Ei käytössä |
| Henkilökohtaiset ennätykset (q26) | ⚠️ Vain TM-laskenta (`movementProgress.e1RM`), ei rakenne |
| Kisapäivä (q27) + tyyppi (q28) | ⚠️ Multi-issurin-blokin pituuden ankkurointi |
| Kalusto (q17) | ✅ Suodattaa primaries |
| Volyymipreferenssi (q23, MEV/MAV/MRV) | ⚠️ `confidence` + `recoveryCapacity` |
| Frekvenssi (q24) | ✅ `daysPerWeek` |
| Preferred days (q31) | ✅ Viikon päivien numerointi |
| RPE-tarkkuus (q25) | ⚠️ `confidence` (esim. Wendler+kalibroitu = +5) |
| Aggressiivisuus (q33) | ⚠️ `preferredSuggestionBias` (engine.js default-tier, ei rakenne) |
| Goal (q12) | ✅ Vahva vaikutus `confidence`:iin |
| Cutting + energiabudjetti (q14, q30) | ⚠️ `recoveryCapacity` skalaariksi |
| Aerobinen modaliteetti (q15, q16) | ⚠️ `recoveryCapacity` |
| Lihasryhmäjako (q21) | ✅ `applySplitFilter` |
| Avoided liikkeet (q22) | ✅ Primaries-suodatus |
| HRV-laite, VBT-laite, unen-seuranta (q18–q20) | ❌ Ei vaikuta |
| Tavoiteliikkeet | ❌ Ei kenttää kysytä eikä käytetä |

**Rakennetta muokkaavia signaaleja: ~5–6** (goal, daysPerWeek, weekCount, recoveryCapacity, primaries-suodatus, preferredDaysOfWeek).

**Vain TM-laskentaan tai rankaukseen vaikuttavia: ~12.**

**Hukassa tai jätetty käyttämättä: ~14** (ikä/koko-attribuutit, "modified"-vammat, HRV-laite, ennusteen tavoiteliikkeet, antropometrian erityispiirteet, mvReps[]-historia ohjelman muokkaukseen).

### Factori-rakennetta tutkittu

`createHypertrofiaMesocycle`, `createMaksimivoimaMesocycle`, `createWendler531Mesocycle` ym. palauttavat **hardcoded `weekDefs` + `weekPlans`**. Esimerkki: Wendler 5/3/1 → aina 4 viikkoa × 4 päivää × 3 + BBB + 1 accessory. Hypertrofia → aina 4 viikkoa × 3 päivää × volyymilaskenta. Atletti ei muuta näitä rakenteita; vain primaarinimet vaihtuvat suodatuksen jälkeen ja kuormat lasketaan TM/e1RM-pohjasta.

### Yhteenveto

Wizard on **n. 90 % lookup-suosittelija**: confidence-pisteytys → factory → hardcoded skeleton. Vain noin **5–10 %** rakenteesta on aidosti yksilöllistä (kalusto/vamma-suodatus primaaihin, accessory-volyymin skaalaus 0,7–1,0 ×, viikkojen ja päivien lukumäärä). Suuri osa wizardin keräämästä rikkaasta atletti-datasta (kokemustaso, ikä, "modified"-vammat, ennätykset rakenneohjeena, painopistealueet) **ei muokkaa ohjelmaa** — vain valitsee mallin tai pisteyttää suosituksia.

---

## B — Aukkokartta vaiheen 8 visioon

### 8a — AI Block tuning -aukot

| Vision elementti | Nykytila | Aukko |
|---|---|---|
| "Oppii yhden käyttäjän velocity- ym. datasta" | Sääntöpohjaiset kynnykset (esim. ±3,5 % varaTrend) — vakiot, ei optimoidu | Aito online-oppiminen puuttuu. Parametrit eivät päivity datan kasvaessa. |
| "Toimii pienellä kohinaisella datalla" | Streak-laskurit (n=3) ovat herkkiä hetkellisille fluktuaatioille; ei posterioria | Ei bayesilaista mallia, ei kalman-filtteröintiä, ei smoothing-mekanismia kohinalle |
| "Viiveellinen palaute" | Engine reagoi *seuraavaan* sessioon nopeasti; ei mallinna fatiikkimuistin kertymää 2–4 vk:n yli | Pitkän viiveen palautteen mallinnus puuttuu |
| "Ilmaisee epävarmuutensa" | `RTF_MODEL_STATUS` ainoa kalibroitu epävarmuus. CFG_DRIFT + varaTrend palauttavat kovat Δ-arvot | Luottamusvälit/posteriorit puuttuvat 5/6 säätökanavalta |
| "Itse itseään paremmaksi ohjelmoijaksi" | `aggressivenessLearned` (1 skalaari) on ainoa pysyvä oppimistila — sekin streak-flag, ei mallin parametri | Ei käyttäjäkohtaista parametrivektoria (esim. vara-bias, väsymys-decay, optimaalinen VL-cap). 5/6 säätökanavan kynnyksiä ei voi oppia datasta. |
| Persistointi | `aggressivenessLearned` ✅, CFG_DRIFT ⚠️ in-memory (bug), muut stateless | CFG_DRIFT-bug + ei muita user-spec-parametreja IDB:ssä |
| Datavuon hyödyntäminen | mvReps[] / bodyweight / HRV-trendit / RPE → narratiivi Claude:lle, ei feed-forward | Iso datavirta hukkaan oppimisessa |

### 8b — Liikevalintamoottorin aukot

| Vision elementti | Nykytila | Aukko |
|---|---|---|
| "Oikeat liikkeet kunkin yksilön vaiheeseen × tavoitteeseen × heikkoon kohtaan × vammahistoriaan × salivarusteluun" | Lajidefault + vammakeyword + kalustosuodatus + accessory-slot-rotaatio | Heikkokohta-kohdistus puuttuu kokonaan. Vaihe (foundation/strength/peaking) ei vaikuta liikevalintaan, vain kuormaan. |
| Liikkeen tietomalli rikastettava | 6 attribuuttia | 8+ kenttää puuttuu (heikkokohta, vamma-contraindication, kalustovaatimus, kokemustaso, SFR, antagonisti-pari, velocity-arkkityyppi) |
| Liikevalinta huomioi heikkokohdat | Kategorian rotaatio stagnaation jälkeen | Ei heikkokohta-kohdistusta ohjelman kokoamisessa |
| Liikepankki aktivoituu | 60 liikettä / 45 fallback, mutta valinta keskittyy n. 10–15 primary/backoff-liikkeeseen | 75 %+ liikepankista jää käyttämättä ohjelmoinnissa |
| 17 ohjelmointityyliä eriytetty liikevalinnoissa | EI — kaikki tyylit jakavat saman `pickPrimaries()`:n | Tyyli-erityinen liikevalinta puuttuu (esim. Westside-conjugate vaatisi max-effort + dynamic-effort -varianttirotaation, Smolov vaatisi kyykky-fokusoidun frekvenssin) |
| Antagonisti-tasapaino | Ei mallinneta | Pull/push/quad/hammasretake-volyymisymmetria puuttuu |

---

## Mitä α ja β -kehotteet kysyvät

- **α** (palvelee 8b) kysyy *ulkoiselta tutkijalta*, miten rakentaa **liikevalintamoottori** joka aktivoi heikkokohta-attribuutit, vammakontraindikaatiot ja stimulus-to-fatigue-priorisoinnin. Erityisesti: mikä on alan paras tietämys liikkeen *taggauksesta* ja yksilöllisen ohjelman kokoamisesta tagien perusteella.

- **β** (palvelee 8a) kysyy, mikä mallinnusarkkitehtuuri sopii **pienen N:n + viiveellisen palautteen** reunaehtoihin niin, että engine voi oppia atletin henkilökohtaisia parametreja datasta — ei vain reagoida kynnysarvoihin.

Kehotteet on tarkoitettu kopioitavaksi sellaisenaan ulkoiseen syvätutkimukseen (Perplexity / ChatGPT Deep Research / Claude.ai web-haulla). Tutkimuskysymykset on johdettu yllä olevista konkreettisista aukoista, eivät geneerisestä visiotekstistä.
