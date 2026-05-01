---
status: active
type: audit
owner: codex
last-updated: 2026-04-30T17:25:27-04:00
read-if: "you need the Phase 2.8 Step 10 full sample-50 verification result"
skip-if: "status != active"
related:
  - career-ops/output/jobs-sample50-step10-2026-04-30.xlsx
  - career-ops/data/firecrawl-plan-caps.tsv
  - docs/audits/2026-04-30-step10-sample50-metrics.json
  - docs/audits/2026-04-30-sample50-missed-company-classification.md
  - scripts/acceptance-audit-phase2.8.py
---

# Phase 2.8 Step 10 Sample-50 Results

Step 10 ran on 2026-04-30 after Step 9 dashboard caps were documented.

## Run Setup

- Baseline roster before sampling: 448 total / 397 enabled / 51 disabled.
- Sample generator: `scripts/sample-portals-50-v2.py --seed 42 --n 50`.
- Pipeline: `node scripts/full-scan-orchestrator.mjs`.
- Live files restored after run: `career-ops/portals.yml`, `career-ops/data/pipeline.md`, `career-ops/data/scan-history.tsv`, `career-ops/data/applications.md`, `career-ops/data/firecrawl-fallback-queue.tsv`, and the live `jobs-2026-04-30.xlsx`.
- Preserved review artifact: `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx`.

## Dashboard Caps

User supplied:

| Field | Value |
|---|---|
| plan_name | free |
| monthly_credits | 0 |
| credits_remaining | 100401 |
| rpm_limit | 10/scrape per minute; 1/crawl per minute |
| concurrent_limit | 2 concurrent requests |
| observed_at | 2026-04-30T16:27:06-04:00 |

The pipeline ran sequentially, within the documented concurrency cap.

## Pipeline Result

| Metric | Result |
|---|---:|
| Sampled enabled companies | 50 |
| Companies with title-filtered exported jobs | 28 |
| Relevant job yield rate | 56.0% |
| Source resolution rate | 38/50 (76.0%) |
| Source health rate | 37/38 (97.4%) |
| Raw job availability rate | 36/37 (97.3%) |
| Miss classification rate | 22/22 (100.0%) |
| Pending jobs exported | 178 |
| Companies in By Company sheet | 28 |
| S-tier jobs | 7 |
| A-tier jobs | 58 |
| B-tier jobs | 111 |
| C-tier jobs | 2 |
| Firecrawl cost-log rows during run | 307 |
| Firecrawl credits during run | 383 |
| Markdown scrape calls | 288 |
| JSON scrape calls | 19 |
| New fallback queue rows | 0 |

## Signal Extraction Result

Computed from `career-ops/output/jobs-sample50-step10-2026-04-30.xlsx` joined to `career-ops/data/job-descriptions-cache.json`:

| Signal Metric | Result |
|---|---:|
| Cache coverage for exported jobs | 178/178 |
| Description score > 0 | 146/178 (82.0%) |
| Will-fit location signal hits (`location_match`) | 3/178 (1.7%) |
| Generic raw location hits (`location_raw`) | 126/178 (70.8%) |
| Compensation signal hits | 23/178 (12.9%) |
| Either generic raw location or compensation hit | 126/178 (70.8%) |
| Either Will-fit location or compensation hit | 26/178 (14.6%) |
| Both generic raw location and compensation hit | 23/178 (12.9%) |

AC-3 **passes** if interpreted as generic JD location-or-compensation extraction (`location_raw` or comp) ≥40%.

AC-3 does **not** pass if interpreted narrowly as Will-fit scoring location (`location_match`) or compensation ≥40%. This distinction matters because `location_match` intentionally records only Toronto/GTA/Ontario, Canada-only, or fully remote US signals for scoring.

## Notable Warning

`ats-adapters` exited non-zero because Seagate's Workday CXS endpoint returned HTTP 422:

```text
Seagate Technology (discovery-cache): ERROR POST https://seagate.wd1.myworkdayjobs.com/wday/cxs/seagate/EXT/jobs → 422
```

The orchestrator continued and export succeeded. Treat this as a `SOURCE_BROKEN` source-health warning, not a blocker for the full 397-company rescan.

## Companies With Exported Jobs

Abridge, Snorkel AI, Pure Storage, Cerebras-adjacent: Etched, Unstructured, Harvey, Neuralink, Tenstorrent, Zscaler, Thought Machine, Workday, Expedia Group, Inflection AI, Imbue, Resolve AI, World Labs, Harmonic, XBOW, Kuaishou Technology, Black Forest Labs, Twelve Labs, Strategy, Leidos, Snyk, DiDi, Hugging Face-adjacent: Ollama, Blip.ai, Listen Labs.

## Sample Companies With No Title-Filtered Exported Jobs

SiFive, D-Matrix, Together AI, Vectra AI, Navan, Runway-adjacent: Genmo, Coactive AI, Waymo, SoundHound AI, Databricks, Dassault Systèmes, Fourier Intelligence, Lightmatter, KLA, Texas Instruments, Seagate Technology, Marvell Technology, AMEC, Lasertec, Aurascape, Delfina Care, JusBrasil.

## Recommendation

AC-2 has been replaced by the source-accounting model in `docs/audits/2026-04-30-sample50-missed-company-classification.md`.

- Relevant job yield is report-only: 28/50 companies currently have title-filtered exported jobs.
- Source health and miss classification are the pass/fail checks: 37/38 resolved sources were healthy, and 22/22 no-yield companies were classified.
- AC-3 should be documented as generic JD location-or-compensation extraction if this is the intended enrichment-quality gate. Broader description scoring is also healthy at 82.0%, while Will-fit location-or-compensation remains only 14.6%.
- Seagate is classified as `SOURCE_BROKEN`: Workday CXS returned HTTP 422, and direct Workday HTML returned a maintenance page during probe.
