# Career-Ops Config Files Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all five career-ops config files (cv.md, config/profile.yml, modes/_profile.md, portals.yml, data/ init files) from Will's knowledge bank with maximum fidelity — no approximations, no invented content, no placeholders.

**Architecture:** Each file is built strictly from the knowledge bank source files. Every metric, every bullet, every keyword traces back to a specific kb file. The portals.yml company list is derived programmatically from the Excel then filtered by AI relevance to ~130 curated companies. Title filters are built from Will's actual target roles, not guesses.

**Tech Stack:** Node.js (xlsx already installed in career-ops/), YAML, Markdown. All commands run from `D:/Projects/career ops/career-ops/` unless stated otherwise.

---

## Pre-flight: Verify working state

**Step 1: Confirm npm deps and doctor baseline**
```bash
cd "D:/Projects/career ops/career-ops"
node doctor.mjs
```
Expected output: 3 failures (cv.md, profile.yml, portals.yml missing). Node.js ✓, deps ✓, Playwright ✓. This is correct — we're about to fix those 3.

---

## Task 1: cv.md — Will's Master CV in Markdown

**Files:**
- Create: `D:/Projects/career ops/career-ops/cv.md`
- Source: `context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md`
- Source: `context/knowledge bank/1_professional_identity/kb_will_identity.md`
- Source: `context/knowledge bank/4_personal_projects/kb_projects_index.md`
- Source: `context/knowledge bank/2_dalamula/kb_dalamula_technical.md`

**Why this structure:** career-ops reads cv.md at evaluation time to extract metrics and proof points. It must be clean markdown with standard sections. Use the "Core Resume" framing — balanced technical + commercial, no role-specific skew. The full role-specific bullets live in kb_master_resume — the cv.md is the canonical base Claude reads during scoring.

**Step 1: Write cv.md**

Build the file with exactly these sections in this order:

```markdown
# Will (Xinyuan) Guo

william974314065@gmail.com | +1 416-508-2788 | Toronto, Ontario, Canada
linkedin.com/in/xinyuan-guo | dalamula.ai

---

## Summary

Applied AI practitioner and founder with 3+ years building, selling, and deploying production AI systems commercially. Co-founded Dalamula Technology — a generative AI studio that delivered 61 documented production deployments across 50+ clients, generating $125K+ in revenue with a team of 7. Primary technical architect and sole sales lead simultaneously: designed agentic AI systems, RAG pipelines, and multimodal generative workflows while personally closing 50+ B2B engagements. Former AI×Web3 VC Associate (Inception Capital, 120+ company evaluations). Software Engineering BSc (Western University) + MFE (UCLA Anderson). Natively bilingual: English and Mandarin Chinese.

---

## Experience

### Dalamula Technology — Co-Founder & CEO
**Toronto, ON | Mar 2024 – Dec 2025**

Designed and deployed production multi-agent systems on GCP end-to-end — Google ADK and LangGraph coordinator-subagent architectures with A2A orchestration patterns, tool invocation, stateful memory, and structured outputs; deployed via Cloud Run and containerized microservices (Docker, FastAPI) with CI/CD via Cloud Build and end-to-end observability via Langfuse across 50+ live client deployments and 23+ versioned workflow iterations.

Owned full-cycle B2B sales and client acquisition end-to-end — identifying target accounts, leading structured discovery conversations, crafting tailored AI solution proposals, closing engagements averaging $2K+ per client, and managing ongoing relationships across 50+ SMB and growth-stage clients with $125K+ in cumulative revenue and a term sheet at $1M valuation.

Built and operated a generative AI studio producing hyperrealistic AI avatar and video content at production quality — architecting, fine-tuning, and deploying multimodal generative pipelines across 50+ client engagements, with 23+ versioned workflow systems and 61 documented deployments; functioned as both technical architect and final aesthetic authority.

- Engineered production-grade agentic AI systems: LangGraph, Google ADK, CrewAI, and AutoGen coordinator-subagent architectures with ReAct and plan-and-execute orchestration; RAG pipelines with hybrid retrieval (Pinecone, Qdrant, LlamaIndex); LoRA/QLoRA fine-tuning (PyTorch, HuggingFace PEFT); LLM integration (Claude, Gemini, GPT-4.1) with cost and latency optimization; deployed on AWS ECS + GCP Cloud Run with Docker and CI/CD, instrumented via Langfuse and LangSmith.
- Built and productionized RAG pipelines for influencer persona systems: ingestion contracts, dynamic chunking, hybrid semantic filtering, identity-grounded retrieval (Pinecone, Qdrant, Vertex AI Vector Search); Chain-of-Thought and ReAct prompt engineering; evaluated via DeepEval and RAGAS frameworks.
- Owned end-to-end LoRA fine-tuning pipelines: curated training datasets, captioning pipelines, rank/alpha configuration, learning rate schedules, mixed precision training (PyTorch, kohya-ss); 20+ identity LoRAs and ~100 style/persona LoRAs trained across SDXL and FLUX model families.
- Built full multimodal content pipelines: AI avatar generation (FLUX.1, SDXL, IP-Adapter conditioning, ControlNet), AI video production (LTX-2, Kling, Seedance, Runway, HunyuanVideo), automated voiceover and lip-sync (ElevenLabs, MiniMax TTS, ACE Step 1.5), end-to-end workflow automation via ComfyUI on 23+ versioned workflow systems.
- Critically evaluated image and video outputs against systematic quality frameworks: image acceptance rate improved from 10% baseline (no LoRA) to 80%+ (Phase 3); video acceptance rate from 20% to 40–50%; regeneration cycles reduced from 5–7 to 2–3 per asset.
- Designed production ComfyUI architecture: custom Python node classes with typed input/output schemas, registered front-end extensions, custom UI widgets, composable graph patterns for identity conditioning, multi-reference style transfer, mask generation, and workflow routing.
- Built and operated multi-agent Agentic Marketing Team: coordinator dispatching to Strategy, Content, Distribution, Analytics, and Adversarial Review sub-agents; HubSpot CRM integration via API; Langfuse observability; DeepEval quality gates; human-in-the-loop approval workflow.
- Managed outbound BD and CRM execution in HubSpot: prospect list building, campaign sequencing, open/click/reply signal iteration, pipeline hygiene across 100+ active prospects; near break-even P&L across compute, API, and infrastructure costs against $125K+ in delivery revenue.
- Applied AI-native agentic coding (Claude Code, Cursor) with harness engineering: behavioral rules via agents.md, modular SKILL.md patterns, 3-tier memory routing with cross-session state; published Super Claude Framework on Claude Code marketplace.

### Inception Capital — Associate, AI × Web3
**New York, NY | Apr 2023 – Oct 2023**

- Evaluated 120+ early-stage companies across AI, Web3, fintech, and enterprise SaaS on product maturity, architectural scalability, and technical roadmap credibility — synthesizing findings into structured recommendations for senior partners and driving two investment commitments through IC approval.
- Produced structured investment memos and decision materials for senior partners, distilling complex technical and commercial findings into concise business cases; portfolio companies: Unisat, Flock.io, Theoriq, MyShell.
- Advised portfolio founders on blockchain architecture decisions, tokenomics design, EVM-compatible protocol selection, and compliance-aligned token structure.
- Built internal operations workflows integrating Zapier, HubSpot CRM, Notion, Slack, and Telegram — automating deal flow tracking, stakeholder communications, and performance reporting.

### Moonearn Blockchain Technology — Co-Founder & Co-CTO
**Toronto, ON | Feb 2022 – Dec 2022**

- Co-founded distributed GPU and ASIC blockchain compute infrastructure company; managed uptime, cost efficiency, and operational reliability across multiple sites; reached into the million-USD revenue range during operational period.
- Coordinated vendor sourcing, hardware deployment, and maintenance workflows across distributed sites.

### Early Internships (2018–2021)

- **AWS — IBD Business Analyst** (Jun–Dec 2021, Beijing): Internal automation tooling and cloud infrastructure analysis for AWS enterprise clients.
- **Tencent — Cloud & Smart Industry BA** (Jul–Sep 2020, Shenzhen): Business analysis on cloud and enterprise technology initiatives.
- **China Investment Securities — ABS Junior Analyst** (Jun–Aug 2019, Beijing): Asset-backed securitization, financial modeling, deal structuring.
- **JD.COM — Cloud Consultant** (Jul–Sep 2018, Beijing): Cloud infrastructure consulting and client advisory.
- **Elemental Concept — Business Analyst** (May–Jul 2018, London UK): Machine learning algorithms for cancer tumor detection for a German private health hospital.

---

## Projects

### Agentic News Intelligence Platform
Production multi-agent pipeline on GCP: coordinator orchestrates 6 sub-agents (ingestion, classification, ranking, narrative synthesis, adversarial review, TTS delivery) across a 7-layer DAG. RAG-powered retrieval via Vertex AI Vector Search. DeepEval evaluation gates. Langfuse observability. Runs fully unattended daily.
*Stack: LangGraph, GCP Cloud Run, Vertex AI, Langfuse, DeepEval*

### Cross-Platform AI Memory Bank
Persistent unified AI memory layer via browser extension and CLI, backed by SQLite with hybrid BM25 + semantic vector search over a RAG pipeline. Enables consistent context retrieval across AI sessions.
*Stack: SQLite, BM25, semantic search, RAG, Python, browser extension*

### Agentic Full-Suite Marketing Team
Multi-agent autonomous marketing department: coordinator dispatching to 6 specialized sub-agents (Strategy, Content, Visual Direction, Distribution, Analytics, Adversarial Review). HubSpot CRM API integration. Langfuse observability. DeepEval quality gates. Human-in-the-loop approval gates.
*Stack: LangGraph, HubSpot API, DeepEval, Langfuse, Claude/GPT-4.1*

### Super Claude Framework
Published Claude Code plugin: 3-tier memory routing with cross-session state management, behavioral rules via agents.md, modular SKILL.md capability patterns. Available on Claude Code marketplace.
*Stack: Claude Code, JavaScript, Markdown*

---

## Education

**UCLA Anderson School of Management** — Master of Financial Engineering (MFE)
Sep 2022 – Dec 2023 | Los Angeles, CA
Quantitative modeling, financial analysis, business problem-solving. Coursework: Bitcoin/crypto market sentiment and investor behavior research.

**Western University** — Bachelor of Science in Engineering, Software Engineering Specialization
Sep 2017 – Apr 2022 | London, ON
Software engineering foundations, systems thinking, programming fundamentals (Python, data structures, algorithms).

---

## Skills

**AI Engineering:** LangGraph, Google ADK, CrewAI, AutoGen, MCP, LangChain, LlamaIndex, RAG pipelines, Pinecone, Qdrant, Vertex AI Vector Search, DeepEval, RAGAS, Langfuse, LangSmith, PyTorch, HuggingFace PEFT, LoRA/QLoRA fine-tuning, kohya-ss, FastAPI

**Generative AI:** ComfyUI, FLUX.1, SDXL, IP-Adapter, ControlNet, DreamBooth, Stable Diffusion, AI video (Runway, Kling, Seedance, HunyuanVideo, LTX-2), voice cloning (ElevenLabs, MiniMax TTS), lip-sync (ACE Step)

**LLMs:** Claude (Anthropic), GPT-4.1/GPT-4o (OpenAI), Gemini (Google), Llama 3, Mistral

**Cloud & Infrastructure:** GCP (Cloud Run, Vertex AI, Cloud Build), AWS (ECS Fargate/EC2, S3, ECR, Lambda), Docker, Kubernetes/GKE, CI/CD (GitHub Actions, Cloud Build), Redis, Celery

**Languages:** Python (primary), TypeScript/JavaScript, SQL, Bash

**Business:** Full-cycle B2B sales, HubSpot CRM, territory building, Agile (sprint planning, backlog, demos, retros), financial modeling, investment due diligence

**Blockchain:** Solidity, Foundry, ERC-20/721/1155/3643, DeFi protocols, tokenomics design, Ethereum/EVM-compatible chains

---

## Languages

English (native), Mandarin Chinese (native)
```

**Step 2: Verify doctor now passes cv.md check**
```bash
cd "D:/Projects/career ops/career-ops"
node doctor.mjs
```
Expected: cv.md ✓, still 2 failures (profile.yml, portals.yml).

---

## Task 2: config/profile.yml — Will's Personal Profile

**Files:**
- Create: `D:/Projects/career ops/career-ops/config/profile.yml`
- Source: `context/knowledge bank/1_professional_identity/kb_will_identity.md`
- Source schema: `config/profile.example.yml`

**Why this content:** Every field maps directly to a kb fact. Nothing invented. Compensation targets from kb_will_identity.md Section A. Narrative from Section B career narrative framings. Proof points from Section A key differentiators + kb_dalamula_business.md metrics.

**Step 1: Read the schema**
```bash
cat "D:/Projects/career ops/career-ops/config/profile.example.yml"
```
Note every field name and structure before writing.

**Step 2: Write config/profile.yml**

```yaml
# Career-Ops Profile — Will (Xinyuan) Guo
# Source of truth: context/knowledge bank/1_professional_identity/kb_will_identity.md
# DO NOT edit modes/_shared.md for personalization — put everything here or in modes/_profile.md

candidate:
  full_name: "Will (Xinyuan) Guo"
  email: "william974314065@gmail.com"
  phone: "+1 416-508-2788"
  location: "Toronto, Ontario, Canada"
  linkedin: "linkedin.com/in/xinyuan-guo"
  portfolio_url: "https://dalamula.ai"
  github: ""                          # verify if public GitHub exists before filling
  twitter: ""                         # verify if public X/Twitter handle exists

target_roles:
  primary:
    - "AI Engineer"
    - "Solutions Architect"
    - "Account Executive — AI"
    - "AI Product Manager"
    - "Technical Consultant — AI"
    - "Generative AI Engineer"
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
    - name: "Generative AI Architect"
      level: "Senior"
      fit: "primary"

narrative:
  headline: "Applied AI practitioner who builds, sells, and deploys production agentic systems"
  exit_story: >
    Co-founded and operated Dalamula Technology for 3 years — a generative AI studio that delivered
    61 production deployments across 50+ clients, generated $125K+ in revenue, and received a $1M
    term sheet at peak. Strategic wind-down in early 2026 as closed-source platform products from
    major companies (Google Veo, Kling, Sora, Runway) compressed the boutique studio market.
    Now targeting roles where I can apply production AI depth at enterprise scale with a world-class
    platform and team behind me. Moving toward the work (technical advisory, architecture, deployment),
    not away from failure.
  superpowers:
    - "Full-stack agentic AI — LangGraph, Google ADK, RAG, LoRA fine-tuning, multimodal production pipelines"
    - "Technical-commercial hybrid — personally built AND sold 50+ B2B AI engagements simultaneously"
    - "Generative AI production at scale — 120+ LoRAs trained, 23 workflow versions, 61 deployments"
    - "Speed-to-production — from zero to working production system in days, not weeks"
    - "Frontier AI daily practitioner — self-built agentic intelligence pipeline, 3+ years daily usage"
    - "Cross-domain fluency — engineering, sales, PM, creative direction, strategic advisory"
  proof_points:
    - name: "Dalamula Technology"
      url: "https://dalamula.ai"
      hero_metric: "50+ clients, $125K+ revenue, 61 production deployments, $1M term sheet"
    - name: "Super Claude Framework"
      url: ""                          # add GitHub URL when available
      hero_metric: "Published on Claude Code marketplace — 3-tier memory routing, cross-session state"
    - name: "Agentic News Intelligence Platform"
      url: ""
      hero_metric: "7-layer DAG, 6 sub-agents, runs unattended daily on GCP"
    - name: "Neon-Surrealism Portfolio"
      url: "https://dalamula.ai"
      hero_metric: "Identity-preserving LoRA conditioning, cinematic lighting, 100K–400K+ follower growth"

compensation:
  target_range: "$120K-180K USD"
  currency: "USD"
  minimum: "$120K"
  location_flexibility: >
    Remote strongly preferred. Toronto-based. Open to hybrid max 2 days/week in Toronto.
    Available for occasional travel (conferences, client visits, team meetups).
    Not available for daily on-site outside Toronto without relocation package.

location:
  country: "Canada"
  city: "Toronto"
  timezone: "EST (UTC-5)"
  visa_status: >
    Canadian permanent resident. Canadian work authorization — no sponsorship needed for Canada.
    US roles require employer sponsorship (TN or H1B) — must be confirmed before applying.
  onsite_availability: "Max 2 days/week hybrid in Toronto; occasional travel OK"

language:
  modes_dir: "modes"                   # use English modes (default)
  output_language: "en"
```

**Step 3: Verify doctor now passes profile.yml check**
```bash
cd "D:/Projects/career ops/career-ops"
node doctor.mjs
```
Expected: cv.md ✓, profile.yml ✓, still 1 failure (portals.yml).

---

## Task 3: modes/_profile.md — Will's Archetype Scoring and Narrative Overrides

**Files:**
- Copy + modify: `D:/Projects/career ops/career-ops/modes/_profile.md`
- Source template: `modes/_profile.template.md`
- Source content: `context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md`
- Source content: `context/knowledge bank/5_career_positioning/kb_resume_mapping_logic.md`

**Why this matters:** career-ops reads _profile.md during every evaluation to personalize scoring. This file overrides the generic archetypes in _shared.md with Will's specific role tracks, proof points, and deal-breakers. If this is wrong, all evaluations will be miscalibrated.

**Step 1: Read current template**
```bash
cat "D:/Projects/career ops/career-ops/modes/_profile.template.md"
```

**Step 2: Write modes/_profile.md**

Replace the entire template content with:

```markdown
# User Profile Context — Will (Xinyuan) Guo

## Target Roles

| Archetype | Thematic axes | What they buy | Fit |
|-----------|---------------|---------------|-----|
| **AI Engineer** | Agentic systems, RAG, multimodal, LLMOps, production ML | Someone who ships AI systems to production, not just prototypes | Primary |
| **Solutions Architect / FDE** | Client-facing architecture, integrations, post-deployment, expansion | Someone who maps customer needs to AI architecture and owns the full lifecycle | Primary |
| **Generative AI Engineer / Technical Artist** | ComfyUI, LoRA, multimodal pipelines, video generation | Someone who builds the infrastructure for creative AI at production scale | Primary |
| **Account Executive — AI** | Full-cycle sales, pipeline building, technical PoV, land-and-expand | Someone with technical credibility who can close AI deals consultatively | Secondary |
| **AI Product Manager** | Discovery, stakeholder alignment, PRDs, KPI tracking, AI roadmaps | Someone who translates business problems into AI product requirements with hands-on deployment depth | Secondary |
| **Consultant / Technical Advisory** | End-to-end AI deployment, client enablement, system design, executive communication | Someone who owns the full analytics value chain from ambiguous problem to production outcome | Adjacent |

## Adaptive Framing — Emphasize by Role Type

| If the role is... | Lead with... | Proof point priority |
|-------------------|-------------|---------------------|
| AI Engineer | LangGraph/ADK agentic architecture, RAG pipeline design, multimodal systems, observability | Dalamula 61 deployments, Agentic News Intelligence, Super Claude Framework |
| Solutions Architect | Primary technical advisor across 50+ client engagements, architecture + integrations + enablement | Dalamula client lifecycle, 23 versioned workflow templates, 60% deployment failure reduction |
| Generative AI / Technical Artist | ComfyUI custom nodes, LoRA training pipeline (20+ identity, ~100 style), 4-axis video evaluation | 10%→80% image acceptance, 20%→50% video acceptance, neon-surrealism portfolio |
| Account Executive | Full-cycle B2B sales from scratch, $125K+ revenue, 50+ closes, territory building, land-and-expand | HubSpot CRM execution, tiered segmentation, ~$8.5K case study (Momentum Creative) |
| AI Product Manager | Stakeholder discovery, AI use case requirements, KPI definition, change management, Agile delivery | 50+ discovery workshops, 61 deployment lifecycle management, Agentic Marketing Team |
| Consultant | Full analytics value chain, Inception Capital (120+ evaluations, IC commitments), structured problem-solving | Multimodal Intelligence Platform system design, partner-level business case writing |

## Exit Narrative (use in all summaries and cover letters)

Will co-founded Dalamula Technology in 2023 and operated it for 3 years as the primary technical architect AND primary client-facing lead simultaneously — designing production agentic systems, RAG pipelines, and multimodal generative workflows while personally closing 50+ B2B clients and generating $125K+ in revenue. The strategic decision to wind down in early 2026 came as closed-source platforms from Google, ByteDance, and OpenAI compressed the boutique AI studio market. This was not a failure of execution — Dalamula had real clients, real revenue, and a $1M term sheet (turned down at peak). Will is now moving toward the work he is most energized by (technical architecture, client advisory, AI deployment) at enterprise scale, with a world-class platform and team around him.

**Key framing:** "I'm moving toward something, not away from something."

## Cross-Cutting Advantage

Will's signature is being **the only person in the room who can do all of it**: design the AI architecture, run the sales call, write the PRD, train the LoRA, debug the production issue, and explain the ROI to the CFO. Most candidates have technical depth OR commercial breadth. Will has both, with 3 years of production proof.

## Deal-Breakers — Score 1.0 or SKIP

Apply these before any other scoring:
- On-site 4–5 days/week with no remote flexibility → SKIP
- Total compensation below $120K USD → SKIP
- Company fewer than 10 employees → SKIP (too early, no platform)
- US role requiring self-sponsorship (Will needs employer TN/H1B sponsorship for US) → flag prominently
- Pure non-technical sales with zero AI/technical component → SKIP
- Purely academic research role with no path to production → SKIP

## Scoring Calibration

**Boost score (+0.3 to +0.5) for:**
- Multi-agent systems / agentic AI in the role description
- RAG or knowledge retrieval systems
- Generative AI production (not just "using ChatGPT")
- Enterprise AI deployment at scale
- Roles where technical + commercial combined is the differentiator
- Series B+ or public company with established AI platform
- Companies Will has specifically targeted: Anthropic, Glean, xAI, ElevenLabs, Runway, Salesforce, Databricks, Scale AI, Cohere

**Reduce score (-0.3 to -0.5) for:**
- Pure frontend/UI role with minimal AI component
- Non-AI SaaS (CRM, ERP, HRIS) with AI bolted on superficially
- Semiconductor / hardware design roles
- Pure management with no technical component ("Director of AI" with only headcount responsibility)
- Roles requiring domain expertise Will doesn't have (radiology, genomics, legal)
- Companies headquartered in countries where Will has no work authorization and no sponsorship path

## Compensation Framing

**Salary expectations:**
> "Based on market data for this type of role — AI engineering / SA / technical sales — and my background delivering production systems and $125K+ in commercial revenue as a founder, I'm targeting $120K–$180K USD total comp. I'm flexible on structure across base, bonus, and equity — what matters is the total package and the opportunity to work on hard problems with a great team."

**Geographic discount pushback:**
> "The roles I'm competitive for are output-based, not location-based. I built and delivered production AI systems across North America and APAC from Toronto. My track record doesn't change based on postal code."

**When offered below target:**
> "I'm comparing with opportunities in the $150K+ range. I'm drawn to [company] because of [specific reason]. Can we explore closing that gap through [equity / signing bonus / performance review timeline]?"

## Portfolio and Demo

**Primary portfolio:** https://dalamula.ai — neon-surrealism AI avatar collection demonstrating identity-preserving LoRA conditioning, cinematic lighting, and aesthetic judgment at scale.

**For technical roles:** offer to walk through the Agentic News Intelligence Platform architecture (LangGraph DAG, 7 layers, runs daily on GCP).

**For SA/consulting roles:** offer the Multimodal Intelligence Platform system design document (28-section enterprise architecture).

**When to share:** For generative AI, creative, and SA roles. Always in cover letters for companies where dalamula.ai is directly relevant (ElevenLabs, Runway, Midjourney, Stability, HeyGen, Synthesia).

## Location Policy

**In forms:** Remote / hybrid. Toronto-based. EST timezone. Canadian work authorization (no sponsorship needed in Canada).

**US roles:** Flag visa requirement in every report. Score the visa dimension at 3.0 unless company has confirmed sponsorship history or explicitly offers it — not 1.0 (that's for "must be in SF 5 days/week"), but a real signal to address.

**In evaluations:** If role is fully remote, no location penalty. If hybrid outside Toronto, reduce by 0.3 unless Will is interested enough to consider relocation (flag explicitly in report).
```

**Step 3: Verify _profile.md was written correctly**
```bash
cat "D:/Projects/career ops/career-ops/modes/_profile.md" | head -30
```
Expected: file starts with `# User Profile Context — Will (Xinyuan) Guo`

---

## Task 4: portals.yml — Company List + Title Filters

**Files:**
- Create: `D:/Projects/career ops/career-ops/portals.yml`
- Source: `context/AI_Companies_Consolidated_Ranked_v2.xlsx` (programmatic extraction)
- Source: `context/knowledge bank/5_career_positioning/kb_master_resume_and_positioning.md` (role tracks → keywords)

**Why this is the most complex task:** portals.yml has two major components:
1. `title_filter` — keywords that determine which job titles pass through (must match Will's actual target role vocabulary)
2. `tracked_companies` — the curated list of companies with their career URLs

The title filter must be aggressive enough to block irrelevant roles (hardware engineer, recruiter, accountant) while inclusive enough to catch all Will's target role types (AI engineer, SA, AE, PM, consultant, creative AI).

The company list must be curated — not all 341 filtered companies are relevant. We include ~130 where Will realistically applies.

### Step 1: Generate company YAML from Excel

Run this node script from `career-ops/`:
```bash
cd "D:/Projects/career ops/career-ops"
node -e "
const XLSX = require('xlsx');
const yaml = require('js-yaml');
const wb = XLSX.readFile('../context/AI_Companies_Consolidated_Ranked_v2.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

// Companies to include by name or rank (curated list)
// Exclusion list: pure HW/semi, robotics hardware, defense drones, pure AV hardware,
// very early stage unclear, duplicates with wrong URLs, pure consumer with no AI hiring
const EXCLUDE_NAMES = [
  'Broadcom','AMD','Cambricon Technologies','D-Matrix','Positron','SiFive','Etched',
  'Tesla','Waymo','Mobileye','Aurora Innovation','Pony.ai','Nuro','Wayve','Oxa',
  'Figure AI','Agility Robotics','Unitree Robotics','UBTECH','1X Technologies',
  'Fourier Intelligence','Sanctuary AI','Symbotic','Covariant','Skydio','Zipline',
  'Foxconn / Hon Hai','HP','Keysight','Nokia','Equinix','NetApp','F5','Pure Storage',
  'Hewlett Packard Enterprise','Arista Networks','Cisco',
  'BioNTech AI','Recursion Pharmaceuticals','Exscientia','Cradle','Augmedics',
  'Anduril Industries','Shield AI','Helsing','BigBear.ai',
  'MercadoLibre','PDD Holdings','NetEase','Grab Holdings','Coupang','DoorDash',
  'MercadoLibre','Meituan','JD.com','NetEase','Naver','Baidu','DiDi','Trip.com',
  'Lenovo','Ericsson','Kaspi.kz Joint Stock Company','Futu Holdings',
  'Roper Technologies','Constellation Software','Dassault Systèmes','PTC','Trimble',
  'Automatic Data Processing','Global Payments','Fiserv','Wolters Kluwer','SS&C Technologies',
  'Constellation Software','Cambricon Technologies','Foxconn-adjacent: Nebius',
  'Treefera','Suffescom Solutions','Innowise','JusBrasil','Krutrim',
  'Rebellion Defense','Dataminr','Primer',
  'Fourier Intelligence','Physical Intelligence',
  'Apptronik','Hippocratic AI','Delfina Care','Joyful Health','Blossom','Cera','Huma',
  'Augmedics','Viz.ai',
  'DeepL-adjacent: Phrase','DeepL-adjacent: Translated','DeepL-adjacent: Unbabel',
  'Cohere-adjacent: MindsDB','Cohere-adjacent: Voyage AI',
  'Databricks-adjacent: Fivetran','Databricks-adjacent: dbt Labs','Databricks-adjacent: Tecton',
  'Palantir-adjacent: Dataminr','Palantir-adjacent: Primer','Palantir-adjacent: Rebellion Defense',
  'Scale AI-adjacent: Labelbox','Scale AI-adjacent: Surge AI',
  'Runway-adjacent: Lumen Orbis','Runway-adjacent: Genmo',
  'Harvey-adjacent: Legora',
  'Hugging Face-adjacent: Lightning AI','Hugging Face-adjacent: Ollama',
  'Five AI-adjacent: Oxa','CrowdStrike-adjacent: Wiz',
  'Abnormal-adjacent: Island','Abnormal-adjacent: Tessian','Abnormal-adjacent: Halcyon',
  'Abnormal Security','Material Security',
  'Udio','Suno',
  'Tencent','Alibaba','NetEase','Baidu','Zhipu AI','Baichuan AI','MiniMax',
  'Kuaishou Technology','SenseTime','Moonshot AI','01.AI',
  'Navan',
  'OpenEvidence','Blip.ai','Avoca','Aurascape','Airia',
  'ComplyAdvantage','Quantexa','Thought Machine','Omnea','Opaque Systems',
  'Lendable','Listen Labs','Harmonic','DevRev','Doppel','Exactly.ai',
  'CloudNC','Codium','Deel','Cera','Blossom','Delfina Care','Joyful Health',
  'Traba','Treefera','Zipline','Skild AI',
  'Ebay','MercadoLibre','Coupang','Grab Holdings','DoorDash','Sea Limited',
  'Lenovo','HP','Nokia','Equinix','Pure Storage',
];

const relevant = data.slice(1).filter(r => {
  const name = (r[1] || '').trim();
  const url = (r[11] || '').trim();
  if (!url || url === 'N/A') return false;
  if (EXCLUDE_NAMES.some(e => name.toLowerCase().includes(e.toLowerCase()))) return false;
  return true;
});

const companies = relevant.map(r => ({
  name: r[1],
  rank: r[0],
  category: r[7] || '',
  careers_url: r[11],
  enabled: true,
}));

console.log('Included companies:', companies.length);
companies.forEach(c => console.log(c.rank + ' | ' + c.name + ' | ' + c.careers_url));
" 2>&1 | tee /tmp/company-check.txt
```
Expected: ~130-150 companies printed. Review the list — if any are clearly wrong, note them.

### Step 2: Write portals.yml

Write the complete portals.yml. Use the company list from Step 1. Below is the complete file structure — the tracked_companies section uses all companies from the node script output:

```yaml
# portals.yml — Career-Ops Portal Scanner Configuration
# Candidate: Will (Xinyuan) Guo
# Last updated: 2026-04-17
# Source: context/AI_Companies_Consolidated_Ranked_v2.xlsx (filtered to AI-relevant companies)
# Title filters: derived from Will's target role tracks (AI-ENG, SA, AE, PM, GEN-AI, CREATIVE)

# ─────────────────────────────────────────────────────────────────────────────
# TITLE FILTER
# At least 1 positive must match AND 0 negatives must match (case-insensitive).
# ─────────────────────────────────────────────────────────────────────────────

title_filter:
  positive:
    # ── AI / ML Engineering ──────────────────────────────────────────────────
    - "AI Engineer"
    - "ML Engineer"
    - "Machine Learning Engineer"
    - "Applied AI"
    - "Applied ML"
    - "LLM Engineer"
    - "Agentic"
    - "Agent Engineer"
    - "GenAI"
    - "Generative AI"
    - "RAG"
    - "MLOps"
    - "LLMOps"
    - "AI Platform"
    - "AI Infrastructure"
    - "Foundation Model"
    - "Model Engineer"
    - "AI Research Engineer"   # applied research, not pure science
    - "Multimodal"
    - "NLP Engineer"
    - "Conversational AI"
    # ── Solutions / Technical Advisory ───────────────────────────────────────
    - "Solutions Architect"
    - "Solutions Engineer"
    - "Forward Deployed Engineer"
    - "Forward Deployed"
    - "Customer Engineer"
    - "Integration Engineer"
    - "Technical Account"
    - "Technical Account Manager"
    - "Field Engineer"
    - "Field AI"
    - "Implementation Engineer"
    - "Deployment Engineer"
    - "AI Architect"
    - "Enterprise Architect"
    # ── Sales / Business Development ─────────────────────────────────────────
    - "Account Executive"
    - "Enterprise Account Executive"
    - "Strategic Account Executive"
    - "Sales Engineer"
    - "AI Sales"
    - "Business Development"
    - "Enterprise Sales"
    - "Technical Sales"
    - "Partner Sales"
    # ── Product Management ───────────────────────────────────────────────────
    - "AI Product Manager"
    - "Product Manager"
    - "Technical Product Manager"
    - "Technical PM"
    - "Group Product Manager"
    - "Senior Product Manager"
    - "Staff Product Manager"
    # ── Consulting / Advisory ────────────────────────────────────────────────
    - "AI Consultant"
    - "Technical Consultant"
    - "AI Advisor"
    - "AI Strategist"
    - "Technology Consultant"
    # ── Generative AI / Creative ─────────────────────────────────────────────
    - "Creative Technologist"
    - "Technical Artist"
    - "AI Trainer"
    - "AI Model Trainer"
    - "Image Trainer"
    - "Video Trainer"
    - "Prompt Engineer"
    - "ComfyUI"
    - "LoRA"
    - "Stable Diffusion"
    - "Video Generation"
    - "Content AI"
    # ── Broad AI roles ───────────────────────────────────────────────────────
    - "Artificial Intelligence"
    - "Deep Learning"
    - "AI Developer"
    - "AI Software Engineer"
    - "Software Engineer, AI"
    - "Software Engineer - AI"
    - "Staff AI"
    - "Senior AI"
    - "Principal AI"

  negative:
    # ── Roles outside Will's scope ───────────────────────────────────────────
    - "intern"
    - "internship"
    - "co-op"
    - "coop"
    - "PhD"
    - "postdoc"
    - "research scientist"        # pure research (not "research engineer")
    - "principal scientist"
    - "staff scientist"
    - "hardware engineer"
    - "ASIC"
    - "chip design"
    - "semiconductor"
    - "embedded"
    - "FPGA"
    - "firmware"
    - "mechanical engineer"
    - "electrical engineer"
    - "civil engineer"
    - "recruiter"
    - "talent acquisition"
    - "hr manager"
    - "human resources"
    - "payroll"
    - "accountant"
    - "financial analyst"         # not FP&A type roles
    - "legal counsel"
    - "paralegal"
    - "attorney"
    - "administrative"
    - "executive assistant"
    - "office manager"
    - "facilities"
    - "supply chain"
    - "procurement"
    - "safety engineer"           # industrial safety, not AI safety
    - "quality assurance"         # traditional QA, not AI eval
    - "security analyst"          # SOC analyst, not AI security
    - "network engineer"
    - "systems administrator"
    - "database administrator"
    - "data entry"
    - "customer support"          # frontline support, not AI customer support engineering
    - "marketing manager"         # traditional marketing, not AI marketing engineering
    - "social media manager"
    - "graphic designer"
    - "ui designer"
    - "ux designer"
    - "copywriter"
    - "content writer"            # pure writing, not AI content engineering
    - "journalist"
    - "radiologist"
    - "physician"
    - "nurse"
    - "clinical"
    - "neuroscientist"
    - "biologist"
    - "chemist"

# ─────────────────────────────────────────────────────────────────────────────
# SEARCH QUERIES (for WebSearch-based discovery, Strategy 3)
# ─────────────────────────────────────────────────────────────────────────────

search_queries:
  - "AI engineer jobs Toronto remote 2026"
  - "solutions architect AI Toronto remote 2026"
  - "agentic AI engineer jobs 2026"
  - "LLM engineer jobs remote Canada 2026"
  - "generative AI engineer jobs remote 2026"
  - "account executive AI startup Toronto 2026"
  - "forward deployed engineer AI 2026"
  - "AI product manager remote Canada 2026"
  - "RAG engineer jobs 2026"
  - "LangGraph engineer jobs 2026"
  - "ComfyUI engineer jobs 2026"
  - "multimodal AI engineer jobs 2026"

# ─────────────────────────────────────────────────────────────────────────────
# TRACKED COMPANIES
# Curated from AI_Companies_Consolidated_Ranked_v2.xlsx
# Filtered to: AI-native, enterprise software with AI, generative AI, AI infra
# Excluded: semiconductors/HW, pure robotics hardware, defense drones, pure AV,
#           very consumer (food delivery, ride-share), unclear/no-category
# ─────────────────────────────────────────────────────────────────────────────

tracked_companies:

  # ── Frontier Model Labs ───────────────────────────────────────────────────
  - name: "Alphabet (Google)"
    rank: 2
    category: "Frontier Model Labs"
    careers_url: "https://www.google.com/about/careers/applications/"
    enabled: true

  - name: "Meta Platforms"
    rank: 8
    category: "Frontier Model Labs"
    careers_url: "https://www.metacareers.com/"
    enabled: true

  - name: "OpenAI"
    rank: 12
    category: "Frontier Model Labs"
    careers_url: "https://openai.com/careers/"
    enabled: true

  - name: "xAI"
    rank: 28
    category: "Frontier Model Labs"
    careers_url: "https://x.ai/careers"
    enabled: true

  - name: "Anthropic"
    rank: 22
    category: "Frontier Model Labs"
    careers_url: "https://www.anthropic.com/careers"
    enabled: true

  - name: "Mistral AI"
    rank: 219
    category: "Frontier Model Labs"
    careers_url: "https://mistral.ai/careers/"
    enabled: true

  - name: "Cohere"
    rank: 248
    category: "Frontier Model Labs"
    careers_url: "https://cohere.com/careers"
    enabled: true

  - name: "AI21 Labs"
    rank: 303
    category: "Frontier Model Labs"
    careers_url: "https://www.ai21.com/careers"
    enabled: true

  - name: "Reflection AI"
    rank: 156
    category: "Frontier AI / Open-Source Models"
    careers_url: "https://reflection.ai/careers/"
    enabled: true

  - name: "Safe Superintelligence"
    rank: 132
    category: "Frontier Model Labs"
    careers_url: "https://ssi.inc/careers"
    enabled: true

  - name: "Aleph Alpha"
    rank: 345
    category: "Frontier Model Labs"
    careers_url: "https://jobs.ashbyhq.com/AlephAlpha"
    api: "https://api.ashbyhq.com/posting-api/job-board/AlephAlpha?includeCompensation=true"
    enabled: true

  - name: "Sakana AI"
    rank: 321
    category: "AI Research / Foundation Models"
    careers_url: "https://sakana.ai/careers/"
    enabled: true

  - name: "Thinking Machines Lab"
    rank: 292
    category: "Frontier AI / Fine-Tuning"
    careers_url: "https://thinkingmachines.ai/careers"
    enabled: true

  - name: "Poolside"
    rank: 225
    category: "AI Coding Tools"
    careers_url: "https://www.poolside.ai/careers"
    enabled: true

  - name: "DeepSeek"
    rank: 393
    category: "Frontier Model Labs"
    careers_url: "https://www.deepseek.com/careers"
    enabled: true

  # ── Enterprise AI ─────────────────────────────────────────────────────────
  - name: "Palantir"
    rank: 19
    category: "Enterprise AI"
    careers_url: "https://www.palantir.com/careers/"
    enabled: true

  - name: "Databricks"
    rank: 47
    category: "Enterprise AI"
    careers_url: "https://www.databricks.com/company/careers"
    enabled: true

  - name: "Glean"
    rank: 231
    category: "Enterprise AI"
    careers_url: "https://www.glean.com/careers"
    enabled: true

  - name: "Scale AI"
    rank: 143
    category: "AI Infrastructure"
    careers_url: "https://scale.com/careers"
    enabled: true

  - name: "C3.ai"
    rank: 273
    category: "Enterprise AI"
    careers_url: "https://c3.ai/careers/"
    enabled: true

  - name: "DataRobot"
    rank: 254
    category: "Enterprise AI"
    careers_url: "https://www.datarobot.com/careers/"
    enabled: true

  - name: "Dataiku"
    rank: 276
    category: "Enterprise AI"
    careers_url: "https://www.dataiku.com/company/careers/"
    enabled: true

  - name: "Contextual AI"
    rank: 354
    category: "Enterprise AI / RAG"
    careers_url: "https://contextual.ai/careers/"
    enabled: true

  - name: "Presight AI"
    rank: 267
    category: "Enterprise AI"
    careers_url: "https://careers.g42.ai/presight/global/en/home"
    enabled: true

  - name: "H2O.ai"
    rank: 418
    category: "Enterprise AI"
    careers_url: "https://h2o.ai/company/careers/"
    enabled: true

  - name: "Hebbia"
    rank: 340
    category: "Enterprise AI"
    careers_url: "https://www.hebbia.com/careers"
    enabled: true

  # ── AI Cloud / GPU Infrastructure ─────────────────────────────────────────
  - name: "CoreWeave"
    rank: 85
    category: "AI Cloud"
    careers_url: "https://www.coreweave.com/careers"
    enabled: true

  - name: "Together AI"
    rank: 244
    category: "AI Cloud"
    careers_url: "https://www.together.ai/careers"
    enabled: true

  - name: "Lambda Labs"
    rank: 300
    category: "AI Cloud / GPU Infrastructure"
    careers_url: "https://lambdalabs.com/careers"
    enabled: true

  - name: "Crusoe"
    rank: 282
    category: "AI Cloud / Sustainable Compute"
    careers_url: "https://crusoe.ai/careers"
    enabled: true

  - name: "Nscale"
    rank: 217
    category: "AI Cloud Infrastructure"
    careers_url: "https://www.nscale.com/careers"
    enabled: true

  - name: "Modal"
    rank: 348
    category: "AI Cloud"
    careers_url: "https://modal.com/careers"
    enabled: true

  - name: "Fireworks AI"
    rank: 318
    category: "AI Cloud"
    careers_url: "https://fireworks.ai/careers"
    enabled: true

  - name: "OctoAI"
    rank: 428
    category: "AI Cloud"
    careers_url: "https://octo.ai/careers"
    enabled: true

  - name: "Vercel"
    rank: 237
    category: "AI Cloud"
    careers_url: "https://vercel.com/careers"
    enabled: true

  # ── AI Inference / Chips (SW roles) ──────────────────────────────────────
  - name: "NVIDIA"
    rank: 1
    category: "AI Chips / Compute"
    careers_url: "https://www.nvidia.com/en-us/about-nvidia/careers/"
    enabled: true

  - name: "Groq"
    rank: 250
    category: "AI Chips / Compute"
    careers_url: "https://groq.com/careers/"
    enabled: true

  - name: "Baseten"
    rank: 261
    category: "AI Inference Infrastructure"
    careers_url: "https://www.baseten.co/careers/"
    enabled: true

  - name: "SambaNova Systems"
    rank: 263
    category: "AI Hardware"
    careers_url: "https://sambanova.ai/company/careers/"
    enabled: true

  - name: "Lepton AI"
    rank: 373
    category: "AI Inference Platform"
    careers_url: "https://www.lepton.ai/careers"
    enabled: true

  # ── Generative AI / Synthetic Media ──────────────────────────────────────
  - name: "Runway"
    rank: 259
    category: "Generative Video"
    careers_url: "https://runwayml.com/careers/"
    enabled: true

  - name: "ElevenLabs"
    rank: 229
    category: "Synthetic Media"
    careers_url: "https://elevenlabs.io/careers"
    enabled: true

  - name: "Synthesia"
    rank: 272
    category: "Synthetic Media"
    careers_url: "https://www.synthesia.io/careers"
    enabled: true

  - name: "HeyGen"
    rank: 420
    category: "Synthetic Media"
    careers_url: "https://job-boards.greenhouse.io/heygen"
    api: "https://boards-api.greenhouse.io/v1/boards/heygen/jobs"
    enabled: true

  - name: "Stability AI"
    rank: 322
    category: "Synthetic Media"
    careers_url: "https://stability.ai/careers"
    enabled: true

  - name: "Midjourney"
    rank: 320
    category: "Synthetic Media"
    careers_url: "https://www.midjourney.com/careers"
    enabled: true

  - name: "Pika"
    rank: 275
    category: "AI Video Generation"
    careers_url: "https://pika.art/careers"
    enabled: true

  - name: "Pika Labs"
    rank: 432
    category: "Generative Video"
    careers_url: "https://pika.art/careers"
    enabled: true

  - name: "Black Forest Labs"
    rank: 324
    category: "AI Image Generation"
    careers_url: "https://bfl.ai/careers"
    enabled: true

  - name: "Luma AI"
    rank: 347
    category: "Generative Video"
    careers_url: "https://lumalabs.ai/careers"
    enabled: true

  - name: "Ideogram"
    rank: 360
    category: "AI Image Generation"
    careers_url: "https://jobs.ashbyhq.com/ideogram"
    api: "https://api.ashbyhq.com/posting-api/job-board/ideogram?includeCompensation=true"
    enabled: true

  - name: "World Labs"
    rank: 338
    category: "Spatial AI / 3D World Models"
    careers_url: "https://job-boards.greenhouse.io/worldlabs"
    api: "https://boards-api.greenhouse.io/v1/boards/worldlabs/jobs"
    enabled: true

  - name: "Descript"
    rank: 325
    category: "AI Video/Audio Editing"
    careers_url: "https://www.descript.com/careers"
    enabled: true

  - name: "Twelve Labs"
    rank: 377
    category: "AI Video Understanding"
    careers_url: "https://www.twelvelabs.io/careers"
    enabled: true

  - name: "Kling AI"
    rank: 178
    category: "AI Video Generation"
    careers_url: "https://runwayml.com/careers/"
    enabled: false                    # URL maps to Runway — disable until real URL found

  # ── AI Agents / Automation ────────────────────────────────────────────────
  - name: "Sierra"
    rank: 234
    category: "AI Agents"
    careers_url: "https://sierra.ai/careers"
    enabled: true

  - name: "Cognition AI"
    rank: 233
    category: "AI Coding Tools"
    careers_url: "https://www.cognition.ai/careers"
    enabled: true

  - name: "Adept AI"
    rank: 314
    category: "AI Agents"
    careers_url: "https://www.adept.ai/careers"
    enabled: true

  - name: "Cresta"
    rank: 298
    category: "AI Agents"
    careers_url: "https://www.cresta.com/careers"
    enabled: true

  - name: "Imbue"
    rank: 319
    category: "AI Agents / Reasoning"
    careers_url: "https://imbue.com/careers/"
    enabled: true

  - name: "Inworld AI"
    rank: 423
    category: "AI Agents"
    careers_url: "https://inworld.ai/careers"
    enabled: true

  - name: "Decagon"
    rank: 317
    category: "AI Customer Support Agents"
    careers_url: "https://decagon.ai/careers"
    enabled: true

  - name: "UiPath"
    rank: 228
    category: "AI Automation / RPA"
    careers_url: "https://www.uipath.com/careers"
    enabled: true

  - name: "Automation Anywhere"
    rank: 251
    category: "AI RPA / Intelligent Automation"
    careers_url: "https://www.automationanywhere.com/company/careers"
    enabled: true

  - name: "Celonis"
    rank: 222
    category: "AI Process Mining"
    careers_url: "https://careers.celonis.com"
    enabled: true

  # ── AI Developer Tools / Observability ───────────────────────────────────
  - name: "Hugging Face"
    rank: 268
    category: "AI Developer Tools"
    careers_url: "https://huggingface.co/jobs"
    enabled: true

  - name: "LangChain"
    rank: 306
    category: "AI Developer Tools"
    careers_url: "https://www.langchain.com/careers"
    enabled: true

  - name: "Weights & Biases"
    rank: 307
    category: "AI Observability"
    careers_url: "https://wandb.ai/site/careers/"
    enabled: true

  - name: "Anyscale"
    rank: 316
    category: "AI Infrastructure"
    careers_url: "https://www.anyscale.com/careers"
    enabled: true

  - name: "Replicate"
    rank: 368
    category: "AI Developer Tools"
    careers_url: "https://replicate.com/careers"
    enabled: true

  - name: "Arize AI"
    rank: 351
    category: "AI Observability / ML Monitoring"
    careers_url: "https://job-boards.greenhouse.io/arizeai"
    api: "https://boards-api.greenhouse.io/v1/boards/arizeai/jobs"
    enabled: true

  - name: "Galileo AI"
    rank: 385
    category: "AI Evaluation / LLM Testing"
    careers_url: "https://ats.rippling.com/galileo/jobs"
    enabled: true

  - name: "Snorkel AI"
    rank: 336
    category: "AI Data Labeling / Programmatic"
    careers_url: "https://snorkel.ai/join-us/"
    enabled: true

  - name: "Domino Data Lab"
    rank: 411
    category: "AI Developer Tools"
    careers_url: "https://domino.ai/careers"
    enabled: true

  - name: "VAST Data"
    rank: 138
    category: "AI Infrastructure"
    careers_url: "https://www.vastdata.com/company/careers"
    enabled: true

  - name: "Anysphere (Cursor)"
    rank: 141
    category: "AI Coding Tools"
    careers_url: "https://www.cursor.com/careers"
    enabled: true

  - name: "Replit"
    rank: 238
    category: "AI Coding Tools"
    careers_url: "https://replit.com/site/careers"
    enabled: true

  - name: "Lovable"
    rank: 252
    category: "AI Coding / Vibe-Coding"
    careers_url: "https://lovable.dev/careers"
    enabled: true

  - name: "Codeium"
    rank: 389
    category: "AI Coding"
    careers_url: "https://codeium.com/careers"
    enabled: true

  - name: "LMArena"
    rank: 296
    category: "AI Evaluation / Benchmarking"
    careers_url: "https://jobs.ashbyhq.com/lmarena"
    api: "https://api.ashbyhq.com/posting-api/job-board/lmarena?includeCompensation=true"
    enabled: true

  # ── Vector Databases ──────────────────────────────────────────────────────
  - name: "Pinecone"
    rank: 339
    category: "Vector Databases"
    careers_url: "https://www.pinecone.io/careers/"
    enabled: true

  - name: "Weaviate"
    rank: 349
    category: "Vector Databases"
    careers_url: "https://weaviate.io/company/careers"
    enabled: true

  - name: "Qdrant"
    rank: 433
    category: "Vector Databases"
    careers_url: "https://qdrant.tech/careers/"
    enabled: true

  - name: "Zilliz"
    rank: 449
    category: "Vector Databases"
    careers_url: "https://zilliz.com/careers"
    enabled: true

  - name: "Vectara"
    rank: 388
    category: "RAG Platform / Enterprise Search"
    careers_url: "https://vectara.com/careers/"
    enabled: true

  # ── AI SaaS / Productivity ────────────────────────────────────────────────
  - name: "Grammarly"
    rank: 221
    category: "AI SaaS"
    careers_url: "https://www.grammarly.com/careers"
    enabled: true

  - name: "Writer"
    rank: 295
    category: "AI SaaS"
    careers_url: "https://writer.com/careers/"
    enabled: true

  - name: "Jasper"
    rank: 299
    category: "AI SaaS"
    careers_url: "https://www.jasper.ai/careers"
    enabled: true

  - name: "Harvey"
    rank: 230
    category: "AI SaaS"
    careers_url: "https://www.harvey.ai/careers"
    enabled: true

  - name: "Notion AI"
    rank: 235
    category: "AI Productivity / Workspace"
    careers_url: "https://www.notion.so/careers"
    enabled: true

  - name: "Typeface"
    rank: 337
    category: "AI Content / Enterprise"
    careers_url: "https://www.typeface.ai/careers"
    enabled: true

  - name: "DeepL"
    rank: 289
    category: "AI SaaS"
    careers_url: "https://www.deepl.com/en/careers"
    enabled: true

  - name: "Gong"
    rank: 247
    category: "AI Revenue Intelligence"
    careers_url: "https://www.gong.io/careers"
    enabled: true

  - name: "Intercom AI"
    rank: 308
    category: "AI Customer Messaging / Agents"
    careers_url: "https://www.intercom.com/careers"
    enabled: true

  - name: "Moveworks"
    rank: 330
    category: "AI IT Support / Enterprise"
    careers_url: "https://www.moveworks.com/us/en/company/careers"
    enabled: true

  - name: "Observe.AI"
    rank: 362
    category: "AI Contact Center"
    careers_url: "https://www.observe.ai/careers"
    enabled: true

  - name: "AssemblyAI"
    rank: 346
    category: "AI Voice / Speech Intelligence"
    careers_url: "https://www.assemblyai.com/careers"
    enabled: true

  - name: "Deepgram"
    rank: 356
    category: "AI Voice / Speech-to-Text"
    careers_url: "https://deepgram.com/careers"
    enabled: true

  - name: "SoundHound AI"
    rank: 246
    category: "Consumer AI"
    careers_url: "https://www.soundhound.com/careers/"
    enabled: true

  - name: "Character.AI"
    rank: 312
    category: "Consumer AI"
    careers_url: "https://character.ai/careers"
    enabled: true

  - name: "Perplexity AI"
    rank: 177
    category: "AI Search"
    careers_url: "https://www.perplexity.ai/hub/careers"
    enabled: true

  - name: "Docusign AI"
    rank: 201
    category: "AI Contract / Agreement"
    careers_url: "https://careers.docusign.com/"
    enabled: true

  - name: "Ramp AI"
    rank: 223
    category: "AI Finance / Spend Management"
    careers_url: "https://ramp.com/careers"
    enabled: true

  - name: "Brex AI"
    rank: 224
    category: "AI Finance / Corporate Cards"
    careers_url: "https://www.brex.com/careers"
    enabled: true

  - name: "Mercor"
    rank: 281
    category: "AI Hiring / Talent Platform"
    careers_url: "https://www.mercor.com/careers"
    enabled: true

  - name: "Copy.ai"
    rank: 370
    category: "AI Marketing / GTM"
    careers_url: "https://www.copy.ai/careers"
    enabled: true

  - name: "Gamma"
    rank: 416
    category: "AI Productivity"
    careers_url: "https://gamma.app/careers"
    enabled: true

  - name: "Fathom"
    rank: 415
    category: "AI Productivity"
    careers_url: "https://fathom.video/careers"
    enabled: true

  - name: "Unstructured"
    rank: 367
    category: "AI Data Processing / ETL"
    careers_url: "https://unstructured.io/careers"
    enabled: true

  - name: "Cleanlab"
    rank: 379
    category: "AI Data Quality"
    careers_url: "https://cleanlab.ai/careers/"
    enabled: true

  - name: "Coactive AI"
    rank: 369
    category: "AI Visual Data / Enterprise"
    careers_url: "https://coactive.ai/careers"
    enabled: true

  - name: "Resolve AI"
    rank: 334
    category: "AI Incident Response / DevOps"
    careers_url: "https://resolve.ai/careers"
    enabled: true

  - name: "Pigment"
    rank: 302
    category: "AI Financial Planning"
    careers_url: "https://www.pigment.com/careers"
    enabled: true

  - name: "Rogo"
    rank: 364
    category: "AI Finance / Research"
    careers_url: "https://www.rogodata.com/careers"
    enabled: true

  # ── Enterprise Software with AI ───────────────────────────────────────────
  - name: "Salesforce"
    rank: 37
    category: "Enterprise software & developer tools"
    careers_url: "https://careers.salesforce.com/"
    enabled: true

  - name: "ServiceNow"
    rank: 63
    category: "Enterprise software & developer tools"
    careers_url: "https://www.servicenow.com/careers.html"
    enabled: true

  - name: "Adobe"
    rank: 61
    category: "Enterprise software & developer tools"
    careers_url: "https://www.adobe.com/careers.html"
    enabled: true

  - name: "SAP"
    rank: 31
    category: "Enterprise software & developer tools"
    careers_url: "https://jobs.sap.com/"
    enabled: true

  - name: "Workday"
    rank: 134
    category: "Enterprise software & developer tools"
    careers_url: "https://www.workday.com/en-us/company/careers/overview.html"
    enabled: true

  - name: "Atlassian"
    rank: 198
    category: "Enterprise software & developer tools"
    careers_url: "https://www.atlassian.com/company/careers"
    enabled: true

  - name: "Datadog"
    rank: 119
    category: "Enterprise software & developer tools"
    careers_url: "https://careers.datadoghq.com/"
    enabled: true

  - name: "MongoDB"
    rank: 184
    category: "Enterprise software & developer tools"
    careers_url: "https://www.mongodb.com/careers"
    enabled: true

  - name: "Snowflake"
    rank: 103
    category: "Enterprise software & developer tools"
    careers_url: "https://careers.snowflake.com/"
    enabled: true

  - name: "Canva"
    rank: 110
    category: "Creative software & collaboration"
    careers_url: "https://www.lifeatcanva.com/en/jobs/"
    enabled: true

  - name: "Intuit"
    rank: 59
    category: "Enterprise software & developer tools"
    careers_url: "https://www.intuit.com/careers/"
    enabled: true

  - name: "Autodesk"
    rank: 101
    category: "Enterprise software & developer tools"
    careers_url: "https://www.autodesk.com/careers"
    enabled: true

  - name: "Zoom"
    rank: 160
    category: "Enterprise software & developer tools"
    careers_url: "https://careers.zoom.us/"
    enabled: true

  - name: "GitLab"
    rank: 417
    category: "Enterprise software & developer tools"
    careers_url: "https://about.gitlab.com/jobs/"
    enabled: true

  - name: "Supabase"
    rank: 439
    category: "Developer tools"
    careers_url: "https://supabase.com/careers"
    enabled: true

  - name: "Zapier"
    rank: 448
    category: "AI Automation"
    careers_url: "https://zapier.com/jobs"
    enabled: true

  # ── Big Tech (AI divisions) ───────────────────────────────────────────────
  - name: "Microsoft"
    rank: 4
    category: "AI Cloud"
    careers_url: "https://careers.microsoft.com/"
    enabled: true

  - name: "Amazon"
    rank: 5
    category: "AI Cloud"
    careers_url: "https://www.amazon.jobs/"
    enabled: true

  - name: "Oracle"
    rank: 18
    category: "Cloud, networking & infrastructure"
    careers_url: "https://www.oracle.com/careers/"
    enabled: true

  - name: "IBM"
    rank: 30
    category: "Cloud, networking & infrastructure"
    careers_url: "https://www.ibm.com/careers"
    enabled: true

  # ── Fintech with AI ───────────────────────────────────────────────────────
  - name: "Stripe"
    rank: 38
    category: "Fintech & payments infrastructure"
    careers_url: "https://stripe.com/jobs"
    enabled: true

  - name: "Coinbase"
    rank: 102
    category: "Fintech, payments & crypto"
    careers_url: "https://www.coinbase.com/careers"
    enabled: true

  - name: "Block"
    rank: 117
    category: "Fintech, payments & crypto"
    careers_url: "https://block.xyz/careers"
    enabled: true

  - name: "Shopify"
    rank: 39
    category: "Enterprise software & developer tools"
    careers_url: "https://www.shopify.com/careers"
    enabled: true

  - name: "Revolut"
    rank: 73
    category: "Fintech & payments infrastructure"
    careers_url: "https://www.revolut.com/careers/"
    enabled: true

  - name: "Adyen"
    rank: 129
    category: "Fintech, payments & crypto"
    careers_url: "https://careers.adyen.com/"
    enabled: true

  # ── Consumer platforms with strong AI ────────────────────────────────────
  - name: "Netflix"
    rank: 20
    category: "Consumer internet & platforms"
    careers_url: "https://jobs.netflix.com/"
    enabled: true

  - name: "Spotify"
    rank: 57
    category: "Consumer internet & platforms"
    careers_url: "https://www.lifeatspotify.com/jobs"
    enabled: true

  - name: "Reddit"
    rank: 144
    category: "Consumer internet & platforms"
    careers_url: "https://www.redditinc.com/careers"
    enabled: true

  - name: "Airbnb"
    rank: 71
    category: "Consumer internet & platforms"
    careers_url: "https://careers.airbnb.com/"
    enabled: true

  - name: "Uber"
    rank: 40
    category: "Consumer internet & platforms"
    careers_url: "https://www.uber.com/us/en/careers/"
    enabled: true

  # ── Cybersecurity AI ──────────────────────────────────────────────────────
  - name: "Palo Alto Networks"
    rank: 48
    category: "Cybersecurity"
    careers_url: "https://jobs.paloaltonetworks.com/"
    enabled: true

  - name: "CrowdStrike"
    rank: 60
    category: "Cybersecurity"
    careers_url: "https://www.crowdstrike.com/careers/"
    enabled: true

  - name: "SentinelOne"
    rank: 245
    category: "AI Security"
    careers_url: "https://www.sentinelone.com/careers/"
    enabled: true

  - name: "Snyk"
    rank: 242
    category: "AI Developer Security"
    careers_url: "https://snyk.io/careers/"
    enabled: true

  - name: "Darktrace"
    rank: 262
    category: "AI Cybersecurity"
    careers_url: "https://darktrace.com/careers"
    enabled: true

  - name: "Wiz"
    rank: 133
    category: "AI Cloud Security"
    careers_url: "https://www.wiz.io/careers"
    enabled: true

  # ── AI Healthcare (selective — roles Will could fit) ──────────────────────
  - name: "Abridge"
    rank: 258
    category: "AI Healthcare"
    careers_url: "https://www.abridge.com/careers"
    enabled: true

  - name: "Ambience Healthcare"
    rank: 315
    category: "AI Healthcare / Clinical AI"
    careers_url: "https://www.ambiencehealthcare.com/careers"
    enabled: true

  # ── Misc high-signal AI ───────────────────────────────────────────────────
  - name: "Inflection AI"
    rank: 304
    category: "Consumer AI"
    careers_url: "https://www.inflection.io/careers"
    enabled: true

  - name: "Reka"
    rank: 361
    category: "Frontier AI / Multimodal"
    careers_url: "https://reka.ai/careers"
    enabled: true

  - name: "Nomic AI"
    rank: 390
    category: "AI Embeddings / Open-Source"
    careers_url: "https://home.nomic.ai/careers"
    enabled: true

  - name: "EvenUp"
    rank: 326
    category: "AI Legal Tech"
    careers_url: "https://www.evenuplaw.com/careers/"
    enabled: true

  - name: "Veritone"
    rank: 378
    category: "AI Media / Enterprise AI"
    careers_url: "https://veritone.wd1.myworkdayjobs.com/Veritone_Career_Site"
    enabled: true

  - name: "XBOW"
    rank: 447
    category: "AI Security"
    careers_url: "https://jobs.ashbyhq.com/xbowcareers"
    api: "https://api.ashbyhq.com/posting-api/job-board/xbowcareers?includeCompensation=true"
    enabled: true

  - name: "Tome"
    rank: 344
    category: "AI Presentations / Content"
    careers_url: "https://tome.app/careers"
    enabled: true

  - name: "Tennr"
    rank: 342
    category: "AI Healthcare / Revenue Cycle"
    careers_url: "https://www.tennr.com/careers"
    enabled: true

  - name: "OpenRouter"
    rank: 431
    category: "AI Developer Tools"
    careers_url: "https://openrouter.ai/careers"
    enabled: true

  - name: "DevRev"
    rank: 410
    category: "AI Developer Tools"
    careers_url: "https://devrev.ai/careers"
    enabled: true

  - name: "Fathom"
    rank: 415
    category: "AI Productivity"
    careers_url: "https://fathom.video/careers"
    enabled: false                    # duplicate of earlier entry — disable

  - name: "OneTrust"
    rank: 264
    category: "Privacy / AI Governance"
    careers_url: "https://www.onetrust.com/careers/"
    enabled: true

  - name: "Nektar.ai"
    rank: 0
    category: "AI Revenue Intelligence"
    careers_url: ""
    enabled: false                    # no URL available
```

### Step 3: Verify doctor passes portals.yml check
```bash
cd "D:/Projects/career ops/career-ops"
node doctor.mjs
```
Expected: All 3 checks pass (cv.md ✓, profile.yml ✓, portals.yml ✓). Zero issues.

### Step 4: Dry-run scan to confirm portals.yml is valid YAML and API detection works
```bash
cd "D:/Projects/career ops/career-ops"
node scan.mjs --dry-run 2>&1 | head -40
```
Expected: No YAML parse errors. Shows count of companies scanned and jobs found (or 0 if all companies use non-API portals). Note: many companies use Workday/custom portals that scan.mjs skips — that's expected and correct.

---

## Task 5: Initialize data/ files

**Files:**
- Create: `D:/Projects/career ops/career-ops/data/applications.md`
- Create: `D:/Projects/career ops/career-ops/data/pipeline.md`
- Create: `D:/Projects/career ops/career-ops/data/scan-history.tsv`

**Step 1: Check if data/ directory exists**
```bash
ls "D:/Projects/career ops/career-ops/data/"
```
Expected: directory exists (doctor.mjs already reported it ready).

**Step 2: Create applications.md**
```markdown
# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
```

**Step 3: Create pipeline.md**
```markdown
# Job Pipeline — Pending Evaluation

## Pendientes

## Procesadas
```

**Step 4: Create scan-history.tsv**
Single header line:
```
url	first_seen	portal	title	company	status
```

**Step 5: Run verify-pipeline**
```bash
cd "D:/Projects/career ops/career-ops"
node verify-pipeline.mjs
```
Expected: All checks pass.

---

## Final Verification

**Step 1: Full doctor check**
```bash
cd "D:/Projects/career ops/career-ops"
node doctor.mjs
```
Expected: 0 issues.

**Step 2: Dry-run scan**
```bash
node scan.mjs --dry-run 2>&1
```
Expected: No errors. Reports N companies scanned via API, shows any jobs found.

**Step 3: Pipeline health**
```bash
node verify-pipeline.mjs
```
Expected: Clean.

**Step 4: Update docs/STATUS.md**

Update `D:/Projects/career ops/docs/STATUS.md`:
- Move config file tasks from "In Progress" to "Done"
- Update "In Progress" to: custom-scraper.mjs, export-jobs.mjs
- Update handoff note
