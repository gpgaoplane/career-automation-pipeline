---
status: active
type: audit
owner: codex
last-updated: 2026-04-30T15:25:01-04:00
read-if: "you need the source of truth for the Phase 2.8 Step 0 disabled-company audit"
skip-if: "status != active"
related:
  - career-ops/portals.yml
  - scripts/portals-apply-triage-fixes.py
---

# Step 0 Disabled-Company Audit

Phase 2.8 Step 0 reduced the enabled roster from 428 to 388 by disabling 40 companies. Codex re-audited those 40 on 2026-04-30 and split them into three separate concepts:

- `enabled`: should be scanned by the pipeline now.
- `held-disabled`: source may exist or Step 0 was probably too aggressive, but the company should stay disabled for fit, source quality, reachability, or adapter reasons.
- `keep-disabled`: company is acquired, defunct, or otherwise not a standalone useful target.

This prevents the recurring ambiguity where "disabled" could mean dead company, bad URL, low fit, inaccessible source, or merely unsupported ATS.

## Summary

| Bucket | Count | Meaning |
|---|---:|---|
| Re-enabled now | 9 | Strong false disables with usable source and reasonable target fit. |
| Held disabled after false-positive review | 20 | Not dead, or not confidently dead, but not worth enabling now. |
| Kept disabled | 11 | Correct disable or low-value standalone target. |
| Total audited | 40 | All Step 0 disabled companies from `scripts/portals-apply-triage-fixes.py`. |

After applying the 9 restores, the expected roster baseline is 448 total / 397 enabled / 51 disabled.

## Audit Table

| Company | Decision | Source / status | Rationale |
|---|---|---|---|
| Galileo AI | re-enabled | `https://ats.rippling.com/galileo/jobs` | Active AI evaluation company with open roles; Rippling may require fallback handling. |
| VAST Data | re-enabled | `https://www.vastdata.com/careers` | Active AI data infrastructure careers source. |
| Grammarly | re-enabled | `https://www.grammarly.com/careers` | Active Grammarly/Superhuman job pages exist after rebrand. |
| Thinking Machines Lab | re-enabled | `https://jobs.accel.com/companies/thinking-machines-lab` | Active frontier AI job-board source. |
| OpenEvidence | re-enabled | `https://jobs.ashbyhq.com/openevidence` | Active Ashby source; strong AI healthcare target. |
| Aurascape | re-enabled | `https://aurascape.ai/join-our-team/` | Active AI security careers source. |
| Fathom | re-enabled | `https://jobs.ashbyhq.com/fathom.video` | Active Ashby source for AI meeting assistant company. |
| Skild AI | re-enabled | `https://job-boards.greenhouse.io/skildai-careers` | Active Greenhouse source with many AI/robotics roles. |
| Qdrant | re-enabled | `https://join.com/companies/qdrant` | Active JOIN source; strong vector database / AI infra fit. |
| PT DCI Indonesia Tbk | held-disabled | `https://dci-indonesia.com/careers/` | Source exists, but regional data-center roles are low fit for the target search. |
| Xiaomi | held-disabled | `https://www.mi.com/global/careers/` | Public source exists, but user confirmed connection issues; consumer hardware focus. |
| 01.AI | held-disabled | `https://www.01.ai/careers` | Real AI company, but no reliable current official careers route confirmed. |
| Constellation Software | held-disabled | `https://www.csisoftware.com/careers` | Current search results risk wrong entity; keep disabled until source is manually verified. |
| Copy.ai | held-disabled | `https://www.copy.ai/careers` | Step 0 may be false, but no reliable current job source confirmed. |
| DeepL-adjacent: Unbabel | held-disabled | `https://careers.unbabel.com/` | Careers surface exists, but no useful current openings confirmed. |
| DeepSeek | held-disabled | `https://www.deepseek.com/careers` | Real AI company, but no reliable official careers route confirmed. |
| GigaDevice Semiconductor | held-disabled | `https://www.gigadevice.com/about/career` | Active careers source, but semiconductor/hardware exclusion. |
| Keyence | held-disabled | `https://www.keyence.com/company/recruit/` | Careers source exists, but industrial automation/hardware-sales fit is weak. |
| Safe Superintelligence | held-disabled | `https://ssi.inc/careers` | Possible source found, but official/canonical route was not confident enough. |
| SenseTime | held-disabled | `https://www.sensetime.com/en/careers` | Source reliability and China/remote-fit concerns. |
| SK Hynix | held-disabled | `https://www.skhynix.com/eng/recruit/Main.do` | Semiconductor/hardware exclusion. |
| SMIC | held-disabled | `https://www.smics.com/en/site/human` | Careers source exists, but semiconductor foundry exclusion. |
| Tower Semiconductor | held-disabled | `https://towersemi.com/careers/` | Jobs exist externally, but semiconductor/hardware exclusion. |
| TSMC | held-disabled | `https://careers.tsmc.com/en_US/careers/SearchJobs` | Active careers source, but semiconductor/hardware exclusion. |
| Unitree Robotics | held-disabled | `https://www.unitree.com/careers/` | Active careers source, but China robotics/hardware and remote-fit concerns. |
| Zhipu AI | held-disabled | `https://www.zhipuai.cn/en/job` | Real AI company, but reliable official careers route not confirmed. |
| Cohere-adjacent: Jina AI | held-disabled | `https://jina-ai.jobs.personio.com/` | Step 0 likely false, but no strong current open-role source confirmed. |
| Canon | held-disabled | `https://global.canon/en/employ/` | Careers source exists, but consumer/imaging hardware is low fit. |
| Sandisk | held-disabled | `https://www.sandisk.com/en-us/careers/jobs-at-sandisk` | Active separate careers source, but storage/hardware exclusion. |
| Adept | keep-disabled | acquired / acqui-hire | Amazon licensed tech and hired founders/team; no clean standalone hiring target. |
| Lepton AI | keep-disabled | acquired | Acquired by NVIDIA; route to NVIDIA only if user wants parent-company coverage. |
| Abnormal-adjacent: Tessian | keep-disabled | acquired | Acquired by Proofpoint; no standalone target. |
| Databricks-adjacent: Tecton | keep-disabled | acquired | Acquired by Databricks; no standalone target. |
| Exscientia | keep-disabled | acquired/merged | Acquired/merged into Recursion; no standalone target. |
| Neon | keep-disabled | acquired | Acquired by Databricks; no standalone target. |
| OctoAI | keep-disabled | acquired | Acquired by NVIDIA; no standalone target. |
| Tome | keep-disabled | defunct / no useful source | Likely not useful as a standalone hiring target. |
| Augmedics | keep-disabled | low fit / weak source | Med-device target with no strong current role source. |
| Figure-adjacent: UBTECH | keep-disabled | low fit | China robotics/hardware-heavy; not worth enabling for this pipeline. |
| NAURA Technology Group | keep-disabled | low fit | Semiconductor equipment / weak source. |

## Operating Recommendation

Do not use `enabled: false` alone as proof that a company is dead. Future audits should track four fields:

- `pipeline_enabled`: whether the current scan should include the company.
- `source_status`: active, active-but-unsupported, unreachable, acquired, defunct, or low-confidence.
- `disable_reason`: acquisition, duplicate, low-fit category, unreachable, unsupported ATS, no current jobs, or manual user choice.
- `reviewed_at`: timestamp for when the source was last checked.

If this becomes recurring, move those fields out of free-text `note:` and into structured YAML keys. For now, the notes plus this audit file are enough to prevent another accidental 428-to-388 confusion.
