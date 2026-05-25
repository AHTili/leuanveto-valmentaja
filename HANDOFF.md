# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.
>
> *Tila: H-001 v3 — `AKTIIVINEN` (Akseli ratifioi 2026-05-25). v2 yhdisti sparring-version vahvuudet (S1–S7) ja lisäsi Claude Code -operointikerroksen (§3.5). v3 integroi sparring-auditin löydökset (SA-1–SA-8), korjasi §3.5:n vastaamaan kanonista `docs/SELKARANKA.md`:tä (kohdat 2/4/6/7) ja teki PRE-FLIGHT-HEAD-ankkurista suhteellisen. Code aloittaa H-001:n §3.5 kohta 1:n PRE-FLIGHTistä.*

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-001` |
| Tyyppi | `refactor` — B1–B4 puhdas refactor; B5:ssä `architecture`-piirre (ks. §5) |
| Laadittu | 2026-05-23 / Cowork-sessio · v2 2026-05-24 · v3 2026-05-25 |
| Tila | `AKTIIVINEN` |
| Recon-pohja | HEAD `296ee72`, APP_VERSION 4.52.5 — §2:n rivinumerot reconnoiteroitiin tältä committilta. `engine.js` viimeksi muuttunut commitissa `f47ae1d`, `audit-engine.mjs` commitissa `77abf61` (molemmat recon-pohjaa vanhempia → rivinumerot päteviä). |
| Odotettu HEAD (PRE-FLIGHT) | HEAD = se commit joka committaa tämän HANDOFF.md-version. Verifiointi: `git rev-parse HEAD` == `git log -1 --format=%H -- HANDOFF.md`. **Ei literaalia SHA:ta** — tiedosto ei voi sisältää sen luovan commitin SHA:ta. Recon-pohja `296ee72`, edeltävät doc-commitit `228a6a9` + `bb4ed24` (ks. alaviite). |
| Liittyy R-sekvenssin vaiheeseen | Pohja-puhtaus-työ. Palvelee R-sekvenssin vaiheita 17–19 epäsuorasti (AI Block Tuning -putken laatu), **ei kuulu yhteenkään yksittäiseen R-vaiheeseen**. ROADMAP.md NYT-merkki on erikseen vaihe 17 (Round B-α-2) — H-001 ajetaan sen rinnalla, ei korvaa sitä. |

**Tyyppivalinnan perustelu (ks. §5 kohta 1):** "AI Block Tuning" on sovelluksen *ominaisuuden* nimi, ei HANDOFF-tyyppi. Tyyppi `block-tuning` tarkoittaisi atleetin block-tuning-suoritusta ja vaatisi osion 4 atletti-vastaukset — ei sovellu tähän. B1–B4 korjaavat olemassa olevan export-kerroksen rakenteellisia vikoja ilman uutta ominaisuutta → `refactor`. B5 lisää uuden syöte-kentän ja vaatii suunnittelupäätöksen → `architecture`-piirre, joka on tässä handoffissa ratkaistu (§5 kohta 3); jos toteutus paisuu, B5 irtoaa omaksi jatkohandoffikseen H-002.

**Edeltävät doc-commitit (tehty — eivät osa H-001:tä):** §8:n katkennut loppu korjattu (`228a6a9` "fix: palauta CLAUDE.md §8 Session LOPUSSA loppu"); Selkäranka kanonisoitu — uusi `docs/SELKARANKA.md` + `CLAUDE.md` §8 -lukujärjestys (`bb4ed24` "OSA A"). Molemmat origin/main:issa. **Jäljellä ennen H-001:n PRE-FLIGHTiä:** tämä HANDOFF.md v3 on committaamatta — se committataan `AKTIIVINEN`-tilassa omana committinaan, ja juuri se commit on H-001:n "Odotettu HEAD" (yllä). §2:n `engine.js`-rivinumerot säilyvät pätevinä — edeltävät commitit ovat doc-työtä eivätkä koske `engine.js`:ää (viimeisin engine.js-commit yhä `f47ae1d`).

---

## 1. Tavoite

AI Block Tuning -ominaisuuden sovellukselta ulkoiselle AI:lle välittämä syöte — `generateBlockTuningPackage`-perheen tuottama `{ markdown, json, prompt }` — on sisäisesti johdonmukainen ja itse-dokumentoiva: aggregaatit lasketaan yhdestä rajauksesta, slot-objektin kuorma-arvot eivät ole ristiriidassa keskenään, tyhjät trendikentät erottuvat toteuttamattomista, prompt kertoo sovelluksen todellisen tech-stackin, ja käynnissä olevan siirtymäviikon kalibrointitreenit ovat AI:n nähtävissä. Engine-tason harjoituskäytös (`recommend()`, e1RM-laskenta, mesosykli-generointi, workout-flow) säilyy **bittitarkasti ennallaan** — korjaus koskee ainoastaan AI Block Tuning -export-kerrosta.

## 2. Acceptance criteria

> Tyyppi `refactor`. **A0 on pääkriteeri** (käytös muuttumaton). A1–A6 vastaavat heikkouksia B1–B5 (B2 on jaettu kahteen kriteeriin A2 + A3 — slot-tuotanto ja audit-emissio ovat erikseen verifioitavissa). Skeema: `docs/ACCEPTANCE_CRITERIA_SKEEMA.md`. Jokainen on koodista verifioitavissa. Rivinumerot ovat HEAD `296ee72` -hetkeltä ja suuntaa-antavia — Code paikantaa funktionimellä.

**A0 — Engine-käytös bittitarkasti muuttumaton (refactor-pääkriteeri)**
- *Mitattu miten:* aja käsin smoke- ja pilot-komennot — `node tools/engine-pilot/lib/smoke-test.mjs` + `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` (samat komennot jotka `.claude/settings.json`:n Stop hook ajaa automaattisesti session lopussa). Ajetaan **jokaisen** B-commitin kohdalla; ks. §3.5 per-commit-rytmi.
- *Onnistumisen ehto:* exit 0; regressio-pilot tuottaa identtiset kuorma-, rep- ja Vx-arvot committoituun baseline-tilaan nähden — tulos "64/64 päivää, 0 virhettä". 0 uutta regressiota.
- *Lähde:* `CLAUDE.md` §3 acceptance-periaate + §4 Stop hook.

**A1 — B1: aggregaattien rajaus yhtenäinen**
- *Ehto:* `aggregates.totalSessions` ja `aggregates.completedSets` johdetaan samasta, koodikommentissa dokumentoidusta rajauksesta (sama viikkojoukko, sama backfill-käsittely, sama warmup/`completed`-suodatus).
- *Mitattu miten:* uusi yksikkötesti `test-runner.js`:ään — syötä tunnettu sessiojoukko jossa on sekä backfill- että warmup-settejä. (Selainpohjainen `?test=1`-testi: Code kirjoittaa sen, Akseli ajaa; CLI-tason repro engine-pilot-bridgen kautta — ks. §3.5 per-commit-rytmi.)
- *Onnistumisen ehto:* (i) testi assertoi että `totalSessions` ja `completedSets` kattavat saman viikko- ja backfill-rajauksen, johdettuna samasta suodatinlausekkeesta; (ii) per-sessio-jakolasku `completedSets/totalSessions` on määritelmällisesti mielekäs. **Ei** assertoida kiinteää arvoa 21,67 (= 260/12) — se on nimenomaan korjattava rajaus-artefakti, ei tavoitenumero.
- *Lähde:* `engine.js` `generateBlockTuningPackage` n. r. 6426–6443; **duplikaatit** `generateGenericBlockTuningPackage` n. r. 6660–6672 ja `generateEndOfCycleTuningPackage` n. r. 7137–7150 — korjaus kaikkiin kolmeen tai jaettuun apufunktioon. Vihje: `completedSets` (r. 6427) laskee `s.slots.length` ilman `completed && !isWarmup`-suodatusta — vrt. sama nimi suodatettuna `engine.js` r. 5318.

**A2 — B2: slot-objektin kuorma-kentät johdonmukaiset**
- *Ehto:* yhden slotin **kuorma-intentti-kentät** (`note`-johdettu %, `loadPct`, `suggestedLoadKg`) eivät ole keskenään ristiriidassa; slot-tuotantokoodi nojaa **yhteen** auktoritatiiviseen kenttään (`loadPct`, ks. §5 kohta 6) ja johtaa kuvailevat kentät siitä. `resolvedLoadKg` (ajonaikainen resolvoitu arvo) nimetään serialisoinnissa erikseen roolinsa mukaan.
- *Mitattu miten:* repro Vk 7 LA paused squat -slotilla (`upcomingBlock.weeks[3].days[5]`, verbatim arvot: `note "@70%"` → 106,75 kg · `loadPct 0.595` → 90,7 kg · `suggestedLoadKg 110` · `resolvedLoadKg 100,5`).
- *Onnistumisen ehto:* `note`-teksti vastaa `loadPct`:ia, ja `suggestedLoadKg` on joko `loadPct`-johdettu `roundToHalf`-rasterin (0,5 kg) sisällä tai poistettu AI Block Tuning -serialisoinnista; `resolvedLoadKg` esiintyy serialisoinnissa rooli-nimettynä ajonaikaisena arvona, ei neljäntenä kilpailevana kuorma-intenttinä.
- *Lähde:* `engine.js` slot-resolver (`slot.resolvedLoadKg = …` n. r. 4395–4594, `roundToHalf`-pyöristys).

**A3 — B2: slot-mismatch audit-emissio**
- *Ehto:* kun slotin kuorma-intentti-kentät (`note` / `loadPct` / `suggestedLoadKg`) poikkeavat toisistaan yli `roundToHalf`-toleranssin, sovellus emittoi uuden `INVARIANT_VIOLATION_SLOT_MISMATCH`-flagin.
- *Mitattu miten:* aja audit slotilla jonka kentät on tahallisesti ristiriidassa; tarkista flagin emissio.
- *Onnistumisen ehto:* `audit-engine.mjs` `auditInvariants` emittoi `INVARIANT_VIOLATION_SLOT_MISMATCH`:n olemassa olevan `flag()`-patternin mukaisesti; flagin sisältö nimeää slotin + poikkeavat arvot. Stop-hook-pilot ei kaadu uuden emission takia (ks. §6 K2).
- *Lähde:* `tools/engine-pilot/lib/audit-engine.mjs` `auditInvariants` (r. 573, `flag()`-pattern r. 636–648, ali-tyypitetyt esimerkit `INVARIANT_VIOLATION_K_A1/A2/A6D` r. 781–848).

**A4 — B3: tyhjät trendikentät eksplisiittisesti merkitty**
- *Ehto:* trendikentät `e1rmTrends`, `trends.hrv`, `trends.mpv`, `trends.bodyweight`, `anomalies`, `engineRuleFrequency` erottavat neljä tilaa (taulukko §5 kohta 7): `data` / `empty` / `unavailable` / `not-implemented`. Tyhjä saa eksplisiittisen statuksen, ei paljasta `[]`/`{}`-arvoa.
- *Mitattu miten:* aja `generateBlockTuningPackage` syötteellä jossa ei ole HRV/MPV/BW-mittauksia; tarkista `json.completedBlock`-trendit.
- *Onnistumisen ehto:* jokaisen trendin tila on AI:lle yksiselitteinen; tyhjä mitattu ≠ pipeline-vika ≠ toteuttamaton. (Tarkka encoding — `{status,reason}` vai `null` — on §6 K3.)
- *Lähde:* `engine.js` `trends` n. r. 6406–6410, `anomalies` r. 6413–6423, `e1rmTrends` r. 6377–6398, `engineRuleFrequency` (`traceFrequencySorted`) r. 6464; `json.completedBlock`-kokoonpano r. 6496–6507. Vastaavat kohdat generic- ja end-of-cycle-funktioissa.

**A5 — B4: prompt-pohja sisältää tech-stack-rivin**
- *Ehto:* jokainen AI Block Tuning -prompt-pohja kertoo sovelluksen todellisen tech-stackin.
- *Mitattu miten:* grep prompt-pohjista merkkijono "vanilla JS" / "ei TypeScript".
- *Onnistumisen ehto:* `buildAiPrompt`:n `TEHTÄVÄ`-osio (ja generic-version inline-prompt) sisältää rivin sisällöltään: *"LeVe AI tech stack: vanilla JavaScript (.js / .mjs), IndexedDB, PWA service worker — EI TypeScriptiä. Älä oleta src/-polkuja tai .ts/.tsx-tiedostoja `claudeCodePromptHint`-kentissä."*
- *Lähde:* `engine.js` `buildAiPrompt` (r. 6913, `TEHTÄVÄ`-osio r. 6936–6948, `claudeCodePromptHint`-kentän kuvaus r. 6977); generic-version inline-prompt n. r. 6762.

**A6 — B5: siirtymäviikon kalibrointitreenit syötteessä**
- *Ehto:* kun AI Block Tuning ajetaan vk N -lopussa, käynnissä olevan vk N -kalibrointitreenit ovat syötteessä omassa kentässään `currentWeekCalibrationSets`, ja prompt-pohja ohjeistaa AI:ta käyttämään niitä kalibrointi-evidenssinä.
- *Mitattu miten:* aja `generateBlockTuningPackage` vk 4 -kontekstissa; tarkista että syöte sisältää `currentWeekCalibrationSets`-kentän vk 4:n seteillä (esim. kyykky 170 kg V1) ja että `completedBlock.weeks` pysyy `[1,2,3]`.
- *Onnistumisen ehto:* uusi kenttä `json.currentWeekCalibrationSets` (vaihtoehto b, §5 kohta 3) sisältää kuluvan viikon kirjatut setit; `completedBlock`-semantiikka ennallaan; prompt-pohja viittaa kenttään.
- *Lähde:* `engine.js` `generateBlockTuningPackage` `json`-kokoonpano r. 6488–6513, `block.prevWeeks` r. 6325–6330, `buildAiPrompt` r. 6913.

**Commit ↔ AC -kartta:** commit 1 = A1 · commit 2 (B2) = A2 + A3 · commit 3 = A4 · commit 4 = A5 · commit 5 = A6. A0 pitää joka commitilla.

## 3. Reunaehdot ja scope-aita

- **Sovellettavat invariantit (`CLAUDE.md` §2):** H-001 **ei muuta yhtään §2-tutkimusinvarianttia** (VL-cap, Deload Δ%, Tier-progression, Rep1 MPV slope, Failure-kuormapudotus). Tämä on automaattista, koska `recommend()`-polkua, e1RM-funktioita eikä mesosykli-generointia kosketa. Huom: B2:n uusi `INVARIANT_VIOLATION_SLOT_MISMATCH` on **data-konsistenssin audit-emissio**, ei §2:n tutkimuspohjainen turvaraja — älä sekoita näitä.
- **Mitä EI kosketa:**
  - `engine.js` `recommend()` ja sen kutsumat resolverit kuorma-laskennan osalta — slot-resolveriin (B2) kosketaan vain kuorma-kenttien *konsistenssin* osalta, ei resolvoidun arvon *laskenta-logiikkaa*.
  - e1RM-funktiot (`e1rmSystem`, `e1rmAccessory`), mesosykli-generointi, `data.js`-skeema (IndexedDB schema-versio 5) — ei skeemamuutoksia. Jos B5 vaatisi skeemamuutoksen → pysähdy, ks. §6 K4.
  - Tutkimusinvarianttien arvot ja `docs/TUTKIMUS_INVARIANTIT.md`.
  - Regressio-pilot-baseline `tools/engine-pilot/` — käytöksen pitää säilyä bittitarkka; baselinea ei päivitetä paitsi jos §6 K2 sitä eksplisiittisesti edellyttää, ja silloin Akselin luvalla.
  - Sets-objektien velocity-kenttien (`velocityMean`, `velocityRep1`, `velocityLossPercent`) null-ongelma (kontekstipaketti C kohta 4) — **erillinen dataketju-ongelma, H-001:n ulkopuolella.** Suositeltava jatkohandoff (§5 kohta 5).
- **Tekniset reunaehdot:** vanilla JavaScript (`.js` / `.mjs`), ei uusia npm-riippuvuuksia, ei build-stepiä. ES-modulit. Selain-yksikkötestit (`?test=1`, 473 testiä) eivät kaadu. Stop hook -yhteensopiva.

## 3.5 Claude Code -operointi — H-001-konkretisointi Selkäranka 1–9:lle

> Selkäranka 1–9:n **kanoninen määrittely on `docs/SELKARANKA.md`** (Code lukee sen session alussa, `CLAUDE.md` §8). Tämä osio **ei toista kanonista määrittelyä** — se antaa vain H-001-spesifiset konkretisoinnit per kohta. Ristiriidassa `docs/SELKARANKA.md` voittaa. HANDOFF.md on lopulta kehote Claude Codelle: jokainen kohta on Code-session sitova askel.

**1. PRE-FLIGHT + STOP** — H-001-konkretisointi:
- Lukujärjestys `CLAUDE.md` §8:n mukaan: `CLAUDE.md` → `docs/SELKARANKA.md` → `ROADMAP.md` → tämä `HANDOFF.md`. **Jos §0 Tila ≠ `AKTIIVINEN` → STOP.** Vahvista `ROADMAP.md`:n NYT-merkki = vaihe 17 (H-001 ajetaan sen rinnalla).
- Odotettu haara: `main`. **Odotettu HEAD (§0):** HEAD on se commit joka committaa tämän HANDOFF.md-version. Verifioi: `git rev-parse HEAD` == `git log -1 --format=%H -- HANDOFF.md`. Jos eri → jokin on committattu HANDOFF.md-commitin jälkeen → STOP, raportoi. **Älä oleta `296ee72`:ta eikä `bb4ed24`:ta** — ne ovat recon-pohja ja edeltävät doc-commitit, eivät H-001:n HEAD.
- `git status --porcelain` tyhjä session-aikaisista muutoksista; pre-existing untracked `PLAN.md` + `streetlifting_16w_v4.32.8.csv` sallittu. **Jos kymmeniä tiedostoja näkyy muuttuneina ilman todellista sisältömuutosta → rivinpääte-kohina (CRLF/LF). STOP ja raportoi Akselille. ÄLÄ normalisoi rivinpäätteitä** — se olisi ~80 tiedoston muutos joka rikkoo kohta 3:n scope-lukon; se ei kuulu H-001:een. (Kohina on havaittu Cowork-mountilta; onko se näkyvissä Windows-natiiville Code-sessiolle, ei ole varmaa — mutta jos näkyy, STOP.)
- **§2:n rivinumeroiden validointi:** aja `git log --oneline -- engine.js tools/engine-pilot/lib/audit-engine.mjs`. Viimeisin näitä koskenut commit on `f47ae1d` (engine.js) / `77abf61` (audit-engine.mjs), molemmat recon-pohjaa vanhempia. Jos jokin uudempi commit on koskenut niitä → §2:n rivinumerot ovat vain viitteellisiä; **paikanna funktionimellä** (funktionimet pysyvät, rivinumerot eivät).
- **Stop hook** on `.claude/settings.json`:ssa määritelty mekanismi joka **laukeaa automaattisesti Code-session päättyessä** — sitä ei "ajeta". Se ajaa `node tools/engine-pilot/lib/smoke-test.mjs` + `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w`, lokit `/tmp/leve-*.log`, `exit 1` jos kaatuu. PRE-FLIGHTissä: aja **samat kaksi komentoa käsin** kerran baseline-tilassa; vahvista "64/64 päivää, 0 virhettä" ennen muutoksia. Jos baseline ei ole vihreä → STOP, ongelma ei ole H-001:ssä.

**2. PERUUTUSANKKURI** — H-001-konkretisointi:
- Ennen ensimmäistä muutosta: `git branch backup-pre-h001-<sha>` — **haara, ei tagi** (`docs/SELKARANKA.md` kohta 2: `git branch backup-pre-<kierros>-<sha>`). `<sha>` = `git rev-parse --short HEAD` PRE-FLIGHT-hetkellä (= HANDOFF.md-AKTIIVINEN-commitin SHA). Vahvista `git rev-parse backup-pre-h001-<sha>` == HEAD.
- Kirjaa palautuskomennot push-raporttiin: `git reset --hard backup-pre-h001-<sha>` (koko handoff) tai `git revert <commit>` (yksi commit). Älä poista haaraa ennen kuin Akseli on ratifioinut pushin.

**3. SCOPE-LUKKO** — H-001:n valkolista (sallittu `git diff`; STOP jos diff ylittää):
- `engine.js` — `generateBlockTuningPackage`, `generateGenericBlockTuningPackage`, `generateEndOfCycleTuningPackage`, `buildAiPrompt`, slot-resolver (vain kuorma-kenttien konsistenssi, ei laskentalogiikka).
- `tools/engine-pilot/lib/audit-engine.mjs` — `auditInvariants` (B2:n uusi emissio).
- `test-runner.js` — vain uudet yksikkötestit (lisäys, ei muutos olemassa oleviin).
- **EI** `recommend()`-polkua, **EI** e1RM-funktioita, **EI** `data.js`-skeemaa. B5 voi PRE-FLIGHTissä supistua: jos skannaus paljastaa `data.js`-skeematarpeen → B5 → H-002 (§5 kohta 3, §6 K4); H-001 = neljä committia.

**4. DIFF-CONTROL erillisinä committeina** — H-001-konkretisointi:
- B1, B2, B3, B4, B5 = viisi erillistä committia, yksi muutoslähde kukin (§5 kohta 4). Sulauta kaksi vain jos diagnoosi todistaa saman juuren — ja raportoi se löydöksenä. Ei niputusta. (Diff-control on `docs/SELKARANKA.md` kohta 4:n mukaan commitin **erottelu**, ei rivimäärä-raja.)

**5. STOP-EHDOT** — H-001:n ehdot *(jokainen = pysähdy + raportoi + odota Akselia, ei autonomista kiertoa):*
- **Kaikki kohta 1:n PRE-FLIGHT-STOPit ovat voimassa** (Tila ≠ AKTIIVINEN · HEAD ei ole HANDOFF.md-commit · CRLF-kohina · ei-vihreä baseline · engine.js muuttunut recon-pohjan jälkeen).
- smoke-komento FAIL → STOP.
- regressio-pilot ≠ "64/64 päivää, 0 virhettä" — mikä tahansa kuorma-/rep-/Vx-poikkeama baselineen → STOP, diff Akselille.
- `git diff` koskettaa kohta 3:n valkolistan ulkopuolta → STOP.
- B2:n uusi `INVARIANT_VIOLATION_SLOT_MISMATCH` laukeaa pilot-skenaariossa → STOP (pilot-baselinen päivitys vain Akselin luvalla, §6 K2).
- B5 paljastaa `data.js`-skeematarpeen → STOP, B5 → H-002 (§6 K4).
- mikä tahansa §6:n avoin kysymys (K1–K5) osuu toteutuspolulle → STOP, kysy — älä arvaa.

**6. MITTARI-ENSIN** — H-001-konkretisointi:
- `docs/SELKARANKA.md` kohta 6: gate-syöttöinen invariantti on todennettava tunnetulla positiivisella **ja** negatiivisella tapauksella + aritmetiikka käsin, ennen kuin siihen luotetaan.
- H-001 tuo yhden uuden gate-syöttöisen invariantin: B2:n `INVARIANT_VIOLATION_SLOT_MISMATCH`. **Se ei ole repossa — B2 luo sen** `auditInvariants`:iin. Ennen kuin se kytketään audit-gateen, todenna: **tunnettu-positiivinen** (Vk 7 LA paused squat -slot ristiriitaisin kuorma-arvoin → flagi laukeaa) **ja tunnettu-negatiivinen** (konsistentti slot → flagi EI laukea), `roundToHalf`-toleranssi käsin tarkistettuna. Tämä on §2 A3:n sisältö.
- Sama todistustaso B1:n korjattuun aggregaattiin: tunnettu sessiojoukko → käsin laskettu odotusarvo (§2 A1).

**Per-commit-rytmi** *(yhdistää kohdat 3, 5, 6 + `CLAUDE.md` §3–§4):*
1. Toteuta yksi B-korjaus kohta 3:n valkolistan sisällä.
2. Aja smoke- ja pilot-komennot käsin (samat jotka Stop hook ajaa): `node tools/engine-pilot/lib/smoke-test.mjs` → `node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w`. Todentaa A0:n (engine-käytös bittitarkka).
3. Todenna B:n acceptance (§2) CLI-tasolla: engine-pilot tuo `engine.js`:n jo nyt (`tools/engine-pilot/lib/engine-bridge.mjs`), joten AI Block Tuning -funktiot ovat ajettavissa node-harnessilla per-B-reproa varten. B1/B3:lle kirjoita lisäksi yksikkötesti `test-runner.js`:ään — **se on selainpohjainen (`?test=1`); Code ei voi ajaa sitä CLI:stä, Akseli ajaa sen acceptance-vaiheessa** (kohta 8).
4. Kaikki CLI-tasolla vihreää → kirjoita commit (kohta 7). Punaista → STOP (kohta 5).
5. Poikkeustilanteessa palautus: `git reset --hard backup-pre-h001-<sha>` (koko handoff) tai `git revert <commit>` (yksi commit).

**7. KEVYT LEDGER-RIVI** — H-001-konkretisointi:
- Kanoninen sparring-ledger elää sparring-keskustelussa; **Code ei kirjoita siihen** (`docs/SELKARANKA.md` kohta 7 + 9, L42-ehto). Code tekee rakenteelliset päätökset **rakenteellisesti näkyviksi** kahdella mekanismilla — commit-body (alla) ja push-raportti (kohta 8) — joista Akseli siirtää ne kanoniseen ledgeriin. Erota ratkaistu päätös (§5) ja avoin aukko (§6) — älä sekoita.
- Commit-otsikko: `refactor(H-001): B<n> — <lyhyt kuvaus>` (esim. `refactor(H-001): B1 — aggregaattien rajaus yhtenäistetty`).
- Commit-body noudattaa repon **vakiintunutta konventiota** (commitit `4f3c4e3`…`296ee72`): Juurisyy + Muutokset (tiedosto:rivi); `Acceptance criteria: <A-kriteeri>`; `Tutkimusinvariantit (CLAUDE.md osio 2): EI muutettu.`; `Smoke + pilot regression PASSED (64/64 paivaa, 0 virhetta).`; `Backup-anchor: backup-pre-h001-<sha>`; `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. **Lisäksi kaksi H-001-spesifistä riviä** (laajennettu konventio, ei vakiintunut): `Diff: <netto-rivimäärä> riviä.` ja `Selain-testit (?test=1): EI ajettavissa CLI:stä — Akseli ajaa.`

**8. EI PUSHIA ilman lupaa** — H-001-konkretisointi:
- Kun kaikki commitit valmiit, Code **EI pushaa**. Push-raportti Akselille: commit-lista (hash + otsikko); per commit smoke + pilot -tulos + netto-diff-rivimäärä; muuttuneet tiedostot + kokonaisrivimäärä; **selaintestien tila** (Code ei ajanut `?test=1`:tä — Akseli ajaa sen ennen ratifiointia); rakenteelliset päätökset vs. avoimet kohdat (kohta 7:n erottelu); supistuiko B5 → H-002.
- Päätä raportti kysymykseen **"PUSH OK?"** — odota Akselin eksplisiittistä ratifiointia (vrt. commit `296ee72`: "EI suoritettu — odottaa Akselin 'PUSH OK' -ratifiointia").

**9. LEDGER-IMMUTABILITEETTI** — H-001-konkretisointi:
- Code ei rekonstruoi eikä muuta kanonisen ledgerin literaaleja. Tämä `HANDOFF.md`, commit-historia ja `docs/SELKARANKA.md` ovat **avustavia dokumentteja** — ne eivät korvaa kanonista ledgeriä (`docs/SELKARANKA.md` kohta 9).
- Jo pushattua committia ei muuteta; `git commit --amend` vain ennen pushia. `HANDOFF.md` §7 "Session-tulos" täytetään kerran, session lopussa.

## 4. Atletti-vastaukset critical questions -kysymyksiin

**Ei sovellu** — tyyppi on `refactor`, ei `block-tuning`. Akselin Q1–Q7-vastaukset ovat hyödyllistä taustaa ja ne on koottu §5:een (kohta 4), koska ne osoittavat *miksi* B-heikkoudet ovat merkittäviä — eivät atletti-suorituksen syötteinä.

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**1. Tyyppipäätös: `refactor` + `architecture`-piirre, EI `block-tuning`.** Perustelu osiossa 0. Lukittu — Code ei re-litigoi.

**2. Korjauskohde on sovelluskoodi, EI ulkoinen AI.** Auditoinnissa (kontekstipaketti + LISÄYS A = AI:n raakavastaus 1.0 + LISÄYS B = alkuperäinen syöte 1.0) todettiin, että AI:n vastaus oli substanssitasolla onnistunut. Viisi heikkoutta ovat sovelluksen AI:lle välittämässä JSON-syötteessä — ei AI-puolella. H-001 ei muuta promptin *analyysiohjeita*, vain korjaa syötteen rakenteen (B1–B3, B5) ja lisää tech-stack-faktan (B4).

**3. B5-arkkitehtuuriratkaisu: valittu vaihtoehto (b) — erillinen `currentWeekCalibrationSets`-kenttä.** Kolme harkittua vaihtoehtoa:

- *(a) `completedBlock` laajennetaan `transitionWeek`-aliosiolla.* **Hylätty:** semanttinen ristiriita — vk 4 on käynnissä oleva deload-viikko, ei osa päättynyttä Foundation-blokkia (vk 1–3). Käynnissä olevan viikon upottaminen "completedBlock"-objektiin tekee nimestä valheen ja altistaa myöhemmät kuluttajat virhetulkinnalle.
- *(b) Erillinen `currentWeekCalibrationSets`-kenttä syötteen juureen.* **Valittu.** Additiivinen — `completedBlock.weeks` pysyy `[1,2,3]`, mikään olemassa oleva kenttä ei muuta merkitystään → pienin regressioriski ja yhteensopivin refactor-rajan kanssa. Semanttisesti rehellinen: kalibrointitreenit ovat aito oma kategoriansa. Edellyttää että prompt-pohja (B4-alue) kuvaa kentän — siksi B5 toteutetaan B4:n jälkeen.
- *(c) AI Block Tuning ajetaan vk N+1 -alussa, ei vk N -lopussa.* **Hylätty:** muuttaa ominaisuuden ajoitusta = käyttäytymismuutos, joka rikkoo refactor-periaatetta. Vaatisi `deloadWeeks`-tunnistuksen ja `blockMap`-avainnuksen uudelleenkirjoituksen (r. 6317, 6325–6329). Lisäksi se poistaa deload-viikon toimenpideikkunan: vk N+1 -alussa seuraava blokki on jo alkanut eikä suosituksiin ehdi reagoida.

B5 toteutetaan tämän handoffin viidentenä committina **jos** vaihtoehto (b) pysyy pienenä (uusi kenttä + kuluvan viikon settien keruu olemassa olevasta `allSets`/`sessions`-datasta + prompt-maininta). **Scope-gate:** jos Code havaitsee että keruu vaatii `data.js`-skeemamuutoksen tai koskettaa resolveria, B5 pysähtyy ja irtoaa omaksi handoffikseen H-002 (`architecture`). Ks. §3.5 kohta 3 + §6 K4.

**4. Commit-rakenne: viisi erillistä committia, ei yhtä nippua.** B1, B2, B3, B4, B5 kukin omana committinaan. Perustelu: jokainen heikkous on itsenäinen vika omalla acceptance-kriteerillään; erilliset commitit pitävät `git bisect`:n käyttökelpoisena jos regressio ilmenee, ja sallivat yksittäisen korjauksen perumisen ilman muiden menetystä. Järjestys B1 → B2 → B3 → B4 → B5: B5 viimeisenä koska se nojaa B4:n korjaamaan prompt-pohjaan. Stop hook ajetaan jokaisen commitin kohdalla (A0 pitää joka commitilla). Commit-muoto: §3.5 kohta 7.

**5. Akselin Q-vastaukset (taustaksi — selittävät B-heikkouksien vaikutuksen):**

- *Q1 (vk 2 ti 5.5.):* sessio tuntui kevyeltä, ei väsyttävältä — sarjat helposti @125 kg vaikka prescribed Vx=3. → AI:n YELLOW-status oli osin väärin diagnosoitu; oire oli K-alikalibrointi, ei recovery. Osoittaa B-luokan syöteviat: parempi syöte olisi tukenut oikeaa tulkintaa.
- *Q2 (BW-MU):* stabiili, tehty 5×2 @+5 kg V2. → `profile.prs` ei sisältänyt muscle-up-PR:ää syötteessä.
- *Q3 (BW-trendi):* tasainen 89 kg. → `profile.bw` (89) ja `calibration.bwKg` (91) ristiriidassa syötteessä.
- *Q4 (nivelet):* ei oireita. *Q5 (kisapäivä):* 22.8.2026 (la). *Q6 (vk 3 la accessory):* takakyykky-perusvariantti. *Q7 (Enode Pro):* käytössä, mutta MV-arvot eivät päädy syötteeseen luotettavasti.

**Havaitut viereiset syötepuutteet, jotka EIVÄT ole H-001:n scopessa** (Q2 + Q3): `profile.prs`:n puuttuva muscle-up-PR ja `profile.bw` vs. `calibration.bwKg` -ristiriita (89 vs. 91) eivät kuulu heikkouksiin B1–B5. Ne ovat atletti-datan yhtenäistystä, eivät rakenteellisia koodivikoja. Scope-lukon mukaisesti niitä **ei korjata tässä** — kirjattu §6:een (K5) Akselin päätettäväksi.

**6. B2:n canonical-kuormalähde: `loadPct`.** Kun slotin kuorma-kentät ovat ristiriidassa, slot-tuotantokoodi nojaa yhteen auktoritatiiviseen **kuorma-intentti**-kenttään ja johtaa kuvailevat kentät siitä. Valittu `loadPct`, koska: (i) se on **dimensioton** ja toimii sekä barbell- että BW-skaalatuilla liikkeillä — absoluuttinen `suggestedLoadKg` ei skaalaudu BW-pohjaisille liikkeille oikein, joten sitä **ei saa** valita canoniseksi; (ii) `note` on kuvailevaa tekstiä ja `suggestedLoadKg` fallback-siemen — molemmat johdannaisia, eivät totuuden lähteitä. Seuraus: `note`-teksti regeneroidaan `loadPct`:stä (verbatim-esimerkin "@70%" → "@59,5%"); `suggestedLoadKg` sovitetaan `loadPct`-johdetuksi tai jätetään pois AI Block Tuning -serialisoinnista. **`resolvedLoadKg` on eri asia:** se on ajonaikainen, resolvoitu kuorma (slot-resolver n. r. 4395–4594, laskettu efektiivisestä resolve-pct:stä `slotPctForResolve`, joka taittaa sisään tier-/lähde-säädöt — ei identtinen staattisen `loadPct`:n kanssa). Se voi **legitiimisti** poiketa `loadPct × e1RM`-arvosta. B2:n korjaus ei pakota `resolvedLoadKg`:tä yhtä suureksi `loadPct`-johdannaisen kanssa — se varmistaa että serialisointi **nimeää** kunkin kentän roolin (kuorma-intentti vs. ajonaikainen resolvoitu) niin ettei AI sekoita niitä. Ks. §6 K2.

**7. B3:n neljä tilaa.** Export-syötteen on erotettava nämä neljä tilaa toisistaan (encoding-tapa = §6 K3):

| Tila | Merkitys | Esimerkki |
| --- | --- | --- |
| `data` | kenttä sisältää havaintoja | `trends.hrv` = mittauspisteitä |
| `empty` | mitattu, ei havaintoja tällä jaksolla | HRV-mittauksia ei kirjattu tällä blokilla |
| `unavailable` | dataketju rikki — pipeline ei tuota arvoa | Enode-velocity ei päädy syötteeseen |
| `not-implemented` | kenttää ei ole vielä toteutettu | `engineRuleFrequency` ennen v4.34.28 |

Nykytila esittää kaikki neljä erottelemattomana tyhjänä (`[]`/`{}`) → AI ei voi erottaa "ei dataa" -syytä. B3 korjaa tämän; tilojen *merkitys* on tässä lukittu, *encoding* on K3.

## 6. Avoimet kysymykset

> Code kysyy nämä Akseliltä ENNEN toteutusta — ei arvaa (`CLAUDE.md` §8 kohta 5; §3.5 kohta 5).

**K1 (B1):** Mikä on kanoninen rajaus aggregaateille? Konkreettisesti: (a) lasketaanko `completedSets` vain valmiista, ei-warmup-seteistä (`completed && !isWarmup`, kuten `engine.js` r. 5318); (b) sisältyykö käynnissä oleva deload-viikko (vk N) aggregaatteihin vai vain päättyneet blokkiviikot; (c) lasketaanko backfill-kirjatut sessiot/setit mukaan? **Cowork-suositus:** molemmat metriikat **sisältävät** backfill-kirjatut sessiot/setit — ne ovat aitoa toteutunutta volyymiä, vain kirjattu jälkikäteen. Jos backfill jätetään pois, AI näkee vain osajoukon todellisesta volyymistä ja Israetel-MRV-vertailu menee pieleen *alaspäin* (raportoi tilaa volyyminnostolle jota ei todellisuudessa ole) — substanssikriittinen virhe. Yhtenäistä lisäksi sama viikkorajaus ja sama warmup-suodatus. Akseli vahvistaa lukittavan rajauksen.

**K2 (B2):** Kaksi kysymystä. (1) Sisältääkö `akseli-elite-streetlifter` / `full-16w` -pilot-skenaario slotteja, jotka uusi `INVARIANT_VIOLATION_SLOT_MISMATCH` laukaisisi? Jos kyllä → Stop-hook-pilotin baseline vaatii tahallisen päivityksen, ja se tehdään vain Akselin luvalla (§3.5 kohta 8 + §3). Code raportoi havainnon ennen emission kytkemistä Stop-hook-polkuun. (2) Onko `resolvedLoadKg`:n poikkeama `loadPct × e1RM`-arvosta tahallinen tulos efektiivisestä resolve-pct:stä (tier/lähde), vai itsessään bugi? Code verifioi slot-resolverista (n. r. 4395–4594). **Cowork-tulkinta:** poikkeama on legitiimi → `INVARIANT_VIOLATION_SLOT_MISMATCH` koskee vain kuorma-intentti-kenttien keskinäistä ristiriitaa, ei `loadPct` vs. `resolvedLoadKg` -eroa. Jos resolveri paljastaa että poikkeama on bugi → oma vikansa, H-001:n B2-scopen ulkopuolella.

**K3 (B3):** Tyhjän trendin encoding — `{ "status": "unavailable", "reason": "…" }` -objekti vai sovittu `null`? Tilojen *merkitys* on lukittu (§5 kohta 7); kyse on edustustavasta ja `reason`-kentän tarkasta arvojoukosta. **Cowork-suositus:** status-objekti, `reason` ∈ {`empty`, `unavailable`, `not-implemented`}. Akseli vahvistaa.

**K4 (B5):** Kun Code on skannannut repon: riittääkö `currentWeekCalibrationSets`-keruuseen olemassa olevan `allSets`/`sessions`-datan luku kuluvalta viikolta, vai vaatiiko se `data.js`-skeemamuutoksen? Jos jälkimmäinen → B5 irtoaa handoffiksi H-002 (§5 kohta 3 scope-gate).

**K5 (viereinen scope):** Korjataanko Q2/Q3:n paljastamat syötepuutteet (`profile.prs` puuttuva muscle-up; `profile.bw` 89 vs. `calibration.bwKg` 91) — omana jatkohandoffinaan, osana H-001:tä erillisellä luvalla, vai data-korjauksena? Sama kysymys velocity-kenttien null-ongelmasta (kontekstipaketti C kohta 4). **Cowork-suositus:** erillinen jatkohandoff, ei H-001:n laajennusta.

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<lista>` |
