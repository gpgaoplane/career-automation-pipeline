---
status: active
type: audit
owner: codex
last-updated: 2026-05-03T00:15:38-04:00
read-if: "you are diagnosing missing or under-ranked jobs from the 2026-05-01 full-scale scan"
skip-if: "you only need Phase 2.8 acceptance status"
related:
  - career-ops/data/scan-history.tsv
  - career-ops/data/pipeline.md
  - career-ops/data/job-descriptions-cache.json
  - career-ops/output/jobs-2026-05-01.xlsx
  - docs/audits/2026-05-01-fullrun-classification.md
  - docs/audits/2026-05-01-fullrun-metrics.json
  - docs/design/filter-pipeline-reference.md
---

# Full-Run Missing Jobs Diagnostic — Seed Set 1

This audit is scoped to the **2026-05-01 full-scale Phase 2.8 run**.
It uses Will's Surge AI, ElevenLabs, xAI, and Atlassian examples as seed
cases, then looks for broader filter/scoring patterns in the full-run
artifacts.

## Evidence Boundary

Authoritative full-run artifacts:

| Artifact | Count / role |
|---|---:|
| `career-ops/data/scan-history.tsv` rows with `first_seen=2026-05-01` | 1,671 retained scan-history rows |
| `career-ops/data/pipeline.md` | 956 pending rows after post-processing |
| `career-ops/output/jobs-2026-05-01.xlsx` | 613 visible Excel rows / 586 unique URLs |
| `docs/audits/2026-05-01-fullrun-metrics.json` | 956 pending jobs, 385/393 source resolved, 213/213 misses classified |
| `docs/audits/2026-05-01-fullrun-classification.md` | company no-yield buckets |

Important: `scan-history.tsv` is **not raw job-board inventory**. It
only proves a job was retained by a scanner/adapter path. Jobs rejected
by title filters before append may be invisible unless the run logs or a
current-board comparison expose them. Any live URL/page content below is
therefore labeled `current-board comparison`, not proof that the posting
existed on 2026-05-01.

## Seed URL Traces

| Company | Seed role | Full-run status | Current title-filter result | Diagnosis |
|---|---|---|---|---|
| Surge AI | Technical Program Manager | `not-in-fullrun-artifacts` | fail: no positive keyword | Relevant PM/operations role, but current positive taxonomy has no `Program Manager` / `Technical Program Manager`. |
| Surge AI | Program Manager | `not-in-fullrun-artifacts` | fail: no positive keyword | Same gap; current page is AI/product operations heavy, but title-only gate cannot see that. |
| Surge AI | Generative AI Generalist | `not-in-fullrun-artifacts` | pass: `Generative AI` | This should pass by title. Absence suggests source extraction incompleteness, current-board delta, or URL/title typo handling, not just taxonomy. |
| Surge AI | AI Programs Analyst | `not-in-fullrun-artifacts` | fail: no positive keyword | `AI Programs` is not modeled. Also early-career wording needs manual fit review. |
| Surge AI | Product Operations Manager | `not-in-fullrun-artifacts` | fail: no positive keyword | PM-adjacent product ops role; current taxonomy only catches exact `Product Manager` family. |
| ElevenLabs | AI Automations Engineer | `not-in-fullrun-artifacts` | fail: no positive keyword | Strong AI automation/internal-tools fit, but `AI Automations` is not a positive. |
| ElevenLabs | Full-Stack Engineer | `not-in-fullrun-artifacts` | fail: no positive keyword | Live role is AI product engineering, but title is generic. Do not add broad `Full-Stack Engineer` without a second-stage content/company gate. |
| ElevenLabs | Deployment Strategist - North America | `not-in-fullrun-artifacts` | fail: no positive keyword | Very strong FDE/SA/customer deployment fit; add `Deployment Strategist` / strategist-family carefully. |
| ElevenLabs | AI Creative Producer - Ads | `not-in-fullrun-artifacts` | fail: no positive keyword | Strong creative AI fit; current Creative positives miss `AI Creative Producer`. |
| xAI | Image Tutor | `not-in-fullrun-artifacts` | fail: no positive keyword | Strong AI training/evaluation fit. Current positives include `AI Trainer`, not tutor/specialist variants. |
| xAI | Video Tutor | `not-in-fullrun-artifacts` | fail: no positive keyword | Same gap, with strong creative/video alignment. |
| xAI | AI Tutor - Chinese | `not-in-fullrun-artifacts` | fail: no positive keyword | Strong language/audio AI training fit; also highlights multilingual/audio evaluation as a role family. |
| xAI | AI Tutor - Crypto | `not-in-fullrun-artifacts` | fail: no positive keyword | AI training/evaluation fit; domain fit is more borderline than visual/video/Chinese. |
| Atlassian | Solutions Architect \| DX | `not-in-fullrun-artifacts` | pass: `Solutions Architect` | Title should pass. Full run only retained Atlassian `Product Manager`, so this is likely source extraction incompleteness or a current-board delta. |

Target-company full-run retained counts:

| Company | 2026-05-01 scan-history | Pipeline | Excel | Notes |
|---|---:|---:|---:|---|
| Surge AI | 5 | 4 | 4 | Missing seed roles are not in retained artifacts; current extraction found only a subset such as FDE and Strategic Product Manager. |
| ElevenLabs | 19 | 5 | 5 | Many retained roles were AE/sales and stripped; seed roles are absent from retained artifacts. |
| xAI | 2 | 1 | 1 | The visible row is a false positive: `Accounting Expert - Technical Accounting`. |
| Atlassian | 1 | 1 | 1 | Full run retained only a generic `Product Manager` URL, not job detail `24843`. |

## Broader Full-Run Patterns

These counts are constrained to retained full-run artifacts, so they are
lower bounds for missed raw job-board roles.

| Pattern family | Scan-history | Pipeline | Excel | Pipeline rows dropped before Excel |
|---|---:|---:|---:|---:|
| Program / product-ops / strategist | 11 | 11 | 8 | 3 |
| AI training / data / evaluator / generalist | 39 | 36 | 28 | 8 |
| SA / FDE / customer technical | 360 | 360 | 206 | 154 |
| Creative / image / video / generative | 7 | 7 | 4 | 3 |

The biggest full-run-wide issue is not Senior/Principal scoring. It is
the output-time `hybrid_non_toronto` drop: **all 343 pipeline rows that
did not appear in Excel had `deal_breaker_signal = hybrid_non_toronto`**.
That includes 154 SA/FDE/customer-technical rows. This needs a focused
false-positive audit before the dealbreaker remains a hard drop.

Low-priority / low-score signals:

- 190 visible high-intent rows had `desc_score = 0`; many are A/B only
  because enrichment did not contribute location, compensation, tech, or
  track-keyword lift.
- PM roles at lower-ranked companies often sit in B because `Product
  Manager` gives only `PM(4) + rankTier(1)` when category/location/comp
  signals do not fire.
- SA roles from strong infra/cloud companies often sit at B=7 with
  `no enrichment cache hit`, even when the title is obviously relevant.

## Scoring / Filter Contradictions

### Senior/Principal penalty

Will's concern is valid as a design question, but the current full-run
evidence says the `-5strength` fallback is **not actively causing
ranking weirdness**: 0 visible Excel rows had `-5strength` in `Score
Notes`. Keep it as a defensive fallback until future pipeline changes
make it redundant, but it is not the current failure.

### Substring false positives

The title filter's raw substring matching is causing bad inclusions:

- `RAG` matches inside `Storage`, producing 10 visible AI-ENG false
  positives such as `Engineering Manager, Storage`, `Software Engineer,
  Storage`, and `Storage Engineer`.
- `Technical Account` matches `Technical Accounting`, producing false
  SA rows such as `Runway | Technical Accounting Manager`, `Scale AI |
  Technical Accounting and Reporting Manager`, and `xAI | Accounting
  Expert - Technical Accounting`.

These are not just scoring oddities; they are title-filter semantics
bugs. They should be fixed before broadening positives too much, or the
pipeline will recover good roles while also admitting more noise.

## Role-Fit Advice on Seed Families

| Family | Fit for Will | Advice |
|---|---|---|
| Surge Program / Product Ops / AI Programs | Strong | Add as PM/Consult/SA-adjacent only for AI-native companies or with AI/product-ops language. The roles match founder/operator execution, customer/product coordination, and AI data systems context. |
| ElevenLabs Deployment Strategist | Very strong | Should be considered SA/FDE-equivalent. Current taxonomy is too literal: it catches `Forward Deployed Engineer` but not strategist variants doing the same customer deployment work. |
| ElevenLabs AI Automations Engineer | Strong | Good bridge between builder, GTM ops, automation, and AI agents. Add `AI Automations` / `Automation Engineer` only with AI/company/context guard. |
| ElevenLabs AI Creative Producer | Strong but specialized | Good for Will's generative media/LoRA/creative AI angle. Add `AI Creative Producer` and maybe `AI Producer`, not broad `Producer`. |
| ElevenLabs Full-Stack Engineer | Possible, not title-safe | The live role is relevant by content, but the title is too generic for title-only inclusion. Needs source/content second pass or manual company-specific review. |
| xAI Tutor / Image / Video / AI Tutor | Strong side-track | These are highly aligned with AI evaluation/training and creative AI, especially as flexible remote/hourly work. Add a distinct `AI-EVAL` or `AI-TRAINING` family rather than forcing them into CREATIVE. |
| xAI Crypto Tutor | Borderline-to-good | AI evaluation fit is real; crypto domain may be less central. Should be included if Will wants a broader flexible/evaluation lane. |
| Atlassian Solutions Architect \| DX | Strong | Title already passes. Missing result points to source extraction weakness, not taxonomy. Targeted rescan/source-route fix needed. |

## Recommended Changes, Ranked

1. **Audit `hybrid_non_toronto` before using it as a hard drop.**
   - Blast radius: 343 full-run pipeline rows; 154 are SA/FDE/customer
     technical.
   - Recommendation: produce a candidate workbook that restores those
     rows into a separate `Dealbreaker Review` sheet with signal text,
     instead of silently dropping all.

2. **Fix substring matching false positives before broadening positives.**
   - Replace raw substring handling for short tokens such as `RAG` with
     word-boundary or phrase-aware matching.
   - Tighten `Technical Account` so it does not match `Technical
     Accounting`.
   - Blast radius observed: at least 10 `Storage`/`RAG` false positives
     and 3 `Technical Accounting` false positives in visible Excel.

3. **Add a new AI evaluation/training role family.**
   - Candidate positives: `AI Tutor`, `Image Tutor`, `Video Tutor`, `AI
     Evaluator`, `AI Evaluation`, `AI Data Specialist`, `AI Trainer`,
     `Model Evaluation`, `Annotation`, `Data Quality` with guards.
   - Use a new track such as `AI-EVAL` rather than overloading CREATIVE.

4. **Add PM-adjacent program/product-ops positives with AI-native guard.**
   - Candidate positives: `Technical Program Manager`, `AI Programs`,
     `Product Operations Manager`, `Program Manager`.
   - Do not add broad `Program Manager` globally without either company
     category guard or description/content scoring, because non-AI
     program-management noise will rise.

5. **Add deployment strategist / solution strategist variants.**
   - Candidate positives: `Deployment Strategist`, `Forward Deployed
     Strategist`, `AI Strategist`, possibly `Solutions Strategist`.
   - Map to SA/Consult/FDE.

6. **Improve enrichment coverage and scoring transparency.**
   - 190 visible high-intent rows have `desc_score=0`; many good roles
     are under-ranked because description signals did not contribute.
   - Recommended candidate workbook should expose raw location,
     compensation, dealbreaker, cache-hit status, and source-stage
     columns for calibration.

7. **Targeted source-route checks for Surge and Atlassian.**
   - Surge has current roles that either should pass or are strategically
     relevant but are absent from retained full-run artifacts.
   - Atlassian `Solutions Architect | DX` should pass by title but was
     not retained; current full run only captured one Atlassian PM
     listing. This needs source extraction repair or targeted current
     rescan, not a scoring tweak.

## Suggested Next Execution Step

Do not overwrite the current baseline Excel. The next safe implementation
step is a **candidate-diff workbook** generated from the 2026-05-01 full
run plus explicitly labeled current-board seed rows:

1. `Baseline Visible` — current 613 rows.
2. `Output Drops Review` — 343 `hybrid_non_toronto` rows.
3. `Low Ranked High Intent` — B/C/low-A rows with score decomposition.
4. `Seed Current-Board Rows` — the supplied URLs, labeled as current-board
   comparison, with proposed track and fit notes.
5. `False Positives` — `Storage`/`RAG`, `Technical Accounting`, and any
   other substring artifacts.

After Will reviews that workbook, implement only the approved taxonomy,
dealbreaker, and scoring changes.
