---
status: active
type: work-log
owner: claude
last-updated: 2026-04-28T18:54:45-04:00
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

## Handoff blocks

When you finish a substantive chunk of work and want another agent to take over,
run `collab-handoff <to-agent>`. It appends a structured block at the end of this
log with a stable id, what you did, files touched, and the branch state. See
`docs/handoff-schema.md` for the full format.

When the work log exceeds `rotate_at_lines` (default 300, see `.collab/config.yml`),
run `./scripts/collab-rotate-log.sh claude` to archive older entries.
Receipts and open handoff blocks are preserved; archived entries collapse to
one-line summaries in the archived-summary marker block above.