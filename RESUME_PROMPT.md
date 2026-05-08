---
status: active
type: handoff
owner: codex
last-updated: 2026-05-05T11:39:22-04:00
read-if: "you are Claude or another AI agent resuming this project"
skip-if: "status != active"
related:
  - AI_HANDOFF.md
  - docs/STATUS.md
  - docs/agents/codex.md
  - .codex/memory/state.md
---

# Resume Prompt — Shadow Filter Calibration Handoff

You are Claude Code taking over in `D:/Projects/career ops` on branch `feat/phase-2.8-firecrawl`.

Phase 2.8 is closed, but the active project is now **shadow-mode production filter calibration** for Will's 2026-05-01 full-run job pipeline. Do not treat the old Phase 2.8 manual-review prompt as current.

## First Actions

1. Read `AGENTS.md`, `AI_AGENTS.md`, `.collab/INDEX.md`, `.collab/ROUTING.md`, `.collab/PROTOCOL.md`, and `.claude/CLAUDE.md`.
2. Read this file and `AI_HANDOFF.md`.
3. Read `docs/STATUS.md`.
4. Read Codex's current memory and log:
   - `.codex/memory/state.md`
   - `.codex/memory/context.md`
   - `.codex/memory/decisions.md`
   - latest entries in `docs/agents/codex.md`
5. Run `git status --short` and do not revert unrelated dirty work.
6. Verify the latest artifacts exist:
   - `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx`
   - `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx`
   - `docs/audits/2026-05-04-production-filter-refinement-v5-summary.json`
   - `docs/audits/2026-05-05-shadow-version-diff-summary.json`

## Current Truth

- Baseline workbook: `career-ops/output/jobs-2026-05-01.xlsx`
- Baseline SHA: `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`
- Baseline must remain unchanged.
- Production exporter/config/default scan/caches/tracker/live scraping remain unchanged.
- Latest shadow workbook: `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx`
- Latest diff workbook: `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx`
- Multi-agent-collab framework is now `0.4.3`; read `.collab/UPGRADE_NOTES.md` before substantive writes.
- Local collab helper scripts/templates are present under `scripts/` and `templates/`, but Codex saw Git Bash Win32 error 5 in this sandbox, so Claude should verify Bash execution before relying on helper scripts.

## Current V5 Metrics

- 956 pipeline rows
- 613 baseline Excel rows
- 514 shadow hard drops
- 236 visible shadow hard drops
- 108 sales hard drops
- 1 compensation hard drop
- 148 YoE hard drops
- 361 location hard drops
- 206 Source Repair Review rows
- 4 review-only validation findings
- 0 blocking validation findings

## Version Diff Metrics

- V3 -> V4:
  - 356 materially changed rows
  - 35 hard-drop additions
  - 78 hard-drop removals
  - 86 hard-drop reason changes
  - 0 unmatched rows
- V4 -> V5:
  - 230 materially changed rows
  - 0 hard-drop additions
  - 29 hard-drop removals
  - 192 row-level Source Repair movements
  - 0 unmatched rows

## What Will Wants Solved

Will wants the filter/rejection/scoring system to become robust before production wiring. The current problems are:

- Relevant AI/program/solutions/deployment/engineering roles were missed or under-ranked.
- U.S./non-Toronto hybrid/on-site roles should hard-drop unless genuine remote is available.
- Sales roles should hard-drop, but non-sales roles with incidental sales collaboration wording should not.
- Compensation hard drops must only happen from real salary/rate evidence.
- YoE must use lower-bound range logic and hard-drop only when the minimum required years are over 5.
- Broken/generic/closed/listing/blog/missing-cache sources should be source-repair items, not fit decisions.
- Every V3/V4/V5 change should be inspectable row by row.

## Recommended Next Move

Start by reviewing `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx`. It is the current source of truth for Will's latest request about exactly what changed and why.

If Will asks for a reviewer agent, run an independent reviewer pass on V5 and/or the diff workbook. The reviewer should inspect the important sheets like Will would, compare evidence against decisions, and return discrepancies with whether the issue appears to be the reviewer or the workbook/rules.

Do not proceed to production wiring until Will approves a specific rule group. If approval happens, draft a short production-wiring implementation plan first.

## Commands To Re-Validate

```powershell
node scripts\test-shadow-version-diff.mjs
node scripts\test-production-filter-refinement-audit.mjs
node scripts\test-job-fit-rules.mjs
node scripts\test-jd-sections.mjs
node scripts\test-fullrun-calibration-workbook.mjs
cd career-ops
node test-enrich-signals.mjs
cd ..
git diff --check
```

Expected latest results:

- shadow-version-diff: 15/15
- production-filter-refinement-audit: 45/45
- job-fit-rules: 52/52
- jd-sections: 8/8
- fullrun-calibration-workbook: 19/19
- enrich-signals: 54/54
- `git diff --check`: no whitespace errors, CRLF warnings only
