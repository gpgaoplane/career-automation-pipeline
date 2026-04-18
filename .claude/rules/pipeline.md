# Pipeline & Data Rules — Career Ops

## Data Layer Contract

career-ops has a strict two-layer data contract. Violating it breaks the merge scripts.

**NEVER write directly to `career-ops/data/applications.md` to add new rows.**
- New entries: write TSV to `career-ops/batch/tracker-additions/{num}-{slug}.tsv`, then run `node merge-tracker.mjs`
- Updating existing rows (status/notes only): direct edit is fine

**After any batch of evaluations:** always run `node merge-tracker.mjs` before the session ends.

## Canonical Status Values

Source of truth: `career-ops/templates/states.yml`. Only use these:
- `Evaluated` — report done, pending decision
- `Applied` — application sent
- `Responded` — company replied
- `Interview` — in process
- `Offer` — offer received
- `Rejected` — rejected by company
- `Discarded` — candidate declined or posting closed
- `SKIP` — doesn't fit, don't apply

No bold, no dates, no extra text in the status field.

## Report Naming

Format: `career-ops/reports/{###}-{company-slug}-{YYYY-MM-DD}.md`
- Number: 3-digit zero-padded, sequential (max existing + 1)
- All reports must include `**URL:**` and `**Legitimacy:** {tier}` in header

## Portals.yml Rules

- Do NOT add user-specific data to `career-ops/modes/_shared.md` — that's the system layer
- Will's archetypes, framing, deal-breakers → `career-ops/modes/_profile.md`
- Will's personal details, comp targets → `career-ops/config/profile.yml`
- Company list + title filters → `career-ops/portals.yml`

## Scraping Strategy

1. `scan.mjs` — API-first (Greenhouse/Ashby/Lever). Zero LLM tokens. Run this first.
2. `custom-scraper.mjs` — Playwright for companies scan.mjs skips. Heavier, run second.
3. `export-jobs.mjs` — Excel export. Run after both scrapers complete.

`npm run full-scan` chains all three.

## Excel Output

`career-ops/output/jobs-YYYY-MM-DD.xlsx` is the primary artifact for human review and AI processing. It has three sheets:
- `Pending Jobs` — all unprocessed jobs, sorted by company rank
- `By Company` — aggregated counts per company
- `Scan History` — raw history for dedup reference
