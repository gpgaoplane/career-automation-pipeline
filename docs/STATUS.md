# Project Status — Career Ops (Will Guo Job Search Pipeline)

**Last Updated:** 2026-04-20
**Current Phase:** Phase 2 — Custom Scripts

## Done
- [x] career-ops cloned at `career-ops/` — on main, clean, npm deps installed
- [x] Knowledge bank ingested (`context/knowledge bank/` — 5 folders, 12+ files)
- [x] Companies source loaded (`context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 companies, 171 relevant filtered)
- [x] CLAUDE.md, `.claude/rules/pipeline.md`, `.claude/rules/architecture.md` created
- [x] Project memory bootstrapped
- [x] **Phase 1 complete** — cv.md, config/profile.yml, modes/_profile.md, portals.yml (448 companies), data/ initialized (commit 8b847c9)
- [x] Scoring criteria refined — Canadian on-site rules, US remote-only, comp bands (commits d4ecf6f, 5ef75ad)
- [x] `docs/design/pipeline-flow.md` created and committed — 7-section technical reference
- [x] `docs/design/scraping-architecture.md` updated — ATS Discovery Layer section added
- [x] **`custom-scraper.mjs` built** — 3-tier ATS discovery (commit a168147):
  - Tier 1: plain fetch + HTML regex (Greenhouse/Ashby/Lever/Workday patterns)
  - Tier 2: Playwright XHR intercept for JS-rendered ATS widgets
  - Tier 3: generic DOM fallback (cheerio + Playwright)
  - Cache: `data/ats-discovery-cache.json` (30-day TTL, portals.yml never mutated)
  - Tested: Runway dry-run → Tier 2 found Ashby, 4 offers extracted
- [x] `package.json` npm scripts — `custom-scrape`, `full-scan` added; `cheerio` dep added

- [x] portals.yml URL data quality fix — 22 URL corrections + 17 disables (39 total), Runway-adjacent pattern fixed across all groups (commit 3429bfa)
- [x] First scan.mjs run — 1406 jobs from Ashby/Greenhouse APIs in pipeline.md + scan-history.tsv (commit 06bf430)
- [x] **`export-jobs.mjs` built** — 3-sheet Excel export (commit c6c1fd8):
  - Sheet 1: Pending Jobs (1406 rows, sorted by company rank)
  - Sheet 2: By Company (136 companies with pending job counts)
  - Sheet 3: Scan History (1406 raw dedup rows)
  - `exceljs` dep added; `npm run export` script added

## In Progress / Up Next
- [ ] Run `node custom-scraper.mjs --dry-run` on 5+ non-API companies to validate Tier 2/3 discovery
- [ ] Full pipeline evaluation: open `output/jobs-2026-04-20.xlsx`, identify high-priority roles, run `/career-ops pipeline`
- [ ] Update `.claude/project-memory.md` with ATS discovery architecture decisions

## Blockers
None

## Active Plan
`docs/design/pipeline-flow.md` (section 7 build status) + `docs/design/scraping-architecture.md`

## Handoff Note
Phase 2 scripts complete. Pipeline has 1406 pending jobs from first scan.mjs run (API companies only). Excel at `output/jobs-2026-04-20.xlsx` — 3 sheets ready for review. Next: validate custom-scraper.mjs Tier 2/3 on non-API companies (5+ dry-run), then move to Phase 3 — run `/career-ops pipeline` to evaluate high-priority jobs from the Excel.
