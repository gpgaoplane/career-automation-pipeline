// scripts/ats-adapters/_lib.mjs
// Shared helpers for sibling ATS adapter scripts (Phase 2.8 Step 3).
//
// Per QI-1 RESOLVED: adapters live at repo-root scripts/ats-adapters/.
// They import fetchers from career-ops/lib/ats-clients.mjs and write to
// career-ops/data/{pipeline.md,scan-history.tsv} in the same format scan.mjs
// uses, preserving D-3 invariant (scan.mjs untouched).

import { readFileSync, appendFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..", "..");
export const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
export const PORTALS_YML = resolve(CAREER_OPS, "portals.yml");
export const PIPELINE_MD = resolve(CAREER_OPS, "data", "pipeline.md");
export const SCAN_HISTORY = resolve(CAREER_OPS, "data", "scan-history.tsv");
export const ATS_DISCOVERY_CACHE = resolve(CAREER_OPS, "data", "ats-discovery-cache.json");

// URL patterns for detecting which provider a portals.yml entry belongs to.
// Same 8-provider matrix as design v2 §4.1.1.
export const PROVIDER_PATTERNS = {
  greenhouse: /(?:boards|job-boards|boards-api)\.greenhouse\.io\/([^/?#]+)/i,
  ashby: /jobs\.ashbyhq\.com\/([^/?#]+)/i,
  lever: /jobs\.lever\.co\/([^/?#]+)/i,
  // Workday: match `{tenant}.wd{N}.myworkdayjobs.com/{site}` anywhere in URL.
  // Captures: [1]=tenant, [2]=instance digits, [3]=site
  "workday-cxs": /([\w-]+)\.wd(\d+)\.myworkdayjobs\.com\/([\w-]+)/i,
  smartrecruiters: /(?:careers|jobs)\.smartrecruiters\.com\/([^/?#]+)/i,
  personio: /([\w-]+)\.jobs\.personio\.(?:de|com)/i,
  recruitee: /([\w-]+)\.recruitee\.com/i,
  workable: /apply\.workable\.com\/([^/?#]+)/i,
};

export function loadPortals() {
  const text = readFileSync(PORTALS_YML, "utf-8");
  return yaml.load(text);
}

export function loadDiscoveryCache() {
  if (!existsSync(ATS_DISCOVERY_CACHE)) return {};
  try {
    return JSON.parse(readFileSync(ATS_DISCOVERY_CACHE, "utf-8"));
  } catch (e) {
    console.warn(`[ats-adapter] discovery cache parse error: ${e.message}; using empty`);
    return {};
  }
}

// Build a Set of URL strings already in scan-history.tsv. Used for dedup.
export function loadSeenUrls() {
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

// Title-filter from portals.yml. Returns predicate `(title) => boolean`.
// Logic: at least 1 positive substring (case-insensitive) must match AND
// 0 negatives match. Mirrors scan.mjs convention without reading scan.mjs.
export function buildTitleFilter(portals) {
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

// Detect which provider an entry belongs to by URL pattern. Returns
// {provider, slug} or null. The first matching provider in PROVIDER_PATTERNS
// wins.
export function detectProvider(url) {
  if (!url) return null;
  for (const [provider, pat] of Object.entries(PROVIDER_PATTERNS)) {
    const m = url.match(pat);
    if (m) {
      if (provider === "workday-cxs") {
        // Workday needs {host, site} from regex match groups
        // m[1]=tenant, m[2]=instance digit, m[3]=site
        const tenant = m[1];
        const instance = m[2];
        const site = m[3];
        return {
          provider,
          host: `${tenant}.wd${instance}.myworkdayjobs.com`,
          site,
        };
      }
      return { provider, slug: m[1] };
    }
  }
  return null;
}

// Iterator over portals.yml + cache entries that match a given provider.
// Yields { companyName, fetchArgs } where fetchArgs is the kwarg shape for
// the provider's fetcher in lib/ats-clients.mjs.
export function* iterTargets(portals, cache, providerName) {
  const tracked = portals?.tracked_companies || [];

  // From portals.yml — direct-ATS URLs
  for (const entry of tracked) {
    if (!entry?.enabled || !entry?.careers_url) continue;
    const det = detectProvider(entry.careers_url);
    if (!det || det.provider !== providerName) continue;
    yield {
      companyName: entry.name,
      fetchArgs: providerName === "workday-cxs"
        ? { host: det.host, site: det.site }
        : det.slug,
      source: "portals.yml",
    };
  }

  // From discovery cache
  for (const [companyName, info] of Object.entries(cache || {})) {
    if (!info || info.ats !== providerName) continue;
    if (info.status === "no-ats-found" || info.status === "ambiguous") continue;
    if (providerName === "workday-cxs") {
      yield {
        companyName,
        fetchArgs: { host: info.host, site: info.site || "External" },
        source: "discovery-cache",
      };
    } else if (info.slug) {
      yield {
        companyName,
        fetchArgs: info.slug,
        source: "discovery-cache",
      };
    }
  }
}

function ensureFile(path, header = "") {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) writeFileSync(path, header, "utf-8");
}

// Append to pipeline.md in scan.mjs's format:
//   - [ ] {url} | {company} | {title}
export function appendPipelineRow({ url, company, title }) {
  ensureFile(PIPELINE_MD, "# Job Pipeline — Pending Evaluation\n\n## Pendientes\n\n");
  appendFileSync(PIPELINE_MD, `- [ ] ${url} | ${company} | ${title}\n`, "utf-8");
}

// Append to scan-history.tsv in scan.mjs's format:
//   url\tfirst_seen\tportal\ttitle\tcompany\tstatus
export function appendHistoryRow({ url, company, title, portal }) {
  ensureFile(SCAN_HISTORY, "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n");
  const today = new Date().toISOString().slice(0, 10);
  appendFileSync(
    SCAN_HISTORY,
    [url, today, `${portal}-api`, title, company, "added"].join("\t") + "\n",
    "utf-8"
  );
}

/**
 * Generic adapter runner. Each sibling adapter calls this with its provider
 * name + fetcher. Returns {provider, attempted, added, errors}.
 *
 * Layer 3 fallback wiring: caller-side errors append to firecrawl-fallback-queue.tsv
 * via lib/firecrawl.mjs's appendFallbackQueue (when used through firecrawl-discover).
 * For direct-API failures here, we just log + record in errors[]; the orchestrator
 * decides whether to escalate.
 *
 * @param {object} args
 * @param {string} args.providerName — key into PROVIDER_PATTERNS (e.g. "workday-cxs")
 * @param {Function} args.fetcher — e.g. fetchWorkdayCxs from lib/ats-clients.mjs
 * @param {boolean} [args.dryRun=false]
 * @returns {Promise<{provider, attempted, added, errors}>}
 */
export async function runAdapter({ providerName, fetcher, dryRun = false }) {
  const portals = loadPortals();
  const cache = loadDiscoveryCache();
  const seen = loadSeenUrls();
  const titleFilter = buildTitleFilter(portals);

  const targets = [...iterTargets(portals, cache, providerName)];
  console.error(`[${providerName}] ${targets.length} target(s) found (portals.yml + cache)`);

  let added = 0;
  const errors = [];

  for (const target of targets) {
    try {
      const result = typeof target.fetchArgs === "object"
        ? await fetcher(target.fetchArgs)
        : await fetcher(target.fetchArgs);
      const matched = result.jobs.filter((j) => titleFilter(j.title) && j.url);
      let newCount = 0;
      for (const job of matched) {
        if (seen.has(job.url)) continue;
        seen.add(job.url);
        if (!dryRun) {
          appendPipelineRow({ url: job.url, company: target.companyName, title: job.title });
          appendHistoryRow({
            url: job.url,
            company: target.companyName,
            title: job.title,
            portal: providerName,
          });
        }
        newCount++;
      }
      added += newCount;
      console.error(
        `  ${target.companyName} (${target.source}): ${newCount}/${result.jobs.length} jobs ` +
        `added (after title filter + dedup)`
      );
    } catch (e) {
      errors.push({ company: target.companyName, error: e.message?.slice(0, 200) });
      console.error(`  ${target.companyName} (${target.source}): ERROR ${e.message?.slice(0, 100)}`);
    }
  }

  console.error(
    `[${providerName}] DONE — attempted=${targets.length}, added=${added}, errors=${errors.length}` +
    (dryRun ? " (DRY RUN)" : "")
  );
  return { provider: providerName, attempted: targets.length, added, errors };
}

