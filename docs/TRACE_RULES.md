# LeVe Coach — Decision Trace Rules

Jokainen `recommend()`-kutsun tuotos sisältää `traces[]`-taulukon: listan
sääntöjä jotka vaikuttivat lopputulokseen. Tämä dokumentti kertoo mitä
kukin `ruleId` tarkoittaa, mitä dataa se katsoo ja mistä tutkimuksesta se
on peräisin.

Käyttäjäpuolella decision trace on näkyvissä dashboardin "💡 Miksi tämä
suositus?" -collapsible-kortissa.

---

## Mesosyklin resoluutio

### `MESOCYCLE_CREATED`
**Laukaisu**: recommend() kutsutaan ilman aktiivista mesosykliä.
**Toiminta**: luo default-mesosyklin automaattisesti, tallentaa IDB:hen (paitsi dryRun-polussa).
**Evidenssi**: –

### `MESOCYCLE_NEW_CYCLE`
**Laukaisu**: nykyinen mesosykli on päättynyt (calendarWeek > effectiveWeekCount).
**Toiminta**: luo uuden default-mesosyklin. Vanhaa ei poisteta — säilyy historiana.
**Evidenssi**: Periodisointiteoria — rest week välissä syklien ennen uutta akkumulaatiota.

### `MESOCYCLE_BEFORE_START` (v4.22)
**Laukaisu**: pyyntö dateISO < mesocycle.startDateISO.
**Toiminta**: palauttaa `{ error: "before-start" }`. Kutsuja päättää mitä tehdä.
**Historia**: aiempi versio loi hiljaisesti default-mesosyklin, mikä teki treeni-sivulle eri datan kuin sykli-sivulle. Korjattu 2026-04-22.

---

## Kuormitus (primary)

### `LOAD_PCT_RESOLVED` (v4.22)
**Laukaisu**: slot.loadPct on asetettu JA atleetilla on e1RM-historiaa.
**Laskenta**: `targetLoad = currentE1RMExternal × loadPct`.
**Toiminta**: korvaa legacy-deltaPct-mekanismin. Kuormat ovat aina suhteessa NYKYISEEN 1RM:ään, eivät kuviteltuun tulevaisuuteen.
**Evidenssi**: Helms, González-Badillo — relatiivisen kuormituksen tutkimusnäyttö.

### `LOAD_PCT_SEED` (v4.22)
**Laukaisu**: slot.loadPct asetettu MUTTA e1RM-historia puuttuu.
**Toiminta**: käyttää slot.suggestedLoadKg:ta seed-arvona. Ensimmäinen sessio.

### `SUGGESTED_LOAD_FALLBACK`
**Laukaisu**: ei loadPct, ei e1RM-historiaa.
**Toiminta**: plan-tekijän antama absoluuttinen kuorma-ehdotus.

### `TARGET_LOAD`
**Laukaisu**: kuormalaskennan lopputulos (aina).
**Data**: `{ targetExternalLoad, deltaPct, targetReps, targetVx, isBarbell }`.

### `CAP_YELLOW`
**Laukaisu**: readiness.combined === "YELLOW".
**Toiminta**: deltaPct puolitetaan JA readinessLoadReduction (-3–5 %).
**Evidenssi**: 2/3 + velocity veto -päätösprotokolla.

---

## Vara-trendi

### `VARA_FEEDBACK`
**Laukaisu**: varaFeedback() palauttaa ehdotuksen.
**Tyypit**:
- `too_easy`: vara-overshoot ≥ 1.5 useamman sarjan yli → kuorma voisi nousta
- `too_hard`: vara-shortfall ≥ 1.5 → kuorma laskuun

### `VARA_CORR` (implicit)
**Laukaisu**: `varaTrendCorrection()` on osa deltaPct-laskentaa.
**Laskenta**: 4–6 viimeistä top-sarjaa, overshoot-keskiarvo → ±0.5–3.5 % kuormakorjaus.
**Evidenssi**: Helms RPE-based load adjustment.

### `GROSS_MISMATCH_CORR`
**Laukaisu**: 4+ session ylisuorittaminen ≥ 1.5 vara-luokkaa.
**Toiminta**: agressiivisempi kuormaloikka (+5 %, +6.5 %, +8 %).
**Tarkoitus**: nopea kalibrointi kun ohjelman kuorma on selvästi liian kevyt.

---

## Readiness-kanavat

### `READINESS_GREEN` / `READINESS_YELLOW` / `READINESS_RED`
**Laukaisu**: combineReadiness()-tulos per 2/3-sääntö + velocity-veto.
**Data**: `{ velocity, hrv, vara }`-kanavaluokitukset.

### `ACCESSORY_CAP_ACTIVE`
**Laukaisu**: 3/3 kanavaa RED/YELLOW.
**Toiminta**: accessory-sarjat -30 % volyymi.
**Tarkoitus**: CNS-suojelu todella huonoina päivinä.

### `ACCESSORY_BLOCK_SCALAR` (v4.25)
**Laukaisu**: streetlifting_16w-mesosykli JA weekNum > 4.
**Laskenta**: blokkipohjainen accessory-kerroin:
- Vk 1-4 (hypertrofia) → 1.00
- Vk 5-8 (voima) → 0.85
- Vk 9-12 (intensifikaatio) → 0.70
- Vk 13-16 (realization/taper) → 0.50
**Toiminta**: kertoo accessory-slottien sets-määrän blokki-kertoimella (min 1).
**Evidenssi**: Issurin 2010 (block periodization), Israetel 2017 (MEV/MAV/MRV taper).

### `FAILURE_LOCKOUT` (v4.25)
**Laukaisu**: edellisen primary-session jokin sarja actualVx === 0.
**Toiminta**: deltaPctRaw clampataan ≤ 0 — ei nosteta kuormaa.
**Tarkoitus**: atleetin tunnettu grinding-taipumus (aliarvioi Vx) → suoja.

### `VBT_E1RM_CROSSCHECK` (v4.25.1)
**Laukaisu**: LV-profiilissa ≥ 3 ankkuripistettä JA Vx-pohjainen e1RM on laskettu.
**Laskenta**: lineaarinen regressio (velocity vs. loadPct) ankkuripiste-seteistä → velocity-pohjainen 1RM-arvio. Verrataan Vx-pohjaiseen.
**Severity**: ALIGNED (<±3%), MODERATE (3-7%), SIGNIFICANT (>7%).
**Toiminta**: EI vaikuta kuormalaskentaan — diagnostiikka. Iso ero signaloi:
- Vx-raportti systemaattisesti biased (atleetin grind-taipumus) TAI
- Velocity-anturi kalibroimaton TAI
- LV-profiili rakentuu vielä (n < 5)
**Evidenssi**: González-Badillo & Sánchez-Medina 2010 — LV-relaatio lineaarinen 30-100% 1RM.

### `MU_AUTO_REGULATE` (v4.25)
**Laukaisu**: dayPlan sisältää Muscle-up-slotin jolla muAutoRegulate=true.
**Laskenta**: edellisen MU-session Vx-havainnoista (viim. 3 sarjaa):
- Kaikki Vx ≥ 3 → +2.5 kg
- Ka. Vx 2-3 → 0 kg (pidä)
- Ka. Vx 1-2 → -2.5 kg
- Min Vx === 0 → -5 kg (failure reset)
**Evidenssi**: MU:n bimodaalinen onnistuminen tekee e1RM:stä epäluotettavan; Vx-absoluuttikorjaus on luotettavampi. Helms RPE-based load adjustment adaptoituna skill-lift-kontekstiin.

---

## Accessory slot resolution

### `ACCESSORY_SWAP_AUTO`
**Laukaisu**: `checkStagnation()` havaitsee 3+ viikon plateau-trendin.
**Toiminta**: vaihtaa movement seuraavaan phaseVariants-listassa.
**Evidenssi**: Progressive overload + variety for hypertrophy (Israetel).

### `DAY_PLAN_GENERATED`
**Laukaisu**: dayPlan puuttuu mesocycle.weekPlans:sta (esim. Tue ei ole Mon/Wed/Fri-ohjelmassa).
**Toiminta**: generateDefaultDayPlan() luo lennossa dayType-pohjaisen ohjelman.

---

## Peaking (kilpailujakso)

### `COMPETITION_LOADS`
**Laukaisu**: dayType === "competition".
**Laskenta**: `computeAttemptLoads(e1rm, bw, peakingConfig)` → opener/2nd/3rd.

### `PEAKING_TRANSITION`
**Laukaisu**: peaking-mesosykli päättyy.
**Toiminta**: luo uusi default-mesosykli deltaPctBase = −0.05 (palautusjakso).

---

## Evidenssi-linkit

**Periodisointi (Block)**: Issurin, V.B. (2010). "New horizons for the methodology and physiology of training periodization". Sports Med, 40(3), 189-206.

**VBT / velocity**: Jovanović, M., & Flanagan, E.P. (2014). "Researched applications of velocity based strength training." J Aust Strength Cond, 22(2), 58-69.

**Volyymi-landmarks (MEV/MAV/MRV)**: Israetel, M., Hoffmann, J., & Smith, C.W. (2017). Scientific Principles of Hypertrophy Training.

**RPE-based programming**: Helms, E., Cronin, J., Storey, A., & Zourdos, M.C. (2016). "Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training." Strength Cond J, 38(4), 42-49.

**Autoregulation**: Greg Nuckols — Stronger by Science. "Velocity-Based Training" 2021.

**Streetlifting peaking**: limited formal literature; methodology adapted from powerlifting + gymnastics weighted calisthenics (Bromley, Alsruhe).
