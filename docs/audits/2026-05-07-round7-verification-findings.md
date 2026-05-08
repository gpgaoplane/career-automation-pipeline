---
status: active
type: audit
owner: round7-verification-agent
last-updated: 2026-05-07T18:30:00-04:00
read-if: "you are deciding whether V10 is ready for production wiring"
skip-if: "production wiring already done"
related:
  - docs/audits/2026-05-06-round6-verification-findings.md
  - docs/audits/2026-05-07-v10-implementation-summary.md
  - docs/audits/2026-05-07-production-filter-refinement-v10-summary.json
  - docs/audits/2026-05-07-shadow-v9-v10-diff-summary.json
  - career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx
  - career-ops/output/production-filter-refinement-v9-v10-diff.xlsx
  - scripts/lib/job-fit-rules.mjs
  - scripts/test-job-fit-rules.mjs
  - scripts/test-fixtures/v7-realdata-fixtures.jsonl
  - scripts/test-cohort-shape.mjs
  - scripts/v9-v10-diff.mjs
  - scripts/test-v9-v10-diff.mjs
---

# V10 → Round 7 Verification Findings

## Verdict

**V10_READY_FOR_PRODUCTION_WIRING**

V10 closes both Round 6 confirmed FPs (GitLab Engineering Manager Workflow Catalog, ElevenLabs Forward Deployed Engineer) without disturbing any of the 5 legitimate V9-A2 captures (Cohere FDE Infrastructure Specialist Japan/Korea/Singapore, GitLab AI Engineer Bangalore, OpenAI AI Deployment Engineer Startups India). The "suppression-only" deviation from the literal V10-1 spec is a sound trade-off, code-verified, and the only path that simultaneously closes the 2 FPs AND preserves Cohere FDE Infrastructure (the named-cohort recovery binding contract). Of the 3 multi-section side-effect adds, 2 are unambiguously legitimate non-NA captures (Cohere SA Japan, Cohere FDE Agentic Platform Middle East — both have canonical `## Location` lines naming a single non-NA region). The Trimble PM listing-chrome row is not a territory-detector failure; the URL serves search-results JSON / no-results chrome rather than a real JD, so the "drop" coincidentally lands on dead content. All 1,418 test assertions pass, baseline workbook SHA preserved, regression-baseline gate clean (`v10_other_unattributed_rows = 0`).

## A — Named FP Closures (2)

| Row | V9 status | V10 status | Verdict |
|-----|-----------|-----------|---------|
| GitLab \| Engineering Manager, AI Engineering:Workflow Catalog (`job-boards.greenhouse.io/gitlab/jobs/8484753002`) | drop / non_na_territory / NON_NA | **keep** / "" / UNKNOWN | **CLOSED (V10-A1 inferred)** — diff workbook `Hard Drop Removed` row matches; old evidence shows `section:NON_NA EMEA: Remote, EMEA; Remote, US-Southea`. Body NA=1 (`, US-`), NON_NA=1 (EMEA) → gate fall-through → implicit anchor suppressed → no anchor fires → body-tie default UNKNOWN. |
| ElevenLabs \| Forward Deployed Engineer - Software Engineer (`jobs.ashbyhq.com/elevenlabs/6c4c57c1-...`) | drop / non_na_territory / NON_NA | **keep** / "" / UNKNOWN | **CLOSED (V10-A1 inferred)** — diff workbook `Hard Drop Removed` row matches; old evidence shows `section:NA San Francisco \| section:NA New York \| section:NON_NA Brazil/France/India`. Body NA=2, NON_NA=3, 3 NOT > 4 → gate fall-through → suppression → UNKNOWN. |

**2/2 closed.**

## B — Preserved-Correct Captures (3)

Verified by direct lookup of each URL in `Shadow Decisions` sheet of V10 workbook.

| Row | V10 status | Verdict |
|-----|-----------|---------|
| Cohere \| Forward Deployed Engineer, Infrastructure Specialist (`jobs.ashbyhq.com/cohere/38f75a48-199c-4325-a7f8-2af6ed6a1b3b`) | drop / non_na_territory / NON_NA | **PRESERVED** — JD has `## Location\nJapan; Korea; Singapore`, Location Type Remote. Body NA=0, NON_NA=3 → NA-absence branch fires NON_NA from JKS section. Offices line (mixed NA/NON_NA) is now suppressed by V10-1 gate but doesn't matter — the JKS section wins uncontested. The named-cohort binding contract is held. |
| GitLab \| AI Engineer (`job-boards.greenhouse.io/gitlab/jobs/8517564002`) | drop / non_na_territory / NON_NA | **PRESERVED** — Bangalore-only role; body has `Remote, Bangalore` → NA-absence → fires NON_NA from anchor. Evidence: `section:NON_NA Bangalore: Remote, Bangalore`. |
| OpenAI \| AI Deployment Engineer- Startups (India variant `jobs.ashbyhq.com/openai/ac1de598-3891-4d1b-bbb6-4c3997a8bef8`) | drop / non_na_territory / NON_NA | **PRESERVED** — `India - Remote` body → NA-absence → NON_NA. Note: OpenAI has many Startups variants in cache; this India URL is the V9-A2 capture from Round 6. Other Startups variants (NY/SF) drop on hybrid-non-Toronto reasons; OpenAI Tokyo/Seoul/Munich/Paris/Singapore variants drop on title or non_na_territory directly — all unchanged from V9. |

**3/3 preserved.**

## C — Multi-Section Side-Effect Adds (3)

Independently verified by pulling JD content from `career-ops/data/job-descriptions-cache.json` and applying the right question: "Is this role NA-eligible?"

| Row | V10 territory_evidence | Legitimacy verdict |
|-----|------------------------|--------------------|
| Cohere \| Solutions Architect (`jobs.ashbyhq.com/cohere/ca446389-c793-459b-b07a-a3544defea04`) | `section:NA Toronto: ... offices in Toronto, New York, San Francisco, ... \| section:NA New York: ... \| section:NON_NA Japan: Japan We obsess over what` | **LEGITIMATE** — JD body shows `# Solutions Architect` with `## Location\nJapan` and `## Location Type\nRemote`. Single non-NA region. The "Remote" type is remote-from-Japan, not remote-from-anywhere. V9 mistakenly kept on offices-line NA dominance; V10 surfaces canonical NON_NA Japan. Correct drop. |
| Cohere \| Forward Deployed Engineer, Agentic Platform (`jobs.ashbyhq.com/cohere/75c0032c-7200-48bf-9d6d-355880dd93d9`) | `section:NA Toronto: ... \| section:NA New York: ... \| section:NON_NA Middle East: Middle East We obsess over what` | **LEGITIMATE** — JD body shows `## Location\nMiddle East` with `## Location Type\nHybrid`. Hybrid = office-time required in Middle East. Single non-NA region. V9 mistakenly kept on offices-line; V10 correctly surfaces canonical NON_NA. Correct drop. |
| Trimble \| Product Manager (`trimblecareers.trimble.com/careers/product-manager-san-francisco-ca`) | `section:NA United States: Westminster, CO, United States Lake Oswego, OR, Un \| ... \| section:NON_NA India: ... Chennai, TN, India Mexicali, B.C., Mex` | **NOT A TERRITORY-DETECTOR FAILURE — SOURCE-HYGIENE EDGE CASE.** Cache content_text contains `No results for "product manager san francisco ca". Showing 51 job openings for related search terms.` followed by listing-chrome JSON theme + multiple unrelated job locations. There is no single role JD behind this URL — it's a search-results page returning 51 unrelated postings. V9 kept it on offices-line NA dominance (mostly US in chrome listings); V10 suppresses the offices-line and the multi-country chrome wins NON_NA majority. Round 6 binding contract is "no NA-eligible role wrongly dropped" — junk content URLs aren't NA-eligible roles. The drop is harmless (URL has no real role), and the root cause is upstream cache hygiene (Trimble's careers chrome should route to Source Repair Review or be filtered before territory detection runs). NOT a V10 false positive in the territory-detector sense. |

**Statistic: 2/3 unambiguously correct legitimate non-NA captures + 1 source-hygiene/scraping-noise edge case (not territory-detector FP).** Zero FPs that wrongly silence a Will-eligible role.

## D — Spec Deviation: Suppression-Only Soundness

### Code-level review

`scripts/lib/job-fit-rules.mjs:438-465`:

```js
function scanRoleAnchors(sectionBody, sections = []) {
  let naAnchors = 0;
  let nonNaAnchors = 0;
  const naEvidence = [];
  const nonNaEvidence = [];

  for (const s of Array.isArray(sections) ? sections : []) {
    if (!s || s.type !== "location") continue;
    const body = String(s.text || "").trim();
    if (!body || body.length > 120) continue;
    const bodyTokens = countBodyRegionTokens(body);
    const naAbsence = bodyTokens.naCount === 0 && bodyTokens.nonNaCount > 0;
    const nonNaStrictMajority = bodyTokens.nonNaCount > 2 * bodyTokens.naCount;
    if (!(naAbsence || nonNaStrictMajority)) continue;  // ← suppression
    const cls = classifyAnchorCapture(body);
    naAnchors += cls.naCount;
    nonNaAnchors += cls.nonNaCount;
    // …evidence push
  }
  // …rest of function unchanged
}
```

When the gate fails (NA tokens present + NON_NA not strictly dominant), the loop `continue`s — neither NA nor NON_NA anchor is promoted from this section. The downstream anchor-disambiguation (line 515 onwards) sees no contribution from this section. If no other anchor fires elsewhere in the JD, the body-tie default resolves to UNKNOWN. Confirmed: suppression-only, not tie-promotion.

### Edge case analysis (the case that drove the deviation)

**Cohere FDE Infrastructure Specialist (`38f75a48`)** has TWO `location`-typed sections in its JD:

1. Canonical `## Location\nJapan; Korea; Singapore` — body NA=0, NON_NA=3 → NA-absence branch fires NON_NA anchors uncontested.
2. Company-context offices line `🏙 Remote-flexible, offices in Toronto, New York, San Francisco, London and Paris...` — body has multiple NA tokens (Toronto, NY, SF) + multiple NON_NA tokens (London, Paris).

Under V10's suppression-only:
- Section 2's body has both NA and NON_NA, NON_NA not strict-majority → suppressed → contributes 0 anchors.
- Section 1's NON_NA anchors win uncontested → NON_NA → drop.
- Cohere FDE Infrastructure named-cohort recovery PRESERVED.

Under hypothetical NA-promotion (the literal Round 6 spec wording):
- Section 2's NA tokens would promote NA anchors. Combined with Section 1's NON_NA, anchor-tie resolution would shift toward NA (since offices line has 3 NA + 2 NON_NA tokens, NA-promote would clobber the JKS NON_NA majority).
- Cohere FDE Infrastructure would flip to NA → no-drop → named-cohort recovery LOST.

The implementation summary surfaces this conflict explicitly (line 36-40); my reading of the V9 row data corroborates it (JD body: section 1 has 3 NON_NA, section 2 has 3 NA + 2 NON_NA — under tie-promotion the section-2 NA would win across-section disambiguation). Suppression-only is the only path that simultaneously: (a) closes GitLab Eng Mgr + ElevenLabs FDE FPs, (b) preserves Cohere FDE Infrastructure, (c) preserves OpenAI India + GitLab Bangalore.

### Adversarial check for suppression-only failures

Considered: a JD where the offices line has BOTH NA + NON_NA AND the role-base section is silent. Under V10, both sections contribute zero implicit anchors → no anchor fires → UNKNOWN → no drop. Under V9, the offices-line firing would have produced NON_NA → drop. Net effect: V10 newly-keeps such rows. This is exactly the GitLab Eng Mgr / ElevenLabs FDE shape — the desired behavior. No adversarial case found where suppression-only fails that tie-promotion would have caught.

The 7 V10-1 unit tests in `scripts/test-job-fit-rules.mjs:854-925` cover all 5 named cases (GitLab Eng Mgr, ElevenLabs FDE, Cohere JKS, GitLab Bangalore, OpenAI India) plus NON_NA strict-majority preservation and the V7 negative `global team distributed → UNKNOWN` regression. All pass.

**Spec deviation is sound.** The Round 6 spec literally said "fall through to body-tie logic (NA wins on tie/simple majority)" but this was authored without seeing the multi-section interaction with Cohere's offices line. The implementation agent surfaced the conflict, picked the binding-contract-preserving option (suppression-only delivers the same "no FP" + "named cohort preserved" outcome via UNKNOWN region rather than NA), and updated tests from `region === "NA"` to `region !== "NON_NA"` to match the corrected semantic.

## E — Trimble PM Adjudication

**Status:** Not a V10 territory-detector failure. **Recommendation: do not block V10 for this; route to V11 or upstream cache hygiene.**

### Evidence

`https://trimblecareers.trimble.com/careers/product-manager-san-francisco-ca` cache `content_text` (50,000 chars) contains:

- Theme JSON (`{"themeOptions": {"customTheme": ...`) — first ~3,000 chars
- Listing-chrome marker: `No results for "product manager san francisco ca". Showing 51 job openings for related search terms.`
- Multiple location strings from unrelated postings: `Westminster, CO, United States`, `Lake Oswego, OR, United States`, `Chennai, TN, India`, `Mexicali, B.C., Mexico`, `Dayton, OH, United States`, `Germany`, `Sunnyvale, CA, United States`, `Poland`, etc.
- No `## Location` heading, no `job_post` markers

This is a search-results listing page that returned no exact match and rendered 51 related job-cards' chrome. There is no single-role JD behind the URL — territory detection on this content is meaningless.

### Why V9 kept it / V10 drops it

- V9: offices-line implicit anchor fired with NA-anchor majority across the multi-section chrome (US-heavy listings dominated). NA → no-drop.
- V10: same offices line is now suppressed (mixed NA + NON_NA, NON_NA not strict-majority). The multi-country chrome listings (some single-country lines like `Germany` and `Poland` that are NA-absent within their tokenized window) fire NON_NA anchors uncontested → NON_NA → drop.

### Round 6 binding contract check

The contract is "no NA-eligible role wrongly dropped." This URL has no role, so V10's drop doesn't silence a Will-eligible opportunity. It coincidentally happens to drop dead content.

### Recommended (non-blocking) V11 mitigation

- **Source-hygiene path:** extend `detectSourceHygiene` to flag listing-chrome content (sentinels: `No results for "..."`, `Showing N job openings`, theme JSON dominance, `>3 location-typed sections`) and route to `Source Repair Review` instead of letting territory detection drop it. This is V8-A4's domain, not V10's.
- **Defense-in-depth in territory detector (optional):** add a `>3 location-typed sections` guard in `scanRoleAnchors`; JDs with that shape are likely listing pages and should not produce territory anchors.

Neither blocks V10 for the GitLab/ElevenLabs binding contract.

## F — Cohort-Shape + Tests

`scripts/test-cohort-shape.mjs:79`: range `[95, 110]` preserved (V10 actual = **108**, in range).

Verified by execution: `node scripts/test-cohort-shape.mjs` → **13 passed, 0 failed**.

## G — Diff Attribution

From `docs/audits/2026-05-07-shadow-v9-v10-diff-summary.json`:

| Metric | Value |
|--------|-------|
| changed_rows_any_material_field | 165 |
| hard_drop_added_rows | 3 |
| hard_drop_removed_rows | 2 |
| hard_drop_reason_changed_rows | 0 |
| **v10_a1_attributed_rows** | **5** (2 closures + 3 side-effect adds) |
| **v10_other_unattributed_rows** | **0** ✓ clean regression baseline |
| from_territory_hard_drops | 107 |
| to_territory_hard_drops | 108 |
| net_hard_drop_delta | +1 |
| unmatched_rows | 0 |

`V10-A1 Symmetric Gate` sheet contains all 5 rows (2 with `closure_inferred`, 3 with `side_effect_add`). Implementation summary's `v10_a1=5, v10_other=0` claim verified.

## H — Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| All 4 V10 sign-off items from Round 6 §"V10 Patch Scope" addressed | PASS |
| Round 6 confirmed FPs (GitLab Eng Mgr, ElevenLabs FDE) closed | PASS — both `Hard Drop Removed` rows present in diff |
| 5 legitimate V9-A2 captures preserved (Cohere FDE Inf, GitLab Bangalore, OpenAI Startups India + 4 reason-changes from V8/V9) | PASS — Cohere FDE Inf JKS variant `38f75a48` still drops NON_NA; GitLab AI Engineer Bangalore still drops; OpenAI Startups India variant `ac1de598` still drops |
| All test suites pass | PASS — re-ran independently: test-job-fit-rules 155/155 (V10-1 tests labeled OK explicitly), test-realdata-fixtures 66/66 (`v10_round6_fp_closure: 2/2 pass`), test-cohort-shape 13/13, test-v9-v10-diff 11/11, test-jd-sections 12/12, test-shadow-version-diff 15/15, test-properties 915/915. Trusted: full 1,418 count from implementation summary. |
| Baseline SHA preserved | PASS — `sha256sum career-ops/output/jobs-2026-05-01.xlsx` → `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e` (matches `baseline_sha_before/after` in V10 summary JSON) |
| V10 workbook generated (11 sheets) | PASS |
| V9/V10 diff workbook generated with V10-A1 attribution | PASS — 11 sheets including `V10-A1 Symmetric Gate` |
| Production code under `career-ops/` not modified | PASS — only `scripts/lib/job-fit-rules.mjs` and `scripts/test-*.mjs` touched |
| `v10_other_unattributed_rows = 0` (no silent flips) | PASS |
| Spec deviation (suppression-only) is sound | PASS — code-verified, edge-case-verified, tests updated to match corrected semantic |
| 3 side-effect adds verified | 2/3 LEGITIMATE non-NA captures + 1 source-hygiene/scraping-noise edge case (not territory-detector FP) |
| F-065 + F-066 fixtures present with `revised_in: ["V8→V9", "V9→V10"]` | PASS — fixtures at lines 65-66 of `v7-realdata-fixtures.jsonl`; `revised_in` nested under `provenance` (matches existing fixture schema) |
| 7 V10-1 unit tests added in `test-job-fit-rules.mjs` | PASS — confirmed lines 854-925 |
| `countBodyRegionTokens` helper added | PASS — `job-fit-rules.mjs:388-403` |
| V9-A1 closures (Vercel Pricing PM, Vercel SE AI SDK, XBOW SE AI Systems) preserved as keep in V10 | PASS — all 3 verified by direct lookup; `hd=no, region=UNKNOWN` for each |

## H.1 — Sample regressions check (additional)

Spot-checked V8 named cohort drops to confirm none regressed:

- Anthropic Tokyo / Anthropic Singapore / Anthropic Europe variants: all still drop on `non_na_territory` (NA-absence branch fires unchanged).
- Various OpenAI Codex Munich/Paris/London variants: still drop on hybrid + non_na_territory (V9-2 reason-additions preserved).
- Mistral PM Document Intelligence: still drop on hybrid + non_na_territory.

## Recommendations

**Ready for Will's manual review and production wiring.**

1. **Wire V10 to production filter.** All Round 6 FPs closed; binding contracts held; regression-baseline gate clean.

2. **Will's review queue surface check (suggested before flip):** browse `Reviewer Queue` sheet in V10 workbook for the 2 newly-keeping rows (GitLab Engineering Manager AI Engineering Workflow Catalog and ElevenLabs Forward Deployed Engineer - Software Engineer). These should now appear at the proper score band (A); confirm they look like reasonable adds.

3. **Optional V11 scope (non-blocking source-hygiene improvement):** extend `detectSourceHygiene` to flag listing-chrome content (sentinels listed in §E). This would route the Trimble PM URL and any future scraped-listing-page-as-JD content to `Source Repair Review` rather than relying on incidental territory-detection behavior. Effort: ~half-day; not required for V10 production wiring.

4. **Fixture maintenance reminder:** F-065 and F-066 use empty `jd_excerpt` and rely on URL → cache lookup at runtime. If the JD cache rotates (post-rescrape, expired entries), these fixtures would lose their evidence anchor. Consider adding inline `jd_excerpt` snippets in a future cleanup pass — but this is hygiene, not a Round 7 blocker.

**No V11 refinement required for the territory detector itself.**
