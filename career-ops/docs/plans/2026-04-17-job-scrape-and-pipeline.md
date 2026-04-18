# Job Scrape, Filter & Career-Ops Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scrape job postings from 171 pre-filtered AI-relevant companies, export to Excel for inspection, then feed promising postings through career-ops evaluation pipeline tailored to Will Guo's profile.

**Architecture:** Three phases — (1) setup all career-ops config files from Will's knowledge bank, (2) scrape jobs via scan.mjs for API-backed ATSs + custom Playwright scraper for the rest, export unified Excel, (3) batch-evaluate top matches through career-ops. The Excel is the single intermediate artifact: human-inspectable and AI-feedable.

**Tech Stack:** Node.js (mjs), career-ops scan.mjs, Playwright (already installed), js-yaml, xlsx npm package (already installed for plan writing), YAML config, Markdown data files.

---

## Context for Executor

**Who is Will Guo:** Applied AI practitioner, founder of Dalamula Technology (wound down early 2026), Toronto. Contact: william974314065@gmail.com | +1 416-508-2788 | linkedin.com/in/xinyuan-guo | dalamula.ai. Software engineering degree (Western), MFE (UCLA Anderson). 3 years building generative AI studio: 50+ clients, $125K+ revenue, 61 deployments, 120+ LoRAs trained.

**Target roles (in priority order):**
1. AI Engineer / Solutions Architect (primary technical track)
2. Account Executive / BD — AI products (commercial track)
3. AI Product Manager (PM track)
4. Consulting / Technical Advisory (consulting track)
5. Generative AI / Creative AI (creative track)

**Company filter logic:** 171 of 450 companies are relevant based on AI-native category. Excluded: semiconductors/hardware supply chain, space infrastructure, traditional auto/maritime, pure consumer electronics, defense drones (unless AI-focused).

**Key files:**
- Knowledge bank: `../context/knowledge bank/` (read-only reference)
- Companies: `../context/AI_Companies_Consolidated_Ranked_v2.xlsx` (source of truth for company list)
- career-ops root: `D:/Projects/career ops/career-ops/`

---

## Task 1: Create Project CLAUDE.md

**Files:**
- Create: `D:/Projects/career ops/career-ops/CLAUDE.md` — WAIT, this already exists (it's the system CLAUDE.md). Instead create: `.claude/CLAUDE.md` (project-level override) or check if `.claude/` dir exists.

Actually: The career-ops system CLAUDE.md at root should NOT be modified (system layer). Create the project instructions at:
- Create: `D:/Projects/career ops/.claude/CLAUDE.md` (parent project directory — this is where Claude Code loads from when in the `career ops` working dir)

**Step 1: Write the CLAUDE.md**

This file should contain:
```markdown
# Career-Ops Project — Will Guo Job Search Pipeline

## Project Overview
AI-powered job search pipeline for Will Guo using the career-ops framework.
Working directory for career-ops: `career-ops/` subfolder.

## Knowledge Bank (read before any session work)
All personal context lives in `../context/knowledge bank/`:
- `1_professional_identity/kb_will_identity.md` — full bio, career arc, worldview
- `2_dalamula/kb_dalamula_business.md` — Dalamula metrics, lessons, business model
- `3_experience_and_competencies/kb_technical_competencies.md` — full tech stack depth
- `3_experience_and_competencies/kb_inception_capital.md` — VC experience details
- `4_personal_projects/kb_projects_index.md` — project index
- `5_career_positioning/kb_master_resume_and_positioning.md` — all resume variants and bullets
- `5_career_positioning/kb_resume_mapping_logic.md` — which bullets go on which resume

## Companies Source
`../context/AI_Companies_Consolidated_Ranked_v2.xlsx` — 450 ranked companies with career URLs.
171 are filtered as relevant to Will's background.

## Career-Ops Workflow (always run from `career-ops/` dir)
1. Scan: `node scan.mjs` — hits Greenhouse/Ashby/Lever APIs, populates pipeline.md
2. Custom scrape: `node custom-scraper.mjs` — Playwright scrape for non-API companies
3. Export: `node export-jobs.mjs` — unified Excel at `output/jobs-YYYY-MM-DD.xlsx`
4. Evaluate: `/career-ops pipeline` or `node batch/run-batch.mjs` for bulk evaluation

## Session Start Checklist
1. Run `node update-system.mjs check` silently
2. Confirm config files exist: cv.md, config/profile.yml, portals.yml, modes/_profile.md
3. Read relevant kb files if doing evaluation work
4. Check `data/pipeline.md` for pending URLs

## Will's Deal-Breakers (do not recommend roles that violate these)
- No pure sales roles without technical component
- No roles requiring relocation away from Toronto (remote preferred)
- No companies with <10 people (seed-stage too early)
- Minimum $120K USD total comp

## Scoring Calibration
- Will's sweet spot: AI Engineer, SA, Technical PM at Series B+ or public AI-native companies
- Boost score for: multi-agent systems, RAG, generative AI, enterprise deployment, founder-to-employee story fit
- Reduce score for: pure frontend, non-AI SaaS, semiconductor/hardware roles, pure management with no technical component
```

**Step 2: Verify file written correctly**

Read the file back and confirm it's coherent.

**Step 3: Commit**
```bash
git -C "D:/Projects/career ops" init  # if not a git repo yet
```
Note: The parent `career ops/` dir is not a git repo — no commit needed there. The `career-ops/` subfolder IS a git repo but these config files are gitignored (data layer). No commit needed.

---

## Task 2: Create cv.md from Knowledge Bank

**Files:**
- Create: `D:/Projects/career ops/career-ops/cv.md`
- Reference: `../context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md`

**Step 1: Write cv.md**

Build a clean, comprehensive markdown CV from the master resume. Use the "Core Resume" framing (balanced technical + commercial). Include all sections: Summary, Experience (Dalamula → Inception → Moonearn → Internships), Projects (top 4), Education, Skills.

Key metrics to include exactly:
- Dalamula: 50+ clients, $125K+ revenue, 61 deployments, 23 workflow versions, 120+ LoRAs
- Inception: 120+ companies evaluated, 2 IC commitments
- Image acceptance: 10% → 80%+, Video: 20% → 40-50%

**Step 2: Verify doctor passes**
```bash
cd "D:/Projects/career ops/career-ops" && node doctor.mjs
```
Expected: cv.md check passes (still 2 other failures until Tasks 3+4 done).

---

## Task 3: Create config/profile.yml

**Files:**
- Create: `D:/Projects/career ops/career-ops/config/profile.yml`
- Reference: `config/profile.example.yml` for schema

**Step 1: Copy example and fill with Will's data**

Fill all fields:
```yaml
candidate:
  full_name: "Will (Xinyuan) Guo"
  email: "william974314065@gmail.com"
  phone: "+1 416-508-2788"
  location: "Toronto, Ontario, Canada"
  linkedin: "linkedin.com/in/xinyuan-guo"
  portfolio_url: "https://dalamula.ai"
  github: "github.com/willguo"  # verify from kb

target_roles:
  primary:
    - "AI Engineer"
    - "Solutions Architect"
    - "Account Executive — AI"
    - "AI Product Manager"
  archetypes:
    - name: "AI Engineer"
      level: "Mid-Senior"
      fit: "primary"
    - name: "Solutions Architect"
      level: "Senior"
      fit: "primary"
    - name: "Account Executive"
      level: "Mid-Senior"
      fit: "secondary"
    - name: "AI Product Manager"
      level: "Mid-Senior"
      fit: "secondary"
    - name: "Consultant"
      level: "Senior"
      fit: "adjacent"

narrative:
  headline: "Applied AI practitioner who builds, sells, and deploys production agentic systems"
  exit_story: "Founded and operated Dalamula Technology (generative AI studio) for 3 years — 50+ clients, 61 production deployments, $125K+ revenue. Strategic wind-down in early 2026 as platform products from major companies compressed the boutique studio market. Now targeting roles where I can apply production AI depth at enterprise scale."
  superpowers:
    - "Full-stack agentic AI — LangGraph, Google ADK, RAG, LoRA fine-tuning, multimodal production"
    - "Technical-commercial hybrid — personally built AND sold 50+ AI engagements"
    - "Generative AI production at scale — 120+ LoRAs, 23 workflow versions, 61 deployments"
    - "Speed — from zero to working production system in days, not weeks"
    - "Frontier AI fluency — daily practitioner, self-built intelligence pipeline"
  proof_points:
    - name: "Dalamula AI Studio"
      url: "https://dalamula.ai"
      hero_metric: "50+ clients, $125K+ revenue, 61 production deployments"
    - name: "Super Claude Framework"
      url: "https://github.com/willguo/super-claude"
      hero_metric: "Published on Claude Code marketplace"
    - name: "Agentic News Intelligence Platform"
      url: ""
      hero_metric: "7-layer DAG, runs unattended daily on GCP"

compensation:
  target_range: "$120K-180K"
  currency: "USD"
  minimum: "$120K"
  location_flexibility: "Remote preferred; Toronto-based; open to hybrid with max 2 days/week onsite"

location:
  country: "Canada"
  city: "Toronto"
  timezone: "EST"
  visa_status: "Canadian resident; no US work authorization without sponsorship"
```

**Step 2: Verify doctor passes**
```bash
cd "D:/Projects/career ops/career-ops" && node doctor.mjs
```
Expected: profile.yml check passes.

---

## Task 4: Create modes/_profile.md

**Files:**
- Copy: `modes/_profile.template.md` → `modes/_profile.md`
- Modify: `modes/_profile.md`

**Step 1: Read template**

Read `modes/_profile.template.md` to understand schema.

**Step 2: Fill with Will's archetype and scoring weights**

The _profile.md should contain Will's role archetypes, deal-breakers, scoring calibration, and narrative anchors. This is the file career-ops reads during evaluation to personalize scoring.

---

## Task 5: Create portals.yml with 171 Filtered Companies

**Files:**
- Create: `D:/Projects/career ops/career-ops/portals.yml`
- Reference: `../context/AI_Companies_Consolidated_Ranked_v2.xlsx` (171 relevant companies)
- Reference: `templates/portals.example.yml` for schema

**Step 1: Build title_filter section**

Will's positive keywords (combining his target roles):
```yaml
title_filter:
  positive:
    # AI Engineering
    - "AI Engineer"
    - "ML Engineer"
    - "Machine Learning"
    - "Applied AI"
    - "LLM"
    - "Agentic"
    - "Agent"
    - "GenAI"
    - "Generative AI"
    - "RAG"
    - "MLOps"
    - "LLMOps"
    - "AI Platform"
    - "AI Infrastructure"
    # Solutions / Technical
    - "Solutions Architect"
    - "Solutions Engineer"
    - "Forward Deployed"
    - "Deployed Engineer"
    - "Customer Engineer"
    - "Integration Engineer"
    - "Technical Account"
    - "Field Engineer"
    # Product
    - "AI Product"
    - "Product Manager"
    - "Technical PM"
    # Sales / BD
    - "Account Executive"
    - "Sales Engineer"
    - "Business Development"
    - "Enterprise Account"
    - "Strategic Account"
    # Consulting
    - "AI Consultant"
    - "Technical Consultant"
    - "Implementation"
    # Creative / Generative
    - "Creative Technologist"
    - "Technical Artist"
    - "AI Trainer"
    - "Content AI"
    - "Multimodal"
    - "Prompt Engineer"
    # Broad AI
    - "Artificial Intelligence"
    - "Deep Learning"
    - "Foundation Model"
    - "Model"
  negative:
    - "intern"
    - "internship"
    - "PhD"
    - "research scientist"  # pure research, not applied
    - "hardware"
    - "ASIC"
    - "chip"
    - "semiconductor"
    - "embedded"
    - "FPGA"
    - "staff accountant"
    - "legal"
    - "recruiter"
    - "talent acquisition"
    - "marketing manager"  # non-AI marketing
    - "administrative"
    - "executive assistant"
```

**Step 2: Build tracked_companies from Excel data**

Write a Node.js script to generate the companies YAML from the Excel. Run it, then include output in portals.yml. The 171 relevant companies all get `enabled: true`. Each needs `name` and `careers_url` (from Column 12 in the Excel). scan.mjs auto-detects Greenhouse/Ashby/Lever from the URL.

```bash
node -e "
const XLSX = require('xlsx');
const yaml = require('js-yaml');
const wb = XLSX.readFile('../context/AI_Companies_Consolidated_Ranked_v2.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

const RELEVANT_CATS = [
  'Frontier Model Labs','Enterprise AI','AI Cloud','AI Agents','AI Infrastructure',
  'AI SaaS','AI Developer Tools','AI Video Generation','Synthetic Media','Multimodal AI',
  'AI Coding Tools','AI Search','AI Productivity','AI Image Generation',
  'AI Research','AI Agents / Reasoning','AI Customer Support','AI Customer Messaging',
  'AI Observability','AI Evaluation','AI Developer Security','AI Inference',
  'AI Cloud Infrastructure','Data Cloud','Creative software','AI Content',
  'AI IT Support','AI RPA','AI Automation','AI Process Mining','AI Revenue',
  'AI Coding','Generative Video','AI Video','Spatial AI','Vector Databases',
  'Data Integration','Data Transformation','AI Real-Time','AI Data Labeling',
  'Frontier AI','AI Local','AI Hardware','Enterprise software','Robotics AI',
  'AI Hiring','AI Finance','Fintech','AI Legal'
];

const relevant = data.slice(1).filter(r => {
  const cat = (r[7] || '').toLowerCase();
  return RELEVANT_CATS.some(c => cat.includes(c.toLowerCase().substring(0,12)));
});

const companies = relevant
  .filter(r => r[11]) // must have career URL
  .map(r => ({
    name: r[1],
    rank: r[0],
    category: r[7],
    careers_url: r[11],
    enabled: true,
  }));

console.log(yaml.dump({ tracked_companies: companies }));
" > /tmp/companies.yml
```

**Step 3: Assemble full portals.yml**

Combine title_filter section + search_queries section + tracked_companies from the generated YAML.

**Step 4: Verify doctor passes**
```bash
cd "D:/Projects/career ops/career-ops" && node doctor.mjs
```
Expected: All 3 checks now pass.

---

## Task 6: Initialize Tracker Files

**Files:**
- Create: `D:/Projects/career ops/career-ops/data/applications.md`
- Create: `D:/Projects/career ops/career-ops/data/pipeline.md`
- Create: `D:/Projects/career ops/career-ops/data/scan-history.tsv`

**Step 1: Create applications.md**
```markdown
# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
```

**Step 2: Create pipeline.md**
```markdown
# Job Pipeline — Pending Evaluation

## Pendientes

## Procesadas
```

**Step 3: Create scan-history.tsv**
```
url	first_seen	portal	title	company	status
```

**Step 4: Verify pipeline**
```bash
cd "D:/Projects/career ops/career-ops" && node verify-pipeline.mjs
```

---

## Task 7: Run scan.mjs (API-Based Scraping)

**Files:**
- Reads: `portals.yml`, detects Greenhouse/Ashby/Lever APIs automatically
- Writes: `data/pipeline.md`, `data/scan-history.tsv`

**Step 1: Dry run first**
```bash
cd "D:/Projects/career ops/career-ops" && node scan.mjs --dry-run 2>&1
```
Expected: Summary showing companies found with Greenhouse/Ashby/Lever APIs, job counts.

**Step 2: Run live**
```bash
cd "D:/Projects/career ops/career-ops" && node scan.mjs 2>&1
```
Expected: New offers appended to pipeline.md.

**Step 3: Check results**
```bash
grep -c "\- \[ \]" "D:/Projects/career ops/career-ops/data/pipeline.md"
```
Note how many jobs were found via API.

---

## Task 8: Build custom-scraper.mjs (Playwright for Non-API Companies)

**Files:**
- Create: `D:/Projects/career ops/career-ops/custom-scraper.mjs`

This script handles companies scan.mjs skips (no Greenhouse/Ashby/Lever detected). It uses Playwright to:
1. Navigate to each company's careers_url
2. Look for job listing elements
3. Extract title, URL, location from page
4. Apply same title filters as scan.mjs
5. Append new offers to pipeline.md + scan-history.tsv (same format as scan.mjs)

**Step 1: Write custom-scraper.mjs**

```javascript
#!/usr/bin/env node
/**
 * custom-scraper.mjs — Playwright scraper for companies without Greenhouse/Ashby/Lever APIs
 * 
 * Reads portals.yml, skips companies scan.mjs already handled (those with detectable APIs),
 * uses Playwright to scrape the rest, applies title filters, writes to pipeline.md.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { chromium } from 'playwright';

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const CONCURRENCY = 3; // Playwright is heavier than API calls
const PAGE_TIMEOUT_MS = 20_000;

// Same API detection logic as scan.mjs to know what to skip
function hasApiDetection(company) {
  if (company.api && company.api.includes('greenhouse')) return true;
  const url = company.careers_url || '';
  if (url.match(/jobs\.ashbyhq\.com/)) return true;
  if (url.match(/jobs\.lever\.co/)) return true;
  if (url.match(/job-boards(?:\.eu)?\.greenhouse\.io/)) return true;
  return false;
}

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());
  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

function loadSeenUrls() {
  const seen = new Set();
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }
  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }
  return seen;
}

// Generalized job extraction selectors to try in order
const JOB_SELECTORS = [
  // Workday
  { container: '[data-automation-id="jobPostingsList"] li', title: '[data-automation-id="jobPostingTitle"]', link: 'a' },
  // Lever
  { container: '.posting', title: 'h5', link: 'a' },
  // Generic: list of links with job-like text
  { container: 'li', title: 'a', link: 'a' },
  // Table rows
  { container: 'tr', title: 'td:first-child', link: 'a' },
];

async function scrapeCompany(page, company) {
  const jobs = [];
  try {
    await page.goto(company.careers_url, { timeout: PAGE_TIMEOUT_MS, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // JS render time

    // Try to extract jobs using various selectors
    // Strategy: find all links on the page that look like job postings
    const links = await page.$$eval('a[href]', (anchors) => {
      return anchors
        .map(a => ({
          text: (a.textContent || '').trim(),
          href: a.href,
        }))
        .filter(a => a.text.length > 5 && a.text.length < 150 && a.href.length > 10);
    });

    // Filter for links that look like job postings (contain keywords or are in job-like paths)
    for (const link of links) {
      const text = link.text;
      const href = link.href;
      // Skip navigation, footer links
      if (!text || text.split(' ').length < 2) continue;
      // Must look like a job title (has nouns, not just "Apply" or "Learn More")
      if (['apply', 'learn more', 'view all', 'see all', 'job', 'career', 'back'].includes(text.toLowerCase())) continue;
      jobs.push({
        title: text,
        url: href,
        company: company.name,
        location: '',
      });
    }
  } catch (err) {
    console.error(`  ✗ ${company.name}: ${err.message}`);
  }
  return jobs;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const config = yaml.load(readFileSync(PORTALS_PATH, 'utf-8'));
  const allCompanies = config.tracked_companies || [];
  const titleFilter = buildTitleFilter(config.title_filter);

  // Only scrape companies that scan.mjs would skip
  const targets = allCompanies
    .filter(c => c.enabled !== false)
    .filter(c => !hasApiDetection(c))
    .filter(c => c.careers_url);

  console.log(`Custom scraping ${targets.length} companies (no API detected)`);

  const seenUrls = loadSeenUrls();
  const newOffers = [];
  const date = new Date().toISOString().slice(0, 10);

  const browser = await chromium.launch({ headless: true });

  // Process in small batches
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (company) => {
      const page = await browser.newPage();
      try {
        console.log(`  Scraping ${company.name}...`);
        const jobs = await scrapeCompany(page, company);
        for (const job of jobs) {
          if (!titleFilter(job.title)) continue;
          if (seenUrls.has(job.url)) continue;
          seenUrls.add(job.url);
          newOffers.push({ ...job, source: 'playwright' });
        }
        console.log(`  ✓ ${company.name}: ${jobs.filter(j => titleFilter(j.title)).length} matching jobs`);
      } finally {
        await page.close();
      }
    }));
  }

  await browser.close();

  if (!dryRun && newOffers.length > 0) {
    // Append to pipeline.md (same format as scan.mjs)
    let text = readFileSync(PIPELINE_PATH, 'utf-8');
    const marker = '## Pendientes';
    const idx = text.indexOf(marker);
    const block = '\n' + newOffers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') + '\n';
    if (idx === -1) {
      text += `\n${marker}\n${block}`;
    } else {
      const afterMarker = idx + marker.length;
      const nextSection = text.indexOf('\n## ', afterMarker);
      const insertAt = nextSection === -1 ? text.length : nextSection;
      text = text.slice(0, insertAt) + block + text.slice(insertAt);
    }
    writeFileSync(PIPELINE_PATH, text, 'utf-8');

    // Append to scan-history.tsv
    const lines = newOffers.map(o => `${o.url}\t${date}\tplaywright\t${o.title}\t${o.company}\tadded`).join('\n') + '\n';
    appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
  }

  console.log(`\nCustom scrape complete. ${newOffers.length} new offers found.`);
  if (dryRun) console.log('(dry run)');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
```

**Step 2: Test dry run**
```bash
cd "D:/Projects/career ops/career-ops" && node custom-scraper.mjs --dry-run 2>&1 | head -30
```

**Step 3: Run live**
```bash
cd "D:/Projects/career ops/career-ops" && node custom-scraper.mjs 2>&1
```

---

## Task 9: Build export-jobs.mjs (Excel Exporter)

**Files:**
- Create: `D:/Projects/career ops/career-ops/export-jobs.mjs`
- Reads: `data/pipeline.md`, `data/scan-history.tsv`
- Writes: `output/jobs-YYYY-MM-DD.xlsx`

This is the key deliverable for human inspection and AI processing.

**Step 1: Write export-jobs.mjs**

```javascript
#!/usr/bin/env node
/**
 * export-jobs.mjs — Export pipeline jobs to Excel for inspection
 * 
 * Reads pipeline.md + scan-history.tsv, cross-references with portals.yml
 * for company metadata (rank, category), outputs Excel with:
 * - Sheet 1: All pending jobs (sortable, filterable)
 * - Sheet 2: By company (aggregated view)
 * - Sheet 3: Raw scan history
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import XLSX from 'xlsx';

const PIPELINE_PATH = 'data/pipeline.md';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PORTALS_PATH = 'portals.yml';

function parsePortalsCompanyMap(portalsPath) {
  const map = {};
  if (!existsSync(portalsPath)) return map;
  const config = yaml.load(readFileSync(portalsPath, 'utf-8'));
  for (const c of (config.tracked_companies || [])) {
    map[c.name.toLowerCase()] = {
      rank: c.rank || '',
      category: c.category || '',
      careers_url: c.careers_url || '',
    };
  }
  return map;
}

function parsePipeline(pipelinePath) {
  if (!existsSync(pipelinePath)) return [];
  const text = readFileSync(pipelinePath, 'utf-8');
  const jobs = [];
  for (const line of text.split('\n')) {
    // Format: - [ ] URL | Company | Title
    const match = line.match(/^- \[([ x])\] (https?:\/\/\S+) \| ([^|]+) \| (.+)$/);
    if (match) {
      jobs.push({
        done: match[1] === 'x',
        url: match[2].trim(),
        company: match[3].trim(),
        title: match[4].trim(),
      });
    }
  }
  return jobs;
}

function parseScanHistory(historyPath) {
  if (!existsSync(historyPath)) return [];
  const lines = readFileSync(historyPath, 'utf-8').split('\n').slice(1); // skip header
  return lines
    .filter(l => l.trim())
    .map(l => {
      const [url, first_seen, portal, title, company, status] = l.split('\t');
      return { url, first_seen, portal, title, company, status };
    });
}

function main() {
  const date = new Date().toISOString().slice(0, 10);
  const outPath = `output/jobs-${date}.xlsx`;
  mkdirSync('output', { recursive: true });

  const companyMap = parsePortalsCompanyMap(PORTALS_PATH);
  const pipeline = parsePipeline(PIPELINE_PATH);
  const history = parseScanHistory(SCAN_HISTORY_PATH);

  // Build scan history URL → metadata map
  const histMap = {};
  for (const h of history) {
    if (h.url) histMap[h.url] = h;
  }

  // Sheet 1: All pending jobs with enriched metadata
  const pendingJobs = pipeline.filter(j => !j.done).map(j => {
    const hist = histMap[j.url] || {};
    const meta = companyMap[j.company.toLowerCase()] || {};
    return {
      'Company Rank': meta.rank || '',
      'Company': j.company,
      'Category': meta.category || hist.portal || '',
      'Job Title': j.title,
      'Location': '',
      'URL': j.url,
      'Source': hist.portal || '',
      'First Seen': hist.first_seen || date,
      'Status': 'Pending',
      'Score': '',
      'Notes': '',
    };
  });

  // Sort by company rank (ascending = more important first)
  pendingJobs.sort((a, b) => {
    const ra = Number(a['Company Rank']) || 9999;
    const rb = Number(b['Company Rank']) || 9999;
    return ra - rb;
  });

  // Sheet 2: Company summary
  const companyGroups = {};
  for (const j of pendingJobs) {
    const k = j['Company'];
    if (!companyGroups[k]) companyGroups[k] = { company: k, rank: j['Company Rank'], category: j['Category'], count: 0, jobs: [] };
    companyGroups[k].count++;
    companyGroups[k].jobs.push(j['Job Title']);
  }
  const companySummary = Object.values(companyGroups)
    .sort((a, b) => (Number(a.rank) || 9999) - (Number(b.rank) || 9999))
    .map(g => ({
      'Rank': g.rank,
      'Company': g.company,
      'Category': g.category,
      'Job Count': g.count,
      'Sample Titles': g.jobs.slice(0, 3).join(' | '),
    }));

  // Build workbook
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(pendingJobs);
  // Auto-width columns
  ws1['!cols'] = [
    { wch: 8 }, { wch: 25 }, { wch: 30 }, { wch: 45 }, { wch: 20 },
    { wch: 70 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Pending Jobs');

  const ws2 = XLSX.utils.json_to_sheet(companySummary);
  ws2['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'By Company');

  const ws3 = XLSX.utils.json_to_sheet(history.filter(h => h.url));
  XLSX.utils.book_append_sheet(wb, ws3, 'Scan History');

  XLSX.writeFile(wb, outPath);
  console.log(`\nExported ${pendingJobs.length} jobs from ${Object.keys(companyGroups).length} companies.`);
  console.log(`Output: ${outPath}`);
}

main();
```

**Step 2: Run exporter**
```bash
cd "D:/Projects/career ops/career-ops" && node export-jobs.mjs 2>&1
```

**Step 3: Verify output exists**
```bash
ls -la "D:/Projects/career ops/career-ops/output/"
```

---

## Task 10: Add package.json scripts for the new tools

**Files:**
- Modify: `D:/Projects/career ops/career-ops/package.json`

Add these scripts:
```json
"scrape": "node custom-scraper.mjs",
"scrape:dry": "node custom-scraper.mjs --dry-run",
"export": "node export-jobs.mjs",
"full-scan": "node scan.mjs && node custom-scraper.mjs && node export-jobs.mjs"
```

---

## Task 11: Write Project CLAUDE.md

**Files:**
- Create: `D:/Projects/career ops/.claude/CLAUDE.md`

This is the Claude Code project-level instructions file. It loads automatically when Claude Code is opened in the `career ops/` directory. Must follow Will's global framework style.

Write a CLAUDE.md that:
1. Summarizes the project
2. Points to the knowledge bank files
3. Documents the scraping + evaluation workflow
4. Sets Will's scoring preferences and deal-breakers
5. References career-ops commands
6. Includes session start checklist

---

## Task 12: Verify full pipeline

**Step 1: Run doctor**
```bash
cd "D:/Projects/career ops/career-ops" && node doctor.mjs
```
Expected: 0 issues.

**Step 2: Run verify-pipeline**
```bash
cd "D:/Projects/career ops/career-ops" && node verify-pipeline.mjs
```

**Step 3: Check pipeline.md has entries**
```bash
grep -c "Pendientes\|http" "D:/Projects/career ops/career-ops/data/pipeline.md"
```

**Step 4: Confirm Excel output exists and is non-empty**
```bash
ls -la "D:/Projects/career ops/career-ops/output/"
```

---

## Execution Order Summary

1. Task 1 → CLAUDE.md (project docs)
2. Task 2 → cv.md (required for doctor)
3. Task 3 → profile.yml (required for doctor)
4. Task 4 → _profile.md (evaluation personalization)
5. Task 5 → portals.yml (required for scan + doctor)
6. Task 6 → tracker files (pipeline.md, applications.md, scan-history.tsv)
7. Task 7 → run scan.mjs (API scrape)
8. Task 8 → build + run custom-scraper.mjs (Playwright scrape)
9. Task 9 → build + run export-jobs.mjs (Excel output)
10. Task 10 → update package.json scripts
11. Task 11 → write .claude/CLAUDE.md
12. Task 12 → verify everything

Tasks 1-6 are purely file creation — fast. Tasks 7-9 involve network calls — will take time depending on how many companies have API-detectable ATSs.
