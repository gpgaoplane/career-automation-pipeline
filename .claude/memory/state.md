---
status: active
type: state
owner: claude
last-updated: 2026-04-29T18:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/multi-agent-collab`
**Active task:** Phase 2.8 (Firecrawl pivot) — design + decisions + verification + Codex review + integration all done. Design plan now at v2 (`docs/plans/2026-04-29-firecrawl-pivot-design.md`) with all 5 Codex ⚠ Issues + 3 ❓ Questions + 2 💭 Optional improvements integrated. D-17 records the integration; D-14 inline-corrected for the firecrawl-enrich → firecrawl-extract naming typo and softened rate-cap claim. Decisions addendum Q-FC-4 rewritten to be unambiguous (pure Firecrawl-first per user principle).
**Pause point:** Implementation plan write is the next substantive task. Codex re-review is OPTIONAL (matches Phase 2.7 D-12 pattern: v2 in-place revisions are correctness passes, not architecture changes). User indicated merge-to-main happens after review integration → before implementation. Working tree has uncommitted v2 design plan + decisions addendum + decisions.md (D-14 patch + D-17) + state.md + STATUS.md + work log Receipt — about to commit as a single "Phase 2.8 design v2 (review integration)" commit.
**Blockers:** None.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. ~~Phase 2.7 implementation Steps 0-11~~ — DONE 2026-04-29 (commits a13b9a5 → 9ff216a). 18/18 acceptance criteria pass.
2. ~~Phase 2.8 design plan~~ — DONE (commit 0f9421a, `docs/plans/2026-04-29-firecrawl-pivot-design.md`).
3. ~~Phase 2.8 decisions addendum + Web research project rule~~ — DONE (commit d8e3921).
4. ~~Phase 2.8 verification research~~ — DONE this session. `docs/design/2026-04-29-firecrawl-ats-verification.md` written. 3 corrections + 5 newly-verified public ATSes surfaced.
5. ~~Phase 2.8 design-checkpoint commit~~ — DONE 2026-04-29 (commit 23676b2). Added D-14/D-15/D-16, registered 3 new docs in INDEX, added uncertainty rule.
6. ~~Codex handoff for Phase 2.8 design review~~ — DONE 2026-04-29 (commit ff12500, handoff `20260429-164715-2bcf`).
7. ~~Smoke-test scripts deletion~~ — DONE 2026-04-29 (commit 626e1ce; precedent: sample-portals-50.py).
8. ~~Codex review integration into design plan v2~~ — DONE 2026-04-29 (this session; about to commit). All 5 ⚠ Issues + 3 ❓ Questions + 2 💭 Optional accepted + integrated. D-17 records the integration; D-14 inline-corrected; decisions addendum Q-FC-4 rewritten.
9. **Next step:** write Phase 2.8 implementation plan, then merge `feat/multi-agent-collab` to main, then branch `feat/phase-2.8-firecrawl` from main and execute. Implementation plan should follow design plan v2 §6 sequence (12 steps: URL triage → lib/firecrawl + lib/ats-clients → 5 sibling adapters → firecrawl-discover → smoke validation → firecrawl-extract → enrich-jobs refactor → wire full-scan → rate-cap manual gate → sample-50 verification → AC audit → Phase 2.6 clean rescan).
10. **Phase 2.6 (still deferred):** clean rescan once Phase 2.8 implementation lands. Per design plan v2 §6 Step 12.
11. **Phase 3:** open xlsx, S-tier review, /career-ops pipeline LLM eval, reports + tracker.
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
Last read INDEX at: 2026-04-29T18:00:00-04:00
<!-- section:read-watermark:end -->
