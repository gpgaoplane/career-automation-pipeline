---
status: active
type: handoff
owner: claude
last-updated: 2026-05-12T00:00:00-04:00
read-if: "you are Claude or another AI agent picking up this project"
skip-if: "status != active"
related:
  - RESUME_PROMPT.md
  - docs/STATUS.md
  - docs/agents/claude.md
  - .claude/memory/state.md
  - .claude/memory/decisions.md
  - .claude/memory/pitfalls.md
  - docs/plans/2026-05-08-v10-production-wiring.md
  - docs/audits/2026-05-07-v10-implementation-summary.md
  - docs/audits/2026-05-07-round7-verification-findings.md
---

# AI Handoff — Post-V10, Candidate A In Early Progress

The V1→V10 shadow filter calibration arc is **CLOSED**. V10 production wiring is **SHIPPED** on `main` (tag `production-v10` pushed to origin). Phase 1 manual-review cleanup landed 2026-05-09. Post-Phase-1 forward motion (Reviewer Queue refinement, output reorg, CV PDF tool, Candidate A start) committed through 2026-05-10. Pipeline is producing daily V10-quality output. **Candidate A (LLM evaluation pipeline) is in early progress — 3 evaluations done.**

## Current State

- Repo: `D:/Projects/career ops`
- Branch: `main`. Tag `production-v10` (V10 wire). Tag `phase-2.8-complete` (preserved closure checkpoint).
- Latest commit: `3fa70b2` (2026-05-10 — render-cv-pdf.mjs).
- Roster baseline: **448 total / 392 enabled / 56 disabled** (unchanged since 2026-05-09 Inspur disable).
- Current canonical workbook: `career-ops/output/workbooks/jobs-2026-05-10.xlsx` — 238 kept (S=45 / A=91 / B=81 / C=21), 88 reviewer-queue rows. Reflects narrowed Reviewer Queue logic (ambiguity signals only).
- Baseline workbook (preserved, SHA `7BFE4EC5...071E`): `career-ops/output/workbooks/jobs-2026-05-01.xlsx`.
- `output/` layout: reorganized 2026-05-10 into `workbooks/` (current + dated), `applications/` (CV PDFs, cover letters), `calibration/` (V1→V10 shadow workbooks + diffs), `tests/` (regenerable test artifacts).
- Local-only files NOT committed (intentional): `.claude/settings.local.json`, `.collab-upgrade-backups/`, `docs/audits/*test*.json`, `tmp-v9-review/`.

## What Was Done Since V10 Closure

1. **2026-05-08 — V10 production wiring shipped** (D-23, commit `3cf700a`). V10 rules ported from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs` via direct import (single source of truth — no duplication). Plan-review-revise-agent-review cycle with 3 reviewer-subagent passes. Tag `production-v10`. Smoke run produced 172 kept on cached pipeline.
2. **2026-05-09 — Phase 1 V10 wire cleanup** (D-24, commit `d2e7758`). Addressed Will's 4 defects + 1 feature request from manual review of `jobs-2026-05-08.xlsx`: Reviewer Queue sheet added, `portals.yml` title_filter negatives expanded with `Research`/`Researcher`/`Scientist`/`Theoretical`/`Theorist`, `AI Research Engineer` removed from positives, Inspur disabled, Layer 0 defense-in-depth in `export-jobs.mjs`. Net: 238 kept, 88 reviewer-queue rows, Mistral Paris correctly routed.
3. **2026-05-09 afternoon — Reviewer Queue filter refined** (`7b4d0c5` widen to mirror shadow audit, `9302b48` narrow to ambiguity signals only). Final filter: `/review/i` annotations OR `UNKNOWN` family — drops missing-info-only rows.
4. **2026-05-10 — Output reorg, CV PDF tool, Candidate A start.** `career-ops/output/` reorganized into `workbooks/` + `applications/` + `calibration/` + `tests/` (`6da770f`; 14 scripts updated). New `scripts/render-cv-pdf.mjs` markdown→PDF renderer (`3fa70b2`). 3 V10 evaluations tracked in `applications.md` (`faacfa5`) — Candidate A in early progress.

## Where Things Stand Now

Pipeline is running daily V10-quality output. Will is in the middle of Candidate A (LLM evaluation pipeline). 3 of a planned 5-15 URLs have been evaluated through `/career-ops oferta`. The new `render-cv-pdf.mjs` is available for generating tailored CV PDFs at apply time but hasn't been exercised end-to-end yet.

No active blocker. No pending implementation. No unfinished plan.

## What The Next Agent Should Do (Will's Choice)

**Default path — continue Candidate A:**
1. Will picks more URLs from `career-ops/output/workbooks/jobs-2026-05-10.xlsx` (S-tier preferred; Reviewer Queue rows for verification welcome).
2. Each URL → `/career-ops oferta` → A-G blocks + Block G legitimacy → `reports/{###}-{slug}-{date}.md` + `batch/tracker-additions/{###}-{slug}.tsv`.
3. After batch: `node merge-tracker.mjs` from `career-ops/`.
4. For real apply targets: generate ATS-tailored CV PDF via `node scripts/render-cv-pdf.mjs` + cover letter.

**Phase 3 menu (Will picks if pivoting):**
- **B** — Calibration round (after ~2 weeks of V10 production output)
- **C** — Delta detection ("what disappeared since last run")
- **D** — V11 rule library refinement (Mistral Paris / Inspur / Mistral Morocco classes; half-day; shadow-first methodology)
- **E** — NO_RELEVANT_JOBS roster cleanup (39 hardware/clinical companies)
- **F** — F-005 enrichment (deferred field)

## Hard Boundaries (unchanged)

Do not change without explicit Will approval:
- Baseline workbook `career-ops/output/workbooks/jobs-2026-05-01.xlsx` (preserved, SHA-verified).
- Vendored upstream: `career-ops/scan.mjs`, `career-ops/CLAUDE.md`, `career-ops/AGENTS.md`, `career-ops/.claude/`.
- `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/cv.md` — Will's personal config.
- Tag `phase-2.8-complete`, tag `production-v10` — closure markers.

## Key Files To Read On Pickup

In order:
1. `AI_AGENTS.md` — project context (auto-loaded via root `CLAUDE.md` import).
2. `.claude/CLAUDE.md` — Claude adapter + wrap-up checklist.
3. This file (`AI_HANDOFF.md`) — narrative handoff.
4. `docs/STATUS.md` — phase status + done list.
5. `.claude/memory/state.md` — live state + open questions.
6. `.claude/memory/decisions.md` — D-22 (calibration arc), D-23 (V10 wire), D-24 (Phase 1 cleanup) are the latest.
7. `.claude/memory/pitfalls.md` — P-10 (self-verification anti-pattern) most relevant.
8. Latest entry in `docs/agents/claude.md`.

## V10 Test Suite (sanity check, optional)

```powershell
node scripts/test-job-fit-rules.mjs
node scripts/test-jd-sections.mjs
node scripts/test-properties.mjs
node scripts/test-cohort-shape.mjs
node scripts/test-realdata-fixtures.mjs
node scripts/test-shadow-version-diff.mjs
node scripts/test-v9-v10-diff.mjs
node scripts/test-production-filter-refinement-audit.mjs
```

Expected: 1,418 assertions pass; baseline workbook SHA `7BFE4EC5...071E` preserved.

## Open Questions

- Will's next direction: continue Candidate A or pivot to Phase 3?
- Whether `render-cv-pdf.mjs` needs end-to-end exercise before the first real apply target arrives.
