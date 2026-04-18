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
