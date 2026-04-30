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
**Active task:** Phase 2.8 implementation Steps 0-5 complete + Jasper safeEncode fix. **Handing off to Codex** at the end of Step 5 inspection per user direction. Sample-50 smoke run achieved 37/50 (74%) coverage — narrowly under AC-2 ≥75% target but +2.85x baseline; bug fixes in Step 5 inspection identified to clear AC-2 cleanly.
**Pause point:** Step 5 manual gate review concluded with three bug findings ready for Codex to fix in Step 6. Live state restored cleanly (git diff portals.yml/pipeline.md/scan-history.tsv: empty). Working tree clean.
**Blockers:** None for Codex. Three bugs documented in pitfalls.md for fix.
**Last commit on branch:** `8c4a443` (Jasper safeEncode fix).
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
21. **NEXT (Codex):** Step 5 inspection surfaced 3 bugs. Fix them BEFORE Step 6:
    a. Candidate dedup in resolveAmbiguous (4 of 6 "ambiguous" cases are actually 1 unique tenant repeated 2-420×; recovers Cadence/F5/Monolithic Power/Tokyo Electron → 41/50 = 82%, clears AC-2)
    b. Greenhouse "embed" synthetic slug filter (slug "embed" comes from boards.greenhouse.io/embed JS library URL, never a company; affects Vectra AI, Zipline)
    c. After fixes, re-run sample-50 smoke to confirm ≥75%
22. **Step 6 — firecrawl-extract.mjs Layer 2** — handles 20 no-ats-found companies via JSON-mode extraction (5cr/page). Estimated 100 credits.
23. **Step 7 — enrich-jobs.mjs Firecrawl-first refactor** — Q-FC-4 pure Firecrawl-first.
24. **Step 8 — full-scan-orchestrator.mjs + npm wiring** — design v2 §6.8 + AC-11 fallback fan-out.
25. **Step 9 — dashboard rate-cap manual gate (USER)** — verify Firecrawl plan caps before high-concurrency runs.
26. **Step 10 — sample-50 verification (USER)** — full pipeline including enrich.
27. **Step 11 — acceptance audit** — all 11 ACs from design v2 §7.
28. **Step 12 — tag scan-v2-prerescan** — Phase 2.6 readiness.
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
