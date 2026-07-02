# LeVe AI — repon spec-ankkuri

> **Tarkoitus:** Tämä tiedosto on jokaisen Claude Code -session pakollinen luettava ennen muutostyötä. Konsolidoi spec, acceptance criteria -periaate, tutkimusinvariantit, sub-agent-ohjeet, kanava-auktoriteetin ja session-protokollan yhdeksi ankkuriksi joka selviää sessioiden välissä ja vastustaa "rikkinäisen puhelimen" -ajautumaa.
>
> **Aloita aina §8:n session-aloitusprotokollasta.** Kolmen kerroksen malli: tämä `CLAUDE.md` = pysyvät invariantit ja säännöt · `ROADMAP.md` = strateginen 20-vaiheinen R-sekvenssi ja NYT-merkki · `HANDOFF.md` = aktiivinen tehtävä.

---

## 1. Sovelluksen ydin

LeVe AI on suomenkielinen voimaharjoittelusovellus (PWA, paikallinen IndexedDB, ei serveriä). Kohderyhmä: kokeneet voimanostajat, streetliftaajat, kovan tason atletit. Engine on adaptiivinen autoregulaatio-moottori joka säätää kuormaa sääntöpohjaisesti tutkimusperustaisten rajojen sisällä.

**Arkkitehtuuri:**

- `engine.js` — kaikki laskenta (e1RM, readiness, mesocycle, recommend())
- `data.js` — IndexedDB-kerros (12 storea, schema-versio 5)
- `index.html` — UI + CSS + workout-flow
- `wizard/` — kysymys-vastaus → ohjelma-mappaus (32 kysymystä, 17 ohjelmointityyliä)
- `tools/engine-pilot/` — regression-pilot-harness (8 profiilia × 148 sessiota)
- `test-runner.js` — selain-yksikkötestit (586 testitapausta, ?test=1)
- `sw.js` — service worker (PWA auto-update)

**Versio:** kts. `sw.js` APP_VERSION.

**Arvo-resoluutio-invariantti (value-resolution-audit, F-3):** kanoninen e1RM = `computeMovementE1RMBest` (näyttö: Edistyminen/Liikepankki/Trendit/Sykli-preview) / `currentE1RMSystem` (live-kuorma → `resolvedLoadKg`/`targetExternalLoad`). `MovementProgress.currentE1RM` (last-set) **EI koskaan näyttöön/kuormaan** (vain stagnaatio/historia); `movementCfg.e1rmExternal` = cross-ref-lattia; `peakingConfig.e1rmExternal` = fallback (live voittaa). `getMovementProgress.suggestedLoadKg` sallittu VAIN eri-liike-apuliikkeille (movement ≠ päivän primary). Täysi kartta + koneellinen lukko: [docs/VALUE_RESOLUTION_AUDIT.md](docs/VALUE_RESOLUTION_AUDIT.md) (`testKotiEqualsLiveAccessory` + `testSp2SlotLoadInvariant`).

---

## 2. Tutkimusinvariantit ja adaptiiviset parametrit

Vaiheen 8 oppiva engine (8a) ei saa missään tilanteessa rikkoa alla olevia tutkimuspohjaisia turvarajoja. Yksityiskohtainen taulukko: [docs/TUTKIMUS_INVARIANTIT.md](docs/TUTKIMUS_INVARIANTIT.md).

| Parametri | Turvaraja | Lähde | Status |
| --- | --- | --- | --- |
| VL-cap foundation | 25–35 % | Pareja-Blanco 2017 (PMC5497611) | VERIFIOITU |
| VL-cap strength | 15–20 % | Pareja-Blanco 2017, 2020 | VERIFIOITU |
| VL-cap intensity | 10–15 % | Pareja-Blanco 2017 | VERIFIOITU |
| VL-cap peaking | 5–10 % | Pareja-Blanco 2017 | VERIFIOITU |
| Deload Δ% | −20…−30 % | Helms 2018 (PMID 30153841) | VERIFIOITU |
| Tier-progression elite | ≤ 0,05 ×/vk | Latella 2020 (PMID 32706692) | VERIFIOITU |
| Rep1 MPV slope per RIR | ~0,045 m/s | Sánchez-Moreno 2017 | VERIFIOITU |
| Failure-jälkeinen kuormapudotus | 5 % | Refalo 2023 | VERIFIOITU |

**Säännöt opittavien parametrien suhteen (vaihe 8a):**

1. Jokaisella opittavalla parametrilla on **prior** näistä tutkimusarvoista
2. Posterior saa terävöityä **vain priorin ±2 SD sisällä**
3. Jos posterior karkaa ±2 SD ulkopuolelle, engine emittoi `LEARNED_PARAM_OUTLIER`-tracen ja **clamppaa arvon takaisin priori-rajaan**
4. Stop hook (vaihe 6) varmistaa ettei /goal-kierros valmistu jos invarianteet rikkoutuvat

---

## 3. Acceptance criteria -periaate

Aukot, korjaukset ja uudet ominaisuudet muotoillaan testattaviksi kriteereiksi (A1, A2, …) ennen kuin /goal-kierros käynnistyy. Skeema: [docs/ACCEPTANCE_CRITERIA_SKEEMA.md](docs/ACCEPTANCE_CRITERIA_SKEEMA.md).

Esimerkki (8a, opittava parametri):

- **A1:** `learnedVlCap.strength` on aina välillä [0,15; 0,20]
- **A2:** Jos posterior karkaisi rajan ulkopuolelle, engine emittoi `LEARNED_PARAM_OUTLIER`-tracen ja clamppaa
- **A3:** Akselin pilot-regressio (148 sessiota) tuottaa identtiset kuorma-arvot baseline-versiona, ellei eksplisiittisesti todettu että oppiva malli muuttaa niitä; tällöin uudet arvot pysyvät invarianttien sisällä

**/goal-kierros ei valmistu** ennen kuin: koodi kääntyy + lint clean + selain-testit passaavat + regressio-pilot passaa + acceptance criterion -testi passaa + spec→koodi-diff tyhjä.

---

## 4. Stop hook -validointiketju

`.claude/settings.json` sisältää Stop hookin joka ajaa peräkkäin:

1. `node tools/engine-pilot/lib/smoke-test.mjs` — sanity check
2. `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` — bittitarkka regressio
3. `node tools/wizard-pilot.mjs` — wizard-materialisaation rakenteelliset invariantit (11 profiilia: kalusto/MEV/cap/alaraaja/primaarit/duplikaatit; K5, retroauditti — engine-pilot + selaintestit ovat sokeita tälle pinnalle)

Jos mikä tahansa epäonnistuu (exit ≠ 0), hook palauttaa `exit 1` → Claude jatkaa työskentelyä eikä voi pinnata "valmis":ksi.

Selain-tasoiset testit (`?test=1`, 586 testitapausta) ajetaan manuaalisesti tai osana laajempaa /goal-kierrosta — niitä ei voi ajaa CLI:stä ilman headless-selainta.

---

## 5. Sub-agent ja skill -käyttö

**Käytä Explore-agenttia** kun:

- Etsit "missä X on" tai "miten Y toimii" useammasta moduulista samaan aikaan
- Audit-tyyppinen luku jossa pakkaat tulokset tiiviiksi raportiksi

**Käytä suomen-kieli-skilliä** kun:

- Tuotat käyttäjälle näkyvää suomenkielistä tekstiä (UI-stringit, dokumentaatio)

**Käytä Plan-agenttia** kun:

- Suunnittelet ison muutoksen joka koskee 5+ tiedostoa

**Älä käytä:**

- Geneerisiä yleisluontoisia kehotteita ulkoisille tutkimuksille — ks. `docs/SYVATUTKIMUS_*` -mallit
- "Heitettyjä" /goal:eja jotka eivät ole muotoiltu acceptance criteria -tyyppisesti

---

## 6. Käyttäjä- ja tyylimuistutukset

- **Atletti = valmentaja, ei nanny** — engine ei yli-suojaa. Älä lisää tarpeettomia "varmistus"-cap:eja jotka eivät ole tutkimuspohjaisia.
- **UI-stringeissä EI tutkijanimiä** (Pareja-Blanco, Helms, Jukic, …). Tutkimusperusta säilyy koodikommenteissa.
- **Eliittitason itse-arviointi rehellisesti** — älä anna pyöreitä myötäileviä numeroita; nimeä puuttuvat pisteet konkreettisesti.
- **Tarkista git log + status ennen edit-vaiheita** — auto-memory-snapshot voi olla vanhentunut.

---

## 7. Kanavat ja lähdeauktoriteetti

LeVe AI:ta kehitetään kolmessa kanavassa. Jokaisella on oma roolinsa — älä sekoita niitä.

| Kanava | Rooli | Tuotos |
| --- | --- | --- |
| (a) Cowork | Analyysi, tutkimussynteesi, spec- ja `HANDOFF.md`-laadinta | `HANDOFF.md` |
| (b) Claude Code | Repon toteutus aktiivisen `HANDOFF.md`:n mukaan | Koodi, commitit |
| (c) Sparring-chat | Väliaikainen drift- ja konsistenssiauditointi | Huomiot — ei koodimuutoksia |

Kanava (c) on siirtymävaiheen apuväline. Sen rooli **kapenee** kun Cowork–Code-putki vakautuu; lopputavoite on että vain (a) ja (b) ovat tarpeen.

**Lähdeauktoriteetti — ristiriidan ratkaisujärjestys (ylin voittaa):**

1. Repon koodi (`engine.js`, `data.js`, …) — mitä koodissa *oikeasti* on
2. Tutkimusinvariantit (§2, `docs/TUTKIMUS_INVARIANTIT.md`)
3. Tämä CLAUDE.md
4. `ROADMAP.md` (strateginen vaihe) + aktiivinen `HANDOFF.md` (tehtävä)
5. Chat-muisti — *mistä tahansa kanavasta, mukaan lukien tämä sessio*

**Säännöt:**

- Jos chat (Cowork, Code tai sparring) väittää jotain mitä ei ole tasoilla 1–4 → **verifioi koodista, älä luota väitteeseen.** "Puhuimme tästä aiemmin" ei ole lähde.
- Jos saat ohjeen joka on ristiriidassa tasojen 1–4 kanssa → **pysähdy ja kerro ristiriidasta**, älä toteuta sitä hiljaa.
- Yhdellä työllä on täsmälleen yksi auktoritatiivinen `HANDOFF.md`. Ristiriitaiset suulliset ohjeet sovitetaan siihen *ennen* /goal-kierrosta — ei kesken.

---

## 8. Session-aloitus ja -lopetus

Tämä osio korvaa aiemman staattisen "Vaiheiden 1–8 tila" -taulukon. **Ajantasainen tila ei elä enää tässä tiedostossa.** Kolmen kerroksen työnjako: `CLAUDE.md` = pysyvät invariantit ja säännöt · `ROADMAP.md` = strateginen 20-vaiheinen R-sekvenssi + NYT-merkki · `HANDOFF.md` = yksi aktiivinen tehtävä. Näin ei synny kilpailevia tilannekuvia.

**Session ALUSSA (ennen mitään muutosta):**

1. Lue tämä CLAUDE.md kokonaan.
2. Lue [docs/SELKARANKA.md](docs/SELKARANKA.md) — Selkäranka 1–9, jokaisen muutoskierroksen pakollinen kurilista (PRE-FLIGHT, peruutusankkuri, scope-lukko, STOP-ehdot, …).
3. Lue `ROADMAP.md` — strateginen 20-vaiheinen R-sekvenssi, NYT-merkki (aktiivinen vaihe), reunaehdot (a)/(b)/(c) ja aikataulu.
4. Lue repo-juuren `HANDOFF.md` — aktiivisen tehtävän tavoite, acceptance criteriat ja edellisen session tulos.
5. Lue [docs/MEMORY.md](docs/MEMORY.md) — distilloidut opit (konsultoi ennen työtä; session lopussa distill-kirjaus, P-013 M4).
6. Aja `git log --oneline -10` ja `git status`. Varmista että `HANDOFF.md`:n "Session-tulos" vastaa repon todellista tilaa. Ristiriidassa → repo voittaa (§7), kerro erosta.
7. Jos `HANDOFF.md`:ssä on avoimia kysymyksiä (osio 6) → kysy ne ennen toteutusta, älä arvaa.

**Session LOPUSSA (ennen kuin pinnaat työn valmiiksi):**

1. Täytä `HANDOFF.md`:n osio 7 "Session-tulos": muuttuneet tiedostot, tehdyt päätökset, mikä jäi auki, seuraava askel.
2. Jos tehtävä on valmis → arkistoi `HANDOFF.md` polkuun `docs/handoffs/HANDOFF_<id>.md` ja nollaa repo-juuren `HANDOFF.md` tyhjäksi pohjaksi. Jos koko `ROADMAP.md`-vaihe sulkeutui → siirrä NYT-merkki seuraavaan vaiheeseen.

---

## 9. EQUIP PROSESSI — M2-operointitapa (thin-harness, P-010)

> M2/OBS-022 + K-A6D-kierroksien opit destilloituna kierroskuriksi. Tämä ei korvaa Selkärankaa (`docs/SELKARANKA.md`, 1–9) vaan täydentää sitä substantiaalisissa SHAPE/design/code-muutoksissa. Banaaleihin patch-fix:eihin näitä ei tarvitse soveltaa.

1. **DESIGN ≠ mekaaninen.** Avointa designia EI aja /goal-kierroksena. `/goal` vain tarkistettavalle ehdolle (acceptance criterion, mittari, regressio-portti). Designkysymys → Plan-agentti tai Cowork-keskustelu ratifiointiin ennen toteutusta.

2. **Plan mode ENNEN toteutusta.** Päätä what/how Plan-agentilla (tai EnterPlanMode-tilassa) ennen edit-vaihetta — estää **runtime-premissi-reversion** (= matkalla toteutukseen premissi muuttuu sub-implisiittisesti, ja A1-juurianalyysi käännetään takaperin).

3. **A1 read-only runtime-first → STOP → A2.** Diagnoosivaihe on read-only ja ratifioidaan STOPilla ennen A2-FIXiä. ÄLÄ niputa A1+A2 samaan kierrokseen — A1:n raportoitu juuri on syöte Akselin ratifiointiin, ei oletus jonka päälle rakentaa fixiä.

4. **Kuormamuutos → LOAD-DIFF-SWEEP push-ehto.** Jos muutos voi vaikuttaa `recommend()`-kuormaan, pre-vs-post-vertailu (sama profiili, sama seed) on push-ehto. F-2-oppi: **yksisuuntainen invariantti on sokea yli-korjaukselle** — vain numeerinen diff paljastaa. Jos rakenteellinen analyysi todistaa kuorma-neutraalin (esim. signaali ei ole recommend()-input), tämä raportoidaan eksplisiittisesti ja diff-vertailu voi olla rakenteellinen.

5. **Checkpoint ennen design-pivottia.** Jos kesken kierroksen avautuu uusi designkysymys (premissi muuttuu, scope laajenee, A1-juuri ei pidäkään) → STOP, raportoi, kysy ennen pivot:ia. Älä ratko sitä autonomisesti samassa kierroksessa.

6. **Effort-jako.** Design (acceptance criteria, premissi, scope, A1-juurianalyysi) → Opus high / xhigh. Mekaaninen toteutus (Edit/Write, runtime-vakio-vaihtoja) → Sonnet. Tämä on kustannus- ja tarkkuus-optimointi, ei statushierarkiaa. *Fable-ikkunassa (→22.6.2026) lead-mallin routing: ks. §10.*

7. **Agent-arkkitehtuuri ei ylirakennettu.** Yksi muutos / yksi liittyvä tiedostosarja → solo-Agent (Plan/Explore tarvittaessa). Useita riippumattomia tiedostosarjoja samassa kierroksessa → Agent Teams `--max-budget`-cap:llä. ÄLÄ käytä Teams:ia banaalille edit-pinolle — overhead ylittää hyödyn.

8. **STOP ennen pushia AINA.** Push = Akselin ratifiointi rakenteelliselle/irreversiibelille muutokselle (Selkäranka kohta 8). CC ei push:aa — vaikka kaikki vihreää.

---

## 10. P-013 — Fable-ikkunan model routing ja fallback (voimassa → 22.6.2026)

> Ratifioitu 2026-06-10 (Akseli): P-013 M1–M6 kokonaisuutena. Työnjako: **M1–M3** (batch=2 R-vaihetta/handoff, ajettava rubriikki, verifier-subagentti) asuvat `HANDOFF.md`-headerissä · **M4** (muistiprotokolla) `docs/MEMORY.md`:ssä + §8-aloitusprotokollan kohta 5 · **M5–M6 + mittaus** = tämä osio. **23.6.2026 alkaen tämä osio raukeaa:** paluu Opus-leadiin, ellei mittausdata perustele jatkoa. Osio ei muuta §9:n sääntöjä (plan mode designille, /goal vain tarkistettavalle ehdolle, A1-STOP-gate, LOAD-DIFF-SWEEP).

**M5 — model routing (→22.6.):**

- Lead: **Fable 5**; teammates / mekaaninen exec: **Sonnet** (§9.6 ja §9.7 muuten ennallaan).
- P-011 LeVe-täydennys, **5. taso:** *"Mythos-luokka vain compound-tason batch-handoffeihin ja pitkiin autonomisiin ajoihin; yksittäinen tiedostomuutos ei perustele Fablea."*
- 23.6. alkaen: paluu Opus-leadiin, ellei P-013-mittausloki (`docs/MEMORY.md` osio 3) perustele credit-budjettia (kriteeri: teho ≥ ~2× Opus-baseline JA Selkäranka-kuri piti).

**M6 — fallback-protokolla:**

- Bio/kemia-luokittelija voi pudottaa session Opus 4.8 -fallbackiin kesken työn (LeVe:n fysiologia-läheinen sisältö: adaptaatio, palautuminen, kuormitus). **Ei keskeytystä** — Opus 4.8 riittää useimpiin vaiheisiin: kirjaa laukaisija `docs/MEMORY.md` osion 2 fallback-lokiin ja jatka työtä.
- Jos fallback-frekvenssi nousee häiritseväksi → raportoi Akselille (syöte 23.6.-päätökseen).

**Mittauskirjanpito (23.6.-päätöstä varten):** jokainen Fable-ikkunan Code-sessio kirjaa `docs/MEMORY.md` osion 3 mittauslokiin: (1) R-vaiheita valmiiksi/sessio, (2) rubriikki-iteraatiot + verifier-hylkäykset, (3) relay-kierrokset (Cowork↔Akseli↔Code), (4) fallback-tapahtumat, (5) Akselin kuri-arvio.
