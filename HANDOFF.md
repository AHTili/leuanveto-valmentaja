# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Muisti: `docs/MEMORY.md` (konsultoi session alussa, distill lopussa).
>
> **P-013 batch-rakenne (M1–M3, ratifioitu 2026-06-10):**
> **M1 — batch-handoff.** Yksi handoff saa niputtaa **2 R-vaihetta** (skaalaus 4:ään vasta P-013-mittausdatalla). Jokaisella vaiheella **oma acceptance-rubriikki + oma scope-valkolista**; vaiheiden välissä **STOP-gate** (Code raportoi + bittitarkka pilot ajetaan ennen seuraavaa vaihetta). Per-löydös = oma commit säilyy ennallaan.
> **M2 — ajettava rubriikki.** Osion 2 A-kriteerit muotoillaan **koneellisesti tarkistettaviksi** (testi / skripti / mitattava ehto) ja ajetaan self-correction-looppina kunnes rubriikki täyttyy tai STOP-ehto laukeaa. Mittari-ensin (Selkäranka 6) säilyy: known-positive + known-negative ennen kuin kriteeriin luotetaan. Rubriikki-looppi **EI ohita** confirm-then-fix/A1-read-only-STOP-gatea (CLAUDE.md §9.3).
> **M3 — verifier-subagentti.** A-kriteerien täyttymisen verifioi **erillinen subagentti riippumattomassa kontekstissa** (ei toteuttava agentti itse) ennen STOP-raporttia. UI-polkuja muuttavissa handoffeissa verifier AJAA polut itse (oppi 8). Verifierin hylkäykset kirjataan `docs/MEMORY.md`-mittauslokiin.
>
> *Tila: **H-016 — `AKTIIVINEN` (VAIHE A käynnissä)**. Siirretty Cowork-draftista (`HANDOFF_H-016_paluuramppi-breakAnalysis-liiketasolle_DRAFT-COWORK.md`, RATIFIOITU Akseli 2026-06-12). Ankkurit verifioitu siirrossa (✏️): Pohja-HEAD `fa89e41` = origin/main ✓ · APP_VERSION 4.52.38 ✓ · id H-016 = seuraava vapaa (arkisto päättyy H-015:een) ✓ — §6.4 ratkaistu. Premissit (§5) ovat H-015 §7 A1-kartan runtime-verifioituja löydöksiä — ei re-litigoida.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-016` ✏️ (vahvistettu: seuraava vapaa) |
| Tyyppi | `scope-expansion` (uusi engine-käytös; P-013 batch=2: **VAIHE A = CONFIRM read-only → STOP-gate → VAIHE B = toteutus** rubriikki-loopilla + M3-verifier) |
| Laadittu | 2026-06-12 / Cowork-sessio · Tila: **AKTIIVINEN** (RATIFIOITU Akseli 2026-06-12; siirretty repoon 2026-06-12) |
| Prioriteettilinjaus (Akseli 12.6.) | **Arjen ohjelmointi on ydin — tämä on paluu-erikoistilanteen kehitystä.** Käytännössä: reload-kerros on DORMANTTI normaalirytmissä (vrt. F-2), A7-regressiosuoja (ei-tauko-polut bittitarkka) on handoffin kovin portti, ja ristiriitatilanteessa arjen polun koskemattomuus voittaa paluuominaisuuden laajuuden — **kavenna paluuta, älä riskeeraa arkea.** |
| Pohja-HEAD | `fa89e41` ✏️ (verifioitu PRE-FLIGHTissä 2026-06-12: HEAD = origin/main, puhdas tree) · APP_VERSION `4.52.38` ✏️ |
| Liittyy R-sekvenssin vaiheeseen | Ei yksittäinen R-vaihe (NYT = 18). H-015-jatko + KAPSTONI pilari 1 -esiaskel. **Ajoitusinvariantti (ratifioitu, docs/OBS-038 PÄÄTÖKSET):** paluuramppi → D1 → γ (~11.7.); engineä ei muuteta peaking-blokissa. Fable-ikkuna → 22.6. |
| Aikakriittisyys | Akselin dippipaluu ~vk 25 (15.–21.6.) = **live-known-positive** — handoff on jonon kärjessä tästä syystä. |

---

## 1. Tavoite (lopputila, ei ratkaisua)

Kun liike on ollut tauolla tai korvattuna (≥ 14 pv) ja palaa ohjelmaan, sovellus tarjoaa **itse** kevennetyn aloituskuorman ja rampin takaisin tauon-edeltävälle tasolle — liike-tasolla, tauon syy huomioiden (vaiva-syyllä kipu ohittaa voimatason). Atletin ei tarvitse keventää käsin eikä engine tarjoa täyttä plan+progressio-kuormaa suoraan tauon perään. Ei-tauko-tilanteiden ja muiden liikkeiden kuormat eivät muutu millään tavalla.

Mitä Akseli näkee puhelimella vk 25: dippi palaa ohjelmaan kevennetyllä kuormalla (ei tauon-edeltävää tai sen yli), näkyvä paluuramppi-indikaatio kertoo mistä luku tulee ja miten paluu etenee, ja sama luku näkyy sekä treeninäkymässä että Sykli-previewissä.

## 2. Acceptance criteria

### VAIHE A — CONFIRM (read-only, STOP-gate ennen VAIHE B:tä)

- **A1 — Integraatiopiste-sweep (LAAJA runtime-first, ei kapea hypoteesi — MEMORY oppi 2 / §5b):**
  - Enumeroi **kaikki** polut joissa palaavan liikkeen target syntyy: recommend()-päähaara (plan-floor, hardCap, regain), `breakAnalysis`-kutsupisteet + `mesocycleBreakReset`, Sykli-preview (OBS-038 K1 -suhde-projektio — **periytyykö pään kevennys back-off-previewiin automaattisesti**), getFutureWorkouts, 2c-paluubanneri (≥14 pv gap), pilot-simulaattori.
  - Verifioi datan saatavuus per-liike-detektiolle: viimeisin ei-skipattu, ei-korvattu suoritus per liike; korvausjakso `movementSubstitutions`-datasta; K2-syytagin (exerciseNote-loki + substituution reason-kenttä) luettavuus engine-tasolle.
  - Selvitä precedence-nykytila: mitä tapahtuu kun globaali breakAnalysis JA liike-tason tauko osuvat päällekkäin (→ §6.1).
  - Rajaa mihin slot-rooleihin reload kohdistuu v1:ssä (primary/secondary/backoff vs accessory — missä poluissa kuormaresoluutio elää; → §6.2).
  - **Known-positive Akselin todellisella datalla:** dippi — raportoi (i) tauon-edeltävä toteutunut työkuorma, (ii) nyky-enginen tarjoama paluukuorma, (iii) spec-kevennyksen tuottama kuorma. Aritmetiikka käsin raportissa. **Known-negative:** kyykky/leuka normaalirytmissä → reload ei laukea.
  - **STOP + gate-raportti Akselille.** Jos A1 paljastaa että ratifioitu mekanismi (liike-tason breakAnalysis) on selvästi riskialttiimpi kuin vaihtoehtoinen toteutus samalle käytökselle → raportoi vaihtoehto, älä pivotoi hiljaa (CLAUDE.md §9.5).

### VAIHE B — Toteutus (vasta gate-vahvistuksen jälkeen; koneellisesti tarkistettavat ehdot, P-013 M2)

- **A2 — Liike-tason tauko-detektio:** engine tunnistaa liikkeen tauon kun viimeisimmästä ei-skipatusta, ei-korvatusta suorituksesta on ≥ 14 pv (kynnys konfiguroitava; korvausjakso lasketaan tauoksi alkuperäiselle liikkeelle movementSubstitutions-datasta). *Mitattu:* yksikkötesti known-pos (17 pv + korvaus aktiivinen) + known-neg (normaalirytmi 3–7 pv; yksittäinen skip ilman taukoa).
- **A3 — Kevennetty aloituskuorma:** 1. paluusession target = tauon-edeltävä toteutunut työkuorma × (1 − reloadPct). Ankkuri = liikkeen viimeisimmän toteutuneen (ei-skipatun, ei-korvatun) session pääsarjakuorma; A1 täsmentää resoluutiolähteen F-3-invarianttien sisällä (ei uutta e1RM-polkua). reloadPct luetaan **konfiguroitavasta taulukosta** (tauon kesto × korvaava-liike-olemassa), oletusarvot R1 §2.5 -matriisista; Akselin solu (2–3 vk × korvaava olemassa) = −10…15 %, piste-oletus −12,5 %. **EI** plan + 2,5 %/vk × tauko (nykykäytös). *Mitattu:* pilot-tauko-skenaario + runtime-ajo Akselin datalla; aritmetiikka käsin; known-neg: ei-tauko-liikkeen target muuttumaton.
- **A4 — Ramppi takaisin:** paluu tauon-edeltävälle tasolle konfiguroitavassa ajassa (oletus ~2 vk Akselin solulle); rampin seuraava porras lasketaan **edellisestä toteutuneesta paluusessiosta** (toteuma-ankkurointi — ratifioitu 12.6.); ramppi ei ylitä tauon-edeltävää tasoa ennen rampin päätöstä, jonka jälkeen normaali progressio jatkuu. Invariantit eivät rikkoudu (hardCap +15 %/vk, VL-cap per blokki, tier-progression). *Mitattu:* pilot-skenaario simuloiduilla paluusessioilla — monotonisuus + cap-tarkistus + skipattu paluusessio pysäyttää portaan (known-neg).
- **A5 — K2-syytagin ohjelmointikytkentä (v1):** vaiva-tagilla korvatun/skipatun liikkeen paluu käyttää taulukon konservatiivista päätä (esim. −15 %) + UI-viesti kipu-gatesta ("etene vain oireettomana" -tyyppinen; ei tutkijanimiä, CLAUDE.md §6); ei-vaiva-syy → taulukon kevyempi pää. Toteuma-ankkurointi (A4) toimii mekaanisena gatena: vaiva-skip pysäyttää rampin ilman lisäkitkaa. *Mitattu:* yksikkötesti tagi → reloadPct-valinta, molemmat haarat.
- **A6 — Näkyvyys (oppi 8 — käyttäjän polku e2e render-tasolla):** paluusessiossa kevennetty kuorma näkyy treeninäkymässä JA Sykli-previewissä samana lukuna (back-off seuraa K1-suhde-projektiona — ei uutta totuuslähdettä); paluuramppi-indikaatio liike-tasolla (2c-bannerin laajennus: mistä kevennys tulee + rampin kesto). *Mitattu:* e2e-DOM 390 px, M3-verifier ajaa polun itse; löydettävyysarvio eksplisiittisesti.
- **A7 — Regressiosuoja (KOVIN PORTTI, prioriteettilinjaus):** pilot bittitarkka kaikille ei-tauko-poluille; **LOAD-DIFF-SWEEP on push-ehto** (kuormaa muuttava muutos) — diffit sallittuja VAIN tauko/paluu-skenaarioissa ja jokainen diff täsmätään spec-taulukkoon tai juurianalysoidaan decision-traceista (oppi 7: suorat vs ketjuvaikutukset); selaintestit ≥ 762/766 (4 pre-existing VBT/T9-failia dokumentoitu); H-015:n 14 test-lukkoa passaavat.
- **A8 — Falsifiointi-instrumentointi:** reload-päätös emittoi tracen (esim. `BREAK_RELOAD`): tauon kesto, korvaava-tieto, syytagi, valittu reloadPct, ramppisuunnitelma — jotta R1 §2.6 -ennuste (menetys ~0–5 %, kevennys ~10–15 %, ramppi ~2 vk, falsifiointiehto) on verrattavissa dippipaluun toteumaan. *Mitattu:* trace-kenttien läsnäolo smoke-testissä.

## 3. Reunaehdot ja scope-aita

**Sovellettavat tutkimusinvariantit (CLAUDE.md §2):** VL-cap per blokki · Deload Δ% · Tier-progression elite ≤ 0,05×/vk · Failure-pudotus 5 % — reload-kerros ei riko mitään näistä. **Reunaehto (b):** reload-parametrit (kynnys, reloadPct-taulukko, ramppikesto) ovat **staattisia konfiguraatioita** — ei uutta oppivaa parametria.

**Evidenssimerkintä (R1-kuri):** reloadPct-magnitudit ja ramppinopeus ovat **KOHTALAINEN / käytäntösynteesiä** (R1 §2.5), eivät RCT-protokollaa → koodikommenttiin evidenssiluokka + konfiguroitavuus, ei "totuus"-väitettä. Kipu-gate on kliininen periaate (R1 §2.3). R1 §2.4 spesifisyysrajaus: matriisi ennustaa voimavajetta, ei tekniikka-/kiputottumusta — kipu-gate ja toteuma-ankkurointi kattavat jälkimmäisen.

**Mitä EI kosketa (test-riippuvuus nimetty):**
- **D1 / intra-session-säätö** — oma handoff, ajoitusinvariantin mukaan tämän jälkeen. H-016 ei lisää session-sisäistä reaktiota.
- **e1RM-resoluutiopolut** (F-3, VALUE_RESOLUTION_AUDIT §0) — lukot `testKotiEqualsLiveAccessory` + `testSp2SlotLoadInvariant` pysyvät vihreinä.
- **M2-ramppimuoto** (data.js weekPlan reps×Vx) ja **F-2-clamp** — reload muuttaa aloitustasoa, ei blokkirampin muotoa.
- **PRIMER-signaali, RTF, velocityStop** (K-A6D) — koskemattomat.
- **OBS-038 K1 -suhde-projektio** — luetaan (kevennyksen periytyminen back-off-previewiin), ei muokata.
- **Globaalin breakAnalysisin nykykäytös** koko-treeni-tauoissa säilyy; jos A1 paljastaa precedence-ristiriidan → STOP, sääntö Akselille (§6.1), ei hiljaista muutosta.
- Jos data.js-ohjelmasisältö muuttuu → `PROGRAM_BUILD_VERSION` + APP_VERSION samassa commitissa (oppi 6).

**Selkäranka (docs/SELKARANKA.md):** PRE-FLIGHT ✏️ (tehty: HEAD `fa89e41` = origin/main, puhdas tree) · VAIHE A read-only = ei peruutusankkuria (mainittu) · VAIHE B: `backup-pre-h016-<sha>` ennen muutoksia · scope-valkolista tiedostotasolla = Code esittää VAIHE B plan-modessa, Akseli näkee gate-raportissa · per-löydös = oma commit + pilot · STOP-ehdot imperatiiveina · **EI pushia ilman Akselin lupaa.** Design plan-modessa (CLAUDE.md §9.2); M3-verifier ennen STOP-raporttia; UI-polut: verifier ajaa itse (oppi 8).

## 4. Atletti-vastaukset

Ei sovellu (scope-expansion, ei block-tuning). Atleettikonteksti: ks. §5 verifioidut premissit + A1:n known-positive (dippi, korvaajina kapea penkki + käsipainopenkki ~2–3 vk, paluu vk 25, rintalastavaiva → vaiva-syytagi).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Ratifioidut päätökset:**
- **2026-06-12 (Akseli, ratifiointi):** koko handoff ratifioitu prioriteettilinjauksella: arjen ohjelmoinnin priimaus on ydin, paluuramppi on tärkeä erikoistilanne — ei ydin. Scope-konflikteissa kavenna paluuominaisuutta, älä koske arjen polkuun (§0 prioriteettilinjaus).
- **2026-06-10 (H-015 §7b/7d, Akseli):** breakAnalysis liiketasolle + K2-tagin ohjelmointikytkentä = oma handoff (tämä).
- **2026-06-12 (Akseli, Cowork-sessio):** (1) reloadPct = **R1-matriisi konfiguroitavana** (kesto × korvaava-olemassa, R1 §2.5 oletukset); (2) kipu-gate = **toteuma-ankkuroitu ramppi + UI-viesti** (ei kalenteripohjaista etenemistä, ei kuittauskitkaa); (3) laukaisukynnys **≥ 14 pv** (linjassa 2c-bannerin kanssa — yksi käsite käyttäjälle).
- **Ajoitus:** paluuramppi → D1 → γ (~11.7.); Fable-ikkuna → 22.6.; dippipaluu ~vk 25.

**Verifioidut premissit (H-015 §7 A1-kartta, runtime + koodi — ei re-litigoida):**
- `breakAnalysis` (engine.js, "RETURN FROM BREAK") on olemassa: modifier −5/−10/−15 % @ 7/14/28 pv + forcedDayType, mutta **koko treenin granulariteetilla** (globaali lastSession) → ei laukea kun muu treeni jatkuu. ✏️ Koodi verifioitu mainista (H-015-verifier: engine.js ~1380–1421 + kutsupisteet ~3909–3932, 4529–4533 — A1 täsmentää).
- Liike-tason paluussa engine tarjoaa **plan + 2,5 %/vk × tauko, jopa yli planin** (runtime: 2 vk tauko → 56,7 @ plan 53,8; 53,8 × 1,025² ≈ 56,5 ✓) — engine ei kevennä paluuta.
- "Itsekorjautuva silta" toimii vain jos atletti keventää itse (hardCap + regain ×2.0 ramppaavat takaisin ~2 sessiossa).
- H-015 toi rakennuspalikat: `movementSubstitutions` (pysyvä, reason-kenttä = K2-tagi datassa), K2-syytagi (exerciseNote-loki skip-flowssa), 2c-paluubanneri (≥14 pv gap), skip-semantiikka (setRole:"skipped" suodattuu e1RM/progressio/volyymisignaaleista).
- R1 §2.6 -ennuste kirjattu falsifiointiehtoineen — A8 instrumentoi vertailun.

**Hylätyt vaihtoehdot:**
- *Pelkkä paluuprotokolla-preskriptio-overlay ilman liike-tason detektiota* (H-015 gate-vaihtoehto 2) — ratifioitu suunta on liike-tason breakAnalysis; A1:n STOP-gate tuo vaihtoehdon takaisin vain jos riskikuva muuttuu olennaisesti.
- *Nykytila (manuaalinen kevennys + itsekorjautuva silta)* — ei täytä eliittitasoa: sovelluksen pitää preskriptoida paluu, ei atleetin muistaa keventää.
- *Oppiva reload-parametri* — reunaehto (b) kieltää (vain RIR-bias adaptiivinen).
- *Eksplisiittinen oireeton-kuittaus per ramppiporras* — kitka (H-015 K2-periaate: kirjaus ei saa lisätä kitkaa); toteuma-ankkurointi antaa saman turvan ilman kuittausta.

**Huom (atletti = valmentaja, ei nanny):** kevennys on suositus — atletti voi aina ylikirjata kuorman; ylikirjaus syöttää toteuma-ankkuroinnin kautta seuraavaa porrasta.

## 6. Avoimet kysymykset

1. **Precedence-sääntö:** kun globaali breakAnalysis (koko treeni tauolla) JA liike-tason reload osuvat päällekkäin — ehdotus: konservatiivisin target voittaa, kevennyksiä EI kumuloida. A1 selvittää nykykytkennät → Code esittää säännön gate-raportissa, Akseli ratifioi.
2. **Slot-roolien rajaus v1:** primary/secondary/backoff (kuormaresoluutio-polut) vs accessoryt (eri ehdotusketju) — A1 rajaa, gate vahvistaa.
3. **Ramppiportaiden muoto:** lineaarinen interpolaatio tauon-edeltävään vs plan-%-polkua pitkin (R1 ei erottele — käytäntösynteesi). Code ehdottaa A1:n pohjalta.
4. ~~Handoff-id~~ ✏️ RATKAISTU: **H-016** (seuraava vapaa, arkisto päättyy H-015:een).

---

## 7. Session-tulos — VAIHE A (2026-06-12, read-only)

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-06-12 (VAIHE A valmis → STOP-gate; ei peruutusankkuria — read-only, ei koodimuutoksia) |
| Muuttuneet tiedostot | HANDOFF.md (siirto e869ca5 + tämä §7) — ei muuta |
| **A1-INTEGRAATIOKARTTA** | **(1) breakAnalysis:** funktio engine.js:1394–1450 (porrastus <7→0 · 7–13→−5 % · 14–27→−10 %+volume · ≥28→−15 %+volume); **YKSI kutsupiste** recommend():3964, syöte = GLOBAALI `lastSession.dateISO` (mikä tahansa liike) → liike-tason tauko ei laukaise (premissi vahvistettu). Modifier applioidaan deltaPct-tasolla (RETURN_FROM_BREAK-trace). **VAARA-ALUE:** breakDays ≥ 14 + skippedWeeks ≥ 2 → `mesocycle = createDefaultMesocycle()` — koko meson nollaus (3975–3983); liike-reload EI saa kytkeytyä tähän polkuun. **(2) Target-synty:** Branch A (4929–4974: primary + same-liike backoff/secondary vReps-polulla sessionEffectiveE1RM:stä) · computeProgressionTarget (2040–2158: plan-floor + hardCap + regain) · accessoryt eri ketju (15c + accessoryProgression). **(3) K1-periytyminen ✓:** back-off-preview projisoi pään NÄYTETYSTÄ → reload-kevennys periytyy automaattisesti, ei lisätyötä. **(4) 2c-banneri:** sama ≥14 pv gap-laskenta (skipped-suodatettu allSets) → A6-laajennus luonteva. **(5) getFutureWorkouts:** ei kuormia → hybrid/recommend kantaa reloadin. **(6) Pilot:** EI tauko-skenaariota → VAIHE B lisää (A7-portti edellyttää). |
| **DATAN SAATAVUUS + LÖYDÖS** | Per-liike viimeisin suoritus laskettavissa allSets:stä — **MUTTA naiivi "viimeisin ei-skipattu" on ANSA:** dipin viimeisin rivi on 0 kg BW-accessory (31.5.) → **ankkuriresoluutio RAJATTAVA: setRole="top" + externalLoadKg>0** (tauon-edeltävä TYÖkuorma). `movementSubstitutions.reason` = rakenteellinen K2-lähde (ensisijainen); skip-tagin exerciseNote-parsinta hauras → sekundäärinen. Vanha meso ilman substituutio-kenttää → defensive read ✓. |
| **KNOWN-POS (dippi, Akselin data, aritmetiikka käsin)** | (i) Tauon-edeltävä top-työkuorma: **27.5. — 4 settiä @ 75 kg** (viim. 75×3 V1). (ii) **Nyky-engine paluussa 16.6. (gap 20 pv): 80,6 kg** = 75 × (1 + 2,5 %×3 vk) — engine tarjoaisi ENEMMÄN kuin tauon-edeltävä, rintalastavaivasta palaavalle (premissi vahvistettu omalla datalla). (iii) **Spec-kevennys: 65,6 kg** (−12,5 %) / **vaiva-pää 63,8 kg** (−15 %, A5 → Akselin tapaus). **KNOWN-NEG:** kyykky gap 11 pv / leuka 12 pv (backup-snapshot) → < 14 pv → reload ei laukea ✓. |
| **§6-EHDOTUKSET (gate-päätettäväksi)** | **§6.1 precedence:** konservatiivisin target voittaa — `min(globaali-break-target, liike-reload-target)`, EI kumulointia; liike-reload EI koske mesocycleBreakReset-polkuun. **§6.2 slot-roolit v1:** reload kohdistuu **primary-ketjuun** (Branch A) → same-liike backoff/secondary seuraavat automaattisesti sessionEffectiveE1RM:n kautta; **accessoryt ULOS v1:stä** (eri ehdotusketju; prioriteettilinjaus: kavenna paluuta). **§6.3 ramppimuoto:** lineaarinen interpolaatio toteumasta tauon-edeltävään ~2 vk:ssa (2–3 sessiota), toteuma-ankkuroituna; hardCap-yhteensopiva. |
| Validointi | Read-only: pilot ei ajettu uudelleen (ei muutoksia; pohja fa89e41 vihreä). Runtime-ajot: computeProgressionTarget + ankkuridata Akselin backupista (10.6.), aritmetiikka käsin yllä. |
| Jäi auki | VAIHE B -scope-valkolista (plan-mode gate-vahvistuksen jälkeen); pilot-tauko-skenaarion muoto; riskikuva EI muuttunut → ratifioitu mekanismi (liike-tason breakAnalysis) pitää, ei vaihtoehto-pivotia. |
| Seuraava askel | **STOP-gate: Akseli ratifioi §6.1–6.3-ehdotukset** → VAIHE B (plan-mode design → toteutus rubriikki-loopilla A2–A8 + M3-verifier). EI pushia ilman lupaa (lokaalit commitit e869ca5 + tämä). |
