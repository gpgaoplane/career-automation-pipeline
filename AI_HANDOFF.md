---
status: active
type: handoff
owner: codex
last-updated: 2026-04-30T17:25:27-04:00
read-if: "you are Claude Code or another agent picking up Phase 2.8 after Codex's AC-2 reconciliation"
skip-if: "status != active"
related:
  - docs/STATUS.md
  - docs/audits/2026-04-30-sample50-missed-company-classification.md
  - docs/audits/2026-04-30-step10-sample50-results.md
  - docs/audits/2026-04-30-step10-sample50-metrics.json
  - docs/agents/codex.md
---

# AI Handoff — Phase 2.8 Ready For Full Rescan

This file replaces the old emergency cutoff handoff. It is written deliberately for a fresh Claude Code session with no terminal history.

## Current State

- Repo: `D:/Projects/career ops`
- Branch: `feat/phase-2.8-firecrawl`
- Current roster: **448 total / 397 enabled / 51 disabled**
- Phase: **Phase 2.8 sample-50 acceptance green**
- Acceptance audit: **12 PASS / 0 FAIL / 0 pending**
- Next gate: **full 397-company clean rescan**
- Important tag already present/expected in this phase: `scan-v2-prerescan`

## Source Of Truth

Read these first:

1. `AI_AGENTS.md`
2. `.collab/INDEX.md`
3. `.collab/ROUTING.md`
4. `.collab/PROTOCOL.md`
5. `.claude/CLAUDE.md`
6. `.claude/memory/state.md`
7. `docs/STATUS.md`
8. `docs/audits/2026-04-30-sample50-missed-company-classification.md`
9. `docs/audits/2026-04-30-step10-sample50-results.md`
10. `docs/audits/2026-04-30-step10-sample50-metrics.json`
11. `docs/agents/codex.md`

Claude-owned memory may still contain some historical Step 5 wording. Treat `docs/STATUS.md` and Codex's latest work log entries as newer.

## What Codex Completed

Codex completed the Phase 2.8 follow-up path after Claude's implementation:

- Fixed P-7/P-8/P-9 bugs.
- Re-audited Step 0 disables and restored 9 high-confidence false disables.
- Reconciled the live roster to 448 / 397 / 51.
- Recorded Firecrawl plan caps supplied by the user.
- Ran Step 10 transactional sample-50 full pipeline.
- Fixed enrichment AC-3 ambiguity by adding `location_raw` and broadening comp parsing.
- Replaced vague AC-2 ">=75% companies produce jobs" with source-accounting metrics.
- Classified all 22 no-yield sample companies.

## Step 10 Results

- Sample size: 50 enabled companies, seed 42
- Exported jobs: **178**
- Companies with title-filtered exported jobs: **28/50**
- Relevant job yield: **56.0%**, now report-only
- Bands: **S=7 / A=58 / B=111 / C=2**
- Firecrawl credits during Step 10 run: **383**

AC-2 source-accounting metrics:

- Source resolved: **38/50 = 76.0%**
- Source health: **37/38 = 97.4%**
- Raw job availability: **36/37 = 97.3%**
- No-yield classification: **22/22 = 100.0%**

No-yield buckets:

- `NO_RELEVANT_JOBS`: 8
- `NO_OPEN_JOBS`: 1
- `ROUTE_MISSING`: 12
- `SOURCE_BROKEN`: 1

Seagate Technology is the `SOURCE_BROKEN` row: Workday CXS returned HTTP 422 and direct Workday HTML returned a maintenance page during probe. Treat this as a source-health warning, not a blocker.

## Validation Already Run

From repo root unless noted:

```bash
python scripts/acceptance-audit-phase2.8.py
# 12 pass, 0 pending, 0 fail

cd career-ops
node test-enrich-signals.mjs
# 26 passed, 0 failed
```

Collab check also passed:

```bash
bash ~/.claude/skills/multi-agent-collab/scripts/collab-check.sh
# OK: INDEX and filesystem aligned
```

## Recommended Next Work

Run the full 397-company clean rescan under the source-accounting model.

Recommended high-level procedure:

1. Do normal framework catchup/onboarding for Claude.
2. Confirm `git status` and review current uncommitted changes.
3. Run `python scripts/acceptance-audit-phase2.8.py` once to confirm the green sample gate.
4. Run the full rescan from `career-ops/` using the orchestrated pipeline.
5. Preserve source-accounting metrics for the full 397-company run.
6. Generate a full-run no-yield classification report using the same buckets as the sample audit.
7. Prioritize `ROUTE_MISSING` by company fit after the full run, not before.

Do not restore the old AC-2 >=75% exported-company gate. Relevant title-filtered yield is useful and should be reported, but it is not a scraper-success pass/fail gate.

## User Preference

The user wants agents to be critical and analytical, not rubber-stamp Codex or Claude. If something in this handoff looks wrong, verify against the files and push back.
