---
status: active
type: context
owner: claude
last-updated: 2026-05-08T00:00:00-04:00
read-if: "you need durable project truths as understood by Claude"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->

## 2026-05-08T00:00:00-04:00 — Shadow filter calibration as the canonical methodology for filter rule changes

Durable invariant from the V1→V10 shadow filter calibration arc (D-22). Whenever filter/scoring rules need substantive change, follow this pattern instead of patching `career-ops/export-jobs.mjs` directly:

1. **Build rules in a separate lib** — `scripts/lib/job-fit-rules.mjs` is the canonical filter-rules module. Production code (`export-jobs.mjs`) imports/copies from it; the lib is the single source of truth. New gates, classifiers, and detectors land here first.

2. **Generate versioned audit workbooks** — `scripts/production-filter-refinement-audit.mjs` reads the cached pipeline + the lib rules and writes `career-ops/output/production-filter-refinement-review-<baseline>-vN.xlsx` plus a JSON summary in `docs/audits/<date>-production-filter-refinement-vN-summary.json`. Zero Firecrawl spend (reads cached `extracted_signals` + `content_text`). ~30 seconds per version bump.

3. **Plan-review-revise-implement-verify cycle** for each substantive version bump:
   - Plan written → reviewer agent finds bugs → plan revised (typically v2) → verifier agent confirms revisions → implementation agent executes → independent verification round samples the *newly-dropped cohort* adversarially → either ACCEPT or surface FPs that trigger the next version.
   - Cycle caught 6 BLOCKING bugs in V7+V8 plans before code was written, and 5 territory FPs in V8+V9 implementations before they could ship to production.

4. **Test infrastructure is not optional.** Each rule change must:
   - Pass `scripts/test-job-fit-rules.mjs` (semantic + adversarial assertions).
   - Pass `scripts/test-realdata-fixtures.mjs` against `scripts/test-fixtures/v7-realdata-fixtures.jsonl` (66-row real-data set with `revised_in` audit trail tagging which version each fixture exercises).
   - Pass `scripts/test-properties.mjs` (type/range/implication/set-membership/determinism invariants over 100 random rows).
   - Pass `scripts/test-cohort-shape.mjs` (cohort-size band assertions — catches over/under-firing gates between versions).
   - Pass `scripts/v<N-1>-v<N>-diff.mjs` regression-baseline gate (every status flip tagged to a specific A-item; zero unattributed flips).
   - Baseline SHA `7bfe4ec5...071e` must remain unchanged across versions.

5. **P-10 anti-pattern protection:** when validating a NEW gate that adds drops, sample the *newly-dropped* cohort, NOT the kept cohort or the location-string distribution. Kept cohorts cannot contain the new gate's FPs by definition; location-string sampling answers the wrong question. See `.claude/memory/pitfalls.md` P-10.

6. **Production wiring is the last step**, with explicit user approval. Port from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs` only after manual review approval. Reversible via `git revert`.

This pattern is reusable for any future calibration cycle (Phase 3 calibration round, V11 source-hygiene patch, etc.). The `revised_in` fixture audit trail makes the chain auditable across many versions.

## 2026-05-01T20:30:00-04:00 — Phase 2.8 fully closed (post-rescan + scoring v2 + Option A)

Durable invariants from the 2026-05-01 closure cycle. Supplements (does not supersede) the 2026-04-30 closure-facts entry below — that entry captured sample-50 truths; this entry captures full-run truths and the iterations on top.

- **Roster baseline now 448 total / 392 enabled / 56 disabled / 0 missing notes** after 2026-05-09 Inspur disable (was 393/55 after 2026-05-01 closure). 4 SOURCE_BROKEN companies disabled on 2026-05-01: Palo Alto Networks, Grammarly, SiFive, EvenUp; per-company rationale durable in `docs/audits/2026-05-01-source-broken-disables.md`. Inspur added 2026-05-09 (D-24): careers_url resolves to product nav page, not a job board; semiconductor-category match. All disable rows carry explicit `note:` values.

- **Scoring policy v2 is the canonical scoring law** (per D-21). S threshold ≥18 (was ≥12); AE-only roles dropped at output time with lenient AE-multi-track keep; intern jobs dropped (defensive); deal-breaker jobs dropped (no longer penalized -5); Senior/Principal title-strength penalty -2 → -5 (Junior/Jr/Associate stay at -2). Sales/Business Development positive title-filter group removed from `portals.yml` so future scans never ingest AE-only jobs.

- **Option A signal-extraction fixes are canonical** in `enrich-jobs.mjs` (per D-21). Decimal-K comp parses correctly via `[\d,]+(?:\.\d+)?` + parseFloat (was the bug Will spotted). Anchor list expanded to catch "annual salary" / "the salary" / "estimated annual salary" / "salary band" / "pay band" / "salary for this". Strong-pattern fallback handles `$X,XXX-$X,XXX` and `$XXK-$XXK` without anchor. Single-value comp extracts within anchor window. Hybrid-non-Toronto deal-breaker active with cloud/mesh/fabric tech-context exclusion. Toronto bypass uses ±200 char proximity. YoE 6+ matches generic `\d+\+` patterns 6 through 99.

- **`scripts/reextract-signals.mjs` is the standard tool when signal-extraction logic changes.** Reads cached `content_text`, re-runs `extractSignals`, writes back updated `extracted_signals`. Zero Firecrawl credits. Use whenever the regex/heuristic logic in `enrich-jobs.mjs` changes — avoids needlessly re-fetching JDs.

- **`scripts/full-run-audit.mjs` is the standard tool for post-rescan acceptance.** Re-probes has-route-but-no-exports companies via direct adapters (~60s, free), classifies into 4 buckets, writes metrics JSON + classification MD matching sample-50 schema. Pair with `python scripts/acceptance-audit-phase2.8.py --metrics <path>` for gate verification.

- **Final Phase 2.8 Excel state:** `output/jobs-2026-05-01.xlsx` — 613 jobs / 154 companies / S=37 across 17 companies. OpenAI concentration 41% in S-tier (was 60% pre-fixes). Manageable manual-review surface.

- **Phase 2.8 acceptance audit gates passed at 75ec403:** source resolved 385/393 (98.0%); source health 385/385 (100%); miss class 213/213 (100%); AC-3 generic loc OR comp 664/956 (69.5%); AC-11b fallback 33/956 (3.5%); 12 PASS / 0 FAIL.

- **Excel manual-review marking convention** (advised to Will 2026-05-01): single `Push Decision` column with values `P1` / `P2` / `P3` / `SKIP` / blank. Optional `Will Notes` column. Maps to `applications.md` canonical statuses via `merge-tracker.mjs`: P1/P2/P3 → `Evaluated`, SKIP → `SKIP` or `Discarded`.

## 2026-04-30T22:11:51-04:00 — Phase 2.8 closure facts (post-Step 10, post-AC-2 redefinition)

Durable invariants surfaced during the Phase 2.8 closure pass (P-7/P-8/P-9 fixes by Codex, Step 0 disabled-company re-audit, Step 9/10 full-pipeline run, AC-2 redefinition, AC-3 generic-vs-Will-fit clarification):

- **Current roster baseline is 448 total / 397 enabled / 51 disabled** (post-Codex re-audit on 2026-04-30). Historical milestones to remember when reading older docs: Phase 2.7 cleanup landed at 428 / 20; Phase 2.8 Step 0 over-pruned to 388 / 60; the re-audit restored 9 false disables (Galileo AI, VAST Data, Grammarly, Thinking Machines Lab, OpenEvidence, Aurascape, Fathom, Skild AI, Qdrant) → 397 / 51 current. Source: `docs/audits/2026-04-30-step0-disabled-company-audit.md`. All 51 disabled rows carry explicit `note:`.

- **AC-2 is now a source-accounting + miss-classification gate, NOT exported-company coverage.** The pre-Step-10 wording ">=75% of sampled companies produce title-filtered exported jobs" is **retired**. Replacement metric stack (in `docs/audits/2026-04-30-sample50-missed-company-classification.md`):
  - **Source Resolution Rate** (report): companies with either exported jobs or a resolved direct/cache route. Step 10: 38/50 (76.0%).
  - **Source Health Rate** (gate ≥90%): resolved sources that responded successfully during direct probe. Step 10: 37/38 (97.4%) — PASS.
  - **Raw Job Availability Rate** (report): healthy sources that returned ≥1 raw job. Step 10: 36/37 (97.3%).
  - **Relevant Job Yield Rate** (report-only): companies with ≥1 title-filtered exported job. Step 10: 28/50 (56.0%).
  - **Miss Classification Rate** (gate ≥95%): no-yield companies assigned a concrete miss reason. Step 10: 22/22 (100.0%) — PASS.
  - Miss reason buckets: `NO_RELEVANT_JOBS` (source works, no Will-relevant titles); `NO_OPEN_JOBS` (source works, zero raw jobs); `ROUTE_MISSING` (no direct/cache route discovered); `SOURCE_BROKEN` (route exists but failed during probe).

- **AC-3 has TWO valid interpretations; the GENERIC one is the gate.** `enrich-jobs.mjs` now extracts BOTH `location_raw` (any location string Firecrawl markdown reveals) and `location_match` (Toronto/GTA/Ontario, Canada-only, fully-remote-US for scoring). AC-3 passes under generic `location_raw OR comp ≥ 40%` (Step 10: 126/178 = 70.8%). It does NOT pass under Will-fit `location_match OR comp` (Step 10: 26/178 = 14.6%). The narrow `location_match` is intentional for scoring, not for measuring extraction quality. Anyone re-running AC-3 must use the generic interpretation.

- **Step 10 transactional pattern is the production blueprint for sample runs but NOT for full rescans.** Codex's Step 10 used cp+overwrite-and-restore to preserve `portals.yml` / `pipeline.md` / `scan-history.tsv` / `applications.md` / fallback queue / live workbook. For the upcoming **full 397-company rescan**, the pipeline writes are the live update — no transactional restore. That's by design.

- **P-7/P-8/P-9 are FIXED in code on this branch (`feat/phase-2.8-firecrawl`):**
  - **P-7** (cache pollution): `iterTargets` in `scripts/ats-adapters/_lib.mjs` now filters cache entries to currently-enabled portals; cache-only adapters also exclude direct-portal companies. `firecrawl-extract.mjs` target selection got the same treatment.
  - **P-8** (Ashby JS-embed): `lib/ats-detect.mjs` Ashby pattern now covers `embed.ashbyhq.com` and the posting API URL form. `firecrawl-discover.mjs` now does direct Ashby slug probing on `no-ats-found` candidates with Firecrawl-failure fallback. Ramp (119 jobs) + Supabase (46 jobs) recovered.
  - **P-9** (Layer 2 → cache feedback): `firecrawl-extract.mjs` promotes a single ATS detected in extracted `jobs[].url` values back into `data/ats-discovery-cache.json` with `discovery_method:"layer-2-feedback"`.

- **TRUE Phase 2.8 sample-50 numbers (post all fixes), per Step 10 audit:**
  - Companies with title-filtered exported jobs: **28/50** (was projected 45–48/50 pre-Step-10; that projection is RETIRED — see supersession on 2026-04-30T00:00 entry below).
  - Source resolved (companies with a working route OR exported jobs): **38/50** (76.0%).
  - The remaining 22 no-yield companies are not parser failures — they're 8 NO_RELEVANT_JOBS (hardware/clinical roles + filters), 1 NO_OPEN_JOBS (Coactive AI), 12 ROUTE_MISSING (Databricks, Together AI, Navan, Waymo, etc.), 1 SOURCE_BROKEN (Seagate Workday CXS HTTP 422).

- **Seagate Technology is a permanent SOURCE_BROKEN warning, not a blocker.** Workday CXS endpoint returns HTTP 422 for `EXT`; direct Workday HTML returns a maintenance page on probe. Until either Seagate fixes their tenant or we discover an alternate site path, treat as a source-health warning in any rescan report.

## 2026-04-30T00:00:00-04:00 — Phase 2.8 architecture facts (post-Step 5)

Durable invariants surfaced during Phase 2.8 implementation Steps 0-5:

- **`data/ats-discovery-cache.json` has TWO schemas in active use:**
  1. **Legacy (custom-scraper.mjs writes):** `{ats: "workday"|..., tenant, instance, site, discovered: "YYYY-MM-DD"}`. The legacy `site` field sometimes contains a locale string (e.g., `"en-US"`) instead of the actual Workday site path — this is a known custom-scraper.mjs bug that surfaces 404s on the Workday CXS endpoint.
  2. **New (firecrawl-discover.mjs writes):** `{ats: "workday-cxs"|..., host, site, discovered_at: "<ISO>"}`. The new schema also includes `candidates: [...]` for ambiguous results.

  Both schemas are READ by `scripts/ats-adapters/_lib.mjs iterTargets()`. Backward-compat is permanent — DO NOT remove legacy reading code.

- **Provider name aliases:** legacy `ats: "workday"` is treated as equivalent to new `ats: "workday-cxs"` in cache reading. The provider key in `PROVIDER_PATTERNS` and lib/ats-clients.mjs is canonically `workday-cxs`.

- **The 8-provider direct-API tier is canonical:** Greenhouse, Ashby, Lever (in scan.mjs vendored upstream); Workday CXS, SmartRecruiters, Personio, Recruitee, Workable (in lib/ats-clients.mjs + sibling adapters per D-15 and D-19). JazzHR explicitly out-of-scope per AC-9.

- **Cached-discovery vs portals.yml-direct adapters split:**
  - The 5 D-15 adapters (workday-cxs, smartrecruiters, personio, recruitee, workable) handle BOTH portals.yml direct-ATS entries AND cache discoveries.
  - The 3 cached-discovery adapters (greenhouse-cached, ashby-cached, lever-cached, per D-19) handle CACHE-ONLY because scan.mjs (vendored upstream) already handles portals.yml direct-ATS entries for those 3 providers.
  - This asymmetry is documented in `scripts/ats-adapters/README.md`.

- **`safeEncode()` helper in `lib/ats-clients.mjs`:** all slug arguments to fetch functions go through `safeEncode()` (not raw `encodeURIComponent`). Idempotent — handles both raw (`"Jasper AI"`) and already-encoded (`"Jasper%20AI"`) inputs without producing double-encoded results. Required because Layer 1 firecrawl-discover.mjs captures slugs from URL form (already encoded).

- **Sample-50 baseline (Phase 2.7 → 2.8 progression) — projections superseded by Step 10 actuals (see 2026-04-30T22:11 entry above):**
  - Phase 2.7: 13/50 = 26% coverage
  - Phase 2.8 Step 5 (post Layer 0 + Layer 1, no Layer 2): 37/50 = 74% reported (later shown to be inflated by P-7 cache pollution; true Step-5 routing coverage was 30/50 = 60%)
  - ~~Expected after P-5/P-6 bug fixes: 41/50 = 82%~~ — superseded; the metric being projected (exported-company coverage) was itself retired per AC-2 redefinition.
  - ~~Expected after Step 6 Layer 2 firecrawl-extract: 45-48/50 = 90-96%~~ — superseded; same reason.
  - **Step 10 ACTUAL** (post P-7/P-8/P-9 + AC-3 fix + AC-2 redefinition): exported coverage 28/50 = 56% (now report-only); source resolved 38/50 = 76% (the metric that matters); source health 97.4%.
- **Phase 2.8 Firecrawl credit budget:** Step 5 smoke (Claude) consumed 161 credits; Step 10 sample-50 full pipeline (Codex) consumed 383 credits. Combined Phase 2.8 spend ~700 credits. Remaining: 100,401 credits (per Step 9 dashboard). Full 397-company clean rescan estimated ~3,000 credits worst-case (extrapolating 383 / 50 × 397).

<!-- BEGIN earlier (pre-Phase-2.8) entries -->

## 2026-04-28 — ATS URL distribution in portals.yml (post-audit)

Audited 2026-04-28 against actual `portals.yml`:
- 448 total entries (Excel minus 2 with no URL: Eternal, Treefera)
- **Pre-cleanup state**: 416 enabled, 32 disabled. Of 32 disabled: 16 duplicate-suppression (URL matched an enabled twin) + 16 unique-URL of which only 2 (NVIDIA, Saronic) had clear universal-exclusion reasons. Audit revealed 14 unique-URL disables had no documented reason (likely mis-drops) and 2 enabled companies (Foxconn rank 65, Skydio rank 437) violated universal exclusions.
- **Post-cleanup state** (per D-11): **428 enabled, 20 disabled** — all disabled rows carry explicit `note:` (16 `duplicate-of: <parent>`, 2 `excluded:HW supply chain`, 2 `excluded:defense drones / maritime`).
- ATS distribution within enabled (post-cleanup, corrected after Codex review of design plan v1): **18 direct-ATS** (Greenhouse 8 + Ashby 7 + Workday 3 + 0 Lever; Labelbox and Genmo are both re-enabled and both have direct ATS URLs — Labelbox via Greenhouse, Genmo via Ashby) + **410 branded career pages**.
- The 410 branded pages secretly use Greenhouse/Ashby/Lever/Workday underneath in many cases. `custom-scraper.mjs` Tier 1/2 (HTML regex + Playwright XHR intercept) discovers and API-scrapes them automatically. The Excel source has 100+ companies with known ATS-compatible URLs that get re-discovered during custom-scraper runs.

> Earlier 2026-04-20 entry stated "13 direct / 403 branded". That was incorrect (count drift / earlier data point that pre-dated full audit). Superseded by this entry.

## 2026-04-28 — Filter rationale (post mid-level pivot, per D-7)

**Seniority exclusions** — Will targets **mid-level IC roles only (3-5 YoE)**:
- **Senior, Sr, Sr., Principal** excluded — too senior; Will is intentionally avoiding senior/principal title-inflation expectations (per D-7)
- **Junior, Jr, Jr., Associate** excluded — too junior; below Will's experience band
- **Staff, Lead** excluded — top IC band (above mid-level)
- **VP, Vice President, SVP, EVP, Director, Head of, Managing Director, General Manager, Chief** excluded — management/C-suite, not applicable
- **Intern, internship, co-op, coop, PhD, postdoc** excluded — not relevant to professional IC track

> Earlier 2026-04-20 entry stated "Will targets mid-to-senior IC roles (Senior, Principal)". Superseded by D-7 pivot on 2026-04-28 — Will now targets mid-level only.

**Region exclusions** — only US/Canada/China/HK/Chinese-speaking regions are valid work bases. All others excluded. The filter catches roles that include location in the title (e.g., "Enterprise AE, Europe"). Roles with no location in the title are evaluated at the per-job stage.

**Language exclusions** — only English and Mandarin/Chinese are acceptable. The 16 language adjectives in the filter cover both "German speaking" and ", German" suffix formats in job titles (e.g., "Account Executive, German" matches because "German" is the substring).

## 2026-04-20 — Vendored upstream is sacred

The `career-ops/` subdirectory is a **separate git repo** (vendored upstream tool). Its `CLAUDE.md`, `AGENTS.md`, `scan.mjs`, and entire `.claude/` directory belong to the upstream maintainer. Never edit for personalization. All customization belongs in `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/portals.yml`, `career-ops/cv.md`. The agent-collab framework operates only at repo root and never recurses into `career-ops/`.

## 2026-04-28 — Pre-scoring system designed (D-9, D-10)

Rule-based pre-scoring system designed for `export-jobs.mjs` to drop manual-review burden from ~1000 jobs to ~50 jobs (S-tier). Two components:

**Title-based** (computed at export time from `pipeline.md` data):
- Track weights: AI-ENG=5, GEN-AI=5, SA=4, PM=4, CONSULT=3, CREATIVE=3, AE=3
- Multi-track bonus: +1
- Rank tier: 1-50=4, 51-150=3, 151-300=2, 301-450=1
- Category alignment: +2 if category in preferred list
- Title Strength Signal: Senior/Principal in title = -2 (slip-through); Junior/Associate = -2

**Description-based** (computed at enrichment time, cached):
- Toronto/GTA/Ontario: +2
- Fully remote US: +4
- Comp ±1 per $10K vs target floor (USD $120K / CAD $110K), no cap
- Track keywords (RAG, agentic, etc.): +1 per unique, cap +3
- Tech stack: +1 per unique, cap +2
- YoE 3-5: +1; 6+: -1; 0-2: -1
- Deal-breaker phrases: -5 to -10

Banding: S ≥12, A 8-11, B 4-7, C ≤3.

**Description enrichment** (D-10): new script `career-ops/enrich-jobs.mjs`, fetches each pipeline URL once, caches text + extracted signals in `data/job-descriptions-cache.json` (7-day TTL per URL). Tier-1 HTTP → Tier-2 Playwright fallback. Sequential per D-8.

**Full design:** `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`.

## 2026-04-28 — Multi-agent-collab framework adopted

The repo is now bootstrapped with `multi-agent-collab v0.4.1` for Claude+Codex collaboration. Two agents share equal ownership of project development. The shared contract lives in `AI_AGENTS.md`; per-agent adapters in `.claude/CLAUDE.md` and (when Codex joins) `.codex/CODEX.md`. Memory split into core-five (state/context/decisions/pitfalls) per agent, plus outward-facing work logs at `docs/agents/<agent>.md`. End-of-task Receipts and the fan-out routing matrix (`.collab/ROUTING.md`) are non-negotiable for substantive tasks.

<!-- section:entries:end -->
