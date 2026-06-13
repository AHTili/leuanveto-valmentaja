# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto (H-018)

> **H-016-PARKKI:** H-016 (paluuramppi) on VALMIS-ODOTTAA-LIVE-PORTTIA (vk 25 dippipaluu) — handoff säilyy git-historiassa commitissa 3bad610 (`git show 3bad610:HANDOFF.md`), arkistoidaan vk 25 -kuittauksen jälkeen. H-017 (D1) siirtyy sen jälkeen.

> Cowork-draft 2026-06-12 — ratifioitu laadittavaksi (Akseli 12.6.: "laadi nyt, ajo ennen vk 25"). Siirto repoon = kanava b:n akti.
> Pohja: OBS-040/041 A1-confirm-raportti (Code 12.6., read-only — juuret lokalisoitu) + docs/backlog.md-kirjaus (3bad610) + Akselin design-linjaus.

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-018` ✏️ (vahvistettu: H-016 ei-arkistoitu, H-017 varattu D1:lle → seuraava vapaa) |
| Tyyppi | `debug` (todettu vs odotettu käytös, juuret lokalisoitu A1-confirmissa; P-013 batch=2: **OSA 1 = OBS-040-fix → STOP + pilot → OSA 2 = OBS-041-fix**, omat rubriikit) |
| Laadittu | 2026-06-12 / Cowork-sessio · Tila: **AKTIIVINEN** (ratifioitu 12.6.; siirretty repoon 12.6.) ✏️ Esiehto-status: backup repossa = 10.6. → A1-vahvistus PENDING (täydennetään kun tuore backup saapuu; ei blokkaa — juuri lukupolussa) |
| Pohja-HEAD | `3bad610` ✏️ (= origin/main, verifioitu PRE-FLIGHTissä 12.6.; puhdas tree) · APP_VERSION 4.52.39 |
| Ajoitus | **Ajo ennen vk 25:tä** (Akselin päätös): pieni, display+persistenssi-tasoa — ei riskeeraa D1-aikataulua. Esiehto OSA 1:lle: tuore backup repoon (Akseli: Asetukset → vie varmuuskopio) → 11.6.-session vahvistus. Mekanismi ja korjaus ovat samat vaikka backup näyttäisi eri rakenteen (Code A1) — poikkeama raportoidaan, ei muuta suuntaa. |
| Prioriteettilinjaus | Sama kuin H-016/H-017: arjen ohjelmointi ydin — kuorma-neutraalius todistetaan, ei oleteta. |

---

## 1. Tavoite (lopputila, ei ratkaisua)

Liikenäkymän e1RM-kortti ja sen trendi kertovat atleetille totuuden: luku tulee kanonisesta parhaasta (sama lähde kuin muissa näkymissä), ei viimeisen session hetkellisarvosta — kapean penkin kortti näyttää ~143-tason eikä 82:ta, ja hauiskääntö-anomalia poistuu samalla. Lisäksi treenin aikana luotu uusi liike säilyy liikepankissa pysyvästi, ja yleiset työntöliikkeet (käsipainopenkki flätti + vino) löytyvät pankista valmiina. Kuormiin tämä ei vaikuta missään — muutos on näyttö- ja kirjauskerroksessa.

## 2. Acceptance criteria

### OSA 1 — OBS-040: e1RM-kortin lähdekorjaus (STOP + pilot ennen OSA 2:ta)

- **A1 — Backup-vahvistus (read-only-esiaskel):** tuoreesta backupista 11.6.-session rakenne (kuorma × reps × V, roolit) → vahvista/raportoi mistä 82,0 laskettiin. Jos rakenne ≠ odotettu (60×6 V5 -luokka), raportoi poikkeama — korjaussuunta ei muutu (juuri on lukupolussa, ei datassa).
- **A2 — Kortti kanoniseen lähteeseen:** e1RM-kortti (modal-header) + trendi lukevat `computeMovementE1RMBest`-polkua. *Known-pos 1:* kapea penkki → kortti ~143-tasolla (110-historia dominoi), trendi ei näytä −61 kg -romahdusta. *Known-pos 2:* hauiskääntö-anomalia (−26,3 kg) poistuu samalla korjauksella. *Known-neg:* liike jonka viimeisin sessio = paras → näyttö ei muutu. Aritmetiikka käsin raportissa.
- **A3 — Ristiriita poistuu:** VX-trendi ja e1RM-kortti eivät enää väitä vastakkaista samasta liikkeestä (sama tai yhteensovitettu lähdeperhe; ei uutta totuuslähdettä). *Mitattu:* kapea penkki -näkymän e2e-tarkistus.
- **A4 — Rakenteellinen lukko:** VALUE_RESOLUTION_AUDIT §0-lukon laajennus kattamaan tämä lukupolku — testi joka estää last-set-arvon paluun näyttöön (known-pos + known-neg, mittari-ensin ennen luottamusta). Rekisteripäivitys docs/VALUE_RESOLUTION_AUDIT.md:hen.
- **A5 — Kuorma-neutraalius (push-ehto):** display-only-muutos → rakenteellinen kuorma-neutraali-todistus (lukupolku ei ole recommend()-input) + pilot bittitarkka + selaintestit ≥ 774/778. `MovementProgress.currentE1RM`-kenttään ja suggestedLoadKg-poikkeukseen EI kosketa (ks. §5).

### OSA 2 — OBS-041: persistenssi + katalogi (vasta OSA 1:n STOP/pilot jälkeen)

- **A6 — Workout-flow-luonti persistoi:** treenin aikana luotu custom-liike tallentuu liikepankkiin pysyvästi (repro: luo → sulje sovellus → avaa → löytyy pankista omalla identiteetillään). *Known-neg:* olemassa olevan liikkeen valinta ei luo duplikaattia; legacy-swapin aiempi käytös muille poluille ei muutu.
- **A7 — Katalogitäydennys:** käsipainopenkki flätti + vino (ja A1-confirmin gap-listan ilmeiset työntöliikkeet) liikepankkiin. **Verifier tarkistaa eksplisiittisesti** Coden väitteen "PROGRAM_BUILD_VERSION ei tarvita (liikepankki ≠ weekPlan)" — oppi 6 -luokan väite todistetaan, ei uskota. APP_VERSION bumpataan joka tapauksessa (PWA).
- **A8 — Löydettävyys (oppi 8):** käyttäjä löytää käsipainopenkin workout-flown liikevalinnasta ilman ohjetta; e2e-DOM 390 px; M3-verifier ajaa polun itse (luonti + uudelleenkäynnistys + haku).

## 3. Reunaehdot ja scope-aita

**Mitä EI kosketa (test-riippuvuus nimetty):**
- **Engine-live-polku:** recommend(), computeMovementReload/RELOAD_CONFIG (H-016, juuri shipattu), tuleva D1-alue, regain/hardCap/progressio — täysin koskemattomat.
- **e1RM-LASKENTAfunktiot:** computeMovementE1RMBest, currentE1RMSystem, Epley-Vara-kaava — vain kortin LUKUPOLKU vaihtuu kanoniseen.
- **`MovementProgress.currentE1RM` + suggestedLoadKg-poikkeus** (F-3 §0:n dokumentoitu sallittu poikkeus eri-liike-apuliikkeille + "Lisää liike" -esitäyttö) — ei muuteta tässä; arviointi erikseen (§6.1).
- **weekPlan/ohjelmasisältö** (M2-ramppi, slotit) — katalogi ≠ ohjelma; A7-verifiointi todistaa rajan.
- Lukot vihreinä: `testKotiEqualsLiveAccessory` + `testSp2SlotLoadInvariant` + H-016:n 12 lukkoa + H-015:n 14 lukkoa.

**Selkäranka:** PRE-FLIGHT (HEAD = origin post-3bad610-push; ero → STOP) · peruutusankkuri `backup-pre-h018-<sha>` · scope-valkolista tiedostotasolla plan-modessa · per-löydös = oma commit + pilot · OSA-väli-STOP · **EI pushia ilman lupaa** · M3-verifier ajaa UI-polut itse.

## 4. Atletti-vastaukset

Ei sovellu (debug). Konteksti: kapea penkki = dipin H-015-korvaaja; trendikorttien luotettavuus halutaan kuntoon ennen dippipaluuta vk 25.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

- **A1-confirm lokalisoi juuret (Code 12.6., read-only):** OBS-040 = F-3-luokan display-rikko — kortti lukee history[viimeisin].e1rm, ei kanonista polkua; 82,0 = 60×6 V5 -rakenteen Epley (60 × (1+11/30) = 82,0 tasan); VX-trendi eri lähteestä → sisäinen ristiriita; hauiskääntö −26,3 kg = saman juuren toinen evidenssipiste. Substituutio-vuoto (hyp. a) POISSULJETTU: H-015-substituutio ei kirjoita CGB-dataa. H-016-reload-ankkuri PUHDAS (top-rooli + kuorma > 0 → CGB:n accessory-setit eivät kelpaa ankkuriksi).
- **Kuormavaikutus rajattu:** kortti display-only; sama last-set-arvo virtaa currentE1RM → suggestedLoadKg vain eri-liike-apuliike-ehdotuksiin (dokumentoitu §0-poikkeus) — pääliikeketjuun EI vuoda. Siksi tämä on debug-luokan näyttökorjaus, ei kuorma-audit.
- **OBS-041:** Liikkeet-näkymän ➕-luonti persistoi oikein; vika on workout-flown legacy-polussa (H-015 §7b kohta 4, in-memory). Katalogi-gap vahvistettu data.js:stä.
- **Akselin design-linjaus (12.6.):** katalogikattavuus + pysyvä custom-identiteetti; **EI vapaatekstikenttää** (identiteetittömät kirjaukset sekoittaisivat historiat — OBS-040 näytti läheltä miltä se näyttäisi).
- **Hylätty:** trendikortin poisto/piilotus korjauksen sijaan (tieto on arvokas kun lähde on oikea); currentE1RM-kentän laajempi remontti tässä (oma arviointi, §6.1); katalogin massiivinen laajennus (vain gap-listan ilmeiset — ei scope-paisutusta).

## 6. Avoimet kysymykset

1. **suggestedLoadKg-poikkeuksen v2-arvio:** pitäisikö eri-liike-apuliike-ehdotuksen nojata kanoniseen parhaaseen last-setin sijaan? EI tässä handoffissa — kirjataan backlogiin arvioitavaksi (mahd. kytkös D1/v2-aaltoon).
2. **Gap-listan laajuus A7:ssä:** vain käsipainopenkit vs koko ilmeinen työntölista — Code esittää listan plan-modessa, Akseli kuittaa gate-raportissa.
3. **Handoff-id:** H-018 vai seuraava vapaa — vahvista siirrossa.

---

## 7. Session-tulos — OSA 1 (2026-06-13, OPUS 4.8 -sessio)

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-06-13 (OSA 1 valmis + verifioitu → STOP OSA 1/OSA 2 -portille). Malli: **Opus 4.8** (manuaali-mallinvaihto Fable→Opus; M6-fallback kirjattu MEMORY osio 2). |
| Commitit | `c22db8d` handoff-siirto · `6848ba6` A2 kortti+trendi → kanoninen Best (narratiivi korjattu tuoreesta backupista: 82,0 = vanhin sessio, computeMovementE1RMHistory ei lajittele → insertion-order-häntä) · `3ee35e8` A4 §0-lukkotesti (testE1rmCardCanonicalSource, 4 assertiota) · `630ffa0` A4 VALUE_RESOLUTION_AUDIT §0 (OBS-040 RATKAISTU + OBS-042-viite) · `f215258` A5 versio 4.52.40 + M6 · `6918e70` H-016-ramppisimulaatio (relay-deliverable) · `d7584fa` OBS-042/043 backlogiin (+ tämä §7). |
| **Verifiointi (monilinssinen workflow, 5 riippumatonta adversariaali-agenttia: 2 PASS / 3 PASS_WITH_CONCERNS / 0 FAIL)** | **A2/A3 ✓** korrektius (LINSSI 1): kortti 82,0→**137,9** (CGB) / 36,67→**63,0** (hauiskääntö) todellisella 12.6.-datalla, trendi +28,7/3vk (ei romahdusta). **Scope-aita ✓** (LINSSI 2): **engine.js 0 diff**, vain index.html-kortti-lukupolku + test + docs + versio; 11 muuta history-kutsupistettä legitiimejä (sparkline/PR) → fix täydellinen, modal-kortti oli AINOA history[last]-näyttölukija. **Kuorma-neutraalius ✓** (LINSSI 3): computeMovementStatsForModal vain modal-renderissä, ei recommend()-input; pilot 64/64 0 virhettä 14/6/51 bittitarkka; smoke PASSED. **Testilaatu ✓** (LINSSI 4): aito mittari-ensin (known-pos reprodusoi bugin elävää hylättyä lähdettä vastaan; 720/720 permutaatiota Best stabiili). **E2E ✓** (LINSSI 5): selaintestit **778/782** selaimessa (4 H018-lukkoa läpi, samat 4 pre-existing). |
| **Jäi auki (2 rehellistä jäännöstä — kumpikaan EI blokkaa OSA 1:tä)** | **(1) OBS-042 kvantifioitu todellisella datalla** (LINSSI 1 -adversariaali): OBS-040-fix poisti 82,0-katastrofin, mutta `computeMovementE1RMBest`-fallbackin `slice(-6)`-median on yhä insertion-order-hauras → kortti **ali-raportoi** median-lähteisillä apuliikkeillä: CGB 10,9 kg (137,9 vs tosi 148,8) · Face pull 14,6 · Leg curl 9,6 · BW-ekst-dippi 14,7. **Cal-lähteiset (dippi/kyykky/leuka) immuuneja.** EI OSA 1 -regressio (eri juuri, eri handoff, jo §0+backlog). Prioriteetti nousi → OBS-042-handoff. **(2) Lukko on kontrakti-tasolla, ei kutsupaikalla** (LINSSI 4): testi lukitsee `computeMovementE1RMBest`-käytöksen, mutta `computeMovementStatsForModal` (module-private index.html) ei ole yksikkötestattavissa → kutsujan revert history[last]:iin ei jäisi automaattisesti kiinni. Render-pinnan kattaa Akselin puhelinverifiointi (oppi 8 -rajaus, sama kuin H-016 A6). |
| Seuraava askel | OSA 1 **PUSHATTU + PUHELINVERIFIOITU** (Akseli 2026-06-13: kapea penkki ~138 ei 82, hauiskääntö ~63 ei 36,7 — oppi 8 -portti läpäisty render-pinnalla; origin = `04fb8b2`, 8 committia). → **OSA 2 käynnissä** (OBS-041 persistenssi + katalogi). |
