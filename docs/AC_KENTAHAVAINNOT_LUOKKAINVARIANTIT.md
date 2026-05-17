# Acceptance criteria — kenttähavaintojen formalisointi luokkainvarianteiksi

> **Tarkoitus:** Tämä tiedosto formalisoi Akselin kenttämuistiinpanot (2026-05-16, ~10 havaintoa secondary takakyykky 147/V3:n ympärillä) **generatiivisiksi luokkainvarianteiksi** — sääntöjä joita ohjelmointikoneen tuottaman ohjelman on AINA täytettävä missä tahansa liikkeessä, työsarjassa ja treenissä, ja joita regressio-pilot voi tarkistaa koko ohjelman yli.
>
> **EI pistemuoto.** Yksittäiset 147/V3-tyyppiset havainnot ovat NÄYTTEITÄ luokista, eivät spesifikaatio. Tehtävä on tunnistaa minkä geneeristen sisäisen epäjohdonmukaisuuden luokkien näytteitä ne ovat, ja muotoilla luokat acceptance criterion -invarianteiksi jotka koskevat **koko ohjelmaa**, eivät yksittäistä kohtaa.
>
> **EI koodimuutosta.** Tämä on diagnostinen + formalisoiva ajo. AC:t kirjataan, kategorioidaan ja kytketään juurisyy 1/2 -korjaukseen. Korjaustyö tapahtuu erillisinä /goal-kierroksina sen jälkeen kun Akseli on päättänyt jatkojärjestyksen.
>
> **Lue rinnan:**
> - [`docs/SESSION_CLOSE_2026-05-16.md`](SESSION_CLOSE_2026-05-16.md) — juurisyy 1 (default-meson phase↔VL-cap-ristiriita) + juurisyy 2 (streetlifting_16w vk12 deload) avoimet päätöskohdat
> - [`docs/ACCEPTANCE_CRITERIA_SKEEMA.md`](ACCEPTANCE_CRITERIA_SKEEMA.md) — AC-formaatti jota tämä tiedosto noudattaa
> - [`docs/BACKLOG_VAIHE_1_2.md`](BACKLOG_VAIHE_1_2.md) — ENG-1 … ENG-17 (ENG-16 = juurisyy 1, ENG-17 = juurisyy 2)
> - [`docs/TUTKIMUS_INVARIANTIT.md`](TUTKIMUS_INVARIANTIT.md) — A–H tutkimusinvariantit ja niiden koneluettavat vakiot

---

## 1. Konteksti ja strateginen ydin

Akselin fokus EI ole ~10 muistiinpanon yksittäinen kuittaaminen. Fokus on **ohjelmointikoneen täydellisyys** — koneen generoima ohjelma on sisäisesti johdonmukainen jokaisessa liikkeessä, jokaisessa työsarjassa ja jokaisessa treenissä — ei yksittäisten pisteiden paikkaaminen.

Tehtävän strateginen ydin: juurisyy 1 -korjaus on verifioitava näitä generatiivisia AC:tä vasten **koko ohjelman yli**, ei vain default-mesolla. Muuten korjaus voi viedä default-meson invarianttien sisään ja jättää muut mesotyypit (esim. streetlifting_16w secondary takakyykky V3-tavoite / V1-toteuma) elämään, koska kukaan ei koskaan kirjoittanut testiä joka olisi sen napannut.

Käytännössä: pilot-regressio ajetaan kaikilla 8 profiililla × 148 sessiota, ja jokainen alla luetelluista AC:istä tarkistetaan kaikista sessioista. Yhdenkin profiilin yksittäinen rikkomus = INVARIANT_VIOLATION-flagi.

---

## 2. Luokka-analyysi — abstrahointi muistiinpanoista

Muistiinpanot (KH-1 … KH-7) jäsenneltynä geneerisiksi luokiksi. Kukin luokka: täsmällinen määritelmä, mitkä muistiinpanot ovat sen näytteitä, arvioitu engine.js/data.js/index.html-koodikohta.

### Luokka L1 — Intra-session-takaisinkytkennän rooli-leikkaus

**Määritelmä:** Engine reagoi sarjan toteumaan (`selectedVara ≤ targetVx - 2` near-failure tai `selectedVara ≥ targetVx + 2` capacity-bump) **vain primary/backoff-rooleilla**; secondary/accessory-roolit jäävät täysin reaktion ulkopuolelle vaikka kyseessä olisi raskas voimaliike (esim. streetlifting_16w secondary takakyykky 147,5 kg V1 → S2-S4 ehdotuksena edelleen sama paino sama Vx).

**Näytteet:**
- KH-1a: 147,5 × 5 V1 ekassa työsarjassa (target V3), seuraavan sarjan ehdotus säilyy 147,5 V3 → kone ei opi sarjojen välillä.
- KH-1c kontekstissa: secondary takakyykky tiistai vs lauantai, eri kuorma eri päivä, koska ei intra-session-säätöä joka olisi voinut korjata päiväkohtaista mismatchia jo edellisellä kerralla.

**Arvioitu koodikohta:**
- [index.html:12882](index.html:12882) — `const isPrimary = exercise.role === "primary" || exercise.role === "backoff";` near-failure-drop-haarassa
- [index.html:12846](index.html:12846) — vastaava capacity-bump vain primary
- [engine.js:1343-1429](engine.js:1343) — `failureReaction` reagoi vain V0:aan (selectedVara === 0), ei V1:een tai muihin near-failure-tiloihin (V0 = täysi failure, V1 = onnistui mutta yksi vara)

### Luokka L2 — Paralleelisten ehdotusten internal-load-monotonia

**Määritelmä:** SAFE/TARGET/AGGRESSIVE-tier-ehdotusten internal load (esim. Epley-e1RM) ei monotonisoi labelin kanssa. "Varovainen" (kuorma −1,5 % × Vx +1) voi vaatia korkeamman 1RM:n kuin "tavoite", koska kuorman −1,5 % ei kompensoi Vx-eron +1 vaikutusta Epley-e1RM-laskennassa.

**Aritmeettinen todiste (KH-5):** target = 69 × 5 V3 → safe = 68 × 5 V4.
- Target Epley e1RM = 69 × (1 + (5+3)/30) = 69 × 1,2667 = **87,4 kg**
- Safe Epley e1RM = 68 × (1 + (5+4)/30) = 68 × 1,3 = **88,4 kg**
- Safe e1RM (88,4) > Target e1RM (87,4) → "varovainen" vaatii suuremman 1RM:n → label ja internal load erkanevat.

**Näytteet:**
- KH-5: "Miten 68 V4 on ns kevyempi vs 69 V3 — ohjelmointikoneen loogisuuden tarkastaminen". Käyttäjä on tunnistanut epäloogisuuden ilman e1RM-laskentaa — pelkän intuitiivisen "kummalla on enemmän internal load" -arvostelman pohjalta.

**Arvioitu koodikohta:**
- [engine.js:3131-3164](engine.js:3131) — `generateSuggestions`-funktio: `SAFE_SPACING = 0.015`, `VX_OFFSET = 1`. Formula `safeLoad = targetLoad × (1 - 0.015)` ei skaalaudu Vx-eron mukaan.

### Luokka L3 — Peräkkäisten samaa liikettä koskevien treenien välinen kuormajatkuvuus

**Määritelmä:** Engine ei kontrolloi peräkkäisten saman liikkeen treenien välistä session-tason kuormahyppyä tutkimusperusteisella rajalla. Jos sama liike treenataan esim. 2x/vk, kahden peräkkäisen session-parin (esim. ti vs la) välinen kuormamuutos voi rikkoa Latella 2020 elite-tier-rate-rajan (≤ 0,05 ×/vk = ~2,5 % per sessio jos 2x/vk), ilman että trace-historia tunnistaa rikkomusta.

**Näytteet:**
- KH-1c: secondary takakyykky tiistai 147 V1 vs lauantai 135 V4. Kuormahyppy = (147 − 135) / 135 = +8,9 % yhden viikon sisällä saman liikkeen kahden session välillä. Jos vk-rate-cap on elite ≤ 5 %, tämä ylittää 1,78 ×.
- KH-5b: dippi 65,5 kg 4×6 V3 → 69 V3 (tai 68 V4) — onko progression-rate Latellan rajan sisällä?

**Arvioitu koodikohta:**
- [data.js generateMultiBlockMesocycle + engine.js recommend()](engine.js:3252) — mesocycle-rakentaja ei vahvista session-tason rate-cappia
- [wizard/wizard-2b-mapper.js applyTierProgression](wizard/wizard-2b-mapper.js) — tier-mult koskee viikkotasoa, mutta sessions-välistä yhteenlaskua ei tehdä

### Luokka L4 — Warmup-rampin monotonia suhteessa työpainoon

**Määritelmä:** Lämppäri-ramp ei jakaudu monotonisesti suhteellisina osuuksina työpainosta. Engine.js:n `ENGINE_DEFAULT_WARMUP_RAMP` määrittää `[0,40, 0,55, 0,70, 0,85]`-skeletonin (viimeinen 85 % työpainosta), mutta jos UI-render tai preset-skeleton ohittaa tämän, lämppäreiden ja työpainon välille voi syntyä epäjatkuva hyppy (esim. ramppi 60 → 95 → workSet 147 kg, jossa lastWarmup/workLoad = 95/147 = 0,646 = alle 0,75 -kynnyksen).

**Näytteet:**
- KH-1b: "Lämmittelytekstit 60×5, 95×3 ja sitten heti 147 on tarkistettava lämppäritekstinä." Hyppy 95 → 147 = +52 kg = +55 % yhden askeleen sisällä, viimeisen lämpparin suhde työpainoon 0,646 < 0,75 — ramppi ei käytä `ENGINE_DEFAULT_WARMUP_RAMP`-skeletonia.

**Arvioitu koodikohta:**
- [engine.js:3056-3061](engine.js:3056) `ENGINE_DEFAULT_WARMUP_RAMP` (v4.49.2 QF-1 injektoi tämän kun preset ei määrittele warmupSetsia)
- [data.js:5795-5807](data.js:5795) `RAMP_DEFAULT` / `RAMP_BARBELL` preset-skeletoneissa
- Streetlifting_16w secondary takakyykky -slotin warmupSets-määrittely (jos siinä on hardkoodattuja kuormia/prosentteja, ne voivat ohittaa engine-skeletonin)

### Luokka L5 — Kontekstuaalisten päätösten trace-kattavuus

**Määritelmä:** Kun engine tekee päätöksen joka pohjautuu epäsuoraan kontekstiin (deload-ennakointi, block-transition load-up, week-3 push, calibration-sessio, recovery-veto), tämä päätös pitää näkyä trace-rivillä eksplisiittisesti — atletti ei voi luottaa "miksi tämä paino?"-ketjuun jos perustelu on implisiittinen. ENG-2:n perheeseen kuuluva tracing-puute laajennettuna kaikkiin kontekstuaalisiin päätöksiin.

**Näytteet:**
- KH-1d: "Deload ensi viikolla, mahdollinen ennakointi" — käyttäjän hypoteesi siitä, että kone ehkä load-uppaa vk 3:n kuormat. Joko (a) engine tekee tätä mutta ei traceaa = bugi, tai (b) engine ei tee tätä mutta käyttäjä luulee niin = trace puuttuu joka olisi voinut kertoa "ei load-uppia".
- KH-2: "En ole varma kuinka tehokkaasti velocity data ohjaa treenin aikana." Sama luokka: jos velocity-data vaikuttaa päätökseen, sen pitää näkyä trace-rivillä; jos ei vaikuta, sen pitää olla eksplisiittisesti todettu.

**Arvioitu koodikohta:**
- [engine.js:3252+ recommend()](engine.js:3252) trace-emit-kohtia
- ENG-2:n laajennus (`AGGRESSIVENESS_LEARNED_UPDATED` puuttuu) on saman luokan näyte aiemmin tunnistettuna

### Luokka L6 — Velocity-varoituksen ja Vx-tavoitteen ristiriidattomuus

**Määritelmä:** Velocity-perusteinen lopetus-/lasku-varoitus (esim. "velocity 0,46 m/s alittaa tavoitteen 0,50 m/s — harkitse kuorman laskua tai sarjan lopettamista") ja Vx-tavoite eivät saa lähettää ristiriitaisia signaaleja samalle sarjalle. Jos velocity laskee mutta atletin Vx-tavoite vielä reilusti optimissa (esim. V3, atletti voi jatkaa toistoja), velocity-varoitus on joko (a) liian aggressiivinen tai (b) tarvitsee yhteensovituksen Vx-tavoitteen kanssa trace-rivillä.

**Näytteet:**
- KH-6: "Velocity 0,46 m/s alittaa tavoitteen 0,50 m/s … samalla kuitenkin tavoittelemme V3, jonka kyllä näkee että menisi jo sen perusteella, että toistojen nopeus laskee aika vähän." Kahden eri säätökanavan signaali on ristiriidassa.

**Arvioitu koodikohta:**
- [index.html:12919+](index.html:12919) `slot.velocityStop`-tarkistus joka emittoi varoituksen ilman Vx-tavoitteen yhteensovittamista
- [engine.js velocityLossPercent + targetRep1VelocityRange](engine.js:3046) — velocity-cap ja Vx-tavoite ovat erillisiä kanavia ilman sovituslogiikkaa

### Luokka L7 — Velocity-datan monimittainen tulkinta (β-katon takana)

**Määritelmä:** Kun velocity-data on saatavilla useammasta sarjasta (esim. atletti tekee primal-sarjat 120 kg:lla, joista keskiarvo on 0,71 m/s mutta sarjojen sisällä on rep1-MPV, lastRep-MPV, VL%, sarjojen välinen progressio), engine ei saa tukeutua pelkkään keskiarvoon. Tutkimuspohjaisesti rep1-MPV ennustaa kuormaa (Sánchez-Moreno 2017), sarjojen sisäinen VL% ennustaa fatiikkia (Pareja-Blanco 2017), ja sarjojen välinen rep1-drift ennustaa autoregulaatiota (Jukic 2024). β-tutkimus on osoittanut että fatiikkidynamiikka ja sarjojen välinen rep1-drift EIVÄT ole evidenssipohjaisesti opittavissa luotettavasti oppivana mallina yksilödatasta.

**Näytteet:**
- KH-6b: "Tein myös primal sarjat alle 0,71 nopeudella 120 kgllä — mitä tulkintoja kone otti velocity datasta, vai katsooko vain 'ka. 0,5 alle, ei optimaalista foundation blokissa'."

**Arvioitu koodikohta:**
- [engine.js velocityLossPercent](engine.js:3046), `computeRtfVelocityModel`, `predictVxFromVelocity` — käyttävät rep1+lastRep VL%-laskentaan, mutta sarjojen välistä rep1-driftiä ei aggregoida luotettavaan fatiikkiestimaattiin

---

## 3. Generatiiviset AC-invariantit

Kukin alla oleva AC on **generatiivinen invariantti** muotoa "minkä tahansa liikkeen / minkä tahansa työsarjan / minkä tahansa treenin kohdalla koneen ehdotuksen on täytettävä [testattava ehto]". EI pistemuotoa. Regressio-pilot tarkistaa kaikki AC:t koko ohjelman yli (8 profiilia × 148 sessiota).

### A1 — Intra-session-feedback on rooli-riippumaton

**Konteksti:** Engine.js:n `failureReaction` reagoi V0:aan kaikilla rooleilla, mutta near-failure-drop (`selectedVara ≤ targetVx − 2`) ja capacity-bump (`selectedVara ≥ targetVx + 2`) toimivat vain primary/backoff-rooleilla. Secondary-tyyppiset raskaat voimaliikkeet (esim. streetlifting_16w secondary takakyykky) jäävät intra-session-säädön ulkopuolelle.

**Tutkimusinvariantit joita kunnioitetaan:** [TUTKIMUS_INVARIANTIT.md osio E](TUTKIMUS_INVARIANTIT.md) (Refalo 2023 failure-jälkeinen kuormapudotus 5 %) — laajennetaan koskemaan near-failure-tiloja secondary-rooleilla, koska role-luokitus ei oikeuta jättämään raskasta voimaliikettä säätelyttä.

**Mitattu miten:** Regressio-pilot ajaa 8 profiilia × 148 sessiota syntetisoiduilla actualVx-sekvensseillä (S1 actualVx = targetVx ± 2 tai ± 3). Jokainen sessio: tarkistetaan että jos delta |targetVx − actualVx| ≥ 2 JA liikkeessä on jäljellä työsarjoja, niin joko (a) jäljellä olevien sarjojen kuorma tai targetVx on säätyy, tai (b) trace sisältää `INTRA_SESSION_FEEDBACK_SUPPRESSED`-rivin perusteltu suppression-syyllä (esim. `role=accessory_isolation` + tutkimusperuste "ei kriittinen säätötarve").

**Onnistumisen ehto:** 0 `INTRA_FEEDBACK_GAP`-flagia 148 × 8 sessioissa.

**Syöte joka rikkoisi:** streetlifting_16w secondary takakyykky session, jossa S1 = targetLoad × targetReps V1 (target V3), S2-S4 ehdotuksena edelleen sama paino + sama V3-tavoite ilman SUPPRESSED-tracee.

**Lähde:** [index.html:12882](index.html:12882), [index.html:12846](index.html:12846), [engine.js:1343-1429 failureReaction](engine.js:1343)

---

### A2 — Paralleelisten ehdotusten monotonia internal load -järjestyksessä

**Konteksti:** Generate-suggestions tuottaa 2-3 ehdotusta (SAFE/TARGET/AGGRESSIVE). Labelin merkityksen (varovainen ≤ tavoite ≤ rohkea) pitää vastata internal load -järjestystä (Epley-e1RM).

**Tutkimusinvariantit joita kunnioitetaan:** Ei suoraa tutkimusinvarianttia — formula-monotonia on aritmeettinen vaatimus. Liittyy CLAUDE.md osio 6 "Atletti = valmentaja, ei nanny": konflikti labelin ja todellisuuden välillä rikkoo läpinäkyvyys-periaatteen.

**Mitattu miten:** Regressio-pilot kerää kaikista sessioista `rec.suggestions`-listan. Jokaisesta listasta tarkistetaan: jos lista sisältää sekä `safe` että `target`, niin Epley-e1RM(safe) ≤ Epley-e1RM(target). Vastaavasti target ≤ aggressive. Epley = `kg × (1 + (reps + targetVx) / 30)`.

**Onnistumisen ehto:** 0 `SUGGESTION_MONOTONICITY_VIOLATION`-flagia.

**Syöte joka rikkoisi:** Mikä tahansa target jossa Vx-eron (+1) e1RM-vaikutus ylittää kuorman −1,5 % -vaikutuksen. Esim. target = 69 × 5 V3 → safe = 68 × 5 V4: target e1RM = 87,4, safe e1RM = 88,4 → monotonia rikki.

**Lähde:** [engine.js:3131-3164 generateSuggestions](engine.js:3131) (`SAFE_SPACING = 0.015`, `VX_OFFSET = 1`)

---

### A3 — Peräkkäisten samaa liikettä koskevien session-parien kuormajatkuvuus

**Konteksti:** Liikettä treenataan tyypillisesti 1-3 kertaa viikossa (mesotyypistä riippuen). Saman liikkeen kahden peräkkäisen session välinen kuormamuutos pitää pysyä Latellan tier-mult-rajan sisällä viikkotasolle aggregoituna.

**Tutkimusinvariantit joita kunnioitetaan:** [TUTKIMUS_INVARIANTIT.md osio D](TUTKIMUS_INVARIANTIT.md) (Latella 2020 tier-progression elite ≤ 0,05 ×/vk). Koneluettava lähde: [`TIER_PROGRESSION_MULT_BASELINES`](tools/engine-pilot/lib/audit-baselines.mjs).

**Mitattu miten:** Regressio-pilot group-by per liike. Peräkkäisten session-parien (samaan liikkeeseen kohdistuvien) välinen kuormamuutos `(newLoad − oldLoad) / oldLoad` summataan viikkotasolle. Jos viikkotaso ylittää tier-mult-rajan (esim. elite-tier × wkProgression-base), pilot tuottaa `TIER_PROGRESSION_VIOLATION`-flagi.

**Poikkeukset:** Trace-rationale saa sisältää yhden seuraavista perustelusta joka oikeuttaa rajan ylityksen: `BLOCK_TRANSITION`, `DELOAD_LOAD_UP`, `FAILURE_DROP`, `MANUAL_OVERRIDE`, `MAINTENANCE_TRANSITION`, `READINESS_VETO_RECOVERY`, `tierProgressionApplied: false` -opt-out (Akselin streetlifting_16w-tyyppinen tietoinen poikkeama).

**Onnistumisen ehto:** 0 `TIER_PROGRESSION_VIOLATION`-flagia ilman dokumentoitua perustelua.

**Syöte joka rikkoisi:** streetlifting_16w secondary takakyykky lauantai 135 → tiistai 147 (+8,9 % yhden viikon sisällä saman liikkeen kahden session välillä) ilman BLOCK_TRANSITION:ia tai muuta perustelua. Aggregoituna viikkotason rate-cap ylittyy.

**Lähde:** [audit-baselines.mjs TIER_PROGRESSION_MULT_BASELINES](tools/engine-pilot/lib/audit-baselines.mjs), [wizard/wizard-2b-mapper.js applyTierProgression](wizard/wizard-2b-mapper.js), [audit-engine.mjs auditInvariants](tools/engine-pilot/lib/audit-engine.mjs) ENG-14:n laajennus.

---

### A4 — Warmup-rampin monotonia suhteellisina osuuksina työpainosta

**Konteksti:** Engine.js:n `ENGINE_DEFAULT_WARMUP_RAMP` = `[0,40, 0,55, 0,70, 0,85]` injektoi warmup-skeletonin kun preset ei sitä määrittele. UI/preset-skeleton ei saa ohittaa tätä epäjatkuvalla rampilla.

**Tutkimusinvariantit joita kunnioitetaan:** Helms 2017 -warmup-ramp (sisäinen design-päätös v4.49.2 QF-1). Ei suoraa tutkimusinvarianttia rangelle, mutta engine-default-skeleton on yhden totuuden lähde jonka kaikkien renderöintipolkujen pitää noudattaa.

**Mitattu miten:** Regressio-pilot kerää kaikista sessioista primary-liikkeiden warmupSets[]-listan + workSets[0].loadKg. Tarkistus:
1. lastWarmupLoad / workLoad ∈ [0,75; 0,90] (viimeinen lämppäri 75-90 % työpainosta)
2. rampPct[i] / workLoad < rampPct[i+1] / workLoad kaikille i (monotonia)
3. Jos preset-skeleton määrittelee warmupSets-prosentit, ne ovat samat kuin `ENGINE_DEFAULT_WARMUP_RAMP` tai noudattavat sen monotonia-vaatimusta

**Onnistumisen ehto:** 0 `WARMUP_RAMP_DISCONTINUITY`-flagia.

**Syöte joka rikkoisi:** warmup 60 × 5 → 95 × 3 → workSet 147 kg. lastWarmup/workLoad = 95/147 = 0,646 < 0,75 → flagi.

**Lähde:** [engine.js:3056-3061 ENGINE_DEFAULT_WARMUP_RAMP](engine.js:3056), [data.js:5795-5807 RAMP_DEFAULT / RAMP_BARBELL](data.js:5795)

---

### A5 — Kontekstuaalisten päätösten trace-kattavuus

**Konteksti:** Jokainen kuormamuutos peräkkäisten samaa liikettä koskevien sessioiden välillä, joka ylittää ±2 %, pitää näkyä trace-rivillä eksplisiittisellä rule-ID:llä. ENG-2:n perhe (AGGRESSIVENESS_LEARNED_UPDATED puuttuu) laajennettuna kaikkiin kontekstuaalisiin päätöksiin.

**Tutkimusinvariantit joita kunnioitetaan:** CLAUDE.md osio 5 "läpinäkyvyys-periaate" — atletti voi audit-jäljittää jokaisen päätöksen perusteen. TRACE_RULES.md (jos olemassa) määrittää rule-ID-katalogin.

**Mitattu miten:** Regressio-pilot group-by per liike. Peräkkäisten session-parien välinen kuormamuutos lasketaan. Jos `|deltaPct| ≥ 0,02` ja `traces[]`-listalta EI löydy yhtään seuraavista rule-ID:istä, `UNEXPLAINED_LOAD_CHANGE`-flagi:
- `BLOCK_TRANSITION`, `DELOAD_OVERRIDE`, `DELOAD_LOAD_UP`, `FAILURE_DROP`, `READINESS_VETO`, `TIER_PROGRESSION`, `CFG_DRIFT_APPLIED`, `AGGRESSIVENESS_LEARNED_UPDATED`, `INTRA_SESSION_BUMP`, `INTRA_SESSION_DROP`, `MANUAL_OVERRIDE`, `CALIBRATION_RESULT`

**Onnistumisen ehto:** 0 `UNEXPLAINED_LOAD_CHANGE`-flagia.

**Syöte joka rikkoisi:** vk 3 ennen vk 4 deloadia: engine ehdottaa +3 % kuormaa edellisestä viikosta ilman BLOCK_TRANSITION- tai TIER_PROGRESSION-traceea, perusteena implisiittinen "deload ennakointi" -logiikka jota ei ole dokumentoitu rule-ID:nä.

**Lähde:** [engine.js:3252+ recommend()](engine.js:3252) trace-emit-kohdat, ENG-2 backlog.

---

### A6 — Velocity-varoituksen ja Vx-tavoitteen ristiriidattomuus

**Konteksti:** Jos engine emittoi velocity-perusteisen lopetus-/lasku-varoituksen ja Vx-tavoite on samanaikaisesti vielä reilusti optimissa, kahden säätökanavan signaali on ristiriidassa.

**Tutkimusinvariantit joita kunnioitetaan:** [TUTKIMUS_INVARIANTIT.md osio A](TUTKIMUS_INVARIANTIT.md) (VL-cap per blokki) ja [osio G](TUTKIMUS_INVARIANTIT.md) (block-phase target RIR). Näiden kahden invariantin pitää olla yhteensovitettuja samalle sarjalle.

**Mitattu miten:** Regressio-pilot syntetisoi velocity-data-sekvenssejä joissa rep1-velocity = optimi, lastRep-velocity < `slot.velocityStop`, atletin `actualVx = targetVx` (eli Vx-mittari sanoo "OK, varaa vielä"). Tarkistus: jos velocity-veto-varoitus emittoituu, samanaikaisesti `targetVx ≥ 2` ja `actualVx ≥ targetVx`, niin trace.warnings pitää sisältää eksplisiittinen `VELOCITY_VX_RECONCILE`-rivi joka selittää signaalien yhteensovituksen (esim. "velocity laskee = fatiikkimerkki, Vx pysyy = atletti grindaa läpi — vaihtoehtoinen tulkinta: kuorma -2,5 kg seuraavalle sarjalle, mutta tämä sarja voidaan suorittaa loppuun").

**Onnistumisen ehto:** 0 `VELOCITY_VX_CONFLICT`-flagia.

**Syöte joka rikkoisi:** sarja jossa rep1-MPV = 0,72, lastRep-MPV = 0,46 (alittaa velocityStop 0,50), atletti rapsahtaa actualVx = 3 (= targetVx 3 = täysi suoritus). Engine emittoi varoituksen "harkitse kuorman laskua tai sarjan lopettamista" ilman yhteensovitusriviä.

**Lähde:** [index.html:12919+ slot.velocityStop tarkistus](index.html:12919), [engine.js targetRep1VelocityRange](engine.js)

---

### A7 — Velocity-datan monimittainen tulkinta (β-katon takana, EI loputon korjaus)

**Konteksti:** Useamman sarjan velocity-datan tulkinta (rep1-MPV, lastRep-MPV, VL%, sarjojen välinen rep1-drift, fatiikkidynamiikka) ei ole evidenssipohjaisesti opittavissa luotettavasti yksilödatasta oppivana mallina. β-tutkimus on osoittanut että vain RIR-bias on luotettavasti opittavissa, ja fatiikkidynamiikka, palautumis-aikavakio, ja yksilöllinen optimi-VL-cap on lukittava prioriksi.

**Tutkimusinvariantit joita kunnioitetaan:** [TUTKIMUS_INVARIANTIT.md osio A (VL-cap)](TUTKIMUS_INVARIANTIT.md) ja [B (Rep1 MPV slope)](TUTKIMUS_INVARIANTIT.md). β-tutkimus C-osio (lukittu prioriksi -lista).

**Mitattu miten:** Tämä AC on **rehellinen rajaus**, ei loputon korjaus. Engine emittoi UI-tekstin joka kertoo atleetille: "Velocity-datasta tulkitaan vain rep1-MPV (kuorma-ennuste) ja sarjan sisäinen VL% (fatiikkimerkki). Sarjojen välistä rep1-driftiä tai monimutkaisempaa fatiikkidynamiikkaa EI mallinneta, koska tutkimusevidenssi ei tue tämän oppimista yksilödatasta. Sääntöpohjainen approksimaatio + rehellinen läpinäkyvyys."

**Onnistumisen ehto:** Engine.js sisältää tracen / UI-tekstin joka selittää tulkinta-rajat. EI yritä rakentaa sarjojen välistä fatiikkimallia oppivaksi. Pilot-regressio tarkistaa että rec.suggestionContext sisältää `velocityInterpretationScope: "rep1+VL_only"` -kentän (tai vastaavan rehellisen rajauksen).

**Syöte joka rikkoisi:** Tulevaisuudessa β-mallin laajennus joka yrittää oppia sarjojen välisen fatiikkimallin yksilödatasta ilman riittävää evidenssipohjaa. Tämä AC on suojavalli sellaista vastaan.

**KRIITTINEN:** Tätä AC:tä EI JÄTETÄ AUKI ikuiseksi bugiksi jota jahdataan. Rajaa rehellisesti nyt: paras mahdollinen sääntöpohjainen approksimaatio + rehellinen UI joka kertoo mitä on ja mitä ei ole opittavissa.

**Lähde:** β-tutkimuksen lopputulema (SYVATUTKIMUS_BETA_adaptiivinen_oppimismalli.md), CLAUDE.md osio 2 "Säännöt opittavien parametrien suhteen".

---

## 4. Kolmikategoriainen luokittelu

| AC | Kategoria | Perustelu |
|---|---|---|
| **A1** | **DETERMINISTINEN BUGI** | Rooliluokitus (`role === "primary" \|\| role === "backoff"`) on liian tiukka. Korjattavissa lisäämällä secondary-tyyppisten raskaiden voimaliikkeiden tunnistus + erottelu accessory-isolaatiosta. Juurimekanismi: rooli-enum suunniteltu accessory/isolation-ajatuksella, ei streetlifting_16w secondary-tyyppistä raskasta voimaliikettä varten. Juurisyy 1:n perheen ulkopuolella mutta paljastuu samalla pilot-ajolla. |
| **A2** | **DETERMINISTINEN BUGI** | Formula `safeLoad = targetLoad × (1 − 0,015)` + `safeVx = targetVx + 1` ei kompensoi Vx-eron Epley-e1RM-vaikutusta. Korjaus: dynaaminen SAFE_SPACING joka skaalautuu Vx-eron mukaan, tai SAFE_SPACING korotetaan tasolle joka takaa monotonian myös pienissä reps-arvoissa (esim. 5 reps × 1 Vx-ero vaatii ~3 % spacing-arvon). Juurimekanismi: hardkoodattu 1,5 % spacing valittu ilman aritmeettista monotonia-tarkistusta. |
| **A3** | **NUMEERINEN INVARIANTTIRIKKO** | Latella 2020 tier-progression elite ≤ 0,05 ×/vk on tutkimuspohjainen invariantti. ENG-14 audit-engine.mjs (`auditInvariants`) **kattaa jo D tier-mult**-rivin, mutta vain viikkotasolla per applyTierProgression-kutsu. **EI kata session-tason yhteenlaskua** kun sama liike on usean session yli viikossa. Vaatii ENG-14:n laajennusta: aggregoi session-tason kuormat viikkotasolle ja vertaa tier-mult-rangiin. Liittyy juurisyy 1:n perheeseen siten että default-mesojen vk1 d5 / vk2-3 d1/d3 -ristiriita voi tuottaa session-tason rate-rikkomuksia. |
| **A4** | **DETERMINISTINEN BUGI** | `ENGINE_DEFAULT_WARMUP_RAMP` injektoi skeletonin kun preset ei sitä määrittele, mutta UI-render-polku tai jokin preset-skeleton voi ohittaa monotonisen rampin. Korjaus: tarkista että kaikki primary-slot-renderöintipolut käyttävät joko `ENGINE_DEFAULT_WARMUP_RAMP`-arvoja tai monotonisesti vastaavia preset-prosentteja, eivätkä hardkoodattuja kuormia (60, 95). Juurimekanismi: v4.49.2 QF-1 lisäsi engine-skeletonin mutta ei välttämättä kattanut kaikkia render-polkuja. |
| **A5** | **DETERMINISTINEN BUGI** | Trace-coverage on tekninen toteutus-asia, korjattavissa lisäämällä rule-ID-emittauksia kontekstuaalisten päätösten kohdille. Juurimekanismi: trace-katalogi rakennettu inkrementaalisesti, ja jotkin polut emittoivat päätöksen mutta eivät rule-ID:tä (sama luokka kuin ENG-2 = `AGGRESSIVENESS_LEARNED_UPDATED` puuttuu). Liittyy juurisyy 1 + 2 -korjauksiin epäsuorasti: korjausten tuomat uudet päätökset PITÄÄ olla traceattuja samasta syystä. |
| **A6** | **HYBRIDI: DETERMINISTINEN BUGI + β-rajaus** | Perustarkistus (signaalien yhteensovitus UI-tekstissä) on DETERMINISTINEN: korjattavissa lisäämällä `VELOCITY_VX_RECONCILE`-tracen ja UI-stringin. Mutta velocity↔Vx-mappauksen oppiminen on β-katon takana (ks. A7) — atletin yksilöllistä velocity-Vx-suhdetta ei voi oppia luotettavasti, vain sääntöpohjainen yhteensovitus on saavutettavissa. |
| **A7** | **β-KATTORAJAN TAKANA** | Sarjojen välinen fatiikkidynamiikka, palautumis-aikavakio, ja monimittainen velocity-tulkinta EIVÄT ole evidenssipohjaisesti opittavissa yksilödatasta. β-tutkimus on osoittanut vain RIR-biasin opittavaksi. **KRIITTINEN:** Rajaa rehellisesti nyt — paras mahdollinen sääntöpohjainen approksimaatio + UI joka selittää mitä mallinnetaan ja mitä ei. EI loputon korjaus jota jahdataan. Tämä on suojavalli tulevaisuuden scope creepiä vastaan. |

**Kategoriayhteenveto:**
- DETERMINISTINEN BUGI: A1, A2, A4, A5 (4 kpl, korjattavissa sääntölogiikan korjauksella)
- NUMEERINEN INVARIANTTIRIKKO: A3 (ENG-14:n laajennus, kuuluu turvaverkkoon)
- HYBRIDI: A6 (osa DETERMINISTINEN, osa β-katto)
- β-KATTORAJAN TAKANA: A7 (rehellinen rajaus, ei loputon korjaus)

---

## 5. Kytkentä juurisyy 1/2 -korjauksiin

Akselin strateginen ydin: juurisyy 1 -korjauksen on verifioitava nämä generatiiviset AC:t **koko ohjelman yli**, ei vain default-mesolla. Muuten korjaus voi viedä default-meson invarianttien sisään ja jättää muut mesotyypit elämään.

### Juurisyy 1 (ENG-16) — Default-mesocyclen phase ↔ VL-cap-ristiriita

Korjausvaihtoehdot (kts. SESSION_CLOSE 3.1): (a) engine.js VL-cap-logiikan korjaus, (b) audit-baselines.mjs `DEFAULT_MESO_VL_CAP_BASELINES`-laajennus, (c) `deriveBlockPhase`-refaktorointi default-mesoille.

**Korjauksen ON LÄPÄISTÄVÄ:**
- **A1**: Jos korjaus muuttaa default-meson kuormaprofiilia ja secondary-tyyppisiä liikkeitä esiintyy default-mesossa, intra-session-feedback ei saa jäädä rooliriippuvaksi. Vaikka KH-1c koski streetlifting_16w-mesoa, A1 koskee kaikkien mesotyyppien kaikkien rooliluokitusten käyttäytymistä — regressio-pilot ajetaan koko ohjelman yli.
- **A2**: Korjaus muuttaa todennäköisesti `generateSuggestions`-kontekstia (capLevel, blockPhase, dayType voivat saada eri arvoja), joten safe-target-aggressive-monotonia pitää säilyä uusissa parametriyhdistelmissä. Bittikohtainen pilot-vertailu paljastaa monotonian rikkoutumiset.
- **A3**: Korjaus voi muuttaa session-tason kuormia eri päivinä eri tavalla (esim. vk1 d5 → high cap, vk2 d1 → low cap → kuorma laskee). Peräkkäisten samaa liikettä koskevien sessioiden välinen rate-cap (Latella tier-mult) ei saa rikkoutua viikkotasolle aggregoituna.
- **A4**: Korjaus muuttaa työpainoja, joten warmup-rampien monotonia työpainosta pitää säilyä. Jos `ENGINE_DEFAULT_WARMUP_RAMP`-skeletonin ohittaa hardkoodattu preset-kuorma, korjaus ei silti tee ramppia jatkuvaksi.
- **A5**: Korjauksen tuomat uudet päätökset (esim. uusi `DEFAULT_MESO_VL_CAP_RESOLVED`-trace tai `BLOCK_PHASE_RECLASSIFIED`-trace) PITÄÄ olla rule-ID:nä trace-rivillä, jotta atletti voi audit-jäljittää.

**EI suoraa kytkentää:** A6, A7 — nämä koskevat velocity-tulkintaa, joka on juurisyy 1 -korjauksen ulkopuolella.

### Juurisyy 2 (ENG-17) — Akselin streetlifting_16w vk12 deload-syvyys

Korjausvaihtoehdot (kts. SESSION_CLOSE 3.2): (a) korjaa preset → vk12 deload ≥ −15 %, (b) lisää `deloadApplied: false`-mesometa-flagi + ENG-14 haarautuu, (c) jos "en muista" → siirtyy ENG-16:n kanssa samaan kategoriaan.

**Korjauksen ON LÄPÄISTÄVÄ:**
- **A3**: vk12 → vk13 (post-deload load-up) -kuormahyppy aggregoituna viikkotasolle ei saa rikkoa tier-mult-rajaa. Jos korjaus muuttaa vk12:n syvyyttä −15 %:iin, vk13:n loaduppi voi olla suurempi → peräkkäisten sessioiden välinen rate-cap on tarkistettava.
- **A5**: deload-syvyyden korjaus muuttaa trace-rivien sisältöä. Perustelu (Helms 2018 -range tai eksplisiittinen opt-out) pitää näkyä rule-ID:nä — joko `DELOAD_OVERRIDE` (jos preset korjataan) tai `DELOAD_OPT_OUT` (jos meta-flagi).

**EI suoraa kytkentää:** A1, A2, A4, A6, A7 — nämä koskevat muita osa-alueita.

---

## 6. Tehtävän rajaus ja jatkojärjestys

**Mitä tämä tiedosto EI tee:**
- Ei korjaa koodia
- Ei implementoi yhtäkään AC:tä
- Ei ratkaise juurisyy 1:tä eikä juurisyy 2:tä
- Ei koske α/β-tutkimuksen tuloksiin eikä kehotteisiin

**Mitä tämä tiedosto tekee:**
- Formalisoi kenttämuistiinpanot 7 generatiiviseksi luokkainvariantiksi
- Kategorisoi luokat kolmeen (DET / NUM / β)
- Kytkee jokaisen AC:n eksplisiittisesti juurisyy 1/2 -korjaukseen siten että regressio-pilot toimii oikealla kattavuudella

**Jatkojärjestys odottaa Akselin päätöstä:**
1. Mikä on AC-prioriteetti? A1 (rooli-leikkaus) vs A2 (monotonia) vs A3 (ENG-14-laajennus) vs A4 (warmup) — kummasta aloitetaan?
2. Tehdäänkö A7-rajaus nyt (β-suojavalli) ennen kuin β-tulokset palaavat?
3. Yhdistetäänkö A3-implementointi ENG-14:n laajennukseen vai erilliseksi /goal-kierrokseksi?
4. Pitääkö A6 (hybridi) jakaa kahteen erilliseen AC:hen (A6-DET-osa + A6-β-osa)?

**Korjaustyö tapahtuu erillisinä /goal-kierroksina** kun Akseli on päättänyt jatkojärjestyksen. Jokainen /goal:
- Yksi tai useampi AC tästä tiedostosta
- Stop hook (smoke + Akseli pilot) + ENG-14-laajennus uudelle AC:lle = lukko
- /goal ei valmistu ennen kuin kaikki target-AC:t passaavat 8/8 profiilissa
