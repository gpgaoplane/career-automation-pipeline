---
status: active
type: decisions
owner: codex
last-updated: 2026-04-29T00:26:05-04:00
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
<!-- section:entries:end -->
