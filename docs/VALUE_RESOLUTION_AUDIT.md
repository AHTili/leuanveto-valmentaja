# Value-resolution-audit — kuorma / e1RM / completion / preview -fragmentaatio

> **Tarkoitus:** Enumeroida kaikki kohdat joissa sama looginen arvo (slotin kuorma, liikkeen e1RM, "tehty"-tila, preview-arvo) resolvoituu useassa eri koodipolussa, jotka voivat erkaantua. Tämä on OBS-CORE-arcin meta-juuri: yksittäiset bugit (back-off>pää, apuliike≈pää, Koti≠live, treeni näkyy tekemättömänä) ovat oireita siitä että **ei ole yhtä totuuslähdettä arvoa kohti**.
>
> *Laadittu 2026-05-31 (/goal value-resolution-audit). Pohja HEAD 6908a89, APP_VERSION 4.52.28. Neljä read-only Explore-sweepiä + koodiverifiointi. Auktoriteetti: koodi voittaa (CLAUDE.md §7) — agenttien väitteet verifioitu rivitasolla, virheet korjattu (ks. §6).*

---

## 1. Yhteenveto — tila kategorioittain

| Kategoria | Totuuslähde (tavoite) | Suljettu (tämä arc) | Avoin | By-design / hyväksytty |
| --- | --- | --- | --- | --- |
| **e1RM** | `currentE1RMSystem` (recommend, kanoninen ketju cal→primer→plan→VBT-cap→floor) + `computeMovementE1RMBest` (UI) | ROOT-A: `sessionEffectiveE1RM = currentE1RMSystem` (back-off/secondary) | **F-3** persistenssi-storejen hajonta (MovementProgress vs movementCfg vs peakingConfig) | Epley-Vara-kaava (§e1rm 1-3) yhtenäinen; UI-näkymät (Edistyminen/Liikepankki/Trendit) käyttävät kaikki `computeMovementE1RMBest` |
| **Kuorma** | recommend() `resolvedLoadKg` / `targetExternalLoad` (kanoninen e1RM × pct) | ROOT-A (back-off) · OBS-035+037 (same-liike-volyymi-apuliike workout-flow + Sykli) | **F-1** Koti-dashboard-apuliike (4477) · **F-2** rate-limit×back-off · **F-4** variantLoadModifier-epäsymmetria | seed/legacy-fallbackit (ei e1RM-historiaa) |
| **Completion** | `session.endedAt` (persistoitu) | OBS-026/028 (endedAt-pohjainen done) · OBS-027-A2 (planSourceDateISO-attribuutio) | — | `set.completed` transient (save filtteröi) vs persistoitu presence-check — tarkoituksellinen; viikko-done = vk-numero |
| **Preview** | recommend() live (= workout-flow) | OBS-035+037 (`_syRenderComputeKg` apuliike loadPct = live) · OBS-027 (Koti=live) | (F-1 koskee tätä: dashboard ≠ Sykli-preview ≠ live apuliikkeelle) | Sykli 14pv flat-estimaatti vs live-progressio = C-HYBRID (programTargetsCache sovittaa lähimmän session) |

**Lopputulos:** 4 oire-juurta suljettu tässä arcissa (ROOT-A, OBS-035+037, OBS-026/028, OBS-027/030). **4 avointa fragmentaatiota (F-1…F-4)** roadmapattu §4. Loput by-design (dokumentoitu §3).

---

## 2. Fragmentaatiorekisteri

### F-1 — Koti-dashboard apuliike-render ≠ workout-flow + Sykli  ⚠️ AVOIN (OBS-035+037-jäänne)
- **Oire:** same-liike-volyymi-apuliike näkyy Koti-dashboardin "tämän päivän" -listassa `getMovementProgress.suggestedLoadKg`-arvolla (≈ 65–73,5 ≈ pää), kun workout-flow + Sykli-preview näyttävät kanonisen `resolvedLoadKg`:n (≈ 29).
- **Polku:** `index.html:4477-4491` — `state.movementProgressMap.get(movId).suggestedLoadKg ?? lastLoadKg`. **EI lue `slot.resolvedLoadKg`:ia** (toisin kuin back-off 4456 / secondary 4467 / cal 4473).
- **Juuri:** OBS-035+037 laajensi UI-resolvedLoadKg-gaten role=accessory:lle workout-flow:ssa (`12875`) + previewissä (`7890`), mutta **dashboard-render (4477) jäi väliin** — se on oma haaransa joka aina käyttää movementProgressMap:ia.
- **Korjaus (pieni, valmis):** 4477-haara lukee ensin `slot.resolvedLoadKg` (kuten 4456/4467/4473), fallback `getMovementProgress`. → dashboard = Sykli = live = ~29.
- **Verifioitu:** kyllä (luettu 4443-4491, HEAD 6908a89).

### F-2 — rate-limit × back-off  ⚠️ AVOIN (OBS-CORE-juuri #2)
- **Oire:** regain-viikoilla pään top-set suppressoituu kanonisen e1RM × loadPct -arvon alle; back-off (käyttää `sessionEffectiveE1RM` = täysi kanoninen e1RM) → back-off > pää 19 pilot-sessiossa.
- **Polku:** `engine.js` Branch A back-off (~4896) käyttää `sessionEffectiveE1RM`:ää, joka ei seuraa pään progressio-/rate-limit-suppressointia (`PROGRESSION_TARGET` ~4687).
- **Säilössä:** `stash@{0}` — SP-2-pilot-audit-check + a/b/c-tradeoff (a hyväksy 19 / b rate-limit-säteily +16 muuta virhettä / c clamp ≤ pää +6 muuta).
- **Korjaus:** vaatii oman handoffin (valmennuspäätös: onko regain-viikon back-off>pää bugi vai hyväksyttävä; ripple-virheiden tutkinta).

### F-3 — e1RM-persistenssistorejen hajonta  ⚠️ AVOIN (laaja)
- **Oire:** sama liike voi kantaa eri e1RM-arvoa neljässä eri storessa, jotka eivät synkronoidu:
  - `currentE1RMSystem` (recommend, sessio-laajuinen kanoninen ketju) — **totuuslähde laskennalle**.
  - `MovementProgress.currentE1RM` (`engine.js:1694`, vain VIIM. setistä `e1rmAccessory`) — accessory-progressio + dashboard/workout-flow apuliike-fallback.
  - `movementCfg.e1rmExternal` (`index.html:1615`, manuaalinen cal-drift-override).
  - `peakingConfig.e1rmExternal` (`data.js:2814`, wizard/default 93).
- **Juuri:** `computeMovementE1RMBest` (cal→plan→median) on UI:n totuuslähde, mutta `MovementProgress.currentE1RM` lasketaan eri tavalla (viim. setti) ja sitä käytetään apuliike-kuormiin → F-1:n taustasyy.
- **Korjaus:** vaatii oman handoffin (e1RM-source-of-truth-konsolidointi; arvio: apuliike-fallback → `computeMovementE1RMBest`; movementCfg/peakingConfig-synkronointi).

### F-4 — variantLoadModifier-epäsymmetria  ⚠️ AVOIN (pieni)
- **Oire:** workout-flow applioi `variantLoadModifier`:n `resolvedLoadKg`:hen (`index.html:12880`), Koti-dashboard EI (`4456-4476`). → sama back-off/secondary-slotti voi näyttää eri kuorman dashboardissa vs livessä jos variantilla on modifier ≠ 0.
- **Korjaus:** pieni — applioi sama modifier dashboard-renderissä TAI poista molemmista (jos modifier on aina ~0 streetliftingissä, matala prioriteetti).
- **Huom:** F-1:n korjaus tuo apuliikkeen samaan haaraan → varmista modifier-yhtenäisyys samalla.

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

## 4. Sulkeutumis-roadmap

**Priorisointi (suositus):**

1. **F-1 (Koti-dashboard-apuliike) — VÄLITÖN.** Pieni, hyvin ymmärretty, **täydentää juuri shipatun OBS-035+037:n** (muuten dashboard ~65 ≠ live ~29 jää näkyviin). Korjaus: `index.html:4477` lukee ensin `slot.resolvedLoadKg`. Sama gate-laajennus kuin 12875. + F-4 variantLoadModifier samalla. → uusi pieni handoff TAI OBS-035+037-jatko-committi (ratifioitava: muuttaa dashboard-näyttöä; ei bittitarkka pilotille koska dashboard ei ole pilotissa).
2. **F-2 (rate-limit×back-off) — OMA HANDOFF.** `stash@{0}` valmiina. Valmennuspäätös + ripple-tutkinta.
3. **F-3 (e1RM-persistenssi) — OMA HANDOFF (laaja).** e1RM-source-of-truth-konsolidointi. F-1:n taustasyy; jos F-3 ratkaistaan (apuliike-fallback → computeMovementE1RMBest), F-1 sulkeutuu rakenteellisesti.
4. **F-4 (variantLoadModifier) — niputettava F-1:een.**

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
