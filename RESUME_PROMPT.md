---
status: active
type: handoff
owner: claude
last-updated: 2026-05-12T00:00:00-04:00
read-if: "you are Claude or another AI agent resuming this project"
skip-if: "status != active"
related:
  - AI_HANDOFF.md
  - docs/STATUS.md
  - docs/agents/claude.md
  - .claude/memory/state.md
  - .claude/memory/decisions.md
---

# Resume Prompt — Post-V10, Candidate A In Early Progress

You are Claude Code resuming in `D:/Projects/career ops` on branch `main`.

The shadow filter calibration arc V1→V10 is **CLOSED**. V10 production wiring is **SHIPPED** (tag `production-v10`). Phase 1 cleanup landed 2026-05-09. Post-Phase-1 forward motion (Reviewer Queue refinement, output reorg, CV PDF tool, Candidate A start) is committed through 2026-05-10. **No active blocker, no unfinished plan, no pending implementation.** Candidate A (LLM evaluation pipeline) is in early progress — 3 of 5-15 URL evaluations done.

## First Actions

1. Read in order:
   - `AI_AGENTS.md` (auto-loaded via `CLAUDE.md` import; project context)
   - `.claude/CLAUDE.md` (Claude adapter)
   - `AI_HANDOFF.md` (narrative handoff — what was done, what's next)
   - `docs/STATUS.md` (phase status)
   - `.claude/memory/state.md` (live state — current pause point + open questions)
   - `.claude/memory/decisions.md` — D-22 / D-23 / D-24 are latest
   - `.claude/memory/pitfalls.md` — P-10 most relevant
   - Latest entry in `docs/agents/claude.md`
2. Run `git status --short` and `git log --oneline -8`. Expect clean working tree (modulo intentional local-only files listed in `state.md`). Latest commits: `3fa70b2` → `faacfa5` → `6da770f` → `9302b48` → `7b4d0c5` → `d2e7758` → `abdcbc7` → `3cf700a`.
3. Confirm Will's direction before starting substantive work — default is "continue Candidate A" but he may pivot to Phase 3 (B/C/D/E/F).

## Current Truth

- **Branch:** `main`. Tags: `production-v10` (V10 wire), `phase-2.8-complete` (closure marker).
- **Phase:** Post-V10 forward motion. Pipeline producing daily V10-quality output. Candidate A in early progress.
- **Production code state:** `career-ops/export-jobs.mjs` is V10-wired (single source of truth via direct imports from `scripts/lib/`). `career-ops/portals.yml` has Phase 1 cleanup applied (392 enabled / 56 disabled, research/scientist negatives, Inspur disabled).
- **V10 rules canonical location:** `scripts/lib/job-fit-rules.mjs` + `scripts/lib/jd-sections.mjs`. Production imports directly.
- **Current canonical workbook:** `career-ops/output/workbooks/jobs-2026-05-10.xlsx` (238 kept, S=45/A=91/B=81/C=21, 88 reviewer-queue).
- **Baseline workbook (preserved):** `career-ops/output/workbooks/jobs-2026-05-01.xlsx`, SHA `7BFE4EC5...071E`.
- **CV PDF tool:** `scripts/render-cv-pdf.mjs` (markdown → HTML → PDF, available for apply-time CV tailoring).
- **Output layout:** reorganized into `workbooks/` / `applications/` / `calibration/` / `tests/` buckets.

## What Will Likely Wants

**Default — continue Candidate A:**
1. Will picks more URLs from `career-ops/output/workbooks/jobs-2026-05-10.xlsx`.
2. Each URL → `/career-ops oferta` → A-G blocks + Block G legitimacy → `reports/{###}-{slug}-{date}.md` + `batch/tracker-additions/{###}-{slug}.tsv`.
3. After batch: `node merge-tracker.mjs` from `career-ops/`.
4. For real apply targets: generate ATS-tailored CV PDF via `scripts/render-cv-pdf.mjs` + cover letter.

**If pivoting — Phase 3 menu:**
- **B** Calibration round · **C** Delta detection · **D** V11 rule library refinement · **E** NO_RELEVANT_JOBS roster cleanup · **F** F-005 enrichment

## Watch-Outs

- **P-10 anti-pattern still applies:** when verifying any rule/filter change, sample the *newly-dropped* cohort adversarially, not the kept cohort or location-string distribution. See `.claude/memory/pitfalls.md` P-10.
- **Shadow-first methodology is the contract** for any filter rule change (D-22). New gates land in `scripts/lib/` first → versioned audit workbook → plan-review-revise → manual review → port to production. Reversible via `git revert`.
- **Vendored `career-ops/` is sacred** — never modify `career-ops/CLAUDE.md`, `career-ops/AGENTS.md`, `career-ops/scan.mjs`, or `career-ops/.claude/`. All personalization lives in `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/portals.yml`, `career-ops/cv.md`.
- **Data layer contract:** never add rows to `career-ops/data/applications.md` directly — write TSV to `career-ops/batch/tracker-additions/` then run `node merge-tracker.mjs`. Direct edit is OK only for status/notes on existing rows.

## Sanity Check Commands

```powershell
git status --short
git log --oneline -8
node scripts/test-job-fit-rules.mjs
node scripts/test-jd-sections.mjs
node scripts/test-v9-v10-diff.mjs
node scripts/test-production-filter-refinement-audit.mjs
```

Expected: working tree carries only intentional local-only files; 1,418 V10 assertions pass; baseline SHA preserved.

## Hard Boundaries

Do not change without explicit Will approval:
- Baseline workbook `career-ops/output/workbooks/jobs-2026-05-01.xlsx`.
- Vendored `career-ops/` upstream layer.
- Tags `phase-2.8-complete`, `production-v10`.
- Will's personal config (`career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/cv.md`).
