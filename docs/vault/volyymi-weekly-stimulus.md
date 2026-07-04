# weeklyStimulus — vetosarjat, tonnage ja heavy-altistukset

**Status:** TOTEUTETTU-HEURISTIIKKA
**Lähteet:** eliittitason valmennuskäytäntö (kynnykset koodikommenteissa ilman nimettyä tutkimusta); heavy-altistuksen määritelmä nojaa Vx = RIR -identiteettiin (Helms 2016 RIR-RPE)
**Koodiankkurit:** engine.js:6387 (`weeklyStimulus`), engine.js:6411–6412 (heavy-altistuksen määritelmä), engine.js:7003 (`eliteVolumeCheck`), data.js:64 (`PULL_VOLUME_CATEGORIES`), index.html:5271 (`renderStimCard`), index.html:5275–5283 (skip-rivien suodatus, H-015 ABC/C)

`weeklyStimulus` laskee **toteutuneesta** set-datasta neljä aggregaattia: `pullVolumeSets`, `pullVolumeTonnage`, `heavyExposures` ja `totalTonnageExternal` (+ `byCategory`-erittelyn). Vetovolyymiin lasketaan kategoriat `vertikaaliveto`, `horisontaaliveto` ja `hauisfleksio` (`PULL_VOLUME_CATEGORIES`, data.js:64) — sama setti ohjaa liikkeiden `countsAsPullVolume`-lippua (data.js:1519, 1586, 1646, 1660).

**Heavy-altistus:** sarja jossa `effectiveReps = reps + (actualVx ?? targetVx ?? 1) ≤ 4` — eli toistot + jäljellä oleva vara. 3×3 V1 on heavy-altistus (3+1=4), 5×5 V2 ei (5+2=7). Määritelmä sitoo raskauden lähelle-failurea-vietyihin mataliin toistoihin, ei pelkkään kuormaprosenttiin.

**`eliteVolumeCheck`-kynnykset (engine.js:7003–7041):** (1) vetosarjat: varoitus kun < 12/vk, viesti suosittaa ≥ 15 — kynnys ja tavoite ovat tarkoituksella epäsymmetriset (hälytys vasta selvässä alituksessa); (2) heavy-altistukset: varoitus kun < 3/vk, viesti suosittaa ≥ 6; (3) työntö/veto-tasapaino: varoitus kun työntösarjat < 50 % vetosarjoista (tavoite ≥ 1:2). Nämä ovat eliittitason heuristiikkoja, eivät verifioituja invariantteja — vrt. atletin profiilin tarkoituksellisen korkea volyymi.

**UI-kaksisuuntaisuus:** stimulus-kortti (index.html:5298) merkitsee heavy-altistusten luvun warn-tyylillä kun niitä on **yli 4** — eli UI varoittaa kasautuvasta raskaudesta samalla kun `eliteVolumeCheck` varoittaa niukkuudesta (< 3). Ikkuna 3–4 heavy-altistusta/vk on molempien signaalien hiljainen alue; tämä kahden pään logiikka on tietoinen (yli- ja alikuormitus ovat eri riskejä).

**Eheysrajaus (H-015 ABC/C):** skip-merkityt rivit (`setRole === "skipped"` tai `reps == null`) suodatetaan ennen laskentaa — muuten skip-rivi laskisi settimääriin ja heavy-altistuksiin (`effectiveReps = 0 + targetVx ≤ 4`). Sama kanoninen ehto kuin historia-poluissa. Warmup-settejä ei erikseen suodateta `weeklyStimulus`-tasolla; kutsujan viikkofiltteri vastaa joukosta.

**Linkit:** [[volyymi-viikkovolyymi-lihasryhmittain]], [[volyymi-mrv-kategoriakohtainen]], [[e1rm-epley-vara-kaava]]
