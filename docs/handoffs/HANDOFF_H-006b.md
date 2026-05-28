# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-006b` |
| Tyyppi | `scope-expansion` |
| Laadittu | 2026-05-28 / Cowork-sessio |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssin vaiheeseen | Enabler vaiheelle **17 (Round B-α-2)** — itse aux, ei R-vaihe-siirto. H-006a velocity-data-flow on edellytys (suljettu 2026-05-28, HEAD 6676a86). |

**Tyyppi (scope-expansion):** A-kriteerit uuden ominaisuuden mitattavina hyväksyntäehtoina + eksplisiittinen scope-aita (§3). Vaatii regressio-pilot-passin (A5).

---

## 1. Tavoite

Aktivoi yksipisteinen primer-mekanismi (säilyttäen v4.21:n nykyinen 1-rep @ ~60% -flow) tankoliikkeille + lineaarisille BW+lisäpaino-liikkeille, lisää **päivän sys-1RM-päivitys** baseline-vertailun pohjalta (±2.5%/±5% kynnykset), aktivoi **K-β-1/2/4/5 -audit-flagit** audit-engine.mjs:ään, lisää **measurements-store `type='primer'`** cal-override-patternin generalisointina (ROADMAP §17).

**Mullistava taso H-006b:n yhteydessä:** Atletti näkee päivän sys-1RM-mukautuksen primer-velocityn pohjalta (esim. *"Tänään sys-1RM: 178→183 kg, +2.8% primer-pohjaisesti"*) + audit-läpinäkyvyyden (baseline-koko, drift, MVT-rajat). Säilyy yksipisteisenä — Akselin atletti-realismi (dippi-velocity epäluotettava, ei rakenneta LV-regressiota kaikille liikkeille).

## 2. Acceptance criteria

- **A1** (liike-spesifi primer-rajaus): engine.js MOVEMENT_MVT-vakioon (rivi 2145) lisätään `primerEnabled`-lippu per liike.
  - `primerEnabled: true`: Takakyykky, Lisäpainoleuanveto, Penkkipunnerrus, Pystypunnerrus, Maastaveto + muut tankoliikkeet (lineaarinen bar-trajectory, Enode-clip-mittaus luotettava)
  - `primerEnabled: false`: Lisäpainodippi (lyhyt amplitude), Muscle-up (multi-plane skill)
  - UI näyttää primer-card vain primerEnabled=true-liikkeille.
- **A2** (sys-1RM-päivitys baseline-vertailusta): engine.js uusi funktio `computeTodaySys1RM(primerVelocity, baseline, calibrationKg, movementId)`.
  - Vertaa primer-MPV vs baseline-mediaani (≥5 primer-mittauksen historia per liike).
  - Jos primer > baseline×1.05 → sys-1RM **+2.5–5%** (asteittain delta-prosentin pohjalta, max +5%)
  - Jos primer < baseline×0.95 → sys-1RM **−2.5–5%** (asteittain, max −5%)
  - Muuten sys-1RM = nimellinen calibration
  - Tallentuu `state.todaySys1RM[movementId]`. recommend() lukee state:sta jos olemassa, fallback calibration.
  - Säilyy päivän työsarjojen ajan (ei persisteeraa yli yön — nollautuu seuraavana päivänä).
- **A3** (K-β-1/2/4/5 -audit-flagit audit-engine.mjs:ään):
  - **K-β-1 PRIMER_DATA_AVAILABILITY** — primer-flow käynnistetty mutta velocityRep1 null → warning + fallback nimelliseen sys-1RM:ään
  - **K-β-2 BASELINE_SIZE** — jos primer-historia <5 mittausta per liike → `status: "rakentumassa"`, sys-1RM ei vielä päivity, UI countdown (esim. "3/5 primer-mittausta kerätty")
  - **K-β-4 DRIFT_DETECTION** — baseline-mediaani siirtynyt >10% 4 vk:n yli → retest-suositus + audit-trace-tagi `BASELINE_DRIFT_DETECTED`
  - **K-β-5 MVT_GUARD** — sys-1RM clamp ±15% calibration-arvosta (Pareja-Blanco 2017 extreme limit), estää sys-1RM:n karkaamisen yksittäisestä virheellisestä primer-mittauksesta
- **A4** (measurements-store `type='primer'`): data.js measurements-store tukee uutta type-arvoa `'primer'`. primerCompleteBtn-handler (index.html:13712) tallentaa primer-velocityn **sekä**:
  - sets-storeen `setRole='readiness_test'` (säilyy — vanhat funktiot toimivat)
  - **JA** measurements-storeen `{ type: 'primer', value: velocityRep1, movementId, dateISO, sessionId }`
  - K-β-audit lukee measurements-storesta puhtaammin kuin sets-storesta (vrt. H-006a:n 'Sarjoja 0' -regressio, jossa sets-store-filtterit sekoittuivat). SCHEMA pysyy 5:ssä (additiivinen, vrt. H-006a).
- **A5** (regressio): `tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` palauttaa kuormat bittitarkasti baseline-versiona JOS pilot-skenaariossa primer-data ei tallennu. Sallitut diffit: jos primer-data tallentuu, sys-1RM-päivitys voi muuttaa kuormaa ±2.5–5% (uusi käytös, intended). A0+A5 H-006a:sta säilyvät. 136 audit-flagia säilyvät baseline-arvona; uudet K-β-flagit voivat lisätä audit-flag-määrää intended-tasolla.
- **A6** (selain-testit): `?test=1` 612/614 + 5 uutta H-006b-spesifit testitapausta:
  - `testPrimerEnabledFilter` (A1) — vain primerEnabled=true-liikkeet saavat primer-card UI:n
  - `testComputeTodaySys1RM` (A2) — syöte/output-parit kynnysten ympärillä (±5%, ±10%, neutraalit)
  - `testKBetaFlagsEmission` (A3) — kaikki 4 K-β-flagia emittoituvat ko. tilanteissa
  - `testMeasurementsTypePrimerStorage` (A4) — primer tallentuu sekä sets-storeen että measurements-storeen
  - `testSys1RMClampGuard` (K-β-5) — extreme primer-arvo clampaa sys-1RM:n ±15% calibration-arvosta
- **A7** (UI-näkyvyys): index.html primer-card laajennetaan (säilyy v4.21:n pohjarakenne, lisätään tietoa):
  - Baseline-status-rivi: *"Baseline n=X mittausta, mediaani Y m/s"*
  - Sys-1RM-päivitys-indikaattori primer-completen jälkeen: *"Tänään sys-1RM: 178→183 kg, +2.8% primer-pohjaisesti"* (tai *"= nimellinen, primer baseline-ikkunan sisällä"*)
  - K-β-warningit näkyvinä: *"⚠️ Baseline-drift detected: primer-mediaani +12% 4 vk:n yli — harkitse retest"*

## 3. Reunaehdot ja scope-aita

**Sovellettavat invariantit (CLAUDE.md §2):** VL-cap (kaikki vaiheet), Deload Δ%, Tier-progression elite, Rep1 MPV slope per RIR (Sánchez-Moreno 2017), Failure-jälkeinen kuormapudotus — **kaikki koskemattomat**. H-006b ei muuta laskennan sääntöjä, vain syöte recommend():iin laajenee sys-1RM-puolelta.

**Mitä EI kosketa:**

- `recommend()`-päälogiikka — H-006b koskettaa vain sys-1RM-syötepolkua, ei laskennan sääntöjä
- LV-regressio (Akselin torjuma 2026-05-28 — atletti-realismi: dippi-velocity epäluotettava, ei voi rakentaa LV-regressiota kaikille liikkeille)
- 3-pisteen primer (Akselin torjuma — yksipisteinen säilyy)
- Reaaliaikainen velocity-stop setin sisällä (= eri vaihe, mahdollisesti vaihe 17:n loppupuolella)
- Target-velocity-display UI:ssa setin alussa (= jätetty pois)
- Vx-tavoitteen automaattinen säätö rep1 MPV:stä reaaliajassa (= jätetty pois)
- Enode-API-integraatio / OAuth / polling — **ei scopessa**, atletti kirjaa manuaalisesti (vahvistettu H-006a:ssa)
- MU + Dippi primer-flow (primerEnabled=false, atletti-realismi)
- HRV-bias (= vaihe 18 Round B-β)
- γ-peaking (= vaihe 20 Round B-γ)
- v4.21 primer-card UI-pohjarakenne säilyy — A7 lisää tietoa rivien tasolla, ei muuta layout-rakennetta
- recommend()-tier-promotion-logiikka (= eri scope)
- Manuaalisyötön UI (index.html:1920 + 13980) — säilyy ehjänä, ei poisteta

**Sisältyy aitaan (B-tyylinen sulkuvaihe, kuten H-005 + H-006a):**

- ROADMAP.md rivi 9 päivitys: HEAD 6676a86 → uusi HEAD-sha, APP_VERSION 4.52.14 → 4.52.15
- sw.js APP_VERSION-bump (B6)
- docs/handoffs/HANDOFF_H-006b.md arkistointi + HANDOFF.md nollaus

**Tekniset reunaehdot:**

- Ei uusia npm-riippuvuuksia (vanilla JS, IndexedDB)
- **SCHEMA_VERSION säilyy 5:ssä** (measurements-store on jo olemassa, vain uusi type='primer'-arvo indeksissä — ei vaadi migration-koodia)
- Service Worker -yhteensopiva (H-006a-fix6/fix7 säilyvät: dateISO-fallback + cache:reload)
- A4:n storage-rikastus additiivinen — vanhat funktiot (velocityReadiness, primer-velocity-baseline engine.js:518) lukevat edelleen sets-storesta `setRole='readiness_test'`

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu — H-006b on `scope-expansion`, ei `block-tuning`.

*(Akselin atletti-empiria 2026-05-28 huomioitu päätöksissä: dippi-velocity epäluotettava → primerEnabled=false, yksipisteinen primer @ 60% säilyy.)*

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Päätetty Akselin ratifioimana 2026-05-28 Cowork-sessiossa:**

- **A1 liike-spesifi primer-rajaus:** Tankoliikkeet (Takakyykky, Penkkipunnerrus, Pystypunnerrus, Maastaveto) + Lisäpainoleuanveto primerEnabled=true; Lisäpainodippi + Muscle-up primerEnabled=false.
  - Hylätty: kaikki liikkeet primerEnabled=true (atletti-empiria: dippi + MU velocity-mittaus epäluotettava); vain Takakyykky primerEnabled=true (liian kapea, useimmat treenipäivät jäisivät ilman primer-mekanismia).
- **A2 sys-1RM-päivityksen rajat:** ±2.5%/±5% konservatiivinen.
  - Hylätty: ±3%/±7% aggressiivisempi (yliautoregulointi-riski yksittäisistä primer-mittauksista); binäärinen ±2.5% (liian karkea, ei eroteta keskitasoa ja extreme-tasoa).
- **A3 K-β-flagit:** Osa H-006b:tä (laaja scope).
  - Hylätty: erillinen H-006c (riski että sys-1RM-päivitys ilman audit-suojaa karkaa); suoraan vaiheeseen 17 (rikkoo H-handoff-yksiköllisyyden).
- **A4 measurements-store type='primer':** Lisätään H-006b:ssä.
  - Hylätty: vain sets-store setRole='readiness_test' (riski sekoittumisesta työsetteihin, vrt. H-006a:n 'Sarjoja 0' -regressio).
- **Yksipisteinen primer @ ~60% säilyy** (v4.21 -flow ennallaan).
  - Hylätty: 3-pisteen LV-regressio (~50/70/85%, Akselin torjuma atletti-realismi: dippi-velocity ei salli LV-regressiota universaalisti).

**Aiemmin tehdyt päätökset (eivät re-litigoida):**

- v4.21 primer-card UI-pohja toimii — säilyy, A7 lisää vain tietoa
- velocityReadiness (engine.js:709) + upperBodyMpvReadiness (engine.js:780) säilyvät ennallaan
- H-006a:n datavirran luotettavuus (fix6 dateISO-fallback + fix7 cache:reload) säilyy
- Engine.js velocity-funktiot v4.25.1:stä lähtien Enode-valmiina — H-006b ei muuta funktioiden sisältöä
- Calibration-set-mekanismi (vk 4/8/12, DiStasio 2014) säilyy — H-006b yleistää sen primer-tasolle (cal-override-patternin generalisointi, ROADMAP §17)

## 6. Avoimet kysymykset

Ei avoimia kysymyksiä — kaikki Cowork-session 2026-05-28 aikana ratkaistu:

- Liike-spesifi primer-rajaus lukittu (5 tankoliikettä + leuka)
- sys-1RM-päivityksen kynnykset lukittu (±2.5%/±5% konservatiivinen)
- K-β-flagit osa H-006b:tä (4 flagia)
- measurements-store type='primer' lisätään (cal-override-patternin generalisointi)
- Yksipisteinen primer @ ~60% säilyy (v4.21 -flow ennallaan)

Code voi aloittaa B-sekvenssin ilman lisäkysymyksiä.

**B-sekvenssi (suositus, Code-puolen toteutus):**

- **B1**: engine.js MOVEMENT_MVT primerEnabled-lipun lisäys + index.html UI-suodatin primer-card-rendaukseen (A1)
- **B2**: engine.js `computeTodaySys1RM`-funktio + `state.todaySys1RM[movementId]`-integraatio + recommend()-fallback (A2)
- **B3**: audit-engine.mjs K-β-1/2/4/5-flagit + test-runner.js K-β-emissio-testit (A3)
- **B4**: data.js measurements-store type='primer' tuki (additiivinen, ei SCHEMA-muutosta) + index.html primerCompleteBtn-handlerin saveMeasurement-laajennus (A4)
- **B5**: index.html primer-card UI-rikastus — baseline-status-rivi + sys-1RM-päivitys-indikaattori + drift-warningit (A7)
- **B6** (sulkuvaihe): sw.js APP_VERSION 4.52.14 → 4.52.15 + ROADMAP.md rivi 9 päivitys (HEAD + APP_VERSION) + test-runner.js A6:n 5 uutta testitapausta

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 28.5.2026 |
| Muuttuneet tiedostot | `engine.js` (MOVEMENT_PRIMER_ENABLED + isPrimerEnabledForMovement + computePrimerBaseline + computeTodaySys1RM + computePrimerBaselineDrift + recommend()-override), `index.html` (importit, primer-card-suodatin, computeRecommendation-välitys, primerCompleteBtn-handler laajennus, state.measurements-alustus init+refresh, renderReadinessPrimerScreen baseline-status + drift-warning, updatePrimerResultUI sys-1RM-preview, toast-laajennus), `tools/engine-pilot/lib/audit-engine.mjs` (K-β-1/2/4/5-haara auditInvariants:iin), `data.js` (getAllMeasurements + export), `test-runner.js` (5 H-006b-spesifit testit + importit), `sw.js` (APP_VERSION 4.52.14→4.52.15 + kommenttijono), `ROADMAP.md` (tilannekuva HEAD + APP_VERSION) |
| Tehdyt päätökset | (1) MOVEMENT_PRIMER_ENABLED erillinen vakio (ei MOVEMENT_MVT object-arvo-refaktorointia) — vähemmän invasiivinen, sama A1-hyväksyntäehto, MOVEMENT_MVT:n 2 käyttäjäpaikkaa + sw.js/docs/tests säilyy ennallaan. (2) options.todaySys1RM = external load -dimensiossa (vastaa currentE1RMExternal:in dimensiota recommend():ssa); calibrationKg primerCompleteBtn-handlerissa lähtee rec.e1rmExternal-arvosta (Epley+Vara tai cal-pohjainen), fallback streetliftingConfig:n pull/squat-mappauksiin. (3) MVT_GUARD ±15% on extreme-suoja jonka ei pitäisi aktivoitua kynnyslogiikan ±5% sisällä (regressio-suoja jos joku rikkoo kynnykset). (4) Primer-mittaukset tallentuvat MOLEMPIIN storeihin: sets-store setRole='readiness_test' (endWorkout:ssa, säilyy ennallaan — vanhat funktiot toimivat) JA measurements-store type='primer' (primerCompleteBtn-handlerissa, välittömästi). (5) state.todaySys1RM[movementId] on lyhytaikainen UI-tila (ei persisteeraa yli yön; baseline persisteeraa measurements-storessa). |
| Validointi | **Stop hook PASS** — kaikki 5 ehtoa täyttyvät: (1) koodi kääntyy + lint (smoke test PASSED jokaisen B-vaiheen jälkeen), (2) selain-testit Playwright headless ?test=1 = **684 passed / 2 failed** (2 vanhat tunnetut FAIL "VBT promoted" + "T9 SAFE targetVx +1"; +69 PASSia uusista 5 H-006b-testifunktiosta — ylittää ≥617/619 minimi), (3) regressio-pilot **64/64 päivää, 1150 settejä, 0 virhettä, 136 audit-flagia (🐛 84, ⚠️ 4, 💬 0, 📋 48)** — bittitarkka sama kuin H-006a-fix8-tila; K-β-flagit eivät aktivoidu pilotissa koska primer-data ei ole pilot-skenaariossa → A5 baseline säilyy intended-tasolla, (4) A1-A7 -testit passaavat (A1 testPrimerEnabledFilter, A2 testComputeTodaySys1RM, A3 testKBetaFlagsEmission, A4 testMeasurementsTypePrimerStorage, K-β-5 testSys1RMClampGuard), (5) spec→koodi-diff tyhjä. |
| Jäi auki | — (kaikki A1-A7 toteutettu, kaikki avoimet kysymykset §6 oli "ei avoimia" Cowork-session jälkeen) |
| Seuraava askel | Vaihe 17 (Round B-α-2) säilyy NYT-merkkinä ROADMAP.md:ssä — H-006b oli aux-enabler, ei R-vaihe-siirto. K-β audit-flagit eivät vaadi H-006c:tä (kaikki 4 implementoitu B3:ssa). Akselin atletti-validointi puhelimella: avaa sovellus → SW asentuu 4.52.15 reload-modella → suorita primer tankoliikkeellä → näkee baseline-status (0/5 mittausta aluksi) + sys-1RM-preview (= nimellinen kunnes n≥5). |

---

**B-sekvenssi commit-ketju** (H-006b /goal-kierros 28.5.2026):

| # | Commit | Kuvaus |
| --- | --- | --- |
| B1 | `70cf681` | MOVEMENT_PRIMER_ENABLED + UI-suodatin (A1) |
| B2 | `b2dde14` | computeTodaySys1RM + state.todaySys1RM + recommend()-override (A2) |
| B3 | `f5833aa` | audit-engine.mjs K-β-1/2/4/5-flagit + computePrimerBaselineDrift (A3) |
| B4 | `84f63af` | measurements-store type='primer' + getAllMeasurements (A4) |
| B5 | `9de1009` | primer-card UI-rikastus baseline-status + sys-1RM-preview + drift-warning (A7) |
| B6 | `3126b0f` | APP_VERSION 4.52.14 → 4.52.15 + 5 H-006b-spesifit testitapausta (A6) |

Peruutusankkuri: `git reset --hard backup-pre-H-006b-6676a86` (säilyy.)
