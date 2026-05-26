# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.
>
> *Tila: H-005 AKTIIVINEN — Akseli ratifioi 2026-05-27. Käytäntö-kriittinen pikahandoff: Akseli astuu vk 5:een (strength-blokin alku) ja tarvitsee AI Block Tuning -paketin sovelluksesta, mutta nappi näkyy vain vk 4/8/12 deloadissa. Yhdistetään tähän sw-bump (4.52.5 → 4.52.6) joka oli unohtunut pohjapuhtaus-arc:sta, push a4f6eb9 (CLAUDE.md 473 → 586), sekä docs/backlog.md luonti sparring-keskustelun 6 OBS:n populaatiolla.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-005` |
| Tyyppi | `scope-expansion` (UI-aktivointi-ikkunan laajennus) + `refactor` (sw-bump) + `docs` (backlog-luonti). Päätyyppi `scope-expansion`. |
| Laadittu | 2026-05-27 / Cowork-sessio |
| Tila | `AKTIIVINEN` (ratifioitu 2026-05-27) |
| Recon-pohja | HEAD `a4f6eb9` jos B0-push tehty PRE-FLIGHTissä, tai `795662d` jos a4f6eb9 jo origin/main:issa. |
| Odotettu HEAD (PRE-FLIGHT seuraavalle sessiolle) | HEAD = tämä COMMIT 0 -SHA. Verifiointi: `git rev-parse HEAD` == `git log -1 --format=%H -- HANDOFF.md`. |
| Liittyy R-sekvenssin vaiheeseen | Ei kuulu yksittäiseen R-vaiheeseen. ROADMAP NYT-merkki = vaihe 17. Aux-tyyppinen UX-parannus + housekeeping. |

**Numerointi:** H-005 oli alun perin varattu velocity-dataketjulle. Se siirtyy H-006:ksi. Auto-memory päivittyy Cowork-session-close:ssa.

---

## 1. Tavoite

Avata AI Block Tuning -aktivointi-ikkuna deload-viikon (vk 4/8/12) lisäksi seuraavan blokin 1–2 ensimmäiselle viikolle (vk 5–6, 9–10, 13–14), jotta paketti voidaan generoida edellisen blokin analyysiin myös uuden blokin alussa kun deload on jo mennyt ohi. Lisäksi: APP_VERSION-bump `4.52.5` → `4.52.6` jolloin puhelimen Service Worker näkee päivityksen ja saa update-bannerin (pohjapuhtaus-arc:n koodi pääsee käyttäjälle). Lisäksi: luo `docs/backlog.md` repon havaintojen kerääntymispaikaksi, jonne kirjataan treenissä havaitut sovelluksen bugit ja UX-puutteet jotka EIVÄT kuulu aktiiviseen handoff-toimeksiantoon. Populoi sparring-keskustelun 6 OBS:ää (OBS-001…OBS-006) alkutilana.

## 2. Acceptance criteria

> Tyyppi `scope-expansion`. A1+A2 toteuttavat UI-muutoksen, A3 toteuttaa sw-bumpin, A6 toteuttaa backlog-luonnin, A0 + A4 + A5 vahvistavat ettei runtime-käytös muutu. Rivinumerot suuntaa-antavia HEAD `a4f6eb9`-hetkeltä; Code paikantaa grep:llä.

**A0 — Engine-laskenta bittitarkasti muuttumaton**
- Ehto: `recommend()` ja kaikki kuorma-/Vx-/rep-laskennat pysyvät ennallaan. Vain UI-aktivointi-ehto ja `generateBlockTuningPackage()`:n early-return -viesti muuttuvat.
- Mitattu miten: Stop hook (smoke + pilot). Per-commit-rytmi.
- Onnistumisen ehto: 64/64 päivää, 0 virhettä, 136 audit-flagia per commit.

**A1 — engine.js: `generateBlockTuningPackage()` aktivointi-ikkuna laajennettu**
- Ehto: engine.js r. ~6438–6441 logiikka muuttuu: deload-viikon LISÄKSI sallitaan vk 5–6, 9–10, 13–14. Kun ei-sallitussa viikossa (esim. vk 1–3, 7, 11, 15–16), funktio palauttaa selittävä error-objekti.
- Toteutus-suositus: Käytä `BLOCK_TUNING_WINDOWS`-vakiota engine.js:n alkuun (esim. `[[4,5,6],[8,9,10],[12,13,14]]`) ja lookup-logiikkaa. Yksittäinen `wk`-kuuluu-ikkunaan-tarkistus + perustelu mihin blokkiin viittaa (prevBlock-mappaus toimii kaikille saman ikkunan viikoille — eli wk=5 → prevBlock="Foundation", sama kuin wk=4).
- Mitattu miten: manuaalinen JSON-tarkistus: kutsut wk=4 → success, wk=5 → success, wk=6 → success, wk=7 → error, wk=8 → success, jne.
- Onnistumisen ehto: aktivointi-ikkuna toimii kaikilla 9 sallitulla viikolla (4,5,6,8,9,10,12,13,14); 7 ei-sallittua (1,2,3,7,11,15,16) palauttavat selkeän error-viestin.

**A2 — index.html: AI-Block-Tuning UI -kortti aktivointi-ehto laajennettu**
- Ehto: index.html r. ~10718–10771 alueella oleva `Vk ${wk} deload — AI-Block-Tuning aktiivinen` -kortti näkyy aktiivisena myös vk 5–6, 9–10, 13–14. Otsikko-teksti adaptiivinen: deload-viikolla `"Vk 4 deload — AI-Block-Tuning aktiivinen"`, ei-deload-viikolla `"Vk 5 (foundation→strength siirtymä) — AI-Block-Tuning aktiivinen"` tai vastaava blokin nimi.
- Toteutus-suositus: Käytä samaa `BLOCK_TUNING_WINDOWS`-vakiota tai vastaavaa helper-funktiota. Engine.js exporttaa, index.html importtaa.
- Mitattu miten: selain-vaihto-testi: Akseli vahvistaa manuaalisesti post-push että nappi näkyy vk 5:llä.
- Onnistumisen ehto: "🤖 Generoi AI-analyysipaketti" -nappi näkyy vk 4–6, 8–10, 12–14; muulloin info-teksti.

**A3 — sw.js APP_VERSION bump 4.52.5 → 4.52.6 + CACHE_NAME update**
- Ehto: sw.js r. ~731 `const APP_VERSION = "4.52.5";` → `const APP_VERSION = "4.52.6";`. CACHE_NAME viittaus vastaavasti. Lisää historiakommentti `// v4.52.5 oli aiempi APP_VERSION tässä kohdassa.`
- Mitattu miten: grep `APP_VERSION = "` palauttaa post-fix `"4.52.6"`. CACHE_NAME viittaus 4.52.6 muodossa.
- Onnistumisen ehto: puhelimen Service Worker näkee uuden version → update-banneri ilmestyy seuraavalla sovellus-avaamisella.

**A4 — Pilot-regressio bittitarkka (per-commit)**
- Ehto: pilot bittitarkka kaikkien B-commitien jälkeen.
- Mitattu miten: stop hook ajaa smoke + pilot per commit.
- Onnistumisen ehto: 64/64 päivää, 0 virhettä, 136 audit-flagia per commit.

**A5 — Playwright-headless regressio (post-arc)**
- Ehto: Playwright-headless ?test=1 -ajo H-005 sulun jälkeen tuottaa ≥584/586 passed, failed = {VBT, T9} (pre-existing).
- Mitattu miten: `node ~\leve-test-runner\run-headless.mjs <repo-root>` post-B4.
- Onnistumisen ehto: sama jakauma kuin pre-H-005-baseline.

**A6 — docs/backlog.md luotu + populoitu 6 OBS:llä**
- Ehto: tiedosto docs/backlog.md olemassa. Sisältö: prosessikuvaus + 6 OBS-merkintää sparring-keskustelusta. OBS-001 placeholder, OBS-002…OBS-006 täysmuotoisina.
- Mitattu miten: `ls docs/backlog.md`; `grep -c "^### OBS-" docs/backlog.md` = 6.
- Onnistumisen ehto: tiedosto olemassa, sisältö Cowork:n toimittaman B4-liitteen mukainen.

**Commit ↔ AC -kartta:**
- B0 (CLAUDE.md a4f6eb9 push) → ei uutta AC:ta
- COMMIT 0 (HANDOFF.md AKTIIVINEN) → ei AC:ta
- COMMIT B1 (engine.js aktivointi-ikkuna) → A1; A0 + A4 per-commit
- COMMIT B2 (index.html UI-aktivointi) → A2; A0 + A4 per-commit
- COMMIT B3 (sw.js APP_VERSION bump) → A3; A0 + A4 per-commit
- COMMIT B4 (docs/backlog.md luonti) → A6; A0 + A4 per-commit
- COMMIT sulku → ei AC:ta
- A5 (Playwright) ajetaan kerran B4:n jälkeen post-arc-vahvistuksena

## 3. Reunaehdot ja scope-aita

- Sovellettavat invariantit: ei §2-tutkimusinvariantteja.
- Mitä EI kosketa: `engine.recommend()` ja sen kutsuketju, data.js, audit-engine.mjs, trace-capture.mjs, test-runner.js, `generateGenericBlockTuningPackage`, H-004 LUONNOS v2.
- Tekniset reunaehdot: vanilla JavaScript, ei npm, ei build-stepiä. Stop hook -yhteensopiva.
- Diff-budjetti: netto ~30–50 riviä koko arc:n yli (B1 ~15, B2 ~10, B3 ~3, B4 ~uusi tiedosto ~150 riviä). Jos B1+B2+B3 ylittävät 30 netto-riviä → STOP.

## 3.5 Claude Code -operointi — H-005-konkretisointi Selkäranka 1–9:lle

**1. PRE-FLIGHT + STOP** — kuvattu Code-täsmäkehotteen alussa (per vaihe).

**2. PERUUTUSANKKURI:** `git branch backup-pre-h005-<HEAD-SHA>` (COMMIT 0 -vaiheen yhteydessä, säilyy koko arc:n).

**3. SCOPE-LUKKO** — H-005:n valkolista:
- `engine.js` — B1
- `index.html` — B2
- `sw.js` — B3
- `docs/backlog.md` — B4 (uusi tiedosto)
- `HANDOFF.md` — COMMIT 0 + sulku
- EI muita tiedostoja

**4. DIFF-CONTROL erillisinä committeina:**
- B0 push (ei commit), COMMIT 0, B1, B2, B3, B4, sulku-commit. Yhteensä 6 uutta committia.

**5. STOP-EHDOT:**
- Kaikki PRE-FLIGHT-STOPit voimassa.
- smoke FAIL tai pilot ≠ "64/64, 0 virhettä, 136 audit-flagia" → STOP.
- `git diff` koskettaa scope-aidan ulkopuolta → STOP.
- B1+B2+B3 diff-budjetti yli 30 netto-rivissä → STOP.

**6. MITTARI-ENSIN:**
- A1+A2 tunnetut positiiviset: testaa engine-puolen kutsu wk=5 → success, wk=7 → error.
- A3 tunnettu positiivinen: sw.js APP_VERSION:n muutos näkyy grep:llä.
- A6 tunnettu positiivinen: `grep -c "^### OBS-" docs/backlog.md` = 6.

**Per-commit-rytmi:**
1. Toteuta yksi B-commit scope-aidan sisällä.
2. smoke + pilot. Odotettu 64/64, 0 virhettä, 136 audit-flagia.
3. B-spesifinen grep-vahvistus.
4. STOP jos ≠. Kirjoita commit.
5. B4:n jälkeen: Playwright-headless A5.

**7. KEVYT LEDGER-RIVI:** commit-otsikot per B-vaihe (kuvataan kunkin VAIHE-kehotteen yhteydessä).

**8. EI PUSHIA ilman lupaa:** kaikki B-commitit valmistunut → push-raportti Akselille (VAIHE 6). Lopeta "PUSH OK?".

**9. LEDGER-IMMUTABILITEETTI:** sama kuin H-001–H-004.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**1. Aktivointi-ikkunan tarkka laajuus = vk 4–6, 8–10, 12–14 (Akselin ratifiointi 2026-05-27).** Akseli astuu vk 5:een. Vk 7 olisi jo liian myöhään.

**2. APP_VERSION 4.52.5 → 4.52.6 (minor bump).** Akselin ratifiointi. Major bump 4.53.0 hylätty.

**3. CLAUDE.md a4f6eb9 push pakataan H-005:n B0-vaiheeseen.** Akselin push-lupa annettu aiemmin sessiossa.

**4. Backlog-luonti pakattu H-005:n B4:ksi (Akselin ratifiointi 2026-05-27).** Sparring-keskustelu 2026-05-26 keräsi 6 OBS:ää.

**5. Cowork-havainto sparring-keskustelusta:** OBS-002+004+005+006 voivat juontaa yhteisestä rakenteellisesta juurisyystä (yksikkö-/referenssi-yhtenäisyys slot-resolverissa). Pohjapuhtaus-arc EI koskenut runtime-resolveria → bug todennäköisesti edelleen voimassa. Suunniteltu jatkohandoff H-007+ kirjattu backlogin "sparring-juurisyy-teesi"-osioon.

## 6. Avoimet kysymykset

- **K3:** OBS-001 (velocity-dataketju) tarkka sisältö. Sparring-keskustelu mainitsee ledgerissä, Cowork ei ole nähnyt detaljia. Akseli täydentää OBS-001-rivin docs/backlog.md:ssa Windows-natiivisti milloin tahansa.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | <pvm> |
| Muuttuneet tiedostot | <lista> |
| Tehdyt päätökset | <lista> |
| Validointi | <Stop hook · selain-testit · regressio-pilot · Playwright-headless> |
| Jäi auki | <lista tai "—"> |
| Seuraava askel | <lista> |
