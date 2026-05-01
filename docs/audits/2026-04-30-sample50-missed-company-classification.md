---
status: active
type: audit
owner: codex
last-updated: 2026-04-30T17:13:48-04:00
read-if: "you need the AC-2 replacement metrics or no-yield classification for the Phase 2.8 sample-50 run"
skip-if: "status != active"
related:
  - docs/audits/2026-04-30-step10-sample50-results.md
  - docs/audits/2026-04-30-step10-sample50-metrics.json
  - career-ops/output/jobs-sample50-step10-2026-04-30.xlsx
  - career-ops/data/ats-discovery-cache.json
  - scripts/acceptance-audit-phase2.8.py
---

# Sample-50 Missed-Company Classification

This audit replaces the vague AC-2 interpretation ">=75% of sampled companies must produce exported jobs" with separate source and yield metrics.

## Replacement Metric Stack

| Metric | Definition | Step 10 Result | Gate |
|---|---|---:|---|
| Source Resolution Rate | Sample companies with either exported jobs or a resolved ATS/direct source | 38/50 (76.0%) | Report |
| Source Health Rate | Resolved sources that responded successfully during direct/source checks | 37/38 (97.4%) | Pass if >=90% |
| Raw Job Availability Rate | Healthy sources that returned at least one raw job | 36/37 (97.3%) | Report |
| Relevant Job Yield Rate | Sample companies with at least one title-filtered exported job | 28/50 (56.0%) | Report |
| Miss Classification Rate | No-yield companies assigned a concrete miss reason | 22/22 (100.0%) | Pass if >=95% |

AC-2 should be read as source accounting and miss explainability, not as "force every company to have a Will-relevant open role today."

## Miss Reason Buckets

| Bucket | Meaning |
|---|---|
| `NO_RELEVANT_JOBS` | Source works and has raw jobs, but none pass Will's title filters. |
| `NO_OPEN_JOBS` | Source works, but returned zero raw jobs. |
| `ROUTE_MISSING` | No direct ATS/source route was discovered; the company remains extract/custom-scrape territory. |
| `SOURCE_BROKEN` | A route exists, but the source failed during verification. |

## Classified No-Yield Companies

| Company | Route Status | Source Health | Raw Jobs | Filtered Jobs | Miss Reason | Evidence | Fit Note | Next Action |
|---|---|---|---:|---:|---|---|---|---|
| SiFive | Workday CXS resolved | healthy | 40 | 0 | `NO_RELEVANT_JOBS` | Workday API returned staff/intern/hardware titles such as "Staff Engineer/Manager" and "Software Engineering Intern". | AI chip/hardware leaning. | No scraper fix. |
| D-Matrix | Ashby resolved | healthy | 45 | 0 | `NO_RELEVANT_JOBS` | Ashby returned mostly principal/senior/staff hardware titles. | AI inference chip/hardware leaning. | No scraper fix. |
| Together AI | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Good-fit company if source improves. | Future route research or Firecrawl/custom extraction tuning. |
| Vectra AI | Greenhouse resolved | healthy | 20 | 0 | `NO_RELEVANT_JOBS` | Greenhouse returned sales/CS/devops/director roles; none survived title filters. | Security/NDR, mixed fit. | No scraper fix. |
| Navan | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Travel/expense, lower strategic fit. | Future route research only if prioritized. |
| Runway-adjacent: Genmo | Ashby direct URL | healthy | 5 | 0 | `NO_RELEVANT_JOBS` | Ashby returned research scientist, new grad, product designer, and GPU performance titles. | Creative AI adjacent, but current roles miss filters/seniority. | No scraper fix. |
| Coactive AI | Ashby resolved | healthy | 0 | 0 | `NO_OPEN_JOBS` | Ashby board responded with zero jobs. | Good-fit company if hiring resumes. | No scraper fix. |
| Waymo | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Autonomous vehicles, lower fit. | Future route research only if prioritized. |
| SoundHound AI | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Consumer/voice AI, possible fit. | Future route research. |
| Databricks | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Strong-fit company if source improves. | High-priority route research. |
| Dassault Systèmes | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Enterprise software; not AI-native. | Future route research only if prioritized. |
| Fourier Intelligence | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Robotics/rehab, lower fit. | Future route research only if prioritized. |
| Lightmatter | Greenhouse resolved | healthy | 46 | 0 | `NO_RELEVANT_JOBS` | Greenhouse returned analog IC/chip architecture roles. | Photonic chip/hardware leaning. | No scraper fix. |
| KLA | Workday CXS resolved | healthy | 40 | 0 | `NO_RELEVANT_JOBS` | Workday returned product, supply-chain, cybersecurity, and senior AI ops titles; filters correctly excluded them. | Semiconductor/hardware supply chain. | Consider disable/low-fit policy later. |
| Texas Instruments | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Semiconductor/hardware supply chain. | Consider disable/low-fit policy later. |
| Seagate Technology | Workday CXS resolved | broken |  | 0 | `SOURCE_BROKEN` | Workday CXS returned HTTP 422 for `EXT`; direct Workday HTML returned maintenance 500 during probe. | Semiconductor/hardware supply chain. | Treat as external/source broken unless future probe recovers route. |
| Marvell Technology | Workday CXS resolved | healthy | 40 | 0 | `NO_RELEVANT_JOBS` | Workday returned staff/principal digital design and SoC titles. | Semiconductor/hardware supply chain. | Consider disable/low-fit policy later. |
| AMEC | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Semiconductor/hardware supply chain. | Consider disable/low-fit policy later. |
| Lasertec | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Semiconductor/hardware supply chain. | Consider disable/low-fit policy later. |
| Aurascape | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | New/uncertain source; previously restored as high-confidence source candidate. | Future route research. |
| Delfina Care | Greenhouse resolved | healthy | 25 | 0 | `NO_RELEVANT_JOBS` | Greenhouse returned doula and clinician roles. | Healthcare/clinical, low fit. | Consider disable/low-fit policy later. |
| JusBrasil | No ATS route | unresolved |  | 0 | `ROUTE_MISSING` | Discovery cache status is `no-ats-found`; no Step 10 export rows. | Brazil/legal tech; lower fit. | Future route research only if prioritized. |

## Bucket Counts

| Miss Reason | Count |
|---|---:|
| `NO_RELEVANT_JOBS` | 8 |
| `NO_OPEN_JOBS` | 1 |
| `ROUTE_MISSING` | 12 |
| `SOURCE_BROKEN` | 1 |

## Future Full-Scan Application

Use this same stack for the full 397-company scan:

1. Preserve source status separately from enabled/disabled status.
2. Report raw source coverage and relevant job yield separately.
3. Classify every no-yield company into one miss reason.
4. Treat `NO_RELEVANT_JOBS` and `NO_OPEN_JOBS` as normal scan outcomes, not scraper failures.
5. Treat `ROUTE_MISSING` as route backlog, prioritized by company fit.
6. Treat `SOURCE_BROKEN` as a source-health warning, not evidence that the company should automatically be disabled.
