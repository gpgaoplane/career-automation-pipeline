---
status: active
type: pitfalls
owner: claude
last-updated: 2026-04-28T18:54:45-04:00
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

<!-- section:entries:end -->
