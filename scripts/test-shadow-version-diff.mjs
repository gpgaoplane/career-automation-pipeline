#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "node:path";

import { buildVersionDiff, normalizeUrl, rowKey } from "./shadow-version-diff.mjs";

const REPO_ROOT = resolve(".");
const outputXlsx = resolve(REPO_ROOT, "career-ops", "output", "shadow-version-diff-test.xlsx");
const summaryJson = resolve(REPO_ROOT, "docs", "audits", "shadow-version-diff-test-summary.json");

function countWhere(rows, predicate) {
  return rows.filter(predicate).length;
}

async function main() {
  assert.equal(normalizeUrl("https://Jobs.AshbyHQ.com/acme/abc?locationId=123#apply/"), "https://jobs.ashbyhq.com/acme/abc");
  assert.notEqual(
    rowKey({ company: "CoreWeave", title: "AI Engineer", url: "https://coreweave.com/careers/job" }),
    rowKey({ company: "CoreWeave", title: "Solutions Architect", url: "https://coreweave.com/careers/job" }),
  );

  const result = await buildVersionDiff({ runDate: "2026-05-01", outputXlsx, summaryJson, allowOverwrite: true, versions: {
    v3: resolve(REPO_ROOT, "career-ops", "output", "production-filter-refinement-review-2026-05-01-v3.xlsx"),
    v4: resolve(REPO_ROOT, "career-ops", "output", "production-filter-refinement-review-2026-05-01-v4.xlsx"),
    v5: resolve(REPO_ROOT, "career-ops", "output", "production-filter-refinement-review-2026-05-01-v5.xlsx"),
  } });

  assert.equal(result.versions.v3.counts.shadow_rows, 956);
  assert.equal(result.versions.v4.counts.shadow_rows, 956);
  assert.equal(result.versions.v5.counts.shadow_rows, 956);
  assert.equal(result.versions.v3.counts.hard_drops, 586);
  assert.equal(result.versions.v4.counts.hard_drops, 543);
  assert.equal(result.versions.v5.counts.hard_drops, 514);
  assert.equal(result.versions.v5.counts.source_repair_review_sheet_rows, 206);
  assert.equal(result.versions.v5.counts.source_repair_review_shadow_rows, 192);

  assert.equal(result.v3v4.unmatchedRows.length, 0);
  assert.equal(result.v4v5.unmatchedRows.length, 0);
  assert.equal(countWhere(result.v3v4.changedRows, (r) => /hard_drop_added/.test(r.change_type)), 35);
  assert.equal(countWhere(result.v3v4.changedRows, (r) => /hard_drop_removed/.test(r.change_type)), 78);
  assert.equal(countWhere(result.v4v5.changedRows, (r) => /hard_drop_added/.test(r.change_type)), 0);
  assert.equal(countWhere(result.v4v5.changedRows, (r) => /hard_drop_removed/.test(r.change_type)), 29);

  assert.ok(fs.existsSync(outputXlsx));
  assert.ok(fs.existsSync(summaryJson));
  fs.rmSync(outputXlsx, { force: true });
  fs.rmSync(summaryJson, { force: true });
  console.log("shadow-version-diff tests passed (15/15)");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
