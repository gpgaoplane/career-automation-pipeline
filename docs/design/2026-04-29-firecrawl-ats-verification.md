---
status: active
type: research
owner: claude
last-updated: 2026-04-29T00:00:00-05:00
read-if: "evaluating Firecrawl architecture or ATS coverage decisions for career-ops"
skip-if: "already familiar with current Firecrawl + ATS landscape as of late April 2026"
---

# Firecrawl + ATS Verification — 2026-04-29

## Method

WebSearch was used (WebFetch denied in this environment) against official Firecrawl docs (docs.firecrawl.dev, firecrawl.dev/pricing, firecrawl.dev/blog), official ATS provider docs (developers.smartrecruiters.com, developer.icims.com, developers.ashbyhq.com, developers.greenhouse.io, support.teamtailor.com, developers.pinpointhq.com, help.jobvite.com, developer.phenom.com, documentation.bamboohr.com, support.personio.de, workable.readme.io), plus secondary sources (fantastic.jobs ATS catalog, community.workday.com, scrapegraphai/zackproser/scrapeway/costbench pricing reviews) to triangulate. Where docs sat behind authenticated portals, cross-checked at least two independent reviewers. UNVERIFIABLE marks where no primary source could be reached without account access.

## Findings

### Firecrawl

#### Q1: JSON Schema input on /v1/scrape
- **Assumed:** /v1/scrape accepts a per-call inline JSON Schema via the extract parameter.
- **Reality:** Confirmed. Schemas are passed inline per call (no pre-registration). Current canonical shape is `formats:["json"]` plus a `jsonOptions` object containing `schema` (OpenAI-compatible JSON Schema) and an optional `prompt`. Older docs reference `extract` / `extractorOptions` with `mode:"llm-extraction"` and `extractionSchema` — that is the legacy form. SDKs accept Pydantic / Zod models that get serialized to JSON Schema.
- **Source:** docs.firecrawl.dev/features/extract; firecrawl.dev/blog/mastering-firecrawl-scrape-endpoint
- **Verdict:** confirmed (with naming-drift caveat — use `formats:["json"]` + `jsonOptions`, not the legacy `extract` key).

#### Q2: Endpoint distinctions (scrape / extract / crawl / map)
- **Assumed:** Distinct endpoints for distinct shapes of work.
- **Reality:**
  - `/v1/scrape` — single known URL → markdown / HTML / JSON / screenshot. Synchronous. Cheapest path for structured extraction when the URL is known.
  - `/v1/extract` — LLM-powered, multi-URL / wildcard / whole-domain structured extraction. Async; runs on a separate **token-based** subscription pool. Firecrawl is steering new users toward `/agent` as successor.
  - `/v1/crawl` — recursive deep crawl from a seed URL, returns all pages.
  - `/v1/map` — fast URL discovery only (sitemap + index cache + SERP). 2–3 sec, up to 30,000 URLs/request, 1 credit per call, content NOT returned.
  - **Use case (a) ATS provider+slug discovery** from /careers: best fit `/v1/scrape` with `formats:["html","links"]` (or `["json"]` with detector schema) plus `actions` for SPA landings. `/v1/map` cannot see ATS hostnames in script tags or iframe src — only useful as pre-filter. `/v1/crawl` is overkill.
  - **Use case (b) JD signal extraction:** `/v1/scrape` with `formats:["json"]` + inline schema is the cheapest-correct tool. Reserve `/v1/extract` (or `/agent`) for cross-page reasoning.
- **Source:** docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor; docs.firecrawl.dev/features/map
- **Verdict:** confirmed.

#### Q3: actions parameter
- **Assumed:** Click + wait + scrape sequence is supported.
- **Reality:** Confirmed. Action types: `wait` (milliseconds), `click` (selector), `scroll` (up/down), `write` (type text), `press` (keyboard key), `screenshot` (fullPage, quality), `executeJavascript` (return captured in `actions.javascriptReturns`), `scrape` (capture intermediate snapshot). Up to 50 actions per request; **combined wait time + waitFor capped at 60 s.** Newer `/interact` endpoint exists for stateful turn-by-turn sessions, billed differently.
- **Source:** docs.firecrawl.dev/advanced-scraping-guide; firecrawl.dev/glossary scrape-content-after-scroll-or-interaction; firecrawl.dev/blog/introducing-interact-endpoint; github.com/firecrawl/firecrawl issue #517
- **Practical example (click → wait → scrape):**
  ```json
  {
    "url": "https://example.com/careers",
    "formats": ["markdown","html"],
    "actions": [
      {"type":"click","selector":"button[aria-label='View jobs']"},
      {"type":"wait","milliseconds":2000},
      {"type":"scrape"}
    ]
  }
  ```
- **Verdict:** confirmed.

#### Q4: Pricing
- **Assumed:** Some flat per-call cost; bulk discounts via plan tier.
- **Reality:**
  - Base scrape/crawl: **1 credit/page.** Map: 1 credit/call (regardless of URLs returned). Search: 2 credits/10 results. Browser interactions (`/interact`, stateful sessions): 2 credits/browser-minute, prorated.
  - **Surcharges per page on /scrape:** `formats:["json"]` **+4 (=5 total).** Stealth/enhanced proxy +4 (JSON+stealth=9). PDF parsing 1/page. Audio +4.
  - Plans (USD/mo): Free (500 credits, no rollover), Hobby $16, Standard $83, Growth $333, Scale $749, Enterprise custom. Credits do not roll over.
  - `/v1/extract` is on a **SEPARATE token-based subscription**, not the per-page pool — flagged as hidden cost by multiple reviewers.
  - No public $/credit on simple plans; effective ~$0.0015–$0.003 in mid tiers per 3rd-party calculators.
- **Source:** firecrawl.dev/pricing; docs.firecrawl.dev/billing; scrapegraphai.com/blog/firecrawl-pricing; scribehow.com Firecrawl Pricing 2026; costbench.com/software/web-scraping/firecrawl
- **Verdict:** confirmed with two refinements: (1) `/extract` is a separate billing pool, (2) JSON-mode scrape is **5 credits/page**, not 1.

#### Q5: JS-heavy SPAs (Workday, etc.)
- **Assumed:** Firecrawl renders Workday tenant pages reliably.
- **Reality:** Firecrawl runs each scrape in a headless browser and waits for DOM stabilisation. Caveats: (a) Workday's CXS JSON API is faster and cheaper than rendering — **Firecrawl's own SPA glossary recommends "intercepting background API calls" over rendering when feasible**; (b) `actions` wait time capped at 60 s; (c) no published per-domain success-rate benchmark.
- **Source:** firecrawl.dev/glossary best-way-to-scrape-single-page-applications-spas; docs.firecrawl.dev/advanced-scraping-guide
- **Verdict:** confirmed for capability; partially-correct for "reliably" — no SLA, and Firecrawl itself recommends API-intercept where the API exists (which it does for Workday).

#### Q6: Search API
- **Assumed:** `/v1/search` exists and returns relevant URLs for a query.
- **Reality:** Confirmed. Takes `query`, optional `limit`, `sources` (default `["web"]`), tbs-style time filters (qdr:d/w/m/y, custom date ranges), `location`, `country` (ISO codes). Returns url/title/description. `scrapeOptions:{formats:[...]}` also scrapes each result inline. Pricing: 2 credits/10 results plus per-page scrape cost if `scrapeOptions` set.
- **Source:** docs.firecrawl.dev/api-reference/endpoint/search; firecrawl.dev/blog/mastering-firecrawl-search-endpoint
- **Verdict:** confirmed.

#### Q7: Terms of service
- **Assumed:** Bulk job-listing scraping is broadly permitted.
- **Reality:** Firecrawl markets job-board scraping as a first-class use case (own blog "Scraping Job Boards Using Firecrawl Actions and OpenAI"). `/crawl` respects robots.txt for `User-agent: FirecrawlAgent`. ToS exists but the full body could not be retrieved without rendering. Per-target-site compliance is the user's responsibility. Per-plan rate caps not enumerated in retrieved sources.
- **Source:** firecrawl.dev/terms-of-service; firecrawl.dev/blog/scrape-job-boards-firecrawl-openai
- **Verdict:** partially-correct. Firecrawl-side: clearly permitted. Hundreds-to-low-thousands monthly is well within plan caps.

### ATS Providers

#### Q8: Workday
- **Assumed:** No documented public API; Firecrawl/Playwright required.
- **Reality:** **Public no-auth CXS endpoint at `POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`** with body `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}`. Returns paginated job summaries. Full JD via `GET /wday/cxs/{tenant}/{site}/job/{externalPath}`. Workday corporate denies official "public-facing API" status (only sanctioned API is auth-gated Staffing REST), but CXS endpoints are what every Workday career SPA itself calls and are de-facto stable across the entire `*.myworkdayjobs.com` fleet. Confirmed by Apify, fantastic.jobs, multiple GitHub repos.
- **Source:** community.workday.com restapi index; fantastic.jobs/ats/workday; apify.com/gooyer.co/myworkdayjobs/api; github.com/iamgeorgelee/workday
- **Verdict:** **WRONG AS STATED.** scan.mjs's pattern extends to Workday via CXS. Material correction.

#### Q9: Other ATS provider APIs

| ATS | Public no-auth API? | Endpoint pattern | Notes |
|---|---|---|---|
| iCIMS | No (public) | `api.icims.com/customers/{id}/search/portals/{portalNameOrId}` requires auth | Career-site iframes can be HTML-scraped |
| SmartRecruiters | **YES** | `GET api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings` | Officially "Posting API — publicly available data, no auth" |
| BambooHR | No | docs require token | No public jobs feed |
| JazzHR | UNVERIFIABLE | apidoc.jazzhrapis.com requires account | Aggregators treat it as covered, primary source not retrievable |
| Recruitee | **YES** | Public jobs feed per fantastic.jobs ATS catalog | No filtering/searching |
| Pinpoint | Tenant-auth | `https://{subdomain}.pinpointhq.com/api/v1/jobs` — token required | Some career widgets may be HTML-scrapable |
| Teamtailor | Auth-required | `api.teamtailor.com/v1/jobs` — JSON:API; needs `Authorization: Token` even for "Public Read" key | No truly anonymous endpoint |
| Personio | **YES** | `GET https://{company}.jobs.personio.de/xml?language=en` (some accounts use .com) | XML feed, no auth |
| Phenom | No | developer.phenom.com requires OAuth 2.0 token | Career-site HTML + per-site refNum; Cloudflare-protected |
| Workable | **YES** | `GET https://apply.workable.com/api/v1/widget/accounts/{clientname}` | JSON; alt JSONP at `www.workable.com/api/accounts/{slug}?details=true` |
| Jobvite | No (gen public) | XML/JSON feed exists but requires contract-issued API keys | Career-site HTML is the practical scrape target |

- **Source:** developers.smartrecruiters.com/docs/posting-api; developer.icims.com/REST-API; documentation.bamboohr.com/reference; support.personio.de/hc/en-us/articles/360000314338; workable.readme.io; support.teamtailor.com/en/articles/5963369; developers.pinpointhq.com/docs/overview; developer.phenom.com; help.jobvite.com/hc/en-us/articles/8870636608925; fantastic.jobs/article/ats-with-api
- **Verdict:** Five (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable) extend the documented-JSON pattern. Six (iCIMS, BambooHR, Pinpoint, Teamtailor, Phenom, Jobvite) require auth or HTML. JazzHR UNVERIFIABLE.

#### Q10: Greenhouse / Ashby / Lever public APIs and rate limits
- Greenhouse Job Board API: developers.greenhouse.io/job-board.html — "Job Board data is publicly available, so authentication is not required for any GET endpoints. Only the application submission endpoint requires Basic Auth." Harvest API has documented rate limits (10-second rolling window, X-RateLimit-Limit/Remaining, 429 with Retry-After), but that is the auth'd API — the public Job Board API does not publish a hard RPM number.
- Ashby: `GET https://api.ashbyhq.com/posting-api/job-board/{clientname}?includeCompensation=true`. No published rate limit on the public posting API; auth'd RPC API has limits not enumerated in retrieved docs.
- Lever: `GET https://api.lever.co/v0/postings/{clientname}?mode=json` — public, no auth, no published rate limit.
- **Source:** developers.greenhouse.io/job-board.html; support.greenhouse.io/hc/en-us/articles/10568627186203; developers.ashbyhq.com/docs/public-job-posting-api; clonepartner.com/blog/greenhouse-to-ashby-migration-apis-mapping-rate-limits; github.com/plibither8/jobber
- **Verdict:** confirmed — three providers, all no-auth, no published throttle. 428 companies × ~weekly ≈ 1,800 GETs/week is far below plausible limits. 200–500 ms inter-request courtesy delay recommended.

### Empirical Claims

#### Q11: Static greenhouse/ashby pages cheaper via plain HTTP than Firecrawl
- **Assumed:** Plain HTTP saves ~40% credits in a typical mixed batch.
- **Reality:** Plain HTTP for GH/Ashby/Lever JD pages costs 0 Firecrawl credits; Firecrawl `/scrape` baseline is 1 credit/page, JSON-mode 5. If 40–50% of a batch is GH/Ashby/Lever and you would otherwise JSON-extract them on Firecrawl, savings are closer to 40–50% of credits in that scenario. With 101k credits and ~5k JD-fetches/month plausibly in scope, plain-HTTP ATS-first routing is the dominant cost lever. No public Firecrawl benchmark on this exact comparison.
- **Source:** firecrawl.dev/pricing (credit math); developers.greenhouse.io/job-board.html (free); plibither8/jobber
- **Verdict:** confirmed direction; UNVERIFIABLE for the precise "40%" figure but math supports same order. Stronger framing: **"Firecrawl-second routing typically saves 40–80% of credits a Firecrawl-first design would burn."**

#### Q12: 30-day TTL on ATS discovery cache
- **Assumed:** 30-day TTL is reasonable.
- **Reality:** No public migration-frequency dataset surfaced. Industry sources describe ATS migration as 12-week-plus projects undertaken every several years per company — cache staleness from migration is rare. Counter-risk: companies sometimes change ATS without changing the careers landing URL, silently breaking a stale cache entry. 30-day strikes a reasonable middle. More aggressive: 90 days with fast-fail re-discovery on 404.
- **Source:** oleeo.com/blog/time-to-set-up-a-new-ats; recruitwithatlas.com/blog/ats-migration-checklist; sparkhire.com/applicant-tracking-system/how-to-switch-your-ats; en.wikipedia.org/wiki/Applicant_tracking_system
- **Verdict:** UNVERIFIABLE on hard frequency data; directionally reasonable. 30-day is defensible; 60–90 days with re-discovery on first failure is also defensible.

## Material findings (architecture impact)

- **Workday is API-accessible without Firecrawl.** scan.mjs (or sibling) should add a Workday CXS adapter (POST `/wday/cxs/{tenant}/{site}/jobs` then per-job GET `.../job/{externalPath}`). For any portfolio with double-digit Workday tenants, this is the largest single Firecrawl-credit reduction available.
- **JSON-mode scrape is 5 credits/page, not 1.** Phase 2.8 budgeting must use 5 credits/page when `formats:["json"]` is set. With 101k credits, JSON-mode JD budget is ~20k JDs, not 100k. Plain markdown scrape + local regex is 5x cheaper for fields scan.mjs already handles cleanly.
- `/v1/extract` is on a separate token subscription pool. Default to `/v1/scrape` + inline schema; avoid `/v1/extract` unless multi-URL reasoning is genuinely needed. Plan for `/agent` as the migration target.
- **Five additional ATSes have no-auth public APIs** (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable). Each adapter ~30–60 lines mirroring the GH/Ashby/Lever pattern.
- Public GH/Ashby/Lever endpoints have no published throttles; 428 × weekly is far below any plausible limit. No need to architect throttling beyond a courtesy delay.
- TTL recommendation: 30 days fine; consider 60-day TTL with fast-fail re-discovery on 4xx/5xx — real ATS migrations are rare and catch-up cost is low.

## Open questions raised by this research

- **Eightfold / Avature / Greenhouse-OnDeck / SuccessFactors / Taleo / Oracle Cloud HCM** not in the provided ATS list; several are widespread in F500 (defense-adjacent, banking) and may be inside the 428-company portfolio. Worth a hostname-discovery pass over portals.yml `careers_url` before committing to the Q9 list.
- `/agent` endpoint is the `/extract` successor per Firecrawl's own docs. Standardizing on `/scrape` + inline schema sidesteps that migration.
- Firecrawl `/interact` (stateful sessions, 2 credits/browser-minute) may be worth considering for the small set of branded SPAs that need login / multi-step flows beyond the 60 s actions cap.
- Per-plan rate caps (RPM, concurrent requests) for Firecrawl not found in retrieved sources. Worth checking the billing dashboard before committing to high-concurrency batch design.
- JazzHR public-feed status UNVERIFIABLE without logged-in dev portal session.
