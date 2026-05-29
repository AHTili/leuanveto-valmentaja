# docs/backlog.md — havaintojen kerääntymispaikka

Tähän kirjataan tunnistetut havainnot jotka EIVÄT kuulu aktiiviseen
HANDOFF.md-toimeksiantoon. Tämä on pre-handoff-vaihe: havainnot kerätään,
priorisoidaan, ja sopivat siirretään omiksi handoffeiksi.

## Formaatti

Jokainen havainto:

- **OBS-NNN** · pvm · lähde · status
- Kuvaus (konkreettinen, toistettavissa)
- Mahd. aritmetiikka tai screenshot-viite
- Liittyy-kohdat (sukulaisuus muihin OBS:iin tai handoff-suunnitelmiin)

Status-elinkaari: `AVOIN` → `PRIORISOITU (H-xxx)` → `KÄSITELTY (commit-hash)`.

## Prosessi

1. Lisää OBS heti kun havaitset — Windows-natiivi-editointi sallittu, ei
   vaadi Code-sessiota tai Cowork-tukea.
2. Käsittele kvartaaleittain tai handoff-välissä — älä yritä korjata
   suoraan backlogista, siirry handoffin kautta.
3. Sukulaisia OBS:iä ryhmittele yhteisellä juurisyy-merkinnällä.

## Havainnot

### OBS-001 · 2026-05-27 · repon empiirinen recon (H-006-prelim, korjattu) · PRIORISOITU (H-006a)

**Velocity-data tallentuu sets-storeen, mutta ei virtaa analyysi-tasolle erinomaisella tasolla**

Vahvistukset:

1. Velocity-data tallentuu **luotettavasti sets-storeen neljään kenttään**
   (velocityMean, velocityPeak, velocityRep1, velocityLossPercent) + array
   (mvReps[]) sekä RTF-testissä (index.html:2075–2078), primer-tallennuksessa
   (index.html:13998–14001), set-editissä (index.html:9132), että normaaleissa
   work-setteissä treenin tallennuksessa (index.html:14228–14253). Atletti
   pystyy kirjaamaan Enode-mittausarvot luotettavasti.
2. Engine.js velocity-funktiot lukevat dataa **neljästä eri kentästä**:
   `velocityReadiness` (primer-readiness) → `velocityRep1`;
   `computeLoadVelocityProfile` (LV-regressio) → `velocityMean`;
   `computeRtfVelocityModel` (RTF-malli) → `mvReps[]`;
   `predictVxFromVelocity` (Vx-ennuste) → `mvReps[]`;
   **`generateBlockTuningPackage` (AI-Block-Tuning-syöte) → `velocityMs`.**
3. **Kriittinen rakenteellinen aukko:** `velocityMs`-kenttää LUETAAN
   engine.js:n kahdessa paikassa (6498 + 6809, molemmat
   `generateBlockTuningPackage`-funktion variantteja), mutta sitä EI
   KIRJOITETA missään saveSet-polussa. AI-Block-Tuning-syöte näkee
   jokaisen setin `velocity: undefined`.
4. Akselin kanoninen vahvistus 2026-05-27 Cowork-sessiossa: kirjaaminen
   toimii, hyödyntäminen ei. "Ei primer-sarjoja, eikä sarjapainojen
   aikaisia velocity-dataa" erinomaisella tasolla.
5. `available/unavailable`-status määritelty engine.js:6371 mutta ei
   emittoida (B3 K3 -kommentti engine.js:6543: "per-mittari
   tyhjä-status-encoding. unavailable EI emittoidu nyt").
6. RTF-malli (computeRtfVelocityModel, engine.js:2582) suodattaa
   `setRole === 'rtf_test'`. **Verifioitu pilot-tracesta 2026-05-27:**
   RTF_MODEL_STATUS Akselin profiililla = `no-data, n=0` kaikissa
   esiintymissä → setRole-filtterin laajennus välttämätön
   (`Array.isArray(s.mvReps) && s.mvReps.length >= RTF_MIN_REPS_PER_SET`
   pelkkä mvReps[]-pohjainen).

Päätelmä: Ongelma EI ole datan kirjaamisessa eikä ulkoisessa
API-puutteessa. Ongelma on **sisäisessä datavirran katkoksessa** —
kirjattu data on sets-storessa mutta ei kanavoidu kaikkiin
engine-funktioihin (eritoten AI-Block-Tuning-syötteeseen, joka lukee
kuollutta kenttää). Lisäksi available/unavailable-status, joka voisi
tehdä rikkimenneisyyden läpinäkyväksi atletille, ei aktivoidu.

Aukot jotka H-006a ratkaisee:
- velocityMs-aukon korjaus engine.js:ssä (fallback-luku, kapea scope)
- AI-Block-Tuning-syötteen täysrikastus (4 uutta kenttää actual-objektiin)
- RTF-mallin setRole-filtterin laajennus (engine.js:2589)
- available/unavailable-status aktivointi engineen + UI-indikaattori
  Asetukset-välilehdellä

Vaikutus: AI-Block-Tuning vk 4/8/12 deload-analyysi alkaa hyödyntää
velocity-dataa kehityksen/taantumisen tunnistuksessa → H-006a:n
mullistava taso saavutetaan. H-006b (primer-mekanismi +
sys-1RM-päivitys) on erillinen jatkohandoff.

Liittyy: HANDOFF_H-001.md Q7 (kanoninen atletti-vastaus, kirjaaminen
toimii), ROADMAP §17 (H-006a on osa Lähde 2:n data-flow-aktivointia),
H-006b (primer-mekanismi, erillinen). EI liity OBS-002…OBS-006:een
(eri juurisyy: dataketju vs slot-resolveri).

### OBS-002 · 2026-05-26 · live-treeni + backfill + etusivu + sarjahistoria · AVOIN

**Back-off-kuorma > pääsarja — liike-riippumaton resolver-virhe**

Vahvistukset:

1. Takakyykky live-treeni 2026-05-26: pääsarjat 4×4×150 kg → back-off
   157.5 kg ehdotettu (5 % yli pääsarjan).
2. Lisäpainoleuanveto backfill 2026-05-25 (Kilpaveto leveä vastaote):
   back-off 65 kg lisäpainoa raportoitu "isompi kuin pääsarjat".
3. Etusivu treenin jälkeen 2026-05-26: pääsarja +157.5, back-off +166
   (5.4 % yli).
4. Käyttäjän manuaalinen kiertotie sarjahistoriassa: Akseli kirjasi
   2× 130 kg × 5 V3 vaikka sovellus ehdotti 157.5 kg → vahva todiste
   aidosta tuotantokäytön ongelmasta.

Päätelmä: vika on slot-resolverissa, ei liike-konfiguraatiossa. Toistuu
kaikilla back-off-osiollisilla liikkeillä (kyykky, lisäpainoleuanveto,
todennäköisesti myös lisäpainodippi).

Vaikutus: vammariski jos käyttäjä ei korjaa käsin.

Liittyy: OBS-004, OBS-005, OBS-006 (yhteinen sparring-juurisyy-teesi alla).
Pohjapuhtaus-arc (H-001/002/003) EI koskettanut runtime-resolveria —
todennäköisesti edelleen voimassa post-arc.

### OBS-003 · 2026-05-26 · etusivu treenin jälkeen · OSITTAIN RATKAISTU

**Etusivu ei näytä toteutuneita treenin jälkeen**

- Tehty: kyykky 4×4×150 kg + back-off
- Etusivu treenin jälkeen: pääsarja "+157.5 kg" (prescriptio, ei 150 kg
  toteutunut)
- Toteutuneet löytyvät: 💪 Liikkeet-välilehti → liike-yksityiskohtanäkymä

Status: OSITTAIN RATKAISTU (toteutuneet ovat saatavilla muualla, mutta
UX-puute jää: etusivun pitäisi vähintään selvästi merkitä "prescriptio"
vs "toteutunut" treenin jälkeen).

Mahdollinen tuleva handoff-suunta: etusivun post-workout view enhancement.

### OBS-004 · 2026-05-26 · etusivu + Asetukset · AVOIN

**Otsikon prosentti ei matchaa kuormiin**

- Otsikko: "Kyykky 4×4 @75%"
- Pääsarja: +157.5 kg
- Aritmetiikka: K=185 vahvistettu Asetuksista → 75 % × 185 = 138.75 kg
- Todellinen: 157.5 / 185 = 85.1 % × 185
- Resolveri laskee prescriptiosta väärän prosentin, otsikko näyttää eri

Liittyy: OBS-002 (sama slot-resolveri-juurisyy?).

### OBS-005 · 2026-05-26 · Liikkeet-näkymä sarjahistoria · AVOIN-VERIFIOIMATON

**e1RM-kaavan rekonstruktio — V × 1 liike-riippumaton**

Sovelluksen kaava: `e1RM = w × (1 + (reps + V × 1) / 30)` — Epley-tyyppinen,
V suoraan plussattuna reps:iin (kerroin V × 1).

Verifioitu sekä takakyykylle että lisäpainoleuanvedolle (sparringin
taulukko 12 sarjaesimerkkiä, kaikki match).

Inkonsistenssi-kohdat:

- Akselin Excel-calibrator (sparringin maininta, **EI Cowork-verifioitu**):
  `external_load = e1RM × (1 − (reps + V × 0.75) / 30) − BW` → V-kerroin
  0.75 vs sovelluksen 1.
- Aiempi muistio mainitsee "Epley-Vara / Brzycki / conservative"
  -kolmitasokaavan lisäpainoleuanvedolle — sparringin verifiointi:
  EI VASTAA sovellusta.

Vaikutus: prescriptio-paino jota sovellus ehdottaa voi olla systemaattisesti
eri kuin Akselin Excel-calibratorista odottaisi.

Status: AVOIN-VERIFIOIMATON koska Cowork ei voi vahvistaa Excel-calibratorin
sisältöä repon koodista. Sparringin verifiointi sovelluksen V × 1 -kaavasta
vahvistettu, mutta lähteen yhdenvertaisuus calibratorin kanssa vaatii
Akselilta lisätietoa.

### OBS-006 · 2026-05-26 · Liikkeet-näkymä sarjahistoria · AVOIN

**Lisäpainoleuanvedon e1RM näyttö = system load (ei lisäpaino-puhdas)**

- Sovellus näyttää e1RM = 181.3 kg
- Todellisuudessa: 181.3 = 89 BW + 92.3 lisäpaino-puhdas
- Käyttäjälle harhaanjohtava: voi tulkita "lisäpaino-e1RM = 181.3" (absurdi)
- Akselin kisa-PR: 94 kg lisäpainoa (lisäpaino-puhdas)
- Asetusten kalibrointi L = 85 kg (lisäpaino-puhdas)
- Asetukset (L=85) / sarjahistoria (system 181.3) / prescriptio — 3 eri
  referenssipistettä samassa liikkeessä

Liittyy: OBS-002, OBS-004 (yhteinen yksikkö-/referenssi-yhtenäisyys
juurisyy).

## Sparring-juurisyy-teesi (Cowork:n havainto 2026-05-27)

**TEESI:** OBS-002, OBS-004, OBS-005, OBS-006 voivat juontaa juurensa
samasta rakenteellisesta ongelmasta: slot-resolverin yksikkö- ja
referenssi-yhtenäisyys on rikki.

**Sparringin synteesi:**

- Asetukset: L=85 kg lisäpaino, K=185 kg tanko (eri yksiköt eri liikkeille)
- Sarjahistoria: paino-sarake lisäpainoleuanvedolle = lisäpaino (50 kg),
  e1RM = system load (181.3 kg) — eri yksiköt samassa rivissä
- Prescriptio: ehdottaa "+157.5 kg lisäpainoa" — mistä laskettu, ei selvää
- Calibrator (Excel, sparringin maininta): käyttää eri V-kerrointa kuin
  sovellus

**Pohjapuhtaus-arc:n vaikutus:** H-001/002/003 korjasi AI-syötteen
note-tason kohinaa (Option X: refScale + nominalLoadPct slot-metadata),
mutta EI runtime-resolverin laskentapolkua. OBS-002:n bug (käyttäjä näkee
157.5 kg back-off-arvona vaikka pitäisi olla < 150 kg) on todennäköisesti
edelleen voimassa post-arc.

**Suunniteltu jatkohandoff (H-007+):** slot-resolverin
yksikkö-/referenssi-yhtenäistys.

**Acceptance-kriteeri-luonnos:**

1. Back-off-kuorma < pääsarja-kuorma KAIKILLA back-off-osiollisilla
   liikkeillä, kaikissa skenaarioissa.
2. Otsikon @X% ja prescription-kuorman prosentti ovat yhteneväisiä
   K (tai L) -arvosta laskettuna.
3. Yksikkö-merkintä selvä eri näkymissä (asetukset, sarjahistoria,
   prescriptio): lisäpaino vs system load vs tangon kg erotettu
   käyttäjälle.

---

## OBS-003 — H-008-löydökset (kirjattu 2026-05-29, A2-suunta lukittu)

**Lähde:** H-008 A1/A2 -diagnostiikka (MU +82 kg -bugi). A2-juurisyy
(getStreetliftingPrimaryMovement ↔ engine getTodayPlan -eriparisuus)
korjattu commitissa `110a63d`. Seuraavat jäävät erillisiin handoffeihin.

**A1b — Paused squat +102 kg (P2 / H-009):**
ERI juuri kuin MU +82. Paused squat (LA-secondary) resolvoituu cross-ref
-reitillä: `loadPctReferenceMovementName="Takakyykky"`, suggestedLoadKg=102.5
(= näytetty +102 = seed-arvo). Akselin Takakyykky-e1RM ~177 kg → cross-ref
× loadPct (0.55–0.60) tuottaa ~102. EI primaryMovementId-mismatch (eri
mekanismi kuin A2). Tarkista: onko +102 oikea (seed) vai pitäisikö
cross-ref-laskenta tuottaa eri arvo. Vahvistettava Akselin atletti-
realismilla (102 kg paused squat 3×5 V3 vk5 — uskottava vai liian raskas?).
**EI korjattu H-008:ssa** (HANDOFF §3 scope-aita: eri juuri → P2/H-009).

**Q3 — Muut päivä-resoluution mismatchit (KATETTU A2:ssa):**
A1-dump paljasti että KAIKKI ei-eksakti-päivät kärsivät samasta
eriparisuudesta (esim. ke vk5: getSL→Takakyykky, rec→Lisäpainodippi).
A2-korjaus (getStreetliftingPrimaryMovement → getTodayPlan) kattaa kaikki
ei-eksakti-päivät, ei vain MU-päiviä → Q3 ratkaistu samalla korjauksella.
Ei jäljellä olevia päivä-resoluution mismatcheja.

**H-009 / P1 — Load-coherence -auditkanava (erillinen handoff):**
Koneellinen detektori bugiluokalle "ankkuroitu liike näyttää perittyä,
fyysisesti epäuskottavaa kuormaa" (target/seed-ratio, liiketyyppi+cfg-
ankkuroidut suhteelliset rajat, EI absoluuttinen nanny-clamp). H-008
korjasi A2-juuren; H-009 lisää koneellisen havaitsemisen joka olisi
napannut tämän bugin automaattisesti (pilot-sanity-varoitus "Muscle-up:
target 73.5 / seed 2.5 = 29.4×" oli jo signaali — formalisoi audit-flagiksi).
