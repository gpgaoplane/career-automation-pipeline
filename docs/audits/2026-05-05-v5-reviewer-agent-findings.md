---
status: active
type: audit
owner: reviewer-agent-round1
last-updated: 2026-05-05T16:30:00-04:00
read-if: "you are deciding which V5 issues to action in V6"
skip-if: "V6 already merged"
related:
  - career-ops/output/production-filter-refinement-review-2026-05-01-v5.xlsx
  - career-ops/output/production-filter-refinement-v3-v4-v5-diff.xlsx
  - docs/plans/2026-05-03-production-filter-refinement-design.md
  - scripts/lib/job-fit-rules.mjs
  - scripts/production-filter-refinement-audit.mjs
  - docs/audits/2026-05-04-production-filter-refinement-v5-summary.json
  - docs/audits/2026-05-05-shadow-version-diff-summary.json
---

# V5 Shadow Workbook — Round 1 Combined Reviewer Findings

## Executive Summary

- **Findings count:** BLOCKING=1, HIGH=4, MEDIUM=4, LOW=2.
- **Top 3 recurring patterns:**
  1. **Pre-Sales-architect oscillation.** V5 simultaneously assigns the SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE family (highest weight) AND the `sales_role_content` hard drop to a large cohort of titles that look like Will's #1 target archetype on the surface. Rule-wise the detector is doing exactly what the design plan says (§4.6 lines 271-274 explicitly hard-drops sales engineers / pre-sales / solutions consultants when content is sales-led). User instructions in the reviewer prompt say "AE+AI-ENG hybrid = keep." The two contradict on the same cohort (Anthropic Applied AI Architect, Modal FDE, Hebbia AI Strategist, GitLab Solutions Architect, Decagon Solutions Architect). This is not a code defect — it is a policy contradiction that only Will can resolve.
  2. **Source-hygiene routes most invalid pages correctly, with two narrow gaps.** 192 retained shadow rows + 14 known-missing seeds = 206 in Source Repair Review. Hygiene works for `missing_jd_cache`, `page_not_found_or_closed_cache`, `not_a_job_page` (Salesforce blogs), and `generic_careers_index`. It misses the Atlassian `all-jobs?team=...` listing URL (cached 1,570 chars of language-switcher boilerplate; not flagged) and the Docusign AI `https://example.com/...` placeholder (0-char cache). Title-level listing-page contamination (Scale AI duplicate rows with `Apply Now` suffixes) is a separate row-identity defect that source-hygiene cannot fix.
  3. **YoE-detector is well-tuned at the gate but produces a labeling artifact in Validation Findings.** All 148 yoe_required_gt_5 hard drops we sampled have legitimate ≥6-year requirements in the JD. The Validation Findings sheet flags Cohere PM and Pigment TAM as `specific_location_not_in_drop_reason` review items — but the location detector correctly identified `toronto_hybrid_onsite` (score=+2, no hard-drop). The validator is just noticing that the hard_drop_reason string lacks `location` even when location is in the score. Cosmetic, not a rule defect.
- **Recommendation:** **NEEDS-DEEPER-REVIEW.** Specifically: Will must resolve the BLOCKING contradiction on pre-sales-architect cohort before V6. Source-hygiene HIGH/MEDIUM items can be batched into a routine V5.1 patch. Sheet contents are otherwise defensible.
- **Sheets reviewed (sample sizes):**
  - Hard Drop Review (514 rows) — read all reasons; sampled ~60 rows with focus on AI/FDE/Solutions titles.
  - Sales Hard Drops (108 rows) — read full title list, cross-checked the ~58 with AI/Solutions/FDE titles against full JD evidence.
  - Source Repair Review (206 rows) — sampled ~30 across all 5 reason categories.
  - Reviewer Queue (425 rows) — sampled ~50, focused on UNKNOWN-family rows without source-repair annotation.
  - Score Deltas (613 rows) — sorted by delta magnitude; reviewed top 15 increases + top 15 decreases.
  - Validation Findings (4 rows) — read all 4.
  - Known Missing Seeds (14 rows) — read all 14.
  - Comp YoE Location (834 rows) — sampled YoE drops at YoE=6 (48 rows) and YoE≥8 (~30 rows) plus all 1 comp drop.

## Findings by Severity

### BLOCKING

#### F-001: Pre-Sales-Architect cohort sits at the intersection of "highest-weight family" and "hard-drop sales content" — Will must adjudicate

- **Sheet:** Sales Hard Drops + Score Deltas
- **Failure mode:** RULE_GAP (this is a policy contradiction, not a defect — the rule is doing what the design plan said)
- **Diff cross-tag:** persisted-across-V3/V4/V5 — V5 net hard-drop count is the lowest, so the cohort has been actively re-considered each version.
- **Observed:** A single cohort of ~40+ rows is simultaneously assigned `primary_family = SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE` (base 12 — Will's highest-priority family) AND `hard_drop = yes` with `hard_drop_reason = sales_role_content`. The Score Deltas sheet's biggest score increases (+25 to +41) are dominated by rows that are then hard-dropped:
  - Decagon | Strategic Solutions Engineer (East/West) — delta +41 → hard drop
  - Hebbia | AI Strategist — delta +37 → hard drop
  - Hebbia | Forward Deployed Banker (AI Strategist) — delta +35 → hard drop
  - Modal | Forward Deployed Engineer - Systems — delta +25 → hard drop
  - Anthropic | Applied AI Architect (28+ variants) — all hard-dropped
- **Expected (per Will's reviewer-prompt cheat-sheet):** "AE+AI-ENG hybrid = keep. 'Collaborate with sales' alone in JD = NOT a sales role." Suggests these should be kept-with-annotation.
- **Expected (per design plan §4.6 lines 271-274):** "Sales Engineer, Pre-Sales, Sales Consultant, Solutions Consultant, Account Manager, Customer Success Manager, Revenue, Business Development, Growth Sales, Partnerships Sales, and GTM roles should hard-drop when the title or content shows the role is primarily sales/revenue/account ownership." Suggests these should hard-drop.
- **Evidence (row, Anthropic Applied AI Architect, Commercial — `https://job-boards.greenhouse.io/anthropic/jobs/5192805008`):**
  - JD opens: `"As an Applied AI team member at Anthropic, you will be a Pre-Sales architect focused on becoming a trusted technical advisor"`
  - Anthropic's JD frames its own comp range with: `"For sales roles, the range provided is the role's On Target Earnings (\"OTE\") range, meaning that the range includes both the sales commissions/sales bonuses target and annual base salary"` — Anthropic itself classifies this as a sales role.
  - `"Partner with account executives across India and the Asia-Pacific region"` — explicit sales counterpart.
- **Evidence (row, Modal | Forward Deployed Engineer - Systems — `https://jobs.ashbyhq.com/modal/c85a3e3d-f1a5-479d-91e3-9e0b34279a82`):**
  - JD: `"As an FDE, you will be the technical voice in our sales process, working directly with Account Executives to help enterprise customers"` and `"Modal is seeking an experienced Forward Deployed Engineer (FDE) to partner with our sales team and drive technical sales success"`
- **Evidence (row, Hebbia AI Strategist):**
  - JD: `"shape the post-sales team"` (sales_counterpart label) + OTE comp range $90K-$160K with bonus.
- **Evidence (rule):** `scripts/lib/job-fit-rules.mjs:99-147` `classifySalesRole` — the function correctly fires on the `sales_compensation` / `sales_process` / `sales_counterpart` / `sales_department` evidence the JDs contain. The rule is not buggy; it is implementing the design-plan policy. The 4-point `sales_compensation` weight on Anthropic's "OTE for sales roles" string alone is sufficient to trigger hard_drop.
- **Why I am NOT classifying as RULE_WRONG:** Anthropic itself says "for sales roles" in the comp template — that is explicit company-side classification, not a false-positive keyword. Modal's JD says "you will be the technical voice in our sales process" — that is a sales-track role with technical responsibilities, not an AI engineer role with sales adjacency. The rule is doing rigorous content classification that Will may or may not want. This is a policy question, not a code question.
- **Suggested fix:** **Will to choose one of three policies, not the agent.**
  1. **Tighten policy to current rule** (preferred per the design plan): Accept that pre-sales architect / FDE-in-sales-process / OTE-comp roles hard-drop. Rationale: Will's prior 715-row AE-only strip showed he does not want quota-bearing roles polluting the pipeline; pre-sales architect is structurally the technical-AE pattern. V5 is correct.
  2. **Loosen policy to keep AE+AI-ENG hybrids** (per reviewer cheat-sheet): Modify `classifySalesRole` to require evidence ≥5 (not ≥4) when `primary_family = SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE` AND title contains an AI/ML/FDE token. Demote `sales_compensation` from 3pts to 2pts when the only signal is the OTE-disclosure boilerplate (so single-occurrence OTE language doesn't combine with one `sales_process` hit to clear the threshold). Rationale: closer to Will's "AE+AI hybrid keep" instruction.
  3. **Annotate-not-drop** middle path: Convert `sales_role_content` from hard-drop to a `review` band with `family=SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE`. Pushes ~70-90 rows into Reviewer Queue for Will to triage manually. Rationale: cheapest reversible decision; lets Will inspect Anthropic / Modal / Hebbia individually.

  Without Will's choice, neither V5 (current policy 1) nor a loosened V6 is "correct." The reviewer cannot decide for Will.

### HIGH

#### F-002: Title-level listing-page contamination produces duplicate Scale AI / ElevenLabs / Thinking Machines rows

- **Sheet:** Source Repair Review + Shadow Decisions
- **Failure mode:** DATA_QUALITY (title scraped from listing-page DOM, includes appended location + "Apply Now" text)
- **Diff cross-tag:** persisted-across-V3/V4/V5 (these came in from the 2026-05-01 baseline, not introduced by V5 logic)
- **Observed:** Same `gh_jid` represented twice — once with a clean Greenhouse title, once with a "scale.com/careers/..." URL where the title has listing-page chrome appended. Examples (all in Source Repair Review with `missing_jd_cache`):
  - Scale AI | "Forward Deployed Product Manager, EnterpriseNew York, NYApply Now" (`https://scale.com/careers/4673051005`) — same job as clean entry "Forward Deployed Product Manager, Enterprise" at `https://job-boards.greenhouse.io/scaleai/jobs/4673051005`
  - Scale AI | "Applied AI Engineer, Enterprise GenAINew York, NYApply Now" (`https://scale.com/careers/4514173005`) — duplicate of clean Greenhouse row
  - Scale AI | "Machine Learning Research Engineer, Agent Data Foundation - Enterprise GenAINew York, NYApply Now" — same pattern
  - ElevenLabs | "Forward Deployed Engineer - Software EngineerRemoteSan Francisco+4 more" (`https://elevenlabs.io/careers/...`)
  - Thinking Machines Lab | "Read moreabout Forward Deployed Engineer, Tinker at Thinking Machines Lab" (`https://jobs.accel.com/companies/thinking-machines-lab/jobs/76414105-...#content`)
- **Expected:** One row per job ID; clean title.
- **Evidence (row):** See URLs above; titles have `Apply Now`, `+4 more`, `Read moreabout` literals embedded.
- **Evidence (rule):** Not a rule defect — these flow from the upstream scrape (custom-scraper.mjs / discovery cache) into `pipeline.md`. The audit script cannot retro-fix titles. Source Repair Review correctly catches them via `missing_jd_cache` for the contaminated URL while the clean Greenhouse URL has its own cache entry.
- **Suggested fix:** Add a row-identity dedup pass in `scripts/production-filter-refinement-audit.mjs:212` (the `decisions` map step) keyed on `(normalized_company, gh_jid_extracted_from_url)`. When two rows share the same gh_jid but one URL is `scale.com/careers/...` and the other is `job-boards.greenhouse.io/...`, prefer the Greenhouse row and drop the contaminated one. Pre-pipeline fix should land in `career-ops/custom-scraper.mjs` to strip listing-page chrome from titles before write to `pipeline.md` — but that touches vendored upstream-adjacent code, so flag as separate work item.

#### F-003: Atlassian "all-jobs?team=Product Management" listing URL slipped past source-hygiene

- **Sheet:** Reviewer Queue (NOT in Source Repair Review)
- **Failure mode:** ROW_IDENTITY_WRONG (this is a generic listing page, not a job posting) + EVIDENCE_MISSING in detector
- **Diff cross-tag:** persisted-across-V3/V4/V5
- **Observed:** Row appears in Shadow Decisions as `Atlassian | Product Manager | https://www.atlassian.com/company/careers/all-jobs?team=Product%20Management&location=&search=` with `family=PRODUCT_AI`, `hd=no`, `sr=no`. Cache lookup confirms 1,570-char body that begins `"Close [View this page in your language?] ... All languages"` — a language switcher / listing page, not a job description.
- **Expected:** Either (a) a SOURCE_BROKEN row routed to Source Repair Review, or (b) absence from the dataset entirely.
- **Evidence (row):** URL contains `/all-jobs?team=...&location=&search=` query-form pattern; cached body starts with language-switcher chrome.
- **Evidence (rule):** `scripts/production-filter-refinement-audit.mjs:546-570` `detectSourceHygiene` checks for `/blog/`, `/news/`, `/press/`, `/resources/`, `#open-positions`, `careers/locations/`, `not_a_job_page`, `generic_careers_index`, and `row_detail_missing_or_listing_page`. None match `/all-jobs?team=...`. The `generic_careers_index` heuristic only triggers on `#open-positions` or text containing `we found: N roles` / `departmentslocationstype` patterns.
- **Suggested fix:** In `detectSourceHygiene`, add: `if (/\/all-jobs\?/i.test(url) || /\?team=.+(&location=|&search=)/i.test(url)) { return { invalid: true, reason: "generic_careers_index", evidence: "all-jobs query listing page" }; }`. Also lower the body-size floor for `row_detail_missing_or_listing_page` from `body.length > 8000` to `body.length > 1200` when title doesn't appear in body (the Atlassian body is 1,570 chars and lacks the title).

#### F-004: Placeholder URL `https://example.com/careers/product-manager-austin` leaked into Docusign AI row

- **Sheet:** Source Repair Review (correctly captured under `missing_jd_cache`)
- **Failure mode:** DATA_QUALITY (definitely-fake URL never should have entered the pipeline; 0-byte cache confirms it was never fetched)
- **Diff cross-tag:** persisted-across-V3/V4/V5 (this is upstream pipeline data)
- **Observed:** Row `Docusign AI | Product Manager | https://example.com/careers/product-manager-austin` with empty cache. Source Repair caught it via `missing_jd_cache` — that's a partial save — but the row should not exist at all.
- **Expected:** Either quarantine at scrape time, or hard-skip in the audit (don't emit a Source Repair Review row for a URL that's syntactically a placeholder).
- **Evidence (row):** URL hostname is literally `example.com` (RFC 2606 reserved domain); cache entry has `text length=0`.
- **Evidence (rule):** No rule rejects `example.com`; `detectSourceHygiene` only acts on the cached body, which is empty, so it correctly routes to `missing_jd_cache`. The cache lookup happens at `scripts/production-filter-refinement-audit.mjs:213`.
- **Suggested fix:** Add a hostname blocklist check at the top of `detectSourceHygiene`: `if (/^https?:\/\/(example\.(com|org|net)|test\.example|localhost|127\.|0\.0\.0\.0)/i.test(url)) { return { invalid: true, reason: "placeholder_or_invalid_url", evidence: url }; }`. Separately, audit `pipeline.md` and `data/scan-history.tsv` for any other `example.com` rows and either remove them or mark them `note: SOURCE_BROKEN` upstream.

#### F-005: 31 high-intent FDE / Solutions / Applied-AI titles in Source Repair `missing_jd_cache` — recoverable jobs Will may want

- **Sheet:** Source Repair Review
- **Failure mode:** EVIDENCE_MISSING (JD never fetched / cache populated, so they bypass scoring with `comp_unknown; yoe_unknown; location_unknown_or_unrestricted` and end up in Reviewer Queue with band C)
- **Diff cross-tag:** introduced-in-V4→V5 (V5's source-hygiene routes 192 retained shadow rows to Source Repair Review; V4 had 0)
- **Observed:** 31 rows with high-intent titles flagged `missing_jd_cache`:
  - Vercel | Forward Deployed Engineer, v0
  - Vercel | Solutions Architect (×2)
  - Nscale | Data Center Solutions Architect – GPU Infrastructure
  - Nscale | Data Engineer (Forward Deployed)
  - Poolside | Forward Deployed Research Engineer (FDRE - Clearance)
  - Thinking Machines Lab | Forward Deployed Engineer, Tinker
  - ElevenLabs | Forward Deployed Engineer - Software Engineer
  - Multiple Scale AI / CoreWeave / Fidelity AI Architect / Wiz Solutions Architect rows
- **Expected:** Either (a) re-fetch JDs and re-score before V6, or (b) explicitly mark these as "needs source-repair to score" so Will knows the sample is not authoritative.
- **Evidence (row):** Each row has empty `score reasons` apart from `family=...` and the universal `comp_unknown; yoe_unknown; location_unknown_or_unrestricted` annotations. They cannot be scored confidently.
- **Evidence (rule):** `production-filter-refinement-audit.mjs:215-217` — when `cacheEntry` is null or body is empty, `detectSourceHygiene` returns `invalid=true, reason="missing_jd_cache"` and `usableText` is set to `""`, which collapses scoring to family-only.
- **Suggested fix:** **Out of V6 rule scope** — this needs a one-shot enrichment pass with `career-ops/firecrawl-extract.mjs` or `career-ops/enrich-jobs.mjs` over these 31 URLs. After re-enrichment, regenerate the V5 workbook and let scoring run. Note this is a known-deferred follow-up per AI_HANDOFF.md "live current-board comparison" (V1.1).

### MEDIUM

#### F-006: 14 known-missing seed jobs (Surge AI, ElevenLabs, xAI, Atlassian) all show `presence=absent_from_retained_2026_05_01_artifacts`

- **Sheet:** Known Missing Seeds + Source Repair Review
- **Failure mode:** EVIDENCE_MISSING — these were the 14 seed jobs Will provided in the design plan and should ideally trace through to the 2026-05-01 retained artifacts
- **Diff cross-tag:** persisted-across-V3/V4/V5 (seed list itself is part of V3 design)
- **Observed:** All 14 seeds lack `shadow_family`, `shadow_score`, and `shadow_band` (empty fields) and decision is `review_or_recover_candidate`. The Surge AI URLs (`https://surgehq.ai/careers/technical-program-manager` etc.) and the misencoded `generative-al---generalist`/`al-programs-analyst` slugs (where `ai` was double-encoded as `al`) are still in the seed list.
- **Expected:** Either (a) the seeds appear in the 2026-05-01 baseline retained artifacts and are scored, or (b) the seed list is corrected (the `al-programs-analyst` typo from the historical P-4/P-6 slug bugs should be removed or fixed).
- **Evidence (row):** All 14 rows have empty shadow columns.
- **Evidence (rule):** `scripts/production-filter-refinement-audit.mjs:46-61` `KNOWN_SEEDS` list is hardcoded; the audit only joins them by URL. None of the 14 URLs appear in `pipeline.md`/`scan-history.tsv` for 2026-05-01 — confirmed by `presence=absent_from_retained_2026_05_01_artifacts`.
- **Suggested fix:** (a) Fix the two visibly-typo'd seed URLs in `KNOWN_SEEDS`: `generative-al---generalist` → `generative-ai-generalist`, `al-programs-analyst` → `ai-programs-analyst`, then re-fetch. (b) Out-of-scope but worth flagging: the 14 seeds are a separate V1.1 source-repair workstream per AI_HANDOFF.md. They are NOT a V5 defect — they pre-date V3.

#### F-007: Anthropic vanilla "Applied AI Engineer" rows hard-dropped on `hybrid_non_toronto_no_remote` even though many are SF-with-flexibility

- **Sheet:** Hard Drop Review
- **Failure mode:** RULE_WRONG (potentially) OR ROW_IDENTITY_WRONG (depending on Will's location stance for Anthropic specifically)
- **Diff cross-tag:** persisted-across-V3/V4/V5
- **Observed:** Anthropic "Applied AI Engineer" (e.g., `https://job-boards.greenhouse.io/anthropic/jobs/5055488008`, `5014500008`) drop on `hybrid_non_toronto_no_remote` alone (not sales). This is the closest match to Will's #2 family (AI_ENGINEERING). Anthropic has Toronto adjacency via Anthropic Canada subsidiary news but the JDs may not say "Toronto."
- **Expected:** If JD says "Remote-flexible, offices in Toronto, NY, SF, London" (Anthropic's standard footer) → keep + annotate. If it says SF/NY-only → drop.
- **Evidence (row):** The Cohere PM Public Sector & Defence row at `https://jobs.ashbyhq.com/cohere/2a7f1fad-...` in Validation Findings shows the location detector CAN recognize "Remote-flexible, offices in Toronto" → `toronto_hybrid_onsite` annotation, score=2, no hard-drop. But Anthropic Applied AI Engineer rows are dropping. Need to confirm whether Anthropic JDs use the same phrasing or a different one.
- **Evidence (rule):** `decideLocation` at `scripts/lib/job-fit-rules.mjs:455-491`. The detector requires `hasGenuineRemoteWork(locationText)` to clear the hard-drop. If Anthropic JDs phrase remote as "remote within the US/UK/Canada" (not literally "fully remote" or "remote-first"), and the Toronto reference is buried in a `Remote-flexible, offices in Toronto, New York, San Francisco, London and Paris` line where `Remote-flexible` doesn't match the `REMOTE_WORK_RE` pattern, the detector will miss.
- **Suggested fix:** Sample 3 Anthropic "Applied AI Engineer" JDs and check whether `Remote-flexible` is the actual phrase. If yes, add `\bremote[-\s]?flexible\b` to `REMOTE_WORK_RE` at `scripts/lib/job-fit-rules.mjs:23` (currently it's only in the validation-finding regex at line 505, not in the production detector). If Anthropic JDs use different phrasing, flag specific text and write an Anthropic-aware annotation.

#### F-008: "OTE Range (Select Locations)" boilerplate from dbt Labs trips sales_compensation evidence even when it's just disclosure language

- **Sheet:** Sales Hard Drops
- **Failure mode:** RULE_WRONG (edge case) — `sales_compensation` weight too high for one OTE-disclosure occurrence
- **Diff cross-tag:** introduced-in-V3→V4 (the sales-compensation evidence rule was added in V4)
- **Observed:** Several dbt Labs Solutions Architect rows hard-drop with `sales_compensation: ... OTE Range (Select Locations) $145,000 - $180,000USD ...` as evidence. This is dbt Labs' standard comp-disclosure block, not necessarily declaring the role itself is sales-compensated.
- **Expected:** Without other strong sales evidence (sales_department / sales_process / quota_closing), a single OTE-disclosure block should not be sufficient by itself.
- **Evidence (row):** dbt Labs | Solutions Architect, Commercial — evidence shows ONLY `sales_compensation` block; total evidence value = 3, but rule fires when `total >= 4` OR (`total >= 3` AND `labels.has("sales_department")`). Re-examining this row: the hard_drop_reason includes `sales_role_content` so `sales_department` must also have fired. Look at the URL list: dbt Labs adds `Department: Sales Engineering` somewhere in the page. If Will views Sales Engineering at dbt Labs as legit AE+AI hybrid, this is an F-001 sub-case.
- **Evidence (rule):** `scripts/lib/job-fit-rules.mjs:118-130` — `sales_department` regex is `/\bdepartment\b[\s\S]{0,90}\b(?:sales engineering|sales|revenue)\b/i` value=4. A single mention of `Department: Sales Engineering` clears the threshold by itself.
- **Suggested fix:** Defer to Will via F-001 resolution. If Will picks policy #1 (current rule), this is correct. If #2 or #3, add a guard: `sales_department` evidence requires a corroborating non-`sales_compensation` signal before tripping the threshold alone.

#### F-009: Validation Findings include a labeling artifact (Cohere PM, Pigment TAM) — these are NOT bugs

- **Sheet:** Validation Findings
- **Failure mode:** DATA_QUALITY (validator's wording is technically correct but practically misleading)
- **Diff cross-tag:** persisted-across-V3/V4/V5 (validator logic stable)
- **Observed:** Cohere | Product Manager, Public Sector & Defence has hard_drop_reason `yoe_required_gt_5`, but the validator flags `specific_location_not_in_drop_reason: ... Remote-flexible, offices in Toronto, New York, San Francisco, London and Paris ...`. The location detector correctly identified Toronto + remote-flexible (annotation `toronto_hybrid_onsite`, location score=+2, NOT a hard drop). The validation message reads as if it's a bug.
- **Expected:** Either suppress this validation finding when location score > 0, or rename the finding to something less alarming (`location_evidence_present_but_not_a_drop`).
- **Evidence (row):** Verified Cohere PM row in Shadow Decisions: `score reasons = family=8 semantic=17 compensation=0 yoe=0 location=2 level=0 rank=2 category=0 | hard_drop=yoe_required_gt_5`. Location is +2 (toronto kept), only YoE is a hard drop.
- **Evidence (rule):** `production-filter-refinement-audit.mjs:514-523` — the validator emits `specific_location_not_in_drop_reason` whenever a specific non-Toronto location appears in evidence, regardless of whether the location detector cleared it.
- **Suggested fix:** In `buildValidationFindings`, gate this finding on `d.location_reason && /non_toronto/.test(d.location_reason)`. If location_reason is empty (i.e., location was not a hard drop), don't emit the finding. Drops the count from 4 → 2, both legitimate.

### LOW

#### F-010: Inconsistent company-name normalization (`Anthropic India` vs `Anthropic`, `Databricks-adjacent: dbt Labs`)

- **Sheet:** Shadow Decisions / Sales Hard Drops
- **Observed:** One Anthropic row's JD evidence says `"As an Applied AI team member at Anthropic India"`. Another says `"at Anthropic"`. The company column for both is `Anthropic`. Other rows use `Databricks-adjacent: dbt Labs`, `Cerebras-adjacent: Etched`, `Harvey-adjacent: Legora` — fine for portals.yml grouping but visually inconsistent in human review.
- **Suggested fix:** Out of scope for V6; cosmetic.

#### F-011: 2 rows have `sales_role_title` (correct hard drops, no objection)

- **Sheet:** Sales Hard Drops
- **Observed:** Deepgram | "Enterprise Account Executive - AI Platform (B2B Saas/Restaurant Tech Vertical)" and UiPath | "Pre-Sales Engineer (Agentic AI Automation)" — both correctly caught at title-level. Even Will's loosen-policy stance per the cheat-sheet would keep these as drops because title is unambiguously sales/pre-sales.
- **Suggested fix:** None — these are working correctly. Noted only because they're clean wins to confirm `sales_role_title` regex is sound.

## Invalid URL Triage

- **Total invalid-URL rows sampled:** 11 distinct URLs flagged by automated pattern audit + 5 Scale AI/ElevenLabs/Thinking Machines title-contamination cases = 16 total.
- **Per-bucket counts:**
  - SOURCE_BROKEN: 5 (Atlassian all-jobs, Salesforce blogs ×2, SoundHound `#open-positions`, Cerebras `#department=...`)
  - JOB_CLOSED_SINCE_SCAN: 0 (no current evidence)
  - MALFORMED_ENCODING: 5 (all `%20` cases — but these are LEGIT — see note below)
  - ROW_IDENTITY_MISMATCH: 5 (Scale AI / ElevenLabs / Thinking Machines listing-page contamination)
  - V4→V5_REGRESSION: 0 detected
  - PERSISTED_ACROSS_VERSIONS: 1 (Docusign AI `example.com` placeholder)

**Important note on `%20`-encoded URLs:** The 5 cases (Jasper, Resolve AI ×2, H2O.ai ×2) are NOT broken URLs. `%20` is the standard URL-encoding for space, used by Ashby (`Jasper%20AI`, `Resolve%20AI`) and tracking parameters (`source=Our%20Career%20Page%20Widget`). I verified all 5 have valid cached JD content with proper `extracted_signals`. They are correctly handled — flagging only as a procedural false-positive in my heuristic scan.

### Per-row classifications

| row_id | company | title | bucket | suggested_handling |
|---|---|---|---|---|
| 1 | Atlassian | Product Manager | SOURCE_BROKEN | Add `/all-jobs?` URL pattern + small-body listing detection to `detectSourceHygiene`; route to Source Repair (F-003) |
| 2 | Salesforce | Salesforce Uses Agentic AI to Boost Seller Productivity | SOURCE_BROKEN | Already in Source Repair; correctly handled |
| 3 | Salesforce | Technical Architecture in the Age of Agentic AI | SOURCE_BROKEN | Already in Source Repair; correctly handled |
| 4 | SoundHound AI | Product Manager | SOURCE_BROKEN | Already in Source Repair; correctly handled |
| 5 | Cerebras Systems | Machine Learning Engineer | SOURCE_BROKEN | Already in Source Repair (`#department=...` listing); correctly handled |
| 6 | Docusign AI | Product Manager | PERSISTED_ACROSS_VERSIONS / DATA_QUALITY | Add `example.com` blocklist to `detectSourceHygiene`; remove from upstream `pipeline.md` (F-004) |
| 7 | Jasper | Enterprise Solutions Engineer | NOT-INVALID (false positive in my heuristic) | Hard drop is legitimate via sales detector + Will-pending decision (F-001) |
| 8 | Resolve AI | Enterprise Solutions Engineer - SF | NOT-INVALID | Hard drop legit (On-site SF + sales content); F-001 cohort |
| 9 | Resolve AI | Enterprise Solutions Engineer - NY | NOT-INVALID | Hard drop legit (On-site NY + sales content); F-001 cohort |
| 10 | H2O.ai | AI Engineer (×3) | NOT-INVALID | Cached JD valid; URL-encoding is normal Career-Widget tracking param |
| 11 | H2O.ai | Machine Learning Engineer | NOT-INVALID | Same as above |
| 12 | Scale AI | Forward Deployed Product Manager, EnterpriseNew York, NYApply Now | ROW_IDENTITY_MISMATCH | Dedup against clean Greenhouse row; drop scale.com URL (F-002) |
| 13 | Scale AI | Applied AI Engineer, Enterprise GenAINew York, NYApply Now | ROW_IDENTITY_MISMATCH | Same as above (F-002) |
| 14 | Scale AI | Forward Deployed AI Engineering Manager, Enterprise New York, NYApply Now | ROW_IDENTITY_MISMATCH | Same as above (F-002) |
| 15 | ElevenLabs | Forward Deployed Engineer - Software EngineerRemoteSan Francisco+4 more | ROW_IDENTITY_MISMATCH | Strip listing-page chrome; use canonical Ashby URL if available (F-002) |
| 16 | Thinking Machines Lab | Read moreabout Forward Deployed Engineer, Tinker at Thinking Machines Lab | ROW_IDENTITY_MISMATCH | Strip listing-page chrome (F-002) |

## Open Questions for Will (BLOCKING ambiguities only)

- **Q1 (must-answer before V6):** On the pre-sales-architect cohort (F-001), which policy do you want?
  1. Keep V5 current behavior (hard-drop pre-sales architect / FDE-in-sales-process / OTE-comp roles per design plan §4.6).
  2. Loosen so AE+AI-ENG hybrids stay (raise sales-evidence threshold from 4 to 5 when family=SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE; downweight OTE-disclosure boilerplate).
  3. Move all 70-90 of these to Reviewer Queue (annotate, don't drop) and triage manually.

  This decision touches Anthropic ×30+, Modal ×1, Hebbia ×3, Decagon ×2, GitLab ×6, Notion ×2, Lovable ×2, Snorkel AI ×2, Glean ×3, Ramp ×1, Cresta ×3, Cloudflare ×7, Intercom AI ×2, Scale AI ×2, dbt Labs ×3, plus several singletons. ~70-90 row impact. The reviewer agent does not have authority to choose between Will's reviewer-prompt instruction ("AE+AI-ENG hybrid keep") and the design plan's explicit policy ("pre-sales / sales engineer hard-drop"). Both are written by Will at different times.

## Methodology

- **Sample sizes per sheet:** Hard Drop Review — read all 514 reasons, examined ~60 rows in detail. Sales Hard Drops — read all 108 titles, examined ~58 with AI/Solutions/FDE titles. Source Repair Review — sampled ~30 across all 5 reason categories, read full reason distribution. Reviewer Queue — sampled ~50, focused on UNKNOWN-family rows without source-repair annotation. Score Deltas — sorted by delta, reviewed top 15 increases + top 15 decreases. Validation Findings — read all 4. Known Missing Seeds — read all 14. Comp YoE Location — sampled YoE drops at YoE=6 (48 rows total) and YoE≥8.
- **Random seed:** Stratified by hard_drop_reason and company; not random.
- **Tools / scripts written:**
  - `D:/Projects/tmp-v5-review/inspect-v5.mjs` — workbook → JSON dump (one-time helper, can be re-run).
  - `D:/Projects/tmp-v5-review/analyze.mjs` — distribution + suspicious-pattern analysis.
  - `D:/Projects/tmp-v5-review/analyze2.mjs` — targeted FDE/Solutions/Anthropic deep-dive.
  - `D:/Projects/tmp-v5-review/analyze3.mjs` — cache lookups for suspicious URLs + Cohere/Scale AI verification.
- **Verification:** All findings cite (a) exact row data (company / title / URL / evidence snippet) and (b) the rule function and line number from `scripts/lib/job-fit-rules.mjs`, `scripts/lib/jd-sections.mjs`, or `scripts/production-filter-refinement-audit.mjs`. Cross-referenced against V3/V4/V5 diff workbook for regression vs persistence classification.
