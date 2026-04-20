#!/usr/bin/env node

/**
 * custom-scraper.mjs — ATS-discovery + Playwright scraper for non-API companies
 *
 * 3-tier discovery: plain fetch+HTML regex → Playwright XHR intercept → generic DOM.
 * Results cached in data/ats-discovery-cache.json (30-day TTL). portals.yml never mutated.
 * Complements scan.mjs — only handles companies scan.mjs skips.
 *
 * Usage:
 *   node custom-scraper.mjs                    # scrape all custom-scraper companies
 *   node custom-scraper.mjs --dry-run          # preview without writing files
 *   node custom-scraper.mjs --company Veritone # single company
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import * as cheerio from 'cheerio';

// ── Constants ────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';
const LOGS_DIR = 'batch/logs';
const ATS_DISCOVERY_CACHE_PATH = 'data/ats-discovery-cache.json';

const CONCURRENCY_API = 10;
const CONCURRENCY_PLAYWRIGHT = 5;
const FETCH_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const JOB_URL_PATTERNS = ['/jobs/', '/careers/', '/job/', '/position/', '/opening/', '/vacancy/', '/posting/', '/apply/'];

// Tier 1: HTML regex patterns — each { re, extract(match) → discovery object }
const ATS_HTML_PATTERNS = [
  { re: /boards\.greenhouse\.io\/(?:embed\/job_board\/js\?for=)?([a-z0-9_-]+)/i,
    extract: m => ({ ats: 'greenhouse', slug: m[1] }) },
  { re: /job-boards(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/i,
    extract: m => ({ ats: 'greenhouse', slug: m[1] }) },
  { re: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i,
    extract: m => ({ ats: 'ashby', slug: m[1] }) },
  { re: /jobs\.lever\.co\/([a-z0-9_-]+)/i,
    extract: m => ({ ats: 'lever', slug: m[1] }) },
  // Workday: handles both /ExternalSite and /wday/cxs/tenant/ExternalSite paths
  { re: /([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:wday\/cxs\/[a-z0-9_-]+\/)?([^/"?#\s]+)/i,
    extract: m => ({ ats: 'workday', tenant: m[1], instance: m[2], site: m[3] }) },
  { re: /([a-z0-9-]+)\.smartrecruiters\.com/i,
    extract: m => ({ ats: 'smartrecruiters', id: m[1] }) },
  { re: /([a-z0-9-]+)\.bamboohr\.com/i,
    extract: m => ({ ats: 'bamboohr', id: m[1] }) },
  { re: /([a-z0-9-]+)\.recruitee\.com/i,
    extract: m => ({ ats: 'recruitee', id: m[1] }) },
];

// Tier 2: URL patterns to match in intercepted XHR/fetch requests
const ATS_INTERCEPT_PATTERNS = [
  { re: /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)\//i,
    extract: m => ({ ats: 'greenhouse', slug: m[1] }) },
  { re: /api\.ashbyhq\.com\/posting-api\/job-board\/([a-z0-9_-]+)/i,
    extract: m => ({ ats: 'ashby', slug: m[1] }) },
  { re: /api\.lever\.co\/v0\/postings\/([a-z0-9_-]+)/i,
    extract: m => ({ ats: 'lever', slug: m[1] }) },
  // Workday API: tenant.wdN.myworkdayjobs.com/wday/cxs/tenant/Site/jobs
  { re: /([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/wday\/cxs\/[a-z0-9_-]+\/([^/?#]+)/i,
    extract: m => ({ ats: 'workday', tenant: m[1], instance: m[2], site: m[3] }) },
  { re: /api\.smartrecruiters\.com\/v1\/companies\/([^/?#\s]+)/i,
    extract: m => ({ ats: 'smartrecruiters', id: m[1] }) },
];

// ── Discovery cache ───────────────────────────────────────────────────

function loadDiscoveryCache() {
  if (!existsSync(ATS_DISCOVERY_CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(ATS_DISCOVERY_CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDiscoveryCache(cache) {
  writeFileSync(ATS_DISCOVERY_CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
}

function isCacheValid(entry) {
  if (!entry?.discovered) return false;
  return (Date.now() - new Date(entry.discovered).getTime()) < CACHE_TTL_MS;
}

// ── ATS discovery functions ───────────────────────────────────────────

function extractAtsFromInterceptedUrl(url) {
  for (const { re, extract } of ATS_INTERCEPT_PATTERNS) {
    const m = url.match(re);
    if (m) return extract(m);
  }
  return null;
}

async function discoverAtsTier1(careersUrl) {
  try {
    const res = await fetchWithTimeout(careersUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-ops-scanner/1.0)' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    for (const { re, extract } of ATS_HTML_PATTERNS) {
      const m = html.match(re);
      if (m) return extract(m);
    }
    return null;
  } catch {
    return null;
  }
}

// ── ATS API handlers ──────────────────────────────────────────────────

async function handleGreenhouseApi(company, discovered) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${discovered.slug}/jobs?content=true`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Greenhouse API HTTP ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(j => ({
    title: j.title,
    url: j.absolute_url,
    company: company.name,
    location: j.location?.name || '',
    source: 'greenhouse-api',
  }));
}

async function handleAshbyApi(company, discovered) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${discovered.slug}?includeCompensation=true`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Ashby API HTTP ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).map(j => ({
    title: j.title,
    url: j.jobUrl,
    company: company.name,
    location: j.location || '',
    source: 'ashby-api',
  }));
}

async function handleLeverApi(company, discovered) {
  const url = `https://api.lever.co/v0/postings/${discovered.slug}?mode=json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Lever API HTTP ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(j => ({
    title: j.text,
    url: j.hostedUrl,
    company: company.name,
    location: j.categories?.location || '',
    source: 'lever-api',
  }));
}

async function dispatchToDiscoveredApi(company, discovered) {
  switch (discovered.ats) {
    case 'greenhouse': return handleGreenhouseApi(company, discovered);
    case 'ashby':      return handleAshbyApi(company, discovered);
    case 'lever':      return handleLeverApi(company, discovered);
    case 'workday':    return handleWorkday(company, discovered);
    default:           return []; // smartrecruiters/bamboohr/recruitee — stub only
  }
}

// ── ATS detection by URL pattern (scan.mjs skip logic) ───────────────

function detectAts(company) {
  const url = company.careers_url || '';

  // Skip scan.mjs-handled ATSes (direct URL contains ATS domain)
  if (company.api && company.api.includes('greenhouse')) return null;
  if (/jobs\.ashbyhq\.com/.test(url)) return null;
  if (/jobs\.lever\.co/.test(url)) return null;
  if (/job-boards(?:\.eu)?\.greenhouse\.io/.test(url)) return null;

  // Workday: must match *.myworkdayjobs.com — NOT www.workday.com/careers
  const workdayMatch = url.match(/https?:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/([^/?#]+)/);
  if (workdayMatch) {
    return { type: 'workday', tenant: workdayMatch[1], instance: workdayMatch[2], site: workdayMatch[3] };
  }

  if (/ats\.rippling\.com/.test(url)) return { type: 'rippling' };

  // Stubs: direct URL detection, no handler yet
  if (/smartrecruiters\.com/.test(url)) {
    const m = url.match(/smartrecruiters\.com\/([^/?#]+)/);
    return { type: 'smartrecruiters', id: m?.[1], stub: true };
  }
  if (/bamboohr\.com/.test(url)) {
    const m = url.match(/([^./]+)\.bamboohr\.com/);
    return { type: 'bamboohr', id: m?.[1], stub: true };
  }
  if (/\.recruitee\.com/.test(url)) {
    const m = url.match(/([^./]+)\.recruitee\.com/);
    return { type: 'recruitee', id: m?.[1], stub: true };
  }
  if (/\.jobs\.personio\.(?:de|com)/.test(url)) {
    const m = url.match(/([^./]+)\.jobs\.personio/);
    return { type: 'personio', id: m?.[1], stub: true };
  }
  if (/teamtailor\.com/.test(url)) return { type: 'teamtailor', stub: true };
  if (/icims\.com/.test(url)) return { type: 'icims', stub: true };

  return { type: 'generic' };
}

// ── Title filter (mirrors scan.mjs) ──────────────────────────────────

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

// ── Dedup (mirrors scan.mjs exactly) ─────────────────────────────────

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
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }
  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g)) {
      const company = match[1].trim().toLowerCase();
      const role = match[2].trim().toLowerCase();
      if (company && role && company !== 'company') {
        seen.add(`${company}::${role}`);
      }
    }
  }
  return seen;
}

// ── Output writers (mirrors scan.mjs exactly) ─────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;
  let text = readFileSync(PIPELINE_PATH, 'utf-8');
  const marker = '## Pendientes';
  const idx = text.indexOf(marker);
  if (idx === -1) {
    const procIdx = text.indexOf('## Procesadas');
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block = `\n${marker}\n\n` + offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') + '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    const block = '\n' + offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') + '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }
  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }
  const lines = offers.map(o =>
    `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\tadded`
  ).join('\n') + '\n';
  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

// ── Fetch helper ──────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, ...options });
  } finally {
    clearTimeout(timer);
  }
}

// ── Workday API handler ───────────────────────────────────────────────

async function handleWorkday(company, atsInfo) {
  const { tenant, instance, site } = atsInfo;
  const baseUrl = `https://${tenant}.${instance}.myworkdayjobs.com`;
  const apiUrl = `${baseUrl}/wday/cxs/${tenant}/${site}/jobs`;

  const jobs = [];
  let offset = 0;
  const limit = 20;

  while (true) {
    const res = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ limit, offset, searchText: '' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const postings = data.jobPostings || [];

    for (const p of postings) {
      if (!p.title || !p.externalPath) continue;
      jobs.push({
        title: p.title,
        url: `${baseUrl}${p.externalPath}`,
        company: company.name,
        location: p.locationsText || '',
        source: 'workday-api',
      });
    }

    if (postings.length < limit) break;
    offset += limit;
    if (offset >= (data.total || 0)) break;
  }

  return jobs;
}

// ── Rippling Playwright handler ───────────────────────────────────────

async function handleRippling(page, company) {
  await page.goto(company.careers_url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);

  const baseHostname = new URL(company.careers_url).hostname;
  return page.evaluate(({ hostname, companyName }) => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({
        title: a.textContent.trim().replace(/\s+/g, ' '),
        url: a.href,
        company: companyName,
        location: '',
        source: 'rippling-playwright',
      }))
      .filter(j => {
        if (!j.title || j.title.length < 5 || j.title.length > 150) return false;
        try { return new URL(j.url).hostname === hostname; } catch { return false; }
      });
  }, { hostname: baseHostname, companyName: company.name });
}

// ── Generic handlers ──────────────────────────────────────────────────

async function extractJobsFromHtml(html, careersUrl, companyName, source) {
  const $ = cheerio.load(html);
  const base = new URL(careersUrl);
  const jobs = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).text().trim().replace(/\s+/g, ' ');
    if (!title || title.length < 5 || title.length > 150) return;

    let fullUrl;
    try {
      fullUrl = href.startsWith('http') ? href : new URL(href, base.origin).href;
    } catch { return; }

    try { if (new URL(fullUrl).hostname !== base.hostname) return; } catch { return; }
    if (!JOB_URL_PATTERNS.some(p => fullUrl.toLowerCase().includes(p))) return;

    jobs.push({ title, url: fullUrl, company: companyName, location: '', source });
  });

  return [...new Map(jobs.map(j => [j.url, j])).values()];
}

async function handleGenericFetch(company) {
  const res = await fetchWithTimeout(company.careers_url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-ops-scanner/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return extractJobsFromHtml(html, company.careers_url, company.name, 'generic-fetch');
}

async function handleGenericPlaywright(page, company) {
  await page.goto(company.careers_url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(2000);

  try {
    const btn = page.locator('button', { hasText: /load more|show more|view more/i }).first();
    if (await btn.isVisible({ timeout: 1000 })) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  const html = await page.content();
  return extractJobsFromHtml(html, company.careers_url, company.name, 'generic-playwright');
}

// ── Tier 2 Playwright discovery + Tier 3 DOM fallback ────────────────
// Navigates once. If network intercept finds an ATS → return discovered.
// If not → extract DOM as Tier 3 (avoids a second navigation).

async function handleWithTier2(company, page, cache, today) {
  let discovered = null;

  const listener = req => {
    if (discovered) return;
    const found = extractAtsFromInterceptedUrl(req.url());
    if (found) discovered = found;
  };

  page.on('request', listener);
  try {
    await page.goto(company.careers_url, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(3000); // allow JS widgets to fire initial API requests
  } catch {
    // navigation failed — attempt DOM extraction regardless
  } finally {
    page.removeListener('request', listener);
  }

  if (discovered) {
    cache[company.name] = { ...discovered, discovered: today };
    return { tier2Discovered: discovered, jobs: null };
  }

  // Tier 3: page already loaded — extract DOM without re-navigating
  cache[company.name] = { ats: 'generic', discovered: today };
  try {
    const btn = page.locator('button', { hasText: /load more|show more|view more/i }).first();
    if (await btn.isVisible({ timeout: 1000 })) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}
  const html = await page.content();
  return {
    tier2Discovered: null,
    jobs: await extractJobsFromHtml(html, company.careers_url, company.name, 'generic-playwright'),
  };
}

// ── Parallel execution ────────────────────────────────────────────────

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => next()));
  return results;
}

async function runWithPlaywrightPool(targets, handler, concurrency) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const results = [];
  let i = 0;

  async function worker() {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    try {
      while (i < targets.length) {
        const target = targets[i++];
        try {
          const jobs = await handler(target, page);
          results.push({ company: target.name, jobs: jobs || [], error: null });
        } catch (err) {
          results.push({ company: target.name, jobs: [], error: err.message });
        }
      }
    } finally {
      await context.close();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  await browser.close();
  return results;
}

// ── Failure logger ────────────────────────────────────────────────────

function logFailures(failures, empties, date) {
  if (failures.length === 0 && empties.length === 0) return;
  mkdirSync(LOGS_DIR, { recursive: true });
  const path = `${LOGS_DIR}/${date}-custom-scraper.log`;
  const lines = [
    `Custom scraper run — ${date}`,
    '',
    failures.length > 0 ? `=== ERRORS (${failures.length}) ===` : '',
    ...failures.map(f => `  ✗ ${f.company}: ${f.error}`),
    '',
    empties.length > 0 ? `=== ZERO JOBS (${empties.length}) — possible JS-render issue or no matching titles ===` : '',
    ...empties.map(e => `  ○ ${e.company} (${e.url}) [${e.ats}]`),
  ].filter(l => l !== undefined);
  writeFileSync(path, lines.join('\n') + '\n', 'utf-8');
  console.log(`\nFailure log written to ${path}`);
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlagIdx = args.indexOf('--company');
  const filterCompany = companyFlagIdx !== -1 ? args[companyFlagIdx + 1]?.toLowerCase() : null;

  mkdirSync('data', { recursive: true });

  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found.');
    process.exit(1);
  }

  const config = yaml.load(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const titleFilter = buildTitleFilter(config.title_filter);
  const today = new Date().toISOString().slice(0, 10);

  // 1. Classify by URL pattern (scan.mjs skip logic)
  const mapped = companies
    .filter(c => c.enabled !== false)
    .filter(c => !filterCompany || c.name.toLowerCase().includes(filterCompany))
    .map(c => ({ ...c, _ats: detectAts(c) }));

  const skippedByScanMjs = mapped.filter(c => c._ats === null).length;
  const customTargets = mapped.filter(c => c._ats !== null);
  const stubs = customTargets.filter(c => c._ats?.stub);
  const active = customTargets.filter(c => !c._ats?.stub);

  const knownApiTargets = active.filter(c => c._ats.type === 'workday');
  const ripplingTargets = active.filter(c => c._ats.type === 'rippling');
  const genericTargets  = active.filter(c => c._ats.type === 'generic');

  // 2. ATS discovery for generic targets
  const cache = loadDiscoveryCache();
  let tier1DiscoveryCount = 0;
  let tier2DiscoveryCount = 0;

  const cacheHits = [];
  const cacheMisses = [];
  for (const company of genericTargets) {
    const entry = cache[company.name];
    if (entry && isCacheValid(entry)) {
      cacheHits.push({ company, cached: entry });
    } else {
      cacheMisses.push(company);
    }
  }

  // Tier 1: HTML regex on cache misses
  if (cacheMisses.length > 0) {
    console.log(`Tier 1 discovery: scanning ${cacheMisses.length} companies...`);
    const tier1Tasks = cacheMisses.map(company => async () => {
      const discovered = await discoverAtsTier1(company.careers_url);
      return { company, discovered };
    });
    const tier1Results = await parallelFetch(tier1Tasks, CONCURRENCY_API);
    for (const { company, discovered } of tier1Results) {
      if (discovered) {
        cache[company.name] = { ...discovered, discovered: today };
        tier1DiscoveryCount++;
        cacheHits.push({ company, cached: discovered });
      } else {
        cacheHits.push({ company, cached: null }); // needs Tier 2
      }
    }
  }

  // 3. Classify post-Tier-1
  const apiDiscovered    = []; // ATS found via Tier 1 or cache
  const cachedGenericList = []; // confirmed generic from cache → fetch-first
  const needsTier2List    = []; // Tier 1 found nothing → needs Playwright

  for (const { company, cached } of cacheHits) {
    if (cached === null) {
      needsTier2List.push(company);
    } else if (cached.ats === 'generic') {
      cachedGenericList.push(company);
    } else {
      apiDiscovered.push({ company, discovered: cached });
    }
  }

  const cacheHitApiCount = apiDiscovered.length - tier1DiscoveryCount;

  console.log(`\nCustom scraper — skipping ${skippedByScanMjs} companies (handled by scan.mjs)`);
  console.log(`Targets: ${active.length} active, ${stubs.length} stubs`);
  console.log(`  Workday (direct URL):       ${knownApiTargets.length}`);
  console.log(`  API via discovery:          ${apiDiscovered.length} (${tier1DiscoveryCount} new, ${cacheHitApiCount} from cache)`);
  console.log(`  Fetch-first (cached gen):   ${cachedGenericList.length}`);
  console.log(`  Needs Tier 2 (Playwright):  ${needsTier2List.length}`);
  console.log(`  Rippling:                   ${ripplingTargets.length}`);
  if (dryRun) console.log('(dry run — no files will be written)\n');

  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  let totalFound = 0, totalFiltered = 0, totalDupes = 0;
  const newOffers = [];
  const errors = [];
  const empties = [];

  function processJobs(jobs, companyName, careersUrl, atsLabel) {
    totalFound += jobs.length;
    let added = 0;
    for (const job of jobs) {
      if (!titleFilter(job.title)) { totalFiltered++; continue; }
      if (seenUrls.has(job.url)) { totalDupes++; continue; }
      const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
      if (seenCompanyRoles.has(key)) { totalDupes++; continue; }
      seenUrls.add(job.url);
      seenCompanyRoles.add(key);
      newOffers.push(job);
      added++;
    }
    if (jobs.length === 0 || added === 0) {
      empties.push({ company: companyName, url: careersUrl, ats: atsLabel });
    }
  }

  // 4. API tasks: known Workday + all ATS-discovered
  const allApiTasks = [
    ...knownApiTargets.map(c => async () => {
      try {
        processJobs(await handleWorkday(c, c._ats), c.name, c.careers_url, 'workday');
      } catch (err) { errors.push({ company: c.name, error: err.message }); }
    }),
    ...apiDiscovered.map(({ company, discovered }) => async () => {
      try {
        processJobs(await dispatchToDiscoveredApi(company, discovered), company.name, company.careers_url, discovered.ats);
      } catch (err) { errors.push({ company: company.name, error: err.message }); }
    }),
  ];
  if (allApiTasks.length > 0) await parallelFetch(allApiTasks, CONCURRENCY_API);

  // 5. Fetch-first for confirmed generics; overflow to Playwright if empty
  const fetchEmptyForPlaywright = [];
  if (cachedGenericList.length > 0) {
    const fetchTasks = cachedGenericList.map(c => async () => {
      try {
        const jobs = await handleGenericFetch(c);
        if (jobs.length > 0) {
          processJobs(jobs, c.name, c.careers_url, 'generic-fetch');
        } else {
          fetchEmptyForPlaywright.push(c);
        }
      } catch {
        fetchEmptyForPlaywright.push(c);
      }
    });
    await parallelFetch(fetchTasks, CONCURRENCY_API);
  }

  // 6. Playwright pool: Rippling + Tier 2 discovery + generic fallback
  const playwrightTargets = [
    ...ripplingTargets.map(c => ({ ...c, _pw: 'rippling' })),
    ...needsTier2List.map(c => ({ ...c, _pw: 'tier2' })),
    ...fetchEmptyForPlaywright.map(c => ({ ...c, _pw: 'generic' })),
  ];

  const tier2DiscoveryMap = new Map(); // company.name → { company, discovered }

  if (playwrightTargets.length > 0) {
    const playwrightResults = await runWithPlaywrightPool(
      playwrightTargets,
      async (company, page) => {
        switch (company._pw) {
          case 'rippling': return handleRippling(page, company);
          case 'tier2': {
            const { tier2Discovered, jobs } = await handleWithTier2(company, page, cache, today);
            if (tier2Discovered) {
              tier2DiscoveryMap.set(company.name, { company, discovered: tier2Discovered });
              tier2DiscoveryCount++;
              return [];
            }
            return jobs || [];
          }
          case 'generic': return handleGenericPlaywright(page, company);
          default: return [];
        }
      },
      CONCURRENCY_PLAYWRIGHT
    );

    for (const result of playwrightResults) {
      if (result.error) {
        errors.push({ company: result.company, error: result.error });
        continue;
      }
      // Tier 2 discoveries are API-dispatched below — skip DOM results for them
      if (tier2DiscoveryMap.has(result.company)) continue;

      const target = playwrightTargets.find(c => c.name === result.company);
      processJobs(result.jobs, result.company, target?.careers_url || '', target?._pw || 'unknown');
    }

    // 7. API calls for Tier 2 discovered companies
    if (tier2DiscoveryMap.size > 0) {
      const tier2ApiTasks = Array.from(tier2DiscoveryMap.values()).map(
        ({ company, discovered }) => async () => {
          try {
            processJobs(await dispatchToDiscoveredApi(company, discovered), company.name, company.careers_url, discovered.ats);
          } catch (err) {
            errors.push({ company: company.name, error: err.message });
          }
        }
      );
      await parallelFetch(tier2ApiTasks, CONCURRENCY_API);
    }
  }

  // 8. Save discovery cache (always — it's optimization state, not user data)
  saveDiscoveryCache(cache);

  // 9. Write pipeline + history
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, today);
  }

  if (!dryRun) logFailures(errors, empties, today);

  // 10. Summary
  console.log(`\n${'━'.repeat(50)}`);
  console.log(`Custom Scraper — ${today}`);
  console.log(`${'━'.repeat(50)}`);
  console.log(`Companies targeted:            ${active.length}`);
  console.log(`  Workday (direct URL):        ${knownApiTargets.length}`);
  console.log(`  ATS discovered (Tier 1):     ${tier1DiscoveryCount}`);
  console.log(`  ATS discovered (Tier 2):     ${tier2DiscoveryCount}`);
  console.log(`  API from cache:              ${cacheHitApiCount}`);
  console.log(`  Fetch-first (cached gen):    ${cachedGenericList.length}`);
  console.log(`  Playwright Tier 2/3:         ${needsTier2List.length}`);
  console.log(`  Playwright fallback:         ${fetchEmptyForPlaywright.length}`);
  console.log(`  Rippling:                    ${ripplingTargets.length}`);
  console.log(`  Stubs (skipped):             ${stubs.length}`);
  console.log(`Total jobs found:              ${totalFound}`);
  console.log(`Filtered by title:             ${totalFiltered} removed`);
  console.log(`Duplicates:                    ${totalDupes} skipped`);
  console.log(`New offers added:              ${newOffers.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  ✗ ${e.company}: ${e.error}`);
  }

  if (stubs.length > 0) {
    console.log(`\nStubs (detected but not yet implemented):`);
    for (const c of stubs) console.log(`  ~ ${c.name} (${c._ats.type})`);
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of newOffers) console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log('\n→ Run /career-ops pipeline to evaluate new offers.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
