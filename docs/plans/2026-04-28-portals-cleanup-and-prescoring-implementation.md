---
status: active
type: implementation-plan
owner: claude
last-updated: 2026-04-29T00:24:25-04:00
read-if: "you are about to execute the portals cleanup, mid-level pivot, and pre-scoring system implementation"
skip-if: "you are looking for design rationale — see the design plan"
related:
  - docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md
  - .claude/memory/decisions.md
  - AI_AGENTS.md
---

# Implementation Plan — Portals Cleanup, Mid-Level Pivot, Pre-Scoring System

> **Reviewer brief.** This plan executes the design plan v2 (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md`). 11 ordered steps with verification gates, atomic commits, and explicit rollback per step. No new design decisions are introduced here — every choice traces back to the design plan section listed in the "Source" column. Read §1-§3 for orientation, §4-§14 for step-by-step execution, §15 for verification gates, §16-§17 for risks/rollback. Open questions in §18. Reviewer checklist in §19.

---

## §1. Pre-flight

### §1.1 Required state before starting

| Check | Expected | Verification |
|---|---|---|
| Branch | `feat/multi-agent-collab` (or a sub-branch of it) | `git branch --show-current` |
| Working tree clean | yes (no uncommitted changes other than `.claude/settings.local.json` untracked) | `git status --short` |
| Design plan v2 committed | commit `781fba1` or later | `git log --oneline | grep "design plan v2"` |
| collab-check OK | INDEX aligned with filesystem | `bash ~/.claude/skills/multi-agent-collab/scripts/collab-check.sh` |
| Codex onboarded | `.codex/CODEX.md` exists, `.collab/agents.d/codex.yml` present | `test -f .codex/CODEX.md && test -f .collab/agents.d/codex.yml` |
| Node ≥ 18 | matches `package.json` engines | `node --version` |
| Bash 5+ (Git Bash on Windows) | yes | `bash --version | head -1` |
| Playwright installed in `career-ops/` | yes (already used by `custom-scraper.mjs`) | `cd career-ops && npx playwright --version` |
| `cheerio` installed in `career-ops/` | yes (already used by `custom-scraper.mjs` per `package.json`) | `cd career-ops && node -e "require('cheerio')"` |

### §1.2 Rollback strategy (whole-plan level)

| Failure mode | Recovery |
|---|---|
| Implementation deeply broken; hard to recover | `git reset --hard <last-good-commit>` (e.g., `git reset --hard 781fba1` to undo all implementation commits while preserving the design plan v2) |
| Single step bad | Per-step rollback documented in each §. Most are `git revert <commit>` — atomic commits make this safe |
| portals.yml corrupted | Restore from git: `git checkout <last-good-commit> -- career-ops/portals.yml` |
| `enrich-jobs.mjs` shipped with bug | Revert the commit; cache file persists (no data loss) |

### §1.3 What this plan does NOT do

- Does not run the clean rescan itself. Rescan execution (Phase 2.6) happens AFTER implementation completes; documented as a follow-up step in §13 of design plan or future work.
- Does not modify `career-ops/scan.mjs` (vendored upstream).
- Does not change scraper concurrency (D-8 / design §3 — out of scope).
- Does not introduce any new design decisions. If a question arises during execution that isn't answered by the design plan, STOP and surface to the user.

### §1.4 Total estimated wall-clock

| Step | Estimate |
|---|---|
| 1. portals.yml audit cleanup (re-enable 14 + disable 2 + add notes) | 30 min |
| 2. portals.yml title_filter rewrite (positives + negatives + YAML group split) | 25 min |
| 3. config/profile.yml archetype levels | 5 min |
| 4. modes/_profile.md mid-level reframing | 35 min |
| 5. Generate `docs/design/companies-roster.md` | 15 min |
| 6. Build `career-ops/enrich-jobs.mjs` | 75 min |
| 7. Refactor `career-ops/export-jobs.mjs` for pre-scoring | 60 min |
| 8. Wire enrichment into `npm run full-scan` | 5 min |
| 9. Calibration pass against `scan-v1-unfiltered` baseline | 30 min |
| 10. Verification gates (acceptance criteria 1-18) | 25 min |
| 11. Commit hygiene + final collab-check | 10 min |
| **Total** | **~5 hours of focused work** |

Realistic with breaks: 1-1.5 days.

---

## §2. Execution Order Overview

```
                                  [START on feat/multi-agent-collab]
                                           │
                                           ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 1: portals.yml AUDIT CLEANUP                          │
   │   re-enable 14 mis-drops, disable 2 inversions             │
   │   add `note:` to all 20 final disabled rows                │
   │   verify: 448 / 428 / 20 counts                            │
   │   COMMIT: "refine: portals.yml audit cleanup..."            │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 2: portals.yml TITLE_FILTER REWRITE                   │
   │   remove Senior AI / Principal AI / Senior PM from positives│
   │   add Senior/Sr/Sr./Principal/Junior/Jr/Jr./Associate to    │
   │     negatives                                               │
   │   split "Generative AI / Creative" YAML group into:         │
   │     "Generative AI Engineering" + "Creative"                │
   │   verify: filter parses cleanly; track parser would emit    │
   │     all 7 tracks                                            │
   │   COMMIT: "refine: title_filter rewrite for mid-level..."   │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 3: config/profile.yml ARCHETYPE LEVELS                │
   │   all 6 archetypes set level: "Mid-level"                  │
   │   COMMIT: (bundled with Step 4)                            │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 4: modes/_profile.md MID-LEVEL REFRAMING              │
   │   adjust archetype Fit cells + adaptive framing for         │
   │     mid-level (3-5 YoE) positioning                         │
   │   exit narrative untouched (factual)                        │
   │   COMMIT: "refine: mid-level profile pivot per D-7"         │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 5: docs/design/companies-roster.md                    │
   │   one-shot Python script generates from portals.yml         │
   │   sorted by rank ascending; columns: Rank, Name, Category,  │
   │     careers_url, Enabled, Note                              │
   │   register in INDEX                                         │
   │   COMMIT: "docs: add companies-roster.md (auto-generated)"  │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 6: BUILD career-ops/enrich-jobs.mjs                   │
   │   per design §10 (cache schema, tier policy, signal extract)│
   │   small subset test (5-10 URLs) before full integration     │
   │   register in INDEX                                         │
   │   COMMIT: "feat: enrich-jobs.mjs description fetcher"       │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 7: REFACTOR career-ops/export-jobs.mjs                │
   │   per design §11 (new columns, pre-score, banding, sort)    │
   │   reuses enrichment cache from Step 6                       │
   │   sample run validates 3-sheet output unchanged + new cols  │
   │   COMMIT: "feat: export-jobs.mjs pre-scoring + banding"     │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 8: WIRE INTO npm run full-scan                        │
   │   add `enrich` script to package.json                       │
   │   update `full-scan` chain: scan → custom-scrape → enrich →  │
   │     export                                                  │
   │   COMMIT: (bundled with Step 7)                            │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 9: CALIBRATION PASS                                   │
   │   run pre-scoring against scan-v1-unfiltered (1406 jobs)   │
   │   spot-check top-10 S-tier + bottom-10 C-tier               │
   │   tune band thresholds if S-tier is too narrow / wide       │
   │   document tuning in design plan §17 follow-up notes        │
   │   COMMIT: "tune: band thresholds based on calibration"      │
   │   (only if thresholds change)                               │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 10: VERIFICATION GATES (criteria 1-18)                │
   │   run grep audit per criterion #13                          │
   │   run python audit per criterion #1-3                       │
   │   spot-check Excel output                                   │
   │   collab-check pass                                         │
   │   if any gate fails → fix → retest, before committing       │
   │   no commit unless all 18 pass                              │
   └────────────────────┬────────────────────────────────────────┘
                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ STEP 11: COMMIT HYGIENE + FINAL collab-check               │
   │   work log entry + Receipt for each step                    │
   │   register all new files in INDEX                           │
   │   final collab-check OK                                     │
   │   if user wants Codex re-review: handoff at this point      │
   │   if not: ready for merge to main + Phase 2.6 clean rescan  │
   └─────────────────────────────────────────────────────────────┘
```

---

## §3. Branch / Commit Strategy

### §3.1 Where to work

Continue on `feat/multi-agent-collab`. The branch already carries the design plan, framework migration, audit findings, and v2 corrections. Implementation commits land on top.

If the user prefers a sub-branch for the implementation specifically (so design and implementation are reviewable separately), create `feat/portals-cleanup-impl` as a child of `feat/multi-agent-collab`. Decision deferred to user; default is to continue on `feat/multi-agent-collab`.

### §3.2 Commit cadence

Per `.collab/PROTOCOL.md` "Commit cadence" rule: commit at clean task boundaries with the user's standing approval. One commit per step where steps are atomic; bundle Step 3 with Step 4 (config + modes are coupled), and Step 8 with Step 7 (npm script is part of the export refactor).

Final commit list (target):

| Commit # | Step(s) | Message |
|---|---|---|
| 1 | Step 1 | `refine: portals.yml audit cleanup — re-enable 14 mis-drops, disable Foxconn + Skydio, add notes per D-11` |
| 2 | Step 2 | `refine: title_filter rewrite — mid-level pivot per D-7 + CREATIVE YAML group split per design §6.2` |
| 3 | Steps 3+4 | `refine: mid-level profile pivot — config/profile.yml + modes/_profile.md per D-7` |
| 4 | Step 5 | `docs: add companies-roster.md (auto-generated from portals.yml)` |
| 5 | Step 6 | `feat: enrich-jobs.mjs — description fetcher with 7-day cache + tiered fetch` |
| 6 | Steps 7+8 | `feat: export-jobs.mjs pre-scoring + banding + npm full-scan chain` |
| 7 | Step 9 (only if thresholds change) | `tune: band thresholds from calibration pass` |
| 8 | Step 11 | `chore: work log entries + Receipts + INDEX registration` |

Total: 7-8 commits over the implementation phase.

---

## §4. Step 1 — portals.yml Audit Cleanup

### §4.1 Source

Design plan §4.1, §4.2, §4.3, §4.5; D-11 in `.claude/memory/decisions.md`.

### §4.2 Action

Edit `career-ops/portals.yml` for the 16 entries:

**14 to re-enable** (flip `enabled: false` → `enabled: true`; remove any obsolete commentary):
1. Anysphere (Cursor) — rank 141
2. Sierra — rank 234
3. Tempus AI — rank 239
4. Databricks-adjacent: Fivetran — rank 255
5. Pigment — rank 302
6. Descript — rank 325
7. Tome — rank 344
8. AI coding: Tabnine — rank 350
9. Scale AI-adjacent: Labelbox — rank 366
10. Twelve Labs — rank 377
11. Runway-adjacent: Genmo — rank 387
12. Nomic AI — rank 390
13. Inworld AI — rank 423
14. Nscale — rank 217

**2 to disable** (flip `enabled: true` → `enabled: false`; add `note:`):
15. Foxconn — rank 65 → `note: "excluded:HW supply chain — universal exclusion per Will's profile (semiconductors / hardware manufacturing)"`
16. Skydio — rank 437 → `note: "excluded:defense drones / maritime — universal exclusion per Will's profile"`

**Add `note:` field to all OTHER 18 disabled rows** (the ones already disabled that stay disabled), per the §4.1 schema convention:

| Entry name | Note prefix |
|---|---|
| Runway-adjacent: Lumen Orbis | `duplicate-of: Runway` |
| Runway-adjacent: Kling AI | `duplicate-of: Runway (URL points to runwayml.com; real Kling is Kuaishou/China — not available via this URL)` |
| Adept AI | `duplicate-of: Adept` |
| xAI/Grok | `duplicate-of: xAI` |
| xAI Colossus | `duplicate-of: xAI (Colossus is a supercomputer cluster, not a separate hiring entity)` |
| Foxconn-adjacent: Nebius | `duplicate-of: Nebius Group` |
| Foxconn / Hon Hai | `duplicate-of: Foxconn (and Foxconn parent now also disabled — see entry above)` |
| Vercel-adjacent: Lovable | `duplicate-of: Lovable` |
| Writer-adjacent: Anthropic Claude Code | `duplicate-of: Anthropic (Claude Code is a product, not a separate hiring entity)` |
| Cohere-adjacent: Voyage AI | `duplicate-of: Cohere (Voyage was acquired by MongoDB in Feb 2025; URL is now stale, not relevant)` |
| Ramp AI | `duplicate-of: Ramp (sub-brand of Ramp)` |
| Stripe AI | `duplicate-of: Stripe (sub-brand of Stripe)` |
| Runway-adjacent: HeyGen | `duplicate-of: HeyGen` |
| Pika | `duplicate-of: Pika Labs` |
| Anduril-adjacent: Skydio | `duplicate-of: Skydio (and Skydio parent now also disabled)` |
| Databricks-adjacent: Snowflake AI | `duplicate-of: Snowflake` |
| NVIDIA | `excluded:HW supply chain — universal exclusion per Will's profile` |
| Shield AI-adjacent: Saronic | `excluded:defense drones / maritime — universal exclusion per Will's profile` |

### §4.3 Verification

After saving:
```bash
cd "D:/Projects/career ops"
python -c "
import yaml
with open('career-ops/portals.yml','r',encoding='utf-8') as f:
    data = yaml.safe_load(f)
companies = data.get('tracked_companies', [])
total = len(companies)
enabled = [c for c in companies if c.get('enabled', True)]
disabled = [c for c in companies if not c.get('enabled', True)]
no_note = [c for c in disabled if not c.get('note')]
print(f'Total: {total}')
print(f'Enabled: {len(enabled)}')
print(f'Disabled: {len(disabled)}')
print(f'Disabled missing note: {len(no_note)}')
"
```

Expected output:
```
Total: 448
Enabled: 428
Disabled: 20
Disabled missing note: 0
```

If any field is wrong, fix portals.yml and re-run before committing.

### §4.4 Rollback

`git checkout <last-good-commit> -- career-ops/portals.yml`

### §4.5 Commit message template

```
refine: portals.yml audit cleanup — 428 enabled / 20 disabled per D-11

Re-enable 14 mis-drops (Cursor, Sierra, Tempus, Fivetran, Pigment,
Descript, Tome, Tabnine, Labelbox, Twelve Labs, Genmo, Nomic AI,
Inworld AI, Nscale).

Disable 2 inversions: Foxconn rank 65 (HW supply chain exclusion),
Skydio rank 437 (defense drones exclusion).

Add explicit `note:` field to all 20 final disabled rows. Note
taxonomy: 16 `duplicate-of: <parent>`, 2 `excluded:HW supply chain`,
2 `excluded:defense drones / maritime`.

Verified: 448 total / 428 enabled / 20 disabled / 0 disabled
missing note.

See decisions.md D-11 and design plan §4.
```

---

## §5. Step 2 — portals.yml title_filter Rewrite

### §5.1 Source

Design plan §4.4, §5.1, §6.2; D-7 (mid-level pivot), D-9 (CREATIVE track).

### §5.2 Action

Three coupled edits in `career-ops/portals.yml` `title_filter` section:

**(A) Remove from `title_filter.positive`** (lines 67, 94, 95 in current file):
```diff
-    - "Senior Product Manager"
...
-    - "Senior AI"
-    - "Principal AI"
```

**(B) Add to `title_filter.negative`** under two new sub-comment groups:

Find the existing `# ── Too senior (IC seniority band) ──` block (currently lines 105-107 with `Staff` and `Lead`). Replace that block plus add new groups:

```yaml
    # ── Above mid-level IC band (per D-7 mid-level pivot) ────────────────────
    - "Senior"
    - "Sr"
    - "Sr."
    - "Principal"
    - "Staff"
    - "Lead"
    # ── Below mid-level IC band (too junior) ────────────────────────────────
    - "Junior"
    - "Jr"
    - "Jr."
    - "Associate"
    # (intern, internship, co-op, coop, PhD, postdoc already in earlier "Too junior" block)
```

The existing `# ── Too senior (IC seniority band) ──` group becomes `# ── Above mid-level IC band ──` (renamed for clarity). The existing `# ── Too senior (management / C-suite) ──` group (VP, Director, Chief, etc.) stays unchanged.

**(C) Split the YAML comment group `# ── Generative AI / Creative ──`** (currently lines 74-86) into two new groups:

```yaml
    # ── Generative AI Engineering ──────────────────────────────────────────
    - "LoRA"
    - "Stable Diffusion"
    - "Video Generation"
    - "Content AI"
    - "Prompt Engineer"
    # ── Creative ───────────────────────────────────────────────────────────
    - "Creative Technologist"
    - "Technical Artist"
    - "AI Trainer"
    - "AI Model Trainer"
    - "Image Trainer"
    - "Video Trainer"
    - "ComfyUI"
```

The split is mechanical: 12 keywords → 5 to GEN-AI Engineering, 7 to Creative. Order within each group preserves alphabetical/category sense.

### §5.3 Verification

```bash
cd "D:/Projects/career ops"
# Verify positives no longer contain Senior AI / Principal AI / Senior PM
for term in "Senior AI" "Principal AI" "Senior Product Manager"; do
  if grep -q "\"$term\"" career-ops/portals.yml; then
    echo "FAIL: '$term' still in portals.yml"
  else
    echo "OK: '$term' removed"
  fi
done

# Verify negatives include all required terms
for term in "Senior" "Sr" "Sr." "Principal" "Junior" "Jr" "Jr." "Associate"; do
  if grep -q "\"$term\"" career-ops/portals.yml; then
    echo "OK: '$term' in negatives"
  else
    echo "FAIL: '$term' missing from negatives"
  fi
done

# Verify YAML group split
grep -c "Generative AI Engineering\|^    # ── Creative ──" career-ops/portals.yml
# Expected: 2 (one for each new group header)

# Verify YAML still parses
python -c "import yaml; yaml.safe_load(open('career-ops/portals.yml').read()); print('YAML OK')"
```

All checks must print OK. If any FAIL or YAML parse error → fix before committing.

### §5.4 Risk note

The bare substring `"Senior"` in negatives will exclude titles like "Senior Manager — Customer Trust" — but those don't match Will's positives anyway, so no regression. `"Sr"` will false-positive on rare titles like `"Mr. Sr Engineer"` — extremely rare, acceptable.

The `"Lead"` in negatives might false-positive on "Tech Lead Engineer" — but Will doesn't want Lead-level either (above mid-level band per D-7), so this is correct.

### §5.5 Rollback

`git checkout HEAD~1 -- career-ops/portals.yml` (only undoes Step 2 commit; preserves Step 1 audit cleanup).

### §5.6 Commit message template

```
refine: title_filter rewrite — mid-level pivot per D-7 + CREATIVE split

Per D-7 (profile pivot to mid-level 3-5 YoE):
- Remove from positives: "Senior AI", "Principal AI", "Senior Product Manager"
- Add to negatives (above mid-level): "Senior", "Sr", "Sr.", "Principal"
  (existing Staff, Lead retained in same group)
- Add to negatives (below mid-level): "Junior", "Jr", "Jr.", "Associate"

Per design §6.2 (CREATIVE track parser route):
- Split existing combined "Generative AI / Creative" YAML comment
  group into two new groups:
    - "Generative AI Engineering" (5 keywords) → maps to GEN-AI track
    - "Creative" (7 keywords) → maps to CREATIVE track
  Enables the rule-based pre-scoring (D-9) to emit CREATIVE for
  artist/trainer roles distinct from GEN-AI engineering roles.

Verified:
- "Senior AI", "Principal AI", "Senior Product Manager" no longer in positives
- All 8 new negative terms present
- YAML parses cleanly
- Group split: 2 new headers added

See decisions.md D-7, D-9 and design plan §4.4 + §6.2.
```

---

## §6. Step 3 — config/profile.yml Archetype Levels

### §6.1 Source

Design plan §5.1; D-7 mid-level pivot.

### §6.2 Action

Edit `career-ops/config/profile.yml`. Find the `target_roles.archetypes` block (currently lines 23-41). Set every `level:` to `"Mid-level"`.

Current state (per pre-flight read):

```yaml
  archetypes:
    - name: "AI Engineer"
      level: "Mid-Senior"        # → "Mid-level"
      fit: "primary"
    - name: "Solutions Architect"
      level: "Senior"             # → "Mid-level"
      fit: "primary"
    - name: "Generative AI Engineer"
      level: "Senior"             # → "Mid-level"
      fit: "primary"
    - name: "Account Executive"
      level: "Mid-Senior"         # → "Mid-level"
      fit: "secondary"
    - name: "AI Product Manager"
      level: "Mid-Senior"         # → "Mid-level"
      fit: "secondary"
    - name: "Consultant"
      level: "Senior"             # → "Mid-level"
      fit: "adjacent"
```

After edit: all 6 archetypes have `level: "Mid-level"`.

### §6.3 Verification

```bash
cd "D:/Projects/career ops"
grep "level:" career-ops/config/profile.yml
# Expected: 6 lines, all "level: \"Mid-level\""

grep -c 'level: "Mid-Senior"\|level: "Senior"' career-ops/config/profile.yml
# Expected: 0
```

### §6.4 Rollback

`git checkout HEAD~1 -- career-ops/config/profile.yml`

### §6.5 Commit (bundled with Step 4 — see §7.5)

---

## §7. Step 4 — modes/_profile.md Mid-Level Reframing

### §7.1 Source

Design plan §5.1; D-7 mid-level pivot.

### §7.2 Action

Edit `career-ops/modes/_profile.md`. Three areas to update:

**(A) Target Roles table** (lines 5-12):
Currently the `Fit` column references "Primary" / "Secondary" / "Adjacent". Those are correct (priority labels) and stay. The IMPLICIT senior framing in the archetype names ("AI Engineer", "Solutions Architect", etc.) doesn't carry an explicit level — leave names as-is.

Add a new line above the table:

```markdown
**Target IC band (per D-7, 2026-04-28):** mid-level (3-5 YoE). Will is repositioning from senior/principal to mid-level to avoid title-inflation expectations. Senior and Principal explicitly excluded at scrape time via portals.yml `title_filter.negative`.
```

**(B) Adaptive Framing table** (lines 16-23):
The "Lead with..." cells currently emphasize senior-level proof points. Lighten the senior framing where possible:

| If the role is... | Old "Lead with..." | New "Lead with..." |
|---|---|---|
| AI Engineer | LangGraph/ADK agentic architecture, RAG pipeline design, multimodal systems, observability | LangGraph/ADK agentic implementation, RAG pipeline build-out, multimodal systems, observability (3 years production AI experience) |
| Solutions Architect | Primary technical advisor across 50+ client engagements, architecture + integrations + enablement | Hands-on technical implementation across 50+ client engagements, architecture + integrations + enablement (Dalamula founder timeline = 3 years production work) |
| Generative AI / Technical Artist | (unchanged — already factual) | (unchanged) |
| Account Executive | (unchanged — full-cycle sales is factual) | (unchanged) |
| AI Product Manager | (unchanged — discovery/KPI is factual) | (unchanged) |
| Consultant | (unchanged — full analytics value chain is factual) | (unchanged) |

Goal: shift wording from "advisor" / "lead" framing to "implementer" / "build-out" / "hands-on" framing. Subtle but signals mid-level positioning to readers.

**(C) Exit Narrative** (lines 26-27):
Leave unchanged. The narrative is factual ("co-founded and operated for 3 years"). It does NOT claim senior IC band; it positions Dalamula as a 3-year production track-record, which IS consistent with mid-level (3-5 YoE).

**(D) Cross-Cutting Advantage section** (lines 30-33):
Leave unchanged. "Will's signature is being the only person who can do all of it" is a strength claim, not a level claim.

**(E) Compensation Framing** (lines 88-100):
Leave unchanged. Comp targets (US $120K-$180K, CAD $110K-$150K) are the same regardless of mid-level vs senior framing. The comp ranges align with mid-level Senior Engineer at major US tech companies.

**(F) Adaptive framing test** — no other section needs updating; the file is mostly proof-point heavy and level-agnostic.

### §7.3 Verification

```bash
cd "D:/Projects/career ops"
# Verify the new mid-level statement is present
grep "Target IC band" career-ops/modes/_profile.md
# Expected: 1 match referring to mid-level (3-5 YoE) and D-7

# Verify "advisor" / "lead" wording is reduced
# (manual review — quantitative grep insufficient)
```

Manual review: open `modes/_profile.md` post-edit, read top-down, confirm framing reads as mid-level positioning.

### §7.4 Rollback

`git checkout HEAD~1 -- career-ops/modes/_profile.md`

### §7.5 Commit (bundled — Steps 3+4)

```
refine: mid-level profile pivot — config/profile.yml + modes/_profile.md per D-7

Per D-7: Will repositions from senior/principal IC band to
mid-level (3-5 YoE). Reasoning: avoid senior/principal
title-inflation expectations.

config/profile.yml:
  - All 6 archetype levels: "Mid-Senior" / "Senior" → "Mid-level"

modes/_profile.md:
  - Add "Target IC band: mid-level (3-5 YoE)" statement above
    Target Roles table
  - Adaptive framing: shift "advisor" / "lead" wording to
    "hands-on" / "build-out" / "implementer" framing for
    AI Engineer and Solutions Architect cells
  - Exit narrative, cross-cutting advantage, compensation
    framing left unchanged (factual, level-agnostic)

See decisions.md D-7 and design plan §5.1.
```

---

## §8. Step 5 — Generate `docs/design/companies-roster.md`

### §8.1 Source

Design plan §4.6.

### §8.2 Action

One-shot Python script generates the roster from `portals.yml`. Script lives in `scripts/` (or as ad-hoc; recommend `scripts/generate-roster.py` for re-runnability).

```python
#!/usr/bin/env python3
"""Generate docs/design/companies-roster.md from career-ops/portals.yml."""
import yaml
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
PORTALS = REPO_ROOT / "career-ops" / "portals.yml"
OUT = REPO_ROOT / "docs" / "design" / "companies-roster.md"

with open(PORTALS, encoding='utf-8') as f:
    data = yaml.safe_load(f)
companies = sorted(data['tracked_companies'], key=lambda c: c.get('rank', 9999))

lines = [
    "# Companies Roster (Auto-Generated)",
    "",
    f"Generated from `career-ops/portals.yml` on the date this commit lands.",
    f"DO NOT edit by hand — regenerate via `python scripts/generate-roster.py`.",
    f"",
    f"**Total:** {len(companies)} | **Enabled:** {sum(1 for c in companies if c.get('enabled', True))} | **Disabled:** {sum(1 for c in companies if not c.get('enabled', True))}",
    "",
    "| Rank | Name | Category | careers_url | Enabled | Note |",
    "|------|------|----------|-------------|---------|------|",
]
for c in companies:
    rank = c.get('rank', '?')
    name = c.get('name', '?').replace('|', '\\|')
    cat = c.get('category', '').replace('|', '\\|')
    url = c.get('careers_url', '')
    enabled = "✓" if c.get('enabled', True) else "✗"
    note = (c.get('note') or '').replace('|', '\\|').replace('\n', ' ')
    lines.append(f"| {rank} | {name} | {cat} | {url} | {enabled} | {note} |")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f"Wrote {OUT} with {len(companies)} rows")
```

Run:
```bash
cd "D:/Projects/career ops"
python scripts/generate-roster.py
```

Then add YAML frontmatter to the top of the generated file:
```markdown
---
status: active
type: archive
owner: shared
last-updated: <ISO timestamp>
read-if: "you need a human-readable view of the canonical company list"
skip-if: "you can read portals.yml directly"
---

```

(Or have the script write frontmatter automatically — implementer's call.)

Register in INDEX:
```bash
bash ~/.claude/skills/multi-agent-collab/scripts/collab-register.sh "docs/design/companies-roster.md"
```

### §8.3 Verification

```bash
test -f docs/design/companies-roster.md && echo "OK: file exists"
wc -l docs/design/companies-roster.md
# Expected: 460 lines (header + table header + 448 company rows + frontmatter)

bash ~/.claude/skills/multi-agent-collab/scripts/collab-check.sh
# Expected: OK: INDEX and filesystem aligned
```

Manual review: open `docs/design/companies-roster.md`, confirm 428 enabled / 20 disabled visible, all 20 disabled rows have non-empty Note column.

### §8.4 Rollback

`rm docs/design/companies-roster.md && git checkout HEAD -- .collab/INDEX.md`

### §8.5 Commit message template

```
docs: add companies-roster.md (auto-generated from portals.yml)

Per design plan §4.6: human-readable canonical view of the 448
companies in portals.yml. Sorted by rank ascending. Columns:
Rank, Name, Category, careers_url, Enabled, Note.

Auto-generated by scripts/generate-roster.py. Re-generate
whenever portals.yml changes materially.

Reflects post-cleanup state: 428 enabled / 20 disabled with
explicit notes.

Registered in .collab/INDEX.md.
```

---

## §9. Step 6 — Build `career-ops/enrich-jobs.mjs`

### §9.1 Source

Design plan §10 (full component design with cache schema, fetch policy, failure modes, pseudocode).

### §9.2 Module structure

```
career-ops/enrich-jobs.mjs (single file, ~250 lines)
  ├── imports: fs, path, fileURLToPath, fetch (built-in node 18+),
  │             playwright, cheerio, yaml
  ├── constants: PIPELINE_PATH, CACHE_PATH, LOG_DIR, TTL_DAYS (default 7),
  │             RATE_LIMIT_MS (default 500), MAX_TEXT_CHARS (default 50000),
  │             FETCH_TIMEOUT_MS (default 30000)
  ├── parseArgs() — explicit flag set per design §10.1 + §10.3:
  │     --dry-run            preview without writing
  │     --force              refresh cache for already-cached URLs
  │     --company <name>     single-company enrichment (used for subset tests)
  │     --rate-limit-ms <N>  override default 500ms between requests
  │     --ttl-days <N>       override default 7-day cache TTL
  │     --skip-stale         skip URLs whose cache is older than TTL (don't re-fetch)
  │     NOTE: do NOT introduce a --limit flag. Subset testing uses --company
  ├── loadCache() / saveCache() — JSON read/write atomic
  ├── parsePipelineMd() — reuse from export-jobs.mjs
  ├── isStale(entry, ttl) — check fetched_at against now
  ├── fetchTier1(url) — plain HTTP fetch with timeout
  ├── fetchTier2(url, browser) — Playwright fallback
  ├── extractSignals(text) — pure function with all §8 regexes
  ├── enrichOne(job, browser, cache) — orchestrate per-URL flow
  ├── main() — load cache, iterate jobs sequentially, save per-job
  └── SIGINT handler — close browser, flush cache, exit clean
```

### §9.3 Implementation order (within Step 6)

1. Skeleton with imports, constants, CLI flag parsing (~10 min)
2. Pipeline parser + cache load/save (~10 min)
3. `extractSignals()` pure function with all §8 regexes (~25 min)
4. `fetchTier1()` + `fetchTier2()` with timeout/retry (~15 min)
5. `enrichOne()` orchestrator (~10 min)
6. `main()` loop with sequential processing + per-job cache save (~5 min)
7. SIGINT handler (~3 min)
8. Subset test with 5-10 URLs from existing pipeline.md (~10 min)

### §9.4 Critical signal extraction regexes (per design §8)

```javascript
const REGEXES = {
  toronto: /\b(toronto|gta|greater toronto area|ontario)\b/i,
  hybridToronto: /\bhybrid\b.{0,200}\b(toronto|gta)\b/is,
  canadaOnly: /\b(canada-only|must be located in canada|canadian residents only)\b/i,
  fullyRemoteUS: /\b(100% remote|fully remote)\b.{0,100}\b(us-based|north america|united states)\b/is,
  yoe35: /\b(3|4|5|3-5|3 to 5|four|five) years?\b.{0,20}\b(experience|exp)\b/i,
  yoe6plus: /\b(6\+|7\+|8\+|10\+) years?\b/i,
  yoe02: /\b(0-2|1-2|less than 2|0 to 2) years?\b/i,
  // comp regex: most permissive — extracts USD or CAD numeric ranges with optional K/k
  compRange: /\$\s?([\d,]+)\s?[Kk]?\s*[-–to]+\s*\$?\s?([\d,]+)\s?[Kk]?\s*(?:USD|CAD|US|CA)?/g,
  // deal-breaker examples (extend as needed)
  dealBreaker: /\b(must work onsite (?!.{0,30}toronto)|in-office 5 days(?!.{0,30}toronto)|phd required|sponsorship not available for remote)\b/i,
};

const TRACK_KEYWORDS = [
  /* AI-ENG */
  "RAG", "retrieval-augmented", "multi-agent", "agentic", "LangGraph",
  "LangChain", "LlamaIndex", "vector database", "vector db", "embeddings",
  "fine-tuning", "LoRA", "LLMOps", "MLOps", "production AI", "agent orchestration",
  /* SA / CONSULT */
  "Forward Deployed", "FDE", "Customer Engineer", "Solutions Architect",
  "Implementation Engineer", "client-facing", "post-deployment",
  /* GEN-AI / CREATIVE */
  "ComfyUI", "Stable Diffusion", "generative video", "diffusion model",
  "image generation", "video generation", "3D generation",
  /* PM */
  "AI roadmap", "AI product strategy", "agentic product",
  /* AE */
  "AI sales", "technical sales", "land and expand", "AI partnerships",
];

const TECH_STACK = [
  "Python", "PyTorch", "TensorFlow", "Hugging Face", "transformers",
  "LangChain", "LlamaIndex", "Pinecone", "Weaviate", "Chroma", "Qdrant",
  "OpenAI API", "Anthropic API", "Claude API", "GPT-4", "GCP", "AWS",
  "Vertex AI", "SageMaker", "Bedrock",
];
```

### §9.5 Verification

```bash
cd "D:/Projects/career ops/career-ops"
# Subset test: enrich a single company's URLs (using design's --company contract,
# NOT an undocumented --limit flag). Pick a company that's likely to have URLs
# in the current pipeline.md or scan-v1-unfiltered baseline.
node enrich-jobs.mjs --company "Anthropic"

# Verify cache file exists and has valid JSON
test -f data/job-descriptions-cache.json && python -c "import json; print(len(json.load(open('data/job-descriptions-cache.json'))))"
# Expected: ≥1 entries (number of Anthropic URLs in pipeline)

# Verify second run is mostly cache hits
node enrich-jobs.mjs --company "Anthropic" 2>&1 | grep -c "cached, skip"
# Expected: ≥80% of URLs return "cached, skip" (criterion #10: cache hit rate ≥ 0.9)

# --dry-run smoke test
node enrich-jobs.mjs --dry-run --company "Anthropic" 2>&1 | grep -c "would fetch\|cached, skip"
# Expected: ≥1; no actual network calls; no cache file written
```

Spot-check: open `data/job-descriptions-cache.json`, pick one entry, verify `extracted_signals` contains expected fields (location_match, comp_low_thousands, etc.).

### §9.6 Rollback

`rm career-ops/enrich-jobs.mjs && git checkout HEAD -- .collab/INDEX.md`

(Cache file at `data/job-descriptions-cache.json` is local and not committed; can be deleted with `rm`.)

### §9.7 Commit message template

```
feat: enrich-jobs.mjs description fetcher per design §10

New script in career-ops/ that fetches each pipeline.md URL once,
caches text + extracted signals in data/job-descriptions-cache.json
(7-day per-URL TTL).

Tier 1 plain HTTP fetch → Tier 2 Playwright fallback for
JS-rendered pages. Per-domain rate limit (500ms default) with
429 bump-and-skip. Sequential per D-8 (enrichment-only sequential;
existing scrapers unchanged).

Signal extraction (per design §8): location, comp range with
USD/CAD parsing, track keywords, tech-stack matches, YoE
indicators, deal-breaker phrases. Pure function — easily
unit-tested.

Resume-safe: per-job cache writes; SIGINT closes browser,
flushes cache, exits clean. Re-runs skip cached URLs unless
--force flag.

Verified on 5-URL subset: cache populated, signals extracted,
second run hits cache for ≥4/5.

Registered in .collab/INDEX.md.

See decisions.md D-10 and design plan §10.
```

---

## §10. Step 7 — Refactor `career-ops/export-jobs.mjs`

### §10.1 Source

Design plan §11.

### §10.2 New columns in Pending Jobs sheet

Add after existing columns (Rank, Company, Category, Title, URL):

```javascript
{ header: 'Match Track', key: 'match_track', width: 16 },
{ header: 'Title Score', key: 'title_score', width: 11 },
{ header: 'Desc Score', key: 'desc_score', width: 11 },
{ header: 'Pre-Score', key: 'pre_score', width: 11 },
{ header: 'Band', key: 'priority_band', width: 7 },
{ header: 'Score Notes', key: 'score_notes', width: 40 },
```

### §10.3 New helpers

Add to top of `export-jobs.mjs`:

```javascript
function parseTrackMappingFromYaml(yamlPath) {
  // Read file as text (not via js-yaml — need comment groups)
  // Walk lines, track current group via /^\s*#\s*──\s*(.+?)\s*──/
  // Map keyword → track via lookup table:
  //   "AI / ML Engineering" → "AI-ENG"
  //   "Solutions / Technical Advisory" → "SA"
  //   "Sales / Business Development" → "AE"
  //   "Product Management" → "PM"
  //   "Consulting / Advisory" → "CONSULT"
  //   "Generative AI Engineering" → "GEN-AI"
  //   "Creative" → "CREATIVE"
  //   "Broad AI roles" → "AI-ENG" (fallback)
  // Return Map<keyword (lowercase), track>
}

function deriveMatchTrack(title, trackMap) {
  const lower = title.toLowerCase();
  const matched = new Set();
  for (const [keyword, track] of trackMap) {
    if (lower.includes(keyword.toLowerCase())) matched.add(track);
  }
  return [...matched]; // array of tracks, can be 1+ entries
}

function computeTitleScore(job, trackMap, companyMap) {
  const tracks = deriveMatchTrack(job.title, trackMap);
  const TRACK_WEIGHTS = { 'AI-ENG': 5, 'GEN-AI': 5, 'SA': 4, 'PM': 4, 'CONSULT': 3, 'CREATIVE': 3, 'AE': 3 };
  if (tracks.length === 0) return { tracks: ['?'], score: 0, breakdown: 'no track match' };
  const trackWeight = Math.max(...tracks.map(t => TRACK_WEIGHTS[t] || 0));
  const multiTrackBonus = tracks.length >= 2 ? 1 : 0;
  const rank = companyMap.get(job.company)?.rank ?? 9999;
  const rankTier = rank <= 50 ? 4 : rank <= 150 ? 3 : rank <= 300 ? 2 : 1;
  const category = companyMap.get(job.company)?.category ?? '';
  // Preferred categories — finalized per QI-3 + Codex Q-3 design review.
  // Includes the design §7.3 base list plus QI-3 additions (AI Foundation
  // Models, AI Sales / GTM AI, AI Data Labeling / Programmatic) and EXCLUDES
  // AI Chatbot / Consumer (xAI/Grok is disabled; consumer chatbots are not
  // the target track).
  const PREFERRED = new Set([
    'AI Agents', 'AI 3D Generation', 'AI Video Generation', 'AI Video Understanding',
    'AI Video / Avatar Generation', 'AI Video/Audio Editing',
    'AI Coding Tools', 'AI Coding Assistant', 'AI Coding / Vibe-Coding', 'AI Coding CLI',
    'AI Embeddings', 'AI Embeddings / Open-Source',
    'AI Cloud Infrastructure',
    'AI Healthcare', 'AI Financial Planning',
    'Data Cloud / AI Features', 'Data Integration / AI Pipeline',
    'AI Data Labeling', 'AI Data Labeling / Programmatic',
    // Added per QI-3 + Codex design Q-3
    'AI Foundation Models', 'Foundation Models',
    'AI Sales / GTM AI',
    // INTENTIONALLY NOT INCLUDED: 'AI Chatbot / Consumer' (consumer chatbots
    // are not Will's target track; xAI/Grok is disabled and shouldn't accidentally
    // become preferred-category evidence).
  ]);
  const categoryBonus = PREFERRED.has(category) ? 2 : 0;
  // Title Strength Signal
  const titleLower = job.title.toLowerCase();
  let titleStrength = 0;
  if (/\b(senior|sr\.?|principal)\b/i.test(titleLower)) titleStrength = -2;
  else if (/\b(junior|jr\.?|associate|intern)\b/i.test(titleLower)) titleStrength = -2;
  const score = trackWeight + multiTrackBonus + rankTier + categoryBonus + titleStrength;
  return { tracks, score, breakdown: `track=${tracks.join('+')}(${trackWeight}) ${multiTrackBonus ? '+multi' : ''} rank=${rankTier} ${categoryBonus ? '+cat' : ''} ${titleStrength ? `${titleStrength > 0 ? '+' : ''}${titleStrength}strength` : ''}` };
}

function computeDescScore(signals) {
  if (!signals) return { score: 0, breakdown: 'no enrichment cache hit' };
  let score = 0;
  const parts = [];
  // Toronto/GTA/Ontario: +2
  if (signals.location_match?.some(l => /toronto|gta|ontario/i.test(l))) {
    score += 2;
    parts.push('+2 Toronto');
  }
  // Fully remote US: +4
  if (signals.location_match?.includes('fully-remote-US')) {
    score += 4;
    parts.push('+4 remote-US');
  }
  // Comp signal: ±1 per $10K vs floor (lower bound)
  if (signals.comp_low_thousands && signals.comp_currency) {
    const floor = signals.comp_currency === 'USD' ? 120 : 110;
    const delta = Math.floor((signals.comp_low_thousands - floor) / 10);
    score += delta;
    parts.push(`${delta >= 0 ? '+' : ''}${delta} comp`);
  }
  // Track keywords: +1 per unique, cap +3
  const kwBonus = Math.min(3, signals.track_keywords_matched?.length ?? 0);
  if (kwBonus > 0) { score += kwBonus; parts.push(`+${kwBonus} kw`); }
  // Tech stack: +1 per unique, cap +2
  const techBonus = Math.min(2, signals.tech_stack_matched?.length ?? 0);
  if (techBonus > 0) { score += techBonus; parts.push(`+${techBonus} tech`); }
  // YoE
  if (signals.yoe_signal === '3-5') { score += 1; parts.push('+1 yoe35'); }
  else if (signals.yoe_signal === '6plus') { score -= 1; parts.push('-1 yoe6+'); }
  else if (signals.yoe_signal === '0-2') { score -= 1; parts.push('-1 yoe02'); }
  // Deal-breaker
  if (signals.deal_breaker_signal) { score -= 5; parts.push('-5 dealbreaker'); }
  return { score, breakdown: parts.join(' ') };
}

function computeBand(preScore) {
  if (preScore >= 12) return 'S';
  if (preScore >= 8) return 'A';
  if (preScore >= 4) return 'B';
  return 'C';
}
```

### §10.4 Main loop changes

Replace the existing `for (const job of jobs)` block in the Pending Jobs sheet population:

```javascript
const trackMap = parseTrackMappingFromYaml(path.join(__dirname, 'portals.yml'));
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/job-descriptions-cache.json'), 'utf8'));
} catch {}

const jobsScored = jobs.map(job => {
  const titleResult = computeTitleScore(job, trackMap, companyMap);
  const signals = cache[job.url]?.extracted_signals;
  const descResult = computeDescScore(signals);
  const preScore = titleResult.score + descResult.score;
  const band = computeBand(preScore);
  return {
    ...job,
    match_track: titleResult.tracks.join(', '),
    title_score: titleResult.score,
    desc_score: descResult.score,
    pre_score: preScore,
    priority_band: band,
    score_notes: `${titleResult.breakdown} | ${descResult.breakdown}`,
  };
});

// Sort: pre_score desc, then rank asc, then company, then title
jobsScored.sort((a, b) => {
  if (b.pre_score !== a.pre_score) return b.pre_score - a.pre_score;
  const ra = companyMap.get(a.company)?.rank ?? Infinity;
  const rb = companyMap.get(b.company)?.rank ?? Infinity;
  if (ra !== rb) return ra - rb;
  if (a.company !== b.company) return a.company.localeCompare(b.company);
  return a.title.localeCompare(b.title);
});
```

Then in row population:

```javascript
for (const job of jobsScored) {
  const meta = companyMap.get(job.company);
  pendingSheet.addRow({
    rank: meta?.rank ?? '',
    company: job.company,
    category: meta?.category ?? '',
    title: job.title,
    url: job.url,
    match_track: job.match_track,
    title_score: job.title_score,
    desc_score: job.desc_score,
    pre_score: job.pre_score,
    priority_band: job.priority_band,
    score_notes: job.score_notes,
  });
}
```

### §10.5 Conditional formatting

After populating rows, apply per-row fill based on `priority_band`:

```javascript
const BAND_FILLS = {
  'S': 'FFC6EFCE', 'A': 'FFFFEB9C', 'B': 'FFE7E6E6', 'C': 'FFFFC7CE',
};
pendingSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
  if (rowNum === 1) return; // skip header
  const band = row.getCell('priority_band').value;
  if (BAND_FILLS[band]) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND_FILLS[band] } };
  }
});
```

### §10.6 New CLI flags

Three flags per design §11.2 contract: `--top N`, `--skip-enrich`, `--cache-warn-threshold P` (default 80). Codex review caught that the third was missing from my v1 draft.

```javascript
const args = process.argv.slice(2);
const FLAGS = {
  topN: null,
  skipEnrich: args.includes('--skip-enrich'),
  cacheWarnThreshold: 80,
};
const topIdx = args.indexOf('--top');
if (topIdx >= 0 && args[topIdx + 1]) FLAGS.topN = parseInt(args[topIdx + 1], 10);
const cwtIdx = args.indexOf('--cache-warn-threshold');
if (cwtIdx >= 0 && args[cwtIdx + 1]) FLAGS.cacheWarnThreshold = parseInt(args[cwtIdx + 1], 10);
```

Apply:
- If `FLAGS.topN`, slice `jobsScored` to first N before populating.
- If `FLAGS.skipEnrich`, force `cache = {}` (don't load enrichment cache).
- AFTER export completes, compute cache hit rate = `(jobs with cache entry) / (total jobs) * 100`. If hit rate < `FLAGS.cacheWarnThreshold`, write a warning to stderr but do NOT fail the run:
  ```javascript
  const hitRate = jobs.length > 0 ? (jobs.filter(j => cache[j.url]?.extracted_signals).length / jobs.length) * 100 : 100;
  if (hitRate < FLAGS.cacheWarnThreshold) {
    console.warn(`[WARN] Cache hit rate ${hitRate.toFixed(1)}% < threshold ${FLAGS.cacheWarnThreshold}%. Run 'npm run enrich' to populate.`);
  }
  ```

### §10.7 By Company sheet additions

Add columns to `byCompanySheet`:

```javascript
{ header: 'Pre-Score Max', key: 'pre_score_max', width: 14 },
{ header: 'Pre-Score Avg', key: 'pre_score_avg', width: 14 },
{ header: 'S-Tier Count', key: 's_tier_count', width: 13 },
```

Compute aggregates in the row build.

Sort by `pre_score_max` desc.

### §10.8 Verification

```bash
cd "D:/Projects/career ops/career-ops"
node export-jobs.mjs

# Verify Excel output
python -c "
import openpyxl
wb = openpyxl.load_workbook('output/jobs-2026-04-28.xlsx')
ws = wb['Pending Jobs']
print(f'Pending Jobs sheet: {ws.max_row - 1} rows, {ws.max_column} cols')
header = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
print(f'Headers: {header}')
# Confirm new columns present
for col in ['Match Track', 'Pre-Score', 'Band']:
    assert col in header, f'Missing column: {col}'
print('OK: all new columns present')
"

# Verify --top flag
node export-jobs.mjs --top 50
# manual: open xlsx, confirm Pending Jobs has ≤50 rows
```

### §10.9 Rollback

`git checkout HEAD~1 -- career-ops/export-jobs.mjs`

### §10.10 Commit (bundled with Step 8)

See §11.

---

## §11. Step 8 — Wire into `npm run full-scan`

### §11.1 Source

Design plan §11.6.

### §11.2 Action

Edit `career-ops/package.json`. Add or update scripts:

```json
{
  "scripts": {
    "scan": "node scan.mjs",
    "custom-scrape": "node custom-scraper.mjs",
    "enrich": "node enrich-jobs.mjs",
    "export": "node export-jobs.mjs",
    "full-scan": "npm run scan && npm run custom-scrape && npm run enrich && npm run export"
  }
}
```

(If existing entries differ, preserve unrelated scripts.)

### §11.3 Verification

```bash
cd "D:/Projects/career ops/career-ops"
cat package.json | python -c "import sys, json; d = json.load(sys.stdin); print(d.get('scripts', {}))"
# Expected: includes scan, custom-scrape, enrich, export, full-scan
```

Don't actually RUN `npm run full-scan` here — that triggers the clean rescan. That's Phase 2.6 follow-up work.

### §11.4 Commit (bundled — Steps 7+8)

```
feat: export-jobs.mjs pre-scoring + banding + npm full-scan chain

Per design plan §11:
- Add 6 new columns to Pending Jobs sheet: Match Track,
  Title Score, Desc Score, Pre-Score, Band, Score Notes
- Implement parseTrackMappingFromYaml() reading YAML comment
  groups for keyword → track mapping
- Implement computeTitleScore() per design §7
- Implement computeDescScore() per design §8 with cache lookup
- Implement S/A/B/C banding per design §9
- Sort Pending Jobs by pre_score desc (rank asc tiebreaker)
- Conditional formatting per band (green/yellow/grey/red fills)
- New CLI flags: --top N, --skip-enrich
- By Company sheet adds: Pre-Score Max/Avg, S-Tier Count

Per design plan §11.6:
- Add `enrich` npm script (node enrich-jobs.mjs)
- Update `full-scan`: scan → custom-scrape → enrich → export

Verified: Pending Jobs has new columns, sorted correctly,
banding renders, --top filters, npm scripts present.

See decisions.md D-9 and design plan §11.
```

---

## §11A. Step 8.5 — Sample Run on 100 Companies (per QI-6, user-requested)

> Added in implementation plan v2 per Codex review integration + user proposal. De-risks the first end-to-end test of the new scripts (`enrich-jobs.mjs`, refactored `export-jobs.mjs`, `npm run full-scan` chain) against a small subset BEFORE committing 1000+ jobs to scan-history.tsv via the real Phase 2.6 clean rescan.

### §11A.1 Source

- User request (2026-04-29): "100 companies randomly selected from our companies list to run through on a small scale ... see how everything works ... before we do a full skill test"
- QI-6 (added to §17 in this v2 revision)

### §11A.2 Approach: temporary file swap (does NOT modify scan.mjs upstream code)

Per D-3 invariant, `scan.mjs` is upstream-vendored and untouched. We avoid modifying it via a file-swap technique:

1. Generate `career-ops/portals-sample-100.yml` from current `portals.yml` — same `title_filter`, but `tracked_companies` is a random 100-of-428 sample of `enabled: true` entries (disabled entries excluded).
2. **Backup live state**: `cp career-ops/portals.yml career-ops/portals-full-backup.yml`. Also `cp career-ops/data/pipeline.md{,.full-backup}` and `cp career-ops/data/scan-history.tsv{,.full-backup}` — sample run will produce its own pipeline+history that we'll throw away.
3. **Reset the data files** (sample run starts from clean slate): write empty pipeline.md (`## Pendientes\n\n## Procesadas\n`), write scan-history.tsv with header row only.
4. **Swap config**: `mv portals.yml portals.yml.unused && mv portals-sample-100.yml portals.yml`.
5. **Run the chain**: `npm run scan && npm run custom-scrape && npm run enrich && npm run export`. This validates all four scripts work end-to-end on real but small data.
6. **Inspect outputs**: open `output/jobs-YYYY-MM-DD.xlsx`. Spot-check Pending Jobs sheet — does sort look right? Are the new pre-score columns populated? Does banding render? Does `--cache-warn-threshold` warn appropriately?
7. **Restore live state**: `mv portals.yml.unused portals.yml` (un-swap config); restore data files from backups; delete sample artifacts.
8. **Audit findings**: any P-1 landing-page issues from the 100? Any new pitfalls? Any unexpected behavior from the new scripts?

### §11A.3 Sample selection script

```python
#!/usr/bin/env python3
"""Generate career-ops/portals-sample-100.yml — random 100 enabled companies."""
import yaml, random, sys
from pathlib import Path

RANDOM_SEED = 42  # deterministic; change to re-sample
SAMPLE_SIZE = 100

src = Path('career-ops/portals.yml')
dst = Path('career-ops/portals-sample-100.yml')

with open(src, encoding='utf-8') as f:
    data = yaml.safe_load(f)
enabled = [c for c in data['tracked_companies'] if c.get('enabled', True)]
random.seed(RANDOM_SEED)
sample = random.sample(enabled, min(SAMPLE_SIZE, len(enabled)))

# Preserve title_filter and search_queries; replace only tracked_companies
data['tracked_companies'] = sample
with open(dst, 'w', encoding='utf-8') as f:
    yaml.dump(data, f, sort_keys=False, allow_unicode=True)

print(f"Wrote {dst} with {len(sample)} companies (seed={RANDOM_SEED})")
```

Saved as `scripts/sample-portals-100.py`. Reproducible via `RANDOM_SEED`.

### §11A.4 Wall-clock estimate

| Sub-step | Time |
|---|---|
| Generate sample-100.yml | <1 min |
| Backup files + reset data | 2 min |
| Swap config | <1 min |
| `npm run scan` (16-20 of 100 are direct ATS, fast) | ~1 min |
| `npm run custom-scrape` (~80-90 branded pages, sequential? actually concurrent at 10 — will take ~5-8 min) | 5-8 min |
| `npm run enrich` (sequential per D-8, ~100 URLs assuming each company yields ~1-3 jobs = ~150-300 URLs × 2s = 5-10 min) | 5-10 min |
| `npm run export` | <1 min |
| Inspect output | 10-15 min (manual) |
| Restore live state + cleanup | 2 min |
| **Total** | **~30-40 minutes** |

### §11A.5 Acceptance criteria for the sample run

| # | Criterion | Pass/fail check |
|---|---|---|
| SR-1 | All 4 npm scripts complete without errors (exit code 0) | `npm run full-scan` returns 0 |
| SR-2 | `pipeline.md` populated with at least 50 jobs (sanity check — 100 companies should yield ≥50 jobs) | `grep -c "^- \[ \]" career-ops/data/pipeline.md` returns ≥50 |
| SR-3 | `data/job-descriptions-cache.json` has entries for at least 80% of pipeline URLs (cache write succeeds) | python diff between pipeline URLs and cache keys |
| SR-4 | Excel `Pending Jobs` sheet has all 11 columns (5 original + 6 new) | openpyxl check |
| SR-5 | Excel sorted by `pre_score` descending (top row has highest score) | openpyxl check |
| SR-6 | At least one S-tier job present (validates banding logic emits S) | openpyxl filter |
| SR-7 | `--cache-warn-threshold 99` triggers warning when run with current cache (validates warn logic) | run + grep stderr |
| SR-8 | No orphaned chrome.exe processes after Ctrl-C during a re-run (validates SIGINT handler) | manual: Task Manager check after Ctrl-C |
| SR-9 | Restore step puts `portals.yml`, `pipeline.md`, `scan-history.tsv` back to pre-sample state | `git diff` shows no changes to those files |

If any SR-N fails: STOP, debug, fix the responsible script, re-run. Don't proceed to Step 9 until all 9 pass.

### §11A.6 What the sample run validates

| Concern | Validated by |
|---|---|
| New scripts compile and run on Node ≥18 + Windows + Git Bash | SR-1 |
| `enrich-jobs.mjs` cache writes work; resume-on-failure works | SR-3 + SR-8 |
| `export-jobs.mjs` refactor doesn't break 3-sheet output; new columns render | SR-4 |
| Pre-scoring formula produces sensible distribution (S/A/B/C tiers all populated) | SR-5 + SR-6 |
| `--cache-warn-threshold` works end-to-end | SR-7 |
| Reversibility of the operation (no data corruption) | SR-9 |

### §11A.7 What the sample run does NOT validate

- Behavior at scale (rate limits, edge cases at 1000+ jobs) — only the full Phase 2.6 rescan tests this
- P-1 landing-page issues across the full 410 branded pages — only the full rescan exposes the long tail
- Calibration band thresholds against the real distribution — that's Step 9 (calibration uses scan-v1 baseline OR the post-Phase-2.6 fresh data)
- Enrichment cache TTL / expiry behavior — needs a 7-day test to validate
- Real-world description signal extraction quality across 100+ companies — only spot-checking 10-20 reveals patterns

### §11A.8 Decision: keep or skip Step 8.5

Recommended: **KEEP**. The de-risk value (catch script bugs before they pollute scan-history.tsv on the real run) outweighs the 30-40 min cost. User explicitly asked for this approach.

Skip condition: if user explicitly says "skip the sample run, go straight to full-scale", we drop Step 8.5 and proceed to Step 9 calibration directly. The implementation plan continues to function without Step 8.5.

### §11A.9 Commit message template (only if code/data changes are committed)

```
test: sample run on 100 random companies — validates new scripts end-to-end

Added scripts/sample-portals-100.py for reproducible sample generation
(seed=42). Sample run executed and SR-1 through SR-9 all passed.
Sample artifacts (portals-sample-100.yml, pre-run backup files,
sample pipeline.md/scan-history.tsv) discarded after validation.
No live-state files modified (verified via git diff).

Findings / observations from spot-check: <fill in actual findings>
```

If sample run is purely validation with no commits: no commit needed; Step 8.5 is a transient gate before Step 9.

---

## §12. Step 9 — Calibration Pass

### §12.1 Source

Design plan §9.2 (band thresholds may need tuning), §13 R-2.

### §12.2 Action

This step is OPTIONAL — only run if user wants validation against scan-v1 baseline before clean rescan.

```bash
cd "D:/Projects/career ops"
# Checkout the scan-v1-unfiltered tagged data temporarily
git stash  # save current state
git checkout scan-v1-unfiltered -- career-ops/data/pipeline.md career-ops/data/scan-history.tsv

# Note: enrichment cache won't have entries for these URLs
# Run export-jobs.mjs in --skip-enrich mode for title-only calibration
cd career-ops
node export-jobs.mjs --skip-enrich

# Open output xlsx, count S-tier / A-tier / B-tier / C-tier rows
python -c "
import openpyxl
wb = openpyxl.load_workbook('output/jobs-2026-04-28.xlsx')
ws = wb['Pending Jobs']
bands = {}
for r in range(2, ws.max_row + 1):
    band = ws.cell(r, ws.max_column - 1).value  # Band column
    bands[band] = bands.get(band, 0) + 1
print(bands)
"

# Spot-check top-10 S-tier and bottom-10 C-tier manually
# - Are top-10 S-tier obviously high-fit for Will?
# - Are bottom-10 C-tier obviously low-fit?
# If distribution is far off (e.g., S-tier is <5 rows or >300 rows),
# adjust band thresholds in export-jobs.mjs and re-run.

# Restore current state
cd ..
git checkout HEAD -- career-ops/data/pipeline.md career-ops/data/scan-history.tsv
git stash pop
```

### §12.3 Tuning rules

- If S-tier count < 10: lower S threshold from 12 to 10
- If S-tier count > 200: raise S threshold from 12 to 15
- A and B thresholds adjust proportionally
- Document any change in design plan as a follow-up note + commit message

### §12.4 Skip condition

If user says "skip calibration, run on real data first" → skip Step 9 entirely. Calibration becomes a post-rescan tuning step.

### §12.5 Commit (only if thresholds change)

```
tune: band thresholds per calibration pass

Calibration against scan-v1-unfiltered baseline (1406 jobs,
title-only since enrichment cache empty for these URLs):
- Band distribution: S=N1 / A=N2 / B=N3 / C=N4
- S-tier was too narrow/wide → adjusted S threshold from 12 to X

See design plan §12.3 tuning rules.
```

---

## §13. Step 10 — Verification Gates

### §13.1 Source

Design plan §12 (acceptance criteria 1-18).

### §13.2 Run all 18 criteria

```bash
cd "D:/Projects/career ops"

# 1-3: portals.yml inventory
python -c "
import yaml
data = yaml.safe_load(open('career-ops/portals.yml'))
companies = data['tracked_companies']
e = [c for c in companies if c.get('enabled', True)]
d = [c for c in companies if not c.get('enabled', True)]
n = [c for c in d if not c.get('note')]
assert len(companies) == 448, f'Total: {len(companies)} != 448'
assert len(e) == 428, f'Enabled: {len(e)} != 428'
assert len(d) == 20, f'Disabled: {len(d)} != 20'
assert len(n) == 0, f'Disabled missing note: {len(n)} != 0'
print('OK: criteria 1-3')
"

# 4: No URL collisions among enabled
python -c "
import yaml
data = yaml.safe_load(open('career-ops/portals.yml'))
e = [c for c in data['tracked_companies'] if c.get('enabled', True)]
urls = [c.get('careers_url') for c in e]
dupes = [u for u in set(urls) if urls.count(u) > 1]
assert not dupes, f'Dup URLs in enabled set: {dupes}'
print('OK: criterion 4')
"

# 5: Senior AI / Principal AI / Senior PM not in positives
for term in "Senior AI" "Principal AI" "Senior Product Manager"; do
  if grep -q "\"$term\"" career-ops/portals.yml; then
    echo "FAIL #5: '$term' still in portals.yml"; exit 1
  fi
done
echo "OK: criterion 5"

# 6: All required negatives present
for term in "Senior" "Sr" "Sr." "Principal" "Junior" "Jr" "Jr." "Associate"; do
  if ! grep -q "\"$term\"" career-ops/portals.yml; then
    echo "FAIL #6: '$term' missing"; exit 1
  fi
done
echo "OK: criterion 6"

# 7: All archetypes Mid-level
if grep -q 'level: "Mid-Senior"\|level: "Senior"' career-ops/config/profile.yml; then
  echo "FAIL #7: still has Mid-Senior or Senior"; exit 1
fi
echo "OK: criterion 7"

# 8: modes/_profile.md mid-level reframing — manual review
grep "Target IC band" career-ops/modes/_profile.md && echo "OK: criterion 8 (line present; manual review of framing still required)" || echo "FAIL #8"

# 9: enrich-jobs.mjs runs
test -f career-ops/enrich-jobs.mjs && echo "OK: criterion 9 (file exists; runtime test in calibration step)"

# 10: cache hit rate ≥ 90% on second run (per design criterion #10)
# Depends on Step 6 having run with at least one --company test producing cache entries.
# This gate REQUIRES enrichment cache to exist; if cache doesn't exist, the gate fails
# (which means Step 6 wasn't completed properly).
cd career-ops
if [ ! -f data/job-descriptions-cache.json ]; then
  echo "FAIL #10: data/job-descriptions-cache.json missing — Step 6 not run"
  exit 1
fi
# Run a known-cached --company twice and measure cache hit rate
SUBSET="Anthropic"
node enrich-jobs.mjs --company "$SUBSET" >/dev/null 2>&1
HITS=$(node enrich-jobs.mjs --company "$SUBSET" 2>&1 | grep -c "cached, skip")
TOTAL=$(node enrich-jobs.mjs --company "$SUBSET" 2>&1 | grep -cE "cached, skip|tier1-http|tier2-playwright")
if [ "$TOTAL" -gt 0 ]; then
  RATIO=$(awk "BEGIN { printf \"%.2f\", $HITS / $TOTAL }")
  awk "BEGIN { exit ($RATIO < 0.9) ? 1 : 0 }" && echo "OK: criterion 10 (hit rate $RATIO)" || { echo "FAIL #10: hit rate $RATIO < 0.9"; exit 1; }
else
  echo "SKIP #10: no enrichment runs to measure (subset $SUBSET produced 0 actions)"
fi
cd ..

# 11: export-jobs.mjs Excel has new columns
node career-ops/export-jobs.mjs --skip-enrich >/dev/null 2>&1
python -c "
import openpyxl, glob
xlsx = sorted(glob.glob('career-ops/output/jobs-*.xlsx'))[-1]
wb = openpyxl.load_workbook(xlsx)
header = [wb['Pending Jobs'].cell(1, c).value for c in range(1, wb['Pending Jobs'].max_column + 1)]
for col in ['Match Track', 'Pre-Score', 'Band']:
    assert col in header, f'Missing: {col}'
print('OK: criterion 11')
"

# 12: full-scan script chain — STATIC verification only.
# Per design v2.1 §12 #12 (revised): "static chain verified; live invocation
# deferred to Phase 2.6 clean rescan". Running `npm run full-scan` would
# trigger an actual scrape against 428 companies which is Phase 2.6 work,
# not a Phase 2.7 implementation acceptance test.
node -e "
const pkg = require('./career-ops/package.json');
const fs = pkg.scripts['full-scan'];
['scan', 'custom-scrape', 'enrich', 'export'].forEach(s => {
  if (!fs.includes(s)) { console.error('FAIL #12: full-scan chain missing', s); process.exit(1); }
});
console.log('OK: criterion 12 (static chain verified)');
"

# 13: grep audit for stale strings (full design v2 list, including 416/32 per Codex finding)
# Excludes audit-trail / quoted / superseded / Phase-1-historical contexts.
fail=0
for term in "Mid-Senior" "13 / 403" "13 direct" "403 branded" "17 direct" "411 branded" "416 enabled" "32 disabled" "~13 companies" "403 companies"; do
  hits=$(grep -rn --include="*.md" --include="*.yml" "$term" AI_AGENTS.md docs/STATUS.md .claude/memory/ 2>/dev/null | grep -vE "(audit trail|Earlier 2026-04|Codex caught|Codex review|earlier integration drafted|Codex correction|Replace with|all stale strings|Acceptance criterion|expanded to:|superseded|Phase 1 complete|historical|Phase 1 entry|Audited all 32)" | head -1)
  if [ -n "$hits" ]; then echo "FAIL #13: '$term' present in: $hits"; fail=1; fi
done
[ $fail -eq 0 ] && echo "OK: criterion 13"

# 14: companies-roster.md exists
test -f docs/design/companies-roster.md && echo "OK: criterion 14"

# 15: D-7..D-11 in decisions.md
for d in D-7 D-8 D-9 D-10 D-11; do
  grep -q "## $d " .claude/memory/decisions.md || { echo "FAIL #15: missing $d"; exit 1; }
done
echo "OK: criterion 15"

# 16-17: collab-check
bash ~/.claude/skills/multi-agent-collab/scripts/collab-check.sh 2>&1 | grep -q "OK: INDEX" && echo "OK: criteria 16-17"

# 18: feature branch
git branch --show-current | grep -E "^feat/" >/dev/null && echo "OK: criterion 18"

echo "=== All gates passed ==="
```

### §13.3 If a gate fails

Per `superpowers:verification-before-completion`: do NOT commit until all gates pass. Fix the failing item, re-run the full audit, repeat.

### §13.4 No commit at this step

Step 10 is verification only. No code changes.

---

## §14. Step 11 — Commit Hygiene + Final collab-check

### §14.1 Source

Framework `.collab/PROTOCOL.md`, `.collab/ROUTING.md` (fan-out matrix).

### §14.2 Final actions

1. **Append a final work-log entry** to `docs/agents/claude.md` summarizing the implementation phase with full Receipt.
2. **Update `docs/STATUS.md`**:
   - Move Phase 2.7 entry to "Done"
   - Add Phase 2.8 (implementation complete) to "Done"
   - Update handoff note: implementation complete; Phase 2.6 clean rescan pending; Phase 3 evaluation upcoming
3. **Update `.claude/memory/state.md`** with current state, next steps (clean rescan), watermark.
4. **Append D-13** to `.claude/memory/decisions.md` capturing implementation completion (only if any deviations from design plan happened during execution; otherwise skip).
5. **Append durable truths** to `.claude/memory/context.md` if any non-obvious facts emerged during implementation (e.g., "Foundation Models category added to preferred list during implementation; default preferred list is now N entries").
6. **Run `bash ~/.claude/skills/multi-agent-collab/scripts/collab-catchup.sh ack --agent claude`** to bump watermark.
7. **Run `bash ~/.claude/skills/multi-agent-collab/scripts/collab-check.sh`** for final OK.
8. **Final commit** for the work log + memory bumps.

### §14.3 Optional Codex re-review at this point

If user wants Codex review of the implementation outputs (not just the design plan), now is the time:

```bash
bash ~/.claude/skills/multi-agent-collab/scripts/collab-handoff.sh codex --from claude --message "Implementation of Phase 2.7 design plan complete. All 18 acceptance criteria pass. Please review the changes against the design plan and the §19 reviewer checklist." --files "career-ops/portals.yml career-ops/modes/_profile.md career-ops/config/profile.yml career-ops/enrich-jobs.mjs career-ops/export-jobs.mjs career-ops/package.json docs/design/companies-roster.md"
```

### §14.4 Decision: merge to main vs continue on branch

If implementation is clean and Codex approves (or user skips re-review): merge `feat/multi-agent-collab` → `main`.

If user wants to defer merge until after Phase 2.6 clean rescan validates the system end-to-end: hold on the branch.

---

## §15. Verification Gates Summary

| Step | Verification at end of step |
|---|---|
| Step 1 | python audit: 448/428/20/0 |
| Step 2 | grep: positives clean, negatives present, YAML parses, group split |
| Step 3 | grep: 6 archetypes Mid-level, no Mid-Senior or Senior |
| Step 4 | manual: read modes/_profile.md, confirm mid-level framing |
| Step 5 | file exists, has 448 rows, all disabled have notes |
| Step 6 | subset enrichment runs; cache populated; 2nd run skips cached |
| Step 7 | Excel has new columns, sorted correctly, banding renders |
| Step 8 | package.json scripts present |
| Step 9 | (optional) calibration distribution checked |
| Step 10 | all 18 acceptance criteria PASS |
| Step 11 | collab-check OK, work log + memory current |

---

## §16. Risks & Mitigations (Implementation-Specific)

| ID | Risk | Mitigation |
|---|---|---|
| RI-1 | Step 2's bare `"Senior"` in negatives unintentionally excludes a legitimate role we hadn't considered | Run a quick post-Step-2 spot-check: re-scan a small subset of 5-10 companies and review excluded titles |
| RI-2 | enrich-jobs.mjs hangs on a problematic URL | Per-company timeout (30s default); per-domain rate-limit + skip after 2 retries |
| RI-3 | Cache file gets corrupted mid-write (interrupt during JSON.stringify + writeFile) | Atomic write: write to `cache.json.tmp` then rename. Add to enrich-jobs.mjs |
| RI-4 | Track parser misses keyword that's in current portals.yml due to comment-group reformatting | Test the parser on the live portals.yml after Step 2 BEFORE Step 7 ships; assert all expected tracks emit |
| RI-5 | Calibration shows wildly different distribution than expected | Treat as a finding; don't auto-tune; surface to user before changing thresholds |
| RI-6 | Implementation accidentally modifies vendored upstream files (`career-ops/scan.mjs`, `career-ops/CLAUDE.md`, etc.) | git diff every commit to confirm only the in-scope files changed |
| RI-7 | enrich-jobs.mjs SIGINT handler fails to close Playwright cleanly → orphaned chrome.exe processes on Windows | `process.on('SIGINT', async () => { await browser?.close(); await saveCache(); process.exit(0); })`; verify on Ctrl-C during subset test |

---

## §17. Open Questions / Deferred Decisions

| # | Question | Default | Defer to |
|---|---|---|---|
| QI-1 | Sub-branch `feat/portals-cleanup-impl` for implementation, or continue on `feat/multi-agent-collab`? | Continue on `feat/multi-agent-collab` | User direction at start of Step 1 |
| QI-2 | Run Step 9 calibration before clean rescan, or skip and tune after rescan? | Skip; tune after rescan | User direction |
| QI-3 | Auto-include `AI Foundation Models` and `AI Sales / GTM AI` in preferred categories per Codex Q-3 confirmation? | Yes — add during Step 7 implementation | Implementer (no further design input needed) |
| QI-4 | scripts/generate-roster.py — write frontmatter from script, or by hand after first generation? | Write from script (one less manual step) | Implementer |
| QI-5 | Codex re-review of implementation outputs — yes or skip? | Skip if all 18 gates pass; user explicitly requests if desired | User direction at end of Step 11 |
| QI-6 | User raised: do a 100-company sample run before full implementation? | YES — add Step 8.5 "Sample run on 100 randomly-selected enabled companies" between Step 8 (npm full-scan chain) and Step 9 (calibration). See §20 for design. | User confirms 100 vs different sample size |

---

## §18. Reviewer Checklist

If you are reviewing this implementation plan (Codex or future Claude session):

- [ ] §3 commit strategy is atomic and rollback-safe (each commit reverts cleanly)
- [ ] §4 Step 1 portals.yml note prefixes match design plan §4.1 exactly
- [ ] §5 Step 2 title_filter changes match design plan §4.4 + §6.2 exactly (no new keywords introduced)
- [ ] §6 Step 3 hits all 6 archetypes; no archetype level missed
- [ ] §7 Step 4 reframing is light-touch (no factual contradictions with cv.md or knowledge bank)
- [ ] §8 Step 5 generate-roster.py output matches portals.yml live state (no drift in column logic)
- [ ] §9 Step 6 enrich-jobs.mjs design matches design plan §10 (cache schema, fetch policy, signal extraction)
- [ ] §10 Step 7 export-jobs.mjs refactor matches design plan §11 (column order, sort, banding, formatting)
- [ ] §11 Step 8 package.json full-scan chain order is correct (scan → custom-scrape → enrich → export)
- [ ] §12 Step 9 calibration approach is sound; tuning rules are documented
- [ ] §13 Step 10 verification gates cover all 18 acceptance criteria from design §12
- [ ] §14 Step 11 work log + memory updates hit all relevant fan-out routing rows
- [ ] §15 verification gates table accurate
- [ ] §16 implementation-specific risks are realistic; mitigations are concrete
- [ ] No place where the plan defers a decision the design plan should have answered

If you find issues, add a comment block at the bottom under `## §20. Implementation Plan Review Comments`.

---

## §19. Cross-references

| Reference | Path |
|---|---|
| Design plan v2 | `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md` |
| Decision log | `.claude/memory/decisions.md` D-7 through D-12 |
| Acceptance criteria | design plan §12 |
| Risks (design-level) | design plan §13 |
| Risks (implementation-level) | §16 of THIS plan |
| Framework PROTOCOL | `.collab/PROTOCOL.md` |
| Framework ROUTING | `.collab/ROUTING.md` |
| Framework handoff schema | `~/.claude/skills/multi-agent-collab/docs/handoff-schema.md` |
| Receiving review skill | `superpowers:receiving-code-review` |

---

## §20. Implementation Plan Review Comments

### Codex review — 2026-04-29T00:24:25-04:00

#### ✅ Correct

- Prior finding #1 landed: design v2 now says post-cleanup direct/branded is **18 / 410**, with Labelbox and Genmo identified as the two direct-ATS re-enables (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:149`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:152`); the implementation plan includes both Labelbox and Genmo in the 14 re-enables (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:226`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:228`), matching the current primary URLs (`career-ops/portals.yml:657`, `career-ops/portals.yml:1263`).
- Prior finding #2 landed: D-8 is clarified as enrichment-only sequential while existing scraper concurrency remains unchanged (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:60`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:47`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:49`), matching the current scraper constants (`career-ops/scan.mjs:32`, `career-ops/custom-scraper.mjs:29`, `career-ops/custom-scraper.mjs:30`).
- Prior finding #3 landed: comp scoring now uses lower-bound logic consistently in the design (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:380`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:381`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:410`) and the implementation pseudocode computes `signals.comp_low_thousands - floor` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:927`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:930`).
- Prior finding #4 landed at the design/status layer: design §5.1 now includes `AI_AGENTS.md` and `docs/STATUS.md` stale-count rows (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:180`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:187`), and the current project status has the corrected 18 / 410 counts (`docs/STATUS.md:46`, `docs/STATUS.md:58`, `docs/STATUS.md:59`).
- Prior finding #5 landed: design §6.2 defines the required GEN-AI and CREATIVE split (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:248`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:249`), and implementation Step 2 mechanically moves the same 12 current keywords from the existing combined group (`career-ops/portals.yml:74`, `career-ops/portals.yml:86`) into 5 GEN-AI keywords and 7 CREATIVE keywords without introducing new positive keywords (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:361`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:375`).
- Step 1 note prefixes match design §4.1 exactly: implementation uses `duplicate-of:`, `excluded:HW supply chain`, and `excluded:defense drones / maritime` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:241`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:257`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:258`), matching the design prefixes (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:75`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:76`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:77`).

#### ⚠ Issues to address before implementation

- §13 Step 10 does **not** cover all 18 acceptance criteria from design §12. Design criterion #10 requires a second `enrich-jobs.mjs` run with cache hit rate ≥90% (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:767`), but the final gate script jumps from #9 file existence to #11 Excel export (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1295`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1298`). Design criterion #12 says `npm run full-scan` invocation succeeds (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:769`), while the implementation plan explicitly says not to run it and only checks that the script string contains the four script names (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1130`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1310`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1318`). **Suggested fix:** either revise design criterion #12 to "static chain verified" or add a non-destructive full-scan dry-run/test target; add criterion #10 to §13.2 explicitly.
- §13 criterion #13's grep audit is still narrower than design v2. Design criterion #13 includes stale strings `416 enabled` and `32 disabled` in addition to the direct/branded stale strings (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:770`), but the implementation gate omits both terms (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1320`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1322`). **Suggested fix:** add `416 enabled` and `32 disabled` to the §13.2 term list, preserving the historical-entry exclusions if needed.
- §9 Step 6 does not fully carry forward the design's `enrich-jobs.mjs` CLI contract and introduces an undocumented `--limit` flag. The design requires `--dry-run`, `--force`, `--company <name>`, and `--rate-limit-ms <N>` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:536`), plus `--ttl-days` / `--skip-stale` behavior in cache TTL (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:570`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:572`). The implementation plan only says `parseArgs() — flags from §10.1` and then verifies with `--limit 5`, which is not in the design (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:721`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:791`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:798`). **Suggested fix:** explicitly list all design-required enrich flags in §9.2/§9.3 and either add `--limit` to design v2 as a test-only flag or replace the subset test with an existing design flag such as `--company`.
- §10 Step 7 drops one export CLI flag from design §11.2. Design includes `--cache-warn-threshold P` with default 80% (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:698`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:704`), but implementation Step 7 only sketches `--top` and `--skip-enrich` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1036`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1048`). **Suggested fix:** add `cacheWarnThreshold` parsing and a cache-hit-rate warning, or revise design §11.2 to defer that flag.
- §10 Step 7 leaves preferred categories as a placeholder while §17 QI-3 says category expansion is settled. The implementation pseudocode says `/* ... full list per design §7.3 */` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:900`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:902`), but QI-3 says to add `AI Foundation Models` and `AI Sales / GTM AI` during Step 7 (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:1430`), and Codex's design-review Q-3 also recommended `AI Data Labeling / Programmatic` while being cautious on `AI Chatbot / Consumer` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:868`). **Suggested fix:** spell out the final preferred category set in Step 7 so implementers do not choose different category constants.

#### ❓ Questions

- Should the implementation plan revise design criterion #12 before execution, since "do not run `npm run full-scan`" is sensible for avoiding the clean rescan but conflicts with the current design acceptance wording?
- Should `--limit` become an official test-only flag in design §10.1, or should subset testing be expressed through `--company <name>` to avoid expanding the script surface?

#### 💭 Optional

- Step 1's `Foxconn / Hon Hai` note is `duplicate-of: Foxconn` even though the parent Foxconn entry will also be disabled (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:247`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md:234`). This matches the selected 16/2/2 taxonomy, but the design's prefix meaning says duplicate rows are "identical to an enabled twin" (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:75`). Consider softening the design wording to "canonical twin" if this wording bothers future reviewers.

### Receipt

Review written by Codex. `career-ops/*` files were read for evidence only and not modified.

---

*End of implementation plan.*
