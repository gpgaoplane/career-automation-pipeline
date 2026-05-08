---
status: active
type: design-plan
owner: codex
last-updated: 2026-05-03T20:52:29-04:00
read-if: "you are changing title filters, role-family logic, location dealbreakers, scoring weights, or scan checkpoint ledgers after the 2026-05-01 full-run calibration review"
skip-if: "you only need the current implemented pipeline behavior; read docs/design/filter-pipeline-reference.md instead"
related:
  - docs/design/filter-pipeline-reference.md
  - docs/audits/2026-05-03-fullrun-calibration-summary.json
  - scripts/fullrun-calibration-workbook.mjs
  - career-ops/portals.yml
  - career-ops/modes/_profile.md
  - career-ops/config/profile.yml
  - career-ops/enrich-jobs.mjs
  - career-ops/export-jobs.mjs
  - career-ops/scan.mjs
  - career-ops/firecrawl-extract.mjs
  - scripts/ats-adapters/_lib.mjs
---

# Production Filter Refinement Design

## 1. Purpose

This design converts Will's post-calibration feedback into a production
filter/scoring redesign. It is a design artifact only: no production
filters, scoring code, cache files, tracker data, or baseline Excel outputs
are changed by this document.

The immediate problem is that the current pipeline is both too narrow and too
loose in different places:

- too narrow because many relevant AI/program/deployment/evaluation/generic
  engineering roles do not match the current phrase-only title filter;
- too loose because pure Account Executive roles entered scan history and had
  to be stripped later;
- too brittle because `RAG` matches `Storage`, `Technical Account` matches
  `Technical Accounting`, and `Associate` is currently a global negative;
- too location-risky because explicit non-Toronto hybrid/on-site jobs can
  remain visible if the existing dealbreaker detector misses them;
- too compensation-soft because the profile says below-threshold compensation
  should be skipped, but current export logic only applies compensation as a
  score adjustment and does not hard-drop low-compensation roles;
- too opaque because title-filter rejects and stage drops are not recorded in
  a way Will can sample before proceeding.

V1 production refinement should fix the decision logic while preserving the
2026-05-01 full-run workbook as the untouched baseline. Live/current-board
comparison remains a separate V1.1 diagnostic after this design and its
implementation plan are reviewed.

Reviewer refinement: Sagan reviewed the first draft on 2026-05-03 and flagged
five implementation-danger areas. This revision incorporates those critiques:
vendored-code boundaries, guarded-candidate data flow, structured location
schema, remote-region annotations, and concrete checkpoint ledger paths.

## 2. Current Baseline

Use these current facts as the design baseline:

- `docs/design/filter-pipeline-reference.md` describes current implemented
  behavior as of Phase 2.8 closure.
- 2026-05-01 full run: 1,671 scan-history rows, 956 pipeline rows, 613 visible
  Excel rows, 343 pipeline-to-Excel drops.
- One-time AE-only strip removed 715 pipeline rows after scan-history had
  already retained them.
- All 343 pipeline-to-Excel drops in the calibration workbook are explained by
  `deal_breaker_signal = hybrid_non_toronto`.
- Offline calibration found 150 visible hard-drop false-negative candidates
  and 14/14 sampled missing seed jobs explained.
- Current title filtering is substring-based in three enforcement sites:
  `career-ops/scan.mjs`, `scripts/ats-adapters/_lib.mjs`, and
  `career-ops/firecrawl-extract.mjs`.
- `career-ops/scan.mjs` is documented in `AI_AGENTS.md` as vendored upstream
  system-layer code. The implementation plan must not casually edit it. It
  must choose one of: explicit user-approved local-fork exception, wrapper
  orchestration that bypasses/augments the direct scanner, or a shared custom
  filter used only by non-upstream-custom paths with a documented limitation.
- Current `portals.yml` negatives include `Associate`; this design supersedes
  that policy and treats associate-level roles as low-priority/reviewable, not
  global hard drops.
- Current profile/config still includes Account Executive as a target
  archetype; this design supersedes that for production filtering.
- Current profile says U.S. roles below $120K USD should be skipped; Canadian
  compensation expectations are being corrected by this design to use a $120K
  CAD hard-drop floor. Current `export-jobs.mjs` does not hard-drop
  compensation. It adds a description-score delta against floor 120 for USD and
  110 for non-USD/CAD-like roles when compensation is detected.

## 3. Non-Goals

Do not include these in V1 implementation:

- live current-board scraping or all-company current-board comparison;
- automatic merging of missed current-board jobs into the 2026-05-01 baseline;
- tracker mutation or application-status changes;
- regenerated production application workbook before review gates pass;
- direct mutation of vendored upstream files without an explicit implementation
  decision and user approval;
- LLM-based role classification as the only decision source;
- broad relaxation that lets sales-role substance pass because of AI,
  technical, or customer-facing language. Sales roles are hard drops when the
  title or content shows the core job is selling, quota ownership, pipeline,
  prospecting, closing, renewals, or revenue generation.
- broad relaxation that lets generic content, generic design, or generic
  business operations pass without AI/technical evidence.

## 4. Target Role Families

The pipeline should classify roles into ordered families. Family assignment
should be evidence-bearing: exact phrase match, token-combination match, or
description-backed guarded match.

### 4.1 Highest Weight: Solutions / Deployment / Architect / FDE

This is the highest-priority family because it best matches Will's target path:
hands-on AI deployment, customer implementation, technical architecture, and
enterprise translation.

Examples:

- Solutions Architect
- AI Solutions Architect
- Solutions Engineer
- AI Solutions Engineer
- Deployment Engineer
- Forward Deployed Engineer
- Forward Deployed Strategist
- Deployment Strategist
- Field Engineer with AI/deployment evidence
- Customer Engineer with AI/deployment evidence
- AI Architect
- Enterprise Architect with AI/deployment evidence
- Implementation Engineer with AI/deployment evidence

Guardrails:

- Sales strategy or business strategy does not pass when the core role is
  revenue, territory, account ownership, quota, pipeline, closing, renewals, or
  GTM execution.
- Pure technical accounting does not pass through `Technical Account`.
- Solutions/architect roles in non-AI infrastructure can pass only with strong
  AI, data, ML, LLM, deployment, or platform evidence.
- Solutions roles must be separated from sales engineering / pre-sales roles:
  deployment, implementation, architecture, integration, and technical advisory
  can pass; quota-carrying sales, pipeline ownership, prospecting, closing, or
  revenue roles hard-drop.

### 4.2 High Weight: AI / Applied / Agent / Platform Engineering

This family covers explicit AI engineering and generic engineering roles that
become strong fits through AI evidence.

Examples:

- AI Engineer
- Applied AI Engineer
- Applied ML Engineer
- LLM Engineer
- Agent Engineer
- Agentic Engineer
- GenAI / Gen AI / Gen-AI Engineer
- AI Platform Engineer
- ML Platform Engineer
- Full Stack Engineer with strong AI evidence
- Product Engineer with strong AI evidence
- Platform Engineer with strong AI evidence
- Software Engineer with strong AI evidence
- AI Developer
- AI Software Engineer

Guardrails:

- Generic `Software Engineer`, `Full Stack Engineer`, `Platform Engineer`, or
  `Product Engineer` does not pass from title alone.
- These generic engineering titles enter a guarded candidate path only when
  company context or JD evidence shows strong AI relevance.
- Hardware, firmware, semiconductor, embedded, pure frontend/UI, and unrelated
  infrastructure remain negative unless the JD has exceptional AI evidence and
  is routed to manual review.

### 4.3 Medium-High Weight: AI Program, Product, Strategy, Specialist, Consultant

This family covers AI-native operational and translation roles that align with
Will's founder/operator background.

Examples:

- Technical Program Manager with AI-native context
- AI Program Manager
- AI Programs Analyst
- Product Operations Manager with AI-native context
- AI Product Manager
- Technical Product Manager with AI product context
- AI Strategist
- Solutions Strategist
- AI Specialist
- Technical Specialist with AI/deployment evidence
- AI Consultant
- Technical Consultant with AI/deployment evidence
- Implementation Consultant with AI/deployment evidence

Guardrails:

- Generic Program Manager, Product Operations Manager, Strategist, Specialist,
  or Consultant cannot pass alone.
- It must be at an AI-native company, in an AI/product/deployment department,
  or have JD evidence around AI systems, model evaluation, LLM workflows,
  deployment, customer implementation, or technical advisory.

### 4.4 Medium Weight: AI Evaluation / Tutor / Trainer / Human Feedback

This family captures xAI-style and model-quality roles that may be highly
aligned even when title language is not classic engineering.

Examples:

- AI Tutor
- AI Trainer
- Model Evaluator
- AI Evaluator
- RLHF Specialist
- Human Feedback Specialist
- Model Evaluation Analyst
- AI Data Specialist with model-evaluation evidence

Guardrails:

- Generic Data Analyst or Content Reviewer does not pass.
- The role must be about AI/model quality, evaluation, training data, RLHF,
  human feedback, or AI tutoring.

### 4.5 Lower But Valid: Creative / Content / Generative Media AI

This family remains relevant to Will's Dalamula background but should not
outrank engineering, deployment, architecture, or technical program roles.

Examples:

- Generative AI Engineer
- Creative Technologist
- Technical Artist
- AI Designer with technical/generative tooling evidence
- Generative Media Engineer
- AI Content Specialist with technical/generative evidence
- Video/Image Generation Specialist
- ComfyUI / diffusion / LoRA roles

Guardrails:

- Generic Designer, Content Writer, Producer, Marketing Manager, or Creative
  Producer does not pass alone.
- `content` is positive only when paired with AI/generative/model/media-tooling
  evidence.

### 4.6 Hard Drop / Negative Families

Drop these before scoring unless an implementation plan creates an explicit
manual-review exception:

- Sales-role substance is a hard drop. This includes titles and content whose
  core responsibility is selling, quota ownership, pipeline generation,
  prospecting, closing, renewals, territory/account ownership, revenue
  expansion, or GTM sales execution.
- Account Executive and AE variants are hard drops, including Account
  Executive, AE, Enterprise Account Executive, Strategic Account Executive,
  Commercial Account Executive, Sales Account Executive, Named Account
  Executive, Territory Account Executive, SMB/MM/Enterprise AE, and similar
  variants.
- Sales Engineer, Pre-Sales, Sales Consultant, Solutions Consultant, Account
  Manager, Customer Success Manager, Revenue, Business Development, Growth
  Sales, Partnerships Sales, and GTM roles should hard-drop when the title or
  content shows the role is primarily sales/revenue/account ownership.
- Account Manager variants only when the core evidence is quota sales,
  territory ownership, prospecting, renewals, or pipeline management. Do not
  hard-drop Technical Account Manager from the word `Account` alone; TAM-like
  roles must be classified by technical/deployment evidence vs quota-sales
  evidence.
- Technical AI language does not rescue a fundamentally sales role. If the
  role is sales first, drop it; if the role is ambiguous from title, use
  content signals to classify it before scoring.
- Intern/co-op roles.
- Executive/management roles: VP, Director, Head of, Chief, General Manager,
  Managing Director.
- Pure research scientist roles with no production/deployment path.
- Hardware/ASIC/chip/semiconductor/embedded/firmware roles.
- Pure marketing, HR, legal, accounting, admin, clinical, and unrelated
  support roles.

Associate is no longer a hard-drop family. It is a seniority/priority signal.

### 4.6.1 Territory Hard Drop (V7-A3)

V7 adds a territory filter that drops roles whose territory is non-NA (EMEA,
APAC, LATAM, India, Japan, etc.) when paired with a sales-track signal. The
goal is to suppress regional sales-coverage roles Will cannot meaningfully
target from Toronto, while preserving global-team AI Engineer roles that just
happen to mention multi-region presence.

**Region tokens.** The detector returns one of `NA` / `NON_NA` / `UNKNOWN`:

- **NA tokens (whitelist):** `north america`, `americas`, `naam`,
  `united states`, `usa`, `u.s.`, `america`, `canada`, `canadian`. Bare
  `us` is matched only when wrapped in parens or symmetric dash/comma
  delimiters (e.g. `(US)`, `, US,`). Bare `us` followed by a single space
  ("join us today") is NOT a match — that pattern false-positives on legal
  disclaimers and CTAs.
- **NON_NA tokens (blacklist):** `emea`, `europe`, `european`, `dach`,
  `iberia`, `nordics`, `mena`, `apac`, `asia`, `asia-pacific`,
  `southeast asia`, `india`, `japan`, `korea`, `china`, `singapore`,
  `hong kong`, `taiwan`, `australia`, `new zealand`, `africa`,
  `middle east`, `gulf`, `latam`, `latin america`, `lac`, `cala`, `brazil`,
  `argentina`, `anz`, `gcc`, `mexico`. Bare `eu` and `uk` only match with
  delimiters identical to the `us` rule. Mexico is non-NA only (sales
  territories Will doesn't target).
- **EXCLUDED (false-positive risk):** nationality adjectives `indian`,
  `japanese`, `korean`, `chinese` collide with language-proficiency
  mentions and "British Indian Ocean Territory" in country dropdowns.

**Detection precedence:**
1. **Title first.** Patterns like `(EMEA)`, `, India`, `for APAC` in the
   title win immediately. If title has both NA and non-NA tokens with
   equal counts, return UNKNOWN; otherwise the larger set wins.
2. **Section-targeted body check.** Only the `responsibilities` and
   `requirements` sections from `parseJdSections` are scanned. This guards
   against country-dropdown HTML, cookie banners, and footer boilerplate.
3. **UNKNOWN default when section detection fails.** If `parseJdSections`
   returns no recognized role-content sections, the detector returns
   UNKNOWN and never scans whole-body. This is the critical guard against
   the V6 `commercial_ownership` false-positive shape ("British Indian
   Ocean Territory" in the country dropdown).

**Hard-drop gate.** Fires on:
`(territory.region === "NON_NA")` AND
`(has_hard_sales_title || sales_role_signal_present)`

where `sales_role_signal_present = classifySalesRole(...).hard_drop === true`
OR `classifySalesRole(...).evidence.length > 0`. The gate does NOT fire
when:
- territory is UNKNOWN (default-safe)
- territory is NON_NA but the role is purely engineering with no sales
  evidence (preserves global-team AI Engineer / FDE roles)

The new `hard_drop_reason` token is `non_na_territory_with_sales_context`.
This token does NOT contain `sales_role`, so territory drops are tracked
in a separate metric (`territory_hard_drops`), not under
`sales_hard_drops`.

**Interaction with sales rules.** Territory is an additional filter, not a
replacement. A role can drop on both `sales_role_content` and
`non_na_territory_with_sales_context` — both reasons appear in the joined
`hard_drop_reason` string. *Renamed in V8 to `non_na_territory` — see §4.6.2.*

### 4.6.2 Strict-NA Territory Hard Drop (V8-A1)

V8 narrows V7's policy further per Will's 2026-05-06 directive: **any role
whose territory resolves to NON_NA drops, regardless of sales-context.** Will
is Toronto-based and only takes NA-market roles; even pure-engineering or FDE
roles rooted in regional non-NA markets (Cohere Singapore, Mistral Paris,
Palantir Europe, H2O APAC) drop.

**Changes vs V7:**

1. **Reason renamed** from `non_na_territory_with_sales_context` to the
   simpler `non_na_territory`. Affects `hard_drop_reason` strings, the
   `validHardDropReasons` enum, fixtures, and the V7→V8 diff classifier.
2. **Gate clause dropped**: now fires on `territory.region === "NON_NA"`
   alone — no AND with sales evidence.
3. **`SECTION_ALIASES` extended** in `scripts/lib/jd-sections.mjs` so role
   content sections named "Your Impact", "Day-to-Day", "About this Role",
   "Job Details", "The Position", "Your Mission", and "What You'll Drive"
   feed the responsibilities canonical type. "Where you'll work" feeds
   location.
4. **`recognizedTypes` extended** in `detectTerritory` to include `location`
   so dedicated Location section bodies (and "Where you'll work" aliases)
   are scanned for territory tokens — V7 dead-text'd these.
5. **NON_NA token list expanded** with 13 countries (vietnam, philippines,
   thailand, indonesia, malaysia, pakistan, egypt, south africa, qatar,
   bahrain, peru, chile, colombia) and major non-NA cities (london, paris,
   berlin, munich, madrid, barcelona, dublin, amsterdam, tel aviv, sydney,
   melbourne, tokyo, osaka, seoul, beijing, shanghai, bangalore, mumbai,
   delhi, lisbon). Major NA cities also added (toronto, nyc, sf, etc.) for
   symmetric resolution.
6. **Role-anchor pattern layer added** (additive — high-confidence shape
   evidence). Patterns include `\bbased\s+(?:in|out\s+of)\s+...`,
   `\blocated\s+in\s+...`, `\boffice:?\s+...`, `\bopen\s+to\s+candidates?\s+in\s+...`,
   plus dedicated `^\s*location:?\s+...` line headers. Each captured region
   string is tokenized on `[,/;]|\s+\bor\b\s+|\s+\band\b\s+|\s-\s` and each
   token is classified NA / NON_NA / neither.
7. **Body-tie disambiguation** — when a recognized section contains both NA
   and NON_NA evidence, behaviour depends on whether any role-anchor fired:
   - **Anchor fired:** count distinct anchor-classified tokens. NA majority
     or tie → NA (default-permissive); NON_NA majority → NON_NA. This makes
     "Open to candidates in Toronto, NYC, or London" → NA (2 NA + 1 NON_NA).
   - **No anchor fired:** fall back to V7's UNKNOWN-on-tie behavior.
     Preserves "global team distributed across EMEA, APAC, Americas" →
     UNKNOWN (company-context, not role base).

**Predicted vs actual cohort impact.** The plan predicted ~16-25 territory
drops; actual V8 measurement = **101**. Plan undercounted because it didn't
account for V7 already having 37 NON_NA-detected rows (only 7 dropped under
V7's gate-with-sales-evidence rule), the city/country list expansion, and
adding `location` to recognized types. Sample-verified all 101 V8 territory
drops are genuinely non-NA roles per Will's strict-NA policy.

## 5. Title Matching Redesign

Replace substring-only matching with named detectors. A detector should return
both a decision and evidence fields that can be written to a checkpoint ledger.

### 5.1 Detector Decision Types

- `strong_pass`: title is sufficient to pass to enrichment.
- `guarded_candidate`: title is plausible but requires company/JD/context AI
  evidence before final pass.
- `review_candidate`: title has mixed evidence or weak but interesting context.
- `hard_reject`: title matches a hard negative family.
- `reject`: title lacks positive evidence after safe matching.

Each decision should include `confidence`: `strong`, `moderate`, `weak`, or
`insufficient`, plus `why_kept` / `why_dropped` fields for ledgers.

Sales-role detector precedence: run sales-role hard-drop detection before
positive family boosting. A role should not be rescued by terms like `AI`,
`technical`, `solutions`, `enterprise`, or `customer` if the title/content
identifies it as a sales job.

### 5.2 Safe Phrase Matching

Use normalized word/phrase matching instead of arbitrary substring matching.

Required bug fixes:

- `RAG` must match standalone acronym/phrase forms only, not `Storage`.
- `Technical Account` must not match `Technical Accounting`.
- `AI` must not match arbitrary words containing `ai`.
- `PM` must not match unrelated word fragments.

### 5.3 Token-Combination Matching

Support flexible word order. For example, `AI Solution Generative Engineer`
should match because it contains AI/generative + solution + engineer tokens
even if no exact phrase exists.

Token groups:

- AI tokens: `AI`, `ML`, `LLM`, `GenAI`, `Gen AI`, `Gen-AI`, `generative`,
  `agent`, `agentic`, `model`, `multimodal`, `RAG`, `applied`.
- Engineering tokens: `engineer`, `developer`, `architect`, `platform`,
  `infrastructure`, `systems`, `full stack`, `software`, `product engineer`.
- Deployment tokens: `solution`, `solutions`, `deployment`, `implementation`,
  `forward deployed`, `field`, `customer engineer`.
- Product/program tokens: `product`, `program`, `operations`, `technical
  program`, `product operations`.
- Strategy/advisory tokens: `strategist`, `strategy`, `consultant`,
  `specialist`, `advisor`, `advisory`.
- Evaluation tokens: `tutor`, `trainer`, `evaluator`, `evaluation`, `RLHF`,
  `human feedback`, `annotation`.
- Creative/content tokens: `creative technologist`, `technical artist`,
  `content`, `media`, `image`, `video`, `diffusion`, `LoRA`, `ComfyUI`.

### 5.4 Associate Handling

Associate should be allowed back as a lower-priority level signal.

Rules:

- Do not include `Associate` as a scrape-time hard negative.
- Use word-boundary seniority detection. Do not accidentally reject
  `associated`, `association`, or other unrelated variants.
- Emit `level_signal = associate` when the word-boundary seniority match is
  present.
- Apply a modest score/priority reduction when the role is truly associate
  level, unless the role is otherwise a strong technical fit.
- Keep `Associate Engineer`, `Associate AI Engineer`, `Associate Solutions
  Engineer`, and similar roles eligible for review/scoring.
- Continue to drop unrelated associate business/sales/admin roles through role
  family and discipline detectors.

### 5.5 Generic Engineering Guard

Generic engineering titles can pass only through a guarded path.

Generic titles include:

- Software Engineer
- Full Stack Engineer
- Platform Engineer
- Product Engineer
- Systems Engineer
- Infrastructure Engineer
- Solutions Engineer if no AI/deployment context is visible in title

Required evidence to upgrade from `guarded_candidate` to pass:

- AI-native company category or target-company override AND at least one of:
  department/title AI hint, source category AI hint, or JD AI evidence;
- title/department contains AI/ML/LLM/data/model/platform/agent/generative;
- JD contains strong AI evidence: LLMs, agents, RAG, model APIs, model
  evaluation, inference, fine-tuning, embeddings, vector databases,
  multimodal, prompt systems, AI workflows, ML platform, production AI.

If JD is missing, keep as review candidate rather than silently passing as safe.

### 5.6 Guarded Candidate Data Flow

Current enrichment runs after jobs enter `pipeline.md`, so guarded generic
engineering cannot depend on JD evidence unless the data flow changes. V1
implementation must choose an explicit path:

1. `pre_pipeline_candidates`: write guarded raw jobs to a separate ledger/enrich
   queue, fetch descriptions, then promote only validated jobs into
   `pipeline.md`.
2. `pipeline_review_status`: allow guarded jobs into `pipeline.md` with a
   non-final status and block export unless JD evidence upgrades them.
3. `two-pass scan`: scan raw inventory into ledgers first, run enrichment on
   selected candidates, then build the production pipeline from validated rows.

Preferred design direction: option 1 or 3. Avoid silently adding broad generic
engineering rows to normal `pipeline.md` without a review/export guard.

### 5.7 Centralized Filter Semantics

The three existing title-filter copies should not be patched differently.
Implementation should centralize detector semantics in one custom helper or
test fixture and have each allowed enforcement path call it. If `scan.mjs`
cannot be edited because of the vendored-code rule, the implementation plan
must document the remaining behavior gap or route direct ATS scanning through a
custom wrapper.

## 6. Description Evidence Layer

The description layer should rescue promising but non-obvious titles and
demote false positives. It should output structured evidence, not just a score.

Evidence categories:

- `ai_evidence_strength`: none / weak / moderate / strong.
- `deployment_evidence`: customer implementation, integration, rollout,
  enterprise deployment, technical advisory, solution design.
- `engineering_evidence`: building systems, APIs, production services,
  platform, infra, full-stack implementation.
- `evaluation_evidence`: RLHF, human feedback, model evaluation, grading,
  training data, tutor/evaluator work.
- `creative_ai_evidence`: generative media, image/video generation, diffusion,
  LoRA, ComfyUI, creative tooling.
- `sales_role_evidence`: AE/account executive variants, sales engineering,
  pre-sales, quota, prospecting, territory/account ownership, pipeline,
  closing, renewal, revenue expansion, GTM sales execution, commission language,
  or CRM ownership where the role is fundamentally sales.

Description/content filtering should catch sales roles that are not obvious
from title alone. If title detection is ambiguous but the JD shows sales-role
substance, emit a sales hard-drop signal before scoring.

The layer should be deterministic in V1. LLM-based classification/review is
out of scope for the immediate production-filter implementation plan.

### 6.1 Semantic Fit Evaluation

The current description score is mostly keyword-counting. That can under-rank
jobs whose descriptions are genuinely strong fits but do not repeat exact
keywords often enough. V1 should add a semantic evidence rubric that produces
structured, inspectable sub-scores.

Recommended semantic dimensions:

- `role_mission_fit`: does the role's actual work match Will's target path?
- `hands_on_build_fit`: does the JD involve building, deploying, integrating,
  prototyping, debugging, or shipping systems?
- `ai_depth_fit`: is AI central to the product/work, or merely mentioned?
- `deployment_customer_fit`: does it involve implementation, solutions,
  customer architecture, rollout, technical advisory, or enterprise adoption?
- `founder_operator_fit`: does it value ambiguous problem-solving, cross-
  functional ownership, customer discovery, or product/program execution?
- `creative_ai_fit`: does it use generative media/creative tooling in a
  technical production context?
- `sales_role_risk`: does the JD show sales-role substance that should hard
  drop before scoring?
- `seniority_fit`: 0-2 / 3 / 4 / 5 / >5 / associate /
  senior-staff-exec.

Each dimension should include:

- `score`: numeric sub-score.
- `confidence`: strong / moderate / weak / insufficient.
- `evidence`: short source snippets or normalized matched evidence.
- `reason`: one concise explanation.

V1 should use deterministic pattern/rubric scoring only. LLM semantic review
is deferred and should not appear as an implementation-plan dependency.

### 6.2 Future Data Architecture: SQL + Semantic/RAG Layer

The immediate V1 implementation should not be blocked on a database or RAG
rewrite, but the design should preserve a clean path toward a hybrid
architecture.

Recommended long-term model:

- SQL/relational storage is the source of truth for companies, scan runs, raw
  jobs, canonical job IDs, stage decisions, hard-drop reasons, score
  components, reviewer decisions, and audit trails.
- JSON/JSONB fields preserve messy ATS-specific payloads without losing
  structure.
- A vector/RAG layer stores JD sections/chunks and retrieves evidence for
  semantic rubric dimensions such as hands-on build fit, AI depth, deployment
  fit, sales-role risk, and seniority evidence.
- The scoring engine remains deterministic and auditable: hard-drop gates,
  compensation math, YoE gates, location decisions, and final score components
  should live in structured tables/ledgers, not only in embeddings.
- The review workbook remains the human-facing calibration layer.

What each layer is good at:

- SQL: exact filtering, reconciliation, deduplication, run-to-run deltas,
  hard-drop explainability, reviewer decisions, repeatable scoring, and
  answering "why did this job move/drop?"
- RAG/vector retrieval: finding semantically relevant JD snippets inside messy
  descriptions and supporting rubric evidence for broad questions such as
  "is AI central?" or "is this sales disguised as solutions?"

Tradeoff:

- Pure flat files are simple and good for V1, but harder to query and audit as
  volume grows.
- Pure RAG is not acceptable for hard-drop logic because it is harder to make
  deterministic and can miss exact numeric/legal/location constraints.
- Pure SQL without semantic retrieval can still under-rank good roles whose
  fit is evident only from nuanced JD language.
- Hybrid SQL + vector/RAG is the best long-term direction, ideally after V1
  ledgers clarify the schema. A practical path is V1 flat-file ledgers, V2
  SQLite/Postgres audit database, and V3 vector/RAG semantic evidence.

## 7. Location And Remote Dealbreakers

Will's corrected rule:

- If a posting provides a genuine remote work option, keep and annotate, even
  if hybrid/on-site options are also listed.
- If the job is non-Toronto hybrid/on-site and no genuine remote work option
  exists, hard drop.
- If the wording is unclear but appears to include a real remote component,
  keep or review with annotation rather than treating it as a clean remote job.
- Fake remote contexts do not count: remote cloud, remote control, remote
  sensing, remote procedure, remote device, remote access, etc.

### 7.1 Location Decision Labels

- `location_keep_remote`: genuine remote option found.
- `location_keep_remote_us_only`: U.S.-only remote option found; keep per
  current Will direction, but annotate separately for review.
- `location_keep_remote_north_america`: North America remote option found.
- `location_keep_remote_canada_ok`: Canada or Canada-eligible remote option
  found.
- `location_keep_remote_global`: global or work-from-anywhere remote found.
- `location_keep_toronto`: Toronto remote/hybrid/on-site acceptable under
  profile rules.
- `location_keep_remote_mixed`: genuine remote option plus hybrid/on-site
  wording exists; keep but annotate.
- `location_review_ambiguous_remote`: possible remote-work signal but wording
  is ambiguous.
- `location_review_missing_description`: not enough JD/location evidence.
- `location_hard_drop_non_toronto_hybrid`.
- `location_hard_drop_non_toronto_onsite`.
- `location_hard_drop_office_required_non_toronto`.

### 7.2 Required Location Schema

Current production stores a scalar `deal_breaker_signal` and `export-jobs.mjs`
drops any truthy value. That is too coarse for mixed remote/hybrid cases.

V1 should introduce structured fields:

- `location_decision`: one of the labels above.
- `location_confidence`: strong / moderate / weak / insufficient.
- `location_annotations`: array of non-dropping signals such as
  `remote_mixed_with_hybrid`, `sponsorship_note_present`, `remote_us_only`,
  `office_language_present`.
- `hard_drop_reason`: null unless the location decision is a true hard drop.
- `deal_breaker_signal`: reserved for true hard-drop reasons only, or replaced
  in export logic by `hard_drop_reason`.

This preserves evidence without causing every annotation to remove a job.

### 7.3 Sponsorship

`no_sponsorship_remote` should not be a production hard drop for genuinely
remote roles. Sponsorship can be stored as an annotation but should not remove
a job that Will can do remotely from Toronto without U.S. work authorization.

### 7.4 Edge Cases

- `Remote, Hybrid - San Francisco`: keep + annotate as
  `location_keep_remote_mixed`.
- `Remote - US`: keep, unless the JD contradicts it with a required office
  presence and no remote option.
- `Hybrid - San Francisco`: hard drop unless a genuine remote option is also
  stated.
- `On-site - New York`: hard drop.
- `Hybrid cloud engineer`: do not treat `hybrid` as work-mode evidence.
- `Remote control systems engineer`: do not treat `remote` as work-mode
  evidence.

## 8. Scoring And Priority

Scoring should rank strong fits above merely keyword-matching jobs. A future
implementation plan should update `career-ops/export-jobs.mjs` only after this
design is reviewed.

### 8.1 Compensation Hard Drops

Compensation must remain a content-layer decision, because reliable
compensation usually appears in the JD body rather than the title.

Refined production policy:

- U.S. roles with detected compensation upper bound below $120K USD should
  hard-drop.
- Canadian roles with detected compensation upper bound below $120K CAD should
  hard-drop.
- If a range crosses the floor, keep but annotate and penalize based on the
  lower bound. Example: $100K-$140K USD is not a hard drop because the upper
  bound clears $120K, but it should be lower priority than $140K-$180K USD.
- Canadian roles at $120K-$130K CAD are acceptable/normal.
- Canadian roles at $130K+ CAD receive a positive compensation signal.
- Unknown or missing compensation should not hard-drop. It should receive a
  `comp_unknown` annotation and be scored conservatively.
- Unknown currency should not hard-drop unless the location/currency evidence
  can be resolved confidently.
- If a posting includes base salary and OTE/commission, prefer base salary for
  non-sales roles; sales-role jobs should already hard-drop before
  compensation scoring.
- Hourly rates should be normalized into a full-time-equivalent annual value
  using 2,080 hours/year when the role appears full-time. Use the hourly upper
  bound for hard-drop decisions and the hourly lower bound for penalty/boost.
  If the work is explicitly part-time, contract-limited, or unclear, annotate
  `comp_hourly_uncertain` and send to review rather than pretending it is a
  clean salary equivalent.
- Hourly floor equivalents are about $57.70/hour USD and $57.70/hour CAD
  when using $120K / 2,080 hours.
- Compensation hard-drop must be separate from location hard-drop and
  sales-role hard-drop, but all three should write structured reasons.

Parsing requirements:

- Continue supporting `$100K`, `$100k`, `$100,000`, `$100000`, decimal-K forms
  such as `$207.2K`, and ranges using hyphen/en dash/em dash/`to`.
- Support currency-before-number formats such as `USD 120,000`,
  `CAD 120k`, `C$120,000`, `CA$120,000`, and `US$120,000`.
- Support anchored text: compensation, salary range, base salary, total
  compensation, pay range, pay band, base pay, annual salary, estimated annual
  salary, rate, hourly rate.
- Support hourly formats such as `$60/hour`, `$60/hr`, `USD 60 per hour`,
  `$45-$75/hour`, and `$45 to $75 hourly`.
- Avoid treating non-compensation numbers as salary. When numbers appear
  without currency or salary/rate context, classify as `comp_weak_numeric`
  rather than making hard-drop decisions.

Recommended structured fields:

- `comp_decision`: `comp_keep`, `comp_keep_low_cad_review`,
  `comp_hard_drop_below_usd_floor`, `comp_hard_drop_below_cad_floor`,
  `comp_unknown`, `comp_unknown_currency`.
- `comp_confidence`: strong / moderate / weak / insufficient.
- `comp_low_thousands`, `comp_high_thousands`, `comp_currency`: preserve
  current extracted values.
- `comp_rate_type`: annual / hourly / unknown.
- `comp_annualized_low_thousands`, `comp_annualized_high_thousands`: populated
  for hourly rates when annualization is reasonable.
- `hard_drop_reason`: can include compensation reasons when the decision is a
  true hard drop.

This is a strengthening of current implemented behavior, not a weakening.
Current code penalizes low compensation but does not remove it.

### 8.2 Track Weights

Yes, track weights must change to match the broadened/refined scope. Keeping
the old weights would undermine the new role-family design because `SA` is
currently lower than `AI-ENG` and `GEN-AI`, while AE still exists as a track.

Recommended base-family ordering:

1. Solutions / Deployment / Architect / FDE.
2. AI / Applied / Agent / Platform Engineering.
3. AI Program / Product / Strategy / Specialist / Consultant.
4. AI Evaluation / Tutor / Trainer / Human Feedback.
5. Creative / Content / Generative Media AI.

Recommended new conceptual weights should move beyond the old compressed
3-to-5 track range. Exact integers belong in the implementation plan, but the
design target is a wider family-base range so family fit is visible and
auditable:

- `SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE`: about 12.
- `AI_APPLIED_AGENT_ENGINEERING`: about 10.
- `GENERIC_ENGINEERING_AI_EVIDENCE`: about 9 only after JD evidence validates
  it.
- `AI_PROGRAM_PRODUCT_STRATEGY_SPECIALIST_CONSULTANT`: about 8.
- `AI_EVALUATION_TUTOR_RLHF`: about 7.
- `CREATIVE_CONTENT_GENERATIVE_MEDIA_AI`: about 5-6 unless strongly technical.
- `SALES_AE`: removed as a positive track; sales-role substance hard-drops.

The implementation plan should decide exact integers, but the ranking
relationship is non-negotiable: solutions/deployment/architect/FDE should be
highest, and sales should not have a positive track weight.

Additional score principles:

- AE-only should be dropped before scoring.
- Sales-role substance should be dropped before scoring even when the role also
  mentions AI, technical discovery, customer conversations, or solutions.
- Associate-level should reduce priority, not eliminate the job.
- Current `TRACK_WEIGHTS` has `SA: 4` below `AI-ENG: 5` and `GEN-AI: 5`; V1
  scoring must explicitly invert that relationship so solutions/deployment/
  architect/FDE receives the highest base weight.
- Senior/Principal/Staff/Lead should remain penalties or review labels, but
  the implementation plan should decide whether they are hard drops or score
  penalties by family.
- Strong AI/deployment description evidence should lift generic engineering
  titles.
- Pure creative/content roles should need AI/technical evidence and should not
  outrank engineering/deployment roles by title alone.
- Missing JD evidence should lower confidence and trigger review where needed.
- YoE scoring should be corrected:
  - 0-2 years: +4.
  - 3 years: 0.
  - 4 years: -2.
  - 5 years: -3.
  - more than 5 years: hard drop.
  - If multiple YoE ranges appear, use the strongest required/minimum
    experience signal for the actual candidate requirement, not generic company
    prose.
- The implementation should update `career-ops/modes/_profile.md` and
  `career-ops/config/profile.yml` after behavior changes, because they
  currently still describe Associate as scrape-excluded and Account Executive
  as a target archetype.

## 9. Checkpoint Ledgers And Manual Gates

Future full scans should preserve both pass and drop paths at each major
decision stage. The goal is explainability and manual sampling before the next
stage proceeds.

Default output directory:

- `career-ops/output/checkpoints/<run-date>/`

Recommended ledgers:

1. `source-discovery-ledger.tsv`: enabled company, source status, ATS route,
   discovery outcome, failure class.
2. `raw-inventory-ledger.tsv`: company, raw job count, source, raw title/location,
   URL, retrieval status.
3. `title-filter-ledger.tsv`: every raw job with detector decision, matched
   positives, matched negatives, family candidates, reject reason.
4. `pre-pipeline-candidates.tsv`: guarded candidates that need JD evidence
   before promotion.
5. `enrichment-ledger.tsv`: description fetch status, cache hit/miss, fetch tier,
   extracted evidence coverage.
6. `location-dealbreaker-ledger.tsv`: remote/location decision label, evidence
   snippets, hard-drop/review/keep result.
7. `scoring-ledger.tsv`: family, score components, band, warnings, confidence.
8. `final-review-workbook.xlsx`: human-visible workbook with candidates, drops,
   ambiguous cases, newly admitted generic-engineering roles, and sampled
   rejects.

The review workbook is not the production application Excel. It exists to let
Will approve or tune the rules before a production workbook is generated.

Manual gate principle:

- For normal production scans, each stage should be able to stop after writing
  its ledger.
- Will can inspect samples before the next stage mutates downstream artifacts.
- The implementation plan should introduce this as dry-run/review mode first,
  then decide whether to make it the default full-scan behavior.
- Existing `npm run full-scan` should not remain the only path if it can still
  mutate downstream artifacts without emitting ledgers and stopping at gates.

## 10. Seed And Regression Coverage

The implementation plan should turn these into deterministic tests or fixtures:

- user-supplied Surge AI examples, including Program Manager, Generative AI
  Generalist, AI Programs Analyst, Product Operations Manager, and Technical
  Program Manager;
- user-supplied ElevenLabs examples;
- user-supplied xAI tutor/evaluator examples;
- user-supplied Atlassian Solutions Architect example;
- `RAG` vs `Storage`;
- `Technical Account` vs `Technical Accounting`;
- `Associate AI Engineer` should not hard-drop;
- AE-only roles should hard-drop;
- sales-role variants should hard-drop even with AI/technical wording when the
  role is fundamentally sales;
- Technical Account Manager should not hard-drop from the word `Account` alone;
  it should be decided by technical/deployment vs sales-role evidence;
- `Remote, Hybrid - San Francisco` should keep + annotate;
- `Remote - US` should keep;
- non-Toronto hybrid/on-site without remote should hard-drop;
- fake remote and fake hybrid technical contexts should not trigger
  work-mode decisions;
- generic Full Stack / Platform / Software Engineer should pass only with
  strong AI evidence.

These should be offline fixtures. V1 should not depend on live URL contents for
regression tests.

## 11. What To Keep, Drop, Or Defer From Earlier Conversations

### Keep For V1

- Production location/dealbreaker redesign using the corrected remote-option
  policy.
- Removal of AE-only positive path.
- Hard-drop sales-role substance before scoring, including AE variants,
  sales/account/revenue/GTM roles, and title-ambiguous roles whose JD content
  proves the core job is selling.
- Associate as low-priority/reviewable rather than hard negative.
- Solutions/deployment/architect/FDE as highest weight.
- Guarded generic engineering lane.
- AI program/product/strategy/specialist/consultant family.
- AI evaluation/tutor/RLHF/human-feedback family.
- Creative/content/generative media family as lower but valid.
- False-positive matcher fixes.
- Stage checkpoint ledgers and review workbook design.
- Regression tests seeded by the user-supplied missed jobs.
- Structured location schema that separates annotations from hard drops.
- Explicit data-flow decision for guarded generic engineering candidates.
- Implementation boundary decision for vendored `career-ops/scan.mjs`.

### Already Done / Do Not Redo

- Offline calibration workbook V1.
- Risk-audit sheets and summary JSON.
- Full-run stage reconciliation for 2026-05-01.
- Seed-root-cause explainability for the supplied examples.
- Company coverage baseline in the offline workbook.

### Defer To V1.1 Or Later

- Live current-board comparison.
- Broad all-enabled-company live re-scan.
- Source-repair diagnostics for all missing current-board jobs.
- LLM role classifier.
- Automatic tracker additions or applications workflow.

## 12. Reviewer Findings Incorporated

Sagan's independent review materially changed the design in these ways:

- Added a vendored-code boundary: implementation cannot casually edit
  `career-ops/scan.mjs`.
- Added an explicit guarded-candidate data-flow decision so generic engineering
  roles do not pollute `pipeline.md` without export gates.
- Replaced scalar location thinking with a structured location schema that
  separates `hard_drop_reason` from annotations.
- Split remote labels into U.S.-only, North America, Canada-eligible, and
  global remote categories.
- Added concrete checkpoint artifact paths and a distinct review workbook.
- Tightened Associate detection to word-boundary seniority signals.
- Tightened AE/Account Manager handling so Technical Account Manager is not
  dropped from the word `Account` alone.
- Required offline regression fixtures rather than live URL tests.

## 13. Review Process

Recommended process:

1. Draft this design plan.
2. Have an independent agent critically review it.
3. Refine this design plan from that critique.
4. With Will's approval, draft a concrete implementation plan listing exact
   files, test fixtures, commands, and acceptance criteria.
5. Have another independent agent review the implementation plan.
6. Refine the implementation plan.
7. Implement production code/config/test changes.
8. Run offline validation and regenerate a review workbook.
9. Will reviews the workbook before any production application output is
   treated as final.

## 14. Open Questions For Implementation Planning

- Should Senior/Staff/Lead remain scrape-time negatives, or should they become
  score/review penalties like Associate? Current user correction was specific
  to Associate.
- Should generic engineering guarded candidates require JD fetch before entering
  `pipeline.md`, enter a separate pre-pipeline candidate queue, or use a
  two-pass scan? This design prefers pre-pipeline or two-pass.
- Should checkpoint ledgers be TSV/JSONL only, or should they also produce an
  Excel review workbook at every stage?
- Should the existing three title-filter copies be replaced by a shared helper
  module in V1, even though one copy lives under vendored `career-ops/` code?
- What is the exact score penalty for associate-level roles: small fixed
  penalty, lower default band, review label only, or family-dependent penalty?
- Should `Remote - US` remain automatically eligible long-term, or should it be
  kept but assigned a distinct review annotation because some companies may
  intend U.S.-resident remote only?
