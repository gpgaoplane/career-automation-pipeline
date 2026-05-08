#!/usr/bin/env node
// V10 cohort-shape assertions. Asserts V10 metrics within tightened ranges.
// Fails LOUDLY if any range is breached, forcing an explicit decision
// (intentional rule change vs broken behavior).
//
// V10 keeps `territory_hard_drops` in the V9 [95, 110] band (V9=107, V10=108).
// V10-1 closes 2 confirmed Round 6 FPs (GitLab Eng Mgr Workflow Catalog,
// ElevenLabs FDE) and surfaces 3 multi-section side-effect captures
// (Cohere SA Japan, Cohere FDE Middle East, Trimble PM listing-chrome) where
// V9-2's offices-line anchor was outvoting a canonical NON_NA section.

import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const V10_SUMMARY = resolve(REPO_ROOT, "docs", "audits", "2026-05-07-production-filter-refinement-v10-summary.json");
const BASELINE_SHA = "7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e";

let passed = 0;
let failed = 0;

function assertEq(actual, expected, msg) {
  if (actual === expected) {
    passed++;
    console.log(`  OK: ${msg} (got ${actual})`);
  } else {
    failed++;
    console.log(`  FAIL: ${msg}\n    expected: ${expected}\n    got:      ${actual}`);
  }
}

function assertBetween(actual, lo, hi, msg) {
  const n = Number(actual);
  if (Number.isFinite(n) && n >= lo && n <= hi) {
    passed++;
    console.log(`  OK: ${msg} (got ${n} in [${lo}, ${hi}])`);
  } else {
    failed++;
    console.log(`  FAIL: ${msg}\n    expected in [${lo}, ${hi}]\n    got: ${actual}`);
  }
}

const summary = JSON.parse(fs.readFileSync(V10_SUMMARY, "utf8"));
const c = summary.counts;

// Pipeline shape
assertBetween(c.pipeline_rows, 925, 940, "pipeline_rows in expected post-dedup range");
assertEq(summary.baseline_sha_after, BASELINE_SHA, "baseline SHA preserved (after)");
assertEq(summary.baseline_sha_before, BASELINE_SHA, "baseline SHA preserved (before)");
assertEq(summary.baseline_unchanged, true, "baseline unchanged");

// Hard drop categories — V8 ranges per plan §V8-B4
assertBetween(c.sales_hard_drops, 80, 100,
  "sales_hard_drops: V7=80; V8 expected with W-2 (mostly reason-relabel) and W-3 (CSM additions, +5-15)");
assertBetween(c.location_hard_drops, 340, 380, "location_hard_drops stable");
assertBetween(c.yoe_hard_drops, 140, 160, "yoe_hard_drops stable");
assertBetween(c.comp_hard_drops, 0, 5, "comp_hard_drops stable");

// V10 territory_hard_drops: maintained in V9's [95, 110] band.
//
// Composition (V9=107 → V10=108):
//   - Round 6 closed 2 confirmed V9-2 FPs (GitLab Engineering Manager
//     Workflow Catalog with `Remote, EMEA; Remote, US-Southeast`; ElevenLabs
//     Forward Deployed Engineer with `San Francisco; Brazil; France; India;
//     New York`) via V10-1 symmetric gate (NA-absence OR NON_NA strict-
//     majority gate the implicit location-section anchor).
//   - V10-1 surfaced 3 multi-section side-effect captures (Cohere SA Japan,
//     Cohere FDE Middle East, Trimble PM listing-chrome) where V9-2's
//     company-context offices-line anchor was outvoting a canonical NON_NA
//     section. Sample-verified all 3 are legitimate NON_NA captures (Japan-
//     and Middle East-only roles; Trimble PM is a search-results page).
//
// Range [95, 110] still holds with V10=108. Wider deviation implies a
// regression.
assertBetween(c.territory_hard_drops, 95, 110,
  "territory_hard_drops V10: maintained in V9's [95,110] band; expected ~108 (V9=107 - 2 FPs + 3 multi-section side-effect captures via V10-1 gate)");

// Source repair shape: V7=184, V10 unchanged (no V10 source-hygiene changes).
assertBetween(c.source_repair_review_rows, 180, 215,
  "source_repair_review_rows: V7=184, V10 unchanged (no V10 source-hygiene changes)");

// Validation findings
assertBetween(c.validation_findings, 0, 4, "validation_findings within tolerance");
assertEq(c.validation_blocking_findings, 0, "no blocking validation findings");

// Total shadow hard drops: V9=537, V10 actual ~538 (2 FPs removed, 3 side-effect adds).
assertBetween(c.shadow_hard_drops, 510, 600,
  "total shadow_hard_drops V10: V9=537, V10 actual ~538 (V10-1 -2 FPs + 3 multi-section side-effect adds)");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
