// edge-case-generator.mjs (ENG-15)
//
// Tarkoitus: tuottaa synteettisiä input-sekvenssejä joissa naiivi oppiva
// malli (8a) ylittäisi tutkimuspohjaiset turvarajat. Käytetään myöhemmin
// 8a:n testauksessa varmistamaan että clamp-suoja ja ENG-14:n
// INVARIANT_VIOLATION-flagi laukeavat odotetusti.
//
// Yksi totuuden lähde: audit-baselines.mjs. Tämä moduuli LUKEE rajat sieltä
// — se ei kovakoodaa numeroita.
//
// Käyttötapa (kun 8a on implementoitu):
//   import { generateInvariantBoundaryCases } from "./edge-case-generator.mjs";
//   const cases = generateInvariantBoundaryCases();
//   for (const c of cases) {
//     const rec = await recommend(c.ctx);
//     const flags = auditTrace(...);
//     expect(flags).toContainEqual(
//       expect.objectContaining({ code: "INVARIANT_VIOLATION", ... })
//     );
//   }
//
// Toistaiseksi (8a ei vielä rakennettu): tämä moduuli vain GENEROI
// case-objekteja. Verifiointi tehdään myöhemmin 8a:n testaamisessa.

import {
  VL_CAP_BASELINES,
  BLOCK_PHASE_TARGET_RIR_EXPECTED,
  DELOAD_DELTA_RANGE,
  TIER_PROGRESSION_MULT_BASELINES,
  FAILURE_DROP_BASELINE,
  REP1_MPV_SLOPE_BASELINE,
} from "./audit-baselines.mjs";

// ──────────────────────────────────────────────────────────────
// A — VL-cap-rajaylitykset
// ──────────────────────────────────────────────────────────────
function generateVlCapBoundaryCases() {
  const cases = [];
  for (const [phase, baseline] of Object.entries(VL_CAP_BASELINES)) {
    // Just-below-min: pitäisi laueta INVARIANT_VIOLATION
    cases.push({
      id: `vl_cap_${phase}_below_min`,
      invariant: "A",
      phase,
      description: `${phase}-vaiheessa VL-cap juuri alle min-rajan`,
      expectedFlag: "INVARIANT_VIOLATION",
      // Naiivi-oppiminen-input: simuloitu opittu cap-arvo
      naiveProposedValue: baseline.min - 0.5,
      bound: { min: baseline.min, max: baseline.max },
      source: baseline.source,
    });
    // Just-above-max
    cases.push({
      id: `vl_cap_${phase}_above_max`,
      invariant: "A",
      phase,
      description: `${phase}-vaiheessa VL-cap juuri yli max-rajan`,
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: baseline.max + 0.5,
      bound: { min: baseline.min, max: baseline.max },
      source: baseline.source,
    });
    // Sisällä rajojen (kontrolli) — EI pitäisi laueta flag
    cases.push({
      id: `vl_cap_${phase}_within`,
      invariant: "A",
      phase,
      description: `${phase}-vaiheessa VL-cap sisällä rajojen (kontrolli)`,
      expectedFlag: null,
      naiveProposedValue: (baseline.min + baseline.max) / 2,
      bound: { min: baseline.min, max: baseline.max },
      source: baseline.source,
    });
  }
  return cases;
}

// ──────────────────────────────────────────────────────────────
// C — Deload Δ% -rajaylitykset
// ──────────────────────────────────────────────────────────────
function generateDeloadDeltaCases() {
  return [
    {
      id: "deload_delta_too_negative",
      invariant: "C",
      description: "Deload Δ% liian negatiivinen (esim. -45%)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: DELOAD_DELTA_RANGE.min - 0.15,
      bound: DELOAD_DELTA_RANGE,
      source: DELOAD_DELTA_RANGE.source,
    },
    {
      id: "deload_delta_too_shallow",
      invariant: "C",
      description: "Deload Δ% liian pieni leikkaus (esim. -5%)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: DELOAD_DELTA_RANGE.max + 0.10,
      bound: DELOAD_DELTA_RANGE,
      source: DELOAD_DELTA_RANGE.source,
    },
    {
      id: "deload_delta_positive_bug",
      invariant: "C",
      description: "Deload-viikolla POSITIIVINEN Δ% (selvä bug-tila)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: 0.05,
      bound: DELOAD_DELTA_RANGE,
      source: DELOAD_DELTA_RANGE.source,
    },
    {
      id: "deload_delta_within",
      invariant: "C",
      description: "Deload Δ% sisällä rangen (kontrolli)",
      expectedFlag: null,
      naiveProposedValue: (DELOAD_DELTA_RANGE.min + DELOAD_DELTA_RANGE.max) / 2,
      bound: DELOAD_DELTA_RANGE,
      source: DELOAD_DELTA_RANGE.source,
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// D — Tier-progression multiplier -rajaylitykset
// ──────────────────────────────────────────────────────────────
function generateTierProgressionCases() {
  const cases = [];
  for (const [tier, baseline] of Object.entries(TIER_PROGRESSION_MULT_BASELINES)) {
    cases.push({
      id: `tier_progression_${tier}_above_max`,
      invariant: "D",
      tier,
      description: `${tier}-tier:n weekly progression ylittää max-rajan`,
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: baseline.max + 0.05,
      bound: { max: baseline.max },
      source: baseline.source,
      // Tarkistus aktivoituu vain jos tierProgressionApplied !== false
      requiresTierProgressionApplied: true,
    });
    cases.push({
      id: `tier_progression_${tier}_within`,
      invariant: "D",
      tier,
      description: `${tier}-tier:n weekly progression sisällä rajan (kontrolli)`,
      expectedFlag: null,
      naiveProposedValue: baseline.max - 0.01,
      bound: { max: baseline.max },
      source: baseline.source,
      requiresTierProgressionApplied: true,
    });
    cases.push({
      id: `tier_progression_${tier}_handTunedPreset_opt_out`,
      invariant: "D",
      tier,
      description: `${tier}-tier ylittää rajan MUTTA handTuned-preset → ei INVARIANT_VIOLATION (kontrolli)`,
      expectedFlag: null,
      naiveProposedValue: baseline.max + 0.05,
      bound: { max: baseline.max },
      source: baseline.source,
      requiresTierProgressionApplied: false, // opt-out
    });
  }
  return cases;
}

// ──────────────────────────────────────────────────────────────
// E — Failure-drop -rajaylitykset (8a:lle, ei vielä auditoitu trace-tasolla)
// ──────────────────────────────────────────────────────────────
function generateFailureDropCases() {
  const ref = FAILURE_DROP_BASELINE;
  return [
    {
      id: "failure_drop_too_aggressive",
      invariant: "E",
      description: "Failure-drop liian iso (esim. 15%)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: ref.pct + 0.10,
      bound: { target: ref.pct, tolerance: ref.tolerance },
      source: ref.source,
      auditingNote: "EI VIELÄ AUDITOITU trace-tasolla — ENG-14 listaa tämän 'ei katetta' -tilassa",
    },
    {
      id: "failure_drop_too_small",
      invariant: "E",
      description: "Failure-drop liian pieni (esim. 1%)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: ref.pct - 0.04,
      bound: { target: ref.pct, tolerance: ref.tolerance },
      source: ref.source,
      auditingNote: "EI VIELÄ AUDITOITU trace-tasolla",
    },
    {
      id: "failure_drop_within_tolerance",
      invariant: "E",
      description: "Failure-drop tarkalleen 5% (kontrolli)",
      expectedFlag: null,
      naiveProposedValue: ref.pct,
      bound: { target: ref.pct, tolerance: ref.tolerance },
      source: ref.source,
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// B — Rep1 MPV slope -rajaylitykset (henkilökohtaisen RTF-mallin opetus)
// ──────────────────────────────────────────────────────────────
function generateRep1MpvSlopeCases() {
  const ref = REP1_MPV_SLOPE_BASELINE;
  return [
    {
      id: "rep1_mpv_slope_too_high",
      invariant: "B",
      description: "Opittu slope > prior + tolerance (esim. 0.080 m/s/RIR)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: ref.slopeMpvPerRir + ref.tolerance + 0.020,
      bound: {
        target: ref.slopeMpvPerRir,
        tolerance: ref.tolerance,
        min: ref.slopeMpvPerRir - ref.tolerance,
        max: ref.slopeMpvPerRir + ref.tolerance,
      },
      source: ref.source,
      auditingNote: "EI VIELÄ AUDITOITU trace-tasolla — ENG-14 listaa 'ei katetta'",
    },
    {
      id: "rep1_mpv_slope_too_low",
      invariant: "B",
      description: "Opittu slope < prior − tolerance (esim. 0.015 m/s/RIR)",
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: ref.slopeMpvPerRir - ref.tolerance - 0.010,
      bound: {
        target: ref.slopeMpvPerRir,
        tolerance: ref.tolerance,
        min: ref.slopeMpvPerRir - ref.tolerance,
        max: ref.slopeMpvPerRir + ref.tolerance,
      },
      source: ref.source,
      auditingNote: "EI VIELÄ AUDITOITU trace-tasolla",
    },
    {
      id: "rep1_mpv_slope_within_tolerance",
      invariant: "B",
      description: "Opittu slope priorin keskiarvossa (kontrolli)",
      expectedFlag: null,
      naiveProposedValue: ref.slopeMpvPerRir,
      bound: {
        target: ref.slopeMpvPerRir,
        tolerance: ref.tolerance,
      },
      source: ref.source,
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// G — Slot target Vx -rajaylitykset
// ──────────────────────────────────────────────────────────────
function generateSlotVxCases() {
  const cases = [];
  for (const [phase, expected] of Object.entries(BLOCK_PHASE_TARGET_RIR_EXPECTED)) {
    cases.push({
      id: `slot_vx_${phase}_too_high`,
      invariant: "G",
      phase,
      description: `${phase}-vaiheessa targetVx liian iso (helppo)`,
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: expected + 2.5, // > tolerance ±1
      bound: { expected, tolerance: 1 },
      source: "BLOCK_PHASE_TARGET_RIR_EXPECTED",
    });
    cases.push({
      id: `slot_vx_${phase}_too_low`,
      invariant: "G",
      phase,
      description: `${phase}-vaiheessa targetVx liian pieni (raskas)`,
      expectedFlag: "INVARIANT_VIOLATION",
      naiveProposedValue: Math.max(0, expected - 2.5),
      bound: { expected, tolerance: 1 },
      source: "BLOCK_PHASE_TARGET_RIR_EXPECTED",
    });
    cases.push({
      id: `slot_vx_${phase}_within`,
      invariant: "G",
      phase,
      description: `${phase}-vaiheessa targetVx odotetussa (kontrolli)`,
      expectedFlag: null,
      naiveProposedValue: expected,
      bound: { expected, tolerance: 1 },
      source: "BLOCK_PHASE_TARGET_RIR_EXPECTED",
    });
  }
  return cases;
}

// ──────────────────────────────────────────────────────────────
// Pää-API
// ──────────────────────────────────────────────────────────────

/**
 * Generoi kaikki invarianttirajan reuna-caset.
 * Jokainen case sisältää:
 *   - id: uniikki tunniste
 *   - invariant: A/B/C/D/E/G
 *   - description: ihmisluettava
 *   - expectedFlag: "INVARIANT_VIOLATION" tai null (kontrolli)
 *   - naiveProposedValue: arvo jonka oletettu naiivi oppiminen ehdottaisi
 *   - bound: rajat (min/max/tolerance)
 *   - source: tutkimuslähde
 */
export function generateInvariantBoundaryCases() {
  return [
    ...generateVlCapBoundaryCases(),
    ...generateDeloadDeltaCases(),
    ...generateTierProgressionCases(),
    ...generateFailureDropCases(),
    ...generateRep1MpvSlopeCases(),
    ...generateSlotVxCases(),
  ];
}

/**
 * Summarize-funktio joka antaa tilastoja generaattorin tuottamista caseista.
 * Hyödyllinen sanity-checkiin että generaattori kattaa kaikki invariantit.
 */
export function summarizeBoundaryCases(cases = null) {
  const list = cases || generateInvariantBoundaryCases();
  const byInvariant = {};
  const byExpectedFlag = { violations: 0, controls: 0 };
  for (const c of list) {
    byInvariant[c.invariant] = (byInvariant[c.invariant] || 0) + 1;
    if (c.expectedFlag === "INVARIANT_VIOLATION") byExpectedFlag.violations++;
    else byExpectedFlag.controls++;
  }
  return {
    totalCases: list.length,
    byInvariant,
    byExpectedFlag,
  };
}

// CLI-käyttö: aja `node tools/engine-pilot/lib/edge-case-generator.mjs`
// jolloin tulostuu summary-näkymä.
const isMain = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
               import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/").split("/").pop() || "");
if (isMain) {
  const summary = summarizeBoundaryCases();
  console.log("=== edge-case-generator summary ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nFirst 5 cases:");
  console.log(JSON.stringify(generateInvariantBoundaryCases().slice(0, 5), null, 2));
}
