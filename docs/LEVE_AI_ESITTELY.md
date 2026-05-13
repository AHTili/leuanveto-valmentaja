# LeVe AI — esittely vakavasti otettavasti harjoittelevalle

**Kenelle:** Kovan tason urheilijoille, jotka ohjelmoivat itse, ymmärtävät %1RM:n ja RPE:n eron ja tietävät, että muutaman viikon harhaus väärään autoregulaatioon maksaa kuukausia korjata.

---

## Lyhyt versio

LeVe AI on suomenkielinen, paikallisesti pyörivä progressive web app, joka korvaa staattisen treeniohjelman jatkuvasti adaptoituvalla valmentajalla. Engine lukee jokaisen sarjasi (kuorma, toistot, vara, halutessasi Enode/Vitruve-velocity) ja säätää seuraavan session tarjouksen tutkimuspohjaisilla säännöillä — kuitenkin niin, että sinä päätät. Et koskaan jää mustan laatikon armoille: jokaisen kuormasuosituksen takana on suomeksi luettava päätösketju.

Sovellus ei tilaa rahaa. Ei pilveä. Ei sisäänkirjautumista. Tietosi pysyvät selaimesi paikallisessa tietokannassa, ja PWA toimii offline.

---

## Mitä se tekee eri tavalla kuin Excel + Boris Sheiko sheet

### 1. Adaptiivinen multi-suggestion -arkkitehtuuri

Jokaisen pääliikkeen ensimmäisen työsarjan kohdalla engine ehdottaa **1–3 vaihtoehtoa**:

- **Varovainen** — 1,5 % kevyempi kuin tavoite, yksi V-yksikkö enemmän varaa. Sopii, kun olet väsynyt mutta haluat kunnioittavan päivän.
- **Tavoite** — engine-suositus nykyisestä progressiosta. Tämä on backward-compat-ankkuri ja matemaattisen ketjun keskipiste.
- **Rohkea** — 1,5 % raskaampi, yksi V-yksikkö vähemmän varaa. Näkyy vain, kun konteksti tukee: palautuminen kunnossa, edellinen sessio meni hyvin, velocity-malli kalibroitunut.

Rohkea piilotetaan automaattisesti kun:
- Palautuminen kesken (HRV/velocity/vara-readiness antaa keltaista)
- Edellinen sessio meni failureen
- Engine on havainnut grindy-biasin Vx-raportoinnissa
- Velocity-malli ei ole vielä luotettava (n < 6 sessiota)
- Kevennysviikko tai speed-päivä

Valintasi tallentuu session-recordiin, ja engine **oppii sinusta**: kolme peräkkäistä rohkeaa onnistunutta sessiota nostaa default-biasta +0,15. Failure tai punainen palautumiscap pudottaa sitä –0,30. Et joudu manuaalisesti säätämään autoregulaatio-aggressiivisuutta — se kalibroituu valintahistoriastasi.

### 2. "Miksi tämä paino?" -paneeli

Klikkaamalla kortin alta saat suomeksi luettavan päätösketjun:

> 🚀 **Plan-based-aktivointi** — Edellinen sessio meni hyvin → 1RM-arvio nostettu 184,3 kg
> 📐 **Engine on oppinut sinusta** — Teet 3,5 % paremmin kuin engine alunperin arvioi
> 📊 **Vx-trendi-korjaus** — Viimeiset 6 sarjaa: keskimäärin V+0,8 → kuorma-säätö +2,1 %
> 💎 **Velocity-malli luotettava** — Henkilökohtainen velocity-malli kalibroitu (n=23)
> 🛡 **Velocity-loss-yläraja** — Sarjan sisäinen nopeuden pudotus-stop: 17,5 %

Ei tutkijaviittauksia UI:ssa. Päätökset näkyvät arkikielellä. Tutkimusperusta säilyy koodikommenteissa niitä, jotka haluavat tarkistaa.

### 3. Velocity-based training kokonaisuutena, ei kikkana

Kun yhdistät yhteensopivan velocity-mittarin (Enode, Vitruve, GymAware), engine rakentaa ajan kanssa **yksilöllisen RTF-mallin** (rep-to-failure × velocity), joka korvaa kirjasta poimitut VL-cap-arvot omilla luvuillasi. Ensimmäisinä viikkoina engine pysyy Pareja-Blanco 2017 -tutkimusarvoissa (foundation 30 %, strength 17,5 %, intensity 12,5 %, peaking 7,5 %), mutta noin 6 session jälkeen engine raportoi `RTF_MODEL_STATUS: reliable` ja siirtyy henkilökohtaiseen kaltevuuteen.

Kaksisuuntainen palaute tunnistaa neljä tilaa: alistimuloitu (rep 1 yli tavoitealueen + VL alle 50 % capista), optimi-sweet-spot, varovainen ja stop-suositus. Tämä on aitoa autoregulaatiota, ei %1RM-Excelin värittämistä.

### 4. Wizard joka kuuntelee — ja sanoo "ei"

31 kysymystä, 8 vaihetta. Mutta wizard ei tönäise sinulle ohjelmaa, jolle sinulla ei ole edellytyksiä. Jos klikkaat **Wendler 5/3/1**:tä ilman tankoa tai ilman 1RM-arviota neljälle kisaliikkeelle, suositus putoaa pohjille ja engine kertoo selkeästi miksi:

> "Wendler-TM-laskentaan tarvitaan vielä 1RM: Pystypunnerrus, Takakyykky"

Vamma-suodatus, kalusto-suodatus, kokemustaso-painotus, palautumiskapasiteetti, q23-volyymipreferenssi (MEV/MAV/MRV) — kaikki vaikuttavat 17 ohjelmointityylin keskinäiseen rankaukseen. Lopputulos on top-3 ehdotusta confidence-pisteytyksellä, ei yksi binäärinen "tässä on ohjelmasi".

Tuettuja ohjelmointityylejä: Wendler 5/3/1, Top-set + backoff, Madcow 5×5, Westside Conjugate, GZCL-jt20, Sheiko-derived, Minimalist RP, Smolov Jr, Coan–Phillipi, sekä multi-block-issurin (hypertrofia → strength → intensity → peaking), jonka pituus ankkuroituu antamaasi kisapäivään.

### 5. Korjattavissa olevia oletuksia, ei lukittuja päätöksiä

Wizard skippaa PR-vaiheen, jos sovellus tunnistaa, että aiempaa dataa on. Hyvä oletus — paitsi kun haluat päivittää. Skipped-näkymässä on **"Muokkaa silti"** -painike, joka avaa kysymykset ohittaen automatiikan. Sama logiikka koskee kaikkia skipIfMainAppHas-kysymyksiä.

Treenipäivät: voit valita itse, mitkä viikonpäivät treenaat (uusi q31_preferredDays), tai jättää tyhjäksi, jolloin engine jakaa tasaisesti palautumistarpeet huomioiden.

### 6. Pilot-todennus, ei pelkkä toive

Sovelluksessa on `tools/engine-pilot/`-harness, joka ajaa kahdeksaa erilaista atletti-profiilia (streetlifting-elite, voimanostaja-edistynyt, hypertrofia-naiselite, returner, cut-aggressive, beginner ym.) 148 simuloidun session läpi jokaisen koodimuutoksen jälkeen. Tämän hetken status on **0 virheflagia** koko regressio-matriisissa, ja keskeisimmät kuorma-arvot ovat **bittitarkasti identtiset** baseline-versionsa kanssa. Tämä on tutkijatason CI ennen kuin uusi versio menee laitteellesi.

Lisäksi 473 selain-tason yksikkötestiä, joista 32 viimeisintä keskittyvät juuri adaptiivisen multi-suggestion-logiikan ja autoregulaatio-rajojen tarkistukseen.

---

## Mitä se EI ole

- **Ei aloittelijan kädestä pitäjä.** Wizardin kysymykset olettavat, että ymmärrät, mitä RPE 8, VL-cap, deload-protokolla tai vara V2 tarkoittavat. UI tarjoaa selitykset, mutta lyhyesti.
- **Ei sosiaalinen alusta.** Et näe muiden treenejä etkä jaa omia. Tämä on tarkoituksellinen valinta.
- **Ei kosmeettinen sovellus.** Mobiilinäkymä on tiivis ja funktionaalinen; jos haluat lähinnä gym selfietä, on toisia työkaluja.

---

## Käytännön aloitus

1. Avaa sovellus selaimessa, lisää aloitusnäkymästä "Add to Home Screen" (PWA).
2. Aja wizard kerran — 5–10 minuuttia jos sinulla on 1RM:t valmiiksi tiedossa.
3. Aktivoi generoitu ohjelma. Engine kalibroituu 2–3 sessiossa.
4. Jätä halutessasi velocity-mittari paikalleen. Henkilökohtainen RTF-malli alkaa muodostua viikon sisällä.

Sovellus on tällä hetkellä rakentajansa harjoitustyökalu, joka on avautunut ystäväkäyttöön. Kehitys on jatkuvaa: jokainen palaute, jokainen edge case, jokainen yksittäinen "miksi engine teki näin?" päätyy joko korjauksena tai trace-explainer-rivien tarkennuksena seuraavaan versioon.

Jos olet kiinnostunut kokeilemaan, ota yhteyttä rakentajaan. Saat linkin ja muutaman lauseen kontekstin siitä missä vaiheessa kukin ominaisuus on. Sovellus on hyödyllinen jo nyt; mullistava se on niille, jotka käyttävät sitä useita kuukausia ja antavat enginen oppia heidät.

---

**Tutkimusperusta keskeisille säännöille:** Pareja-Blanco ym. 2017 (VL-cap-rangit), Sánchez-Moreno 2017 (rep1 MPV-targetit), Helms ym. 2018 (RPE/RIR-autoregulaatio + deload), Jukic ym. 2024 (RIR-V-malli, RTF-velocity-reliability), Latella ym. 2020 (powerlifting tier-progression), Issurin 2010 (block-periodisaation residual-päivät), Refalo ym. 2023 (failure-reaction). Tarkat numeroreferenssit löytyvät `docs/ENGINE_BULLETPROOF_AUDIT.md` -tiedoston osiosta 7.
