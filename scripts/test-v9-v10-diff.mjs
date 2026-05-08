#!/usr/bin/env node
// V9-v10-diff regression-baseline gate. Verifies every V9→V10 hard_drop
// status flip and reason change is tagged to V10-A1 (no silent flips).

import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVersionDiff, classifyV10Cause } from "./v9-v10-diff.mjs";

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

const outputXlsx = resolve(CAREER_OPS, "output", "production-filter-refinement-v9-v10-diff-test.xlsx");
const summaryJson = resolve(REPO_ROOT, "docs", "audits", "shadow-v9-v10-diff-test-summary.json");

const result = await buildVersionDiff({
  runDate: "2026-05-01",
  outputXlsx,
  summaryJson,
  allowOverwrite: true,
  versions: {
    v9: resolve(CAREER_OPS, "output", "production-filter-refinement-review-2026-05-01-v9.xlsx"),
    v10: resolve(CAREER_OPS, "output", "production-filter-refinement-review-2026-05-01-v10.xlsx"),
  },
});

assertEq(fs.existsSync(outputXlsx), true, "v9-v10 diff workbook written");
assertEq(fs.existsSync(summaryJson), true, "v9-v10 diff summary JSON written");

// V9 → V10 macro check: territory_hard_drops shifts modestly (V9=107, V10≈105–108).
// Net delta is small: V10 closes 2 confirmed FPs (-2) and may reveal a small
// number of multi-section side-effect adds (+1 to +3) where V9-2's
// company-context offices line was outvoting a canonical NON_NA section.
const fromTerr = Number(result.summary.counts.from_territory_hard_drops);
const toTerr = Number(result.summary.counts.to_territory_hard_drops);
assertEq(fromTerr === 107, true, `V9 baseline territory_hard_drops = 107 (got ${fromTerr})`);
assertGe(toTerr, fromTerr - 5, "V9→V10 territory drops did not regress wildly downward");
assertEq(toTerr <= fromTerr + 5, true, "V9→V10 territory drops did not balloon upward (gate is targeted)");

// V10-A1 attribution: at minimum the 2 confirmed FP closures (GitLab Eng Mgr,
// ElevenLabs FDE) — the named binding contract from Round 6.
assertGe(Number(result.summary.counts.v10_a1_attributed_rows), 2,
  "V10-A1 symmetric gate attribution covers 2+ FP closures (GitLab Eng Mgr + ElevenLabs FDE)");

// Regression baseline: zero OTHER unattributed flips.
assertEq(Number(result.summary.counts.v10_other_unattributed_rows) === 0, true,
  "V10 OTHER unattributed flips = 0 (regression-baseline gate)");

// classifyV10Cause direct unit tests
{
  // V10-A1 closure: V9 dropped on non_na_territory with location-section
  // anchor evidence; V10 keeps. Expected cause: V10-A1_symmetric_gate_closure.
  const causes = classifyV10Cause(
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NON_NA EMEA: Remote, EMEA; Remote, US-Southea | anchor:NON_NA EMEA: location-section: Remote, EMEA; Remote, US-Southeast",
    },
    {
      hard_drop: "no",
      hard_drop_reason: "",
      territory_region: "UNKNOWN",
      territory_evidence: "",
    },
    [],
  );
  assertEq(causes.includes("V10-A1_symmetric_gate_closure"), true,
    "classifyV10Cause: GitLab-shape closure with location-section anchor evidence → V10-A1");
}

{
  // V10-A1 closure inferred: V9 dropped on non_na_territory; V10 keeps.
  // Territory transition NON_NA → UNKNOWN, but V9 evidence does NOT contain
  // the `location-section:` marker (truncated to top-3 section-token entries
  // in workbook). Expected cause: V10-A1_symmetric_gate_closure_inferred.
  const causes = classifyV10Cause(
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NA San Francisco: ... | section:NA New York: ... | section:NON_NA Brazil: ...",
    },
    {
      hard_drop: "no",
      hard_drop_reason: "",
      territory_region: "UNKNOWN",
      territory_evidence: "",
    },
    [],
  );
  assertEq(causes.includes("V10-A1_symmetric_gate_closure_inferred"), true,
    "classifyV10Cause: ElevenLabs-shape closure (no location-section in evidence) → V10-A1 inferred");
}

{
  // V10-A1 side-effect add: V9 kept (territory NA from competing
  // location-section offices line); V10 drops on non_na_territory because the
  // gate suppressed the offices line, revealing the canonical NON_NA section.
  // Expected cause: V10-A1_symmetric_gate_side_effect_add.
  const causes = classifyV10Cause(
    {
      hard_drop: "no",
      hard_drop_reason: "",
      territory_region: "NA",
      territory_evidence: "section:NA Toronto: ... | section:NA New York: ... | section:NON_NA Japan: ...",
    },
    {
      hard_drop: "yes",
      hard_drop_reason: "non_na_territory",
      territory_region: "NON_NA",
      territory_evidence: "section:NA Toronto: ... | section:NON_NA Japan: ...",
    },
    [],
  );
  assertEq(causes.includes("V10-A1_symmetric_gate_side_effect_add"), true,
    "classifyV10Cause: NA → NON_NA territory flip → V10-A1 side-effect add");
}

{
  // Negative: no V9→V10 change should produce no causes.
  const causes = classifyV10Cause(
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
    "classifyV10Cause: no V9→V10 change → empty causes (no false attribution)");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
