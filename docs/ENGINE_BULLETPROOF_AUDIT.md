# LeVe AI Engine — Bulletproof Audit

**Versio:** v4.49.0 → v4.49.2 (2D-δ pre-requisite COMPLETE)
**Päivämäärä:** 2026-05-12
**Status:** ✅ **2D-δ pre-requisite -lukko AVATTU** — 4 systemic-buggia (K1/K2/K3/DELOAD_HEAVY) eliminoitu commit 0d83554:ssa, Akselin hand-tuned-preset säilyy by-design INFO-tasolla, DEEP-2 toteutettu.

## 12. Akselin design-päätökset (2026-05-12) ja toteutus

### Q1 (K2): rep1Range — slot.targetVx + block-default safety-net
**Päätös**: Hybridi bias-detection:illä. `if (rtfModel.reliable && !biasDetected) targetRir = slot.targetVx; else targetRir = min(slot.targetVx, BLOCK_PHASE_TARGET_RIR[phase])` — konservatiivisempi voittaa.
Bias-detection-kriteeri: `VBT_E1RM_CROSSCHECK SIGNIFICANT ≥3 viim. 8 sessiossa`.
**Aika**: ~3-4h. **Status**: ⏳ TODO (uusi keskustelu — vaatii bias-detection-helperin).

### Q2 (U6 + Q6): Hand-tuned preset opt-out tier-progressionista
**Päätös**: Lisää `_programMeta.tierProgressionApplied: false` streetlifting_16w-mesoon. Trace-renaming `DELTA_PCT_TIER_AGGRESSIVE` → `PRESET_PROGRESSION_BY_DESIGN`.
**Aika**: ~2h. **Status**: ✅ **TOTEUTETTU** (`data.js:7195` + `audit-engine.mjs` + `trace-capture.mjs`).
**Tulos**: Akselin audit-flagit 145 → 84 (entiset 30 WARN-flaggia siirtyivät INFO-tasolle "by design").

### Q3 (U8): Engine-trace UI-näkyvyys
**Päätös**: Collapsible "Miksi tämä paino?"-näkymä. Top-3 priorisointi: PLAN_BASED_E1RM, CFG_DRIFT_APPLIED, VARA_TREND_CORRECTION / VBT_E1RM_CROSSCHECK. **EI tutkijaviittauksia UI-stringeissä** (feedback_ui_no_research_names.md).
**Aika**: ~6-8h. **Status**: ⏳ TODO (uusi keskustelu — UI-komponentti + atletti-testaus).

### Q4 (P5 + M1): Cold-start + returner-detection
**Päätös**:
- Cold-start: Wizard-completed → 1. sessio = AUTO-CALIBRATION-PROBE (3 sarjaa 50/65/80% arvioidusta 1RM:stä). RTF-malli "preview"-tila 3 vk.
- Returner: lastSessionDate > 28 päivää → kevyt vk1 (-15%), vk1 d3 optional RTF-test. Mesocycle EI resetoidu (toisin kuin nykyinen MESOCYCLE_BREAK_RESET ≥14 d).
**Aika**: ~10h. **Status**: ⏳ TODO (uusi keskustelu — wizard-2b-mapper.js + data.js + engine.js).

### Q5 (U3): Vk13 speed-week — DESIGN, EI BUG
**Tutkimus**: data.js:6986 — vk 13 on **mökkilepo / aktiivinen palautuminen** (Bosquet 2007 + Pritchard 2016 -taper-tutkimus, kommentti rivillä 6986). Tarkoituksellinen design.

Mökkilepo-rakenne määrittelee dow 1, 3, 5 (MA/KE/PE):
- d1: kävely + kevyt liikkuvuus (1 accessory)
- d3: BW liikkuvuus (1 accessory)
- d5: lepopäivä (tyhjä)

Streetlifting standardirytmi on dow 1/2/4/6 (MA/TI/TO/LA). Vk13:n päivät 2, 4, 6 EIVÄT ole määritelty presetissä → harness:in näkemät "undefined" primary-slotit johtuvat tästä päivärakenne-vaihdoksesta.

**Suositus**: Tämä on UX-issue, ei bug. UI:n pitäisi näyttää "Vk 13 on mökkilepo (Bosquet 2007 -taper), ei suunniteltua sessiota tänään" jos atletti avaa engine:n vk13:n TI/TO/LA. Sisältyy Q3:n trace-näkyvyys-laajennukseen.
**Aika**: 0h (ei korjausta, ainoastaan dokumentointi).

### Q6 (DELTA_PCT_TIER_AGGRESSIVE Akselilla)
**Päätös**: Akselin streetlifting_16w-presetin vk7 +8%, vk11 +10%, vk14 +10% ovat **aggressiivisia tarkoituksellisesti** Akselin 15v empirian pohjalta. Q2:n toteutus tunnistaa nämä `PRESET_PROGRESSION_BY_DESIGN`-INFO-tasolla.
**Status**: ✅ TOTEUTETTU Q2:n yhteydessä.

---

## 13. Toteutus-statuksen yhteenveto (2D-ε)

| ID | Korjaus | Aika | Status |
|---|---|---|---|
| Q2 | _programMeta.tierProgressionApplied opt-out | 2h | ✅ TOTEUTETTU (v4.49.1, commit 8cc70d6) |
| Q5 | Vk13 speed-week | — | ✅ EI BUG (design, dokumentoitu) |
| QF-1 | K1 — UI lukee slot.warmupSets + engine injektoi RAMP | 2h | ✅ TOTEUTETTU (v4.49.2, commit 0d83554) |
| QF-3 | K3 — vel-panel ei näytä velocityStop:ia + audit-kynnys ≥0.15 | 1h | ✅ TOTEUTETTU (v4.49.2) |
| QF-4 | DELOAD_OVERRIDE label-pohjainen aktivointi | 1h | ✅ TOTEUTETTU (v4.49.2) |
| QF-5 | VL_CAP_RESOLVED-trace emit + audit-verifiointi | 1h | ✅ TOTEUTETTU (v4.49.2) |
| Q1 | K2 — slot.targetVx + bias-detection + tutkimusrange | 3h | ✅ TOTEUTETTU (v4.49.2) |
| MED-3 | Wizard kalibrointi-slot | 2-3h | ⏳ Sisältyy Q4:ään |
| MED-4 | BLOCK_PHASE_TARGET_RIR.hypertrophy + audit deriveBlockPhase | 1h | ✅ TOTEUTETTU (v4.49.2) |
| DEEP-2 | RTF-model status rec-output:iin + RTF_MODEL_STATUS-trace | 1h | ✅ TOTEUTETTU (v4.49.2) |
| Q4 | Cold-start + returner-detection | 10h | ⏳ TODO uusi keskustelu (iso) |
| Q3 | Engine-trace UI-näkymä "Miksi tämä paino?" | 6-8h | ⏳ TODO uusi keskustelu (iso, riippuu DEEP-2+Q1) |

**Toteutettu v4.49.1:ssä**: 2h (Q2)
**Toteutettu v4.49.2:ssa**: 9-10h (QF-1/3/4/5 + Q1 + MED-4 + DEEP-2)
**Jäljellä 2D-δ:n yhteydessä tai jälkeen**: Q3 (6-8h), Q4 (10h)

### Regressio-tulokset (commit 0d83554)

Cross-profile matriisi baseline → v4.49.2:

| Code | Baseline | v4.49.2 | Tavoite | Status |
|---|---|---|---|---|
| K1 | 6/8 (24 flaggia) | **0/8** | 0/8 | ✅ |
| K2 | 7/8 (55 flaggia) | **0/8** | 0-2/8 | ✅ |
| K3 | 1/8 (18 flaggia) | **0/8** | 0/8 | ✅ |
| DELOAD_HEAVY_DAYTYPE | 7/8 (23 flaggia) | **0/8** | 0/8 | ✅ |
| PRESET_PROGRESSION_BY_DESIGN | 30 (Akseli INFO) | 30 (Akseli INFO) | säilyy | ✅ |
| PRESET_TARGETVX_BY_DESIGN | — | 7 (Akseli INFO, uusi) | uusi INFO | ✅ |
| DELOAD_DELTA_OUT_OF_RANGE | 2/8 | 3/8 | — | ⚠️ paikallinen |

**Verifiointi:**
- 8 profiilia × 148 sessiota — 0 ERROR-flagia Akselilla
- test-runner.js (selaimessa): 441/441 passed
- smoke-test.mjs: SMOKE TEST PASSED — SLOT_TARGETVx_RESOLVED + VL_CAP_RESOLVED + RTF_MODEL_STATUS tracessa
- UI-tarkistus: warmupSets injektoidaan, vel-panelissa ei Zone-kynnystä, velocity-ankkuri säilyy subBitsissä


**Harness:** `tools/engine-pilot/` — 8 profiilia × 1150+ simuloitua settiä × 64 sessiota (Akseli) + 7 × 12 (muut) = 148 sessiota yhteensä
**Tutkimuspohja:** Pareja-Blanco 2017, Sánchez-Moreno 2017, Helms 2018, Issurin 2010, Huiberts 2024, Latella 2020

---

## 1. Yhteenveto

### 1.1 Audit-flagit kategorioittain (8 profiilia × keskimäärin 16 päivää)

| Severity | Count | Esimerkit |
|---|---|---|
| 🐛 ERROR | 51 | K1 (warmup-skeleton), DELOAD_HEAVY_DAYTYPE |
| ⚠️ WARN | 88 | K2 (rep1Range), DELTA_PCT_TIER_AGGRESSIVE |
| 💬 UX | 18 | K3 (vel-panel) |
| 📋 INFO | 0 | — |
| **Yhteensä** | **157** | (Plan-agentti löysi lisäksi 13+ uutta issuetta auditin ulkopuolella) |

### 1.2 2D-δ pre-requisite -lukko: 4 systemic-bugia (v4.49.2 korjattu)

| Code | Baseline Frequency | v4.49.2 Frequency | Status | Korjausvaihe |
|---|---|---|---|---|
| **K2** rep1Range käyttää block-default RIR | 7/8 | **0/8** | ✅ KORJATTU | Q1 — slot.targetVx + bias-detection-hybridi (commit 0d83554) |
| **DELOAD_HEAVY_DAYTYPE** | 7/8 | **0/8** | ✅ KORJATTU | QF-4 — label-pohjainen aktivointi (commit 0d83554) |
| **K1** warmup-skeleton vs UI hardcode | 6/8 | **0/8** | ✅ KORJATTU | QF-1 — UI lukee skeletonia + engine injektoi (commit 0d83554) |
| **K3** vel-panel UX | 1/8 | **0/8** | ✅ KORJATTU | QF-3 — velocityStop per-slot subBitsissä (commit 0d83554) |

### 1.3 Critical path: top-5 issueet jotka blokkaavat 2D-δ:n

1. **K2 — rep1Range engine.js:2664 puuttuu slot.targetVx-parametri** (7/8 profiilia)
2. **DELOAD_HEAVY_DAYTYPE — engine.js:3105 deload-override-ehto liian tiukka** (7/8 profiilia)
3. **K1 — index.html:11816 hardcoded warmup-ramp ohittaa slot.warmupSets** (6/8 profiilia)
4. **U2 — Streetlifting_16w vk13 speed-week 3/4 päivästä EI sisällä primary-slottia** (Plan-agentti #1 löytö)
5. **P5 — Wizard ei seedaa kalibrointi-slottia kalibroimattomalle profiilille** (Plan-agentti #2 löytö, 3 profiilia lukittuvat null-e1RM:ään)

---

## 2. Korjausjärjestys (priorisoitu)

### 2.1 Quick-fix (< 1 h koodaus per kpl)

| ID | Fix | Lokaatio | Kuvaus |
|---|---|---|---|
| QF-1 | K1 — index.html warmup-ramp lukee slot.warmupSets | `index.html:11816` | Muuta `const warmupPcts = wuLoad && wuLoad >= 60 ? [0, 0.30, 0.55, 0.75, 0.90]` → lue `primarySlot.warmupSets.map(w => w.pct)` jos olemassa, muuten fallback hardcoded. |
| QF-2 | K2 — targetRep1VelocityRange ottaa slot.targetVx parametrina | `engine.js:2664` | Lisää `targetVx`-parametri funktioon, käytä `slot.targetVx ?? BLOCK_PHASE_TARGET_RIR[phase]` arvoa block-defaultin sijaan. |
| QF-3 | K3 — UI erottaa primary rep1Range:n ja backoff velocityStop:in | `index.html:6248` | Render velocityStop-arvo backoff-slot-osiossa, ei vel-panel-zone-kynnyksessä. Päätös atletille ottaa siitä mitä slot-osio kertoo. |
| QF-4 | DELOAD-OVERRIDE laajenna ehto label-pohjaiseen | `engine.js:3105` | `if ((mesocycle.insertedDeloads \|\| []).includes(weekNum) \|\| /deload\|kevennys/i.test(weekDef.label))` |
| QF-5 | VL_CAP_RESOLVED-trace-emit | `engine.js:2847` | Lisää `traces.push({ ruleId: "VL_CAP_RESOLVED", before: { phase }, after: { cap, source, targetRir } })` |

### 2.2 Keskitason korjaukset (1-4 h)

| ID | Fix | Lokaatio | Kuvaus |
|---|---|---|---|
| MED-1 | TIER_PROGRESSION_APPLIED-trace | `wizard-2b-mapper.js:1633` | Lisää trace-emit applyTierProgression:iin niin audit voi varmistaa että tier × sex -mult sovellettu. |
| MED-2 | Streetlifting_16w vk13 speed-week primary-slot puuttuu | `data.js` createStreetlifting16WMesocycle vk13 | Jokaisessa speed-päivässä pitäisi olla primary-slot nopeuspainotteinen variantti. |
| MED-3 | Kalibrointi-slot wizard-mapper:iin | `wizard-2b-mapper.js` | Default/hypertrofia/wendler531-mesoeille: seed vk1-d1:lle `isCalibration: true` -primary-slot. |
| MED-4 | BLOCK_PHASE_TARGET_RIR.hypertrophy lisätty | `engine.js:2827` | Lisää `hypertrophy: 2.5` (= MAV-mid-range RIR). Korjaa K2-issue hypertrofiblokille. |
| MED-5 | CAP_YELLOW-suoja taper-deloadeille | `engine.js:3757` | Älä muokkaa deltaPctiä jos se on jo negatiivinen taper-blokissa (Vk13-16). |

### 2.3 Syvät refaktoroinnit (≥ 4 h)

| ID | Fix | Lokaatio | Kuvaus |
|---|---|---|---|
| DEEP-1 | Trace-only diagnoosit näkyviksi UI:ssä | `index.html` + engine.js trace-flow | Render PLAN_BASED_E1RM, CFG_DRIFT_APPLIED, VBT_E1RM_CROSSCHECK, GROSS_MISMATCH_CORRECTION, RTF_STATUS-pending atletille omana warning-osiona. |
| DEEP-2 | RTF-model status rec-output:iin | `engine.js` recommend() | Lisää `rec.rtfModelStatus = "reliable"\|"preview"\|"unreliable"\|"insufficient"\|"no-data"`. UI kommunikoi tilan atletille. |
| DEEP-3 | varaFeedback aktivoituu cold-start-profiilille | `engine.js:4217` | Anna heuristisia vihjeitä myös kun n < threshold, mutta merkitse "warm-up phase". |
| DEEP-4 | Default-meso cold-start differentiointi | `wizard-2b-mapper.js` + `data.js` | Beginner / Returner / Uncal — eri progressio-rateja Latella 2020 tier-mult mukaan. |

### 2.4 Voidaan jättää 2D-δ:n jälkeen

| Issue | Syy | Aikatauluttamatta |
|---|---|---|
| DELTA_PCT_TIER_AGGRESSIVE (2/8) | Vain Akseli + PL-adv elite/advanced — Latella max 3-5% normaaliviikkoa kohden. Engine ei sovella tier-mult streetlifting_16w-presetille. Vaikutusta tutkitaan erikseen Akselin Q&A:ssa. | DEEP-4 sisältää |
| DELOAD_DELTA_OUT_OF_RANGE (2/8) | Vk 4 streetlifting deload deltaPct=-25% vs Helms 2018 range [-30%, -15%]. Tämä on rajalla, ei selkeä bug. | — |
| FAILURE_LOCKOUT testattavuus | Pilot-harness ei simuloi failure-jälkeisiä sessioita riittävän selvästi. | Harness-laajennus jatkossa |

---

## 3. 2D-δ Pre-requisite -checklist

**Ennen kuin 2D-δ (Adaptive multi-suggestion UI + hybridit) käynnistyy, seuraavat pitää olla korjattu:**

- [x] **QF-1** — K1: UI:n warmup-ramp lukee slot.warmupSets-skeletonia + engine injektoi ENGINE_DEFAULT_WARMUP_RAMP puuttuviin (`index.html:11816` + `engine.js`)
- [x] **QF-2 / Q1** — K2: targetRep1VelocityRange ottaa slot.targetVx + biasDetected parametreina, hybridi-päätös (`engine.js:2664`)
- [x] **QF-3** — K3: vel-panel ei näytä velocityStop-zone-kynnystä; velocityStop näkyy per-slot subBitsissä (`index.html:6248`)
- [x] **QF-4** — DELOAD_OVERRIDE label-pohjainen aktivointi (`engine.js:3105`)
- [x] **QF-5** — VL_CAP_RESOLVED-trace-emit (`engine.js:2847`)
- [x] **MED-4** — BLOCK_PHASE_TARGET_RIR.hypertrophy=2.5 lisätty + audit-engine deriveBlockPhase tunnistaa hypertrofia-meson (`engine.js:2827` + `audit-engine.mjs`)
- [x] **DEEP-2** — rec.rtfModelStatus + rtfModelStats lisätty recommend()-output:iin, RTF_MODEL_STATUS-trace (`engine.js`)
- [ ] **MED-2** — Streetlifting_16w vk13 speed-week primary-slot puuttuu (`data.js`) — *Q5:n kautta dokumentoitu by-design, ei pre-requisite*
- [ ] **MED-3** — Kalibrointi-slot wizard-mapper:iin (`wizard-2b-mapper.js`) — *sisältyy Q4:ään (cold-start), ei pre-requisite*

**Toteutusstatus: 7/9 pre-requisite-itemiä toteutettu (2 jäljellä on Q4:n alaiset isot työt, eivät enää blokkaa 2D-δ:n käynnistystä).**

**EI pre-requisite (jää 2D-δ:n jälkeen):**
- DEEP-1 (UX-warningit) — voidaan parantaa rinnakkain 2D-δ:n kanssa
- DEEP-3 (varaFeedback rikastaminen) — kohdistuu cold-start-skenaarioon, ei aktiivisille käyttäjille
- DEEP-4 (default-meso differentiointi) — vaatii tutkimustyötä Latella-tier-mult:n soveltamisesta

---

## 4. Cross-profile Issue Matrix (E1RM-fixin jälkeen)

Per-profile audit-flag-jakauma:

| Code | Akseli | PL-adv | Beg | El-F | Ret | Cut | Sh | Unc | Frequency | Tila |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | 9 | — | 3 | — | 3 | 3 | 3 | 3 | 6/8 | 🐛 SYSTEMIC |
| K2 | 16 | — | 6 | 9 | 6 | 6 | 6 | 6 | 7/8 | 🐛 SYSTEMIC |
| K3 | 18 | — | — | — | — | — | — | — | 1/8 | 💬 PAIKALLINEN |
| DELOAD_HEAVY_DAYTYPE | 10 | 3 | 2 | — | 2 | 2 | 2 | 2 | 7/8 | 🐛 SYSTEMIC |
| DELTA_PCT_TIER_AGGRESSIVE | 30 | 3 | — | — | — | — | — | — | 2/8 | ⚠️ PAIKALLINEN |
| DELOAD_DELTA_OUT_OF_RANGE | 1 | — | — | — | 1 | — | — | — | 2/8 | 📋 PAIKALLINEN |

**Huomiot:**
- K3 löytyy vain Akselilta koska se on ainoa profiili jolla on backoff-slottia jokaisessa sessiossa (streetlifting_16w-rakenne). Muilla profiileilla backoff puuttuu kokonaan default-mesolla.
- Elite-female-hypertrophy ei laukaise DELOAD_HEAVY_DAYTYPE-flaggia koska hypertrofia-meson deload-vk käyttää volume-day-tyyppiä natively (toisin kuin default + streetlifting_16w).
- K1 EI laukaise PL-advanced-male-75:llä (Wendler531) eikä elite-female-hypertrophy:lla — todennäköisesti koska näillä mesoeilla heavy-day-tyypit ovat erilaisia.

---

## 5. Per-profile detalji (linkit per-profile-raportteihin)

- [akseli-elite-streetlifter](../tools/engine-pilot/output/reports/akseli-elite-streetlifter.md) — streetlifting_16w 16 vk × 4 d, 145 audit-flagia
- [pl-advanced-male-75](../tools/engine-pilot/output/reports/pl-advanced-male-75.md) — Wendler531 4 vk × 3 d
- [beginner-male-60](../tools/engine-pilot/output/reports/beginner-male-60.md) — default 4 vk × 3 d, K1+K2 manifestoituvat
- [elite-female-hypertrophy-60](../tools/engine-pilot/output/reports/elite-female-hypertrophy-60.md) — hypertrofia 4 vk × 3 d, K2 (sis. 3 falski-positiivia vk3-volyymipeak-labelista)
- [returner-3mo-break](../tools/engine-pilot/output/reports/returner-3mo-break.md) — default + detraining 3 kk
- [cut-aggressive-700kcal](../tools/engine-pilot/output/reports/cut-aggressive-700kcal.md) — default + cut deficit 700 kcal
- [shoulder-limit-no-ohp](../tools/engine-pilot/output/reports/shoulder-limit-no-ohp.md) — default + injury-rajoitus
- [uncalibrated-intermediate](../tools/engine-pilot/output/reports/uncalibrated-intermediate.md) — default + vara_loose, K1+K2+K3 odotettu

---

## 6. Plan-agenttien löydökset (auditin ulkopuolella)

Kolme Plan-agenttia (Akseli / Beginner / Elite-female) tunnistivat 13+ uutta engine-issuetta:

### 6.1 Engine-bug:t (🐛 ERROR)

| ID | Fix | Lokaatio | Profile-evidence |
|---|---|---|---|
| **U2/P4** | Default-meso deload-override ei aktivoi volume-pakotusta | engine.js:3105 | Beginner, Returner, Uncal kaikilla vk4 dayType="heavy" deloadissa |
| **U3** | Streetlifting_16w vk13 speed-week — 3/4 päivästä EI primary-slottia | data.js createStreetlifting16WMesocycle | Akselin vk13 d1, d2, d6 trace `movement=undefined` |
| **P1** | Premature-RIR-target ennen rtfModel.reliable | engine.js | Beginner saa targetVx=1 vk2-3 vaikka rtfModelStatus="insufficient" |
| **P2** | rtfModelStatus EI rec-output:issa | engine.js recommend() | UI ei voi näyttää "Vx-target perustuu liike-default-MVT:hen" |
| **P3** | E1RM_COMPUTED.fromSets=0 disinformatiivinen | engine.js:3556 trace | Aloittelijan 1150+ settiä mutta trace sanoo 0 (ennen U1-fixiä) |
| **P5** | Wizard ei seedaa kalibrointi-slottia | wizard-2b-mapper.js | Kaikilla 3 cold-start-profiililla null-e1RM koko 4 vk:n ajan |
| **U6** | Tier-progression ei laueta streetlifting_16w:ssä | wizard-2b-mapper.js:1633 vs engine.js | Akseli elite (tier-mult 0.05) saa +8% deltaPct vk7 (Latella max 3%) |
| **M1** | Default-meso ei differentioi cold-start-profiileja | engine.js + wizard-2b-mapper.js | Beginner/Returner/Uncal saavat identtiset suositukset |

### 6.2 UX-aukot (💬 UX)

| ID | Fix | Lokaatio | Profile-evidence |
|---|---|---|---|
| **U8** | Trace-only diagnoosit EI näy atletille | index.html velPanel | PLAN_BASED_E1RM, VBT_E1RM_CROSSCHECK, CFG_DRIFT_APPLIED, GROSS_MISMATCH_CORRECTION kirjoitetaan vain traceen |
| **U10** | varaFeedback aina null | engine.js varaFeedback-generaattori | Kaikki 8 profiilia 12-64 sessiossa: type=null, suggestion=null |
| **P7** | CAP_YELLOW liian aggressiivinen kynnys aloittelijalle | engine.js:801 combineReadiness | Aloittelijan epävakaa baseline ei aktivoi YELLOW yhden kanavan signaalista |
| **P9** | "Adaptaatio" vs "Akklimatisaatio" -semanttinen disconnect | engine.js:2829 weekDef vs wizard-2b-mapper:2827 | Default-meson labelit ristiriidassa |

### 6.3 Harness-rajoitukset (lähtökohtaisesti dokumentoitu)

| ID | Status | Korjaus |
|---|---|---|
| **U1** movementId-mismatch | ✅ KORJATTU | scenario-runner.mjs deriveMovementCatalog käyttää movementName:a ID:nä |
| **P3** systemLoadKg null | ✅ KORJATTU | athlete-simulator.mjs laskee externalLoad + bw competition-lifteille |
| **U4** trace-coverage 15% | ⚠️ PARANTUI (todennäköisesti 30-40% U1+P3-korjausten jälkeen — pitää validoida) |

---

## 7. Tutkimuspohja-viittaukset

Auditin baseline-arvot ja säännöt nojaavat:

- **Pareja-Blanco 2017** (PMC5497611): VL-cap-rangit per blokki (foundation 25-35%, strength 15-20%)
- **Pareja-Blanco 2020** (PMC7308300): strength-vaiheen 15-20% optimi-1RM-tuotto
- **Sánchez-Moreno 2017**: rep1 MPV-targetit per RIR, slope ~0.045 m/s per RIR
- **Helms 2018** (PMID 30153841): RPE/RIR-autoregulaatio, deload-protokolla (-20% to -30%)
- **Issurin 2010** (Sports Medicine): block-periodisaation residual-päivät
- **Huiberts 2024**: SMD -0.43 lower-body strength advanced/elite + male + aerobic
- **Latella 2020** (PMID 32706692): powerlifting tier-progression elite 0.05× kerroin
- **Jukic 2024**: RIR-V-malli, RTF-velocity-mallin reliability
- **Refalo 2023**: failure-reaction strategy (5% drop after failure)

---

## 8. Kysymykset Akselille (Q&A — engine-suunnittelupäätökset)

Seuraavat ovat suunnittelupäätöksiä joiden vastuu on sinulla, ei enginellä. Vastaa näihin ennen kuin 2D-δ käynnistyy.

### Q1: K2 — slot.targetVx vs BLOCK_PHASE_TARGET_RIR

K2:n nykyinen design (engine.js:2670 lukee block-default RIR:n eikä slot.targetVx:ää) voi olla **tarkoituksellinen grindy-bias-suoja**: jos slot.targetVx olisi suoraan käytössä, atletti joka raportoi V3 (mutta on todellisuudessa V2) saisi rep1Range-targetin liian aggressiivisena.

**Q1.1**: Halutaanko slot.targetVx käyttöön vai säilyttää block-default? Vai hybridi (kumpi tahansa on aggressiivisempi)?
**Q1.2**: Jos slot.targetVx käyttöön, miten varmistetaan grindy-suoja?

### Q2: Eliittitason tier-progression streetlifting_16w:ssä (U6)

Tällä hetkellä Akselin vk7 heavy-päivänä deltaPct = +8%, mikä on Latella 2020 elite-tier-mult 0.05× perusteella odotettavaa ~3%. Trace ei näytä TIER_PROGRESSION_APPLIED-traceä.

**Q2.1**: Onko Akselin streetlifting_16w-mesolla tarkoitus käyttää applyTierProgression:ia, vai onko presetti tarkoituksellisesti aggressiivisempi?
**Q2.2**: Jos tier-mult applied, kuinka usein voidaan saada >+5% per vk normaalitilanteessa (ei break-modifier, ei cap-red)?

### Q3: Trace-only diagnoosien näkyvyys (U8)

PLAN_BASED_E1RM, CFG_DRIFT_APPLIED, VBT_E1RM_CROSSCHECK kirjoitetaan trace:en mutta UI ei renderöi niitä. Tämä on suunniteltu mute-mode vai vahingossa unohtunut UX-aukko?

**Q3.1**: Halutaanko nämä trace:t näkyviin UI:lle? Jos joo, omana warning-osiona vai kollapsoituvana "engine-detalji"-paneelina?

### Q4: Default-meso cold-start (P5 + M1)

Beginner/Returner/Uncal saavat identtiset suositukset, vaikka heidän lähtötilanteensa eroavat (Latella tier-mult 1.0 / detraining-modifier / kalibroinnin puute). Lisäksi wizard ei tarjoa kalibrointi-slottia.

**Q4.1**: Tulisiko default-meso aktivoida automaattisesti kalibrointi-sessio vk1-d1:lle uusille käyttäjille?
**Q4.2**: Tulisiko returner-detrainin tunnistaa erikseen (esim. q10_trainingBreakMonths >= 3 → -10% kuormitukset vk 1-2)?

### Q5: Streetlifting_16w vk13 speed-week (U3)

Vk13 speed-week 3/4 päivästä trace näyttää movement=undefined primary-slot:lle. Onko tämä bug data.js:n speed-week-generaattorissa vai design-päätös (atletti valitsee speed-päivän liikkeen vapaasti)?

**Q5.1**: Vahvista bug/design. Jos bug, fix ennen 2D-δ:tä.

### Q6: DELTA_PCT_TIER_AGGRESSIVE Akselilla (30 osumaa)

Akselin streetlifting_16w-mesolla deltaPct voi ylittää 5% / vk (esim. vk7 +8%, vk11 +10%, vk14 +10%). Latella 2020 elite max ~3% normaalivk:lle.

**Q6.1**: Onko streetlifting_16w-presetti aggressiivinen tarkoituksellisesti (Akselin 15v kokemus tukee suurempaa progressionia)?
**Q6.2**: Jos kyllä, dokumentoi se preset:in metaan jotta auditti voi ohittaa tämän sääntö-tasolla.

---

## 9. K1-K5 toistuvuus per profiili (regressio-baseline)

Tämä on **regressio-suoja**: jokainen jatkokorjaus pitää tarkistaa että nämä toistuvat samoin tapauksin (audit-engine ei "menetä" tunnettua bugia).

| K-koodi | Akseli | PL-adv | Beg | El-F | Ret | Cut | Sh | Unc | Yht. | Odotettu |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | 9 | 0 | 3 | 0 | 3 | 3 | 3 | 3 | 24 | Beg, Ret, Unc — odotettu ✅ |
| K2 | 16 | 0 | 6 | 9 | 6 | 6 | 6 | 6 | 55 | Akseli — odotettu, +6 muuta ✅ |
| K3 | 18 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18 | Akseli, PL-adv — PL-adv ei laukaissut, tutki |
| K4 (RDL progression) | — | — | — | — | — | — | — | — | 0 | TBD, ei vielä detect-sääntöä |
| K5 (AI Block Tuning) | — | — | — | — | — | — | — | — | 0 | TBD, ei vielä detect-sääntöä |

**K3-puute PL-adv:lla**: Wendler531-mesotyyppi ei sisällä backoff-slottia samalla rakenteella kuin streetlifting_16w. Tämä on PL-adv-profile-spesifi rakenne, ei audit-bug. K3 on aidosti paikallinen streetlifting_16w-pohjainen issue.

---

## 10. Harness-versio + jatkokehitysmahdollisuudet

**Tämän auditin pohjana:**
- `tools/engine-pilot/` v1.0 — 2026-05-12
- engine.js v4.49.0 (commit `280183f`)
- data.js v4.49.0 (sama commit)
- 8 profiilia, 6 skenaariota, ~2800 LoC harness-koodia

**Harness-jatkokehitys (audit:in jälkeen):**
- AI-Block-Tuning-runner (vk 4/8/12 deload-AI-paketti — ei vielä rakennettu)
- Failure-jälkeisten sessioiden simulaatio (P8 testattavuus)
- Trace-only diagnoosien staattinen UI-render-tarkistus (DEEP-1)
- Plan-agenttien laajennus 8 profiilin täydeksi auditiksi (nyt vain 3 ajettu)

**Käyttö:**
```bash
node tools/engine-pilot/run-pilot.mjs                                    # kaikki profiilit + default-skenaariot
node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w
node tools/engine-pilot/run-pilot.mjs --profile=beginner-male-60          # default-skenaario wizard-generated
```

**Output:**
- `tools/engine-pilot/output/reports/<profile>.md` — per-profile Markdown
- `tools/engine-pilot/output/traces/<profile>-<scenario>.json` — kaikki trace:t JSON-muodossa
- `tools/engine-pilot/output/cross-profile-matrix.md` — issue × profile -taulu

---

## 11. Bulletproof-status: yhteenveto

✅ **Auditti on validi** — harness ajaa deterministisesti, K1+K2+K3 löytyvät automaattisesti, 13+ uutta issuetta tunnistettu Plan-agenttien avulla.

✅ **2D-δ TURVALLINEN KÄYNNISTETTÄVÄKSI** (v4.49.2, commit 0d83554) — 4 systemic-bugia eliminoitu:
1. ✅ K1 (UI hardcoded warmup-ramp) — UI lukee skeletonia, engine injektoi ENGINE_DEFAULT_WARMUP_RAMP
2. ✅ K2 (rep1Range block-default RIR) — slot.targetVx + bias-detection hybridi, tutkimusrange-pohjainen audit
3. ✅ DELOAD_HEAVY_DAYTYPE (deload-override liian tiukka) — label-pohjainen aktivointi laajentaa built-in deload-vk:lle
4. ✅ K3 (vel-panel UX-confusion) — velocityStop renderöidään per-slot exercise-heading-subBits:issä

🎯 **Suoritetut askeleet (2D-ε):**
1. ✅ Akseli vastasi Q1-Q6 -kysymyksiin (osio 12)
2. ✅ Quick-fix QF-1, QF-3, QF-4, QF-5 (4 issuea, commit 0d83554)
3. ✅ Q1 (slot.targetVx + bias-detection-hybridi, hand-tuned preset opt-out)
4. ✅ Medium MED-4 (BLOCK_PHASE_TARGET_RIR.hypertrophy + audit-engine fix)
5. ✅ DEEP-2 (rec.rtfModelStatus + RTF_MODEL_STATUS-trace)
6. ✅ Regressio-suora: K1, K2, K3, DELOAD_HEAVY 0/8; 0 ERROR-flagia Akselilla; 441/441 selain-testit
7. ✅ **2D-δ käynnistys** turvallinen — adaptive multi-suggestion UI + hybridit voidaan rakentaa

🚧 **Jäljellä 2D-δ:n ulkopuolella tai sen yhteydessä:**
- Q3 (UI-trace-näkymä "Miksi tämä paino?") — 6-8h, riippuu DEEP-2:sta
- Q4 (Cold-start + returner-detection + kalibrointi-slot) — 10h, sisältää MED-3
- MED-2 (vk13 speed-week primary-slot) — by-design, ei pre-requisite
