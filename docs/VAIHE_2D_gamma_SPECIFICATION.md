# VAIHE_2D_gamma_SPECIFICATION.md

**LeVe AI v4.49.0 — Track B Vaihe 2D-γ**
**6 edistynyttä metodologiaa (Westside / GZCL J&T 2.0 / Sheiko-derived / RP Minimalist / Smolov Jr / Coan-Phillipi)**

- **Versio:** v1.0
- **Päivätty:** 2026-05-12
- **Branchi:** `claude/wizard-2d-gamma`
- **Edellinen vaihe:** 2D-β (commit ff4d754, klassiset Wendler/TSB/Madcow + AMRAP)
- **Tutkimusdokumentit:**
  - docs/VAIHE_2D_GAMMA_OSA1_RESEARCH_VERIFICATION.md (Westside/GZCL/Sheiko)
  - docs/VAIHE_2D_GAMMA_OSA2_RESEARCH_VERIFICATION.md (RP/Smolov/Coan-Phillipi)
- **Seuraava vaihe:** 2D-δ (adaptive multi-suggestion UI + hybrid-yhdistelmät, ~30h)

---

## 1. Tavoite

Lisätä **6 edistynyttä metodologiaa** PROGRAM_STYLES-rekisteriin:
- **Westside Conjugate** (WSBB-OFFICIAL + Simmons 2011 PDF)
- **GZCL Jacked & Tan 2.0** (EMPIRINEN-blogi Lefever 2012/2016)
- **Sheiko #29-derived** (EMPIRINEN-yhteisökopio + "SHEIKO-DERIVED" -leima)
- **RP Minimalist** (DOKUMENTOITU RP-blogi Israetel 2017+)
- **Smolov Jr** (DOKUMENTOITU yhteisö — kanoninen 13 vk EI suositella)
- **Coan-Phillipi** (DOKUMENTOITU Mark Phillipi -alkuperäisessee — 10 vk + meet vk 11, EI 12 vk)

Lisäksi: **Liikepankin laajennus 10 uudella liikkeellä** (Floor/Pin/JM press, Rack pull, GHR, Hyperextensio, Dumbbell fly, Power shrug, Wide-grip + Long pause bench).

---

## 2. Kattavuus

### Ennen 2D-γ:tä — 11 tyyliä (1 multi + 10 single)
### 2D-γ jälkeen — **17 tyyliä** (1 multi + **16 single**)

| # | styleId | Native vk | Goal-key | Skeleton-factory | Tutkimusstatus |
|---|---------|-----------|----------|-----------------|----------------|
| 1-11 | (2D-α/β tyylit) | 2-12 | (eri) | (eri) | (eri) |
| 12 | **`single-westside-conjugate`** | **4** | **westsideConjugate** | **createWestsideConjugateMesocycle (UUSI)** | WSBB-OFFICIAL + KIRJA-VIITATTU |
| 13 | **`single-gzcl-jt20`** | **12 (lukko)** | **gzclJT20** | **createGZCLMesocycle (UUSI)** | EMPIRINEN-blogi |
| 14 | **`single-sheiko-derived`** | **4** | **sheikoDerived** | **createSheikoDerivedMesocycle (UUSI)** | EMPIRINEN-yhteisökopio + SHEIKO-DERIVED |
| 15 | **`single-minimalist-rp`** | **4** | **minimalistRP** | **createMinimalistRPMesocycle (UUSI)** | DOKUMENTOITU RP-blogi |
| 16 | **`single-smolov-jr`** | **4** | **smolovJr** | **createSmolovJrMesocycle (UUSI)** | DOKUMENTOITU yhteisö |
| 17 | **`single-coan-phillipi`** | **11 (lukko)** | **coanPhillipi** | **createCoanPhillipiMesocycle (UUSI)** | DOKUMENTOITU Mark Phillipi -essee |

---

## 3. Arkkitehtuurimuutokset

### 3.1 data.js (+~700 LoC)

#### Uusi: 6 skeleton-factoria

**createWestsideConjugateMesocycle(startDateISO)** — 4 vk, 4 päivää/vk (ME-Lower/ME-Upper/DE-Lower/DE-Upper)
- ME-rotaatio viikkokohtainen advanced-tasolla (4 vk = 4 eri ME-liikettä)
- ME-Lower: Box squat → Good morning (3RM) → Deficit DL → Front squat
- ME-Upper: Floor press → Pin press → Close-grip bench → Lisäpainodippi (raw-streetlifting-substituutio)
- DE-Lower: 10×2 @ 50/55/60% (raw Malli A) + DE-DL 6×1 @ 70%
- DE-Upper: 9×3 @ 50-60% (3 tartuntaa × 3 sarjaa)
- Apuliikkeet: GHR + Hyperextensio + JM press + lat-volyymi
- `_programMeta`: WSBB-OFFICIAL, streetlifting-laajennus-varoitus

**createGZCLMesocycle(startDateISO)** — 12 vk = 2× 6vk blokkia, 4 päivää/vk
- T1/T2/T3 -tier-rakenne: T1 RM-target laskee 10→8→6→4→2→1 (vk 6 = 1RM-testi)
- T2 drop-set @ 67.5/70/72.5/75/78.5% TM
- T3 3×15+ AMRAP-cap-vapaa
- Päivät: Squat / Bench / Deadlift / OHP (4 päivää/vk)
- `_programMeta`: vk 7-12 PENDING (Lefever Boostcamp-appi)

**createSheikoDerivedMesocycle(startDateISO)** — 4 vk, 3 päivää/vk
- Klassinen Sheiko #29 pyramidi: squat 2×, bench 3×, DL 1×
- Max-intensiteetti nousee vk1 75% → vk3 85%, vk4 deload 70%
- **Streetlifting-laajennus**: Ke päivä accessory = lisäpaino-dippi 5×5, Pe päivä accessory = lisäpaino-leuka 5×5 (**SHEIKO-DERIVED LAAJENNUS**, ei kanoninen)
- `_programMeta`: volumeRiskWarning + streetliftingExtensionWarning

**createMinimalistRPMesocycle(startDateISO)** — 4 vk, 3 päivää/vk (push/pull/legs)
- Sets-first-progressio: vk1=2 sarjaa, vk2=3, vk3=4, vk4=deload 1 sarja
- RIR-target: vk1-2 = 1, vk3 = 0 (lähellä failurea), vk4 = 4 (deload)
- Liikkeet per päivä: 4 liikettä × varying-sarjat (RP "minimalist" -tyyppisesti)
- `_programMeta`: streetliftingApplicabilityWarning (1RM-spesialisaatio on volyymilandmarkin ulkopuolella)

**createSmolovJrMesocycle(startDateISO)** — 4 vk = 3 vk + 1 lepoviikko/1RM-testi
- Day 1 6×6@70%, Day 2 7×5@75%, Day 3 8×4@80%, Day 4 10×3@85%
- Vk-kerroin: vk1 = 1.0, vk2 = +2.5%, vk3 = +5%
- Vk4 = 1 sessio (1RM-testi)
- Training max hard-cap 95% (load_pct ≤ 0.95)
- `_programMeta`: trainingMaxCapPct 0.90, mandatoryConditions (ei kanoninen 13 vk Smolov)

**createCoanPhillipiMesocycle(startDateISO)** — **11 vk** (10 vk + meet vk 11)
- 1 päivä/vk DL-spec ("Desired 1RM" = current + 9-18 kg)
- Vk-taulukko per Mark Phillipi alkuperäisessee:
  - Vk1: 75%×2, vk5: 80%×3×3 (ainoa moni-työsarjainen), vk10: 100%×1, vk11: MEET
- Speed-work vk1: 60% × 8×3, vk10: 60% × 2×3
- Assistance: vk1-4 circuit (Romanian DL + Penkkiveto + Ylätalja + Good morning), vk5+ power shrugs + RDL + BB row, vk10 = ei assistance
- `_programMeta`: taskCorrections (10+1 vk EI 12, Mark Phillipi EI "Karl", oma essee EI Marty Gallagher)

#### Laajennettu: GOAL_SKELETONS + GOAL_NATIVE_WEEKS + MESOCYCLE_TEMPLATES + module-exportit
6 uutta goal-mappausta. Lukot: `gzclJT20: 12`, `coanPhillipi: 11`. Muut 4 vk natiivi (Westside, Sheiko-derived, RP Minimalist, Smolov Jr).

### 3.2 Liikepankki (+10 liikettä)

**Lisätty data.js DEFAULT_MOVEMENTS + wizard fallback-pankki:**
1. Floor press (horisontaalityöntö) — WSBB ME-Upper
2. Pin press (horisontaalityöntö) — WSBB ME-Upper
3. JM press (horisontaalityöntö) — WSBB tricep-specialty
4. Wide-grip bench (horisontaalityöntö) — GZCL T2
5. Long pause bench (horisontaalityöntö) — GZCL T2
6. Rack pull (alaraaja) — WSBB ME-Lower lockout
7. Glute-Ham Raise (alaraaja) — WSBB kanoninen apuliike
8. Hyperextensio (core) — Reverse hyper proxy + Sheiko accessory
9. Dumbbell fly (horisontaalityöntö) — Sheiko #29 KAIKILLA päivillä
10. Power shrug (muu) — Coan-Phillipi vk 5+ keskeinen accessory

HowTo-tekstit lisätty kaikille 10:lle (suomenkielinen + cue).

### 3.3 wizard-2b-mapper.js (+~300 LoC)

#### Laajennettu: PROGRAM_STYLES (11 → 17)
6 uutta merkintää täydellä metadatalla.

#### Laajennettu: pickProgramStyle (11 → 17 kandidaattia)

**Westside Conjugate -pisteytys:**
- isMaxGoal → +30, q12=powerlifting → +25
- isAdvancedPlus → +25 (vaaditaan), beginner/intermediate → −20
- daysPerWeek=4 → +10, <4 → −15
- recent=peaking/deload → −10

**GZCL J&T 2.0 -pisteytys:**
- isMaxGoal/isGenStrength → +30
- isIntermPlus → +20 (LSAMRAP-tarkkuus), beginner → −10
- q23=MAV → +10
- daysUntilTarget < 84 (12 vk) → −15
- recent=off_program/deload → +10

**Sheiko-derived -pisteytys:**
- q12=powerlifting → +35, isMaxGoal → +15
- q23=MRV → +20, MEV → −15
- isAdvancedPlus → +10, beginner → −15
- q09=streetlifting → −10 (SHEIKO-DERIVED-laajennus)
- cutAggressive → −20

**RP Minimalist -pisteytys:**
- isHypGoal → +40 (suoraan kohdistettu), q13=hypertrophy → +20, isMaxGoal → −15
- volPref=MAV/MRV → +15
- cutAggressive → −10

**Smolov Jr -pisteytys:**
- isMaxGoal + isAdvancedPlus → +25, isMaxGoal alone → +10
- beginner/intermediate → −25 (jännerakenne-riski)
- cutAggressive → −25 (vaarallinen yhdistelmä)
- recent=peaking/deload → −15

**Coan-Phillipi -pisteytys:**
- q12=powerlifting → +30, isMaxGoal → +15
- kisapäivä 70-84 pv (~10-12 vk) → +25 osuu kalenteriin
- kisapäivä <70 tai >91 pv → −10
- isAdvancedPlus → +10 (Desired 1RM vaatii realismia)
- q09=streetlifting → −15 (COAN-PHILLIPI-DERIVED)

#### Laajennettu: PROGRAM_STYLE_NATIVE_WEEKS-lukko
Lisätty `gzclJT20: 12, coanPhillipi: 11` siirtyma/palautuminen/madcow5x5-rinnalle.

#### Bug-korjaus: Siirtymä-boost deload-recent -tilanteessa
+40 → +60 deload-recent → siirtymä jää top-3:een 17 tyylistä huolimatta.

#### Päivitetty: MAPPER_VERSION
"2D-beta-v1.0" → "2D-gamma-v1.0"

---

## 4. Tutkimuspohja per metodologia (status-attribuutiot)

| Metodologia | Korkein status | Source-merkintä rules-arrayssä |
|-------------|---------------|--------------------------------|
| Westside Conjugate | WSBB-OFFICIAL + KIRJA-VIITATTU | "Simmons 2007 + WSBB-blogit (2018-2025)" |
| GZCL J&T 2.0 | EMPIRINEN-blogi | "Lefever 2016 J&T 2.0 -blogi" |
| Sheiko-derived | EMPIRINEN-yhteisökopio + SHEIKO-DERIVED | "Sheiko #29 (yhteisökopio); Boris Sheiko 2018 kirja EI luettu" |
| RP Minimalist | DOKUMENTOITU RP-blogi | "Israetel RP-blogi 2017+; 'Effective reps' on Beardsleyn (~2017)" |
| Smolov Jr | DOKUMENTOITU yhteisö | "Smolov Jr -yhteisömukautus (Tsatsouline-välitysketju)" |
| Coan-Phillipi | DOKUMENTOITU Mark Phillipi -essee | "Mark Phillipi -alkuperäisessee (powerpage.net mirror); 10+1 vk, EI 12 vk" |

**Kriittiset fabrikointi-blokit (tutkimusdokumenteista):**
1. ✅ Coan-Phillipi on 10+1 vk, EI 12 vk
2. ✅ Mark Phillipi (EI "Karl Phillipi")
3. ✅ Mark Phillipi -oma essee (EI Marty Gallagher dokumentaationa)
4. ✅ Smolov Intro-luvut korjattu Tsatsoulinen kanoniin
5. ✅ "Effective reps" on Beardsleyn (~2017), EI Israetelin
6. ✅ "Greg Nuckols MM Method" termi ei käytössä (jo 2D-β:ssä korjattu)
7. ✅ Madcow +2.5/+5 lb/vk EI käytetä (2D-β:ssä korjattu)
8. ✅ Sheiko leuka/dippi-laajennus eksplisiittisesti merkitty "SHEIKO-DERIVED LAAJENNUS"

---

## 5. Self-tests (selfTestMapper)

**237/237 testiä PASS** (214 → 237, +23 uutta 2D-γ-testiä):
- PROGRAM_STYLES rakenne (7 testiä): 17 tyyliä, 6 uutta goalia, GZCL=12 vk, Coan-Phillipi=11 vk
- pickProgramStyle pisteytys (10 testiä):
  - Westside: advanced+max+4pv → confidence > 50 ✓
  - Westside: beginner → confidence < 30 ✓
  - GZCL: advanced+general → > 50 ✓
  - GZCL: kisapäivä < 12 vk → < 50 ✓
  - Sheiko: powerlifting + MRV → > 50 ✓
  - Sheiko: streetlifting → rationale mainitsee SHEIKO-DERIVED ✓
  - RP Minimalist: hypertrofia → > 50 ✓
  - Smolov Jr: advanced+max → > 20 ✓
  - Smolov Jr: cut → < 25 ✓
  - Coan-Phillipi: kisa 77 pv + powerlifting → > 50 ✓
- mapWizardToMesocycle (6 testiä): 6 uutta tyyliä pakottavat oikean goalin + weekCountin
- mapWizardToProgram dispatcher (3 testiä): kaikki 6 uutta tyyliä reitittyvät oikein

---

## 6. Engine-verifiointi selaimessa (Akseli/Powerlifter/Bodybuilder)

### Akseli-profiili (elite + max_1RM + streetlifting + vara_calibrated)
| # | Tyyli | Confidence |
|---|-------|------------|
| 1 | single-maksimivoima | 65% |
| 1 | single-wendler531 | 65% (tasapeli) |
| 1 | single-westside-conjugate | 65% (tasapeli) |
| 4 | single-gzcl-jt20 | 60% |
| 5 | single-eksentrinen | 50% |

→ Akseli saa **5 vertailukelpoista vaihtoehtoa** voimanostosta + Westside-rotaatioon.

### Powerlifter-profiili (advanced + powerlifting + MRV + 4 päivää/vk)
| # | Tyyli | Confidence |
|---|-------|------------|
| 1 | single-maksimivoima | 65% |
| 1 | single-westside-conjugate | 65% |
| 1 | single-sheiko-derived | 65% (tasapeli) |
| 4 | single-wendler531 | 60% |
| 5 | single-eksentrinen | 50% |

→ **Sheiko nousee top-3:een MRV-volyymipreferenssillä** kuten odotettiin.

### Bodybuilder-profiili (intermediate + hypertrophy + 3 päivää/vk)
| # | Tyyli | Confidence |
|---|-------|------------|
| 1 | single-hypertrofia | 55% |
| 1 | single-madcow-5x5 | 55% |
| 1 | single-minimalist-rp | 55% (tasapeli) |
| 4 | single-dup | 45% |
| 5 | single-gzcl-jt20 | 40% |

→ **RP Minimalist nousee top-3:een hypertrofia-fokusessa** kuten odotettiin.

### Skeleton-rakenne-validointi
| Skeleton | weekCount | Päiviä/vk | Slots/päivä | Erityispiirteet |
|----------|-----------|-----------|-------------|------------------|
| Westside | 4 | 4 | 4 | ME-rotaatio viikoittain ✓ |
| GZCL J&T 2.0 | 12 | 4 | 3 (T1+T2+T3) | RM-target 10→1 sykli ✓ |
| Sheiko | 4 | 3 | 6 (multi-lift) | SHEIKO-DERIVED leuka/dippi 5×5 ✓ |
| RP Minimalist | 4 | 3 | 4-5 | Sets-first MEV→MAV progressio ✓ |
| Smolov Jr | 4 | 4 (3 vk) + 1 (vk4) | 2 | TM cap 0.95 ✓ |
| Coan-Phillipi | 11 | 1 | 5-9 | Vk 11 = MEET ✓ |

---

## 7. Akseptanssikriteerit 2D-γ:lle

| # | Kriteeri | Status |
|---|----------|--------|
| K1 | 6 uutta skeleton-factoria koodattu | ✅ |
| K2 | Liikepankki +10 liikettä (Floor/Pin/JM press, Rack pull, GHR, Hyperextensio, Dumbbell fly, Power shrug, Wide-grip + Long pause bench) | ✅ |
| K3 | PROGRAM_STYLES 11 → 17 tyyliä | ✅ |
| K4 | pickProgramStyle pisteyttää kaikki 17 tyyliä loogisesti | ✅ |
| K5 | mapWizardToMesocycle(selectedStyleId) toimii 6 uudelle tyylille | ✅ |
| K6 | Self-tests 237/237 PASS | ✅ |
| K7 | Coan-Phillipi 10+1 vk (EI 12 vk) | ✅ |
| K8 | GZCL J&T 2.0 12 vk natiivipituus-lukko | ✅ |
| K9 | Smolov Jr training max hard-cap 95% (turvaa elite-lifteriltä) | ✅ |
| K10 | Sheiko-DERIVED-leima eksplisiittinen (leuka/dippi 5×5 ei kanoninen) | ✅ |
| K11 | Akseli-profiili saa 5 vertailukelpoista vaihtoehtoa selaimessa | ✅ |
| K12 | Powerlifter-profiili → Sheiko top-3 (MRV-preferenssi) | ✅ |
| K13 | Bodybuilder-profiili → RP Minimalist top-3 (hypertrofia-fokus) | ✅ |
| K14 | Fabrikointi-tarkistus: 8 riskiä blokattu | ✅ |
| K15 | APP_VERSION v4.48.0 → v4.49.0 | ✅ |

---

## 8. Riskit + niiden lieventäminen

| Riski | Lieventäminen |
|-------|---------------|
| Westside on equipped-PL → raw-mukautus = "WESTSIDE-DERIVED" | _programMeta.streetliftingExtensionWarning + UI-disclaimer |
| GZCL vk 7-12 tarkat %:t PENDING (Lefever Boostcamp-app) | Yhteisön konservatiivinen mukautus + PENDING-tagi |
| Sheiko on EKSKLUSIIVISESTI SBD → leuka/dippi-laajennus = SHEIKO-DERIVED | _programMeta + slot-notes "SHEIKO-DERIVED LAAJENNUS" |
| Smolov 13 vk on KONTRAINDIKOITU advanced streetlifting-lifterille | EI implementoitu — vain Smolov Jr (3 vk + 1 lepoviikko) + mandatoryConditions |
| Coan-Phillipi DL-spesifi → streetlifting-mukautus = COAN-PHILLIPI-DERIVED | _programMeta-warning + speed-volyymin reduktio-ohje |
| Mark Phillipi -essee URL kuollut → vain mirror-versiot | yhteisökonsensus 4 mirrorissa = riittävä |
| RP volume landmarks EI peer-reviewed | _programMeta.status "DOKUMENTOITU (ei VERIFIOITU peer-reviewed)" |

---

## 9. Metadata

- **Tutkimuspäivä:** 2026-05-12 (käyttäjän erilliskonversaatiot Osa 1 + Osa 2)
- **Tutkimusdokumentit:** docs/VAIHE_2D_GAMMA_OSA1_RESEARCH_VERIFICATION.md + OSA2_RESEARCH_VERIFICATION.md
- **Self-tests:** 237/237 PASS (+23 uutta 2D-γ-testiä)
- **Engine-verifiointi:** mapperVersion 2D-gamma-v1.0, 17 PROGRAM_STYLES, 6 skeleton-factory:t kaikki rakenteellisesti validi
- **Sovellusversio:** v4.48.0 → v4.49.0
- **Mapper-versio:** "2D-beta-v1.0" → "2D-gamma-v1.0"
- **PROGRAM_BUILD_VERSION:** v4.38.9 (ei muutosta — auto-rebuild EI laukea)
- **Negatiiviset löydökset (säilyy 2D-β:stä):** Westside/GZCL/Sheiko/RP/Smolov/Coan-Phillipi PubMed RCT: n=0 kaikki
