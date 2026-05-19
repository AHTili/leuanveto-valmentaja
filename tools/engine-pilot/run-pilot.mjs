#!/usr/bin/env node
// run-pilot.mjs
// CLI: node tools/engine-pilot/run-pilot.mjs [--profile=all|akseli|...] [--scenario=full-16w|wizard-generated]
//
// Default: kaikki 8 profiilia + niiden default-scenariot.
// Output: tools/engine-pilot/output/reports/<profile>.md + cross-profile-matrix.md + traces/

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createStreetlifting16WMesocycle,
  createDefaultMesocycle,
  createHypertrofiaMesocycle,
  createWendler531Mesocycle,
} from "./lib/engine-bridge.mjs";
import { runScenario } from "./lib/scenario-runner.mjs";
import { auditProfile, summarizeFlags } from "./lib/audit-engine.mjs";
import { buildProfileReport, buildCrossProfileMatrix } from "./lib/report-builder.mjs";

import AKSELI from "./profiles/akseli-elite-streetlifter.mjs";
import PL_ADV from "./profiles/pl-advanced-male-75.mjs";
import BEG from "./profiles/beginner-male-60.mjs";
import EL_F from "./profiles/elite-female-hypertrophy-60.mjs";
import RET from "./profiles/returner-3mo-break.mjs";
import CUT from "./profiles/cut-aggressive-700kcal.mjs";
import SHO from "./profiles/shoulder-limit-no-ohp.mjs";
import UNC from "./profiles/uncalibrated-intermediate.mjs";
import SL_NOV from "./profiles/streetlifter-novice-male-70.mjs";

import FULL_16W from "./scenarios/full-16w.mjs";
import FOUNDATION from "./scenarios/foundation-block.mjs";
import STRENGTH from "./scenarios/strength-block.mjs";
import INTENSITY from "./scenarios/intensity-block.mjs";
import PEAKING from "./scenarios/peaking-block.mjs";
import WIZARD_GEN from "./scenarios/wizard-generated.mjs";
import MULTI_BLOCK from "./scenarios/multi-block-issurin.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output");

const PROFILES = {
  "akseli-elite-streetlifter": AKSELI,
  "pl-advanced-male-75": PL_ADV,
  "beginner-male-60": BEG,
  "elite-female-hypertrophy-60": EL_F,
  "returner-3mo-break": RET,
  "cut-aggressive-700kcal": CUT,
  "shoulder-limit-no-ohp": SHO,
  "uncalibrated-intermediate": UNC,
  "streetlifter-novice-male-70": SL_NOV,
};

const SCENARIOS = {
  "full-16w": FULL_16W,
  "foundation-block": FOUNDATION,
  "strength-block": STRENGTH,
  "intensity-block": INTENSITY,
  "peaking-block": PEAKING,
  "wizard-generated": WIZARD_GEN,
  "multi-block-issurin": MULTI_BLOCK,
};

// Mesocycle-factory per type
function buildMesocycle(profile) {
  const t = profile.mesoConfig.type;
  const start = profile.mesoConfig.startDateISO;
  switch (t) {
    case "streetlifting_16w":
      return createStreetlifting16WMesocycle(start);
    case "wendler531":
      return createWendler531Mesocycle(start);
    case "hypertrofia":
      return createHypertrofiaMesocycle(start);
    case "default":
      return createDefaultMesocycle(start);
    default:
      console.warn(`Tuntematon mesocycle-tyyppi ${t}, käytetään default:ia`);
      return createDefaultMesocycle(start);
  }
}

// Default scenario per profile
function defaultScenario(profile) {
  if (profile.mesoConfig.type === "streetlifting_16w") return FULL_16W;
  return WIZARD_GEN;
}

// CLI arg parsing
function parseArgs(argv) {
  const args = { profile: "all", scenario: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--profile=")) args.profile = a.slice("--profile=".length);
    else if (a.startsWith("--scenario=")) args.scenario = a.slice("--scenario=".length);
  }
  return args;
}

async function runOne(profile, scenario) {
  console.log(`\n[runOne] profile=${profile.id} scenario=${scenario.id}`);
  const mesocycle = buildMesocycle(profile);
  const result = await runScenario({ profile, scenario, mesocycle });
  console.log(
    `  → ${result.daysCompleted}/${result.daysPlanned} päiviä, ${result.setsTotal} settejä, ${result.errors.length} virhettä`,
  );
  const flags = auditProfile(result, profile);
  const summary = summarizeFlags(flags);
  console.log(
    `  → ${summary.total} audit-flagia (🐛 ${summary.bySeverity["🐛 ERROR"]}, ⚠️ ${summary.bySeverity["⚠️ WARN"]}, 💬 ${summary.bySeverity["💬 UX"]}, 📋 ${summary.bySeverity["📋 INFO"]})`,
  );
  const reportPaths = buildProfileReport({
    profile,
    scenario,
    result,
    flags,
    summary,
    outputDir: OUTPUT_DIR,
  });
  console.log(`  → report: ${reportPaths.reportPath}`);
  return { profile, scenario, result, flags, summary };
}

async function main() {
  const args = parseArgs(process.argv);

  const profilesToRun =
    args.profile === "all" ? Object.values(PROFILES) : [PROFILES[args.profile]].filter(Boolean);
  if (profilesToRun.length === 0) {
    console.error(`Ei profiilia: ${args.profile}. Käytä yksi: ${Object.keys(PROFILES).join(", ")}`);
    process.exit(1);
  }

  const t0 = Date.now();
  const profileResults = [];
  for (const profile of profilesToRun) {
    const scenario = args.scenario ? SCENARIOS[args.scenario] : defaultScenario(profile);
    if (!scenario) {
      console.error(`Ei scenariota: ${args.scenario}`);
      process.exit(1);
    }
    profileResults.push(await runOne(profile, scenario));
  }

  // Cross-profile matriisi
  if (profileResults.length > 1) {
    const matrixPath = buildCrossProfileMatrix({ profileResults, outputDir: OUTPUT_DIR });
    console.log(`\n[cross-profile-matrix] ${matrixPath}`);
  }

  const tElapsed = (Date.now() - t0) / 1000;
  console.log(`\n=== DONE — ${tElapsed.toFixed(1)}s elapsed ===`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
