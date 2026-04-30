---
status: active
type: decisions
owner: claude
last-updated: 2026-04-29T19:30:00-04:00
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

## D-12 — Integrate Codex review of Phase 2.7 design plan — 2026-04-28T23:00:00-04:00

**Context:** Codex reviewed the Phase 2.7 design plan v1 (commit `faa3a1a`) and surfaced five issues in §17 review comments + return handoff (commit `021efb5`). Each finding verified against primary sources before integration.

**Alternatives:**
- Reject Codex's findings (would be wrong; all 5 verify against primary sources)
- Defer integration to implementation plan (would mean shipping known-incorrect design)
- Integrate all 5 fixes into design plan v2 + propagate corrections across project

**Choice:** Integrate all 5 fixes into the design plan as v2 + propagate corrections. Design plan revised in-place; Codex's §17 review preserved as the audit trail.

**Findings + fixes:**

1. **Direct/branded count: 17/411 → 18/410.** Codex caught that Genmo (`jobs.ashbyhq.com/genmo`) is direct Ashby and was missed in the count. Verified via python audit. Updated §4.5 of the design plan, AI_AGENTS.md (lines 217 and 288), `docs/STATUS.md` (lines 46, 58, 59), `.claude/memory/context.md` (this file's neighbor).

2. **D-8 ambiguity: clarified as enrichment-only sequential.** scan.mjs has CONCURRENCY=10 and custom-scraper.mjs has CONCURRENCY_API=10/CONCURRENCY_PLAYWRIGHT=5. D-8 wording "sequential clean rescan" was ambiguous. Clarified: enrichment is sequential; existing scraper concurrency is unchanged (out-of-scope per design §2). Adding bounded concurrency to scrapers is still deferred.

3. **Comp scoring inconsistency.** Original §8.1 said "upper bound below floor" → penalty; §8.2 computed `low - floor`; Q-7 said `LOW < FLOOR`. Three inconsistent rules. Fix: §8.1 now says "use lower bound" matching §8.2 + Q-7. Penalty applies even when comp HIGH ≥ floor as long as comp LOW < floor (e.g., $100K-$140K USD with floor $120K → −2 points).

4. **§5.1 propagation map missed stale-count locations.** Codex caught that AI_AGENTS.md still had "416 enabled" at line 217 (Pipeline Architecture diagram) and line 288 (Companies Source); STATUS.md still had "13 companies" / "403 companies" at lines 58-59 (Up Next), and "17 direct + 411 branded" at line 46. §5.1 expanded with explicit rows for each. Acceptance criterion 13 grep expanded to: `Mid-Senior`, `13 / 403`, `13 direct`, `403 branded`, `17 direct`, `411 branded`, `416 enabled`, `32 disabled` (current-state contexts), `~13 companies`, `403 companies`. All stale strings now corrected in this commit.

5. **CREATIVE track had no parser route.** §7.1 assigned `CREATIVE = 3` weight but §6.2 mapped the only relevant YAML group `# ── Generative AI / Creative ──` to GEN-AI only. Fix: split the YAML group during the title_filter rewrite into two new groups — `# ── Generative AI Engineering ──` (5 keywords: LoRA, Stable Diffusion, Video Generation, Content AI, Prompt Engineer) → GEN-AI track, and `# ── Creative ──` (7 keywords: Creative Technologist, Technical Artist, AI Trainer, AI Model Trainer, Image Trainer, Video Trainer, ComfyUI) → CREATIVE track. Added to §5.1 propagation map; documented in §6.2.

**Q-1..Q-8 confirmations from Codex** (no design changes needed beyond §3..§8 fixes above):
- Q-1: keep `--top` default to "show all" (filtering = explicit user choice)
- Q-2: extracted text only in cache (no raw HTML bloat)
- Q-3: add `AI Foundation Models`, `Foundation Models`, `AI Sales / GTM AI`, `AI Data Labeling / Programmatic`. Cautious on `AI Chatbot / Consumer` — xAI/Grok is disabled and shouldn't accidentally become preferred-category evidence.
- Q-4: automatic enrich in `npm run full-scan`, with `--skip-enrich` flag for fast iteration (already locked in §11.2)
- Q-5: keep AI Architect / Enterprise Architect in SA group
- Q-6: re-enable Tome under "no undocumented disables" rule; re-disable later with note if proven defunct
- Q-7: confirmed lower-bound interpretation (already integrated in fix #3)
- Q-8: keep multi-track bonus flat at +1

**Optional improvements integrated:**
- §10.8 log path moved from `career-ops/logs/` to `career-ops/batch/logs/` (matches `custom-scraper.mjs:521` convention)
- §12 #13 "11 files total" corrected to "15 rows / 11 unique files"

**Rationale:**
- All 5 issues verified against primary sources (`career-ops/portals.yml` line numbers, scan.mjs:32, custom-scraper.mjs:29-30, AI_AGENTS.md and STATUS.md greps). No performative agreement; Codex's findings are technically correct.
- Integration in design plan v2 (in-place revision, frontmatter `revision: v2` field added) keeps the plan as a single canonical artifact while preserving Codex's review in §17 for audit.
- Cross-doc propagation done now (decision-recording layer) so the implementation plan can execute the actual config/code edits with fully consistent context.

**Tradeoffs:**
- Adds an integration round-trip; total session count for this work increased from 1 to 2 (worth it for technical correctness).
- Design plan v2 will require Codex re-review only if Codex flagged any "blocker" — the 5 issues were correctness fixes, not architectural challenges, so a full v2 review is optional. Flagging this as an open question for the user: do they want Codex to re-review v2, or proceed straight to implementation plan?

**Implementation impact:**
- Implementation plan must include the YAML group split (5 + 7 keywords moved into two new groups) at the same time as the senior/principal positive removal — same `portals.yml` commit.
- Implementation plan grep audit now expanded; criterion #13 of acceptance must pass for ALL stale strings listed.

## D-13 — Integrate Codex review of implementation plan v1 + add sample-run step — 2026-04-29T00:38:20-04:00

**Context:** Codex reviewed implementation plan v1 (commit `05f6bfc`) and surfaced 5 findings in §20 of the implementation plan. User also proposed running a 100-company sample BEFORE the full Phase 2.6 clean rescan to de-risk the new scripts.

**Choice:** Integrate all 5 Codex findings into implementation plan v2 + add new Step 8.5 (sample run on 100 random companies) per user proposal.

**Findings + integration:**
1. §13 missing criterion #10 + #12 mismatch — ACCEPT. §13.2 gate script now includes a cache-hit-rate ≥0.9 check via `--company` re-run; criterion #12 revised in DESIGN PLAN v2.1 to "static chain verified; live invocation deferred to Phase 2.6" (running full-scan triggers a real scrape, not an implementation acceptance test).
2. §13 grep audit narrower than design — ACCEPT. Added `416 enabled` and `32 disabled` to the term loop, plus `Phase 1 complete|historical|Audited all 32` to the exclusion regex (Phase-1 historical entries legitimately retain those numbers).
3. enrich-jobs.mjs CLI contract incomplete + undocumented `--limit` — ACCEPT. §9.2 module structure now lists all 6 design flags explicitly (`--dry-run`, `--force`, `--company <name>`, `--rate-limit-ms <N>`, `--ttl-days <N>`, `--skip-stale`). §9.5 verification uses `--company "Anthropic"` instead of `--limit`. Added explicit "do NOT introduce a --limit flag" note.
4. export-jobs.mjs missing `--cache-warn-threshold P` — ACCEPT. §10.6 expanded to 3 flags with full pseudocode for the threshold warning logic (warns to stderr, doesn't fail run).
5. Preferred categories placeholder — ACCEPT. §10.3 preferred-categories Set fully spelled out per QI-3 + Codex Q-3: includes `AI Foundation Models`, `Foundation Models`, `AI Sales / GTM AI`, `AI Data Labeling / Programmatic`. EXCLUDES `AI Chatbot / Consumer` (xAI/Grok disabled; consumer chatbots not target track) — explicit comment in source.

**User proposal — Step 8.5 sample run:**
- Random 100 enabled companies (deterministic seed=42 for reproducibility)
- File-swap technique avoids modifying scan.mjs (preserves D-3 invariant): generate `portals-sample-100.yml`, backup live data, swap config, run `npm run full-scan`, inspect, restore
- 9 Sample Run criteria (SR-1..SR-9) covering: scripts complete, pipeline populated, cache writes, Excel structure, banding, --cache-warn-threshold trigger, SIGINT cleanup, reversibility
- ~30-40 min wall-clock
- Validates new scripts end-to-end before committing scan-history.tsv to a real 1000+-job scrape
- Skip condition: user can opt out; plan still functions

**Codex's 2 questions answered:**
- Q1 (revise design crit #12 vs add dry-run target): revised wording to "static chain verified". Live invocation = Phase 2.6 work.
- Q2 (`--limit` test-only flag vs `--company`): use `--company`. Don't expand script surface; design contract is source of truth.

**Codex's optional Foxconn note suggestion:** ACCEPT-defer. Implementation plan already addresses with inline parenthetical. Renaming taxonomy "duplicate-of: <enabled twin>" → "<canonical twin>" is minor stylistic cleanup; defer to future polish pass.

**Rationale:**
- All 5 Codex findings verified against primary sources (path:line citations in implementation plan §20). Each was a real defect: missing acceptance gate, narrower grep, undocumented flag, missing flag, placeholder.
- Sample run de-risks the first end-to-end execution; aligns with engineering practice of "test small before going big". Cost (30-40 min) << value (catch script bugs before they pollute scan-history.tsv).
- File-swap technique preserves D-3 (scan.mjs untouched) — better than adding a `--config <path>` flag to upstream code.

**Tradeoffs:**
- Implementation plan v2 grew with §11A (Step 8.5) — total step count is now 12 instead of 11. Wall-clock estimate increases ~30-40 min.
- Step 8.5 adds a script (`scripts/sample-portals-100.py`) but it's transient (used once per de-risk validation). Not registered in INDEX since it's not a managed file long-term.
- Design plan §12 #12 was revised — first design plan revision since v2. Marked v2.1.

**Implementation impact:**
- Step 8.5 inserted between Step 8 (npm full-scan chain) and Step 9 (calibration). Calibration can use the sample data as additional input.
- §13 verification gates updated to be stricter (cache-hit-rate criterion #10 added; grep #13 list expanded).
- §10 export pseudocode now spells out concrete preferred categories — implementer doesn't choose differently.

## D-14 — Phase 2.8 Firecrawl-first scraping pivot — 2026-04-29T15:00:00-04:00

**Context:** Phase 2.7 sample run on 50 random enabled companies showed only ~26% scraper coverage. Investigation revealed the failures were not random — most "broken" companies (e.g., Jasper, SiFive, Cloudflare, Expedia) actually use known ATSes (Ashby, Workday, Greenhouse, custom) hidden behind branded landing pages. The 3-tier ATS discovery in `custom-scraper.mjs` (HTML regex → Playwright XHR intercept → generic DOM) is too brittle on modern SPA careers pages. User has 101k Firecrawl credits available and wants to leverage that capability.

**Alternatives:**
- Improve `custom-scraper.mjs` 3-tier discovery with more selectors / iframe handling / longer waits
- Replace 3-tier discovery with Firecrawl as the primary scraper, keep `custom-scraper.mjs` as fallback only
- Use Firecrawl for everything (replace `scan.mjs` too)
- Hand-curate ATS slugs for the failing companies in `portals.yml`

**Choice:** Firecrawl as **primary** for discovery + non-API extraction; existing direct-API tier (scan.mjs) **untouched** (D-3 invariant); `custom-scraper.mjs` retained as Layer 3 fallback only.

**Architecture (4 layers):**
- **Layer 0 — Direct ATS API** (`scan.mjs` untouched, plus new sibling scripts per D-15): hits documented JSON endpoints. Zero Firecrawl credits.
- **Layer 1 — Firecrawl ATS discovery** (`firecrawl-discover.mjs`, NEW): for branded landing pages, calls `/v1/scrape` with `formats:["html","links"]` + `actions` for SPAs. Discovers ATS provider + slug, writes to `data/ats-discovery-cache.json` (60-day TTL with fast-fail re-discovery on 4xx/5xx). Slugs flow back into scan.mjs orchestration via a wrapper that merges portals.yml direct slugs + cached discovered slugs.
- **Layer 2 — Firecrawl structured listing extraction** (`firecrawl-extract.mjs`, NEW; **D-14 originally said "firecrawl-enrich.mjs" — naming typo corrected post-Codex review per D-17**): for genuinely custom careers pages (Shopify, Expedia-style) where no ATS provider is detectable. Uses `/v1/scrape` + `formats:["json"]` + `jsonOptions` (5 credits/page) to extract a structured `{jobs:[{title,location,url}]}` list. **Per-JD enrichment is a separate concern** handled by refactoring existing `enrich-jobs.mjs` in-place (NOT a new file) to be pure Firecrawl-first per Q-FC-4 — markdown mode (1 credit/page) is enough for `extractSignals()` regex extraction.
- **Layer 3 — Custom scraper fallback** (`custom-scraper.mjs`, retained): Playwright fallback for whatever Firecrawl can't handle. Heaviest tier.

**Architecture corrections from verification research** (`docs/design/2026-04-29-firecrawl-ats-verification.md`):
- Use `/v1/scrape` with `formats:["html","links"]` for ATS discovery, NOT `/v1/map` (map returns URL lists only — can't see ATS hostnames in script tags / iframe src).
- Use `formats:["json"]` + `jsonOptions` (NOT legacy `extract` / `extractorOptions`).
- Schemas are inline per-call (no pre-registration).
- JSON-mode scrape is **5 credits/page** (1 base + 4 surcharge), not 1. Stealth/proxy adds another +4. With 101k credits, JSON-mode JD budget is ~20k, not ~100k.
- `/v1/extract` is on a separate token-based subscription pool; default to `/v1/scrape` + inline schema.
- `actions` parameter total wait time capped at 60 s; SPAs needing longer settle time need `/interact` (2 credits/browser-minute).
- TTL extended from 30 days to 60 days with fast-fail re-discovery (real ATS migrations are rare).

**Rationale:**
- Firecrawl has documented success on JS-heavy SPAs and explicitly markets job-board scraping as a use case.
- Per-call inline JSON Schema + `formats:["json"]` + `jsonOptions` is mature and production-ready.
- 101k Firecrawl credits ≈ 50–100 full-scans available — comfortable budget headroom.
- `scan.mjs` direct-ATS path is faster + free — preserve it; only use Firecrawl where it adds value.
- ToS explicitly permits the use case. **Per-plan rate caps (RPM, concurrency) for Firecrawl could not be verified from public docs** (per verification report); ~1,800 GETs/week is likely low volume but **dashboard caps must be confirmed manually before high-concurrency batch design** (added as AC-10 in design plan v2 + tracked as a manual gate in the implementation plan). Default to sequential for Layer 1 + Layer 2 until cap is confirmed.

**Tradeoffs:**
- New external dependency (Firecrawl API key) adds a service outage risk; mitigation = Layer 3 custom-scraper fallback retained.
- Credit consumption ongoing (~1–2k credits per full-scan post-warm-cache); user has 101k.
- Layer 1 discovery accuracy depends on the seed URL pointing at the right company — see Phase 2.8 Step 0 URL triage.
- Net coverage: previous 26% sample-coverage → expected substantial uplift, but exact number requires running the full pipeline.

**Implementation impact:** see `docs/plans/2026-04-29-firecrawl-pivot-design.md` (architecture, risks, acceptance criteria) and `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (open-question resolutions). Implementation plan to be written next.

## D-15 — API-direct tier expansion (5 new ATS adapters) — 2026-04-29T15:00:00-04:00

**Context:** Verification research (`docs/design/2026-04-29-firecrawl-ats-verification.md`) revealed that 5 additional ATS providers expose **public no-auth job-listing APIs** beyond the 3 (Greenhouse / Ashby / Lever) currently covered by `scan.mjs`: **Workday CXS, SmartRecruiters, Personio, Recruitee, Workable**. Six others require auth or HTML scraping (iCIMS, BambooHR, Pinpoint, Teamtailor, Phenom, Jobvite); JazzHR is unverifiable.

The largest single finding: **Workday's public CXS endpoint** at `POST {tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` works on every Workday tenant without auth. This was previously assumed to be Firecrawl-territory.

**Alternatives:**
- Stay on 3 ATSes (GH/Ashby/Lever); use Firecrawl for everything else
- Add only Workday (largest impact)
- Add all 5 newly-verified ATSes (Workday, SmartRecruiters, Personio, Recruitee, Workable)
- Modify `scan.mjs` to add the 5 ATSes (violates D-3)

**Choice:** Add all 5 as **sibling scripts** to `scan.mjs` (`scan.mjs` itself remains untouched per D-3 invariant). Each adapter mirrors the `scan.mjs` pattern: read portals.yml, hit the documented public endpoint, write to `data/pipeline.md` and `data/scan-history.tsv` in identical format.

**Adapter spec (each ~30–60 lines):**
| ATS | Endpoint pattern | URL detection in portals.yml |
|---|---|---|
| Workday CXS | `POST {tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` then `GET .../job/{externalPath}` | `*.myworkdayjobs.com` in `careers_url` |
| SmartRecruiters | `GET api.smartrecruiters.com/v1/companies/{id}/postings` | `careers.smartrecruiters.com/{id}` or branded → discover |
| Personio | `GET {company}.jobs.personio.de/xml?language=en` | `*.jobs.personio.de` or branded → discover |
| Recruitee | Public jobs feed (provider-specific URL pattern) | branded → discover |
| Workable | `GET apply.workable.com/api/v1/widget/accounts/{slug}` | `apply.workable.com/{slug}` or branded → discover |

**Rationale:**
- All 5 are documented or de-facto-stable public APIs (verified primary sources in research doc).
- Sibling-script pattern preserves D-3 invariant — `scan.mjs` upstream code unchanged.
- After Layer 1 Firecrawl discovery surfaces ATS hostnames in branded pages, the relevant adapter takes over for ongoing fetches — Firecrawl burned only once per company per TTL.
- Greenhouse/Ashby/Lever/Workday/SmartRecruiters/Personio/Recruitee/Workable = 8 ATSes covered by direct API, dramatically reducing Firecrawl credit burn over time.

**Tradeoffs:**
- 5 new scripts to maintain (each ~30-60 lines).
- Direct-ATS coverage in portals.yml today is small (~7% of 428 enabled — see grep audit 2026-04-29) — most pickup will come AFTER Firecrawl Layer-1 discovery surfaces hidden ATSes.
- Two Workable APIs exist (newer `apply.workable.com/api/v1/widget` + legacy `www.workable.com/api/accounts`); pick newer; document fallback if it returns 4xx.

**Implementation impact:** new scripts in `scripts/ats-adapters/` (or a similar consolidated location TBD in implementation plan). Wired into `npm run full-scan` chain. Each adapter has an integration test against a known company (e.g., Workday adapter against an HPE-style test URL).

## D-16 — Project rules added: Web research authorization + Surface uncertainty — 2026-04-29T15:00:00-04:00

**Context:** Two project-level behavioral rules added to root `CLAUDE.md` during the Phase 2.8 design + verification arc:

1. **Web research (commit `d8e3921`, 2026-04-29):** "Before running web searches or fetching online resources, briefly state what you plan to search for and what question it answers, then wait for explicit user signal to proceed. Do NOT search autonomously even if the question seems to require external info."

2. **Surface uncertainty over baseline knowledge (added 2026-04-29):** "When you're uncertain about something whose answer will materially shape an approach, design decision, foundational assumption, or recommendation, surface the uncertainty explicitly — name what you don't know, why it matters, and what source could resolve it — and lean toward proposing a web fetch rather than papering over the gap with baseline knowledge."

**Why this is a decision worth recording:** the verification round on 2026-04-29 surfaced 9+ baseline-knowledge claims I made during Phase 2.8 design that were factually wrong or partially-correct (e.g., JSON-mode pricing, `/v1/map` capability, Workday API existence). The rules are intended to prevent that pattern from recurring.

**Together, these rules read as:**
- *Honesty first*: surface uncertainty explicitly rather than asserting baseline-knowledge as fact.
- *Autonomy second*: state intent, propose a search, wait for user go-ahead. Don't search without signal.
- *Exception*: in-turn user authorization ("feel free to search") is the signal — proceed.

**Rationale:** verified errors compound through design. Catching a wrong assumption early via web research costs minutes; catching it after the implementation plan is half-coded costs hours.

**Tradeoffs:**
- More user-friction turns (surfacing uncertainty + waiting for go-ahead).
- Counter: the verification round saved a major design rework (Workday CXS finding alone reshapes Phase 2.8 architecture).

**Cross-references:** root `CLAUDE.md` lines 15-25 (both rules); `docs/design/2026-04-29-firecrawl-ats-verification.md` (the verification work that motivated rule 2).

## D-17 — Integrate Codex review of Phase 2.8 Firecrawl-pivot design — 2026-04-29T18:00:00-04:00

**Context:** Codex reviewed Phase 2.8 design plan (handoff `20260429-164715-2bcf`) and surfaced 5 issues + 3 questions + 2 optional improvements in §11 of `docs/plans/2026-04-29-firecrawl-pivot-design.md`. User asked Claude to be analytical: verify each Codex point against primary sources (verification doc + D-14/D-15) and decide accept/modify/defer/reject for each.

**Alternatives:**
- Reject Codex's findings (would be wrong; all verify against primary sources)
- Accept all blindly without verification
- **Verify each finding against primary sources, then accept/modify/defer/reject per technical merit**

**Choice:** Third option — analytical reconciliation. All 5 ⚠ Issues, all 3 ❓ Questions, both 💭 Optional improvements verified and ACCEPTED. Design plan revised in-place to revision: v2. Codex's §11 review preserved as audit trail. Claude's reconciliation documented in design plan §12 with disposition table.

**Verifications + dispositions:**

1. **Issue 1 — Layer 0 sibling adapters not integrated.** Verified against design plan §4.1 lines 51-55, §4.2 lines 96-100, §4.3 "Decision pending" line 105. Conflicts confirmed with D-14 (locked Layer 0 wording) and D-15 (locked 5 sibling adapters). **ACCEPT.** Rewrote §4.1 Layer 0 box; added §4.1.1 provider matrix; updated §4.2 file list to include 5 new adapter scripts in `scripts/ats-adapters/`; removed "Decision pending" from §4.3.

2. **Issue 2 — Stale `/v1/extract` and legacy schema language.** Verified against verification doc Q1+Q2 ("canonical shape is `formats:["json"]` + `jsonOptions`, not legacy `extract`/`extractorOptions`"; "/v1/extract is on a separate token-based subscription pool"). **ACCEPT.** Layer 2 box updated; `lib/firecrawl.mjs` exports list now `scrape(url, opts)` + `scrapeJson(url, schema, prompt)` with explicit "no `extract()` wrapper"; FC-R2 reworded; Q-FC-1 marked RESOLVED. AC-5 added to §7 enforcing grep audit.

3. **Issue 3 — Cost & TTL stale.** Verified §5 said "Per-scrape ≈ 1 credit" and 30-day TTL; verification doc says JSON-mode is 5 credits/page; D-14 says 60-day TTL with fast-fail. **ACCEPT.** Rewrote §5 entirely with mode-split cost matrix (markdown 1cr / JSON 5cr / stealth +4 / interact 2cr/min / direct API 0cr); 60-day TTL with fast-fail in §5.3; §5.4 dashboard rate-cap manual gate; §5.5 `--max-credits` cap. AC-7 + AC-10 added to §7.

4. **Issue 4 — Acceptance criteria placeholder, gaps in coverage.** Verified design plan had 6 ACs while handoff promised 9 + Codex listed gaps (D-15 adapter correctness, no-legacy-extract enforcement, JSON-mode cost guards, plan-cap verification, JazzHR exclusion). **ACCEPT.** Expanded to 11 final ACs covering all the gaps: AC-4 (5 adapter integration tests), AC-5 (no `/v1/extract` grep audit), AC-6 (60-day TTL behavior), AC-7 (cost log per mode), AC-9 (JazzHR explicit out-of-scope), AC-10 (rate-cap manual gate + `--max-credits`).

5. **Issue 5 — Q-FC-4 enrichment policy internally inconsistent.** Verified `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` lines 159-171 had three contradictory paragraphs (Firecrawl-primary + HTTP-fallback / HTTP-first for static / pure Firecrawl-first). User's stated principle is "Firecrawl first, custom code as backup". **ACCEPT — pure Firecrawl-first.** Rewrote Q-FC-4 in decisions addendum to be unambiguous: primary = Firecrawl `/v1/scrape` markdown (1 credit); fallback = plain HTTP **only on Firecrawl outage** (5xx, timeout, `--max-credits` exhaustion). NOT a cost-routing optimization. §9 Q-FC-4 in design plan updated to match.

6. **Question Q1 — Layer 2 naming convention.** Resolved: keep `firecrawl-extract.mjs` for Layer 2 (structured listing extraction from custom careers pages); refactored `enrich-jobs.mjs` (NOT renamed) for per-JD enrichment. **D-14's reference to "firecrawl-enrich.mjs" is a naming typo** — corrected inline in D-14 with reference to D-17. The two are distinct responsibilities: listing extraction (find which jobs exist on a custom careers page) vs per-JD detail (extract signals from one job's description page).

7. **Question Q2 — JazzHR exclusion.** ACCEPT. AC-9 added making the exclusion enforceable; §4.1.1 provider matrix marks JazzHR out-of-scope (UNVERIFIABLE per verification doc).

8. **Question Q3 — Soften "1,800 GETs/week below cap" claim.** ACCEPT. D-14 wording (this file, above) corrected to "likely low volume but dashboard caps must be confirmed manually before high-concurrency batch design". Design plan §5.4 + AC-10 reflect the verification gate.

9. **Optional O1 — Source-of-truth precedence note.** ACCEPT. Added §0 to design plan stating verification doc + D-14/D-15/D-16/D-17 supersede earlier baseline-knowledge sections.

10. **Optional O2 — ATS provider matrix.** ACCEPT. Added as §4.1.1 with full columns (provider / detection signal / direct endpoint / output parser / status).

**Rationale:**

- All 5 ⚠ Issues verified against primary sources (verification doc + D-14/D-15) — Codex was right on each. No performative agreement; technical correctness drives the integration.
- The naming typo correction in D-14 (firecrawl-enrich.mjs → firecrawl-extract.mjs) is a small but real architectural clarification: Layer 2 and per-JD enrichment are different concerns. Conflating them in D-14 was a drafting error caught by Codex Q1.
- Q-FC-4 reconciliation (pure Firecrawl-first) restores alignment with user's stated principle. The earlier "HTTP-first for cost savings" framing was my own elaboration not the user's direction — Codex caught the drift.
- Codex re-review is OPTIONAL: all integrations were correctness-pass corrections, not architecture changes. Matches Phase 2.7 D-12 pattern (in-place v2 revision; no second review round needed).

**Tradeoffs:**

- Design plan v2 grew significantly (added §0 precedence note, §4.1.1 provider matrix, expanded §5 cost model, expanded §7 to 11 ACs, added §12 reconciliation). Wall-clock implementation impact: same — the architecture is unchanged from v1, only the documentation accuracy improved.
- D-14 + Decisions addendum + design plan all needed coordinated edits to keep the three artifacts in sync. Cost: ~1 hour of edits. Counter: future implementation-plan writer (and Codex on re-review) gets a clean source of truth.

**Implementation impact:**

- Implementation plan can now be written from a clean v2 design plan + corrected addendum + amended D-14 + D-17 audit trail.
- 11 ACs in §7 are now the verification gate set (was 6 placeholder).
- File list for Phase 2.8 includes `lib/firecrawl.mjs`, `firecrawl-discover.mjs`, `firecrawl-extract.mjs`, refactored `enrich-jobs.mjs`, 5 sibling adapters in `scripts/ats-adapters/`, plus `lib/ats-clients.mjs`.

## D-18 — Integrate Codex review of Phase 2.8 implementation plan — 2026-04-29T19:30:00-04:00

**Context:** Codex reviewed Phase 2.8 implementation plan v1 (handoff `20260429-183239-0925`) and surfaced 5 ⚠ Issues + 2 ❓ Questions + 2 💭 Optional improvements in §12 of `docs/plans/2026-04-29-firecrawl-pivot-implementation.md`. User asked Claude to be analytical: verify each Codex point against primary sources (implementation plan + design v2 + verification doc + D-14/D-15/D-17), decide accept/modify/defer/reject per technical merit.

**Alternatives:**
- Reject Codex's findings (would be wrong; all verify against primary sources)
- Accept all blindly without verification
- **Verify each finding analytically, then accept/modify/defer/reject per technical merit**

**Choice:** Third option. All 5 ⚠ Issues ACCEPTED. 1 of 2 ❓ Questions ACCEPTED (HEAD+GET fallback for Step 0); 1 of 2 DEFERRED (Step 5/10 cp+overwrite pattern kept — cwd ambiguity resolved by §0a convention). Both 💭 Optional improvements ACCEPTED. Implementation plan revised in-place to revision: v2; Codex's §12 review preserved as audit trail; Claude's reconciliation documented in §13 with disposition table.

**Verifications + dispositions:**

1. **⚠ Issue 1 — Adapter path/cwd mismatch.** Verified: npm script paths resolve relative to package.json's directory; `node scripts/...` from `career-ops/package.json` points at `career-ops/scripts/...` not repo root. **ACCEPT.** §6.3 marked QI-1 RESOLVED inline (root-level location). §6.8 npm scripts updated to `node ../scripts/ats-adapters/run-all.mjs`. §0a command-cwd convention added.

2. **⚠ Issue 2 — Inconsistent cwd across steps.** Verified: `import('./lib/firecrawl.mjs')` only works from career-ops/; backup paths without prefix imply career-ops/; root-level scripts imply repo root. **ACCEPT.** §0a section added defining cwd per step type. Verification gates per step now explicitly state `(cwd = ...)` annotation.

3. **⚠ Issue 3 — `full-scan --dry-run`/`--list` not actually supported.** Verified: `npm run X && npm run Y` cannot conditionally print; npm `--dry-run` is for install not run. **ACCEPT.** Replaced plain chain with new `scripts/full-scan-orchestrator.mjs` invoking 6 chain steps + supporting `--dry-run`/`--list` + post-run Layer 3 fallback fan-out. New npm scripts: `full-scan`, `full-scan:dry-run`, `full-scan:list`.

4. **⚠ Issue 4 — Layer 3 fallback under-specified.** Verified: design v2 §4.1 says fallback triggers on Firecrawl 5xx / `--no-firecrawl` / cap exhaustion, but implementation v1 had only clean exit, no queue, no orchestrator-driven fan-out. AC-11 could pass with 0 invocations without proving wiring. **ACCEPT.** Concrete fallback contract:
   - Step 1 wrapper appends rows to `data/firecrawl-fallback-queue.tsv` on hard-stop with `{company, url, layer, reason, timestamp}`.
   - Step 4/6/7 (firecrawl-discover/extract/enrich) all append on their hard-stop conditions.
   - `full-scan-orchestrator.mjs` reads queue post-chain and invokes `npm run custom-scrape -- --queue <path>` if non-empty (no-op if empty).
   - AC-11 split into AC-11a (wired — verified by forced-failure subtest) + AC-11b (used — ≤5% on normal run; 0 invocations OK as long as wiring works).

5. **⚠ Issue 5 — Source-of-truth precedence contradicts design v2 + addendum has stale Q-FC-1.** Verified: implementation v1 §0 had design v2 priority 1 / verification 2; design v2 §0 had verification overriding design baseline. Addendum lines 13-46 + 202-207 still asked "verify next session" for Q-FC-1 even though verification doc Q1 already verified it. **ACCEPT.** §0 rewritten so verification report is priority 1 (overrides everywhere conflicts remain), D-14..D-18 priority 2, design v2 priority 3 (governs only after the verification + D-N filter), addendum priority 4 with Q-FC-1 baseline marked HISTORICAL/SUPERSEDED. Decisions addendum Q-FC-1 section gets explicit `**SUPERSEDED 2026-04-29 by verification doc Q1+Q2**` marker.

6. **❓ Q1 — Step 5/10 cp-overwrite vs project-root orchestrator.** **DEFER.** Phase 2.7 used cp+overwrite-and-restore from `career-ops/`; pattern works. Cwd ambiguity Codex was concerned about is resolved by §0a convention; explicit `career-ops/` cwd for Step 5/10 backup commands removes the path-restore risk. No orchestrator change needed for sample runs.

7. **❓ Q2 — Step 0 HEAD with GET fallback for 405/403/timeouts.** **ACCEPT.** Many careers sites treat HEAD differently from GET; without GET fallback, the script would over-classify rows as `dead` and waste manual-gate review on false positives. §6.0 method updated to "HEAD-first, GET fallback on 405/403/timeout/no-Content-Length".

8. **💭 O1 — RI-4 ambiguous slug resolution.** **ACCEPT.** Mitigation rewritten: log all candidates; auto-pick only on strong company-name agreement (Levenshtein ≤2 against company name); otherwise mark `{ats: null, status: "ambiguous", candidates: [...]}` for manual review.

9. **💭 O2 — Workday CXS pagination test.** **ACCEPT.** §6.2 verification gate now includes explicit pagination test (`limit:20, offset:0` + `offset:20`, dedup by `externalPath`).

**Rationale:**

- All 5 ⚠ Issues verified against primary sources — Codex was right on each. No performative agreement; technical correctness drives integration.
- The Layer 3 fallback wire-up (Issue 4) is the most architecturally significant fix: the new fallback queue + orchestrator-driven fan-out replaces "wrappers exit cleanly and we hope someone notices" with "wrappers append, orchestrator consumes, AC-11a verifies wiring works in forced-failure mode".
- The §0 precedence rewrite (Issue 5) prevents future drift: implementation plan executors will read verification doc first, not design v2 baseline-knowledge sections that may still have staleness.
- Q1 deferred because Phase 2.7 pattern (cp+overwrite-and-restore) is battle-tested; the cwd ambiguity is the actual problem and §0a convention solves it directly.
- Codex re-review of v2 OPTIONAL — matches Phase 2.7 D-12 pattern + Phase 2.8 design v1→v2 D-17 pattern. Correctness pass, not architecture change.

**Tradeoffs:**

- New `scripts/full-scan-orchestrator.mjs` adds ~120 lines of code we didn't have before. Counter: it solves both the dry-run requirement (Issue 3) and the Layer 3 fan-out (Issue 4) in one place; complexity is justified.
- Step 1, 4, 6, 7 verification gates are slightly heavier (forced-failure subtests added). Counter: AC-11 wiring needs to be verified, not assumed.
- Implementation plan v2 grew (added §0a + §13 reconciliation table + per-step cwd annotations + fallback-queue spec). Wall-clock for execution unchanged — the architecture is the same; just specified more precisely.

**Implementation impact:**

- New file Step 8 introduces: `scripts/full-scan-orchestrator.mjs` (replaces plain npm chain).
- New gitignored data file: `career-ops/data/firecrawl-fallback-queue.tsv`.
- New verification subtests in Step 1, 4, 6, 7 (forced-failure path).
- Step 2 verification adds Workday CXS pagination assertion.
- Step 0 method adds GET fallback after HEAD.
- §6.5 Step 5 sample-run command updated to use `../scripts/ats-adapters/run-all.mjs` per cwd convention.

<!-- section:entries:end -->
