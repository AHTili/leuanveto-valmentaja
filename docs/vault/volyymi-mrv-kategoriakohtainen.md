# MRV-katot kategoriakohtaisesti (toteutuneen volyymin seuranta)

**Status:** TOTEUTETTU-HEURISTIIKKA
**Lähteet:** Israetel, Hoffmann & Smith 2017 (RP-volyymilandmarkit MV/MEV/MAV/MRV; DOKUMENTOITU, ei peer-reviewed); Helms 2018 + Schoenfeld (konservatiivinen alaraja, data.js:93 koodikommentti)
**Koodiankkurit:** data.js:94 (`MRV_SETS_PER_CATEGORY`), index.html:10071 ja 10276–10285 (Trendit-näkymän MRV-viiva + "Yli MRV" -chip), index.html:9141 (Israetel 2017 -benchmark-alaviite), engine.js:7882 (Israetel-MRV-vertailu AI Block Tuning -aggregaateissa)

`MRV_SETS_PER_CATEGORY` (data.js:94–104) määrittelee kovien sarjojen viikkokaton per kategoria: vertikaaliveto 22, horisontaaliveto 20, core 20, vertikaalityöntö 18, alaraaja 18, horisontaalityöntö 16, muu 16, hauisfleksio 14, ojentajaekstensio 14. Arvot ovat koodikommentin mukaan "conservative Helms/Schoenfeld lower bound". Vetokategorioiden korkeimmat katot heijastavat streetlifting-painotusta.

**Käyttö on puhtaasti visuaalinen:** Trendit-näkymän volyymikaavio piirtää kategoriakohtaisen MRV-viivan, skaalaa palkit suhteessa siihen (index.html:10071–10074) ja näyttää "⚠ N yli MRV" -chipin kun viimeisimmän viikon toteuma ylittää katon (index.html:10282–10285). Mikään laskentapolku ei leikkaa kuormaa tai sarjoja MRV:n perusteella — sama valmentaja-ei-nanny-periaate kuin K4-1-volyymikortissa ([[volyymi-viikkovolyymi-lihasryhmittain]]).

**Kirjattu mutta toteuttamaton:** data.js:93 lupaa "user can override via settings.mrvOverrides" — `mrvOverrides`-avainta ei ole toteutettu missään (ainoa osuma on itse kommentti). Jos override toteutetaan, tämä nootti ja Trendit-render pitää päivittää samalla.

**Repo-sisäinen jännite:** index.html:9141 antaa benchmarkiksi "MEV 4–6 · MAV 10–20 · MRV 20+ sarjaa/lihasryhmä/vk (Israetel 2017)", kun taas wizardin MEV-floor käyttää arvoa 10 ja MRV-taulukon katot vaihtelevat 14–22. Erot selittyvät osin lihasryhmäkohtaisilla RP-landmarkeilla, mutta yhtenäistä numeroiden totuuslähdettä (audit-baselines-tyyliin) volyymilandmarkeille ei ole — drift-riski, joka kannattaa sulkea kun volyymiparametrit tulevat 8a-piiriin.

**AI Block Tuning -kytkentä:** blokkiaggregaatit sisältävät backfill-kirjatut sessiot nimenomaan siksi, että Israetel-MRV-vertailu vaatii todellisen toteutuneen volyymin (engine.js:7876–7883, `_computeTuningCoreAggregates`).

**8a-prior:** `learnedMrv[kategoria]` on kandidaatti: prior = `MRV_SETS_PER_CATEGORY`-taulukon arvo. Tutkimusrajoja (±2 SD -clampin min/max) EI ole määritelty repossa eikä `audit-baselines.mjs`:ssä — ne pitää ratifioida syvätutkimuskierroksella (RP-landmarkit eivät ole peer-reviewed, joten rajojen lähteeksi tarvitaan esim. Schoenfeldin annos-vaste-metat) ennen kuin parametri otetaan opittavaksi.

**Linkit:** [[volyymi-viikkovolyymi-lihasryhmittain]], [[volyymi-weekly-stimulus]]
