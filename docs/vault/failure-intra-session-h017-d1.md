# Intra-session-autoregulaatio H-017 D1 (vain alaspäin)

**Status:** TOTEUTETTU-HEURISTIIKKA (parametrit konfiguroitavia oletuksia; aritmetiikka peilaa recommend()-polun verifioitua e1RM-laskentaa)
**Lähteet:** H-017-handoff (ratifioitu Akseli 2026-06-12, suljettu 2026-06-14, APP_VERSION 4.52.42); OBS-038-päätökset 2026-06-10 (v1 = vain alaspäin, kaksisuuntaisuus = v2-arvio kisan jälkeen); Epley + Vara -e1RM-identiteetti
**Koodiankkurit:** engine.js:390–429 (invarianttidokumentaatio), engine.js:430–489 (`resolveIntraSessionAdjustedLoad`), index.html:13929–14008 (UI-handler + `INTRA_SESSION_ADJUST`-trace), index.html:12716–12723 (asetukset: triggerPct/plateStep), index.html:13362/13431/13474 (gate 1 -snapshotit), test-runner.js:812–874 (T1–T9-lukot)

Kun atletti tekee primaryn kaikki työsarjat suunniteltua kevyemmällä kuormalla (heikko päivä, itse kevennetty), saman liikkeen tekemättömät back-off-slotit re-resolvoidaan päivän TOTEUMASTA enginen omalla aritmetiikalla — suunnitelma ei saa määrätä back-offia joka ei enää vastaa päivän kapasiteettia. Puhdas funktio: UI-handler kerää syötteet, soveltaa ja tracaa.

**Gatet ja invariantit:**

- **Gate 1 — snapshot:** suunniteltu kuorma (`plannedLoadKg`) ja kanoninen `sessionEffectiveE1RM` lukitaan session alussa ENNEN manuaalimuokkauksia (index.html:13362, 13431, 13474; MEMORY-oppi 10: älä luota elävään loadKg:hen).
- **Gate 2 — toteuma:** mediaani valmiiden pääsarjojen kuormista + mediaani-reps/-Vx → toteuma-e1RM.
- **Gate 3 — laukaisukynnys KUORMA-avaruudessa:** `(plannedPrimaryMedian − actualMedian) ≥ max(planned × triggerPct, plateStepKg)`; oletukset 2 % / 2,5 kg, atletti voi säätää asetuksista (0 % sallittu). E1RM-avaruudessa kynnys laukeaisi joka sessiossa, koska lukittu e1RM on rakenteellisesti korkeampi.
- **Gate 4 — puhdas re-resolve:** ei tasaista %-kerrointa vaan Branch A -pariteetti (`enginePct = planExt / canonicalE1RM` → `derived = e1rmActual × enginePct`), eikä back-offille kutsuta near-failure/failure-logiikkaa → ei tuplakevennystä (MEMORY-oppi 11: johda suhde suunnitellusta arvosta, ei kaavasta).
- **A3 — min-tae:** `finalLoadKg = min(planned, derived)` — kuormaa EI koskaan nosteta tätä kautta.
- **A4 — ärsykelattia 0,75:** lattia lasketaan KANONISESTA `sessionEffectiveE1RM`-arvosta (`floorPct = 0.75`), EI toteumasta — muuten lattia liukuisi toteuman mukana alas. Alitus → clamp + `floorClamped`-lippu (testi T4: 0,75 × 190,2 = 142,5 kg).
- **A5 — vain alaspäin:** `adjusted = finalLoadKg < plannedLoadKg`.

**Scope-rajaus (prioriteettilinjaus):** vain saman liikkeen `role === "backoff"` -slotit; secondary/calibration-openereita ei kosketa. Ehto laukeaa vasta kun primaryn KAIKKI työsarjat on kirjattu; jo aloitettua back-offia ei säädetä; `_intraAdjusted`-idempotenssilippu estää toiston (index.html:13953–13965).

**H-016-yhteensovitus:** reload-kevennetty suunniteltu taso on jo min-precedencen alainen syöte — jos reload-suunniteltu on matalampi kuin toteumajohdettu, D1 ei kevennä lisää (`minBranch: "planned"`, testi H017-T7, test-runner.js:853–857). Kevennykset eivät kumuloidu. Ks. [[failure-tauko-reload-h016]].

**Suhde K3-3:een:** K3-3 D1-v2 (sarjasta sarjaan -säätö V0:sta/near-failuresta saman exercise-objektin sisällä) ja H-017 D1 (slotista slottiin -re-resolve primaryn toteumasta back-offiin) ovat eri kerrokset — gate 4 pitää ne erillään. Ks. [[failure-refalo-kuormapudotus]].

**8a-huomio:** `triggerPct`/`plateStepKg` ovat käyttäjäasetuksia ja `floorPct 0,75` design-vakio ilman suoraa tutkimuspriota — ei opittava-kandidaatti v1:ssä. Kaksisuuntainen v2 (myös ylöspäin) arvioidaan kisan 22.8.2026 jälkeen; avoimet latentit OBS-045/046/047 (docs/backlog.md:384–391).

**Linkit:** [[failure-refalo-kuormapudotus]], [[failure-tauko-reload-h016]], [[failure-strategiat-abc-blokeittain]], [[e1rm-epley-vara-kaava]]
