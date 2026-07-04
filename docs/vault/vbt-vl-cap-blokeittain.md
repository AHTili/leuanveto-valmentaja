# VL-cap blokeittain (velocity loss -katto)

**Status:** VERIFIOITU-INVARIANTTI
**Lähteet:** Pareja-Blanco 2017 (PMC5497611); Pareja-Blanco 2020; Behrmann 2025 (low-velocity-caveat)
**Koodiankkurit:** engine.js:3798 (`VL_CAP_PER_BLOCK`), engine.js `vlCapForContext`, test-runner.js VL-cap-testit

Velocity loss (VL%) = sarjan sisäinen nopeuden pudotus suhteessa 1. toistoon. Pareja-Blanco 2017 osoitti että VL-katto ohjaa adaptaation tyyppiä: matala VL (10–20 %) → voima/nopeus säilyy, väsymys minimoituu; korkea VL (30–40 %) → hypertrofia mutta hitaampi palautuminen ja tyyppi IIX -haitta.

LeVe:n blokkikohtaiset katot (`VL_CAP_PER_BLOCK`):

| Blokki | VL-cap | Tutkimusraja (CLAUDE.md §2) |
| --- | --- | --- |
| Foundation | 30 % | 25–35 % |
| Strength | 17,5 % | 15–20 % |
| Intensity | 12,5 % | 10–15 % |
| Peaking | 7,5 % | 5–10 % |
| Speed | 12,5 % | — (design: nopeuspäivä ei saa väsyttää) |

Jokainen arvo on ratifioidun tutkimushaarukan keskipiste. Within-set-stop: kun kirjattu velocity alittaa VL-capin johdetun rajan, UI varoittaa ("VL% yli rajan") — cap-only, ei pakota (atletti = valmentaja). Behrmann-caveat: alle ~0,3 m/s alueella mittarikohina kasvaa → per-rep MV-grid (`MOVEMENT_MVT`-läheiset arvot) tulkitaan varoen.

**8a-prior:** `learnedVlCap.<blokki>` — prior = yllä oleva taulukko; posterior clampataan tutkimushaarukkaan (esim. strength [0,15; 0,20]). Tämä on CLAUDE.md §2:n eksplisiittinen A1-esimerkki: rajan ulkopuolelle karkaava posterior → `LEARNED_PARAM_OUTLIER`-trace + clamp.

**Linkit:** [[vbt-rtf-malli-ja-mpv-slope]], [[vbt-promote-portti-ja-crosscheck]], [[progressio-mesosyklirakenne]], [[readiness-2of3-saanto-velocity-veto]]
