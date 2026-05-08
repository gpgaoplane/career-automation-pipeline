---
status: active
type: decisions
owner: codex
last-updated: 2026-05-05T11:39:22-04:00
read-if: "you need Codex's major design decisions"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Decision Log

Append new decisions below. Format:

```
## D-<n> — <title> — <ISO-8601>
**Context:**
**Alternatives:**
**Choice:**
**Rationale:**
**Tradeoffs:**
```

<!-- section:entries:start -->
## D-1 — Review recommendations for Phase 2.7 design — 2026-04-28T22:32:14-04:00
**Context:** Claude asked Codex to review the portals cleanup, mid-level pivot, and pre-scoring design before implementation.
**Alternatives:** Approve as-is; return a short handoff; append substantive inline review comments with required fixes and Q-1..Q-8 recommendations.
**Choice:** Appended inline §17 review comments and recommended fixing the ATS distribution to 18 direct / 410 branded, clarifying whether D-8 sequentiality applies to enrichment only or to existing scrapers, using the compensation low bound consistently, expanding stale-count propagation checks, and resolving the non-emitted `CREATIVE` track.
**Rationale:** These issues can lead to incompatible implementations or incorrect acceptance criteria if left ambiguous.
**Tradeoffs:** This adds another integration step for Claude before implementation, but keeps the design artifact itself as the single review surface.

## D-2 — Inline review for implementation plan — 2026-04-29T00:26:05-04:00
**Context:** Claude handed off the Phase 2.7 implementation plan for Codex review after integrating design-plan v2.
**Alternatives:** Return a short handoff saying "minor notes"; append substantive inline §20 review comments; block without writing feedback.
**Choice:** Appended inline §20 review comments to the implementation plan because the findings affect verification gates and CLI contracts before any `career-ops/*` edits begin.
**Rationale:** The plan is mostly correct, but its final acceptance gates and CLI specs could let an implementation pass while missing design requirements.
**Tradeoffs:** Adds one more plan revision before execution, but avoids starting config/code edits from a plan with known acceptance gaps.

## D-3 — Inline review for Firecrawl pivot design — 2026-04-29T17:26:59-04:00
**Context:** Claude handed off Phase 2.8 Firecrawl-pivot design for review after adding a decisions addendum, verification report, and D-14/D-15.
**Alternatives:** Return a short handoff; append substantive inline review comments; approve as-is and let implementation planning resolve drift.
**Choice:** Appended inline §11 review comments to the main Firecrawl design plan.
**Rationale:** The review found cross-artifact drift that would materially shape the implementation plan: missing sibling adapters, stale `/v1/extract` assumptions, outdated cost/TTL/risk wording, placeholder acceptance criteria, and inconsistent enrichment policy.
**Tradeoffs:** Adds one more design-integration pass, but prevents the implementation plan from inheriting baseline-knowledge assumptions the verification report already disproved.

## D-4 — Inline review for Firecrawl implementation plan — 2026-04-29T18:37:38-04:00
**Context:** Claude handed off the Phase 2.8 implementation plan for Codex review after integrating the Firecrawl design review into v2.
**Alternatives:** Return a short handoff; append substantive inline §12 review comments; approve as-is and let Step 0 execution discover issues.
**Choice:** Appended inline §12 review comments to the implementation plan.
**Rationale:** The plan is directionally sound, but path resolution, cwd conventions, dry-run verification, and Layer 3 fallback wiring could break execution or let acceptance checks pass without proving the intended behavior.
**Tradeoffs:** Adds another revision before Step 0, but keeps the first implementation pass from starting with avoidable command/path and fallback ambiguity.

## D-5 — Treat sample coverage as post-title-filter job yield unless AC-2 is revised — 2026-04-30T11:21:39-04:00
**Context:** Claude expected P-7/P-8/P-9 fixes to lift sample-50 coverage to 45-50/50, but Codex's post-fix smoke measured 27/50 companies with at least one title-filter-matching job while routing/direct discovery reached 29/50.
**Alternatives:** Report the higher routing figure; report raw extracted jobs; keep using the stricter "company appears in pipeline after title filter" definition from the smoke validation; ask Claude to redefine AC-2.
**Choice:** Report 27/50 as the true job-yield coverage and explicitly ask Claude to separate ATS routing coverage from post-title-filter job-yield coverage before Step 10.
**Rationale:** The pipeline user-visible outcome is a pending-job row after title filtering. Counting routed companies with zero matching jobs would overstate useful coverage.
**Tradeoffs:** This makes the result look worse than expected, but prevents another inflated acceptance reading.

## D-6 — Separate source truth from scan eligibility for Step 0 disables — 2026-04-30T15:25:01-04:00
**Context:** The user asked how to avoid future confusion around 428 vs 388 vs disabled companies after Step 0 disabled 40 companies, several of which were false positives or merely low-fit/unsupported rather than dead.
**Alternatives:** Re-enable every false-positive source; keep all Step 0 disables; restore only high-confidence useful targets and document the rest; introduce full structured YAML fields immediately.
**Choice:** Restored 9 high-confidence false disables, kept 20 false-positive/uncertain rows disabled with clarified notes, kept 11 correctly disabled rows disabled, and created `docs/audits/2026-04-30-step0-disabled-company-audit.md` as the durable audit table.
**Rationale:** This preserves pipeline quality while making the baseline explicit. A company can have an active source and still be intentionally disabled for fit, reachability, unsupported ATS, or low-confidence source reasons.
**Tradeoffs:** Free-text notes are still less robust than structured YAML fields. A future one-time cleanup should add `source_status`, `disable_reason`, and `reviewed_at` if this category keeps changing.

## D-7 — Guard historical Step 0 triage replay script — 2026-04-30T16:07:21-04:00
**Context:** `scripts/portals-apply-triage-fixes.py` still encoded the superseded 2026-04-29 Step 0 decisions that would reduce the roster back to 388 enabled if rerun.
**Alternatives:** Delete the script; leave comments only; add a guard flag; rewrite it to apply the new 397 baseline.
**Choice:** Kept the script for historical reproducibility but required `--allow-historical-rerun` for any execution, including dry-run.
**Rationale:** The script remains useful for audit/reproduction, but future agents cannot accidentally replay the old 388-enabled state during routine maintenance.
**Tradeoffs:** A historical rerun is slightly less convenient, but the friction is intentional and documents that the old output is no longer canonical.

## D-8 — Treat `location_raw` as the AC-3 enrichment signal — 2026-04-30T16:52:37-04:00
**Context:** Step 10 initially exposed an AC-3 ambiguity: `location_match` is a Will-fit scoring field for Toronto/GTA/Ontario, Canada-only, or fully remote US signals, not a general JD location extractor. Using it as the acceptance metric made AC-3 appear to fail even when descriptions contained ordinary job locations.
**Alternatives:** Count broad `descScore > 0`; count narrow `location_match` OR compensation; add a generic `location_raw` extractor and count `location_raw` OR compensation.
**Choice:** Added `location_raw` as an additive extracted signal and updated the Phase 2.8 audit to measure AC-3 as generic `location_raw` OR compensation.
**Rationale:** The acceptance criterion is about whether enrichment captures useful per-JD location/compensation facts. Keeping `location_match` narrow preserves scoring semantics while `location_raw` measures generic extraction quality.
**Tradeoffs:** AC-3 now has two nearby location fields that future agents must not conflate. Existing exports do not yet expose `location_raw` as a workbook column.

## D-9 — Replace AC-2 exported-company coverage with source accounting — 2026-04-30T17:13:48-04:00
**Context:** Step 10 produced title-filtered jobs for 28/50 companies. The old >=75% exported-company AC-2 treated that as a failure even though several misses were healthy sources with no relevant jobs, zero open jobs, route backlog, or externally broken sources.
**Alternatives:** Keep the old >=75% exported-company gate; lower the threshold; count source routing only; replace AC-2 with a metric stack that separates source resolution, source health, raw job availability, relevant job yield, and miss classification.
**Choice:** Retired the old exported-company pass/fail gate. AC-2 now passes when source health is >=90% for resolved sources and >=95% of no-yield companies are classified; relevant job yield remains report-only.
**Rationale:** The scraper should be judged on reachability, health, and explainability, not on whether every company happens to have a Will-relevant open role today.
**Tradeoffs:** Acceptance is more nuanced and requires a classification artifact, but it avoids incentivizing title-filter loosening or false positives just to hit a vague coverage number.

## D-10 — Design-first production filter refinement — 2026-05-03T19:22:08-04:00
**Context:** Will corrected the next filter-refinement direction: AE-only roles should drop, Associate should return as low-priority/reviewable, Solutions/Deployment/Architect/FDE should be the highest-weight family, broader engineering roles need guarded AI-evidence handling, and genuine remote options should keep with annotation even when hybrid/on-site language is also present.
**Alternatives:** Patch production keywords/scoring immediately; keep discussing only in chat; create a durable design plan and independently review it before implementation planning.
**Choice:** Created `docs/plans/2026-05-03-production-filter-refinement-design.md`, spawned Sagan for read-only independent review, and refined the plan from the critique before implementation planning.
**Rationale:** The changes touch title eligibility, JD evidence flow, location hard drops, scoring, and full-scan checkpoints. A reviewed design artifact avoids one-off keyword patches that would be hard to audit.
**Tradeoffs:** Adds one planning/review step before code changes, but preserves the 2026-05-01 baseline and exposes open implementation decisions such as vendored `scan.mjs` handling and guarded-candidate data flow.

## D-11 — Shadow-first implementation plan for production filter refinement — 2026-05-03T21:00:23-04:00
**Context:** Will asked Codex to proceed from the refined design into a concrete implementation plan and independent review. Lorentz found that the first draft could leave direct ATS on legacy filtering and could change production behavior before Will reviewed the output.
**Alternatives:** Modify production exporter/config immediately; keep the implementation plan as a broad checklist; make the implementation shadow-first with a custom gated direct-ATS path and no production-output changes before review.
**Choice:** Refined `docs/plans/2026-05-03-production-filter-refinement-implementation.md` into a shadow-first implementation plan. V1 builds shared rules, JD parser, offline reclassification/review workbook, richer signal extraction, tests, and a gated Greenhouse/Ashby/Lever wrapper, while production exporter/config/default full-scan behavior remains unchanged until Will approves the review workbook.
**Rationale:** This preserves the baseline, avoids upstream `scan.mjs` edits, resolves the direct-ATS filter gap for future gated scans, and gives Will old-vs-new score distributions before accepting new scoring bands.
**Tradeoffs:** Adds a review/shadow phase before production behavior changes, but avoids accidentally hard-dropping or re-ranking jobs without human calibration.

## D-12 — Keep implemented refinement in shadow review until Will approves rule groups — 2026-05-03T21:18:27-04:00
**Context:** Will approved proceeding with the implementation plan. The first implemented shadow audit produced 482 hard-drop candidates across the 956 retained pipeline rows, including 219 rows visible in the baseline Excel.
**Alternatives:** Wire the new rules directly into `export-jobs.mjs` now; only keep design artifacts; implement deterministic modules and review outputs first.
**Choice:** Implemented deterministic modules, ledgers, a review workbook, summary JSON, gated scan skeleton, and enrichment parser extensions while leaving production exporter/config/default scan behavior unchanged.
**Rationale:** The candidate counts are intentionally broad and need Will's calibration before any hard-drop or ranking behavior becomes production.
**Tradeoffs:** Production cleanup is delayed, but the review workbook makes the blast radius visible before any baseline or future production output changes.

## D-13 — Gate shadow workbook review-readiness on consistency validation — 2026-05-04T17:28:08-04:00
**Context:** Will sampled multiple rows where the shadow workbook had internally contradictory reasons: high salary text plus `comp_upper_below_120`, non-Toronto hybrid roles missing location reasons, and hard-dropped rows appearing in review queues.
**Alternatives:** Keep patching sampled rows manually; wire the current shadow rules into production anyway; add a workbook-level validation gate that scans every row for contradictions before review.
**Choice:** Added a `Validation Findings` sheet and summary validation object. Blocking findings make the workbook not review-ready; review-only findings stay visible for sampling. V3 currently has 0 blocking findings and 7 review-only findings.
**Rationale:** This turns row-by-row headache inspection into a repeatable mechanism-level check while preserving shadow mode and the untouched 2026-05-01 baseline.
**Tradeoffs:** The gate adds another artifact to inspect and may surface review-only noise, but it prevents confident-looking workbooks with known contradictions.

## D-14 — Use evidence-weighted sales classification — 2026-05-04T18:11:58-04:00
**Context:** Will clarified that sales-related jobs should hard-drop, but non-sales roles can mention sales language in collaboration or stakeholder context and must not be falsely dropped from a single phrase.
**Alternatives:** Keep a keyword-only sales hard drop; remove body-level sales detection and rely on title only; use an evidence stack that distinguishes weak collaboration wording from strong sales-role evidence.
**Choice:** Implemented evidence-weighted sales classification. Hard drops require hard sales titles or stacked evidence such as Sales/Sales Engineering department, OTE/commission, quota, pre-sales, Account Executives, sales process, closing, revenue targets, or commercial ownership. Isolated `collaborate/work/support/partner with sales` remains non-drop.
**Rationale:** This catches Decagon/Omnea-style Sales Engineering rows while reducing the risk of hard-dropping product/program/technical roles that merely coordinate with sales.
**Tradeoffs:** The classifier is more complex and may still need calibration, but it is auditable because the hard-drop evidence lists the evidence categories used.

## D-15 — Route invalid source text to repair instead of hard-dropping — 2026-05-04T22:21:04-04:00
**Context:** Singer's V4 review showed that broken/closed URLs, Workday page-not-found cache text, generic careers pages, open-position indexes, blog/article URLs, and listing-page contamination could still produce false sales, YoE, and location hard drops.
**Alternatives:** Keep scoring invalid cached text; only warn in Validation Findings; suppress all scoring for invalid source text and route the row to a repair queue.
**Choice:** V5 detects invalid/non-row-level source text before scoring. It suppresses hard drops from that text and routes affected retained rows plus known missing seeds into `Source Repair Review`.
**Rationale:** A broken or generic source is not evidence that the job is a bad fit. It means the source needs repair or live/current-board validation before fit rules can be trusted.
**Tradeoffs:** Some rows are temporarily removed from hard-drop/scoring certainty and moved to a larger repair queue, but this avoids false negatives caused by stale or wrong cached pages.
## D-16 — Diff shadow versions by row identity, not URL alone — 2026-05-05T10:40:40-04:00
**Context:** Will asked for every changed company role between V3/V4 and V4/V5, including rows where status stayed the same but supporting evidence changed. The first implementation attempt matched rows by normalized URL only and collapsed distinct jobs that share a generic careers URL.
**Alternatives:** Match by normalized URL only; match by URL plus company/title; invent canonical job IDs retroactively from workbook rows.
**Choice:** Use `normalized_url + normalized_company + normalized_title` as the V3/V4/V5 diff key and report unmatched rows explicitly.
**Rationale:** The shadow workbook spine has 956 rows, but generic URLs can represent many distinct titles. URL-only joins silently undercount changes and hard-drop deltas. URL + company + title preserves row-level identity without requiring unavailable upstream raw IDs.
**Tradeoffs:** If a future version changes a title string for the same underlying posting, the diff may classify it as unmatched rather than changed. That is acceptable for this artifact because title mutation itself should be visible and rare in these generated workbooks.

## D-17 — Manual multi-agent-collab upgrade path on Windows — 2026-05-05T11:39:22-04:00
**Context:** Will asked to update the multi-agent-collab framework before Claude takes over. The package latest is 0.4.3 and the repo was on 0.4.1, but Git Bash cannot run in this Codex Windows sandbox and `npx ... init` failed due a mangled Bash path.
**Alternatives:** Stop and ask Will to run the updater elsewhere; force a stash/commit to satisfy normal cleanliness checks; manually apply the declarative 0.4.1 -> 0.4.3 migration from the npm tarball while preserving context.
**Choice:** Downloaded the 0.4.3 tarball, created a preservation zip, installed the local framework scripts/templates, refreshed `.collab/PROTOCOL.md`, updated `.collab/VERSION`, wrote `.collab/.migrations/` sentinels and `.collab/UPGRADE_NOTES.md`, and preserved all project-specific context files.
**Rationale:** The migration scripts themselves describe 0.4.2 and 0.4.3 as additive/correctness updates with no user state changes required. Manual application avoids losing the handoff state while still bringing the repo to 0.4.3.
**Tradeoffs:** This bypassed the script's automated dirty-worktree backup/merge machinery because Bash could not execute. A zip backup exists at `.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip`, and the new scripts are present for Claude/user environments where Bash works.
<!-- section:entries:end -->
