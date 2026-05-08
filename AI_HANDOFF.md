---
status: active
type: handoff
owner: claude
last-updated: 2026-05-06T18:00:00-04:00
read-if: "you are Claude or another AI agent taking over the current shadow filter calibration work"
skip-if: "status != active"
related:
  - RESUME_PROMPT.md
  - docs/STATUS.md
  - docs/agents/codex.md
  - .codex/memory/state.md
  - .codex/memory/context.md
  - .codex/memory/decisions.md
  - docs/plans/2026-05-03-production-filter-refinement-design.md
  - docs/plans/2026-05-03-production-filter-refinement-implementation.md
  - docs/plans/2026-05-05-v7-consolidated-plan.md
  - docs/plans/2026-05-06-v8-consolidated-plan.md
  - docs/audits/2026-05-05-v7-implementation-summary.md
  - docs/audits/2026-05-06-v8-implementation-summary.md
  - docs/audits/2026-05-06-v8-source-hygiene-audit.md
  - docs/audits/2026-05-06-production-filter-refinement-v8-summary.json
  - docs/audits/2026-05-06-shadow-v7-v8-diff-summary.json
---

# AI Handoff — Shadow Filter Calibration, V8 + Diff Ready

This handoff supersedes V7. Phase 2.8 is still closed; the active work has
moved through V5 (source hygiene), V6 (sales policy 2 + dedup + validation
gate), V7 (Pre-Sales title regression closure + commercial_ownership hygiene
+ initial territory hard-drop), and now V8 (strict-NA territory + director
sales titles + CSM rule with carve-out + Workday source-hygiene). Nothing has
been wired into production yet.

## Current State

- Repo: `D:/Projects/career ops`
- Branch: `feat/phase-2.8-firecrawl`
- Baseline run: 2026-05-01 full-scale scan
- Baseline workbook: `career-ops/output/jobs-2026-05-01.xlsx`
- Baseline SHA remains unchanged: `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`
- Production status: **unchanged**. Do not wire new rules into `career-ops/export-jobs.mjs`, `career-ops/portals.yml`, profile docs, default `npm run full-scan`, caches, tracker data, or live scan behavior until Will explicitly approves.
- Active artifact to inspect: `career-ops/output/production-filter-refinement-review-2026-05-01-v8.xlsx`
- V7/V8 row-level diff: `career-ops/output/production-filter-refinement-v7-v8-diff.xlsx`
- V6/V7 row-level diff (historical): `career-ops/output/production-filter-refinement-v6-v7-diff.xlsx`
- V5/V6 row-level diff (historical): `career-ops/output/production-filter-refinement-v5-v6-diff.xlsx`
- V3/V4/V5 row-level diff (historical): `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx`

## What We Are Trying To Solve

Will found that the 2026-05-01 output and shadow workbooks could still misrepresent fit because of:

- Relevant jobs missing before scan/history/Excel because of source retrieval, title filter, adapter, or current-board delta issues.
- Good jobs ranked too low because title families and semantic scoring were too narrow.
- U.S./non-Toronto hybrid or on-site jobs surviving when they should be hard drops unless genuine remote is offered.
- Compensation hard-drop labels appearing when no valid salary figure exists, or when high salary ranges were present.
- YoE extraction needing lower-bound logic and hard drops only when the minimum required years are over 5.
- Sales-role hard drops needing to catch true sales/pre-sales/OTE/quota roles while not dropping technical/product roles that merely mention sales collaboration.
- Broken, closed, generic careers, listing, blog, or missing-cache pages being treated as if they were valid job descriptions.
- The need for a row-level version diff explaining exactly what changed from V3 to V4 to V5.

## Major Decisions Already Made

- Work is shadow-first. Generated review workbooks and summaries are allowed; production behavior is not changed yet.
- Explicit sales roles should hard-drop, including Account Executive, AE, quota/closing/revenue/account ownership, Sales Engineering, pre-sales, OTE/commission patterns, and similar strong evidence.
- Weak phrases like `collaborate with sales` or `support sales` alone should not hard-drop.
- Genuine remote options should keep even if hybrid/on-site options are also mentioned. Fake technical uses of `remote` do not count.
- U.S./non-Toronto hybrid/on-site/in-office roles with no genuine remote option should hard-drop.
- Unknown or ambiguous location evidence should be labeled/reviewed, not silently treated as safe.
- Compensation hard-drop policy: only hard-drop when a valid detected USD or CAD upper bound is below 120K. Unknown comp should not hard-drop.
- YoE scoring policy currently implemented in shadow: 0-2 years +5, 3 years +3, 4 years -2, 5 years -6, lower-bound >5 hard-drop. Ranges use the lower bound; multiple requirement lines can hard-drop if any specific requirement minimum is over 5.
- Invalid source text is not fit evidence. V5 routes it to `Source Repair Review` and suppresses sales/YoE/comp/location hard drops from that bad source.
- Row-level diff identity is `normalized_url + normalized_company + normalized_title`, not URL alone, because generic careers URLs can represent many distinct titles.

## Key Artifacts

Primary shadow workbooks:

- `career-ops/output/production-filter-refinement-review-2026-05-01-v3.xlsx`
- `career-ops/output/production-filter-refinement-review-2026-05-01-v4.xlsx`
- `career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx`
- `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx`

Primary summaries:

- `docs/audits/2026-05-04-production-filter-refinement-v3-summary.json`
- `docs/audits/2026-05-04-production-filter-refinement-v4-summary.json`
- `docs/audits/2026-05-04-production-filter-refinement-v5-summary.json`
- `docs/audits/2026-05-05-shadow-version-diff-summary.json`

Primary code/test files:

- `scripts/lib/jd-sections.mjs`
- `scripts/lib/job-fit-rules.mjs`
- `scripts/production-filter-refinement-audit.mjs`
- `scripts/shadow-version-diff.mjs`
- `scripts/test-jd-sections.mjs`
- `scripts/test-job-fit-rules.mjs`
- `scripts/test-production-filter-refinement-audit.mjs`
- `scripts/test-shadow-version-diff.mjs`
- `scripts/fullrun-calibration-workbook.mjs`
- `scripts/test-fullrun-calibration-workbook.mjs`

Design and implementation plans:

- `docs/plans/2026-05-03-production-filter-refinement-design.md`
- `docs/plans/2026-05-03-production-filter-refinement-implementation.md`

## Current Metrics

V8 summary (current state):

- Pipeline rows: 933 (post F-002 dedup, unchanged from V6/V7)
- Baseline Excel rows: 613
- Shadow hard drops: **535** (V5=514, V6=501, V7=505, V8=535)
- Visible shadow hard drops: 249
- Sales hard drops: **81** (V7=80, +1 from V8-A3 CSM rule)
- **Territory hard drops: 101** (V7=7; V8 strict-NA gate dropped sales-context AND clause and expanded
  token list with 13 countries + non-NA cities + role-anchor patterns + `location` recognized type)
- Compensation hard drops: 1
- YoE hard drops: 148
- Location hard drops: 361
- Source Repair Review rows: 184
- Validation Findings: 0 (V6 F-009 gate keeps zero)
- Review-ready flag: true
- Missing seed explainability: 14/14
- New Shadow Decisions columns: `territory_region` (NA / NON_NA / UNKNOWN),
  `territory_evidence` (matched tokens + 50-char snippets), `territory_dropped`

Historical V6:

- Pipeline rows: 933
- Shadow hard drops: 501
- Sales hard drops: 78
- Source Repair: 184; Validation Findings: 0

Historical V5:

- Pipeline rows: 956
- Shadow hard drops: 514
- Sales hard drops: 108
- Source Repair: 206; Validation Findings: 4 review-only

V3/V4/V5 diff summary:

- V3 rows: 956; hard drops: 586
- V4 rows: 956; hard drops: 543
- V5 rows: 956; hard drops: 514
- V3 -> V4: 356 materially changed rows, 35 hard-drop additions, 78 hard-drop removals, 86 hard-drop reason changes, 0 unmatched rows
- V4 -> V5: 230 materially changed rows, 0 hard-drop additions, 29 hard-drop removals, 192 row-level Source Repair movements, 0 unmatched rows
- V5 Source Repair split: 206 sheet rows = 192 retained shadow rows + 14 known-missing seed rows

## What Changed By Version

V3:

- Hardened compensation parsing against non-salary numbers such as travel percentages, phone/country codes, poster IDs, funding/customer metrics.
- Added workbook validation findings and contradiction checks.
- Fixed multi-level salary range parsing and fake remote phrases.
- Still had reviewer-agent concerns around genuine remote drops, sales/pre-sales in review queues, and some strong AI titles under-ranked.

V4:

- Added evidence-weighted sales hard-drop classifier.
- Expanded genuine remote recognition and role-specific location parsing.
- Added more non-Toronto location coverage.
- Added `Source Repair Review` sheet, initially empty.
- Rescued many false location drops but added sales/pre-sales/OTE drops.
- Independent reviewer found source hygiene was still the major defect.

V5:

- Added source hygiene detector before scoring/hard drops.
- Routes missing cache, page-not-found/closed, generic careers/open-position indexes, generic careers location pages, blog/news/resource pages, and listing-page mismatches to Source Repair Review.
- Suppresses hard drops from invalid/non-row-level source text.
- Moves 192 retained rows plus 14 missing seed rows to Source Repair Review.
- Removes 29 hard drops from V4, adds 0 new hard drops.

V6:

- Sales policy 2 (F-001): SA/FDE family threshold raised 4→5; OTE-disclosure
  boilerplate downweighted 3→2; sales_department alone (no corroborator)
  downweighted 4→2; per-label aggregation prevents double-counting.
- F-002 row-identity dedup: scale.com / accel.com / elevenlabs.io listing
  mirrors collapse to canonical Greenhouse/Ashby URLs by gh_jid / Ashby UUID.
- F-003 Atlassian `/all-jobs?team=` listings → `generic_careers_index`.
- F-004 example.com hostname blocklist → `placeholder_or_invalid_url`.
- F-009 validation gate: `specific_location_not_in_drop_reason` only fires
  when `location_reason` contains `non_toronto`.
- Net: pipeline 956→933, hard drops 514→501, sales drops 108→78,
  source repair 206→184, validation findings 4→0.

V7:

- **V7-A1 Pre-Sales title regex broadened** (`scripts/lib/job-fit-rules.mjs`):
  `pre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b`
  catches Presales / Pre Sales / Pre-Sales Specialist / Pre-Sales Technical Engineer.
  Closes the Deepgram regression from V6 (Pre-Sales Solutions Engineer rows).
  Also broadens to `account manager`, `am[\s,]`, `inside/outside/enterprise/territory sales`,
  `bdr|sdr` full-form. TAM carve-out preserved at title level.
- **V7-A2 commercial_ownership hygiene**: bare `\bterritory\b` replaced with
  literal `\bsales territory\b` to prevent false positives on country-dropdown
  text ("British Indian Ocean Territory"). Does NOT flip Anthropic India/Japan
  rows (they still drop at AI_ENGINEERING threshold 4 without that signal).
- **V7-A3 territory hard-drop (NEW)**: `detectTerritory(title, sections)`
  returns NA / NON_NA / UNKNOWN based on title + role-content sections only
  (never whole-body scan). Hard-drop fires when NON_NA AND
  (hard sales title || sales evidence). New `hard_drop_reason` token
  `non_na_territory_with_sales_context`. Tracked separately under
  `territory_hard_drops` metric. 7 rows drop in V7 (intentionally
  conservative gate). See design plan §4.6.1 for full token list.
- **V7-A4 KNOWN_SEEDS typo fix**: `generative-al---generalist` →
  `generative-ai-generalist`; `al-programs-analyst` → `ai-programs-analyst`.
- **V7-A5 AE/AM regression test suite**: 9 cases including TAM carve-out
  (TAM does NOT drop at title level; content drop still possible),
  Customer Success Manager carve-out, AE/AM under SA/FDE family STILL drops.
- **Test infrastructure (V7-B1 → V7-B4)**: 50-fixture real-data set with
  3-tier provenance + revised_in array; 18-case adversarial set covering
  country-dropdown / Pre-Sales variants / Lattice-shape per-label / section-
  failure fallback; 100-row property tests (700+ assertions covering type /
  range / implication / set membership / determinism / source-repair contract /
  family-base correspondence); cohort-shape assertions on 13 metrics with
  loud-fail tolerances.
- **V6/V7 diff workbook + tests** (`scripts/v6-v7-diff.mjs`,
  `scripts/test-v6-v7-diff.mjs`): regression-baseline gate. Every V6→V7
  hard_drop status flip tagged to V7-A1 / V7-A2 / V7-A3 / V7-A5 / OTHER.
  No silent flips. Diff sheet structure includes V7-A1 / V7-A2 / V7-A3
  filtered sheets.

V8:

- **V8-A1 strict-NA territory gate**: drops the `AND sales-context` clause
  from V7-A3. Reason renamed `non_na_territory_with_sales_context` →
  `non_na_territory`. Token list expanded with 13 countries + ~20 non-NA
  cities + symmetric NA cities. `recognizedTypes` extended to include
  `location` (was previously dead-text on dedicated Location sections).
  `SECTION_ALIASES` extended for "Your Impact" / "Day-to-Day" / "Job Details" /
  "The Position" / "Your Mission" / "About this Role" / "Where you'll work" /
  "What You'll Drive" / "What we offer" / "What You'll Get". Role-anchor
  pattern layer added (additive — `\bbased\s+(?:in|out\s+of)\s+...`,
  `\boffice:?\s+...`, `\bopen\s+to\s+candidates?\s+in\s+...`, etc.).
  Body-tie disambiguation: when anchor fires, anchor count majority
  (NA-tie → NA, NON_NA-majority → NON_NA); without anchor, fall back to
  V7's UNKNOWN-on-tie. Result: 7 → 101 territory drops; 0 silent regressions.
- **V8-A2 hardSalesTitleRe extended** with director-level alternations
  (`account director`, `sales director`, `director,?\s+sales`,
  `director\s+of\s+sales`) and `regional sales` family. Mostly defense-in-
  depth (Director-level is already caught by `senior_title` via
  `classifyLevel`); Regional Sales Manager is the genuinely-new case.
- **V8-A3 Customer Success Manager rule** (`csmRe`): drops on
  `customer success (manager|director|lead|head)` and
  `renewals? (manager|specialist|director)` UNLESS title contains an
  AI/ML/Engineer/Architect/Solutions/Forward Deployed/Technical/
  Implementation/Onboarding carve-out token. Customer Success **Engineer**
  doesn't drop because the regex shape requires Manager/Director/Lead/Head
  as the noun (regex-shape consequence, not explicit Engineer carve-out).
- **V8-A4 Workday source-hygiene rule**: rows where URL matches
  `myworkdayjobs\.com`, body length < 1500, body starts with the localized
  language list ("English - English - 简体中文 …") route to Source Repair
  with `workday_language_switcher_chrome` reason. Audit-driven (75-row
  Reviewer Queue sample + 25-row Source Repair precision check); see
  `docs/audits/2026-05-06-v8-source-hygiene-audit.md`.
- **V7/V8 diff workbook + tests** (`scripts/v7-v8-diff.mjs`,
  `scripts/test-v7-v8-diff.mjs`): regression-baseline gate. Every V7→V8
  hard_drop status flip / reason rename tagged to V8-A1/A2/A3/A4 / OTHER.
  Zero unattributed flips. Diff sheets include V8-A1 / V8-A2 / V8-A3 / V8-A4
  filtered views.

## Validation Already Run

V8 commands run and passing (1,301 assertions total):

```powershell
node scripts\test-jd-sections.mjs
# 12/12 (V7=8 + V8 alias additions)

node scripts\test-job-fit-rules.mjs
# 136/136 (V6=58 + V7=36 + V8=42)

node scripts\test-production-filter-refinement-audit.mjs
# 54/54 (V7=50 + V8-A4 Workday tests)

node scripts\test-realdata-fixtures.mjs
# 60/60 (V7=50 with revised_in trails + V8=10 new fixtures including synthetic)

node scripts\test-properties.mjs
# 912/912 assertions over 100 random rows (V7-B3 invariants + V8-B3 NON_NA-implies-drop)

node scripts\test-shadow-version-diff.mjs
# 15/15

node scripts\test-v5-v6-diff.mjs
# 13/13

node scripts\test-v6-v7-diff.mjs
# 22/22 (historical baseline preserved)

node scripts\test-v7-v8-diff.mjs
# 10/10 — V8 regression-baseline gate (every flip tagged to V8-Ax)

node scripts\test-cohort-shape.mjs
# 13/13 — V8-B4 metrics in expected ranges

cd career-ops
node test-enrich-signals.mjs
# 54/54
```

## Next Recommended Step For Claude

1. On pickup, read this file, `RESUME_PROMPT.md`, `docs/STATUS.md`, `.codex/memory/state.md`, `.codex/memory/context.md`, `.codex/memory/decisions.md`, and the latest `docs/agents/codex.md` entries.
2. Inspect `career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx` first. This is the most direct answer to Will's latest request about exactly what changed.
3. Optionally run an independent reviewer pass on V5 and/or the diff workbook if Will asks. The reviewer should behave like Will's manual review: inspect focused sheets, compare decisions to evidence, identify discrepancies, and decide whether the discrepancy is the reviewer's mistake or the workbook/rule's mistake.
4. Do not wire production until Will approves specific rule groups from the shadow workbook.
5. If Will approves, draft a production-wiring plan before touching exporter/config/default scan behavior.

## Open Questions For Will

- Does Will approve the V5 hard-drop candidates as production behavior, or should Claude run another reviewer pass first?
- Should Source Repair Review rows be live-checked in V1.1, or held until a new full scan cycle?
- Should `Remote - US` remain automatically eligible, or be kept with a region/residency annotation?
- Should the diff workbook be reviewed before any further V6 implementation, or should Claude directly run the independent reviewer agent on V5?

## Hard Boundaries

Do not change these without explicit Will approval:

- `career-ops/export-jobs.mjs`
- `career-ops/portals.yml`
- `career-ops/config/profile.yml`
- `career-ops/modes/_profile.md`
- default `npm run full-scan`
- caches and tracker data
- baseline workbook `career-ops/output/jobs-2026-05-01.xlsx`
- live/current-board scraping behavior

## Known Workspace Notes

- The git worktree is dirty with many existing modified/untracked files from the shadow phase and prior multi-agent setup. Do not revert unrelated changes.
- Generated Excel workbooks under `career-ops/output/` are not all shown by `git status`, likely due ignore rules. They are still present on disk and should be treated as handoff artifacts.
- Multi-agent-collab was manually upgraded from `0.4.1` to `0.4.3` on 2026-05-05. `.collab/VERSION` is now `0.4.3`, `.collab/PROTOCOL.md` is refreshed, `.collab/UPGRADE_NOTES.md` exists, and local helper scripts/templates are present under `scripts/` and `templates/`.
- Git Bash/Bash failed in Codex with Win32 error 5, so the framework migration was applied manually from the npm tarball. A preservation zip exists at `.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip`.
