---
status: active
type: status
owner: shared
last-updated: 2026-05-12T00:00:00-04:00
read-if: "you need the current project phase, recent done items, blockers, or handoff note"
skip-if: "status != active"
---

# Project Status — Career Ops (Will Guo Job Search Pipeline)

**Last Updated:** 2026-05-12
**Current Phase:** **POST-V10 FORWARD MOTION — Candidate A (LLM evaluation) in early progress.** V10 calibration arc closed; V10 production wiring shipped on `main` (tag `production-v10`); Phase 1 manual-review cleanup landed; Reviewer Queue refined twice; `career-ops/output/` reorganized into `workbooks/` + `applications/` + `calibration/` + `tests/` buckets; new `scripts/render-cv-pdf.mjs` (markdown CV → PDF) added. **3 V10 evaluation rows tracked in `applications.md`** via `/career-ops oferta`; awaiting Will's next URL batch or Phase 3 menu pick (B=calibration, C=delta-detection, D=V11 rule refinement, E=NO_RELEVANT_JOBS cleanup, F=F-005 enrichment). Current canonical workbook: `career-ops/output/workbooks/jobs-2026-05-10.xlsx` (238 kept, S=45/A=91/B=81/C=21, 88 reviewer-queue rows). Roster baseline: **448 total / 392 enabled / 56 disabled**. Baseline workbook SHA `7BFE4EC5...071E` preserved at `career-ops/output/workbooks/jobs-2026-05-01.xlsx`. Phase 2.8 remains CLOSED at tag `phase-2.8-complete`.

## Done

- [x] **Post-Phase-1 forward motion: output reorg, Reviewer Queue refinement, CV PDF tool, Candidate A start** (2026-05-09 → 2026-05-10, Claude + Will):
  - **`7b4d0c5`** widened Reviewer Queue filter to mirror shadow workbook line 512 + doc-sync of `AI_AGENTS.md` and `.claude/memory/context.md` roster baseline.
  - **`9302b48`** narrowed Reviewer Queue to ambiguity signals only — kept rows where annotations match `/review/i` OR `primary_family === 'UNKNOWN'`. Drops missing-info-only rows that would otherwise clutter the queue.
  - **`6da770f`** reorganized `career-ops/output/` into `workbooks/` / `applications/` / `calibration/` / `tests/` subdirs. Updated `career-ops/export-jobs.mjs` and 14 scripts (`production-filter-refinement-audit.mjs`, `shadow-version-diff.mjs`, V5-V6 through V9-V10 diff/test pairs, `fullrun-calibration-workbook.mjs`, `gated-full-scan-v1.mjs`, `direct-core-v1.mjs`) so all read/write paths point at the new bucket layout. Baseline workbook now at `career-ops/output/workbooks/jobs-2026-05-01.xlsx`.
  - **`faacfa5`** tracked 3 V10 evaluation rows in `career-ops/data/applications.md` — Candidate A (LLM evaluation pipeline) is now in early progress.
  - **`3fa70b2`** added `scripts/render-cv-pdf.mjs` (markdown CV → HTML → PDF renderer) for generating ATS-tailored CV PDFs at apply time.
  - All commits zero-Firecrawl. Workbook regenerated as `jobs-2026-05-10.xlsx` (same kept cohort as 2026-05-09 since Reviewer Queue narrowing only affects which kept rows go to Sheet 5, not pipeline drop logic).
  - No new decisions/pitfalls — these are tactical refinements + tool addition, not architectural changes.

- [x] **Phase 1 V10 wire cleanup based on Will's manual-review feedback** (2026-05-09, Claude + Will):
- [x] **Phase 1 V10 wire cleanup based on Will's manual-review feedback** (2026-05-09, Claude + Will):
  - Will's manual review of `jobs-2026-05-08.xlsx` (post-rescan) surfaced 4 real defects + 1 feature request: Mistral Paris kept at S-tier (should drop on Paris on-site); Inspur non-career URL in Pending Jobs; no Reviewer Queue sheet to surface review-flagged rows; general FP/FN concern; filter request to drop research/scientist/theoretical roles.
  - Diagnostic traced: Mistral Paris had `extractRawLocations` missing Paris/France + `detectTerritory` returning UNKNOWN + V10 emitted `location_review_hybrid_onsite_without_clear_remote` annotation (V10 said "needs review" but production had no surface for it). Inspur had `detectSourceHygiene invalid=false` (heuristics don't catch valid-but-not-job marketing pages). 12 research/scientist roles in kept cohort because `AI Research Engineer` was in positives and bare `Scientist` not in negatives.
  - Phase 1 fixes: (a) Reviewer Queue sheet (Sheet 5) added to `career-ops/export-jobs.mjs` mirroring shadow workbook line 512 — kept rows with `/review/i` annotations or `UNKNOWN` family. (b) `portals.yml` title_filter negatives expanded with `Research`, `Researcher`, `Scientist`, `Theoretical`, `Theorist`. (c) `AI Research Engineer` removed from `title_filter.positive`. (d) Inspur disabled (SOURCE_BROKEN note). (e) Layer 0 defense-in-depth in `export-jobs.mjs`: 0a drops rows from disabled companies, 0b applies `title_filter.negative` at export time. Mirrors scan.mjs filter logic so policy propagates without a full rescan.
  - Net: 238 kept (was 255), 88 reviewer-queue rows (S=12/A=34/B=30/C=12) including Mistral Paris correctly flagged. Bands: S=45/A=91/B=81/C=21. Inspur and 12 research/scientist rows removed.
  - Roster baseline: 393/55 → **392/56** (Inspur disable).
  - Phase 2 (V11 rule library refinement: extractRawLocations + detectTerritory + detectSourceHygiene + parseJdSections) deferred to Phase 3 Candidate D. Same shadow-first methodology as V1→V10.
  - D-24 records the cleanup decisions + tradeoffs.

- [x] **V10 production wiring SHIPPED** (2026-05-08, Claude + Will):
  - V10 filter rules wired from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs` via `scoreJob` delegation. Source-hygiene gate `detectSourceHygiene` imported from `scripts/production-filter-refinement-audit.mjs`. JD section parser `parseJdSections` from `scripts/lib/jd-sections.mjs`. Single source of truth preserved — no duplication of rule logic.
  - Pending Jobs sheet replaced legacy 11-column shape with V10-native 12-column Option B: Rank, Company, Category, Title, URL, Primary Family, Families, Semantic, Shadow Score, Shadow Band, Annotations, Score Reasons. Bands keyed off `shadow_band` (S=14+, A=24+, B=34+ in V10's 50-pt scale).
  - New Sheet 4 "Source Repair Review" mirrors shadow workbook shape (11 columns: Company, Title, URL, Cache Hit, Source Repair Reason, Evidence, Primary Family, Shadow Score, Shadow Band, Annotations, Score Reasons).
  - By Company sheet aggregations updated: `pre_score_max/avg` → `shadow_score_max/avg`. S-Tier Count column unchanged.
  - Conservative R2 path: `signals.deal_breaker_signal` early-drop layer kept alongside V10. Reasoning: deal_breaker catches PhD-required + no-sponsorship-remote (no V10 equivalent). Tradeoff: 343 hybrid_non_toronto pre-drops overlap V10 territory/location, making per-axis comparison harder. Acceptable; revisit after Will's review.
  - Legacy helpers deleted (Sub-step 1g): `computeTitleScore`, `computeDescScore`, `computeBand`, `TRACK_WEIGHTS`, `PREFERRED_CATEGORIES`, `deriveMatchTrack`, `parseTrackMappingFromYaml`, `GROUP_TO_TRACK`. Reviewer confirmed no external consumers (audit-time copies in `scripts/full-run-audit.mjs` and `scripts/fullrun-calibration-workbook.mjs` are independent and unaffected).
  - **Plan-review-revise-agent-review cycle** (3 reviewer agent passes):
    1. Plan v1 → reviewer subagent → REVISE_BEFORE_EXECUTION with 6 fixes (R1 source-hygiene gate, R2 deal_breaker preservation audit, R3 multi-reason double-count, R4 rollback command, R5 smoke-test arithmetic, families.join object-array bug) + 7 open-question recommendations.
    2. Plan v2 (with Will's choices: conservative R2, Option B columns, second pass yes) → second reviewer → APPROVE_FOR_EXECUTION with 3 minor nits (intern-count off, By Company header strings, per-row companyMap preservation).
    3. Post-wire reviewer + 10-row P-10 adversarial random sample (9/10 explicit genuine drops + 1 unverified-plausible) → APPROVE_FOR_COMMIT_AND_TAG.
  - Smoke run: `node export-jobs.mjs` against cached 2026-05-01 pipeline (956 rows; +23 vs shadow's 933 from incremental scans). Output: 172 kept (S=33/A=85/B=41/C=13), 250 V10 hard-drops (territory 50, sales-title 4, sales-content 28, yoe 55, comp 1, onsite-non-toronto 100, specific-non-toronto-location 79), 191 source-repair, 343 deal_breaker. Total accounted 956 ✓. Baseline workbook SHA preserved: `7BFE4EC5...071E`.
  - Spot-checks pass: Cohere FDE Infrastructure Specialist KEPT (5 variants, S/A bands), GitLab Engineering Manager AI Workflow Catalog KEPT (V10's V9-FP-closure preserved-correct case), OpenAI AI Deployment Engineer ChatGPT/Codex KEPT, OpenAI India variant correctly DROPPED.
  - Known V10-inherited FP (NOT wire-introduced; deferred to V11): `Mistral AI | Applied AI, Forward Deployed Machine Learning Engineer - Morocco` retained at S-tier. Cache shows Casablanca-only, "On-site", zero NA tokens. Same class as Trimble PM listing-chrome FP. Reviewer confirmed via `scoring-ledger.tsv:742`.
  - D-23 records the wiring decisions + methodology. Tag: `production-v10`. Plan v2 archived at `docs/plans/2026-05-08-v10-production-wiring.md`.

- [x] **Shadow filter calibration arc CLOSED — V10 manual review approved + checkpointed** (2026-05-07, Claude + Will):
  - Will completed manual review of `career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx` and approved V10 as production candidate.
  - Four logical commits landed on `feat/phase-2.8-firecrawl` to checkpoint the entire arc before production wiring:
    1. `d73638b` — framework upgrade to multi-agent-collab v0.4.3 + Gemini onboarding (75 files, +6471/-1188).
    2. `17251c8` — shadow filter calibration test infra + enrichment patches (37 files, +11015/-8). Includes `scripts/lib/job-fit-rules.mjs` (V10 rules), `scripts/lib/jd-sections.mjs`, 1,418-assertion test suites, 66-row real-data fixtures with revised_in audit trails, V5-V6 through V9-V10 diff scripts, gated full-scan harness, calibration workbook generator, ATS adapter core, and `career-ops/enrich-jobs.mjs` compResult helper for hourly→annual normalization with confidence tagging.
    3. `7dd512e` — shadow filter calibration arc V1→V10 audit trail (38 files, +9412). All audit findings (R3-R7), all per-version implementation summaries (V6-V10), V7+V8 plan reviews + plan-v2 verifications, per-version diff summaries.
    4. memory + STATUS update for V10 closure (this commit).
  - **Pause point:** immediately before production wiring. Reversible — V10 rules live in `scripts/lib/`; production code untouched.
  - **Next agent action when Will gives green light:** port V10 rules from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs`, smoke test, tag `production-v10`. Estimated 1-2 hours.

- [x] **Shadow filter V10 refinement implemented + Round 7 verification: V10_READY_FOR_PRODUCTION_WIRING** (2026-05-07, Claude):
  - V10-1 closes the V9 multi-region body-tie FPs (Round 6 caught GitLab Eng Mgr AI Workflow Catalog + ElevenLabs FDE). Symmetric body-tie guard added to mirror V9-2's implicit-anchor mechanism. Spec deviation: implementation chose "suppression-only" semantics over original "tie → NA promotion" design; Round 7 confirmed sound.
  - Round 7 independent verification: 2/2 V9 FPs closed, 3/3 preserved-correct captures (Cohere FDE Infrastructure Specialist, GitLab AI Engineer Bangalore, OpenAI AI Deployment India), 2/3 side-effect adds legitimate, 1 source-hygiene noise (Trimble PM — listing-chrome leakage; deferred to optional V11).
  - V10 metrics: pipeline_rows=933, shadow_hard_drops=536, sales_hard_drops=81, territory_hard_drops=108, comp_hard_drops=1, yoe_hard_drops=148, location_hard_drops=361, source_repair_review_rows=184, validation_findings=0. Baseline SHA preserved: `7bfe4ec5...071e`. 1,418 test assertions pass.
  - Files added: `docs/audits/2026-05-07-production-filter-refinement-v10-summary.json`, `docs/audits/2026-05-07-shadow-v9-v10-diff-summary.json`, `docs/audits/2026-05-07-v10-implementation-summary.md`, `docs/audits/2026-05-07-round7-verification-findings.md`, `scripts/v9-v10-diff.mjs`, `scripts/test-v9-v10-diff.mjs`. New workbook: `career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx`.
  - Methodological pitfall P-10 saved to `.claude/memory/pitfalls.md`: "Implementation agents self-verify on the wrong population." Caught twice (Rounds 5 + 6); V10 brief encoded the lesson explicitly; Round 7 confirmed it worked.

- [x] **Shadow filter V9 refinement implemented + Round 6 verification: 2 territory FPs caught** (2026-05-06, Claude):
  - V9-1 NA_CITIES_RE bare-abbrev expansion with guards (US state abbreviations only count when paired with a city or "United States"/"USA" anchor). V9-2 role-anchor markdown patterns added.
  - Round 6 independent verification caught 2 territory FPs: GitLab Eng Mgr AI Workflow Catalog + ElevenLabs FDE. Same anti-pattern as Round 5 (implementation agent self-verified on wrong population). Triggered V10-1 fix.
  - V9 metrics: pipeline_rows=933, shadow_hard_drops=534 (V8=535, -1), sales_hard_drops=81, territory_hard_drops=104, comp_hard_drops=1, yoe_hard_drops=148, location_hard_drops=361. Baseline SHA preserved.
  - Files added: `docs/audits/2026-05-06-production-filter-refinement-v9-summary.json`, `docs/audits/2026-05-06-shadow-v8-v9-diff-summary.json`, `docs/audits/2026-05-06-v9-implementation-summary.md`, `docs/audits/2026-05-06-round6-verification-findings.md`, `scripts/v8-v9-diff.mjs`, `scripts/test-v8-v9-diff.mjs`.

- [x] **Round 5 independent verification of V8: 3 territory FPs caught** (2026-05-06, Claude):
  - Verifier agent caught 3 V8 territory FPs: Vercel Pricing PM, Vercel SE AI SDK, XBOW SE AI Systems. Root cause: NA_CITIES_RE granularity asymmetry (full-name NA cities matched but bare US state abbreviations did not). Triggered V9-1 fix.
  - Findings at `docs/audits/2026-05-06-round5-verification-findings.md`.

- [x] **Shadow filter V8 refinement implemented** (2026-05-06, Claude):
  - Plan v2 at `docs/plans/2026-05-06-v8-consolidated-plan.md`; review verdict `REVISE_BEFORE_EXECUTION` → revised → verification `REQUIRES_MINOR_REVISIONS` (line-number citations corrected).
  - **V8-A1 strict-NA territory gate**: drops the `AND sales-context` clause from V7-A3. Reason renamed `non_na_territory_with_sales_context` → `non_na_territory`. Token list expanded with 13 countries + ~20 non-NA cities + symmetric NA cities. `recognizedTypes` extended to include `location` (was previously dead-text on dedicated Location sections). `SECTION_ALIASES` extended for "Your Impact" / "Day-to-Day" / "Job Details" / "The Position" / "Your Mission" / "About this Role" / "Where you'll work" / "What You'll Drive" / "What we offer" / "What You'll Get". Role-anchor pattern layer added (additive). Body-tie disambiguation uses anchor count when anchor fires, falls back to V7's UNKNOWN-on-tie when no anchor fires. Result: 7 → 101 territory drops; 0 silent regressions; sample-verified all 101 are genuinely non-NA roles per Will's strict-NA policy.
  - **V8-A2 hardSalesTitleRe extended** with director-level alternations and Regional Sales family. Mostly defense-in-depth (most director titles already drop on `senior_title` via `classifyLevel`); 0 new pipeline drops surfaced (Will's portal/title filters already exclude director titles upstream).
  - **V8-A3 Customer Success Manager rule** with AI/Engineer/Architect/Solutions/Forward Deployed/Technical/Implementation/Onboarding carve-out. Customer Success Engineer doesn't drop because the regex shape requires Manager/Director/Lead/Head as the noun.
  - **V8-A4 Workday source-hygiene rule**: rows where URL matches `myworkdayjobs.com`, body length < 1500, body starts with the localized language list route to Source Repair with `workday_language_switcher_chrome` reason. Audit-driven; report at `docs/audits/2026-05-06-v8-source-hygiene-audit.md`. Net 0 source_repair routing change because all such rows were already routing via V7's `page_not_found_or_closed_cache` rule; rule retained as defense.
  - **V8-B1 fixtures**: V7's 50 fixtures updated in place with `revised_in: ["V7→V8"]` audit trail (renames + 2 newly-V8-dropping rows: F-012 ElevenLabs Oceania, F-027 H2O AI Engineer); 10 new V8 fixtures added (4 Round 4 named cohort + 6 synthetic V8 case studies). Total 60/60 pass.
  - **V8-B2 adversarial fixtures**: 17 new cases added to `scripts/test-job-fit-rules.mjs` (`Location: London` header, multi-region tie, anchor body-base, Hybrid Toronto Canada, Account Director, Account Director AI, Customer Success Manager pure / AI Platform / AI Strategy / AI Implementation, Customer Success Engineer regex shape, Renewals Manager, Customer Onboarding Manager negative, Senior CSM, Director of Marketing negative, Engineering Director negative, Regional Sales Manager genuinely-new). Total 136/136 pass.
  - **V8-B3 property tests**: `validHardDropReasons` enum updated for rename. New invariant: `territory_region === "NON_NA"` ⇒ `hard_drop === "yes"` AND reason includes `non_na_territory`. 912 assertions over 100 random rows.
  - **V8-B4 cohort-shape ranges updated**: territory `[16, 25]` → `[85, 120]` (plan undercounted; sample-verified ALL 101 territory drops are legitimate non-NA roles). Other ranges adjusted to match V8 reality.
  - **V7/V8 diff**: `scripts/v7-v8-diff.mjs` + `scripts/test-v7-v8-diff.mjs` (10 tests). Implements **regression-baseline gate** for V7→V8: every flip tagged to V8-A1 / V8-A2 / V8-A3 / V8-A4 / OTHER. Zero unattributed flips.
  - V8 metrics: pipeline_rows=933, shadow_hard_drops=535 (V7=505, +30), sales_hard_drops=81 (V7=80, +1 CSM), territory_hard_drops=101 (V7=7, +94 strict-NA), comp_hard_drops=1, yoe_hard_drops=148, location_hard_drops=361, source_repair_review_rows=184, validation_findings=0. Baseline SHA preserved: `7bfe4ec5...071e`.
  - Files added: `docs/audits/2026-05-06-production-filter-refinement-v8-summary.json`, `docs/audits/2026-05-06-shadow-v7-v8-diff-summary.json`, `docs/audits/2026-05-06-v8-implementation-summary.md`, `docs/audits/2026-05-06-v8-source-hygiene-audit.md`, `scripts/v7-v8-diff.mjs`, `scripts/test-v7-v8-diff.mjs`. New workbooks: `career-ops/output/production-filter-refinement-review-2026-05-01-v8.xlsx`, `career-ops/output/production-filter-refinement-v7-v8-diff.xlsx`.
  - All test suites pass: 1,301 assertions across 11 suites.
  - Documentation cascade: design plan §4.6.2 added; AI_HANDOFF.md updated to V8 state; INDEX registers new files.

- [x] **Shadow filter V7 refinement implemented** (2026-05-05, Claude):
  - Plan v2 at `docs/plans/2026-05-05-v7-consolidated-plan.md` (APPROVE_FOR_EXECUTION verdict; 18/18 sign-off items PASS in `docs/audits/2026-05-05-v7-plan-v2-verification.md`).
  - **V7-A1**: broadened `hardSalesTitleRe` to catch Pre-Sales family (no-hyphen / space-only / specialist / technical / systems variants), Account Manager, AM, Inside/Outside/Enterprise/Territory Sales, BDR/SDR full forms. Closes Deepgram Pre-Sales Solutions Engineer regression from V6.
  - **V7-A2**: replaced bare `\bterritory\b` with literal `\bsales territory\b` in `commercial_ownership` regex. Eliminates country-dropdown false positive ("British Indian Ocean Territory") without flipping Anthropic India/Japan outcomes (they still drop at AI_ENGINEERING threshold without that signal).
  - **V7-A3**: NEW `detectTerritory(title, sections)` function returning NA / NON_NA / UNKNOWN, with section-targeted scanning that defaults UNKNOWN when no recognized sections (responsibilities/requirements). Hard-drop fires when NON_NA AND (hard sales title OR sales evidence). New reason token `non_na_territory_with_sales_context`. New Shadow Decisions columns: `territory_region`, `territory_evidence`, `territory_dropped`. New audit metric `territory_hard_drops`. 7 V7 territory drops (intentionally conservative; gate excludes pure-engineering global-team roles).
  - **V7-A4**: KNOWN_SEEDS typo fix — `generative-al---generalist` → `generative-ai-generalist`; `al-programs-analyst` → `ai-programs-analyst`. Length unchanged (14).
  - **V7-A5**: TAM carve-out preserved at title level so V7-A1's broadened regex doesn't catch "Account Manager" inside "Technical Account Manager"; content path still drops TAM with quota/sales tokens.
  - **V7-B1**: 50-fixture real-data set at `scripts/test-fixtures/v7-realdata-fixtures.jsonl` with stratified sampling (8 sales-legitimate / 6 cohort-survivors / 8 source-repair / 8 reviewer-queue / 8 yoe-comp-loc / 6 score-deltas / 6 adversarial). Test runner `scripts/test-realdata-fixtures.mjs`. 50/50 pass; 3 fixtures have `revised_in: ["V7-A1"]` annotation marking the V7-Ax flip.
  - **V7-B2**: 18 adversarial test cases added to `scripts/test-job-fit-rules.mjs` (94 tests total).
  - **V7-B3**: property tests at `scripts/test-properties.mjs` — 886 assertions over 100 random rows covering type/range/implication/set-membership/determinism/source-repair-contract/family-base-correspondence invariants.
  - **V7-B4**: cohort-shape assertions at `scripts/test-cohort-shape.mjs` — 13 metrics in tightened ranges. Territory range relaxed to [3,30] with explicit comment after V7 produced 7 (below initial [10,30] prediction; gate intentionally conservative).
  - **V6/V7 diff** at `scripts/v6-v7-diff.mjs` + `scripts/test-v6-v7-diff.mjs` (22 tests). Implements **regression-baseline gate**: every V6→V7 hard_drop status flip tagged to V7-A1 / V7-A3 / V7-A5 / OTHER. Zero unattributed flips.
  - V7 metrics: pipeline_rows=933, shadow_hard_drops=505 (V6=501, +4), sales_hard_drops=80 (V6=78, +2), territory_hard_drops=7 (NEW), comp_hard_drops=1, yoe_hard_drops=148, location_hard_drops=361, source_repair_review_rows=184, validation_findings=0. Baseline SHA preserved: `7bfe4ec5...071e`.
  - All test suites pass: jd-sections 8/8, job-fit-rules 94/94, audit 50/50, realdata-fixtures 50/50, properties 886/886, shadow-version-diff 15/15, v5-v6-diff 13/13, v6-v7-diff 22/22, cohort-shape 13/13, enrich-signals 54/54.
  - Generated artifacts: `career-ops/output/production-filter-refinement-review-2026-05-01-v7.xlsx`, `career-ops/output/production-filter-refinement-v6-v7-diff.xlsx`, `docs/audits/2026-05-05-production-filter-refinement-v7-summary.json`, `docs/audits/2026-05-05-shadow-v6-v7-diff-summary.json`, `docs/audits/2026-05-05-v7-implementation-summary.md`.
  - Documentation cascade: design plan §4.6.1 territory subsection added; AI_HANDOFF.md updated to V7 state; this STATUS.md entry; `.collab/INDEX.md` registers all new files.
- [x] **Production filter refinement design drafted and independently reviewed** (2026-05-03, Codex):
  - Created `docs/plans/2026-05-03-production-filter-refinement-design.md` as the current design surface for the next production filter/scoring refinement.
  - Incorporated Will's corrections: Account Executive-only roles should drop; Associate should be restored as low-priority/reviewable; Solutions / Deployment / Architect / FDE should receive the highest base weight; broader AI/generic engineering roles need guarded description-backed handling; genuine remote options should keep with annotation even when hybrid/on-site language is also present.
  - Sagan independently reviewed the draft and the plan was refined to add vendored-code boundaries for `career-ops/scan.mjs`, a guarded-candidate data-flow decision, structured location fields separating annotations from hard drops, remote-region labels, checkpoint artifact paths, and offline regression fixture requirements.
- [x] **Production filter refinement implementation plan drafted and independently reviewed** (2026-05-03, Codex):
  - Created `docs/plans/2026-05-03-production-filter-refinement-implementation.md`.
  - Lorentz independently reviewed the first draft; refinements integrated: shadow-first rollout, no production exporter/config changes before Will approval, custom Greenhouse/Ashby/Lever gated direct-ATS path instead of editing `scan.mjs`, baseline-retained ledger limitation, old-vs-new score distribution, explicit semantic scoring rules, strong-confidence hard-drop schema, multi-candidate compensation parsing, hourly safeguards, and `5+` YoE annotation vs `6+` hard drop.
- [x] **Production filter refinement shadow phase implemented** (2026-05-03, Codex):
  - Added deterministic JD section parser and rule engine: `scripts/lib/jd-sections.mjs`, `scripts/lib/job-fit-rules.mjs`, plus tests.
  - Added offline shadow audit workbook generator `scripts/production-filter-refinement-audit.mjs` and test `scripts/test-production-filter-refinement-audit.mjs`.
  - Generated `career-ops/output/production-filter-refinement-review-2026-05-01.xlsx`, checkpoint ledgers under `career-ops/output/checkpoints/2026-05-01/`, and `docs/audits/2026-05-03-production-filter-refinement-summary.json`.
  - Added gated direct-ATS scan skeleton `scripts/gated-full-scan-v1.mjs` and `scripts/ats-adapters/direct-core-v1.mjs`; default mode is dry-run/no-network and writes only ledgers.
  - Extended `career-ops/enrich-jobs.mjs` signal extraction with currency-before annual comp, hourly annualization, comp metadata fields, and YoE details; fetch behavior and production exporter wiring remain unchanged.
  - Shadow audit metrics: 956 pipeline rows scored; 613 baseline Excel rows preserved; baseline SHA unchanged; 482 shadow hard-drop candidates, including 219 visible baseline rows, 47 sales, 94 comp, 160 YoE, and 304 location hard-drop signals. These are review-first, not production defaults.
  - Follow-up self-audit on 2026-05-04 fixed small plan/implementation mismatches: added missing `classifyTitle()` export, aligned shadow family weights to the written plan, added planned YoE field names, expanded enrichment edge-case tests, and regenerated the shadow workbook/summary.
  - User-sampled bug fix on 2026-05-04 corrected phantom compensation hard drops (travel percentages, URL IDs, funding/customer metrics), escaped Greenhouse salary parsing, YoE lower-bound range logic, 0-2/3/4/5 scoring, reviewer queue hard-drop exclusion, and non-remote specific-location hard drops. Official prior workbook was locked/open, so generated fixed v2 workbook `career-ops/output/production-filter-refinement-review-2026-05-01-v2.xlsx` plus `docs/audits/2026-05-04-production-filter-refinement-v2-summary.json`.
  - V2 shadow metrics: 956 pipeline rows scored; 613 baseline Excel rows preserved; baseline SHA unchanged; 552 shadow hard-drop candidates, including 287 visible baseline rows, 47 sales, 17 comp, 149 YoE, and 316 location hard-drop signals. Reviewer Queue excludes hard-dropped rows.
  - Shadow hardening on 2026-05-04 added workbook-level consistency validation, rejected stale/noisy comp candidates, fixed SpaceX-style multi-level pay ranges, blocked fake remote phrases such as `Remote Hiring Process`, and prevented generic `remote-first company` text from overriding role-specific non-Toronto office requirements. Generated v3 workbook `career-ops/output/production-filter-refinement-review-2026-05-01-v3.xlsx` plus `docs/audits/2026-05-04-production-filter-refinement-v3-summary.json`.
  - V3 shadow metrics: 956 pipeline rows scored; 613 baseline Excel rows preserved; baseline SHA unchanged; 586 shadow hard-drop candidates, including 299 visible baseline rows, 47 sales, 1 comp, 149 YoE, and 401 location hard-drop signals. Validation Findings has 7 review-only findings and 0 blocking findings; `review_ready=true`.
  - Independent reviewer pass on V3 found additional semantic issues: genuine remote roles still being hard-dropped as no-remote, Sales Engineering/pre-sales/OTE rows remaining in Reviewer Queue, and strong AI titles with missing/weak JD evidence falling to UNKNOWN/C.
  - V4 shadow hardening on 2026-05-04 implemented evidence-weighted sales classification, broader genuine-remote variants, role-specific location parsing, extra location coverage (Redwood City/Paris/etc.), and a `Source Repair Review` sheet. Isolated “collaborate with sales” wording does not hard-drop; stacked Sales Engineering/OTE/pre-sales evidence does.
  - Generated v4 workbook `career-ops/output/production-filter-refinement-review-2026-05-01-v4.xlsx` plus `docs/audits/2026-05-04-production-filter-refinement-v4-summary.json`.
  - V4 shadow metrics: 956 pipeline rows scored; 613 baseline Excel rows preserved; baseline SHA unchanged; 543 shadow hard-drop candidates, including 262 visible baseline rows, 115 sales, 1 comp, 149 YoE, and 362 location hard-drop signals. Validation Findings has 6 review-only findings and 0 blocking findings; `review_ready=true`.
  - Independent reviewer pass on V4 found the remaining major issue was source hygiene: page-not-found Workday caches, generic careers/open-position indexes, blog/article pages, cache-missing title stubs, and listing-page contamination were still being treated like valid JDs.
  - V5 shadow hardening on 2026-05-04 routes invalid/non-row-level source text to `Source Repair Review` before scoring/hard-drop logic. It suppresses hard drops from broken/empty/taken-down/retrieval-mismatch source text and includes retained bad-source rows plus known missing seeds in Source Repair Review.
  - Generated v5 workbook `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx` plus `docs/audits/2026-05-04-production-filter-refinement-v5-summary.json`.
  - V5 shadow metrics: 956 pipeline rows scored; 613 baseline Excel rows preserved; baseline SHA unchanged; 514 shadow hard-drop candidates, including 236 visible baseline rows, 108 sales, 1 comp, 148 YoE, 361 location hard-drop signals, and 206 Source Repair Review rows. Validation Findings has 4 review-only findings and 0 blocking findings; `review_ready=true`.
  - Added row-level V3/V4/V5 comparison generator `scripts/shadow-version-diff.mjs` plus test `scripts/test-shadow-version-diff.mjs`. Generated `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx` and `docs/audits/2026-05-05-shadow-version-diff-summary.json`.
  - Version-diff metrics: V3→V4 has 356 changed rows across material fields, 35 hard-drop additions, 78 hard-drop removals, and 0 unmatched rows; V4→V5 has 230 changed rows, 0 hard-drop additions, 29 hard-drop removals, 192 row-level Source Repair movements plus 14 known-missing seed repair rows, and 0 unmatched rows.
  - Validation: calibration tests 19/19, JD parser tests 8/8, rule-engine tests 52/52, production-refinement audit tests 45/45, enrichment tests 54/54, `git diff --check` clean except CRLF warnings.
  - Additional validation: `node scripts\test-shadow-version-diff.mjs` passes 15/15 and verifies row identity, exact hard-drop deltas, Source Repair split, and no unmatched rows.
  - Claude takeover package refreshed on 2026-05-05: `AI_HANDOFF.md` and `RESUME_PROMPT.md` now describe the current shadow-calibration state, V5 workbook, V3/V4/V5 diff workbook, open issues, hard production boundaries, validation commands, and recommended next steps.
  - Multi-agent-collab framework manually upgraded 0.4.1 → 0.4.3 on 2026-05-05. Local framework helpers/templates are now present under `scripts/collab-*.sh`, `scripts/lib/*.sh`, `scripts/migrations/*.sh`, and `templates/`; `.collab/VERSION` is `0.4.3`; `.collab/PROTOCOL.md` was refreshed; `.collab/.migrations/` sentinels and `.collab/UPGRADE_NOTES.md` were written. Codex could not run Bash in the Windows sandbox, so migration was applied manually from the npm tarball with a preservation zip at `.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip`.
- [x] **Offline full-run calibration workbook V1 implemented** (2026-05-03, Codex):
  - Added root generator `scripts/fullrun-calibration-workbook.mjs` and root test `scripts/test-fullrun-calibration-workbook.mjs`.
  - Generated `career-ops/output/fullrun-calibration-2026-05-01.xlsx` and `docs/audits/2026-05-03-fullrun-calibration-summary.json`.
  - Scope stayed offline and analysis-only: no live scraping, production filter/scoring changes, cache mutation, tracker changes, regenerated application workbook, or baseline workbook mutation.
  - Workbook includes the requested sheets for manifest, reconciliation, seed traces, output drops, low-ranked high-intent rows, false positives, role taxonomy candidates, company coverage, rule simulations, reviewer queue, current-board non-baseline seeds, visible location risk, dealbreaker calibration, missing-job root cause, and filter robustness metrics.
  - Counts: scan-history 1,671; pipeline 956; visible Excel 613; pipeline-to-Excel drops 343; normalized Excel URL count observed 581 vs planned expected 586, recorded as a warning; `--strict` fails on that mismatch.
  - Risk-audit metrics: 613 visible rows classified, 479 visible-location risk rows, 150 hard-drop false-negative candidates, and 14/14 seed jobs assigned root-cause labels.
  - Validation: `node scripts\test-fullrun-calibration-workbook.mjs` passes 19/19 and verifies baseline `jobs-2026-05-01.xlsx` SHA preservation.
- [x] **Phase 2.8 CLOSURE EXECUTED** (2026-05-01, `feat/phase-2.8-firecrawl`, commits `fe4663c` → `0db39ae` → `75ec403` → `fa7de8c`, tag `phase-2.8-complete`):
  - **Full 393-company clean rescan** ran 2026-05-01T03:36:40Z onward; 3,552 Firecrawl credits consumed (within 5,000 cap; budget remaining 96,849); output workbook `career-ops/output/jobs-2026-05-01.xlsx` (613 jobs across 154 companies; S=37 / A=370 / B=195 / C=11). 12/12 acceptance criteria pass on full-run metrics.
  - **Scoring policy v2 shipped** in `career-ops/export-jobs.mjs`: S threshold 12→18, AE-only drop with lenient AE-multi keep, intern drop, deal-breaker drop (no longer penalize), Senior/Principal -2→-5. Sales/BD comment group removed from `portals.yml` positives (forward-looking). One-time `pipeline.md` AE-only strip removed 715 rows.
  - **Option A signal-extraction fixes shipped** in `career-ops/enrich-jobs.mjs`: decimal-K comp parser fix (Will's finding — 11 jobs corrected, ~20-pt swing each), expanded anchor list (annual salary / the salary / etc.), strong-pattern fallback ($X,XXX-$X,XXX without anchor), single-value comp extraction, hybrid_non_toronto dealbreaker (with cloud/mesh/fabric tech-context exclusion), proximity-based Toronto check (±200 chars), generic X+ YoE pattern. New `scripts/reextract-signals.mjs` post-processor; gained 626 dealbreaker / 31 comp / 16 yoe signals; corrected 10 comp values. Zero Firecrawl credits.
  - **4 SOURCE_BROKEN companies disabled** per Will's directive: Palo Alto Networks, Grammarly, SiFive, EvenUp. Roster baseline 397/51 → 393/55. Per-company rationale durable in `docs/audits/2026-05-01-source-broken-disables.md`.
  - **Full-run audit tooling built** (Option B): `scripts/full-run-audit.mjs` (~430 lines) re-probes routes via direct adapters, classifies into NO_RELEVANT_JOBS / NO_OPEN_JOBS / ROUTE_MISSING / SOURCE_BROKEN, writes metrics JSON + classification MD matching sample-50 schema. `--metrics <path>` flag added to `scripts/acceptance-audit-phase2.8.py`. 48/48 unit tests pass.
  - **Frontmatter compliance pass**: 4 INDEX-registered .md files (STATUS.md, scripts/ats-adapters/README.md, scripts/portals-triage-proposed-fixes.md) gained YAML frontmatter so the framework can index efficiently without reading full content. AI_HANDOFF.md and RESUME_PROMPT.md overwritten with closure-state pickup. `.gitignore` captures `scripts/sample-50-list.yml`. `docs/design/scraping-architecture.md` carries Phase 2.8 closure note. `docs/design/companies-roster.md` regenerated for 393/55. `AI_AGENTS.md` roster + audit-tooling commands updated.
  - **D-21 records the closure decisions** with full empirical evidence + implementation impact + tradeoffs.
  - **Final acceptance audit** (full-run metrics): source resolved 385/393 (98.0%); source health 385/385 (100%); miss class 213/213 (100%); AC-3 generic loc OR comp 664/956 (69.5%); AC-11b fallback 33/956 (3.5%); 12 PASS / 0 FAIL.
- [x] **Phase 2.8 implementation Steps 0-5 EXECUTED** (2026-04-29 → 2026-04-30, `feat/phase-2.8-firecrawl`, commits e721305 → 8c4a443):
  - **Step 0** — portals.yml URL triage: 428→388 enabled (40 user-approved disables/updates including 7 acquisitions, 1 defunct, 30 manual-review auto-disables, 2 user-flagged drops). Triage script + apply-fixes script + report. Commits e721305, 631cd87, aff12fc.
  - **Step 1** — `lib/firecrawl.mjs` SDK wrapper: scrape/scrapeJson with cost tracking, --max-credits cap, AC-11a fallback queue wiring, retry+backoff. **8/8 unit tests pass.** Live test: 167 markdown chars, 1 credit. Commit 8f25673.
  - **Step 2** — `lib/ats-clients.mjs` 8-provider library: GH/Ashby/Lever (duplicated per D-3) + new Workday CXS, SmartRecruiters, Personio (XML), Recruitee, Workable. **9/9 integration tests pass. Workday CXS pagination CONFIRMED** (40 jobs across 2 pages). Commit 68335e5.
  - **Step 3** — 5 sibling adapters per D-15: workday-cxs, smartrecruiters, personio, recruitee, workable in repo-root `scripts/ats-adapters/`. Plus run-all.mjs orchestrator + README documenting JazzHR exclusion (AC-9). QI-1 RESOLVED. Commit 8ac3283.
  - **Step 4** — `firecrawl-discover.mjs` Layer 1: scrape with formats:[html,links], detect 8-provider markers, drill 1-2 levels deep on /careers /jobs links, RI-4 ambiguity resolution with Levenshtein company-name agreement, 60-day TTL. **11/11 tests pass.** Live: Cloudflare drill→greenhouse/cloudflare. Commit df51a68.
  - **Step 5** — sample-50 smoke validation: 37/50 (74%) coverage = +2.85x Phase 2.7 baseline (was 13/50 = 26%). 161 Firecrawl credits spent (0.16% of 101k budget). Restored live state cleanly. Cached-discovery adapter pattern emerged → extended ATS adapters from 5 to 8 (D-19); +225 jobs from cache-only adapters. Commit 5b5fcf9.
  - **Jasper safeEncode fix** — addressed P-4 URL double-encoding (commit 8c4a443).
- [x] **3 bugs surfaced during Step 5 inspection** — documented in `.claude/memory/pitfalls.md` for Codex to fix in next session:
  - **P-4 — URL double-encoding** (FIXED commit 8c4a443).
  - **P-5 — resolveAmbiguous candidate dedup** — would auto-resolve 4 of 6 ambiguous cases (Cadence / F5 / Monolithic Power / Tokyo Electron) lifting AC-2 from 74% to 82%.
  - **P-6 — Greenhouse `embed` synthetic slug** — Vectra AI / Zipline incorrectly resolved to slug "embed" (the JS library URL); fix via regex update.
- [x] **Codex P-7/P-8/P-9 bug-fix pass completed** (2026-04-30, handoff `20260430-112119-cee0`):
  - **P-7 fixed** — cached-discovery adapters now filter cache targets to current `portals.yml` enabled companies; regression test added.
  - **P-8 fixed** — Ashby detection now covers `embed.ashbyhq.com` and posting API URLs; direct Ashby probing recovers Ramp (119 jobs) and Supabase (46 jobs), including Firecrawl-failure fallback.
  - **P-9 fixed** — Layer 2 promotes a single ATS detected in extracted `jobs[].url` values back into discovery cache.
  - **Additional Codex fix** — `firecrawl-extract.mjs` no longer walks stale no-ATS cache rows outside the current enabled portals list.
  - **True sample-50 result** — 27/50 companies produced ≥1 title-matching job (172 jobs); routing/discovery was 29/50. Treat the expected 45-50/50 as disproved for post-title-filter job-yield coverage until Claude separates routing coverage from job-yield coverage.
- [x] **Codex Step 0 disabled-company re-audit completed** (2026-04-30):
  - Re-audited all 40 companies disabled by Phase 2.8 Step 0 and wrote `docs/audits/2026-04-30-step0-disabled-company-audit.md` as the durable source of truth.
  - Restored 9 high-confidence false disables in `career-ops/portals.yml`: Galileo AI, VAST Data, Grammarly, Thinking Machines Lab, OpenEvidence, Aurascape, Fathom, Skild AI, and Qdrant.
  - Clarified the remaining false-positive-but-held disables with explicit `held disabled 2026-04-30` notes so future agents do not confuse "disabled" with "dead company."
  - New roster baseline: **448 total / 397 enabled / 51 disabled**.
- [x] **Codex baseline reconciliation cleanup completed** (2026-04-30):
  - Updated `AI_AGENTS.md` so the shared front-door context names **397 enabled / 51 disabled** as current and preserves 428/388 as historical milestones.
  - Regenerated `docs/design/companies-roster.md` from live `career-ops/portals.yml`; it now shows **448 total / 397 enabled / 51 disabled** and includes frontmatter + audit cross-link.
  - Guarded historical `scripts/portals-apply-triage-fixes.py` behind `--allow-historical-rerun` so it cannot casually replay the superseded 388-enabled roster.
- [x] **Step 9 Firecrawl dashboard caps documented** (2026-04-30):
  - User supplied plan caps: plan `free`, monthly credits `0`, credits remaining `100401`, scrape RPM `10/min`, crawl RPM `1/min`, concurrent requests `2`.
  - Wrote gitignored `career-ops/data/firecrawl-plan-caps.tsv`; AC-10 now passes.
- [x] **Step 10 full sample-50 verification run completed** (2026-04-30):
  - Ran transactional sample-50 full pipeline (scan → discover → adapters → extract → enrich → export), restored live `portals.yml`, `pipeline.md`, `scan-history.tsv`, `applications.md`, fallback queue, and live output workbook afterward.
  - Preserved sample review workbook at `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx` and audit at `docs/audits/2026-04-30-step10-sample50-results.md`.
  - Result: 28/50 companies with title-filtered exported jobs, 178 jobs total, S=7/A=58/B=111/C=2, 383 Firecrawl credits used during the run.
  - AC-3 passes after additive `location_raw` extraction and comp parser fix: generic location-or-comp signal 126/178 (70.8%); Will-fit location-or-comp remains 26/178 (14.6%).
  - AC-11b passes: fallback queue grew by 0 rows; Layer 3 custom-scraper skipped on the normal run.
  - AC-2 was reconciled into source-accounting metrics in `docs/audits/2026-04-30-sample50-missed-company-classification.md`: source resolved 38/50 (76.0%), source health 37/38 (97.4%), raw job availability 36/37 (97.3%), miss classification 22/22 (100.0%), relevant job yield report-only 28/50 (56.0%).
  - Seagate Workday CXS is classified as `SOURCE_BROKEN`: CXS returned HTTP 422 and direct Workday HTML returned a maintenance page during probe.
- [x] **Phase 2.8 implementation plan v2 — Codex review integrated** (2026-04-29, `feat/phase-2.8-firecrawl`): D-18 documents integration. All 5 ⚠ Issues ACCEPTED (path/cwd mismatch, inconsistent cwd, full-scan dry-run support, Layer 3 fallback contract, source-precedence stale wording); 1 of 2 ❓ Questions ACCEPTED (HEAD+GET fallback); 1 DEFERRED (cp+overwrite kept); 2 💭 Optional ACCEPTED (RI-4 ambiguity rewrite, Workday CXS pagination test). Implementation plan v2 changes: §0 precedence rewritten with verification report as priority 1; new §0a command-cwd convention; Step 0 HEAD+GET fallback; Step 1/4/6/7 Layer 3 fallback queue wiring; Step 2 Workday pagination test; Step 8 new `scripts/full-scan-orchestrator.mjs` replaces plain npm chain (supports `--dry-run`/`--list` + post-run Layer 3 fan-out); AC-11 split into AC-11a (wired) + AC-11b (used); RI-4 ambiguous slug resolution rewritten with company-name agreement gate; QI-1 RESOLVED (sibling adapters at repo-root `scripts/ats-adapters/`). Decisions addendum Q-FC-1 baseline marked HISTORICAL/SUPERSEDED.
- [x] **Phase 2.8 implementation plan v1 written** (2026-04-29, commit 7d67b2b): `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` — 12 sections covering pre-flight checks, branch+commit strategy, 12 ordered steps (URL triage → lib/firecrawl → lib/ats-clients → 5 sibling adapters → firecrawl-discover → smoke validation → firecrawl-extract → enrich-jobs Firecrawl-first refactor → wire full-scan → dashboard rate-cap manual gate → sample-50 verification → AC audit → Phase 2.6 readiness signal), per-step verification gates + rollback procedures, RI-1..RI-8 implementation risks, QI-1..QI-5 deferred decisions, reviewer checklist for optional Codex re-review.
- [x] **Phase 2.8 design v2 — Codex review integrated** (2026-04-29, `feat/multi-agent-collab`):
  - Codex reviewed Phase 2.8 design via handoff `20260429-164715-2bcf`; surfaced 5 ⚠ Issues + 3 ❓ Questions + 2 💭 Optional improvements in `docs/plans/2026-04-29-firecrawl-pivot-design.md` §11
  - Each Codex point verified against primary sources (verification doc + D-14/D-15) before integration; no performative agreement
  - All 10 points ACCEPTED; design plan revised in-place to revision: v2
  - §0 source-of-truth precedence note added (verification doc + D-14..D-17 supersede earlier baseline-knowledge sections); §4.1 Layer 0 box rewritten for 8-provider tier; §4.1.1 ATS provider matrix added; §4.2 file list expanded with 5 sibling adapters; §4.3 "Decision pending" removed (D-3 invariant locked); §5 cost model fully rewritten with mode-split matrix (markdown 1cr / JSON 5cr / direct API 0cr / interact / extract excluded); §5.3 60-day TTL with fast-fail; §5.4 dashboard rate-cap manual gate; §5.5 `--max-credits` cap; §6 migration sequence expanded to 12 steps; §7 acceptance criteria expanded from 6 placeholder to 11 final ACs; §8 FC-R2 reworded to use modern `formats:["json"]+jsonOptions` shape; §9 all 4 Q-FC questions marked RESOLVED; §10 historical note added (smoke-test scripts deleted in 626e1ce); §12 Claude's reconciliation table added documenting disposition of each Codex point
  - D-17 recorded in `.claude/memory/decisions.md` documenting the full integration; D-14 inline-corrected for the firecrawl-enrich → firecrawl-extract naming typo and the rate-cap claim softened
  - `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` Q-FC-4 rewritten to be unambiguously pure Firecrawl-first (matches user's stated principle "Firecrawl first, custom code as backup"); HTTP fallback purely for outage-resilience, NOT cost-routing
- [x] **Phase 2.8 design + verification EXECUTED** (2026-04-29, `feat/multi-agent-collab`):
  - Firecrawl smoke test on 5 URLs (Jasper, SiFive, Expedia, Cloudflare, Shopify) confirmed Firecrawl handles SPA branded pages — most "broken" companies actually use known ATSes (Ashby, Workday, Greenhouse) hidden behind marketing landing pages
  - Phase 2.8 design plan written: `docs/plans/2026-04-29-firecrawl-pivot-design.md` (commit 0f9421a) — 4-layer architecture (direct-API → Firecrawl discover → Firecrawl extract → custom-scraper fallback), 5 risks, 9 acceptance criteria, 4 open design questions
  - Phase 2.8 decisions addendum written: `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (commit d8e3921) — answers all 4 open questions; same commit added "Web research" project rule to root CLAUDE.md (state intent + wait for signal before web fetches)
  - Verification research executed via forked agent: `docs/design/2026-04-29-firecrawl-ats-verification.md` — 12 baseline-knowledge claims verified against primary sources (Firecrawl docs, ATS provider docs). 3 corrections + 5 newly-verified public ATSes surfaced
  - Decisions D-14 (Firecrawl pivot architecture), D-15 (API-direct tier expansion to 8 ATSes), D-16 (project rules: web research authorization + surface uncertainty over baseline knowledge) recorded
  - INDEX registers all 3 new artifacts (design plan, decisions addendum, verification research)
  - Material findings: (a) Workday CXS endpoint is API-accessible without auth — biggest single unlock; (b) JSON-mode scrape is **5 credits/page**, not 1; (c) `/v1/scrape` with `formats:["html","links"]` is right tool for ATS discovery, NOT `/v1/map`; (d) 5 additional ATSes have public no-auth APIs (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable); (e) 6 others need auth/HTML scraping (iCIMS, BambooHR, Pinpoint, Teamtailor, Phenom, Jobvite); (f) 30→60 day TTL on ATS discovery cache with fast-fail re-discovery on 4xx/5xx
- [x] **Phase 2.7 implementation EXECUTED end-to-end** (2026-04-29, `feat/multi-agent-collab`, commits a13b9a5 → 9ff216a):
  - Step 0: Sample size 100→50 + advisor's cp+overwrite-and-restore + coverage caveat
  - Step 1: portals.yml audit cleanup → **448 total / 428 enabled / 20 disabled / 0 missing notes**
  - Step 2: title_filter rewrite — 3 senior positives removed, 8 negatives added (Senior, Sr, Sr., Principal, Junior, Jr, Jr., Associate), CREATIVE/GEN-AI YAML groups split per Codex §17 finding
  - Steps 3+4: All 6 archetypes → Mid-level; `_profile.md` Target IC band header + hands-on/implementer reframing
  - Step 5: `docs/design/companies-roster.md` auto-generated from portals.yml
  - Step 6: `career-ops/enrich-jobs.mjs` built — 19/19 unit tests pass on `extractSignals`; live single-URL test verified cache works (Imbue, tier1-http 200 in 0.5s)
  - Steps 7+8: `career-ops/export-jobs.mjs` refactored — 6 new columns in Pending Jobs (Match Track, Title Score, Desc Score, Pre-Score, Band, Score Notes) + 3 in By Company (Pre-Score Max/Avg, S-Tier Count) + 3 CLI flags (`--top N`, `--skip-enrich`, `--cache-warn-threshold P`) + per-row band fills (S=green/A=yellow/B=grey/C=red); `npm run full-scan` chain extended: scan→custom-scrape→enrich→export
  - Step 8.5: Sample run on 50 random enabled companies (seed=42); 94 jobs scraped via cp+overwrite-and-restore (NEVER mv-swap); 88/94 cache hits (93.6%); live state restored cleanly (git diff shows no changes to portals.yml/pipeline.md/scan-history.tsv)
  - Step 11: INDEX registers all new artifacts; `scripts/acceptance-audit.py` runs all 18 design §12 criteria — **18/18 PASS**
  - Skipped per user direction: Step 9 calibration pass
- [x] career-ops cloned at `career-ops/` — on main, clean, npm deps installed
- [x] Knowledge bank ingested (`context/knowledge bank/` — 5 folders, 12+ files)
- [x] Companies source loaded (`context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 companies source)
- [x] CLAUDE.md, `.claude/rules/pipeline.md`, `.claude/rules/architecture.md` created
- [x] Project memory bootstrapped
- [x] **Phase 1 complete** — cv.md, config/profile.yml, modes/_profile.md, portals.yml (448 companies: 416 enabled, 32 disabled), data/ initialized (commit 8b847c9)
- [x] Scoring criteria refined — Canadian on-site rules, US remote-only, comp bands (commits d4ecf6f, 5ef75ad)
- [x] `docs/design/pipeline-flow.md` created and committed — 7-section technical reference
- [x] `docs/design/scraping-architecture.md` updated — ATS Discovery Layer section added
- [x] **`custom-scraper.mjs` built** — 3-tier ATS discovery (commit a168147):
  - Tier 1: plain fetch + HTML regex (Greenhouse/Ashby/Lever/Workday patterns)
  - Tier 2: Playwright XHR intercept for JS-rendered ATS widgets
  - Tier 3: generic DOM fallback (cheerio + Playwright)
  - Cache: `data/ats-discovery-cache.json` (30-day TTL, portals.yml never mutated)
  - Tested: Runway dry-run → Tier 2 found Ashby, 4 offers extracted
- [x] `package.json` npm scripts — `custom-scrape`, `full-scan` added; `cheerio` dep added
- [x] portals.yml URL data quality fix — 22 URL corrections + 17 disables (39 total), Runway-adjacent pattern fixed across all groups (commit 3429bfa)
- [x] **portals.yml title_filter expanded** (commit 7cb60ab):
  - Seniority: Staff, Lead, VP/SVP/EVP, Director, Head of, Chief, Managing Director, General Manager
  - Region: 42 keywords (Europe, APAC, LATAM, Middle East) — catches titles with location suffix
  - Language: 16 adjectives (German, French, Spanish, etc.) — covers both "German speaking" and ", German" formats
  - Removed conflicting positives: "Staff AI", "Staff Product Manager", "Group Product Manager"
- [x] **First scan.mjs run** — 1406 jobs tagged as `scan-v1-unfiltered` (commit 06bf430)
  - ⚠️ This data is stale: produced against old portals.yml before URL data quality fix
  - Some company associations may be incorrect (wrong ATS slugs); treat as "before" baseline only
  - Tagged `scan-v1-unfiltered` for diff comparison after clean rescan
- [x] **`export-jobs.mjs` built** — 3-sheet Excel export (commit c6c1fd8):
  - Sheet 1: Pending Jobs, Sheet 2: By Company, Sheet 3: Scan History
  - `exceljs` dep + `npm run export` script added
- [x] `.claude/project-memory.md` created — architecture decisions and known issues
- [x] **Phase 2.7 design plan committed** (2026-04-28, `feat/multi-agent-collab`):
  - `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` — 16 sections covering portals.yml audit cleanup, mid-level profile pivot, sequential lock, pre-scoring scheme (title + description), description enrichment design
  - Locked decisions: D-7 (mid-level pivot), D-8 (sequential), D-9 (pre-scoring), D-10 (enrichment design), D-11 (audit cleanup 428/20)
  - Cross-doc propagation done: `AI_AGENTS.md` Project Context, `.claude/memory/{context,decisions,state}.md`, work log
  - Awaiting Codex review per the framework's design-review flow
- [x] **portals.yml audit completed** (2026-04-28):
  - Audited all 32 disabled companies; classified 16 as duplicate-suppression (correct), 14 as mis-drops (no exclusion reason), 2 as universal-exclusion (NVIDIA HW, Saronic defense)
  - Identified 2 inversions: Foxconn rank 65 (HW) and Skydio rank 437 (defense) currently enabled but should be disabled
  - Final inventory committed in design plan: 448 total / **428 enabled / 20 disabled** with explicit `note:` on every disabled row
  - ATS distribution post-cleanup: **18 direct** (Greenhouse 8 + Ashby 7 + Workday 3) + **410 branded**. Two re-enabled companies have direct ATS URLs: Labelbox (Greenhouse) and Genmo (Ashby). Earlier draft said 17/411; corrected after Codex review of design plan.
- [x] **Multi-agent-collab v0.4.1 framework installed** (2026-04-28, branch `feat/multi-agent-collab`):
  - Skill drop-in at `~/.claude/skills/multi-agent-collab` (commit `ebd67b8`, v0.4.1)
  - Bootstrapped via `collab-init.sh --agent claude` from repo root (fresh mode)
  - Created: `.collab/{VERSION,ACTIVE,INDEX,ROUTING,PROTOCOL,config.yml,agents.d/claude.yml,archive/}`, `AI_AGENTS.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `.claude/memory/{state,context,decisions,pitfalls}.md`, `docs/agents/claude.md`
  - Migrated content: full project context → `AI_AGENTS.md` `## Project Context` (outside framework markers, preserved on re-init); 5 architectural decisions + 3 pitfalls + 4 durable truths from old `.claude/project-memory.md` → core-five memory split; archived original to `.claude/archive/project-memory-pre-collab-2026-04-28.md`
  - Root `CLAUDE.md` rewritten as `@import` shim (`@AI_AGENTS.md` + `@.claude/CLAUDE.md`)
  - `collab-check`: `OK: INDEX and filesystem aligned`
  - Codex onboarding deferred — user triggers `--join codex` from a Codex session

## In Progress / Up Next
- [ ] **SHADOW REVIEW NEXT:** Will reviews `career-ops/output/production-filter-refinement-review-2026-05-01-v2.xlsx`, especially `Hard Drop Review`, `Score Deltas`, `Reviewer Queue`, and `Known Missing Seeds`. The 552 shadow hard-drop candidates must be sampled before any production wiring.
- [ ] **CALIBRATION REVIEW NEXT:** Will reviews `career-ops/output/fullrun-calibration-2026-05-01.xlsx`, especially `Visible Location Risk`, `Dealbreaker Calibration`, `Missing Job Root Cause`, `Filter Robustness Metrics`, `Reviewer Calibration`, and `Rule Simulation`, before approving any production filter/scoring changes.
- [ ] **HUMAN-SIDE NEXT:** Will manually reviews `career-ops/output/jobs-2026-05-01.xlsx`; marks `Push Decision` column with P1 / P2 / P3 / SKIP / (blank); optional `Will Notes` for free-form rationale. Hand back when ready.
- [ ] **PIPELINE NEXT (post manual review):** generate per-row TSVs in `career-ops/batch/tracker-additions/` from marked Excel, run `node merge-tracker.mjs` from `career-ops/`, optionally run per-job evaluator on P1 batch.
- [ ] **PHASE 3 candidate menu** (Will picks; no work scheduled):
  - **Candidate A — LLM evaluation pipeline integration** (per old roadmap)
  - **Candidate B — Calibration round** (after Will's first manual review feedback)
  - **Candidate C — Delta detection** (deferred from pre-rescan review)
  - **Candidate D — SOURCE_BROKEN cache refresh** (re-discover any of the 4 disabled companies if reconsidered)
  - **Candidate E — NO_RELEVANT_JOBS roster cleanup** (39 hardware/clinical companies — KLA, Marvell, Cadence, NXP, Intel, etc.)

## Blockers
**None.** Phase 2.8 is closed and durable. All gates pass. Manual review/calibration/shadow-rule review is human-side, not pipeline-side. Current working tree contains uncommitted calibration/refinement implementation artifacts plus pre-existing local framework/settings changes.

## Active Plan
**Phase 2.8 plans frozen as historical:** `docs/plans/2026-04-29-firecrawl-pivot-design.md` + `-implementation.md`. **Current architecture:** `docs/design/scraping-architecture.md` (carries Phase 2.8 closure note). **Current next-phase plans:** `docs/plans/2026-05-03-production-filter-refinement-design.md` and `docs/plans/2026-05-03-production-filter-refinement-implementation.md`. Shadow implementation exists and awaits Will review before production exporter/config/default scan changes.

## Handoff Note
**V10 PRODUCTION WIRING SHIPPED + Phase 1 cleanup landed.** Tag `production-v10` on `main` (merged from `feat/phase-2.8-firecrawl`, pushed to origin). Full rescan ran 2026-05-08; Will manually reviewed and surfaced 4 defects + 1 feature request (Mistral Paris kept-when-should-drop, Inspur non-career URL, missing Reviewer Queue sheet, general FP/FN concern, research-role exclusion). Phase 1 cleanup landed (D-24): Reviewer Queue sheet added (88 rows), title_filter negatives expanded with Research/Researcher/Scientist/Theoretical/Theorist, AI Research Engineer removed from positives, Inspur disabled (392/56 baseline), Layer 0 defense-in-depth filters added. Workbook regenerated at `career-ops/output/jobs-2026-05-09.xlsx` — 238 kept, S=45/A=91/B=81/C=21, Mistral Paris verified routed to Reviewer Queue. **Next agent action: Candidate A — Will picks 5-15 URLs from cleaned workbook for LLM evaluation via `/career-ops oferta`.** Phase 2 (V11 rule library refinement: extractRawLocations city list, detectTerritory header tokens, detectSourceHygiene non-job marketing heuristic) parked as Candidate D. Conservative R2 path still pre-drops 370 hybrid_non_toronto; consider tightening after more manual review. Next agent picking up: read `AI_HANDOFF.md` → `.claude/memory/state.md` → this file. Local-only files NOT committed (intentional): `.claude/settings.local.json`, `docs/audits/*test*.json`, `career-ops/tmp-extract-territory.mjs`, `tmp-v9-review/`.
