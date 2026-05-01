---
status: active
type: context
owner: codex
last-updated: 2026-04-30T17:25:27-04:00
read-if: "you need durable project truths as understood by Codex"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->
## 2026-04-28T22:32:14-04:00 — Design-review findings on Phase 2.7 plan

Codex reviewed `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` against the current source files. Durable findings:

- Current `career-ops/portals.yml` has 448 tracked companies, 416 enabled, 32 disabled, and all 32 disabled rows lack `note:` before implementation. The plan's 428/20 final enabled/disabled math is consistent with re-enabling 14 and disabling 2.
- The plan's post-cleanup direct/branded split appears inconsistent with current direct-ATS patterns: current enabled direct count is 16; planned re-enables include direct Greenhouse Labelbox and direct Ashby Genmo, so the final split should be 18 direct / 410 branded unless one is intentionally excluded.
- Existing scrapers are not sequential: `scan.mjs` runs concurrency 10, and `custom-scraper.mjs` runs API concurrency 10 plus Playwright concurrency 5. Any "sequential clean rescan" promise needs either clarification or code changes.
- `CREATIVE` is defined as a pre-score title weight but no current `portals.yml` comment-group mapping emits `CREATIVE`; the combined `Generative AI / Creative` group currently maps only to `GEN-AI` in the design.

## 2026-04-29T00:26:05-04:00 — Implementation plan review findings

Codex reviewed Claude's implementation plan against design plan v2 and primary sources. Durable findings:

- Claude integrated the previous five design-plan findings correctly at the design layer: 18/410 ATS distribution, enrichment-only sequential wording, lower-bound comp scoring, expanded cross-file propagation, and CREATIVE parser route.
- The implementation plan still needs a v2 before execution because Step 10 final verification does not cover all design §12 acceptance criteria: criterion #10 cache-hit validation is absent, criterion #12 is reduced from "invoke full-scan succeeds" to static script-string inspection, and criterion #13 omits `416 enabled` / `32 disabled` from the stale-string grep.
- The implementation plan's enrich/export CLI contracts are incomplete relative to design v2: enrich omits explicit `--dry-run`, `--company`, `--rate-limit-ms`, `--ttl-days`, `--skip-stale` handling while using undocumented `--limit`; export omits `--cache-warn-threshold P`.

## 2026-04-29T17:26:59-04:00 — Firecrawl pivot design review findings

Codex reviewed the Phase 2.8 Firecrawl design, decisions addendum, verification report, and Claude D-14/D-15. Durable findings:

- The verification report supports D-14/D-15: use `/v1/scrape` with `formats:["html","links"]` for discovery; use `formats:["json"]` + `jsonOptions` only when JSON mode is needed; avoid `/v1/extract` by default; JSON mode costs 5 credits/page; Workday CXS, SmartRecruiters, Personio, Recruitee, and Workable have no-auth paths worth direct adapters.
- The main design plan still has stale pre-verification content: Layer 0 is `scan.mjs` only, five sibling adapters are missing, `/v1/extract` language remains, cost/TTL assumptions are outdated, and acceptance criteria are still placeholders.
- Q-FC-4 needs one settled enrichment fetch policy before implementation: pure Firecrawl-first vs HTTP-first for static ATS JD pages with Firecrawl fallback.

## 2026-04-29T18:37:38-04:00 — Firecrawl implementation plan review findings

Codex reviewed the Phase 2.8 implementation plan against design v2, the decisions addendum, the verification report, and Claude D-14/D-15/D-17. Durable findings:

- The plan is broadly aligned on architecture: no `/v1/extract` wrapper, 5 sibling adapters, pure Firecrawl-first enrichment, 11 AC mappings, JazzHR exclusion, and sequential defaults are present.
- The plan needs path/cwd cleanup before execution: root-level `scripts/ats-adapters/` conflicts with `career-ops/package.json` script resolution, and Step 1/5/8 commands assume inconsistent working directories.
- The plan should implement or remove `full-scan --dry-run` / `--list`, because a plain npm shell chain will not provide those modes by itself.
- The Layer 3 `custom-scraper.mjs` fallback contract is under-specified: design says Firecrawl outage/credit-cap should fall through to Layer 3, but the implementation plan's runtime chain omits `custom-scrape`, so AC-11 can pass without testing real fallback wiring.

## 2026-04-30T11:21:39-04:00 — Phase 2.8 P-7/P-8/P-9 fix findings

Codex fixed Claude handoff `20260430-104400-aa3d` and returned handoff `20260430-112119-cee0`.

- Historical inventory immediately after Phase 2.8 Step 0 was 448 total / 388 enabled / 60 disabled; this was later superseded by the 2026-04-30 disabled-company re-audit.
- P-7 was real: cache-only adapters must filter `data/ats-discovery-cache.json` against the current enabled `portals.yml` company names, or sample runs are polluted by stale/off-sample cache discoveries.
- The same pollution class existed in `firecrawl-extract.mjs`: Layer 2 no-ATS extraction must also filter cache targets to current enabled portals before scraping.
- P-8 root cause is not just an Ashby regex gap. Firecrawl wait scraping did not expose Ashby markers for Ramp/Supabase, but their public Ashby posting API boards are live. Direct Ashby slug probing recovered Ramp (119 jobs) and Supabase (46 jobs).
- Post-fix sample-50 smoke, run as scan → discover → adapters → extract with no enrich/export Step 10, produced 27/50 companies with at least one title-filter-matching job and 172 jobs total. Direct/discovered routing was 29/50.
- The expected 45-50/50 sample job-yield coverage is currently disproved under the "company has at least one title-filter-matching job" definition; many routed companies still produce zero matching jobs after filters.

## 2026-04-30T15:25:01-04:00 — Step 0 disabled-company audit findings

Codex re-audited the 40 companies disabled by Phase 2.8 Step 0 and wrote the durable table at `docs/audits/2026-04-30-step0-disabled-company-audit.md`.

- Step 0's 388-enabled roster was too aggressive because several rows marked as `404` or redirect failures had active sources. After conservative restore, `career-ops/portals.yml` is 448 total / 397 enabled / 51 disabled.
- Restored 9 high-confidence false disables: Galileo AI, VAST Data, Grammarly, Thinking Machines Lab, OpenEvidence, Aurascape, Fathom, Skild AI, and Qdrant.
- A disabled row now needs semantic interpretation: `enabled:false` may mean acquired/defunct, low fit, unreachable, unsupported ATS, source uncertain, or manually held disabled. The audit doc is the source of truth for the Step 0 cohort.
- Future cleanup should consider structured fields such as `source_status`, `disable_reason`, and `reviewed_at` so agents do not re-collapse source availability, scan eligibility, and strategic fit into one free-text note.

## 2026-04-30T16:07:21-04:00 — Roster baseline reconciliation cleanup

Codex aligned the current shared/canonical files to the 448 total / 397 enabled / 51 disabled roster baseline.

- `AI_AGENTS.md` now names 397 enabled / 51 disabled as current, and explicitly frames 428/20 and 388/60 as historical milestones.
- `docs/design/companies-roster.md` was regenerated from current `career-ops/portals.yml`; it now has frontmatter, an audit cross-link, and the 448/397/51 inventory.
- `scripts/portals-apply-triage-fixes.py` is now guarded behind `--allow-historical-rerun`, because running it without the guard would replay the superseded 388-enabled Step 0 state.
- Claude-owned `.claude/memory/*` still needs Claude-side reconciliation; Codex did not directly edit another agent's memory.

## 2026-04-30T16:52:37-04:00 — Phase 2.8 Step 10 sample-50 verification

Codex completed Step 9 and Step 10 after the user supplied Firecrawl dashboard caps.

- User-supplied caps were recorded in gitignored `career-ops/data/firecrawl-plan-caps.tsv`: plan `free`, monthly credits `0`, remaining credits `100401`, scrape RPM `10/min`, crawl RPM `1/min`, concurrent requests `2`, notes `unknown`.
- Step 10 transactional sample-50 full-pipeline run used the current 448 total / 397 enabled / 51 disabled baseline, restored live files afterward, and preserved the review workbook at `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx`.
- Step 10 exported 178 pending jobs from 28/50 companies with title-filtered jobs. Bands were S=7, A=58, B=111, C=2. Firecrawl cost log for the run recorded 383 credits across 307 scrape rows.
- Under the now-retired exported-company interpretation, AC-2 would have failed: 28/50 = 56.0% vs >=75%. This was superseded by the 2026-04-30T17:13:48-04:00 source-accounting AC-2 below.
- AC-3 passes if measured as generic JD location-or-compensation extraction: `location_raw` OR comp hit 126/178 jobs = 70.8%. It does not pass under the narrower Will-fit `location_match` OR comp measure, which hit 26/178 = 14.6%.
- `ats-adapters` logged a Seagate Technology Workday CXS HTTP 422 warning; the orchestrator continued and export succeeded, but the edge case should be investigated before the full 397-company rescan.

## 2026-04-30T17:13:48-04:00 — AC-2 replacement and 22-company miss classification

Codex retired the old ">=75% exported companies" AC-2 interpretation and replaced it with source-accounting metrics recorded in `docs/audits/2026-04-30-sample50-missed-company-classification.md`.

- Step 10 source resolution: 38/50 sampled companies had either exported jobs or a resolved direct/ATS source.
- Source health: 37/38 resolved sources responded successfully. Seagate Technology is the lone `SOURCE_BROKEN` row.
- Raw job availability: 36/37 healthy sources returned at least one raw job.
- Relevant job yield remains report-only: 28/50 companies produced title-filtered exported jobs.
- All no-yield companies are classified: 8 `NO_RELEVANT_JOBS`, 1 `NO_OPEN_JOBS`, 12 `ROUTE_MISSING`, 1 `SOURCE_BROKEN`.
- Phase 2.8 acceptance audit now passes 12/12 using the replacement AC-2 source-accounting gate.

## 2026-04-30T17:25:27-04:00 — Handoff package for Claude full-rescan pickup

Codex replaced stale emergency resume artifacts with current handoff files for a fresh Claude Code session.

- `AI_HANDOFF.md` now summarizes current branch, roster, acceptance status, source-of-truth files, Step 10 metrics, validation already run, and recommended next work.
- `RESUME_PROMPT.md` now contains a copy/paste-ready Claude pickup prompt for the full 397-company clean rescan.
- `docs/design/scraping-architecture.md` now has frontmatter and a Phase 2.8 supersession note because its body still documents the pre-Firecrawl custom-scraper architecture.
- Claude-owned memory still requires Claude-side reconciliation; Codex did not directly edit `.claude/memory/*`.
<!-- section:entries:end -->
