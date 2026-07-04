# Viikkovolyymi lihasryhmittäin (K4-1)

**Status:** TOTEUTETTU-HEURISTIIKKA
**Lähteet:** Israetel, Hoffmann & Smith 2017 (Scientific Principles of Hypertrophy Training — RP-volyymilandmarkit; DOKUMENTOITU RP-käytäntö, ei peer-reviewed); RP/Israetel-konventio epäsuorien sarjojen 0,5-painosta
**Koodiankkurit:** engine.js:6440 (`CATEGORY_MUSCLE_MAP`), engine.js:6463 (`MUSCLE_VOLUME_BANDS`), engine.js:6470 (`muscleVolumeBand`), engine.js:6486 (`computeWeeklyMuscleVolume`), index.html:8423–8449 (Sykli-kortin volyymikortti), test-runner.js:905–941 (`testWeeklyMuscleVolume`, K41-T1…T7)

K4-1 (retro-kenttähavainto OBS-D, 2026-07-03) syntyi kenttäkysymyksestä "riittääkö hauis 2 sarjaa/vk?" — ohjelman viikkovolyymi lihasryhmittäin ei näkynyt missään. `computeWeeklyMuscleVolume` laskee **suunnitellun** volyymin materialisoidusta viikko-ohjelmasta (`mesocycle.weekPlans → days → slots`), ei toteumasta. Lämmittelyslotit (`role === "warmup"` tai `isWarmup`) eivät kirjaudu; tuntematon kategoria (esim. "muu") jää ilman attribuutiota.

**Suora/epäsuora-konventio:** `CATEGORY_MUSCLE_MAP` mappaa slot-kategorian lihasryhmiin painoilla — suora sarja 1,0, epäsuora 0,5 (RP/Israetel: leuanveto lasketaan hauikselle puolikkaana). Esimerkkejä: `vertikaaliveto → [selkä 1, hauis 0,5]`, `horisontaalityöntö → [rinta 1, ojentaja 0,5, olkapää 0,5]`, `scapular-control → [olkapää 0,5, selkä 0,5]`. Testiankkuri K41-T2: 2 suoraa hauissarjaa + 8 vetosarjaa → efektiivinen 2 + 8 × 0,5 = 6,0 → band "matala".

**Bandit (efektiiviset sarjat/vk, MEV/MAV-linjaus):** ylläpito < 4 · matala 4–9 · kehittävä 10–20 · korkea > 20. Koodissa rajat ovat `max: 4 / 10 / 20.0001 / ∞` eli tasan 4 → matala, tasan 10 → kehittävä, tasan 20,0 → vielä kehittävä, 20,5 → korkea (K41-T6a–d). Kehittävä-band vastaa Israetelin MEV→MAV-aluetta; vrt. [[volyymi-mrv-kategoriakohtainen]]-nootin MRV-katot.

**Design-periaate:** tämä on **näkyvyystyökalu, ei cap** — engine näyttää, atletti päättää (valmentaja, ei nanny; CLAUDE.md §6). UI-kortti (Sykli-näkymä) renderöi suorat + epäsuorat × ½ -erittelyn ja band-chipin, ja alaviite sanoo eksplisiittisesti "Näkyvyys, ei rajoitin". Wizard-puolella sama MEV-ajattelu sen sijaan **on** pakottava lattia hypertrofia-ohjelmille.

Band-rajojen henkilökohtaistaminen (atletin oma MEV/MAV) on mahdollinen 8a-kandidaatti, mutta repo ei määrittele sille tutkimusrajoja — rajat pitää ratifioida syvätutkimuskierroksella ennen opittavaksi ottamista.

**Linkit:** [[volyymi-mrv-kategoriakohtainen]], [[volyymi-weekly-stimulus]]
