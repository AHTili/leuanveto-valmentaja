# Liike-tason paluuramppi H-016 (reload)

**Status:** TOTEUTETTU-HEURISTIIKKA (evidenssi KOHTALAINEN — R1 §2.5 käytäntösynteesi, EI RCT-protokolla; kipu-gate on kliininen periaate R1 §2.3)
**Lähteet:** H-016-handoff (ratifioitu Akseli 2026-06-12; toteutettu + dormantti, odottaa vk 25 dippipaluun live-porttia); R1-syvätutkimus §2.3/§2.5/§2.6; DiStasio (cal-re-entry-testin tarkkuus ±2,7 kg, OBS-052 KERROS 2)
**Koodiankkurit:** engine.js:1726–1758 (design-kommentti + `RELOAD_CONFIG`), engine.js:1764–1856 (`computeMovementReload`), engine.js:5407–5439 (min-precedence recommend()-polussa, `BREAK_RELOAD`-trace), engine.js:5891–5928 (K2a: non-primary-slotit, `BREAK_RELOAD_SLOT`), index.html:7235–7245 (paluuramppibanneri, A6), test-runner.js:777–809 (H016-lukot), test-runner.js:1039–1056 (cal-ohitus)

Globaali `breakAnalysis` toimii koko treenin granulariteetilla eikä laukea, kun muu treeni jatkuu ja vain yksi liike on tauolla/korvattuna (ks. [[failure-break-detektio-ja-globaali-paluu]]). H-016 tunnistaa LIIKKEEN tauon ja preskriptoi kevennetyn paluun + lineaarisen toteuma-ankkuroidun rampin takaisin tauon-edeltävään tasoon.

**RELOAD_CONFIG (engine.js:1749–1758):**

| Tauko | Korvaava liike oli | Ei korvaavaa |
| --- | --- | --- |
| 14–27 pv | −12,5 % | −15 % |
| ≥ 28 pv | −15 % | −20 % |

Lisäksi: `thresholdDays: 14` (sama kynnys kuin paluubannerilla — yksi käsite käyttäjälle), `vaivaFloorPct: 0.15` (A5: vaiva-syytagi pakottaa vähintään konservatiivisen pään, esim. 12,5 % → 15 %; test-runner.js:785) ja `rampSessions: 3` (1. paluusessio + 2 porrasta ≈ 2 vk tyypillisellä frekvenssillä).

**Kaksi tilaa (engine.js:1814–1855):** TILA 1 — tauko käynnissä nyt (gap ≥ 14 pv) → 1. paluusessio: `targetKg = anchorKg × (1 − reloadPct)`. TILA 2 — ramppi: porras nousee TOTEUMASTA (`min(anchor, prevActual + (anchor − prevActual) / stepsLeft)`), ei kalenterista — skipattu paluusessio pysäyttää portaan (toteuma-ankkurointi = mekaaninen kipu-gate ilman kuittauskitkaa, §6.3). Ramppisimulaatio dippipaluulle: 75 kg:n ankkurista 63,8 → 69,4 → 75,0 kg (docs/H-016-ramppisimulaatio.md).

**A3-ankkuri:** vain oikeat työsarjat kelpaavat (`setRole === "top"` JA `externalLoadKg > 0`) — kehonpaino-0 kg-kirjaukset eivät saa ankkuroida (VAIHE A -löydös: dippi-ansa; test-runner.js:800–803). Ankkuri = tauon-edeltävän session mediaani-työkuorma, EI `computeMovementE1RMBest` → reload on rakenteellisesti eristetty trendikortin lukupoluista.

**Cal-re-entry-ohitus (OBS-052 KERROS 2, engine.js:1827–1840):** tuore kalibrointisetti paluujaksolla = re-entry-testi (luotettavin signaali, DiStasio ±2,7 kg) → `computeMovementReload` palauttaa null ja cal-ajava progressio jatkuu; graduaali ramppi kohti vanhaa tasoa olisi väärä ja sekoittava, kun nykykapasiteetti on jo mitattu.

**Min-precedence (§6.1, engine.js:5407–5439):** reload applioidaan `targetExternalLoad`-tasolle ENNEN `sessionEffectiveE1RM`-johdantoa → kevennys säteilee back-off/secondaryyn ilmaiseksi (§6.2). Konservatiivisin target voittaa; kevennyksiä EI kumuloida (min() kattaa myös globaalin breakAnalysis-modifierin ja H-017 D1:n, ks. [[failure-intra-session-h017-d1]]). Dormantti kun liike treenattu < 14 pv sisällä — arjen polku pysyy bittitarkkana.

**K2a-laajennus (retro-kenttä OBS-D, engine.js:5891–5928):** v1 rajasi accessoryt ulos; kenttäevidenssi purki rajauksen (dippi MA-vetopäivän accessoryna palasi tauolta yhdellä kolmosella → engine ankkuroi tauon-edeltävään e1RM:ään täydellä kuormalla). Sama mekanismi ajetaan nyt accessory/secondary/backoff-sloteille eri liikkeillä (`BREAK_RELOAD_SLOT`); saman liikkeen slotit perivät primaryn kevennyksen jo e1RM-säteilystä → ohitetaan tuplakevennyksen estämiseksi. Vain alaspäin.

**8a-huomio:** reloadPct-matriisi ja ramppinopeus ovat eksplisiittisesti konfiguroitavia oletuksia, eivät tutkimustotuuksia — reunaehto (b): staattisia, EI opita (engine.js:1745–1748). A8-falsifiointi-instrumentointi (`BREAK_RELOAD`-trace) kerää vertailudataa R1 §2.6 -ennustetta vasten; jos live-data (vk 25+ dippipaluu) osoittaa matriisin systemaattisesti vääräksi, arvot päivitetään käsin ratifioinnin kautta.

**Linkit:** [[failure-break-detektio-ja-globaali-paluu]], [[failure-post-break-ankkurikatto-k2b]], [[failure-intra-session-h017-d1]]
