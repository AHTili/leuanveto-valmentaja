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

---

## 2. Fallback-loki (P-013 M6)

> Bio/kemia-luokittelija voi pudottaa Fable 5 -session Opus 4.8:aan. Protokolla: **ei keskeytystä** — kirjaa rivi, jatka työtä. Jos frekvenssi häiritsee, raportoi Akselille (syöte 23.6.-päätökseen).

| Pvm | Sessio/tehtävä | Laukaisija (sisältö) | Vaikutus työhön |
| --- | --- | --- | --- |
| — | — | — | — |

---

## 3. P-013-mittausloki (23.6.2026-päätöstä varten)

> Kirjataan jokaisesta Fable-ikkunan Code-sessiosta. Päätöskriteeri 23.6.: jos Fable-teho ≥ ~2× Opus-baseline JA Selkäranka-kuri piti → harkitaan budjetoitua jatkoa compound-handoffeihin; muuten paluu Opus-leadiin.

| Pvm | Sessio | R-vaiheita valmiiksi | Rubriikki-iteraatiot / verifier-hylkäykset | Relay-kierrokset (Cowork↔Akseli↔Code) | Fallbackit | Kuri piti? (Akseli) |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-10 | P-013-bootstrap (doc-only) + F-5-push-ratifiointi | 0 (doc-sessio; F-5-push suljetti edellisen session työn) | — (ei rubriikki-looppia, doc-only) | 2 (PRE-FLIGHT-STOP → ratifiointi → jatko) | 0 | *(Akseli täyttää)* |
