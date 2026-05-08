---
status: active
type: audit
owner: plan-verification-agent
last-updated: 2026-05-05T19:30:00-04:00
read-if: "you are deciding whether v2 of the V7 plan is ready for execution"
skip-if: "V7 already executed"
related:
  - docs/plans/2026-05-05-v7-consolidated-plan.md
  - docs/audits/2026-05-05-v7-plan-review.md
---

# V7 Plan v2 Verification

## Verdict

**APPROVE_FOR_EXECUTION**

All 18 sign-off items are correctly addressed in v2. Plan §V7-A1 carries Round 3's broader regex verbatim and the acceptance list explicitly enumerates the four variants the v1 review flagged as missed. §V7-A2 adopts the simpler literal `sales territory` form and explicitly states the non-acceptance for Anthropic India/Japan rows. §V7-A3 drops the unimplementable `SALES, AE_HYBRID` family clause (verified against `FAMILY_BASE` at `scripts/lib/job-fit-rules.mjs:8-18`), resolves `mexico` to NON_NA only, removes nationality adjectives + bare 2-letter codes, specifies UNKNOWN as the section-failure default, and adds the three Shadow Decisions columns. §V7-B3 fixes the substring-typo bug with `split(";").map(s=>s.trim()).every(...)`, drops the false `hard_drop ⇒ band C` invariant, and adds determinism / family-base correspondence / source-repair contract. §V7-B4 ranges match v1's recommendations exactly: `[78,92]`, `[10,30]`, `[476,526]`. Workflow Step 0 V6 baseline preflight is added. Documentation cascade and regression-baseline gate appear in Acceptance. No new defects detected during review of the regex character-by-character or the token-list delimiter shapes. Internally consistent. Ready for V7 implementation.

## 18-Item Sign-Off Checklist Verification

| # | Item | v2 Status | Evidence |
|---|------|-----------|----------|
| 1 | V7-A1 regex broadened | PASS | Plan §V7-A1 line 93 contains `pre[-\s]?sales\b\s+(?:solutions?\|technical\|systems?\|principal\|senior\|junior\|associate)?\s*(?:engineer\|architect\|consultant\|specialist)\b` — Round 3's exact form. Mental run vs all five variants: `Presales Engineer` (`pre[-\s]?` matches empty, `sales` literal, `\s+` matches space, optional adj empty, `engineer`) ✓; `Pre Sales Architect` (`pre[-\s]?` matches space, etc.) ✓; `Pre-Sales Specialist` ✓; `Pre-Sales Technical Engineer` (`technical` is in inner alternation, `\s*` matches space, `engineer`) ✓; `Pre-Sales Solutions Engineer` (`solutions?` matches `Solutions`) ✓. Negative: `Sales Engineering Manager` — the alternation also has bare `sales engineer`, but `\b` after `engineer` won't match before `ing` (both word chars); does NOT match. Acceptance list (lines 97-105) enumerates all five variants explicitly. |
| 2 | V7-A2 simplified | PASS | Plan §V7-A2 lines 117-120 use literal `\bsales territory\b` (not 15-30-char proximity). Line 125 explicitly states "This fix does NOT flip Anthropic India/Japan rows — they still drop at AI_ENGINEERING family threshold 4 per Round 3 §3 recomputation. Territory drops are V7-A3's job." |
| 3 | V7-A3 gate fixed | PASS | Plan §V7-A3 line 170 gates on `(territory.region === "NON_NA")` AND `(has_hard_sales_title \|\| sales_role_signal_present)`. Line 177 explicitly notes: "REMOVED from v1 gate: ❌ `primary_family ∈ {SALES, AE_HYBRID}` — these families don't exist in `FAMILY_BASE` at `scripts/lib/job-fit-rules.mjs:8-18`". Verified against actual code: `FAMILY_BASE` at lines 8-18 contains only `SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE`, `AI_ENGINEERING`, `AI_PROGRAM_OPS`, `PRODUCT_AI`, `AI_EVAL`, `CONSULTING_ADVISORY`, `CREATIVE_AI`, `GENERIC_ENGINEERING_REVIEW`, `UNKNOWN`. No `SALES` or `AE_HYBRID`. v1 was indeed unimplementable; v2 fix is correct. |
| 4 | V7-A3 token list cleaned | PASS | Plan lines 154 ("**`mexico`: NON_NA only**") + 156-160 (REMOVED list: bare `us`/`eu`/`uk`/`nam`; nationality adjectives `indian`/`japanese`/`korean`/`chinese`; `mexico` from NA list). Country names retained (line 151). Multi-word region terms retained (lines 148, 152). 2-letter codes only with delimiters (lines 145, 149). |
| 5 | V7-A3 default-fallback | PASS | Plan §V7-A3 line 167: "Fallback when section detection fails: if `parseJdSections` returns no recognized sections, default to UNKNOWN — NOT whole-body scan. This is the critical guard against country-dropdown contamination." Echoed at acceptance line 194. |
| 6 | V7-A3 columns added | PASS | Plan §V7-A3 lines 179-183 add `territory_region`, `territory_evidence`, `territory_dropped` to Shadow Decisions sheet, with rationale. Acceptance line 436 also requires these columns. |
| 7 | V7-B3 split-and-every | PASS | Plan §V7-B3 lines 364-366: `const reasons = String(result.hard_drop_reason \|\| "").split(";").map(s => s.trim()).filter(Boolean); assert(reasons.every(r => validHardDropReasons.includes(r)), ...)`. The fragile `.includes(r)` substring check from v1 is replaced. |
| 8 | V7-B4 ranges tightened | PASS | Plan §V7-B4: `sales_hard_drops` 78-92 (line 393); `territory_hard_drops` 10-30 (line 401); `shadow_hard_drops` 476-526 (line 412). Matches v1's recommendations exactly. |
| 9 | Workflow Step 0 added | PASS | Plan §Workflow lines 58-63: "Step 0 — V6 baseline preflight (NEW in v2)" — runs V6 test suites, verifies SHA `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`, regenerates V6 workbook, "If any check fails: STOP. Resolve baseline drift before V7." Failure path is specified. |
| 10 | Country-dropdown negative test | PASS | V7-B2 case #1 (commercial_ownership variant) at line 300; V7-B2 case #14 (territory variant) at line 313; acceptance line 193 names the canary JD as Anthropic Commercial (USA). Both flavors covered. |
| 11 | Documentation cascade | PASS | Workflow Step 8 (lines 76-79) lists doc updates. Acceptance lines 441-445 gate on: design plan §4.6 territory-policy subsection, AI_HANDOFF.md V7 state update, STATUS.md V7 closure entry, INDEX. Timing: docs updated DURING workflow Step 8, BEFORE Round 4 verification (line 446). Order is correct. |
| 12 | Lattice fixture | PASS | V7-B2 case #15 at line 314: "Lattice-shape per-label aggregation: AI_PROGRAM_OPS row with `sales_department` alone (no corroborator) does NOT fire `sales_role_content`". Sourced to Round 3 §Regression Detection. |
| 13 | V7-B3 new invariants | PASS | Determinism at lines 369-371; family-base correspondence at lines 345-348; source-repair contract at lines 341-342. Invalid `hard_drop ⇒ band null or C` invariant explicitly removed at lines 374-375 with rationale. |
| 14 | V7-A5 CSM carve-out | PASS | Plan §V7-A5 line 224: "`Customer Success Manager` → does NOT drop at title level (CSM is not in `hardSalesTitleRe`); content-level drop possible". Verified against `hardSalesTitleRe` at `scripts/lib/job-fit-rules.mjs:118` — CSM not present. |
| 15 | V7-B1 strict 50/50 | PASS | Plan §V7-B1 line 282: "**50/50 fixtures match expected outcome** (no slop budget)". Schema at line 263 includes `expected_failure: false` and `expected_failure_reason: null` fields. Parallel assertion (line 284) verifies expected_failure markers match outputs. |
| 16 | V7-B2 Pre-Sales variants | PASS | V7-B2 cases #5-#8 (lines 304-307) cover Presales Engineer, Pre Sales Architect, Pre-Sales Specialist, Pre-Sales Technical Engineer. Section-failure fallback test at case #18 (line 317). |
| 17 | Regression-baseline gate | PASS | Acceptance line 440: "running V7's audit against V6's pipeline.md produces V6 outcomes for all rows EXCEPT those whose change is attributable to a specific V7-Ax. For each V6→V7 hard_drop status flip, an audit-script log line tags the responsible V7-Ax change. No silent flips." |
| 18 | Sales-metric clarification | PASS | Plan §V7-B4 line 416: "the audit's `sales_hard_drops` metric (`scripts/production-filter-refinement-audit.mjs:461`) filters by `/sales_role/.test(hard_drop_reason)`. The new reason `non_na_territory_with_sales_context` does NOT contain `sales_role`, so territory drops will NOT count toward `sales_hard_drops`. They will count toward a new `territory_hard_drops` metric, defined as: `decisions.filter(d => /non_na_territory/.test(d.hard_drop_reason)).length`. This must be wired into the audit script." Verified against actual code at line 461 (`/sales_role/.test(d.hard_drop_reason)`) — claim is accurate. |

## New Defects Detected (if any)

None. Specifically checked:

- **Token-list delimiter shape `[,\-\s]us[,\-\s]`**: would NOT match "anus" (preceding `n` is not `[,\-\s]`), "fuss" (no leading `[,\-\s]` before `us`), "thus" (preceding `h` not in class), "bus" (`b` not in class). Pattern is safe.
- **V7-A1 regex on `Sales Engineering Manager`**: bare `sales engineer` is in the alternation, but `\bsales engineer\b` requires a word boundary after `engineer`. In `engineering` the `r→i` transition is word-char to word-char, so no boundary, no match. Safe.
- **V7-A1 regex on `Sales Pre-Engagement Architect`**: requires `pre-sales` literal prefix; this string has `sales` first then `pre`, so the disjunct `pre[-\s]?sales\b...` does not match. The bare `sales engineer` disjunct does not match (`engagement` ≠ `engineer`). Safe.
- **V7-A1 regex on `Pre-Sales SDR`**: `pre-sales` matches, then `\s+`, optional adj empty, `\s*`, then needs `engineer|architect|consultant|specialist` — `SDR` is none. So this branch does not match. But `sdr` is in the broader `hardSalesTitleRe` alternation (line 118 of code: `bdr|sdr`), so the row drops via that path. Defense-in-depth — fine.
- **Acceptance criteria internal consistency**: V7 metric predictions (lines 455-465) sit inside V7-B4 ranges. Sales 78-92 covers the predicted 78-92. Territory 10-30 covers the predicted 10-30. Shadow 476-526 covers the predicted 480-525. Internally consistent.
- **Reason naming convention**: existing reasons follow loose `<category>_<modifier>` (e.g., `sales_role_content`, `hybrid_non_toronto_no_remote`, `yoe_required_gt_5`). The new `non_na_territory_with_sales_context` is descriptive, parseable, and the prefix `non_na_territory_` cleanly drives the new metric regex `/non_na_territory/`. Consistent enough.
- **Workflow Step 0 failure path**: line 63 explicitly says "STOP. Resolve baseline drift before V7." Specified.
- **Documentation cascade timing**: Step 8 (docs) precedes Round 4 verification (acceptance step). Acceptance line 446 gates on Round 4 confirming docs are complete. Order is correct.

## Counterexamples / Edge Cases

None found. The five Pre-Sales variants explicitly listed in §V7-A1 acceptance all match. The negative `Sales Engineering Manager` case does not match. The country-dropdown false-positive case is covered by both V7-B2 case #1 (commercial_ownership) and case #14 (territory). The section-failure fallback is specified (UNKNOWN, not whole-body scan) and tested via V7-B2 case #18.

## Recommendation

Ready to launch V7 implementation agent. No revisions required.

## Final Sign-Off

| Check | Status |
|-------|--------|
| All 18 items PASS | YES (18/18) |
| No new defects | YES |
| Internally consistent | YES |
| Ready for V7 implementation | YES |
