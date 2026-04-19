# Project Status — Career Ops (Will Guo Job Search Pipeline)

**Last Updated:** 2026-04-19
**Current Phase:** Phase 2 — Custom Scripts

## Done
- [x] career-ops cloned at `career-ops/` — on main, clean, npm deps installed
- [x] Knowledge bank ingested (`context/knowledge bank/` — 5 folders, 12+ files)
- [x] Companies source loaded (`context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 companies, 171 relevant filtered)
- [x] CLAUDE.md, `.claude/rules/pipeline.md`, `.claude/rules/architecture.md` created
- [x] Project memory bootstrapped
- [x] **Phase 1 complete** — cv.md, config/profile.yml, modes/_profile.md, portals.yml (448 companies), data/ initialized (commit 8b847c9)
- [x] Scoring criteria refined — Canadian on-site rules, US remote-only, comp bands (commits d4ecf6f, 5ef75ad)
- [x] `docs/design/pipeline-flow.md` created — complete 7-section technical reference (untracked, needs commit)
- [x] ATS API detection strategy locked — Greenhouse/Lever/Ashby/Workday/BambooHR endpoints documented

## In Progress / Up Next
- [ ] Commit `docs/design/pipeline-flow.md`
- [ ] `custom-scraper.mjs` — ATS detection first, then fetch+cheerio, then Playwright fallback
- [ ] `export-jobs.mjs` — pipeline.md + history → Excel with company metadata
- [ ] Update `package.json` npm scripts for full-scan chain
- [ ] Validation run: `node scan.mjs --dry-run` on 3 test companies

## Blockers
None

## Active Plan
`career-ops/docs/plans/2026-04-17-job-scrape-and-pipeline.md` + `docs/design/pipeline-flow.md` (section 7 build status)

## Handoff Note
Phase 1 complete. pipeline-flow.md built (untracked). Next: commit pipeline-flow.md, then build custom-scraper.mjs with ATS API detection as first priority (see project-memory.md 2026-04-19 + scraping-architecture.md). Read docs/design/scraping-architecture.md before touching the scraper.
