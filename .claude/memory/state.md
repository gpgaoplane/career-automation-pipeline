---
status: active
type: state
owner: claude
last-updated: 2026-05-07T00:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl` (still — not yet merged to main; shadow refinement arc happened on this branch).
**Active task:** **SHADOW FILTER CALIBRATION ARC CLOSED** at the 2026-05-07 V10 checkpoint. After Will's manual review of the 2026-05-01 Phase 2.8 closure Excel surfaced filter gaps, ran V1→V10 shadow refinement (5 implementation rounds + 7 independent verification rounds + plan-review-revise on V7 and V8). V10 verdict: V10_READY_FOR_PRODUCTION_WIRING — 1,418 test assertions pass, 0 FPs in Round 7. Will completed manual review of the V10 workbook on 2026-05-07 and approved it. Pause point is **immediately before production wiring** (port V10 rules from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs`).
**Pause point:** 4 commits just landed on `feat/phase-2.8-firecrawl`:
1. `d73638b` — framework upgrade to multi-agent-collab v0.4.3 + Gemini onboarding (75 files).
2. `17251c8` — shadow filter calibration test infra + enrichment patches (37 files; ~11k insertions).
3. `7dd512e` — shadow filter calibration arc V1→V10 audit trail (38 files; ~9.4k insertions).
4. `<commit-4-sha>` — memory + STATUS update for V10 closure (this commit).

Working tree clean except local-only `.claude/settings.local.json` (intentionally untracked), test-output JSON files in `docs/audits/*test*.json` (regenerated artifacts, not committed), and one temp file `career-ops/tmp-extract-territory.mjs` (cleanup-pending).
**Blockers:** None. Production wiring is the next agent action when Will gives the green light.
**Last commit on branch:** see `git log --oneline -5`. No new tag yet — production wiring will tag `production-v10` after smoke verification.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
**Production wiring (V10 → daily pipeline)** — checklist work, no plan needed:
1. Port shadow rules from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs` (territory detector, sales classification incl. CSM carve-out + Director extension, NA city regex, Pre-Sales survival, role-anchor patterns).
2. Wire `scripts/lib/jd-sections.mjs` SECTION_ALIASES if `export-jobs.mjs` needs them (verify before porting — may already be in enrich-jobs.mjs).
3. Smoke test: regenerate today's `career-ops/output/jobs-2026-05-07.xlsx` with V10 rules active. Verify drop counts roughly match shadow workbook (~536 hard drops on comparable input).
4. Side-by-side diff vs the 2026-05-01 Phase 2.8 closure workbook — confirm V10 deltas are the expected drops (territory + sales + Director + CSM-preserve), not regressions on legitimate roles.
5. Commit + tag `production-v10`.
6. Update STATUS.md, work log, state.md (this) post-wiring.
7. Next `npm run full-scan` runs with V10 rules in production.

**Estimated effort:** 1-2 hours for the full wiring + smoke test. Reversible via `git revert` of the wiring commit; shadow rules in `scripts/lib/` stay untouched.

**After production wiring — Phase 3 candidates** (no work scheduled — Will's choice):
- **Candidate A — LLM evaluation pipeline integration:** wire S/A-tier candidates through the per-job LLM evaluator, generate `reports/{###}-{slug}-{date}.md` files, populate `applications.md` via `merge-tracker.mjs`. Aligns with the original roadmap.
- **Candidate B — Calibration round:** after 2 weeks of V10 production output, compare to Will's actual application picks for threshold/weight tuning.
- **Candidate C — Delta detection:** "what disappeared since last run" mechanism deferred from Phase 2.7.
- **Candidate D — V11 source-hygiene patch:** Trimble PM listing-chrome FP. Half-day patch. Non-blocking.
- **Candidate E — NO_RELEVANT_JOBS roster cleanup:** disable hardware/clinical companies returning healthy-but-Will-irrelevant jobs (KLA, Marvell, Cadence, NXP, Intel, etc.).
- **Candidate F — F-005 enrichment:** earlier deferred field surfaced in shadow audits. Check F-005 backlog.
- **Operational:** `feat/phase-2.8-firecrawl` → `main` merge after production wiring lands. Tag chain: `phase-2.8-complete` → `production-v10` → main.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
**Shadow refinement arc: all open questions resolved.**
- V10 spec deviation accepted (suppression-only vs tie-promotion) — Round 7 confirmed sound.
- V11 Trimble PM source-hygiene fix: deferred to optional Phase 3 candidate D.
- Manual review feedback: Will reviewed V10 workbook on 2026-05-07, approved.

**Open questions for production wiring** (depend on user direction):
- **Wire on this branch or new branch?** This branch (`feat/phase-2.8-firecrawl`) already carries the shadow infra; wiring on top is coherent. Alternative: branch `feat/phase-2.9-production-v10` from current head and wire there. Recommend same branch for now since shadow + wire are one logical phase.
- **Tag strategy:** `production-v10` after wiring + smoke. Then merge branch to main. Optionally also tag `phase-2.9-complete` to mirror `phase-2.8-complete` precedent.
- **STATUS.md handoff format:** existing handoff structure works. After wiring, update Phase summary to "Phase 2.9 (V10 production wiring) complete" or similar.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-05-07T00:00:00-04:00
<!-- section:read-watermark:end -->
