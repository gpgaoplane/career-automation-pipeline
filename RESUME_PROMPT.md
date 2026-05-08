---
status: active
type: handoff
owner: claude
last-updated: 2026-05-08T00:00:00-04:00
read-if: "you are Claude or another AI agent resuming this project"
skip-if: "status != active"
related:
  - AI_HANDOFF.md
  - docs/STATUS.md
  - docs/agents/claude.md
  - .claude/memory/state.md
  - .claude/memory/decisions.md
---

# Resume Prompt — V10 Approved, Production Wiring Next

You are Claude Code resuming in `D:/Projects/career ops` on branch `feat/phase-2.8-firecrawl`.

The shadow filter calibration arc V1→V10 is **CLOSED**. Will manually reviewed the V10 workbook on 2026-05-07 and approved. Four checkpoint commits landed before the session ended. The next agent action is **production wiring** — porting V10 rules into the daily pipeline.

## First Actions

1. Read in order:
   - `AI_AGENTS.md` (project context — load if not already cached)
   - `.claude/CLAUDE.md` (Claude adapter)
   - `AI_HANDOFF.md` (narrative handoff to V10 production wiring)
   - `docs/STATUS.md` (latest state)
   - `.claude/memory/state.md` (live state — V10 closure + 4-commit checkpoint)
   - `.claude/memory/decisions.md` D-22 (calibration arc methodology)
   - `.claude/memory/pitfalls.md` P-10 (self-verification anti-pattern)
   - latest entry in `docs/agents/claude.md` (V10 closure Receipt)
2. Run `git status --short` and `git log --oneline -6`. Expect a clean working tree (modulo `.claude/settings.local.json`, `.collab-upgrade-backups/`, `tmp-v9-review/`, `career-ops/tmp-extract-territory.mjs`, `docs/audits/*test*.json` — all intentional). Last 4 commits should be `2f5382b`, `7dd512e`, `17251c8`, `d73638b`.
3. Verify the V10 artifacts exist and 1,418 assertions still pass:
   ```powershell
   node scripts/test-job-fit-rules.mjs
   node scripts/test-jd-sections.mjs
   node scripts/test-properties.mjs
   node scripts/test-cohort-shape.mjs
   node scripts/test-realdata-fixtures.mjs
   node scripts/test-shadow-version-diff.mjs
   node scripts/test-v9-v10-diff.mjs
   ```
4. **Do not start work until Will explicitly says "go"** — confirm with him whether to wire on this branch (recommended; shadow infra + wire are one logical phase) or branch a fresh `feat/phase-2.9-production-v10`.

## Current Truth

- **Branch:** `feat/phase-2.8-firecrawl` (4 commits ahead of `705d446`).
- **Phase:** Shadow filter calibration arc CLOSED at V10. Phase 2.8 also CLOSED at `phase-2.8-complete` tag (preserved baseline).
- **Will's verdict:** V10 manual review approved 2026-05-07. Production wiring authorized.
- **Production code untouched:** `career-ops/export-jobs.mjs`, `career-ops/portals.yml`, `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/cv.md`, default `npm run full-scan`, caches, tracker — all unchanged.
- **V10 rules live in:** `scripts/lib/job-fit-rules.mjs` + `scripts/lib/jd-sections.mjs` (single source of truth).
- **V10 workbook (manual-reviewed and approved):** `career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx`.
- **Baseline workbook:** `career-ops/output/jobs-2026-05-01.xlsx` — must remain unchanged.
- **Baseline SHA preserved:** `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`.

## V10 Metrics (memorize these — they are the production target)

- pipeline_rows: 933
- shadow_hard_drops: **536**
- sales_hard_drops: 81 (Pre-Sales/SA survive; AE/AM/Director-sales strict-drop; CSM carve-out)
- territory_hard_drops: 108 (NA-rooted strict; multi-region default-permissive; symmetric body-tie guard)
- comp_hard_drops: 1
- yoe_hard_drops: 148 (≥6-year requirements)
- location_hard_drops: 361
- source_repair_review_rows: 184
- validation_findings: 0

## What Will Wants Solved

**Production wire V10 — port shadow rules into daily pipeline.** Estimated 1-2 hours; reversible via `git revert`. Specifically:

1. Port territory detector + sales classification (incl. CSM carve-out + Director extension) + NA city regex + role-anchor patterns + Pre-Sales survival from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs`.
2. Verify `scripts/lib/jd-sections.mjs` SECTION_ALIASES are wired through (may already be in `enrich-jobs.mjs` — check before duplicating).
3. Smoke test: regenerate today's `career-ops/output/jobs-YYYY-MM-DD.xlsx` with V10 rules active. Compare drop counts to V10 shadow workbook (~536 hard drops on comparable input is the target).
4. Side-by-side diff vs the 2026-05-01 baseline workbook — confirm V10 deltas are the expected drops (territory + sales + Director + CSM-preserve), not regressions on legitimate roles.
5. Commit + tag `production-v10`.
6. Update `docs/STATUS.md` Done + Handoff Note, `.claude/memory/state.md`, `docs/agents/claude.md` Receipt for the wiring task.

## Watch-Outs (lessons from the calibration arc)

- **P-10 anti-pattern:** if you self-verify production wiring by sampling the *kept* cohort or *location strings* and concluding "no FPs," you are wrong by construction. The relevant population for FP detection is the *newly-dropped* cohort, sampled adversarially. See `.claude/memory/pitfalls.md` P-10.
- **Spec deviation in V10 is intentional and approved:** the V10 territory gate is "suppression-only," not "tie → NA promotion." Don't try to "fix" this during wiring.
- **Do not modify shadow infra during wiring** — `scripts/lib/job-fit-rules.mjs` is canonical. If wiring reveals a bug in the rules, fix it in the lib AND port; don't fork the implementation.
- **Trimble PM listing-chrome FP is known and deferred** to optional V11. Don't gate production wiring on it.

## Phase 3 Candidate Menu (after production wiring lands — Will picks)

- **A** — LLM evaluation pipeline integration (per old roadmap)
- **B** — Calibration round (after 2 weeks of V10 production output, compare to Will's actual application picks)
- **C** — Delta detection ("what disappeared since last run")
- **D** — V11 source-hygiene patch (Trimble PM listing-chrome; half-day, non-blocking)
- **E** — NO_RELEVANT_JOBS roster cleanup (39 hardware/clinical companies returning healthy-but-Will-irrelevant jobs)
- **F** — F-005 enrichment (deferred field surfaced in shadow audits)

## Commands To Re-Validate (sanity check)

```powershell
node scripts\test-job-fit-rules.mjs
node scripts\test-jd-sections.mjs
node scripts\test-properties.mjs
node scripts\test-cohort-shape.mjs
node scripts\test-realdata-fixtures.mjs
node scripts\test-shadow-version-diff.mjs
node scripts\test-production-filter-refinement-audit.mjs
node scripts\test-v9-v10-diff.mjs
cd career-ops; node test-enrich-signals.mjs; cd ..
git diff --check
```

Expected: all suites green; total assertion count 1,418; CRLF warnings only on `git diff --check`.
