# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-30. Jatkaa OBS-027 A1:tä (mis-compute vahvistettu). A2-VALMISTELU (§6, read-only) ENNEN engine-editiä — STOP-gate. OBS-027 A2 (UI) parkissa tämän takana.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `OBS-030` (progression weeksSinceLast-attribuutio: planOverride-sessio plan-viikolle) |
| Tyyppi | `debug` (engine-attribuutio mis-compute) |
| Laadittu | 2026-05-30 / Cowork-sessio (jatkaa OBS-027 A1:tä) |
| Tila | `VALMIS` (suljettu 2026-05-30) |
| Runtime-hyväksyntä | `2026-05-30` — ei puhelinverifiointia (lepotila-fix, aktivoituu vasta OBS-027:n etukäteissessiolla) |
| Liittyy R-sekvenssin vaiheeseen | VALMIS-1-luokan engine-täsmäkorjaus — **EI siirrä NYT-merkkiä** (vaihe 18 ennallaan). |
| Pohja-HEAD | `79c6853` · APP_VERSION `4.52.24` · sulku-koodi `e258f9d` → `4.52.25` |

---

## 1. Tavoite

Progression-engine attribuoi **planOverride-session sen SUUNNITELLULLE meso-viikolle** (`planSourceDateISO`) eikä kalenteri-tehtypäivälle (`dateISO`), niin että `weeksSinceLast` laskee oikein eikä yli-progressoi kun atletti tekee seuraavan viikon session etukäteen. (Avaa OBS-027 A2:n turvalliseksi.)

## 2. Acceptance criteria

> Tyyppi `debug`: "toistettava repro → odotettu vs. todettu käytös". A1 = CONFIRM (jo tehty OBS-027 A1:ssä). A2-VALMISTELU (§6, read-only) ENNEN A2-fixiä. Mittari-ensin (Selkäranka 6).

- **A1 — CONFIRM (vahvistettu OBS-027 A1 + OBS-030 §6, tämä sessio).** TODELLINEN mekanismi (engine.js 2074–2081, korjattu OBS-027 A1:n virhepäättelystä): `weeksSinceLast = Math.min(3, Math.max(1, Math.ceil(daysSince / 7)))`, missä `daysSince` = kalenteripäivät `lastSession.dateISO`:sta (= set.timestamp-tehtypäivä) target-`dateISO`:hon. **EI meso-viikkonumeroiden erotus, EI getMesocycleWeek.** planOverride päivää session tehtypäivälle → ceil()-karkeus: vk6-leuka etukäteen su 31.5 (8 pv ennen vk7-leukaa 8.6) → `ceil(8/7)=2` eikä `ceil(7/7)=1` → `weeklyProgressionPct` 10% eikä 5% → **yli-progressio 68 kg vs oikea 65 kg** (Lisäpainoleuanveto, mitattu). **VAHVISTETTU.**
- **A2-VALMISTELU — §6 read-only (STOP-gate ENNEN engine-editiä).** Vastaa §6:n 4 kysymystä koodista (funktio · planSourceDateISO-asetus · backup/pilot-impact · jaettu-funktio-regressio). **STOP + raportoi ENNEN A2-fixiä.**
- **A2 — FIX (vasta valmistelun + luvan jälkeen).** `weeksSinceLast`/meso-viikko-session-attribuutio käyttää **`planSourceDateISO`:n meso-viikkoa jos `planSourceDateISO` on olemassa, muuten `dateISO`:a** (= ennallaan normaaleille sessioille). **Repro → odotettu:** OBS-027 A1 skenaario C → **65 kg (ei 68)**. **Todettu (ennen):** 68 kg.
- **A3 — Known-pos / known-neg.** **Known-pos:** planOverride-sessio (jolla `planSourceDateISO`) attribuoituu plan-viikolle → progressio korjattu (A1-skenaario 68→65). **Known-neg:** normaali sessio (ei `planSourceDateISO`) → `dateISO`-attribuutio **muuttumaton**.
- **A4 — Regressio.** Pilot **bittitarkka 138 audit-flagia** (identity-gate 0). **Mutta:** jos pilot-datassa on `planSourceDateISO`-sessioita joiden attribuutio muuttuu (ks. §6 q3), pilot-kuormat voivat muuttua → **STOP + per-solu-diff Akselille ratifiointiin (kuten H-010), ei hiljaista baseline-muutosta.** Selain-testit eivät regressoi. APP_VERSION-bump.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** progression-rate/regain/VL-cap/deload-kaavat **ennallaan** — vain SESSION→meso-viikko-attribuutio korjataan (mistä päivästä viikko luetaan), ei progression matematiikkaa.
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - **Save-polku** — planOverride `dateISO`/`planSourceDateISO`/`endedAt`-asetus **ennallaan** (sessio tallennetaan kuten ennen; vain LUKU-puolen attribuutio muuttuu).
  - `recommend()`-muu logiikka, RTF/velocity, identity-gate (H-010), data-flow (H-011).
  - **Display-polut** (OBS-026/028 `thisWeekHTML` done-detektio) — **ELLEI** jaettu funktio (§6 q4); jos jaettu → flagattava + arvioitava regressio erikseen ENNEN editiä.
  - Pilot-baseline (138) — jos muuttuu, A4:n STOP-gate.
- **Sallittu muutosalue:** `engine.js` — funktio joka laskee `weeksSinceLast`/meso-viikon session päivästä (paikallistetaan §6 q1:ssä).
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `79c6853`, main, working tree puhdas. Ankkuri `backup-pre-OBS030-79c6853` luotu. A2-valmistelu read-only; A2-fixille tuore ankkuri.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (`debug`). Korjauksen suunta (#1, engine-attribuutio) on Akselin päätös (OBS-027 A1 → vaihtoehto 1).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli 2026-05-30; älä re-litigoi):**
- **Korjaus = engine-attribuutio (OBS-027 vaihtoehto #1).** planOverride-sessio attribuoituu plan-viikolle progression-laskennassa.
- **`planSourceDateISO` ensisijainen, `dateISO` fallback** — normaalit (ei-override) sessiot ennallaan → minimaalinen blast-radius.
- **A2-valmistelu (§6 read-only) ENNEN fixiä** — varmistetaan funktio, planSourceDateISO-takuu, pilot-impact ja jaettu-funktio-regressio ennen engine-editiä (Selkäranka 5–6).

**Hylätty:**
- **UI-gate yksin (OBS-027 A2 ilman tätä)** — ei korjaa attribuutiota; yli-progressio jäisi.
- **Save-polku-päiväys planSourceen** (sessio päivättäisiin plan-päivälle) — sivuvaikutukset (todellisen tekopäivän menetys, display-attribuutio). Korjataan luku-puolella sen sijaan.

## 6. Avoimet kysymykset (A2-VALMISTELU — Code vastaa read-only ENNEN A2-fixiä)

1. **Funktio:** mikä engine.js-funktio laskee `weeksSinceLast`/meso-viikon session päivästä (PROGRESSION_TARGET-polku)? Käyttääkö `getMesocycleWeek(dateISO)`:a vai mitä?
2. **planSourceDateISO-takuu:** asettaako planOverride-tallennus **aina** `planSourceDateISO`:n? (Jos ei aina → fallback dateISO:on on oikein, mutta varmistettava ettei normaali sessio saa vahingossa planSourceDateISO:a.)
3. **Pilot/backup-impact:** onko Akselin backupissa / pilot-datassa `planSourceDateISO`-sessioita joiden meso-viikko-attribuutio muuttuisi korjauksen myötä → muuttuuko pilot-baseline (138, bittitarkka)? Jos kyllä → A4 STOP-gate.
4. **Jaettu funktio:** jakaako joku muu polku (OBS-026/028 `thisWeekHTML`-display, `computeRecentSessionsForMovement`, anchor-valinta) saman attribuutio-funktion → display-/muu regressio-riski? Jos kyllä → scope-aita-arvio ennen editiä.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `2026-05-30` |
| Muuttuneet tiedostot | `engine.js (computeProgressionTarget daysSince planSourceDateISO || dateISO; computeRateLimitAnchor +sessionId; 2 recommend-kutsujaa rikastus, isPlanOverride-gate) [e258f9d], sw.js + index.html (APP_VERSION 4.52.24→4.52.25), HANDOFF.md. EI save-polkua/displayta.` |
| Tehdyt päätökset | `weeksSinceLast.daysSince käyttää lastSession.planSourceDateISO:a VAIN planOverride-sessiolle (isPlanOverride && planSourceDateISO), muuten dateISO. ceil(päivät/7)+cap[1,3] ennallaan. Tarkoituksellinen divergenssi: display=todellinen pv (OBS-028), progression=aiottu kadenssi (OBS-030).` |
| Validointi | `Runtime-hyväksyntä: known-pos planOverride 31.5→planSource 1.6 → 65 kg (ei 68) · known-neg normaali 31.5 → 68 (muuttumaton) · pilot BITTITARKKA 138 audit-flagia + identity-gate 0 · Akselin nykyiset vk6/7-kuormat muuttumattomat (kyykky 157.5/157.5, leuka 62/62, dippi 80/78) · selain ?test=1 741/745. EI puhelinverifiointia (lepotila-fix).` |
| Jäi auki | `OBS-031 (yleinen ceil()-karkeus 8–13 pv → 2 vk normaaleillekin sessioille) = erillinen, ei tässä. §6 q-vastaukset arkistossa.` |
| Seuraava askel | `OBS-027 A2 (UI-gate "vaihda päivä" → seuraavan viikon eka) on nyt TURVALLINEN toteuttaa (OBS-030 korjasi yli-progression) — erillinen handoff. OBS-021-verdikti, OBS-031, enginen sisä-blokki-progression eliittilaatu-tarkastelu.` |
