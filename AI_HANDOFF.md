---
status: active
type: handoff
owner: claude
last-updated: 2026-05-01T20:30:00-04:00
read-if: "you are picking up the project after Phase 2.8 closure (commit 75ec403, tag phase-2.8-complete)"
skip-if: "status != active"
related:
  - .claude/memory/state.md
  - docs/STATUS.md
  - docs/agents/claude.md
  - docs/audits/2026-05-01-fullrun-classification.md
  - docs/audits/2026-05-01-fullrun-metrics.json
  - docs/audits/2026-05-01-source-broken-disables.md
---

# AI Handoff — Phase 2.8 Closed; Manual Review In Progress

This file replaces the prior pre-rescan handoff. Phase 2.8 is closed
at commit `75ec403` (tag `phase-2.8-complete`).

## Current State

- Repo: `D:/Projects/career ops`
- Branch: `feat/phase-2.8-firecrawl`
- Roster: **448 total / 393 enabled / 55 disabled / 0 missing notes**
- Phase: **Phase 2.8 closed; pipeline engineering paused**
- Acceptance audit (full-run metrics): **12 PASS / 0 FAIL / 0 pending**
- Output Excel: `career-ops/output/jobs-2026-05-01.xlsx` (613 jobs / 154
  companies; bands S=37 / A=370 / B=195 / C=11)
- Tags: `phase-2.8-complete` (closure checkpoint), `scan-v2-prerescan`
  (pre-rescan baseline)

## Source of Truth (read in this order on pickup)

1. `AI_AGENTS.md`
2. `.collab/INDEX.md`
3. `.collab/ROUTING.md`
4. `.collab/PROTOCOL.md`
5. `.claude/CLAUDE.md`
6. `.claude/memory/state.md` ← Phase 2.8 closure narrative + Phase 3 candidate menu
7. `.claude/memory/decisions.md` ← D-21 captures the closure decisions
8. `docs/STATUS.md`
9. `docs/audits/2026-05-01-fullrun-classification.md` (per-company)
10. `docs/audits/2026-05-01-fullrun-metrics.json` (gates)
11. `docs/audits/2026-05-01-source-broken-disables.md` (4 disables rationale)
12. `docs/agents/claude.md` ← latest Receipt entry has full session arc

## What's Pending — Human Side, Not Pipeline Side

**The next gate is Will's manual review of the Excel, not pipeline work.**
Will marks each job in a `Push Decision` column with values:
- `P1` = first push (apply this round)
- `P2` = second push
- `P3` = third push
- `SKIP` = pass
- (blank) = not yet reviewed

When Will hands the marked Excel back, the next agent should:
1. Read the marked Excel.
2. Generate per-row TSVs in `career-ops/batch/tracker-additions/{num}-{slug}.tsv`
   for each P1/P2/P3 row (status = `Evaluated`) and each SKIP row
   (status = `SKIP` or `Discarded`).
3. Run `node merge-tracker.mjs` from `career-ops/` to merge into
   `applications.md`.
4. Optionally generate evaluation reports for the P1 batch first.

## Phase 3 / Next-Phase Menu (no work scheduled — Will picks)

- **Candidate A — LLM evaluation pipeline integration:** wire S/A-tier
  through the per-job evaluator; generate `reports/{###}-{slug}-{date}.md`;
  populate `applications.md`. Aligns with original roadmap.
- **Candidate B — Calibration round:** after Will's first manual review,
  thumbs-up/down feedback informs threshold + weight tuning. Higher
  fidelity than guessing.
- **Candidate C — Delta detection:** build the "what disappeared since
  last run" mechanism deferred from the pre-rescan review.
- **Candidate D — SOURCE_BROKEN cache refresh:** re-discover any of the
  4 disabled-but-real-fit companies if Will reconsiders.
- **Candidate E — NO_RELEVANT_JOBS roster cleanup:** disable the 39
  hardware/clinical companies returning healthy-but-Will-irrelevant jobs
  (KLA, Marvell, Cadence, NXP, Intel, etc.).

## Known Operational Items (deferred, non-blocking)

- **Log rotation:** `docs/agents/claude.md` is at ~1100 lines (past 300
  threshold). Run `./scripts/collab-rotate-log.sh claude` at next
  session start before any substantive write. `collab-check` will
  advisory it on every check until rotated.
- **Codex sync:** Codex's `.codex/memory/*` reflects pre-rescan state
  (last edited by Codex on 2026-04-30). Codex will sync on its next
  pickup using this handoff + `state.md`.

## Validation Already Run

```bash
python scripts/acceptance-audit-phase2.8.py --metrics docs/audits/2026-05-01-fullrun-metrics.json
# 12 pass, 0 fail, 0 pending

cd career-ops && node test-enrich-signals.mjs
# 26 passed, 0 failed

cd .. && node scripts/test-full-run-audit.mjs
# 48 passed, 0 failed
```

## User Preference Notes

- Will prefers atomic commits over stacked branches; the closure landed
  in three commits (`fe4663c`, `0db39ae`, `75ec403`) with `phase-2.8-complete`
  marking the final.
- Will is critical-and-analytical, not rubber-stamp; if the next agent
  finds anything in this handoff that doesn't hold up, surface and
  reconcile before acting on it.
- Will reviews S-tier first (37 jobs is intentionally manageable),
  then A-tier (370). Don't burn his time with B/C unless asked.
