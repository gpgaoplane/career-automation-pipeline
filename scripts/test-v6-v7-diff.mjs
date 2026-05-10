#!/usr/bin/env node
// Verify v6-v7-diff.mjs structure, cause attribution, and key metrics.

import fs from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

import { buildVersionDiff, parseArgs } from "./v6-v7-diff.mjs";

const careerOpsRequire = createRequire(resolve("career-ops", "package.json"));
const ExcelJS = careerOpsRequire("exceljs");

let passed = 0;
let failed = 0;

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  OK: ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL: ${msg}\n    expected: ${e}\n    got:      ${a}`);
  }
}

const outputXlsx = resolve("career-ops", "output", "tests", "v6-v7-diff-test.xlsx");
const summaryJson = resolve("docs", "audits", "shadow-v6-v7-diff-test.json");
const flags = parseArgs(["node", "scripts/v6-v7-diff.mjs", "--allow-overwrite",
  "--output-xlsx", outputXlsx, "--summary-json", summaryJson]);

const { versions, diff, summary } = await buildVersionDiff(flags);

assertEq(versions.v6.counts.shadow_rows, 900, "V6 shadow_rows == 900 (post F-002 dedup)");
assertEq(versions.v7.counts.shadow_rows, 900, "V7 shadow_rows == 900 (no further dedup)");
assertEq(versions.v6.counts.territory_hard_drops, 0, "V6 territory_hard_drops == 0 (V6 had no territory category)");
assertEq(versions.v7.counts.territory_hard_drops > 0, true, "V7 territory_hard_drops > 0 (V7-A3 active)");
assertEq(versions.v7.counts.sales_hard_drops >= versions.v6.counts.sales_hard_drops, true,
  "V7 sales_hard_drops >= V6 (V7-A1 broadens; V7-A2 doesn't reduce)");

// Sheet structure
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(outputXlsx);
const sheetNames = wb.worksheets.map((s) => s.name);
assertEq(sheetNames.includes("V7-A1 Pre-Sales Title"), true, "V7-A1 sheet present");
assertEq(sheetNames.includes("V7-A3 Territory"), true, "V7-A3 sheet present");
assertEq(sheetNames.includes("Hard Drop Added"), true, "Hard Drop Added sheet present");
assertEq(sheetNames.includes("Hard Drop Removed"), true, "Hard Drop Removed sheet present");
assertEq(sheetNames.includes("Summary Metrics"), true, "Summary Metrics sheet present");

// Cause attribution: every hard_drop_added row must have a v7_cause tag
const v7a1Rows = diff.changedRows.filter((r) => /V7-A1/.test(r.v7_cause));
assertEq(v7a1Rows.length > 0, true, "V7-A1 attributed rows present (Pre-Sales / AE / AM broadening)");
const v7a3Rows = diff.changedRows.filter((r) => /V7-A3/.test(r.v7_cause));
assertEq(v7a3Rows.length > 0, true, "V7-A3 attributed rows present (territory hard-drops)");

// Regression-baseline gate: count untagged flips
const untaggedFlips = diff.changedRows.filter((r) => {
  const flipped = (r.old_hard_drop === "yes") !== (r.new_hard_drop === "yes");
  return flipped && /OTHER/.test(r.v7_cause);
});
assertEq(untaggedFlips.length, 0, "Regression-baseline gate: no V6→V7 hard_drop flips lack a V7-Ax tag");

// Pre-Sales rows attributable to V7-A1 should include Deepgram + Halcyon-style titles.
const deepgramFlip = diff.changedRows.find((r) => /deepgram/i.test(r.company || "") && /pre[-\s]?sales/i.test(r.title || ""));
if (deepgramFlip) {
  assertEq(/V7-A1/.test(deepgramFlip.v7_cause), true, "Deepgram Pre-Sales row tagged V7-A1");
}

// Territory rows attributable to V7-A3 should include Anthropic India/Japan candidates.
const territoryFlips = diff.changedRows.filter((r) => /non_na_territory/.test(r.new_hard_drop_reason || ""));
assertEq(territoryFlips.length > 0, true, "Territory hard-drop reasons present in V7 diff");
for (const r of territoryFlips) {
  assertEq(/V7-A3/.test(r.v7_cause), true, `Territory flip ${r.company} | ${r.title} tagged V7-A3`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
