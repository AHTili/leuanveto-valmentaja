# Cap-only-periaate + accessory-itsenäisyys

**Status:** TOTEUTETTU-HEURISTIIKKA   (LeVe-ydinperiaate: readiness rajoittaa muttei pakota)
**Lähteet:** LeVe-design (engine = valmentaja, ei nanny, CLAUDE.md §6); autoregulaatio-konsensus (readiness-markerit ovat kattoja, eivät lattioita)
**Koodiankkurit:** engine.js:5121–5142 (cap-sovellus recommend():ssa), engine.js:5123 (`deltaPct = Math.min(deltaPct, 0)`), engine.js:5952–5963 (accessory-cap 3/3), engine.js:6029–6037 (accessory −30 %), test-runner.js:270 (accessory-cap-kommentti)

**Cap-only** on readiness-järjestelmän perusperiaate: huono readiness **rajoittaa** kuormaa mutta **ei koskaan pakota** sitä ylös. Hyväkään readiness ei nosta suunniteltua kuormaa — se vain sallii ohjelman edetä. Toteutus näkyy siinä, että RED/YELLOW soveltaa aina `Math.min`-lattian ja negatiivisen lisän deltaPct:hen, ei koskaan positiivista:
- RED (`capLevel === 2`): `deltaPct = Math.min(deltaPct, 0)` — poistaa progressiivisen noston, sitten lisää load-reduction (ks. [[readiness-vx-bump-load-reduction]]).
- YELLOW (`capLevel === 1`): `deltaPct = deltaPct × 0.5` — puolittaa noston, sitten −2 %.

Positiivinen deltaPct (ohjelman progressio, kapasiteettibonus) syntyy **muualla**; readiness voi vain leikata sitä. Näin väsyneenäkin atletti voi tehdä *kevyemmän* session ohjelman mukaan, mutta engine ei anna huonon HRV:n perusteella "pakko-deloadia" jos velocity ja Vara ovat vihreitä (2/3-sääntö suojaa yksittäiseltä kohinalta).

**Accessoryt ovat itsenäisiä primary-cappauksesta.** Tukiliikkeiden volyymi ei laske YELLOW:ssa eikä yksittäisessä RED-kanavassa. Ainoa poikkeus: **3/3-sääntö** (engine.js:5952–5963) — accessory-cap aktivoituu vain kun `capLevel === 2` JA **kaikki kolme kanavaa** ovat RED tai YELLOW (`allBad`, ei yhtään GREEN aktiivista kanavaa). Tällöin accessory-sarjamäärät leikataan −30 % (`Math.max(2, round(sets × 0.7))`, engine.js:6029–6037; lattia 2 sarjaa). Trace: `ACCESSORY_CAP_ACTIVE`.

Logiikka: yksi tai kaksi huonoa kanavaa = mahdollinen kohina tai liikespesifi väsymys → primary cappaa mutta tukityö jatkuu. Kolme huonoa kanavaa = systeeminen väsymys → myös apuvolyymi kevenee. Isolation-liikkeen last-set V0 lyhyellä tauolla EI laukaise cappia (normaali hypertrofiastimulus, ks. [[failure-isolation-poikkeus]]).

**Linkit:** [[readiness-2of3-saanto-velocity-veto]], [[readiness-vx-bump-load-reduction]], [[readiness-vara-kanava]], [[failure-isolation-poikkeus]], [[progressio-deload-protokolla]]
