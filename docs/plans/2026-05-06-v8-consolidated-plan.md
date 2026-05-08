---
status: active
type: implementation-plan
owner: claude
last-updated: 2026-05-06T11:30:00-04:00
revision: v2 (post-reviewer-agent revisions)
read-if: "you are implementing or reviewing V8 of the production filter refinement shadow workbook"
skip-if: "V8 already merged"
related:
  - docs/plans/2026-05-05-v7-consolidated-plan.md
  - docs/audits/2026-05-05-v7-implementation-summary.md
  - docs/audits/2026-05-05-round4-verification-findings.md
  - docs/audits/2026-05-06-v8-plan-review.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/lib/jd-sections.mjs
  - scripts/production-filter-refinement-audit.mjs
---

# V8 Consolidated Implementation Plan (revision v2)

## Revision history
- **v1** (2026-05-06T10:00): initial plan
- **v2** (2026-05-06T11:30): incorporated reviewer revisions from `docs/audits/2026-05-06-v8-plan-review.md`. Material changes: V8-A1 detector mechanics fully specified (token-scan AUGMENTED by role-anchor patterns, NOT replaced); explicit code changes to `scripts/lib/jd-sections.mjs:4-35` `SECTION_ALIASES` and `scripts/lib/job-fit-rules.mjs:314` `recognizedTypes`; V8-A1 multi-region tie rule defined; reason-rename cascade listed across 17 files; V8-A2 expected-impact corrected (mostly redundant via Level filter — only `Regional Sales Manager` genuinely new); V8-A3 acceptance reasoning corrected (CS Engineer not dropping is a regex-shape consequence, not carve-out logic); V8-B3 explicit enum update for `validHardDropReasons`; V8-B2 added canonical missing fixtures (Location: London header; multi-region tie); NON_NA token list expanded with 13 countries; V8-A4 sample size raised to 75+25; Round 4 named cohort fixtures (Cohere Singapore, Mistral, Palantir Europe, H2O APAC) added explicitly to V8-B1; cohort-shape `territory_hard_drops` tightened from `[18,35]` to `[16,25]`.

## Purpose

V7 reached APPROVE_FOR_PRODUCTION_WIRING per Round 4, but Will's 2026-05-06 clarification on territory intent revealed V7's gate is too narrow under his actual preference: **any role in a non-NA market drops, regardless of "global" / "remote globally" / "APAC team" framing.** V7 currently preserves ~12 non-NA-rooted roles he wants dropped.

V8 also bundles three smaller items deferred from V7:
- **W-2** — extend `hardSalesTitleRe` to catch director-level sales titles (mostly defense-in-depth; `\bdirector\b` already hits Level filter)
- **W-3** — decide policy on Customer Success Manager titles (default: (iii) carve-out for AI hybrids)
- **W-4** — audit + extend source-hygiene patterns beyond V7's coverage

After V8, Will does single manual review on the final shadow workbook before production wiring.

## Scope boundaries

**Modifies (shadow-mode tooling only):**
- `scripts/lib/job-fit-rules.mjs` — `detectTerritory` strict-NA redesign (token-scan augmented by role-anchor patterns) + `hardSalesTitleRe` extension + `recognizedTypes` extension
- `scripts/lib/jd-sections.mjs` — `SECTION_ALIASES` extension
- `scripts/production-filter-refinement-audit.mjs` — territory gate change + reason rename + source-hygiene extensions
- `scripts/test-job-fit-rules.mjs` — new tests for V8 changes
- `scripts/test-production-filter-refinement-audit.mjs` — workbook-level tests
- `scripts/test-properties.mjs` — `validHardDropReasons` enum update
- `scripts/test-cohort-shape.mjs` — updated ranges
- `scripts/test-fixtures/v7-realdata-fixtures.jsonl` — UPDATED IN PLACE (not renamed, per reviewer §V8-B1) with `revised_in: ["V7→V8"]` audit trail per affected fixture
- New: `scripts/v7-v8-diff.mjs` + `scripts/test-v7-v8-diff.mjs`
- Doc updates: `docs/plans/2026-05-03-production-filter-refinement-design.md` §4.6, `AI_HANDOFF.md`, `docs/STATUS.md`

**Does NOT touch (production hard boundaries — same as V7):**
- `career-ops/export-jobs.mjs`, `career-ops/portals.yml`, `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`
- Default `npm run full-scan`, caches, tracker data
- Baseline workbook `career-ops/output/jobs-2026-05-01.xlsx` (SHA must remain `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`)
- V3-V7 workbooks (read-only)

## Workflow

```
Step 0 — V7 baseline preflight
  - Run all V7 test suites; verify 1,205 assertions pass
  - Confirm baseline jobs-2026-05-01.xlsx SHA = 7bfe4ec5...071e
  - Regenerate V7 workbook from current code; confirm V7 metrics still match
  - If any check fails: STOP

Step 1 — Implement V8-A1 (strict territory) + tests:
  Step 1a — Extend SECTION_ALIASES in scripts/lib/jd-sections.mjs:4-35
  Step 1b — Extend recognizedTypes in scripts/lib/job-fit-rules.mjs:314 (currently only ["responsibilities", "requirements"])
  Step 1c — Augment detectTerritory with role-anchor pattern detection (additive to existing token-scan)
  Step 1d — Change hard-drop gate to pure NON_NA (drop sales-evidence AND clause)
  Step 1e — Rename reason non_na_territory_with_sales_context → non_na_territory across all 17 files (see §Reason Rename Cascade)
  Step 1f — Add V8-A1 unit tests
  Step 1g — Run job-fit-rules + jd-sections test suites; confirm pass

Step 2 — Implement V8-A2 (Director extension) + tests
Step 3 — Implement V8-A3 (CSM policy iii carve-out) + tests
Step 4 — Implement V8-A4 source-hygiene audit + extensions:
  Step 4a — Sample 75 rows from V7 Reviewer Queue
  Step 4b — Sample 25 rows from V7 Source Repair Review (precision check — should NOT have legitimate JDs)
  Step 4c — Audit + write report at docs/audits/2026-05-06-v8-source-hygiene-audit.md
  Step 4d — Implement extensions for high-confidence patterns
  Step 4e — Add positive + negative tests for each extension
Step 5 — Update V7 fixtures in place with revised_in trails + add new V8 fixtures
Step 6 — Update cohort-shape ranges
Step 7 — Run all test suites; confirm 100% pass
Step 8 — Generate V8 workbook + V7/V8 diff workbook
Step 9 — Run cohort-shape against V8 summary
Step 10 — Documentation cascade (design plan §4.6, AI_HANDOFF.md, STATUS.md)
Step 11 — Update INDEX
Step 12 — Output implementation summary at docs/audits/2026-05-06-v8-implementation-summary.md
```

## Track A — Rule refinements

### V8-A1: Strict-NA territory gate (CENTRAL CHANGE)

**Files:**
- `scripts/lib/jd-sections.mjs` (Step 1a)
- `scripts/lib/job-fit-rules.mjs` (Steps 1b-1d, 1f)
- `scripts/production-filter-refinement-audit.mjs` (Step 1e — partial, audit script touches)

**Detector mechanics (CLARIFIED v2 per reviewer §1):**

The V7 detector uses token-scan within title + designated section types (currently `responsibilities`, `requirements`). V8 **AUGMENTS** this — it does NOT replace it. The mechanics:

1. **Existing token-scan retained** (V7 behavior): scan title + extended section types for tokens from NA/NON_NA lists. This catches simple cases like "Solutions Engineer, EMEA" or "based out of Singapore" mentioned anywhere in role content.

2. **New role-anchor pattern layer (additive)**: regex patterns matching strong role-anchor phrases. These fire with HIGHER confidence than bare token matches. When a role-anchor pattern matches, it overrides UNKNOWN to NA or NON_NA respectively.

3. **Disambiguation rule (clarified)**: when both NA and NON_NA evidence is present in the role-content sections:
   - **Title-level evidence wins** if either is exclusively in title.
   - Otherwise, **count distinct anchor matches**: NA-anchors vs NON_NA-anchors.
   - **Tie or majority NA → NA** (default-permissive — protects multi-region roles open to NA candidates).
   - **Majority NON_NA → NON_NA**.
   - This handles "open to candidates in Toronto, NYC, or London" → 2 NA anchors + 1 NON_NA anchor → NA. Protects multi-region roles.

**Step 1a — Extend `SECTION_ALIASES` in `scripts/lib/jd-sections.mjs:4-35`:**

Currently aliases: `responsibilities`, `requirements`, `compensation`, `location`, `benefits`, `about_company`.

Add new section type aliases (canonicalize to existing canonical types):
- "Your Impact" / "What You'll Drive" / "Day to Day" / "Day-to-Day" / "Day in the life" → `responsibilities`
- "The Role" / "About the Role" / "About this Role" / "Job Details" / "The Position" / "Your Mission" → `responsibilities`
- "What we offer" / "What You'll Get" → `compensation`
- "Where you'll work" / "Office" → `location`

Update test cases in `scripts/test-jd-sections.mjs` to cover the new aliases.

**Step 1b — Extend `recognizedTypes` in `scripts/lib/job-fit-rules.mjs` (within `detectTerritory`):**

Implementation agent: locate the `recognizedTypes` Set inside `detectTerritory`. v1-review cited line 314; verify before editing as line numbers may have shifted with V7 edits.

Currently: `const recognizedTypes = new Set(["responsibilities", "requirements"]);`

Update to: `const recognizedTypes = new Set(["responsibilities", "requirements", "location"]);`

This is the CRITICAL fix per reviewer §2 — without this, `Location: London` headers are dead-text. Adding `location` to the set lets the detector scan dedicated location sections.

**Step 1c — Add role-anchor patterns to `detectTerritory()`:**

Define a new regex set scanned within `recognizedTypes` sections (after the existing token-scan):

```js
// Role-anchor: where the role lives (HIGH-confidence signals)
// Each pattern captures a {region} group; check captured group against NA/NON_NA token lists.
const ROLE_ANCHOR_PATTERNS = [
  /\bbased\s+(?:in|out\s+of)\s+(?:our|the)?\s*([\w\s,]{3,40}?)(?:\.|,|;|$)/gi,
  /\b([\w\s]{3,30}?)[-\s]based\s+(?:role|position|opportunity|engineer|architect)\b/gi,
  /\blocated\s+in\s+(?:the\s+)?([\w\s,]{3,40}?)(?:\.|,|;|$)/gi,
  /\boffice:?\s+([\w\s,]{3,30}?)(?:\.|,|;|$)/gi,
  /\bheadquarters?\s+in\s+([\w\s,]{3,40}?)(?:\.|,|;|$)/gi,
  /\bworking\s+from\s+(?:our\s+)?([\w\s,]{3,30}?)\s+office\b/gi,
  /\bopen\s+to\s+candidates?\s+in\s+([\w\s,]{3,80}?)(?:\.|;|$)/gi,
  /\blocation:?\s+([\w\s,]{3,40}?)(?:\.|\n|$)/gi,
  // Section header line patterns (for `location` section type):
  /^\s*location:?\s+([\w\s,]{3,40})\s*$/gim,
  /^\s*office:?\s+([\w\s,]{3,40})\s*$/gim,
];
```

For each match, normalize the captured region string and check against NON_NA / NA token lists. Multiple captures from a single anchor pattern (e.g., "open to candidates in Toronto, NYC, or London") should each count as separate anchor evidence for tie-breaking.

**Step 1d — Hard-drop gate change (`scripts/production-filter-refinement-audit.mjs`):**

V7 gate (current): `(territory.region === "NON_NA") AND (has_hard_sales_title || sales_role_signal_present)` → drop with reason `non_na_territory_with_sales_context`

V8 gate (new): `territory.region === "NON_NA"` → drop with reason `non_na_territory`

Drop the AND clause entirely. The detector itself is the discriminator now.

**Step 1e — Reason rename cascade (across all 17 files mentioning `non_na_territory_with_sales_context`):**

Per reviewer §What's Missing #2, the rename must touch every reference:

```
Direct rename:
  scripts/lib/job-fit-rules.mjs (any constant)
  scripts/production-filter-refinement-audit.mjs (audit emit; metric filter at line 461 if it uses /sales_role/.test pattern, verify the rename doesn't break sales_hard_drops counting since territory is now its own bucket — should already be separate)
  scripts/test-job-fit-rules.mjs (any test asserting reason)
  scripts/test-production-filter-refinement-audit.mjs (workbook-level reason assertions)
  scripts/test-properties.mjs (validHardDropReasons enum at line ~30)
  scripts/test-cohort-shape.mjs (any reason-based filter)
  scripts/v6-v7-diff.mjs (classifyV7Cause; territory cause classification)
  scripts/test-v6-v7-diff.mjs (cause assertions)
  scripts/test-realdata-fixtures.mjs (any inline assertion)
  scripts/test-fixtures/v7-realdata-fixtures.jsonl (any fixture with hard_drop_reason_expected matching old name — bulk update with revised_in trail)
  
Documentation:
  docs/plans/2026-05-05-v7-consolidated-plan.md (historical reference; mark as "renamed in V8" inline note)
  docs/plans/2026-05-03-production-filter-refinement-design.md §4.6 (territory subsection — update name + add strict-NA framing)
  docs/audits/2026-05-05-v7-implementation-summary.md (reference; add "renamed in V8" inline note)
  docs/audits/2026-05-05-round4-verification-findings.md (reference; same inline note)
  AI_HANDOFF.md (V8 state update)
  docs/STATUS.md (V8 closure entry)
```

Implementation agent: do a `grep -r non_na_territory_with_sales_context` first to confirm exact list. Don't trust this enumeration blindly.

**Token list (EXPANDED v2 per reviewer):**

NON_NA tokens (added countries per reviewer):
- Multi-word region terms (unchanged): `emea`, `europe`, `european union`, `apac`, `asia-pacific`, `asia pacific`, `dach`, `iberia`, `nordics`, `mena`, `middle east`, `latam`, `latin america`, `southeast asia`, `anz`, `gcc`
- Country names (existing): `india`, `japan`, `korea`, `china`, `singapore`, `hong kong`, `taiwan`, `australia`, `new zealand`, `united kingdom`, `mexico`, `brazil`, `argentina`, `germany`, `france`, `spain`, `italy`, `netherlands`, `portugal`, `ireland`, `sweden`, `norway`, `denmark`, `finland`, `poland`, `israel`, `uae`, `saudi arabia`
- **Country names (NEW v2):** `vietnam`, `philippines`, `thailand`, `indonesia`, `malaysia`, `pakistan`, `egypt`, `south africa`, `qatar`, `bahrain`, `peru`, `chile`, `colombia`
- Major non-NA cities: `london`, `paris`, `berlin`, `munich`, `madrid`, `barcelona`, `dublin`, `amsterdam`, `tel aviv`, `sydney`, `melbourne`, `tokyo`, `osaka`, `seoul`, `beijing`, `shanghai`, `bangalore`, `mumbai`, `delhi`, `lisbon`
- Bare 2-letter codes ONLY with delimiters: `\(eu\)`, `\(uk\)`, `[,\-]\s*eu\s*[,\-]`, `[,\-]\s*uk\s*[,\-]`

NA tokens (unchanged from V7-revision-v2): `north america`, `americas`, `naam`, `united states`, `usa`, `u\.s\.`, `america`, `canada`, `canadian`; major NA cities; bare codes with delimiters only.

**Acceptance for V8-A1:**

Cases that MUST drop (12 named + general patterns):
- All Cohere Singapore roles (Round 4 verified preserved cohort)
- All Mistral Singapore / Mistral Paris roles
- All Palantir Europe / Palantir London / Palantir Munich roles
- All H2O APAC roles
- Any company.role pair where role-anchor pattern matches non-NA region
- Anthropic Applied AI Architect, Commercial — India: still drops (now with reason `non_na_territory`)
- Anthropic Applied AI Architect, Commercial — Japan: same

Cases that MUST NOT drop:
- Anthropic Commercial (US): NA, no territory drop
- US AI Engineer at company with global teammates ("we have offices in SF, NY, London, Tokyo"): UNKNOWN or NA, no drop
- Toronto-remote AI Engineer with mention of "global team distributed across EMEA, APAC, Americas": UNKNOWN, no drop
- Multi-region role open to "Toronto, NYC, or London": NA (2 NA anchors vs 1 NON_NA, NA wins)

Negative tests:
- Country-dropdown literal text outside role-content sections: UNKNOWN (must NOT trigger)
- "We serve customers across EMEA, APAC, Americas" in About Us: UNKNOWN (company context, not role base)
- "Working with teams in London and Tokyo" (company context, not role base): UNKNOWN

### V8-A2: `hardSalesTitleRe` extension (W-2, EXPECTATIONS CORRECTED v2)

**File:** `scripts/lib/job-fit-rules.mjs:128` (`hardSalesTitleRe` declaration line — verified via grep)

**Reviewer note (§3 What's Missing):** `\bdirector\b` is already caught by `classifyLevel` as `senior_title` (`scripts/lib/job-fit-rules.mjs:363` `classifyLevel` function; line 368 contains the director regex). So `Account Director`, `Sales Director`, etc. are ALREADY hard-dropping in V7 — just under reason `senior_title`, not `sales_role_title`. V8-A2 mostly REPLACES the drop reason, not adds new drops.

**Genuinely new (not currently hard-dropping anywhere):**
- `Regional Sales Manager` — `Manager` doesn't match any senior level token; `Regional Sales` doesn't match `hardSalesTitleRe`. This is the only ACTUAL new drop from W-2.

**Defense-in-depth (already dropping — V8-A2 just sharpens reason):**
- `Account Director`, `Sales Director`, `Director of Sales`, etc.

**Change:** Extend `hardSalesTitleRe` to:

Add to the alternation:
- `\baccount director\b`
- `\bsales director\b`
- `\bdirector,?\s+sales\b`
- `\bdirector\s+of\s+sales\b`
- `\bregional sales\s+(?:manager|director|representative|specialist)?\b`

**Acceptance:**
- `Account Director` → drops on `sales_role_title` (was: `senior_title`)
- `Strategic Account Director - AI Platform` → drops on `sales_role_title` (was: `senior_title`)
- `Director, Sales` → drops on `sales_role_title` (was: `senior_title`)
- `Sales Director, Enterprise` → drops on `sales_role_title` (was: `senior_title`)
- **`Regional Sales Manager` → drops on `sales_role_title` (NEW — previously kept)**
- `Regional Sales Director` → drops on `sales_role_title` (was: `senior_title`)
- Negative: `Engineering Director` → drops on `senior_title` (NOT `sales_role_title` — this regex must NOT match)
- Negative: `Director of Marketing` → drops on `senior_title` (NOT this regex)

**Predicted impact:** +0-3 net new drops (mostly Regional Sales Manager). Reason re-labeling for ~5-10 already-dropping rows (cosmetic improvement).

### V8-A3: Customer Success Manager policy (W-3, REASONING CORRECTED v2)

**File:** `scripts/lib/job-fit-rules.mjs:128` (`hardSalesTitleRe` — same line as V8-A2)

**Default policy:** (iii) carve-out — CSM titles drop UNLESS title contains AI/Engineer/Architect token.

**Implementation:**

Add to `hardSalesTitleRe`:
- `\bcustomer success (?:manager|director|lead|head)\b`
- `\brenewals?\s+(?:manager|specialist|director)\b`

**Carve-out via prefix-match exception:** before firing CSM rule, check title against carve-out regex `\b(?:AI|ML|Engineer|Engineering|Architect|Solutions|Forward Deployed|Technical|Implementation|Onboarding)\b`. If carve-out matches, do NOT fire the CSM hard-drop.

**Acceptance (CORRECTED v2 per reviewer):**
- `Customer Success Manager` → drops on `sales_role_title` (no carve-out token)
- `Customer Success Manager, AI Platform` → does NOT drop on CSM rule (AI carve-out)
- `Senior Customer Success Manager` → drops on `senior_title` first (Level filter precedes title rule); CSM rule never reaches.
- **`Customer Success Engineer` → does NOT drop on CSM rule because the regex `\bcustomer success (?:manager|director|lead|head)\b` doesn't match "Engineer" — it's a regex-shape consequence, not an explicit carve-out.** Engineer carve-out applies only when the noun IS "Manager/Director/Lead/Head".
- `Customer Success Manager, AI Strategy` → does NOT drop on CSM rule (AI in carve-out)
- `Customer Success Manager, AI Implementation` → does NOT drop on CSM rule (AI + Implementation both in carve-out)
- `Renewals Manager` → drops on `sales_role_title`
- `Customer Onboarding Manager` → does NOT drop on CSM rule (regex requires "success" or "renewal")
- Negative: `Account Coordinator` → does NOT drop (different rule may apply)

**Predicted impact:** +5-15 new drops (CSM titles surfacing in V7 Reviewer Queue).

### V8-A4: Source-hygiene extensions (W-4, audit-driven, SAMPLE EXPANDED v2)

**Files:** `scripts/production-filter-refinement-audit.mjs` `detectSourceHygiene` function

**Sample size (EXPANDED per reviewer §V8-A4):**
- **75 rows from V7 Reviewer Queue** (rows kept, scoring complete, not in Source Repair) — looking for listing-page patterns missed
- **+25 rows from V7 Source Repair Review** (precision check — verify no legitimate JDs are routed to Source Repair as false positives)

**Audit method:**

For each sample row:
1. Check URL patterns: `?location=`, `?dept=`, `?team=`, `?category=`, `?function=`, `/positions`, `/openings`, `/jobs?` without job-ID, redirect domains, social-share links
2. Check cache body: < 1500 chars + title not in body, language switcher chrome, application form HTML, country dropdown lists outside JD content
3. Document each pattern's frequency

**Output:** `docs/audits/2026-05-06-v8-source-hygiene-audit.md` with table:
- Pattern (URL regex or content shape)
- Sample row examples (company / title / URL)
- Occurrences in sampled set
- Recommendation: extend `detectSourceHygiene` / add to hostname blocklist / no action / surface to Will

**Implementation:**
- For high-confidence patterns (≥3 occurrences AND clearly not a real JD): add hygiene rule to `detectSourceHygiene` with reason name, e.g., `query_listing_page` for `?location=`/`?dept=`/`?team=` patterns.
- For ambiguous (1-2 occurrences): document; don't auto-route.
- Each new pattern paired with positive + negative test (V8-B2 fixtures).

**Acceptance:**
- Audit report exists at expected path
- Each new hygiene rule has positive AND negative test
- No false positives in V7 Source Repair Review (precision check confirms ≥95% of routed rows are legitimate non-JDs)

## Track B — Test infrastructure updates

### V8-B1: Real-data fixture revisions (UPDATED IN PLACE per reviewer §5)

**File:** `scripts/test-fixtures/v7-realdata-fixtures.jsonl` (UPDATED IN PLACE — not renamed)

**Per reviewer §V8-B1 question 8:** keeping the file name preserves test-runner references and git history. The `revised_in` array tracks version-by-version changes; renaming would create unnecessary churn.

**Changes:**
- For each fixture whose expected outcome changes under V8 rules:
  - Update `hard_drop_expected`, `hard_drop_reason_expected`, `band_expected`
  - Append to `revised_in` array: `{"version": "V7→V8", "reason": "<change reason>", "previous_expected": {...V7 values...}}`
- Specifically — bulk update fixtures with `hard_drop_reason_expected: "non_na_territory_with_sales_context"` → `"non_na_territory"`.

**New V8 fixtures (CRITICAL — per reviewer §What's Missing item 9):**

Add fixtures for the Round 4 named cohort (must drop in V8):
1. **Cohere Singapore** — fixture from V7 workbook; expected drop on `non_na_territory`
2. **Mistral Singapore** — same
3. **Palantir Europe / Palantir London** — same
4. **H2O APAC** — same

Plus reviewer-recommended canonical fixtures:
5. **Multi-region role open to "Toronto, NYC, London"** — expected NA, no territory drop
6. **Section header `Location: London` (positive)** — expected NON_NA, drop on `non_na_territory`
7. **Account Director (no AI qualifier)** — expected drop on `sales_role_title` (V8-A2)
8. **Customer Success Manager (pure)** — expected drop on `sales_role_title` (V8-A3)
9. **Customer Success Manager, AI Platform** — expected NO drop on CSM rule (V8-A3 carve-out)
10. **Regional Sales Manager** — expected drop on `sales_role_title` (V8-A2 only genuinely new)

**Acceptance:** all fixtures pass strict (50+10 = ~60/60 or 55/55 if some V7 fixtures are deleted as superseded).

### V8-B2: Adversarial fixtures (EXPANDED v2)

**File:** `scripts/test-job-fit-rules.mjs`

**New cases beyond V7-B2's 18:**

| # | Case | Expected | Source |
|---|------|----------|--------|
| 19 | Country-dropdown literal in role-content section header → still UNKNOWN | UNKNOWN (negative) | Reviewer: critical edge case |
| 20 | Country-dropdown literal text outside role-content sections → UNKNOWN | UNKNOWN (negative) | Reviewer §1 |
| 21 | US JD: "we have offices in London and Tokyo" in About Us section | UNKNOWN (negative) | Reviewer §V8-A1 |
| 22 | "Distributed remote team with members across Europe and Asia" in About | UNKNOWN (negative) | Reviewer |
| 23 | "Role is based out of London office, with quarterly travel to NYC" | NON_NA (positive — London is role base) | Reviewer §V8-A1 |
| 24 | "Hybrid: Toronto, Canada" | NA | Reviewer |
| 25 | **`Location: London` section header (positive)** | NON_NA, drops on `non_na_territory` | Reviewer §What's Missing #6 (canonical missing case) |
| 26 | **Multi-region body-tie: "Toronto, NYC, or London"** | NA (2 NA + 1 NON_NA = NA wins) | Reviewer §What's Missing #1 (canonical missing case) |
| 27 | Anthropic SF role with title "Applied AI Architect, Americas" | NA (Americas anchor in title) | Reviewer |
| 28 | Cohere Singapore JD with "based in our Singapore office" in Responsibilities | NON_NA, drop | Reviewer named cohort |
| 29 | Account Director (no AI) → drops on `sales_role_title` | drop | V8-A2 |
| 30 | Account Director, AI Platform → drops on `sales_role_title` | drop (no CSM-style carve-out for AE/AM) | V8-A2 + Will's AE/AM strict directive |
| 31 | Customer Success Manager → drops on `sales_role_title` | drop | V8-A3 |
| 32 | Customer Success Manager, AI Platform → does NOT drop on CSM rule | keep | V8-A3 carve-out |
| 33 | Customer Success Engineer → does NOT drop on CSM rule (regex shape) | keep | V8-A3 reasoning |
| 34 | Director of Marketing → does NOT drop on V8-A2 regex (drops on senior_title) | senior_title only | V8-A2 negative |
| 35 | Regional Sales Manager → drops on `sales_role_title` (NEW genuinely-new behavior) | drop | V8-A2 only-new |

**Total V8-B2 fixtures: 18 (V7) + 17 (V8 new) = 35 cases.**

### V8-B3: Property tests (REASON RENAME APPLIES PER REVIEWER §5)

**File:** `scripts/test-properties.mjs`

**Updates:**
- **`validHardDropReasons` enum: replace `non_na_territory_with_sales_context` with `non_na_territory`** (reviewer §5 — V8-B3 is NOT "no changes" — the rename forces this enum update).
- **Add new V8 invariant:** for 100 random rows from V8 workbook: if `territory_region === "NON_NA"` then `hard_drop === true` AND `hard_drop_reason` includes `non_na_territory`. Codifies the strict-NA gate.

**Existing 7 invariants retained as-is** (type, range, implication, source-repair contract, family-base correspondence, set-membership using split-and-every, determinism).

### V8-B4: Cohort-shape range updates (TIGHTENED v2)

**File:** `scripts/test-cohort-shape.mjs`

**Range updates from V7 → V8 (TIGHTENED per reviewer §3):**

```js
// Sales hard drops: V7=80; V8 expected +5-15 (W-3 CSM additions; W-2 mostly reason-relabeling)
assertBetween(v8Summary.sales_hard_drops, 80, 100, "sales_hard_drops V7=80, V8 expected with W-2/W-3 additions (mostly W-3 CSM)");

// Territory hard drops: V7=7, ~12 named + handful from new role-anchor patterns = ~19, ±6 tolerance
assertBetween(v8Summary.territory_hard_drops, 16, 25, "territory_hard_drops V7=7, V8 expected ~19 with strict-NA (12 named cohort + role-anchors)");

// Total shadow hard drops: V7=505, V8 +13-25 expected (territory expansion + W-3 CSM + W-4 source-hygiene)
assertBetween(v8Summary.shadow_hard_drops, 510, 540, "shadow_hard_drops V7=505, V8 ±5%");

// Source repair: V7=184, V8 may add 5-15 from W-4 audit; precision check should not over-route
assertBetween(v8Summary.source_repair_rows, 180, 210, "source_repair_rows V7=184, V8 with W-4 extensions");

// Other metrics: same ranges as V7
assertBetween(v8Summary.location_hard_drops, 340, 380, "stable");
assertBetween(v8Summary.yoe_hard_drops, 140, 160, "stable");
assertBetween(v8Summary.comp_hard_drops, 0, 5, "stable");
assertBetween(v8Summary.validation_findings_review_only, 0, 4, "stable");
assertEq(v8Summary.validation_findings_blocking, 0, "no blocking");
assertBetween(v8Summary.pipeline_rows, 925, 940, "stable");
assertEq(v8Summary.baseline_excel_sha, "7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e", "baseline preserved");
```

**Key tightening:** `territory_hard_drops` from `[18, 35]` → `[16, 25]` per reviewer §3 (admits silent over-fire risk if too wide).

## Reason rename cascade (NEW SECTION v2)

The reviewer flagged this as a missing item. The string `non_na_territory_with_sales_context` must be replaced with `non_na_territory` across all references. Implementation agent MUST:

1. Run `grep -r non_na_territory_with_sales_context` to enumerate exact file list (don't trust the plan's enumeration blindly)
2. For each file:
   - **Code files** (`scripts/`): replace literal string occurrences
   - **Test files**: update assertions accordingly
   - **Fixture file**: bulk update `hard_drop_reason_expected` for affected fixtures, append `revised_in` entry
   - **Documentation**: add inline note "renamed to `non_na_territory` in V8" (don't rewrite history; preserve V7 context)
   - **Plan v2 of V7**: add an inline note in §V7-A3 indicating reason was renamed in V8

3. Verify post-rename: `grep -r non_na_territory_with_sales_context` returns ONLY the inline doc notes — no code references

Estimated touch: 17 files per reviewer, but verify with grep.

## Out of V8 scope (explicit deferrals)

Same as v1:
- F-005 (31 missing-cache enrichment) → V1.1 enrichment workstream
- F-010 (company name normalization) → optional V9
- `hard_drop ⇒ band=C` enforcement → optional V9
- Round 4 attribution gap (`classifyV7Cause` reason changes) → V9 if needed

## Acceptance criteria (overall — EXPANDED v2)

- All test suites pass: ~1,260+ assertions
- V8 workbook generated; baseline SHA unchanged
- New `non_na_territory` reason replaces `non_na_territory_with_sales_context` across 17 files; grep confirms
- V7 → V8 diff workbook tags every hard_drop change to V8-A1/A2/A3/A4 (no silent flips)
- **Strict-NA verified by data:** the 12 currently-kept non-NA roles from V7 (Cohere Singapore, Mistral Singapore, Palantir Europe, H2O APAC, etc.) drop in V8 with reason `non_na_territory`
- **No false-positive regressions:** US-rooted roles with global-team mentions in V7 (sampled 5+) still don't drop in V8
- **Multi-region tie verified:** "Toronto, NYC, or London" type roles → NA, no drop
- **W-4 audit report exists** at `docs/audits/2026-05-06-v8-source-hygiene-audit.md`
- **W-4 precision check passes:** ≥95% of V7 Source Repair Review rows are legitimate non-JDs (not real fits incorrectly routed)
- Documentation cascade complete (design plan §4.6, AI_HANDOFF.md, STATUS.md)
- **Round 5 verification confirms** all above

## Sign-off checklist (EXPANDED v2)

| # | Item | Status |
|---|------|--------|
| 1 | V8-A1 token-scan retained AND role-anchor patterns added (additive, not replacing) | TODO |
| 2 | V8-A1 `SECTION_ALIASES` extended in `scripts/lib/jd-sections.mjs:4-35` | TODO |
| 3 | V8-A1 `recognizedTypes` extended to include `location` in `scripts/lib/job-fit-rules.mjs:314` | TODO |
| 4 | V8-A1 multi-region tie rule defined and tested | TODO |
| 5 | V8-A1 reason renamed across 17 files (grep-confirmed) | TODO |
| 6 | V8-A1 NON_NA token list expanded with 13 countries | TODO |
| 7 | V8-A1 negative tests for company-context patterns | TODO |
| 8 | V8-A2 `hardSalesTitleRe` extended for Director-level + Regional Sales Manager | TODO |
| 9 | V8-A2 expected impact correctly described as "mostly reason-relabel + Regional Sales Manager genuinely new" | DONE (in plan v2 acceptance) |
| 10 | V8-A3 CSM rule with carve-out implemented; reasoning correctly framed (regex shape, not explicit Engineer carve-out logic) | TODO |
| 11 | V8-A4 audit report produced (75+25 sample) | TODO |
| 12 | V8-A4 source-hygiene extensions implemented with positive AND negative tests | TODO |
| 13 | V8-A4 precision check on V7 Source Repair Review (≥95% legit non-JDs) | TODO |
| 14 | V8-B1 fixtures updated IN PLACE with `revised_in` audit trail | TODO |
| 15 | V8-B1 new fixtures added: Round 4 cohort (4) + reviewer canonical missing (3) + V8-A2/A3 cases (3) = 10 new | TODO |
| 16 | V8-B2 35 adversarial fixtures total (V7's 18 + V8's 17) | TODO |
| 17 | V8-B3 `validHardDropReasons` enum updated (rename) + new NON_NA-implies-drop invariant | TODO |
| 18 | V8-B4 `territory_hard_drops` range tightened to `[16, 25]` per reviewer §3 | TODO |
| 19 | Documentation cascade (design plan §4.6 strict-NA, AI_HANDOFF.md, STATUS.md) | TODO |
| 20 | INDEX registers all new files | TODO |
| 21 | V7→V8 diff workbook + summary | TODO |

## Predicted V8 metrics

| Metric | V7 | V8 prediction | Reasoning |
|--------|----|--------------|-----------|
| pipeline_rows | 933 | 933 | No new dedup |
| shadow_hard_drops | 505 | 510-540 | V8-A1 +12-19 territory; V8-A2 +0-3 (Regional Sales Mgr only); V8-A3 +5-15 CSM; V8-A4 +0-15 source-hygiene |
| sales_hard_drops | 80 | 80-100 | W-2 mostly reason-relabel; W-3 CSM adds 5-15 |
| **territory_hard_drops** | **7** | **16-25** | Strict-NA gate; +12 named cohort + role-anchor expansion |
| source_repair | 184 | 180-210 | W-4 extensions add 0-15; precision check may identify some misroutes |
| validation_findings | 0 | 0-2 | Stable |
| comp_hard_drops | 1 | 0-5 | Stable |
| yoe_hard_drops | 148 | 140-160 | Stable |
| location_hard_drops | ~350 | 340-380 | Stable |
