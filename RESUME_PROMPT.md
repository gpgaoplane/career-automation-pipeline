# Resume Prompt — career ops — Phase 2.8 Full Rescan Pickup

You are Claude Code in `D:/Projects/career ops` on branch `feat/phase-2.8-firecrawl`.

You are already onboarded in the multi-agent-collab framework. Do not run `--join` or `--init`.

First actions:

1. Read `AGENTS.md`, `AI_AGENTS.md`, `.claude/CLAUDE.md`, `.collab/INDEX.md`, `.collab/ROUTING.md`, `.collab/PROTOCOL.md`.
2. Read `.claude/memory/state.md`, then `docs/STATUS.md`.
3. Read `AI_HANDOFF.md`.
4. Read:
   - `docs/audits/2026-04-30-sample50-missed-company-classification.md`
   - `docs/audits/2026-04-30-step10-sample50-results.md`
   - `docs/audits/2026-04-30-step10-sample50-metrics.json`
   - latest entries in `docs/agents/codex.md`
5. Run `git status --short`.
6. Run `python scripts/acceptance-audit-phase2.8.py`.

Current truth:

- Roster: 448 total / 397 enabled / 51 disabled.
- Phase 2.8 sample-50 acceptance is green.
- Acceptance audit: 12 PASS / 0 FAIL / 0 pending.
- AC-2 has been replaced by source-accounting metrics.
- Relevant job yield is report-only: 28/50 in Step 10.
- AC-2 metrics: source resolved 38/50, source health 37/38, raw job availability 36/37, no-yield classification 22/22.
- AC-3 passes using generic `location_raw` OR compensation: 126/178.
- Seagate Technology is `SOURCE_BROKEN`, not a blocker.

Next recommended work:

Run the full 397-company clean rescan under the source-accounting model, then produce full-run source/yield/no-yield classification metrics. Do not resurrect the old `>=75% companies produce jobs` AC-2 gate.

Be critical and analytical of Codex's reconciliation. Verify before acting; if Codex's metrics or classification do not hold up, correct them with evidence.
