#!/usr/bin/env node
// V8-v9-diff regression-baseline gate. Verifies every V8→V9 hard_drop status
// flip and reason change is tagged to V9-A1/A2 (no silent flips).

import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVersionDiff, classifyV9Cause } from "./v8-v9-diff.mjs";

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

const outputXlsx = resolve(CAREER_OPS, "output", "production-filter-refinement-v8-v9-diff-test.xlsx");
const summaryJson = resolve(REPO_ROOT, "docs", "audits", "shadow-v8-v9-diff-test-summary.json");

const result = await buildVersionDiff({
  runDate: "2026-05-01",
  outputXlsx,
  summaryJson,
  allowOverwrite: true,
  versions: {
    v8: resolve(CAREER_OPS, "output", "production-filter-refinement-review-2026-05-01-v8.xlsx"),
    v9: resolve(CAREER_OPS, "output", "production-filter-refinement-review-2026-05-01-v9.xlsx"),
  },
});

assertEq(fs.existsSync(outputXlsx), true, "v8-v9 diff workbook written");
assertEq(fs.existsSync(summaryJson), true, "v8-v9 diff summary JSON written");

// V8 → V9 macro check: territory_hard_drops shifts modestly (V8=101, V9~107).
// Net delta is small because V9 fixes 3 FPs (-3) AND adds named-cohort recovery
// + ancillary location-section captures (+6).
const fromTerr = Number(result.summary.counts.from_territory_hard_drops);
const toTerr = Number(result.summary.counts.to_territory_hard_drops);
assertEq(fromTerr === 101, true, `V8 baseline territory_hard_drops = 101 (got ${fromTerr})`);
assertGe(toTerr, fromTerr - 5, "V8→V9 territory drops did not regress wildly downward");

// V9-A1 attribution: 3 confirmed Round 5 FPs (Vercel x2 + XBOW) closed.
assertGe(Number(result.summary.counts.v9_a1_attributed_rows), 3,
  "V9-A1 NA token expansion attribution covers 3+ FP closures (Vercel x2 + XBOW)");

// V9-A2 attribution: at minimum the Cohere FDE Infrastructure named-cohort
// recovery, plus any additional location-section anchor captures.
assertGe(Number(result.summary.counts.v9_a2_attributed_rows), 1,
  "V9-A2 location-section anchor attribution covers 1+ named-cohort recovery (Cohere FDE Infrastructure Specialist)");

// Regression baseline: zero OTHER unattributed flips.
assertEq(Number(result.summary.counts.v9_other_unattributed_rows) === 0, true,
  "V9 OTHER unattributed flips = 0 (regression-baseline gate)");

// classifyV9Cause direct unit tests
{
  // V9-A1: V8 dropped on non_na_territory with parens-list (SF, NY, ...) evidence;
  // V9 keeps. Expected cause: V9-A1_na_token_expansion.
  const causes = classifyV9Cause(
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NON_NA London: f one of our offices (SF, NY, London, or Berlin), the ro",
    },
    {
      hard_drop: "no",
      hard_drop_reason: "",
      territory_region: "UNKNOWN",
      territory_evidence: "",
    },
    [],
  );
  assertEq(causes.includes("V9-A1_na_token_expansion"), true,
    "classifyV9Cause: parens-list (SF, NY, ...) FP closure → V9-A1");
}

{
  // V9-A1: coast-descriptor evidence (US East Coast).
  const causes = classifyV9Cause(
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NON_NA Europe: Europe (Remote); US East Coast",
    },
    {
      hard_drop: "no",
      hard_drop_reason: "",
      territory_region: "NA",
      territory_evidence: "anchor:NA US East Coast: location-section: Europe (Remote); US East Coast",
    },
    [],
  );
  assertEq(causes.includes("V9-A1_na_token_expansion"), true,
    "classifyV9Cause: coast-descriptor 'US East Coast' FP closure → V9-A1");
}

{
  // V9-A2: V8 kept (territory UNKNOWN); V9 drops on non_na_territory with
  // location-section anchor evidence.
  const causes = classifyV9Cause(
    {
      hard_drop: "no",
      hard_drop_reason: "",
      territory_region: "UNKNOWN",
      territory_evidence: "",
    },
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "anchor:NON_NA Japan: location-section: Japan; Korea; Singapore",
    },
    [],
  );
  assertEq(causes.includes("V9-A2_location_section_anchor"), true,
    "classifyV9Cause: location-section anchor flip UNKNOWN → NON_NA → V9-A2");
}

{
  // Negative: existing V7→V8-style rename (non_na_territory same) should NOT
  // attribute to V9. No status flip means classifier returns empty.
  const causes = classifyV9Cause(
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NON_NA Singapore: title:Singapore",
    },
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NON_NA Singapore: title:Singapore",
    },
    [],
  );
  assertEq(causes.length, 0,
    "classifyV9Cause: no V8→V9 change → empty causes (no false attribution)");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
