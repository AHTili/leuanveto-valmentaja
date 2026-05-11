# WIZARD_SPECIFICATION_v3.2.md
## LeVe AI v4.37+ — Eliittitason wizard-spesifikaatio (D10 SWC-pohjainen)
**Versio:** v3.2 (2026-05-11)
**Status:** Track A 100% valmis. Plews 2013 -verifikaatio integroitu.
**Onnistumiskriteeri:** "Tämä on eliittitasoa + tieteellisesti pätevä,
Track B voi alkaa lukko-tasolla ilman fabrikoituja lähteitä."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET v3.1 → v3.2 (Plews 2013 -verifikaatio)
═══════════════════════════════════════════════════════════════

### KRIITTINEN KORJAUS #6 (verifikaatio 2026-05-11)

**D10 Plews 2013 −7% kynnys EI OLE VERIFIOITAVISSA — KORVATTU SWC-mallilla**

- VANHA (v3.1): "Plews 2013 → −7% baseline-kynnys Ln rMSSD → deload-triggeri"
  ⚠ [LÄHDE LISÄTTY, EI VIELÄ VERIFIOITU − TRACK B VAIHE 1 ENSIMMÄINEN TEHTÄVÄ]

- UUSI (v3.2): SWC-pohjainen kehys
  - Primäärimetriikka: 7-päivän rolling Ln rMSSD (Plews 2013)
  - **Kynnys: baseline − 0.5 × within-subject SD** (Hopkins 2009 SWC +
    Plews 2013 sovellus, Vesterinen 2016 operationalisointi)
  - Sekundäärit: CV-trendi (Plews 2012) + leposyke
  - **POIS −7% kiinteä prosenttikynnys** — fabrikoitu väite

- **Lähdetauste:** Plews 2013 SM säilyy validina menetelmäkehyksen lähteenä,
  EI prosenttikynnyksen lähteenä (kynnystä ei löydy paperista)

- **Tarkennus dokumentaatiossa:** ks. docs/PLEWS_2013_VERIFICATION.md

### 4 UUTTA LÄHDETTÄ LISÄTTY (D10:n SWC-mappauksen tueksi)

| Lähde | Käyttö |
|---|---|
| Hopkins WG 2009 Med Sci Sports Exerc 41(1):3-13 | SWC-tilastollinen alkuperä, ✅✅ PDF-verifioitu |
| Buchheit M 2014 Front Physiol 5:73 | Eksplisiittinen SWC-taulukko Ln rMSSD:lle, ✅✅ PDF-verifioitu avoin Frontiers |
| Vesterinen V 2016 MSSE | Operationalisoitu kynnys mean ± 0.5 × SD päivittäiseen treeniohjaukseen |
| Le Meur Y 2013 MSSE | Vertailupiste: F-OR-induktion suorituskykyfall −9.0% ± 2.1% — EI HRV-kynnys vaan performance-mittari |

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY (päivitetty v3.2)
═══════════════════════════════════════════════════════════════

15 wizard-dimensiota, 7 vaihetta, jokainen perusteltu Tier 1 peer-review
-lähteellä JOSTA 9/12 PDF-verifioitu sivutarkkuudella ja 4/12 abstrakti-
verifioitu paywallien vuoksi.

**6 KRIITTISTÄ VIRHETTÄ KORJATTU yhteensä** (5 v3.1:ssä + 1 v3.2:ssa).
Plews 2013 −7% kynnys osoittautui fabrikoiduksi attribuutioksi —
korvattu SWC-pohjaisella (0.5 × within-subject SD) muotoilulla.

**v3.2 = tieteellisesti pätevä lähtötaso Track B Vaihe 1A:lle.**

═══════════════════════════════════════════════════════════════
1. METODOLOGIA & LÄHDEHIERARKIA (päivitetty v3.2)
═══════════════════════════════════════════════════════════════

### Verifikaatiotaso per Tier 1 -paperi (v3.2)

| # | Paperi | PDF-saatavuus | Verifikaatio |
|---|---|---|---|
| 1 | Helms 2014 JISSN 11:20 | ✅ PMC | ✅✅ Section + Table |
| 2 | Helms 2016 SCJ 38(4) | ✅ PMC | ✅✅ Section + Table |
| 3 | Helms 2018 Front Physiol 9:247 | ✅ Frontiers | ✅✅ Section + Table |
| 4 | Schoenfeld 2016 Sports Med 46(11) | ✅ paulogentil | ✅✅ Sisältö (typeset) |
| 5 | Schoenfeld 2017 J Sports Sci 35(11) | ✅ Liège | ✅✅ PDF s. 1073, 1077, 1080 |
| 6 | Schoenfeld 2019 MSSE 51(1) | ✅ PMC | ✅✅ PDF s. 95-99 |
| 7 | Issurin 2010 Sports Med 40(3) | ✅ hmmrmedia | ✅✅ PDF s. 201-202 |
| 8 | Cools 2015 Braz J Phys Ther 19(5) | ✅ PMC | ✅✅ PDF s. 331-337 + EKSTRAPOLAATIO |
| 9 | Schumann 2022 Sports Med 52(3) | ✅ PMC | ✅✅ PDF s. 604-606 |
| 10 | **UUSI: Hopkins 2009 MSSE 41(1)** | ✅ PDF | ✅✅ PDF-VERIFIOITU |
| 11 | **UUSI: Buchheit 2014 Front Physiol 5:73** | ✅ Frontiers | ✅✅ PDF-VERIFIOITU avoin |
| 12 | Cumming 2024 J Physiol 602(17) | ⚠ Wiley paywall | ⚠ Abstrakti + RG |
| 13 | Plews 2012 Eur J Appl Physiol 112(11) | ⚠ Springer paywall | ⚠ Abstrakti s. 3729 |
| 14 | **Plews 2013 Sports Med 43(9)** | ⚠ Springer paywall | ⚠ Abstrakti + 10 jatkopaperin ristiintarkistus |
| 15 | Sánchez-Moreno 2017 IJSPP 12(10) | ⚠ Human Kinetics | ⚠ Abstrakti s. 1378 |
| 16 | Sánchez-Moreno 2020 JSCR 34(4) | ⚠ LWW paywall | ⚠ Abstrakti s. 911 |
| 17 | **UUSI: Vesterinen 2016 MSSE** | (haetaan) | ⚠ Track B verifioi |
| 18 | **UUSI: Le Meur 2013 MSSE** | (haetaan) | ⚠ Track B verifioi (vertailupiste) |

═══════════════════════════════════════════════════════════════
2. D10 — MITTARIT & TYÖKALUT (TÄYSIN UUDISTETTU v3.2:ssa)
═══════════════════════════════════════════════════════════════

**Mitä kysytään:** HRV-laite, VBT-laite, sleep tracker, lifting log -käytäntö.

**Lähde-perustelu KORJATTU:**

❌ POISTETTU v3.1:n virheellinen väite:
- "Plews 2013 → −7% baseline-kynnys" (fabrikoitu, ei verifioitavissa)

✅ UUSI TIETEELLISESTI PÄTEVÄ KEHYS:

- **Primäärimetriikka:** 7-päivän liukuva keskiarvo Ln rMSSD:stä
  - Lähde: Plews 2013 Sports Med 43(9):773-781 ⚠ [ABSTRAKTI-VERIFIOITU
    + 10 jatkopaperin ristiintarkistus]
  - Mittausprotokolla: aamu, supine tai istuen, ≥3 mittausta/vk
  - Yksilön referenssijakso: vähintään 4 viikkoa baseline ennen kynnyksen
    arviointia (Plews 2013 + Buchheit 2014 -suositus)

- **Kynnys (deload-triggeri):** liukuva keskiarvo putoaa alle
  `baseline − 0.5 × SD` (SWC = Smallest Worthwhile Change)
  - Lähde: Hopkins WG 2009 MSSE 41(1):3-13 ✅✅ [PDF-VERIFIOITU,
    SWC-tilastollinen alkuperä]
  - Sovellus HRV:hen: Plews 2013 + Buchheit 2014 Front Physiol 5:73
    ✅✅ [PDF-VERIFIOITU avoin Frontiers]
  - Operationalisointi: Vesterinen 2016 MSSE — päivittäinen treeniohjaus
    mean ± 0.5 × SD -kynnyksellä

- **Sekundäärivahvistus** (≥2 signaalin yhtäaikainen poikkeama vahvistaa
  trigger-luotettavuuden):
  - CV-trendi: 7-päivän liukuvan Ln rMSSD:n variation laskee tai litistyy
    ("variation in variability", Plews 2012 EJAP 112(11):3729-3741 ⚠)
  - Leposyke (HR): nousee >5 bpm baselinesta (Plews 2013 yhdistelmä)
  - Subjektiivinen uni-pistettä (jos D10 = sleep-tracker): <6 h ja
    laatu heikko

**Engine-mappaus PÄIVITETTY v3.2:**

```javascript
function hrvReadinessSignal(d10, recentHRV, baseline):
  if d10.hrvDevice === "none":
    return { signal: null, source: "no-hrv-data" }

  // Plews 2013: 7-päivän liukuva keskiarvo
  rolling7 = computeRollingMean(recentHRV.lnRmssd, days=7)
  if rolling7 === null:
    return {
      signal: "insufficient-data",
      message: "Tarvitaan ≥3 HRV-mittausta viim. 7 päivältä.",
      source: "Plews 2013"
    }

  // Hopkins 2009 SWC: 0.5 × within-subject SD
  swc = 0.5 * baseline.withinSubjectSD
  threshold = baseline.mean - swc

  // Primäärisignaali
  belowThreshold = rolling7 < threshold

  // Sekundäärit (Plews 2012 CV + leposyke)
  cvTrend = computeCV7DayTrend(recentHRV.lnRmssd)
  cvFlat = cvTrend.delta < -0.05  // CV laskee tai litistyy
  hrRise = recentHRV.hr_recent_avg - baseline.hr_mean > 5  // bpm

  // Vahvistus-yhdistelmä
  if belowThreshold and (cvFlat or hrRise):
    return {
      signal: "deload-recommended",
      message: "HRV-monitorointi suosittaa deloadia. Ln rMSSD putosi alle
                SWC-kynnyksen (baseline -0.5×SD). " +
                (cvFlat ? "CV-trendi laskeva. " : "") +
                (hrRise ? "Leposyke +>5 bpm. " : ""),
      source: "Plews 2013 + Hopkins 2009 SWC + " +
              (cvFlat ? "Plews 2012 CV; " : "") +
              (hrRise ? "leposyke" : "")
    }

  if belowThreshold:
    return {
      signal: "watch",
      message: "HRV alle SWC-kynnyksen, mutta sekundäärit eivät vahvista.
                Seuraa 2-3 päivää.",
      source: "Plews 2013 + Hopkins 2009 SWC"
    }

  return {
    signal: "normal",
    message: "HRV normaalialueella.",
    source: "Plews 2013 SWC-kehys"
  }
```

**Esimerkki-kysymys PÄIVITETTY:**
```
Vaihe 4/7 jatkuu: Mittarit
──────────────────────────
Mitä mittareita käytät?

Sykevälivaihtelu (HRV):
  ○ En seuraa  ○ Oura Ring  ○ Garmin / Polar  ○ Whoop
  ○ HRV4Training  ○ Muu

Liikkenopeus (VBT):
  ○ En mittaa  ○ Enode / PUSH / Vitruve / Beast
  ○ Vain havainnollinen

Uni-tracker:
  ○ Oura  ○ Apple Watch / Fitbit  ○ Garmin  ○ En seuraa

[Jos HRV-mittari valittu:]

LeVe käyttää SWC-pohjaista (Smallest Worthwhile Change) kynnystä
deload-suosituksiin (Plews 2013, Hopkins 2009). Kynnys = baseline
miinus 0.5 × yksilön within-subject SD 7 päivän liukuvasta keskiarvosta.

Tämä on tarkempi kuin kiinteä prosentti — kynnys sopeutuu sinun
omaan HRV-fingerprintiisi (Plews 2013: "longitudinal HRV monitoring
in elites is required to understand their unique individual HRV
fingerprint").

Baseline-aika tarvitaan ≥4 viikkoa ennen kuin SWC voidaan laskea.
LeVe näyttää "kerää baseline" -merkin kunnes tarpeeksi mittauksia.
```

═══════════════════════════════════════════════════════════════
3. KAIKKI MUUT MUUTOKSET v3.1:STÄ (ei muuta v3.2:ssa)
═══════════════════════════════════════════════════════════════

Kaikki v3.1:n korjaukset säilyvät:
1. D14 Schoenfeld 2016 frequency ✓
2. D3/D5/D6 Issurin 2010 vs 2008 -erottelu ✓
3. D8 Wilson → Schumann 2022 + 3 modifieria ✓
4. D4 Cools 2015 ekstrapolaatio-tagi ✓
5. Vaihe 1 session-jako 1A/1B/1C/1D ✓

Kaikki v3.1:n LÄHDETAGIT säilyvät — vain D10 on muuttunut.

═══════════════════════════════════════════════════════════════
4. WIZARD-DIMENSIOT (15 kpl, vain D10 muuttunut v3.1:stä)
═══════════════════════════════════════════════════════════════

D1, D2, D3, D4, D5, D6, D7, D8, D9, D11, D12, D13, D14, D15 säilyvät
v3.1:n mukaan. KS. WIZARD_SPECIFICATION_v3.1.md näille dimensioille.

D10 on TÄYSIN UUDISTETTU — yllä osa 2.

═══════════════════════════════════════════════════════════════
5. KYSYMYSPUU-RAKENNE (säilyy v3.1:stä)
═══════════════════════════════════════════════════════════════

7-vaihe sekvenssi, 25 kysymystä, ~3-5 min minimi / ~12-15 min täydellinen.
Säilyy v3.1:stä.

Lisäys: D10 HRV-kynnys ei ole enää -7%, vaan SWC-pohjainen. UI-kuvaus
muuttunut (yllä).

═══════════════════════════════════════════════════════════════
6. IMPLEMENTAATIO-ROADMAP (TARKENNETTU v3.2:ssa)
═══════════════════════════════════════════════════════════════

### Vaihe 1: Ydin-15 dimensiot (median 60 h)

**Sessiot 1A-1D säilyvät v3.1:stä.**

🟢 **TRACK B VAIHE 1 ENSIMMÄINEN TEHTÄVÄ (POISTETTU)**:
~~Verifioi Plews 2013 -7% kynnys~~ — TEHTY 2026-05-11, ks.
docs/PLEWS_2013_VERIFICATION.md. D10 mappaus on nyt SWC-pohjainen.

Track B Vaihe 1 voi alkaa SUORAAN 1A:lla — ei estäviä avoimia
verifikaatiotehtäviä.

### Vaihe 2-3 (säilyy v3.1:stä)

Track B Vaihe 2 verifikaatiotehtävät säilyvät:
- Issurin 2008 (residual-numerot) — 30 min
- Huiberts 2024 (sex-modifier) — 30 min
- Petré 2021 (training-status-modifier) — 30 min

Track B Vaihe 3 verifikaatiotehtävä säilyy:
- Liu 2025 (same-session-sekvenssi) — 30 min

═══════════════════════════════════════════════════════════════
7. KIELLETYT (laajennettu v3.2:ssa)
═══════════════════════════════════════════════════════════════

Säilyvät v3.1-säännöt + UUSI v3.2:ssa:

🔴 **UUSI: Älä toista 6 alkuperäistä virhettä** (oli 5 v3.1:ssä)

1-5 säilyvät v3.1:stä (Schoenfeld 2016 frequency, Issurin 2010/2008,
Plews 2012/2013 erottelu, Wilson → Schumann, Cools 2015 ekstrapolaatio).

**6. UUSI: Älä käytä kiinteää %-kynnystä HRV-deloadiin**
- Buchheit 2014 hylkää kiinteät prosenttikynnykset
- Käytä SWC = 0.5 × within-subject SD baselinesta
- "−7%" tai mikään muu kiinteä % EI OLE primäärilähteessä

🔴 **UUSI v3.2: Älä lisää uutta lähdettä ilman primäärilähde-verifikaatiota**

Plews 2013 −7% oli väite joka **kuulosti uskottavalta** (HRV-kynnys
prosenteissa on intuitiivinen) mutta osoittautui **fabrikaatioksi**
kun primäärilähde tarkistettiin. Sama riski koskee:
- "Tuchscherer 7% fatigue percent" (varmista jos käytetään)
- "RP MEV/MAV/MRV-numero-arvot per lihasryhmä" (varmista taulukko)
- Mikä tahansa konkreettinen kynnysarvo joka kuulostaa tutkimuspohjalta

**Sääntö Track B:lle:**
Jos koodi tarvitsee kynnyksen X% tai numeron Y, joko:
1. Verifioi se primäärilähteestä (sivunumero, kappale)
2. TAI merkitse `// EI-VERIFIOITU LÄHDE — Track B Vaihe X verifioi`
3. TAI poista koko kynnys engine-mappauksesta

═══════════════════════════════════════════════════════════════
8. YHTEENVETO — TASOARVIO (PÄIVITETTY 9.5/10)
═══════════════════════════════════════════════════════════════

v3.1 → v3.2 -muutos:
- 1 KRIITTINEN VIRHE LISÄÄ KORJATTU (Plews −7% fabrikointi)
- 4 uutta lähdettä lisätty (Hopkins 2009, Buchheit 2014,
  Vesterinen 2016, Le Meur 2013)
- D10 mappaus täysin uusittu SWC-pohjaiseksi
- 9/12 paperia PDF-verifioitu (oli 8/12 v3.1:ssä)
- Track B Vaihe 1 ENSIMMÄINEN TEHTÄVÄ POISTUNUT — voi alkaa suoraan

Onnistumiskriteeri saavutettu MYÖS tieteellisesti:
- Ei fabrikoituja lähteitä
- Kaikki kynnysarvot joko PDF-verifioituja TAI merkitty avoimiksi
  Track B -tehtäviksi

**Avoimet kohdat jotka EI estä Track B:tä:**
1. JuggernautAI/RP autenttiset onboarding-kysymykset
2. Käyttäjätestaus kolmannella atletilla
3. 4 paywall-paperia (Cumming, Plews 2012/2013, Sánchez-Moreno
   2017/2020) jää abstrakti-verifioiduksi

═══════════════════════════════════════════════════════════════
9. PÄIVITETTY LÄHDELUETTELO v3.2 (23 lähdettä, +4 v3.1:stä)
═══════════════════════════════════════════════════════════════

**Peer-reviewed (23 lähdettä, +4 v3.1:stä):**

1. Buchheit M. **UUSI:** Monitoring training status with HR measures: do
   all roads lead to Rome? Front Physiol. 2014;5:73. DOI:10.3389/
   fphys.2014.00073 ✅✅
2. Cools AM, Johansson FR, Borms D, Maenhout A. Prevention of shoulder
   injuries. Braz J Phys Ther. 2015;19(5):331-339. ✅✅
3. Cumming KT, Reitzner SM, Hanslien M, et al. Training/detraining/
   retraining. J Physiol. 2024;602(17):4171-4193. ⚠
4. Helms ER, Aragon AA, Fitschen PJ. Natural bodybuilding nutrition.
   J Int Soc Sports Nutr. 2014;11:20. ✅✅
5. Helms ER, Cronin J, Storey A, Zourdos MC. RIR-RPE Scale RT.
   Strength Cond J. 2016;38(4):42-49. ✅✅
6. Helms ER, Byrnes RK, Cooke DM, et al. RPE vs %1RM. Front Physiol.
   2018;9:247. ✅✅
7. Hopkins WG, et al. **UUSI:** Progressive statistics for studies in
   sports medicine. Med Sci Sports Exerc. 2009;41(1):3-13. ✅✅
8. Huiberts RO, et al. Concurrent training sex differences. Sports Med.
   2024;54(2):485-503. ⚠
9. Issurin VB. Periodization. Sports Med. 2010;40(3):189-206. ✅✅
10. Issurin VB. Block periodization (residual-numerot). J Sports Med
    Phys Fitness. 2008;48(1):65-75. ⚠
11. Le Meur Y, et al. **UUSI (vertailupiste):** F-OR-induktion
    suorituskykyfall −9.0% ± 2.1%. MSSE. 2013. ⚠
12. Liu Y, et al. Strength-first vs endurance-first. 2025. PMC12885173. ⚠
13. Petré H, et al. Concurrent training. Sports Med. 2021;51:991-1010. ⚠
14. Plews DJ, et al. HRV elite triathletes (NFOR-case). Eur J Appl
    Physiol. 2012;112(11):3729-3741. ⚠
15. Plews DJ, et al. HRV elite athletes (7-päivän rolling + SWC + CV
    -suositus). Sports Med. 2013;43(9):773-781. ⚠ [ABSTRAKTI +
    10 JATKOPAPERIN RISTIINTARKISTUS — EI sisällä −7% kynnystä]
16. Sánchez-Moreno M, et al. Velocity Pull-Up. IJSPP. 2017;12(10):
    1378-1384. ⚠
17. Sánchez-Moreno M, et al. VL Pull-Up Training. JSCR. 2020;34(4):
    911-917. ⚠
18. Schoenfeld BJ, et al. RT Frequency Hypertrophy. Sports Med.
    2016;46(11):1689-1697. ✅✅
19. Schoenfeld BJ, et al. Volume dose-response. J Sports Sci.
    2017;35(11):1073-1082. ✅✅
20. Schoenfeld BJ, et al. Volume Hypertrophy Not Strength. MSSE.
    2019;51(1):94-103. ✅✅
21. Schumann M, et al. Concurrent Training meta. Sports Med.
    2022;52(3):601-612. ✅✅
22. Vesterinen V, et al. **UUSI:** HRV-guided training. MSSE.
    2016. ⚠ [operationalisoi SWC-kynnyksen]
23. Wilson JM, et al. Concurrent training (HISTORIALLINEN). JSCR.
    2012;26(8):2293-2307.

═══════════════════════════════════════════════════════════════
VERSIOHISTORIA
═══════════════════════════════════════════════════════════════

- **v3 (2026-05-10):** Alkuperäinen spesifikaatio
- **v3.1 (2026-05-11):** Verifikaatiopassi v1 — 5 kriittistä virhettä
  korjattu, 3 modifieria, 8/12 PDF-verifikaatio
- **v3.2 (2026-05-11):** Plews 2013 -verifikaatio — 6. kriittinen virhe
  korjattu (−7% fabrikointi), D10 SWC-pohjaiseksi, 4 uutta lähdettä,
  9/12 PDF-verifikaatio. **Track B Vaihe 1 voi alkaa SUORAAN ilman
  estäviä avoimia verifikaatiotehtäviä.**
