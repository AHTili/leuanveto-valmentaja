# Failure-strategiat A/B/C blokeittain

**Status:** TOTEUTETTU-HEURISTIIKKA (drop-suuruus −5 % on VERIFIOITU-INVARIANTTI E — ks. [[failure-refalo-kuormapudotus]]; blokki-strategiajako on vaiheen 1 syvätutkimussynteesi)
**Lähteet:** Refalo 2023 (failure-recovery 24–48 h); Tuchscherer RTS (2-failure rule, käytäntökirjallisuus); vaiheen 1 syvätutkimus (ChatGPT + Claude -synteesi, v4.32.8)
**Koodiankkurit:** engine.js:1872–1893 (design-kommentti), engine.js:1894 (`failureReaction`-signatuuri), engine.js:1941–1952 (Strategia A), engine.js:1954–1964 (Strategia C), engine.js:1966–1986 (Strategia B), index.html:13786–13824 (V0-handler + loppusarjojen säätö), test-runner.js:361–392 (block-aware-testit)

`failureReaction(currentLoadKg, targetReps, isPrimary, consecutiveFailures, blockPhase, opts)` on block-aware v4.32.8:sta alkaen. Compound-primaryn V0 (täysi failure) saa eri strategian blokin vaiheen mukaan, koska failure-stimuluksen siedettävyys ja CNS-kustannus vaihtelevat blokeittain:

| Blokki | Strategia | shouldStop | Loput sarjat | nextWeekLoadAdjust |
| --- | --- | --- | --- | --- |
| Foundation | A | kyllä, jo 1. V0:sta (`consecutiveFailures >= 1`) | −5 % jos atletti jatkaa (K3-3 D1-v2) | −0,025 |
| Strength | B | vasta 2. V0:sta (2-failure rule) | −5 % (Refalo 2023) | 0 (1× V0) / −0,05 (2× V0) |
| Intensity | C | kyllä, heti | −5 % jos jatkaa | −0,05 |
| Peaking | C | kyllä, heti ("punainen lippu") | −5 % jos jatkaa | 0 (kisakuorma ei muutu) |

**Rationale per strategia:** Foundation-blokki EI ole failure-protokolla — V0 siellä tarkoittaa ohjelmointivirhettä tai huonoa päivää, ja 24–48 h:n failure-recovery (Refalo 2023) syö volyymiblokkia; siksi stop heti + kevyt ensi viikon säätö. Strength sietää failure-stimuluksen, mutta loput sarjat vaativat alennetun kuorman; Tuchschererin 2-failure rule sallii yhden failuren ilman liikkeen lopetusta. Intensity/peaking-V0 on CNS-signaali: liike lopetetaan heti, ja peakingissä ensi viikon kuormaa ei säädetä, koska kisa-ajoitus voittaa (recovery hoidetaan lepopäivillä, ei kuormalla). Primary-toistot pudotetaan strategioissa A/B yhdellä (`Math.max(targetReps - 1, 1)`).

**Legacy-yhteensopivuus:** ilman `blockPhase`-parametria kutsu saa Strategia B:n (strength-default) — vanhat kutsupolut eivät riko (engine.js:1891–1892, test-runner.js:363–373).

**K3-3 D1-v2 -laajennus (engine.js:1936–1940):** kaikissa blokeissa `nextSetLoad` on nykyään −5 %, myös A/C-strategioissa joissa se aiemmin palautti alkuperäisen kuorman. Peruste: jos atletti jatkaa stop-suosituksesta huolimatta (atletti = valmentaja, ei nanny — engine ei estä), loput sarjat eivät saa toistaa kuormaa joka juuri vietiin failureen. Muutos on vain alaspäin.

**UI-kytkentä (index.html:13786–13824):** V0-kirjaus laskee `consecutiveFailures`-arvon session kirjatuista seteistä, hakee `blockPhase`-arvon `phaseForWeek(weekNum)`-kutsulla ja soveltaa reaktion loppusarjoihin (`s.loadKg = reaction.nextSetLoad`). Isolation-luokitus ohittaa koko blokkilogiikan — ks. [[failure-isolation-poikkeus]]. Porrastettu near-failure-vaste ilman V0:aa (deficit ≥ 2 → −2,5 %) on erillinen polku, ks. [[failure-refalo-kuormapudotus]].

**8a-huomio:** strategiajako (stop-kynnykset, nextWeekLoadAdjust-arvot) on heuristiikka ilman suoraa RCT-pohjaa — EI opittava-parametri-kandidaatti ennen kuin blokkikohtainen failure-recovery-tutkimus tarkentuu. Drop-suuruuden prior on kirjattu [[failure-refalo-kuormapudotus]]-noottiin (`learnedFailureDropPct`).

**Linkit:** [[failure-refalo-kuormapudotus]], [[failure-isolation-poikkeus]], [[failure-intra-session-h017-d1]], [[progressio-mesosyklirakenne]]
