# Volyymimaamerkkien valvonta (MULL-2, #8)

**Status:** TOTEUTETTU-HEURISTIIKKA (volyymilandmark-konventio; MEV/MAV/MRV eivät ole yksittäisen RCT:n arvoja vaan annos-vaste-synteesiä — Schoenfeld-meta-analyysit + RP/Israetel-landmarkit; band-rajat design-päätös, ks. [[volyymi-mrv-kategoriakohtainen]] drift-riski)
**Koodiankkurit:** engine.js `analyzeVolumeLandmarks` (computeWeeklyMuscleVolume:n jälkeen), test-runner.js `test8cVolumeLandmarks`, index.html K4-1-volyymikortti (⚠/▲-rivit)

Lainalaisuus-aukko (asiantuntija-auditti 2026-07-06): K4-1 **laski** viikkovolyymin lihasryhmittäin (suora + epäsuora ×½) ja bandeitti sen (ylläpito <4 · matala <10 · kehittävä <20 · korkea >20), mutta **ei tulkinnut sitä tavoitteeseen nähden**. Eliittivalmentaja hallitsee annosvälin *aktiivisesti* — pitää kehityskohteet tehollisella alueella eikä anna palautuksen ylittyä. Akselin huomio #8 osui tähän: *"riittääkö hauis 2 sarjaa/vk leuanvedon kehittämiseen?"*

`analyzeVolumeLandmarks(mesocycle, weekNum)` → `{ under, over }` (advisory, EI cap):

- **ALI-annostus (`under`):** tavoitteen kannalta relevantti lihas kehittävän bandin alle. **Avainoivallus — relevantMuscles sisältää synergistit** (primaarin kategorian KAIKKI kohteet, suora *ja* epäsuora): hauis on leuanvedon epäsuora synergisti (`vertikaaliveto → [selkä 1, hauis 0.5]`), joten sen ali-annostus tunnistuu vaikkei se ole suora primaari. severity: `ylläpito`=strong (kasvua ei tapahdu), `matala`=soft (ylläpitävä, ei kehittävä).
- **YLI-annostus (`over`):** mikä tahansa lihas `korkea`-bandissa (>20 eff-sarjaa) = lähellä palautuskattoa (MRV) → suoritus/palautumisriski.

UI: K4-1-kortin loppuun ⚠ (ali) + ▲ (yli) -rivit, näkyvät vain kun on flagattavaa. Advisory — atletti päättää (valmentaja, ei nanny).

**Rajat/kehitys:** band-rajat (4/10/20) ovat design-päätös, eivät koneellisesti ratifioitu — sama drift-riski kuin [[volyymi-mrv-kategoriakohtainen]] ja [[volyymi-viikkovolyymi-lihasryhmittain]]. Tuleva syvätutkimus (Schoenfeld-annos-vaste + lajispesifit landmarkit) tarkentaisi. Riittää nyt *näkyvyyteen ja tulkintaan*, ei automaattiseen ohjelmamuutokseen.

**Linkit:** [[volyymi-viikkovolyymi-lihasryhmittain]], [[volyymi-mrv-kategoriakohtainen]], [[volyymi-weekly-stimulus]]
