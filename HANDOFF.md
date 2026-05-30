# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-30 Code:n Probe B -löydöksestä (read-only, vahvistettu datasta). A1 (juurisyy) jo vahvistettu read-onlyssa → A2 on suora korjaus. Lukupää-fix, save-polku koskematon.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `OBS-026-FIX` (Sykli "Tämä viikko" — logattu treeni näkyy tekemättömänä) |
| Tyyppi | `debug` (render-tason valmius-detektio) |
| Laadittu | 2026-05-30 / Cowork-sessio |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssin vaiheeseen | VALMIS-1 (UI/preview-tarkkuus) — **EI siirrä NYT-merkkiä** (vaihe 18 ennallaan). |
| Pohja-HEAD | `971bd4f` · APP_VERSION `4.52.22` |

---

## 1. Tavoite

Sykli-näkymän "Tämä viikko" -kortti näyttää **suoritetun treenin tehtynä** (vihreä ✓ "done"), ei aktiivisena tai tekemättömänä. Lopputilassa päivän tila heijastaa **onko sessio oikeasti suoritettu** — ei pelkkää kalenteripäivää. (Esim. La 30.5 MU logattu → "done", ei "now".)

## 2. Acceptance criteria

> Tyyppi `debug`: "toistettava repro → odotettu vs. todettu käytös". A1 = CONFIRM (jo tehty read-onlyssa), A2 = FIX. Mittari-ensin: A3 known-pos/neg (Selkäranka 6).

- **A1 — CONFIRM (juurisyy, jo vahvistettu Probe B:ssä read-only).** Repro: avaa Sykli → "Tämä viikko"; logattu treeni (La 30.5 MU) näkyy "now"/"skip", ei "done". Juurisyy: `thisWeekHTML` (index.html:~7977) `if (sess && sess.completed) { statusCls="done" }` vaatii `sess.completed===true`, MUTTA kenttää ei persistoida (backup: **0/19 sessiossa** on `completed`; koodikommentti index.html:5526 / v4.34.36: "completed on vain workout-flow:n sisäinen tila"). → mikään logattu sessio ei saavuta "done"-tilaa. **VAHVISTETTU — A2 voi edetä.**
- **A2 — FIX (lukupää).** Muuta "Tämä viikko" -done-detektio käyttämään **`sess.endedAt`-olemassaoloa** (treeni päätetty) `sess.completed`-flagin sijaan. **Korjaus VAIN renderöijässä; save-polku (saveSession, endedAt-asetus) KOSKEMATON.**
  - **Repro → odotettu:** logattu sessio dayISO:lla (endedAt asetettu) → "done" (✓ vihreä).
  - **Todettu (ennen):** "now" (jos = today) tai "skip" (jos < today) → harhaanjohtava.
- **A3 — Known-pos / known-neg (mittari-ensin).**
  - **Known-pos:** päivä jolla on sessio jolla `endedAt` asetettu → `statusCls="done"`.
  - **Known-neg:** päivä ilman sessiota TAI kesken jäänyt (ei `endedAt`) → EI "done" → putoaa "now" (= today) / "skip" (< today) / "next" (> today) kuten ennen.
- **A4 — Regressio + päiväavain-verifiointi.** Pilot **bittitarkka** (138 audit-flagia, identity-gate 0 — engine koskematon). Selain-/UI-testit eivät regressoi. **Verifioi että thisWeekHTML:n UTC-pohjainen `dayISO` (toISOString-aritmetiikka, rivit ~7969–7973) täsmää tallennetun `session.dateISO`:n kanssa** — jos eriparisuus (H-008-perhe), `_cvSessionByDate.get(dayISO)` ei löydä sessiota ja korjaus jää tehottomaksi → raportoi (ei hiljainen ohitus).

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** ei kosketa — tämä on UI-render, ei engine-laskentaa. VL-cap/deload/e1RM/tier ennallaan.
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - **Save-polku** (saveSession index.html:14441 ym., `endedAt`/`completed`-asetus) — korjaus on vain lukupäässä.
  - `completed`-flag-mekanismi (workout-flow:n sisäinen tila) — sitä EI ruveta persistoimaan tässä (laajempi muutos, lykätään; `endedAt` riittää).
  - `engine.js`, `recommend()`, pilot-harness + baseline (138).
  - Program Overview -taulu (eri render, `populateProgramOverviewTargets`), H-014 Sykli-preview-kuormat (`sykliHybridPreviewLoads`) — eri koodipolku.
- **Sallittu muutosalue:** `index.html` — `thisWeekHTML` done-detektio (rivi ~7977) + tarvittaessa `test-runner.js`-testi joka assertoi tämän.
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `971bd4f`, main, working tree puhdas. Ankkuri `backup-pre-OBS026-971bd4f` luotu.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (`debug`).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli 2026-05-30; älä re-litigoi):**
- **Valmius-signaali = `sess.endedAt`-olemassaolo** (treeni päätetty), EI `completed`-flag. Peruste: `endedAt` persistoidaan jo (kaikilla backup-sessioilla), `completed` ei (0/19) — se on workout-flow:n transient-tila.
- **Korjaus lukupäässä** (render), ei save-polkuun. Minimaalinen, ei regressoi tallennusta.

**Hylätty:**
- **`completed`-flagin persistointi save-polkuun** — laajempi save-polku-muutos + schema-vaikutus; tarpeeton kun `endedAt` jo olemassa ja luotettava.
- **Pelkkä `if (sess)` (session-olemassaolo)** — heikompi kuin `endedAt`: keskeneräinen/aloitettu-mutta-ei-päätetty sessio voisi näkyä "done". `endedAt` vaatii että treeni on aidosti päätetty.

## 6. Avoimet kysymykset

1. **endedAt aina asetettu?** Probe B:ssä kaikilla backup-sessioilla oli `endedAt`. Code verifioi A2:n yhteydessä että save-polku asettaa `endedAt`:n myös backfill- ja planOverride-sessioille (jos ei → osa logatuista jäisi "done"-tilan ulkopuolelle → raportoi, älä laajenna scopea hiljaa). Ei blokkaa A2:ta.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<seuraava handoff tai R-sekvenssin vaihe>` |
