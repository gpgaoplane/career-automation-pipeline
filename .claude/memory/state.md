---
status: active
type: state
owner: claude
last-updated: 2026-04-29T15:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/multi-agent-collab`
**Active task:** Phase 2.8 (Firecrawl pivot) — design + decisions + verification all done. Phase 2.7 implementation remains complete (commits a13b9a5..9ff216a) and merged-ready. Phase 2.8 design plan: `docs/plans/2026-04-29-firecrawl-pivot-design.md` (commit 0f9421a). Decisions addendum: `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (commit d8e3921, also added "Web research" project rule). Verification research: `docs/design/2026-04-29-firecrawl-ats-verification.md` (this session). New project rule "Surface uncertainty over baseline knowledge" added to root CLAUDE.md (this session).
**Pause point:** Phase 2.8 implementation plan not yet written. Verification surfaced 3 architecture corrections (Workday CXS API exists; JSON-mode is 5 credits/page not 1; `/v1/scrape` not `/v1/map` for ATS discovery) plus 5 newly-verified public ATSes. Decisions D-14 + D-15 + D-16 capture the new direction. Awaiting user signal to write Phase 2.8 implementation plan, or to hand off to Codex for design review first.
**Blockers:** None. Working tree has uncommitted INDEX/decisions/state/STATUS/work-log/CLAUDE.md updates from this session — about to commit as a single "design checkpoint" commit per user request.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. ~~Phase 2.7 implementation Steps 0-11~~ — DONE 2026-04-29 (commits a13b9a5 → 9ff216a). 18/18 acceptance criteria pass.
2. ~~Phase 2.8 design plan~~ — DONE (commit 0f9421a, `docs/plans/2026-04-29-firecrawl-pivot-design.md`).
3. ~~Phase 2.8 decisions addendum + Web research project rule~~ — DONE (commit d8e3921).
4. ~~Phase 2.8 verification research~~ — DONE this session. `docs/design/2026-04-29-firecrawl-ats-verification.md` written. 3 corrections + 5 newly-verified public ATSes surfaced.
5. ~~Phase 2.8 design-checkpoint commit~~ — IN PROGRESS this session. Adds D-14, D-15, D-16 to decisions; refreshes state.md, STATUS.md, work log; registers 3 new docs in INDEX; adds "Surface uncertainty over baseline knowledge" project rule to root CLAUDE.md.
6. **Next step (user signal needed):** write Phase 2.8 implementation plan, OR hand off to Codex for design review of `2026-04-29-firecrawl-pivot-design.md` first. Implementation plan should incorporate: Step 0 URL triage (HTTP HEAD, 4-bucket classification), Step 1 firecrawl-discover.mjs, Step 2 API-direct tier expansion (5 new ATS adapters per D-15), Step 3 firecrawl-enrich.mjs, Step 4 npm full-scan chain wire-up, Step 5 acceptance audit + first scan.
7. **Phase 2.6 (still deferred):** clean rescan once Phase 2.8 lands. tag scan-v1-unfiltered → reset pipeline.md + scan-history.tsv → run full-scan with new architecture → P-1 audit.
8. **Phase 3:** open xlsx, S-tier review, /career-ops pipeline LLM eval, reports + tracker.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- **Q:** Phase 2.8 next step — write the implementation plan directly, or hand off to Codex for design review of `2026-04-29-firecrawl-pivot-design.md` first? User's call.
- **Q:** Where do the 5 new ATS adapters live? Options: `scripts/ats-adapters/{workday,smartrecruiters,personio,recruitee,workable}.mjs` (sibling to scan.mjs, per D-3); or fold into a single `ats-extra-scrape.mjs`. Recommend per-ATS files for clarity. Decide in implementation plan.
- **Q:** Does any of the 428 enabled companies use **Eightfold / Avature / SuccessFactors / Taleo / Oracle Cloud HCM**? Hostname grep didn't find any in current `careers_url` values, but post-Layer-1-discovery may surface some. Defer until verification.
- **Q:** Phase 2.6 clean rescan timing — execute right after Phase 2.8 lands, or merge to main first? Default: merge first (clean baseline split between architecture + data).
- **Q:** Should the next session merge `feat/multi-agent-collab` to `main` before Phase 2.8 implementation, or after? Trade-off: merging first means Phase 2.8 gets its own branch (cleaner history); merging after means Phase 2.7 + 2.8 land together (less branch churn). Default: merge first.
- **Q:** Sample-script bug fix still needed: `scripts/sample-portals-50.py` was deleted (yaml.dump lost comment groups). For future sample runs, use `ruamel.yaml` or string-based preservation. Not blocking; only matters if Step 8.5 is repeated under different scope.
- **Q:** Root `CLAUDE.md` `@import` shim — confirmed working this session (system prompt shows both `AI_AGENTS.md` and `.claude/CLAUDE.md` content). Open Q closed.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-29T15:00:00-04:00
<!-- section:read-watermark:end -->
