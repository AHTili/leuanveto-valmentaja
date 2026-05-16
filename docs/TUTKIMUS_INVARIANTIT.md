# Tutkimusinvariantit — formaali taulukko

> **Tarkoitus (vaihe 3):** Konsolidoi kaikki tutkimuspohjaiset numeeriset invariantit yhteen formaaliin taulukkoon, jonka koodi velvoittautuu noudattamaan. Nämä invariantit toimivat **prioreina** vaiheen 8a oppivalle mallille — posterior saa terävöityä ±2 SD sisällä, ei rajojen ulkopuolelle.
>
> **Erona muihin docs-tiedostoihin:** ENGINE_BULLETPROOF_AUDIT.md osio 7 mainitsee lähteet tekstinä. Tämä tiedosto **numeroi ne velvoittavasti** koodisääntöjen tasolle.

---

## Velvoittavuus

Jokainen alla oleva rivi on **invariantti**, jota engine ei saa rikkoa missään tilanteessa:
- **Hardcoded-koodi**: clamp-arvot, kynnykset, sääntölogiikka pysyvät näiden rajojen sisällä
- **Opittavat parametrit (vaihe 8a)**: prior = invariantin keskiarvo, posterior saa terävöityä ±2 SD sisällä alkuperäisestä rangesta
- **Audit-engine** ([`tools/engine-pilot/lib/audit-engine.mjs`](../tools/engine-pilot/lib/audit-engine.mjs)): emittoi `INVARIANT_VIOLATION`-flagin jos engine ehdottaa arvoa rajojen ulkopuolelle (uusi koodi tarvitaan; ks. backlog ENG-14)
- **Stop hook**: regression-pilot ei valmistu OK-tilassa jos invariantti rikkoutuu

---

## Invarianttitaulukko

### A — Velocity-loss-cap per blokki (VL-cap)

Sarjan sisäisen velocity-pudotuksen yläraja per blokin vaihe. Engine ei saa ehdottaa sarjan päättämistä myöhemmin kuin tämä raja, eikä sallia sen ylittämistä.

| Vaihe | Min | Max | Suosituin yksittäinen arvo | Lähde | Status |
|---|---|---|---|---|---|
| Foundation | 25 % | 35 % | 30 % | Pareja-Blanco 2017 (PMC5497611) | VERIFIOITU |
| Strength | 15 % | 20 % | 17,5 % | Pareja-Blanco 2017, 2020 (PMC7308300) | VERIFIOITU |
| Intensity | 10 % | 15 % | 12,5 % | Pareja-Blanco 2017 | VERIFIOITU |
| Peaking | 5 % | 10 % | 7,5 % | Pareja-Blanco 2017 | VERIFIOITU |
| Speed-strength | 10 % | 15 % | 12,5 % | Pareja-Blanco 2017 | DOKUMENTOITU |

**Koodisidonta:** `engine.js` `VL_CAP_PER_BLOCK` ([engine.js](../engine.js)).

**Opittava parametri (8a):** `learnedVlCap` per vaihe. Posterior ± 2 SD priorin keskiarvosta.

---

### B — Rep1 MPV-targetit per RIR (Vara)

Ensimmäisen toiston minimi-MPV (mean propulsive velocity) per varatasolla, kun atletti haluaa "tarpeeksi raskaan" rep1:n. Slope ~0,045 m/s per RIR.

| Vara (Vx) | RIR-vastaavuus | Rep1 MPV target (likimain) | Lähde | Status |
|---|---|---|---|---|
| V0 | RIR 0 (failure) | n/a (saavuttamatta) | Sánchez-Moreno 2017 | VERIFIOITU |
| V1 | RIR 1 | – | Sánchez-Moreno 2017 | VERIFIOITU |
| V2 | RIR 2 | priorin keskiarvo + 0,090 m/s | Sánchez-Moreno 2017 | VERIFIOITU |
| V3 | RIR 3 | priorin keskiarvo + 0,135 m/s | Sánchez-Moreno 2017 | VERIFIOITU |
| Slope | — | ~0,045 m/s / RIR | Sánchez-Moreno 2017, Jukic 2024 | VERIFIOITU |

**Koodisidonta:** `engine.js` `targetRep1VelocityRange` ([engine.js](../engine.js)).

**Opittava parametri (8a):** `learnedRtfSlope` per atletti. Prior = 0,045; posterior-CI 0,035–0,055. Älä karkaa ulkopuolelle.

---

### C — Deload-protokolla

Kevennysviikon kuormamuutos (Δ%) ja sen rajat.

| Parametri | Min | Max | Tyypillinen | Lähde | Status |
|---|---|---|---|---|---|
| Deload Δ% | −30 % | −20 % | −25 % | Helms 2018 (PMID 30153841), Bompa 2009 | VERIFIOITU |
| Deload-vk:n volyymileikkaus | 30 % | 50 % | 40 % | Helms 2018 | DOKUMENTOITU |

**Koodisidonta:** `engine.js` `weekDef.deltaPctBase` deload-viikoilla.

---

### D — Tier-progression elite (per viikko kasvun kerroin)

Eliittitason atletin viikoittaisen kuormakasvun maksimi (suhteessa baseline-kasvuun).

| Tier | Kerroin | Lähde | Status |
|---|---|---|---|
| Beginner | 1,0 × | Latella 2020 (PMID 32706692) | VERIFIOITU |
| Intermediate | 0,5 × | Latella 2020 | VERIFIOITU |
| Advanced | 0,25 × | Latella 2020 | VERIFIOITU |
| Elite | 0,05 × | Latella 2020 | VERIFIOITU |

**Koodisidonta:** `wizard-2b-mapper.js` `applyTierProgression`.

**Huomio:** Akselin streetlifting_16w-preset käyttää by-design suurempia hyppyjä (vk7 +8 %, vk11 +10 %, vk14 +10 %) `_programMeta.tierProgressionApplied: false` -flagin alla → tämä on tarkoituksellinen poikkeus elite-tier-mult:sta atletin 15v empirian pohjalta. Invariantti ei velvoita tätä presettiä.

---

### E — Failure-jälkeinen kuormapudotus

Kun atletti epäonnistuu (V0, ei vie sarjaa loppuun), seuraavan session kuorma alenee.

| Parametri | Arvo | Lähde | Status |
|---|---|---|---|
| Failure-jälkeinen drop | 5 % | Refalo 2023 | VERIFIOITU |
| Lockout-aika (sessioiden pitää siirtyä ennen palautusta) | seuraava sessio | Refalo 2023 | DOKUMENTOITU |

**Koodisidonta:** `engine.js` `failureReaction`.

---

### F — Block-periodisaation residual-päivät

Issurin-mallin mukaan, kunkin blokin osavaikutus säilyy seuraavaan blokkiin.

| Blokin tyyppi | Residuaalin kesto (vk) | Lähde | Status |
|---|---|---|---|
| Hypertrofia | 4–6 | Issurin 2010 (Sports Medicine 40(3)) | VERIFIOITU |
| Strength | 2–3 | Issurin 2010 | VERIFIOITU |
| Intensity | 1–2 | Issurin 2010 | VERIFIOITU |
| Peaking | 0–1 | Issurin 2010 | VERIFIOITU |

**Koodisidonta:** multi-issurin-mesocyclen blokkien sekvenssi ja niiden pituussuositukset.

---

### G — Readiness z-score-kynnykset

Combined readiness -luokittelu z-score-rajojen mukaan.

| Luokka | z-score-väli | Capping | Lähde | Status |
|---|---|---|---|---|
| GREEN | ≥ −0,5 | ei | Hopkins 2009 SWC + Plews 2013 | DOKUMENTOITU (SWC verifioitu) |
| YELLOW | −0,99…−0,5 | Δ% × 0,5 | sama | DOKUMENTOITU |
| RED | ≤ −1,0 | Δ% ≤ 0 | sama | DOKUMENTOITU |

**Koodisidonta:** `engine.js` `classifyReadinessZ`, `combineReadiness`.

**Huomio:** Plews 2013 -paperin tarkka "−7 %" -kynnys on **EI VERIFIOITU** (kts. `docs/PLEWS_2013_VERIFICATION.md`). SWC-pohjainen kynnys (baseline − 0,5 × within-subject SD) on tutkimusperusta — ei tätä numeroa pidä korvata fabrikoidulla kiinteällä prosentilla.

---

### H — Lower-body strength SMD advanced/elite + male + aerobic

Aerobisen harjoituksen vaikutus alavartalon voiman kehitykseen edistyneellä atletilla.

| Parametri | Arvo | Lähde | Status |
|---|---|---|---|
| SMD lower-body strength | −0,43 | Huiberts 2024 | VERIFIOITU |

**Koodisidonta:** `wizard-2b-mapper.js` `pickRecoveryCapacity` aerobinen modaliteetti -kerroin.

---

## Käyttö opittavalle mallille (vaihe 8a)

Kun β-tutkimuksen tulos palautuu ja oppiva malli implementoidaan:

1. **Jokainen opittava parametri saa priorin** tästä taulukosta. Esim. `learnedVlCap.strength`:n prior on N(17.5, 1.25²) — keskiarvo 17,5, SD 1,25 (joka kattaa rangen 15–20 noin ±2 SD).
2. **Posterior saa terävöityä** kun atletin data kasvaa, mutta `clamp(posterior, prior_min, prior_max)` pakottaa pysymään invariantin sisällä.
3. **Stop hook** ([.claude/settings.json](../.claude/settings.json)) ajaa regression-pilotin joka tarkistaa, ettei engine ehdota kanavalle arvoa rajojen ulkopuolelle.
4. **Audit-engine** (ENG-14, backlog) emittoi `INVARIANT_VIOLATION`-flagin jos arvo karkaa.

---

## Lähdetiivistelmä

| Lähde | Saatavuus | Käytetty invarianteissa |
|---|---|---|
| Pareja-Blanco 2017 (PMC5497611) | Open access | A (VL-cap-rangit) |
| Pareja-Blanco 2020 (PMC7308300) | Open access | A (strength-vaihe) |
| Sánchez-Moreno 2017 | Maksullinen | B (rep1 MPV slope) |
| Helms 2018 (PMID 30153841) | Maksullinen | C (deload) |
| Latella 2020 (PMID 32706692) | Maksullinen | D (tier-progression) |
| Refalo 2023 | Maksullinen | E (failure-reaction) |
| Issurin 2010 (Sports Medicine 40(3)) | Maksullinen | F (block-residual) |
| Hopkins 2009 (MSSE 41(1):3-13) | Maksullinen | G (SWC) |
| Plews 2013 (Sports Med 43(9):773-781) | Maksullinen | G (HRV-rolling mean — vain abstrakti+jatkopaperit verifioitu) |
| Buchheit 2014 (Front Physiol 5:73) | Open access | G (HRV-menetelmä) |
| Huiberts 2024 | Open access | H (SMD-arvo) |
| Jukic 2024 | Open access | B (RTF-velocity reliability) |
| Bompa 2009 | Kirja | C (deload-volyymi) |
