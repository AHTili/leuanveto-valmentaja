# VAIHE_2D_beta_SPECIFICATION.md

**LeVe AI v4.48.0 — Track B Vaihe 2D-β**
**Klassiset voimanosto-ohjelmat (Wendler/Top-set+Backoff/Madcow) + AMRAP-engine-tuki**

- **Versio:** v1.0
- **Päivätty:** 2026-05-12
- **Branchi:** `claude/wizard-2d-beta`
- **Edellinen vaihe:** 2D-α (commit 9bcbcb4, adaptive multi-suggestion + 7 single-tyyliä)
- **Tutkimuspohja:** docs/VAIHE_2D_BETA_RESEARCH_VERIFICATION.md (2026-05-11)
- **Seuraava vaihe:** 2D-γ (Westside/GZCL/Sheiko/Minimalist/Smolov/Coan-Phillipi, 30–45h)

---

## 1. Tavoite

Lisätä **3 klassista voimanosto-ohjelmaa** PROGRAM_STYLES-rekisteriin:
- Wendler 5/3/1 (PDF-VERIFIOITU T-Nation 2009 ydinprosenttitaulukko)
- Top-set + Backoff (PDF-VERIFIOITU Androulakis-Korakakis 2021 PMC8435792)
- Madcow 5×5 (RISTIINTARKISTETTU yhteisön mukautus Bill Starr 1976 -pohjasta)

Lisäksi: **AMRAP-engine-tuki** (Epley primary, Brzycki vertailu, Reynolds 2006 >10 reps -varoitus).

---

## 2. Kattavuus

### Ennen 2D-β:tä — 8 tyyliä (1 multi + 7 single)
### 2D-β jälkeen — **11 tyyliä** (1 multi + **10 single**)

| # | styleId | Native vk | Goal-key | Skeleton-factory | Tutkimusstatus |
|---|---------|-----------|----------|-----------------|----------------|
| 1 | `multi-issurin` | 8–16 | — | generateMultiBlockMesocycle | RISTIINTARKISTETTU |
| 2 | `single-hypertrofia` | 4 | hypertrofia | createHypertrofiaMesocycle | RISTIINTARKISTETTU |
| 3 | `single-maksimivoima` | 4 | maksimivoima | createMaksimivoimaMesocycle | RISTIINTARKISTETTU |
| 4 | `single-yhdistelma` | 4 | yhdistelma | createDefaultMesocycle | KÄYTÄNNÖLLINEN |
| 5 | `single-dup` | 4 | undulating | createDUPMesocycle | PDF-VERIFIOITU (Rhea 2002) |
| 6 | `single-eksentrinen` | 4 | eksentrinen | createEksenterinenMesocycle | EMPIRINEN |
| 7 | `single-siirtyma` | 3 (lukko) | siirtyma | createSiirtymaMesocycle | KÄYTÄNNÖLLINEN |
| 8 | `single-palautuminen` | 2 (lukko) | palautuminen | createPalautuminenMesocycle | KÄYTÄNNÖLLINEN |
| 9 | **`single-wendler531`** | **4** | **wendler531** | **createWendler531Mesocycle (UUSI)** | **PDF-VERIFIOITU (T-Nation 2009)** |
| 10 | **`single-top-set-backoff`** | **4** | **topSetBackoff** | **createTopSetBackoffMesocycle (UUSI)** | **PDF-VERIFIOITU (Androulakis-Korakakis 2021)** |
| 11 | **`single-madcow-5x5`** | **5 (lukko)** | **madcow5x5** | **createMadcow5x5Mesocycle (UUSI)** | **RISTIINTARKISTETTU + EI-TUTKIMUSPOHJAINEN** |

---

## 3. Arkkitehtuurimuutokset

### 3.1 data.js (+~430 LoC)

#### Uusi: 3 skeleton-factoria

**createWendler531Mesocycle(startDateISO)** — Wendler 5/3/1 Classic
- 4 viikkoa, 4 päivää/vk (Wendlerin 4 kisaliikettä: OHP/DL/Bench/Squat)
- Per päivä: 3 päämääräliikkeen sarjaa (5/3/1-prosentit) + BBB 5×10 + accessory
- **AMRAP-flag viim. sarjassa** vk 1-3 (5+/3+/1+); vk 4 = deload (5/5/5 EI AMRAP)
- weekDefs: vk1 deltaPctBase=0, vk2=+0.05, vk3=+0.10, vk4=-0.25
- _programMeta: TM 90%, TM-progressio +2.5/+5 kg, reset −10% RISTIINTARKISTETTU, AMRAP=Epley, RIR=1

**createTopSetBackoffMesocycle(startDateISO)** — Androulakis-Korakakis 2021
- 4 viikkoa, 3 päivää/vk (Squat/Bench/Deadlift fokus)
- Per päivä: 1 top single @ Vara 0-1 (RPE 9-9.5) + 2-3 backoff × 3 reps @ 80% top-singleista + 3 accessory
- Backoff-sarjamäärä nousee progressiivisesti vk-2:n alusta (2 → 3)
- weekDefs: vk1=0, vk2=+0.025, vk3=+0.05, vk4=-0.20 (deload)
- _programMeta: topSetRpe [9, 9.5], backoffPercent 0.80, backoffReps 3 (EI-TUTKIMUSPOHJAINEN)

**createMadcow5x5Mesocycle(startDateISO)** — Bill Starr 1976 -pohjainen anonyymi mukautus
- **5 viikkoa** (lukko, vk5 = PR-yritys), 3 päivää/vk Ma/Ke/Pe HLM-pattern
- **Prosenttipohjainen progressio** (+2.5%/vk, EI absoluuttinen +2.5/+5 lb)
- Ma (heavy): 3 päämääräliikkeen 5×5 ramp (50/62.5/75/87.5/100% top-setistä)
- Ke (light): 4×5 (sets 1-3 = Ma:n, set 4 = set 3 toistettuna)
- Pe (heavy+backoff): 4×5 ramp + 1×3 @ +2.5% Ma-topista + 1×8 @ ~77.5% Ma-topista
- Vk1 = 92.5% 5RM, Vk4 = 100% 5RM, Vk5 = 102.5%+ PR-yritys
- _programMeta: rampPcts, weeklyIncrementPercent 0.025, advancedWarning (15+v → redukoi 1-1.5%/vk)

#### Uusi: AMRAP-konversio-helperit

```js
function calculateE1RM_Epley(weight, reps);     // 1RM = W × (1 + reps/30)
function calculateE1RM_Brzycki(weight, reps);   // 1RM = W / (1.0278 - 0.0278 × reps)
function amrapToE1RM(weight, achievedReps);     // {e1rmPrimary, e1rmBrzycki, divergencePct, isReliable, confidence, source}
```

- `MAX_RELIABLE_AMRAP_REPS = 10` (PDF-VERIFIOITU Reynolds 2006)
- `AMRAP_DEFAULT_RIR = 1` (RISTIINTARKISTETTU Wendler "1-2 reps in tank")
- Confidence: ≤5 reps "high", ≤10 "medium", >10 "low" + warning

#### Laajennettu: GOAL_SKELETONS + GOAL_NATIVE_WEEKS + skeletonFactories + MESOCYCLE_TEMPLATES + module-exportit
- 3 uutta entry: `wendler531`, `topSetBackoff`, `madcow5x5`
- GOAL_NATIVE_WEEKS: `madcow5x5: 5` (lukko, ei skaalata)
- MESOCYCLE_TEMPLATES: 3 uutta UI-templatea atletin templatevalintaan (about-tekstit kanonisilla statuksilla)

### 3.2 wizard-2b-mapper.js (+~200 LoC)

#### Laajennettu: PROGRAM_STYLES (8 → 11)
3 uutta merkintää: `single-wendler531`, `single-top-set-backoff`, `single-madcow-5x5` täydellä metadatalla (label, shortDesc, weekCount, bestFor, iconHint, goal, factoryHint, sourceLabel)

#### Laajennettu: pickProgramStyle (8 → 11 kandidaattia)

**Wendler 5/3/1 -pisteytys:**
- isMaxGoal → +35 (klassinen voimanostorakenne)
- isGenStrength → +20
- isIntermPlus → +15
- recent=hypertrophy/strength → +10
- q25_rpePrecision=vara_calibrated → +5 (AMRAP-tarkkuus)
- cutAggressive → −10 (BBB-volyymi raskas)

**Top-set+Backoff -pisteytys:**
- isMaxGoal → +30 (tehokas voimasignaali)
- q23=MEV → +25, MAV → +5, MRV → −10
- isAdvancedPlus → +10 (RPE 9-9.5 tarkkuus)
- beginner → −15 (Zourdos 2016: NS heikko RIR-arviointi)
- sessio < 60 min → +10 (minimitehokas)
- cutAggressive → +5 (matala volyymi sopii)

**Madcow 5×5 -pisteytys:**
- intermediate → +40 (kohdistettu LP)
- beginner → +15, advanced → −10, elite → −20 (LP epärealistinen)
- isMaxGoal/isGenStrength → +15
- recent=off_program/deload → +10
- daysPerWeek=3 → +5, >3 → −5

#### Laajennettu: PROGRAM_STYLE_NATIVE_WEEKS-lukko
Lisätty `madcow5x5: 5` siirtyma/palautuminen-rinnalle.

#### Päivitetty: MAPPER_VERSION
"2D-alpha-v1.0" → "2D-beta-v1.0"

#### Bug-korjaus: rationale-fallback
Cap-säännöissä lisätty `if (rationale.length === 0) push("Yleisesti soveltuva...")` koska Top-set+Backoff voi saada 0 rationalea joillain profiileilla.

### 3.3 Liikepankki (+1 liike)

**Lisätty: Yhden jalan jalkaprässi** (data.js DEFAULT_MOVEMENTS + howTo + wizard fallback-pankki)
- Kategoria: alaraaja
- LoadType: external
- HowTo: "Jalkaprässi yhdellä jalalla — toinen jalka pois laitteesta. Unilateraalinen quad/glute-isolaatio ilman selkäkuormaa."

---

## 4. AMRAP-engine-tuki

### Slot-rakenne

```js
{
  role: "primary",
  ...
  reps: 5,            // Toistomäärä (AMRAP-tapauksessa minimi)
  amrap: true,        // Optional — viim. sarja AMRAP
  amrapTargetReps: 5, // Optional — käyttäjälle näytettävä "5+"-target
  wendlerSet: 3,      // Optional — Wendler-syklin sarja-indeksi (1-3)
}
```

### Engine-integraatio
- **Ei muutoksia engine.js:ään** 2D-β:n osalta — set.reps-arvo tallennetaan suoraan käyttäjän AMRAP-tuloksesta
- Olemassa oleva Epley-pohjainen e1RM-laskenta (e1rmExternal/e1rmSystem) toimii AMRAP-tuloksille automaattisesti
- Tulevaisuudessa (2D-γ?): UI:n primary-slot-rendering tunnistaa `slot.amrap === true` ja näyttää "5+" tooltippinä

### Reynolds 2006 -varoitus
Jos käyttäjä logaa AMRAP-reps > 10, `amrapToE1RM` palauttaa `warning: "Reynolds 2006: linear formulas unreliable >10 reps"` + `confidence: "low"`. UI voi näyttää info-tipin tämän pohjalta.

---

## 5. Tutkimuspohja per metodologia (status-attribuutiot)

| Metodologia | Korkein status | Source-merkintä rules-arrayssä |
|-------------|---------------|--------------------------------|
| Wendler 5/3/1 | PDF-VERIFIOITU (ydinprosentit) | "Wendler 2009 5/3/1 (T-Nation -artikkeli PDF-VERIFIOITU)" |
| Top-set+Backoff | PDF-VERIFIOITU (abstrakti) | "Androulakis-Korakakis 2021 (PMC8435792, METD-konseptipaperi)" |
| Madcow 5×5 | RISTIINTARKISTETTU + EI-TUTKIMUSPOHJAINEN | "Madcow 5×5 (anonyymi yhteisön mukautus Bill Starr 1976 -pohjasta)" |
| AMRAP Epley | RISTIINTARKISTETTU (≥10 peer-review) | "Epley 1985 + Reynolds 2006 R²-validointi" |
| AMRAP Brzycki | ABSTRAKTI + RISTIINTARKISTETTU | "Brzycki 1993 JOPERD 64(1):88-90" |

**Kriittiset fabrikointi-blokit:**
1. ✅ "Greg Nuckols MM Method" hylätty (virheellinen attribuutio) → korvattu Androulakis-Korakakis 2021:llä
2. ✅ Madcow +2.5/+5 lb/vk EI käytetä (StrongLifts/SS-arvoja, EI Madcow:n) → prosenttipohjainen +2.5%/vk
3. ✅ Wendler reset −10% tagattu RISTIINTARKISTETTU, EI PDF-VERIFIOITU (yhteisön konsensus)

---

## 6. UI-stringit (kanoninen muoto)

| Tyyli | Käyttäjälle näkyvä label | shortDesc (modaali) |
|-------|--------------------------|---------------------|
| Wendler 5/3/1 | "Wendler 5/3/1" | "Klassinen 4-vk sykli, AMRAP viim. sarja, BBB-assistance" |
| Top-set + Backoff | "Top-set + Backoff" | "1 raskas single @ Vara 0-1 + 2-3 backoff @ 80% top-singleista" |
| Madcow 5×5 | "Madcow 5×5" | "5-vk lineaarinen progressio Ma/Ke/Pe HLM-pattern, +2.5%/vk" |

**Sääntö muistiosta:** UI-stringeissä EI tutkijaviittauksia (Androulakis-Korakakis / Wendler / Bill Starr -mainintoja saa olla VAIN rules.source-kentässä, EI label/shortDesc-stringeissä).

---

## 7. Self-tests (selfTestMapper)

**214/214 testiä PASS** (192 → 214, +22 uutta 2D-β-testiä):
- PROGRAM_STYLES rakenne (4 testiä): 11 tyyliä, oikeat goalit, Madcow weekCount=5
- pickProgramStyle pisteytys (5 testiä):
  - Akseli (max+intermediate+vara_calibrated) → Wendler conf > 50
  - MEV+lyhyt sessio+advanced → top-set+backoff > 60
  - MRV → top-set+backoff < 40 (matala volyymi vs preferenssi)
  - intermediate+general_strength → Madcow > 55
  - elite+max_1RM → Madcow < 35 (LP epärealistinen)
- mapWizardToMesocycle(selectedStyleId) (5 testiä): 3 uutta tyyliä pakottavat oikean goalin + weekCountin
- mapWizardToProgram dispatcher (4 testiä): kaikki 3 uutta tyyliä reitittyvät oikein
- Yleiset (4 testiä): 11 tyyliä esiintyy ilman duplikaatteja, Wendler-rationale sisältää kalibroinnin
- MAPPER_VERSION + _wizardMeta.mapperVersion päivitetty 2D-beta-v1.0:ksi

---

## 8. Engine-verifiointi selaimessa

### Profiilitestit

**Akseli (elite + max_1RM + hypertrophy-recent + MAV + vara_calibrated):**
- #1 Maksimivoima 65%
- #1 Wendler 5/3/1 65% (tasapeli — kanoninen voimanostorakenne kokeneelle)
- #3 Eksentrinen 50%
- #4 Top-set+Backoff 45%
- #5 DUP 35%

**Intermediate (general_strength + off_program + 3 päivää/vk):**
- #1 Madcow 5×5 70% (kohdistettu intermediate-LP)
- #2 Yhdistelma 55%
- #3 Wendler 35%

**Short session + MEV (advanced + max_1RM + 45 min):**
- #1 Top-set+Backoff 75% (minimitehokas)
- #2 Wendler 60%
- #3 Maksimivoima 58%

### AMRAP-laskenta
- Epley(100, 5) = 116.67 kg
- Brzycki(100, 5) = 112.51 kg
- amrapToE1RM(100, 6) = {epley: 120, brzycki: 116.14, divergence: 3.2%, confidence: "medium"}

### Skeleton-factory-rakenne
- Wendler: 4 päivää × 4 vk, amrapTargetReps=5 vk1, vk4 deload EI AMRAP ✓
- Top-set+Backoff: 4 vk, top single (Vara 1) + backoff 2×3 @ 80% ✓
- Madcow: 5 vk, "Vk1 (92.5% 5RM)" → "Vk5 PR-yritys (102.5%+ 5RM)" ✓

---

## 9. Akseptanssikriteerit 2D-β:lle

| # | Kriteeri | Status |
|---|----------|--------|
| K1 | 3 uutta skeleton-factoria koodattu Wendler/TSB/Madcow | ✅ |
| K2 | AMRAP-tuki: slot.amrap + amrapTargetReps + amrapToE1RM-helper | ✅ |
| K3 | Madcow 5 vk natiivipituus (PR-vk5 lopussa) | ✅ |
| K4 | PROGRAM_STYLES 8 → 11 tyyliä | ✅ |
| K5 | pickProgramStyle pisteyttää kaikki 11 tyyliä loogisesti | ✅ |
| K6 | mapWizardToMesocycle(selectedStyleId) toimii 3 uudelle tyylille | ✅ |
| K7 | Self-tests 214/214 PASS | ✅ |
| K8 | Liikepankki: Yhden jalan jalkaprässi lisätty | ✅ |
| K9 | AMRAP Epley + Brzycki + Reynolds 2006 -varoitus toimii selaimessa | ✅ |
| K10 | Akseli-profiili → Wendler ja Maksimivoima top-2 (tasapeli) | ✅ |
| K11 | Intermediate → Madcow top-1 (70%) | ✅ |
| K12 | Lyhyt sessio + MEV → Top-set+Backoff top-1 (75%) | ✅ |
| K13 | Fabrikointi-tarkistus: 3 riskiä blokattu (MM Method / Madcow +2.5lb / Wendler reset −10%) | ✅ |
| K14 | APP_VERSION v4.47.0 → v4.48.0 | ✅ |

---

## 10. Riskit + niiden lieventäminen

| Riski | Lieventäminen |
|-------|---------------|
| Wendler-streetlifting-substituutio rikkoo "kanoninen" -määritelmää | _programMeta:ssa kommentti, mapper merkitsee customConfig:iin "WENDLER-DERIVED" jos primaryt eivät ole Wendlerin 4 kisaliikettä |
| Top-set+Backoff backoff-reps oletus 3 EI-TUTKIMUSPOHJAINEN | _programMeta:ssa status-tagi; UI-rationale ei väitä tutkimuspohjaa |
| Madcow advanced/elite -ylimitoitus (+2.5%/vk epärealistinen) | _programMeta advancedWarning + pickProgramStyle pisteyttää elite-tasoa −20 → Madcow ei nouse top-1:ksi |
| AMRAP >10 reps -laskenta epäluotettava | amrapToE1RM palauttaa warning + confidence: "low" + Reynolds 2006 -sitaattilähde |
| Streetlifting-siirrettävyys (leuka/dippi vs squat/bench) | Tutkimusdokumentissa nimetty ekstrapolaatioksi; engine käyttää e1RM-pohjaa joka kalibroituu käyttäjän omilla tuloksilla |

---

## 11. Metadata

- **Tutkimuspäivä:** 2026-05-11 (käyttäjän erilliskonversaatio)
- **Tutkimustiedosto:** docs/VAIHE_2D_BETA_RESEARCH_VERIFICATION.md
- **Self-tests:** 214/214 PASS (38 uutta 2D-β-testiä)
- **Engine-verifiointi:** mapperVersion 2D-beta-v1.0, 11 PROGRAM_STYLES, 3 skeleton-factory:t, AMRAP-konversio Epley+Brzycki+Reynolds
- **Sovellusversio:** v4.47.0 → v4.48.0
- **Mapper-versio:** "2D-alpha-v1.0" → "2D-beta-v1.0"
- **PROGRAM_BUILD_VERSION:** v4.38.9 (ei muutosta — auto-rebuild EI laukea)
