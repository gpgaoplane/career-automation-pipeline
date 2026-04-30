---
status: active
type: context
owner: claude
last-updated: 2026-04-30T00:00:00-04:00
read-if: "you need durable project truths as understood by Claude"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->

## 2026-04-30T00:00:00-04:00 — Phase 2.8 architecture facts (post-Step 5)

Durable invariants surfaced during Phase 2.8 implementation Steps 0-5:

- **`data/ats-discovery-cache.json` has TWO schemas in active use:**
  1. **Legacy (custom-scraper.mjs writes):** `{ats: "workday"|..., tenant, instance, site, discovered: "YYYY-MM-DD"}`. The legacy `site` field sometimes contains a locale string (e.g., `"en-US"`) instead of the actual Workday site path — this is a known custom-scraper.mjs bug that surfaces 404s on the Workday CXS endpoint.
  2. **New (firecrawl-discover.mjs writes):** `{ats: "workday-cxs"|..., host, site, discovered_at: "<ISO>"}`. The new schema also includes `candidates: [...]` for ambiguous results.

  Both schemas are READ by `scripts/ats-adapters/_lib.mjs iterTargets()`. Backward-compat is permanent — DO NOT remove legacy reading code.

- **Provider name aliases:** legacy `ats: "workday"` is treated as equivalent to new `ats: "workday-cxs"` in cache reading. The provider key in `PROVIDER_PATTERNS` and lib/ats-clients.mjs is canonically `workday-cxs`.

- **The 8-provider direct-API tier is canonical:** Greenhouse, Ashby, Lever (in scan.mjs vendored upstream); Workday CXS, SmartRecruiters, Personio, Recruitee, Workable (in lib/ats-clients.mjs + sibling adapters per D-15 and D-19). JazzHR explicitly out-of-scope per AC-9.

- **Cached-discovery vs portals.yml-direct adapters split:**
  - The 5 D-15 adapters (workday-cxs, smartrecruiters, personio, recruitee, workable) handle BOTH portals.yml direct-ATS entries AND cache discoveries.
  - The 3 cached-discovery adapters (greenhouse-cached, ashby-cached, lever-cached, per D-19) handle CACHE-ONLY because scan.mjs (vendored upstream) already handles portals.yml direct-ATS entries for those 3 providers.
  - This asymmetry is documented in `scripts/ats-adapters/README.md`.

- **`safeEncode()` helper in `lib/ats-clients.mjs`:** all slug arguments to fetch functions go through `safeEncode()` (not raw `encodeURIComponent`). Idempotent — handles both raw (`"Jasper AI"`) and already-encoded (`"Jasper%20AI"`) inputs without producing double-encoded results. Required because Layer 1 firecrawl-discover.mjs captures slugs from URL form (already encoded).

- **Sample-50 baseline (Phase 2.7 → 2.8 progression):**
  - Phase 2.7: 13/50 = 26% coverage
  - Phase 2.8 Step 5 (post Layer 0 + Layer 1, no Layer 2): 37/50 = 74% (+2.85x)
  - Expected after P-5/P-6 bug fixes: 41/50 = 82%
  - Expected after Step 6 Layer 2 firecrawl-extract: 45-48/50 = 90-96%
- **Phase 2.8 Firecrawl credit budget:** 101k credits available; first sample-50 smoke run consumed 161 credits (~0.16% of budget). Full Phase 2.6 clean rescan estimated ~1,000-2,150 credits (per design v2 §5.2).

<!-- BEGIN earlier (pre-Phase-2.8) entries -->

## 2026-04-28 — ATS URL distribution in portals.yml (post-audit)

Audited 2026-04-28 against actual `portals.yml`:
- 448 total entries (Excel minus 2 with no URL: Eternal, Treefera)
- **Pre-cleanup state**: 416 enabled, 32 disabled. Of 32 disabled: 16 duplicate-suppression (URL matched an enabled twin) + 16 unique-URL of which only 2 (NVIDIA, Saronic) had clear universal-exclusion reasons. Audit revealed 14 unique-URL disables had no documented reason (likely mis-drops) and 2 enabled companies (Foxconn rank 65, Skydio rank 437) violated universal exclusions.
- **Post-cleanup state** (per D-11): **428 enabled, 20 disabled** — all disabled rows carry explicit `note:` (16 `duplicate-of: <parent>`, 2 `excluded:HW supply chain`, 2 `excluded:defense drones / maritime`).
- ATS distribution within enabled (post-cleanup, corrected after Codex review of design plan v1): **18 direct-ATS** (Greenhouse 8 + Ashby 7 + Workday 3 + 0 Lever; Labelbox and Genmo are both re-enabled and both have direct ATS URLs — Labelbox via Greenhouse, Genmo via Ashby) + **410 branded career pages**.
- The 410 branded pages secretly use Greenhouse/Ashby/Lever/Workday underneath in many cases. `custom-scraper.mjs` Tier 1/2 (HTML regex + Playwright XHR intercept) discovers and API-scrapes them automatically. The Excel source has 100+ companies with known ATS-compatible URLs that get re-discovered during custom-scraper runs.

> Earlier 2026-04-20 entry stated "13 direct / 403 branded". That was incorrect (count drift / earlier data point that pre-dated full audit). Superseded by this entry.

## 2026-04-28 — Filter rationale (post mid-level pivot, per D-7)

**Seniority exclusions** — Will targets **mid-level IC roles only (3-5 YoE)**:
- **Senior, Sr, Sr., Principal** excluded — too senior; Will is intentionally avoiding senior/principal title-inflation expectations (per D-7)
- **Junior, Jr, Jr., Associate** excluded — too junior; below Will's experience band
- **Staff, Lead** excluded — top IC band (above mid-level)
- **VP, Vice President, SVP, EVP, Director, Head of, Managing Director, General Manager, Chief** excluded — management/C-suite, not applicable
- **Intern, internship, co-op, coop, PhD, postdoc** excluded — not relevant to professional IC track

> Earlier 2026-04-20 entry stated "Will targets mid-to-senior IC roles (Senior, Principal)". Superseded by D-7 pivot on 2026-04-28 — Will now targets mid-level only.

**Region exclusions** — only US/Canada/China/HK/Chinese-speaking regions are valid work bases. All others excluded. The filter catches roles that include location in the title (e.g., "Enterprise AE, Europe"). Roles with no location in the title are evaluated at the per-job stage.

**Language exclusions** — only English and Mandarin/Chinese are acceptable. The 16 language adjectives in the filter cover both "German speaking" and ", German" suffix formats in job titles (e.g., "Account Executive, German" matches because "German" is the substring).

## 2026-04-20 — Vendored upstream is sacred

The `career-ops/` subdirectory is a **separate git repo** (vendored upstream tool). Its `CLAUDE.md`, `AGENTS.md`, `scan.mjs`, and entire `.claude/` directory belong to the upstream maintainer. Never edit for personalization. All customization belongs in `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/portals.yml`, `career-ops/cv.md`. The agent-collab framework operates only at repo root and never recurses into `career-ops/`.

## 2026-04-28 — Pre-scoring system designed (D-9, D-10)

Rule-based pre-scoring system designed for `export-jobs.mjs` to drop manual-review burden from ~1000 jobs to ~50 jobs (S-tier). Two components:

**Title-based** (computed at export time from `pipeline.md` data):
- Track weights: AI-ENG=5, GEN-AI=5, SA=4, PM=4, CONSULT=3, CREATIVE=3, AE=3
- Multi-track bonus: +1
- Rank tier: 1-50=4, 51-150=3, 151-300=2, 301-450=1
- Category alignment: +2 if category in preferred list
- Title Strength Signal: Senior/Principal in title = -2 (slip-through); Junior/Associate = -2

**Description-based** (computed at enrichment time, cached):
- Toronto/GTA/Ontario: +2
- Fully remote US: +4
- Comp ±1 per $10K vs target floor (USD $120K / CAD $110K), no cap
- Track keywords (RAG, agentic, etc.): +1 per unique, cap +3
- Tech stack: +1 per unique, cap +2
- YoE 3-5: +1; 6+: -1; 0-2: -1
- Deal-breaker phrases: -5 to -10

Banding: S ≥12, A 8-11, B 4-7, C ≤3.

**Description enrichment** (D-10): new script `career-ops/enrich-jobs.mjs`, fetches each pipeline URL once, caches text + extracted signals in `data/job-descriptions-cache.json` (7-day TTL per URL). Tier-1 HTTP → Tier-2 Playwright fallback. Sequential per D-8.

**Full design:** `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`.

## 2026-04-28 — Multi-agent-collab framework adopted

The repo is now bootstrapped with `multi-agent-collab v0.4.1` for Claude+Codex collaboration. Two agents share equal ownership of project development. The shared contract lives in `AI_AGENTS.md`; per-agent adapters in `.claude/CLAUDE.md` and (when Codex joins) `.codex/CODEX.md`. Memory split into core-five (state/context/decisions/pitfalls) per agent, plus outward-facing work logs at `docs/agents/<agent>.md`. End-of-task Receipts and the fan-out routing matrix (`.collab/ROUTING.md`) are non-negotiable for substantive tasks.

<!-- section:entries:end -->
