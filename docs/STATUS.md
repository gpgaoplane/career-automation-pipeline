# Project Status — Career Ops (Will Guo Job Search Pipeline)

**Last Updated:** 2026-04-30
**Current Phase:** Phase 2.8 IMPLEMENTATION IN-PROGRESS on `feat/phase-2.8-firecrawl`. **Steps 0-5 complete + Jasper safeEncode fix.** Sample-50 smoke run achieved 37/50 (74%) coverage = +2.85x baseline, narrowly under AC-2 ≥75%; 3 bugs identified for Codex to fix in next session. **Handoff to Codex active** (handoff id 20260430-XXXXXX-XXXX); Claude is paused.

## Done
- [x] **Phase 2.8 implementation Steps 0-5 EXECUTED** (2026-04-29 → 2026-04-30, `feat/phase-2.8-firecrawl`, commits e721305 → 8c4a443):
  - **Step 0** — portals.yml URL triage: 428→388 enabled (40 user-approved disables/updates including 7 acquisitions, 1 defunct, 30 manual-review auto-disables, 2 user-flagged drops). Triage script + apply-fixes script + report. Commits e721305, 631cd87, aff12fc.
  - **Step 1** — `lib/firecrawl.mjs` SDK wrapper: scrape/scrapeJson with cost tracking, --max-credits cap, AC-11a fallback queue wiring, retry+backoff. **8/8 unit tests pass.** Live test: 167 markdown chars, 1 credit. Commit 8f25673.
  - **Step 2** — `lib/ats-clients.mjs` 8-provider library: GH/Ashby/Lever (duplicated per D-3) + new Workday CXS, SmartRecruiters, Personio (XML), Recruitee, Workable. **9/9 integration tests pass. Workday CXS pagination CONFIRMED** (40 jobs across 2 pages). Commit 68335e5.
  - **Step 3** — 5 sibling adapters per D-15: workday-cxs, smartrecruiters, personio, recruitee, workable in repo-root `scripts/ats-adapters/`. Plus run-all.mjs orchestrator + README documenting JazzHR exclusion (AC-9). QI-1 RESOLVED. Commit 8ac3283.
  - **Step 4** — `firecrawl-discover.mjs` Layer 1: scrape with formats:[html,links], detect 8-provider markers, drill 1-2 levels deep on /careers /jobs links, RI-4 ambiguity resolution with Levenshtein company-name agreement, 60-day TTL. **11/11 tests pass.** Live: Cloudflare drill→greenhouse/cloudflare. Commit df51a68.
  - **Step 5** — sample-50 smoke validation: 37/50 (74%) coverage = +2.85x Phase 2.7 baseline (was 13/50 = 26%). 161 Firecrawl credits spent (0.16% of 101k budget). Restored live state cleanly. Cached-discovery adapter pattern emerged → extended ATS adapters from 5 to 8 (D-19); +225 jobs from cache-only adapters. Commit 5b5fcf9.
  - **Jasper safeEncode fix** — addressed P-4 URL double-encoding (commit 8c4a443).
- [x] **3 bugs surfaced during Step 5 inspection** — documented in `.claude/memory/pitfalls.md` for Codex to fix in next session:
  - **P-4 — URL double-encoding** (FIXED commit 8c4a443).
  - **P-5 — resolveAmbiguous candidate dedup** — would auto-resolve 4 of 6 ambiguous cases (Cadence / F5 / Monolithic Power / Tokyo Electron) lifting AC-2 from 74% to 82%.
  - **P-6 — Greenhouse `embed` synthetic slug** — Vectra AI / Zipline incorrectly resolved to slug "embed" (the JS library URL); fix via regex update.
- [x] **Phase 2.8 implementation plan v2 — Codex review integrated** (2026-04-29, `feat/phase-2.8-firecrawl`): D-18 documents integration. All 5 ⚠ Issues ACCEPTED (path/cwd mismatch, inconsistent cwd, full-scan dry-run support, Layer 3 fallback contract, source-precedence stale wording); 1 of 2 ❓ Questions ACCEPTED (HEAD+GET fallback); 1 DEFERRED (cp+overwrite kept); 2 💭 Optional ACCEPTED (RI-4 ambiguity rewrite, Workday CXS pagination test). Implementation plan v2 changes: §0 precedence rewritten with verification report as priority 1; new §0a command-cwd convention; Step 0 HEAD+GET fallback; Step 1/4/6/7 Layer 3 fallback queue wiring; Step 2 Workday pagination test; Step 8 new `scripts/full-scan-orchestrator.mjs` replaces plain npm chain (supports `--dry-run`/`--list` + post-run Layer 3 fan-out); AC-11 split into AC-11a (wired) + AC-11b (used); RI-4 ambiguous slug resolution rewritten with company-name agreement gate; QI-1 RESOLVED (sibling adapters at repo-root `scripts/ats-adapters/`). Decisions addendum Q-FC-1 baseline marked HISTORICAL/SUPERSEDED.
- [x] **Phase 2.8 implementation plan v1 written** (2026-04-29, commit 7d67b2b): `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` — 12 sections covering pre-flight checks, branch+commit strategy, 12 ordered steps (URL triage → lib/firecrawl → lib/ats-clients → 5 sibling adapters → firecrawl-discover → smoke validation → firecrawl-extract → enrich-jobs Firecrawl-first refactor → wire full-scan → dashboard rate-cap manual gate → sample-50 verification → AC audit → Phase 2.6 readiness signal), per-step verification gates + rollback procedures, RI-1..RI-8 implementation risks, QI-1..QI-5 deferred decisions, reviewer checklist for optional Codex re-review.
- [x] **Phase 2.8 design v2 — Codex review integrated** (2026-04-29, `feat/multi-agent-collab`):
  - Codex reviewed Phase 2.8 design via handoff `20260429-164715-2bcf`; surfaced 5 ⚠ Issues + 3 ❓ Questions + 2 💭 Optional improvements in `docs/plans/2026-04-29-firecrawl-pivot-design.md` §11
  - Each Codex point verified against primary sources (verification doc + D-14/D-15) before integration; no performative agreement
  - All 10 points ACCEPTED; design plan revised in-place to revision: v2
  - §0 source-of-truth precedence note added (verification doc + D-14..D-17 supersede earlier baseline-knowledge sections); §4.1 Layer 0 box rewritten for 8-provider tier; §4.1.1 ATS provider matrix added; §4.2 file list expanded with 5 sibling adapters; §4.3 "Decision pending" removed (D-3 invariant locked); §5 cost model fully rewritten with mode-split matrix (markdown 1cr / JSON 5cr / direct API 0cr / interact / extract excluded); §5.3 60-day TTL with fast-fail; §5.4 dashboard rate-cap manual gate; §5.5 `--max-credits` cap; §6 migration sequence expanded to 12 steps; §7 acceptance criteria expanded from 6 placeholder to 11 final ACs; §8 FC-R2 reworded to use modern `formats:["json"]+jsonOptions` shape; §9 all 4 Q-FC questions marked RESOLVED; §10 historical note added (smoke-test scripts deleted in 626e1ce); §12 Claude's reconciliation table added documenting disposition of each Codex point
  - D-17 recorded in `.claude/memory/decisions.md` documenting the full integration; D-14 inline-corrected for the firecrawl-enrich → firecrawl-extract naming typo and the rate-cap claim softened
  - `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` Q-FC-4 rewritten to be unambiguously pure Firecrawl-first (matches user's stated principle "Firecrawl first, custom code as backup"); HTTP fallback purely for outage-resilience, NOT cost-routing
- [x] **Phase 2.8 design + verification EXECUTED** (2026-04-29, `feat/multi-agent-collab`):
  - Firecrawl smoke test on 5 URLs (Jasper, SiFive, Expedia, Cloudflare, Shopify) confirmed Firecrawl handles SPA branded pages — most "broken" companies actually use known ATSes (Ashby, Workday, Greenhouse) hidden behind marketing landing pages
  - Phase 2.8 design plan written: `docs/plans/2026-04-29-firecrawl-pivot-design.md` (commit 0f9421a) — 4-layer architecture (direct-API → Firecrawl discover → Firecrawl extract → custom-scraper fallback), 5 risks, 9 acceptance criteria, 4 open design questions
  - Phase 2.8 decisions addendum written: `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (commit d8e3921) — answers all 4 open questions; same commit added "Web research" project rule to root CLAUDE.md (state intent + wait for signal before web fetches)
  - Verification research executed via forked agent: `docs/design/2026-04-29-firecrawl-ats-verification.md` — 12 baseline-knowledge claims verified against primary sources (Firecrawl docs, ATS provider docs). 3 corrections + 5 newly-verified public ATSes surfaced
  - Decisions D-14 (Firecrawl pivot architecture), D-15 (API-direct tier expansion to 8 ATSes), D-16 (project rules: web research authorization + surface uncertainty over baseline knowledge) recorded
  - INDEX registers all 3 new artifacts (design plan, decisions addendum, verification research)
  - Material findings: (a) Workday CXS endpoint is API-accessible without auth — biggest single unlock; (b) JSON-mode scrape is **5 credits/page**, not 1; (c) `/v1/scrape` with `formats:["html","links"]` is right tool for ATS discovery, NOT `/v1/map`; (d) 5 additional ATSes have public no-auth APIs (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable); (e) 6 others need auth/HTML scraping (iCIMS, BambooHR, Pinpoint, Teamtailor, Phenom, Jobvite); (f) 30→60 day TTL on ATS discovery cache with fast-fail re-discovery on 4xx/5xx
- [x] **Phase 2.7 implementation EXECUTED end-to-end** (2026-04-29, `feat/multi-agent-collab`, commits a13b9a5 → 9ff216a):
  - Step 0: Sample size 100→50 + advisor's cp+overwrite-and-restore + coverage caveat
  - Step 1: portals.yml audit cleanup → **448 total / 428 enabled / 20 disabled / 0 missing notes**
  - Step 2: title_filter rewrite — 3 senior positives removed, 8 negatives added (Senior, Sr, Sr., Principal, Junior, Jr, Jr., Associate), CREATIVE/GEN-AI YAML groups split per Codex §17 finding
  - Steps 3+4: All 6 archetypes → Mid-level; `_profile.md` Target IC band header + hands-on/implementer reframing
  - Step 5: `docs/design/companies-roster.md` auto-generated from portals.yml
  - Step 6: `career-ops/enrich-jobs.mjs` built — 19/19 unit tests pass on `extractSignals`; live single-URL test verified cache works (Imbue, tier1-http 200 in 0.5s)
  - Steps 7+8: `career-ops/export-jobs.mjs` refactored — 6 new columns in Pending Jobs (Match Track, Title Score, Desc Score, Pre-Score, Band, Score Notes) + 3 in By Company (Pre-Score Max/Avg, S-Tier Count) + 3 CLI flags (`--top N`, `--skip-enrich`, `--cache-warn-threshold P`) + per-row band fills (S=green/A=yellow/B=grey/C=red); `npm run full-scan` chain extended: scan→custom-scrape→enrich→export
  - Step 8.5: Sample run on 50 random enabled companies (seed=42); 94 jobs scraped via cp+overwrite-and-restore (NEVER mv-swap); 88/94 cache hits (93.6%); live state restored cleanly (git diff shows no changes to portals.yml/pipeline.md/scan-history.tsv)
  - Step 11: INDEX registers all new artifacts; `scripts/acceptance-audit.py` runs all 18 design §12 criteria — **18/18 PASS**
  - Skipped per user direction: Step 9 calibration pass
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
- [ ] **CODEX (active handoff):** Fix P-5 + P-6 bugs in `career-ops/firecrawl-discover.mjs` resolveAmbiguous (dedup candidates) + `career-ops/lib/ats-detect.mjs` PROVIDER_PATTERNS.greenhouse (extract from `?for=` query param OR exclude `embed` synthetic slugs). Re-run sample-50 smoke; expected ≥41/50 (82%), clears AC-2.
- [ ] **CODEX:** Step 6 — `firecrawl-extract.mjs` Layer 2 for the 20 no-ats-found companies (~100 credits estimated).
- [ ] **CODEX:** Step 7 — `enrich-jobs.mjs` pure Firecrawl-first refactor per Q-FC-4.
- [ ] **CODEX:** Step 8 — `scripts/full-scan-orchestrator.mjs` + npm wiring per design v2 §6.8.
- [ ] **USER GATE:** Step 9 — Firecrawl dashboard rate-cap verification.
- [ ] **CODEX:** Step 10 — full-pipeline sample-50 verification.
- [ ] **CODEX:** Step 11 — acceptance audit (11 ACs from design v2 §7).
- [ ] **CODEX:** Step 12 — tag scan-v2-prerescan; Phase 2.6 readiness signal.

## Blockers
None

## Active Plan
`docs/design/pipeline-flow.md` (section 7 build status) + `docs/design/scraping-architecture.md`

## Handoff Note
**Steps 0-5 of Phase 2.8 implementation EXECUTED on `feat/phase-2.8-firecrawl`.** Latest commit: `8c4a443` (Jasper safeEncode fix). Sample-50 smoke run yielded 37/50 (74%) coverage and surfaced 3 bugs (P-4 fixed; P-5+P-6 documented for Codex). **Codex is now picking up at the post-Step-5 inspection point.** Specific Codex tasks: (1) fix P-5 candidate dedup in `firecrawl-discover.mjs resolveAmbiguous`; (2) fix P-6 Greenhouse "embed" synthetic slug in `lib/ats-detect.mjs PROVIDER_PATTERNS.greenhouse` regex; (3) re-run sample-50 smoke to confirm ≥41/50 (82%) AC-2; (4) Steps 6-12 per implementation plan v2. Working tree clean; live state restored cleanly post-smoke (git diff portals.yml/pipeline.md/scan-history.tsv: empty). 161 Firecrawl credits used; 100,839 remaining. **Decisions D-19 records the cached-discovery adapter pattern emerged in Step 5; pitfalls P-4/P-5/P-6 document the bugs.** All framework artifacts updated for Codex pickup.
