# 2/3-sääntö + velocity-veto (readiness-yhdistely)

**Status:** TOTEUTETTU-HEURISTIIKKA   (design-päätös, ei nimetty tutkimusinvariantti)
**Lähteet:** Sánchez-Medina & González-Badillo 2011 (MSSE 43:1725, velocity–fatigue-korrelaatio velocity-vetoa perustelevaksi); LeVe-design-konventio (readiness = 3 riippumatonta kanavaa)
**Koodiankkurit:** engine.js:1132 (`combineReadiness`), engine.js:1146–1149 (2/3-sääntö), engine.js:1151–1158 (velocity-veto), engine.js:1160 (`capLevel`-mappaus), test-runner.js:160 (`testReadiness23Rule`)

Readiness lasketaan kolmesta riippumattomasta kanavasta — **velocity**, **HRV**, **Vara** — jotka kukin luokitellaan GREEN/YELLOW/RED. `combineReadiness(velocityR, hrvR, varaR)` yhdistää ne kahden askeleen logiikalla. Kanavat joiden `class === null` (ei dataa) pudotetaan pois; jos aktiivisia kanavia on 0, tulos on GREEN, capLevel 0 (ei dataa ≠ varoitus — engine ei keksi väsymystä tyhjästä).

**Askel 1 — 2/3-sääntö (`counts`-laskenta):**
- `GREEN ≥ 2` → yhdistetty GREEN
- `RED ≥ 2` TAI (`RED ≥ 1` JA `YELLOW ≥ 1`) → yhdistetty RED
- muuten → YELLOW

Enemmistöperiaate: kahden kanavan konsensus voittaa yksittäisen poikkeaman → suojaa yhden kohinaisen mittarin väärältä hälytykseltä.

**Askel 2 — velocity-veto (asymmetrinen ohitus):** velocity on ainoa kanava jolla on veto-oikeus, koska barbell-nopeus on suorin neuromuskulaarisen väsymyksen mittari (Sánchez-Medina 2011). Jos `velocityR.class === "RED"`:
- yhdistetty GREEN nostetaan YELLOW:ksi (velocity yksin ei tee RED:iä)
- jos lisäksi HRV **tai** Vara on YELLOW/RED (`othersYellowOrRed ≥ 1`) → yhdistetty RED

Veto toimii **vain kiristävään suuntaan** — se ei voi tehdä RED-tuloksesta lievempää. Testivektorit: vel=RED + 2×GREEN → YELLOW; vel=RED + HRV=YELLOW → RED (test-runner.js:160).

**capLevel-mappaus (engine.js:1160):** GREEN→0, YELLOW→1, RED→2. Tämä on ainoa arvo jota `recommend()` lukee — kanavien raakaluokat kulkevat mukana `channels`-objektissa jäljitettävyyttä ja downstream-logiikkaa varten (double-red-detektio, accessory-cap).

**Linkit:** [[readiness-z-luokittelu-mad-sigma]], [[readiness-hrv-lnrmssd-oura]], [[readiness-vara-kanava]], [[readiness-cap-only-periaate]], [[readiness-vx-bump-load-reduction]]
