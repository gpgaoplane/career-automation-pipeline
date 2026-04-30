// career-ops/firecrawl-extract.mjs
// Phase 2.8 Step 6 — Layer 2 structured listing extraction.
//
// Per implementation plan v2 §6.6 + design v2 §4.1.
//
// For each cache entry with status:"no-ats-found" (companies whose careers
// pages are genuinely custom — Layer 1 found no ATS markers):
//   1. Firecrawl /v1/scrape with formats:["json"] + jsonOptions:{schema, prompt}
//      using JOB_LISTING_SCHEMA_V1 (5 credits/page per Q1+Q4)
//   2. Parse extracted {jobs: [{title, location, url, department}]}
//   3. Filter via title_filter from portals.yml
//   4. Dedup against scan-history.tsv
//   5. Append to pipeline.md + scan-history.tsv
//
// Layer 3 fallback wiring: hard-stop conditions append to fallback queue
// via lib/firecrawl.mjs (AC-11a).
//
// Run from career-ops/:
//   node firecrawl-extract.mjs [--dry-run] [--max-credits N] [--limit N]
//                              [--company "Name"]

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import yaml from "js-yaml";
import {
  scrapeJson,
  setMaxCredits,
  getCreditsSpent,
  CreditCapExhaustedError,
  FirecrawlError,
  MAX_CREDITS_DEFAULT,
  JOB_LISTING_SCHEMA_V1,
} from "./lib/firecrawl.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTALS_YML = resolve(__dirname, "portals.yml");
const DATA_DIR = resolve(__dirname, "data");
const CACHE_PATH = resolve(DATA_DIR, "ats-discovery-cache.json");
const PIPELINE_MD = resolve(DATA_DIR, "pipeline.md");
const SCAN_HISTORY = resolve(DATA_DIR, "scan-history.tsv");

const COURTESY_DELAY_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXTRACT_PROMPT =
  "Extract all job postings from this careers page. Each job should have title, " +
  "location, and url (full absolute URL to the job posting). Department/team if present. " +
  "Skip generic 'Apply Now' buttons that don't have a specific role title.";

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function loadSeenUrls() {
  if (!existsSync(SCAN_HISTORY)) return new Set();
  const text = readFileSync(SCAN_HISTORY, "utf-8");
  const set = new Set();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("url\t")) continue;
    const url = line.split("\t")[0];
    if (url) set.add(url);
  }
  return set;
}

function buildTitleFilter(portals) {
  const tf = portals?.title_filter || {};
  const positives = (tf.positive || []).map((s) => s.toLowerCase());
  const negatives = (tf.negative || []).map((s) => s.toLowerCase());
  return (title) => {
    if (!title) return false;
    const t = title.toLowerCase();
    if (negatives.some((n) => t.includes(n))) return false;
    return positives.some((p) => t.includes(p));
  };
}

function ensureFile(path, header = "") {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) writeFileSync(path, header, "utf-8");
}

function appendPipelineRow({ url, company, title }) {
  ensureFile(PIPELINE_MD, "# Job Pipeline — Pending Evaluation\n\n## Pendientes\n\n");
  appendFileSync(PIPELINE_MD, `- [ ] ${url} | ${company} | ${title}\n`, "utf-8");
}

function appendHistoryRow({ url, company, title }) {
  ensureFile(SCAN_HISTORY, "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n");
  const today = new Date().toISOString().slice(0, 10);
  appendFileSync(
    SCAN_HISTORY,
    [url, today, "firecrawl-extract-api", title, company, "added"].join("\t") + "\n",
    "utf-8"
  );
}

async function extractCompany(companyName, sourceUrl, opts) {
  try {
    const result = await scrapeJson(sourceUrl, JOB_LISTING_SCHEMA_V1, EXTRACT_PROMPT, {
      layer: "2",
      company: companyName,
    });
    const jobs = result.json?.jobs || [];
    return { ok: true, jobs, sourceUrl };
  } catch (e) {
    if (e instanceof CreditCapExhaustedError) throw e;
    return { ok: false, error: e.message?.slice(0, 200), sourceUrl };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const maxCreditsIdx = args.indexOf("--max-credits");
  const maxCredits = maxCreditsIdx >= 0 ? Number(args[maxCreditsIdx + 1]) : MAX_CREDITS_DEFAULT;
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
  const companyIdx = args.indexOf("--company");
  const companyFilter = companyIdx >= 0 ? args[companyIdx + 1] : null;

  setMaxCredits(maxCredits);

  const portals = yaml.load(readFileSync(PORTALS_YML, "utf-8"));
  const cache = loadCache();
  const seen = loadSeenUrls();
  const titleFilter = buildTitleFilter(portals);

  // Collect targets: cache entries with status:"no-ats-found"
  let targets = Object.entries(cache)
    .filter(([_, info]) => info?.status === "no-ats-found" && info?.source_url)
    .map(([name, info]) => ({ name, url: info.source_url }));

  if (companyFilter) {
    targets = targets.filter((t) => t.name === companyFilter);
  }
  targets = targets.slice(0, limit);

  console.error(
    `[firecrawl-extract] ${targets.length} no-ats-found target(s) ` +
    `(max-credits=${maxCredits}, dry-run=${dryRun})`
  );

  let totalAdded = 0;
  const errors = [];

  for (const target of targets) {
    try {
      const r = await extractCompany(target.name, target.url, { dryRun });
      if (!r.ok) {
        errors.push({ company: target.name, error: r.error });
        console.error(`  ${target.name}: ERROR ${r.error?.slice(0, 80)}`);
        continue;
      }
      const matched = r.jobs.filter((j) => titleFilter(j.title) && j.url);
      let newCount = 0;
      for (const job of matched) {
        if (seen.has(job.url)) continue;
        seen.add(job.url);
        if (!dryRun) {
          appendPipelineRow({ url: job.url, company: target.name, title: job.title });
          appendHistoryRow({ url: job.url, company: target.name, title: job.title });
        }
        newCount++;
      }
      totalAdded += newCount;
      console.error(
        `  ${target.name}: ${newCount}/${r.jobs.length} jobs added ` +
        `(after title filter + dedup)`
      );
    } catch (e) {
      if (e instanceof CreditCapExhaustedError) {
        console.error(`[firecrawl-extract] CREDIT CAP EXHAUSTED at ${target.name}; remaining queued to fallback`);
        break;
      }
      errors.push({ company: target.name, error: e.message?.slice(0, 200) });
      console.error(`  ${target.name}: ERROR ${e.message?.slice(0, 80)}`);
    }
    await sleep(COURTESY_DELAY_MS);
  }

  console.error(`\n=== firecrawl-extract summary ===`);
  console.error(`  attempted              ${String(targets.length).padStart(4)}`);
  console.error(`  added                  ${String(totalAdded).padStart(4)}`);
  console.error(`  errors                 ${String(errors.length).padStart(4)}`);
  console.error(`  credits_spent          ${String(getCreditsSpent()).padStart(4)}`);

  process.exit(errors.length > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(2); });
}

export { extractCompany, EXTRACT_PROMPT };
