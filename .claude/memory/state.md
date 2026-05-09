---
status: active
type: state
owner: claude
last-updated: 2026-05-09T12:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `main` (V10 wire merged 2026-05-08; tag `production-v10` pushed to origin).

**Active task:** V10 PRODUCTION WIRING SHIPPED + full rescan + Phase 1 cleanup pass. Sequence:
1. **2026-05-08 morning:** V10 wire shipped via plan-review-revise-agent-review cycle. Tag `production-v10`. Merged to main. Pushed to origin.
2. **2026-05-08 evening:** full `npm run full-scan` rescan ran 956 pipeline rows → 172 kept on 7-day-old cache, then fresh rescan → 255 kept (S=47/A=101/B=83/C=24, 83 companies, 136 source-repair).
3. **2026-05-09:** Will manually reviewed, surfaced 4 real defects + 1 feature request:
   - Mistral Paris (Lever, Applied AI Engineer Prototyping) kept at S-tier despite Paris on-site
   - Inspur non-career URL in Pending Jobs
   - No Reviewer Queue sheet (V10 wire commit `3cf700a` omitted it)
   - General FP/FN concern
   - Filter request: drop research/scientist/theoretical roles
4. **2026-05-09 Phase 1 cleanup (D-24):** Reviewer Queue sheet added; portals.yml title_filter negatives expanded with Research/Researcher/Scientist/Theoretical/Theorist; AI Research Engineer removed from positives; Inspur disabled; Layer 0 defense-in-depth in export-jobs.mjs (disabled-company drop + title-negative drop). Net: 238 kept (S=45/A=91/B=81/C=21), 88 reviewer-queue rows, Mistral Paris verified routed to Reviewer Queue.

**Pause point:** post-Phase-1-cleanup. Workbook regenerated at `career-ops/output/jobs-2026-05-09.xlsx`. Awaiting Will's review of the cleaned workbook + URL picks for Candidate A LLM evaluation.

**Roster baseline:** 448 total / **392 enabled / 56 disabled** after 2026-05-09 Inspur disable (was 393/55 post-Phase-2.8-closure).

**Phase 2 (V11) deferred:** rule library refinements for `extractRawLocations` city list (Paris/France/Berlin/etc.), `detectTerritory` title-adjacent header tokens, `detectSourceHygiene` non-job marketing heuristic, `parseJdSections` location-line classification. Same shadow-first methodology as V1→V10.

**Baseline workbook SHA preserved:** `7BFE4EC5...071E` ✓
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
**Candidate A — LLM evaluation pipeline** (next agent action when Will provides URLs):
1. Will picks 5-15 URLs from `jobs-2026-05-09.xlsx` (Pending Jobs S-tier preferred; can include Reviewer Queue rows he wants verified)
2. Each URL → `/career-ops oferta` evaluation → A-G blocks + Block G legitimacy + `reports/{###}-{slug}-{date}.md` + `batch/tracker-additions/{###}-{slug}.tsv`
3. After batch: `node merge-tracker.mjs` → updates `applications.md`
4. Summary: which scored highest, which failed legitimacy, recommended apply order
5. For Will's actual apply targets: generate ATS-optimized CV PDF + cover letter

**Phase 3 candidate menu** (Will picks; no work scheduled):
- **B — Calibration round** (~2 weeks of V10 production output)
- **C — Delta detection** ("what disappeared since last run")
- **D — V11 rule library refinement** (Mistral Paris class + Inspur class + Mistral Morocco class). Half-day to ~session, shadow-first methodology.
- **E — NO_RELEVANT_JOBS roster cleanup** (39 hardware/clinical companies)
- **F — F-005 enrichment** (deferred field)

**Operational follow-ups:**
- Phase 2 (V11) timing — only after Will gets value from current pipeline; not blocking
- Conservative R2 follow-up: 370 hybrid_non_toronto pre-drops; consider tightening after manual-review feedback. Not blocking.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- Will's URL picks for Candidate A — awaiting.
- Phase 3 candidate selection (B-F) — Will's call after Candidate A produces actual apply artifacts.
- Whether to run another fresh rescan now that title_filter has been tightened (would re-fetch with new negatives applied at scrape time, dropping research roles before they ever enter pipeline.md). Not urgent — Layer 0b at export time already handles this for the existing cache.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-05-09T12:00:00-04:00
<!-- section:read-watermark:end -->
