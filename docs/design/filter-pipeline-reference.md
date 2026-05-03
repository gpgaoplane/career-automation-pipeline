---
status: active
type: design
owner: shared
last-updated: 2026-05-02T12:00:00-04:00
read-if: "you observe a missing job in jobs-YYYY-MM-DD.xlsx and need to identify which filter dropped it; or you are tuning any filter / scoring rule"
skip-if: "you only need scraper architecture (see scraping-architecture.md) or just the closure history (see STATUS.md)"
related:
  - career-ops/portals.yml
  - career-ops/scan.mjs
  - career-ops/firecrawl-discover.mjs
  - career-ops/firecrawl-extract.mjs
  - career-ops/enrich-jobs.mjs
  - career-ops/export-jobs.mjs
  - scripts/ats-adapters/_lib.mjs
  - scripts/full-scan-orchestrator.mjs
  - lib/firecrawl.mjs
  - docs/design/scraping-architecture.md
  - docs/audits/2026-05-01-fullrun-classification.md
---

# Filter Pipeline Reference

Comprehensive map of every filter, drop, and scoring rule in the
job-search pipeline. Use this when a specific job posting you expected
to see is missing from `career-ops/output/jobs-YYYY-MM-DD.xlsx` and you
need to identify which layer dropped it.

This document describes the **current architecture as committed at
`75ec403` + `fa7de8c` + `59b841f` (tag `phase-2.8-complete`)**. It does
not propose changes — it explains what's there.

---

## 1. Visual Filter Diagram

A single job posting flows from `portals.yml` to the Excel through 7
named layers. Each layer has 0 or more drop conditions. Drops are either
*silent* (job vanishes; user has no signal in the Excel) or *visible*
(job appears in the Excel, possibly low-scored).

```
                  ┌─────────────────────────────────────────────────┐
                  │  portals.yml: tracked_companies                 │
                  │  ├─ enabled: false  → Layer 0 SILENT DROP       │
                  │  └─ enabled: true   → continues                 │
                  └────────────────┬────────────────────────────────┘
                                   │
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
           ┌─────────────┐ ┌──────────────┐ ┌───────────────────┐
           │ Layer 0:    │ │ Layer 1:     │ │ Layer 1.5:        │
           │ scan.mjs    │ │ firecrawl-   │ │ ats-adapters/     │
           │ (direct ATS │ │ discover.mjs │ │ run-all.mjs       │
           │  GH/Ashby/  │ │ (branded     │ │ (cache reader,    │
           │  Lever)     │ │  pages →     │ │  8 providers)     │
           │             │ │  cache)      │ │                   │
           └──────┬──────┘ └──────┬───────┘ └─────────┬─────────┘
                  │               │                   │
                  ▼               ▼                   ▼
        ┌────────────────────────────────────────────────────────┐
        │ TITLE FILTER ✱  (3 enforcement sites; identical logic) │
        │   scan.mjs:125  │  _lib.mjs:57  │  extract.mjs:131     │
        │   case-insensitive substring on positives + negatives  │
        │   SILENT DROP — job never enters pipeline.md           │
        └────────────────────────┬───────────────────────────────┘
                                 │ (jobs that survive title filter)
                                 │
                                 │
                                 ▼
        ┌────────────────────────────────────────────────────────┐
        │ Layer 2: firecrawl-extract.mjs                         │
        │ Runs ONLY on cache `status: "no-ats-found"` companies  │
        │ JSON-mode 5cr/page, schema-validated jobs[]            │
        │ TITLE FILTER ✱ applies here too                        │
        └────────────────────────┬───────────────────────────────┘
                                 │
                                 │
                                 ▼
        ┌────────────────────────────────────────────────────────┐
        │ Layer 3: custom-scraper.mjs (post-fallback queue)      │
        │ Triggered by orchestrator if fallback queue grew       │
        │ Writes ats:"generic" to cache; jobs to pipeline.md     │
        └────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼  data/pipeline.md (= the inbox)
        ┌────────────────────────────────────────────────────────┐
        │ enrich-jobs.mjs — fetches description, extracts signals│
        │ NOT a drop layer. Failed enrichment leaves job in      │
        │ pipeline.md with desc_score:0; appears as C-tier row   │
        └────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────────────────┐
        │ export-jobs.mjs — produces jobs-YYYY-MM-DD.xlsx        │
        │ OUTPUT-TIME DROPS (silent — job vanishes from Excel):  │
        │   ① intern/internship in title (regex \b...\b)         │
        │   ② signals.deal_breaker_signal truthy                 │
        │       └─ phd_required                                  │
        │       └─ no_sponsorship_remote                         │
        │       └─ onsite_5_days_non_toronto                     │
        │       └─ hybrid_non_toronto                            │
        │ Surviving jobs scored + banded:                        │
        │   S ≥18  │  A 8-17  │  B 4-7  │  C ≤3  (all visible)  │
        └────────────────────────────────────────────────────────┘

✱ TITLE FILTER is the same `buildTitleFilter` logic implemented in 3
  files: career-ops/scan.mjs:125, scripts/ats-adapters/_lib.mjs:57,
  career-ops/firecrawl-extract.mjs:131. Each layer applies its own
  copy at scrape/extract time. Jobs failing the filter never reach
  pipeline.md and produce no signal in the Excel.
```

---

## 2. Layer-by-Layer Drop Reference

### 2.1 Layer 0 — `enabled` flag in portals.yml

**File:** `career-ops/portals.yml` `tracked_companies[]` entries.
**Drop condition:** `enabled: false` on a company row.
**Drop type:** Silent. Company is invisible to all downstream layers.
**Current count:** 55 disabled of 448 total (per Phase 2.8 closure baseline; 2026-04-30 step 0 audit + 2026-05-01 SOURCE_BROKEN round).

Every disabled row carries an explicit `note:` field documenting the
disable reason. Reference: `docs/audits/2026-04-30-step0-disabled-company-audit.md`
and `docs/audits/2026-05-01-source-broken-disables.md`.

### 2.2 Layer 0 / 1 / 2 — Title filter at scrape time (3 enforcement sites)

**The same `buildTitleFilter` logic exists in three places:**
- `career-ops/scan.mjs:125-135`
- `scripts/ats-adapters/_lib.mjs:57-66`
- `career-ops/firecrawl-extract.mjs:131-140`

**Logic (verbatim from scan.mjs):**

```javascript
function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}
```

**Decision rule:** Keep the job iff **(no positives configured OR ≥1
positive substring matches the title) AND (no negative substring
matches the title)**.

**Drop type:** Silent. Filtered jobs never enter `data/pipeline.md`.
They produce zero signal in the Excel — neither a row nor a count.

**See Section 4 for match semantics (substring vs regex/word-boundary).**

### 2.3 Layer 1 — `firecrawl-discover.mjs` (branded-page ATS discovery)

**File:** `career-ops/firecrawl-discover.mjs:264-385` (`discoverCompany` flow).
**TTL:** 60 days (`TTL_DAYS = 60` at line 51).

**Drop conditions:**

| Condition | File:line | Cache outcome | iterTargets behavior |
|-----------|-----------|---------------|---------------------|
| Cache hit fresh + valid ATS | line 272 | unchanged | Used normally |
| Cache hit fresh + `status: "ambiguous"` or `"no-ats-found"` | line 272 | unchanged | **SKIPPED** by adapters |
| Firecrawl 4xx/5xx on initial fetch | lines 280-287 | not written; row appended to `data/firecrawl-fallback-queue.tsv` | invisible to adapters this run |
| Multiple ATS candidates, no Levenshtein-≤2 company-name agreement | lines 354-368 | `{ats: null, status: "ambiguous", ...}` | **SKIPPED** by adapters |
| No ATS markers at depth 0/1/2 + Ashby direct probe also fails | lines 371-384 | `{ats: null, status: "no-ats-found", ...}` | targeted by Layer 2 |
| `--max-credits` cap exhausted mid-run | line 286, 428-432 (`CreditCapExhaustedError`) | partial cache writes; remaining companies **NOT processed this run** | manual `--max-credits` increase + re-run required |

**Layer 3 hand-off:** the orchestrator (`scripts/full-scan-orchestrator.mjs:132-141`)
checks if `data/firecrawl-fallback-queue.tsv` grew during the run. If
yes, it invokes `custom-scraper.mjs` post-chain. If Layer 3 succeeds,
jobs land in `pipeline.md` and the cache gets `ats: "generic"` entries.

### 2.4 Layer 1.5 — ATS adapters (`scripts/ats-adapters/run-all.mjs`)

**Function:** `iterTargets()` in `scripts/ats-adapters/_lib.mjs:75-103`.

**Drop conditions:**

| Condition | File:line | Reason |
|-----------|-----------|--------|
| Company name not in `enabledNames` Set (current portals.yml) | line 101 (post-P-7 fix) | Orphan cache entry from a previously-enabled company is silently skipped |
| `info.status === "no-ats-found"` or `"ambiguous"` | line 103 | Ambiguous and no-ats-found entries skipped — Layer 2 catches no-ats-found, but ambiguous gets NO retry |
| Locale-as-site bug on legacy Workday entries (`site: "en-US"`) | lines 118-120 | CXS endpoint 404s when `site` is a locale rather than the actual tenant site path. Skipped with warning. |

**Recovery for ambiguous entries:** edit cache JSON manually to set a
definite `ats:` field, OR re-run `firecrawl-discover.mjs --force --company "<name>"`
to re-discover.

### 2.5 Layer 2 — `firecrawl-extract.mjs` (no-ATS branded pages)

**File:** `career-ops/firecrawl-extract.mjs:109-176`.

**Drop conditions:**

| Condition | File:line | Outcome |
|-----------|-----------|---------|
| Cache entry status ≠ `"no-ats-found"` | line 120 (`collectExtractTargets`) | Not a target; only no-ats-found gets Layer 2 |
| Title filter at scrape time | line 131-140 | Job dropped, never enters pipeline.md |
| JSON-mode extraction fails (timeout / 5xx / scrape error) | lines 172-174 | Logged as error; **NOT queued to fallback**; cache entry stays `no-ats-found` |
| `--max-credits` cap exhausted | lines 239-241 | Remaining targets unprocessed; throws `CreditCapExhaustedError` |

**P-9 self-correction:** if Layer 2 successfully extracts jobs and the
extracted `jobs[].url` patterns match a known ATS, the cache is
*promoted* from `no-ats-found` to that ATS so future runs go through
the free direct-API path (firecrawl-extract.mjs `promoteCacheFromExtractedJobUrls`).

### 2.6 Layer 3 — `custom-scraper.mjs` (post-fallback)

**Triggered by:** the orchestrator only when the fallback queue grew
during the run (`full-scan-orchestrator.mjs:132-141`).

**Drop conditions:** Playwright failures, timeouts, anti-bot blocks.
Companies that fail Layer 3 produce zero jobs but stay marked
`ats: "generic"` in the cache for next time.

### 2.7 Enrichment — `enrich-jobs.mjs` (NOT a drop layer)

**File:** `career-ops/enrich-jobs.mjs:519-554`.

Per-job description fetcher with three tiers:
1. Firecrawl markdown (1 credit/page, primary)
2. Plain HTTP fetch (Tier 1 fallback)
3. Playwright (Tier 2 fallback)

**Critical:** even if all three tiers fail, the URL is cached with an
`error:` field and **stays in `pipeline.md`**. The Excel export still
includes the row, just with `desc_score: 0` and no signals. Failed
enrichment is therefore VISIBLE, not silent. A C-tier row with empty
`Score Notes` is the signal.

### 2.8 Export — `export-jobs.mjs` (output-time drops)

**File:** `career-ops/export-jobs.mjs:265-288` (`flatMap` filter loop).

**ONLY two output-time drops:**

| Drop | Pattern | Note |
|------|---------|------|
| Intern/internship title | `/\b(intern|internship)\b/i` (word-boundary regex) | Per D-7 mid-level pivot. 0 hits in current pipeline (already filtered at scrape). Defensive. |
| Deal-breaker signal | `signals?.deal_breaker_signal` truthy | One of `phd_required` / `no_sponsorship_remote` / `onsite_5_days_non_toronto` / `hybrid_non_toronto`. The `-5` score penalty was REMOVED 2026-05-01 (commit `75ec403`); these jobs now drop entirely instead of being penalized. |

**Visible signals:** the export prints `Dropped at output: N intern, M deal-breaker` to console (line ~290), but the dropped jobs do not appear in the Excel.

---

## 3. Full `title_filter` Keyword Inventory

Verbatim from `career-ops/portals.yml` lines 13-231. **Match is
case-insensitive substring** (see Section 4 for implications).

### 3.1 Positives (≥1 must match — currently 60 keywords across 7 groups)

```yaml
# ── AI / ML Engineering ──
- "AI Engineer"
- "ML Engineer"
- "Machine Learning Engineer"
- "Applied AI"
- "Applied ML"
- "LLM Engineer"
- "Agentic"
- "Agent Engineer"
- "GenAI"
- "Generative AI"
- "RAG"
- "MLOps"
- "LLMOps"
- "AI Platform"
- "AI Infrastructure"
- "Foundation Model"
- "Model Engineer"
- "AI Research Engineer"
- "Multimodal"
- "NLP Engineer"
- "Conversational AI"

# ── Solutions / Technical Advisory ──
- "Solutions Architect"
- "Solutions Engineer"
- "Forward Deployed Engineer"
- "Forward Deployed"
- "Customer Engineer"
- "Integration Engineer"
- "Technical Account"
- "Technical Account Manager"
- "Field Engineer"
- "Field AI"
- "Implementation Engineer"
- "Deployment Engineer"
- "AI Architect"
- "Enterprise Architect"

# ── Product Management ──
- "AI Product Manager"
- "Product Manager"
- "Technical Product Manager"
- "Technical PM"

# ── Consulting / Advisory ──
- "AI Consultant"
- "Technical Consultant"
- "AI Advisor"
- "AI Strategist"
- "Technology Consultant"

# ── Generative AI Engineering ──
- "LoRA"
- "Stable Diffusion"
- "Video Generation"
- "Content AI"
- "Prompt Engineer"

# ── Creative ──
- "Creative Technologist"
- "Technical Artist"
- "AI Trainer"
- "AI Model Trainer"
- "Image Trainer"
- "Video Trainer"
- "ComfyUI"

# ── Broad AI roles ──
- "Artificial Intelligence"
- "Deep Learning"
- "AI Developer"
- "AI Software Engineer"
- "Software Engineer, AI"
- "Software Engineer - AI"
```

**Removed 2026-05-01** (per scoring policy v2 — D-21):
- "Account Executive"
- "Enterprise Account Executive"
- "Strategic Account Executive"
- "Sales Engineer"
- "AI Sales"
- "Business Development"
- "Enterprise Sales"
- "Technical Sales"
- "Partner Sales"

These 9 keywords used to map to the AE track. After 2026-05-01, AE-only
roles are filtered at scrape time (no positive matches them anymore).
A multi-track role whose title contains both an AE phrase AND another
positive can still pass — the AE phrase just doesn't *cause* the pass.

### 3.2 Negatives (any match drops the job — currently 89 keywords across 6 categories)

```yaml
# ── Too junior ──
- "intern"
- "internship"
- "co-op"
- "coop"
- "PhD"
- "postdoc"

# ── Below mid-level IC band ──
- "Junior"
- "Jr"
- "Jr."
- "Associate"

# ── Above mid-level IC band ──
- "Senior"
- "Sr"
- "Sr."
- "Principal"

# ── IC seniority band (above mid-level) ──
- "Staff"
- "Lead"

# ── Management / C-suite ──
- "VP"
- "Vice President"
- "SVP"
- "EVP"
- "Director"
- "Head of"
- "Managing Director"
- "General Manager"
- "Chief"

# ── Wrong discipline ──
- "research scientist"
- "principal scientist"
- "staff scientist"
- "hardware engineer"
- "ASIC"
- "chip design"
- "semiconductor"
- "embedded"
- "FPGA"
- "firmware"
- "mechanical engineer"
- "electrical engineer"
- "civil engineer"
- "recruiter"
- "talent acquisition"
- "hr manager"
- "human resources"
- "payroll"
- "accountant"
- "financial analyst"
- "legal counsel"
- "paralegal"
- "attorney"
- "administrative"
- "executive assistant"
- "office manager"
- "facilities"
- "supply chain"
- "procurement"
- "safety engineer"
- "quality assurance"
- "security analyst"
- "network engineer"
- "systems administrator"
- "database administrator"
- "data entry"
- "customer support"
- "marketing manager"
- "social media manager"
- "graphic designer"
- "ui designer"
- "ux designer"
- "copywriter"
- "content writer"
- "journalist"
- "radiologist"
- "physician"
- "nurse"
- "clinical"
- "neuroscientist"
- "biologist"
- "chemist"

# ── Region: not US / Canada / China / HK ──
# Note: only filters roles that include location in the title.
# Roles without a location in the title are handled at evaluation.
- "EMEA"
- "Europe"
- "Germany"
- "France"
- "Italy"
- "Spain"
- "Netherlands"
- "Belgium"
- "Sweden"
- "Denmark"
- "Norway"
- "Finland"
- "Switzerland"
- "Austria"
- "Poland"
- "Czech"
- "Romania"
- "Portugal"
- "Ireland"
- "Serbia"
- "UK"
- "London"
- "Berlin"
- "Paris"
- "Amsterdam"
- "Dublin"
- "Israel"
- "UAE"
- "Middle East"
- "MENA"
- "Africa"
- "Japan"
- "Korea"
- "Australia"
- "New Zealand"
- "ANZ"
- "India"
- "APAC"
- "LATAM"
- "Latin America"
- "Brazil"
- "Mexico"

# ── Language: non-English / non-Chinese required ──
# Covers both formats: "German speaking" and ", German" suffix variants
- "German"
- "French"
- "Spanish"
- "Italian"
- "Korean"
- "Japanese"
- "Portuguese"
- "Dutch"
- "Arabic"
- "Hebrew"
- "Russian"
- "Polish"
- "Swedish"
- "Norwegian"
- "Danish"
- "Finnish"
```

**No per-company filter overrides exist.** All enabled companies use the
same global filter.

---

## 4. Match Semantics

The scrape-time title filter uses **case-insensitive substring matching**
via `String.prototype.includes`. This is NOT regex, NOT word-boundary
matching, NOT exact-phrase matching.

```javascript
// from scan.mjs:131
const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
const hasNegative = negative.some(k => lower.includes(k));
```

**Concrete implications for jobs that drop unexpectedly:**

| Job title | Positive match | Negative match | Result |
|-----------|----------------|----------------|--------|
| `"AI Engineer, Remote (US)"` | "AI Engineer" ✓ | none | **KEPT** |
| `"Senior ML Engineer"` | "ML Engineer" ✓ | "Senior" ✓ | **DROPPED** (negative wins) |
| `"Software Engineer (London / NYC / Remote)"` | "Software Engineer, AI" ✗, no other positive matches "Software Engineer" alone — actually no positive match here unless "AI" is in the title | "London" ✓ | **DROPPED** at title-filter step (no positive AND has negative) |
| `"Applied AI Engineer (PhD or 5+ years)"` | "Applied AI" ✓, "AI Engineer" ✓ | "PhD" ✓ | **DROPPED** (PhD is unconditional negative even when listed as alternative) |
| `"Staff Software Engineer, ML"` | "Machine Learning Engineer" ✗, but "ML Engineer" might or might not match depending on how "ML" is positioned. Let's say "ML Engineer" doesn't match (no contiguous substring). | "Staff" ✓ | **DROPPED** (Staff is negative; "Staff" used at some orgs as mid-level title) |
| `"Senior-level AI Engineer"` | "AI Engineer" ✓ | "Senior" ✓ (substring of "Senior-level") | **DROPPED** |
| `"Seniority: Senior, Track: AI Engineering"` | maybe "AI Engineer" if format permits — depends on title parser; in pipeline.md this is `title` field as scraped from ATS | "Senior" ✓ | **DROPPED** |
| `"Solutions Engineer (Pre-Sales), Toronto"` | "Solutions Engineer" ✓ | none currently (Sales/BD removed 2026-05-01) | **KEPT** |
| `"Account Executive, AI Sales"` | "Account Executive" — REMOVED 2026-05-01. "AI Sales" — REMOVED 2026-05-01. No other positives match. | none | **DROPPED** at positive-check (no positives match a pure-AE title) |
| `"Sr. AI Engineer"` | "AI Engineer" ✓ | "Sr." ✓ | **DROPPED** |

**Why this matters for missing jobs:** the substring approach is
intentionally lenient on positives (catches role variants) and
intentionally strict on negatives (drops at first hit). Combined, it
produces some false-negatives — real Will-fit roles dropped because of:

1. **Region words appearing alongside US-remote options.** Many global
   companies post titles like `"Software Engineer (London/NYC/Remote)"`.
   The "London" substring drops the entire row at scrape, even if the
   description body would have shown US-remote eligibility.
2. **`Senior` / `Staff` / `Principal` substring drops.** Some orgs use
   `Staff Engineer` for what's effectively mid-level IC at Google scale.
   `Principal Engineer` is similarly used at some orgs. These get
   dropped at substring level even though the description body might
   indicate a mid-level fit.
3. **`PhD` keyword drops.** Any title with "PhD" is dropped — even
   when the listing says `(PhD or 5+ years experience)` and Will has
   the years. The job is invisible to Will because the title was
   filtered before the description was ever fetched.
4. **Non-English language words in title.** "German-speaking preferred"
   and "German required" both drop because the substring "German"
   matches both. No semantic distinction at filter time.

These are observed behaviors of the current filter. This document does
not propose changes — it describes what's there.

---

## 5. Cache Schema Variants

`career-ops/data/ats-discovery-cache.json` is a JSON dictionary keyed
by company name. Five distinct entry shapes can appear:

### 5.1 v1 Legacy (custom-scraper.mjs writes)

```json
{
  "Acme Corp": {
    "ats": "workday",
    "tenant": "acme",
    "instance": "wd1",
    "site": "External_Careers",
    "discovered": "2026-04-15"
  }
}
```

`ats` may be `"workday"` (legacy alias for `"workday-cxs"`),
`"greenhouse"`, `"ashby"`, or `"lever"`. The `site` field has a known
bug: sometimes contains a locale string (`"en-US"`) instead of the
actual Workday site path. `iterTargets` in `_lib.mjs:118-120` skips
these with a warning.

### 5.2 v2 New (firecrawl-discover.mjs writes)

```json
{
  "Acme Corp": {
    "ats": "ashby",
    "slug": "acme",
    "discovered_at": "2026-05-01T03:00:00.000Z",
    "source_url": "https://acme.com/careers",
    "depth": 0
  }
}
```

For Workday CXS specifically: `host` and `site` fields rather than
`slug`. May also include `candidates: [...]` array if multiple ATS
markers were detected on the source page.

### 5.3 Ambiguous (firecrawl-discover.mjs unresolved)

```json
{
  "Acme Corp": {
    "ats": null,
    "status": "ambiguous",
    "last_attempt": "2026-05-01T03:00:00.000Z",
    "candidates": [
      { "provider": "ashby", "slug": "acme", "_score": 5 },
      { "provider": "greenhouse", "slug": "acmecorp", "_score": 5 }
    ]
  }
}
```

Triggered when multiple ATS candidates are detected and
Levenshtein-≤2 company-name agreement doesn't pick a clear winner.
**`iterTargets` skips these silently** (`_lib.mjs:103`). They are
NOT targeted by Layer 2 either. Manual cache edit required to
resolve — set `ats:` to the correct provider and remove `status`.

### 5.4 No-ATS-Found (firecrawl-discover.mjs exhausted)

```json
{
  "Acme Corp": {
    "ats": null,
    "status": "no-ats-found",
    "last_attempt": "2026-05-01T03:00:00.000Z",
    "source_url": "https://acme.com/careers"
  }
}
```

Triggered after depth-0/1/2 drilling + Ashby direct probe all fail.
**This is the only status Layer 2 (`firecrawl-extract.mjs`) targets.**
JSON-mode extraction may recover jobs.

### 5.5 Generic (custom-scraper.mjs Layer 3)

```json
{
  "Acme Corp": {
    "ats": "generic",
    "discovered": "2026-05-01"
  }
}
```

Written by the post-fallback custom-scraper pass. No `slug`, no
`tenant`, no API endpoint to probe. The `full-run-audit.mjs` script
(post-rescan classifier) cannot probe these — they classify as
`NO_OPEN_JOBS` by default unless they had exported jobs in this run.

---

## 6. Scoring + Dealbreaker Formulas

Once a job passes the title filter and reaches `pipeline.md`, two
score components combine to produce a `pre_score`, which determines
the band (S/A/B/C) shown in the Excel.

### 6.1 Title score (`computeTitleScore` in `export-jobs.mjs:148-178`)

```javascript
function computeTitleScore(job, trackMap, companyMap) {
  const tracks = deriveMatchTrack(job.title, trackMap);
  const meta = companyMap.get(job.company);
  const rank = meta?.rank ?? 9999;
  const category = meta?.category ?? '';
  const rankTier = rank <= 50 ? 4 : rank <= 150 ? 3 : rank <= 300 ? 2 : 1;
  const categoryBonus = PREFERRED_CATEGORIES.has(category) ? 2 : 0;

  const titleLower = job.title.toLowerCase();
  let titleStrength = 0;
  if (/\b(senior|sr\.?|principal)\b/i.test(titleLower)) titleStrength = -5;
  else if (/\b(junior|jr\.?|associate)\b/i.test(titleLower)) titleStrength = -2;

  if (tracks.length === 0) {
    return { tracks: ['?'], score: rankTier + categoryBonus + titleStrength, breakdown: ... };
  }

  const trackWeight = Math.max(...tracks.map(t => TRACK_WEIGHTS[t] || 0));
  const multiTrackBonus = tracks.length >= 2 ? 1 : 0;
  const score = trackWeight + multiTrackBonus + rankTier + categoryBonus + titleStrength;
  return { tracks, score, breakdown: ... };
}
```

**Components:**

| Component | Value |
|-----------|-------|
| Track weight (`TRACK_WEIGHTS`) | AI-ENG: 5 · GEN-AI: 5 · SA: 4 · PM: 4 · CONSULT: 3 · CREATIVE: 3 · AE: 3 |
| Multi-track bonus | `+1` if `tracks.length >= 2` |
| Rank tier | rank ≤50 → +4 · ≤150 → +3 · ≤300 → +2 · >300 → +1 |
| Category bonus | `+2` if company's category is in `PREFERRED_CATEGORIES` |
| Title strength penalty (Senior/Sr/Principal, regex `\b...\b`) | `-5` |
| Title strength penalty (Junior/Jr/Associate, regex `\b...\b`) | `-2` |
| `tracks.length === 0` (no track keyword matched) | `tracks: ['?']`, no track weight contributed |

**Note:** title-strength uses **word-boundary regex** here, unlike the
substring match at the scrape-time filter. So at the scoring layer,
"Seniority" wouldn't trigger the -5 penalty (no word-boundary `senior`
hit). But at the scrape-time filter, "Seniority" DOES drop the row
because of the substring match on "Senior". These are two different
match modes — read carefully when diagnosing.

**`PREFERRED_CATEGORIES`** (export-jobs.mjs:126-137):

```javascript
const PREFERRED_CATEGORIES = new Set([
  'AI Agents',
  'AI 3D Generation',
  'AI Video Generation',
  'AI Video Understanding',
  'AI Video / Avatar Generation',
  'AI Video/Audio Editing',
  'AI Coding Tools',
  'AI Coding Assistant',
  'AI Coding / Vibe-Coding',
  'AI Coding CLI',
  'AI Embeddings',
  'AI Embeddings / Open-Source',
  'AI Cloud Infrastructure',
  'AI Healthcare',
  'AI Financial Planning',
  'Data Cloud / AI Features',
  'Data Integration / AI Pipeline',
  'AI Data Labeling',
  'AI Data Labeling / Programmatic',
  'AI Foundation Models',
  'Foundation Models',
  'AI Sales / GTM AI',
]);
```

**`GROUP_TO_TRACK`** map (drives `deriveMatchTrack`):

```javascript
const GROUP_TO_TRACK = {
  'AI / ML Engineering': 'AI-ENG',
  'Solutions / Technical Advisory': 'SA',
  'Sales / Business Development': 'AE',  // group removed from positives 2026-05-01;
                                          // mapping retained but never matches
  'Product Management': 'PM',
  'Consulting / Advisory': 'CONSULT',
  'Generative AI Engineering': 'GEN-AI',
  'Creative': 'CREATIVE',
  'Broad AI roles': 'AI-ENG',
};
```

**Worked example.** Job: `"AI Engineer"` at OpenAI (rank 1, category
`"AI Foundation Models"`).
- Tracks: `["AI-ENG"]` → trackWeight = 5
- multiTrackBonus = 0
- rankTier = 4
- categoryBonus = +2
- titleStrength = 0
- **Total title score: 5 + 0 + 4 + 2 + 0 = 11**

### 6.2 Description score (`computeDescScore` in `export-jobs.mjs:180-211`)

```javascript
function computeDescScore(signals) {
  if (!signals) return { score: 0, breakdown: 'no enrichment cache hit' };
  let score = 0;
  // Toronto/GTA/Ontario/Canada-only: collapse to single +2
  const torontoHit = (signals.location_match || []).some(l => /toronto|gta|ontario|canada-only/i.test(l));
  if (torontoHit) score += 2;
  // Fully remote US: +4
  if ((signals.location_match || []).some(l => /fully remote us/i.test(l))) score += 4;
  // Comp signal: ±1 per $10K vs floor (lower bound only)
  if (signals.comp_low_thousands && signals.comp_currency && signals.comp_currency !== 'unknown') {
    const floor = signals.comp_currency === 'USD' ? 120 : 110;
    score += Math.floor((signals.comp_low_thousands - floor) / 10);
  }
  // Track keywords: +1 per unique, cap +3
  score += Math.min(3, (signals.track_keywords_matched || []).length);
  // Tech stack: +1 per unique, cap +2
  score += Math.min(2, (signals.tech_stack_matched || []).length);
  // YoE
  if (signals.yoe_signal === '3-5') score += 1;
  else if (signals.yoe_signal === '6+') score -= 1;
  else if (signals.yoe_signal === '0-2') score -= 1;
  // NOTE: deal-breaker -5 penalty was REMOVED 2026-05-01 (commit 75ec403).
  // Deal-breaker jobs are now dropped entirely at output time (see Section 2.8).
  return { score, breakdown: ... };
}
```

| Signal | Score impact |
|--------|-------------|
| Toronto / GTA / Ontario / Canada-only in `location_match` | `+2` |
| `Fully remote US` in `location_match` | `+4` |
| Comp `low_thousands` ≥ floor (USD floor $120K, CAD floor $110K) | `+1 per $10K above floor` (no cap) |
| Comp `low_thousands` < floor | `-1 per $10K below floor` (no cap) |
| Comp `currency === 'unknown'` | no contribution |
| Track keywords in description | `+1 each, cap +3` |
| Tech stack matches in description | `+1 each, cap +2` |
| YoE 3-5 | `+1` |
| YoE 6+ | `-1` |
| YoE 0-2 | `-1` |
| `signals === null` (enrichment failed) | `score = 0` |

**TRACK_KEYWORDS** matched in description text (`enrich-jobs.mjs:113-128`):
RAG, retrieval-augmented, multi-agent, agentic, LangGraph, LangChain,
LlamaIndex, vector database, vector db, embeddings, fine-tuning, LoRA,
LLMOps, MLOps, production AI, agent orchestration, Forward Deployed,
FDE, Customer Engineer, Solutions Architect, Implementation Engineer,
client-facing, post-deployment, ComfyUI, Stable Diffusion, generative
video, diffusion model, image generation, video generation, 3D
generation, AI roadmap, AI product strategy, agentic product, AI sales,
technical sales, land and expand, AI partnerships.

**TECH_STACK** matched in description text (`enrich-jobs.mjs:130-135`):
Python, PyTorch, TensorFlow, Hugging Face, transformers, LangChain,
LlamaIndex, Pinecone, Weaviate, Chroma, Qdrant, OpenAI API, Anthropic
API, Claude API, GPT-4, GCP, AWS, Vertex AI, SageMaker, Bedrock.

### 6.3 Bands (`computeBand` in `export-jobs.mjs:213-217`)

```javascript
function computeBand(preScore) {
  if (preScore >= 18) return 'S';
  if (preScore >= 8) return 'A';
  if (preScore >= 4) return 'B';
  return 'C';
}
```

S threshold raised from 12 to 18 on 2026-05-01 (per scoring policy v2 — D-21).

### 6.4 Dealbreaker patterns (`enrich-jobs.mjs:108-114`)

```javascript
const REGEXES = {
  // ... (location/yoe regexes omitted)
  dealBreakerPhd:     /\bphd required\b/i,
  dealBreakerSponsor: /\bsponsorship not available for remote\b/i,
  dealBreakerOnsite:  /\bin-office (5|five) days?\b/i,
  dealBreakerHybrid:  /\bhybrid\b(?!\s+(?:cloud|mesh|fabric))/i,
};
```

**`extractDealBreaker`** (`enrich-jobs.mjs:283-302`):

```javascript
function extractDealBreaker(text) {
  if (REGEXES.dealBreakerPhd.test(text))     return 'phd_required';
  if (REGEXES.dealBreakerSponsor.test(text)) return 'no_sponsorship_remote';
  // Onsite-5-days outside Toronto.
  const onsiteMatch = REGEXES.dealBreakerOnsite.exec(text);
  if (onsiteMatch && !nearToronto(text, onsiteMatch.index)) return 'onsite_5_days_non_toronto';
  // Hybrid outside Toronto.
  const hybridMatch = REGEXES.dealBreakerHybrid.exec(text);
  if (hybridMatch && !nearToronto(text, hybridMatch.index)) return 'hybrid_non_toronto';
  return null;
}
```

**Check order — first match wins:**
1. `phd_required` — JD body contains literal "PhD required"
2. `no_sponsorship_remote` — JD body contains literal "sponsorship not available for remote"
3. `onsite_5_days_non_toronto` — JD body contains "in-office 5 days" or "in-office five days" AND no `toronto` within ±200 chars of the match
4. `hybrid_non_toronto` — JD body contains "hybrid" not followed by `cloud`/`mesh`/`fabric` (technical contexts excluded) AND no `toronto` within ±200 chars

**`nearToronto` proximity** (`enrich-jobs.mjs:277-281`):

```javascript
function nearToronto(text, matchIndex) {
  const start = Math.max(0, matchIndex - 200);
  const end = Math.min(text.length, matchIndex + 200);
  return /\btoronto\b/i.test(text.slice(start, end));
}
```

**Implication for hybrid_non_toronto in particular:** any JD body that
mentions "hybrid" anywhere, where Toronto is NOT within 200 characters
of the hybrid mention, gets dropped at export time. Common patterns
that hit this:
- `"This role is hybrid, based out of Santa Clara, CA"` — drops
- `"#LI-Hybrid"` LinkedIn-style markers — drops
- `"hybrid in Mumbai"` — drops
- `"hybrid model with 2 days per week in office, Toronto candidates only"` — keeps (Toronto in proximity)
- `"hybrid cloud architecture"` — keeps (excluded by `(?!\s+cloud)` lookahead)

### 6.5 Deal-breaker -5 penalty was removed 2026-05-01

Pre-2026-05-01: `signals.deal_breaker_signal` truthy → desc score `-5`,
job appeared in Excel as low-scored row.

Post-2026-05-01 (commit `75ec403` — D-21): `signals.deal_breaker_signal`
truthy → job dropped entirely at export time, vanishes from Excel.
The user's manual review surface is reduced; the trade-off is that
the user has no signal in the Excel that the deal-breaker filter fired.

---

## 7. Diagnostic Recipe — Per-Job Tracing

Use this when you have a specific job (URL or title) that you expected
to see in the Excel but didn't. Each step narrows down which layer
dropped it.

### Step 1: Test against the title filter (the most likely cause)

Take the job title. Open `career-ops/portals.yml` (Section 3 of this
doc has the verbatim list) and check:

1. Does **any** positive keyword case-insensitive-substring-match the title?
   - If NO → dropped at title filter (no positive match).
   - If YES → continue to (2).
2. Does **any** negative keyword case-insensitive-substring-match the title?
   - If YES → dropped at title filter (negative wins). Note which keyword.
   - If NO → continue to Step 2.

### Step 2: Check pipeline.md for the URL or title

```bash
cd "D:/Projects/career ops"
grep -F "<URL or title fragment>" career-ops/data/pipeline.md
```

- If the URL appears → not dropped at scrape; survived to enrichment. Skip to Step 5 (export-time drops).
- If the URL does not appear AND the title is unique enough, also try grep on a substring of the title.
- If nothing matches → continue to Step 3 (the company didn't reach pipeline.md, so the issue is upstream).

### Step 3: Check the discovery cache

Look up the company name in `career-ops/data/ats-discovery-cache.json`.
The shape tells you which Layer dropped it:

```bash
cd "D:/Projects/career ops"
python -c "import json; d = json.load(open('career-ops/data/ats-discovery-cache.json')); print(d.get('<Company Name>', 'NOT IN CACHE'))"
```

| What you see | Meaning |
|--------------|---------|
| `NOT IN CACHE` | Company never reached Layer 1. Either (a) `enabled: false` in `portals.yml` (check there), or (b) `careers_url` matches a direct ATS pattern → went through Layer 0 (`scan.mjs`) instead — check Step 4. |
| `{ats: <name>, slug: ..., ...}` | Cache has a valid route. Layer 1.5 should have fetched. Check Step 4 for adapter behavior. |
| `{ats: null, status: "no-ats-found", ...}` | Layer 1 found nothing. Layer 2 should have run. Check Step 4 for Layer 2 attempts. |
| `{ats: null, status: "ambiguous", ...}` | Multi-candidate, no clear winner. **Silently skipped by adapters AND by Layer 2.** This is a known dark spot. Recovery: edit cache to set `ats:` field manually, OR run `node firecrawl-discover.mjs --force --company "<name>"`. |
| `{ats: "generic", ...}` | Layer 3 (custom-scraper) wrote this. No direct API to probe; whatever Playwright found at the time is all there is. |

### Step 4: Check the fallback queue

```bash
cd "D:/Projects/career ops"
grep "<Company Name>" career-ops/data/firecrawl-fallback-queue.tsv
```

- Present → Firecrawl errored out for this company at some layer. Layer 3 may or may not have recovered.
- Absent → no Firecrawl error logged.

### Step 5: Check the JD cache for deal-breaker signal

If the URL is in `pipeline.md`, the job survived scrape and discovery.
The remaining drop point is `export-jobs.mjs`'s output-time filter.

```bash
cd "D:/Projects/career ops"
python -c "import json; d = json.load(open('career-ops/data/job-descriptions-cache.json')); e = d.get('<URL>'); print(e.get('extracted_signals', {}).get('deal_breaker_signal') if e else 'URL NOT IN JD CACHE')"
```

| What you see | Meaning |
|--------------|---------|
| `URL NOT IN JD CACHE` | Enrichment hasn't been run for this URL, OR the URL wasn't in pipeline.md at last enrichment time. Job appears in Excel with `desc_score: 0` (C-tier likely). |
| `null` | No deal-breaker detected. Job is in the Excel; sort/filter to find it. |
| `'phd_required'` | Dropped at export — JD body has "PhD required". |
| `'no_sponsorship_remote'` | Dropped at export — JD body has "sponsorship not available for remote". |
| `'onsite_5_days_non_toronto'` | Dropped at export — JD body has "in-office 5/five days" AND no Toronto within ±200 chars. |
| `'hybrid_non_toronto'` | Dropped at export — JD body has "hybrid" (not "hybrid cloud/mesh/fabric") AND no Toronto within ±200 chars. |

### Step 6: Check the title for the intern pattern

The other output-time drop is intern/internship in title:

```javascript
/\b(intern|internship)\b/i.test(jobTitle)
```

If this matches, the job was dropped at export. Note: the title filter
at scrape time has `intern` and `internship` in its negatives too, so
this drop is rarely reached — the scrape filter usually kills intern
jobs first.

### Step 7: If the job IS in the Excel, find its band

If you've ruled out steps 1-6, the job IS in the Excel — possibly at
the bottom (C-tier) due to a low score. Open `career-ops/output/jobs-YYYY-MM-DD.xlsx`,
sort the "Pending Jobs" sheet by Pre-Score ascending, search for the
URL. Read the `Score Notes` column to see which signals fired and
how the score was composed.

---

## 8. Cross-References

- **Phase 2.8 closure decisions:** `.claude/memory/decisions.md` D-21 (scoring policy v2 + Option A signal-extraction fixes)
- **Full-run audit + classification:** `docs/audits/2026-05-01-fullrun-classification.md` + `2026-05-01-fullrun-metrics.json`
- **SOURCE_BROKEN disable rationale:** `docs/audits/2026-05-01-source-broken-disables.md`
- **Disabled cohort baseline:** `docs/audits/2026-04-30-step0-disabled-company-audit.md`
- **Architecture supersession history:** `docs/design/scraping-architecture.md` (Phase 2.8 supersession + closure notes)
- **Acceptance gates:** `scripts/acceptance-audit-phase2.8.py` + `scripts/full-run-audit.mjs`
- **Re-extract tool (no Firecrawl credits):** `scripts/reextract-signals.mjs`

---

## 9. What This Document Does NOT Cover

- Recommendations for filter relaxation — explicitly out of scope per the request that produced this doc
- Future-architecture proposals or pipeline redesigns
- Per-company filter overrides (none exist today)
- LLM-driven evaluation pipeline integration (deferred Phase 3)
- Delta detection ("what disappeared since last run") — deferred Phase 3 candidate

If you need any of the above, surface a separate request — they are
deliberately out of scope here.
