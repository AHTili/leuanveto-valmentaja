# Backlog — vaiheen 1–2 insinöörikorjaukset

Tämä tiedosto kerää konkreettiset auditissa löytyneet bugit + insinöörityö-kohteet, **joita ei viedä syvätutkimukseen** (α / β) vaan korjataan koodaamalla osana vaiheita 1–7 ja vaiheen 8 toteutusta.

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

## ENG-4 … ENG-13 — α/β-implementoinnin insinöörityö

Nämä paljastettiin K1-rejakon kautta (master-dokumentin osa 2:n uudelleentarkastus): 12/13 B-osion riviä on PERIAATE+TOTEUTUS, eli tutkimustulos antaa "mitä/miten periaatteessa" mutta koodikytkös on erillinen merkittävä insinöörityö.

| ID | Liittyvä B-rivi | Tyyppi | Riippuvuus | Arvioitu koko |
|---|---|---|---|---|
| ENG-4 | 8a-1, 8a-2, 8a-5 | Online-oppimismallin implementointi (β:n valitsema arkkitehtuuri engine.js:ään) | β C1, C2 | ISO |
| ENG-5 | 8a-3 | Viiveellisen palautteen mallinnus (FFM jos C5 vahvistaa) | β C5 (ehdollinen) | KESKI–ISO |
| ENG-6 | 8a-4 | CI-propagointi UI:hin: 5/6 säätökanavan refaktorointi tuottamaan posterior-CI | β C3 | KESKI |
| ENG-7 | 8a-6 | Käyttäjäkohtainen parametrivektori IDB:hen (schema-laajennus + migraatio) | β C6 | KESKI |
| ENG-8 | 8a-7 | Feed-forward-datavuon refaktorointi narratiivista enginen sisään; **RPE-kenttä puuttuu kokonaan, lisättävä** | β C2 | KESKI |
| ENG-9 | 8b-2 | PRESET_MOVEMENTS-tietomallin laajennus + ~60 liikettä × ~8 attribuuttia ≈ 480 kenttää käsin täytettävänä | α C1 | **ERITTÄIN ISO** (manuaalinen) |
| ENG-10 | 8b-1 | pickPrimaries():n korvaus attribuuttipohjaisella valintamoottorilla | α C2, C6 | ISO |
| ENG-11 | 8b-3 | Wizard-laajennus heikkokohta-kysymyksellä + valintalogiikka | α C2 | KESKI |
| ENG-12 | 8b-5 | Factory-funktioiden eriyttäminen tyylien tarpeen mukaan (α C3:n taksonomian pohjalta) | α C3 | KESKI–ISO |
| ENG-13 | 8b-6 | Antagonisti-attribuutti + volyymisymmetria-laskenta accessory-slot-resolveriin | α C1, C2 | KESKI |

---

## ENG-16, ENG-17 — Avoimet päätöskohdat (kriittinen havaintotesti 2026-05-16)

**ENG-16 — Juurisyy 1: Default-mesocyclen phase ↔ VL-cap -ristiriita.** Identtinen kaava 5 default-mesocycle-profiilissa (beginner, cut-aggressive, returner, shoulder-limit, uncalibrated). Engine ehdottaa vk1 d5:lle 12,5 % VL-cap (auditin tutkimusrange foundation 25–35 %) ja vk2-3 d1/d3:lle 30 % (auditin range intensity 10–15 %). **Vaatii Akselin harjoitusteoreettisen arvostelman** (hypoteesi a/b/c, ks. `docs/SESSION_CLOSE_2026-05-16.md` osio 3.1). EI korjattu autonomisesti. Ratkaisuvaihtoehdot: (a) engine.js VL-cap-logiikan korjaus, (b) audit-baselines.mjs `DEFAULT_MESO_VL_CAP_BASELINES`-laajennus, (c) `deriveBlockPhase`-refaktorointi default-mesoille.

**ENG-17 — Juurisyy 2: Akselin streetlifting_16w vk12 deload-syvyys.** Helms 2018 -range vaatii ≥ −15 % deloadia. Akselin presetti antaa Δ% = −12 % ja −13,5 % (4 päivää: 1, 2, 4, 6). **Vaatii Akselin muistitarkistuksen**: tietoinen poikkeama vai unohtunut drift? Ratkaisuvaihtoehdot: (a) korjaa preset → vk12 deload ≥ −15 %, (b) lisää `deloadApplied: false`-mesometa-flagi samalla logiikalla kuin `tierProgressionApplied: false` + ENG-14 haarautuu, (c) jos "en muista" → siirtyy ENG-16:n kanssa samaan kategoriaan.

**KRIITTINEN PERIAATE:** 8a-implementointia EI saa aloittaa ennen kuin ENG-16 ja ENG-17 ratkeavat ja Akselin pilot-regressio palauttaa 0 INVARIANT_VIOLATION-flagia 8/8 profiililla. Oppivan mallin rakentaminen invariantteja rikkovan pohjan päälle on koko prosessin estämä vikatila.

---

## ENG-14, ENG-15 — Turvaverkon insinöörityö (voidaan aloittaa NYT, ei riipu α/β:sta)

| ID | Tyyppi | Tila |
|---|---|---|
| ENG-14 | `audit-engine.mjs`-laajennus `INVARIANT_VIOLATION`-flagilla (regression-pilot havaitsee Pareja-Blanco/Helms/Latella-rajojen rikkoutumisen) | OPEN — voidaan tehdä nyt α/β-tutkimusten rinnalla |
| ENG-15 | Edge-case-generator (luo synteettisiä input-sekvenssejä joissa naive learning ylittäisi invariantit; käytetään vaiheen 8a testauksessa) | OPEN — voidaan tehdä nyt α/β-tutkimusten rinnalla |

---

## Osittaiset vaiheet 1–7 — laajennus tarvittaessa

| Vaihe | Tila tällä hetkellä | Mitä puuttuu | Tehdäänkö nyt? |
|---|---|---|---|
| 1 Audit | Koodi-ankkuri valmis; aiempien keskustelujen audit + 10/10-vaatimusasettelu puuttuvat | Erillinen Akselin oma audit aiemmista keskusteluista (käyttäjän työ) | EI (käyttäjän audit-keskustelut) |
| 5 Validointi-toolchain | engine-pilot valmis; edge-case-generator + bug-reproducer puuttuvat | ENG-15 + bug-reproducer-skripti | ENG-15 OPEN nyt |
| 7 /goal per moduuli | Ei käytössä | /goal-kierroksen vakiomalli + esimerkki | TEHDÄÄN kun α/β-tulokset palaavat |

---

## Kategoria-yhteenveto

| ID | Tyyppi | Riippuu tutkimuksesta? | Erillinen /goal-kierros? | Aloitus |
|---|---|---|---|---|
| ENG-1 | Triviaali persistointi-bugi | Ei | KYLLÄ — ehdoton | Voi tehdä nyt |
| ENG-2 | Diagnostiikka-trace puuttuu | Ei | Ei pakottava, mutta järkevä eristää | Voi tehdä nyt |
| ENG-3 | Modified-vammat → modifikaatiot | Riippuu α:sta | Tehdään α:n jälkeen | α-tulosten jälkeen |
| ENG-4 | Online-oppimismalli | Riippuu β:sta | Iso oma /goal | β-tulosten jälkeen |
| ENG-5 | FFM-mallinnus | Riippuu β C5:stä | Tehdään ENG-4:n rinnalla jos C5 vahvistaa | β-tulosten jälkeen |
| ENG-6 | CI-propagointi UI:hin | Riippuu β C3:sta | Iso oma /goal | β-tulosten jälkeen |
| ENG-7 | Parametrivektori IDB:hen | Riippuu β C6:sta | Tehdään ENG-4:n yhteydessä | β-tulosten jälkeen |
| ENG-8 | Datavuo + RPE-kenttä | Riippuu β:sta | Iso oma /goal | β-tulosten jälkeen |
| ENG-9 | Tietomallin laajennus (~480 kenttää) | Riippuu α:sta | **Pisin yksittäinen tehtävä** | α-tulosten jälkeen |
| ENG-10 | Attribuuttipohjainen valintamoottori | Riippuu α:sta | Iso oma /goal | α-tulosten jälkeen |
| ENG-11 | Wizard-heikkokohta | Riippuu α:sta | Pieni–keski /goal | α-tulosten jälkeen |
| ENG-12 | Factory-eriyttäminen | Riippuu α C3:sta | Keski oma /goal | α-tulosten jälkeen |
| ENG-13 | Antagonisti + symmetria | Riippuu α:sta | Keski oma /goal | α-tulosten jälkeen |
| **ENG-14** | **audit-engine INVARIANT_VIOLATION** | **Ei** | **Voi tehdä nyt α/β rinnalla** | **NYT (turvaverkko)** |
| **ENG-15** | **Edge-case-generator** | **Ei** | **Voi tehdä nyt α/β rinnalla** | **NYT (turvaverkko)** |

---

**Periaate:** Insinöörikorjaukset ja tutkimustulosten implementointi pidetään erillisissä /goal-kierroksissa. Tämä mahdollistaa Akselin pilot-regression toimimisen control-mekanismina — jos kahden eri muutoslähteen vaikutukset sekoittuvat samaan kierrokseen, regression diff-analyysi ei kerro kumpi muutti enginen käyttäytymistä.

**Synkronointi α/β:n kanssa:** ENG-14 + ENG-15 (turvaverkko-insinöörityö) tehdään α/β:n rinnalla. Loput insinöörityöt (ENG-3 … ENG-13) odottavat tutkimustuloksia. ENG-1, ENG-2 voivat edetä milloin tahansa (eivät riipu mistään).
