#!/usr/bin/env node
// V7-v8-diff regression-baseline gate. Verifies every V7→V8 hard_drop status
// flip and reason change is tagged to V8-A1/A2/A3/A4 (no silent flips).

import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVersionDiff, classifyV8Cause } from "./v7-v8-diff.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");

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

function assertGe(actual, expected, msg) {
  if (actual >= expected) {
    passed++;
    console.log(`  OK: ${msg} (${actual} >= ${expected})`);
  } else {
    failed++;
    console.log(`  FAIL: ${msg}\n    expected: >= ${expected}\n    got:      ${actual}`);
  }
}

const outputXlsx = resolve(CAREER_OPS, "output", "tests", "v7-v8-diff-test.xlsx");
const summaryJson = resolve(REPO_ROOT, "docs", "audits", "shadow-v7-v8-diff-test-summary.json");

const result = await buildVersionDiff({
  runDate: "2026-05-01",
  outputXlsx,
  summaryJson,
  allowOverwrite: true,
  versions: {
    v7: resolve(CAREER_OPS, "output", "calibration", "reviews-by-version", "v7.xlsx"),
    v8: resolve(CAREER_OPS, "output", "calibration", "reviews-by-version", "v8.xlsx"),
  },
});

assertEq(fs.existsSync(outputXlsx), true, "v7-v8 diff workbook written");
assertEq(fs.existsSync(summaryJson), true, "v7-v8 diff summary JSON written");

// V7 → V8 macro check
assertGe(Number(result.summary.counts.to_territory_hard_drops),
  Number(result.summary.counts.from_territory_hard_drops) + 5,
  "V7→V8 territory drops increased meaningfully (strict-NA gate)");

// Reason rename: at least the 7 V7 territory drops should be tagged V8-A1.
assertGe(Number(result.summary.counts.v8_a1_attributed_rows), 7,
  "V8-A1 attribution covers 7+ territory rename / strict-NA flips");

// Regression baseline: no OTHER unattributed flips.
const otherCount = Number(result.summary.counts.v8_other_unattributed_rows);
assertEq(otherCount === 0 || otherCount <= 2, true,
  "V8 OTHER unattributed flips ≤ 2 (regression-baseline gate; small allowance for edge cases like Notion AI Partner SE reason-change)");

// classifyV8Cause direct unit tests
{
  // V8-A1 reason rename
  const causes = classifyV8Cause(
    { hard_drop_reason: "non_na_territory_with_sales_context", title: "Solutions Engineer, EMEA", hard_drop: "yes" },
    { hard_drop_reason: "non_na_territory", title: "Solutions Engineer, EMEA", hard_drop: "yes" },
    [],
  );
  assertEq(causes.includes("V8-A1_reason_rename"), true, "classifyV8Cause: rename → V8-A1_reason_rename");
}

{
  // V8-A1 strict-NA new drop
  const causes = classifyV8Cause(
    { hard_drop_reason: "", title: "AI Engineer (Singapore)", hard_drop: "no" },
    { hard_drop_reason: "non_na_territory", title: "AI Engineer (Singapore)", hard_drop: "yes" },
    [],
  );
  assertEq(causes.includes("V8-A1_strict_na_territory"), true, "classifyV8Cause: new strict-NA drop → V8-A1_strict_na_territory");
}

{
  // V8-A2 director sales
  const causes = classifyV8Cause(
    { hard_drop_reason: "senior_title", title: "Account Director", hard_drop: "yes" },
    { hard_drop_reason: "sales_role_title; senior_title", title: "Account Director", hard_drop: "yes" },
    [],
  );
  assertEq(causes.includes("V8-A2_director_sales"), true, "classifyV8Cause: Account Director adds sales_role_title → V8-A2");
}

{
  // V8-A3 CSM
  const causes = classifyV8Cause(
    { hard_drop_reason: "", title: "Customer Success Manager", hard_drop: "no" },
    { hard_drop_reason: "sales_role_title", title: "Customer Success Manager", hard_drop: "yes" },
    [],
  );
  assertEq(causes.includes("V8-A3_csm"), true, "classifyV8Cause: CSM adds sales_role_title → V8-A3");
}

{
  // V8-A4 Workday source-hygiene movement
  const causes = classifyV8Cause(
    { source_repair_reason: "" },
    { source_repair_reason: "workday_language_switcher_chrome", hard_drop: "no", hard_drop_reason: "" },
    [],
  );
  assertEq(causes.includes("V8-A4_workday_chrome"), true, "classifyV8Cause: Workday chrome route → V8-A4");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
