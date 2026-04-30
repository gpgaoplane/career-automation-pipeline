---
status: active
type: pitfalls
owner: claude
last-updated: 2026-04-30T00:00:00-04:00
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

<!-- section:entries:end -->
