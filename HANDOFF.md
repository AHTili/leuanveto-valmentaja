# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto (H-017 D1)

> Siirretty Cowork-draftista (`HANDOFF_H-017_D1-intra-session-alaspain_DRAFT-COWORK.md`, RATIFIOITU Akseli 2026-06-12) → repon HANDOFF.md 2026-06-13 (kanava b:n akti).
> **Tila: H-017 — `AKTIIVINEN` (VAIHE A gate RATIFIOITU 2026-06-12 → VAIHE B plan-mode).** PRE-FLIGHT ✏️: HEAD = origin = `48d5a64` = §0 pohja-HEAD ✓, työpuu puhdas, APP_VERSION 4.52.41 ✓. Gate-päätökset §6:ssa, VAIHE A -raportti §7:ssä.
> Pohja: docs/OBS-038 PÄÄTÖKSET (DESIGN-D1-linjaus, ratifioitu 10.6.) + I3-mekanismiverdikti (runtime-verifioitu) + R1-EVIDENSSIPOHJA OSA 3 + Akselin design-ratifioinnit 12.6. (§5). **Älä laadi uutta — substanssi ratifioitu.**
>
> ✏️ **H-016-TÄSMENNYS (repo voittaa):** H-016 reload on **toteutettu + pushattu + dormantti + PARKISSA** (`git show 3bad610:HANDOFF.md`) — **EI vielä arkistoitu** (odottaa vk 25 dippipaluun live-porttia). Draftin "suljettu" = toteutus valmis; reload-koodi (RELOAD_CONFIG / computeMovementReload) on repossa → D1:n A1-precedence-tarkistus on mahdollinen.

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-017` (D1) ✏️ vahvistettu (§6.4): H-015/H-016 varatut, H-018 arkistoitu → H-017 oli pre-varattu D1:lle |
| Tyyppi | `scope-expansion` (uusi engine-käytös; P-013 batch=2: **VAIHE A = CONFIRM read-only → STOP-gate → VAIHE B = toteutus** rubriikki-loopilla + M3-verifier) |
| Laadittu | 2026-06-12 / Cowork-sessio · Tila: **AKTIIVINEN** (RATIFIOITU Akseli 2026-06-12; siirretty repoon 2026-06-13) |
| Pohja-HEAD | **48d5a64** / APP_VERSION 4.52.41 ✏️ verifioitu PRE-FLIGHTissä (HEAD = origin, puhdas tree) |
| Liittyy R-sekvenssin vaiheeseen | KAPSTONI pilari 1 (reaaliaikainen autoregulaatio) — **ensimmäinen konkreettinen toteutusaskel** (ROADMAP vaihe 21). |
| Ajoitusinvariantti (ratifioitu 10.6.) | D1 toteutetaan ja verifioidaan **ennen vaiheen 20 (γ-peaking, ~11.7.) alkua TAI siirtyy kisan 22.8. yli** — engineä ei muuteta peaking-blokin aikana. Järjestys: H-016 → D1. Fable-ikkuna → 22.6. |
| Prioriteettilinjaus (Akseli 12.6.) | **Arjen ohjelmointi on ydin.** D1-kerros DORMANTTI kun toteuma = suunniteltu; arjen polut bittitarkka; scope-konfliktissa kavenna D1:tä, älä arkea. |

---

## 1. Tavoite (lopputila, ei ratkaisua)

Kun atletti kirjaa pääsarjat suunniteltua kevyemmällä kuormalla (heikko päivä, itse kevennetty), saman session saman liikkeen loput slotit (back-off + volyymislotit) seuraavat **toteumaa** — sovellus ei enää tarjoa väsyneenä tehtäväksi enemmän kuin juuri tehdyt pääsarjat. Säätö toimii **vain alaspäin**: normaali tai suunniteltua vahvempi päivä ei muuta mitään, ja nousu kulkee ainoastaan seuraavan treenin normaalin progression kautta. Vahva päivä nostaa -suunta on v2-arvio kisan 22.8. jälkeen.

Mitä Akseli näkee puhelimella: I3-tilanteessa (10.6. kyykky — pääsarjat tehty 155 kg itse kevennettynä) back-off-rivi päivittyy kirjauksen jälkeen toteumaa vastaavaksi (≤ tehty kuorma F-2-hengessä) näkyvällä merkinnällä siitä että luku seuraa päivän toteumaa — ei jää suunniteltuun 158,5 kg:aan.

## 2. Acceptance criteria

### VAIHE A — CONFIRM (read-only, STOP-gate ennen VAIHE B:tä)

- **A1 — Live-resoluution integraatiopiste-sweep (LAAJA runtime-first, oppi 2):**
  - Enumeroi kaikki polut joissa saman session jäljellä olevien slotien target luetaan/näytetään kirjauksen JÄLKEEN: engine Branch A (`sessionEffectiveE1RM`-lukitus, OBS-038 I3:ssa verifioitu pinta), set-save-polku, live-treeninäkymän re-render (OBS-039-oppi: sync/async-järjestys — päivittyykö back-off-rivi ylipäätään kirjauksen jälkeen), `pendingWorkout`-tila, recovery-resume.
  - Verifioi H-016-yhteensovitus toteutuneesta koodista: reload-kevennetty sessiotarget + D1-re-resolve eivät kumuloidu väärin (D1 ankkuroituu session toteumaan — reload määrää suunnitellun tason; precedence-aritmetiikka raportoidaan).
  - Selvitä pilot-harnessin kyky simuloida intra-session-tapahtumia (kirjaus kesken session) — jos ei ole, A1 määrittää testitavan (selaintesti / synteettinen state, oppi 8 -harness `LeVe.pendingWorkout`-injektiolla).
  - **Known-positive Akselin datalla:** I3-repro (kyykky 10.6.: suunniteltu pää vs tehty 155×3 V1) — raportoi mitä D1-re-resolve tuottaisi back-offille, aritmetiikka käsin. **Known-negative:** sessio jossa toteuma = suunniteltu → ei muutosta mihinkään.
  - **STOP + gate-raportti Akselille.**

### VAIHE B — Toteutus (vasta gate-vahvistuksen jälkeen; koneellisesti tarkistettavat ehdot, P-013 M2)

- **A2 — Triggeri:** säätö laukeaa kun pääsarjojen toteutunut kuorma alittaa suunnitellun targetin (kynnys konfiguroitava — pyöristys-/levyporras-kohina ei saa laukaista, ks. §6.1). *Mitattu:* yksikkötesti known-pos (selvä alitus) + known-neg (täsmälleen suunniteltu; levypyöristys-ero; ylitys).
- **A3 — Magnitudi = re-resolve toteumasta:** saman liikkeen jäljellä olevien slotien target lasketaan uudelleen toteutuneista pääsarjoista **enginen olemassa olevalla aritmetiikalla** (sessionEffectiveE1RM-johto toteumasta; back-off sama %-suhde kuin nyt); lopullinen target = **min(suunniteltu, toteumajohdettu)** — rakenteellinen tae ettei koskaan nosteta. Ei uutta heuristiikkaa. *Mitattu:* I3-repro-testi + min()-invariantin known-neg (vahva päivä → suunniteltu pysyy).
- **A4 — Ärsykelattia ja invariantit:** alaspäin-säätö ei pudota targetia alle konfiguroitavan lattian (~70–75 % liikkeen kanonisesta e1RM:stä; R1 §3.4, VAHVA — minimitehoraja harjoitelleella); lattiaan osuminen emittoi tracen. VL-cap/tier/deload-invariantit eivät rikkoudu; F-2-clamp-semantiikka säilyy. *Mitattu:* edge-testi syvällä itse-kevennyksellä → clamp lattiaan + trace.
- **A5 — Vain alaspäin (v1-linjaus):** toteuma ≥ suunniteltu → ei mitään muutosta; nousupolku kulkee vain seuraavan session normaalin progression kautta. *Mitattu:* known-neg-testit molemmille haaroille; pilot bittitarkka sessioille joissa ei alitusta.
- **A6 — Näkyvyys (oppi 8):** kirjauksen jälkeen saman liikkeen jäljellä olevat rivit päivittyvät live-näkymässä (ei vain seuraavassa renderissä — OBS-039-luokan järjestysvirhe estettävä) + merkintä että luku seuraa päivän toteumaa; ei tutkijanimiä UI:ssa. *Mitattu:* e2e-DOM 390 px, M3-verifier ajaa polun itse (kirjaa kevennetty pääsarja → havaitse back-off-rivin päivitys).
- **A7 — Regressiosuoja:** pilot bittitarkka kaikille poluille joissa triggeri ei laukea; **LOAD-DIFF-SWEEP on push-ehto** — diffit sallittuja VAIN alitus-skenaarioissa ja täsmätään spec-aritmetiikkaan (oppi 7); selaintestit ≥ H-016-sulun taso; H-016:n test-lukot + 14 H-015-lukkoa + `testKotiEqualsLiveAccessory`/`testSp2SlotLoadInvariant` passaavat.
- **A8 — KAPSTONI-instrumentointi:** säätöpäätös emittoi tracen (esim. `INTRA_SESSION_ADJUST`): suunniteltu, toteuma, johdettu target, lattia-clamp, min()-haara — pilari 1 -evidenssi ja falsifiointivertailu. *Mitattu:* trace-kentät smoke-testissä.

## 3. Reunaehdot ja scope-aita

**Sovellettavat tutkimusinvariantit (CLAUDE.md §2):** VL-cap per blokki · Deload Δ% · Tier-progression · Failure-pudotus 5 %. **Reunaehto (b):** D1-parametrit (trigger-kynnys, lattia) **staattisia konfiguraatioita** — ei oppivaa kerrosta. **Evidenssimerkinnät:** alaspäin-säädön turvallisuus voimakehitykselle = VAHVA (VL-kynnystutkimus, R1 §3.2); ärsykelattia 70–75 % = VAHVA (R1 §3.4); re-resolve käyttää enginen omaa aritmetiikkaa (ei uutta heuristiikkaa — RPE-porrasheuristiikka hylätty §5). Velocity-pohjainen triggeri EI kuulu v1:een (R1 §3.1: ei globaalia m/s→%-kerrointa; v2-arvio).

**Mitä EI kosketa (test-riippuvuus nimetty):**
- **H-016 reload-kerros** — TOTEUTETTU+dormantti+parkissa (RELOAD_CONFIG / computeMovementReload kytketty recommend()-polkuun, gitistä verifioitu). D1 ei muuta reload-aritmetiikkaa; precedence-yhteensovitus reload-kevennetyn session sisällä verifioidaan A1:ssä toteutuneesta koodista.
- **Preview-polut** (Sykli/"Seuraavat 14 pv") — OBS-038 K1 -suhde-projektio hoitaa previewin; D1 on **LIVE-polun** ominaisuus. K1-projektiota ei muokata.
- **e1RM-historiapolut** (F-3, VALUE_RESOLUTION_AUDIT §0) — D1-re-resolve on session-sisäinen, ei kirjoita e1RM-historiaan; lukot pysyvät.
- **Seuraavan session progressio** — nousu kulkee vain sen kautta (v1-linjaus); progressio-/regain-/hardCap-mekanismit koskemattomat.
- **M2-ramppimuoto, PRIMER, RTF, velocityStop (K-A6D), mesocycle-rakenne** — koskemattomat.
- Jos data.js-ohjelmasisältö muuttuu → `PROGRAM_BUILD_VERSION` + APP_VERSION samassa commitissa (oppi 6).

**Selkäranka:** PRE-FLIGHT ✏️ (pohja-HEAD 48d5a64 verifioitu; tehty) · VAIHE A read-only = ei peruutusankkuria · VAIHE B: `backup-pre-h017-<sha>` · scope-valkolista tiedostotasolla VAIHE B plan-modessa · per-löydös = oma commit + pilot · STOP imperatiiveina · **EI pushia ilman Akselin lupaa.** Design plan-modessa (§9.2); M3-verifier ajaa UI-polun itse (oppi 8, 390 px).

## 4. Atletti-vastaukset

Ei sovellu (scope-expansion, ei block-tuning). Live-known-positive: I3-tapaus (kyykky 10.6.: pääsarjat itse kevennettynä 155×3 V1, back-off tarjosi 158,5×4 V2 väsyneenä — by-design nykyarkkitehtuurissa, D1 korjaa).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Ratifioidut päätökset:**
- **2026-06-10 (Akseli, docs/OBS-038 PÄÄTÖKSET):** intra-session-autoregulaatio toteutetaan; **v1 = VAIN ALASPÄIN**; kaksisuuntaisuus = v2-arvio kisan jälkeen; ajoitusinvariantti (ennen γ:aa tai kisan yli); H-016 ensin.
- **2026-06-12 (Akseli, Cowork-sessio):** (1) triggeri = **kuorma-alitus pääsarjoissa** (ei toistovaje-/velocity-triggeriä v1:ssä); (2) magnitudi = **re-resolve toteumasta** enginen omalla aritmetiikalla + min(suunniteltu, toteumajohdettu); (3) kohdistus = **saman liikkeen loppuslotit** (back-off + volyymislotit; ei muita liikkeitä).
- **Prioriteettilinjaus (12.6.):** arjen ohjelmointi ydin — D1 dormantti kun toteuma = suunniteltu.

**Verifioidut premissit (OBS-038 I3, runtime + koodi — ei re-litigoida):**
- recommend() ajetaan kerran ennen treeniä; `sessionEffectiveE1RM` johdetaan pään **suunnitellusta** targetista ja lukittuu (engine Branch A, engine.js:4929–4974); back-off = %-suhde siitä; F-2-clamp sitoo ≤ suunniteltu pää. Kirjaus ei päivitä saman session resoluutiota → I3-oire.
- Verdikti C (10.6.): by-design nykyarkkitehtuurissa, mutta eliittikriteeri (KAPSTONI pilari 1) edellyttää intra-session-reaktiota.
- OBS-039-oppi: sync-render + async-päivitys -järjestys on tunnettu virheluokka live-näkymässä — A6 testaa tämän eksplisiittisesti.

**Hylätyt vaihtoehdot:**
- *RPE-porrasheuristiikka magnitudina* (R1 §3.3, −2…5 %) — KOHTALAINEN/valmentajaheuristiikka ja toisi uuden parametrin enginen oman aritmetiikan rinnalle; re-resolve on rakenteellisesti puhtaampi. Heuristiikka jää v2-arvioon jos re-resolve osoittautuu riittämättömäksi.
- *Toistovaje-/velocity-triggeri v1:ssä* — lisäparametreja; velocity-osuus odottaa v2:ta (R1 §3.1 reunaehto: vain suhteellinen poikkeama omasta profiilista olisi validi).
- *Koko loppusession kevennys (muut liikkeet)* — scope-laajennus + ristikkäisvaikutus liikekohtaisiin signaaleihin; v2-arvio.
- *Kaksisuuntainen säätö* — eksplisiittisesti lykätty kisan yli (10.6. linjaus).

**Huom (atletti = valmentaja, ei nanny):** D1 seuraa atletin omaa kevennystä — se ei koskaan estä atlettia ylikirjaamasta tarjottua kuormaa ylöspäin kesken session.

## 6. Avoimet kysymykset → VAIHE A GATE: RATIFIOIDUT PÄÄTÖKSET (Akseli 2026-06-12)

1. ~~**Trigger-kynnys**~~ ✏️ **RATIFIOITU (gate 3):** laukaisukynnys = **≥ ~2 % TAI 1 levyporras, kumpi suurempi. Konfiguroitava.** Known-negative-testi levypyöristys-erolle (A2-mitattu).
2. ~~**UI-merkinnän muoto**~~ → **Code ehdottaa VAIHE B plan-modessa** (ei tutkijanimiä; merkki/teksti "luku seuraa päivän toteumaa").
3. ~~**H-016-yhteensovitus**~~ ✏️ **RATKAISTU VAIHE A:ssa** (§7): reload = suunniteltu katto (ennen sessiota), D1 = toteumajohdettu → puhdas `min()`-kompositio. D1:n min()-"suunniteltu"-syöte = startWorkoutin cachettu (reload-heijastettu) back-off-loadKg.
4. ~~Handoff-id~~ ✏️ RATKAISTU: **H-017** (pre-varattu D1:lle).
5. ~~**Suunniteltu-ref-tallennus**~~ ✏️ **RATIFIOITU (gate 1):** tallenna suunniteltu pohja-arvo treenin alkaessa. **Tarkka mekanismi = Coden valinta plan-modessa — mieluiten olemassa olevasta `sessionEffectiveE1RM`-lukosta, ettei tilaa duplikoida (esitä kumpi plan-modessa).**
6. ~~**Toteuma-mittari**~~ ✏️ **RATIFIOITU (gate 2):** **mediaani pääsarjojen toteutuneista kuormista.**
7. ~~**Near-failure-suhde**~~ ✏️ **RATIFIOITU (gate 4):** **rinnakkaiselo, ei ohitusta.** VAIHE B -testin on katettava skenaario jossa molemmat laukeavat (D1 back-off + near-failure pääliike) → varmista ettei back-off saa **tuplakevennystä** (D1 lukee toteumaa joka jo heijastaa near-failuren).

---

## 7. Session-tulos *(Claude Code täyttää)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-06-13 (VAIHE A — CONFIRM, read-only A1) |
| Muuttuneet tiedostot | `HANDOFF.md` (draftin siirto + §7). **Ei koodimuutoksia** (A1 = read-only, ei peruutusankkuria). |
| Tehdyt päätökset | Handoff-id **H-017** vahvistettu. PRE-FLIGHT: HEAD = origin = `48d5a64` ✓. H-016-tila täsmennetty (toteutettu+dormantti+parkissa, EI arkistoitu — reload-koodi repossa → precedence verifioitavissa). |
| Validointi | A1 read-only sweep: 5 integraatiopistettä enumeroitu + verifioitu suoraan koodista (engine.js + index.html); H-016 precedence verifioitu; pilot-harnessin intra-session-kyky kartoitettu; I3-aritmetiikka laskettu käsin verifioiduilla kaavoilla; known-negative tarkistettu. **Ei /goal-porttia (read-only).** |
| Jäi auki | Gate-raportti Akselille (alla). Triggerin "suunniteltu"-referenssin tallennus (manuaalimuokkaus 13439 ylikirjoittaa currentSet.loadKg) = VAIHE B -avainpäätös. Near-failure-polun (13598) päällekkäisyys. "Toteuma"-edustaja (last/median/min). UI-merkinnän muoto. Testitelineen valinta. |
| Seuraava askel | **STOP — Akselin gate-vahvistus ennen VAIHE B:tä.** Ei pushia. |

---

### VAIHE A — GATE-RAPORTTI (read-only A1, 2026-06-13)

**A1.1 — Live-resoluution integraatiopisteet (5 polkua, verifioitu koodista):**

1. **Kirjaus (set-save):** `#btn-next-set`-handler [index.html:13481–13671]. Tallentaa `currentSet.reps/actualVx/velocity/loadKg/completed` [13507–13511]; `loadKg` = TODELLINEN käytetty kuorma. Lopuksi [13666–13670]: `currentSetIdx++` → `savePendingWorkoutLocal` → `render()`. **Synkroninen**, ei live-DB-kirjoitusta, ei async-kilpajuoksua näytetyille kuormille.
2. **Render:** `render()` → `renderActiveWorkout()` [index.html:6420]. Lukee näytetyn targetin **välimuistista** (`currentSet.loadKg/targetReps/targetVx` ~[6632–6633]). **Ei re-resolvea toteumasta.**
3. **Jäädytyspiste:** `startWorkout()` [~13084–13124]: `computeDisplayedSlotLoad` → `sets[].loadKg` lukitaan `state.workout.exercises[].sets[]`-rakenteeseen kerran.
4. **Recovery-resume:** `checkPendingWorkoutRecovery()` [index.html:1407–1477] palauttaa `state.workout = w` **ajamatta recommend()-funktiota uudelleen** — jäädytetyt kuormat selviävät reloadista.
5. **Engine-resoluutio (kerran ennen sessiota):** `recommend()` → `sessionEffectiveE1RM` [engine.js:5026–5028] = `currentE1RMSystem` (kanoninen, lukittu) → Branch A back-off [5115–5117: `sessionEffectiveE1RM × vRepsToExpectedPct(reps+Vx)` tier 1/2/3] → F-2-clamp ≤ targetExternalLoad [5123–5127]. **engine.js:ssä EI ole polkua joka johtaisi e1RM:n uudelleen toteutuneista sarjoista kesken session.**

**YDIN-GAP (D1:n paikka):** kolme olemassa olevaa intra-session-säätöpolkua + manuaalimuokkaus operoivat KAIKKI vain nykyisen `exercise.sets`-objektin sisällä (= primary-exercise); **back-off on ERI exercise-objekti → mikään niistä ei kosketa sitä.** Lisäksi alaspäin-polut (failure V0 [13554–13560]; near-failure V≤target−2 [13598–13631], tasainen −5/10 %) laukeavat **Vx-alituksesta (vire), eivät kuorma-alituksesta.** I3:ssa atletti keventää KUORMAN mutta osuu tavoite-Vx:ään → `deltaVx=0` → mikään ei laukea. Manuaalimuokkaus [13439–13441] propagoi vain saman exercisen sarjoihin. → D1 = **uusi triggeri** (kuorma-alitus) + **uusi ulottuvuus** (cross-exercise saman liikkeen back-off/volyymi) + **uusi magnitudi** (re-resolve toteumasta, ei tasaista %).

**A1.2 — H-016-yhteensovitus (precedence, verifioitu):** reload [engine.js:4979–5004] laskee pään ja korvaa `targetExternalLoad = reloadTarget` min-precedencellä [4999], ENNEN sessionEffectiveE1RM-lukitusta. Mutta `sessionEffectiveE1RM = currentE1RMSystem` (historiallinen) — **reload EI laske back-offin BASEa.** Reload vuotaa back-offiin VAIN F-2-clampin kautta (back-off ≤ reload-kevennetty pää). **Yhteensovitus D1:n kanssa puhdas min()-kompositiolla:** reload asettaa suunnitellun katon (ennen sessiota), D1 johtaa toteumasta (kirjauksen jälkeen) — `min(reload-säädetty suunniteltu, toteumajohdettu)`. Ei väärää kumulaatiota: jos reload-kevennetyllä päivällä atletti tekee vielä vähemmän → D1 voittaa (matalampi); jos enemmän → reload-katto pysyy (ei nousua). **VAIHE B -ehto:** D1:n min()-"suunniteltu"-syöte = startWorkoutin cachettu back-off-loadKg (joka jo heijastaa reloadia F-2-clampin kautta), EI pre-reload-arvoa.

**A1.3 — Pilot-harnessin intra-session-kyky:** harness käsittelee session **atomisena** — `recommend()` kerran/sessio [scenario-runner.mjs:205], `simulateSet` lukee staattisen `slot.resolvedLoadKg` [athlete-simulator.mjs:110], ei sarja-tason takaisinsyöttöä. **Ei näe intra-session-re-resolvea.** → Pilot toimii A7:n known-NEGATIVEna (todistaa ettei D1 vuoda sessio-granulariteetin polkuun; bittitarkka = D1 dormantti pre-session-polulla). D1:n known-POSITIVE vaatii UUDEN testitavan: **test-runner.js:ssä EI ole yhtään pendingWorkout/live-workout-tason testiä** (verifioitu: 0 osumaa; 156 testifunktiota ovat engine/data-tasolla) → tarvitaan selaintesti joka injektoi synteettisen `state.workout`/`LeVe.pendingWorkout`-tilan (kirjattu kevyt pääsarja) + assertoi back-off-exercisen `loadKg` laskee (oppi 8 -harness, M3-verifier e2e-DOM).

**A1.4 — I3 KNOWN-POSITIVE (aritmetiikka käsin, kaavat verifioitu engine.js:stä):**
Annettu (kyykky 10.6., barbell → e1RM ilman BW:tä): pääsarja tehty **155 kg × 3 @ V1** (Vx=1); back-off tarjottu **158,5 kg × 4 @ V2** (targetVx=2).
- Back-off design-pct: `vRepsToExpectedPct(4+2) = 1/(1+6/30) = 0,8333`.
- Implikoitu lukittu `sessionEffectiveE1RM` = 158,5 / 0,8333 = **190,2 kg** (yhtenevä atletin kyykky-e1RM:n kanssa).
- **D1 re-resolve toteumasta:** e1RM_toteuma = `155 × (1 + (3+1)/30)` = 155 × 1,1333 = **175,67 kg**. Back-off re-resolve = 175,67 × 0,8333 = 146,4 → roundToHalf = **146,5 kg**. `min(suunniteltu 158,5; toteumajohdettu 146,5)` = **146,5 kg**.
- Lattia (A4 ~70–75 % kanonisesta 190): 75 % = 142,5 → 146,5 > 142,5 → **lattian yläpuolella, ei clamp.**
- **Tulos:** D1 tarjoaisi back-offin **146,5 kg** (oli 158,5; −12 kg), ja 146,5 ≤ 155 (tehty pää) ✓ — back-off seuraa päivän toteumaa.

**A1.5 — KNOWN-NEGATIVE:** atletti tekee suunnitellun täsmälleen (esim. 168×3 V1, target 168) → e1RM_toteuma = 168×1,1333 = 190,4 ≈ suunniteltu 190,2 → back-off re-resolve 158,6 ≈ 158,5 → `min(158,5; 158,6) = 158,5` → **ei muutosta.** A2-kynnys (≥ ~2 % / > pienin levyporras) estää pyöristyskohinan laukaisun.

---

### VAIHE B — TOTEUTUS (2026-06-14, ratifioitu plan → toteutus)

**Tila: TOTEUTETTU + automaattisesti verifioitu. Odottaa A6-puhelinverifiointia + push-lupaa.** APP_VERSION 4.52.42. Pohja `48d5a64` → HEAD `d75e208` (5 commitia, EI pushattu). Backup-tagi `backup-pre-h017-3eccdae`.

**Toteutus (per-commit):**
- `c9424c4` C1+C0 — `resolveIntraSessionAdjustedLoad` (puhdas engine-funktio) + `testIntraSessionReResolve` (T1–T9, mittari-ensin).
- `b62db9f` C2–C7 — snapshot (`set.plannedLoadKg` + `state.workout.sessionEffectiveE1RM` + `exercise.isBarbell`) · handler btn-next-set (cross-exercise re-resolve, vain role "backoff") · A8-trace · UI-tagi+toast · config (Asetukset) · APP_VERSION 4.52.42.
- `d75e208` adversariaalisen review'n korjaukset (4 lensiä, 0 blokkeria).

**Acceptance criteria -tulokset:**
- **A2 triggeri** ✓ KUORMA-avaruudessa: `(plannedPrimaryMedian − actualMedian) ≥ max(planned×triggerPct, plateStepKg)`. T1/T5.
- **A3 min()** ✓ `min(plannedLoadKg-snapshot, johdettu)` — ei koskaan nosteta. T1/T3.
- **A4 lattia** ✓ 0,75 × kanoninen `sessionEffectiveE1RM` (EI toteumasta) + clamp-lippu. T4 = 142,5.
- **A5 vain alaspäin** ✓ T2/T3 no-op; pilot bittitarkka ei-trigger-poluille.
- **A6 näkyvyys** ⏳ rivitagi "↓ seuraa päivän toteumaa" + toast — *Akselin puhelinverifiointi* (live-DOM ei CLI:stä, CLAUDE.md §4).
- **A7 regressio** ✓ pilot 64/64 bittitarkka (recommend() koskematon — D1 vain live-polulla); selaintestit 802/806 (4 ennestään VBT/T9-SAFE, EI H017-regressiota); 17/17 H017-assertiota vihreä.
- **A8 trace** ✓ `INTRA_SESSION_ADJUST` → decisionTraces (suunniteltu/toteuma/johdettu/lattia/min-haara/kynnys).

**LOAD-DIFF-SWEEP (push-ehto):** D1 ei ole recommend()-input (operoi vain live-workout-tilassa btn-next-set-handlerissa) → rakenteellinen kuorma-neutraalius; pilot pre/post identtinen (71 audit-flagia ennen ja jälkeen). Diffit sallittu vain live-alitus-skenaarioissa joita pilot ei aja.

**Review-korjaukset (d75e208):** pct-agnostinen derived (pariteetti enginen Branch A:n kanssa kaikilla tier-tasoilla) · sameMov-robustius "(back-off)"-suffiksille · idempotenssi-vartija · NaN-suodatus · settings-clamp · trace recId · isBarbell-kommentti.

**Skooppaus + tietoiset rajaukset (v1):**
- Kohde = vain saman liikkeen role **"backoff"** (handoffin "back-off + volyymislotit"; raskaita openereita secondary/calibration EI kosketa — prioriteettilinjaus "kavenna D1:tä").
- Laukaisuhetki = primaryn KAIKKI työsarjat valmiit; jos back-off aloitetaan ennen (H-015 järjestysmuutos), D1 no-op (turvallinen).
- Latentit (eliittiprofiilille tavoittamattomat, A3/A5 absorboi): cold-start-lattia → 0 kun e1RM ≤ BW; floor käyttää live-BW:tä recommend()-BW:n sijaan (sama-session-painomuutos); variant-swap-alas-attribuutio (lopullinen kuorma silti oikea). Ei v1-korjausta.

**Seuraava askel:** Akselin (1) puhelinverifiointi A6 — back-off-rivin päivitys + tagi + toast kun pääsarjat tehty kevyemmällä; (2) push-lupa (5 commitia origin/main). **STOP — ei pushia ilman lupaa.**
