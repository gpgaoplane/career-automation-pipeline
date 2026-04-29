---
status: active
type: implementation-plan
owner: claude
last-updated: 2026-04-29T18:30:00-04:00
read-if: "you are about to execute Phase 2.8 Firecrawl-pivot implementation"
skip-if: "Phase 2.8 implementation already executed and merged"
revision: v1
---

# Phase 2.8 — Firecrawl-Pivot Implementation Plan

## §0. Source of truth precedence

**Authoritative sources (in priority order):**
1. `docs/plans/2026-04-29-firecrawl-pivot-design.md` revision: v2 (architecture + ACs)
2. `docs/design/2026-04-29-firecrawl-ats-verification.md` (verified primary-source facts about Firecrawl + ATS providers)
3. `.claude/memory/decisions.md` D-14 (architecture), D-15 (5-ATS direct-API tier), D-16 (project rules), D-17 (review integration)
4. `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (Q-FC-1..Q-FC-4 resolutions)

If this implementation plan ever conflicts with the above, treat the higher-priority source as authoritative.

## §1. Why this exists

The Phase 2.8 design plan v2 specifies the architecture but not the execution order, atomic-commit boundaries, verification gates, or rollback procedures. This plan is the executable playbook: one ordered sequence with per-step gates, designed for atomic commits and resume-on-failure.

## §2. Scope

**IN SCOPE:**
- 12 ordered steps from design plan v2 §6
- All 11 ACs from design plan v2 §7 verified before merge
- Atomic commits per step (or coupled steps where a partial state is broken)
- Per-step rollback procedures
- Manual gates explicitly called out (URL triage review, dashboard rate-cap verification, smoke validation gate)
- D-3 invariant verification: `scan.mjs` is NOT modified
- Per-call cost tracking from Step 1 onwards (`data/firecrawl-cost.tsv`)

**OUT OF SCOPE:**
- Architecture changes beyond design plan v2
- Codex re-review of design plan v2 (optional per D-17; matches Phase 2.7 D-12 pattern of in-place v2 not needing re-review)
- Phase 2.6 clean rescan execution (Step 12 prepares for it but is itself "ready signal" not "execute")
- Phase 3 per-job LLM evaluation
- New ATS adapters beyond the 5 in D-15 (Eightfold/Avature/SuccessFactors/Taleo/Oracle Cloud HCM are post-discovery surveys, not Phase 2.8 scope)
- JazzHR direct adapter (UNVERIFIABLE per verification doc; AC-9 enforces exclusion)
- Concurrency increases beyond sequential default (Step 9 manual gate verifies caps before any concurrency change)

## §3. Pre-flight checks

Before Step 0, verify:

```bash
# 1. Phase 2.7 implementation tagged + green
node scripts/acceptance-audit.py 2>&1 | grep "18/18 PASS" || echo "FAIL: Phase 2.7 ACs not green"

# 2. Branch + working tree
git status --short
# Expected: only untracked files (settings.local.json, AI_HANDOFF.md, RESUME_PROMPT.md)

# 3. Firecrawl API key present
test -f .firecrawl-key && echo "OK: API key present" || echo "FAIL: .firecrawl-key missing"

# 4. portals.yml count check (should be 448 total / 428 enabled)
grep -c "enabled: true" career-ops/portals.yml
# Expected: 428

# 5. node + npm versions
node --version  # ≥18.x
npm --version   # ≥9.x
```

All five checks must pass before Step 0.

## §4. Branch + commit strategy

**Working branch:** `feat/phase-2.8-firecrawl` (created from `main` AFTER `feat/multi-agent-collab` is merged per user direction). Phase 2.7 + 2.8 design v2 land on main as one coherent unit; Phase 2.8 implementation gets its own branch.

**Commit cadence:** atomic per step (or coupled steps where partial state is broken). Commit message format:
```
{type}: phase 2.8 step {N} — {short description}

{body explaining why, files touched, verification result}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Types: `feat` for new files / functionality, `refactor` for modifying existing code, `chore` for tooling/config, `docs` for plans/memory/work-log updates.

**Per-step rollback:** every step lists the explicit `git reset --hard HEAD~N` or `git revert {sha}` to undo. If any verification gate fails, STOP and consult user — do not proceed to next step.

## §5. Cross-references

- Design plan v2: `docs/plans/2026-04-29-firecrawl-pivot-design.md`
- Decisions addendum: `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`
- Verification report: `docs/design/2026-04-29-firecrawl-ats-verification.md`
- Phase 2.7 implementation plan (precedent for structure): `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`
- Architecture rules: `.claude/rules/architecture.md`
- Pipeline rules: `.claude/rules/pipeline.md`

## §6. Step-by-step playbook

### §6.0 Step 0 — portals.yml URL triage

**Goal:** Classify all 428 enabled URLs in `career-ops/portals.yml` into 4 buckets so Layer 1 Firecrawl discovery doesn't burn credits on dead seeds or silently cache wrong-company slugs.

**Method:** lightweight HTTP HEAD audit (~30 min wall-clock, zero Firecrawl credits).

**File changes:**
- New: `scripts/portals-url-triage.py` (~150 lines) — read portals.yml, HTTP HEAD each enabled URL, classify into:
  - `direct-ATS`: URL contains `boards.greenhouse.io` / `jobs.ashbyhq.com` / `jobs.lever.co` / `*.myworkdayjobs.com` / `apply.workable.com` / `*.smartrecruiters.com` / `*.jobs.personio.de`
  - `branded-page-OK`: HTTP 200, not direct-ATS
  - `dead`: 404 / timeout / redirect-to-parked-domain
  - `wrong-company-suspect`: redirect hostname doesn't match company name (Levenshtein distance threshold)
- New: `scripts/portals-url-triage-report.tsv` (output) — one row per company with classification, status code, redirect chain.

**Verification gate:**
- All 428 enabled rows classified (no errors).
- Bucket counts logged to stderr.
- TSV report readable in Excel.

**Manual gate (USER):** review TSV, fix `dead` and `wrong-company-suspect` rows in `portals.yml` directly. Re-run script after fixes; expected: dead → 0, wrong-company → 0 (or all explained).

**Commit:** `feat: phase 2.8 step 0 — portals.yml URL triage script + report`

**Rollback:** `git reset --hard HEAD~1` (script is additive; portals.yml fixes are independent).

---

### §6.1 Step 1 — lib/firecrawl.mjs SDK wrapper + cost tracking

**Goal:** Centralize all Firecrawl API calls in one wrapper that handles auth, retry, error handling, mode selection, and per-call cost tracking. Implementation plans in subsequent steps import only from this module.

**File changes:**
- New: `career-ops/lib/firecrawl.mjs` (~250 lines). Exports:
  - `scrape(url, opts)` — `/v1/scrape` with `formats` from opts (default `["markdown"]`); supports `actions`, `onlyMainContent`, `timeout`. Returns `{markdown, html, links, metadata, _cost: {credits, mode}}`.
  - `scrapeJson(url, schema, prompt, opts)` — `/v1/scrape` with `formats:["json"]` + `jsonOptions:{schema, prompt}`. Returns `{json, _cost: {credits: 5, mode: "json"}}`.
  - `JOB_LISTING_SCHEMA_V1` — exported constant for use in firecrawl-extract.mjs (NOT re-defined elsewhere).
  - `MAX_CREDITS_DEFAULT = 3000` — per-run budget cap.
  - **NO `extract()` wrapper** — `/v1/extract` is on a separate token-billed pool per verification doc; reserved for cross-page reasoning we don't need.
- New: `career-ops/test-firecrawl-wrapper.mjs` (~100 lines) — unit tests for retry logic, schema validation, cost-tracking accumulator, `--max-credits` cap behavior.
- New: `career-ops/data/firecrawl-cost.tsv` (gitignored) — per-call log: `timestamp\turl\tmode\tcredits\tstatus_code\tduration_ms`.
- Modified: `career-ops/.gitignore` — add `data/firecrawl-cost.tsv` and `data/firecrawl-cache.json`.

**API key handling:** read `FIRECRAWL_API_KEY` from `process.env`; fall back to reading `.firecrawl-key` file at repo root if env var absent. Refuse to start if neither found.

**Retry policy:** 3 retries on 5xx with exponential backoff (1s, 2s, 4s); fail-fast on 4xx (return error, don't retry).

**Verification gate:**
- `node test-firecrawl-wrapper.mjs` — all tests pass.
- Single live test: `node -e "import('./lib/firecrawl.mjs').then(m => m.scrape('https://example.com').then(r => console.log(r.markdown.length, r._cost)))"` — outputs nonzero markdown length and `{credits: 1, mode: 'markdown'}`.
- Cost log appended after live test.
- `--max-credits 0` behavior: any scrape call exits cleanly with "credit cap exceeded" message (not crash).

**Commit:** `feat: phase 2.8 step 1 — lib/firecrawl.mjs SDK wrapper + cost tracking + tests`

**Rollback:** `git reset --hard HEAD~1`. Remove `data/firecrawl-cost.tsv`.

---

### §6.2 Step 2 — lib/ats-clients.mjs (8-provider direct-API tier)

**Goal:** Provide a shared library housing the JSON-API logic for all 8 supported ATS providers. The Greenhouse/Ashby/Lever logic is **DUPLICATED** from `scan.mjs` (NOT extracted) — preserves D-3 invariant.

**File changes:**
- New: `career-ops/lib/ats-clients.mjs` (~400 lines). Exports:
  - `fetchGreenhouse(slug)` — `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`
  - `fetchAshby(slug)` — `GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`
  - `fetchLever(slug)` — `GET https://api.lever.co/v0/postings/{slug}?mode=json`
  - `fetchWorkdayCxs(tenant, site, region)` — `POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` body `{appliedFacets:{}, limit:20, offset:0, searchText:""}` then per-job `GET .../job/{externalPath}`
  - `fetchSmartrecruiters(companyId)` — `GET https://api.smartrecruiters.com/v1/companies/{companyId}/postings`
  - `fetchPersonio(slug)` — `GET https://{slug}.jobs.personio.de/xml?language=en`
  - `fetchRecruitee(provider-specific URL)` — public jobs feed
  - `fetchWorkable(slug)` — `GET https://apply.workable.com/api/v1/widget/accounts/{slug}` (legacy fallback `https://www.workable.com/api/accounts/{slug}?details=true`)
  - All `fetch*` functions return normalized `{jobs: [{title, location, url, description, raw}]}` shape so downstream code is provider-agnostic.
- New: `career-ops/test-ats-clients.mjs` (~150 lines) — integration tests against representative known-good URLs for each of the 8 providers. Uses fixtures or live calls (live by default; `--offline` flag uses fixtures).

**Verification gate:**
- `node test-ats-clients.mjs` — all 8 provider tests pass.
- D-3 invariant check: `git log scan.mjs --since=2026-04-29` returns empty (no commits to scan.mjs during Phase 2.8).
- Each provider fetch returns ≥1 job for the test URL.

**Commit:** `feat: phase 2.8 step 2 — lib/ats-clients.mjs 8-provider direct-API library`

**Rollback:** `git reset --hard HEAD~1`.

---

### §6.3 Step 3 — 5 sibling adapters in scripts/ats-adapters/

**Goal:** Wire each new ATS provider into the pipeline as a sibling script to `scan.mjs`. Each reads `portals.yml` + `data/ats-discovery-cache.json`, fetches via `lib/ats-clients.mjs`, writes to `data/pipeline.md` + `data/scan-history.tsv` in the same format as `scan.mjs`.

**File changes:**
- New: `scripts/ats-adapters/workday-cxs.mjs` (~80 lines)
- New: `scripts/ats-adapters/smartrecruiters.mjs` (~60 lines)
- New: `scripts/ats-adapters/personio.mjs` (~60 lines)
- New: `scripts/ats-adapters/recruitee.mjs` (~60 lines)
- New: `scripts/ats-adapters/workable.mjs` (~60 lines)
- New: `scripts/ats-adapters/run-all.mjs` (~80 lines) — orchestrator that fans out to all 5 adapters using portals.yml + discovery cache. Sequential by default per design v2 §5.4.
- New: `scripts/ats-adapters/README.md` — documentation including: (a) how each adapter detects its provider, (b) **explicit JazzHR exclusion notice** (UNVERIFIABLE per verification doc; AC-9), (c) extension pattern for future adapters.

**Verification gate:**
- `node scripts/ats-adapters/run-all.mjs --dry-run` — outputs would-be calls without executing; no errors.
- One live integration test per adapter (using a known-good company from portals.yml or test fixture).
- AC-9 verification: README mentions JazzHR exclusion explicitly.

**Commit:** `feat: phase 2.8 step 3 — 5 sibling ATS adapters per D-15 (workday-cxs/smartrecruiters/personio/recruitee/workable)`

**Rollback:** `git reset --hard HEAD~1`.

---

### §6.4 Step 4 — firecrawl-discover.mjs (Layer 1)

**Goal:** Primary branded-page entrypoint. For each branded `careers_url` (per Step 0 triage bucket B), call Firecrawl `/v1/scrape` with `formats:["html","links"]`, scan link list + html for 8-provider ATS markers, write discovered slug to `data/ats-discovery-cache.json`.

**File changes:**
- New: `career-ops/firecrawl-discover.mjs` (~300 lines). Logic:
  1. Read `career-ops/portals.yml` enabled rows where `careers_url` is NOT direct-ATS.
  2. Read `data/ats-discovery-cache.json` (60-day TTL with fast-fail re-discovery on 4xx/5xx).
  3. For each cache miss / fast-fail entry:
     - Call `lib/firecrawl.mjs` `scrape(url, {formats: ["html", "links"]})`.
     - Scan returned HTML + link list against 8-provider regex map.
     - If found: write `{[company]: {ats, slug, discovered_at, source_url}}` to cache.
     - If not found AND not at depth 2: drill — pick up to 3 inner careers/jobs links, retry detection.
     - If still not found at depth 2: mark `{[company]: {ats: null, last_attempt: ..., status: "no-ats-found"}}`.
  4. Respect `--max-credits N` (default 3000); clean exit on cap.
- New: `career-ops/data/ats-discovery-cache.json` (gitignored if not already; verify in `.gitignore`).
- New: `career-ops/test-firecrawl-discover.mjs` (~120 lines) — unit tests for ATS detection regex (each of 8 providers); integration test on a known-branded company.

**Verification gate:**
- `node test-firecrawl-discover.mjs` — all tests pass.
- Live test on Cloudflare URL: should detect `greenhouse` provider with slug `cloudflare`.
- Cost log shows ~1 credit per call (markdown mode); no JSON-mode calls.
- `--max-credits 5` test: stops cleanly after 5 calls.

**Commit:** `feat: phase 2.8 step 4 — firecrawl-discover.mjs Layer 1 ATS discovery`

**Rollback:** `git reset --hard HEAD~1`. Delete `data/ats-discovery-cache.json` if any state was written during testing.

---

### §6.5 Step 5 — Smoke validation on 50-sample

**Goal:** Re-run the Phase 2.7 sample-50 (seed=42) through the new Layer 0 + Layer 1 pipeline. Compare coverage to Phase 2.7 baseline (13/50, 26%). Target: ≥40/50 (80%).

**File changes:**
- New: `scripts/sample-portals-50-v2.py` (~100 lines) — same as Phase 2.7 sample script BUT uses `ruamel.yaml` instead of `pyyaml.dump` to preserve YAML comment groups (fix for the bug in commit eacb2c3).
- (transient) sample portals.yml file via cp+overwrite-and-restore (NEVER mv-swap, per advisor's Phase 2.7 §11A guidance).

**Procedure:**
1. Backup live state: `cp portals.yml portals.yml.bak; cp pipeline.md pipeline.md.bak; cp scan-history.tsv scan-history.tsv.bak`.
2. Generate sample-50.yml via `scripts/sample-portals-50-v2.py --seed 42`.
3. `cp` sample-50.yml over portals.yml (overwrite, NOT mv).
4. Reset pipeline.md + scan-history.tsv to empty.
5. Run: `node scan.mjs && node firecrawl-discover.mjs && node scripts/ats-adapters/run-all.mjs && node enrich-jobs.mjs && node export-jobs.mjs`.
6. Inspect pipeline.md row count + Excel S/A/B/C distribution.
7. Restore via cp+overwrite from backups.
8. Verify `git diff` shows no changes to portals.yml, pipeline.md, scan-history.tsv.

**Verification gate (AC-2):**
- ≥38/50 companies (≥75%) produce ≥1 job in pipeline.md.
- Cost log: total credits spent ≤500 (mostly Layer 1).
- Restore is clean: `git diff portals.yml pipeline.md scan-history.tsv` is empty.

**Manual gate (USER):** review sample run results before proceeding to Step 6. If <75% coverage, surface findings — may indicate Step 0 URL triage missed something, or a new ATS provider showed up that we haven't covered.

**Commit:** `chore: phase 2.8 step 5 — smoke validation on sample-50 (coverage X/50)` — commit script + summary, NOT the transient sample state.

**Rollback:** `git reset --hard HEAD~1`. Backups already restored via procedure step 7.

---

### §6.6 Step 6 — firecrawl-extract.mjs (Layer 2)

**Goal:** Structured listing extraction for genuinely custom careers pages (Shopify, Expedia-style) that survived Layer 1 with no ATS detected. Uses `/v1/scrape` + `formats:["json"]` + `jsonOptions` (5 credits/page).

**File changes:**
- New: `career-ops/firecrawl-extract.mjs` (~200 lines). Logic:
  1. Read `data/ats-discovery-cache.json`; collect entries with `ats: null, status: "no-ats-found"`.
  2. For each: call `lib/firecrawl.mjs` `scrapeJson(url, JOB_LISTING_SCHEMA_V1, prompt)`.
  3. Filter results via `title_filter` from portals.yml (same as scan.mjs).
  4. Append to `data/pipeline.md` + `data/scan-history.tsv` in identical format to scan.mjs output.
- New: `career-ops/test-firecrawl-extract.mjs` (~80 lines) — integration test on Shopify-style URL (per smoke test).

**Verification gate:**
- `node test-firecrawl-extract.mjs` — passes.
- Live test on Shopify URL: returns ≥5 jobs in normalized format.
- AC-5 verification: `grep -r "v1/extract\|extractorOptions\|extractionSchema" career-ops/firecrawl-extract.mjs career-ops/lib/firecrawl.mjs` returns no matches (legacy API not used).
- Cost log shows JSON-mode calls at 5 credits/page.

**Commit:** `feat: phase 2.8 step 6 — firecrawl-extract.mjs Layer 2 structured listing extraction`

**Rollback:** `git reset --hard HEAD~1`.

---

### §6.7 Step 7 — enrich-jobs.mjs Firecrawl-first refactor

**Goal:** Refactor existing `enrich-jobs.mjs` to be **pure Firecrawl-first** per Q-FC-4 (D-14). Primary path = Firecrawl `/v1/scrape` markdown (1 credit/page). HTTP fallback ONLY on Firecrawl outage. NOT a cost-routing optimization.

**File changes:**
- Modified: `career-ops/enrich-jobs.mjs` (~100 lines net change — refactor `enrichOne()`):
  - Replace `fetchTier1` (plain HTTP) + `fetchTier2` (Playwright) primary order with:
    - `fetchFirecrawl` (primary): `lib/firecrawl.mjs` `scrape(url, {formats:["markdown"], onlyMainContent: true})`.
    - `fetchHttp` (fallback): plain HTTP, ONLY triggered on Firecrawl 5xx / timeout / `--max-credits` exhaustion.
  - `extractSignals()` unchanged (pure function on text input).
  - Cache schema unchanged (`data/job-descriptions-cache.json`).
- Modified: `career-ops/test-enrich-signals.mjs` — add 2-3 tests covering Firecrawl markdown output shape (verify `extractSignals` works on cleaner input).

**Verification gate:**
- `node test-enrich-signals.mjs` — all tests pass (existing 19/19 + new ones).
- Live test: enrich one URL via Firecrawl, verify `_cost: {credits:1, mode:'markdown'}` logged.
- AC-3 partial verification: location + comp signals on ≥40% of test JDs (vs 9-12% in Phase 2.7 baseline). Final verification at Step 10.
- AC-5 grep audit: no `/v1/extract` or legacy keys in enrich-jobs.mjs.

**Commit:** `refactor: phase 2.8 step 7 — enrich-jobs.mjs pure Firecrawl-first per Q-FC-4`

**Rollback:** `git revert HEAD` (modifies existing file; reset would lose other Step 7 work).

---

### §6.8 Step 8 — Wire full-scan chain in package.json

**Goal:** Update `npm run full-scan` to chain through the new architecture in the right order.

**File changes:**
- Modified: `career-ops/package.json` scripts section:
  - Add: `firecrawl-discover` → `node firecrawl-discover.mjs`
  - Add: `firecrawl-extract` → `node firecrawl-extract.mjs`
  - Add: `ats-adapters` → `node scripts/ats-adapters/run-all.mjs`
  - Update: `full-scan` → `npm run scan && npm run firecrawl-discover && npm run ats-adapters && npm run firecrawl-extract && npm run enrich && npm run export`
  - Keep `custom-scrape` script (Layer 3 fallback; `--no-firecrawl` mode)

**Verification gate:**
- `npm run full-scan --dry-run` (or `--list`) — chain prints all 6 steps in order.
- Each individual `npm run X` works in isolation (smoke test each).

**Commit:** `chore: phase 2.8 step 8 — wire full-scan chain through new architecture`

**Rollback:** `git revert HEAD`.

---

### §6.9 Step 9 — Dashboard rate-cap manual verification gate

**Goal:** Confirm Firecrawl per-plan RPM / concurrency caps from the dashboard before any high-concurrency batch runs.

**Procedure:**
1. **Manual (USER):** log in to firecrawl.dev/dashboard.
2. Document RPM, concurrency, monthly credit caps in `data/firecrawl-plan-caps.tsv`.
3. If observed caps allow, document maximum safe concurrency for our use case.
4. Until verified, default ALL Layer 1 + Layer 2 + enrichment loops to **sequential** (concurrency=1).

**File changes:**
- New: `career-ops/data/firecrawl-plan-caps.tsv` (gitignored) — single-row record of dashboard observations.
- Documentation: append to `docs/agents/claude.md` work log entry with the verified caps.

**Verification gate (AC-10):**
- `data/firecrawl-plan-caps.tsv` exists and has at least the 4 fields (rpm, concurrent, monthly_credits, observed_at).
- All Layer 1/2/enrichment scripts default to `CONCURRENCY=1`.
- Concurrency increase only via explicit `--concurrent N` flag, with N ≤ documented dashboard cap.

**Commit:** `chore: phase 2.8 step 9 — Firecrawl plan caps manual verification (sequential default)`

**Rollback:** N/A (documentation step; nothing to undo).

---

### §6.10 Step 10 — Sample-50 verification (full pipeline)

**Goal:** Re-run sample-50 end-to-end through the FULL new pipeline (scan → discover → adapters → extract → enrich → export). Verify ≥75% coverage AC-2 and ≥40% per-JD signal hit rate AC-3.

**Procedure:**
1. Same backup-cp-restore pattern as Step 5.
2. Run: `npm run full-scan` against sample-50 portals.yml.
3. Open generated Excel; inspect:
   - Pending Jobs sheet: row count, S/A/B/C distribution, location detection rate, comp parse rate.
   - By Company sheet: companies with 0 jobs.
   - Cost log totals: should be ≤2150 credits (per design v2 §5.2).
4. Restore via cp+overwrite.

**Verification gate:**
- AC-2: ≥38/50 companies produce jobs.
- AC-3: location + comp on ≥40% of JDs.
- AC-7: cost log shows mode-split rows (markdown / json-mode / direct-api).
- Restore clean: `git diff` empty for portals.yml, pipeline.md, scan-history.tsv, applications.md.

**Manual gate (USER):** review sample-50 results in Excel. If S-tier emerges with reasonable companies + role types, proceed to Step 11. If not, surface findings — may indicate Step 7 enrichment needs tuning.

**Commit:** `chore: phase 2.8 step 10 — sample-50 verification (coverage X/50, signal rate Y%)`

**Rollback:** `git reset --hard HEAD~1`. Backups already restored via procedure.

---

### §6.11 Step 11 — Acceptance audit (11 ACs)

**Goal:** Run all 11 ACs from design plan v2 §7 as a final gate before merging Phase 2.8 to main.

**File changes:**
- New: `scripts/acceptance-audit-phase2.8.py` (~250 lines) — runs all 11 ACs programmatically (where possible) or surfaces manual checks (where not):
  - AC-1: smoke-test 5 URLs, count slug discoveries (≥4).
  - AC-2: re-run sample-50, count coverage (≥38/50).
  - AC-3: re-run enrichment, compute signal hit rate (≥40%).
  - AC-4: 5 adapter integration tests pass.
  - AC-5: grep audit (no `/v1/extract`/legacy keys).
  - AC-6: TTL behavior — manipulate cache timestamps, verify fast-fail.
  - AC-7: cost log mode-split present.
  - AC-8: `git log scan.mjs --since=2026-04-29` empty.
  - AC-9: README mentions JazzHR exclusion.
  - AC-10: `firecrawl-plan-caps.tsv` exists; sequential default.
  - AC-11: count `custom-scraper.mjs` invocations across last sample run; ≤5%.

**Verification gate:** all 11 ACs PASS.

**Commit:** `chore: phase 2.8 step 11 — acceptance audit script + 11/11 PASS verification`

**Rollback:** `git reset --hard HEAD~1`.

---

### §6.12 Step 12 — Phase 2.6 clean rescan (READY signal — execution out of scope)

**Goal:** Tag the post-Phase-2.8 state as the new clean baseline + signal that Phase 2.6 rescan is unblocked.

**Actions:**
1. Tag: `git tag scan-v2-prerescan -m "Phase 2.8 architecture in place; ready for Phase 2.6 clean rescan"`.
2. Update `docs/STATUS.md` Up Next: Phase 2.6 clean rescan instructions.

**No execution of the actual rescan in this step** — that's a follow-up session per user direction (running rescan with the architecture in place produces 1000+ jobs and is its own scope).

**Verification gate:** tag created.

**Commit:** `chore: phase 2.8 step 12 — tag scan-v2-prerescan; update STATUS for Phase 2.6 readiness`

**Rollback:** `git tag -d scan-v2-prerescan; git reset --hard HEAD~1`.

## §7. Acceptance criteria mapping

| AC | Description | Verified by step |
|---|---|---|
| AC-1 | firecrawl-discover.mjs recovers ATS slugs for ≥4 of 5 smoke-test companies | Step 4 + Step 11 |
| AC-2 | Sample-50 coverage ≥75% | Step 5 + Step 10 + Step 11 |
| AC-3 | Per-JD enrichment yields location+comp on ≥40% of JDs | Step 7 + Step 10 + Step 11 |
| AC-4 | 5 new direct-API adapters have integration tests passing | Step 2 + Step 3 + Step 11 |
| AC-5 | No code path uses /v1/extract or legacy schema keys | Step 1 + Step 6 + Step 7 + Step 11 (grep audit) |
| AC-6 | ATS discovery cache TTL is 60 days with fast-fail re-discovery | Step 4 + Step 11 |
| AC-7 | data/firecrawl-cost.tsv mode-split log | Step 1 + Step 10 + Step 11 |
| AC-8 | D-3 invariant — scan.mjs not modified | Pre-flight + Step 2 + Step 11 |
| AC-9 | JazzHR explicit out-of-scope | Step 3 + Step 11 |
| AC-10 | Per-plan rate cap dashboard verification + --max-credits | Step 1 + Step 9 + Step 11 |
| AC-11 | custom-scraper.mjs Playwright path triggers ≤5% on normal run | Step 10 + Step 11 |

## §8. Implementation-specific risks

| ID | Risk | Mitigation |
|---|---|---|
| RI-1 | Firecrawl API breaking change mid-implementation | Step 1 wrapper isolates; pin SDK version in lib/firecrawl.mjs; one update point |
| RI-2 | Workday CXS endpoint shape varies by tenant | Step 2 ats-clients tests across 3 representative Workday tenants (HPE-style, sifive-style, smaller-co-style) |
| RI-3 | SmartRecruiters / Personio / Recruitee / Workable adapters fail on edge-case URL formats | Step 3 README documents detection regex per provider; test-ats-clients.mjs covers each |
| RI-4 | Layer 1 discovery returns ambiguous slugs (multiple ATS hosts found in one page) | Resolution rule: pick the FIRST match in document order; log ambiguity to cache for human review |
| RI-5 | Sample-50 coverage target (≥75%) not met | Surface findings to user; may indicate (a) Step 0 URL triage gap, (b) new ATS provider not in 8-tier, (c) Firecrawl reliability issue. Don't proceed to Step 6 until resolved |
| RI-6 | Per-run credit consumption exceeds projection | --max-credits cap enforced in Step 1; Step 10 logs actual vs projected; if >2x projected, surface and re-budget |
| RI-7 | Firecrawl per-plan rate caps lower than expected | Step 9 manual gate catches this BEFORE high-concurrency runs; sequential default protects from accidental overage |
| RI-8 | enrich-jobs.mjs HTTP fallback never triggers (silent Firecrawl-only behavior in tests) | Step 7 tests include forced-failure case (mock Firecrawl 5xx) to verify fallback path actually works |

## §9. Open questions / deferred decisions

- **QI-1**: Where exactly do the 5 sibling adapters live — `scripts/ats-adapters/` or `career-ops/scripts/ats-adapters/`? Per D-3 invariant, they must NOT live inside vendored `career-ops/` if they extend functionality. Recommend: `scripts/ats-adapters/` (project root), as our own scripts directory. Final decision in Step 3 implementation.
- **QI-2**: Should Layer 1 discovery write its own `data/ats-discovery-cache.json` OR continue using the existing `data/ats-discovery-cache.json` from custom-scraper.mjs? Recommend: same file (don't fragment cache state). Layer 1 discovery becomes the new writer; custom-scraper.mjs reads it for Layer 3 fallback consistency.
- **QI-3**: How does `firecrawl-extract.mjs` Layer 2 know which companies to extract from? Read from `ats-discovery-cache.json` entries with `status: "no-ats-found"`. Document in Step 6.
- **QI-4**: What's the exact JSON-Schema for Layer 2 `JOB_LISTING_SCHEMA_V1`? Recommend: `{type:"object", properties:{jobs:{type:"array", items:{type:"object", properties:{title:{type:"string"}, location:{type:"string"}, url:{type:"string"}, department:{type:"string"}}, required:["title","url"]}}}, required:["jobs"]}`. Spec in Step 1 implementation.
- **QI-5**: Should the implementation plan add a `--no-firecrawl` global flag for testing without burning credits, or is `--max-credits 0` enough? Recommend: `--max-credits 0` is enough (all Firecrawl calls fail-fast with cap exceeded). No new flag.

## §10. Reviewer checklist (for optional Codex re-review)

If user requests Codex re-review of this implementation plan before execution:

- [ ] Step order matches design plan v2 §6 (12 steps) — no skip, no re-order.
- [ ] Each step has explicit verification gate + rollback procedure.
- [ ] All 11 ACs from design v2 §7 mapped to specific verification steps in §7 of this plan.
- [ ] D-3 invariant verified at multiple steps (pre-flight, Step 2, Step 11) — `scan.mjs` not modified.
- [ ] No code path introduces `/v1/extract` or legacy `extract`/`extractorOptions` keys (AC-5 + Step 1 wrapper design).
- [ ] Pure Firecrawl-first per-JD enrichment (Q-FC-4 / D-14 / D-17) — no HTTP-first cost-routing in Step 7.
- [ ] JazzHR explicit out-of-scope (AC-9 + Step 3 README).
- [ ] Sequential default until Step 9 manual rate-cap verification (AC-10).
- [ ] Sample-50 verification at Step 5 (post-discovery) AND Step 10 (full pipeline) — different scope.
- [ ] Manual gates explicitly called out as USER actions: Step 0 (triage review), Step 5 (smoke result review), Step 9 (dashboard rate-cap), Step 10 (full sample review).

## §11. Cross-references

- Design plan v2: `docs/plans/2026-04-29-firecrawl-pivot-design.md`
- Decisions addendum: `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`
- Verification report: `docs/design/2026-04-29-firecrawl-ats-verification.md`
- Phase 2.7 implementation plan (precedent): `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`
- D-14, D-15, D-16, D-17 in `.claude/memory/decisions.md`

## §12. Implementation Plan Review Comments

(Reserved for Codex review if user requests.)
