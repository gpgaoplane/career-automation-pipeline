---
status: active
type: design-plan
owner: claude
last-updated: 2026-04-28T22:32:14-04:00
read-if: "you are about to implement the portals.yml audit, the mid-level profile pivot, or the pre-scoring system"
skip-if: "you are looking for execution steps — see the implementation plan"
related:
  - docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md
  - .claude/memory/decisions.md
  - AI_AGENTS.md
---

# Design Plan — Portals Cleanup, Mid-Level Pivot, Pre-Scoring System

> **Reviewer brief.** This plan locks the design for three coupled changes: (1) audit cleanup of `career-ops/portals.yml` to fix mis-drops + inversions, (2) profile pivot from senior-IC-target to mid-level-target, and (3) a rule-based pre-scoring system that ranks scraped jobs before manual review. Read §1-§3 for context, §4-§11 for component design, §12-§14 for acceptance and risk. Open questions in §14. Implementation steps will live in the companion implementation plan once this design is approved.

---

## §1. Motivation

| Driver | Current pain | Fix |
|---|---|---|
| Stale `portals.yml` | 14 viable AI companies disabled with no documented reason; 2 enabled companies (Foxconn, Skydio) violate Will's universal exclusions; 32 disabled rows have no `note:` field | Audit cleanup → 428 enabled / 20 disabled, every disabled row carries an explicit `note:` |
| Title-inflation expectation | Will is currently positioned at "Senior/Principal" IC band per `modes/_profile.md` and via positive filter terms `"Senior AI"`, `"Principal AI"`, `"Senior Product Manager"` in `portals.yml`. Hiring market for those bands expects 7+ YoE plus deep eng-management readiness which Will is intentionally not chasing. | Reposition Will into the mid-level (3-5 YoE) IC band. Senior/Principal removed from positives; added to negatives. Profile docs reflect new band. Pre-scoring penalizes Senior/Principal/Junior/Associate slipthrough. |
| Manual-review burden after rescan | Clean rescan will produce ~1000+ jobs in `pipeline.md`, sorted only by company rank in current Excel. Reviewing 1000 candidate roles by hand is prohibitive. | Build description-aware pre-scoring system: title-based + description-based bonuses, banded into S/A/B/C tiers. Top-tier surface area drops to ~30-50 jobs. |

## §2. Scope

### In scope

- `career-ops/portals.yml` audit cleanup: re-enable 14 mis-drops, disable 2 inversions (Foxconn rank 65, Skydio rank 437), add explicit `note:` to all 20 final disabled rows
- `career-ops/portals.yml` `title_filter` rewrite: remove `"Senior AI"`, `"Principal AI"`, `"Senior Product Manager"` from positives; add `"Senior"`, `"Sr"`, `"Sr."`, `"Principal"`, `"Junior"`, `"Jr"`, `"Jr."`, `"Associate"` to negatives
- `career-ops/modes/_profile.md` archetype levels flipped to mid-level
- `career-ops/config/profile.yml` archetype levels flipped to mid-level
- New script `career-ops/enrich-jobs.mjs`: per-job description fetcher with caching
- `career-ops/export-jobs.mjs` enhancement: pre-scoring columns + sort by composite score + S/A/B/C banding + conditional formatting
- `npm run full-scan` extended to include enrichment step
- New roster artifact `docs/design/companies-roster.md` enumerating final 428 enabled + 20 disabled
- Cross-doc propagation of decisions

### Out of scope

- `career-ops/scan.mjs` modification (vendored upstream code; not touched)
- `career-ops/CLAUDE.md`, `career-ops/AGENTS.md`, `career-ops/.claude/` (vendored upstream)
- LLM-based per-job evaluation (`/career-ops pipeline`) — pre-scoring sits BEFORE LLM eval; LLM eval is unchanged
- Concurrency in scrapers (sequential locked per D-8; revisit deferred)
- Disappearance detection for incremental rescans (Option A from earlier discussion) — captured as future enhancement; this plan handles the clean rescan via full reset, not delta detection

---

## §3. Locked Decisions Summary

These decisions become the canonical record once committed; they will be added to `.claude/memory/decisions.md` as D-7 through D-11.

| ID | Title | Status |
|---|---|---|
| D-7 | Profile pivot to mid-level (3-5 YoE) — reasoning: "Will wants to be reclassified into the mid-level pool to avoid senior/principal title inflation expectations" | locked |
| D-8 | Sequential processing for clean rescan; bounded concurrency deferred until weekly cadence justifies dev investment | locked |
| D-9 | Pre-scoring scheme: title-based component (track weight × rank tier × category alignment × title strength) + description-based component (location × comp delta × keywords × tech stack × YoE × deal-breakers); banded into S/A/B/C tiers | locked |
| D-10 | Description enrichment as a separate step (`enrich-jobs.mjs`) between scrape and export, with 7-day per-URL cache | locked |
| D-11 | portals.yml audit cleanup: 448 total → 428 enabled / 20 disabled; every disabled row gets explicit `note:` | locked |

---

## §4. portals.yml Schema Changes

### §4.1 New `note:` field convention

Every entry with `enabled: false` MUST carry a `note:` field with one of the following exact prefixes:

| Note prefix | Meaning | Count |
|---|---|---|
| `duplicate-of: <parent-name>` | URL is identical to an enabled twin; disabled to prevent double-scraping | 16 |
| `excluded:HW supply chain` | Universal exclusion per Will's profile (semiconductors / hardware manufacturing) | 2 |
| `excluded:defense drones / maritime` | Universal exclusion per Will's profile | 2 |

Optional secondary fields after the prefix are free-form (e.g., `note: "duplicate-of: Runway — Lumen Orbis is a Runway sub-unit per Excel source"`).

Empty `note:` fields are not permitted on disabled entries. Linter (manual `python` audit script during implementation) enforces.

### §4.2 The 14 mis-drops to re-enable (with verification anchor)

Source: yaml audit run 2026-04-28T18:54:45-04:00, recorded in `.claude/memory/context.md`.

| # | Name | Rank | Category | Why re-enable |
|---|---|---|---|---|
| 1 | Anysphere (Cursor) | 141 | AI Coding Tools | Major dev tool; AI-Eng track perfect fit |
| 2 | Sierra | 234 | AI Agents | Bret Taylor; AI Agents = top track |
| 3 | Tempus AI | 239 | AI Healthcare | Production AI in genomics; SA/AI-Eng track |
| 4 | Fivetran | 255 | Data Integration / AI Pipeline | Data infra for AI; AI-Eng track |
| 5 | Pigment | 302 | AI Financial Planning | AI-features fintech; PM/SA track |
| 6 | Descript | 325 | AI Video/Audio Editing | Creative AI = GenAI/Creative track |
| 7 | Tome | 344 | AI Presentations / Content | Pivoted in 2024 — confirm relevance during clean rescan; if zero results consistently, re-disable with note |
| 8 | AI coding: Tabnine | 350 | AI Coding Assistant | AI coding tools; AI-Eng track |
| 9 | Scale AI-adjacent: Labelbox | 366 | AI Data Labeling | Has direct Greenhouse URL — easy scrape |
| 10 | Twelve Labs | 377 | AI Video Understanding | Video AI; GenAI/Creative track |
| 11 | Genmo | 387 | AI Video Generation | Video AI; GenAI track |
| 12 | Nomic AI | 390 | AI Embeddings / Open-Source | Embeddings/RAG; AI-Eng track |
| 13 | Inworld AI | 423 | AI Agents | Gaming AI agents; AI Agents track |
| 14 | Nscale | 217 | AI Cloud Infrastructure | UK-based — flag location during evaluation, but otherwise relevant to AI-Eng |

All 14 receive `enabled: true` and no longer carry the implicit-disable. Their `note:` fields are removed.

### §4.3 The 2 inversions to disable

| Name | Rank | Category | Reason |
|---|---|---|---|
| Foxconn | 65 | (HW Manufacturing) | Universal exclusion: HW supply chain. Note: `excluded:HW supply chain` |
| Skydio | 437 | Autonomous Drones | Universal exclusion: defense drones. Note: `excluded:defense drones / maritime` |

### §4.4 title_filter rewrite

**Remove from `title_filter.positive`** (currently lines 67, 94, 95):
```
- "Senior Product Manager"
- "Senior AI"
- "Principal AI"
```

**Add to `title_filter.negative`** under a new comment group `# ── Too senior (above mid-level IC band) ────────────────`:
```
- "Senior"
- "Sr"
- "Sr."
- "Principal"
```

**Add to `title_filter.negative`** under a new comment group `# ── Too junior (below mid-level IC band) ─────────────────`:
```
- "Junior"
- "Jr"
- "Jr."
- "Associate"
```

`Intern`, `internship`, `co-op`, `coop`, `PhD`, `postdoc` already present and retained.

**Risk:** broad substring matching on "Senior" will exclude legitimate roles like "Senior Manager — Customer Trust" but those don't match Will's positives anyway, so no regression. "Sr" might false-positive on titles like "Mr. Sr Engineer" — extremely rare. "Jr" similarly. Acceptable.

### §4.5 Final inventory (after audit cleanup)

| Metric | Count |
|---|---|
| Total entries in `portals.yml` `tracked_companies` | 448 |
| Enabled (`enabled: true`) | 428 |
| Disabled (`enabled: false`) with explicit `note:` | 20 |
| Direct-ATS URLs (`scan.mjs` handles) | 17 (Greenhouse 7 + Ashby 6 + Workday 3 + new direct = Labelbox via greenhouse + 0 Lever; Labelbox flips from disabled to enabled, adding 1 direct-Greenhouse) |
| Branded career pages (`custom-scraper.mjs` handles) | 411 |

### §4.6 Roster artifact: `docs/design/companies-roster.md`

A read-only, auto-generated companion to `portals.yml` for human and Codex review. Markdown table sorted by rank ascending, with columns:

```
| Rank | Name | Category | careers_url | Enabled | Note |
```

Generated by a small Python script during implementation (one-shot, not a permanent tool). Stored under `docs/design/` so it sits next to other design artifacts. Re-generated whenever `portals.yml` changes materially.

---

## §5. Profile Shift — Cross-File Propagation Map

The pivot from senior-target to mid-level-target (D-7) propagates across the following files. Implementation plan must touch ALL of them in a single coordinated commit (or scoped commits if cleaner).

### §5.1 Files affected

| File | Currently says | Change to |
|---|---|---|
| `career-ops/modes/_profile.md` lines 7, 8, 9, 10, 11, 12 | archetype `Fit` cells reference "Senior" framing implicitly | reframe each archetype as mid-level fit; remove any explicit "senior IC" language in adaptive framing |
| `career-ops/config/profile.yml` `target_roles.archetypes[].level` | `"Mid-Senior"` (4 archetypes), `"Senior"` (3 archetypes) | All archetypes set to `"Mid-level"` |
| `career-ops/portals.yml` `title_filter.positive` | Includes `"Senior AI"`, `"Principal AI"`, `"Senior Product Manager"` | Remove these three entries |
| `career-ops/portals.yml` `title_filter.negative` | Excludes Staff, Lead, Intern, etc. | Add Senior, Sr, Sr., Principal, Junior, Jr, Jr., Associate |
| `AI_AGENTS.md` Project Context "Filter rationale" section | Currently says: "Will targets mid-to-senior IC roles (Senior, Principal), not the top IC band. Staff/Lead excluded." | Replace with: "Will targets mid-level IC roles (3-5 years experience). Senior, Principal, Junior, Associate, Lead, Staff, Intern all excluded at scrape time." |
| `.claude/memory/context.md` 2026-04-20 "Filter rationale" entry | Same stale wording | Replace with mid-level wording |
| `.claude/memory/context.md` 2026-04-20 "ATS URL distribution" entry | Says "13 direct / 403 branded" | Replace with "17 direct / 411 branded (after audit cleanup, Labelbox moves to direct)" |
| `.claude/memory/decisions.md` | No D-7 yet | Add D-7 capturing the pivot reasoning |
| `docs/STATUS.md` | Phase 2 listed; no audit/pivot entry | Add Phase 2.7 (audit cleanup design plan); update handoff note |
| `docs/agents/claude.md` | First entry only | Append entry covering this design phase + Receipt |

### §5.2 Why ALL of these matter

If we update `portals.yml` filters but not `modes/_profile.md`, the LLM evaluation step still scores against senior framing → mismatch.
If we update memory but not `AI_AGENTS.md`, Codex onboarding sees the stale Project Context first → mismatch.
If we update `_profile.md` but not `config/profile.yml`, the archetype-level pickup at evaluation time is stale → mismatch.
**Atomicity matters.** Implementation plan must include verification grep that no file mentions "Senior IC" / "13 / 403" / "Mid-Senior" after the change lands.

### §5.3 Risk: scan-v1-unfiltered baseline becomes a non-comparable artifact

The 1406-job baseline at git tag `scan-v1-unfiltered` (commit `06bf430`) was scraped under the OLD filter (positives included Senior/Principal AI roles). After the title_filter rewrite, those Senior/Principal jobs are no longer relevant for "job quality" comparison.

Mitigation: STATUS.md handoff note explicitly reframes scan-v1 as a *filter-effectiveness* baseline (proves new filter rejects more) rather than a *job-quality* baseline. Future weekly rescans use the post-cleanup state as the new "before" for diffs.

---

## §6. Title→Track Mapping Algorithm

Pre-scoring needs to attribute each job to a target track (AI-ENG, GEN-AI, SA, PM, CONSULT, CREATIVE, AE) so weight tables can apply.

### §6.1 Algorithm

The YAML comments in `portals.yml` `title_filter.positive` already group keywords by track:

```yaml
positive:
  # ── AI / ML Engineering ────────────────
  - "AI Engineer"
  - "ML Engineer"
  ...
  # ── Solutions / Technical Advisory ─────
  - "Solutions Architect"
  ...
```

A small parser reads the YAML file as text (NOT just via `js-yaml`, because we need the comment groups), tracks the most recent comment group for each keyword, and emits a mapping:

```javascript
{
  "AI Engineer": "AI-ENG",
  "ML Engineer": "AI-ENG",
  ...
  "Solutions Architect": "SA",
  ...
}
```

This mapping lives in memory only (recomputed on each `export-jobs.mjs` run) — no separate file to drift.

### §6.2 Comment-group → track table

| YAML comment group | Track code |
|---|---|
| `# ── AI / ML Engineering ──` | `AI-ENG` |
| `# ── Solutions / Technical Advisory ──` | `SA` |
| `# ── Sales / Business Development ──` | `AE` |
| `# ── Product Management ──` | `PM` |
| `# ── Consulting / Advisory ──` | `CONSULT` |
| `# ── Generative AI / Creative ──` | `GEN-AI` |
| `# ── Broad AI roles ──` | `AI-ENG` (fallback to AI-ENG since broad AI implies engineering) |

Implementation note: regex `/^\s*#\s*──\s*(.+?)\s*──/` to detect a group header. Map by hand-coded lookup table from the human-readable header to the track code.

### §6.3 Track derivation per job title

For each job title in `pipeline.md`:

1. Lowercase the title
2. For each positive keyword (case-insensitive substring match), record the keyword and its track
3. If multiple matches → set `match_track` = comma-joined unique tracks (e.g., `"AI-ENG, SA"`); `multi_track = true`
4. If single match → `match_track` = single track code; `multi_track = false`
5. If zero matches → should not happen because filter required ≥1 positive at scrape; if it does, `match_track = "?"` and pre-score component returns 0 with a `notes` warning

### §6.4 New CONSULT track separation

Currently the `# ── Consulting / Advisory ──` group exists in `portals.yml` (lines 68-73): `"AI Consultant"`, `"Technical Consultant"`, `"AI Advisor"`, `"AI Strategist"`, `"Technology Consultant"`. These were lumped into SA in earlier framing.

Split CONSULT off as its own track:
- Map `Consulting / Advisory` group → `CONSULT` track (NOT `SA`)
- Per Will's adjusted weights: CONSULT = 3 (separate from SA = 4)

`SA` track retains keywords from `# ── Solutions / Technical Advisory ──` group: Solutions Architect, FDE, Customer Engineer, Field Engineer, Implementation Engineer, etc.

---

## §7. Pre-Scoring Formula — Title-based Component

### §7.1 Track weights (locked from Will's instructions)

| Track | Weight |
|---|---|
| AI-ENG | 5 |
| GEN-AI | 5 |
| SA | 4 |
| PM | 4 |
| CONSULT | 3 |
| CREATIVE | 3 |
| AE | 3 |

If `multi_track = true` (job hits 2+ tracks), apply weight = max(track weights) + 1 (multi-track bonus, capped at 6).

### §7.2 Company rank tier

| Rank range | Points |
|---|---|
| 1-50 | 4 |
| 51-150 | 3 |
| 151-300 | 2 |
| 301-450 | 1 |

### §7.3 Category alignment

Static list of "Will-preferred categories" maintained in the export script:

```
preferred_categories = {
  "AI Agents", "AI 3D Generation", "AI Video Generation", "AI Video Understanding",
  "AI Video / Avatar Generation", "AI Video/Audio Editing",
  "AI Coding Tools", "AI Coding Assistant", "AI Coding / Vibe-Coding", "AI Coding CLI",
  "AI Embeddings", "AI Embeddings / Open-Source",
  "AI Cloud Infrastructure",
  "AI Healthcare", "AI Financial Planning",
  "Data Cloud / AI Features", "Data Integration / AI Pipeline",
  "AI Data Labeling"
}
```

If `category in preferred_categories`: +2 points. Else 0.

(The list lives in `export-jobs.mjs`; reviewable, easy to tune. NOT auto-derived from anywhere else.)

### §7.4 Title Strength Signal (renamed from Title Weakness Signal)

| Substring detected in title (case-insensitive) | Points |
|---|---|
| `Senior` / `Sr ` / `Sr.` / `Principal` | −2 (above mid-level band; should be filtered at scrape, but slip-through penalty) |
| `Junior` / `Jr ` / `Jr.` / `Associate` / `Intern` | −2 (below mid-level band; should be filtered at scrape, but slip-through penalty) |
| `Lead` / `Staff` / `Manager` / `Director` / `VP` / `Chief` / `Head of` | n/a — already removed by negative filter; if seen, log warning |
| no level prefix (default) | 0 |

### §7.5 Composite title-score formula

```
title_score = track_weight + rank_tier + category_alignment + title_strength_signal
            + (multi_track ? 1 : 0)

Range: -3 (mid-level role with bottom rank, no category match, slipthrough) to ~13 (multi-track high-rank in preferred category)
Typical: 4 to 9 for a relevant role
```

### §7.6 Worked example

Job: `"Senior AI Engineer"` at company `Anysphere (Cursor)` (rank 141, category `AI Coding Tools`)

- Title match: "AI Engineer" → AI-ENG (no other matches because `"Senior AI"` removed from positives) → `track_weight = 5`
- Rank 141 → tier `51-150` → +3
- Category `AI Coding Tools` ∈ preferred → +2
- Title contains `"Senior"` → −2
- `multi_track = false` → +0
- **`title_score = 5 + 3 + 2 − 2 = 8`**

Note: this job would never reach pre-scoring because the title_filter.negative now contains `Senior`, so it's filtered out at scrape time. The −2 slip-through penalty exists as a safety net for edge cases (e.g., title text variations the substring filter misses).

Job: `"Solutions Architect, AI Platform"` at `Anthropic` (rank 22, category `AI Foundation Models`)

- Title matches: "Solutions Architect" (SA), "AI Platform" (AI-ENG) → `multi_track = true`, max weight = max(4, 5) = 5, +1 multi-track bonus → effective track weight = 6
- Rank 22 → tier `1-50` → +4
- Category `AI Foundation Models` ∉ preferred (proposed list above does not include it; implementer should review and add if relevant) → 0
- No level word → 0
- **`title_score = 6 + 4 + 0 + 0 = 10`**

(This example surfaces the open question Q-3 in §14: should `AI Foundation Models` be in the preferred list? Likely yes.)

---

## §8. Pre-Scoring Formula — Description-based Component

Adds bonuses/penalties based on the actual job description text. Requires `enrich-jobs.mjs` (§10) to fetch and cache descriptions first.

### §8.1 Locked weights from user instructions

| Signal | Detection | Points |
|---|---|---|
| **Toronto / GTA / Ontario** mentioned in description | substring match (case-insensitive) on `Toronto`, `GTA`, `Greater Toronto Area`, `Ontario` | **+2** |
| **Hybrid Toronto** | match on `hybrid` AND (`Toronto` OR `GTA`) within ±200 chars | **+2** (same as above; not double-counted if both hit) |
| **Canada-only** | match on `Canada-only`, `must be located in Canada`, `Canadian residents only` | **+2** |
| **Fully remote US** (highest band) | match on `100% remote` OR `fully remote` AND (`US-based` OR `North America` OR `United States`) | **+4** |
| **Comp visible AND above target** (USD ≥$120K, CAD ≥$110K) | regex extract numeric range; compare to target floor | **+1 per $10K above target floor, no cap** |
| **Comp visible AND below target** | as above, comp range upper bound below target floor | **−1 per $10K below target floor, no cap** |
| **Will's track keywords matched in body** | substring match on a curated list (see §8.3) | **+1 per unique keyword, capped at +3** |
| **Will's tech-stack matches** | substring match on a curated list (see §8.4) | **+1 per unique match, capped at +2** |
| **YoE indicator: 3-5 years** | regex: `\b(3|4|5|3-5|3 to 5|four|five) years?\b` near `experience`/`exp` | **+1** |
| **YoE indicator: 6+ / "Senior" body language** | regex: `\b(6\+|7\+|8\+|10\+) years?\b` OR explicit "senior-level role" | **−1** |
| **YoE indicator: 0-2 years** | regex: `\b(0-2|1-2|less than 2|0 to 2) years?\b` | **−1** |
| **Hard deal-breaker phrase** | substring match on: `"must work onsite in <non-Toronto>"`, `"in-office 5 days"` AND not Toronto, `"PhD required"`, `"sponsorship not available for remote"` | **−5 to −10** |
| **Toronto on-site 4-5 days/week + comp <$120K CAD** | combined signal | **−3** (per CLAUDE.md) |

### §8.2 Comp parsing strategy

Job descriptions present comp in many formats:
- `$120,000 - $180,000 USD`
- `$120K - $180K`
- `120000-180000 USD`
- `CAD 110,000 to 150,000`
- inline mention "compensation range: ..."

Parser approach:
1. Search for known anchor phrases: `"compensation"`, `"salary range"`, `"base salary"`, `"total compensation"`, `"OTE"`, `"target compensation"`
2. Within ±300 chars of anchor, regex extract two numeric values + currency cue
3. Normalize to `[low, high]` integer thousands
4. Detect currency:
   - `USD`, `$` (without `CA`/`CAD`) → USD
   - `CAD`, `CA$`, `C$` → CAD
   - if ambiguous and country indicator says US → USD; says Canada → CAD; otherwise mark `currency: unknown` and apply NO comp signal
5. Apply target floor:
   - USD floor = 120 (i.e., $120K)
   - CAD floor = 110
6. Compute delta = `low - floor` (use lower bound; conservative)
7. Points = `delta // 10` (each $10K → 1 point), can be positive or negative
8. No cap

If no comp anchor found → 0 points (no signal).

### §8.3 Track-keyword list (preferred body keywords)

Curated for Will's tracks. Lives in `export-jobs.mjs` as a constant:

```
track_keywords = [
  // AI-ENG
  "RAG", "retrieval-augmented", "multi-agent", "agentic", "LangGraph",
  "LangChain", "LlamaIndex", "vector database", "vector db", "embeddings",
  "fine-tuning", "LoRA", "LLMOps", "MLOps", "production AI", "agent orchestration",
  // SA / CONSULT
  "Forward Deployed", "FDE", "Customer Engineer", "Solutions Architect",
  "Implementation Engineer", "client-facing", "post-deployment",
  // GEN-AI / CREATIVE
  "ComfyUI", "Stable Diffusion", "generative video", "diffusion model",
  "image generation", "video generation", "3D generation",
  // PM
  "AI roadmap", "AI product strategy", "agentic product",
  // AE
  "AI sales", "technical sales", "land and expand", "AI partnerships"
]
```

Per-job: count unique matches (case-insensitive substring). Cap +3.

### §8.4 Tech-stack list

```
tech_stack = [
  "Python", "PyTorch", "TensorFlow", "Hugging Face", "transformers",
  "LangChain", "LlamaIndex", "Pinecone", "Weaviate", "Chroma", "Qdrant",
  "OpenAI API", "Anthropic API", "Claude API", "GPT-4", "GCP", "AWS",
  "Vertex AI", "SageMaker", "Bedrock"
]
```

Per-job: count unique matches. Cap +2.

(Note: title_keywords AND tech_stack overlap on `LangChain`, `LlamaIndex` — counted in BOTH bonuses. Acceptable; the role description that mentions LangChain in both a "you'll work on" track-context and a "tech stack we use" context is doubly aligned.)

### §8.5 Composite description-score formula

```
desc_score = location_bonus
           + comp_signal           (can be negative; uncapped)
           + min(3, sum(track_keyword_matches))
           + min(2, sum(tech_stack_matches))
           + yoe_signal              (-1 / 0 / +1)
           + deal_breaker_penalty    (-5 to -10 if any)
```

Range: theoretically −15 to +25; typical: 0 to +8.

### §8.6 Worked example

Job description excerpt:
> "We're hiring a mid-level AI Engineer to join our agentic-systems team in Toronto, Canada. You'll work on RAG pipelines, LangChain orchestration, and production LLM deployments. 3-5 years of experience required. Compensation: $130,000 - $170,000 CAD."

- Location: "Toronto" detected → +2
- Comp: `$130K-$170K CAD`, target floor CAD 110, low 130, delta = 20 → +2 points
- Track keywords: `RAG`, `agentic-systems` (wait — `agentic` substring of `agentic-systems`), `LangChain` → 3 unique → cap at +3
- Tech stack: `LangChain` already counted in track-keywords; `Python` not mentioned; → 0 stack-only matches → 0
- YoE: "3-5 years" detected → +1
- No deal-breaker phrase → 0
- **`desc_score = 2 + 2 + 3 + 0 + 1 + 0 = 8`**

Combined with title_score = 10 from §7.6 example: **`pre_score = 18`** → S-tier.

---

## §9. Composite Score & Banding

### §9.1 Total formula

```
pre_score = title_score + desc_score
```

Range: theoretically −18 to +38. Typical: −2 to +18.

### §9.2 Bands

| Band | pre_score range | Action |
|---|---|---|
| **S-tier** | ≥ 12 | Review first; LLM eval via `/career-ops pipeline` |
| **A-tier** | 8 – 11 | Review next; consider batch LLM eval |
| **B-tier** | 4 – 7 | Skim; LLM eval if time permits |
| **C-tier** | ≤ 3 | Skip unless something stands out |

Band thresholds are heuristic — implementation plan should run a calibration pass against scan-v1-unfiltered (1406 jobs) to validate distribution. Adjust thresholds if S-tier is too narrow (<10 jobs) or too wide (>200 jobs).

### §9.3 Sort logic in Excel

`Pending Jobs` sheet sort:
1. `pre_score` descending (primary)
2. `rank` ascending (tiebreaker — top-ranked company first)
3. `company` ascending (secondary tiebreaker)
4. `title` ascending (tertiary)

### §9.4 Excel rendering

| Band | Cell fill |
|---|---|
| S-tier | `FFC6EFCE` (light green) |
| A-tier | `FFFFEB9C` (light yellow) |
| B-tier | `FFE7E6E6` (light grey) |
| C-tier | `FFFFC7CE` (light red) |

Conditional formatting applied to the entire row. Header row (row 1) is unaffected.

---

## §10. enrich-jobs.mjs — Component Design

### §10.1 Inputs / Outputs

| | |
|---|---|
| **Reads** | `career-ops/data/pipeline.md` (URL list), `career-ops/data/job-descriptions-cache.json` (existing cache) |
| **Writes** | `career-ops/data/job-descriptions-cache.json` (per-URL keyed JSON; updated incrementally; 7-day TTL per URL) |
| **CLI flags** | `--dry-run` (preview without writing), `--force` (refresh cache for already-cached URLs), `--company <name>` (single-company enrichment), `--rate-limit-ms <N>` (default 500ms between requests) |

### §10.2 Cache schema

```json
{
  "https://job.url/12345": {
    "url": "https://job.url/12345",
    "fetched_at": "2026-04-29T10:15:30-04:00",
    "fetch_method": "tier1-http" | "tier2-playwright" | "failed",
    "http_status": 200,
    "content_text": "...truncated to 50000 chars max...",
    "extracted_signals": {
      "location_match": ["Toronto", "Canada"],
      "comp_low_thousands": 130,
      "comp_high_thousands": 170,
      "comp_currency": "CAD",
      "track_keywords_matched": ["RAG", "agentic-systems", "LangChain"],
      "tech_stack_matched": ["Python"],
      "yoe_signal": "3-5",
      "deal_breaker_signal": null
    },
    "error": null
  },
  "https://another.url/...": { ... }
}
```

`extracted_signals` is computed at enrichment time, not at export time. This makes `export-jobs.mjs` cheap (just sums points from cache).

If extraction logic changes after enrichment, run `enrich-jobs.mjs --recompute-signals` to re-run signal extraction against existing cached `content_text` without re-fetching. (Implementation: add this flag in the v2 of the script if needed; v1 ships without it.)

### §10.3 Cache TTL

- Default: 7 days from `fetched_at`
- Configurable via `--ttl-days <N>` flag
- Cached URLs older than TTL are re-fetched on next run (unless `--skip-stale` flag is passed)

### §10.4 Fetch policy (tiered)

```
For each URL in pipeline.md not in cache (or stale):
  Tier 1: plain HTTP GET via fetch() with 30s timeout
    success criteria: status 200, response.text() length > 1000 chars, contains some HTML
    fail conditions: 4xx, 5xx, timeout, response too short → escalate to Tier 2

  Tier 2: Playwright browser navigate, wait for networkidle, get rendered HTML
    used for: sites that fail Tier 1 (JS-rendered SPAs, anti-bot challenges, etc.)
    success criteria: page text length > 1000 chars
    fail: log "extraction failed", mark cache entry with fetch_method: "failed", error: "<reason>"

  After successful fetch:
    Strip HTML to plain text (cheerio)
    Truncate to 50,000 chars (descriptions over this are unusual)
    Run signal-extraction regexes
    Write cache entry
```

### §10.5 Rate limiting

- Default 500ms sleep between requests
- Per-domain rate limit tracker: if same domain returns 429 once → bump per-domain delay to 5s and retry once → if 429 again, skip domain for this run, log warning
- All sequential (per D-8); no concurrency

### §10.6 Failure modes

| Failure | Action |
|---|---|
| Network error / timeout | Retry once after 1s. If still fails, mark `fetch_method: "failed"`, write cache entry with error, continue. |
| 4xx (404, 410, etc.) | Mark `fetch_method: "failed"`, error: `"http <code>"`. Cache it (so we don't retry every run). Important: P-1 indication. Future enhancement: when 404 detected, mark URL as "gone" in `scan-history.tsv` (Option B disappearance detection mentioned earlier). |
| 5xx | Retry once after 5s. If still fails, mark failed, do NOT cache (re-attempt next run). |
| Empty/short response | Escalate Tier 1 → Tier 2. If both fail, mark failed. |
| Browser process crash (Tier 2) | Cleanup, log, continue. |

### §10.7 Resume on Ctrl-C

Per-job cache writes after each successful enrichment. If interrupted, next run picks up where it left off (cached URLs skipped automatically).

### §10.8 Logging format

```
[2026-04-29T10:15:30-04:00] [Anysphere] tier1-http GET ... 200 (4231 chars) → signals: loc=[Toronto], comp=[$130K-$170K CAD], kw=[RAG, agentic, LangChain]
[2026-04-29T10:15:30-04:00] [Sierra]    tier1-http GET ... timeout → tier2-playwright ... 200 (12450 chars) → signals: ...
[2026-04-29T10:15:30-04:00] [Pigment]   tier1-http GET ... 404 → marked failed, P-1 candidate
```

Output piped to `career-ops/logs/enrich-YYYY-MM-DD.log` for the audit step.

### §10.9 Pseudocode

```javascript
// enrich-jobs.mjs
const CACHE = loadCache('data/job-descriptions-cache.json');
const TTL_MS = 7 * 24 * 3600 * 1000;
const RATE_LIMIT_MS = 500;
const jobs = parsePipelineMd('data/pipeline.md');

let i = 0;
for (const job of jobs) {
  i++;
  log(`[${i}/${jobs.length}] [${job.company}] ${job.url}`);

  if (CACHE[job.url] && !isStale(CACHE[job.url], TTL_MS) && !flags.force) {
    log('  cached, skip');
    continue;
  }

  let result = await fetchTier1(job.url);
  if (!result.ok) {
    result = await fetchTier2Playwright(job.url);
  }

  if (result.ok) {
    const signals = extractSignals(result.text);
    CACHE[job.url] = {
      url: job.url,
      fetched_at: nowIso(),
      fetch_method: result.tier,
      http_status: result.status,
      content_text: result.text.slice(0, 50000),
      extracted_signals: signals,
      error: null
    };
    saveCache('data/job-descriptions-cache.json', CACHE);  // per-job write for resume safety
  } else {
    CACHE[job.url] = {
      url: job.url,
      fetched_at: nowIso(),
      fetch_method: 'failed',
      http_status: result.status,
      content_text: null,
      extracted_signals: null,
      error: result.error
    };
    saveCache('data/job-descriptions-cache.json', CACHE);
  }

  await sleep(RATE_LIMIT_MS);
}
```

`extractSignals(text)` is a pure function that runs all the regexes from §8 and returns the structured object. Easy to unit-test.

---

## §11. export-jobs.mjs — Enhancement Design

### §11.1 New columns in `Pending Jobs` sheet

Existing columns: Rank, Company, Category, Title, URL.

New columns appended:

| Column | Source | Format |
|---|---|---|
| `match_track` | derived from title-track mapping (§6) | comma-joined codes (e.g., `"AI-ENG, SA"`) |
| `title_score` | from §7.5 | integer, can be negative |
| `desc_score` | from §8.5 (looked up in cache); 0 if cache miss | integer, can be negative |
| `pre_score` | `title_score + desc_score` | integer, primary sort key |
| `priority_band` | from §9.2 | string: `"S"`, `"A"`, `"B"`, `"C"` |
| `score_notes` | reasoning string | e.g., `"multi-track + top-50 rank + Toronto + 3-5y match"` |

### §11.2 New CLI flags

| Flag | Behavior |
|---|---|
| `--top N` | Filter pending sheet to top N by `pre_score`. Default: no filter (all jobs included). |
| `--skip-enrich` | Don't read enrichment cache; `desc_score` set to 0 for all jobs. Use when iterating quickly without re-running enrichment. |
| `--cache-warn-threshold P` | Warn if cache hit rate < P% (default 80%). Helps catch stale-cache situations. |

### §11.3 Conditional formatting in Excel

Apply per-row fill based on `priority_band` value (§9.4 palette).

### §11.4 By Company sheet additions

| Column | Source |
|---|---|
| `pre_score_max` | max `pre_score` across that company's pending jobs |
| `pre_score_avg` | mean `pre_score` |
| `s_tier_count` | count of S-tier jobs at that company |

Sort by `pre_score_max` descending.

### §11.5 Pseudocode integration

```javascript
// export-jobs.mjs (sketch of additions)
const trackMap = parseTrackMappingFromYaml('portals.yml');  // §6.1
const enrichmentCache = loadCacheIfExists('data/job-descriptions-cache.json');

for (const job of jobs) {
  const titleScore = computeTitleScore(job, trackMap, companyMap);  // §7
  const descScore = enrichmentCache[job.url]?.extracted_signals
                       ? computeDescScore(enrichmentCache[job.url].extracted_signals)  // §8
                       : 0;
  const preScore = titleScore + descScore;
  const band = preScore >= 12 ? 'S'
             : preScore >= 8  ? 'A'
             : preScore >= 4  ? 'B'
             : 'C';
  const notes = buildNotes(job, titleScore, descScore);
  // ... write row including new columns ...
}
```

### §11.6 Wire into `npm run full-scan`

Current chain (per `package.json` we'll verify in implementation): `scan` → `custom-scrape` → `export`.

New chain: `scan` → `custom-scrape` → `enrich` → `export`.

Add `enrich` script in `package.json`. `full-scan` script becomes the chained version.

---

## §12. Acceptance Criteria

A reviewer (or future-us) declares this work complete when ALL the following hold:

| # | Criterion | Verification |
|---|---|---|
| 1 | `portals.yml` total = 448 (no entries lost in cleanup) | `grep -c "^  - name:" portals.yml` returns 448 |
| 2 | `portals.yml` enabled = 428 | `grep -c "    enabled: true" portals.yml` returns 428 |
| 3 | `portals.yml` disabled = 20, all with non-empty `note:` | python audit: zero disabled rows missing `note:` |
| 4 | No URL collisions between two ENABLED entries | python audit: no duplicate `careers_url` in enabled set |
| 5 | `title_filter.positive` no longer contains `"Senior AI"`, `"Principal AI"`, `"Senior Product Manager"` | grep returns no matches |
| 6 | `title_filter.negative` contains all of: `Senior`, `Sr`, `Sr.`, `Principal`, `Junior`, `Jr`, `Jr.`, `Associate` | grep finds each |
| 7 | All archetypes in `config/profile.yml` set to `level: "Mid-level"` | grep no longer finds `"Mid-Senior"` or `"Senior"` as archetype levels |
| 8 | `modes/_profile.md` adaptive framing reflects mid-level positioning | manual review |
| 9 | `enrich-jobs.mjs` exists, runs, produces valid `data/job-descriptions-cache.json` | invocation succeeds, cache file valid JSON, sample entry has `extracted_signals` |
| 10 | `enrich-jobs.mjs` cache hit rate ≥ 90% on second run | run twice, second run reports ≥ 0.9 hits/total |
| 11 | `export-jobs.mjs` produces Excel with new columns + sorted by `pre_score` desc | open xlsx, top-10 spot-check |
| 12 | `npm run full-scan` chains scan + custom-scrape + enrich + export | invocation succeeds |
| 13 | All cross-file propagations done (the §5.1 file list — 11 files total touched) | grep audit script: zero hits for "Mid-Senior" or "13 / 403" stale strings |
| 14 | `docs/design/companies-roster.md` exists and matches portals.yml live state | manual visual diff |
| 15 | `.claude/memory/decisions.md` has D-7..D-11 entries | grep finds them |
| 16 | `.collab/INDEX.md` registers `enrich-jobs.mjs` and `companies-roster.md` and the design plan | collab-check passes |
| 17 | `collab-check` reports `OK: INDEX and filesystem aligned` | invocation passes |
| 18 | All changes on a feature branch; commits are atomic | `git log` review |

---

## §13. Risks & Mitigations

| ID | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R-1 | enrichment fetch trips per-domain rate limits → some companies skip | Medium | Low (skip is recoverable; re-run picks up) | Per-domain bump-and-skip logic in §10.5 |
| R-2 | signal-extraction regexes false positive (e.g., "$170 monthly fee" parsed as $170K comp) | Medium | Medium (wrong score → wrong band) | Calibration pass against scan-v1 baseline (1406 jobs); spot-check top-10 and bottom-10 of each band; tune regexes |
| R-3 | profile shift makes scan-v1 incomparable for "job quality" | High | Low (we anticipated this) | Reframe scan-v1 as filter-effectiveness baseline only in STATUS.md handoff note (§5.3) |
| R-4 | 14 re-enabled companies turn out genuinely irrelevant (e.g., Tome is fully defunct) | Medium | Low (next clean rescan reveals; re-disable with note) | Roster artifact `docs/design/companies-roster.md` for visual audit; flag re-enables in implementation commit message |
| R-5 | `@import` shim in root `CLAUDE.md` still unverified for Claude Code resolver | Medium | Medium (Codex sees broken setup if Claude session is needed for context) | Verify on the very next Claude session start (out of scope of this plan but flagged as IMMEDIATE next-step) |
| R-6 | Codex review surfaces design flaws | Low (welcomed) | Low | Iterate per `receiving-code-review` skill: integrate, push back with reasoning, OR mark deferred to implementation. Worst case: this plan needs a v2 |
| R-7 | Description fetcher gets blocked by Cloudflare/anti-bot on some career sites | Medium | Low (those companies just have desc_score = 0; title-score still applies) | Tier 2 Playwright handles most; persistent failures land in `fetch_method: failed` and don't break the run |
| R-8 | Excel conditional formatting performance issue with 1000+ rows | Low | Low | exceljs handles thousands of rows fine in our prior testing; if pain emerges, switch to per-cell fill instead of conditional formula |
| R-9 | Title-track mapping doesn't cover "Broad AI roles" group cleanly | Low | Low | §6.2 explicitly maps it to AI-ENG (engineering-implied); reviewer can challenge |
| R-10 | Comp parser misses CAD/USD ambiguity on "no currency mentioned" descriptions | High | Low (no points awarded — neither bonus nor penalty) | Conservative: only apply comp signal when currency is unambiguous (§8.2 step 4) |

---

## §14. Open Questions (for review feedback)

| # | Question | Default proposal | Where to capture answer |
|---|---|---|---|
| Q-1 | Should `--top N` default to a value (e.g., 200) instead of "show all"? | Default to "show all"; user passes `--top 200` when they want filter. | implementation plan |
| Q-2 | Cache description as raw HTML or extracted text? | Extracted text only (cheerio strip → 50K char cap). Re-extraction from raw HTML would require a `--refetch` mode anyway. Saves ~80% disk. | confirm in design review |
| Q-3 | `AI Foundation Models` and other categories not in §7.3 preferred list — add or leave? | Add: `AI Foundation Models`, `Foundation Models`, `AI Chatbot / Consumer` (selectively), `AI Sales / GTM AI` (if any). Implementer audits portals.yml unique categories during cleanup. | design review or implementation |
| Q-4 | `enrich-jobs.mjs` automatic in `npm run full-scan`, or always require explicit invocation? | Automatic in `full-scan`. Skippable via `npm run scan && npm run custom-scrape && npm run export -- --skip-enrich` for fast iteration. | confirm in design review |
| Q-5 | Track classification for `"Senior AI"`-removed orphan keywords like `"AI Architect"` and `"Enterprise Architect"` (currently in SA group) — keep there? | Keep in SA. Both fit Solutions Architect framing. | confirm |
| Q-6 | Should `Tome` go straight to disabled (it's pivoted/defunct) or be re-enabled and re-evaluated after clean rescan? | Re-enable per the "no exclusion reason found" rule; if zero results consistently, re-disable in a future cleanup with `note: defunct/pivoted away from AI presentations` | confirm |
| Q-7 | Should the comp-signal `−1 per $10K below` apply also when comp range LOW < target floor but comp range HIGH ≥ target floor (e.g., role lists $100K-$140K USD; floor is $120K)? | YES, use the LOW bound conservatively (matches `target_range_usd: $120K-$180K USD` floor in profile.yml). User instruction: "anything lower than our described range" — interpreting LOW < FLOOR as "lower". | confirm |
| Q-8 | Multi-track bonus cap: I proposed +1 (effective max weight = 6); should it scale with N tracks (e.g., +1 per additional, capped at +3)? | Keep flat +1. Multi-track is a binary signal; "matches 2+ tracks" is the relevant feature, not "matches 4 tracks". | confirm |

---

## §15. Cross-references

| Reference | Path |
|---|---|
| Decision log entries to add | `.claude/memory/decisions.md` D-7 through D-11 |
| Affected files (full propagation) | §5.1 in this doc |
| Implementation plan | `docs/plans/2026-04-28-portals-cleanup-and-prescoring-implementation.md` (to be written after this design plan is reviewed and approved) |
| Framework plan-artifact convention | `.collab/ROUTING.md` row 2 (Created a plan or design artifact) |
| Framework end-of-task Receipt | `.collab/PROTOCOL.md` |
| Framework handoff schema | `~/.claude/skills/multi-agent-collab/docs/handoff-schema.md` |

---

## §16. Reviewer Checklist

If you are reviewing this plan (Codex or future Claude session), please assess:

- [ ] §3 Locked Decisions match user intent as stated in Claude session 2026-04-28 conversation transcript
- [ ] §4 portals.yml schema changes will not break `scan.mjs` or `custom-scraper.mjs` parsing (verify by reading both)
- [ ] §5.1 propagation map is complete (no file missed; cross-check by grepping for stale strings: "Mid-Senior", "Senior IC", "13 / 403", "13 direct", "403 branded")
- [ ] §6 title-track mapping algorithm is unambiguous and parser-friendly
- [ ] §7 weights match user's stated values: AI-ENG=5, GEN-AI=5, SA=4, PM=4, CONSULT=3, CREATIVE=3, AE=3
- [ ] §8 description-based weights match user's stated values: Toronto=+2, fully-remote-US=+4, comp = ±1 per $10K (no cap), keywords +3 cap, tech +2 cap
- [ ] §10 enrich-jobs.mjs design handles failure modes gracefully; cache is resume-safe
- [ ] §11 export-jobs.mjs additions don't break existing 3-sheet output
- [ ] §12 acceptance criteria are objectively verifiable (every one has a grep, count, or open-and-look check)
- [ ] §13 risks ranked appropriately
- [ ] §14 open questions: any that should be design-decided before implementation rather than deferred?
- [ ] No place where ambiguity survives that could lead to two implementers building incompatible things

If you find issues, add a comment block at the bottom of this file under `## §17. Review Comments`. Sender (claude) will integrate or push back per `superpowers:receiving-code-review` skill.

---

## §17. Review Comments

### Codex review — 2026-04-28T22:30:12-04:00

#### ✅ Things that look correct

- §4 schema extension should not break the existing scrapers: both scrapers parse `portals.yml` through `js-yaml`, filter only on `enabled !== false`, and ignore unknown company fields such as a future `note:` (`career-ops/scan.mjs:264`, `career-ops/scan.mjs:270`, `career-ops/custom-scraper.mjs:550`, `career-ops/custom-scraper.mjs:557`).
- §4.4 correctly identifies the current senior-positive terms: `Senior Product Manager`, `Senior AI`, and `Principal AI` are present in `title_filter.positive` today (`career-ops/portals.yml:67`, `career-ops/portals.yml:94`, `career-ops/portals.yml:95`).
- §5 correctly identifies the current archetype-level source of truth: `config/profile.yml` currently has `Mid-Senior` and `Senior` archetype levels that need to become `Mid-level` (`career-ops/config/profile.yml:24`, `career-ops/config/profile.yml:28`, `career-ops/config/profile.yml:40`).
- §11 fits the current exporter shape: `export-jobs.mjs` has a simple three-sheet structure with `Pending Jobs`, `By Company`, and `Scan History`, so appending score columns and changing the sort are localized changes (`career-ops/export-jobs.mjs:100`, `career-ops/export-jobs.mjs:125`, `career-ops/export-jobs.mjs:163`).

#### ⚠ Issues to address before implementation

- §4.5 / §5.1: The post-cleanup direct/branded count appears off by one. The current file has 16 enabled direct-ATS URLs by the same patterns `scan.mjs` and `custom-scraper.mjs` use; two planned re-enables are direct ATS URLs: Labelbox is direct Greenhouse (`career-ops/portals.yml:654`, `career-ops/portals.yml:657`) and Genmo is direct Ashby (`career-ops/portals.yml:1260`, `career-ops/portals.yml:1263`). Since direct Greenhouse/Ashby URLs are exactly what the scrapers classify as direct (`career-ops/scan.mjs:45`, `career-ops/scan.mjs:63`, `career-ops/custom-scraper.mjs:177`, `career-ops/custom-scraper.mjs:181`), the planned inventory should be **18 direct / 410 branded**, not 17 / 411, unless Genmo or Labelbox is intentionally not re-enabled. **Suggested fix:** update §4.5, §5.1, `.claude/memory/context.md`, and any STATUS/AI_AGENTS counts to 18 / 410, or explicitly exclude one of those two from the 14 re-enables.
- §3 / D-8: "Sequential processing for clean rescan" conflicts with the current scrapers. `scan.mjs` runs `CONCURRENCY = 10` (`career-ops/scan.mjs:32`, `career-ops/scan.mjs:323`), and `custom-scraper.mjs` runs API concurrency 10 plus Playwright concurrency 5 (`career-ops/custom-scraper.mjs:29`, `career-ops/custom-scraper.mjs:30`, `career-ops/custom-scraper.mjs:593`, `career-ops/custom-scraper.mjs:718`). §2 says scraper concurrency is out of scope (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:47`), so two implementers could disagree on whether to change the existing scrapers. **Suggested fix:** clarify D-8 as either "enrichment is sequential; existing scan/custom-scraper concurrency remains" or add explicit implementation work to force clean-rescan concurrency to 1.
- §8.1 / §8.2 / Q-7: The comp penalty rule is internally inconsistent. §8.1 says below-target penalty applies when the **upper bound** is below the floor (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:369`), but §8.2 computes `low - floor` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:398`), and Q-7 says to penalize when `LOW < FLOOR` even if high clears the floor (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:794`). **Suggested fix:** make §8.1 match §8.2/Q-7: use lower bound for both positive and negative comp signals.
- §5.1 propagation map is missing stale-count locations outside the named "Filter rationale" row. `AI_AGENTS.md` still says `portals.yml (448 companies, 416 enabled)` in the architecture diagram and "416 enabled (32 disabled)" in Companies Source (`AI_AGENTS.md:217`, `AI_AGENTS.md:288`), while `docs/STATUS.md` still says `scan.mjs: ~13 companies` and `custom-scraper.mjs: 403 companies` (`docs/STATUS.md:58`, `docs/STATUS.md:59`). §5.1 only points at the Project Context filter rationale and old `.claude` entries (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:175`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:177`), and acceptance criterion 13 only greps for `"Mid-Senior"` / `"13 / 403"` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:758`). **Suggested fix:** add explicit §5.1 rows for the AI_AGENTS architecture/counts and STATUS Up Next counts; expand verification grep to include `416 enabled`, `32 disabled`, `~13 companies`, `403 companies`, `17 direct`, and `411 branded` (or the corrected 18/410 values).
- §6 / §7: The `CREATIVE` title track is defined in weights but no parser path can emit it. The only relevant YAML group is the combined `Generative AI / Creative` block (`career-ops/portals.yml:74`, `career-ops/portals.yml:86`), while §6.2 maps that group to `GEN-AI` and has no `CREATIVE` mapping (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:239`). §7.1 nevertheless assigns `CREATIVE = 3` (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:277`). **Suggested fix:** either split the YAML group into separate `Generative AI` and `Creative` groups, map specific keywords like `Creative Technologist`, `Technical Artist`, `ComfyUI`, and `LoRA` to `CREATIVE`, or remove `CREATIVE` from title scoring and keep it only as a narrative target role.

#### ❓ Open questions / clarifications needed from claude

- Q-1: Keep default `--top` as "show all"; filtering should be an explicit user choice for the first calibration run.
- Q-2: Extracted text only is fine for v1 because the cache still stores `content_text`; raw HTML is not worth the bloat unless DOM-aware extraction becomes necessary.
- Q-3: Add `AI Foundation Models`, `Foundation Models`, `AI Sales / GTM AI`, and likely `AI Data Labeling / Programmatic`. I would be cautious on blanket `AI Chatbot / Consumer`; xAI/Grok is currently disabled (`career-ops/portals.yml:328`, `career-ops/portals.yml:332`) and should not become preferred-category evidence by accident.
- Q-4: Automatic `enrich` in `full-scan` is right, but keep `npm run export -- --skip-enrich` available for fast local iteration.
- Q-5: Keep `AI Architect` and `Enterprise Architect` in SA; they sit in the current Solutions / Technical Advisory group (`career-ops/portals.yml:37`, `career-ops/portals.yml:51`).
- Q-6: Re-enable Tome once under the "no undocumented disables" rule, then re-disable with an explicit note if the clean rescan proves it is dead or irrelevant (`career-ops/portals.yml:1082`, `career-ops/portals.yml:1086`).
- Q-7: Use the low bound. This matches the conservative target-floor interpretation, but §8.1 needs the wording fix above.
- Q-8: Keep the multi-track bonus flat at +1; otherwise broad titles that happen to match many substrings can overpower clearer single-track roles.

#### 💭 Optional improvements (defer-able)

- §10.8 writes enrichment logs to `career-ops/logs/enrich-YYYY-MM-DD.log`, while the existing custom scraper writes logs under `career-ops/batch/logs` (`career-ops/custom-scraper.mjs:26`, `career-ops/custom-scraper.mjs:521`). Consider using `batch/logs` for consistency.
- §12 acceptance criterion 13 says "11 files total touched", but §5.1 currently lists 10 rows and fewer unique files (`docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:169`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:180`, `docs/plans/2026-04-28-portals-cleanup-and-prescoring-design.md:758`). Clarify whether this means rows, unique files, or the full implementation touch set.

### Receipt

Review written by Codex. Config/code files under `career-ops/` were read for evidence only and not modified.

---

*End of design plan. Implementation plan to follow.*
