# Project Memory — Career Ops (Will Guo)

Last updated: 2026-04-20

---

## Architecture Decisions

### portals.yml is the canonical company list
- 448 companies total (all from Excel source, minus 2 with no URL)
- 416 enabled, 32 disabled (duplicates, acquired companies, no real presence)
- The "171 relevant" figure from Phase 1 planning was an early estimate — actual build included all companies with valid URLs; `enabled` flags control which get scanned
- Never add company-specific data to scan.mjs or custom-scraper.mjs — always read from portals.yml

### ATS URL distribution in portals.yml (as of 2026-04-20)
- **13 companies** have direct ATS URLs (jobs.ashbyhq.com, job-boards.greenhouse.io, etc.) → scan.mjs handles
- **403 companies** have branded career pages (company.com/careers) → custom-scraper.mjs handles via 3-tier discovery
- Many of the 403 branded-page companies secretly use Greenhouse/Ashby/Lever/Workday — Tier 1/2 discovers and API-scrapes them automatically
- The Excel source has 100+ companies with known ATS-compatible URLs; these will be re-discovered by Tier 1/2 during custom-scraper runs

### Why portals.yml uses branded URLs (not direct ATS URLs)
During the Phase 2 data quality fix (commit 3429bfa), direct ATS URLs that were incorrect (pointing to another company's ATS slug — the "Runway-adjacent" problem) were replaced with each company's branded career page. Branded pages are stable; ATS slugs can change. custom-scraper.mjs handles discovery automatically and caches results (30-day TTL in `data/ats-discovery-cache.json`).

### scan.mjs is upstream — never modify
Handles only Greenhouse/Ashby/Lever when `careers_url` directly contains those ATS domains. After the URL data quality fix, scan.mjs covers ~13 companies. custom-scraper.mjs covers the rest.

### Data layer write rules
- Never write directly to `data/applications.md` to ADD rows — use `batch/tracker-additions/` + `node merge-tracker.mjs`
- `data/pipeline.md` and `data/scan-history.tsv` are written by both scan.mjs and custom-scraper.mjs
- portals.yml is NEVER mutated by any scraper

---

## Known Issues / Watch-Outs

### Career URL landing page problem
Some `careers_url` entries point to a generic careers introduction page, not the actual job listings page. This causes all three tiers to return empty (no ATS fingerprint, no XHR, no job links in DOM). Detection: zero jobs + no ATS cache entry after Tier 2 completes. Fix: update `careers_url` to the specific jobs subpage or direct ATS URL. See `docs/design/scraping-architecture.md` for full notes.

### First scan data (commit 06bf430) is stale
The 1406 jobs tagged as `scan-v1-unfiltered` were produced against the old portals.yml before the data quality URL fix. Some company associations may be incorrect. Treat as "before" baseline for filter comparison only. A clean rescan (reset + re-run) is the source of truth going forward.

### Title filter only applies at scrape time
New filters (seniority, region, language — commit 7cb60ab) apply to future scrapes only. Previously scraped jobs in pipeline.md are not retroactively filtered. A clean rescan after filter changes is required for a clean pipeline.

---

## Filter Rationale

### Seniority exclusions (IC band too high)
Staff and Lead excluded — Will is targeting mid-to-senior IC roles (Senior, Principal), not the top IC band. VP/Director/Chief/Head Of excluded — management/C-suite, not applicable.

### Region exclusions
US and Canada only for work base. China/HK/Chinese-speaking regions acceptable. All others excluded. Filter catches roles that include location in the title (e.g., "Enterprise AE, Europe") — roles with no location in the title are handled at the evaluation phase.

### Language exclusions
English and Mandarin/Chinese only. 16 language adjectives cover both "German speaking" and ", German" suffix formats in job titles.

---

## Session Handoff Notes

**2026-04-20:** Phase 2 scripts complete (custom-scraper.mjs, export-jobs.mjs). Filters expanded. First scan data stale. Next: tag scan-v1-unfiltered → reset pipeline.md + scan-history.tsv → run scan.mjs → run custom-scraper.mjs (403 branded pages) → re-run export-jobs.mjs. After rescan: audit empty-result companies for landing page URL issue.
