# Vara-kanava (Vx = RIR-identiteetti, RPE = 10 − Vx)

**Status:** TOTEUTETTU-HEURISTIIKKA   (Vx=RIR on design-identiteetti; overshoot-rajat heuristiset)
**Lähteet:** RIR/RPE-pohjainen autoregulaatio (Helms 2016, RIR-based RPE); LeVe-design (Vara-terminologia korvaa RIR:n läpi järjestelmän)
**Koodiankkurit:** engine.js:1111 (`varaReadiness`), engine.js:74 (RPE = 10 − Vx -kommentti, 1.0 Vx = 4 % kuorma), engine.js:1429 (`varaFeedback`), engine.js:1463 (`varaTrendCorrection`), test-runner.js:258 (Vara-readiness-testi)

**Vara (Vx) on RIR:n identiteetti** — sama suure eri nimellä: Vx = kuinka monta toistoa jäi varaan (Reps In Reserve). Muunnos RPE:hen on `RPE = 10 − Vx` (engine.js:74). Kuormaskaalalla ~1.0 Vx ≈ 4 % 1RM:stä (Epley-johdannainen), mikä on Vx:n koko engine-läpäisevän vaikutuksen perusyksikkö (e1RM-laskenta, kuormakorjaukset, readiness).

**Vara-readiness (`varaReadiness`, engine.js:1111):** mittaa viimeaikaisten top-sarjojen **overshootia** = `targetVx − actualVx`. Positiivinen overshoot = atletti jäi tavoitteesta (sarja oli raskaampi kuin suunniteltu → väsymyssignaali). Ikkuna `windowN = 5`, **vaatii vähintään 2 kelvollista sarjaa** (targetVx ja actualVx molemmat ei-null), muuten kanava inaktiivi.

Luokittelu keskimääräisestä overshootista (ei z-pistettä — tämä on ainoa kanava jolla on absoluuttiset rajat):
- `meanOvershoot ≥ 2` → RED (kaksi luokkaa liian raskasta keskimäärin)
- `meanOvershoot ≥ 1` → YELLOW
- muuten → GREEN

Testivektori: sarjat joilla mean overshoot ≥ 2 → RED (test-runner.js:258).

**Suunta-konventio (kriittinen, engine.js:1454–1461):** `actualVx > targetVx` = sarja oli **helpompi** kuin tavoite (enemmän varaa = vähemmän rasitusta) → overshoot (`target − actual`) < 0 → crushed. `actualVx < targetVx` = sarja oli **raskaampi** kuin tavoite → overshoot > 0 → struggled → väsymyssignaali. Vara-readiness reagoi vain struggled-suuntaan (positiivinen mean overshoot); crushed-suunta ohjataan kapasiteettibonukseen, ei readiness-cappiin.

**Erotus varaFeedback / varaTrendCorrection -mekanismeista:** `varaReadiness` on readiness-kanava (RED/YELLOW/GREEN → capLevel). `varaFeedback` (engine.js:1429) antaa erillisen kuorma-suosituksen ("liian kevyt/raskas") kolmesta viime sarjasta. `varaTrendCorrection` (engine.js:1463) on asymmetrinen kuormakerroin (aggressiivinen ylös crushed, konservatiivinen alas struggled). Nämä ovat eri signaaleja — vain `varaReadiness` osallistuu 2/3-yhdistelyyn.

**8a-prior:** `varaReadinessRedThreshold`: prior 2.0 Vx, `varaReadinessYellowThreshold`: prior 1.0 Vx. Ei suoraa tutkimusankkuria (RIR-based autoregulaatio ei määrää absoluuttista väsymysrajaa) → heuristiset priorit, posterior clampattava ±0.5 Vx (RED [1.5; 2.5], YELLOW [0.5; 1.5]) etteivät rajat mene päällekkäin.

**Linkit:** [[readiness-2of3-saanto-velocity-veto]], [[readiness-cap-only-periaate]], [[readiness-capacity-bump-ekan-sarjan-helppous]], [[e1rm-epley-vara-kaava]]
