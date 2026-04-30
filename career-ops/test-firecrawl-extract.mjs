// career-ops/test-firecrawl-extract.mjs
// Phase 2.8 Step 6 — basic tests for firecrawl-extract.mjs
//
// Run from career-ops/:
//   node test-firecrawl-extract.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCompany, EXTRACT_PROMPT } from "./firecrawl-extract.mjs";
import { JOB_LISTING_SCHEMA_V1 } from "./lib/firecrawl.mjs";

test("EXTRACT_PROMPT is non-empty string", () => {
  assert.equal(typeof EXTRACT_PROMPT, "string");
  assert.ok(EXTRACT_PROMPT.length > 30);
});

test("JOB_LISTING_SCHEMA_V1 imported correctly", () => {
  assert.ok(JOB_LISTING_SCHEMA_V1.properties.jobs);
});

// Live integration test — burns 5 Firecrawl credits (JSON-mode)
// Skip-style on failure since this is real-world API
test("extractCompany live test on Shopify careers page", async () => {
  const r = await extractCompany("Shopify", "https://www.shopify.com/careers", {});
  if (!r.ok) {
    console.warn(`  [Shopify extract failed: ${r.error?.slice(0, 80)}]`);
    return;
  }
  assert.ok(Array.isArray(r.jobs), "result.jobs must be array");
  // Shopify typically has many jobs on the careers landing
  if (r.jobs.length === 0) {
    console.warn(`  [Shopify returned 0 jobs — may need actions/drilling]`);
  } else {
    console.log(`  [Shopify extract: ${r.jobs.length} jobs]`);
    // First job should have title + url
    assert.ok(r.jobs[0].title);
  }
}, { timeout: 60000 });
