# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.
>
> *Tila: H-003 AKTIIVINEN — Akseli ratifioi 2026-05-26 ("aktiivinen"). Päätökset §5:ssä lukittu: vaihtoehto A (note-stylefix), sanamuoto `"95 %"` välilyönnillä, ei uusia yksikkötestejä. §6 avoimia kysymyksiä: ei yhtään. H-002 sulkeutui `d5786e0`:ssä; H-003 viimeistelee SLOT_MISMATCH-detektorin pohjapuhtaaksi yhdellä kapealla note-stylefixilla. Vaikutus: 1 vk14 TI Takakyykky -slot (decision-tree-vihje toiselle päivälle, eri mekanismi kuin H-002:n cross-ref-skaalaus) lakkaa laukaisemasta false-positiivia → pilot-baseline 137 → 136.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-003` |
| Tyyppi | `refactor` — note-stylefix: data.js r. 7258 vk14 TI Takakyykky `primaryNote`-stringissä `"@95%"` → `"95 %"` (poista @-merkki + lisää välilyönti). Detektor-regex (`@\s*\d+\s*%`) ei matchaa. A0 bittitarkka (note-tekstin tyylimuutos ei vaikuta engine-laskentaan). |
| Laadittu | 2026-05-26 / Cowork-sessio |
| Tila | `AKTIIVINEN` (ratifioitu 2026-05-26; vaihtoehto A + sanamuoto `"95 %"` lukittu) |
| Recon-pohja | HEAD `d5786e0` (H-002 suljettu, 7 committia H-002-arc:ssa origin/main:issa). `data.js` ei H-002:n läpi koskettu. |
| Odotettu HEAD (PRE-FLIGHT) | HEAD = se commit joka committaa tämän HANDOFF.md-version. Verifiointi: `git rev-parse HEAD` == `git log -1 --format=%H -- HANDOFF.md`. **Ei literaalia SHA:ta** — tiedosto ei voi sisältää sen luovan commitin SHA:ta. Recon-pohja `d5786e0`. |
| Liittyy R-sekvenssin vaiheeseen | Pohjapuhtaus-jatkotyö, viimeistelee H-001 + H-002 -arkin. **Ei kuulu yhteenkään yksittäiseen R-vaiheeseen.** ROADMAP NYT-merkki = vaihe 17 (Round B-α-2). |

**Tyyppivalinnan perustelu:** `refactor`, koska muutos on yhden tiedoston yhden rivin tekstimuutos, ei käytösmuutosta. data.js:n note-stringi muuttuu atletin näkymässä `"@95%"` → `"95 %"` (merkitys säilyy, AI Block Tuning näkee saman desimaaliarvon ehdollisena vihjeenä). SLOT_MISMATCH-detektor lakkaa laukaisemasta false-positiivia, koska regex vaatii `@`-merkin ennen numeroa.

---

## 1. Tavoite

Pilot-baseline `INVARIANT_VIOLATION_SLOT_MISMATCH`-flagit 1 → 0 (kokonaisbaseline 137 → 136). Atletin decision-tree-vihje vk14 TI Takakyykky -notessa säilyttää koko semanttisen sisältönsä; poistuu vain `@`-merkki numeron edestä. AI Block Tuning -syöte muuttumaton (notesta ei tule muutosta serialization-vaiheessa, koska H-002:n cross-ref-haara ei aktivoidu (slot ei kanna `refScale`/`nominalLoadPct`-metadataa) ja pelkkä detektor-flaginpoisto ei vaikuta `_normalizeSlotForTuningSerialization`-haarautumiseen — note normalisoituu jo H-001:n logiikalla loadPct-pohjaiseksi). Engine-käytös bittitarkasti ennallaan.

## 2. Acceptance criteria

> Tyyppi `refactor`. **A0 on pääkriteeri** (käytös muuttumaton). A1 toteuttaa korjauksen, A2 vahvistaa lopputuloksen. Skeema: `docs/ACCEPTANCE_CRITERIA_SKEEMA.md`. Rivinumerot ovat HEAD `d5786e0` -hetkeltä ja suuntaa-antavia — Code paikantaa funktionimellä + grep:llä (`"@95%"` data.js:ssä on uniikki).

**A0 — Engine-käytös bittitarkasti muuttumaton (refactor-pääkriteeri)**
- *Mitattu miten:* Stop hook -ketju: smoke + pilot. Per-commit-rytmi: 1 B-commit = 1 ajopari.
- *Onnistumisen ehto:* exit 0; pilot tuottaa identtiset kuorma-, rep- ja Vx-arvot — "64/64 päivää, 0 virhettä". `suggestedLoadKg` ja `resolvedLoadKg` ennallaan kaikissa sloteissa (note-tekstin tyylimuutos ei vaikuta laskentaan).

**A1 — `data.js` vk14 TI Takakyykky note-stylefix**
- *Ehto:* `data.js` r. ~7258 (paikanna grep:llä `grep -n "harkitse 1 ekstra-sarja" data.js` — string on uniikki) `tiDay`-kutsun `primaryNote`-parametrissa: `"@95%"` → `"95 %"` (poista @-merkki, säilytä numero, lisää välilyönti numeron ja %-merkin väliin). Muu primaryNote-sisältö (PEAKING DECISION-TREE -konteksti, Pritchard 2016 -viite, muu sanamuoto) ENNALLAAN.
- *Mitattu miten:* `git show <B1-commit> -- data.js` näyttää tasan 1 rivin muutoksen (`primaryNote`-stringi), netto-diff = 0 riviä (1 muokkaus). Runtime-tarkistus: pilot-trace vk14 TI Takakyykky -slot.note alkaa `"🎯 PEAKING DECISION-TREE: ... → harkitse 1 ekstra-sarja 95 % V1 LA-päivän opener-rehearsalissa. ..."`.
- *Onnistumisen ehto:* notesta poistuu @-merkki ennen 95-numeroa; muu note-teksti merkki merkiltä ennallaan; A0 pitää.

**A2 — Pilot-baseline 137 → 136 (SLOT_MISMATCH-flagit 1 → 0)**
- *Ehto:* H-003:n jälkeen pilot raportoi 136 audit-flagia. Kaikki `INVARIANT_VIOLATION_SLOT_MISMATCH`-emissiot poistuvat (H-002:n jälkeen jäljellä oli 1 vk14 TI -flagi).
- *Mitattu miten:* smoke + pilot ennen H-003 (137 baseline, 1 SLOT_MISMATCH) ja H-003:n B1-commitin jälkeen → ero täsmälleen 1 SLOT_MISMATCH-flagi. Pilot ei raportoi yhtään SLOT_MISMATCH-emissiota.
- *Onnistumisen ehto:* pilot raportoi 136 audit-flagia, 0 SLOT_MISMATCH. Akseli ratifioi baseline-päivityksen 137 → 136.

**Commit ↔ AC -kartta:**
- commit B1 → A1 + A2 (yksi commit, koska note-stringi on yksiselitteinen rajaehtona ja A2 verifioituu automaattisesti A1:n jälkeen pilotin näkökulmasta). A0 pitää B1:ssä.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (`CLAUDE.md` §2):** H-003 **ei muuta yhtään §2-tutkimusinvarianttia.** Automaattista, koska kosketaan vain note-tekstiä — ei `recommend()`-polkua, e1RM-funktioita, mesosykli-rakennetta, refScale-mekanismia, tutkimus-pohjaisia rajaehtoja.
- **Mitä EI kosketa:**
  - `data.js` mesosykli-rakenne, slot-laskenta, `tiDay`-funktion signature/logiikka, vk14:n muut päivät (MA, TO, LA), vk14 TI:n muut parametrit (loadPct 0.93, sets 2, reps 1, Vx 1, backoff-konfiguraatio, finisher, peaking-faasi).
  - `engine.js` (mitään).
  - `tools/engine-pilot/lib/audit-engine.mjs` SLOT_MISMATCH-detektor — pidetään tiukkana, ei laajenneta avainsana-ohituksilla (vrt. §5 hylätty vaihtoehto C). H-002:n cross-ref-haara säilyy ennallaan.
  - `tools/engine-pilot/lib/trace-capture.mjs` (mitään).
  - `test-runner.js` — uutta testitapausta ei tarvita; H-001:n + H-002:n olemassa olevat SLOT_MISMATCH-testit kattavat detektorin käytöksen, A2 verifioituu pilot-tasolla.
  - Vaihtoehto B (slot-metadata `isDecisionTreeHint`) ja vaihtoehto C (audit-engine avainsana-ohitus) — hylätty §5:ssä.
- **Tekniset reunaehdot:** vanilla JavaScript (`.js`), ei uusia npm-riippuvuuksia, ei build-stepiä. Stop hook -yhteensopiva. Selain-yksikkötestit eivät kaadu (557 testitapausta H-002:n jälkeen pysyy vihreänä, koska note-teksti-muutos ei kosketa testattuja funktioita).

## 3.5 Claude Code -operointi — H-003-konkretisointi Selkäranka 1–9:lle

> Selkäranka 1–9:n **kanoninen määrittely on `docs/SELKARANKA.md`**. Tämä osio ei toista määrittelyä — antaa vain H-003-spesifiset konkretisoinnit. Ristiriidassa `docs/SELKARANKA.md` voittaa.

**1. PRE-FLIGHT + STOP** — H-003-konkretisointi:
- Lukujärjestys `CLAUDE.md` §8: `CLAUDE.md` → `docs/SELKARANKA.md` → `ROADMAP.md` → `HANDOFF.md`. Jos §0 Tila ≠ `AKTIIVINEN` → STOP. ROADMAP NYT-merkki = vaihe 17 (vahvista).
- Odotettu haara: `main`. **Odotettu HEAD:** HEAD = se commit joka committaa tämän HANDOFF.md-version. **Älä oleta `d5786e0`:ta** — se on H-003:n recon-pohja, ei HEAD.
- `git status --porcelain` tyhjä session-aikaisista muutoksista; pre-existing untracked `PLAN.md`, `streetlifting_16w_v4.32.8.csv`, `wizard/wizard.html` sallittu. CRLF-kohina → STOP, ÄLÄ normalisoi.
- **Recon-paikannus:** aja `grep -n "harkitse 1 ekstra-sarja" data.js` — odotettu: yksi osuma r. ~7258 (tiDay-kutsun primaryNote-parametri). Jos osumia ≠ 1 → STOP, raportoi.
- **Baseline-ajo:** smoke + pilot — odotettu `"64/64 päivää, 0 virhettä, 137 audit-flagia"` (1 SLOT_MISMATCH = vk14 TI Takakyykky). Jos ≠ → STOP.

**2. PERUUTUSANKKURI:**
- `git branch backup-pre-h003-<HEAD-SHA>` ennen ensimmäistä muutosta. `<HEAD-SHA>` = `git rev-parse --short HEAD` PRE-FLIGHT-hetkellä (HANDOFF.md-AKTIIVINEN-commitin SHA).
- H-002:n backup-anchor `backup-pre-h002-c8c89f4` voi jäädä toistaiseksi (poistetaan H-003:n jälkeen jos kaikki vakaata — Akselin päätös push-vaiheessa).

**3. SCOPE-LUKKO** — H-003:n valkolista (sallittu `git diff`; STOP jos ylittää):
- `data.js` — VAIN r. ~7258 `tiDay`-kutsun `primaryNote`-parametrissa: `"@95%"` → `"95 %"`. EI muita data.js-muutoksia. EI muiden notesien koskemista. EI commenttien muokkausta. EI tyylimuutoksia muualla.
- **EI** `engine.js`, **EI** `audit-engine.mjs`, **EI** `trace-capture.mjs`, **EI** `test-runner.js`, **EI** muita tiedostoja.

**4. DIFF-CONTROL erillisinä committeina:**
- 1 B-commit (B1). Ei muita committeja paitsi alku-COMMIT 0 (HANDOFF.md AKTIIVINEN -aktivointi). Yhteensä 2 committia origin/main:iin pushattavaksi.

**5. STOP-EHDOT** *(jokainen = pysähdy + raportoi + odota Akselia):*
- Kaikki PRE-FLIGHT-STOPit voimassa.
- smoke FAIL → STOP. pilot ≠ "64/64 päivää, 0 virhettä" → STOP.
- `git diff` koskettaa scope-aidan ulkopuolta → STOP.
- Pilot-baseline B1:n jälkeen ≠ 136 → STOP, raportoi mikä flagi ei kadonnut tai mikä uusi flagi ilmestyi.
- grep `"harkitse 1 ekstra-sarja"` paljastaa muita osumia kuin r. ~7258 → STOP, kysy Akselilta ennen muutosta.

**6. MITTARI-ENSIN** — H-003-konkretisointi:
- H-003 ei tuo uutta gate-syöttöistä invarianttia; A1 + A2 ovat suoraan pilot-tasolla verifioitavissa. Mittari-ensin-disipliini täyttyy automaattisesti pilot-baseline-vertailussa (137 ennen, 136 jälkeen, ero 1 SLOT_MISMATCH täsmälleen vk14 TI Takakyykky -slotista).
- Tunnettu-positiivinen ennen muutosta: pilot raportoi 1 SLOT_MISMATCH vk14 TI -slotille (note `"... @95% ..."`, loadPct 0.93, notePct 0.95, deltaPp 2.0). Tunnettu-positiivinen muutoksen jälkeen: ei matchausta (note `"... 95 % ..."`, regex `@\s*\d+\s*%` ei laukaise). Aritmetiikka käsin: regex vaatii `@`-merkin → poistettu → 0 matchia → ei flagia.

**Per-commit-rytmi** *(yhdistää kohdat 3, 5, 6):*
1. Toteuta A1-muutos (1 rivi data.js:ään) scope-aidan sisällä.
2. smoke + pilot. Odotettu: 64/64, 0 virhettä, 136 audit-flagia, 0 SLOT_MISMATCH.
3. Jos ≠ 136 → STOP. Jos = 136 → kirjoita commit (kohta 7).
4. Poikkeustilanteessa palautus: `git reset --hard backup-pre-h003-<sha>`.

**7. KEVYT LEDGER-RIVI:**
- Commit-otsikko: `refactor(H-003): B1 — vk14 TI Takakyykky note-stylefix (poista @-merkki decision-tree-vihjeestä)`
- Commit-body: Juurisyy (SLOT_MISMATCH-detektor matchaa decision-tree-vihjeeseen) + Muutokset (data.js:rivi) + `Acceptance criteria: A1 + A2.` + `Tutkimusinvariantit (CLAUDE.md osio 2): EI muutettu.` + `Smoke + pilot regression PASSED (64/64 päivää, 0 virhettä, 136 audit-flagia).` + `Backup-anchor: backup-pre-h003-<sha>.` + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` + `Diff: 0 netto-riviä (1 rivi muokattu).`

**8. EI PUSHIA ilman lupaa:**
- B1 valmistunut → push-raportti Akselille: 2 committia (COMMIT 0 + B1); per commit smoke + pilot -tulos + netto-diff; baseline-päivitys 137 → 136; vahvistus ettei SLOT_MISMATCH-emissioita jäljellä. Lopeta kysymykseen "PUSH OK?".

**9. LEDGER-IMMUTABILITEETTI:** Code ei rekonstruoi kanonisen ledgerin literaaleja. Jo pushattua committia ei muuteta.

## 4. Atletti-vastaukset critical questions -kysymyksiin

**Ei sovellu** — tyyppi on `refactor`, ei `block-tuning`. Ei atletti-vastauksia tarpeen.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**1. Vaihtoehto A (note-stylefix) ratifioitu 2026-05-26.** Akseli valitsi Cowork-suosituksen mukaisesti. Perustelu: minimaalisin muutos (1 rivi, 1 tiedosto, 1 commit), atletti-näkymässä semanttisesti merkityksetön tekstimuutos (`"@95%"` → `"95 %"` säilyttää desimaaliarvon decision-tree-vihjeenä), detektor pysyy yksinkertaisena ilman heuristiikkoja, paikallinen korjaus vastaa paikallista ongelmaa.

**2. Hylätyt vaihtoehdot:**

- *Vaihtoehto B: slot-metadata `isDecisionTreeHint: true` (Option X -style).* Hylätty: overkill yhdelle slotille. Rakenteellinen abstraktio on perusteltu vain jos samoja tapauksia odotetaan tulevaisuudessa useita — vk14 TI on ainoa decision-tree-vihje koko 16-viikon mesosyklissä, ja tulevat handoffit kohdistuvat eri ongelmiin (profile-konsistenssi H-004, velocity-dataketju H-005). Jos uusia decision-tree-vihjeitä lisätään myöhemmin, B-vaihtoehto voidaan adoptoida silloin — H-003:n stylefix ei estä tätä.
- *Vaihtoehto C: audit-engine avainsana-ohitus (regex matchaa "DECISION-TREE" tai "harkitse").* Hylätty: heuristinen ohitus rikkoo Selkäranka 6:n "mittari-ensin"-disipliinin (heuristiikat eivät ole verifioitavia rajaehtoja). Lisäksi hauras suomenkielisen sanaston variaatiolle ("mieti", "arvioi", "harkitse") ja aiheuttaa potentiaalisen false-negativen jos legitiimi @-mismatch löytyy slotista jossa on ohitus-avainsana.

**3. Sanamuoto-valinta `"95 %"` (välilyönnillä) ei `"95%"` (ilman).** Suomen kielen typografiset säännöt suosivat välilyöntiä numeron ja %-merkin välissä. Lisäksi sama tyyli kuin data.js:n muissa note-stringeissä joissa @-merkkiä ei käytetä (esim. r. 6066 `"Lisäpainodippi BW+X kg"`-tyyli). Detektor-regex `@\s*\d+\s*%` ei matchaa kummassakaan tapauksessa @-merkin puuttumisen takia, mutta `"95 %"` on tyylillisesti johdonmukainen.

**4. Ei B/C-vaihtoehtojen vertailutestauksia.** H-003 ei tarvitse uusia yksikkötestejä: olemassa olevat H-001:n + H-002:n SLOT_MISMATCH-detektor-testit kattavat detektorin käytöksen ennallaan (vaihtoehto A ei muuta detektoria). A2:n verifiointi tapahtuu pilot-baseline-vertailulla 137 → 136, mikä on rakenteellisesti vahvempi todiste kuin uusi yksikkötesti.

## 6. Avoimet kysymykset

**Ei avoimia kysymyksiä.** Vaihtoehto A ratifioitu (§5 kohta 1), sanamuoto määritelty (§5 kohta 3), scope-aita kapeampi kuin H-002:ssa (1 tiedosto, 1 rivi). Code voi PRE-FLIGHTin jälkeen edetä suoraan B1:een.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | 2026-05-26 |
| Muuttuneet tiedostot | `HANDOFF.md` (+99/-26, COMMIT 0 + tämä sulku-commit), `data.js` (+1/-1 r. 7258, B1). Kokonais-diff (H-003-arc): +100/-27 = 73 net riviä, 2 tiedostoa. |
| Tehdyt päätökset | (1) **Vaihtoehto A ratifioitu** (note-stylefix) Akselin valinnalla 2026-05-26 yli vaihtoehtojen B (slot-metadata `isDecisionTreeHint`) ja C (audit-engine avainsana-ohitus). Perustelu §5 kohta 1: minimaalisin muutos (1 rivi, 1 tiedosto, 1 commit), semanttisesti merkityksetön atletti-näkymässä, detektor pysyy yksinkertaisena. (2) **Sanamuoto `"95 %"` lukittu** (välilyönnillä) yli `"95%"` (§5 kohta 3): suomen kielen typografiset säännöt + johdonmukaisuus data.js:n muiden note-stringien kanssa. (3) **B1 toteutettu yhtenä commitina** scope-kapeudella: 1 rivi data.js r. 7258, ei muita muutoksia (engine.js, audit-engine.mjs, trace-capture.mjs, test-runner.js EI kosketettu). (4) **Ei uusia yksikkötestejä** (§5 kohta 4): H-001:n + H-002:n SLOT_MISMATCH-detektor-testit kattavat detektorin käytöksen ennallaan; A2 verifioituu pilot-baseline-vertailulla (rakenteellisesti vahvempi todiste). |
| Validointi | Stop hook: PASSED (smoke + pilot vihreä B1:n jälkeen). Regressio-pilot: 64/64 päivää, 1150 settejä, 0 virhettä. Baseline-päivitys 137 → 136 ratifioitu (Δ −1, 🐛 85 → 84). **INVARIANT_VIOLATION_SLOT_MISMATCH 1 → 0** — pohjapuhtaus saavutettu. Selain-testit (`?test=1`): 557 testitapausta H-002:n jälkeen pysyvät vihreänä (B1 ei kosketa testattuja funktioita, A2 verifioituu pilot-tasolla). Push: `d5786e0..76f3262`, ahead = 0 origin/main:in suhteen. Post-push smoke + pilot: 64/64, 0 virhettä, 136 audit-flagia, 0 SLOT_MISMATCH. |
| Jäi auki | — (kaikki SLOT_MISMATCH-flagit nollissa, pohjapuhtaus-arc H-001 + H-002 + H-003 valmis: 7 → 1 → 0 SLOT_MISMATCH). |
| Seuraava askel | H-004 luonnos Coworkissa (profile-consistency: `profile.prs` muscle-up + `profile.bw` 89/91), tai vaihtoehtoisesti H-005 (velocity-dataketju Enode/Oura → AI-syöte) — Akselin priorisointi. ROADMAP.md NYT-merkki säilyy vaiheessa 17 (Round B-α-2) — H-003 oli pohjapuhtaus-jatkotyö, ei R-vaihe-siirto. Peruutusankkurit `backup-pre-h001-ff393b9`, `backup-pre-h002-c8c89f4`, `backup-pre-h003-d5786e0` säilytetään toistaiseksi — Akseli päättää siivouksesta H-004 + H-005 -vakautumisen jälkeen. |
