---
status: active
type: audit
owner: claude
last-updated: 2026-05-01T20:00:00-04:00
read-if: "you need the rationale for the 4 SOURCE_BROKEN companies disabled on 2026-05-01 (Phase 2.8 closure)"
skip-if: "status != active"
related:
  - career-ops/portals.yml
  - docs/audits/2026-04-30-step0-disabled-company-audit.md
  - docs/audits/2026-05-01-fullrun-classification.md
  - docs/audits/2026-05-01-fullrun-metrics.json
---

# Phase 2.8 Closure — SOURCE_BROKEN Disable Round (2026-05-01)

Companion audit to `docs/audits/2026-04-30-step0-disabled-company-audit.md`.
Phase 2.8 closure surfaced 4 companies whose cached ATS routes returned
HTTP 404 during the full-run audit's re-probe pass. Will reviewed the
findings and directed `enabled: false` for all four. New roster baseline:
**448 total / 393 enabled / 55 disabled / 0 missing notes**.

## Source

Detected by `scripts/full-run-audit.mjs` re-probe phase on 2026-05-01,
running against the post-rescan `data/ats-discovery-cache.json`. Each
listed endpoint was the cache's recorded direct-API URL for the company
at the time of probe.

## Disabled cohort

| Company | Rank | Category | Cached route | Probe result | User rationale |
|---------|-----:|----------|--------------|--------------|----------------|
| Palo Alto Networks | 48 | Cybersecurity | `POST paloaltonetworks.wd5.myworkdayjobs.com/wday/cxs/paloaltonetworks/en-US/jobs` | HTTP 404 (`errorCode: S21 — not found: Job_Posting_Site_ID`) | User-directed scope drop with SOURCE_BROKEN cohort. Cybersecurity vertical not core to Will's AI-engineering / agentic-systems focus. |
| Grammarly | 221 | AI SaaS | `GET boards-api.greenhouse.io/v1/boards/grammarly/jobs?content=true` | HTTP 404 (`status: 404 — Job not found`) | AI writing/SaaS scope mismatch. Will's targets are AI engineering / agentic / production AI; AI writing assistants (Grammarly/Superhuman) are out of scope. Supersedes 2026-04-30 restoration which had confirmed active jobs exist; user has now ruled the scope out. |
| SiFive | 277 | AI Chips / Compute | `POST sifive.wd1.myworkdayjobs.com/wday/cxs/sifive/en-US/jobs` | HTTP 404 (`errorCode: S21`) | Semiconductor / hardware exclusion — matches the project's universal HW-supply-chain exclusion rule. |
| EvenUp | 326 | AI Legal Tech | `GET api.ashbyhq.com/posting-api/job-board/evenup?includeCompensation=true` | HTTP 404 (`Not Found`) | User-directed scope drop with SOURCE_BROKEN cohort. AI legal tech borderline-fit; user opted to bundle with the broken-cache cohort rather than refresh and re-evaluate. |

## Notes on the bug class

Each of the 4 companies has a verified ATS route in the discovery cache
from earlier Phase 2.8 work, but the recorded slug or site path is now
stale at the upstream provider. Two failure modes:

- **Workday CXS `en-US` site path** (Palo Alto Networks, SiFive): the
  cached site path ends in `en-US` which Workday treats as a locale
  prefix, not a tenant site. The actual production site path differs by
  tenant (e.g., `panwexternalcareers`, `External_Careers`).
- **Greenhouse / Ashby slug rename** (Grammarly, EvenUp): the cached
  slug no longer resolves; the upstream board may have renamed the slug
  or migrated to a different parent organization since cache discovery.

These are recoverable via `node firecrawl-discover.mjs --force --company "<name>"`
to refresh the cache, but Will opted to drop rather than re-discover.
If any of these companies are later re-evaluated for fit, the
re-discovery path is the right tool.

## Cross-references

- Live `career-ops/portals.yml` rows for each company carry an
  `note: "disabled 2026-05-01: SOURCE_BROKEN ..."` reason field.
- `docs/audits/2026-05-01-fullrun-classification.md` shows these
  companies in their bucket at probe time (now disabled, so they don't
  appear in the post-disable enabled-count denominator).
- Future re-enable decisions: see commit `<commit-3-sha>` for the durable
  branch state at disable time.
