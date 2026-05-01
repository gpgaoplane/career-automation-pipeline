---
status: active
type: design
owner: shared
last-updated: 2026-05-01T20:00:00-04:00
read-if: "you are modifying scraper architecture or interpreting pre-Firecrawl scraper docs"
skip-if: "status != active"
related:
  - docs/plans/2026-04-29-firecrawl-pivot-design.md
  - docs/plans/2026-04-29-firecrawl-pivot-implementation.md
  - docs/audits/2026-04-30-sample50-missed-company-classification.md
---

# Scraping Architecture — Design Decisions

Last updated 2026-04-19. Reference before modifying any scraper or adding companies.

> **Phase 2.8 supersession — 2026-04-30:** The lower sections of this file document the pre-Firecrawl `custom-scraper.mjs` architecture. Current scraper architecture is Phase 2.8 Firecrawl pivot: `scan.mjs` remains untouched for direct Greenhouse/Ashby/Lever URLs; Firecrawl discovers ATS routes; repo-root `scripts/ats-adapters/` consumes discovered/direct ATS sources; `firecrawl-extract.mjs` handles no-ATS branded pages; `enrich-jobs.mjs` is Firecrawl-first; `custom-scraper.mjs` is a Layer 3 fallback. Current acceptance gate AC-2 uses source-accounting metrics, not forced exported-job yield. See `docs/STATUS.md`, `docs/plans/2026-04-29-firecrawl-pivot-design.md`, and `docs/audits/2026-04-30-sample50-missed-company-classification.md`.
>
> **Phase 2.8 closure — 2026-05-01:** Phase 2.8 architecture is now executed end-to-end on the full 393-enabled-company roster. Full clean rescan ran 2026-05-01T03:36:40Z onward; 3,552 Firecrawl credits consumed; 12/12 acceptance criteria pass on the full-run audit (see `docs/audits/2026-05-01-fullrun-classification.md` and `2026-05-01-fullrun-metrics.json`). The architecture documented in the supersession note above is the current production pipeline and is no longer under development. Future scraper-architecture changes should be made under a new phase. Roster reduced 397→393 by user-directed disable of 4 SOURCE_BROKEN companies (see `docs/audits/2026-05-01-source-broken-disables.md`). New post-rescan tooling: `scripts/full-run-audit.mjs` (re-probes routes, computes metrics, classifies no-yield) and `scripts/reextract-signals.mjs` (re-runs `extractSignals` on cached JD text without Firecrawl re-fetches).

---

## ATS API Map

| ATS | Detection | API endpoint pattern | Handled by |
|-----|-----------|---------------------|------------|
| **Greenhouse** | `greenhouse.io` in careers_url (direct) | `boards-api.greenhouse.io/v1/boards/{slug}/jobs` | scan.mjs |
| **Ashby** | `ashbyhq.com` in careers_url (direct) | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | scan.mjs |
| **Lever** | `lever.co` in careers_url (direct) | `api.lever.co/v0/postings/{slug}?mode=json` | scan.mjs |
| **Greenhouse** | discovered via HTML/network on branded page | same API as above | custom-scraper (delegates) |
| **Ashby** | discovered via HTML/network on branded page | same API as above | custom-scraper (delegates) |
| **Lever** | discovered via HTML/network on branded page | same API as above | custom-scraper (delegates) |
| **Workday** | discovered via HTML/network | POST `{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` | custom-scraper |
| **SmartRecruiters** | discovered via HTML/network | `api.smartrecruiters.com/v1/companies/{id}/postings` | custom-scraper |
| **BambooHR** | discovered via HTML/network | `{company}.bamboohr.com/careers/list` | custom-scraper |
| **Recruitee** | discovered via HTML/network | `{company}.recruitee.com/api/offers/` | custom-scraper |
| **Personio** | discovered via HTML/network | `{company}.jobs.personio.de/api/v1/jobs` | custom-scraper |
| **TeamTailor** | discovered via HTML/network | `api.teamtailor.com/v1/jobs` (token required) | custom-scraper |
| **Rippling** | `rippling.com` in careers_url | No public API — Playwright required | custom-scraper |
| **iCIMS** | `icims.com` in careers_url | Complex semi-private — Playwright required | custom-scraper |
| **Custom/unknown** | no ATS discovered | Playwright generic DOM extraction | custom-scraper |

**scan.mjs handles:** Greenhouse, Ashby, Lever ONLY when careers_url directly contains the ATS domain.
**custom-scraper.mjs handles:** all companies scan.mjs skips. Uses ATS discovery to find hidden Greenhouse/Ashby/Lever behind branded career pages, then calls the same APIs.

---

## ATS Discovery Layer

**Problem:** portals.yml career URLs are branded landing pages (e.g. `runwayml.com/careers`), not ATS API URLs. ~437 companies are listed as "generic" but many secretly use Greenhouse/Ashby/Lever/Workday behind their own domain. Discovery must be fully automated — no manual URL updating.

**Solution:** Three-tier discovery runs per company before dispatch. Results are cached in `data/ats-discovery-cache.json` with a 30-day TTL. portals.yml is never mutated.

### Tier 1 — Plain fetch + HTML regex (fastest, zero browser)

Fetch the careers_url with plain `fetch()`, then search the raw HTML for known ATS fingerprints:

| Pattern | Detects |
|---------|---------|
| `boards\.greenhouse\.io/(?:embed/job_board/js\?for=)?([a-z0-9-]+)` | Greenhouse widget/iframe |
| `job-boards(?:\.eu)?\.greenhouse\.io/([a-z0-9-]+)` | Greenhouse job board link |
| `jobs\.ashbyhq\.com/([a-z0-9-]+)` | Ashby embed/link |
| `jobs\.lever\.co/([a-z0-9-]+)` | Lever embed/link |
| `([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com/([^/"?#\s]+)` | Workday (tenant + instance + site) |
| `([a-z0-9-]+)\.smartrecruiters\.com` | SmartRecruiters |
| `([a-z0-9-]+)\.bamboohr\.com` | BambooHR |
| `([a-z0-9-]+)\.recruitee\.com` | Recruitee |

If matched: cache and proceed to dispatch. Skip Tier 2.

### Tier 2 — Playwright network interception (catches JS-loaded ATSes)

Launch Playwright, navigate to the careers_url, intercept all XHR/fetch requests. Watch for calls to known ATS API hostnames:

- `api.ashbyhq.com`, `boards-api.greenhouse.io`, `api.lever.co`
- `*.myworkdayjobs.com`, `api.smartrecruiters.com`, etc.

Extract slug from intercepted URL. Cache and dispatch. This catches single-page apps that load job widgets dynamically.

### Tier 3 — Generic DOM extraction (final fallback)

Playwright renders the page and extracts job titles + URLs via generic link/text heuristics. No ATS identified — scrapes what it sees.

### Cache format (`data/ats-discovery-cache.json`)

```json
{
  "Runway": { "ats": "greenhouse", "slug": "runwayml", "discovered": "2026-04-19" },
  "Sierra": { "ats": "ashby", "slug": "sierra", "discovered": "2026-04-19" },
  "Glean": { "ats": "workday", "tenant": "glean", "instance": "wd3", "site": "Glean", "discovered": "2026-04-19" }
}
```

- Key: company name (matches `name` field in portals.yml)
- TTL: 30 days from `discovered` date — stale entries re-run discovery
- portals.yml is never touched by discovery

### Playwright concurrency

- Browser tasks (Tier 2 + 3): ≤ 5 concurrent
- API tasks (post-discovery): ≤ 10 concurrent

---

## Known Limitation: Career URL Landing Pages

Some `careers_url` entries in portals.yml point to a company's **generic careers introduction page** (marketing copy, "Life at Company", benefits overview) rather than the page that actually loads job listings. This causes silent empty results across all three tiers:

- **Tier 1** fetches the page but finds no ATS fingerprints — no Greenhouse/Ashby/Lever URLs are embedded in a page that has no job widget
- **Tier 2** navigates via Playwright but intercepts no ATS XHR calls — a landing page makes no job API requests
- **Tier 3** sees no job links in the DOM — nothing to extract

**This is not a scraper bug.** The URL is correct as a company entry point but wrong as a job listings entry point.

**How to detect after a run:** companies that return zero jobs AND have no ATS discovery cache entry after Tier 2 completes are candidates for this issue. Cross-reference with the Excel source — if the Excel shows a direct ATS URL for that company, update `careers_url` in portals.yml to the ATS URL or the specific jobs subpage (e.g., `company.com/careers/jobs` instead of `company.com/careers`).

**portals.yml is never auto-mutated** — URL corrections must be made manually after inspecting the company's career page.

---

## Per-Site UI Handling Strategy

**Approach: base script + iterative fallback (not pre-planned per-site)**

1. Build a generic Playwright handler covering common patterns:
   - Paginated job listing pages
   - "Load More" / infinite scroll buttons
   - Standard HTML job card extraction (title, URL, location, date)
   - Fetch + cheerio for non-JS-rendered pages (faster, zero browser)
2. Run against all custom-scraper companies
3. Collect failures and empty results (logged to `batch/logs/`)
4. Write site-specific handlers for the ~20–30 that fail
5. Site-specific handlers live as named functions in custom-scraper.mjs, keyed by company name from portals.yml

**Decision rationale:** Pre-planning 130 different career page UIs upfront is wasted effort. Most sites follow one of 4–5 patterns. The ~20–30 outliers get handled after observation, not speculation.

---

## Filtering Strategy

### What can be filtered at scrape time

| Filter | Reliable? | How |
|--------|----------|-----|
| Job title keywords | Yes | portals.yml positive/negative lists, applied post-fetch |
| Employment type (full-time) | Partial | Query param on Greenhouse/Ashby; post-filter on others |
| Location | Loose | Query param on some APIs; many listings have inconsistent data |
| Date posted | Yes | `updated_after` param on most APIs; skip stale on re-scans |
| Salary/comp | No | Only ~30% of postings list it; record when present, never gate |

### Matching pipeline (three stages, ascending cost)

| Stage | Method | Where | Token cost |
|-------|--------|--------|-----------|
| Title filter | Case-insensitive substring match against portals.yml keywords | Scraper | Zero |
| Description pre-filter | BM25 via `natural` npm package | Scraper (optional) | Zero |
| Full evaluation | LLM via career-ops pipeline (blocks A–G) | Evaluation phase only | ~2K–4K tokens/job |

**Title matching uses exact substring, not BM25.** Titles are short; the positive/negative keyword lists in portals.yml are comprehensive enough. BM25 is only worth adding for description pre-filtering to reduce false positives before human review.

**LLM evaluation is gated by human review** — only jobs approved in the Excel review get sent to `/career-ops pipeline`. Scraping 130 companies × 50 jobs = up to 6,500 postings costs zero tokens.

---

## Tool Choice: Playwright vs Alternatives

| Tool | Speed | JS support | When to use |
|------|-------|-----------|-------------|
| `fetch` + `cheerio` | Fast | No | Static/SSR pages, any ATS with a clean API response |
| **Playwright** (installed) | Medium | Yes | Workday, Rippling, custom React/Next.js career pages |
| Firecrawl | SaaS, credit-metered | Yes | **Current Phase 2.8 primary layer** for ATS discovery, no-ATS extraction, and enrichment markdown; see supersession note above |

**Historical decision:** before Phase 2.8, `custom-scraper.mjs` used fetch+cheerio as default and fell back to Playwright only when JS rendering was detected or when the site was on the known Playwright-required list. Current Phase 2.8 design keeps `custom-scraper.mjs` as Layer 3 fallback rather than the primary branded-page path.

---

## Token and Context Window Model

| Phase | Claude involved? | Token cost |
|-------|-----------------|-----------|
| scan.mjs API scraping | No | Zero |
| custom-scraper.mjs Playwright | No | Zero |
| export-jobs.mjs Excel generation | No | Zero |
| Human review of Excel | No | Zero |
| `/career-ops pipeline` evaluation | Yes | ~2K–4K per job |
| `/career-ops pdf` CV generation | Yes | ~3K–5K per CV |

**custom-scraper.mjs runs as a standalone Node.js process, not inside a Claude tool call.** No context window impact during scraping regardless of how many pages are fetched.

---

## Deduplication

- URL-based: check `data/scan-history.tsv` before writing to `data/pipeline.md`
- Company+role-based: secondary check to catch URL variations of the same posting
- Both scan.mjs and custom-scraper.mjs must implement both checks
- On re-scan: use `updated_after` date param where supported to skip already-seen postings
