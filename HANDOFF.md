# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`. Muisti: `docs/MEMORY.md` (konsultoi session alussa, distill lopussa).
>
> **P-013 batch-rakenne (M1–M3, ratifioitu 2026-06-10):**
> **M1 — batch-handoff.** Yksi handoff saa niputtaa **2 R-vaihetta** (skaalaus 4:ään vasta P-013-mittausdatalla). Jokaisella vaiheella **oma acceptance-rubriikki + oma scope-valkolista**; vaiheiden välissä **STOP-gate** (Code raportoi + bittitarkka pilot ajetaan ennen seuraavaa vaihetta). Per-löydös = oma commit säilyy ennallaan.
> **M2 — ajettava rubriikki.** Osion 2 A-kriteerit muotoillaan **koneellisesti tarkistettaviksi** (testi / skripti / mitattava ehto) ja ajetaan self-correction-looppina kunnes rubriikki täyttyy tai STOP-ehto laukeaa. Mittari-ensin (Selkäranka 6) säilyy: known-positive + known-negative ennen kuin kriteeriin luotetaan. Rubriikki-looppi **EI ohita** confirm-then-fix/A1-read-only-STOP-gatea (CLAUDE.md §9.3).
> **M3 — verifier-subagentti.** A-kriteerien täyttymisen verifioi **erillinen subagentti riippumattomassa kontekstissa** (ei toteuttava agentti itse) ennen STOP-raporttia. Verifierin hylkäykset kirjataan `docs/MEMORY.md`-mittauslokiin.
>
> *Tila: M2 (OBS-022) — `AKTIIVINEN`, **A2b-toteutusvaihe SEURAAVA** (gate purettu 2026-06-10: K-A6D shipattu 4.52.33 + F-5 shipattu 4.52.34 → sekvenssi a:n ehto täyttyi, origin/main = d52de7c). Edennyt: A1 (CONFIRM, read-only) + A1-lisäfasetti (velocity-autoreg) RAPORTOITU; SHAPE-only design ratifioitu (§5 päätös 4); A2a Vx-laskumuoto SIGN-OFF'ATTU (§4). A2b (FIX, data.js Vx-laskumuoto) käynnistyy Akselin ohjeesta omana sessiona (plan mode + LOAD-DIFF-SWEEP push-ehto, CLAUDE.md §9). A1-LISÄYS (Akseli 2026-06-03): A1b-velocity-luotettavuuskartta laajennetaan KAIKKIIN liikkeisiin A2b:n alussa (tangoliikkeet ml. kapea penkki = velocity-kandidaatit; dippi/koneet = rakenne+RPE). Code formalisoi ratifioidusta suunnasta — verifioitu repon koodista (§7: repo voittaa).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `M2` (OBS-022 — todellinen %-progressio / sisä-blokki-intensifikaatio) |
| Tyyppi | `block-tuning` (intra-blokki-progressiokäyrät) **confirm-then-fix-disipliinillä** (A1 read-only CONFIRM → STOP → Akselin §4-käyrävalidointi → A2 FIX). EI `debug` (ei toistettava bugi vaan suunniteltu käytösmuutos), EI `scope-expansion` (muuttaa olemassa olevan blokki-progression parametreja, ei lisää erillistä ominaisuutta). §4 pakollinen — täytetään A1c:n tuottamasta käyräenumeraatiosta ENNEN A2:ta. |
| Laadittu | 2026-06-02 / Cowork-sessio (DRAFT-COWORK ratifioitu) · Code formalisoi |
| Tila | `AKTIIVINEN` (A2b FIX -vaihe seuraava; A1 + SHAPE + A2a sign-off tehty) |
| Pohja-HEAD | `d52de7c` (= origin/main 2026-06-10; K-A6D + F-5 shipattu) · APP_VERSION `4.52.34`. *Alkuperäinen laatimispohja `3ed7226` / 4.52.32 — A1-havainnot verifioitava A2b:n alussa uutta pohjaa vasten.* |
| Liittyy R-sekvenssin vaiheeseen | Ei yksittäinen R-vaihe. NYT-merkki = vaihe 18 (Round B-β). M2 = milestone OBS-022 (todellinen %-progressio), ajetaan vaiheen 18 rinnalla. |

---

## 1. Tavoite

Saman liikkeen **TAVOITE-intensiteetti nousee (volyymi laskee) viikosta viikkoon SAMAN blokin sisällä** — suunnitellusti, **velocity-agnostisesti** (ei nojaa mitattuun nopeuteen; dippi/apuliikkeet eivät mittaa luotettavasti) ja **rehellisesti näytettynä**.

A1-orientaation (2026-06-02, read-only) toteama nykytila: intra-blokki on **litteä** — kanoninen %-lähde on `vRepsToExpectedPct(reps+Vx)` (LOAD_PCT_RESOLVED, tier 1/2/3), mutta `reps+Vx` ei muutu blokin sisällä → TAVOITE-% pysyy vakiona (esim. Intensity vk9–11 = 88,2 % flat, FINAL 71/71/71 kg). Templaatin `loadPct`-ramppi (esim. 0,85→0,87→0,90) on **dead code** (vReps ohittaa loadPct:n). `computeProgressionTarget` on blokki-vaihe-sokea (ankkuri-suhteellinen Helms-creep). Display: @X% stripattu tier 1/2/3:lta → ei näkyvää intensifikaatiota.

Haluttu lopputila (mekanismi §5, ratifioitu): intra-blokki-intensifikaatio on **SHAPE-only** — vain `reps+Vx` (→ `vReps`) ramppaa blokin sisällä; **ei lisätä velocity-kytkentää**. Olemassa oleva autoregulaatio (e1RM-ankkuri = VBT-promootio + primer-drift · regainMult/vxAdj · VBT-cap) toimittaa **anchor/magnitude/peak** automaattisesti per liike: luotettavilla liikkeillä (kyykky/leuanveto) absoluuttinen kuorma skaalautuu velocityyn, ei-VBT (dippi/apuliikkeet) jää rakenne+RPE-ankkuriin. `planTarget = currentE1RMSystem × vReps(reps+Vx)` — ramppi = velocity-agnostinen MUOTO, e1RM = velocity-ankkuroitu SKAALA. Ramppi näkyy käyttäjälle rehellisesti (b-display).

## 2. Acceptance criteria

> **A1 = CONFIRM (read-only, runtime-first — `docs/SELKARANKA.md` §5–6 + leve-handoff §5b). STOP ennen A2:ta.** A1a–A1d ovat yhden CONFIRM-gaten neljä faksettia (eivät itsenäisiä korjauksia → poikkeus skeeman A1/A2-sekvenssistä; perusteltu confirm-then-fix-rakenteella). A2–A5 = FIX vasta A1-vahvistuksen + Akselin §4-ratifioinnin jälkeen.

**A1a — velocity-agnostisuus (read-only).** Kanonisen %-polun (`vRepsToExpectedPct` / LOAD_PCT_RESOLVED) "Vx" on **preskriptio-descriptor** (staattinen `slot.targetVx`-haku), EI mitattuun nopeuteen kytketty.
- *Mitattu:* koodiluku `engine.js` LOAD_PCT_RESOLVED + `vRepsToExpectedPct` + runtime-trace (resolveSource).
- *Ehto:* `pctForResolve` johtuu `slot.reps + slot.targetVx`:stä (template-preskriptio), ei `measurements`/velocity-syötteestä → intra-blokki-kiipeäminen toteutettavissa ilman mittausta.

**A1b — per-liike VBT-trust (read-only).** Kartoita VBT-promootio/luottamus (`computeVBTPromotionStatus`, RTF r²-kynnys) per liike.
- *Ehto:* tunnistettu mitkä liikkeet ovat VBT-luotettavia (kyykky / lisäpainoleuanveto) vs ei (dippi / apuliikkeet → staattinen Epley-vReps). Vahvistaa että velocity-agnostinen ramppi on oikea valinta (ei nojata epäluotettavaan mittaukseen).

**A1c — nykykäyrät (read-only).** Enumeroi KAIKKI `data.js`:n nykyiset intra-blokki `loadPct`- (ja reps+Vx-) rampit per blokki-tyyppi (Foundation / Strength / Intensity / Peaking) × per liike.
- *Ehto:* täydellinen käyräkartta **§4-validointiin** (Akseli vahvistaa mitkä rampit oikein, mitkä korjataan). **ÄLÄ muuta käyriä A1:ssä.**

**A1d — yksi-lähteisyys (read-only).** Vahvista voidaanko intra-blokki-ramppi syöttää YHTEEN kanoniseen %-polkuun ilman kilpailevaa signaalia.
- *Ehto:* mekanismi (i) (reps+Vx-mikroporras → vReps) ei luo toista `loadPct ↔ vReps`-fragmentaatiota (F-2-luokan virhe vältetty).

**A2 — FIX: mekanismi (i)** (vasta A1-vahvistuksen + §4-käyrävalidoinnin jälkeen). Intra-blokki-intensifikaatio reps+Vx-mikroportaalla, syötettynä kanoniseen vReps-polkuun. Invarianttien (VL-cap, tier-progression) sisällä.

**A3 — kuormamuutos-portti (pakollinen, F-2-oppi).** Pre-vs-post **LOAD-DIFF-SWEEP** (korjattu HEAD vs pohja, koko Akseli-backup) = **push-ehto** (ei pelkkä invariantti). Lisäksi pilot 64/64 0 virhettä + uusi baseline ratifioituna + **known-pos** (intra-blokki-TAVOITE-% nousee vk-vk) / **known-neg** (deload + blokkiraja ennallaan).

**A4 — display (b).** Intra-blokki-intensifikaatio rehellisesti näkyvissä (otsikko/per-slot ≡ todellinen nouseva intensiteetti).

**A5 — Stop hook + selain.** smoke + pilot exit 0; selain-testit (`?test=1`) ennallaan (748/752 baseline; 4 pre-existing VBT/T9 ei M2:n scopessa).

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (`CLAUDE.md` §2):** VL-cap per blokki (Foundation 25–35 / Strength 15–20 / Intensity 10–15 / Peaking 5–10 %), Tier-progression elite ≤ 0,05 ×/vk (Latella 2020), Deload Δ% −20…−30 %, Rep1 MPV slope. Intra-blokki-intensiteettiramppi **pysyttävä näiden rajojen sisällä** — ei saa tuottaa tier-progressiota yli rajan eikä rikkoa VL-cappia.
- **Mitä EI kosketa (scope-aita, ratifioitu):**
  - **EI makro-periodisaatiota** (blokkien välinen rakenne, blokki-tyyppisekvenssi ennallaan).
  - **EI deload/regain-suppressiota** (`computeProgressionTarget` deload-passthrough + regain-multiplier ennallaan).
  - **EI slot-resolveria / sweep-invariantteja** (F-2:n same-liike-clamp Branch A/15c/Branch B + `auditSp2SlotLoad`/`testSp2SlotLoadInvariant`/`testKotiEqualsLiveAccessory` ennallaan).
  - **EI `computeProgressionTarget`-creep-logiikkaa** (ankkuri-Helms-creep on blokki-sokea by-design; M2 ei lisää sinne blokki-vaihe-termiä — mekanismi (i) toimii vReps-tasolla).
- **M2:n lokus:** `data.js` weekDefs (reps+Vx per viikko per blokki) + LOAD_PCT_RESOLVED (vReps-target) + display. Mekanismi (i) = reps+Vx-mikroporras.
- **Tekniset:** vanilla JS (`.js`/`.mjs`), ei npm-riippuvuuksia, ES-modulit, Stop-hook-yhteensopiva.

## 4. Atletti-vastaukset critical questions -kysymyksiin

> Pakollinen (`block-tuning`). **Code EI aloita A2b:tä ennen kuin tämä on täytetty.** §4 = templaatin per-blokki-INTENTTI ilmaistuna **Vx-laskumuotona** (kiinteä toisto + Vx laskee → `vReps` nousee), **EI staattisina kuormina**. Akselin sign-off A2a-dry-runin reps+Vx-trajektoreille per blokki (Foundation/Strength/Intensity/Peaking) = laatuportti. Huippuviikon valinta (kiinteä toisto V0 vs toiston pudotus) ratkaistaan per VL-cap.

**Sign-off'attu A2a-muoto (2026-06-02): per-blokki reps+Vx Vx-laskumuoto.** β-aloitus (nostettu start-Vx → kevyt vk1 = sisäänajo); reprodusoi templaatin loadPct-ramppi-intentin (+4–6pp vReps/blokki). VL-cap (CLAUDE.md §2) sanelee huippuviikon: Foundation/Peaking = Vx-lasku; **Strength/Intensity = toiston pudotus** (Vx→V0 rikkoisi VL-cappia). Pääliikkeet (leuanveto/kyykky/dippi) identtiset.

| Blokki | reps×Vx (loading vk1/2/3) | vReps-% | huippu-mekanismi |
| --- | --- | --- | --- |
| Foundation | 6V3 / 6V2 / 6V1 | 76,9 / 78,9 / 81,1 (+4,2pp) | Vx-lasku (V1) |
| Strength | 4V3 / 4V2 / **3V1** | 81,1 / 83,3 / 88,2 (+7,1pp) | toiston pudotus (4→3) |
| Intensity | 3V2 / 3V1 / **2V1** | 85,7 / 88,2 / 90,9 (+5,2pp) | toiston pudotus (3→2) |
| Peaking (singlet) | 1V3 / 1V2 / 1V1 | 88,2 / 90,9 / 93,8 (+5,6pp) | Vx-lasku (V1); V0=max-single vain testi/opener |

Deload-viikot (vk4/8/12/16) ENNALLAAN (scope-aita). **Per-liike realisoituminen:** kyykky/leuanveto = velocity-ankkuroitu e1RM × vReps (skaalautuu mittaukseen); dippi/apuliikkeet = staattinen e1RM × vReps (rakenne+RPE). VL-cap-↔-velocity-stop-rajapinta (K-A6D) tarkistettava A2b:ssä.

### 4b. A1-LISÄYS: velocity-luotettavuuskartta — VAIHE A TEHTY (2026-06-10, read-only; **päivitetty tuoreella backupilla samana päivänä**)

> Runtime-sweep: `computeRtfVelocityModel` (sama funktio jota recommend()/K-A6D käyttää, kynnys r² ≥ 0,85) ajettiin **kaikille** aktiivisen 16w-ohjelman + backup-historian liikkeille (45 kpl) Akselin **tuoretta** backupia vasten (export **2026-06-10T09:31**, schema 5, 402 settiä / 22 sessiota; kopioitu `.claude/backup-data.json`-polkuun, git-ignoroitu). *Ensimmäinen ajo tehtiin stalella 6.5.-backupilla (0 velocity-settiä) — tuore export osoitti että velocity-data tallentuu ja exporttautuu oikein: ei export-polun fragmentaatiota.*

**KERROS 1 — mittausdata (verifioitu tuoreesta backupista):** velocity-dataa on kertynyt **kolmelle liikkeelle**; kaikki RTF-mallit yhä **unreliable** (< 0,85) → VBT-kerros dormantti: velocityStop vaiennettu (K-A6D suppress), e1RM-ankkuri staattinen (cal/plan-based) kaikilla.

| Liike | velocity-settejä (mvReps) | kuormahaarukka | aikaväli | RTF r² (n) | status |
| --- | --- | --- | --- | --- | --- |
| Takakyykky | 17 vMean / 13 mvReps-settiä (53 rep-arvoa) | 112,5–160 kg | 12.5.–26.5. | **0,373** (43) | unreliable |
| Lisäpainoleuanveto | 12 / 10 (38) | 52,5–71 kg | 11.5.–31.5. | **0,075** (29) | unreliable |
| Lisäpainodippi | 3 / 3 (12) | 70 kg (yksi kuorma) | 15.5. | **0,326** (12) | unreliable |
| Kaikki muut (42) | 0 | — | — | no-data | no-data |

Kuormahaarukat kyykyllä/leualla ovat kohtuulliset → matala r² ei selity haarukalla vaan kohinalla (mittaus + Vx-arvio) ja datan määrällä. Primer-measurements: 1 kpl (H-006b-polku elää).

**KERROS 2 — rakenteellinen mittauskelpoisuus (Enode Pro: anturi tankoon/vyöhön + vertikaali ROM):**

| Luokka | Liikkeet (ohjelmassa) | A2b-käsittely |
| --- | --- | --- |
| **Velocity-kandidaatti: tanko** | Takakyykky (+ Paused/Pin squat -variantit; ainoat `isBarbell`-slotit), Penkkipunnerrus (acc), Pystypunnerrus (acc), Romanian DL (acc), *(Close-grip bench — EI nykyohjelmassa, vain huhtikuun historiassa)* | velocity-ankkuroitu e1RM × vReps **kun** RTF promotoituu; siihen asti staattinen |
| **Velocity-kandidaatti: vyö/BW-vertikaali** | Lisäpainoleuanveto (+ Vastaote, chest-to-bar -variantit) | sama kuin yllä (anturi vyöhön) |
| **Rakenne+RPE (kohinainen/ei-mitattava)** | Lisäpainodippi (forward-lean-ROM; atletti-realismi-päätös H-006b), Muscle-up (räjähtävä taito), koneet (jalkaprässi, leg curl, pushdown, face pull), DB/kaapeli-isolaatiot, core | staattinen e1RM × vReps pysyvästi |

**KERROS 3 — ristivahvistus:** Cowork-tilannekuvan sekundääriluvut (kyykky 0,37 · dippi 0,33 · leuanveto "0,01") täsmäävät nyt primääridataan (0,373 / 0,326 / 0,075) — sekundäärilähde osoittautui samaksi dataksi. Kerros 3 sulautui kerrokseen 1.

**Johtopäätös A2b:lle (vahvistaa HANDOFF §5.2 + §5.4 — data voitti, ennakko-odotus piti):**
1. **Mekanismi (i):n velocity-agnostisuus on oikea ja välttämätön:** yhdelläkään liikkeellä RTF ei ole luotettava (max r² 0,373 < 0,85) → preskriptiivinen reps+Vx-ramppi toimii kaikille heti; velocity-yksilöinti aktivoituu e1RM-ankkurin kautta automaattisesti kun mallit promotoituvat — **ilman A2b-koodin muutosta**.
2. **Per-liike-haaraa EI rakenneta** (§5.4 vahvistettu): VBT-vs-rakenne+RPE realisoituu e1RM-ankkurista ilmaiseksi.
3. **Velocity-keruu on jo käynnissä oikein** (export-polku ehjä): kyykky 13 mvReps-settiä, leuanveto 10, dippi 3. **Suositus:** jatka tangoliikkeistä (kyykky) + leuanveto vyöanturilla; dippi-mittaus vapaaehtoinen (rakenne+RPE-luokka, ei promotoidu). Mallit tarkentuvat datamäärällä — VBT-kerros herää itsestään jos/kun r² ≥ 0,85.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

1. **Mekanismi (i) ratifioitu (kirkastettu):** intra-blokki-intensifikaatio toteutetaan **reps+Vx-mikroportaalla** → `vReps(reps+Vx)` nousee blokin sisällä → TAVOITE-% nousee yhdestä kanonisesta lähteestä.
   - **Hylätty (ii):** loadPct takaisin intensiteettisignaaliksi vReps:n rinnalle → loisi `loadPct ↔ vReps`-kilpailun = F-2-luokan fragmentaatio. **Hylätty (iii):** blokki-vaihe-termi `computeProgressionTarget`:iin → sotkisi autoregulaatio-creepin ja periodisaation; rikkoo scope-aitaa (ei kosketa creep-logiikkaa).
2. **Velocity-agnostinen (kirkastettu):** intra-blokki-kiipeäminen on PRESKRIPTIO (staattinen reps+Vx-haku), EI mitattu nopeus. Perustelu: dippi + apuliikkeet eivät mittaa luotettavasti (A1b vahvistaa) — kiipeäminen ei saa nojata epäluotettavaan signaaliin. Within-session VBT-autoregulaatio (velocity-stop, Vx-bias) säilyy erillisenä kerroksena, M2:n ulkopuolella.
3. **Yksi-lähteisyys:** ramppi YHTEEN kanoniseen %-polkuun (vReps) — value-resolution-auditin (F-1…F-4) oppi: ei toista divergenttiä signaalia.
4. **SHAPE-only + autoreg ratsastaa (A1-lisäfasetti ratifioitu 2026-06-02):** mekanismi (i) ramppaa VAIN reps+Vx-MUODON (vReps-trajektori). **EI lisätä velocity-kytkentää** — olemassa oleva e1RM-ankkuriketju (cal→primer-drift→plan-based→VBT-cap→floor) + `computeProgressionTarget` regainMult/vxAdj **ratsastaa rampilla** ja toimittaa anchor/magnitude/peak. `planTarget = currentE1RMSystem × vReps(reps+Vx)`: ramppi = velocity-agnostinen MUOTO (toimii myös dipille), e1RM = velocity-ankkuroitu SKAALA luotettavilla liikkeillä. **Per-liike VBT-vs-rakenne+RPE tulee e1RM-ankkurista ilmaiseksi** — ei eksplisiittistä per-liike-haaraa M2:ssa. VL-cap (CLAUDE.md §2) rajoittaa Vx-laskun syvyyttä per blokki → korkeissa blokeissa (Intensity, Vx jo V1) intensifikaatio = toiston pudotus, ei Vx→V0 (rikkoisi VL-cappia).

## 6. Avoimet kysymykset

> Code raportoi A1a–A1d:n tulokset (VAIHE 1). Akseli ratifioi ENNEN A2:ta.

- **Q1:** A1a–A1d:n löydökset (Code raportoi A1-vaiheessa) — vahvistavatko mekanismi (i):n + velocity-agnostisuuden toteutettavuuden?
- **Q2 (A1c:n jälkeen):** §4-käyrävalidointi — mitkä nykyiset intra-blokki-rampit ovat oikein, mitkä korjataan?

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot · LOAD-DIFF-SWEEP>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<seuraava handoff tai R-sekvenssin vaihe>` |
