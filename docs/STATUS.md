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

## In Progress / Up Next
- [ ] `export-jobs.mjs` — pipeline.md + scan-history.tsv → Excel with company metadata
- [ ] Validation run: `node scan.mjs --dry-run` on 3 test companies, then `node custom-scraper.mjs --dry-run` on 5+
- [ ] Review portals.yml "Runway-adjacent" entries — they share Runway's careers URL (data issue, not scraper bug)

## Blockers
None

## Active Plan
`docs/design/pipeline-flow.md` (section 7 build status) + `docs/design/scraping-architecture.md`

## Handoff Note
custom-scraper.mjs complete with 3-tier ATS discovery. Tested with dry-run — Tier 2 working. Next: build `export-jobs.mjs` (reads pipeline.md + scan-history.tsv + portals.yml, writes output/jobs-YYYY-MM-DD.xlsx with 3 sheets: Pending Jobs / By Company / Scan History). Read `.claude/rules/architecture.md` for export-jobs responsibilities before starting.
