# Grindy-bias-detektio (epäluotettava Vx-raportointi)

**Status:** TOTEUTETTU-HEURISTIIKKA   (v4.49.2 Q1; ikkuna/kynnys heuristisia)
**Lähteet:** LeVe-design (atleettiprofiili: taipumus grindata failureen → aliarvioi Vx); VBT-ristiinveto e1RM-mismatch-signaalina (Sánchez-Moreno 2017 load-velocity-relaatio)
**Koodiankkurit:** engine.js:3603 (`detectGrindyBias`), engine.js:3628 (`targetRep1VelocityRange`, hybridi-target-RIR), engine.js:3644–3653 (bias→min-safety-haara), engine.js:6008 (kutsu recommend():ssa), engine.js:6016–6025 (`SLOT_TARGETVx_RESOLVED`-trace)

**Grindy-bias** = tila jossa atletin raportoima Vx ei ole luotettava, koska hän systemaattisesti grindaa lähelle failurea mutta raportoi silti varaa (esim. raportoi V3 kun VBT-data osoittaa e1RM-mismatchin). Kun näin on, `slot.targetVx`-arvoon ei voi luottaa target-RIR:n lähteenä ennen kuin data palautuu linjaan.

**Detektio (`detectGrindyBias`, engine.js:3603):** skannaa viimeiset `windowSize = 8` sessiota; laskee kuinka monessa on `VBT_E1RM_CROSSCHECK`-trace severity `SIGNIFICANT` (mismatch > 7 %). Bias on tunnistettu kun `significantCount ≥ threshold = 3` (≥3/8 sessiota). Palauttaa `{ detected, count, sessionsConsidered, windowSize, threshold }`. Robusti tyhjälle/puuttuvalle datalle (palauttaa `detected: false`).

**Vaikutus (`targetRep1VelocityRange`-hybridi, engine.js:3640–3653):** target-RIR:n lähde valitaan kolmesta:
1. `slot-targetVx-trusted` — luota slot.targetVx:ään VAIN jos slotVx kelvollinen JA RTF-malli luotettava JA **ei biasia**.
2. `min-bias-detected-safety` / `min-rtf-uncertain` — `Math.min(slotTargetVx, blockDefaultRir)`: konservatiivisempi (isompi vara) voittaa kun bias tunnistettu TAI RTF-malli epävarma.
3. `block-default-fallback` — blokin oletus-RIR jos slotVx puuttuu.

Bias siis pakottaa **turvallisemman** (varovaisemman) target-RIR:n: engine ei luota atletin optimistiseen Vx-raportointiin vaan valitsee blokin oletusvaran jos se on suurempi. Tämä on epäsuora readiness-signaali — ei erillinen kanava, vaan luottamuskorjaus Vara-pohjaiseen target-resoluutioon. Päätös traceataan `SLOT_TARGETVx_RESOLVED`-tracella (`targetRirSource` + `biasDetected` + `biasSignificantCount`), engine.js:6016.

Suhde atleettiprofiiliin: käyttäjän dokumentoitu taipumus grindata failureen ja aliarvioida nopeutta (MEMORY: user_athlete_profile) on juuri se ilmiö jonka tämä detektori institutionalisoi koneellisesti havaittavaksi.

**8a-prior:** `grindyBiasWindowSize`: prior 8 sessiota, `grindyBiasThreshold`: prior 3 (osuus 3/8 = 0.375). Heuristiset; opittava-kandidaatti olisi pikemmin **osuuskynnys** (biasSignificantCount / sessionsConsidered) kuin absoluuttiluku — prior 0.375, clamp [0.25; 0.5]. VBT_E1RM_CROSSCHECK SIGNIFICANT -raja (7 %) on erillinen parametri.

**Linkit:** [[readiness-vara-kanava]]
