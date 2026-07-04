# RTF-malli ja Rep1-MPV-slope (yksilöllinen RIR-velocity)

**Status:** VERIFIOITU-INVARIANTTI (slope-prior) + TOTEUTETTU-HEURISTIIKKA (mallin portit)
**Lähteet:** Sánchez-Moreno 2017 (rep1 MPV ~0,045 m/s per RIR-luokka); Jukic 2024 (yksilöllinen RIR-velocity-mallinnus); González-Badillo & Sánchez-Medina (MVT-konsepti)
**Koodiankkurit:** engine.js:3454 (`computeRtfVelocityModel`), engine.js:2654 (`MOVEMENT_MVT`), RTF_MODEL_STATUS-trace recommend()-polussa

Kaksi kerrosta:

1. **Populaatioprior:** 1. toiston MPV korreloi lineaarisesti reps-to-failure-etäisyyteen ~0,045 m/s / RIR-luokka (Sánchez-Moreno). Tämä on CLAUDE.md §2:n verifioitu invariantti ja RTF-mallin lähtöarvo ennen yksilöllistä dataa.
2. **Yksilöllinen RTF-malli** (`computeRtfVelocityModel`): lineaariregressio atletin omista (velocity, toteutunut RTF) -pareista per liike. Statukset: `no-data` → `preview` (r² ≥ preview-raja) → `reliable` (r² + n-portit). Vain `reliable` vaikuttaa päätöksiin (mm. AGGRESSIVE-ehdotuksen suppression-ehto `rtf-not-reliable`); heikompi status on näyttö-/diagnostiikkatasoa.

MVT (minimal velocity threshold, `MOVEMENT_MVT` engine.js:2654) on liikekohtainen "viimeisen toiston nopeus" -vakio (esim. pull-up ~0,23 m/s) — LV-profiilin ja cross-checkin ankkuri.

Kaksisuuntainen palaute (v4.38.4): velocity-havainto luokitellaan ali/optimaalinen/varoitus/stop-vyöhykkeisiin suhteessa blokin VL-cappiin — engine kertoo myös kun kuorma on liian KEVYT, ei vain liian raskas.

**8a-prior:** `learnedRep1MpvSlope` — prior 0,045 m/s/RIR; posterior clampataan Sánchez-Morenon hajontahaarukkaan (±2 SD). Yksilöllinen RTF-malli on jo itsessään oppiva komponentti — 8a:ssa sen r²/n-portit pysyvät kiinteinä (portti-parametreja ei opita datasta jota portti itse suodattaa).

**Linkit:** [[vbt-vl-cap-blokeittain]], [[vbt-promote-portti-ja-crosscheck]], [[readiness-2of3-saanto-velocity-veto]], [[progressio-suggestion-tierit]]
