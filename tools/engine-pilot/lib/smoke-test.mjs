// smoke-test.mjs
// Varmistaa että engine.js + data.js käynnistyvät Node:ssa ja recommend()
// palauttaa odotetun rakenteen. Tämä on kriittinen go/no-go ennen koko
// harness-koodin rakentamista.

import {
  recommend,
  createDefaultMesocycle,
} from "./engine-bridge.mjs";
// H-010 P1c (A4): elävä identity-gate -polun regressio-lukko
import { auditInvariants } from "./audit-engine.mjs";

const PRIMARY_MOV_ID = "test-primary-leuka";
const MOCK_MOVEMENTS = [
  {
    movementId: PRIMARY_MOV_ID,
    name: "Lisäpainoleuanveto",
    category: "vertikaaliveto",
    isPrimary: true,
    isPreset: true,
    isCompetitionLift: true,
    loadType: "system",
  },
];

function makeRecommendCtx(overrides = {}) {
  const startDateISO = overrides.startDateISO || "2026-01-05";
  const dateISO = overrides.dateISO || startDateISO;
  const meso = createDefaultMesocycle(startDateISO);
  return {
    settings: overrides.settings || { bodyweightKg: 91 },
    bodyweightKg: overrides.bodyweightKg || 91,
    dateISO,
    mesocycle: overrides.mesocycle || meso,
    allMovements: overrides.allMovements || MOCK_MOVEMENTS,
    allSets: overrides.allSets || [],
    sessions: overrides.sessions || [],
    readiness: overrides.readiness || {
      combined: "GREEN",
      capLevel: 0,
      channels: {
        velocity: { class: "GREEN", z: 0.1 },
        hrv: { class: "GREEN", z: 0.2 },
        vara: { class: "GREEN", z: null, meanOvershoot: 0 },
      },
    },
    primaryMovementId: overrides.primaryMovementId || PRIMARY_MOV_ID,
    dryRun: true,
  };
}

async function main() {
  console.log("=== engine-pilot smoke-test ===");

  // Test 1: createDefaultMesocycle palauttaa odotetun rakenteen
  const meso = createDefaultMesocycle("2026-01-05");
  console.log("\n[T1] createDefaultMesocycle:");
  console.log("  type:", meso?.type);
  console.log("  startDateISO:", meso?.startDateISO);
  console.log("  weekCount:", meso?.weekCount);
  console.log("  weekPlans.length:", meso?.weekPlans?.length);
  console.log("  weekDefs.length:", meso?.weekDefs?.length);

  if (!meso || !Array.isArray(meso.weekPlans) || meso.weekPlans.length === 0) {
    throw new Error("T1 FAIL: createDefaultMesocycle palautti virheellisen rakenteen");
  }

  // Test 2: recommend() palauttaa rec-objektin GREEN-fresh-startissa
  const ctx = makeRecommendCtx({ dateISO: "2026-01-05" });
  const rec = await recommend(ctx);
  console.log("\n[T2] recommend(ctx) — vk 1 MA GREEN:");
  console.log("  error:", rec?.error);
  console.log("  weekNum:", rec?.weekNum);
  console.log("  dayType:", rec?.dayType);
  console.log("  targetExternalLoad:", rec?.targetExternalLoad);
  console.log("  targetReps:", rec?.targetReps);
  console.log("  targetVx:", rec?.targetVx);
  console.log("  deltaPct:", rec?.deltaPct);
  console.log("  capLevel:", rec?.capLevel);
  console.log("  traces.length:", rec?.traces?.length);
  console.log("  dayPlan.slots.length:", rec?.dayPlan?.slots?.length);

  if (rec?.error) {
    console.error("  ERROR:", rec.error, rec.errorMessage);
    throw new Error("T2 FAIL: recommend() palautti error");
  }
  if (rec?.weekNum !== 1) {
    throw new Error(`T2 FAIL: weekNum oletettiin 1, saatiin ${rec?.weekNum}`);
  }
  if (!Array.isArray(rec.traces)) {
    throw new Error("T2 FAIL: traces ei ole array");
  }

  // Test 3: traces sisältää tunnetut ruleId:t
  const ruleIds = new Set(rec.traces.map((t) => t.ruleId));
  console.log("\n[T3] Traces ruleIds (uniikit):");
  console.log("  count:", ruleIds.size);
  console.log("  ruleIds:", [...ruleIds].sort().join(", "));

  const expectedRules = ["MESOCYCLE_PHASE"];
  const missing = expectedRules.filter((r) => !ruleIds.has(r));
  if (missing.length > 0) {
    console.warn(`  WARN: odotetut traces puuttuvat: ${missing.join(", ")}`);
  }

  // Test 4: dayPlan-rakenne
  console.log("\n[T4] dayPlan rakenne:");
  if (rec.dayPlan?.slots) {
    rec.dayPlan.slots.forEach((slot, i) => {
      console.log(
        `  slot[${i}]: role=${slot.role} mov=${slot.movementName || slot.defaultMovementName} ` +
          `reps=${slot.reps} targetVx=${slot.targetVx} sets=${slot.sets}`,
      );
    });
  }

  // Test 5: rec.suggestions (v4.50.0 Track B 2D-δ adaptive multi-suggestion)
  console.log("\n[T5] Adaptive multi-suggestion:");
  console.log("  suggestions.length:", rec.suggestions?.length);
  console.log("  defaultSuggestionId:", rec.defaultSuggestionId);
  if (Array.isArray(rec.suggestions)) {
    rec.suggestions.forEach((s) => {
      console.log(
        `  - ${s.id} (${s.label}): load=${s.targetExternalLoad} Vx=${s.targetVx} ` +
          `deltaPct=${typeof s.deltaPct === "number" ? s.deltaPct.toFixed(4) : s.deltaPct}`,
      );
    });
  }
  console.log("  suggestionContext.rtfModelStatus:", rec.suggestionContext?.rtfModelStatus);
  console.log("  suggestionContext.preferredBias:", rec.suggestionContext?.preferredBias);
  console.log(
    "  suggestionContext.aggressiveSuppressedReasons:",
    (rec.suggestionContext?.aggressiveSuppressedReasons || []).join(", ") || "(none)",
  );

  if (!Array.isArray(rec.suggestions) || rec.suggestions.length < 1) {
    throw new Error("T5 FAIL: rec.suggestions puuttuu tai tyhjä");
  }
  const targetTier = rec.suggestions.find((s) => s.id === "target");
  if (!targetTier) {
    throw new Error("T5 FAIL: TARGET-suggestion puuttuu");
  }
  if (!rec.suggestions.some((s) => s.id === rec.defaultSuggestionId)) {
    throw new Error(
      `T5 FAIL: defaultSuggestionId=${rec.defaultSuggestionId} ei ole suggestions-listalla`,
    );
  }

  // Test 6: Backward compat — TARGET-tier:n arvot vastaavat rec.targetExternalLoad/Vx/deltaPct
  console.log("\n[T6] Backward compat (TARGET-parity):");
  console.log(`  rec.targetExternalLoad=${rec.targetExternalLoad} vs target.load=${targetTier.targetExternalLoad}`);
  console.log(`  rec.targetVx=${rec.targetVx} vs target.targetVx=${targetTier.targetVx}`);
  console.log(`  rec.deltaPct=${rec.deltaPct} vs target.deltaPct=${targetTier.deltaPct}`);
  if (
    targetTier.targetExternalLoad !== rec.targetExternalLoad ||
    targetTier.targetVx !== rec.targetVx ||
    Math.abs((targetTier.deltaPct ?? 0) - (rec.deltaPct ?? 0)) > 1e-6
  ) {
    throw new Error("T6 FAIL: TARGET-parity rikkoutui (backward compat)");
  }

  // Test 7: SUGGESTIONS_GENERATED-trace löytyy
  if (!ruleIds.has("SUGGESTIONS_GENERATED")) {
    throw new Error("T7 FAIL: SUGGESTIONS_GENERATED-trace puuttuu");
  }
  console.log("\n[T7] SUGGESTIONS_GENERATED-trace: ✅");

  // Test 8 (H-010 P1c A4): elävä identity-gate -polun regressio-lukko.
  // Known-positive: trace jossa e1RM-source ≠ näytetty primary → gate laukeaa.
  const idPosTrace = {
    input: { primaryMovementId: "Lisäpainoleuanveto" },
    output: { slots: [{ role: "primary", movementName: "Muscle-up" }] },
    traces: [],
  };
  const idPosFlags = auditInvariants(idPosTrace);
  if (!idPosFlags.some((f) => f.code === "PRIMARY_MOVEMENT_IDENTITY_MISMATCH")) {
    throw new Error("T8 FAIL: identity-gate ei laukea known-positivessa (pmid=Lisäpainoleuanveto ≠ näytetty=Muscle-up)");
  }
  // Known-negative: pmid === näytetty → gate EI laukea.
  const idNegTrace = {
    input: { primaryMovementId: "Muscle-up" },
    output: { slots: [{ role: "primary", movementName: "Muscle-up" }] },
    traces: [],
  };
  if (auditInvariants(idNegTrace).some((f) => f.code === "PRIMARY_MOVEMENT_IDENTITY_MISMATCH")) {
    throw new Error("T8 FAIL: identity-gate laukesi known-negativessa (pmid===näytetty, ei saisi)");
  }
  console.log("\n[T8] identity-gate (PRIMARY_MOVEMENT_IDENTITY_MISMATCH) known-pos/neg: ✅");

  console.log("\n=== SMOKE TEST PASSED ===");
}

main().catch((e) => {
  console.error("\n=== SMOKE TEST FAILED ===");
  console.error(e);
  process.exit(1);
});
