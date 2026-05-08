---
status: active
type: context
owner: gemini
last-updated: 2026-05-03T20:06:00-04:00
read-if: "you need durable project truths as understood by Gemini"
skip-if: "status != active or last-updated <= your watermark"
---

# Gemini — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->

## C-1 — Project identity — 2026-05-03T20:06:00-04:00

This is an AI-powered job search pipeline for **Will (Xinyuan) Guo**, a Toronto-based applied AI practitioner and former founder of Dalamula Technology. The project wraps the open-source `career-ops` tool with Will's personal knowledge bank, custom scrapers, and a batch evaluation pipeline.

## C-2 — Roster baseline — 2026-05-03T20:06:00-04:00

Current portals.yml roster: **448 total / 393 enabled / 55 disabled**. Historical milestones: Phase 2.7 → 428/20; Phase 2.8 Step 0 → 388/60; Codex restore → 397/51; SOURCE_BROKEN round → 393/55.

## C-3 — Vendored code invariant — 2026-05-03T20:06:00-04:00

`career-ops/scan.mjs`, `career-ops/CLAUDE.md`, `career-ops/AGENTS.md`, and the entire `career-ops/.claude/` directory are **vendored upstream system-layer code — do NOT edit** for personalization. All customization goes into `portals.yml`, `profile.yml`, `cv.md`, and `modes/_profile.md`.

## C-4 — Data layer write rules — 2026-05-03T20:06:00-04:00

NEVER directly add rows to `career-ops/data/applications.md`. Write TSV fragments to `career-ops/batch/tracker-additions/` then run `node merge-tracker.mjs`. Updating existing rows in `applications.md` is allowed.

## C-5 — Title filter architecture — 2026-05-03T20:06:00-04:00

The `buildTitleFilter` logic currently exists as three independent copies:
1. `career-ops/scan.mjs:125-135` (vendored upstream — off-limits)
2. `scripts/ats-adapters/_lib.mjs:57-66`
3. `career-ops/firecrawl-extract.mjs:131-140`

All three use substring-based matching against `portals.yml` `title_filter.positive[]` and `title_filter.negative[]`. The production filter refinement design (`docs/plans/2026-05-03-production-filter-refinement-design.md`) proposes centralizing to a shared detector module and replacing substring matching with safe phrase/token-combination matching.

## C-6 — Will's target IC band — 2026-05-03T20:06:00-04:00

Will targets **mid-level only (3-5 YoE)**. Senior, Sr, Principal, Junior, Jr, Associate, Lead, Staff, Intern are currently excluded at scrape time. The new filter refinement design proposes restoring Associate as low-priority/reviewable instead of a hard drop.

## C-7 — Will's target role priority — 2026-05-03T20:06:00-04:00

Priority order: (1) AI Engineer / Solutions Architect, (2) Account Executive / BD — NOW DEMOTED: AE-only roles hard-drop per filter refinement design, (3) AI Product Manager, (4) Consultant / Technical Advisory, (5) Generative AI / Creative AI. The refinement design elevates Solutions/Deployment/Architect/FDE to highest weight above AI Engineering.

## C-8 — Location / remote rules — 2026-05-03T20:06:00-04:00

Will works from Toronto. US roles must be 100% remote (no US presence viable). Canadian roles on-site only if Toronto. Non-Toronto hybrid/on-site without genuine remote option → hard drop. Sponsorship is NOT a deal-breaker for remote roles.

## C-9 — Compensation thresholds — 2026-05-03T20:06:00-04:00

US: below $120K USD → skip. Canada: below $90K CAD → skip; $90K-$110K → lower score; $110K-$130K → good; $130K+ → excellent. Unknown/missing comp → do not hard-drop, annotate conservatively.

## C-10 — Phase 2.8 closure metrics — 2026-05-03T20:06:00-04:00

Full 393-company rescan: 3,552 Firecrawl credits (within 5,000 cap; budget remaining 96,849). Baseline workbook: `career-ops/output/jobs-2026-05-01.xlsx` (613 jobs across 154 companies; S=37 / A=370 / B=195 / C=11). Acceptance audit: 12/12 PASS.

## C-11 — Multi-agent script invocation on Windows — 2026-05-03T20:06:00-04:00

The `collab-*.sh` scripts must be invoked via Git Bash on Windows: `& 'C:\Program Files\Git\bin\bash.exe' '<path>'`. Plain `bash ./scripts/collab-*.sh` fails because the scripts live in the skill directory (`C:\Users\PC\.claude\skills\multi-agent-collab\scripts\`), not in the repo.

<!-- section:entries:end -->