# HRV-kanava: lnRMSSD, Oura-konversio ja rolling-7-baseline

**Status:** VERIFIOITU-INVARIANTTI   (menetelmäkehys: rolling-7-keskiarvo + SWC, Plews/Buchheit); luokkaraja-silta z-pisteeseen heuristinen
**Lähteet:** Plews 2013 (Sports Med 43(9):773–781, abstrakti+jatkopaperit verifioitu — EI koko teksti); Buchheit 2014 (Front Physiol 5:73, open access, SWC-taulukko lnRMSSD:lle); Hopkins 2009 (MSSE 41(1):3–13, SWC-tilastollinen alkuperä); Vesterinen 2016 (MSSE, operationalisoitu mean ± 0.5×SD)
**Koodiankkurit:** engine.js:6752 (`ouraHRVtoLnRMSSD`), engine.js:1002 (`hrvReadiness`), engine.js:1006–1023 (rolling-7-haara), engine.js:1024–1028 (fallback baseline-mediaani), index.html:1544–1551 (HRV-baseline-putki), data.js:1195 (`validateHRV`, 10–200 ms guard)

HRV-readiness vertaa tämän päivän sydämen sykevälivaihtelua henkilökohtaiseen baseline-trendiin. Syöte on **lnRMSSD** (luonnollinen logaritmi RMSSD:stä millisekunteina) — logaritmointi normalisoi RMSSD:n vinon jakauman ja vakioi varianssin, mikä on VBT/HRV-monitoroinnin standardimuunnos.

**Oura-konversio (`ouraHRVtoLnRMSSD`, engine.js:6752):** `Math.log(hrvMs)`. Ouran yö-HRV raportoidaan jo RMSSD-millisekunteina, joten konversio on pelkkä ln. Nolla/negatiivinen syöte → `null`. UI validoi raakasyötteen välille 10–200 ms (`validateHRV`, data.js:1195). Tallennetaan measurements-storeen: `value` = raaka ms, `valueTransformed` = lnRMSSD (index.html-putki lukee `valueTransformed`-kentän baseline-vektoriin).

**Rolling-7-baseline (Plews 2013, engine.js:1006–1023):** jos ≥7 datapistettä saatavilla, vertailukohta on **viimeisten 7 päivän keskiarvo** (ei koko baseline-windowin mediaani). Yksittäinen päivä-HRV on kohinaisempi kuin rolling-keskiarvo; 7 päivän liukuva keskiarvo vaimentaa päivittäisen autonomisen kohinan. z lasketaan: `zScore(todayLn, rolling7Mean, madSigma(baselineWindow))`. Alle 7 pisteellä → fallback baseline-mediaaniin (`method: "baseline-median"`, engine.js:1024). Oletus-window `windowN = 14`.

**Kriittinen tutkimuskorjaus (docs/PLEWS_2013_VERIFICATION.md):** aiempi spesifikaatio väitti "Plews 2013: −7 % baseline → deload". Tämä **EI ole verifioitavissa** mistään primäärilähteestä — Plews/Buchheit-konsensus nimenomaan *hylkää* kiinteät prosenttikynnykset ja käyttää **SWC = 0.5 × within-subject SD** -poikkeamaa 7 päivän liukuvasta keskiarvosta. LeVe:n z-pohjainen luokittelu (GREEN-raja z > −0.5, ks. [[readiness-z-luokittelu-mad-sigma]]) approksimoi tätä: −0.5 σ ≈ SWC-raja. **Avoin silta:** engine käyttää MAD-sigmaa ja kiinteitä z-rajoja SWC:n (0.5×SD) sijaan — menetelmällisesti lähellä muttei identtinen. Sekundäärivahvistus jota Plews suosittaa (CV-trendin lasku, leposykkeen nousu) **ei ole vielä toteutettu**.

**8a-prior:** `hrvReadinessBoundarySwc`: prior 0.5 (× within-subject SD), tutkimusraja [0.4; 0.6] (Buchheit 2014 / Vesterinen 2016 operationalisoivat 0.5×SD; ±2 SD ≈ ±0.1). HUOM: jos 8a siirtyy SWC-natiiviin toteutukseen, se korvaa nykyisen z-MAD-luokittelun HRV-kanavalla — silloin prior sitoo suoraan tutkimusinvarianttiin.

**Linkit:** [[readiness-z-luokittelu-mad-sigma]], [[readiness-2of3-saanto-velocity-veto]], [[progressio-deload-protokolla]]
