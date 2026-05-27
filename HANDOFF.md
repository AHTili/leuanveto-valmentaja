# HANDOFF.md — aktiivinen Cowork → Code -toimeksianto

> Repon **ainoa aktiivinen handoff**. Cowork täyttää osiot 0–6, Claude Code täyttää osion 7.
> Valmis handoff arkistoidaan → `docs/handoffs/HANDOFF_<id>.md`, ja tämä tiedosto nollataan tyhjäksi pohjaksi.
> Auktoriteettijärjestys: ks. `CLAUDE.md` §7. Session-protokolla: ks. `CLAUDE.md` §8.

---

## 0. Metadata

| Kenttä | Arvo |
| --- | --- |
| Handoff-id | `H-006a` |
| Tyyppi | `scope-expansion` |
| Laadittu | 2026-05-27 / Cowork-sessio |
| Tila | `AKTIIVINEN` |
| Liittyy R-sekvenssin vaiheeseen | Enabler vaiheelle **17 (Round B-α-2)** — itse aux, ei R-vaihe-siirto. H-006b (primer-mekanismi + sys-1RM-päivitys) erillinen myöhempi handoff. |

**Tyyppi (scope-expansion):** A-kriteerit uuden ominaisuuden mitattavina hyväksyntäehtoina + eksplisiittinen scope-aita (§3). Vaatii regressio-pilot-passin (A5).

---

## 1. Tavoite

Aktivoi kirjatun Enode-velocity-datan virta sets-storesta engine-tasolle **kaikkiin** velocity-funktioihin — eritoten AI-Block-Tuning-syötteeseen, jotta deload-analyysi (vk 4/8/12) tunnistaa kehityksen ja taantumisen velocity-pohjaisesti. Aktivoi `available/unavailable`-status engineen jotta pipeline-eheys on atletille läpinäkyvä Asetukset-välilehdellä.

**Mullistava taso H-006a:n yhteydessä:** Akselin henkilökohtainen ja liikekohtainen velocity-data alkaa optimoida AI-Block-Tuning-suosituksia konkreettisesti. Kirjaaminen toimii jo (Akselin atletti-vastaus H-001 Q7), hyödyntäminen ei — H-006a sulkee tämän kuilun data-flow-puolelta. Primer-pohjainen sys-1RM-päivitys (ROADMAP §1 vision yksi komponentti) jätetään H-006b:hen.

## 2. Acceptance criteria

- **A1** (velocityMs-aukon korjaus): `engine.js:6498` ja `engine.js:6809` luetaan kaavalla `velocity: set.velocityMs ?? set.velocityMean ?? null`. Jokainen olemassaoleva setti, jossa `velocityMean !== null`, päätyy AI-Block-Tuning-syötteeseen velocity-arvolla. Verifiointi: testi syöte = setti `{velocityMean: 0.65, velocityMs: undefined}` → output `actual.velocity === 0.65`.
- **A2** (AI-Block-Tuning-syötteen rikastus): `generateBlockTuningPackage` (engine.js:6449) ja `generateGenericBlockTuningPackage` (engine.js:7315) lisäävät `actual`-objektiin neljä uutta kenttää: `velocityRep1`, `velocityLossPercent`, `mvRepsCount` (= `Array.isArray(mvReps) ? mvReps.length : 0`), `rtfModelStatus` (= `computeRtfVelocityModel`-paluuarvo per liike — `status`, `n`, `r2`, ei koko mallia).
- **A3** (RTF-mallin filtteri-laajennus): `engine.js:2589` `computeRtfVelocityModel`-funktion suodatin laajennetaan: vanha vaatii `s.setRole === 'rtf_test'` → uusi käyttää pelkkää `Array.isArray(s.mvReps) && s.mvReps.length >= RTF_MIN_REPS_PER_SET` (setRole-rajoite poistetaan, jotta normaalit work-setit kvalifioituvat jos atletti syöttää mvReps[]-arvot). **Verifiointi pilot-harnessissa:** RTF_MODEL_STATUS muuttuu nykyisestä `no-data, n=0` → `relevant` Akselin profiilin primary-liikkeille kun n >= 6 sessio mvReps[]-täytetyttyä. *(Cowork verifioi 2026-05-27 trace-tiedostosta: nykytila tasan no-data; filtteri-laajennus on välttämätön ja riittävä.)*
- **A4** (available/unavailable-status aktivointi): `engine.js:6543` B3 K3 -kommentin "unavailable EI emittoidu nyt" poistetaan, status emittoidaan per-mittari (`velocity` / `hrv` / `vara`) arvoilla `available` / `loading` / `unavailable`. Status-emissio kytkeytyy mittausten saatavuuteen: velocity → `available` jos viim. 30 päivässä ≥ 3 settiä joissa `mvReps[]` täytetty; `loading` jos 1–2; `unavailable` jos 0.
- **A5** (regressio): `tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w` palauttaa bittitarkasti samat **kuormat** baseline-versiona. A1-fallback ei muuta kuorman laskentaa, A2-rikastus on additiivinen JSON-output-tasolla, A3-filtteri-laajennus aktivoi RTF-mallin Akselin profiilille mutta RTF-malli ei vielä syötä recommend():n kuorma-laskentaan (RTF-mallin käyttöönotto kuormissa = jatkohandoff). Sallitut diffit: AI-Block-Tuning-tulosteen `actual.velocity*`-kenttien lisäykset, RTF_MODEL_STATUS-tracejen muutos `no-data` → `relevant`/`learning`, available-status-tracejen ilmaantuminen.
- **A6** (selain-testit): `?test=1` 586/586 passaa (pre-existing VBT + T9 -failureet säilyvät, eivät H-006a-spesifejä). Uudet testitapaukset:
  - `testBlockTuningVelocityFallback` — A1:n verifiointi
  - `testBlockTuningActualEnrichment` — A2:n neljän uuden kentän olemassaolo
  - `testRtfModelFilterExpansion` — A3:n setRole-laajennus (syöte: 4 work-setia `setRole='top'`, mvReps[]≥4 → output: RTF-model `status !== 'no-data'`)
  - `testAvailabilityStatusEmission` — A4:n kolmen statusvektorin emissio
- **A7** (UI-näkyvyys): Asetukset-välilehdellä uusi kortti "📊 Datavirran tila" — sijainti **ennen "🤖 AI-Block-Tuning"-korttia**. Kortti näyttää kolme indikaattoria (velocity / hrv / vara) tilakuvilla 🟢 available / 🟡 loading / ⚪ unavailable. Klikki kentän kohdalla avaa lyhyen selitteen (esim. "velocity-pipeline: kerätty X settiä viim. 30 päivässä, viimeisin Y").

## 3. Reunaehdot ja scope-aita

**Sovellettavat invariantit (CLAUDE.md §2):** VL-cap (foundation/strength/intensity/peaking), Deload Δ%, Tier-progression elite, Rep1 MPV slope per RIR, Failure-jälkeinen kuormapudotus — **kaikki koskemattomat**. H-006a ei muuta laskennan sääntöjä, vain datan virtaa funktioihin.

**Mitä EI kosketa:**

- `recommend()`-funktion päälogiikka — H-006a koskettaa vain syötepolkua, ei laskennan sääntöjä
- Primer-protokollan UI ja sys-1RM-päivitys (= H-006b scope, erillinen handoff)
- LV-regressio-päivitys päivän sys-1RM:ään (= H-006b / vaihe 17)
- Velocity-stop popupit setin sisällä (= jätetty pois H-006a:sta tietoisesti)
- Target-velocity-display UI:ssa setin alussa (= jätetty pois H-006a:sta)
- Vx-tavoitteen automaattinen säätö rep1 MPV:stä reaaliajassa (= jätetty pois H-006a:sta)
- Enode-API-integraatio / OAuth / polling — **ei scopessa**, atletti kirjaa manuaalisesti (vahvistettu 2026-05-27)
- RTF-mallin tulosten käyttö recommend()-kuormissa (= jatkohandoff RTF:n vakautumisen jälkeen)
- Sparring-juurisyy-teesi (slot-resolveri, OBS-002…OBS-006) — erillinen jatkohandoff H-007+
- Atletti-spesifiset block-tuning-handoffit (H-004 profile-consistency) — erillinen handoff
- Oura HRV -integraatio — eri handoff (vaihe 18 Round B-β)
- Manuaalisyötön UI (index.html:1920 + 13980) — säilyy ehjänä, ei poisteta

**Sisältyy aitaan (B-tyylinen sulkuvaihe, kuten H-005 B5):**

- ROADMAP.md rivi 9 päivitys: HEAD `4252049` → uusi HEAD-sha, APP_VERSION `4.52.5` → `4.52.7` (sw.js-koskettelu B4:ssä)
- docs/backlog.md OBS-001 placeholderista empiiriseen muotoon (B0, erillinen kapea commit ennen B1:tä)
- sw.js APP_VERSION-bump (B5)

**Tekniset reunaehdot:**

- Ei uusia npm-riippuvuuksia (vanilla JS, IndexedDB)
- SCHEMA_VERSION **säilyy 5:ssä** (ei migrationia — kaikki kentät ovat jo olemassa)
- Service Worker -yhteensopiva (sw.js cache-invalidation toimii bumpin yhteydessä)
- A2:n rikastus on additiivinen — vanhat AI-Block-Tuning-vastaanottajat (Claude/ChatGPT) eivät rikkoonnu uusista kentistä

## 4. Atletti-vastaukset critical questions -kysymyksiin

Ei sovellu — H-006a on `scope-expansion`, ei `block-tuning`.

*(Akselin priorisointi 2026-05-27 huomioitu päätöksissä: "kirjaaminen toimii, hyödyntäminen ei" = H-006a:n perustelu; työsarja-tason mullistava taso = data-tallennus + AI-Block-Tuning-rikastus + RTF-malli, EI reaaliaikaisia UI-popupeja.)*

## 5. Taustapäätökset ja hylätyt vaihtoehdot

**Päätetty Akselin ratifioimana 2026-05-27 Cowork-sessiossa:**

- **velocityMs-korjaustapa:** Fallback-luku engine.js:ssä (A1, kapea scope).
  - Hylätty: rakenteellinen yhtenäistys (deprekoi velocityMs) — vaatii regressio-pilotin uudelleenvalidoinnin; aktiivinen migration (kirjoita velocityMs saveSet-polkuihin) — eniten koodirivejä koskettava, lisää teknisen velan eri kohtaan.
- **RTF-mallin testaus:** Verifioi nykyisellä datalla — jos ei toimi, setRole-filtterin laajennus (A3).
  - Hylätty: eksplisiittinen "Rakenna RTF-malli" -UI-elementti (lisää UI-työtä); RTF-mallin rajaaminen H-006a:n ulkopuolelle (Akseli halusi pitää RTF:n scopessa).
  - **Verifioitu 2026-05-27:** RTF_MODEL_STATUS Akselin profiilin tracessä = `no-data, n=0` kaikissa esiintymissä → filtteri-laajennus välttämätön ja riittävä.
- **Lähde 1 vs Lähde 2 -erottelu:** H-006a = Lähde 2:n data-flow-aktivointi; Lähde 1 (Epley-Vara) koskematon.
  - Hylätty: Lähde 1:n parannus (scope-sotku); molemmat samanaikaisesti (liian iso /goal-kierros).
- **Scope-jako:** H-006a (data-flow + analyysi-rikastus, tämä handoff) + H-006b (primer-mekanismi, erillinen).
  - Hylätty: yksi iso H-006 (raskas /goal); H-006 + vaiheeseen 17 primer (rikkoo H-handoffin yksiköllisyyttä).
- **Työsarja-taso:** Vain data-tallennus + AI-Block-Tuning-rikastus + RTF — ei reaaliaikaisia UI-popupeja velocity-stop-suosituksista.
  - Hylätty: kaikki kolme reaaliaika-kohtaa (UI-työ merkittävä, scope iso).
- **Sparring-chat-rinnakkaisversio:** Ei tehdä H-006a:lle (kapea scope ei vaadi ristiintarkistusta).
  - Hylätty: rinnakkaisversio (alkuperäinen Akselin valinta vaihtoehdolle iso H-006, ei kapealle H-006a:lle).
- **Prosessikuvaus V4 -peilaus:** Ei suoriteta (tiedosto ei mountatuissa paikoissa, Akselin päätös ohittaa peilaus).

**Aiemmin tehdyt päätökset (eivät re-litigoida):**

- Atletti kirjaa Enode-mvReps[]-arvot manuaalisesti per toisto — toimiva polku, ei muuteta
- Engine.js:n velocity-funktiot v4.25.1:stä lähtien Enode-valmiina — H-006a kytkee data-virran, ei muuta funktioiden sisältöä
- H-006b velocity-dataketjun primer-mekanismi on Akselin "kunnianhimon ydin" mutta jakautuu omaksi handoffikseen — voi integroitua vaiheeseen 17 Round B-α-2 myöhemmin

## 6. Avoimet kysymykset

Ei avoimia kysymyksiä — kaikki Cowork-session 2026-05-27 aikana ratkaistu:

- Q1 RTF-verifiointi: A3:n laajennettu filtteri vahvistettu välttämättömäksi pilot-tracesta
- Q2 Status-indikaattorin position: ennen "🤖 AI-Block-Tuning"-korttia (A7)
- Q3 Prosessikuvaus V4 -peilaus: ei suoriteta
- Q4 Sparring-chat-rinnakkaisversio: ei tehdä H-006a:lle

Code voi aloittaa B-sekvenssin ilman lisäkysymyksiä.

**B-sekvenssi (suositus, Code-puolen toteutus):**

- **B0**: docs/backlog.md OBS-001 päivitys placeholderista empiiriseen muotoon (erillinen kapea commit ennen B1:tä, Cowork on tuottanut tekstin — ks. session-tulos)
- **B1**: engine.js:6498 + 6809 — velocityMs-fallback (`velocity: set.velocityMs ?? set.velocityMean ?? null`)
- **B2**: engine.js — `computeRtfVelocityModel`-filtterin laajennus (rivi 2589) + `generateBlockTuningPackage` + `generateGenericBlockTuningPackage` `actual`-objektin rikastus (velocityRep1, velocityLossPercent, mvRepsCount, rtfModelStatus)
- **B3**: engine.js — available/unavailable-status emissio + engine.js:6543 B3 K3 -kommentin poisto/päivitys
- **B4**: index.html — Asetukset-välilehti, uusi "📊 Datavirran tila" -kortti ennen "🤖 AI-Block-Tuning"-korttia
- **B5** (sulkuvaihe): sw.js APP_VERSION 4.52.6 → 4.52.7 + ROADMAP.md rivi 9 päivitys (HEAD + APP_VERSION) + selain-testien lisäykset A6:n mukaisesti (`test-runner.js`)

---

## 7. Session-tulos  *(Claude Code täyttää session lopussa)*

| Kenttä | Arvo |
| --- | --- |
| Sessio päättyi | `<pvm>` |
| Muuttuneet tiedostot | `<lista>` |
| Tehdyt päätökset | `<lista>` |
| Validointi | `<Stop hook pass/fail · selain-testit · regressio-pilot>` |
| Jäi auki | `<lista tai "—">` |
| Seuraava askel | `<H-006b primer-mekanismi tai siirtyminen vaiheeseen 17>` |
