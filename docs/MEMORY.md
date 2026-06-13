# MEMORY.md — Code-sessioiden opit ja mittausloki (P-013 M4)

> **Tarkoitus:** Kovalla työllä ostetut opit säilyvät sessioiden välissä rakenteellisesti, eivät muistinvaraisesti. Progressio per oppi: **fail → investigate → verify → distill → consult.**
>
> **Käyttöprotokolla (jokainen Code-sessio):**
> 1. **Session ALUSSA:** konsultoi tämä tiedosto (osa CLAUDE.md §8 -aloitusprotokollaa).
> 2. **Session AIKANA:** kirjaa epäonnistumiset + juurisyyt heti kun ne varmistuvat (investigate → verify).
> 3. **Session LOPUSSA:** tislaa opit yleisiksi säännöiksi (distill) — ei avoimiksi arvauksiksi. `HANDOFF.md` §7 (Session-tulos) **syöttää** distill-vaihetta, ei korvaa sitä: §7 = mitä tapahtui tässä tehtävässä; tämä tiedosto = mikä siitä yleistyy.
> 4. Kirjaa P-013-mittausrivit (osio 3) ja fallback-tapahtumat (osio 2) 23.6.2026-päätöstä varten.
>
> Auktoriteettijärjestys ennallaan (CLAUDE.md §7): repon koodi voittaa tämänkin tiedoston väitteet — opit ovat sääntöjä prosessille, eivät koodin tilannekuvia.

---

## 1. Distilloidut opit

### Oppi 1 — F-2-sweep: yksisuuntainen invariantti on sokea yli-korjaukselle
- **Fail:** F-2-clampin pct-laajennus yli-clamppasi top-singlet (81→71, 166,5→163, 90→79,5 kg) — invariantti "slot ≤ pää" täyttyi edelleen, joten mikään portti ei lauennut.
- **Juuri:** yksisuuntainen ehto (≤) hyväksyy mielivaltaisen ali-arvon; vain numeerinen pre-vs-post-diff paljastaa suunnan ja magnitudin.
- **Sääntö (consult):** kuormaan mahdollisesti vaikuttava muutos → **LOAD-DIFF-SWEEP on push-ehto** (CLAUDE.md §9.4). Clampit muotoillaan intensiteetti-tietoisiksi (designed-lighter vs heavier-by-design), ei sokeiksi.
- **Evidenssi:** F-2-kierros 2026-06-02, push 4.52.32 — sweep nappasi regression jonka invariantti ohitti.

### Oppi 2 — Runtime-first (H-008): staattinen hypoteesi on "oikea perhe, väärä mekanismi"
- **Fail:** H-008 (+82 kg -bugi) — staattinen koodiluku tuotti uskottavan mutta väärän mekanismin; oikea juuri löytyi vasta runtime-sweepillä.
- **Sääntö (consult):** runtime-riippuvaisessa bugissa A1 = **LAAJA runtime-sweep** (trace/pilot/synteettinen state), ei kapea hypoteesi-luku. Käytä Explore-/verifier-subagentteja rinnakkain. A1 on read-only ja STOPataan ennen A2:ta (CLAUDE.md §9.3).
- **Evidenssi:** H-008 2026-05-29; sama kuri toimi K-A6D:ssä (broad-sweep lokalisoinut juuren ennen fixiä).

### Oppi 3 — Value-resolution-audit-pattern: fragmentaatioluokka, ei whack-a-mole
- **Fail:** toistuvat yksittäisbugit (back-off > pää, Koti ≠ live, treeni näkyy tekemättömänä) olivat oireita samasta meta-juuresta: sama looginen arvo resolvoituu monessa sovittamattomassa polussa.
- **Sääntö (consult):** kun sama arvoluokka bugittaa toistuvasti → **enumeroi kaikki polut + UNIFY yhteen kanoniseen lähteeseen + assertoi** (testi/detektori), älä korjaa oiretta kerrallaan. Sovellettu: load (M1/F-1…F-4), velocity-stop (K-A6D), completion (F-5). Tunnista uudet fragmentaatiot tällä kehyksellä; rekisteri: `docs/VALUE_RESOLUTION_AUDIT.md`.
- **Evidenssi:** value-resolution-arc 2026-05-31 → 06-02, kaikki 5 fragmentaatiota kiinni.

### Oppi 4 — Älä yli-väitä: erota nyt-tila vs lopputila, verifioi gitistä
- **Fail:** chat-kanavien tilannekuvat ajautuvat ("rikkinäinen puhelin") — esim. relay-väite "3 commitia" vs git "2 commitia"; tuore sessio nappasi eron verifioimalla.
- **Sääntö (consult):** "puhuimme tästä" ei ole lähde. Jokainen sessio-aloitus: `git log` + `git status` ennen edit-vaihetta; dokumenttien väitteet verifioidaan repoa vasten (CLAUDE.md §7: repo voittaa). Älä julista eliittitasoa/valmista ennen kuin todistettu.
- **Evidenssi (tuore, 2026-06-10):** bootstrap-tilannekuva väitti F-5:n olevan "draft, odottaa toteutusta" — repo kertoi sen olevan **toteutettu ja push-ratifiointia vailla** (5 lokaalia committia). PRE-FLIGHT (`HEAD ≠ odotettu`) nappasi eron ennen kuin stale premissi ehti ohjata työtä. **Johdannaissääntö: dokumentoi "odottaa push-ratifiointia" -tila aina tilannekuviin** — lokaali-vs-origin-ero on näkymätön chat-muistille.

### Oppi 5 — Sovelluspuhe Akselille, koodi-detalji Code-relayssä
- **Sääntö (consult):** Akselille raportoidaan sovelluksen käyttäytymisen tasolla (mitä atletti näkee, mikä muuttuu treenissä); file:line-detalji kuuluu Code-kanavan sisäiseen työhön ja committeihin. UI-stringeissä ei tutkijanimiä (CLAUDE.md §6).
- **Evidenssi:** Akselin toistuva palaute treeni-auditeissa (mm. 2026-06-08 ohjelmointi-kysymykset).

### Oppi 6 — Ohjelmamuutos ilman PROGRAM_BUILD_VERSION-bumpia on kuollut kirjain (distill 2026-06-10)
- **Fail (melkein):** M2 A2b -ramppi (data.js weekPlan-muutos) oli valmis ja verifioitu, mutta `PROGRAM_BUILD_VERSION` (data.js:~28) jäi bumppaamatta → init()-auto-rebuild ei olisi lauennut → ramppi ei olisi koskaan aktivoitunut Akselin olemassa olevassa asennuksessa. **M3-verifier-subagentti nappasi tämän riippumattomassa tarkistuksessa** — toteuttava agentti (minä) ei huomannut.
- **Sääntö (consult):** jokainen `createStreetlifting16WMesocycle`-ohjelmasisällön muutos (slotit, reps/Vx, kuormat, liikkeet) → bumppaa `PROGRAM_BUILD_VERSION` SAMASSA commitissa + sw.js APP_VERSION erikseen (PWA-banneri). Checklist: data.js-ohjelmamuutos = 2 versiota.
- **Meta-evidenssi:** verifier > self-check (T-030) sai ensimmäisen kovan todisteen tässä repossa.

### Oppi 7 — Pilot-LOAD-DIFF-SWEEP mittaa systeemiä, ei vain parametria (distill 2026-06-10)
- **Havainto:** M2-rampin sweep näytti odottamattomia diffejä EI-muutetuilla viikoilla (vk5-dippi 19,5→0,5 kg; vk10 +27…50 kg). Juuri: pilot-simulaattori on polkuriippuva — muutettu preskriptio muuttaa simuloitua suoritusta → regain/rate-limit-ankkurit eroavat → ketjuvaikutus myöhempiin viikkoihin. PRE-tilassakin sama mekanismi suppressoi (38,5→19,5) — ei uusi regressio.
- **Sääntö (consult):** sweep-tulkinnassa erota (a) **suorat muutokset** muutetuilla riveillä (verrattava spec-taulukkoon täsmälleen) ja (b) **ketjuvaikutukset** muilla viikoilla (juurianalysoitava decision-traceista — `PROGRESSION_TARGET.why` + `regainRatio` kertovat ankkurin). Älä kuittaa "ketjuvaikutuksena" ilman trace-todistetta, älä myöskään tulkitse regressioksi ilman PRE-vertailua samasta mekanismista.

### Oppi 8 — UI-acceptance = käyttäjän polku end-to-end render-tasolla (ratifioitu 2026-06-10)
- **Fail:** H-015 §7b väitti A3/A4 valmiiksi handler-koodin olemassaolon + funktiotason testien perusteella; puhelinverifiointi paljasti ettei käyttäjä löydä/pääse polkuun ("Liike valmis" → ei näkyvää paluureittiä; skip-rivit ei-muokattavia; "Valmis — riittää" poisti sarjat). M3-verifier ei napannut — rubriikki oli staattinen kooditarkistus = rakenteellisesti sokea tälle virheluokalle (sama luokka kuin F-2-oppi).
- **Sääntö (consult):** UI-polkua muuttava handoff: **acceptance = käyttäjän polku end-to-end render-tasolla** — (1) DOM-klikit preview-selaimessa (`LeVe.pendingWorkout`-injektio + recovery-resume = toistettava harness; HUOM `workout.sessionId` pakollinen), (2) mobiiliviewport (390 px), (3) verifier AJAA saman polun itse (ei staattista rubriikkia), (4) löydettävyys arvioidaan eksplisiittisesti (näkyykö reitti ilman ohjetta?). **Handler-koodin olemassaolo ≠ polku käyttäjälle.**
- **Evidenssi:** confirm-kierros 2026-06-10 — reproduktio osoitti polkujen toimivan teknisesti mutta olevan löytymättömiä/aukkoisia; §7b-väite vs todellisuus -taulukko STOP-raportissa.

### Oppi 9 — Verifioi myös TAVOITTEEN MÄÄRITELMÄ ankkurista (ratifioitu 2026-06-10)
- **Fail:** 10.6. goal-drift — kompaktio/tilannekuvadokumentit romahduttivat "mullistava"-määritelmän muotoon "M1 ∧ M2", vaikka kanoninen muoto on **M1 ∧ M2 ∧ Kerros 3 (L3a/L3b/L3c) ∧ KAPSTONI (eliittiverdikti 3 pilarissa)** (master-auditplan v4 FINAL §7 + §13). Kerros 3 ja KAPSTONI putosivat sekvenssistä huomaamatta.
- **Sääntö (consult):** verifioi tavoitteen MÄÄRITELMÄ aina alkuperäisestä ankkurista (v4 FINAL §7/§13), ei tilannekuva-/bootstrap-dokumenteista — **kompaktio syö ensimmäisenä monikomponenttiset määritelmät (A ∧ B ∧ C ∧ D → A ∧ B).** Sama mekanismi kuin oppi 4:n tilannekuva-drift, mutta kohdistuu tavoitteeseen itseensä — vaarallisempi, koska työ suuntautuu väärin huomaamatta.
- **Evidenssi:** ROADMAP §1 kanoninen määritelmä + vaiheet 19b/21 palautettu sekvenssiin (commit 2026-06-10).

---

## 2. Fallback-loki (P-013 M6)

> Bio/kemia-luokittelija voi pudottaa Fable 5 -session Opus 4.8:aan. Protokolla: **ei keskeytystä** — kirjaa rivi, jatka työtä. Jos frekvenssi häiritsee, raportoi Akselille (syöte 23.6.-päätökseen).

| Pvm | Sessio/tehtävä | Laukaisija (sisältö) | Vaikutus työhön |
| --- | --- | --- | --- |
| 2026-06-13 | H-018 OSA 1 (OBS-040 e1RM-kortti) | **Akselin manuaalinen mallinvaihto Fable 5 → Opus 4.8** (EI bio/kemia-luokittelija — eksplisiittinen `/model claude-opus-4-8` + "ultracode"). Akseli kysyi kyvykkyydestä; vastaus: §10 M6 + P-011 5. taso → Opus 4.8 riittää (H-018 = debug+verifiointi, ei Mythos-luokka). | **Ei keskeytystä** (M6-henki). Työ jatkui Opus 4.8 -leadilla + monilinssinen verifiointi-workflow. Mittauspiste 23.6.: Opus 4.8 kantoi H-018 OSA 1:n. |

---

## 3. P-013-mittausloki (23.6.2026-päätöstä varten)

> Kirjataan jokaisesta Fable-ikkunan Code-sessiosta. Päätöskriteeri 23.6.: jos Fable-teho ≥ ~2× Opus-baseline JA Selkäranka-kuri piti → harkitaan budjetoitua jatkoa compound-handoffeihin; muuten paluu Opus-leadiin.

| Pvm | Sessio | R-vaiheita valmiiksi | Rubriikki-iteraatiot / verifier-hylkäykset | Relay-kierrokset (Cowork↔Akseli↔Code) | Fallbackit | Kuri piti? (Akseli) |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-10 | P-013-bootstrap (doc-only) + F-5-push-ratifiointi | 0 (doc-sessio; F-5-push suljetti edellisen session työn) | — (ei rubriikki-looppia, doc-only) | 2 (PRE-FLIGHT-STOP → ratifiointi → jatko) | 0 | *(Akseli täyttää)* |
| 2026-06-10 | M2 A2b batch=2 (Vaihe A velocity-kartta + Vaihe B Vx-ramppi) | 2 batch-vaihetta (M2-milestone, ei R-vaihe) | 1 iteraatio / 0 hylkäystä (verifier PASS + 2 huomautusta, joista 1 → korjaus ennen committia: PROGRAM_BUILD_VERSION) | 3 (gate: tuore backup → gate-vahvistus → Peaking-checkpoint) | 0 | *(Akseli täyttää)* |
| 2026-06-10 | H-015-sessio: M2-arkistointi + akuutti heti-ohje + handoff-siirto + VAIHE A -kartta | 1 batch-vaihe (VAIHE A; B gated) + akuutti tuki-deliverable | — / 0 hylkäystä (verifier KYLLÄ V1–V6 + 2 täsmennystä karttaan: breakAnalysis-granulariteetti, legacy-swap-persistenssi) | 1 (STOP-gate-raportti → Akselin VAIHE B -scope-päätös) | 0 | *(Akseli täyttää)* |
| 2026-06-10 | H-015 VAIHE B: korvausmekanismi + UX (C1–C6, gate-ratifioitu scope) | 1 batch-vaihe (VAIHE B valmis → H-015 kokonaan) | 1 iteraatio / 0 hylkäystä (verifier PASS V1–V6 + 2 huomautusta v2:een: korvatun slotin note-teksti, BW-dippi-tertiary-korvaus K1:n mukainen) | 2 (gate-ratifiointi → toteutus → STOP → push-ratifiointi; pushattu dc9b201 2026-06-10) | 0 | *(Akseli täyttää)* |

| 2026-06-10 | H-015 confirm + retro + ABC-korjauskierros (oppi 8 ratifioitu) | 1 korjausbatch (A+B+C; confirm-kierros read-only edellä) | 1 / 0 hylkäystä (verifier AJOI polut e2e: PASS P1–P4) | 2 (poikkeama-relay → STOP-raportti → ABC-ratifiointi+push-lupa) | 0 | *(Akseli täyttää — huom: confirm-poikkeama oli edellisen batchin acceptance-virhe, kirjattu oppi 8:aan)* |

| 2026-06-12 | H-016 batch=2 (VAIHE A confirm + VAIHE B paluuramppi-toteutus) | 2 batch-vaihetta (H-016-milestone) | 1 / 0 hylkäystä (VAIHE A -verifier Cowork-auditissa; VAIHE B -verifier VAHVISTETTU 17/17 + 2 kosmeettista huomautusta) | 2 (VAIHE A STOP-gate → ratifiointi → VAIHE B STOP push-portille) | 0 | *(Akseli täyttää)* |
| 2026-06-13 | **H-018 OSA 1 (OBS-040) — OPUS 4.8 -SESSIO** (ei Fable; manuaali-mallinvaihto) | OSA 1 valmis (kortti→kanoninen, §0-lukko, doc, versio) + OBS-040/041-confirm + OBS-042/043-backlog + H-016-ramppisimulaatio | rubriikki: lukkotesti 1 iteraatio (fixture-kynnys korjattu yli-väitöstä — 112,5→143 realistinen muoto); **monilinssinen verifiointi-workflow (5 adversariaali-agenttia)** | 4 (OBS-040-confirm → fix-narratiivi-korjaus tuoreesta backupista → ratifiointi → OSA 1) | **1 (tämä Opus-sessio)** | *(Akseli täyttää — Opus 4.8 -kyvykkyyden mittauspiste)* |

> **Arkistointi-TODO (H-015, puhelinverifioinnin jälkeen):** korjaa HANDOFF §7b:n commit-luku ("8 lokaalia committia f0e9c61..712678d" → oikein: f0e9c61..2ed2e3e pushattiin gate-ratifioinnissa, af5ed9c..dc9b201 push-ratifioinnissa) arkistointikommitin yhteydessä — Akselin ohje 2026-06-10.
