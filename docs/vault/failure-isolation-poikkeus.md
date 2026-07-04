# Isolation-poikkeus: last-set V0 = normaali stimulus

**Status:** TOTEUTETTU-HEURISTIIKKA (käytäntökonsensus, ei RCT-invariantti)
**Lähteet:** RP/Israetel-, Helms- ja Schoenfeld-käytäntökonsensus (isolation-liikkeen viimeinen sarja saa mennä V0–V1:een hypertrofian takia); käyttäjäpalaute 2026-05-04 (hauiskääntö-case)
**Koodiankkurit:** engine.js:1882–1893 (design-kommentti v4.34.25/v4.34.28), engine.js:1902–1933 (isolation-haara: ISO-NORMAL + ISO-MID), data.js:130–150 (`ISOLATION_CATEGORIES` + `isIsolationMovement`), index.html:13794–13806 (luokitus + kutsu), test-runner.js:398–445 (isolation-testit)

Compound-primaryn V0 on failure-tapahtuma (ks. [[failure-strategiat-abc-blokeittain]]); isolation-liikkeen viimeisen sarjan V0 EI ole. Hypertrofiatyössä (hauiskääntö, pohjenosto, sivunosto) viimeinen sarja saa ja tyypillisesti pitäisi mennä lähelle failurea — engine joka kevensi ensi viikkoa tästä oli yli-suojaava. Laukaiseva kenttäcase: 3×12 × 16 kg V3/V2/V0 (1 min tauot) → engine ehdotti −2,5 % ensi viikolle. Periaate: engine = valmentaja, ei nanny (sama linja kuin CLAUDE.md §6).

**Mekanismi (engine.js:1902–1933):** isolation-haara ajetaan ENNEN block-aware-logiikkaa, koska isolation-luokitus pätee kaikissa blokeissa. Ehto `opts.isIsolation === true && !isPrimary`:

- **ISO-NORMAL** (last-set V0): kuorma säilyy, `shouldStop: true` (sarja loppui joka tapauksessa), `nextWeekLoadAdjust: 0` — ei mitään kevennystä.
- **ISO-MID** (V0 ennen viimeistä sarjaa): loppusarjat −5 % (`currentLoadKg × 0.95`), mutta EI ensi viikon säätöä — liian aggressiivinen kuorma TÄLLÄ kerralla, ei trendi.
- **Multi-set V0 -soft-varoitus (v4.34.28, engine.js:1897–1907):** kun ≥ 2 peräkkäistä V0:aa (`opts.previousSetVxs`), palautetaan `warning`-kenttä ("kuorma todennäköisesti liian raskas tällä kertaa · harkitse −2,5 kg · atleetin valinta") — UI näyttää toastin, mutta engine ei pakota mitään. Testattu 3/3 V0 asti: strategia pysyy ISO-NORMAL (test-runner.js:441–445).

**Luokituslähde (data.js:135–145):** `ISOLATION_CATEGORIES`-settiin kuuluvat hauisfleksio, ojentaja-ext, calf-isolation, shoulder-isolation, hamstring-isolation, knee-dominant-isolation, scapular-control, core-hollow ja core-antirotation. UI hakee luokan `isIsolationMovement(exercise.category)`-kutsulla (index.html:13796) ja päättelee `isLastSet`-lipun työsarjoista (warmupit pois).

**Rajaus:** poikkeus EI koske compound-liikkeitä missään roolissa eikä primary-roolia edes isolation-kategoriassa (`!isPrimary`-ehto). Foundation-primaryn V0 tuottaa yhä −2,5 % ensi viikolle (regressiotesti test-runner.js:421–423). Vastaava ei-yli-suojaamis-linja koskee myös last-set V0:aa lyhyillä tauoilla — se ei laukaise seuraavan viikon kevennystä (muistisääntö `feedback_isolation_v0_overprotect`).

**8a-huomio:** ei opittava-parametri-kandidaatti — haara on binäärinen luokitussääntö (kategoria + sarjapositio), ei numeerinen parametri jolla olisi tutkimusprior.

**Linkit:** [[failure-refalo-kuormapudotus]], [[failure-strategiat-abc-blokeittain]]
