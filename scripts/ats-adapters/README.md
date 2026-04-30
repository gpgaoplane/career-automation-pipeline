# scripts/ats-adapters/

Phase 2.8 Step 3 — sibling adapters to `career-ops/scan.mjs` for the 5 ATS
providers added in D-15. Each adapter is a thin wrapper around a fetcher in
`career-ops/lib/ats-clients.mjs`; the shared logic (portals.yml + cache
loading, title filter, dedup, pipeline writes) lives in `_lib.mjs`.

**D-3 invariant:** these adapters live at repo-root `scripts/ats-adapters/`
(NOT inside `career-ops/`) because `career-ops/` is vendored upstream code
and we MUST NOT modify it. Per Codex review (Phase 2.8 implementation
plan §12 Issue 1) and QI-1 RESOLVED, all `career-ops/package.json`
invocations of these scripts use the `../scripts/ats-adapters/...` path
prefix.

## Files

| File | Role |
|---|---|
| `_lib.mjs` | Shared helpers: `loadPortals`, `loadDiscoveryCache`, `loadSeenUrls`, `buildTitleFilter`, `detectProvider`, `iterTargets`, `appendPipelineRow`, `appendHistoryRow`, `runAdapter` |
| `workday-cxs.mjs` | Workday CXS adapter (D-15) |
| `smartrecruiters.mjs` | SmartRecruiters Posting API adapter (D-15) |
| `personio.mjs` | Personio XML feed adapter (D-15) |
| `recruitee.mjs` | Recruitee public Offers API adapter (D-15) |
| `workable.mjs` | Workable Widget API adapter (D-15) |
| `run-all.mjs` | Sequential orchestrator that fans out to all 5 |

## Usage

All commands run from **repo root**:

```bash
# Dry-run any single adapter (no writes)
node scripts/ats-adapters/workday-cxs.mjs --dry-run

# Run all 5 sequentially with writes
node scripts/ats-adapters/run-all.mjs

# Or invoke from career-ops/ via npm script (Step 8 wires this up):
cd career-ops && npm run ats-adapters
```

## Provider matrix

See design plan v2 §4.1.1 for the full 8-provider matrix. The 3 providers
already handled by `scan.mjs` (Greenhouse / Ashby / Lever) are NOT
duplicated here as adapters — `scan.mjs` runs first in `npm run full-scan`
and these 5 adapters cover the additions.

| Provider | Status | Detection signal |
|---|---|---|
| Greenhouse | scan.mjs (existing) | `boards.greenhouse.io/{slug}` |
| Ashby | scan.mjs (existing) | `jobs.ashbyhq.com/{slug}` |
| Lever | scan.mjs (existing) | `jobs.lever.co/{slug}` |
| **Workday CXS** | **NEW** (`workday-cxs.mjs`) | `*.myworkdayjobs.com/{site}` |
| **SmartRecruiters** | **NEW** (`smartrecruiters.mjs`) | `careers.smartrecruiters.com/{slug}` |
| **Personio** | **NEW** (`personio.mjs`) | `*.jobs.personio.de/`, `.com` |
| **Recruitee** | **NEW** (`recruitee.mjs`) | `{tenant}.recruitee.com/` |
| **Workable** | **NEW** (`workable.mjs`) | `apply.workable.com/{slug}` |

## JazzHR — explicit out-of-scope (AC-9)

**JazzHR is NOT in the direct-adapter scope** for Phase 2.8 implementation.
Per `docs/design/2026-04-29-firecrawl-ats-verification.md` Q9, JazzHR's
public-feed status was **UNVERIFIABLE** without a logged-in dev-portal
session. We will NOT add a JazzHR adapter until primary-source verification
is available.

If a JazzHR-using company appears in `portals.yml`, it falls through to
Layer 1 (Firecrawl discovery) and Layer 3 (custom-scraper Playwright
fallback) instead of getting a direct adapter here.

This exclusion satisfies AC-9 of the implementation plan.

## How adapters know what to fetch

Each adapter calls `iterTargets(portals, cache, providerName)` from `_lib.mjs`,
which yields all (companyName, fetchArgs) targets from two sources:

1. **`career-ops/portals.yml` direct-ATS URLs** — entries whose `careers_url`
   matches the provider's URL pattern (e.g. `*.myworkdayjobs.com` → Workday CXS).
2. **`career-ops/data/ats-discovery-cache.json` entries** — entries written by
   Layer 1 `firecrawl-discover.mjs` (Step 4) where `ats: <providerName>`.
   The cache is empty pre-Step-4; populated thereafter.

So pre-Step-4, adapters only handle direct-ATS portals.yml entries (a few
companies). Post-Step-4, they pick up substantially more (~100+ expected
based on Phase 2.7 coverage data).

## Extending — adding a 9th provider

If a new no-auth public ATS surfaces (e.g., Rippling — see Galileo AI in
`portals-triage-proposed-fixes.md` D.2), the addition pattern is:

1. **Verify** the API is no-auth + documented (or de-facto-stable per primary
   sources). Update `docs/design/2026-04-29-firecrawl-ats-verification.md`.
2. **Add fetcher** to `career-ops/lib/ats-clients.mjs` matching the
   `{ provider, slug?, host?, jobs }` normalized return shape.
3. **Add URL pattern** to `_lib.mjs PROVIDER_PATTERNS` map.
4. **Add adapter script** `scripts/ats-adapters/<provider>.mjs` (~10 lines,
   delegates to `runAdapter` from `_lib.mjs`).
5. **Wire into `run-all.mjs`** — add to `ADAPTERS` array.
6. **Add integration test** to `career-ops/test-ats-clients.mjs`.
7. **Record decision** in `.claude/memory/decisions.md` (D-N: extending
   D-15's 5-provider tier to 6).
