---
status: archived
type: docs
owner: claude
last-updated: 2026-05-01T20:00:00-04:00
read-if: "you need the historical Phase 2.8 Step 0 triage rationale; otherwise skip"
skip-if: "status == archived (default)"
---

# Phase 2.8 Step 0 — Proposed Fixes for portals.yml (HISTORICAL)

**Generated:** 2026-04-29 from `scripts/portals-url-triage-report.tsv`
**Total problem rows:** 100 (68 dead + 32 wrong-company-suspect)
**Recommended action distribution:**
- Batch A — **UPDATE URL** (6 rows): specific URL fix
- Batch B — **DISABLE: ACQUIRED** (7 rows): company merged into another entity
- Batch C — **DISABLE: DEFUNCT** (1 row): Tome (per D-11 prior acceptance)
- Batch D — **MANUAL REVIEW** (32 rows): 404s where URL likely moved; needs quick web check
- Batch E — **NO ACTION NEEDED** (54 rows): heuristic false positives + anti-bot/timeout (Firecrawl will retry in Step 4)

Approve batches by name (e.g., "approve A, B, C; skip D for now") OR row-by-row.

---

## Batch A — UPDATE URL (6 rows, recommend: approve all)

For each: change `careers_url` in `career-ops/portals.yml`.

| Company | Current URL | Proposed URL | Reason |
|---|---|---|---|
| Advantest | `https://www.advantest.com/careers` | `https://www.advantest.com/en/about/career-na/jobs/` | Triage redirect chain confirms `/en/` prefix is live URL |
| NXP Semiconductors | `https://www.nxp.com/company/about-nxp/careers:CAREERS` | `https://www.nxp.com/company/about-nxp/careers:CAREERS` | Adobe AEM `:CAREERS` suffix is invalid; bare path works |
| PT DCI Indonesia Tbk | `https://dci-indonesia.com/careers/` | `https://dci-indonesia.com/careers` | Trailing slash returns 404; no-slash variant likely works |
| Thought Machine | `https://www.thoughtmachine.net/careers` | `https://jobs.ashbyhq.com/thought-machine` | Triage shows redirect to `/jobs` then 404; `/jobs` is the live path |
| Xiaomi | `https://www.mi.com/global/careers/` | `https://career.mi.com/` | Triage error reveals different subdomain `career.mi.com` is the actual host |
| Hugging Face | `https://huggingface.co/jobs` | (keep URL; flag for special handling) | URL is correct but redirects to `/settings/jobs` which requires login. Step 4 Firecrawl with `actions:[click "View Jobs"]` would work. Reserve `firecrawl_actions` for this case |

---

## Batch B — DISABLE: ACQUIRED (7 rows, recommend: approve all)

For each: set `enabled: false` and add `note: "<reason>"` to the row in `portals.yml`.

| Company | Acquirer | Date | Proposed note |
|---|---|---|---|
| Adept | Amazon (AGI team) | Jun 2024 | `acquired by Amazon AGI 2024-06; product team licensed; no standalone hiring` |
| Lepton AI | NVIDIA | Q1 2025 | `acquired by NVIDIA 2025-Q1; folded into DGX Cloud Lepton; redirected to nvidia.com careers` |
| Abnormal-adjacent: Tessian | Proofpoint | Oct 2024 | `acquired by Proofpoint 2024-10; redirected to proofpoint.com tessian-is-now-proofpoint page` |
| Databricks-adjacent: Tecton | Databricks | 2024 | `acquired by Databricks 2024; redirected to databricks.com careers` |
| Exscientia | Recursion | 2024 | `acquired by Recursion Pharmaceuticals 2024; redirected to recursion.com` |
| Neon | Databricks | May 2025 | `acquired by Databricks 2025-05; redirected to databricks.com careers` |
| OctoAI | NVIDIA | Sep 2024 | `acquired by NVIDIA 2024-09; product team folded into NVIDIA inference stack` |

---

## Batch C — DISABLE: DEFUNCT (1 row, recommend: approve)

| Company | Reason | Proposed note |
|---|---|---|
| Tome | URL 404; per `.claude/memory/decisions.md` D-11 footnote, Tome flagged as possibly-defunct during Phase 2.7 audit; this 404 confirms | `validated empty 2026-04-29: company likely defunct; URL 404` |

---

## Batch D — MANUAL REVIEW (32 rows)

These are 404s or unusual cases where the URL appears broken but the company may still be hiring at a different URL. Needs ~5-10 min of your time (quick search per row) OR you can mark all `enabled: false` with `note: "404 2026-04-29; revisit"`.

**My recommendation:** triage these in order — the well-known names (TSMC, Tesla, SK Hynix, etc.) are likely just URL changes worth fixing; the obscure ones can be auto-disabled.

### D.1 — Likely URL change (you can search for the new URL)

| Company | Broken URL | Suggested search |
|---|---|---|
| 01.AI | https://www.01.ai/careers | "01.AI careers site:01.ai" |
| Augmedics | https://www.augmedics.com/careers/ | "Augmedics careers" |
| Aurascape | https://www.aurascape.ai/careers | "Aurascape careers" |
| Constellation Software | https://www.csisoftware.com/careers | "Constellation Software careers" — `csisoftware` is a subsidiary, look for parent careers |
| Copy.ai | https://www.copy.ai/careers | "Copy.ai careers" — try /about or /jobs |
| DeepL-adjacent: Unbabel | https://careers.unbabel.com/ | "Unbabel careers 2025" |
| DeepSeek | https://www.deepseek.com/careers | "DeepSeek careers" — likely Chinese URL needed |
| Fathom | https://fathom.video/careers | "Fathom careers" — try /jobs or /company |
| Figure-adjacent: UBTECH | https://www.ubtrobot.com/pages/join-us | "UBTECH careers 2025" |
| GigaDevice Semiconductor | https://www.gigadevice.com/about/careers/ | "GigaDevice careers EN" |
| Keyence | https://www.keyence.com/company/recruit/ | "Keyence careers global" |
| NAURA Technology Group | https://www.naura.com/en/JoinUs | "NAURA careers" |
| OpenEvidence | https://www.openevidence.com/careers | "OpenEvidence careers" |
| Qdrant | https://qdrant.tech/careers/ | "Qdrant careers" — try /jobs |
| Safe Superintelligence | https://ssi.inc/careers | "SSI Inc careers Ilya" |
| SenseTime | https://www.sensetime.com/en/careers | "SenseTime careers" |
| SK Hynix | https://www.skhynix.com/eng/recruit/Main.do | "SK Hynix recruit eng" |
| Skild AI | https://www.skild.ai/careers | "Skild AI careers" |
| SMIC | https://www.smics.com/en/site/recruit | "SMIC careers" |
| Thinking Machines Lab | https://thinkingmachines.ai/careers | "Thinking Machines Mira Murati careers" — new co; URL may not exist yet |
| Tower Semiconductor | https://towersemi.com/careers/ | "Tower Semiconductor careers" |
| TSMC | https://www.tsmc.com/english/careers | "TSMC careers EN" |
| Unitree Robotics | https://www.unitree.com/joinus/ | "Unitree Robotics careers" |
| VAST Data | https://www.vastdata.com/company/careers | "VAST Data careers" |
| Zhipu AI | https://www.zhipuai.cn/en/job | "Zhipu AI careers" |
| Cohere-adjacent: Jina AI | https://jina-ai.jobs.personio.de | "Jina AI careers Personio" — Personio URL pattern may be `jina-ai.jobs.personio.com` (.com not .de) |

### D.2 — Recent corporate event (worth a closer look)

| Company | Final URL after redirect | What may have happened |
|---|---|---|
| Canon | https://global.canon/en/ (root, no /careers anymore) | Career section moved/restructured. Search "Canon global careers". |
| Grammarly | https://superhuman.com/company/careers | Grammarly bought Superhuman (2025); careers may have unified to Superhuman's page. Could be valid — keep URL OR update to `https://superhuman.com/company/careers` and update name to "Grammarly (Superhuman)" |
| Sandisk | https://www.westerndigital.com/careers | Sandisk separated from WD Feb 2025 but careers still on WD until full split. Could be → keep enabled with note OR update URL once Sandisk has its own careers page |
| Galileo AI | https://ats.rippling.com/galileo/jobs | Uses **Rippling ATS** (9th provider not in our 8-tier). Either: (a) keep enabled — Firecrawl can scrape Rippling pages directly; (b) future scope: add Rippling as a 9th sibling adapter. Recommend (a) for now |

---

## Batch E — NO ACTION NEEDED (54 rows)

These rows are flagged by triage but the URL is functionally correct OR Firecrawl will likely handle them in Step 4. **No portals.yml change needed.**

### E.1 — Heuristic false positive (hostname is correct, just doesn't textually match company name) — 18 rows

| Company | URL | Why hostname differs |
|---|---|---|
| Anduril-adjacent: AeroVironment | avinc.com | "AV Inc" = AeroVironment abbreviated |
| BE Semiconductor | besi.com | "BESI" = BE Semiconductor abbreviated |
| Black Forest Labs | bfl.ai | "BFL" = Black Forest Labs |
| Codium | qodo.ai | Codium → Qodo rebrand; URL already updated, name in portals.yml is OLD |
| Dassault Systèmes | 3ds.com | Dassault uses 3DS / 3DEXPERIENCE primary brand |
| Electronic Arts | ea.com | "EA" = Electronic Arts |
| Fair Isaac | fico.com | Fair Isaac Corporation = FICO |
| GlobalFoundries | gf.com | "GF" abbreviation |
| Hewlett Packard Enterprise | careers.hpe.com | "HPE" abbreviation |
| Krutrim | olacabs.com | Krutrim is Ola Cabs's AI subsidiary; parent careers page is valid |
| LG Electronics | lge-careers.com | "LGE" = LG Electronics |
| Moore Threads | mthreads.com | "MThreads" = Moore Threads |
| NetEase | 163.com | NetEase's primary domain in China |
| PayPal | careers.pypl.com | "PYPL" = PayPal stock ticker |
| PDD Holdings | careers.pinduoduo.com | Pinduoduo is PDD Holdings' main brand |
| Texas Instruments | careers.ti.com | "TI" = Texas Instruments |
| Tokyo Electron | tel.com | "TEL" = Tokyo Electron |
| Weights & Biases | wandb.ai | "wandb" = Weights aNd Biases |
| Hugging Face-adjacent: Ollama | workatastartup.com | Ollama posts via Y Combinator's job board (valid) |
| Baichuan AI | feishu.cn | Hosted on Lark/Feishu ATS (Chinese tech standard) |
| JD Health | zhaopin.jd.com | "Zhaopin" = "recruit" in Chinese, JD's recruiting site |
| JD.com | campus.jd.com | Same — JD's campus recruiting subsite |
| Presight AI | careers.g42.ai | Presight is part of G42 group |

### E.2 — Anti-bot or timeout (Firecrawl will likely succeed) — 33 rows

These returned 403 / timeout / SSL-error / connection-error to our HEAD/GET. Firecrawl has built-in anti-bot rotation and residential proxies — these should bypass. Step 4 (firecrawl-discover) will retry.

```
Adobe, Analog Devices, Applied Materials, ASE Group, Autodesk, Automatic Data Processing,
Booking Holdings, CoStar Group, DoorDash, Fourier Intelligence, Gamma, Helsing,
Hua Hong Semiconductor, Intel, Leidos, Luma AI, Marvell Technology, MercadoLibre,
Microchip Technology, Midjourney, Nomic AI, ON Semiconductor, Renesas Electronics,
Roper Technologies, Schneider Electric, Seagate Technology, ServiceNow, SoFi,
STMicroelectronics, Tesla, Uber, Unimicron, United Microelectronics
```

If after Step 4 any of these still fail, they fall through to Layer 2 (firecrawl-extract) and ultimately Layer 3 (custom-scraper Playwright fallback) per the orchestrator chain in §6.8.

---

## Approval format

Reply with one of:
- **"approve A, B, C, E; skip D"** — fastest path; D handled in a future session
- **"approve all"** — applies A/B/C and auto-disables all 32 D rows with note `"404 2026-04-29; revisit"`
- **"approve A, B, C; do D one at a time"** — slower; we walk through D row-by-row
- Any custom adjustment (e.g., "approve A, B; skip C; disable Tome but with different note")

After your approval, I'll write the changes to `career-ops/portals.yml` directly, re-run the triage script, and confirm the new bucket counts.
