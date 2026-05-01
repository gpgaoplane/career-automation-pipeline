// career-ops/test-firecrawl-extract.mjs
// Phase 2.8 Step 6 — basic tests for firecrawl-extract.mjs
//
// Run from career-ops/:
//   node test-firecrawl-extract.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractCompany,
  EXTRACT_PROMPT,
  promoteCacheFromExtractedJobUrls,
  collectExtractTargets,
} from "./firecrawl-extract.mjs";
import { JOB_LISTING_SCHEMA_V1 } from "./lib/firecrawl.mjs";

test("EXTRACT_PROMPT is non-empty string", () => {
  assert.equal(typeof EXTRACT_PROMPT, "string");
  assert.ok(EXTRACT_PROMPT.length > 30);
});

test("JOB_LISTING_SCHEMA_V1 imported correctly", () => {
  assert.ok(JOB_LISTING_SCHEMA_V1.properties.jobs);
});

test("promoteCacheFromExtractedJobUrls promotes a single ATS detected in job URLs", () => {
  const cache = {
    TestCo: { ats: null, status: "no-ats-found", source_url: "https://example.com/careers" },
  };
  const entry = promoteCacheFromExtractedJobUrls(
    cache,
    "TestCo",
    "https://example.com/careers",
    [{ title: "Engineer", url: "https://jobs.ashbyhq.com/testco/abc123" }],
    new Date("2026-04-30T12:00:00.000Z")
  );

  assert.deepEqual(entry, {
    ats: "ashby",
    slug: "testco",
    discovered_at: "2026-04-30T12:00:00.000Z",
    source_url: "https://example.com/careers",
    discovery_method: "layer-2-feedback",
  });
  assert.equal(cache.TestCo.ats, "ashby");
});

test("collectExtractTargets filters cache entries to current enabled portals.yml companies", () => {
  const portals = {
    tracked_companies: [
      { name: "EnabledCo", enabled: true },
      { name: "DisabledCo", enabled: false },
    ],
  };
  const cache = {
    EnabledCo: { status: "no-ats-found", source_url: "https://enabled.example/jobs" },
    DisabledCo: { status: "no-ats-found", source_url: "https://disabled.example/jobs" },
    OffSampleCo: { status: "no-ats-found", source_url: "https://off.example/jobs" },
    AlreadyFoundCo: { ats: "ashby", slug: "already" },
  };

  assert.deepEqual(collectExtractTargets(cache, portals), [
    { name: "EnabledCo", url: "https://enabled.example/jobs" },
  ]);
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
