---
status: active
type: handoff
owner: claude
last-updated: 2026-05-08T00:00:00-04:00
read-if: "you are Claude or another AI agent picking up the V10 production-wiring work"
skip-if: "status != active"
related:
  - RESUME_PROMPT.md
  - docs/STATUS.md
  - docs/agents/claude.md
  - .claude/memory/state.md
  - .claude/memory/decisions.md
  - .claude/memory/pitfalls.md
  - docs/plans/2026-05-03-production-filter-refinement-design.md
  - docs/plans/2026-05-03-production-filter-refinement-implementation.md
  - docs/plans/2026-05-05-v7-consolidated-plan.md
  - docs/plans/2026-05-06-v8-consolidated-plan.md
  - docs/audits/2026-05-07-v10-implementation-summary.md
  - docs/audits/2026-05-07-round7-verification-findings.md
  - docs/audits/2026-05-07-production-filter-refinement-v10-summary.json
  - docs/audits/2026-05-07-shadow-v9-v10-diff-summary.json
---

# AI Handoff — Shadow Filter Calibration CLOSED at V10, Production Wiring Next

This handoff supersedes V8. The V1→V10 shadow filter calibration arc is **CLOSED**. Round 7 independent verification returned `V10_READY_FOR_PRODUCTION_WIRING`. Will manually reviewed the V10 workbook on 2026-05-07 and approved. Four checkpoint commits landed before the session ended (`d73638b` → `17251c8` → `7dd512e` → `2f5382b`). Phase 2.8 baseline preserved at tag `phase-2.8-complete`.

The next agent action is **production wiring** — porting V10 rules into `career-ops/export-jobs.mjs` so the daily pipeline produces V10-quality output instead of the 2026-05-01 baseline policy.

## Current State

- Repo: `D:/Projects/career ops`
- Branch: `feat/phase-2.8-firecrawl` (4 fresh commits ahead of `705d446`).
- Baseline run: 2026-05-01 full-scale scan (393 enabled companies, 3,552 Firecrawl credits).
- Baseline workbook: `career-ops/output/jobs-2026-05-01.xlsx` — must remain unchanged.
- Baseline SHA preserved: `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`.
- Production status: **unchanged**. `career-ops/export-jobs.mjs`, `career-ops/portals.yml`, `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/cv.md`, default `npm run full-scan`, caches, and tracker data are all untouched. Wire only with Will's explicit go.
- Active artifact (manual-reviewed and approved): `career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx`
- V9/V10 row-level diff: `career-ops/output/production-filter-refinement-v9-v10-diff.xlsx`
- Historical diffs preserved: V7-V8, V6-V7, V5-V6, V3-V4-V5 workbooks all present in `career-ops/output/`.

## What We Were Trying To Solve

The 2026-05-01 Phase 2.8 closure Excel still contained roles that should have been filtered:
- Pre-Sales / Solutions Architect / FDE roles wrongly hard-dropped under V6's broad sales rule (policy-2 violation).
- AE / AM / Director-of-Sales roles slipping through despite Will's no-AE policy.
- Non-NA market territory sales roles surviving despite Will's "Toronto-remote only" deal-breaker.
- Customer Success Manager mis-flagged as sales-hard-drop (Will explicitly wants CS Manager preserved).
- Source-hygiene noise (listing chrome, generic careers index, language-switcher pages) treated as if it were JD content.

The shadow filter calibration arc solved all of these in `scripts/lib/job-fit-rules.mjs` + `scripts/lib/jd-sections.mjs` without touching production code.

## Major Decisions Already Made

- **Shadow-first methodology is the contract** for any filter rule change: separate `scripts/lib/` module → versioned audit workbook → plan-review-revise-implement-verify cycle → independent verification round → manual review → only then port to production. Codified as D-22 + as a reusable pattern in `.claude/memory/context.md`.
- **Sales policy 2** (loosened): Pre-Sales / Solutions Architect / FDE family survive; AE / AM / Director-sales / Sales-Lead strict-drop; CSM carve-out (Customer Success NOT sales-hard-dropped).
- **Strict-NA territory policy** (V8+): any non-NA-only sales/SA territory → hard drop, regardless of "global" framing. Multi-region postings with any NA token win ties (default-permissive). Symmetric body-tie guard prevents implicit-anchor false positives.
- **CSM carve-out (V8-A3):** `customer success (manager|director|lead|head)` and `renewals? (manager|specialist|director)` drop UNLESS title contains AI/ML/Engineer/Architect/Solutions/Forward Deployed/Technical/Implementation/Onboarding carve-out. Customer Success **Engineer** doesn't drop (regex shape requires Manager/Director/Lead/Head as noun).
- **NA_CITIES_RE bare-abbrev guard (V9):** US state abbreviations (CA, NY, TX, etc.) only count as NA evidence when paired with a city or "United States"/"USA" anchor. Prevents false NA-classification on multi-region postings that happen to mention US states.
- **V10 spec deviation accepted:** the V10 territory gate is "suppression-only," not "tie → NA promotion." Implementation agent's design call confirmed sound by Round 7. Don't try to "fix" this during wiring.
- **Trimble PM listing-chrome FP is known and deferred** to optional V11. Don't gate production wiring on it.
- **P-10 anti-pattern codified:** implementation agents instinctively self-verify on the *kept* cohort or *location strings* — both are wrong populations for FP detection. The right population is the *newly-dropped* cohort, sampled adversarially. Caught Rounds 5+6; encoded into V10 brief; Round 7 confirmed it worked.

## Key Artifacts

Primary V10 artifact:

- `career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx` (Will manually reviewed and approved 2026-05-07).

Primary code/test files (single source of truth for V10):

- `scripts/lib/job-fit-rules.mjs` — territory detection, sales classification, level classification, NA city regex, role-anchor patterns, FAMILY_BASE registry.
- `scripts/lib/jd-sections.mjs` — JD section parser with extended SECTION_ALIASES.
- `scripts/test-job-fit-rules.mjs` — 1,418 assertions covering rule semantics + adversarial fixtures.
- `scripts/test-jd-sections.mjs`, `scripts/test-properties.mjs`, `scripts/test-cohort-shape.mjs`, `scripts/test-realdata-fixtures.mjs`, `scripts/test-shadow-version-diff.mjs`, `scripts/test-v9-v10-diff.mjs`, `scripts/test-production-filter-refinement-audit.mjs`.
- `scripts/test-fixtures/v7-realdata-fixtures.jsonl` — 66-row fixture set with `revised_in` audit trails.
- `scripts/production-filter-refinement-audit.mjs` — shadow workbook generator.
- `scripts/v9-v10-diff.mjs` — latest version diff (full attribution chain).

Primary V10 closure artifacts:

- `docs/plans/2026-05-06-v8-consolidated-plan.md` (latest plan; V9 and V10 implemented as direct patches without full plan docs).
- `docs/audits/2026-05-07-v10-implementation-summary.md`
- `docs/audits/2026-05-07-round7-verification-findings.md` (verdict: `V10_READY_FOR_PRODUCTION_WIRING`)
- `docs/audits/2026-05-07-production-filter-refinement-v10-summary.json`
- `docs/audits/2026-05-07-shadow-v9-v10-diff-summary.json`
- `docs/audits/2026-05-06-round5-verification-findings.md` (V8 → V9 trigger)
- `docs/audits/2026-05-06-round6-verification-findings.md` (V9 → V10 trigger)
- `docs/audits/2026-05-06-v9-implementation-summary.md`

## Current Metrics (V10 — production target)

- pipeline_rows: 933 (post F-002 dedup, unchanged from V6)
- shadow_hard_drops: **536** (V5=514, V6=501, V7=505, V8=535, V9=534, V10=536)
- sales_hard_drops: **81** (Pre-Sales/SA/FDE survive; AE/AM/Director strict-drop; CSM carve-out)
- territory_hard_drops: **108** (V7=7, V8=101, V9=104, V10=108; NA-rooted strict; multi-region default-permissive; symmetric body-tie guard)
- comp_hard_drops: 1
- yoe_hard_drops: 148
- location_hard_drops: 361
- source_repair_review_rows: 184
- validation_findings: 0
- baseline SHA preserved: `7bfe4ec5...071e`
- 1,418 test assertions pass.

## What Changed By Version

V3:
- Hardened comp parsing against non-salary numbers (travel %, phone codes, poster IDs, funding/customer metrics).
- Added workbook validation findings + contradiction checks.
- Reviewer-agent flagged: genuine remote drops, sales/pre-sales in review queues, strong AI titles under-ranked.

V4:
- Evidence-weighted sales hard-drop classifier.
- Expanded genuine remote recognition + role-specific location parsing.
- Added Source Repair Review sheet (initially empty).
- Reviewer flagged source hygiene as still the major defect.

V5 (Codex, 2026-05-04):
- Source hygiene detector before scoring/hard drops.
- Routes missing cache, page-not-found, generic careers index, generic careers location pages, blog/news/resource pages, listing-page mismatches → Source Repair Review.
- Suppresses hard drops from invalid/non-row-level source text.
- Removes 29 hard drops from V4, adds 0 new hard drops.

V6 (Claude, 2026-05-05):
- Sales policy 2 (F-001): SA/FDE family threshold 4→5; OTE-disclosure boilerplate 3→2; sales_department alone (no corroborator) 4→2; per-label aggregation prevents double-counting.
- F-002 row-identity dedup (scale.com / accel.com / elevenlabs.io listing mirrors → canonical Greenhouse/Ashby URLs by gh_jid / Ashby UUID).
- F-003 Atlassian `/all-jobs?team=` → `generic_careers_index`.
- F-004 example.com hostname blocklist → `placeholder_or_invalid_url`.
- F-009 validation gate: `specific_location_not_in_drop_reason` only fires when `location_reason` contains `non_toronto`.
- Net: pipeline 956→933, hard drops 514→501, sales drops 108→78.

V7 (Claude, 2026-05-05):
- V7-A1 Pre-Sales title regex broadened (closes Deepgram regression).
- V7-A2 commercial_ownership: bare `\bterritory\b` → `\bsales territory\b` (fixes country-dropdown FP).
- V7-A3 territory hard-drop NEW: `detectTerritory(title, sections)` returning NA / NON_NA / UNKNOWN. Conservative gate (NON_NA AND sales-context). 7 drops.
- V7-A4 KNOWN_SEEDS typo fix.
- V7-A5 AE/AM regression suite + TAM carve-out + CSM carve-out (initial).
- Test infrastructure: 50-fixture real-data set, 18 adversarial cases, 100-row property tests (886 assertions), cohort-shape on 13 metrics.
- V6/V7 diff with regression-baseline gate (every flip tagged).

V8 (Claude, 2026-05-06):
- V8-A1 strict-NA territory gate: drops `AND sales-context` clause from V7-A3. Reason renamed `non_na_territory_with_sales_context` → `non_na_territory`. Token list expanded with 13 countries + ~20 non-NA cities + symmetric NA cities. `recognizedTypes` extended to include `location`. `SECTION_ALIASES` extended for "Your Impact" / "Day-to-Day" / "Job Details" / etc. Role-anchor pattern layer added (additive). Body-tie disambiguation via anchor count when anchor fires; UNKNOWN-on-tie fallback otherwise. 7 → 101 territory drops.
- V8-A2 hardSalesTitleRe extended with director-level alternations + Regional Sales family. Mostly defense-in-depth.
- V8-A3 Customer Success Manager rule with 8-token carve-out (AI/ML/Engineer/Architect/Solutions/Forward Deployed/Technical/Implementation/Onboarding).
- V8-A4 Workday source-hygiene rule (audit-driven; net 0 routing change because V7 already caught these via `page_not_found_or_closed_cache`).
- 60 fixtures + 17 adversarial cases + 912 property assertions + 13 cohort-shape metrics. Total 1,301 assertions.

V9 (Claude, 2026-05-06):
- V9-1 NA_CITIES_RE bare-abbrev expansion with guards (US state abbreviations only count when paired with a city or "United States"/"USA" anchor).
- V9-2 role-anchor markdown patterns added.
- Round 6 caught 2 territory FPs (GitLab Eng Mgr AI Workflow Catalog, ElevenLabs FDE) — same anti-pattern as Round 5. Triggered V10-1.

V10 (Claude, 2026-05-07):
- V10-1 symmetric body-tie guard: closes V9 multi-region body-tie FPs by mirroring V9-2's implicit-anchor mechanism on the suppression side.
- Spec deviation: implementation chose "suppression-only" semantics over original "tie → NA promotion" design. Round 7 confirmed sound.
- Round 7 verdict: `V10_READY_FOR_PRODUCTION_WIRING`. 2/2 V9 FPs closed; 3/3 preserved-correct captures (Cohere FDE Infrastructure Specialist, GitLab AI Engineer Bangalore, OpenAI AI Deployment India); 2/3 side-effect adds legitimate; 1 source-hygiene noise (Trimble PM, deferred to V11).
- 1,418 test assertions pass.

## Validation Already Run (V10)

```powershell
node scripts\test-jd-sections.mjs              # passes
node scripts\test-job-fit-rules.mjs            # passes (~150+ tests)
node scripts\test-production-filter-refinement-audit.mjs  # passes
node scripts\test-realdata-fixtures.mjs        # 66/66 (V8=60 + V9 fixtures)
node scripts\test-properties.mjs               # property assertions
node scripts\test-shadow-version-diff.mjs      # passes
node scripts\test-v5-v6-diff.mjs               # passes
node scripts\test-v6-v7-diff.mjs               # passes
node scripts\test-v7-v8-diff.mjs               # passes
node scripts\test-v8-v9-diff.mjs               # passes
node scripts\test-v9-v10-diff.mjs              # passes — V10 regression-baseline gate
node scripts\test-cohort-shape.mjs             # V10 metrics in expected ranges
cd career-ops; node test-enrich-signals.mjs; cd ..  # 54/54
```

Total: **1,418 assertions** across all V10 suites. Baseline SHA preserved.

## Next Recommended Step For Claude (V10 Production Wiring)

1. Read this file, `RESUME_PROMPT.md`, `docs/STATUS.md`, `.claude/memory/state.md`, `.claude/memory/decisions.md` D-22, `.claude/memory/pitfalls.md` P-10.
2. Confirm with Will:
   - Wire on this branch (recommended) or branch `feat/phase-2.9-production-v10` from current head?
   - Tag strategy after wiring: `production-v10` standalone, or also `phase-2.9-complete`?
3. Read `career-ops/export-jobs.mjs` end-to-end before touching it. Identify exactly where to wire each V10 rule (territory, sales classification incl. CSM, level, NA city regex, role-anchor patterns).
4. Check whether `scripts/lib/jd-sections.mjs` SECTION_ALIASES need to be re-exported into `enrich-jobs.mjs` or `export-jobs.mjs` (may already be wired through enrich).
5. Port V10 rules. Smoke test: regenerate today's `career-ops/output/jobs-YYYY-MM-DD.xlsx` with V10 active. Drop counts should be ~536 hard drops on comparable input.
6. Side-by-side diff vs the 2026-05-01 baseline workbook. Confirm V10 deltas are expected (territory + sales + Director + CSM-preserve), not regressions on legitimate roles.
7. Commit + tag `production-v10`.
8. Update `docs/STATUS.md` Done + Handoff Note, `.claude/memory/state.md`, `docs/agents/claude.md` Receipt for the wiring task.
9. Apply P-10 lesson during wiring verification: sample the *newly-dropped* cohort, not the kept cohort, when validating no FPs.

Estimated effort: 1-2 hours. Reversible via `git revert`.

## Open Questions For Will

All shadow-arc questions resolved. Open questions for production wiring:

- **Wire branch:** same branch (recommended — shadow + wire as one phase) vs new branch?
- **Tag strategy:** `production-v10` standalone vs also `phase-2.9-complete`?
- **Smoke-run scope:** regenerate today's pipeline with V10 active for verification, or wait until next `npm run full-scan` cycle?

Phase 3 candidate selection (LLM eval, calibration round, delta detection, V11 source-hygiene, NO_RELEVANT_JOBS cleanup, F-005 enrichment) is also Will's call after wiring lands.

## Hard Boundaries

Do not change these without explicit Will approval:

- `career-ops/export-jobs.mjs` — wiring touches this; needs Will's go.
- `career-ops/portals.yml`
- `career-ops/config/profile.yml`
- `career-ops/modes/_profile.md`
- default `npm run full-scan`
- caches and tracker data
- baseline workbook `career-ops/output/jobs-2026-05-01.xlsx`
- live/current-board scraping behavior

## Known Workspace Notes

- Working tree contains intentional uncommitted files: `.claude/settings.local.json` (local Claude permissions), `.collab-upgrade-backups/` (backup zip from framework upgrade), `tmp-v9-review/` (scratch dir from V9 review), `career-ops/tmp-extract-territory.mjs` (cleanup-pending temp script — safe to delete), `docs/audits/*test*.json` (regenerable test outputs). Do not commit these.
- Multi-agent-collab framework is `0.4.3`; `.collab/VERSION` reflects this. Local helper scripts/templates are present under `scripts/` and `templates/` (committed in `d73638b`).
- `.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip` preserves pre-upgrade state.
- Excel workbooks under `career-ops/output/` are gitignored — handoff artifacts on disk only, not tracked.
- The 4 checkpoint commits before this handoff: `d73638b` (framework upgrade) → `17251c8` (test infra + enrichment patches) → `7dd512e` (audit trail) → `2f5382b` (memory + STATUS).
