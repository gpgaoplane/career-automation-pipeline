---
status: active
type: design-plan
owner: claude
last-updated: 2026-04-29T11:55:00-04:00
read-if: "you are about to refactor the scraping layer to use Firecrawl"
skip-if: "branded scraping isn't on your task"
revision: v1
---

# Phase 2.8 — Firecrawl-Pivot Design

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
│  Layer 0: scan.mjs — DIRECT ATS APIs (UNCHANGED)             │
│  Triggers when portals.yml careers_url is direct ATS         │
│  Coverage today: 18 companies. Coverage post-pivot: 18 + N   │
│    (where N = companies whose ATS slug was discovered by L1) │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ slug discovered → route here
                          │
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: firecrawl-discover.mjs (NEW — primary)             │
│  For every branded careers_url:                              │
│    1. Firecrawl /v1/scrape (formats: links, markdown)        │
│    2. Scan link list for ATS markers (greenhouse/ashby/...)  │
│    3. If found → write discovered slug to ats-discovery-cache │
│       and EMIT a routing instruction: "use scan.mjs Ashby/X"  │
│    4. If not found → drill: scrape any inner careers/jobs    │
│       link, retry slug detection                             │
│    5. After 1-2 levels deep: fall through to Layer 2         │
└──────────────────────────────────────────────────────────────┘
                          ▼ no ATS found after drilling
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: firecrawl-extract.mjs (NEW)                        │
│  For genuinely custom systems (Shopify, Expedia):            │
│    1. Firecrawl /v1/scrape with /v1/extract schema for       │
│       { jobs: [{ title, location, url }] }                   │
│    2. Filter via title_filter same as scan.mjs               │
│    3. Append to pipeline.md + scan-history.tsv               │
└──────────────────────────────────────────────────────────────┘
                          ▼ Firecrawl down / quota exhausted
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: custom-scraper.mjs (FALLBACK ONLY)                 │
│  Existing 3-tier Playwright. Triggered ONLY when:            │
│    - Firecrawl /v1/scrape returns 5xx repeatedly             │
│    - --no-firecrawl flag explicitly set                      │
└──────────────────────────────────────────────────────────────┘
                          
┌──────────────────────────────────────────────────────────────┐
│  Per-JD enrichment (Layer E)                                 │
│  enrich-jobs.mjs becomes Firecrawl-first:                    │
│    1. /v1/scrape (markdown, onlyMainContent: true)           │
│    2. extractSignals() on cleaner markdown                   │
│    3. Fallback: plain HTTP fetch (for static greenhouse JDs) │
└──────────────────────────────────────────────────────────────┘
```

### §4.2 Files added

- `career-ops/firecrawl-discover.mjs` (NEW) — Layer 1; replaces `custom-scraper.mjs` as the primary branded entrypoint.
- `career-ops/firecrawl-extract.mjs` (NEW) — Layer 2; structured extraction for custom systems.
- `career-ops/lib/firecrawl.mjs` (NEW) — thin SDK wrapper: `scrape(url, opts)`, `extract(url, schema)`, retry logic, cost tracking.

### §4.3 Files modified

- `career-ops/enrich-jobs.mjs` — refactor `enrichOne()` to try Firecrawl first.
- `career-ops/scan.mjs` — accept a `--discovered-slugs <path>` flag pointing at the ATS-discovery cache so it can iterate slugs that didn't appear in portals.yml directly. **One careful surgical change to vendored upstream code; alternative is to wrap scan.mjs entirely from Layer 1.**

  **Decision pending:** modify scan.mjs (cleanest data flow) vs wrap from Layer 1 (preserves D-3 invariant of "scan.mjs untouched"). Recommend wrap — duplicate the ~50 lines of Greenhouse/Ashby/Lever API logic into a shared `lib/ats-clients.mjs` that BOTH `scan.mjs` and `firecrawl-discover.mjs` import. Preserves D-3.

- `career-ops/package.json` — npm scripts:
  - `firecrawl-discover` → node firecrawl-discover.mjs
  - `firecrawl-extract` → node firecrawl-extract.mjs (run after discover for custom-system survivors)
  - `full-scan` → `scan && firecrawl-discover && firecrawl-extract && enrich && export`

- `career-ops/.gitignore` — add `data/firecrawl-cache.json` (per-URL cache to avoid re-scraping on rerun).
- `.firecrawl-key` (already gitignored) — env file for `FIRECRAWL_API_KEY`.

### §4.4 Files deprecated (kept as fallback)

- `career-ops/custom-scraper.mjs` — kept for `--no-firecrawl` mode and as a Layer 3 fallback. Not deleted, not on the default `full-scan` path.

### §4.5 Files unchanged

- `career-ops/portals.yml` — same 448 / 428 / 20 schema. Optional new field `firecrawl_actions: [...]` for the rare site that genuinely needs a click (smoke test showed none of 5 needed it, but reserve the option).
- `career-ops/export-jobs.mjs` — unchanged. Still reads pipeline.md and the enrichment cache.
- `career-ops/data/pipeline.md`, `scan-history.tsv` — schema unchanged.
- All Phase 2.7 acceptance criteria still apply.

## §5. Cost & quota model

User has 101k Firecrawl credits available. Per-scrape ≈ 1 credit (per Firecrawl pricing).

| Operation | Calls per full-scan | Notes |
|---|---|---|
| Layer 1 discovery (every branded careers page) | ~410 | One per company per run |
| Layer 1 drill-down (when initial scrape finds no ATS) | ~50-100 | Heuristic: 12-25% of branded need drilling |
| Layer 2 extraction (custom systems) | ~10-30 | Shopify, Expedia, etc. |
| Per-JD enrichment via Firecrawl | ~500-1500 | Depends on how many jobs survive title filter |
| **Total per full-scan** | **~1,000-2,000 credits** | Well within 101k budget; ~50-100 full-scans available |

Layer 1 discovery cache (30-day TTL like the existing ATS-discovery cache) means subsequent runs re-use slugs without re-scraping the marketing landing page. Effective ongoing cost is dominated by per-JD enrichment.

## §6. Migration sequence (proposed implementation steps)

1. **Step 1**: write `lib/firecrawl.mjs` SDK wrapper + tests. Cost-tracking required from day 1.
2. **Step 2**: write `lib/ats-clients.mjs` extracting Greenhouse/Ashby/Lever/Workday API logic from `scan.mjs` (preserves D-3; both scan.mjs and discover.mjs import).
3. **Step 3**: write `firecrawl-discover.mjs` (Layer 1) — minimal first version that scrapes + finds ATS slug + emits to a cache file.
4. **Step 4**: smoke test on the 50 sample-run companies. Compare to previous baseline (13/50). Target: ≥40/50.
5. **Step 5**: write `firecrawl-extract.mjs` (Layer 2) for the survivors (Shopify-style custom systems).
6. **Step 6**: refactor `enrich-jobs.mjs` Firecrawl-first.
7. **Step 7**: rewire `package.json` `full-scan` chain.
8. **Step 8**: re-run sample-50 end-to-end. Verify ≥75% coverage.
9. **Step 9**: full Phase 2.6 clean rescan.

## §7. Acceptance criteria (placeholder — for implementation plan)

- AC-1: `firecrawl-discover.mjs` recovers ATS slugs for ≥4 of the original 5 smoke-test companies.
- AC-2: Sample-50 coverage ≥75% (≥38 of 50 produce jobs).
- AC-3: Per-JD enrichment via Firecrawl yields location + comp signals on ≥40% of JDs (vs 9-12% in the v1 sample run).
- AC-4: Custom-scraper.mjs Playwright path triggers ≤5% of the time on a normal run (only on Firecrawl outage).
- AC-5: `data/firecrawl-cost.tsv` log shows total credits consumed per run; weekly cost projection within 10% of forecast.
- AC-6: D-3 invariant preserved — `scan.mjs` is not modified.

## §8. Risks

| ID | Risk | Mitigation |
|---|---|---|
| FC-R1 | Firecrawl rate limits or outages during a long run | Per-domain backoff; resume-on-failure (cache writes per-URL); fallback to custom-scraper.mjs Layer 3 |
| FC-R2 | Firecrawl `extract` schema-based output drifts on schema changes upstream | Pin `extract` schema in `lib/firecrawl.mjs`; version it; alert on schema-mismatch responses |
| FC-R3 | Drill-down logic infinite-loops or scrapes too deeply | Hard cap: 2 levels deep, 3 candidate inner-page links scraped per company |
| FC-R4 | Cost overrun (e.g., per-JD enrichment burns through quota faster than expected) | Per-run budget cap (`--max-credits N`); hard-stop with clean exit if exceeded |
| FC-R5 | scan.mjs (vendored upstream) gets a future update that conflicts with `lib/ats-clients.mjs` extraction | `lib/ats-clients.mjs` lives in our layer (career-ops/ root, not vendored); tracked in collab INDEX |

## §9. Open questions

- **Q-FC-1**: Does Firecrawl's `extract` API support per-call schemas, or schema upload + reference? (Affects how we version JobListing schema.) Verify via docs.
- **Q-FC-2**: Should Layer 0 scan.mjs run BEFORE or AFTER Layer 1 discovery? **Default:** Layer 1 first → updates ATS-discovery cache → scan.mjs reads cache + portals.yml → makes API calls for both direct-ATS and discovered-slug companies. Confirms Q-FC-2.
- **Q-FC-3**: What should `firecrawl_actions` per-portal field structure look like for the rare click-through case? Reserve the field; spec it lazily once we hit a concrete case.
- **Q-FC-4**: Does the user want Firecrawl-first for enrich-jobs.mjs, or keep the cheap HTTP-fallback as primary (savings on static greenhouse JDs)? Smoke test data suggests Firecrawl markdown is cleaner — but it's not free. **Recommend:** Firecrawl-first for the simpler mental model the user requested; the 5-15% extra cost is bounded.

## §10. Smoke test commands (reproducible)

```bash
# Initial 5-URL bare-scrape + click-action smoke test
node scripts/firecrawl-smoke-test.mjs

# Deeper inspection — drill into one Shopify job + Cloudflare inner + Expedia tech
node scripts/firecrawl-deep-test.mjs

# Outputs:
# scripts/firecrawl-smoke-out/_summary.json
# scripts/firecrawl-smoke-out/{co}-{label}.md   (one per scrape)
```
