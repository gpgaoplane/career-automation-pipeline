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
**Active task:** Codex review of Phase 2.7 design plan v1 received and integrated. Design plan v2 published with all 5 fixes (commit pending after this state save).
**Pause point:** Codex's review (§17 of design plan, commit `021efb5`) flagged 5 issues — all verified against primary sources, all integrated into design plan v2. Cross-doc propagation done: AI_AGENTS.md (lines 217, 288), docs/STATUS.md (lines 46, 58, 59), .claude/memory/context.md ATS distribution entry — all corrected to 18/410. D-12 added to `.claude/memory/decisions.md` capturing the integration. Awaiting user direction on: (a) optional Codex re-review of v2, OR (b) proceed straight to implementation plan.
**Blockers:** None. Path forward depends on user's call on (a) vs (b).
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. ~~**Codex review of design plan**~~ — DONE 2026-04-28; review at design plan §17, commit `021efb5`.
2. ~~**Integrate review feedback**~~ — DONE 2026-04-28T23:00. All 5 fixes integrated into design plan v2; cross-doc propagation done; D-12 recorded.
3. **(Optional) Codex re-review of v2** OR **proceed to implementation plan** — user's call. The 5 fixes were correctness corrections, not architectural challenges, so a re-review is optional. If user picks (a), Claude writes a fresh handoff to Codex. If (b), Claude writes `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`.
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
Last read INDEX at: 2026-04-28T22:05:11-04:00
<!-- section:read-watermark:end -->
