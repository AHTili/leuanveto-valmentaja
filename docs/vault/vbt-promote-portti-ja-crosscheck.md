# VBT-promote-portti ja e1RM-ristiinveto

**Status:** TOTEUTETTU-HEURISTIIKKA (cowork-ratifioitu reliability-portti -malli)
**Lähteet:** cowork-arvioinnin reliability-portti (v4.34.27 c745adb); Häkkinen 2000 -proxy (freshness 14/21 pv, v4.38.4)
**Koodiankkurit:** engine.js:3276 (`computeVBTPromotionStatus`), engine.js:3261 (`VBT_ANCHOR_WINDOW_DAYS` 28), engine.js:4969 (`VBT_E1RM_CROSSCHECK`-trace), engine.js:3602 (grindy-bias-kytkös)

Velocity-pohjainen e1RM saa ajaa kuormaa VAIN reliability-portin läpi:

- **Ankkurivaatimus:** ≥ 10 (velocity, kuorma) -ankkuripistettä viimeisen 28 pv rullaavassa ikkunassa (`VBT_ANCHOR_WINDOW_DAYS`). Alle → `not-eligible`.
- **Promote/demote-hystereesi:** velocity-e1RM:n ja Vx-e1RM:n diff ≤ 5 % → `promoted`; jo promotettu sietää 8 %:iin asti (ei edestakaista flippailua); yli → `candidate`/demote.
- **Freshness-portit** (v4.38.4, Häkkinen-proxy): profiili vanhenee 14 pv (stale-varoitus) / 21 pv (pakotettu re-kalibrointi `VBT_FORCE_RECAL_DAYS`).
- **Prioriteettijärjestys:** PLAN_BASED voittaa promotenkin (`VBT_DEFERRED_TO_PLAN` — suunnitelma-uskollisuus > yksittäinen velocity-mittaus). Promote-arvo clampataan INFLATION/DEFLATION-ceiling/flooriin (v4.34.28: capit funktioscopessa jotta VBT-haara ei ohita niitä).

**Ristiinveto** (`VBT_E1RM_CROSSCHECK`, engine.js:4969): velocity-johdettu e1RM vs Vx-johdettu — diff ≥ 7 % → SIGNIFICANT-merkintä. Puhdas diagnostiikka ("ei vaikuta kuormaan"), mutta ≥ 3/8 sessiota SIGNIFICANT → [[readiness-grindy-bias-detektio]] (atletti ali-arvioi varansa systemaattisesti → hybridi-RIR valitsee turvallisemman).

Testiopetus (2026-07-04, FIXTURE_DRIFT): 28 pv ikkuna + wall-clock-default teki testifixtureista aikapommin — deterministinen `todayISO`-pinnaus on kutsusopimus testeissä.

**8a-huomio:** portin rajat (10 ankkuria, 5/8 %, 14/21 pv) ovat portti-parametreja — niitä EI opita datasta jota portti itse suodattaa (valikoitumisharha). Ei 8a-prioria.

**Linkit:** [[vbt-vl-cap-blokeittain]], [[vbt-rtf-malli-ja-mpv-slope]], [[e1rm-plan-based-inversio]], [[e1rm-inflaatio-deflaatio-capit]], [[readiness-grindy-bias-detektio]]
