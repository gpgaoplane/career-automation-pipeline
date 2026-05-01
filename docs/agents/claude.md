---
status: active
type: work-log
owner: claude
last-updated: 2026-04-30T00:00:00-04:00
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

## 2026-04-28 — Integrated Codex review of Phase 2.7 design plan (design plan v2)

**Goal:** Receive Codex's review of design plan v1, verify each finding against primary sources, integrate fixes into design plan v2 + propagate corrections across decision-recording files.

**Approach:**

1. Loaded `superpowers:receiving-code-review` skill before reading review.
2. Read Codex's §17 review comments in design plan, Codex's work log, Codex's memory updates.
3. **Verified each of Codex's 5 issues against primary sources** — all 5 verified correct:
   - **Issue 1 (18/410 ATS count)**: python audit against current `career-ops/portals.yml` confirmed Genmo (`jobs.ashbyhq.com/genmo`) is direct Ashby. v1 count missed it. Real distribution post-cleanup is 18 direct / 410 branded.
   - **Issue 2 (D-8 ambiguity)**: `grep -n` confirmed `scan.mjs:32` `CONCURRENCY=10` and `custom-scraper.mjs:29-30` `CONCURRENCY_API=10` / `CONCURRENCY_PLAYWRIGHT=5`. "Sequential clean rescan" was genuinely ambiguous — could mean enrich-only OR could mean changing existing scrapers.
   - **Issue 3 (comp inconsistency)**: §8.1 said "upper bound below floor"; §8.2 computed `low - floor`; Q-7 said `LOW < FLOOR`. Three inconsistent rules.
   - **Issue 4 (stale counts)**: `grep` against `AI_AGENTS.md` and `docs/STATUS.md` found stale "416 enabled" / "32 disabled" / "13 companies" / "403 companies" / "17 direct" / "411 branded" at multiple locations.
   - **Issue 5 (CREATIVE no parser route)**: §7.1 assigned CREATIVE = 3 weight, but §6.2 mapped only "Generative AI / Creative" combined group to GEN-AI — no route emits CREATIVE.
4. Committed Codex's review as a preserved contribution (commit `021efb5`) with co-author attribution.
5. **Integrated all 5 fixes into design plan v2** (in-place revision; frontmatter `revision: v2` field added):
   - §3 D-8 row reworded: "enrichment is sequential; existing scrapers (CONCURRENCY=10/CONCURRENCY_API=10/CONCURRENCY_PLAYWRIGHT=5) unchanged".
   - §4.5 ATS counts: 17/411 → 18/410, with Codex review correction note inline.
   - §5.1 propagation map expanded: added rows for AI_AGENTS.md lines 217/288, docs/STATUS.md lines 12/46/58-59, plus a new row for the portals.yml YAML group restructure (CREATIVE split).
   - §6.2 comment-group → track table: split "Generative AI / Creative" into two new groups — "Generative AI Engineering" (5 keywords: LoRA, Stable Diffusion, Video Generation, Content AI, Prompt Engineer) → GEN-AI, and "Creative" (7 keywords: Creative Technologist, Technical Artist, AI Trainer, AI Model Trainer, Image Trainer, Video Trainer, ComfyUI) → CREATIVE.
   - §8.1 comp signal rows: rewrote both above-target and below-target rows to use lower-bound logic consistently. Penalty applies when LOW < floor even if HIGH ≥ floor (per Q-7).
   - §10.8 log path: `career-ops/logs/` → `career-ops/batch/logs/` (matches `custom-scraper.mjs:521` convention).
   - §12 acceptance criterion #13: file count corrected (15 rows / 11 unique files); grep audit expanded to all stale strings.
6. **Propagated corrections** across decision-recording files:
   - `AI_AGENTS.md`: line 217 `(448 companies, 416 enabled)` → `(448 companies, 428 enabled)`; line 288 Companies Source rewritten to 428/20 with explicit note coverage.
   - `docs/STATUS.md`: line 46 `17 direct + 411 branded` → `18 direct + 410 branded`; lines 58-59 `~13 companies` and `403 companies` → `18 companies` and `410 companies`.
   - `.claude/memory/context.md` 2026-04-28 ATS distribution entry: `17/411` → `18/410` with Codex review attribution.
7. **Recorded D-12** in `.claude/memory/decisions.md` capturing the integration with full reasoning and per-issue diff.
8. **Updated state.md** with current state, next steps (Codex re-review of v2 OR proceed to implementation plan), open questions.

**Files touched:**

- Modified: `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` (v2 with 7 surgical fixes), `AI_AGENTS.md` (lines 217 + 288), `docs/STATUS.md` (lines 46, 58, 59), `.claude/memory/context.md` (ATS distribution entry), `.claude/memory/decisions.md` (added D-12 + timestamp), `.claude/memory/state.md` (current state, next steps), this work log
- Untouched (still implementation territory): `career-ops/portals.yml`, `career-ops/modes/_profile.md`, `career-ops/config/profile.yml`, `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs`

**Watch out (cross-agent risk per ROUTING.md row 10):**

- **portals.yml YAML group split is a coupled atomic change.** The CREATIVE track parser route depends on splitting the existing `# ── Generative AI / Creative ──` group (lines 74-86) into two new groups (`# ── Generative AI Engineering ──` and `# ── Creative ──`) AT THE SAME TIME as removing senior/principal positives and adding senior/principal negatives. Any agent (Claude or Codex) touching `career-ops/portals.yml` mid-implementation must do all four edits in the same commit — splitting without removing positives would leave portals.yml half-migrated and the title-track parser would silently emit the wrong tracks.
- **Acceptance criterion #13 grep audit must pass for ALL stale strings before any merge to main.** A partial cleanup (e.g., updating AI_AGENTS.md but not STATUS.md) leaves drift that future agents would consume as truth.

**Watch out (general):**

- Design plan v2 is in-place revision; Codex's §17 review comments preserved at the bottom as audit trail.
- All 5 Codex issues were factual/textual corrections, not architectural challenges. v2 vs v1 is a correctness pass, not a redesign. User chose to proceed straight to implementation plan.
- No new handoff written yet — implementation plan write is in progress.

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` ........ v2 with 7 surgical fixes (frontmatter revision flag, D-8 reword, §4.5 18/410, §5.1 expanded, §6.2 YAML group split, §8.1 lower-bound, §10.8 log path, §12 #13 expanded grep)
- `AI_AGENTS.md` ........ lines 217 + 288 stale-count corrections
- `docs/STATUS.md` ........ lines 46, 58-59 stale-count corrections
- `.claude/memory/context.md` ........ 17/411 → 18/410 with Codex review attribution
- `.claude/memory/decisions.md` ........ D-12 integration record + frontmatter timestamp
- `.claude/memory/state.md` ........ current state, next steps, open questions
- `docs/agents/claude.md` ........ this entry + Receipt

Missing / intentionally skipped:
- `career-ops/*` — all config/code edits remain deferred to implementation plan execution (title_filter rewrite + YAML group split + audit cleanup land in the same implementation commit).
- `docs/agents/codex.md` — Codex's work log is owner=codex; not modified per cross-agent courtesy.
- `.codex/memory/*` — Codex's memory; not modified.
- No new handoff written — waiting for user's direction on (a) Codex re-review of v2 vs (b) proceed to implementation plan.

## 2026-04-28 — Framework cleanup + implementation plan written

**Goal:** Fix the framework adherence misses I flagged after the v2 integration (collab-catchup ack, watermark bump, ROUTING/PROTOCOL re-read, design plan re-register, Row 10 cross-agent risk Watch out block), then write the implementation plan per option B.

**Approach:**

1. Re-read `.collab/ROUTING.md` and `.collab/PROTOCOL.md` per onboarding checklist discipline.
2. Ran `bash ~/.claude/skills/multi-agent-collab/scripts/collab-catchup.sh ack --agent claude` — watermark bumped from 2026-04-28T22:05:11-04:00 to 22:50:59-04:00. State.md `<!-- section:read-watermark -->` updated.
3. Ran `bash ~/.claude/skills/multi-agent-collab/scripts/collab-register.sh "docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md"` — design plan v2 timestamp re-bumped in INDEX.
4. Added explicit cross-agent risk `Watch out:` block to the v2 work log entry (Row 10 of fan-out matrix). Documented the YAML group split as a coupled atomic change requiring all four edits in one commit.
5. Wrote `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` per design plan §15 cross-references and option B path. 20 sections covering: pre-flight checks, branch/commit strategy, 11 ordered steps with verification gates per step, implementation-specific risks (RI-1 through RI-7), open questions/deferred decisions (QI-1 through QI-5), reviewer checklist (§18), cross-references (§19), comments slot (§20).
6. Registered implementation plan in INDEX. collab-check OK. INDEX = 20 managed files.

**Files touched:**

- New: `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` (~870 lines, ~24 KB)
- Modified: `.claude/memory/state.md` (current state, next-steps for execution sequence, watermark), `.collab/INDEX.md` (auto-bumped by register), `docs/agents/claude.md` (this entry — work log + Receipt; cross-agent Watch out block in prior entry)
- Untouched: still no `career-ops/*` config or code changes; those happen during implementation execution.

**Watch out:**

- The implementation plan is the playbook; the actual edits to `portals.yml`, `modes/_profile.md`, `config/profile.yml`, `enrich-jobs.mjs`, `export-jobs.mjs` happen during STEP-BY-STEP execution per §3.2 commit cadence. Don't shortcut the gate-checks.
- §13 acceptance criterion #13 grep audit will fail if any new stale strings sneak in during implementation. Re-run after every commit that touches docs/.
- The CREATIVE/GEN-AI YAML group split (Step 2) is coupled with the senior/principal positive removal — must land in the same commit (per cross-agent risk noted in prior entry).

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` ........ new file, 20 sections, full step-by-step playbook
- `.claude/memory/state.md` ........ current state, full execution sequence in next-steps, watermark to 22:50:59
- `.collab/INDEX.md` ........ implementation plan registered + design plan re-registered (timestamp bump)
- `docs/agents/claude.md` ........ this entry + Receipt
- prior entry `Watch out:` block ........ added explicit Row 10 cross-agent risk note for the YAML group split coupling

Missing / intentionally skipped:
- `career-ops/*` — all config/code edits remain deferred to implementation plan execution.
- `.claude/memory/decisions.md` — no new decision in this task; the implementation plan implements existing D-7..D-12. New decisions only get added if implementation surfaces something unexpected (per §14.2).
- `.claude/memory/context.md` — no new durable truth; implementation plan is procedure not new fact.
- `docs/STATUS.md` — Phase 2.7 is in progress (design phase complete, implementation phase about to begin). STATUS update happens at Step 11 commit hygiene.
- No new handoff to Codex written — user said "proceed to option B". Optional Codex re-review of implementation plan available at user's call before execution begins.

## 2026-04-29 — Phase 2.7 implementation EXECUTED (Steps 0-11)

**Goal:** Execute the implementation plan v2 atomically per user's hybrid cadence directive — per-step commits, no pause unless gate fails, skip Step 9 calibration.

**Approach:**
1. Loaded `superpowers:executing-plans` skill; created 10 TaskCreate items.
2. Called advisor before Step 0 — got 3 critical fixes: (a) cp+overwrite-and-restore instead of mv-swap (mv leaves no portals.yml on disk if a crash hits between moves), (b) sample-50 uniform sample is biased to ~48 branded / ~2 direct-ATS (advisor coverage caveat documented in §11A), (c) atomic per-step commits = resume points.
3. Executed Steps 0-11 atomically. Each step verified before commit; no failures.

**Per-step commit summary:**
| Commit | Step | Description |
|---|---|---|
| `a13b9a5` | 0 | Sample size 100→50 + advisor's cp+restore + coverage caveat |
| `cf3f2f1` | 1 | portals.yml audit cleanup: 14 mis-drops re-enabled, 2 inversions disabled (Foxconn 65, Skydio 437), notes added to all 20 disabled. Final: 448/428/20/0 missing notes |
| `85e084a` | 2 | title_filter rewrite: 3 senior positives removed, 8 negatives added (Senior, Sr, Sr., Principal, Junior, Jr, Jr., Associate), CREATIVE/GEN-AI YAML groups split per Codex §17 finding |
| `d935038` | 3+4 | All 6 archetype levels → Mid-level in profile.yml; "Target IC band: mid-level (3-5 YoE)" header in _profile.md; advisor/lead → hands-on/implementer reframing |
| `5407135` | 5 | docs/design/companies-roster.md generated (auto from portals.yml) |
| `008f5c5` | 6 | enrich-jobs.mjs created. 19/19 unit tests pass on extractSignals (4 fixtures: ideal/senior/dealbreaker/K-notation). Live test on Imbue URL: tier1-http 200 in 0.5s, signals extracted, second run hit cache. CLI flags: --dry-run, --force, --company, --rate-limit-ms, --ttl-days, --skip-stale (NO --limit per Codex §20 review) |
| `6740070` | 7+8 | export-jobs.mjs refactored: 6 new columns in Pending Jobs + 3 in By Company, parseTrackMappingFromYaml, computeTitleScore, computeDescScore, computeBand, sort desc by pre-score, per-row band fills (S=green/A=yellow/B=grey/C=red), 3 CLI flags including --cache-warn-threshold per Codex §20. PREFERRED_CATEGORIES finalized per QI-3 + Codex Q-3: includes Foundation Models, AI Sales/GTM AI; EXCLUDES AI Chatbot/Consumer. package.json: enrich script added, full-scan chain extended to scan→custom-scrape→enrich→export |
| `eacb2c3` | 8.5 | Sample run on 50 random enabled companies (seed=42): 94 jobs scraped, 88/94 cache hits (93.6%), 11 cols in Excel, sort verified, --cache-warn-threshold 99 fired. Live state restored via cp+overwrite (git diff clean ✓). 8/9 SR pass; SR-6 affected by sample-script bug (yaml.dump loses comment groups → empty trackMap), NOT a production bug |
| `9ff216a` | 11 | INDEX registers enrich-jobs.mjs + companies-roster.md; scripts/acceptance-audit.py runs all 18 design §12 criteria — **18/18 PASS** |

**Critical findings during execution:**
- **Bug squashed in extractSignals comp parser:** initial regex `/\$?\s?([\d,]+)\s?[Kk]?\s*[-–—to]+\s*\$?\s?([\d,]+)\s?[Kk]?/` false-positive matched "3-5 years" before "$130,000 - $170,000". Fixed by anchoring on `$` OR `K`/`k` requirement and skipping ranges where both numbers < 1000 with no K marker.
- **Sample-script comment-loss:** `scripts/sample-portals-50.py` used `yaml.dump` which loses YAML comment groups. The track-mapping parser in `export-jobs.mjs` reads those comments to build keyword→track maps. Sample run had `match_track="?"` for all jobs, suppressing S-tier emergence. Documented in eacb2c3 commit message; sample script not committed.
- **Acceptance audit subprocess+bash on Windows:** initial attempt to invoke `~/.claude/skills/multi-agent-collab/scripts/collab-check.sh` from python313 subprocess failed with path resolution + `set -o pipefail` not recognized in the bash subshell. Workaround: criterion #16 verifies INDEX.md text directly; criterion #17 verified manually via Bash tool (returned "OK: INDEX and filesystem aligned").

**Files touched:**

- New (committed): `career-ops/enrich-jobs.mjs`, `career-ops/test-enrich-signals.mjs`, `scripts/portals-audit-cleanup.py`, `scripts/generate-companies-roster.py`, `scripts/acceptance-audit.py`, `docs/design/companies-roster.md`
- Modified (committed): `career-ops/portals.yml`, `career-ops/config/profile.yml`, `career-ops/modes/_profile.md`, `career-ops/export-jobs.mjs`, `career-ops/package.json`, `career-ops/.gitignore`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`, `.collab/INDEX.md`
- Deleted intentionally (not committed): `scripts/sample-portals-50.py` (yaml.dump bug; recreate with ruamel.yaml or string-based preservation if Step 8.5 is repeated)
- Untouched (per D-3 invariant): `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, all `career-ops/CLAUDE.md` / vendored upstream

**Watch out:**

- Sample-script bug means re-running Step 8.5 needs a fix before it can validate S-tier emergence. The chain itself works correctly with the live portals.yml (which has comments).
- enrichment cache (`career-ops/data/job-descriptions-cache.json`) is now gitignored. After a Phase 2.6 clean rescan, the cache will populate from real 1000+ jobs — confirm gitignore is honored before commit.
- 14 re-enabled companies (per design §4.2) are best-guesses. Phase 2.6 clean rescan will reveal whether each yields meaningful results; companies returning empty consistently should be re-disabled with a `note: "validated empty 2026-04-29"` style annotation.
- Sample run produced no S-tier (banding distribution: S=0 A=4 B=40 C=50 on 94 sample jobs) due to the sample-script comment-loss bug. Production behavior on a real rescan is expected to populate S-tier — but if it doesn't, calibration thresholds (currently S≥12 / A≥8 / B≥4 / C<4) may need tuning.

### Task Receipt

Updates fanned out this task:
- `career-ops/portals.yml` ........ audit cleanup (cf3f2f1) + title_filter rewrite (85e084a)
- `career-ops/config/profile.yml` ........ all archetypes Mid-level (d935038)
- `career-ops/modes/_profile.md` ........ mid-level IC band header + reframing (d935038)
- `career-ops/enrich-jobs.mjs` ........ NEW; description fetcher + signal extractor (008f5c5)
- `career-ops/test-enrich-signals.mjs` ........ NEW; 19/19 unit tests pass (008f5c5)
- `career-ops/export-jobs.mjs` ........ pre-scoring + 6 new columns + 3 new CLI flags (6740070)
- `career-ops/package.json` ........ enrich script + full-scan chain extension (6740070)
- `career-ops/.gitignore` ........ data/job-descriptions-cache.json (eacb2c3)
- `docs/design/companies-roster.md` ........ NEW; auto-generated from portals.yml (5407135)
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` ........ Step 0 size 100→50 + advisor fixes (a13b9a5)
- `scripts/portals-audit-cleanup.py` ........ NEW; one-shot audit cleanup (cf3f2f1)
- `scripts/generate-companies-roster.py` ........ NEW; roster generator (5407135)
- `scripts/acceptance-audit.py` ........ NEW; runs all 18 §12 criteria (9ff216a)
- `.collab/INDEX.md` ........ registers enrich-jobs.mjs + companies-roster.md (9ff216a)
- `.claude/memory/state.md` ........ current state + next-steps + watermark
- `docs/agents/claude.md` ........ this entry + Receipt

Missing / intentionally skipped:
- `scripts/sample-portals-50.py` — deleted after Step 8.5 because yaml.dump bug; recreate with comment-preservation if rerun needed.
- `docs/STATUS.md` — Phase 2.7 implementation complete; will update if user signals merge to main or moves to Phase 2.6.
- Step 9 calibration pass — skipped per user direction.
- `.claude/memory/decisions.md` — no new D-N entry needed; this is execution of D-7..D-12.
- `.claude/memory/pitfalls.md` — sample-script comment-loss is a one-off scripting gotcha, not a recurring pitfall worth promoting.
- No new handoff written — user said execute, not hand off. Implementation is complete.

## 2026-04-29 — Phase 2.8 Firecrawl pivot: design + decisions + verification

**Goal:** After Phase 2.7 sample run revealed only ~26% scraper coverage (mostly because branded landing pages defeat the 3-tier ATS discovery in `custom-scraper.mjs`), pivot the scraping architecture to Firecrawl-first. Design the pivot, resolve open questions, verify baseline-knowledge claims against primary sources before writing the implementation plan.

**Approach:**

1. **Phase 2.8 design plan** (commit `0f9421a`): wrote `docs/plans/2026-04-29-firecrawl-pivot-design.md`. Architecture: 4-layer (Layer 0 direct-API in `scan.mjs` untouched per D-3 invariant; Layer 1 `firecrawl-discover.mjs` for ATS discovery on branded pages; Layer 2 `firecrawl-extract.mjs` for JD enrichment on auth-gated/custom systems; Layer 3 `custom-scraper.mjs` retained as Playwright fallback). Identified 5 risks, 4 open design questions (Q-FC-1..Q-FC-4), 9 acceptance criteria. Smoke test on 5 URLs (Jasper/SiFive/Expedia/Cloudflare/Shopify) + deep content inspection demonstrated Firecrawl handles SPA branded pages reliably and most "broken" companies actually use known ATSes hidden behind marketing landing pages.

2. **Phase 2.8 decisions addendum + Web research project rule** (commit `d8e3921`): wrote `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` answering all 4 open questions (Q-FC-1: per-call inline JSON Schemas; Q-FC-2: Layer 1 discovery first then scan.mjs reads merged slugs; Q-FC-3: reserve `firecrawl_actions:` field but don't pre-populate; Q-FC-4: Firecrawl-first per-JD with HTTP fallback for static greenhouse/ashby pages). Same commit added "Web research" project rule to root `CLAUDE.md`: state intent + wait for explicit signal before web fetches; in-turn user authorization is the signal.

3. **Verification research via forked agent** (this session): user noted I'd answered design questions with baseline knowledge in many places. Listed 12 specific claims that needed primary-source verification (Firecrawl API spec details, pricing, endpoint distinctions, ATS provider API availability for 11 ATSes, empirical claims). Forked a `general-purpose` agent with a tight prompt to verify all 12 against official docs. Agent's write tools were denied; agent returned full findings inline + summary. I persisted the agent's verification report to `docs/design/2026-04-29-firecrawl-ats-verification.md` (with frontmatter; not registered in INDEX yet at write time).

4. **Material findings from verification** (architecture impact):
   - **Workday CXS API is public + no-auth.** `POST {tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` returns paginated jobs; `GET .../job/{externalPath}` returns full JD. Previously assumed Firecrawl-territory. Biggest single finding.
   - **JSON-mode scrape costs 5 credits/page, not 1.** `formats:["json"]` adds +4 credits. With 101k credits, JSON-mode JD budget is ~20k, not ~100k. Material for budgeting.
   - **`/v1/scrape` with `formats:["html","links"]` is the right tool for ATS discovery, NOT `/v1/map`.** Map returns URL lists only — can't see ATS hostnames in script tags / iframe src.
   - **Modern Firecrawl JSON shape is `formats:["json"]` + `jsonOptions`**, NOT legacy `extract` / `extractorOptions`.
   - **5 additional ATSes have no-auth public APIs:** Workday CXS, SmartRecruiters, Personio, Recruitee, Workable. 6 others need auth/HTML scraping (iCIMS, BambooHR, Pinpoint, Teamtailor, Phenom, Jobvite). JazzHR unverifiable.
   - **`/v1/extract` is on a separate token-based subscription pool** (not per-page credit pool). Default to `/v1/scrape` + inline schema; `/agent` is the listed migration target for `/extract`.
   - **`actions` parameter total wait time capped at 60 s.** SPAs needing longer settle time need `/interact` (2 credits/browser-minute).
   - **No published throttles on Greenhouse/Ashby/Lever public APIs.** 428 weekly is well below any plausible cap.
   - **30-day cache TTL acceptable; 60-day with fast-fail re-discovery on 4xx/5xx is also defensible.** Real ATS migrations are 12-week+ projects done rarely.

5. **portals.yml ATS hostname grep** (this session): direct-ATS URLs in current portals.yml: Greenhouse 12, Ashby 10, Workday 4, Personio 1, Workable 1, Lever ≈1. Total ~29 of 428 enabled = ~7% direct-API coverage. The other ~400 are branded landing pages — Layer 1 Firecrawl discovery is the critical path. Eightfold/Avature/SuccessFactors/Taleo/Oracle Cloud HCM: zero direct hostnames in current portals.yml (may surface post-discovery).

6. **Design checkpoint commit** (this session, in progress): per user request, did NOT commit during the design or research turns; consolidated update at the end:
   - INDEX registers 3 new docs (Phase 2.8 design plan, decisions addendum, verification research)
   - decisions.md appends D-14 (Firecrawl pivot architecture), D-15 (5-ATS direct-API tier expansion), D-16 (project rules added: Web research authorization + Surface uncertainty over baseline knowledge)
   - state.md refreshed (active task, pause point, next steps, open questions, watermark)
   - STATUS.md adds Phase 2.8 Done block + revised Up Next + revised handoff note
   - Root CLAUDE.md adds second project rule "Surface uncertainty over baseline knowledge" — lean toward proposing a web fetch when uncertainty will shape design decisions; complements (does not replace) the autonomy-governing "Web research" rule
   - This work-log entry + Receipt

**Files touched this arc:**

- New (committed): `docs/plans/2026-04-29-firecrawl-pivot-design.md` (commit 0f9421a), `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (commit d8e3921), root `CLAUDE.md` Web research rule (commit d8e3921 — appended outside framework markers)
- New (uncommitted, this session): `docs/design/2026-04-29-firecrawl-ats-verification.md`, `scripts/firecrawl-smoke-test.mjs`, `scripts/firecrawl-deep-test.mjs`, `scripts/inspect-firecrawl-links.mjs`, `scripts/firecrawl-smoke-out/` (raw markdown + summary JSON from smoke test runs)
- Modified (uncommitted, this session): root `CLAUDE.md` (added "Surface uncertainty over baseline knowledge" rule), `.collab/INDEX.md` (registers 3 new docs + bumped timestamp), `.claude/memory/decisions.md` (D-14 + D-15 + D-16 + frontmatter timestamp), `.claude/memory/state.md` (current state, next steps, open questions, watermark), `docs/STATUS.md` (Phase 2.8 done block, up next, handoff note), `docs/agents/claude.md` (this entry + Receipt + frontmatter timestamp)
- Untouched (per D-3 invariant + per "design before implementation" split): all `career-ops/*` config and code. New `firecrawl-discover.mjs`, `firecrawl-extract.mjs`, and 5 new ATS adapter scripts will land during Phase 2.8 implementation.

**Watch out:**

- **JSON-mode pricing correction is critical for Phase 2.8 budgeting.** Implementation plan must use 5 credits/page when `formats:["json"]` is set; default to plain markdown (1 credit/page) wherever fields are stable enough that local regex extraction works. Most JD signal extraction should stay in `enrich-jobs.mjs`'s markdown+regex lane.
- **Workday CXS endpoint is the largest single Firecrawl-credit reduction available.** New Workday adapter sibling to scan.mjs (per D-3) handles ongoing fetches once Layer 1 surfaces a Workday tenant.
- **`portals.yml` has only ~7% direct-ATS coverage today.** Most of the 5 new ATS adapters (D-15) will pick up volume only AFTER Layer 1 Firecrawl discovery surfaces their hostnames. The adapters and discovery are coupled — both must land in Phase 2.8 implementation for the architecture to deliver value.
- **JazzHR public-feed status unverifiable** without dev-portal account — not in current portals.yml so probably moot, but flag if a JazzHR company appears post-discovery.
- **`/v1/extract` migrating to `/agent`** per Firecrawl's own docs. Standardizing on `/v1/scrape` + inline schema sidesteps that migration.
- **Per-plan rate caps (RPM, concurrency) for Firecrawl** not in retrieved sources. Worth checking the Firecrawl billing dashboard before high-concurrency batch design.

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ NEW (commit 0f9421a — earlier; not from this session)
- `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` ........ NEW (commit d8e3921 — earlier)
- root `CLAUDE.md` ........ Web research rule appended (commit d8e3921 — earlier); Surface uncertainty over baseline knowledge rule appended (this session)
- `docs/design/2026-04-29-firecrawl-ats-verification.md` ........ NEW (this session) — verification research, 12 claims tested
- `.collab/INDEX.md` ........ registers 3 new docs (design plan, decisions addendum, verification research) + bumped timestamp
- `.claude/memory/decisions.md` ........ D-14 (Firecrawl pivot architecture) + D-15 (API-direct tier expansion 5 new ATSes) + D-16 (project rules) + frontmatter timestamp
- `.claude/memory/state.md` ........ current state + next steps + open questions + watermark
- `docs/STATUS.md` ........ Phase 2.8 done block + revised Up Next + revised handoff note
- `docs/agents/claude.md` ........ this entry + Receipt + frontmatter timestamp

Missing / intentionally skipped:
- `AI_AGENTS.md` Project Context — Pipeline Architecture diagram still reflects Phase 2.7 architecture. Holding for Phase 2.8 implementation when exact file paths are settled (avoid documenting planned-but-uncoded files).
- `.claude/rules/architecture.md` — Layer separation table doesn't yet include `firecrawl-discover.mjs` / `firecrawl-extract.mjs` / new ATS adapters. Same reason as above; update post-implementation.
- `.claude/memory/pitfalls.md` — no new pitfalls; the verification round caught baseline-knowledge errors before they became pitfalls.
- `.claude/memory/context.md` — no new durable invariants; Phase 2.8 architecture is a decision (D-14/D-15) not yet a verified-in-production invariant.
- `scripts/firecrawl-smoke-test.mjs`, `scripts/firecrawl-deep-test.mjs`, `scripts/inspect-firecrawl-links.mjs` — diagnostic/throwaway; not registered in INDEX (transient like `scripts/sample-portals-50.py` was).
- `.firecrawl-key` — gitignored; never committed.
- No new handoff written — user has not signaled Codex review of Phase 2.8 design plan; deferred to user's call.

## 2026-04-29 — Phase 2.8 Codex design review integrated (design plan v2)

**Goal:** Take the baton on handoff `20260429-164715-2bcf` (Codex closed it after review). Reconcile Codex's §11 review of Phase 2.8 Firecrawl-pivot design analytically — verify each point against primary sources, decide accept/modify/defer/reject per technical merit, integrate fixes in-place to design plan v2, then proceed toward implementation plan.

**Approach:**

1. Loaded `superpowers:receiving-code-review` skill before reading review.
2. Ran framework catchup (`collab-catchup.sh preview --agent claude --handoff`); confirmed handoff is closed (no open ones).
3. Read review artifacts: `docs/plans/2026-04-29-firecrawl-pivot-design.md` §11 (Codex's review), `docs/agents/codex.md` latest entry, `.codex/memory/{context,decisions,state}.md`, `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (for Q-FC-4 ambiguity context).
4. **Verified each Codex finding against primary sources:**
   - All 5 ⚠ Issues: confirmed against design plan line numbers cited by Codex; cross-checked against verification doc + D-14/D-15. All 5 are real defects; ACCEPT.
   - All 3 ❓ Questions: layer-2 naming (Q1) is a real architectural ambiguity in D-14; JazzHR exclusion (Q2) is a real gap not in §7; rate-cap softening (Q3) reflects verification doc's "rate caps not found in retrieved sources". ACCEPT all 3.
   - Both 💭 Optional improvements: source-of-truth precedence note + provider matrix add clarity, no scope expansion. ACCEPT both.
5. **Integrated all 10 points into design plan v2** (in-place revision with frontmatter `revision: v2`):
   - Added §0 source-of-truth precedence note.
   - §4.1 Layer 0 box rewritten to show 8-provider tier (3 existing in scan.mjs + 5 new sibling adapters). Added §4.1.1 ATS provider matrix (provider / detection signal / direct endpoint / output parser / status). Layer 2 box updated to use `formats:["json"]` + `jsonOptions` (NOT legacy `/v1/extract`/`extractorOptions`). Per-JD enrichment box clarified as refactor of `enrich-jobs.mjs` in-place (NOT a new file; D-14 typo "firecrawl-enrich.mjs" corrected here).
   - §4.2 file list expanded with `lib/firecrawl.mjs` (no `extract()` wrapper), `lib/ats-clients.mjs`, 5 sibling adapters in `scripts/ats-adapters/`.
   - §4.3 "Decision pending" removed; D-3 invariant locked; scan.mjs NOT modified.
   - §5 cost model fully rewritten: §5.1 per-call cost matrix (markdown 1cr / JSON 5cr / stealth +4 / interact 2cr/min / `/v1/extract` excluded / direct API 0cr); §5.2 budget projection per mode; §5.3 60-day TTL with fast-fail; §5.4 dashboard rate-cap manual gate; §5.5 `--max-credits` cap.
   - §6 migration sequence expanded from 9 to 12 steps (Step 0 URL triage; Step 9 dashboard rate-cap manual gate; Step 11 acceptance audit; Step 12 Phase 2.6 clean rescan).
   - §7 acceptance criteria expanded from 6 placeholder to 11 final ACs covering: 5 adapter integration tests, no-`/v1/extract` grep audit, 60-day TTL behavior, cost log per mode, JazzHR explicit out-of-scope, dashboard rate-cap manual gate + `--max-credits` enforcement.
   - §8 FC-R2 reworded to use modern `formats:["json"]+jsonOptions` shape.
   - §9 all 4 Q-FC questions marked RESOLVED (Q-FC-1 verified inline; Q-FC-4 picked pure Firecrawl-first per user principle).
   - §10 historical note added (smoke-test scripts deleted in 626e1ce).
   - §12 Claude's reconciliation table added documenting disposition of each Codex point (5 issues + 3 questions + 2 optional improvements with verification + disposition + v2 location).
6. **Updated decisions addendum** (`docs/plans/2026-04-29-firecrawl-pivot-decisions.md`): Q-FC-4 section rewritten to be unambiguously pure Firecrawl-first. The earlier draft had three contradictory paragraphs (Codex caught this in §11). Fallback HTTP is purely outage-resilience, NOT cost-routing. Override path documented as future tunable.
7. **Updated D-14 in-place** (`.claude/memory/decisions.md`): firecrawl-enrich.mjs → firecrawl-extract.mjs naming typo corrected with reference to D-17; rate-cap claim softened from "well below any plausible plan cap" to "likely low volume but dashboard caps must be confirmed manually before high-concurrency batch design".
8. **Recorded D-17** in `.claude/memory/decisions.md` documenting the full integration with full reasoning, per-issue verification + disposition, and implementation impact. Pattern matches D-12 (Phase 2.7 Codex review integration).
9. **Updated state.md, STATUS.md, work log** (this entry).

**Verification of each Codex point — disposition table:**

| # | Codex finding | Verified against | Disposition |
|---|---|---|---|
| ⚠1 | Layer 0 sibling adapters not integrated; "Decision pending" stale | design plan §4.1/§4.2/§4.3 line citations + D-14/D-15 | ACCEPT |
| ⚠2 | Stale `/v1/extract` and legacy schema language | design plan multiple `/v1/extract` references + verification doc Q1+Q2 | ACCEPT |
| ⚠3 | Cost model assumes 1cr flat + 30-day TTL | design plan §5 lines 130-140 + verification doc + D-14 | ACCEPT |
| ⚠4 | 6 placeholder ACs, handoff promised 9, gaps in coverage | design plan §7 lines 154-162 + handoff message | ACCEPT |
| ⚠5 | Q-FC-4 enrichment policy internally inconsistent | decisions addendum lines 159-171 | ACCEPT (pure Firecrawl-first) |
| ❓1 | Layer 2 naming convention | design plan vs decisions vs D-14 inconsistency | ACCEPT (firecrawl-extract.mjs for Layer 2; enrich-jobs.mjs refactored in-place) |
| ❓2 | JazzHR explicit exclusion | verification doc UNVERIFIABLE marker | ACCEPT |
| ❓3 | Soften "1,800 GETs/week below cap" claim | verification doc says caps not found | ACCEPT |
| 💭1 | Source-of-truth precedence note | clarity / drift prevention | ACCEPT |
| 💭2 | ATS provider matrix in §4.1 | 8-provider tier benefits from compact table | ACCEPT |

**Files touched:**

- Modified: `docs/plans/2026-04-29-firecrawl-pivot-design.md` (v2 with 12 sections of changes; Codex's §11 preserved as audit trail; new §12 Claude reconciliation table); `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (Q-FC-4 rewrite + frontmatter timestamp); `.claude/memory/decisions.md` (D-14 inline correction + D-17 added + frontmatter timestamp); `.claude/memory/state.md` (current state, next steps, watermark); `docs/STATUS.md` (Phase 2.8 v2 done block + revised Up Next + handoff note); this work log
- Untouched: all `career-ops/*` config and code; `AI_AGENTS.md` Project Context (still holding for implementation phase); `.claude/rules/architecture.md` (same); `.claude/memory/{context,pitfalls}.md` (no new durable truths or pitfalls — review-integration is a correctness pass, not new architectural ground)

**Watch out:**

- **Design plan v2 is in-place revision; Codex's §11 review preserved at the bottom as audit trail.** Future readers should treat verification doc + D-14/D-15/D-16/D-17 as authoritative when in doubt (per §0 precedence note).
- **All 10 Codex points were correctness-pass corrections, not architecture changes.** v2 vs v1 is doc-accuracy improvement; the architecture is unchanged. Codex re-review of v2 is OPTIONAL — matches Phase 2.7 D-12 pattern (no second review round needed).
- **D-14's `firecrawl-enrich.mjs` → `firecrawl-extract.mjs` naming correction is more than a typo fix.** It clarifies that Layer 2 (structured listing extraction from custom careers pages) and per-JD enrichment (refactor of existing `enrich-jobs.mjs`) are different responsibilities. Implementation plan must respect this split.
- **Q-FC-4 is now pure Firecrawl-first.** If the implementation plan or implementation execution drifts back to "HTTP-first for static pages saves credits" — that's a regression. The user's principle is "Firecrawl first, custom code as backup". Override path documented as a future tunable (`ENRICH_PRIORITIZE_HTTP=true` config flag) but explicitly out-of-scope for Phase 2.8.

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ revision: v2 with 12 sections of changes (precedence note + 8-provider Layer 0 + provider matrix + modern formats:json+jsonOptions language + mode-split cost model + 60-day TTL + 12-step migration sequence + 11 final ACs + reconciliation table)
- `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` ........ Q-FC-4 rewritten as unambiguous pure Firecrawl-first; frontmatter timestamp bumped
- `.claude/memory/decisions.md` ........ D-14 inline-corrected (firecrawl-enrich → firecrawl-extract typo; softened rate-cap claim); D-17 added documenting the full Codex review integration; frontmatter timestamp bumped
- `.claude/memory/state.md` ........ current state + next steps (Phase 2.8 implementation plan write is next) + watermark
- `docs/STATUS.md` ........ Phase 2.8 v2 done block + revised Up Next + new handoff note
- `docs/agents/claude.md` ........ this entry + Receipt

Missing / intentionally skipped:
- `career-ops/*` — all config/code edits remain deferred to Phase 2.8 implementation execution.
- `docs/agents/codex.md` — Codex's work log is owner=codex; not modified per cross-agent courtesy.
- `.codex/memory/*` — Codex's memory; not modified.
- `AI_AGENTS.md` Project Context Pipeline Architecture diagram — still holding until implementation phase settles exact file paths.
- `.claude/rules/architecture.md` Layer separation table — same reason.
- `.claude/memory/{context,pitfalls}.md` — no new durable invariants or pitfalls from a correctness-pass integration.
- No new handoff written — Codex re-review is optional (correctness pass); next substantive work is Claude writing the Phase 2.8 implementation plan.

## 2026-04-29 — Phase 2.8 implementation plan written

**Goal:** Per user direction following the Codex-review integration ("then proceed toward the Phase 2.8 implementation plan"), translate design plan v2 §6 (12 steps) into an executable atomic-commit playbook with per-step verification gates and rollback procedures.

**Approach:**

1. Read design plan v2, decisions addendum, verification report, D-14/D-15/D-16/D-17 to ensure implementation plan reflects current source-of-truth state.
2. Mirrored Phase 2.7 implementation plan structure (precedent at `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`): pre-flight + branch strategy + per-step playbook + AC mapping + risks + deferred decisions + reviewer checklist + comments slot.
3. Wrote `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` with 12 sections covering Step 0 through Step 12.
4. Each step specifies: goal, file changes (paths + line counts), verification gate, manual gate (if any), commit message format, rollback command.
5. §7 maps each of 11 ACs to specific verification step(s).
6. §8 documents 8 implementation-specific risks (RI-1..RI-8) with mitigations.
7. §9 lists 5 deferred decisions (QI-1..QI-5) with recommendations.
8. §10 reviewer checklist for optional Codex re-review.
9. §12 reserves a Comments slot for Codex review.

**Files touched:**

- New: `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` (~520 lines, ~22 KB).
- Modified: `.collab/INDEX.md` (registers implementation plan + bumps timestamps); `.claude/memory/state.md` (current state + next steps); `docs/STATUS.md` (Phase 2.8 implementation plan done block + handoff note); this work log.
- Untouched: all `career-ops/*` config and code; design plan v2 (no further changes since Codex review integration commit `73f6b2a`); decisions.md (no new D-N entry needed — implementation plan implements existing D-14..D-17).

**Watch out:**

- **Implementation plan is THE playbook for Phase 2.8 execution.** Do NOT shortcut verification gates; do NOT re-order steps; do NOT skip manual gates (Step 0 triage review / Step 5 smoke result review / Step 9 dashboard rate-cap / Step 10 full sample review).
- **D-3 invariant verification is enforced at multiple steps** (pre-flight + Step 2 + Step 11 AC-8): `scan.mjs` is NOT modified throughout Phase 2.8.
- **AC-5 (no `/v1/extract` or legacy schema keys) is enforced via grep audit at Step 1, Step 6, Step 7, Step 11.** This is a structural guard against drifting back into pre-verification baseline knowledge.
- **Q-FC-4 pure Firecrawl-first** is non-negotiable per user direction. If implementation execution drifts back to "HTTP-first for static pages saves credits" — that's a regression.
- **5 sibling adapters live in `scripts/ats-adapters/` (project root)**, NOT inside `career-ops/`. Per QI-1, this is the recommended location to avoid violating D-3 (`career-ops/` is vendored upstream).
- **Phase 2.6 clean rescan execution remains out of scope.** Step 12 is a "ready signal" only — actual rescan execution is a separate session per user direction.

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ NEW; 12 sections, 12 ordered steps with verification gates + rollback, AC mapping, risks, deferred decisions, reviewer checklist
- `.collab/INDEX.md` ........ registers implementation plan + bumps timestamps for design plan + decisions addendum
- `.claude/memory/state.md` ........ current state + next steps + watermark
- `docs/STATUS.md` ........ Phase 2.8 implementation plan done block + revised Up Next + handoff note
- `docs/agents/claude.md` ........ this entry + Receipt

Missing / intentionally skipped:
- `career-ops/*` — all config/code edits remain deferred to Phase 2.8 implementation execution per the plan itself.
- `.claude/memory/decisions.md` — no new D-N entry needed; implementation plan implements existing D-14..D-17. New decisions only added if implementation surfaces something unexpected per the framework's PROTOCOL.md.
- `.claude/memory/{context,pitfalls}.md` — no new durable invariants or pitfalls from a planning task.
- No new handoff to Codex written — Codex review of the implementation plan is OPTIONAL (user said merge before implementation; review can happen after merge or be skipped per Phase 2.7 D-12 pattern).
- `AI_AGENTS.md` Project Context Pipeline Architecture diagram — still holding until implementation actually lands.
- `.claude/rules/architecture.md` Layer separation table — same.

## 2026-04-29 — Phase 2.8 implementation plan v2 (Codex review integration)

**Goal:** Take the baton on handoff `20260429-183239-0925` (Codex closed it after review). Reconcile Codex's §12 review of Phase 2.8 implementation plan analytically — verify each point against primary sources, decide accept/modify/defer/reject per technical merit, integrate fixes in-place to v2.

**Approach:**

1. Loaded `superpowers:receiving-code-review` skill before reading review.
2. Ran framework catchup; handoff already closed by Codex.
3. Read review artifacts: implementation plan §12 (Codex review), `.codex/memory/state.md` + `decisions.md` D-4 + `context.md` latest entry, `docs/agents/codex.md` latest entry.
4. **Verified each Codex finding against primary sources:**
   - All 5 ⚠ Issues confirmed real (npm cwd resolution; cwd inconsistency across steps; full-scan dry-run unsupported by plain chain; Layer 3 fallback under-specified; §0 precedence contradicting design v2 + addendum Q-FC-1 stale). ACCEPT all 5.
   - Q1 (cp-overwrite vs project-root orchestrator): DEFER — cp+overwrite-and-restore from `career-ops/` is Phase 2.7 battle-tested pattern; cwd ambiguity resolved by §0a convention.
   - Q2 (HEAD+GET fallback for triage): ACCEPT — cheap, reduces false `dead` classifications.
   - O1 (RI-4 ambiguity rewrite): ACCEPT.
   - O2 (Workday CXS pagination test): ACCEPT.

5. **Integrated all 8 accepted points into implementation plan v2** (in-place revision with frontmatter `revision: v2`):
   - §0 source-of-truth precedence rewritten: verification report = priority 1 (overrides everywhere); D-14..D-18 = priority 2; design v2 = priority 3 (governs only after verification + D-N filter); addendum = priority 4 with Q-FC-1 baseline marked HISTORICAL.
   - §0a NEW: command working-directory convention — explicit cwd per step type; npm script paths resolve relative to package.json's directory; root scripts invoked via `../scripts/...` from career-ops/.
   - §6.0 Step 0: HEAD-first with GET fallback for 405/403/timeout/no-Content-Length.
   - §6.1 Step 1: lib/firecrawl.mjs writes to `data/firecrawl-fallback-queue.tsv` on hard-stop instead of just clean-exit; verification gate adds forced-failure subtest.
   - §6.2 Step 2: Workday CXS pagination test added to verification gate.
   - §6.3 Step 3: QI-1 RESOLVED inline (sibling adapters at repo-root `scripts/ats-adapters/`).
   - §6.4 Step 4: firecrawl-discover.mjs appends to fallback queue on `--max-credits` exhaustion.
   - §6.5 Step 5: chain command updated to `node ../scripts/ats-adapters/run-all.mjs` per cwd convention.
   - §6.6 Step 6: firecrawl-extract.mjs fallback-queue wiring + forced-failure subtest in verification gate.
   - §6.7 Step 7: enrich-jobs.mjs HTTP fallback specified as outage-only (NOT cost-routing); fallback queue write if HTTP also fails; forced-failure subtest in verification gate.
   - §6.8 Step 8: NEW `scripts/full-scan-orchestrator.mjs` (~120 lines) replaces plain npm chain; supports `--dry-run`/`--list`; reads fallback queue post-chain and invokes `npm run custom-scrape -- --queue <path>` if non-empty.
   - §7 AC-11 split into AC-11a (wiring verified by forced-failure subtest) + AC-11b (≤5% on normal run; 0 invocations OK as long as wiring confirmed).
   - §8 RI-4: ambiguous slug resolution rewritten — log all candidates; auto-pick on Levenshtein ≤2 company-name agreement; otherwise mark `ambiguous` for manual review.
   - §9 QI-1 RESOLVED.
   - §13 NEW: Claude's reconciliation table — disposition for each Codex point.

6. **Updated decisions addendum**: Q-FC-1 baseline section marked `**⚠ HISTORICAL — SUPERSEDED 2026-04-29 by verification doc Q1+Q2**` with explicit "verified next session" line struck through and replaced with done-marker. Preserves audit trail; prevents future implementation reads from following stale baseline knowledge.

7. **Recorded D-18** in `.claude/memory/decisions.md` documenting full integration with disposition table. Pattern matches D-12 (Phase 2.7 design v1→v2) and D-17 (Phase 2.8 design v1→v2).

8. **Updated state.md, STATUS.md, work log** (this entry).

**Files touched:**

- Modified: `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` (revision v1→v2; Codex's §12 preserved; new §0/§0a/§13 + per-step updates), `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` (Q-FC-1 HISTORICAL marker + frontmatter timestamp), `.claude/memory/decisions.md` (D-18 added + frontmatter timestamp), `.claude/memory/state.md` (current state, next steps, watermark), `docs/STATUS.md` (Phase 2.8 implementation plan v2 done block + revised Up Next + handoff note), this work log.
- Untouched: all `career-ops/*` config and code; design plan v2 (no further changes); D-14..D-17 (this is a v1→v2 integration adding D-18, not amending earlier decisions).

**Watch out:**

- **AC-11 split is structural.** Future implementation must produce a forced-failure subtest in Step 1 (mock 5xx) that demonstrates the fallback-queue write path works. Without that subtest, AC-11a passes vacuously even if the wiring doesn't actually fire.
- **`scripts/full-scan-orchestrator.mjs` is new code that must be written carefully.** It's the consumer of the fallback queue; if buggy, Layer 3 fan-out doesn't trigger and AC-11a regresses.
- **Step 5 chain command updated** to use `../scripts/ats-adapters/...` because of QI-1 resolution. If anyone copies the v1 chain command verbatim, it breaks.
- **Q-FC-1 historical marker is the FOURTH stale-content fix this session** (after §0 precedence, decisions doc Q-FC-4 rewrite, D-14 typo, design v2 §0). Pattern: when verification surfaces a correction, ALL artifacts referencing the pre-verification state need synchronized updates. For Phase 2.8 implementation execution, this discipline is now baseline.
- **No new handoff written** — Codex re-review of v2 OPTIONAL (correctness pass; matches Phase 2.7 D-12 + Phase 2.8 design D-17 pattern).

### Task Receipt

Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ revision v1→v2 with §0 + §0a + §6.0/1/2/3/4/5/6/7/8 + §7 AC-11a/b + §8 RI-4 + §9 QI-1 + §13 reconciliation
- `docs/plans/2026-04-29-firecrawl-pivot-decisions.md` ........ Q-FC-1 HISTORICAL/SUPERSEDED marker
- `.claude/memory/decisions.md` ........ D-18 added documenting integration
- `.claude/memory/state.md` ........ current state + next steps (USER GATE before Step 0 execution) + watermark
- `docs/STATUS.md` ........ Phase 2.8 implementation plan v2 done block + revised Up Next + handoff note
- `docs/agents/claude.md` ........ this entry + Receipt

Missing / intentionally skipped:
- `career-ops/*` — all config/code edits remain deferred to Phase 2.8 implementation execution.
- `docs/agents/codex.md` — Codex's work log; not modified per cross-agent courtesy.
- `.codex/memory/*` — Codex's memory; not modified.
- No new handoff to Codex — re-review optional; user gate is for execution authorization, not another review round.

## 2026-04-30 — Phase 2.8 implementation Steps 0-5 EXECUTED + Jasper fix + handoff to Codex

**Goal:** Execute Phase 2.8 implementation per plan v2 (steps 0-5), surface findings at Step 5 manual gate, hand off to Codex for Step 6 onward per user direction.

**Approach (atomic per-step commits):**

1. **Step 0 — portals.yml URL triage** (commits `e721305`, `631cd87`, `aff12fc`):
   - `scripts/portals-url-triage.py` HEAD+GET fallback over 428 enabled URLs; classified into 4 buckets (direct-ATS=24, branded=304, dead=68, wrong-company-suspect=32).
   - User-approved batch decisions via `scripts/portals-triage-proposed-fixes.md`: 6 URL updates (Advantest, NXP, Thought Machine, Xiaomi, PT DCI, HF) — user kept some current URLs and overrode my Advantest URL with a different working one; user also dropped Xiaomi + PT DCI as unreachable. 7 acquisitions disabled (Adept, Lepton, Tessian, Tecton, Exscientia, Neon, OctoAI). 1 defunct (Tome). 30 manual-review auto-disabled.
   - `scripts/portals-apply-triage-fixes.py` applied 42 edits to portals.yml. Result: 388 enabled / 60 disabled (all with notes).
   - Re-triage confirmed bucket counts: direct-ATS=25, branded-page-OK=304, dead=35, wrong-company-suspect=24. Commit aff12fc.

2. **Step 1 — `lib/firecrawl.mjs` SDK wrapper + cost tracking + tests** (commit `8f25673`):
   - `scrape(url, opts)` (markdown 1cr) and `scrapeJson(url, schema, prompt, opts)` (JSON 5cr per Q1+Q4).
   - **NO `extract()` wrapper** (AC-5 grep audit passes).
   - JOB_LISTING_SCHEMA_V1 exported, MAX_CREDITS_DEFAULT=3000.
   - Retry policy: 3× on 5xx with backoff 1s/2s/4s; fail-fast on 4xx.
   - Layer 3 fallback wiring: hard-stop conditions append to `data/firecrawl-fallback-queue.tsv` (AC-11a structural guard).
   - API key resolver: env var first; `.firecrawl-key` fallback supports both raw `fc-...` AND dotenv `FIRECRAWL_API_KEY=fc-...` formats.
   - 8/8 unit tests pass (cost tracking, --max-credits cap, 5xx retry, 4xx fail-fast, actions param, schema validation).
   - Live test: `https://example.com` → 167 markdown chars, 1 credit, cost log row appended.

3. **Step 2 — `lib/ats-clients.mjs` 8-provider library** (commit `68335e5`):
   - Exports: fetchGreenhouse / fetchAshby / fetchLever (duplicated from scan.mjs per D-3 — NOT extracted), fetchWorkdayCxs, fetchSmartrecruiters, fetchPersonio (XML parsing without xml2js dep), fetchRecruitee, fetchWorkable. Plus PROVIDERS dispatch map.
   - All return normalized `{provider, slug?, host?, jobs: [{title, location, url, department, raw}]}`.
   - 9/9 integration tests pass against representative real URLs (live HTTP, 0 Firecrawl credits).
   - **Workday CXS pagination CONFIRMED** (Codex O2 verification gate): FIS host returned 40 jobs across 2 pages (limit:20 + offset:20), unique externalPath dedup verified.

4. **Step 3 — 5 sibling adapters + run-all orchestrator** (commit `8ac3283`):
   - QI-1 RESOLVED: `scripts/ats-adapters/{workday-cxs,smartrecruiters,personio,recruitee,workable}.mjs` at repo-root (preserves D-3).
   - Shared `_lib.mjs` with PROVIDER_PATTERNS, detectProvider, iterTargets, buildTitleFilter, appendPipelineRow, appendHistoryRow, runAdapter generic.
   - `run-all.mjs` sequential orchestrator (per design v2 §5.4 sequential-default-until-rate-cap-verified).
   - `README.md` documents JazzHR explicit out-of-scope (AC-9), provider matrix, extension pattern.
   - Repo-root `package.json` added with js-yaml dependency (career-ops/node_modules not visible to ESM resolution from repo-root scripts).
   - Entry-point check fixed for Windows paths (use pathToFileURL not naive string concat).

5. **Step 4 — `firecrawl-discover.mjs` Layer 1 + `lib/ats-detect.mjs`** (commit `df51a68`):
   - Extracted PROVIDER_PATTERNS + detectProvider to `career-ops/lib/ats-detect.mjs` as single source of truth (used by both firecrawl-discover and scripts/ats-adapters/_lib.mjs).
   - `detectAllInText` finds ALL ATS markers in HTML/markdown body in document order.
   - Workday regex skips optional locale prefix (en-US, fr-FR, etc.).
   - Drilling: pickDrillLinks selects same-domain inner links matching /careers /jobs /opportunities /hiring/. Up to 2 levels deep, 3 candidates per level.
   - resolveAmbiguous with Levenshtein ≤2 company-name agreement (RI-4 per Codex O1).
   - 60-day TTL with isCacheEntryFresh check; --force flag.
   - --max-credits + fallback queue wiring on cap exhaustion.
   - 11/11 tests pass; live Cloudflare test: drilled depth 0 → /careers/jobs/ → discovered greenhouse/cloudflare.
   - `scripts/ats-adapters/_lib.mjs` updated with backward-compat for legacy custom-scraper.mjs cache schema (tenant+instance separate; ats:"workday" alias). Stale `site:"en-US"` (legacy bug) entries skipped with re-discover hint warning.

6. **Step 5 — sample-50 smoke validation** (commit `5b5fcf9`):
   - `scripts/sample-portals-50-v2.py` using ruamel.yaml (preserves YAML comment groups, fixing Phase 2.7 commit eacb2c3 bug).
   - cp+overwrite-and-restore pattern (NOT mv-swap, per advisor's Phase 2.7 §11A guidance).
   - **Sample run results:** 37/50 unique companies in pipeline = 74% coverage (vs Phase 2.7 baseline 13/50 = 26%) = +2.85x improvement. 248 jobs in Excel. 161 Firecrawl credits spent (0.16% of 101k budget).
   - **D-19 emerged** during smoke: scan.mjs only reads portals.yml; my 5 D-15 adapters only handled the 5 NEW providers. The 20 newly-discovered Greenhouse+Ashby+Lever slugs from Layer 1 had no consumer. Added 3 cached-discovery adapter scripts (greenhouse-cached.mjs / ashby-cached.mjs / lever-cached.mjs) using new `runAdapterCacheOnly()` helper. Extended run-all.mjs ADAPTERS array from 5 to 8. Added 225 jobs from cached-discovery adapters.
   - Live state restored cleanly via cp+overwrite (git diff portals.yml/pipeline.md/scan-history.tsv: empty).

7. **Jasper safeEncode fix** (commit `8c4a443`): P-4 — slug `Jasper%20AI` (URL-encoded in Layer 1 capture) was being re-encoded by `encodeURIComponent` to `Jasper%2520AI` → 404. Fix: idempotent `safeEncode()` helper in lib/ats-clients.mjs that decodes-then-encodes. Applied to all 5 fetcher functions.

**Step 5 inspection findings — 3 bugs surfaced:**

- **P-4 — URL double-encoding** (FIXED, commit 8c4a443).
- **P-5 — resolveAmbiguous candidate dedup needed**: 4 of 6 "ambiguous" cases in smoke (Cadence/F5/Monolithic Power/Tokyo Electron) are actually 1 unique tenant repeated 2-420×. After dedup → discovered. Recovers 4 companies; AC-2 lifts from 74% → 82%. Documented for Codex.
- **P-6 — Greenhouse "embed" synthetic slug**: Vectra AI/Zipline matched to slug `embed` from `boards.greenhouse.io/embed/job_board.js?for=<real-slug>` URL. Fix: regex update OR exclude synthetic slug names. Documented for Codex.

**Files touched (8 commits this session):**

- New (career-ops/): `lib/firecrawl.mjs`, `lib/ats-clients.mjs`, `lib/ats-detect.mjs`, `firecrawl-discover.mjs`, `test-firecrawl-wrapper.mjs`, `test-ats-clients.mjs`, `test-firecrawl-discover.mjs`.
- New (scripts/): `portals-url-triage.py`, `portals-url-triage-report.tsv` (initial) + `-v2.tsv` (post-fixes), `portals-triage-proposed-fixes.md`, `portals-apply-triage-fixes.py`, `sample-portals-50-v2.py`, `ats-adapters/_lib.mjs`, `ats-adapters/{workday-cxs,smartrecruiters,personio,recruitee,workable,greenhouse-cached,ashby-cached,lever-cached,run-all}.mjs`, `ats-adapters/README.md`.
- New (root): `package.json` (workspace for repo-root scripts).
- Modified: `career-ops/portals.yml` (42 disable/update edits), `career-ops/.gitignore` (firecrawl runtime artifacts), `.gitignore` (root node_modules + sample-50.yml).
- Untouched: `career-ops/scan.mjs` (D-3 invariant — git log empty since 2026-04-29).

**Watch out (for Codex pickup):**

- **P-5 fix is 1-line dedup but architecturally important.** Without it, Layer 1 reports false ambiguity for any company whose careers page links the same Workday tenant from multiple footer/header positions. Place the dedup BEFORE Levenshtein scoring in `resolveAmbiguous()` in `career-ops/firecrawl-discover.mjs`. Use `(provider, slug, host, site)` as identity tuple.
- **P-6 fix in PROVIDER_PATTERNS.greenhouse** — recommend updating regex to handle the `embed/job_board?for=<slug>` URL pattern. Pattern suggestion: `/boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([^/?#"'\s&]+)/i`. Verify with regression test in `test-firecrawl-discover.mjs`.
- **After P-5+P-6 fixes, re-run sample-50 smoke** before proceeding to Step 6. Estimated 50-100 credits.
- **Step 6 firecrawl-extract.mjs** uses JSON-mode (5 credits/page) on 20 no-ats-found companies. Expected ~100 credits. Should clear AC-2 by another 5-10 percentage points.
- **Cache schema legacy compat is permanent** per `.claude/memory/context.md` 2026-04-30 entry. Codex must NOT remove the legacy reading path in scripts/ats-adapters/_lib.mjs iterTargets.
- **Stale Workday cache entries with `site:"en-US"`** (custom-scraper.mjs's old bug) are skipped with re-discover warning at adapter time. Codex can run `node firecrawl-discover.mjs --force --company "SiFive"` etc to fix specific entries.
- **Sample-50 list is reproducible via seed=42** — same 50 companies every run.

### Task Receipt

Updates fanned out this task:
- `career-ops/portals.yml` ........ 42 edits via portals-apply-triage-fixes.py (commit aff12fc)
- `career-ops/lib/firecrawl.mjs` ........ NEW — SDK wrapper (8f25673)
- `career-ops/lib/ats-clients.mjs` ........ NEW — 8-provider direct-API library (68335e5) + safeEncode fix (8c4a443)
- `career-ops/lib/ats-detect.mjs` ........ NEW — single source of truth for URL detection (df51a68)
- `career-ops/firecrawl-discover.mjs` ........ NEW — Layer 1 ATS discovery (df51a68)
- `career-ops/test-firecrawl-wrapper.mjs` / `test-ats-clients.mjs` / `test-firecrawl-discover.mjs` ........ NEW tests (28 total tests passing across 3 files)
- `career-ops/.gitignore` ........ added firecrawl runtime artifacts
- `scripts/portals-url-triage.py` + `portals-apply-triage-fixes.py` + `portals-triage-proposed-fixes.md` + reports ........ NEW (Step 0)
- `scripts/sample-portals-50-v2.py` ........ NEW with ruamel.yaml comment preservation
- `scripts/ats-adapters/{workday-cxs,smartrecruiters,personio,recruitee,workable,greenhouse-cached,ashby-cached,lever-cached,run-all,_lib}.mjs` + README.md ........ NEW — 8 sibling adapters + orchestrator
- `package.json` (root) ........ NEW — workspace for repo-root scripts (js-yaml dep)
- `.gitignore` (root) ........ added node_modules + sample-50.yml
- `.claude/memory/state.md` ........ refreshed for Codex pickup
- `.claude/memory/decisions.md` ........ D-19 added (cached-discovery adapter pattern)
- `.claude/memory/pitfalls.md` ........ P-4/P-5/P-6 added
- `.claude/memory/context.md` ........ 2026-04-30 durable invariants (cache schema dual format, safeEncode pattern, sample-50 progression)
- `docs/STATUS.md` ........ Phase 2.8 implementation Steps 0-5 done block + revised Up Next + handoff note
- `docs/agents/claude.md` ........ this entry + Receipt

Missing / intentionally skipped:
- `career-ops/scan.mjs` ........ D-3 invariant (vendored upstream, untouched)
- `career-ops/firecrawl-extract.mjs` ........ Step 6 (Codex)
- `career-ops/enrich-jobs.mjs` ........ Step 7 refactor (Codex)
- `scripts/full-scan-orchestrator.mjs` ........ Step 8 (Codex)
- `data/firecrawl-cost.tsv`, `data/firecrawl-fallback-queue.tsv`, `data/ats-discovery-cache.json` ........ gitignored runtime artifacts; preserved on disk for Codex to inspect
- `.collab/INDEX.md` ........ being registered in this handoff turn
- `output/jobs-2026-04-30.xlsx` ........ gitignored; left on disk from Step 5 smoke for inspection

## 2026-04-30 — Steps 6-12 EXECUTED + 3 new bugs from inspection (P-7/P-8/P-9)

**Goal:** Continue Phase 2.8 execution (Steps 6-12) per user direction "skip handoff, proceed". Then fully inspect Step 5 results and prepare second handoff to Codex.

**Approach:**

1. P-5/P-6 fixes (commit `4371eee`): resolveAmbiguous candidate dedup + Greenhouse embed regex. Recovered 5 of 6 ambiguous companies.
2. Sample-50 re-validation (commit `66ac892`): 39/50 (78%) measured. AC-2 reported as cleared.
3. Step 6 — `firecrawl-extract.mjs` (commit `2e463b8`): JSON-mode Layer 2 extraction. Live Shopify test: 31 jobs in 1 call (5 credits). 3/3 tests pass. AC-5 grep clean.
4. Step 7 — `enrich-jobs.mjs` Firecrawl-first refactor (commit `1520bd1`): fetchFirecrawlMarkdown primary; HTTP/Playwright outage-only fallback. 19/19 existing tests still pass.
5. Step 8 — `full-scan-orchestrator.mjs` + npm wiring (commit `5294f7f`): orchestrator with --dry-run/--list + Layer 3 fallback fan-out. `npm run full-scan:list` outputs all 6 steps cleanly.
6. Step 11 — `acceptance-audit-phase2.8.py` (commit `28f72bb`): 9 PASS / 3 manual-pending / 0 FAIL. Re-runnable.
7. Step 12 — tag `scan-v2-prerescan` placed (commit `28f72bb`).
8. Final state update (commit `bc45b4e`).

9. **POST-IMPLEMENTATION INSPECTION** (this entry) — user requested fully inspecting results before second Codex handoff. Three new bugs surfaced:

   - **P-7 — iterTargets cache pollution.** Re-classifying sample-50: 3 direct-ATS + 27 discovered + 20 no-ats-found = 50 ✓. Only 30 had a routing path at smoke time. The 39/50 (78%) reading was inflated by past-run cache entries leaking into pipeline (iterTargets has no filter against current portals.yml's enabled list). **TRUE coverage at smoke time was at most 30/50 = 60% pre-Layer-2.** The 78% AC-2 measurement needs re-doing.

   - **P-8 — Layer 1 misses Ashby on JS-embed pages.** User flagged Ramp + Supabase as actually being on Ashby. Verified via curl: Ramp = 119 jobs, Supabase = 46 jobs on `api.ashbyhq.com/posting-api/job-board/{ramp,supabase}`. Layer 1 marked them no-ats-found. Likely cause: JS-embedded Ashby iframe loaded after Firecrawl's render OR an alternate URL form (`embed.ashbyhq.com`?) not in PROVIDER_PATTERNS.ashby.

   - **P-9 — Layer 2 should detect ATS in extracted job URLs.** Currently firecrawl-extract.mjs writes JSON-mode results straight to pipeline.md without checking whether `jobs[].url` values reveal a known ATS. Self-correcting fix: detectAllInText on extracted URLs; if single ATS found, promote cache entry from no-ats-found → discovered. Defense-in-depth with P-8.

**Files touched (this entire post-Step-5 block):**

- New (career-ops/): `firecrawl-extract.mjs`, `test-firecrawl-extract.mjs`
- Modified (career-ops/): `firecrawl-discover.mjs` (P-5), `lib/ats-detect.mjs` (P-6), `lib/ats-clients.mjs` (P-4 safeEncode), `enrich-jobs.mjs` (Firecrawl-first), `package.json` (npm scripts)
- New (scripts/): `full-scan-orchestrator.mjs`, `acceptance-audit-phase2.8.py`
- New (career-ops/data/): `firecrawl-plan-caps.tsv.template`
- Updated framework: `.claude/memory/{state,pitfalls}.md`, `docs/STATUS.md`, `.collab/INDEX.md`

**Watch out (for Codex pickup):**

- **AC-2 reading is inflated by P-7.** Fix P-7 first, re-run sample-50, get true number.
- **P-8 high impact** — Ramp/Supabase alone recoverable; likely lifts 10+ of the 20 no-ats-found if pattern is general.
- **P-9 makes the system self-correcting** — even if Layer 1 stays imperfect, Layer 2 catches and remembers.
- **All Phase 2.8 IMPLEMENTATION CODE is in place** — Codex's job is bug fixes + measurement, not greenfield building.
- **`firecrawl-plan-caps.tsv` template** at `career-ops/data/firecrawl-plan-caps.tsv.template` — USER must fill from firecrawl.dev/dashboard for AC-10.
- **Step 10 full sample-50 with enrich** is ~1500 credits — needs USER authorization before Codex runs.

### Task Receipt

Updates fanned out this task:
- `career-ops/firecrawl-extract.mjs` + `test-firecrawl-extract.mjs` ........ NEW (Step 6, 2e463b8)
- `career-ops/firecrawl-discover.mjs` ........ P-5 dedup (4371eee)
- `career-ops/lib/ats-detect.mjs` ........ P-6 embed regex (4371eee)
- `career-ops/lib/ats-clients.mjs` ........ P-4 safeEncode (8c4a443)
- `career-ops/enrich-jobs.mjs` ........ Firecrawl-first (1520bd1)
- `career-ops/package.json` ........ orchestrator + npm scripts (5294f7f)
- `scripts/full-scan-orchestrator.mjs` ........ NEW (Step 8, 5294f7f)
- `scripts/acceptance-audit-phase2.8.py` ........ NEW (Step 11, 28f72bb)
- `career-ops/data/firecrawl-plan-caps.tsv.template` ........ NEW user-action template
- `.claude/memory/state.md` + `pitfalls.md` ........ P-7/P-8/P-9 added; state for second Codex handoff
- `docs/STATUS.md` ........ updated handoff note
- `docs/agents/claude.md` ........ this entry + Receipt
- Tag `scan-v2-prerescan` placed at commit 28f72bb

Missing / intentionally skipped:
- `career-ops/scan.mjs` ........ D-3 invariant preserved
- `.codex/memory/*`, `docs/agents/codex.md` ........ Codex's own files
- AC-3 + AC-10 + AC-11b ........ require Codex action + USER Step 9 + Step 10
- True coverage measurement ........ awaits Codex P-7 fix + re-run

## 2026-04-30 — Caught up on Codex's Phase 2.8 closure pass; reconciled Claude memory; preparing for full 397 rescan

**Goal:** Take the baton on Codex handoff `20260430-215447-c74d`. Verify Codex's reconciliation analytically (per user direction "be critical and analytical"), then bring Claude-owned memory in line with current truth. Prepare the bench for the full 397-company clean rescan.

**What I read (catchup):** `AGENTS.md`, `AI_AGENTS.md`, `.claude/CLAUDE.md`, `.collab/{INDEX,ROUTING,PROTOCOL}.md`, `.claude/memory/state.md`, `docs/STATUS.md`, `AI_HANDOFF.md`, `RESUME_PROMPT.md`, the three Step 10 audit artifacts (`docs/audits/2026-04-30-{step10-sample50-results.md, step10-sample50-metrics.json, sample50-missed-company-classification.md}`), latest `docs/agents/codex.md` entries (six entries spanning P-7/P-8/P-9 fixes, Step 0 re-audit, baseline reconciliation, Step 9/10 verification, AC-2 redefinition, handoff packaging), and `scripts/acceptance-audit-phase2.8.py` source.

**Independent verification done before accepting Codex's reconciliation:**
- Parsed `career-ops/portals.yml`: 448 total / 397 enabled / 51 disabled / 0 disabled-without-note. **Matches** Codex's claimed baseline.
- `git log --oneline -- career-ops/scan.mjs` shows only `b8e47c6 init: project scaffold...`. **D-3 invariant intact.**
- AC-5 grep for `/v1/extract|extractorOptions|extractionSchema` in active `.mjs` code: only one comment-line hit (`career-ops/lib/firecrawl.mjs:275: * Costs 5 credits/page (1 base + 4 surcharge). NOT /v1/extract.`). **Clean.**
- Re-ran `python scripts/acceptance-audit-phase2.8.py`: **12 PASS / 0 FAIL / 0 pending**, matching Codex's reported state.
- Audit script logic review: AC-2 reads `step10.get("ac2_source_accounting_pass")` from the metrics JSON. Codex's gate flags are `ac2_source_accounting_pass=true`, `ac2_source_health_pass=true`, `ac2_miss_classification_pass=true`. The gates are health ≥90% (got 97.4%) and miss classification ≥95% (got 100%). Internally consistent.
- Step 10 metrics arithmetic: 28 exported + 8 NO_RELEVANT_JOBS + 1 NO_OPEN_JOBS + 1 SOURCE_BROKEN = 38 source-resolved; 12 ROUTE_MISSING = 50 − 38; 28 + 22 no-yield = 50 sample. Internally consistent.
- Picked up Codex's open handoff `20260430-215447-c74d` at 2026-04-30T22:11:42-04:00 via `collab-handoff.sh pickup`.

**What I changed (memory reconciliation):**

1. **`.claude/memory/state.md`** — full rewrite. Active task now reflects Codex's closure pass, AC-2 redefinition, and the upcoming full-rescan gate. Stale "P-7/P-8/P-9 pending for Codex" / "Step 9 + Step 10 USER GATES still pending" content fully removed; superseded by completed entries with handoff IDs and audit cross-references. Open Questions reduced to current ones (rescan authorization; Layer-1 enhancement experiment timing; full-run audit naming).

2. **`.claude/memory/context.md`** — appended a new dated entry (2026-04-30T22:11:51-04:00) capturing six Phase 2.8 closure invariants: (i) current 448/397/51 baseline + 9 restored false disables; (ii) AC-2 redefinition stack with gates + buckets; (iii) AC-3 has TWO interpretations and only the GENERIC one is the gate; (iv) Step 10 transactional pattern is for sample runs only, not full rescans; (v) P-7/P-8/P-9 are FIXED in code (with what fixed each); (vi) TRUE Phase 2.8 sample-50 numbers (28/50 exported, 38/50 source-resolved); (vii) Seagate Workday CXS HTTP 422 is permanent SOURCE_BROKEN warning. Inline-superseded the prior "Expected after P-5/P-6 / Step 6 Layer 2: 41-48/50" projection bullet with strikethrough + actuals. Updated the Phase 2.8 credit budget bullet with combined Phase 2.8 spend (~700 credits) and remaining (100,401) per Step 9 dashboard.

3. **`.claude/memory/decisions.md`** — appended **D-20** documenting the formal acceptance of Codex's AC-2 redefinition. Records: (i) why I verified before accepting (per user "be critical" direction); (ii) what I checked independently; (iii) the four-bucket miss model; (iv) the two pass/fail gates (source health ≥90%, miss classification ≥95%); (v) tradeoffs (relevant yield is report-only; gates depend on classifier discipline); (vi) cross-references to Codex's D-9, the audit artifact, the audit script, design v2 + implementation v2 supersession notes. Frontmatter timestamp bumped.

4. **`.claude/memory/pitfalls.md`** — added **`**Status:** RESOLVED 2026-04-30 by Codex`** markers to P-7, P-8, P-9 with one-line summaries of what fixed each + regression-test pointers. Kept the Symptom/Root cause text intact for historical "why does the code do this?" lookups. Frontmatter timestamp bumped.

5. **This work log entry** — appended (this entry + Receipt below).

**Files touched:**
- Modified: `.claude/memory/state.md` (full section rewrite); `.claude/memory/context.md` (new entry + supersession edits); `.claude/memory/decisions.md` (D-20 + frontmatter); `.claude/memory/pitfalls.md` (resolved markers + frontmatter); `docs/agents/claude.md` (this entry); `.collab/INDEX.md` (timestamp bumps for the four memory files + claude work log — handled below).
- Untouched: all `career-ops/*` config and code (Codex's uncommitted Phase 2.8 follow-up changes carried in working tree as-is); `.codex/memory/*`, `docs/agents/codex.md` (Codex's own files, cross-agent courtesy); `AI_AGENTS.md`, `docs/STATUS.md`, audit artifacts, design/implementation plans, scripts (Codex already brought these into alignment in the handoff packaging pass).

**Watch out:**
- The full 397-company rescan is the next gate, but it's USER-GATED. Do NOT start it without explicit "go" — the run is non-transactional (writes to live `pipeline.md` / `scan-history.tsv` / `applications.md` / output workbook), and the cost is ~3,000 Firecrawl credits (extrapolating Step 10's 383 / 50 × 397). Budget remains 100,401 so it fits, but ask first.
- The acceptance audit gates are now source health (≥90%) and miss classification (≥95%). Anyone reading the old design v2 §7 wording must follow the supersession note to `docs/audits/2026-04-30-sample50-missed-company-classification.md`. Do NOT reinstate the old `>=75% companies produce jobs` AC-2 gate.
- AC-3 has two valid interpretations. The gate uses generic `location_raw OR comp ≥ 40%`. The narrow Will-fit `location_match` (Toronto/GTA/Ontario, Canada-only, fully remote US) is for scoring, NOT for measuring extraction quality. Future rescans must report both but gate on the generic.
- Seagate Workday CXS HTTP 422 will surface again on the full rescan. Treat as a source-health warning in the report, NOT a stop condition. Do not auto-disable Seagate without separate user direction.
- Working tree carries 28+ uncommitted modifications (Codex's Phase 2.8 follow-up + my memory reconciliation edits). User has not asked for a commit; commits remain user-gated per `.collab/PROTOCOL.md` cadence rule.

### Task Receipt

Updates fanned out this task:
- `.claude/memory/state.md` ........ full rewrite — current state reflects post-AC-2-redefinition truth + next-step is full 397 rescan
- `.claude/memory/context.md` ........ added 2026-04-30T22:11 entry (Phase 2.8 closure invariants); superseded stale projection bullet inline; updated credit budget bullet with actuals
- `.claude/memory/decisions.md` ........ added D-20 (formal acceptance of Codex's AC-2 redefinition with independent verification)
- `.claude/memory/pitfalls.md` ........ added RESOLVED markers to P-7/P-8/P-9 with what-fixed-each summaries + regression-test pointers
- `docs/agents/claude.md` ........ this entry + Receipt
- `.collab/INDEX.md` ........ timestamps bumped for the four memory files + claude work log
- handoff `20260430-215447-c74d` ........ picked up via collab-handoff.sh pickup; will close after full-rescan acceptance

Missing / intentionally skipped:
- `career-ops/*` ........ no config or code edits this turn; D-3 invariant preserved.
- `docs/STATUS.md` ........ Codex already brought it to current truth in the handoff packaging pass; no Claude-side delta to add until the full rescan completes.
- `AI_AGENTS.md` ........ Codex already updated the canonical baseline (448/397/51) in the reconciliation pass; no Claude-side delta needed.
- `docs/agents/codex.md`, `.codex/memory/*` ........ Codex-owned files; not modified per cross-agent courtesy.
- No new handoff written ........ this turn closes the catchup, not a substantive chunk worth handing off; next handoff opens after the full rescan completes (return to Codex for full-run analysis review).
- No commit made ........ user has not asked for one; Codex's working-tree edits + my memory reconciliation will land in the same commit when authorized.
- `scripts/sample-50-list.yml` ........ untracked Codex artifact from Step 10 sampling; left in place per "do not delete unfamiliar files without investigating" rule.

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

<!-- collab:handoff:start id=20260429-001531-cb9a -->
## Handoff → codex

- **handoff-id:** `20260429-001531-cb9a`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/multi-agent-collab
- **at:** 2026-04-29T00:15:31-04:00
- **status:** closed
- **picked-up:** 2026-04-29T00:22:19-04:00 by codex

### What I did
Implementation plan ready for review at docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md. This plan executes the v2 design plan you reviewed earlier (handoff 20260428-221522-bc38, your review at design plan §17, integrated into v2 with all 5 fixes per commit 781fba1). The implementation plan has 20 sections covering 11 ordered steps with verification gates, atomic commits, explicit rollback per step, and ~5h estimated wall-clock. PLEASE REVIEW against the §18 reviewer checklist. Particularly: (1) verify Step 1 portals.yml note prefixes match design §4.1 exactly, (2) verify Step 2 title_filter changes match design §4.4 + §6.2 (no new keywords introduced), (3) verify Step 6 enrich-jobs.mjs spec matches design §10 (cache schema, fetch policy, signal extraction), (4) verify Step 7 export-jobs.mjs refactor matches design §11 (column order, sort, banding, formatting), (5) flag any place where the plan defers a decision the design plan should have answered. Surface issues in §20 Implementation Plan Review Comments inside the implementation plan, OR write a return handoff back to claude. No career-ops/* config or code files should be touched during your review — read-only inspection. After your review, claude either integrates fixes (producing implementation plan v2) or proceeds to Step 1 execution per user direction.

### Files touched
docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md .claude/memory/decisions.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-164715-2bcf -->
## Handoff → codex

- **handoff-id:** `20260429-164715-2bcf`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/multi-agent-collab
- **at:** 2026-04-29T16:47:15-04:00
- **status:** closed
- **picked-up:** 2026-04-29T17:24:38-04:00 by codex

### What I did
Phase 2.8 Firecrawl-pivot design ready for review. Three coupled artifacts on feat/multi-agent-collab: (1) docs/plans/2026-04-29-firecrawl-pivot-design.md — 4-layer architecture (Layer 0 direct-API in scan.mjs untouched + 5 new sibling adapters; Layer 1 firecrawl-discover; Layer 2 firecrawl-extract; Layer 3 custom-scraper fallback), 5 risks, 9 acceptance criteria; (2) docs/plans/2026-04-29-firecrawl-pivot-decisions.md — resolutions to Q-FC-1..Q-FC-4; (3) docs/design/2026-04-29-firecrawl-ats-verification.md — forked-agent verification of 12 baseline-knowledge claims against primary sources, surfaced 3 architecture corrections (Workday CXS API exists, JSON-mode is 5cr/page not 1, /v1/scrape with formats:html,links not /v1/map for ATS discovery) + 5 newly-verified no-auth ATSes (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable). Decisions D-14, D-15, D-16 recorded. INDEX registers all 3 docs. No career-ops/* config or code touched. PLEASE REVIEW: (a) verify the design plan architecture fully integrates the verification doc's 3 corrections + 5 newly-verified ATSes; (b) check D-14/D-15 rationale against verification doc; (c) flag any place the design plan still asserts a baseline-knowledge claim that verification proved wrong; (d) review the 4 Q-FC resolutions for corner cases; (e) flag any architecture risk verification surfaced that we haven't addressed (Firecrawl per-plan rate caps, JazzHR unverifiable, /v1/extract migrating to /agent). Surface issues inline as Review Comments section, OR write a return handoff back to claude. After your review is integrated, claude writes the Phase 2.8 implementation plan.

### Files touched
docs/plans/2026-04-29-firecrawl-pivot-design.md docs/plans/2026-04-29-firecrawl-pivot-decisions.md docs/design/2026-04-29-firecrawl-ats-verification.md .claude/memory/decisions.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-183239-0925 -->
## Handoff → codex

- **handoff-id:** `20260429-183239-0925`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-29T18:32:39-04:00
- **status:** closed
- **picked-up:** 2026-04-29T18:34:57-04:00 by codex

### What I did
Phase 2.8 implementation plan ready for review at docs/plans/2026-04-29-firecrawl-pivot-implementation.md on feat/phase-2.8-firecrawl (branched from main; main has Phase 2.7 + 2.8 design v2 already merged via commit 39bac3d). Plan executes design plan v2 (commit 73f6b2a, your prior review integrated as v2). 12 sections covering 12 ordered steps with per-step verification gates, atomic commits, explicit rollback, manual gates at Steps 0/5/9/10. ~5h estimated wall-clock. PLEASE REVIEW against the §10 reviewer checklist. Particularly: (1) Step 0 portals.yml URL triage script bucket logic + manual-gate framing; (2) Step 1 lib/firecrawl.mjs SDK shape — verify NO /v1/extract or legacy schema keys exposed (AC-5); (3) Step 2 lib/ats-clients.mjs duplication-vs-extraction approach for Greenhouse/Ashby/Lever (D-3 invariant); (4) Step 3 5 sibling adapters spec — confirm scripts/ats-adapters/ location preserves D-3 (career-ops/ vendored upstream); (5) Step 7 enrich-jobs.mjs refactor preserves pure Firecrawl-first per Q-FC-4 (HTTP fallback must be outage-resilience only, NOT cost-routing); (6) §7 AC mapping covers all 11 design v2 ACs; (7) §8 implementation risks (RI-1..RI-8) sufficient; (8) §9 deferred decisions (QI-1..QI-5) recommendations sound. Surface issues inline as §12 Implementation Plan Review Comments OR via return handoff. After your review is integrated, claude proceeds to Step 0 execution. No career-ops/* config or code edits during review — read-only inspection.

### Files touched
docs/plans/2026-04-29-firecrawl-pivot-implementation.md docs/plans/2026-04-29-firecrawl-pivot-design.md docs/plans/2026-04-29-firecrawl-pivot-decisions.md docs/design/2026-04-29-firecrawl-ats-verification.md .claude/memory/decisions.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-232409-dfdd -->
## Handoff → codex

- **handoff-id:** `20260429-232409-dfdd`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-29T23:24:09-04:00
- **status:** open

### What I did
Phase 2.8 implementation Steps 0-5 EXECUTED on feat/phase-2.8-firecrawl + Jasper safeEncode bug fix. Sample-50 smoke achieved 37/50 (74%) coverage = +2.85x baseline. 161 Firecrawl credits used (0.16% of 101k). Working tree clean, live state restored. Latest commit: 8c4a443. PICK UP at Step 5 inspection: 3 bugs surfaced. P-4 URL double-encoding FIXED (8c4a443). P-5 candidate dedup needed in firecrawl-discover.mjs resolveAmbiguous (recovers 4 of 6 ambiguous = Cadence/F5/Monolithic/Tokyo Electron → 41/50=82% AC-2). P-6 Greenhouse 'embed' synthetic slug filter in lib/ats-detect.mjs PROVIDER_PATTERNS.greenhouse (recovers Vectra AI/Zipline). After fixes re-run sample-50 smoke (~50-100 credits). Then Steps 6 (firecrawl-extract Layer 2 ~100cr), 7 (enrich-jobs Firecrawl-first refactor), 8 (full-scan-orchestrator.mjs + npm wiring), 9 USER GATE (Firecrawl dashboard rate-cap), 10 sample-50 verification, 11 acceptance audit, 12 tag scan-v2-prerescan. State + decisions (D-19) + pitfalls (P-4/P-5/P-6) + context (cache schema dual format) all updated. Cwd convention per impl plan §0a: career-ops/ unless ../scripts/ prefix. D-3 invariant: scan.mjs untouched (verify with git log).

### Files touched
career-ops/lib/firecrawl.mjs career-ops/lib/ats-clients.mjs career-ops/lib/ats-detect.mjs career-ops/firecrawl-discover.mjs scripts/ats-adapters/_lib.mjs docs/plans/2026-04-29-firecrawl-pivot-implementation.md .claude/memory/state.md .claude/memory/decisions.md .claude/memory/pitfalls.md .claude/memory/context.md docs/STATUS.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260430-104400-aa3d -->
## Handoff → codex

- **handoff-id:** `20260430-104400-aa3d`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-30T10:44:00-04:00
- **status:** closed
- **picked-up:** 2026-04-30T10:56:56-04:00 by codex

### What I did
Phase 2.8 implementation Steps 0-12 ALL CODE-COMPLETE on feat/phase-2.8-firecrawl + scan-v2-prerescan tag. Acceptance audit: 9 PASS / 3 manual-pending / 0 FAIL. POST-INSPECTION SURFACED 3 NEW BUGS (full details + fix recipes in .claude/memory/pitfalls.md): P-7 iterTargets cache pollution (inflated 39/50=78% reading; TRUE coverage is 30/50=60% pre-Layer-2 because cached-discovery adapters walk entire data/ats-discovery-cache.json with no filter against current portals.yml's enabled list). P-8 Layer 1 misses Ashby on JS-embed pages — user-confirmed Ramp (119 jobs) + Supabase (46 jobs) on api.ashbyhq.com/posting-api/job-board/{ramp,supabase} but Layer 1 marked them no-ats-found. P-9 Layer 2 firecrawl-extract.mjs should detect ATS in extracted jobs[].url values and promote no-ats-found → discovered (self-correcting). PRIORITY ORDER: (a) fix P-7 iterTargets filter in scripts/ats-adapters/_lib.mjs (~5 lines + unit test); (b) diagnose P-8 — scrape Ramp+Supabase with actions:[{wait:5000ms}] and inspect for ashbyhq.com markers, possibly expand PROVIDER_PATTERNS.ashby for embed.ashbyhq.com / assets.ashbyhq.com; (c) implement P-9 in firecrawl-extract.mjs ~15 lines; (d) re-run sample-50 smoke for TRUE coverage measurement (~50-100 credits). USER GATES still pending: Step 9 firecrawl-plan-caps.tsv (template at career-ops/data/firecrawl-plan-caps.tsv.template) + Step 10 full sample-50 with enrich (~1500 credits). All Phase 2.8 implementation code is in place — Codex job is bug fixes + measurement, not greenfield. Branch tip bc45b4e + 1 more commit pending for this handoff. ~290 Firecrawl credits used; 100,710 remaining.

### Files touched
career-ops/firecrawl-discover.mjs career-ops/firecrawl-extract.mjs career-ops/lib/ats-detect.mjs career-ops/lib/ats-clients.mjs career-ops/enrich-jobs.mjs scripts/ats-adapters/_lib.mjs scripts/full-scan-orchestrator.mjs scripts/acceptance-audit-phase2.8.py .claude/memory/pitfalls.md .claude/memory/state.md docs/STATUS.md career-ops/data/firecrawl-plan-caps.tsv.template

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->
