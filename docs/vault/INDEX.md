# LeVe-tutkimusvault — INDEX

> **Tarkoitus:** Tämä vault on LeVe AI:n tutkimusperustan drift-resistentti totuuslähde noottitasolla. Se palvelee kolmea käyttöä: (1) **vaiheen 8a opittavien parametrien priorit** — alla oleva prior-taulukko on 8a-toteutuksen suora syöte; (2) **AI Block Tuning -briiffin** tausta-aineisto (mihin tutkimukseen kukin mekanismi nojaa ja mikä on heuristiikkaa); (3) **sessioiden välinen muisti**, joka estää "rikkinäisen puhelimen" -ajautuman: väite joka ei ole nootissa, koodissa tai `audit-baselines.mjs`:ssä ei ole lähde.

## Lukuohje

- **Numeroarvojen totuuslähde ei ole tämä vault.** Koneluettava totuuslähde on `tools/engine-pilot/lib/audit-baselines.mjs` ja viime kädessä koodi (CLAUDE.md §7: repo voittaa). Nootit dokumentoivat kontekstin, rationalen ja tutkimuslähteen — jos nootin numero ja koodin numero eroavat, koodi voittaa ja nootti korjataan.
- **Status-kenttä** kertoo epistemologisen tason: `VERIFIOITU-INVARIANTTI` (vertaisarvioitu lähde + ENG-14-valvonta) vs. `TOTEUTETTU-HEURISTIIKKA` (design-päätös tai käytäntösynteesi ilman suoraa RCT-pohjaa). Heuristiikkaa ei saa esittää invarianttina briiffeissä.
- **Koodiankkurien rivinumerot ajautuvat** commitien myötä — käytä niitä lähtöpisteenä, älä sokeana totuutena.
- **8a-prior-osio** jokaisen nootin lopussa nimeää opittava-kandidaatit ja niiden clamp-rajat. Kandidaatti ilman ratifioituja tutkimusrajoja EI ole valmis 8a-toteutukseen (merkitty taulukossa).
- **Kaksoishakasulkeiset linkit** ovat vault-sisäisiä viittauksia (tiedostonimi ilman `.md`-päätettä). Linkkieheys tarkistettu 2026-07-04.

## Sisällysluettelo

### Readiness (8 noottia)

- [[readiness-2of3-saanto-velocity-veto]] — kolmen kanavan yhdistely `combineReadiness()`:ssä: enemmistölogiikka + velocityn asymmetrinen veto-oikeus + capLevel-mappaus.
- [[readiness-z-luokittelu-mad-sigma]] — z-luokittelu robustilla mediaani+MAD-sigma-baselinella (1,4826 × MAD), rajat −0,5/−1,0 ja konservatiivinen rajatulkinta.
- [[readiness-hrv-lnrmssd-oura]] — HRV-kanava: Oura ms → lnRMSSD, Plews 2013 rolling-7-baseline + fallback ja −7 %:n fabrikaatiokorjaus SWC-kehykseen.
- [[readiness-vara-kanava]] — Vx = RIR-identiteetti, RPE = 10 − Vx, overshoot-pohjainen luokittelu ja suuntakonventio; erotus varaFeedback/varaTrendCorrection-mekanismeista.
- [[readiness-cap-only-periaate]] — readiness rajoittaa (`Math.min`) muttei pakota; accessory-itsenäisyys ja 3/3-RED-sääntö (−30 % apuvolyymi).
- [[readiness-vx-bump-load-reduction]] — RED/YELLOW-kuormanvähennys (−5 %/−8 %/−2 %), heavy→volume-vaihto ja Vx-bump; ero mesosyklin deloadiin.
- [[readiness-grindy-bias-detektio]] — ≥ 3/8 sessiota VBT_E1RM_CROSSCHECK SIGNIFICANT → hybridi target-RIR valitsee turvallisemman varan.
- [[readiness-capacity-bump-ekan-sarjan-helppous]] — ekan sarjan helppous: next-session +1–1,5 % ja intra-session +2,5–5 % (confirm-pohjainen), vain heavy-primary.

### Progressio (9 noottia)

- [[progressio-mesosyklirakenne]] — 4 viikon blokki, deltaPctBase-viikkokertoimet (drift-varoitus: vk 3 = 0,035), DAY_TYPE_MULTIPLIERS ja maxDelta-hard-clamp.
- [[progressio-helms-viikkoprogressio]] — Helms 2018: +2,5 %/vk PR-vaiheessa ja Vx-mismatch 2 %/Vx session-välillä (puolitettu); PLAN_BASED-kaksoiskirjaussuoja.
- [[progressio-deload-protokolla]] — invariantti C: deload −20…−30 % (koneellinen lähde DELOAD_DELTA_RANGE), kolmikerroksinen deload-tunnistus, ENG-14-valvonta.
- [[progressio-tier-progressio-latella]] — Latella 2020 tier-kertoimet (elite ≤ 0,05×/vk), naiskerroin 0,55, streetlifting_16w-poikkeus, epistemologinen status.
- [[progressio-computeprogressiontarget]] — päätösjärjestys: yliajot, V0-grindisuoja, regain-multiplier, Vx-säätö, plan-floor, hard-cap +15 %/vk, floor-cap.
- [[progressio-across-set-vasymysmalli]] — K3-1 symmetrinen väsymysmalli: allowance 0,25/sarja (cap 1,25), positiokrediitti 0,5 (cap 2,5), SUSTAINABILITY_CAP + demonstroitu taso.
- [[progressio-suggestion-tierit]] — SAFE/TARGET/AGGRESSIVE (±1,5 pp), K-A2 e1RM-monotonia, 6 suppression-syytä, effectiveBias + aggressivenessLearned.
- [[progressio-heavy-first-reankkurointi]] — heavy-first-järjestys (M14) + K3-2: ykkösen e1RM re-ankkuroi työsarjat vain alaspäin samalla aritmetiikalla kuin recommend().
- [[progressio-monipuolisuus-tikapuut]] — KORI 8: `suggestProgressionTool` deterministinen ladder (toistot/sarjat/tiheys/tempo/mikrokuorma) jumitukseen ennen liikkeen vaihtoa; advisory, ei kompoundautumisriskiä; UI-trigger = tasanne ("Ylläpito →").

### Failure (7 noottia)

- [[failure-refalo-kuormapudotus]] — invariantti E: V0:n jälkeinen −5 % (Refalo 2023, FAILURE_DROP_BASELINE) + K3-3 D1-v2 -laajennus ja near-failure-porrastus.
- [[failure-strategiat-abc-blokeittain]] — failureReaction-strategiat A/B/C blokeittain: stop-kynnykset, nextWeekLoadAdjust, Tuchschererin 2-failure rule.
- [[failure-isolation-poikkeus]] — isolation-liikkeen last-set V0 = normaali hypertrofiastimulus; ISO-NORMAL/ISO-MID-haarat ja ISOLATION_CATEGORIES-luokitus.
- [[failure-intra-session-h017-d1]] — H-017 D1 intra-session-autoregulaatio (vain alaspäin): gatet 1–4, min-tae, ärsykelattia 0,75, H-016-yhteensovitus.
- [[failure-tauko-reload-h016]] — liike-tason paluuramppi: RELOAD_CONFIG (14 pv, 12,5–20 %), toteuma-ankkuroitu ramppi, cal-re-entry-ohitus, min-precedence.
- [[failure-break-detektio-ja-globaali-paluu]] — globaali break-detektio (portaat −5/−10/−15 %), mesocycleBreakReset ja granulariteettiraja liike-tason reloadiin.
- [[failure-post-break-ankkurikatto-k2b]] — K2b: ≥ 14 pv:n gap evidenssi-ikkunassa → ankkuri = min(nykyinen, post-break-paras × 1,05); Haara C apuliikkeille.

### e1RM (4 noottia)

- [[e1rm-epley-vara-kaava]] — Epley + Vara: system- vs. accessory-haara, Vx-defaultien ero, käänteiskaava `vRepsToExpectedPct`, tunnetut tarkkuusrajat.
- [[e1rm-plan-based-inversio]] — PLAN_BASED perfect-execution-ohitus + system-%-inversiokontrakti (`planBasedInvertE1RM`, S10-juurikorjaus, 4 lokusta jaetulla helperillä, F-3-lukko S10b).
- [[e1rm-kalibrointiprotokolla]] — cal 92 % × 3 @ V1 (DiStasio ±2,7 kg), cal-as-driver + data-relatiivinen 42 pv tuoreusikkuna (OBS-052 v2), data-sykli-periaate.
- [[e1rm-inflaatio-deflaatio-capit]] — ceiling 1,05 + B+ streak-bonus, floor 0,95, cfg-drift (tuotannossa oleva opittava) ja F-3-arvoresoluutiokartta lukkotesteineen.

### Volyymi (3 noottia)

- [[volyymi-viikkovolyymi-lihasryhmittain]] — K4-1: suunniteltu viikkovolyymi lihasryhmittäin, suora/epäsuora-painot (1,0/0,5) ja MEV/MAV-bandit; näkyvyys, ei cap.
- [[volyymi-mrv-kategoriakohtainen]] — MRV_SETS_PER_CATEGORY-katot (14–22 sarjaa/vk), puhtaasti visuaalinen käyttö ja volyymilandmarkkien drift-riski.
- [[volyymi-weekly-stimulus]] — toteutuneen datan aggregaatit: vetosarjat, tonnage, heavy-altistukset (reps + Vx ≤ 4) ja eliteVolumeCheck-kynnykset.

### VBT (3 noottia)

- [[vbt-vl-cap-blokeittain]] — invariantti A: VL-capit blokeittain (Foundation 30 → Peaking 7,5 %, Pareja-Blanco-haarukoiden keskipisteet), within-set-stop cap-only-periaatteella.
- [[vbt-rtf-malli-ja-mpv-slope]] — invariantti B: rep1-MPV ~0,045 m/s/RIR (Sánchez-Moreno) populaatiopriorina + yksilöllinen RTF-regressio r²/n-portteineen (Jukic), MVT-ankkurit.
- [[vbt-promote-portti-ja-crosscheck]] — reliability-portti (10 ankkuria/28 pv, hystereesi 5/8 %, freshness 14/21 pv), PLAN_BASED-prioriteetti, e1RM-ristiinveto (SIGNIFICANT 7 %) + grindy-bias-kytkös.

## 8a-prior-kandidaatit (vaiheen 8a suora syöte)

Säännöt (CLAUDE.md §2): prior tutkimusarvosta, posterior terävöityy vain ±2 SD:n sisällä, karkaava arvo → `LEARNED_PARAM_OUTLIER` + clamp. Sarake "Valmis 8a:han" = tutkimusrajat ratifioitu.

| Parametri | Prior | Tutkimusrajat (clamp) | Valmis 8a:han | Nootti |
| --- | --- | --- | --- | --- |
| `learnedFailureDropPct` | 0,05 | [0,04; 0,06] (FAILURE_DROP_BASELINE ± tolerance) | kyllä (huom.: E-kanavalla ei runtime-trace-katetta) | [[failure-refalo-kuormapudotus]] |
| `learnedDeloadDeltaPct` | −0,25 | [−0,30; −0,15] (DELOAD_DELTA_RANGE) | kyllä | [[progressio-deload-protokolla]] |
| `learnedTierMult.elite` | 0,05 | [0; 0,05] — yksisuuntainen katto; muut tierit omaan max-rajaansa | kyllä | [[progressio-tier-progressio-latella]] |
| `learnedWeeklyProgressionPct` | 0,025 | [0,015; 0,035]; lisäksi tulo weekly × tierMult ENG-14-valvonnassa | kyllä | [[progressio-helms-viikkoprogressio]] |
| `learnedVxToLoadPct` | 0,02 | [0,01; 0,03] (Helmsin 4 %/RPE session-sisäinen yläraja) | kyllä | [[progressio-helms-viikkoprogressio]] |
| `learnedRegainMultiplierFar` | 2,0 | [1,5; 2,5] (Psilander-yläraja) | kyllä | [[progressio-computeprogressiontarget]] |
| `learnedHardCapPerWeek` | 0,15 | [0,10; 0,20] | kyllä | [[progressio-computeprogressiontarget]] |
| `learnedV0Penalty` | −0,05 | [−0,08; −0,03]; koherenssi invariantin E kanssa pakollinen | kyllä | [[progressio-computeprogressiontarget]] |
| `learnedAcrossSetFatigue` | 0,5 eff-toistoa/sarja | [0,25; 0,75]; preskriptio + estimointi + re-ankkurointi opittava YHDESSÄ | **TOTEUTETTU (8a V1, v4.53.1)** — ko-opittavuus pidetty | [[progressio-across-set-vasymysmalli]] |
| `aggressivenessLearned` | 0 | [−1; +1] (kova koodiclamp; jo tuotannossa) | tuotannossa | [[progressio-suggestion-tierit]] |
| suggestion-spacing (ehdollinen) | 0,015 | [0,01; 0,02] + K-A2-monotonia rakenteellisena ehtona | ehdollinen | [[progressio-suggestion-tierit]] |
| z-raja `greenBoundary` | −0,5 σ | [−0,75; −0,25] (SWC-ankkuri HRV-kanavalla) | kyllä | [[readiness-z-luokittelu-mad-sigma]] |
| z-raja `yellowBoundary` | −1,0 σ | [−1,5; −0,75] (heuristinen, ei suoraa ankkuria) | osin | [[readiness-z-luokittelu-mad-sigma]] |
| `hrvReadinessBoundarySwc` | 0,5 × SD | [0,4; 0,6] (Buchheit 2014 / Vesterinen 2016) | kyllä (edellyttää SWC-natiivia toteutusta) | [[readiness-hrv-lnrmssd-oura]] |
| `varaReadinessRedThreshold` | 2,0 Vx | [1,5; 2,5] (heuristinen; rajat eivät saa mennä päällekkäin) | osin | [[readiness-vara-kanava]] |
| `varaReadinessYellowThreshold` | 1,0 Vx | [0,5; 1,5] | osin | [[readiness-vara-kanava]] |
| `readinessRedLoadReduction` | −0,05 | [−0,08; −0,03] | osin (heuristinen prior) | [[readiness-vx-bump-load-reduction]] |
| `readinessDoubleRedReduction` | −0,08 | [−0,12; −0,05] | osin | [[readiness-vx-bump-load-reduction]] |
| `readinessYellowLoadReduction` | −0,02 | [−0,04; −0,01] | osin | [[readiness-vx-bump-load-reduction]] |
| grindy-bias-osuuskynnys | 0,375 (3/8) | [0,25; 0,5] | osin (heuristinen) | [[readiness-grindy-bias-detektio]] |
| `firstSetBonusPerClass` | 0,010/luokka | clamp ±0,005, cap 0,015 | osin | [[readiness-capacity-bump-ekan-sarjan-helppous]] |
| `intraSessionBonusPerClass` | 0,025/luokka | clamp ±0,005, cap 0,05 | osin | [[readiness-capacity-bump-ekan-sarjan-helppous]] |
| `capacityBonusMinOvershoot` | 2 Vx | lukitaan ≥ 2 (alempi laukeaisi kohinasta) | osin | [[readiness-capacity-bump-ekan-sarjan-helppous]] |
| `learnedEpleyDivisor` | 30 | EI ankkuroitu — vaatii oman syvätutkimuskierroksen | ei | [[e1rm-epley-vara-kaava]] |
| system-haaran Vx-default | 1 | [0; 1,5] (atletti-spesifi raportointibias-prior) | osin | [[e1rm-epley-vara-kaava]] |
| `learnedMrv[kategoria]` | MRV_SETS_PER_CATEGORY-arvo | EI määritelty — vaatii ratifioinnin (RP-landmarkit eivät peer-reviewed) | ei | [[volyymi-mrv-kategoriakohtainen]] |
| band-rajat (MEV/MAV) | 4/10/20 eff-sarjaa | EI määritelty — vaatii ratifioinnin | ei | [[volyymi-viikkovolyymi-lihasryhmittain]] |
| `learnedVlCap.<blokki>` | esim. strength 0,175 | tutkimushaarukka per blokki (esim. strength [0,15; 0,20]) — CLAUDE.md §2:n A1-esimerkki | kyllä | [[vbt-vl-cap-blokeittain]] |
| `learnedRep1MpvSlope` | 0,045 m/s/RIR | Sánchez-Moreno ±2 SD -haarukka | kyllä | [[vbt-rtf-malli-ja-mpv-slope]] |
| `learnedVxOvershootBonus` | 0,025/luokka | [0,015; 0,035] (Helms/Tuchscherer-haarukka) | kyllä | [[e1rm-plan-based-inversio]] |
| `learnedCalFreshnessDays` | 42 pv | [28; 56] (1–2 mesosykliä) | osin (heuristinen prior) | [[e1rm-kalibrointiprotokolla]] |

**Eksplisiittisesti EI-opittavat** (nooteissa perusteltu): failure-strategiajako A/B/C, isolation-luokitussääntö, H-016-reload-matriisi (reunaehto b: staattinen), H-017-gatet ja ärsykelattia 0,75, K2b-headroom 1,05, break-detektion portaat (prior verifioimatta), suppression-ehdot.

## Tunnistetut aukot

Vertailu: `docs/TUTKIMUS_INVARIANTIT.md` (invariantit A–H) ja `engine.js`:n tutkimusviitteet. Aukko = tutkimusalue/parametri, jota mikään vault-nootti ei kata.

*Päivitys 2026-07-04: alkuperäisistä 16 aukosta suljettiin 7 kriittisintä (VBT-domain: invariantit A+B, promote-portti, crosscheck · e1rm-domain: PLAN_BASED-inversio, kalibrointi, capit+F-3). Jäljellä 9:*

1. **Liikekohtaiset MVT-arvot** (González-Badillo/Sánchez-Medina: penkki ≈ 0,17, kyykky ≈ 0,30, maastaveto ≈ 0,14 m/s; engine.js:2652–2674) — [[vbt-rtf-malli-ja-mpv-slope]] sivuaa, oma nootti puuttuu.
2. **Velocity-readiness-kanava** (Sánchez-Medina & González-Badillo 2011 velocity–fatigue; VL25/VL50-kynnykset engine.js:1036–1068). Readiness-nootit viittaavat kanavaan, mutta sen omaa mekanismia (rep1-velocity vs. baseline) ei ole dokumentoitu.
3. **RTF_MODEL_THRESHOLDS-porttiarvot** (reliable/preview-rajojen numeeriset arvot ja rationale) — [[vbt-rtf-malli-ja-mpv-slope]] kuvaa porttirakenteen, ei numeroita.
4. **Invariantti F — Issurin-blokkiresiduaalit** (`ISSURIN_BLOCK_RESIDUALS`, `generateMultiBlockMesocycle`, `pickBlockSequence`) — mesosyklirakenne-nootti sivuaa Issurinia, mutta residuaalipäiviä ja blokkisekvenssiä ei kata mikään.
5. **Invariantti G — Block-phase target RIR** (`BLOCK_PHASE_TARGET_RIR`, engine.js:3820; Helms 2018 + Pareja-Blanco-vaiheittain) — käytetty grindy-bias- ja failure-nooteissa, ei omaa noottia.
6. **Invariantti H — Sex modifier** (Huiberts 2024 SMD; `SEX_MODIFIER`, `pickRecoveryCapacity`) — tier-nootti mainitsee vain Nuckols-naiskertoimen 0,55; Huiberts-invariantti kattamatta.
7. **Wizard-materialisaatio ja MEV-floor** — volyymi-nootit viittasivat `volyymi-wizard-mev-floor`-noottiin (pakottava MEV-lattia 10 hypertrofia-ohjelmissa) ja tier-nootti materialisaatioputkeen; kumpaakaan ei ole.
8. **Detraining-aikavakiot** — break-detektion portaat (−5/−10/−15 %) ovat käytäntöheuristiikkaa ilman kirjattua tutkimuspriota; nootti itse nimeää tämän syvätutkimuskohteeksi ennen 8a-kelpoisuutta.
9. **Volyymilandmarkkien totuuslähde ja rajat** — MRV/MEV/band-arvoille ei ole audit-baselines-tyylistä koneellista lähdettä, ja repo-sisäinen jännite (index.html:9141 vs. data.js:94) on auki; Schoenfeld-annos-vaste-metat tarvitaan rajojen ratifiointiin. Lisäksi engine.js:9061 (AI Block Tuning -lähdelista) viittaa lähteisiin Pelland 2024 ja Robinson 2025, joita mikään nootti ei dokumentoi.

**Priorisointisuositus:** aukot 1–3 (VBT-täydennykset) ja 5 (invariantti G) ensin — ne ankkuroivat jo-koodissa-olevia numeroarvoja; 8–9 vaativat syvätutkimuskierroksen ennen 8a-kelpoisuutta.
