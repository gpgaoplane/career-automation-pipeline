---
status: active
type: pitfalls
owner: codex
last-updated: 2026-05-05T11:39:22-04:00
read-if: "you are touching an area Codex has flagged before"
skip-if: "status != active or last-updated <= your watermark"
---

# Codex — Pitfalls

Append new pitfalls below. Format:

```
## P-<n> — <title> — <ISO-8601>
**Symptom:**
**Root cause:**
**Workaround:**
**Regression test:**
```

<!-- section:entries:start -->
## P-1 — Use Git Bash path for collab scripts on this Windows setup — 2026-04-28T22:32:14-04:00
**Symptom:** Running `bash ~/.claude/skills/multi-agent-collab/scripts/collab-catchup.sh ...` from PowerShell failed first with a Bash service access error, then with `/home/dalamula-test/.claude/...: No such file or directory`.
**Root cause:** The `bash` executable on PATH did not resolve to the Windows Git Bash environment/user home expected by the framework instructions.
**Workaround:** Invoke Git Bash explicitly: `& 'C:\Program Files\Git\bin\bash.exe' 'C:/Users/PC/.claude/skills/multi-agent-collab/scripts/<script>.sh' ...`.
**Regression test:** `collab-catchup.sh preview --agent codex --handoff`, `collab-handoff.sh pickup`, `collab-handoff.sh close`, and `collab-now.sh` all succeeded via the explicit Git Bash path.

## P-2 — Collab scripts may need sandbox escalation for Git Bash signal pipe — 2026-04-29T17:26:59-04:00
**Symptom:** Even with the explicit Git Bash path, `collab-catchup.sh preview --agent codex --handoff` failed once with `fatal error - couldn't create signal pipe, Win32 error 5`.
**Root cause:** Windows sandbox/permission boundary can block Git Bash signal-pipe setup.
**Workaround:** Re-run the same explicit Git Bash invocation with sandbox escalation when the signal-pipe error appears.
**Regression test:** Escalated explicit Git Bash invocations of `collab-catchup.sh preview`, `collab-handoff.sh pickup`, `collab-handoff.sh close`, and `collab-catchup.sh ack` succeeded during handoff `20260429-164715-2bcf`.

## P-3 — Firecrawl live tests can pass via skip-style warnings under sandbox network failure — 2026-04-30T11:21:39-04:00
**Symptom:** `node test-firecrawl-discover.mjs` and `node test-firecrawl-extract.mjs` exit 0 even when their live Firecrawl checks print skip-style warnings like `Network error after 3 retries: fetch failed`.
**Root cause:** The live tests intentionally degrade to warnings so unit suites stay stable without network/API access.
**Workaround:** For claims about real Firecrawl/Ashby behavior, run a focused live diagnostic with sandbox escalation and inspect the actual returned provider/slug/job counts.
**Regression test:** Escalated Ramp/Supabase validation returned `ashby/ramp` with 119 jobs and `ashby/supabase` with 46 jobs after the P-8 fix.

## P-4 — Do not use `location_match` as generic JD location coverage — 2026-04-30T16:52:37-04:00
**Symptom:** Step 10 AC-3 looked like 11-15% coverage when measured as `location_match` OR compensation, even though most enriched descriptions contained a real location string.
**Root cause:** `location_match` is intentionally narrow Will-fit scoring state, not a raw location extraction field. It only records Toronto/GTA/Ontario, Canada-only, or fully remote US signals.
**Workaround:** Use `location_raw` OR compensation for AC-3 enrichment-quality coverage; reserve `location_match` for Will-fit scoring.
**Regression test:** `node test-enrich-signals.mjs` covers Firecrawl markdown with `San Francisco` and Ashby-style `## Location` / `United Kingdom, London`; Step 10 metrics show `location_raw` OR comp at 126/178 = 70.8%.

## P-5 — Do not treat no exported jobs as one kind of failure — 2026-04-30T17:13:48-04:00
**Symptom:** The old AC-2 ">=75% companies produce jobs" gate made Step 10 look blocked at 28/50 even though many no-yield companies had healthy sources with no relevant titles or had no open jobs.
**Root cause:** The metric conflated source resolution, source health, raw job availability, Will title filters, and current hiring availability.
**Workaround:** Use the source-accounting stack: source resolution, source health, raw job availability, relevant job yield as report-only, and miss classification.
**Regression test:** `python scripts/acceptance-audit-phase2.8.py` now reads Step 10 metrics and passes AC-2 when source health is 37/38 and no-yield classification is 22/22.

## P-6 — Repo-local collab helper scripts may be absent — 2026-05-02T22:19:27-04:00
**Symptom:** PowerShell `./scripts/collab-catchup.sh preview --agent codex --handoff` failed because the repo's `scripts/` directory does not contain `collab-catchup.sh`.
**Root cause:** This checkout references framework helper commands in docs, but the executable helpers are installed under `C:/Users/PC/.claude/skills/multi-agent-collab/scripts/`, not copied into the repo.
**Workaround:** Invoke the installed skill copy via explicit Git Bash, e.g. `& 'C:\Program Files\Git\bin\bash.exe' 'C:/Users/PC/.claude/skills/multi-agent-collab/scripts/collab-catchup.sh' preview --agent codex --handoff`; use sandbox escalation if the Git Bash signal-pipe error appears.
**Regression test:** The installed `collab-catchup.sh` preview and `collab-handoff.sh pickup 20260502-205619-f5ed --from codex` succeeded via explicit Git Bash with escalation.

## P-7 — `scan-history.tsv` is not raw source inventory — 2026-05-03T00:16:47-04:00
**Symptom:** It is tempting to count absent URLs in `scan-history.tsv` as proof that the source board did not expose the job during the full run.
**Root cause:** `scan-history.tsv` records retained scanner/adapter additions after title filtering, not every raw job returned by Greenhouse/Ashby/Firecrawl.
**Workaround:** Treat `scan-history.tsv` as retained-output evidence. For raw misses, use run logs if available or label live checks as `current-board comparison`, not 2026-05-01 proof.
**Regression test:** Seed roles from xAI and ElevenLabs exist on current boards but are absent from retained full-run artifacts; their current titles mostly fail positive title matching.

## P-8 — Short positive substrings create misleading matches — 2026-05-03T00:16:47-04:00
**Symptom:** Irrelevant rows appear as AI/SA matches, such as `Storage Engineer` as AI-ENG and `Accounting Expert - Technical Accounting` as SA.
**Root cause:** Current title matching uses case-insensitive substring includes. `RAG` matches `Storage`; `Technical Account` matches `Technical Accounting`.
**Workaround:** Before broadening positives, convert short/acronym and account-related positives to phrase-aware or word-boundary matching.
**Regression test:** Visible Excel has 10 `Storage`/AI-ENG false-positive candidates and 3 `Technical Accounting`/SA false-positive candidates.

## P-9 — Prefer repo-local ignored output scratch over `C:\tmp` in tests — 2026-05-03T14:09:01-04:00
**Symptom:** `node scripts\test-fullrun-calibration-workbook.mjs` initially failed with `EPERM: operation not permitted, mkdir 'C:\tmp\career-ops-calibration-test'`.
**Root cause:** This desktop sandbox can still block direct `C:\tmp` directory creation even when `C:\tmp` is listed as writable.
**Workaround:** Use repo-local ignored scratch under `career-ops/output/.calibration-test` for generated workbook tests.
**Regression test:** The calibration workbook test suite now creates its scratch files under `career-ops/output/.calibration-test` and passes 12/12.

## P-10 — Remote and compensation words can be misleading without local evidence — 2026-05-04T17:28:08-04:00
**Symptom:** Shadow rows were incorrectly labeled as low-comp or remote-eligible when JD text contained nearby non-salary numbers or generic/fake remote language.
**Root cause:** Whole-document matching let travel percentages, multi-country phone code lists, stale cache compensation, and generic phrases like `Remote Hiring Process` or `remote-first company` affect hard-drop decisions.
**Workaround:** Require explicit money/rate markers for compensation, prefer valid high salary ranges across multiple levels, use cache comp only as weak fallback, and require genuine role-level remote evidence before overriding non-Toronto hybrid/on-site requirements.
**Regression test:** `node scripts\test-job-fit-rules.mjs` covers Glean-style travel plus high salary, SpaceX multi-level salary, dbt Austin hybrid with fake remote process, remote-first company text with Austin office requirement, and Opaque-style genuine remote allow cases.

## P-11 — Git Bash may be unusable in this Codex Windows sandbox — 2026-05-05T11:39:22-04:00
**Symptom:** `bash`, Git Bash, and `sh.exe` fail with Win32 error 5 messages such as `couldn't create signal pipe`, `CreateFileMapping ... Access denied`, or WSL `E_ACCESSDENIED`. `npx @gpgaoplane/multi-agent-collab@0.4.3 init` also failed because the Windows path to `collab-init.sh` was mangled before Bash launch.
**Root cause:** The current desktop sandbox/Windows permissions block Git Bash process setup. This is broader than the earlier intermittent signal-pipe issue.
**Workaround:** For framework maintenance in Codex, inspect package scripts and apply small declarative migrations manually, or have Claude/user run the local `scripts/collab-*.sh` helpers in an environment where Bash works. Do not assume repo-local collab helpers will execute just because they now exist.
**Regression test:** `npm.cmd view` and `npm.cmd pack` succeeded with escalation; local Bash version checks and handoff/update helper invocations failed with Win32 error 5.
<!-- section:entries:end -->
