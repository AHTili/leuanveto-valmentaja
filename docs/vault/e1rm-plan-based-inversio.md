# PLAN_BASED-e1RM ja system-%-inversiokontrakti

**Status:** VERIFIOITU-INVARIANTTI (round-trip-koherenssi; S10-lukkotestit)
**Lähteet:** käyttäjä-ratifioitu "trust the program" -design (e13896f, 2026-05-05); Tuchscherer RTS / Helms 2018 (Vx-overshoot-bonus +2,5 %/luokka)
**Koodiankkurit:** engine.js `planBasedInvertE1RM` (~330, jaettu helper), recommend()-inline ~4700, computeMovementE1RMBest ~7141 (kortti), inflation-streak ~700, cfg-drift ~875; test-runner.js S10 + S10b (F-3-lukko)

Kun viime sessio oli **perfect execution** (kaikki sarjat target-Vx:llä ja -toistoilla) ja slotin loadPct on Vx-johdonmukainen (OBS-051-gate `isLoadPctVxConsistent`, PLAN_BASED_VX_TOL 0,15 — volyymi-label-loadPct joka alittaa vReps-intensiteetin EI kelpaa %1RM-ankkuriksi), engine korvaa Epley+Vara-arvion suunnitelmasta invertoidulla e1RM:llä: suunnitelma on luotettavampi kuin formula-extrapolointi. Vx-overshoot (teki helpommin kuin targetoitu) antaa +2,5 %/luokka -bonuksen.

**Inversiokontrakti (S10-juurikorjaus 17e19a8, 2026-07-04):** loadPct = **system-%** BW-ankkuroiduilla liikkeillä (1c978a9-kontrakti) → inversion on oltava saman kontraktin peilikuva:

```
e1RM_sys = (medLoad + BW) / loadPct        (barbell: medLoad / loadPct)
e1RM_ext = e1RM_sys − BW
```

Historiaopetus: inversio jäi 1c978a9:n 8 lokuksen migraatiosta ("unohtunut 9. lokus") external-muotoon `medLoad/loadPct` → sekasemantiikka jossa +3,5 %:n plan-askel TUOTTI −18 %:n plan-kuorman. Vika oli latentti (autoreg peitti) kunnes K3-1-kestävyyskatto alkoi luottaa planTargetiin. Kaikki 4 inversiolokusta käyttävät nyt jaettua `planBasedInvertE1RM`-helperiä — lokus-drift ei voi toistua. F-3: kortti (Best) ja live käyttävät SAMAA inversiota (S10b-lukkotesti: kortti = live + BW, delta 0,000).

**8a-huomio:** vxBonusPct-kerroin (0,025/luokka) on opittava-kandidaatti (`learnedVxOvershootBonus`, prior 0,025, Helms-haarukka) — mutta round-trip-koherenssi (inversio = applikaation peilikuva) on RAKENTEELLINEN invariantti, ei parametri.

**Linkit:** [[e1rm-epley-vara-kaava]], [[e1rm-inflaatio-deflaatio-capit]], [[e1rm-kalibrointiprotokolla]], [[progressio-across-set-vasymysmalli]], [[vbt-promote-portti-ja-crosscheck]]
