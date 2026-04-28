---
status: active
type: context
owner: claude
last-updated: 2026-04-28T18:54:45-04:00
read-if: "you need durable project truths as understood by Claude"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->

## 2026-04-20 — ATS URL distribution in portals.yml

After the Phase 2 data-quality URL fix:
- **13 companies** have direct ATS URLs (`jobs.ashbyhq.com`, `job-boards.greenhouse.io`, `jobs.lever.co`) → handled by `scan.mjs`
- **403 companies** have branded career pages (`company.com/careers`) → handled by `custom-scraper.mjs` via 3-tier discovery
- Many of the 403 branded pages secretly use Greenhouse/Ashby/Lever/Workday underneath. Tier 1/2 (HTML regex + Playwright XHR intercept) discovers and API-scrapes them automatically. The Excel source has 100+ companies with known ATS-compatible URLs that get re-discovered during custom-scraper runs.

## 2026-04-20 — Filter rationale (seniority / region / language)

**Seniority exclusions** — IC band too high or wrong type:
- Staff, Lead excluded — Will targets mid-to-senior IC roles (Senior, Principal), not the top IC band
- VP, Vice President, SVP, EVP, Director, Head of, Managing Director, General Manager, Chief excluded — management/C-suite, not applicable

**Region exclusions** — only US/Canada/China/HK/Chinese-speaking regions are valid work bases. All others excluded. The filter catches roles that include location in the title (e.g., "Enterprise AE, Europe"). Roles with no location in the title are evaluated at the per-job stage.

**Language exclusions** — only English and Mandarin/Chinese are acceptable. The 16 language adjectives in the filter cover both "German speaking" and ", German" suffix formats in job titles (e.g., "Account Executive, German" matches because "German" is the substring).

## 2026-04-20 — Vendored upstream is sacred

The `career-ops/` subdirectory is a **separate git repo** (vendored upstream tool). Its `CLAUDE.md`, `AGENTS.md`, `scan.mjs`, and entire `.claude/` directory belong to the upstream maintainer. Never edit for personalization. All customization belongs in `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/portals.yml`, `career-ops/cv.md`. The agent-collab framework operates only at repo root and never recurses into `career-ops/`.

## 2026-04-28 — Multi-agent-collab framework adopted

The repo is now bootstrapped with `multi-agent-collab v0.4.1` for Claude+Codex collaboration. Two agents share equal ownership of project development. The shared contract lives in `AI_AGENTS.md`; per-agent adapters in `.claude/CLAUDE.md` and (when Codex joins) `.codex/CODEX.md`. Memory split into core-five (state/context/decisions/pitfalls) per agent, plus outward-facing work logs at `docs/agents/<agent>.md`. End-of-task Receipts and the fan-out routing matrix (`.collab/ROUTING.md`) are non-negotiable for substantive tasks.

<!-- section:entries:end -->
