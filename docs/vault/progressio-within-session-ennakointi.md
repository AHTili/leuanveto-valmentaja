# Within-session-ennakointi (MULL-3, #16)

**Status:** TOTEUTETTU-HEURISTIIKKA (johdettu K3-1-across-set-mallista + Epley-Vara-käänteiskaavasta; ei erillistä RCT-lähdettä — sama aritmetiikka kuin [[progressio-across-set-vasymysmalli]] ja [[e1rm-epley-vara-kaava]])
**Koodiankkurit:** engine.js `forecastSetSustainability` (8a-lohkon jälkeen), test-runner.js `test8dSustainabilityForecast`, index.html workout-hero (`forecastHTML`, venähdys-riski-bannerin sibling)

Asiantuntija-auditin (2026-07-06) syvin *valmentaja*-aukko: engine oli **reaktiivinen** — säiti vasta failuren jälkeen (V0 → −5 %, [[failure-refalo-kuormapudotus]]), ei ENNAKOINUT että mitoitettu sarjasarja on kestämätön. Akselin kenttäcase: *"165×3 V1, 140×4×3 V4, 132,5×3×4 V5 — jouduin modaamaan sarjoja."* Eliittiohjelmointi ennakoi; reaktiivisuus on *hyvän* ja *huipun* ero.

`forecastSetSustainability(ctx)` ennustaa viimeisen sarjan varannon opitusta across-set-decaysta. **Ydinoivallus: plan-kuorma on K3-1-kalibroitu targetVx:ään → se koodaa implisiittisen e1RM:n**, joten forecast lasketaan UI-side ilman erillistä e1RM-echoa (recommend() pysyy byte-identtisenä):

```
allowance   = acrossSetAllowance(sets, rate)      // rate = 8a opittu (yksilöllinen)
mPlan       = reps + targetVx + allowance
e1rmImplied = sysPlanLoad × (1 + mPlan/30)        // sys = load + bw (BW-ankkuroitu)
vx1         = 30×(e1rmImplied / sysActualLoad − 1) − reps   // tuore varanto ACTUAL-kuormalla
predictedLastVx = vx1 − rate×(sets−1)             // täysi rate = mitattu sarja-decay
```

- **Trigger:** `predictedLastVx < 0` (viimeinen sarja ennustaa rep-failurea) JA `sets ≥ 2`. K3-1-kalibroidulla plan-kuormalla predictedLastVx = targetVx − (sets−1)(rate/2) ≥ 0 normaaliarvoilla → **ei false-fire**. Fire vain kun kuorma/sarjamäärä (tai ylikirjoitus) työntää viimeisen sarjan yli.
- **`actualLoad` = live-kuorma** → kattaa atletin manuaalisen ylikirjoituksen, ei vain mitoitettua.
- **Korjaukset:** `sustainableSets` (max sarjat viimeinen ≥ 0) TAI `loadDelta` (kevennys jolla `sets` kestää).
- Advisory, UI-side, primaari + monisarjainen. EI muuta prescriptionia.

**Rajat:** ennuste nojaa opittuun/priori-across-set-rateen — huono päivä (jyrkempi todellinen decay) voi silti yllättää; readiness-kanava (2/3 + velocity-veto) täydentää. V1 kattaa systemaattisen kestämättömyyden, ei akuuttia päiväkuntoa.

**Linkit:** [[progressio-across-set-vasymysmalli]], [[e1rm-epley-vara-kaava]], [[failure-refalo-kuormapudotus]], [[readiness-cap-only-periaate]]
