# Tutkimusinvariantit — ihmislukija-dokumentaatio

> **Tarkoitus (vaihe 3):** Tämä tiedosto on **ihmislukija-dokumentaatio** joka kuvaa LeVe AI:n tutkimuspohjaiset invariantit: mitä invariantti tarkoittaa, mistä tutkimuksesta se tulee, mihin koodi sen sitoo.
>
> **Tämä EI ole totuuden lähde numeerisille arvoille.** Yksi totuuden lähde on [`tools/engine-pilot/lib/audit-baselines.mjs`](../tools/engine-pilot/lib/audit-baselines.mjs) — koneluettava ESM-tiedosto jota auditorit importoivat ajossa. Jos haluat tarkan numeron, avaa linkitetty vakio.
>
> **A-päätös (2026-05-16):** numerot eivät toistu tässä tiedostossa. Driftin riski yhden totuuden lähteen ja markdownin välillä on eliminoitu rakenteellisesti — ei säännöllä joka voi unohtua.

---

## Velvoittavuus

Jokainen alla oleva invariantti on **rajoittava sääntö**, jota engine ei saa rikkoa:
- **Hardcoded-koodi**: clamp-arvot, kynnykset, sääntölogiikka pysyvät invariantin sisällä
- **Opittavat parametrit (vaihe 8a)**: prior = invariantin keskiarvo, posterior saa terävöityä ±2 SD sisällä alkuperäisestä rangesta
- **Audit-engine** (`tools/engine-pilot/lib/audit-engine.mjs`, ENG-14 `auditInvariants`): emittoi `INVARIANT_VIOLATION`-flagin (ERROR-taso) jos engine ehdottaa arvoa rajojen ulkopuolelle
- **Stop hook**: regression-pilot ei valmistu OK-tilassa jos invariantti rikkoutuu

---

## Invariantit ja niiden koneluettavat vakiot

### A — Velocity-loss-cap per blokki (VL-cap)

**Mitä:** Sarjan sisäisen velocity-pudotuksen yläraja per blokin vaihe. Engine ei saa ehdottaa sarjan päättämistä myöhemmin kuin tämä raja, eikä sallia sen ylittämistä.

**Mistä tutkimuksesta:** Pareja-Blanco 2017 (PMC5497611), Pareja-Blanco 2020 (PMC7308300), Sánchez-Moreno 2017. Foundation- ja strength-vaiheelle vertaisarvioitu, intensity/peaking laajennettu Helms 2018 -metodologiakirjasta. Speed-strength-vaiheelle Behrmann 2025.

**Koneluettava lähde:** [`VL_CAP_BASELINES`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `engine.js` `VL_CAP_PER_BLOCK` + `vlCapForContext`

**Opittava parametri (8a):** `learnedVlCap` per vaihe. Prior = `VL_CAP_BASELINES[phase]`-keskiarvo. Posterior ± 2 SD priorin keskiarvosta — clamp jos karkaisi.

---

### B — Rep1 MPV-slope per RIR (Sánchez-Moreno-slope)

**Mitä:** Ensimmäisen toiston MPV (mean propulsive velocity) eroaa noin slope-arvon verran per RIR-yksikkö. Engine käyttää tätä rep1-target-MPV:n laskennassa kun atletilla ei ole vielä luotettavaa henkilökohtaista RTF-mallia (`RTF_MODEL_STATUS: insufficient/preview`). Reliable-tilassa henkilökohtainen slope voi poiketa priorin keskiarvosta, mutta enintään `tolerance`-rajan verran.

**Mistä tutkimuksesta:** Sánchez-Moreno 2017, Jukic 2024 RIR-V-malli.

**Koneluettava lähde:** [`REP1_MPV_SLOPE_BASELINE`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `engine.js` `targetRep1VelocityRange`, `computeRtfVelocityModel`, `predictVxFromVelocity`

**Opittava parametri (8a):** `learnedRtfSlope` per atletti. Prior = `REP1_MPV_SLOPE_BASELINE.slopeMpvPerRir`. Posterior ± `REP1_MPV_SLOPE_BASELINE.tolerance` priorin keskiarvosta.

---

### C — Deload-protokolla

**Mitä:** Kevennysviikon kuormamuutos. Deload-viikolla Δ% pysyy aina invariantin sisällä — ei suurempi pudotus (atletti menettää adaptaation kärjen) eikä pienempi (deload ei toimi).

**Mistä tutkimuksesta:** Helms 2018 (PMID 30153841), Bompa 2009 -kirjan deload-volyymileikkaus.

**Koneluettava lähde:** [`DELOAD_DELTA_RANGE`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `engine.js` `weekDef.deltaPctBase` deload-viikoilla, `DELOAD_OVERRIDE`-trace

---

### D — Tier-progression multiplier per tier

**Mitä:** Eliittitason atletin viikoittainen kuormakasvu on hitaampaa kuin aloittelijan. Kerroin per tier rajoittaa weekly progression-rate × tier-multiplier -tuloa.

**Mistä tutkimuksesta:** Latella 2020 (PMID 32706692).

**Koneluettava lähde:** [`TIER_PROGRESSION_MULT_BASELINES`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `wizard/wizard-2b-mapper.js` `applyTierProgression`

**Poikkeus:** Akselin streetlifting_16w-preset käyttää by-design suurempia hyppyjä `_programMeta.tierProgressionApplied: false` -flagin alla — tämä on tarkoituksellinen poikkeus elite-tier-mult:sta atletin 15v empirian pohjalta. ENG-14:n INVARIANT_VIOLATION laukeaa **vain** jos `tierProgressionApplied: true` JA arvo yli rajan.

---

### E — Failure-jälkeinen kuormapudotus

**Mitä:** Kun atletti epäonnistuu (V0, ei vie sarjaa loppuun), seuraavan session kuorma alenee invariantin verran. Drop ei saa olla suurempi (recovery liian aggressiivinen) eikä pienempi (engine ei reagoi).

**Mistä tutkimuksesta:** Refalo 2023 — failure-reaction strategy.

**Koneluettava lähde:** [`FAILURE_DROP_BASELINE`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `engine.js` `failureReaction`

---

### F — Block-periodisaation residual-päivät

**Mitä:** Issurin-mallin mukaan kunkin blokin osavaikutus säilyy seuraavaan blokkiin. Multi-block-mesocyclen blokki-pituudet ja sekvenssi seuraavat näitä residual-päiviä.

**Mistä tutkimuksesta:** Issurin 2010 Sports Medicine 40(3).

**Koneluettava lähde:** [`ISSURIN_BLOCK_RESIDUALS`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `data.js` `generateMultiBlockMesocycle`, `pickBlockSequence`

---

### G — Block-phase target RIR

**Mitä:** Engine.js käyttää blokin vaiheen mukaan eri RIR-tavoitteita primary-sarjoissa. Foundation = paljon varaa (RIR korkea), peaking = vähän varaa (RIR matala).

**Mistä tutkimuksesta:** Helms 2018 RPE/RIR-autoregulaatio, Pareja-Blanco-vaiheittain.

**Koneluettava lähde:** [`BLOCK_PHASE_TARGET_RIR_EXPECTED`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `engine.js` `BLOCK_PHASE_TARGET_RIR` + `SLOT_TARGETVx_RESOLVED`-trace

---

### H — Sex modifier (Huiberts SMD)

**Mitä:** Aerobinen harjoittelu yhdistettynä voiman tavoitteeseen vaikuttaa eri tavalla miehillä advanced/elite-tasolla — recovery-kapasiteetti laskee.

**Mistä tutkimuksesta:** Huiberts 2024 — SMD lower-body strength.

**Koneluettava lähde:** [`SEX_MODIFIER`](../tools/engine-pilot/lib/audit-baselines.mjs)

**Koodisidonta:** `wizard/wizard-2b-mapper.js` `pickRecoveryCapacity`

---

### Liittyvät vakiot (audit-spesifejä, ei suoria invariantteja)

| Vakio | Käyttö |
|---|---|
| [`RAMP_EXPECTED_TOP_PCT`](../tools/engine-pilot/lib/audit-baselines.mjs) | Warmup-rampin ylin step-prosentti (data.js RAMP_DEFAULT vs UI-hardkoodi K1) |
| [`RTF_MODEL_THRESHOLDS`](../tools/engine-pilot/lib/audit-baselines.mjs) | RTF-velocity-mallin reliable/preview-kynnykset |
| [`CUT_DEFICIT_THRESHOLD`](../tools/engine-pilot/lib/audit-baselines.mjs) | Aggressivinen vaje-kynnys recovery=heikko-triggeriin |
| [`DELTA_PCT_HARD_CLAMP`](../tools/engine-pilot/lib/audit-baselines.mjs) | Engine.js hard-clamp `settings.maxDelta` |
| [`DELTA_PCT_EXPECTED_RANGE`](../tools/engine-pilot/lib/audit-baselines.mjs) | Heuristinen expected progression range per tier (WARN-tasoinen) |

---

## Käyttö opittavalle mallille (vaihe 8a)

Kun β-tutkimuksen tulos palautuu ja oppiva malli implementoidaan:

1. **Jokainen opittava parametri saa priorin** audit-baselines.mjs:stä. Esim. `learnedVlCap.strength`:n prior = `VL_CAP_BASELINES.strength`-keskiarvo, SD = (max − min) / 4 (joka kattaa rangen ±2 SD).
2. **Posterior saa terävöityä** kun atletin data kasvaa, mutta `clamp(posterior, baseline.min, baseline.max)` pakottaa pysymään invariantin sisällä.
3. **Stop hook** ajaa regression-pilotin joka tarkistaa, ettei engine ehdota kanavalle arvoa rajojen ulkopuolelle.
4. **Audit-engine** (ENG-14, `auditInvariants`) emittoi `INVARIANT_VIOLATION`-flagin jos arvo karkaa.

---

## Lähdetiivistelmä

| Lähde | Saatavuus | Käytetty invarianteissa |
|---|---|---|
| Pareja-Blanco 2017 (PMC5497611) | Open access | A |
| Pareja-Blanco 2020 (PMC7308300) | Open access | A |
| Sánchez-Moreno 2017 | Maksullinen | A, B |
| Helms 2018 (PMID 30153841) | Maksullinen | A, C, G |
| Latella 2020 (PMID 32706692) | Maksullinen | D |
| Refalo 2023 | Maksullinen | E |
| Issurin 2010 (Sports Medicine 40(3)) | Maksullinen | F |
| Hopkins 2009 (MSSE 41(1):3-13) | Maksullinen | (audit-spesifi: HRV-SWC) |
| Plews 2013 (Sports Med 43(9):773-781) | Maksullinen | (audit-spesifi: HRV-rolling mean — vain abstrakti+jatkopaperit verifioitu) |
| Buchheit 2014 (Front Physiol 5:73) | Open access | (audit-spesifi: HRV-menetelmä) |
| Huiberts 2024 | Open access | H |
| Jukic 2024 | Open access | B |
| Bompa 2009 | Kirja | C |
| Behrmann 2025 | (käytäntö) | A speed-strength |
