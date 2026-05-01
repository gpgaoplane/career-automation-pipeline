---
status: active
type: state
owner: claude
last-updated: 2026-05-01T20:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl` (branched from main after `feat/multi-agent-collab` merged via 39bac3d).
**Active task:** **PHASE 2.8 CLOSED** at the 2026-05-01 checkpoint. Full 393-enabled-company clean rescan executed; 12/12 acceptance criteria pass on full-run metrics; output Excel `career-ops/output/jobs-2026-05-01.xlsx` ready for manual review (613 jobs across 154 companies; S=37 / A=370 / B=195 / C=11). Roster baseline now **448 total / 393 enabled / 55 disabled / 0 missing notes** after 2026-05-01 SOURCE_BROKEN disable round (Palo Alto Networks, Grammarly, SiFive, EvenUp). All Option A signal-extraction fixes shipped (decimal-K comp, hybrid-non-Toronto dealbreaker, single-value comp, expanded anchor list, strong-pattern fallback, generic X+ YoE, proximity-based Toronto check). Scoring policy v2 shipped (S threshold 18, AE-only drop, intern drop, dealbreaker drop, Senior/Principal -5).
**Pause point:** **Phase 2.8 closure checkpoint — committed and tagged.** Full rescan, audit, scoring policy v2 (S=18 / drop AE / drop intern / drop dealbreaker / Senior-Principal -5), Option A signal-extraction bug fixes (decimal-K, hybrid-non-Toronto, expanded anchor list, single-value comp, strong-pattern fallback, generic X+ YoE, proximity-based Toronto check), 4 SOURCE_BROKEN disables, frontmatter compliance pass on 4 INDEX-registered .md files, log rotation, and `.gitignore` cleanup all landed. Manual review of the Excel is the human-side next step.
**Blockers:** None for pipeline engineering. Known follow-up items deferred (none blocking): SOURCE_BROKEN cache refresh if any of the 4 disabled companies are reconsidered; calibration tuning after manual-review feedback; delta-detection feature build; hardware/clinical NO_RELEVANT_JOBS roster cleanup pass.
**Last commit on branch:** commit 3 (closure) — see `git log --oneline` for SHA. Tag `phase-2.8-complete` marks this checkpoint. Tag `scan-v2-prerescan` still marks the pre-rescan baseline at the earlier `28f72bb`. Tag `phase-2.8-complete` is the canonical checkout point for "closure-ready Phase 2.8".
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
**Phase 2.8 is CLOSED.** All major Phase 2.8 items completed:
1. ~~Implementation Steps 0-12~~ — DONE (commits e721305 → bc45b4e).
2. ~~P-7/P-8/P-9 bug fixes~~ — DONE by Codex 2026-04-30.
3. ~~Step 0 disabled-company re-audit~~ — DONE by Codex 2026-04-30 (397/51 baseline).
4. ~~Step 9 Firecrawl dashboard caps documented~~ — DONE 2026-04-30.
5. ~~Step 10 sample-50 full-pipeline run~~ — DONE by Codex 2026-04-30.
6. ~~AC-3 generic `location_raw` interpretation~~ — DONE by Codex 2026-04-30.
7. ~~AC-2 redefinition (source-accounting)~~ — DONE by Codex 2026-04-30 (D-9 codex / D-20 claude).
8. ~~Claude memory reconciliation~~ — DONE 2026-04-30.
9. ~~Full-run audit tooling (Option B)~~ — DONE 2026-05-01 (commit `0db39ae`).
10. ~~Full 393-enabled-company clean rescan~~ — DONE 2026-05-01 (3,552 Firecrawl credits; 12/12 ACs pass).
11. ~~Scoring policy v2 (S=18 / drop AE / drop intern / drop dealbreaker / Senior-Principal -5)~~ — DONE 2026-05-01.
12. ~~Option A signal-extraction bug fixes~~ (decimal-K, hybrid-non-Toronto, single-value comp, expanded anchors, strong-pattern fallback, generic X+ YoE, proximity-based Toronto check) — DONE 2026-05-01 (D-21).
13. ~~SOURCE_BROKEN disable round~~ — DONE 2026-05-01 (PAN, Grammarly, SiFive, EvenUp → 393/55 baseline).
14. ~~Frontmatter compliance pass + log rotation + .gitignore cleanup~~ — DONE 2026-05-01.

**Manual review of `career-ops/output/jobs-2026-05-01.xlsx` is the next human task.** Pipeline engineering pauses here until either Will surfaces calibration feedback from review OR explicitly chooses the next phase from the menu below.

**Phase 3 / next-phase candidates** (no work scheduled — for Will's choice when ready):
- **Candidate A — LLM evaluation pipeline integration:** wire S/A-tier candidates through the per-job LLM evaluator, generate `reports/{###}-{slug}-{date}.md` files, populate `applications.md` via `merge-tracker.mjs`. Aligns with the original roadmap.
- **Candidate B — Calibration round:** after Will's first manual-review pass, his thumbs-up/down feedback informs threshold + weight tuning. Higher-fidelity than guessing in advance.
- **Candidate C — Delta detection:** build the "what disappeared since last run" mechanism deferred from Q2 of the pre-rescan review.
- **Candidate D — SOURCE_BROKEN cache refresh:** re-discover any of the 4 disabled-but-real-fit companies if Will reconsiders. Cheap.
- **Candidate E — NO_RELEVANT_JOBS roster cleanup:** disable the 39 hardware/clinical companies returning healthy-but-Will-irrelevant jobs (KLA, Marvell, Cadence, NXP, Intel, Tokyo Electron, etc.). Tightens forward scrapes.
- **Operational item — work-log rotation** if `docs/agents/claude.md` grows again past threshold. Hygienic, not blocking.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
**Phase 2.8 closure: all open questions from the closure cycle are resolved.** Pre-rescan questions (delta-detection / full-run audit metrics / commit cadence) all answered (deferred / Option B built / 3 separate commits). Rescan + scoring + signal fixes all shipped. SOURCE_BROKEN follow-ups handled by user-directed disable. No outstanding pre-merge questions for Phase 2.8.

**Open questions for the next phase** (depend on Will's choice from the candidates list):
- **Phase 3 selection:** which candidate from {LLM-eval integration / calibration / delta-detection / cache refresh / NO_RELEVANT_JOBS cleanup} does Will want first? Decide after manual review of the Excel.
- **Calibration trigger:** should Will surface his thumbs-up/down feedback inline in the Excel (e.g., a `Manual Decision` column) or in a separate scratch doc? Determines what hooks the calibration phase needs.
- **Log rotation deferred:** `docs/agents/claude.md` is past the 300-line threshold. Was deferred this session due to quota; safe to run `./scripts/collab-rotate-log.sh claude` next session start before any substantive work.
- **Q (deferred):** Should the full-run audit artifact land at `docs/audits/2026-04-30-fullscan-classification.md` (matches the sample-50 naming) or at `docs/audits/<YYYY-MM-DD>-fullscan-classification.md` (date of the actual run)? Default to date-of-run.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-30T22:17:23-04:00
<!-- section:read-watermark:end -->
