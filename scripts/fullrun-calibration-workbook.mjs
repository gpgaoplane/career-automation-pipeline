#!/usr/bin/env node
// scripts/fullrun-calibration-workbook.mjs
// Offline diagnostic workbook for the 2026-05-01 full-scale scan.
// No network, no production filter/scoring changes, no baseline workbook mutation.

import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
const careerOpsRequire = createRequire(resolve(CAREER_OPS, "package.json"));

let ExcelJS;
try {
  ExcelJS = careerOpsRequire("exceljs");
} catch {
  throw new Error("Missing exceljs. Run `npm install` inside career-ops/ before generating the calibration workbook.");
}

const DEFAULT_RUN_DATE = "2026-05-01";
const DEFAULT_OUTPUT_XLSX = resolve(CAREER_OPS, "output", `fullrun-calibration-${DEFAULT_RUN_DATE}.xlsx`);
const DEFAULT_SUMMARY_JSON = resolve(REPO_ROOT, "docs", "audits", "2026-05-03-fullrun-calibration-summary.json");
const BASELINE_XLSX = resolve(CAREER_OPS, "output", "jobs-2026-05-01.xlsx");

const EXPECTED = {
  scanHistoryRows: 1671,
  pipelineRows: 956,
  excelRows: 613,
  uniqueExcelUrls: 586,
  pipelineToExcelDrops: 343,
};

const ARTIFACTS = [
  { key: "scan_history", path: resolve(CAREER_OPS, "data", "scan-history.tsv"), expected: EXPECTED.scanHistoryRows },
  { key: "pipeline", path: resolve(CAREER_OPS, "data", "pipeline.md"), expected: EXPECTED.pipelineRows },
  { key: "jd_cache", path: resolve(CAREER_OPS, "data", "job-descriptions-cache.json"), expected: null },
  { key: "baseline_excel", path: BASELINE_XLSX, expected: EXPECTED.excelRows },
  { key: "baseline_excel_unique_urls", path: BASELINE_XLSX, expected: EXPECTED.uniqueExcelUrls },
  { key: "fullrun_metrics", path: resolve(REPO_ROOT, "docs", "audits", "2026-05-01-fullrun-metrics.json"), expected: null },
  { key: "fullrun_classification", path: resolve(REPO_ROOT, "docs", "audits", "2026-05-01-fullrun-classification.md"), expected: null },
  { key: "discovery_cache", path: resolve(CAREER_OPS, "data", "ats-discovery-cache.json"), expected: null },
  { key: "fallback_queue", path: resolve(CAREER_OPS, "data", "firecrawl-fallback-queue.tsv"), expected: null },
  { key: "firecrawl_cost", path: resolve(CAREER_OPS, "data", "firecrawl-cost.tsv"), expected: null },
];

const SEED_JOBS = [
  {
    company: "Scale AI-adjacent: Surge AI",
    display_company: "Surge AI",
    title: "Technical Program Manager",
    url: "https://surgehq.ai/careers/technical-program-manager",
    fit_advice: "Strong AI data/program-ops fit; current positive taxonomy misses Technical Program Manager.",
  },
  {
    company: "Scale AI-adjacent: Surge AI",
    display_company: "Surge AI",
    title: "Program Manager",
    url: "https://surgehq.ai/careers/program-manager",
    fit_advice: "Relevant if AI/product-ops context is present; broad Program Manager needs guardrails.",
  },
  {
    company: "Scale AI-adjacent: Surge AI",
    display_company: "Surge AI",
    title: "Generative AI Generalist",
    url: "https://surgehq.ai/careers/generative-al---generalist",
    fit_advice: "Strong generative/AI-generalist fit; title should pass via Generative AI.",
  },
  {
    company: "Scale AI-adjacent: Surge AI",
    display_company: "Surge AI",
    title: "AI Programs Analyst",
    url: "https://surgehq.ai/careers/al-programs-analyst",
    fit_advice: "Potential AI-programs/ops fit; needs AI-PROGRAM-OPS family and seniority review.",
  },
  {
    company: "Scale AI-adjacent: Surge AI",
    display_company: "Surge AI",
    title: "Product Operations Manager",
    url: "https://surgehq.ai/careers/product-operations-manager",
    fit_advice: "Strong PM-adjacent/product-ops fit for AI-native companies.",
  },
  {
    company: "ElevenLabs",
    title: "AI Automations Engineer",
    url: "https://jobs.ashbyhq.com/elevenlabs/a3097257-a07a-4a7e-b9fe-b8555c1a0fa7?locationId=42639f3c-c983-400d-8673-1e32388b5e99",
    fit_advice: "Strong AI automation/internal-tools fit; current taxonomy misses AI Automations.",
  },
  {
    company: "ElevenLabs",
    title: "Full-Stack Engineer",
    url: "https://jobs.ashbyhq.com/elevenlabs/6a530871-b6c6-4783-ac6b-69cc3b084192?locationId=42639f3c-c983-400d-8673-1e32388b5e99",
    fit_advice: "Possible AI product-engineering fit, but generic title should require content/company guard.",
  },
  {
    company: "ElevenLabs",
    title: "Deployment Strategist - North America",
    url: "https://jobs.ashbyhq.com/elevenlabs/8c068ebf-c79f-4f12-97ef-b4c9a4f7ae5f?locationId=42639f3c-c983-400d-8673-1e32388b5e99",
    fit_advice: "Very strong SA/FDE/customer deployment fit; should map to deployment strategy.",
  },
  {
    company: "ElevenLabs",
    title: "AI Creative Producer - Ads",
    url: "https://jobs.ashbyhq.com/elevenlabs/2451b957-0ece-4e73-88e4-4196aac0ba86?locationId=42639f3c-c983-400d-8673-1e32388b5e99",
    fit_advice: "Strong creative AI/generative media fit; should map to CREATIVE-AI with guardrails.",
  },
  {
    company: "xAI",
    title: "Image Tutor",
    url: "https://job-boards.greenhouse.io/xai/jobs/5047544007",
    fit_advice: "Strong AI evaluation/training and creative-image fit; should map to AI-EVAL.",
  },
  {
    company: "xAI",
    title: "Video Tutor",
    url: "https://job-boards.greenhouse.io/xai/jobs/5047564007",
    fit_advice: "Strong AI evaluation/training and creative-video fit; should map to AI-EVAL / CREATIVE-AI.",
  },
  {
    company: "xAI",
    title: "AI Tutor - Chinese",
    url: "https://job-boards.greenhouse.io/xai/jobs/5090180007",
    fit_advice: "Strong multilingual AI-training fit; should map to AI-EVAL.",
  },
  {
    company: "xAI",
    title: "AI Tutor - Crypto",
    url: "https://job-boards.greenhouse.io/xai/jobs/5040344007",
    fit_advice: "AI-training fit with more borderline domain fit; still useful in AI-EVAL review queue.",
  },
  {
    company: "Atlassian",
    title: "Solutions Architect | DX",
    url: "https://www.atlassian.com/company/careers/details/24843",
    fit_advice: "Strong SA/DX advisory fit; title should pass, so absence points to source extraction/current-board delta.",
  },
];

const SHEET_NAMES = [
  "Run Manifest",
  "Stage Reconciliation",
  "Seed Traces",
  "Output Drops Review",
  "Low Ranked High Intent",
  "Potential False Positives",
  "Role Taxonomy Candidates",
  "Company Coverage",
  "Rule Simulation",
  "Reviewer Calibration",
  "Current Board Non-Baseline",
  "Visible Location Risk",
  "Dealbreaker Calibration",
  "Missing Job Root Cause",
  "Filter Robustness Metrics",
];

// ── CLI ─────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const flags = {
    runDate: DEFAULT_RUN_DATE,
    outputXlsx: DEFAULT_OUTPUT_XLSX,
    summaryJson: DEFAULT_SUMMARY_JSON,
    strict: false,
    allowOverwrite: false,
    seedFile: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--run-date") flags.runDate = argv[++i];
    else if (a === "--output-xlsx") flags.outputXlsx = resolve(REPO_ROOT, argv[++i]);
    else if (a === "--summary-json") flags.summaryJson = resolve(REPO_ROOT, argv[++i]);
    else if (a === "--strict") flags.strict = true;
    else if (a === "--allow-overwrite") flags.allowOverwrite = true;
    else if (a === "--seed-file") flags.seedFile = resolve(REPO_ROOT, argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/fullrun-calibration-workbook.mjs --run-date 2026-05-01 --output-xlsx <path> --summary-json <path> [--strict] [--allow-overwrite] [--seed-file <path>]");
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${a}`);
    }
  }
  return flags;
}

// ── Generic helpers ─────────────────────────────────────────────────

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function safeJson(filePath, warnings, key) {
  try {
    return JSON.parse(readText(filePath));
  } catch (e) {
    warnings.push({ type: "parse_error", artifact: key, message: e.message });
    return {};
  }
}

export function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function shortHash(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex").slice(0, 10);
}

function normalizeUrl(url) {
  return String(url || "").trim().replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
}

function uniqueNormalizedUrlCount(rows) {
  return new Set(rows.map((row) => normalizeUrl(row.url || row.URL || ""))).size;
}

function normalizeTitle(title) {
  return String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function relativePath(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function boolText(value) {
  return value ? "yes" : "no";
}

function listText(value) {
  return Array.isArray(value) ? value.join("; ") : (value ?? "");
}

function cacheText(entry) {
  return String(entry?.content_text || entry?.description || entry?.markdown || entry?.text || entry?.content || "");
}

function nearToronto(text, matchIndex) {
  const start = Math.max(0, matchIndex - 200);
  const end = Math.min(text.length, matchIndex + 200);
  return /\b(toronto|gta|greater toronto area)\b/i.test(text.slice(start, end));
}

function textHasToronto(text) {
  return /\b(toronto|gta|greater toronto area)\b/i.test(text);
}

function textHasFullyRemoteUs(text) {
  return /\b(100%\s*remote|fully remote|remote-first|work remotely|remote within|remote from|remote,?\s*(?:us|u\.s\.|united states|north america))\b/i.test(text)
    && /\b(us|u\.s\.|united states|usa|north america)\b/i.test(text);
}

function findWorkModeSignal(text) {
  const hybrid = /\bhybrid\b(?!\s+(?:cloud|mesh|fabric))/i.exec(text);
  if (hybrid) return { mode: "hybrid", index: hybrid.index, text: hybrid[0] };
  const onsite = /\b(on[-\s]?site|onsite|in[-\s]?office|office[-\s]?based|office required|work from (?:our|the) office)\b/i.exec(text);
  if (onsite) return { mode: "onsite", index: onsite.index, text: onsite[0] };
  return null;
}

function detectLocationTerms(text) {
  const usTerms = [];
  const canadaTerms = [];
  const usPatterns = [
    /\bunited states\b/i, /\bu\.s\.\b/i, /\busa\b/i, /\bus-based\b/i,
    /\bsan francisco\b/i, /\bnew york\b/i, /\bnyc\b/i, /\bseattle\b/i,
    /\baustin\b/i, /\bboston\b/i, /\bmountain view\b/i, /\bpalo alto\b/i,
    /\blos angeles\b/i, /\bcalifornia\b/i, /\bwashington\b/i, /\bchicago\b/i,
    /\bcolorado\b/i, /\bboulder\b/i,
  ];
  const canadaPatterns = [
    /\bvancouver\b/i, /\bmontreal\b/i, /\bmontr[eé]al\b/i, /\bottawa\b/i,
    /\bcalgary\b/i, /\bquebec\b/i, /\bbritish columbia\b/i, /\balberta\b/i,
  ];
  for (const pattern of usPatterns) {
    const match = pattern.exec(text);
    if (match) usTerms.push(match[0]);
  }
  for (const pattern of canadaPatterns) {
    const match = pattern.exec(text);
    if (match) canadaTerms.push(match[0]);
  }
  return { usTerms: [...new Set(usTerms)], canadaTerms: [...new Set(canadaTerms)] };
}

// ── Canonicalization ────────────────────────────────────────────────

export function canonicalizeJobUrl(url, fallback = {}) {
  const originalUrl = String(url || "").trim();
  const normalized = normalizeUrl(originalUrl);

  let m = normalized.match(/ashbyhq\.com\/([^/]+)\/([0-9a-f-]{36})/i);
  if (m) return { canonical_job_id: `ashby:${m[1]}:${m[2]}`, canonical_source: "ashby", normalized_url: normalized };

  m = normalized.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i);
  if (m) return { canonical_job_id: `greenhouse:${m[1]}:${m[2]}`, canonical_source: "greenhouse", normalized_url: normalized };

  m = normalized.match(/lever\.co\/[^/]+\/([0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12})/i);
  if (m) return { canonical_job_id: `lever:${m[1]}`, canonical_source: "lever", normalized_url: normalized };

  m = normalized.match(/(?:^|[_/-])((?:jr|r)\d{4,}|jr-\d{4,})\b/i);
  if (/workdayjobs\.com|myworkdayjobs\.com|workday/i.test(normalized) && m) {
    return { canonical_job_id: `workday:${m[1].toUpperCase()}`, canonical_source: "workday", normalized_url: normalized };
  }

  m = normalized.match(/atlassian\.com\/company\/careers\/details\/(\d+)/i);
  if (m) return { canonical_job_id: `atlassian:${m[1]}`, canonical_source: "atlassian", normalized_url: normalized };

  m = normalized.match(/surgehq\.ai\/careers\/([^/?#]+)/i);
  if (m) return { canonical_job_id: `surge:${m[1]}`, canonical_source: "surge", normalized_url: normalized };

  if (fallback.company && fallback.title) {
    const sourceHash = shortHash(normalized || fallback.source_url || "");
    return {
      canonical_job_id: `fallback:${normalizeTitle(fallback.company)}:${normalizeTitle(fallback.title)}:${sourceHash}`,
      canonical_source: "fallback",
      normalized_url: normalized,
    };
  }

  return { canonical_job_id: normalized, canonical_source: "url", normalized_url: normalized };
}

export function safeTitleMatches(title, keyword) {
  const t = String(title || "");
  const k = String(keyword || "");
  if (k.toLowerCase() === "rag") return /\bRAG\b/i.test(t);
  if (k.toLowerCase() === "technical account") return /\btechnical account\b(?!ing\b)/i.test(t);
  return t.toLowerCase().includes(k.toLowerCase());
}

// ── Parsers ─────────────────────────────────────────────────────────

export function parseTsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    return Object.fromEntries(headers.map((header, i) => [header, cols[i] ?? ""]));
  });
}

export function parsePipelineMd(text) {
  const rows = [];
  let inPending = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s+Pendientes\s*$/.test(line)) {
      inPending = true;
      continue;
    }
    if (inPending && /^##\s+/.test(line)) break;
    if (!inPending || !line.startsWith("- [ ] ")) continue;
    const content = line.slice("- [ ] ".length);
    const first = content.indexOf(" | ");
    const second = content.indexOf(" | ", first + 3);
    if (first === -1 || second === -1) continue;
    rows.push({
      url: content.slice(0, first).trim(),
      company: content.slice(first + 3, second).trim(),
      title: content.slice(second + 3).trim(),
    });
  }
  return rows;
}

export async function parseExcelPendingJobs(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet("Pending Jobs");
  if (!sheet) throw new Error("Baseline workbook is missing `Pending Jobs` sheet");
  const headers = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[String(cell.value || "").trim()] = colNumber;
  });
  const required = ["Company", "Title", "URL", "Match Track", "Title Score", "Desc Score", "Pre-Score", "Band", "Score Notes"];
  for (const header of required) {
    if (!headers[header]) throw new Error(`Pending Jobs sheet missing required header: ${header}`);
  }
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const url = String(row.getCell(headers.URL).value || "").trim();
    if (!url) return;
    rows.push({
      company: String(row.getCell(headers.Company).value || "").trim(),
      title: String(row.getCell(headers.Title).value || "").trim(),
      url,
      match_track: String(row.getCell(headers["Match Track"]).value || "").trim(),
      title_score: Number(row.getCell(headers["Title Score"]).value || 0),
      desc_score: Number(row.getCell(headers["Desc Score"]).value || 0),
      pre_score: Number(row.getCell(headers["Pre-Score"]).value || 0),
      band: String(row.getCell(headers.Band).value || "").trim(),
      score_notes: String(row.getCell(headers["Score Notes"]).value || "").trim(),
    });
  });
  return rows;
}

function parseTrackMappingFromYaml(yamlPath) {
  const groupToTrack = {
    "AI / ML Engineering": "AI-ENG",
    "Solutions / Technical Advisory": "SA",
    "Sales / Business Development": "AE",
    "Product Management": "PM",
    "Consulting / Advisory": "CONSULT",
    "Generative AI Engineering": "GEN-AI",
    "Creative": "CREATIVE",
    "Broad AI roles": "AI-ENG",
  };
  const text = readText(yamlPath);
  const map = new Map();
  let inPositive = false;
  let currentTrack = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*positive:\s*$/.test(line)) { inPositive = true; continue; }
    if (/^\s*negative:\s*$/.test(line)) { inPositive = false; continue; }
    if (!inPositive) continue;
    const group = line.match(/^\s*#\s*──\s*(.+?)\s*──/);
    if (group) {
      currentTrack = groupToTrack[group[1].trim()] || null;
      continue;
    }
    const item = line.match(/^\s*-\s*"([^"]+)"\s*$/);
    if (item && currentTrack) map.set(item[1].toLowerCase(), currentTrack);
  }
  return map;
}

function loadPortals() {
  return yaml.load(readText(resolve(CAREER_OPS, "portals.yml")));
}

function titleFilterDecision(title, titleFilter) {
  const lower = String(title || "").toLowerCase();
  const positives = (titleFilter.positive || []).filter((keyword) => lower.includes(String(keyword).toLowerCase()));
  const negatives = (titleFilter.negative || []).filter((keyword) => lower.includes(String(keyword).toLowerCase()));
  return {
    passes: ((titleFilter.positive || []).length === 0 || positives.length > 0) && negatives.length === 0,
    positive_matches: positives,
    negative_matches: negatives,
  };
}

// ── Detection rules ─────────────────────────────────────────────────

export function detectFalsePositive(row) {
  const flags = [];
  if (/storage/i.test(row.title || "") && /AI-ENG/.test(row.match_track || "")) {
    flags.push({ detector: "RAG_STORAGE", keyword: "RAG", reason: "`RAG` substring can match `Storage`" });
  }
  if (/technical accounting/i.test(row.title || "") && /SA/.test(row.match_track || "")) {
    flags.push({ detector: "TECHNICAL_ACCOUNTING", keyword: "Technical Account", reason: "`Technical Account` can match `Technical Accounting`" });
  }
  return flags;
}

export function detectRoleFamilies(row) {
  const title = String(row.title || "");
  const context = `${title} ${row.company || ""} ${row.category || ""} ${row.score_notes || ""}`.toLowerCase();
  const families = [];

  const aiEvalTitle = /\b(ai tutor|image tutor|video tutor|ai evaluator|model evaluation|rlhf|human feedback|ai trainer|annotation|data quality)\b/i.test(title);
  const genericDataAnalyst = /\bdata analyst\b/i.test(title) && !/\b(ai|model|rlhf|annotation|quality|evaluation)\b/i.test(title);
  if (aiEvalTitle && !genericDataAnalyst) {
    families.push({ family: "AI-EVAL", guard_passed: true, reason: "AI evaluation/training title" });
  }

  const creativeTitle = /\b(ai creative producer|creative ai|generative media|ai video|ai image|image generation|video generation|ai producer)\b/i.test(title);
  const broadProducerOnly = /\bproducer\b/i.test(title) && !/\b(ai|creative|generative|image|video|media)\b/i.test(title);
  if (creativeTitle && !broadProducerOnly) {
    families.push({ family: "CREATIVE-AI", guard_passed: true, reason: "AI/generative creative title" });
  }

  const programTitle = /\b(technical program manager|ai programs?|ai program manager|product operations manager|program manager)\b/i.test(title);
  const aiNativeContext = /\b(ai|artificial intelligence|model|agent|generative|rlhf|data labeling|frontier|synthetic media)\b/i.test(context);
  if (programTitle) {
    families.push({ family: "AI-PROGRAM-OPS", guard_passed: aiNativeContext, reason: aiNativeContext ? "program/ops with AI-native context" : "program/ops needs AI-native guard" });
  }

  const strategyTitle = /\b(deployment strategist|forward deployed strategist|solutions strategist|ai strategist)\b/i.test(title);
  const deploymentContext = /\b(customer|deployment|implementation|technical|advisory|product|ai|solution)\b/i.test(context);
  if (strategyTitle) {
    families.push({ family: "DEPLOYMENT-STRATEGY", guard_passed: deploymentContext, reason: deploymentContext ? "strategy title with deployment/technical context" : "strategy title needs deployment/technical guard" });
  }

  return families;
}

export function simulateDealbreaker(text, signals = {}) {
  const fullText = String(text || "");
  const signalText = [
    ...(signals.location_raw || []),
    ...(signals.location_match || []),
    signals.deal_breaker_signal || "",
  ].join(" ");
  const combined = `${fullText}\n${signalText}`;
  const workMode = findWorkModeSignal(combined);
  const { usTerms, canadaTerms } = detectLocationTerms(combined);
  const hasToronto = textHasToronto(combined);
  const fullyRemoteUs = textHasFullyRemoteUs(combined);

  if (!fullText.trim() && !signalText.trim()) {
    return {
      decision: "insufficient_evidence",
      simulated_signal: "",
      confidence: "low",
      reason: "missing JD text and extracted location signals",
    };
  }

  if (workMode && nearToronto(combined, workMode.index)) {
    return {
      decision: "allow",
      simulated_signal: "",
      confidence: "high",
      reason: `${workMode.mode} signal is near Toronto`,
    };
  }

  if (workMode && (usTerms.length || canadaTerms.length)) {
    return {
      decision: "hard_drop",
      simulated_signal: workMode.mode === "hybrid" ? "hybrid_non_toronto" : "onsite_non_toronto",
      confidence: "high",
      reason: `${workMode.mode} work-mode without nearby Toronto${usTerms.length ? `; US terms: ${usTerms.join(", ")}` : ""}${canadaTerms.length ? `; non-Toronto Canada terms: ${canadaTerms.join(", ")}` : ""}`,
    };
  }

  if (workMode && !hasToronto) {
    return {
      decision: "review",
      simulated_signal: `${workMode.mode}_location_ambiguous`,
      confidence: "medium",
      reason: `${workMode.mode} work-mode without nearby Toronto and without explicit US/non-Toronto Canada location`,
    };
  }

  if (usTerms.length && !fullyRemoteUs && !hasToronto) {
    return {
      decision: "review",
      simulated_signal: "us_location_not_fully_remote",
      confidence: "medium",
      reason: `US location terms without fully-remote US signal: ${usTerms.join(", ")}`,
    };
  }

  if (fullyRemoteUs) {
    return {
      decision: "allow",
      simulated_signal: "",
      confidence: "high",
      reason: "fully remote US/North America signal",
    };
  }

  return {
    decision: "allow",
    simulated_signal: "",
    confidence: "medium",
    reason: "no non-Toronto hybrid/on-site detector hit",
  };
}

export function classifyVisibleLocationRisk(row, cacheEntry) {
  const signals = cacheEntry?.entry?.extracted_signals || {};
  const text = [
    row.title,
    row.url,
    listText(signals.location_raw || []),
    listText(signals.location_match || []),
    cacheText(cacheEntry?.entry),
  ].join("\n");
  const simulation = simulateDealbreaker(text, signals);
  const hasDescription = Boolean(cacheText(cacheEntry?.entry).trim());
  const hasLocationSignals = Boolean((signals.location_raw || []).length || (signals.location_match || []).length);

  let classification = "acceptable_or_no_risk";
  if (!hasDescription && !hasLocationSignals) classification = "no_description_or_no_location_signal";
  else if (signals.deal_breaker_signal || simulation.decision === "hard_drop") classification = "visible_but_should_drop";
  else if (simulation.decision === "review") classification = "visible_but_needs_review";

  const highRisk = ["visible_but_should_drop", "visible_but_needs_review", "no_description_or_no_location_signal"].includes(classification);
  return {
    classification,
    highRisk,
    simulation,
    hasDescription,
    hasLocationSignals,
    signals,
  };
}

function isHighIntent(row) {
  return /\b(ai|ml|rag|agent|product|solutions?|forward deployed|generative|creative|program|tutor|evaluator|deployment strategist)\b/i.test(row.title || "");
}

function candidateDefectClass({ seed, scanMatch, pipelineMatch, excelMatch, titleFilter }) {
  if (excelMatch) return Number(excelMatch.pre_score || 0) < 8 ? "SCORING_UNDERRANK" : "VISIBLE";
  if (pipelineMatch) return "EXPORT_DROP_RISK";
  if (scanMatch) return "PIPELINE_DELTA";
  if (!titleFilter.passes) return "TITLE_TAXONOMY_GAP";
  return "SOURCE_INCOMPLETE";
}

// ── Core build ──────────────────────────────────────────────────────

function addCanonical(row, source) {
  const canonical = canonicalizeJobUrl(row.url, row);
  return { ...row, ...canonical, artifact_source: source };
}

function indexRows(rows) {
  const byCanonical = new Map();
  const byFallback = new Map();
  for (const row of rows) {
    if (!byCanonical.has(row.canonical_job_id)) byCanonical.set(row.canonical_job_id, []);
    byCanonical.get(row.canonical_job_id).push(row);
    const fallbackKey = `${normalizeTitle(row.company)}|${normalizeTitle(row.title)}`;
    if (!byFallback.has(fallbackKey)) byFallback.set(fallbackKey, []);
    byFallback.get(fallbackKey).push(row);
  }
  return { byCanonical, byFallback };
}

function lookupSeed(seed, indexes) {
  const canonical = canonicalizeJobUrl(seed.url, seed);
  const fallbackKey = `${normalizeTitle(seed.company)}|${normalizeTitle(seed.title)}`;
  const scanRows = indexes.scan.byCanonical.get(canonical.canonical_job_id) || indexes.scan.byFallback.get(fallbackKey) || [];
  const pipelineRows = indexes.pipeline.byCanonical.get(canonical.canonical_job_id) || indexes.pipeline.byFallback.get(fallbackKey) || [];
  const excelRows = indexes.excel.byCanonical.get(canonical.canonical_job_id) || indexes.excel.byFallback.get(fallbackKey) || [];
  return { canonical, scanRows, pipelineRows, excelRows };
}

function buildManifest({ runDate, warnings, parsedCounts }) {
  const manifest = [];
  for (const artifact of ARTIFACTS) {
    const exists = fs.existsSync(artifact.path);
    const stat = exists ? fs.statSync(artifact.path) : null;
    let observed = null;
    if (artifact.key === "scan_history") observed = parsedCounts.scanHistoryRows;
    else if (artifact.key === "pipeline") observed = parsedCounts.pipelineRows;
    else if (artifact.key === "baseline_excel") observed = parsedCounts.excelRows;
    else if (artifact.key === "baseline_excel_unique_urls") observed = parsedCounts.uniqueExcelUrls;
    else if (artifact.key === "jd_cache") observed = parsedCounts.jdCacheEntries;
    else if (artifact.key === "fullrun_classification") observed = parsedCounts.classificationRows;
    else if (artifact.key === "fallback_queue") observed = parsedCounts.fallbackRows;
    else if (artifact.key === "firecrawl_cost") observed = parsedCounts.firecrawlCostRows;
    else if (artifact.key === "discovery_cache") observed = parsedCounts.discoveryEntries;
    const expected = artifact.expected;
    let status = exists ? "ok" : "missing";
    if (exists && expected !== null && observed !== expected) status = "warning";
    if (!exists) warnings.push({ type: "missing_artifact", artifact: artifact.key, path: artifact.path });
    if (status === "warning") warnings.push({ type: "count_mismatch", artifact: artifact.key, observed, expected });
    manifest.push({
      Artifact: artifact.key,
      Path: relativePath(artifact.path),
      Exists: exists,
      "Modified At": stat ? stat.mtime.toISOString() : "",
      "Size Bytes": stat ? stat.size : "",
      SHA256: exists ? sha256(artifact.path) : "",
      "Observed Count": observed ?? "",
      "Expected Count": expected ?? "",
      Status: status,
      Warnings: status === "warning" ? `Expected ${expected}, observed ${observed}` : "",
    });
  }
  return manifest;
}

function parseClassificationBuckets(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("| ")) continue;
    if (line.includes("| Company |") || line.includes("|---")) continue;
    const cols = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cols.length < 7) continue;
    const company = cols[0];
    const miss = cols[6].replace(/`/g, "");
    if (company && miss) map.set(company, miss);
  }
  return map;
}

function rowsByCompany(rows) {
  const map = new Map();
  for (const row of rows) map.set(row.company, (map.get(row.company) || 0) + 1);
  return map;
}

function makeCollisionRows(allRows) {
  const byId = new Map();
  for (const row of allRows) {
    if (!byId.has(row.canonical_job_id)) byId.set(row.canonical_job_id, []);
    byId.get(row.canonical_job_id).push(row);
  }
  const collisions = new Map();
  for (const [id, rows] of byId) {
    const variants = new Set(rows.map((r) => `${r.company}|${r.title}|${r.normalized_url}`));
    if (variants.size > 1) collisions.set(id, `collision:${shortHash(id)}`);
  }
  const fallbackByCompanyTitle = new Map();
  for (const row of allRows) {
    if (row.canonical_source !== "fallback") continue;
    const key = `${normalizeTitle(row.company)}|${normalizeTitle(row.title)}`;
    if (!fallbackByCompanyTitle.has(key)) fallbackByCompanyTitle.set(key, []);
    fallbackByCompanyTitle.get(key).push(row);
  }
  for (const [key, rows] of fallbackByCompanyTitle) {
    const uniqueIds = new Set(rows.map((row) => row.canonical_job_id));
    if (uniqueIds.size < 2) continue;
    const groupId = `collision:fallback:${shortHash(key)}`;
    for (const id of uniqueIds) collisions.set(id, groupId);
  }
  return collisions;
}

function makeEvidence({ scanRows, pipelineRows, excelRows, jdCache }) {
  const scan = scanRows.map((r) => addCanonical({ url: r.url, company: r.company, title: r.title, portal: r.portal, status: r.status }, "scan_history"));
  const pipeline = pipelineRows.map((r) => addCanonical(r, "pipeline"));
  const excel = excelRows.map((r) => addCanonical(r, "excel"));
  const allArtifactRows = [...scan, ...pipeline, ...excel];
  const collisions = makeCollisionRows(allArtifactRows);
  for (const row of allArtifactRows) row.collision_group_id = collisions.get(row.canonical_job_id) || "";

  const scanIds = new Set(scan.map((r) => r.canonical_job_id));
  const pipelineIds = new Set(pipeline.map((r) => r.canonical_job_id));
  const excelIds = new Set(excel.map((r) => r.canonical_job_id));
  const fullRunIds = new Set([...scanIds, ...pipelineIds, ...excelIds]);
  const artifactRowsByNormalizedUrl = new Map();
  for (const row of allArtifactRows) {
    if (!row.normalized_url) continue;
    if (!artifactRowsByNormalizedUrl.has(row.normalized_url)) artifactRowsByNormalizedUrl.set(row.normalized_url, []);
    artifactRowsByNormalizedUrl.get(row.normalized_url).push(row);
  }

  const jdByCanonical = new Map();
  let cacheOnlyExclusions = 0;
  for (const [url, entry] of Object.entries(jdCache || {})) {
    const canonical = canonicalizeJobUrl(url);
    if (fullRunIds.has(canonical.canonical_job_id)) {
      jdByCanonical.set(canonical.canonical_job_id, { url, entry });
      continue;
    }
    const aliasRows = artifactRowsByNormalizedUrl.get(canonical.normalized_url) || [];
    if (aliasRows.length) {
      for (const row of aliasRows) jdByCanonical.set(row.canonical_job_id, { url, entry });
      continue;
    }
    {
      cacheOnlyExclusions++;
      continue;
    }
  }

  return {
    scan,
    pipeline,
    excel,
    indexes: { scan: indexRows(scan), pipeline: indexRows(pipeline), excel: indexRows(excel) },
    idSets: { scanIds, pipelineIds, excelIds, fullRunIds },
    jdByCanonical,
    cacheOnlyExclusions,
    collisions,
  };
}

function makeSeedTraces(seeds, evidence, titleFilter) {
  return seeds.map((seed) => {
    const { canonical, scanRows, pipelineRows, excelRows } = lookupSeed(seed, evidence.indexes);
    const filter = titleFilterDecision(seed.title, titleFilter);
    const scanMatch = scanRows[0] || null;
    const pipelineMatch = pipelineRows[0] || null;
    const excelMatch = excelRows[0] || null;
    const defect = candidateDefectClass({ seed, scanMatch, pipelineMatch, excelMatch, titleFilter: filter });
    const collision = evidence.collisions.get(canonical.canonical_job_id) || "";
    return {
      Company: seed.display_company || seed.company,
      "Seed Title": seed.title,
      "Seed URL": seed.url,
      "Canonical Job ID": canonical.canonical_job_id,
      "Collision Group ID": collision,
      "Full Run Status": excelMatch ? "excel_visible" : pipelineMatch ? "pipeline_current" : scanMatch ? "full_run_retained" : "seed_current_board_non_baseline",
      "Current Title Filter Result": filter.passes ? "pass" : "fail",
      "Positive Matches": listText(filter.positive_matches),
      "Negative Matches": listText(filter.negative_matches),
      "Found In Scan History": boolText(scanRows.length),
      "Found In Pipeline": boolText(pipelineRows.length),
      "Found In Excel": boolText(excelRows.length),
      "Likely Defect Class": defect,
      "Fit Advice": seed.fit_advice,
      "Recommended Action": defect === "TITLE_TAXONOMY_GAP" ? "review taxonomy family" : defect === "SOURCE_INCOMPLETE" ? "queue for V1.1 source/current-board comparison" : defect === "EXPORT_DROP_RISK" ? "review output drop" : "review score/visibility",
    };
  });
}

function makeOutputDrops(evidence) {
  const rows = [];
  for (const p of evidence.pipeline) {
    if (evidence.idSets.excelIds.has(p.canonical_job_id)) continue;
    const cache = evidence.jdByCanonical.get(p.canonical_job_id)?.entry || {};
    const signals = cache.extracted_signals || {};
    rows.push({
      Company: p.company,
      Title: p.title,
      URL: p.url,
      "Canonical Job ID": p.canonical_job_id,
      "Collision Group ID": p.collision_group_id || "",
      "Dealbreaker Signal": signals.deal_breaker_signal || "",
      "Location Raw": listText(signals.location_raw || []),
      "Location Match": listText(signals.location_match || []),
      Comp: signals.comp_low_thousands ? `${signals.comp_low_thousands}-${signals.comp_high_thousands || signals.comp_low_thousands} ${signals.comp_currency || ""}` : "",
      "Detector Flags": signals.deal_breaker_signal === "hybrid_non_toronto" ? "HYBRID_REVIEW_MODE" : "",
      "Suggested Decision": signals.deal_breaker_signal === "hybrid_non_toronto" ? "Review" : "Inspect",
      "Reviewer Decision": "",
      "Reason Code": "",
      "Will Notes": "",
    });
  }
  return rows;
}

function makeLowRankedHighIntent(excelRows) {
  return excelRows
    .filter((row) => isHighIntent(row) && (row.band === "B" || row.band === "C" || row.pre_score < 8 || row.desc_score === 0))
    .map((row) => ({
      Company: row.company,
      Title: row.title,
      URL: row.url,
      Band: row.band,
      "Pre-Score": row.pre_score,
      "Title Score": row.title_score,
      "Desc Score": row.desc_score,
      "Match Track": row.match_track,
      "Score Notes": row.score_notes,
      "Missing Signals": row.desc_score === 0 ? "desc_score=0" : "",
      "Detector Flags": detectRoleFamilies(row).map((f) => f.family).join("; "),
      "Suggested Decision": "Review",
      "Reviewer Decision": "",
      "Will Notes": "",
    }));
}

function makeFalsePositives(excelRows) {
  const rows = [];
  for (const row of excelRows) {
    for (const flag of detectFalsePositive(row)) {
      rows.push({
        Company: row.company,
        Title: row.title,
        URL: row.url,
        "Matched Keyword": flag.keyword,
        Detector: flag.detector,
        "Why Suspicious": flag.reason,
        "Current Track": row.match_track,
        "Pre-Score": row.pre_score,
        "Suggested Fix": "phrase-aware matching",
        "Reviewer Decision": "",
      });
    }
  }
  return rows;
}

function makeRoleCandidates(evidenceRows) {
  const rows = [];
  for (const row of evidenceRows) {
    for (const family of detectRoleFamilies(row)) {
      rows.push({
        "Candidate Family": family.family,
        "Candidate Keyword": family.reason,
        Company: row.company,
        Title: row.title,
        URL: row.url,
        "Canonical Job ID": row.canonical_job_id || canonicalizeJobUrl(row.url, row).canonical_job_id,
        "Guard Passed": boolText(family.guard_passed),
        "Evidence Label": row.artifact_source || "seed_current_board_non_baseline",
        "Recommended Track": family.family,
        "Reviewer Decision": "",
      });
    }
  }
  return rows;
}

function makeVisibleLocationRisk(evidence) {
  return evidence.excel.map((row) => {
    const cacheEntry = evidence.jdByCanonical.get(row.canonical_job_id);
    const risk = classifyVisibleLocationRisk(row, cacheEntry);
    return {
      Company: row.company,
      Title: row.title,
      URL: row.url,
      Band: row.band,
      "Pre-Score": row.pre_score,
      "Risk Classification": risk.classification,
      "High Risk": boolText(risk.highRisk),
      "Detector Decision": risk.simulation.decision,
      "Simulated Signal": risk.simulation.simulated_signal,
      Confidence: risk.simulation.confidence,
      Reason: risk.simulation.reason,
      "Current Dealbreaker Signal": risk.signals.deal_breaker_signal || "",
      "Location Raw": listText(risk.signals.location_raw || []),
      "Location Match": listText(risk.signals.location_match || []),
      "Has Description": boolText(risk.hasDescription),
      "Has Location Signals": boolText(risk.hasLocationSignals),
      "Suggested Decision": risk.classification === "visible_but_should_drop" ? "Hard drop after detector review" : risk.classification === "visible_but_needs_review" ? "Review manually" : risk.classification === "no_description_or_no_location_signal" ? "Refresh/re-extract JD" : "Keep",
      "Reviewer Decision": "",
      "Will Notes": "",
    };
  });
}

function makeDealbreakerCalibration(evidence) {
  const rows = [];
  const add = (row, stage, cacheEntry) => {
    const signals = cacheEntry?.entry?.extracted_signals || {};
    const text = [
      row.title,
      row.url,
      listText(signals.location_raw || []),
      listText(signals.location_match || []),
      cacheText(cacheEntry?.entry),
    ].join("\n");
    const simulation = simulateDealbreaker(text, signals);
    const currentSignal = signals.deal_breaker_signal || "";
    let calibration = "aligned_allow";
    if (stage === "excel_visible" && simulation.decision === "hard_drop") calibration = "false_negative_should_drop";
    else if (stage === "excel_visible" && simulation.decision === "review") calibration = "visible_needs_review";
    else if (stage === "excel_visible" && simulation.decision === "insufficient_evidence") calibration = "insufficient_evidence_visible";
    else if (stage === "output_dropped" && currentSignal && simulation.decision === "hard_drop") calibration = "correctly_dropped_before_excel";
    else if (stage === "output_dropped" && currentSignal && simulation.decision === "review") calibration = "dropped_but_needs_review";
    else if (stage === "output_dropped" && currentSignal && simulation.decision === "allow") calibration = "possible_false_positive_drop";
    else if (stage === "output_dropped" && !currentSignal) calibration = "drop_without_signal";

    rows.push({
      Stage: stage,
      Company: row.company,
      Title: row.title,
      URL: row.url,
      "Current Dealbreaker Signal": currentSignal,
      "Simulated Decision": simulation.decision,
      "Simulated Signal": simulation.simulated_signal,
      Confidence: simulation.confidence,
      "Calibration Result": calibration,
      Reason: simulation.reason,
      "Location Raw": listText(signals.location_raw || []),
      "Location Match": listText(signals.location_match || []),
      "Has Description": boolText(Boolean(cacheText(cacheEntry?.entry).trim())),
      "Suggested Decision": calibration === "false_negative_should_drop" ? "Fix detector and drop" : calibration.includes("review") ? "Review examples" : calibration === "possible_false_positive_drop" ? "Audit before restoring" : "No action",
      "Reviewer Decision": "",
      "Will Notes": "",
    });
  };

  for (const row of evidence.excel) add(row, "excel_visible", evidence.jdByCanonical.get(row.canonical_job_id));
  for (const row of evidence.pipeline) {
    if (evidence.idSets.excelIds.has(row.canonical_job_id)) continue;
    add(row, "output_dropped", evidence.jdByCanonical.get(row.canonical_job_id));
  }
  return rows;
}

function makeCompanyCoverage({ portals, scanRows, pipelineRows, excelRows, classificationBuckets, discoveryCache }) {
  const scanCounts = rowsByCompany(scanRows);
  const pipelineCounts = rowsByCompany(pipelineRows);
  const excelCounts = rowsByCompany(excelRows);
  return (portals.tracked_companies || [])
    .filter((c) => c.enabled !== false)
    .map((company) => {
      const discovery = discoveryCache[company.name] || {};
      const excelCount = excelCounts.get(company.name) || 0;
      const bucket = excelCount > 0 ? "EXCEL_VISIBLE" : (classificationBuckets.get(company.name) || "UNCLASSIFIED");
      return {
        Rank: company.rank ?? "",
        Company: company.name,
        Category: company.category || "",
        Enabled: "yes",
        "Scan History Rows": scanCounts.get(company.name) || 0,
        "Pipeline Rows": pipelineCounts.get(company.name) || 0,
        "Excel Rows": excelCount,
        "Fullrun Bucket": bucket,
        "Discovery Status": discovery.status || discovery.ats || "",
        "Recommended Follow-Up": bucket === "ROUTE_MISSING" ? "V1.1 source repair" : excelCount === 0 ? "review company bucket" : "",
      };
    });
}

function makeRuleSimulation({ outputDrops, falsePositives, roleCandidates, seedTraces }) {
  const simulationRows = [];
  const add = (row) => simulationRows.push(row);
  const seedRecovered = (family) => seedTraces.filter((r) => r["Likely Defect Class"] === "TITLE_TAXONOMY_GAP" && r["Recommended Action"].includes("taxonomy")).map((r) => r["Seed Title"]).filter((title) => detectRoleFamilies({ title, company: "" }).some((f) => f.family === family));

  add({
    "Rule ID": "MATCH_FALSE_POSITIVE_FIX",
    "Rule Type": "matching",
    Description: "Use phrase-aware matching for RAG and Technical Account",
    "Affected Count": falsePositives.length,
    "Recovered Count": 0,
    "Potential Noise Count": 0,
    "Seed URLs Recovered": "",
    "Examples": falsePositives.slice(0, 5).map((r) => `${r.Company}: ${r.Title}`).join("; "),
    "Guard Result": "deterministic",
    Recommendation: falsePositives.length ? "Implement before broadening positives" : "No observed rows",
  });

  const hybridRows = outputDrops.filter((r) => r["Dealbreaker Signal"] === "hybrid_non_toronto");
  add({
    "Rule ID": "HYBRID_REVIEW_MODE",
    "Rule Type": "export-drop",
    Description: "Move hybrid_non_toronto hard drops into review queue",
    "Affected Count": hybridRows.length,
    "Recovered Count": hybridRows.length,
    "Potential Noise Count": hybridRows.length,
    "Seed URLs Recovered": "",
    "Examples": hybridRows.slice(0, 5).map((r) => `${r.Company}: ${r.Title}`).join("; "),
    "Guard Result": "review-only",
    Recommendation: "Audit examples before restoring",
  });

  for (const family of ["AI-EVAL", "CREATIVE-AI", "AI-PROGRAM-OPS", "DEPLOYMENT-STRATEGY"]) {
    const rows = roleCandidates.filter((r) => r["Candidate Family"] === family);
    const guarded = rows.filter((r) => r["Guard Passed"] === "yes");
    add({
      "Rule ID": `${family}_FAMILY`,
      "Rule Type": "role-family",
      Description: `Detect ${family} candidates with guardrails`,
      "Affected Count": rows.length,
      "Recovered Count": guarded.length,
      "Potential Noise Count": rows.length - guarded.length,
      "Seed URLs Recovered": seedRecovered(family).join("; "),
      "Examples": guarded.slice(0, 5).map((r) => `${r.Company}: ${r.Title}`).join("; "),
      "Guard Result": `${guarded.length}/${rows.length} guard passed`,
      Recommendation: "Review candidate rows; no band recalculation in V1",
    });
  }

  return simulationRows;
}

function makeReviewerCalibration({ seedTraces, outputDrops, lowRanked, falsePositives, roleCandidates }) {
  const rows = [];
  for (const r of seedTraces) {
    rows.push({ "Item Type": "Seed Trace", Company: r.Company, Title: r["Seed Title"], URL: r["Seed URL"], Issue: r["Likely Defect Class"], "Suggested Decision": r["Recommended Action"], "Reviewer Decision": "", "Reason Code": "", "Will Notes": "" });
  }
  for (const r of outputDrops.slice(0, 100)) {
    rows.push({ "Item Type": "Output Drop", Company: r.Company, Title: r.Title, URL: r.URL, Issue: r["Dealbreaker Signal"], "Suggested Decision": r["Suggested Decision"], "Reviewer Decision": "", "Reason Code": "", "Will Notes": "" });
  }
  for (const r of lowRanked.slice(0, 100)) {
    rows.push({ "Item Type": "Low Ranked", Company: r.Company, Title: r.Title, URL: r.URL, Issue: `${r.Band}/${r["Pre-Score"]}`, "Suggested Decision": "Review", "Reviewer Decision": "", "Reason Code": "", "Will Notes": "" });
  }
  for (const r of falsePositives) {
    rows.push({ "Item Type": "False Positive", Company: r.Company, Title: r.Title, URL: r.URL, Issue: r.Detector, "Suggested Decision": "Remove/guard", "Reviewer Decision": "", "Reason Code": "", "Will Notes": "" });
  }
  for (const r of roleCandidates.slice(0, 100)) {
    rows.push({ "Item Type": "Role Candidate", Company: r.Company, Title: r.Title, URL: r.URL, Issue: r["Candidate Family"], "Suggested Decision": r["Guard Passed"] === "yes" ? "Consider include" : "Needs guard", "Reviewer Decision": "", "Reason Code": "", "Will Notes": "" });
  }
  return rows;
}

function makeCurrentBoardSheet(seeds) {
  return seeds.map((seed) => ({
    Company: seed.display_company || seed.company,
    "Current Title": seed.title,
    "Current URL": seed.url,
    "Canonical Job ID": canonicalizeJobUrl(seed.url, seed).canonical_job_id,
    "Evidence Label": "seed_current_board_non_baseline",
    "Reason Not Baseline": "User-supplied/current-board seed; no live fetch in V1",
    "Recommended Action": "Trace in Seed Traces and consider V1.1 source comparison",
  }));
}

function companyByName(portals) {
  const map = new Map();
  for (const company of portals.tracked_companies || []) map.set(String(company.name || "").toLowerCase(), company);
  return map;
}

function findCompany(portalsMap, seed) {
  const names = [seed.display_company, seed.company].filter(Boolean).map((name) => String(name).toLowerCase());
  for (const name of names) {
    if (portalsMap.has(name)) return portalsMap.get(name);
  }
  return null;
}

function makeMissingJobRootCause({ seeds, evidence, titleFilter, portals, discoveryCache, classificationBuckets }) {
  const portalsMap = companyByName(portals);
  return seeds.map((seed) => {
    const { canonical, scanRows, pipelineRows, excelRows } = lookupSeed(seed, evidence.indexes);
    const filter = titleFilterDecision(seed.title, titleFilter);
    const company = findCompany(portalsMap, seed);
    const discovery = discoveryCache[seed.display_company || seed.company] || discoveryCache[seed.company] || {};
    const bucket = classificationBuckets.get(seed.display_company || seed.company) || classificationBuckets.get(seed.company) || "";
    const collision = evidence.collisions.get(canonical.canonical_job_id) || "";
    let rootCause = "current-board delta after baseline date";
    let confidence = "medium";
    let explanation = "User-supplied current-board seed is absent from 2026-05-01 retained artifacts.";

    if (company?.enabled === false) {
      rootCause = "company disabled";
      confidence = "high";
      explanation = company.note || "Company disabled in portals.yml.";
    } else if (collision) {
      rootCause = "canonicalization/collision issue";
      confidence = "high";
      explanation = "Canonical ID collides with another artifact row.";
    } else if (excelRows.length) {
      rootCause = "already visible in Excel";
      confidence = "high";
      explanation = "Seed resolved to a visible baseline Excel row.";
    } else if (pipelineRows.length) {
      rootCause = "export-time dealbreaker dropped it";
      confidence = "high";
      explanation = "Seed is in pipeline but absent from visible Excel.";
    } else if (scanRows.length) {
      rootCause = "job not present in pipeline after scan-history";
      confidence = "medium";
      explanation = "Seed matched retained scan-history but not current pipeline.";
    } else if (!filter.passes) {
      rootCause = "scrape-time title filter rejected it";
      confidence = "medium";
      explanation = `Current seed title fails title filter. Positive matches: ${listText(filter.positive_matches)}; negative matches: ${listText(filter.negative_matches)}.`;
    } else if (bucket === "ROUTE_MISSING") {
      rootCause = "source discovery failed";
      confidence = "high";
      explanation = "Full-run company classification is ROUTE_MISSING.";
    } else if (discovery.status === "ambiguous" || discovery.status === "no-ats-found" || discovery.status === "error") {
      rootCause = "source discovery failed";
      confidence = "medium";
      explanation = `Discovery cache status is ${discovery.status}.`;
    } else if (discovery.ats && !scanRows.length) {
      rootCause = "ATS adapter/API retrieval failed";
      confidence = "medium";
      explanation = `Discovery cache has ATS ${discovery.ats}, but seed is absent from retained scan artifacts.`;
    } else if (filter.passes) {
      rootCause = "job not present on 2026-05-01 baseline artifacts";
      confidence = "medium";
      explanation = "Title would pass current filter, but no full-run artifact contains the seed.";
    }

    return {
      Company: seed.display_company || seed.company,
      Title: seed.title,
      URL: seed.url,
      "Canonical Job ID": canonical.canonical_job_id,
      "Root Cause Layer": rootCause,
      Confidence: confidence,
      Explanation: explanation,
      "Title Filter Result": filter.passes ? "pass" : "fail",
      "Positive Matches": listText(filter.positive_matches),
      "Negative Matches": listText(filter.negative_matches),
      "Found In Scan History": boolText(scanRows.length),
      "Found In Pipeline": boolText(pipelineRows.length),
      "Found In Excel": boolText(excelRows.length),
      "Company Bucket": bucket,
      "Discovery Status": discovery.status || discovery.ats || "",
      "Evidence Label": "seed_current_board_non_baseline",
      "Suggested Decision": rootCause === "scrape-time title filter rejected it" ? "Review title taxonomy" : rootCause.includes("source") || rootCause.includes("ATS") ? "Queue V1.1 source comparison" : "Review current-board timing",
      "Reviewer Decision": "",
      "Will Notes": "",
    };
  });
}

function makeFilterRobustnessMetrics({ metrics, evidence, visibleLocationRisk, dealbreakerCalibration, missingRootCause, falsePositives, roleCandidates, companyCoverage, outputDrops }) {
  const count = (rows, predicate) => rows.filter(predicate).length;
  const bySignal = countBy(outputDrops, "Dealbreaker Signal");
  return [
    { Metric: "source_reachability_rate", Value: metrics.source_resolution_rate ?? "", Numerator: metrics.source_resolved_companies ?? "", Denominator: metrics.sample_companies ?? "", Status: "observed", Notes: "From full-run metrics JSON" },
    { Metric: "source_health_rate", Value: metrics.source_health_rate ?? "", Numerator: metrics.healthy_sources ?? "", Denominator: metrics.resolved_sources ?? "", Status: "observed", Notes: "From full-run metrics JSON" },
    { Metric: "raw_job_inventory_sources", Value: metrics.raw_job_available_sources ?? "", Numerator: metrics.raw_job_available_sources ?? "", Denominator: metrics.healthy_sources ?? "", Status: "observed", Notes: "Company-level raw counts are not fully retained offline" },
    { Metric: "title_filter_retained_scan_rows", Value: evidence.scan.length, Numerator: evidence.scan.length, Denominator: "", Status: "observed", Notes: "scan-history is retained rows, not raw inventory" },
    { Metric: "description_fetch_coverage_visible", Value: count(visibleLocationRisk, (r) => r["Has Description"] === "yes") / Math.max(visibleLocationRisk.length, 1), Numerator: count(visibleLocationRisk, (r) => r["Has Description"] === "yes"), Denominator: visibleLocationRisk.length, Status: "observed", Notes: "Visible Excel rows with cached JD text" },
    { Metric: "dealbreaker_extraction_coverage_pipeline_drops", Value: count(outputDrops, (r) => Boolean(r["Dealbreaker Signal"])) / Math.max(outputDrops.length, 1), Numerator: count(outputDrops, (r) => Boolean(r["Dealbreaker Signal"])), Denominator: outputDrops.length, Status: "observed", Notes: JSON.stringify(bySignal) },
    { Metric: "visible_location_risk_count", Value: count(visibleLocationRisk, (r) => r["High Risk"] === "yes"), Numerator: count(visibleLocationRisk, (r) => r["High Risk"] === "yes"), Denominator: visibleLocationRisk.length, Status: "needs_review", Notes: "Rows classified as should-drop, review, or missing evidence" },
    { Metric: "visible_location_risk_classification_rate", Value: visibleLocationRisk.length / Math.max(evidence.excel.length, 1), Numerator: visibleLocationRisk.length, Denominator: evidence.excel.length, Status: visibleLocationRisk.length === evidence.excel.length ? "pass" : "fail", Notes: "Every visible row receives a classification" },
    { Metric: "dealbreaker_false_negative_candidates", Value: count(dealbreakerCalibration, (r) => r["Calibration Result"] === "false_negative_should_drop"), Numerator: count(dealbreakerCalibration, (r) => r["Calibration Result"] === "false_negative_should_drop"), Denominator: dealbreakerCalibration.length, Status: "needs_review", Notes: "Visible rows simulated as hard drops" },
    { Metric: "missing_seed_explainability_rate", Value: count(missingRootCause, (r) => Boolean(r["Root Cause Layer"])) / Math.max(missingRootCause.length, 1), Numerator: count(missingRootCause, (r) => Boolean(r["Root Cause Layer"])), Denominator: missingRootCause.length, Status: count(missingRootCause, (r) => Boolean(r["Root Cause Layer"])) === missingRootCause.length ? "pass" : "fail", Notes: "Every seed has exactly one root-cause label" },
    { Metric: "false_positive_detector_count", Value: falsePositives.length, Numerator: falsePositives.length, Denominator: evidence.excel.length, Status: "needs_review", Notes: "Known substring detectors only" },
    { Metric: "role_family_candidate_recovery_count", Value: roleCandidates.length, Numerator: roleCandidates.length, Denominator: "", Status: "needs_review", Notes: "No production taxonomy change in V1" },
    { Metric: "company_coverage_rows", Value: companyCoverage.length, Numerator: companyCoverage.length, Denominator: "", Status: "observed", Notes: "Enabled companies represented in coverage sheet" },
  ];
}

function makeStageReconciliation({ scanRows, pipelineRows, excelRows, outputDrops }) {
  const scanCompanies = new Set(scanRows.map((r) => r.company)).size;
  const pipelineCompanies = new Set(pipelineRows.map((r) => r.company)).size;
  const excelCompanies = new Set(excelRows.map((r) => r.company)).size;
  const uniqueExcel = uniqueNormalizedUrlCount(excelRows);
  return [
    { Stage: "Scan History", Rows: scanRows.length, "Expected Rows": EXPECTED.scanHistoryRows, "Unique URLs": uniqueNormalizedUrlCount(scanRows), "Expected Unique URLs": "", Companies: scanCompanies, "Delta From Previous": "", "Explained Delta": "retained scanner/adapter additions", "Unresolved Delta": "", Status: scanRows.length === EXPECTED.scanHistoryRows ? "ok" : "warning", Notes: "scan-history is not raw board inventory" },
    { Stage: "Pipeline", Rows: pipelineRows.length, "Expected Rows": EXPECTED.pipelineRows, "Unique URLs": uniqueNormalizedUrlCount(pipelineRows), "Expected Unique URLs": "", Companies: pipelineCompanies, "Delta From Previous": pipelineRows.length - scanRows.length, "Explained Delta": "post-processing, AE-only strip, dedup, URL variants", "Unresolved Delta": "", Status: pipelineRows.length === EXPECTED.pipelineRows ? "ok" : "warning", Notes: "" },
    { Stage: "Excel Visible", Rows: excelRows.length, "Expected Rows": EXPECTED.excelRows, "Unique URLs": uniqueExcel, "Expected Unique URLs": EXPECTED.uniqueExcelUrls, Companies: excelCompanies, "Delta From Previous": excelRows.length - pipelineRows.length, "Explained Delta": `${outputDrops.length} pipeline-to-Excel drops`, "Unresolved Delta": pipelineRows.length - excelRows.length - outputDrops.length, Status: excelRows.length === EXPECTED.excelRows && uniqueExcel === EXPECTED.uniqueExcelUrls ? "ok" : "warning", Notes: "Excel rows may contain duplicate normalized URLs/location variants" },
    { Stage: "Pipeline-to-Excel Drops", Rows: outputDrops.length, "Expected Rows": EXPECTED.pipelineToExcelDrops, "Unique URLs": new Set(outputDrops.map((r) => r["Canonical Job ID"])).size, "Expected Unique URLs": "", Companies: new Set(outputDrops.map((r) => r.Company)).size, "Delta From Previous": "", "Explained Delta": "output-time dealbreaker/intern drops", "Unresolved Delta": "", Status: outputDrops.length === EXPECTED.pipelineToExcelDrops ? "ok" : "warning", Notes: "V1 observed drops are expected to be hybrid_non_toronto" },
  ];
}

function addWorksheet(workbook, name, rows) {
  const sheet = workbook.addWorksheet(name);
  const headers = rows.length ? Object.keys(rows[0]) : ["No Data"];
  sheet.columns = headers.map((header) => ({ header, key: header, width: Math.min(Math.max(String(header).length + 2, 12), 42) }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (headers.length > 1) sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(headers.length, 26))}1` };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((column) => {
    let width = column.header.length;
    column.eachCell({ includeEmpty: false }, (cell) => { width = Math.max(width, String(cell.value ?? "").length); });
    column.width = Math.min(Math.max(width + 2, 12), 80);
  });
  return sheet;
}

function makeSheetRows({ manifest, reconciliation, seedTraces, outputDrops, lowRanked, falsePositives, roleCandidates, companyCoverage, ruleSimulation, reviewerCalibration, currentBoard, visibleLocationRisk, dealbreakerCalibration, missingRootCause, filterRobustnessMetrics }) {
  return new Map([
    ["Run Manifest", manifest],
    ["Stage Reconciliation", reconciliation],
    ["Seed Traces", seedTraces],
    ["Output Drops Review", outputDrops],
    ["Low Ranked High Intent", lowRanked],
    ["Potential False Positives", falsePositives],
    ["Role Taxonomy Candidates", roleCandidates],
    ["Company Coverage", companyCoverage],
    ["Rule Simulation", ruleSimulation],
    ["Reviewer Calibration", reviewerCalibration],
    ["Current Board Non-Baseline", currentBoard],
    ["Visible Location Risk", visibleLocationRisk],
    ["Dealbreaker Calibration", dealbreakerCalibration],
    ["Missing Job Root Cause", missingRootCause],
    ["Filter Robustness Metrics", filterRobustnessMetrics],
  ]);
}

async function loadSeeds(seedFile, warnings) {
  if (!seedFile) return SEED_JOBS;
  const text = readText(seedFile);
  if (seedFile.endsWith(".json")) return JSON.parse(text);
  if (seedFile.endsWith(".tsv")) {
    return parseTsv(text).map((r) => ({ company: r.company, display_company: r.display_company || r.company, title: r.title, url: r.url, fit_advice: r.fit_advice || "" }));
  }
  warnings.push({ type: "seed_file_unsupported", path: seedFile });
  return SEED_JOBS;
}

export async function buildCalibration({ runDate = DEFAULT_RUN_DATE, outputXlsx = DEFAULT_OUTPUT_XLSX, summaryJson = DEFAULT_SUMMARY_JSON, strict = false, allowOverwrite = false, seedFile = null } = {}) {
  if (fs.existsSync(outputXlsx) && !allowOverwrite) {
    throw new Error(`Output workbook already exists: ${outputXlsx}. Pass --allow-overwrite to replace it.`);
  }
  if (fs.existsSync(summaryJson) && !allowOverwrite) {
    throw new Error(`Summary JSON already exists: ${summaryJson}. Pass --allow-overwrite to replace it.`);
  }

  const warnings = [];
  const baselineHashBefore = fs.existsSync(BASELINE_XLSX) ? sha256(BASELINE_XLSX) : "";
  const portals = loadPortals();
  const titleFilter = portals.title_filter || {};
  const trackMap = parseTrackMappingFromYaml(resolve(CAREER_OPS, "portals.yml"));
  const jdCache = safeJson(resolve(CAREER_OPS, "data", "job-descriptions-cache.json"), warnings, "jd_cache");
  const discoveryCache = safeJson(resolve(CAREER_OPS, "data", "ats-discovery-cache.json"), warnings, "discovery_cache");
  const metrics = safeJson(resolve(REPO_ROOT, "docs", "audits", "2026-05-01-fullrun-metrics.json"), warnings, "fullrun_metrics");
  const classificationText = fs.existsSync(resolve(REPO_ROOT, "docs", "audits", "2026-05-01-fullrun-classification.md"))
    ? readText(resolve(REPO_ROOT, "docs", "audits", "2026-05-01-fullrun-classification.md"))
    : "";
  const classificationBuckets = parseClassificationBuckets(classificationText);
  const seeds = await loadSeeds(seedFile, warnings);

  const scanHistoryAll = parseTsv(readText(resolve(CAREER_OPS, "data", "scan-history.tsv")));
  const scanRows = scanHistoryAll.filter((r) => r.first_seen === runDate);
  const pipelineRows = parsePipelineMd(readText(resolve(CAREER_OPS, "data", "pipeline.md")));
  const excelRows = await parseExcelPendingJobs(BASELINE_XLSX);

  const evidence = makeEvidence({ scanRows, pipelineRows, excelRows, jdCache });
  if (evidence.cacheOnlyExclusions) warnings.push({ type: "cache_only_exclusions", count: evidence.cacheOnlyExclusions });
  if (evidence.collisions.size) warnings.push({ type: "canonical_collisions", count: evidence.collisions.size });

  const parsedCounts = {
    scanHistoryRows: scanRows.length,
    pipelineRows: pipelineRows.length,
    excelRows: excelRows.length,
    uniqueExcelUrls: uniqueNormalizedUrlCount(excelRows),
    jdCacheEntries: Object.keys(jdCache).length,
    classificationRows: classificationBuckets.size,
    fallbackRows: fs.existsSync(resolve(CAREER_OPS, "data", "firecrawl-fallback-queue.tsv")) ? readText(resolve(CAREER_OPS, "data", "firecrawl-fallback-queue.tsv")).split(/\r?\n/).filter((l) => l.trim()).length : 0,
    firecrawlCostRows: fs.existsSync(resolve(CAREER_OPS, "data", "firecrawl-cost.tsv")) ? readText(resolve(CAREER_OPS, "data", "firecrawl-cost.tsv")).split(/\r?\n/).filter((l) => l.trim()).length : 0,
    discoveryEntries: Object.keys(discoveryCache).length,
  };
  const manifest = buildManifest({ runDate, warnings, parsedCounts });
  if (strict && manifest.some((row) => row.Status !== "ok")) {
    throw new Error(`Strict manifest validation failed: ${manifest.filter((row) => row.Status !== "ok").map((row) => row.Artifact).join(", ")}`);
  }

  const seedTraces = makeSeedTraces(seeds, evidence, titleFilter);
  const outputDrops = makeOutputDrops(evidence);
  const lowRanked = makeLowRankedHighIntent(evidence.excel);
  const falsePositives = makeFalsePositives(evidence.excel);
  const roleCandidates = makeRoleCandidates([...evidence.scan, ...evidence.pipeline, ...evidence.excel, ...seeds.map((s) => ({ ...s, company: s.display_company || s.company, artifact_source: "seed_current_board_non_baseline" }))]);
  const companyCoverage = makeCompanyCoverage({ portals, scanRows, pipelineRows, excelRows, classificationBuckets, discoveryCache });
  const ruleSimulation = makeRuleSimulation({ outputDrops, falsePositives, roleCandidates, seedTraces });
  const reviewerCalibration = makeReviewerCalibration({ seedTraces, outputDrops, lowRanked, falsePositives, roleCandidates });
  const currentBoard = makeCurrentBoardSheet(seeds);
  const visibleLocationRisk = makeVisibleLocationRisk(evidence);
  const dealbreakerCalibration = makeDealbreakerCalibration(evidence);
  const missingRootCause = makeMissingJobRootCause({ seeds, evidence, titleFilter, portals, discoveryCache, classificationBuckets });
  const filterRobustnessMetrics = makeFilterRobustnessMetrics({ metrics, evidence, visibleLocationRisk, dealbreakerCalibration, missingRootCause, falsePositives, roleCandidates, companyCoverage, outputDrops });
  const reconciliation = makeStageReconciliation({ scanRows, pipelineRows, excelRows, outputDrops });

  if (outputDrops.length !== EXPECTED.pipelineToExcelDrops) warnings.push({ type: "pipeline_to_excel_drop_count_mismatch", observed: outputDrops.length, expected: EXPECTED.pipelineToExcelDrops });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "career-ops calibration";
  workbook.created = new Date();
  const sheetRows = makeSheetRows({ manifest, reconciliation, seedTraces, outputDrops, lowRanked, falsePositives, roleCandidates, companyCoverage, ruleSimulation, reviewerCalibration, currentBoard, visibleLocationRisk, dealbreakerCalibration, missingRootCause, filterRobustnessMetrics });
  for (const name of SHEET_NAMES) addWorksheet(workbook, name, sheetRows.get(name) || []);

  fs.mkdirSync(dirname(outputXlsx), { recursive: true });
  fs.mkdirSync(dirname(summaryJson), { recursive: true });
  await workbook.xlsx.writeFile(outputXlsx);

  const baselineHashAfter = fs.existsSync(BASELINE_XLSX) ? sha256(BASELINE_XLSX) : "";
  if (baselineHashBefore !== baselineHashAfter) warnings.push({ type: "baseline_hash_changed", before: baselineHashBefore, after: baselineHashAfter });

  const summary = {
    run_date: runDate,
    generated_at: new Date().toISOString(),
    manifest,
    counts: {
      scan_history_rows: scanRows.length,
      pipeline_rows: pipelineRows.length,
      excel_rows: excelRows.length,
      unique_excel_urls: parsedCounts.uniqueExcelUrls,
      pipeline_to_excel_drops: outputDrops.length,
      cache_only_exclusions: evidence.cacheOnlyExclusions,
      canonical_collisions: evidence.collisions.size,
      metrics_pending_jobs: metrics.pending_jobs ?? null,
    },
    reconciliation,
    seed_trace_summary: {
      total: seedTraces.length,
      by_defect_class: countBy(seedTraces, "Likely Defect Class"),
    },
    detector_counts: {
      output_drops: outputDrops.length,
      low_ranked_high_intent: lowRanked.length,
      potential_false_positives: falsePositives.length,
      role_taxonomy_candidates: roleCandidates.length,
      visible_location_risk_rows: visibleLocationRisk.length,
      visible_location_high_risk: visibleLocationRisk.filter((row) => row["High Risk"] === "yes").length,
      dealbreaker_false_negative_candidates: dealbreakerCalibration.filter((row) => row["Calibration Result"] === "false_negative_should_drop").length,
      missing_seed_root_causes: missingRootCause.length,
    },
    filter_robustness_metrics: Object.fromEntries(filterRobustnessMetrics.map((row) => [row.Metric, row])),
    rule_simulations: Object.fromEntries(ruleSimulation.map((row) => [row["Rule ID"], row])),
    warnings,
  };
  fs.writeFileSync(summaryJson, JSON.stringify(summary, null, 2), "utf8");

  return { summary, sheetRows, outputXlsx, summaryJson, baselineHashBefore, baselineHashAfter };
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] || 0) + 1;
  return out;
}

async function main() {
  const flags = parseArgs(process.argv);
  const result = await buildCalibration(flags);
  console.log(`Calibration workbook: ${result.outputXlsx}`);
  console.log(`Summary JSON: ${result.summaryJson}`);
  console.log(`Rows: scan=${result.summary.counts.scan_history_rows}, pipeline=${result.summary.counts.pipeline_rows}, excel=${result.summary.counts.excel_rows}, drops=${result.summary.counts.pipeline_to_excel_drops}`);
  if (result.summary.warnings.length) {
    console.log(`Warnings: ${result.summary.warnings.length}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export {
  SHEET_NAMES,
  SEED_JOBS,
  makeEvidence,
  makeOutputDrops,
  makeStageReconciliation,
  makeSeedTraces,
  makeFalsePositives,
  makeRoleCandidates,
};
