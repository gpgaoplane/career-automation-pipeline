#!/usr/bin/env node
// Offline shadow audit for production filter refinement.
// No network and no mutation of baseline pipeline/cache/workbook artifacts.

import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { parseJdSections } from "./lib/jd-sections.mjs";
import { scoreJob, formatScoreReasons, detectHighSalaryRanges, classifyRoleFamily } from "./lib/job-fit-rules.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
const careerOpsRequire = createRequire(resolve(CAREER_OPS, "package.json"));

let ExcelJS;
try {
  ExcelJS = careerOpsRequire("exceljs");
} catch {
  throw new Error("Missing exceljs. Run `npm install` inside career-ops/.");
}

const DEFAULT_RUN_DATE = "2026-05-01";
const BASELINE_XLSX = resolve(CAREER_OPS, "output", "jobs-2026-05-01.xlsx");
const DEFAULT_OUT_XLSX = resolve(CAREER_OPS, "output", `production-filter-refinement-review-${DEFAULT_RUN_DATE}.xlsx`);
const DEFAULT_SUMMARY = resolve(REPO_ROOT, "docs", "audits", "2026-05-03-production-filter-refinement-summary.json");

export const REVIEW_SHEETS = [
  "Run Manifest",
  "Shadow Decisions",
  "Hard Drop Review",
  "Sales Hard Drops",
  "Comp YoE Location",
  "Score Deltas",
  "Validation Findings",
  "Source Repair Review",
  "Reviewer Queue",
  "Metrics",
  "Known Missing Seeds",
];

const KNOWN_SEEDS = [
  ["Surge AI", "Technical Program Manager", "https://surgehq.ai/careers/technical-program-manager"],
  ["Surge AI", "Program Manager", "https://surgehq.ai/careers/program-manager"],
  ["Surge AI", "Generative AI Generalist", "https://surgehq.ai/careers/generative-ai-generalist"],
  ["Surge AI", "AI Programs Analyst", "https://surgehq.ai/careers/ai-programs-analyst"],
  ["Surge AI", "Product Operations Manager", "https://surgehq.ai/careers/product-operations-manager"],
  ["ElevenLabs", "AI Automations Engineer", "https://jobs.ashbyhq.com/elevenlabs/a3097257-a07a-4a7e-b9fe-b8555c1a0fa7?locationId=42639f3c-c983-400d-8673-1e32388b5e99"],
  ["ElevenLabs", "Full-Stack Engineer", "https://jobs.ashbyhq.com/elevenlabs/6a530871-b6c6-4783-ac6b-69cc3b084192?locationId=42639f3c-c983-400d-8673-1e32388b5e99"],
  ["ElevenLabs", "Deployment Strategist - North America", "https://jobs.ashbyhq.com/elevenlabs/8c068ebf-c79f-4f12-97ef-b4c9a4f7ae5f?locationId=42639f3c-c983-400d-8673-1e32388b5e99"],
  ["ElevenLabs", "AI Creative Producer - Ads", "https://jobs.ashbyhq.com/elevenlabs/2451b957-0ece-4e73-88e4-4196aac0ba86?locationId=42639f3c-c983-400d-8673-1e32388b5e99"],
  ["xAI", "Image Tutor", "https://job-boards.greenhouse.io/xai/jobs/5047544007"],
  ["xAI", "Video Tutor", "https://job-boards.greenhouse.io/xai/jobs/5047564007"],
  ["xAI", "AI Tutor - Chinese", "https://job-boards.greenhouse.io/xai/jobs/5090180007"],
  ["xAI", "AI Tutor - Crypto", "https://job-boards.greenhouse.io/xai/jobs/5040344007"],
  ["Atlassian", "Solutions Architect | DX", "https://www.atlassian.com/company/careers/details/24843"],
];

export function parseArgs(argv) {
  const flags = {
    runDate: DEFAULT_RUN_DATE,
    outputXlsx: DEFAULT_OUT_XLSX,
    summaryJson: DEFAULT_SUMMARY,
    allowOverwrite: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--run-date") flags.runDate = argv[++i];
    else if (a === "--output-xlsx") flags.outputXlsx = resolve(REPO_ROOT, argv[++i]);
    else if (a === "--summary-json") flags.summaryJson = resolve(REPO_ROOT, argv[++i]);
    else if (a === "--allow-overwrite") flags.allowOverwrite = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/production-filter-refinement-audit.mjs --run-date 2026-05-01 [--allow-overwrite]");
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${a}`);
    }
  }
  return flags;
}

export function normalizeUrl(url) {
  return String(url || "").trim().replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
}

// V6 (F-002): extract a stable job id (gh_jid for Greenhouse, Ashby UUID for
// Ashby) from any URL shape. Used for row-identity dedup when the same job
// appears via both the canonical ATS URL and a contaminated listing-page
// mirror (e.g. scale.com/careers/<id>, accel.com/companies/.../jobs/<id>-...,
// elevenlabs.io/careers/<uuid>/...).
export function extractGhJid(url) {
  const u = String(url || "");
  // Greenhouse canonical: job-boards.greenhouse.io/<org>/jobs/<id> or boards.greenhouse.io/<org>/jobs/<id>
  let m = /greenhouse\.io\/[^/]+\/jobs\/(\d{6,})/i.exec(u);
  if (m) return `gh:${m[1]}`;
  // scale.com/careers/<id>
  m = /scale\.com\/careers\/(\d{6,})/i.exec(u);
  if (m) return `gh:${m[1]}`;
  // jobs.accel.com (Accel portfolio listing): /companies/<co>/jobs/<id>-...
  m = /accel\.com\/companies\/[^/]+\/jobs\/(\d{6,})/i.exec(u);
  if (m) return `gh:${m[1]}`;
  // Ashby canonical: jobs.ashbyhq.com/<org>/<uuid>
  m = /jobs\.ashbyhq\.com\/[^/]+\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(u);
  if (m) return `ashby:${m[1].toLowerCase()}`;
  // Ashby branded mirrors carry the same UUID in path: e.g.
  //   elevenlabs.io/careers/<uuid>/forward-deployed-engineer-...
  m = /\/careers\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(u);
  if (m) return `ashby:${m[1].toLowerCase()}`;
  return "";
}

// V6 (F-002): canonical-URL preference. Prefer the canonical ATS host (Greenhouse
// job-boards/boards or jobs.ashbyhq.com) over listing-page mirrors that share
// the same job id.
function isCanonicalGreenhouseUrl(url) {
  const u = String(url || "");
  return /(?:job-boards|boards)\.greenhouse\.io\/[^/]+\/jobs\/\d+/i.test(u) ||
    /jobs\.ashbyhq\.com\/[^/]+\/[0-9a-f-]{36}/i.test(u);
}

// V6 (F-002): strip listing-page chrome from titles. Examples observed in the
// retained 2026-05-01 pipeline:
//   "Forward Deployed Product Manager, EnterpriseNew York, NYApply Now"
//   "Forward Deployed Engineer - Software EngineerRemoteSan Francisco+4 more"
//   "Read moreabout Forward Deployed Engineer, Tinker at Thinking Machines Lab"
// Trailing "Apply Now" / "+N more" / "Read moreabout" / location-suffix patterns
// are removed; the cleaned title is used for display and for downstream
// title-only family classification.
export function stripListingTitleChrome(title) {
  let t = String(title || "");
  // Lead "Read moreabout " (no space variant from listing scrapes).
  t = t.replace(/^Read more\s*about\s*/i, "");
  // Trailing " at <Company>" suffix (Accel listing format).
  t = t.replace(/\s+at\s+[A-Z][A-Za-z0-9&.\- ]+$/i, "");
  // Trailing "Apply Now" / "+N more".
  t = t.replace(/\s*(?:Apply Now|\+\d+\s*more)\s*$/i, "");
  // Iteratively strip up to two trailing location-suffix chunks (e.g.
  // "...EnterpriseNew York, NYApply Now" or "...Software EngineerRemoteSan Francisco").
  for (let i = 0; i < 2; i++) {
    const before = t;
    t = t.replace(/\s*(?:Remote|Hybrid|On-?site)$/i, "");
    t = t.replace(/(?:[A-Za-z][A-Za-z\s.\-']*?,\s*(?:[A-Z]{2}|UK|United Kingdom|Canada|USA))$/u, "");
    t = t.replace(/(?:New York|San Francisco|Los Angeles|Seattle|Austin|Boston|Denver|Chicago|London|Paris|Berlin|Toronto|Vancouver|Montreal)(?:,\s*[A-Z]{2})?$/u, "");
    if (t === before) break;
  }
  return t.trim().replace(/\s+/g, " ");
}

export function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function rel(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function parsePipelineMd(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const rows = [];
  let inPending = false;
  for (const line of lines) {
    if (line.startsWith("## Pendientes")) {
      inPending = true;
      continue;
    }
    if (inPending && line.startsWith("## ") && !line.startsWith("## Pendientes")) break;
    if (!inPending || !line.startsWith("- [ ] ")) continue;
    const content = line.slice(6);
    const parts = content.split(" | ");
    if (parts.length < 3) continue;
    rows.push({ url: parts[0].trim(), company: parts[1].trim(), title: parts.slice(2).join(" | ").trim() });
  }
  return rows;
}

function parseScanHistory(filePath, runDate) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  return lines.slice(1).map((line) => {
    const [url, first_seen, portal, title, company, status] = line.split("\t");
    return { url, first_seen, portal, title, company, status };
  }).filter((row) => row.first_seen === runDate);
}

function loadCompanyMap() {
  const raw = fs.readFileSync(resolve(CAREER_OPS, "portals.yml"), "utf8");
  const parsed = yaml.load(raw);
  const map = new Map();
  for (const c of parsed.tracked_companies || []) {
    map.set(c.name, { name: c.name, rank: c.rank ?? 9999, category: c.category ?? "", enabled: c.enabled !== false, careers_url: c.careers_url || "" });
  }
  return map;
}

async function parseBaselineExcel(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet("Pending Jobs");
  if (!sheet) throw new Error("Baseline workbook missing Pending Jobs sheet");
  const header = {};
  sheet.getRow(1).eachCell((cell, col) => { header[String(cell.value || "").trim()] = col; });
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (name) => row.getCell(header[name]).value;
    rows.push({
      rank: get("Rank"),
      company: String(get("Company") || ""),
      category: String(get("Category") || ""),
      title: String(get("Title") || ""),
      url: String(get("URL") || ""),
      old_match_track: String(get("Match Track") || ""),
      old_title_score: Number(get("Title Score") || 0),
      old_desc_score: Number(get("Desc Score") || 0),
      old_pre_score: Number(get("Pre-Score") || 0),
      old_band: String(get("Band") || ""),
      old_score_notes: String(get("Score Notes") || ""),
    });
  });
  return rows;
}

function cacheText(entry) {
  return String(entry?.content_text || entry?.description || entry?.markdown || entry?.text || "");
}

function writeTsv(filePath, rows, columns) {
  fs.mkdirSync(dirname(filePath), { recursive: true });
  const body = [
    columns.join("\t"),
    ...rows.map((row) => columns.map((col) => String(row[col] ?? "").replace(/\r?\n/g, " ").replace(/\t/g, " ")).join("\t")),
  ].join("\n") + "\n";
  fs.writeFileSync(filePath, body, "utf8");
}

function addSheet(wb, name, rows, columns) {
  const sheet = wb.addWorksheet(name);
  sheet.columns = columns.map((col) => ({ header: col.header, key: col.key, width: col.width || Math.min(60, Math.max(12, col.header.length + 4)) }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(columns.length, 26))}1` };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((col) => {
    let max = Math.max(10, String(col.header || "").length);
    col.eachCell({ includeEmpty: false }, (cell) => {
      max = Math.max(max, String(cell.value ?? "").length);
    });
    col.width = Math.min(80, max + 2);
  });
}

function distribution(rows, key) {
  const counts = {};
  for (const row of rows) counts[row[key] || ""] = (counts[row[key] || ""] || 0) + 1;
  return counts;
}

export async function buildAudit(flags) {
  const baselineShaBefore = sha256(BASELINE_XLSX);
  const pipelineRaw = parsePipelineMd(resolve(CAREER_OPS, "data", "pipeline.md"));
  // V6 (F-002): dedup pipeline rows by (normalized_company, gh_jid). When two
  // rows share the same gh_jid, prefer the canonical Greenhouse URL over a
  // listing-page mirror (scale.com/careers/<id>, accel.com/companies/<co>/jobs/<id>).
  // Also strip listing-page chrome from titles so the dedup-survivor displays
  // a clean title even when only the contaminated URL was kept.
  const pipelineDedup = new Map();
  const pipeline = [];
  for (const job of pipelineRaw) {
    const cleanedTitle = stripListingTitleChrome(job.title);
    const ghJid = extractGhJid(job.url);
    if (!ghJid) {
      pipeline.push({ ...job, title: cleanedTitle });
      continue;
    }
    const key = `${String(job.company || "").trim().toLowerCase()}\t${ghJid}`;
    const existing = pipelineDedup.get(key);
    if (!existing) {
      const idx = pipeline.length;
      pipeline.push({ ...job, title: cleanedTitle });
      pipelineDedup.set(key, idx);
      continue;
    }
    // Tie-break: prefer canonical Greenhouse URL.
    const incomingCanonical = isCanonicalGreenhouseUrl(job.url);
    const incumbentCanonical = isCanonicalGreenhouseUrl(pipeline[existing].url);
    if (incomingCanonical && !incumbentCanonical) {
      pipeline[existing] = { ...job, title: cleanedTitle };
    }
    // Otherwise drop the duplicate.
  }
  const scanHistory = parseScanHistory(resolve(CAREER_OPS, "data", "scan-history.tsv"), flags.runDate);
  const excelRows = await parseBaselineExcel(BASELINE_XLSX);
  const cache = readJson(resolve(CAREER_OPS, "data", "job-descriptions-cache.json"));
  const companyMap = loadCompanyMap();
  const excelByUrl = new Map(excelRows.map((row) => [normalizeUrl(row.url), row]));

  const decisions = pipeline.map((job) => {
    const cacheEntry = cache[job.url] || cache[normalizeUrl(job.url)] || null;
    const text = cacheText(cacheEntry);
    const sourceHygiene = detectSourceHygiene({ job, cacheEntry, text });
    const usableText = sourceHygiene.invalid ? "" : text;
    const sections = parseJdSections(usableText);
    const signals = cacheEntry?.extracted_signals || {};
    const old = excelByUrl.get(normalizeUrl(job.url)) || null;
    const companyMeta = companyMap.get(job.company) || { rank: 9999, category: "" };
    const scoreSignals = sourceHygiene.invalid ? {} : signals;
    const score = scoreJob({ job, companyMeta, signals: scoreSignals, textSections: sections });
    const titleFamily = classifyRoleFamily({ title: job.title, companyMeta: { ...companyMeta, company: job.company } });
    const sourceRepairAnnotations = sourceHygiene.invalid ? [`source_repair_${sourceHygiene.reason}`] : [];
    if (sourceHygiene.invalid && titleFamily.primary_family !== "UNKNOWN" && score.primary_family === "UNKNOWN") {
      score.primary_family = titleFamily.primary_family;
      score.families = titleFamily.families;
    }
    const sourceRepair = sourceHygiene.invalid || /source_repair_or_cache_miss_review/.test(score.annotations.join("; "));
    const highSalaryRanges = sourceHygiene.invalid ? [] : detectHighSalaryRanges(text);
    const locationRisk = sourceHygiene.invalid ? { kind: "", evidence: "" } : detectSpecificLocationRisk({ title: job.title, text, signals });
    const annotations = [...score.annotations, ...sourceRepairAnnotations].join("; ");
    // V7-A3: surface territory signal to the workbook for audit / Will review.
    const territoryRegion = sourceHygiene.invalid ? "" : (score.territory?.region || "UNKNOWN");
    const territoryEvidenceJoined = sourceHygiene.invalid ? "" : (score.territory?.evidence || []).slice(0, 3).join(" | ");
    const territoryDropped = score.territory_dropped ? "yes" : "no";
    return {
      company: job.company,
      title: job.title,
      url: job.url,
      visible_in_baseline_excel: old ? "yes" : "no",
      cache_hit: cacheEntry?.extracted_signals ? "yes" : "no",
      territory_region: territoryRegion,
      territory_evidence: territoryEvidenceJoined,
      territory_dropped: sourceHygiene.invalid ? "no" : territoryDropped,
      old_match_track: old?.old_match_track || "",
      old_title_score: old?.old_title_score ?? "",
      old_desc_score: old?.old_desc_score ?? "",
      old_pre_score: old?.old_pre_score ?? "",
      old_band: old?.old_band || "",
      primary_family: score.primary_family,
      shadow_score: score.shadow_score,
      shadow_band: score.shadow_band,
      score_delta: old ? score.shadow_score - old.old_pre_score : "",
      hard_drop: sourceHygiene.invalid ? "no" : (score.hard_drop ? "yes" : "no"),
      hard_drop_reason: sourceHygiene.invalid ? "" : score.hard_drop_reason,
      hard_drop_evidence: sourceHygiene.invalid ? "" : score.hard_drop_evidence,
      source_repair: sourceRepair ? "yes" : "no",
      source_repair_reason: sourceHygiene.reason,
      source_repair_evidence: sourceHygiene.evidence,
      high_salary_evidence: highSalaryRanges.map((r) => `${r.low_thousands}-${r.high_thousands} ${r.currency}: ${r.snippet}`).join(" | "),
      location_risk_evidence: locationRisk.evidence,
      location_risk_kind: locationRisk.kind,
      decision_confidence: score.decision_confidence,
      annotations,
      location_reason: sourceHygiene.invalid ? "" : (score.location.reason || ""),
      location_annotations: score.location.annotations.join("; "),
      compensation_reason: sourceHygiene.invalid ? "" : (score.compensation.reason || ""),
      compensation_candidate: !sourceHygiene.invalid && score.compensation.candidate
        ? `${score.compensation.candidate.low_thousands}-${score.compensation.candidate.high_thousands} ${score.compensation.candidate.currency} ${score.compensation.candidate.rate_type}`
        : "",
      yoe_reason: sourceHygiene.invalid ? "" : (score.yoe.reason || ""),
      yoe_years: sourceHygiene.invalid ? "" : (score.yoe.years ?? ""),
      semantic_score: score.semantic.score,
      semantic_confidence: score.semantic.confidence,
      score_reasons: sourceHygiene.invalid ? `${formatScoreReasons(score)} | source_repair=${sourceHygiene.reason}` : formatScoreReasons(score),
      reviewer_decision: "",
      will_notes: "",
    };
  });

  const validationFindings = buildValidationFindings(decisions);

  const checkpointDir = resolve(CAREER_OPS, "output", "checkpoints", flags.runDate);
  const ledgers = {
    retainedTitle: resolve(checkpointDir, "baseline-retained-title-ledger.tsv"),
    prePipeline: resolve(checkpointDir, "pre-pipeline-candidates.tsv"),
    enrichment: resolve(checkpointDir, "enrichment-ledger.tsv"),
    location: resolve(checkpointDir, "location-dealbreaker-ledger.tsv"),
    scoring: resolve(checkpointDir, "scoring-ledger.tsv"),
  };

  writeTsv(ledgers.retainedTitle, scanHistory.map((row) => ({
    ...row,
    ledger_scope: "baseline_retained_only_not_historical_raw_rejects",
  })), ["ledger_scope", "url", "first_seen", "portal", "title", "company", "status"]);

  writeTsv(ledgers.prePipeline, decisions.filter((d) => /GENERIC_ENGINEERING_REVIEW|UNKNOWN/.test(d.primary_family) || /review/.test(d.annotations)).map((d) => ({
    company: d.company, title: d.title, url: d.url, primary_family: d.primary_family, annotations: d.annotations, score_reasons: d.score_reasons,
  })), ["company", "title", "url", "primary_family", "annotations", "score_reasons"]);

  writeTsv(ledgers.enrichment, decisions.map((d) => ({
    company: d.company, title: d.title, url: d.url, cache_hit: d.cache_hit, semantic_confidence: d.semantic_confidence, semantic_score: d.semantic_score,
  })), ["company", "title", "url", "cache_hit", "semantic_confidence", "semantic_score"]);

  writeTsv(ledgers.location, decisions.filter((d) => d.location_reason || d.location_annotations).map((d) => ({
    company: d.company, title: d.title, url: d.url, visible_in_baseline_excel: d.visible_in_baseline_excel, location_reason: d.location_reason, location_annotations: d.location_annotations, hard_drop: d.hard_drop,
  })), ["company", "title", "url", "visible_in_baseline_excel", "location_reason", "location_annotations", "hard_drop"]);

  writeTsv(ledgers.scoring, decisions, [
    "company", "title", "url", "visible_in_baseline_excel", "old_pre_score", "old_band", "primary_family",
    "shadow_score", "shadow_band", "score_delta", "hard_drop", "hard_drop_reason", "annotations", "score_reasons",
  ]);

  const manifest = [
    { artifact: "baseline_excel", path: rel(BASELINE_XLSX), sha256: baselineShaBefore, rows: excelRows.length },
    { artifact: "pipeline", path: "career-ops/data/pipeline.md", rows: pipeline.length },
    { artifact: "scan_history_run_date", path: "career-ops/data/scan-history.tsv", rows: scanHistory.length },
    ...Object.values(ledgers).map((p) => ({ artifact: path.basename(p), path: rel(p), rows: fs.readFileSync(p, "utf8").trim().split("\n").length - 1 })),
  ];

  const seedRows = KNOWN_SEEDS.map(([company, title, url]) => {
    const hit = decisions.find((d) => normalizeUrl(d.url) === normalizeUrl(url));
    return {
      company, title, url,
      baseline_presence: hit ? (hit.visible_in_baseline_excel === "yes" ? "excel_visible" : "pipeline_only") : "absent_from_retained_2026_05_01_artifacts",
      root_cause_label: hit ? "retained_artifact_available_for_shadow_scoring" : "not_present_in_baseline_retained_artifacts_or_current_board_delta",
      shadow_family: hit?.primary_family || "",
      shadow_decision: hit?.hard_drop === "yes" ? hit.hard_drop_reason : "review_or_recover_candidate",
    };
  });
  const sourceRepairRows = [
    ...decisions.filter((d) => d.source_repair === "yes").map((d) => ({
      item_type: "retained_pipeline_row",
      company: d.company,
      title: d.title,
      url: d.url,
      visible_in_baseline_excel: d.visible_in_baseline_excel,
      cache_hit: d.cache_hit,
      source_repair_reason: d.source_repair_reason || "high_intent_title_needs_source_review",
      source_repair_evidence: d.source_repair_evidence,
      primary_family: d.primary_family,
      shadow_score: d.shadow_score,
      shadow_band: d.shadow_band,
      annotations: d.annotations,
      score_reasons: d.score_reasons,
      reviewer_decision: "",
      will_notes: "",
    })),
    ...seedRows.filter((r) => /absent_from_retained/.test(r.baseline_presence)).map((r) => ({
      item_type: "known_missing_seed",
      company: r.company,
      title: r.title,
      url: r.url,
      visible_in_baseline_excel: "no",
      cache_hit: "no",
      source_repair_reason: r.root_cause_label,
      source_repair_evidence: r.baseline_presence,
      primary_family: r.shadow_family,
      shadow_score: "",
      shadow_band: "",
      annotations: "known_missing_seed_source_repair_review",
      score_reasons: r.shadow_decision,
      reviewer_decision: "",
      will_notes: "",
    })),
  ];

  const metricsRows = [
    { metric: "pipeline_rows", value: pipeline.length },
    { metric: "scan_history_rows_for_run_date", value: scanHistory.length },
    { metric: "baseline_excel_rows", value: excelRows.length },
    { metric: "shadow_hard_drops", value: decisions.filter((d) => d.hard_drop === "yes").length },
    { metric: "visible_shadow_hard_drops", value: decisions.filter((d) => d.visible_in_baseline_excel === "yes" && d.hard_drop === "yes").length },
    { metric: "sales_hard_drops", value: decisions.filter((d) => /sales_role/.test(d.hard_drop_reason)).length },
    // V7-A3: separate territory bucket. Reason string contains "non_na_territory"
    // and does NOT match /sales_role/ — territory drops do not double-count.
    { metric: "territory_hard_drops", value: decisions.filter((d) => /non_na_territory/.test(d.hard_drop_reason)).length },
    { metric: "comp_hard_drops", value: decisions.filter((d) => /comp_upper/.test(d.hard_drop_reason)).length },
    { metric: "yoe_hard_drops", value: decisions.filter((d) => /yoe_required/.test(d.hard_drop_reason)).length },
    { metric: "location_hard_drops", value: decisions.filter((d) => /non_toronto_no_remote/.test(d.hard_drop_reason)).length },
    { metric: "source_repair_review_rows", value: sourceRepairRows.length },
    { metric: "missing_seed_explainability_rate", value: `${seedRows.filter((r) => r.root_cause_label).length}/${seedRows.length}` },
    { metric: "old_band_distribution", value: JSON.stringify(distribution(decisions.filter((d) => d.old_band), "old_band")) },
    { metric: "shadow_band_distribution", value: JSON.stringify(distribution(decisions, "shadow_band")) },
    { metric: "validation_findings", value: validationFindings.length },
    { metric: "validation_blocking_findings", value: validationFindings.filter((f) => f.severity === "blocking").length },
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "career-ops shadow audit";
  wb.created = new Date("2026-05-03T00:00:00-04:00");
  wb.modified = wb.created;

  addSheet(wb, "Run Manifest", manifest, [
    { header: "Artifact", key: "artifact" }, { header: "Path", key: "path" }, { header: "SHA256", key: "sha256" }, { header: "Rows", key: "rows" },
  ]);
  addSheet(wb, "Shadow Decisions", decisions, [
    "company", "title", "url", "visible_in_baseline_excel", "cache_hit", "old_pre_score", "old_band", "primary_family", "shadow_score", "shadow_band", "score_delta", "hard_drop", "hard_drop_reason", "territory_region", "territory_evidence", "territory_dropped", "source_repair", "source_repair_reason", "annotations", "score_reasons",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Hard Drop Review", decisions.filter((d) => d.hard_drop === "yes"), [
    "company", "title", "url", "visible_in_baseline_excel", "hard_drop_reason", "hard_drop_evidence", "decision_confidence", "reviewer_decision", "will_notes",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Sales Hard Drops", decisions.filter((d) => /sales_role/.test(d.hard_drop_reason)), [
    "company", "title", "url", "visible_in_baseline_excel", "hard_drop_reason", "hard_drop_evidence",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Comp YoE Location", decisions.filter((d) => d.compensation_reason || d.yoe_reason || d.location_reason || d.location_annotations), [
    "company", "title", "url", "visible_in_baseline_excel", "compensation_reason", "compensation_candidate", "yoe_reason", "yoe_years", "location_reason", "location_annotations", "hard_drop",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Score Deltas", decisions.filter((d) => d.visible_in_baseline_excel === "yes").sort((a, b) => Number(b.score_delta || 0) - Number(a.score_delta || 0)), [
    "company", "title", "url", "old_pre_score", "old_band", "shadow_score", "shadow_band", "score_delta", "primary_family", "hard_drop", "hard_drop_reason", "score_reasons",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Validation Findings", validationFindings, [
    "severity", "finding_type", "company", "title", "url", "hard_drop_reason", "details", "suggested_action",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Source Repair Review", sourceRepairRows, [
    "item_type", "company", "title", "url", "visible_in_baseline_excel", "cache_hit", "source_repair_reason", "source_repair_evidence", "primary_family", "shadow_score", "shadow_band", "annotations", "score_reasons", "reviewer_decision", "will_notes",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Reviewer Queue", decisions.filter((d) => d.hard_drop !== "yes" && /review|unknown/i.test(`${d.annotations} ${d.primary_family}`)).slice(0, 500), [
    "company", "title", "url", "primary_family", "shadow_score", "shadow_band", "hard_drop", "hard_drop_reason", "annotations", "reviewer_decision", "will_notes",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));
  addSheet(wb, "Metrics", metricsRows, [{ header: "Metric", key: "metric" }, { header: "Value", key: "value" }]);
  addSheet(wb, "Known Missing Seeds", seedRows, [
    "company", "title", "url", "baseline_presence", "root_cause_label", "shadow_family", "shadow_decision",
  ].map((k) => ({ header: k.replace(/_/g, " "), key: k })));

  fs.mkdirSync(dirname(flags.outputXlsx), { recursive: true });
  if (fs.existsSync(flags.outputXlsx) && !flags.allowOverwrite) {
    throw new Error(`Output exists: ${flags.outputXlsx}. Pass --allow-overwrite to replace.`);
  }
  await wb.xlsx.writeFile(flags.outputXlsx);

  const baselineShaAfter = sha256(BASELINE_XLSX);
  const summary = {
    run_date: flags.runDate,
    generated_at: new Date().toISOString(),
    baseline_sha_before: baselineShaBefore,
    baseline_sha_after: baselineShaAfter,
    baseline_unchanged: baselineShaBefore === baselineShaAfter,
    outputs: {
      workbook: rel(flags.outputXlsx),
      ledgers: Object.fromEntries(Object.entries(ledgers).map(([k, p]) => [k, rel(p)])),
    },
    counts: Object.fromEntries(metricsRows.map((r) => [r.metric, r.value])),
    sheet_names: REVIEW_SHEETS,
    validation: {
      total_findings: validationFindings.length,
      blocking_findings: validationFindings.filter((f) => f.severity === "blocking").length,
      review_only_findings: validationFindings.filter((f) => f.severity === "review").length,
      review_ready: validationFindings.filter((f) => f.severity === "blocking").length === 0,
    },
    seed_trace_summary: {
      total: seedRows.length,
      explained: seedRows.filter((r) => r.root_cause_label).length,
    },
    warnings: [
      "baseline-retained-title-ledger is limited to retained 2026-05-01 artifacts and does not claim historical raw title rejects",
      "shadow bands are calibration-only and not production defaults",
      validationFindings.some((f) => f.severity === "blocking")
        ? "blocking validation findings exist; workbook is not review-ready"
        : "no blocking validation findings; review-only findings may still need sampling",
    ],
  };
  fs.mkdirSync(dirname(flags.summaryJson), { recursive: true });
  fs.writeFileSync(flags.summaryJson, JSON.stringify(summary, null, 2) + "\n", "utf8");

  return { decisions, seedRows, metricsRows, summary };
}

function buildValidationFindings(decisions) {
  const findings = [];
  for (const d of decisions) {
    const add = (severity, finding_type, details, suggested_action) => {
      findings.push({
        severity,
        finding_type,
        company: d.company,
        title: d.title,
        url: d.url,
        hard_drop_reason: d.hard_drop_reason,
        details,
        suggested_action,
      });
    };

    if (/comp_upper_below_120/.test(d.hard_drop_reason) && d.high_salary_evidence) {
      add(
        "blocking",
        "comp_high_salary_contradiction",
        `Comp hard-drop conflicts with high salary evidence: ${d.high_salary_evidence}`,
        "Remove comp hard-drop or choose explicit high salary candidate.",
      );
    }
    if (/comp_upper_below_120/.test(d.hard_drop_reason) && /travel|customers?|arr|poster|eeoc|rights|country|phone|veteran|recently separated/i.test(d.hard_drop_evidence)) {
      add(
        "blocking",
        "comp_non_salary_evidence",
        `Comp hard-drop evidence appears non-salary: ${d.hard_drop_evidence}`,
        "Reject this compensation candidate.",
      );
    }
    if (d.hard_drop === "yes" && !String(d.hard_drop_evidence || "").trim()) {
      add("blocking", "hard_drop_missing_evidence", "Hard drop has no evidence snippet.", "Attach reason-specific evidence.");
    }
    if (d.source_repair === "yes" && d.hard_drop === "yes") {
      add(
        "blocking",
        "source_repair_row_has_hard_drop",
        `Source-repair row still has hard-drop reason: ${d.hard_drop_reason}`,
        "Suppress hard drops until row-level source evidence is repaired.",
      );
    }
    const locationEvidence = `${d.hard_drop_evidence} ${d.location_risk_evidence}`;
    const fakeRemote = /\b(remote control|remote sensing|remote procedure|remote desktop|remote cloud|remote storage|remote access protocol|remote ground|remote hiring process|remote interview|remote interviews|remote process|remote assessment)\b/i;
    const genuineRemote = /\b(fully remote|100%\s*remote|remote[-\s]?first|remote work|work remotely|remote role|remote position|remote within|remote from|remote candidates? (?:considered|eligible)|remote\s*[-,]?\s*\(?(?:us|u\.s\.|usa|united states|canada|north america|worldwide|uk|united kingdom)\)?|remote\s+(?:los angeles|san francisco|new york|seattle|austin|boston|denver|chicago)|(?:us|u\.s\.|usa|united states|washington,?\s*d\.?c\.?|canada|uk|united kingdom)\s*\(remote\)|(?:us|u\.s\.|usa|united states|canada|uk|united kingdom)[,\s-]+remote|distributed team)/i.test(locationEvidence);
    if (/\bno_remote\b|specific_non_toronto_location_no_remote/.test(d.hard_drop_reason) && genuineRemote && !fakeRemote.test(locationEvidence)) {
      add(
        "blocking",
        "remote_evidence_conflicts_with_no_remote_drop",
        `Location hard-drop conflicts with apparent remote evidence: ${d.hard_drop_evidence || d.location_risk_evidence}`,
        "Treat genuine remote as keep/review with region annotation, not as no-remote.",
      );
    }
    // V6 (F-009): only emit specific_location_not_in_drop_reason when the
    // location classifier itself flagged a non-Toronto reason. If
    // d.location_reason is empty (location was kept, e.g. Toronto + remote-
    // flexible), the prior emission was a labeling artifact, not a defect.
    if (
      d.location_risk_evidence &&
      d.hard_drop === "yes" &&
      !/location|non_toronto|hybrid|onsite/.test(d.hard_drop_reason) &&
      d.location_reason && /non_toronto/.test(d.location_reason)
    ) {
      const hasTorontoOption = /\b(Toronto|GTA|Greater Toronto Area)\b/i.test(d.location_risk_evidence);
      const hasRemoteFlexible = /\b(remote[-\s]?flexible|remote,?\s*(?:hybrid|us|u\.s\.|united states|canada|north america|worldwide)|fully remote|100%\s*remote|remote role|remote position)\b/i.test(d.location_risk_evidence);
      add(
        d.location_risk_kind === "explicit_hybrid_onsite" && !hasTorontoOption && !hasRemoteFlexible ? "blocking" : "review",
        "specific_location_not_in_drop_reason",
        `Specific non-Toronto location appears, but hard-drop reason does not include location: ${d.location_risk_evidence}`,
        "Confirm whether genuine remote language exists; otherwise add location hard-drop.",
      );
    }
  }
  return findings;
}

function titleAppearsInText(title, text) {
  const normalizedTitle = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalizedTitle) return false;
  const normalizedText = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
  if (normalizedText.includes(normalizedTitle)) return true;
  const titleTokens = normalizedTitle.split(" ").filter((token) => token.length > 2);
  if (titleTokens.length < 2) return normalizedText.includes(normalizedTitle);
  const matched = titleTokens.filter((token) => normalizedText.includes(token)).length;
  return matched / titleTokens.length >= 0.75;
}

export function detectSourceHygiene({ job = {}, cacheEntry = null, text = "" } = {}) {
  const url = String(job.url || "");
  const body = String(text || "");
  const first = body.slice(0, 2500);
  const evidence = (reason) => body.slice(0, 260).replace(/\s+/g, " ").trim() || reason;
  // V6 (F-004): hostname blocklist for placeholder/invalid URLs (e.g., the
  // RFC 2606 reserved domain "example.com" or local hostnames). These should
  // never have entered the pipeline; route to Source Repair regardless of cache.
  if (/^https?:\/\/(?:[\w.-]+\.)?(?:example\.(?:com|org|net)|test\.example|localhost|127\.0\.0\.|0\.0\.0\.0)/i.test(url)) {
    return { invalid: true, reason: "placeholder_or_invalid_url", evidence: url };
  }
  // V6 (F-003): Atlassian-style listing query URLs ("/all-jobs?team=...") are
  // generic listings, not job postings. Route before cache checks so empty-body
  // listings still surface with the right reason.
  if (/\/all-jobs\?/i.test(url) || /\?team=[^&]+(?:&location=|&search=)/i.test(url)) {
    return { invalid: true, reason: "generic_careers_index", evidence: "all-jobs query listing page" };
  }
  if (!cacheEntry || !body.trim()) {
    return { invalid: true, reason: "missing_jd_cache", evidence: "no cached JD text for retained row" };
  }
  if (/\b(page not found|url you have provided is invalid|job not found|posting is no longer available|position has been filled|no longer accepting applications)\b/i.test(first)) {
    return { invalid: true, reason: "page_not_found_or_closed_cache", evidence: evidence("page not found") };
  }
  // V8-A4: Workday language-switcher chrome. Body content is the localized
  // language-list dropdown rendered before the JD JS loads — body is short
  // (< 1500 chars) and starts with "English - English - {locale list...}".
  // Pure listing chrome; NO actual job description. Source: docs/audits/2026-05-06-v8-source-hygiene-audit.md.
  if (
    /myworkdayjobs\.com/i.test(url) &&
    body.length < 1500 &&
    /^\s*english\s*-\s*english\s*-\s*/i.test(first)
  ) {
    return { invalid: true, reason: "workday_language_switcher_chrome", evidence: evidence("workday language switcher chrome (no JD content)") };
  }
  if (/\/company\/careers\/locations\//i.test(url)) {
    return { invalid: true, reason: "generic_careers_location_page", evidence: evidence("generic careers location page") };
  }
  if (/\/blog\/|\/news\/|\/press\/|\/resources\//i.test(url) || (/\b(blog|article|press release)\b/i.test(first) && !titleAppearsInText(job.title, first))) {
    return { invalid: true, reason: "not_a_job_page", evidence: evidence("not a job page") };
  }
  if (/#open-positions/i.test(url) || /#\s*Open Positions\b/i.test(first) || /\bwe found:\s*\*?\*?\d+\s+roles\b/i.test(first) || /\bdepartmentslocationstype\b/i.test(first)) {
    return { invalid: true, reason: "generic_careers_index", evidence: evidence("generic open positions index") };
  }
  if (!titleAppearsInText(job.title, body) && body.length > 8000 && /\b(open positions|job listings|all jobs|departments|locations)\b/i.test(first)) {
    return { invalid: true, reason: "row_detail_missing_or_listing_page", evidence: evidence("listing page without row title") };
  }
  // V6 (F-003): lower the body-size floor when title is absent. Atlassian's
  // language-switcher chrome is ~1,570 chars and lacks the role title, so the
  // 8000-char gate misses it. With the title-absent guard, smaller listing
  // pages (>1,200 chars) still route to Source Repair.
  if (!titleAppearsInText(job.title, body) && body.length > 1200 && /\b(open positions|job listings|all jobs|departments|locations|view this page in your language|all languages|language switcher)\b/i.test(first)) {
    return { invalid: true, reason: "row_detail_missing_or_listing_page", evidence: evidence("small listing page without row title") };
  }
  return { invalid: false, reason: "", evidence: "" };
}

function detectSpecificLocationRisk({ title = "", text = "", signals = {} } = {}) {
  const locationLines = String(text || "")
    .split(/\n/)
    .filter((line) => (
      /(location|remote|hybrid|on[-\s]?site|onsite|in[-\s]?office|office[-\s]?based|office required|Austin|New York|NYC|San Francisco|Bay Area|California|Seattle|Boston|Denver|Los Angeles|Chicago|Texas|London|Paris|France|Vancouver|Montreal|Calgary|Ottawa|Waterloo|Redwood City|Hawthorne|Menlo Park|Mountain View|Palo Alto)/i.test(line) &&
      (line.match(/\+\d{1,3}/g) || []).length < 4
    ))
    .join("\n");
  const body = [
    title,
    ...(signals.location_raw || []),
    ...(signals.location_match || []),
    locationLines,
  ].join("\n");
  const fakeRemote = /\b(remote control|remote sensing|remote procedure|remote desktop|remote cloud|remote storage|remote access protocol|remote hiring process|remote interview|remote interviews|remote process|remote assessment)\b/i;
  const genuineRemote = (
    /\b(fully remote|100%\s*remote|remote[-\s]?first|remote work|work remotely|remote role|remote position|remote within|remote from|remote candidates? (?:considered|eligible)|remote\s*[-,]?\s*\(?(?:us|u\.s\.|usa|united states|canada|north america|worldwide|uk|united kingdom)\)?|remote\s+(?:los angeles|san francisco|new york|seattle|austin|boston|denver|chicago)|(?:us|u\.s\.|usa|united states|washington,?\s*d\.?c\.?|canada|uk|united kingdom)\s*\(remote\)|(?:us|u\.s\.|usa|united states|canada|uk|united kingdom)[,\s-]+remote|distributed team)/i.test(body) ||
    /(?:^|\n|\||•|-)\s*(?:location\s*:?\s*)?(?:remote|(?:us|u\.s\.|usa|united states|canada|uk|united kingdom)[,\s-]+remote)(?:\s*[-,]?\s*\(?(?:us|u\.s\.|usa|united states|canada|north america|worldwide|uk|united kingdom)\)?)?\b/i.test(body)
  ) && !fakeRemote.test(body);
  if (genuineRemote) return { kind: "", evidence: "" };
  const specificLocationRe = /\b(Austin,\s*Texas|Austin|New York City|New York|NYC|San Francisco|Bay Area|London,?\s*(?:UK|United Kingdom)?|Paris|France|Texas|California|Seattle|Boston|Denver|Los Angeles|Chicago|Redwood City|Hawthorne|Menlo Park|Mountain View|Palo Alto)\b/i;
  const workModeRe = /\b(hybrid|on[-\s]?site|onsite|in[-\s]?office|office[-\s]?based|office required|work from (?:our|the) office)\b/i;
  const locationMatch = specificLocationRe.exec(body);
  if (!locationMatch) return { kind: "", evidence: "" };
  const phoneCodeAfterLocation = new RegExp(`${locationMatch[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\+\\d{1,3}`, "i");
  if (phoneCodeAfterLocation.test(body)) return { kind: "", evidence: "" };
  const start = Math.max(0, locationMatch.index - 120);
  const end = Math.min(body.length, locationMatch.index + 260);
  const evidence = body.slice(start, end).replace(/\s+/g, " ").trim();
  return {
    kind: workModeRe.test(evidence) ? "explicit_hybrid_onsite" : "specific_location",
    evidence,
  };
}

const isMain = process.argv[1] && path.basename(process.argv[1]) === "production-filter-refinement-audit.mjs";
if (isMain) {
  buildAudit(parseArgs(process.argv)).then(({ summary }) => {
    console.log(`Wrote ${summary.outputs.workbook}`);
    console.log(`Baseline unchanged: ${summary.baseline_unchanged}`);
    console.log(`Shadow hard drops: ${summary.counts.shadow_hard_drops}`);
  }).catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
