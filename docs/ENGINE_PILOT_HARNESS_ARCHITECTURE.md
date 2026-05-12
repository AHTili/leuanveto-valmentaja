# Engine-Pilot-Harness — Arkkitehtuurisuunnitelma

**LeVe AI v4.49.0 — Lopputarkastus ennen Track B Vaihe 2D-δ:tä**
**Tavoite:** systemaattinen, deterministinen, todistettavissa-oleva bulletproof-audit kaikille atletti-arkkityypeille koko 16-viikon syklin yli.

**Lähde:** Plan-agentti #1, 2026-05-12 (~2500 sanaa)

---

## A) Harness-arkkitehtuuri

### A.1 Tiedostorakenne

```
tools/engine-pilot/
├── README.md                          # ajo-ohjeet, output-tulkinta
├── run-pilot.mjs                      # CLI-entry: node tools/engine-pilot/run-pilot.mjs [--profile=akseli|all] [--scenario=foundation|all]
├── lib/
│   ├── fake-idb.mjs                   # In-memory IDB-stub (data.js olettaa indexedDB:n; tämä syöttää koko stack:in tilan)
│   ├── engine-bridge.mjs              # Tuo engine.js + data.js (näin recommend() toimii ilman selainta)
│   ├── trace-capture.mjs              # Käärii recommend()-output:in canonical JSON-trace-formaattiin
│   ├── athlete-simulator.mjs          # Per-profile log-generator: Vara + velocity + reps random/deterministinen
│   ├── scenario-runner.mjs            # Ajaa N viikkoa × M päivää × recommend() per profiili
│   ├── ai-tuning-runner.mjs           # Kerää deload-vk:n generateBlockTuningPackage-paketin (vk 4/8/12)
│   ├── audit-baselines.mjs            # Tutkimuspohja-vakiot (VL-cap-ranges, RIR-tavoitteet, Pareja-Blanco 2017 jne.)
│   ├── audit-engine.mjs               # Deterministinen rule-based auditor (≥80% issueista löytyy ilman LLM:ää)
│   ├── report-builder.mjs             # Markdown- + JSON-output per profile + cross-profile
│   └── known-issues.mjs               # K1-K5 + odotetut esiintymät per profiili (regressio-suoja)
├── profiles/
│   ├── akseli-elite-streetlifter.mjs
│   ├── pl-advanced-male-75.mjs
│   ├── beginner-male-60.mjs
│   ├── elite-female-hypertrophy-60.mjs
│   ├── returner-3mo-break.mjs
│   ├── cut-aggressive-700kcal.mjs
│   ├── shoulder-limit-no-ohp.mjs
│   └── uncalibrated-intermediate.mjs
├── scenarios/
│   ├── foundation-block.mjs           # vk 1-4 (incl. deload)
│   ├── strength-block.mjs             # vk 5-8 (incl. cal vk 8)
│   ├── intensity-block.mjs            # vk 9-12 (incl. cal vk 12)
│   ├── peaking-block.mjs              # vk 13-16 (kisapäivä)
│   ├── wizard-generated.mjs           # Käyttää wizard-2b-mapper.pickProgramStyle:n päätöksen mukaisesti
│   └── multi-block-issurin.mjs        # 8-16 vk multi-block
└── output/                            # gitignored
    ├── traces/                        # per (profile, scenario, week, day) JSON-trace
    ├── reports/                       # per profile Markdown
    └── ENGINE_BULLETPROOF_AUDIT.md    # synteesi
```

### A.2 Pääkomponentit ja niiden vastuut

| Komponentti | Vastuu | LoC-arvio |
|---|---|---|
| `fake-idb.mjs` | Stubaa `data.js`:n IDB-kutsut. `dbPut/dbGet/dbGetAll/dbDelete/dbClear/dbPutBulk` koukutetaan in-memory-Mappiin. | ~150 |
| `engine-bridge.mjs` | ESM-import: `import * as Engine from "../../engine.js"; import * as Data from "../../data.js";`. Aktivoi fake-IDB:n ja seedaa MOCK_MOVEMENTS + MOCK_SETTINGS + profiilin alkutila. | ~120 |
| `athlete-simulator.mjs` | Profilin bias-parametreista (grindyBias, varaJitter, sessionVariance, dayQuality) generoi realistiset actualVx, mvReps (per-rep MPV-array), reps-arvot **deterministisesti seeded RNG:llä** (mulberry32(profile.seed + dayIndex)). | ~200 |
| `scenario-runner.mjs` | Sequentiaalisesti per (vk, dow): hae recommend(ctx) → generoi simuloidut setit athlete-simulator:lla → tallenna fake-IDB:hen → siirry seuraavaan päivään. Kerää kaikki traces. | ~250 |
| `ai-tuning-runner.mjs` | Vk 4/8/12 jälkeen kutsuu generateBlockTuningPackage / generateGenericBlockTuningPackage ja kaappaa tuotos:n koko markdown + ai-prompt-versioineen. | ~80 |
| `audit-baselines.mjs` | Pareja-Blanco 2017 VL-cap-rangit, Sánchez-Moreno 2017 foundation VL=25-35%, Helms 2018 cut + volyymileikkaus, Huiberts 2024 sex-modifier, Issurin 2010 block-residuaalit, Zourdos 2016 RPE-validiteetti. | ~300 |
| `audit-engine.mjs` | Deterministiset säännöt. Esim: "jos blockPhase=foundation → VL-cap pitäisi olla 30 ±5%", "jos atleetilla shoulderLimit → ei OHP-slotteja missään päivässä", "jos rep1 mpv > targetRangeMax JA lastRep mpv < velocityStop → mitä engine sanoo? = ristiriita-flag". | ~600 |
| `trace-capture.mjs` | Kerää joka recommend()-kutsusta canonical JSON-blokin. | ~180 |
| `report-builder.mjs` | Per profile: Markdown-taulukko. Cross-profile: matriisi "issue-koodi × profiilit". | ~400 |
| `known-issues.mjs` | K1-K5 + odotettu esiintymä per profiili. | ~150 |

### A.3 Engine-bridge: ESM + fake-indexeddb hybrid

`data.js` käyttää `indexedDB`-globaalia. Node 20+ ei tunne sitä, mutta `openDB()` katsoo `if (!("indexedDB" in self)) → resolve(null)`.

**Päätös: hybrid.**
- Käytä **options-injection ensisijaisena** (kuten test-runner.js makeRecommendCtx, rivi 654)
- **fake-indexeddb** sivupolulla siellä missä injection ei riitä (AI-Block-Tuning, MovementProgress)

**Engine-bridge.mjs-pseudokoodi:**
```javascript
import "fake-indexeddb/auto";  // populates globalThis.indexedDB
import * as Data from "../../../data.js";
import * as Engine from "../../../engine.js";
await Data.initDB();
await Data.seedPresets();
await Data.ensureAllVariantsSeeded();
// nyt fake-IDB sisältää 133+ liikettä
```

### A.4 Output-formaatti

**JSON-trace per (profile, scenario, week, day):**
```json
{
  "profileId": "akseli-elite-streetlifter",
  "scenarioId": "foundation-block",
  "weekNum": 2, "dayOfWeek": 1, "dateISO": "2026-01-12",
  "input": {
    "e1rmExternal": 174.9, "bodyweightKg": 91,
    "readiness": { "combined": "GREEN", "channels": {...} },
    "athleteState": { "lastSessionPerfectExecution": true, "varaBiasObserved": -0.4 }
  },
  "output": {
    "targetExternalLoad": 124, "deltaPct": 0.035,
    "dayPlan": { "slots": [...], "warmup": [...] },
    "vlCap": 30.0, "rep1Range": [0.85, 0.95], "velocityStop": 0.65,
    "rtfModelStatus": "pending", "vbtStatus": {...},
    "decisionTraces": [
      { "ruleId": "MESOCYCLE_PHASE", "...": "..." },
      { "ruleId": "PLAN_BASED_E1RM", "...": "..." }
    ]
  },
  "auditFlags": [
    { "severity": "OK", "code": "VL_CAP_OK", "msg": "foundation VL=30% on Pareja-Blanco-rangea (25-35%)" }
  ]
}
```

---

## B) Atletti-simulaatio-strategia

### B.1 Profiilin schema

```javascript
export const AKSELI_ELITE = {
  id: "akseli-elite-streetlifter",
  meta: { age: 34, sex: "male", bodyweightKg: 91, experienceYears: 15, level: "elite" },
  prs: {
    "Lisäpainoleuanveto":   { weight: 85, reps: 1, dateISO: "2025-11-10", loadType: "system" },
    "Lisäpainodippi":       { weight: 95, reps: 1, dateISO: "2025-11-15", loadType: "system" },
    "Takakyykky":           { weight: 185, reps: 1, dateISO: "2025-10-20", loadType: "external" },
  },
  bias: {
    grindy: +0.7,           // raportoi V2 kun todellinen V1 → +0.7 systemaattinen overshoot
    varaJitter: 0.4,
    velocityRep1Mean: { foundation: 0.90, strength: 0.85, intensity: 0.75, peaking: 0.65 },
    velocityDeclinePerRep: { foundation: 0.04, strength: 0.05, intensity: 0.07, peaking: 0.09 },
    repFailureProb: { foundation: 0.02, strength: 0.05, intensity: 0.12, peaking: 0.20 },
    dayQualitySigma: 0.15,
  },
  injuries: [],
  hrvBaselineMs: 45, hrvVarianceMs: 8,
  mesoConfig: { type: "streetlifting_16w" },
  seed: 12345,
};
```

### B.2 Realistiset Vara-arviot

Per setti: `reportedVx = round(clamp(actualVx + bias.grindy + N(0, bias.varaJitter) + dayDelta, 0, 5))`.
- actualVx lasketaan velocity-trajektorista takaperin (velocityRep1 → declinePerRep → lastRepVelocity → Sánchez-Moreno-VL-mapping → todellinen RIR)
- Grindy-atletille (Akseli +0.7) tämä tarkoittaa systemaattisesti +1 Vara-luokka liian optimistinen

### B.3 Realistiset velocity-arviot

```
mvReps[0] = velocityRep1Mean × (1 + N(0, dayQualitySigma) × dayDelta)
mvReps[k] = mvReps[k-1] − declinePerRep × (1 + jitter)
```
Jos mvReps[k] < velocityStop → setti loppuu.

### B.4 Determinismi: seeded RNG

Joka profiilille `seed: 12345` → sama trajektori joka ajolla. Stokastinen mode `--seed=random` saatavissa parametrina cross-validation-tarpeisiin.

---

## C) Audit-vaihe (kaksitasoinen)

### C.1 Taso 1 — `audit-engine.mjs` (sääntöpohjainen, deterministinen, ≥80% issueista)

**Per session:**
- VL-cap-tarkistus: rec.output.vlCap vs. baseline → flagia jos ulkopuolella
- rep1Range-tarkistus: foundation RIR=4 vs. slot.targetVx → flagia jos mismatch
- velocityStop-tarkistus: backoff-slotin velocityStop vs. primary → flagia jos sama
- Cross-set-ristiriita: rep1 > rangeMax JA lastRep < velocityStop → mitä engine sanoo? Trace-hit "VBT_E1RM_CROSSCHECK"? Vai puuttuva?
- Slot-kelvollisuus injuries:n suhteen
- e1RM-jatkuvuus: per liike per vk, deltaPct vs. cfg-drift
- RTF-model status: profiilin sessio-määrän mukaan model:n pitäisi olla pending/preview/reliable
- AI-Block-Tuning sisältö (vk 4/8/12): puuttuvat osiot, fabrikoituneet numerot ilman status-attribuutiota

### C.2 Taso 2 — Plan-agentti (LLM-tuki ulkopuolelta)

**Suositus: yksi Plan-agentti per profiili, EI per scenario.** Yhden profiilin koko 16 vk × 3-4 päivää = noin 50-60 sessiota = mahdutettavissa yhden 200k-tokenin context-ikkunaan markdown-raporttina.

Agentin tehtävä per profiili (tarkka prompt):
> "Tässä on engine-pilot-output Akselille (markdown). Käytä tutkimuspohjaa (Pareja-Blanco 2017, Sánchez-Moreno 2017, Helms 2018, Issurin 2010). Lue jokaisen sessio decision-trace ja vastaa: (1) onko jokainen päätös tutkimuspohjan mukainen? (2) onko UX-kommunikointi selkeää? (3) löydätkö designineel-epäjohdonmukaisuuksia jotka audit-engine ei nähnyt? Käytä status-flagit 🐛/⚠️/📋/💬/✅. Tarjoa konkreettinen patch jokaiselle 🐛-issuelle."

### C.3 Cross-profile-vertailu

Issue × profile -matriisi:

| Issue-ID | Akseli | PL-adv | Beginner | Elite-naist. | Returner | Cut | Shoulder | Uncal | Yht. |
|---|---|---|---|---|---|---|---|---|---|
| K1-RTF-pending-not-communicated | — | — | 🐛 | — | 🐛 | — | — | 🐛 | 3/8 |
| K2-PLAN_BASED-overshoot-grindy | 🐛 | — | — | — | — | — | — | — | 1/8 |
| (uusi) VL-cap-strength-too-tight | 🐛 | 🐛 | 🐛 | 🐛 | 🐛 | 🐛 | 🐛 | 🐛 | 8/8 |

**Issuet joiden esiintymä-frekvenssi ≥ 5/8 → systemic bug → pakko korjata ennen 2D-δ:tä.**

---

## D) Bulletproof-report-rakenne

**ENGINE_BULLETPROOF_AUDIT.md (lopullinen synteesi):**

```
1. Yhteenveto
   - Issuet kategorioittain (kpl): 🐛 / ⚠️ / 📋 / 💬 / ✅
   - 2D-δ pre-requisite -lukko: kpl × kategoria
   - Critical path: top-5 issuet jotka blokkavat 2D-δ:n

2. Korjausjärjestys
   2.1 Quick-fix-issuet (< 1 h koodaus)
   2.2 Keskitason korjaukset (1-4 h)
   2.3 Syvät refaktoroinnit (≥ 4 h)
   2.4 Voidaan jättää 2D-δ:n jälkeen

3. 2D-δ pre-requisite -lista (konkreettinen checklist)

4. Cross-profile-matriisi

5. Per-profile-detalji (linkit erillisiin .md-tiedostoihin)

6. Tutkimuspohja-viittaukset

7. Kysymykset Akselille (atletin näkemystä tarvitsevat ratkaisut)

8. Tunnetut issueet K1-K5 — toistuvuus per profiili (regressio-baseline)
```

---

## E) Aika-arvio

| Vaihe | LoC | Tunnit |
|---|---|---|
| Harness-runko (fake-IDB + bridge + scenario-runner) | ~750 | 6-8 |
| Athlete-simulator + 8 profiilia | ~600 | 4-5 |
| Audit-baselines + audit-engine | ~900 | 8-10 |
| Report-builder + cross-profile-matriisi | ~400 | 3-4 |
| Known-issues + K1-K3 -regressio-suojat | ~150 | 1-2 |
| Aja kaikille profiileille + 6 skenaariota | — | 1-2 |
| Plan-agentti-audit per profiili (8 agenttia) | — | 4-6 |
| Synteesi | — | 2-3 |
| Manuaalinen verifikaatio + Akselin Q&A | — | 3-4 |
| **YHTEENSÄ** | **~2800 LoC** | **32-44 h (~1 työviikko)** |

---

## F) Riskit + lievennys

### F.1 "Vastaako engine-pilot tuotannon käyttäytymistä?"
- `fake-indexeddb`-paketti implementoi W3C IndexedDB spec → täysin yhteensopiva
- engine.js on **puhdas computational kerros** ilman DOM-riippuvuuksia
- Validointi: aja test-runner.js:n golden fixturit pilot-environmentissa ENNEN profiilien ajoa
- Cross-check selainmiljöössä: kun audit löytää issuen, vertaa decision-traceja byte-by-byte selaimessa

### F.2 "Miten välttää false-positive audit-flags?"
- Kolmiportainen severity (error/warn/info), vain `error` blokkaa 2D-δ:n
- Jokainen sääntö dokumentoi lähteen (esim. `// Pareja-Blanco 2017 PMC5497611 Table 3 → 25-35% VL`)
- K1-K3-baseline: jos jokin näistä EI esiinny audit-output:issa → audit-engine on rikki
- LLM-Plan-agentin uudet issueet vaativat manuaalisen vahvistuksen ENNEN korjausta

### F.3 "Miten ylläpidetään harness kun engine kehittyy?"
- Harness käyttää engine.js:n public exports -rajapintaa
- Profiilit ovat data-tiedostoja ilman engine-spesifistä logiikkaa
- known-issues.mjs on regressio-suoja
- Audit-baselines viittaavat tutkimuspaperien-julkaisutunnuksiin (PMC-id / DOI)
- Versiointi: harness-output sisältää engineVersion + harnessVersion

---

## G) K1-K3-tunnettujen issueiden automaattinen tunnistus

| K-koodi | Tunnetun issuen ydin | Automaattinen audit-sääntö |
|---|---|---|
| K1 | RTF-malli pending uudella käyttäjällä, mutta UI ei kommunikoi → atletti luulee saavansa kohdennettuja Vx-targetteja | `if (rec.rtfModelStatus === "pending" \|\| !rec.rtfModelStatus) AND rec.dayPlan.slots.some(s => s.targetVx != null && s.role === "primary") AND !rec.warnings.some(w => /RTF.*pending\|odota\|kalibroitumassa/i.test(w))` |
| K2 | PLAN_BASED-e1RM aktivoituu grindy-atletille → ekstrapoloi liian aggressiivisesti | `if (trace.ruleId === "PLAN_BASED_E1RM" AND profile.bias.grindy >= 0.5)` → flag K2-grindy-amplifies-plan-based |
| K3 | VBT_E1RM_CROSSCHECK ALIGNED-statusta ei näytetä käyttäjälle silloinkin kun crossover-diff > 7% | `if (rec.vbtStatus.severity === "SIGNIFICANT" AND !rec.userVisibleWarnings.some(...crosscheck-warning))` |

`known-issues.mjs`:
```javascript
export const KNOWN_ISSUE_EXPECTATIONS = {
  "akseli-elite-streetlifter": ["K2", "K3"],
  "beginner-male-60":          ["K1"],
  "returner-3mo-break":        ["K1"],
  "uncalibrated-intermediate": ["K1", "K3"],
};
```

---

## H) Suoritusjärjestys (10 vaihetta)

1. **Harness-koodi**: rakenna `tools/engine-pilot/`-puu
2. **Yhden profiilin loppuun-ajo**: Akseli + foundation+strength+intensity+peaking. Tarkista K2+K3 löytyvät → go/no-go-portti
3. **Loput 7 profiilia**: aja kaikki, K1 löytyy odotetuilta
4. **Cross-profile-matriisi**: ilman LLM-tukea
5. **Plan-agentit**: 8 agenttia per profiili
6. **Synteesi**: yhdistä, priorisoi, 2D-δ-pre-requisite -lista
7. **Akselin Q&A**: epävarmat kysymykset
8. **Engine-korjaukset**: pre-requisitet ENNEN 2D-δ:tä
9. **Regressio-suora**: aja harness uudelleen, tarkista pre-requisitet ✅
10. **Käynnistä 2D-δ**
