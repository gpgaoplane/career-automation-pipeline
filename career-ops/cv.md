# Will (Xinyuan) Guo

william974314065@gmail.com | +1 416-508-2788 | Toronto, Ontario, Canada
linkedin.com/in/xinyuan-guo | dalamula.ai | github.com/gpgaoplane

---

## Summary

Applied AI practitioner and founder with 3+ years building, selling, and deploying production AI systems commercially. Co-founded Dalamula Technology — a generative AI studio that delivered 61 documented production deployments across 50+ clients, generating $125K+ in revenue with a team of 7. Primary technical architect and sole sales lead simultaneously: designed agentic AI systems, RAG pipelines, and multimodal generative workflows while personally closing 50+ B2B engagements. Former AI×Web3 VC Associate (Inception Capital, 120+ company evaluations). Software Engineering BSc (Western University) + MFE (UCLA Anderson). Natively bilingual: English and Mandarin Chinese.

---

## Experience

### Dalamula Technology — Co-Founder & CEO
**Toronto, ON | Mar 2023 – Mar 2026**

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
*Stack: Claude Code, JavaScript, Markdown | github.com/gpgaoplane/super-claude-framework-all-in-one*

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
