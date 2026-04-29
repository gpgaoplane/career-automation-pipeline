---
status: active
type: pitfalls
owner: codex
last-updated: 2026-04-28T22:32:14-04:00
read-if: "you are touching an area Codex has flagged before"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Pitfalls

Append new pitfalls below. Format:

```
## P-<n> — <title> — <ISO-8601>
**Symptom:**
**Root cause:**
**Workaround:**
**Regression test:**
```

<!-- section:entries:start -->
## P-1 — Use Git Bash path for collab scripts on this Windows setup — 2026-04-28T22:32:14-04:00
**Symptom:** Running `bash ~/.claude/skills/multi-agent-collab/scripts/collab-catchup.sh ...` from PowerShell failed first with a Bash service access error, then with `/home/dalamula-test/.claude/...: No such file or directory`.
**Root cause:** The `bash` executable on PATH did not resolve to the Windows Git Bash environment/user home expected by the framework instructions.
**Workaround:** Invoke Git Bash explicitly: `& 'C:\Program Files\Git\bin\bash.exe' 'C:/Users/PC/.claude/skills/multi-agent-collab/scripts/<script>.sh' ...`.
**Regression test:** `collab-catchup.sh preview --agent codex --handoff`, `collab-handoff.sh pickup`, `collab-handoff.sh close`, and `collab-now.sh` all succeeded via the explicit Git Bash path.
<!-- section:entries:end -->
