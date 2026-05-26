# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.
>
> *Tila: H-002 AKTIIVINEN — Akseli ratifioi 2026-05-26 ("aktiivinen"). K1–K4 Cowork-suositukset (§6) hyväksytty implisiittisesti ratifioinnin kautta: K1 = laDay ainoa cross-ref-with-scaling -site (Code vahvistaa PRE-FLIGHTissä grep:llä), K2 = toleranssi 0,5 pp, K3 = `buildMarkdownNarrative` ei muutosta, K4 = kenttänimet `refScale` + `nominalLoadPct`. H-001 sulkeutui `c8c89f4`:ssä; H-002 jatkaa AI Block Tuning -parantamisen polkua **Option X:llä** (additiivinen `refScale` + `nominalLoadPct` -slot-metadata; refScale-aware engine + detektor; data.js cross-ref-loading-mallia ja note-stringejä ei muuteta). Vaikutus: 6 paused/pin SLOT_MISMATCH-flagia eliminoituu legitiimeinä cross-ref-skaalauksina → pilot-baseline 143 → 137. vk14 TI -case (1 flagi, eri mekanismi — decision-tree-vihje toiselle päivälle) jää erilliseen jatkohandoffiin **H-003**.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-002` |
| Tyyppi | `refactor` — additiivinen: surface-aa olemassaolevan refScale-laskennan slot-metadatana + laajentaa engine + audit-engine cross-ref-tietoisiksi. Ei design-muutosta, ei käytösmuutosta (A0 bittitarkka). |
| Laadittu | 2026-05-25 / Cowork-sessio |
| Tila | `AKTIIVINEN` (ratifioitu 2026-05-26; K1–K4-suositukset hyväksytty) |
| Recon-pohja | HEAD `c8c89f4` (H-001 suljettu, 8 committia origin/main:issa). `engine.js` viimeksi muuttunut commitissa `dbd3045` (B2-test fix-up), `audit-engine.mjs` commitissa `64d94ca` (B2), `data.js` ei H-001:n läpi koskettu. |
| Odotettu HEAD (PRE-FLIGHT) | HEAD = se commit joka committaa tämän HANDOFF.md-version. Verifiointi: `git rev-parse HEAD` == `git log -1 --format=%H -- HANDOFF.md`. **Ei literaalia SHA:ta** — tiedosto ei voi sisältää sen luovan commitin SHA:ta. Recon-pohja `c8c89f4`. |
| Liittyy R-sekvenssin vaiheeseen | Pohja-puhtaus-jatkotyö, sama kategoria kuin H-001 (palvelee R-sekvenssin vaiheita 17–19 epäsuorasti AI Block Tuning -putken laadun kautta). **Ei kuulu yhteenkään yksittäiseen R-vaiheeseen.** ROADMAP NYT-merkki = vaihe 17 (Round B-α-2). |

**Tyyppivalinnan perustelu:** `refactor`, koska kaikki muutokset ovat additiivisia eivätkä muuta käyttäytymistä. `data.js`:ään lisätään kaksi metadatakenttää (`refScale`, `nominalLoadPct`) cross-ref-slot-producereissa — surface-aa olemassaolevan paikallisen laskennan (`fsWeek.refScale` + `fsWeek.pct` jotka laDay jo nyt käyttää slot-luomisessa), ei muuta cross-ref-loading-mallia eikä note-stringejä. `engine.js` + `audit-engine.mjs` saavat cross-ref-haaran joka aktivoituu vain kun slot kantaa refScale-metadatan; muut slotit käyttävät nykyistä Akselin K2(1)=A "tiukka" -tarkistusta ennallaan.

**Periaate jonka H-002 toteuttaa:** *"AI Block Tuning toimii aina huolimatta liikepankin liikkeestä."* Tämän takia hardcoded movement→refScale -mapping engine.js:ään hylätty (ks. §5 kohta 3); Option X (additiivinen slot-metadata, jonka data-puoli tuottaa) on liikepankki-agnostinen ja kestää laajennusta ilman engine-päivityksiä.

---

## 1. Tavoite

AI Block Tuning -syöte tunnistaa cross-ref-loading-mekanismin: cross-ref-slotit kantavat `refScale` + `nominalLoadPct` -metadatan, AI ymmärtää että note's `@`-pct viittaa nominaaliin (viiteliikkeen 1RM-suhteessa, `loadPctReferenceMovementName`) ja `loadPct` on jo skaalattu, ja `INVARIANT_VIOLATION_SLOT_MISMATCH`-detektori tunnistaa legitiimit cross-ref-slotit eikä laukea niihin. Lopputulos: AI-syöte itse-dokumentoiva cross-ref-skaalauksesta; pilot-baseline palautuu 143 → 137 (6 paused/pin korjautuu); vk14 TI -case jää H-003:lle. Engine-tason harjoituskäytös (recommend(), e1RM, mesosykli, atletti-UI) säilyy bittitarkasti ennallaan.

## 2. Acceptance criteria

> Tyyppi `refactor`. **A0 on pääkriteeri** (käytös muuttumaton). A1–A5 vastaavat H-002:n osakorjauksia. Skeema: `docs/ACCEPTANCE_CRITERIA_SKEEMA.md`. Jokainen on koodista verifioitavissa. Rivinumerot ovat HEAD `c8c89f4` -hetkeltä ja suuntaa-antavia — Code paikantaa funktionimellä.

**A0 — Engine-käytös bittitarkasti muuttumaton (refactor-pääkriteeri)**
- *Mitattu miten:* Stop hook -ketju (`.claude/settings.json`): `node tools/engine-pilot/lib/smoke-test.mjs` + `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w`. Ajetaan käsin jokaisen B-commitin kohdalla; ks. §3.5 per-commit-rytmi.
- *Onnistumisen ehto:* exit 0; regressio-pilot tuottaa identtiset kuorma-, rep- ja Vx-arvot — "64/64 päivää, 0 virhettä". `suggestedLoadKg` ja `resolvedLoadKg` ennallaan kaikissa sloteissa (refScale-metadata on additiivinen, ei vaikuta laskentaan).

**A1 — `data.js`: cross-ref-with-scaling slot producers kantavat `refScale` + `nominalLoadPct` -metadatan**
- *Ehto:* Cross-ref-with-scaling slot producers (Cowork-recon tunnisti `laDay` r. ~6507–6524, HEAD `c8c89f4`) lisäävät `slots.push({...})`:iin kaksi additiivista kenttää: `refScale: refScale` ja `nominalLoadPct: fsLoadPct`. K1-enumerointi PRE-FLIGHTissä vahvistaa onko muita kohtia kuin laDay.
- *Mitattu miten:* `git show <B1-commit> -- data.js` näyttää vain laDay-blokin slot.push:in saavan 2 additiivista riviä (+ mahd. K1:n paljastamat muut sites); ei muita data.js-muutoksia. Runtime-tarkistus: pilot tuottaa esim. vk7 LA paused squat -slotin jossa nyt `refScale: 0.85`, `nominalLoadPct: 0.70`; muut kentät (`loadPct: 0.595`, `suggestedLoadKg: 110`, `note: "Paused squat @70 % Takakyykky — Paused squat 2 s"`) ennallaan.
- *Onnistumisen ehto:* additiiviset kentät slot-objektissa; A0 pitää (pilot 64/64 bittitarkka — refScale-metadata ei vaikuta load-laskentaan).
- *Lähde:* `data.js` `laDay` cross-ref-haara n. r. 6478–6524; K1-enumerointi PRE-FLIGHTissä.

**A2 — `engine.js` `_normalizeSlotForTuningSerialization` refScale-tietoinen**
- *Ehto:* Jos slot kantaa `refScale` + `nominalLoadPct` -kentät JA `|notePct − nominalLoadPct| ≤ 0,5 pp` → note jätetään koskematta (legitiimi cross-ref-slot). Muuten nykyinen normalisointi (note korvataan loadPct-pohjaisella `@`-pct:llä, kuten H-001 B2:ssa).
- *Mitattu miten:* yksikkötesti `test-runner.js`:ään (uusi `testCrossRefSlotNormalization`-funktio): (i) cross-ref-pos: slot {refScale 0.85, nominalLoadPct 0.70, note "@70%", loadPct 0.595} → note ennallaan; (ii) cross-ref-neg (nominal-mismatch): sama slot mutta note "@65%" → normalisointi loadPct-pohjalla "@59.5%" tms.; (iii) puhdas slot mismatched: ei refScale-metadataa, note "@70%", loadPct 0.595 → nykyinen H-001-normalisointi; (iv) puhdas slot konsistentti: ei refScale-metadataa, note "@70%", loadPct 0.70 → ei muutosta.
- *Onnistumisen ehto:* kaikki neljä testitapausta vihreänä; aritmetiikka käsin (0.70 × 0.85 = 0.595, deltaPp |0.70 − 0.70| = 0 ≤ 0.5).
- *Lähde:* `engine.js` `_normalizeSlotForTuningSerialization` n. r. 6399–6416 (HEAD c8c89f4). Funktion sisältö laajenee cross-ref-haaralla.

**A3 — `audit-engine.mjs` `INVARIANT_VIOLATION_SLOT_MISMATCH`-detektori refScale-tietoinen**
- *Ehto:* Jos `trace.output.slots[]`:n slot kantaa `refScale` + `nominalLoadPct` -kentät → validoi (a) `|loadPct − nominalLoadPct × refScale| ≤ 0,5 pp` JA (b) `|notePct − nominalLoadPct| ≤ 0,5 pp`; jos molemmat pitävät → ei laukea. Muuten (ei cross-ref-metadataa, tai jompikumpi check kaatuu): nykyinen tiukka `|notePct − loadPct| > 0,5 pp` -tarkistus.
- *Mitattu miten:* yksikkötesti `test-runner.js`:ään (uusi `testCrossRefSlotMismatchDetection`-funktio): (i) cross-ref-pos: vk7 paused squat refScale-metadatan kanssa → 0 flagia; (ii) sama slot ilman refScale-metadataa → flagi laukea (puhdas slot, K2(1)=A pätee); (iii) cross-ref-mismatch: refScale-metadata mutta `loadPct ≠ nominalLoadPct × refScale` (esim. loadPct 0.60 vs scaled 0.595) → flagi; (iv) konsistentti puhdas slot → 0 flagia; (v) mismatched puhdas slot → flagi.
- *Onnistumisen ehto:* kaikki viisi testitapausta vihreänä; aritmetiikka käsin.
- *Lähde:* `tools/engine-pilot/lib/audit-engine.mjs` SLOT_MISMATCH-emissio n. r. 863–907 (HEAD c8c89f4).

**A4 — `buildAiPrompt` selittää cross-ref-mekanismin AI:lle**
- *Ehto:* Kaikki kolme prompt-pohjaa, joita B4 päivitti tech-stack-rivillä (`engine.js` n. r. 6949 generic inline, r. 7126 `buildAiPrompt`, r. 7576 `buildEndOfCyclePrompt`), sisältävät rivin joka selittää AI:lle cross-ref-metadatan: sisällöltään: *"Cross-ref-slot voi kantaa `refScale` ja `nominalLoadPct` -kentät. Tällöin `loadPct` on jo skaalattu (`= nominalLoadPct × refScale`) ja note's `@`-pct viittaa nominaaliin viiteliikkeen 1RM-suhteessa (`loadPctReferenceMovementName`)."*
- *Mitattu miten:* `git show <B2-commit>:engine.js | grep -cE 'refScale|cross-ref'` → vähintään 3 prompt-pohja-osumaa.
- *Onnistumisen ehto:* AI saa rakenteellisen selityksen cross-ref-loading-mekanismista promptin TEHTÄVÄ-osiossa.

**A5 — pilot-baseline palautuu 143 → 137**
- *Ehto:* H-002:n jälkeen pilot-ajo tuottaa 137 audit-flagia (143 − 6 paused/pin SLOT_MISMATCH-flagia jotka cross-ref-tietoinen detektor tunnistaa legitiimeiksi). Yksi SLOT_MISMATCH jää: vk14 TI Takakyykky (eri mekanismi, H-003:n scope).
- *Mitattu miten:* smoke + pilot ennen H-002 (143 baseline) ja H-002:n viimeisen B-commitin jälkeen → ero täsmälleen 6 SLOT_MISMATCH-flagia. Pilot raportoi spesifiset slotit jotka eivät enää laukea (vk5/6/7 LA paused squat, vk9/10/11 LA pin squat).
- *Onnistumisen ehto:* pilot raportoi 137 audit-flagia, joista 0 SLOT_MISMATCH paused/pin-sloteille ja 1 SLOT_MISMATCH vk14 TI:lle (odotettu). Akseli ratifioi baseline-päivityksen 143 → 137 (vastaava §3.5 STOP-ehto kuin H-001:n K2:ssa).

**Commit ↔ AC -kartta** *(tarkka jako Code-päätettävissä):*
- commit B1 → A1 (data.js refScale-metadatan additiivinen lisäys).
- commit B2 → A2 + A4 (engine.js: _normalizeSlotForTuningSerialization cross-ref-haara + cross-ref-selitys kolmeen prompt-pohjaan).
- commit B3 → A3 (audit-engine.mjs detektor cross-ref-haara).
- commit B4 → A2 + A3 yksikkötestit (test-runner.js — uudet test-funktiot, B2-tyylinen mittari-ensin).
- A0 pitää joka commitilla. A5 verifioituu B3:n jälkeen viimeistään (pilot-ajo näyttää 137).

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (`CLAUDE.md` §2):** H-002 **ei muuta yhtään §2-tutkimusinvarianttia.** Automaattista, koska `recommend()`-polkua, e1RM-funktioita eikä mesosykli-generointia kosketa; `refScale` on jo data-tasolla olemassa, surface-ataan vain metadatana.
- **Mitä EI kosketa:**
  - `data.js` cross-ref-loading-malli (refScale-mekanismi itsessään, refScale-arvot 0.85/1.00, fsWeek-rakenne, note-stringit). Pelkät additiiviset metadatakentät slot.push:issa.
  - `data.js`:n muut osat (mesosykli-rakenne, PRIMARY_SPECIFIC_PROFILES, COMPLEMENT/SECONDARY-listat, muut funktiot kuten `maDay` / `tiDay` paitsi K1 vahvistaa muuta).
  - `engine.js` `recommend()`-polku, e1RM-funktiot (`e1rmSystem`, `e1rmAccessory`), mesosykli-generointi, slot-resolver (`slot.resolvedLoadKg`-laskenta).
  - vk14 TI Takakyykky -case (eri mekanismi — decision-tree-vihje toiselle päivälle, ei refScale-skaalaus). H-003:n scope.
  - Akselin K2(1)=A "tiukka" -ratifiointi puhtaille sloteille (vain cross-ref-haara on perusteltu rakenteellinen poikkeus).
  - Self-ref-slotit (data.js r. 6066, 6090 Lisäpainodippi self-ref). Niillä `loadPctReferenceMovementName` mutta ei skaalausta eikä `@XX%`-patternia notessa → detektor ohittaa → ei vaadi muutosta.
- **Tekniset reunaehdot:** vanilla JavaScript (`.js` / `.mjs`), ei uusia npm-riippuvuuksia, ei build-stepiä. Stop hook -yhteensopiva. Selain-yksikkötestit (`?test=1`, 548 testiä mukaan lukien H-001:n 75 + H-002:n uudet) eivät kaadu. H-001:n `dbd3045` B2-test fix-up säilyy.

## 3.5 Claude Code -operointi — H-002-konkretisointi Selkäranka 1–9:lle

> Selkäranka 1–9:n **kanoninen määrittely on `docs/SELKARANKA.md`** (Code lukee sen session alussa, `CLAUDE.md` §8). Tämä osio **ei toista kanonista määrittelyä** — se antaa vain H-002-spesifiset konkretisoinnit per kohta. Ristiriidassa `docs/SELKARANKA.md` voittaa.

**1. PRE-FLIGHT + STOP** — H-002-konkretisointi:
- Lukujärjestys `CLAUDE.md` §8: `CLAUDE.md` → `docs/SELKARANKA.md` → `ROADMAP.md` → tämä `HANDOFF.md`. **Jos §0 Tila ≠ `AKTIIVINEN` → STOP.** ROADMAP NYT-merkki = vaihe 17 (vahvista).
- Odotettu haara: `main`. **Odotettu HEAD (§0):** HEAD = se commit joka committaa tämän HANDOFF.md-version (`git rev-parse HEAD` == `git log -1 --format=%H -- HANDOFF.md`). **Älä oleta `c8c89f4`:ta** — se on H-002:n recon-pohja, ei H-002:n HEAD.
- `git status --porcelain` tyhjä session-aikaisista muutoksista; pre-existing untracked `PLAN.md` + `streetlifting_16w_v4.32.8.csv` sallittu. CRLF-kohina (kymmeniä tiedostoja muuttuneina) → STOP, raportoi, **ÄLÄ normalisoi** (rikkoo scope-lukon).
- **§2:n rivinumeroiden validointi:** aja `git log --oneline -- data.js engine.js tools/engine-pilot/lib/audit-engine.mjs test-runner.js`. Jos jokin niistä on muuttunut H-002:n recon-pohjan (`c8c89f4`) jälkeen → rivinumerot vain viitteellisiä; **paikanna funktionimellä**.
- **K1-enumerointi (H-002-spesifi PRE-FLIGHT):** Aja `grep -n "loadPctReferenceMovementName" data.js`. Cowork-recon tunnisti laDay (r. ~6518) cross-ref-with-scaling -producerina ja r. 6066, 6090 self-ref-tapauksina (eivät vaadi muutosta). Vahvista: onko muita cross-ref-with-scaling -sites kuin laDay? Jos kyllä → §6 K1:n mukaan kysy Akselilta ennen B1:n toteutusta.
- **Stop hook** on `.claude/settings.json`:ssa määritelty mekanismi joka **laukeaa automaattisesti Code-session päättyessä** — sitä ei "ajeta". PRE-FLIGHTissä: aja **samat kaksi komentoa käsin** kerran baseline-tilassa; vahvista **"64/64 päivää, 0 virhettä, 143 audit-flagia"** ennen muutoksia. Jos baseline ei ole vihreä tai ≠ 143 → STOP.

**2. PERUUTUSANKKURI** — H-002-konkretisointi:
- Ennen ensimmäistä muutosta: `git branch backup-pre-h002-<HEAD-SHA>` — haara, ei tagi (`docs/SELKARANKA.md` kohta 2). `<HEAD-SHA>` = `git rev-parse --short HEAD` PRE-FLIGHT-hetkellä (= HANDOFF.md-AKTIIVINEN-commitin SHA).
- Palautuskomennot: `git reset --hard backup-pre-h002-<sha>` (koko handoff) tai `git revert <commit>` (yksi commit). Älä poista haaraa ennen kuin Akseli on ratifioinut pushin.

**3. SCOPE-LUKKO** — H-002:n valkolista (sallittu `git diff`; STOP jos ylittää):
- `data.js` — VAIN cross-ref-with-scaling slot producers (Cowork-recon: laDay r. ~6507–6524 + K1-PRE-FLIGHT-enumeroinnin paljastamat muut). VAIN additiiviset `refScale` + `nominalLoadPct` -kentät `slots.push({...})`:iin. **EI muita data.js-muutoksia, EI note-stringien muokkausta, EI mesosykli-rakenteen muutosta, EI refScale-arvojen säätöä.**
- `engine.js` — `_normalizeSlotForTuningSerialization` (cross-ref-haaran lisäys), `buildAiPrompt` + generic inline + `buildEndOfCyclePrompt` (cross-ref-selitys promptiin, 3 paikkaa). `buildMarkdownNarrative` valinnainen (§6 K3 — todennäköisesti ei muutosta).
- `tools/engine-pilot/lib/audit-engine.mjs` — SLOT_MISMATCH-detektori (cross-ref-haaran lisäys `auditInvariants`:iin).
- `test-runner.js` — uudet test-funktiot refScale-tietoiselle haaralle (A2 + A3). Eivät muuta olemassa olevia testejä.
- **EI** `recommend()`-polkua, **EI** e1RM-funktioita, **EI** mesosykli-generointia, **EI** slot-resolverin laskentaa, **EI** vk14 TI -case (H-003), **EI** self-ref-slotteja (r. 6066, 6090).

**4. DIFF-CONTROL erillisinä committeina** — H-002-konkretisointi:
- B1, B2, B3, B4 = neljä erillistä committia, yksi muutoslähde kukin (§5 kohta 6). Sulauta vain jos diagnoosi todistaa saman juuren — ja raportoi se löydöksenä. Järjestys B1 → B2 → B3 → B4: B2/B3 nojaavat B1:n data-metadatan olemassaoloon; B4 (testit) viimeisenä jotta testit verifioivat täyden ketjun.

**5. STOP-EHDOT** *(jokainen = pysähdy + raportoi + odota Akselia, ei autonomista kiertoa):*
- **Kaikki kohta 1:n PRE-FLIGHT-STOPit ovat voimassa** (Tila ≠ AKTIIVINEN · HEAD-poikkeama · CRLF-kohina · ei-vihreä baseline · K1-enumerointi paljastaa odottamattomia cross-ref-sites).
- smoke FAIL → STOP.
- regressio-pilot ≠ "64/64 päivää, 0 virhettä" → STOP.
- `git diff` koskettaa kohta 3:n valkolistan ulkopuolta → STOP.
- pilot-baseline H-002:n viimeisen commitin jälkeen ≠ 137 — odotettu = 137 (143 − 6 paused/pin korjautuu). Jos esim. 138 (jokin paused/pin ei korjaantunut), 136 (jokin ylimääräinen flagi katosi), tai muu → STOP, raportoi mitkä slotit muuttuivat ja miksi.
- mikä tahansa §6:n avoin kysymys (K1–K4) osuu toteutuspolulle → STOP, kysy — älä arvaa.

**6. MITTARI-ENSIN** — H-002-konkretisointi:
- `docs/SELKARANKA.md` kohta 6: gate-syöttöiset invariantit todennetaan tunnetulla pos + neg + käsiaritmetiikalla.
- H-002 laajentaa kahta gate-mittaria: A2 (`_normalizeSlotForTuningSerialization` cross-ref-haara) ja A3 (`INVARIANT_VIOLATION_SLOT_MISMATCH` cross-ref-haara). **Tunnettu-positiivinen** A2:lle ja A3:lle: vk7 LA paused squat {refScale: 0.85, nominalLoadPct: 0.70, note "@70%", loadPct 0.595} → A2: note ennallaan, A3: 0 flagia. **Tunnettu-negatiivinen** A2:lle: sama slot mutta note "@65%" → A2: normalisoituu loadPct-pohjalla. **Tunnettu-negatiivinen** A3:lle: sama slot mutta `loadPct: 0.60` (≠ 0.70 × 0.85) → A3: flagi laukea (cross-ref-validointi (a) kaatuu).
- Aritmetiikka käsin: `0.70 × 0.85 = 0.595` ✓; `|0.70 − 0.70| × 100 = 0` pp ≤ 0.5 ✓; `|0.595 − 0.595| × 100 = 0` pp ≤ 0.5 ✓ → A3:n molemmat checkit pitävät → ei flagia. Cross-ref-neg: `0.595 − 0.60 = −0.005` × 100 = 0.5 pp toleranssin RAJA — käytä testissä esim. loadPct 0.62 → |0.595 − 0.62| × 100 = 2.5 pp > 0.5 → flagi.

**Per-commit-rytmi** *(yhdistää kohdat 3, 5, 6 + `CLAUDE.md` §3–§4, sama logiikka kuin H-001:n §3.5):*
1. Toteuta yksi B-korjaus kohta 3:n valkolistan sisällä.
2. Aja smoke- ja pilot-komennot käsin: `node tools/engine-pilot/lib/smoke-test.mjs` → `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w`. Todentaa A0:n (engine-käytös bittitarkka) ja seuraa baseline-flagi-määrää (143 → 137 B3:n jälkeen viimeistään).
3. Todenna B:n acceptance (§2) CLI-tasolla: engine-pilot tuo `engine.js`:n jo (`tools/engine-pilot/lib/engine-bridge.mjs`), joten AI Block Tuning -funktiot ovat ajettavissa node-harnessilla per-B-reproa varten. B4:n testit kirjoitetaan `test-runner.js`:ään — selainpohjainen (`?test=1`); Code kirjoittaa, Akseli ajaa headless-mekanismilla (kuten H-001:n acceptance-vaiheessa — Playwright-harness on jo tunnettu polku).
4. Kaikki CLI-tasolla vihreää JA pilot-baseline odotettu (B1/B2: 143; B3 jälkeen: 137) → kirjoita commit (kohta 7). Punaista → STOP (kohta 5).
5. Poikkeustilanteessa palautus: `git reset --hard backup-pre-h002-<sha>` (koko handoff) tai `git revert <commit>` (yksi commit).

**7. KEVYT LEDGER-RIVI** — H-002-konkretisointi:
- Sama vakiintunut commit-body-konventio kuin H-001:ssä (vrt. commitit `42ff53c`…`dbd3045`). Commit-body on Selkärangan "kevyt ledger-rivi" — EI Akselin kanoninen sparring-ledger (kohta 9).
- Commit-otsikko: `refactor(H-002): B<n> — <lyhyt kuvaus>` (esim. `refactor(H-002): B1 — refScale + nominalLoadPct -metadatan additiivinen lisäys laDay-cross-ref-sloteissa`).
- Commit-body sisältää: Juurisyy + Muutokset (tiedosto:rivi); `Acceptance criteria: <A-kriteeri>`; `Tutkimusinvariantit (CLAUDE.md osio 2): EI muutettu.`; `Smoke + pilot regression PASSED (64/64 päivää, 0 virhettä, <baseline>).`; `Backup-anchor: backup-pre-h002-<sha>`; `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` + H-001-pattern: `Diff: <netto-rivimäärä> riviä.` ja `Selain-testit (?test=1): EI ajettavissa CLI:stä — Akseli ajaa Playwright-headlessillä.`

**8. EI PUSHIA ilman lupaa** — H-002-konkretisointi:
- Kun kaikki B-commitit valmiit (4 commitia), Code **EI pushaa**. Push-raportti Akselille: commit-lista (hash + otsikko); per commit smoke + pilot -tulos + netto-diff; muuttuneet tiedostot + kokonaisrivimäärä; selaintestien tila (Code ei ajanut `?test=1`:tä — Akseli ajaa Playwright-headlessillä); rakenteelliset päätökset vs. avoimet kohdat (§5 vs §6); baseline-päivitys 143 → 137 ratifioitavaksi.
- Päätä raportti kysymykseen **"PUSH OK?"** — odota Akselin eksplisiittistä ratifiointia (vrt. H-001:n push-prosessi).

**9. LEDGER-IMMUTABILITEETTI** — H-002-konkretisointi:
- Code ei rekonstruoi eikä muuta kanonisen ledgerin literaaleja. Tämä `HANDOFF.md`, commit-historia ja `docs/SELKARANKA.md` ovat avustavia dokumentteja — ne eivät korvaa kanonista ledgeriä.
- Jo pushattua committia ei muuteta; `git commit --amend` vain ennen pushia. `HANDOFF.md` §7 "Session-tulos" täytetään kerran, session lopussa.

## 4. Atletti-vastaukset critical questions -kysymyksiin

**Ei sovellu** — tyyppi on `refactor`, ei `block-tuning`. Ei atletti-vastauksia tarpeen.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**1. Tyyppipäätös: `refactor` (additiivinen).** Akseli ratifioi Option X yli Code:n alkuperäisen "hardcoded movement→refScale -mapping engine.js + audit-engine.mjs:ään" -suosituksen. Perustelu: *"AI Block Tuning toimii aina huolimatta liikepankin liikkeestä."* Hardcoded mapping rikkoutuisi uusilla liikkeillä jotka käyttävät samaa cross-ref-pattern:ia; Option X (slot-metadata, jonka data-puoli tuottaa) on liikepankki-agnostinen ja kestää laajennusta ilman engine-päivityksiä.

**2. "data.js EI muuteta" -periaatteen tarkennus.** Alkuperäinen tarkoitus (H-002:n alustava framing): älä muuta cross-ref-loading-mallia (refScale-mekanismi) eikä note-stringejä. **Tarkennus (Akselin ratifioima Option X:n kanssa):** additiiviset metadatakentät jotka surface-aavat olemassaolevan paikallisen laskennan EIVÄT ole design-muutos — ne tekevät jo lasketun datan engine:lle + AI:lle + detektorille näkyväksi. Atletti-näkymä, treenikuorma, note-tekstit ja mesosyklin rakenne pysyvät identtisinä. A0 bittitarkka (refScale-metadata ei vaikuta engine-laskentaan).

**3. Hylätyt vaihtoehdot (Code:n alkuperäisen recon-raportin jälkeen):**

- *Hardcoded movement→refScale -mapping engine.js + audit-engine.mjs:ään.* Hylätty: rikkoo "AI Block Tuning toimii aina huolimatta liikepankin liikkeestä" -periaatteen. Code itse merkitsi tämän riskin (Yllätys 2: "uudet liikkeet eivät tunnista refScale → väärä mismatch flagi").
- *Option A: data.js notet vastaamaan scaled loadPct:tä (mekaaninen sovellus §5 kohta 6 -kanonista sääntöä).* Hylätty: menettää alkuperäisen nominaalin coaching-kontekstin notessa; atletti näkee skaalattuja absoluuttisia pct:itä (esim. "@59.5%" "@70%":n sijaan), jotka ovat vähemmän intuitiivisia paused-squat-prescription:lle.
- *Option B: hybridi-notet ("@70% Paused (= @59.5% Takakyykky)").* Hylätty: vie data.js:n note-stringeihin (alkuperäinen rajaus rikkoutuu enemmän kuin Option X); detektorin pitäisi parsea hybrid-muotoa (monimutkaisempi parser); tuottaa saman lopputuloksen kuin Option X mutta epäpuhtaammalla rajapinnalla.

**4. vk14 TI Takakyykky -case — erilliseen jatkohandoffiin H-003.** Eri mekanismi kuin laDay:n cross-ref: tiDay:n peaking-primary-slot (data.js r. ~7248–7251), note "@95%" on decision-tree-vihje LA-päivän ehdolliselle ekstra-sarjalle (ei tämän slotin oma kuorma; loadPct 0.93 on hand-tuned peaking-arvo Pritchard 2016:n perusteella). refScale-aware detektor ei ratkaise tätä — A3:n cross-ref-validointi vaatii `refScale + nominalLoadPct`-metadataa, jota vk14 TI -slot ei kanna (eikä pitäisi kantaa, koska se ei ole cross-ref-loading-tapaus). H-003:n scope: data.js tiDay note-stylefix (poista `@`-merkki ehdollisesta vihjeestä tai uudelleenmuotoile niin että detektor-regex ei matchaa).

**5. `suggestedLoadKg` pysyy todellisena treenikuormana.** `loadPct × ref-e1RM` = 110 kg vk7 paused squatissa. refScale-tietoisuus koskee note-näkyvyyttä + AI-ymmärrystä, ei harjoituskuorman prescription:ta. Atletti näkee saman 110 kg:n kuin ennen H-002:ta.

**6. Commit-rakenne: 4 erillistä committia (B1–B4).** Kukin oma muutoslähde (data.js / engine.js / audit-engine.mjs / test-runner.js); erillisinä `git bisect` -käyttökelpoisuus säilyy. Code voi sulauttaa B2+B3 jos diagnoosi todistaa saman juuren (esim. `_normalizeSlotForTuningSerialization` ja audit-detektori jakavat saman cross-ref-validointi-helperin).

## 6. Avoimet kysymykset

> Code kysyy nämä Akseliltä ENNEN toteutusta — ei arvaa (`CLAUDE.md` §8 kohta 5; §3.5 kohta 5).

**K1 (B1):** Cross-ref-with-scaling slot producers data.js:ssä — täysi enumerointi. Cowork-recon tunnisti vain laDay r. ~6507–6524 (refScale fsWeek-defeistä, oletus 0.85). Self-ref-slotit r. 6066, 6090 (Lisäpainodippi, ei skaalausta, note ei sisällä `@XX%`-patternia) eivät vaadi muutosta. Code:n PRE-FLIGHT-vaiheessa: aja `grep -n "loadPctReferenceMovementName" data.js` ja `grep -nE "refScale" data.js | grep -v "// " | head`. **Vahvista**: onko muita cross-ref-with-scaling -sites kuin laDay (esim. tiDay backoff, maDay cross-ref, muut)? Jos kyllä → kerro mikä funktio + rivinumero ennen B1:n toteutusta. **Cowork-suositus**: laDay on ainoa kohta (recon vahvisti — refScale-konsepti on määritelty vain laDay-funktion sisällä).

**K2 (A2/A3):** Toleranssin tarkkuus refScale-aware validoinnissa. **Suositus**: 0,5 prosenttiyksikköä (sama kuin nykyinen tiukka detektor → johdonmukainen) sekä (a) `|loadPct − nominalLoadPct × refScale|` että (b) `|notePct − nominalLoadPct|` -checkeissä. Akseli vahvistaa.

**K3 (B2 valinnainen):** Markdown-rendering cross-ref-sloteille `buildMarkdownNarrative`:ssä. Vaihtoehdot: (a) ei muutosta (note ennallaan, kuten ennen H-002:ta atletti-näkymässä); (b) näytetään molemmat kehykset selvyyden vuoksi (esim. "Paused squat @70 % Takakyykky-nimellinen (= 59,5 % Takakyykky-1RM tehollinen)"). **Cowork-suositus**: (a) — pidä atletti-UI muuttumattomana; refScale-tietoisuus on AI-syötteen tarpeellinen erottelu, ei atletti-näkymän. Akseli vahvistaa.

**K4 (B1):** Slot-metadatakenttien NIMET. **Cowork-suositus**: `refScale` ja `nominalLoadPct` (täsmäävät paikallisten muuttujien nimiä laDay:ssä → minimaalinen kognitiivinen jump koodia lukevalle, johdonmukaisuus). Vaihtoehto: `crossRefScale` + `crossRefNominalLoadPct` (eksplisiittisempi rooli, mutta verbosempi). Akseli vahvistaa kenttänimet tai sallii Code:n päättää implementaatio-vaiheessa.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot · baseline-päivitys 143 → 137>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<lista>` |
