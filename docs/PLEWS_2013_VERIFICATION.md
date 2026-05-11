# PLEWS_2013_VERIFICATION.md
## Plews 2013 −7% kynnys: verifikaatioraportti
**Päivämäärä:** 2026-05-11
**Tarkoitus:** Verifioida väite "Plews 2013: −7% baseline-kynnys Ln rMSSD → deload-triggeri"
**Lopputulos:** ❌ Väite EI OLE verifioitavissa primäärilähteistä. Korvattu SWC-pohjaisella muotoilulla.

═══════════════════════════════════════════════════════════════
PÄÄJOHTOPÄÄTÖS
═══════════════════════════════════════════════════════════════

"−7 % baseline-kynnys" Ln rMSSD:lle EI esiinny Plews 2013 Sports Med -paperissa
eikä missään muussa Plewsin tutkimusryhmän (Laursen, Buchheit, Stanley, Kilding)
HRV-paperissa. Attribuutio on virheellinen ja se on korjattava LeVe AI v4.37+
-spesifikaatiossa ennen Track B -implementaatiota.

Oikea Plews-konsensus käyttää SWC-pohjaista (0.5 × SD) poikkeamaa 7 päivän
liukuvasta Ln rMSSD -keskiarvosta, ei kiinteää prosenttikynnystä. Buchheit 2014
nimenomaan hylkää kiinteät %-kynnykset HRV-tulkinnassa.

═══════════════════════════════════════════════════════════════
A) PLEWS 2013 SPORTS MED KOKO TEKSTI
═══════════════════════════════════════════════════════════════

⚠ ABSTRAKTI- + REFERENSSILISTA-VERIFIOITU, ei avointa koko tekstiä.

- Springer paywall: https://link.springer.com/article/10.1007/s40279-013-0071-8
- Ei PMC-versiota
- ResearchGate ja Academia.edu palauttivat 403 koko PDF:lle
- Abstrakti, kuvatekstit, 67-kohtainen referenssilista ja menetelmäkatkelmat
  saatiin Springer-metadatasta, ResearchGate-snippeteistä ja Academia.edu-listauksesta
- Paperin sisältö varmistettiin ristiin ≥10 sitä siteeraavasta jatkopaperista
  (Buchheit 2014 Front Physiol; Plews 2014 IJSPP; Le Meur 2013 MSSE;
   Vesterinen 2016 MSSE; Javaloyes 2018/2019; Schmitt 2015)

═══════════════════════════════════════════════════════════════
B) −7 % KYNNYS PAPERISSA?
═══════════════════════════════════════════════════════════════

❌ **EI.**

Yhtään esiintymää sanoista "7 %", "−7 %", "seven percent" tai mitään kiinteää
prosenttikynnystä NFOR/deload-triggerinä ei löytynyt:
- Plews 2013 SM:n abstraktista
- Kuvateksteistä
- Retrievoiduista menetelmäkatkelmista

Sama nollatulos saatiin myös:
- Plews 2012 EJAP
- Plews 2013 IJSPP 8(6):688–91
- Plews 2014 IJSPP (×2)
- Buchheit 2014 Front Physiol
- Le Meur 2013 MSSE

Lähimmäs "7":ää tulee 7 päivän liukuva keskiarvo Ln rMSSD:lle — aikaikkuna,
ei prosenttikynnys.

═══════════════════════════════════════════════════════════════
C) PLEWS 2013 SM:N OMA HRV-TULKINTAKEHYS
═══════════════════════════════════════════════════════════════

Paperi suosittelee YHDISTELMÄMENETELMÄÄ, ei yhtä %-rajaa. Siteeraavien
papereiden mukaan kehys koostuu viidestä elementistä:

1. **7 päivän liukuva keskiarvo Ln rMSSD:stä** päivittäisen kohinan vaimentamiseksi
2. **SWC (Smallest Worthwhile Change)** Hopkins 2009:stä — Plews-ryhmässä
   tyypillisesti 0.5 × within-subject SD baselinesta, jolloin ±SWC:n ulkopuoliset
   muutokset tulkitaan merkityksellisiksi
3. **CV (coefficient of variation)** 7-päivän liukuvasta Ln rMSSD:stä —
   laskeva tai litistyvä CV-trendi ennen tapahtumaa tulkitaan NFOR-merkiksi
   ("variation in variability" -konsepti, Plews 2012 EJAP)
4. **Ln rMSSD : R–R -suhde** vagaalisen saturaation tunnistamiseksi eliiteillä,
   joilla HRV voi paradoksaalisesti laskea kuntonousun aikana
5. **Viikkokeskiarvot** (≥3 mittausta/vk) yksittäisten päivien sijaan

**Buchheit 2014 Front Physiol 5:73** (saman ryhmän rinnakkainen review)
toteaa, ettei kiinteille %-kynnyksille ole evidenssipohjaa ja että SWC:n
suuruus voi vaihdella treenivaiheen mukaan — eli **Plews/Buchheit-konsensus
eksplisiittisesti hylkää kiinteät prosenttikynnykset**.

═══════════════════════════════════════════════════════════════
D) MISTÄ −7 % TODENNÄKÖISESTI TULEE?
═══════════════════════════════════════════════════════════════

Todennäköisyysjärjestyksessä:

1. **Todennäköisin — misattribuutio tai engine-sisäinen heuristiikka**,
   joka on virheellisesti merkitty Plews 2013:een. Yksikään primäärilähde
   Plews/Buchheit/Stanley-ryhmästä ei käytä −7 %:a.

2. Mahdollinen sekaannus Vesterinen 2016 / Javaloyes 2018 HRV-guided training
   -paradigmaan, joka kuitenkin käyttää ±0.5 × SD tai "normaalialueen
   ulkopuoli", ei prosenttia.

3. Mahdollinen sekaannus HRV4Training / Marco Altini "normal range"
   -konseptiin (rullaava SD 60 vrk:lta), jossa ei myöskään ole −7 %.

4. Sekoittuminen Le Meur 2013 MSSE -paperin suorituskykymuutokseen
   "−9.0 % ± 2.1 %" (F-OR-induktion suorituskykyfall, ei HRV-kynnys).

5. Sekoittuminen blogi/markkinointimateriaalin "4–7 % parempi kestävyystulos"
   -lukuun (HRV-guided trainingin lopputulos, ei kynnys).

**Yhteenveto:** Mikään primäärilähde "Ln rMSSD −7 % alle baselinen → deload"
-väitteelle ei löytynyt.

═══════════════════════════════════════════════════════════════
E) SUOSITUS LEVE AI v4.37+ ENGINE-MAPPAUKSELLE
═══════════════════════════════════════════════════════════════

**Korvaa "−7 % baseline" Plews/Buchheit SWC-kehyksellä.**

Konkreettinen kynnys D10 HRV-readiness-flowiin:

**Primäärimetriikka:** 7 päivän liukuva keskiarvo Ln rMSSD:stä
(aamu, supine tai istuen, ≥3 mittausta/vk).

**Kynnys (deload-triggeri):** liukuva keskiarvo putoaa alle
`baseline − 0.5 × SD` (yksilön referenssijakson within-subject SD).
Tämä on SWC-konventio jota Vesterinen 2016 MSSE ja Javaloyes 2018
operationalisoivat suoraan Plews/Buchheit-kehyksestä.

**Sekundäärivahvistus:** samanaikainen CV:n lasku 7-päivän liukuvassa
Ln rMSSD:ssä (Plews 2012 EJAP) JA/TAI leposyke nousee.

**Sitaattiketju spesifikaatioon:**
- Hopkins WG et al. 2009, Med Sci Sports Exerc 41(1):3–13 — SWC-tilastollinen
  alkuperä [PDF-VERIFIOITU]
- Plews DJ et al. 2013, Sports Med 43(9):773–781 — HRV-spesifinen SWC +
  7-päivän rolling + CV -suositus [ABSTRAKTI/REFERENSSI-VERIFIOITU]
- Buchheit M. 2014, Front Physiol 5:73 — eksplisiittinen SWC-taulukko
  Ln rMSSD:lle [PDF-VERIFIOITU avoin frontiersin.org]
- Vesterinen V et al. 2016, Med Sci Sports Exerc — operationalisoitu kynnys
  mean ± 0.5 × SD päivittäiseen treeniohjaukseen

**Vältä sitaatiota muodossa:** "Plews 2013: −7 % baseline triggeröi deloadin"
— tämä on **fabrikoitu väite** suhteessa primäärilähteeseen ja olisi rikkonut
tutkimusintegriteettiä jos jätetty spesifikaatioon.

═══════════════════════════════════════════════════════════════
VAROITUKSET
═══════════════════════════════════════════════════════════════

SWC-kaavan sanatarkkaa muotoilua Plews 2013 SM:n sivuilta 773–781 ei
voitu sitata verbatim koska body-PDF:ää ei saatu avoimena. Älä siksi sitaa
spesifistä sivunumeroa tämän paperin sisältä — käytä joko sivuväliä
773–781 tai vahvista PDF myöhemmin.

Verbatim Springer-abstraktista (≤20 sanaa):
> "longitudinal HRV monitoring in elites is required to understand their
>  unique individual HRV fingerprint."

═══════════════════════════════════════════════════════════════
YHTEENVETO TRACK B -IMPLEMENTAATIOLLE
═══════════════════════════════════════════════════════════════

LeVe AI v4.37+ spesifikaatiossa oleva "−7 % baseline Ln rMSSD → deload"
-mappaus EI OLE verifioitavissa primäärilähteistä ja on korvattava
SWC-pohjaisella (−0.5 × SD) muotoilulla 7-päivän liukuvassa keskiarvossa,
sekundäärivahvistuksena CV-trendi ja leposyke.

Sitaatti Plews 2013 SM säilyy validina menetelmäkehyksen lähteenä,
mutta EI prosenttikynnyksen lähteenä.

═══════════════════════════════════════════════════════════════
INTEGROITU SEURAAVASTI
═══════════════════════════════════════════════════════════════

→ WIZARD_SPECIFICATION_v3.2.md (D10 mappaus korjattu SWC-pohjaiseksi)
→ v3.2 lisää 4 uutta lähdettä: Hopkins 2009, Buchheit 2014, Vesterinen
   2016, Le Meur 2013 (vertailuna)
→ Track B Vaihe 1A voi alkaa luottavasti — D10 lähde-pohja on nyt
   tieteellisesti pätevä
