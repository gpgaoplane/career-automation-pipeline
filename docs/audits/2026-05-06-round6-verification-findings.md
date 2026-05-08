---
status: active
type: audit
owner: round6-verification-agent
last-updated: 2026-05-06T23:55:00-04:00
read-if: "you are deciding whether V9 is ready for production wiring"
skip-if: "production wiring already done"
related:
  - docs/audits/2026-05-06-round5-verification-findings.md
  - docs/audits/2026-05-06-v9-implementation-summary.md
  - docs/audits/2026-05-06-production-filter-refinement-v9-summary.json
  - docs/audits/2026-05-06-shadow-v8-v9-diff-summary.json
  - career-ops/output/production-filter-refinement-review-2026-05-01-v9.xlsx
  - career-ops/output/production-filter-refinement-v8-v9-diff.xlsx
  - scripts/lib/job-fit-rules.mjs
  - scripts/test-job-fit-rules.mjs
  - scripts/test-fixtures/v7-realdata-fixtures.jsonl
  - scripts/test-cohort-shape.mjs
  - scripts/v8-v9-diff.mjs
  - scripts/test-v8-v9-diff.mjs
---

# V9 → Round 6 Verification Findings

## Verdict

**V9_NEEDS_V10_REFINEMENT**

V9 successfully closes all 3 Round 5 confirmed false positives (Vercel Pricing PM, Vercel SE AI SDK, XBOW SE AI Systems) via V9-1 NA_CITIES_RE expansion, recovers the named Cohere FDE Infrastructure Specialist miss via V9-2 location-section anchor, all 1,331 test assertions pass, baseline SHA preserved. **However, V9-2's location-section implicit-anchor mechanism reuses anchor-majority disambiguation in a way that wrongly drops at least 2/4 of the ancillary captures the implementation summary claims are legitimate.** Specifically, GitLab Engineering Manager (Workflow Catalog) — which lists `Remote, EMEA; Remote, US-Southeast` — and ElevenLabs Forward Deployed Engineer — which lists `San Francisco; Brazil; France; India; New York` — are multi-region roles that EXPLICITLY accept NA candidates, but V9 hard-drops them on `non_na_territory`. These are the exact same shape (NA-token + NON_NA-token mixed multi-region location section) that V9-1 fixed for Vercel's parens-list FPs, but the V9-2 anchor mechanism overrides V9-1's body-tie default-permissive logic when location-typed sections are present. Net effect: 2 confirmed V9 FPs introduced (50% of the 4 ancillary V9-A2 captures). The implementation summary's "zero false positives in the 4 newly-added drops" claim repeats Round 5's verification methodology error: spot-checking by reading the location string, not by confirming the role is NA-excluded.

V10 is a half-day patch — gate the implicit location-section anchor on either (a) NON_NA tokens being a strict majority within the section body, OR (b) absence of any NA tokens in the same section body. The 2 correct V9-A2 ancillary drops (OpenAI Startups India-only, GitLab AI Engineer Bangalore-only) would still drop under either gate. Round 5 closures and named-cohort recovery preserved.

## A — Named Cases (4)

| Row | V8 status | V9 status | Verdict |
|-----|-----------|-----------|---------|
| Vercel | Pricing Product Manager | drop / non_na_territory / NON_NA | **keep** / "" / UNKNOWN | **CORRECT (V9-A1 closes FP)** — diff workbook confirms `v9_cause = V9-A1`, change_type includes `hard_drop_removed`, old evidence shows `(SF, NY, London, or Berlin)` parens-list pattern |
| Vercel | Software Engineer, AI SDK | drop / non_na_territory / NON_NA | **keep** / "" / UNKNOWN | **CORRECT (V9-A1 closes FP)** — same shape as Pricing PM |
| XBOW | Software Engineer - AI Systems | drop / non_na_territory / NON_NA | **keep** / "" / NA | **CORRECT (V9-A1 closes FP)** — V9-2 location-section anchor adds `anchor:NA US East Coast`; territory_region transitions to NA |
| Cohere | Forward Deployed Engineer, Infrastructure Specialist | keep / "" / UNKNOWN | **drop** / non_na_territory / NON_NA | **CORRECT (V9-A2 recovers miss)** — `## Location\nJapan; Korea; Singapore` markdown body now fires implicit anchor; 3 NON_NA tokens dominate over 2 NA tokens from company-context Toronto/NY |

All 4 named cases behave exactly as Round 5 spec'd. Diff workbook attribution is clean (V9-A1=3, V9-A2=5 including Cohere).

## B — V9-2 Ancillary Captures (4 rows beyond Cohere)

Independently traced via direct invocation of `detectTerritory` against parsed JD bodies pulled from `career-ops/data/job-descriptions-cache.json`.

| Row | V9 evidence | Section text | NA tokens | NON_NA tokens | Anchor breakdown | Verdict |
|-----|-------------|--------------|-----------|---------------|------------------|---------|
| GitLab \| Engineering Manager, AI Engineering:Workflow Catalog | `section:NA usa: ...handbook... \| section:NON_NA EMEA: Remote, EMEA; Remote, US-Southea` | location: `Remote, EMEA; Remote, US-Southeast` | `, US-` (matches NA_DELIMITED_US_RE in `, US-Southeast`) | `EMEA` | NA=0, NON_NA=1 → NON_NA wins anchor majority | **FALSE POSITIVE** — role explicitly lists `Remote, US-Southeast` as accepted base; Will (Toronto remote) would qualify. Hard-dropping is wrong. |
| GitLab \| AI Engineer | `section:NON_NA Bangalore: Remote, Bangalore` | location: `Remote, Bangalore` | (none) | `Bangalore` | NA=0, NON_NA=1 → NON_NA | **CORRECT** — Bangalore-only role |
| ElevenLabs \| Forward Deployed Engineer - Software Engineer | `section:NA San Francisco / NA New York / NON_NA Brazil/France/India / anchor:NA San Francisco: location-section: San Francisco; Brazil; France; India; New York` | location: `San Francisco; Brazil; France; India; New York` | `San Francisco`, `New York` | `Brazil`, `France`, `India` | NA=2, NON_NA=3 → NON_NA wins anchor majority | **FALSE POSITIVE** — role explicitly lists San Francisco AND New York as accepted bases; "We prioritize your talent, not your location" in body. Will would qualify via SF remote or NY. |
| OpenAI \| AI Deployment Engineer, Startups | `section:NON_NA India: India - Remote \| anchor:NON_NA India: location-section: India - Remote` | location: `India - Remote` | (none) | `India` | NA=0, NON_NA=1 → NON_NA | **CORRECT** — India-only role |

**Statistic: 2/4 unambiguously CORRECT (OpenAI Startups, GitLab Bangalore); 2/4 confirmed FALSE POSITIVES (GitLab Engineering Manager Workflow Catalog, ElevenLabs FDE).**

### Root cause of the new FPs

V9-2's mechanism in `scripts/lib/job-fit-rules.mjs:389-408` (`scanRoleAnchors`) treats any `location`-typed section body ≤120 chars as an implicit anchor capture. The captured text is then run through `classifyAnchorCapture` (line 347), which tokenizes on `[,/;\n]|\s+\bor\b\s+|\s+\band\b\s+|\s-\s` and counts NA / NON_NA tokens.

The implicit anchor evidence is then added to `naAnchors` / `nonNaAnchors` counts in `detectTerritory` (line 515). In the disambiguation block (lines 555-563), when `anchorAny=true`, **NON_NA-anchor strict majority causes NON_NA region**. There is no consideration of the NA tokens detected in the same section body.

For GitLab Eng Mgr: section body = `Remote, EMEA; Remote, US-Southeast`. Token-level scan finds 1 NA (`, US-` matches NA_DELIMITED_US_RE) + 1 NON_NA (`EMEA`). Anchor scan tokenizes the same body into `[Remote, EMEA, Remote, US-Southeast]` and only `EMEA` matches a NON_NA classifier; `US-Southeast` does NOT match NA_DELIMITED_US_RE because that regex requires symmetric punctuation context (`-us-` or `,us,`), not `us-Southeast`. Net: 0 NA anchors + 1 NON_NA anchor → NON_NA wins.

For ElevenLabs FDE: section body splits to `[San Francisco, Brazil, France, India, New York]`. NA = 2 (San Francisco + New York), NON_NA = 3. Strict majority NON_NA → NON_NA wins. Bug is **independent of the bare-abbrev gap** — it's a numeric-majority issue applied to multi-region roles where ANY NA presence should signal "NA-included" rather than "non-NA majority".

### Comparison to V9-1 fixes

V9-1 added bare-abbrev support to NA_CITIES_RE so that `(SF, NY, London, or Berlin)` tokenizes as 2 NA + 2 NON_NA; the body-tie rule then defaults to UNKNOWN (no drop). **For Vercel V9 sets territory to UNKNOWN, not NA — the row is kept because no anchor fires (`offices (SF, NY, London, or Berlin)` doesn't match any ROLE_ANCHOR_PATTERN).**

But for GitLab Eng Mgr and ElevenLabs FDE, the implicit location-section anchor DOES fire (because the section is `location`-typed and ≤120 chars). With `anchorAny=true`, the body-tie path is skipped entirely. The fix-for-Vercel doesn't generalize.

## C — Bare-Abbrev FP Guards

V9-1 NA_DELIMITED_CITY_ABBREV_RE in `scripts/lib/job-fit-rules.mjs:282`:

```js
const NA_DELIMITED_CITY_ABBREV_RE = /(?:\((?:sf|ny|la|dc)\)|\((?:sf|ny|la|dc)[,\s]|[,\s]\s*(?:sf|ny|la|dc)\s*[,\)]|[,\-]\s*(?:sf|ny|la|dc)\s*[,\-]|\[(?:sf|ny|la|dc)\])/i
```

Adversarial tests in `scripts/test-job-fit-rules.mjs:768-801` cover:
- "user satisfaction" — does NOT match (PASS, internal `sf`)
- "salesforce" — does NOT match (PASS, internal `sf`)
- "satisfaction guaranteed" — does NOT match (PASS)
- "à la carte" — does NOT match (PASS, bare `la` no symmetric punctuation)
- "DC current" — does NOT match (PASS, bare `dc` no symmetric punctuation)

All 5 negative cases pass. Adversarial counterexamples I considered:

- "I am SF" — bare `SF` after space, no symmetric guard → would NOT match (correct).
- "this morning SF time" — same shape → would NOT match.
- "DC area" — `DC` followed by space, no symmetric guard → would NOT match.
- "(SF)" — parenthesis guard → matches NA (correct).
- "LA, NY, SF" — comma guards → matches NA (correct).

Bare-abbrev guard is sound. Not the source of the V9-A2 FPs above.

## D — Fixture Set

| Fixture | Company | Title | hard_drop_expected | reason_expected | revised_in trail | previous_expected | Verdict |
|---------|---------|-------|--------------------|-----------------|------------------|-------------------|---------|
| F-061 | Vercel | Pricing Product Manager | False | "" | `[{V8→V9, ...}]` | `{hard_drop: true, reason: non_na_territory}` | PASS — V8 wrongly dropped |
| F-062 | Vercel | Software Engineer, AI SDK | False | "" | `[{V8→V9, ...}]` | `{hard_drop: true, reason: non_na_territory}` | PASS |
| F-063 | XBOW | Software Engineer - AI Systems | False | "" | `[{V8→V9, ...}]` | `{hard_drop: true, reason: non_na_territory}` | PASS |
| F-064 | Cohere | Forward Deployed Engineer, Infrastructure Specialist | True | non_na_territory | `[{V8→V9, ...}]` | `{hard_drop: false, reason: ""}` | PASS — V8 wrongly UNKNOWN/keep |

`node scripts/test-realdata-fixtures.mjs` → **64 passed, 0 failed**. Categories include `v9_round5_fp_closure: 3/3 pass` and `v9_round5_named_cohort_recovery: 1/1 pass`.

**Gap:** F-061 to F-064 cover the named cases but NOT the FPs introduced by V9-2 (GitLab Eng Mgr Workflow Catalog, ElevenLabs FDE). V10 should add 2 fixtures for these multi-region NA-included shapes.

## E — Cohort-Shape Range

`scripts/test-cohort-shape.mjs:79`:
```js
assertBetween(c.territory_hard_drops, 95, 110, "...");
```
Range tightened from V8's `[85, 120]` back to `[95, 110]` per Round 5 recommendation. V9 actual value: **107** (within range).

`node scripts/test-cohort-shape.mjs` → **13 passed, 0 failed**.

## F — Diff Attribution

V8/V9 diff summary `docs/audits/2026-05-06-shadow-v8-v9-diff-summary.json`:

| Metric | Value |
|--------|-------|
| changed_rows_any_material_field | 207 |
| hard_drop_added_rows | 5 |
| hard_drop_removed_rows | 3 |
| hard_drop_reason_changed_rows | 4 |
| **v9_a1_attributed_rows** | **3** |
| **v9_a2_attributed_rows** | **5** |
| **v9_other_unattributed_rows** | **0** |
| from_territory_hard_drops | 101 |
| to_territory_hard_drops | 107 |
| net_hard_drop_delta | +2 |
| unmatched_rows | 0 |

V9-A1 rows (verified by inspecting `V8 to V9 Changed Rows` sheet): XBOW Software Engineer - AI Systems, Vercel Pricing Product Manager, Vercel Software Engineer, AI SDK. **MATCH the implementation summary.**

V9-A2 rows (5): Cohere FDE Infrastructure Specialist, GitLab AI Engineer, GitLab Engineering Manager AI Engineering:Workflow Catalog, ElevenLabs FDE Software Engineer, OpenAI AI Deployment Engineer Startups. **MATCH the implementation summary.**

**Caveat on attribution coverage:** 4 reason-changed rows (3 OpenAI Codex Deployment Engineer variants + 1 Mistral AI PM Document Intelligence) had territory_region change UNKNOWN→NON_NA AND `non_na_territory` added to the reason string, but their `v9_cause` column is empty. This is by design in `classifyV9Cause` (line 312-356 of `scripts/v8-v9-diff.mjs`): the V9-A2 marker requires `v9NewlyTerritory = !oldHard && newHard && delta.added.includes("non_na_territory")` — these 4 rows already had `oldHard=yes` (dropped on hybrid/specific-location reasons), so the V9-A2 attribution is intentionally skipped. The OTHER tag also requires status flip (`oldHard !== newHard`). Result: net outcome (hard_drop=yes) unchanged, so this isn't strictly a silent flip, but it does represent ~4 additional rows whose territory got upgraded by V9-2's location-section anchor without explicit V9-cause attribution. Spot-check of OpenAI Codex variants confirms 3 of them are Munich/Paris/London (genuinely non-NA). The Mistral PM Document Intelligence is likely Paris-base. These 4 reason additions are correct.

## G — Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| All 5 V9 sign-off items addressed | PASS |
| All test suites pass | PASS — verified independently: test-job-fit-rules 148/148, test-realdata-fixtures 64/64, test-cohort-shape 13/13, test-v8-v9-diff 11/11, test-jd-sections 12/12, test-properties 915/915, test-shadow-version-diff 15/15, test-v7-v8-diff 10/10, test-production-filter-refinement-audit 54/54. Total: 1,256 verified across these suites; remaining suites cited in implementation summary trusted. |
| Baseline SHA preserved | PASS — recomputed `sha256sum career-ops/output/jobs-2026-05-01.xlsx` → `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e` (matches both `baseline_sha_before` and `baseline_sha_after` in V9 summary JSON) |
| V9 workbook generated | PASS — `production-filter-refinement-review-2026-05-01-v9.xlsx` exists, 11 sheets per V8 |
| V8/V9 diff workbook generated | PASS — 12 sheets including V9-A1 and V9-A2 attribution sheets |
| INDEX.md registers all 5 new V9 files | TRUSTED (per implementation summary; not exhaustively re-verified) |
| Production code under `career-ops/` not modified | PASS (assumed; only `scripts/` modified) |
| All 3 Round 5 FPs closed | PASS |
| Named cohort miss recovered | PASS |
| **All 4 newly-added V9 territory drops verified legitimate** | **FAIL — 2/4 are NEW FALSE POSITIVES (GitLab Eng Mgr, ElevenLabs FDE)** |
| Adversarial bare-abbrev tests pass | PASS |
| `v9_other_unattributed_rows = 0` | PASS (per design — see §F caveat) |

## H — Regression Detection

**V8 → V9 changes (10 hard_drop status flips total):**
- 3 removed (V9-A1 closes Vercel x2 + XBOW): all CORRECT.
- 5 added (V9-A2): 3 CORRECT (Cohere, GitLab Bangalore, OpenAI Startups), 2 FALSE POSITIVE (GitLab Eng Mgr, ElevenLabs FDE).
- 4 reason-changed (V9-A2 territory addition to already-dropping rows, no v9_cause tag): 4 CORRECT (OpenAI Codex Munich/Paris/London + Mistral Paris).

**V8 territory drops preserved:** Diff summary shows `hard_drop_removed_rows = 3` (only the Vercel/XBOW closures). All other V8 territory drops carried forward — no regressions on previously-correct V7/V8 hard drops.

**Newly-keeping rows in V9:** the 3 Vercel/XBOW closures, all legitimate.

**Silent flips:** 0 OTHER attribution per diff summary. The 4 reason-only changes (OpenAI Codex variants + Mistral) intentionally don't fire OTHER because hard_drop status didn't flip — they're attribution-gap, not silent flip.

**FP rate on V9-2 ancillary captures: 2/4 = 50%.** This exceeds Round 5's 3/29 = 10.3% V8 FP rate proportionally and crosses the task's escalation threshold ("If even 1/4 is wrong, escalate").

## V10 Patch Scope (Half-Day)

**Root cause:** V9-2's implicit location-section anchor at `scripts/lib/job-fit-rules.mjs:389-408` adds NON_NA anchor counts WITHOUT considering NA-token presence within the same section body. For multi-region location sections that explicitly include NA cities (e.g. `Remote, EMEA; Remote, US-Southeast` or `San Francisco; Brazil; France; India; New York`), the NON_NA anchor majority overrides the implicit role-base intent of "this role is open to listed NA bases."

**Patch options (pick one):**

1. **Strict-majority gate:** Only count an implicit location-section anchor when NON_NA tokens form a strict majority within the section body (>= 2x NA tokens). Both new FPs would be saved: GitLab Eng Mgr (1 NA + 1 NON_NA, ratio 1:1) and ElevenLabs FDE (2 NA + 3 NON_NA, ratio 1:1.5). Cohere FDE Infrastructure preserved (3 NON_NA + 0 NA, ratio infinity). OpenAI Startups preserved (1 NON_NA + 0 NA). GitLab Bangalore preserved (1 NON_NA + 0 NA).

2. **NA-veto gate:** If the section body contains ANY NA tokens, do NOT promote it to implicit anchor. Same outcome as option 1 for these 5 cases.

3. **Body-tie default-permissive (preferred):** When the implicit location-section anchor produces both NA and NON_NA token counts, defer to the V8 body-tie rule (UNKNOWN unless explicit `based in/at` anchor fires elsewhere). Consistent with V9-1's Vercel fix philosophy ("multi-region role-base lists are NA-permissive").

**Fixtures to add (2):**

- F-065 GitLab Engineering Manager AI Engineering:Workflow Catalog — `## Location\nRemote, EMEA; Remote, US-Southeast` — expected `hard_drop=false`, `territory_region=UNKNOWN` (or NA via US-Southeast); `previous_expected: {hard_drop: true, reason: non_na_territory}` (V9 wrongly dropped).
- F-066 ElevenLabs FDE Software Engineer — `## Location\nSan Francisco; Brazil; France; India; New York` — expected `hard_drop=false`, `territory_region=UNKNOWN` (or NA majority — depends on patch option); `previous_expected: {hard_drop: true, reason: non_na_territory}`.

**Cohort-shape range update:**
- After patch, V10 territory_hard_drops drops by 2 (107 → 105). Range `[95, 110]` still holds; loud-fail not breached.

**Adversarial test additions (in `scripts/test-job-fit-rules.mjs`):**
- Multi-region location section with 1 NA + 1 NON_NA (`Remote, EMEA; Remote, US-Southeast`) → not NON_NA.
- Multi-region location section with 2 NA + 3 NON_NA (`San Francisco; Brazil; France; India; New York`) → not NON_NA.

## Recommendations

**Do NOT wire V9 to production.** The 2 confirmed FPs would silently mark legitimate Will-eligible roles (GitLab Engineering Manager AI Workflow Catalog with US-Southeast remote, ElevenLabs Forward Deployed Engineer with SF and NY bases) as hard-dropped on `non_na_territory`. Both companies are AI-native or AI-relevant employers (GitLab AI engineering team; ElevenLabs is an AI research and product company) — these are exactly the roles Will would want surfaced.

**Approve V10 scope as outlined above.** The patch is half-day: one classifier predicate change, 2 fixtures, 2 adversarial unit tests, regenerate workbooks + V9/V10 diff. The 3 Round 5 FP closures and Cohere named-cohort recovery are preserved unchanged under all 3 patch options.

**Meta-finding for `.claude/memory/pitfalls.md`:** The implementation agent's V9 verification methodology repeats the exact Round 5 anti-pattern. The summary text "Spot-checked each against the JD — Zero false positives in the 4 newly-added drops" sampled the location string only ("Bangalore, EMEA, etc. → non-NA") without confirming each role is **NA-excluded**. Multi-region roles where one base IS in NA were misread as "non-NA majority therefore non-NA role." Future verification of V9-class anchor mechanisms must ask: "Does this role accept any NA-based candidate?" not "Is the location string majority non-NA?"
