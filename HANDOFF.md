# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8. Kurilista: `docs/SELKARANKA.md`.
>
> *Tila: M2 (OBS-022) — `AKTIIVINEN`. DRAFT-COWORK ratifioitu (sisä-blokki-intensifikaatio, mekanismi (i), velocity-agnostinen). Code formalisoi tämän ratifioidusta suunnasta + A1a-d-rakenteesta + A1-orientaatiolöydöksistä — verifioitu repon koodista (§7: repo voittaa). Confirm-then-fix-disipliini: A1 (read-only CONFIRM) ajetaan ENSIN, Akseli ratifioi + täyttää §4-käyrävalidoinnin, vasta sitten A2 (FIX).*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `M2` (OBS-022 — todellinen %-progressio / sisä-blokki-intensifikaatio) |
| Tyyppi | `block-tuning` (intra-blokki-progressiokäyrät) **confirm-then-fix-disipliinillä** (A1 read-only CONFIRM → STOP → Akselin §4-käyrävalidointi → A2 FIX). EI `debug` (ei toistettava bugi vaan suunniteltu käytösmuutos), EI `scope-expansion` (muuttaa olemassa olevan blokki-progression parametreja, ei lisää erillistä ominaisuutta). §4 pakollinen — täytetään A1c:n tuottamasta käyräenumeraatiosta ENNEN A2:ta. |
| Laadittu | 2026-06-02 / Cowork-sessio (DRAFT-COWORK ratifioitu) · Code formalisoi |
| Tila | `AKTIIVINEN` (A1-vaihe) |
| Pohja-HEAD | `3ed7226` (= `76d5aa5` + ROADMAP §0 -doc, kuorma-neutraali → koodipohja identtinen 76d5aa5:n kanssa) · APP_VERSION `4.52.32` |
| Liittyy R-sekvenssin vaiheeseen | Ei yksittäinen R-vaihe. NYT-merkki = vaihe 18 (Round B-β). M2 = milestone OBS-022 (todellinen %-progressio), ajetaan vaiheen 18 rinnalla. |

---

## 1. Tavoite

Saman liikkeen **TAVOITE-intensiteetti nousee (volyymi laskee) viikosta viikkoon SAMAN blokin sisällä** — suunnitellusti, **velocity-agnostisesti** (ei nojaa mitattuun nopeuteen; dippi/apuliikkeet eivät mittaa luotettavasti) ja **rehellisesti näytettynä**.

A1-orientaation (2026-06-02, read-only) toteama nykytila: intra-blokki on **litteä** — kanoninen %-lähde on `vRepsToExpectedPct(reps+Vx)` (LOAD_PCT_RESOLVED, tier 1/2/3), mutta `reps+Vx` ei muutu blokin sisällä → TAVOITE-% pysyy vakiona (esim. Intensity vk9–11 = 88,2 % flat, FINAL 71/71/71 kg). Templaatin `loadPct`-ramppi (esim. 0,85→0,87→0,90) on **dead code** (vReps ohittaa loadPct:n). `computeProgressionTarget` on blokki-vaihe-sokea (ankkuri-suhteellinen Helms-creep). Display: @X% stripattu tier 1/2/3:lta → ei näkyvää intensifikaatiota.

Haluttu lopputila (EI ratkaisua tässä — mekanismi §5): intra-blokki-intensiteetti nousee **yhdestä kanonisesta %-polusta** ilman kilpailevaa signaalia, ja se näkyy käyttäjälle rehellisesti.

## 2. Acceptance criteria

> **A1 = CONFIRM (read-only, runtime-first — `docs/SELKARANKA.md` §5–6 + leve-handoff §5b). STOP ennen A2:ta.** A1a–A1d ovat yhden CONFIRM-gaten neljä faksettia (eivät itsenäisiä korjauksia → poikkeus skeeman A1/A2-sekvenssistä; perusteltu confirm-then-fix-rakenteella). A2–A5 = FIX vasta A1-vahvistuksen + Akselin §4-ratifioinnin jälkeen.

**A1a — velocity-agnostisuus (read-only).** Kanonisen %-polun (`vRepsToExpectedPct` / LOAD_PCT_RESOLVED) "Vx" on **preskriptio-descriptor** (staattinen `slot.targetVx`-haku), EI mitattuun nopeuteen kytketty.
- *Mitattu:* koodiluku `engine.js` LOAD_PCT_RESOLVED + `vRepsToExpectedPct` + runtime-trace (resolveSource).
- *Ehto:* `pctForResolve` johtuu `slot.reps + slot.targetVx`:stä (template-preskriptio), ei `measurements`/velocity-syötteestä → intra-blokki-kiipeäminen toteutettavissa ilman mittausta.

**A1b — per-liike VBT-trust (read-only).** Kartoita VBT-promootio/luottamus (`computeVBTPromotionStatus`, RTF r²-kynnys) per liike.
- *Ehto:* tunnistettu mitkä liikkeet ovat VBT-luotettavia (kyykky / lisäpainoleuanveto) vs ei (dippi / apuliikkeet → staattinen Epley-vReps). Vahvistaa että velocity-agnostinen ramppi on oikea valinta (ei nojata epäluotettavaan mittaukseen).

**A1c — nykykäyrät (read-only).** Enumeroi KAIKKI `data.js`:n nykyiset intra-blokki `loadPct`- (ja reps+Vx-) rampit per blokki-tyyppi (Foundation / Strength / Intensity / Peaking) × per liike.
- *Ehto:* täydellinen käyräkartta **§4-validointiin** (Akseli vahvistaa mitkä rampit oikein, mitkä korjataan). **ÄLÄ muuta käyriä A1:ssä.**

**A1d — yksi-lähteisyys (read-only).** Vahvista voidaanko intra-blokki-ramppi syöttää YHTEEN kanoniseen %-polkuun ilman kilpailevaa signaalia.
- *Ehto:* mekanismi (i) (reps+Vx-mikroporras → vReps) ei luo toista `loadPct ↔ vReps`-fragmentaatiota (F-2-luokan virhe vältetty).

**A2 — FIX: mekanismi (i)** (vasta A1-vahvistuksen + §4-käyrävalidoinnin jälkeen). Intra-blokki-intensifikaatio reps+Vx-mikroportaalla, syötettynä kanoniseen vReps-polkuun. Invarianttien (VL-cap, tier-progression) sisällä.

**A3 — kuormamuutos-portti (pakollinen, F-2-oppi).** Pre-vs-post **LOAD-DIFF-SWEEP** (korjattu HEAD vs pohja, koko Akseli-backup) = **push-ehto** (ei pelkkä invariantti). Lisäksi pilot 64/64 0 virhettä + uusi baseline ratifioituna + **known-pos** (intra-blokki-TAVOITE-% nousee vk-vk) / **known-neg** (deload + blokkiraja ennallaan).

**A4 — display (b).** Intra-blokki-intensifikaatio rehellisesti näkyvissä (otsikko/per-slot ≡ todellinen nouseva intensiteetti).

**A5 — Stop hook + selain.** smoke + pilot exit 0; selain-testit (`?test=1`) ennallaan (748/752 baseline; 4 pre-existing VBT/T9 ei M2:n scopessa).

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (`CLAUDE.md` §2):** VL-cap per blokki (Foundation 25–35 / Strength 15–20 / Intensity 10–15 / Peaking 5–10 %), Tier-progression elite ≤ 0,05 ×/vk (Latella 2020), Deload Δ% −20…−30 %, Rep1 MPV slope. Intra-blokki-intensiteettiramppi **pysyttävä näiden rajojen sisällä** — ei saa tuottaa tier-progressiota yli rajan eikä rikkoa VL-cappia.
- **Mitä EI kosketa (scope-aita, ratifioitu):**
  - **EI makro-periodisaatiota** (blokkien välinen rakenne, blokki-tyyppisekvenssi ennallaan).
  - **EI deload/regain-suppressiota** (`computeProgressionTarget` deload-passthrough + regain-multiplier ennallaan).
  - **EI slot-resolveria / sweep-invariantteja** (F-2:n same-liike-clamp Branch A/15c/Branch B + `auditSp2SlotLoad`/`testSp2SlotLoadInvariant`/`testKotiEqualsLiveAccessory` ennallaan).
  - **EI `computeProgressionTarget`-creep-logiikkaa** (ankkuri-Helms-creep on blokki-sokea by-design; M2 ei lisää sinne blokki-vaihe-termiä — mekanismi (i) toimii vReps-tasolla).
- **M2:n lokus:** `data.js` weekDefs (reps+Vx per viikko per blokki) + LOAD_PCT_RESOLVED (vReps-target) + display. Mekanismi (i) = reps+Vx-mikroporras.
- **Tekniset:** vanilla JS (`.js`/`.mjs`), ei npm-riippuvuuksia, ES-modulit, Stop-hook-yhteensopiva.

## 4. Atletti-vastaukset critical questions -kysymyksiin

> Pakollinen (`block-tuning`). **Code EI aloita A2:ta ennen kuin tämä on täytetty.** Täytetään A1c:n tuottamasta käyräenumeraatiosta: Akseli validoi mitkä intra-blokki-intensiteettikäyrät (reps+Vx- / loadPct-rampit per blokki × liike) ovat oikein ja mitkä korjataan mekanismi (i):n mukaisiksi.

`<TÄYTETÄÄN A1c-raportin jälkeen — Akseli ratifioi käyrät.>`

## 5. Taustapäätökset ja hylätyt vaihtoehdot

1. **Mekanismi (i) ratifioitu (kirkastettu):** intra-blokki-intensifikaatio toteutetaan **reps+Vx-mikroportaalla** → `vReps(reps+Vx)` nousee blokin sisällä → TAVOITE-% nousee yhdestä kanonisesta lähteestä.
   - **Hylätty (ii):** loadPct takaisin intensiteettisignaaliksi vReps:n rinnalle → loisi `loadPct ↔ vReps`-kilpailun = F-2-luokan fragmentaatio. **Hylätty (iii):** blokki-vaihe-termi `computeProgressionTarget`:iin → sotkisi autoregulaatio-creepin ja periodisaation; rikkoo scope-aitaa (ei kosketa creep-logiikkaa).
2. **Velocity-agnostinen (kirkastettu):** intra-blokki-kiipeäminen on PRESKRIPTIO (staattinen reps+Vx-haku), EI mitattu nopeus. Perustelu: dippi + apuliikkeet eivät mittaa luotettavasti (A1b vahvistaa) — kiipeäminen ei saa nojata epäluotettavaan signaaliin. Within-session VBT-autoregulaatio (velocity-stop, Vx-bias) säilyy erillisenä kerroksena, M2:n ulkopuolella.
3. **Yksi-lähteisyys:** ramppi YHTEEN kanoniseen %-polkuun (vReps) — value-resolution-auditin (F-1…F-4) oppi: ei toista divergenttiä signaalia.

## 6. Avoimet kysymykset

> Code raportoi A1a–A1d:n tulokset (VAIHE 1). Akseli ratifioi ENNEN A2:ta.

- **Q1:** A1a–A1d:n löydökset (Code raportoi A1-vaiheessa) — vahvistavatko mekanismi (i):n + velocity-agnostisuuden toteutettavuuden?
- **Q2 (A1c:n jälkeen):** §4-käyrävalidointi — mitkä nykyiset intra-blokki-rampit ovat oikein, mitkä korjataan?

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot · LOAD-DIFF-SWEEP>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<seuraava handoff tai R-sekvenssin vaihe>` |
