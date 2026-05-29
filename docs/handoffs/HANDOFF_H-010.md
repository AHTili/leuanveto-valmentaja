# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täytti osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Ratifioitu Coworkissa 2026-05-29 (leve-handoff-laadinta-skill). Aloita §8 + Selkäranka 1–2 ENNEN muutoksia. **HUOM: tämä resetoi pilot-baselinen — A3 on STOP-gate Akselin ratifiointiin ennen committia.***

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-010` (P1c — täydentää P1a:n eläväksi gateksi) |
| Tyyppi | `scope-expansion` (elävä audit-gate) **+ harness-refactor (pilot-fideliteetti)** — HUOM: EI bittitarkka, **resetoi pilot-baselinen** (ks. A3 STOP-gate) |
| Laadittu | 2026-05-29 / Cowork-sessio (ratifioitu) |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssiin | M1-pohja-puhtaus / vaiheen 19 alustus. EI siirrä NYT-merkkiä (vaihe 18). |
| Pohja-HEAD | `215ac57` (post-H-009-push) · APP_VERSION `4.52.18` |

**Tyyppiperuste:** kaksi osaa — (1) harness-fideliteettikorjaus (scenario-runner), joka **muuttaa pilotin tuotosta** (ei bittitarkka — tarkoituksellinen baseline-reset); (2) identity-funktion johdotus audit-engine-gateen (scope-expansion). Koska baseline muuttuu, vakio refactor-bittitarkkuus-kriteeri KORVATAAN "uusi baseline verifioitu oikeaksi + Akseli ratifioi" -kriteerillä (A3).

---

## 1. Tavoite

Tee P1a:n identity-detektorista **elävä**: (a) korjaa pilot-harnessin fideliteettiaukko niin että se simuloi **päiväkohtaista** primary-liikettä tuotannon tavoin, ja (b) johdota `detectPrimaryMovementIdentityMismatch` audit-engine-gateen → **Stop hook nappaa identity-mismatch-luokan elävänä** jatkossa. Lopputilassa pilot on uskollinen tuotannolle ja H-008-bugiluokka on koneellisesti portitettu.

## 2. Acceptance criteria

> Mittari-ensin (Selkäranka 6): known-pos + known-neg, aritmetiikka käsin.

- **A1 — Pilot-fideliteettikorjaus.** `scenario-runner.mjs`: `buildCtx` käyttää **päiväkohtaista** primary-liikkeen movementId:tä (kyseisen päivän dayPlan-primary-slotin liike), EI kiinteää `movementCatalog[0]` (rivi 120, joka pudottaa runScenarion välittämän pmid:n destrukturoinnissa 99–107). Pilot-päivät ovat eksplisiittisiä (weekNum, dayOfWeek) → resolvoi per-päivä-primary suoraan dayPlanista. *Vaikutus: ei-leuanveto-primary-päivät (kyykky/dippi/MU, ~72 solua) laskevat nyt OIKEAN liikkeen e1RM:stä.*
- **A2 — Elävä identity-gate.** Johdota `detectPrimaryMovementIdentityMismatch` (P1a, a12e766) audit-engine-gateen (`PRIMARY_MOVEMENT_IDENTITY_MISMATCH`, ERROR-taso). Known-positive: injektoi mismatch (pmid ≠ päivän primary) → gate laukeaa. Known-negative: A1-korjattu pilot → **0 identity-flagia** (pmid===primary kaikilla päivillä).
- **A3 — UUSI BASELINE (STOP-gate Akselille, EI bittitarkka).** A1 muuttaa ~72 pilot-solun kuormat. Tuota **per-solu-diff-raportti**: vanha kuorma → uusi kuorma + mikä liike-e1RM nyt ohjaa kunkin. Jokainen muutos on (a) attribuoitava fideliteettikorjaukseen JA (b) verifioitava **uskottavaksi** (ei uusi bugi). **Jos jokin muuttunut solu paljastaa epäuskottavan kuorman → se on UUSI LÖYDÖS → kirjaa backlogiin, älä hyväksy hiljaa.** **STOP + esitä diff Akselille → odota baseline-ratifiointia ENNEN committia** (tämä resetoi bittitarkan referenssin jota kaikki tulevat handoffit käyttävät — rakenteellinen, peruuttamaton).
- **A4 — Uusi referenssi lukittu.** Akselin ratifioinnin jälkeen: uusi pilot-baseline on bittitarkka referenssi; identity-gate puhdas (0 flagia); Stop hook passaa uudella baselinella. A4-regressiotesti (P1a:n synteettinen) säilyy + laajenna kattamaan gate-polku.
- **A5 — Gate.** Stop hook 5/5 (uusi baseline) · selain-testit pass · spec→koodi-diff scope-aidan sisällä · A3-diff + ratifiointi dokumentoitu osioon 7.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** ei kosketa VL-cap/deload/tier/e1RM-**kaavoja**. recommend()-laskenta engine.js:ssä **muuttumaton** — vain harnessin pmid-syöte korjataan (sovelluksen käytös ei muutu, vain testin uskollisuus).
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - `engine.js` recommend() / e1RM-laskenta — vain harness (scenario-runner) + audit-engine.
  - Data-flow-field-presence-assertiot (OBS-008/009/016) → **P1b** (erillinen).
  - Kyykky +102 (cross-ref, eri juuri) → P2.
  - Syöteavaruus-generaattorin laajennus muihin kuin pmid-fideliteettiin → myöhempi P1-osa jos tarpeen.
- **Tekniset:** vanilla JS, ES-modulit, ei uusia npm-riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `215ac57`, haara `main`, session-tree puhdas. Luo `git branch backup-pre-h010-215ac57` ennen muutoksia. **Erityisen tärkeä** — baseline-reset on peruutettava jos diff paljastaa ongelman.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (ei `block-tuning`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli ratifioinut 2026-05-29; älä re-litigoi):**
- **P1c täydentää P1a:n eläväksi:** P1a lukitsi identity-logiikan + testin (dormantti); P1c tekee siitä gaten + korjaa harness-fideliteetin jotta gate on puhdas.
- **Sekvenssi: P1c ennen P1b:tä** — uskollinen pilot on perusta jolle P1b (data-flow) rakentuu.
- **Identity-gate ERROR-taso** (Cowork-suositus H-009:stä).

**Hylätyt vaihtoehdot:**
- *Identity-gate ilman harness-korjausta* — laukeaisi 72 harness-artefaktia (H-009 A4-este, Code kvantifioi). Siksi A1 (fideliteetti) ennen A2 (gate).
- *Pilot-baselinen muutoksen hiljainen hyväksyntä* — hylätty: baseline-reset on rakenteellinen, vaatii Akselin ratifioinnin + per-solu-verifioinnin (A3).

**Konteksti:** scenario-runner `buildCtx` (rivit 99–123) pudottaa `primaryMovementId`-parametrin ja käyttää `movementCatalog[0]` (= Lisäpainoleuanveto) kaikille päiville. `deriveMovementCatalog` käyttää movementId = liikkeen nimi (rivi 137). H-009 A1 kvantifioi 72 mismatch-solua (Takakyykky 15, Lisäpainodippi 28, MU-eks 10, MU 19). Nämä ovat harness-artefakteja — tuotannossa H-008 jo korjasi pmid===slot.

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta)

1. **Per-päivä-primary-resoluutio pilotissa:** suora dayPlan-lookup (weekNum, dayOfWeek) — pilot-päivät eksplisiittisiä, ei tarvita getTodayPlan-ei-eksakti-logiikkaa. Vahvista että tämä on oikein, vai onko jokin päivä ei-eksakti myös pilotissa?
2. **A3-diff-raportin muoto:** miten 72-solun vanha→uusi-diff esitetään Akselille ratifiointiin (taulukko per profiili/päivä/liike)?
3. **Paljastaako fideliteettikorjaus uusia epäuskottavia kuormia** (esim. MU-päivät MU:n ohuesta datasta → degradoitu/matala)? Jos → backlog uutena löydöksenä (ei hiljaa hyväksytä). Tämä on odotettu mahdollisuus — fixed-pmid on saattanut peittää muita oireita.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-29 |
| Muuttuneet tiedostot | `tools/engine-pilot/lib/scenario-runner.mjs` (A1 buildCtx per-päivä-pmid getTodayPlanilla), `engine-bridge.mjs` (getTodayPlan re-export), `trace-capture.mjs` (input.primaryMovementId), `audit-engine.mjs` (A2 PRIMARY_MOVEMENT_IDENTITY_MISMATCH-gate ERROR), `smoke-test.mjs` (A4 T8 gate-polku-lukko), `docs/backlog.md` (OBS-020). **EI engine.js/data.js/index.html/sw.js** (recommend()-laskenta + tuotantokoodi koskematon). Commit: `3970fdf`. |
| A3-baseline-diff | **131/276 solua muuttui** (3 streetlifting-profiilia: akseli-elite/novice/master 41/64 kukin = 123; pl-advanced 8/12; muut 6 profiilia 0). **Akseli ratifioinut 2026-05-29.** Suunta väärä→oikea: **Takakyykky** 34→110–128 kg (vanha leuanveto-pohjainen ALIARVIO korjattu; kyykky-e1RM ~166 × 75%), **Lisäpainodippi** 31→19.5–31 kg (oman e1RM), **Muscle-up eksentrinen** 41–57→0–0.5 kg (skill-phase suggestedLoadKg=0 → BW), **Muscle-up** 78–105→2.5–12 kg (H-008-luokka YLIARVIO korjattu, vastaa Akselin todellista MU +2.5…+15). Kyykky 110 + MU 2.5 **täsmäävät Akselin perjantai-treeniin**. Kaikki attribuoitavissa fideliteettikorjaukseen (per-päivä-pmid → oikea liike-e1RM), ei uusia bugeja. Uskottavuus-liput (20 kpl) kaikki saman korjauksen seurauksia. |
| Tehdyt päätökset | **Gate-taso: ERROR** (PRIMARY_MOVEMENT_IDENTITY_MISMATCH, Cowork-suositus). **Resoluutiotapa: getTodayPlan(meso, weekNum, dow)** (ei suora eksakti-lookup) — sama kuin recommend(), takaa pmid===näytetty myös ei-eksakti-päivinä (Q1). **Diff-muoto: liikkeittäin ryhmitelty per profiili** (Q2). **Uusi löydös (Q3): OBS-020 dippi-fideliteetti** — pilot-dippi 19.5–31 vs Akselin reaali ~62.5–71 kg; squat/MU täsmäävät → dippi-spesifi (fixture-simulaation dippi-datan ohuus vai resoluutio-aukko, P2-luokka, ei H-008-tyyppinen). |
| Validointi | **Stop hook PASS (uusi baseline):** smoke T8 ✅ (identity-gate-polku known-pos/neg) + pilot **64/64, 0 virhettä, 138 audit-flagia (🐛 84 ENNALLAAN, ⚠️ 4→6 = +2 WARN A1-kuormamuutoksen seuraus, 💬 0, 📋 48)**. **Identity-gate: 0 flagia kaikissa 10 profiilissa** (A1-korjattu → pmid===shown, A2 known-neg ✓). **A2 known-pos verifioitu** (injektoitu mismatch → 🐛 ERROR laukeaa) + graceful (null → ei laukea). **?test=1: 742/745 ennallaan** (H-010 ei kosketa selain-puolta; 3 pre-existing failia). spec→koodi-diff scope-aidan sisällä. |
| Jäi auki | OBS-020 (dippi-fideliteetti, P2). **Push odottaa Akselin ratifiointia.** Vanha bittitarkka pilot-referenssi (136) korvattu uudella (138) — kaikki tulevat handoffit käyttävät uutta. |
| Seuraava askel | Akseli ratifioi push origin/main (`3970fdf` + sulku). Sitten **P1b** (data-flow-field-presence-assertiot OBS-008/009/016) / **P2** (Paused squat +102 cross-ref + OBS-020 dippi-fideliteetti). NYT-merkki säilyy vaihe 18. |

---

**H-010/P1c-arc commit-ketju:**

| Commit | Kuvaus |
| --- | --- |
| `3970fdf` | feat(H-010-P1c): pilot-fideliteetti (per-päivä-pmid) + elävä identity-gate (audit-engine ERROR) |
| *(sulku)* | docs(H-010): §7 + arkistointi + backlog OBS-020 + ROADMAP-tilannekuva |

Peruutusankkuri: `git reset --hard backup-pre-h010-215ac57` (säilyy). Off-repo-diagnostiikka: `C:\Users\aksel\leve-test-runner\h010-{capture,diff,gate-verify}.mjs` + baseline/new-JSON (A3-diff-todiste, ei repossa).
