---
status: active
type: state
owner: claude
last-updated: 2026-05-12T00:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `main` (V10 wire + Phase 1 cleanup merged; tag `production-v10` pushed to origin).

**Active task:** None blocking. V10 wire shipped, Phase 1 cleanup landed, post-cleanup forward motion (output reorg, Reviewer Queue refinement, CV PDF tool, Candidate A start) committed. Pipeline producing daily V10-quality output; Candidate A in early progress.

**Phase history (V10 → present):**
1. **2026-05-08:** V10 production wiring shipped via plan-review-revise-agent-review cycle (D-23). Tag `production-v10`. Full rescan → `jobs-2026-05-08.xlsx`. Will manually reviewed and surfaced 4 defects + 1 feature request.
2. **2026-05-09:** Phase 1 V10 wire cleanup (D-24, commit `d2e7758`). Reviewer Queue sheet added, research/scientist negatives, Inspur disable, Layer 0 defense-in-depth. → `jobs-2026-05-09.xlsx` (238 kept, S=45/A=91/B=81/C=21, 88 reviewer-queue rows).
3. **2026-05-09 afternoon:** Reviewer Queue filter refined twice (`7b4d0c5` widen to mirror shadow audit, `9302b48` narrow to ambiguity signals only — `/review/i` annotations OR `UNKNOWN` family; drops missing-info-only rows).
4. **2026-05-10:** `career-ops/output/` reorganized into `workbooks/` / `applications/` / `calibration/` / `tests/` buckets (`6da770f`). Scripts that read/write `output/` updated. New tool `scripts/render-cv-pdf.mjs` (`3fa70b2`) — markdown CV → HTML → PDF renderer. Candidate A started: 3 V10 evaluation rows tracked in `applications.md` via `/career-ops oferta` (`faacfa5`).

**Current canonical workbook:** `career-ops/output/workbooks/jobs-2026-05-10.xlsx` (latest, reflects narrowed Reviewer Queue logic; same kept cohort as 2026-05-09).

**Pause point:** Candidate A in early progress (3 of 5-15 URLs evaluated). Awaiting either more URL picks from Will, a Phase 3 menu pick, or direction.

**Roster baseline:** 448 total / **392 enabled / 56 disabled** (unchanged since 2026-05-09 Inspur disable).

**Phase 2 (V11) deferred:** rule library refinements for `extractRawLocations` city list (Paris/France/Berlin/etc.), `detectTerritory` title-adjacent header tokens, `detectSourceHygiene` non-job marketing heuristic, `parseJdSections` location-line classification. Same shadow-first methodology as V1→V10.

**Baseline workbook SHA preserved:** `7BFE4EC5...071E` ✓ (now at `career-ops/output/workbooks/jobs-2026-05-01.xlsx` post-reorg).
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
**Candidate A — LLM evaluation pipeline** (in progress, 3 of 5-15 evaluations done):
1. Will picks more URLs from `jobs-2026-05-10.xlsx` (Pending Jobs S-tier preferred; can include Reviewer Queue rows he wants verified)
2. Each URL → `/career-ops oferta` → A-G blocks + Block G legitimacy + `reports/{###}-{slug}-{date}.md` + `batch/tracker-additions/{###}-{slug}.tsv`
3. After batch: `node merge-tracker.mjs` → updates `applications.md`
4. For real apply targets: generate ATS-optimized CV PDF via `scripts/render-cv-pdf.mjs` + cover letter

**Phase 3 candidate menu** (Will picks; no work scheduled):
- **B — Calibration round** (~2 weeks of V10 production output)
- **C — Delta detection** ("what disappeared since last run")
- **D — V11 rule library refinement** (Mistral Paris class + Inspur class + Mistral Morocco class). Half-day to ~session, shadow-first methodology.
- **E — NO_RELEVANT_JOBS roster cleanup** (39 hardware/clinical companies)
- **F — F-005 enrichment** (deferred field)

**Operational follow-ups:**
- Phase 2 (V11) timing — only after Will gets value from current pipeline; not blocking
- Conservative R2 follow-up: 370 hybrid_non_toronto pre-drops; consider tightening after manual-review feedback. Not blocking.
- Fresh rescan with new title_filter negatives — would drop research roles at scrape-time instead of export-time. Not urgent (Layer 0b handles existing cache).
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- Will's next URL picks for Candidate A (or other direction).
- Phase 3 candidate selection (B-F) — Will's call after Candidate A produces apply artifacts.
- Whether to refresh `applications.md` with merge-tracker after the next batch of evaluations.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-05-12T00:00:00-04:00
<!-- section:read-watermark:end -->
