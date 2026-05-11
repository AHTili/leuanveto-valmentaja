# WIZARD_OPEN_QUESTIONS.md
## Wizard 3.2:n puuttuvat kysymykset kokeneen urheilijan ohjelman laadintaan

**Versio:** 1.0 (2026-05-11)
**Status:** Avoin tehtäväkortti Vaihe 2 / Wizard 3.3 -spesifikaatiolle
**Lähde:** Track B Vaihe 1B -implementoinnin yhteydessä havaitut puutteet

═══════════════════════════════════════════════════════════════
TAUSTA
═══════════════════════════════════════════════════════════════

Wizard 3.2:n 25 kysymystä toteutettiin 1B:ssä spesifikaation mukaisesti.
Spesifikaatio on tieteellisesti pätevä (Plews 2013 -verifikaatio integroitu,
SWC-pohjainen D10), MUTTA kysymyspuu ei kerää kaikkea tietoa jota
kokeneen urheilijan ohjelman auto-suunnittelu (Vaihe 2) tarvitsee.

Tämä dokumentti ei muuta 1B:n koodia. Se palvelee:
1. Vaihe 2:n auto-suunnittelua — mistä puuttuva data luetaan
2. Wizard 3.3 -spesifikaatio-iteraatiota — mitä kysymyksiä lisätään

═══════════════════════════════════════════════════════════════
PUUTTUVAT KYSYMYKSET (5 kohtaa)
═══════════════════════════════════════════════════════════════

### 1. PR:t per liike (1RM / e1RM)

**Mikä puuttuu:** wizard ei kysy päämittojen absoluuttisia painoja
(esim. lisäpaino-leuka 85 kg, dippi 95 kg, takakyykky 185 kg).

**Vaikutus Vaihe 2:lle:** ilman PR:itä ohjelma-generaattori ei tiedä
mihin kuormaprosenttiin laskea sarjat. %1RM-pohjaiset ohjelmat eivät
toimi tyhjästä.

**Polku 1 (Vaihe 2:n auto-suunnittelu):** lue pää-sovelluksen
`movements` + `movementProgress` -storeista. Olemassaolevat baselinet
syntyvät cal-sessiosta. Jos atletilla on cal-data, käytä sitä.

**Polku 2 (Wizard 3.3):** lisää q26_personalRecords-komposiitti per
päämitta (lisäpaino-leuka, dippi, takakyykky, penkki, maave). Tämä on
"uusi käyttäjä" -fallback joille ei ole vielä cal-dataa.

### 2. Kisapäivä / peaking-takaraja

**Mikä puuttuu:** streetlifting-/voimanostoatleetille kriittinen — milloin
kisat tai testauspäivä.

**Vaikutus Vaihe 2:lle:** ilman takarajaa periodisointi käyttää vakio-
4-viikkoblokkeja eikä ankkuroi peakingia kisapäivään. Streetlifting_16w
-meso tämän atletin kohdalla ankkuroitiin manuaalisesti.

**Polku (Wizard 3.3):** lisää q27_targetDate (date-kenttä) + q28_targetType
(radio: kilpailu / max-testaus / peaking-blokki / ei deadlinea).

### 3. Treenipäivät (viikon päivinä)

**Mikä puuttuu:** q24_frequency kysyy `daysPerWeek` + `sessionLengthMinutes`,
mutta ei _mitä päiviä_ (ma/ti/ke/to/pe/la/su).

**Vaikutus Vaihe 2:lle:** kalenteri-näkymä menee oletukseen (esim.
ma-ke-pe-la 4-päiväiselle), eikä huomioi atletin todellista aikataulua.

**Polku (Wizard 3.3):** laajenna q24_frequency:n composite-kenttiä
checkbox-listalla `preferredDays: ["mon", "tue", "wed", ...]`.

### 4. Aiempi ohjelma / blokki-tila

**Mikä puuttuu:** ei kysytä mistä blokista atletti tulee. Jos atletti
juuri päätti 4 vk peaking-blokin, uusi ohjelma ei saisi aloittaa toisella
peakingilla.

**Vaikutus Vaihe 2:lle:** auto-suunnittelu voi käyttää oletusta
"aloita foundation:lla" mutta tämä ei sovi kaikille.

**Polku 1 (Vaihe 2:n auto-suunnittelu):** lue pää-sovelluksen
`mesocycles` + `protocols` -storeista. Edellisen meson viimeinen
blokki on aiempi tila.

**Polku 2 (Wizard 3.3):** lisää q29_recentBlock (radio:
hypertrofia/voima/intensifikaatio/peak/deload/ei tiedossa).

### 5. Energiansaanti tarkemmin

**Mikä puuttuu:** q14_cutting on vain yes/no. Ei kalori-budjettia,
proteiinitavoitetta, eikä massabuilding-tilaa.

**Vaikutus Vaihe 2:lle:** volyymi/intensiteetti-säätö cut-tilassa on
karkea — joko "cut-tila aktiivinen" tai "ei cuttia". Aggressiivinen
deficit (>500 kcal) vaatii enemmän volyymileikkausta kuin lieviä.

**Polku (Wizard 3.3):** korvaa q14_cutting kolmiosaisella:
- q14a_energyState (radio: deficit / maintenance / surplus)
- q14b_deficitSize (number, jos deficit valittu)
- q14c_proteinTarget (number, g/kg)

═══════════════════════════════════════════════════════════════
KÄYTÄNTÖ TÄMÄN ATLETIN (Akseli) KOHDALLA
═══════════════════════════════════════════════════════════════

Sinun cfg-arvot ja meso-tila ovat pää-sovelluksen storessa:
- Lisäpaino-leuka 85, dippi 95, takakyykky 185 (Asetuksista)
- streetlifting_16w vk 3/16 (Mesocycle-store)
- Cal-sessio + velocity-data + readiness-historia (Sessions-store)

Vaihe 2:n auto-suunnittelu voi lukea kaiken yllä mainitun **suoraan pää-
sovelluksen storeista**, ohittaen wizardin "uusi käyttäjä" -kysymyksiä.
Käytännössä wizard on tarpeen vain ensimmäistä kertaa LeVe:tä käyttäville,
ja heille Polku 2 -lisäykset (Wizard 3.3) ovat parempi UX kuin pakottaa
heidät tekemään ensin cal-sessio sokkona.

═══════════════════════════════════════════════════════════════
PRIORITEETTI
═══════════════════════════════════════════════════════════════

Vaihe 2 (auto-suunnittelu) voi käynnistyä ilman näitä lisäkysymyksiä
JOS se lukee pää-sovelluksen dataa. Wizard 3.3 -spesifikaatio voidaan
jatkaa rinnan Vaihe 2:n kanssa — ei estävä riippuvuus.

Korkein prioriteetti (jos Wizard 3.3 tehdään):
1. Kisapäivä (kriittinen periodisoinnin kannalta)
2. PR:t per liike (kriittinen uusille käyttäjille)
3. Aiempi ohjelma / blokki-tila (vaikuttaa aloituspaikkaan)

Matala prioriteetti:
4. Treenipäivät (oletus toimii useimmille)
5. Energiansaanti tarkemmin (yes/no riittää useimmille käyttötarpeille)
