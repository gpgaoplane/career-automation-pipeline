---
status: active
type: pitfalls
owner: gemini
last-updated: 2026-05-03T20:06:00-04:00
read-if: "you are touching an area Gemini has flagged before"
skip-if: "status != active or last-updated <= your watermark"
---

# Gemini — Pitfalls

Append new pitfalls below. Format:

```
## P-<n> — <title> — <ISO-8601>
**Symptom:**
**Root cause:**
**Workaround:**
**Regression test:**
```

<!-- section:entries:start -->

## P-1 — collab-init.sh path resolution on Windows — 2026-05-03T20:06:00-04:00

**Symptom:** `bash ./scripts/collab-init.sh --join gemini` fails with `No such file or directory`. Also `bash "C:\Users\PC\..."` fails because bash mangles Windows backslash paths.
**Root cause:** The `collab-*.sh` scripts live in the skill directory (`C:\Users\PC\.claude\skills\multi-agent-collab\scripts\`), not in the repo's `scripts/` folder. Additionally, MSYS2/Git Bash does not accept raw Windows paths with backslashes, and the `/c/Users/...` POSIX path also failed.
**Workaround:** Use PowerShell `&` operator to invoke Git Bash with forward-slash Windows paths: `& 'C:\Program Files\Git\bin\bash.exe' 'C:/Users/PC/.claude/skills/multi-agent-collab/scripts/collab-init.sh' --join gemini`
**Regression test:** N/A — environmental. Document for future Gemini sessions.

## P-2 — Substring title filter false positives — 2026-05-03T20:06:00-04:00

**Symptom:** `RAG` matches `Storage`, `Technical Account` matches `Technical Accounting`, `AI` can match arbitrary words containing "ai".
**Root cause:** Current `buildTitleFilter` uses `string.includes()` without word-boundary checks. The production filter refinement design (§5.2) proposes safe phrase matching to fix this.
**Workaround:** None deployed yet. Documented in `docs/plans/2026-05-03-production-filter-refinement-design.md` §5.2 as required bug fixes.
**Regression test:** Listed in design §10 as required offline fixtures.

<!-- section:entries:end -->