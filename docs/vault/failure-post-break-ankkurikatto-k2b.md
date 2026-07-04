# Post-break-ankkurikatto K2b

**Status:** TOTEUTETTU-HEURISTIIKKA (kenttäevidenssiin perustuva korjaus; +5 %:n headroom on design-valinta, ei tutkimusarvo)
**Lähteet:** retro-kenttäauditti OBS-D (KORI 2, ratifioitu Akseli; APP_VERSION 4.52.55); kenttäcase: dipin 1RM-arvio 103,1 kg tauon-edeltävästä datasta, vaikka paluu = yksi kolmonen
**Koodiankkurit:** engine.js:4535–4570 (K2b primary-polku, `POST_BREAK_ANCHOR_CAP`-trace), engine.js:5823–5846 (K2b Haara C: eri-liike-apuliikkeiden oma e1RM), engine.js:1749–1750 (`RELOAD_CONFIG.thresholdDays` — jaettu 14 pv:n kynnys), sw.js:759–760 (versiohistoria 4.52.55)

Ongelma: `currentE1RMSystem` lasketaan mediaanina viimeisimmistä top-seteistä (evidenssi-ikkuna, viimeiset 6 topia). Tauon jälkeen ikkunassa dominoi tauon-EDELTÄVÄ data — yksi kevyt paluusuoritus ei syrjäytä vanhaa mediaania, joten engine ohjelmoi paluusession kuormat vanhentuneen kapasiteettiarvion mukaan (dippi: 1RM-arvio 103,1 → 8·V3 @ 67,5 kg pelkällä varoitusbannerilla). Tuore evidenssi ei ajanut, vanha ajoi.

**Sääntö (engine.js:4535–4570):** jos evidenssi-ikkunan sisällä on ≥ 14 pv:n gap suoritusPÄIVIEN välillä (`RELOAD_CONFIG.thresholdDays` — sama kynnys kuin H-016-reloadilla ja paluubannerilla) JA gapin jälkeisiä settejä on olemassa, niin `ankkuri = min(nykyinen, post-break-paras × 1,05)`. Vain alaspäin: cap ei koskaan nosta ankkuria. +5 %:n headroom estää atletin jumittumisen paluutasoon — progressio saa ylittää tuoreimman näytön maltillisesti.

**Tärkeät reunaehdot:**

- **Gap lasketaan suorituspäivistä** (session `dateISO`, fallback timestamp-päivä; K2c-korjaus varmisti evidenssin dateISO-sortin) — ei kirjauspäivistä.
- **Post-break-cal sisältyy post-ikkunaan luonnostaan:** cal-re-entry-testi on tuorein evidenssi → cap ≥ cal eikä leikkaa sitä (yhteispeli OBS-052 KERROS 2:n kanssa, ks. [[failure-tauko-reload-h016]]).
- **Primer-overridea EI capata** — se on eksplisiittinen TÄMÄN PÄIVÄN mittaus (velocity-primer, engine.js:4576→).
- **Haara C (engine.js:5823–5846):** sama cap ajetaan myös eri-liike-apuliikkeiden omasta historiasta lasketulle e1RM:lle (`ownE1RM`) — muuten accessory-polku olisi vuotanut vanhan ankkurin capin ohi.

**Työnjako H-016:n kanssa:** reload (ks. [[failure-tauko-reload-h016]]) preskriptoi paluusession TARGET-kuorman (mitä tehdään); K2b korjaa e1RM-ANKKURIN (mihin kapasiteettiarvioon kaikki muu laskenta nojaa) tauon jälkeen. Reload on rakenteellisesti eristetty Best-lukupolusta, mutta ilman K2b:tä normaali target olisi laskettu vanhentuneesta ankkurista heti rampin päätyttyä. Yhdessä ne toteuttavat periaatteen: tuore evidenssi ajaa, vanha ei nosta.

**8a-huomio:** headroom-kerroin 1,05 ja ikkunaehto ovat design-vakioita — ei opittava-kandidaatti; jos live-data (vk 25+ paluut) osoittaa headroomin liian tiukaksi/löysäksi, arvo päivitetään ratifioinnin kautta kuten reload-matriisi.

**Linkit:** [[failure-tauko-reload-h016]], [[failure-break-detektio-ja-globaali-paluu]], [[e1rm-epley-vara-kaava]]
