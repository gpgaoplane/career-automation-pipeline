---
status: active
type: implementation-plan
owner: codex
last-updated: 2026-05-03T20:57:38-04:00
read-if: "you are implementing the production filter/scoring refinement approved from docs/plans/2026-05-03-production-filter-refinement-design.md"
skip-if: "you only need current implemented behavior; read docs/design/filter-pipeline-reference.md"
related:
  - docs/plans/2026-05-03-production-filter-refinement-design.md
  - docs/design/filter-pipeline-reference.md
  - scripts/fullrun-calibration-workbook.mjs
  - scripts/test-fullrun-calibration-workbook.mjs
  - career-ops/enrich-jobs.mjs
  - career-ops/test-enrich-signals.mjs
  - career-ops/export-jobs.mjs
  - career-ops/portals.yml
  - career-ops/modes/_profile.md
  - career-ops/config/profile.yml
  - scripts/ats-adapters/_lib.mjs
  - career-ops/firecrawl-extract.mjs
---

# Production Filter Refinement Implementation Plan

## 1. Scope

Implement V1 as a deterministic, offline-verifiable production-rule
refinement. V1 changes filter/scoring logic and produces review artifacts, but
does not run a live current-board comparison, mutate tracker/application data,
or replace the untouched 2026-05-01 baseline workbook.

V1 must support:

- sales-role hard drops before positive AI/technical boosts;
- Associate restored as a low-priority/reviewable level signal;
- Solutions / Deployment / Architect / FDE as highest-weight family;
- guarded generic engineering roles using JD evidence, not title alone;
- compensation hard drops using upper-bound floors of $120K USD and $120K CAD;
- hourly-rate parsing and full-time annualization;
- YoE scoring/gating: 0-2 +4, 3 = 0, 4 = -2, 5 = -3, >5 hard drop;
- structured location decisions where annotations do not automatically drop;
- deterministic semantic JD rubric with evidence/confidence/reasons;
- checkpoint ledgers and a review workbook.

Reviewer refinement: Lorentz reviewed the first draft on 2026-05-03. This
revision tightens the direct-ATS strategy, shadow/review gating, historical raw
reject limitations, scoring calibration, semantic rubric rules, hard-drop
confidence, compensation candidate selection, hourly safeguards, and YoE edge
cases.

Out of scope for V1:

- LLM reviewer/classifier;
- SQL database migration;
- vector/RAG implementation;
- live current-board scraping;
- automatic tracker additions;
- editing upstream/vendored `career-ops/scan.mjs`.

## 2. Implementation Choice Summary

### 2.1 Do Not Edit `career-ops/scan.mjs`

`career-ops/scan.mjs` is upstream/vendored. V1 should not edit it.

Instead:

- build a custom shared rule engine under root `scripts/lib/`;
- use it in custom/gated paths first;
- leave `scan.mjs` as legacy/current behavior until a later explicit
  user-approved replacement;
- add a new gated future-scan path that can eventually replace `npm run
  full-scan` without mutating downstream artifacts blindly.

Direct Greenhouse/Ashby/Lever jobs from `scan.mjs` would otherwise remain on
legacy substring filtering. To avoid that gap, V1 must implement a custom
direct-ATS wrapper for Greenhouse/Ashby/Lever using existing no-auth ATS client
functions. The new gated scan path, not `npm run full-scan`, becomes the only
approved path for testing the refined rules until Will approves production
rollout.

Production configs and `export-jobs.mjs` must remain behavior-compatible until
the shadow review workbook is generated and approved.

### 2.2 Guarded Engineering Flow

Choose **pre-pipeline candidate queue** for V1.

Generic engineering roles should not enter normal `pipeline.md` just because
they are plausible. They should go to:

- `career-ops/output/checkpoints/<run-date>/pre-pipeline-candidates.tsv`

Then JD evidence can promote them into the review workbook / future pipeline.

This is safer than allowing broad generic engineering into `pipeline.md` with
status flags that the current exporter does not understand.

### 2.3 Semantic Rubric

Use deterministic rubric scoring only. No LLM reviewer.

Semantic scoring remains numeric and auditable. It adds structured evidence
fields rather than replacing numerical ranking.

### 2.4 Shadow-First Production Safety

V1 has two phases:

1. **Shadow/review phase:** implement rule engine, richer extraction, offline
   reclassification, ledgers, and review workbook. No production output path
   changes.
2. **Approval phase:** after Will approves the review workbook and score
   distribution, wire approved rules into `export-jobs.mjs`, `portals.yml`, and
   profile docs.

No production workbook should be regenerated with the new rules until phase 2.

## 3. Files To Add

### 3.1 Root Shared Rule Engine

Add:

- `scripts/lib/job-fit-rules.mjs`
- `scripts/test-job-fit-rules.mjs`

Responsibilities:

- title normalization and safe phrase matching;
- role-family detection;
- sales-role hard-drop detection;
- Associate/level signal detection;
- generic engineering guard decision;
- compensation decision from extracted signals;
- YoE decision from extracted signals;
- location decision wrapper from extracted signals;
- semantic rubric scoring from extracted evidence;
- final score composition.

Exported functions:

- `normalizeTitle(text)`
- `matchSafePhrase(text, phrase)`
- `classifyTitle({ title, companyMeta })`
- `classifySalesRole({ title, textSections, signals })`
- `classifyRoleFamily({ title, textSections, signals, companyMeta })`
- `classifyLevel({ title, textSections, signals })`
- `decideCompensation(signals)`
- `decideYoe(signals)`
- `scoreSemanticFit({ title, textSections, signals, roleFamily })`
- `scoreJob({ job, companyMeta, signals, textSections })`
- `formatScoreReasons(scoreResult)`

### 3.2 JD Section Parser

Add:

- `scripts/lib/jd-sections.mjs`
- `scripts/test-jd-sections.mjs`

Responsibilities:

- split Markdown/plain-text JDs into best-effort sections;
- classify blocks as `responsibilities`, `requirements`, `compensation`,
  `location`, `benefits`, `about_company`, or `unknown`;
- return confidence and evidence snippets;
- never require perfect parsing for hard drops.

Exported functions:

- `parseJdSections(text)`
- `findSectionEvidence(sections, queryType)`
- `extractRequirementBlocks(sections)`

Rule: high-confidence hard drops should require evidence from title,
requirements, compensation, location, or strong whole-document evidence. Weak
generic prose should produce review annotations.

### 3.3 Offline Reclassification / Review Workbook

Add:

- `scripts/production-filter-refinement-audit.mjs`
- `scripts/test-production-filter-refinement-audit.mjs`

Inputs:

- `--run-date 2026-05-01`
- `career-ops/data/pipeline.md`
- `career-ops/data/job-descriptions-cache.json`
- `career-ops/output/jobs-2026-05-01.xlsx`
- `career-ops/portals.yml`

Outputs:

- `career-ops/output/checkpoints/2026-05-01/baseline-retained-title-ledger.tsv`
- `career-ops/output/checkpoints/2026-05-01/pre-pipeline-candidates.tsv`
- `career-ops/output/checkpoints/2026-05-01/enrichment-ledger.tsv`
- `career-ops/output/checkpoints/2026-05-01/location-dealbreaker-ledger.tsv`
- `career-ops/output/checkpoints/2026-05-01/scoring-ledger.tsv`
- `career-ops/output/production-filter-refinement-review-2026-05-01.xlsx`
- `docs/audits/2026-05-03-production-filter-refinement-summary.json`

This script is offline and analysis/review oriented. It must not mutate
`pipeline.md`, `scan-history.tsv`, caches, tracker files, or baseline Excel.

Important limitation: the 2026-05-01 artifacts do not contain raw jobs that
were silently rejected at scrape-time title filtering. The offline baseline
ledger can reclassify retained scan-history/pipeline/Excel/JD-cache rows only.
Full raw title-pass/drop ledgers are available only for future gated scans that
capture raw inventory before filtering.

### 3.4 Gated Future Scan Skeleton

Add:

- `scripts/gated-full-scan-v1.mjs`
- `scripts/ats-adapters/direct-core-v1.mjs`

V1 skeleton behavior:

- `--dry-run` required by default unless `--allow-write` is explicitly passed;
- emits checkpoint ledgers;
- can run source discovery/raw inventory/title decisions without appending to
  pipeline;
- uses `direct-core-v1.mjs` for Greenhouse/Ashby/Lever direct ATS sources
  instead of `career-ops/scan.mjs`;
- does not become the default `npm run full-scan` path until approved.

This gives us a safe path for future production scans without making it the
default immediately.

## 4. Files To Modify

### 4.1 `career-ops/enrich-jobs.mjs`

Modify signal extraction only; do not change fetch behavior.

Changes:

- export or internally use richer compensation parser fields:
  - `comp_rate_type`: annual / hourly / unknown;
  - `comp_low_thousands`;
  - `comp_high_thousands`;
  - `comp_annualized_low_thousands`;
  - `comp_annualized_high_thousands`;
  - `comp_currency`;
  - `comp_confidence`;
- parse annual formats:
  - `$100K`, `$100k`, `$100,000`, `$100000`, `$207.2K`;
  - `USD 120,000`, `CAD 120k`, `CA$120,000`, `C$120,000`, `US$120,000`;
  - ranges with hyphen/en dash/em dash/`to`;
  - anchored salary/rate text;
- parse hourly formats:
  - `$60/hour`, `$60/hr`, `USD 60 per hour`, `$45-$75/hour`,
    `$45 to $75 hourly`;
  - annualize with 2,080 hours/year when full-time or not explicitly
    part-time/contract-limited;
- add structured YoE fields:
  - `yoe_required_min`;
  - `yoe_required_max`;
  - `yoe_signal`;
  - `yoe_confidence`;
  - `yoe_source_section`;
- improve YoE extraction so generic company-history numbers do not hard-drop
  a role.

### 4.2 `career-ops/test-enrich-signals.mjs`

Add/adjust tests for:

- `USD 120,000 - USD 160,000`;
- `CAD 115k to CAD 140k`;
- `CA$95,000 - CA$115,000`;
- `$60/hour` annualizes to about 125K;
- `$45-$75/hour` keeps via upper bound but annotates lower-bound risk;
- part-time hourly stays uncertain/review;
- numeric-only non-compensation is not treated as salary;
- 0-2, 3, 4, 5, and >5 YoE extraction;
- "team has 10+ years" does not become required YoE.

### 4.3 `career-ops/export-jobs.mjs`

Do not modify production behavior in the shadow/review phase.

After Will approves the review workbook and thresholds, modify scoring/drop
behavior.

Changes:

- remove `AE` from positive track scoring;
- replace old `TRACK_WEIGHTS` with new family-base values;
- use `scoreJob()` from shared rules or mirror it exactly with tests;
- hard-drop:
  - sales-role substance;
  - true location hard drops;
  - comp upper bound below $120K USD/CAD;
  - YoE required minimum >5;
  - intern/co-op;
  - executive/VP/director/head/chief;
  - PhD-required production-incompatible roles;
- keep but annotate:
  - genuine remote mixed with hybrid/on-site;
  - unknown compensation;
  - unknown currency;
  - Associate level;
  - 4-5 YoE penalties;
  - generic engineering validated by JD evidence.

Workbook column changes:

- add `Role Family`;
- add `Semantic Score`;
- add `Comp Decision`;
- add `Location Decision`;
- add `YoE Decision`;
- add `Hard Drop Reason` to review workbook, not production visible sheet;
- expand `Score Notes` with `why_kept` / `why_dropped` style explanations.

Before approval, these columns belong in
`production-filter-refinement-review-2026-05-01.xlsx`, not the production
`jobs-YYYY-MM-DD.xlsx`.

### 4.4 `career-ops/portals.yml`

Update config only after tests pass and Will approves the shadow review
workbook:

- remove `Associate` from hard-negative list;
- remove any remaining sales/AE positive track groups;
- add new positive families only if safe detector logic is active;
- avoid broad literal positives that would bypass guarded JD evidence.

Important: do not rely only on YAML positives for generic engineering. The
shared detector should own guarded candidate behavior.

### 4.5 `career-ops/modes/_profile.md` And `career-ops/config/profile.yml`

Update after behavior is approved and implemented:

- remove Account Executive as a target archetype;
- restore Associate as low-priority/reviewable;
- change Canadian hard floor to $120K CAD;
- document sales-role hard drop;
- document YoE rule;
- document Solutions/Deployment/Architect/FDE highest priority.

### 4.6 `scripts/ats-adapters/_lib.mjs` And `career-ops/firecrawl-extract.mjs`

Do not blindly replace pipeline append behavior in the first patch.

V1 path:

- add optional `--checkpoint-dir` / `--review-mode` support only if needed by
  `gated-full-scan-v1.mjs`;
- use shared detector for custom/gated scan path;
- write title decisions to ledger;
- avoid broad generic-engineering append to `pipeline.md`.

`career-ops/firecrawl-extract.mjs` is custom enough to update later if needed,
but direct changes should come after shared detector tests pass.

### 4.7 `career-ops/package.json`

Do not change `npm run full-scan` in V1 shadow phase.

After approval, add a separate command first, for example:

- `full-scan:gated`
- `full-scan:gated:dry-run`

Only replace `full-scan` after Will accepts the gated path.

## 5. Exact Scoring Proposal

Hard drops are applied before score.

### 5.1 Family Base

- `SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE`: `12`
- `AI_APPLIED_AGENT_ENGINEERING`: `10`
- `GENERIC_ENGINEERING_AI_EVIDENCE`: `9`
- `AI_PROGRAM_PRODUCT_STRATEGY_SPECIALIST_CONSULTANT`: `8`
- `AI_EVALUATION_TUTOR_RLHF`: `7`
- `CREATIVE_CONTENT_GENERATIVE_MEDIA_AI`: `5`
- `UNKNOWN_REVIEW`: `2`
- `SALES_AE`: no score; hard drop.

### 5.2 Company/Context

- company rank <= 50: `+4`
- rank <= 150: `+3`
- rank <= 300: `+2`
- rank > 300: `+1`
- preferred category: `+2`
- target company boost: `+2`
- multi-family validated fit: `+1`

### 5.3 Semantic Rubric

Maximum semantic score: `16`.

- `role_mission_fit`: 0-4.
  - 4: responsibilities directly match target family.
  - 3: clear adjacent fit with at least two target-work signals.
  - 2: plausible fit but generic wording.
  - 1: weak mention only.
  - 0: no evidence.
- `hands_on_build_fit`: 0-4.
  - 4: build/ship/deploy/implement/debug/own production systems.
  - 3: hands-on integration or prototyping with implementation ownership.
  - 2: technical collaboration but unclear ownership.
  - 1: tool usage only.
  - 0: no hands-on evidence.
- `ai_depth_fit`: 0-4.
  - 4: AI/LLM/model systems are central to job responsibilities.
  - 3: AI is a core product/workstream but responsibilities are mixed.
  - 2: AI appears as a meaningful feature/context.
  - 1: AI appears only in company/product branding.
  - 0: no AI evidence.
- `deployment_customer_fit`: 0-3.
  - 3: customer architecture, rollout, implementation, enterprise deployment.
  - 2: internal deployment/integration or technical advisory.
  - 1: customer/stakeholder collaboration without deployment ownership.
  - 0: no deployment/customer evidence.
- `founder_operator_fit`: 0-2.
  - 2: ambiguous ownership, cross-functional execution, product/program
    building, or customer discovery.
  - 1: some cross-functional collaboration.
  - 0: no evidence.
- `creative_ai_fit`: 0-2, capped so creative cannot dominate unless the
  family is creative/generative media.
  - 2: generative media tooling/workflows are technical production work.
  - 1: creative AI context with limited technical depth.
  - 0: no evidence.
- cap total semantic contribution at 16.

Sales-role risk is not a negative score. It is a hard-drop detector when
confidence is high.

Missing JD: semantic score should default to 0 with `semantic_confidence =
insufficient`, not infer fit from company/category alone.

Whole-document fallback can assign at most half of a dimension's max unless
the evidence phrase is explicit and unambiguous.

### 5.4 Location

- genuine remote eligible: `+3`
- remote mixed with hybrid/on-site: `+2` plus annotation;
- Toronto hybrid/on-site acceptable: `+2`
- ambiguous remote: `0` plus review annotation;
- true non-Toronto hybrid/on-site without remote: hard drop.

### 5.5 Compensation

Hard drop:

- USD upper bound below 120;
- CAD upper bound below 120.

Score:

- lower bound >= 180: `+5`
- lower bound >= 150: `+3`
- lower bound >= 130: `+2`
- lower bound >= 120: `+1`
- range crosses floor but lower < 120: `-2`
- unknown comp: `0` plus annotation;
- hourly uses annualized lower/upper values.

Compensation parser must collect all plausible candidates with snippets, rate
type, currency, and source section. Decision order:

1. prefer base salary / annual salary / base pay;
2. then hourly base rate if full-time confidence is strong;
3. do not use OTE, commission, equity, bonus, or total rewards for hard-drop
   floor decisions unless no base salary exists, and then mark review;
4. if multiple base ranges conflict, choose the most role-specific
   compensation block and mark `comp_confidence = moderate`.

Hourly safeguards:

- full-time hourly range entirely below floor: hard drop;
- full-time hourly range crosses floor: keep for review with
  `review_hourly_crosses_floor`;
- contract/part-time/temporary/unclear hourly: review unless upper bound is
  clearly below floor and the role is full-time-equivalent.

### 5.6 YoE / Level

- 0-2 years: `+4`
- 3 years: `0`
- 4 years: `-2`
- 5 years: `-3`
- >5 years required: hard drop
- `5+ years`: treat as 5-year minimum with `-3` and `yoe_open_ended = true`
  review annotation, unless wording explicitly says more than 5 or 6+.
- Associate title level: `-1` plus annotation unless already captured by YoE;
- Senior/Staff/Lead/Principal title: hard drop by default unless Will later
  creates a review exception.

### 5.7 Bands

Because the score range is wider, initial shadow bands are:

- `S >= 34`
- `A >= 24`
- `B >= 14`
- `C < 14`

These are not production defaults until calibrated. The offline refinement
audit must output:

- old score/band;
- new shadow score/band;
- score delta;
- band distribution;
- examples near thresholds;
- count of hard drops by reason;
- count of high old-score jobs demoted and low old-score jobs promoted.

Thresholds become production defaults only after Will approves the distribution.

## 6. Semantic Extraction Design

V1 section parsing is confidence-based, not perfect.

Algorithm:

1. Normalize Markdown/HTML text.
2. Split by headings and bullet blocks.
3. Map heading aliases:
   - responsibilities: `Responsibilities`, `What you'll do`, `The role`,
     `In this role`, `You will`;
   - requirements: `Requirements`, `Qualifications`, `About you`, `You have`,
     `We're looking for`;
   - compensation: `Compensation`, `Salary`, `Pay range`, `Base pay`, `Rate`;
   - location: `Location`, `Workplace`, `Remote`, `Office`;
   - benefits/about: lower-priority evidence.
4. If headings are absent, classify paragraphs by signals.
5. Extract semantic evidence from responsibilities/requirements first.
6. Use whole-document fallback only with lower confidence.

Hard-drop evidence should prefer high-confidence title/requirements/location/
compensation blocks. Weak whole-document evidence becomes review annotation.

### 6.1 Hard-Drop Confidence Rules

Automatic hard drops require `decision_confidence = strong`, except for
unambiguous title classes such as Account Executive, AE, Intern, VP, Director,
Head of, Chief, or explicit 6+ years minimum.

Moderate/weak evidence goes to review unless another independent strong signal
confirms the drop.

Examples:

- title `Enterprise Account Executive`: strong sales hard drop.
- JD says "carry quota" in responsibilities: strong sales hard drop.
- JD says "partner with sales": not a sales hard drop by itself.
- comp block says "Base salary $90K-$110K USD": strong comp hard drop.
- compensation appears only in benefits-like generic prose: review.
- "team has 10+ years experience": ignore for YoE hard drop.
- "requires 6+ years experience": strong YoE hard drop.

## 7. Test Plan

### 7.1 Rule Engine Tests

`node scripts/test-job-fit-rules.mjs`

Required tests:

- `RAG` does not match `Storage`.
- `Technical Account` does not match `Technical Accounting`.
- Account Executive / AE variants hard-drop.
- Sales Engineer / Pre-Sales hard-drop when sales evidence is present.
- Technical Account Manager is not hard-dropped from `Account` alone.
- Associate AI Engineer does not hard-drop and receives level annotation.
- Solutions Architect maps to highest family.
- Full Stack Engineer with LLM/RAG JD evidence maps to validated generic AI
  engineering.
- Full Stack Engineer without AI evidence does not pass as strong fit.
- Program Manager at AI-native company with AI program evidence maps to
  program/product family.
- AI Tutor / RLHF / evaluator maps to evaluation family.
- Content AI without technical/generative evidence stays low/review.

### 7.2 Enrichment Tests

`cd career-ops && node test-enrich-signals.mjs`

Add all compensation, hourly, and YoE fixtures listed in §4.2.

### 7.3 Audit/Workbook Tests

`node scripts/test-production-filter-refinement-audit.mjs`

Required tests:

- baseline `jobs-2026-05-01.xlsx` SHA unchanged;
- audit script writes all expected ledgers;
- review workbook sheet names deterministic;
- 150 visible hard-drop location candidates are classified;
- known seed URLs are present as regression rows or missing-root-cause rows;
- sales hard-drop rows include evidence;
- comp hard-drop rows use upper bound;
- hourly annualization is reflected in decisions;
- YoE >5 hard-drops;
- 0-2 YoE scores +4.
- title-filter ledger is labeled as baseline-retained only for 2026-05-01
  artifacts and does not claim historical raw rejects.

### 7.4 Existing Tests

Run:

- `node scripts\test-fullrun-calibration-workbook.mjs`
- `node scripts\test-job-fit-rules.mjs`
- `node scripts\test-jd-sections.mjs`
- `node scripts\test-production-filter-refinement-audit.mjs`
- from `career-ops`: `node test-enrich-signals.mjs`

If export logic is modified directly, add or update an export test before
claiming done.

## 8. Acceptance Criteria

- No changes to `career-ops/scan.mjs`.
- No changes to production `export-jobs.mjs`, `portals.yml`, profile docs, or
  `npm run full-scan` behavior in shadow phase.
- No live scraping required for V1 validation.
- Baseline `career-ops/output/jobs-2026-05-01.xlsx` SHA unchanged.
- Sales-role substance hard-drops before scoring.
- AE track removed from positive scoring.
- Associate no longer scrape-time hard negative.
- Solutions/Deployment/Architect/FDE has highest family base.
- Generic engineering roles require JD evidence.
- Comp hard-drop uses upper bound below $120K USD/CAD.
- Hourly rates parse and annualize.
- YoE >5 hard-drops; 0-2 scores +4.
- Remote + hybrid keeps with annotation, not hard drop.
- Non-Toronto hybrid/on-site without remote hard-drops.
- Every hard drop writes `hard_drop_reason` and evidence.
- Review workbook separates facts, derived decisions, and reviewer fields.
- Review workbook can contain hard-drop rows; production Pending Jobs excludes
  new hard drops only after Will approval.
- Tests listed in §7 pass.

## 9. Rollout Order

1. Add `scripts/lib/jd-sections.mjs` and tests.
2. Add `scripts/lib/job-fit-rules.mjs` and tests.
3. Add offline reclassification/review workbook script and tests.
4. Add custom direct-ATS wrapper skeleton for Greenhouse/Ashby/Lever gated
   scans, but keep it out of default `full-scan`.
5. Extend `career-ops/enrich-jobs.mjs` signal extraction and tests.
6. Generate offline review workbook for 2026-05-01 with old-vs-new score
   distribution.
7. Review score distribution and hard-drop examples with Will.
8. After Will approval, update `export-jobs.mjs` scoring/drop logic.
9. After Will approval, update `portals.yml`, `_profile.md`, and `profile.yml`
   to match implemented behavior.
10. Add `full-scan:gated` commands.
11. Only then decide whether to wire gated future scan path into default
   `npm run full-scan`.

## 10. Reviewer Checklist

The implementation-plan reviewer should specifically challenge:

- whether avoiding `scan.mjs` leaves an unacceptable direct-ATS gap;
- whether exact scoring integers are too aggressive or too compressed;
- whether hard drops require sufficiently high-confidence evidence;
- whether comp upper-bound hard drop has edge-case risks;
- whether hourly annualization can misclassify contract roles;
- whether section parsing can mistakenly use company-history YoE;
- whether workbook/ledger outputs are sufficient for Will review;
- whether any production output could change before review approval.

## 11. Reviewer Findings Incorporated

Lorentz's independent review changed the plan in these ways:

- resolved the direct-ATS gap by requiring a custom Greenhouse/Ashby/Lever
  gated wrapper rather than relying on legacy `scan.mjs`;
- renamed baseline title ledger to `baseline-retained-title-ledger.tsv` and
  clarified it cannot include historical raw title rejects;
- made the rollout shadow-first, so production exporter/config behavior does
  not change before Will approves the review workbook;
- required old-vs-new score distribution and threshold calibration before new
  bands become defaults;
- expanded deterministic semantic scoring rules for each dimension;
- required strong-confidence evidence for automatic hard drops;
- required multiple compensation candidates and base-salary selection;
- strengthened hourly annualization safeguards;
- clarified `5+ years` as 5-year minimum with -3/review annotation, while 6+
  or more-than-5 is hard drop.
