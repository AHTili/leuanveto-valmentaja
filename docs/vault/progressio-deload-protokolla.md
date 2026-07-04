# Deload-protokolla (invariantti C)

**Status:** VERIFIOITU-INVARIANTTI
**Lähteet:** Helms 2018 (PMID 30153841, deload −20…−30 %); Bompa 2009 (deload-volyymileikkaus)
**Koodiankkurit:** tools/engine-pilot/lib/audit-baselines.mjs:29 (`DELOAD_DELTA_RANGE`), engine.js:2468–2476 (`PROGRESSION_DELOAD_PASSTHROUGH`), engine.js:4359–4399 (deload-override: user/label), engine.js:4377 (user-deload −0.20 + Vx+2 + volyymi ~50 %), tools/engine-pilot/lib/audit-engine.mjs:318 (`DELOAD_DELTA_OUT_OF_RANGE`), audit-engine.mjs:453 (`DELOAD_HEAVY_DAYTYPE`), audit-engine.mjs:725–737 (ENG-14 invariantti C)

Tutkimusinvariantti C: kevennysviikon kuormamuutos pysyy negatiivisena ja rajatussa ikkunassa — liian suuri pudotus hukkaa adaptaation kärjen, liian pieni ei tuota superkompensaatiota. Ihmisluettava sääntö on "−20…−30 %" (CLAUDE.md §2), mutta **koneellinen totuuslähde** `DELOAD_DELTA_RANGE = { min: −0.30, max: −0.15 }` sallii lievemmän −15 %:n ylärajan (esim. peaking-taper −10 % EI ole deload-luokkaa; volyymipohja-akklimatisaatio −10…−15 % on eri asia kuin deload). Numerodriftin välttämiseksi tarkka arvo luetaan aina audit-baselines.mjs:stä (A-päätös 2026-05-16).

Deload-tunnistus on kolmikerroksinen:
1. **Built-in-preset-deload:** `weekDef.deltaPctBase < 0` + label-regex `/deload|kevennys/i` (engine.js:4367). Presetin omat arvot säilyvät, mutta dayType pakotetaan `volume`:ksi (`DELOAD_OVERRIDE`, mode `label-builtin`) — heavy-day-käyttäytyminen ei saa laueta deload-viikolla (v4.49.2 QF-4).
2. **Käyttäjän lisäämä/korvaava kevennysviikko:** kuorma −20 %, targetVx +2, volyymi ~50 % (sarjat puolitetaan, vain primary/backoff + nimetyt corE-slotit säilyvät), dayType `volume` (engine.js:4370–4388).
3. **Progressio-passthrough:** `computeProgressionTarget` palauttaa deload-viikolla suoraan `planTarget`-arvon ilman autoregulaatiota (`PROGRESSION_DELOAD_PASSTHROUGH`, engine.js:2471–2476) — deloadiin ei koskaan sovelleta weekly-progressiota, regain-multiplieria eikä Vx-säätöä.

Audit-valvonta on kaksipisteinen: pilot-harnessin blokkitason tarkistus (`DELOAD_DELTA_OUT_OF_RANGE`, audit-engine.mjs:318) ja ENG-14:n per-trace-invarianttiauditti (audit-engine.mjs:725), joka emittoi ERROR-tason `INVARIANT_VIOLATION`-flagin jos deload-viikon deltaPct karkaa rangen ulkopuolelle. Stop hook estää /goal-kierroksen valmistumisen tällöin.

Deload on myös suggestion-tier-suppression-syy (`deload-phase` piilottaa AGGRESSIVE-ehdotuksen, ks. [[progressio-suggestion-tierit]]) ja wizardissa aikabudjetti-capin lattia-/advisory-poikkeus (deload-tunnistus deltaPctBase ≤ −0.20, P3R2/K1b).

**8a-prior:** `learnedDeloadDeltaPct`: prior −0,25 (default-mesosyklin deload), tutkimusrajat [−0,30; −0,15] (`DELOAD_DELTA_RANGE`; SD = (max − min)/4 = 0,0375 → posterior clampataan ±2 SD = ±0,075 prioriin, mikä kattaa täsmälleen koko rangen). ENG-14 emittoi `INVARIANT_VIOLATION`-flagin rajan ulkopuolisesta ehdotuksesta.

**Linkit:** [[progressio-mesosyklirakenne]], [[progressio-computeprogressiontarget]], [[progressio-suggestion-tierit]], [[failure-refalo-kuormapudotus]], [[readiness-cap-only-periaate]]
