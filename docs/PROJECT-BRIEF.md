# Career Automation Pipeline — Project Brief

> **For agents:** This document is the single source of truth for onboarding to this project. Read it fully before touching any file. It covers the person, the goal, the full pipeline, the architecture, the toolchain, the current state, and all constraints.

---

## 1. The Person

**Will (Xinyuan) Guo** — Toronto-based applied AI practitioner and former founder.

- **Email:** william974314065@gmail.com | **Phone:** +1 416-508-2788
- **LinkedIn:** linkedin.com/in/xinyuan-guo | **Portfolio:** dalamula.ai
- **Languages:** English (native), Mandarin Chinese (native)
- **Education:** BSc Software Engineering (Western University), MFE (UCLA Anderson)

**Career arc:**
Moonearn (blockchain compute co-founder, 2022) → UCLA MFE → Inception Capital VC associate (AI×Web3, 120+ company evals, 2023) → Dalamula Technology co-founder & CEO (generative AI studio, Mar 2023–Mar 2026) → active job search (Apr 2026).

**Target roles (priority order):**
1. AI Engineer / Solutions Architect — production agentic systems, RAG, multi-agent
2. Account Executive / BD — AI products, technical sales
3. AI Product Manager — discovery, roadmap, KPI ownership
4. Consultant / Technical Advisory — enterprise AI deployment
5. Generative AI / Creative AI — LoRA, ComfyUI, multimodal

**Compensation target:**
- US roles: $120K–$180K USD. Minimum $120K USD.
- Canadian roles: $110K–$150K CAD. Minimum $90K CAD. Good range: $110K–$130K CAD. Excellent: $130K+ CAD.

**Hard deal-breakers:**

Universal:
- Company fewer than 10 people
- Pure non-technical sales with no AI/technical component
- Pure AI research with no path to production
- Technical role with no meaningful AI component

US roles:
- Not 100% remote → SKIP (Will works from Toronto; no US on-site or hybrid viable)
- Comp below $120K USD → SKIP
- Sponsorship is NOT a deal-breaker — remote from Toronto requires no US work authorization

Canadian roles:
- On-site >3 days/week → SKIP
- Any on-site outside Toronto → SKIP
- Comp below $90K CAD → SKIP
- $90K–$110K CAD: lower score, flag in report, not auto-SKIP

**Key metrics (use these exactly — sourced from knowledge bank):**
- Clients: 50+ | Revenue: $125K+ | Deployments: 61 documented
- LoRAs: 20+ identity/base checkpoints + ~100 style/persona LoRAs
- ComfyUI workflow versions: 23 major
- Image acceptance rate: 10% baseline → 80%+ (with LoRA)
- Video acceptance rate: 20% → 40–50%
- Follower growth per client account: 100K–200K+ avg, top 400K+
- Content views: 2M+ cumulative
- Team at Dalamula: up to 7
- Valuation term sheet: $1M (turned down at peak)
- Inception Capital: 2 IC investment commitments from 120+ evaluated companies

---

## 2. Project Goal

Build a fully automated, AI-powered job search pipeline that:

1. **Scrapes** job postings from ~130 curated AI-relevant companies (filtered from a 450-company Excel source)
2. **Exports** to Excel for human inspection
3. **Evaluates** approved postings using the career-ops AI evaluation framework
4. **Generates** tailored CVs and cover letters per role
5. **Tracks** applications through the full lifecycle

The pipeline is designed to run repeatedly (weekly rescan) with minimal manual intervention — Will reviews the Excel, approves jobs for evaluation, and the system handles everything else.

---

## 3. Repository Structure

**Repo:** `https://github.com/gpgaoplane/career-automation-pipeline`
**Local path:** `D:\Projects\career ops\` (Claude Code working directory)
**Git:** initialized at project root. `career-ops/` was absorbed (its `.git` stripped) — it is now a plain directory fully owned by this repo. Upstream reference: `https://github.com/santifer/career-ops.git` (added as `upstream` remote for occasional manual pulls).

```
career ops/                                  ← repo root, Claude Code working dir
├── CLAUDE.md                                ← project instructions for Claude (always loaded)
├── CLAUDE.local.md                          ← local overrides, never committed
├── .gitignore                               ← excludes: context/, CLAUDE.local.md, node_modules, output/, .env
├── .claude/
│   ├── settings.json                        ← Claude Code permissions
│   ├── project-memory.md                    ← in-repo committed memory scratchpad
│   └── rules/
│       ├── architecture.md                  ← layer separation, script responsibilities
│       └── pipeline.md                      ← data contract, status values, report naming
├── context/                                 ← GITIGNORED — Will's private context
│   ├── knowledge bank/                      ← read-only source of truth for CV/evaluation work
│   │   ├── 1_professional_identity/kb_will_identity.md
│   │   ├── 2_dalamula/kb_dalamula_business.md
│   │   ├── 2_dalamula/kb_dalamula_technical.md
│   │   ├── 2_dalamula/kb_dalamula_clients.md
│   │   ├── 3_experience_and_competencies/kb_technical_competencies.md
│   │   ├── 3_experience_and_competencies/kb_inception_capital.md
│   │   ├── 4_personal_projects/kb_projects_index.md
│   │   ├── 5_career_positioning/kb_master_resume_and_positioning.md  ← all resume bullets by track
│   │   └── 5_career_positioning/kb_resume_mapping_logic.md           ← bullet selection logic
│   └── AI_Companies_Consolidated_Ranked_v2.xlsx  ← 450 companies source
├── career-ops/                              ← absorbed career-ops tool (fully owned)
│   ├── CLAUDE.md                            ← career-ops system layer — DO NOT MODIFY FOR PERSONALIZATION
│   ├── scan.mjs                             ← zero-token Greenhouse/Ashby/Lever API scraper (upstream, do not modify)
│   ├── custom-scraper.mjs                   ← TO BUILD: Playwright scraper for non-API companies
│   ├── export-jobs.mjs                      ← TO BUILD: Excel exporter
│   ├── portals.yml                          ← TO BUILD: ~130 companies + title filters
│   ├── cv.md                                ← TO BUILD: Will's full CV in markdown
│   ├── config/
│   │   └── profile.yml                      ← TO BUILD: Will's personal profile
│   ├── modes/
│   │   ├── _shared.md                       ← career-ops system layer — DO NOT MODIFY
│   │   ├── _profile.template.md             ← template for _profile.md
│   │   └── _profile.md                      ← TO BUILD: Will's archetype scoring overrides
│   ├── data/
│   │   ├── applications.md                  ← TO INIT: master application tracker
│   │   ├── pipeline.md                      ← TO INIT: pending job URLs inbox
│   │   └── scan-history.tsv                 ← TO INIT: dedup history
│   ├── reports/                             ← per-job evaluation reports (generated)
│   ├── output/                              ← GITIGNORED: generated Excel files and PDFs
│   ├── batch/
│   │   ├── tracker-additions/               ← TSV files before merge (use merge-tracker.mjs)
│   │   └── logs/                            ← scraper run logs
│   ├── templates/
│   │   ├── states.yml                       ← canonical status values
│   │   └── portals.example.yml              ← portals.yml reference
│   └── package.json                         ← Node.js — xlsx already installed
└── docs/
    ├── STATUS.md                            ← session handoff, updated at every wrap-up
    ├── PROJECT-BRIEF.md                     ← this file
    ├── plans/
    │   └── 2026-04-17-career-ops-config-files.md  ← plan for Phase 1 config files
    └── design/
        └── scraping-architecture.md         ← ATS API map, matching strategy, tool choices
```

---

## 4. The career-ops Tool (Underlying System)

career-ops is an open-source Claude Code plugin for AI-powered job searching. It provides:

- **scan.mjs** — zero-LLM-token scraper that auto-detects Greenhouse, Ashby, and Lever portals from a `careers_url` and hits their APIs directly. Reads `portals.yml` for company list and title filters. Writes matches to `data/pipeline.md` and `data/scan-history.tsv`.
- **Evaluation modes** (`modes/pipeline.md`, `modes/oferta.md`, etc.) — Claude prompts that evaluate a job against the candidate's profile, scoring across blocks A–G (role fit, company fit, comp, location, growth, legitimacy, match score). Reads `cv.md`, `config/profile.yml`, `modes/_profile.md`, `modes/_shared.md`.
- **PDF generation** (`generate-pdf.mjs`) — produces tailored CV PDF from `cv.md` using HTML template.
- **Tracker** (`data/applications.md`) — markdown table tracking application status. Has strict data contract (see Section 8).
- **Slash commands** (invoked in Claude Code session from `career-ops/` directory):
  - `/career-ops scan` — scan portals
  - `/career-ops pipeline` — evaluate pending URLs from pipeline.md
  - `/career-ops oferta` — evaluate a single job URL
  - `/career-ops batch` — batch evaluate with parallel workers
  - `/career-ops pdf` — generate tailored CV PDF
  - `/career-ops tracker` — show application status
  - `/career-ops patterns` — analyze rejection patterns

**System layer (never modify for personalization):**
- `career-ops/CLAUDE.md`
- `career-ops/modes/_shared.md`
- `career-ops/scan.mjs`

**User layer (all personalization goes here):**
- `career-ops/cv.md`
- `career-ops/config/profile.yml`
- `career-ops/modes/_profile.md`
- `career-ops/portals.yml`

---

## 5. Full End-to-End Pipeline

```
SOURCE
  context/AI_Companies_Consolidated_Ranked_v2.xlsx
  450 companies, filtered to ~130 AI-relevant for portals.yml
        │
        ▼
PHASE 1 — CONFIG (build once)
  career-ops/cv.md                  ← Will's full markdown CV
  career-ops/config/profile.yml     ← personal details, comp, location, archetypes
  career-ops/modes/_profile.md      ← scoring calibration, deal-breakers, framing
  career-ops/portals.yml            ← ~130 companies + title keyword filters
  career-ops/data/ (init)           ← applications.md, pipeline.md, scan-history.tsv
        │
        ▼
PHASE 2 — SCRAPING (repeating loop, weekly)

  scan.mjs ─────────────────────── Greenhouse / Ashby / Lever APIs
                                    Zero LLM tokens. Auto-detected from portals.yml careers_url.

  custom-scraper.mjs ─────────────  All other ATS (Workday, SmartRecruiters, BambooHR, etc.)
                                    + custom career pages
                                    Playwright for JS-heavy sites; fetch+cheerio for static.
                                    Per-site handlers added iteratively after observing failures.

  Both scrapers write to:
    data/pipeline.md                ← pending job URLs inbox
    data/scan-history.tsv           ← dedup history (URL-based + company+role-based)
        │
        ▼
PHASE 3 — EXPORT
  export-jobs.mjs
    Reads: data/pipeline.md + data/scan-history.tsv + portals.yml (company metadata)
    Writes: output/jobs-YYYY-MM-DD.xlsx
    Sheets: Pending Jobs (by company rank) | By Company (aggregated) | Scan History (raw)
        │
        ▼
PHASE 4 — HUMAN REVIEW
  Will reviews output/jobs-YYYY-MM-DD.xlsx
  Flags which jobs to evaluate (approves subset)
        │
        ▼
PHASE 5 — AI EVALUATION (per approved job)
  /career-ops pipeline  OR  /career-ops batch
    Reads: cv.md + profile.yml + _profile.md + _shared.md + job description
    Evaluates across blocks A–G + legitimacy check
    Writes: reports/{###}-{company-slug}-{YYYY-MM-DD}.md
            batch/tracker-additions/{###}-{slug}.tsv
        │
        ▼
PHASE 6 — TRACKER MERGE
  node merge-tracker.mjs
    Merges batch/tracker-additions/*.tsv → data/applications.md
    NEVER add rows directly to applications.md — always go through merge-tracker
        │
        ▼
PHASE 7 — APPLY
  /career-ops pdf       ← tailored CV PDF per role
  Apply via company portal
  Update applications.md status (direct edit OK for status/notes on existing rows)
        │
        ▼
  REPEAT from PHASE 2 weekly
```

---

## 6. Scraping Architecture

Full detail in `docs/design/scraping-architecture.md`. Key decisions:

### ATS API Priority

| ATS | Handler | Notes |
|-----|---------|-------|
| Greenhouse | scan.mjs (upstream) | Auto-detected from careers_url |
| Ashby | scan.mjs (upstream) | Auto-detected |
| Lever | scan.mjs (upstream) | Auto-detected |
| Workday | custom-scraper.mjs | POST to `{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/Recruiting/jobs` |
| SmartRecruiters | custom-scraper.mjs | `api.smartrecruiters.com/v1/companies/{id}/postings` |
| BambooHR | custom-scraper.mjs | `{company}.bamboohr.com/careers/list` |
| Recruitee | custom-scraper.mjs | `{company}.recruitee.com/api/offers/` |
| Rippling | custom-scraper.mjs (Playwright) | No public API |
| Custom pages | custom-scraper.mjs (Playwright) | Generic handler + site-specific fallbacks |

### Matching Pipeline

| Stage | Method | Token cost |
|-------|--------|-----------|
| Title filter | Case-insensitive substring vs portals.yml keywords | Zero |
| Description pre-filter | BM25 via `natural` npm package (optional) | Zero |
| Full evaluation | LLM via career-ops (gated by human review) | ~2K–4K per job |

### Tool Choice
- `fetch` + `cheerio` — default for static/API-backed pages
- Playwright — JS-heavy pages (Workday, Rippling, custom React portals)
- Scraping is entirely zero-token — no Claude context window impact

### Per-Site UI Strategy
Build generic handler first, run it, collect failures, write site-specific handlers only for the ~20–30 that fail. Do not pre-plan all sites upfront.

---

## 7. Config Files — What Needs to Be Built

Implementation plan: `docs/plans/2026-04-17-career-ops-config-files.md`

### cv.md
Will's full markdown CV. Sections: Summary, Experience (Dalamula, Inception, Moonearn, internships), Projects (4 personal projects), Education, Skills (7 categories). All content sourced from `context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md`. Use reconciled metrics from Section 1 of this document.

### config/profile.yml
YAML with: candidate info (name, email, phone, location, linkedin, portfolio, languages), target roles (6), archetypes (fit: primary/secondary/adjacent), narrative (exit story from founder to builder), superpowers (6), proof points (4), compensation ($120K–$180K USD), location policy (Toronto EST, Canadian resident, remote preferred, hybrid max 2d/wk).

### modes/_profile.md
Archetype scoring table (6 archetypes with scores), adaptive framing table (8 rows by role type), exit narrative paragraph, cross-cutting advantage, deal-breakers (6, matching Section 1), scoring calibration with named AI companies to boost/reduce, compensation scripts (3 variants), portfolio/demo instructions.

### portals.yml
~130 companies across 15 categories. Positive title keywords (~50), negative title keywords (~40), 12 search queries. Companies sourced from `context/AI_Companies_Consolidated_Ranked_v2.xlsx` filtered to AI-relevant, excluding: pure robotics hardware, defense drones, pure AV hardware, consumer non-AI (food delivery, ride-share), semiconductor design. Explicit `api:` field required for companies using non-standard Ashby/Greenhouse URLs.

### data/ initialization
- `data/applications.md` — 9-column markdown table header only
- `data/pipeline.md` — empty with section headers
- `data/scan-history.tsv` — header row only (`url\tcompany\ttitle\tdate_found`)

---

## 8. Critical Rules Every Agent Must Know

### Data Layer Contract
- **NEVER add rows directly to `career-ops/data/applications.md`** — write TSV to `career-ops/batch/tracker-additions/{###}-{slug}.tsv` then run `node merge-tracker.mjs`
- Updating existing rows (status/notes): direct edit is fine
- After any batch of evaluations: run `node merge-tracker.mjs`

### Canonical Status Values (from `templates/states.yml`)
`Evaluated` | `Applied` | `Responded` | `Interview` | `Offer` | `Rejected` | `Discarded` | `SKIP`
No other values. No bold, no dates, no extra text in the status field.

### Report Naming
`reports/{###}-{company-slug}-{YYYY-MM-DD}.md` — 3-digit zero-padded sequential number.
Every report must include `**URL:**` and `**Legitimacy:** {tier}` in the header.

### System Layer — Never Touch
`career-ops/CLAUDE.md` and `career-ops/modes/_shared.md` and `career-ops/scan.mjs` are upstream code. Never modify for personalization.

### Git
- Repo root (`D:\Projects\career ops\`) IS a git repo — git commands work here
- `career-ops/` is NOT a nested git repo (its `.git` was stripped) — it's a plain directory
- `upstream` remote points to `santifer/career-ops.git` for occasional manual pulls
- Never commit `context/` (gitignored — private personal data)
- Never commit `career-ops/output/` (gitignored — generated artifacts)

### Commands (all run from `career-ops/` directory)
```bash
node doctor.mjs                    # verify cv.md, profile.yml, portals.yml exist
node scan.mjs                      # API scrape — Greenhouse/Ashby/Lever
node scan.mjs --dry-run
node scan.mjs --company Anthropic  # single company
node custom-scraper.mjs            # Playwright scrape for non-API companies
node export-jobs.mjs               # → output/jobs-YYYY-MM-DD.xlsx
npm run full-scan                  # scan → scrape → export chain
node verify-pipeline.mjs           # health check
node merge-tracker.mjs             # merge batch additions → applications.md
node dedup-tracker.mjs             # remove duplicates
node normalize-statuses.mjs        # fix canonical statuses
```

---

## 9. Claude / AI Framework Architecture

This project uses the **Super Claude Framework (SCF)** from `D:\Projects\self-skills\super-claude-framework-all-in-one`.

### Memory Tiers (read priority order)

| Tier | File | Auto-loaded? | What it contains |
|------|------|-------------|-----------------|
| Global rules | `~/.claude/CLAUDE.md` + `~/.claude/rules/` | Yes | Universal behavior, skill routing |
| Project rules | `D:\Projects\career ops\CLAUDE.md` + `.claude/rules/` | Yes | This project's routing table, data contract, commands |
| In-repo scratchpad | `.claude/project-memory.md` | On trigger | Decisions, per-company notes, session handoff |
| Design rationale | `docs/design/` | On trigger | ATS API map, matching strategy, tool choices |
| Session handoff | `docs/STATUS.md` | Yes (hook) | Where we left off |
| Machine-local | `~/.claude/projects/D--Projects-career-ops/memory/` | Index loaded | Tool failures, corrections |

### File Staleness Protocol

- **Routing-table files:** update immediately when the domain changes (file ownership map in CLAUDE.md)
- **Structural files** (CLAUDE.md, project-memory.md, STATUS.md): check at every `/scf:wrap-up`
- **Ephemeral files** (docs/plans/): consumed after execution — leave as historical record
- **User-maintained** (CLAUDE.local.md): not Claude's responsibility

### SCF Commands
| Command | When to use |
|---------|-------------|
| `/scf:wrap-up` | End of every session |
| `/scf:learn-rule` | Immediately when a correction happens |
| `/scf:progress` | Check STATUS.md |
| `/scf:debug` | Any bug or test failure |
| `/scf:review` | Before merging a feature |
| `/scf:doctor` | After setup or if something feels off |
| `/scf:setup-project` | Scaffold this structure in a new project |

---

## 10. Current State (as of 2026-04-18)

### Done
- [x] career-ops cloned and absorbed into parent repo
- [x] Git initialized at project root, pushed to `gpgaoplane/career-automation-pipeline`
- [x] `upstream` remote added for santifer/career-ops
- [x] CLAUDE.md — full project guide with scenario routing, staleness protocol, wrap-up checklist
- [x] `.claude/rules/architecture.md` — layer separation and script responsibilities
- [x] `.claude/rules/pipeline.md` — data contract, status values, report naming
- [x] `.claude/project-memory.md` — in-repo committed memory scratchpad
- [x] `.claude/settings.json` — Claude Code permissions
- [x] `docs/STATUS.md` — session handoff initialized
- [x] `docs/design/scraping-architecture.md` — ATS API map, matching strategy, tool choices
- [x] `docs/plans/2026-04-17-career-ops-config-files.md` — full implementation plan for Phase 1
- [x] SCF framework verified and gaps fixed (settings.json rename, CLAUDE.local.md created)

### Pending — Phase 1 (config files)
- [ ] `career-ops/cv.md`
- [ ] `career-ops/config/profile.yml`
- [ ] `career-ops/modes/_profile.md`
- [ ] `career-ops/portals.yml`
- [ ] `career-ops/data/applications.md`, `pipeline.md`, `scan-history.tsv`

### Pending — Phase 2 (custom scripts)
- [ ] `career-ops/custom-scraper.mjs`
- [ ] `career-ops/export-jobs.mjs`
- [ ] `package.json` npm scripts (`scrape`, `export`, `full-scan`)

### Pending — Phase 3+ (scraping and evaluation)
- [ ] First `node scan.mjs` run
- [ ] First `node custom-scraper.mjs` run
- [ ] First `node export-jobs.mjs` → Excel output
- [ ] Human review of Excel
- [ ] First `/career-ops batch` evaluation run

---

## 11. Knowledge Bank Reference

All files in `context/knowledge bank/` are read-only. Always read relevant files before evaluation, CV generation, or scoring work.

| File | Use when |
|------|---------|
| `1_professional_identity/kb_will_identity.md` | Any evaluation requiring narrative framing |
| `2_dalamula/kb_dalamula_business.md` | Dalamula bullets, metrics, GTM, P&L |
| `2_dalamula/kb_dalamula_technical.md` | Technical role CVs, architecture questions |
| `2_dalamula/kb_dalamula_clients.md` | Sales/AE roles, proof points, case studies |
| `3_experience_and_competencies/kb_technical_competencies.md` | Skills section, technical screening |
| `3_experience_and_competencies/kb_inception_capital.md` | Consulting/SA/AE roles |
| `4_personal_projects/kb_projects_index.md` | Projects section selection |
| `5_career_positioning/kb_master_resume_and_positioning.md` | Generating any tailored CV |
| `5_career_positioning/kb_resume_mapping_logic.md` | Which bullets go on which resume variant |

**Companies Excel:** `context/AI_Companies_Consolidated_Ranked_v2.xlsx`
Read with Node.js: `node -e "const XLSX = require('xlsx'); const wb = XLSX.readFile('context/AI_Companies_Consolidated_Ranked_v2.xlsx'); const ws = wb.Sheets[wb.SheetNames[0]]; console.log(XLSX.utils.sheet_to_json(ws).slice(0,5));"` (run from `career-ops/` dir where xlsx is installed)
