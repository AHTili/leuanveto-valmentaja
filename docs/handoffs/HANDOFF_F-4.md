# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-31 (value-resolution-audit F-4, ii UNIFY). Yhdistä slot-kuorma-näyttö (Koti-dashboard + workout-flow) YHTEEN funktioon → estää dashboard≠live-divergenssin rakenteellisesti (sulkee F-1 + F-4). A1 = READ-ONLY täsmädiff ENNEN refaktoria (ettei kummankaan polun käytöstä pudoteta).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `F-4` (UNIFY slot-kuorma-näyttö: yksi `computeDisplayedSlotLoad`; value-resolution-audit) |
| Tyyppi | `refactor` (käytös muuttumaton PAITSI intended F-4-fix; A1 read-only diff ENNEN) |
| Laadittu | 2026-05-31 / value-resolution-audit |
| Tila | `VALMIS (toteutettu + verifioitu; odottaa puhelinverifiointia 4.52.30)` |
| Liittyy R-sekvenssin vaiheeseen | Value-resolution-audit -sulku (F-4, kattaa F-1:n rakenteellisesti). **EI siirrä NYT-merkkiä** (vaihe 18). |
| Pohja-HEAD | `4a88591` · APP_VERSION `4.52.29` |

---

## 1. Tavoite

Slot-kuorman näyttölogiikka on tällä hetkellä **kahdennettu**: Koti-dashboard (`index.html:4436-4494`) ja workout-flow (`index.html:12858-12909`) laskevat saman slotin näytetyn kuorman erikseen — ja erkanevat (F-4: dashboard ei applioi `variantLoadModifier`:ia, workout-flow applioi; lisäksi defaultSuggestion-tier-ero). Lopputila: **yksi `computeDisplayedSlotLoad(slot, …)`** jota molemmat kutsuvat → dashboard = workout-flow KAIKILLE slot-tyypeille rakenteellisesti (ei voi enää erkaantua). Sulkee F-4:n ja F-1:n (same-liike-apuliike) pysyvästi.

## 2. Acceptance criteria

> Tyyppi `refactor`: **pääkriteeri = käytös muuttumaton** PAITSI eksplisiittinen F-4-fix (dashboard saa vMod + defaultSuggestion = workout-flow). A1 = read-only täsmädiff ENNEN.

- **A1 — DIFF (READ-ONLY, STOP-gate).** Täsmädiff: dashboard-render vs workout-flow-render — gatet, fallbackit, resolvedLoadKg-lähde, defaultSuggestion, variantLoadModifier, pyöristys, skill/BW, sync vs async progress, output (string+cls vs number). **Mitä KUMPIKIN tekee jota toinen ei?** STOP + raportoi.
- **A2 — UNIFY (vasta A1-diffin + luvan jälkeen).** Eristä `computeDisplayedSlotLoad(slot, rec, settings, progressMap)` joka palauttaa **numeron** (loadKg) kattaen A1:n MOLEMMAT käytökset (gatet + lähteet + defaultSuggestion + vMod + pyöristys + skill/BW). Korvaa molemmat kutsupaikat: workout-flow käyttää numeroa; dashboard formatoi numeron loadStr/loadCls:ksi. **Intended muutos:** dashboard saa nyt vMod + defaultSuggestion (= workout-flow). Muu käytös muuttumaton.
- **A3 — Verifiointi.** dashboard = workout-flow KAIKILLE slot-tyypeille (ml. variant-slotit + diff-liike-apuliike + skill/BW + fallback). Non-variant-slotit ennallaan. `testKotiEqualsLiveAccessory` laajennettu kattamaan vMod. Koti=live-assertio PASS. Pilot 138 (render-only, engine koskematon). Selain-testit. APP_VERSION-bump. **Puhelinverifiointi** (muuttaa dashboard-näyttöä variant-sloteille).

## 3. Reunaehdot ja scope-aita

- **EI kosketa:** `engine.js` (recommend / resolvedLoadKg / e1RM-ketju ennallaan) · `data.js` · Sykli-preview `_syRenderComputeKg` (oma polkunsa; ei tässä scopessa — HUOM jos halutaan myös Sykli unifyyn, erillinen). Render-only refaktori.
- **Muutosalue:** `index.html` — uusi `computeDisplayedSlotLoad` + 2 kutsupaikan korvaus (4436-4494 dashboard, 12858-12909 workout-flow).
- **Refaktorin riski:** unified-funktio EI saa pudottaa kummankaan polun erityiskäytöstä (skill/BW, attempt/warmup, fallbackit, sync/async progress). A1 luetteloi nämä.
- **PRE-FLIGHT + ankkuri:** HEAD `4a88591`, ankkuri `backup-pre-F4-4a88591`. A1 read-only.

## 4. Atletti-vastaukset

Ei sovellu (`refactor`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

- **ii UNIFY valittu** (Akseli 2026-05-31) vs F-4:n pelkkä "applioi vMod dashboardissa": unify sulkee F-1+F-4 + estää TULEVAT dashboard/live-divergenssit rakenteellisesti (yksi totuuslähde slot-näytölle). Read-only-verdikti totesi F-4 aidoksi (vMod ±3–10%, jopa −40% speed-variantti).
- **Sykli-preview (`_syRenderComputeKg`) jätetty scopen ulkcopuolelle** — eri tarkoitus (flat-estimaatti tuleville viikoille, C-HYBRID); ei live-render.

## 6. Avoimet kysymykset (A1 vastaa READ-ONLY)

1. Täsmädiff: mitä dashboard tekee jota workout-flow ei (skill/BW "BW", string+loadCls-output, sync `movementProgressMap`)? Mitä workout-flow tekee jota dashboard ei (vMod, defaultSuggestion, roundToHalf, async `getMovementProgress`, warmup per-set)?
2. Voiko unified-funktio olla **sync** (käyttää `state.movementProgressMap`:ia, jonka molemmat näkevät) vai vaatiiko async? (Workout-flow käyttää nyt `await getMovementProgress`.)
3. Output-sopimus: palauttaako numeron (loadKg) + kutsupaikat formatoivat? (dashboard: string+cls; workout-flow: numero suoraan.)

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-31 |
| Muuttuneet tiedostot | `engine.js` (`computeDisplayedSlotLoad` + export) · `index.html` (molemmat render-polut [renderTodayPlan + startWorkout] → fn; fn poistettu, importattu; meta 4.52.30) · `test-runner.js` (import + `testKotiEqualsLiveAccessory` vMod-laajennus) · `sw.js` (APP_VERSION 4.52.30). |
| Tehdyt päätökset | **F-4 UNIFY:** yksi `computeDisplayedSlotLoad` (engine.js, exportattu) jota SEKÄ Koti-dashboard ETTÄ workout-flow kutsuvat → render-polut eivät voi erkaantua slot-kuormalla (**sulkee F-1 + F-4 rakenteellisesti**). C param (dashboard=TARGET / workout-flow=tier, primary-tier exempt), G param (kutsuja resolvoi progress: dashboard sync-map / workout-flow async → ei freshness-riskiä), skill/BW→0. **Intended:** dashboard saa nyt vMod:n + roundToHalf:n resolved/primary/fallback-sloteille (= workout-flow). |
| Validointi | `computeDisplayedSlotLoad` yksikkötesti **14/14 PASS** (kaikki A1-haarat) · node --check OK · `testKotiEqualsLiveAccessory` laajennettu vMod:iin (dashboard=workout-flow + resolvedLoadKg×1.10) · Smoke PASS · **pilot 138 muuttumaton** (fn ei recommend():ssä). **DOM-render-formatointi (loadStr/loadCls) ei CLI-verifioitavissa → puhelinverifiointi 4.52.30 tehtävä** (variant-slotit ±3–10 %, dashboard=live). |
| Jäi auki | **F-2** (rate-limit×back-off, valmennuspäätös a/b/c, `stash@{0}`) — value-resolution-auditin viimeinen avoin fragmentaatio. Edge-flagit: workout-flow primary skill→0 (latentti vuoto korjattu); primary+null-target → null (harvinainen, oli getMovementProgress). |
| Seuraava askel | F-2 (a/b/c-päätös) → value-resolution-audit suljettu kokonaan. ROADMAP NYT-merkki ennallaan (vaihe 18). |
