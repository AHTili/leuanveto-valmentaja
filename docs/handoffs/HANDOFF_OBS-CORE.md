# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Laadittu 2026-05-30. SP-2 slot-resolveri-ydin. A1 = LAAJA read-only -sweep (Selkäranka §5b) ENNEN korjausta — Cowork lokalisoi pinnan (slot-resolveri-perhe), Code ajaa täyden per-slot-kartan yhdellä ajolla.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `OBS-CORE` (SP-2 slot-resolveri: johdonmukaiset slot-kuormat) |
| Tyyppi | `debug` (confirm-then-fix + laaja-diagnostiikka-A1) |
| Laadittu | 2026-05-30 / Cowork-sessio |
| Tila | `VALMIS (ROOT-A-osa; rate-limit + volyymi-apuliike eriytetty omiksi handoffeiksi)` |
| Liittyy R-sekvenssin vaiheeseen | VALMIS-1-luokan ydinkorjaus (SP-2). **EI siirrä NYT-merkkiä** (vaihe 18 ennallaan) — vahvistetaan A1-kartan jälkeen. |
| Pohja-HEAD | `bfab302` · APP_VERSION `4.52.26` |

---

## 1. Tavoite

Slot-resolveri tuottaa **johdonmukaiset slot-kuormat** maanantai-sessiossa (ja muissa): **back-off < pääliike**, apuliike-kuormat järkeviä suhteessa päähän, **otsikko-% ≡ todellinen kuorma/%**, ja **Koti-preview = live-session** (yksi totuuslähde slottia kohti). Lopputilassa atletti ei näe back-offia raskaampana kuin pää eikä kahta eri arvoa samalle slotille.

## 2. Acceptance criteria

> Tyyppi `debug`: "repro → odotettu vs. todettu". A1 = LAAJA read-only confirm-sweep (§5b) ENNEN korjausta. A2-fix muuttaa TODELLISIA kuormia → A3 baseline-ratifiointi (ei bittitarkka).

- **A1 — LAAJA READ-ONLY SWEEP (STOP-gate, mittari-ensin).** Aja Akselin backupilla koko maanantai-session (9 slottia: pää leuka 4×4 V2 · back-off leuka 3×5 V3 · 7 apuliikettä ml. Heavy negative leuka, Leuanveto chest-to-bar, Chest-supported row, Lisäpainodippi 3×10, Hauiskääntö, Face pull, Ab wheel) slot-resolveri. **Dumppaa per slot:** assigned kuorma (kg) · laskentapolku (LOAD_PCT_RESOLVED / SLOT_LOAD_RESOLVED / resolveAccessorySlot / _syRenderComputeKg) · inputit (e1RM + lähde, vReps-%, velocity-zone, set-role, reps) · otsikko-% vs todellinen-% · **Koti-preview-arvo vs live-session-arvo**. **Identifioi juurisyy(t):** miksi back-off(64)>pää(61), apuliike(73,5)>pää, otsikko≠todellinen, Koti(62)≠live(61) — **yksi yhteinen root vai useita?** **STOP + raportoi TÄYSI kartta + scope-ehdotus. ÄLÄ korjaa.**
- **A2 — FIX (vasta A1-kartan + scope-ratifioinnin + luvan jälkeen).** Slot-resolveri-korjaus A1:n juurisyyn mukaan + SP-2-assertiot (esim. back-off ≤ pää, Koti ≡ live). **Repro → odotettu:** back-off < pää, apuliike-kuormat järkeviä, otsikko ≡ todellinen, Koti = live.
- **A3 — UUSI BASELINE (STOP-gate, kuten H-010).** A2 muuttaa **todellisia kuormia** → pilot **EI bittitarkka**. Per-solu-diff (vanha→uusi) + uskottavuus-verifiointi → **STOP + esitä Akselille → ratifiointi ennen committia.** Sallitut diffit nimettävä. + puhelinverifiointi.
- **A4 — Regressio-eheys.** Identity-gate 0, makro-periodisaatio + OBS-026/028/030 + H-010/011 ennallaan (vain slot-load-resoluutio muuttuu). Selain-testit. APP_VERSION-bump.

## 3. Reunaehdot ja scope-aita (alustava — A1-kartta tarkentaa)

- **Sovellettavat invariantit (CLAUDE.md §2):** VL-cap/deload/tier/e1RM-kaavat ennallaan. Slot-kuorma-johdonmukaisuus on uusi rajoite, ei tutkimusinvariantin muutos.
- **Mitä EI kosketa (A1 vahvistaa lopullisen rajan):**
  - Makro-periodisaatio (blokki-V3→V2→V1, deloadit), identity-gate (H-010), data-flow (H-011), OBS-030 progression-attribuutio, OBS-026/028 done-detektio.
  - recommend()-progressio-engine (computeProgressionTarget) ELLEI A1 osoita root:n olevan siellä → silloin scope-laajennus ratifioidaan erikseen.
- **Todennäköinen muutosalue (A1 vahvistaa):** `engine.js` slot-load-resoluutio (LOAD_PCT_RESOLVED / SLOT_LOAD_RESOLVED / `resolveAccessorySlot`) + `index.html` `_syRenderComputeKg` (Koti=live-yhtenäisyys).
- **Tekniset:** vanilla JS, ES-modulit, ei uusia riippuvuuksia.
- **PRE-FLIGHT + peruutusankkuri (Selkäranka 1–2):** HEAD `bfab302`, main, working tree puhdas. **A1 read-only → ei backup-haaraa vielä; A2:lle tuore ankkuri + uusi baseline.**

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu (`debug`). Slot-kuorma-johdonmukaisuus-säännöt (back-off < pää jne.) ovat valmennuksellisesti ilmeisiä; A2:n tarkat assertiot ratifioidaan A1-kartan jälkeen.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Tehdyt päätökset (Akseli 2026-05-30; älä re-litigoi):**
- **A1 = LAAJA per-slot-sweep ENNEN korjausta** (Selkäranka §5b): slot-resolveri on runtime-/datariippuvainen (e1RM-lähde, vReps, velocity-zone, set-role) → staattinen analyysi tuottaisi "oikean perheen, väärän mekanismin". Yksi laaja Code-ajо > monta staattista kierrosta.
- **A2 muuttaa todellisia kuormia** → uusi pilot-baseline + A3-ratifiointi (ei bittitarkka, kuten H-010). Tämä on tiedostettu ja hyväksytty SP-2-ytimen hinta.

**Hylätty:**
- **Suora A2-korjaus ilman A1-karttaa** — neljä oiretta (back-off>pää, apuliike>pää, otsikko≠todellinen, Koti≠live) voivat olla yksi root tai useita; korjaaminen ennen kartoitusta riskeeraa väärän mekanismin (Selkäranka 5–6).

## 6. Avoimet kysymykset (A1 vastaa read-only ENNEN A2:ta)

1. **Yksi root vai useita?** Ovatko neljä oiretta saman slot-resolveri-juuren ilmentymiä (esim. vReps-% sovelletaan väärin per set-role) vai erillisiä (back-off-loadPct-kaava ≠ pää; apuliike resolveAccessorySlot-polku; Koti≠live kahden eri funktion ero)?
2. **Scope:** osuuko root slot-resolveriin (engine.js/index.html-preview, oletettu scope) vai progressio-engineen (computeProgressionTarget) → scope-laajennus ratifioitava ENNEN A2:ta.
3. **A3-baseline:** mitkä pilot-solut muuttuvat A2:n myötä + ovatko muutokset uskottavia (back-off laskee pään alle jne.)?

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-31 |
| Muuttuneet tiedostot | `engine.js` (ROOT-A — commit `e36c3df`) · `test-runner.js` + `sw.js` + `index.html` (SP-2-selainassertio + APP_VERSION 4.52.27 — commit `4e86008`). Molemmat pushattu origin/main. |
| Tehdyt päätökset | **ROOT-A (back-off kanoninen e1RM) TOIMITETTU+PUSHATTU+puhelinverifioitu** (4.52.27, back-off 51,5 < pää 65,5, Koti=live). SP-2-selainassertio lukitsee inflaatio-regression. Slot-resolveri diagnosoitu **3 erilliseksi juureksi**: (1) ROOT-A — back-off e1RM `sessionEffectiveE1RM = target/loadPct` → kanoninen `currentE1RMSystem` (**KORJATTU**) · (2) rate-limit×back-off — 19 suppressed-pää-tapausta joissa back-off>pää (`stash@{0}`) · (3) volyymi-apuliike — saman-liike-apuliike käyttää `getMovementProgress.suggestedLoadKg`:tä (≈ pään työkuorma), ei kanonista kevennettyä kuormaa (`index.html:12886`, ohittaa UI-gate 12875 role-poissulun). Apuliike + rate-limit **eriytetty omiksi handoffeiksi**. |
| Validointi | Smoke PASS · pilot 138 muuttumaton (selaintesti ei kosketa pilotia) · SP-2-assertio PASS post-ROOT-A (known-neg pre-ROOT-A 94>92) · **puhelinverifiointi LÄPI** (Akseli 2026-05-31: back-off 51,5 < pää 65,5, Koti=live). |
| Jäi auki | **(A) rate-limit×back-off:** 19 tapausta joissa pää-target suppressoitu back-offin e1RM-kuorman alle; korjaus (clamp c / rate-limit-säteily b) rippaa muihin audit-checkeihin (+6/+16). SP-2-pilot-audit-check + a/b/c-data `stash@{0}`. **(B) volyymi-apuliike:** saman-liike-apuliike ("Loaded volume-leuka") renderöityy `getMovementProgress.suggestedLoadKg`:llä (73,5/65 ≈ pää) — vaatii recommend()-resoluution apuliikkeille + UI-gate `index.html:12875` laajennuksen role="accessory":lle TAI apuliikkeen progression-lähteen kanoniseksi. |
| Seuraava askel | 2 eriytettyä Cowork-handoffia: rate-limit×back-off (`stash@{0}`) + volyymi-apuliike-progression. ROADMAP NYT-merkki **ennallaan** (vaihe 18). Housekeeping-huomio: OBS-027-A2-handoff jäi arkistoimatta (lingering HEAD:ssä ennen tätä nollausta). |
