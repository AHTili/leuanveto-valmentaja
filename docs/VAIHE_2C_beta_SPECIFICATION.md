# VAIHE_2C_beta_SPECIFICATION.md
## Track B Vaihe 2C-β — Session-fokus per päivä

**Versio:** v1.0 (2026-05-11)
**Status:** Spec + toteutus samassa committissa (pieni laajennus).
**Onnistumiskriteeri:** "Wizard-generoidun ohjelman päiväkortit Dashboardilla
näyttävät selkeitä fokus-etikettejä ('Pullup-fokus', 'Dippi-fokus',
'Kyykky-fokus') yleisten 'Perusvoima A' -etikettien sijaan. Käyttäjä
näkee yhdellä silmäyksellä mikä on päivän pääfokus."

═══════════════════════════════════════════════════════════════
📋 MUUTOKSET 2C-α → 2C-β
═══════════════════════════════════════════════════════════════

2C-α tuotti multi-blokki-mesocyclen jossa päämääräliikkeet jaetaan
viikon päiville (q24.daysPerWeek=4 + 4 päämääräliikettä → kukin saa
oman päivän). Mutta päiväkortin label säilyy skeleton:in alkuperäisenä
("Perusvoima A", "Maksimivoima", "Nopeusvoima").

2C-β lisää post-process-vaiheen joka muuntaa päivän label-tekstin
fokus-pohjaiseksi käyttäjäystävällisesti:
- Lisäpainoleuanveto-päivä → "Pullup-fokus"
- Lisäpainodippi-päivä → "Dippi-fokus"
- Takakyykky-päivä → "Kyykky-fokus"
- Muscle-up-päivä → "Muscle-up-fokus"
- jne.

Pää-app:n dayType (volume/heavy/speed) JÄLKILIITETÄÄN suluissa jotta
treenikorin sisältö ei muutu — vain käyttäjälle näkyvä otsikko.

═══════════════════════════════════════════════════════════════
0. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════

| # | Tehtävä | Sijainti |
|---|---------|----------|
| 1 | `applySessionFocusLabels(weekPlans)` post-process | wizard-2b-mapper.js |
| 2 | `_focusLabelForPrimary(primaryName)` mapping | wizard-2b-mapper.js |
| 3 | Kytkentä handleGenerateProgram:iin | index.html |
| 4 | _wizardMeta.rules-laajennus | wizard-2b-mapper.js |
| 5 | APP_VERSION 4.42.0 → 4.43.0 | sw.js |

EI vaadi engine.js:n eikä pää-app:n template-funktioiden muutoksia.
EI vaadi tutkimuspohjaa (ohjelmointi-käytäntö, ACSM 2009 priority-first
toteutuu jo distributePrimariesToDays:n kautta).

═══════════════════════════════════════════════════════════════
1. ALGORITMI — applySessionFocusLabels
═══════════════════════════════════════════════════════════════

```js
export function applySessionFocusLabels(weekPlans) {
  return weekPlans.map(wp => ({
    ...wp,
    days: wp.days.map(d => {
      // Hae primary-slot (cloneDayWithPrimary asetti substitutePrimarySlot:lla)
      const primarySlot = d.slots && d.slots.find(s => s.role === "primary" || s.role === "backoff");
      if (!primarySlot) return d;
      const primaryName = primarySlot.defaultMovementName;
      if (!primaryName) return d;
      const focusLabel = _focusLabelForPrimary(primaryName);
      // Jälkiliitä dayType selkeyttämään (esim. "Pullup-fokus (volyymi)")
      const typeSuffix = _dayTypeSuffix(d.dayType);
      return {
        ...d,
        label: typeSuffix ? `${focusLabel} (${typeSuffix})` : focusLabel,
        sessionFocus: primaryName, // metadata Dashboard:ille
      };
    }),
  }));
}

function _focusLabelForPrimary(name) {
  const n = String(name).toLowerCase();
  if (n.includes("lisäpainoleuanveto") || n.includes("muscle-up") && n.includes("leuk")) return "Pullup-fokus";
  if (n.includes("lisäpainodippi"))   return "Dippi-fokus";
  if (n.includes("muscle-up"))        return "Muscle-up-fokus";
  if (n.includes("takakyykky"))       return "Kyykky-fokus";
  if (n.includes("etukyykky"))        return "Etukyykky-fokus";
  if (n.includes("penkkipunnerrus"))  return "Penkki-fokus";
  if (n.includes("maastaveto"))       return "Maave-fokus";
  if (n.includes("pystypunnerrus"))   return "Pysty-fokus";
  if (n.includes("leuanveto"))        return "Pullup-fokus"; // bodyweight pullup
  // Fallback: käytä primary-nimeä lyhyemmin (esim. "X-fokus")
  return `${name}-fokus`;
}

function _dayTypeSuffix(dayType) {
  const map = { volume: "volyymi", heavy: "raskas", speed: "nopeus", intensity: "intensiteetti" };
  return map[dayType] || "";
}
```

═══════════════════════════════════════════════════════════════
2. KYTKENTÄ — handleGenerateProgram
═══════════════════════════════════════════════════════════════

Heti `generateCustomMesocycle` / `generateMultiBlockMesocycle` -kutsun
jälkeen lisätään:

```js
// Post-process: session-fokus-labelit
newMeso.weekPlans = applySessionFocusLabels(newMeso.weekPlans);
```

═══════════════════════════════════════════════════════════════
3. HYVÄKSYMISKRITEERIT
═══════════════════════════════════════════════════════════════

1. node --check OK
2. selfTestMapper 100 → ~108 testiä (8 uutta focus-label-testiä)
3. Akselin profiili + multi-blokki → Dashboard näyttää "Pullup-fokus (volyymi)"
   tms. eikä "Perusvoima A"
4. Single-blokki (2B-α-fallback) toimii samoin
5. dayType säilyy treenin sisällössä — vain label muuttuu
6. Pää-app:n engine.js + recommend toimii ennallaan
7. PROGRAM_BUILD_VERSION säilyy 4.38.9
8. APP_VERSION 4.42.0 → 4.43.0

═══════════════════════════════════════════════════════════════
4. KIELLETYT
═══════════════════════════════════════════════════════════════

1. Älä muokkaa pää-app:n skeleton-factoryja
2. Älä muokkaa dayType-kenttää (treenin sisällön logiikka)
3. Älä lisää tutkijaviittauksia UI-stringeihin
4. Älä bumppaa PROGRAM_BUILD_VERSION:ä
═══════════════════════════════════════════════════════════════
LOPPUSANAT
═══════════════════════════════════════════════════════════════

2C-β on kompakti viilaus jossa multi-blokki-meso saa kunnolla
nimetyt päiväkortit. Tämä on käyttäjäystävällisyyden lisäys ennen
2C-γ:n tutkimuspohjaista tier-progressiota.

Akseli näkee 14 vk:n mesocyclessa:
  Ma "Pullup-fokus (volyymi)" - Lisäpainoleuanveto primary
  Ke "Dippi-fokus (heavy)"     - Lisäpainodippi primary
  Pe "Kyykky-fokus (speed)"    - Takakyykky primary
  La "Muscle-up-fokus (volyymi)" - Muscle-up primary
