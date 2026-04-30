---
status: active
type: state
owner: claude
last-updated: 2026-04-29T19:30:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl` (branched from main after `feat/multi-agent-collab` merged via 39bac3d)
**Active task:** Phase 2.8 implementation plan now at v2 — Codex review of v1 (handoff `20260429-183239-0925`) integrated. All 5 ⚠ Issues + 1 of 2 ❓ Questions ACCEPTED + 1 ❓ DEFERRED + 2 💭 Optional ACCEPTED. D-18 records the integration. Q-FC-1 baseline section in addendum marked HISTORICAL/SUPERSEDED. Implementation plan §0 precedence rewritten (verification = priority 1); §0a command-cwd convention added; Step 0 HEAD+GET fallback; Step 1/4/6/7 fallback queue wiring; Step 2 Workday pagination test; Step 8 full-scan-orchestrator.mjs replaces plain npm chain; AC-11 split into AC-11a/AC-11b; RI-4 ambiguous slug resolution rewritten; QI-1 RESOLVED (root-level adapters).
**Pause point:** Pre-flight checks for Phase 2.8 implementation execution. About to commit v2 integration; then waiting on user signal to begin Step 0 execution per user direction "notify me before actual implementation".
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
9. ~~Phase 2.8 implementation plan v1 write~~ — DONE 2026-04-29 (commit 7d67b2b).
10. ~~Merge `feat/multi-agent-collab` to main~~ — DONE 2026-04-29 (merge commit 39bac3d).
11. ~~Branch `feat/phase-2.8-firecrawl` from main~~ — DONE 2026-04-29.
12. ~~Hand off implementation plan to Codex for review~~ — DONE 2026-04-29 (handoff `20260429-183239-0925`, commit 47dcd10).
13. ~~Codex review integration → implementation plan v2~~ — DONE 2026-04-29 this session, about to commit. D-18 records the integration; addendum Q-FC-1 marked HISTORICAL.
14. **Next step (USER GATE):** Step 0 execution (portals.yml URL triage). User explicitly asked to be notified before actual implementation begins, with a high-level overview cue. Awaiting user signal.
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
Last read INDEX at: 2026-04-29T19:30:00-04:00
<!-- section:read-watermark:end -->
