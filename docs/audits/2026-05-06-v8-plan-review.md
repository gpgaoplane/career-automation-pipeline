---
status: active
type: audit
owner: plan-reviewer-agent
last-updated: 2026-05-06T15:30:00-04:00
read-if: "you are deciding whether to execute V8 as written, or to revise the plan first"
skip-if: "V8 already implemented"
related:
  - docs/plans/2026-05-06-v8-consolidated-plan.md
  - docs/plans/2026-05-05-v7-consolidated-plan.md
  - docs/audits/2026-05-05-v7-implementation-summary.md
  - docs/audits/2026-05-05-round4-verification-findings.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/lib/jd-sections.mjs
  - scripts/production-filter-refinement-audit.mjs
---

# V8 Plan Review

## Verdict

**REVISE_BEFORE_EXECUTION**

V8's central change (strict-NA gate) is correctly motivated and the smaller W-2 / W-3 / W-4 items are well-bounded, but the plan has three implementation-blocking ambiguities and one substantively redundant directive that will cause an implementation agent to either guess or implement the wrong thing. None of the issues are "wrong policy"; all are "plan under-specified." A short revision pass (clarify detector mechanics, extend `SECTION_ALIASES`, downscope W-2, fix CSM acceptance reasoning) lands V8 in shape for execution. The current plan, executed verbatim, would either silently degrade detector confidence (token-scan inside an expanded section list with no role-anchor logic at all) or silently dead-text the new section names (extending `recognizedTypes` without extending `SECTION_ALIASES`).

---

## Per-Item Review

### V8-A1 — Strict-NA territory gate — **WEAK (revise before execution)**

The policy intent is right: drop the `AND sales-context` clause from the gate, rename the reason, expand the detector to catch more role-territory shapes. The acceptance cases are well-chosen (Cohere Singapore must drop; Anthropic SF with global mention must not). But three mechanics-level issues are unaddressed.

**Issue 1 (BLOCKING) — "Role-anchor patterns" vs. "token scan" is ambiguous.** Plan §V8-A1 line 84-94 lists *phrase-anchor* patterns: `\bbased in (?:the )?X\b`, `\bX-based\b`, `\boffice:?\s*X\b`, `\bheadquarters? in X\b`, `\brole is based out of X\b`. These are **not** what V7's `detectTerritory` (`scripts/lib/job-fit-rules.mjs:260-361`) does today. V7 does plain token scanning (`NON_NA_MULTI_RE`, `NON_NA_DELIMITED_EU_RE`, `NON_NA_DELIMITED_UK_RE`) anywhere inside the recognized-section text. The plan never states which of two designs V8 implements:

- **Design A — replace token scan with anchor phrases**: stricter; reduces false positives; raises UNKNOWN rate; might miss "Singapore" appearing on its own line under "Location:".
- **Design B — augment token scan with anchor phrases**: same false-positive surface as today plus broader matching; minimal behavioral change beyond the gate-clause removal.
- **Design C (V7 + section expansion)**: keep token scan; just expand the list of recognized sections to scan in.

The "STRONG NON_NA indicators" + "WEAK / IGNORE indicators" framing implies Design A. The "Token lists (unchanged from V7 — already cleaned)" line implies Design B/C. The implementation agent will guess, and the choice meaningfully affects the territory-drop count and false-positive rate.

**Recommended revision:** the plan must state explicitly: "the detector inside recognized sections fires NON_NA only when (a) a non-NA token appears within 30 characters of a role-anchor phrase keyword (`based in`, `located in`, `office`, `headquarters`, `role is based`, `working from`), OR (b) the token appears on a line whose section type is `location`. Bare token mentions in `responsibilities` / `requirements` / `the role` no longer fire NON_NA." Without this, V8 either over-fires (token scan in 6 more section types) or under-fires (anchor phrases require structured prose few JDs have).

**Issue 2 (BLOCKING) — Section-targeting expansion has no implementation hook.** Plan §V8-A1 line 84 says scan in "Responsibilities / What you'll do / About the role / Location / Your impact / The Role / Job Details / The Position". Two problems:

- `scripts/lib/jd-sections.mjs:4-35` SECTION_ALIASES recognizes `responsibilities`, `requirements`, `compensation`, `location`, `benefits`, `about_company`. Of the new V8 names: `Your Impact`, `The Role`, `Job Details`, `The Position` are not aliased anywhere (closest is `the role` already aliased to `responsibilities`). `What you'll do` is already aliased to `responsibilities`. `Your Impact` / `Job Details` / `The Position` would all fall through to `unknown` block-classification.
- V7 `detectTerritory` line 314 hardcodes `recognizedTypes = new Set(["responsibilities", "requirements"])`. The plan does not say to add `"location"` to this set — but the plan's example "Section header line 'Location: {non-NA-token}'" only works if `location` is added. Without that addition, the most reliable territory signal (a Location: header) is dead-text.

**Recommended revision:** plan must enumerate (a) which section-type strings to add to `recognizedTypes` in `detectTerritory` (at minimum: add `"location"`); (b) which new headings to add to SECTION_ALIASES.responsibilities and SECTION_ALIASES.location regexes (`your impact`, `job details`, `the position`).

**Issue 3 (HIGH) — Multi-region role tie-break under-specified.** V7 code at line 352-360 returns UNKNOWN when both NA and NON_NA tokens appear in body. V8 plan §A1 step 3 says "title wins; if tied, NA (default-NA when both present, since most JDs default to US-centric framing)" — but reading the V7 implementation, that "title wins" rule is **only the title-tie behavior** at lines 291-306. Body-tie is still UNKNOWN. Under V8's strict-NA philosophy, the canonical case "Toronto, NYC, or London" — a 2-NA / 1-non-NA mix in body — should arguably not drop, but the plan does not state this. Contrast with "London, Berlin, or Singapore" — 3-non-NA / 0-NA, should drop. The current detector tie-break logic does not distinguish these.

**Recommended revision:** plan should explicitly state: "when role-anchor section contains both NA and non-NA tokens, the detector returns NA if any NA token is present (preserves multi-region roles open to NA candidates)." This is a stronger 'default-safe' position than V7's UNKNOWN tie-break and matches Will's likely intent — multi-region listings open to Toronto are not what he wants dropped.

**Issue 4 (MODERATE) — Reason rename cascade not enumerated.** Checklist item 4 says "rename `non_na_territory_with_sales_context` → `non_na_territory`." Substring-based metric in audit script (`/non_na_territory/.test(...)` at line 471) survives the rename, but exact-membership checks do not. Specifically these need updates: `scripts/test-properties.mjs` (`validHardDropReasons` set), `scripts/v6-v7-diff.mjs`, `scripts/test-job-fit-rules.mjs`, `scripts/test-cohort-shape.mjs`, all 50 V7 fixtures whose `hard_drop_reason_expected` includes this string. 17 files contain the string per Grep. Plan should enumerate the cascade and add a checklist item.

**Issue 5 (LOW) — Token list omissions.** The plan adds NA cities (good — disambiguation). NON_NA list is missing several that real-world JDs surface: `vietnam`, `philippines`, `thailand`, `indonesia`, `malaysia`, `pakistan`, `egypt`, `south africa`, `qatar`, `bahrain`, `peru`, `chile`, `colombia`. Adversarial fixture #16-17 already includes Veeva Vietnam in V7 cohort findings — currently it scrapes by under V7. Without `vietnam` in token list, V8 still misses it.

**Issue 6 (LOW) — `mexico` is now a Will-decision again.** Plan defaults to V7 behavior (NON_NA). Will's strict-NA preference may want `mexico` in NA if he considers Latin America part of "Americas". Plan §"Open design questions" #4 surfaces this; flagging here for the open-questions section.

**Strong points:**
- Removing the `AND sales-context` clause is correct and matches Will's stated intent.
- Renaming the reason is honest about the policy change.
- Acceptance cases are concrete and discriminating (Cohere Singapore drops; SF with global mention does not).

### V8-A2 — `hardSalesTitleRe` extension (W-2) — **WEAK (mostly redundant, plan doesn't say so)**

`scripts/lib/job-fit-rules.mjs:368` (`classifyLevel`) ALREADY hard-drops on `\b(vp|vice president|director|head of|chief|cxo|principal|staff|lead)\b` with reason `senior_title`. Manually checking each V8-A2 acceptance case:

| Acceptance case | Currently drops on | V8-A2 adds |
|---|---|---|
| Account Director | `senior_title` (matches `\bdirector\b`) | reason switches to `sales_role_title` |
| Strategic Account Director — AI Platform | `senior_title` | reason switches |
| Director, Sales | `senior_title` | reason switches |
| Director of Sales Engineering | `senior_title` | reason switches |
| Sales Director, Enterprise | `senior_title` | reason switches |
| Regional Sales Manager | does NOT drop (no Director/VP) | drops on `sales_role_title` (NEW) |
| Engineering Director | `senior_title` | unchanged |

So the only NEW behavior V8-A2 adds is for `Regional Sales Manager` (and similar non-Director, non-VP middle-band sales titles). Everything else is a cosmetic reason rename. This is fine — having `sales_role_title` rather than `senior_title` clarifies the audit trail — but the plan should say so explicitly. As written, the plan implies V8-A2 catches ~5 new rows when in practice it likely catches 0-2 (`Regional Sales Manager` shape only, since Will's mid-level filter already catches Directors via Level filter).

**Recommended revision:** Either downscope acceptance to `Regional Sales Manager` only (the genuinely-new case) and frame V8-A2 as a "reason taxonomy cleanup" rather than a behavioral expansion, or extend the regex more broadly to include titles Level filter doesn't catch (e.g., `regional sales`, `enterprise sales manager` without Director/VP). The current acceptance list misleads the implementation agent and the cohort-shape `sales_hard_drops` range `[80, 95]` suggests +0-15 drops when the realistic delta is +0-3.

**Strong point:** The negative tests (`Engineering Director`, `Director of Marketing`) are well-chosen — they confirm the regex doesn't expand into adjacent role families.

### V8-A3 — Customer Success Manager policy (W-3) — **OK with one acceptance error**

Default of carve-out (option iii) is defensible — most consistent with the policy 2 framework already in place for sales-adjacent AI hybrids. The token list `\b(?:AI|ML|Engineer|Engineering|Architect|Solutions|Forward Deployed)\b` is reasonable. Edge cases:

**Acceptance reasoning error:** Plan asserts `Customer Success Engineer` "does NOT drop (Engineer carve-out)." But the proposed regex `\bcustomer success (?:manager|director|lead)\b` does not match "Customer Success Engineer" at all — the noun token is `engineer`, not `manager/director/lead`. So no carve-out is needed; the regex simply doesn't fire. Outcome is correct, the reasoning in the plan is wrong. This matters because the implementation agent might think they need to add Engineer to the regex AND a carve-out, when in fact the regex shouldn't be touched.

**Token list potentially under-broad:** `Technical`, `Implementation`, `Onboarding` are exempt-worthy by Will's "loosen for AI hybrid" framework. `Customer Success Manager, Technical` is plausible CSE-adjacent role. But `Implementation` overlaps with `Implementation Manager` — a separate role family. Lean toward keeping the token list narrow as plan specifies; `AI/ML/Engineer/Solutions/Architect/Forward Deployed` covers Will's stated target set.

**`Customer Success Manager, AI Strategy` edge case:** With `AI` in the carve-out list, this exempts. Probably correct — Will's "loosen for AI hybrid" intent. But if Will's intent is "I want AI Engineer-track hybrids only, not AI Strategy-track hybrids," then `AI` alone is too broad. Surface to Will in the open-questions answer.

**`Customer Onboarding Manager`:** Plan asserts intentionally not in regex. Given Will's strict AE/AM stance, this is a defensible carve-out — Onboarding is not a sales function. Keep.

**Strong points:** Test cases for the boundary (`Senior CSM` drops on level filter, not CSM rule; `Renewals Specialist` drops on title) are good discriminators.

### V8-A4 — Source-hygiene audit (W-4) — **OK with one calibration concern**

Plan correctly frames this as an audit-driven extension: sample first, write rules second, document inventory. The pattern list is suggestive (URLs with `?location=`, `?dept=`, body-length-with-no-title) and the implementation guidance is sound (≥3 occurrences becomes a rule, 1-2 becomes a doc note for Will).

**Concern: sample size.** Plan says 50 from Reviewer Queue. Reviewer Queue contains rows that are NOT hard-dropped — sampling there finds patterns the current `detectSourceHygiene` missed (the right surface). But: V7 Reviewer Queue is bounded at 500 rows, and 50 is 10% — a small sample for catching patterns appearing in 0.5% of rows. Recommend sampling 75-100. Also recommend sampling 25 from `Source Repair Review` to verify there are no false positives there (the audit should establish both completeness and precision, not just completeness).

**Concern: pattern guidance ambiguity.** Plan says "URLs with `?location=`, `?dept=`, `?team=` that are listing pages (not job-specific)." How does the implementation agent distinguish a listing page from a job-detail page that legitimately has `?location=` (some ATSs encode location in query). Recommendation: implementation agent should additionally key off body-shape (no title in body, body length, presence of "open positions" / "departments" / "all roles" markers in body) — same approach V6 F-003 / F-004 already use. Plan should reference this.

**Strong points:** Audit-driven pattern (rather than guessing patterns) is correct. Documenting ambiguous patterns rather than auto-routing is the right call. Output location at `docs/audits/2026-05-06-v8-source-hygiene-audit.md` is good.

### V8-B1 — Real-data fixture revisions — **OK**

Renaming `v7-realdata-fixtures.jsonl` → `v8-realdata-fixtures.jsonl` is the cleaner choice (clear version anchor, easier diff). Plan §"Open design question #8" surfaces this trade-off correctly. The `revised_in` array audit trail with `previous_expected` field is good engineering.

**Concern: the test runner also references the file.** `scripts/test-realdata-fixtures.mjs` hardcodes the path. Renaming requires updating that file plus any other test scripts that read fixtures. Plan should add a checklist item: "Update test runner path to `v8-realdata-fixtures.jsonl`."

**Sample size:** 50 baseline + 6 new V8 cases = 56 max. Plan caps at 55. Reasonable.

### V8-B2 — Adversarial fixtures — **OK**

12+ new cases is sufficient. The selection covers: country-dropdown handling (positive + negative), company-context vs. role-context distinction, multi-region travel-vs-base, Account Director/W-2 cases, CSM W-3 carve-out cases, Director-of-Marketing negative.

**Missing case:** "JD with `Location: London` as section header line" (positive — territory_region=NON_NA). This is the canonical V8-A1 detector test and isn't in the V7-B2 set OR the V8-B2 plan list. Add as #19.

**Missing case:** "Multi-region role: `Toronto, NYC, or London`" — should test the body-tie behavior the detector specifies. Plan needs this case to validate the under-specified Issue 3 above gets resolved.

### V8-B3 — Property tests — **WEAK (one error)**

Plan says "No changes to existing 7 invariants." But the `validHardDropReasons` set in `scripts/test-properties.mjs` enumerates `non_na_territory_with_sales_context` literally (Round 4 confirmed this at line 359-363 of v7 plan). Renaming requires updating that array. Plan checklist item 4 says "renamed" but item 10 (B-3 invariant) says "no changes to existing invariants." These conflict.

**Recommended revision:** B-3 must include "update `validHardDropReasons` enum: replace `non_na_territory_with_sales_context` with `non_na_territory`."

The new V8 invariant (`NON_NA ⇒ hard_drop=true`) is correct under V8 design and is a good codification of the strict-NA gate. Implementation will need: read decisions sheet, filter `territory_region === "NON_NA"`, assert all have `hard_drop === "yes"` AND `hard_drop_reason` includes `non_na_territory`.

### V8-B4 — Cohort-shape ranges — **WEAK (range too wide)**

`territory_hard_drops [18, 35]` is too permissive. V7 baseline = 7. Will named ~12 specific kept-but-should-drop rows. Naive prediction: 7 + 12 = 19. Range up to 35 admits near-doubling, which would silently pass even if the detector over-fires substantially. Tighter range like `[16, 25]` would surface over-firing as a test failure rather than letting it slip through.

`shadow_hard_drops [510, 540]` — V7=505, +25 from the territory expansion + W-2/W-3/W-4 adds. Reasonable.

`sales_hard_drops [80, 95]` — V7=80, +15 for W-2/W-3 adds. Per V8-A2 review above, the realistic W-2 delta is +0-3 (not +5-15), so this range is too wide on the upper end. Tighten to `[80, 88]` if W-3 carve-out is policy default; `[80, 92]` if Will picks strict CSM (option ii).

`source_repair_rows [180, 210]` — V7=184, +5-15 from W-4. Wide enough.

**Recommended revision:** Tighten territory range to `[16, 25]` and sales range to `[80, 88]` per W-3 default.

---

## Open Questions Answered

**Q1: Detector strength sufficient?**  Not as currently described. The "role-anchor patterns" approach is sound in principle but the plan never tells the implementation agent to write anchor-phrase regexes vs. continue token scans. False-positive shapes that escape: any JD that mentions a non-NA city without a role-anchor phrase nearby (e.g., "we're a Series B startup with offices in SF, NYC, London. This role works on..." — the city tokens are listed but no `based in` phrase fires). Verdict: revise plan to specify mechanics.

**Q2: Section-targeting reliability?**  Will degrade to UNKNOWN for unstructured prose. Realistic JD-shape distribution in V7 cache: ~70% have `responsibilities` or `requirements` sections; ~50% have `location` (currently UNRECOGNIZED in `detectTerritory`'s set); ~10-15% have only "Job Details" / "The Role" / unstructured prose. UNKNOWN-default is operationally safe (preserves Will's "no false drops" preference) but means V8's reach into the long tail of poorly-structured JDs is limited. Acceptable trade-off, but the plan should acknowledge this and add `"location"` to the recognized-types set as the cheapest reach extension.

**Q3: Cohere/Mistral/Palantir multi-region case?**  Plan does not currently distinguish "company has offices in X" from "role is in X" beyond moving from token-scan-anywhere-in-body to token-scan-in-recognized-sections. If Cohere's JD says "Cohere has offices in Toronto, SF, London, Singapore" inside an `about_company` section (not in `responsibilities`/`requirements`), V7 already returns UNKNOWN. If the same string appears in `responsibilities` (because the JD is unstructured), V7 returns UNKNOWN due to body-tie (NA + NON_NA). V8 inherits this. The detector handles the "company has multi-region offices" case correctly by accident of the tie-break rule. Multi-region role-base case ("Toronto, NYC, or London" listed as ROLE locations under "Location:") needs explicit handling per Issue 3 above.

**Q4: Mexico edge case?**  Plan defers to V7 (NON_NA). Per Will's strict-NA + "any non-NA market drops" framing, Mexico-NON_NA is consistent. If Will's mental model of "NA" includes Mexico (as in NAFTA/USMCA), this would flip. Recommend Will confirm; default plan call (NON_NA) is reasonable since Will is unlikely to apply to Mexico-based remote roles in practice.

**Q5: CSM policy default (iii) carve-out?**  Yes — best-aligned with the policy 2 framework already in place. Pure CSM is sales work; CSM-AI/Engineer hybrid is closer to SA/FDE. Strict (option ii) over-prunes. Status quo (option i) leaves CSM-noise in the queue Will already wants gone. Carve-out is the surgical default.

**Q6: W-4 audit thoroughness?**  Sample 50 from Reviewer Queue is the floor, not the ceiling. Recommend extending to 75-100, plus 25 from Source Repair Review (precision check). This is cheap (no Firecrawl, just sheet inspection) and catches rarer patterns.

**Q7: Cohort-shape range tightness?**  `[18, 35]` is too wide. Per Issue 6 in V8-A1 review, tighten to `[16, 25]`. Wide ranges hide detector over-fire; the cohort-shape test's value is loud-fail surfacing.

**Q8: Fixture rename pattern?**  Rename to `v8-realdata-fixtures.jsonl` is correct. Reason: the version anchor in filename is a clearer signal than reading frontmatter. The `revised_in` array preserves history. Cost: must update test-runner path. Add to checklist.

---

## What's Missing

1. **Detector mechanics decision** — see V8-A1 Issue 1.
2. **`SECTION_ALIASES` extensions** — see V8-A1 Issue 2. At minimum, add `your impact`, `job details`, `the position` aliases. Add `location` to `detectTerritory`'s `recognizedTypes`.
3. **Multi-region body-tie rule** — see V8-A1 Issue 3.
4. **Reason rename cascade enumeration** — see V8-A1 Issue 4. List all 17 files; checklist item per file or per-script-class.
5. **NON_NA token list expansion** — see V8-A1 Issue 5. Add ~10 missing countries.
6. **W-2 redundancy disclosure** — see V8-A2 review.
7. **CSM acceptance reasoning fix** — see V8-A3 review.
8. **B-3 enum update** — see V8-B3 review.
9. **B-4 range tightening** — see V8-B4 review.
10. **V7 baseline preflight clarification** — Step 0 says "regenerate V7 workbook from current code; confirm V7 metrics still match." But the V7 workbook was generated against V7 code; if V8 code changes are unmerged, regenerating produces V7 again (same code) — sanity check, not behavioral guard. Plan's Step 0 is fine but the wording is slightly tautological. Minor.
11. **Diff workbook attribution for the rename** — V7→V8 diff should tag `non_na_territory_with_sales_context` → `non_na_territory` rows as "V8-A1: rename" rather than as new drops or unattributed flips. Plan §V8-A1 line 130 says diff handles rename "explicitly" but doesn't say where. Add to `scripts/v7-v8-diff.mjs` design.
12. **No regression test for the OLD gate's `AND sales-context` clause being removed** — i.e., a fixture asserting "row that V7 kept because no sales evidence, but is in NON_NA territory, drops in V8." The 12 specific Cohere/Mistral/Palantir/H2O rows in Round 4 §C are the canonical regression test set; ensure 2-3 are explicitly added to V8-B1 fixtures.

---

## Risk Analysis

| Risk | Severity | Likelihood | Mitigation in plan? | Recommendation |
|------|----------|-----------|---------------------|----------------|
| Detector under-fires due to expanded section list with no anchor logic | HIGH | MEDIUM | NO | V8-A1 Issue 1 fix |
| Detector dead-text "Location:" sections (recognizedTypes not extended) | HIGH | HIGH | NO | V8-A1 Issue 2 fix |
| Reason rename breaks property tests / fixtures silently | MEDIUM | MEDIUM | PARTIAL (checklist mentions rename) | V8-A1 Issue 4 + V8-B3 fix |
| Cohort range too wide hides over-fire | MEDIUM | MEDIUM | NO | V8-B4 tighten |
| Multi-region role drops when it shouldn't | MEDIUM | LOW | NO | V8-A1 Issue 3 fix |
| CSM regex implementation confused by acceptance reasoning | LOW | LOW | NO | V8-A3 acceptance fix |
| W-2 has zero behavioral effect (everything drops on senior_title already) | LOW | HIGH | NO | V8-A2 downscope or extend |
| Plan executes verbatim and produces wrong output | HIGH | MEDIUM (per items 1-2) | NO | Revise before execution |
| W-4 sample size too small to catch rare patterns | LOW | MEDIUM | NO | Extend to 75-100 + 25 precision check |

---

## Recommended Plan Revisions

1. **V8-A1 Issue 1:** Add explicit detector mechanics statement: "the detector inside recognized sections fires NON_NA only when (a) a non-NA token appears within 30 characters of a role-anchor phrase keyword, OR (b) the token appears anywhere in a section of type `location`."
2. **V8-A1 Issue 2:** Add `"location"` to `recognizedTypes` in `detectTerritory`. Add `your impact`, `job details`, `the position` to SECTION_ALIASES (mapped to `responsibilities`).
3. **V8-A1 Issue 3:** State explicit body-tie rule: "when a recognized section contains both NA and NON_NA tokens, return NA (multi-region role open to NA candidates is not a drop)."
4. **V8-A1 Issue 4:** Add a checklist item per file the rename touches: `test-properties.mjs:359-363`, `v6-v7-diff.mjs`, `test-cohort-shape.mjs`, `test-job-fit-rules.mjs`, all 50 V7 fixture lines.
5. **V8-A1 Issue 5:** Extend NON_NA token list with: `vietnam`, `philippines`, `thailand`, `indonesia`, `malaysia`, `pakistan`, `egypt`, `south africa`, `qatar`, `bahrain`, `peru`, `chile`, `colombia`.
6. **V8-A2 downscope:** Either narrow acceptance to `Regional Sales Manager` (the only genuinely-new case) and frame as taxonomy cleanup, OR extend regex to actually catch new titles (`enterprise sales manager`, `regional sales`, `key account manager`).
7. **V8-A3 acceptance fix:** Remove "Engineer carve-out" reasoning from `Customer Success Engineer` test case; replace with "regex doesn't match the noun `engineer`, so no firing."
8. **V8-A4 sampling:** Extend Reviewer Queue sample from 50 to 75-100 and add 25 from Source Repair Review for precision check.
9. **V8-B2 add cases:** Add (a) `Location: London` section-header positive case; (b) "Toronto, NYC, or London" multi-region body-tie case.
10. **V8-B3 enum update:** Add explicit checklist item: "update `validHardDropReasons` array in `scripts/test-properties.mjs` to replace renamed reason."
11. **V8-B4 tighten ranges:** `territory_hard_drops [16, 25]` (was `[18, 35]`); `sales_hard_drops [80, 88]` (was `[80, 95]`) under W-3 default.
12. **V8-B1 add fixtures:** Add 2-3 explicit Cohere/Mistral/Palantir/H2O rows from Round 4 §C as regression-test cases for the gate-clause removal.
13. **Test-runner path update:** Add checklist item for updating fixture path in `scripts/test-realdata-fixtures.mjs` after rename.
14. **Diff workbook rename handling:** State explicitly in `scripts/v7-v8-diff.mjs` design that the rename is tagged "V8-A1: reason rename" not "new drop" / "unattributed flip."

---

## Sign-Off Checklist (expanded)

| # | Item | Status |
|---|------|--------|
| 1 | V8-A1 detector mechanics resolved (anchor-phrase vs. token-scan) | TODO — BLOCKING |
| 2 | `recognizedTypes` extended to include `"location"` in `detectTerritory` | TODO — BLOCKING |
| 3 | SECTION_ALIASES extended with new V8 headings (`your impact`, `job details`, `the position`) | TODO |
| 4 | Multi-region body-tie rule explicitly stated (default NA when NA token present) | TODO |
| 5 | NON_NA token list extended with ~10 missing countries | TODO |
| 6 | Reason rename cascade enumerated (17 files) | TODO |
| 7 | V8-A2 scope clarified (downscope or extend regex) | TODO |
| 8 | V8-A3 CSM acceptance reasoning fixed (Engineer case) | TODO |
| 9 | V8-A4 sample size extended to 75-100 + 25 precision check | TODO |
| 10 | V8-B1 includes 2-3 Round 4 §C regression cases for gate removal | TODO |
| 11 | V8-B1 test-runner path update added to plan | TODO |
| 12 | V8-B2 includes `Location:` and multi-region body-tie cases | TODO |
| 13 | V8-B3 `validHardDropReasons` enum update added | TODO |
| 14 | V8-B4 ranges tightened (territory `[16,25]`, sales `[80,88]`) | TODO |
| 15 | Diff workbook rename-handling specified | TODO |
| 16 | Will confirms Mexico = NON_NA (open question 4) | TODO |
| 17 | Will confirms CSM policy iii (carve-out) is correct default | TODO |
