# Failure-jälkeinen kuormapudotus −5 % (Refalo 2023)

**Status:** VERIFIOITU-INVARIANTTI
**Lähteet:** Refalo 2023 (failure-reaction strategy; failure vs. RIR -vertailu, palautuminen 24–48 h vs. 24 h)
**Koodiankkurit:** engine.js:1894 (`failureReaction`), engine.js:1967 (strength-drop 0,95), engine.js:1936–1940 (K3-3 D1-v2 -laajennus), tools/engine-pilot/lib/audit-baselines.mjs:118 (`FAILURE_DROP_BASELINE`), tools/engine-pilot/lib/audit-engine.mjs:615–617 (ENG-14: E-kanava eksplisiittisessä ei-runtime-katetta-listassa), test-runner.js:361–392 (block-aware-testit)

Tutkimusinvariantti E: kun primary-sarja päättyy V0:aan (täysi failure), seuraavan sarjan/session kuorma putoaa täsmälleen 5 %. Refalo 2023:n mukaan 5 % on optimaalinen recovery-trigger — suurempi pudotus hukkaa ärsykkeen, pienempi ei anna palautumisvastetta. Koneellinen totuuslähde on `FAILURE_DROP_BASELINE = { pct: 0.05, tolerance: 0.01 }`; tolerance ±1 % kattaa `roundToHalf`-levypyöristyksen. Historia: v4.32.8 muutti dropin 10 % → 5 % juuri Refalon perusteella.

**K3-3 D1-v2 (retro-kenttä OBS-G):** −5 % laajennettiin koskemaan jäljellä olevia sarjoja KAIKISSA blokeissa, myös foundationissa ja intensity/peakingissä joissa strategia A/C suosittaa stoppia. Peruste: kenttäcase 165 kg × 3 V0 → seuraava sarja ei keventynyt, koska strategia A/C palautti alkuperäisen kuorman. Jos atletti jatkaa stop-suosituksesta huolimatta, loput sarjat eivät saa toistaa kuormaa joka juuri vietiin failureen. Muutos on vain alaspäin; strategioiden ydin (stop-suositus + ensi viikon säätö) säilyy — ks. [[failure-strategiat-abc-blokeittain]].

**Porrastettu vaste ilman V0:aa (near-failure):** jos toteutunut Vx on ≥ 2 luokkaa tavoitetta alempi ILMAN failurea (esim. tavoite V3 → toteuma V1), in-session-vaste on −2,5 % (kerroin 0,975), ei −5 % — index.html:13862–13897. Koskee vain primary/backoff/secondary-rooleja; accessoryt saavat olla tarkoituksella lähellä failurea. Vanha −5/−10 % pelkästä deficitistä oli yli-aggressiivinen suhteessa failure-vasteeseen (engine = valmentaja, ei nanny). Vaste on confirm-pohjainen: atletti hyväksyy tai hylkää pudotuksen.

Poikkeus koko mekanismiin: isolation-liikkeen last-set V0 EI ole failure-tapahtuma vaan normaali hypertrofiastimulus — ks. [[failure-isolation-poikkeus]].

**8a-prior:** `learnedFailureDropPct`: prior 0,05, tutkimusrajat [0,04; 0,06] (`FAILURE_DROP_BASELINE.pct ± tolerance`; SD = (max − min) / 4 = 0,005 → posterior clampataan ±2 SD = ±0,01 priorista). HUOM: E-kanavalla EI vielä ole runtime-invariant-katetta — audit-engine.mjs:610–617 listaa sen eksplisiittisesti "ei tarkasteta" -kanavana (drop-% ei emittoidu omaan traceen); 8a-clamp tehdään suoraan `FAILURE_DROP_BASELINE`-rajoihin, ja runtime-auditointi vaatii oman trace-kanavan ennen kuin `INVARIANT_VIOLATION` voi laueta tälle parametrille.

**Linkit:** [[failure-strategiat-abc-blokeittain]], [[failure-isolation-poikkeus]], [[failure-intra-session-h017-d1]], [[progressio-deload-protokolla]]
