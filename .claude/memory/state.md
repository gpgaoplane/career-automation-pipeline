---
status: active
type: state
owner: claude
last-updated: 2026-04-28T18:54:45-04:00
read-if: "you need to know Claude's current live work state"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude — Live State

<!-- section:current-state:start -->
**Branch:** `feat/multi-agent-collab`
**Active task:** Migrating to multi-agent-collab v0.4.1 framework — content migration phase
**Pause point:** Framework installed (commit pending), content migrated from `.claude/project-memory.md` and root `CLAUDE.md` into framework memory + AI_AGENTS.md Project Context. Awaiting verification + commit.
**Blockers:** None
<!-- section:current-state:end -->

<!-- section:next-steps:start -->
1. Verify migration with `collab-check` and spot-checks
2. Test root `CLAUDE.md` `@import` shim by reading on next session start
3. Commit migration as one logical change on `feat/multi-agent-collab`
4. Merge to `main` (or hold for review)
5. **Resume Phase 2 deferred work — clean rescan:**
   - Tag `scan-v1-unfiltered` on commit `06bf430` to preserve the first run for filter comparison
   - Reset `career-ops/data/pipeline.md` (empty headers `## Pendientes` / `## Procesadas`)
   - Reset `career-ops/data/scan-history.tsv` (header row only)
   - Run `node scan.mjs` from `career-ops/` (~13 direct ATS companies)
   - Run `node custom-scraper.mjs` (403 branded pages — Tier 1/2 discovers hidden ATS for ~100+)
   - Re-run `node export-jobs.mjs` for clean Excel output
6. Audit empty-result companies post-rescan for landing-page URL issues (P-1)
7. Phase 3 — open xlsx, identify high-priority roles, run `/career-ops pipeline` for LLM-based scoring
8. Codex onboarding deferred — user will explicitly trigger via `bash ~/.claude/skills/multi-agent-collab/scripts/collab-init.sh --join codex` from a Codex session
<!-- section:next-steps:end -->

<!-- section:open-questions:start -->
- **Q:** Does Claude Code resolve `@AI_AGENTS.md` and `@.claude/CLAUDE.md` imports in root `CLAUDE.md`? **Verification:** start a fresh session and check the `claudeMd` system reminder shows both files' contents loaded. If imports don't resolve, replace shim with inlined content.
<!-- section:open-questions:end -->

<!-- section:read-watermark:start -->
Last read INDEX at: 2026-04-28T18:54:45-04:00
<!-- section:read-watermark:end -->
