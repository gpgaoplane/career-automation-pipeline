---
status: active
type: handoff
owner: claude
last-updated: 2026-05-01T20:30:00-04:00
read-if: "you are an AI agent picking up this project after Phase 2.8 closure"
skip-if: "status != active"
related:
  - AI_HANDOFF.md
  - .claude/memory/state.md
  - docs/STATUS.md
---

# Resume Prompt — Phase 2.8 Closed; Manual Review In Progress

You are an AI agent (Claude Code or Codex) in `D:/Projects/career ops` on
branch `feat/phase-2.8-firecrawl`. Phase 2.8 is closed at commit
`75ec403`, tag `phase-2.8-complete`.

You are already onboarded in the multi-agent-collab framework. Do not run
`--join` or `--init`.

## First actions (in order)

1. Read `AGENTS.md`, `AI_AGENTS.md`, `.claude/CLAUDE.md` (Claude only) or
   `.codex/CODEX.md` (Codex only), `.collab/INDEX.md`, `.collab/ROUTING.md`,
   `.collab/PROTOCOL.md`.
2. Read your own memory: `.claude/memory/state.md` (Claude) or
   `.codex/memory/state.md` (Codex).
3. Read `AI_HANDOFF.md` — current closure-state handoff with full Phase 3
   candidate menu.
4. Read `docs/STATUS.md`.
5. Optional but recommended: `docs/audits/2026-05-01-fullrun-classification.md`,
   `docs/audits/2026-05-01-fullrun-metrics.json`,
   `docs/audits/2026-05-01-source-broken-disables.md`,
   latest entry in `docs/agents/claude.md`.
6. Run `git status --short` and `git log --oneline -5`.
7. Run `python scripts/acceptance-audit-phase2.8.py --metrics docs/audits/2026-05-01-fullrun-metrics.json` to verify gates still green.

## Current truth (as of 2026-05-01)

- Roster: 448 total / 393 enabled / 55 disabled / 0 missing notes.
- Phase 2.8 closure: 12/12 acceptance criteria pass on full-run metrics.
- Output: `career-ops/output/jobs-2026-05-01.xlsx` (613 jobs, S=37 / A=370 / B=195 / C=11).
- Manual review in progress on Will's side. Do NOT modify the Excel
  unless Will hands it back marked.

## What to do next depends on Will's signal

- **If Will hands back the marked Excel** with a `Push Decision` column
  (P1/P2/P3/SKIP): generate per-row TSVs in
  `career-ops/batch/tracker-additions/`, run `node merge-tracker.mjs`
  from `career-ops/`. Optionally run the per-job evaluator on P1 batch.
- **If Will picks a Phase 3 candidate** (A: LLM evaluation pipeline; B:
  calibration; C: delta detection; D: SOURCE_BROKEN cache refresh; E:
  NO_RELEVANT_JOBS roster cleanup): start with `writing-plans` skill or
  `brainstorming` skill before substantive code changes.
- **If Will reports a bug or anomaly from review:** treat as systematic
  debugging; reproduce, root-cause, fix, test, commit.

## Hygiene check at session start

- `docs/agents/claude.md` may need rotation. Run
  `./scripts/collab-rotate-log.sh claude` if `bash ~/.claude/skills/multi-agent-collab/scripts/collab-check.sh` advises it.
- Verify `git status --short` shows clean tree (only
  `.claude/settings.local.json` should be untracked).

## User preferences (durable)

- Will is critical-and-analytical; verify before acting on anything in
  this handoff that doesn't hold up empirically.
- Atomic commits, one logical change each. Commit only at clean task
  boundaries with explicit user request.
- Manual review of S-tier first (37 jobs is intentionally manageable),
  then A-tier (370). Don't burn Will's time on B/C unless asked.
- Excel marking convention: single `Push Decision` column with values
  P1/P2/P3/SKIP/(blank). Optional `Will Notes` column for free-form
  rationale. Map P1/P2/P3 → `Evaluated` status, SKIP → `SKIP` /
  `Discarded` in `applications.md` via merge-tracker.
