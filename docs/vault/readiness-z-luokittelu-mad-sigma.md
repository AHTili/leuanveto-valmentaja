# z-luokittelu ja MAD-sigma-baseline

**Status:** TOTEUTETTU-HEURISTIIKKA   (robusti-tilasto standardimenetelmä; luokkarajat heuristiset)
**Lähteet:** MAD-robustiestimaatti (Rousseeuw & Croux 1993, `1.4826 × MAD` ≈ σ normaalijakaumalle); LeVe-design (GREEN/YELLOW/RED-rajat)
**Koodiankkurit:** engine.js:196 (`madSigma`), engine.js:202 (`zScore`), engine.js:184 (`median`), engine.js:191 (`mad`), engine.js:958 (`computeBaseline`), engine.js:966 (`classifyReadinessZ`), test-runner.js:152 (boundary-testit)

Velocity- ja HRV-kanavat luokitellaan **z-pisteellä**, joka mittaa kuinka monta robustia keskihajontaa tämän päivän arvo poikkeaa henkilökohtaisesta baselinesta. Baseline lasketaan **mediaanilla ja MAD-sigmalla**, ei keskiarvolla ja SD:llä — molemmat robusteja outliereille (yksittäinen kohinapiikki ei siirrä baselinea).

**Laskentaketju:**
1. `computeBaseline(values, windowN)` (engine.js:958): ottaa viimeiset `windowN` arvoa; **vaatii vähintään 3 datapistettä**, muuten palauttaa `null` (→ kanava inaktiivi, ei arvausta). Palauttaa `{ median, madSigma, n }`.
2. `mad(arr)` (engine.js:191): `median(|xᵢ − median(x)|)` — poikkeamien mediaani.
3. `madSigma(arr)` (engine.js:196): `1.4826 × MAD`. **Nollasuoja:** jos MAD = 0 (kaikki arvot identtisiä), palautetaan `1e-6` — estää jaon nollalla.
4. `zScore(value, med, sigma)` (engine.js:202): `(value − median) / max(1e-6, sigma)`.

**Luokkarajat (`classifyReadinessZ`, engine.js:966):**
- `z > −0.5` → GREEN
- `z > −1.0` → YELLOW
- muuten → RED

**Rajan konservatiivinen tulkinta (v4.28.0 bugfix):** rajalla valitaan aina *alempi* (varovaisempi) luokka. `z === −0.5` → YELLOW (ei GREEN), `z === −1.0` → RED (ei YELLOW). Peruste: grinderin ei pidä pystyä ohittamaan varoitusta rajatapauksessa. Testivektorit: −0.49→GREEN, −0.50→YELLOW, −0.99→YELLOW, −1.00→RED (test-runner.js:152).

Huom: luokittelu on **yksisuuntainen** — se reagoi vain baselinen *alapuolelle* menoon. Positiivinen z (parempi kuin baseline) on aina GREEN; readiness ei koskaan pakota kovempaa treeniä hyvän mittarin perusteella (ks. cap-only).

**8a-prior:** luokkarajat `{ greenBoundary: −0.5, yellowBoundary: −1.0 }` ovat opittava-parametri-kandidaatteja. Priorit −0.5 / −1.0 σ. HRV-kanavalle luonnollinen tutkimusankkuri on SWC = 0.5 × SD (ks. [[readiness-hrv-lnrmssd-oura]]) → greenBoundary-prior −0.5 osuu SWC-konventioon; posterior clampattava välille [−0.75; −0.25] (±0.5×SWC). yellowBoundary heuristisempi, ei suoraa tutkimusankkuria — pidä leveämpi clamp [−1.5; −0.75].

**Linkit:** [[readiness-2of3-saanto-velocity-veto]], [[readiness-hrv-lnrmssd-oura]], [[readiness-vara-kanava]]
