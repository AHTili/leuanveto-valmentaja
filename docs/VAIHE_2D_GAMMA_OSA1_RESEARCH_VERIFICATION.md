# VAIHE 2D-γ Osa 1 — Tutkimusverifikaatio: Westside, GZCL, Sheiko

**Versio:** v1.0
**Päivätty:** 2026-05-12
**Atletti:** Akseli Pekkala (34v, 91 kg, 15+v voimaharjoittelukokemus; leuka 85 kg, dippi 95 kg, kyykky 185 kg)
**Konteksti:** Track B Vaihe 2D-γ Osa 1 — 3 edistynyttä voimanosto-erikoisohjelmaa

## Yhteenveto (BLUF)

Kolmesta tutkitusta metodologiasta **Westside Conjugate ja GZCL ovat koodausvalmiita** primäärilähteistä (WSBB-blogit + Simmons 2011 CrossFit Journal PDF; Lefeverin oma blogi 2012/2014/2016), kun taas **Sheiko on koodattavissa vain "SHEIKO-DERIVED"-leimalla**. **Yksikään näistä kolmesta metodista ei nauti vertaisarvioidusta RCT-tukea.**

| Metodologia | Lähdestatus | Käyttökelpoinen 2D-γ:lle | Streetlifting-soveltuvuus |
|---|---|---|---|
| Westside Conjugate | WSBB-OFFICIAL + Simmons 2011 PDF | **KYLLÄ** | RAJALLINEN (equipped-PL-tausta) |
| GZCL (Lefever) | EMPIRINEN-blogi (Lefever 2012/2014/2016 kokoteksti luettu) | **KYLLÄ** | KOHTUULLINEN (tier-malli geneerinen) |
| Sheiko | EMPIRINEN-yhteisökopio (#29 dokumentoitu); kirja PENDING | **OSITTAIN** | EI KANONINEN (vain SBD) |

## OSIO 1 — Westside Conjugate (Louie Simmons)

### Koodausvalmiit specit

```javascript
WESTSIDE_CONJUGATE = {
  days_per_week: 4,
  split: ["ME-Lower", "ME-Upper", "DE-Lower", "DE-Upper"],
  min_recovery_hours_same_zone: 72,
  ME: {
    top_set_reps: 1,              // 3RM Good Morning-varianteille
    target_intensity_pct: 90,     // ≥90% 1RM
    heavy_singles_max: 4,
    rotation_period_advanced_weeks: 1,
    rotation_period_intermediate_weeks: [2, 3],
    stagnation_trigger: "2_consecutive_no_PR",
    stagnation_response: "switch_top_set_to_5RM_one_week"
  },
  DE_LOWER_modelA_raw: { sets: 10, reps: 2, pct_wave: [50, 55, 60], AR: false },
  DE_LOWER_modelB_AR:  { sets_wave: [12,10,8], reps: 2, pct_wave: [75,80,85], AR_pct: 25 },
  DE_UPPER: { sets: 9, reps: 3, pct_range: [50, 60], grips: 3, sets_per_grip: 3 },
  rest_seconds_DE: [45, 60],
  rest_seconds_ME: [180, 300],
  accessories_per_session: [3, 5],
  reverse_hyper_ME: { sets: 4, reps: 10, pct_squat_1RM: 50 },
  reverse_hyper_DE: { sets: 4, reps: 20, pct_squat_1RM: 25 }
}
```

### Variaatiopäätös
- **Kanoninen pohja:** Simmons 2007 + WSBB-blogit (2018–2025)
- **Derivative-versiot:** Brian Alsruhe (NEVERsate), Matt Reynolds (Conjugate for Raw), Brandon Lilly (JTS) — optioina
- **ME-rotaatio:** AIKAJAKSO-POHJAINEN (viikoittain advanced, 2-3 vk intermediate), EI stagnaatio-pohjainen
- **Stagnaatio:** 2 vk no PR → siirry 5-rep-top-settiin yhdeksi viikoksi (EI liikevaihtoa)

### Streetlifting-implementaatio
- ME-Upper PULL rotaatio: weighted pull-up 3RM, weighted chin-up 3RM, BB row 3RM
- ME-Upper PUSH rotaatio: bench/incline/floor press/close-grip/weighted dip 3RM tai 5RM
- DE-Lower Malli A (10×2 @ 50/55/60% ilman AR) jos band/chain ei saatavilla
- **HUOM:** Westside on alunperin equipped powerlifting → raw-hybridi vaatii liike-substituutiot

## OSIO 2 — GZCL (Cody Lefever)

### Tier-määritelmät (Lefever 2012 EMPIRINEN-blogi)

| Tier | Intensiteetti | Toistot/treeni | Volyymisuhde |
|---|---|---|---|
| T1 | >85 % | 10-15 | 1× |
| T2 | 65-85 % | 20-30+ | 2× |
| T3 | <65 % | 30+ | 3× |

### Koodausvalmiit specit

```javascript
GZCL_TIERS = {
  T1: { intensity_pct: [85,100], reps_per_session: [10,15], volume_ratio: 1 },
  T2: { intensity_pct: [65,85],  reps_per_session: [20,30], volume_ratio: 2 },
  T3: { intensity_pct: [0,65],   reps_per_session: [30,100], volume_ratio: 3 }
}
TRAINING_MAX_PCT_OF_1RM = 0.90    // ≈ 2RM
AMRAP_RIR = [1, 2]
AMRAP_CAP_T1 = 10                  // älä mene yli 10 reps T1 AMRAP-sarjalla
E1RM_FORMULA = "Epley"             // yhteensopiva Wendler/GZCL-ekosysteemin kanssa
GZCLP_PROGRESSION = { squat_DL_kg: 4.5, bench_OHP_kg: 2.5 }
GZCLP_T1_STAGES = [
  {sets:5,  reps:3, plus_amrap:true},
  {sets:6,  reps:2, plus_amrap:true},
  {sets:10, reps:1, plus_amrap:true}
]
GZCLP_T2_STAGES = [{sets:3,reps:10},{sets:3,reps:8},{sets:3,reps:6}]
GZCLP_T3 = {sets:3, reps:15, plus_amrap:true, increase_when_amrap_reps_gte:25}
GZCLP_T1_RESET = 0.85
T2_RESET_INCREMENT_KG = 9
JT20 = { duration_weeks: 12, sessions_per_week: 4, blocks:[6,6] }
JT20_WEEKLY_RM_TARGETS_BLOCK1 = [10,8,6,4,2,1]
JT20_DROPSET_PCT_TM_BLOCK1 = [0.675, 0.70, 0.725, 0.75, 0.785, null]
RIPPLER = { duration_weeks: 12, T1_progression: "two_up_one_down", up_pct: 5, down_pct: -2.5 }
```

### Variaatiopäätös Akselille
- **GZCLP**: aloittelija-LP → EI sovi advanced-lifterille
- **J&T 2.0**: 12 vk, 4 pv/vk → **SUOSITUS** Akselin profiilille
- **Rippler**: 12 vk peaking → vaihtoehto kun lähestyy testausta

### Streetlifting-implementaatio
- T1 voi olla streetlifting-spesifinen (weighted pull-up, weighted dip) — Lefever itse sallii "snatch, clean and jerk, or overhead press if your training requires it"
- T2 hyödyntää variaatioita (close-grip bench, pause squat, paused DL, RDL, jne.)
- T3 hypertrofia-volyymia tukiliikkeille

## OSIO 3 — Sheiko (Boris Sheiko)

### KRIITTINEN ATTRIBUUTIO

**Sheiko on EKSKLUSIIVISESTI squat/bench/deadlift -ohjelma.** Yhteenkään verifioituun Sheiko-lähteeseen ei ole dokumentoitu leuka- tai dippi-spesifistä Sheiko-protokollaa.

### #29 -spesifikaatio (EMPIRINEN-yhteisökopio)

```javascript
SHEIKO_29_DERIVED = {
  duration_weeks: 4,
  sessions_per_week: 3,
  squat_frequency: 2,
  bench_frequency: 3,
  deadlift_frequency: 1,
  avg_intensity_pct: 70,
  max_intensity_week1_pct: 75,
  max_intensity_week3_pct: 85,
  weekly_lift_count_above_50pct: [200, 400],
  block_role: "preparatory",
  status: "SHEIKO-DERIVED, ei kanoninen"
}
```

### Streetlifting-adaptaatio = EI KANONINEN
- Leuka/dippi käsiteltävä "additional exercise" -muodossa (5×5) ilman %-skeemaa
- **Pakollinen merkintä:** "SHEIKO-DERIVED, ei kanoninen Sheiko"
- Sheiko-volyymi (200-400 NL/vk) + streetlifting-volyymi = ristikkäisvolyymi-riski

## Liikepankin lisäykset (priorisoidut)

### KORKEA PRIORITEETTI
| Liike | Luokka | Westside | GZCL T2 | Sheiko |
|---|---|---|---|---|
| Front Squat / Etukyykky | squat | ME | ✓ | #29 |
| Pause Squat / Taukokyykky | squat | — | ✓ | Myöh. lohkot |
| Box Squat / Laatikkokyykky | squat | ME+DE | ✓ | — |
| Good Morning / Hyvää huomenta | hinge | ME (3RM) | ✓ | Acc. |
| Deficit Deadlift / Korokemaasto | hinge | ME | ✓ | Variant |
| Rack Pull / Räkkimaasto | hinge | ME | ✓ | #29 Ke |
| Paused Deadlift / Taukomaasto | hinge | — | ✓ | — |
| Romanialainen maastaveto (RDL) | hinge | acc. | ✓ | — |
| Floor Press / Lattiapenkki | push-h | ME | — | — |
| Board Press / Lautapenkki | push-h | ME | — | Bench Only |
| Pin Press / Tappipenkki | push | ME | ✓ | — |
| Push Press / Tönäisy | push-v | ME | ✓ | — |
| Spoto Press | bench (mid-ROM) | — | ✓ | — |
| Long Pause Bench / Pitkän tauon penkki | bench | — | ✓ | — |
| Wide-Grip Bench / Leveän otteen penkki | bench | — | ✓ | — |

### KESKITASON PRIORITEETTI
JM Press, Decline Bench, Snatch-Grip DL, Glute-Ham Raise (GHR), Reverse Hyper (= hyperextension), Dumbbell Fly / Käsipainoaukaisu, Lunges, SSB Squat (erikoiskalusto)

## Metadata
- Tutkimuspäivä: 2026-05-12
- Fabrikointi-tarkistus: ✅ 0 lukua ilman status-attribuutiota
- Negatiiviset löydökset: Westside RCT n=0, GZCL RCT n=0, Sheiko RCT n=0 (kaikki kolme empiirisiä)
