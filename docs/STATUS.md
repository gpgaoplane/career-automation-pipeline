# Project Status — Career Ops (Will Guo Job Search Pipeline)

**Last Updated:** 2026-04-17
**Current Phase:** Phase 0 — Setup & Framework

## Done
- [x] career-ops cloned at `career-ops/` — on main, clean, npm deps installed
- [x] Knowledge bank ingested (`context/knowledge bank/` — 5 folders, 12+ files)
- [x] Companies source loaded (`context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 companies, 171 relevant filtered)
- [x] Implementation plan written (`career-ops/docs/plans/2026-04-17-job-scrape-and-pipeline.md`)
- [x] CLAUDE.md created (project root)
- [x] `.claude/rules/pipeline.md` created
- [x] `.claude/rules/architecture.md` created
- [x] Project memory bootstrapped
- [x] Global MEMORY.md exists (Will's cross-project prefs)

## In Progress
- [ ] career-ops config files: cv.md, config/profile.yml, modes/_profile.md, portals.yml
- [ ] data/ tracker files: applications.md, pipeline.md, scan-history.tsv
- [ ] custom-scraper.mjs (Playwright for non-API companies)
- [ ] export-jobs.mjs (Excel exporter)

## Up Next
- [ ] Run scan.mjs (API scrape — Greenhouse/Ashby/Lever)
- [ ] Run custom-scraper.mjs (Playwright scrape)
- [ ] Export to Excel → `output/jobs-YYYY-MM-DD.xlsx`
- [ ] Human review of Excel output
- [ ] career-ops batch evaluation of approved jobs

## Blockers
None

## Active Plan
`career-ops/docs/plans/2026-04-17-job-scrape-and-pipeline.md`

## Handoff Note
Framework fully set up. Next session: build career-ops config files (cv.md, profile.yml, _profile.md, portals.yml), then run scrapers and export to Excel. All source material is in `context/knowledge bank/` — read kb_will_identity.md and kb_master_resume_and_positioning.md first.
