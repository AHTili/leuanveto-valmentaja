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
| Tila | `VALMIS` (suljettu 2026-05-30) |
| Puhelinverifiointi | `LÄPI 2026-05-30` (Akseli) — To-dippi "done" Ke-session kautta ✓, Ti-kyykky ✓ |
| Liittyy R-sekvenssin vaiheeseen | VALMIS-1 (UI/preview-tarkkuus) — **EI siirrä NYT-merkkiä** (vaihe 18 ennallaan). |
| Pohja-HEAD | `971bd4f` · APP_VERSION `4.52.22` · sulku-koodi `1d2654a` → `4.52.24` (OBS-026 a4b8955 + OBS-028 1d2654a) |

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
- **A5 — OBS-028: liike-pohjainen viikkotäsmäys (laajennus, Akseli 2026-05-30 "toteuta täsmällisesti").** Oire: atletti tekee plan-liikkeen eri viikonpäivänä kuin slot on suunniteltu (esim. dippi To-slot tehtynä **Ke 27.5**) → To näkyi "skip ✕" vaikka dippi tehty (näkyi Historiassa). Korjaus (lukupää): "Tämä viikko" -slot "done" jos slotin **pääliike** on tehty (`endedAt`-päätetty `setRole==="top"`) **tällä meso-viikolla millä tahansa päivällä**, ei pelkästään plan-päivän tarkalla päivämäärällä. Mekanismi: kerää viikon (`weekStartISO`…`weekEndISO`) endedAt-sessioiden top-set-`movementId`:t → slot-done jos slotin liike on joukossa; OBS-026-fallback (exact-day endedAt) jää jos liikettä ei resolvoida. **Known-pos:** dippi tehty Ke → To-dippi-slot "done ✓". **Known-neg:** liike jota ei tehty viikolla → ei "done". (Verifioitu 29.5-backupilla vk5: Ti-kyykky ✓, **To-dippi ✓ Ke 27.5:n kautta**, Ma-leuka skip, La-MU now.)

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
- **OBS-028 (liike-pohjainen viikkotäsmäys) = KYLLÄ** (Akseli "toteuta täsmällisesti" 2026-05-30): slot-done täsmätään slotin **pääliikkeeseen viikon sisällä**, ei tarkkaan plan-päivään. Peruste: atletti treenaa joustavasti (siirtää liikkeitä päivien välillä, tekee extra-sessioita). OBS-026-endedAt-exact-day jää fallbackiksi.

**Hylätty:**
- **`completed`-flagin persistointi save-polkuun** — laajempi save-polku-muutos + schema-vaikutus; tarpeeton kun `endedAt` jo olemassa ja luotettava.
- **Pelkkä `if (sess)` (session-olemassaolo)** — heikompi kuin `endedAt`: keskeneräinen/aloitettu-mutta-ei-päätetty sessio voisi näkyä "done". `endedAt` vaatii että treeni on aidosti päätetty.
- **Pelkkä exact-day-täsmäys (OBS-026 yksin)** — jättää eri päivänä tehdyt plan-liikkeet "skip"-tilaan (dippi-Ke-ongelma). OBS-028 täsmää liikkeen viikon sisällä.

## 6. Avoimet kysymykset

1. **endedAt aina asetettu?** Probe B:ssä kaikilla backup-sessioilla oli `endedAt`. Code verifioi A2:n yhteydessä että save-polku asettaa `endedAt`:n myös backfill- ja planOverride-sessioille (jos ei → osa logatuista jäisi "done"-tilan ulkopuolelle → raportoi, älä laajenna scopea hiljaa). Ei blokkaa A2:ta.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `2026-05-30` |
| Muuttuneet tiedostot | `index.html (thisWeekHTML done-detektio: OBS-026 completed→endedAt [a4b8955] + OBS-028 liike-pohjainen viikkotäsmäys [1d2654a]), sw.js (APP_VERSION 4.52.22→4.52.24), HANDOFF.md. engine.js EI.` |
| Tehdyt päätökset | `OBS-026: done = sess.endedAt (completed-flag ei persistoidu, 0/19 sessiossa). OBS-028: slot-done = slotin pääliike endedAt-päätetty viikon sisällä (mikä tahansa päivä, top-set movementId), exact-day endedAt fallbackina. Molemmat LUKUPÄÄ — save-polku koskematon.` |
| Validointi | `Pilot BITTITARKKA 138 audit-flagia + identity-gate 0 (engine koskematon) · selain ?test=1 741/745 (samat 4 pre-existing flaky) · runtime 29.5-backup vk5: To-dippi ✓ Ke 27.5:n kautta, Ti-kyykky ✓, Ma-leuka skip, La-MU now · PUHELINVERIFIOINTI LÄPI 2026-05-30 (Akseli): kortti merkitsee tehdyt treenit oikein.` |
| Jäi auki | `§6-kysymys (endedAt aina asetettu myös backfill/planOverride?) — ei estänyt; puhelinverifiointi vahvisti normaalit sessiot. Seurataan jos jokin logattu jää "done"-tilan ulkopuolelle.` |
| Seuraava askel | `OBS-021-verdikti (recommend-proveniessi puhdas; velocity-vs-Vx-luottamus erillinen valmennuspäätös), OBS-027 (vaihda-päivä → seuraavan viikon eka sessio), enginen todellisen sisä-blokki-progression eliittilaatu-tarkastelu. Y-10 (vanhentunut H-007 Stop-hook) = TEHTÄVÄ 2.` |
