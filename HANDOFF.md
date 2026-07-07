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
> *Tila: **tyhjä pohja.** Rinnalla chat-ratifioituna (EI handoff-muotoisena): **Ohjelmointikone KORI 1–4 + known-fails-ratifiointi** valmis ja **pushattu 2026-07-04** (origin/main `17e19a8`, APP_VERSION 4.52.57, 20 committia): KORI 1+2 = 4.52.55 (E1–E5 + K2a/K2b/K2c), KORI 3+4 = 4.52.56 (K3-1 across-set-väsymysmalli + kestävyys-katto · K3-4 historia-tietoinen VAROVAINEN · K3-3 D1-v2 · K3-2 ykkös-re-ankkurointi · K4-1 viikkovolyymikortti · K4-2 cold-start-UX), known-fails = 4.52.57 (VBT-trio FIXTURE_DRIFT/todayISO-pinnaus · T9 TEST_STALE/K-A2-re-baseline · **S10 CODE_BUG**: PLAN_BASED-inversio migroitiin 1c978a9:n system-%-kontraktiin 4 lokuksessa jaetulla planBasedInvertE1RM-helperillä + uusi F-3-lukkotesti S10b). Selaintestit **854/854 täysvihreä** (ensimmäistä kertaa). LOAD-DIFF (S10): 10/64 pilot-päivää, e1RM-korjaus ylös → kuormat +0,5…+6,5 kg PLAN_BASED-kohdissa — raportoitu Akselille. A6 verifioitu puhelimella (la vk10 -treeni 4.52.57:llä). **Jatkokierrokset 2026-07-04 (→ 4.52.58):** (1) infra: headless-selaintestit Stop-hookin 4. portiksi (`tools/browser-test/`, riippuvuudeton CDP-ajuri, ~3 s, tuore profiili → SW-cache-immuuni); (2) **KORI 5** (Akselin la vk10 -havainnot + audit-triage, kaikki 7 ratifioitu): K5-1 apuliike-regression-lattia (`ACCESSORY_FLOOR_CAP`; hip thrust 59,5→62,5 -kenttäcase) · K5-2 ramppi-mikrokuormalattia (BW-variantti <10 kg lisäpainolla) · K5-3 SAFE=TARGET-dedupe · K5-4 label-kg-strippaus (honestifyLoadLabel) · K5-5 toteuma-layout pinotuksi · K5-6 stale K-A1-auditkanava eläkkeelle (diagnoosikorjaus: kattavuus oli jo K3-3:ssa) · K5-7 deload-day-kerroin (negatiivista basea ei laimenneta; deltat vk4/8/12 → −20…−25 %, Helms-lattia) — **pilotin audit-flagit 71→53, 🐛 14→0 (ensimmäistä kertaa), ⚠️ 6→2**; (3) **tietovault v1**: docs/vault/ 34 noottia + INDEX (8a-prior-taulukko 31 riviä = vaiheen 8a suora syöte; aukkoanalyysi 9 jäljellä, priorisoitu); (4) aikapommi-sweep puhdas (VBT-trio oli ainoa — breakAnalysis/recommend pinnattu, cal-ikkuna data-relatiivinen). **KORI 6 pushattu 2026-07-05** (`2d6a4da`, 4.52.59; Akselin la-vk10/su-treenihavainnot + luottamusinfra): K6-2 **PRESCRIPTION_SANITY-vahti** (peräkkäisten preskriptioiden >±10/15 % muutos vaatii selittävän säännön; deload-raja/blokkiraja/BW-kallio-system-vertailu rakenteellisina selittäjinä) · K6-2b **vahdin 1. saalis**: deload-sessiot eivät kelpaa progression ankkuriksi (post-deload-romahdus pilotissa vk9 primary 12,5→69 kg, vk9/pv2 kyykky 106,5→151 — LOAD-DIFF 8 päivää, yksiselitteisesti valmentajaoikea) · K6-3 **yksi e1RM-totuus** (loadType:"system" 14 BW-presettiin; Haara C loadType-first; Heavy negative -kenttäcase 69,5→77,5 + kortti 85,3→sys ~96; K5-1-lattia hyväksyy V1:n vapaa-Vx-slotilla) · K6-1 **perustelu-lohko jokaiseen kuormaan** (viime kerta → nyt + säännöt traceista, myös apuliikkeet) · K6-4 rehellinen badge (Progressio↑/Kalibrointi↓/Ylläpito→ todellisesta kuormasta) + double progression -vihje · K6-5 otsikkostrippaus ehdoton + Vaihda päivä -selkeytys (su-illan vk N/N+1 -ansa). Selaintestit **863/863**, pilotin audit **🐛 0** (myös uusi vahti). Hyväksymiskoe käynnissä: 2 vk — jokainen poikkeama selittyy napista, PRESCRIPTION_SANITY 🐛=0, mittarina Akselin manuaalikorjausten määrä/treeni (tavoite 0–1). **KORI 7 pushattu 2026-07-05** (`699d7f1`, **4.53.0 milestone** — valmentaja-linssin KAIKKI 7 aukkoa): K7-1 aamucheck-in 4. readiness-kanavana (Hooper/McLean; null→GREEN kiinni, laitteeton fallback) · K7-2 automaattinen deload-ehdotus (cross-movement väsymysaggregaatti, advisory) · K7-3 failure-syyn erottelu (voima/tekniikka/kipu/ote → eri reaktiot; kuorma ei putoa tekniikkafailuresta) · K7-4 MU-skill-syyt + regressio-drillit (MU on taitoliike) · K7-5 kipu-liikennevalo (lievä −10 % / kohtalainen korvaus+vaiva-tagi / kova stop) · K7-6 kisapäivän in-meet-yritysvalinta (computeNextAttempt: tulos päivittää päivän 1RM:n + seuraavan yrityksen; strategia varma/normaali/aggressiivinen) · K7-7 syklin loppuanalyysi → heikkousdiagnoosi + seuraavan blokin suositus (kisapäivä ≤8 vk → peaking) — ohjelmointi ei enää lopu 16 viikkoon. Selaintestit **886/886**, pilotti 🐛 0 bittitarkka. **VAIHE 8a V1 pushattu 2026-07-06** (`27f2a1e`, **4.53.1** — ENSIMMÄINEN OPITTAVA PARAMETRI, `learnedAcrossSetFatigue`): engine oppii atletin sarjasta-sarjaan-väsymyksen (havainto = mediaani (reps+Vx)-erotuksista SAMAKUORMAISILTA työsarjoilta; deload-sessiot pois; viimeiset ≤20 kelpaavaa sessiota; priori-shrinkage τ=5; clamp ±2 SD [0,25;0,75] + `LEARNED_PARAM_OUTLIER`) ja mitoittaa työsarjat *hänen* kestävyytensä mukaan (5×3@V2 e1RM 180: sustains 152,1 ↔ prior 150 ↔ fatigues 149 kg). **Ko-opittavuus-invariantti pidetty:** yksi `acrossSetRate` threaded preskriptioon (`acrossSetAllowance`) + estimointiin (`withinSessionFatigueCredits`) + re-ankkurointiin (`resolveTopSingleReanchor`). Oppii treenin päätöksessä (`settings.learnedParams`, `computeLearnedAcrossSetFatigue`/`updateLearnedParam`); **recommend() pysyy puhtaana lukuna → cold-start bittitarkka (LOAD-DIFF C0..C3 = 0/64 vs cc5deef).** Uudelleenkäytettävä `updateLearnedParam`-koneisto seuraaville 8a-parametreille. Legibiliteetti: 🧭-perustelu ("Sarjaväsymys opittu treeneistäsi… N treeniä, luottamus Z %") + Asetukset-näyttö + nollaus. 4 committia (C0 threading → C1 varasto → C2 oppiminen → C3 UI). Selaintestit **911/911**, Stop-hook 4/4 vihreä. **A6 puhelinverifiointi PENDING** (kenttädata kertyy tulevista treeneistä — arvo näkyy vasta kun jotain on opittu). **KORI 8 pushattu 2026-07-06** (`df15d3c`, **4.54.0** — progressio-monipuolisuus, huomio #6): engine kohteli jumitusta binäärisenä (progressio kuormalla TAI `checkStagnation` → vaihda liike); nyt tasanne-tilassa ("Ylläpito →" = kuorma ei nouse eikä laske) `suggestProgressionTool` ehdottaa oikean EI-kuorma-työkalun (toistot/sarjat/tiheys/tempo/mikrokuorma) valmentajan tikapuiden mukaan ENNEN liikkeen vaihtoa. Deterministinen advisory, EI opittava — **8a V2 (weekly-rate) lykättiin tietoisesti:** analyysi paljasti kompoundautuvan double-count-riskin `vxAdjustment`:in kanssa JA että #6 koski monipuolisuutta ei tahtia (STOP+kysy §9.5). recommend()-kuorma koskematon → **LOAD-DIFF 0/64 bittitarkka vs cc5deef** (koko sessio 8a+K8 load-neutraali). Selaintestit **921/921**, Stop-hook 4/4. 3 committia (C1 engine-ladder → C2 UI-pinta → C3 versio+docs). A8 puhelinverifiointi PENDING (jumittavalla liikkeellä näkyy työkalu 🧭-lohkossa). Jäljellä mullistavuus-tiekartalla: 8a V2 turva-asymmetrisesti (weekly-rate double-count ratkaistava, TAI `learnedFailureDropPct` puhtaampana seuraavana opittavana — Akseli grindaa failureen → rikas signaali) + γ-peaking-handoff (~11.7.) + vuosikello-laajennus (monta kisaa). **MULLISTAVA-KAARI (varaukseton eliitti) pushattu 2026-07-06:** asiantuntija-auditti (20 treenihuomiota + ohjelmoinnin lainalaisuus-kattavuus) → e1RM/kuorma-tauti parannettu, mutta 3 aukkoa erottaa "eliittikykyisen" "varauksettomasta eliitistä". **MULL-2 (`3269fbb`, 4.55.0): volyyminvalvonta (#8)** — `analyzeVolumeLandmarks` ⚠ ali-annostellut tavoite-synergistit (hauis leuanvedon EPÄSUORANA synergistina) + ▲ MRV-lähestyvät, Sykli-kortti. **MULL-3 (`3999a4c`, 4.56.0): within-session-ennakointi (#16)** — `forecastSetSustainability` ennustaa viimeisen sarjan varannon 8a-across-set-mallista → ⚠ kestävyys-varoitus + kestävä vaihtoehto (vähemmän sarjoja / kevyempi) ENNEN grindiä (reaktiivisesta ennakoivaan); UI-side, recommend() BYTE-IDENTTINEN (K3-1-kalibroitu plan-kuorma koodaa implisiittisen e1RM:n, ei echoa), K3-1 ei false-fire. Molemmat advisory → LOAD-DIFF 0/64. Selaintestit 936/936, Stop-hook 4/4. **Jäljellä varauksettomaan eliittiin: (a) #14 lisää-liike mielivaltaiseen kohtaan** (nyt 2 sijaintia same-category), **(b) OBS-044 DUPLIKAATTILIIKE-HEAL** (treeninaikainen huomio #1, koodivarmennettu: apuliikehistoria orpona movementId-mismatchilla — `computePriorSessionSummary`/`getMovementProgress` matchaavat täsmä-ID:llä, kanoninen e1RM eri ID:llä → "ensimmäinen kirjaus" + oletuskuorma 165,5 vaikka demonstroitu 185; = apuliike-"heikkenen viikko viikosta" -juuri; EI post-update-unohtamista). Puhelinverifioitavat kentällä: MULL-2/3 + #11 set-count + #13c Sat-MU.* Edellinen (**Wizard-materialisaatio, KAPSTONI pilari 3**) suljettu + arkistoitu + **pushattu 2026-07-01** (APP_VERSION 4.52.53, origin/main `4c3766d`, → docs/handoffs/HANDOFF_wizard-pilari-3.md): puhdas sokea portti 6/6 (P1–P6) + P7∧P8 = KYLLÄ; pilotti bittitarkka koko kaaren. Sitä edeltävä (**H-017 D1**, intra-session-autoregulaatio v1 alaspäin) suljettu + arkistoitu 2026-06-14 (→ docs/handoffs/HANDOFF_H-017.md); A6 puhelinverifioitu → **KAPSTONI pilari 1:n ensimmäinen elävä todiste**. Seuraava: **γ-peaking** (R1 OSA 1) ~11.7. erillisenä handoffina (sisältää P3/peaking-lykkäyksen + kisaviikon kisaliike-intensiteetin). Rinnalla parkissa: **H-016** (paluuramppi, toteutettu+dormantti, odottaa vk 25 dippipaluun live-porttia → arkistointi sen jälkeen, `git show 3bad610:HANDOFF.md`). Backlog: OBS-042 (apuliike-median), OBS-043 (lista-render-viive), OBS-044 (2 katalogi-duplikaattia + heal-migraatio), OBS-045/046/047 (H-017 D1 -latentit: cold-start-lattia / live-BW-floor / variant-swap-attribuutio).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `<H-0xx>` |
| Tyyppi | `<block-tuning \| debug \| scope-expansion \| refactor \| architecture>` |
| Laadittu | `<pvm>` / Cowork-sessio |
| Tila | `LUONNOS \| AKTIIVINEN \| VALMIS` |
| Pohja-HEAD | `<sha>` · APP_VERSION `<x.y.z>` |
| Liittyy R-sekvenssin vaiheeseen | `<ks. ROADMAP.md>` |

---

## 1. Tavoite

`<lopputila, ei ratkaisua>`

## 2. Acceptance criteria

`<A1, A2, … — koneellisesti tarkistettavina (P-013 M2); known-positive + known-negative; UI-poluille oppi 8 (e2e render-tasolla); kuormamuutos → LOAD-DIFF-SWEEP push-ehto>`

## 3. Reunaehdot ja scope-aita

`<invariantit · mitä EI kosketa (test-riippuvuus verifioitava) · valkolista · tekniset>`

## 4. Atletti-vastaukset critical questions -kysymyksiin

`<pakollinen block-tuning-tyypille ennen Code-suoritusta; muuten "Ei sovellu">`

## 5. Taustapäätökset ja hylätyt vaihtoehdot

`<lista>`

## 6. Avoimet kysymykset

`<lista tai "—">`

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook · selain-testit · pilot · LOAD-DIFF-SWEEP tarvittaessa · oppi 8 -e2e UI-poluille>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<seuraava handoff tai R-vaihe>` |
