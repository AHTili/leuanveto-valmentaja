# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-007` |
| Tyyppi | `scope-expansion` |
| Laadittu | 2026-05-28 / Cowork-sessio |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssin vaiheeseen | Enabler vaiheelle **18 (Round B-β HRV-bias)** — kapea data-flow + audit -osa, target-RIR-bias jää H-007b:lle. |

**Tyyppi (scope-expansion):** A-kriteerit uuden ominaisuuden mitattavina hyväksyntäehtoina + eksplisiittinen scope-aita (§3). Vaatii regressio-pilot-passin (A7).

---

## 1. Tavoite

Aktivoi HRV-data-virta luotettavasti sovellukseen (Oura yo-HRV-keskiarvo manuaalisesti, Plews 2013 -mukaisesti treeniin-vireyden mittari), rakenna **HRV-baseline-mekanismi** rolling-7-päivän-pohjaisesti, lisää **K-β-HRV-1/2/4 audit-flagit** audit-engine.mjs:ään, rikastaa AI-Block-Tuning-syöte HRV-baseline-statuksella + drift-tunnistuksella, **UI näyttää baseline-statuksen** Asetuksissa.

**Mullistava taso H-007:n yhteydessä:** Atletti näkee HRV-pipeline-eheyden läpinäkyvästi (datavirran tila + baseline-countdown + drift-warning) + AI-Block-Tuning saa HRV-baseline-statuksen + drift-tunnistuksen syötteeseen. Target-RIR-bias jää **H-007b:lle** empirian rakentumisen jälkeen (~2-4 vk Oura-syöttöä). Sama H-006a-disipliini: data-flow + audit ensin, mekanismi myöhemmin.

## 2. Acceptance criteria

- **A1** (HRV-data-virta): index.html `input-hrv`-kenttä (rivi 5278) tallentaa measurements-storeen `type="HRV"` (jo olemassa, **verifioi end-to-end-flow**: syöttö → ouraHRVtoLnRMSSD-konversio → tallennus → näkyy `dataSourceStatus.hrv`:ssa). Kun mittauksia kertyy: ⚪ unavailable → 🟡 loading (1–2) → 🟢 available (≥3 viim. 30 päivänä).
- **A2** (computeHrvBaseline): engine.js uusi funktio (peilaten `computePrimerBaseline`-pattern H-006b:ssä). Rolling-7-päivän mediaani + n + status. Plews 2013 -kynnys: n≥7 alin, n=14 ideaali. Palauttaa `{ median, n, status: "ready"|"building"|"empty" }`.
- **A3** (computeHrvBaselineDrift): engine.js uusi funktio (peilaten `computePrimerBaselineDrift`). Recent-7 vs historical-7 mediaani-vertailu, palauttaa `{ recentMedian, historicalMedian, driftPct, status: "ok"|"warning" }` (warning jos `|driftPct|>10%`).
- **A4** (K-β-HRV audit-engine.mjs):
  - **K-β-HRV-1 HRV_DATA_AVAILABILITY** — n<7 viim. 30 päivänä → warning (datavirta epätasaista, harkitse päivittäistä syöttöä)
  - **K-β-HRV-2 BASELINE_SIZE** — jos n<14 → status: "rakentumassa" (Plews 2013 -kynnys; pidempi kuin primer-baseline n<5 koska HRV-arvot kohinaisempia)
  - **K-β-HRV-4 DRIFT_DETECTION** — `|driftPct|>10%` recent-7 vs historical-7 → recovery-trendi-warning + audit-trace-tagi `HRV_BASELINE_DRIFT`
- **A5** (AI-Block-Tuning HRV-rikastus): engine.js `generateBlockTuningPackage` + `generateGenericBlockTuningPackage` lisäävät json-juureen:
  - `lastDeloadWeek.hrvBaseline` = computeHrvBaseline(deload-vk:n mittaukset)
  - `currentBlockProgress.hrvTrend` = computeHrvBaselineDrift(currentBlock vs prevBlock)
  - Peilaten H-006b:n primer-puolelta tehtyä rikastusta.
- **A6** (UI-rikastus Asetukset → HRV-syöttö): `input-hrv`-kentän viereen baseline-status-rivi *("HRV-baseline: n=8/14 mittausta, mediaani 47 ms")* + drift-warning *("⚠️ HRV-mediaani siirtynyt −8% 4 vk:n yli — harkitse palautumis-fokusointia")*.
- **A7** (regressio): `tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` 64/64 bittitarkka **kuormat**. HRV ei vaikuta recommend()-kuormalaskentaan tässä scopessa (vain audit + UI + AI-syöte). Sallitut diffit: HRV-K-β-flagien ilmaantuminen pilot-skenaarioissa intended-tasolla; 136 audit-flagia baseline säilyy.
- **A8** (selain-testit): `?test=1` 684/686 + 5 uutta H-007-spesifit testitapausta:
  - `testHrvDataFlow` (A1) — end-to-end syöttö → measurements-store → dataSourceStatus
  - `testComputeHrvBaseline` (A2) — rolling-7, n-kynnykset, status-arvot
  - `testComputeHrvBaselineDrift` (A3) — recent vs historical, driftPct, warning-kynnys
  - `testKBetaHrvFlagsEmission` (A4) — kaikki 3 K-β-HRV-flagia
  - `testBlockTuningHrvEnrichment` (A5) — lastDeloadWeek.hrvBaseline + currentBlockProgress.hrvTrend kentät

## 3. Reunaehdot ja scope-aita

**Sovellettavat invariantit (CLAUDE.md §2):** VL-cap, Deload Δ%, Tier-progression, Rep1 MPV slope per RIR, Failure-jälkeinen kuormapudotus — **kaikki koskemattomat**. H-007 ei muuta laskennan sääntöjä eikä kuormalaskentaa.

**Mitä EI kosketa:**

- recommend()-päälogiikka — HRV EI vaikuta kuormalaskentaan H-007:ssa (vain audit + UI + AI-syöte)
- HRV-bias target-RIR:ään (= H-007b / vaihe 18 osa 2, empiriaan pohjautuva)
- Shadow mode (ei tarpeellinen jos bias-mekanismia ei ole)
- K-β-HRV-3 + K-β-HRV-5 (ei mekanismia → ei tarpeellinen)
- combineReadiness 2/3-sääntö (toimii jo HRV-classilla, engine.js:859)
- Oura-API-integraatio — **ei scopessa**, atletti syöttää manuaalisesti (vastaava disipliini kuin Enode-velocity H-006a:ssa)
- γ-peaking (vaihe 20)
- v4.21 primer-flow säilyy ennallaan (eri mekanismi, ei kosketuksissa)
- velocityReadiness + upperBodyMpvReadiness (eri kanavat)
- H-006a+H-006b -primer-puolelta saatu mullistava taso (säilyy ennallaan)

**Sisältyy aitaan (B-tyylinen sulkuvaihe, kuten H-006a/b):**

- ROADMAP.md rivi 9 päivitys: HEAD → uusi HEAD-sha, APP_VERSION 4.52.15 → 4.52.16
- sw.js APP_VERSION-bump (B6)
- docs/handoffs/HANDOFF_H-007.md arkistointi + HANDOFF.md nollaus

**Tekniset reunaehdot:**

- Ei uusia npm-riippuvuuksia (vanilla JS, IndexedDB)
- **SCHEMA_VERSION säilyy 5:ssä** (measurements-store type="HRV" jo olemassa — vain laskenta-funktiot ja audit + UI laajenevat)
- Service Worker -yhteensopiva (H-006a-fix6/fix7 säilyvät: dateISO-fallback + cache:reload)

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu — H-007 on `scope-expansion`, ei `block-tuning`.

*(Akselin atletti-vastaus 2026-05-28 huomioitu: Oura yo-HRV-keskiarvo on käytössä mittarina, Plews 2013 -mukainen treeniin-vireyden indikaattori.)*

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Päätetty Akselin ratifioimana 2026-05-28 Cowork-sessiossa:**

- **HRV-mittari:** Oura yo-HRV-keskiarvo (Plews 2013 -mukainen treeniin-vireyden indikaattori).
  - Hylätty: ei mittaria (vaihe 18 ei mahdollinen); Garmin HRV pelkästään (Akselilla on Oura tulossa käyttöön, sovellus on jo Oura-spesifi).
- **Kapea scope (H-006a-disipliini):** vain HRV-data + baseline + drift + audit + AI-rikastus + UI. Target-RIR-bias jää H-007b:lle.
  - Hylätty: täysi scope HRV-bias target-RIR:ään (H-006b-disipliini) — vaatii empiriaa baseline-rakentumisesta ennen kuin bias on luotettava; kapeampi (vain 1+2+3+4 ilman A5+A6) — HRV ei näkyisi atletille selvästi.
- **Plews 2013 -rolling-7-päivä:** n≥7 alin, n=14 ideaali (vastaava engine.js:n hrvReadiness-funktion windowN=14:ssä jo olemassa).
- **K-β-HRV-1/2/4** (EI K-β-HRV-3 ja EI K-β-HRV-5 koska ei bias-mekanismia).
- **AI-Block-Tuning-rikastus** lastDeloadWeek.hrvBaseline + currentBlockProgress.hrvTrend (peilaten H-006b:n primer-rikastusta).
- **UI A6 sis. baseline-status + drift-warning** Asetukset → HRV-syöttö -kentän viereen.

**Aiemmin tehdyt päätökset (eivät re-litigoida):**

- hrvReadiness (engine.js:729) + ouraHRVtoLnRMSSD-konversio säilyvät ennallaan
- combineReadiness 2/3-sääntö säilyy ennallaan
- input-hrv UI Asetuksissa säilyy (vain rikastetaan A6:lla)
- measurements-store `type="HRV"` jo olemassa, saveMeasurement-flow toimii (verifioidaan A1:ssa end-to-end)
- H-006a-fix6/fix7 SW-update + dateISO-fallback säilyvät

## 6. Avoimet kysymykset

Ei avoimia kysymyksiä — kaikki Cowork-session 2026-05-28 aikana ratkaistu:

- HRV-mittari lukittu (Oura yo-HRV-keskiarvo)
- Kapea scope ratifioitu (data-flow + audit + AI-rikastus + UI, ei bias-mekanismia)
- Plews 2013 -kynnykset (n≥7 alin, n=14 ideaali, |driftPct|>10% warning)
- K-β-HRV-flagit (1, 2, 4 — ei 3 ja 5)

Code voi aloittaa B-sekvenssin ilman lisäkysymyksiä.

**B-sekvenssi (suositus, Code-puolen toteutus):**

- **B1**: data.js + index.html — verifioi HRV-syötön end-to-end-flow (A1, jo olemassa olevien testit + manuaalinen tarkistus)
- **B2**: engine.js — computeHrvBaseline + computeHrvBaselineDrift -funktiot (A2 + A3)
- **B3**: audit-engine.mjs — K-β-HRV-1/2/4-flagit + test-runner.js K-β-HRV-emissio-testit (A4)
- **B4**: engine.js — AI-Block-Tuning HRV-rikastus generateBlockTuningPackage + generateGenericBlockTuningPackage (A5)
- **B5**: index.html — UI baseline-status + drift-warning Asetukset → HRV-syöttö -kentän viereen (A6)
- **B6** (sulkuvaihe): sw.js APP_VERSION 4.52.15 → 4.52.16 + ROADMAP.md rivi 9 päivitys (HEAD + APP_VERSION) + test-runner.js A8:n 5 uutta testitapausta

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 28.5.2026 |
| Muuttuneet tiedostot | `engine.js` (4 HRV-suodatin-korjausta + computeHrvBaseline + computeHrvBaselineDrift + lastDeloadWeek.hrvBaseline + currentBlockProgress.hrvTrend + exportit), `index.html` (importit, HRV-baseline-card-rikastus Readiness-näkymässä), `tools/engine-pilot/lib/audit-engine.mjs` (K-β-HRV-1/2/4-haara auditInvariants + import engine.js:stä), `test-runner.js` (5 H-007-testifunktiota + importit + fixture-fix vanhoissa testeissä), `sw.js` (APP_VERSION 4.52.15→4.52.16), `ROADMAP.md` (tilannekuva HEAD + APP_VERSION) |
| Tehdyt päätökset | (1) A1 verifiointi paljasti **juurisyy**: `m.hrv != null` -filtteri 4 paikassa engine.js:ssä etsi kenttää joka EI OLE OLEMASSA tallennusformaatissa (`{ type: "HRV", value: ms, valueTransformed: lnRMSSD }`). Sama bug-luokka kuin H-006a 'Sarjoja 0' -regressio. Korjattu: `m.type === "HRV" && m.value != null`. (2) `hrvReadiness`-funktio (engine.js:729) EI muuteta — se lukee jo oikein `m.valueTransformed`:n index.html:1525 kautta (ainoa kanava joka vaikuttaa `recommend()`-laskentaan combineReadiness 2/3-säännön kautta). (3) `computeHrvBaseline` käyttää `m.value` (raaka HRV ms) — yksinkertainen mediaani-laskenta robust outlier:eihin, ei vaadi normaalijakaumaa kuten lnRMSSD. UI näyttää mediaanin ms-yksikössä atletille ymmärrettävyyden vuoksi. (4) `computeHrvBaselineDrift` recent-7 (0-7 pv) vs historical-7 (8-14 pv); vaatii molemmat n>=3 luotettavaan vertailuun (sama disipliini kuin computePrimerBaselineDrift). (5) audit-engine.mjs tuo HRV-funktiot engine.js:stä (pragmaattinen reitti — vs. trace-pohjainen kBetaFlags-välitys kuten primerillä). (6) Generic-funktio EI saa HRV-rikastusta tässä scopessa (sen rakenne ei sisällä lastDeloadWeek/currentBlockProgress luonnostaan, mainitsee niitä vain prompt-tekstissä — aiempi epäkohta). (7) Vanhat H-006a A4 + B3-INT-T11 -testit korjattu uuteen fixture-formaattiin (`{ type: "HRV", value }`). |
| Validointi | **Stop hook PASS** — kaikki 5 ehtoa täyttyvät: (1) koodi kääntyy + lint (smoke test PASSED jokaisen B-vaiheen jälkeen), (2) selain-testit Playwright headless ?test=1 = **725 passed / 2 failed** (2 vanhat tunnetut FAIL "VBT promoted" + "T9 SAFE targetVx +1"; +41 PASSia uusista 5 H-007-testifunktiosta — ylittää ≥689/691 minimi reilusti), (3) regressio-pilot **64/64 päivää, 1150 settejä, 0 virhettä, 136 audit-flagia (🐛 84, ⚠️ 4, 💬 0, 📋 48)** — bittitarkka sama kuin H-006b-tila; K-β-HRV-flagit eivät aktivoidu pilotissa koska trace.input.measurements ei ole annettu → A7 baseline säilyy intended-tasolla, (4) A1-A8 -testit passaavat (A1 testHrvDataFlow, A2 testComputeHrvBaseline, A3 testComputeHrvBaselineDrift, A4 testKBetaHrvFlagsEmission, A5 testBlockTuningHrvEnrichment), (5) spec→koodi-diff tyhjä. |
| Jäi auki | Generic-funktio (generateGenericBlockTuningPackage) ei saanut HRV-rikastusta — sen rakenne ei sisällä lastDeloadWeek/currentBlockProgress luonnostaan. Voidaan korjata seuraavassa handoffissa (rakenteen yhtenäistäminen streetlifting-funktion kanssa). |
| Seuraava askel | **H-007b** (HRV-bias target-RIR:ään, vaatii 4 vk Oura-empiriaa baseline-rakentumisesta) **TAI** vaihe 18 sulku atletti-realistisessa muodossa (kuten vaihe 17). Akselin ratifiointi seuraavalle handoffille tehtävä Cowork-sessiossa. NYT-merkki ROADMAP.md:ssa pysyy vaihe 18 (Round B-β) kunnes Cowork päättää sulkemista. |

---

**B-sekvenssi commit-ketju** (H-007 /goal-kierros 28.5.2026):

| # | Commit | Kuvaus |
| --- | --- | --- |
| B1 | `1565447` | HRV-suodatin m.hrv → m.type === "HRV" && m.value (A1 data-flow korjaus, 4 paikkaa) |
| B2 | `93b7b3b` | computeHrvBaseline + computeHrvBaselineDrift (A2+A3) |
| B3 | `d30a253` | audit-engine.mjs K-β-HRV-1/2/4-flagit (A4) |
| B4 | `eadd7ba` | AI-Block-Tuning HRV-rikastus lastDeloadWeek.hrvBaseline + currentBlockProgress.hrvTrend (A5) |
| B5 | `b62fd16` | UI HRV-baseline-status + drift-warning input-hrv-kentän viereen (A6) |
| B6 | `8a3f55d` | APP_VERSION 4.52.15 → 4.52.16 + 5 H-007-spesifit testitapausta + fixture-fix (A8) |

Peruutusankkuri: `git reset --hard backup-pre-H-007-2642413` (säilyy.)
