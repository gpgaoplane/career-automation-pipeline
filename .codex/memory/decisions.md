---
status: active
type: decisions
owner: codex
last-updated: 2026-04-29T18:37:38-04:00
read-if: "you need Codex's major design decisions"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Decision Log

Append new decisions below. Format:

```
## D-<n> — <title> — <ISO-8601>
**Context:**
**Alternatives:**
**Choice:**
**Rationale:**
**Tradeoffs:**
```

<!-- section:entries:start -->
## D-1 — Review recommendations for Phase 2.7 design — 2026-04-28T22:32:14-04:00
**Context:** Claude asked Codex to review the portals cleanup, mid-level pivot, and pre-scoring design before implementation.
**Alternatives:** Approve as-is; return a short handoff; append substantive inline review comments with required fixes and Q-1..Q-8 recommendations.
**Choice:** Appended inline §17 review comments and recommended fixing the ATS distribution to 18 direct / 410 branded, clarifying whether D-8 sequentiality applies to enrichment only or to existing scrapers, using the compensation low bound consistently, expanding stale-count propagation checks, and resolving the non-emitted `CREATIVE` track.
**Rationale:** These issues can lead to incompatible implementations or incorrect acceptance criteria if left ambiguous.
**Tradeoffs:** This adds another integration step for Claude before implementation, but keeps the design artifact itself as the single review surface.

## D-2 — Inline review for implementation plan — 2026-04-29T00:26:05-04:00
**Context:** Claude handed off the Phase 2.7 implementation plan for Codex review after integrating design-plan v2.
**Alternatives:** Return a short handoff saying "minor notes"; append substantive inline §20 review comments; block without writing feedback.
**Choice:** Appended inline §20 review comments to the implementation plan because the findings affect verification gates and CLI contracts before any `career-ops/*` edits begin.
**Rationale:** The plan is mostly correct, but its final acceptance gates and CLI specs could let an implementation pass while missing design requirements.
**Tradeoffs:** Adds one more plan revision before execution, but avoids starting config/code edits from a plan with known acceptance gaps.

## D-3 — Inline review for Firecrawl pivot design — 2026-04-29T17:26:59-04:00
**Context:** Claude handed off Phase 2.8 Firecrawl-pivot design for review after adding a decisions addendum, verification report, and D-14/D-15.
**Alternatives:** Return a short handoff; append substantive inline review comments; approve as-is and let implementation planning resolve drift.
**Choice:** Appended inline §11 review comments to the main Firecrawl design plan.
**Rationale:** The review found cross-artifact drift that would materially shape the implementation plan: missing sibling adapters, stale `/v1/extract` assumptions, outdated cost/TTL/risk wording, placeholder acceptance criteria, and inconsistent enrichment policy.
**Tradeoffs:** Adds one more design-integration pass, but prevents the implementation plan from inheriting baseline-knowledge assumptions the verification report already disproved.

## D-4 — Inline review for Firecrawl implementation plan — 2026-04-29T18:37:38-04:00
**Context:** Claude handed off the Phase 2.8 implementation plan for Codex review after integrating the Firecrawl design review into v2.
**Alternatives:** Return a short handoff; append substantive inline §12 review comments; approve as-is and let Step 0 execution discover issues.
**Choice:** Appended inline §12 review comments to the implementation plan.
**Rationale:** The plan is directionally sound, but path resolution, cwd conventions, dry-run verification, and Layer 3 fallback wiring could break execution or let acceptance checks pass without proving the intended behavior.
**Tradeoffs:** Adds another revision before Step 0, but keeps the first implementation pass from starting with avoidable command/path and fallback ambiguity.
<!-- section:entries:end -->
