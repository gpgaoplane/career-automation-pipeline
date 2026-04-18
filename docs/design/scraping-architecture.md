# Scraping Architecture — Design Decisions

Locked down 2026-04-18. Reference before modifying any scraper or adding companies.

---

## ATS API Map

| ATS | Detection pattern | API endpoint pattern | Priority |
|-----|------------------|---------------------|----------|
| **Greenhouse** | `greenhouse.io` in careers_url | `boards-api.greenhouse.io/v1/boards/{slug}/jobs` | High — handled by scan.mjs |
| **Ashby** | `ashbyhq.com` in careers_url | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | High — handled by scan.mjs |
| **Lever** | `lever.co` in careers_url | `api.lever.co/v0/postings/{slug}?mode=json` | High — handled by scan.mjs |
| **Workday** | `myworkdayjobs.com` in careers_url | POST `{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/Recruiting/jobs` | High — build in custom-scraper |
| **SmartRecruiters** | `smartrecruiters.com` in careers_url | `api.smartrecruiters.com/v1/companies/{id}/postings` | Medium |
| **BambooHR** | `bamboohr.com` in careers_url | `{company}.bamboohr.com/careers/list` | Medium |
| **Recruitee** | `recruitee.com` in careers_url | `{company}.recruitee.com/api/offers/` | Low — EU-heavy |
| **Personio** | `personio.de` in careers_url | `{company}.jobs.personio.de/api/v1/jobs` | Low — EU-heavy |
| **TeamTailor** | `teamtailor.com` in careers_url | `api.teamtailor.com/v1/jobs` (token required) | Low |
| **Rippling** | `rippling.com` in careers_url | No public API — Playwright required | Low |
| **iCIMS** | `icims.com` in careers_url | Complex semi-private — Playwright required | Low |
| **Custom/unknown** | No known ATS detected | Playwright generic handler | Fallback |

**scan.mjs handles:** Greenhouse, Ashby, Lever (auto-detected, do not replicate)
**custom-scraper.mjs handles:** all others above + generic fallback

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
| Firecrawl | Slow (SaaS) | Yes | Not used — unnecessary cost given Playwright is installed |

**Decision:** custom-scraper.mjs uses fetch+cheerio as default, falls back to Playwright only when JS rendering is detected or when the site is on the known Playwright-required list (Workday, Rippling, iCIMS).

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
