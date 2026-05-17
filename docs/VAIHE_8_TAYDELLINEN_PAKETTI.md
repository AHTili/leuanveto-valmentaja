# LeVe AI — Vaihe 8 täydellinen paketti

> **Tämä on master-dokumentti** joka kokoaa kaiken vaiheen 8 strategisen prosessinsiirron työn yhteen tiedostoon: auditin, aukkokartan, kattavuusanalyysin, kaksi hiottua syvätutkimuskehotetta (α + β), ja insinöörikorjausten backlogin.
>
> **Versio:** v4.51.11. Tehty 2026-05-16.
> **Kontrolli:** kaikki neljä alkuperäistä erillisdokumenttia säilyvät rinnalla. Tämä master-dokumentti on luettavuuden + jakelun apuväline.
> **Ei pushattu** branchille — paikallinen untracked-tiedosto.

---

## Sisällysluettelo

1. Osa 1 — Audit + aukkokartta (A1, A2, A3, B)
2. Osa 2 — Kattavuusanalyysi (vaihe 1 -tulos)
3. Osa 3 — Hiottu syvätutkimuskehote α (liikevalintamoottori, palvelee 8b)
4. Osa 4 — Hiottu syvätutkimuskehote β (adaptiivinen oppimismalli, palvelee 8a)
5. Osa 5 — Insinöörikorjausten backlog

---

# Osa 1 — Audit + aukkokartta

> Lähdetiedosto: `docs/VAIHE_8_AUDIT_JA_AUKOT.md`. Sisältö identtinen.

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

---

# Osa 2 — Kattavuusanalyysi (vaihe 1 -tulos)

> Tämä taulukko ei ole missään muussa tiedostossa — kirjattu master-dokumenttiin chat-ulostulosta.
>
> Käytetty menetelmä: B-osion (yllä) jokainen rivi luokiteltu täsmälleen yhteen neljästä luokasta:
> - **KATTAA α** — α-tutkimuksen tulos vastaa tähän aukkoon
> - **KATTAA β** — β-tutkimuksen tulos vastaa tähän aukkoon
> - **EI KUMPIKAAN — INSINÖÖRITYÖ** — ei vaadi tutkimusta, ratkaistaan koodaamalla
> - **EI KUMPIKAAN — PUUTTUVA TUTKIMUSVAJE** — tarvittaisiin ulkoinen tutkimus, mutta α/β ei kysy → ongelma
>
> **Pakottava sääntö:** jos yksikään rivi olisi luokassa 4, vaihetta 2 ei olisi tehty.

## 8a-taulukko (7 riviä)

| B-osion rivi (lyhenne) | Luokka | Perustelu |
|---|---|---|
| "Oppii velocity-datasta" — aito online-oppiminen puuttuu, parametrit eivät päivity datan kasvaessa | **KATTAA β** | β:n päätutkimuskysymys + C1 (Bayes/Kalman/GP/contextual bandits/RL) vastaa täsmälleen tähän. |
| "Toimii pienellä kohinaisella datalla" — ei bayesilaista, ei kalman-filtteröintiä, ei smoothing-mekanismia | **KATTAA β** | β C1 + reunaehto-otsikko "Pieni N + viiveellinen + kohinainen" kysyy nimenomaan tämän. |
| "Viiveellinen palaute" — pitkän viiveen palautteen mallinnus puuttuu | **KATTAA β** | β C5 kysyy Banister-FFM:n, state-space delay-inputin ja time-since-last-session-painotuksen voimasovellettavuutta. |
| "Ilmaisee epävarmuutensa" — luottamusvälit/posteriorit puuttuvat 5/6 säätökanavalta | **KATTAA β** | β C3 (kalibroitu epävarmuus, posterior-CI, sanity-clamping, UX) kattaa täsmälleen tämän. |
| "Itse itseään paremmaksi ohjelmoijaksi" — ei käyttäjäkohtaista parametrivektoria | **KATTAA β** | β C2 (mitkä parametrit opittavissa n≈100/500 datalla) + C7 (realistisuusarvio) kattaa ytimen. |
| Persistointi — CFG_DRIFT-bug + ei muita user-spec-parametreja IDB:ssä | **KATTAA β** *(rivi sisältää myös pienen insinöörityö-osan)* | β C6 (persistointi-arkkitehtuuri, posterior vs. piste, versiointi) kattaa pääaukon. CFG_DRIFT-bug-osa = triviaali insinöörityö → kirjattu ENG-1:ksi backlogiin. |
| Datavuon hyödyntäminen — mvReps[] / bodyweight / HRV / RPE → narratiivi Claude:lle, ei feed-forward | **KATTAA β** | β C2 kysyy mitkä parametrit opittavissa mistä signaalista (vara-bias, fatiikkimuisti-decay, VL-cap, palautumis-aikavakio, velocity-1RM-slope, HRV-suhde). |

## 8b-taulukko (6 riviä)

| B-osion rivi (lyhenne) | Luokka | Perustelu |
|---|---|---|
| "Oikeat liikkeet vaihe × tavoite × heikko kohta × vamma × kalusto" — heikkokohta puuttuu, vaihe ei vaikuta liikevalintaan | **KATTAA α** | α:n päätutkimuskysymys + C2 (päätössäännöt vaihe/heikkokohta/vamma → valinta) vastaa täsmälleen tähän. |
| Tietomalli — 8+ kenttää puuttuu | **KATTAA α** | α C1 listaa täsmälleen nämä kentät (heikkokohta, SFR, contraindications, kokemustaso, kalusto, antagonisti, velocity-arkkityyppi). |
| Liikevalinta huomioi heikkokohdat — ei heikkokohta-kohdistusta ohjelman kokoamisessa | **KATTAA α** | α C2:n heikkokohta-luoti (esim. "off-the-floor heikko" → board pull / snatch-grip / deficit) kysyy juuri tämän. |
| Liikepankki aktivoituu — 75 %+ käyttämättä | **KATTAA α** | α:n koko premissi (rikastettu metadata + tag-pohjainen valinta) johtaa pankin aktivoitumiseen — ratkaisu on α C6:n koodausvalmis tuotos. |
| 17 ohjelmointityyliä eivät eriydy liikevalinnoissa | **KATTAA α** *(α-muutos 2 nosti tämän omaksi C3:ksi vaiheen 2 hionnassa)* | Alkuperäisessä α:ssa katettu kapeasti; hiotussa versiossa oma alakysymys C3 jolla taksonomia-tuotos. |
| Antagonisti-tasapaino — ei mallinneta | **KATTAA α** | α C1 listaa "Antagonisti-pari" attribuutiksi ja C2 "Antagonisti-tasapaino" päätössäännöksi (Eric Cressey 2:1). |

## Yhteenveto vaiheen 1 tuloksesta

- **13 B-osion riviä** käyty läpi (7 × 8a + 6 × 8b)
- **0 riviä** luokassa **EI KUMPIKAAN — PUUTTUVA TUTKIMUSVAJE**
- **0 riviä** luokassa **EI KUMPIKAAN — INSINÖÖRITYÖ** (CFG_DRIFT-bug-osa on insinöörityö, mutta rivin pääaukko on β C6:n piirissä — bugi kirjattu erikseen ENG-1:ksi)
- **13/13 riviä** katettu α:lla tai β:lla

**Kattavuus vahvistettu.** Tutkimusvaihe täydellinen.

**Huomautus:** tämä on tutkimusvaiheen kattavuus, ei vaiheen 8 onnistumisen lupaus. Tutkimustulosten laatu ja niiden kääntäminen speciksi ovat erilliset riskit.

---

# Osa 3 — Hiottu syvätutkimuskehote α (liikevalintamoottori, 8b)

> Lähdetiedosto: `docs/SYVATUTKIMUS_ALPHA_liikevalintamoottori.md`.
>
> **Vaiheen 2 hionnan jälkeen:**
> - α-muutos 1: C1:n SFR-luoti avoimena (ei oleta numerointia), C6:n attribuuttiskeemassa sfrTier-rivi avoin
> - α-muutos 2: Uusi alakysymys C3 "Tyylieriytys — kuinka monta valintapolkua tarvitaan?" (entinen C2:n viimeinen luoti nostettu omaksi alakysymykseksi, taksonomia-tuotos vaaditaan)
>
> Vanha numerointi C3 → C4, C4 → C5, C5 → C6. C6:n koodausvalmis rakenne säilyy sisällöllisesti.
>
> **Käyttö:** kopioi tutkijalle vain "═══" -rivin jälkeinen sisältö.

# Syvätutkimuspyyntö — algoritminen liikevalintamoottori voimaharjoittelussa

## Konteksti tutkijalle

Olen kehittämässä suomenkielistä voimaharjoittelusovellusta (kohderyhmä: kokeneet voimanostajat, streetliftaajat, kovan tason atletit jotka ohjelmoivat itse). Sovelluksen liikepankissa on noin 60–105 liikettä, mutta nykyinen liikevalinta-algoritmi käyttää vain yksinkertaista lajidefault-listaa (3–4 pääliikettä per laji) + keyword-pohjaista vammasuodatusta + kalusto-poissulkua. Lopputulos on, että 75 %+ liikepankista jää käyttämättä ohjelmoinnissa, ja kaikki 17 ohjelmointityyliä (Wendler 5/3/1, GZCL, Westside Conjugate, Sheiko, Madcow 5×5, Smolov Jr, Coan–Phillipi, DUP, Block-periodisaatio jne.) jakavat saman primary-valinnan — vain weekDefs ja kuormaprosenttiketju eroavat.

Olen tunnistanut, että aidosti yksilöllinen liikevalinta vaatii liikkeen tietomallin laajennuksen ja algoritmisen valintaprosessin, joka tunnistaa atletin heikon kohdan, vammaprofiilin (sekä absoluuttisen että muokattavan), kokemustason, kaluston ja blokin vaiheen (foundation / strength / intensity / peaking). Tarvitsen syvällisen kirjallisuus- ja käytäntö-pohjaisen vastauksen siitä, miten alalla rakennetaan tällainen järjestelmä.

**Tarkoitus:** tutkimuksen tulos käännetään suoraan attribuuttiskeemaksi (lisätään `PRESET_MOVEMENTS`-tietomalliin) ja päätössääntö-taulukoksi (valintamoottorin sydän). En tarvitse koodia — tarvitsen päätös­tieteellisen runkon.

---

## Fabrikointi-tarkistus alkuun

Ennen kuin vastaat varsinaisiin kysymyksiin, listaa:

1. **Epävarmuudet ja oletukset**, joita teet tästä kontekstista (esim. "oletan että sovellus tukee suomalaisten kovan tason atleettien kohderyhmää, ei aloittelijoita").
2. **Tutkimusalueet, joilla vertaisarvioitu evidenssi on ohutta tai puuttuu kokonaan**. Ole rehellinen — älä keksi numeroita.
3. **Lähdetyypit, joihin nojaat** (vertaisarvioitu tutkimus / opettajaohjeet [Beardsley, Helms, Israetel, Schoenfeld, Jukic, RP, Juggernaut, GZCL, Stronger By Science] / kaupallinen sovellus-kirjallisuus / harvinaiset käytännön empiiriset käytännöt).

Jos epävarmuus on iso, sano se. **Älä keksi tarkkoja sääntöjä, lukuja tai liiketaggeja jos primaarilähteessä ei niitä ole.** Mieluummin "vertaisarvioitu evidenssi tästä erikseen taggauksesta: n=0; käytännön ohjeistus Israetel/Helms-kirjallisuudessa: kyllä mutta ei numeroitu" kuin keksitty numero.

---

## Päätutkimuskysymys

**Miten rakennetaan algoritminen liikevalintamoottori voimaharjoittelusovellukselle siten, että se valitsee kokeneen atletin (intermediate–elite) yksilölliseen ohjelmaan oikeat liikkeet huomioiden vaiheen (foundation/strength/intensity/peaking) × tavoitteen (max voima / hypertrofia / urheilu-specific) × heikon kohdan × vammahistorian × salikaluston, ja aktivoi rikkaan liikepankin sen sijaan että käyttäisi 3–4 lajidefault-liikettä?**

---

## Alakysymykset

### C1 — Liikkeen tietomalli: mitä attribuutteja per liike?

Mikä on alan paras käytäntö liikkeen metatiedon strukturoinnissa? Listaa konkreettiset attribuutit, joita oppikirjat ja edistyneet sovellukset (esim. *Stronger By Science*, *RP Hypertrophy*, *Juggernaut AI*, *Liftvault*, *BoostCamp* -tyyliset järjestelmät) ylläpitävät per liike. Erityisesti haluan tietää:

- **Heikkokohta-kohdistus**: miten *lockout / bottom / sticking point / off-the-floor / range-of-motion -sektori* taggataan per liike? Onko vakiintunutta taksonomiaa (esim. Westside-piireissä on "max-effort variation pool", joka tag-merkitään heikkokohdan mukaan)?
- **Stimulus-to-Fatigue Ratio (SFR)** per liike: **onko SFR operationalisoitu numeerisesti missään lähteessä, vai onko se kvalitatiivinen heuristiikka (Israetel: korkea/keski/matala)? Jos kvalitatiivinen, mikä on paras tapa diskretisoida se päätössäännöille keksimättä evidenssipohjaa jota ei ole?** Onko SFR per atletti vai per liike (esim. "barbell back squat: SFR=korkea, atleetista riippumaton" vs. "atletti-spesifi modifier")?
- **Velocity-arkkityyppi**: concentric-explosive (kuten dynamic-effort kyykyt) vs. controlled-eccentric (kuten tempo-bench) — käytetäänkö tätä ohjelmointityökaluissa?
- **Lihastasapaino-pari**: vaakavetoliike ↔ vaakatyöntöliike, vertikaaliveto ↔ vertikaalipunnerrus, polvi-dominantti ↔ lonkka-dominantti — mikä on minimi balance-taksonomia?
- **Vamma-contraindications**: olka-impingement, polvinivelongelmat, alaselkä, kyynärpää — taksonomia per kohde?
- **Kokemustaso-suositus**: aloittelija/intermediate/edistynyt/eliitti — onko jokaisella liikkeellä `min/max experience` -kenttä alan käytännössä?
- **Kalustovaatimukset**: minimi-taksonomia (`barbell_rack`, `pullup_bar`, `dip_station`, `cable_machine`, `dumbbells`, `rings`, `safety_squat_bar`, `trap_bar`, `chains/bands`, ...)?

Anna jokaiselle attribuutille **status** (VERIFIOITU/DOKUMENTOITU/EPÄVARMA) ja perustelu.

### C2 — Päätössäännöt: kuinka attribuutteja yhdistetään valinnaksi?

Kun liikkeillä on rikastettu metadata, mikä on alan paras käytäntö niiden yhdistämisessä valinnaksi? Erityisesti:

- **Vaihe → liikevalinta**: foundation-vaiheessa volyymisesti tehokas SFR-rikas liike vs. peaking-vaiheessa kisaspesifinen liike — onko vakiintunutta sääntöä? Mikä on Issurin-block-periodisaation kanoninen liikevalintaohjeistus?
- **Heikkokohta → liikevalinta**: jos atletti raportoi "off-the-floor maavedossa heikko", mikä on algoritmin valitsema accessory (Snatch-grip DL? Deficit DL? Block pull?). Onko Westside-tyylin "max-effort lift rotation" -käytännölle olemassa formaali kuvaus?
- **Vamma → liikevalinta**: jos olka-impingement on `modified` (ei absoluuttinen), mitä variaatioita normaalisti suositellaan (esim. neutral-grip bench, floor press, landmine press)? Onko vakiintunutta vamma → modifikaatio -karttaa?
- **Antagonisti-tasapaino**: jos primarit ovat penkki + kyykky + maave, miten antagonistit (penkkiveto, hip-thrust) lisätään automaattisesti? Onko volyymisymmetria-sääntöjä (esim. *Eric Cressey:n pull/push 2:1 -sääntö*)?

Anna konkreettisia päätös­sääntöjä taulukkomuodossa, jos lähteet sallivat. Merkitse epävarmuudet.

### C3 — Tyylieriytys: kuinka monta erillistä liikevalintapolkua tarvitaan?

**Mitkä 17 ohjelmointityylistä (Wendler 5/3/1, GZCL J&T 2.0, Westside Conjugate, Sheiko-derived, Madcow 5×5, Smolov Jr, Coan–Phillipi, DUP, multi-issurin, hypertrofia, maksimivoima, yhdistelmä, eksentrinen, siirtymä, palautuminen, top-set-backoff, RP Minimalist) vaativat aidosti eriytetyn liikevalintalogiikan, ja mitkä toimivat jaetulla pohjalla + eri kuormaprosenteilla?**

Esim. vaatiiko Westside-conjugate oman valintapolun (ME-rotaatio viikoittain, dynamic-effort kiintein liikkein), Smolov kyykkyfokusoidun frekvenssin — vs. Wendler / Madcow / yhdistelmä joille jaettu pohja riittää? Anna jokaiselle 17 tyylistä:

- **Eriytys-status**: VAATII OMAN VALINTAPOLUN / JAETTU POHJA RIITTÄÄ / EPÄVARMA
- Jos vaatii oman polun: mikä on sen erityislogiikan ydin (esim. "Westside: weak-point-attribute on viikon valinnan ohjain, ei staattinen lajidefault")?
- Lähde + status (VERIFIOITU/DOKUMENTOITU/EPÄVARMA)

**Tuotos: taksonomia joka kertoo montako eriytettyä valintapolkua `pickPrimaries()`:n tilalle tarvitaan** (esim. "3 polkua riittää: A=jaettu lajidefault [12 tyyliä], B=ME-rotation-pohja [Westside], C=kyykky-frekvenssi-pohja [Smolov + Coan-Phillipi]" tai muu johdettu rakenne).

### C4 — Olemassa olevat järjestelmät: mikä toimii, mikä jää jumiin?

Tutki olemassa olevia voimaharjoittelusovelluksia ja niiden liikevalintaa:

- *Juggernaut AI* (Chad Wesley Smith), *BoostCamp*, *Liftvault* (template-pohjainen), *Hevy AI*, *Strong AI*, *RP Hypertrophy App*, *AI Coach* -tyyppiset järjestelmät
- *TrueCoach*, *TrainHeroic* — valmentaja-vetoiset
- Open-source projektit: *Boostcamp*, *Stronger By Science*-Excel-pohjat

Mitkä niistä todella tekevät yksilöllistä liikevalintaa, ja missä ne jäävät jumiin? Onko alalla *negatiivinen löydös*: ei yhtäkään olemassa olevaa järjestelmää, joka käyttäisi heikkokohta-attribuutteja algoritmisesti?

### C5 — Realistisuusarvio

Onko vision "yksilölle oikeat liikkeet attribuuttipohjaisesti" realistinen tutkimusperustan valossa? Vai onko se:
1. **Realistinen ja tehtävissä** — vakiintuneet taksonomiat olemassa, vain insinöörityö puuttuu
2. **Osittain realistinen** — heikkokohta-taksonomia on heuristinen, ei evidenssipohjainen
3. **Yliampuva** — alan paras käytäntö on edelleen valmentaja-vetoinen, ei algoritminen

Tarkenna: mikä osa visiosta on **VERIFIOITU** alan käytännössä, mikä **DOKUMENTOITU** mutta heuristinen, ja mikä on **EPÄVARMA / puuttuvaa tutkimusta**.

### C6 — Koodausvalmis tuotos

Mappaa vastauksesi suoraan seuraavaan rakenteeseen (en tarvitse JS/TS-koodia, vaan **päätös­tieteellisen rungon**):

**a) Liikkeen attribuuttiskeema** — taulukko: `attribute` | `tyyppi` | `arvojoukko` | `lähde` | `status`. Esim.:

| Attribute | Tyyppi | Arvojoukko | Lähde | Status |
|---|---|---|---|---|
| `weakPointTargets` | array | `["lockout", "off_floor", "bottom_squat", "sticking_point_bench", ...]` | Westside ME-rotation -käytäntö | DOKUMENTOITU |
| `sfrTier` *(arvojoukko C1-vastauksen mukaan — älä keksi numerointia jos lähde antaa vain kvalitatiivisen heuristiikan)* | C1-vastauksen mukaan | C1-vastauksen mukaan | C1-vastauksen mukaan | C1-status |
| ... | | | | |

**b) Liikevalintamatriisi** — taulukko: `signaali` | `valinta-vaikutus` | `lähde` | `status`. Esim.:

| Signaali atletista | Valinta-vaikutus | Lähde | Status |
|---|---|---|---|
| `weakPoint = "lockout_bench"` AND `phase = "strength"` | Pri 1: Board press 3-board; Pri 2: Pin press; Pri 3: Floor press | Westside ME-rotation | DOKUMENTOITU |
| ... | | | |

**c) Negatiiviset löydökset** — eksplisiittisesti: mistä alueesta vertaisarvioitu evidenssi puuttuu, ja mikä on käytännön konsensus tästä aukosta huolimatta.

---

## Lähdetaulukko (täytä tutkimuksen loppuun)

| Lähde | Tyyppi | Päivä/vuosi | Tietokanta | Saatavuus | Luotettavuusarvio |
|---|---|---|---|---|---|
| Esim. Israetel et al. — *Scientific Principles of Hypertrophy Training* (2020) | Kirja, käytännön ohjeistus | 2020 | — | Maksullinen | Erittäin korkea käytäntö, kohtuullinen tutkimuspohja SFR-arvioille |
| ... | | | | | |

---

## Fabrikointi-tarkistus loppuun

Vahvista uudelleen:

1. **Mitkä väitteet ovat VERIFIOITUJA** (vertaisarvioitu tutkimus, sitaatti saatavilla)?
2. **Mitkä DOKUMENTOITUJA** (Israetel/Helms/Jukic ym. kirjat, blogit, käytännön ohjeistus)?
3. **Mitkä EPÄVARMOJA** (sinun heuristiseen päättelyysi perustuvat)?
4. **Mitä jäi pimentoon** — mihin alakysymykseen et löytänyt tyydyttävää vastausta?

Suuri kiitos rehellisestä, taulukkomaisesta, järjestelmäajatteluun perustuvasta vastauksesta. **Kieli: suomi.**

═══════════════════════════════════════════════════════════════

---

# Osa 4 — Hiottu syvätutkimuskehote β (adaptiivinen oppimismalli, 8a)

> Lähdetiedosto: `docs/SYVATUTKIMUS_BETA_adaptiivinen_oppimismalli.md`.
>
> **Vaiheen 2 hionnan jälkeen:**
> - β-muutos 1: C2:n fatiikkimuisti-decay-rivillä eksplisiittinen ehdollisuus C5:n FFM-tulokseen ("jos ei vahvistu, parametri jää staattiseksi prioriksi, ei opittavaksi")
> - β-muutos 2: tekstiä ei muutettu — CFG_DRIFT-bug kirjattu erikseen ENG-1:ksi backlogiin
> - C7:n MCP-for-one-kysymys säilyy koskemattomana (β:n tärkein yksittäinen tuotos)
>
> **Käyttö:** kopioi tutkijalle vain "═══" -rivin jälkeinen sisältö.

## Konteksti tutkijalle

Olen kehittämässä voimaharjoittelusovellusta (kohderyhmä: kokeneet voimanostajat, streetliftaajat, kovan tason atletit jotka ohjelmoivat itse — yksi käyttäjä, ei populaatio). Sovelluksen autoregulaatio-engine on tällä hetkellä **sääntöpohjainen + tilastollinen hybridi**, ei aidosti oppiva. Tämä tarkoittaa:

- Engine kerää joka sarjasta: kuorma, toistot, vara (RIR-ekvivalentti V0–V5), liike-velocity per toisto (jos mittari kytketty: Enode/Vitruve), session-tason HRV (Oura/Garmin/Whoop), kehonpaino-trendi.
- Engine säätää seuraavan session kuormaa kuudella kanavalla, joiden **kaikki kynnysarvot ovat hardcoded-vakioita** koodissa (esim. "varaTrend: jos viim. 6 sarjan Vx-overshoot ≥ +1, lisää 3,5 % kuormaan"; "CFG_DRIFT: 3 perfect-sessiota peräkkäin → +1 %/sessio TM:lle"; "readiness-cap: HRV z-score ≤ -1,0 → punainen, ei progressiota").
- Ainoa pysyvä **oppimistila** on `aggressivenessLearned ∈ [-1, +1]` -skalaari, joka päivittyy viim. 3 session valintastreikin (SAFE/TARGET/AGGRESSIVE) perusteella. Tämä on streak-laskuri, ei mallin parametri.
- `mvReps[]`-arrayt (rep-by-rep velocity-data) kerätään, mutta käytetään vain RTF-mallin (rep-to-failure × velocity) lineaarisen regression r²-arvioon — eivät ohjaa kuormamallinnusta.

**Vision** (mihin tutkimusta haetaan): engine oppisi yhden käyttäjän velocity-, HRV-, RPE/vara- ja suorituspalautteesta yksilön omat optimi-parametrit — esim. henkilökohtainen "vara-bias" (kuinka paljon atletti yliarvioi varansa V-asteikolla), "fatiikkimuisti-decay" (kuinka pitkä jälkivaikutus raskaalla sessiolla on hänen tapauksessaan), "optimaali VL-cap" (paljonko velocity-loss-prosenttia ylittäen tämä atletti väsähtää eri tavalla kuin Pareja-Blanco 2017 -populaatio antaisi olettaa).

**Reunaehdot, jotka tekevät tehtävästä vaikean:**

1. **Pieni N**: yhden käyttäjän data, n ≈ 100–500 sarjaa ennen kuin ensimmäinen "vahva" oppimishetki olisi mielekäs.
2. **Viiveellinen palaute**: yhden session vaikutus näkyy 2–4 sessiota myöhemmin (fatiikkikertymä). Suorituspalaute ei ole "1 toiminta → 1 reaktio" vaan "1 toiminta × kumulatiivinen tila → reaktio 3–7 päivän viiveellä".
3. **Kohinainen palaute**: unen laatu, työstressi, ravinto vaikuttavat — engine ei kaikkea näe.
4. **Tutkimusperustan velvoitteet**: engine ei saa lähteä keksimään uusia kynnyksiä kontrolloimattomasti. Pitää säilyttää tutkimuspohjaiset rajat (esim. Pareja-Blanco VL-cap-rangit) **prioreina**, mutta oppia näiden sisällä yksilöllisiä optimi-arvoja.

**Tarkoitus:** tutkimuksen tulos käännetään suoraan mallinnusarkkitehtuuriksi (mikä malli, mitkä parametrit, mikä optimointialgoritmi) ja persistointi-suunnitelmaksi (mitkä parametrit IDB:hen).

---

## Fabrikointi-tarkistus alkuun

Ennen kuin vastaat varsinaisiin kysymyksiin, listaa:

1. **Epävarmuudet ja oletukset** kontekstista (esim. "oletan että sovellus toimii selaimessa eikä voi ajaa raskasta optimointia; oletan että käyttäjä ei tee data-labeling-työtä").
2. **Tutkimusalueet, joilla vertaisarvioitu evidenssi on ohutta tai puuttuu**:
   - Onko vertaisarvioituja tutkimuksia n=1 -tason adaptiivisesta voimaharjoittelu-mallinnuksesta?
   - Onko alalla esimerkkejä, joissa Bayesilainen päivitys / Kalman-filteröinti / online-learning on viety tuotantotasolle voimavalmennuksessa?
3. **Lähdetyypit, joihin nojaat**: vertaisarvioitu (sports science / online learning -kirjallisuus) / urheilututkimus-konsultaatiot / kaupallinen sovellus-kirjallisuus / ML-alan referenssit (Bayesian optimization, contextual bandits, hierarchical models).

**Älä keksi mallinnusarkkitehtuuria, jos sitä ei ole vertaisarvioidulla tasolla julkaistu n=1 + delayed feedback -reunaehdoissa.** Mieluummin "ei vertaisarvioitua n=1-voimavalmennus-mallinnusta; lähimpänä Bayesilainen optimointi muista pienen N:n optimointitehtävistä" kuin keksitty optimaalinen arkkitehtuuri.

---

## Päätutkimuskysymys

**Mikä mallinnusarkkitehtuuri sopii yhden voima-atletin (n ≈ 100–500 sarjaa) data­strömin (vara, velocity, HRV, suorituspalaute) hyödyntämiseen siten, että engine voi oppia hänen henkilökohtaisia parametrejaan (vara-bias, fatiikkimuisti-decay, optimaali VL-cap, palautumis-aikavakio) ilman että se ajautuu pois tutkimuspohjaisista turvarajoista ja siten että se ilmaisee epävarmuutensa kalibroidusti? Onko vision "sovellus kehittää itse itseään paremmaksi ohjelmoijaksi" -taso aidosti realistinen pienen N:n ja viiveellisen palautteen reunaehdoissa?**

---

## Alakysymykset

### C1 — Mallinnusarkkitehtuuri-vaihtoehdot

Mitkä mallinnusperheet sopivat n=1 + delayed feedback -ongelmaan voimaharjoittelussa? Arvioi:

- **Bayesilainen päivitys / hierarkkinen Bayes**: priorina populaatio-tutkimusarvot (esim. Pareja-Blanco VL-cap-rangit), posterior päivittyy joka session jälkeen. Konjugaattisuus vai MCMC? Riittääkö 100–500 datapistettä mielekkääseen posteriorin terävöitymiseen?
- **Kalman-filteröinti** (state-space): "todellinen 1RM" / "todellinen vara-bias" piilevänä tilana, observaatiot kohinaisia. Mikä on dynamiikka-yhtälö fatiikkikertymälle?
- **Online learning / SGD**: yksinkertaisin, mutta voiko ajautua pois turvarajoista nopeasti?
- **Gaussian Process Regression**: pieni N + epävarmuuden kalibrointi luonnostaan. Mitkä kernel-valinnat?
- **Contextual bandits**: jos säätökanava = "armi", konteksti = atletin sen hetkinen tila. Onko relevanttia voimavalmennuksessa?
- **Reinforcement learning**: alueellisesti vaikea (delayed reward), todennäköisesti liian datanälkäinen n=1:lle. Vahvista tai kumoa.

Anna jokaiselle perheelle: **soveltuvuus** | **vahvuudet** | **heikkoudet n=1 + delayed feedback -kontekstissa** | **status** (VERIFIOITU/DOKUMENTOITU/EPÄVARMA).

### C2 — Parametrit jotka voidaan oppia, ja mitkä pitää lukita

Mitkä yksilölliset parametrit ovat aidosti opittavissa tämän datasetin koolla, ja mitkä pitää säilyttää tutkimuspriorina staattisena? Esim.:

| Parametri | Voidaanko oppia n ≈ 100? | n ≈ 500? | Lukittava tutkimusarvoon? |
|---|---|---|---|
| Vara-bias (V-asteikon yliarviointi) | ? | ? | ? |
| Fatiikkimuisti-decay (raskaan sessiosession jälkivaikutuksen aikavakio) — **edellyttää että C5 vahvistaa FFM:n tai vastaavan mallin voimasovellettavuuden vertaisarvioidusti; jos ei vahvistu, tämä parametri jää staattiseksi prioriksi eikä opittavaksi** | ? | ? | ? |
| Optimaali VL-cap (henkilökohtainen vs. Pareja-Blanco-populaation) | ? | ? | ? |
| Palautumis-aikavakio (sessio-väli optimaalisen palautumisen kannalta) | ? | ? | ? |
| Velocity-1RM-kaltevuus (henkilökohtainen vs. mediaani-malli) | ? | ? | ? |
| HRV-suhde suorituskykyyn (atletin henkilökohtainen z-score-vastefunktio) | ? | ? | ? |

Tarkenna: kuinka monta datapistettä per parametri tarvitaan mielekkääseen oppimiseen? Mikä on sample size -kynnys, jonka alapuolella priorin pitää voittaa data?

### C3 — Kalibroitu epävarmuus

Miten engine ilmaisee kalibroidun epävarmuuden parametrien arvoista atletille? Erityisesti:

- **Luottamusvälit**: 80 % / 95 % posterior-CI per parametri. Onko Bayesilainen vai bootstrap-pohjainen?
- **"Älä toimi vielä" -kynnys**: kuinka pieni epävarmuus pitää olla ennen kuin engine alkaa käyttää opittua arvoa? Mikä on alan paras käytäntö?
- **Käyttäjä-UX**: miten epävarmuus välitetään ei-teknisille kovan tason atleteille? (Esimerkki nykyisestä mekanismista: `RTF_MODEL_STATUS = "preview"` näkyy UI:ssa "Velocity-malli rakentuu" -tekstinä.)

### C4 — Turvarajat ja prioreiden ankkurointi

Miten engine pidetään tutkimuspohjaisten turvarajojen sisällä, vaikka se oppii?

- **Hierarkkinen Bayes** mahdollistaa populaatio-priorin → yksilön posteriorin. Esim. Pareja-Blanco 2017 -VL-cap-rangit foundation 25–35 %, strength 15–20 %. Atletin posterior voisi tarkentua välille 28–32 %, mutta ei karata ylä-/alarajan ulkopuolelle ilman vahvaa evidenssiä.
- **Constrained optimization**: parametriavaruus rajoitetaan a priori turvarajoihin. Onko realistinen vaihtoehto?
- **Sanity-clamping**: jos posterior karkaa esim. ±2 SD priorin ulkopuolelle, engine emittoi varoituksen ja pysyy priorissa. Mikä on alan käytäntö?

### C5 — Viiveellinen palaute ja fatiikkimuisti

Miten mallinnetaan vaikutus joka näkyy 2–4 session viiveellä? Tutkimuksessa puhutaan usein:

- **Banister-Fitness-Fatigue-malli** (FFM): kahden eksponentiaalisen kerroksen erotus (fitness − fatigue). Onko relevanttia voimaharjoittelussa, vai vain kestävyydessä?
- **State-space-malli viiveellisellä input:lla**: input vaikuttaa tilaan delay-funktion kautta.
- **Time-since-last-session-painotettu likelihood**: yksinkertaisin lähestymistapa.

Mikä näistä on alan käytäntö voimaharjoittelussa? Onko vertaisarvioituja FFM-implementaatioita voimavalmennukseen (ei vain kestävyyteen)?

### C6 — Persistointi-arkkitehtuuri

Käytännön implementaatio: jos parametrit opitaan, missä ne tallennetaan?

- **Käyttäjäkohtainen parametri-vektori IDB:hen** (esim. `settings.learnedParams = { varaBias: 0.3, fatigueDecay: 4.2, vlCapAdjustment: -2.5 }`)?
- **Posterior-distribuutiot vai pelkät pisteet**?
- **Versiointi**: jos mallinnusarkkitehtuuri päivittyy, miten vanha posterior-data migroituu?

### C7 — Realistisuusarvio (kriittinen)

**Onko vision "sovellus kehittää itse itseään paremmaksi ohjelmoijaksi" -taso aidosti realistinen pienen N:n + viiveellisen palautteen reunaehdoissa?**

Pyydän erityisesti rehellistä arviota:

1. **Realistinen ja tehtävissä**: mainstream sports science / ML -kirjallisuudessa on dokumentoitu n=1-ratkaisuja, jotka oppivat 2–4 parametria 100–500 datapisteestä. *Yliampuva* osa: ehkä 6+ parametrin yhtäaikainen optimointi.
2. **Osittain realistinen**: 1–2 parametria opittavissa (esim. vara-bias on yksinkertainen lineaarinen päivitys), mutta fatiikkidynamiikka jää staattiseksi prioriksi.
3. **Yliampuva**: pienen N:n + viiveellisen palautteen + kohinan + turvarajojen yhdistelmä tekee mallinnuksesta tilastollisesti epäluotettavaa. Alan paras käytäntö on edelleen sääntöpohjainen + valmentajan empiirinen säätö.

Mitä **pienin mielekäs ensimmäinen askel** voisi olla, joka ei ole "tee koko ML-systeemi" mutta ei myöskään "lisää uusi sääntö koodiin"? Esim. yksi Bayesilaisesti päivittyvä parametri kerrallaan, **MCP for one**?

---

## Koodausvalmis tuotos

Käännä vastauksesi seuraavaan rakenteeseen (en tarvitse koodia):

**a) Mallinnusarkkitehtuuri-suositus** — taulukko: `vaihe` | `malli` | `parametrit` | `data-vaatimus` | `lähde` | `status`. Esim.:

| Vaihe | Malli | Parametrit | Data-vaatimus | Lähde | Status |
|---|---|---|---|---|---|
| MVP (1–2 parametria) | Bayesilainen päivitys konjugaattipriorilla | vara-bias, velocity-1RM-slope | ≥ 50 sarjaa | — | DOKUMENTOITU |
| Vaihe 2 | Hierarkkinen Bayes + populaatio-priori | + optimal VL-cap | ≥ 200 sarjaa | — | EPÄVARMA |
| ... | | | | | |

**b) Päätös­säännöt** — taulukko: `tilanne` | `engine-toiminta` | `lähde` | `status`. Esim.:

| Tilanne | Engine-toiminta | Lähde | Status |
|---|---|---|---|
| n < 50 sarjaa | Käytä vain priori-arvoja; älä päivitä parametreja | — | DOKUMENTOITU |
| 80 % posterior-CI ulottuu priori-keskiarvon yli | Älä käytä opittua arvoa vielä | — | EPÄVARMA |
| ... | | | |

**c) Negatiiviset löydökset** — eksplisiittisesti: mihin alueeseen ei löydy vertaisarvioitua evidenssiä, ja mikä on alan käytännön kanta tästä aukosta huolimatta.

**d) Realistisuusarvio (1 kappale)** — rehellinen näkemys: onko visio toteutettavissa, ja mikä on järkevä ensimmäinen askel.

---

## Lähdetaulukko (täytä tutkimuksen loppuun)

| Lähde | Tyyppi | Päivä/vuosi | Tietokanta | Saatavuus | Luotettavuusarvio |
|---|---|---|---|---|---|
| Esim. Murphy *Probabilistic Machine Learning* (MIT 2022) | Kirja, Bayesilainen ML | 2022 | — | Avoin lukutila | Erittäin korkea |
| Esim. Banister 1980 / 1991 fitness-fatigue | Vertaisarvioitu, kestävyyspainotteinen | 1980/1991 | PubMed | Maksullinen | Korkea kestävyyteen, epävarma voimaan |
| ... | | | | | |

---

## Fabrikointi-tarkistus loppuun

Vahvista uudelleen:

1. **Mitkä väitteet ovat VERIFIOITUJA** (vertaisarvioitu tutkimus, primaarilähde saatavilla)?
2. **Mitkä DOKUMENTOITUJA** (alan kirjat, blogit, käytännön ohjeistus — Bompa, Schoenfeld, Israetel, Helms, Bondarchuk)?
3. **Mitkä EPÄVARMOJA** (sinun heuristiseen päättelyysi perustuvat ML-/sports-science -yleisestä kontekstista)?
4. **Mitä jäi pimentoon** — mihin alakysymykseen et löytänyt tyydyttävää vastausta?
5. **Realistisuusarvio**: oletko luottavainen vai epävarma siitä että visio on toteutettavissa annetun datan koolla?

Suuri kiitos rehellisestä, kriittisestä, taulukkomaisesta vastauksesta. Älä myönnä visioa todeksi, jos evidenssi ei tue sitä. **Kieli: suomi.**

═══════════════════════════════════════════════════════════════

---

# Osa 5 — Insinöörikorjausten backlog

> Lähdetiedosto: `docs/BACKLOG_VAIHE_1_2.md`.
>
> **Periaate:** insinöörikorjaukset ja tutkimustulosten implementointi pidetään erillisissä /goal-kierroksissa. Akselin pilot-regression diff-analyysi ei voi erottaa muutoslähteitä jos ne sekoittuvat.

Tarkoitus on **erottaa insinöörityö tutkimustulosten implementoinnista**, jotta yhden /goal-kierroksen aikana ei ole epäselvyyttä siitä, kumpi muutti enginen käyttäytymistä.

---

## ENG-1 — CFG_DRIFT_APPLIED ei persistoidu mesocycle.cfgDriftHistory:yn

**Lähde:** docs/VAIHE_8_AUDIT_JA_AUKOT.md A1 — "CFG_DRIFT-persistointi-bug tunnistettu. Drift lasketaan in-memory-na, emitoidaan `cfgDriftApplied`-kenttään (engine.js rivi 4849), mutta ei näy persistoituvan takaisin mesocycle.cfgDriftHistory-listaan."

**Tyyppi:** Insinöörityö. **EI tutkimusvaje, EI β-kysymys.**

**Konkreettinen oire:** Drift häviää session-vaihdossa. Vaikka engine laskee perfect-streak-pohjaisen +1 %/sessio TM-säädön, se ei kumuloidu mesocyclen yli.

**Ratkaisu:** UI:n / saveSession-flow:n pitää lukea `rec.cfgDriftApplied`-kenttä ja kirjoittaa se mesocycle.streetliftingConfig.cfgDriftHistory-listaan. Tarvittavat muutokset:

1. Tunnista koodikohta jossa drift tulisi tallentaa (todennäköisesti index.html:n saveWorkoutToDb-flow tai engine.js:n recommend()-flow jos halutaan engine-side persistointi).
2. Lisää testi joka simuloi 3 perfect-sessiota → varmistaa että 4. session recommend() lukee kumuloituneen driftin mesocycle.cfgDriftHistory:sta.
3. Verifioi smoke-testillä ja Akselin pilot-regressiolla että driftin kumulointi ei ajaudu yli +5 %/blokki tai +10 %/koko cap-rajojen.

**Sijoitus prosessissa:**
- **EI samaan /goal-kierrokseen β:n implementoinnin kanssa.** Jos molemmat tehdään samaan aikaan, ei voi erottaa kumpi muutti engine-käyttäytymistä (driftin kumulointi vai uusi β-malli).
- Voidaan tehdä **ennen vaihetta 8** osana vaiheiden 1–7 auditin loppuhionnoissa, koska se ei ole arkkitehtuurinen vaan triviaali persistointi-korjaus.
- Acceptance criterion: A1 = "3 perfect-sessiota → 4. session recommend() palauttaa driftPct joka on ≥ +2 %, ja arvo on luettavissa mesocycle.cfgDriftHistory:sta".

**Status:** OPEN — odottaa erillistä /goal-kierrosta. Ei viedä α / β -tutkimukseen.

---

## ENG-2 — AGGRESSIVENESS_LEARNED_UPDATED-trace puuttuu

**Lähde:** docs/VAIHE_8_AUDIT_JA_AUKOT.md A1 — "updateAggressivenessLearned() päivittää settings-tietokantaan mutta ei emitoi tracee. Pelkkää silent-update — diagnostiikka puuttuu."

**Tyyppi:** Insinöörityö. **EI tutkimusvaje.**

**Konkreettinen oire:** Atletti ei näe "Miksi tämä paino?"-paneelissa tai trace-historiassa milloin aggressivenessLearned vaihtui ja miksi. Diagnostiikka oppimisen läpinäkyvyyteen puuttuu.

**Ratkaisu:** Lisää data.js:n updateAggressivenessLearned()-funktioon trace-emit ennen / jälkeen saveSettings-kutsua. Trace-ID: `AGGRESSIVENESS_LEARNED_UPDATED`, fields: `{ prevLearned, newLearned, delta, reasonCode, streakIds, lastSessionFailure }`.

**Status:** OPEN — pieni insinöörikorjaus, voidaan tehdä missä tahansa /goal-kierroksessa joka muutenkin koskettaa data.js:n aggressivenessLearned-logiikkaa.

---

## ENG-3 — Modified-vammat eivät vaikuta liikevalintaan

**Lähde:** docs/VAIHE_8_AUDIT_JA_AUKOT.md A2 + A3 — "q11_injuries.type==='modified' ei vaikuta valintaan lainkaan (ohjataan engine-tason kuormamuokkaukseen, mutta ei mihinkään aktiiviseen logiikkaan)."

**Tyyppi:** Sekoitus. **Itse logiikka (variaatio-suositukset modifioiduille vammoille) on α:n piirissä (C2:n vamma-luoti).** Mutta sen jälkeen kun α antaa vamma → modifikaatio -kartan, sen wiring koodiin on insinöörityötä.

**Status:** Riippuu α:sta. Pidetään tässä backlogissa jotta muistetaan, että α:n tulosten saavuttua tämä on toinen täsmäkohta.

---

## Kategoria-yhteenveto

| ID | Tyyppi | Riippuu tutkimuksesta? | /goal-kierros erillinen β:sta? |
|---|---|---|---|
| ENG-1 | Triviaali persistointi-bugi | Ei | KYLLÄ — ehdoton |
| ENG-2 | Diagnostiikka-trace puuttuu | Ei | Ei pakottava, mutta järkevä eristää |
| ENG-3 | Modified-vammat → modifikaatiot | Riippuu α:sta | Tehdään α:n jälkeen, omana /goal-kierroksena |

---

**Periaate:** Insinöörikorjaukset ja tutkimustulosten implementointi pidetään erillisissä /goal-kierroksissa. Tämä mahdollistaa Akselin pilot-regression toimimisen control-mekanismina — jos kahden eri muutoslähteen vaikutukset sekoittuvat samaan kierrokseen, regression diff-analyysi ei kerro kumpi muutti enginen käyttäytymistä.

---

# Loppuyhteenveto

| Osa | Tiedosto | Mihin vaiheeseen |
|---|---|---|
| 1 — Audit + aukkokartta | `docs/VAIHE_8_AUDIT_JA_AUKOT.md` | Vaihe 1 askeleet A + B |
| 2 — Kattavuusanalyysi | (tämä master-dokumentti, ei muualla) | Vaihe 1 askel B-yhteenveto |
| 3 — α-kehote | `docs/SYVATUTKIMUS_ALPHA_liikevalintamoottori.md` | Palvelee 8b (liikevalintamoottori) |
| 4 — β-kehote | `docs/SYVATUTKIMUS_BETA_adaptiivinen_oppimismalli.md` | Palvelee 8a (adaptiivinen oppimismalli) |
| 5 — Backlog | `docs/BACKLOG_VAIHE_1_2.md` | Insinöörikorjaukset erillään α/β-tutkimusputkesta |

**Seuraava luonteva askel:** kopioi α ja β ulkoiseen syvätutkimukseen (Perplexity / ChatGPT Deep Research / Claude.ai web-haulla), palauta tulokset, ja siirry vaiheeseen 8 tietopohjalla joka on todennettu eikä keksitty.

**Älä sekoita** α/β -implementointia ja backlogin insinöörikorjauksia samaan /goal-kierrokseen — Akselin pilot-regression diff-analyysi vaatii erilliset kierrokset.
