---
status: active
type: context
owner: codex
last-updated: 2026-05-05T11:39:22-04:00
read-if: "you need durable project truths as understood by Codex"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->
## 2026-05-05T11:39:22-04:00 — Multi-agent-collab upgraded to 0.4.3

The repo framework state was manually migrated from multi-agent-collab `0.4.1` to `0.4.3`.

- Latest package was checked with `npm.cmd view @gpgaoplane/multi-agent-collab version` and returned `0.4.3`.
- `npx.cmd @gpgaoplane/multi-agent-collab@0.4.3 init` failed on Windows because its Bash entrypoint path was mangled.
- Git Bash/sh also failed in this Codex sandbox with Win32 error 5 signal-pipe/CreateFileMapping errors.
- Codex downloaded the npm tarball with `npm.cmd pack @gpgaoplane/multi-agent-collab@0.4.3`, extracted it under `.collab-upgrade-backups/`, and manually applied the additive migration.
- New local framework files now exist under `scripts/collab-*.sh`, `scripts/lib/*.sh`, `scripts/migrations/*.sh`, and `templates/`.
- `.collab/VERSION` and `.collab/.update-cache` now read `0.4.3`.
- `.collab/.migrations/` records sentinels through `0.4.3`.
- `.collab/PROTOCOL.md` was refreshed from the 0.4.3 template, including the new `update` command vocabulary.
- `.collab/UPGRADE_NOTES.md` records the upgrade summaries and manual-execution caveat.
- Preservation zip: `.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip`.

No project-specific context, memory, handoff docs, status docs, logs, production pipeline files, caches, tracker data, or baseline workbook content was intentionally removed or overwritten.

## 2026-05-05T10:55:00-04:00 — Claude takeover package for shadow calibration

Codex refreshed `AI_HANDOFF.md` and `RESUME_PROMPT.md` for Claude takeover. The current handoff is no longer the old Phase 2.8/manual-review state; it is the shadow filter calibration state centered on V5 and the V3/V4/V5 diff workbook.

- Claude should treat `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx` and `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx` as the main user-facing review artifacts.
- The core active problem is still calibration, not production wiring: missing/recovered roles, sales hard drops without false positives, compensation sanity, YoE lower-bound logic, remote/non-Toronto location policy, source hygiene, and exact row-level version changes.
- The hard boundary remains: no production exporter/config/profile/default-scan/cache/tracker/live behavior changes until Will explicitly approves specific rule groups.

## 2026-05-05T10:40:40-04:00 — Shadow V3/V4/V5 row-level diff artifact

Codex implemented `scripts/shadow-version-diff.mjs` and `scripts/test-shadow-version-diff.mjs` to answer Will's request for an exhaustive row-level comparison between V3, V4, and V5 shadow audit workbooks.

- Output workbook: `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx`.
- Summary JSON: `docs/audits/2026-05-05-shadow-version-diff-summary.json`.
- Row identity must be `normalized_url + normalized_company + normalized_title`, not URL alone. URL-only matching collapses multi-role generic careers URLs such as CoreWeave/Nebius/AST/Kuaishou and undercounts the 956-row shadow spine.
- Reconciled counts: V3/V4/V5 each have 956 Shadow Decision rows. V3→V4 has 356 materially changed rows, 35 hard-drop additions, 78 hard-drop removals, and 0 unmatched rows. V4→V5 has 230 materially changed rows, 0 hard-drop additions, 29 hard-drop removals, and 0 unmatched rows.
- V5 Source Repair has 206 sheet rows: 192 row-level rows that exist in Shadow Decisions plus 14 known-missing seed rows that are intentionally outside the retained 956-row spine.
- Validation passes with `node scripts\test-shadow-version-diff.mjs` (15/15).

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

## 2026-05-02T22:19:27-04:00 — Phase 2.8 closure and diagnostic-only pickup

Claude completed the full Phase 2.8 closure after Codex's AC-2 replacement.

- Current roster baseline is 448 total / 393 enabled / 55 disabled / 0 missing notes after Will-directed SOURCE_BROKEN disables for Palo Alto Networks, Grammarly, SiFive, and EvenUp.
- Full 393-enabled-company rescan produced `career-ops/output/jobs-2026-05-01.xlsx`: 613 jobs across 154 companies, with bands S=37 / A=370 / B=195 / C=11.
- Full-run acceptance audit passes 12/12 against `docs/audits/2026-05-01-fullrun-metrics.json`: source resolved 385/393, source health 385/385, misses classified 213/213, generic location-or-comp coverage 664/956, fallback usage 33/956.
- Scoring policy v2 is canonical: S threshold 18, AE-only jobs dropped, intern jobs dropped, deal-breaker jobs dropped, Senior/Principal penalty -5, Sales/BD positives removed from future scans.
- Option A signal extraction fixes are canonical: decimal-K comp parsing, expanded comp anchors, strong-pattern and single-value comp fallback, hybrid_non_toronto dealbreaker, proximity-based Toronto check, and generic X+ YoE.
- `docs/design/filter-pipeline-reference.md` is a research-only diagnostic map. Do not treat it as authorization to relax filters or rerun extraction/export; use it to trace user-supplied missing-job examples.

## 2026-05-03T00:16:47-04:00 — Full-run missing jobs diagnostic seed findings

Codex wrote `docs/audits/2026-05-03-fullrun-missing-jobs-diagnostic.md` for Will's Surge AI, ElevenLabs, xAI, and Atlassian examples.

- The audit boundary is the 2026-05-01 full-scale run only. `scan-history.tsv` is retained scanner output, not raw job-board inventory; it cannot prove all title-filter rejects.
- All supplied seed URLs are absent from retained 2026-05-01 artifacts. Most fail current positive title matching; two should pass by title (`Generative AI Generalist`, Atlassian `Solutions Architect | DX`) and therefore point to source extraction incompleteness or current-board delta.
- All 343 `pipeline.md` rows missing from the visible Excel are explained by `deal_breaker_signal = hybrid_non_toronto`; 154 are SA/FDE/customer-technical rows. This needs a false-positive audit before continuing as a hard drop.
- Senior/Principal `-5strength` did not fire on any visible Excel row, so it is currently a defensive fallback, not the live ranking problem.
- Substring matching creates false positives: `RAG` matches `Storage`, and `Technical Account` matches `Technical Accounting`.

## 2026-05-03T14:09:01-04:00 — Offline calibration workbook V1 implementation

Codex implemented the deterministic offline calibration workbook requested by Will:

- Root generator: `scripts/fullrun-calibration-workbook.mjs`. Root test: `scripts/test-fullrun-calibration-workbook.mjs`.
- Requested generated outputs: `career-ops/output/fullrun-calibration-2026-05-01.xlsx` and `docs/audits/2026-05-03-fullrun-calibration-summary.json`.
- The generator is analysis-only and offline: it reads the 2026-05-01 full-run artifacts, writes the calibration workbook/summary, and does not fetch live boards, modify production filters/scoring, mutate caches, touch tracker data, or alter baseline `career-ops/output/jobs-2026-05-01.xlsx`.
- Workbook sheets are deterministic and complete: Run Manifest, Stage Reconciliation, Seed Traces, Output Drops Review, Low Ranked High Intent, Potential False Positives, Role Taxonomy Candidates, Company Coverage, Rule Simulation, Reviewer Calibration, Current Board Non-Baseline.
- Observed counts: 1,671 scan-history rows for `first_seen=2026-05-01`, 956 pipeline rows under `## Pendientes`, 613 visible Excel rows, 343 pipeline-to-Excel drops, 2 JD cache-only exclusions, and 89 canonical collision groups.
- The plan expected 586 unique Excel URLs, but the current artifact has 581 normalized unique URLs. V1 now records this as a manifest count warning; `--strict` fails on that mismatch.
- Unit/integration coverage passes with `node scripts\test-fullrun-calibration-workbook.mjs` (13/13), including baseline SHA preservation, JD-cache alias recovery, and safe title-match simulations for `RAG` and `Technical Account`.

## 2026-05-03T16:10:08-04:00 — Risk audit and filter robustness extension

Codex extended the offline calibration workbook with the risk-audit plan requested by Will.

- Added sheets: `Visible Location Risk`, `Dealbreaker Calibration`, `Missing Job Root Cause`, and `Filter Robustness Metrics`.
- The extension remains offline and analysis-only. It did not change production filter logic, scoring, caches, tracker data, live board retrieval, or the baseline `jobs-2026-05-01.xlsx`.
- Location policy implemented for audit simulation: explicit U.S./non-Toronto Canada hybrid or on-site signals are hard-drop candidates; ambiguous hybrid/on-site without explicit location goes to review; Toronto hybrid is allowed; fully remote U.S. is allowed; `hybrid cloud/mesh/fabric` is not treated as work mode.
- Current metrics from the regenerated workbook/summary: 613 visible rows classified; 479 high-risk visible-location rows; 150 visible hard-drop false-negative candidates; 14/14 seed jobs assigned a missing-job root-cause label.
- Tests pass with `node scripts\test-fullrun-calibration-workbook.mjs` (19/19), including U.S. hybrid/on-site hard-drop detection, ambiguous hybrid review mode, Toronto/remote-US allow cases, hybrid technical-term guards, missing-JD classification, and baseline SHA preservation.

## 2026-05-03T19:22:08-04:00 — Production filter refinement design truths

Codex created and refined `docs/plans/2026-05-03-production-filter-refinement-design.md` after independent review by Sagan.

- New design direction: AE-only roles should be hard-dropped; Associate should not be a global hard negative and instead becomes `level_signal=associate` with lower priority/review handling.
- Highest-weight family should be Solutions / Deployment / Architect / FDE, superseding the current `TRACK_WEIGHTS` ordering where `SA: 4` is below `AI-ENG: 5` and `GEN-AI: 5`.
- Generic engineering roles should not pass from title alone. Full Stack / Platform / Software / Product Engineer roles need guarded AI evidence, preferably through a pre-pipeline candidate queue or two-pass scan rather than normal `pipeline.md` pollution.
- Location logic needs structured fields because scalar `deal_breaker_signal` cannot represent "keep but annotate" cases. Future implementation should separate `hard_drop_reason` from `location_annotations`.
- `career-ops/scan.mjs` remains an upstream/vendored boundary. Any production title-filter refactor must explicitly decide whether to use a wrapper, a user-approved local exception, or document the limitation.
- Will clarified after the refined design that all sales-role substance should hard-drop, not merely literal AE-only titles. Sales-role detection must run before positive AI/technical boosts and should catch title variants plus JD/content evidence around quota, pipeline, prospecting, closing, renewals, account/territory ownership, revenue, GTM sales execution, sales engineering, and pre-sales.
- Compensation hard drops are not currently implemented despite profile language. Current export scoring uses comp as a description-score delta against USD 120 / CAD-like 110 lower-bound floors; low comp can reduce score but does not drop the row. The refined design now requires detected U.S. comp below $120K USD and detected Canadian comp below $90K CAD to become true content-layer hard drops, while unknown comp stays annotated/reviewable.
- Will further corrected the compensation and scoring design: Canadian hard-drop floor should be $120K CAD, not $90K CAD; compensation hard-drop should use the detected upper bound below floor; hourly rates should be parsed and annualized with 2,080 hours/year when full-time; `0-2` YoE should be a strong positive (+4), not a penalty; and track weights must be redesigned so Solutions/Deployment/Architect/FDE is highest and sales has no positive track.
- Current comp parser already handles many annual formats (`$100K`, `$100,000`, decimal-K, anchored ranges, some standalone strong dollar ranges, and single anchored values), but does not fully cover hourly rates, all currency-before-number formats, or weak numeric-only salary mentions.
- Will corrected YoE again: 0-2 years should score +4; 3 years should be neutral; 4 years should be -2; 5 years should be -3; more than 5 required years should hard-drop. If multiple YoE mentions appear, use the actual requirement/minimum for the role rather than generic prose.
- Future architecture idea recorded in the design plan: V1 should stay flat-file/ledger based, but the long-term direction is hybrid SQL + vector/RAG. SQL should be the audit/source-of-truth backbone for jobs, runs, decisions, hard drops, scores, and reviewer actions; vector/RAG should retrieve semantic JD evidence; optional LLM review can summarize evidence only if cached and auditable.

## 2026-05-03T21:00:23-04:00 — Production filter implementation-plan review truths

Codex created `docs/plans/2026-05-03-production-filter-refinement-implementation.md` and refined it after Lorentz's independent review.

- Implementation must be shadow-first: rule engine, richer extraction, offline reclassification, ledgers, and review workbook can be built before approval, but production `export-jobs.mjs`, `portals.yml`, profile docs, and default `npm run full-scan` behavior should not change until Will approves the review workbook.
- The direct-ATS gap is resolved in the plan by adding a custom gated Greenhouse/Ashby/Lever wrapper rather than editing vendored `career-ops/scan.mjs` or leaving direct ATS on legacy filtering.
- Offline 2026-05-01 artifacts cannot produce a true raw title-filter reject ledger; they only allow a `baseline-retained-title-ledger.tsv`. Full raw pass/drop ledgers require future gated scans that capture raw inventory before filtering.
- New score bands are shadow thresholds only. The implementation must output old-vs-new scores, deltas, band distributions, threshold-near examples, and hard-drop counts before any production default is accepted.
- Automatic hard drops require strong evidence/confidence except unambiguous hard-drop titles or explicit 6+ YoE. Moderate/weak evidence should go to review.

## 2026-05-03T21:18:27-04:00 — Production filter shadow implementation facts

Codex implemented the shadow/review phase without wiring the new rules into production exporter/config/default scan behavior.

- Added `scripts/lib/jd-sections.mjs` and `scripts/lib/job-fit-rules.mjs` with tests. The rule engine encodes sales hard-drop first, Associate as annotation, guarded generic AI engineering, highest base for Solutions/Deployment/Architect/FDE, $120K USD/CAD upper-bound comp hard drops, hourly annualization, corrected YoE ladder, remote+hybrid keep, and non-Toronto hybrid/on-site without remote hard drop.
- Added `scripts/production-filter-refinement-audit.mjs`, which generated `career-ops/output/production-filter-refinement-review-2026-05-01.xlsx`, checkpoint ledgers under `career-ops/output/checkpoints/2026-05-01/`, and `docs/audits/2026-05-03-production-filter-refinement-summary.json`.
- Current shadow audit metrics: 956 pipeline rows scored, 613 visible Excel rows preserved, baseline SHA unchanged, 482 shadow hard-drop candidates, 219 visible shadow hard drops, 47 sales, 94 compensation, 160 YoE, and 304 location hard-drop signals. These counts include overlapping reasons and are review-first, not production defaults.
- Added `scripts/gated-full-scan-v1.mjs` and `scripts/ats-adapters/direct-core-v1.mjs`; default mode is dry-run/no-network and writes only ledgers.
- Extended `career-ops/enrich-jobs.mjs` signal extraction with currency-before annual ranges, hourly annualization metadata, comp confidence/rate fields, and YoE detail fields. Fetch behavior and exporter wiring remain unchanged.

## 2026-05-04T00:33:19-04:00 — Shadow implementation self-audit corrections

Self-audit found and fixed small mismatches with the implementation plan:

- `scripts/lib/job-fit-rules.mjs` now exports the planned `classifyTitle()` helper.
- Shadow family weights now match the plan's exact base values: Solutions/Deployment/Architect/FDE 12, AI engineering 10, AI program/product 8, AI eval 7, creative AI 5, generic engineering review 2.
- `career-ops/enrich-jobs.mjs` now emits planned YoE fields in addition to the old compatibility field: `yoe_required_min`, `yoe_required_max`, `yoe_confidence`, and `yoe_source_section`.
- `career-ops/test-enrich-signals.mjs` now covers the missing currency-before, CA$, hourly crossing-floor, numeric-only non-comp, YoE 3/4/6+, and generic company-history YoE cases. Enrichment tests now pass 54/54.
- The shadow review workbook and summary were regenerated after the weight correction. Hard-drop counts stayed the same, but shadow band distribution changed to S=262 / A=374 / B=228 / C=92.

## 2026-05-04T16:48:00-04:00 — User-sampled shadow audit bug patterns

Will sampled false hard-drop labels in the shadow workbook. Codex inspected the rows and confirmed the bug pattern:

- Phantom compensation came from `scripts/lib/job-fit-rules.mjs` scanning arbitrary whole-document numbers as salary ranges. Examples included travel `30-40%`, Cloudflare travel `20-50%`, Ideogram image/API IDs `34-95`, Scale EEOC poster ID `22-088`, and funding/customer metrics. Existing enrichment cache correctly had `comp_* = null` for several of these rows; the shadow audit recomputation was the culprit.
- Fixed compensation extraction to use compensation sections, anchored compensation windows, or explicit money windows only. Missing comp now becomes `comp_unknown`, not a hard drop. Escaped Greenhouse salary ranges like `$216,000 \- $270,000USD` now parse correctly.
- YoE logic now follows Will's corrected matrix: 0-2 = +5, 3 = +3, 4 = -2, 5 = -6, minimum >5 hard drop. Ranges use lower bound for fit (`0-10` keeps with +5; `6-8` hard-drops). Multiple requirements hard-drop if any specific requirement has min >5, such as `7+ years backend infrastructure`.
- Reviewer Queue now excludes already hard-dropped rows.
- Shadow location decision now hard-drops specific non-Toronto locations without a genuine remote signal, using `specific_non_toronto_location_no_remote`, in addition to hybrid/on-site non-Toronto rules.
- Official prior workbook appeared locked/open, so Codex generated fixed v2 output at `career-ops/output/production-filter-refinement-review-2026-05-01-v2.xlsx` with summary `docs/audits/2026-05-04-production-filter-refinement-v2-summary.json`.

## 2026-05-04T17:28:08-04:00 — Shadow audit hardening V3 facts

Codex implemented the mechanism-level hardening requested after Will sampled Glean, SpaceX, dbt Austin, Legora, and Opaque rows.

- Compensation shadow hard drops now require explicit money/salary/rate evidence. Travel percentages, customer/funding metrics, poster IDs, country/phone code lists, and generic compensation boilerplate are rejected as salary candidates.
- If multiple salary candidates exist, the shadow scorer prefers a valid USD/CAD candidate whose annualized upper bound meets the $120K floor instead of hard-dropping on a lower level. This fixes SpaceX-style Level I/Level II ranges.
- Cached `extracted_signals.comp_*` is now weak fallback only when no explicit JD salary candidate is parsed, preventing stale CAD/USD inference from overriding real JD text.
- Location logic treats `Remote Hiring Process`, remote interviews, remote cloud/storage/control, and similar phrases as non-work-mode remote. Generic `remote-first company` text no longer overrides a role-specific non-Toronto hybrid/in-office requirement.
- The production refinement workbook now has a `Validation Findings` sheet and summary-level validation gate. V3 has 7 review-only findings and 0 blocking findings; Reviewer Queue still excludes hard drops.
- Generated V3 output: `career-ops/output/production-filter-refinement-review-2026-05-01-v3.xlsx`; summary: `docs/audits/2026-05-04-production-filter-refinement-v3-summary.json`.
- V3 metrics: 956 pipeline rows, 613 baseline Excel rows, 586 shadow hard drops, 299 visible shadow hard drops, 47 sales, 1 compensation, 149 YoE, 401 location hard-drop signals; baseline SHA unchanged.

## 2026-05-04T18:11:58-04:00 — Shadow audit V4 facts after independent review

Kepler independently reviewed V3 and found the next layer of issues: genuine remote roles were still sometimes hard-dropped as no-remote, Reviewer Queue contained Sales Engineering/pre-sales/OTE rows, and strong AI titles with weak/missing JD evidence could fall to UNKNOWN/C. Codex implemented V4 from those findings.

- Sales detection is now evidence-weighted rather than one-keyword fatal. Isolated phrases like `collaborate with sales` do not hard-drop; stacked evidence such as Sales/Sales Engineering department, OTE/commission, quota, pre-sales, Account Executives, sales process, closing, or revenue targets does hard-drop.
- Location parsing now prioritizes role-specific location/remote lines and excludes more boilerplate/noise: in-office lunch benefits, remote hiring/interview/process terms, remote ground/cloud/storage/control, and phone/country-code artifacts.
- Genuine remote variants now override no-remote hard drops: `United States Remote`, `Remote (US)`, `Remote - USA`, `Canada Remote`, `UK Remote`, `Remote Los Angeles`, `remote work`, and `remote candidates considered`.
- Non-Toronto geography coverage expanded for reviewer findings, including Redwood City, Hawthorne, Menlo Park, Mountain View, Palo Alto, Paris, and France.
- High-intent AI titles like Expedia `Machine Learning Scientist II - Agentic Experience` and Tempus `GenAI Product Builder` no longer silently remain UNKNOWN/C.
- V4 output: `career-ops/output/production-filter-refinement-review-2026-05-01-v4.xlsx`; summary: `docs/audits/2026-05-04-production-filter-refinement-v4-summary.json`.
- V4 metrics: 956 pipeline rows, 613 baseline Excel rows, 543 shadow hard drops, 262 visible shadow hard drops, 115 sales, 1 comp, 149 YoE, 362 location hard-drop signals, 6 review-only validation findings, 0 blocking findings; baseline SHA unchanged.

## 2026-05-04T22:21:04-04:00 — Shadow audit V5 source hygiene facts

Singer independently reviewed V4 and found that remaining false decisions mostly came from source hygiene, not scoring policy: page-not-found Workday caches, generic careers/open-position indexes, blog/article pages, missing caches, and listing-page contamination were still being treated like valid row-level JDs.

- V5 detects invalid or non-row-level source text before scoring and hard-drop logic: missing JD cache, Workday/page-not-found/closed-posting cache text, generic open-position indexes, generic careers location pages, blog/news/press/resource pages, and listing pages where the row title is absent.
- Invalid source text is no longer allowed to create sales, YoE, comp, or location hard drops. Rows are routed to `Source Repair Review` with `source_repair_reason` and evidence.
- `Source Repair Review` now includes retained bad-source rows plus the 14 known missing seed URLs, so the sheet is no longer empty.
- Remote recognition now covers `United States (Remote)`, `Washington, D.C. (Remote)`, `Remote - USA`, `Remote (US)`, and similar variants. These should not be labeled as no-remote hard drops.
- V5 output: `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx`; summary: `docs/audits/2026-05-04-production-filter-refinement-v5-summary.json`.
- V5 metrics: 956 pipeline rows, 613 baseline Excel rows, 514 shadow hard drops, 236 visible shadow hard drops, 108 sales, 1 comp, 148 YoE, 361 location hard-drop signals, 206 Source Repair Review rows, 4 review-only validation findings, 0 blocking findings; baseline SHA unchanged.
<!-- section:entries:end -->
