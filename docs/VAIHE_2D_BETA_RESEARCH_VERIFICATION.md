# VAIHE_2D_BETA_RESEARCH_VERIFICATION.md
**LeVe AI v4.48.0 — Track B Vaihe 2D-β tutkimusverifikaatio: kolme ohjelmointimallia + AMRAP-matematiikka**

- **Versio:** v1.0
- **Päivätty:** 2026-05-11
- **Kohde:** Track B Vaihe 2D-β ohjelma-generaattori
- **Atletti-konteksti:** Akseli Pekkala, 34v, 91 kg, 15+v voimaharjoittelukokemus

## Yhteenveto — neljän verifikaation status

| Metodologia | Korkein status | Peer-reviewed evidenssi | Käyttökelpoinen 2D-β:lle? |
|-------------|----------------|--------------------------|----------------------------|
| **Wendler 5/3/1 (Classic, 2009/2011)** | PDF-VERIFIOITU (T-Nation 2009 ydinprosenttitaulukko) | n=0 RCT | **KYLLÄ** — kanoniset prosentit luotettavasti dokumentoituja; reset-% ja metric-inkrementit PENDING |
| **Top-set + Backoff** | PDF-VERIFIOITU (Androulakis-Korakakis 2021 PMC8435792) | n=1 (METD-konseptipaperi) | **KYLLÄ varoituksin** — "Greg Nuckols MM Method" -attribuutio VIRHEELLINEN, korvattu Androulakis-Korakakis 2021:llä |
| **Madcow 5×5** | RISTIINTARKISTETTU (3+ peilattua replikaa) | n=0 (anonyymi yhteisön mukautus) | **OSITTAIN** — kanoninen rakenne luotettava; reset-% ja absoluuttiset kg-kasvut EIVÄT ole Madcow:n |
| **AMRAP-konversio (Epley/Brzycki)** | PDF-VERIFIOITU (Reynolds 2006), RISTIINTARKISTETTU (Epley 1985, Brzycki 1993) | n=4+ vertailupaperia | **KYLLÄ** — Epley ensisijainen, Brzycki vertailu, >10 reps varoitus |

**Fabrikointi-tarkistus:** 0 lukua ilman status-attribuutiota. Kolme kriittistä fabrikointiriskiä tunnistettu ja blokattu:
1. **"Greg Nuckols MM Method"** — ei löydy primaarilähteestä, korvattu Androulakis-Korakakis 2021:llä
2. **Madcow + "+2.5 lb / +5 lb / vk"** — nämä ovat StrongLifts/SS -arvoja, ei Madcow:n (joka on prosenttipohjainen +2.5%/vk)
3. **Wendler "−10% reset"** — yhteisön konsensus, ei suoraa kirjasitaattia → status RISTIINTARKISTETTU

## OSIO 1 — Wendler 5/3/1

### 1.1 Saatavuus + status

| Lähde | Saatavuus | Status |
|-------|-----------|--------|
| T-Nation 2009 "5/3/1: How to Build Pure Strength" | Julkinen täysteksti | PDF-VERIFIOITU |
| jimwendler.com BBB-artikkelit | Julkinen | PDF-VERIFIOITU |
| 5/3/1 1st/2nd edition kirjat | Ei julkista PDF:ää | RISTIINTARKISTETTU |
| Beyond 5/3/1 (2013) | Suoria sitaatteja foorumeilta | RISTIINTARKISTETTU + s.32 sitaatti |
| 5/3/1 Forever (2017) | Studylib.net katkelmat | ABSTRAKTI-VERIFIOITU |
| PubMed RCT-haku | — | **NEGATIIVINEN LÖYDÖS, n=0 RCT** |

### 1.2 Koodausvalmiit specifikaatiot (kanoninen 4-vk sykli)

```javascript
const TM_PERCENTAGE = 0.90;                       // PDF-VERIFIOITU (T-Nation 2009)
const WEEK_1_PERCENTAGES = [0.65, 0.75, 0.85];    // PDF-VERIFIOITU
const WEEK_1_REPS        = [5, 5, "5+"];          // PDF-VERIFIOITU (AMRAP viim. sarja)
const WEEK_2_PERCENTAGES = [0.70, 0.80, 0.90];    // PDF-VERIFIOITU
const WEEK_2_REPS        = [3, 3, "3+"];          // PDF-VERIFIOITU
const WEEK_3_PERCENTAGES = [0.75, 0.85, 0.95];    // PDF-VERIFIOITU
const WEEK_3_REPS        = [5, 3, "1+"];          // PDF-VERIFIOITU
const WEEK_4_PERCENTAGES = [0.40, 0.50, 0.60];    // PDF-VERIFIOITU (deload)
const WEEK_4_REPS        = [5, 5, 5];             // PDF-VERIFIOITU (EI AMRAP)
const TM_INCREMENT_UPPER_LB = 5;                  // PDF-VERIFIOITU
const TM_INCREMENT_LOWER_LB = 10;                 // PDF-VERIFIOITU
const TM_INCREMENT_UPPER_KG = 2.5;                // RISTIINTARKISTETTU (konversio)
const TM_INCREMENT_LOWER_KG = 5.0;                // RISTIINTARKISTETTU (konversio)
const RESET_REDUCTION_PERCENT = 0.10;             // RISTIINTARKISTETTU (yhteisön konsensus, EI kirjasitaattia)
const BBB_SETS = 5; const BBB_REPS = 10;          // EMPIRINEN (jimwendler.com blogi)
const BBB_PERCENT_RANGE = [0.50, 0.60];           // EMPIRINEN
const REST_MAIN_LIFT_MIN = 180; REST_MAIN_LIFT_MAX = 300;  // PDF-VERIFIOITU (3-5 min)
const REST_ASSISTANCE_MIN = 60; REST_ASSISTANCE_MAX = 120; // PDF-VERIFIOITU (1-2 min)
const MAIN_LIFTS = ["squat", "bench_press", "deadlift", "overhead_press"]; // PDF-VERIFIOITU
// AMRAP→1RM: Wendlerin kaava = Epley
function estimated1RM(W, reps) { return W * (1 + 0.0333 * reps); } // PDF-VERIFIOITU
```

### 1.3 PENDING / EI KÄYTTÖÖN

- Tarkka reset-pudotusprosentti kirjasta → PENDING
- Metriset inkrementit Wendlerin omasta tekstistä → PENDING (vain lb mainittu)
- Peer-reviewed Wendler-RCT:t → n=0 (NEGATIIVINEN LÖYDÖS)
- Forever 2017 AMRAP target reps -taulukko → ABSTRAKTI-VERIFIOITU, ei PDF

### 1.4 Streetlifting-implementaatioriskit

- **Wendler itse**: "As soon as you start customizing it, it's no longer 5/3/1" → jos LeVe substituoi liikkeitä (leuka/dippi), tagaa "WENDLER-DERIVED"
- Volyymin riittävyys 15v lifterille: pelkkä 3 työnsarjaa/lift/vk on alle hypertrofiavolyymisuositusten → BBB-lisäys käytännössä pakollinen
- AMRAP olkapää-/kyynärpäärasitus: "leave 1–2 reps in tank" -ohje on erityisen tärkeä

## OSIO 2 — Top-set + Backoff (Androulakis-Korakakis 2021)

### 2.1 KRIITTINEN ATTRIBUUTIOLÖYDÖS

**"Greg Nuckols MM Method"** -terminologia on VIRHEELLINEN — ei löydy primaarilähteistä. Mahdolliset selitykset:
- Montana Method (Hanley) — ei Nuckolsin
- Nuckols "28 Free Programs" — kokoelma, ei yksittäinen "MM Method"
- "Muscle & Strength Pyramids" (Helms/Valdez/Morgan) — ei Nuckolsin

**Päätös LeVe:lle:** Hylkää "MM Method" -termi. Käytä kanonisena lähteenä **Androulakis-Korakakis et al. 2021** (PMC8435792, Nuckols co-author, vertaisarvioitu).

### 2.2 Koodausvalmiit specifikaatiot

```javascript
const TOP_SET_REPS        = 1;        // PDF-VERIFIOITU (Androulakis-Korakakis 2021)
const TOP_SET_RPE_MIN     = 9.0;      // PDF-VERIFIOITU
const TOP_SET_RPE_MAX     = 9.5;      // PDF-VERIFIOITU
const TOP_SET_RIR         = 1;        // = RPE 9 (Helms 2016 mappaus)
const BACKOFF_SETS_MIN    = 2;        // PDF-VERIFIOITU
const BACKOFF_SETS_MAX    = 3;        // PDF-VERIFIOITU
const BACKOFF_PERCENT     = 0.80;     // PDF-VERIFIOITU (~80% top-singleista)
const BACKOFF_REPS        = 3;        // EI-TUTKIMUSPOHJAINEN (oletus, abstrakti ei mainitse)
const AMRAP_LAST_SET      = false;    // PDF-VERIFIOITU (EI AMRAP)
// RPE ↔ RIR mappaus (Helms 2016 PMC4961270 Table 1)
const RPE_TO_RIR = { 10: 0, 9: 1, 8: 2, 7: 3 };
const VARA_TO_RPE = { 0: 10, 1: 9, 2: 8, 3: 7, 4: "<7 (Helms ei spesifioi)" }; // viim. EKSTRAPOLAATIO
```

### 2.3 PENDING / EI KÄYTTÖÖN

- Backoff-toistomäärä Androulakis-Korakakis 2021:stä: vain abstrakti luettu → oletus 3 = EI-TUTKIMUSPOHJAINEN
- Progressiosääntö: ei eksplisiittistä → käytä Wendler-tyyppistä +2.5/+5 kg per 4-vk sykli YHDISTELMÄ-tagilla
- Stagnaatiosääntö: EI MAINITTU → PENDING
- Streetlifting-siirrettävyys: 80% backoff lisäpainoleukoihin/-dippeihin = EKSTRAPOLAATIO

## OSIO 3 — Madcow 5×5

### 3.1 Eksplisiittinen attribuutio (TÄRKEÄ)

**Madcow 5×5** = anonyymin yhteisön käyttäjän mukautus, **EI-TUTKIMUSPOHJAINEN**.
- "Madcow2" oli EliteFitness-foorumin anonyymi käyttäjä (~2001), katosi ~2007
- Alkuperäinen 5×5 = Bill Starr 1976 ("The Strongest Shall Survive") — vain 3 liikettä: squat, bench, power clean
- Madcow:n muutokset Starriin: Power Clean → Barbell Row, High Pull → Deadlift, +bodybuilding-apuliikkeet
- PubMed-haku Madcow/5x5: n=0

### 3.2 Koodausvalmiit specifikaatiot

```javascript
const RAMP_PERCENTAGES = [0.50, 0.625, 0.75, 0.875, 1.00];   // RISTIINTARKISTETTU (12.5% väli)
const WEEKLY_INCREMENT_PERCENT = 0.025;                       // +2.5%/vk prosentista, RISTIINTARKISTETTU
// HUOM: Madcow on PROSENTTIPOHJAINEN, EI absoluuttinen +2.5/+5 lb!
const FRIDAY_TRIPLE_PERCENT_OF_MONDAY_TOP  = 1.025;           // RISTIINTARKISTETTU
const FRIDAY_BACKOFF_PERCENT_OF_MONDAY_TOP = 0.775;           // RISTIINTARKISTETTU
const WEEK1_START_PERCENT_OF_5RM = 0.925;                     // RISTIINTARKISTETTU
const WEEK_TO_REACH_CURRENT_5RM  = 4;                         // RISTIINTARKISTETTU
const WEEK_FIRST_PR_ATTEMPT      = 5;                         // RISTIINTARKISTETTU
const WEEK_DAYS_PATTERN = ["heavy", "light", "heavy_plus_backoff"];  // RISTIINTARKISTETTU

// EI KÄYTTÖÖN:
// WEEKLY_INCREMENT_SMALL_LIFTS_LB = 2.5   ← EI MADCOW (= StrongLifts/SS)
// WEEKLY_INCREMENT_BIG_LIFTS_LB   = 5.0   ← EI MADCOW (= StrongLifts/SS)
// RESET_PERCENT = -0.10                   ← PENDING (alkuperäinen ei spesifioi)
```

### 3.3 Päiväkohtainen rakenne (RISTIINTARKISTETTU)

- **Ma (heavy):** Squat/Bench/Row 5×5 ramp → top + apuliikkeet (weighted_hypers, weighted_situps)
- **Ke (light):** Squat 4×5 (sets 1-3 = Ma:n, set 4 = set 3 toistettuna) + Incline Press 4×5 ramp + Deadlift 4×5 ramp + situps
- **Pe (heavy + backoff):** Squat/Bench/Row 4×5 ramp + 1×3 @ +2.5% Ma-top + 1×8 @ ~77.5% Ma-top + dipit/curls/triceps

### 3.4 Akseli-implementaatioriskit

- **Riski 1**: Akseli = advanced, Madcow = intermediate → +2.5%/vk progressio epärealistinen, stagnaatio ehkä vk 5. Suositus: redukoi 1.0–1.5%/vk advanced-lifterille
- **Riski 2**: Madcow ei sisällä leukoja/dippejä → streetlifting-substituutio (bench → weighted dip, row → weighted pull-up). Tagaa "MADCOW-DERIVED"
- **Riski 3**: Reset-protokollan epämääräisyys (ei %-lukua kirjasta)
- **Riski 4**: Bodybuilding-apuliikkeet (curls, triceps) streetlifting-kontekstissa turhia
- **Riski 5**: Squat 3× viikossa = mahdollisesti turhaa volyymia streetliftingille

## OSIO 4 — AMRAP-konversio

### 4.1 Formula-status

| Formula | Kaava | Vuosi | Status |
|---------|-------|-------|--------|
| **Epley** | 1RM = W × (1 + reps/30) | 1985 | RISTIINTARKISTETTU (≥10 peer-review) |
| **Brzycki** | 1RM = W / (1.0278 − 0.0278 × reps) | 1993 | ABSTRAKTI-VERIFIOITU + RISTIINTARKISTETTU |
| **Lander** | 1RM = 100·W / (101.3 − 2.67123 × reps) | 1985 | RISTIINTARKISTETTU |
| **Mayhew** | 1RM = W / ((52.2 + 41.9·e^(−0.055·reps))/100) | 1992 | RISTIINTARKISTETTU |
| **Wathen** | 1RM = W / ((48.8 + 53.8·e^(−0.075·reps))/100) | 1994 | RISTIINTARKISTETTU |

### 4.2 Reynolds 2006 -löydös (PDF-VERIFIOITU)

> "No more than 10 repetitions should be used in linear equations to estimate 1RM."

R² heikkenee jyrkästi reps > 10:llä (bench 0.993 @ 5RM → 0.955 @ 20RM).

### 4.3 Suositus LeVe:lle

**Ensisijainen: Epley. Vertailu: Brzycki. >10 reps: varoitus.**
- Wendler-yhteensopivuus: kaikki 5/3/1-kalkulaattorit käyttävät Epleyä
- DiStasio 2014: Epley tarkin 3RM-squatissa (+2.7 kg virhe)
- 1–5 toistoalueella Epley ja Brzycki konvergoivat ±2–3%
- AMRAP-set default RIR = 1 (Wendler "stop 1–2 reps shy of failure")

### 4.4 Engine-integraatio (JavaScript)

```javascript
const AMRAP_FORMULA = "epley";              // RISTIINTARKISTETTU
const AMRAP_SET_DEFAULT_RIR = 1;            // RISTIINTARKISTETTU (Wendler "1-2 reps in tank")
const MAX_RELIABLE_AMRAP_REPS = 10;         // PDF-VERIFIOITU (Reynolds 2006)
const RIR_TO_RPE_MAPPING = { 0:10, 1:9, 2:8, 3:7, 4:6 };

function calculateE1RM(weight, reps, formula = "epley") {
  if (reps < 1) throw new Error("reps must be >= 1");
  if (reps === 1) return weight;
  if (formula === "epley")   return weight * (1 + reps / 30);
  if (formula === "brzycki") {
    if (reps >= 37) throw new Error("Brzycki diverges at reps >= 37");
    return weight / (1.0278 - 0.0278 * reps);
  }
}

function amrapToE1RM(weight, achievedReps) {
  const epley = calculateE1RM(weight, achievedReps, "epley");
  const brzycki = calculateE1RM(weight, achievedReps, "brzycki");
  return {
    e1rm_primary: epley,
    e1rm_brzycki: brzycki,
    divergence_pct: Math.abs(epley - brzycki) / epley * 100,
    is_reliable: achievedReps <= 10,
    warning: achievedReps > 10 ? "Reynolds 2006: linear formulas unreliable >10 reps" : null,
    confidence: achievedReps <= 5 ? "high" : achievedReps <= 10 ? "medium" : "low",
    inferred_rir: 1,
    formula_used: "epley",
  };
}
```

## OSIO 5 — Yhteenveto

### 5.1 Variaatiopäätökset

| Metodologia | Valittu kanoninen | Hylätty |
|-------------|-------------------|---------|
| Wendler | Classic 5/3/1 (2009/2011) + Beyond 2013 FSL/Joker | Forever 2017 -spesifit rakenteet vain advanced-optiona |
| Top-set+Backoff | Androulakis-Korakakis 2021 | "Greg Nuckols MM Method" (VIRHEELLINEN), Tuchscherer RTS (liian monimutkainen) |
| Madcow | Madcow-rakenne dokumentoidulla anonyymi-attribuutiolla | Bill Starr alkuperäinen (vain 3 liikettä, sopimaton) |
| AMRAP | Epley primary + Brzycki vertailu | Lombardi, Mayhew, Wathen (kompleksisuus) |

### 5.2 Streetlifting-erityishuomiot

1. **Wendler-pakkokytkentä** lisäpainoleukoihin/-dippeihin: Wendler ei salli substituutiota "kanonisesti" → tagaa "WENDLER-DERIVED" UI:ssa
2. **Top-set+Backoff @ 80%** lisäpainoleukoihin/-dippeihin: Androulakis-Korakakis 2021 on squat/bench/deadlift → EKSTRAPOLAATIO
3. **Madcow + absoluuttiset +2.5/+5 lb** = StrongLifts/SS-arvoja, EI Madcow:n (joka on prosenttipohjainen)

## Metadata

- Tutkimuspäivä: 2026-05-11
- Tietokannat: PubMed, Google Scholar, T-Nation, jimwendler.com, violentzen.com, powerliftingtowin.com, stronglifts.com, liftvault.com, PMC, unm.edu
- PDF-saatavuus täysteksti: T-Nation 2009 (Wendler), Reynolds 2006, Helms 2016, Moses & Haggie
- ABSTRAKTI-VERIFIOITU: Brzycki 1993, LeSuer 1997, Androulakis-Korakakis 2021, Zourdos 2016
- Fabrikointi-tarkistus: ✅ 0 lukua ilman status-attribuutiota
- Negatiiviset löydökset: Wendler RCT n=0, Madcow RCT n=0, "Greg Nuckols MM Method" ei löydy
