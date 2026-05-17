# Syvätutkimuskehote β — Adaptiivinen oppimismalli voimaharjoittelusovellukselle

> **Saate (älä kopioi tutkijalle):**
> Tämä kehote osuu vaiheen 8a aukkoihin (ks. `docs/VAIHE_8_AUDIT_JA_AUKOT.md` A1 + B-osiot).
> Konkreettiset täsmäkohteet: (1) engine on tällä hetkellä sääntöpohjainen + tilastollinen, ei aidosti oppiva — 5/6 säätökanavalla on hardcoded-kynnykset (esim. varaTrend ±3,5 %, CFG_DRIFT +1 %/sessio), (2) `mvReps[]`/HRV-trendit kerätään mutta ei käytetä parametrioppimiseen, (3) ainoa pysyvä oppimistila on `aggressivenessLearned` (1 skalaari, streak-flag, vaikuttaa vain default-tier-valintaan ei kuormaan), (4) epävarmuuden ilmaisu rajoittuu yhteen kanavaan (`RTF_MODEL_STATUS`).
>
> Kopioi tutkijalle **vain alla oleva osio**, alkaen "═══" -rivistä.

═══════════════════════════════════════════════════════════════

# Syvätutkimuspyyntö — yhden käyttäjän adaptiivinen oppimismalli pienen N:n + viiveellisen palautteen reunaehdoissa

## Konteksti tutkijalle

Olen kehittämässä voimaharjoittelusovellusta (kohderyhmä: kokeneet voimanostajat, streetliftaajat, kovan tason atletit jotka ohjelmoivat itse — yksi käyttäjä, ei populaatio). Sovelluksen autoregulaatio-engine on tällä hetkellä **sääntöpohjainen + tilastollinen hybridi**, ei aidosti oppiva. Tämä tarkoittaa:

- Engine kerää joka sarjasta: kuorma, toistot, vara (RIR-ekvivalentti V0–V5), liike-velocity per toisto (jos mittari kytketty: Enode/Vitruve), session-tason HRV (Oura/Garmin/Whoop), kehonpaino-trendi.
- Engine säätää seuraavan session kuormaa kuudella kanavalla, joiden **kaikki kynnysarvot ovat hardcoded-vakioita** koodissa (esim. "varaTrend: jos viim. 6 sarjan Vx-overshoot ≥ +1, lisää 3,5 % kuormaan"; "CFG_DRIFT: 3 perfect-sessiota peräkkäin → +1 %/sessio TM:lle"; "readiness-cap: HRV z-score ≤ -1,0 → punainen, ei progressiota").
- Ainoa pysyvä **oppimistila** on `aggressivenessLearned ∈ [-1, +1]` -skalaari, joka päivittyy viim. 3 session valintastreikin (SAFE/TARGET/AGGRESSIVE) perusteella. Tämä on streak-laskuri, ei mallin parametri.
- `mvReps[]`-arrayt (rep-by-rep velocity-data) kerätään, mutta käytetään vain RTF-mallin (rep-to-failure × velocity) lineaarisen regression r²-arvioon — eivät ohjaa kuormamallinnusta.

**Vision** (mihin tutkimusta haetaan): engine oppisi yhden käyttäjän velocity-, HRV-, RPE/vara- ja suorituspalautteesta yksilön omat optimi-parametrit — esim. henkilökohtainen "vara-bias" (kuinka paljon atletti yliarvioi varansa V-asteikolla), "fatiikkimuisti-decay" (kuinka pitkä jälkivaikutus raskaalla sessiolla on hänen tapauksessaan), "optimaali VL-cap" (paljonko velocity-loss-prosenttia ylittäen tämä atletti väsähtää eri tavalla kuin Pareja-Blanco 2017 -populaatio antaisi olettaa).

**Reunaehdot, jotka tekevät tehtävästä vaikean:**

1. **Pieni N**: yhden käyttäjän data, n ≈ 100–500 sarjaa ennen kuin ensimmäinen "vahva" oppimishetki olisi mielekäs.
2. **Viiveellinen palaute**: yhden session vaikutus näkyy 2–4 sessiota myöhemmin (fatiikkikertymä). Suorituspalaute ei ole "1 toiminta → 1 reaktio" vaan "1 toiminta × kumulatiivinen tila → reaktio 3–7 päivän viiveellä".
3. **Kohinainen palaute**: unen laatu, työstressi, ravinto vaikuttavat — engine ei kaikkea näe.
4. **Tutkimusperustan velvoitteet**: engine ei saa lähteä keksimään uusia kynnyksiä kontrolloimattomasti. Pitää säilyttää tutkimuspohjaiset rajat (esim. Pareja-Blanco VL-cap-rangit) **prioreina**, mutta oppia näiden sisällä yksilöllisiä optimi-arvoja.

**Tarkoitus:** tutkimuksen tulos käännetään suoraan mallinnusarkkitehtuuriksi (mikä malli, mitkä parametrit, mikä optimointialgoritmi) ja persistointi-suunnitelmaksi (mitkä parametrit IDB:hen).

---

## Fabrikointi-tarkistus alkuun

Ennen kuin vastaat varsinaisiin kysymyksiin, listaa:

1. **Epävarmuudet ja oletukset** kontekstista (esim. "oletan että sovellus toimii selaimessa eikä voi ajaa raskasta optimointia; oletan että käyttäjä ei tee data-labeling-työtä").
2. **Tutkimusalueet, joilla vertaisarvioitu evidenssi on ohutta tai puuttuu**:
   - Onko vertaisarvioituja tutkimuksia n=1 -tason adaptiivisesta voimaharjoittelu-mallinnuksesta?
   - Onko alalla esimerkkejä, joissa Bayesilainen päivitys / Kalman-filteröinti / online-learning on viety tuotantotasolle voimavalmennuksessa?
3. **Lähdetyypit, joihin nojaat**: vertaisarvioitu (sports science / online learning -kirjallisuus) / urheilututkimus-konsultaatiot / kaupallinen sovellus-kirjallisuus / ML-alan referenssit (Bayesian optimization, contextual bandits, hierarchical models).

**Älä keksi mallinnusarkkitehtuuria, jos sitä ei ole vertaisarvioidulla tasolla julkaistu n=1 + delayed feedback -reunaehdoissa.** Mieluummin "ei vertaisarvioitua n=1-voimavalmennus-mallinnusta; lähimpänä Bayesilainen optimointi muista pienen N:n optimointitehtävistä" kuin keksitty optimaalinen arkkitehtuuri.

---

## Päätutkimuskysymys

**Mikä mallinnusarkkitehtuuri sopii yhden voima-atletin (n ≈ 100–500 sarjaa) data­strömin (vara, velocity, HRV, suorituspalaute) hyödyntämiseen siten, että engine voi oppia hänen henkilökohtaisia parametrejaan (vara-bias, fatiikkimuisti-decay, optimaali VL-cap, palautumis-aikavakio) ilman että se ajautuu pois tutkimuspohjaisista turvarajoista ja siten että se ilmaisee epävarmuutensa kalibroidusti? Onko vision "sovellus kehittää itse itseään paremmaksi ohjelmoijaksi" -taso aidosti realistinen pienen N:n ja viiveellisen palautteen reunaehdoissa?**

---

## Alakysymykset

### C1 — Mallinnusarkkitehtuuri-vaihtoehdot

Mitkä mallinnusperheet sopivat n=1 + delayed feedback -ongelmaan voimaharjoittelussa? Arvioi:

- **Bayesilainen päivitys / hierarkkinen Bayes**: priorina populaatio-tutkimusarvot (esim. Pareja-Blanco VL-cap-rangit), posterior päivittyy joka session jälkeen. Konjugaattisuus vai MCMC? Riittääkö 100–500 datapistettä mielekkääseen posteriorin terävöitymiseen?
- **Kalman-filteröinti** (state-space): "todellinen 1RM" / "todellinen vara-bias" piilevänä tilana, observaatiot kohinaisia. Mikä on dynamiikka-yhtälö fatiikkikertymälle?
- **Online learning / SGD**: yksinkertaisin, mutta voiko ajautua pois turvarajoista nopeasti?
- **Gaussian Process Regression**: pieni N + epävarmuuden kalibrointi luonnostaan. Mitkä kernel-valinnat?
- **Contextual bandits**: jos säätökanava = "armi", konteksti = atletin sen hetkinen tila. Onko relevanttia voimavalmennuksessa?
- **Reinforcement learning**: alueellisesti vaikea (delayed reward), todennäköisesti liian datanälkäinen n=1:lle. Vahvista tai kumoa.

Anna jokaiselle perheelle: **soveltuvuus** | **vahvuudet** | **heikkoudet n=1 + delayed feedback -kontekstissa** | **status** (VERIFIOITU/DOKUMENTOITU/EPÄVARMA).

### C2 — Parametrit jotka voidaan oppia, ja mitkä pitää lukita

Mitkä yksilölliset parametrit ovat aidosti opittavissa tämän datasetin koolla, ja mitkä pitää säilyttää tutkimuspriorina staattisena? Esim.:

| Parametri | Voidaanko oppia n ≈ 100? | n ≈ 500? | Lukittava tutkimusarvoon? |
|---|---|---|---|
| Vara-bias (V-asteikon yliarviointi) | ? | ? | ? |
| Fatiikkimuisti-decay (raskaan sessiosession jälkivaikutuksen aikavakio) — **edellyttää että C5 vahvistaa FFM:n tai vastaavan mallin voimasovellettavuuden vertaisarvioidusti; jos ei vahvistu, tämä parametri jää staattiseksi prioriksi eikä opittavaksi** | ? | ? | ? |
| Optimaali VL-cap (henkilökohtainen vs. Pareja-Blanco-populaation) | ? | ? | ? |
| Palautumis-aikavakio (sessio-väli optimaalisen palautumisen kannalta) | ? | ? | ? |
| Velocity-1RM-kaltevuus (henkilökohtainen vs. mediaani-malli) | ? | ? | ? |
| HRV-suhde suorituskykyyn (atletin henkilökohtainen z-score-vastefunktio) | ? | ? | ? |

Tarkenna: kuinka monta datapistettä per parametri tarvitaan mielekkääseen oppimiseen? Mikä on sample size -kynnys, jonka alapuolella priorin pitää voittaa data?

### C3 — Kalibroitu epävarmuus

Miten engine ilmaisee kalibroidun epävarmuuden parametrien arvoista atletille? Erityisesti:

- **Luottamusvälit**: 80 % / 95 % posterior-CI per parametri. Onko Bayesilainen vai bootstrap-pohjainen?
- **"Älä toimi vielä" -kynnys**: kuinka pieni epävarmuus pitää olla ennen kuin engine alkaa käyttää opittua arvoa? Mikä on alan paras käytäntö?
- **Käyttäjä-UX**: miten epävarmuus välitetään ei-teknisille kovan tason atleteille? (Esimerkki nykyisestä mekanismista: `RTF_MODEL_STATUS = "preview"` näkyy UI:ssa "Velocity-malli rakentuu" -tekstinä.)

### C4 — Turvarajat ja prioreiden ankkurointi

Miten engine pidetään tutkimuspohjaisten turvarajojen sisällä, vaikka se oppii?

- **Hierarkkinen Bayes** mahdollistaa populaatio-priorin → yksilön posteriorin. Esim. Pareja-Blanco 2017 -VL-cap-rangit foundation 25–35 %, strength 15–20 %. Atletin posterior voisi tarkentua välille 28–32 %, mutta ei karata ylä-/alarajan ulkopuolelle ilman vahvaa evidenssiä.
- **Constrained optimization**: parametriavaruus rajoitetaan a priori turvarajoihin. Onko realistinen vaihtoehto?
- **Sanity-clamping**: jos posterior karkaa esim. ±2 SD priorin ulkopuolelle, engine emittoi varoituksen ja pysyy priorissa. Mikä on alan käytäntö?

### C5 — Viiveellinen palaute ja fatiikkimuisti

Miten mallinnetaan vaikutus joka näkyy 2–4 session viiveellä? Tutkimuksessa puhutaan usein:

- **Banister-Fitness-Fatigue-malli** (FFM): kahden eksponentiaalisen kerroksen erotus (fitness − fatigue). Onko relevanttia voimaharjoittelussa, vai vain kestävyydessä?
- **State-space-malli viiveellisellä input:lla**: input vaikuttaa tilaan delay-funktion kautta.
- **Time-since-last-session-painotettu likelihood**: yksinkertaisin lähestymistapa.

Mikä näistä on alan käytäntö voimaharjoittelussa? Onko vertaisarvioituja FFM-implementaatioita voimavalmennukseen (ei vain kestävyyteen)?

### C6 — Persistointi-arkkitehtuuri

Käytännön implementaatio: jos parametrit opitaan, missä ne tallennetaan?

- **Käyttäjäkohtainen parametri-vektori IDB:hen** (esim. `settings.learnedParams = { varaBias: 0.3, fatigueDecay: 4.2, vlCapAdjustment: -2.5 }`)?
- **Posterior-distribuutiot vai pelkät pisteet**?
- **Versiointi**: jos mallinnusarkkitehtuuri päivittyy, miten vanha posterior-data migroituu?

### C7 — Realistisuusarvio (kriittinen)

**Onko vision "sovellus kehittää itse itseään paremmaksi ohjelmoijaksi" -taso aidosti realistinen pienen N:n + viiveellisen palautteen reunaehdoissa?**

Pyydän erityisesti rehellistä arviota:

1. **Realistinen ja tehtävissä**: mainstream sports science / ML -kirjallisuudessa on dokumentoitu n=1-ratkaisuja, jotka oppivat 2–4 parametria 100–500 datapisteestä. *Yliampuva* osa: ehkä 6+ parametrin yhtäaikainen optimointi.
2. **Osittain realistinen**: 1–2 parametria opittavissa (esim. vara-bias on yksinkertainen lineaarinen päivitys), mutta fatiikkidynamiikka jää staattiseksi prioriksi.
3. **Yliampuva**: pienen N:n + viiveellisen palautteen + kohinan + turvarajojen yhdistelmä tekee mallinnuksesta tilastollisesti epäluotettavaa. Alan paras käytäntö on edelleen sääntöpohjainen + valmentajan empiirinen säätö.

Mitä **pienin mielekäs ensimmäinen askel** voisi olla, joka ei ole "tee koko ML-systeemi" mutta ei myöskään "lisää uusi sääntö koodiin"? Esim. yksi Bayesilaisesti päivittyvä parametri kerrallaan, **MCP for one**?

---

## Koodausvalmis tuotos

Käännä vastauksesi seuraavaan rakenteeseen (en tarvitse koodia):

**a) Mallinnusarkkitehtuuri-suositus** — taulukko: `vaihe` | `malli` | `parametrit` | `data-vaatimus` | `lähde` | `status`. Esim.:

| Vaihe | Malli | Parametrit | Data-vaatimus | Lähde | Status |
|---|---|---|---|---|---|
| MVP (1–2 parametria) | Bayesilainen päivitys konjugaattipriorilla | vara-bias, velocity-1RM-slope | ≥ 50 sarjaa | — | DOKUMENTOITU |
| Vaihe 2 | Hierarkkinen Bayes + populaatio-priori | + optimal VL-cap | ≥ 200 sarjaa | — | EPÄVARMA |
| ... | | | | | |

**b) Päätös­säännöt** — taulukko: `tilanne` | `engine-toiminta` | `lähde` | `status`. Esim.:

| Tilanne | Engine-toiminta | Lähde | Status |
|---|---|---|---|
| n < 50 sarjaa | Käytä vain priori-arvoja; älä päivitä parametreja | — | DOKUMENTOITU |
| 80 % posterior-CI ulottuu priori-keskiarvon yli | Älä käytä opittua arvoa vielä | — | EPÄVARMA |
| ... | | | |

**c) Negatiiviset löydökset** — eksplisiittisesti: mihin alueeseen ei löydy vertaisarvioitua evidenssiä, ja mikä on alan käytännön kanta tästä aukosta huolimatta.

**d) Realistisuusarvio (1 kappale)** — rehellinen näkemys: onko visio toteutettavissa, ja mikä on järkevä ensimmäinen askel.

---

## Lähdetaulukko (täytä tutkimuksen loppuun)

| Lähde | Tyyppi | Päivä/vuosi | Tietokanta | Saatavuus | Luotettavuusarvio |
|---|---|---|---|---|---|
| Esim. Murphy *Probabilistic Machine Learning* (MIT 2022) | Kirja, Bayesilainen ML | 2022 | — | Avoin lukutila | Erittäin korkea |
| Esim. Banister 1980 / 1991 fitness-fatigue | Vertaisarvioitu, kestävyyspainotteinen | 1980/1991 | PubMed | Maksullinen | Korkea kestävyyteen, epävarma voimaan |
| ... | | | | | |

---

## Fabrikointi-tarkistus loppuun

Vahvista uudelleen:

1. **Mitkä väitteet ovat VERIFIOITUJA** (vertaisarvioitu tutkimus, primaarilähde saatavilla)?
2. **Mitkä DOKUMENTOITUJA** (alan kirjat, blogit, käytännön ohjeistus — Bompa, Schoenfeld, Israetel, Helms, Bondarchuk)?
3. **Mitkä EPÄVARMOJA** (sinun heuristiseen päättelyysi perustuvat ML-/sports-science -yleisestä kontekstista)?
4. **Mitä jäi pimentoon** — mihin alakysymykseen et löytänyt tyydyttävää vastausta?
5. **Realistisuusarvio**: oletko luottavainen vai epävarma siitä että visio on toteutettavissa annetun datan koolla?

Suuri kiitos rehellisestä, kriittisestä, taulukkomaisesta vastauksesta. Älä myönnä visioa todeksi, jos evidenssi ei tue sitä. **Kieli: suomi.**

═══════════════════════════════════════════════════════════════
