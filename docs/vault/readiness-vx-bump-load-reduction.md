# readinessVxBump + RED/YELLOW-kuormanvähennys

**Status:** TOTEUTETTU-HEURISTIIKKA   (cap-vähennykset design-heuristiikkaa; erillinen deload-invariantista)
**Lähteet:** LeVe-design (turvapuskuri väsyneenä); double-red johdettu velocity+Vara-konvergenssista väsymyssignaalina (Sánchez-Medina 2011)
**Koodiankkurit:** engine.js:5119–5142 (cap-sovellus), engine.js:5132 (double-red −8 % / −5 %), engine.js:5124–5128 (heavy→volume-vaihto), engine.js:5136–5141 (CAP_YELLOW), engine.js:5159–5162 (Vx-bumpin sovellus targetVx:ään)

Kun readiness cappaa, engine tekee **kaksi rinnakkaista säätöä**: laskee kuormaa (`readinessLoadReduction`) JA nostaa tavoite-varaa (`readinessVxBump`). Vx-bumpin idea: kevennetään myös rasitustavoitetta, jotta sarjat eivät mene failureen väsyneenä — turvapuskuri grinderin taipumusta vastaan.

**RED (`capLevel === 2`, engine.js:5121–5135):**
- `deltaPct = Math.min(deltaPct, 0)` (poista nosto)
- **Heavy→volume-vaihto:** jos `dayType === "heavy"`, se vaihdetaan `"volume"`:ksi (trace `CAP_RED_DAYTYPE`) — raskas yksittäissarjapäivä ei sovi punaiselle readinessille.
- **Load reduction:** −5 % normaalisti. **Double-red** (sekä velocity ETTÄ Vara RED, engine.js:5130–5132) → −8 %, koska kahden riippumattoman väsymysmittarin konvergenssi = syvä väsymys.
- `readinessVxBump = 1` (aina RED:ssä).
- Trace: `CAP_RED`.

**YELLOW (`capLevel === 1`, engine.js:5136–5141):**
- `deltaPct = deltaPct × 0.5` (puolita nosto)
- Load reduction −2 %.
- Ei Vx-bumpia, ei dayType-vaihtoa.
- Trace: `CAP_YELLOW`.

**Vx-bumpin sovellus (engine.js:5159–5162):** `readinessVxBump` lisätään `targetVx`-arvoon *kaikkiin* päivän työsarjoihin sen jälkeen kun targetVx on resolvattu slotista/weekDefistä. Esim. target V2 heavy → RED → V3, plus kuorma −5 % ja päivä volume. Nolla-suoja: bump sovelletaan vain jos `targetVx !== null`.

**Ero deloadiin:** nämä ovat *päiväkohtaisia* readiness-cappeja (−2…−8 %), eivät mesosyklin deloadia (−20…−30 %, Helms 2018). Cap on reaktiivinen yhden session signaaliin; deload on suunniteltu tai stagnaatiovetoinen viikkotason kevennys. Ne voivat kasautua (RED-päivä deload-viikolla) mutta ovat eri mekanismeja.

**8a-prior:** `readinessRedLoadReduction`: prior −0.05, `readinessDoubleRedReduction`: prior −0.08, `readinessYellowLoadReduction`: prior −0.02. Heuristiset priorit ilman suoraa tutkimusankkuria; posterior clampattava konservatiivisesti (RED [−0.08; −0.03], double-red [−0.12; −0.05], YELLOW [−0.04; −0.01]) ettei cap kasva deload-luokkaan (−20 %) yksittäisen session perusteella.

**Linkit:** [[readiness-cap-only-periaate]], [[readiness-2of3-saanto-velocity-veto]], [[readiness-vara-kanava]], [[progressio-deload-protokolla]], [[failure-refalo-kuormapudotus]]
