// e2e-smoke.mjs
// End-to-end smoke: aja Akseli foundation-block läpi → tarkista että harness
// kerää traceja, ei kaadu, ja rec-objektit sisältävät odotetut kentät.

import { createStreetlifting16WMesocycle } from "./engine-bridge.mjs";
import { runScenario } from "./scenario-runner.mjs";
import AKSELI from "../profiles/akseli-elite-streetlifter.mjs";
import FOUNDATION from "../scenarios/foundation-block.mjs";

async function main() {
  console.log("=== e2e smoke: Akseli × foundation-block ===");
  const mesocycle = createStreetlifting16WMesocycle(AKSELI.mesoConfig.startDateISO);
  console.log(`mesocycle.type=${mesocycle.type} weekCount=${mesocycle.weekCount}`);

  const result = await runScenario({ profile: AKSELI, scenario: FOUNDATION, mesocycle });

  console.log(`\nDays planned: ${result.daysPlanned}`);
  console.log(`Days completed: ${result.daysCompleted}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Total sets simulated: ${result.setsTotal}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((e) => console.log(`  ${e.dateISO} w${e.weekNum}d${e.dayOfWeek}: ${e.message}`));
  }

  // Tarkista ensimmäinen trace
  const first = result.traces[0];
  console.log(`\nFirst trace (vk${first.weekNum} d${first.dayOfWeek} ${first.dateISO}):`);
  console.log(`  dayType: ${first.output.dayType}`);
  console.log(`  weekLabel: ${first.output.weekLabel}`);
  console.log(`  targetExternalLoad: ${first.output.targetExternalLoad}`);
  console.log(`  targetReps: ${first.output.targetReps}`);
  console.log(`  targetVx: ${first.output.targetVx}`);
  console.log(`  deltaPct: ${first.output.deltaPct}`);
  console.log(`  e1rmExternal: ${first.output.e1rmExternal}`);
  console.log(`  slots: ${first.output.slots.length}`);
  console.log(`  traces ruleIds: ${[...new Set(first.traces.map(t => t.ruleId))].sort().join(", ")}`);

  // Tarkista loppu trace (vk4 d6)
  const last = result.traces[result.traces.length - 1];
  console.log(`\nLast trace (vk${last.weekNum} d${last.dayOfWeek} ${last.dateISO}):`);
  console.log(`  dayType: ${last.output.dayType}`);
  console.log(`  weekLabel: ${last.output.weekLabel}`);
  console.log(`  targetExternalLoad: ${last.output.targetExternalLoad}`);
  console.log(`  deltaPct: ${last.output.deltaPct}`);
  console.log(`  e1rmExternal: ${last.output.e1rmExternal}`);
  console.log(`  traces count: ${last.traces.length}`);

  // K1: kerro onko slot.warmupSets täytetty
  console.log(`\n[K1 dead-code check] First trace primary-slot warmupSets:`);
  const prim = first.output.slots.find((s) => s.role === "primary");
  console.log(`  ${JSON.stringify(prim?.warmupSets)}`);

  // K2: targetVx vs BLOCK_PHASE_TARGET_RIR[foundation]=4 — onko slotin Vx eri?
  console.log(`\n[K2 hint] First trace primary slot.targetVx: ${prim?.targetVx} (foundation block-default 4)`);

  console.log("\n=== E2E SMOKE PASSED ===");
}

main().catch((e) => {
  console.error("\n=== E2E SMOKE FAILED ===");
  console.error(e);
  process.exit(1);
});
