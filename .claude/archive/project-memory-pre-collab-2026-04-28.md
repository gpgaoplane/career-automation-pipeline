# Project Memory — Career Automation Pipeline

In-repo committed memory layer. Add entries here for decisions, discoveries, and context that should travel with the repo and persist across machines. For machine-local corrections and tool failures, use `~/.claude/projects/D--Projects-career-ops/memory/`.

---

## Architecture Decisions

**2026-04-18 — career-ops absorbed into parent repo**
Stripped `career-ops/.git` and made it a plain directory owned by this repo. santifer/career-ops added as `upstream` remote for occasional manual pulls. Decision: single repo is simpler given deep customization of career-ops for Will's use.

**2026-04-18 — Scraping tool choice locked**
fetch+cheerio for static/API-backed pages; Playwright (already installed) for JS-heavy sites (Workday, Rippling, iCIMS). No Firecrawl — unnecessary cost. See `docs/design/scraping-architecture.md` for full ATS map.

**2026-04-18 — Matching strategy locked**
Three-stage: title substring match (zero tokens) → BM25 description pre-filter (optional, zero tokens) → LLM evaluation (gated by human review). No semantic embedding at scrape time.

**2026-04-18 — Per-site UI handling**
Base script + iterative fallback. Do not pre-plan all 130 sites. Write site-specific handlers only after observing failures.

**2026-04-19 — ATS API detection is first-priority in custom scraper**
career-ops scan.mjs is insufficient at 400+ company scale: Playwright-only (slow, context-heavy), no pagination handling, title-keyword filtering only. For 400+ companies the custom scraper must detect which ATS platform each company uses and hit the JSON endpoint directly — Greenhouse (`api.greenhouse.io/v1/boards/{slug}/jobs`), Lever (`api.lever.co/v0/postings/{slug}`), Ashby (GraphQL), Workday (paginated JSON but consistent), BambooHR (`{co}.bamboohr.com/jobs/embed2/`). These return all jobs at once with no browser rendering. Playwright fallback only for custom career pages. This is a revision to the 2026-04-18 fetch+cheerio decision — ATS API detection goes before fetch+cheerio in the priority chain.

---

## Company / Portal Notes

<!-- Add per-company scraping notes here as they are discovered -->
<!-- Format: **CompanyName** — note (date) -->

---

## Known Issues

<!-- Add active bugs or unexpected behaviors here -->
<!-- Remove entries when resolved -->

---

## Session Handoff Notes

<!-- Latest session note lives here as a quick-access copy of docs/STATUS.md handoff -->
**2026-04-18:** Framework fully locked. Git repo initialized and pushed to gpgaoplane/career-automation-pipeline. SCF gaps fixed. Scenario routing added to CLAUDE.md. Scraping architecture documented. Next: execute config files plan (docs/plans/2026-04-17-career-ops-config-files.md) — cv.md, profile.yml, _profile.md, portals.yml, data/ init.
