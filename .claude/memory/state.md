---
status: active
type: state
owner: claude
last-updated: 2026-04-30T22:11:51-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/phase-2.8-firecrawl` (branched from main after `feat/multi-agent-collab` merged via 39bac3d).
**Active task:** Phase 2.8 sample-50 acceptance is GREEN. Acceptance audit reports **12 PASS / 0 FAIL / 0 pending**. Codex completed P-7/P-8/P-9 fixes, the Step 0 disabled-company re-audit (restoring 9 false disables), Step 9 dashboard caps documentation, the Step 10 transactional sample-50 full-pipeline run, the AC-3 `location_raw` interpretation, and an AC-2 redefinition (now source-accounting + miss-classification, not exported-company coverage). Claude-owned memory has been reconciled to match. **Next gate: full 397-company clean rescan under source-accounting metrics** (user-gated; not yet started).
**Pause point:** Catchup + memory reconciliation complete. User asked three pre-rescan questions; Claude answered with code-level review (Q1 — Codex diffs all sound), delta-detection grep (Q2 — NO automatic between-runs delta exists; gap to surface before rescan if it matters), and orchestrator chain review (Q3 — yes, full enrich + export is in the chain; final Excel is band-colored, scored, sorted). Quota hit 100% after answering. Working tree still carries Codex's uncommitted edits + Claude's memory reconciliation. **Three open decisions for the user before rescan starts:** (1) accept the no-delta-detection gap or build delta-detection first; (2) for full-rescan acceptance, generate a full-run metrics JSON or update the audit script (script currently reads `docs/audits/2026-04-30-step10-sample50-metrics.json`); (3) commit cadence (commit catchup work now vs single commit at end). Awaiting user direction on those + final rescan authorization.
**Blockers:** None for the rescan itself. Known warning to surface in the full-run report: Seagate Technology Workday CXS endpoint returned HTTP 422 during Step 10 (classified `SOURCE_BROKEN`, not a stop condition).
**Last commit on branch:** `db8804f` (Codex's "phase 2.8 second handoff to codex" — note the message is misnamed; it actually documented P-7/P-8/P-9 ahead of Codex's pickup). Tag `scan-v2-prerescan` still marks the pre-rescan baseline.
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. ~~Phase 2.8 implementation Steps 0-12~~ — DONE (commits e721305 → bc45b4e). All 12 steps code-complete.
2. ~~P-7 cache pollution fix~~ — DONE by Codex (handoff `20260430-104400-aa3d` → return `20260430-112119-cee0`).
3. ~~P-8 Ashby JS-embed detection fix~~ — DONE by Codex; Ramp/Supabase recovered (119 + 46 jobs via direct Ashby probing + Firecrawl-failure fallback).
4. ~~P-9 Layer 2 ATS feedback into discovery cache~~ — DONE by Codex.
5. ~~Step 0 disabled-company re-audit~~ — DONE by Codex 2026-04-30. Restored 9 high-confidence false disables; new baseline 448 / 397 / 51 (was 448 / 388 / 60). Source: `docs/audits/2026-04-30-step0-disabled-company-audit.md`.
6. ~~Roster baseline reconciliation across shared docs~~ — DONE by Codex (handoff `20260430-161303-809e`). `AI_AGENTS.md`, `docs/design/companies-roster.md`, and historical scripts updated/guarded.
7. ~~Step 9 Firecrawl dashboard caps~~ — DONE 2026-04-30. User supplied: plan `free`, monthly_credits `0`, credits_remaining `100401`, scrape RPM `10/min`, crawl RPM `1/min`, concurrent `2`. Persisted at gitignored `career-ops/data/firecrawl-plan-caps.tsv`.
8. ~~Step 10 transactional sample-50 full-pipeline run with enrich~~ — DONE by Codex 2026-04-30. 50 enabled (seed=42); 28/50 companies with title-filtered exported jobs; 178 jobs total; bands S=7/A=58/B=111/C=2; 383 Firecrawl credits. Workbook preserved at `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx`. Live state restored cleanly.
9. ~~AC-3 ambiguity fix~~ — DONE by Codex. Added generic `location_raw` extraction + broadened comp parsing in `enrich-jobs.mjs`. Generic `location_raw` OR comp = 126/178 (70.8%). Will-fit `location_match` OR comp = 26/178 (14.6%) — kept narrow on purpose; the AC interpretation that passes is the generic one.
10. ~~AC-2 redefinition (D-20 below)~~ — DONE by Codex 2026-04-30. Replaced ">=75% companies produce jobs" gate with source-accounting + miss-classification metrics. Source resolved 38/50 (76.0%); source health 37/38 (97.4%); raw job availability 36/37 (97.3%); miss classification 22/22 (100.0%); relevant job yield report-only 28/50 (56.0%). Source: `docs/audits/2026-04-30-sample50-missed-company-classification.md`.
11. ~~Handoff packaging~~ — DONE by Codex (handoff `20260430-215447-c74d`, picked up by Claude 2026-04-30T22:11:42-04:00). `AI_HANDOFF.md` + `RESUME_PROMPT.md` rewritten as fresh-pickup artifacts; `docs/design/scraping-architecture.md` carries Phase 2.8 supersession note.
12. ~~Claude memory reconciliation~~ — IN PROGRESS this session. state.md / context.md / decisions.md / pitfalls.md aligned with current truth (this turn). Work log entry to follow.

13. **NEXT — full 397-company clean rescan** (user-gated):
    - Tooling: `npm run full-scan` from `career-ops/` (orchestrator at `scripts/full-scan-orchestrator.mjs`).
    - Cost estimate: based on Step 10 sample-50 burn of 383 credits, full 397 ≈ ~3,000 credits in worst case. Within `--max-credits=3000` default but worth raising the cap explicitly if the run hits it. Plan budget: 100,401 credits remaining, comfortable headroom.
    - Concurrency: respect dashboard cap (2 concurrent / 10 RPM scrape). Orchestrator already runs sequentially.
    - Acceptance: re-run `python scripts/acceptance-audit-phase2.8.py` after the rescan; produce a full-run analogue of `docs/audits/2026-04-30-sample50-missed-company-classification.md` covering ALL 397 enabled companies; classify every no-yield company into NO_RELEVANT_JOBS / NO_OPEN_JOBS / ROUTE_MISSING / SOURCE_BROKEN.
    - Do **not** restore the old `>=75% companies produce jobs` AC-2 gate. Title-filtered yield is reported, not gated.
    - Seagate Workday CXS warning: surface in the report; do not abort.
14. **AFTER FULL RESCAN:** prioritize `ROUTE_MISSING` backlog by company fit (rank tier + category alignment), not by treating every miss as a parser bug. Strong-fit `ROUTE_MISSING` examples from sample: Databricks (high-fit, no route).
15. **OPTIONAL CLEANUP:** consider a low-fit policy pass on hardware/clinical companies surfaced as `NO_RELEVANT_JOBS` (KLA, Marvell, Texas Instruments, Lightmatter, Delfina Care). Keep separate from source-health metrics.
16. **DEFERRED:** Phase 3 (LLM-driven evaluation pipeline integration). No action this session.
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- **Q (for user — pre-rescan):** Three open items surfaced by the Q1/Q2/Q3 review (see this session's work-log entry for full text):
  1. **Delta-detection gap.** No mechanism exists for marking jobs that disappeared between runs. `scan-history.tsv` is dedup-only; `pipeline.md` rows persist; `check-liveness.mjs` is per-URL not between-run. Build delta-detection before the rescan (estimated 100–200 lines + tests) OR accept the gap and rely on manual URL re-checks.
  2. **Full-run audit metrics.** `scripts/acceptance-audit-phase2.8.py` reads sample-50 metrics JSON. For the full rescan to have an automated acceptance pass, we need either a full-run metrics generator script (writes `docs/audits/<YYYY-MM-DD>-fullscan-metrics.json` with the same schema) OR a script update to compute metrics on-the-fly from pipeline.md + ats-discovery-cache.json + the export workbook.
  3. **Commit cadence.** Working tree has 28+ uncommitted modified files (Codex's Phase 2.8 closure + Claude's memory reconciliation). Two clean options: commit catchup now → run rescan → commit rescan output as separate atomic units (cleaner history); OR single commit at end (faster, less granular).
- **Q (for user):** Authorize the full 397-company rescan after the three above are resolved? Cost estimate ~3,000 Firecrawl credits worst-case; budget remains 100,401. Sequential per dashboard caps. Live data files (pipeline.md, scan-history.tsv, applications.md, fallback queue, output workbook) will be written in-place — Step 10's transactional cp+overwrite-and-restore was for the sample-50 only, since the full rescan IS the live update.
- **Q (deferred):** Once `ROUTE_MISSING` companies are prioritized post-rescan, do we want a Layer 1 "actions:[{wait:8000ms}]" experiment on the top-fit unrouted companies (Databricks first), or accept that they remain `ROUTE_MISSING` until a future Layer 1 enhancement pass?
- **Q (deferred):** Phase 2.6 was originally framed as the clean rescan itself. With the full rescan now imminent, the "Phase 2.6" label can be retired (it'll be folded into the post-rescan analysis pass).
- **Q (deferred):** Should the full-run audit artifact land at `docs/audits/2026-04-30-fullscan-classification.md` (matches the sample-50 naming) or at `docs/audits/<YYYY-MM-DD>-fullscan-classification.md` (date of the actual run)? Default to date-of-run.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-30T22:17:23-04:00
<!-- section:read-watermark:end -->
