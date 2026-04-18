# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered job search pipeline for **Will (Xinyuan) Guo** — Toronto-based applied AI practitioner and former founder of Dalamula Technology. This project wraps the `career-ops` open-source tool with Will's personal knowledge bank, custom scrapers, and a batch evaluation pipeline targeting 171 pre-filtered AI-relevant companies.

**Working dir layout:**
```
career ops/                        ← Claude Code opens here
├── CLAUDE.md                      ← this file
├── context/
│   ├── knowledge bank/            ← Will's full personal context (read-only source of truth)
│   │   ├── 1_professional_identity/kb_will_identity.md
│   │   ├── 2_dalamula/kb_dalamula_business.md
│   │   ├── 3_experience_and_competencies/kb_technical_competencies.md
│   │   ├── 4_personal_projects/kb_projects_index.md
│   │   └── 5_career_positioning/kb_master_resume_and_positioning.md
│   └── AI_Companies_Consolidated_Ranked_v2.xlsx  ← 450 ranked companies source
├── career-ops/                    ← cloned career-ops tool (git repo)
│   ├── CLAUDE.md                  ← career-ops SYSTEM layer — DO NOT MODIFY
│   ├── scan.mjs                   ← zero-token Greenhouse/Ashby/Lever API scraper
│   ├── custom-scraper.mjs         ← Playwright scraper for non-API companies (to build)
│   ├── export-jobs.mjs            ← Excel exporter (to build)
│   ├── portals.yml                ← 171 filtered companies + title filters (to build)
│   ├── config/profile.yml         ← Will's personal profile (to build)
│   ├── cv.md                      ← Will's CV in markdown (to build)
│   ├── modes/_profile.md          ← Will's archetype scoring overrides (to build)
│   ├── data/
│   │   ├── applications.md        ← application tracker
│   │   ├── pipeline.md            ← pending job URLs inbox
│   │   └── scan-history.tsv       ← dedup history
│   ├── reports/                   ← per-job evaluation reports
│   └── output/                    ← generated Excel files and PDFs
└── docs/
    ├── STATUS.md                  ← project progress (update with /wrap-up)
    ├── plans/                     ← implementation plans
    └── design/                    ← durable technical design decisions
        └── scraping-architecture.md
```

## Critical Rule: Two CLAUDE.md Files

`career-ops/CLAUDE.md` is the **system layer** maintained by the career-ops upstream project. Never edit it for personalization. All of Will's customizations go in:
- `career-ops/config/profile.yml` — personal details, comp targets, location
- `career-ops/modes/_profile.md` — archetype scoring, deal-breakers, narrative
- `career-ops/portals.yml` — company list and title filters

## Knowledge Bank (read before evaluation work)

Always consult before generating CVs, writing cover letters, or scoring roles:

| File | What it contains |
|------|-----------------|
| `context/knowledge bank/1_professional_identity/kb_will_identity.md` | Full bio, career arc, strengths/weaknesses, worldview |
| `context/knowledge bank/2_dalamula/kb_dalamula_business.md` | Dalamula metrics, phases, lessons (50+ clients, $125K+, 61 deployments) |
| `context/knowledge bank/3_experience_and_competencies/kb_technical_competencies.md` | Full tech stack with depth levels |
| `context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md` | All resume bullets tagged by role track |
| `context/knowledge bank/5_career_positioning/kb_resume_mapping_logic.md` | Which bullets go on which resume variant |

**Reconciled key metrics (use these, not approximations):**
- LoRAs: 20+ identity + ~100 style/persona
- Deployments: 61 documented
- Clients: 50+, Revenue: $125K+
- Image acceptance: 10% baseline → 80%+ (with LoRA)
- Video acceptance: 20% → 40–50%

## Commands (all run from `career-ops/` directory)

```bash
# Setup verification
node doctor.mjs                    # checks cv.md, profile.yml, portals.yml exist

# Scraping
node scan.mjs                      # API scrape (Greenhouse/Ashby/Lever) — zero LLM tokens
node scan.mjs --dry-run            # preview without writing
node scan.mjs --company Anthropic  # single company
node custom-scraper.mjs            # Playwright scrape for non-API companies
node custom-scraper.mjs --dry-run

# Export
node export-jobs.mjs               # produces output/jobs-YYYY-MM-DD.xlsx

# Full pipeline (scan → scrape → export)
npm run full-scan

# Pipeline maintenance
node verify-pipeline.mjs           # health check
node normalize-statuses.mjs        # fix canonical statuses
node dedup-tracker.mjs             # remove duplicates
node merge-tracker.mjs             # merge batch tracker additions

# career-ops slash commands (in Claude Code session inside career-ops/)
/career-ops scan                   # scan portals
/career-ops pipeline               # evaluate pending URLs from pipeline.md
/career-ops oferta                 # evaluate a single job offer
/career-ops pdf                    # generate tailored CV PDF
/career-ops tracker                # show application status
/career-ops batch                  # batch evaluate with parallel workers
/career-ops patterns               # analyze rejection patterns
```

## Pipeline Architecture

```
Excel (450 companies)
    ↓ filter (171 AI-relevant)
portals.yml
    ↓
scan.mjs ──────────────── Greenhouse/Ashby/Lever APIs (zero token cost)
custom-scraper.mjs ─────── Playwright for remaining companies
    ↓ (both write to)
data/pipeline.md           pending URLs inbox
data/scan-history.tsv      dedup history
    ↓
export-jobs.mjs
    ↓
output/jobs-YYYY-MM-DD.xlsx   ← human inspection + AI processing artifact
    ↓ (approved jobs)
/career-ops pipeline           ← full evaluation per job (blocks A–G + legitimacy)
    ↓
reports/{num}-{slug}-{date}.md
batch/tracker-additions/{num}-{slug}.tsv
    ↓
node merge-tracker.mjs
    ↓
data/applications.md           ← master tracker
```

## Will's Target Roles (priority order)

1. **AI Engineer / Solutions Architect** — production agentic systems, RAG, multi-agent
2. **Account Executive / BD** — AI products, technical sales
3. **AI Product Manager** — discovery, roadmap, KPI ownership
4. **Consultant / Technical Advisory** — enterprise AI deployment
5. **Generative AI / Creative AI** — LoRA, ComfyUI, multimodal

## Scoring Calibration

**Boost** roles at Series B+ or public AI-native companies involving: multi-agent systems, RAG, enterprise AI deployment, generative AI production, technical sales, SA activities (architecture + client advisory).

**Reduce** for: pure frontend, non-AI SaaS, semiconductor/hardware, pure management without technical component.

**Hard deal-breakers (score 1.0 or Discard):**

Universal:
- Company <10 people
- Pure non-technical sales with no AI/technical component
- Pure AI research with no path to production
- Technical role with no meaningful AI component

US roles:
- Not 100% remote → SKIP (Will works from Toronto; no US presence viable)
- Comp below $120K USD
- Sponsorship is NOT a deal-breaker — remote from Toronto requires no US work authorization

Canadian roles:
- On-site >3 days/week, or any on-site outside Toronto → SKIP
- Comp below $90K CAD
- $90K–$110K CAD: lower score (−0.2), flag in report, not auto-SKIP
- $110K–$130K CAD: good range
- $130K+ CAD: excellent

## Data Layer Rules

- **NEVER edit `data/applications.md` to add new rows** — write TSV to `batch/tracker-additions/` and run `node merge-tracker.mjs`
- **YES** edit `applications.md` to update status/notes on existing rows
- All report files: `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`
- Status values are canonical — see `templates/states.yml`. Never invent new statuses.
- After any batch of evaluations: run `node merge-tracker.mjs`

## Companies Source

`context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 ranked companies. 171 filtered as relevant based on AI-native category. Excluded: semiconductors/HW supply chain, space, maritime, defense drones, pure consumer electronics.

The Excel has columns: Rank | Company Name | Type | Valuation | HQ | Category | Description | Career URL.

## Scenario Routing

The routing table below serves two purposes: (1) tells Claude what to read before acting, (2) is the **file ownership map** — when a decision changes in a domain, update the file listed in that row.

| Scenario / Domain | Read before acting | Update when domain changes |
|-------------------|--------------------|---------------------------|
| Evaluate a job, score a role, write cover letter | `career-ops/modes/_profile.md` + `_shared.md` | `modes/_profile.md` |
| Generate or tailor a CV | `context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md` + `kb_resume_mapping_logic.md` | knowledge bank files (read-only — update cv.md instead) |
| Build or modify any scraper | `docs/design/scraping-architecture.md` | `docs/design/scraping-architecture.md` |
| Add or change companies in portals.yml | `docs/design/scraping-architecture.md` (ATS API map) | `docs/design/scraping-architecture.md` + `portals.yml` |
| Write to the data layer | `.claude/rules/pipeline.md` | `.claude/rules/pipeline.md` |
| Layer ownership or script responsibilities | `.claude/rules/architecture.md` | `.claude/rules/architecture.md` |
| Starting a session after a break | `docs/STATUS.md` + `.claude/project-memory.md` | updated at wrap-up |
| Unexpected behavior or tool failure | `~/.claude/projects/D--Projects-career-ops/memory/tool-failures.md` | `tool-failures.md` |

## File Staleness Protocol

Every file in this project falls into one of four categories:

**1. Routing-table files** — staleness governed by the ownership map above. When a domain decision changes, update the listed file immediately, not at wrap-up.

**2. Structural files** — go stale when project shape changes. Check these at every `/scf:wrap-up`:

| File | Goes stale when |
|------|----------------|
| `CLAUDE.md` (this file) | Directory layout changes, new commands added, pipeline diagram changes, new files created |
| `.claude/project-memory.md` | Any new decision made, per-company scraping note discovered |
| `docs/STATUS.md` | Every session — always update at wrap-up |

**3. Ephemeral files** — consumed, not updated. Plans in `docs/plans/` describe future work; once executed they become historical record. Do not update them — they are correct as written at the time of planning.

**4. User-maintained files** — Claude does not update these. `CLAUDE.local.md` is yours.

## Wrap-up Checklist

Run `/scf:wrap-up` at session end. Before closing, explicitly check:

- [ ] Did any domain decision change? → update the routing-table file for that domain
- [ ] Did directory structure change? → update CLAUDE.md layout section
- [ ] Did new commands get added? → update CLAUDE.md commands section
- [ ] Did pipeline architecture change? → update CLAUDE.md pipeline diagram
- [ ] Were architectural decisions made? → add to `.claude/project-memory.md`
- [ ] Update `docs/STATUS.md` handoff note

## Memory Architecture

| Layer | File | What goes here |
|-------|------|---------------|
| In-repo scratchpad | `.claude/project-memory.md` | Decisions, discoveries, per-company notes, session handoff |
| Design rationale | `docs/design/` | Durable technical decisions with reasoning |
| Enforced rules | `.claude/rules/` | Patterns confirmed 2+ times, always applied |
| Machine-local | `~/.claude/projects/D--Projects-career-ops/memory/` | Tool failures, machine-specific corrections |

Write routing:
- New architectural decision → `.claude/project-memory.md` + `docs/design/` if substantial
- Correction happened once → `~/.claude/projects/.../memory/`
- Correction happened 2+ times → promote to `.claude/rules/`
- Cross-project pattern → `~/.claude/memory/MEMORY.md`
- Use `/scf:learn-rule` to route corrections immediately
