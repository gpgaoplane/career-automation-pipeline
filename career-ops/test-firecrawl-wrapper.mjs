// career-ops/test-firecrawl-wrapper.mjs
// Phase 2.8 Step 1 — unit tests for lib/firecrawl.mjs
//
// Covers per implementation plan v2 §6.1:
//   - JOB_LISTING_SCHEMA_V1 shape
//   - cost-tracking accumulator (markdown=1cr, json-mode=5cr)
//   - --max-credits cap behavior (CreditCapExhaustedError + fallback queue write)
//   - 5xx forced-failure → retries 3× then fallback queue (RI-8 forced-failure subtest)
//   - 4xx fail-fast → fallback queue, no retry
//
// Run from `career-ops/`:
//   node test-firecrawl-wrapper.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COST_LOG = resolve(__dirname, "data", "firecrawl-cost.tsv");
const FALLBACK_QUEUE = resolve(__dirname, "data", "firecrawl-fallback-queue.tsv");

// Set a dummy API key BEFORE importing the wrapper (so getApiKey() doesn't throw)
process.env.FIRECRAWL_API_KEY = "test-key-fake";

const {
  scrape,
  scrapeJson,
  JOB_LISTING_SCHEMA_V1,
  MAX_CREDITS_DEFAULT,
  setMaxCredits,
  getCreditsSpent,
  resetCostTracking,
  CreditCapExhaustedError,
  FirecrawlError,
} = await import("./lib/firecrawl.mjs");

function clearArtifacts() {
  for (const p of [COST_LOG, FALLBACK_QUEUE]) {
    try {
      rmSync(p);
    } catch {}
  }
  resetCostTracking();
  setMaxCredits(MAX_CREDITS_DEFAULT);
}

function mockFetch(handler) {
  const orig = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = orig;
  };
}

test("JOB_LISTING_SCHEMA_V1 has required structure", () => {
  assert.equal(JOB_LISTING_SCHEMA_V1.type, "object");
  assert.ok(JOB_LISTING_SCHEMA_V1.properties.jobs);
  assert.equal(JOB_LISTING_SCHEMA_V1.properties.jobs.type, "array");
  assert.deepEqual(JOB_LISTING_SCHEMA_V1.properties.jobs.items.required, ["title", "url"]);
});

test("scrape() logs 1 credit on success and accumulates", async () => {
  clearArtifacts();
  const restore = mockFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: { markdown: "test markdown content", links: [] } }),
    text: async () => "",
  }));
  try {
    const result = await scrape("https://example.com");
    assert.equal(result._cost.credits, 1);
    assert.equal(result._cost.mode, "markdown");
    assert.equal(getCreditsSpent(), 1);
    assert.equal(result.markdown, "test markdown content");
    assert.ok(existsSync(COST_LOG), "cost log should be written");
    const log = readFileSync(COST_LOG, "utf8");
    assert.match(log, /\tmarkdown\t1\t/, "cost log row should mark markdown 1 credit");

    // Second call accumulates
    await scrape("https://example.com/2");
    assert.equal(getCreditsSpent(), 2);
  } finally {
    restore();
  }
});

test("scrapeJson() logs 5 credits on success", async () => {
  clearArtifacts();
  const restore = mockFetch(async (url, opts) => {
    const body = JSON.parse(opts.body);
    // Verify request shape per verification doc Q1+Q4
    assert.deepEqual(body.formats, ["json"]);
    assert.ok(body.jsonOptions?.schema, "jsonOptions.schema must be set");
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { json: { jobs: [{ title: "Eng", url: "https://x.com/1" }] } } }),
      text: async () => "",
    };
  });
  try {
    const result = await scrapeJson(
      "https://example.com",
      JOB_LISTING_SCHEMA_V1,
      "extract jobs"
    );
    assert.equal(result._cost.credits, 5);
    assert.equal(result._cost.mode, "json");
    assert.equal(getCreditsSpent(), 5);
    assert.ok(result.json.jobs);
  } finally {
    restore();
  }
});

test("scrape() throws CreditCapExhaustedError when cap exceeded; writes fallback queue", async () => {
  clearArtifacts();
  setMaxCredits(0);
  // No fetch needed — cap check happens before request

  await assert.rejects(
    () => scrape("https://example.com", { company: "TestCo" }),
    (err) => {
      assert.ok(err instanceof CreditCapExhaustedError);
      assert.equal(err.code, "CREDIT_CAP_EXHAUSTED");
      return true;
    }
  );

  assert.ok(existsSync(FALLBACK_QUEUE), "fallback queue should be written");
  const queue = readFileSync(FALLBACK_QUEUE, "utf8");
  assert.match(queue, /TestCo/, "queue row should include company");
  assert.match(queue, /max-credits-exhausted/, "queue row should mark reason");
  assert.match(queue, /\t1\t/, "queue row should mark layer=1 by default");
});

test("scrape() retries 3× on 5xx then writes fallback queue (RI-8 subtest)", async () => {
  clearArtifacts();
  let attempts = 0;
  const restore = mockFetch(async () => {
    attempts++;
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: "Service Unavailable" }),
      text: async () => "Service Unavailable",
    };
  });
  try {
    await assert.rejects(
      () => scrape("https://example.com", { company: "TestCo", layer: "enrich" }),
      (err) => {
        assert.ok(err instanceof FirecrawlError);
        assert.equal(err.statusCode, 503);
        return true;
      }
    );
    assert.equal(attempts, 4, "should attempt 4 times (initial + 3 retries)");
    assert.ok(existsSync(FALLBACK_QUEUE));
    const queue = readFileSync(FALLBACK_QUEUE, "utf8");
    assert.match(queue, /firecrawl-5xx-retries-exhausted/, "queue row should mark 5xx-exhausted reason");
    assert.match(queue, /\tenrich\t/, "queue row should mark layer=enrich");
  } finally {
    restore();
  }
}, { timeout: 15000 });

test("scrape() fails fast on 4xx without retry; writes fallback queue", async () => {
  clearArtifacts();
  let attempts = 0;
  const restore = mockFetch(async () => {
    attempts++;
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: "Not Found" }),
      text: async () => "Not Found",
    };
  });
  try {
    await assert.rejects(
      () => scrape("https://example.com"),
      (err) => err instanceof FirecrawlError && err.statusCode === 404
    );
    assert.equal(attempts, 1, "should not retry 4xx");
    const queue = readFileSync(FALLBACK_QUEUE, "utf8");
    assert.match(queue, /no-retry-4xx/);
  } finally {
    restore();
  }
});

test("scrape() with actions passes actions through to request body", async () => {
  clearArtifacts();
  let capturedBody = null;
  const restore = mockFetch(async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { markdown: "ok" } }),
      text: async () => "",
    };
  });
  try {
    const actions = [
      { type: "click", selector: "button.view-jobs" },
      { type: "wait", milliseconds: 2000 },
      { type: "scrape" },
    ];
    await scrape("https://example.com", { actions, onlyMainContent: true });
    assert.deepEqual(capturedBody.actions, actions);
    assert.equal(capturedBody.onlyMainContent, true);
  } finally {
    restore();
  }
});

test("scrapeJson() rejects without schema arg", async () => {
  clearArtifacts();
  await assert.rejects(
    () => scrapeJson("https://example.com", null),
    (err) => /schema is required/.test(err.message)
  );
});
