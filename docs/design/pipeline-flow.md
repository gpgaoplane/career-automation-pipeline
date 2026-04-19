# Pipeline Flow — Complete Technical Reference

> Every node, every artifact, every decision point in the career automation pipeline. Read alongside `docs/PROJECT-BRIEF.md` for narrative context.

---

## 1. Master Pipeline — End-to-End

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                             INPUTS (read-only)                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│  AI_Companies_    │     │   context/              │     │  Will's CV inputs   │
│  Consolidated_    │     │   knowledge bank/       │     │  (LinkedIn, bio,    │
│  Ranked_v2.xlsx   │     │   (read-only context)   │     │   metrics)          │
│  450 companies    │     │   kb_*.md files         │     │                     │
└────────┬──────────┘     └────────────┬────────────┘     └──────────┬──────────┘
         │                             │                             │
         │                             │                             │
         ▼                             ▼                             ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    PHASE 1 — CONFIG (built once, committed to repo)               ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
         │
  ┌──────┴──────────────────────────────────────────────────────────────┐
  │                                                                     │
  ▼                                                                     ▼
┌───────────────────────┐           ┌──────────────────────────────────────┐
│ career-ops/portals.yml│           │  career-ops/cv.md                    │
│ ─────────────────     │           │  career-ops/config/profile.yml       │
│ 448 companies         │           │  career-ops/modes/_profile.md        │
│ title_filter          │           │  career-ops/data/applications.md     │
│   positive: ~80 kw    │           │  career-ops/data/pipeline.md         │
│   negative: ~60 kw    │           │  career-ops/data/scan-history.tsv    │
│ search_queries: 12    │           └──────────────────────────────────────┘
│ api: overrides x7     │
└───────────┬───────────┘
            │
            │
            ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    PHASE 2/3 — SCRAPING (zero LLM tokens)                         ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            scan.mjs (upstream, DO NOT MODIFY)                   │
│  ─────────────────────────────────────────────────────────────────────          │
│  For each company in portals.yml:                                               │
│    if careers_url matches greenhouse.io     → Greenhouse API                    │
│    if careers_url matches ashbyhq.com       → Ashby API                         │
│    if careers_url matches lever.co          → Lever API                         │
│    if api: override specified               → Use that URL                      │
│    else                                     → SKIP (custom-scraper handles)     │
│  Apply title_filter → check scan-history.tsv for dedup → write new to pipeline  │
│  Result (first run, dry): 8 companies detected, 34 jobs found                   │
└────────────┬────────────────────────────────────────────────────────────────────┘
             │
             ▼ (skipped ~440 companies)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  custom-scraper.mjs (TO BUILD — Phase 2b)                       │
│  ─────────────────────────────────────────────────────────────────────          │
│  For each company scan.mjs skipped:                                             │
│    detect ATS from careers_url pattern                                          │
│    ├─ Workday pattern      → POST to {tenant}.wd*.myworkdayjobs.com API         │
│    ├─ SmartRecruiters      → GET api.smartrecruiters.com/v1/companies/.../postings │
│    ├─ BambooHR             → GET {company}.bamboohr.com/careers/list            │
│    ├─ Recruitee            → GET {company}.recruitee.com/api/offers/            │
│    ├─ Personio             → GET {company}.jobs.personio.de/api/v1/jobs         │
│    ├─ TeamTailor           → GET api.teamtailor.com (needs token)               │
│    ├─ iCIMS / Rippling     → Playwright (no public API)                         │
│    └─ Custom page          → fetch+cheerio (if static) OR Playwright (if JS)    │
│  Apply title_filter → dedup against scan-history.tsv → write to pipeline.md     │
└────────────┬────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────────┐
│  data/pipeline.md            data/scan-history.tsv                     │
│  ─────────────────────       ─────────────────────                     │
│  ## Pendientes               url \t first_seen \t portal \t title \t ..│
│    - [company/role](url)     https://...   2026-04-18   greenhouse ... │
│    - ...                     (dedup source of truth)                   │
│  ## Procesadas                                                         │
│    (moved here after eval)                                             │
└────────────┬───────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              export-jobs.mjs (TO BUILD — Phase 2c)                      │
│  ─────────────────────────────────────────────────────────────────────  │
│  Reads: pipeline.md + scan-history.tsv + portals.yml (metadata)         │
│  Joins: company rank, category, HQ, valuation                           │
│  Writes: output/jobs-YYYY-MM-DD.xlsx                                    │
│  Sheets: Pending Jobs | By Company | Scan History                       │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    PHASE 4 — HUMAN REVIEW (manual)                                ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│  Will opens output/jobs-YYYY-MM-DD.xlsx                     │
│  Flags which jobs to evaluate (adds flag column or marks    │
│  rows in pipeline.md). Approved jobs proceed to Phase 5.    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║           PHASE 5 — AI EVALUATION (LLM tokens consumed here)                      ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            /career-ops pipeline    OR    /career-ops batch              │
│  ─────────────────────────────────────────────────────────────────────  │
│  Inputs:                                                                │
│    - cv.md                          (proof points, metrics)             │
│    - config/profile.yml             (archetypes, comp, location)        │
│    - modes/_profile.md              (deal-breakers, scoring calib)      │
│    - modes/_shared.md               (system scoring logic)              │
│    - Job description (fetched)                                          │
│  Process per job:                                                       │
│    Block A: Role fit      Block D: Compensation    Block G: Legitimacy  │
│    Block B: Company fit   Block E: Location                             │
│    Block C: Technical     Block F: Growth                               │
│  Token cost: ~2K-4K per job                                             │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  reports/{###}-{company-slug}-{YYYY-MM-DD}.md                           │
│  ─────────────────────────────────────────────────────────────────      │
│  **URL:** https://...                                                   │
│  **Legitimacy:** {tier}                                                 │
│  Block A-G scoring + overall score /5                                   │
│  Negotiation angles, red flags, recommended framing                     │
│                                                                         │
│  batch/tracker-additions/{###}-{slug}.tsv                               │
│  ─────────────────────────────────────────────────────────────────      │
│  single-line TSV: num│date│company│role│status│score│pdf│report│notes   │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    PHASE 6 — TRACKER MERGE                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  node merge-tracker.mjs                                                 │
│  ─────────────────────────────────────────────────────────────────      │
│  Reads all TSVs in batch/tracker-additions/                             │
│  Swaps score/status column order for applications.md format             │
│  Dedup-merges into data/applications.md                                 │
│  Never creates duplicates (company+role match → update, not add)        │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  data/applications.md (MASTER TRACKER)                                  │
│  ─────────────────────────────────────────────────────────────────      │
│  | # | Date | Company | Role | Score | Status | PDF | Report | Notes |  │
│  | 1 | 2026-04-18 | HeyGen | Forward Deployed Engineer | 4.3/5 | ... |  │
│                                                                         │
│  Canonical statuses: Evaluated | Applied | Responded | Interview |      │
│                      Offer | Rejected | Discarded | SKIP                │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    PHASE 7 — APPLY                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  /career-ops pdf  → output/cvs/{company}-{role}.pdf                     │
│  ─────────────────────────────────────────────────────────────────      │
│  generate-pdf.mjs reads cv.md + templates/cv-template.html              │
│  Playwright renders HTML → PDF with tailored framing for this role      │
│                                                                         │
│  /career-ops apply  → form-filling assistant                            │
│  Will submits manually (NEVER auto-submit per ethical rules)            │
│  Update applications.md status → Applied                                │
└─────────────────────────────────────────────────────────────────────────┘
             │
             ▼
  ═══════════ REPEAT from Phase 2/3 weekly ═══════════
```

---

## 2. Scraping Layer Detail — ATS Detection & Dispatch

```
                    portals.yml (448 companies)
                              │
                              ▼
                   ┌──────────────────────┐
                   │   scan.mjs iterates  │
                   │   company by company │
                   └──────────┬───────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │  Is careers_url one of:      │
               │   *.greenhouse.io/*          │
               │   *.ashbyhq.com/*            │
               │   *.lever.co/*               │
               │   or has `api:` override?    │
               └─────┬─────────────────┬──────┘
                     │                 │
                 YES │             NO  │
                     │                 │
                     ▼                 ▼
            ┌──────────────┐    ┌───────────────────┐
            │  API CALL    │    │  Skip — logged as │
            │  (fetch)     │    │  "no API detected"│
            │  parse JSON  │    │  custom-scraper   │
            │              │    │  picks this up    │
            └──────┬───────┘    └─────────┬─────────┘
                   │                      │
                   ▼                      ▼
           ┌─────────────────┐     ┌─────────────────────────────┐
           │ Apply title     │     │  custom-scraper.mjs         │
           │ filter:         │     │  (TO BUILD)                 │
           │   positive ≥ 1  │     │  ┌───────────────────────┐  │
           │   negative = 0  │     │  │ Detect ATS by URL:    │  │
           └────────┬────────┘     │  │  myworkdayjobs.com    │  │
                    │              │  │  smartrecruiters.com  │  │
                    ▼              │  │  bamboohr.com         │  │
         ┌───────────────────┐     │  │  recruitee.com        │  │
         │ Check dedup:      │     │  │  personio.de          │  │
         │ scan-history.tsv  │     │  │  teamtailor.com       │  │
         │ & pipeline.md     │     │  │  rippling.com         │  │
         └────────┬──────────┘     │  │  icims.com            │  │
                  │                │  │  (unknown custom)     │  │
                  ▼                │  └────────┬──────────────┘  │
        ┌─────────────────┐        │           ▼                 │
        │ If new: append  │        │  ┌────────────────────────┐ │
        │ to pipeline.md  │        │  │ Pick handler:          │ │
        │ + history.tsv   │        │  │  API call (fetch)  OR  │ │
        └─────────────────┘        │  │  fetch+cheerio     OR  │ │
                                   │  │  Playwright (JS-heavy) │ │
                                   │  └────────┬───────────────┘ │
                                   │           ▼                 │
                                   │  ┌────────────────────────┐ │
                                   │  │ Extract jobs           │ │
                                   │  │ Apply title_filter     │ │
                                   │  │ Dedup against history  │ │
                                   │  │ Append to pipeline.md  │ │
                                   │  └────────────────────────┘ │
                                   │                             │
                                   │  Log failures to            │
                                   │  batch/logs/ for            │
                                   │  iterative handler fixes    │
                                   └─────────────────────────────┘
```

---

## 3. Evaluation Layer — Single Job Through `/career-ops pipeline`

```
   Job URL from pipeline.md (approved by human review)
                  │
                  ▼
   ┌─────────────────────────────────┐
   │  Fetch job description          │
   │  (Playwright — verify posting   │
   │   is still active)              │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  Load scoring context:                  │
   │                                                         │
   │   cv.md              ← proof points, metrics            │
   │   config/profile.yml ← target roles, archetypes,        │
   │                        comp, location, visa             │
   │   modes/_profile.md  ← deal-breakers, scoring calib,    │
   │                        adaptive framing                 │
   │   modes/_shared.md   ← system scoring logic (upstream)  │
   └────────────────────┬────────────────────────────────────┘
                        │
                        ▼
   ┌────────────────────────────────────────────────────────────┐
   │                  HARD-PASS CHECK                           │
   │                                                            │
   │  Universal:                                                │
   │   ├─ Company <10 employees?                → SKIP          │
   │   ├─ Pure non-technical sales?             → SKIP          │
   │   ├─ Pure AI research, no production?      → SKIP          │
   │   └─ Technical role, no meaningful AI?     → SKIP          │
   │                                                            │
   │  US roles:                                                 │
   │   ├─ Not 100% remote?                      → SKIP          │
   │   └─ Comp < $120K USD?                     → SKIP          │
   │                                                            │
   │  Canadian roles:                                           │
   │   ├─ On-site outside Toronto?              → SKIP          │
   │   └─ Comp < $90K CAD?                      → SKIP          │
   └────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │  Survives? Evaluate.   │
           │  Fails? Status=SKIP    │
           │  (still writes report) │
           └────────────┬───────────┘
                        │
                        ▼
   ┌────────────────────────────────────────────────────────────┐
   │                  BLOCK SCORING (A–G)                       │
   │                                                            │
   │  Block A: Role Fit           (archetype match)             │
   │  Block B: Company Fit        (stage, platform, team)       │
   │  Block C: Technical Depth    (AI stack alignment)          │
   │  Block D: Compensation       (USD/CAD bands, below)        │
   │  Block E: Location           (remote/hybrid/on-site)       │
   │  Block F: Growth Trajectory  (level, scope, learning)      │
   │  Block G: Legitimacy         (tier, red flags)             │
   │                                                            │
   │  Each block: 1.0–5.0 score + notes                         │
   └────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
   ┌────────────────────────────────────────────────────────────┐
   │                  ADJUSTMENTS                               │
   │                                                            │
   │  Boosts (+0.3 to +0.5):                                    │
   │   - Multi-agent / agentic systems                          │
   │   - RAG, enterprise AI deployment                          │
   │   - Series B+ established platform                         │
   │   - Named target companies (Anthropic, Glean, xAI, etc.)   │
   │                                                            │
   │  Reductions (-0.3 to -0.5):                                │
   │   - Pure frontend/UI                                       │
   │   - Non-AI SaaS with AI bolted on                          │
   │   - Semiconductor/hardware                                 │
   │   - Domain expertise Will lacks                            │
   │                                                            │
   │  Canadian on-site (Toronto):                               │
   │   - ≤3 days/week: no penalty                               │
   │   - 4–5 days/week: −0.2 (ok if comp ≥ $120K CAD)           │
   │   - Fully on-site: −0.3 (ok if comp ≥ $120K CAD)           │
   │                                                            │
   │  Canadian comp bands:                                      │
   │   - $90K–$110K CAD: −0.2, flag in report                   │
   │   - $110K–$130K CAD: good, no penalty                      │
   │   - $130K+ CAD: small boost                                │
   └────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
   ┌────────────────────────────────────────────────────────────┐
   │                  OUTPUTS                                   │
   │                                                            │
   │  reports/{###}-{slug}-{date}.md:                           │
   │    Header: URL, Legitimacy tier                            │
   │    Blocks A-G with scores and notes                        │
   │    Overall score /5                                        │
   │    Adaptive framing (which archetype to lead with)         │
   │    Negotiation angles                                      │
   │    Recommended CV bullets to emphasize                     │
   │                                                            │
   │  batch/tracker-additions/{###}-{slug}.tsv:                 │
   │    Single-line TSV for merge-tracker.mjs                   │
   │                                                            │
   │  Status assigned: Evaluated (or SKIP if hard-pass)         │
   └────────────────────────────────────────────────────────────┘
```

---

## 4. Data Layer Contract — Who Writes What

```
╔══════════════════════════════════════════════════════════════════╗
║                  DATA LAYER RULES                                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────────────────┐   ┌──────────────────────────┐     ║
║  │  data/pipeline.md        │   │  data/scan-history.tsv   │     ║
║  │  ─────────────────────   │   │  ─────────────────────── │     ║
║  │  Writers:                │   │  Writers:                │     ║
║  │   - scan.mjs             │   │   - scan.mjs             │     ║
║  │   - custom-scraper.mjs   │   │   - custom-scraper.mjs   │     ║
║  │   - /career-ops pipeline │   │                          │     ║
║  │     (moves to Procesadas)│   │  Readers:                │     ║
║  │                          │   │   - scan.mjs (dedup)     │     ║
║  │  Readers:                │   │   - custom-scraper       │     ║
║  │   - export-jobs.mjs      │   │   - export-jobs.mjs      │     ║
║  │   - /career-ops pipeline │   │                          │     ║
║  └──────────────────────────┘   └──────────────────────────┘     ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐    ║
║  │  data/applications.md          (MASTER TRACKER)          │    ║
║  │  ──────────────────────────────────────────────────      │    ║
║  │  HARD RULE: NEVER add new rows directly.                 │    ║
║  │                                                          │    ║
║  │  Add rows:   batch/tracker-additions/*.tsv               │    ║
║  │              → node merge-tracker.mjs                    │    ║
║  │              → applications.md                           │    ║
║  │                                                          │    ║
║  │  Update rows: direct edit OK for status/notes only       │    ║
║  │  Writers (via merge):                                    │    ║
║  │   - /career-ops pipeline                                 │    ║
║  │   - /career-ops batch                                    │    ║
║  │   - merge-tracker.mjs                                    │    ║
║  │  Writers (direct update):                                │    ║
║  │   - Will (manual status changes)                         │    ║
║  │   - normalize-statuses.mjs                               │    ║
║  │   - dedup-tracker.mjs                                    │    ║
║  └──────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐    ║
║  │  reports/{###}-{slug}-{date}.md                          │    ║
║  │  ──────────────────────────────────────────────────      │    ║
║  │  One per evaluated job. Sequential numbering.            │    ║
║  │  MUST include:                                           │    ║
║  │   - **URL:** header                                      │    ║
║  │   - **Legitimacy:** {tier} header                        │    ║
║  │   - Blocks A-G with scores                               │    ║
║  │   - Overall score /5                                     │    ║
║  │  Writers: /career-ops pipeline, /career-ops batch        │    ║
║  └──────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐    ║
║  │  batch/tracker-additions/*.tsv                           │    ║
║  │  ──────────────────────────────────────────────────      │    ║
║  │  Staging area. One TSV per evaluation.                   │    ║
║  │  Consumed and cleared by merge-tracker.mjs.              │    ║
║  │  Writers: /career-ops pipeline, /career-ops batch        │    ║
║  │  Consumer: merge-tracker.mjs                             │    ║
║  └──────────────────────────────────────────────────────────┘    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 5. Framework & Memory Architecture (Claude's Runtime)

```
  SESSION START
      │
      ▼
  ┌────────────────────────────────────────────────────────┐
  │         ALWAYS AUTO-LOADED (every session)             │
  │                                                        │
  │  ~/.claude/CLAUDE.md          ← global behavior        │
  │  ~/.claude/rules/behaviors.md ← universal rules        │
  │  ~/.claude/rules/memory.md    ← memory routing rules   │
  │  ~/.claude/memory/MEMORY.md   ← cross-project prefs    │
  │                                                        │
  │  D:/Projects/career ops/CLAUDE.md  ← project guide     │
  │      └─ scenario routing table (file ownership map)    │
  │      └─ file staleness protocol                        │
  │      └─ wrap-up checklist                              │
  │                                                        │
  │  .claude/rules/architecture.md ← layer ownership       │
  │  .claude/rules/pipeline.md     ← data contract         │
  │                                                        │
  │  ~/.claude/projects/D--Projects-career-ops/memory/     │
  │      MEMORY.md                 ← memory index          │
  │                                                        │
  │  docs/STATUS.md                ← via SessionStart hook │
  └────────────────────────────────────────────────────────┘
      │
      ▼
  ┌────────────────────────────────────────────────────────┐
  │      LOADED ON TRIGGER (scenario routing)              │
  │                                                        │
  │  About to evaluate job        → modes/_profile.md,     │
  │                                 modes/_shared.md       │
  │  About to tailor CV           → kb_master_resume.md    │
  │  About to build scraper       → docs/design/           │
  │                                 scraping-architecture  │
  │  About to modify portals      → docs/design/           │
  │                                 scraping-architecture  │
  │  About to write to data layer → .claude/rules/         │
  │                                 pipeline.md            │
  │  Starting session after break → docs/STATUS.md +       │
  │                                 .claude/project-memory │
  │  Tool failure                 → tool-failures.md       │
  └────────────────────────────────────────────────────────┘
      │
      ▼
  ┌────────────────────────────────────────────────────────┐
  │              WRITE ROUTING                             │
  │                                                        │
  │  Architectural decision → .claude/project-memory.md +  │
  │                           docs/design/* if substantial │
  │  Correction once       → ~/.claude/projects/.../memory │
  │  Correction 2+ times   → .claude/rules/                │
  │  Cross-project pattern → ~/.claude/memory/MEMORY.md    │
  │  Session handoff       → docs/STATUS.md                │
  │  Commands:                                             │
  │   /scf:learn-rule    ← capture correction now          │
  │   /scf:wrap-up       ← session end ritual              │
  └────────────────────────────────────────────────────────┘
```

---

## 6. File Staleness Decision Tree

```
                     A decision changed. Which files are stale?
                                    │
                                    ▼
              ┌─────────────────────────────────────────┐
              │  Which DOMAIN did the decision touch?   │
              └────────┬────────────────────────────────┘
                       │
      ┌────────────────┼──────────────────┬───────────────┬──────────────┐
      │                │                  │               │              │
      ▼                ▼                  ▼               ▼              ▼
  ┌─────────┐    ┌──────────┐      ┌────────────┐   ┌──────────┐   ┌──────────┐
  │ Scoring │    │ Scraping │      │ Data layer │   │ Project  │   │ Project  │
  │ deal-   │    │ ATS APIs │      │ contract   │   │ shape    │   │ other/   │
  │ breakers│    │ matching │      │ statuses   │   │ struct   │   │ unknown  │
  │ comp    │    │ tool     │      │ naming     │   │ commands │   │          │
  └────┬────┘    │ choice   │      └─────┬──────┘   └────┬─────┘   └────┬─────┘
       │         └─────┬────┘            │               │              │
       ▼               ▼                 ▼               ▼              ▼
  ┌──────────┐   ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
  │ UPDATE:  │   │ UPDATE:     │  │ UPDATE:      │  │ UPDATE:  │  │ Write it to  │
  │ modes/   │   │ docs/design │  │ .claude/     │  │ CLAUDE.md│  │ .claude/     │
  │ _profile │   │ /scraping-  │  │ rules/       │  │ (layout, │  │ project-     │
  │ profile. │   │ architecture│  │ pipeline.md  │  │ commands,│  │ memory.md,   │
  │ yml      │   │ .md         │  │              │  │ diagram) │  │ then decide  │
  │ CLAUDE.md│   │             │  │              │  │          │  │ at wrap-up   │
  │ PROJECT- │   │ project-    │  │ project-     │  │          │  │              │
  │ BRIEF.md │   │ memory.md   │  │ memory.md    │  │          │  │              │
  │ memory/  │   │ (decision   │  │ (decision    │  │          │  │              │
  │ user_*   │   │  log entry) │  │  log entry)  │  │          │  │              │
  └──────────┘   └─────────────┘  └──────────────┘  └──────────┘  └──────────────┘
```

---

## 7. Current Build Status

```
  PHASE 1 — Config files                    [████████████] 100% DONE
    ├─ cv.md                                ✓ committed
    ├─ config/profile.yml                   ✓ committed
    ├─ modes/_profile.md                    ✓ committed
    ├─ portals.yml (448 companies)          ✓ committed
    └─ data/ initialized                    ✓ committed

  PHASE 2 — Custom scripts                  [░░░░░░░░░░░░]   0% PENDING
    ├─ custom-scraper.mjs                   ✗ to build
    ├─ export-jobs.mjs                      ✗ to build
    └─ package.json npm scripts             ✗ to update

  PHASE 3 — First scrape run                [░░░░░░░░░░░░]   0% PENDING
    ├─ scan.mjs (3-company validation)      ⏳ recommended next
    ├─ scan.mjs (full 448)                  ⏳ after validation
    ├─ custom-scraper (8-company ATS test)  ✗ after Phase 2
    ├─ custom-scraper (full rollout)        ✗ after Phase 2
    └─ export-jobs.mjs → Excel              ✗ after Phase 2

  PHASE 4-7 — Review & evaluation loop      [░░░░░░░░░░░░]   0% PENDING
    └─ First /career-ops batch run          ✗ after Phase 3
```

---

## 8. Zero-Token vs Token-Consuming Operations

```
  ┌────────────────────────────────────┐    ┌──────────────────────────────┐
  │   ZERO LLM TOKENS                  │    │   LLM TOKENS CONSUMED        │
  │   (pure Node.js / Playwright)      │    │   (Claude evaluation)        │
  ├────────────────────────────────────┤    ├──────────────────────────────┤
  │   • scan.mjs                       │    │   • /career-ops pipeline     │
  │   • custom-scraper.mjs             │    │       ~2K-4K tokens/job      │
  │   • export-jobs.mjs                │    │   • /career-ops batch        │
  │   • merge-tracker.mjs              │    │       ~2K-4K tokens/job      │
  │   • verify-pipeline.mjs            │    │   • /career-ops pdf          │
  │   • normalize-statuses.mjs         │    │       ~3K-5K tokens/CV       │
  │   • dedup-tracker.mjs              │    │   • /career-ops deep         │
  │   • doctor.mjs                     │    │       ~5K-10K tokens/company │
  │   • generate-pdf.mjs               │    │   • /career-ops apply        │
  │     (Playwright render only)       │    │       ~3K-8K tokens/form     │
  │                                    │    │                              │
  │   ─────────────────────────────    │    │   Gate: human review of      │
  │   Cost: zero. Can run at any       │    │   Excel → only approved jobs │
  │   scale. Not limited by context    │    │   enter token-consuming      │
  │   window or rate limits.           │    │   phase. Token cost scales   │
  │                                    │    │   with approved volume only. │
  └────────────────────────────────────┘    └──────────────────────────────┘
```
