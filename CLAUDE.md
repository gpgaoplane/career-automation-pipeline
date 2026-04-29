# Project Instructions

This repo uses the [`multi-agent-collab`](https://github.com/gpgaoplane/multi-agent-collab) framework (v0.4.1, skill drop-in at `~/.claude/skills/multi-agent-collab`) so Claude and Codex can collaborate as equal-partner agents.

**Single source of truth lives in two files** — both are loaded below via Claude Code's `@import` syntax:

@AI_AGENTS.md
@.claude/CLAUDE.md

If the imports above fail to resolve in your Claude Code version, read both files explicitly:
- `AI_AGENTS.md` — shared contract every agent reads (project context, routing, behavioral rules)
- `.claude/CLAUDE.md` — Claude-specific platform overlay (file staleness, wrap-up checklist, memory architecture)
- `.collab/INDEX.md`, `.collab/ROUTING.md`, `.collab/PROTOCOL.md` — framework registry, fan-out matrix, end-of-task Receipt protocol

## Web research (project rule, added 2026-04-29)

Before running web searches or fetching online resources, briefly state what you plan to search for and what question it answers, then wait for explicit user signal to proceed. Do NOT search autonomously even if the question seems to require external info.

Exception: if the user explicitly says "feel free to search", "go ahead and look that up", "search online" — or similar — in the same turn, that is the signal; proceed without re-asking.
