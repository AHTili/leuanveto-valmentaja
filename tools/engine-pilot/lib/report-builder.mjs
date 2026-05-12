// report-builder.mjs
// Tuottaa per-profile Markdown-raportin + cross-profile-matriisin.
// Output:
//   tools/engine-pilot/output/reports/<profile>.md
//   tools/engine-pilot/output/cross-profile-matrix.md
//   tools/engine-pilot/output/traces/<profile>.json

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function severitySort(a, b) {
  const order = { "🐛 ERROR": 0, "⚠️ WARN": 1, "💬 UX": 2, "📋 INFO": 3 };
  return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
}

export function buildProfileReport({ profile, scenario, result, flags, summary, outputDir }) {
  ensureDir(outputDir);
  ensureDir(join(outputDir, "reports"));
  ensureDir(join(outputDir, "traces"));

  // JSON trace-dump
  const tracesPath = join(outputDir, "traces", `${profile.id}-${scenario.id}.json`);
  writeFileSync(tracesPath, JSON.stringify({ profile: profile.id, scenario: scenario.id, traces: result.traces }, null, 2));

  // Markdown report
  const md = [];
  md.push(`# Engine-Pilot Report — ${profile.id}`);
  md.push("");
  md.push(`**Profile**: ${profile.id} (${profile.meta.level} ${profile.meta.sex} ${profile.meta.bodyweightKg} kg)`);
  md.push(`**Scenario**: ${scenario.label}`);
  md.push(`**Mesocycle**: ${result.mesocycleType}`);
  md.push(`**Seed**: ${profile.seed}`);
  md.push("");
  md.push("## Yhteenveto");
  md.push("");
  md.push(`- Päiviä suunniteltu: ${result.daysPlanned}`);
  md.push(`- Päiviä ajettu: ${result.daysCompleted}`);
  md.push(`- Virheitä: ${result.errors.length}`);
  md.push(`- Settejä simuloitu: ${result.setsTotal}`);
  md.push(`- Audit-flagit yhteensä: ${summary.total}`);
  md.push("");
  md.push("### Severity-jakauma");
  md.push("");
  md.push(`| Severity | Count |`);
  md.push(`|---|---|`);
  for (const [sev, count] of Object.entries(summary.bySeverity)) {
    md.push(`| ${sev} | ${count} |`);
  }
  md.push("");
  md.push("### Koodikohtaiset flagit");
  md.push("");
  md.push(`| Code | Count |`);
  md.push(`|---|---|`);
  const codesSorted = Object.entries(summary.byCode).sort((a, b) => b[1] - a[1]);
  for (const [code, count] of codesSorted) {
    md.push(`| ${code} | ${count} |`);
  }
  md.push("");

  // Tunnetut K-issueet — odotettu vs todettu
  const expected = profile.knownIssueExpectations || [];
  const observed = new Set(Object.keys(summary.byCode).filter((c) => /^K\d/.test(c)));
  md.push("## K-issueet — odotettu vs todettu");
  md.push("");
  md.push(`| K-koodi | Odotettu | Todettu (count) | Status |`);
  md.push(`|---|---|---|---|`);
  const allK = [...new Set([...expected, ...observed])].sort();
  for (const k of allK) {
    const exp = expected.includes(k) ? "✅" : "—";
    const obsCount = summary.byCode[k] ?? 0;
    const obs = obsCount > 0 ? `✅ (${obsCount})` : "❌";
    let status = "";
    if (expected.includes(k) && obsCount > 0) status = "✅ ODOTUS TÄYTETTY";
    else if (expected.includes(k) && obsCount === 0) status = "🐛 PUUTTUU (audit-engine miss?)";
    else if (!expected.includes(k) && obsCount > 0) status = "⚠️ EI ODOTETTU";
    md.push(`| ${k} | ${exp} | ${obs} | ${status} |`);
  }
  md.push("");

  // Per-session flagit (top 20)
  md.push("## Audit-flagit (top 30 priorisoituna severityn mukaan)");
  md.push("");
  if (flags.length === 0) {
    md.push("_Ei flagia._");
  } else {
    const sorted = [...flags].sort(severitySort).slice(0, 30);
    md.push(`| Vk | DoW | Code | Severity | Msg |`);
    md.push(`|---|---|---|---|---|`);
    for (const f of sorted) {
      const msg = (f.msg || "").replace(/\|/g, "\\|");
      md.push(`| ${f.weekNum} | ${f.dayOfWeek} | ${f.code} | ${f.severity} | ${msg} |`);
    }
  }
  md.push("");

  // Per-week summary — kuormat, deltaPct
  md.push("## Per-week summary (primary slot)");
  md.push("");
  md.push(`| Vk | DoW | dayType | targetLoad | targetReps | targetVx | deltaPct | e1rmExternal | flags |`);
  md.push(`|---|---|---|---|---|---|---|---|---|`);
  for (const t of result.traces) {
    const flagsCount = (t.auditFlags || []).length;
    const slot = t.output.slots?.find((s) => s.role === "primary");
    md.push(
      `| ${t.weekNum} | ${t.dayOfWeek} | ${t.output.dayType ?? "—"} | ` +
        `${t.output.targetExternalLoad ?? "—"} | ${t.output.targetReps ?? "—"} | ${t.output.targetVx ?? "—"} | ` +
        `${t.output.deltaPct !== null ? (t.output.deltaPct * 100).toFixed(1) + "%" : "—"} | ` +
        `${t.output.e1rmExternal ?? "—"} | ${flagsCount} |`,
    );
  }
  md.push("");

  // Errors
  if (result.errors.length > 0) {
    md.push("## Virheet (recommend() threw)");
    md.push("");
    for (const e of result.errors) {
      md.push(`- **${e.dateISO}** (vk${e.weekNum} d${e.dayOfWeek}): ${e.message}`);
    }
    md.push("");
  }

  const reportPath = join(outputDir, "reports", `${profile.id}.md`);
  writeFileSync(reportPath, md.join("\n"));
  return { reportPath, tracesPath };
}

// Cross-profile-matriisi: code × profile -taulu
export function buildCrossProfileMatrix({ profileResults, outputDir }) {
  ensureDir(outputDir);

  // Kerää kaikki koodit
  const allCodes = new Set();
  const byProfile = {};
  for (const { profile, summary } of profileResults) {
    byProfile[profile.id] = summary.byCode;
    for (const code of Object.keys(summary.byCode)) allCodes.add(code);
  }
  const codes = [...allCodes].sort();

  const profileIds = profileResults.map((r) => r.profile.id);

  const md = [];
  md.push("# Engine-Pilot Cross-Profile Matrix");
  md.push("");
  md.push(`**Profiilia ajettu**: ${profileIds.length}`);
  md.push(`**Uniikit audit-koodit**: ${codes.length}`);
  md.push("");
  md.push("Matriisin solu = count per (code, profile). Tyhjä = ei flagia.");
  md.push("");
  md.push("## Issue × Profile matriisi");
  md.push("");

  // Header
  const header = ["| Code |", ...profileIds.map((p) => p.slice(0, 18) + " |"), "Yht. |"].join(" ");
  const sep = ["|---|", ...profileIds.map(() => "---|"), "---|"].join(" ");
  md.push(header);
  md.push(sep);

  // Rivit
  for (const code of codes) {
    const row = [`| ${code} |`];
    let total = 0;
    for (const pid of profileIds) {
      const cnt = byProfile[pid]?.[code] ?? 0;
      total += cnt > 0 ? 1 : 0; // count profile-osumat
      row.push(`${cnt > 0 ? cnt : "—"} |`);
    }
    row.push(`${total}/${profileIds.length} |`);
    md.push(row.join(" "));
  }
  md.push("");

  // Frequency-rank
  md.push("## Systemic-bug-frequency (≥5/8 → korjattava ennen 2D-δ:tä)");
  md.push("");
  md.push("| Code | Profiilit (cnt > 0) | Tila |");
  md.push("|---|---|---|");
  const freqSorted = codes
    .map((c) => {
      const profilesHit = profileIds.filter((p) => (byProfile[p]?.[c] ?? 0) > 0);
      return { code: c, profilesHit, frequency: profilesHit.length };
    })
    .sort((a, b) => b.frequency - a.frequency);
  for (const f of freqSorted) {
    const status = f.frequency >= 5 ? "🐛 SYSTEMIC — pre-req 2D-δ" : f.frequency >= 3 ? "⚠️ TOISTUVA" : "📋 PAIKALLINEN";
    md.push(`| ${f.code} | ${f.frequency}/${profileIds.length} (${f.profilesHit.join(", ")}) | ${status} |`);
  }
  md.push("");

  const matrixPath = join(outputDir, "cross-profile-matrix.md");
  writeFileSync(matrixPath, md.join("\n"));
  return matrixPath;
}
