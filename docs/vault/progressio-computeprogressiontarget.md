# computeProgressionTarget — yhtenäinen progressiopäätös

**Status:** TOTEUTETTU-HEURISTIIKKA (tutkimusankkuroitu, v4.35.0)
**Lähteet:** Helms 2018 (Front Physiol 9:247); Cumming 2024 (J Physiol, muscle memory); Psilander 2018 (J Appl Physiol 126(6):1636–1645, retraining); Bruusgaard 2010 (PNAS, myonukleukset); Issurin 2010; Tuchscherer/RTS ("don't grind reps")
**Koodiankkurit:** engine.js:2434 (`computeProgressionTarget`), engine.js:72–107 (`PROGRESSION_CONFIG`), engine.js:2468–2494 (yliajot), engine.js:2496–2507 (`PROGRESSION_V0_PROTECTION`), engine.js:2509–2523 (regain), engine.js:2534–2542 (weeksSinceLast, cap [1,3]), engine.js:2575 (hard-cap), engine.js:2580 (plan-floor), engine.js:2592–2597 (floor-cap), engine.js:5261 (kutsu recommend()-primaarireitillä), engine.js:5688 (cross-ref-reitti), test-runner.js:4810 (`testComputeProgressionTarget`)

Puhdas, deterministinen funktio joka korvasi v4.35.0:ssa hajautetun cap-arkkitehtuurin (PROGRESSION_RATE_LIMIT + FLOOR_CAP erillisinä, dual-anchor, weekMultiplier). Päätösjärjestys:

1. **Yliajot** (palauttavat suoraan naive planin): deload (`deltaPctBase < 0`) → `PROGRESSION_DELOAD_PASSTHROUGH`; speed-päivä → `PROGRESSION_SPEED_PASSTHROUGH` (intensiteetti tulee Vx:stä); ei historiaa → `PROGRESSION_NO_HISTORY`; ei plan-targetia → null (kutsujan fallback).
2. **V0-grindisuoja:** viime sessio V0-failina (ei cal) → `max(planTarget, lastLoad × 0,95)` (`V0_GRINDI_PENALTY = −0.05`, atletin grindiprofiili + Tuchscherer). Ks. myös [[failure-refalo-kuormapudotus]] — sama −5 %-suuruusluokka, eri mekanismi.
3. **Regain-multiplier** (muscle memory): `regainRatio = lastLoad / cfgBaseline`. Ratio < 0,85 → ×2,0 (`REGAIN_MULTIPLIER_FAR`, Psilanderin nopein retraining); ratio < 0,95 → ×1,5. Perustelu: 12 vk treeni → 12 vk tauko → 8 vk retraining palautti tason (~kerroin 1,5).
4. **weeksSinceLast:** `ceil(daysSince/7)`, clamp [1, 3] — pitkä tauko ei kumuloi progressiota loputtomiin. OBS-030: planOverride-sessio attribuoidaan suunnitellulle päivälle (`planSourceDateISO`), ei tehtypäivälle.
5. **Vx-mismatch** +2 %/Vx vain ylös + **weekly** 2,5 % × regain × viikot (ks. [[progressio-helms-viikkoprogressio]]); PLAN_BASED-harmonisointi estää kaksoiskirjauksen.
6. **Plan-floor:** `finalTarget = max(planTarget, autoregTarget)` — suunnitelma on lattia, autoregulaatio voi vain nostaa.
7. **Hard-cap:** `lastLoad × (1 + 0,15 × weeksSinceLast)` (`HARD_CAP_PER_WEEK`, Issurin + Helms + RTS: +15 %/vk on äärimmäinen, käytännössä vain regain-alussa) → `PROGRESSION_HARD_CAP`.
8. **Floor-cap (regressiosuoja):** jos viime sessio meni `Vx ≥ target` (ei cal) eikä finalTarget saa pudota alle viime session medianLoadin (toleranssi 0,25 kg) → `PROGRESSION_FLOOR_CAP`. Sallii tasolla pysymisen, estää perusteettoman taantuman.

Kutsupinta: recommend()-primaarireitti (engine.js:5261) ja saman liikkeen cross-ref-reitti (engine.js:5688) — yksi funktio, kaksi lokusta, identtinen semantiikka. Trace `PROGRESSION_TARGET` sisältää koko audit-trailin (regainRatio, weeklyPct, vxAdjPct, planFloor, hardCap, ruleHits); vanhat ruleId:t heijastetaan erillisinä trace-kutsuina taaksepäin-yhteensopivuudeksi (engine.js:5301, 5316). Tuloksen päälle sovelletaan vielä K3-1b-kestävyyskatto — ks. [[progressio-across-set-vasymysmalli]].

**8a-prior:** kandidaatit: `learnedRegainMultiplierFar`: prior 2,0, rajat [1,5; 2,5] (Psilander-yläraja; SD = 0,25); `learnedHardCapPerWeek`: prior 0,15, rajat [0,10; 0,20] (SD = 0,025); `learnedV0Penalty`: prior −0,05, rajat [−0,08; −0,03] (kytkeytyy `FAILURE_DROP_BASELINE`-invarianttiin E — posteriorien on pysyttävä keskenään koherentteina). Kaikissa clamp ±2 SD prioriin + ENG-14-valvonta.

**Linkit:** [[progressio-helms-viikkoprogressio]], [[progressio-deload-protokolla]], [[progressio-across-set-vasymysmalli]], [[failure-refalo-kuormapudotus]]
