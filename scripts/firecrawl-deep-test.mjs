#!/usr/bin/env node
// Deeper inspection: scrape one Shopify job page + Cloudflare's /careers/jobs/
import { readFileSync, writeFileSync } from 'fs';
const API_KEY = readFileSync('.firecrawl-key', 'utf-8').match(/FIRECRAWL_API_KEY=(\S+)/)[1];

async function scrape(url, opts = {}) {
  const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: true, waitFor: 2000, ...opts }),
  });
  return r.json();
}

const TARGETS = [
  // Shopify: a specific job posting (validates JD content quality for enrich-jobs.mjs)
  { label: 'shopify-job', url: 'https://www.shopify.com/careers/senior-product-marketing-lead_5794e6be-cedd-41cf-baef-31ad1b76e2ae' },
  // Cloudflare: inner /careers/jobs/ page (validates Cloudflare actually has job list one click in)
  { label: 'cloudflare-inner', url: 'https://www.cloudflare.com/careers/jobs/' },
  // Expedia: drill into one team listing
  { label: 'expedia-tech', url: 'https://careers.expediagroup.com/technology' },
];

for (const { label, url } of TARGETS) {
  console.log(`\n=== ${label} (${url}) ===`);
  const j = await scrape(url);
  const md = j.data?.markdown || '';
  const links = j.data?.links || [];
  console.log(`md=${md.length} chars, links=${links.length}`);
  // Surface comp/location/yoe-relevant lines
  const interesting = md.split('\n').filter(l =>
    /\$\d|salary|compensation|toronto|canada|remote|years? of experience|senior|principal/i.test(l)
  ).slice(0, 8);
  console.log('Signal-relevant lines (first 8):');
  interesting.forEach(l => console.log('  | ' + l.trim().slice(0, 200)));
  writeFileSync(`scripts/firecrawl-smoke-out/${label}.md`,
    `# ${label}\nURL: ${url}\nLength: ${md.length}\nLinks: ${links.length}\n\n## Markdown\n\n${md.slice(0, 8000)}\n\n## Links\n${links.slice(0, 50).map(l => '- ' + l).join('\n')}`,
    'utf-8');
}
