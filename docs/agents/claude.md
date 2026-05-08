---
status: active
type: work-log
owner: claude
last-updated: 2026-04-30T00:00:00-04:00
read-if: "you need to see Claude's recent work and watch-outs"
skip-if: "status != active or last-updated <= your watermark"
---

# Claude Work Log

## Onboarded: 2026-04-28

**Platform:** Claude
**Adapter file:** .claude/CLAUDE.md
**First task:** Install multi-agent-collab v0.4.1 framework + migrate existing project memory and CLAUDE.md content into the framework's structure.

---

<!-- collab:log-archived-summary:start -->
- 2026-04-28 — (no receipt)
- 2026-04-28 — (no receipt)
- 2026-04-28 — (no receipt)
- 2026-04-28 — (no receipt)
- 2026-04-29 — (no receipt)
- 2026-04-29 — (no receipt)
- 2026-04-29 — (no receipt)
- 2026-04-29 — (no receipt)
- 2026-04-29 — (no receipt)
- 2026-04-30 — (no receipt)
- 2026-04-30 — (no receipt)
<!-- collab:log-archived-summary:end -->

<!-- new entries appended below, newest last -->

## 2026-04-30 — Caught up on Codex's Phase 2.8 closure pass; reconciled Claude memory; preparing for full 397 rescan

**Goal:** Take the baton on Codex handoff `20260430-215447-c74d`. Verify Codex's reconciliation analytically (per user direction "be critical and analytical"), then bring Claude-owned memory in line with current truth. Prepare the bench for the full 397-company clean rescan.

**What I read (catchup):** `AGENTS.md`, `AI_AGENTS.md`, `.claude/CLAUDE.md`, `.collab/{INDEX,ROUTING,PROTOCOL}.md`, `.claude/memory/state.md`, `docs/STATUS.md`, `AI_HANDOFF.md`, `RESUME_PROMPT.md`, the three Step 10 audit artifacts (`docs/audits/2026-04-30-{step10-sample50-results.md, step10-sample50-metrics.json, sample50-missed-company-classification.md}`), latest `docs/agents/codex.md` entries (six entries spanning P-7/P-8/P-9 fixes, Step 0 re-audit, baseline reconciliation, Step 9/10 verification, AC-2 redefinition, handoff packaging), and `scripts/acceptance-audit-phase2.8.py` source.

**Independent verification done before accepting Codex's reconciliation:**
- Parsed `career-ops/portals.yml`: 448 total / 397 enabled / 51 disabled / 0 disabled-without-note. **Matches** Codex's claimed baseline.
- `git log --oneline -- career-ops/scan.mjs` shows only `b8e47c6 init: project scaffold...`. **D-3 invariant intact.**
- AC-5 grep for `/v1/extract|extractorOptions|extractionSchema` in active `.mjs` code: only one comment-line hit (`career-ops/lib/firecrawl.mjs:275: * Costs 5 credits/page (1 base + 4 surcharge). NOT /v1/extract.`). **Clean.**
- Re-ran `python scripts/acceptance-audit-phase2.8.py`: **12 PASS / 0 FAIL / 0 pending**, matching Codex's reported state.
- Audit script logic review: AC-2 reads `step10.get("ac2_source_accounting_pass")` from the metrics JSON. Codex's gate flags are `ac2_source_accounting_pass=true`, `ac2_source_health_pass=true`, `ac2_miss_classification_pass=true`. The gates are health ≥90% (got 97.4%) and miss classification ≥95% (got 100%). Internally consistent.
- Step 10 metrics arithmetic: 28 exported + 8 NO_RELEVANT_JOBS + 1 NO_OPEN_JOBS + 1 SOURCE_BROKEN = 38 source-resolved; 12 ROUTE_MISSING = 50 − 38; 28 + 22 no-yield = 50 sample. Internally consistent.
- Picked up Codex's open handoff `20260430-215447-c74d` at 2026-04-30T22:11:42-04:00 via `collab-handoff.sh pickup`.

**What I changed (memory reconciliation):**

1. **`.claude/memory/state.md`** — full rewrite. Active task now reflects Codex's closure pass, AC-2 redefinition, and the upcoming full-rescan gate. Stale "P-7/P-8/P-9 pending for Codex" / "Step 9 + Step 10 USER GATES still pending" content fully removed; superseded by completed entries with handoff IDs and audit cross-references. Open Questions reduced to current ones (rescan authorization; Layer-1 enhancement experiment timing; full-run audit naming).

2. **`.claude/memory/context.md`** — appended a new dated entry (2026-04-30T22:11:51-04:00) capturing six Phase 2.8 closure invariants: (i) current 448/397/51 baseline + 9 restored false disables; (ii) AC-2 redefinition stack with gates + buckets; (iii) AC-3 has TWO interpretations and only the GENERIC one is the gate; (iv) Step 10 transactional pattern is for sample runs only, not full rescans; (v) P-7/P-8/P-9 are FIXED in code (with what fixed each); (vi) TRUE Phase 2.8 sample-50 numbers (28/50 exported, 38/50 source-resolved); (vii) Seagate Workday CXS HTTP 422 is permanent SOURCE_BROKEN warning. Inline-superseded the prior "Expected after P-5/P-6 / Step 6 Layer 2: 41-48/50" projection bullet with strikethrough + actuals. Updated the Phase 2.8 credit budget bullet with combined Phase 2.8 spend (~700 credits) and remaining (100,401) per Step 9 dashboard.

3. **`.claude/memory/decisions.md`** — appended **D-20** documenting the formal acceptance of Codex's AC-2 redefinition. Records: (i) why I verified before accepting (per user "be critical" direction); (ii) what I checked independently; (iii) the four-bucket miss model; (iv) the two pass/fail gates (source health ≥90%, miss classification ≥95%); (v) tradeoffs (relevant yield is report-only; gates depend on classifier discipline); (vi) cross-references to Codex's D-9, the audit artifact, the audit script, design v2 + implementation v2 supersession notes. Frontmatter timestamp bumped.

4. **`.claude/memory/pitfalls.md`** — added **`**Status:** RESOLVED 2026-04-30 by Codex`** markers to P-7, P-8, P-9 with one-line summaries of what fixed each + regression-test pointers. Kept the Symptom/Root cause text intact for historical "why does the code do this?" lookups. Frontmatter timestamp bumped.

5. **This work log entry** — appended (this entry + Receipt below).

**Files touched:**
- Modified: `.claude/memory/state.md` (full section rewrite); `.claude/memory/context.md` (new entry + supersession edits); `.claude/memory/decisions.md` (D-20 + frontmatter); `.claude/memory/pitfalls.md` (resolved markers + frontmatter); `docs/agents/claude.md` (this entry); `.collab/INDEX.md` (timestamp bumps for the four memory files + claude work log — handled below).
- Untouched: all `career-ops/*` config and code (Codex's uncommitted Phase 2.8 follow-up changes carried in working tree as-is); `.codex/memory/*`, `docs/agents/codex.md` (Codex's own files, cross-agent courtesy); `AI_AGENTS.md`, `docs/STATUS.md`, audit artifacts, design/implementation plans, scripts (Codex already brought these into alignment in the handoff packaging pass).

**Watch out:**
- The full 397-company rescan is the next gate, but it's USER-GATED. Do NOT start it without explicit "go" — the run is non-transactional (writes to live `pipeline.md` / `scan-history.tsv` / `applications.md` / output workbook), and the cost is ~3,000 Firecrawl credits (extrapolating Step 10's 383 / 50 × 397). Budget remains 100,401 so it fits, but ask first.
- The acceptance audit gates are now source health (≥90%) and miss classification (≥95%). Anyone reading the old design v2 §7 wording must follow the supersession note to `docs/audits/2026-04-30-sample50-missed-company-classification.md`. Do NOT reinstate the old `>=75% companies produce jobs` AC-2 gate.
- AC-3 has two valid interpretations. The gate uses generic `location_raw OR comp ≥ 40%`. The narrow Will-fit `location_match` (Toronto/GTA/Ontario, Canada-only, fully remote US) is for scoring, NOT for measuring extraction quality. Future rescans must report both but gate on the generic.
- Seagate Workday CXS HTTP 422 will surface again on the full rescan. Treat as a source-health warning in the report, NOT a stop condition. Do not auto-disable Seagate without separate user direction.
- Working tree carries 28+ uncommitted modifications (Codex's Phase 2.8 follow-up + my memory reconciliation edits). User has not asked for a commit; commits remain user-gated per `.collab/PROTOCOL.md` cadence rule.

### Task Receipt

Updates fanned out this task:
- `.claude/memory/state.md` ........ full rewrite — current state reflects post-AC-2-redefinition truth + next-step is full 397 rescan
- `.claude/memory/context.md` ........ added 2026-04-30T22:11 entry (Phase 2.8 closure invariants); superseded stale projection bullet inline; updated credit budget bullet with actuals
- `.claude/memory/decisions.md` ........ added D-20 (formal acceptance of Codex's AC-2 redefinition with independent verification)
- `.claude/memory/pitfalls.md` ........ added RESOLVED markers to P-7/P-8/P-9 with what-fixed-each summaries + regression-test pointers
- `docs/agents/claude.md` ........ this entry + Receipt
- `.collab/INDEX.md` ........ timestamps bumped for the four memory files + claude work log
- handoff `20260430-215447-c74d` ........ picked up via collab-handoff.sh pickup; will close after full-rescan acceptance

Missing / intentionally skipped:
- `career-ops/*` ........ no config or code edits this turn; D-3 invariant preserved.
- `docs/STATUS.md` ........ Codex already brought it to current truth in the handoff packaging pass; no Claude-side delta to add until the full rescan completes.
- `AI_AGENTS.md` ........ Codex already updated the canonical baseline (448/397/51) in the reconciliation pass; no Claude-side delta needed.
- `docs/agents/codex.md`, `.codex/memory/*` ........ Codex-owned files; not modified per cross-agent courtesy.
- No new handoff written ........ this turn closes the catchup, not a substantive chunk worth handing off; next handoff opens after the full rescan completes (return to Codex for full-run analysis review).
- No commit made ........ user has not asked for one; Codex's working-tree edits + my memory reconciliation will land in the same commit when authorized.
- `scripts/sample-50-list.yml` ........ untracked Codex artifact from Step 10 sampling; left in place per "do not delete unfamiliar files without investigating" rule.

## 2026-05-01 — Phase 2.8 closure: full rescan + scoring policy v2 + Option A fixes + checkpoint

**Goal:** Execute full 393-enabled-company rescan, iterate scoring/filter policy with Will's review feedback, fix the signal-extraction bugs Will spotted, and land a clean Phase 2.8 closure checkpoint.

**Span:** 2026-05-01 single session. Three commits: `fe4663c` (catchup), `0db39ae` (audit tooling, Option B), and the about-to-be-created closure commit (rescan output + scoring v2 + Option A signal fixes + 4 SOURCE_BROKEN disables + frontmatter compliance + .gitignore + scraping-architecture closure note).

**What landed:**

- **Full 393-company rescan executed.** Snapshot baselines (rescan-start `2026-05-01T03:36:40Z`, queue=6, cost.tsv=988); reset `pipeline.md` + `scan-history.tsv` to header-only; bumped `MAX_CREDITS_DEFAULT` 3000→5000; ran `npm run full-scan` from `career-ops/`. Wall-clock ~3.5 hours. 3,552 Firecrawl credits consumed (within 5,000 cap; budget remaining 96,849). Two intermediate steps had non-zero exits (ats-adapters per-company 4xx errors, firecrawl-extract scrape timeouts) but the orchestrator continued by design and enrich + export + Layer 3 fallback all ran clean.
- **Full-run audit tooling built and exercised.** `scripts/full-run-audit.mjs` (~430 lines) re-probes has-route-but-no-exports companies via direct adapters, classifies into 4 buckets, writes metrics JSON + classification MD matching sample-50 schema. `--metrics` flag added to `scripts/acceptance-audit-phase2.8.py`. Mid-run found and fixed a real classifier bug: `probe_attempted: false` (e.g., 244 generic Layer-3 entries) was being mis-classified as SOURCE_BROKEN, dropping source-health from 99% to 60.5%. Fix added a `probe_attempted` flag distinguishing "no probe path available" from "probe failed." 48/48 unit tests pass.
- **4 SOURCE_BROKEN companies disabled** per Will's directive: Palo Alto Networks (Workday CXS 404), Grammarly (Greenhouse 404), SiFive (Workday CXS 404 + HW exclusion), EvenUp (Ashby 404). Roster baseline 397/51 → 393/55. Documented in `docs/audits/2026-05-01-source-broken-disables.md` for durable reference.
- **Scoring policy v2 shipped** in `career-ops/export-jobs.mjs`: S threshold 12→18, AE-only drop with lenient AE-multi keep, intern drop, deal-breaker drop (no longer penalize), Senior/Principal -2→-5. Sales/Business Development positive title-filter group removed from `career-ops/portals.yml` (forward-looking). One-time `pipeline.md` AE-only strip removed 715 rows; 2 AE-multi rows kept under lenient rule.
- **Option A signal-extraction fixes shipped** in `career-ops/enrich-jobs.mjs`: decimal-K pattern (Will's finding — 11 jobs corrected, ~20 score-points each), expanded anchor list, strong-pattern fallback (no anchor required for $X,XXX-$X,XXX or $XXK-$XXK), single-value comp extraction, hybrid_non_toronto dealbreaker (with cloud/mesh/fabric tech-context exclusion), proximity-based Toronto check, generic X+ YoE pattern. New `scripts/reextract-signals.mjs` post-processor re-runs `extractSignals` on cached `content_text` without Firecrawl re-fetches; ran with `--apply` and gained 626 dealbreaker / 31 comp / 16 yoe signals; corrected 10 comp values.
- **Final Excel state:** `career-ops/output/jobs-2026-05-01.xlsx` — 613 jobs across 154 companies; bands S=37 / A=370 / B=195 / C=11. S-tier OpenAI concentration dropped from 60% to 41%; 17 distinct companies in S-tier with reasonable diversity (Sierra, Together AI, Cresta, Airbnb, plus 12 single-S companies).
- **Acceptance audit (full-run metrics):** 12 PASS / 0 FAIL. Source resolved 385/393 (98.0%), health 385/385 (100%), miss class 213/213 (100%), AC-3 generic 664/956 (69.5%), AC-11b 33/956 (3.5%). All gates clear.
- **Wrap-up housekeeping:** frontmatter added to 4 INDEX-registered .md files (`docs/STATUS.md`, `scripts/ats-adapters/README.md`, `scripts/portals-triage-proposed-fixes.md`, RESUME_PROMPT.md to be overwritten); `scripts/sample-50-list.yml` added to `.gitignore`; `docs/design/scraping-architecture.md` carries Phase 2.8 closure note; `AI_AGENTS.md` roster baseline updated to 393/55 with new audit-tooling commands; `docs/design/companies-roster.md` regenerated.

**What was deferred this session (operational, non-blocking):**

- Log rotation for `docs/agents/claude.md` (957 lines, past 300 threshold). Quota was close to limit; rotating without confidence the script runs clean on Windows is the wrong risk to take pre-commit. Safe to run `./scripts/collab-rotate-log.sh claude` at the start of next session before any substantive edit.
- Full STATUS.md narrative update (frontmatter added; substantive content update beyond closure already covered by `state.md`'s closure narrative).
- Full work-log Receipt fan-out detail beyond this entry.

**Watch out:**

- **Hybrid dealbreaker has ~2% false-positive rate** on tech-context "hybrid cloud / hybrid model" phrasings. Conservative cloud/mesh/fabric exclusion reduces but doesn't eliminate. If Will surfaces a notable false-positive during manual review, the fix is per-company `portals.yml` re-enable with explicit note.
- **AE-multi-track jobs lose their AE tag entirely after the portals.yml prune.** They get scored on their non-AE track only — no penalty AND no multi-track bonus from AE side. Documented in D-21.
- **The 39 NO_RELEVANT_JOBS companies are mostly hardware/clinical** (KLA, Marvell, Cadence, NXP, Intel, Tokyo Electron, etc.). They score healthy + raw-jobs-found + zero-title-match — working as intended given Will's filters. If Will wants to tighten further, a separate disable round is the cleanest path.
- **The 8 ROUTE_MISSING companies** are LMArena, Aleph Alpha, Primer, Veritone, MindsDB, Galileo AI, Genmo (rank ≥296 — not top targets) plus one more. Defer Layer 1 enhancement experiments unless Will requests.

### Task Receipt

Updates fanned out this task:
- `career-ops/data/pipeline.md` ........ rescan output + AE-only strip (715 rows removed; 956 → 613 after dealbreaker filter)
- `career-ops/data/scan-history.tsv` ........ rescan dedup ledger (1671 rows)
- `career-ops/data/job-descriptions-cache.json` ........ enrichment grew 178 → 1502; re-extract added 626 dealbreaker / 31 comp / 16 yoe; corrected 10 comp values (gitignored — not staged)
- `career-ops/data/firecrawl-cost.tsv` ........ +2776 rows during run (gitignored — not staged)
- `career-ops/data/firecrawl-fallback-queue.tsv` ........ +33 rows during run (gitignored — not staged)
- `career-ops/output/jobs-2026-05-01.xlsx` ........ 613 jobs, S=37/A=370/B=195/C=11 (gitignored — not staged)
- `career-ops/lib/firecrawl.mjs` ........ MAX_CREDITS_DEFAULT 3000→5000
- `career-ops/portals.yml` ........ Sales/BD group removed from positives; 4 SOURCE_BROKEN companies disabled with explicit notes
- `career-ops/enrich-jobs.mjs` ........ Option A signal-extraction fixes (7 fixes including Will's decimal-K finding)
- `career-ops/export-jobs.mjs` ........ scoring policy v2 (S=18 / drop AE-only / drop intern / drop dealbreaker / Senior-Principal -5; flatMap pattern for filter)
- `scripts/full-run-audit.mjs` ........ probe_attempted bug fix (mid-session)
- `scripts/test-full-run-audit.mjs` ........ +4 new tests for probe_attempted distinction (44 → 48 tests)
- `scripts/acceptance-audit-phase2.8.py` ........ AC-10 regex check + `--metrics <path>` flag
- `scripts/reextract-signals.mjs` ........ NEW one-shot post-processor
- `docs/audits/2026-05-01-fullrun-metrics.json` ........ NEW (post-Option-A version; full-run gates pass)
- `docs/audits/2026-05-01-fullrun-classification.md` ........ NEW (per-company classification with re-probe evidence)
- `docs/audits/2026-05-01-source-broken-disables.md` ........ NEW (companion audit for the 4 disables)
- `docs/design/companies-roster.md` ........ regenerated for 393/55
- `docs/design/scraping-architecture.md` ........ added Phase 2.8 closure note
- `docs/STATUS.md` ........ added frontmatter
- `scripts/ats-adapters/README.md` ........ added frontmatter
- `scripts/portals-triage-proposed-fixes.md` ........ added frontmatter (status: archived)
- `AI_AGENTS.md` ........ roster baseline 397/51 → 393/55; new audit-tooling commands
- `.gitignore` ........ added `scripts/sample-50-list.yml`
- `.claude/memory/state.md` ........ Phase 2.8 closure narrative + cleared open-questions + Phase 3 candidate menu
- `.claude/memory/decisions.md` ........ D-21 (scoring policy v2 + Option A fixes)
- `.collab/INDEX.md` ........ register new files + bump touched-file timestamps

Missing / intentionally skipped:
- `.claude/memory/context.md` ........ closure facts captured in state.md; no new durable invariants beyond what D-21 records
- `.claude/memory/pitfalls.md` ........ no new pitfalls (every spotted bug was fixed in-session, not a recurring gotcha)
- `docs/STATUS.md` body update ........ frontmatter added; substantive narrative already in state.md
- `AI_HANDOFF.md` / `RESUME_PROMPT.md` ........ Codex's existing versions remain functionally accurate as next-session pickup; can be refreshed next session if needed
- log rotation ........ deferred per quota; safe to run at next-session start
- `.codex/memory/*`, `docs/agents/codex.md` ........ Codex-owned; not modified (cross-agent courtesy)
- No new handoff written ........ this is a checkpoint, not a hand-off; manual review of the Excel is the human-side next step

## 2026-05-02 — Filter pipeline reference doc + handoff to Codex

**Goal:** Will observed during manual review of `career-ops/output/jobs-2026-05-01.xlsx` that specific job postings he expected to see were missing. He asked for a thorough explanation of the current filter pipeline (research-only, no modifications) so he can identify which layer dropped each missing job. After the doc lands, hand off to Codex.

**What I read (Phase 1 exploration via 3 parallel Explore agents):** every filter layer in the codebase — `career-ops/portals.yml` `title_filter`, `career-ops/scan.mjs:125-135` `buildTitleFilter`, `scripts/ats-adapters/_lib.mjs:57-103` `iterTargets`+`buildTitleFilter`, `career-ops/firecrawl-discover.mjs:264-385` `discoverCompany`, `career-ops/firecrawl-extract.mjs:109-176` `collectExtractTargets`+main, `career-ops/enrich-jobs.mjs:100-302,519-554` REGEXES+extractDealBreaker+fetchers, `career-ops/export-jobs.mjs:120-218,265-288` scoring+output drops, `scripts/full-scan-orchestrator.mjs:28-141` chain order+fallback, `lib/firecrawl.mjs:140-230` retry+fallback queue.

**What I changed:**
- New file: `docs/design/filter-pipeline-reference.md` (~1040 lines, 9 sections). Verbatim title_filter inventory (60 positives + 89 negatives), match semantics with worked examples, all 5 cache schema variants, complete scoring formulas (computeTitleScore + computeDescScore + computeBand), all 4 dealbreaker regexes with check order + nearToronto proximity logic, 7-step diagnostic recipe for tracing any specific missing job through the pipeline, and explicit out-of-scope list.
- Registered in `.collab/INDEX.md` via `collab-register.sh`.
- Committed as `ff8303d` (`docs: add filter pipeline reference for missing-job diagnostic`).

**What I did NOT change** (per Will's scope direction "explanation only, no modifications"):
- No edits to `portals.yml`, `enrich-jobs.mjs`, `export-jobs.mjs`, scripts/*, or any production code/config.
- No filter relaxations applied.
- No re-extract, no re-export.
- Phase 2.8 closure state at tag `phase-2.8-complete` is preserved exactly.

**Watch out (for Codex pickup):**
- **The doc is research-only.** Will explicitly said NOT to propose changes, NOT to plan modifications. He'll later share specific missing-job examples; the handoff describes what to do then (apply Section 7 recipe; append per-job traces as Section 8).
- **Filter substring fragility is real.** Section 4 documents how `negative: "Senior"` drops "Seniority: Senior" and "Senior-level Engineer", how `negative: "London"` drops `"Software Engineer (London/NYC/Remote-US)"`, how `negative: "PhD"` drops `"Applied AI Engineer (PhD or 5+ years)"`. These are observed behaviors — the doc explicitly does NOT propose to change them. Do not unilaterally tighten or loosen filters.
- **Codex memory is 2 days behind.** `.codex/memory/{state,context,decisions,pitfalls}.md` last edited 2026-04-30; the 2026-05-01 closure (4 commits) and the 2026-05-02 filter-doc commit are not yet reflected. Codex should sync its own memory on pickup using the closure docs (`AI_HANDOFF.md`, `state.md`, `STATUS.md`, `D-21`, `2026-05-01-source-broken-disables.md`) plus this work-log entry and the new filter-pipeline-reference.
- **Log rotation still deferred.** `docs/agents/claude.md` is now 1117+ lines (well past 300 threshold). Framework rotation script ran on 2026-05-01 and chose not to archive (its 8-entry minimum heuristic returned 0). Safe to leave as informational advisory; if Codex wants to force rotation, manual archive is the path.

### Task Receipt

Updates fanned out this task:
- `docs/design/filter-pipeline-reference.md` ........ NEW — comprehensive 9-section reference covering filter layers, match semantics, cache schemas, scoring/dealbreaker formulas, and per-job diagnostic recipe
- `.collab/INDEX.md` ........ registered the new doc (auto-managed timestamp bump)
- `docs/agents/claude.md` ........ this entry + Receipt + handoff block

Missing / intentionally skipped:
- `.claude/memory/{state,context,decisions,pitfalls}.md` ........ no new durable invariants from this turn (the doc captures everything; D-21 already records the scoring policy + Option A fixes; no new architectural decision was made)
- `docs/STATUS.md` ........ Phase 2.8 closure narrative is current; this doc is a research deliverable, not a phase-status change
- `AI_HANDOFF.md` / `RESUME_PROMPT.md` ........ remain accurate for Phase 2.8 closure pickup; the Codex handoff via `collab-handoff.sh` is the right channel for this specific cross-agent transfer
- No re-extract / re-export / portals.yml or production-code edits ........ explicitly out of scope per Will's direction

## Handoff blocks

When you finish a substantive chunk of work and want another agent to take over,
run `collab-handoff <to-agent>`. It appends a structured block at the end of this
log with a stable id, what you did, files touched, and the branch state. See
`docs/handoff-schema.md` for the full format.

When the work log exceeds `rotate_at_lines` (default 300, see `.collab/config.yml`),
run `./scripts/collab-rotate-log.sh claude` to archive older entries.
Receipts and open handoff blocks are preserved; archived entries collapse to
one-line summaries in the archived-summary marker block above.
<!-- collab:handoff:start id=20260428-221522-bc38 -->
## Handoff → codex

- **handoff-id:** `20260428-221522-bc38`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/multi-agent-collab
- **at:** 2026-04-28T22:15:22-04:00
- **status:** closed
- **picked-up:** 2026-04-28T22:27:07-04:00 by codex

### What I did
Phase 2.7 design plan ready for review at docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md. Locked decisions D-7 to D-11 in .claude/memory/decisions.md. Cross-doc propagation done across AI_AGENTS.md, .claude/memory/{context,state}.md, docs/STATUS.md, work log. Decision-recording layer is updated; config/code edits (career-ops/portals.yml, modes/_profile.md, config/profile.yml, scripts) are intentionally deferred to the implementation plan execution. PLEASE REVIEW the design plan against the §16 reviewer checklist. Surface issues either in §17 Review Comments inside the design plan, or write a return handoff back to claude. Implementation plan will be written by claude only after your review is integrated.

### Files touched
docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md .claude/memory/decisions.md .claude/memory/context.md .claude/memory/state.md AI_AGENTS.md docs/STATUS.md docs/agents/claude.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-001531-cb9a -->
## Handoff → codex

- **handoff-id:** `20260429-001531-cb9a`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/multi-agent-collab
- **at:** 2026-04-29T00:15:31-04:00
- **status:** closed
- **picked-up:** 2026-04-29T00:22:19-04:00 by codex

### What I did
Implementation plan ready for review at docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md. This plan executes the v2 design plan you reviewed earlier (handoff 20260428-221522-bc38, your review at design plan §17, integrated into v2 with all 5 fixes per commit 781fba1). The implementation plan has 20 sections covering 11 ordered steps with verification gates, atomic commits, explicit rollback per step, and ~5h estimated wall-clock. PLEASE REVIEW against the §18 reviewer checklist. Particularly: (1) verify Step 1 portals.yml note prefixes match design §4.1 exactly, (2) verify Step 2 title_filter changes match design §4.4 + §6.2 (no new keywords introduced), (3) verify Step 6 enrich-jobs.mjs spec matches design §10 (cache schema, fetch policy, signal extraction), (4) verify Step 7 export-jobs.mjs refactor matches design §11 (column order, sort, banding, formatting), (5) flag any place where the plan defers a decision the design plan should have answered. Surface issues in §20 Implementation Plan Review Comments inside the implementation plan, OR write a return handoff back to claude. No career-ops/* config or code files should be touched during your review — read-only inspection. After your review, claude either integrates fixes (producing implementation plan v2) or proceeds to Step 1 execution per user direction.

### Files touched
docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md .claude/memory/decisions.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-164715-2bcf -->
## Handoff → codex

- **handoff-id:** `20260429-164715-2bcf`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/multi-agent-collab
- **at:** 2026-04-29T16:47:15-04:00
- **status:** closed
- **picked-up:** 2026-04-29T17:24:38-04:00 by codex

### What I did
Phase 2.8 Firecrawl-pivot design ready for review. Three coupled artifacts on feat/multi-agent-collab: (1) docs/plans/2026-04-29-firecrawl-pivot-design.md — 4-layer architecture (Layer 0 direct-API in scan.mjs untouched + 5 new sibling adapters; Layer 1 firecrawl-discover; Layer 2 firecrawl-extract; Layer 3 custom-scraper fallback), 5 risks, 9 acceptance criteria; (2) docs/plans/2026-04-29-firecrawl-pivot-decisions.md — resolutions to Q-FC-1..Q-FC-4; (3) docs/design/2026-04-29-firecrawl-ats-verification.md — forked-agent verification of 12 baseline-knowledge claims against primary sources, surfaced 3 architecture corrections (Workday CXS API exists, JSON-mode is 5cr/page not 1, /v1/scrape with formats:html,links not /v1/map for ATS discovery) + 5 newly-verified no-auth ATSes (Workday CXS, SmartRecruiters, Personio, Recruitee, Workable). Decisions D-14, D-15, D-16 recorded. INDEX registers all 3 docs. No career-ops/* config or code touched. PLEASE REVIEW: (a) verify the design plan architecture fully integrates the verification doc's 3 corrections + 5 newly-verified ATSes; (b) check D-14/D-15 rationale against verification doc; (c) flag any place the design plan still asserts a baseline-knowledge claim that verification proved wrong; (d) review the 4 Q-FC resolutions for corner cases; (e) flag any architecture risk verification surfaced that we haven't addressed (Firecrawl per-plan rate caps, JazzHR unverifiable, /v1/extract migrating to /agent). Surface issues inline as Review Comments section, OR write a return handoff back to claude. After your review is integrated, claude writes the Phase 2.8 implementation plan.

### Files touched
docs/plans/2026-04-29-firecrawl-pivot-design.md docs/plans/2026-04-29-firecrawl-pivot-decisions.md docs/design/2026-04-29-firecrawl-ats-verification.md .claude/memory/decisions.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-183239-0925 -->
## Handoff → codex

- **handoff-id:** `20260429-183239-0925`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-29T18:32:39-04:00
- **status:** closed
- **picked-up:** 2026-04-29T18:34:57-04:00 by codex

### What I did
Phase 2.8 implementation plan ready for review at docs/plans/2026-04-29-firecrawl-pivot-implementation.md on feat/phase-2.8-firecrawl (branched from main; main has Phase 2.7 + 2.8 design v2 already merged via commit 39bac3d). Plan executes design plan v2 (commit 73f6b2a, your prior review integrated as v2). 12 sections covering 12 ordered steps with per-step verification gates, atomic commits, explicit rollback, manual gates at Steps 0/5/9/10. ~5h estimated wall-clock. PLEASE REVIEW against the §10 reviewer checklist. Particularly: (1) Step 0 portals.yml URL triage script bucket logic + manual-gate framing; (2) Step 1 lib/firecrawl.mjs SDK shape — verify NO /v1/extract or legacy schema keys exposed (AC-5); (3) Step 2 lib/ats-clients.mjs duplication-vs-extraction approach for Greenhouse/Ashby/Lever (D-3 invariant); (4) Step 3 5 sibling adapters spec — confirm scripts/ats-adapters/ location preserves D-3 (career-ops/ vendored upstream); (5) Step 7 enrich-jobs.mjs refactor preserves pure Firecrawl-first per Q-FC-4 (HTTP fallback must be outage-resilience only, NOT cost-routing); (6) §7 AC mapping covers all 11 design v2 ACs; (7) §8 implementation risks (RI-1..RI-8) sufficient; (8) §9 deferred decisions (QI-1..QI-5) recommendations sound. Surface issues inline as §12 Implementation Plan Review Comments OR via return handoff. After your review is integrated, claude proceeds to Step 0 execution. No career-ops/* config or code edits during review — read-only inspection.

### Files touched
docs/plans/2026-04-29-firecrawl-pivot-implementation.md docs/plans/2026-04-29-firecrawl-pivot-design.md docs/plans/2026-04-29-firecrawl-pivot-decisions.md docs/design/2026-04-29-firecrawl-ats-verification.md .claude/memory/decisions.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260429-232409-dfdd -->
## Handoff → codex

- **handoff-id:** `20260429-232409-dfdd`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-29T23:24:09-04:00
- **status:** open

### What I did
Phase 2.8 implementation Steps 0-5 EXECUTED on feat/phase-2.8-firecrawl + Jasper safeEncode bug fix. Sample-50 smoke achieved 37/50 (74%) coverage = +2.85x baseline. 161 Firecrawl credits used (0.16% of 101k). Working tree clean, live state restored. Latest commit: 8c4a443. PICK UP at Step 5 inspection: 3 bugs surfaced. P-4 URL double-encoding FIXED (8c4a443). P-5 candidate dedup needed in firecrawl-discover.mjs resolveAmbiguous (recovers 4 of 6 ambiguous = Cadence/F5/Monolithic/Tokyo Electron → 41/50=82% AC-2). P-6 Greenhouse 'embed' synthetic slug filter in lib/ats-detect.mjs PROVIDER_PATTERNS.greenhouse (recovers Vectra AI/Zipline). After fixes re-run sample-50 smoke (~50-100 credits). Then Steps 6 (firecrawl-extract Layer 2 ~100cr), 7 (enrich-jobs Firecrawl-first refactor), 8 (full-scan-orchestrator.mjs + npm wiring), 9 USER GATE (Firecrawl dashboard rate-cap), 10 sample-50 verification, 11 acceptance audit, 12 tag scan-v2-prerescan. State + decisions (D-19) + pitfalls (P-4/P-5/P-6) + context (cache schema dual format) all updated. Cwd convention per impl plan §0a: career-ops/ unless ../scripts/ prefix. D-3 invariant: scan.mjs untouched (verify with git log).

### Files touched
career-ops/lib/firecrawl.mjs career-ops/lib/ats-clients.mjs career-ops/lib/ats-detect.mjs career-ops/firecrawl-discover.mjs scripts/ats-adapters/_lib.mjs docs/plans/2026-04-29-firecrawl-pivot-implementation.md .claude/memory/state.md .claude/memory/decisions.md .claude/memory/pitfalls.md .claude/memory/context.md docs/STATUS.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260430-104400-aa3d -->
## Handoff → codex

- **handoff-id:** `20260430-104400-aa3d`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-04-30T10:44:00-04:00
- **status:** closed
- **picked-up:** 2026-04-30T10:56:56-04:00 by codex

### What I did
Phase 2.8 implementation Steps 0-12 ALL CODE-COMPLETE on feat/phase-2.8-firecrawl + scan-v2-prerescan tag. Acceptance audit: 9 PASS / 3 manual-pending / 0 FAIL. POST-INSPECTION SURFACED 3 NEW BUGS (full details + fix recipes in .claude/memory/pitfalls.md): P-7 iterTargets cache pollution (inflated 39/50=78% reading; TRUE coverage is 30/50=60% pre-Layer-2 because cached-discovery adapters walk entire data/ats-discovery-cache.json with no filter against current portals.yml's enabled list). P-8 Layer 1 misses Ashby on JS-embed pages — user-confirmed Ramp (119 jobs) + Supabase (46 jobs) on api.ashbyhq.com/posting-api/job-board/{ramp,supabase} but Layer 1 marked them no-ats-found. P-9 Layer 2 firecrawl-extract.mjs should detect ATS in extracted jobs[].url values and promote no-ats-found → discovered (self-correcting). PRIORITY ORDER: (a) fix P-7 iterTargets filter in scripts/ats-adapters/_lib.mjs (~5 lines + unit test); (b) diagnose P-8 — scrape Ramp+Supabase with actions:[{wait:5000ms}] and inspect for ashbyhq.com markers, possibly expand PROVIDER_PATTERNS.ashby for embed.ashbyhq.com / assets.ashbyhq.com; (c) implement P-9 in firecrawl-extract.mjs ~15 lines; (d) re-run sample-50 smoke for TRUE coverage measurement (~50-100 credits). USER GATES still pending: Step 9 firecrawl-plan-caps.tsv (template at career-ops/data/firecrawl-plan-caps.tsv.template) + Step 10 full sample-50 with enrich (~1500 credits). All Phase 2.8 implementation code is in place — Codex job is bug fixes + measurement, not greenfield. Branch tip bc45b4e + 1 more commit pending for this handoff. ~290 Firecrawl credits used; 100,710 remaining.

### Files touched
career-ops/firecrawl-discover.mjs career-ops/firecrawl-extract.mjs career-ops/lib/ats-detect.mjs career-ops/lib/ats-clients.mjs career-ops/enrich-jobs.mjs scripts/ats-adapters/_lib.mjs scripts/full-scan-orchestrator.mjs scripts/acceptance-audit-phase2.8.py .claude/memory/pitfalls.md .claude/memory/state.md docs/STATUS.md career-ops/data/firecrawl-plan-caps.tsv.template

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->

<!-- collab:handoff:start id=20260502-205619-f5ed -->
## Handoff → codex

- **handoff-id:** `20260502-205619-f5ed`
- **parent-id:** `none`
- **from:** claude
- **to:** codex
- **branch:** feat/phase-2.8-firecrawl
- **at:** 2026-05-02T20:56:19-04:00
- **status:** closed
- **picked-up:** 2026-05-02T22:18:50-04:00 by codex

### What I did
Phase 2.8 closure stable + new filter pipeline reference doc landed. Will is in manual review of jobs-2026-05-01.xlsx and observed missing job postings. Handing off to Codex to handle the next stages.

CURRENT STATE
- Branch feat/phase-2.8-firecrawl, tag phase-2.8-complete at commit 75ec403.
- Recent commits this arc: fa7de8c, 59b841f, ff8303d (most recent — filter pipeline reference doc).
- Roster baseline: 448 total / 393 enabled / 55 disabled / 0 missing notes.
- Acceptance audit gates: 12 PASS / 0 FAIL / 0 pending against docs/audits/2026-05-01-fullrun-metrics.json.
- Output Excel for Will's manual review: career-ops/output/jobs-2026-05-01.xlsx (613 jobs, S=37/A=370/B=195/C=11).
- Working tree clean (only .claude/settings.local.json untracked, intentionally excluded).

NEW THIS SESSION (commit ff8303d)
- docs/design/filter-pipeline-reference.md — comprehensive 9-section research-only reference doc covering every filter layer, match semantics, cache schema variants, scoring/dealbreaker formulas, and a 7-step per-job diagnostic recipe. Will requested this so he can trace specific missing jobs through the pipeline himself, OR have an agent do it on his behalf when he provides examples.

WHAT TO DO ON PICKUP
1. Sync your own memory. .codex/memory/* was last edited 2026-04-30; the 2026-05-01 closure round (4 commits) and the 2026-05-02 filter doc are not reflected. Read AI_HANDOFF.md, .claude/memory/state.md, .claude/memory/decisions.md (D-21), docs/STATUS.md, docs/audits/2026-05-01-source-broken-disables.md, docs/audits/2026-05-01-fullrun-classification.md, latest docs/agents/claude.md entry, AND the new docs/design/filter-pipeline-reference.md to get current.
2. Wait for Will's specific missing-job examples (URLs or titles). When provided, apply the Section 7 diagnostic recipe to each one and append the per-job traces as Section 8 — Worked Examples in a follow-up commit to docs/design/filter-pipeline-reference.md.
3. Do NOT proceed to filter modifications, relaxation recommendations, or re-extract/re-export unless Will explicitly authorizes. Scope is strictly research/diagnostic at this point.

PHASE 3 CANDIDATE MENU (no work scheduled — Will picks)
A. LLM evaluation pipeline integration (per old roadmap)
B. Calibration round (after Will's manual review feedback)
C. Delta detection (deferred from pre-rescan review)
D. SOURCE_BROKEN cache refresh for any of the 4 disabled-but-real-fit companies (PAN, Grammarly, SiFive, EvenUp)
E. NO_RELEVANT_JOBS roster cleanup (39 hardware/clinical companies)

WATCH OUTS
- The new filter pipeline reference doc explicitly does NOT propose changes — it explains current architecture only. Don't unilaterally relax filters even if patterns look over-aggressive.
- docs/agents/claude.md is at 1117+ lines (past 300 threshold). Framework rotation script returned 0-archivable; safe to leave as informational advisory unless you want to manually archive older entries.
- Phase 2.8 closure state is preserved at tag phase-2.8-complete. If anything in this handoff or the closure docs doesn't hold up empirically, push back and reconcile before acting.

### Files touched
docs/design/filter-pipeline-reference.md docs/agents/claude.md .collab/INDEX.md

### What needs validation
(fill in during handoff; default: diff the commits listed above)

### Open questions
(none stated)
<!-- collab:handoff:end -->


## 2026-05-07 — Shadow filter calibration arc CLOSED at V10 + 4-commit checkpoint

**Goal:** Close the V1→V10 shadow filter calibration arc (started 2026-05-03 by Codex) and checkpoint the entire body of work to git before production wiring. Will manually reviewed V10 workbook and approved.

**Approach:**
1. Verified Round 7 verification confirmed V10_READY_FOR_PRODUCTION_WIRING (1,418 assertions pass, 2/2 V9 FPs closed, 0 new FPs introduced).
2. Saved methodological pitfall P-10 ("Implementation agents self-verify on the wrong population") to `.claude/memory/pitfalls.md`. The lesson was caught in Rounds 5+6, encoded into V10 brief, and Round 7 confirmed it worked.
3. Will reviewed V10 workbook on 2026-05-07 and approved.
4. Sequenced 4 logical commits to checkpoint everything before production wiring:
   - `d73638b` — framework upgrade to multi-agent-collab v0.4.3 + Gemini onboarding (75 files, +6471/-1188).
   - `17251c8` — shadow filter calibration test infra + enrichment patches (37 files, +11015/-8). Includes `scripts/lib/job-fit-rules.mjs` (V10 single source of truth), `scripts/lib/jd-sections.mjs`, 1,418-assertion test suites, 66-row real-data fixtures with `revised_in` audit trails, V5-V6 through V9-V10 diff scripts, `scripts/gated-full-scan-v1.mjs`, `scripts/fullrun-calibration-workbook.mjs`, `scripts/ats-adapters/direct-core-v1.mjs`, plus `career-ops/enrich-jobs.mjs` compResult helper for hourly→annual normalization with confidence tagging.
   - `7dd512e` — shadow filter calibration arc V1→V10 audit trail (38 files, +9412). All audit findings R3-R7, all per-version implementation summaries V6-V10, V7+V8 plan reviews + plan-v2 verifications, per-version diff summaries V5-V6 through V9-V10.
   - This commit — memory + STATUS update for V10 closure.

**Decisions:**
- D-22 (decisions.md): Shadow filter calibration V1→V10 + plan-review-revise-implement-verify cycle. Documents the iterative methodology, the 6 BLOCKING bugs caught in plan reviews, the 5 FPs caught in verification rounds, and the final V10 rule set.
- Commit cadence: 4 logical chunks rather than one mega-commit, per Will's option-1 selection. Framework upgrade isolated from shadow work; test infra separated from audit trail; memory update last to capture closure state with commit SHAs from earlier chunks.
- Local-only files intentionally NOT committed: `.claude/settings.local.json` (Claude Code permissions cache), `docs/audits/*test*.json` (test-output regenerable artifacts), `career-ops/tmp-extract-territory.mjs` (temp file, cleanup-pending).

**Updates:**
- `.claude/memory/decisions.md` — append D-22 (shadow filter calibration arc).
- `.claude/memory/state.md` — overwrite to reflect V10 closure + 4-commit checkpoint + production wiring as next step.
- `.claude/memory/pitfalls.md` — append P-10 (already done in prior session).
- `docs/STATUS.md` — top entry for V10 closure + Round 7 verdict + V9 + Round 5/6 retrospective entries; Handoff Note rewritten for production wiring as next agent action.
- `docs/agents/claude.md` — this Receipt.

**Verification:**
- 4 commits land cleanly (verified `git log --oneline -5` post-commit-3 shows expected SHAs).
- Working tree post-commit-4 contains only the 3 intentionally-uncommitted local files.
- Branch `feat/phase-2.8-firecrawl` ready for production wiring (next session).

### Task Receipt

| Field | Value |
|---|---|
| Task | Shadow filter calibration arc V10 closure + 4-commit checkpoint |
| Outcome | DONE — V10_READY_FOR_PRODUCTION_WIRING confirmed by Round 7; Will approved manual review; 4 logical commits checkpointed |
| Commits | `d73638b` framework upgrade · `17251c8` test infra + enrichment · `7dd512e` audit trail · this commit memory + STATUS |
| Files touched (this commit) | `.claude/memory/decisions.md` · `.claude/memory/state.md` · `docs/STATUS.md` · `docs/agents/claude.md` |
| Tests | 1,418 assertions pass; baseline SHA preserved `7bfe4ec5...071e` |
| Decisions | D-22 (shadow filter calibration V1→V10 + plan-review-revise-implement-verify cycle) |
| Pitfalls | P-10 (implementation agents self-verify on wrong population) |
| Next agent action | Production wiring — port V10 rules from `scripts/lib/job-fit-rules.mjs` into `career-ops/export-jobs.mjs`, smoke test, tag `production-v10` |
| Reversibility | Full — V10 rules in `scripts/lib/`; production code untouched until wiring commit; `git revert` rolls back wiring without affecting shadow infra |
| Open questions | None for this checkpoint. Wiring branch strategy (same vs new) deferred to next session. |
