# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Operointitapa: `CLAUDE.md` §9 EQUIP PROSESSI.
>
> *Tila: **F-5 (= OBS-034) — `AKTIIVINEN`** (DRAFT-COWORK ratifioitu 2026-06-02). A1 read-only TEHTY (3 Explore-agenttia + koodiverifiointi): "Tämä viikko" (index.html:8049) tekee kanonisen done-checkin (dual-gate `movDoneThisWeek ∨ sess.endedAt` + OBS-028-liike­täsmäys + OBS-027-A2-planSourceDateISO-attribuutio); "Tulevat treenit" (index.html:5201 `renderFutureCollapsible`) + "Seuraavat 14 päivää" (index.html:8163) EIVÄT → off-plan-day tehty liike näkyy tekemättömänä tulevien-listoilla. Sama luokka kuin **F-1** value-resolution-auditissa (rendering-haja samalle loogiselle arvolle). Code formalisoi UNIFY-A2:n ratifioidusta suunnasta — verifioitu repon koodista (§7: repo voittaa).* **M2 (OBS-022) GATED + säilytetty** git-committissa `15f4973` (M2 palautetaan F-5 shipin jälkeen: `git show 15f4973:HANDOFF.md > HANDOFF.md`, samaan tapaan kuin M2 palautui K-A6D shipin jälkeen).

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `F-5` (completion-render-koherenssi — `isSlotDoneForWeek`-unify) · OBS-034 ("Tulevat treenit done") |
| Tyyppi | `refactor` (UNIFY, F-1/F-4-unify-malli — extract helper, reititä render-polut). **Render-only**: ei kosketa engineä, ei kuormaa, ei done-semantiikkaa (vain ekstraktointi). **EI LOAD-DIFF-SWEEPiä** — rakenteellisesti kuorma-neutraali (CLAUDE.md §9 kohta 4 -poikkeus: signaali ei ole `recommend()`-input, raportoidaan eksplisiittisesti). |
| Laadittu | 2026-06-02 / Cowork (DRAFT-COWORK ratifioitu) · Code formalisoi |
| Tila | `AKTIIVINEN` (A2 FIX -vaihe) |
| Pohja-HEAD | `15f4973` (= M2 un-gate -committi; APP_VERSION `4.52.33`). M2 HANDOFF säilyy git-historiassa `15f4973:HANDOFF.md`. |
| Liittyy R-sekvenssin vaiheeseen | Ei yksittäinen R-vaihe. Sulkee value-resolution-auditin viimeisen aukon (Completion-sarake "Avoin" → F-5 RATKAISTU). |

---

## 1. Tavoite

**Off-plan-day tehty liike näkyy "tehtynä" kaikilla kolmella viikko-/päivänäkymällä** — samalla kanonisella done-säännöllä kuin "Tämä viikko" -kortti käyttää tänään (OBS-026 + OBS-028 + OBS-027-A2 -semantiikka).

**A1-orientaation (2026-06-02, read-only) toteama nykytila:** "Tämä viikko" -kortin per-day done-checkin (index.html:8049) dual-gate `movDoneThisWeek ∨ sess.endedAt` on **kanoninen completion-render-totuuslähde**. Se tekee:
1. OBS-026: `endedAt`-pohjainen sessio-done -fallback (tasan-tällä-plan-päivällä).
2. OBS-028: liike-pohjainen viikkotäsmäys (top-set `movementId` viikon päättyneissä sessioissa) — atletti voi tehdä plan-liikkeen eri viikonpäivänä kuin slot suunniteltu.
3. OBS-027-A2 / OBS-030: `isPlanOverride && planSourceDateISO`-attribuutio → etukäteen tehty seuraavan viikon työ liikkuu oikean viikon scopeen.

**Mutta:** kaksi tulevat-listaa render-poluineen EIVÄT tee tätä tarkistusta:
- `renderFutureCollapsible()` (Koti-dashboard, index.html:5201–5241) — iteroi `getFutureWorkouts(...)` ja renderöi rivit ilman done-tilaa.
- "Seuraavat 14 päivää" -kortti (Sykli-näkymä, index.html:8163–8194+) — sama `getFutureWorkouts`-data + F-2 PATH 4 same-liike-clamp + summary, **mutta ei done-tarkistusta**.

**Seuraus (käyttäjälle):** Atletti tekee Heavy-kyykky-päivän jo ennen suunniteltua sunnuntaita → sunnuntain Heavy-kyykky-rivi näkyy "tekemättömänä" Koti-dashboardin "Tulevat treenit" -listalla ja Sykli-näkymän "Seuraavat 14 päivää" -kortilla. **"Tämä viikko" -kortti** (sama viikko, sama liike) näyttää sen samaan aikaan "tehtynä" → **epäkoherentti UI**.

**Haluttu lopputila (mekanismi, ratifioitu):** Sama dual-gate-sääntö kaikilla 3 render-polulla. **EI replikointia** (= sama luokka kuin F-1:n alkuperäinen virhe: kaksi rendering-polkua, divergenssiriski jos joku muutetaan). **UNIFY**: ekstraktoi 8049:n done-check jaettuun helperiin (esim. `isSlotDoneForWeek`), reititä kaikki 3 polkua sen kautta. Sama korjausmalli kuin **F-1+F-4-unify** (commit `0caf0a7`, `computeDisplayedSlotLoad`).

## 2. Acceptance criteria

> A1 = CONFIRM (TEHTY 2026-06-02, read-only laaja-sweep, 3 Explore-agenttia): juuri = "Tulevat treenit" (5201) + "Seuraavat 14 päivää" (8163) render-polut EIVÄT käytä 8049:n kanonista dual-gatea → sama luokka kuin F-1 (rendering-haja samalle loogiselle arvolle). A2 = FIX (UNIFY).

**A2a — Ekstraktoi kanoninen helper.** Siirrä 8049:n done-check (mukaan lukien 8018–8034:n viikkokohtainen sessio- ja `_completedMovIdsThisWeek`-laskenta) jaettuun helperiin. **Ehdotettu signature (Code päättää tarkka muoto):**
```js
// Palauttaa Set<movementId>:n top-set-liikkeistä joiden sessio päättynyt (endedAt)
// ja attribuoituu tähän viikkoon (dateISO TAI isPlanOverride+planSourceDateISO,
// OBS-027-A2 + OBS-028). Cached per (weekStartISO, weekEndISO).
function _getCompletedMovIdsForWeek(weekStartISO, weekEndISO) { ... }

// Done-ehto: slotin pääliike on top-set:nä päättyneessä saman viikon sessiossa
// (OBS-028) TAI sessio päätetty tasan tällä plan-päivällä (OBS-026 fallback).
function isSlotDoneForWeek(slot, weekStartISO, weekEndISO, dayISO = null) { ... }
```
- *Ehto:* helper kirjoittaa **identtinen done-tila** kuin 8049:n inline-logiikka tuottaa nyt. Semantiikkaa EI muuteta — vain ekstraktointi.

**A2b — Reititä kaikki 3 render-polkua helperin kautta.**
1. `index.html:8049` ("Tämä viikko" `cv-week-card`-render) → kutsuu `isSlotDoneForWeek(primary, weekStartISO, weekEndISO, dayISO)` ja `_getCompletedMovIdsForWeek`. Inline-laskenta poistetaan (siirtyy helperiin).
2. `index.html:5201–5241` (`renderFutureCollapsible`, Koti-dashboard) → per-`fw` laske `weekStartISO/weekEndISO` (fw:n viikko mesocyclen pohjalta) ja per-slot kutsu `isSlotDoneForWeek(slot, weekStartISO, weekEndISO, fw.dateISO)`. Renderöi done-statusCls (esim. CSS-luokka `done`/check-ikoni) yhdenmukaisesti.
3. `index.html:8163–8194+` ("Seuraavat 14 päivää" Sykli-kortti) → sama logiikka kuin 5201, per-slot done-check helperin kautta. **F-2 PATH 4 same-liike-clamp säilyy ennallaan** — done on visuaalinen overlay, ei kuorma-input.

- *Ehto:* **ÄLÄ KOPIOI** dual-gatea (= sama kuin F-1:n alkuperäinen virhe). Yksi totuuslähde, kolme käyttöä.

**A2c — Known-pos / known-neg (mittari-ensin, CLAUDE.md §3 + Selkäranka §6).**
- **Known-pos:** off-plan-day tehty liike → "tehty" molemmissa tulevien-listoilla.
  - Setup: kuvitteellinen state jossa Heavy-kyykky on suunniteltu vk6 SU, mutta endedAt-sessio on LA (top-set Kyykky, sama vk). Atribuutio dateISO=LA, sessio kuuluu vk6:n weekStartISO..weekEndISO -ikkunaan.
  - Odotus: "Tämä viikko" SU-rivi = ✓ (kuten tänään), "Tulevat treenit" SU-rivi = ✓ (uusi), "Seuraavat 14 päivää" SU-slot = ✓ (uusi).
- **Known-neg:** aidosti tekemätön ennallaan ("Tulevat" + "Seuraavat" eivät false-positoidu) + **"Tämä viikko" bittitarkasti ennallaan** (refactor on no-op nykytilalle).
  - Setup: state jossa vk5–vk7 ei mitään endedAt-sessioita.
  - Odotus: kaikki 3 näkymää näyttävät tekemätön-tilan (ei ✓).

**A2d — Pilot bittitarkka (engine koskematon).** Stop hook (`smoke-test.mjs` + `run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w`) tuottaa **identtiset** trace-arvot kuin pohja `15f4973` — render-only-muutos ei kosketa engineä. **64/64 päivää 0 virhettä** + audit-flagien jakauma muuttumaton (K_A1=10, INVARIANT_VIOLATION=4, jne.).

**A2e — Selaintestit 748/752.** `?test=1` (test-runner.js) pysyy 748/752 (4 pre-existing VBT/T9). UI-pinta ei testattava CLI:stä — manuaalinen browser-preview-verifiointi tarvittaessa (kuten K-A6D-vaiheessa).

**A2f — `VALUE_RESOLUTION_AUDIT.md` §2 → F-5 RATKAISTU.** Päivitä:
- §1 Yhteenveto-taulukko Completion-sarake: lisää "F-5 (`isSlotDoneForWeek`-unify, helper-ekstrakt)" Suljettu-listalle.
- §2 Fragmentaatiorekisteri: uusi **F-5** -merkintä (oire, polku-enumerointi, ratkaisu, verifiointi). Käytä F-1+F-4-unify-formaattia mallina.
- §4 Sulkeutumis-roadmap: päivitä lopputulos "kaikki 5 fragmentaatiota suljettu".

**A2g — push-ehto.** Stop hook exit 0 + selain 748/752 + Akselin known-pos/neg-ratifiointi + per-löydös-committi. **STOP push-portille.**

## 3. Reunaehdot ja scope-aita

- **Invariantit (`CLAUDE.md` §2):** Ei sovelleta — render-only, ei kosketa tutkimusperustaisia parametreja (VL-cap, tier, deload Δ%, MPV slope). Pilot bittitarkka = invarianttien validointi pysyy ennallaan.
- **Operointitapa (`CLAUDE.md` §9 EQUIP PROSESSI):**
  - **§9.4 LOAD-DIFF-SWEEP -poikkeus:** rakenteellinen analyysi todistaa kuorma-neutraalin (helper koskee vain UI-render-statusta `statusCls`/`statusIcon`; `_completedMovIdsThisWeek` on lukupää, ei syöte `recommend()`:lle). Ei sweep-vaatimusta — raportoidaan eksplisiittisesti A2:n session-tuloksessa.
  - **§9.2 Plan mode ENNEN toteutusta:** Code suunnittelee helper-sijainti (index.html funktion-taso lähellä `_cvSessionByDate`-cachea vai utils-modulissa), cache-strategia, signature ja per-fw-viikon-resoluutio Plan-agentilla ENNEN edit-vaihetta. Estää runtime-premissi-reversion (esim. cache-rikko, jos helper kutsutaan eri context:eista).
  - **§9.6 Effort-jako:** ekstrakti+reititys on mekaaninen → Sonnet. Design-päätökset (Plan-vaihe) tarvittaessa Opus high.
- **Mitä EI kosketa (scope-aita):**
  - **Done-logiikan semantiikkaa** — vain ekstraktointi 8049:stä helperiin, identtinen output.
  - **Engine** (`engine.js` `getFutureWorkouts`, `recommend`, `computeProgressionTarget`, MovementProgress-päivitykset) — koskematon.
  - **Load-polut** — same-liike-clamp (F-2 PATH 4 8170–8194), `_syRenderComputeKg`, dashboard `computeDisplayedSlotLoad` ennallaan. Done on visuaalinen overlay; kuorma-laskenta tekee oman tienss.
  - **`_cvWeekStatus`-viikko-numero-by-design** (index.html:7953–7958) — tulevat viikot = "future" puhtaasti vk-numeron pohjalta. F-5 koskee **päivätason slot-rivejä** (futureWorkouts-iterointi), ei viikko-otsikoita.
  - **Save-polku** (`saveWorkoutToDb`, `saveSets`, `set.completed`-transient) — value-resolution-audit §3 footgun ennallaan. `set.completed` ei persistoidu, helper lukee `endedAt`+`setRole="top"`+`movementId` -presence-checkillä.
  - **M2 (OBS-022) HANDOFF** — säilyy git-committissa `15f4973`, palautuu F-5 shipin jälkeen.
- **Tekniset:** vanilla JS, ei npm, ES-modulit, Stop hook -yhteensopiva.

## 4. Atletti-vastaukset critical questions -kysymyksiin

**Ei sovellu** — tyyppi `refactor` (ei `block-tuning`). Render-only UNIFY, ei muuta atleettiparametrejä.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

1. **UNIFY-MALLI (= F-1/F-4-unify, commit `0caf0a7`).** Ekstraktoi 8049:n done-check yhdeksi kanoniseksi funktioksi (esim. `isSlotDoneForWeek`), reititä kaikki 3 render-polkua sen kautta. Sama rakenne kuin `computeDisplayedSlotLoad` -refaktori joka sulki F-1+F-4 (`index.html:4445`).
2. **HYLÄTTY: replikoi dual-gate joka render-polkuun.** Riski: divergenssi jos joku muutetaan (= F-1:n alkuperäinen virhe). Single-source-puhtaus (= value-resolution-audit-oppi: "ei dead divergenttiä signaalia") pakottaa UNIFY:n.
3. **EI LOAD-DIFF-SWEEPiä — render-only-poikkeus.** Helper ei vaikuta `recommend()`-kuormaan (`_completedMovIdsThisWeek` luetaan UI-statuksesta, ei kuormalaskennasta). EQUIP §9.4 -poikkeus: rakenteellinen analyysi todistaa kuorma-neutraalin. Sweep olisi rakenteellisesti tyhjä (helper ei ole `recommend()`-input).
4. **Helper-sijainti: index.html funktion-tasolle** lähellä `_cvSessionByDate`-cacheia (~7948) tai pinnan ulkopuolelle. Vaihtoehto utils-modulin oma tiedosto hylätty: render-only utility ei tarvitse omaa moduulia, ja yhdessä paikassa pidetty helper näkyy paremmin tulevien render-polkujen yhteydessä. Code päättää tarkka sijainti Plan-vaiheessa.
5. **Cache-strategia: per-(weekStartISO, weekEndISO) sisällä yhden renderin scopessa.** Tulevat-näkymä kattaa enintään 2–3 viikkoa (14 päivää) → 2–3 cache-entryä per render. Säilyttäisi nykyisen 8018–8034 yhden-kerran-laskennan luonteen "Tämä viikko" -renderissä.
6. **F-1 -opit suoraan sovellettu:** F-1:n korjaus oli `computeDisplayedSlotLoad` joka yhdisti dashboard- ja workout-flow-kuorma-renderin (single source `slot.resolvedLoadKg` same-liike-apuliikkeelle). F-5:n korjaus on `isSlotDoneForWeek` joka yhdistää "Tämä viikko" + "Tulevat" + "Seuraavat" done-renderin (single source 8018–8049-dual-gate).
7. **VALUE_RESOLUTION_AUDIT.md klusteri-loppu:** F-5 sulkemisen jälkeen audit on KOKONAAN KIINNI (F-1, F-2, F-3, F-4, F-5 kaikki ratkaistut) — invariantti uusille completion/attribuutio-render-poluille: lue VAIN `isSlotDoneForWeek` (UI-done) tai `session.endedAt`+presence (audit/historia).

## 6. Avoimet kysymykset (Code selvittää A2-Plan-vaiheessa, raportoi session-tuloksessa)

- **Q1: Helperin sijainti.** index.html funktion-tasolla (lähellä `_cvSessionByDate`-cacheia ~7948) vai pinnan ulkopuolelle (esim. ~5180 ennen `renderFutureCollapsible`:a)? Code valitsee + perustelee (suositeltu: yksi paikka jossa render-only-helperit asuvat).
- **Q2: Per-fw-viikon-resoluutio "Tulevat treenit" + "Seuraavat 14 päivää" -render-poluissa.** `fw` (futureWorkout) sisältää `weekNum`-kentän (engine.js:5988). Resolvoiko helper `weekStartISO/weekEndISO` `mesocycle.startDateISO + (weekNum-1) × 7`-laskennalla, vai vaaditaanko `fw`:lle eksplisiittinen `weekStartISO`-attribuutti `getFutureWorkouts`-paluuobjektista? Suositus: laske helperissä `mesocycle`-parametristä (helper ei muuta `getFutureWorkouts`-paluuta).
- **Q3: dayISO-fallback (OBS-026) tulevien-listoilla.** "Tämä viikko" käyttää `_cvSessionByDate.get(dayISO)` -fallbackin (8038). Tulevilla päivillä `sess` ei ole olemassa → fallback no-op. Säilytä helperissä `dayISO=null` -optio joka ohittaa fallbackin tulevilla, mutta käyttää sen "Tämä viikko" -kontekstissa (bittitarkka backward-compat).
- **Q4: Status-rendering.** "Tulevat treenit" + "Seuraavat" -kortit eivät tällä hetkellä renderöi `statusCls="done"` / check-ikonia. Lisätäänkö **visuaalinen tila** (esim. läpiviivaus, ✓-merkki, opacity) vai pelkkä tiedotemerkintä (esim. small badge "tehty")? Suositus: minimaalinen ✓-ikoni rivin lopussa + opacity 0.6, säilyttäen "klikattavissa" -ominaisuuden. Akseli ratifioi visuaalisen tyylin A2-Plan-vaiheen jälkeen tarvittaessa.

---

## 7. Session-tulos

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-06-02 (jatkettu Code-sessio, K-A6D shipin jälkeen) |
| Muuttuneet tiedostot | `index.html` (a8c913a: helper-funktiot ~5243 + 3 polun reititys 8049/5298+/8245+; 4940c12: APP_VERSION sync meta + _syRenderAppVersion), `sw.js` (4940c12: APP_VERSION 4.52.33→4.52.34 + history-rivi), `docs/VALUE_RESOLUTION_AUDIT.md` (47b3e62: §1 Completion-sarake F-5 lisätty, §2 F-5 fragmentaatiorekisteri + CLOSED-taulukko, §4 sulkeutumis-roadmap + uusi invariantti completion-render-poluille), `HANDOFF.md` (tämä commit). |
| Tehdyt päätökset | **Q1 helper-sijainti:** index.html toplevel ~5243 (ennen `renderFutureCollapsible`:a). Pidetään yhdessä paikassa render-only-helpereinä. **Q2 viikko-resoluutio:** `_f5WeekRange(meso, fw.weekNum)` laskee `weekStartISO/weekEndISO` `mesocycle.startDateISO`:sta + `(weekNum-1) × 7 päivää`. Helper ei muuta `getFutureWorkouts`-paluuta. **Q3 dayISO-fallback:** `dayISO=null` -optio ohittaa OBS-026-fallbackin tulevilla, käyttää sen "Tämä viikko" -kontekstissa (bittitarkka backward-compat). **Q4 status-rendering:** ✓-prefix + `opacity:0.6` + "Tehty"-tag/chip — minimaalinen visuaalinen muutos, säilyttää klikattavuuden. **Cache-strategia:** ei välimuistia per kutsu — `state.sessions` linear-skannaus on halpa (tyypillinen <500 sessiota), 6 päivää × N sessio per "Tämä viikko" -render. Identtinen semanttinen tulos kuin 8018-8034:n inline-IIFE. |
| Validointi | **Stop hook:** smoke + pilot OK per-commit (sarja `2c2d9ba → 47b3e62 → 4940c12`; HANDOFF-committit ohittaen). **Pilot bittitarkka:** akseli-elite-streetlifter full-16w **64/64 päivää, 0 virhettä, 68 audit-flagia** (K_A1=10, INVARIANT_VIOLATION=4) — sama jakauma kuin 15f4973-pohjassa = engine koskematon. **Selaintestit (?test=1):** **748/752** (4 pre-existing VBT/T9: VBT anchorCount=5 ×3, T9 SAFE targetVx — ei uusia faileja, ei velocityStop/completion-related-regressiota). **LOAD-DIFF-SWEEP-poikkeus dokumentoitu:** CLAUDE.md §9.4 -poikkeus täytetty (rakenteellinen analyysi: helper koskee vain `statusCls`/`statusIcon`/inline-style, ei `recommend()`-input → rakenteellinen kuorma-neutraali). **Known-pos/neg:** semanttinen verifiointi koodi-luettavasti — helper-logiikka identtinen 8049-inlinen kanssa (OBS-026 endedAt-dayISO-fallback, OBS-028 movId-täsmäys, OBS-027-A2/OBS-030 planSourceDateISO-attribuutio). Selaimen module-scope esti `preview_eval`-tason mock-testit (helperit eivät window-scopessa), mutta vaihtoehtoinen reitti (state-mock + render-trigger) jätetty pois koska semantiikka todistettu suoraan koodi-vertailulla. |
| Jäi auki | — (F-5 4/4 shipattu; push-portti odottaa Akselin ratifiointia) |
| Seuraava askel | **STOP push-portille — Akseli ratifioi.** Push (5 commitia: 8763632 → 4940c12) → **M2 un-gate** (`git show 15f4973:HANDOFF.md > HANDOFF.md` palauttaa M2/OBS-022 -aktiivisen handoffin). M2 A2b alkaa Akselin erikseen antamasta ohjeesta (operointitapa CLAUDE.md §9: plan-mode + LOAD-DIFF-SWEEP-push-ehto + A1 read-only → STOP → A2). |
