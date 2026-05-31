# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-31. OBS-035+037 (yhdistetty) — OBS-CORE-juuri #3, YLEINEN scope (koko ohjelmointikone, ei vain Akselin tämä treeni). Saman liikkeen volyymi-apuliike renderöityy `getMovementProgress.suggestedLoadKg`:llä (≈ pää), ei kanonisella kevennetyllä kuormalla. Korjaus tehdään LIIKE-AGNOSTISESTI (leuka + kyykky + dippi). A2-CONFIRM-2 = READ-ONLY catalog-enumerointi ENNEN editiä.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `OBS-035+037` (saman liikkeen volyymi-apuliike → kanoninen kuorma, YLEINEN/liike-agnostinen; OBS-CORE-juuri #3) |
| Tyyppi | `debug` (confirm-then-fix; A2-CONFIRM-2 read-only ENNEN engine-editiä) |
| Laadittu | 2026-05-31 / Cowork-sessio |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssin vaiheeseen | VALMIS-1-luokan slot-resolveri-jatko (OBS-CORE-juuri #3). **EI siirrä NYT-merkkiä** (vaihe 18 ennallaan). |
| Pohja-HEAD | `91c73b8` · APP_VERSION `4.52.27` |

---

## 1. Tavoite

Saman liikkeen **volyymi-apuliike** (role=accessory, movementName === sen päivän primaryMovement, loadPct asetettu) tuottaa **kanonisen kevennetyn kuorman** (`kanoninen e1RM × loadPct`), ei pään työkuormaa. Korjaus tehdään **LIIKE-AGNOSTISESTI** — sama resolveri- ja UI-mekanismi pätee jokaiseen kisaliikkeeseen (leuka/kyykky/dippi), ei vain leukaan. Lopputilassa atletti näkee saman liikkeen sloteille johdonmukaisen järjestyksen: **volyymi-apuliike < back-off < pää**, kaikilla liikkeillä. Nykyoire (puhelinverifiointi 2026-05-31, leuka): volyymi-apuliike 65 ≈ pää 65,5 koska kuorma tulee `getMovementProgress.suggestedLoadKg`:stä (`index.html:12886`), ei `e1RM × loadPct`-laskennasta. Haluttu lopputila, EI ratkaisua — Direction A on valittu mekanismi (§5).

## 2. Acceptance criteria

> Tyyppi `debug`: "repro → odotettu vs. todettu". Skeema: `docs/ACCEPTANCE_CRITERIA_SKEEMA.md`. A1 = READ-ONLY enumerointi ENNEN A2:ta. A2 muuttaa TODELLISIA kuormia → A3 baseline-ratifiointi (ei bittitarkka). Invariantit: `CLAUDE.md` §2.

- **A1 — CONFIRM-2 (READ-ONLY, STOP-gate, mittari-ensin).** Enumeroi `data.js`-katalogista KAIKKI same-movement loaded-volume -entryt (role=accessory + default-variantti = kisaliike + loadPct asetettu + `!loadPctReferenceMovementName`). Raportoi TÄYSI lista + kunkin nykyskeema. Vahvista: erillispass-reitti (5268:n jälkeen), gate-tunnistus (ei osu eri liikkeen apuliikkeisiin), back-off-rajaus (vReps ennallaan). **STOP + raportoi ENNEN engine-/catalog-editiä. ÄLÄ korjaa.**
- **A2 — FIX (vasta A1-listan + luvan jälkeen).** (1) **Catalog (`data.js`):** jokainen same-movement volume -entry → **3×8 @ loadPct 0,65, V3** (johdonmukaisesti kaikille kisaliikkeille). (2) **Resolveri (`engine.js`):** erillinen pass `resolveDayPlanSlots`:n (5268) JÄLKEEN, same-movement-gate, `resolvedLoadKg = currentE1RMSystem × loadPct − bw` (NON-vReps; back-off pysyy ROOT-A:n vReps-reitissä). (3) **UI (`index.html:12875`):** `role="accessory"`-laajennus same-movement-volyymille. **Repro → odotettu:** volyymi-apuliike < back-off < pää.
- **A3 — UUSI BASELINE (STOP-gate, kuten OBS-CORE).** A2 muuttaa **todellisia kuormia** → pilot **EI bittitarkka**. Per-solu-diff + uskottavuus → **STOP + ratifiointi ennen committia** + puhelinverifiointi.
- **A4 — Regressio + invariantit. Known-pos USEAMMALLE liikkeelle:** leuka + (kyykky JA/TAI dippi) — volyymi-apuliike < back-off < pää, 8 ≠ 5 toistoa. **Known-neg:** eri liikkeen apuliikkeet (Pendlay/dippi-isolaatio/curl/face pull) **ennallaan**. **Back-off ennallaan** (ROOT-A). `CLAUDE.md` §2 invariantit ennallaan. SP-2-selainassertio + identity-gate vihreät. APP_VERSION-bump.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (CLAUDE.md §2):** VL-cap/deload/tier/e1RM-kaavat ennallaan.
- **Mitä EI kosketa:** **Back-off** (ROOT-A vReps); **eri liikkeen apuliikkeet** (movement ≠ primary → `getMovementProgress`-polku säilyy); **dippi-primer-/BW-slotit jos ne EIVÄT ole loaded-volume** (A1 ratkaisee — primer ~50% V5 ≠ volyymi); rate-limit×back-off (`stash@{0}`); recommend()-progressio-engine, makro-periodisaatio, identity-gate, data-flow.
- **Muutosalue:** `data.js` ACCESSORY_SLOT_CATALOG (same-movement volume -entryjen skeema) + `engine.js` recommend() (erillinen resolveri-pass) + `index.html:12875` (UI-gate).
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia. SCHEMA_VERSION ennallaan.
- **PRE-FLIGHT + peruutusankkuri:** HEAD `91c73b8`, ankkuri `backup-pre-OBS035-91c73b8`. A1 read-only.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (`debug`). Slot-kuorma-järjestys (volyymi-apuliike < back-off < pää) on valmennuksellisesti ilmeinen.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli 2026-05-31; älä re-litigoi):**
- **YLEINEN/liike-agnostinen scope:** korjataan koko ohjelmointikone (leuka + kyykky + dippi), ei vain Akselin tämä treeni. Resolveri + UI-gate movement-agnostisia.
- **Direction A:** recommend() resolvoi (kanoninen e1RM × loadPct) + UI-gate; loadPct (EI vReps) → kevyempi kuin back-off.
- **Skeema 3×8 @ 0,65 V3:** ratkaisee OBS-035 A2-confirmin sanity-checkin (0,65 ≈ vReps 8-rep-V3:lle → load-vs-V3-johdonmukaisuus; 8 ≠ back-offin 5 → erottuva).
- **A1 = READ-ONLY enumerointi ENNEN editiä** (Selkäranka §5b): liike-agnostisuus vaatii TÄYDEN catalog-listan ennen muutosta.

**Hylätty:**
- **`getMovementProgress.suggestedLoadKg`-lähteen muuttaminen suoraan** — riskeeraisi eri liikkeen apuliikkeet.
- **Vain-leuka-korjaus** (OBS-035 alkuperäinen) — yhdistetty OBS-037:ään liike-agnostiseksi.

## 6. Avoimet kysymykset (A2-CONFIRM-2 vastaa READ-ONLY ENNEN A2:ta)

1. **TÄYSI lista:** mitkä catalog-entryt ovat same-movement loaded-volume (default-variantti = kisaliike + loadPct + `!loadPctReferenceMovementName`)? Kunkin nykyskeema?
2. **Scope-tarkennus:** jos same-movement-entryjä joilla loadPct on vain yksi (leuka), miten "kaikille liikkeille" toteutetaan — (a) liike-agnostinen resolveri (toimii tuleville), (b) lisää loadPct dippi-/kyykky-volyymientryihin, vai (c) luo uudet volyymientryt? (A1 paljastaa, Akseli ratifioi.)
3. **Erillispass + gate + back-off-rajaus** vahvistettu OBS-035 A2-confirmissa — pätee liike-agnostisesti?

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
