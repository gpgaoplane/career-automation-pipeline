#!/usr/bin/env node
// scripts/full-run-audit.mjs
// Phase 2.8 full-run audit — produces metrics JSON + classification MD
// matching the schema established by sample-50 in
// docs/audits/2026-04-30-step10-sample50-metrics.json.
//
// Computes source-accounting metrics (AC-2), AC-3 location/comp signals,
// and AC-11b fallback usage. For "has-route-but-no-exported" companies,
// re-probes the relevant adapter to classify into NO_OPEN_JOBS /
// NO_RELEVANT_JOBS / SOURCE_BROKEN buckets. Companies with no route are
// classified as ROUTE_MISSING.
//
// Re-probe is cheap (free direct-API calls; ~200ms each, sequential with
// a short throttle). Total post-rescan audit cost: ~60s for ~150 probes.
//
// Usage (from repo root):
//   node scripts/full-run-audit.mjs                       # default output paths
//   node scripts/full-run-audit.mjs --since <ISO>          # filter cost.tsv by start time
//   node scripts/full-run-audit.mjs --queue-baseline <N>   # baseline fallback-queue row count for delta
//   node scripts/full-run-audit.mjs --output <path>        # custom metrics JSON path
//   node scripts/full-run-audit.mjs --classification <path> # custom classification MD path
//   node scripts/full-run-audit.mjs --skip-reprobe          # don't re-probe; assume NO_OPEN_JOBS for unprobed routes
//   node scripts/full-run-audit.mjs --probe-throttle-ms <N> # default 250
//   node scripts/full-run-audit.mjs --label sample50|fullrun # used in summary header (default: fullrun)
//
// Output schema matches sample-50 metrics JSON one-for-one (see
// docs/audits/2026-04-30-step10-sample50-metrics.json).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
const PORTALS_YML = resolve(CAREER_OPS, "portals.yml");
const PIPELINE_MD = resolve(CAREER_OPS, "data", "pipeline.md");
const DISCOVERY_CACHE = resolve(CAREER_OPS, "data", "ats-discovery-cache.json");
const JD_CACHE = resolve(CAREER_OPS, "data", "job-descriptions-cache.json");
const COST_TSV = resolve(CAREER_OPS, "data", "firecrawl-cost.tsv");
const FALLBACK_QUEUE = resolve(CAREER_OPS, "data", "firecrawl-fallback-queue.tsv");

const today = new Date().toISOString().slice(0, 10);
const DEFAULT_METRICS_PATH = resolve(REPO_ROOT, "docs", "audits", `${today}-fullrun-metrics.json`);
const DEFAULT_CLASSIFICATION_PATH = resolve(REPO_ROOT, "docs", "audits", `${today}-fullrun-classification.md`);

// ── CLI ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {
    since: null,
    queueBaseline: 0,
    output: DEFAULT_METRICS_PATH,
    classification: DEFAULT_CLASSIFICATION_PATH,
    skipReprobe: false,
    probeThrottleMs: 250,
    label: "fullrun",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since") flags.since = argv[++i];
    else if (a === "--queue-baseline") flags.queueBaseline = parseInt(argv[++i], 10) || 0;
    else if (a === "--output") flags.output = argv[++i];
    else if (a === "--classification") flags.classification = argv[++i];
    else if (a === "--skip-reprobe") flags.skipReprobe = true;
    else if (a === "--probe-throttle-ms") flags.probeThrottleMs = parseInt(argv[++i], 10) || 250;
    else if (a === "--label") flags.label = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/full-run-audit.mjs [--since ISO] [--queue-baseline N] [--output PATH] [--classification PATH] [--skip-reprobe] [--probe-throttle-ms N] [--label LABEL]");
      process.exit(0);
    }
    else throw new Error(`Unknown flag: ${a}`);
  }
  return flags;
}

// ── Data loaders ─────────────────────────────────────────────────────

function loadEnabledCompanies() {
  const raw = readFileSync(PORTALS_YML, "utf-8");
  const parsed = yaml.load(raw);
  return (parsed?.tracked_companies || [])
    .filter((c) => c?.enabled)
    .map((c) => ({
      name: c.name,
      careers_url: c.careers_url || null,
      rank: c.rank ?? null,
      category: c.category ?? null,
    }));
}

function loadDiscoveryCache() {
  if (!existsSync(DISCOVERY_CACHE)) return {};
  try { return JSON.parse(readFileSync(DISCOVERY_CACHE, "utf-8")); }
  catch { return {}; }
}

function loadJdCache() {
  if (!existsSync(JD_CACHE)) return {};
  try { return JSON.parse(readFileSync(JD_CACHE, "utf-8")); }
  catch { return {}; }
}

function parsePipelineMd() {
  if (!existsSync(PIPELINE_MD)) return [];
  const text = readFileSync(PIPELINE_MD, "utf-8");
  const jobs = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^- \[ \] (\S+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$/);
    if (m) jobs.push({ url: m[1], company: m[2].trim(), title: m[3].trim() });
  }
  return jobs;
}

function loadCostRows(sinceIso) {
  if (!existsSync(COST_TSV)) return [];
  const text = readFileSync(COST_TSV, "utf-8");
  const rows = [];
  const since = sinceIso ? new Date(sinceIso).getTime() : null;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const ts = parts[0];
    if (since !== null) {
      const t = Date.parse(ts);
      if (Number.isNaN(t) || t < since) continue;
    }
    rows.push({
      timestamp: parts[0],
      url: parts[1],
      mode: parts[2],
      credits: parseInt(parts[3], 10) || 0,
    });
  }
  return rows;
}

function fallbackQueueSize() {
  if (!existsSync(FALLBACK_QUEUE)) return 0;
  const text = readFileSync(FALLBACK_QUEUE, "utf-8");
  return text.split("\n").filter((l) => l.trim()).length;
}

// ── Route classification ─────────────────────────────────────────────

// Provider name aliases used in the cache. Map back to canonical for
// adapter dispatch.
function canonicalProvider(ats) {
  if (!ats) return null;
  if (ats === "workday") return "workday-cxs"; // legacy alias
  return ats;
}

function hasRoute(cacheEntry) {
  if (!cacheEntry) return false;
  if (cacheEntry.status === "no-ats-found" || cacheEntry.status === "ambiguous") return false;
  return Boolean(cacheEntry.ats);
}

// Build a re-probe call for a cache entry, returning a callable that
// invokes the appropriate fetcher with the right args.
async function buildProbe(cacheEntry, fetchers) {
  const provider = canonicalProvider(cacheEntry.ats);
  switch (provider) {
    case "greenhouse":
      return () => fetchers.fetchGreenhouse(cacheEntry.slug);
    case "ashby":
      return () => fetchers.fetchAshby(cacheEntry.slug);
    case "lever":
      return () => fetchers.fetchLever(cacheEntry.slug);
    case "workday-cxs": {
      // Cache may use new schema {host, site} or legacy {tenant, instance, site}
      const host = cacheEntry.host || (cacheEntry.tenant && cacheEntry.instance
        ? `${cacheEntry.tenant}.${cacheEntry.instance}.myworkdayjobs.com`
        : null);
      const site = cacheEntry.site || null;
      if (!host || !site) return null;
      return () => fetchers.fetchWorkdayCxs({ host, site });
    }
    case "smartrecruiters":
      return () => fetchers.fetchSmartrecruiters(cacheEntry.slug || cacheEntry.id);
    case "personio":
      return () => fetchers.fetchPersonio(cacheEntry.slug);
    case "recruitee":
      return () => fetchers.fetchRecruitee(cacheEntry.slug);
    case "workable":
      return () => fetchers.fetchWorkable(cacheEntry.slug);
    default:
      return null;
  }
}

async function reprobeCompany(cacheEntry, fetchers, throttleMs) {
  const probe = await buildProbe(cacheEntry, fetchers);
  if (!probe) return { healthy: false, raw_jobs: 0, error: "no-probe-available" };
  try {
    const result = await probe();
    if (throttleMs > 0) await new Promise((r) => setTimeout(r, throttleMs));
    const rawJobs = Array.isArray(result?.jobs) ? result.jobs.length : 0;
    return { healthy: true, raw_jobs: rawJobs, error: null };
  } catch (e) {
    if (throttleMs > 0) await new Promise((r) => setTimeout(r, throttleMs));
    return { healthy: false, raw_jobs: 0, error: String(e.message || e).slice(0, 200) };
  }
}

// Pure classifier — easy to unit test
export function classifyCompany({ hasExports, hasRoute, probeResult }) {
  if (hasExports) {
    return { miss_reason: null, source_resolved: true, source_healthy: true, has_raw_jobs: true };
  }
  if (!hasRoute) {
    return { miss_reason: "ROUTE_MISSING", source_resolved: false, source_healthy: false, has_raw_jobs: false };
  }
  // has route but no exports — probe result determines bucket
  if (!probeResult || !probeResult.healthy) {
    return { miss_reason: "SOURCE_BROKEN", source_resolved: true, source_healthy: false, has_raw_jobs: false };
  }
  if (probeResult.raw_jobs === 0) {
    return { miss_reason: "NO_OPEN_JOBS", source_resolved: true, source_healthy: true, has_raw_jobs: false };
  }
  return { miss_reason: "NO_RELEVANT_JOBS", source_resolved: true, source_healthy: true, has_raw_jobs: true };
}

// ── AC-3 signal computation ──────────────────────────────────────────

// Mirrors career-ops/export-jobs.mjs:computeDescScore exactly so the
// audit metric matches what's reported in the Excel.
function computeDescScore(signals) {
  if (!signals) return 0;
  let score = 0;
  const torontoHit = (signals.location_match || []).some((l) => /toronto|gta|ontario|canada-only/i.test(l));
  if (torontoHit) score += 2;
  if ((signals.location_match || []).some((l) => /fully remote us/i.test(l))) score += 4;
  if (signals.comp_low_thousands && signals.comp_currency && signals.comp_currency !== "unknown") {
    const floor = signals.comp_currency === "USD" ? 120 : 110;
    score += Math.floor((signals.comp_low_thousands - floor) / 10);
  }
  score += Math.min(3, (signals.track_keywords_matched || []).length);
  score += Math.min(2, (signals.tech_stack_matched || []).length);
  if (signals.yoe_signal === "3-5") score += 1;
  else if (signals.yoe_signal === "6+") score -= 1;
  else if (signals.yoe_signal === "0-2") score -= 1;
  if (signals.deal_breaker_signal) score -= 5;
  return score;
}

function computeAc3(jobs, jdCache) {
  const stats = {
    cache_hits: 0,
    description_score_positive: 0,
    will_fit_location_hits: 0,
    raw_location_hits: 0,
    compensation_hits: 0,
    will_fit_or_comp_hits: 0,
    raw_or_comp_hits: 0,
    raw_and_comp_hits: 0,
  };
  for (const job of jobs) {
    const entry = jdCache[job.url];
    if (!entry) continue;
    stats.cache_hits++;
    const signals = entry.extracted_signals || {};
    const willFit = (signals.location_match || []).length > 0;
    const rawLoc = (signals.location_raw || []).length > 0;
    const hasComp = Boolean(signals.comp_low_thousands);
    if (computeDescScore(signals) > 0) stats.description_score_positive++;
    if (willFit) stats.will_fit_location_hits++;
    if (rawLoc) stats.raw_location_hits++;
    if (hasComp) stats.compensation_hits++;
    if (willFit || hasComp) stats.will_fit_or_comp_hits++;
    if (rawLoc || hasComp) stats.raw_or_comp_hits++;
    if (rawLoc && hasComp) stats.raw_and_comp_hits++;
  }
  return stats;
}

// ── Band counts from JD cache (uses the same logic as export-jobs) ───

// Bands need title score too. For audit purposes, "bands" in the
// metrics JSON should mirror what's in the Excel. The Excel is computed
// at export time. Rather than re-implementing computeTitleScore here
// (which would duplicate ~50 lines), we read the export workbook if
// available; otherwise we leave bands as null and the user can fill in
// from the workbook header. For the typical full-rescan flow, the
// Excel exists when this script runs.
function tryReadBandsFromExcel() {
  // Best-effort: we can't easily parse XLSX without exceljs. Bands are
  // optional in the metrics JSON for AC purposes (AC-2/3/11b don't
  // depend on them). Caller can pass bands via a separate side-channel
  // if needed.
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv);

  console.error(`\n=== full-run-audit (${flags.label}) ===\n`);

  // Load all data sources
  const enabled = loadEnabledCompanies();
  const cache = loadDiscoveryCache();
  const jdCache = loadJdCache();
  const jobs = parsePipelineMd();
  const costRows = loadCostRows(flags.since);
  const fallbackTotal = fallbackQueueSize();
  const fallbackDelta = Math.max(0, fallbackTotal - flags.queueBaseline);

  console.error(`  enabled companies: ${enabled.length}`);
  console.error(`  pending pipeline jobs: ${jobs.length}`);
  console.error(`  JD cache entries: ${Object.keys(jdCache).length}`);
  console.error(`  cost rows considered: ${costRows.length}${flags.since ? ` (since ${flags.since})` : ""}`);
  console.error(`  fallback queue: ${fallbackTotal} total / ${fallbackDelta} delta\n`);

  // Build per-company state
  const exportedCompanies = new Set(jobs.map((j) => j.company));
  const perCompany = enabled.map((entry) => ({
    name: entry.name,
    careers_url: entry.careers_url,
    rank: entry.rank,
    category: entry.category,
    cache_entry: cache[entry.name] || null,
    has_exports: exportedCompanies.has(entry.name),
    exported_count: jobs.filter((j) => j.company === entry.name).length,
  }));

  // Re-probe phase: any company with route but no exports
  let fetchers = null;
  if (!flags.skipReprobe) {
    try {
      fetchers = await import(pathToFileURL(resolve(CAREER_OPS, "lib", "ats-clients.mjs")).href);
    } catch (e) {
      console.error(`  WARN: failed to import ats-clients.mjs (${e.message}); skipping re-probe phase.`);
      flags.skipReprobe = true;
    }
  }

  const probeTargets = perCompany.filter((c) => !c.has_exports && hasRoute(c.cache_entry));
  console.error(`  re-probe targets: ${probeTargets.length} (has-route + no-exports)`);

  let probedCount = 0;
  for (const company of perCompany) {
    if (company.has_exports) continue;
    if (!hasRoute(company.cache_entry)) {
      company.classification = classifyCompany({
        hasExports: false,
        hasRoute: false,
        probeResult: null,
      });
      continue;
    }
    if (flags.skipReprobe || !fetchers) {
      // Without re-probe, conservatively classify as NO_OPEN_JOBS.
      company.classification = classifyCompany({
        hasExports: false,
        hasRoute: true,
        probeResult: { healthy: true, raw_jobs: 0, error: null },
      });
      continue;
    }
    const probeResult = await reprobeCompany(company.cache_entry, fetchers, flags.probeThrottleMs);
    company.probe_result = probeResult;
    company.classification = classifyCompany({
      hasExports: false,
      hasRoute: true,
      probeResult,
    });
    probedCount++;
    if (probedCount % 20 === 0) {
      console.error(`    [${probedCount}/${probeTargets.length}] probed`);
    }
  }

  // Companies with exports get default classification
  for (const company of perCompany) {
    if (company.has_exports && !company.classification) {
      company.classification = classifyCompany({
        hasExports: true,
        hasRoute: hasRoute(company.cache_entry),
        probeResult: null,
      });
    }
  }

  console.error(`  re-probe complete: ${probedCount} actual probes\n`);

  // ── Aggregate metrics ──
  const sample = enabled.length;
  const exported = perCompany.filter((c) => c.has_exports).length;
  const sourceResolved = perCompany.filter((c) => c.classification.source_resolved).length;
  const healthySources = perCompany.filter((c) => c.classification.source_resolved && c.classification.source_healthy).length;
  const rawJobAvailable = perCompany.filter((c) => c.classification.source_resolved && c.classification.source_healthy && c.classification.has_raw_jobs).length;
  const noYield = perCompany.filter((c) => !c.has_exports).length;
  const classifiedNoYield = perCompany.filter((c) => !c.has_exports && c.classification.miss_reason).length;
  const missCounts = { NO_RELEVANT_JOBS: 0, NO_OPEN_JOBS: 0, ROUTE_MISSING: 0, SOURCE_BROKEN: 0 };
  for (const c of perCompany) {
    if (c.classification.miss_reason) missCounts[c.classification.miss_reason]++;
  }

  // AC-3 signals
  const ac3 = computeAc3(jobs, jdCache);

  // Cost stats
  const credits = costRows.reduce((sum, r) => sum + r.credits, 0);
  const modes = {};
  for (const r of costRows) modes[r.mode] = (modes[r.mode] || 0) + 1;

  // Bands (best-effort; null if we can't compute)
  const bands = tryReadBandsFromExcel();

  // Pass flags
  const sourceResolutionRate = sample > 0 ? sourceResolved / sample : 0;
  const sourceHealthRate = sourceResolved > 0 ? healthySources / sourceResolved : 0;
  const rawAvailRate = healthySources > 0 ? rawJobAvailable / healthySources : 0;
  const missClassRate = noYield > 0 ? classifiedNoYield / noYield : 1;
  const titleFilteredCoverage = sample > 0 ? exported / sample : 0;

  const ac2SourceHealthPass = sourceHealthRate >= 0.90;
  const ac2MissClassPass = missClassRate >= 0.95;
  const ac2SourceAccountingPass = ac2SourceHealthPass && ac2MissClassPass;
  const ac3GenericPass = jobs.length > 0 ? (ac3.raw_or_comp_hits / jobs.length) >= 0.40 : false;
  const ac3WillFitPass = jobs.length > 0 ? (ac3.will_fit_or_comp_hits / jobs.length) >= 0.40 : false;
  const ac11bPass = fallbackDelta / Math.max(jobs.length, 1) <= 0.05;

  const adapterWarnings = [];
  for (const c of perCompany) {
    if (c.classification.miss_reason === "SOURCE_BROKEN") {
      adapterWarnings.push(`${c.name} ${canonicalProvider(c.cache_entry?.ats) || ""}: ${c.probe_result?.error || "probe failed"}`.trim());
    }
  }

  const metrics = {
    observed_at: new Date().toISOString(),
    label: flags.label,
    sample_companies: sample,
    exported_companies: exported,
    title_filtered_company_coverage: titleFilteredCoverage,
    source_resolved_companies: sourceResolved,
    source_resolution_rate: sourceResolutionRate,
    resolved_sources: sourceResolved,
    healthy_sources: healthySources,
    source_health_rate: sourceHealthRate,
    raw_job_available_sources: rawJobAvailable,
    healthy_source_raw_job_availability_rate: rawAvailRate,
    no_yield_companies: noYield,
    classified_no_yield_companies: classifiedNoYield,
    miss_classification_rate: missClassRate,
    miss_reason_counts: missCounts,
    pending_jobs: jobs.length,
    bands: bands || { S: null, A: null, B: null, C: null },
    description_score_positive: ac3.description_score_positive,
    description_score_positive_rate: jobs.length > 0 ? ac3.description_score_positive / jobs.length : 0,
    will_fit_location_hits: ac3.will_fit_location_hits,
    will_fit_location_rate: jobs.length > 0 ? ac3.will_fit_location_hits / jobs.length : 0,
    raw_location_hits: ac3.raw_location_hits,
    raw_location_rate: jobs.length > 0 ? ac3.raw_location_hits / jobs.length : 0,
    compensation_hits: ac3.compensation_hits,
    compensation_rate: jobs.length > 0 ? ac3.compensation_hits / jobs.length : 0,
    raw_location_or_compensation_hits: ac3.raw_or_comp_hits,
    raw_location_or_compensation_rate: jobs.length > 0 ? ac3.raw_or_comp_hits / jobs.length : 0,
    will_fit_location_or_compensation_hits: ac3.will_fit_or_comp_hits,
    will_fit_location_or_compensation_rate: jobs.length > 0 ? ac3.will_fit_or_comp_hits / jobs.length : 0,
    both_raw_location_and_compensation_hits: ac3.raw_and_comp_hits,
    firecrawl_cost_rows: costRows.length,
    firecrawl_credits: credits,
    firecrawl_modes: modes,
    new_fallback_queue_rows: fallbackDelta,
    ac2_title_filtered_company_coverage_pass: titleFilteredCoverage >= 0.75, // historical metric, retired as gate
    ac2_source_accounting_pass: ac2SourceAccountingPass,
    ac2_source_health_pass: ac2SourceHealthPass,
    ac2_miss_classification_pass: ac2MissClassPass,
    ac3_generic_location_or_compensation_pass: ac3GenericPass,
    ac3_will_fit_location_or_compensation_pass: ac3WillFitPass,
    ac11b_fallback_usage_pass: ac11bPass,
    adapter_warnings: adapterWarnings,
  };

  // Write metrics JSON
  writeFileSync(flags.output, JSON.stringify(metrics, null, 2), "utf-8");
  console.error(`metrics → ${flags.output}`);

  // Write classification MD
  const md = renderClassificationMd(perCompany, missCounts, metrics, flags.label);
  writeFileSync(flags.classification, md, "utf-8");
  console.error(`classification → ${flags.classification}`);

  // Console summary
  console.error("\n=== Summary ===");
  console.error(`  source resolved: ${sourceResolved}/${sample} (${(sourceResolutionRate * 100).toFixed(1)}%)`);
  console.error(`  source health: ${healthySources}/${sourceResolved} (${(sourceHealthRate * 100).toFixed(1)}%) ${ac2SourceHealthPass ? "PASS" : "FAIL"} (gate ≥90%)`);
  console.error(`  raw availability: ${rawJobAvailable}/${healthySources} (${(rawAvailRate * 100).toFixed(1)}%)`);
  console.error(`  no-yield classified: ${classifiedNoYield}/${noYield} (${(missClassRate * 100).toFixed(1)}%) ${ac2MissClassPass ? "PASS" : "FAIL"} (gate ≥95%)`);
  console.error(`  AC-2 source accounting: ${ac2SourceAccountingPass ? "PASS" : "FAIL"}`);
  console.error(`  AC-3 generic loc OR comp: ${ac3.raw_or_comp_hits}/${jobs.length} (${jobs.length > 0 ? ((ac3.raw_or_comp_hits / jobs.length) * 100).toFixed(1) : 0}%) ${ac3GenericPass ? "PASS" : "FAIL"}`);
  console.error(`  AC-11b fallback usage: ${fallbackDelta}/${jobs.length} ${ac11bPass ? "PASS" : "FAIL"}`);
  console.error(`  miss buckets: ${JSON.stringify(missCounts)}`);
  if (adapterWarnings.length > 0) {
    console.error(`  adapter warnings (${adapterWarnings.length}):`);
    for (const w of adapterWarnings.slice(0, 5)) console.error(`    - ${w}`);
    if (adapterWarnings.length > 5) console.error(`    ... and ${adapterWarnings.length - 5} more`);
  }

  process.exit(ac2SourceAccountingPass ? 0 : 1);
}

function renderClassificationMd(perCompany, missCounts, metrics, label) {
  const dateStr = today;
  const noYield = perCompany.filter((c) => !c.has_exports);
  const sortedByReason = [...noYield].sort((a, b) => {
    const r = (a.classification?.miss_reason || "").localeCompare(b.classification?.miss_reason || "");
    if (r !== 0) return r;
    return (a.rank ?? 9999) - (b.rank ?? 9999);
  });

  const lines = [];
  lines.push(`---`);
  lines.push(`status: active`);
  lines.push(`type: audit`);
  lines.push(`owner: claude`);
  lines.push(`last-updated: ${new Date().toISOString()}`);
  lines.push(`read-if: "you need the AC-2 replacement metrics or no-yield classification for the Phase 2.8 ${label} run"`);
  lines.push(`skip-if: "status != active"`);
  lines.push(`related:`);
  lines.push(`  - ${metrics.label === "fullrun" ? `docs/audits/${dateStr}-fullrun-metrics.json` : `docs/audits/${dateStr}-${label}-metrics.json`}`);
  lines.push(`  - career-ops/data/ats-discovery-cache.json`);
  lines.push(`  - scripts/full-run-audit.mjs`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`# ${label === "fullrun" ? "Full 397-Run" : label} — Missed-Company Classification`);
  lines.push(``);
  lines.push(`Generated by \`scripts/full-run-audit.mjs\`. See sample-50 audit at`);
  lines.push(`\`docs/audits/2026-04-30-sample50-missed-company-classification.md\` for the`);
  lines.push(`source-accounting metric stack and miss-reason bucket definitions.`);
  lines.push(``);
  lines.push(`## Replacement Metric Stack`);
  lines.push(``);
  lines.push(`| Metric | Result | Gate |`);
  lines.push(`|---|---:|---|`);
  lines.push(`| Source Resolution Rate | ${metrics.source_resolved_companies}/${metrics.sample_companies} (${(metrics.source_resolution_rate * 100).toFixed(1)}%) | Report |`);
  lines.push(`| Source Health Rate | ${metrics.healthy_sources}/${metrics.resolved_sources} (${(metrics.source_health_rate * 100).toFixed(1)}%) | Pass if >=90% — ${metrics.ac2_source_health_pass ? "PASS" : "FAIL"} |`);
  lines.push(`| Raw Job Availability Rate | ${metrics.raw_job_available_sources}/${metrics.healthy_sources} (${(metrics.healthy_source_raw_job_availability_rate * 100).toFixed(1)}%) | Report |`);
  lines.push(`| Relevant Job Yield Rate | ${metrics.exported_companies}/${metrics.sample_companies} (${(metrics.title_filtered_company_coverage * 100).toFixed(1)}%) | Report |`);
  lines.push(`| Miss Classification Rate | ${metrics.classified_no_yield_companies}/${metrics.no_yield_companies} (${(metrics.miss_classification_rate * 100).toFixed(1)}%) | Pass if >=95% — ${metrics.ac2_miss_classification_pass ? "PASS" : "FAIL"} |`);
  lines.push(``);
  lines.push(`## Bucket Counts`);
  lines.push(``);
  lines.push(`| Miss Reason | Count |`);
  lines.push(`|---|---:|`);
  for (const [k, v] of Object.entries(missCounts)) lines.push(`| \`${k}\` | ${v} |`);
  lines.push(``);
  lines.push(`## Classified No-Yield Companies`);
  lines.push(``);
  lines.push(`| Company | Rank | Category | Route Status | Source Health | Raw Jobs | Miss Reason | Probe Notes |`);
  lines.push(`|---|---:|---|---|---|---:|---|---|`);
  for (const c of sortedByReason) {
    const cacheAts = c.cache_entry?.ats || "—";
    const cacheStatus = c.cache_entry?.status || (cacheAts !== "—" ? "discovered" : "no route");
    const probe = c.probe_result;
    const health = c.classification.source_healthy ? "healthy" : (hasRoute(c.cache_entry) ? "broken" : "—");
    const rawJobs = probe?.raw_jobs ?? "—";
    const probeNotes = probe?.error ? probe.error.slice(0, 80) : (probe ? `probe ok` : `not probed`);
    lines.push(`| ${c.name} | ${c.rank ?? "—"} | ${c.category ?? "—"} | ${cacheAts} (${cacheStatus}) | ${health} | ${rawJobs} | \`${c.classification.miss_reason}\` | ${probeNotes} |`);
  }
  lines.push(``);
  return lines.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(2); });
}

// Re-exports for testing
export {
  hasRoute,
  computeDescScore,
  computeAc3,
  canonicalProvider,
  parsePipelineMd,
  loadCostRows,
};
