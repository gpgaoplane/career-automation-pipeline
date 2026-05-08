---
status: active
type: state
owner: claude
last-updated: 2026-05-08T12:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl` (still — not yet merged to main).
**Active task:** **V10 PRODUCTION WIRING SHIPPED** (2026-05-08). V10 filter rules ported from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs`. Daily pipeline now produces V10-quality output with V10-native columns (Option B), source-hygiene gate, and source-repair routing. Conservative R2 path preserved (`signals.deal_breaker_signal` early-drop alongside V10). Single source of truth maintained — production imports directly from `scripts/lib/`, no duplication.

**Pause point:** post-wire, pre-merge. Wire commit landed with tag `production-v10`. Working tree clean. Awaiting Will's review of the regenerated `career-ops/output/jobs-2026-05-08.xlsx` (172 kept rows: S=33 / A=85 / B=41 / C=13).

**Wire methodology** (will inform future similar work):
1. Plan v1 written → reviewer agent (subagent_type=reviewer) found 6 issues → REVISE_BEFORE_EXECUTION.
2. Plan v2 with all 6 fixes + Will's three open-question answers (conservative R2, second reviewer pass, Option B columns) → second reviewer agent → APPROVE_FOR_EXECUTION with 3 minor nits.
3. Three nits patched inline → executed Step 0 (test suite green) → Step 1 (port) → Step 2 (smoke).
4. Smoke produced 0 intern + 343 deal_breaker + 250 V10 hard-drops + 191 source-repair + 172 kept = 956 ✓.
5. Post-wire reviewer agent flagged P-10 residual risk (couldn't run 10-row random sample due to read-only). I extended the smoke script and ran the sample myself: 9/10 explicit genuine drops + 1 unverified-but-plausible. P-10 bar passed.
6. Single commit lands: `career-ops/export-jobs.mjs` (the wire) + plan v2 + memory updates + handoff updates.

**Smoke counts vs V10 shadow expectations** (cached 2026-05-01 pipeline as input):
- Pipeline: 956 (vs shadow 933; 23 newer rows since 2026-05-01)
- Deal-breaker pre-drop: 343 (all `hybrid_non_toronto`; conservative R2 swallows V10-overlap)
- V10 hard-drops: 250 (territory 50, sales-title 4, sales-content 28, yoe 55, comp 1, onsite-non-toronto 100, specific-non-toronto-location 79)
- Source-repair: 191 (vs shadow 184; +3.8%)
- Kept: 172 (vs shadow ~213 estimate; difference = R2 hybrid pre-swallow)
- Total effective drops: 343 + 250 + 191 = 784 vs shadow's 720 (536 hard + 184 source-repair)
- Bands: S=33 / A=85 / B=41 / C=13. S-tier sample inspected — Cohere FDE Infrastructure, Glean FDE PM, OpenAI AI Deployment Engineer, Mistral FDE all preserved-correct.

**Known V10-inherited FP** (NOT wire-introduced; deferred to V11):
- `Mistral AI | Applied AI, Forward Deployed Machine Learning Engineer - Morocco` retained at S-tier. Cache shows Casablanca-only, "On-site", zero NA tokens in body. Same class as Trimble PM listing-chrome FP from V10 closure. Reviewer confirmed via `scoring-ledger.tsv:742` that V10 shadow already preserved this row.

**Baseline workbook SHA preserved:** `7BFE4EC5A099102FA0B79A5A50D874A019CEEB1E2842B38B01954E51F1ED071E` ✓
**Last commit on branch:** wire commit (this session). New tag: `production-v10`.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
**Manual review (human-side):** Will reviews `career-ops/output/jobs-2026-05-08.xlsx` — Pending Jobs sheet (172 rows), Source Repair Review sheet (191 rows), By Company sheet (58 companies). Marks Push Decision / Will Notes columns where applicable.

**Phase 3 candidate menu** (Will picks; no work scheduled):
- **A — LLM evaluation pipeline integration:** route S/A-tier through per-job LLM evaluator, generate `reports/{###}-{slug}-{date}.md`, populate `applications.md` via `merge-tracker.mjs`. Aligns with original roadmap.
- **B — Calibration round:** after ~2 weeks of V10 production output, compare to Will's actual application picks for threshold/weight tuning.
- **C — Delta detection:** "what disappeared since last run" mechanism deferred from Phase 2.7.
- **D — V11 source-hygiene + territory refinement:** Trimble PM listing-chrome + Mistral Morocco class. Half-day patch. Non-blocking.
- **E — NO_RELEVANT_JOBS roster cleanup:** disable hardware/clinical companies returning healthy-but-Will-irrelevant jobs.
- **F — F-005 enrichment:** earlier deferred field.

**Operational next:** `feat/phase-2.8-firecrawl` → `main` merge after Will signs off on the V10-active workbook. Tag chain: `phase-2.8-complete` → `production-v10` → main.

**Conservative R2 follow-up:** the deal_breaker pre-drop swallows 343 rows, many overlapping V10 territory/location. Worth revisiting after Will reviews regenerated output — could tighten to PhD-required + no-sponsorship-remote only (V10 catches the rest), reducing redundant filtering. Not blocking.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
**All wire questions resolved. Open questions for Phase 3:**
- Will's pick from candidates A-F.
- Whether to tighten conservative R2 path after manual review (move location-shaped deal_breaker cases into V10 only; keep PhD/sponsorship as the residual early-drop).
- Whether to lift `tmp-v10-smoke-verify.mjs` pattern into permanent diagnostic tooling at `scripts/diagnose-wire-output.mjs` (post-wire reviewer suggested; deferred).
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-05-08T12:00:00-04:00
<!-- section:read-watermark:end -->
