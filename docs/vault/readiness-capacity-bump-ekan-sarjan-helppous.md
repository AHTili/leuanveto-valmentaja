# Kapasiteettibonus — ekan sarjan helppous

**Status:** TOTEUTETTU-HEURISTIIKKA   (v4.34.34 / v4.34.41; kerroin- ja cap-arvot heuristisia)
**Lähteet:** LeVe-design + kenttäpalaute 2026-05-07/2026-05-10; freshness-akselin dual-signal-tulkinta (Sánchez-Medina 2011 velocity-fatigue)
**Koodiankkurit:** engine.js:1604 (`firstSetCapacityBonus`, next-session), engine.js:1558 (`intraSessionLoadAdjustSuggestion`, intra-session), engine.js:5066–5078 (firstSetCapacityBonus-sovellus, vain heavy), engine.js:1476–1489 (dual-signal-painotus varaTrendCorrectionissa)

**Kapasiteettibonus** on cap-only-periaatteen *ylöspäinen* vastapari: kun ekka työsarja (fresh start) on selvästi helpompi kuin tavoite, kuorma oli aliarvioitu ja engine nostaa sitä. Erottelu ekan ja viimeisen sarjan välillä on ydin: **ekka sarja = kapasiteettimittari** (kuinka helposti kuorma lähtee levänneenä), **viimeinen sarja = väsymysmittari** (riittikö voima session loppuun). Aiempi pelkkä keskiarvo-Vx-trendi sokaisi ekan sarjan V5-helppouden — jos ekka 125×6 V5 ja viim. V1, mean ≈ V3 = target → ei bonusta, vaikka fresh V5 osoitti kuorman olevan ~18 % aliarvioitu (engine.js:1476–1489).

**Kaksi mekanismia:**

1. **`firstSetCapacityBonus` (next-session, engine.js:1604):** katsoo viime session **ekan työsarjan** overshootin (`actualVx − targetVx`). Vaatii `overshoot ≥ minOvershoot = 2` (V5 vs V3). Bonus = `clamp((overshoot − 1) × 0.010, 0, maxBonus = 0.015)` → overshoot 2 = +1.0 %, overshoot 3 = +1.5 % (cap). Skippaa cal-dominantit sessiot (≥50 % kalibrointisarjoja). **Sovelletaan vain heavy-päiviin** (engine.js:5072) — volume/speed-päivissä Vx ei mittaa kuormakapasiteettia. Kerrostuu varaTrendCorrectionin päälle mutta oman lähteensä osalta capattu +1.5 %:iin.

2. **`intraSessionLoadAdjustSuggestion` (intra-session, engine.js:1558):** korjaa kuorman **kesken session** ekan sarjan jälkeen. Suojat: vain `isPrimary` + `dayType === "heavy"` + `setRole === "top"`. Vaatii `overshoot ≥ 2`. Bonus = `clamp((overshoot − 1) × 0.025, 0.025, 0.05)` → +2.5 % (V5 vs V3) … +5 % cap (V6 vs V3). Palauttaa confirm-pohjaisen ehdotuksen (`suggestedLoadKg`), ei automaattista muutosta — atletti hyväksyy.

**Freshness-suoja:** molemmat bonukset ovat konservatiivisia (max +5 % intra, +1.5 % next), koska ekka V5 fresh EI tarkoita että kuorma kestäisi V3:ssa *kaikissa* sarjoissa. Bonus antaa oikean ärsykkeen ilman riskitöntä grindi-kierrettä. Erillinen `grossMismatchCorrection` (engine.js:1640) hoitaa *pysyvän* aliarvion (mean overshoot ≥ 1.5, kaikki sarjat ≥ +1) jopa +8 %:iin — kapasiteettibonus on sen lievempi, yhden-sarjan versio.

**8a-prior:** `firstSetBonusPerClass`: prior 0.010 (kerroin/luokka), cap 0.015; `intraSessionBonusPerClass`: prior 0.025, cap 0.05; `capacityBonusMinOvershoot`: prior 2 Vx. Ei suoraa tutkimusankkuria (~1 Vx ≈ 4 % kuorma antaa löyhän ylärajan: overshoot 2 → korkeintaan ~8 % aliarvio, joten +5 % intra-cap on turvallinen). Posterior clampattava per-class-kertoimille ±0.005 ja minOvershoot lukittava ≥ 2 (alempi laukaisisi bonuksen kohinasta).

**Linkit:** [[readiness-vara-kanava]], [[readiness-cap-only-periaate]], [[e1rm-epley-vara-kaava]]
