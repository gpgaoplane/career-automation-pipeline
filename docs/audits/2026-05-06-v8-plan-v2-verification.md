---
status: active
type: audit
owner: plan-verification-agent
last-updated: 2026-05-06T13:30:00-04:00
read-if: "you are deciding whether v2 of the V8 plan is ready for execution"
skip-if: "V8 already executed"
related:
  - docs/plans/2026-05-06-v8-consolidated-plan.md
  - docs/audits/2026-05-06-v8-plan-review.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/lib/jd-sections.mjs
  - scripts/test-properties.mjs
  - scripts/test-fixtures/v7-realdata-fixtures.jsonl
---

# V8 Plan v2 Verification

## Verdict

**REQUIRES_MINOR_REVISIONS**

v2 successfully resolves all three v1 BLOCKING items and addresses the substance of all 9 missing items. The 21 sign-off checklist items are internally consistent with the plan body. However, **the plan repeats two incorrect line-number citations from the v1 review** (`scripts/lib/job-fit-rules.mjs:207` and `:118`) — these are wrong in source code, and an implementation agent following the plan literally will look at the wrong lines. The reason-rename cascade enumeration is also off by one (claims 17 files; grep shows 16, of which 2 are the plan/review themselves and 1 is a verification audit — really 13 implementation-touch files). Two cosmetic naming mismatches (`validHardDropReasons` vs actual `VALID_HARD_DROP_REASONS`). None of these block intent — the plan is conceptually ready — but a 5-minute pass to fix line numbers and update the cascade count would prevent implementation-agent confusion.

---

## v1 Review's 3 BLOCKING Items

| # | Item | v2 Status | Evidence |
|---|------|-----------|----------|
| 1 | Detector mechanics REPLACE/AUGMENT/COEXIST ambiguity | **PASS** | Plan §V8-A1 "Detector mechanics (CLARIFIED v2)" lines 101-114 explicitly state "AUGMENTS this — it does NOT replace it." Step 1 enumeration is clear: existing token-scan retained (point 1), new role-anchor pattern layer additive (point 2). Sign-off item #1 reflects this. |
| 2 | `SECTION_ALIASES` + `recognizedTypes` extension | **PASS** | Plan Step 1a (lines 116-126) explicitly extends `SECTION_ALIASES` with concrete additions ("Your Impact" / "The Role" / "Job Details" / "The Position" → `responsibilities`; "Where you'll work" / "Office" → `location`). Step 1b (lines 128-134) explicitly extends `recognizedTypes` to add `"location"`. Both are concrete code changes, not vague wording. Sign-off items #2 and #3 confirm. |
| 3 | `territory_hard_drops` range too wide | **PASS** | Plan §V8-B4 line 401 sets `assertBetween(v8Summary.territory_hard_drops, 16, 25, ...)`. Predicted V8 metrics table (line 492) consistent. Sign-off item #18 confirms tightening to `[16, 25]`. |

---

## v1 Review's 9 Missing Items

| # | Item | v2 Status | Evidence |
|---|------|-----------|----------|
| 4 | Multi-region body-tie rule for "Toronto, NYC, or London" | **PASS** | Plan §V8-A1 "Disambiguation rule (clarified)" lines 109-114: "Tie or majority NA → NA (default-permissive)". Worked example included ("2 NA anchors + 1 NON_NA anchor → NA"). Sign-off #4 confirms. |
| 5 | Reason rename cascade enumeration | **PARTIAL** | Plan §"Reason rename cascade" (lines 421-435) and Step 1e (lines 168-194) enumerate the file list. Includes the v1 reviewer-named files (test-properties.mjs, v6-v7-diff.mjs, fixtures). **Defect:** plan claims "17 files" but actual `grep -r non_na_territory_with_sales_context` returns 16 matches; of those, 2 are the plan and review docs themselves and 1 is a verification audit, leaving ~13 actually-touched files. Plan does say "verify with grep" (line 435), so the enumeration is presented as guidance, not authoritative — but the headline number is wrong. |
| 6 | V8-A2 expected-impact correction | **PASS** | Plan §V8-A2 lines 229-260 explicitly acknowledge the redundancy ("V8-A2 mostly REPLACES the drop reason, not adds new drops"); table of "already dropping vs genuinely new" included; corrected prediction at line 260 ("+0-3 net new drops"). **However** plan cites `scripts/lib/job-fit-rules.mjs:207` for `classifyLevel director` — this is WRONG. Actual `classifyLevel` is at line 363 and the `\bdirector\b` regex is at line 368. Line 207 in actual source is `hard_drop: false` inside `classifySalesRole`. Substance is correct; line number citation is wrong. Sign-off #9 marked DONE. |
| 7 | V8-A3 CSM acceptance reasoning correction | **PASS** | Plan §V8-A3 line 280 explicitly states "the regex `\bcustomer success (?:manager|director|lead|head)\b` doesn't match 'Engineer' — it's a regex-shape consequence, not an explicit carve-out." Matches reviewer's framing precisely. Sign-off #10 confirms. |
| 8 | V8-B3 enum update for renamed reason | **PASS** | Plan §V8-B3 line 385 explicitly: "`validHardDropReasons` enum: replace `non_na_territory_with_sales_context` with `non_na_territory`." Sign-off #17 confirms. **Cosmetic defect:** actual code uses `VALID_HARD_DROP_REASONS` (uppercase snake_case) at `scripts/test-properties.mjs:43`, not `validHardDropReasons` (camelCase) as plan/review name it. Implementation agent will find it via grep but the named identifier is misquoted. |
| 9 | V8-B2 missing canonical cases | **PASS** | Plan §V8-B2 row #25 ("`Location: London` section header positive → NON_NA, drops") and row #26 ("Multi-region body-tie: 'Toronto, NYC, or London' → NA, no drop") both present in the table at lines 366-367. |
| 10 | NON_NA token list expansion | **PASS** | Plan §V8-A1 "Token list (EXPANDED v2)" line 201: 13 countries listed exactly (vietnam, philippines, thailand, indonesia, malaysia, pakistan, egypt, south africa, qatar, bahrain, peru, chile, colombia). Sign-off #6 confirms. |
| 11 | V8-A4 sample size | **PASS** | Plan §V8-A4 lines 293-296 explicitly: "75 rows from V7 Reviewer Queue" + "25 rows from V7 Source Repair Review (precision check)". Steps 4a-4b reflect this. Sign-off #11 confirms. |
| 12 | Round 4 named cohort fixtures | **PASS** | Plan §V8-B1 "New V8 fixtures (CRITICAL)" lines 336-340 explicitly add Cohere Singapore (#1), Mistral Singapore (#2), Palantir Europe / London (#3), H2O APAC (#4). Sign-off #15 confirms. |

---

## v2 Sign-Off Checklist Verification

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Token-scan retained AND role-anchor patterns added | PASS | Mechanics §1-2 (lines 105-107) consistent. |
| 2 | `SECTION_ALIASES` extended at jd-sections.mjs:4-35 | PASS | Line numbers verified — `SECTION_ALIASES` is at lines 4-35 in source. |
| 3 | `recognizedTypes` extended to include `location` at job-fit-rules.mjs:314 | PASS | Line 314 verified — actual source: `const recognizedTypes = new Set(["responsibilities", "requirements"]);` |
| 4 | Multi-region tie rule defined and tested | PASS | Defined in §V8-A1 disambiguation; tested via V8-B2 row #26. |
| 5 | Reason renamed across 17 files (grep-confirmed) | PARTIAL | Headline count wrong (16 not 17; only 13 implementation-touch files). Plan instructs grep-verify, so safe in practice. |
| 6 | NON_NA token list expanded with 13 countries | PASS | All 13 countries listed. |
| 7 | Negative tests for company-context patterns | PASS | V8-B2 rows #20-22 cover this. |
| 8 | `hardSalesTitleRe` extended for Director-level + Regional Sales Manager | PASS | §V8-A2 line 248 lists alternation additions. |
| 9 | V8-A2 expected impact correctly described | PASS | Line 260 explicitly says "+0-3 net new drops (mostly Regional Sales Manager). Reason re-labeling for ~5-10 already-dropping rows." Marked DONE in checklist. |
| 10 | V8-A3 CSM rule with carve-out + correct framing | PASS | Acceptance line 280 correctly framed. |
| 11 | V8-A4 audit report (75+25 sample) | PASS | Steps 4a-4b match. |
| 12 | V8-A4 source-hygiene extensions with positive AND negative tests | PASS | Step 4e + acceptance line 317. |
| 13 | V8-A4 precision check on V7 Source Repair Review | PASS | §V8-A4 acceptance line 318 (≥95%). |
| 14 | V8-B1 fixtures UPDATED IN PLACE (not renamed) | PASS | Scope line 46 + §V8-B1 line 324 explicitly "UPDATED IN PLACE (not renamed)". Cross-check: workflow Step 5 line 82 also says "Update V7 fixtures in place" — internally consistent. No "rename" instruction anywhere. |
| 15 | New fixtures: 4 Round 4 cohort + 3 reviewer canonical + 3 V8-A2/A3 cases = 10 total | PASS | §V8-B1 lists exactly 10 new fixtures (numbered 1-10). |
| 16 | V8-B2: 35 adversarial fixtures (V7's 18 + V8's 17) | PASS | Table runs rows 19-35, matching count. |
| 17 | `validHardDropReasons` enum updated + new NON_NA-implies-drop invariant | PASS | §V8-B3 lines 385-386. (Cosmetic: actual identifier is `VALID_HARD_DROP_REASONS`.) |
| 18 | `territory_hard_drops` range tightened to `[16, 25]` | PASS | §V8-B4 line 401 confirms. |
| 19 | Documentation cascade | PASS | Listed in scope + workflow Step 10. |
| 20 | INDEX registers all new files | PASS | Workflow Step 11. |
| 21 | V7→V8 diff workbook + summary | PASS | Workflow Steps 8 + 12. |

---

## New Defects Detected

### D1 (LOW — line-number errors, repeated from v1 review)

Plan v2 cites `scripts/lib/job-fit-rules.mjs:207` for `classifyLevel director` (line 233) and `:118` for `hardSalesTitleRe` (lines 232, 264). Both are wrong:

- **Actual `hardSalesTitleRe`:** line **128** (verified: `const hardSalesTitleRe = /\b(account executive|...`).
- **Actual `classifyLevel`:** line **363** (`export function classifyLevel`); the `\bdirector\b` regex is at line **368**.
- Line 118 in actual source is a comment about V7-A1 broadened sales title regex.
- Line 207 in actual source is `hard_drop: false` inside `classifySalesRole`'s `weakPartnerOnly` branch.

These were errors inherited from the v1 review (which also had them wrong) and not corrected during v2 revision. Implementation agent following the plan literally will scroll to wrong lines. Substance of all V8-A2 / V8-A3 changes is correct; only the line-anchor citations are wrong.

### D2 (LOW — file-count overstatement)

Plan claims rename cascade touches "17 files" (line 168, 194, 423, 435, sign-off #5). Actual `grep -r non_na_territory_with_sales_context` returns **16 files**. Of those:
- 2 are the v8 plan + v8 review themselves (will self-update on rename)
- 1 is `docs/audits/2026-05-05-v7-plan-v2-verification.md` (historical — should NOT be touched per plan §"Documentation: add inline note")
- That leaves ~13 implementation-touch files.

Plan does instruct "Implementation agent: do a `grep -r` first to confirm exact list. Don't trust this enumeration blindly" (line 194), which mitigates the count error. Cosmetic.

### D3 (LOW — identifier name mismatch)

Plan refers to `validHardDropReasons` (camelCase). Actual identifier in `scripts/test-properties.mjs:43` is `VALID_HARD_DROP_REASONS` (UPPER_SNAKE). Implementation agent will find it via grep regardless.

### D4 (LOW — role-anchor pattern false-positive risk acknowledged but not mitigated in plan)

Pattern `\bbased\s+(?:in|out\s+of)\s+(?:our|the)?\s*([\w\s,]{3,40}?)(?:\.|,|;|$)` matches "we have customers based in EMEA" if it appears inside a `recognizedTypes` section (now expanded to include `location` and indirectly via SECTION_ALIASES extension to "Your Impact" / "The Role"). The plan's mitigation is structural — section-targeting + body-tie default-NA — but no explicit anchor disambiguates "role base" from "company customer base". Test row #20 ("US JD: 'we have offices in London and Tokyo' in About Us section") covers the about_company case but not the case where company-base language leaks into a `responsibilities`-aliased section. This is acceptable risk given V8's UNKNOWN-default conservatism, but worth surfacing.

### D5 (LOW — Step 1e ordering vs Step 1f)

Step 1e (rename cascade) precedes Step 1f (V8-A1 unit tests). Unit tests reference the new reason name. Ordering is correct: rename first, then write tests against new name. **No defect** — flagged only because the prompt asked to verify.

### D6 (none — token list completeness)

Plan adds 13 non-NA countries. Cities mentioned in v1 review (Geneva, Zurich, Stockholm, Helsinki, Warsaw, Prague, Vienna, Moscow, Istanbul, Sao Paulo, Mexico City, Lima) are NOT all added. However, plan's existing list already covers `lisbon`, `dublin`, `tel aviv`, `madrid`, `barcelona`, `amsterdam`. Country-level coverage (which catches roles regardless of city) is the more durable signal. **Acceptable** — diminishing returns on city expansion when country tokens already catch the territory.

### D7 (none — predicted impact vs cohort range consistency)

V8-B4 territory_hard_drops `[16, 25]` matches §"Predicted V8 metrics" `16-25`. shadow_hard_drops `[510, 540]` matches `510-540`. Internally consistent.

---

## Recommendation

**REQUIRES_MINOR_REVISIONS** — three small fixes recommended before launch, none blocking:

1. **Fix line-number citations:** change `scripts/lib/job-fit-rules.mjs:207` → `:368` (for `\bdirector\b`); `:118` → `:128` (for `hardSalesTitleRe`). Affects plan lines 232, 233, 264.
2. **Update file count:** change "17 files" to "~13 implementation files (grep-verify)" in plan §"Reason rename cascade" + sign-off #5.
3. **Fix enum identifier name:** `validHardDropReasons` → `VALID_HARD_DROP_REASONS` in §V8-B3 line 385 and sign-off #17.

If the orchestrator is comfortable letting the implementation agent rely on grep (the plan does instruct it), these are cosmetic — V8 can launch as-is. The substance of all 12 BLOCKING+missing items is correctly addressed and the 21 sign-off items are internally consistent.
