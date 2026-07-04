# Mesosyklirakenne ja deltaPctBase-viikkokertoimet

**Status:** TOTEUTETTU-HEURISTIIKKA
**Lähteet:** Issurin 2010 (Sports Medicine 40(3):189–206, blokkiperiodisaatio + residuaalit); Helms 2018 (PMID 30153841, viikoittainen %-progressio ja deload); Bompa 2009 (deload-volyymileikkaus)
**Koodiankkurit:** data.js:2685 (`createDefaultMesocycle`), data.js:2691–2696 (default-weekDefs), engine.js:27–34 (`DAY_TYPE_MULTIPLIERS`), engine.js:1381–1386 (`deltaPctRaw`), engine.js:5038 (deltaPct_raw recommend()-polussa), engine.js:5112–5113 (hard-clamp `settings.maxDelta || 0.25`), tools/engine-pilot/lib/audit-baselines.mjs:83 (`DELTA_PCT_HARD_CLAMP`)

Mesosyklin perusyksikkö on 4 viikon blokki, jonka jokainen viikko määrittelee `weekDef`-recordin: `deltaPctBase` (viikkokohtainen kuormakerroin suhteessa baselineen), `label`, `heavyReps` ja `heavyTargetVx`. Default-mesosykli (`createDefaultMesocycle`, konjugoitu/blokkihybridi 3 pv/vk: Ma maksimivoima / Ke perusvoima / Pe nopeusvoima) käyttää arvoja: vk 1 Adaptaatio **0 %**, vk 2 Loading **+2,5 %**, vk 3 Overreach **+3,5 %**, vk 4 Deload **−25 %**.

**Drift-varoitus:** muistiin ja vanhoihin dokumentteihin on jäänyt sarja "[0, +2.5, +5, −25]". Koodin totuus (data.js:2694) on vk 3 = **0.035**, ei 0.05. Osa test-runnerin synteettisistä weekDef-fixtureista (esim. test-runner.js:3419) käyttää yhä 0.05:tä eristetyissä testeissä — se on testidataa, ei default-mesosyklin arvo. Muissa preseteissä deltaPctBase-sarjat vaihtelevat ohjelmointityylin mukaan (esim. peaking data.js:2855–2858: +2/+4/−10/0; volyymi data.js:3038–3041: −10/−5/0/−25; Wendler data.js:3971–3974: 0/+5/+10/−25).

Efektiivinen deltaPct lasketaan `deltaPctRaw = weekDef.deltaPctBase × DAY_TYPE_MULTIPLIERS[dayType]`, jossa heavy = 1.0, volume = 0.6, speed = 0.4, competition = 1.0, accessory = 0. Lopuksi arvo clampataan `settings.maxDelta || 0.25` -rajaan (engine.js:5113) — tämä ±25 % on koneellinen hard-clamp (`DELTA_PCT_HARD_CLAMP`), ei odotettu progressioalue. Odotettu alue per tier on WARN-tasoinen heuristiikka (`DELTA_PCT_EXPECTED_RANGE`, audit-baselines.mjs:92): beginner ≤ 10 %/vk, advanced ≤ 5 %/vk, elite ≤ 3 %/vk.

Huomaa arkkitehtuurinen kahtiajako: uudemmat presetit (ml. streetlifting_16w) ilmaisevat intensiteetin slot-tason `loadPct`-kenttänä, jolloin deltaPctBase-reitti on lähinnä legacy-fallback (engine.js:5359→) — mutta deltaPctBase säilyy **deload-detektion** kanonisena signaalina (`deltaPctBase < 0` → deload, ks. [[progressio-deload-protokolla]]) ja `computeProgressionTarget`-yliajojen ehtona.

**Linkit:** [[progressio-deload-protokolla]], [[progressio-helms-viikkoprogressio]], [[progressio-computeprogressiontarget]], [[progressio-tier-progressio-latella]]
