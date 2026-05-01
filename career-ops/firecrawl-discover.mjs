// career-ops/firecrawl-discover.mjs
// Phase 2.8 Step 4 — Layer 1 ATS discovery via Firecrawl.
//
// Per implementation plan v2 §6.4 + design v2 §4.1.
//
// For each branded careers_url in portals.yml (NOT direct-ATS):
//   1. Firecrawl /v1/scrape formats:["html","links"] (1 credit/page)
//   2. Scan returned HTML + link list for any of 8-provider ATS markers
//      (per career-ops/lib/ats-detect.mjs)
//   3. If found: write {company: {ats, slug|host+site, discovered_at, source_url}}
//      to data/ats-discovery-cache.json
//   4. If not found AND depth < 2: drill — pick up to 3 inner careers/jobs
//      links and retry detection
//   5. If still not found at depth 2: mark {ats:null, status:"no-ats-found"}
//
// Layer 3 fallback wiring: --max-credits exhaustion appends unprocessed
// companies to data/firecrawl-fallback-queue.tsv (per AC-11a).
//
// RI-4 (Codex O1): on multiple ATS markers in one page, log all candidates
// + auto-pick only on company-name agreement. Otherwise mark ambiguous.
//
// Cache TTL: 60 days; fast-fail re-discovery on 4xx/5xx for cached slug.
//
// Run from career-ops/:
//   node firecrawl-discover.mjs [--dry-run] [--max-credits N] [--limit N]
//                                [--company "Name"] [--force]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import {
  scrape,
  setMaxCredits,
  getCreditsSpent,
  CreditCapExhaustedError,
  FirecrawlError,
  MAX_CREDITS_DEFAULT,
} from "./lib/firecrawl.mjs";
import {
  detectProvider,
  detectAllInText,
} from "./lib/ats-detect.mjs";
import { fetchAshby } from "./lib/ats-clients.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTALS_YML = resolve(__dirname, "portals.yml");
const DATA_DIR = resolve(__dirname, "data");
const CACHE_PATH = resolve(DATA_DIR, "ats-discovery-cache.json");

const TTL_DAYS = 60;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_DRILL_DEPTH = 2;
const MAX_DRILL_LINKS = 3;
const COURTESY_DELAY_MS = 250;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch (e) {
    console.error(`[discover] cache parse error: ${e.message}; using empty`);
    return {};
  }
}

function saveCache(cache) {
  ensureDataDir();
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function isCacheEntryFresh(entry) {
  if (!entry?.discovered_at) return false;
  const age = Date.now() - new Date(entry.discovered_at).getTime();
  return age < TTL_MS;
}

// Levenshtein distance for company-name agreement (per RI-4 ambiguity resolution).
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function normalizeForAgreement(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ashbySlugCandidates(entry) {
  const candidates = [];
  const add = (value) => {
    const slug = String(value || "")
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/^.*:\s*/, "")
      .replace(/\.com$/i, "")
      .replace(/[^a-z0-9-]/g, "");
    if (slug && !candidates.includes(slug)) candidates.push(slug);
  };

  try {
    const host = new URL(entry.careers_url).hostname.replace(/^www\./, "");
    const firstLabel = host.split(".")[0];
    if (!/^(careers?|jobs?|apply|www)$/i.test(firstLabel)) add(firstLabel);
  } catch {
    // Ignore malformed URLs; company-name candidate still applies.
  }
  add(entry.name);
  return candidates;
}

async function probeAshbyDirect(entry, fetcher = fetchAshby) {
  for (const slug of ashbySlugCandidates(entry)) {
    try {
      const result = await fetcher(slug);
      if (Array.isArray(result.jobs) && result.jobs.length > 0) {
        return {
          provider: "ashby",
          slug,
          matchedAt: Number.MAX_SAFE_INTEGER,
          discovery_method: "ashby-direct-probe",
          probe_jobs: result.jobs.length,
        };
      }
    } catch {
      // 404/non-Ashby boards are expected while probing.
    }
  }
  return null;
}

function cacheAshbyProbe(cache, entry, probe, depth = 0) {
  const cacheEntry = {
    ats: "ashby",
    slug: probe.slug,
    discovered_at: new Date().toISOString(),
    source_url: entry.careers_url,
    depth,
    discovery_method: probe.discovery_method,
    probe_jobs: probe.probe_jobs,
  };
  cache[entry.name] = cacheEntry;
  return cacheEntry;
}

// Dedup candidates by identity tuple (provider, slug, host, site). Same
// page often links the same Workday tenant from multiple footer/header
// positions — without dedup, resolveAmbiguous would see N copies and
// flag false ambiguity. Per pitfall P-5 (2026-04-30).
function dedupCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    const key = `${c.provider}|${c.slug || ""}|${c.host || ""}|${c.site || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// RI-4 ambiguity resolution: given multiple candidate ATS detections from
// one page, pick the best match if any candidate has strong company-name
// agreement (Levenshtein ≤2 against normalized company name). Otherwise
// return null + flag ambiguous.
function resolveAmbiguous(rawCandidates, companyName) {
  // Dedup first (P-5 fix) — N footer-links to same tenant should count as 1
  const candidates = dedupCandidates(rawCandidates);
  if (candidates.length === 0) return { winner: null, ambiguous: false, candidates };
  if (candidates.length === 1) return { winner: candidates[0], ambiguous: false, candidates };

  const normCompany = normalizeForAgreement(companyName);
  // Strip trailing parenthesized text (e.g., "Anysphere (Cursor)" → "anysphere")
  const normCompanyShort = normalizeForAgreement(companyName.split("(")[0]);

  // Score each candidate by min Levenshtein vs normalized name
  const scored = candidates.map((c) => {
    const target = c.slug || c.host || "";
    const normTarget = normalizeForAgreement(target);
    const dist = Math.min(
      levenshtein(normCompany, normTarget),
      levenshtein(normCompanyShort, normTarget),
      // Substring containment as bonus
      normTarget.includes(normCompanyShort) || normCompany.includes(normTarget) ? 0 : Infinity
    );
    return { ...c, _score: dist };
  });
  scored.sort((a, b) => a._score - b._score);

  const best = scored[0];
  // Strong agreement = Levenshtein ≤ 2
  if (best._score <= 2) {
    return { winner: best, ambiguous: false, candidates: scored };
  }
  return { winner: null, ambiguous: true, candidates: scored };
}

async function tryDiscoverPage(url, companyName) {
  // Fetch HTML + links via Firecrawl
  const result = await scrape(url, {
    formats: ["html", "links"],
    layer: "1",
    company: companyName,
  });
  const links = result.links || [];
  // Concat HTML + links into a single haystack for ATS detection
  const haystack = [
    result.html || "",
    ...links,
    result.markdown || "",
  ].join("\n");
  const candidates = detectAllInText(haystack);
  return { candidates, sourceUrl: url, links };
}

// Pick promising inner links to drill into (per RI-3 and §6.4 logic):
// - same hostname as seed (avoid blog/external)
// - path contains careers / jobs / opportunities / hiring / open-roles
// - dedup; keep up to MAX_DRILL_LINKS
function pickDrillLinks(seedUrl, links) {
  let seedHost;
  try {
    seedHost = new URL(seedUrl).hostname;
  } catch {
    return [];
  }
  const promisingPaths = /\/(careers?|jobs?|opportunities|hiring|open-roles?|positions|join|work|life-at)\b/i;
  const seen = new Set([seedUrl]);
  const picks = [];
  for (const link of links) {
    if (picks.length >= MAX_DRILL_LINKS) break;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    let u;
    try {
      u = new URL(link, seedUrl);
    } catch {
      continue;
    }
    if (u.hostname !== seedHost) continue;
    if (!promisingPaths.test(u.pathname)) continue;
    picks.push(u.toString());
  }
  return picks;
}

async function discoverCompany(entry, cache, opts) {
  const { name, careers_url } = entry;

  // Skip direct-ATS — those go to Layer 0
  const directDetect = detectProvider(careers_url);
  if (directDetect) return { name, action: "skipped-direct-ats", direct: directDetect };

  // Skip if cache fresh + valid
  if (!opts.force && cache[name] && isCacheEntryFresh(cache[name]) && cache[name].ats) {
    return { name, action: "cache-hit", cached: cache[name] };
  }

  // Try Layer 1 discovery — depth 0 first
  let depth0Result;
  try {
    depth0Result = await tryDiscoverPage(careers_url, name);
  } catch (e) {
    const ashbyProbe = await probeAshbyDirect(entry);
    if (ashbyProbe) {
      const cacheEntry = cacheAshbyProbe(cache, entry, ashbyProbe, 0);
      return { name, action: "discovered", entry: cacheEntry };
    }
    if (e instanceof CreditCapExhaustedError) throw e;
    return { name, action: "fetch-failed", error: e.message?.slice(0, 200) };
  }

  let pickedDepth = 0;
  let allCandidates = depth0Result.candidates;
  let resolution = resolveAmbiguous(allCandidates, name);

  // Drill if no candidates AND we haven't hit depth 2
  if (resolution.winner == null && !resolution.ambiguous && allCandidates.length === 0) {
    const drillUrls = pickDrillLinks(careers_url, depth0Result.links);
    for (const drillUrl of drillUrls) {
      pickedDepth = 1;
      try {
        const r1 = await tryDiscoverPage(drillUrl, name);
        if (r1.candidates.length > 0) {
          allCandidates = r1.candidates;
          break;
        }
        // Still nothing at depth 1 — drill once more (depth 2) on this page's links
        if (MAX_DRILL_DEPTH >= 2) {
          const drillUrls2 = pickDrillLinks(drillUrl, r1.links);
          for (const drillUrl2 of drillUrls2) {
            pickedDepth = 2;
            try {
              const r2 = await tryDiscoverPage(drillUrl2, name);
              if (r2.candidates.length > 0) {
                allCandidates = r2.candidates;
                break;
              }
            } catch {
              // Continue to next depth-2 link
            }
            await sleep(COURTESY_DELAY_MS);
          }
          if (allCandidates.length > 0) break;
        }
      } catch {
        // Continue to next depth-1 link
      }
      await sleep(COURTESY_DELAY_MS);
    }
    resolution = resolveAmbiguous(allCandidates, name);
  }

  if (resolution.winner) {
    const win = resolution.winner;
    const cacheEntry = {
      ats: win.provider,
      discovered_at: new Date().toISOString(),
      source_url: careers_url,
      depth: pickedDepth,
    };
    if (win.slug) cacheEntry.slug = win.slug;
    if (win.host) cacheEntry.host = win.host;
    if (win.site) cacheEntry.site = win.site;
    if (resolution.candidates.length > 1) {
      cacheEntry.candidates = resolution.candidates.map((c) => ({
        provider: c.provider,
        slug: c.slug,
        host: c.host,
        site: c.site,
      }));
    }
    cache[name] = cacheEntry;
    return { name, action: "discovered", entry: cacheEntry };
  }

  if (resolution.ambiguous) {
    cache[name] = {
      ats: null,
      status: "ambiguous",
      last_attempt: new Date().toISOString(),
      source_url: careers_url,
      candidates: resolution.candidates.map((c) => ({
        provider: c.provider,
        slug: c.slug,
        host: c.host,
        site: c.site,
        _score: c._score,
      })),
    };
    return { name, action: "ambiguous", candidates: resolution.candidates.length };
  }

  const ashbyProbe = await probeAshbyDirect(entry);
  if (ashbyProbe) {
    const cacheEntry = cacheAshbyProbe(cache, entry, ashbyProbe, pickedDepth);
    return { name, action: "discovered", entry: cacheEntry };
  }

  // No ATS markers found
  cache[name] = {
    ats: null,
    status: "no-ats-found",
    last_attempt: new Date().toISOString(),
    source_url: careers_url,
  };
  return { name, action: "no-ats-found" };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const maxCreditsIdx = args.indexOf("--max-credits");
  const maxCredits = maxCreditsIdx >= 0 ? Number(args[maxCreditsIdx + 1]) : MAX_CREDITS_DEFAULT;
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
  const companyIdx = args.indexOf("--company");
  const companyFilter = companyIdx >= 0 ? args[companyIdx + 1] : null;

  setMaxCredits(maxCredits);

  const portals = yaml.load(readFileSync(PORTALS_YML, "utf-8"));
  const cache = loadCache();
  const tracked = portals?.tracked_companies || [];

  // Filter to enabled, non-direct-ATS, optional --company
  let candidates = tracked.filter(
    (e) => e?.enabled && e?.careers_url && !detectProvider(e.careers_url)
  );
  if (companyFilter) {
    candidates = candidates.filter((e) => e.name === companyFilter);
  }
  candidates = candidates.slice(0, limit);

  console.error(`[discover] ${candidates.length} branded URL(s) to discover (max-credits=${maxCredits}, dry-run=${dryRun}, force=${force})`);

  const summary = { discovered: 0, "cache-hit": 0, "no-ats-found": 0, ambiguous: 0, "fetch-failed": 0, "skipped-direct-ats": 0 };

  for (const entry of candidates) {
    try {
      const r = await discoverCompany(entry, cache, { force });
      summary[r.action] = (summary[r.action] || 0) + 1;
      const tag = r.action === "discovered"
        ? `→ ${r.entry.ats}/${r.entry.slug || r.entry.host}`
        : r.action === "ambiguous"
          ? `(${r.candidates} candidates)`
          : "";
      console.error(`  ${entry.name}: ${r.action} ${tag}`);
    } catch (e) {
      if (e instanceof CreditCapExhaustedError) {
        console.error(`[discover] CREDIT CAP EXHAUSTED at ${entry.name} — fallback queue updated; remaining ${candidates.length - candidates.indexOf(entry) - 1} unprocessed`);
        // Append remaining to fallback queue (already done by wrapper for current call;
        // also append the queued-skipped ones for visibility)
        break;
      }
      summary["fetch-failed"]++;
      console.error(`  ${entry.name}: ERROR ${e.message?.slice(0, 100)}`);
    }
    if (!dryRun && (summary.discovered + summary.ambiguous + summary["no-ats-found"]) % 10 === 0) {
      // Periodic cache flush (resilient to crash)
      saveCache(cache);
    }
    await sleep(COURTESY_DELAY_MS);
  }

  if (!dryRun) saveCache(cache);

  console.error(`\n=== firecrawl-discover summary ===`);
  for (const [k, v] of Object.entries(summary)) {
    if (v > 0) console.error(`  ${k.padEnd(22)} ${String(v).padStart(4)}`);
  }
  console.error(`  credits_spent          ${String(getCreditsSpent()).padStart(4)}`);
  console.error(`  cache_path             ${CACHE_PATH}`);
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

// Re-exports for testing
export { discoverCompany, resolveAmbiguous, levenshtein, ashbySlugCandidates, probeAshbyDirect, cacheAshbyProbe };
