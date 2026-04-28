---
status: active
type: decisions
owner: claude
last-updated: 2026-04-28T18:54:45-04:00
read-if: "you need Claude's major design decisions"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Decision Log

Append new decisions below. Format:

```
## D-<n> — <title> — <ISO-8601>
**Context:**
**Alternatives:**
**Choice:**
**Rationale:**
**Tradeoffs:**
```

<!-- section:entries:start -->

## D-1 — portals.yml as canonical company list — 2026-04-20

**Context:** Need a single source of truth for which companies to scan and what title filters to apply.

**Alternatives:**
- Hardcode company list in `scan.mjs`
- Read from Excel at scrape time
- Use `portals.yml` as static config

**Choice:** `portals.yml`. Derived from `context/AI_Companies_Consolidated_Ranked_v2.xlsx` at setup time. 448 companies (416 enabled, 32 disabled).

**Rationale:** Decouples company curation from scraper code. Both `scan.mjs` (upstream) and `custom-scraper.mjs` (custom) read the same config. `enabled: false` flag deactivates companies (duplicates, acquired, no real presence) without deletion. Title filters live alongside companies for cohesive editing.

**Tradeoffs:** Manual sync from Excel when source updates. Counters: Excel rarely changes; the 32 disabled rows preserve audit trail.

## D-2 — Branded URLs in portals.yml over direct ATS slugs — 2026-04-20 (commit 3429bfa)

**Context:** Phase 2 data quality fix. Initial portals.yml seeded with direct ATS URLs (e.g., `jobs.ashbyhq.com/<slug>`) had incorrect slugs pointing to other companies' boards (the "Runway-adjacent" problem).

**Alternatives:**
- Hand-correct every direct ATS URL
- Replace direct URLs with company-branded career pages
- Mix: keep correct direct URLs, replace incorrect ones

**Choice:** Replace ALL direct ATS URLs in `portals.yml` with each company's branded career page.

**Rationale:** Branded pages are stable. ATS slugs change. `custom-scraper.mjs` 3-tier ATS discovery automatically re-detects underlying ATS (Greenhouse/Ashby/Lever/Workday) and caches results in `data/ats-discovery-cache.json` (30-day TTL). Better to discover than to hand-curate volatile URLs.

**Tradeoffs:** ~100+ companies need re-discovery on every cache expiry. Counter: cache TTL is generous; discovery is fast (Tier 1 HTML regex hits in <1s).

## D-3 — scan.mjs untouched; custom-scraper.mjs built alongside — 2026-04-20

**Context:** Need to handle companies whose careers_url isn't a direct ATS API endpoint.

**Alternatives:**
- Fork `scan.mjs` and add Playwright/discovery logic in-place
- Build separate `custom-scraper.mjs` that complements `scan.mjs`
- Replace `scan.mjs` entirely with a unified scraper

**Choice:** Build `custom-scraper.mjs` alongside `scan.mjs` with strict separation:
- `scan.mjs` (upstream, never modified) handles direct ATS URLs (~13 companies)
- `custom-scraper.mjs` (custom) handles branded pages via 3-tier discovery (~403 companies)
- Both write to the same `pipeline.md` and `scan-history.tsv` in identical formats
- Detection: `custom-scraper.mjs` skips companies whose `careers_url` directly contains `greenhouse.io`/`ashbyhq.com`/`jobs.lever.co`

**Rationale:** Preserves upstream `career-ops` tool integrity. Upstream updates to `scan.mjs` flow in cleanly. Custom logic isolated for clear ownership.

**Tradeoffs:** Two scrapers to maintain. Counter: clear separation; minimal logic overlap; both reuse same data layer.

## D-4 — Two-layer data contract — 2026-04-20

**Context:** `data/applications.md` is the master tracker. Direct edits during batch evaluations risk format drift and merge conflicts.

**Alternatives:**
- Allow direct edits to `applications.md`
- Lock `applications.md` and require all writes via merge script
- Use a database

**Choice:** Two-layer write protocol:
- New entries: write TSV to `career-ops/batch/tracker-additions/{num}-{slug}.tsv`, then `node merge-tracker.mjs` consolidates into `applications.md`
- Status/notes updates on existing rows: direct edit OK
- Run `merge-tracker.mjs` after every batch of evaluations before session ends

**Rationale:** Atomic batched additions; canonical statuses (see `career-ops/templates/states.yml`) enforced at merge time; preserves git diff readability.

**Tradeoffs:** Extra step per evaluation batch. Counter: catches schema violations early; single source of truth for status enum.

## D-5 — 3-tier ATS discovery in custom-scraper.mjs — 2026-04-20

**Context:** Branded career pages (`company.com/careers`) often hide a Greenhouse/Ashby/Lever/Workday backend. Need to detect and call the underlying API for clean structured data.

**Alternatives:**
- Always Playwright-render the branded page and parse DOM
- Detect ATS via single tier (HTML regex only) with DOM fallback
- 3-tier discovery: HTML regex → Playwright XHR intercept → generic DOM

**Choice:** 3-tier discovery with caching.

**Rationale:**
- Tier 1 (HTML regex): cheapest; catches obvious script tags / iframe srcs / hidden links to ATS domains. <1s per company.
- Tier 2 (Playwright XHR intercept): medium cost; intercepts XHR calls during page load to detect ATS API endpoints. Catches lazy-loaded ATS embeds.
- Tier 3 (generic DOM): fallback when no ATS detected; scrapes job links from rendered HTML structure.
- Cache (`data/ats-discovery-cache.json`, 30-day TTL): avoid re-running discovery every scan.
- `portals.yml` is NEVER mutated by automation — discovery results live in cache only.

**Tradeoffs:** Three code paths. Counter: each tier is independent and testable; clear escalation order; first hit wins.

## D-6 — Adopt multi-agent-collab v0.4.1 framework — 2026-04-28

**Context:** User wants to onboard Codex as an equal-partner agent for plan review, code inspection, and parallel development tasks. Need a shared contract + memory model + handoff protocol that both Claude and Codex follow.

**Alternatives:**
- Hand-roll cross-agent conventions in CLAUDE.md / AGENTS.md
- Adopt `multi-agent-collab` framework (`gpgaoplane/multi-agent-collab`)
- Use a single CLAUDE.md and rely on Codex reading it

**Choice:** Adopt `multi-agent-collab v0.4.1` via skill drop-in (`~/.claude/skills/multi-agent-collab`).

**Rationale:**
- Shared contract (`AI_AGENTS.md`) + per-agent adapters (`.claude/CLAUDE.md`, `.codex/CODEX.md`) — clean layer separation.
- Core-five memory model (state, context, decisions, pitfalls) per agent — structured, regular, parsable by other agents.
- Outward-facing work logs (`docs/agents/<agent>.md`) — Codex can read what Claude did and vice versa.
- End-of-task Receipts with fan-out routing matrix — update completeness is visible and non-negotiable.
- Handoff/catchup primitives (`collab-handoff`, `collab-catchup`, `collab-presence`) — formal cross-agent coordination.
- Skill drop-in over npx: same engine, plus auditability (read every script before run) and git-pinning to a known commit.

**Tradeoffs:**
- More structure to maintain (4 memory files per agent + work log + Receipts).
- Some duplication between Claude Code's native memory (`.claude/rules/`, `~/.claude/...`) and framework memory (`.claude/memory/*`). Counter: native rules stay for Claude-Code-specific operational concerns; framework memory is for cross-agent visibility.
- Project content must live OUTSIDE framework markers in `AI_AGENTS.md` (added `## Project Context` section at end) so re-init/upgrade doesn't wipe it.
- Root `CLAUDE.md` becomes a 2-line `@import` shim; depends on Claude Code resolving `@path` imports correctly. Risk: if imports don't resolve, fall back to inlining content.

<!-- section:entries:end -->
