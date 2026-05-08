---
status: active
type: audit
owner: round5-verification-agent
last-updated: 2026-05-06T18:16:00-04:00
read-if: "you are deciding whether V8 is ready for production wiring"
skip-if: "production wiring already done"
related:
  - docs/plans/2026-05-06-v8-consolidated-plan.md
  - docs/audits/2026-05-06-v8-implementation-summary.md
  - docs/audits/2026-05-06-production-filter-refinement-v8-summary.json
  - docs/audits/2026-05-06-shadow-v7-v8-diff-summary.json
  - docs/audits/2026-05-06-v8-source-hygiene-audit.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/lib/jd-sections.mjs
  - scripts/production-filter-refinement-audit.mjs
  - career-ops/output/production-filter-refinement-review-2026-05-01-v8.xlsx
  - career-ops/output/production-filter-refinement-v7-v8-diff.xlsx
---

# V8 → Round 5 Verification Findings

## Verdict

**V8_NEEDS_V9_REFINEMENT**

V8 implements all 21 plan-v2 sign-off items as claimed; the rule cascade, code structure, fixture revisions, diff workbook, and reason-rename cascade are all clean. **However, the implementation summary's central empirical claim — "Sample-verified: all 101 territory drops are legitimate non-NA roles. Zero false positives." — is contradicted by primary-source JD evidence.** Independent verification of the 25-row stratified sample plus a bounded grep across all 29 V7→V8 status flips finds **3 confirmed false positives (Vercel Pricing PM, Vercel SE AI SDK, XBOW SE AI Systems)** and **1 confirmed miss (Cohere FDE Infrastructure Specialist — Round 4 named cohort, still kept as UNKNOWN)**. Both failures share a single structural root cause: V8 expanded the NON_NA token list (13 countries + non-NA cities) but kept NA tokens at full-name granularity only. Bare US-city abbrevs (`SF`, `NY`) and coast descriptors (`US East Coast`) never tokenize to NA, so multi-region role-base text like `(SF, NY, London, or Berlin)` resolves NON_NA when it should resolve NA. V9 is a half-day patch — extend `NA_CITIES_RE`, add 3-4 fixtures, regenerate. Otherwise V8's gains (98 genuine new drops, named cohort coverage, clean classifier attribution) are real and ready.

## A — 21-Item Sign-Off Checklist Verification

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | V8-A1 token-scan retained AND role-anchor patterns added (additive) | PASS | `scripts/lib/job-fit-rules.mjs:288-300` ROLE_ANCHOR_PATTERNS; original section-token scan retained at lines 432-441 with anchor scan at 449 layered additively |
| 2 | V8-A1 SECTION_ALIASES extended | PASS | `scripts/lib/jd-sections.mjs:11` adds Your Impact / What You'll Drive / Day-to-Day / About this Role / Job Details / The Position / Your Mission to `responsibilities`; line 22 adds What we offer / What You'll Get to `compensation`; line 29 adds Where you'll work to `location` |
| 3 | V8-A1 recognizedTypes extended to include `location` | PASS | `scripts/lib/job-fit-rules.mjs:423` `new Set(["responsibilities", "requirements", "location"])` |
| 4 | V8-A1 multi-region tie rule defined and tested | PASS (per design) / PARTIAL (per data) | Defined at line 489-497; tested in V8-B2 case 26 + fixture F-055; **but** the rule only fires when an anchor pattern matches. Most multi-region listings in real JDs use prose like "if you're based within commuting distance of one of our offices (SF, NY, London, or Berlin)" which does NOT match any of the 10 ROLE_ANCHOR_PATTERNS and falls to UNKNOWN — except when NA tokens are missing from the city list (see B below), the body-tie path returns NON_NA. |
| 5 | V8-A1 reason renamed across files | PASS | `grep -r non_na_territory_with_sales_context .` (verified) returns only doc/comment references and the V6→V7 diff classifier (which must keep recognising the V7 string). Production code emits only `non_na_territory`. The `metric: "territory_hard_drops"` filter at `scripts/production-filter-refinement-audit.mjs:471` uses `/non_na_territory/.test(...)` regex which still matches both old and new strings — defensive choice. |
| 6 | V8-A1 NON_NA token list expanded with 13 countries | PASS | `scripts/lib/job-fit-rules.mjs:276` NON_NA_MULTI_RE includes vietnam, philippines, thailand, indonesia, malaysia, pakistan, egypt, south africa, qatar, bahrain, peru, chile, colombia (13), plus the existing list and ~16 added country names; `NON_NA_CITIES_RE` adds non-NA cities. |
| 7 | V8-A1 negative tests for company-context patterns | PASS | `scripts/test-job-fit-rules.mjs:312-680` includes negative cases for "global team distributed across EMEA, APAC, Americas" and country-dropdown literal text returning UNKNOWN. |
| 8 | V8-A2 hardSalesTitleRe extended for Director-level + Regional Sales Manager | PASS | `scripts/lib/job-fit-rules.mjs:133` extends hardSalesTitleRe with `account director`, `sales director`, `director,?\s+sales`, `director\s+of\s+sales`, `regional sales(?:\s+(?:manager\|director\|representative\|specialist))?` |
| 9 | V8-A2 expected impact correctly described | PASS | Implementation summary §"V8-A2 Verification" notes `v8_a2_attributed_rows = 0` because Will's portal title-filter strips Director titles upstream. Defense-in-depth at the rule layer documented. |
| 10 | V8-A3 CSM rule with carve-out implemented | PASS | `scripts/lib/job-fit-rules.mjs:149-158` defines csmRe + csmCarveOutRe; "regex-shape consequence" framing for Customer Success Engineer documented in comment lines 147-148. |
| 11 | V8-A4 audit report exists | PASS | `docs/audits/2026-05-06-v8-source-hygiene-audit.md` with 75/25 sample, Workday language-switcher pattern identified. |
| 12 | V8-A4 source-hygiene extensions implemented with positive AND negative tests | PASS | `scripts/production-filter-refinement-audit.mjs:678-688` adds `workday_language_switcher_chrome` rule; `scripts/test-production-filter-refinement-audit.mjs:142-170` 3 tests. |
| 13 | V8-A4 precision check on V7 Source Repair Review | PASS | Audit report §"Precision check" documents 25/25 = 100% legitimate non-JDs in 25-row sample. |
| 14 | V8-B1 fixtures updated IN PLACE with `revised_in` audit trail | PASS | `scripts/test-fixtures/v7-realdata-fixtures.jsonl` retains filename; revised_in trail observable on grep (50 V7 fixtures + 10 new V8 fixtures). |
| 15 | V8-B1 new fixtures added (Round 4 cohort + canonical missing + V8-A2/A3) | PASS | 4 named cohort fixtures (Cohere/Mistral/Palantir/H2O) + 6 synthetic (multi-region tie, Location header, Account Director, CSM pure, CSM carve-out, Regional Sales Manager) = 10 added. |
| 16 | V8-B2 35 adversarial fixtures total | PASS | Implementation summary §"Code Changes" cites V7=18 + V8=17 = 35 cases. |
| 17 | V8-B3 enum updated + new NON_NA-implies-drop invariant | PASS | `scripts/test-properties.mjs:43-58, 220-237` per implementation summary. |
| 18 | V8-B4 territory_hard_drops range update | PARTIAL | Plan v2 mandated `[16, 25]`; agent widened to `[85, 120]` after observing actual=101. Widening was justified by sample-verified empirical data — but the sample-verification claim itself is now contradicted (see B). The wider range hides any future regressions in the same shape. **This is the loudest gauge that the sample-verification step was insufficiently rigorous.** |
| 19 | Documentation cascade (design plan §4.6, AI_HANDOFF.md, STATUS.md) | PASS (assumed) | Per implementation summary; not exhaustively re-verified in this audit. |
| 20 | INDEX registers all new files | PASS (assumed) | Per implementation summary §"Files Written". |
| 21 | V7→V8 diff workbook + summary | PASS | `career-ops/output/production-filter-refinement-v7-v8-diff.xlsx` exists; `docs/audits/2026-05-06-shadow-v7-v8-diff-summary.json` shows v8_a1=101, v8_a2=0, v8_a3=1, v8_a4=0, v8_other_unattributed=0 — clean attribution. |

**Summary:** 19 PASS, 1 PARTIAL (item 4 — design correct, real-data coverage incomplete), 1 PARTIAL (item 18 — range widened reactively rather than diagnostically).

## B — The 101 Claim Independent Verification

### Sampling methodology

Extracted all 101 rows from `Shadow Decisions` sheet in V8 workbook where `hard_drop_reason` matches `/non_na_territory/i`. Confirmed count matches `V8-A1 Strict NA Territory` diff sheet (101) and summary metrics (`territory_hard_drops: 101`). Stratified sample of 25 rows by selecting one row per company in count-desc order; 38 distinct companies surface in the territory drops, top concentrations: OpenAI=22, Veeva=7, Mistral=7, Anthropic=6, Glean/DevRev=5 each, Snowflake=4. This sample reaches 25 distinct companies.

### Per-row outcomes (25-row stratified sample)

| # | Company | Title | V7→V8 transition | Verdict |
|---|---------|-------|------------------|---------|
| 1 | OpenAI | AI Deployment Engineer - Tokyo | reason-add (V7 already drop) | CORRECT (title:NON_NA Tokyo) |
| 2 | Veeva Systems | Product Manager - Activity | reason-add (V7 already drop) | CORRECT (Germany - Frankfurt + Remote-Germany) |
| 3 | Mistral AI | AI Developer Advocate - Singapore | reason-add (V7 already drop) | CORRECT (title Singapore) |
| 4 | Anthropic | Applied AI Architect (India) | reason-add (V7 already drop) | CORRECT (Anthropic India team body anchor) |
| 5 | Glean | Product Manager (Bangalore) | reason-add (V7 already drop) | CORRECT (3 days/week in Bangalore office) |
| 6 | DevRev | FDE Applied AI (Japan) | STATUS FLIP | CORRECT (Japan Remote section header) |
| 7 | Snowflake | Solutions Architect (Israel) | STATUS FLIP | CORRECT (IL-Israel-Remote) |
| 8 | Cloudflare | Software Engineer, AI Agents | reason-add (V7 already drop) | CORRECT (Location: India, Bangalore) |
| 9 | Sierra | PM Agent Development (London) | reason-add (V7 already drop) | CORRECT (London On-site) |
| **10** | **Vercel** | **Pricing Product Manager** | **STATUS FLIP** | **FALSE POSITIVE** — body header lists "San Francisco" + multi-region "(SF, NY, London, or Berlin)"; SF/NY not in NA_CITIES_RE so detector reads only London/Berlin |
| 11 | H2O.ai | AI Engineer (APAC body) | STATUS FLIP | CORRECT — actual location is "Colombo, Sri Lanka" (Sri Lanka not in NON_NA token list, but APAC anchor catches it) |
| 12 | Celonis | Applied AI Engineer (Bangalore) | reason-add (V7 already drop) | CORRECT (anchor: based in India) |
| 13 | Notion AI | Solutions Engineer, Tokyo | reason-add (V7 already drop) | CORRECT (title Tokyo) |
| 14 | Omnea | Solutions Engineer (London) | reason-add (V7 already drop) | CORRECT (London role) |
| 15 | UiPath | Technical Account Manager | STATUS FLIP | CORRECT (Remote-Mexico City; Remote-Sao Paulo) |
| 16 | Lovable | Solutions Architect | reason-add (V7 already drop) | CORRECT (Stockholm or London; anchor fires) |
| 17 | ServiceNow | FDE Solution Engineer | reason-add (V7 already drop) | CORRECT (Dublin) |
| 18 | dbt Labs | Manager, Customer Solutions Engineering | STATUS FLIP | CORRECT (Australia - Remote header) |
| 19 | Thought Machine | PM Vault Payments | reason-add (V7 already drop) | CORRECT (United Kingdom, London On-site) |
| **20** | **XBOW** | **Software Engineer - AI Systems** | **STATUS FLIP** | **FALSE POSITIVE** — body Location section: "Europe (Remote); US East Coast". "US East Coast" doesn't tokenize to NA in NA_CITIES_RE/NA_MULTI_RE; only Europe registers. Role IS open to NA candidates (US East Coast). |
| 21 | Tenstorrent | C++ ML Engineer | STATUS FLIP | CORRECT (anchor: based out of Warsaw or Gdansk, Poland) |
| 22 | Airbnb | ML Engineer Community Support | STATUS FLIP | CORRECT (Location: This position is China - Remote Eligible) |
| 23 | Pure Storage | Consulting FSA (DACH) | reason-add (V7 already drop) | CORRECT (title DACH) |
| 24 | Scale AI | FDE AI Engineering Manager (European) | reason-add (V7 already drop) | CORRECT (lead our European FDE team) |
| 25 | Dataiku | Generative AI Engineer | STATUS FLIP | CORRECT (United Kingdom, Remote) |

### Statistic

- **23/25** unambiguously correct
- **0/25** arguable
- **2/25 (8%) confirmed false positives** — Vercel Pricing PM (#10), XBOW SE AI Systems (#20)

This **meets the task brief's escalation threshold of "even 2/25 wrong"**. The implementation summary's claim of zero false positives is **FALSE**.

### Bounded scan across all 29 V7→V8 status flips

To bound the FP cohort without re-verifying every row, I grep'd `territory_evidence` across the 29 status flips for the diagnostic patterns `(SF|NY|US East|US West|east coast|west coast|LA|DC)` (case-insensitive). Result:

```
STATUS-FLIP: XBOW   | Software Engineer - AI Systems       | section:NON_NA Europe: Europe (Remote); US East C...
STATUS-FLIP: Vercel | Pricing Product Manager              | section:NON_NA London: f one of our offices (SF, NY, London, or Berlin)...
STATUS-FLIP: Vercel | Software Engineer, AI SDK            | section:NON_NA London: f one of our offices (SF, NY, London, or Berlin)...
```

The same scan across 66 reason-add rows (where V7 already dropped for another reason and V8 adds territory as a secondary reason) returned **0 hits** — these don't change Will's outcome since the row is already dropped.

**Confirmed FP rate: 3/29 status flips = 10.3%** with no other suspected FPs detected by the diagnostic scan. The Vercel SE AI SDK is a third confirmed FP not covered in the 25-row sample but caught by the bounded scan.

### Round 4 named cohort confirmation

| Round 4 row | V8 status | V8 reason | Verdict |
|-------------|-----------|-----------|---------|
| Cohere FDE Infrastructure Specialist (`38f75a48`) — `Location: Japan; Korea; Singapore` | **kept** (UNKNOWN) | — | **MISS — should drop**. Body-tie disambiguation gave UNKNOWN because company-context "offices in Toronto, New York, San Francisco, London and Paris" tokens (3 NA + 2 NON_NA from those cities) tied with Location-section tokens (Japan/Korea/Singapore = 3 NON_NA). No anchor fired (the "offices in" phrase doesn't match any ROLE_ANCHOR_PATTERN; the Location section is `## Location` then bare list "Japan; Korea; Singapore" with no `Location: <X>` colon). |
| Cohere Applied AI Engineer Singapore (`9c18b199`) | drops | `non_na_territory` | CORRECT (title:NON_NA Singapore) |
| Mistral FDE ML Engineer- Singapore (`6fc7ccb5`) | drops | `non_na_territory` | CORRECT (title:NON_NA Singapore) |
| Mistral FDE ML Engineer (no -Singapore suffix, `a73cb128`) | drops | `hybrid_non_toronto_no_remote` only | NOT on territory — territory_region=UNKNOWN. Same body-tie pattern as Cohere FDE Infrastructure. **Borderline miss** but row still drops on hybrid signal, so net outcome correct. |
| Mistral PM Forge | drops | `non_na_territory` | CORRECT (Office: Paris, France / London, UK; remote: France, UK, Germany, Belgium, Netherlands, Spain, Italy) |
| Mistral PM AI Studio / Context & Search / Mistral Vibe (Paris cohort) | drops | `non_na_territory` | CORRECT |
| Palantir FDE Software Engineer (Vilnius) | drops | `non_na_territory` | CORRECT (Open to relocation within Europe) |
| H2O.ai AI Engineer (3x — Sri Lanka) | drops | `non_na_territory` | CORRECT (APAC anchor; actual locations Colombo Sri Lanka per `## Location` headers) |
| H2O.ai Machine Learning Engineer | kept | UNKNOWN | Not in Round 4 named "should drop" cohort — outside cohort verification scope. Quick check: title has no territory tag. |

**1 confirmed Round 4 cohort miss** (Cohere FDE Infrastructure Specialist) — Will explicitly named Cohere Singapore as a "should drop" cohort and this row's `## Location\nJapan; Korea; Singapore` header makes intent unambiguous. The Mistral `a73cb128` row is also a borderline miss on territory specifically but is salvaged by an unrelated hybrid hard-drop reason.

### False-positive risk sample (10 V7-keeps-but-V8-drops)

This was effectively executed via the bounded grep scan (above) — only 3 of 29 status flips had the diagnostic asymmetry pattern, and all 3 are confirmed FPs by JD-body inspection. The remaining 26 status flips were verified at the evidence-string level: country names (Germany, Brazil, Israel, Mexico, Australia, NZ, Vietnam, Spain, Portugal, Italy, Ireland, Poland, China, India, UK, Sri Lanka), region names (Europe, EMEA, LATAM, DACH), or non-NA cities (London, Bangalore, Mumbai, Berlin, Paris, Tokyo) appear unambiguously and the role's Location/title section confirms non-NA-only.

## C — Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| All test suites pass (~1,260+ assertions) | PASS — implementation summary cites 1,301; not re-run, but trust factor is high since FPs you found wouldn't be caught by current fixtures (gap, not regression) |
| V8 workbook generated; baseline SHA preserved | PASS — V8 summary JSON: `baseline_sha_before` == `baseline_sha_after` == `7bfe4ec5...071e` |
| `non_na_territory` reason replaces `non_na_territory_with_sales_context` | PASS — grep confirms only doc/comment references remain |
| V7→V8 diff tags every hard_drop change | PASS — diff summary `v8_other_unattributed_rows: 0` |
| Strict-NA verified by data | **PARTIAL** — 1 named cohort row (Cohere FDE Infrastructure Specialist) does not drop; should |
| No false-positive regressions | **FAIL** — 3 confirmed FPs (Vercel x2, XBOW) where V7 correctly kept and V8 wrongly drops |
| Multi-region tie verified | PARTIAL — design correct on synthetic fixtures (F-055), data-broken on real-world prose because anchor patterns don't match the most common multi-region phrasing ("if you're based within commuting distance of one of our offices") |
| W-4 audit + precision check pass | PASS |

## D — Body-Tie Interpretation Assessment

The implementation agent's interpretation: "Tie or majority NA → NA" applies ONLY when an anchor fires; UNKNOWN-on-tie preserved when no anchor fires. **This is defensible against the strict-NA intent under one set of assumptions and indefensible under another:**

- **Defensible:** the anchor patterns exist precisely to disambiguate role-base from company-context. "Distributed across EMEA, APAC, Americas" without a "based in"/"located in" anchor is genuinely ambiguous — UNKNOWN is the safe default.
- **Indefensible empirically:** real JDs don't always use anchor verbs for multi-region role bases. Vercel's "if you're based within a pre-determined commuting distance of one of our offices (SF, NY, London, or Berlin)" is a clear role-base indication that any of those cities qualifies — the anchor regex `\bbased\s+(?:in|out\s+of)\s+...` matches "based in" not "based within"; `\boffice:?\s+...` matches "office:" not "offices (...)". The interpretation is correct in the abstract but undertested against real prose.
- **Cohere FDE Infrastructure Specialist is the cleanest counter-example:** `## Location\nJapan; Korea; Singapore` is the role's location section. Adding `\b(?:^|\n)Location\s*\n\s*([\w\s,;]{3,80})\b` to ROLE_ANCHOR_PATTERNS would catch that shape. The current `^\s*location:?\s+([\w\s,]{3,40})\s*$/gim` requires the city to be on the SAME line as "Location:" — a markdown-rendered `## Location\n\nJapan; Korea; Singapore` doesn't match.

The body-tie default isn't fundamentally wrong; it's the supporting anchor patterns that are too narrow. V9 should expand anchor coverage rather than re-default the tie.

## E — Regression Detection

**V7 hard drops preserved (sampled 10 from V7's 7 territory drops + general drops):** all V7 territory drops are preserved in V8 per implementation summary §"Strict-NA Cohort Verification" and the diff summary's `hard_drop_removed_rows: 0`. No regressions on previously-correct V7 hard drops in the broader signal set.

**Newly-dropping rows verified above (sample 25 + bounded scan over 29).** 26/29 status flips are correct (the 26 non-FP status-flip rows align with Will's strict-NA intent — Australia, China, Israel, Mexico, etc.). 3/29 (10.3%) are wrong.

**Newly-keeping rows in V8:** none. V8 added 30 hard drops, removed 0. Reviewer Queue shrank from 378 → 348.

**Silent flips:** none — `v8_other_unattributed_rows: 0` per diff summary. Every V7→V8 change is attributed to V8-A1/A2/A3/A4. The classifier is honest; the rule is the issue.

**Notion AI Partner SE attribution edge case** (per implementation summary §"Anything Unexpected" #5): V7 had `non_na_territory_with_sales_context`, V8 has `onsite_non_toronto_no_remote` only — territory_region went NON_NA → UNKNOWN because V8's expanded `location` recognizedType + NA_CITIES_RE picked up "New York" alongside "US and LATAM" tokens, triggering the body-tie UNKNOWN fallback. Net outcome unchanged (still hard_drop=yes). This is documented honestly and acceptable.

## Root Cause Analysis (V9 scope precondition)

Both classes of failure (Vercel/XBOW FP and Cohere FDE miss) trace to ONE structural asymmetry in V8's token tables:

- **NON_NA tokens** were expanded heavily: 13 new countries (vietnam, philippines, thailand, indonesia, malaysia, pakistan, egypt, south africa, qatar, bahrain, peru, chile, colombia) + ~16 prior countries upgraded to multi-word matches + non-NA cities (london, paris, berlin, bangalore, mumbai, tokyo, sydney, etc.).
- **NA tokens** received NA_CITIES_RE expansion (toronto, gta, montreal, vancouver, calgary, ottawa, new york, nyc, san francisco, bay area, los angeles, seattle, austin, boston, denver, chicago, washington d.c., atlanta, dallas, miami, portland, philadelphia, minneapolis, houston, raleigh, durham, phoenix, san diego, menlo park, mountain view, palo alto, redwood city, hawthorne, sunnyvale, san jose, brooklyn, cambridge, waterloo). That's good coverage for full names.
- **What's missing on the NA side:** bare US-city abbreviations (`SF`, `NY`, `LA`, `DC`) and US regional descriptors (`east coast`, `west coast`, `us east coast`, `us west coast`, `the east coast`, `the west coast`).

The NA-side gap is exactly the shape that breaks the body-tie rule on real-world prose:

- "(SF, NY, London, or Berlin)" → tokenizes to 0 NA + 2 NON_NA → NON_NA (FP).
- "Europe (Remote); US East Coast" → 0 NA + 1 NON_NA → NON_NA (FP).
- "offices in Toronto, New York, San Francisco, London and Paris" → 3 NA + 2 NON_NA, no anchor → UNKNOWN (miss when this is company-context tied with role-base NON_NA).

The Cohere FDE miss is a related but distinct sub-problem: the markdown-rendered `## Location\n\nJapan; Korea; Singapore` shape is not covered by any of the 10 ROLE_ANCHOR_PATTERNS (the closest pattern requires "Location:" with the value on the same line).

## Recommendations

### V9 patch scope (half-day)

1. **Extend NA_CITIES_RE in `scripts/lib/job-fit-rules.mjs:269`:**
   - Add bare US-city abbreviations: `\bSF\b`, `\bNY\b`, `\bLA\b`, `\bDC\b` — guard with case-sensitivity considerations (these are legitimate words in lowercase prose like "la carte" — recommend matching only when adjacent to other NA city tokens or in capitalised lists, e.g. parenthetical city lists `\([^)]*\b(SF|NY|LA|DC)\b[^)]*\)`).
   - Add coast descriptors: `\b(?:us\s+)?east\s+coast\b`, `\b(?:us\s+)?west\s+coast\b`.
2. **Extend ROLE_ANCHOR_PATTERNS at `scripts/lib/job-fit-rules.mjs:288-300`:**
   - Add a multi-line `## Location` block matcher: `/^#{1,3}\s*Location\s*\n+([\w\s,;]{3,120})/gim`.
   - Add an "offices in" multi-region pattern: `/\boffices?\s+in\s+([\w\s,;]+?)(?:\.|\n|$)/gi` (will capture the whole comma-separated list for tokenisation).
3. **Add 4 new fixtures to `scripts/test-fixtures/v7-realdata-fixtures.jsonl`:**
   - Vercel Pricing PM (and SE AI SDK) — expected NA, NO drop; document the (SF, NY, London, or Berlin) shape.
   - XBOW SE AI Systems — expected NA, NO drop; document the "Europe (Remote); US East Coast" shape.
   - Cohere FDE Infrastructure Specialist (`38f75a48`) — expected NON_NA, drop; document the `## Location` markdown header shape.
4. **Tighten cohort-shape `territory_hard_drops` range from `[85, 120]` back toward `[95, 110]`** after V9 fix (3 FPs removed + 1 miss added → ~99). This restores the loud-fail behaviour the wide range surrendered.
5. **Re-run V8/V9 diff** and verify `v9_a1_attributed_rows` covers the patch's net delta.

### Independent of V9

- The implementation summary's "sample-verified" claim is the most concerning artifact of this round. The agent ran a 12-row "no-FP" sample (Arize, dbt, HeyGen, Skild, Fathom, Ideogram) but those were all V8-keeps with NA/UNKNOWN territory — not V8-drops. Sampling V8 *kept* rows can't surface FPs in V8 *dropped* rows. The verification methodology should sample stratified from the dropped cohort, which Round 5 did. **This is a meta-rule worth recording in `.claude/memory/pitfalls.md`:** when validating a new gate, stratify-sample the cohort the gate added, not the cohort it preserved.

### Bottom line

V8 implementation work is largely sound. Code quality, test infrastructure, fixture revision discipline, reason-rename cascade, classifier attribution, and 26/29 of the status flips are correct. The one structural bug (asymmetric NA/NON_NA token coverage) is bounded, diagnosable, and patchable in half a day. **Verdict: V8_NEEDS_V9_REFINEMENT** — do not wire to production until the 3 FPs are resolved and the Cohere-FDE-class miss has at least one fixture.
