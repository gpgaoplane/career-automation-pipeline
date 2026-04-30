---
status: active
type: design-addendum
owner: claude
last-updated: 2026-04-29T19:30:00-04:00
read-if: "you are about to write the Phase 2.8 implementation plan or execute it"
---

# Phase 2.8 Decisions — answers to design open questions + handoff

## Q-FC-1: Firecrawl extract API — per-call schema vs uploaded schema

> **⚠ HISTORICAL — SUPERSEDED 2026-04-29 by `docs/design/2026-04-29-firecrawl-ats-verification.md` Q1+Q2 (verified against primary sources).**
>
> The verification doc confirmed: canonical request shape is `formats:["json"]` + `jsonOptions:{schema, prompt}` in `/v1/scrape` (NOT legacy `extract` / `extractorOptions` / `extractionSchema`). `/v1/extract` is on a separate token-based subscription pool and is NOT used by this project.
>
> The baseline-knowledge text below is preserved for audit trail only. Implementation MUST follow the verification doc, not this section.

**Answer (HISTORICAL — superseded; preserved for audit only):** Firecrawl's `/v1/scrape` and `/v1/extract` endpoints accept a JSON Schema **per call** in the request body. There is no separate "upload + reference" model in their public API — schemas are inline. The shape is roughly:

```javascript
fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://example.com/careers',
    formats: ['extract'],
    extract: {
      schema: {
        type: 'object',
        properties: {
          jobs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                location: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        }
      },
      prompt: 'Extract all job listings from this careers page.'  // optional
    }
  })
});
```

**Implication for our code:** define the JobListing schema as a JS constant in `lib/firecrawl.mjs`. Pass it on every `extract` call. Version the schema as `JOB_LISTING_SCHEMA_V1` so future schema changes can be tracked and the cache invalidated correctly.

**Verification needed in next session:** ~~confirm exact request shape at `https://docs.firecrawl.dev/features/extract` (or the v1 spec). The above is my best understanding from training-data exposure to Firecrawl through 2025; it may have evolved.~~ **DONE 2026-04-29 via `docs/design/2026-04-29-firecrawl-ats-verification.md` Q1+Q2 — see HISTORICAL marker above.**

---

## Q-FC-2: Discovery vs scan ordering — DECIDED by user 2026-04-29

**Layer 1 (firecrawl-discover.mjs) runs FIRST, then scan.mjs.**

Flow:
```
1. firecrawl-discover.mjs walks every branded careers_url in portals.yml
   ├─ Bare Firecrawl scrape
   ├─ Detect ATS markers in link list (ashby/greenhouse/lever/workday)
   ├─ If found → write to data/ats-discovery-cache.json:
   │    { "Cloudflare": { ats: "greenhouse", slug: "cloudflare", discovered_at: "..." } }
   ├─ If not found → drill 1 level (follow likely inner links) and retry
   └─ Last resort → mark for Layer 2 (firecrawl-extract.mjs)
2. scan.mjs runs second
   ├─ Reads portals.yml direct ATS URLs (current behavior, ~18 companies)
   ├─ ALSO reads ats-discovery-cache.json (new: ~250-350 companies expected)
   └─ Hits each ATS API directly — single endpoint per company, full results
3. firecrawl-extract.mjs runs third — only for companies with no ATS found
4. enrich-jobs.mjs runs fourth — Firecrawl-first per-JD
5. export-jobs.mjs runs last — unchanged
```

**Why this order:** discovery is read-only against marketing pages and produces a small JSON artifact. scan.mjs is the cheapest data-fetch path (zero LLM, JSON API, batch results), so we want it to handle as many companies as possible. Layer 2 only catches the genuinely-custom long tail.

---

## Q-FC-3: `firecrawl_actions` per-portal field — what I was asking

**The question:** for the rare portal where bare Firecrawl scrape doesn't find an ATS link AND drilling 1 level deep also fails — should `portals.yml` allow an optional `firecrawl_actions:` field with site-specific click instructions?

**Concrete example** (none seen in our 5-URL smoke test, but plausible for the long tail):
```yaml
- name: "ExampleCorp"
  rank: 234
  category: "AI Agents"
  careers_url: "https://example.com/careers"
  enabled: true
  firecrawl_actions:
    - { type: "click", selector: "button[data-test='view-jobs']" }
    - { type: "wait", milliseconds: 3000 }
```

`firecrawl-discover.mjs` would, on its first scrape attempt, check if the portal has a `firecrawl_actions` field and pass it to Firecrawl's API. If it does NOT, just bare-scrape (which worked for 5/5 in our smoke test).

**My recommendation:** **reserve the field in the schema but don't require it.** Don't pre-populate it. Only add it for a specific company when (a) we observe that company keeps failing in Layer 1+2 over multiple runs, and (b) browser inspection confirms it needs a specific click. This keeps `portals.yml` clean and avoids speculative configuration.

**No decision needed from you now.** I'll leave the field reserved-but-unused in the implementation. If we never need it, we delete the schema slot later.

---

## Q-FC-4: enrich-jobs.mjs — what it does + Firecrawl comparison

### What enrich-jobs.mjs does today

Per-JD content fetcher and signal extractor. Built in Phase 2.7 Step 6 (commit `008f5c5`). Pipeline position:

```
scan.mjs + custom-scraper.mjs → write URLs to pipeline.md
                                          │
                                          ▼
              enrich-jobs.mjs reads each URL and:
              ┌────────────────────────────────────────────┐
              │ Tier 1: plain HTTP GET (fast, free)        │
              │  ├─ cheerio strip HTML → plain text        │
              │  └─ if text < 500 chars → escalate Tier 2  │
              │                                            │
              │ Tier 2: Playwright launch + networkidle    │
              │  └─ get rendered HTML → cheerio strip      │
              │                                            │
              │ Then on resulting text, run extractSignals │
              │ (pure JS regex/substring match) for:       │
              │  - location_match (Toronto, Canada, US)    │
              │  - comp_low/high_thousands + currency      │
              │  - track_keywords_matched (RAG, agentic..) │
              │  - tech_stack_matched (Python, PyTorch..)  │
              │  - yoe_signal (3-5, 6+, 0-2)               │
              │  - deal_breaker_signal                     │
              └────────────────────────────────────────────┘
                                          │
                                          ▼
              Cache to data/job-descriptions-cache.json
              (per-URL keyed, 7-day TTL, signals pre-computed)
                                          │
                                          ▼
              export-jobs.mjs reads cache to compute desc_score
              for each job's pre-scoring band (S/A/B/C)
```

### Why Firecrawl is better at the fetch part

The Tier 1 + Tier 2 architecture is sound, but the actual data quality from the Phase 2.7 sample run was poor:

| Metric | enrich-jobs.mjs (Tier1+2) on sample | Why low |
|---|---|---|
| Average text length | 3-9k chars per JD | Playwright `networkidle` fires before SPAs (Workday, Notion Ashby) finish painting JD body |
| Location detection | 9.2% of jobs | Most JDs scraped were SPA shells; full body never landed |
| Comp parse rate | 11.5% of jobs | Same root cause |
| Workday-specific | 6/6 Darktrace JDs failed entirely (`response too short tier2`) | Workday's render timing + JS structure defeats our generic Playwright wait |

Firecrawl is purpose-built to solve exactly these problems:

| Problem | enrich-jobs.mjs current | Firecrawl |
|---|---|---|
| JS-rendered SPAs | Generic `waitFor: networkidle` — fires too early on heavy JS | Built-in framework-aware waiting; tested across thousands of sites |
| Anti-bot challenges | None (gets blocked) | Built-in rotation, fingerprinting handling |
| Workday-specific layouts | Generic cheerio extraction loses structure | Markdown output preserves headings, lists, comp tables as plain text |
| Output cleanliness | HTML → cheerio → text (loses structure, has nav menus inline) | Markdown with `onlyMainContent: true` strips nav/footer/sidebars |
| Smoke test data | 9-12% signal hit rate | Shopify per-JD test: title, location, IC band level, full body all in clean lines |

**What stays the same:** `extractSignals()` is a pure function — runs on text input. We feed it Firecrawl markdown instead of cheerio-stripped HTML. Same regexes, same output schema, same cache format.

**What changes (RESOLVED 2026-04-29 post-Codex review — pure Firecrawl-first):** the fetch wrapper inside `enrichOne()`. Replace `fetchTier1` + `fetchTier2` with **`fetchFirecrawl` (primary, always tried first) + `fetchHttp` (fallback ONLY on Firecrawl outage — 5xx, timeout, or `--max-credits` exhaustion)**. NOT a cost-routing optimization. Cache schema unchanged.

**Cost trade-off:** ~1 credit per JD enrichment via Firecrawl markdown mode (verified 1 credit/page baseline; JSON-mode would be 5 credits but we don't use JSON-mode for per-JD — markdown + `extractSignals()` regex is enough). With 500-1500 JDs surviving title filter, ~500-1500 credits per full enrichment run. Within the 101k budget; caching means we only pay once per JD per 7 days.

**Why pure Firecrawl-first (not HTTP-first cost-routing):** matches the user's stated principle — "Firecrawl first, custom code as backup". The earlier draft of this section flagged a hybrid "HTTP-first for static greenhouse/ashby pages saves ~40% credits" trade-off; that contradicted the user's stated direction and was internally inconsistent with this same section's other paragraphs (Codex caught this in §11 review). Resolved here: HTTP fallback exists purely for resilience (Firecrawl outage), not as a routing-by-static-detection layer. We have ample quota (101k credits), and the simplicity wins.

**Override path:** if quota becomes constrained, flip the policy via a single config flag (`ENRICH_PRIORITIZE_HTTP=true`) without architectural change. Out of scope for Phase 2.8; document as a future tunable.

---

## Project rule to add to CLAUDE.md

Per user request 2026-04-29: before performing web searches or fetching online resources, surface what I plan to search for and wait for explicit user signal. The user retains the option to authorize, override, or cancel.

This should be written into `CLAUDE.md` (root, project-level instructions) so it applies on every future session.

Specific text to add:

```markdown
## Web research

Before running web searches or fetching online resources, briefly state what
you plan to search for and what question you're answering, then wait for
explicit user signal to proceed. Do NOT search autonomously even if the
question seems to require external info.

Exception: if the user explicitly says "feel free to search" or
"go ahead and look that up" in the same turn, that is the signal.
```

I'll add this in this commit since it's a one-line edit and a project-wide rule.

---

## Recommended path forward — handoff to next session

State at handoff (commit `<latest>`):
- Phase 2.7 implementation: COMPLETE, 18/18 acceptance criteria pass, on `feat/multi-agent-collab` branch.
- Phase 2.8 design: documented at `docs/plans/2026-04-29-firecrawl-pivot-design.md` + this addendum.
- Smoke test: 5/5 URLs validated via Firecrawl bare scrape; raw outputs in `scripts/firecrawl-smoke-out/`.
- API key: stored at `.firecrawl-key` (gitignored). 101k credits available.
- Open questions resolved: Q-FC-2 (order: discover→scan), Q-FC-3 (reserved field, deferred), Q-FC-4 (Firecrawl-first per-JD with HTTP fallback recommended; user can override).
- Open question pending: Q-FC-1 (verify Firecrawl extract schema shape via docs at https://docs.firecrawl.dev — single web fetch in next session before writing implementation).

Recommended first actions in next session:
1. Read this file + the design plan + the v2 implementation plan from Phase 2.7 for context.
2. Verify Q-FC-1 via single WebFetch on https://docs.firecrawl.dev/features/extract (~1 turn).
3. Optional: hand off to Codex for design review of `2026-04-29-firecrawl-pivot-design.md` per multi-agent flow, OR write Phase 2.8 implementation plan directly (per user preference).
4. Execute Phase 2.8 implementation plan.

Phase 2.6 clean rescan (1406-job rescan) remains deferred until Phase 2.8 lands — running rescan with the current scraper would just reproduce the 26% coverage. Better to scrape once, with the better scraper.
