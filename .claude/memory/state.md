---
status: active
type: state
owner: claude
last-updated: 2026-04-30T00:00:00-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl` (branched from main after `feat/multi-agent-collab` merged via 39bac3d).
**Active task:** **Phase 2.8 implementation Steps 0-12 essentially COMPLETE.** All 11 ACs from design v2 §7 audited: 9 PASS / 3 manual-pending / 0 FAIL. Code/config implementation done; only user-gated manual steps remain.
**Pause point:** Steps 9+10 (manual gates) remaining. Step 9 = USER must log into firecrawl.dev dashboard, document RPM/concurrency/monthly caps in `data/firecrawl-plan-caps.tsv` before any high-concurrency run. Step 10 = full-pipeline sample-50 verification including Firecrawl-first enrich (estimated ~1500 credits — user should authorize before run). Tag `scan-v2-prerescan` placed.
**Blockers:** None — Phase 2.8 is feature-complete. Production execution awaits Step 9 user confirmation of caps + Step 10 full sample run authorization.
**Last commit on branch:** `28f72bb` (Step 11 acceptance audit). Tag: `scan-v2-prerescan`.
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
14. ~~Step 0 — portals.yml URL triage~~ — DONE 2026-04-29 (commits e721305, 631cd87, aff12fc). 428→388 enabled. 42 disable/update edits applied per user-approved batches.
15. ~~Step 1 — lib/firecrawl.mjs SDK wrapper + tests~~ — DONE (commit 8f25673). 8/8 tests pass; live test on example.com confirmed cost log + AC-11a fallback queue wiring.
16. ~~Step 2 — lib/ats-clients.mjs 8-provider library~~ — DONE (commit 68335e5). 9/9 integration tests pass. **Workday CXS pagination CONFIRMED** (40 jobs across 2 pages).
17. ~~Step 3 — 5 sibling adapters (workday-cxs/smartrecruiters/personio/recruitee/workable)~~ — DONE (commit 8ac3283). QI-1 RESOLVED at repo-root scripts/ats-adapters/. JazzHR explicit out-of-scope per AC-9.
18. ~~Step 4 — firecrawl-discover.mjs Layer 1~~ — DONE (commit df51a68). 11/11 tests pass; Cloudflare drill→Greenhouse confirmed; --max-credits cap respected with fallback queue.
19. ~~Step 5 — sample-50 smoke validation~~ — DONE (commit 5b5fcf9). 37/50 (74%) coverage = +2.85x baseline. Cached-discovery adapter pattern emerged (greenhouse-cached/ashby-cached/lever-cached) extending orchestrator from 5 to 8 adapters. 161 Firecrawl credits spent.
20. ~~Jasper safeEncode bug fix~~ — DONE (commit 8c4a443). idempotent encoding.
21. ~~P-5 + P-6 bug fixes~~ — DONE (commit 4371eee). resolveAmbiguous candidate dedup + Greenhouse embed-slug filter. Sample-50 re-run: 39/50 (78%) — AC-2 cleared (commit 66ac892).
22. ~~Step 6 — firecrawl-extract.mjs Layer 2~~ — DONE (commit 2e463b8). Live test on Shopify: 31 jobs returned in 1 JSON-mode call (5 credits).
23. ~~Step 7 — enrich-jobs.mjs Firecrawl-first refactor~~ — DONE (commit 1520bd1). fetchFirecrawlMarkdown primary; HTTP/Playwright outage-only fallback (NOT cost-routing). Tests 19/19 still pass.
24. ~~Step 8 — full-scan-orchestrator.mjs + npm wiring~~ — DONE (commit 5294f7f). Orchestrator with --dry-run/--list + Layer 3 fallback fan-out. npm full-scan / full-scan:dry-run / full-scan:list scripts.
25. ~~Step 11 — acceptance audit~~ — DONE (commit 28f72bb). 9 PASS / 3 manual-pending / 0 FAIL. Re-runnable.
26. ~~Step 12 — tag scan-v2-prerescan~~ — DONE.
27. **PENDING — Step 9 USER GATE** — log into firecrawl.dev dashboard; document RPM/concurrency/monthly caps in `career-ops/data/firecrawl-plan-caps.tsv`; AC-10 final pass.
28. **PENDING — Step 10 USER AUTHORIZATION** — full-pipeline sample-50 verification with enrich enabled (~1500 Firecrawl credits estimated). Confirms AC-3 and AC-11b runtime.
29. **Phase 2.6 / Phase 3** still deferred.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- **Q (for Codex):** Should bugs #1+#2 (candidate dedup + embed-slug filter) be fixed in `career-ops/firecrawl-discover.mjs` (resolveAmbiguous) and `career-ops/lib/ats-detect.mjs` (PROVIDER_PATTERNS)? Recommended yes — see pitfalls.md P-4/P-5/P-6.
- **Q (for Codex):** After bug fixes, re-run sample-50 smoke before Step 6, or fold into Step 10's full-pipeline sample run? Recommend re-run before Step 6 for cheap AC-2 confirmation (~50-100 credits).
- **Q (for Codex):** Step 6 firecrawl-extract.mjs — JSON-mode 5cr/page on 20 no-ats-found companies (~100 credits). Acceptable cost; proceed without further user gate? User pre-authorized "step by step" execution with manual gates only at the explicit gates (Step 5 done, next gate is Step 9 dashboard rate-cap).
- **Q (deferred):** Eightfold / Avature / SuccessFactors / Taleo / Oracle Cloud HCM — none in portals.yml direct URLs; may surface post-Layer-1-discovery. Defer to Step 6 + 10 inspection.
- **Q (deferred):** Phase 2.6 clean rescan timing — after Phase 2.8 implementation lands.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-30T00:00:00-04:00
<!-- section:read-watermark:end -->
