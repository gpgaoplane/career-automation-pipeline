#!/usr/bin/env node

/**
 * enrich-jobs.mjs — Per-job description fetcher + signal extractor
 *
 * Reads pipeline.md, fetches each URL once (Tier 1 HTTP → Tier 2 Playwright),
 * caches text + extracted signals in data/job-descriptions-cache.json
 * with a 7-day per-URL TTL. Sequential per D-8 (enrichment-only sequential;
 * existing scan.mjs / custom-scraper.mjs concurrency unchanged).
 *
 * Signal extraction (per design plan §8): location, comp range with
 * USD/CAD parsing, track keywords, tech-stack matches, YoE indicators,
 * deal-breaker phrases. Pure function `extractSignals()`.
 *
 * Resume-safe: per-job cache writes; SIGINT closes browser, flushes
 * cache, exits clean.
 *
 * Usage:
 *   node enrich-jobs.mjs                       # enrich all pipeline URLs
 *   node enrich-jobs.mjs --dry-run             # preview without writing
 *   node enrich-jobs.mjs --force               # refresh already-cached URLs
 *   node enrich-jobs.mjs --company "Anthropic" # single company subset
 *   node enrich-jobs.mjs --rate-limit-ms 1000  # override rate limit (default 500)
 *   node enrich-jobs.mjs --ttl-days 14         # override 7-day TTL
 *   node enrich-jobs.mjs --skip-stale          # don't re-fetch stale entries
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import * as cheerio from 'cheerio';

// ── Constants ────────────────────────────────────────────────────────

const PIPELINE_PATH = 'data/pipeline.md';
const CACHE_PATH = 'data/job-descriptions-cache.json';
const LOG_DIR = 'batch/logs';

const DEFAULTS = {
  ttlDays: 7,
  rateLimitMs: 500,
  fetchTimeoutMs: 30_000,
  maxTextChars: 50_000,
};

// ── CLI ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {
    dryRun: false,
    force: false,
    company: null,
    rateLimitMs: DEFAULTS.rateLimitMs,
    ttlDays: DEFAULTS.ttlDays,
    skipStale: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--force') flags.force = true;
    else if (a === '--company') flags.company = argv[++i];
    else if (a === '--rate-limit-ms') flags.rateLimitMs = parseInt(argv[++i], 10);
    else if (a === '--ttl-days') flags.ttlDays = parseInt(argv[++i], 10);
    else if (a === '--skip-stale') flags.skipStale = true;
    else throw new Error(`Unknown flag: ${a}`);
  }
  return flags;
}

// ── Pipeline parser ─────────────────────────────────────────────────

function parsePipelineMd(path) {
  const text = readFileSync(path, 'utf-8');
  const jobs = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^- \[ \] (\S+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$/);
    if (m) jobs.push({ url: m[1], company: m[2].trim(), title: m[3].trim() });
  }
  return jobs;
}

// ── Cache ────────────────────────────────────────────────────────────

function loadCache(path) {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return {}; }
}

function saveCache(path, cache) {
  mkdirSync('data', { recursive: true });
  writeFileSync(path, JSON.stringify(cache, null, 2), 'utf-8');
}

function isStale(entry, ttlMs) {
  if (!entry || !entry.fetched_at) return true;
  return (Date.now() - new Date(entry.fetched_at).getTime()) > ttlMs;
}

// ── Signal extraction (pure function — easily unit-testable) ─────────

const REGEXES = {
  toronto: /\b(toronto|gta|greater toronto area|ontario)\b/i,
  hybridToronto: /\bhybrid\b[\s\S]{0,200}\b(toronto|gta)\b/i,
  canadaOnly: /\b(canada-only|must be located in canada|canadian residents only)\b/i,
  fullyRemoteUS: /\b(100% remote|fully remote)\b[\s\S]{0,100}\b(us-based|north america|united states)\b/i,
  yoe35: /\b(3|4|5|3-5|3 to 5|four|five) ?years?\b[\s\S]{0,30}\b(experience|exp)\b/i,
  // Generic X+ years pattern. Any 6+ to 99+ counts as senior. Was previously
  // /\b(6\+|7\+|8\+|10\+) ?years?\b/ which missed 9+, 11+, 12+, 15+, etc.
  yoe6plus: /\b(?:[6-9]|\d{2,})\+\s?years?\b/i,
  yoe02: /\b(0-2|1-2|less than 2|0 to 2) ?years?\b/i,
  // Onsite-5-days dealbreaker. Proximity-based Toronto check applied in
  // extractDealBreaker (not the global text test that used to exist).
  dealBreakerOnsite: /\bin-office (5|five) days?\b/i,
  // Hybrid dealbreaker (added 2026-05-01). Matches "hybrid" not followed by
  // unambiguous technical-term suffixes (cloud / mesh / fabric — networking
  // and architecture jargon, not work-mode). The Toronto/non-Toronto
  // proximity check runs in extractDealBreaker. Will's rule:
  // US/non-Toronto-Canada/non-Toronto-anywhere hybrid = SKIP.
  // Note: "hybrid model" is intentionally NOT excluded here — it's frequently
  // used to mean work-mode ("Work style: Hybrid model with 2 days per week").
  dealBreakerHybrid: /\bhybrid\b(?!\s+(?:cloud|mesh|fabric))/i,
  dealBreakerPhd: /\bphd required\b/i,
  dealBreakerSponsor: /\bsponsorship not available for remote\b/i,
};

const TRACK_KEYWORDS = [
  // AI-ENG
  'RAG', 'retrieval-augmented', 'multi-agent', 'agentic', 'LangGraph',
  'LangChain', 'LlamaIndex', 'vector database', 'vector db', 'embeddings',
  'fine-tuning', 'LoRA', 'LLMOps', 'MLOps', 'production AI', 'agent orchestration',
  // SA / CONSULT
  'Forward Deployed', 'FDE', 'Customer Engineer', 'Solutions Architect',
  'Implementation Engineer', 'client-facing', 'post-deployment',
  // GEN-AI / CREATIVE
  'ComfyUI', 'Stable Diffusion', 'generative video', 'diffusion model',
  'image generation', 'video generation', '3D generation',
  // PM
  'AI roadmap', 'AI product strategy', 'agentic product',
  // AE
  'AI sales', 'technical sales', 'land and expand', 'AI partnerships',
];

const TECH_STACK = [
  'Python', 'PyTorch', 'TensorFlow', 'Hugging Face', 'transformers',
  'LangChain', 'LlamaIndex', 'Pinecone', 'Weaviate', 'Chroma', 'Qdrant',
  'OpenAI API', 'Anthropic API', 'Claude API', 'GPT-4', 'GCP', 'AWS',
  'Vertex AI', 'SageMaker', 'Bedrock',
];

function uniqueCaseInsensitiveMatches(text, list) {
  const lowText = text.toLowerCase();
  const seen = new Set();
  for (const term of list) {
    if (lowText.includes(term.toLowerCase())) seen.add(term);
  }
  return [...seen];
}

// Detects the currency for a comp window. Falls back to whole-text region
// hints when the window itself doesn't say USD/CAD literally.
function detectCurrency(window, fullText) {
  const cad = /\b(CAD|CA\$|C\$|Canadian dollar)\b/i.test(window);
  const usd = /\b(USD|US\$|United States dollar)\b/i.test(window);
  if (cad && !usd) return 'CAD';
  if (usd && !cad) return 'USD';
  if (!cad && !usd) {
    if (/\b(canada|toronto|ontario)\b/i.test(fullText)) return 'CAD';
    if (/\b(united states|usa|us-based|new york|san francisco|remote us)\b/i.test(fullText)) return 'USD';
    return 'unknown';
  }
  return 'unknown';
}

function extractCompRange(text) {
  // Anchor phrases that introduce comp text. Expanded 2026-05-01 to catch
  // "annual salary"/"the salary"/"estimated annual salary"/"pay band" forms
  // (Bug 1a — Arize, Block, etc. were missed under the older list).
  const anchorRe = /\b(compensation|salary range|base salary|total compensation|OTE|target compensation|salary band|pay band|pay range|base pay|annual salary|the salary|estimated annual salary|salary for this)\b/ig;
  const anchors = [...text.matchAll(anchorRe)];

  // Range pattern: requires $ on first number OR K/k marker on a number
  // (so "3-5 years" doesn't false-positive). [\d,]+ extended with optional
  // (?:\.\d+)? so decimal-K formats like $207.2K parse correctly
  // (Bug 1d — affected 11 cached JDs each by ~20 score points).
  const rangeRe = /(?:\$\s?([\d,]+(?:\.\d+)?)\s?([Kk])?|([\d,]+(?:\.\d+)?)\s?([Kk]))\s*[-–—to]+\s*\$?\s?([\d,]+(?:\.\d+)?)\s?([Kk])?/g;

  // Strong-pattern detection — when no anchor matches, a $X,XXX-$X,XXX or
  // $XXk-$XXk pattern is sufficiently specific to be comp on its own.
  // Catches Lever standalone footers ($190,000 - $290,000 a year) etc.
  // (Bug 1b — Shield AI 4x, others.)
  const strongRangeRe = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\s*[-–—]\s*\$?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/g;
  const strongKRangeRe = /\$\s?(\d{2,3}(?:\.\d+)?)\s?[Kk]\s*[-–—]\s*\$?\s?(\d{2,3}(?:\.\d+)?)\s?[Kk]\b/g;

  // Single-value pattern (no range). "Compensation: $240K • OTE..." etc.
  // Only used inside an anchor window. Yields {low=high=value}.
  // (Bug 1c — Harvey 2x, LangChain, OpenAI single-value comp roles.)
  const singleValRe = /\$\s?([\d,]+(?:\.\d+)?)\s?([Kk])\b/g;

  function processRangeMatch(m, window) {
    const n1raw = m[1] || m[3];
    const k1 = m[2] || m[4];
    const n2raw = m[5];
    const k2 = m[6];
    if (!n1raw || !n2raw) return null;
    let low = parseFloat(n1raw.replace(/,/g, ''));
    let high = parseFloat(n2raw.replace(/,/g, ''));
    if (isNaN(low) || isNaN(high)) return null;
    if (k1) low *= 1000;
    if (k2) high *= 1000;
    // Pay-transparency shorthand: "$200-$325k" → low gets implicit K.
    if (!k1 && k2 && low < 1000) low *= 1000;
    if (k1 && !k2 && high < 1000) high *= 1000;
    // Skip non-money ranges ("3-5 years") — both <1000 and no K marker.
    if (low < 1000 || high < 1000) return null;
    if (low > 10_000_000 || high > 10_000_000) return null;
    if (low > high) [low, high] = [high, low];
    return {
      low_thousands: Math.round(low / 1000),
      high_thousands: Math.round(high / 1000),
      currency: detectCurrency(window, text),
    };
  }

  // Strategy 1: anchor-window scan with range pattern (preferred).
  for (const aMatch of anchors) {
    const start = Math.max(0, aMatch.index - 50);
    const end = Math.min(text.length, aMatch.index + 350);
    const window = text.slice(start, end);
    let m;
    rangeRe.lastIndex = 0;
    while ((m = rangeRe.exec(window)) !== null) {
      const result = processRangeMatch(m, window);
      if (result) return result;
    }
  }

  // Strategy 2: strong-pattern fallback (no anchor required).
  for (const re of [strongRangeRe, strongKRangeRe]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = Math.max(0, m.index - 100);
      const end = Math.min(text.length, m.index + 200);
      const window = text.slice(start, end);
      // Re-run rangeRe on the local window so the same processing applies.
      rangeRe.lastIndex = 0;
      let inner;
      while ((inner = rangeRe.exec(window)) !== null) {
        const result = processRangeMatch(inner, window);
        if (result) return result;
      }
    }
  }

  // Strategy 3: single-value within anchor window (last resort).
  for (const aMatch of anchors) {
    const start = Math.max(0, aMatch.index - 30);
    const end = Math.min(text.length, aMatch.index + 250);
    const window = text.slice(start, end);
    let m;
    singleValRe.lastIndex = 0;
    while ((m = singleValRe.exec(window)) !== null) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      if (m[2]) val *= 1000;
      if (val < 1000 || val > 10_000_000) continue;
      const v = Math.round(val / 1000);
      return { low_thousands: v, high_thousands: v, currency: detectCurrency(window, text) };
    }
  }

  return null;
}

// Proximity-based Toronto check (within ±200 chars of the matched signal)
// instead of a global text test. Was previously bypassed whenever Toronto
// appeared anywhere in the JD — including JDs that listed Toronto as one
// of multiple office locations but the ROLE was not Toronto-based.
function nearToronto(text, matchIndex) {
  const start = Math.max(0, matchIndex - 200);
  const end = Math.min(text.length, matchIndex + 200);
  return /\btoronto\b/i.test(text.slice(start, end));
}

function extractDealBreaker(text) {
  if (REGEXES.dealBreakerPhd.test(text)) return 'phd_required';
  if (REGEXES.dealBreakerSponsor.test(text)) return 'no_sponsorship_remote';

  // Onsite-5-days outside Toronto.
  const onsiteMatch = REGEXES.dealBreakerOnsite.exec(text);
  if (onsiteMatch && !nearToronto(text, onsiteMatch.index)) {
    return 'onsite_5_days_non_toronto';
  }

  // Hybrid outside Toronto. Will's universal rule: US/non-Toronto-Canada/
  // any-region hybrid = SKIP (he is in Toronto and only Toronto hybrid is
  // acceptable). Added 2026-05-01.
  const hybridMatch = REGEXES.dealBreakerHybrid.exec(text);
  if (hybridMatch && !nearToronto(text, hybridMatch.index)) {
    return 'hybrid_non_toronto';
  }

  return null;
}

function extractYoeSignal(text) {
  if (REGEXES.yoe6plus.test(text)) return '6+';
  if (REGEXES.yoe02.test(text)) return '0-2';
  if (REGEXES.yoe35.test(text)) return '3-5';
  return null;
}

function extractLocationMatches(text) {
  const matches = [];
  if (REGEXES.toronto.test(text)) matches.push('Toronto');
  if (REGEXES.hybridToronto.test(text)) matches.push('Hybrid Toronto');
  if (REGEXES.canadaOnly.test(text)) matches.push('Canada-only');
  if (REGEXES.fullyRemoteUS.test(text)) matches.push('Fully remote US');
  return matches;
}

function cleanLocationCandidate(line) {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/^[-*]\s*/, '')
    .trim();
}

function isLikelyLocationCandidate(line) {
  if (!line || line.length > 120) return false;
  if (/^(apply|employment type|department|location type|job type|about|back to jobs)$/i.test(line)) return false;
  if (/^(full time|part time|contract|internship|temporary)$/i.test(line)) return false;
  return /\b(remote|hybrid|onsite|on-site|san francisco|new york|toronto|canada|united states|usa|uk|united kingdom|london|europe|poland|germany|india|singapore|australia|south korea|washington|boulder|chicago|seattle|california)\b/i.test(line);
}

function extractRawLocations(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map(cleanLocationCandidate).filter(Boolean);
  const matches = [];
  const seen = new Set();
  const add = (line) => {
    const value = cleanLocationCandidate(line);
    const key = value.toLowerCase();
    if (isLikelyLocationCandidate(value) && !seen.has(key)) {
      seen.add(key);
      matches.push(value);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    if (/^location$/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (/^(employment type|location type|department)$/i.test(lines[j])) break;
        add(lines[j]);
        if (matches.length && seen.has(lines[j].toLowerCase())) break;
      }
    }
  }

  // Greenhouse-style markdown often has: "# Title" then a plain location line.
  for (let i = 0; i < Math.min(rawLines.length - 1, 24); i++) {
    if (/^#\s+/.test(rawLines[i] || '')) {
      for (let j = i + 1; j < Math.min(i + 5, rawLines.length); j++) {
        const candidate = cleanLocationCandidate(rawLines[j] || '');
        if (!candidate) continue;
        add(candidate);
        break;
      }
      break;
    }
  }

  for (const line of lines) {
    if (/^(remote|hybrid|onsite|on-site)\b/i.test(line)) add(line);
  }

  return matches.slice(0, 5);
}

export function extractSignals(text) {
  const comp = extractCompRange(text);
  return {
    location_match: extractLocationMatches(text),
    location_raw: extractRawLocations(text),
    comp_low_thousands: comp ? comp.low_thousands : null,
    comp_high_thousands: comp ? comp.high_thousands : null,
    comp_currency: comp ? comp.currency : null,
    track_keywords_matched: uniqueCaseInsensitiveMatches(text, TRACK_KEYWORDS),
    tech_stack_matched: uniqueCaseInsensitiveMatches(text, TECH_STACK),
    yoe_signal: extractYoeSignal(text),
    deal_breaker_signal: extractDealBreaker(text),
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────

// Phase 2.8 Step 7 — Firecrawl-first fetcher per Q-FC-4. Returns same
// shape as fetchTier1/fetchTier2 for drop-in compatibility with the
// existing extractSignals() pipeline.
//
// On Firecrawl outage / 5xx / 4xx / --max-credits exhaustion: returns
// {ok: false, error}; caller falls through to Tier 1 HTTP. This is
// outage-resilience ONLY, not cost-routing.
async function fetchFirecrawlMarkdown(url, company) {
  try {
    const { scrape } = await import("./lib/firecrawl.mjs");
    const result = await scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      layer: "enrich",
      company,
    });
    const text = result.markdown || "";
    if (text.length < 200) {
      return { ok: false, error: `firecrawl-short-response (${text.length} chars)`, status: 200 };
    }
    return { ok: true, text, status: 200, tier: "firecrawl" };
  } catch (e) {
    return { ok: false, error: `firecrawl-${e.name}: ${e.message?.slice(0, 80)}`, status: e.statusCode ?? null };
  }
}

async function fetchTier1(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return { ok: false, status: res.status, error: `http ${res.status}`, tier: 'tier1-http' };
    const html = await res.text();
    const text = htmlToText(html);
    if (text.length < 500) return { ok: false, status: res.status, error: 'response too short', tier: 'tier1-http' };
    return { ok: true, status: res.status, text, tier: 'tier1-http' };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e), tier: 'tier1-http' };
  } finally {
    clearTimeout(timer);
  }
}

let _browser = null;
async function getBrowser() {
  if (_browser) return _browser;
  const { chromium } = await import('playwright');
  _browser = await chromium.launch({ headless: true });
  return _browser;
}

async function closeBrowser() {
  if (_browser) {
    try { await _browser.close(); } catch {}
    _browser = null;
  }
}

async function fetchTier2(url, timeoutMs) {
  let page;
  try {
    const browser = await getBrowser();
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
    const html = await page.content();
    const text = htmlToText(html);
    if (text.length < 500) return { ok: false, status: 0, error: 'response too short (tier2)', tier: 'tier2-playwright' };
    return { ok: true, status: 200, text, tier: 'tier2-playwright' };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e), tier: 'tier2-playwright' };
  } finally {
    try { if (page) await page.context().close(); } catch {}
  }
}

function htmlToText(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

// ── Logging ──────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
mkdirSync(LOG_DIR, { recursive: true });
const LOG_PATH = `${LOG_DIR}/enrich-${today}.log`;

function log(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}`;
  console.log(entry);
  try { appendFileSync(LOG_PATH, entry + '\n'); } catch {}
}

// ── Per-job orchestrator ─────────────────────────────────────────────

async function enrichOne(job, flags, cache) {
  const { url, company, title } = job;

  if (cache[url] && !isStale(cache[url], flags.ttlDays * 24 * 60 * 60 * 1000) && !flags.force) {
    log(`[${company}] cached, skip — ${url}`);
    return { skipped: true };
  }
  if (cache[url] && isStale(cache[url], flags.ttlDays * 24 * 60 * 60 * 1000) && flags.skipStale) {
    log(`[${company}] stale (--skip-stale), skip — ${url}`);
    return { skipped: true };
  }

  if (flags.dryRun) {
    log(`[${company}] would fetch — ${url}`);
    return { skipped: true };
  }

  // Phase 2.8 Step 7: pure Firecrawl-first per Q-FC-4 (D-14, D-17).
  // Primary: Firecrawl /v1/scrape markdown (1 credit/page). Outage-only
  // fallback (NOT cost-routing) goes to Tier 1 HTTP, then Tier 2 Playwright.
  let result = await fetchFirecrawlMarkdown(url, company);
  if (!result.ok) {
    log(`[${company}] firecrawl-failed (${result.error}) → tier1-http fallback — ${url}`);
    result = await fetchTier1(url, DEFAULTS.fetchTimeoutMs);
  }
  if (!result.ok) {
    log(`[${company}] tier1-http failed (${result.error}) → tier2-playwright — ${url}`);
    result = await fetchTier2(url, DEFAULTS.fetchTimeoutMs);
  }

  const fetched_at = new Date().toISOString();
  if (result.ok) {
    const truncated = result.text.slice(0, DEFAULTS.maxTextChars);
    const signals = extractSignals(truncated);
    cache[url] = {
      url, fetched_at,
      fetch_method: result.tier,
      http_status: result.status,
      content_text: truncated,
      extracted_signals: signals,
      error: null,
    };
    log(`[${company}] ${result.tier} ${result.status} (${truncated.length} chars) → loc=${JSON.stringify(signals.location_match)} comp=[${signals.comp_low_thousands ?? '-'}-${signals.comp_high_thousands ?? '-'} ${signals.comp_currency ?? ''}] kw=${signals.track_keywords_matched.length} tech=${signals.tech_stack_matched.length}`);
  } else {
    cache[url] = {
      url, fetched_at,
      fetch_method: 'failed',
      http_status: result.status,
      content_text: null,
      extracted_signals: null,
      error: result.error,
    };
    log(`[${company}] FAILED — ${result.error} — ${url}`);
  }
  saveCache(CACHE_PATH, cache);
  return { skipped: false };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv);
  log(`enrich-jobs.mjs start — flags=${JSON.stringify(flags)}`);

  const allJobs = parsePipelineMd(PIPELINE_PATH);
  let jobs = allJobs;
  if (flags.company) {
    jobs = allJobs.filter(j => j.company.toLowerCase() === flags.company.toLowerCase());
  }
  log(`pipeline: ${allJobs.length} total, ${jobs.length} to process`);

  const cache = loadCache(CACHE_PATH);

  let onSigint = false;
  const sigintHandler = async () => {
    if (onSigint) return;
    onSigint = true;
    log('SIGINT — flushing cache + closing browser');
    saveCache(CACHE_PATH, cache);
    await closeBrowser();
    process.exit(130);
  };
  process.on('SIGINT', sigintHandler);

  let i = 0;
  let processed = 0;
  let skipped = 0;
  for (const job of jobs) {
    i++;
    log(`[${i}/${jobs.length}] [${job.company}] ${job.url}`);
    const r = await enrichOne(job, flags, cache);
    if (r.skipped) skipped++; else processed++;
    if (!r.skipped) await new Promise(r => setTimeout(r, flags.rateLimitMs));
  }

  saveCache(CACHE_PATH, cache);
  await closeBrowser();
  log(`done: processed=${processed} skipped=${skipped} total=${jobs.length}`);
}

const isMain = (() => {
  try {
    return process.argv[1] && process.argv[1].endsWith('enrich-jobs.mjs');
  } catch { return false; }
})();

if (isMain) {
  main().catch(async (e) => {
    log(`FATAL: ${e.stack || e}`);
    await closeBrowser();
    process.exit(1);
  });
}
