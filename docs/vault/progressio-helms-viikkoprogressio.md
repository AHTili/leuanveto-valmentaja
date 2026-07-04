# Helms 2018 -viikkoprogressio ja Vx-mismatch-säätö

**Status:** VERIFIOITU-INVARIANTTI (lähdearvot) / TOTEUTETTU-HEURISTIIKKA (session-välinen puolitus)
**Lähteet:** Helms et al. 2018 "RPE vs Percentage 1RM Loading" (Front Physiol 9:247; PMID 30153841); Helms et al. 2016 (Strength Cond J 38(4):42–49, RIR-pohjainen RPE); Tuchscherer / RTS RPE-taulukot; Cumming 2024, Psilander 2018, Bruusgaard 2010 (regain, ks. oma nootti)
**Koodiankkurit:** engine.js:72 (`PROGRESSION_CONFIG`), engine.js:77 (`HELMS_VX_TO_LOAD_PCT_BETWEEN_SESSIONS = 0.02`), engine.js:83 (`WEEKLY_BASELINE_PR_PHASE = 0.025`), engine.js:2544–2556 (Vx-mismatch + weekly computeProgressionTargetissa), test-runner.js:4810 (`testComputeProgressionTarget`)

Kaksi Helms 2018:sta johdettua progressiovakiota asuvat `PROGRESSION_CONFIG`-objektissa (kalibrointi tehdään vain siellä, ei inline):

1. **Viikoittainen baseline-progressio PR-vaiheessa = +2,5 %/vk** (`WEEKLY_BASELINE_PR_PHASE`). Helms 2018:n %1RM-ryhmä nosti kuormaa +2,5 % per viikko onnistuneen viikon jälkeen; sama arvo on Renaissance Periodization -käytäntö edistyneelle voimanostajalle. Kerrotaan regain-multiplierilla ja `weeksSinceLast`-arvolla (cap 3 vk, engine.js:2540): `weeklyProgressionPct = 0.025 × regainMultiplier × weeksSinceLast`.

2. **Vx-mismatch-säätö = 2 %/Vx-yksikkö session-välillä** (`HELMS_VX_TO_LOAD_PCT_BETWEEN_SESSIONS`). Helmsin alkuperäiskaava on 0,5 RPE-poikkeama = 2 % kuormasäätö → 1,0 RPE = 4 % — mutta se on saman session sisäinen autoregulaatio. LeVe soveltaa sitä session-välillä **puolitettuna** (1 Vx = 2 %). Vain yksisuuntaisesti ylös: säätö lasketaan vain kun `lastVx > targetVx` (viime kerta oli tavoitetta helpompi, engine.js:2548–2551); liian raskas sessio hoidetaan muilla mekanismeilla (V0-suoja, failure-drop, kestävyyskatto).

PLAN_BASED-kaksoiskirjaussuoja (engine.js:2564–2570): jos PLAN_BASED_E1RM on jo nostanut plan-targetin Helmsin mukaisesti, weekly-komponentti jätetään pois ja vain vxAdjustment lisätään — kaksi mekanismia eivät saa kirjata samaa progressiota kahdesti (`PROGRESSION_PLAN_BASED_HARMONIZED`-ruleHit).

Tier-kytkös: +2,5 %/vk on *nominaali*, jonka wizard skaalaa alas tier-kertoimella (elite ×0,05 → ~0,125 %/vk) — ks. [[progressio-tier-progressio-latella]]. Akselin streetlifting_16w on tarkoituksellinen poikkeus (tierProgressionApplied: false).

**8a-prior:** `learnedWeeklyProgressionPct`: prior 0,025 (PR-vaihe). Ehdotetut tutkimusrajat [0,015; 0,035] (Helms 2018 %1RM-protokollan ympäristö; SD = (max − min)/4 = 0,005 → posterior clampataan ±2 SD = ±0,01 prioriin). Tier-kerroin rajoittaa lisäksi ylhäältä: elite-atletin efektiivinen viikko-% ei saa ylittää Latella-rajaa vaikka opittu baseline kasvaisi. `learnedVxToLoadPct`: prior 0,02, rajat [0,01; 0,03] (Helmsin täysi 4 %/RPE on session-sisäinen yläraja, puolitus on suunnittelupäätös).

**Linkit:** [[progressio-computeprogressiontarget]], [[progressio-tier-progressio-latella]], [[progressio-mesosyklirakenne]], [[e1rm-epley-vara-kaava]], [[readiness-vara-kanava]]
