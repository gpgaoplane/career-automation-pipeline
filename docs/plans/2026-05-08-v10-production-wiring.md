---
status: active
type: implementation-plan
owner: claude
last-updated: 2026-05-08T00:00:00-04:00
revision: v2
read-if: "you are executing or reviewing the V10 production wiring task on feat/phase-2.8-firecrawl"
skip-if: "status != active"
related:
  - scripts/lib/job-fit-rules.mjs
  - scripts/lib/jd-sections.mjs
  - scripts/production-filter-refinement-audit.mjs
  - career-ops/export-jobs.mjs
  - career-ops/enrich-jobs.mjs
  - .claude/memory/decisions.md
  - .claude/memory/pitfalls.md
  - AI_HANDOFF.md
---

# V10 Production Wiring — Implementation Plan v2

**Branch:** `feat/phase-2.8-firecrawl` (head `3954346`)
**Tag at end:** `production-v10`
**Estimated wall-clock:** 2-3 hours including reviewer round-trip
**Reversibility:** full — single revert undoes the wire; shadow infra in `scripts/lib/` and the V10 workbook stay untouched
**Revision:** v2 (integrates 6 reviewer fixes + Will's choices: conservative R2, second reviewer pass yes, Q1=Option B columns)

---

## 1. Goal

Replace the current ad-hoc scoring stack in `career-ops/export-jobs.mjs` with the V10 rule library at `scripts/lib/job-fit-rules.mjs`, so that **the daily `npm run full-scan` Excel output reflects the same hard-drop and band semantics Will approved on 2026-05-07** in `production-filter-refinement-review-2026-05-01-v10.xlsx`.

**Definition of done:** running `node export-jobs.mjs` from `career-ops/` against the cached 2026-05-01 pipeline produces an Excel whose hard-drop count and band distribution materially match the V10 shadow workbook (target: **~536 hard drops** on the 933-row pipeline, with explicit accounting for production-only intern pre-filter — see §5).

## 2. Why "no plan needed" was wrong

State.md called this "checklist work." It isn't. Three concrete reasons:

1. **Five new hard-drop axes are being introduced** to production. Today, `export-jobs.mjs` only drops on `intern` titles and `signals.deal_breaker_signal`. V10 adds: territory (108 drops), sales (81), yoe (148), comp (1), location (361). Layered on top of source-hygiene routing for 184 source-repair-review rows.

2. **The scoring scale is different.** Current production: `pre_score = title_score + desc_score`, bands at 18/8/4 (`computeBand`). V10: `shadow_score = family + semantic + comp + yoe + location + level + rank + category`, bands at 34/24/14 (`computeShadowBand`).

3. **P-10 applies to me.** The same self-verification anti-pattern that bit Round 5 and Round 6 implementation agents (sampled wrong cohort, missed FPs) applies to this wire. Independent review on the *newly-dropped* cohort post-wire is mandatory.

## 3. Architecture

### Current pipeline (relevant slice)

```
data/pipeline.md  ──parsePipelineMd──┐
data/scan-history.tsv ──parseScanHistory─┐
career-ops/portals.yml ──loadCompanyMap, parseTrackMappingFromYaml─┐
data/job-descriptions-cache.json ─────────────────────────────────┤
                                                                  │
                                                                  ▼
                                          export-jobs.mjs main()
                                          ├─ if intern → drop
                                          ├─ if signals.deal_breaker_signal → drop
                                          ├─ computeTitleScore()
                                          ├─ computeDescScore(signals)
                                          ├─ computeBand(pre_score)
                                          └─ Excel write
```

### After wire

```
data/pipeline.md  ──parsePipelineMd──┐
data/scan-history.tsv ──parseScanHistory─┐
career-ops/portals.yml ──loadCompanyMap, parseTrackMappingFromYaml─┐
data/job-descriptions-cache.json ─────────────────────────────────┤
                                                                  │
                                                                  ▼
                                          export-jobs.mjs main()
                                          ├─ if intern → drop                          (KEEP)
                                          ├─ if signals.deal_breaker_signal → drop     (KEEP — see R2)
                                          ├─ detectSourceHygiene(...)                  (NEW — R1)
                                          ├─ if invalid → signals = {}, sections = []  (NEW)
                                          ├─ parseJdSections(content_text)             (NEW)
                                          ├─ scoreJob({job, companyMeta, signals, textSections})  (NEW)
                                          ├─ if result.hard_drop → drop with reason    (NEW)
                                          ├─ if source-repair-route → Source Repair sheet  (NEW)
                                          └─ Excel write with V10-native columns       (CHANGED — Option B)
```

### Key file map

| File | Role | Modify? |
|---|---|---|
| `scripts/lib/job-fit-rules.mjs` | V10 rule library; `scoreJob` is single entry point | **No** — single source of truth |
| `scripts/lib/jd-sections.mjs` | JD section parser; `parseJdSections` + `SECTION_ALIASES` | **No** |
| `scripts/production-filter-refinement-audit.mjs` | Reference implementation; exports `detectSourceHygiene` | **No** — read-only template; we import from it |
| `career-ops/export-jobs.mjs` | Production exporter | **Yes** — primary wire site |
| `career-ops/enrich-jobs.mjs` | Signal extraction during enrichment | **No** for this wire — signals already shape-compatible (reviewer Q4 confirmed) |
| `career-ops/data/job-descriptions-cache.json` | Already contains `content_text` and `extracted_signals` | **No** — read-only |

### Why import directly, not duplicate

`career-ops/export-jobs.mjs` will `import` from `../scripts/lib/job-fit-rules.mjs`, `../scripts/lib/jd-sections.mjs`, and `../scripts/production-filter-refinement-audit.mjs` (for `detectSourceHygiene`) directly. **No copy of any rule logic inside `career-ops/`.** Reasoning per D-22 single-source-of-truth.

Cross-boundary import verified by reviewer: ESM relative resolution uses `import.meta.url`; `from '../scripts/lib/job-fit-rules.mjs'` resolves to the canonical file regardless of `node` invocation cwd. No `node_modules` boundary crossed; no new dependencies.

## 4. Concrete wire steps

### Step 0 — pre-flight verification (5 min, read-only)

```powershell
# Sanity-confirm we're picking up from green
node scripts\test-job-fit-rules.mjs
node scripts\test-jd-sections.mjs
node scripts\test-realdata-fixtures.mjs
node scripts\test-v9-v10-diff.mjs
```

All must pass. Total assertion count target: **1,418**. If any fail, **stop and reconcile**.

Capture baseline SHA of `career-ops/output/jobs-2026-05-01.xlsx`:
```powershell
Get-FileHash career-ops\output\jobs-2026-05-01.xlsx -Algorithm SHA256
```
Must match `7bfe4ec5a099102fa0b79a5a50d874a019ceeb1e2842b38b01954e51f1ed071e`.

### Step 1 — port `export-jobs.mjs` (60-90 min)

**Sub-step 1a:** Add imports.
```js
import { parseJdSections } from '../scripts/lib/jd-sections.mjs';
import { scoreJob, formatScoreReasons } from '../scripts/lib/job-fit-rules.mjs';
import { detectSourceHygiene } from '../scripts/production-filter-refinement-audit.mjs';
```

**Sub-step 1b — Replace the scoring loop.** Current `jobs.flatMap(...)` (lines 265-288) becomes (mirrors `production-filter-refinement-audit.mjs:305-373`):

```js
let droppedIntern = 0;
let droppedDealBreaker = 0;
const droppedHardByReason = {};   // reason → count (per-reason histogram; multi-reason rows count in each)
const droppedHardUrls = new Set();  // url-set for headline row count (no double-count)
const sourceRepairRows = [];

const jobsScored = jobs.flatMap(job => {
  // Layer 1: intern pre-filter (KEEP — V10 has no equivalent)
  if (/\b(intern|internship)\b/i.test(job.title)) {
    droppedIntern++;
    return [];
  }

  const cacheEntry = cache[job.url] || {};
  const rawSignals = cacheEntry.extracted_signals || {};
  const contentText = cacheEntry.content_text || '';

  // Layer 2: deal_breaker_signal pre-filter (KEEP — conservative per R2)
  // Reasoning: extractDealBreaker catches PhD-required, no-sponsorship-remote,
  // onsite-5-days-non-Toronto, hybrid-non-Toronto. V10 likely re-catches the
  // location-shaped cases via decideLocation, but PhD and no-sponsorship-remote
  // have no obvious V10 equivalent. Keeping the early drop avoids silent FN
  // regression. Revisit after Will's review of the regenerated workbook.
  if (rawSignals.deal_breaker_signal) {
    droppedDealBreaker++;
    return [];
  }

  // Layer 3: source-hygiene gate (NEW — R1, mirrors shadow audit line 308)
  const sourceHygiene = detectSourceHygiene({ job, cacheEntry, text: contentText });
  const usableText = sourceHygiene.invalid ? '' : contentText;
  const sections = usableText ? parseJdSections(usableText) : [];
  const scoreSignals = sourceHygiene.invalid ? {} : rawSignals;
  const companyMeta = companyMap.get(job.company) || { rank: 9999, category: '' };

  // Layer 4: V10 scoring
  const result = scoreJob({ job, companyMeta, signals: scoreSignals, textSections: sections });

  // Layer 5: hard-drop routing (territory/sales/yoe/comp/location)
  // Source-hygiene-invalid rows do NOT hard-drop — they route to Source Repair
  // Review (mirrors shadow audit line 348: `sourceHygiene.invalid ? "no" : ...`).
  if (!sourceHygiene.invalid && result.hard_drop) {
    const reasons = result.hard_drop_reason.split(';').map(s => s.trim()).filter(Boolean);
    for (const r of reasons) droppedHardByReason[r] = (droppedHardByReason[r] || 0) + 1;
    droppedHardUrls.add(job.url);
    return [];
  }

  // Layer 6: source-repair routing
  // EITHER source-hygiene flagged invalid OR scoreJob annotated with
  // source_repair_or_cache_miss_review. Mirrors shadow audit line 322.
  const isSourceRepair = sourceHygiene.invalid
    || result.annotations.includes('source_repair_or_cache_miss_review');
  if (isSourceRepair) {
    sourceRepairRows.push({
      ...job,
      cache_hit: cacheEntry?.extracted_signals ? 'yes' : 'no',
      source_repair_reason: sourceHygiene.reason || (result.annotations.includes('source_repair_or_cache_miss_review') ? 'cache_miss_or_insufficient_evidence' : ''),
      source_repair_evidence: sourceHygiene.evidence || '',
      primary_family: result.primary_family,
      shadow_score: result.shadow_score,
      shadow_band: result.shadow_band,
      annotations: result.annotations.join('; '),
      score_reasons: formatScoreReasons(result),
    });
    return [];
  }

  // Layer 7: kept row — emit with V10-native shape
  return [{
    ...job,
    primary_family: result.primary_family,
    families_str: result.families.map(f => f.family || f).join(', ') || result.primary_family,
    semantic_score: result.semantic.score,
    score_parts: result.score_parts,
    shadow_score: result.shadow_score,
    shadow_band: result.shadow_band,
    hard_drop: 'no',
    hard_drop_reason: '',
    annotations_str: result.annotations.join('; '),
    score_reasons: formatScoreReasons(result),
  }];
});

// Headline summary (R3 fix: row-count vs reason-count disambiguated)
console.log(
  `Dropped at output: ${droppedIntern} intern, ${droppedDealBreaker} deal-breaker, ` +
  `${droppedHardUrls.size} V10 hard-drops (${Object.values(droppedHardByReason).reduce((a,b)=>a+b,0)} reason-hits)`
);
for (const [reason, count] of Object.entries(droppedHardByReason).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${reason}: ${count}`);
}
console.log(`Source repair review: ${sourceRepairRows.length} rows`);
```

**Sub-step 1c — Sort the kept rows.** Current sort (lines 294-301) by `pre_score desc`, `rank asc`, `company asc`, `title asc`. New sort: `shadow_score desc`, `rank asc`, `company asc`, `title asc`. Same shape, different field name.

**Sub-step 1d — Replace Pending Jobs sheet columns (Option B, V10-native).** Per Will's choice:

```js
pendingSheet.columns = [
  { header: 'Rank', key: 'rank', width: 8 },
  { header: 'Company', key: 'company', width: 30 },
  { header: 'Category', key: 'category', width: 25 },
  { header: 'Title', key: 'title', width: 50 },
  { header: 'URL', key: 'url', width: 60 },
  { header: 'Primary Family', key: 'primary_family', width: 22 },
  { header: 'Families', key: 'families_str', width: 22 },
  { header: 'Semantic', key: 'semantic_score', width: 10 },
  { header: 'Shadow Score', key: 'shadow_score', width: 13 },
  { header: 'Shadow Band', key: 'shadow_band', width: 12 },
  { header: 'Annotations', key: 'annotations_str', width: 35 },
  { header: 'Score Reasons', key: 'score_reasons', width: 50 },
];
// autoFilter range bumps from K1 → L1
pendingSheet.autoFilter = { from: 'A1', to: 'L1' };
```

Per-row band fill keyed off `shadow_band` (same `BAND_FILLS` map; map keys S/A/B/C still apply).

**Row-write loop preservation note (v2 reviewer flag):** the existing `addRow({...})` loop at `export-jobs.mjs:337-352` resolves `rank` and `category` per-row via `meta = companyMap.get(job.company)`. The wire MUST preserve this per-row lookup pattern — Layer 7 emit doesn't carry `rank`/`category`, so they must be looked up at row-write time exactly as today. Failing to preserve this drops the Rank and Category columns silently.

**Sub-step 1e — Add Source Repair Review sheet (Sheet 4 — per Will's Q2 = include).** Column shape mirrors shadow workbook line 510:

```js
const sourceRepairSheet = wb.addWorksheet('Source Repair Review');
sourceRepairSheet.columns = [
  { header: 'Company', key: 'company', width: 30 },
  { header: 'Title', key: 'title', width: 50 },
  { header: 'URL', key: 'url', width: 60 },
  { header: 'Cache Hit', key: 'cache_hit', width: 10 },
  { header: 'Source Repair Reason', key: 'source_repair_reason', width: 28 },
  { header: 'Source Repair Evidence', key: 'source_repair_evidence', width: 40 },
  { header: 'Primary Family', key: 'primary_family', width: 22 },
  { header: 'Shadow Score', key: 'shadow_score', width: 13 },
  { header: 'Shadow Band', key: 'shadow_band', width: 12 },
  { header: 'Annotations', key: 'annotations', width: 35 },
  { header: 'Score Reasons', key: 'score_reasons', width: 50 },
];
styleHeader(sourceRepairSheet.getRow(1));
sourceRepairSheet.views = [{ state: 'frozen', ySplit: 1 }];
sourceRepairSheet.autoFilter = { from: 'A1', to: 'K1' };
for (const row of sourceRepairRows) sourceRepairSheet.addRow(row);
autoWidth(sourceRepairSheet);
```

**Sub-step 1f — Update By Company sheet aggregations.** Replace `pre_score` references with `shadow_score`:
```js
const scores = list.map(x => x.shadow_score);
// pre_score_max → shadow_score_max
// pre_score_avg → shadow_score_avg
// s_tier_count: list.filter(x => x.shadow_band === 'S').length
```

Both column **keys** AND **header strings** must update for Option B consistency:

| Old key → new key | Old header → new header |
|---|---|
| `pre_score_max` → `shadow_score_max` | `Pre-Score Max` → `Shadow Score Max` |
| `pre_score_avg` → `shadow_score_avg` | `Pre-Score Avg` → `Shadow Score Avg` |
| `s_tier_count` (unchanged) | `S-Tier Count` (unchanged) |

Sheet name "By Company" unchanged. autoFilter range G1 unchanged.

**Sub-step 1g — Drop legacy helpers.** Delete `computeTitleScore`, `computeDescScore`, `computeBand`, `TRACK_WEIGHTS`, `PREFERRED_CATEGORIES`, `deriveMatchTrack`, `parseTrackMappingFromYaml` (no longer needed since V10 owns scoring; track mapping was only used to compute `match_track` for `computeTitleScore`). Remove the corresponding `parseTrackMappingFromYaml(...)` call from `main()`. **Confirm** in Step 2 that no other consumer in `career-ops/` references these.

### Step 2 — smoke-test protocol (30 min)

**Critical: P-10 lesson encoded.** Smoke test samples the **newly-dropped cohort**, not the kept cohort.

```powershell
# Regenerate today's Excel with V10 active (uses cached 2026-05-01 pipeline)
cd career-ops
node export-jobs.mjs --skip-enrich
cd ..
```

**Acceptance arithmetic (R5 fix; corrected per v2 reviewer):**
- Pipeline rows entering production = **933** (post-dedup; same as shadow input).
- Production-only intern pre-filter on cached pipeline.md catches **~0 rows** (v2 reviewer Grep'd; the production regex `/\b(intern|internship)\b/i` doesn't match "Internet Group" due to word boundary). Earlier v2 estimate of 12-15 was wrong by an order of magnitude.
- Production-only `deal_breaker_signal` early-drop swallows rows V10 would also have hard-dropped (location/yoe overlap). Per AI_HANDOFF.md: 626 deal_breaker signals exist in cache; many overlap V10 territory/yoe/location.
- Therefore: expected production `droppedHardUrls.size` ≈ shadow's **536 minus deal_breaker overlap ≈ 525-540** (very near shadow target, not 520-530 as v2 originally estimated).
- Expected source-repair sheet rows ≈ **184** (same as shadow).
- Expected main "Pending Jobs" rows ≈ 933 − 0 (intern) − N (deal_breaker, ~0-15 net of V10 overlap) − 533 (V10 hard-drop midpoint) − 184 (source-repair) ≈ **205-215**.

**Tolerance:** ±3% on `droppedHardUrls` count = 510-549 acceptable. >5% (i.e., <510 or >563) on `droppedHardUrls` → **stop and investigate**. Source-repair count: ±5% (175-194 acceptable). Reasons for relaxed expected band: deal_breaker_signal early-drop swallows V10-overlap rows non-deterministically.

**P-10-aware verification questions:**

1. **Sample 10 newly-dropped rows at random** from `droppedHardByReason` rows. For each, ask: *is this role NA-eligible / Will-eligible?* (not "does the location string look non-NA?"). At least 9/10 must be genuine drops.

2. **Diff vs the V10 shadow workbook hard-drop sheet.** Hard-drop reason histogram must match within ±5% per reason category. Note: shadow's territory_hard_drops=108 is the canonical anchor; if production reports <100 or >116, **stop**.

3. **Sample 10 *kept* S-tier rows** (Layer 7 output, shadow_band='S'). All should be Solutions/FDE/AI-Eng titles, S+B+ companies, Toronto-or-remote-eligible. Catches FN regressions.

4. **Spot-check 3 V10-closure FP cases:**
   - Cohere FDE Infrastructure Specialist → must be **kept** (preserved-correct from V10)
   - GitLab AI Engineer Bangalore → must be **dropped** (territory)
   - OpenAI AI Deployment India → must be **dropped** (territory)

5. **Confirm baseline workbook unchanged.** Re-hash `career-ops/output/jobs-2026-05-01.xlsx`; SHA must still equal `7bfe4ec5...071e`.

6. **Re-run the 1,418-assertion suite** post-edit. Must remain green.

### Step 3 — second reviewer pass (15-30 min)

Per Will's choice. Spin up a `reviewer` agent with mandate: "verify v2 fixes integrate v1 findings correctly; verify Sub-step 1b code as written matches the shadow-audit invocation pattern at lines 305-373; verify no regression risks introduced by the v2 changes; re-issue verdict." If verdict is APPROVE_FOR_EXECUTION, proceed to Step 4. If REVISE_BEFORE_EXECUTION again, fix and re-review.

### Step 4 — commit + tag (5 min)

```powershell
git add career-ops/export-jobs.mjs docs/plans/2026-05-08-v10-production-wiring.md
git commit -m "$(cat <<'EOF'
feat: wire V10 filter rules into export-jobs.mjs

Replaces ad-hoc scoring stack with the V10 rule library at
scripts/lib/job-fit-rules.mjs. Daily pipeline output now reflects
the same hard-drop and band semantics Will approved 2026-05-07.

- Imports scoreJob, parseJdSections, detectSourceHygiene
- Adds source-hygiene gate before scoring (mirrors shadow audit)
- Routes hard-drop / source-repair / kept rows independently
- Replaces Pending Jobs columns with V10-native shape
- Adds Source Repair Review sheet (~184 rows on cached 2026-05-01)
- Keeps intern + deal_breaker_signal pre-filters (conservative R2)
- Updates By Company aggregations to shadow_score scale

V10 scoring scale: bands 14/24/34 (was 4/8/18). Intentional.
Smoke test: cached 2026-05-01 input produces ~525 V10 hard-drops,
~184 source-repair rows, ~211 main-sheet rows. Within ±3% of V10
shadow workbook target (536/184/213).

Plan: docs/plans/2026-05-08-v10-production-wiring.md
Reviewer reports: agents-internal (v1 + v2 passes)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git tag production-v10
```

### Step 5 — post-wire reviewer pass (15-30 min)

Spin up a third `reviewer` agent (read-only) with mandate: review the actual diff in `career-ops/export-jobs.mjs` post-commit + adversarial-sample 10 newly-dropped rows from the regenerated workbook. Verifies P-10 anti-pattern wasn't repeated by me during smoke verification. Verdict is informational — if it surfaces an FP, decision is Will's: fix-forward or `git revert HEAD; git tag -d production-v10`.

### Step 6 — handoff updates (10 min)

- `docs/STATUS.md` — top entry for V10 production wiring DONE; handoff note rewritten.
- `.claude/memory/state.md` — overwrite to reflect production-wired state.
- `.claude/memory/decisions.md` — append D-23 (V10 production wiring decision; Option B columns; conservative R2; same-branch + standalone tag).
- `docs/agents/claude.md` — append Receipt entry.
- `.collab/INDEX.md` — bump touched files.

## 5. Smoke-test protocol — full detail

The smoke test runs against the **2026-05-01 cached pipeline** (the same data the V10 shadow workbook was generated from). This makes shadow vs production directly comparable.

1. **Snapshot** current `career-ops/data/pipeline.md` and `career-ops/data/job-descriptions-cache.json` — frozen inputs.
2. **Run** `node export-jobs.mjs --skip-enrich` from `career-ops/`.
3. **Capture** the produced `career-ops/output/jobs-2026-05-08.xlsx` (date-stamped from `new Date()` — does NOT overwrite baseline).
4. **Compare** to `career-ops/output/production-filter-refinement-review-2026-05-01-v10.xlsx` per the acceptance arithmetic in Step 2.
5. **Adversarial sample** the 10 newly-dropped rows per P-10-aware verification.
6. **Re-run** the 1,418-assertion test suite — must still be green.
7. **Re-hash** `career-ops/output/jobs-2026-05-01.xlsx` — SHA must equal the canonical baseline.

## 6. Rollback procedure

**Single-command rollback (R4 fix):**

```powershell
git revert HEAD       # NOT HEAD~1 — HEAD is the wire commit immediately post-commit
git tag -d production-v10
```

This restores `export-jobs.mjs` to its pre-wire state. Shadow infra (`scripts/lib/`, audit scripts, V10 workbook) is untouched.

**Partial-rollback case:** if smoke test reveals an issue *during* execution before commit, the file edit is scoped to `career-ops/export-jobs.mjs` only — `git checkout career-ops/export-jobs.mjs` restores it.

## 7. Reviewer findings integrated (v1 → v2)

| Finding | Severity | Resolution in v2 |
|---|---|---|
| **R1** — source-hygiene gate missing | Blocking | Sub-step 1b imports `detectSourceHygiene` from audit script; runs before `scoreJob`; zeroes signals + sections when invalid; routes invalid rows to Source Repair |
| **R2** — `signals.deal_breaker_signal` drop silently removed | Blocking | Conservative path per Will: KEEP `deal_breaker_signal` early-drop layer alongside V10. Documented in Sub-step 1b. Revisit after Will reviews regenerated workbook |
| **R3** — `droppedHard` double-counts multi-reason rows | Minor | Two counters: `droppedHardByReason` (per-reason histogram) + `droppedHardUrls` Set (headline row count) |
| **R4** — rollback uses `git revert HEAD~1` | Minor | Fixed: `git revert HEAD` immediately post-commit |
| **R5** — smoke-test ±5% optimistic re intern pre-filter | Minor | §5 adjusts: expected `droppedHardUrls.size` ≈ shadow 536 minus intern rows ≈ 520-530 band; ±3% tolerance |
| `result.families.join(', ')` won't stringify objects | Minor | Fixed: `result.families.map(f => f.family \|\| f).join(', ') \|\| result.primary_family` |

| Open question | Decision | Source |
|---|---|---|
| Q1 — column shape | **Option B (V10-native)** — Will's call after Claude's analysis (reviewer recommended A; Will and Claude agreed B is more honest) |
| Q2 — Source Repair sheet | **Include in first pass** — reviewer recommendation, Will agreed by not objecting |
| Q3 — parse JD on the fly | **Yes — on the fly** — reviewer recommendation |
| Q5 — cache-miss fallback | Confirmed safe via reviewer audit; gap covered by R1 |
| Q6 — multi-reason bucketing | **Row-Set + reason histogram separately** — reviewer recommendation |
| Q7 — no production drift | Confirmed by reviewer |

## 8. Risks and watch-outs (v2)

| Risk | Mitigation |
|---|---|
| Conservative R2 path means deal_breaker_signal swallows rows V10 also catches → double-counted as "deal-breaker drop" rather than V10 drop in summary | Acceptable for first wire; tighten in v3 after Will reviews regenerated workbook |
| `parseJdSections(content_text)` produces empty array → degraded V10 evaluation | scoreJob handles UNKNOWN family + source-repair-route annotation |
| V10 territory gate "suppression-only" spec deviation | Don't fix during wiring; if issues surface, fix in lib AND port |
| P-10: implementation agent (me) self-verifies on kept cohort | Smoke test step 2.1 forces newly-dropped sampling; Step 5 post-wire reviewer pass independently re-checks |
| Trimble PM listing-chrome FP from V10 closure | Known and deferred to V11; do **not** gate the wire on it |
| Excel column header changes break downstream consumers | None known; Will is the only consumer; he sees the V10 shape weekly |
| Baseline workbook accidentally rewritten | Output path is date-stamped from `new Date()`; smoke step 7 re-hashes baseline |
| Legacy helper deletion (Sub-step 1g) breaks unrelated import | Step 2 verification: grep for any consumer of the deleted symbols before commit |
| `--cache-warn-threshold` semantics shift (empty-cache rows now route to source-repair, not just trigger warning) | Documented; warning still fires on hit-rate computation; meaningful enough |
| `flags.topN` clipping happens AFTER V10 drops/source-repair routing — different population sliced | Acceptable; --top has always been a post-scoring slice |

## 9. What this plan deliberately does NOT do

- **Doesn't modify `scripts/lib/job-fit-rules.mjs` or `scripts/lib/jd-sections.mjs`.** Source of truth.
- **Doesn't modify `enrich-jobs.mjs`.** Signals shape is already compatible.
- **Doesn't modify `portals.yml`, `config/profile.yml`, `_profile.md`, `cv.md`.** Out of scope.
- **Doesn't run a fresh `npm run full-scan`.** Smoke test uses cached 2026-05-01 pipeline.
- **Doesn't fix Trimble PM listing-chrome FP.** Deferred to optional V11.
- **Doesn't tighten the conservative R2 path** (keeping deal_breaker_signal alongside V10). Revisit after Will reviews regenerated workbook.
- **Doesn't add new tests.** Existing 1,418 assertions cover the rule library; the wire's correctness is verified by smoke test + post-wire reviewer pass, not unit tests of `export-jobs.mjs`.

## 10. Reviewer mandate (for v2 second pass)

The reviewer agent's task is to verify v2 correctly integrates v1 findings and to spot anything new the v2 changes introduce. Specifically:

1. Read this plan v2 in full + reviewer's v1 report (v1 report is in conversation context if reviewer agent is forked; otherwise summarize from the §7 Findings table here).
2. For each of R1-R5 + the `families.join` bug: verify the v2 fix as written closes the v1 issue. Flag any partial fixes.
3. Audit Sub-step 1b code for new logic errors:
   - Is the layered drop ordering correct (intern → deal_breaker → source-hygiene → V10)? Does ordering produce the intended bucketing for accounting purposes?
   - Does `result.families.map(f => f.family || f).join(', ')` handle both shapes (object array and string array) correctly?
   - Does the source-repair routing handle the case where `sourceHygiene.invalid=true` AND scoreJob also annotates `source_repair_or_cache_miss_review`? (no double-routing — `if (isSourceRepair) {...}` is one branch)
   - Do `sourceRepairRows.push({...})` shape keys match the Sub-step 1e column keys exactly?
4. Verify Sub-step 1d column keys match Sub-step 1b's Layer 7 emit shape exactly (`primary_family`, `families_str`, `semantic_score`, `shadow_score`, `shadow_band`, `annotations_str`, `score_reasons`).
5. Verify Sub-step 1f's by-company rebuild uses `shadow_score` consistently.
6. Audit Sub-step 1g (legacy helper deletion) for any production consumer that would break. Specifically grep for: `computeTitleScore`, `computeDescScore`, `computeBand`, `parseTrackMappingFromYaml`, `deriveMatchTrack`, `TRACK_WEIGHTS`, `PREFERRED_CATEGORIES`, `GROUP_TO_TRACK` outside `export-jobs.mjs`. Flag any external consumer.
7. Smoke-test arithmetic in §5: re-derive the expected counts independently and confirm or correct.
8. Verdict: `APPROVE_FOR_EXECUTION` / `REVISE_BEFORE_EXECUTION` / `BLOCKED`.

The reviewer should **not** modify code or this plan; surface findings as a written report.

---

## Revision history

- **v1** (2026-05-08, this morning): initial plan written by Claude. Reviewer verdict `REVISE_BEFORE_EXECUTION`.
- **v2** (2026-05-08): integrates 6 reviewer fixes (R1, R2 conservative, R3, R4, R5, families.join bug) + 7 reviewer recommendations on open questions + Will's choices (Option B columns, conservative R2 path, second reviewer pass). Awaiting v2 reviewer pass before execution.
