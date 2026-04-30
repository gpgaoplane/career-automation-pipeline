---
status: active
type: work-log
owner: codex
last-updated: 2026-04-29T18:37:38-04:00
read-if: "you need to see Codex's recent work and watch-outs"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex Work Log

## Onboarded: 2026-04-28

**Platform:** Codex
**Adapter file:** .codex/CODEX.md
**First task:** (first entry below)

---

<!-- collab:log-archived-summary:start -->
<!-- WARNING: framework-managed; edit OUTSIDE this block, not inside -->
<!-- Older entries collapse to one-liners here on rotation; full history in
     .collab/archive/agents/codex-<date>.md -->
<!-- collab:log-archived-summary:end -->

<!-- new entries appended below, newest last -->

## 2026-04-28 — Reviewed Claude Phase 2.7 design plan

**Goal:** Review Claude's design plan for portals.yml cleanup, the mid-level profile pivot, and rule-based pre-scoring before implementation.

**What I read:** `AGENTS.md`, `AI_AGENTS.md`, `.codex/CODEX.md`, Codex memory files, `.collab/{INDEX,ROUTING,PROTOCOL}.md`, `.claude/memory/{decisions,context}.md`, `docs/STATUS.md`, `docs/agents/claude.md`, the full design plan, and the primary source files called out by the reviewer checklist: `career-ops/portals.yml`, `career-ops/modes/_profile.md`, `career-ops/config/profile.yml`, `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs`, plus `career-ops/package.json`.

**Handoff:** Picked up handoff `20260428-221522-bc38` from Claude, wrote the review, then closed the handoff.

**Key findings:** The plan is directionally sound, but I found five issues to resolve before implementation:
- Post-cleanup direct/branded ATS count appears to be 18 / 410, not 17 / 411, if both Labelbox and Genmo are re-enabled.
- D-8's "sequential clean rescan" conflicts with current scraper concurrency in `scan.mjs` and `custom-scraper.mjs`.
- The compensation penalty rule conflicts between §8.1, §8.2, and Q-7; lower-bound interpretation should be stated consistently.
- §5.1 misses stale count locations in `AI_AGENTS.md` and `docs/STATUS.md`; acceptance greps are too narrow.
- `CREATIVE` has a weight but no title-track parser route emits it.

**Feedback location:** Appended `## §17. Review Comments` to `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`.

**Open questions:** Whether Claude wants to revise D-8 as enrichment-only sequential or change existing scraper concurrency; whether to accept the 18 / 410 direct/branded correction.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` ........ appended Codex §17 review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260428-221522-bc38` picked up and closed via framework script
- `docs/agents/codex.md` ........ added this review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable review findings about ATS counts, scraper concurrency, and CREATIVE mapping
- `.codex/memory/decisions.md` ........ added D-1 with Codex review recommendations
- `.codex/memory/pitfalls.md` ........ added P-1 for explicit Git Bash script invocation on Windows
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/` config or code files were modified; implementation remains deferred to Claude's next plan.

## 2026-04-29 — Reviewed Claude Phase 2.7 implementation plan

**Goal:** Pick up Claude's implementation-plan handoff and verify it against design plan v2, the §18 reviewer checklist, and primary source files without modifying `career-ops/*`.

**What I read:** Framework front door and protocol files, Codex memory, implementation plan, design plan v2, `.claude/memory/decisions.md` D-12, `AI_AGENTS.md`, `docs/STATUS.md`, `docs/agents/claude.md`, and primary sources: `career-ops/portals.yml`, `career-ops/scan.mjs`, `career-ops/custom-scraper.mjs`, `career-ops/export-jobs.mjs`, `career-ops/package.json`, `career-ops/config/profile.yml`, and `career-ops/modes/_profile.md`.

**Handoff:** Picked up handoff `20260429-001531-cb9a`, wrote the review, closed the handoff, and acknowledged catchup.

**What I found:** Design v2 correctly integrated my previous five findings. The implementation plan is close, but needs fixes before execution:
- Final verification gates do not cover all 18 design acceptance criteria: missing criterion #10, criterion #12 conflicts with "do not run full-scan", and criterion #13 omits `416 enabled` / `32 disabled`.
- `enrich-jobs.mjs` CLI contract is incomplete relative to design and introduces undocumented `--limit`.
- `export-jobs.mjs` plan omits design's `--cache-warn-threshold P` flag.
- Preferred category set is still a placeholder despite QI-3 being settled.

**Feedback location:** Appended `## §20. Implementation Plan Review Comments` to `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md`.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` ........ appended Codex §20 implementation-plan review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260429-001531-cb9a` picked up and closed via framework script
- `docs/agents/codex.md` ........ added this implementation-plan review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed implementation-plan review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable findings about missing acceptance gates and CLI contract mismatches
- `.codex/memory/decisions.md` ........ added D-2 documenting the inline-review choice
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/*` files were modified; `.codex/memory/pitfalls.md` unchanged because no new recurring tool gotcha was discovered.

## 2026-04-29 — Reviewed Claude Phase 2.8 Firecrawl-pivot design

**Goal:** Pick up handoff `20260429-164715-2bcf` and review the Phase 2.8 Firecrawl-pivot design against the verification report, the decisions addendum, and Claude decisions D-14/D-15 before Claude writes the implementation plan.

**What I read:** `docs/plans/2026-04-29-firecrawl-pivot-design.md`, `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`, `docs/design/2026-04-29-firecrawl-ats-verification.md`, `.claude/memory/decisions.md`, and the handoff block in `docs/agents/claude.md`.

**Handoff:** Picked up handoff `20260429-164715-2bcf`, wrote inline review comments, closed the handoff, and acknowledged catchup.

**What I found:** D-14/D-15 are supported by the verification report, but the main design plan still contains pre-verification architecture:
- Layer 0 still reads as `scan.mjs` only and leaves a pending `scan.mjs` modification/wrapper choice, instead of D-15's settled sibling-adapter plan.
- Layer 2 still uses stale `/v1/extract` / legacy schema wording instead of `/v1/scrape` with `jsonOptions` only when JSON mode is needed.
- Cost, TTL, risk, and acceptance criteria sections still need the verification corrections: JSON mode is 5 credits/page, `/v1/extract` is a separate token pool, TTL should be 60 days with fast-fail rediscovery, rate caps remain unverified, and JazzHR should stay out of direct-adapter scope.
- Q-FC-4 is internally inconsistent on Firecrawl-first vs HTTP-first enrichment policy.

**Feedback location:** Appended `## §11. Review Comments` to `docs/plans/2026-04-29-firecrawl-pivot-design.md`.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-design.md` ........ appended Codex §11 design review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260429-164715-2bcf` picked up and closed via framework script; frontmatter timestamp updated
- `docs/agents/codex.md` ........ added this Firecrawl design-review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed Phase 2.8 design-review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable findings about stale Firecrawl design sections
- `.codex/memory/decisions.md` ........ added D-3 documenting the inline-review choice
- `.codex/memory/pitfalls.md` ........ added P-2 for occasional Git Bash signal-pipe sandbox failures
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/*` files were modified; `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`, `docs/design/2026-04-29-firecrawl-ats-verification.md`, and `.claude/memory/decisions.md` were read but not edited.

## 2026-04-29 — Reviewed Claude Phase 2.8 Firecrawl implementation plan

**Goal:** Pick up handoff `20260429-183239-0925` on `feat/phase-2.8-firecrawl` and review the Phase 2.8 implementation plan against its §10 checklist plus the eight focus areas in Claude's handoff.

**What I read:** `docs/plans/2026-04-29-firecrawl-pivot-implementation.md`, `docs/plans/2026-04-29-firecrawl-pivot-design.md`, `docs/plans/2026-04-29-firecrawl-pivot-decisions.md`, `docs/design/2026-04-29-firecrawl-ats-verification.md`, `.claude/memory/decisions.md`, and the handoff block in `docs/agents/claude.md`.

**Handoff:** Picked up handoff `20260429-183239-0925`, wrote inline implementation-plan review comments, closed the handoff, and acknowledged catchup.

**What I found:** The implementation plan is broadly aligned with design v2, D-14/D-15/D-17, and the verification report, but needs a v2 before Step 0:
- Root `scripts/ats-adapters/` paths conflict with `career-ops/package.json` npm script cwd.
- Several verification commands assume different working directories, making Step 1/5/8 fragile.
- `npm run full-scan --dry-run` / `--list` is not implemented by the shell-chain script as written.
- Layer 3 custom-scraper fallback is specified in design but not concretely wired into the runtime path, so AC-11 could pass as "0 invocations" without proving fallback works.
- Source-of-truth precedence should explicitly let the verification report + D-14/D-15/D-17 override stale addendum text.

**Feedback location:** Appended `## §12. Implementation Plan Review Comments` to `docs/plans/2026-04-29-firecrawl-pivot-implementation.md`.

### Task Receipt
Updates fanned out this task:
- `docs/plans/2026-04-29-firecrawl-pivot-implementation.md` ........ appended Codex §12 implementation-plan review comments and bumped frontmatter timestamp
- `docs/agents/claude.md` ........ handoff `20260429-183239-0925` picked up and closed via framework script; frontmatter timestamp updated
- `docs/agents/codex.md` ........ added this Phase 2.8 implementation-plan review log entry and Receipt
- `.codex/memory/state.md` ........ recorded completed Phase 2.8 implementation-plan review state, next steps, open questions, and watermark
- `.codex/memory/context.md` ........ recorded durable implementation-plan findings about path/cwd/fallback/precedence risks
- `.codex/memory/decisions.md` ........ added D-4 documenting the inline-review choice
- `.collab/INDEX.md` ........ bumped registry timestamps for touched managed files

Missing / intentionally skipped: no `career-ops/*` files were modified; `.codex/memory/pitfalls.md` unchanged because the Git Bash escalation pitfall was already documented.

## Handoff blocks

When you finish a substantive chunk of work and want another agent to take over,
run `collab-handoff <to-agent>`. It appends a structured block at the end of this
log with a stable id, what you did, files touched, and the branch state. See
`docs/handoff-schema.md` for the full format.

When the work log exceeds `rotate_at_lines` (default 300, see `.collab/config.yml`),
run `./scripts/collab-rotate-log.sh codex` to archive older entries.
Receipts and open handoff blocks are preserved; archived entries collapse to
one-line summaries in the archived-summary marker block above.
