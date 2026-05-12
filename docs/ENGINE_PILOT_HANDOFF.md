# Engine-Pilot Handoff — Uutta keskustelua varten

**LeVe AI v4.49.0 — Track B Vaihe 2D-ε (pre-2D-δ engine-bulletproofing)**
**Versio:** v1.0 — 2026-05-12
**Tarkoitus:** Ohje **seuraavalle keskustelulle** joka rakentaa engine-pilot-harnessin ja ajaa bulletproof-auditin.

---

## 1. Tähän mennessä tehty (tämä keskustelu)

### 1.1 Track B 2D-α/β/γ valmistuneet
- v4.47.0 2D-α: Adaptive multi-suggestion + 7 single-tyyliä
- v4.48.0 2D-β: Wendler 5/3/1 + Top-set+Backoff + Madcow 5×5 + AMRAP-tuki
- v4.49.0 2D-γ: Westside + GZCL + Sheiko + RP Minimalist + Smolov Jr + Coan-Phillipi + 10 uutta liikettä

**PROGRAM_STYLES:** 17 tyyliä. **Self-tests:** 237/237 PASS. **Liikepankki:** +11 (sis. Yhden jalan jalkaprässi).

### 1.2 K1-K3-engine-issueet selvitetty 3 Plan-agentin second opinion -tutkimuksella

| K | Diagnoosi |
|---|-----------|
| K1 | **REAL BUG + DEAD CODE**: skeleton.warmupSets ei käytetä missään (data.js:5653 RAMP_BARBELL); index.html:11816 hardkoodaa `[0, 0.30, 0.55, 0.75, 0.90]` mukaan lukien 90%-stepin V3 4×5 -päivänä |
| K2 | **TARKOITUKSELLINEN DESIGN + UI-KOMMUNIKAATIO-AUKKO**: engine käyttää tahallaan kahta erillistä RIR-akselia (slot.targetVx vs BLOCK_PHASE_TARGET_RIR), grindy-bias-suoja; UI ei selitä |
| K3 | **OSITTAIN BUG + DESIGN**: foundation w3:lla numerot sattuvat sopimaan (block-default 4 = backoff slot.targetVx 4), strength-blokissa ero paljastuu; velocityStop ja rep1Range visuaalisesti samalla paneelilla = UX-bug |

### 1.3 Harness-spec dokumentoitu (2 Plan-agenttia rinnakkain)
- `docs/ENGINE_PILOT_HARNESS_ARCHITECTURE.md` — täysi arkkitehtuuri
- `docs/ENGINE_DECISION_POINTS_MAP.md` — 80 + 28 = 108 testattavaa pistettä

---

## 2. Seuraavan keskustelun tehtävä

### 2.1 Kokonaisuus

Rakenna **engine-pilot-harness** (`tools/engine-pilot/`) joka:
1. Simuloi 8 atletti-profiilin koko 16 vk -mesosykliä headlessisti
2. Capturoi kaikki 108 päätöskohtaa per sessio
3. Auditoi tutkimuspohjaa vasten (sääntö-pohjainen + Plan-agentti per profiili)
4. Tuottaa `docs/ENGINE_BULLETPROOF_AUDIT.md` (synteesi)
5. Listaa 2D-δ pre-requisite -korjaukset ennen kuin "mullistava UI" rakennetaan engineen päälle

### 2.2 Aika-arvio
- Harness-koodi (~2800 LoC): 22-29 h
- Aja simulaatiot: 1-2 h
- Plan-agentti-audit (8 profiilia): 4-6 h
- Synteesi + Akselin Q&A: 5-7 h
- **Yhteensä: 32-44 h (~1 työviikko)**

### 2.3 Suoritusjärjestys
Ks. ENGINE_PILOT_HARNESS_ARCHITECTURE.md §H — 10 vaihetta from harness-koodi → 2D-δ-käynnistys.

---

## 3. Uuden keskustelun aloitus-prompt

Kopioi tämä viesti uuden keskustelun aluksi:

```
KONTEKSTI:
Olen LeVe AI -kehittäjä, juuri valmis Track B Vaihe 2D-γ (v4.49.0). Ennen 2D-δ:tä (adaptive multi-suggestion UI + hybridit) tarvitsen engine-bulletproof-auditin.

Edellisessä keskustelussa:
- Tunnistettiin 3 engine-issuetta K1/K2/K3 atletti Akselin treenissä
- 3 Plan-agenttia teki second opinion -tutkimuksen → vahvistettu issueet aitoiksi
- 2 Plan-agenttia laati arkkitehtuuri-spec + decision-point-kartan harnesssille

Tehtäväsi nyt:

VAIHE 1 — Lue spec-dokumentit:
- docs/ENGINE_PILOT_HARNESS_ARCHITECTURE.md (arkkitehtuuri + 8 profiilia + 6 skenaariota + audit-vaihe)
- docs/ENGINE_DECISION_POINTS_MAP.md (80 + 28 = 108 testattavaa päätöskohtaa)

VAIHE 2 — Rakenna harness `tools/engine-pilot/`:
- fake-idb.mjs + engine-bridge.mjs + scenario-runner.mjs + athlete-simulator.mjs
- 8 profiilia (akseli-elite-streetlifter, pl-advanced-male-75, beginner-male-60, elite-female-hypertrophy-60, returner-3mo-break, cut-aggressive-700kcal, shoulder-limit-no-ohp, uncalibrated-intermediate)
- 6 skenaariota (foundation/strength/intensity/peaking + wizard-generated + multi-block-issurin)
- audit-baselines.mjs (Pareja-Blanco 2017, Sánchez-Moreno 2017, Helms 2018, Huiberts 2024, Issurin 2010)
- audit-engine.mjs (sääntöpohjainen, ≥80% issueista)
- report-builder.mjs (Markdown + JSON output)

VAIHE 3 — Aja go/no-go-portti (Akselin profile):
- Akseli + foundation+strength+intensity+peaking (16 vk)
- Tarkista että K2+K3 löytyvät automaattisesti
- Jos K-issueet eivät löydy → audit-engine on rikki, diagnostoi

VAIHE 4 — Aja loput 7 profiilia:
- Cross-profile-matriisi: mitkä issueet toistuvat ≥ 5/8 profiililla = systemic bug
- K1 pitäisi löytyä: beginner-male-60, returner-3mo-break, uncalibrated-intermediate

VAIHE 5 — Plan-agentti-audit (8 agenttia, 1 per profiili):
- Käytä subagent_type=Plan
- Per profiili: lue rec.traces, vertaile audit-baselines:iin, palauta issue-lista status-flagit 🐛/⚠️/📋/💬/✅

VAIHE 6 — Synteesi:
- docs/ENGINE_BULLETPROOF_AUDIT.md
- 2D-δ pre-requisite -lista (konkreettinen checklist)
- Korjausjärjestys (quick-fix / keskitason / syvä refaktoroint / 2D-δ-jälkeen)

VAIHE 7 — Akselin Q&A:
- Lähetä epävarmat kysymykset minulle (esim. "grindy-bias-suoja aggressiivisempana?")

VAIHE 8 — Engine-korjaukset:
- Korjaa kaikki pre-requisitet ENNEN 2D-δ:tä
- Regressio-suora: aja harness uudelleen

VAIHE 9 — Käynnistä 2D-δ:
- Uusi keskustelu adaptive multi-suggestion UI + hybridit

KRIITTISTÄ:
- Älä oikaise — harness on **kerralla rakennettava huolellisesti**
- Käytä rinnakkain useita agentteja (Plan + general-purpose) per vaihe → konteksti-säästö
- Determinismi: seed=12345 per profiili → diff-vertailut helppoja
- Älä korjaa K1-K3 vielä — harness pitää tunnistaa ne ennen korjausta (regressio-baseline)
- Liput trace-output:ssa: ennen mihinkään koodi-muutokseen, aja kaikki testit

Akselin profile (referenssi):
- 34v, mies, 91 kg, 15+v voimaharjoittelukokemus
- Streetlifting elite-taso
- Lisäpaino-leuka 85, dippi 95, takakyykky 185
- Grindy-bias atletti (raportoi Vara optimistisemmin kuin todellisuus)
- Mesocycle: streetlifting_16w (currently vk 3 foundation)
- Settings: Enode-velocity-mittari, Garmin HRV, kalibroitunut Vara
```

---

## 4. Seuraavan keskustelun rajat ja best practices

### 4.1 Älä tee tätä uudessa keskustelussa
- Älä korjaa K1-K3 enne harness:in valmistumista (regressio-baseline rikkoutuu)
- Älä yritä rakentaa kaikkea ydinkontekstissa — käytä sub-agentteja (Plan, general-purpose) eri vaiheisiin
- Älä unohda fake-indexeddb-pakettia: `npm install --save-dev fake-indexeddb` (vain dev, ei prod)

### 4.2 Tee tätä uudessa keskustelussa
- Aloita lukemalla 2 spec-dokumenttia (architecture + decision-points)
- Käytä isolation:worktree -agentteja kun rakennat itsenäisiä komponentteja rinnakkain
- TodoWrite alusta asti — 10-vaiheinen suoritusjärjestys
- Validoi joka vaihe ENNEN seuraavaa (esim. fake-IDB toimii ennen scenario-runneria)
- Tee golden-fixture-vertailu test-runner.js:n kanssa ennen profiili-ajoja

### 4.3 Mitä harness EI tee
- Ei korjaa enginen bugeja (audit-only)
- Ei muuta tuotantokoodia (engine.js + data.js read-only harness-puolelta)
- Ei aja CI:ssä (manuaalinen tutkimustyökalu)
- Ei korvaa selain-pohjaista testausta (täydentää sitä)

---

## 5. K1-K5 tunnetut issueet (regressio-baseline)

Harness pitää tunnistaa **automaattisesti** ilman manuaalista vinkkaamista. Jos K1-K3 eivät löydy odotetuilta profiileilta → audit-engine on rikki.

| K | Profiili-odotus | Detection-sääntö (audit-engine.mjs) |
|---|------------------|--------------------------------------|
| K1 | uncalibrated-intermediate, beginner-male-60, returner-3mo-break | Warmup-output sisältää 90% step kun primary slot vx≥3 ja meso ei ole peaking |
| K2 | akseli-elite-streetlifter | rep1Range käyttää block-default RIR-arvoa eikä slot.targetVx:ää (verifioitavissa `targetRep1VelocityRange`-output:ista) |
| K3 | akseli-elite-streetlifter, pl-advanced-male-75 | Backoff-slot saa saman rep1Range kuin primary-slot saman session sisällä |
| K4 (uusi) | TBD harness:in löydös | RDL-progression non-linear sequence vk1→vk2 +10kg vs vk2→vk3 +2.5kg |
| K5 (uusi) | TBD harness:in löydös | AI Block Tuning ei sisällä K1-K3 -tyyppisiä in-blokki-warningseja |

---

## 6. Lopputuotokset uuden keskustelun jälkeen

| Tuotos | Sijainti | Tila |
|--------|----------|------|
| Harness-koodi | `tools/engine-pilot/` | Uusi, ~2800 LoC |
| Per-profile-raportit | `tools/engine-pilot/output/reports/*.md` | 8 tiedostoa |
| Bulletproof-audit | `docs/ENGINE_BULLETPROOF_AUDIT.md` | Synteesi |
| 2D-δ pre-requisite -checklist | bulletproof-audit:in §3 | Konkreettinen |
| Engine-korjaukset | engine.js + data.js + index.html | Eri commit per fix |
| 2D-δ käynnistysprompti | uuden keskustelun avaaminen | TBD bulletproof-audit:in jälkeen |

---

## 7. Onnistumisen mittarit

**Bulletproof-tilaa pidetään saavutettuna kun:**
1. Harness ajaa 8 profiilia × 6 skenaariota = 48 simulaatiota deterministisesti
2. Audit-engine löytää K1-K3 automaattisesti odotetuilta profiileilta
3. Cross-profile-matriisi paljastaa kaikki systemic bugs (frequency ≥ 5/8)
4. 2D-δ pre-requisite -lista on ≤ 10 issueta, kaikki priorisoitu
5. Akselin Q&A-vastaukset ovat kerätty ja sisällytetty
6. Engine-korjaukset commitattu erillisinä korjauksina (ei iso "engine-rewrite")
7. Regressio-ajo harness:illa todistaa korjaukset (pre-requisite-issueet → ✅)

**Sitten ja vasta sitten 2D-δ on turvallista käynnistää.**
