---
status: active
type: state
owner: codex
last-updated: 2026-05-05T11:39:22-04:00
read-if: "you need to know Codex's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl`
**Active task:** Multi-agent-collab framework manually upgraded to 0.4.3; awaiting user confirmation before log rotation.
**Pause point:** Framework state now shows `.collab/VERSION = 0.4.3`, local `scripts/collab-*.sh` helpers/templates are installed, `.collab/PROTOCOL.md` is refreshed, `.collab/.migrations/` sentinels are written, and `.collab/UPGRADE_NOTES.md` records the upgrade. Because Bash is blocked in this Codex Windows sandbox, the migration was applied manually from the npm tarball and preserved with `.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip`. `AI_HANDOFF.md` and `RESUME_PROMPT.md` still summarize the current shadow-calibration state for Claude. V5 and diff artifacts remain current; production `export-jobs.mjs`, `portals.yml`, profile docs, default `npm run full-scan`, tracker data, caches, baseline workbook, and live scraping behavior remain unchanged.
**Blockers:** Will needs to review the shadow workbook before any production exporter/config/default scan changes.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
- Have Will inspect `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx` for exact V3→V4 and V4→V5 row-level movements.
- Optionally spawn an independent reviewer agent to re-check `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx` and/or the diff workbook.
- Claude should start from `AI_HANDOFF.md`, `RESUME_PROMPT.md`, `docs/STATUS.md`, latest `docs/agents/codex.md`, and this Codex memory state/context/decisions.
- After Will confirms, rotate `docs/agents/codex.md` and `docs/agents/claude.md`. The new 0.4.3 scripts are present, but Bash may still need to be run by Claude/user or rotation may need a PowerShell-equivalent/manual path in Codex.
- Have Will review V5, especially Source Repair Review, Hard Drop Review, Sales Hard Drops, Validation Findings, Comp YoE Location, Score Deltas, Reviewer Queue, and Known Missing Seeds.
- After Will approves specific rule groups, wire approved rules into `career-ops/export-jobs.mjs`, `career-ops/portals.yml`, profile docs, and eventually gated scan commands.
- Do not change production `export-jobs.mjs`, `portals.yml`, profile docs, or default `npm run full-scan` until Will approves the shadow workbook results.
- V1.1 can add live/current-board comparison and targeted source-repair diagnostics; V1 intentionally did not fetch live boards.
- If Will returns the marked Excel, generate per-row TSVs in `career-ops/batch/tracker-additions/`, run `node merge-tracker.mjs` from `career-ops/`, and optionally evaluate the P1 batch first.
- If Will chooses Phase 3, start from the candidate menu in `AI_HANDOFF.md`: A LLM evaluation pipeline, B calibration, C delta detection, D SOURCE_BROKEN refresh, E NO_RELEVANT_JOBS cleanup.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- Does Will approve the 514 v5 shadow hard-drop candidates, or should specific rule groups be softened before production wiring?
- Should Source Repair Review rows be live-checked in V1.1 or left as offline repair candidates until a new scan cycle?
- Is the corrected `5+ years` interpretation acceptable: minimum 5 gets -6 + review annotation, while 6+ / more-than-5 hard-drops?
- Should `Remote - US` remain automatically eligible, or keep with a distinct review annotation because some companies may intend U.S.-resident remote only?
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-05-05T11:39:22-04:00
<!-- section:read-watermark:end -->
