# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täytti osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *RE-SCOOPATTU 2026-05-30 Code:n A2-feasibility-gaten jälkeen (verifioitu Coworkissa koodista). Alkuperäinen premissi ("flat load = engine-bugi, korjaa vReps/vx-askelluksella") oli VÄÄRÄ. Verifioitu reframe: flat load = preview-artefakti; todellinen engine-kuorma etenee. Suunta = O2 (korjaa preview). A0 (a24abac, 4.52.21) on pushattu ja jää voimaan kunnes B2 sovittaa sen. B0 on read-only STOP-gate.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-014` (preview-truth: Sykli 14pv = todellinen engine-kuorma) |
| Tyyppi | `debug` (preview-artefakti) + `architecture` (B0 = projektiometodi-STOP-gate) |
| Laadittu | 2026-05-30 / Cowork-sessio · re-scooppaus samana päivänä |
| Tila | `VALMIS` (suljettu 2026-05-30) |
| Puhelinverifiointi | `LÄPI 2026-05-30` (Sykli 14pv näyttää etenevät kuormat oikein) |
| Liittyy R-sekvenssiin | VALMIS-1 (preview-tarkkuus) — EI siirrä NYT-merkkiä (vaihe 18 ennallaan). |
| Pohja-HEAD | A0 jälkeen `a24abac` · APP_VERSION `4.52.21` · sulku `11981d1` → `4.52.22` |

---

## 1. Tavoite

Sykli 14pv -näkymä (`_syRenderComputeKg`) näyttää **sen kuorman jonka atletti oikeasti saa** treeniaikana — etenevän, autoreguloidun engine-kuorman — eikä staattista `vReps × cachetettu-e1RM` -uudelleenlaskentaa joka tuottaa harhaanjohtavan flat-arvon (vk5–7 = 151/151/151). Lopputilassa preview ≈ todellisuus: atletti näkee tulevista treeneistä realistisen, etenevän kuorma-trajektorin. **Tämä on display-/preview-kerroksen korjaus — engine.js EI muutu.**

## 2. Acceptance criteria

> B0 = read-only STOP-gate (projektiometodi). B1 = toteutus. B2 = A0-sovitus. B3 = validointi. Mittari-ensin + runtime-first (Selkäranka 6 + §5b).

- **B0 — Preview-truth-exploraatio (READ-ONLY, STOP-gate).** Kartoita miten `_syRenderComputeKg` saadaan heijastamaan atletin todellista kuormaa. **Aja Akselin backupilla** kandidaattimetodit ja dumppaa kunkin tuottamat vk5–7 (mieluiten koko 14pv) preview-kuormat JA vertaa siihen mitä `recommend()` oikeasti antaa workout-aikaan + mitä pilot tuottaa:
  - **(P1) loadPct × e1RM** — plan-%-trajektori (loadPct 75/78/82 etenee, ei vReps-override). Etenee, mutta voi alittaa todellisen.
  - **(P2) progression-engine-projektio** — projektoi `computeProgressionTarget`-logiikka (regain × Helms-weekly) eteenpäin previewn ajalle. Lähimpänä todellista, mutta tuleville viikoille ei ole historiaa → projektion oletukset nimettävä.
  - **(P3) seed (`suggestedLoadKg`)** — plan-seedattu per-viikko-kuorma (sama lähde kuin pilotin etenevä trajektori).
  Per metodi: resultoivat kg-luvut + miten lähellä `recommend()`-todellisuutta + miten käsittelee tulevaisuus-epävarmuutta. **STOP + esitä vaihtoehdot + suositus → Akseli/Cowork valitsee projektiometodin ENNEN B1:tä.** (ÄLÄ pre-lukitse — Cowork ei anna lukuja; Code laskee ne tästä datasta.)
- **B1 — Toteuta valittu metodi (vasta B0-päätöksen jälkeen).** Korjaa `_syRenderComputeKg` näyttämään valitun metodin etenevä kuorma. Known-pos: vk5 ≤ vk6 ≤ vk7 (etenee). Known-neg: deload-viikko / liike jolla ei progressiota → ei nouse. Verifioi runtimessa Akselin backupilla (kuten A0).
- **B2 — A0-sovitus.** A0 lisäsi `honestifyLoadLabel`iin suunniteltu-vs-toteutunut previewn vReps-luvulle. Kun B1 näyttää todellisen kuorman, arvioi: onko planned-vs-actual yhä mielekäs, vai yksinkertaistetaanko/revertataanko? Esitä päätös (älä jätä kahta päällekkäistä "rehellistys"-kerrosta).
- **B3 — Validointi.** `_syRenderComputeKg` on UI/preview (index.html), EI engine.js → **pilot pysyy bittitarkkana** (138 audit-flagia, identity-gate 0) — varmista tämä eksplisiittisesti (jos pilot muuttuu, jokin vuoti engineen → STOP). Stop hook + selain-testit + APP_VERSION-bump + **puhelinverifiointi** (Sykli 14pv näyttää etenevän kuorman joka vastaa todellista).

## 3. Reunaehdot ja scope-aita

- **Mitä EI kosketa (test-riippuvuus-verifioitava):**
  - `engine.js`, `computeProgressionTarget`, `recommend()`-load-resoluutio — **engine pysyy muuttumattomana** (todellinen kuorma on jo oikein + autoreguloitu; tätä ei "korjata").
  - Pilot-harness + sen baseline (138) — preview-only-muutos ei saa muuttaa pilotia.
  - Makro-periodisaatio, identity-gate (H-010), data-flow (H-011).
  - `vRepsToExpectedPct` (sitä ei poisteta — sitä vain ei käytetä previewn lopullisena kuormana jos metodi niin valitsee).
- **Sallittu muutosalue (LAAJENNETTU 2026-05-30, B1-scope-päätös = Option 3):** `_syRenderComputeKg` + B2:ssa `honestifyLoadLabel` + **async-populate-sisarfunktio + Sykli-targets-cache, peilaten/uudelleenkäyttäen olemassa olevaa `populateProgramOverviewTargets` / `state.programTargetsCache` / `applyProgramTargetsToDOM` -infraa (index.html:8372).**
  - HUOM: `populateProgramOverviewTargets` (8389–8431) jo kutsuu `recommend()`:ia per tuleva solu oikealla `dateISO`:lla ja cachettaa `targetExternalLoad`:n avaimella `"wk:dow"`. **Code arvioi: uudelleenkäytä tätä cachea (DRY) vai lisää rinnakkainen Sykli-populate.** recommend()-totuus per solu on jo täällä.
  - C-hybridi-projektio (lähin = recommend()-totuus, kauempi = regain-%/vk-projektio, `~`-merkitty) lisätään tämän päälle. `_syRenderComputeKg` lukee tuloksen cachesta.
  - **Kaikki index.html:ssä. `engine.js` / `recommend()`-logiikka EI muutu — vain kutsutaan/luetaan → pilot bittitarkka.**
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** pohja A0 jälkeen `a24abac`. Ankkurit `backup-pre-h014-f5e7c9e` + `backup-pre-h014-a2-a24abac` tallessa; ota tuore pre-B1-ankkuri.

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (debug/architecture). B0:n projektiometodi-valinta on Akselin/Coworkin päätös, ei atletti-tuning.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**PREMISSI-KORJAUS (verifioitu koodista 2026-05-30 — kriittinen, älä re-litigoi):**
Kolme load-polkua, vain yksi koskettaa previewtä:
- **Preview** `_syRenderComputeKg` (index.html:7863–7876): `vRepsToExpectedPct(reps+targetVx) × cachetettu-e1RM` → sama e1RM joka viikko → **flat 151**. ← *tämä on se mitä Akseli näki.*
- **recommend()** (engine.js:4652–4724): vReps tuottaa vain planTargetin; `computeProgressionTarget` (regain × Helms-weekly × anchor) **ohittaa** sen → historia-adaptiivinen, etenevä (~157,5 dry-run).
- **seed/pilot** (4726–4730): `suggestedLoadKg` → pilot 120→125→130 (etenee jo).
→ "flat load" = **preview-artefakti, EI engine-bugi.** Engine on kyvykkäämpi kuin alkup. premissi pelkäsi.

**Hylätyt:**
- **B1-frac (vx-askellus) — HYLÄTTY.** Olisi muuttanut vain previewn vReps-lukua (151→153→154,5), ei todellista kuormaa → kosmetiikkaa väärään lukuun (O1, cobra-sukulaisuus). Code:n A2-feasibility-gate paljasti tämän.
- **O3 (sulje) — hylätty:** jättäisi previewn näyttämään väärän flat-kuorman → ei "virheetön".

**Erillinen, EI tässä handoffissa:** kysymys "onko enginen *todellinen* sisä-blokki-progressio (seed/regain) eliittilaatua" on oikein paikannettu enginen sisään → oma tarkastelu myöhemmin (ei sekoiteta preview-bugiin).

## 6. Avoimet kysymykset (Code kysyy/esittää ENNEN B1:tä)

1. **B0-projektiometodi:** P1 (loadPct-trajektori) / P2 (engine-projektio) / P3 (seed) / hybridi — mikä näyttää totuudenmukaisimman etenevän kuorman + käsittelee tulevaisuus-epävarmuuden rehellisesti? Esitä luvut Akselin datalla → Akseli/Cowork päättää.
2. **B2-A0:** säilytetäänkö planned-vs-actual -label B1:n jälkeen vai yksinkertaistetaanko? (Vältetään kaksi päällekkäistä rehellistys-kerrosta.)

---

## 7. Session-tulos *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `2026-05-30 · B1+B2 PUSHATTU (a33c707, ratifioitu) · Tila AKTIIVINEN — puhelinverifiointi viimeinen acceptance-portti` |
| A0 (jo tehty) | `a24abac · 4.52.21 · suunniteltu-vs-toteutunut preview-labelissa (B2 korvaa tämän @X%-strippauksella)` |
| B0 projektiometodi | `C-HYBRIDI regain-tietoinen (Akseli/Cowork lukitsi). Cache-päätös: DRY-reuse programTargetsCache (kaikki 8 preview-solua dow∈[1,2,4,6] → 100% kate) + laajennettu tallentamaan weeklyProgressionPct + weeksSinceLast.` |
| B1 toteutus | `commit a33c707 (pushattu origin/main). recommend()-totuus lähimmälle sessiolle (cachesta, DRY) + regain-projektio kauemmas. KRIITTINEN: per-viikko-rate = wpp/weeksSinceLast (raaka wpp embeddaa weeksSinceLast:n → suora käyttö tuplalaskisi: leuka/dippi vk6 wpp=10% mutta per-vk=5%; luettu per liike DYNAAMISESTI). Golden (Akselin backup): kyykky 157.5→~165.5, leuka 62→~65, dippi 80→~84, MU 2.5→~2.5 — kaikki monotoniset, ankkuroitu recommend()-totuuteen (ei vReps-151). 6 muutosta: populate-cache-laajennus, sykliHybridPreviewLoads+applySykliHybridToDOM (uudet), _syHybrid-render-integraatio, data-sy-cell-spanit, legenda, async-hook. engine.js KOSKEMATON.` |
| B2 A0-sovitus | `honestifyLoadLabel STRIPPAA @X%:n tier 1/2/3:lle (per-slot kantaa nyt todellisen kuorman → kaksi rehellistys-kerrosta ei tarvita). Otsikko: "TI — Kyykky 4×4" (ei @78%); per-slot: "4×4 V2 · 157.5 kg" (vk6) / "~165.5 kg" (vk7).` |
| Muuttuneet tiedostot | `index.html (honestifyLoadLabel B2 + renderMesocycle/populate B1 + uudet funktiot), sw.js (APP_VERSION 4.52.22). engine.js EI (diffstat: index.html 144, sw.js 3).` |
| Validointi | `Pilot BITTITARKKA 138 audit-flagia (engine-vuoto-vahti ✓ — engine koskematon) · smoke identity-gate 0 ✓ · selain 741/745 (0 page-error, parsii ✓) · golden-logiikka monotoninen+totuus-ankkuroitu ✓ · cache-avain-match empiirinen ✓. PUHELINVERIFIOINTI LÄPI 2026-05-30 ✓ (Sykli 14pv näyttää etenevät kuormat oikein).` |
| Pushattu? | `KYLLÄ — a33c707 → origin/main 4.52.22 (Akseli ratifioi). Ankkurit: backup-pre-h014-b1impl-a24abac (+ aiemmat), backup-pre-H014-archive-11981d1. ARKISTOITU 2026-05-30: puhelinverifiointi LÄPI → handoff suljettu (Tila VALMIS), HANDOFF.md nollattu tyhjäksi pohjaksi. ROADMAP NYT-merkki ennallaan (vaihe 18; H-014 = VALMIS-1).` |
| B0 projektiometodi-vaihtoehdot + valinta | `ESITETTY, ODOTTAA AKSELIA. Takakyykky vk5/6/7 (cached-e1RM 181.3): NYKY-preview 151/151/151 (flat). P1 loadPct×e1RM 136/141.5/148.5 (etenee mutta ALITTAA totuuden). P2a recommend()-naive 157.5/157.5/157.5 (squat flat; MUTTA leuka 57.5/62/62 + dippi 76/80/78 EI-monotoninen → recommend()-future ei ole puhdas trajektori). P2b engine-fwd +2.5%/vk (Helms PR-phase, OLETUS osut targetiin) 157.5/161.5/165.5 (ankkuroi totuuteen JA etenee monotonisesti). P3 seed 140/145/152.5 (etenee, alittaa). KRIITTINEN: P1/P3 alittavat totuuden (157.5) enemmän kuin nykyinen flat-151. recommend()-naive on jumppyy/ei-monotoninen tuleville vk. Suositus: P2b (tai C-hybridi: tarkka recommend() lähiviikolle + P2b-projektio kauemmas, oletus nimetty). Akseli/Cowork päättää.` |
| B1 toteutus | `<_syRenderComputeKg muutos + runtime-verifiointi>` |
| B2 A0-sovitus | `<säilytetty / yksinkertaistettu / revert + perustelu>` |
| Muuttuneet tiedostot | `<lista — odotus: vain index.html (+ sw.js APP_VERSION)>` |
| Validointi | `<Stop hook · pilot BITTITARKKA (engine ennallaan) · selain-testit · puhelinverifiointi>` |
| Jäi auki | `<lista tai —>` |
| Seuraava askel | `<enginen todellisen progression eliittilaatu-tarkastelu / OBS-021 / H-012 / OBS-024>` |
