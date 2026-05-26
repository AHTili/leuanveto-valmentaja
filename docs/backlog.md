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

### OBS-001 · sparring-ledger · AVOIN · velocity-dataketju

[Sisältö täydennetään sparring-ledgeristä — Enode-dataketju, todennäköisesti
osa H-006-velocity-handoffin scope:a. Akseli täydentää Windows-natiivisti
kun on aikaa.]

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
