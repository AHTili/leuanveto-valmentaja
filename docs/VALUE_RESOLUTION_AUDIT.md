# Value-resolution-audit — kuorma / e1RM / completion / preview -fragmentaatio

> **Tarkoitus:** Enumeroida kaikki kohdat joissa sama looginen arvo (slotin kuorma, liikkeen e1RM, "tehty"-tila, preview-arvo) resolvoituu useassa eri koodipolussa, jotka voivat erkaantua. Tämä on OBS-CORE-arcin meta-juuri: yksittäiset bugit (back-off>pää, apuliike≈pää, Koti≠live, treeni näkyy tekemättömänä) ovat oireita siitä että **ei ole yhtä totuuslähdettä arvoa kohti**.
>
> *Laadittu 2026-05-31 (/goal value-resolution-audit). Pohja HEAD 6908a89, APP_VERSION 4.52.28. Neljä read-only Explore-sweepiä + koodiverifiointi. Auktoriteetti: koodi voittaa (CLAUDE.md §7) — agenttien väitteet verifioitu rivitasolla, virheet korjattu (ks. §6).*

---

## 0. INVARIANTTI — e1RM- ja kuorma-totuuslähde (F-3 A2, 2026-05-31)

**Kanoninen e1RM (ainoat sallitut lähteet näyttöön/kuormaan):**
- **Näyttö (UI):** `computeMovementE1RMBest` (cal→plan→median). Edistyminen · Liikepankki · Trendit · Ennuste · Sykli-preview.
- **Live-kuorma (recommend):** `currentE1RMSystem` (ketju cal→primer→plan→VBT-cap→floor) → `resolvedLoadKg` / `targetExternalLoad`.

**EI-kanoniset storet — tarkoitus-segregoituja, EI lueta näyttöön/kuormaan:**
- `MovementProgress.currentE1RM` (last-set Epley): VAIN stagnaatio + `e1rmHistory`.
- `movementCfg.e1rmExternal` (manuaali cal-drift): VAIN cross-ref-lattia (`max(historia, cfg)`).
- `peakingConfig.e1rmExternal` (wizard/93): VAIN fallback (live `currentE1RMExternal` voittaa). *Residuaali: stale jos live null peaking-päivänä — harvinainen, kisaliikkeellä on historiaa.*

**Sääntö (uusille slot-kuorma-/e1RM-render-poluille):** lue VAIN (a) recommend() `resolvedLoadKg`/`targetExternalLoad` (live + dashboard) tai (b) `computeMovementE1RMBest` (UI-e1RM). `getMovementProgress.suggestedLoadKg` sallittu VAIN eri-liike-apuliikkeille (movement ≠ päivän primary).

**Koneellinen lukko (regressio-vartija):** `test-runner.js` → `testKotiEqualsLiveAccessory` (same-liike-apuliike `resolvedLoadKg` = kanoninen e1RM × loadPct = preview) + `testSp2SlotLoadInvariant` (same-liike non-primary ≤ pää, **intensiteetti-tietoinen**: vain designed-lighter/yhtä-raskaat = efektiiviset toistot reps+Vx ≥ pää; top single/opener raskaampi by-design pl.) + `engine-pilot` → `auditSp2SlotLoad` (sama reps-pohjainen ehto). Nämä laukeavat jos store-arvo vuotaa näyttöön/kuormaan (F-1-luokka) tai designed-lighter slotti inflatoituu > pää (F-2-luokka).

---

## 1. Yhteenveto — tila kategorioittain

| Kategoria | Totuuslähde (tavoite) | Suljettu (tämä arc) | Avoin | By-design / hyväksytty |
| --- | --- | --- | --- | --- |
| **e1RM** | `currentE1RMSystem` (recommend, kanoninen ketju cal→primer→plan→VBT-cap→floor) + `computeMovementE1RMBest` (UI) | ROOT-A: `sessionEffectiveE1RM = currentE1RMSystem` (back-off/secondary) · **F-3** store-segregaatio + invariantti §0 | — | Epley-Vara-kaava (§e1rm 1-3) yhtenäinen; UI-näkymät (Edistyminen/Liikepankki/Trendit) käyttävät kaikki `computeMovementE1RMBest` |
| **Kuorma** | recommend() `resolvedLoadKg` / `targetExternalLoad` (kanoninen e1RM × pct) | ROOT-A (back-off) · OBS-035+037 (same-liike-volyymi-apuliike workout-flow + Sykli) · **F-1**+**F-4** (F-4-unify 0caf0a7 → dashboard=live) · **F-2** intensiteetti-tietoinen clamp (4.52.32) | — | seed/legacy-fallbackit (ei e1RM-historiaa) |
| **Completion** | `session.endedAt` (persistoitu) | OBS-026/028 (endedAt-pohjainen done) · OBS-027-A2 (planSourceDateISO-attribuutio) | — | `set.completed` transient (save filtteröi) vs persistoitu presence-check — tarkoituksellinen; viikko-done = vk-numero |
| **Preview** | recommend() live (= workout-flow) | OBS-035+037 (`_syRenderComputeKg` apuliike loadPct = live) · OBS-027 (Koti=live) · F-1 (dashboard=Sykli=live) · F-2 PATH 4 (Sykli-preview same-liike clamp-peilaus) | — | Sykli 14pv flat-estimaatti vs live-progressio = C-HYBRID (programTargetsCache sovittaa lähimmän session) |

**Lopputulos (2026-06-02):** 4 oire-juurta suljettu (ROOT-A, OBS-035+037, OBS-026/028, OBS-027/030) + **kaikki 4 fragmentaatiota suljettu (F-1, F-2, F-3, F-4)** → **value-resolution-audit KOKONAAN KIINNI.** F-1 + F-4 = F-4-unify (commit 0caf0a7, `computeDisplayedSlotLoad`); F-3 = store-segregaatio + invariantti §0; F-2 = intensiteetti-tietoinen reps-pohjainen clamp (push 4.52.32). Loput by-design (dokumentoitu §3).

---

## 2. Fragmentaatiorekisteri

### F-1 — Koti-dashboard apuliike-render ≠ workout-flow + Sykli  ✅ RATKAISTU (F-4-unify, commit 0caf0a7)
- **Oire:** same-liike-volyymi-apuliike näkyi Koti-dashboardilla `getMovementProgress.suggestedLoadKg`-arvolla (≈ pää), kun workout-flow + Sykli-preview näyttivät kanonisen `resolvedLoadKg`:n.
- **Ratkaisu:** F-4-refaktori (commit 0caf0a7) yhdisti dashboard- + workout-flow-kuormanäytön funktioon `computeDisplayedSlotLoad` (`index.html:4445`). Dashboard-render lukee nyt `slot.resolvedLoadKg`:n same-liike-apuliikkeelle (4476-4485: `_sameMov = typeof slot.resolvedLoadKg === "number"` → "+", deload-aware) → dashboard = Sykli = live.
- **Verifioitu:** kyllä (luettu 4440-4496, HEAD 99c84be — `computeDisplayedSlotLoad`-haara kaikille rooleille).

### F-2 — rate-limit × back-off  ✅ RATKAISTU (intensiteetti-tietoinen reps-pohjainen clamp, 2026-06-02)
- **Oire:** regain/deload-viikoilla pään top-set suppressoituu kanonisen e1RM × loadPct -arvon alle; designed-lighter back-off / volyymi-apuliike (käyttää `sessionEffectiveE1RM` = täysi kanoninen e1RM) → > suppressed pää.
- **Polku:** `engine.js` Branch A (~4896) + 15c accessory-pass (~5309) + Branch B cross-ref (~5062).
- **Ratkaisu (i = clamp-laajennettu, ratifioitu):** same-liike non-primary clampataan ≤ pään (suppressoitu) `targetExternalLoad` VAIN jos suunniteltu kevyemmäksi/yhtä raskaaksi = **efektiiviset toistot (reps+Vx) ≥ pää** (`primaryEffectiveReps` = `primarySlotMeta.reps+targetVx`). Raskaampi by-design (top single/opener, VÄHEMMÄN toistoja) → EI clampata. Tämä **intensiteetti-tietoinen** ehto esti regression jossa pct-laajennus yli-clamppasi vk10/11 "heavy-first top single" -slotit (81→71, 166,5→163, 90→79,5). Sama reps-pohjainen `heavierByDesign` clampissa + `auditSp2SlotLoad`-detektorissa + `testSp2SlotLoadInvariant`-selaintestissä → bittitarkka clamp↔detektori-yhtenäisyys.
- **PATH 4 (Koti=live):** Sykli-preview (`_syRenderComputeKg`, fw-loop) peilaa clampin same-liike non-primarylle cache-pään suhteen (warm-cache; cold-start flat-fallback dokumentoitu koodissa).
- **Verifiointi (sweep pakollinen, F-2-oppi):** pre-vs-post-sweep (Akseli backup, HEAD vs pre-F2 0caf0a7): **0 nykykuorma-muutosta** (top-singlet ennallaan, clamp dormantti nykydatalle); pilot 64/64 0 virhettä SP-2=0; selain 748/752 (4 pre-existing VBT/T9). **Pushattu origin/main 4.52.32** (8 commitia 7dd6983→99c84be); Akseli ratifioi pushin 2× (kuorma-muutos-portti → sweep paljasti regression → korjaus → re-ratifiointi).

### F-3 — e1RM-persistenssistorejen hajonta  ✅ RATKAISTU (A1: segregoitu · A2: invariantti §0 + Koti=live-guard)
**A1-verdikti (2026-05-31, read-only):** audit yli-kehysti tämän. Storet ovat **tarkoitus-segregoituja** (ks. §0): `MovementProgress.currentE1RM` = stagnaatio/historia (ei näyttöön/kuormaan), `movementCfg` = cross-ref-lattia, `peakingConfig` = fallback. Edistyminen/Liikepankki/Trendit käyttävät kanonista `computeMovementE1RMBest`:iä — ei divergenssiä. Ainoa aito käyttäjä-näkyvä divergenssi oli F-1 (jo korjattu). **A2 = invariantti §0 + `testKotiEqualsLiveAccessory`-vartija (ei segregaatio-koodimuutosta — jo oikein).** Alla alkuperäinen audit-kehys:
- **Oire:** sama liike voi kantaa eri e1RM-arvoa neljässä eri storessa, jotka eivät synkronoidu:
  - `currentE1RMSystem` (recommend, sessio-laajuinen kanoninen ketju) — **totuuslähde laskennalle**.
  - `MovementProgress.currentE1RM` (`engine.js:1694`, vain VIIM. setistä `e1rmAccessory`) — accessory-progressio + dashboard/workout-flow apuliike-fallback.
  - `movementCfg.e1rmExternal` (`index.html:1615`, manuaalinen cal-drift-override).
  - `peakingConfig.e1rmExternal` (`data.js:2814`, wizard/default 93).
- **Juuri:** `computeMovementE1RMBest` (cal→plan→median) on UI:n totuuslähde, mutta `MovementProgress.currentE1RM` lasketaan eri tavalla (viim. setti) ja sitä käytetään apuliike-kuormiin → F-1:n taustasyy.
- **Korjaus:** vaatii oman handoffin (e1RM-source-of-truth-konsolidointi; arvio: apuliike-fallback → `computeMovementE1RMBest`; movementCfg/peakingConfig-synkronointi).

### F-4 — variantLoadModifier-epäsymmetria  ✅ RATKAISTU (F-4-unify, commit 0caf0a7)
- **Oire:** workout-flow applioi `variantLoadModifier`:n `resolvedLoadKg`:hen, Koti-dashboard EI → sama back-off/secondary-slotti saattoi näyttää eri kuorman dashboardissa vs livessä jos variantilla modifier ≠ 0.
- **Ratkaisu:** commit 0caf0a7 — dashboard välittää `variantModifiers`:n `computeDisplayedSlotLoad`-kutsuun (`index.html:4450`) → vMod applioituu primary/back-off/resolved/fallback-sloteille = workout-flow. (Sama unify joka sulki F-1:n.)
- **Verifioitu:** kyllä (luettu 4445-4451, HEAD 99c84be).

### CLOSED — suljetut tässä arcissa (verifioitu)
| ID | Fragmentaatio | Korjaus | Status |
| --- | --- | --- | --- |
| ROOT-A | back-off e1RM `target/loadPct` → kanoninen `currentE1RMSystem` | `engine.js:4807` | ✅ pushattu + puhelinverifioitu (4.52.27) |
| OBS-035+037 | same-liike-volyymi-apuliike `getMovementProgress` → kanoninen loadPct (workout-flow + Sykli) | `engine.js` 15c-pass + `index.html:12875,7890` | ✅ pushattu + puhelinverifioitu (4.52.28) — **paitsi F-1 (dashboard)** |
| OBS-026/028 | session-done `completed`-flag (ei-persistoitu) → `endedAt` + liike-pohjainen viikkomatch | `index.html:8013-8053` | ✅ |
| OBS-027-A2 | planOverride-session väärässä viikossa | `index.html:8026` planSourceDateISO-attribuutio | ✅ |
| OBS-030 | progression-attribuutio (lepotila lastSession) | `engine.js` ctx.lastSession | ✅ |

---

## 3. By-design / hyväksytyt (ei bugeja — dokumentoitu jottei uudelleen-tutkita)

- **Sykli 14pv -preview flat vs live-progressio:** `_syRenderComputeKg` (`index.html:7865`) on flat `e1RM × pct`-estimaatti tuleville viikoille; live (recommend) applioi progression (Helms +2,5 %/vk, regain, readiness, cap). C-HYBRID (`sykliHybridPreviewLoads` ~8543) sovittaa LÄHIMMÄN session programTargetsCache:sta; tulevat viikot ovat tarkoituksella estimaatteja. **Hyväksytty** (ei totuuslähde-rikko, vaan eri tarkoitus).
- **Stale `state.recommendation` (timing):** dashboard voi näyttää vanhan recommendin jos käyttäjä navigoi pois ja takaisin ennen treenin aloitusta; live-aloitus laskee tuoreen. Matala riski (vain jos cal-setti kirjataan välissä).
- **`set.completed` transient vs persistoitu presence-check:** save filtteröi `completed`-flagilla (`14609`), historia tunnistaa setit presence + `setRole !== "skipped"` + `reps != null` (`5570`). Tarkoituksellinen (persistoidut setit eivät kanna `completed`-kenttää). **Footgun-varoitus:** jos joku lisää `completed`-persistenssin päivittämättä luku-polkuja, historia rikkoutuu.
- **Viikko-done = vk-numero (`_cvWeekStatus` ~7957):** `week < currentWeek` → "done" ilman session-tarkistusta. Hyväksytty (mesosykli-näkymän visuaalinen tila).

---

## 4. Sulkeutumis-roadmap — ✅ VALMIS (2026-06-02, kaikki fragmentaatiot suljettu)

1. **F-1 (Koti-dashboard-apuliike)** ✅ — F-4-unify (commit 0caf0a7): dashboard-render → `computeDisplayedSlotLoad` (= workout-flow), lukee `slot.resolvedLoadKg`:n same-liike-apuliikkeelle.
2. **F-2 (rate-limit×back-off)** ✅ — intensiteetti-tietoinen reps-pohjainen clamp (push 4.52.32, 8 commitia 7dd6983→99c84be). Sweep (Akseli backup): 0 nykykuorma-muutosta; pilot SP-2=0.
3. **F-3 (e1RM-persistenssi)** ✅ — store-segregaatio (tarkoituksellinen, ei koodimuutosta) + invariantti §0 + `testKotiEqualsLiveAccessory`-vartija.
4. **F-4 (variantLoadModifier)** ✅ — F-4-unify (0caf0a7), niputettu F-1:een (`variantModifiers` → `computeDisplayedSlotLoad`).

**Invariantti jatkoa varten:** uusi slot-kuorma- tai e1RM-render-polku EI saa lukea arvoa muusta kuin (a) recommend() `resolvedLoadKg`/`targetExternalLoad` (live + dashboard) tai (b) `computeMovementE1RMBest` (UI-e1RM-näkymät). `getMovementProgress.suggestedLoadKg` sallittu VAIN eri-liike-apuliikkeille (movement ≠ päivän primary). SP-2-selainassertio (test-runner.js) lukitsee back-off ≤ pää; harkitse vastaava apuliike ≤ back-off -assertio.

---

## 5. Enumeroinnin laajuus (mitä käytiin läpi)
- **e1RM:** ~40 sitea (engine.js + index.html + data.js): kaavat (e1rmSystem/External/Accessory), `computeMovementE1RM(Best/History)`, recommend()-ketju (baseline→cal→primer→plan→VBT-cap→floor), MovementProgress/movementCfg/peakingConfig-storet, VBT/RTF-johdannaiset.
- **Kuorma:** kaikki slot-roolit (primary/back-off/secondary/cal/accessory/warmup/attempt) × kaikki render-kontekstit (recommend live / Sykli-preview / workout-flow / dashboard).
- **Completion:** session/set/day/week-done + plan-attribuutio.
- **Preview:** Sykli / Koti-dashboard / Edistyminen / Liikepankki / Trendit / Ennuste-kisaan vs live.

## 6. Agenttien virheet (korjattu koodiverifioinnilla — §7-disipliini)
- **"Apuliike resolvoidaan kahdesti" (load-agentti):** VÄÄRÄ. Branch A (~4869) ajetaan ENNEN `resolveDayPlanSlots`:ia (5268), joten apuliikkeen movementName ei ole vielä = primary → Branch A ei resolvoi sitä. 15c-pass on AINOA resoluutio. Ei tuplaresoluutiota.
- **"Koti-apuliike käyttää resolvedLoadKg:ia, ei divergenssiä" (preview-agentti):** VÄÄRÄ. Dashboard (`4477`) käyttää `getMovementProgress`:ia → F-1. Load-agentti oikeassa.
