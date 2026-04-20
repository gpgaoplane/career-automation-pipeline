# Architecture Rules — Career Ops

## Layer Separation

| Layer | Location | Owner | Modify? |
|-------|----------|-------|---------|
| System | `career-ops/CLAUDE.md`, `career-ops/modes/_shared.md`, `career-ops/*.mjs` | career-ops upstream | Never for personalization |
| User config | `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/portals.yml`, `career-ops/cv.md` | Will | Yes — all personalization here |
| Custom scripts | `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs` | This project | Yes |
| Knowledge bank | `context/knowledge bank/` | Will | Read-only reference |

## Custom Scripts — Responsibilities

**`custom-scraper.mjs`** — ATS-discovery + Playwright scraper for companies scan.mjs skips.
- Reads: `portals.yml` (same config as scan.mjs)
- Skips companies where careers_url directly matches greenhouse/ashby/lever (scan.mjs handles those)
- **ATS Discovery (3-tier):** HTML regex → Playwright XHR intercept → generic DOM. Caches results in `data/ats-discovery-cache.json` (30-day TTL). portals.yml is never mutated.
- If discovery finds Greenhouse/Ashby/Lever behind a branded page, calls the same API as scan.mjs
- Writes: `data/pipeline.md` and `data/scan-history.tsv` in same format as scan.mjs
- Never duplicates scan.mjs responsibilities — the two are complementary

**`export-jobs.mjs`** — Converts pipeline + scan history to Excel.
- Reads: `data/pipeline.md`, `data/scan-history.tsv`, `portals.yml` (for company metadata)
- Writes: `output/jobs-YYYY-MM-DD.xlsx`
- Enriches jobs with company rank and category from portals.yml

## Key Architectural Decisions

### Companies are filtered, not hardcoded
The 171-company list is derived from `context/AI_Companies_Consolidated_Ranked_v2.xlsx` at setup time and stored in `portals.yml`. Never hardcode company names in scripts — always read from portals.yml.

### scan.mjs is untouched upstream code
Do not modify `scan.mjs`. Build alongside it (`custom-scraper.mjs`). The custom scraper knows what to skip by checking if careers_url directly contains the ATS domain (same detection logic).

### portals.yml is never mutated by scrapers
ATS discovery results are cached in `data/ats-discovery-cache.json`. portals.yml contains human-curated career page URLs and must not be overwritten by automation.

### Dedup is URL-based + company+role-based
Both scan.mjs and custom-scraper.mjs check against `data/scan-history.tsv` and `data/pipeline.md` to avoid duplicates within and across runs.
