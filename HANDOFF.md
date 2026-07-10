# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Muisti: `docs/MEMORY.md` (konsultoi session alussa, distill lopussa).
>
> **P-013 batch-rakenne (M1–M3, ratifioitu 2026-06-10):**
> **M1 — batch-handoff.** Yksi handoff saa niputtaa **2 R-vaihetta**. Jokaisella vaiheella **oma acceptance-rubriikki + oma scope-valkolista**; vaiheiden välissä **STOP-gate** (Code raportoi + bittitarkka pilot ennen seuraavaa vaihetta). Per-löydös = oma commit.
> **M2 — ajettava rubriikki.** A-kriteerit **koneellisesti tarkistettaviksi**; mittari-ensin (Selkäranka 6): known-positive + known-negative. Rubriikki-looppi **EI ohita** A1-read-only-STOP-gatea (CLAUDE.md §9.3).
> **M3 — verifier-subagentti.** A-kriteerien täyttymisen verifioi **erillinen subagentti riippumattomassa kontekstissa** ennen STOP-raporttia. UI-poluissa verifier AJAA polun itse (oppi 8). Hylkäykset → `docs/MEMORY.md`-mittausloki.
>
> *Tila: **AKTIIVINEN — `H-019` (batch: OSA A OBS-044-heal + OSA B γ-peaking-aktivointi).** Kopioitu Coworkin draft-v2:sta ja ratifioitu 2026-07-10: reunaehto (a) -ohitus ehdolla invariant-violaatiot = 0 · merge-suunta = aktiivisen ohjelman ID + pakollinen dry-run · VL-portaistus sovitettu §2:een (B2) · kenttähavainto: vain 1 näkyvä Jalkaprässi → A1 jatkuu ID-ketjun dumpilla, näkyvä-duplikaatti-hypoteesi EI vahvistettu. Osiot 0–7 alla. Arkistohistoria säilytetty: Rinnalla chat-ratifioituna (EI handoff-muotoisena): **Ohjelmointikone KORI 1–4 + known-fails-ratifiointi** valmis ja **pushattu 2026-07-04** (origin/main `17e19a8`, APP_VERSION 4.52.57, 20 committia): KORI 1+2 = 4.52.55 (E1–E5 + K2a/K2b/K2c), KORI 3+4 = 4.52.56 (K3-1 across-set-väsymysmalli + kestävyys-katto · K3-4 historia-tietoinen VAROVAINEN · K3-3 D1-v2 · K3-2 ykkös-re-ankkurointi · K4-1 viikkovolyymikortti · K4-2 cold-start-UX), known-fails = 4.52.57 (VBT-trio FIXTURE_DRIFT/todayISO-pinnaus · T9 TEST_STALE/K-A2-re-baseline · **S10 CODE_BUG**: PLAN_BASED-inversio migroitiin 1c978a9:n system-%-kontraktiin 4 lokuksessa jaetulla planBasedInvertE1RM-helperillä + uusi F-3-lukkotesti S10b). Selaintestit **854/854 täysvihreä** (ensimmäistä kertaa). LOAD-DIFF (S10): 10/64 pilot-päivää, e1RM-korjaus ylös → kuormat +0,5…+6,5 kg PLAN_BASED-kohdissa — raportoitu Akselille. A6 verifioitu puhelimella (la vk10 -treeni 4.52.57:llä). **Jatkokierrokset 2026-07-04 (→ 4.52.58):** (1) infra: headless-selaintestit Stop-hookin 4. portiksi (`tools/browser-test/`, riippuvuudeton CDP-ajuri, ~3 s, tuore profiili → SW-cache-immuuni); (2) **KORI 5** (Akselin la vk10 -havainnot + audit-triage, kaikki 7 ratifioitu): K5-1 apuliike-regression-lattia (`ACCESSORY_FLOOR_CAP`; hip thrust 59,5→62,5 -kenttäcase) · K5-2 ramppi-mikrokuormalattia (BW-variantti <10 kg lisäpainolla) · K5-3 SAFE=TARGET-dedupe · K5-4 label-kg-strippaus (honestifyLoadLabel) · K5-5 toteuma-layout pinotuksi · K5-6 stale K-A1-auditkanava eläkkeelle (diagnoosikorjaus: kattavuus oli jo K3-3:ssa) · K5-7 deload-day-kerroin (negatiivista basea ei laimenneta; deltat vk4/8/12 → −20…−25 %, Helms-lattia) — **pilotin audit-flagit 71→53, 🐛 14→0 (ensimmäistä kertaa), ⚠️ 6→2**; (3) **tietovault v1**: docs/vault/ 34 noottia + INDEX (8a-prior-taulukko 31 riviä = vaiheen 8a suora syöte; aukkoanalyysi 9 jäljellä, priorisoitu); (4) aikapommi-sweep puhdas (VBT-trio oli ainoa — breakAnalysis/recommend pinnattu, cal-ikkuna data-relatiivinen). **KORI 6 pushattu 2026-07-05** (`2d6a4da`, 4.52.59; Akselin la-vk10/su-treenihavainnot + luottamusinfra): K6-2 **PRESCRIPTION_SANITY-vahti** (peräkkäisten preskriptioiden >±10/15 % muutos vaatii selittävän säännön; deload-raja/blokkiraja/BW-kallio-system-vertailu rakenteellisina selittäjinä) · K6-2b **vahdin 1. saalis**: deload-sessiot eivät kelpaa progression ankkuriksi (post-deload-romahdus pilotissa vk9 primary 12,5→69 kg, vk9/pv2 kyykky 106,5→151 — LOAD-DIFF 8 päivää, yksiselitteisesti valmentajaoikea) · K6-3 **yksi e1RM-totuus** (loadType:"system" 14 BW-presettiin; Haara C loadType-first; Heavy negative -kenttäcase 69,5→77,5 + kortti 85,3→sys ~96; K5-1-lattia hyväksyy V1:n vapaa-Vx-slotilla) · K6-1 **perustelu-lohko jokaiseen kuormaan** (viime kerta → nyt + säännöt traceista, myös apuliikkeet) · K6-4 rehellinen badge (Progressio↑/Kalibrointi↓/Ylläpito→ todellisesta kuormasta) + double progression -vihje · K6-5 otsikkostrippaus ehdoton + Vaihda päivä -selkeytys (su-illan vk N/N+1 -ansa). Selaintestit **863/863**, pilotin audit **🐛 0** (myös uusi vahti). Hyväksymiskoe käynnissä: 2 vk — jokainen poikkeama selittyy napista, PRESCRIPTION_SANITY 🐛=0, mittarina Akselin manuaalikorjausten määrä/treeni (tavoite 0–1). **KORI 7 pushattu 2026-07-05** (`699d7f1`, **4.53.0 milestone** — valmentaja-linssin KAIKKI 7 aukkoa): K7-1 aamucheck-in 4. readiness-kanavana (Hooper/McLean; null→GREEN kiinni, laitteeton fallback) · K7-2 automaattinen deload-ehdotus (cross-movement väsymysaggregaatti, advisory) · K7-3 failure-syyn erottelu (voima/tekniikka/kipu/ote → eri reaktiot; kuorma ei putoa tekniikkafailuresta) · K7-4 MU-skill-syyt + regressio-drillit (MU on taitoliike) · K7-5 kipu-liikennevalo (lievä −10 % / kohtalainen korvaus+vaiva-tagi / kova stop) · K7-6 kisapäivän in-meet-yritysvalinta (computeNextAttempt: tulos päivittää päivän 1RM:n + seuraavan yrityksen; strategia varma/normaali/aggressiivinen) · K7-7 syklin loppuanalyysi → heikkousdiagnoosi + seuraavan blokin suositus (kisapäivä ≤8 vk → peaking) — ohjelmointi ei enää lopu 16 viikkoon. Selaintestit **886/886**, pilotti 🐛 0 bittitarkka. **VAIHE 8a V1 pushattu 2026-07-06** (`27f2a1e`, **4.53.1** — ENSIMMÄINEN OPITTAVA PARAMETRI, `learnedAcrossSetFatigue`): engine oppii atletin sarjasta-sarjaan-väsymyksen (havainto = mediaani (reps+Vx)-erotuksista SAMAKUORMAISILTA työsarjoilta; deload-sessiot pois; viimeiset ≤20 kelpaavaa sessiota; priori-shrinkage τ=5; clamp ±2 SD [0,25;0,75] + `LEARNED_PARAM_OUTLIER`) ja mitoittaa työsarjat *hänen* kestävyytensä mukaan (5×3@V2 e1RM 180: sustains 152,1 ↔ prior 150 ↔ fatigues 149 kg). **Ko-opittavuus-invariantti pidetty:** yksi `acrossSetRate` threaded preskriptioon (`acrossSetAllowance`) + estimointiin (`withinSessionFatigueCredits`) + re-ankkurointiin (`resolveTopSingleReanchor`). Oppii treenin päätöksessä (`settings.learnedParams`, `computeLearnedAcrossSetFatigue`/`updateLearnedParam`); **recommend() pysyy puhtaana lukuna → cold-start bittitarkka (LOAD-DIFF C0..C3 = 0/64 vs cc5deef).** Uudelleenkäytettävä `updateLearnedParam`-koneisto seuraaville 8a-parametreille. Legibiliteetti: 🧭-perustelu ("Sarjaväsymys opittu treeneistäsi… N treeniä, luottamus Z %") + Asetukset-näyttö + nollaus. 4 committia (C0 threading → C1 varasto → C2 oppiminen → C3 UI). Selaintestit **911/911**, Stop-hook 4/4 vihreä. **A6 puhelinverifiointi PENDING** (kenttädata kertyy tulevista treeneistä — arvo näkyy vasta kun jotain on opittu). **KORI 8 pushattu 2026-07-06** (`df15d3c`, **4.54.0** — progressio-monipuolisuus, huomio #6): engine kohteli jumitusta binäärisenä (progressio kuormalla TAI `checkStagnation` → vaihda liike); nyt tasanne-tilassa ("Ylläpito →" = kuorma ei nouse eikä laske) `suggestProgressionTool` ehdottaa oikean EI-kuorma-työkalun (toistot/sarjat/tiheys/tempo/mikrokuorma) valmentajan tikapuiden mukaan ENNEN liikkeen vaihtoa. Deterministinen advisory, EI opittava — **8a V2 (weekly-rate) lykättiin tietoisesti:** analyysi paljasti kompoundautuvan double-count-riskin `vxAdjustment`:in kanssa JA että #6 koski monipuolisuutta ei tahtia (STOP+kysy §9.5). recommend()-kuorma koskematon → **LOAD-DIFF 0/64 bittitarkka vs cc5deef** (koko sessio 8a+K8 load-neutraali). Selaintestit **921/921**, Stop-hook 4/4. 3 committia (C1 engine-ladder → C2 UI-pinta → C3 versio+docs). A8 puhelinverifiointi PENDING (jumittavalla liikkeellä näkyy työkalu 🧭-lohkossa). Jäljellä mullistavuus-tiekartalla: 8a V2 turva-asymmetrisesti (weekly-rate double-count ratkaistava, TAI `learnedFailureDropPct` puhtaampana seuraavana opittavana — Akseli grindaa failureen → rikas signaali) + γ-peaking-handoff (~11.7.) + vuosikello-laajennus (monta kisaa). **MULLISTAVA-KAARI (varaukseton eliitti) pushattu 2026-07-06:** asiantuntija-auditti (20 treenihuomiota + ohjelmoinnin lainalaisuus-kattavuus) → e1RM/kuorma-tauti parannettu, mutta 3 aukkoa erottaa "eliittikykyisen" "varauksettomasta eliitistä". **MULL-2 (`3269fbb`, 4.55.0): volyyminvalvonta (#8)** — `analyzeVolumeLandmarks` ⚠ ali-annostellut tavoite-synergistit (hauis leuanvedon EPÄSUORANA synergistina) + ▲ MRV-lähestyvät, Sykli-kortti. **MULL-3 (`3999a4c`, 4.56.0): within-session-ennakointi (#16)** — `forecastSetSustainability` ennustaa viimeisen sarjan varannon 8a-across-set-mallista → ⚠ kestävyys-varoitus + kestävä vaihtoehto (vähemmän sarjoja / kevyempi) ENNEN grindiä (reaktiivisesta ennakoivaan); UI-side, recommend() BYTE-IDENTTINEN (K3-1-kalibroitu plan-kuorma koodaa implisiittisen e1RM:n, ei echoa), K3-1 ei false-fire. Molemmat advisory → LOAD-DIFF 0/64. Selaintestit 936/936, Stop-hook 4/4. **Jäljellä varauksettomaan eliittiin: (a) #14 lisää-liike mielivaltaiseen kohtaan** (nyt 2 sijaintia same-category), **(b) OBS-044 DUPLIKAATTILIIKE-HEAL** (treeninaikainen huomio #1, koodivarmennettu: apuliikehistoria orpona movementId-mismatchilla — `computePriorSessionSummary`/`getMovementProgress` matchaavat täsmä-ID:llä, kanoninen e1RM eri ID:llä → "ensimmäinen kirjaus" + oletuskuorma 165,5 vaikka demonstroitu 185; = apuliike-"heikkenen viikko viikosta" -juuri; EI post-update-unohtamista). Puhelinverifioitavat kentällä: MULL-2/3 + #11 set-count + #13c Sat-MU.* Edellinen (**Wizard-materialisaatio, KAPSTONI pilari 3**) suljettu + arkistoitu + **pushattu 2026-07-01** (APP_VERSION 4.52.53, origin/main `4c3766d`, → docs/handoffs/HANDOFF_wizard-pilari-3.md): puhdas sokea portti 6/6 (P1–P6) + P7∧P8 = KYLLÄ; pilotti bittitarkka koko kaaren. Sitä edeltävä (**H-017 D1**, intra-session-autoregulaatio v1 alaspäin) suljettu + arkistoitu 2026-06-14 (→ docs/handoffs/HANDOFF_H-017.md); A6 puhelinverifioitu → **KAPSTONI pilari 1:n ensimmäinen elävä todiste**. Seuraava: **γ-peaking** (R1 OSA 1) ~11.7. erillisenä handoffina (sisältää P3/peaking-lykkäyksen + kisaviikon kisaliike-intensiteetin). Rinnalla parkissa: **H-016** (paluuramppi, toteutettu+dormantti, odottaa vk 25 dippipaluun live-porttia → arkistointi sen jälkeen, `git show 3bad610:HANDOFF.md`). Backlog: OBS-042 (apuliike-median), OBS-043 (lista-render-viive), OBS-044 (2 katalogi-duplikaattia + heal-migraatio), OBS-045/046/047 (H-017 D1 -latentit: cold-start-lattia / live-BW-floor / variant-swap-attribuutio).*

---

> **H-019** laadittu Cowork-kanavassa (a) 2026-07-10; **v2** päivitetty Coden PRE-FLIGHT/A1-STOP-raportin + Akselin ratifiointien pohjalta; **kopioitu repoon ja AKTIVOITU 2026-07-10.** Evidenssipohja OSA B:lle: R1-EVIDENSSIPOHJA OSA 1 (Cowork-kansio, 2026-06-12) — parametrit siirretty tähän, lähteet siellä.

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-019` (batch: OSA A + OSA B) |
| Tyyppi | OSA A: `debug` (confirm-then-fix) · OSA B: `block-tuning` (§4 atletti-vastaukset TÄYTETTY) |
| Laadittu | 2026-07-10 / Cowork-sessio (Fable 5) · v2 päivitetty 10.7. |
| Tila | **AKTIIVINEN** (ratifioitu 2026-07-10; kopioitu Cowork-draft-v2:sta) |
| Pohja-HEAD | `5ad3d37` · APP_VERSION `4.56.0` (Code verifioi PRE-FLIGHTissa; jos HEAD uudempi → raportoi delta ennen työtä) |
| Liittyy R-sekvenssin vaiheeseen | OSA A: M1-pohja-puhtauden ylläpito (ei R-vaihe-siirtoa) · OSA B: **vaihe 20 (Round B-γ peaking)** |
| Kisapäivä-ankkuri | **la 22.8.2026** (streetlifting: muscle-up + dippi + lisäpainoleuanveto) |

**Miksi tämä järjestys:** OBS-044 vääristää apuliikekuormia elävässä treenissä NYT (koodivarmennettu juuri "heikkenen viikko viikosta" -kokemukselle), ja se on korjattava ENNEN γ:aa jotta peaking-blokki rakentuu puhtaan historian päälle. γ on deadline-sidottu (5 vk kisaan).

---

## 1. Tavoite

**OSA A:** Apuliikehistorian orpo-`movementId`-mismatch on parannettu: prior-session-yhteenveto ja liikeprogressio resolvoituvat atleetin demonstroituun historiaan — "ensimmäinen kirjaus" + oletuskuorma ei koskaan esiinny liikkeelle jolla on kanoninen vastine historiassa.

**OSA B:** γ-peaking-blokki on aktivoitu kisaan 22.8.2026: 4 viikkoa peaking-työtä alkaen **ma 20.7.** + 1 viikon taper, evidenssipohjaisilla parametreilla, kisalajeille MU + dippi + lisäpainoleuka. Kisapäivä on ohjelmoitu (in-meet-yritysvalinta).

Kumpikaan osa EI määrää ratkaisun toteutustapaa — acceptance-kriteerit määräävät lopputilan.

---

## 2. Acceptance criteria

### OSA A — OBS-044 heal (debug, confirm-then-fix, §5b laaja sweep)

- **A1 (READ-ONLY, STOP-gate):** Laaja runtime-sweep koko liikekatalogin + koko sessiohistorian yli (EI kapea hypoteesitesti): listaa (i) kaikki katalogi-duplikaatit, (ii) kaikki orvot historia-`movementId`:t (historiaa jonka ID ei resolvoidu kanoniseen liikkeeseen jolla on e1RM), (iii) jokaiselle: mitä UI/`computePriorSessionSummary`/`getMovementProgress` nyt näyttää vs mitä demonstroitu historia sanoo. **Known-positive:** kenttäcase (apuliike → "ensimmäinen kirjaus" + oletuskuorma 165,5 vaikka demonstroitu 185) löytyy sweepistä. **STOP + raportoi Akselille ENNEN korjausta.** Jos juuri ≠ ID-mismatch-perhe → älä korjaa, raportoi todellinen mekanismi.
- **A1-TARKENNUS (kenttähavainto 10.7., §5b-kuri):** Akseli näkee Liikkeet-välilehdellä **vain YHDEN Jalkaprässin** → Coden ensimmäinen hypoteesi (käyttäjän lisäämä preset-niminen näkyvä duplikaatti) EI ole vahvistunut kenttäcasessa. A1:n on dumpattava Jalkaprässin **todellinen ID-ketju**: kaikki katalogi-tietueet ko. nimellä (ml. piilotetut/ei-aktiiviset), kaikki historia-`movementId`:t Jalkaprässi-seteissä, slot-viittaukset, ja phase-variant-reseptin (data.js ~754–757) mahdollisesti luomat instanssit. Mekanismi on demonstroitava sweep-datalla ennen A2:ta — ei korjata hypoteesille.
- **A2 (FIX, vasta A1-ratifioinnin jälkeen):** Heal-migraatio: duplikaatit yhdistetään kanoniseen ID:hen ja historia re-linkataan (heal-pinta Coden A1a-kartan mukaan: sets + movementProgress + variants re-point · baselines/protocols verifioidaan · ylimääräisten katalogi-rivien poisto · `addMovement`-dedup-guard normalisoidulla nimellä · T3-lukko globaaliksi uniikkiudeksi). **Merge-suunta (Akseli ratifioi 10.7.): kanoninen = ID johon aktiivisen ohjelman slotit/katalogi osoittavat → orpo historia siirretään siihen; jos kumpaakaan ei viitata ohjelmassa → eniten-historiaa-omaava voittaa.** Migraatio on **idempotentti** (toinen ajo = no-op) ja **peruutettavissa**: pakollinen backup-snapshot + **dry-run-raportti Akselille ennen ajoa** (per-pari: mikä yhdistyy mihin, montako settiä siirtyy).
- **A3 (LOAD-DIFF-SWEEP, push-ehto §9.4):** Pre-vs-post: **vain** healattujen liikkeiden kuormat saavat muuttua. Näille LOAD-DIFF **≠ 0 on tarkoituksellinen parannus** (orpo historia palaa: esim. Jalkaprässi 165,5 → ~185-taso) → raportoidaan per-liike-diffinä suuntineen, EI bittitarkkuusvaatimuksena. Kaikki muu bittitarkka.
- **A4 (regressio-lukko):** Testi joka lukitsee: orpo-ID-historia ei tuota "ensimmäinen kirjaus" -tilaa kun kanoninen vastine on olemassa. **Known-negative:** aidosti uusi liike (ei historiaa millään ID:llä) SAA tuottaa first-entryn.

### ⛔ STOP-GATE A→B

Pilot bittitarkka (pl. A3:n ratifioidut heal-muutokset) + selaintestit vihreät + headless-Stop-hook 4/4 + **Akselin kuittaus** ennen OSA B:n aloitusta. OSA A:n commitit omillaan (per-löydös = oma commit).

### OSA B — γ-peaking (block-tuning, invarianttipohjaiset rajat)

- **B1 (rakenne):** γ-blokki alkaa **ma 20.7.2026**; rakenne = 4 vk peaking-työ (vk:t 20.7. / 27.7. / 3.8. / 10.8.) + 1 vk taper (ma 17.8.–pe 21.8.); kisapäivä la 22.8. on eksplisiittinen ankkuri. Kuluva viikko + viikko 13.–19.7. ajetaan nykyblokin mukaan **bittitarkasti** (γ ei saa muuttaa mitään ennen 20.7. — tämä on B-rubriikin LOAD-DIFF-ehto).
- **B2 (intensiteetti-invariantti + viikkoleimasemantiikka):** ROADMAP:in "VL-cap 20→15→10 %" -portaistus sovitetaan CLAUDE.md §2 -bandeihin — **invariantti (auktoriteettitaso 2) voittaa ROADMAP:in (taso 4):** mikään "peaking"-leimainen viikko ei kanna VL-cappia yli 10 %. Sovitus: **vk 1–2 (20.–31.7.) = intensity-leima, VL-cap ≤ 15 %** (band 10–15) · **vk 3–4 (3.–14.8.) = peaking-leima, VL-cap ≤ 10 %** (band 5–10) · **taper-vko (17.–21.8.) = peaking, VL-cap 5–10 %** alarajapainotteisesti. Known-negative: "peaking"-viikko VL 12 % hylätään; known-positive: peaking-viikko 8 % hyväksytään.
- **B3 (taper-viikko):** volume-load **−40…−60 %** edeltävän 4 vk keskiarvosta (käytäntöikkuna −41…−50 % ensisijainen); **intensiteetti säilyy** (kisaliikkeet korkealla %:lla, matalat toistot — volyymi pudotetaan sarjamäärästä, EI kuormasta); **frekvenssi säilyy** (sessioita ei poisteta; volyymi poistetaan sessioiden sisältä). Aritmetiikka verifioidaan käsin known-positive/negative-tapauksilla ennen kuin kriteeriin luotetaan.
- **B4 (viimeinen raskas):** viimeinen raskas sessio kisaliikkeille **~3–4 vrk ennen kisaa** (ti 18.8. tai ke 19.8.); sen jälkeen vain kevyt teknis-aktivoiva työ. Kaikki kisaliikkeet ovat ylävartaloa — ala-/yläraaja-erottelua ei sovelleta (R1: se oli heikoin evidenssikohta; nyt tarpeeton).
- **B5 (kyykky = ei-kisaliike):** kyykky ajetaan taperissa alas tukiliikkeenä: viimeinen raskas kyykky viimeistään **~5–7 vrk ennen kisaa**, taper-viikolla korkeintaan kevyt ylläpito. Ei kisaliike-intensiteettivaatimusta.
- **B6 (MU = taitoliike, Taso 3):** MU-peaking = tekninen terävyys + kuormatettu spesifisyys; **EI failure-grindiä taperissa** (K7-3/K7-4-semantiikka säilyy). MU:lla ei sys-1RM-ankkuria → yrityskuormien lähde on avoin kysymys (§6), EI arvata.
- **B7 (D1-invariantti):** intra-session-autoregulaatio pysyy **vain alaspäin** koko γ-blokin + kisan yli. Ei semantiikkamuutosta.
- **B8 (kisapäivä + syöttö-UI):** la 22.8. on ohjelmoitu kisapäiväksi: K7-6 in-meet-yritysvalinta (`computeNextAttempt`) aktiivinen kolmelle lajille. Coden A1b-löydös: engine lukee kisapäivä/`meetStrategy`-kenttiä mutta **syöttö-UI puuttuu (KORI 7 -jäänne)** → OSA B toteuttaa minimaalisen syöttö-UI:n (kisapäivä + strategia + lajijärjestys + yritysmäärä/laji). Arvot syöttää Akseli UI:n kautta — EI kovakoodata arvausta.
- **B11 (peaking-putki on jo olemassa — γ AKTIVOI):** Coden A1b vahvisti: UI→`recommend()`→`recommendPeaking`→yrityskuormat+päätöspuukortti on end-to-end kytketty. γ:n scope = aktivointi + konfiguraatio + B2-viikkoleimat + B8-UI + Wizard-P3-peaking-lykkäyskirjaus — EI putkituksen uudelleenrakennusta.
- **B9 (LOAD-DIFF):** γ-aktivointi muuttaa kuormia **vain 20.7. alkaen**; koko historia + kuluva/seuraava viikko (→ su 19.7.) bittitarkka pre-vs-post.
- **B10 (legibiliteetti):** atleetille näkyvä perustelu (🧭-lohko tms.) kertoo taper-viikolla MIKSI volyymi putoaa ("kisaan valmistava kevennys — teho säilyy, väsymys puretaan") — ilman tutkijanimiä UI:ssa (§6).

---

## 3. Reunaehdot ja scope-aita

**Invariantit (CLAUDE.md §2):** VL-cap peaking 5–10 % · deload/taper-Δ ei riko −20…−30 %-deload-semantiikkaa (taper ≠ deload; taper on oma tila) · failure-jälkeinen pudotus 5 % ennallaan · **reunaehto (b):** γ EI lisää uusia opittavia parametreja (staattinen konfiguraatio) · **reunaehto (a) PRE-FLIGHT-porttina:** Code ajaa invariant-violation-tarkistuksen laajennetussa kanavajoukossa ennen OSA B:tä; jos ≠ 0 → STOP + raportti (Akseli ratifioi jatkon).

**PRE-FLIGHT (Selkäranka 1):** `git rev-parse HEAD` = `5ad3d37` tai uudempi main (delta raportoidaan) · working tree puhdas · `git log --oneline -10` + HANDOFF §7 -vertailu (§8.6).

**Peruutusankkuri (Selkäranka 2):** `backup-pre-H019A-<sha>` ennen OSA A:ta, `backup-pre-H019B-<sha>` ennen OSA B:tä. A1-sweep on read-only → ei ankkuria tarvita ennen sitä.

**Scope-valkolista OSA A:** liikekatalogi-data + migraatiokoodi + `computePriorSessionSummary`/`getMovementProgress`-resoluutiopolku + uusi regressio-testi. **EI** recommend()-peruslogiikkaa, EI e1RM-laskentaa (F-3-invariantti koskematon).

**Scope-valkolista OSA B:** peaking-konfiguraatio + blokkiaktivointi + taper-viikon materialisaatio + kisapäiväohjelmointi (K7-6-kytkentä) + B8-syöttö-UI (kisapäivä/strategia/lajijärjestys) + B10-legibiliteetti. Wizard/-hakemistosta **vain** P3-peaking-lykkäyskirjaus + kisaviikon kisaliike-intensiteetti (repon oman γ-suunnitelman mukaisesti) — ei muuta wizard-muutosta. **EI** MULL-2 (`analyzeVolumeLandmarks`), EI MULL-3 (`forecastSetSustainability`), EI 8a-oppimista (`learnedAcrossSetFatigue`), EI H-016-paluuramppia (dormantti), EI D1-semantiikkaa, EI VBT-peruspolkua ei-γ-tiloissa.

**Test-riippuvuus-verifiointi (skill §6):** ennen scope-lukkoa Code varmistaa: (i) sisältävätkö pilot-fixtuurit duplikaatti-ID-tapauksia — jos OSA A:n heal muuttaisi pilot-baselinea, se on STOP-ratifioitava, ei hiljainen; (ii) kaataako γ-blokin lisäys olemassa olevia peaking-testejä (`recommendPeaking`/`computeAttemptLoads` on jo toteutettu — γ AKTIVOI, ei rakenna tyhjästä).

**STOP-ehdot (imperatiiveina, Selkäranka 5):** A1-juuri ≠ hypoteesi → STOP. Pilot-baseline muuttuisi OSA A:ssa → STOP. Invariant-violation ≠ 0 PRE-FLIGHTissa → STOP. Uusi designkysymys kesken kierroksen → STOP (§9.5). **EI pushia originiin ilman Akselin lupaa (Selkäranka 8) — vaikka kaikki vihreää.**

**ROADMAP-protokolla:** NYT-merkki siirretään vaiheeseen 20 **vasta OSA B:n sulkeutuessa**, committina. Samassa commitissa Code saa päivittää ROADMAP-headerin vanhentuneen tilannekuvan (nyt 2.6.2026 · 4.52.32 — todellisuus 4.56.0+).

---

## 4. Atletti-vastaukset (OSA B block-tuning — TÄYTETTY 2026-07-10, Akselin vahvistamat)

| Kysymys | Akselin vastaus |
| --- | --- |
| Kisalajit 22.8. | **Muscle-up + dippi + lisäpainoleuanveto. EI kyykkyä kisassa.** |
| Painonhallinta | **Ei painonpudotusta** — kehonpaino vakaa läpi taperin (BW-ankkuroitujen kuormien suhteellinen kuorma ei muutu tästä syystä) |
| Taperin kesto | **1 viikko** (evidenssi-ikkunan ≤2 vk sisällä; Travis-käytäntödata: 7–10 vrk yleisin voimanostajilla → linjassa) |
| Taper-muoto | Step (muoto on toissijainen ajuri — volyymipudotus + edeltävä ärsyke ensisijaiset) |
| γ-aloitus | **Ma 20.7.2026** — 5 vk kisaan (4 vk työ + 1 vk taper); viikko 13.–19.7. ajetaan nykyblokin mukaan |
| D1 kisan yli | **Vain alaspäin kisan yli** — ei semantiikkamuutosta γ:ssa eikä kisassa |

OSA A: Ei sovellu (debug).

---

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Päätetty (älä re-litigoi):**
- **Reunaehto (a) -ohitus RATIFIOITU (Akseli 10.7., Coden PRE-FLIGHT-poikkeaman 2 ratkaisu):** γ saa alkaa **JOS invariant-violation-tarkistus = 0 laajennetussa kanavajoukossa** (turvallisuusehto pidetään). Vaihe 18 (Round B-β HRV-bias) + K-β-loppu **lykätään eksplisiittisesti kisan 22.8. yli** — ne ovat parannuksia, eivät turvaedellytyksiä. Kirjataan ROADMAP-committiin OSA B:n sulkeutuessa. Jos violaatioita > 0 → STOP, ei ohitusta.
- **Merge-suunta RATIFIOITU (Akseli 10.7.):** aktiivisen ohjelman viittaama ID voittaa; fallback eniten-historiaa (ks. A2).
- **Kenttähavainto 10.7.:** Liikkeet-välilehdellä näkyy **vain yksi Jalkaprässi** → näkyvä-duplikaatti-hypoteesi EI vahvistunut; A1-tarkennus velvoittaa mekanismin demonstroinnin sweep-datalla (ks. OSA A).
- **MULL-2 (volyymivalvonta) + MULL-3 (within-session-ennakointi) on JO TOTEUTETTU** (4.55.0/4.56.0, pushattu 6.7.) — tämä handoff EI duplikoi niitä. Kenttäverifiointi puhelimella on erillinen rinnakkainen raide (ei Code-työtä).
- Batch-muoto P-013 M1:n mukaan (2 osaa, omat rubriikit, STOP-gate välissä) — Akselin valinta 10.7. ("γ-peaking + OBS-044 batch").
- OSA A ennen OSA B:tä: peaking rakennetaan puhtaan historian päälle.
- Taper-parametrit R1-evidenssipohjasta (OSA 1, ratifioitu ankkureineen): volyymi −40…−60 %, intensiteetti + frekvenssi säilyvät, viimeinen raskas ~3–4 vrk. VBT taperissa = readiness-/väsymystrendin seuranta, **EI** "peaking onnistui" -mittari (ekstrapolaatio — merkitty R1:ssä).
- Kehonpainon rooli taper-kuormassa on aito tutkimusaukko (R1) → ei spekulatiivista BW-manipulaatiologiikkaa; BW vakaa (§4).

**Hylätyt vaihtoehdot:**
- ~~H-019/H-020 volyymivalvonta + within-session -draftit~~ — duplikaatteja, MULL-2/3 kattaa (repo-verifioitu 5ad3d37).
- ~~2 vk taper~~ — Akseli valitsi 1 vk (evidenssin sisällä).
- ~~γ-aloitus 13.7.~~ — Akseli valitsi 20.7. (nykyblokille viikko lisää).
- ~~D1-avaus ylöspäin γ:n alussa~~ — kaksi muuttujaa päällekkäin peaking-ikkunassa = riski; arvioidaan kisan jälkeen.
- ~~Kyykyn kisaliike-taper~~ — kyykky ei ole kisassa (§4).
- ~~Ala-/yläraaja viimeisen raskaan erottelu~~ — tarpeeton (kaikki kisaliikkeet ylävartaloa) JA oli R1:n heikoin evidenssikohta.
- ~~#14 add-anywhere tähän batchiin~~ — kolmas scope samaan ajoon rikkoisi M1-rajan (max 2); jää seuraavaan.

---

## 6. Avoimet kysymykset (Code kysyy ENNEN toteutusta — ei arvata)

1. **Jalkaprässin todellinen ID-mekanismi:** kenttähavainto (vain 1 näkyvä) kumosi näkyvä-duplikaatti-hypoteesin → A1-sweepin on demonstroitava todellinen ketju (piilotettu tietue? poistettu/muuttunut ID? phase-variant-instanssi?) ennen A2:ta.
2. **Kisapäivän lajijärjestys + yritysmäärä/laji** (federaation formaatti) → Akseli syöttää B8-UI:n kautta; jos UI-toteutus tarvitsee arvot aiemmin → kysy.
3. **MU-yrityskuormien ankkuri:** MU on Taso 3 (ei sys-1RM). Tukeeko `computeAttemptLoads` Taso 3 -liikettä, vai tarvitaanko manuaalinen avauskuorma-syöte Akselilta? Code selvittää koodista ja esittää vaihtoehdot STOP-gatessa.
4. **Invariant-violation-tarkistuksen tulos** laajennetussa kanavajoukossa (reunaehto (a) -ohituksen ehto, §5) — raportoidaan ennen OSA B:n aloitusta; > 0 → STOP.
5. **Taper-viikon sessiomäärä:** frekvenssi säilytetään — vahvista nykyinen kisaliikkeiden viikkofrekvenssi ohjelmatilasta (Code lukee; jos epäselvä → kysy).

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | — |
| Muuttuneet tiedostot | — |
| Tehdyt päätökset | — |
| Validointi | — |
| Jäi auki | — |
| Seuraava askel | — |
