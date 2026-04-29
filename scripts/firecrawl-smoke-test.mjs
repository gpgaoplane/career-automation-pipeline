#!/usr/bin/env node
/**
 * Firecrawl smoke test — 5 careers pages.
 * Usage: FIRECRAWL_API_KEY=fc-... node scripts/firecrawl-smoke-test.mjs
 * Or:    node scripts/firecrawl-smoke-test.mjs   (reads .firecrawl-key)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const API_KEY = process.env.FIRECRAWL_API_KEY
  || readFileSync('.firecrawl-key', 'utf-8').match(/FIRECRAWL_API_KEY=(\S+)/)?.[1];
if (!API_KEY) { console.error('No API key'); process.exit(1); }

const TARGETS = [
  { co: 'Jasper',        url: 'https://www.jasper.ai/careers' },
  { co: 'SiFive',        url: 'https://www.sifive.com/careers' },
  { co: 'Expedia Group', url: 'https://careers.expediagroup.com/' },
  { co: 'Cloudflare',    url: 'https://www.cloudflare.com/careers/' },
  { co: 'Shopify',       url: 'https://www.shopify.com/careers' },
];

mkdirSync('scripts/firecrawl-smoke-out', { recursive: true });

async function scrape(url, opts = {}) {
  const body = {
    url,
    formats: opts.formats || ['markdown', 'links'],
    onlyMainContent: opts.onlyMainContent !== false,
    waitFor: opts.waitFor ?? 2000,
    ...(opts.actions ? { actions: opts.actions } : {}),
  };
  const t0 = Date.now();
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const dt = Date.now() - t0;
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, dt, json };
}

function summarize(co, url, label, r) {
  if (!r.ok) {
    return { co, url, label, ok: false, dt: r.dt, status: r.status, error: r.json?.error || JSON.stringify(r.json).slice(0, 200) };
  }
  const md = r.json?.data?.markdown || '';
  const links = r.json?.data?.links || [];
  const meta = r.json?.data?.metadata || {};

  // Heuristic: count plausible "job"-like links
  const jobLikeLinks = links.filter(l => /\/(jobs?|careers?|positions?|openings?|posting|apply)\//i.test(l));
  const ashbyLinks = links.filter(l => /jobs\.ashbyhq\.com/i.test(l));
  const greenhouseLinks = links.filter(l => /(boards|job-boards)\.greenhouse\.io/i.test(l));
  const leverLinks = links.filter(l => /jobs\.lever\.co/i.test(l));
  const workdayLinks = links.filter(l => /myworkdayjobs\.com/i.test(l));
  const smartrecruitersLinks = links.filter(l => /smartrecruiters\.com/i.test(l));

  // Plausible ATS detected via direct link
  const atsHints = [];
  if (ashbyLinks.length) atsHints.push(`ashby(${ashbyLinks.length})`);
  if (greenhouseLinks.length) atsHints.push(`greenhouse(${greenhouseLinks.length})`);
  if (leverLinks.length) atsHints.push(`lever(${leverLinks.length})`);
  if (workdayLinks.length) atsHints.push(`workday(${workdayLinks.length})`);
  if (smartrecruitersLinks.length) atsHints.push(`smartrecruiters(${smartrecruitersLinks.length})`);

  // Save raw markdown for human inspection
  const safeName = co.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  writeFileSync(`scripts/firecrawl-smoke-out/${safeName}-${label}.md`,
    `# ${co} — ${label}\n\n**URL:** ${url}\n**Status:** ${r.status}\n**Latency:** ${r.dt}ms\n**Title:** ${meta.title || ''}\n\n## Markdown (${md.length} chars)\n\n${md.slice(0, 5000)}\n\n${md.length > 5000 ? '\n...[truncated]\n' : ''}\n\n## Links (${links.length} total, first 30)\n\n${links.slice(0, 30).map(l => '- ' + l).join('\n')}\n`,
    'utf-8'
  );

  return {
    co, url, label, ok: true, dt: r.dt, status: r.status,
    md_chars: md.length,
    md_first_200: md.slice(0, 200).replace(/\s+/g, ' ').trim(),
    links_total: links.length,
    job_like_links: jobLikeLinks.length,
    ats_hints: atsHints.length ? atsHints.join(', ') : 'none',
    title: meta.title || '',
  };
}

const results = [];
for (const { co, url } of TARGETS) {
  console.log(`\n=== ${co} (${url}) ===`);

  // PASS 1: bare scrape (no actions)
  console.log('  pass 1: bare scrape...');
  const r1 = await scrape(url);
  const s1 = summarize(co, url, 'bare', r1);
  console.log(`    ${s1.ok ? 'OK' : 'FAIL'} dt=${s1.dt}ms md=${s1.md_chars || 0} links=${s1.links_total || 0} jobLike=${s1.job_like_links || 0} ats=${s1.ats_hints || ''}`);
  results.push(s1);

  // PASS 2: with click-button action — try common selectors
  if (s1.ok && (s1.job_like_links === 0 || s1.ats_hints === 'none')) {
    console.log('  pass 2: with click action...');
    const r2 = await scrape(url, {
      actions: [
        { type: 'wait', milliseconds: 2000 },
        // Click any link/button containing common career CTA text. Firecrawl supports
        // CSS selector clicks; we try a permissive selector that hits "Apply", "View",
        // "See", "Browse", "Open", "Search" job-related buttons.
        { type: 'click', selector: 'a[href*="job"], button[href*="job"], a[href*="career"], a[href*="apply"], a[class*="job"], a[data-test*="job"]' },
        { type: 'wait', milliseconds: 3000 },
      ],
    });
    const s2 = summarize(co, url, 'click', r2);
    console.log(`    ${s2.ok ? 'OK' : 'FAIL'} dt=${s2.dt}ms md=${s2.md_chars || 0} links=${s2.links_total || 0} jobLike=${s2.job_like_links || 0} ats=${s2.ats_hints || ''}`);
    if (!s2.ok) console.log(`    err: ${s2.error}`);
    results.push(s2);
  }
}

console.log('\n\n=== SMOKE TEST SUMMARY ===\n');
console.log('| Company | Pass | Status | Latency | MD chars | Links | Job-like | ATS hints |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of results) {
  console.log(`| ${r.co} | ${r.label} | ${r.ok ? r.status : 'FAIL'} | ${r.dt}ms | ${r.md_chars ?? 0} | ${r.links_total ?? 0} | ${r.job_like_links ?? 0} | ${r.ats_hints ?? r.error ?? ''} |`);
}

writeFileSync('scripts/firecrawl-smoke-out/_summary.json', JSON.stringify(results, null, 2));
console.log('\nFull markdown dumps in: scripts/firecrawl-smoke-out/');
