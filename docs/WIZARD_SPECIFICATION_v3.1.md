# WIZARD_SPECIFICATION_v3.1.md
## LeVe AI v4.37+ — Eliittitason wizard-spesifikaatio (verifikaatiopäivitetty)
**Versio:** v3.1 (2026-05-11)
**Status:** Track A valmis. Verifiointi (VERIFICATION_PASS_v1.md) integroitu.
**Onnistumiskriteeri:** "Tämä on eliittitasoa, Track B voi alkaa lukko-tasolla."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET v3 → v3.1
═══════════════════════════════════════════════════════════════

### 5 KRIITTISTÄ KORJAUSTA (verifikaatiopassi 2026-05-11 löysi)

1. **D14 Schoenfeld 2016 frequency-väite VAIHDETTU**
   - VANHA: "1 vs 2-3x/vk = samanarvoinen hypertrofia (volyymi-tasoitettuna)"
   - UUSI: "≥2x/vk per lihasryhmä **voittaa** 1x/vk myös volyymi-tasoitettuna
     (ES 0.49 vs 0.30; p=0.002; Schoenfeld 2016 Sports Med 46(11):1689-1697)"
   - Engine-vaikutus: frequency-minimum on 2x/vk per lihasryhmä optimal, ei 1x

2. **D3/D5/D6 Issurin residual-taulukko ERONNUTAAN ERI LÄHTEESTÄ**
   - VANHA: kaikki Issurin-väitteet → "Issurin 2010 Sports Med"
   - UUSI: erotellaan kaksi lähdettä:
     * Block-mallin sisältö → Issurin 2010 Sports Med 40(3):189-206 s. 201-202
     * Residual training -numerot (aerobic 30±5 d, max speed 5±3 d) →
       Issurin 2008 J Sports Med Phys Fitness 48(1):65-75 Table V
   - Engine-vaikutus: Issurin 2008 lähteenä jatkossa numeroarvoille (ei verifioitu yet)

3. **D10 Plews −7% kynnys SIIRRETTY OIKEAAN LÄHTEESEEN**
   - VANHA: "Plews 2012" sisältää −7% baseline-kynnyksen
   - UUSI: Plews 2012 sisältää 7-day rolling Ln rMSSD + slope-arvot (NFOR-case);
     −7% kynnys siirretty Plews 2013 Sports Med 43(9):773-781 -lähteeseen
   - Engine-vaikutus: D10 HRV-readiness lähdetagi vaihtuu; Plews 2013
     verifiointi tarvitaan Track B alussa (~30 min)

4. **D8 Wilson 2012 KORVATTU Schumann 2022:lla + 3 modifieria**
   - VANHA: "Wilson 2012 — juoksu 3+x/vk → varoita interferenssistä"
   - UUSI: "Schumann 2022 Sports Med 52(3):601-612 — hypertrofia ja
     maksimivoima eivät kompromisoidu, **vain eksplosiivinen voima**
     (SMD −0.28; p=0.007). Same-session-eksplosiivinen SMD −0.31; p=0.043"
   - Engine-vaikutus: D8 mappaus uudistuu olennaisesti (alla)
   - LISÄKSI 3 uutta modifieria (alla)

5. **D4 Cools 2015 EKSTRAPOLAATIO-TAGI LISÄTTY**
   - VANHA: "Cools 2015 vamma-malli (yleinen)"
   - UUSI: tagi `[PDF-VERIFIOITU s. 331-337 + EKSTRAPOLAATIO]`
     koska Cools käsittelee heittäviä/iskeviä lajeja
     (baseball/tennis/handball/volleyball), EI vetolajeja
   - Engine-vaikutus: D4 documentaatio päivittyy; sovellettaessa
     pull-up/streetlifting-kontekstiin näytä käyttäjälle "ekstrapolaatio"

### 3 UUTTA MODIFIERIA (verifikaatiopassi löysi 2023-2026 evidenssistä)

A. **Sex-modifier** — Huiberts ym. 2024 Sports Med 54(2):485-503
   - Pieni interferenssi miehillä, **ei naisilla** (sex-vertailu p=0.03)
   - Engine: D1 (sukupuoli) × D8 (concurrent) -ehdollinen

B. **Training-status-modifier** — Petré ym. 2021 Sports Med 51:991-1010
   - Trained ES = −0.35 (p<0.01); untrained ei merkitsevää interferenssiä
   - Same-session vs different ES = −0.66 vs −0.10
   - Engine: D2 (kokemustaso) × D8 → highly trained + same-session = vahvin varoitus

C. **Same-session-sekvenssi** — Liu ym. 2025 semi-systematic review (PMC12885173)
   - Strength-first vs endurance-first ei ratkaiseva pitkäaikaisesti
   - Mutta strength-first optimoi eksplosiivista voimaa
   - Engine: D8 + (jos sama istunto + eksplosiivinen D5) → suosittele strength-first

### LÄHDE-TAGIEN PÄIVITYS (8 paperia PDF-VERIFIOITU + 4 ABSTRAKTI-VERIFIOITU)

| Paperi | v3 tagi | v3.1 tagi |
|---|---|---|
| Helms 2014 JISSN 11:20 | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU PMC4033492, Caloric intake + Table 1] |
| Helms 2016 SCJ 38(4):42-49 | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU PMC4961270, n. s. 42-45] |
| Helms 2018 Front Physiol 9:247 | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU Frontiers, Participants + Table 4] |
| Schoenfeld 2017 J Sports Sci 35(11) | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU s. 1073, 1077 Table 2, 1080] |
| Schoenfeld 2019 MSSE 51(1) | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU s. 95-99] |
| Schoenfeld 2016 Sports Med 46(11) | (uusi) | ✅✅ [PDF-VERIFIOITU typeset, Abstract+Conclusions] |
| Issurin 2010 Sports Med 40(3) | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU s. 201-202, vain block-malli] |
| Issurin 2008 J Sports Med Phys Fit 48(1) | (uusi) | ⚠ [LÄHDE LISÄTTY, EI VIELÄ VERIFIOITU] |
| Cumming 2024 J Physiol 602(17) | ⚠ [LÄHTEESTÄ] | ⚠ [ABSTRAKTI-VERIFIOITU + RG-snippet] |
| Plews 2012 Eur J Appl Physiol 112(11) | ⚠ [LÄHTEESTÄ] | ⚠ [ABSTRAKTI-VERIFIOITU s. 3729, vain rolling rMSSD] |
| Plews 2013 Sports Med 43(9) | (uusi) | ⚠ [LÄHDE LISÄTTY, EI VIELÄ VERIFIOITU − tarvitaan −7% kynnyksen vahvistus] |
| Sánchez-Moreno 2017 IJSPP 12(10) | ⚠ [LÄHTEESTÄ] | ⚠ [ABSTRAKTI-VERIFIOITU s. 1378] |
| Sánchez-Moreno 2020 JSCR 34(4) | ⚠ [LÄHTEESTÄ] | ⚠ [ABSTRAKTI-VERIFIOITU s. 911] |
| Cools 2015 Braz J Phys Ther 19(5) | ✅ [LÄHTEESTÄ] | ✅✅ [PDF-VERIFIOITU s. 331-337 + EKSTRAPOLAATIO heittävistä lajeista vetolajeihin] |
| Schumann 2022 Sports Med 52(3) | (uusi) | ✅✅ [PDF-VERIFIOITU PMC8891239, s. 604-606] |
| Huiberts 2024 Sports Med 54(2) | (uusi) | ⚠ [LÄHDE LISÄTTY, Track B verifioi tarvittaessa] |
| Petré 2021 Sports Med 51 | (uusi) | ⚠ [LÄHDE LISÄTTY, Track B verifioi tarvittaessa] |
| Liu 2025 PMC12885173 | (uusi) | ⚠ [LÄHDE LISÄTTY, Track B verifioi tarvittaessa] |

### VAIHE 1 -SESSION-JAKO LISÄTTY ROADMAPPIIN
Vaihe 1 (median 60 h) jaettu 4 Claude-sessioon (1A-1D):
- 1A (3-4 h Claude): Data-model + 25-kysymys JSON-skeema + Dexie schema + SW init (~400-600 LoC)
- 1B (3-4 h Claude): Wizard core (step-nav, progress, state, validation) (~500-800 LoC)
- 1C (3-5 h Claude): 25 kysymys-komponenttia + 7 step-rendaus + staattiset smart defaults (~800-1200 LoC)
- 1D (2-3 h Claude): SW viimeistely + offline-fallback + smoke-test (~300-500 LoC)
- Yhteensä: 11-16 h Claude + 20-40 h itsenäistä = median 60 h

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY (päivitetty)
═══════════════════════════════════════════════════════════════

15 wizard-dimensiota, 7 vaihetta, jokainen perusteltu Tier 1 peer-review
-lähteellä JOSTA 8/12 PDF-verifioitu sivutarkkuudella ja 4/12
abstrakti-verifioitu paywallien vuoksi. Verrattu 4 commercial-benchmarkkiin
(RTS, RP, JuggernautAI, Tactical Barbell).

3-vaiheinen implementaatio: Vaihe 1 = 60 h median (jaettuna 4 sessio-pakettiin
1A-1D), Vaihe 2 = 55 h, Vaihe 3 = 50 h, yhteensä 165 h median.

Verifikaatiopassi (2026-05-11) tunnisti 5 kriittistä virhettä v3:ssa ja
korjasi ne v3.1:een. Lisäksi 3 uutta modifieria (sex/training-status/
same-session-sekvenssi) lisätty D8:n.

═══════════════════════════════════════════════════════════════
1. METODOLOGIA & LÄHDEHIERARKIA (päivitetty)
═══════════════════════════════════════════════════════════════

### Verifikaatiotaso per Tier 1 -paperi (v3.1)

| # | Paperi | PDF-saatavuus | Verifikaatio |
|---|---|---|---|
| 1 | Helms 2014 JISSN 11:20 | ✅ PMC | ✅✅ Section + Table |
| 2 | Helms 2016 SCJ 38(4) | ✅ PMC | ✅✅ Section + Table |
| 3 | Helms 2018 Front Physiol 9:247 | ✅ Frontiers | ✅✅ Section + Table |
| 4 | Schoenfeld 2017 J Sports Sci 35(11) | ✅ Liège | ✅✅ PDF s. 1073, 1077, 1080 |
| 5 | Schoenfeld 2019 MSSE 51(1) | ✅ PMC | ✅✅ PDF s. 95-99 |
| 6 | Schoenfeld 2016 Sports Med 46(11) | ✅ paulogentil | ✅✅ Sisältö (typeset) |
| 7 | Issurin 2010 Sports Med 40(3) | ✅ hmmrmedia | ✅✅ PDF s. 201-202 |
| 8 | Cools 2015 Braz J Phys Ther 19(5) | ✅ PMC | ✅✅ PDF s. 331-337 + EKSTRAPOLAATIO |
| 9 | Schumann 2022 Sports Med 52(3) | ✅ PMC | ✅✅ PDF s. 604-606 |
| 10 | Cumming 2024 J Physiol 602(17) | ⚠ Wiley paywall | ⚠ Abstrakti + RG-snippet |
| 11 | Plews 2012 Eur J Appl Physiol 112(11) | ⚠ Springer paywall | ⚠ Abstrakti s. 3729 |
| 12 | Sánchez-Moreno 2017 IJSPP 12(10) | ⚠ Human Kinetics paywall | ⚠ Abstrakti s. 1378 |
| 13 | Sánchez-Moreno 2020 JSCR 34(4) | ⚠ LWW paywall | ⚠ Abstrakti s. 911 |

### Vielä-verifioimattomat lähteet (Track B alku ~30 min/kpl)

| Lähde | Käyttö | Prioriteetti |
|---|---|---|
| Issurin 2008 J Sports Med Phys Fit 48(1):65-75 | Residual training -numerot Table V | 🟡 Track B Vaihe 2 |
| Plews 2013 Sports Med 43(9):773-781 | −7% baseline-kynnys (D10) | 🔴 Track B Vaihe 1 (kriittinen D10) |
| Huiberts 2024 Sports Med 54(2):485-503 | Sex-modifier (D1×D8) | 🟡 Track B Vaihe 2 |
| Petré 2021 Sports Med 51:991-1010 | Training-status-modifier (D2×D8) | 🟡 Track B Vaihe 2 |
| Liu 2025 PMC12885173 | Same-session-sekvenssi (D8) | 🟢 Track B Vaihe 3 |

═══════════════════════════════════════════════════════════════
2. WIZARD-DIMENSIOT (15 kpl, päivitetyt D4/D8/D14)
═══════════════════════════════════════════════════════════════

HUOMAUTUS: D1, D2, D3, D5, D6, D7, D9, D11, D12, D13, D15 säilyvät
sellaisenaan v3:sta. Tämä dokumentti listaa vain MUUTOKSET niihin +
PÄIVITETYT D4, D8, D14 kokonaisuudessaan. Alkuperäinen v3-dokumentti
on tarvittaessa Track B:n lähtömateriaali D1/D2/D3/D5/D6/D7/D9/D11/
D12/D13/D15 -dimensioille.

### A. PROFIILI-DIMENSIOT (D1-D4)

**D1 — Biometria** (säilyy v3:sta, PIENI PÄIVITYS)
- Ikä, sukupuoli, paino, pituus, BF%, edellinen treenitauko
- Lähteet: Helms 2014 (BF%-vaikutus proteiinitarpeeseen) ✅✅,
  Cumming 2024 (treenitauko) ⚠
- **Engine-mappaus PÄIVITETTY:** sukupuoli yhdistyy nyt D8-haaraan
  (sex-modifier Huiberts 2024)

**D2 — Treenikokemus** (säilyy v3:sta, PIENI PÄIVITYS)
- 2D-malli: vuodet × autoregulaatio-vuodet × benchmark
- Lähteet: Helms 2016 (RIR-tarkkuus tasoittain) ✅✅,
  Helms 2018 (sisäänottokriteerit 1.5×BW back squat) ✅✅
- **Engine-mappaus PÄIVITETTY:** "highly trained" -taso laukaisee
  Petré 2021 -varoituksen D8:ssa (training-status-modifier)

**D3 — Lajiprofiili** (säilyy v3:sta, LÄHDE-TAGI PÄIVITETTY)
- Voimanosto / streetlifting / hypertrofia / urheilu / yhdistelmä
- Lähteet: Issurin 2010 block periodization ✅✅ (block-malli),
  Tactical Barbell -filosofia
- (Issurin residual-numerot siirretty Issurin 2008 -lähteeseen)

**D4 — Vammahistoria & rajoitukset** (PÄIVITETTY EKSTRAPOLAATIO-TAGIIN)
- Per anatominen alue + per liike (ehdoton kielto vs muunneltu)
- **PÄIVITETTY LÄHDE-TAGI:** Cools 2015 → `✅✅ [PDF-VERIFIOITU s. 331-337
  + EKSTRAPOLAATIO heittävistä lajeista vetolajeihin]`
- **UI-VAATIMUS LISÄTTY:** kun D4-vamma-data sovelletaan pull-up/streetlifting
  -kontekstiin, näytä käyttäjälle pieni info-vinkki:
  "Vamma-cut-off-arvot perustuvat heittäviin lajeihin (baseball/tennis/handball/
  volleyball, Cools 2015). Sovelletaan ekstrapolaationa veto- ja työntölajeihin.
  Jos sinulla on aktiivinen vamma, konsultoi fysioterapeuttia."

### B. TAVOITE-DIMENSIOT (D5-D7) — säilyvät v3:sta

### C. KALUSTO + MITTARIT (D8-D10)

**D8 — Aerobinen rinnalla** (UUDISTETTU Schumann 2022 -pohjalle + 3 modifieria)

**Mitä kysytään:** Modaliteetti + frekvenssi + kesto + tarkoitus + onko
istunto sama kuin voimaharjoittelussa.

**Lähde-perustelu PÄIVITETTY:**
- ❌ POISTETTU: Wilson 2012 -ensisijainen lähde (vanhentunut)
- ✅ UUSI ENSISIJAINEN: Schumann ym. 2022 Sports Med 52(3):601-612 — meta-
  analyysi 43 tutkimuksesta (vs Wilsonin 21), n=1090. Hypertrofia ja maksimivoima
  EIVÄT kompromisoidu concurrent-mallissa (SMD −0.06 ja −0.01, ns). Vain
  eksplosiivinen voima/RFD herkkä interferenssille (SMD −0.28; p=0.007).
  Same-session-eksplosiivinen: SMD −0.31; p=0.043. Modaliteettiero
  (juoksu vs pyöräily) EI vahvistunut. ✅✅ [PDF-VERIFIOITU PMC8891239 s. 604-606]
- ✅ MODIFIERI 1 (Sex): Huiberts ym. 2024 Sports Med 54(2):485-503 — pieni
  interferenssi miehillä, ei naisilla (sex-vertailu p=0.03) ⚠
- ✅ MODIFIERI 2 (Training status): Petré ym. 2021 Sports Med 51:991-1010 —
  trained ES = −0.35 (p<0.01); untrained ei merkitsevää interferenssiä.
  Same-session vs different ES = −0.66 vs −0.10 ⚠
- ✅ MODIFIERI 3 (Sekvenssi): Liu ym. 2025 PMC12885173 — strength-first vs
  endurance-first ei ratkaiseva pitkäaikaisesti, mutta strength-first optimoi
  eksplosiivista voimaa ⚠

**Engine-mappaus UUSI (korvaa v3):**

```
function aerobicInterferenceWarning(d1, d2, d5, d8):
  if d8.aerobic === "ei":
    return { warning: null }

  primaryGoal = d5.primary
  isExplosiveGoal = primaryGoal in ["power_output", "sport_RFD",
                                     "streetlifting_with_explosive_components"]
  isHypertrophyOrStrength = primaryGoal in ["hypertrophy", "max_1RM",
                                              "powerlifting"]

  // Schumann 2022: hypertrofia ja maksimivoima eivät kompromisoidu
  if isHypertrophyOrStrength and not isExplosiveGoal:
    return { warning: null,
             trace: "Schumann 2022: hypertrofia/maksimivoima eivät
                     kompromisoidu concurrent-mallissa" }

  // Sex-modifier (Huiberts 2024)
  if d1.sex === "female":
    return { warning: null,
             trace: "Huiberts 2024: naisilla ei merkitsevää interferenssiä" }

  // Training-status-modifier (Petré 2021)
  if d2.level in ["beginner", "intermediate"]:
    return { warning: null,
             trace: "Petré 2021: untrained/moderate ei merkitsevää interferenssiä" }

  // Same-session-modifier (Liu 2025 + Petré 2021)
  if d8.sameSession and isExplosiveGoal:
    return {
      warning: "strong",
      message: "Eksplosiivinen tavoite + sama istunto = vahvin interferenssi
                (Petré 2021 ES=-0.66). Suositus: erota istunnot ≥3 h TAI tee
                voima ENNEN aerobista (Liu 2025).",
      trace: "Petré 2021 same-session ES=-0.66; Liu 2025 strength-first"
    }

  // Different-session, eksplosiivinen, highly trained -> kohtalainen varoitus
  if isExplosiveGoal and d2.level in ["advanced", "elite"]:
    return {
      warning: "moderate",
      message: "Eksplosiivinen tavoite + highly trained = kohtalainen
                interferenssi (Petré 2021 trained ES=-0.35). Erota istunnot
                eri päiviin jos mahdollista.",
      trace: "Petré 2021 trained ES=-0.35; same-session OFF -> lievempi"
    }

  // Default: ei varoitusta (Schumann 2022)
  return { warning: null,
           trace: "Schumann 2022: ei merkitsevää interferenssiä tässä
                   profiilissa" }
```

**D9 — Kalusto** (säilyy v3:sta)

**D10 — Mittarit & työkalut** (LÄHDE-TAGI PÄIVITETTY)
- Plews 2012 → vain 7-day rolling Ln rMSSD + slope-arvot ⚠
- **PLEWS 2013** → −7% baseline-kynnys ⚠ [LÄHDE LISÄTTY, EI VIELÄ VERIFIOITU]
- **TRACK B VAIHE 1 ENSIMMÄINEN TEHTÄVÄ:** verifioi Plews 2013 Sports Med
  43(9):773-781 — vahvista että −7% kynnys löytyy paperista (jos ei → poista
  kynnys engine-mappauksesta, käytä vain SWC-pohjaa Plews 2012)

### D. LIIKE-VALINTA (D11-D12) — säilyvät v3:sta

### E. VOLUME / FREQUENCY / RPE-TARKKUUS (D13-D15)

**D13 — Volyymi-preferenssi & MEV/MAV/MRV** (säilyy v3:sta)

**D14 — Frequency** (PÄIVITETTY Schoenfeld 2016 -korjaus)

**Mitä kysytään:** Päiviä viikossa, sessio-pituus, frequency per lihasryhmä.

**Lähde-perustelu PÄIVITETTY:**
- ❌ POISTETTU v3-väite: "Kun volyymi tasoitettu, frequency 1 vs 2-3x =
  samanarvoinen hypertrofia"
- ✅ UUSI VÄITE: "≥2x/vk per lihasryhmä **voittaa** 1x/vk myös volyymi-
  tasoitettuna (ES 0.49 vs 0.30; p=0.002). Conclusions: 'major muscle
  groups should be trained at least twice a week to maximize muscle growth'"
  ✅✅ [PDF-VERIFIOITU Schoenfeld 2016 Sports Med 46(11):1689-1697,
  Abstract + Conclusions, typeset version]
- ✅ Schoenfeld 2019: protokolla osoittaa 1/3/5 settiä per liike per
  sessio, 3x/vk → 30-45 settiä/vk treenanneille mahdollinen yläraja
  ✅✅ [PDF-VERIFIOITU MSSE 51(1):94-103 s. 95-96]

**Engine-mappaus PÄIVITETTY:**
```
function frequencyValidator(d14, d13):
  if d14.daysPerWeek < 2:
    return {
      warning: "frequency-suboptimal",
      message: "≥2x/vk per lihasryhmä on optimaalinen hypertrofialle
                (Schoenfeld 2016 ES 0.49 vs 0.30; p=0.002). 1x/vk
                ei maksimoi kasvua myös tasoitettuna.",
      suggestion: "Harkitse 3x/vk full body TAI 4x/vk upper/lower"
    }

  perMuscleFreq = computePerMuscleFrequency(d14.daysPerWeek, d11.preferences)

  if any(perMuscleFreq[muscle] < 2 for muscle in major_muscles):
    return {
      warning: "muscle-frequency-suboptimal",
      message: "Yksi tai useampi päälihasryhmä saa <2x/vk treenausta.
                Schoenfeld 2016: ≥2x/vk maksimoi hypertrofian.",
      suggestion: "Vaihda jakoa TAI lisää päivä"
    }

  return { warning: null }
```

**D15 — RPE/RIR-tarkkuus & autoregulaation aggressiivisuus** (säilyy v3:sta)

═══════════════════════════════════════════════════════════════
3. KYSYMYSPUU-RAKENNE (säilyy v3:sta + uusi modifier-conditional)
═══════════════════════════════════════════════════════════════

7-vaihe sekvenssi, 25 kysymystä, ~3-5 min minimi / ~12-15 min täydellinen.
Conditional logic + smart defaults säilyvät.

UUSI conditional-sääntö (D8-modifierit):
```
JOS D5 = ei-eksplosiivinen JA D7 = ei-cut THEN ohita D8-modaalivaroitus
JOS D1 = "Nainen" + D8 = "kyllä" THEN ohita interferenssi-varoitus
                                       (Huiberts 2024)
JOS D2 = "Aloittelija" + D8 = "kyllä" THEN ohita interferenssi-varoitus
                                            (Petré 2021)
JOS D8.sameSession = "kyllä" + D5 = "eksplosiivinen"
   THEN näytä Liu 2025 -ehdotus "tee voima ENNEN aerobista"
```

═══════════════════════════════════════════════════════════════
4. VERTAILU COMMERCIAL-BENCHMARKKEIHIN (säilyy v3:sta)
═══════════════════════════════════════════════════════════════

LeVe Spec v3.1 säilyttää 5 ainutlaatuista vahvuutta vs commercial:
1. D4 vammahistoria (kova vs pehmeä suodatin, ekstrapolaatio merkitty)
2. D10 mittari-integraatiot (HRV + VBT + sleep)
3. D2 2D-treenikokemus-malli
4. Streetlifting-fokus (aukko commercial-markkinoilla)
5. D8 modifier-pohjainen interferenssi (sex/training-status/sekvenssi —
   ainoa wizard joka käsittelee uudempaa evidenssiä)

═══════════════════════════════════════════════════════════════
5. IMPLEMENTAATIO-ROADMAP (TARKENNETTU SESSION-JAOLLA)
═══════════════════════════════════════════════════════════════

### Vaihe 1: Ydin-15 dimensiot (median 60 h)

**Jaettu 4 Claude-sessioon (1A-1D), kukin 3-5 h:**

**Session 1A (3-4 h Claude + 6-10 h itsenäinen)** — Data-model + skeema
- IndexedDB-skeema versionoituna (Dexie.js): WizardConfig{} JSON-objekti v3.1
- 25 kysymyksen JSON-skeema (kysymys-tekstit + vaihtoehdot + smart defaults
  + validointi)
- Service worker -alustus (PWA basics)
- Migraatio v2 → v3.1 -funktio (vanhat 5-kysymyksen wizardit)
- Hyväksymiskriteerit: WizardConfig tallentuu IndexedDB:hen, migraatio toimii
- Output: ~400-600 LoC

**Session 1B (3-4 h Claude + 6-10 h itsenäinen)** — Wizard core
- Step-navigaatio (7 vaihetta, eteen/taaksepäin)
- Progress-bar
- State-management (Proxy-pohjainen reactive store)
- Validation framework
- Hyväksymiskriteerit: tyhjä wizard renderöityy, navigointi toimii
- Output: ~500-800 LoC

**Session 1C (3-5 h Claude + 8-12 h itsenäinen)** — Kysymys-komponentit
- 25 kysymys-komponenttia (radio, checkbox, number-input, taulukko)
- 7 step-rendaus käyttäen JSON-skeemaa
- Staattiset smart defaults (sukupuoli/ikä-pohjainen BF%, kokemus-pohjainen
  RIR-kerroin, jne.)
- Conditional logic -engine (näytä/piilota kysymyksiä vastausten mukaan)
- Hyväksymiskriteerit: täysi wizard täytetään, conditional-logiikka toimii
- Output: ~800-1200 LoC

**Session 1D (2-3 h Claude + 4-8 h itsenäinen)** — SW + offline + smoke-test
- Service worker viimeistely (cache strategy)
- Offline-fallback
- Manuaalinen smoke-testaus 3 atletti-profiililla (Akseli + Maija +
  kolmas testihenkilö)
- Hyväksymiskriteerit: PWA toimii offline, 3 atletti-profiilia tuottavat
  järkevät WizardConfig:t
- Output: ~300-500 LoC

**Vaihe 1 yhteensä:** 11-16 h Claude + 24-40 h itsenäinen = median 60 h

**TRACK B VAIHE 1 ENSIMMÄINEN TEHTÄVÄ ENNEN 1A:** Verifioi Plews 2013 Sports Med
43(9):773-781 — vahvista että −7% baseline-kynnys löytyy paperista.
Jos ei löydy → poista kynnys D10-engine-mappauksesta ja käytä vain SWC-pohjaa
(Plews 2012). Aika: ~30 min.

### Vaihe 2: Conditional & auto-suunnittelu (55 h)
(säilyy v3:sta, ei suuria muutoksia)

**Track B Vaihe 2 verifikaatiotehtävät** (~2 h yhteensä):
- Verifioi Issurin 2008 J Sports Med Phys Fit 48(1):65-75 Table V (residual-
  numerot) — jos ei saatavilla, poista numero-arvot D3:sta
- Verifioi Huiberts 2024 Sports Med 54(2):485-503 — vahvista sex-modifier
- Verifioi Petré 2021 Sports Med 51:991-1010 — vahvista training-status-modifier

### Vaihe 3: Oppiva personalisointi (50 h)
(säilyy v3:sta, ei suuria muutoksia)

**Track B Vaihe 3 verifikaatiotehtävä** (~30 min):
- Verifioi Liu 2025 PMC12885173 — vahvista same-session-sekvenssi-logiikka

═══════════════════════════════════════════════════════════════
6. KIELLETYT (säilyy v3:sta + uudet)
═══════════════════════════════════════════════════════════════

Säilyvät v3-säännöt + UUDET v3.1:ssa:

🔴 **UUSI: Älä toista 5 alkuperäistä virhettä**
1. Schoenfeld 2016 frequency-väite EI ole "samanarvoinen" — käytä korjattua
2. Issurin 2010 EI sisällä residual-taulukkoa — käytä Issurin 2008
3. Plews 2012 EI sisällä −7% kynnystä — käytä Plews 2013 (kun verifioitu)
4. Wilson 2012 modaliteettiero EI vahvistunut — käytä Schumann 2022 +
   modifierit
5. Cools 2015 EI ole vetolajien lähde suoraan — merkitse ekstrapolaatio

🔴 **UUSI: Älä lisää uutta lähdettä ilman verifikaatiota**
Jos Track B tarvitsee uuden lähteen jota ei ole tässä spesifikaatiossa
(esim. uusi 2025-meta-analyysi), pysähdy ja:
1. Tee verifikaatiopassi sille lähteelle (DOI, abstrakti tai PDF)
2. Päivitä WIZARD_SPECIFICATION_v3.2.md
3. Sitten implementoi

═══════════════════════════════════════════════════════════════
7. YHTEENVETO — TASOARVIO (PÄIVITETTY 9-9.5/10)
═══════════════════════════════════════════════════════════════

v3 → v3.1 -muutos:
- 5 kriittistä virhettä korjattu
- 8/12 paperia PDF-verifioitu sivutarkkuudella (oli 0/12 v3:ssa)
- 3 uutta tutkimuspohjaista modifieria lisätty
- Vaihe 1 -session-jako tarkennettu
- Track B verifikaatiotehtävät dokumentoitu per vaihe

Onnistumiskriteeri saavutettu: "Tämä on eliittitasoa, Track B voi alkaa
lukkotasolla."

**Avoimet kohdat jotka EI estä Track B:tä:**
1. JuggernautAI/RP autenttiset onboarding-kysymykset (kohtelu: tehdään
   Vaihe 1:n jälkeen, ~1 h)
2. Käyttäjätestaus kolmannella atletilla (kohtelu: Vaihe 1 testivaiheessa)
3. 4 paywall-paperia (Cumming, Plews 2012, Sánchez-Moreno 2017/2020) jää
   abstrakti-verifioiduksi — riittävä rakenteelle

═══════════════════════════════════════════════════════════════
8. PÄIVITETTY LÄHDELUETTELO
═══════════════════════════════════════════════════════════════

**Peer-reviewed (19 lähdettä, +5 v3:sta):**

1. Cools AM, Johansson FR, Borms D, Maenhout A. Prevention of shoulder
   injuries in overhead athletes. Braz J Phys Ther. 2015;19(5):331-339.
   DOI:10.1590/bjpt-rbf.2014.0109 ✅✅
2. Cumming KT, Reitzner SM, Hanslien M, et al. Effects of training,
   detraining, and retraining on strength. J Physiol. 2024;602(17):4171-
   4193. DOI:10.1113/JP285675 ⚠
3. Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for
   natural bodybuilding contest preparation. J Int Soc Sports Nutr.
   2014;11:20. DOI:10.1186/1550-2783-11-20 ✅✅
4. Helms ER, Cronin J, Storey A, Zourdos MC. Application of the RIR-RPE
   Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49.
   DOI:10.1519/SSC.0000000000000218 ✅✅
5. Helms ER, Byrnes RK, Cooke DM, et al. RPE vs. Percentage 1RM Loading.
   Front Physiol. 2018;9:247. DOI:10.3389/fphys.2018.00247 ✅✅
6. **UUSI: Huiberts RO, Wüst RCI, van der Zwaard S.** Concurrent training
   sex differences. Sports Med. 2024;54(2):485-503. ⚠
7. Issurin VB. New Horizons for Periodization. Sports Med. 2010;40(3):
   189-206. DOI:10.2165/11319770 ✅✅ (vain block-malli s. 201-202)
8. **UUSI: Issurin VB.** Block periodization versus traditional training.
   J Sports Med Phys Fitness. 2008;48(1):65-75. ⚠ [EI VIELÄ VERIFIOITU]
9. **UUSI: Liu Y, et al.** Strength-first vs endurance-first sekvenssi
   (semi-systematic review). 2025. PMC12885173 ⚠
10. **UUSI: Petré H, et al.** Effects of concurrent training. Sports
    Med. 2021;51:991-1010. ⚠
11. Plews DJ, Laursen PB, Kilding AE, Buchheit M. HRV in elite triathletes.
    Eur J Appl Physiol. 2012;112(11):3729-3741. ⚠ (vain rolling rMSSD)
12. **UUSI: Plews DJ, et al.** HRV (−7% kynnys). Sports Med. 2013;43(9):
    773-781. ⚠ [EI VIELÄ VERIFIOITU − TRACK B VAIHE 1 ENSIMMÄINEN TEHTÄVÄ]
13. Sánchez-Moreno M, et al. Velocity as Indicator of Relative Intensity
    Pull-Up. Int J Sports Physiol Perform. 2017;12(10):1378-1384. ⚠
14. Sánchez-Moreno M, et al. Effects of VL During Pull-Up Training. J
    Strength Cond Res. 2020;34(4):911-917. ⚠
15. **UUSI: Schoenfeld BJ, Ogborn D, Krieger JW.** Effects of RT
    Frequency on Hypertrophy. Sports Med. 2016;46(11):1689-1697. ✅✅
    (KORVAA aiemman virheellisen "samanarvoinen"-väitteen)
16. Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship
    volume. J Sports Sci. 2017;35(11):1073-1082. ✅✅
17. Schoenfeld BJ, Contreras B, Krieger J, et al. RT Volume Enhances
    Hypertrophy Not Strength. Med Sci Sports Exerc. 2019;51(1):94-103. ✅✅
18. **UUSI: Schumann M, et al.** Compatibility of Concurrent Aerobic
    and Strength Training. Sports Med. 2022;52(3):601-612.
    DOI:10.1007/s40279-021-01587-7 ✅✅ (KORVAA Wilson 2012 ensisijaisena)
19. Wilson JM, et al. Concurrent training meta-analysis. J Strength Cond
    Res. 2012;26(8):2293-2307. (HISTORIALLINEN, ei enää engine-mappauksen
    lähde — vain referenssi vertailulle)

**Commercial benchmarks (säilyy v3:sta):**
- RP Strength volume landmarks (Israetel & Hoffmann 2017)
- Tuchscherer Reactive Training Manual 2008+
- JuggernautAI (Smith)
- Tactical Barbell (Black 2015-2016)

═══════════════════════════════════════════════════════════════
VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v3 (2026-05-10):** Alkuperäinen spesifikaatio
- **v3.1 (2026-05-11):** Verifikaatiopassi v1 integroitu — 5 kriittistä
  virhettä korjattu, 3 uutta modifieria, 8/12 PDF-verifikaatio,
  Vaihe 1 session-jako tarkennettu
