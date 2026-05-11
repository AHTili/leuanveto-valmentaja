// sw.js — Service Worker (offline-first, network-first navigation, cache-first assets)
// LeVe AI v4.38.6 — KRIITTINEN BUG-FIX: ReferenceError currentSet bindWorkoutEvents:issa.
//
// Käyttäjäpalaute 2026-05-11: työsarja-näkymässä "Bindausvirhe — tarkista konsoli"
// laukesi heti kun käyttäjä yritti kirjata painoja. Sovellus oli käyttökelvoton.
// Syy: v4.38.3:n refaktorissa attachVelocityRepLiveSummary extractattiin
// nimettäväksi funktioksi, mutta bindWorkoutEvents-funktion ulompi scope
// jätettiin viittaamaan currentSet-muuttujaan (rivi 11260, targetVx-kentässä).
// currentSet on määriteltynä callback-handlerien SISÄLLÄ, ei bind-funktion
// ylimmässä scopessa. ReferenceError → bind() rejected → kaikki click-handlerit
// jäivät attachimatta → koko työsarja-näkymä jumissa.
//
// KORJAUS v4.38.6 (index.html bindWorkoutEvents):
//   const exerciseForCap = w.exercises[w.currentExerciseIdx];
//   const currentSetForCap = exerciseForCap?.sets?.[w.currentSetIdx];  ← LISÄTTY
//   ...
//   targetVx: currentSetForCap?.targetVx ?? null,  ← oli: currentSet?.targetVx
//
// Refaktoroinnin TESTAUSPUUTE — tämä on toinen kerta kun vastaava bugi ilmenee
// (vrt. v4.34.29: "TDZ-fix targetReps siirretty prev-ghost-koodin edelle").
// Oppi: ennen extracted-funktion käyttöönottoa, suorita silmämääräinen scope-
// tarkistus muuttujille jotka aiemmin olivat inline:n sisäisiä.
//
// v4.38.5 (edellinen) — Pikalisäpäivitys: kisaliikkeiden tunnistus toimii myös
// vanhoilla movements-tietokannoilla joissa isCompetitionLift-flag puuttuu.
//
// Käyttäjäpalaute v4.38.4:n migration jälkeen (2026-05-10): Asetukset →
// "Henkilökohtainen kalibrointi" -kortti näytti "Ei kisaliikkeitä rekisteröity."
// vaikka streetlifting_16w-mesosyklissä on kolme kisaliikettä (Lisäpainoleuanveto,
// Lisäpainodippi, Takakyykky). Syy: olemassa olevat movements:it on rekisteröity
// vanhalla version koodilla joka ei asettanut isCompetitionLift-flagia.
// Korjaus: name-pohjainen fallback isCompetitionLiftMovement-helperissä.
//
// MUUTOKSET v4.38.5:
// (engine.js) Uusi vakio COMPETITION_LIFT_NAMES_FALLBACK (Set) joka kattaa
//   streetlifting + voimanosto kisaliikkeet: Lisäpainoleuanveto, Lisäpainodippi,
//   Takakyykky, Muscle-up, Penkkipunnerrus, Maastaveto.
//   Uusi helper isCompetitionLiftMovement(movement) — palauttaa true jos
//   isCompetitionLift === true TAI nimi löytyy fallback-listasta.
// (index.html) Dashboard-banneri (Phase 3.6A) + Asetukset RTF-kalibrointi-kortti
//   (Phase 3B) käyttävät nyt isCompetitionLiftMovement-helperia (filter:n sijaan
//   m => m.isCompetitionLift). Ei muuta toiminnallisuutta uusille asennuksille,
//   mutta vanhat movements-tietokannat näyttävät kisaliikkeet oikein.
// (test-runner.js) testIsCompetitionLiftMovement: 12 assertiota — eksplisiittinen
//   flag voittaa, fallback nimillä, accessoryt + variantit eivät tunnisteta
//   kisaliikkeiksi.
//
// v4.38.4 (edellinen) — Phase 2.7 (kaksisuuntainen autoregulaatio) + Phase 3.6
// (RTF-testin auto-suggestio) + UI-stringien siivous.
//
// Käyttäjäpalaute v4.38.3 jälkeen: nopeus-vararajat-mallin yksisuuntaisuus
// (vain ylitreenamissuoja) ei riittänyt eliittitason vaatimuksiin. Akselin
// huoli alistimuloiduista sarjoista on perusteltu — Phase 2.7 lisää rep 1
// -tavoiterangen ja kaksisuuntaisen palautteen.
//
// Käytettävyysparannus: tutkijanimet (Pareja-Blanco / Behrmann / Jukic /
// Sánchez-Moreno) poistettu KÄYTTÄJÄLLE NÄKYVISTÄ stringeistä — säilyvät
// koodikommenteissa kehittäjälle. Tämä noudattaa peruslinjaa: sovellus
// puhuu suomeksi, akateemiset perustelut säilyvät dokumentaatiossa.
//
// MUUTOKSET v4.38.4:
// (Phase 2.7A) targetRep1VelocityRange(movementName, blockPhase, rtfModel)
//   — uusi engine-helper joka palauttaa rep 1:n hyväksyttävän nopeushaarukan
//   blokin tavoite-RIR:n ympärille (±1.5 RIR). Käyttää reliable-RTF-mallia
//   tai fallback MOVEMENT_MVT + DEFAULT_RTF_SLOPE (0.045 m/s/RIR).
//   BLOCK_PHASE_TARGET_RIR-mappi: foundation 4, strength 2.5, intensity 1.5,
//   peaking 1, speed-strength 4 (mid-arvot blokki-rangeista).
// (Phase 2.7B) Live-summary 4-tilainen: ALI (sininen, kuorma kevyt) /
//   OPTIMAALI (vihreä) / VAR (keltainen) / STOP (punainen). Värikoodit
//   CSS:ssä: vl-state-under, vl-state-optimal, vl-cap-warn, vl-cap-stop.
//   ALI-state-banner näyttää konkreetin tavoiterangen + nostosuosituksen.
// (Phase 2.7C) Anomaly recovery: jos viimeinen rep on edellistä nopeampi
//   (= "palautui"), käytä kahden viimeisen rep:n mediaania cap-vertailussa.
//   Estää väärän STOP-ehdotuksen yksittäisestä teknisestä lipsahduksesta.
// (Phase 2.7D) Post-set toastit + UNDER_STIMULATED-decisionTrace:
//   - 🔵 ali-stim: rep 1 yli rangen + VL alle cap × 0.5 → "kuorma alle
//     kapasiteettisi, harkitse nostoa"
//   - 🟢 optimaali: rep 1 rangessa + VL cap × 0.5–0.95 (ei traceen, mutta
//     yhteenvetotoast jos ei muita varoituksia)
//   - 🛑 STOP-ehdotus laajennettu: cap-source näkyy ("oma malli" vs
//     "blokki-oletus")
// (Phase 3.6A) Dashboard-bannerin RTF-kalibrointimuistutus puuttuville
//   kisaliikkeille. Klikkaus → Asetukset-välilehti. Näkyy vain kun
//   velocity-mittaus on käytössä.
// (Phase 3.6B) Treenin tallennushetkellä AMRAP-sarjojen tunnistus:
//   primary + actualVx 0 + reps ≥ targetReps + 2 + mvReps[].length ≥ 4.
//   Per-kandidaatti modal: "Tallenna kalibrointitestinä?" → luo rinnakkain
//   rtf_calibration-session + rtf_test-set. Akselin yleisin käyttötapa:
//   tee viimeinen sarja failureen → kalibrointimalli rakentuu ilman
//   erillistä testiä.
// (Phase 3.6C) Asetukset RTF-kortti merkityksellisempi: 🔴 "Testi puuttuu"
//   -indikaattori + punainen vasen reuna kun status === "no-data". V@RIR
//   -kentät käyttäjäystävällisesti ("Failurella" / "1 varaa" / "3 varaa" /
//   "5 varaa" sen sijaan että "RIR 0" / "RIR 1" / jne.).
// (UI-siivous) Pareja-Blanco / Behrmann / Jukic / Sánchez-Moreno -nimet
//   poistettu kaikista käyttäjälle näkyvistä teksteistä:
//   - STOP-suggestion: "Lopeta sarja tähän — lisätoistot eivät enää tuota
//     voiman lisäystä, vain ylimääräistä väsymystä"
//   - VL-cap settings: "Sarjan lopetusraja (%) per blokki" — kuvaus selkeää
//     suomea ilman tutkijanimi-viittauksia
//   - ENODE_LOW_VELOCITY_CAVEAT: "Enode-mittaus tällä hidasalueella…"
//   - Stale profile reason: "Malli vanhentunut: N päivää ilman uutta dataa"
//   - RTF-modaali: "Kalibrointitesti" tutkijanimien sijaan
//   - Vx-konflikti-toast: "Raportoit varaa X mutta nopeusmittaus viittaa Y"
//   - Tutkijaviittaukset säilyvät koodikommenteissa (kehittäjän referenssi)
// (Phase 2.7-test) testTargetRep1VelocityRange — strength/foundation/peaking
//   ranges, speed-strength etusija liikenimellä, RTF-mallin käyttö, preview-
//   fallback, tuntematon liike → DEFAULT_MVT. ~12 uutta assertiota.
//
// v4.38.3 (edellinen) — Velocity DR Phase 3.5 + 4 (yksilöllinen cap RTF-mallista
// + Vx-velocity-konfliktin tunnistus).
//
// Phase 3.5 sulkee silmukan datan ja autoregulaation välillä: kun atletti on
// kerännyt yhden RTF-testin per kisaliike (Phase 3) ja malli on r² ≥ 0.85,
// VL-cap muunnetaan automaattisesti yksilölliseksi populaatio-default-arvon
// sijaan. Phase 4 tunnistaa Vx-velocity-konfliktit (grindaus-bias) ja kirjaa
// päätösketjuun, mutta EI ylioppikkaa atletin raportoimaa Vx:ää automaattisesti
// (DR-suositus: käyttäjä päättää).
//
// MUUTOKSET v4.38.3:
// (3.5A) BLOCK_PHASE_TARGET_RIR-mappi engine.js:ssä — mid-arvot DR-rangeista:
//        Foundation 4 (RIR 4-5), Strength 2.5 (RIR 2-3), Intensity 1.5 (RIR 1-2),
//        Peaking 1 (RIR 0-1), Speed-strength 4 (RIR 4-5).
// (3.5A) vlCapForContext laajennettu: rtfModel + rep1Velocity ctx-paramit.
//        Kun rtfModel.status === "reliable" + rep1Velocity > 0:
//          targetRir = BLOCK_PHASE_TARGET_RIR[effectivePhase]
//          velocityAtTarget = intercept + slope × targetRir
//          cap_individual = (rep1Velocity - velocityAtTarget) / rep1Velocity * 100
//        Sanity-clamp [3, 60] — ulkopuoliset arvot → fallback default.
//        Source: "rtf-individual" (Phase 3.5) vs "block-phase" / "fallback".
// (3.5B) Live-summary rep-gridissä laskee cap-arvon dynaamisesti rep1V:n
//        muuttuessa. UI-badge "🎯 RTF-yksilöllinen (RIR-tav. X, r² Y%)" kun
//        source === "rtf-individual". STOP-ehdotus näyttää RTF-tagin selkeästi.
// (3.5C) Save-layer-trace VL_CAP_TRIGGERED sisältää nyt rtfTargetRir + rtfR2 +
//        velocityAtTargetRir-kentät, jotta blokki-vaihtoehdot ja kalibraation
//        luotettavuus voidaan jälkikäteen analysoida.
// (4A)   predictVxFromVelocity(mvReps, rtfModel, reportedVx) — engine.js:n uusi
//        helperi joka invertoi RTF-mallin: predictedRir = (lastMv - intercept) /
//        slope. Clamp [0, 5] (Vx-skaala). Konflikti = abs(reportedVx -
//        predictedVx) ≥ VX_CONFLICT_DELTA (1.5). Direction:
//        "athlete-overestimates-rir" (grindaus-bias) tai
//        "athlete-underestimates-rir" (lopetti aikaisin).
// (4B)   Save-layer: VX_VELOCITY_CONFLICT-trace kun mvReps + reliable RTF-malli
//        + delta ≥ 1.5. Tallennus saveSets:in jälkeen, toast:
//        "🎯 N sarjassa Vx-poikkeama ≥ 1.5 (RTF-malli): X× yliarvio varaa
//        (grindaus-bias). Tarkista kalibraatio kun aikaa." HUOM: actualVx EI
//        ylioppiku automaattisesti — käyttäjä päättää (DR-suositus).
// (3.5D + 4C) Testit: testVlCapWithRtfModel + testVxVelocityConflict —
//        BLOCK_PHASE_TARGET_RIR-arvot, yksilöllinen cap eri blokkivaiheissa
//        (foundation/strength/intensity/peaking/speed-strength), preview-fallback,
//        unreliable RTF, sanity-range [3, 60], grindaus-bias-skenaario,
//        aligned-skenaario, early-stop-skenaario, pre-condition tarkistukset.
//        ~25 uutta assertiota.
//
// Phase 4.5 (myöhemmin): auto-konservatiivinen min(reportedVx, predictedVx) -
// ratkaisu kun konflikti on ylittynyt N peräkkäisessä sessiossa. Tällä hetkellä
// vain havaintoraportointi.
//
// Phase 1+2+3+3.5+4 yhteenveto: VBT-syvätutkimuksen Pareja-Blanco-tradition
// VL-cap, Jukic 2024 yksilöllinen RIR-velocity-malli, ja konfliktin tunnistus
// kaikki integroitu. DR-synteesin "action list":sta kuitatut: 8/10
// koodimuutosta. Avoinna: Phase 2.5 (between-set load-decrement +
// recommend()-syöte), Phase 5 (2-piste mini-L-V-confirmation-sessio blokin
// alussa), Phase 6 (vk 4/8/12 deload-kalibroinnin vaihto AMRAP @92 % →
// 2-piste mini-L-V).
//
// v4.38.2 (edellinen) — Velocity DR Phase 3 (RTF-testi yksilölliselle RIR-velocity-mallille).
//
// VBT-syvätutkimuksen synteesi (Claude DR + ChatGPT DR + verifikaatio 2026-05-09)
// → Phase 3 toteuttaa Jukic et al. 2024 (Scand J Med Sci Sports) yksilöllisen
// RIR-velocity-mallin: yksi reps-to-failure -testi per kisaliike riittää
// r² ≥ 0.85 -tarkkuuteen vs populaatio-mappauksen 0.45–0.49.
//
// MUUTOKSET v4.38.2:
// (3A) computeRtfVelocityModel(allSets, movementId) — engine.js:n uusi funktio.
//      Suodattaa rtf_test-roolin setit, kerää (RIR, MV) -pisteet rep-by-rep
//      mvReps[]:istä (RIR_i = M-1-i), lineaarinen regressio velocity = intercept
//      + slope × RIR. Palauttaa { status, n, slope, intercept, r2, velocityAtRir,
//      rtfMvtIndividual, sessionsCount, loadsUsed }.
//      Status: reliable (r²≥0.85, slope>0) / preview (r²≥0.70) / unreliable.
//      vlCapFromRtfModel(rtfModel, targetRir, rep1Velocity) — Phase 3.5 helper
//      yksilölliselle cap-arvolle (käyttöön myöhemmin).
//      Vakiot: RTF_MIN_REPS_PER_SET=4, RTF_MIN_SESSIONS_FOR_MODEL=1 (Jukic 2024),
//      RTF_R2_THRESHOLD_RELIABLE=0.85, RTF_R2_THRESHOLD_PREVIEW=0.70.
// (3B) Asetukset → "🎯 RTF-kalibrointi (yksilöllinen RIR-velocity)" -kortti per
//      kisaliike (isCompetitionLift): näkyvät tila-badge (no-data / preview /
//      reliable + r²), datapisteet (n / sessiot / kuormat), V@RIR 0/1/3/5,
//      slope, intercept (V@failure = yksilöllinen MVT). Vertailu populaatio-MVT:hen
//      (esim. Lisäpainoleuanveto 0.23 m/s Sánchez-Moreno 2017).
// (3C) openRtfTestModal(movementId, movementName) — bottom-sheet modaali RTF-testin
//      tallennukseen. Pyytää: päivämäärä, kuorma (suositus ~75% e1RM auto-täytetty),
//      mvReps[] rep-grid AMRAP-tyylisesti ("0,"-prefiksi-malli + "+ rep" / "− rep"),
//      todelliset toistot failureen (auto = mvReps.length). Live-summary mean/peak/VL%.
// (3D) Save-layer luo:
//      - dummy session: { sessionType: "rtf_calibration", mesocycleId nykyinen }
//      - set: { setRole: "rtf_test", externalLoadKg, reps=totalReps, targetVx=0,
//        actualVx=0 (failure), velocityRep1=mvReps[0], velocityMean=mean, mvReps,
//        deviceMeta: { source: "rtf-test-modal" }, dateISO }
//      Re-render Asetukset päivittää RTF-kortin tilan välittömästi.
// (3E) Testit: testRtfVelocityModel — no-data, lineaarinen 8-rep AMRAP (status
//      reliable + slope > 0 + r² ≥ 0.85), liian vähän dataa, useat sessiot
//      yhdistettynä, väärä movementId / setRole, vlCapFromRtfModel-helper RIR 0
//      ja RIR 1 -tasoille. ~16 uutta assertiota.
//
// Phase 3.5 (myöhemmin): vlCapForContext laajennetaan käyttämään yksilöllistä
// cap-arvoa kun rtfModel.status === "reliable" liikkeelle. Blokki-spesifi
// targetRir (peaking RIR 1, strength RIR 2-3, foundation RIR 4-5) → V@target
// → VL_cap%. Tämä korvaa populaatio-pohjaisen VL_CAP_PER_BLOCK-default-arvon.
//
// v4.38.1 (edellinen) — Velocity DR Phase 2 (VL-cap within-set stop -autoregulaatio).
//
// VBT-syvätutkimuksen synteesi (Claude DR + ChatGPT DR + verifikaatio 2026-05-09)
// → Phase 2 nostaa Pareja-Blanco-tradition VL-cap-arvot ENSISIJAISEEN
// päätösketjun pisteeseen (within-set stop) eikä pelkkänä UI-warning.
//
// MUUTOKSET v4.38.1:
// (2A) VL_CAP_PER_BLOCK-vakio engine.js:ssä — Foundation 30 / Strength 17.5 /
//      Intensity 12.5 / Peaking 7.5 / Speed-strength 12.5 (range-keskellä).
//      Tutkimuspohja: Pareja-Blanco 2017/2020/2023 + Galiano 2022 + Held 2022 +
//      Lyu 2026 + Sánchez-Moreno 2020 + Jukic 2023.
// (2A) vlCapForContext({blockPhase, exerciseName, dayType, targetVx, settings})
//      → resolvoi cap (settings-override → default), phase-tag, source.
//      Speed-strength etusija liikenimen (Räjähtävä leuanveto/leuka) tai
//      speed-day + Vx≥4 -kombo:n kautta.
// (2B) Settings UI: viisi cap-input-kenttää per blokki Asetukset → Kynnysarvot.
//      data.js settings-defaults: vlCapFoundation/Strength/Intensity/Peaking/
//      SpeedStrength. vlStopPercent jää legacy-fallbackiksi.
// (2C) Live-summary rep-gridissä käyttää nyt blokki-spesifiä cap-arvoa.
//      Visualisointi 3-portaisesti: vl < cap×0.75 = OK,
//      cap×0.75 ≤ vl < cap = WARN (keltainen), vl ≥ cap = STOP (punainen
//      summary, punainen rep-input drop-kohdassa, "🛑 STOP-ehdotus" -panel).
// (2D) saveDecisionTrace kun setti tallennetaan VL > cap -tilanteessa.
//      ruleId="VL_CAP_TRIGGERED", before/after-rakenne kuten muut traces:
//      before { plannedReps, vlCap, blockPhase, capSource },
//      after  { actualReps, actualVl, droppedAtRep, rep1Velocity, lastRepVelocity }.
//      Tallennus saveSets:in JÄLKEEN consistency:n vuoksi (jos sets fail → ei traces).
//      Toast: "VL-cap ylitti N sarjassa — kirjattu päätösketjuun" (warn).
// (2E) Testit: testVlCapPerBlock — defaults, blokki-vaihe, speed-strength
//      etusija, settings-override, fallback. 11 uutta testiä.
//
// Phase 2.5 (myöhemmin): VL_CAP_TRIGGERED-tracejen analyysi recommend():issa →
// between-set load-decrement (jos sarjan 1 within-set-VL ylittää cap-arvon ennen
// 50% suunnitelluista repeistä, pudota seuraavan sarjan kuorma 2.5–5 %).
// Coaching-konsensus, ei suoraa RCT-evidenssiä — odottaa pilotti-dataa.
//
// v4.38.0 (edellinen) — Velocity DR Phase 1 (mvReps[] + UI rep-grid + stale profile).
//
// VBT-syvätutkimuksen synteesi (Claude DR + ChatGPT DR + verifikaatio 2026-05-09)
// → 4 sub-vaiheen velocity-arkkitehtuurin nostokertoimet:
// (1A) MOVEMENT_MVT-aliakset Räjähtäville pull-up-varianteille (alias 0.23 =
//      Lisäpainoleuanveto, perustelu: V1RM = liikemekaniikka, ei sub-max intent).
// (1A) ENODE_LOW_VELOCITY_CAVEAT — Behrmann 2025 -laitevarauksen integraatio
//      (MAPE 4–42 % < 0.5 m/s alueella) sekä VBT-promotion-tilan deviceCaveat-
//      kentässä että UI-tasolla rep-gridin alla.
// (1B) SCHEMA_VERSION 4 → 5: set-objektille uusi optional kenttä mvReps[]:
//      number[] | null per-rep MPV-tallennukseen. Migration ei vaadi datakonver-
//      siota — vanhat setit jäävät undefined-tilaan, lukulogiikka käyttää ?? null.
//      Pre-migration backup ajetaan automaattisesti createPreMigrationBackupIfNeeded:ssa.
// (1B) validateMvReps + GUARD-laajennus.
// (1C) Working-set velocity entry UI: rep-grid (auto-fit minmax 72px), "0,"-prefiksi-
//      malli (käyttäjä syöttää 2 numeroa "53" → 0.53 m/s), live-summary mean/peak/VL%
//      (warn jos > vlStopPercent), gating laajennettu primary/backoff/top/calibration-
//      sarjoille (ei enää pelkkä allowVelocityInput-flag).
// (1C) Save-layer (index.html:11762+): mvReps[] suodatetaan validiksi arrayksi,
//      velocityMean/Peak/Rep1/LossPercent johdetaan automaattisesti arrayn pohjalta.
// (1D) Stale profile -aikatriggeri computeVBTPromotionStatus:issa:
//      14 pv ilman uutta ankkuria → freshness="stale" (warning, regressio toimii)
//      21 pv ilman uutta ankkuria → freshness="needs-recalibration" (blokkaa
//      promotion, suosittelee 2-piste mini-L-V-vahvistustestiä, ~45 % + ~85 % e1RM).
//      Tutkimuspohja: Häkkinen 2000 / Hortobágyi 1993 / Hwang 2017 strength-decay
//      proxy:t — spesifit slope/intercept-decay-arvot ovat tutkimusaukko.
//
// Foundation Phase 2:lle (VL-cap within-set stop -autoregulaatio recommend()-funktioon),
// Phase 3:lle (RTF-testi-sessiotyyppi Jukic 2024) ja Phase 4:lle (min(Vx_reported,
// Vx_velocity) -konfliktiratkaisu) on nyt rakennettu — schema kestää, UI kerää,
// laitevarauksen disclaimer näkyy oikeissa paikoissa.
//
// v4.37.0 (edellinen) — Sykli-välilehden redesign (Claude Design "Cycle View v3").
//
// Atletin pyyntö 2026-05-08: parempi yleisnäkymä jossa atletti näkee yhdellä
// silmäyksellä missä blokin osassa on, kuinka edistynyt suhteessa suunnitelmaan,
// ja milloin seuraava kriittinen vaihe (deload + AI-tuning vk 4/8/12).
//
// MUUTOKSET v4.37.0:
// - CSS: uudet luokat .cv-hero, .cv-tl-wrap, .cv-tl-wk, .cv-week-card, .cv-day,
//   .cv-crit, .cv-nw, .cv-legend (säilyttää aiemmat .card-luokat)
// - Block colors --b-found / --b-strength / --b-intens / --b-peak / --b-deload
//   lisätty :root-tasolle
// - renderMesocycle() yläosa korvattu Cycle View Variant -komponenteilla:
//   1. Block-hero-kortti (eyebrow + name + sub + progress-meter + foot)
//   2. 16 vk timeline (horisontaalinen scroll, värikoodatut pylväät)
//   3. Tämä viikko -kortti (status-bullet + päivänpäivä + fokus + load)
//   4. Ensi viikko -preview (delta-pilli + day-pillit)
//   5. Kriittinen ikkuna -banneri kun deload < 14 pv
// - Säilyttää: ohjelman idea, autoreg, volyymi, ohjelma-overview details-elementit
// - Ei AI Block Tuning -modaalia tässä versiossa (handoff Tier 2 tulee myöhemmin)
//
// VERIFIOINTI:
// - 304/304 selaintestiä OK
// - UI-rendering ei kaadu (Claude Preview testattu)
// - Timeline + komponentit renderöityvät oikein
//
// v4.36.0 — Lämmittelynäkymä-redesign (Claude Design "Variant A").
//
// Atletin palaute 2026-05-08: nykyinen yksirivinen warmup-näkymä on epäselkkeä
// (anatomia, sitaatit, version-bumput sekoittuneet yhdeksi tekstiksi). Claude
// Designin tuotos: kompakti rivilistaus 5 rivillä + reveal-nappi loppuihin +
// tap-rivi avaa inline detail-paneelin (uusi schema: steps + cue + meta;
// legacy: full desc).
//
// MUUTOKSET v4.36.0:
// - CSS: uudet luokat .wu-block, .wu-head, .wu-row, .wu-more, .wu-detail
//   (säilyttää legacy .warmup-line:n koskemattomana)
// - Render: warmupBlockHTML korvaa warmupLineHTML:n koti-näkymässä
// - Helper-funktiot _wuParseDose/_wuParseWhy parsivat dose+why legacy desc:istä
//   jos uusi schema (item.dose, item.why) puuttuu → non-breaking fallback
// - Event delegation: tap-rivi → inline expand, "Näytä loput N" → reveal kaikki
// - Migration: vaiheittainen — data.js warmup-blokit voivat lisätä uudet kentät
//   (dose, why, steps, cue, citation, changelog) yksitellen ilman flag:ia
//
// VERIFIOINTI:
// - 304/304 selaintestiä OK (engine ennallaan)
// - UI-rendering ei kaadu kun warmup-data puuttuu
//
// v4.35.3 — KOKO sovelluksen e1RM-yhtenäistäminen + yksikkö-bug-korjaus.
// Atletin palaute v4.35.2:n jälkeen 2026-05-08: "et näytä ratkaisevan selkeitä
// ongelmia" + Lisäpainodippi näkyi 100.9 ↓-92.4 kg (= -92 kg pudotus).
//
// JUURISYYT v4.35.3:ssa korjattu:
// 1) Yksikkö-bug: computeMovementE1RMBest palautti aina ext-arvon, mutta
//    legacy computeMovementE1RM palauttaa system-arvon system-load-liikkeille.
//    Lisäpainodippi (system-load): UI näytti ext-luvun system-otsikon alla
//    → näytti -92 kg pudotuksena. KORJATTU: palautusarvon yksikkö matchaa
//    legacy-funktioon (barbell → ext, system-load → system).
// 2) UI-näkymät joita v4.35.1/.2 ei korjannut:
//    - ENNUSTE KISAAN -näkymä (computeStreetliftingOpenerStrategy syöte)
//    - Liikepankki-näkymä (movementE1RMs-kartta)
//    - KUORMITETUT-näkymä (currentE1RM)
//    - showMovementDetail-modaali (currentE1RM)
//    Kaikki kutsuvat nyt computeMovementE1RMBest:iä → yhtenäinen luku
//    KAIKKIALLA sovelluksessa.
//
// Yhteensä 6 erillistä UI-kohtaa korjattu (3 v4.35.1/.2:ssa + 4 v4.35.3:ssa,
// josta 1 päällekkäinen, joten +4 uutta v4.35.3:ssa).
//
// v4.35.2 — Edistyminen-välilehden e1RM yhtenäistäminen JATKUU.
// v4.35.1 korjasi vain renderPerLiftAutoregStatus-funktion (Koti-näkymän kortin),
// MUTTA käyttäjän näkemä Edistyminen-välilehti käyttää eri funktioita:
// renderProgress() (kisaliike-kortit) + renderTrends() (per-liike trendit).
// Atletin palaute 2026-05-08 v4.35.1:n jälkeen: "ei mikään muuttunut" — koska
// tämä funktio ei vaikuttanut hänen näkemäänsä lukemaan.
// v4.35.2 korjaa kaikki kolme funktiota:
//   - renderPerLiftAutoregStatus (v4.35.1) — Koti-näkymän kortit
//   - renderProgress (v4.35.2) — Edistyminen-välilehden kisaliike-kortit (current-arvo)
//   - renderTrends (v4.35.2) — Trendit-välilehden per-liike-kortit
// Kaikki kolme käyttävät nyt computeMovementE1RMBest:iä → yhtenäinen luku.
//
// v4.35.1 — Edistyminen-välilehden e1RM yhtenäistetty recommend()-funktion
// kanssa. Atletin palaute 2026-05-08: e1RM näytti 170.8 (median) Edistyminen-
// näkymässä mutta 184.9 (PLAN_BASED) recommend-tracessa → epäjohdonmukainen.
// Korjaus: uusi computeMovementE1RMBest-funktio joka käyttää SAMAA priorisointia
// kuin recommend() (cal → plan-based → median). Edistyminen-välilehti kutsuu nyt
// tätä, joten kaikkialla näkyy sama luku. Ei muuta progressio-target-laskentaa.
//
// v4.35.0 — ELIITTITASON PROGRESSIO-MALLI (Helms 2018, Cumming 2024,
// Issurin 2010): refaktoroitu rikkinäinen cap-only-pohja tutkimuspohjaiseksi.
//
// Yhdenseuraussessio (2026-05-08): atletin palaute "kymmeniä auditointeja ja silti
// ohjelma on lapsen kengissä — miksi?". Vastaus: pohja-algoritmi (loadPct ×
// baseline + adhoc-capit) ei ollut tutkimukseen perustuva. Refaktorointi:
//   • PROGRESSION_CONFIG-vakio (engine.js:52-110) — magic numbers yhteen paikkaan
//   • computeProgressionTarget-funktio (engine.js:1847-2010) — yksi keskitetty
//     päätös progressiolle: regain-multiplier (Cumming 2024 retraining ~33-50%
//     nopeampi), Helms 2018 Vx-mismatch-säätö (1Vx = 2% session-välillä),
//     viikoittainen baseline +2.5%/vk (Helms 2018 + RP), V0-grindi-suoja,
//     yliajot cal/deload/speed-päivissä
//   • Integroitu primary-haaraan + cross-reference-haaraan (sama logiikka molemmille)
//   • 12 yksikkötestiä eristyksessä (E1-E12, regain FAR/NEAR, PR-vaihe, V0-fail,
//     deload, speed, no-history, no-plan, Helms Vx-adj, PLAN_BASED-harmonisointi,
//     multi-week, hard-cap)
//   • 304 testiä OK, ei regressiota nykyisiin 281+ testiin
//
// ATLETIN ESIMERKKI (vk 1 LA Takakyykky 120 kg V4 helposti, cfg 185):
//   ratio 0.65 < 0.85 → REGAIN_FAR (×2.0). weekly = 0.025 × 2.0 × 1 = 5%.
//   Autoreg = 120 × 1.05 = 126 kg V4. Plan-floor 102. Hard-cap 138. Final 126.
//   → osuu atletin odotukseen 126-132 kg (eliittitasoinen progressio regainissa).
//
// Lisäksi korjattu sw.js:n APP_VERSION-uudelleenmääritysbugi: aiemmissa versioissa
// jokainen const APP_VERSION = "..." -bumppi jätti vanhat määritykset aktiivisina
// → SyntaxError SW:n parserissa. Nyt vain yksi aktiivinen, vanhat historiana
// kommenteissa.
//
// v4.34.50 — PROGRESSION_FLOOR_CAP_CROSSREF (regression-suoja
// secondary-sloteille, atletin 2. palaute 2026-05-08):
//
// Atletti suoraan: "Jos olen tehnyt secondary kyykyn 120 kg viime lauantaina,
// et voi laskea 102 kg seuraavalle. Jokin on pahasti pielessä."
//
// JUURISYY: Primary-slotille on ollut PROGRESSION_FLOOR_CAP (engine.js:3131)
// joka estää kuorman laskun viime sessiosta — mutta cross-reference-haara
// (engine.js:3300+, secondary-slotit kuten LA Takakyykky streetlifting_16w:ssä)
// ei tunnistanut tätä suojaa. v4.34.49:n cfg-floor parani tilannetta vain
// osittain (94 → 102 kg), mutta atletin todellinen suoritus 120 kg jäi alaksi.
//
// KORJAUS engine.js:3370 (kun PROGRESSION_RATE_LIMIT_CROSSREF on käsitelty):
// Lisätty PROGRESSION_FLOOR_CAP_CROSSREF samoilla säännöillä kuin primary:
//   - useLastAnchor (uusi Vx >= viim. Vx)
//   - !lastSession.isCalibration
//   - weekDef.deltaPctBase >= 0
//   - dayPlan.dayType !== "speed"
// Floor: lastSession.medianLoad SUORAAN (ei -2.5%). Atletti pystyi tähän
// kuormaan viim. session targetin Vx:llä → seuraavan sessio sama-Vx target
// ei saa olla pienempi.
//
// VAIKUTUS ATLETIN VK 2 LA -SESSIOON
// - Ennen v4.34.49: 94 kg (= 0.55 × 170 historia)
// - v4.34.49 (cfg-floor): 102 kg (= 0.55 × 185 cfg)
// - v4.34.50 (floor-cap): 120 kg (= viime suorituksen taso)
// Atletti voi tehdä 130 V4 → engine oppii ja vk 3 LA target on >= 130 kg.

const APP_VERSION = "4.38.6";

// v4.34.50 oli aiempi APP_VERSION (= "4.34.50") tässä kohdassa.
// v4.34.49 muutoshistoria:
// (1) MU eksentrinen näytti "+64.5 kg" skill-vaiheessa (vk 1-4) vaikka slot on
//     BW + kuminauha (suggestedLoadKg=0). Syy: UI:n primary-slot-rendering käytti
//     rec.targetExternalLoad fallbackia kun aktiivisen liikkeen e1RM=0, mikä
//     vuoti Lisäpainoleuanveto-targetin (0.55 × leuka-e1RM ≈ 64.5) MU-rivillä.
//     KORJAUS index.html:2655 — jos slot.suggestedLoadKg===0 tai muSkillPhase===true,
//     näytä "BW" (ei rec.targetExternalLoad). Vaikuttaa MU eksentrinen vk 1-4.
// (2) Vk 2 LA Takakyykky näytti 94 kg (= 0.55 × 170 historia-mediani) vaikka
//     atletin Asetuksissa cfg.kyykkyExtKg = 185 (= 102 kg). Syy: cross-reference-
//     haara engine.js:3300 käytti pelkkää historia-mediania ja ohitti cfg-arvon.
//     KORJAUS: cfg-floor — käytä max(historia-mediani, cfg-arvo) × loadPct.
//     Säilyttää konservatismin (cfg ei voi LASKEA kuormaa), mutta atletin
//     intentionaalinen cfg-arvo toimii alarajana. Jos historia > cfg, historia
//     voittaa kuten ennen. Uusi trace CFG_FLOOR_APPLIED audit-trailiin.
// 276/276 OK, ei regressiota. Streetlifting_16w-meson rakenne ennallaan.

// v4.34.49 oli aiempi APP_VERSION tässä kohdassa.
// v4.34.48 muutoshistoria:
// generateBlockTuningPackage on hardkoodattu streetlifting_16w-mesolle (foundation/
// strength/intensity/peaking-blokit, kisaliikkeet, vk 4/8/12 deload-mappi).
// Atletti: "Olisi tärkeää että AI-block-tuning toimisi muillekin mesotyypeille
// jotta sovellus on 9/10 koko järjestelmänä." Uusi yleinen versio:
//   - generateGenericBlockTuningPackage: deload-tunnistus weekDef.deltaPctBase < 0
//   - Etsii primary-liikkeet weekPlans:sta dynaamisesti (ei hardkoodattuja)
//   - Käyttää movementCfg:tä jos olemassa (v4.34.44 yleistys)
//   - Sama markdown + json + AI-prompt -output kuin streetlifting-versio
// UI-kytkentä: btn-generate-block-tuning käyttää nyt streetlifting_16w:lle
// alkuperäistä funktiota, muille mesoille uutta yleistä versiota.
// 4 uutta testiä test-runneriin (276/276), mukaan lukien KAVERI-FIXTURE
// (Maija: penkki+mave, ei velocity-mittaria, 1RM-kalibroitu) joka todistaa
// että koko Vaihe 1-3 -ketju toimii kuvitteelliselle uudelle käyttäjälle.
//
// v4.34.47 (edellinen) — LIIKEPANKKI-MODAALI WIZARDIIN (Vaihe 2-Lite):
// Wizardin Päälikkeet-valinta tarjosi vain 8 hardkoodattua liikettä — 122
// liikepankin liikettä jäi piiloon. Lisätty "+ Lisää muu liike" -chip joka
// avaa showMovementBankModal:in. Modaalissa: tekstihaku + kategoria-suodatus
// (9 kategoriaa) + lista (max 80 näkyvää, lisää-vinkki jos enemmän).
// Klikkaus liikkeelle lisää sen wizardin extraPrimaries-listaan + valinnan-
// listaan. Säilyttää max-3-päälike-rajan. State.movements luetaan suoraan
// (122 liikettä, IDB-pohjainen).
// 260/260 testiä OK, ei regressiota.
//
// v4.34.46 (edellinen) — OHJELMAT-NÄKYMÄN PIKAKORJAUKSET (Vaihe 1.6/3):
// Atletin palaute v4.34.45-pushin jälkeen: "1) miksi liikepankin historia-nappi
// ei toimi? 2) perusjaksot (44 kpl) on tyhjiä ja turhia ohjelmia."
// (1) Liikepankin 📊-painike avasi detail-kortin sivun pohjalle piiloon
// liikelistan alle — käyttäjä luuli ettei nappi tee mitään. KORJAUS:
// scrollIntoView({ behavior: 'smooth', block: 'start' }) detail-divin avauksen
// jälkeen, viewporttiin nyt automaattisesti.
// (2) 44 autocreated default-mesoa olivat kerääntyneet aikojen saatossa init-
// vaiheen sivuvaikutuksena (createDefaultMesocycle joka init jossa active=null
// → save). Vain "Vaihda ohjelma" -toiminto siivosi orphanit. Aiemmin nämä
// olivat näkymättömissä, mutta v4.34.45:n Ohjelmat-sektio paljasti kaikki.
// KORJAUKSET 1.6b-d: (b) Ohjelmat-näkymä suodattaa orphan-mesot pois
// oletuksena (näytä vain merkitykselliset). (c) "🧹 Siivoa tyhjät" -nappi
// jolla atletti voi puhdistaa orphanit yhdellä klikkauksella + vahvistus.
// (d) Init-vaiheessa autocreated default aktivoidaan heti setActiveMesocycle:lla
// → estää uuden orphan-tilanteen kerääntymisen tulevaisuudessa.

// v4.34.46 oli aiempi APP_VERSION tässä kohdassa.
// (Aktiivinen APP_VERSION-määritys löytyy ylhäältä.)
const CACHE_NAME = `leve-ai-v${APP_VERSION}`;

// v4.34.9: Kuuntele SKIP_WAITING-message-eventtia, jolla pää-säie voi pakottaa
// uuden SW:n aktivoitumisen heti (update-bannerin "Lataa nyt" -nappi käyttää tätä).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./engine.js",
  "./data.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: navigation network-first (3s timeout), assets stale-while-revalidate, others cache-first
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // v4.34.37: navigation-pyynnöt (= index.html) → network-first 3 s timeout, fallback cache.
  // Tämä takaa että käyttäjä saa AINA uusimman index.html:n + script-viittaukset
  // kun online. Aiempi stale-while-revalidate palveli vanhan HTML:n joka viittasi
  // vanhoihin engine.js + data.js -tiedostoihin → automaattinen päivitys ei toiminut.
  if (event.request.mode === "navigate") {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        }),
        new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).then(async (networkResponse) => {
        if (networkResponse) return networkResponse;
        // Timeout tai fail → fallback cache
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request) || await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request) || await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  const isCoreAsset = CORE_ASSETS.some(a => url.pathname.endsWith(a.replace("./", "/")));

  if (isCoreAsset) {
    // Stale-while-revalidate: serve cache immediately, update in background
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null);

        return cached || fetchPromise || new Response("Offline", { status: 503 });
      })
    );
  } else {
    // Non-core assets: cache-first, network fallback
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response("Offline", { status: 503 }));
      })
    );
  }
});
