// audit-baselines.mjs
// Tutkimuspohja-vakiot joihin audit-engine vertailee engine-output:ia.
// Lähteet dokumentoitu inline (DOI / PMC-id / book reference).

export const VL_CAP_BASELINES = {
  // Pareja-Blanco 2017 (PMC5497611): foundation/hypertrophy VL ~25-35%
  // Sánchez-Moreno 2017: foundation VL 25-35% optimi-recoveryn ja stimuluksen tasapaino
  foundation: { min: 25, max: 35, source: "Pareja-Blanco 2017 PMC5497611 + Sánchez-Moreno 2017" },
  // Pareja-Blanco 2020 (PMC7308300): strength VL 15-20% optimi-1RM-tuotto
  strength: { min: 15, max: 20, source: "Pareja-Blanco 2020 PMC7308300" },
  // Helms 2018 (PMID 30153841): intensity / peaking-vaihe ~10-15% / 5-10%
  intensity: { min: 10, max: 15, source: "Helms 2018 PMID 30153841" },
  peaking: { min: 5, max: 10, source: "Helms 2018 PMID 30153841 + Issurin 2010" },
  "speed-strength": { min: 10, max: 15, source: "Behrmann 2025 räjähtävät variantit" },
};

export const BLOCK_PHASE_TARGET_RIR_EXPECTED = {
  // Engine.js:n vakio — ulottuuko tämä slot-tasolle?
  foundation: 4,
  strength: 2.5,
  intensity: 1.5,
  peaking: 1,
  "speed-strength": 4,
};

export const DELOAD_DELTA_RANGE = {
  // Helms 2018: deload -20% to -30% volyymi
  min: -0.30,
  max: -0.15,
  source: "Helms 2018 PMID 30153841 — deload-yksiselitteisesti negatiivinen",
};

export const RAMP_EXPECTED_TOP_PCT = {
  // Helms 2017 warmup-protokolla: viimeinen step ~85-90% targetista
  // Engine.js data.js:5647 RAMP_DEFAULT: [0.40, 0.55, 0.70, 0.85]
  // Engine.js data.js:5653 RAMP_BARBELL: [0.35, 0.50, 0.65, 0.78, 0.88]
  // Index.html:11816 hardkoodattu: [0.30, 0.55, 0.75, 0.90] (HEAVY) ← K1 BUG
  defaultTopPct: 0.85,
  barbellTopPct: 0.88,
  uiHardcodedTopPct: 0.90, // K1: liian raskas neural primer foundationissa V3-V4 -tavoitteella
  source: "Helms 2017; data.js RAMP_DEFAULT/RAMP_BARBELL vs index.html:11816",
};

export const RTF_MODEL_THRESHOLDS = {
  // Engine.js: RTF_R2_THRESHOLD_RELIABLE / _PREVIEW + RTF_MIN_REPS_PER_SET + RTF_MIN_SESSIONS_FOR_MODEL
  minSessionsReliable: 6, // arvio — engine-koodissa tarkka kynnys
  source: "Engine.js computeRtfVelocityModel — Jukic 2024 RIR-V-malli",
};

export const SEX_MODIFIER = {
  // Huiberts 2024 (open-access SMD -0.43 lower-body strength)
  recoveryHeikkoTrigger: {
    requiresMale: true,
    requiresAerobic: true,
    requiresAdvancedOrElite: true,
  },
  source: "Huiberts 2024 SMD -0.43 (q15_aerobicModality + q08_selfLevel adv/elite + male)",
};

export const CUT_DEFICIT_THRESHOLD = {
  // Helms 2018 + RP — agressiivinen vaje >500 kcal → recovery=heikko
  triggerKcal: 500,
  source: "Helms 2018 + RP-Hypertrophy/Cutting Templates",
};

export const ISSURIN_BLOCK_RESIDUALS = {
  // Issurin 2010 — block-periodisaation residual-päivät
  maximal_strength: { meanDays: 30, sdDays: 5 },
  maximal_speed: { meanDays: 5, sdDays: 3 },
  strength_endurance: { meanDays: 14, sdDays: 4 },
  general_fitness: { meanDays: 7, sdDays: 2 },
  technique: { meanDays: 3, sdDays: 1 },
  source: "Issurin 2010 Sports Medicine",
};

// Engine.js: maxDelta on settings.maxDelta || 0.25 (rivi 3733). Default 25%.
// Tämä on hard-clamp, ei "expected progression range". Eliittitason normaali progression
// pitäisi olla ~0-2% per viikko (Helms 2018, Latella 2020), joten >5% kerralla on
// punainen lippu jos atletti on advanced/elite.
export const DELTA_PCT_HARD_CLAMP = {
  minDefault: -0.25,
  maxDefault: 0.25,
  capRedExtraNegative: -0.25, // engine sallii cap-red:lläkin sama clamp
  source: "Engine.js:3733 settings.maxDelta || 0.25",
};

// Heuristinen "expected progression range" — käytetään WARN-tasoiseen säädön ohjeistukseen,
// EI ERROR-tasoiseen clamp-violation:iin (clamp on hard-clamp 25%).
export const DELTA_PCT_EXPECTED_RANGE = {
  beginnerMax: 0.10, // ~5-10% / vk OK aloittelijalle (Latella 2020 tier-mult 1.0)
  advancedMax: 0.05, // ~2-5% / vk advanced-tier (tier-mult 0.15)
  eliteMax: 0.03, // ~1-3% / vk elite-tier (tier-mult 0.05)
  source: "Latella 2020 PMID 32706692 + Helms 2018 PMID 30153841",
};
