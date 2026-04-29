#!/usr/bin/env node
import { readFileSync } from 'fs';
const API_KEY = readFileSync('.firecrawl-key', 'utf-8').match(/FIRECRAWL_API_KEY=(\S+)/)[1];

async function getLinks(url) {
  const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['links'], onlyMainContent: false, waitFor: 2000 }),
  });
  const j = await r.json();
  return j.data?.links || [];
}

for (const url of [
  'https://www.jasper.ai/careers',
  'https://www.sifive.com/careers',
  'https://careers.expediagroup.com/',
  'https://www.cloudflare.com/careers/',
  'https://www.shopify.com/careers',
]) {
  const links = await getLinks(url);
  const interesting = links.filter(l =>
    /ashbyhq|greenhouse\.io|lever\.co|myworkdayjobs|smartrecruiters|\/jobs?\/|\/career|\/position|\/opening/i.test(l)
  );
  console.log(`\n=== ${url} (${links.length} total links, ${interesting.length} interesting) ===`);
  interesting.slice(0, 20).forEach(l => console.log('  ' + l));
}
