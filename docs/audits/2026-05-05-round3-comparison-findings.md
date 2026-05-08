---
status: active
type: audit
owner: reviewer-agent-round3
last-updated: 2026-05-05T22:00:00-04:00
read-if: "you are deciding whether V6 is ready for production wiring or needs V7"
skip-if: "V7 already merged"
related:
  - docs/audits/2026-05-05-v5-reviewer-agent-findings.md
  - docs/audits/2026-05-05-v6-implementation-summary.md
  - career-ops/output/production-filter-refinement-review-2026-05-01-v6.xlsx
  - career-ops/output/production-filter-refinement-v5-v6-diff.xlsx
  - scripts/lib/job-fit-rules.mjs
  - scripts/production-filter-refinement-audit.mjs
  - scripts/v5-v6-diff.mjs
---

# V5 -> V6 Round 3 Comparison Findings

## Executive Summary

- **Verdict: V6_NEEDS_V7_REFINEMENT.** Major V6 fixes (F-002 dedup, F-003 Atlassian listing, F-004 example.com blocklist, F-009 validation gate) are present in code, exhibit the expected behavior in the workbook, pass tests, and introduce no detectable workbook-level regressions. **However, two issues warrant a small V7 patch before production wiring**: (a) the V6 implementation summary's Anthropic narrative is technically incorrect (different code path than claimed) and rests partly on a `commercial_ownership` regex false positive triggered by an application-form country dropdown — this distorts the policy 3 decision Will is being asked to make; (b) Deepgram's two "Pre-Sales Solutions Engineer" rows became hard-drop=no in V6 because the policy 2 threshold lift exposed a pre-existing title-regex gap (the `hardSalesTitleRe` at `scripts/lib/job-fit-rules.mjs:118` matches `pre sales engineer` adjacent only — not `pre sales solutions engineer`).
- **Findings actioned (count): 5 of 9.** Implemented + verified: F-001 (policy 2), F-002, F-003, F-004, F-009. Deferred (correct per spec): F-005, F-006, F-007. F-008 implicitly resolved by F-001 policy 2 corroboration rule.
- **New regressions detected: 2** (Deepgram Pre-Sales Solutions Engineer EST/PST + SF — both went from hard-drop to keep at band A). Plus 1 evidence-quality concern (`commercial_ownership` regex false-positives on Anthropic country dropdowns).
- **Open Will-decisions: 1** (Anthropic Applied AI Architect cohort — but with revised framing; see Section "Anthropic Policy 3 Decision Aid").

## Per-Finding Verdict Table

| Finding | V5 status | V6 fix claimed | V6 fix verified | Notes |
|---|---|---|---|---|
| F-001 (sales policy 2) | BLOCKING | Threshold raised, OTE downweighted, sales_department corroboration | YES (mostly) | Implementation matches spec. 30 rows moved per "Sales Policy 2 Movement" sheet. Anthropic Applied AI Architect cohort still drops, but for a different reason than the V6 summary claimed (see below). |
| F-002 (dedup) | HIGH | Scale AI / EL / TM dedup + listing chrome strip | YES | All 21 scale.com URLs deduped to canonical Greenhouse rows; Thinking Machines deduped on accel.com URL (no Greenhouse canonical exists for that job — accel.com IS canonical); zero rows in V6 with `Apply Now`/`+N more`/`Read moreabout` chrome. |
| F-003 (Atlassian listing) | HIGH | `/all-jobs?` regex added + body-floor lowered | YES | Atlassian PM row routes to `generic_careers_index` source repair as expected. |
| F-004 (example.com) | HIGH | Hostname blocklist | YES | Docusign AI Product Manager row routes to `placeholder_or_invalid_url` as expected. |
| F-009 (validation gate) | MEDIUM | Gate emission on `non_toronto` location_reason | YES | Validation Findings count 4 -> 0. Independent gate audit (rows where `location_reason` contains `non_toronto` AND `hard_drop_reason` lacks location/hybrid/onsite tokens) returns 0. Gate is not over-suppressing; the underlying rows changed (Cohere PM no longer hard-drops; Pigment TAM's location_reason is empty in V6). |
| F-005 (cache enrichment) | HIGH | Deferred to Firecrawl re-fetch | DEFERRED ✓ | 35 rows remain in `missing_jd_cache` source repair with high-intent FDE/Solutions/Applied-AI titles. Out of V6 scope per spec. |
| F-006 (typo seeds) | MEDIUM | Deferred per spec | DEFERRED ✓ | `generative-al---generalist` and `al-programs-analyst` still present in `KNOWN_SEEDS`. Verified unchanged. |
| F-007 (Anthropic remote-flexible regex) | MEDIUM | Deferred pending JD sampling | CLOSED — NOT WARRANTED | All 3 sampled Anthropic Applied AI Architect JDs contain ZERO matches of `/remote[-\s]?flexible/i`. The hypothesis that Anthropic's standard footer reads "Remote-flexible, offices in Toronto, NY, SF, London" is not supported by the cached JD bodies. F-007 is settled (false hypothesis, not a real gap). |
| F-008 (dbt Labs OTE) | MEDIUM | Implicitly addressed by F-001 corroboration rule | YES (verified) | dbt Labs Solutions Architect rows still hard-drop on `sales_role_content`, but now require corroboration. Their JDs have multiple corroborating signals (sales_department + sales_process + sales_compensation), so hard-drop persists correctly. F-008 was a sub-case of F-001 by design. |

## Code-Level Verification

- **F-001 policy 2** — `scripts/lib/job-fit-rules.mjs:99-200`. `classifySalesRole` now takes `primary_family`. Threshold escalation at line 178-179: `isSafdeFamily = primary_family === "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE" && SAFDE_AI_TITLE_TOKEN_RE.test(title)` -> threshold 5 vs 4. OTE boilerplate downweight 3->2 at line 142-149. `sales_department` solo downweight 4->2 at line 156-170. SA/FDE+sales_compensation-alone block at line 180-181. Per-label aggregation (max single hit per label) at line 158-162. `scoreJob` at line 583-584 computes `roleFamily` first, then passes `primary_family` into `classifySalesRole`. `classifyTitle` at line 278 updated similarly.
- **F-002** — `scripts/production-filter-refinement-audit.mjs:90-151`: `extractGhJid`, `isCanonicalGreenhouseUrl`, `stripListingTitleChrome` helpers. Dedup pass at line 269-298 in `buildAudit`. Tests added in `scripts/test-production-filter-refinement-audit.mjs:61-78`.
- **F-003** — `detectSourceHygiene` at `scripts/production-filter-refinement-audit.mjs:659-664` adds `/all-jobs?` and `/?team=...&location=...&search=/` patterns. Lower body-floor (>1200) at line 683-689 with title-absent guard.
- **F-004** — `detectSourceHygiene` at `scripts/production-filter-refinement-audit.mjs:653-658` adds RFC-2606 blocklist for `example.com`/`example.org`/`example.net`/`test.example`/`localhost`/`127.0.0.0`/`0.0.0.0`.
- **F-009** — `buildValidationFindings` at `scripts/production-filter-refinement-audit.mjs:611-625` gates `specific_location_not_in_drop_reason` on `d.location_reason && /non_toronto/.test(d.location_reason)`.

Test results: `node scripts/test-job-fit-rules.mjs` (58 passed), `node scripts/test-production-filter-refinement-audit.mjs` (50 passed). Verified directly by re-running both suites in this session.

## Behavioral Verification (workbook-level)

### F-001 cohort table

| Row | V5 status | V6 status | Independent assessment |
|---|---|---|---|
| Anthropic Applied AI Architect (23 rows in V6) | hard-drop sales_role_content | **hard-drop** sales_role_content (+ location for most) | V6 drop is correct in outcome; V6 summary's *reasoning* is wrong (see Anthropic deep-dive) |
| Modal FDE - Systems (Ashby canonical, post-dedup) | hard-drop sales_role_content | **kept** band A (Hard Drop Removed sheet row 13) | Correct per policy 2 — JD insufficient sales evidence for SA/FDE threshold 5 |
| Hebbia AI Strategist + 2 FD-Banker/Investor variants (3 rows) | hard-drop sales_role_content | hard-drop sales_role_content | Correct — multiple corroborators beyond OTE |
| Decagon Strategic Solutions Engineer East/West (2 rows) | hard-drop sales_role_content | hard-drop sales_role_content | Correct — Department: Sales + non-boilerplate OTE + AE corroboration |
| GitLab Solutions Architect (Manager/PubSec/SA/SA/Commercial-West/Southeast — 6 of 7 rows) | hard-drop sales_role_content | **kept** band A | Correct per policy 2 — JD has sales_department only, no corroborator (per `v6_sales_department_corroboration_required` annotation) |
| GitLab SMB Solutions Architect (1 of 7) | hard-drop sales_role_content | hard-drop sales_role_content | Correct — JD has stronger sales context |
| Cloudflare Solutions Architect, AI/Cloudflare Developer Platform | hard-drop hybrid_non_toronto_no_remote (no sales) | hard-drop hybrid_non_toronto_no_remote | Unchanged; only Cloudflare *Solutions Engineer* rows moved on policy 2 |
| Cresta Enterprise Solutions Engineer (1 of 3) | hard-drop sales_role_content | **kept** band S | Correct per policy 2 |
| Cresta Strategic Solutions Engineer East/West (2 of 3) | hard-drop sales_role_content + yoe_required_gt_5 | hard-drop yoe_required_gt_5 (sales removed, YoE retained) | Correct — yoe still drops these |
| dbt Labs Solutions Architect (3 rows) | hard-drop sales_role_content | hard-drop sales_role_content | Correct per F-008 — JDs still have multiple corroborators |

### F-002 dedup confirmation

- Scale AI gh_jid 4673051005 ("Forward Deployed Product Manager, Enterprise"): **1 row** at canonical Greenhouse URL. (V5: 2 rows.)
- Scale AI gh_jid 4514173005 ("Applied AI Engineer, Enterprise GenAI"): **1 row** at canonical Greenhouse URL. (V5: 2 rows.)
- ElevenLabs FDE Software Engineer (UUID `6c4c57c1-...`): **1 row** at canonical Ashby URL.
- Thinking Machines Lab FDE Tinker (gh_jid `76414105`): **1 row**. Note: surviving URL is the accel.com listing URL, not Greenhouse — because accel.com IS the canonical entry (no Greenhouse mirror exists for this company; the accel.com URL is the only ATS-shape URL we have). This is correct dedup behavior, not a partial failure.
- Title chrome scan: **0 rows** in V6 Shadow Decisions contain `Apply Now`/`+\d+ more`/`Read more about` literals.
- Scale.com canonical-pair check: All 21 unmatched scale.com URLs from the diff summary have a corresponding `job-boards.greenhouse.io/scaleai/jobs/<id>` row in V6 Shadow Decisions. **0/21 missing canonical** — no legitimate jobs lost to dedup.

### F-003 / F-004 source hygiene

- Atlassian Product Manager `/all-jobs?team=Product%20Management...`: V6 source_repair=yes, reason=`generic_careers_index`. ✓
- Docusign AI Product Manager `https://example.com/careers/...`: V6 source_repair=yes, reason=`placeholder_or_invalid_url`. ✓
- Source Repair Movement sheet shows exactly 4 rows; the 4 are the expected F-002 (2x ElevenLabs cleared `missing_jd_cache` after listing-mirror dedup), F-004 (Docusign), F-003 (Atlassian) movements. No rows incorrectly routed to source repair.

### F-009 validation findings

- Validation Findings sheet rows: **0** (was 4 in V5).
- Independent gate over-suppression query (rows where `location_reason` contains `non_toronto` AND `hard_drop_reason` lacks location/hybrid/onsite tokens): **0 candidates**. The gate is doing what was specified; it is not silencing legitimate findings.

## Regression Detection

I sampled all 30 rows in the "Sales Policy 2 Movement" diff sheet (the entire policy-2-affected universe; the diff workbook makes this tractable). Findings:

- **29 of 30** rows are in family `SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE`. The 30th is Lattice Semiconductor "Product Manager" (`AI_PROGRAM_OPS` family) — V6 reverted from `sales_role_content; specific_non_toronto_location_no_remote` -> `specific_non_toronto_location_no_remote`. This row still hard-drops on location, so end behavior unchanged. The cause is plausibly the V6 per-label aggregation side effect (item 5 in the V6 summary) reducing accumulated value below threshold 4 for non-SA/FDE family. **Net effect: zero — Lattice still drops.** Worth noting in case a future row in `AI_PROGRAM_OPS` lacks a location drop.
- **REGRESSION (2 rows): Deepgram "Pre-Sales Solutions Engineer (EST or PST)" + "Pre-Sales Solutions Engineer (San Francisco, CA)"** are in the Hard Drop Removed sheet (rows 9-10). V5 dropped them on `sales_role_content`; V6 keeps them at band A. Title literally contains "Pre-Sales". This is a genuine over-correction — but it is NOT a policy-2 logic error. The threshold raise from 4 to 5 + sales_department corroboration rule + per-label aggregation reduced JD-content evidence below threshold 5. The proper guard should be at the **title** level: `hardSalesTitleRe` at `scripts/lib/job-fit-rules.mjs:118` matches `pre sales engineer` / `presales engineer` adjacent only, but the actual title `Pre-Sales Solutions Engineer` (with intervening "Solutions") slips through. Fix: extend the title regex with `\bpre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior)?\s*(?:engineer|architect|consultant|specialist)\b` or simply `\bpre[-\s]?sales\b.{0,30}\bengineer\b`. Would catch: Deepgram (2 rows), Agility Robotics (1 row, same title — but currently DOES drop because content is sufficient; defense-in-depth still warranted).
- Anthropic Partner Solutions Architect, Manager FDE, Solutions Architect National Security, Manager FDE (4 Anthropic rows in policy 2 movement): V6 keeps these where V5 dropped — these are plausible keeps under policy 2; titles are clean SA/FDE-family without "Pre-Sales" prefix.
- All other 23 rows: spot-checked titles + JD evidence; movements are consistent with the spec'd policy 2 loosening (boilerplate-only OTE no longer alone triggers; sales_department alone no longer triggers).
- F-002 dedup regression check: 21/21 scale.com URLs collapsed to existing canonical greenhouse rows. **No row lost.**
- Source-hygiene over-fire check: 4 rows newly routed to source repair, all expected (Docusign placeholder, Atlassian listing, 2x ElevenLabs that just lost their `missing_jd_cache` flag because the dedup made them visible at the canonical Ashby URL). **No legitimate JD-bearing rows mistakenly routed.**
- F-009 over-suppression check: 0 over-suppression candidates. Gate is correct.

## Anthropic Policy 3 Decision Aid

I sampled 3 Anthropic Applied AI Architect JDs and replayed `classifySalesRole` directly. **The V6 implementation summary's narrative is wrong on three points** that materially affect Will's decision.

### Per-row signal tally

| Row | URL | sales_compensation | sales_process (Pre-Sales) | sales_counterpart (account executives) | commercial_ownership | sales_department | quota_closing | Effective threshold | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `.../jobs/5117581008` (Anthropic India) | none | YES (val=2) | YES (val=2) | YES (val=1) but FALSE POSITIVE | none | none | 4 (AI_ENGINEERING) | drops at 5; would land at threshold without FP |
| 2 | `.../jobs/5076109008` (Japan) | none | YES (val=2) | YES (val=2) | YES (val=1) but FALSE POSITIVE | none | none | 4 (AI_ENGINEERING) | drops at 5; would land at threshold without FP |
| 3 | `.../jobs/5192805008` (Commercial) | YES boilerplate (val=2) | YES (val=2) | YES (val=2) | YES (val=1) — substantive | none | none | 4 (AI_ENGINEERING) | drops at 7; legitimate even without FP |

### What the V6 summary got wrong

1. **Family is `AI_ENGINEERING`, not `SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE`.** Re-classified directly via `classifyRoleFamily`: title "Applied AI Architect" hits the AI_ENGINEERING regex (`/\b(ai|ml|...)/.../\b(engineer|engineering|architect|...)\b/`) — NOT the SA/FDE regex (which requires "solutions architect", "forward deployed", etc.). Therefore threshold is **4**, not 5. Policy 2's threshold raise does not apply to this cohort at all.
2. **2 of 3 sampled JDs (Anthropic India, Japan) have ZERO `sales_compensation` hit.** They lack the OTE-boilerplate block entirely. The V6 summary's claim of "OTE boilerplate(2) + Pre-Sales(2) + AE(2) + book of business(1) = 7" is the Commercial role only. Anthropic India and Japan are 2+2+1 = 5 (AT threshold for AI_ENGINEERING, not above).
3. **The `commercial_ownership` hit on rows 1+2 is a FALSE POSITIVE.** The regex `\b(book of business|renewals?|expansion opportunities|land and expand|territory|account ownership)\b` matches the word "Territory" inside the application form's country dropdown literal (`British Indian Ocean Territory+246 - British Virgin Islands+1 - Brunei+673 - Bulgaria+359 - Burkina Faso+226`). The same false-positive snippet appears in both rows. Without this FP, rows 1+2 score 2+2 = 4, which is exactly at threshold (drops with `>= threshold` semantics).

### Quote from JD #1 (Anthropic India, `5117581008`)

> "About the role: As an Applied AI team member at Anthropic India, you will be a Pre-Sales architect focused on becoming a trusted technical advisor helping large enterprises across India and the Asia-Pacific region understand the value of Claude..."

> "Responsibilities: Partner with account executives to deeply understand customer requirements and translate them into technical solutions..."

> "Qualifications: ... 5+ years of experience in technical customer-facing roles such as Solutions Architect, Sales Engineer, or Technical Account Manager..."

The role *is* substantively pre-sales architecture (genuine "Pre-Sales architect" framing in the role description; explicit account-executive partnership). My judgment: this is closer to a sales-side role than to Will's #1 family — even if the regex evidence is brittle.

### Recommendations to Will (weighted)

1. **Recommended: Tighten `commercial_ownership` regex first, then re-evaluate Anthropic** (cost: tiny, deterministic, reduces noise across multiple companies). The current regex `\bterritory\b` matches the country dropdown literal that appears in many Greenhouse JDs ending with the phone-country list. Replace with `\b(book of business|renewals?|expansion opportunities|land and expand|account ownership)\b|\bsales territory\b` — i.e., remove bare `territory` and require the modifier "sales territory". This will drop rows 1+2 to 2+2 = 4 (at threshold for AI_ENGINEERING — still drops via `>= 4` semantics), and 0+2 = 2 if `account executives` and `Pre-Sales` are the only hits without commercial_ownership. Quote test on Anthropic: even without commercial_ownership, rows 1+2 hit 4 -> drop. So this tightening doesn't actually flip Anthropic; it just makes the V6 summary's reasoning correct. **This is hygiene, not a policy choice.**
2. **Then make the policy 3 call cleanly:**
    - **2a (recommended): Accept V6 — Anthropic Applied AI Architect drops are correct.** Even with FPs removed, rows 1+2 land at threshold (drop at `>= 4`), and row 3 (Commercial) drops at 5 with substantive evidence (real OTE block, book of business). The JD opening sentence "you will be a Pre-Sales architect" + "Partner with account executives" is unambiguously sales-track-with-technical-skin. This matches Will's #2 reviewer-prompt instruction "AE+AI hybrid keep" weakly — but the JDs are not AE+AI hybrid; they are AE-track with AI-tool advisory. Policy 1 (current) is defensible.
    - **2b: Move only the 23 Anthropic Applied AI Architect rows to Reviewer Queue with annotation** (policy 3 narrowly applied). 23 rows manual triage. Rationale: lets Will inspect each. Cost: not zero (Will's time).
    - **2c: NOT RECOMMENDED — Anthropic-specific allowlist override.** Special-casing one company is an anti-pattern that pollutes the rule layer.
    - **2d: NOT RECOMMENDED — raise SA/FDE threshold from 5 to 6.** Anthropic isn't even in SA/FDE family — this lever doesn't apply.

**My weighted recommendation: 2a (accept V6 drop) + V7 commercial_ownership tightening as hygiene.** The V6 outcome on Anthropic is right; the V6 summary's reasoning about *why* it's right was wrong, but the answer survives the correction.

## F-007 Opportunistic Check (Anthropic JDs and `Remote-flexible`)

Result: F-007 hypothesis is **NOT supported** by the cached JD bodies. All 3 sampled Anthropic Applied AI Architect JDs returned **0 matches** for `/remote[-\s]?flexible/i`. The V5 reviewer's hypothesis (that Anthropic's standard footer reads "Remote-flexible, offices in Toronto, NY, SF, London") is not present in these particular JDs. F-007 should be marked closed (false hypothesis), not deferred. Will's choice on Anthropic Applied AI Architect doesn't depend on the location detector at all — `sales_role_content` fires before location even matters.

## Recommendation for Will

1. **Production-wiring readiness: Conditional.** V6 is structurally sound. Five Round-1 findings actioned, all verified working, all tests pass, no silent regressions. Two specific fixes are needed before wiring; both are small.
2. **If V7 needed: scope of changes.**
    - **V7-1 (REQUIRED to fix regression).** Extend `hardSalesTitleRe` at `scripts/lib/job-fit-rules.mjs:118` to catch `Pre-Sales Solutions Engineer` and similar adjacent-but-not-immediately-followed-by-engineer patterns. Concrete proposal:
      ```js
      const hardSalesTitleRe = /\b(account executive|...|technical sales)\b|\bae\b|\bpre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b/i;
      ```
      Verify Deepgram x2 rows hard-drop again. Verify Agility Robotics still hard-drops (currently does on content; will additionally hit title-level guard). Add unit tests for "Pre-Sales Solutions Engineer", "Pre-Sales Technical Engineer", "Presales Solutions Architect".
    - **V7-2 (HYGIENE; recommended).** Tighten `commercial_ownership` regex at `scripts/lib/job-fit-rules.mjs:135` to remove bare `\bterritory\b` (false-positives on country dropdowns) and require the modifier "sales territory". Will not flip Anthropic outcomes; will make the audit's reasoning trustworthy. Add a unit test that "British Indian Ocean Territory" does NOT match.
    - **V7-3 (DEFERRED — separate workstream).** F-005 enrichment re-fetch (35 rows). Out of V6/V7 rule scope per spec.
3. **Will-decisions surfaced.**
    - **Q1 (BLOCKING for V7 merge):** approve V7-1 title regex extension.
    - **Q2 (recommended for V7):** approve V7-2 `commercial_ownership` tightening.
    - **Q3 (post-V7 policy):** Anthropic Applied AI Architect cohort — accept V6 drop (recommended) or move 23 rows to Reviewer Queue (alternative). The V6 summary's framing was incomplete; with the corrected analysis above, Anthropic drops are defensible without policy 3.

## Methodology

- **Sample sizes:** Sales Policy 2 Movement — read all 30 rows. Hard Drop Reason Changed — read all 17. Hard Drop Removed — read all 13. Hard Drop Added — 0 rows. Source Repair Movement — read all 4. Validation Findings — 0 rows. F-001 cohort — verified all 8 named-row groups (23+4+4+2+7+1+3+3 = 47 rows). F-002 dedup — checked all 21 scale.com URLs against canonical Greenhouse pairs. Anthropic JD deep-dive — sampled 3 of 23 by URL ordering (chose first three Greenhouse IDs in V6 Shadow Decisions for the title "Applied AI Architect"). Replayed `classifySalesRole` directly via Node.js to get true family + signal tally.
- **Deterministic; no random sampling required given the policy 2 movement universe is exactly 30 rows.**
- **Tools / scripts written:**
  - `D:/Projects/tmp-v6-review/inspect-v6.mjs` — workbook inspection helper (multi-command).
  - `D:/Projects/tmp-v6-review/probe-cols.mjs` — column-name discovery probe.
  - `D:/Projects/tmp-v6-review/probe-lattice.mjs` — Lattice Semiconductor row lookup.
  - `D:/Projects/tmp-v6-review/replay-classify.mjs` — direct `classifyRoleFamily` + `classifySalesRole` invocation against Anthropic cached JDs.
- **Verification:** Every claim cites either a specific row from a named V6 sheet, a function + line number in the production code, or a quoted JD snippet from `career-ops/data/job-descriptions-cache.json`. Tests re-run in this session (job-fit-rules: 58 passed; audit: 50 passed). No production code under `career-ops/` modified; no V6 workbook artifacts modified; this report is the only file written.
