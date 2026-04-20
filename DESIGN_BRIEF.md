# LeVe Coach — Claude Design -brief

Dokumentti kehotteista, joilla voit suunnitella LeVe Coachin UI-uudistuksia Claude Designissä (claude.ai → Claude Design, research preview) rikkomatta tuotannossa olevaa sovellusta.

---

## Vahvistus: muuttuuko sovellus?

**Ei.** Claude Design on eristetty työpöytä. Se generoi mockuppeja ja prototyyppejä (HTML/CSS/React), jotka saat exportina. Main-haara ja tuotannossa oleva sovellus eivät liiku ennen kuin tuot exportin takaisin Claude Code -keskusteluun ja pyydät "sovella tämä".

---

## Vaihe 1 — Koodin vienti Claude Designille

Avaa claude.ai → Claude Design (Max-tilisi näkee tämän research preview -osiossa).

**Onboardingissa / project setup:**

- **Ensisijainen**: anna GitHub-URL
  `https://github.com/AHTili/leuanveto-valmentaja`
  (julkinen repo, Claude Design pystyy lukemaan)
- **Vara**: jos Claude Design ei tue suoraa linkkausta, lataa zip osoitteesta
  `https://github.com/AHTili/leuanveto-valmentaja/archive/refs/heads/main.zip`
  ja liitä/upload

**Kriittiset tiedostot** joita Claude Designin tulee lukea design-järjestelmän rakentamiseksi:

- `index.html` — sisältää kaikki näkymät, CSS-variablet (`:root`-lohko), komponenttiluokat (`.card`, `.chip`, `.kpi-box`, `.program-slot` ym.)
- `manifest.webmanifest` — värit, ikonit

Et tarvitse `data.js` / `engine.js` / `sw.js` — ne ovat logiikkaa, eivät UI:ta.

---

## Vaihe 2 — Pysyvä konteksti

Liitä tämä Claude Designin projektin kuvaukseen TAI ensimmäisenä viestinä jokaisessa uudessa chatissä. Pitää kaikki prototyypit samassa kielessä ja reunaehdoissa.

```
Konteksti: LeVe Coach on suomenkielinen streetlifting-valmennussovellus (PWA,
vanilla JS, ei framework). Käyttäjä on 15+ vuoden kokemuksella, elokuun 2026
kisa tavoitteena. Sovellusta käytetään puhelimella, salilla, hikisin sormin.

Olemassa oleva design-järjestelmä (pysy näissä):
- Dark mode aina (ei light mode -variaatioita)
- CSS-variablet: --bg, --fg, --muted, --acc, --border, --warn, --ok, --bad
- Komponenttiluokat: .card, .card-title, .chip (chip-green/yellow/red),
  .kpi-box, .kpi, .program-slot, .btn (btn-big/outline/full/sm),
  .accordion-header, .flex-between, .muted
- Ei emojeita UI-elementeissä paitsi domain-spesifeissä (💪 🏆 🌿 📊 🔄 ⭐)
- Suomenkieliset labelit
- Mobiili ensin: 390 px leveys oletus, iso fontti ja tapkohde

Tekniset reunaehdot:
- Ei uusia npm-riippuvuuksia — vain vanilla HTML/CSS + native JS
- Ei SVG-kirjastoja — inline SVG OK kaavioille
- Tulokset pitää voida liittää olemassa olevaan <script type="module"> -rakenteeseen
- State tulee IndexedDB:stä; prototyypit voivat käyttää mock-dataa mutta rakenteen
  pitää vastata todellisia entiteettejä: session, set, movement, readiness,
  mesocycle, recommendation

Kaikille prototyypeille:
- 390 px leveys, scrollattava pystysuunnassa
- Pysy CSS-variableissa ja komponenttiluokissa — älä keksi uusia värejä
- Vanilla HTML + <style>, ei Reactia
- Kommentoi vain ei-ilmeiset valinnat
```

---

## Vaihe 3 — Kolme prompt-komentoa priorisoidussa järjestyksessä

Käytä näitä **erillisinä chat-turineina** Claude Designissä (ei yhdessä viestissä) — saat kustakin oman iteroitavan prototyypin.

### Prompt 1 — Workout-näkymä (tärkein: käytetään eniten ja salilla)

```
Redesign active workout view. Nykyversio: index.html -> renderWorkout() /
hakusanalla "ACTIVE WORKOUT".

Käyttötilanne: käyttäjä salilla, tekee sarjan, kirjaa toistot + kuorma + Vx
(varatoistot 0–5). Hikiset sormet, iso fontti, nopea tap.

Kriittiset elementit joiden pitää olla näkyvissä:
- Nykyinen liike (iso nimi, slot-funktio pienenä, ⓘ-info-nappi)
- Sarja N/M (missä sarjassa ollaan)
- Tavoitekuorma (iso, keltainen/vihreä indikaattori)
- Tavoite-toistot ja tavoite-Vx
- Edellinen sarja vertailuksi (pieni muted-teksti)
- Syöttö: actualReps, actualLoad, actualVx (ei HRV-tyyppisiä, vain numeronäppäimistö)
- Seuraava-nappi (ISO, peukalonmittainen alareunassa)
- Lepotaimeri (countdown, automaattinen sarjan jälkeen)

Pyyntö: 3 variaatiota:
a) Minimal — vain se mitä juuri nyt tarvitaan, ei mitään muuta
b) Data-dense — näkyy myös koko päivän ohjelma + progress
c) Focus-mode — suurin mahdollinen kontrasti ja fonttikoko salikäyttöön

Säilytä olemassa olevat CSS-variablet ja .card / .chip / .btn -luokat.
```

### Prompt 2 — Progress-visualisointi (suurin visuaalinen lisäarvo nykyiseen)

```
Luo uusi "Edistyminen"-näkymä. Nykyversio on pelkää lukulistauksia — halutaan
näyttää trendit visuaalisesti ilman kirjastoja (inline SVG).

Dataelementit:
- e1RM per kisaliike (Lisäpainoleuanveto, Muscle-up, Lisäpainodippi, Takakyykky)
  → 16 viikon aikasarja, sparkline tai viivakaavio
- Viikkovolyymi (hard sets) per kategoria (vertikaaliveto, horisontaaliveto,
  polvidominantti, lonkkadominantti, rinta, hartiat, ojentajat, hauis, core)
  → stack-palkit viikoittain, MRV-viiva päällä (esim. selkä MRV=22)
- Readiness-trendi (HRV + velocity) 14 päivää → pieni trendikortti
- Kehonpainon muutos → sparkline

Layout:
- Kortti per kisaliike, sisällä sparkline + nykyinen e1RM + viimeisin delta
- Yksi leveä kortti viikkovolyymille (stack + MRV-viiva)
- Pienet KPI-kortit ylhäällä: PR viimeiset 7pv, streak-päivät, kokonaistonnage

Inline SVG, ei Chart.js. Korkeintaan 200 px korkeus per kaavio. Tummat taustat,
--acc sinisenä viivana, --ok vihreä PR:lle, --warn keltainen MRV:lle, --bad
punainen jos yli MRV.
```

### Prompt 3 — Dashboard-hierarkia

```
Redesign dashboard view. Nykyversio: renderDashboard().

Ongelma: liian monta korttia allekkain, tärkein (päivän ohjelma) ei erotu
visuaalisesti. Tila-indikaattorit (readiness, kevennysviikko, mesosyklin vaihe)
ovat hajallaan.

Tavoite: yksi fokuspiste — "mitä teen tänään" — ja sen ympärille kevyt konteksti.

Pysyvät elementit jotka pitää mahtua:
1. Päivän ohjelma (iso focal point, lämmittely + pääliikkeet + tukiliikkeet,
   kunkin liikkeen kohdalla icon, nimi, sarjat×toistot, kuorma, ⓘ-info)
2. "ALOITA TREENI" -primary action
3. Readiness-statustila (GREEN/YELLOW/RED + pieni selitys)
4. Mesosyklin tila: Vk N/16, faasi (Foundation/Strength/Intensity/Peaking),
   mahdollinen kevennysviikko-indikaattori
5. Kevennysviikko-nappi ("Korvaa ensi viikko kevennyksellä")
6. Readiness-syöttönappi
7. Viikon stimulus (KPI-rivi: vetosarjat, heavy altistukset, tonnage)
8. Tulevat treenit (5 seuraavaa) — voi olla collapsible
9. "Miksi tämä suositus?" — collapsible decision trace

Pyyntö: yksi puhdas versio + yksi "information-dense desktop companion" -versio
tablet/desktop-käyttöön.

Hierarkia: päivän ohjelma > start-nappi > readiness-tila > loput sivutuotteina.
```

---

## Vaihe 4 — Exporttien tuonti takaisin

Kun olet iteroinut prototyypin Claude Designissä valmiiksi:

1. **Export** Claude Designistä (HTML + CSS)
2. **Liitä se Claude Code -chattiin** (täällä) viestillä kuten:
   > "Tässä uusi workout-view Claude Designistä, arvioi ja sovella"
3. **Toimenpiteet tässä chatissä**:
   - Luodaan `design-v5` -haara (main pysyy koskemattomana)
   - Sovelletaan inkrementaalisesti — 1 näkymä per commit
   - Testataan preview-serverillä ennen mergeä
   - Voit vertailla vanhaa ja uutta rinnakkain ennen kuin mitään menee tuotantoon

## Priorisointi

1. **Workout-näkymä** — eniten UX-hyötyä, käytetään jokaisella salikäynnillä
2. **Progress-visualisointi** — suurin visuaalinen lisäarvo nykyiseen
3. **Dashboard-hierarkia** — kosmeettinen parannus

Aloita Prompt 1:stä ja etene järjestyksessä — jokaista voi iteroida erikseen claude.ai:ssa ilman että muut ovat valmiit.
