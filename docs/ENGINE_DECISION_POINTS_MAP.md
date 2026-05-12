# LeVe AI Engine — Exhaustive Decision Point Mapping

**Versio:** v1.0 — 2026-05-12
**Lähde:** Plan-agentti #2 (engine.js + data.js + wizard-2b-mapper.js + index.html, ~36 kLoC tutkittu)
**Tarkoitus:** Harness-suunnittelun input-dokumentti

Jokaisen rivin pitää olla testattavissa (input → output observable) ja kytkettävissä `decisionTrace`-ruleId:hen tai UI-tilaan.

## A. Päätöskohta-taulukko

**80 eksplisiittistä päätöskohtaa** — jokainen recommend()-kutsu tuottaa keskimäärin 10–30 trace-objektia.

| # | Päätöskohta | Tiedosto:rivi | Inputs | Outputs | Tutkimuspohja / heuristiikka | Mahdolliset issueet |
|---|-------------|--------------|--------|---------|------------------------------|---------------------|
| 1 | Warmup-ramp-prosentit (heavy primary) | `index.html:11816` | `rec.targetExternalLoad` | `[0, 0.30, 0.55, 0.75, 0.90] × wuLoad` tai fallback | Helms 2017; data.js RAMP_DEFAULT/RAMP_BARBELL (35/50/65/78/88) | **K1**: UI-render ohittaa slot.warmupSets-skeleton-arvon |
| 2 | rep1Range foundation (V-target-haarukka) | `engine.js:2664` `targetRep1VelocityRange` | movementName, blockPhase, rtfModel | `{ lower, upper, center, targetRir, intercept, slope, source }` | Sánchez-Moreno 2017; intercept=MOVEMENT_MVT[name], slope=0.045 m/s/RIR | **K2**: ohittaa slot.targetVx |
| 3 | VL-cap per blokki | `engine.js:2811` VL_CAP_PER_BLOCK + 2847 vlCapForContext | blockPhase, exerciseName, dayType, targetVx, rtfModel, rep1Velocity | `{ cap%, phase, source, targetRir }` | Pareja-Blanco 2017/2020; foundation 30, strength 17.5, intensity 12.5, peaking 7.5 | Sanity-clamp 3–60% voi heittää RTF-yksilöllisen pois |
| 4 | Vx-velocity-konflikti (predictVx) | `engine.js:2738` | mvReps[], rtfModel, reportedVx | `{ predictedVx, conflicted, delta, direction }` | Jukic 2024 RIR-V-malli | Vain havainto — ei auto-override |
| 5 | RTF-velocity-mallin reliability | `engine.js:2524` | allSets `setRole==="rtf_test"`, mvReps>=RTF_MIN_REPS_PER_SET | `{ status, slope, intercept, r2 }` | Lineaarinen regressio | Hidden: r² kynnysarvo |
| 6 | Backoff velocity-stop | `data.js:5688-5708` SQUAT_BACKOFF_STYLES | backoffStyle-key | velocityStop (0.40-0.55 m/s) | Block-periodisaatio | **K3**: erotettava rep1Range:sta UI:ssa |
| 7 | Maintenance mode early-exit | `engine.js:2991-3027` | settings.maintenanceMode, dateISO | Maintenance-rec tai null-rec | Heuristinen | Auto-expiry durationDays |
| 8 | Mesocycle before-start | `engine.js:3050-3068` | mesocycle.startDateISO > dateISO | `{ error: "before-start" }` | UX-suoja | Backfill-rajaus |
| 9 | Mesocycle ended (after-end) | `engine.js:3078-3098` | programWeek===null && reason==="after-end" | `{ error: "mesocycle-ended" }` | v4.27.3 korjaus | Hiljaiseen ohjelmavaihtoon regressio-suoja |
| 10 | Deload override (inserted vs replaced) | `engine.js:3105-3127` | mesocycle.insertedDeloads | dayType="volume", deltaPctBase=-0.20, slots pruned + sets/2 + Vx+2 | Helms 2018 | Pruning suodattaa accessoryt hiljaisesti |
| 11 | Break analysis (mod + forcedDayType) | `engine.js:1274-1305` | lastSessionDateISO, todayDateISO | `{ breakDays, modifier, forcedDayType }` | Helms 2018 detraining | Cutoff-kohdat luonnottomia (13→-5%, 14→-10%) |
| 12 | Mesocycle break-reset | `engine.js:1310-1315` | breakDays>=14, skippedWeeks | meso vaihtuu defaultiin | Konservatiivinen 2 vk | **High-risk**: streetlifting_16w voi resetoitua |
| 13 | E1RM-laskenta (Epley + Vara, primary path) | `engine.js:3170-3231` | recentTopSets, bodyweightKg, isBarbell | currentE1RMSystem, currentE1RMExternal | Epley + Vara | Yliarvioi V3+×6 (+15-20%), aliarvioi squat 4×6 V3 (-11%) |
| 14 | E1RM Calibration override | `engine.js:3213-3229` | last3Sets cal | currentE1RMSystem=median(calibE1rms) | DiStasio 2014 + Helms MASS 2023 | UI ei dokumentoidu cal-overridea |
| 15 | PLAN_BASED_E1RM (perfect-execution-override) | `engine.js:3258-3364` | last-session top-sarjat, lastLoadPct | planBasedExternal | Helms 2018 + Tuchscherer RTS | **K**: perfect-execution-määritelmä ehdoton |
| 16 | E1RM_INFLATION_CAP (ceiling) | `engine.js:3397-3495` | cal-history, cfgBaseline × adaptive multiplier | ceiling_ext | B+ adaptive streak | Cap voi piilottaa kapasiteetin nousun |
| 17 | CFG-drift (cfg-baseline-oppiminen) | `engine.js:449-580` | Signal B: velocity-primer-trend; Signal A: Vx-overshoot streak | `{ driftPct (max 5% B/10% A), signal, counter, source }` | Velocity-trend priorisoituu | Reset-ehdot voivat resetoida kesken streakin |
| 18 | E1RM_DEFLATION_CAP (floor) | `engine.js:3512-3553` | cal-min × 0.95 tai cfgBaseline × 0.95 | floor_ext | Symmetrinen ceiling-kanssa | Floor ei näy UI:ssä erikseen |
| 19 | VBT_E1RM_CROSSCHECK | `engine.js:3586-3600` | lvProfile.n>=3 | trace, severity | González-Badillo 2010 LV-relaatio | Vain diagnostiikka — ei toimintaa |
| 20 | VBT_PRIMARY_USED (promote) | `engine.js:3621-3639` | n>=10 LV-pistettä, \|diffPct\|<=5%, ei plan-based | Override currentE1RMExternal | Sánchez-Moreno 2017 + Behrmann 2025 | Plan-based voittaa VBT:n |
| 21 | VBT_DEFERRED_TO_PLAN / VBT_CANDIDATE | `engine.js:3640-3650` | vbtStatus.status==="promoted" && planBasedActive | trace; ei muuta e1RM | Priorisointi | Diagnostic, ei action |
| 22 | DELTA_PCT_RAW | `engine.js:3658-3660` | weekDef.deltaPctBase, DAY_TYPE_MULTIPLIERS | deltaPctRaw | Helms 2018 + Issurin 2010 | Speed-päivän 0.4 kerroin ei dokumentoidu |
| 23 | VARA_TREND_CORRECTION (dual-signal) | `engine.js:1045-1112` | recentTopSets viim. 6 | varaCorr ∈ [-0.020, +0.035] | Helms 2018 + RP | V0 viim. 3 sarjassa lukitsee hold-backin |
| 24 | E1RM_MOMENTUM_BONUS | `engine.js:1251-1268` | viim. 4 e1RM, rising-pattern | bonus 0.005–0.015 | PR-momentum-heuristiikka | Kerrostuu vara-correctioniin |
| 25 | GROSS_MISMATCH_CORRECTION | `engine.js:1222-1241` | viim. 8 setissä meanOvershoot<=-1.5 | +0.050–0.080 | Escalointi | Triggeröityy harvoin, +8% hyppy |
| 26 | FIRST_SET_CAPACITY_BONUS | `engine.js:1186-1211` | Viim. session ekka V5 vs V3, dayType==="heavy" | bonus +0.010–0.015 | v4.34.34 | Vain heavy-day primary |
| 27 | BREAK_MODIFIER (deltaPct) | `engine.js:3709-3713` | breakInfo.modifier | deltaPctRaw += modifier | Yhdistyy | Kerrostuu varaCorrection + momentum |
| 28 | FAILURE_LOCKOUT / FAILURE_DETECTED | `engine.js:3720-3730` | hadFailureLastSession | deltaPct = min(deltaPct, 0) | Grinding-suoja | Lockout vain jos deltaPct>0 |
| 29 | Clamp `[-maxDelta, +maxDelta]` | `engine.js:3733-3734` | deltaPctRaw, settings.maxDelta | deltaPct | Turvaclamp | Settings override mahdollinen |
| 30 | CAP_RED (readiness RED) | `engine.js:3742-3756` | capLevel===2, double-red | deltaPct = min(0)-0.05/-0.08, heavy→volume, Vx+1 | 2/3 + velocity-veto | Double-red äärimmäisen harvoin |
| 31 | CAP_YELLOW | `engine.js:3757-3763` | capLevel===1 | deltaPct *= 0.5, -0.02 | Autoregulation | Kerrostuu break-modifierin päälle |
| 32 | Target reps + Vx (slot-driven) | `engine.js:3766-3783` | primarySlotForLoad.reps/targetVx | targetReps, targetVx | Slot-eksplisiittinen | Triple-fallback voi maskata buggin |
| 33 | LOAD_PCT_RESOLVED (primary) | `engine.js:3795-3902` | primarySlotMeta.loadPct, currentE1RMExternal | targetExternalLoad = roundToHalf(e1RM × loadPct) | v4.22 P2 | loadPct>1.0 sanity-warn puuttuu |
| 34 | PROGRESSION_TARGET (yhdistetty progressio) | `engine.js:3823-3895` + 1876-2043 | lastSession anchor, targetVx, deltaPctBase, cfgBaseline, planTarget | targetExternalLoad, ruleHits-array | Helms 2018 + PROGRESSION_CONFIG | Yhdistää rate-limit + floor-cap |
| 35 | PROGRESSION_DELOAD_PASSTHROUGH | `engine.js:1913-1918` | weekDef.deltaPctBase<0 | targetLoad=planTarget, autoreg ohitettu | Deload pure | Piipotaa trace, UI ei välttämättä lue |
| 36 | PROGRESSION_SPEED_PASSTHROUGH | `engine.js:1919-1924` | dayType==="speed" | planTarget, autoreg ohitettu | "Intensiteetti tulee Vx:stä" | Vx puuttuminen tekee epämääräiseksi |
| 37 | PROGRESSION_V0_PROTECTION | `engine.js:1940-1949` | lastSession.medianVx===0, !isCalibration | target = max(planTarget, lastLoad × 0.95) | Tuchscherer RTS | Plan-floor voi voittaa |
| 38 | SLOT_LOAD_RESOLVED (non-primary) | `engine.js:4007-4017` | slot.role!==primary, sama liike | slot.resolvedLoadKg = sessionE1RM × loadPct | Primary rate-limit säteilee | Backoff capped automaattisesti |
| 39 | SLOT_LOAD_RESOLVED_CROSSREF | `engine.js:4021-4170` | slot.loadPctReferenceMovementName | slot.resolvedLoadKg = effectiveBaseE1RM × loadPct | Cross-reference | CFG_FLOOR_APPLIED v4.34.49 |
| 40 | SLOT_LOAD_RESOLVED_CAL | `engine.js:3971-4005` | slot.role==="calibration" | calLoad = base × pct, PR-cap | Suoja: cal ei nosta PR | PR-cap voi näyttää matalalta |
| 41 | PROGRESSION_TARGET_CROSSREF | `engine.js:4108-4159` | planBasedActive=false, cfgBaseline | baseLoad capped | Sama progression cross-ref:lle | **Inkonsistenssi**: primary plan-based, cross-ref ei |
| 42 | LOAD_SANITY_WARNING | `engine.js:4190-4205` | targetExternalLoad/seed>1.6 | console.warn + trace | Diagnostiikka | Hidden: ei UI-warningia atleetille |
| 43 | SUGGESTED_LOAD_FALLBACK | `engine.js:3922-3926` | targetExternalLoad===null && suggestedLoadKg | Käyttää seed-kuorman | Ensimmäinen sessio | Progression-rules ei laukea |
| 44 | LOAD_PCT_SEED | `engine.js:3897-3901` | loadPct>0 && currentE1RMExternal===null | suggestedLoadKg + pct | E1RM-historian puuttuessa | "Alkaa hitaasti" |
| 45 | Set count (sets-prescription) | `engine.js:4209-4214` | DAY_TYPE_SET_RECIPES[dayType] | setCount | Issurin 2010 + RP | Array fallback [0] voi olla bug |
| 46 | VARA_FEEDBACK | `engine.js:4217-4220` | recentTopSets | `{ suggestion, type }` | Heuristiikka | UX: ei aina näy UI:ssa |
| 47 | ACCESSORY_CAP_ACTIVE (3/3 RED) | `engine.js:4222-4234` | Kaikki 3 readiness RED/YELLOW | accessory sets × 0.7 | Konservatiivinen | Hidden: vaatii kaikki 3 |
| 48 | DAY_PLAN_GENERATED (fallback) | `engine.js:4237-4241` | Ei dayPlan:ia | Default leuanveto + accessoryt | Fail-safe | Variantti ei näy |
| 49 | ACCESSORY_BLOCK_SCALAR | `engine.js:4257-4271` | streetlifting_16w, weekNum | Accessory sets × 0.8/0.6 | Issurin 2010 | Vain streetlifting_16w |
| 50 | MU_AUTO_REGULATE | `engine.js:4278-4304` | Muscle-up-slot, viim. MU-setit | slot.suggestedLoadKg += delta | MU-spesifi | Vain "Muscle-up"-nimellä matchaa |
| 51 | ACCESSORY_SWAP_AUTO (stagnation) | `engine.js:4307-4325` | progress.stagnationWeeks>=3 | swap-suggestions | Heuristinen 3vk | Voi yllättää atleetin |
| 52 | VARIANT_ASSIGNED | `engine.js:4327-4341` | dayType, slot.variantName puuttuu | Default-variant per dayType | UX-laajennus | Päättyy joka session |
| 53 | velocityReadiness (z-score) | `engine.js:651-659` | todayVelocity, baseline median + MAD-sigma | `{ z, class: GREEN/YELLOW/RED }` | Sánchez-Medina 2011 | Bias toward GREEN jos baseline lyhyt |
| 54 | hrvReadiness | `engine.js:671-698` | todayLnRMSSD, baseline rolling7 | sama luokitus | Plews 2013 | Fallback baseline-median |
| 55 | upperBodyMpvReadiness | `engine.js:722-775` | todayMpv, recent7DaysMpv | `{ class, recommendedLoadAdjust, recommendedVxBump }` | Sánchez-Moreno 2017 | Load-adjust ei kerrokastu engineen |
| 56 | varaReadiness | `engine.js:780-796` | recentTopSets-overshoot | class | Heuristinen | Vain Vx-pohjainen |
| 57 | combineReadiness (2/3 + velocity-veto) | `engine.js:801-836` | velocity/hrv/vara | `{ combined, capLevel, channels }` | 2/3 + velocity-veto | Hidden: jos velocity.class===null, veto pois |
| 58 | MAINTENANCE_MODE-trace | `engine.js:2992-3027` | mm.active, dow | trace + maintenance-rec | UX-laajennus | Locale-issue (getDay() \|\| 7) |
| 59 | failureReaction (block-aware) | `engine.js:1343-1430` | blockPhase, consecutiveFailures | `{ nextSetLoad, shouldStop, strategy }` | Refalo 2023 5% drop; Tuchscherer | ISO-NORMAL last-set OK |
| 60 | accessoryProgression | `engine.js:1436+` | progress.lastVxOvershoot, stagnationWeeks | `{ action, suggestedLoad, reason }` | Vx-overshoot-aware | +1.5×/+2× increment |
| 61 | computeAttemptLoads (peaking) | `engine.js:5585` | useE1RM, peakingConfig | attemptLoads | Voimanostokisalogiikka | Vain dayType==="competition" |
| 62 | speedDayLoad | `engine.js:4681-4688` | e1rmExternal, bodyweightKg | 55-60% × systemE1RM - bw | Heuristinen pct=0.575 hardcoded | Ei dokumentoitu slot-kentässä |
| 63 | readinessTestLoad | `engine.js:4670-4675` | e1rmExternal | 60% rounded 2.5kg, clamp [20,80] | MPV-readiness | Clamp 80kg-yläraja voi olla matala |
| 64 | intraSessionLoadAdjustSuggestion | `engine.js:1140-1163` | firstSetVx, targetVx, currentLoadKg, setRole==="top" | `{ suggestedLoadKg, bumpKg, reason }` | Heuristinen | Vain heavy-day-primary-top |
| 65 | applyTierProgression | `wizard-2b-mapper.js:1633` | weekDefs, tier, sex | weekDef.deltaPctBase × tierMult × sexMult | Latella 2020 + Williams 2017 | beginner 1.0, advanced 0.15, elite 0.05 |
| 66 | applyTargetDateAnchor | `wizard-2b-mapper.js:1190` | weekCountFromTier, q27_targetDate | `{ weekCount, anchored, warning }` | Cap 16 vk | <2 vk → warning |
| 67 | pickBlockSequence (multi-blokki) | `wizard-2b-mapper.js:1232` | q12_primaryGoal, q29_recentBlock, daysUntilTarget | `{ blocks, totalWeeks, skippedBlocks }` | Issurin Table V | Skip-sääntö <14 vk |
| 68 | applySplitFilter | `wizard-2b-mapper.js:1670` | weekPlans, splitPref | Suodatettu accessory-slotit | Pää-app-konventio | "broscience" voi pudottaa accessoreja |
| 69 | applyVolumeCap | `wizard-2b-mapper.js:1737` | weekPlans, blockGoal | Accessory-sarjat skaalattu | Helms 2018 + Schoenfeld | Voi rikkoa session-balanssin |
| 70 | applySessionFocusLabels | `wizard-2b-mapper.js:1791` | weekPlans | day.label = "Pullup-fokus" | UX-laajennus | Vain label, "stealth" |
| 71 | sexModifierApplied | `wizard-2b-mapper.js:1342-1346` | q15_aerobicModality!=="none" && male && advanced/elite | recoveryCapacity="heikko" | Huiberts 2024 SMD -0.43 | **Implicit**: ilman atleetin näkyvää kontrollia |
| 72 | Cut-deficit-rule | `wizard-2b-mapper.js:1399-1407` | q14_cutting==="yes" && q30.deficitKcal>=500 | recoveryCapacity="heikko" | Helms 2018 | Kynnys 500 kcal hauras |
| 73 | generateBlockTuningPackage (deload-AI) | `engine.js:5705-5927` | mesocycle.type==="streetlifting_16w", weekNum∈[4,8,12] | `{ markdown, json, prompt, meta }` | Issurin + Refalo + RP | Retrospektiivinen, atleetti applaa manuaalisesti |
| 74 | generateGenericBlockTuningPackage | `engine.js:5941` | Muu mesotyyppi, weekDef.deltaPctBase<0 | Sama paketti | Yleistys | Voi rikkoutua jos meso ilman deloadeja |
| 75 | attachVelocityRepLiveSummary (UI live-tila) | `index.html:1619-1804` | velRepGrid, targetRep1Range, vlCapForContext | DOM-tilat: under/optimal/warn/stop | Pareja-Blanco VL-thresholdit | **K-jatko**: "ALI" laukea vain jos rep1State==="above" && vl<cap×0.5 |
| 76 | CFG_DRIFT_APPLIED-trace | `engine.js:3428-3447` | cfgDriftResult.driftPct>0 | trace; cfgDriftResult-objekti | Velocity-trend priority | Persist UI-tasolla — voi failata |
| 77 | RETURN_FROM_BREAK_DAYTYPE | `engine.js:3137-3142` | breakInfo.forcedDayType | dayType override | "Volume ensin" | Voi yllättää atleetin |
| 78 | MESOCYCLE_BREAK_RESET | `engine.js:3146-3155` | breakInfo.breakDays>=14, skippedWeeks>=2 | Mesocycle vaihtuu defaultiin | v4.27.3 jälkeen näkyvä | **High-risk** |
| 79 | analyzeSessionAdaptation | `engine.js:4708-4768` | sessionExercises, dayPlanSlots | adjustments-array | Heuristinen | History-kerääjä, ei välitön |
| 80 | applyAdaptations | `engine.js:4775-4815` | adaptationHistory>=2 sessiossa sama pattern | mesocycle.weekPlans mutated | "Engine learns" | **K**: voi muuttaa atleetin tietämättä |

## B. "Hidden Decisions" — 28 implisiittistä päätöstä

Engine tekee paljon päätöksiä jotka **eivät näy tracessa** mutta vaikuttavat outputtiin.

### B1. Inputtien suodatus
- **H1**: `recentTopSets = topSets.slice(-6)` (engine.js:3182) — 6 viim. settiä määrittää koko e1RM:n
- **H2**: `last3Sets = recentTopSets.slice(-3)` calibration-overrideen — yksi cal voi muuttaa kokonaisuuden
- **H3**: PLAN_BASED:n lastSessionSets lasketaan vain `setRole === "top"` -sarjoista (v4.34.36)
- **H4**: VBT-promote vaatii n >= 10 LV-pistettä viim. 4 vk
- **H5**: cfg-drift Signal B aktivoituu kun primerSets.length >= 5 — 4 mittausta = signal A

### B2. Sex/tier/cut-modifierit
- **H6**: sexModifier laukea automaattisesti — atleetti ei näe miksi
- **H7**: tierMult × sexMult VAIN positiivisiin deltaPctBase-arvoihin → deloadit absoluuttisia. Yhdistelmä elite + female: 0.05 × 0.55 = 0.0275 → vk 2 deltaPctBase 0.025 → 0.0007 ≈ nolla. **Hidden bug-risk**
- **H8**: cut-aggressive kynnys 500 kcal — 499 = ei muutosta

### B3. UI-renderöinti vs engine-output
- **H9** (K1): UI:n warmup-prosentit eivät lue slot.warmupSets-skeleton-arvoa
- **H10**: variantLoadModifier (index.html:11886) kerrostuu primaryload:in päälle
- **H11**: backoff-fallback primary × 0.85 (index.html:11897) toimii vain jos slot ei määrittele loadPct — legacy-pelastus

### B4. Locking-konfliktit
- **H12**: PLAN_BASED voittaa VBT:n; VBT voittaa Epley-Vara:n; ceiling voittaa kaikki; floor voittaa kaikki. **Priorisointijärjestys** ei näy yhtenä trace-pisteenä
- **H13**: PROGRESSION_HARD_CAP voi cap-pata PROGRESSION_FLOOR_CAP-tuloksen alas — "lattia" ei oikeastaan ole lattia (engine.js:2016-2018)
- **H14**: Cross-ref-haarassa planBasedActive=false (engine.js:4098) — secondary-slotit eivät hyödy primary:n plan-based-statuksesta. **Inkonsistenssi**

### B5. Kalibrointi- ja deload-timing
- **H15**: Deload-override pakottaa dayType="volume" ja Vx+2
- **H16**: Deload pruning: vain primary/backoff/scapular-control/core-hollow säilyy → muut katoavat hiljaisesti
- **H17**: Calibration vaikuttaa ceilingiin JA floorin JA e1RM:ään — yksi cal-sessio voi muuttaa nopeasti 3 päätöstä

### B6. Triggering-säännöt (joko/tai-pisteet)
- **H18**: firstSetCapacityBonus vain `dayType==="heavy"` — volume/speed-päivinä ekka V5 ei johda bonukseen
- **H19**: MU_AUTO_REGULATE matchaa vain liikenimellä "Muscle-up" tai "Muscle up" — variantit ulos
- **H20**: velocityStop on **referenssi**, ei pakko — engine ei pakota sarjan keskeyttämistä
- **H21**: accessoryCapActive vaatii **kaikki 3 readiness-kanavaa** RED/YELLOW. Jos yksi null, ei aktivoidu
- **H22**: failureReaction(blockPhase=null) legacy-polku → Strategia B (5% drop)

### B7. Persistenssi-konfliktit
- **H23**: cfgDriftResult palautetaan rec:ssä mutta **persistoidaan UI-tasolla** — voi jäädä persistoimatta jos UI failaa
- **H24**: Decision-traces purgataan 90 päivän jälkeen — block-tuning-paketti voi lukea poistettuja traceja
- **H25**: saveDecisionTrace kirjoittaa joka session (10-30 obj/recommend) → IDB paisuu ~1-5 MB/sykli

### B8. Engine-side warnings (yksi-suuntaiset)
- **H26**: LOAD_SANITY_WARNING kirjoittaa vain console.warn — atleetti ei näe
- **H27**: multiSetV0Warning isolation-haarassa → erillinen warning-kenttä UI:lle. UX-aukko jos UI ei renderöi
- **H28**: VBT_E1RM_CROSSCHECK severity "SIGNIFICANT" — ei toiminta, vain trace. Atleetti voi missata

## C. Suositukset harness-Node-scriptille

1. **Deterministinen seed**: harness antaa options.sessions, options.allSets, options.allMovements, options.mesocycle suoraan → ohittaa IndexedDB-tasoa
2. **Trace-snapshot**: tallenna rec.traces JSON-arrayna per recommend-kutsu. Avain ruleId, lisäkentät before, after, why
3. **Diff-vertailu**: vertaile kaksi rec-objektia → diff (targetExternalLoad, deltaPct, capLevel, unique ruleIds, e1rmExternal)
4. **Päätöksen audit**: rekonstruoi päätöslogiikka trace-ketjusta (PLAN_BASED → ceiling-cap → progression-target → floor-cap)
5. **Hidden state -snapshot**: mesocycle.streetliftingConfig.cfgDriftHistory, accessorySlotOverrides, MovementProgress.consecutiveTargetMetSessions ennen ja jälkeen
6. **K1-K5 regressiotestit**:
   - K1: warmup-prosentit eri primary-tyypeille
   - K2: rep1Range vs slot.targetVx (override)
   - K3: backoff velocityStop visualisointi
   - K4: AI-block-tuning engineRuleFrequency-aggregaatio
   - K5: räjähtävä-leuka MVT-aliasointi
7. **Implicit decision -coverage**: testaa jokainen H1-H28 ainakin yhdellä input-skenaariolla

## Yhteensä

- **80 päätöskohtaa** + **28 implisiittistä päätöstä** = **~108 erikseen testattavaa pistettä**
- Tämä on **minimibaseline** — engine.js-koodissa on todennäköisesti 20-30 lisäkohtaa kartoittamatta (recommendPeaking, accessory-resolverit, RTF-modaalin tallennushaarat)
- Harness on syytä rakentaa **pluginable trace-collector** -mallilla
