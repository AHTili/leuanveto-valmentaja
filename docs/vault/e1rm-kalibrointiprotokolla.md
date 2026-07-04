# Kalibrointiprotokolla (cal-sessiot)

**Status:** VERIFIOITU-INVARIANTTI (protokollan tarkkuusperusta) + TOTEUTETTU-HEURISTIIKKA (tuoreusikkuna)
**Lähteet:** DiStasio 2014 (low-rep e1RM-tarkkuus ±2,7 kg vs AMRAP ±5+ kg); Helms MASS 2023; OBS-052 v2 (cal-as-driver, 2026-06-23)
**Koodiankkurit:** engine.js:364 (`freshCalibSets`), `CAL_FRESHNESS_DAYS` 42 (~335), cal-override e1rmValues-polussa, test-runner.js OBS-048/052-testit

Protokolla (v4.32.8, korvasi AMRAP@85 %:n): **92 % × 3 @ V1** (RPE 8). Perustelu: low-rep-arvion tarkkuus ±2,7 kg vs AMRAP-extrapoloinnin ±5+ kg (DiStasio), matalampi CNS-kuorma → turvallinen myös deload-viikolla. Cal-sessiot ohjelmoitu vk 4/8/12 (deload-viikot).

**Cal-as-driver (OBS-052 v2):** tuorein cal-sarja AJAA e1RM:ää niin kauan kuin se on ≤ 42 pv (`CAL_FRESHNESS_DAYS`) **tuoreimmasta lokisetistä** — huom. DATA-relatiivinen ikkuna, ei wall-clock (→ immuuni testien aikapommeille ja lomataukojen kellodriftille). Yli ikkunan cal vanhenee ajurina, mutta DEFLATION-lattia (cal-min/cfg-PR × 0,95) pitää kuorman silti ~−5 %:ssa. Kadenssi-opetus (OBS-052 v1): "most-recent-X drives" -mekanismi on verifioitava todellista aikataulua vasten — v1 oli inertti 3/4 ajasta koska cal vain vk 4/8/12.

Data-sykli-periaate (Akselin ratifioima): vk 4/8/12 cal + Block AI Tuning + velocity-data korjaavat e1RM-näkymät automaattisesti — koodikorjauksia EI aina tarvita, luvut korjaa protokolla.

**8a-huomio:** cal-protokollan intensiteetti (92 %) ja tuoreusikkuna (42 pv) ovat protokolla-parametreja; 42 pv on "ainoa säädettävä tuoreusparametri" (koodikommentti) ja mahdollinen 8a-kandidaatti (`learnedCalFreshnessDays`, prior 42, haarukka ~[28; 56] = 1–2 mesosykliä).

**Linkit:** [[e1rm-epley-vara-kaava]], [[e1rm-plan-based-inversio]], [[e1rm-inflaatio-deflaatio-capit]], [[progressio-deload-protokolla]]
