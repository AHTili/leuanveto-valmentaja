# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-30. OBS-027:n A2-osa (A1 tehty + OBS-030 [e258f9d] korjasi progression-yli-laskennan → A2 nyt turvallinen). A2a = READ-ONLY display-confirm STOP-gate ENNEN A2b-toteutusta.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `OBS-027-A2` ("Vaihda päivä" → seuraavan viikon eka treeni, turva-gatella + display-attribuutio) |
| Tyyppi | `scope-expansion` (UI-feature + A2a read-only confirm-gate) |
| Laadittu | 2026-05-30 / Cowork-sessio |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssin vaiheeseen | VALMIS-1-luokan UX-laajennus — **EI siirrä NYT-merkkiä** (vaihe 18 ennallaan). |
| Pohja-HEAD | `bf348a9` · APP_VERSION `4.52.25` |

---

## 1. Tavoite

"Vaihda päivä" -modaali (`showPlanOverrideModal`) tarjoaa myös **seuraavan viikon ensimmäisen treenin** — turvallisesti (vain jos `currentWeek+1` on samaa blokkia eikä deload/cal/realization-viikko). Lisäksi: jos etukäteen tehty (planOverride) sessio näkyy "Tämä viikko" -kortissa **väärän viikon slotissa** (A2a selvittää), se näytetään oikealle (suunnitellulle) viikolle. Progression on jo korjattu (OBS-030); tämä on **display + UI** -kerros.

## 2. Acceptance criteria

> Tyyppi `scope-expansion`: mitattavat hyväksyntäehdot + eksplisiittinen scope-aita. A2a = READ-ONLY confirm-gate ENNEN A2b:tä (Selkäranka 5–6). Mittari-ensin: known-pos/neg.

- **A2a — READ-ONLY display-confirm (STOP-gate).** Aja "Tämä viikko" -done-detektio-logiikka (OBS-028: `_weekSessIds` dateISO ∈ [weekStartISO, weekEndISO] → `completedMovIdsThisWeek`) planOverride-sessiolle (`dateISO=2026-05-31`=vk5, `planSourceDateISO=2026-06-01`=vk6-Ma, leuka, `endedAt`) **vk5- JA vk6-näkymälle**. Mittaa: kumman viikon leuka-slotin se merkitsee "done"? **STOP + raportoi.** Jos vk6:n työ (tehty etukäteen) näkyy vk5-slotissa eikä vk6-slotissa → mis-näyttö → A2b lisää display-attribuoinnin. **ÄLÄ toteuta A2b:tä ennen tulosta + lupaa.**
- **A2b — Toteutus (vasta A2a-tuloksen + luvan jälkeen).**
  - **(i) UI-gate `showPlanOverrideModal`:** lisää `currentWeek+1`:n ensimmäinen treenipäivä valittaviin **VAIN jos** (a) `currentWeek+1` sama blokki kuin `currentWeek` JA (b) ei deload/cal/realization (streetlifting_16w: vk 4/8/12 = deload+cal, vk 13–16 = peaking/realization).
  - **(ii) JOS A2a osoitti mis-näytön:** `thisWeekHTML`-done-detektio huomioi `planSourceDateISO`:n planOverride-sessiolle → vk6-slot "done" kun vk6:n työ tehty etukäteen (display-attribuutio plan-viikolle, symmetrinen OBS-030:n progression-attribuution kanssa).
  - **Known-pos:** nykyviikko strength vk5, seuraava vk6 strength → vk6-eka näkyy modaalissa; planOverride vk6-leuka → vk6-leuka-slot "done". **Known-neg:** vk7→vk8 (deload/cal) EI näy; vk3→vk4 (deload) EI näy; vk12→vk13 (peaking) EI näy; myöhempi kuin seuraava viikko EI näy.
- **A3 — Regressio + scope-eheys.** Pilot **bittitarkka 138** (identity-gate 0 — engine/progression koskematon). Selain-/UI-testit eivät regressoi. recommend()/computeProgressionTarget EI muutu. APP_VERSION-bump.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** ei kosketa — UI/display. Makro/VL-cap/e1RM/tier/progression-kaavat ennallaan.
- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - `engine.js`, `recommend()`, `computeProgressionTarget` — **OBS-030 (e258f9d) hoiti progression-attribuution; tässä EI kosketa engineä.**
  - Save-polku (planOverride `dateISO`/`planSourceDateISO`/`endedAt`-asetus ennallaan).
  - Nykyviikon "vaihda päivä" -logiikka (toimii) — vain LAAJENNETAAN seuraavan viikon ekaan.
  - Pilot-baseline (138), makro, deload/blokki-rakenne.
- **Sallittu muutosalue:** `index.html` — `showPlanOverrideModal` (rivi ~2900) + (A2b(ii):ssä jos A2a vahvistaa) `thisWeekHTML`-done-detektio (rivi ~7971). Mahd. pieni blokki/deload-tunnistus-helper (lukee meso-rakennetta).
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `bf348a9`, main, working tree puhdas. Ankkuri `backup-pre-OBS027A2-bf348a9` luotu. A2a read-only; A2b:lle tuore ankkuri.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (`scope-expansion`). A2b:n turva-gate-säännöt (sama blokki + ei deload/cal/realization) ovat Akselin valmennuslinjaus (OBS-027-tavoite).

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli 2026-05-30; älä re-litigoi):**
- **OBS-030 hoiti progression-puolen** (planSourceDateISO-attribuutio weeksSinceLast:ssa) → A2 voi keskittyä UI/display-kerrokseen, engine koskematon.
- **A2a (display-confirm) ENNEN A2b:tä:** mitataan näkyykö planOverride-sessio väärän viikon slotissa ENNEN kuin lisätään display-korjaus (Selkäranka 5–6, confirm-then-fix).
- **Turva-gate (sama blokki + ei deload/cal/realization)** seuraavan viikon ekalle — ei ehdotonta "kaikki tulevat päivät".

**Hylätty:**
- **Ehdoton seuraavan viikon näyttö ilman gatea** — vetäisi avauksen blokki-/deload-/peaking-rajan yli väärään aikaan.
- **A2b ilman A2a-mittausta** — koodaisi display-attribuoinnin vahvistamatta että mis-näyttö on olemassa.

## 6. Avoimet kysymykset (Code esittää A2a:n jälkeen)

1. **A2a-tulos ratkaisee:** näkyykö planOverride-sessio vk5-slotissa (mis-näyttö) vai onko display jo oikein? Jos mis-näyttö → A2b(ii) display-attribuutio; jos jo oikein → vain A2b(i) UI-gate.
2. **Display-attribuutio-mekanismi (jos tarvitaan):** käyttääkö thisWeekHTML planSourceDateISO:a viikko-rangessa planOverride-sessiolle (symmetrinen OBS-030:n kanssa) — vahvistettava ettei riko OBS-026/028-known-pos:eja (Ti-kyykky ✓, To-dippi ✓).

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
