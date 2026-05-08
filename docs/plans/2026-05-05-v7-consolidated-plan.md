---
status: active
type: implementation-plan
owner: claude
last-updated: 2026-05-05T19:00:00-04:00
revision: v2 (post-reviewer-agent revisions)
read-if: "you are implementing or reviewing V7 of the production filter refinement shadow workbook"
skip-if: "V7 already merged to V8+"
related:
  - docs/plans/2026-05-03-production-filter-refinement-design.md
  - docs/plans/2026-05-03-production-filter-refinement-implementation.md
  - docs/audits/2026-05-05-v5-reviewer-agent-findings.md
  - docs/audits/2026-05-05-v6-implementation-summary.md
  - docs/audits/2026-05-05-round3-comparison-findings.md
  - docs/audits/2026-05-05-v7-plan-review.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/production-filter-refinement-audit.mjs
---

# V7 Consolidated Implementation Plan (revision v2)

## Revision history
- **v1** (2026-05-05T17:30): initial plan written
- **v2** (2026-05-05T19:00): incorporated 13 revisions from `docs/audits/2026-05-05-v7-plan-review.md`. Material changes: V7-A1 regex broadened, V7-A2 simplified, V7-A3 gate fixed (removed nonexistent families) + token list cleaned (no false-positive bare codes / nationality adjectives) + Mexico resolved to NON_NA + UNKNOWN-default fallback + new Shadow Decisions columns; V7-B2 added Lattice + Anthropic country-dropdown adversarial fixtures + Pre-Sales variants; V7-B3 fixed `hard_drop_reason` validation + dropped invalid invariant + added determinism / family-base correspondence / source-repair-contract; V7-B4 ranges tightened; Workflow Step 0 added (V6 baseline preflight); documentation cascade gated in acceptance; regression-baseline gate added.

## Purpose

Consolidate all current actionable findings from Round 1 reviewer (V5), Round 3 comparison (V5→V6), V7 plan review (Round 3.5), and Will's policy refinements into a single V7 round. V7 has two parallel tracks:

- **Track A — Rule refinements** (5 items): close out remaining V5/V6 findings + add territory filter
- **Track B — Test infrastructure** (4 items): shift correctness checks from expensive reviewer agents to cheap regression-time tests

Both tracks land in the same shadow workbook (V7) with a single regeneration cycle.

## Scope boundaries

**Modifies (shadow-mode tooling only):**
- `scripts/lib/job-fit-rules.mjs`
- `scripts/lib/jd-sections.mjs` (if territory parsing requires section help)
- `scripts/production-filter-refinement-audit.mjs`
- `scripts/test-job-fit-rules.mjs`
- `scripts/test-production-filter-refinement-audit.mjs`
- New: `scripts/test-fixtures/v7-realdata-fixtures.json`
- New: `scripts/test-realdata-fixtures.mjs`
- New: `scripts/test-properties.mjs`
- New: `scripts/test-cohort-shape.mjs`
- Doc updates: `docs/plans/2026-05-03-production-filter-refinement-design.md` §4.6, `AI_HANDOFF.md`, `docs/STATUS.md` at wrap-up

**Does NOT touch (production hard boundaries):**
- `career-ops/export-jobs.mjs`, `career-ops/portals.yml`, `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`
- Default `npm run full-scan`, caches, tracker data
- Baseline workbook `career-ops/output/jobs-2026-05-01.xlsx` (SHA must remain `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`)
- V3-V6 workbooks (read-only)

## Workflow

```
Step 0 — V6 baseline preflight (NEW in v2):
  - Run all V6 test suites; verify all pass
  - Confirm baseline jobs-2026-05-01.xlsx SHA = 7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e
  - Regenerate V6 workbook from current code; confirm V6 metrics still match
    docs/audits/2026-05-05-production-filter-refinement-v6-summary.json
  - If any check fails: STOP. Resolve baseline drift before V7.

Step 1 — Implement V7-A1 → V7-A5 (rule changes), running tests after each
Step 2 — Implement V7-B1 (real-data fixture set):
  a. Sample 50 rows from V6 workbook with seed=42, sorted by (company, title, url)
  b. Hand-label each, cite rationale; flag uncertain cases for Will batch-review
  c. Write fixture file (JSONL preferred for git diff readability)
  d. Write test runner; verify all 50 pass against current V6 rules first (sanity check)
Step 3 — Implement V7-B2 (adversarial fixtures) — add to existing test-job-fit-rules.mjs
Step 4 — Implement V7-B3 (property tests) — new file
Step 5 — Run all test suites; confirm 100% pass
Step 6 — Generate V7 workbook + V6/V7 diff workbook
Step 7 — Run V7-B4 (cohort-shape) against generated V7 summary
Step 8 — Documentation cascade (NEW in v2):
  - Update docs/plans/2026-05-03-production-filter-refinement-design.md §4.6 with territory subsection
  - Update AI_HANDOFF.md with new state of art
  - Update docs/STATUS.md with V7 closure entry
Step 9 — Update INDEX
Step 10 — Output implementation summary at docs/audits/2026-05-05-v7-implementation-summary.md
```

## Track A — Rule refinements

### V7-A1: Pre-Sales title regex extension (REVISED v2)

**File:** `scripts/lib/job-fit-rules.mjs:118` (`hardSalesTitleRe`)

**Change:** Extend `hardSalesTitleRe` with the broader Round 3 proposal that catches all Pre-Sales variants without requiring literal hyphen:

```js
const hardSalesTitleRe = /\b(account executive|ae[\s,]|account manager|am[\s,]|business development representative|bdr|sales development representative|sdr|inside sales|outside sales|enterprise sales|territory sales|pre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b|sales engineer)\b/i;
```

**Acceptance (expanded from v1):**
- `classifySalesRole({title: "Pre-Sales Solutions Engineer"}).hard_drop === true` (Deepgram canonical)
- `classifySalesRole({title: "Presales Engineer"}).hard_drop === true` (no hyphen)
- `classifySalesRole({title: "Pre Sales Architect"}).hard_drop === true` (space-only)
- `classifySalesRole({title: "Pre-Sales Specialist"}).hard_drop === true`
- `classifySalesRole({title: "Pre-Sales Technical Engineer"}).hard_drop === true`
- `classifySalesRole({title: "Sales Engineering Manager"}).hard_drop === true` (existing)
- `classifySalesRole({title: "Pre-Sales Consultant"}).hard_drop === true`
- The 2 Deepgram rows currently keeping at Band A in V6 must drop in V7
- Existing tests still pass (AE, AM, SE patterns unchanged)

**Source:** Round 3 finding §3-(a) at `docs/audits/2026-05-05-round3-comparison-findings.md:149` / V7 plan review V7-A1.

### V7-A2: `commercial_ownership` regex tightening (REVISED v2)

**File:** `scripts/lib/job-fit-rules.mjs:135`

**Change (simplified per reviewer):** Replace bare `\bterritory\b` with literal `\bsales territory\b` (not a proximity rule, which is brittle over JD HTML noise):

```js
// Before:
\b(book of business|renewals?|expansion opportunities|land and expand|territory|account ownership)\b
// After:
\b(book of business|renewals?|expansion opportunities|land and expand|sales territory|account ownership)\b
```

**Acceptance:**
- `commercial_ownership` MUST NOT fire on JD body text containing only "British Indian Ocean Territory" in country dropdown
- `commercial_ownership` MUST still fire on "you'll own a sales territory and grow your book of business"
- **Explicit non-acceptance:** This fix does NOT flip Anthropic India/Japan rows — they still drop at AI_ENGINEERING family threshold 4 per Round 3 §3 recomputation. Territory drops are V7-A3's job.

**Source:** Round 3 finding §3-(c).

### V7-A3: NEW territory filter (REVISED v2 — gating + token list cleaned)

**Files:**
- `scripts/lib/job-fit-rules.mjs` — add `detectTerritory(title, textSections)` function
- `scripts/production-filter-refinement-audit.mjs` — wire territory signal into score/drop decision; add new Shadow Decisions columns

**New function `detectTerritory()`:**
- Input: `{ title, textSections }`
- Output: `{ region: "NA" | "NON_NA" | "UNKNOWN", evidence: string[], tokens_matched: string[] }`

**Token lists (cleaned per reviewer §V7-A3):**

NA whitelist (require word boundaries; multi-word tokens preferred over short codes):
- `north america`, `americas`, `naam`
- `united states`, `usa`, `u\\.s\\.`, `u\\.s\\.a`, `america`
- `canada`, `canadian`
- 2-letter `us` only when wrapped in delimiters: `\(us\)`, `\bus[,\-]`, `[,\-\s]us[,\-\s]` (NOT bare `\bus\b` — collides with "tell us", "join us")

Non-NA blacklist (multi-word region terms preferred over bare adjectives):
- `emea`, `europe`, `european`, `dach`, `iberia`, `nordics`, `mena`
- 2-letter `eu` / `uk` only when wrapped in delimiters: `\(eu\)`, `\(uk\)`, `[,\-\s]eu[,\-\s]`, `[,\-\s]uk[,\-\s]` (NOT bare — collides with "EU GDPR" boilerplate, "UK-based" URLs)
- `apac`, `asia`, `asia-pacific`, `asia pacific`
- Country names only (NOT nationality adjectives — collide with language/skill mentions): `india`, `japan`, `korea`, `china`, `singapore`, `hong kong`, `taiwan`, `southeast asia`, `australia`, `new zealand`, `africa`, `middle east`, `gulf`
- `latam`, `latin america`, `lac`, `cala`, `brazil`, `argentina`
- `anz`, `gcc`
- **`mexico`: NON_NA only** (resolved per reviewer — culturally/economically grouped with LATAM in sales territories Will doesn't target)

**REMOVED from v1 token list (false-positive risk):**
- ❌ Bare `us` (without delimiters)
- ❌ Bare `eu`, `uk`, `nam` (without delimiters)
- ❌ Nationality adjectives: `indian`, `japanese`, `korean`, `chinese` — collide with "British Indian Ocean Territory" (the V6 bug we just fixed), language proficiency mentions, customer-nationality mentions
- ❌ `mexico` from NA list (kept only in NON_NA)

**Detection precedence:**
1. **Title check first** — patterns like `(EMEA)`, `- APAC`, `, India`, `for Asia Pacific` in title → strong NON_NA signal
2. **Section-targeted check** — only Responsibilities / What you'll do / About the role / Your impact sections (NOT cookie banners, footers, country dropdowns, or unrelated regions of the page)
3. **Disambiguate when both NA and non-NA present:** if title mentions one explicitly, title wins; otherwise UNKNOWN
4. **Default UNKNOWN when no tokens match** — do NOT fire territory hard-drop on UNKNOWN
5. **Fallback when section detection fails:** if `parseJdSections` returns no recognized sections, default to UNKNOWN — NOT whole-body scan. This is the critical guard against country-dropdown contamination in poorly-formatted JDs.

**Hard-drop rule (REVISED — gate fixed per reviewer):**
- Fires when: `(territory.region === "NON_NA")` AND `(has_hard_sales_title || sales_role_signal_present)`
- Where `sales_role_signal_present` = `classifySalesRole(...).hard_drop === true` OR `sales.evidence.length > 0`
- Does NOT fire when: territory is NON_NA but role is purely engineering with no sales angle (preserves global-team AI Engineer roles)
- Does NOT fire when: territory is UNKNOWN (default-safe)
- Adds new `hard_drop_reason` value: `non_na_territory_with_sales_context`

**REMOVED from v1 gate:**
- ❌ `primary_family ∈ {SALES, AE_HYBRID}` — these families don't exist in `FAMILY_BASE` at `scripts/lib/job-fit-rules.mjs:8-18`. Plan v1 was unimplementable.

**NEW: Shadow Decisions columns (per reviewer §What's Missing #3):**
Add to the audit output workbook's Shadow Decisions sheet:
- `territory_region` — "NA" / "NON_NA" / "UNKNOWN"
- `territory_evidence` — comma-joined matched tokens + 50-char snippets
- `territory_dropped` — "yes" / "no"

This lets Will spot-check NON_NA-but-not-dropped rows (verify gate correctness) and NA rows that dropped on other reasons (verify territory wasn't overriding).

**Acceptance:**
- Anthropic Applied AI Architect, Commercial — India: `territory_region=NON_NA`, drops on `non_na_territory_with_sales_context`
- Anthropic Applied AI Architect, Commercial — Japan: same
- Anthropic Applied AI Architect, Commercial (USA): `territory_region=NA` (or `UNKNOWN`), does NOT drop on territory **(but may still drop on `sales_role_content` per V6 — that's correct behavior)**
- "Solutions Architect, EMEA" with sales JD content: `territory_region=NON_NA`, drops on `non_na_territory_with_sales_context`
- "AI Engineer (Remote, Global team)" with no sales content but JD mentions "team distributed across EMEA, APAC, Americas": `territory_region` may detect NON_NA, but gate fails (no sales signal) → no drop. Keeps with annotation only.
- **Country-dropdown negative test (NEW per reviewer):** JD body containing only the literal Greenhouse country dropdown list (`...British Indian Ocean Territory+246...`) and no other Asia/EMEA tokens in role-content sections MUST NOT trigger NON_NA. Run against an Anthropic Commercial (USA) JD as canary.
- **Section-failure fallback test:** JD with no recognized sections → `territory_region = UNKNOWN`, no drop.

**Source:** Will's 2026-05-05 conversation policy refinement; reviewer corrections.

### V7-A4: Fix `KNOWN_SEEDS` typo'd URLs

**File:** `scripts/production-filter-refinement-audit.mjs:46-61`

**Change:** Fix two typo'd URLs:
- `generative-al---generalist` → `generative-ai-generalist`
- `al-programs-analyst` → `ai-programs-analyst`

**Acceptance:**
- Both URLs syntactically correct
- `KNOWN_SEEDS.length === 14` (unchanged)
- Whether they resolve to retained 2026-05-01 artifacts: OUT OF SCOPE for V7 (V1.1 enrichment workstream)

**Source:** Round 1 F-006.

### V7-A5: AE/AM strictness regression test (EXPANDED v2)

**File:** `scripts/test-job-fit-rules.mjs`

**Test cases (expanded per reviewer):**
- `Account Executive` → drop (regardless of `primary_family`)
- `Enterprise Account Executive - AI Platform` → drop
- `Account Manager` → drop
- `Strategic Account Manager - Generative AI` → drop
- `Technical Account Manager` → does NOT drop at title level (TAM is a kept role; may still drop at content level if quota/OTE present)
- `Account Coordinator` → does NOT drop (different role family)
- `Customer Success Manager` → does NOT drop at title level (CSM is not in `hardSalesTitleRe`); content-level drop possible
- AE with `primary_family = SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE` → STILL drops (loosening only applies to SA/FDE titles, never to AE/AM titles — even though gate is order-protected at line 119, this is a permanent guardrail against future refactors)
- AM with `primary_family = AI_ENGINEERING` → STILL drops

**Source:** Will's 2026-05-05 directive ("definitely not for account executive or account manager"); reviewer expansion §V7-A5.

## Track B — Test infrastructure

### V7-B1: Real-data fixture set

**New files:**
- `scripts/test-fixtures/v7-realdata-fixtures.json` (or `.jsonl` preferred for git-diff readability)
- `scripts/test-realdata-fixtures.mjs`

**Sample size + stratification:** 50 rows from V6 workbook (seed=42, sorted deterministically by `(company, title, url)`):

| Category | Count | Source sheet |
|----------|-------|-------------|
| Sales Hard Drops (legitimate) | 8 | V6 Sales Hard Drops |
| Sales Hard Drops (cohort survivors) | 6 | V6 Score Deltas, F-001 cohort post-policy 2 |
| Source Repair (legitimate) | 8 | V6 Source Repair Review |
| Reviewer Queue (genuinely borderline) | 8 | V6 Reviewer Queue |
| Hard Drops on YoE/Comp/Location | 8 | V6 Comp YoE Location |
| Score Deltas (high-value rescues) | 6 | V6 Score Deltas, top score increases that are correct |
| Adversarial / known false positives | 6 | Round 1 + Round 3 findings |

**Schema (REVISED — `revised_in` is now an array):**
```json
{
  "fixture_id": "F-001",
  "company": "Anthropic",
  "title": "Applied AI Architect, Commercial",
  "url": "https://job-boards.greenhouse.io/anthropic/jobs/5192805008",
  "jd_excerpt": "First 2000 chars of relevant JD sections",
  "primary_family_expected": "AI_ENGINEERING",
  "hard_drop_expected": true,
  "hard_drop_reason_expected": "sales_role_content",
  "band_expected": null,
  "rationale": "JD explicitly says 'pre-sales architect' + OTE comp + partner with AEs",
  "expected_failure": false,
  "expected_failure_reason": null,
  "provenance": {
    "source_workbook": "production-filter-refinement-review-2026-05-01-v6.xlsx",
    "source_workbook_sha": "<computed at sample time>",
    "row_index": 142,
    "labeled_by": "round1-reviewer",
    "labeled_date": "2026-05-05",
    "revised_in": []
  }
}
```

**Workflow:**
- Claude pre-labels fixtures
- Surfaces uncertain ones flagged `labeled_by: "claude-with-uncertainty"`
- Will batch-signs-off on questionable ones (target: <10 questionable out of 50)

**Acceptance (TIGHTENED per reviewer):**
- **50/50 fixtures match expected outcome** (no slop budget)
- Any fixture marked `expected_failure: true` must have explicit `expected_failure_reason`
- A parallel assertion verifies that fixtures marked `expected_failure: true` indeed produce different output, and `expected_failure: false` ones match exactly
- If a future round changes a fixture's expected outcome legitimately, append to `revised_in` array with reason

**Sampling protocol determinism (clarified per reviewer):**
- Seed: 42
- Sort key: `(company, title, url)` — three-tier tiebreak ensures stability when company+title repeat
- For each category, take every Nth row from sorted+stratified subset

### V7-B2: Adversarial fixtures (EXPANDED v2)

**File:** `scripts/test-job-fit-rules.mjs`

**Cases (expanded from 11 → 16 per reviewer):**

| # | Test | Asserts | Source |
|---|------|---------|--------|
| 1 | `commercial_ownership` does not fire on text containing "British Indian Ocean Territory" alone | Round 3 §3-(c) | Adversarial |
| 2 | `sales_compensation` evidence ≤ 2 when only OTE-disclosure boilerplate present | V6 policy 2 design | Adversarial |
| 3 | `sales_department` alone (no corroborator) does NOT fire `hard_drop` | F-008 | Adversarial |
| 4 | Pre-Sales Solutions Engineer drops at title level | V7-A1 / Round 3 §3-(a) | Regression |
| 5 | **(NEW)** Presales Engineer (no hyphen) drops at title level | V7-A1 broadened regex | Regression |
| 6 | **(NEW)** Pre Sales Architect (space-only) drops at title level | V7-A1 broadened regex | Regression |
| 7 | **(NEW)** Pre-Sales Specialist drops at title level | V7-A1 broadened regex | Regression |
| 8 | **(NEW)** Pre-Sales Technical Engineer drops at title level | V7-A1 broadened regex | Regression |
| 9 | Atlassian `/all-jobs?team=` URL routes to `generic_careers_index` | V6 F-003 | Regression |
| 10 | `https://example.com/...` URL routes to `placeholder_or_invalid_url` | V6 F-004 | Regression |
| 11 | Scale AI `gh_jid 4673051005` appears at most once after dedup | V6 F-002 | Regression |
| 12 | ElevenLabs FDE Software Engineer appears at most once after dedup | V6 F-002 | Regression |
| 13 | Validation finding `specific_location_not_in_drop_reason` does NOT fire when `location_reason` is empty | V6 F-009 | Regression |
| 14 | **(NEW)** Country-dropdown text containing `British Indian Ocean Territory` (no other Asia/India tokens in role-content sections) MUST NOT trigger NON_NA territory | Round 3 §3-(c) shape applied to V7-A3 | Adversarial |
| 15 | **(NEW)** Lattice-shape per-label aggregation: AI_PROGRAM_OPS row with `sales_department` alone (no corroborator) does NOT fire `sales_role_content` | Round 3 §Regression Detection | Regression |
| 16 | Anthropic India role with sales context drops on `non_na_territory_with_sales_context` | V7-A3 | New |
| 17 | Anthropic Commercial (US) role does NOT drop on territory (NA region) | V7-A3 | New |
| 18 | **(NEW)** JD with no recognized sections → `territory_region = UNKNOWN`, no territory drop | V7-A3 fallback | Adversarial |

Each test should be paired with a comment linking to the originating finding doc + section.

### V7-B3: Property tests (REVISED v2)

**New file:** `scripts/test-properties.mjs`

For 100 random rows from V7 workbook (deterministic seed=42), assert:

```js
// Type invariants
assert(typeof result.hard_drop === "boolean", "hard_drop is boolean");
assert(typeof result.score === "number", "score is numeric");
assert(Number.isFinite(result.score), "score is finite");

// Range invariants
assert(result.score >= -10 && result.score <= 100, "score in expected range");

// Implication invariants
assert(!result.hard_drop || (result.hard_drop_reason && result.hard_drop_reason.length > 0),
       "hard_drop=true ⇒ hard_drop_reason is non-empty");

// Source-repair contract (NEW per reviewer §V7-B3)
assert(result.source_repair !== "yes" || result.hard_drop === false,
       "source_repair=yes ⇒ hard_drop=false");

// Family-base correspondence (NEW per reviewer §V7-B3)
if (result.primary_family !== "UNKNOWN") {
  assert(result.score_parts.family === FAMILY_BASE[result.primary_family],
         `family score matches FAMILY_BASE for ${result.primary_family}`);
}

// Set membership invariants (FIXED per reviewer — split-and-every, NOT substring-some)
const validFamilies = ["SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE", "AI_ENGINEERING", "AI_PROGRAM_OPS",
                       "AI_EVAL", "PRODUCT_AI", "CONSULTING_ADVISORY", "CREATIVE_AI",
                       "GENERIC_ENGINEERING_REVIEW", "UNKNOWN"];
assert(validFamilies.includes(result.primary_family), "primary_family in known set");

const validBands = ["S", "A", "B", "C", "REVIEW", null];
assert(validBands.includes(result.band), "band in known set");

const validHardDropReasons = ["sales_role_title", "sales_role_content", "yoe_required_gt_5",
                               "compensation_below_floor", "hybrid_non_toronto_no_remote",
                               "specific_non_toronto_location_no_remote",
                               "non_na_territory_with_sales_context",
                               "senior_title", "junior_title", "associate_level"];
const reasons = String(result.hard_drop_reason || "").split(";").map(s => s.trim()).filter(Boolean);
assert(reasons.every(r => validHardDropReasons.includes(r)),
       `all hard_drop_reasons in known set: got ${JSON.stringify(reasons)}`);

// Determinism (NEW per reviewer)
const result2 = scoreJob(input);
assert(JSON.stringify(result) === JSON.stringify(result2),
       "scoreJob is deterministic for the same input");
```

**REMOVED from v1 (per reviewer):**
- ❌ `hard_drop=true ⇒ band null or C` — not actually true given current `scoreJob`. Could revise `scoreJob` to enforce band=C on hard_drop, OR drop the invariant. v2 drops it; band=C enforcement can be a separate V8 hardening if Will wants.

**Acceptance:** 100/100 properties hold across the random sample.

### V7-B4: Cohort-shape assertions (TIGHTENED v2)

**New file:** `scripts/test-cohort-shape.mjs`

After V7 workbook generation, assert metrics within tightened ranges:

```js
const v7Summary = readJson("docs/audits/2026-05-05-production-filter-refinement-v7-summary.json");

// Pipeline shape (post V6 dedup)
assertBetween(v7Summary.pipeline_rows, 925, 940, "pipeline_rows in expected post-dedup range");
assertEq(v7Summary.baseline_excel_sha, "7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e", "baseline SHA preserved");

// Hard drop categories (V7 expected behavior — TIGHTENED per reviewer)
assertBetween(v7Summary.sales_hard_drops, 78, 92,
  "sales_hard_drops: V5=108, V6=78, V7 expected ~78-90 (V7-A1 fixes Pre-Sales regression +2; V7-A2 hygiene fix doesn't flip Anthropic outcomes per Round 3)");
// NOTE: territory drops go to a separate metric, not sales_hard_drops
assertBetween(v7Summary.location_hard_drops, 340, 380, "location_hard_drops in expected range");
assertBetween(v7Summary.yoe_hard_drops, 140, 160, "yoe_hard_drops in expected range");
assertBetween(v7Summary.comp_hard_drops, 0, 5, "comp_hard_drops in expected range (V5=1, V6=1)");

// New territory category (TIGHTENED to match prediction range)
assertBetween(v7Summary.territory_hard_drops, 10, 30,
  "territory_hard_drops: NEW category in V7, expected to catch ~10-30 non-NA sales rows");

// Source repair shape (V6=184)
assertBetween(v7Summary.source_repair_rows, 175, 200, "source_repair_rows in expected range");

// Validation findings (V6=0)
assertBetween(v7Summary.validation_findings_review_only, 0, 4, "validation_findings within tolerance");
assertEq(v7Summary.validation_findings_blocking, 0, "no blocking validation findings");

// Total shadow hard drops (TIGHTENED to ±5% of V6 per stated tolerance)
assertBetween(v7Summary.shadow_hard_drops, 476, 526,
  "total shadow_hard_drops: V5=514, V6=501, V7 expected ±5% of V6");
```

**Sales-metric definition (NEW per reviewer):** the audit's `sales_hard_drops` metric (`scripts/production-filter-refinement-audit.mjs:461`) filters by `/sales_role/.test(hard_drop_reason)`. The new reason `non_na_territory_with_sales_context` does NOT contain `sales_role`, so territory drops will NOT count toward `sales_hard_drops`. They will count toward a new `territory_hard_drops` metric, defined as: `decisions.filter(d => /non_na_territory/.test(d.hard_drop_reason)).length`. This must be wired into the audit script.

**Maintenance:** if any cohort metric falls outside expected range, the test fails LOUDLY and forces an explicit decision: was the rule change intentional, or did something break? Update the range with a comment explaining the reason.

## Out of V7 scope (explicit deferrals)

| Item | Why deferred | Where it lands |
|------|-------------|----------------|
| **F-005** — 31 missing-cache enrichment | Needs Firecrawl re-fetch (one-shot ~$50-100 in credits), NOT a rule change | V1.1 enrichment workstream |
| **F-007** — Anthropic "Remote-flexible" regex | Round 3 confirmed Anthropic JDs do NOT contain "Remote-flexible" — hypothesis closed | wontfix |
| **F-010** — Company name normalization (cosmetic) | Low severity; cosmetic only; would require portals.yml schema change | Optional V8+ |
| **Mutation testing** | High effort (~3 hours setup); diminishing returns vs. real-data fixture set | Optional future round |
| **Anthropic policy 3 final decision** | Likely resolves organically via V7-A2 + V7-A3 territory filter | Round 4 verification will surface |
| **`hard_drop=true ⇒ band=C` enforcement in scoreJob** | Removed from v1's invariant list; could be V8 hardening if Will wants | Optional V8 |
| **Account Director regex addition** | Reviewer flagged but Will didn't direct — current `director` is caught by Level filter (senior_title) | Decide in V8 if Will wants explicit |

## Acceptance criteria (overall — EXPANDED v2)

- All test suites pass (no failures): `test-jd-sections.mjs` (8), `test-job-fit-rules.mjs` (~80 with V7 additions), `test-production-filter-refinement-audit.mjs` (~55), `test-realdata-fixtures.mjs` (50/50 strict), `test-properties.mjs` (700+ assertions), `test-shadow-version-diff.mjs` (15), `test-v5-v6-diff.mjs` (13), `test-cohort-shape.mjs` (12+)
- V7 workbook generated; baseline SHA unchanged: `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`
- New Shadow Decisions columns present: `territory_region`, `territory_evidence`, `territory_dropped`
- New audit metric `territory_hard_drops` wired into summary JSON
- **Will's policy directive measurably enforced:** for every fixture in V7-B1 with title matching `hardSalesTitleRe`, regardless of `primary_family`, `hard_drop_expected=true` (this codifies "AE/AM strict")
- **Territory-policy measurably enforced:** for every NON_NA-tagged role with sales signals in V7-B1 fixture set, drops; for every NON_NA-tagged role with no sales signals, does NOT drop on territory
- **Regression-baseline gate (NEW per reviewer):** running V7's audit against V6's pipeline.md produces V6 outcomes for all rows EXCEPT those whose change is attributable to a specific V7-Ax. For each V6→V7 hard_drop status flip, an audit-script log line tags the responsible V7-Ax change. No silent flips.
- **Documentation cascade complete:**
  - `docs/plans/2026-05-03-production-filter-refinement-design.md` §4.6 has territory-policy subsection
  - `AI_HANDOFF.md` updated with V7 state
  - `docs/STATUS.md` has V7 closure entry
  - INDEX has all new files registered
- Round 4 verification agent confirms:
  - Deepgram Pre-Sales (and 4 new variant cases) drop in V7
  - Anthropic Applied AI Architect outcomes match expected (NA → keep with annotation; non-NA → drop on territory)
  - No new regressions vs V6
  - Real-data fixture set 50/50 pass
  - Cohort-shape assertions pass

## Expected V7 metrics (predictions for cohort-shape test calibration)

| Metric | V5 | V6 | V7 prediction | Reasoning |
|--------|----|----|--------------|-----------|
| pipeline_rows | 956 | 933 | 933 | No new dedup; territory filter doesn't change row count |
| shadow_hard_drops (total) | 514 | 501 | 480-525 | V7-A1 +~2 drops (Deepgram + variants); V7-A3 +10-30 territory drops (separate bucket); V7-A2 -0 (doesn't flip Anthropic) |
| sales_hard_drops | 108 | 78 | 78-92 | V7-A1 +2; V7-A2 hygiene only — doesn't add/remove rows |
| **territory_hard_drops** | N/A | N/A | **10-30 (NEW separate bucket)** | V7-A3 only; non-NA + sales gate |
| source_repair | 206 | 184 | 175-200 | No major source-hygiene changes |
| validation_findings | 4 | 0 | 0-1 | Stable |
| comp_hard_drops | 1 | 1 | 0-5 | Stable |
| yoe_hard_drops | 148 | 148 | 140-160 | Stable |
| location_hard_drops | 361 | ~350 | 340-380 | Stable |

## V7 Sign-Off Checklist (per reviewer)

| # | Item | Status v2 |
|---|------|-----------|
| 1 | V7-A1 regex extends Round 3's `pre[-\s]?sales\b...specialist` form | DONE |
| 2 | V7-A2 uses literal `sales territory` (not 15-30 char proximity) | DONE |
| 3 | V7-A3 gate references only existing families (drops SALES, AE_HYBRID) | DONE |
| 4 | V7-A3 token list cleaned (no bare `us`/`eu`/`uk`; no nationality adjectives; `mexico` resolved to NON_NA) | DONE |
| 5 | V7-A3 specifies UNKNOWN default when section detection fails | DONE |
| 6 | V7-A3 adds `territory_region` / `territory_evidence` / `territory_dropped` columns to Shadow Decisions sheet | DONE |
| 7 | V7-B3 `hard_drop_reason` validation uses split-and-every (not substring-some) | DONE |
| 8 | V7-B4 ranges tightened to [78,92] / [10,30] / [476,526] | DONE |
| 9 | Workflow Step 0: V6 baseline preflight | DONE |
| 10 | Acceptance: country-dropdown negative test for both `commercial_ownership` AND territory | DONE |
| 11 | Documentation cascade gated in acceptance (design plan §4.6, AI_HANDOFF.md, STATUS.md) | DONE |
| 12 | Lattice-shape per-label aggregation fixture in V7-B2 | DONE |
| 13 | V7-B3 determinism + source-repair-contract + family-base-correspondence invariants added | DONE |
| 14 | V7-B3 invalid `hard_drop ⇒ band null or C` invariant removed | DONE |
| 15 | Acceptance: regression-baseline gate (every V6→V7 hard_drop flip tagged to V7-Ax) | DONE |
| 16 | V7-A5 expanded with Customer Success Manager carve-out test | DONE |
| 17 | V7-B1 acceptance tightened to 50/50 strict (with `expected_failure` field) | DONE |
| 18 | V7-B2 adversarial fixtures expanded to include Pre-Sales variants + Lattice + country-dropdown + section-failure fallback | DONE |

18 items; 18 DONE. Ready for execution.
