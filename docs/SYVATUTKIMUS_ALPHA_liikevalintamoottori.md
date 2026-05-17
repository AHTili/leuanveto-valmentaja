# Syvätutkimuskehote α — Liikevalintamoottori voimaharjoittelusovellukselle

> **Saate (älä kopioi tutkijalle):**
> Tämä kehote osuu vaiheen 8b aukkoihin (ks. `docs/VAIHE_8_AUDIT_JA_AUKOT.md` A2 + B-osiot).
> Konkreettiset täsmäkohteet: (1) liikepankin metatiedon laajennus, (2) algoritminen liikevalinta heikkokohta × vamma × kalusto × vaihe -dimensioissa, (3) 17 ohjelmointityylin eriyttäminen liikevalinnassa, (4) antagonisti-tasapaino. Kysymykset johdettu auditoiduista koodi-aukoista, eivät geneerisistä toiveista.
>
> Kopioi tutkijalle **vain alla oleva osio**, alkaen "═══" -rivistä.

═══════════════════════════════════════════════════════════════

# Syvätutkimuspyyntö — algoritminen liikevalintamoottori voimaharjoittelussa

## Konteksti tutkijalle

Olen kehittämässä suomenkielistä voimaharjoittelusovellusta (kohderyhmä: kokeneet voimanostajat, streetliftaajat, kovan tason atletit jotka ohjelmoivat itse). Sovelluksen liikepankissa on noin 60–105 liikettä, mutta nykyinen liikevalinta-algoritmi käyttää vain yksinkertaista lajidefault-listaa (3–4 pääliikettä per laji) + keyword-pohjaista vammasuodatusta + kalusto-poissulkua. Lopputulos on, että 75 %+ liikepankista jää käyttämättä ohjelmoinnissa, ja kaikki 17 ohjelmointityyliä (Wendler 5/3/1, GZCL, Westside Conjugate, Sheiko, Madcow 5×5, Smolov Jr, Coan–Phillipi, DUP, Block-periodisaatio jne.) jakavat saman primary-valinnan — vain weekDefs ja kuormaprosenttiketju eroavat.

Olen tunnistanut, että aidosti yksilöllinen liikevalinta vaatii liikkeen tietomallin laajennuksen ja algoritmisen valintaprosessin, joka tunnistaa atletin heikon kohdan, vammaprofiilin (sekä absoluuttisen että muokattavan), kokemustason, kaluston ja blokin vaiheen (foundation / strength / intensity / peaking). Tarvitsen syvällisen kirjallisuus- ja käytäntö-pohjaisen vastauksen siitä, miten alalla rakennetaan tällainen järjestelmä.

**Tarkoitus:** tutkimuksen tulos käännetään suoraan attribuuttiskeemaksi (lisätään `PRESET_MOVEMENTS`-tietomalliin) ja päätössääntö-taulukoksi (valintamoottorin sydän). En tarvitse koodia — tarvitsen päätös­tieteellisen runkon.

---

## Fabrikointi-tarkistus alkuun

Ennen kuin vastaat varsinaisiin kysymyksiin, listaa:

1. **Epävarmuudet ja oletukset**, joita teet tästä kontekstista (esim. "oletan että sovellus tukee suomalaisten kovan tason atleettien kohderyhmää, ei aloittelijoita").
2. **Tutkimusalueet, joilla vertaisarvioitu evidenssi on ohutta tai puuttuu kokonaan**. Ole rehellinen — älä keksi numeroita.
3. **Lähdetyypit, joihin nojaat** (vertaisarvioitu tutkimus / opettajaohjeet [Beardsley, Helms, Israetel, Schoenfeld, Jukic, RP, Juggernaut, GZCL, Stronger By Science] / kaupallinen sovellus-kirjallisuus / harvinaiset käytännön empiiriset käytännöt).

Jos epävarmuus on iso, sano se. **Älä keksi tarkkoja sääntöjä, lukuja tai liiketaggeja jos primaarilähteessä ei niitä ole.** Mieluummin "vertaisarvioitu evidenssi tästä erikseen taggauksesta: n=0; käytännön ohjeistus Israetel/Helms-kirjallisuudessa: kyllä mutta ei numeroitu" kuin keksitty numero.

---

## Päätutkimuskysymys

**Miten rakennetaan algoritminen liikevalintamoottori voimaharjoittelusovellukselle siten, että se valitsee kokeneen atletin (intermediate–elite) yksilölliseen ohjelmaan oikeat liikkeet huomioiden vaiheen (foundation/strength/intensity/peaking) × tavoitteen (max voima / hypertrofia / urheilu-specific) × heikon kohdan × vammahistorian × salikaluston, ja aktivoi rikkaan liikepankin sen sijaan että käyttäisi 3–4 lajidefault-liikettä?**

---

## Alakysymykset

### C1 — Liikkeen tietomalli: mitä attribuutteja per liike?

Mikä on alan paras käytäntö liikkeen metatiedon strukturoinnissa? Listaa konkreettiset attribuutit, joita oppikirjat ja edistyneet sovellukset (esim. *Stronger By Science*, *RP Hypertrophy*, *Juggernaut AI*, *Liftvault*, *BoostCamp* -tyyliset järjestelmät) ylläpitävät per liike. Erityisesti haluan tietää:

- **Heikkokohta-kohdistus**: miten *lockout / bottom / sticking point / off-the-floor / range-of-motion -sektori* taggataan per liike? Onko vakiintunutta taksonomiaa (esim. Westside-piireissä on "max-effort variation pool", joka tag-merkitään heikkokohdan mukaan)?
- **Stimulus-to-Fatigue Ratio (SFR)** per liike: **onko SFR operationalisoitu numeerisesti missään lähteessä, vai onko se kvalitatiivinen heuristiikka (Israetel: korkea/keski/matala)? Jos kvalitatiivinen, mikä on paras tapa diskretisoida se päätössäännöille keksimättä evidenssipohjaa jota ei ole?** Onko SFR per atletti vai per liike (esim. "barbell back squat: SFR=korkea, atleetista riippumaton" vs. "atletti-spesifi modifier")?
- **Velocity-arkkityyppi**: concentric-explosive (kuten dynamic-effort kyykyt) vs. controlled-eccentric (kuten tempo-bench) — käytetäänkö tätä ohjelmointityökaluissa?
- **Lihastasapaino-pari**: vaakavetoliike ↔ vaakatyöntöliike, vertikaaliveto ↔ vertikaalipunnerrus, polvi-dominantti ↔ lonkka-dominantti — mikä on minimi balance-taksonomia?
- **Vamma-contraindications**: olka-impingement, polvinivelongelmat, alaselkä, kyynärpää — taksonomia per kohde?
- **Kokemustaso-suositus**: aloittelija/intermediate/edistynyt/eliitti — onko jokaisella liikkeellä `min/max experience` -kenttä alan käytännössä?
- **Kalustovaatimukset**: minimi-taksonomia (`barbell_rack`, `pullup_bar`, `dip_station`, `cable_machine`, `dumbbells`, `rings`, `safety_squat_bar`, `trap_bar`, `chains/bands`, ...)?

Anna jokaiselle attribuutille **status** (VERIFIOITU/DOKUMENTOITU/EPÄVARMA) ja perustelu.

### C2 — Päätössäännöt: kuinka attribuutteja yhdistetään valinnaksi?

Kun liikkeillä on rikastettu metadata, mikä on alan paras käytäntö niiden yhdistämisessä valinnaksi? Erityisesti:

- **Vaihe → liikevalinta**: foundation-vaiheessa volyymisesti tehokas SFR-rikas liike vs. peaking-vaiheessa kisaspesifinen liike — onko vakiintunutta sääntöä? Mikä on Issurin-block-periodisaation kanoninen liikevalintaohjeistus?
- **Heikkokohta → liikevalinta**: jos atletti raportoi "off-the-floor maavedossa heikko", mikä on algoritmin valitsema accessory (Snatch-grip DL? Deficit DL? Block pull?). Onko Westside-tyylin "max-effort lift rotation" -käytännölle olemassa formaali kuvaus?
- **Vamma → liikevalinta**: jos olka-impingement on `modified` (ei absoluuttinen), mitä variaatioita normaalisti suositellaan (esim. neutral-grip bench, floor press, landmine press)? Onko vakiintunutta vamma → modifikaatio -karttaa?
- **Antagonisti-tasapaino**: jos primarit ovat penkki + kyykky + maave, miten antagonistit (penkkiveto, hip-thrust) lisätään automaattisesti? Onko volyymisymmetria-sääntöjä (esim. *Eric Cressey:n pull/push 2:1 -sääntö*)?

Anna konkreettisia päätös­sääntöjä taulukkomuodossa, jos lähteet sallivat. Merkitse epävarmuudet.

### C3 — Tyylieriytys: kuinka monta erillistä liikevalintapolkua tarvitaan?

**Mitkä 17 ohjelmointityylistä (Wendler 5/3/1, GZCL J&T 2.0, Westside Conjugate, Sheiko-derived, Madcow 5×5, Smolov Jr, Coan–Phillipi, DUP, multi-issurin, hypertrofia, maksimivoima, yhdistelmä, eksentrinen, siirtymä, palautuminen, top-set-backoff, RP Minimalist) vaativat aidosti eriytetyn liikevalintalogiikan, ja mitkä toimivat jaetulla pohjalla + eri kuormaprosenteilla?**

Esim. vaatiiko Westside-conjugate oman valintapolun (ME-rotaatio viikoittain, dynamic-effort kiintein liikkein), Smolov kyykkyfokusoidun frekvenssin — vs. Wendler / Madcow / yhdistelmä joille jaettu pohja riittää? Anna jokaiselle 17 tyylistä:

- **Eriytys-status**: VAATII OMAN VALINTAPOLUN / JAETTU POHJA RIITTÄÄ / EPÄVARMA
- Jos vaatii oman polun: mikä on sen erityislogiikan ydin (esim. "Westside: weak-point-attribute on viikon valinnan ohjain, ei staattinen lajidefault")?
- Lähde + status (VERIFIOITU/DOKUMENTOITU/EPÄVARMA)

**Tuotos: taksonomia joka kertoo montako eriytettyä valintapolkua `pickPrimaries()`:n tilalle tarvitaan** (esim. "3 polkua riittää: A=jaettu lajidefault [12 tyyliä], B=ME-rotation-pohja [Westside], C=kyykky-frekvenssi-pohja [Smolov + Coan-Phillipi]" tai muu johdettu rakenne).

### C4 — Olemassa olevat järjestelmät: mikä toimii, mikä jää jumiin?

Tutki olemassa olevia voimaharjoittelusovelluksia ja niiden liikevalintaa:

- *Juggernaut AI* (Chad Wesley Smith), *BoostCamp*, *Liftvault* (template-pohjainen), *Hevy AI*, *Strong AI*, *RP Hypertrophy App*, *AI Coach* -tyyppiset järjestelmät
- *TrueCoach*, *TrainHeroic* — valmentaja-vetoiset
- Open-source projektit: *Boostcamp*, *Stronger By Science*-Excel-pohjat

Mitkä niistä todella tekevät yksilöllistä liikevalintaa, ja missä ne jäävät jumiin? Onko alalla *negatiivinen löydös*: ei yhtäkään olemassa olevaa järjestelmää, joka käyttäisi heikkokohta-attribuutteja algoritmisesti?

### C5 — Realistisuusarvio

Onko vision "yksilölle oikeat liikkeet attribuuttipohjaisesti" realistinen tutkimusperustan valossa? Vai onko se:
1. **Realistinen ja tehtävissä** — vakiintuneet taksonomiat olemassa, vain insinöörityö puuttuu
2. **Osittain realistinen** — heikkokohta-taksonomia on heuristinen, ei evidenssipohjainen
3. **Yliampuva** — alan paras käytäntö on edelleen valmentaja-vetoinen, ei algoritminen

Tarkenna: mikä osa visiosta on **VERIFIOITU** alan käytännössä, mikä **DOKUMENTOITU** mutta heuristinen, ja mikä on **EPÄVARMA / puuttuvaa tutkimusta**.

### C6 — Koodausvalmis tuotos

Mappaa vastauksesi suoraan seuraavaan rakenteeseen (en tarvitse JS/TS-koodia, vaan **päätös­tieteellisen rungon**):

**a) Liikkeen attribuuttiskeema** — taulukko: `attribute` | `tyyppi` | `arvojoukko` | `lähde` | `status`. Esim.:

| Attribute | Tyyppi | Arvojoukko | Lähde | Status |
|---|---|---|---|---|
| `weakPointTargets` | array | `["lockout", "off_floor", "bottom_squat", "sticking_point_bench", ...]` | Westside ME-rotation -käytäntö | DOKUMENTOITU |
| `sfrTier` *(arvojoukko C1-vastauksen mukaan — älä keksi numerointia jos lähde antaa vain kvalitatiivisen heuristiikan)* | C1-vastauksen mukaan | C1-vastauksen mukaan | C1-vastauksen mukaan | C1-status |
| ... | | | | |

**b) Liikevalintamatriisi** — taulukko: `signaali` | `valinta-vaikutus` | `lähde` | `status`. Esim.:

| Signaali atletista | Valinta-vaikutus | Lähde | Status |
|---|---|---|---|
| `weakPoint = "lockout_bench"` AND `phase = "strength"` | Pri 1: Board press 3-board; Pri 2: Pin press; Pri 3: Floor press | Westside ME-rotation | DOKUMENTOITU |
| ... | | | |

**c) Negatiiviset löydökset** — eksplisiittisesti: mistä alueesta vertaisarvioitu evidenssi puuttuu, ja mikä on käytännön konsensus tästä aukosta huolimatta.

---

## Lähdetaulukko (täytä tutkimuksen loppuun)

| Lähde | Tyyppi | Päivä/vuosi | Tietokanta | Saatavuus | Luotettavuusarvio |
|---|---|---|---|---|---|
| Esim. Israetel et al. — *Scientific Principles of Hypertrophy Training* (2020) | Kirja, käytännön ohjeistus | 2020 | — | Maksullinen | Erittäin korkea käytäntö, kohtuullinen tutkimuspohja SFR-arvioille |
| ... | | | | | |

---

## Fabrikointi-tarkistus loppuun

Vahvista uudelleen:

1. **Mitkä väitteet ovat VERIFIOITUJA** (vertaisarvioitu tutkimus, sitaatti saatavilla)?
2. **Mitkä DOKUMENTOITUJA** (Israetel/Helms/Jukic ym. kirjat, blogit, käytännön ohjeistus)?
3. **Mitkä EPÄVARMOJA** (sinun heuristiseen päättelyysi perustuvat)?
4. **Mitä jäi pimentoon** — mihin alakysymykseen et löytänyt tyydyttävää vastausta?

Suuri kiitos rehellisestä, taulukkomaisesta, järjestelmäajatteluun perustuvasta vastauksesta. **Kieli: suomi.**

═══════════════════════════════════════════════════════════════
