# Tier-progressio (Latella 2020) — elite ≤ 0,05×/vk

**Status:** VERIFIOITU-INVARIANTTI (rajat) / EMPIRINEN, EI RCT-VALIDOITU (kertoimien ekstrapolaatio)
**Lähteet:** Latella et al. 2020 (J Strength Cond Res 34(9):2412–2418; PMID 32706692 — Powerlifting Australia n=1897, 2003–2018, kg/pv per training-status); Greg Nuckols / Stronger by Science -kyselydata (naiskerroin; voluntary response bias); Williams et al. 2017 (Sports Med 47(10):2083–2100 — untrained hyötyy periodisaatiosta enemmän, β = −0,59, p = 0,0305)
**Koodiankkurit:** wizard/wizard-2b-mapper.js:2014 (`TIER_PROGRESSION_MULTIPLIERS`), wizard-2b-mapper.js:2023 (`SEX_PROGRESSION_MULTIPLIER_FEMALE = 0.55`), wizard-2b-mapper.js:2027 (`applyTierProgression`), wizard-2b-mapper.js:3871–3902 (self-testit), tools/engine-pilot/lib/audit-baselines.mjs:106 (`TIER_PROGRESSION_MULT_BASELINES`), audit-engine.mjs:745–760 (ENG-14 invariantti D), data.js:7498 (`tierProgressionApplied: false` streetlifting_16w)

Latella 2020:n powerlifting-kilpailudata osoittaa, että absoluuttinen kg/vk-kehitys romahtaa training-statuksen myötä (Q4-elite ~0,10 kg/vk kyykyssä ≈ 0,05 %/vk 200 kg:n 1RM:llä). LeVe toteuttaa tämän kertoimena joka skaalaa weekDefien **positiivisia** deltaPctBase-arvoja: beginner ×1,00, intermediate ×0,40, advanced ×0,15, elite ×0,05. Naisatleetille kerroin kerrotaan lisäksi 0,55:llä (Nuckols SBS). Negatiiviset deltaPctBase-arvot (akklimatisaatio, deload) EIVÄT skaalaudu — ne ovat absoluuttisia, eivät progressiokertoimia (wizard-2b-mapper.js:2036).

Esimerkki: nominaali +2,5 % (vk 2) → elite-mies +0,125 %/vk; intermediate-nainen 0,40 × 0,55 = 0,22 → +0,55 %/vk. Alkuperäinen nominaali säilyy audit-jälkenä `_originalDeltaPctBase`-kentässä ja sovellus merkitään `_tierProgressionApplied`-metaan. Tuntematon tier → ei muutosta (fail-open).

Invarianttirajat (`TIER_PROGRESSION_MULT_BASELINES`): beginner max 1,0 / intermediate max 0,5 / advanced max 0,25 / elite max **0,05**. ENG-14 emittoi `INVARIANT_VIOLATION`-flagin jos weekly-rate × tier-mult ylittää rajan — mutta **vain jos** `_programMeta.tierProgressionApplied !== false` (audit-engine.mjs:755). Akselin streetlifting_16w-preset (data.js:7498) on ratifioitu poikkeus: käsin viritetyt suuremmat hypyt atletin 15 v:n empirian pohjalta, flagattu `tierProgressionApplied: false` + `handTuned`.

Epistemologinen status on kirjattava rehellisesti briiffeihin: kertoimet ovat kilpailudatan ekstrapolaatiota, yksilövaihtelu ±50–100 % (Latella: SD usein > keskiarvo, r² lähtötasolle 0,06–0,12). Rajat ovat velvoittavia, kertoimien tarkat arvot heuristisia.

**8a-prior:** `learnedTierMult.elite`: prior 0,05, tutkimusraja [0; 0,05] — yksisuuntainen katto, posterior EI koskaan saa ylittää Latella-elite-maksimia (clamp ylhäältä; alaspäin oppiminen sallittu, koska hitaampi progressio ei riko invarianttia). Vastaavasti muut tierit omaan max-rajaansa. Huom.: tämä on eri parametri kuin `learnedWeeklyProgressionPct` ([[progressio-helms-viikkoprogressio]]) — tulo (weekly × tierMult) on se mitä ENG-14 valvoo.

**Linkit:** [[progressio-helms-viikkoprogressio]], [[progressio-mesosyklirakenne]], [[progressio-computeprogressiontarget]]
