// career-ops/test-firecrawl-discover.mjs
// Phase 2.8 Step 4 — unit + integration tests for firecrawl-discover.mjs
//
// Run from career-ops/:
//   node test-firecrawl-discover.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectAllInText, detectProvider, PROVIDER_PATTERNS } from "./lib/ats-detect.mjs";
import { resolveAmbiguous, levenshtein, discoverCompany } from "./firecrawl-discover.mjs";

test("PROVIDER_PATTERNS map has 8 entries", () => {
  assert.equal(Object.keys(PROVIDER_PATTERNS).length, 8);
});

test("detectProvider — direct-ATS URLs each provider", () => {
  const cases = [
    ["https://boards.greenhouse.io/cloudflare", "greenhouse", "cloudflare"],
    ["https://job-boards.greenhouse.io/heygen", "greenhouse", "heygen"],
    ["https://jobs.ashbyhq.com/Abridge", "ashby", "Abridge"],
    ["https://jobs.lever.co/palantir", "lever", "palantir"],
    ["https://apply.workable.com/pony-dot-ai/", "workable", "pony-dot-ai"],
    ["https://acme.recruitee.com", "recruitee", "acme"],
    ["https://jina-ai.jobs.personio.de/", "personio", "jina-ai"],
    ["https://careers.smartrecruiters.com/visa", "smartrecruiters", "visa"],
  ];
  for (const [url, expectedProvider, expectedSlug] of cases) {
    const r = detectProvider(url);
    assert.ok(r, `${url} should match`);
    assert.equal(r.provider, expectedProvider);
    if (r.slug !== undefined) assert.equal(r.slug, expectedSlug);
  }
});

test("detectProvider — Workday returns {host, site}", () => {
  const r = detectProvider("https://fis.wd5.myworkdayjobs.com/SearchJobs");
  assert.equal(r.provider, "workday-cxs");
  assert.equal(r.host, "fis.wd5.myworkdayjobs.com");
  assert.equal(r.site, "SearchJobs");
});

test("detectProvider — non-ATS URL returns null", () => {
  assert.equal(detectProvider("https://example.com/careers"), null);
  assert.equal(detectProvider("https://www.openai.com/careers"), null);
});

test("detectAllInText — finds multiple ATS markers in HTML body", () => {
  const html = `
    <html>
      <body>
        <a href="https://boards.greenhouse.io/cloudflare/jobs/123">Apply</a>
        <iframe src="https://jobs.ashbyhq.com/runway"></iframe>
        <script>const url = "https://acme.recruitee.com";</script>
      </body>
    </html>
  `;
  const found = detectAllInText(html);
  assert.ok(found.length >= 3, `should find ≥3, got ${found.length}`);
  const providers = new Set(found.map((f) => f.provider));
  assert.ok(providers.has("greenhouse"));
  assert.ok(providers.has("ashby"));
  assert.ok(providers.has("recruitee"));
});

test("levenshtein — basic distances", () => {
  assert.equal(levenshtein("abc", "abc"), 0);
  assert.equal(levenshtein("abc", "abd"), 1);
  assert.equal(levenshtein("abc", "ad"), 2);
  assert.equal(levenshtein("kitten", "sitting"), 3);
});

test("resolveAmbiguous — single candidate returns it", () => {
  const r = resolveAmbiguous(
    [{ provider: "greenhouse", slug: "cloudflare", matchedAt: 100 }],
    "Cloudflare"
  );
  assert.equal(r.winner.slug, "cloudflare");
  assert.equal(r.ambiguous, false);
});

test("resolveAmbiguous — strong company-name agreement wins", () => {
  // Cloudflare careers page might link to greenhouse/cloudflare AND greenhouse/somevendor
  const r = resolveAmbiguous(
    [
      { provider: "greenhouse", slug: "somevendor", matchedAt: 50 },
      { provider: "greenhouse", slug: "cloudflare", matchedAt: 200 },
    ],
    "Cloudflare"
  );
  assert.equal(r.winner.slug, "cloudflare", "should pick the slug matching company name");
  assert.equal(r.ambiguous, false);
});

test("resolveAmbiguous — no agreement → ambiguous=true, no winner", () => {
  // Two unrelated ATS slugs — neither matches "Cloudflare"
  const r = resolveAmbiguous(
    [
      { provider: "greenhouse", slug: "vendor1", matchedAt: 50 },
      { provider: "ashby", slug: "vendor2", matchedAt: 200 },
    ],
    "Cloudflare"
  );
  assert.equal(r.winner, null, "no winner");
  assert.equal(r.ambiguous, true, "should mark ambiguous");
  assert.equal(r.candidates.length, 2);
});

test("resolveAmbiguous — empty candidates returns null winner, ambiguous=false", () => {
  const r = resolveAmbiguous([], "Cloudflare");
  assert.equal(r.winner, null);
  assert.equal(r.ambiguous, false);
});

// Live integration test — burns 1 Firecrawl credit
test("discoverCompany(Cloudflare) — finds greenhouse/cloudflare via Layer 1", async () => {
  const cache = {};
  const r = await discoverCompany(
    { name: "Cloudflare", careers_url: "https://www.cloudflare.com/careers/" },
    cache,
    { force: true }
  );
  if (r.action === "fetch-failed") {
    console.warn(`  [Live test SKIP-style: Firecrawl fetch failed: ${r.error}]`);
    return;
  }
  assert.equal(r.action, "discovered", `expected discovered, got ${r.action}`);
  assert.equal(r.entry.ats, "greenhouse");
  // Cloudflare's slug is "cloudflare" or similar
  assert.match(r.entry.slug, /cloudflare/i);
  assert.ok(cache.Cloudflare, "cache should be populated");
}, { timeout: 30000 });
