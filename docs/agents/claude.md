---
status: active
type: work-log
owner: claude
last-updated: 2026-04-28T22:32:14-04:00
read-if: "you need to see Claude's recent work and watch-outs"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude Work Log

## Onboarded: 2026-04-28

**Platform:** Claude
**Adapter file:** .claude/CLAUDE.md
**First task:** Install multi-agent-collab v0.4.1 framework + migrate existing project memory and CLAUDE.md content into the framework's structure.

---

<!-- collab:log-archived-summary:start -->
<!-- WARNING: framework-managed; edit OUTSIDE this block, not inside -->
<!-- Older entries collapse to one-liners here on rotation; full history in
     .collab/archive/agents/claude-<date>.md -->
<!-- collab:log-archived-summary:end -->

<!-- new entries appended below, newest last -->

## 2026-04-28 — Framework migration (multi-agent-collab v0.4.1)

**Goal:** Onboard `multi-agent-collab` framework so Claude and Codex can collaborate as equal-partner agents on this project, while preserving every piece of existing context (root CLAUDE.md, `.claude/project-memory.md`, `.claude/rules/*`, knowledge bank pointers, decisions, and pitfalls).

**Approach:**
1. Inspected `gpgaoplane/multi-agent-collab` GitHub repo end-to-end (README, init script, all templates, agent descriptors, memory templates) before any local action.
2. Skill drop-in install (clone to `~/.claude/skills/multi-agent-collab` pinned at commit `ebd67b8` / v0.4.1) — chosen over npx for auditability and version pinning.
3. Created branch `feat/multi-agent-collab` on `main` for safe rollback.
4. Deleted stale Codex-search-replaced `AGENTS.md` (untracked cruft) so the framework would write a clean front-door file.
5. Ran `bash ~/.claude/skills/multi-agent-collab/scripts/collab-init.sh --agent claude` from repo root. Mode: fresh. Created `.collab/`, `AI_AGENTS.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `.claude/memory/{state,context,decisions,pitfalls}.md`, `docs/agents/claude.md`. `collab-check` reported `OK: INDEX and filesystem aligned`.
6. Migrated content:
   - **AI_AGENTS.md `## Project Context`** (added OUTSIDE markers per advisor's correction; framework re-init won't wipe): full project overview, working dir layout, vendored-upstream rule, knowledge bank table, key metrics, commands, pipeline architecture, target roles, scoring calibration, hard deal-breakers, data layer rules, companies source, project-specific routing.
   - **`.claude/CLAUDE.md`** (Claude-only platform overlay outside markers): file staleness protocol, wrap-up checklist, memory architecture table, native vs framework memory separation, platform notes.
   - **`.claude/memory/state.md`**: current branch, active task, next steps (clean rescan deferred), open question on `@import` resolution.
   - **`.claude/memory/context.md`**: ATS URL distribution facts, filter rationale (seniority/region/language), vendored-upstream invariant, framework adoption note.
   - **`.claude/memory/decisions.md`**: D-1 portals.yml as canonical, D-2 branded URLs over direct ATS slugs, D-3 scan.mjs untouched, D-4 two-layer data contract, D-5 3-tier ATS discovery, D-6 multi-agent-collab adoption.
   - **`.claude/memory/pitfalls.md`**: P-1 career URL landing-page silent empty results, P-2 first scan stale, P-3 title filters apply at scrape time only.
   - **Archived** `.claude/project-memory.md` to `.claude/archive/project-memory-pre-collab-2026-04-28.md` for audit trail.
7. **Root `CLAUDE.md`** rewritten as a thin `@import` shim (`@AI_AGENTS.md` + `@.claude/CLAUDE.md`) — keeps Claude Code's auto-load discovering the right files. Test on next session: confirm `@import` resolves and shows both files' contents in `claudeMd` system prompt.
8. **Updated `docs/STATUS.md`** with framework-adoption handoff note.
9. Verified with `collab-check` (no drift between INDEX and filesystem) and manual spot-checks.

**Files touched:**
- New: `AI_AGENTS.md`, `AGENTS.md`, `.collab/{VERSION,ACTIVE,INDEX,ROUTING,PROTOCOL,config.yml,agents.d/claude.yml,archive/}`, `.claude/CLAUDE.md`, `.claude/memory/{state,context,decisions,pitfalls}.md`, `docs/agents/claude.md`, `.claude/archive/project-memory-pre-collab-2026-04-28.md`
- Modified: `CLAUDE.md` (rewrote as `@import` shim), `docs/STATUS.md` (handoff note)
- Deleted: stale untracked `AGENTS.md` (Codex find-replace cruft from earlier session)
- Untouched: `career-ops/` (vendored upstream, off-limits), `.claude/rules/*.md`, `.claude/settings.json`, `.claude/settings.local.json`, `CLAUDE.local.md`, `context/`, `docs/design/`, `docs/plans/`

**Watch out:**
- The `@import` shim in root `CLAUDE.md` is unverified for Claude Code's resolver. If the next-session `claudeMd` reminder doesn't show `AI_AGENTS.md` and `.claude/CLAUDE.md` contents, fall back to inlining both files into root `CLAUDE.md` directly.
- Project context lives in `AI_AGENTS.md` `## Project Context` section, **outside** the `<!-- collab:project-summary:start/end -->` markers. Re-init / framework-upgrade preserves outside-marker content. Inside-marker is wiped — keep that block as a pointer only.
- `.claude/project-memory.md` → archived; original is at `.claude/archive/project-memory-pre-collab-2026-04-28.md` for audit. The `decisions.md` + `pitfalls.md` + `context.md` + `state.md` split supersedes it.
- Codex onboarding deferred — the user will explicitly trigger `bash ~/.claude/skills/multi-agent-collab/scripts/collab-init.sh --join codex` from a Codex session, not a Claude session.

### Task Receipt

Updates fanned out this task:
- `AI_AGENTS.md` ........ added `## Project Context` section outside markers (full project content)
- `.claude/CLAUDE.md` ........ added Claude-specific operational overlay outside markers
- `.claude/memory/state.md` ........ filled current state, next steps, open questions, watermark
- `.claude/memory/context.md` ........ migrated 4 durable truths from project-memory.md
- `.claude/memory/decisions.md` ........ migrated 5 architectural decisions + new D-6 framework adoption
- `.claude/memory/pitfalls.md` ........ migrated 3 known pitfalls
- `docs/agents/claude.md` ........ this entry (first work-log entry)
- `CLAUDE.md` (root) ........ rewrote as `@import` shim
- `.claude/archive/project-memory-pre-collab-2026-04-28.md` ........ preserved original project-memory.md
- `docs/STATUS.md` ........ added framework-adoption handoff note (pending)
- `.collab/INDEX.md` ........ auto-registered new files; needs manual register for new archive file (pending)

Missing / intentionally skipped:
- `docs/plans/` — no new plan written; this work was scoped via in-conversation plan, not a plan doc.
- `docs/design/` — framework adoption doesn't introduce a project-specific design decision worth a standalone design doc; the framework's own `docs/design.md` (in the cloned skill) covers framework rationale.

## 2026-04-28 — Phase 2.7 design plan: portals cleanup + mid-level pivot + pre-scoring system

**Goal:** Produce a comprehensive, review-ready design plan for three coupled changes (portals.yml audit cleanup, profile pivot from senior to mid-level IC band, and a rule-based pre-scoring system), then prepare a handoff for Codex review.

**Approach:**

1. **Pre-flight reads** of `career-ops/portals.yml` (full title_filter inspection), `career-ops/modes/_profile.md` (current senior/Mid-Senior archetype levels), `career-ops/config/profile.yml` (archetype levels), `career-ops/export-jobs.mjs` (current Excel column structure), and the framework's handoff schema. Verified the actual current state before committing to design.
2. **Audit math** done in earlier turn: 448 total / 416 enabled / 32 disabled split into 16 duplicate-suppression (correct) + 16 unique-URL of which only 2 (NVIDIA, Saronic) had clear universal-exclusion reasons. Identified 14 mis-drops (Sierra, Cursor, Tempus, Fivetran, Pigment, Descript, Tome, Tabnine, Labelbox, Twelve Labs, Genmo, Nomic AI, Inworld AI, Nscale) and 2 inversions (Foxconn rank 65, Skydio rank 437). Final post-cleanup inventory: 428 enabled / 20 disabled, all with explicit `note:`.
3. **Design plan written** at `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` — 17 sections covering motivation, scope, locked decisions (D-7..D-11), schema changes, cross-file propagation map, title→track algorithm, title-based + description-based pre-scoring formulas with worked examples, `enrich-jobs.mjs` component design with cache schema and pseudocode, `export-jobs.mjs` enhancement design, acceptance criteria (18 verification points), risks (R-1..R-10), open questions (Q-1..Q-8), reviewer checklist.
4. **Decisions recorded** in `.claude/memory/decisions.md` D-7 (mid-level pivot, reasoning: "Will wants to be reclassified into the mid-level pool to avoid senior/principal title-inflation expectations"), D-8 (sequential locked), D-9 (pre-scoring scheme with full weights), D-10 (enrichment design), D-11 (audit cleanup 428/20).
5. **Context refreshed** in `.claude/memory/context.md`: added 2026-04-28 ATS distribution entry (superseding stale 2026-04-20 "13/403"), added 2026-04-28 filter rationale entry (mid-level pivot supersedes earlier "mid-to-senior" wording), added 2026-04-28 pre-scoring system entry. Earlier 2026-04-20 entries flagged as superseded inline.
6. **State refreshed** in `.claude/memory/state.md` with current branch + active task + next steps.
7. **AI_AGENTS.md Project Context** updated: company counts (416 → 428 enabled, 32 → 20 disabled with notes); added "IC band per D-7" line below Will's Target Roles section calling out mid-level (3-5 YoE) explicitly.
8. **STATUS.md** updated: Phase 2.7 design plan completion entry added to Done; portals.yml audit findings documented; handoff note rewritten for Codex.
9. **Codex pre-onboarded** via `collab-init.sh --join codex` from this Claude session. Created `.codex/CODEX.md` (adapter), `.codex/memory/{state,context,decisions,pitfalls}.md`, `docs/agents/codex.md` (work log), `.collab/agents.d/codex.yml` (descriptor). `Current Adapters` table in `AI_AGENTS.md` re-rendered to include both Claude and Codex.
10. **Handoff block** written via `collab-handoff.sh codex` targeting Codex for review of the design plan. The block lives in this log at the end.

**Files touched (decision-recording layer; config/code changes deferred to implementation plan execution):**

- New: `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`, `.codex/CODEX.md`, `.codex/memory/{state,context,decisions,pitfalls}.md`, `docs/agents/codex.md`, `.collab/agents.d/codex.yml`
- Modified: `.claude/memory/decisions.md` (added D-7..D-11), `.claude/memory/context.md` (refreshed entries + added pre-scoring entry), `.claude/memory/state.md` (current state, next steps), `AI_AGENTS.md` (Project Context counts + IC-band line, Current Adapters table re-rendered to include Codex), `docs/STATUS.md` (Phase 2.7 + handoff note), this work log
- Untouched (intentionally — implementation plan execution territory): `career-ops/portals.yml`, `career-ops/modes/_profile.md`, `career-ops/config/profile.yml`, `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs`, all `career-ops/CLAUDE.md` / `career-ops/AGENTS.md` (vendored upstream)

**Watch out:**

- Decisions and behavior change are intentionally split. The design plan documents EXACTLY what each `career-ops/*` file change will be (§5.1 propagation map). The implementation plan will execute those edits atomically. If a reviewer reads `career-ops/portals.yml` directly right now, it still has the OLD `Senior AI` / `Principal AI` / `Senior Product Manager` positives and the OLD 32 disabled (no notes). That's by design — they're config/code, changed in implementation phase.
- 14 re-enabled companies in §4.2 of the design plan are best-guess; some may turn out genuinely irrelevant after rescan. Roster artifact `docs/design/companies-roster.md` (created during implementation) provides visual audit. If zero results consistently for a re-enabled company, re-disable in a follow-up cleanup with the right `note:`.
- scan-v1-unfiltered baseline (1406 jobs from commit `06bf430`) becomes a *filter-effectiveness* baseline only after the title_filter rewrite; not a *job-quality* comparison.
- Root `CLAUDE.md` `@import` shim still unverified for Claude Code resolver. Confirm on next Claude session start.

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` ........ design plan (16 sections + reviewer checklist + comments slot)
- `.claude/memory/decisions.md` ........ added D-7..D-11
- `.claude/memory/context.md` ........ refreshed 2026-04-20 ATS + filter entries (superseded), added 2026-04-28 pre-scoring entry
- `.claude/memory/state.md` ........ current state + next steps + open questions
- `AI_AGENTS.md` ........ Project Context counts (428/20), IC-band per D-7 line, Current Adapters table re-rendered to include Codex
- `docs/STATUS.md` ........ Phase 2.7 + audit findings + handoff note
- `docs/agents/claude.md` ........ this entry + handoff block
- `.codex/CODEX.md`, `.codex/memory/*`, `docs/agents/codex.md`, `.collab/agents.d/codex.yml` ........ Codex pre-onboarded
- `.collab/INDEX.md` ........ design plan + Codex files registered

Missing / intentionally skipped:
- `career-ops/portals.yml`, `career-ops/modes/_profile.md`, `career-ops/config/profile.yml` — config/code edits deferred to implementation plan execution per design/implementation phase split
- `career-ops/enrich-jobs.mjs` — script doesn't exist yet; created in implementation phase
- `career-ops/export-jobs.mjs` — refactored in implementation phase
- `docs/design/companies-roster.md` — auto-generated during implementation
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` — written AFTER Codex review of the design plan is integrated

## Handoff blocks

When you finish a substantive chunk of work and want another agent to take over,
run `collab-handoff <to-agent>`. It appends a structured block at the end of this
log with a stable id, what you did, files touched, and the branch state. See
`docs/handoff-schema.md` for the full format.

When the work log exceeds `rotate_at_lines` (default 300, see `.collab/config.yml`),
run `./scripts/collab-rotate-log.sh claude` to archive older entries.
Receipts and open handoff blocks are preserved; archived entries collapse to
one-line summaries in the archived-summary marker block above.
<!-- collab:handoff:start id=20260428-221522-bc38 -->
## Handoff → codex

- **handoff-id:** `20260428-221522-bc38`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/multi-agent-collab
- **at:** 2026-04-28T22:15:22-04:00
- **status:** closed
- **picked-up:** 2026-04-28T22:27:07-04:00 by codex

### What I did
Phase 2.7 design plan ready for review at docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md. Locked decisions D-7 to D-11 in .claude/memory/decisions.md. Cross-doc propagation done across AI_AGENTS.md, .claude/memory/{context,state}.md, docs/STATUS.md, work log. Decision-recording layer is updated; config/code edits (career-ops/portals.yml, modes/_profile.md, config/profile.yml, scripts) are intentionally deferred to the implementation plan execution. PLEASE REVIEW the design plan against the §16 reviewer checklist. Surface issues either in §17 Review Comments inside the design plan, or write a return handoff back to claude. Implementation plan will be written by claude only after your review is integrated.

### Files touched
docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md .claude/memory/decisions.md .claude/memory/context.md .claude/memory/state.md AI_AGENTS.md docs/STATUS.md docs/agents/claude.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->
