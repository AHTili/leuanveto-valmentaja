# Engine-Pilot Harness

Headless Node-pohjainen test-harness joka simuloi LeVe AI -enginen päätöksiä 8 atletti-profiilin × 16 viikon mesosyklillä.

## Käyttö

```bash
# Kaikki profiilit default-skenaarioilla
node tools/engine-pilot/run-pilot.mjs

# Yksi profiili
node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter
node tools/engine-pilot/run-pilot.mjs --profile=beginner-male-60

# Skenaario-override
node tools/engine-pilot/run-pilot.mjs --profile=akseli-elite-streetlifter --scenario=full-16w
```

## Tiedostorakenne

```
tools/engine-pilot/
├── README.md                         # tämä tiedosto
├── run-pilot.mjs                     # CLI-entry
├── lib/
│   ├── engine-bridge.mjs            # Tuo engine.js + data.js Node:hen (self-shim)
│   ├── smoke-test.mjs               # Validointi: ajaa recommend() yhden session
│   ├── e2e-smoke.mjs                # Validointi: Akseli foundation 4 vk
│   ├── seeded-rng.mjs               # Mulberry32 deterministinen RNG
│   ├── trace-capture.mjs            # Canonical JSON-trace-formaatti
│   ├── athlete-simulator.mjs        # Set-generaattori per profiilin biaksesta
│   ├── scenario-runner.mjs          # Pää-loop: vk × päivä × recommend()
│   ├── audit-baselines.mjs          # Tutkimusvakiot (Pareja-Blanco, Helms jne.)
│   ├── audit-engine.mjs             # Sääntöpohjainen rule-engine
│   ├── known-issues.mjs             # K1-K5 regressio-baseline
│   └── report-builder.mjs           # Markdown + JSON output
├── profiles/                        # 8 atletti-profiilia
│   ├── akseli-elite-streetlifter.mjs
│   ├── pl-advanced-male-75.mjs
│   ├── beginner-male-60.mjs
│   ├── elite-female-hypertrophy-60.mjs
│   ├── returner-3mo-break.mjs
│   ├── cut-aggressive-700kcal.mjs
│   ├── shoulder-limit-no-ohp.mjs
│   └── uncalibrated-intermediate.mjs
├── scenarios/                       # 7 skenaariota
│   ├── full-16w.mjs                # streetlifting_16w koko sykli
│   ├── foundation-block.mjs        # vk 1-4
│   ├── strength-block.mjs          # vk 5-8
│   ├── intensity-block.mjs         # vk 9-12
│   ├── peaking-block.mjs           # vk 13-16
│   ├── wizard-generated.mjs        # generic 4 vk × 3 d
│   └── multi-block-issurin.mjs     # 14 vk multi-block
└── output/                          # gitignore-suositeltava
    ├── reports/<profile>.md         # per-profile raportti
    ├── traces/<profile>-<scenario>.json # canonical JSON-trace
    └── cross-profile-matrix.md      # issue × profile -taulu
```

## Arkkitehtuuri

**1. Engine-bridge** (`lib/engine-bridge.mjs`):
- Asettaa `globalThis.self = globalThis` (data.js olettaa `"indexedDB" in self`)
- Tuo `engine.js` + `data.js` staattisilla importeilla
- `indexedDB` jää undefined → data.js dbPut/dbGet -wrapperit palauttavat fail-safe-arvot
- recommend() toimii `dryRun: true` -tilassa ohittaen IDB:n

**2. Athlete-simulator** (`lib/athlete-simulator.mjs`):
- Per (profile.seed, weekNum, dayOfWeek) deterministinen RNG (mulberry32)
- Bias-parametrit: grindy, varaJitter, velocityRep1Mean[phase], dayQualitySigma, repFailureProb[phase]
- Generoi setit jotka tallennetaan accumulatedSets[]-arrayyn (engine luet sen historiana)
- KRIITTINEN: setit saavat `setRole`, `systemLoadKg`, `movementId` joka matchaa primaryMovementId:n

**3. Scenario-runner** (`lib/scenario-runner.mjs`):
- For each (weekNum, dayOfWeek) scenarion days[]-listassa:
  - simulateReadiness(profile, week, day) → readiness-objekti
  - buildCtx(profile, mesocycle, dateISO, allSets, sessions, readiness)
  - rec = await recommend(ctx)
  - captureTrace(rec) → traces[]
  - simulateSet × slot.sets per slot → accumulatedSets

**4. Audit-engine** (`lib/audit-engine.mjs`):
- auditK1 — slot.warmupSets puuttuu tai viim. step ≤ 0.85 vs UI-hardcoded 0.90
- auditK2 — primary slot.targetVx vs BLOCK_PHASE_TARGET_RIR[phase] mismatch
- auditK3 — primary + backoff slot velocityStop / targetVx mismatch
- auditDeltaPctClamp — engine.js maxDelta 25% hard-clamp + tier-pohjainen Latella-warning
- auditE1RMContinuity — e1rmExternal=null kun historia on
- auditDeloadDayType — deload-vk dayType="heavy"
- crossTraceProgression — non-linear progression-sekvenssi (K4-tunnistus)

**5. Report-builder** (`lib/report-builder.mjs`):
- Per-profile Markdown: yhteenveto + severity-jakauma + K-issue-status + audit-flagit + per-week-taulu
- Cross-profile-matrix: code × profile -taulu + systemic-bug-frequency-tunnistus
- JSON trace-dump erillisenä output/traces/*.json

## Tunnetut rajoitukset (audit:in jälkeen havaitut)

- **Trace-coverage**: U1/P3-korjauksen jälkeen ~30-40% engine.js:n 80+ päätöskohdasta emitoituu trace:hen. Loput vaativat erityisehtoja (failure-jälkeen, plan-based, RTF-reliable jne.) jotka simulator ei vielä tuo systemaattisesti.
- **K4/K5 detect-säännöt**: Spec:in K4 (RDL progression non-linear) ja K5 (AI Block Tuning -aukot) tarvitsevat erityismekanismit jotka eivät vielä ole audit-engineessä.
- **Plan-agentti-audit**: Vain 3/8 profiilia ajettu Plan-agentilla (Akseli, Beginner, Elite-female). 5 muuta profiilia odottavat resurssia.
- **AI-Block-Tuning-runner**: Spec:n vk 4/8/12 deload-AI-paketti ei vielä rakennettu.

## Riippuvuudet

Vain Node.js stdlib + native ESM. **Ei npm-paketteja.**

Node-versio: ≥ 20.x (v24.13.1 testattu).

## Validointi-kokeet

Yksittäiset validation-kokeet:

```bash
# 1. Engine + data.js käynnistyvät Node:ssa, recommend() toimii dryRun-tilassa
node tools/engine-pilot/lib/smoke-test.mjs

# 2. End-to-end: Akseli ajaa foundation 4 vk
node tools/engine-pilot/lib/e2e-smoke.mjs
```

## Output: lopullinen bulletproof-audit

`docs/ENGINE_BULLETPROOF_AUDIT.md` — synteesi, korjausjärjestys, 2D-δ pre-requisite -checklist, Akselin Q&A-kysymykset.
