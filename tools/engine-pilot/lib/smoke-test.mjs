// smoke-test.mjs
// Varmistaa että engine.js + data.js käynnistyvät Node:ssa ja recommend()
// palauttaa odotetun rakenteen. Tämä on kriittinen go/no-go ennen koko
// harness-koodin rakentamista.

import {
  recommend,
  createDefaultMesocycle,
} from "./engine-bridge.mjs";

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

  console.log("\n=== SMOKE TEST PASSED ===");
}

main().catch((e) => {
  console.error("\n=== SMOKE TEST FAILED ===");
  console.error(e);
  process.exit(1);
});
