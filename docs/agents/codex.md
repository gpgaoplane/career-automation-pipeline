---
status: active
type: work-log
owner: codex
last-updated: 2026-04-30T16:07:21-04:00
read-if: "you need to see Codex's recent work and watch-outs"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex Work Log

## Onboarded: 2026-04-28

**Platform:** Codex
**Adapter file:** .codex/CODEX.md
**First task:** (first entry below)

---

<!-- collab:log-archived-summary:start -->
<!-- WARNING: framework-managed; edit OUTSIDE this block, not inside -->
<!-- Older entries collapse to one-liners here on rotation; full history in
     .collab/archive/agents/codex-<date>.md -->
<!-- collab:log-archived-summary:end -->

<!-- new entries appended below, newest last -->

## 2026-04-28 — Reviewed Claude Phase 2.7 design plan

**Goal:** Review Claude's design plan for portals.yml cleanup, the mid-level profile pivot, and rule-based pre-scoring before implementation.

**What I read:** `AGENTS.md`, `AI_AGENTS.md`, `.codex/CODEX.md`, Codex memory files, `.collab/{INDEX,ROUTING,PROTOCOL}.md`, `.claude/memory/{decisions,context}.md`, `docs/STATUS.md`, `docs/agents/claude.md`, the full design plan, and the primary source files called out by the reviewer checklist: `career-ops/portals.yml`, `career-ops/modes/_profile.md`, `career-ops/config/profile.yml`, `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs`, plus `career-ops/package.json`.

**Handoff:** Picked up handoff `20260428-221522-bc38` from Claude, wrote the review, then closed the handoff.

**Key findings:** The plan is directionally sound, but I found five issues to resolve before implementation:
- Post-cleanup direct/branded ATS count appears to be 18 / 410, not 17 / 411, if both Labelbox and Genmo are re-enabled.
- D-8's "sequential clean rescan" conflicts with current scraper concurrency in `scan.mjs` and `custom-scraper.mjs`.
- The compensation penalty rule conflicts between §8.1, §8.2, and Q-7; lower-bound interpretation should be stated consistently.
- §5.1 misses stale count locations in `AI_AGENTS.md` and `docs/STATUS.md`; acceptance greps are too narrow.
- `CREATIVE` has a weight but no title-track parser route emits it.

**Feedback location:** Appended `## §17. Review Comments` to `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`.

**Open questions:** Whether Claude wants to revise D-8 as enrichment-only sequential or change existing scraper concurrency; whether to accept the 18 / 410 direct/branded correction.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` ........ appended Codex §17 review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260428-221522-bc38` picked up and closed via framework script
- `docs/agents/codex.md` ........ added this review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable review findings about ATS counts, scraper concurrency, and CREATIVE mapping
- `.codex/memory/decisions.md` ........ added D-1 with Codex review recommendations
- `.codex/memory/pitfalls.md` ........ added P-1 for explicit Git Bash script invocation on Windows
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/` config or code files were modified; implementation remains deferred to Claude's next plan.

## 2026-04-29 — Reviewed Claude Phase 2.7 implementation plan

**Goal:** Pick up Claude's implementation-plan handoff and verify it against design plan v2, the §18 reviewer checklist, and primary source files without modifying `career-ops/*`.

**What I read:** Framework front door and protocol files, Codex memory, implementation plan, design plan v2, `.claude/memory/decisions.md` D-12, `AI_AGENTS.md`, `docs/STATUS.md`, `docs/agents/claude.md`, and primary sources: `career-ops/portals.yml`, `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs`, `career-ops/package.json`, `career-ops/config/profile.yml`, and `career-ops/modes/_profile.md`.

**Handoff:** Picked up handoff `20260429-001531-cb9a`, wrote the review, closed the handoff, and acknowledged catchup.

**What I found:** Design v2 correctly integrated my previous five findings. The implementation plan is close, but needs fixes before execution:
- Final verification gates do not cover all 18 design acceptance criteria: missing criterion #10, criterion #12 conflicts with "do not run full-scan", and criterion #13 omits `416 enabled` / `32 disabled`.
- `enrich-jobs.mjs` CLI contract is incomplete relative to design and introduces undocumented `--limit`.
- `export-jobs.mjs` plan omits design's `--cache-warn-threshold P` flag.
- Preferred category set is still a placeholder despite QI-3 being settled.

**Feedback location:** Appended `## §20. Implementation Plan Review Comments` to `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` ........ appended Codex §20 implementation-plan review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260429-001531-cb9a` picked up and closed via framework script
- `docs/agents/codex.md` ........ added this implementation-plan review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed implementation-plan review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable findings about missing acceptance gates and CLI contract mismatches
- `.codex/memory/decisions.md` ........ added D-2 documenting the inline-review choice
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/*` files were modified; `.codex/memory/pitfalls.md` unchanged because no new recurring tool gotcha was discovered.

## 2026-04-29 — Reviewed Claude Phase 2.8 Firecrawl-pivot design

**Goal:** Pick up handoff `20260429-164715-2bcf` and review the Phase 2.8 Firecrawl-pivot design against the verification report, the decisions addendum, and Claude decisions D-14/D-15 before Claude writes the implementation plan.

**What I read:** `docs/plans/2026-04-29-firecrawl-pivot-design.md`, `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`, `docs/design/2026-04-29-firecrawl-ats-verification.md`, `.claude/memory/decisions.md`, and the handoff block in `docs/agents/claude.md`.

**Handoff:** Picked up handoff `20260429-164715-2bcf`, wrote inline review comments, closed the handoff, and acknowledged catchup.

**What I found:** D-14/D-15 are supported by the verification report, but the main design plan still contains pre-verification architecture:
- Layer 0 still reads as `scan.mjs` only and leaves a pending `scan.mjs` modification/wrapper choice, instead of D-15's settled sibling-adapter plan.
- Layer 2 still uses stale `/v1/extract` / legacy schema wording instead of `/v1/scrape` with `jsonOptions` only when JSON mode is needed.
- Cost, TTL, risk, and acceptance criteria sections still need the verification corrections: JSON mode is 5 credits/page, `/v1/extract` is a separate token pool, TTL should be 60 days with fast-fail rediscovery, rate caps remain unverified, and JazzHR should stay out of direct-adapter scope.
- Q-FC-4 is internally inconsistent on Firecrawl-first vs HTTP-first enrichment policy.

**Feedback location:** Appended `## §11. Review Comments` to `docs/plans/2026-04-29-firecrawl-pivot-design.md`.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ appended Codex §11 design review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260429-164715-2bcf` picked up and closed via framework script; frontmatter timestamp updated
- `docs/agents/codex.md` ........ added this Firecrawl design-review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed Phase 2.8 design-review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable findings about stale Firecrawl design sections
- `.codex/memory/decisions.md` ........ added D-3 documenting the inline-review choice
- `.codex/memory/pitfalls.md` ........ added P-2 for occasional Git Bash signal-pipe sandbox failures
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/*` files were modified; `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`, `docs/design/2026-04-29-firecrawl-ats-verification.md`, and `.claude/memory/decisions.md` were read but not edited.

## 2026-04-29 — Reviewed Claude Phase 2.8 Firecrawl implementation plan

**Goal:** Pick up handoff `20260429-183239-0925` on `feat/phase-2.8-firecrawl` and review the Phase 2.8 implementation plan against its §10 checklist plus the eight focus areas in Claude's handoff.

**What I read:** `docs/plans/2026-04-29-firecrawl-pivot-implementation.md`, `docs/plans/2026-04-29-firecrawl-pivot-design.md`, `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`, `docs/design/2026-04-29-firecrawl-ats-verification.md`, `.claude/memory/decisions.md`, and the handoff block in `docs/agents/claude.md`.

**Handoff:** Picked up handoff `20260429-183239-0925`, wrote inline implementation-plan review comments, closed the handoff, and acknowledged catchup.

**What I found:** The implementation plan is broadly aligned with design v2, D-14/D-15/D-17, and the verification report, but needs a v2 before Step 0:
- Root `scripts/ats-adapters/` paths conflict with `career-ops/package.json` npm script cwd.
- Several verification commands assume different working directories, making Step 1/5/8 fragile.
- `npm run full-scan --dry-run` / `--list` is not implemented by the shell-chain script as written.
- Layer 3 custom-scraper fallback is specified in design but not concretely wired into the runtime path, so AC-11 could pass as "0 invocations" without proving fallback works.
- Source-of-truth precedence should explicitly let the verification report + D-14/D-15/D-17 override stale addendum text.

**Feedback location:** Appended `## §12. Implementation Plan Review Comments` to `docs/plans/2026-04-29-firecrawl-pivot-implementation.md`.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ appended Codex §12 implementation-plan review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260429-183239-0925` picked up and closed via framework script; frontmatter timestamp updated
- `docs/agents/codex.md` ........ added this Phase 2.8 implementation-plan review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed Phase 2.8 implementation-plan review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable implementation-plan findings about path/cwd/fallback/precedence risks
- `.codex/memory/decisions.md` ........ added D-4 documenting the inline-review choice
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/*` files were modified; `.codex/memory/pitfalls.md` unchanged because the Git Bash escalation pitfall was already documented.

## 2026-04-30 — Fixed Phase 2.8 P-7/P-8/P-9 and reran sample-50 smoke

**Goal:** Pick up Claude handoff `20260430-104400-aa3d` on `feat/phase-2.8-firecrawl`, fix P-7/P-8/P-9, and rerun sample-50 smoke without crossing the Step 9/Step 10 user gates.

**What I read:** `.claude/memory/pitfalls.md` P-7/P-8/P-9, `.claude/memory/state.md`, `docs/agents/claude.md`, `docs/STATUS.md`, `AI_AGENTS.md` post-compact behavioral rules, `.collab/{PROTOCOL,ROUTING}.md`, plus the touched source/test files.

**What I changed:** P-7 cache-only adapters now filter discovery-cache targets to the current enabled `portals.yml` list. P-8 Ashby detection now covers `embed.ashbyhq.com` and the Ashby posting API form, with direct Ashby probing for Ramp/Supabase and a Firecrawl-failure fallback. P-9 Layer 2 now promotes a single ATS detected in extracted `jobs[].url` values back into the discovery cache. I also fixed the same cache-pollution class in `firecrawl-extract.mjs` target selection and guarded Firecrawl script entrypoints for safe module imports.

**Validation:** `node scripts/ats-adapters/test-iter-targets.mjs` passed 1/1; `node test-firecrawl-discover.mjs` passed 14/14; `node test-firecrawl-extract.mjs` passed 5/5. Escalated live validation confirmed Ramp → `ashby/ramp` with 119 jobs and Supabase → `ashby/supabase` with 46 jobs. AC-5 grep over active `.mjs` code found only comments mentioning `/v1/extract`, and `git diff -- career-ops/scan.mjs` was empty.

**Sample-50 smoke:** Ran scan → discover → adapters → extract only, using backup/cp/restore so live `career-ops` data was restored cleanly. Current full roster is 448 total / 388 enabled / 60 disabled; the seed-42 sample had 50 enabled. Result: 27/50 companies produced at least one title-matching job, 172 jobs total, and 29/50 companies had direct/discovered routing. Ramp and Supabase were recovered through Ashby, but many routed companies still yielded zero post-filter jobs, so the expected 45-50/50 job-yield coverage should be treated as disproved until Claude reconciles routing coverage vs title-filtered job-yield coverage.

**Feedback location:** Returned chained handoff `20260430-112119-cee0` to Claude and closed original handoff `20260430-104400-aa3d`.

**Open questions:** Should AC-2 be measured as ATS routing coverage, companies with any raw jobs, or companies with at least one title-filter-matching job? The current smoke result only supports 27/50 for the last definition.

### Task Receipt
Updates fanned out this task:
- `scripts/ats-adapters/_lib.mjs` ........ fixed P-7 cache target filtering and cache-only direct-portal exclusion
- `scripts/ats-adapters/test-iter-targets.mjs` ........ added P-7 regression test
- `career-ops/lib/ats-detect.mjs` ........ expanded Ashby URL detection for embed/API board forms
- `career-ops/firecrawl-discover.mjs` ........ added direct Ashby probing, Firecrawl-failure fallback, cache helper, and import-safe entrypoint guard
- `career-ops/test-firecrawl-discover.mjs` ........ added Ashby detection/probe/cache regression coverage
- `career-ops/firecrawl-extract.mjs` ........ added P-9 cache promotion, current-enabled target filtering, and import-safe entrypoint guard
- `career-ops/test-firecrawl-extract.mjs` ........ added P-9 and Layer-2 target-filter regression coverage
- `docs/STATUS.md` ........ updated Phase 2.8 status, Codex fix result, and sample-50 measurement
- `docs/agents/claude.md` ........ handoff `20260430-104400-aa3d` picked up/closed via framework script
- `docs/agents/codex.md` ........ added this work-log entry and return handoff `20260430-112119-cee0`
- `.codex/memory/state.md` ........ recorded completed bug-fix pass, next steps, open question, and watermark
- `.codex/memory/context.md` ........ recorded durable sample-smoke and cache-pollution findings
- `.codex/memory/decisions.md` ........ added D-5 documenting the coverage-definition recommendation
- `.codex/memory/pitfalls.md` ........ added P-3 for skip-style live tests and true live validation
- `.collab/INDEX.md` ........ bumped registry timestamps and registered the new test file

Missing / intentionally skipped: Step 9 dashboard verification and Step 10 enrich/export sample run remain user-gated; no commit was made because the user did not ask for one.

## 2026-04-30 — Re-audited Step 0 disabled companies and restored false disables

**Goal:** Resolve the 428 → 388 roster confusion by auditing the 40 companies disabled in Phase 2.8 Step 0, restoring only the high-confidence useful false disables, and making the remaining disabled rows unambiguous.

**What I read:** `AI_AGENTS.md` post-compact rules, `.codex/memory/state.md`, `.collab/{INDEX,ROUTING,PROTOCOL}.md`, `scripts/portals-apply-triage-fixes.py`, current `career-ops/portals.yml` rows for the Step 0-disabled cohort, and web/source checks for the disputed companies.

**What I changed:** Restored 9 high-confidence false disables in `career-ops/portals.yml`: Galileo AI, VAST Data, Grammarly, Thinking Machines Lab, OpenEvidence, Aurascape, Fathom, Skild AI, and Qdrant. For the false-positive-but-held rows, I replaced misleading `404 2026-04-29` notes with explicit `held disabled 2026-04-30` reasons. I also created `docs/audits/2026-04-30-step0-disabled-company-audit.md` as the durable one-row-per-company source of truth.

**Validation:** Parsed `career-ops/portals.yml` with `js-yaml`; current roster is 448 total / 397 enabled / 51 disabled. Also checked simple line-count greps for the same totals.

**Recommendation:** Keep this audit as the baseline for the Step 0 cohort. If this confusion recurs, move from free-text notes to structured YAML keys such as `source_status`, `disable_reason`, and `reviewed_at`.

### Task Receipt
Updates fanned out this task:
- `career-ops/portals.yml` ........ restored 9 high-confidence false disables and clarified held-disabled notes for Step 0 false positives
- `docs/audits/2026-04-30-step0-disabled-company-audit.md` ........ created durable audit table for all 40 Step 0-disabled companies
- `docs/STATUS.md` ........ recorded the audit result and new 448/397/51 baseline
- `docs/agents/codex.md` ........ added this work-log entry and Receipt
- `.codex/memory/state.md` ........ updated current state, next steps, open question, and watermark
- `.codex/memory/context.md` ........ recorded durable Step 0 audit findings
- `.codex/memory/decisions.md` ........ added D-6 for source truth vs scan eligibility separation
- `.collab/INDEX.md` ........ registered the new audit doc and bumped touched managed-file timestamps

Missing / intentionally skipped: no commit was made because the user did not ask for one; `.codex/memory/pitfalls.md` unchanged because no new recurring bug/workaround was discovered.

## 2026-04-30 — Reconciled current roster baseline across shared docs

**Goal:** Make 448 total / 397 enabled / 51 disabled the current shared baseline and prevent future agents from replaying stale 428/388-era scripts or plans.

**What I changed:** Updated `AI_AGENTS.md` to name 397 enabled / 51 disabled as current while preserving 428/20 and 388/60 as historical milestones. Regenerated `docs/design/companies-roster.md` from live `career-ops/portals.yml` and updated its generator to emit frontmatter + audit cross-link. Added supersession notes to the Phase 2.8 Firecrawl design and implementation plans. Guarded historical scripts `scripts/portals-apply-triage-fixes.py`, `scripts/acceptance-audit.py`, and `scripts/portals-audit-cleanup.py` behind explicit opt-in flags. Added a superseded notice to `AI_HANDOFF.md`.

**Sub-agent review:** Spawned two Codex sub-agents. The first independently audited stale baseline references and found additional stale script/plan risks, which I addressed. The second reviewed the finished cleanup and found one actionable issue: `docs/STATUS.md` was missing from `.collab/INDEX.md`; I added it.

**Validation:** Parsed `career-ops/portals.yml` with `js-yaml`: 448 total / 397 enabled / 51 disabled. Regenerated roster reports 448 / 397 / 51. Historical scripts now refuse to run without their guard flags. `git diff --check` passed with only CRLF warnings.

**Watch out:** Claude-owned `.claude/memory/state.md` and `.claude/memory/context.md` still need Claude-side reconciliation; Codex did not directly edit another agent's memory.

### Task Receipt
Updates fanned out this task:
- `AI_AGENTS.md` ........ updated canonical shared project context to current 448/397/51 baseline with 428/388 marked historical
- `docs/design/companies-roster.md` ........ regenerated from live `portals.yml`; now shows 448/397/51 and includes frontmatter + audit link
- `scripts/generate-companies-roster.py` ........ added frontmatter generation and audit cross-link metadata
- `scripts/portals-apply-triage-fixes.py` ........ guarded historical 388-state replay behind `--allow-historical-rerun`
- `scripts/acceptance-audit.py` ........ guarded historical Phase 2.7 428/20 audit behind `--allow-historical-phase27`
- `scripts/portals-audit-cleanup.py` ........ guarded historical Phase 2.7 428/20 cleanup behind `--allow-historical-phase27`
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ added supersession note pointing to current 448/397/51 sources
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ added supersession note pointing to current 448/397/51 sources
- `AI_HANDOFF.md` ........ added superseded notice so emergency-hook stale counts are not trusted as current
- `docs/STATUS.md` ........ recorded baseline reconciliation cleanup completion
- `.codex/memory/state.md` ........ updated pause point and next steps
- `.codex/memory/context.md` ........ recorded durable reconciliation facts
- `.codex/memory/decisions.md` ........ added D-7 for guarding historical Step 0 replay
- `.collab/INDEX.md` ........ registered/bumped current shared docs and scripts, including `docs/STATUS.md`
- `docs/agents/codex.md` ........ added this work-log entry and Receipt

Missing / intentionally skipped: `.claude/memory/*` not edited because it is Claude-owned; a handoff to Claude is required for that reconciliation. No commit was made because the user did not ask for one.

## 2026-04-30 — Completed Step 9/Step 10 verification and reconciled acceptance audit

**Goal:** Use the user-supplied Firecrawl dashboard caps to finish Phase 2.8 Step 9, run the transactional Step 10 sample-50 full-pipeline verification, and decide whether the project is clear for the full 397-company rescan.

**What I read:** `AI_AGENTS.md` post-compact rules, `.codex/memory/state.md`, `.collab/{INDEX,ROUTING,PROTOCOL}.md`, `docs/STATUS.md`, Step 10 audit artifacts, `career-ops/enrich-jobs.mjs`, `career-ops/test-enrich-signals.mjs`, and `scripts/acceptance-audit-phase2.8.py`.

**What I changed:** Wrote the Step 9 caps to gitignored `career-ops/data/firecrawl-plan-caps.tsv`, ran the Step 10 sample-50 pipeline transactionally, preserved `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx`, and wrote `docs/audits/2026-04-30-step10-sample50-results.md` plus `docs/audits/2026-04-30-step10-sample50-metrics.json`. After sub-agent review confirmed AC-3's ambiguity, I added `location_raw` extraction to `career-ops/enrich-jobs.mjs`, expanded compensation parsing for Firecrawl markdown pay ranges, added fixtures in `career-ops/test-enrich-signals.mjs`, and updated `scripts/acceptance-audit-phase2.8.py` to read the Step 10 metrics.

**Result:** Step 10 exported 178 pending jobs from 28/50 companies; bands were S=7/A=58/B=111/C=2; Firecrawl cost log recorded 383 credits for the run. AC-3 now passes under generic `location_raw` OR compensation extraction (126/178 = 70.8%), and AC-11b passes with 0 new fallback queue rows. AC-2 fails under the user-visible title-filtered exported-company definition: 28/50 = 56.0% vs >=75%.

**Watch out:** Do not run the full 397-company rescan yet. AC-2 needs definition/remediation, and Seagate Technology's Workday CXS route returned HTTP 422 in `ats-adapters` during Step 10.

**Validation:** `node test-enrich-signals.mjs` passed 26/26. `python scripts/acceptance-audit-phase2.8.py` reports 11 PASS / 1 FAIL / 0 pending; the failing check is AC-2 by design from current metrics.

### Task Receipt
Updates fanned out this task:
- `career-ops/data/firecrawl-plan-caps.tsv` ........ recorded user-supplied Step 9 dashboard caps (gitignored local data)
- `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx` ........ preserved Step 10 sample workbook (gitignored local output)
- `docs/audits/2026-04-30-step10-sample50-results.md` ........ created Step 10 result audit and recommendations
- `docs/audits/2026-04-30-step10-sample50-metrics.json` ........ created machine-readable Step 10 acceptance metrics
- `career-ops/enrich-jobs.mjs` ........ added generic `location_raw` extraction and broadened comp parsing for Firecrawl markdown pay ranges
- `career-ops/test-enrich-signals.mjs` ........ added fixtures for `$200-$325k` pay ranges and Ashby-style location headings
- `scripts/acceptance-audit-phase2.8.py` ........ wired AC-2, AC-3, and AC-11b to Step 10 metrics
- `docs/STATUS.md` ........ recorded Step 9/10 completion and AC-2 blocker
- `.codex/memory/state.md` ........ updated current state, blockers, next steps, and watermark
- `.codex/memory/context.md` ........ recorded durable Step 10 metrics and warning
- `.codex/memory/decisions.md` ........ added D-8 for AC-3 `location_raw` interpretation
- `.codex/memory/pitfalls.md` ........ added P-4 warning not to conflate `location_match` with generic location extraction
- `.collab/INDEX.md` ........ registered Step 10 audit artifacts and bumped touched managed-file timestamps
- `docs/agents/codex.md` ........ added this work-log entry and Receipt

Missing / intentionally skipped: no commit was made because the user did not ask for one; full 397-company rescan intentionally skipped because AC-2 remains failing.

## 2026-04-30 — Replaced AC-2 with source accounting and classified sample misses

**Goal:** Replace the vague ">=75% sample companies produce exported jobs" AC-2 gate with metrics that distinguish source reachability, source health, raw job availability, and Will-relevant job yield.

**What I read:** `docs/audits/2026-04-30-step10-sample50-results.md`, `docs/audits/2026-04-30-step10-sample50-metrics.json`, `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx`, `career-ops/data/ats-discovery-cache.json`, `career-ops/lib/ats-clients.mjs`, `scripts/ats-adapters/_lib.mjs`, `scripts/acceptance-audit-phase2.8.py`, and `docs/STATUS.md`.

**What I changed:** Added `docs/audits/2026-04-30-sample50-missed-company-classification.md` with the replacement AC-2 metric stack and one row for each of the 22 no-yield sample companies. Updated Step 10 metrics JSON and `scripts/acceptance-audit-phase2.8.py` so AC-2 checks source accounting/miss explainability rather than forced exported-job coverage. Added supersession notes to the Phase 2.8 design and implementation plans so future agents do not reuse the old 75% wording.

**Result:** Source resolved 38/50 (76.0%), source health 37/38 (97.4%), raw job availability 36/37 (97.3%), no-yield classification 22/22 (100.0%), relevant job yield report-only 28/50 (56.0%). Miss buckets: 8 `NO_RELEVANT_JOBS`, 1 `NO_OPEN_JOBS`, 12 `ROUTE_MISSING`, 1 `SOURCE_BROKEN`. Seagate is classified as `SOURCE_BROKEN` after Workday CXS returned HTTP 422 and direct Workday HTML returned a maintenance page.

**Validation:** `python scripts/acceptance-audit-phase2.8.py` now reports 12 PASS / 0 FAIL / 0 pending. Metrics JSON parses successfully.

### Task Receipt
Updates fanned out this task:
- `docs/audits/2026-04-30-sample50-missed-company-classification.md` ........ created durable replacement AC-2 audit and classified all 22 sample no-yield companies
- `docs/audits/2026-04-30-step10-sample50-results.md` ........ updated Step 10 report with source-accounting metrics and AC-2 supersession
- `docs/audits/2026-04-30-step10-sample50-metrics.json` ........ added source-resolution, source-health, raw-availability, and miss-classification metrics
- `scripts/acceptance-audit-phase2.8.py` ........ replaced AC-2 pass/fail logic with source-accounting gate
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ added AC-2 supersession note
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ added AC-2 supersession note
- `docs/STATUS.md` ........ recorded 12/12 acceptance and full-rescan next step
- `.codex/memory/state.md` ........ updated current state, next step, and watermark
- `.codex/memory/context.md` ........ recorded durable AC-2 replacement metrics
- `.codex/memory/decisions.md` ........ added D-9 for replacing exported-company coverage with source accounting
- `.codex/memory/pitfalls.md` ........ added P-5 warning not to conflate no-yield outcomes
- `.collab/INDEX.md` ........ registered the new classification audit and bumped touched managed-file timestamps
- `docs/agents/codex.md` ........ added this work-log entry and Receipt

Missing / intentionally skipped: no commit was made because the user did not ask for one; full 397-company rescan not started in this step because it is the next gate and will spend additional Firecrawl credits.

## 2026-04-30 — Reconciled docs and packed Claude full-rescan handoff

**Goal:** Make the repo clear for a fresh Claude Code session after AC-2 replacement, including current source-of-truth docs, stale-doc cleanup, and a direct bridge prompt.

**What I read:** `docs/STATUS.md`, `AI_HANDOFF.md`, `RESUME_PROMPT.md`, `docs/design/scraping-architecture.md`, Phase 2.8 design/implementation plans, Step 10 audit artifacts, Codex memory, `.collab/INDEX.md`, and a read-only sub-agent stale-reference audit.

**What I changed:** Replaced the stale emergency `AI_HANDOFF.md` and `RESUME_PROMPT.md` with current Phase 2.8 full-rescan pickup guidance. Updated `docs/design/scraping-architecture.md` with frontmatter and a Phase 2.8 supersession note so it no longer claims Firecrawl is unused. Updated the Step 10 audit's Seagate wording so it is a `SOURCE_BROKEN` warning rather than a full-rescan blocker. Updated Phase 2.8 plan bodies so old AC-2 >=75% text is superseded by source-accounting AC-2. Registered new handoff docs in `.collab/INDEX.md`.

**Sub-agent review:** Spawned a read-only explorer to search for stale authoritative statements. It confirmed `docs/STATUS.md` is aligned, flagged stale Claude-owned memory, stale `RESUME_PROMPT.md`, stale pre-Firecrawl scraping architecture, and the Seagate wording. Codex did not edit `.claude/memory/*`; Claude should reconcile its own memory on pickup.

**Validation target:** Current green gate remains `python scripts/acceptance-audit-phase2.8.py` = 12 PASS / 0 FAIL / 0 pending. Next work remains the full 397-company clean rescan under source-accounting metrics.

### Task Receipt
Updates fanned out this task:
- `AI_HANDOFF.md` ........ replaced stale emergency handoff with current Phase 2.8 full-rescan pickup package
- `RESUME_PROMPT.md` ........ replaced stale auto-resume prompt with current Claude Code pickup prompt
- `docs/design/scraping-architecture.md` ........ added frontmatter and Phase 2.8 Firecrawl supersession note
- `docs/audits/2026-04-30-step10-sample50-results.md` ........ clarified Seagate as `SOURCE_BROKEN` warning, not blocker
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ updated old AC-2 body wording to source-accounting model
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ updated Step 5/10/11 and AC mapping wording to source-accounting model
- `.codex/memory/state.md` ........ updated handoff-packaging pause point
- `.codex/memory/context.md` ........ recorded durable handoff package facts
- `.collab/INDEX.md` ........ registered handoff docs and scraping architecture, bumped touched timestamps
- `docs/agents/codex.md` ........ added this work-log entry and Receipt

Missing / intentionally skipped: `.claude/memory/*` is stale but intentionally not edited by Codex; Claude should reconcile it after pickup. No commit was made because the user did not ask for one.

## Handoff blocks

When you finish a substantive chunk of work and want another agent to take over,
run `collab-handoff <to-agent>`. It appends a structured block at the end of this
log with a stable id, what you did, files touched, and the branch state. See
`docs/handoff-schema.md` for the full format.

When the work log exceeds `rotate_at_lines` (default 300, see `.collab/config.yml`),
run `./scripts/collab-rotate-log.sh codex` to archive older entries.
Receipts and open handoff blocks are preserved; archived entries collapse to
one-line summaries in the archived-summary marker block above.

<!-- collab:handoff:start id=20260430-112119-cee0 -->
## Handoff → claude

- **handoff-id:** `20260430-112119-cee0`
- **parent-id:** `20260430-104400-aa3d`
- **from:** codex
- **to:** claude
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-30T11:21:19-04:00
- **status:** closed

### What I did
Codex fixed P-7/P-8/P-9 and reran sample-50 smoke (scan -> discover -> adapters -> extract only; no enrich/export Step 10). Key changes: iterTargets now filters cache entries to current enabled portals.yml and cache-only adapters exclude direct portals; Ashby detection now covers embed/API board forms plus direct Ashby slug probing for Ramp/Supabase, including Firecrawl-failure fallback; firecrawl-extract now promotes a single ATS detected in extracted job URLs and also filters no-ats-found extract targets to current enabled portals.yml to avoid Layer-2 cache pollution. Tests added/updated for all of those.

Validation: unit suites pass (test-iter-targets 1/1; test-firecrawl-discover 14/14; test-firecrawl-extract 5/5; live subtests use skip-style under sandbox fetch failures). Escalated live check confirms Ramp -> ashby/ramp with 119 jobs and Supabase -> ashby/supabase with 46 jobs. AC-5 grep over *.mjs shows only comments mention /v1/extract, no active extractorOptions/extractionSchema usage. scan.mjs diff is empty.

Sample-50 true smoke result after fixes: 50 enabled from seed=42 sample generated off current 388-enabled full roster; 27/50 companies produced >=1 title-matching job, 172 jobs total. Discovery/direct routing was 29/50; Ramp and Supabase were recovered through Ashby and adapters added 13 + 6 jobs respectively. Remaining gap is not just ATS discovery: many routed companies have zero title-filter-matching jobs (e.g. SiFive, D-Matrix, Vectra AI, Recursion, Entegris, Tokyo Electron, Cadence). Recommend Claude treat expected 45-50/50 as disproved for job-yield coverage; next decision should distinguish ATS routing coverage from post-title-filter job coverage before Step 10.

### Files touched
scripts/ats-adapters/_lib.mjs scripts/ats-adapters/test-iter-targets.mjs career-ops/lib/ats-detect.mjs career-ops/firecrawl-discover.mjs career-ops/test-firecrawl-discover.mjs career-ops/firecrawl-extract.mjs career-ops/test-firecrawl-extract.mjs docs/STATUS.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260430-161303-809e -->
## Handoff → claude

- **handoff-id:** `20260430-161303-809e`
- **parent-id:** `none`
- **from:** codex
- **to:** claude
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-30T16:13:03-04:00
- **status:** closed

### What I did
Codex completed roster baseline reconciliation after Step 0 disabled-company audit. Current source of truth is 448 total / 397 enabled / 51 disabled in career-ops/portals.yml, docs/STATUS.md, AI_AGENTS.md, docs/design/companies-roster.md, and docs/audits/2026-04-30-step0-disabled-company-audit.md. Please reconcile Claude-owned memory/state/context from stale 428/388 references, review guarded historical scripts, and validate before Step 9/Step 10.

### Files touched
AI_AGENTS.md docs/STATUS.md docs/design/companies-roster.md docs/audits/2026-04-30-step0-disabled-company-audit.md scripts/portals-apply-triage-fixes.py scripts/acceptance-audit.py scripts/portals-audit-cleanup.py docs/plans/2026-04-29-firecrawl-pivot-design.md docs/plans/2026-04-29-firecrawl-pivot-implementation.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260430-215447-c74d -->
## Handoff → claude

- **handoff-id:** `20260430-215447-c74d`
- **parent-id:** `none`
- **from:** codex
- **to:** claude
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-30T21:54:47-04:00
- **status:** open
- **picked-up:** 2026-04-30T22:11:42-04:00 by claude

### What I did
Phase 2.8 sample-50 acceptance is green after AC-2 source-accounting replacement. Current roster 448/397/51; acceptance audit 12 PASS / 0 FAIL / 0 pending. Codex packed fresh-pickup docs in AI_HANDOFF.md and RESUME_PROMPT.md. Next recommended work: run full 397-company clean rescan under source-accounting metrics, then produce full-run no-yield classification. Please reconcile stale Claude-owned memory first; Codex did not edit .claude/memory/* per framework boundaries.

### Files touched
AI_HANDOFF.md RESUME_PROMPT.md docs/STATUS.md docs/audits/2026-04-30-sample50-missed-company-classification.md docs/audits/2026-04-30-step10-sample50-results.md docs/audits/2026-04-30-step10-sample50-metrics.json docs/design/scraping-architecture.md docs/plans/2026-04-29-firecrawl-pivot-design.md docs/plans/2026-04-29-firecrawl-pivot-implementation.md scripts/acceptance-audit-phase2.8.py docs/agents/codex.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->
