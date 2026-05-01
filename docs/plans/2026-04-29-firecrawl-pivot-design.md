---
status: active
type: design-plan
owner: claude
last-updated: 2026-04-30T17:13:48-04:00
read-if: "you are about to refactor the scraping layer to use Firecrawl"
skip-if: "branded scraping isn't on your task"
revision: v2
---

# Phase 2.8 — Firecrawl-Pivot Design

> **Supersession note — 2026-04-30:** This design has been implemented. Any roster-count references to 428 enabled rows are historical. Phase 2.8 Step 0 temporarily reduced the roster to 388 enabled / 60 disabled, then Codex re-audited the disabled cohort and restored 9 high-confidence false disables. Current live roster is **448 total / 397 enabled / 51 disabled**. Use `career-ops/portals.yml`, `docs/STATUS.md`, `docs/design/companies-roster.md`, and `docs/audits/2026-04-30-step0-disabled-company-audit.md` as the current source of truth.
>
> **AC-2 supersession — 2026-04-30:** The original "sample-50 coverage >=75%" gate is retired because it conflated source resolution, source health, raw-job availability, title filters, and whether companies currently have Will-relevant openings. Use `docs/audits/2026-04-30-sample50-missed-company-classification.md` and `docs/audits/2026-04-30-step10-sample50-metrics.json` for the replacement source-accounting metrics.

## §0. Source of truth precedence

**The verification report `docs/design/2026-04-29-firecrawl-ats-verification.md` and Claude's decisions D-14, D-15, D-16, D-17 (in `.claude/memory/decisions.md`) supersede any baseline-knowledge content in this design plan where they conflict.** Sections §4–§9 were originally written with pre-verification assumptions; v2 (this revision) integrates the verified state. If any reader finds wording in this plan that contradicts the verification doc, treat the verification doc as authoritative.

## §1. Why this exists

Phase 2.7's Step 8.5 sample run on 50 companies achieved 26% coverage (13/50). The remaining 35 either errored or returned zero. User-led inspection revealed the underlying truth: most of those 35 are **NOT broken; they have careers pages with click-to-reveal or marketing-landing patterns** that our `custom-scraper.mjs` can't navigate. A 5-URL Firecrawl smoke test confirmed that bare-scrape (no actions) on the SAME URLs surfaces the underlying ATS or job list cleanly in 5/5 cases.

This plan documents the architectural pivot to make Firecrawl the primary scraping layer, with our custom code as a thin orchestrator + last-resort fallback.

## §2. Smoke test findings (2026-04-29, 5 URLs)

Run via `scripts/firecrawl-smoke-test.mjs` + `scripts/firecrawl-deep-test.mjs`. Raw outputs in `scripts/firecrawl-smoke-out/`.

| Company | Bare scrape | What Firecrawl found | Reachable via |
|---|---|---|---|
| **Jasper** | 32k md, 85 links | `https://jobs.ashbyhq.com/Jasper%20AI` (Ashby slug) | `scan.mjs` Ashby API once slug discovered |
| **SiFive** | 4.7k md, 80 links | `https://sifive.wd1.myworkdayjobs.com/en-US/sifivecareers` (Workday) | `scan.mjs` Workday (or Firecrawl) |
| **Expedia Group** | 24k md, 89 links | Custom landing → links to Workday subdomain via team pages | Firecrawl drill-down |
| **Cloudflare** | 11k md, 162 links → drill to `/careers/jobs/` → 70k md, 493 links | Greenhouse: `boards.greenhouse.io/cloudflare/...` | `scan.mjs` Greenhouse API |
| **Shopify** | 17k md, 38 internal job URLs (custom system) | Direct job-posting URLs in main page | Firecrawl per-JD scrape |

**Headline:** 4 of 5 companies were ALREADY ON Greenhouse/Ashby/Workday — `scan.mjs` would have handled them perfectly if we'd known the slug. Firecrawl's job is to **discover** the slug from marketing pages, not to scrape job content directly. Only 1 of 5 (Shopify) is genuinely custom and even that returns clean markdown.

This means **Firecrawl mostly enables `scan.mjs` to work for many more companies**, not replace it.

## §3. Content quality (per-JD)

| Source | Sample | MD chars | Signal extraction quality |
|---|---|---|---|
| Shopify per-JD | Senior Product Marketing Lead | 6,019 | Excellent — title, "Remote - Americas", "senior lead-level IC", full body, all in clean lines |
| Cloudflare /careers/jobs/ list | n/a | 70,775 | Excellent — every job is a markdown link to greenhouse with title + location adjacent |
| Expedia /technology | n/a | 20,812 | Mixed — has job titles but also nav menus inline ("AustraliaCanadaChina..."); needs minor regex cleanup |

**Conclusion on content:** Firecrawl's `markdown` format is clean enough to feed directly into `extractSignals()`. No secondary structure cleanup needed for greenhouse/ashby/lever/workday-derived JDs. For custom systems (Shopify, Expedia), light post-processing (drop nav menus from `onlyMainContent: true` mode) handles edge cases.

## §4. Architectural pivot

### §4.1 New layer model

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 0: DIRECT ATS APIs (8 providers post-D-15)            │
│  ─ scan.mjs (UNCHANGED — vendored upstream, D-3 invariant):  │
│      Greenhouse / Ashby / Lever                              │
│  ─ NEW sibling adapters in scripts/ats-adapters/             │
│    (each ~30-60 lines, mirrors scan.mjs JSON-API pattern):   │
│      workday-cxs.mjs / smartrecruiters.mjs / personio.mjs /  │
│      recruitee.mjs / workable.mjs                            │
│  Triggers when portals.yml careers_url IS a direct ATS URL   │
│  OR an ATS slug was discovered by Layer 1 and cached.        │
│  Coverage today: ~29 direct in portals.yml (~7%); post-      │
│  Layer-1-discovery: expected substantial uplift as branded   │
│  pages resolve to one of the 8 supported ATSes.              │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ slug discovered → route here
                          │
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: firecrawl-discover.mjs (NEW — primary)             │
│  For every branded careers_url:                              │
│    1. Firecrawl /v1/scrape with formats:["html","links"]     │
│       (per verification doc — NOT /v1/map; map cannot see    │
│       ATS hostnames in script tags / iframe src)             │
│    2. Scan link list + html for 8-provider ATS markers       │
│       (greenhouse / ashby / lever / *.myworkdayjobs.com /    │
│        smartrecruiters / personio / recruitee / workable)    │
│    3. If found → write discovered slug to                    │
│       data/ats-discovery-cache.json (60-day TTL with         │
│       fast-fail re-discovery on 4xx/5xx; per D-14)           │
│       and route to the matching Layer 0 adapter              │
│    4. If not found → drill 1-2 levels deep on inner          │
│       careers/jobs links, retry detection                    │
│    5. After 2 levels deep with no hit: fall through Layer 2  │
└──────────────────────────────────────────────────────────────┘
                          ▼ no ATS found after drilling
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: firecrawl-extract.mjs (NEW)                        │
│  Structured listing extraction for genuinely custom careers  │
│  pages (Shopify, Expedia-style):                             │
│    1. Firecrawl /v1/scrape with formats:["json"] +           │
│       jsonOptions: { schema: JOB_LISTING_SCHEMA, prompt }    │
│       (per verification doc — NOT legacy /v1/extract or      │
│        extractorOptions; /v1/extract is a separate           │
│        token-billed pool, reserved for cross-page reasoning) │
│    2. JSON-mode is 5 credits/page (1 base + 4 surcharge);    │
│       budget accordingly                                     │
│    3. Filter results via title_filter (same as scan.mjs)     │
│    4. Append to pipeline.md + scan-history.tsv               │
└──────────────────────────────────────────────────────────────┘
                          ▼ Firecrawl down / quota exhausted
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: custom-scraper.mjs (FALLBACK ONLY)                 │
│  Existing 3-tier Playwright. Triggered ONLY when:            │
│    - Firecrawl /v1/scrape returns 5xx repeatedly             │
│    - --no-firecrawl flag explicitly set                      │
│    - per-run --max-credits cap exceeded                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Per-JD enrichment (refactor of enrich-jobs.mjs in-place,    │
│  NOT a new file; D-14 mention of "firecrawl-enrich.mjs" is   │
│  a naming typo corrected here):                              │
│  PURE FIRECRAWL-FIRST per Q-FC-4:                            │
│    1. Firecrawl /v1/scrape (markdown, onlyMainContent: true) │
│       — 1 credit/page (markdown is the cheap path)           │
│    2. extractSignals() runs on resulting clean markdown      │
│    3. Plain HTTP fallback ONLY on Firecrawl outage           │
│       (5xx, timeout, --max-credits exhaustion); NOT a        │
│       cost-routing optimization                              │
└──────────────────────────────────────────────────────────────┘
```

#### §4.1.1 Provider matrix (Layer 0 direct-API tier)

| Provider | Detection signal in URL or links | Direct endpoint | Output parser | Status |
|---|---|---|---|---|
| Greenhouse | `boards.greenhouse.io/{slug}` or HTML embed | `/embed/job_board?for={slug}&format=json` (existing scan.mjs) | scan.mjs internal | EXISTING |
| Ashby | `jobs.ashbyhq.com/{slug}` | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | scan.mjs internal | EXISTING |
| Lever | `jobs.lever.co/{slug}` | `api.lever.co/v0/postings/{slug}?mode=json` | scan.mjs internal | EXISTING |
| Workday CXS | `*.myworkdayjobs.com/{site}` | `POST {tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` then `GET .../job/{externalPath}` | NEW workday-cxs.mjs | NEW (D-15) |
| SmartRecruiters | `careers.smartrecruiters.com/{id}` or branded → discover | `GET api.smartrecruiters.com/v1/companies/{id}/postings` | NEW smartrecruiters.mjs | NEW (D-15) |
| Personio | `*.jobs.personio.de` or branded → discover | `GET {company}.jobs.personio.de/xml?language=en` | NEW personio.mjs | NEW (D-15) |
| Recruitee | branded → discover (provider-specific URL after detection) | Public jobs feed (XML/JSON; URL set per company) | NEW recruitee.mjs | NEW (D-15) |
| Workable | `apply.workable.com/{slug}` or branded → discover | `GET apply.workable.com/api/v1/widget/accounts/{slug}` (newer); legacy `www.workable.com/api/accounts/{slug}?details=true` as fallback | NEW workable.mjs | NEW (D-15) |

**Out of scope:** iCIMS, BambooHR, Pinpoint, Teamtailor, Phenom, Jobvite (auth-gated or HTML-only — fall through to Layer 1/2 Firecrawl). **JazzHR — UNVERIFIABLE per verification doc; explicitly excluded from direct-adapter scope until primary-source access is available.**

### §4.2 Files added

- `career-ops/firecrawl-discover.mjs` (NEW) — Layer 1; primary branded entrypoint. Calls Firecrawl `/v1/scrape` with `formats:["html","links"]`, scans for 8-provider ATS markers, writes to `data/ats-discovery-cache.json`.
- `career-ops/firecrawl-extract.mjs` (NEW) — Layer 2; structured listing extraction for custom careers pages via Firecrawl `/v1/scrape` + `formats:["json"]` + `jsonOptions` (NOT legacy `/v1/extract` or `extractorOptions`).
- `career-ops/lib/firecrawl.mjs` (NEW) — thin SDK wrapper. Exports: `scrape(url, opts)` for markdown/html/links, `scrapeJson(url, schema, prompt)` for JSON-mode extraction, retry logic, cost tracking. **No `extract(url, schema)` wrapper** — `/v1/extract` is on a separate token-billed pool per verification doc and is reserved for cross-page reasoning we don't need.
- `career-ops/lib/ats-clients.mjs` (NEW) — shared library housing the JSON-API logic for Greenhouse/Ashby/Lever (extracted from scan.mjs without modifying scan.mjs — see §4.3 below) plus the 5 new direct-API adapters. Imported by both scan.mjs sibling adapters and Layer 1 routing logic.
- `scripts/ats-adapters/workday-cxs.mjs` (NEW, per D-15) — Workday CXS POST/GET adapter. Sibling to scan.mjs; preserves D-3.
- `scripts/ats-adapters/smartrecruiters.mjs` (NEW, per D-15) — SmartRecruiters Posting API adapter.
- `scripts/ats-adapters/personio.mjs` (NEW, per D-15) — Personio XML feed adapter.
- `scripts/ats-adapters/recruitee.mjs` (NEW, per D-15) — Recruitee public feed adapter.
- `scripts/ats-adapters/workable.mjs` (NEW, per D-15) — Workable widget API adapter (with legacy fallback).

### §4.3 Files modified

- `career-ops/enrich-jobs.mjs` — refactor `enrichOne()` to be **pure Firecrawl-first** per Q-FC-4 (D-14): primary path = Firecrawl `/v1/scrape` markdown (1 credit/page); fallback = plain HTTP **only on Firecrawl outage** (5xx / timeout / `--max-credits` exhaustion). Not a cost-routing optimization. Cache schema unchanged.
- `career-ops/package.json` — npm scripts:
  - `firecrawl-discover` → node firecrawl-discover.mjs
  - `firecrawl-extract` → node firecrawl-extract.mjs (run after discover for custom-system survivors)
  - `ats-adapters` → node scripts/ats-adapters/run-all.mjs (orchestrator that fans out to the 5 new sibling adapters using portals.yml + discovery cache)
  - `full-scan` → `scan && firecrawl-discover && ats-adapters && firecrawl-extract && enrich && export`
- `career-ops/.gitignore` — add `data/firecrawl-cache.json` (per-URL cache to avoid re-scraping on rerun).
- `.firecrawl-key` (already gitignored) — env file for `FIRECRAWL_API_KEY`.

**`scan.mjs` is NOT modified** (D-3 invariant locked by D-14). Discovered slugs reach the appropriate Layer 0 path via the new sibling adapters reading both `portals.yml` direct slugs AND the `data/ats-discovery-cache.json` artifact written by Layer 1. No `--discovered-slugs` flag on scan.mjs.

### §4.4 Files deprecated (kept as fallback)

- `career-ops/custom-scraper.mjs` — kept for `--no-firecrawl` mode and as a Layer 3 fallback. Not deleted, not on the default `full-scan` path.

### §4.5 Files unchanged

- `career-ops/portals.yml` — same 448 / 428 / 20 schema. Optional new field `firecrawl_actions: [...]` for the rare site that genuinely needs a click (smoke test showed none of 5 needed it, but reserve the option).
- `career-ops/export-jobs.mjs` — unchanged. Still reads pipeline.md and the enrichment cache.
- `career-ops/data/pipeline.md`, `scan-history.tsv` — schema unchanged.
- All Phase 2.7 acceptance criteria still apply.

## §5. Cost & quota model

User has 101k Firecrawl credits available. **Per verification doc:** pricing is mode-dependent, not flat — see breakdown below.

### §5.1 Per-call credit costs (verified)

| Mode | Credits per call | When used in our pipeline |
|---|---|---|
| Markdown / HTML / links scrape (`/v1/scrape` baseline) | **1 credit / page** | Layer 1 discovery; per-JD enrichment |
| JSON-mode scrape (`/v1/scrape` + `formats:["json"]` + `jsonOptions`) | **5 credits / page** (1 base + 4 surcharge) | Layer 2 structured listing extraction only |
| Stealth / enhanced proxy surcharge | +4 credits / page | Avoid by default; reserve for sites that block standard fetches |
| `/interact` (stateful sessions) | 2 credits / browser-minute | Reserved for SPAs needing >60s settle time (`actions` is capped at 60s combined wait) |
| `/v1/extract` (separate token pool) | **NOT USED** | Per verification doc, billed on separate token subscription, not per-page credit pool. Reserved for cross-page reasoning we don't need. Use `/v1/scrape` + inline JSON Schema instead. |
| Direct ATS API (Greenhouse / Ashby / Lever / Workday CXS / SmartRecruiters / Personio / Recruitee / Workable) | **0 credits** | All 8 Layer 0 providers are zero-Firecrawl-credit; outbound HTTP only |

### §5.2 Per-full-scan budget projection

| Operation | Calls per full-scan | Mode | Credit cost |
|---|---|---|---|
| Layer 0 direct-API (8 providers) | ~30+ today; expected uplift post-discovery to 100+ | Direct HTTP | 0 |
| Layer 1 discovery (branded careers pages) | ~400 (decreases run-over-run as cache warms) | Markdown scrape | ~400 |
| Layer 1 drill-down (no-ATS-found cases) | ~50-100 | Markdown scrape | ~50-100 |
| Layer 2 structured extraction (custom systems) | ~10-30 | JSON-mode (5 cr) | ~50-150 |
| Per-JD enrichment (Firecrawl-first per Q-FC-4) | ~500-1500 (depends on title-filter survivors) | Markdown scrape | ~500-1500 |
| **Total per full-scan** | — | — | **~1,000-2,150 credits** |

With 101k credits and warm cache, ongoing cost is dominated by per-JD enrichment (~500-1500 credits/run). ~50-100 full-scans available before budget concerns.

### §5.3 Cache TTL (corrected per D-14)

ATS discovery cache (`data/ats-discovery-cache.json`): **60-day TTL with fast-fail re-discovery on 4xx/5xx response from cached slug** (per D-14, replacing earlier "30-day" assumption). Real ATS migrations are 12-week+ projects done rarely; aggressive TTL is unnecessary. Per-URL cache (`data/firecrawl-cache.json`, gitignored) for the per-JD scrape results uses 7-day TTL (matches existing `data/job-descriptions-cache.json` convention).

### §5.4 Per-plan rate caps — VERIFICATION GATE (open)

The verification doc could not surface Firecrawl per-plan RPM / concurrency caps from public docs. **Implementation plan must include a manual gate** that verifies the dashboard rate caps against any high-concurrency batch design before the first real full-scan. Default to **sequential for Layer 1 + Layer 2** until cap is confirmed.

### §5.5 Per-run budget cap

Implementation plan must include `--max-credits N` flag (default N=3000) that hard-stops with clean exit if the per-run budget is exceeded. Falls through to Layer 3 (custom-scraper) for any remaining work.

## §6. Migration sequence (proposed implementation steps)

1. **Step 0**: portals.yml URL triage (~30 min, zero Firecrawl credits) — HTTP HEAD over 428 enabled URLs; classify into 4 buckets (direct-ATS / branded-OK / dead / wrong-company-suspect). Output TSV; manual gate for portals.yml fixes.
2. **Step 1**: write `lib/firecrawl.mjs` SDK wrapper + tests. Exports `scrape(url, opts)` + `scrapeJson(url, schema, prompt)`. NO `extract()` wrapper. Cost-tracking required from day 1; `--max-credits` gate enforced here.
3. **Step 2**: write `lib/ats-clients.mjs` housing JSON-API logic for the **8-provider direct-API tier** (Greenhouse/Ashby/Lever existing logic + Workday CXS, SmartRecruiters, Personio, Recruitee, Workable as new entries per D-15). The Greenhouse/Ashby/Lever code is **duplicated** from scan.mjs (NOT extracted) — preserves D-3 invariant.
4. **Step 3**: write 5 sibling adapter scripts under `scripts/ats-adapters/` (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable). Each ~30-60 lines, mirrors scan.mjs pattern: read portals.yml + ats-discovery-cache.json, fetch via `lib/ats-clients.mjs`, write to pipeline.md + scan-history.tsv.
5. **Step 4**: write `firecrawl-discover.mjs` (Layer 1) — minimal first version: `/v1/scrape` with `formats:["html","links"]`, scan link list + html for 8-provider markers, emit to ats-discovery-cache.json. 60-day TTL with fast-fail re-discovery.
6. **Step 5**: smoke test on the 50 sample-run companies. Compare to previous baseline (13/50). Target: ≥40/50.
7. **Step 6**: write `firecrawl-extract.mjs` (Layer 2) for survivors (Shopify-style custom systems). Uses `/v1/scrape` + `formats:["json"]` + `jsonOptions` only. **No `/v1/extract`.**
8. **Step 7**: refactor `enrich-jobs.mjs` to be **pure Firecrawl-first** (Q-FC-4) — primary `/v1/scrape` markdown; HTTP fallback only on Firecrawl outage.
9. **Step 8**: rewire `package.json` `full-scan` chain to: `scan && firecrawl-discover && ats-adapters && firecrawl-extract && enrich && export`.
10. **Step 9**: per-plan rate cap verification (manual gate) — confirm Firecrawl dashboard RPM/concurrency caps before any high-concurrency Layer 1 / Layer 2 batch.
11. **Step 10**: re-run sample-50 end-to-end. Verify source-accounting AC-2, enrichment-quality AC-3, and export quality.
12. **Step 11**: acceptance audit pass against §7 ACs.
13. **Step 12**: full Phase 2.6 clean rescan.

## §7. Acceptance criteria (final, post-Codex-review integration)

- **AC-1**: `firecrawl-discover.mjs` recovers ATS slugs for ≥4 of the original 5 smoke-test companies (Jasper, SiFive, Expedia, Cloudflare, Shopify).
- **AC-2**: Sample-50 source accounting is complete. Report source resolution, source health, raw-job availability, and relevant job yield separately; relevant job yield is report-only. Pass/fail checks are source health ≥90% for resolved sources and miss classification ≥95% for no-yield companies. Step 10 result: source resolved 38/50, source health 37/38, raw job availability 36/37, relevant job yield 28/50, no-yield classification 22/22.
- **AC-3**: Per-JD enrichment via Firecrawl markdown yields location + comp signals on ≥40% of JDs (vs 9-12% in v1 sample run).
- **AC-4**: All 5 new direct-API adapters (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable) have integration tests passing against representative real company URLs. Tests assert: HTTP 200, parseable JSON/XML, ≥1 job extracted, schema-conformant output to pipeline.md.
- **AC-5**: **No code path calls `/v1/extract` or uses legacy `extract` / `extractorOptions` / `extractionSchema` request keys.** Verified by grep audit across `career-ops/firecrawl-*.mjs`, `career-ops/lib/firecrawl.mjs`, `career-ops/enrich-jobs.mjs`, and `scripts/ats-adapters/`. Inline JSON Schema is delivered exclusively via `formats:["json"]` + `jsonOptions` in `/v1/scrape`.
- **AC-6**: ATS discovery cache TTL is **60 days with fast-fail re-discovery on 4xx/5xx** response from cached slug. Verified by manipulating cache timestamps + force-fail integration test.
- **AC-7**: `data/firecrawl-cost.tsv` log shows per-call credits separated by mode (`markdown`=1cr / `json-mode`=5cr / `actions` / `interact` / `direct-api`=0cr). Weekly cost projection within 10% of forecast.
- **AC-8**: **D-3 invariant preserved** — `scan.mjs` is NOT modified. New adapters live in `scripts/ats-adapters/` as sibling scripts. Verified by `git log scan.mjs` showing no commits during Phase 2.8 implementation.
- **AC-9**: **JazzHR explicitly out-of-scope** for direct-adapter tier (UNVERIFIABLE per verification doc). Documented in code comment (`scripts/ats-adapters/README.md` or equivalent) and in `.claude/memory/decisions.md`. Future re-introduction gated on primary-source verification.
- **AC-10**: **Per-plan Firecrawl rate cap verified via dashboard before high-concurrency batch runs** (per-plan RPM / concurrency caps not in public docs per verification). Documented in implementation plan as a manual gate ahead of any concurrency increase. `--max-credits N` (default 3000) enforced; clean exit on cap exceeded; falls through to Layer 3 for remaining work.
- **AC-11**: `custom-scraper.mjs` Playwright path triggers ≤5% of the time on a normal run (only on Firecrawl outage / `--max-credits` exhaustion / explicit `--no-firecrawl`).

## §8. Risks

| ID | Risk | Mitigation |
|---|---|---|
| FC-R1 | Firecrawl rate limits or outages during a long run | Per-domain backoff; resume-on-failure (cache writes per-URL); fallback to custom-scraper.mjs Layer 3 |
| FC-R2 | Firecrawl JSON-mode schema output drifts on Firecrawl-side changes | Pin inline JSON Schema (`JOB_LISTING_SCHEMA_V1`) in `lib/firecrawl.mjs`; version-bump key on changes; alert on schema-mismatch responses. **Use `formats:["json"]` + `jsonOptions:{schema, prompt}` shape** (per verification doc) — do NOT use legacy `extract` / `extractorOptions` keys. |
| FC-R3 | Drill-down logic infinite-loops or scrapes too deeply | Hard cap: 2 levels deep, 3 candidate inner-page links scraped per company |
| FC-R4 | Cost overrun (e.g., per-JD enrichment burns through quota faster than expected) | Per-run budget cap (`--max-credits N`); hard-stop with clean exit if exceeded |
| FC-R5 | scan.mjs (vendored upstream) gets a future update that conflicts with `lib/ats-clients.mjs` extraction | `lib/ats-clients.mjs` lives in our layer (career-ops/ root, not vendored); tracked in collab INDEX |

## §9. Open questions — RESOLVED

All four open questions resolved in the decisions addendum (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md`) and confirmed against the verification doc:

- **Q-FC-1 — RESOLVED**: Inline per-call JSON Schema is the canonical shape, delivered via `formats:["json"]` + `jsonOptions:{schema, prompt}` in `/v1/scrape`. NOT legacy `extract` / `extractorOptions`. NOT `/v1/extract` (separate token-billed pool). Verified via `docs/design/2026-04-29-firecrawl-ats-verification.md` Q1+Q2.
- **Q-FC-2 — RESOLVED (user, 2026-04-29)**: Layer 1 discovery runs FIRST → writes to ats-discovery-cache.json → Layer 0 (scan.mjs + 5 sibling adapters) reads cache + portals.yml. See decisions addendum.
- **Q-FC-3 — RESOLVED**: `firecrawl_actions` field reserved in portals.yml schema but not pre-populated. Add per-company only on observed Layer 1 + drill-down failures. Smoke test showed 0/5 needed it. Note: Firecrawl `actions` total wait capped at 60 s per verification doc; longer settle needs `/interact` (2 credits/browser-minute), reserved.
- **Q-FC-4 — RESOLVED**: **Pure Firecrawl-first for per-JD enrichment.** Primary path = Firecrawl `/v1/scrape` markdown (1 credit/page). Plain HTTP fallback ONLY on Firecrawl outage (5xx, timeout, `--max-credits` exhaustion) — NOT a cost-routing optimization. Matches the user's stated principle: "Firecrawl first, custom code as backup". The earlier hybrid framing in the decisions addendum is corrected by this v2.

## §10. Smoke test commands (historical — scripts since deleted)

The smoke test scripts that drove §2 / §3 findings were deleted in commit `626e1ce` post-Phase-2.8-design (precedent: `sample-portals-50.py` was similarly deleted post-purpose). Findings durably captured in this plan §2-§3 + the verification report. If future Firecrawl verification is needed, write fresh scripts against then-current API shape (the deleted scripts used the legacy `extract` form per Q-FC-1 verification, so re-running them would produce stale signal).

Original commands (for the historical record):

```bash
# Initial 5-URL bare-scrape + click-action smoke test
node scripts/firecrawl-smoke-test.mjs        # DELETED in 626e1ce

# Deeper inspection — drill into one Shopify job + Cloudflare inner + Expedia tech
node scripts/firecrawl-deep-test.mjs         # DELETED in 626e1ce
```

## §11. Review Comments

### Codex review — 2026-04-29T17:25:38-04:00

#### ✅ Correct

- D-14/D-15 are directionally supported by the verification doc: Workday CXS is API-accessible without Firecrawl (`docs/design/2026-04-29-firecrawl-ats-verification.md:135`), JSON-mode scrape is 5 credits/page (`docs/design/2026-04-29-firecrawl-ats-verification.md:136`), `/v1/extract` should be avoided by default (`docs/design/2026-04-29-firecrawl-ats-verification.md:137`), and the five additional no-auth ATSes are Workday CXS, SmartRecruiters, Personio, Recruitee, and Workable (`docs/design/2026-04-29-firecrawl-ats-verification.md:138`). Claude's D-14 captures the `/v1/scrape` discovery correction and JSON-mode caveat (`.claude/memory/decisions.md:399`, `.claude/memory/decisions.md:402`), and D-15 records all five sibling adapters (`.claude/memory/decisions.md:424`, `.claude/memory/decisions.md:434`, `.claude/memory/decisions.md:439`-`.claude/memory/decisions.md:443`).
- Q-FC-3's "reserve but don't pre-populate `firecrawl_actions`" answer is reasonable: Firecrawl actions are verified, but action waits are capped at 60 seconds (`docs/design/2026-04-29-firecrawl-ats-verification.md:40`), so keeping this field exceptional avoids baking brittle click flows into `portals.yml` early (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:92`-`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:96`).

#### ⚠ Issues to address before implementation planning

- §4 / §6: The main design plan has not fully integrated D-15's direct-API expansion. It still describes Layer 0 as `scan.mjs` only (`docs/plans/2026-04-29-firecrawl-pivot-design.md:51`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:55`), lists only `firecrawl-discover.mjs`, `firecrawl-extract.mjs`, and `lib/firecrawl.mjs` as new files (`docs/plans/2026-04-29-firecrawl-pivot-design.md:96`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:100`), and leaves a "Decision pending" about modifying `scan.mjs` vs wrapping it (`docs/plans/2026-04-29-firecrawl-pivot-design.md:105`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:107`). That conflicts with D-14's settled Layer 0 wording ("scan.mjs untouched, plus new sibling scripts") and D-15's choice to add all five newly verified adapters as siblings (`.claude/memory/decisions.md:393`, `.claude/memory/decisions.md:434`). **Suggested fix:** rewrite §4.1, §4.2, and §6 Step 2 around an 8-provider direct-API tier: existing Greenhouse/Ashby/Lever plus Workday CXS, SmartRecruiters, Personio, Recruitee, and Workable; explicitly remove the `scan.mjs` modification option.
- §4 / §8 / §9: The plan still uses stale `/v1/extract` and legacy schema language. Layer 2 says "Firecrawl /v1/scrape with /v1/extract schema" (`docs/plans/2026-04-29-firecrawl-pivot-design.md:72`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:75`), the file list names an `extract(url, schema)` wrapper (`docs/plans/2026-04-29-firecrawl-pivot-design.md:99`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:100`), FC-R2 says to pin an `extract` schema (`docs/plans/2026-04-29-firecrawl-pivot-design.md:168`), and Q-FC-1 still asks to verify `extract` API shape (`docs/plans/2026-04-29-firecrawl-pivot-design.md:175`). The verification doc says the canonical shape is `formats:["json"]` + `jsonOptions`, not legacy `extract` (`docs/design/2026-04-29-firecrawl-ats-verification.md:22`-`docs/design/2026-04-29-firecrawl-ats-verification.md:24`), and `/v1/extract` is a separate token pool to reserve for cross-page reasoning (`docs/design/2026-04-29-firecrawl-ats-verification.md:30`, `docs/design/2026-04-29-firecrawl-ats-verification.md:34`, `docs/design/2026-04-29-firecrawl-ats-verification.md:62`). **Suggested fix:** replace `firecrawl-extract` / `extract(url, schema)` language with `/v1/scrape` helpers for markdown and optional JSON-mode via `jsonOptions`; mention `/agent` only as future migration context.
- §5 / §8: Cost and quota modeling still assumes a flat 1-credit scrape and 30-day TTL. The design says "Per-scrape ≈ 1 credit" and forecasts ~1,000-2,000 credits/full scan (`docs/plans/2026-04-29-firecrawl-pivot-design.md:130`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:138`), and it keeps a 30-day discovery TTL (`docs/plans/2026-04-29-firecrawl-pivot-design.md:140`). Verification says JSON-mode scrape is 5 credits/page and `/v1/extract` is a separate token pool (`docs/design/2026-04-29-firecrawl-ats-verification.md:60`-`docs/design/2026-04-29-firecrawl-ats-verification.md:65`), while D-14 moved discovery cache to 60-day TTL with fast-fail rediscovery (`.claude/memory/decisions.md:394`, `.claude/memory/decisions.md:405`). **Suggested fix:** split the cost table into markdown scrape, JSON-mode scrape, actions/interact, and direct-API rows; make the 60-day TTL + fast-fail rule explicit; add a verification gate for per-plan RPM/concurrency caps because the research could not find public rate caps (`docs/design/2026-04-29-firecrawl-ats-verification.md:147`).
- §7: Acceptance criteria are still a placeholder and do not match the handoff. The handoff says the design has 9 acceptance criteria (`docs/agents/claude.md:449`), but the design plan currently has 6 placeholder ACs (`docs/plans/2026-04-29-firecrawl-pivot-design.md:154`-`docs/plans/2026-04-29-firecrawl-pivot-design.md:162`). They also do not cover D-15 adapter correctness, avoidance of legacy `/v1/extract`, JSON-mode cost guards, Firecrawl plan-cap verification, or JazzHR being unverifiable. **Suggested fix:** make §7 final before the implementation plan, with explicit ACs for each new adapter, discovery cache TTL/fast-fail behavior, no legacy `extract` request shape, and cost/rate-limit logging.
- Q-FC-4: The enrichment policy is internally inconsistent across the decisions artifact and D-14. The decisions doc first says to replace the current fetch tiers with Firecrawl primary + HTTP fallback (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:159`-`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:163`), then says static GH/Ashby pages should try free HTTP first and only escalate to Firecrawl (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:165`), then recommends "pure Firecrawl-first" (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:171`). D-14 instead frames Layer 2 as Firecrawl markdown vs JSON-mode, not HTTP-first vs Firecrawl-first (`.claude/memory/decisions.md:395`). **Suggested fix:** pick one policy before implementation: either pure Firecrawl-first for simplicity, or HTTP-first for known static ATS JD pages with Firecrawl fallback for coverage. The verification doc supports the cost direction for HTTP savings but not the precise 40% number (`docs/design/2026-04-29-firecrawl-ats-verification.md:121`-`docs/design/2026-04-29-firecrawl-ats-verification.md:125`).

#### ❓ Questions / clarifications needed from Claude

- Should Layer 2 be named `firecrawl-extract.mjs`, `firecrawl-enrich.mjs`, or folded into the existing `enrich-jobs.mjs` refactor? The design uses `firecrawl-extract.mjs` (`docs/plans/2026-04-29-firecrawl-pivot-design.md:99`), the decisions addendum uses `firecrawl-extract.mjs` (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md:67`), but D-14 uses `firecrawl-enrich.mjs` for the same tier (`.claude/memory/decisions.md:395`).
- Should the design explicitly exclude JazzHR from direct-adapter scope until primary access is available? Verification marks JazzHR as UNVERIFIABLE (`docs/design/2026-04-29-firecrawl-ats-verification.md:100`, `docs/design/2026-04-29-firecrawl-ats-verification.md:148`), but the design does not preserve that warning.
- D-14 says ~1,800 GETs/week is below any plausible plan cap (`.claude/memory/decisions.md:412`), but verification says per-plan rate caps were not found (`docs/design/2026-04-29-firecrawl-ats-verification.md:81`, `docs/design/2026-04-29-firecrawl-ats-verification.md:147`). Can we soften that to "likely low volume, verify dashboard caps before choosing concurrency"?

#### 💭 Optional improvements

- Add a small "source of truth precedence" note: verification doc + D-14/D-15 supersede the original design's baseline-knowledge sections where they conflict. That will keep the implementation-plan writer from accidentally following the older §4/§5 language.
- Consider adding a compact ATS provider matrix to §4.1 with columns for provider, detection signal, direct endpoint, output parser, and Firecrawl fallback behavior. The design is now multi-provider enough that prose alone invites drift.

### Receipt

```yaml
task: "Review Phase 2.8 Firecrawl-pivot design against verification doc and D-14/D-15"
agent: codex
handoff: 20260429-164715-2bcf
files_read:
  - docs/plans/2026-04-29-firecrawl-pivot-design.md
  - docs/plans/2026-04-29-firecrawl-pivot-decisions.md
  - docs/design/2026-04-29-firecrawl-ats-verification.md
  - .claude/memory/decisions.md
  - docs/agents/claude.md
files_touched:
  - docs/plans/2026-04-29-firecrawl-pivot-design.md
career_ops_files_touched: []
result: "Inline review appended in §11; implementation plan should wait until stale design sections are reconciled."
```

## §12. Claude's reconciliation of Codex §11 review — 2026-04-29T18:00:00-04:00

All five ⚠ Issues, three ❓ Questions, and two 💭 Optional improvements were verified against primary sources and integrated. This section documents the disposition of each.

### ⚠ Issues — all ACCEPTED + integrated in v2

| Codex finding | Verification | Disposition | v2 location |
|---|---|---|---|
| §4/§6: Layer 0 sibling adapters not integrated | Confirmed against §4.1 lines 51-55 + §4.2 lines 96-100 + §4.3 "Decision pending"; conflicts with locked D-14/D-15 | **ACCEPT.** Rewrote §4.1 Layer 0 box to show 8-provider tier (3 existing in scan.mjs + 5 new sibling adapters under `scripts/ats-adapters/`). Added §4.1.1 provider matrix. Removed "Decision pending" from §4.3 — D-3 invariant is locked. Updated §4.2 file list with 5 new adapter scripts. | §4.1, §4.1.1, §4.2, §4.3 |
| §4/§8/§9: stale `/v1/extract` and legacy schema language | Confirmed multiple references to `/v1/extract` and `extract(url, schema)` against verification doc Q1+Q2 (canonical shape is `formats:["json"]` + `jsonOptions`) | **ACCEPT.** Layer 2 box updated to `formats:["json"]` + `jsonOptions`. `lib/firecrawl.mjs` exports list now `scrape(url, opts)` + `scrapeJson(url, schema, prompt)` with explicit "no `extract()` wrapper". FC-R2 reworded. Q-FC-1 marked RESOLVED. | §4.1 Layer 2, §4.2, §8 FC-R2, §9 |
| §5/§8: cost & TTL assume flat 1-credit + 30-day | Confirmed §5 forecast 1-2k credits and §5 30-day TTL; verification doc says JSON-mode is 5 credits, D-14 says 60-day TTL with fast-fail | **ACCEPT.** Rewrote §5 entirely: §5.1 per-call cost matrix (markdown 1cr / JSON 5cr / stealth +4 / interact 2cr/min / extract excluded / direct API 0cr); §5.2 budget projection per mode; §5.3 60-day TTL with fast-fail; §5.4 rate-cap verification gate; §5.5 `--max-credits` cap. | §5 (full rewrite) |
| §7: 6 placeholder ACs, handoff said 9, gaps in coverage | Confirmed 6 ACs in plan vs handoff promise of 9 | **ACCEPT.** Expanded to 11 ACs (final, post-review). Added: AC-4 adapter integration tests, AC-5 no-`/v1/extract` grep audit, AC-6 60-day TTL + fast-fail behavior, AC-7 cost log per mode, AC-9 JazzHR explicit out-of-scope, AC-10 dashboard rate-cap manual gate + `--max-credits` enforcement. | §7 (full expansion) |
| Q-FC-4: enrichment policy internally inconsistent | Confirmed three contradictory paragraphs in `2026-04-29-firecrawl-pivot-decisions.md` lines 159-171 | **ACCEPT.** Picked **pure Firecrawl-first** (matches user's stated principle "Firecrawl first, custom code as backup"). HTTP fallback is purely outage-resilience, NOT cost-routing. Updated `2026-04-29-firecrawl-pivot-decisions.md` Q-FC-4 section to be unambiguous; updated this plan §9 Q-FC-4 entry; updated §4.1 per-JD enrichment box. | §4.1 enrichment box, §9 Q-FC-4 + decisions addendum |

### ❓ Questions — all ANSWERED

- **Q1 — Layer 2 naming convention.** Resolved: keep `firecrawl-extract.mjs` for Layer 2 (structured listing extraction from custom careers pages); refactored `enrich-jobs.mjs` (NOT renamed) for per-JD enrichment Firecrawl-first. D-14's reference to `firecrawl-enrich.mjs` is a naming typo — corrected via D-17 integration record. The two are different responsibilities (listing extraction vs per-JD detail), so two distinct entry points are right.
- **Q2 — JazzHR explicit exclusion.** ACCEPTED. Added to §4.1.1 provider matrix as out-of-scope (UNVERIFIABLE per verification doc); added AC-9 making the exclusion enforceable; will be documented in code as comment when implemented.
- **Q3 — Soften "1,800 GETs/week below cap" claim.** ACCEPTED. §5.4 now reads "per-plan rate caps not enumerated in retrieved sources; manual gate to verify dashboard caps before high-concurrency batch design. Default to sequential for Layer 1 + Layer 2 until cap is confirmed."

### 💭 Optional improvements — both ACCEPTED

- **O1 — Source-of-truth precedence note.** Added §0 at the top of this plan stating that the verification doc + D-14/D-15/D-16/D-17 supersede earlier baseline-knowledge sections. Future implementation-plan writers should read §0 first.
- **O2 — Compact ATS provider matrix.** Added as §4.1.1 with columns (provider, detection signal, direct endpoint, output parser, status). Replaces ambiguous prose for the 8-provider tier.

### Net effect

- Design plan is now **v2** and aligned with verification doc + D-14/D-15/D-16.
- One new decision (D-17) records the integration in `.claude/memory/decisions.md`.
- One inline correction to D-14 fixes the `firecrawl-enrich.mjs` naming typo.
- One edit to `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` Q-FC-4 makes the enrichment policy unambiguous (pure Firecrawl-first).
- Codex re-review is OPTIONAL (all 5 issues were correctness-pass corrections, not architecture changes; matches Phase 2.7 v1→v2 pattern).
