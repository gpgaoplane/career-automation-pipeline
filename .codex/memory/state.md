---
status: active
type: state
owner: codex
last-updated: 2026-04-30T17:25:27-04:00
read-if: "you need to know Codex's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl`
**Active task:** Completed documentation reconciliation and Claude handoff packaging after AC-2 replacement.
**Pause point:** Acceptance audit is 12 PASS / 0 FAIL / 0 pending. `AI_HANDOFF.md` and `RESUME_PROMPT.md` are current for a fresh Claude Code pickup. AC-2 now measures source accounting and miss explainability: source resolved 38/50 (76.0%), source health 37/38 (97.4%), raw job availability 36/37 (97.3%), no-yield companies classified 22/22 (100.0%), relevant job yield report-only 28/50 (56.0%).
**Blockers:** None for proceeding to the full 397-company rescan under the replacement source-accounting AC-2. Known warning: Seagate Technology is classified as `SOURCE_BROKEN`.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
- Run the Phase 2.6 clean rescan on all 397 enabled portals, preserving source-accounting metrics and no-yield classification.
- After full rescan, prioritize the `ROUTE_MISSING` backlog by company fit instead of treating every route miss as a blocker.
- Consider a later low-fit cleanup for hardware/clinical rows surfaced by classification, separate from source-health metrics.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- Should the repo eventually add structured `source_status` / `disable_reason` YAML keys instead of relying on free-text `note:` values?
- Should `ROUTE_MISSING` backlog prioritization become a generated report after the full 397-company rescan?
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-30T17:25:27-04:00
<!-- section:read-watermark:end -->
