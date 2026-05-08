---
status: active
type: audit
owner: plan-reviewer-agent
last-updated: 2026-05-05T18:38:35-04:00
read-if: "you are deciding whether to execute V7 as written, or to revise the plan first"
skip-if: "V7 already implemented"
related:
  - docs/plans/2026-05-05-v7-consolidated-plan.md
  - docs/audits/2026-05-05-v5-reviewer-agent-findings.md
  - docs/audits/2026-05-05-v6-implementation-summary.md
  - docs/audits/2026-05-05-round3-comparison-findings.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/production-filter-refinement-audit.mjs
---

# V7 Plan Review

## Verdict

**REVISE_BEFORE_EXECUTION**

The plan is structurally sound — correct scope, correct deferrals, correct A/B track separation, the right test infrastructure investments at the right time. But three concrete technical defects would make the plan misfire if executed as written: (1) V7-A1's Pre-Sales regex has a literal hyphen requirement that will miss the very variants Round 3 explicitly asked to be caught; (2) V7-A3 gates on family identifiers (`SALES`, `AE_HYBRID`) that do not exist in `FAMILY_BASE` (`scripts/lib/job-fit-rules.mjs:8-18`), so the gate is unimplementable; (3) V7-A3's NON-NA token list contains direct contradictions (`mexico` in both lists) and bare 2-letter region codes (`us`, `eu`) and bare regional adjectives (`india`, `indian`) that will collide with the same boilerplate that produced V6's `commercial_ownership` false positive on "British Indian Ocean Territory". These are mechanical fixes (one regex tweak, one family-gate rewrite, one token-list cleanup) but they are blocking — not "execute and patch in V7.5". The reviewer should send the plan back, fix these three items, and then approve the revised plan in one round.

## Track A Review (rule changes)

### V7-A1: Pre-Sales title regex

**Verdict: WEAK**

**Reasoning.** The plan's regex fragment is `pre-sales\s+(?:solutions\s+)?(?:engineer|architect|consultant)` — a literal hyphen. Round 3's proposal at `docs/audits/2026-05-05-round3-comparison-findings.md:149` was explicitly `\bpre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b`. The plan regressed the "no hyphen" / "space-only" / "specialist" / "technical|systems" / "associate" coverage that Round 3 asked for.

**Edge cases the proposed regex misses:**
- `Presales Engineer` (no hyphen, no space) — `pre-sales\s+` requires both a hyphen and whitespace.
- `Pre Sales Engineer` (space-only) — same.
- `Pre-Sales Specialist` — `specialist` not in the inner alternation.
- `Pre-Sales Technical Engineer` — `technical` not in the optional `(?:solutions\s+)?` group.
- `Senior Pre-Sales SA` — short-form `SA` not in alternation. (Likely fine to ignore — Senior is filtered by `classifyLevel` already returning `senior_title` hard_drop at `scripts/lib/job-fit-rules.mjs:207`, so this case never reaches sales.)
- `Sales Engineering Manager` — should NOT match. The plan's regex does not match (no "pre-sales" prefix), good.
- `Pre-Sales Solutions Engineer` (the actual Deepgram title) — DOES match: `pre-sales` matches literal, `\s+(?:solutions\s+)?` matches "Solutions ", `engineer` matches. So the named acceptance case (Deepgram drops in V7) does pass. The miss is on the variants.

**Cite.** Existing `hardSalesTitleRe` at `scripts/lib/job-fit-rules.mjs:118`. Round 3 finding §Regression Detection (line 93) says the fix should be `pre[-\s]?sales\b.{0,30}\bengineer\b` OR the longer alternation. Plan dropped the `[-\s]?` and the `specialist` token.

**Recommended changes.**
- Replace the plan's `pre-sales\s+(?:solutions\s+)?(?:engineer|architect|consultant)` with Round 3's proposal verbatim: `pre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b`.
- Add unit tests for `Presales Engineer`, `Pre Sales Architect`, `Pre-Sales Specialist`, `Pre-Sales Technical Engineer` — not just the three currently in the plan's acceptance list.
- Negative test: `Sales Engineering Manager` MUST NOT match (defense-in-depth — the regex above could be misread as overlapping; verify it doesn't).

### V7-A2: commercial_ownership regex

**Verdict: OK**

**Reasoning.** Removing bare `\bterritory\b` is correct; Round 3 §3-(c) (line 116) confirmed the false positive on "British Indian Ocean Territory" in the country dropdown. The plan proposes "remove bare territory; require it within 15-30 chars of an action verb." This is a reasonable approach.

**Edge cases.**
- The proximity rule must be implemented bidirectionally (the verb may come before or after `territory`). Plan's wording "within 15-30 chars" is ambiguous.
- The current line is `scripts/lib/job-fit-rules.mjs:135`: `\b(book of business|renewals?|expansion opportunities|land and expand|territory|account ownership)\b`. Simplest implementation matching Round 3's recommendation (line 152): drop bare `territory`, replace with literal `\bsales territory\b` only. This is more conservative than the plan's 15-30-char proximity rule and harder to break in practice.
- Round 3 (line 130) explicitly says: "drop rows 1+2 to 2+2 = 4 (at threshold for AI_ENGINEERING — still drops via `>= 4` semantics)". So this hygiene fix does NOT flip Anthropic outcomes; it just makes the audit's reasoning trustworthy. The plan should state this explicitly so V7 isn't measured against an Anthropic outcome change that won't happen.

**Recommended changes.**
- Prefer Round 3's simpler "require modifier `sales territory`" approach over a proximity rule. Proximity rules over JD HTML noise are notoriously brittle (pagination, list bullets, etc.).
- Add an acceptance test: "the literal string `Country *Afghanistan+93 - Albania+355 - Algeria+213 - American Samoa+1 - ... - British Indian Ocean Territory+246 - ...` MUST NOT trip `commercial_ownership` even when the rest of the JD has zero sales signals". This codifies the Round 3 finding as a permanent regression test.
- Document explicitly that this fix DOES NOT flip Anthropic India/Japan rows (they still drop at threshold 4 for AI_ENGINEERING, per Round 3's recomputation). Plan should not list "Anthropic India drops on territory filter" as an acceptance for V7-A2 — that's V7-A3's job.

### V7-A3: territory filter

**Verdict: WEAK** (the central new feature; also has the most defects)

#### Reasoning — the gating condition references nonexistent families

The plan's hard-drop rule says: `Fires when: (territory.region === "NON_NA") AND (sales_role_signal_present OR has_hard_sales_title OR primary_family ∈ {SALES, AE_HYBRID})`.

`SALES` and `AE_HYBRID` do not exist in `FAMILY_BASE` at `scripts/lib/job-fit-rules.mjs:8-18`. The actual families are:
```
SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE
AI_ENGINEERING
AI_PROGRAM_OPS
PRODUCT_AI
AI_EVAL
CONSULTING_ADVISORY
CREATIVE_AI
GENERIC_ENGINEERING_REVIEW
UNKNOWN
```

There is no sales-track family because `classifyRoleFamily` (line 219-274) does not assign one — sales detection happens via `classifySalesRole` which short-circuits at the title regex (line 119). A pure AE/AM hits `classifyTitle` and returns hard_drop=true with no family assignment beyond what the title-based family detector picks up.

This means the gate clause `primary_family ∈ {SALES, AE_HYBRID}` is unimplementable as written. Will likely fix this is one of:
- (a) Drop the clause entirely; gate only on `sales_role_signal_present OR has_hard_sales_title`. (Cleanest — those two cover the cases that matter.)
- (b) Add a SALES family to `classifyRoleFamily` whenever `hardSalesTitleRe` matches at title level, and an AE_HYBRID family for SA/FDE rows that pass the SA/FDE sales threshold. (Bigger surface change — pulls forward work the plan probably didn't intend.)

I recommend (a). The plan needs to be rewritten before execution.

#### Reasoning — token list contradictions

- `mexico` appears in BOTH the NA whitelist (line 99: `mexico (debatable — flag for review; default include since culturally NA)`) AND the non-NA blacklist (line 104: `mexico (only if accompanied by other LATAM signals)`). Pick one. Since LATAM is a recognized sales territory category, mexico should sit in non-NA — Will's pipeline framing is "NA" in the strict US/Canada sense. Mexico-only sales coverage is not what Will targets.
- The disambiguator "if both NA and non-NA tokens present, title wins" is good; "otherwise UNKNOWN" is good. But for `mexico`-only — under the current dual placement — it's both NA and non-NA, which is the worst outcome for the disambiguator (everything ties). Resolve in the plan, don't punt to implementation.

#### Reasoning — bare-token false-positive risk that mirrors V6's `commercial_ownership` defect

The plan lists bare 2-letter and short-form tokens: `nam`, `naam`, `us`, `eu`, `uk`, `dach`, `mena`, `apac`, `lac`, `cala`, `anz`. It also lists bare adjectives: `indian`, `japanese`, `chinese`, `korean`. Word-boundary matching is not enough:
- `india`, `indian` will match "British Indian Ocean Territory" — the EXACT false-positive shape that sank V6's `commercial_ownership` rule (Round 3 §3-(c)). The "section-targeted" mitigation depends on `parseJdSections` reliably extracting "Responsibilities" / "What you'll do" — but Greenhouse country dropdowns often appear at the page TOP (above section headers), and `parseJdSections` may include them in the body when section detection fails. The plan needs an explicit negative test.
- `us` will match GDPR/cookie boilerplate ("us users", "join us", "tell us"). `eu` will match "EU users", "EU GDPR", "EU regulations".
- `uk` will match "uk-based" but also literally any 2-letter sequence in URLs (`thinkuk.com`).
- `apac` is fine (not a common prefix in unrelated words).
- `mena`, `lac`, `cala`, `anz` are all rare — usable.
- `indian`, `japanese`, `korean`, `chinese` will match nationality-of-customers / language-skill mentions ("Mandarin Chinese language proficiency") that have nothing to do with role territory.

#### Reasoning — title-first precedence is right, but body-text gating is not specified strongly enough

"Section-targeted check — Responsibilities, What you'll do, About the role only" — but the plan doesn't say what happens if `parseJdSections` fails to identify a section in a poorly-formatted JD. Default behavior should be: if no recognized section, fall back to UNKNOWN, NOT to scanning the whole body. This is critical because Greenhouse application-form HTML (the country dropdown) typically appears in unparsed body text after the visible JD ends.

#### Edge cases the plan asks the reviewer to validate

- "AI Engineer (Remote, Global team)" with "team distributed across EMEA, APAC, and the Americas" → plan says no drop. Correct intent. Implementation: with gate option (a), the gate fails because no `sales_role_signal_present` and no `has_hard_sales_title`. So no drop. ✓
- "Solutions Architect, EMEA" with sales JD content → plan says drop. Correct intent. Title contains EMEA → NON_NA. JD content fires sales signals → gate passes. ✓
- "Anthropic Applied AI Architect, Commercial — India" → plan says drop on `non_na_territory_with_sales_context`. Title contains "India"? No, the title is "Applied AI Architect, Commercial". The "India" appears in either the company-region annotation in `portals.yml`, or the JD body ("As an Applied AI team member at Anthropic India"). If the territory detector runs over JD body sections, then `india` token fires NON_NA. But: per Round 3, that JD also says "Partner with account executives across India and the Asia-Pacific region". The detector would find APAC, India tokens — NON_NA. Sales signals present (sales_process: "Pre-Sales architect" + sales_counterpart: "account executives"). Gate passes; drop fires. ✓
- "Anthropic Applied AI Architect, Commercial — USA" (the `5192805008` JD) → plan says do NOT drop on territory. JD contains US-flavored tokens. Plan defaults: NA region detected → no NON_NA drop. ✓ But this row STILL drops on `sales_role_content` per V6 (Round 3 confirmed total signal = 7). Plan's acceptance language "does NOT drop on territory" is correct but should explicitly note the row likely drops on `sales_role_content` anyway.

#### Edge cases the plan misses

- Row title contains explicit US state abbreviation in parens: "Solutions Architect (NY/SF)" — title check should recognize NY, SF as NA-implying. Plan's NA whitelist covers `united states`, `us`, `usa`, but not state-name short forms. In practice this hits scoring through location detector, not territory, so it's probably fine — but the plan should say so.
- Bilingual / multi-region roles with a Toronto component: "Solutions Engineer, North America (Toronto/NY)" — plan's NA whitelist covers it. ✓
- The test for "remote AI Engineer at global company that mentions team distributed across EMEA, APAC, Americas" — under gate option (a), this works without any special-casing. Plan's framing of this as a concern is correct but the implementation under gate (a) is straightforward.

**Recommended changes.**
1. Drop `SALES` and `AE_HYBRID` from the gate; use `(territory.region === "NON_NA") AND (has_hard_sales_title OR sales_role_signal_present)` where `sales_role_signal_present` is defined as `classifySalesRole` returning hard_drop=true OR returning a `sales_*` reason short of hard_drop OR `sales.evidence.length > 0`.
2. Resolve `mexico` definitively. Recommend: NON_NA only.
3. Change all bare 2-letter region codes to require parenthesis or dash delimiters: `\(us\)`, `- us`, `(emea)`, `, emea`, `[emea]`. Similarly for `eu`, `uk`. Treat bare `indian|japanese|korean|chinese` as language/nationality tokens, not territory tokens — REMOVE from territory regex; rely on country names only (`india`, `japan`, `korea`, `china`).
4. Add an explicit negative test: "country dropdown text containing `British Indian Ocean Territory` (with no other India/Asia tokens in role content) MUST NOT trigger NON_NA territory". Run this against the Anthropic Commercial (USA) JD as the canary.
5. Specify default behavior when section detection fails: UNKNOWN (no drop), not whole-body scan.
6. Add the new column `territory_region` (and optionally `territory_evidence`) to the Shadow Decisions sheet so Will can review NON_NA-but-not-dropped rows. This is missing from the plan but is part of "wire territory signal into score/drop decision."

### V7-A4: KNOWN_SEEDS typo fix

**Verdict: STRONG**

**Reasoning.** Plan's typo fixes match the actual file. `scripts/production-filter-refinement-audit.mjs:49` is `https://surgehq.ai/careers/generative-al---generalist`; line 50 is `https://surgehq.ai/careers/al-programs-analyst`. Both are clearly typos (`al` not `ai`). Plan's replacement is correct. Length stays at 14. No secondary effects.

**Recommended changes.** None.

### V7-A5: AE/AM regression test

**Verdict: OK**

**Reasoning.** 8 cases cover the critical guarantees Will asked for. `Account Executive`, `Account Manager`, the SOLUTIONS-family-doesn't-loosen-AE assertion, and the `Technical Account Manager`/`Account Coordinator` carve-outs are all correct.

**Cite.** `hardSalesTitleRe` at `scripts/lib/job-fit-rules.mjs:118` matches `account executive` and `account manager` BEFORE the SA/FDE family check at line 178. So an AE under SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE family literally cannot benefit from the policy 2 loosening — line 119 returns early. Plan's V7-A5.7 ("AE with `primary_family = SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE` → STILL drops") is automatically true. The test is still worth keeping as a permanent guardrail against future refactors that move the title check after the family check.

**Recommended changes.**
- Add `Customer Success Manager` to the test list, asserting it does NOT title-level drop (CSM is not in `hardSalesTitleRe`). It already drops in the existing V6 test at line 103 via content (OTE + AEs + renewals = 3+2+1 = 6 ≥ 4 for non-SA/FDE). But a title-only CSM with no JD content should pass through. This is a sibling carve-out test for `Technical Account Manager`.
- Consider adding `Account Director` and `Strategic Account Director`. Currently `hardSalesTitleRe` doesn't list `account director`, only `account executive`/`account manager`. If Will wants "Account Director" caught, that's a regex extension. If Will is fine with Director going through Level filter (which catches `director` as senior at line 207), then no change. Plan should call this out one way or the other.
- The plan does not mention adding the literal regex `(?<!enterprise|strategic|technical|key|named|major|senior|associate)\baccount\s+(executive|manager)\b` style negative-lookbehind; current regex works because the additional adjective just lengthens the matched prefix. Verified mentally.

## Track B Review (test infrastructure)

### V7-B1: real-data fixture set

**Verdict: OK**

**Reasoning.** Sample size 50 is reasonable for a hand-validated set. Stratification math sums correctly: 8+6+8+8+8+6+6 = 50. Categories cover the right spectrum — drops, survivors, source repair, queue, comp/yoe/loc, score deltas, adversarial.

**Concerns.**
- The "≥45/50 fixtures pass" tolerance is the wrong shape. If a fixture is "deferred to V7+" or "needs V7 implementation pending", that should be marked `expected_pass: false` or `expected_failure: true` IN the fixture, not allowed as slop in the global pass count. Otherwise a future round can silently let 5 fixtures fail without anyone noticing whether they were the same 5 or 5 new regressions. Push for: 50/50 pass, with explicit `expected_failure_reason: "V7 deferred — Anthropic policy 3 not yet implemented"` and a parallel assertion that fixture failures match expected-failure markers.
- JSON storage vs separate test files: the plan's JSON-fixture approach is fine for diff readability if the JSON is one fixture per object on its own line (line-oriented JSON-L would be even better for git diffs). But a 50-fixture file with 200-char JD excerpts still shows 50× expected-outcome diffs when one rule shifts. Acceptable for V7; consider JSONL or split-file approach if the set grows beyond 100.
- Provenance schema is good (`source_workbook`, `row_index`, `labeled_by`, `labeled_date`). Add a `revised_in` history array (not a single field) so when V8 changes a fixture, the V7 → V8 → V9 chain stays visible.
- Sampling protocol "every Nth row, seed=42" is deterministic in PRINCIPLE but depends on sort key stability. Specify exact tiebreak: sort by `(company, title, url)` to ensure deterministic ordering even when two rows share company+title.
- "Hand-validate each fixture's expected outcome" — be explicit about who validates. The plan offers `claude-with-uncertainty` flag, which is fine, but the categorical fixtures (Sales Hard Drops legitimate, Source Repair legitimate) require Will-validation of at least the questionable ones. Add a workflow note: claude pre-labels, surfaces the uncertain ones, Will signs off in batch.

### V7-B2: adversarial fixtures

**Verdict: OK**

**Reasoning.** 11 cases is a reasonable starting set. The mapping to source findings is correct.

**Cross-check vs Round 1 + Round 3 — what's missing or could be added:**
- ✓ F-002 (Scale AI dedup, ElevenLabs dedup) — covered.
- ✓ F-003 (Atlassian /all-jobs?) — covered.
- ✓ F-004 (example.com) — covered.
- ✓ F-008 (sales_department alone) — covered.
- ✓ F-009 (specific_location_not_in_drop_reason gate) — covered.
- ✓ Round 3 §3-(c) (commercial_ownership false positive on British Indian Ocean Territory) — covered.
- ✓ Round 3 §3-(a) (Pre-Sales Solutions Engineer title drop) — covered.
- ✓ V7-A3 NA + non-NA territory cases — covered.

**Missing — should be added:**
- **Round 3 §Regression Detection (Lattice Semiconductor side effect).** The per-label aggregation in V6 changed Lattice Product Manager (AI_PROGRAM_OPS family) from `sales_role_content; specific_non_toronto_location_no_remote` → `specific_non_toronto_location_no_remote` only. Net: still drops, but the sales drop reason disappeared. That's a behavior change worth a permanent test: a fixture for Lattice (or a Lattice-shaped synthetic case) verifying that sales_department alone in a non-SA/FDE family with no corroborator does NOT fire sales_role_content. This is a regression test for V6's per-label aggregation.
- **F-006 typo seeds (V7-A4).** After the typo fix, add a fixture verifying both corrected URLs are in `KNOWN_SEEDS`. (Trivial — could be a unit test rather than a real-data fixture.)
- **F-007 (closed).** No fixture needed — Round 3 confirmed the hypothesis was false.
- **V7-A1's MISS cases.** If you take my recommendation to extend the regex per Round 3, add fixtures for: `Presales Engineer`, `Pre Sales Architect`, `Pre-Sales Specialist`, `Pre-Sales Technical Engineer` — all assert title-level drop. The plan currently only asserts `Pre-Sales Solutions Engineer`, `Pre-Sales Engineer`, `Pre-Sales Architect`.
- **Anthropic country-dropdown negative test for territory filter** — sibling to the commercial_ownership negative test. Same JD body containing "British Indian Ocean Territory" must NOT fire NON_NA territory if no other Asia/India tokens are in role content sections. This codifies the Round 3 finding shape against the new V7-A3 detector.
- **Empty-section fallback test for territory** — JD body where `parseJdSections` returns no recognized sections. Territory should default to UNKNOWN, not scan whole body.

### V7-B3: property tests

**Verdict: OK** (with one fragility issue)

**Reasoning.** The 7 invariants are the right shape: type, range, implication, set membership. The seed=42 + 100 random rows is reasonable.

**Fragility issue.** The proposed `hard_drop_reason` validation is broken:
```js
assert(!result.hard_drop_reason || validHardDropReasons.some(r => result.hard_drop_reason.includes(r)),
       "hard_drop_reason in known set");
```
`hard_drop_reason` is concatenated by `; ` at `scripts/lib/job-fit-rules.mjs:618` (`hardDrops.map((x) => x.reason).filter(Boolean).join("; ")`). The plan's `.includes(r)` checks if any known reason is a substring of the joined string. This passes for legitimate multi-reason rows like `"yoe_required_gt_5; specific_non_toronto_location_no_remote"`, but it ALSO passes for typos like `"yoe_required_gt_5_BOGUS"` — because `"yoe_required_gt_5"` is a substring of the typo. The check is not detecting unknown reasons.

Correct shape:
```js
const reasons = String(result.hard_drop_reason || "").split(";").map(s => s.trim()).filter(Boolean);
assert(reasons.every(r => validHardDropReasons.includes(r)), "all hard_drop_reasons in known set");
```

**Other invariants worth adding:**
- **Determinism:** `scoreJob(input)` called twice with the same input returns the same output (deep-equal). Catches any accidental Map iteration or Date.now() creep.
- **Family-base implication:** if `result.primary_family === "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE"` then `result.score_parts.family >= 12` (matches FAMILY_BASE). Catches future drift between FAMILY_BASE values and primary_family resolution.
- **Hard-drop implies bottom band:** the plan has `hard_drop=true ⇒ band is null or C`. Confirm in code: `computeShadowBand(score)` at line 572 returns "C" for any score < 14. Hard-drop rows still compute a score, so they could in principle hit B/A/S. Look at `scoreJob` — `hard_drop` is computed alongside the score, but the score itself isn't zeroed. So the assertion `hard_drop=true ⇒ band C` is NOT true. Verify:`scoreJob({ ...AE input...})` — sales hits hard_drop, but `total = family + semantic + comp + yoe + location + level + rank + category` still adds up to whatever the row's signals deliver. Could be A. Drop this invariant or change it to a softer "if hard_drop and band !== C, then band is annotated as 'hard_drop_with_high_signal'". Or fix `scoreJob` to force band C on hard_drop. Plan should pick one.
- **Source repair implies no hard drop:** at `scripts/production-filter-refinement-audit.mjs:341` the audit script forces `hard_drop = "no"` whenever sourceHygiene.invalid. The validation finding `source_repair_row_has_hard_drop` (line 588-595) explicitly enforces this. Add as property test.

### V7-B4: cohort-shape assertions

**Verdict: WEAK**

**Reasoning.** The intent is right — assert metrics within ranges to catch silent drift. But specific ranges have problems.

**Specific issues:**

1. **`sales_hard_drops in [60, 90]` is asymmetric in the wrong direction.**
   - V5 = 108, V6 = 78. V7-A1 fixes the Deepgram regression: ADDS ~2 drops (Deepgram x2). V7-A2 hygiene fix: per Round 3, does NOT rescue Anthropic. V7-A3 territory drops go to a NEW reason category (`non_na_territory_with_sales_context`) — `audit's metric filter at line 461` is `/sales_role/.test(hard_drop_reason)`, which would NOT catch `non_na_territory_with_sales_context` unless the reason string contains "sales_role". So V7's `sales_hard_drops` should be ~78-85, NOT 60-90. The lower bound of 60 would silently swallow an 18-row regression. Tighten to `[78, 92]` — locking in V6 as the floor.
   - Caveat: depending on whether you classify the new reason `non_na_territory_with_sales_context` as a sales drop or a territory drop, the metric filter regex matters. Plan needs to specify whether the audit's `sales_hard_drops` metric counts territory drops too. Probably no — they should be separately tracked under `territory_hard_drops`.

2. **`territory_hard_drops in [5, 40]` is too wide.** Plan's prediction table says "10-30". Why does the cohort-shape assertion widen to 5-40? Tighten to [10, 30] to match the prediction. If the prediction is that conservative, the assertion shouldn't be 8x looser.

3. **`shadow_hard_drops in [470, 530]` — too wide for "±5%".** ±5% of V6 = 501 is [476, 526]. Plan says ±5%; assertion says [470, 530]. Use the plan's stated tolerance: [476, 526].

4. **`source_repair_rows in [175, 200]` — V6 = 184. ±5% = [175, 193]. Plan says [175, 200], which is wider on the upside. Fine to keep wider since V7 might add more source-repair routings (none planned, but tolerance for noise). OK as-is.

5. **`pipeline_rows in [925, 940]` — V6 = 933. Tight enough.** ✓

6. **`yoe_hard_drops in [140, 160]` — V6 = 148. Wide ±8 either side. Probably fine.** ✓

7. **`baseline_excel_sha = "7bfe4ec5..."` exact match — perfect.** ✓

**False-alarm risk vs missed-regression risk.** The wider the range, the more legitimate rule changes don't fire the test, but the more silent regressions also slip through. Pick the side that matters: this is a SAFETY net for V7 specifically — tighter is better, with explicit "if you're tuning V7-Ax to deliberately move metric Y, update the range with a comment explaining why."

### Acceptance Criteria Review

**Verdict: OK**

The overall acceptance criteria (line 348-357) are concrete: "all test suites pass", "baseline SHA unchanged", "Round 4 verifies Deepgram drops + Anthropic outcomes match + no new regressions + INDEX updated". Reasonable.

**Missing:**
- No explicit acceptance for Will's policy directives. E.g., "AE/AM strict (no loosening regardless of family)" — should be a measurable assertion. Translate Will's directive to: "for every fixture in V7-B1 with title matching `hardSalesTitleRe`, regardless of `primary_family`, `hard_drop_expected=true`."
- No measurable acceptance for V7-A3 beyond the four named example rows. Add: "for the 50-fixture set, every NON_NA-tagged role with sales signals drops; every NON_NA-tagged role with no sales signals does NOT drop on territory."
- No regression-baseline gate. Add: "running V7's audit against V6's pipeline.md + cache produces V6 outcomes for all rows except those tagged as V7-affected by V7-Ax." (i.e. proves V7 only changes what we intended.)

## Scope and Boundaries

**Verdict: STRONG**

The plan correctly identifies what NOT to touch (`career-ops/export-jobs.mjs`, `portals.yml`, baseline workbook SHA, default `npm run full-scan`, V3-V6 workbooks). It correctly defers F-005 (enrichment refetch — Firecrawl credit cost), F-007 (closed false hypothesis per Round 3), F-010 (cosmetic), mutation testing (low ROI vs real-data fixtures), Anthropic policy 3 final decision (likely resolves via V7-A2 + V7-A3 verification).

**Minor concern:** plan does not mention that V7-A3's territory filter is itself a NEW first-class signal that should ripple to documentation (`docs/plans/2026-05-03-production-filter-refinement-design.md` §4.6 sales policy, `AI_AGENTS.md` if scoring framework is documented there). Plan only mentions INDEX.md updates. This is a documentation cascade gap.

## Risk Analysis

| Risk | Severity | Mitigation in plan? | Recommendation |
|------|----------|---------------------|----------------|
| V7-A1 regex misses Presales/Pre Sales variants | HIGH | No (literal hyphen) | Replace with Round 3's `pre[-\s]?sales` proposal |
| V7-A3 family-gate references nonexistent families | HIGH | No | Drop the family clause; gate on sales-signal/title only |
| V7-A3 token list false positives mirror V6's `commercial_ownership` defect | HIGH | Partial (section-targeted check) | Remove bare 2-letter codes and bare adjectives; add country-dropdown negative test |
| `mexico` dual-listed | MEDIUM | No | Resolve to NON_NA |
| V7-B3 `hard_drop_reason` substring check accepts typos | MEDIUM | No | Use `split(";").every(in known set)` |
| V7-B4 sales_hard_drops range allows 18-row regression | MEDIUM | No | Tighten to [78, 92] |
| V7-B4 shadow_hard_drops range looser than stated ±5% | LOW | No | Tighten to [476, 526] |
| Plan does not require V6 baseline preflight before V7 | LOW | No | Run V6 test suites + regenerate V6 workbook to confirm SHA is `7bfe4ec5...071e` before V7 starts |
| Documentation cascade (design plan §4.6, AI_HANDOFF.md) for new territory signal | LOW | No | Add to acceptance criteria |
| V7-B1 fixture set coupling to V6 workbook means V6 must be reproducible | LOW | Implicit | Pin V6 workbook SHA in fixtures' provenance; preserve V6 workbook |
| V7 introduces new regression at the metric level (cohort-shape catches) | LOW | YES (V7-B4) | Acceptable; V7-B4 is the safety net |
| V7 too big for one round | LOW | YES (clear A/B split) | Acceptable as-is |

The two HIGH risks (V7-A1, V7-A3 gating + tokens) are blocking. The MEDIUM risks are fix-before-execution. The LOW risks are nice-to-have but don't block.

## Plan's Open Questions — My Answers

### Q1: Territory token list completeness

**Mostly complete; cleanup needed.** Strip the bare 2-letter codes (`us`, `eu`, `uk` should require delimiters; `nam`/`naam` are uncommon enough to keep but should also require `-` or `,` proximity). Strip the nationality adjectives (`indian`, `japanese`, `korean`, `chinese`) — they collide with language/skill mentions, not territory. Retain the country names (`india`, `japan`, etc.) and the multi-word region terms (`emea`, `apac`, `latam`, `anz`, `dach`, `gcc`). Resolve `mexico` to NON_NA only.

### Q2: Territory detection precedence

**Title-first → section-targeted second is correct.** Add: if section detection fails (no recognized "Responsibilities" / "What you'll do" / "About the role" header), default to UNKNOWN, NOT whole-body scan. This is the critical guard against country-dropdown contamination.

### Q3: Territory + non-sales role gating

**The gate as written is unimplementable** (SALES, AE_HYBRID don't exist). Drop the family clause. Gate on `sales_role_signal_present OR has_hard_sales_title` only — these two cover the cases that matter. A pure remote AI Engineer at a global company with EMEA/APAC team mention will not have either condition met → no drop. ✓ A Solutions Architect EMEA with sales JD content will have sales_role_signal_present → drop. ✓

### Q4: Real-data fixture sampling stratification

**50 rows is enough for V7;** 50/50 should pass strictly (no "≥45/50" slop). Categories balanced correctly. Adversarial fixtures should stay separate (V7-B2 is in `test-job-fit-rules.mjs`; V7-B1 is its own file). The split is meaningful: real-data fixtures verify behavior on production-shaped rows; adversarial fixtures verify behavior against engineered failure shapes. Don't merge.

### Q5: Property test coverage

The 7 invariants are right. Add: determinism (same input → same output), family-base correspondence (primary_family ↔ score_parts.family), source-repair implies hard_drop=false. Drop or revise the "hard_drop=true ⇒ band is null or C" — it's not true under current `scoreJob`.

### Q6: Cohort-shape ranges

Most are too wide. See V7-B4 review above. Specific tightening: `sales_hard_drops [78, 92]`, `territory_hard_drops [10, 30]`, `shadow_hard_drops [476, 526]`. Tighter ranges catch more regressions; legitimate tuning should update ranges with a comment.

### Q7: Anything missing?

Yes — see "What's Missing" below. Most important: V6 baseline preflight, documentation cascade, territory signal columns in Shadow Decisions, Round 3 Lattice regression fixture.

### Q8: AE/AM regression test scope

8 cases is enough. Consider adding `Customer Success Manager` (title-level NOT drop, content-level drop), `Account Director` (title regex doesn't currently catch — Will should decide whether to add), and verify `Technical Account Manager` carve-out is not over-broad (a TAM JD with quota content currently does drop via classifySalesRole at line 115, but the test coverage is implicit, not explicit).

## What's Missing (most important section)

1. **V6 baseline preflight.** Before V7 executes, run V6's test suites + regenerate V6 workbook and confirm: (a) all V6 tests still pass, (b) baseline `jobs-2026-05-01.xlsx` SHA = `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`, (c) V6 workbook reproduces deterministically. This catches drift between V6 close (2026-05-05 17:00) and V7 start. Plan should add this as Step 0 of the workflow at line 324.

2. **Documentation cascade for territory signal.** V7-A3 introduces a new first-class signal. Updates needed to:
   - `docs/plans/2026-05-03-production-filter-refinement-design.md` §4.6 (sales policy needs a territory-policy subsection)
   - `AI_HANDOFF.md` (new state of art for filter signals)
   - `AI_AGENTS.md` Project Context (if scoring deal-breakers are documented there — search for "deal-breaker" — yes, US/Canadian on-site/sponsorship rules are documented; territory is conceptually close but distinct)
   - `.claude/rules/pipeline.md` (if any new canonical hard-drop reason needs documenting)
   - `docs/STATUS.md` (V7 wrap-up entry)

3. **New columns in Shadow Decisions sheet.** Plan says "wire territory signal into score/drop decision" but doesn't say what the workbook output looks like. Will needs:
   - `territory_region` (NA / NON_NA / UNKNOWN)
   - `territory_evidence` (matched tokens + snippet)
   - `territory_dropped` (yes/no)
   So Will can review NON_NA rows that didn't drop (to spot-check whether the gate was correct) and NA rows that did drop on other reasons (to confirm territory wasn't overriding).

4. **Round 3 Lattice Semiconductor fixture.** V6's per-label aggregation moved Lattice Product Manager (AI_PROGRAM_OPS) from `sales_role_content; specific_non_toronto_location_no_remote` to `specific_non_toronto_location_no_remote` only. Net: still drops, but via a different reason. This is a behavior change that should be locked in as a fixture so V8 can't accidentally reintroduce the sales_role_content drop on AI_PROGRAM_OPS rows with sales_department alone.

5. **Sales-metric definition clarification.** The audit's `sales_hard_drops` metric at `scripts/production-filter-refinement-audit.mjs:461` filters by `/sales_role/.test(hard_drop_reason)`. V7-A3's new reason `non_na_territory_with_sales_context` doesn't contain `sales_role`. Plan should declare: are territory drops counted as sales drops too? Recommend NO — they go in `territory_hard_drops` (plan's V7-B4 already creates this metric). But the metric definition needs to be in the audit script, not just in the test.

6. **V7-A3 false-positive negative tests.** The Anthropic country-dropdown text contains "British Indian Ocean Territory" and is exactly what tripped V6's `commercial_ownership`. The same body will likely contain it under V7's territory filter. Add adversarial test: "JD body containing only the literal country dropdown list (and no other India/EMEA/APAC tokens in role-content sections) MUST NOT trigger NON_NA territory."

7. **Empty / failed-section-detection handling for territory.** Plan says "Responsibilities, What you'll do, About the role only". If `parseJdSections` returns no sections (poorly formatted JD), what's the territory result? Spec it: UNKNOWN.

8. **Property: determinism.** Plan's V7-B3 doesn't include a determinism check. With seed=42 + 100 random rows, also assert that running the same scoreJob twice produces deep-equal output. Cheap, high-value, catches a class of subtle bugs (Map iteration, Date.now creep, side-effectful regex `.lastIndex`).

9. **Property: source-repair ⇒ hard_drop=false.** Audit script at line 341 forces `hard_drop = "no"` when sourceHygiene.invalid. Validation finding `source_repair_row_has_hard_drop` enforces this contract. Add as property test against random sample.

10. **Acceptance: regression-baseline gate.** Add to acceptance criteria: "for every row in V6's pipeline.md whose hard_drop status changes in V7, the row must be tagged with the V7-Ax change responsible (V7-A1 / V7-A2 / V7-A3). No silent flips." This codifies "V7 only changes what we intended."

## Recommended Plan Revisions (if any)

1. **In §V7-A1, replace the regex** `pre-sales\s+(?:solutions\s+)?(?:engineer|architect|consultant)` with Round 3's proposal `pre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b`. Reason: literal hyphen requirement misses `Presales Engineer`, `Pre Sales Architect`, `Pre-Sales Specialist`, `Pre-Sales Technical Engineer`. Round 3 explicitly proposed the broader pattern.

2. **In §V7-A2, change the regex strategy** from "15-30 char proximity" to Round 3's simpler "remove bare `\bterritory\b`; require literal `\bsales territory\b`." Reason: proximity rules over JD HTML noise are brittle; the simpler form is auditable. Add explicit acceptance: this fix does NOT flip Anthropic India/Japan rows (they still drop at AI_ENGINEERING threshold 4, per Round 3).

3. **In §V7-A3, drop `SALES, AE_HYBRID` from the gate.** Use `(territory.region === "NON_NA") AND (has_hard_sales_title OR sales_role_signal_present)`. Reason: those families do not exist in `FAMILY_BASE` at `scripts/lib/job-fit-rules.mjs:8-18`; the gate is unimplementable as written.

4. **In §V7-A3 token list, resolve `mexico` to NON_NA only.** Remove from NA whitelist. Reason: dual-listing makes the disambiguator break.

5. **In §V7-A3 token list, remove or qualify bare 2-letter region codes (`us`, `eu`, `uk`, `nam`, `naam`).** Require delimiters: `\(us\)`, `\bus[,\-]`, `(?:^|[^a-z])us(?:[^a-z]|$)`. Reason: `us` matches "us users", "tell us", "join us"; `eu` matches "EU GDPR", "EU users".

6. **In §V7-A3 token list, remove nationality adjectives (`indian`, `japanese`, `korean`, `chinese`).** Keep only country names. Reason: collides with language/nationality-of-customers mentions.

7. **In §V7-A3, specify default behavior when `parseJdSections` does not return recognized sections:** UNKNOWN, NOT whole-body scan. Reason: country dropdown HTML often appears outside section headers in Greenhouse pages.

8. **In §V7-A3 acceptance, add new Shadow Decisions sheet columns:** `territory_region`, `territory_evidence`, `territory_dropped`. Reason: enables Will to audit NON_NA-but-not-dropped rows.

9. **In §V7-B3, fix the `hard_drop_reason` validation:** use `split(";").map(s=>s.trim()).every(r => validReasons.includes(r))`, not `validReasons.some(r => result.hard_drop_reason.includes(r))`. Reason: substring check passes typos like `yoe_required_gt_5_BOGUS`.

10. **In §V7-B3, drop the invariant `hard_drop=true ⇒ band null or C`** — it's not true given current `scoreJob` (hard-drop rows still compute their score). Replace with either: revise `scoreJob` to force band=C on hard_drop, OR drop the invariant.

11. **In §V7-B4, tighten ranges:** `sales_hard_drops [78, 92]` (not [60, 90]); `territory_hard_drops [10, 30]` (not [5, 40]); `shadow_hard_drops [476, 526]` (not [470, 530]). Reason: prevents silent regression swallowing.

12. **In §Workflow, add Step 0:** "Run V6 baseline preflight. Confirm V6 tests pass. Confirm baseline SHA = `7bfe4ec5...071e`. Confirm V6 workbook regenerates deterministically." Reason: catches drift between V6 close and V7 start.

## Recommended Additions (if any)

1. **Add §V7-A3 acceptance test for country-dropdown false positive.** "JD body containing the literal Greenhouse country dropdown list (Afghanistan, Albania, ..., British Indian Ocean Territory, ...) and no other Asia/EMEA tokens in role-content sections MUST NOT trigger NON_NA territory."

2. **Add §V7-B2 fixture for Lattice-shape per-label aggregation.** Verify a non-SA/FDE row with sales_department alone (no corroborator) does NOT fire `sales_role_content`. Lattice Semiconductor Product Manager from Round 3 §Regression Detection is the canary.

3. **Add §V7-B3 invariants:**
   - Determinism: `scoreJob(input)` twice deep-equal.
   - Family-base correspondence: `primary_family === "X" ⇒ score_parts.family === FAMILY_BASE[X]`.
   - Source-repair contract: `source_repair === "yes" ⇒ hard_drop === "no"`.

4. **Add §V7-A3 column changes** to Shadow Decisions sheet: `territory_region`, `territory_evidence`, `territory_dropped`.

5. **Add documentation cascade to acceptance:**
   - Update `docs/plans/2026-05-03-production-filter-refinement-design.md` §4.6 with territory subsection.
   - Update `AI_HANDOFF.md` if it documents filter signals.
   - Update `docs/STATUS.md` at V7 wrap-up.

6. **Add regression-baseline gate to acceptance:** every V6→V7 hard_drop change must be tagged with the responsible V7-Ax change. No silent flips.

## Final Sign-Off Checklist

| # | Item | Status |
|---|------|--------|
| 1 | V7-A1 regex extends Round 3's `pre[-\s]?sales\b...specialist` form (not literal-hyphen-only) | TODO |
| 2 | V7-A2 uses literal `sales territory` (not 15-30 char proximity) | TODO |
| 3 | V7-A3 gate references only existing families (drops SALES, AE_HYBRID) | TODO |
| 4 | V7-A3 token list cleaned (no bare `us`/`eu`/`uk`; no nationality adjectives; `mexico` resolved to one bucket) | TODO |
| 5 | V7-A3 specifies UNKNOWN default when section detection fails | TODO |
| 6 | V7-A3 adds territory columns to Shadow Decisions sheet | TODO |
| 7 | V7-B3 `hard_drop_reason` validation uses split-and-every (not substring-some) | TODO |
| 8 | V7-B4 ranges tightened to [78,92] / [10,30] / [476,526] | TODO |
| 9 | Workflow Step 0: V6 baseline preflight | TODO |
| 10 | Acceptance: Anthropic country-dropdown negative test for both `commercial_ownership` AND territory | TODO |
| 11 | Documentation cascade gated in acceptance (design plan §4.6, AI_HANDOFF.md, STATUS.md) | TODO |
| 12 | Lattice-shape per-label aggregation fixture in V7-B2 | TODO |
| 13 | V7-B3 determinism + source-repair-contract invariants added | TODO |

13 items; 13 TODO. None DONE; none N/A.
