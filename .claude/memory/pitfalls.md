---
status: active
type: pitfalls
owner: claude
last-updated: 2026-05-07T00:00:00-04:00
read-if: "you are touching an area Claude has flagged before"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Pitfalls

Append new pitfalls below. Format:

```
## P-<n> — <title> — <ISO-8601>
**Symptom:**
**Root cause:**
**Workaround:**
**Regression test:**
```

<!-- section:entries:start -->

## P-1 — Career URL landing-page silent empty results — 2026-04-20

**Symptom:** A company in `portals.yml` returns zero jobs after running `custom-scraper.mjs`. No errors. No ATS cache entry. All three discovery tiers complete without finding anything.

**Root cause:** The `careers_url` for that company points to a generic careers introduction page (e.g., "Why Work at X" landing page) rather than the actual job listings page. Tier 1 (HTML regex) finds no ATS fingerprint. Tier 2 (Playwright XHR) sees no job-API XHR calls. Tier 3 (generic DOM) finds no job links because the landing page has none — only marketing copy.

**Workaround:**
1. Detect: zero jobs for a company + no entry in `data/ats-discovery-cache.json` after a Tier 2 attempt.
2. Manually visit the `careers_url` in a browser to confirm it's a landing page.
3. Fix: update `careers_url` in `portals.yml` to either:
   - The specific jobs subpage (e.g., `company.com/careers/openings`)
   - The direct ATS URL if discoverable manually (e.g., `jobs.ashbyhq.com/<correct-slug>`)
4. Re-run `node custom-scraper.mjs --company <name>` to verify.

**Regression test:** None automated yet. Manual audit step: after every full scan, scan the export Excel for companies with zero pending rows and verify in the cache JSON that they were attempted (not skipped). See `docs/design/scraping-architecture.md` "Known Limitation: Career URL Landing Pages" section.

## P-2 — First scan data (commit 06bf430) is stale — 2026-04-20

**Symptom:** The 1406 jobs in `pipeline.md` from commit `06bf430` reference companies whose `careers_url` was a different value at scrape time than what's currently in `portals.yml`.

**Root cause:** The first scan on 2026-04-20 ran against the pre-fix `portals.yml` (before the Phase 2 data-quality URL replacement at commit `3429bfa` — see D-2). Some company associations may be incorrect (e.g., a "Runway-adjacent" company's slug pointed to another company's ATS).

**Workaround:** Treat the 1406 jobs as the **before** baseline only — useful for filter performance comparison (commit `06bf430` will be tagged `scan-v1-unfiltered` for reference). Do NOT use as the live pipeline. Clean rescan against current `portals.yml` is the source of truth going forward.

**Regression test:** None. Detection is "scan against committed portals.yml at the time of scan, treat any pre-3429bfa scan as suspect."

## P-3 — Title filters apply at scrape time only, not retroactively — 2026-04-20

**Symptom:** New title filters added to `portals.yml` (e.g., the seniority/region/language exclusions in commit `7cb60ab`) do not retroactively remove already-pending jobs from `pipeline.md`.

**Root cause:** `scan.mjs` and `custom-scraper.mjs` apply `title_filter` only when ingesting new postings. Once a job is in `pipeline.md`, no script re-evaluates it against filters.

**Workaround:** After any filter change, run a clean rescan to get a clean pipeline:
1. Reset `data/pipeline.md` to empty headers
2. Reset `data/scan-history.tsv` to header row only
3. Re-run `scan.mjs` + `custom-scraper.mjs` + `export-jobs.mjs`

**Regression test:** No automated test. Process discipline: every filter change → clean rescan checklist.

## P-4 — URL double-encoding when slug already URL-encoded in cache — 2026-04-30

**Symptom:** `fetchAshby("Jasper%20AI")` returns 404 with body `{"errorCode":"S21",...}`. URL on the wire is `https://api.ashbyhq.com/posting-api/job-board/Jasper%2520AI?...`.

**Root cause:** Layer 1 firecrawl-discover.mjs scans Firecrawl's HTML/links output for ATS hostnames. The captured slug for Jasper was `Jasper%20AI` (already URL-encoded — Ashby's URL form). When `fetchAshby(slug)` calls `encodeURIComponent(slug)`, the `%` becomes `%25`, yielding `Jasper%2520AI`. Ashby treats this as a non-existent slug.

**Workaround:** Use `safeEncode()` helper in `lib/ats-clients.mjs` (commit `8c4a443`):
```javascript
function safeEncode(s) {
  try {
    return encodeURIComponent(decodeURIComponent(s));  // normalize then re-encode
  } catch {
    return encodeURIComponent(s);
  }
}
```
Idempotent — handles both raw (`"Jasper AI"`) and already-encoded (`"Jasper%20AI"`) inputs.

**Regression test:** Manual: `fetchAshby("Jasper%20AI")` and `fetchAshby("Jasper AI")` should both return the same job count. Automated test could be added to `test-ats-clients.mjs`.

## P-5 — resolveAmbiguous treats duplicate candidates as distinct — 2026-04-30

**Symptom:** Layer 1 firecrawl-discover.mjs flags companies as `ambiguous` when their careers page contains ONE Workday tenant linked from multiple places (e.g., F5: 15 candidates all pointing to `ffive.wd5.myworkdayjobs.com`; Monolithic Power: 420 candidates all `monolithicpower.wd12.myworkdayjobs.com`). Real-world coverage drops because these are auto-resolvable single-ATS pages.

**Root cause:** `resolveAmbiguous()` in `firecrawl-discover.mjs` receives the raw output of `detectAllInText()`, which returns one entry per regex match. A page with 15 footer links to the same Workday tenant produces 15 candidates. Without dedup, the function sees "15 candidates" and triggers ambiguity logic. Levenshtein agreement check then fails (none of the 15 match company name within ≤2) → marked ambiguous instead of discovered.

**Workaround:** Dedup candidates by `(provider, slug+host+site)` BEFORE calling `resolveAmbiguous`. After dedup, single-tenant pages have 1 unique candidate → auto-resolved as discovered.

**Regression test:** Add unit tests to `test-firecrawl-discover.mjs` covering: (1) 15 duplicate Workday entries → 1 candidate after dedup → discovered; (2) 2 different ATS slugs of same provider → 2 candidates, ambiguity-or-agreement logic applies; (3) mixed (5 Workday-tenantA + 1 Greenhouse-X) → 2 candidates after dedup.

**Affected companies in Phase 2.8 Step 5 smoke** (would resolve cleanly with fix): Cadence Design Systems, F5, Monolithic Power Systems, Tokyo Electron. (4 of 6 ambiguous cases.)

## P-6 — Greenhouse "embed" synthetic slug from JS library URL — 2026-04-30

**Symptom:** Layer 1 detection on companies that use Greenhouse-embedded job widgets captures slug `embed` (e.g., Vectra AI, Zipline). Slug `embed` is NEVER a real Greenhouse company board — it's the path component of `boards.greenhouse.io/embed/job_board?for={real-slug}` JS library URL.

**Root cause:** `PROVIDER_PATTERNS.greenhouse` regex `/(?:boards|job-boards|boards-api)\.greenhouse\.io\/([^/?#"'\s]+)/i` greedily captures `embed` as the slug because it's the first path segment. The actual company slug appears later as a query string `?for=<slug>`.

**Workaround:** Either:
1. Filter out synthetic slugs in `lib/ats-detect.mjs` — exclude `embed`, `support`, `static`, etc. (deny-list).
2. Update Greenhouse regex to skip `embed/job_board` and capture the `?for=...` query param: `/boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([^/?#"'\s&]+)/i`.

Recommend Option 2 (correct extraction) over Option 1 (deny-list of synthetic names — fragile).

**Regression test:** Add unit test to `test-firecrawl-discover.mjs`: `detectAllInText('<script src="https://boards.greenhouse.io/embed/job_board.js?for=cloudflare">')` should return one match with `slug:"cloudflare"`, NOT `slug:"embed"`.

**Affected companies in Phase 2.8 Step 5 smoke**: Vectra AI (2 candidates → both `embed`), Zipline (3 candidates → all `embed`). (2 of 6 ambiguous cases.) After fix + P-5 fix: AC-2 lands at 41/50 (82%), clearing the ≥75% target cleanly.

## P-7 — iterTargets cache pollution: cached-discovery adapters process companies NOT in current portals.yml — 2026-04-30

**Status:** RESOLVED 2026-04-30 by Codex (handoff `20260430-104400-aa3d`). `iterTargets()` in `scripts/ats-adapters/_lib.mjs` now filters cache entries to currently-enabled portals; cache-only adapters additionally exclude direct-portal companies. `firecrawl-extract.mjs` target selection got the same treatment. Regression test added at `scripts/ats-adapters/test-iter-targets.mjs` (1/1 passing). Keep this entry as historical context for future "why is iterTargets filtered?" questions.

**Symptom:** During Phase 2.8 Step 5 sample-50 smoke run, the post-fix re-run reported "39 unique companies in pipeline" but only 30 of the 50 sampled companies had a routing path (3 direct-ATS + 27 discovered, 20 no-ats-found pre-Layer-2). The 39 number included leakage from cache entries for companies NOT in the sample-50 portals.yml (e.g., Notion AI, Sierra, Synthesia from earlier full-portals smoke runs whose entries persisted in `data/ats-discovery-cache.json`).

**Root cause:** `iterTargets()` in `scripts/ats-adapters/_lib.mjs` walks the entire `data/ats-discovery-cache.json` and yields every entry whose `info.ats === providerName`, with NO filter against the current portals.yml's enabled list. The cache persists across runs; entries from past smoke-50/full-portals runs survive and get processed even when the current run uses a different (or sample-filtered) portals.yml.

**Workaround / Fix:** In `iterTargets()`, before yielding cache entries, build a Set of enabled-company-names from the current portals.yml and skip cache entries not in that Set. Pseudo-fix:
```javascript
const enabledNames = new Set(
  (portals?.tracked_companies || []).filter(e => e?.enabled).map(e => e.name)
);
for (const [companyName, info] of Object.entries(cache || {})) {
  if (!enabledNames.has(companyName)) continue;  // ADD THIS
  // ...rest of cache iteration unchanged
}
```

**Regression test:** Add a unit test in `scripts/ats-adapters/test-iter-targets.mjs` (new file): given `portals = {tracked_companies: [{name:"A", enabled:true}]}` and `cache = {A: {ats:"ashby", slug:"a"}, B: {ats:"ashby", slug:"b"}}`, iterTargets should yield only the A entry — not B.

**Affected component:** Coverage measurement in Step 5 was inflated. True sample-50 coverage at smoke time is 30/50 (60%) max pre-Layer-2, not 39/50 (78%). After Step 6 Layer 2 runs on the 20 no-ats-found, expected lift to 50/50 minus any companies with 0 jobs after title filter.

## P-8 — Layer 1 misses Ashby on JS-embed pages (Ramp, Supabase confirmed) — 2026-04-30

**Status:** RESOLVED 2026-04-30 by Codex (handoff `20260430-104400-aa3d`). `lib/ats-detect.mjs` Ashby pattern expanded to cover `embed.ashbyhq.com` and the `api.ashbyhq.com/posting-api/job-board/{slug}` posting-API URL form. `firecrawl-discover.mjs` now does direct Ashby slug probing on `no-ats-found` candidates (using the company's lowercased one-word name) with Firecrawl-failure fallback. Live verification: Ramp → `ashby/ramp` 119 jobs, Supabase → `ashby/supabase` 46 jobs. Regression coverage added in `test-firecrawl-discover.mjs`. The hypothesized "JS-embed loaded after Firecrawl render" was the actual root cause for the two probed companies; the embed regex expansion alone was insufficient because the embed isn't always present in DOM. Keep this entry for "why are we direct-probing Ashby slugs?" context.

**Symptom:** Ramp (`https://ramp.com/careers`) and Supabase (`https://supabase.com/careers`) were both classified by Layer 1 firecrawl-discover.mjs as `status:"no-ats-found"` during Phase 2.8 Step 5 smoke. **But both companies actually have public Ashby boards:** `https://api.ashbyhq.com/posting-api/job-board/ramp` returns 119 jobs; `https://api.ashbyhq.com/posting-api/job-board/supabase` returns 46 jobs (verified 2026-04-30 via direct curl).

**Root cause hypotheses (need investigation):**
1. **JS-embed loaded after Firecrawl render**: Ramp/Supabase may inject the Ashby `<iframe>` or job list via JavaScript that runs after Firecrawl's default scrape settle time. The `formats:["html","links"]` capture may not include post-JS DOM content if the wait is too short.
2. **Embed URL form regex miss**: Ashby has multiple embed patterns: `jobs.ashbyhq.com/{slug}`, `embed.ashbyhq.com/{slug}`, `assets.ashbyhq.com/...{slug}...`. Current `PROVIDER_PATTERNS.ashby` only catches `jobs.ashbyhq.com/{slug}`.
3. **Drilling skipped relevant inner page**: pickDrillLinks heuristic favors `/careers /jobs /opportunities` paths but Ramp/Supabase may put the Ashby embed at `/about/careers` or similar that the regex missed.
4. **Cloudflare-style anti-bot blocking part of the page**: the careers landing renders a marketing layout but the Ashby embed iframe is Cloudflare-blocked from Firecrawl's IP.

**Workaround / Fix priorities:**
- **Quick fix (high value):** when Layer 2 firecrawl-extract.mjs runs JSON-mode extraction and the returned `jobs[].url` contains an ATS hostname (per `detectAllInText`), it should write a discovery cache entry promoting the company from `no-ats-found` to `discovered:<ats>:<slug>`. Subsequent runs use the direct API. See P-9 below for the architectural enhancement.
- **Investigate Ramp + Supabase specifically**: scrape with `actions:[{wait:5000ms},{scrape}]` and inspect the resulting HTML for `ashbyhq.com` references. Update PROVIDER_PATTERNS.ashby if a new embed URL form is found.
- **Expand drilling** to try `/about/careers`, `/company/jobs`, `/team` variants in addition to current heuristic.

**Regression test:** Add live integration test asserting Ramp + Supabase resolve to `ats:"ashby"` after Layer 1 runs. Currently they resolve to `no-ats-found`.

**Impact:** at minimum Ramp + Supabase from sample-50 are recoverable; likely many of the other 18 no-ats-found companies (Adyen, Canva, MongoDB, IBM, Lenovo, etc.) have similar JS-embed patterns and are recoverable with the same fix. **Could lift coverage from current 30/50 (60%) toward 45-50/50 (90-100%).**

## P-9 — Layer 2 should detect ATS in extracted job URLs and feedback to discovery cache — 2026-04-30

**Status:** RESOLVED 2026-04-30 by Codex (handoff `20260430-104400-aa3d`). `firecrawl-extract.mjs` now promotes a single ATS detected in extracted `jobs[].url` values back into `data/ats-discovery-cache.json` with `discovery_method:"layer-2-feedback"`. Companies with multiple distinct ATSes detected stay `no-ats-found` (avoid bad guesses). Regression coverage added in `test-firecrawl-extract.mjs` (5/5 passing). Keep this entry for "why does Layer 2 write to the discovery cache?" context.

**Symptom:** `firecrawl-extract.mjs` runs JSON-mode extraction on `no-ats-found` companies and writes the resulting jobs straight to pipeline.md — without checking whether the `jobs[].url` values reveal an ATS we already have a fast-path adapter for. So if Ramp's careers page (after JSON-mode extraction) returns 119 jobs each with `url: "https://jobs.ashbyhq.com/ramp/{job-id}"`, Layer 2 just appends those URLs and never tells the discovery cache that Ramp is actually an Ashby company.

**Root cause:** Layer 2 was specced as "for genuinely custom systems" — implicitly assuming Layer 1's `no-ats-found` verdict was correct. With P-8 confirming Layer 1 has gaps, Layer 2 must do its own ATS check on extracted URLs.

**Workaround / Fix:** In `career-ops/firecrawl-extract.mjs` `extractCompany()`, after the scrapeJson call returns `result.json.jobs`:
```javascript
import { detectAllInText } from "./lib/ats-detect.mjs";
const cache = loadCache();
const urlText = result.jobs.map(j => j.url).join("\n");
const detected = detectAllInText(urlText);
const dedupSet = new Set();
const candidates = detected.filter(c => {
  const key = `${c.provider}|${c.slug || ""}|${c.host || ""}|${c.site || ""}`;
  if (dedupSet.has(key)) return false;
  dedupSet.add(key);
  return true;
});
if (candidates.length === 1) {
  // Auto-promote no-ats-found → discovered for next-run direct-API speed
  cache[companyName] = {
    ats: candidates[0].provider,
    slug: candidates[0].slug,
    host: candidates[0].host,
    site: candidates[0].site,
    discovered_at: new Date().toISOString(),
    source_url: companyUrl,
    discovery_method: "layer-2-feedback",
  };
  saveCache(cache);
}
```

**Architectural note:** This makes Layer 2 self-correcting — when Layer 1 missed an ATS, Layer 2's first JSON-mode call (5 credits) detects it and the next full-scan run uses the free direct-API path for that company. Net cost: 5 credits one-time per no-ats-found-but-actually-ATS company; saves ~5 credits/run thereafter.

**Regression test:** Mock scrapeJson to return `{json:{jobs:[{title:"Eng",url:"https://jobs.ashbyhq.com/testco/abc"}]}}`. Call extractCompany("TestCo", "https://example.com"). Assert cache[TestCo] is now `{ats:"ashby", slug:"testco", discovery_method:"layer-2-feedback"}`.

**Cross-reference:** P-8 (the upstream Layer 1 gap that motivates this Layer 2 enhancement). Together P-8 + P-9 form a defense-in-depth: ideally Layer 1 catches all ATSes; if it misses some, Layer 2 catches them on first encounter.

## P-10 — Implementation agents self-verify on the wrong population — 2026-05-07

**Symptom:** An implementation agent claims "I sample-verified all N new drops are legitimate, no false positives." A subsequent independent verification round finds N false positives anyway. Both V8's implementation agent (Round 5 caught 3 FPs) and V9's implementation agent (Round 6 caught 2 FPs) made this exact mistake. V10's brief encoded the lesson explicitly and Round 7 caught only 1 source-hygiene noise case (no real FPs).

**Root cause:** When validating a NEW gate that adds drops, agents instinctively sample the gate's *kept* cohort or sample *location-string* shapes asking "does this look non-NA?". Both populations are wrong:
- Kept cohort cannot contain FPs of the new gate by definition (FPs are wrongly-dropped rows, not wrongly-kept rows).
- Location-string shape sampling answers "is this string non-NA?" but the relevant question is "is this *role* NA-eligible?" Multi-region roles with any NA base ARE NA-eligible regardless of how many non-NA tokens appear.

**Workaround:** When briefing an implementation agent that adds a new gate or detector, explicitly require:
1. Sample the gate's NEW-DROP cohort (rows it added drops on, not preserved rows).
2. For each, ask "is this role NA-eligible / Will-eligible?" — not "does the location string look like X?"
3. Multi-region roles with ANY NA base must be assumed NA-eligible unless JD explicitly excludes NA candidates.
4. Verification briefs (Rounds N+1) MUST sample the same cohort independently — never trust an implementation agent's self-verification of its own new drops.

**Regression test:** No code-level regression test possible (this is a process-level pitfall). Mitigation is procedural: every territory/filter-gate brief from this point forward includes the boilerplate "Sample the affected population, ask the role-eligibility question, not the string-shape question" instruction. See V10 implementation brief and Round 7 verification brief for examples.

**Cross-reference:** Round 5 findings (`docs/audits/2026-05-06-round5-verification-findings.md`) caught V8's FPs; Round 6 (`2026-05-06-round6-verification-findings.md`) caught V9's; Round 7 (`2026-05-07-round7-verification-findings.md`) was the first round where the pre-encoded lesson prevented new FPs.

<!-- section:entries:end -->
