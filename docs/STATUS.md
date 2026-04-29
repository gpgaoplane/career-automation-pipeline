# Project Status — Career Ops (Will Guo Job Search Pipeline)

**Last Updated:** 2026-04-28
**Current Phase:** Phase 2.7 — Design plan complete (portals cleanup + mid-level pivot + pre-scoring) — awaiting Codex review

## Done
- [x] career-ops cloned at `career-ops/` — on main, clean, npm deps installed
- [x] Knowledge bank ingested (`context/knowledge bank/` — 5 folders, 12+ files)
- [x] Companies source loaded (`context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 companies source)
- [x] CLAUDE.md, `.claude/rules/pipeline.md`, `.claude/rules/architecture.md` created
- [x] Project memory bootstrapped
- [x] **Phase 1 complete** — cv.md, config/profile.yml, modes/_profile.md, portals.yml (448 companies: 416 enabled, 32 disabled), data/ initialized (commit 8b847c9)
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
- [x] **portals.yml title_filter expanded** (commit 7cb60ab):
  - Seniority: Staff, Lead, VP/SVP/EVP, Director, Head of, Chief, Managing Director, General Manager
  - Region: 42 keywords (Europe, APAC, LATAM, Middle East) — catches titles with location suffix
  - Language: 16 adjectives (German, French, Spanish, etc.) — covers both "German speaking" and ", German" formats
  - Removed conflicting positives: "Staff AI", "Staff Product Manager", "Group Product Manager"
- [x] **First scan.mjs run** — 1406 jobs tagged as `scan-v1-unfiltered` (commit 06bf430)
  - ⚠️ This data is stale: produced against old portals.yml before URL data quality fix
  - Some company associations may be incorrect (wrong ATS slugs); treat as "before" baseline only
  - Tagged `scan-v1-unfiltered` for diff comparison after clean rescan
- [x] **`export-jobs.mjs` built** — 3-sheet Excel export (commit c6c1fd8):
  - Sheet 1: Pending Jobs, Sheet 2: By Company, Sheet 3: Scan History
  - `exceljs` dep + `npm run export` script added
- [x] `.claude/project-memory.md` created — architecture decisions and known issues
- [x] **Phase 2.7 design plan committed** (2026-04-28, `feat/multi-agent-collab`):
  - `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` — 16 sections covering portals.yml audit cleanup, mid-level profile pivot, sequential lock, pre-scoring scheme (title + description), description enrichment design
  - Locked decisions: D-7 (mid-level pivot), D-8 (sequential), D-9 (pre-scoring), D-10 (enrichment design), D-11 (audit cleanup 428/20)
  - Cross-doc propagation done: `AI_AGENTS.md` Project Context, `.claude/memory/{context,decisions,state}.md`, work log
  - Awaiting Codex review per the framework's design-review flow
- [x] **portals.yml audit completed** (2026-04-28):
  - Audited all 32 disabled companies; classified 16 as duplicate-suppression (correct), 14 as mis-drops (no exclusion reason), 2 as universal-exclusion (NVIDIA HW, Saronic defense)
  - Identified 2 inversions: Foxconn rank 65 (HW) and Skydio rank 437 (defense) currently enabled but should be disabled
  - Final inventory committed in design plan: 448 total / **428 enabled / 20 disabled** with explicit `note:` on every disabled row
  - ATS distribution post-cleanup: **18 direct** (Greenhouse 8 + Ashby 7 + Workday 3) + **410 branded**. Two re-enabled companies have direct ATS URLs: Labelbox (Greenhouse) and Genmo (Ashby). Earlier draft said 17/411; corrected after Codex review of design plan.
- [x] **Multi-agent-collab v0.4.1 framework installed** (2026-04-28, branch `feat/multi-agent-collab`):
  - Skill drop-in at `~/.claude/skills/multi-agent-collab` (commit `ebd67b8`, v0.4.1)
  - Bootstrapped via `collab-init.sh --agent claude` from repo root (fresh mode)
  - Created: `.collab/{VERSION,ACTIVE,INDEX,ROUTING,PROTOCOL,config.yml,agents.d/claude.yml,archive/}`, `AI_AGENTS.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `.claude/memory/{state,context,decisions,pitfalls}.md`, `docs/agents/claude.md`
  - Migrated content: full project context → `AI_AGENTS.md` `## Project Context` (outside framework markers, preserved on re-init); 5 architectural decisions + 3 pitfalls + 4 durable truths from old `.claude/project-memory.md` → core-five memory split; archived original to `.claude/archive/project-memory-pre-collab-2026-04-28.md`
  - Root `CLAUDE.md` rewritten as `@import` shim (`@AI_AGENTS.md` + `@.claude/CLAUDE.md`)
  - `collab-check`: `OK: INDEX and filesystem aligned`
  - Codex onboarding deferred — user triggers `--join codex` from a Codex session

## In Progress / Up Next
- [ ] **Clean rescan** — tag `scan-v1-unfiltered` on commit 06bf430, reset pipeline.md + scan-history.tsv, re-run scan.mjs + custom-scraper.mjs with updated filters
  - scan.mjs: 18 companies (only those with direct ATS URL in portals.yml after audit cleanup)
  - custom-scraper.mjs: 410 companies (branded pages — Tier 1/2 discovers hidden ATS for 100+ of them)
- [ ] Investigate and correct portals.yml entries where `careers_url` points to a generic landing page rather than actual job listings (will show as empty Tier 3 results after scrape)
- [ ] Re-run `export-jobs.mjs` after clean rescan to produce valid Excel

## Blockers
None

## Active Plan
`docs/design/pipeline-flow.md` (section 7 build status) + `docs/design/scraping-architecture.md`

## Handoff Note
Phase 2.7 design plan v2 + implementation plan both committed on `feat/multi-agent-collab`. Codex's review of design plan v1 (commit `021efb5`) integrated into v2 (commit `781fba1`): all 5 findings verified against primary sources, fixes applied, cross-doc propagation done. Design plan v2 at `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`; implementation plan at `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` (11 ordered steps, verification gates per step, ~5h focused work). Decisions D-7 through D-12 locked. Framework cleanup misses corrected (collab-catchup ack, watermark bump, ROUTING/PROTOCOL re-read, design plan re-register, Row 10 cross-agent risk Watch out block). **Next:** user signal to begin Step 1 of implementation execution OR optional Codex re-review of implementation plan first. Phase 2.6 clean rescan still pending after implementation: tag scan-v1-unfiltered on 06bf430 → reset pipeline.md + scan-history.tsv → run scan → custom-scrape → enrich → export → P-1 audit. Open verification: root `CLAUDE.md` `@import` shim still unverified on next Claude session start.
