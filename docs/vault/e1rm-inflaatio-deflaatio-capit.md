# e1RM-inflaatio/deflaatio-capit ja F-3-arvoresoluutio

**Status:** TOTEUTETTU-HEURISTIIKKA (capit) + VERIFIOITU-INVARIANTTI (F-3-lukot)
**Lähteet:** v4.34.28–36-kierrokset; OBS-051-gate; VALUE_RESOLUTION_AUDIT (F-3)
**Koodiankkurit:** engine.js:4870 (`E1RM_INFLATION_CAP`), `E1RM_DEFLATION_CAP` (sama alue), engine.js:700 (streak-ceiling-bonus), engine.js:875 (cfg-drift), engine.js:7141 (`computeMovementE1RMBest`); docs/VALUE_RESOLUTION_AUDIT.md

**Ceiling (inflaatiosuoja):** e1RM ei saa hypätä yli ~1,05 × vahvimman referenssin (cfg/cal) ilman evidenssiä. B+ streak-bonus: 2–3 peräkkäistä perfect-execution-sessiota joiden plan-based-e1RM ylittää ceilingin → kerroin nousee +5/+10 % (evidenssi ajaa cappia, ei toisin päin). Streak-inversio käyttää samaa system-%-kontraktia kuin PLAN_BASED ([[e1rm-plan-based-inversio]]).

**Floor (deflaatiosuoja):** Epley-aliarvio submaksimaalisista sarjoista ei saa romahduttaa e1RM:ää — lattia = cal-min/cfg-PR × 0,95. Tämä pitää kuorman järkevänä myös kun cal vanhenee ajurina.

**Cfg-drift** (v4.34.43): engine oppii cfg-baselinen atletin todellisesta suoriutumisesta — 3+ peräkkäistä perfect-sessiota plan-based > cfg × 1,10 → drift +2,5 %/sessio, max +10 %/blokki. Tuotannossa oleva opittava parametri (8a-esimuoto).

**F-3-arvoresoluutio (kanoninen kartta):** näyttö (Edistyminen/Liikepankki/Trendit/Sykli-preview) = `computeMovementE1RMBest`; live-kuorma = `currentE1RMSystem`. Kortti ja live EIVÄT saa divergoitua — koneelliset lukot `testKotiEqualsLiveAccessory`, `testSp2SlotLoadInvariant`, S10b (BW-plan-based-haara). `MovementProgress.currentE1RM` (last-set) ei KOSKAAN näyttöön/kuormaan. Historiaopetus (OBS-040/042): Best:in median-fallback on insertion-järjestys-hauras — OBS-042 (kronologinen sortti kanoniseen funktioon) on avoin, LOAD-DIFF-luokan oma handoff.

**8a-huomio:** ceiling-kerroin (1,05) ja floor-kerroin (0,95) ovat suojaparametreja — 8a saa terävöittää niitä vain evidenssillä JOKA EI kulje samojen cappien läpi (muuten posterior oppii omasta clampistaan).

**Linkit:** [[e1rm-plan-based-inversio]], [[e1rm-kalibrointiprotokolla]], [[e1rm-epley-vara-kaava]], [[failure-post-break-ankkurikatto-k2b]], [[vbt-promote-portti-ja-crosscheck]]
