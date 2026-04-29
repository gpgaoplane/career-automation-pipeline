---
status: active
type: decisions
owner: claude
last-updated: 2026-04-28T22:05:11-04:00
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

## D-7 — Profile pivot to mid-level (3-5 YoE) — 2026-04-28

**Context:** Will is currently positioned at "Senior/Principal" IC band per `career-ops/modes/_profile.md` (archetype `level: "Senior"` / `"Mid-Senior"`), `career-ops/config/profile.yml` archetype levels, and via positive title-filter terms `"Senior AI"`, `"Principal AI"`, `"Senior Product Manager"` in `career-ops/portals.yml`. The hiring market for those bands expects 7+ years experience and management-readiness signals that Will is intentionally not chasing.

**Alternatives:**
- Keep senior positioning, hope market for senior IC roles softens
- Pivot to mid-level (3-5 YoE)
- Pivot to broader "any-level" positioning

**Choice:** Pivot to **mid-level** (3-5 YoE).

**Rationale:** Per Will: *"Will wants to be reclassified into the mid-level pool to avoid senior/principal title inflation expectations."* Mid-level is the band where Will's 3-year Dalamula production track-record fits cleanly without competing against 7+ year IC-management hybrids. Hiring volume is also larger at mid-level than at senior IC.

**Tradeoffs:**
- Some matched roles in scan-v1 baseline (the 1406-job tag `scan-v1-unfiltered`) will no longer be relevant after the title filter rejects Senior/Principal roles. Mitigation: clean rescan post-pivot is the new "after" baseline.
- Adaptive framing in `modes/_profile.md` and CV emphasis may need re-tuning to position Dalamula founder timeline as "3 years building production AI" rather than "founder who oversaw senior IC work". Out of scope for this design plan; flagged for future tuning if interview signals call it out.

**Propagation files** (all touched by implementation plan, not by this decision recording): `career-ops/portals.yml` (filter rewrite), `career-ops/modes/_profile.md` (archetype levels), `career-ops/config/profile.yml` (archetype levels), `AI_AGENTS.md` (Filter rationale section), `.claude/memory/context.md` (2026-04-20 filter rationale entry).

## D-8 — Sequential processing for clean rescan — 2026-04-28

**Context:** Clean rescan of 416 enabled companies (post-audit: 428) via `custom-scraper.mjs` Playwright will take ~90-180 min sequentially or ~15-40 min at concurrency=10. Concurrency requires single-writer pattern for `scan-history.tsv` and `ats-discovery-cache.json`, SIGINT cleanup, browser-context pool — ~1-2 hours of dev work plus testing.

**Alternatives:**
- Sequential processing
- Bounded concurrency at 5
- Bounded concurrency at 10
- Batched (chunks of 50-100 sequential)

**Choice:** **Sequential** for the clean rescan baseline. Concurrency deferred until weekly rescan cadence justifies the dev investment.

**Rationale:**
- First clean rescan = single source of truth for the post-pivot pipeline; we want it boring and observable, not the debut of new code paths.
- Implementation cost (1-2 hours) > time saved on this run (75 min difference).
- P-1 landing-page audit is dramatically easier with serial logs.
- Resume on Ctrl-C is already free via `scan-history.tsv` dedup.
- If weekly rescans become the cadence, build concurrency as a separate enhancement (`feat/concurrent-scraper`) with full single-writer + SIGINT discipline.

**Tradeoffs:** Wall-clock 90-180 min for the rescan. Acceptable given resume-safety and audit ergonomics.

**Trigger to revisit:** documented weekly rescan cadence proving worthwhile, or pain point on a specific multi-rerun debug session.

## D-9 — Pre-scoring scheme — 2026-04-28

**Context:** Clean rescan will produce ~1000+ jobs in `pipeline.md`, sorted only by company rank in current Excel. Manual review of all 1000 is prohibitive. Need a rule-based pre-score that ranks jobs by Will-fit before manual review, no LLM cost.

**Alternatives:**
- LLM-based pre-evaluation of all 1000 jobs (expensive)
- Title-only rule-based pre-score (cheap; shallow)
- Title + description rule-based pre-score with caching (mid-effort; rich)
- Defer all scoring to existing `/career-ops pipeline` LLM eval (no pre-filter)

**Choice:** Title + description rule-based pre-score. Components and weights:

**Title-based component:**
- Track weights: AI-ENG=5, GEN-AI=5, SA=4, PM=4, CONSULT=3, CREATIVE=3, AE=3
- Multi-track bonus: +1 (capped at effective weight 6)
- Company rank tier: top-50=4, 51-150=3, 151-300=2, 301-450=1
- Category alignment: +2 if category in Will's preferred list
- Title Strength Signal (renamed from Title Weakness): Senior/Sr/Sr./Principal in title = -2 (slip-through penalty); Junior/Jr/Jr./Associate/Intern = -2

**Description-based component:**
- Toronto/GTA/Ontario in description: +2
- Hybrid Toronto: +2 (not double-counted with above)
- Canada-only: +2
- Fully remote US (100% remote, US-based): +4 (highest band)
- Comp visible above target floor: +1 per $10K above (USD floor = $120K, CAD floor = $110K). No cap.
- Comp visible below target floor: -1 per $10K below. No cap.
- Track keywords matched in body (RAG, multi-agent, agentic, etc.): +1 per unique, cap +3
- Tech-stack matches (Python, PyTorch, LangChain, etc.): +1 per unique, cap +2
- YoE indicator 3-5 years: +1; 6+ years: -1; 0-2 years: -1
- Hard deal-breaker phrases: -5 to -10
- Toronto on-site 4-5 days/week + comp <$120K CAD: -3

**Banding:**
- S-tier: pre_score ≥ 12
- A-tier: 8-11
- B-tier: 4-7
- C-tier: ≤ 3

**Sort:** pre_score desc, rank asc tiebreaker.

**Rationale:**
- Manual review surface drops from 1000 → ~50 (S-tier).
- Description signals are far richer than title alone (location, comp, tech).
- Cache (per §10 of design plan) makes re-scoring cheap.
- Weights derived directly from Will's stated priorities; transparent and tunable.

**Tradeoffs:**
- ~30-60 min one-time enrichment cost per scan (sequential HTTP fetches).
- Some signal-extraction regex false positives (mitigated by calibration pass against scan-v1 baseline).
- Weights are heuristic; band thresholds will need calibration after first run.

**Full design:** see `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` §7-§9.

## D-10 — Description enrichment as separate step — 2026-04-28

**Context:** Description-based pre-scoring requires fetching each job's description page text. Could happen at scrape time (within `scan.mjs` / `custom-scraper.mjs`) or as a separate post-scrape step.

**Alternatives:**
- Fold into scrape step (modify `custom-scraper.mjs`)
- Build separate `enrich-jobs.mjs` between scrape and export
- Move description-based scoring into LLM evaluation (no pre-fetch)

**Choice:** Build separate `career-ops/enrich-jobs.mjs`.

**Rationale:**
- Keeps `scan.mjs` (vendored upstream) untouched — preserves D-3 invariant.
- Keeps `custom-scraper.mjs` focused on its current job (URL discovery + dedup).
- Cache (`data/job-descriptions-cache.json`, 7-day TTL per URL) makes re-runs cheap.
- Cleanly separable failure mode: enrichment failure doesn't break the scrape; scrape success is independent.
- Allows iterating on signal-extraction logic without re-fetching (future `--recompute-signals` flag).

**Tradeoffs:**
- New script to maintain (~250 lines).
- Adds a step to `npm run full-scan` chain.
- Requires Playwright fallback for JS-rendered descriptions (already used by `custom-scraper.mjs`, so reusable).

**Cache schema, fetch policy (Tier 1 HTTP → Tier 2 Playwright fallback), failure modes, rate limiting:** see design plan §10.

## D-11 — portals.yml audit cleanup — 2026-04-28

**Context:** Audit of `career-ops/portals.yml` revealed 32 disabled companies with no documented reasons; 14 of them had unique URLs and matched Will's target tracks (likely mis-drops). Two enabled companies (Foxconn rank 65, Skydio rank 437) violate Will's universal exclusions (HW supply chain, defense drones).

**Alternatives:**
- Leave as-is (status quo)
- Re-enable only the 14 mis-drops, leave inversions alone
- Re-enable 14 + disable 2 inversions (full cleanup)
- Defer cleanup until evaluation phase reveals actual fit issues

**Choice:** Full cleanup — re-enable 14 mis-drops, disable 2 inversions, add explicit `note:` to all 20 final disabled rows.

**Rationale:**
- The 2 inversions actively scrape companies that violate Will's stated universal exclusions — silent rule violation.
- The 14 mis-drops omit ~14 high-relevance companies (Cursor, Sierra, Tempus, etc.) from the scan surface; their absence is unexplained.
- Adding explicit `note:` to every disabled row ensures no future "implicit decision" — every disable is auditable.
- One canonical roster artifact at `docs/design/companies-roster.md` provides human-readable view of the 448-row source of truth.

**Final inventory:**
- Total: 448
- Enabled: 428
- Disabled: 20 (all with explicit notes: 16 `duplicate-of: <parent>`, 2 `excluded:HW supply chain`, 2 `excluded:defense drones / maritime`)
- Direct-ATS (`scan.mjs`): 17 (was 16; +1 from Labelbox re-enabled with direct Greenhouse URL)
- Branded (`custom-scraper.mjs`): 411 (was 400; +11 from re-enables, −2 from inversions disabled)

**Tradeoffs:**
- 14 re-enables are best-guess; some may turn out genuinely irrelevant after rescan (e.g., Tome may be defunct). Mitigation: roster artifact for visual audit; if zero results consistently, re-disable in a follow-up cleanup with the right `note:`.
- scan-v1 baseline (1406 jobs) is now incomparable for "job quality" — only useful as a filter-effectiveness baseline.

**Full file-by-file changes:** see `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` §4 and §5.1.

<!-- section:entries:end -->
