---
status: active
type: decisions
owner: claude
last-updated: 2026-04-29T00:38:20-04:00
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

<!-- section:entries:end -->
