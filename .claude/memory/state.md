---
status: active
type: state
owner: claude
last-updated: 2026-04-28T23:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/multi-agent-collab`
**Active task:** Implementation plan written at `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` (option B chosen by user; design plan v2 finalized). 11 ordered steps with verification gates, atomic commits, explicit rollback per step, total ~5h focused work.
**Pause point:** Implementation plan committed (pending). User cleanup misses corrected: collab-catchup ack ran (watermark bumped to 22:50:59), design plan re-registered, ROUTING/PROTOCOL re-read, cross-agent risk Watch out block added per Row 10. Awaiting user signal to begin Step 1 of execution OR optional Codex re-review of implementation plan first.
**Blockers:** None. Ready to execute Step 1 (portals.yml audit cleanup) on user signal.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. ~~**Codex review of design plan v1**~~ — DONE 2026-04-28; review at design plan §17, commit `021efb5`.
2. ~~**Integrate review feedback into design plan v2**~~ — DONE 2026-04-28T23:00; commit `781fba1`.
3. ~~**Write implementation plan**~~ — DONE 2026-04-28T22:51; `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` (commit pending).
4. **(Optional) Codex re-review of implementation plan** OR proceed straight to execution — user's call.
5. **Execute Step 1**: portals.yml audit cleanup (re-enable 14 mis-drops, disable Foxconn + Skydio, add notes to 20). Verification: `448 / 428 / 20 / 0 missing notes`. Commit "refine: portals.yml audit cleanup ...".
6. **Execute Step 2**: title_filter rewrite (positives removal + negatives addition + YAML group split for CREATIVE).
7. **Execute Steps 3+4**: config/profile.yml + modes/_profile.md mid-level reframing.
8. **Execute Step 5**: generate docs/design/companies-roster.md.
9. **Execute Step 6**: build career-ops/enrich-jobs.mjs.
10. **Execute Step 7+8**: refactor career-ops/export-jobs.mjs + wire into npm full-scan.
11. **Execute Step 9** (optional): calibration pass against scan-v1-unfiltered baseline.
12. **Execute Step 10**: run all 18 acceptance criteria. No commit if any gate fails.
13. **Execute Step 11**: commit hygiene + final collab-check + (optional) Codex re-review.
14. **Phase 2.6** clean rescan (deferred): tag scan-v1-unfiltered → reset → scan → custom-scrape → enrich → export → P-1 audit.
15. **Phase 3**: open xlsx, S-tier review, /career-ops pipeline LLM eval, reports + tracker.
4. **Execute implementation plan** atomically:
   - Edit `career-ops/portals.yml`: re-enable 14 mis-drops, disable 2 inversions (Foxconn rank 65, Skydio rank 437), add `note:` to all 20 disabled rows, rewrite `title_filter` (remove Senior AI / Principal AI / Senior PM from positives; add Senior/Sr/Sr./Principal/Junior/Jr/Jr./Associate to negatives)
   - Edit `career-ops/modes/_profile.md`: archetype levels → "Mid-level"
   - Edit `career-ops/config/profile.yml`: archetype levels → "Mid-level"
   - Build `career-ops/enrich-jobs.mjs` per design plan §10
   - Refactor `career-ops/export-jobs.mjs` per design plan §11
   - Generate `docs/design/companies-roster.md`
   - Verify acceptance criteria §12
5. **Verify root `CLAUDE.md` `@import` shim** — confirm Claude Code resolves imports correctly on next session start.
6. **Merge `feat/multi-agent-collab` → `main`** after implementation lands.
7. **Phase 2.6** (deferred): clean rescan — tag `scan-v1-unfiltered` on `06bf430`, reset pipeline.md + scan-history.tsv, run scan.mjs (18 direct ATS) → custom-scraper.mjs (410 branded) → enrich-jobs.mjs → export-jobs.mjs → P-1 audit.
8. **Phase 3** — open xlsx, review S-tier jobs, run `/career-ops pipeline` for LLM eval, write reports + tracker entries.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- **Q:** Does Claude Code resolve `@AI_AGENTS.md` and `@.claude/CLAUDE.md` imports in root `CLAUDE.md`? **Verification:** start a fresh Claude session and check the `claudeMd` system reminder shows both files' contents loaded. If imports don't resolve, replace shim with inlined content.
- **Q:** Open questions in design plan §14 (Q-1 through Q-8) — all defaulted; confirm or override during Codex review.
- **Q:** Will Codex's review surface design issues that require a v2 of the design plan, or is v1 mergeable as-is?
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-28T22:50:59-04:00
<!-- section:read-watermark:end -->
