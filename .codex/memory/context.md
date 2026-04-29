---
status: active
type: context
owner: codex
last-updated: 2026-04-29T00:26:05-04:00
read-if: "you need durable project truths as understood by Codex"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Durable Context

Append new invariants and project truths below, each with a dated ISO-8601 header.

<!-- section:entries:start -->
## 2026-04-28T22:32:14-04:00 — Design-review findings on Phase 2.7 plan

Codex reviewed `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` against the current source files. Durable findings:

- Current `career-ops/portals.yml` has 448 tracked companies, 416 enabled, 32 disabled, and all 32 disabled rows lack `note:` before implementation. The plan's 428/20 final enabled/disabled math is consistent with re-enabling 14 and disabling 2.
- The plan's post-cleanup direct/branded split appears inconsistent with current direct-ATS patterns: current enabled direct count is 16; planned re-enables include direct Greenhouse Labelbox and direct Ashby Genmo, so the final split should be 18 direct / 410 branded unless one is intentionally excluded.
- Existing scrapers are not sequential: `scan.mjs` runs concurrency 10, and `custom-scraper.mjs` runs API concurrency 10 plus Playwright concurrency 5. Any "sequential clean rescan" promise needs either clarification or code changes.
- `CREATIVE` is defined as a pre-score title weight but no current `portals.yml` comment-group mapping emits `CREATIVE`; the combined `Generative AI / Creative` group currently maps only to `GEN-AI` in the design.

## 2026-04-29T00:26:05-04:00 — Implementation plan review findings

Codex reviewed Claude's implementation plan against design plan v2 and primary sources. Durable findings:

- Claude integrated the previous five design-plan findings correctly at the design layer: 18/410 ATS distribution, enrichment-only sequential wording, lower-bound comp scoring, expanded cross-file propagation, and CREATIVE parser route.
- The implementation plan still needs a v2 before execution because Step 10 final verification does not cover all design §12 acceptance criteria: criterion #10 cache-hit validation is absent, criterion #12 is reduced from "invoke full-scan succeeds" to static script-string inspection, and criterion #13 omits `416 enabled` / `32 disabled` from the stale-string grep.
- The implementation plan's enrich/export CLI contracts are incomplete relative to design v2: enrich omits explicit `--dry-run`, `--company`, `--rate-limit-ms`, `--ttl-days`, `--skip-stale` handling while using undocumented `--limit`; export omits `--cache-warn-threshold P`.
<!-- section:entries:end -->
