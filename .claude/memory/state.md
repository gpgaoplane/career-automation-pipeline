---
status: active
type: state
owner: claude
last-updated: 2026-04-28T22:05:11-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/multi-agent-collab`
**Active task:** Phase 2.7 design plan complete and committed; awaiting Codex review of `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`.
**Pause point:** Design plan covering portals.yml audit cleanup (D-11), mid-level profile pivot (D-7), sequential lock (D-8), pre-scoring scheme (D-9), and description-enrichment design (D-10) is committed. Decisions D-7 through D-11 recorded in `.claude/memory/decisions.md`. Cross-doc propagation done across `AI_AGENTS.md`, `.claude/memory/context.md`, `docs/STATUS.md`, work log. Handoff block written targeting Codex.
**Blockers:** Codex review pending. Implementation plan deferred until design plan is approved by Codex / user feedback integrated.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. **Codex review of design plan** — user spawns Codex session with the prepared prompt; Codex reads design plan, files a review (either as comments in `## §17. Review Comments` of the design plan, or as a separate handoff block back to Claude).
2. **Integrate review feedback** — per `superpowers:receiving-code-review` skill: integrate, push back with reasoning, OR mark as deferred. Possibly produce design plan v2.
3. **Write implementation plan** at `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` once design is locked. Step-by-step ordered execution with verification gates.
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
7. **Phase 2.6** (deferred): clean rescan — tag `scan-v1-unfiltered` on `06bf430`, reset pipeline.md + scan-history.tsv, run scan.mjs (~17 direct ATS) → custom-scraper.mjs (~411 branded) → enrich-jobs.mjs → export-jobs.mjs → P-1 audit.
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
