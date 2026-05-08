#!/usr/bin/env node

import fs from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

import { buildVersionDiff, normalizeUrl, rowKey } from "./v5-v6-diff.mjs";

const careerOpsRequire = createRequire(resolve("career-ops", "package.json"));
const ExcelJS = careerOpsRequire("exceljs");

let passed = 0;
let failed = 0;
function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  OK: ${msg}`); }
  else { failed++; console.log(`  FAIL: ${msg}\n    expected: ${e}\n    got:      ${a}`); }
}

assertEq(normalizeUrl("HTTPS://Example.com/Path/?x=1#frag"), "https://example.com/path", "normalizeUrl strips query/fragment + lowercases");
assertEq(
  rowKey({ url: "https://job-boards.greenhouse.io/anthropic/jobs/5192805008", company: "Anthropic", title: "Applied AI Architect, Commercial" }),
  "https://job-boards.greenhouse.io/anthropic/jobs/5192805008\tanthropic",
  "rowKey normalizes url + company (title stripped to allow V5/V6 chrome differences)",
);

const v5 = resolve("career-ops", "output", "production-filter-refinement-review-2026-05-01-v5.xlsx");
const v6 = resolve("career-ops", "output", "production-filter-refinement-review-2026-05-01-v6.xlsx");
const out = resolve("career-ops", "output", "production-filter-refinement-v5-v6-diff-test.xlsx");
const summaryJson = resolve("docs", "audits", "shadow-v5-v6-diff-summary-test.json");

const result = await buildVersionDiff({
  runDate: "2026-05-01",
  outputXlsx: out,
  summaryJson,
  allowOverwrite: true,
  versions: { v5, v6 },
});

assertEq(fs.existsSync(out), true, "diff workbook written");
assertEq(fs.existsSync(summaryJson), true, "diff summary JSON written");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(out);
const expectedSheets = [
  "Diff Manifest",
  "V5 to V6 Changed Rows",
  "Hard Drop Added",
  "Hard Drop Removed",
  "Hard Drop Reason Changed",
  "Sales Policy 2 Movement",
  "Review Queue Movement",
  "Source Repair Movement",
  "Score And Band Changes",
  "Signal Changes",
  "Company Role Pivot",
  "Unmatched Rows",
  "Summary Metrics",
];
assertEq(wb.worksheets.map((s) => s.name), expectedSheets, "diff workbook sheets are deterministic");

// V5 has 956 raw shadow rows; the diff key is (url, company) which collapses
// 33 same-URL-same-company duplicate rows (a listing-page artifact in V5).
// V6 dedup further reduces 923 unique pairs to 900 in the diff view.
assertEq(result.versions.v5.counts.shadow_rows, 923, "V5 unique shadow rows by (url, company) == 923 (V5 raw is 956 with listing dup chrome)");
assertEq(result.versions.v6.counts.shadow_rows, 900, "V6 unique shadow rows by (url, company) == 900");
assertEq(result.versions.v5.counts.sales_hard_drops, 108, "V5 sales hard drops == 108");
assertEq(result.versions.v6.counts.sales_hard_drops, 78, "V6 sales hard drops == 78 (after policy 2)");
assertEq(result.versions.v6.counts.validation_findings, 0, "V6 validation findings == 0 (F-009 gate)");
assertEq(result.diff.changedRows.length > 0, true, "diff produced changed rows");
const salesMovement = result.diff.changedRows.filter((r) => /sales_policy_2_movement/.test(r.change_type));
assertEq(salesMovement.length > 0, true, "sales policy 2 movement rows present");
const placeholderRouted = result.diff.changedRows.filter((r) => /placeholder_or_invalid_url/.test(r.new_source_repair_reason));
assertEq(placeholderRouted.length >= 1, true, "F-004 placeholder url routed in V6");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
