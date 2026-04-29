---
status: active
type: adapter
owner: codex
last-updated: 2026-04-22T00:00:00-05:00
read-if: "you are Codex starting work in this repo"
skip-if: "never"
---

# Codex — Project Adapter

## First read

Read `AI_AGENTS.md` at the repo root before starting any work session. It covers project state, multi-agent rules, and shared onboarding.

## Your files

- Memory: `.codex/memory/`
- Work log: `docs/agents/codex.md`

## Platform-specific notes

<!-- collab:platform-notes:start -->
Add platform-specific pointers here (hook locations, slash commands, global vs project memory separation, etc.).
<!-- collab:platform-notes:end -->

## Handoff and pickup

When Codex finishes a handoff-worthy chunk (e.g., branch complete, major refactor done, cross-cutting change that needs review), write a handoff block:

```
./scripts/collab-handoff.sh <to-agent> --from codex --message "..." --files "a b c"
```

When the user says "take the baton" or "pick up handoff," run:

```
./scripts/collab-catchup.sh preview --agent codex --handoff
```

…and follow the instructions in the surfaced handoff block. After validation, close the handoff:

```
./scripts/collab-handoff.sh close <id> --from codex
```