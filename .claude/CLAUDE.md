---
status: active
type: adapter
owner: claude
last-updated: 2026-04-22T00:00:00-05:00
read-if: "you are Claude starting work in this repo"
skip-if: "never"
---

# Claude — Project Adapter

## First read

Read `AI_AGENTS.md` at the repo root before starting any work session. It covers project state, multi-agent rules, and shared onboarding.

## Your files

- Memory: `.claude/memory/`
- Work log: `docs/agents/claude.md`

## Platform-specific notes

<!-- collab:platform-notes:start -->
- Claude Code auto-discovers: `~/.claude/CLAUDE.md` (global), `<project>/CLAUDE.md` (root), `<project>/.claude/rules/*.md`, `<project>/CLAUDE.local.md`. NOT `<project>/.claude/CLAUDE.md` directly — root `CLAUDE.md` imports this file via `@.claude/CLAUDE.md`.
- Slash commands: `/scf:wrap-up`, `/scf:learn-rule`, `/explore`, `/progress`. Custom commands live in `~/.claude/commands/`.
- Global memory at `~/.claude/memory/` is for cross-project preferences. In-repo memory at `.claude/memory/` is project-specific. Do not cross-contaminate.
- Auto-memory at `~/.claude/projects/D--Projects-career-ops/memory/` persists across conversations and is separate from in-repo memory. Use it for tool failures and machine-local corrections.
<!-- collab:platform-notes:end -->

## Handoff and pickup

When Claude finishes a handoff-worthy chunk (e.g., branch complete, major refactor done, cross-cutting change that needs review), write a handoff block:

```
./scripts/collab-handoff.sh <to-agent> --from claude --message "..." --files "a b c"
```

When the user says "take the baton" or "pick up handoff," run:

```
./scripts/collab-catchup.sh preview --agent claude --handoff
```

…and follow the instructions in the surfaced handoff block. After validation, close the handoff:

```
./scripts/collab-handoff.sh close <id> --from claude
```

---

## Claude-Specific Operational Guidance

> Outside framework markers — preserved on re-init. Claude-only conventions, file staleness checks, and wrap-up checklist for this project.

### File Staleness Protocol

Every file in this project falls into one of four categories:

**1. Framework-managed marker sections** — staleness governed by re-init (rewritten from template). Edits inside markers are lost. Edits outside markers persist.

**2. Routing-table files** — staleness governed by the project routing matrix in `AI_AGENTS.md` Project Context. When a domain decision changes, update the listed file immediately, not at wrap-up.

**3. Structural files** — go stale when project shape changes. Check at every `/scf:wrap-up`:

| File | Goes stale when |
|------|----------------|
| `AI_AGENTS.md` Project Context | Directory layout changes, new commands added, pipeline diagram changes, new files created |
| `.claude/memory/decisions.md` | Any new architectural decision made |
| `.claude/memory/pitfalls.md` | New recurring bug, gotcha, or workaround discovered |
| `.claude/memory/context.md` | New durable invariant or project truth surfaces |
| `.claude/memory/state.md` | Branch, active task, pause point, blockers, or next steps change |
| `docs/agents/claude.md` | Every substantive task — append a Receipt-bearing entry |
| `docs/STATUS.md` | Every session — always update at wrap-up |

**4. Ephemeral files** — consumed, not updated. Plans in `docs/plans/` describe future work; once executed they become historical record. Do not update them — they are correct as written at the time of planning.

**5. User-maintained files** — Claude does not update these. `CLAUDE.local.md` is the user's.

### Wrap-up Checklist

Run `/scf:wrap-up` at session end. Before closing, explicitly check:

- [ ] Did any domain decision change? → update the routing-table file for that domain
- [ ] Did directory structure change? → update `AI_AGENTS.md` Project Context layout section
- [ ] Did new commands get added? → update `AI_AGENTS.md` Commands section
- [ ] Did pipeline architecture change? → update `AI_AGENTS.md` Pipeline Architecture diagram
- [ ] Were architectural decisions made? → append entries to `.claude/memory/decisions.md`
- [ ] New pitfalls? → append to `.claude/memory/pitfalls.md`
- [ ] New durable truths? → append to `.claude/memory/context.md`
- [ ] State changed? → overwrite affected sections in `.claude/memory/state.md`
- [ ] Append new entry with Receipt to `docs/agents/claude.md`
- [ ] Update `docs/STATUS.md` handoff note

### Memory Architecture (Claude's view)

| Layer | File | What goes here |
|-------|------|---------------|
| In-repo collab memory | `.claude/memory/{state,context,decisions,pitfalls}.md` | Framework's core-five — agent-owned, free-edit, no markers |
| Outward-facing work log | `docs/agents/claude.md` | Per-task Receipts, visible to other agents (Codex reads this) |
| Enforced rules | `.claude/rules/architecture.md`, `.claude/rules/pipeline.md` | Project rules confirmed 2+ times — auto-loaded by Claude Code |
| Design rationale | `docs/design/` | Durable technical decisions with full reasoning (e.g. `scraping-architecture.md`) |
| Machine-local | `~/.claude/projects/D--Projects-career-ops/memory/` | Tool failures, machine-specific corrections, cross-conversation auto-memory |
| Pre-collab archive | `.claude/archive/` | Historical project memory snapshots (read-only reference) |

Write routing:
- New architectural decision → `.claude/memory/decisions.md` + `docs/design/` if substantial
- New durable truth → `.claude/memory/context.md`
- New pitfall → `.claude/memory/pitfalls.md`
- State changed → `.claude/memory/state.md`
- Correction repeated 2+ times → promote to `.claude/rules/`
- Cross-project pattern → `~/.claude/memory/MEMORY.md`
- Use `/scf:learn-rule` to route corrections immediately

### Claude Code Native Memory vs Framework Memory

These are two separate memory systems that coexist:

1. **Claude Code native:** `~/.claude/CLAUDE.md`, `<project>/CLAUDE.md`, `.claude/rules/*.md`, `CLAUDE.local.md`, `~/.claude/projects/.../memory/`. Auto-loaded at session start. Owned by Claude Code, not the framework.
2. **Multi-agent-collab:** `AI_AGENTS.md`, `.claude/memory/*.md`, `docs/agents/claude.md`, `.collab/*.md`. Read explicitly per the framework's Onboarding Checklist. Visible to other agents (Codex, etc.) via the shared contract.

When in doubt: project-specific operational rules → native (`.claude/rules/`). Cross-agent visibility → framework (`.claude/memory/` + work log).