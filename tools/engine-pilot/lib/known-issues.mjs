// known-issues.mjs
// K1-K5 regressio-baseline: harness pitää tunnistaa nämä automaattisesti.
// Jos K1-K3 EIVÄT löydy odotetuilta profiileilta → audit-engine on rikki.

export const KNOWN_ISSUES = {
  K1: {
    code: "K1",
    title: "Warmup-skeleton dead code + UI hardcoded ramp",
    severity: "BUG",
    description:
      "data.js asettaa slot.warmupSets-skeleton-arvoja (RAMP_DEFAULT/RAMP_BARBELL), mutta " +
      "index.html:11816 hardkoodaa [0, 0.30, 0.55, 0.75, 0.90] (HEAVY > 60 kg). " +
      "Foundation V3-V4 -tavoitteella 90% step on liian raskas neural-primer.",
    locations: [
      { file: "data.js", line: 5653, kind: "RAMP_BARBELL define" },
      { file: "index.html", line: 11816, kind: "Hardcoded UI ramp" },
      { file: "engine.js", line: null, kind: "slot.warmupSets ei luettu mihinkään" },
    ],
    expectedProfiles: ["beginner-male-60", "returner-3mo-break", "uncalibrated-intermediate"],
    detection: "Trace audit + UI-source-scan",
  },
  K2: {
    code: "K2",
    title: "rep1Range käyttää BLOCK_PHASE_TARGET_RIR eikä slot.targetVx",
    severity: "DESIGN-MISMATCH",
    description:
      "engine.js:2664 targetRep1VelocityRange(movementName, blockPhase, rtfModel) ei ota slot.targetVx parametrina. " +
      "Lukee BLOCK_PHASE_TARGET_RIR[phase] (engine.js:2670). " +
      "Foundation: block-default=4 mutta slot.targetVx voi olla 3 (esim. streetlifting_16w vk1 primary). " +
      "Grindy-atletille (bias.grindy > 0.5) tämä ampliﬁoi virhettä: rep1Range jää liian matala.",
    locations: [
      { file: "engine.js", line: 2664, kind: "Function signature missing slot.targetVx" },
      { file: "engine.js", line: 2670, kind: "BLOCK_PHASE_TARGET_RIR read" },
      { file: "engine.js", line: 2827, kind: "BLOCK_PHASE_TARGET_RIR constant" },
    ],
    expectedProfiles: ["akseli-elite-streetlifter"],
    detection: "Trace audit: primary slot.targetVx vs BLOCK_PHASE_TARGET_RIR-mismatch",
  },
  K3: {
    code: "K3",
    title: "Backoff-velocityStop ja primary-rep1Range samalla vel-panel:lla UI:ssa",
    severity: "UX-BUG",
    description:
      "index.html:6248-6254 renderöi vel-panel:in joka sisältää rep-grid:n (rep1Range-pohjaiset zonet primary-slotille) + " +
      "exercise.velocityStop (slot-spesifi, backoff voi olla 0.55 vs primary 0.60). " +
      "Kun käyttäjä vaihtaa primary→backoff, näkee sekalaisia kynnysarvoja.",
    locations: [
      { file: "index.html", line: 6248, kind: "vel-panel DOM container" },
      { file: "index.html", line: 6252, kind: "exercise.velocityStop render" },
      { file: "data.js", line: 5688, kind: "SQUAT_BACKOFF_STYLES velocityStop" },
    ],
    expectedProfiles: ["akseli-elite-streetlifter", "pl-advanced-male-75"],
    detection: "Trace audit: primary+backoff slot.velocityStop eroavat & rep1Range yksisuuntainen",
  },
  K4: {
    code: "K4",
    title: "TBD — harness-löydös progressio-jumeista (esim. RDL non-linear sequence)",
    severity: "PENDING-DISCOVERY",
    description:
      "Spec-dokumentin mukaan: 'RDL-progression non-linear sequence vk1→vk2 +10kg vs vk2→vk3 +2.5kg'. " +
      "Harness etsii tämän tyyppisiä progression-anomalioita.",
    locations: [],
    expectedProfiles: [],
    detection: "Cross-week deltaPct-monotonisuus per liike",
  },
  K5: {
    code: "K5",
    title: "TBD — AI Block Tuning -tarkastusten katvealueet",
    severity: "PENDING-DISCOVERY",
    description: "Spec: AI Block Tuning ei sisällä K1-K3 -tyyppisiä in-blokki-warningseja.",
    locations: [],
    expectedProfiles: [],
    detection: "Block-tuning-paketti-analyysi vk 4/8/12",
  },
};

// Per profile odotetut K-issueet — audit-engine vertaa havaintojaan tähän
export const KNOWN_ISSUE_EXPECTATIONS = {
  "akseli-elite-streetlifter": ["K2", "K3"],
  "pl-advanced-male-75": ["K3"],
  "beginner-male-60": ["K1"],
  "elite-female-hypertrophy-60": [],
  "returner-3mo-break": ["K1"],
  "cut-aggressive-700kcal": [],
  "shoulder-limit-no-ohp": [],
  "uncalibrated-intermediate": ["K1", "K3"],
};
