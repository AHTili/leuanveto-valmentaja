# Break-detektio ja globaali paluuprotokolla

**Status:** TOTEUTETTU-HEURISTIIKKA (detraining-portaat käytäntöperustaisia; ei suoraa RCT-invarianttia)
**Lähteet:** detraining-käytäntösynteesi (v1-engine); H-015 §7 A1-kartta (granulariteettitäsmennys: koko treeni vs yksittäinen liike)
**Koodiankkurit:** engine.js:1692–1723 (`breakAnalysis`), engine.js:1861–1866 (`mesocycleBreakReset`), engine.js:4403–4427 (recommend()-integraatio: `RETURN_FROM_BREAK` + `MESOCYCLE_BREAK_RESET`), engine.js:5095–5100 (`BREAK_MODIFIER`: deltaPct-kytkentä), test-runner.js:489–512 (porras- ja reset-testit), tools/engine-pilot/profiles/returner-3mo-break.mjs (pilot-profiili)

Globaali break-detektio vertaa viimeisimmän session päivämäärää tämänpäiväiseen: `breakDays = floor((today − lastSession) / vrk)`. Portaat (engine.js:1699–1722):

| Tauko | modifier | forcedDayType | Viesti |
| --- | --- | --- | --- |
| < 7 pv | 0 | — | ei reaktiota (normaalirytmi) |
| 7–13 pv | −5 % | — | "Viikon tauko — aloitetaan hieman kevyemmin" |
| 14–27 pv | −10 % | volume | "2 viikon tauko — volume-päivä ensin" |
| ≥ 28 pv | −15 % | volume | "Pitkä tauko — aloitetaan konservatiivisesti, 1–2 viikossa normaaliin" |

**Kytkentä recommend()-polkuun:** modifier lisätään suoraan `deltaPctRawValue`-arvoon (engine.js:5095–5100, `BREAK_MODIFIER`-trace) ja `forcedDayType` ylikirjoittaa päivätyypin (`RETURN_FROM_BREAK_DAYTYPE`). Kerros kerrostuu varaCorrectionin ja momentum-bonusten kanssa deltaPct-summassa (ENGINE_DECISION_POINTS_MAP kohta 27) — mutta H-016-reloadin min-precedence takaa, ettei liike-tason kevennys kumuloidu globaalin päälle (ks. [[failure-tauko-reload-h016]]).

**Mesosyklin nollaus (engine.js:1861–1866, 4417–4426):** kun `breakDays ≥ 14`, lasketaan `skippedWeeks = floor(breakDays / 7)`; jos ≥ 2 viikkoa skipattiin, mesosykli nollataan viikkoon 1 (`createDefaultMesocycle`) — blokin progressio-oletus (deltaPctBase-kaari) ei ole enää validi kahden viikon aukon jälkeen. Alle 2 viikon skippaus jatkaa sykliä normaalisti (test-runner.js:509–513: 2 vk → reset, 1 vk → ei).

**Granulariteettiraja (H-015/H-016-löydös):** tämä kerros näkee vain VIIMEISIMMÄN session — se EI laukea, kun atletti treenaa muuten normaalisti mutta yksi liike on tauolla tai korvattuna (esim. dippi vaivan takia ulkona 3 viikkoa, muu treeni jatkuu). Liike-tason tauko hoidetaan H-016-reload-kerroksella (kynnys 14 pv, sama käsite käyttäjälle) ja tauon jälkeinen ankkurin korjaus K2b-catolla — ks. [[failure-tauko-reload-h016]] ja [[failure-post-break-ankkurikatto-k2b]].

**8a-huomio:** portaiden arvot (−5/−10/−15 %) ovat detraining-heuristiikkaa ilman kirjattua tutkimuspriota — mahdollinen syvätutkimuskohde (detraining-aikavakiot voimaominaisuuksille, vrt. Issurin-residuaalit [[progressio-mesosyklirakenne]]), mutta EI opittava-kandidaatti ennen priorin verifiointia.

**Linkit:** [[failure-tauko-reload-h016]], [[failure-post-break-ankkurikatto-k2b]], [[progressio-deload-protokolla]], [[progressio-mesosyklirakenne]]
