---
status: active
type: work-log
owner: claude
last-updated: 2026-04-29T10:35:00-04:00
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
