---
status: active
type: audit
owner: claude
last-updated: 2026-05-06T17:00:00-04:00
read-if: "you are reviewing V8 source-hygiene extensions or want to know which patterns the V7 Reviewer Queue surfaced"
skip-if: "V8 already merged"
related:
  - docs/plans/2026-05-06-v8-consolidated-plan.md
  - scripts/production-filter-refinement-audit.mjs
  - career-ops/output/production-filter-refinement-review-2026-05-01-v7.xlsx
---

# V8-A4 — Source-hygiene Audit

## Method

Per plan §V8-A4 (sample expanded v2):

1. **Reviewer Queue completeness sample (75 rows):** sampled deterministically from the 410 V7 Reviewer Queue rows (seed=42, mulberry32 PRNG) and inspected URL shapes + cached body content for listing-page / chrome / no-content patterns the V7 `detectSourceHygiene` missed.
2. **Source Repair Review precision sample (25 rows):** sampled deterministically from the 184 V7 Source Repair rows; verified each is genuinely a non-JD (precision check).

Both sets were rendered to the staging files `docs/audits/.v8-source-hygiene-rq75.json` and `.v8-source-hygiene-sr25.json` for traceability (gitignored).

## Reviewer Queue findings — patterns missed by V7 hygiene

| Pattern | Match in 75-row sample | Recommendation |
|---|---|---|
| **Workday language-switcher chrome** (body == 528 chars, starts with "English - English - العربية - 简体中文 …" — Workday emits the language list before the JD when the JS-rendered job body fails to load) | **5+ occurrences** in 75 rows (Tsys/Global Payments, Expedia, Automation Anywhere, plus more) | **EXTEND `detectSourceHygiene`** — add `workday_language_switcher_chrome` reason |
| URL/body 404 fallback (Lenovo: body says "page you're looking for might have been removed, does not exist") | 1 occurrence | Already covered by V7's `page_not_found_or_closed_cache` regex — verify catches this exact text |
| `has_listing_signals` ("open positions" / "all jobs" / "view all roles" anywhere in head) | 3 occurrences in RQ | Already covered by V7 hygiene; not extending |
| `has_application_form_only` (apply-form HTML with no JD prose) | 0 occurrences | No new rule |
| URL query-listing patterns (`?location=`, `?dept=`, `?team=`, `?function=`, etc.) | **0 occurrences** in 75-row sample | Plan §V8-A4 hypothesised these; sample shows zero. **Not extending** — premature abstraction. |
| `/positions` / `/openings` path patterns | 0 occurrences | No new rule |
| placeholder URL (example.com) | 1 occurrence (Docusign AI) | Already covered by V7's `placeholder_or_invalid_url` |

**Conclusion:** Only the **Workday language-switcher chrome** pattern reaches the ≥3-occurrence threshold AND is clearly not a real JD. Added as new hygiene rule.

## Source Repair Review findings — precision check

| Pattern | Match in 25-row sample | Verdict |
|---|---|---|
| Workday language-switcher chrome (body == 528 chars) | 5 occurrences | Already correctly routed |
| Empty body (Nscale `/open-positions/ai-infrastructure-engineer` returns body_len=0) | 1 | Already routed via `missing_jd_cache` |
| Body has listing signals | 2 | Already routed |
| Looks like a real JD (mis-routed) | **0 of 25** | **100% precision** |

**Precision check passes** — 25/25 sampled rows are legitimate non-JDs. Above the ≥95% acceptance threshold.

## Implementation

Added one new hygiene pattern in `scripts/production-filter-refinement-audit.mjs` `detectSourceHygiene`:

```js
// V8-A4: Workday language-switcher chrome. Body content is the localized
// language-list dropdown rendered before the JD JS loads — body is short
// (~500 chars) and starts with "English - English - {locale list...}".
// Pure listing chrome; NO actual job description.
if (
  /myworkdayjobs\.com/i.test(url) &&
  body.length < 1500 &&
  /^\s*english\s*-\s*english\s*-\s*/i.test(first)
) {
  return { invalid: true, reason: "workday_language_switcher_chrome", evidence: evidence("workday language switcher chrome (no JD content)") };
}
```

Tests added (positive + negative):

- **Positive:** Workday URL + body matching pattern → routes to Source Repair with `workday_language_switcher_chrome`.
- **Negative:** Workday URL + real JD body containing 5K+ chars of role description → does NOT route to Source Repair.

## Predicted impact

V7 source_repair_rows = 184. V8 expected delta: roughly +5-15 rows newly routed from Reviewer Queue → Source Repair via the Workday rule. Total V8 source_repair_rows projected to fall in `[180, 210]` range per cohort-shape.

## Updated patterns NOT implemented

URL query-listing patterns (`?location=`, `?dept=`, `?team=`) yielded zero hits in the 75-row sample. Adding rules without evidence would be premature abstraction. Documented for future runs in case Will surfaces ATS shapes V7's pipeline doesn't currently encounter.
