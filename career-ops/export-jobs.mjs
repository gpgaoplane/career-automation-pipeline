#!/usr/bin/env node
// export-jobs.mjs — converts pipeline + scan history to Excel with pre-scoring
// Reads: data/pipeline.md, data/scan-history.tsv, portals.yml,
//        data/job-descriptions-cache.json (if present)
// Writes: output/jobs-YYYY-MM-DD.xlsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI ──────────────────────────────────────────────────────────────

function parseFlags(argv) {
  const f = { topN: null, skipEnrich: false, cacheWarnThreshold: 80 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--top') f.topN = parseInt(argv[++i], 10);
    else if (a === '--skip-enrich') f.skipEnrich = true;
    else if (a === '--cache-warn-threshold') f.cacheWarnThreshold = parseInt(argv[++i], 10);
    else throw new Error(`Unknown flag: ${a}`);
  }
  return f;
}

// ── portals.yml parsing ──────────────────────────────────────────────

function loadCompanyMap() {
  const raw = fs.readFileSync(path.join(__dirname, 'portals.yml'), 'utf8');
  const parsed = yaml.load(raw);
  const map = new Map();
  for (const c of parsed.tracked_companies || []) {
    map.set(c.name, { rank: c.rank ?? Infinity, category: c.category ?? '' });
  }
  return map;
}

// Comment-group → track code lookup. Per design §6.2.
const GROUP_TO_TRACK = {
  'AI / ML Engineering': 'AI-ENG',
  'Solutions / Technical Advisory': 'SA',
  'Sales / Business Development': 'AE',
  'Product Management': 'PM',
  'Consulting / Advisory': 'CONSULT',
  'Generative AI Engineering': 'GEN-AI',
  'Creative': 'CREATIVE',
  'Broad AI roles': 'AI-ENG',
};

function parseTrackMappingFromYaml(yamlPath) {
  // Walk file as text (NOT via js-yaml — we need comment groups).
  // /^\s*#\s*──\s*(.+?)\s*──/ detects a group header.
  // Map keyword (case-insensitive) → track code via GROUP_TO_TRACK.
  const text = fs.readFileSync(yamlPath, 'utf8');
  const map = new Map();
  let inPositive = false;
  let currentTrack = null;
  for (const line of text.split('\n')) {
    if (/^\s*positive:\s*$/.test(line)) { inPositive = true; continue; }
    if (/^\s*negative:\s*$/.test(line)) { inPositive = false; continue; }
    if (!inPositive) continue;
    const groupMatch = line.match(/^\s*#\s*──\s*(.+?)\s*──/);
    if (groupMatch) {
      currentTrack = GROUP_TO_TRACK[groupMatch[1].trim()] || null;
      continue;
    }
    const itemMatch = line.match(/^\s*-\s*"([^"]+)"\s*$/);
    if (itemMatch && currentTrack) {
      map.set(itemMatch[1].toLowerCase(), currentTrack);
    }
  }
  return map;
}

// ── pipeline + scan history parsing ──────────────────────────────────

function parsePipelineMd(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const jobs = [];
  let inPending = false;
  for (const line of lines) {
    if (line.startsWith('## Pendientes')) { inPending = true; continue; }
    if (line.startsWith('## Procesadas')) break;
    if (!inPending) continue;
    if (!line.startsWith('- [ ] ')) continue;
    const content = line.slice('- [ ] '.length);
    const first = content.indexOf(' | ');
    if (first === -1) continue;
    const second = content.indexOf(' | ', first + 3);
    if (second === -1) continue;
    const url = content.slice(0, first).trim();
    const company = content.slice(first + 3, second).trim();
    const title = content.slice(second + 3).trim();
    jobs.push({ url, company, title });
  }
  return jobs;
}

function parseScanHistory(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 6) continue;
    rows.push({
      url: parts[0], first_seen: parts[1], portal: parts[2],
      title: parts[3], company: parts[4], status: parts[5],
    });
  }
  return rows;
}

// ── Pre-scoring ──────────────────────────────────────────────────────

const TRACK_WEIGHTS = { 'AI-ENG': 5, 'GEN-AI': 5, 'SA': 4, 'PM': 4, 'CONSULT': 3, 'CREATIVE': 3, 'AE': 3 };

// Will-preferred categories. Per design §7.3 + QI-3 + Codex Q-3 review.
// Includes Foundation Models, AI Sales / GTM AI, AI Data Labeling /
// Programmatic. EXCLUDES "AI Chatbot / Consumer" (xAI/Grok is disabled;
// consumer chatbots not Will's target track).
const PREFERRED_CATEGORIES = new Set([
  'AI Agents', 'AI 3D Generation', 'AI Video Generation', 'AI Video Understanding',
  'AI Video / Avatar Generation', 'AI Video/Audio Editing',
  'AI Coding Tools', 'AI Coding Assistant', 'AI Coding / Vibe-Coding', 'AI Coding CLI',
  'AI Embeddings', 'AI Embeddings / Open-Source',
  'AI Cloud Infrastructure',
  'AI Healthcare', 'AI Financial Planning',
  'Data Cloud / AI Features', 'Data Integration / AI Pipeline',
  'AI Data Labeling', 'AI Data Labeling / Programmatic',
  'AI Foundation Models', 'Foundation Models',
  'AI Sales / GTM AI',
]);

function deriveMatchTrack(title, trackMap) {
  const lower = title.toLowerCase();
  const matched = new Set();
  for (const [keyword, track] of trackMap) {
    if (lower.includes(keyword)) matched.add(track);
  }
  return [...matched];
}

function computeTitleScore(job, trackMap, companyMap) {
  const tracks = deriveMatchTrack(job.title, trackMap);
  const meta = companyMap.get(job.company);
  const rank = meta?.rank ?? 9999;
  const category = meta?.category ?? '';
  const rankTier = rank <= 50 ? 4 : rank <= 150 ? 3 : rank <= 300 ? 2 : 1;
  const categoryBonus = PREFERRED_CATEGORIES.has(category) ? 2 : 0;

  const titleLower = job.title.toLowerCase();
  let titleStrength = 0;
  if (/\b(senior|sr\.?|principal)\b/i.test(titleLower)) titleStrength = -5;
  else if (/\b(junior|jr\.?|associate)\b/i.test(titleLower)) titleStrength = -2;
  // Note: intern/internship jobs are dropped entirely at output time, not penalized here.

  if (tracks.length === 0) {
    return { tracks: ['?'], score: rankTier + categoryBonus + titleStrength,
             breakdown: `track=? rank=${rankTier} ${categoryBonus ? '+2cat' : ''} ${titleStrength ? `${titleStrength}strength` : ''}` };
  }

  const trackWeight = Math.max(...tracks.map(t => TRACK_WEIGHTS[t] || 0));
  const multiTrackBonus = tracks.length >= 2 ? 1 : 0;
  const score = trackWeight + multiTrackBonus + rankTier + categoryBonus + titleStrength;
  const parts = [
    `track=${tracks.join('+')}(${trackWeight})`,
    multiTrackBonus ? '+1multi' : '',
    `rank=${rankTier}`,
    categoryBonus ? '+2cat' : '',
    titleStrength ? `${titleStrength}strength` : '',
  ].filter(Boolean).join(' ');
  return { tracks, score, breakdown: parts };
}

function computeDescScore(signals) {
  if (!signals) return { score: 0, breakdown: 'no enrichment cache hit' };
  let score = 0;
  const parts = [];
  // Toronto/GTA/Ontario / Hybrid Toronto / Canada-only — collapse to single +2
  const torontoHit = (signals.location_match || []).some(l => /toronto|gta|ontario|canada-only/i.test(l));
  if (torontoHit) { score += 2; parts.push('+2 Toronto/CA'); }
  // Fully remote US: +4
  if ((signals.location_match || []).some(l => /fully remote us/i.test(l))) {
    score += 4; parts.push('+4 remote-US');
  }
  // Comp signal: ±1 per $10K vs floor (lower bound)
  if (signals.comp_low_thousands && signals.comp_currency && signals.comp_currency !== 'unknown') {
    const floor = signals.comp_currency === 'USD' ? 120 : 110;
    const delta = Math.floor((signals.comp_low_thousands - floor) / 10);
    score += delta;
    parts.push(`${delta >= 0 ? '+' : ''}${delta} comp(${signals.comp_currency})`);
  }
  // Track keywords: +1 per unique, cap +3
  const kwBonus = Math.min(3, (signals.track_keywords_matched || []).length);
  if (kwBonus > 0) { score += kwBonus; parts.push(`+${kwBonus} kw`); }
  // Tech stack: +1 per unique, cap +2
  const techBonus = Math.min(2, (signals.tech_stack_matched || []).length);
  if (techBonus > 0) { score += techBonus; parts.push(`+${techBonus} tech`); }
  // YoE
  if (signals.yoe_signal === '3-5') { score += 1; parts.push('+1 yoe35'); }
  else if (signals.yoe_signal === '6+') { score -= 1; parts.push('-1 yoe6+'); }
  else if (signals.yoe_signal === '0-2') { score -= 1; parts.push('-1 yoe02'); }
  // Note: deal-breaker jobs are dropped entirely at output time (see main());
  // no score penalty here.
  return { score, breakdown: parts.join(' ') || '0' };
}

function computeBand(preScore) {
  if (preScore >= 18) return 'S';
  if (preScore >= 8) return 'A';
  if (preScore >= 4) return 'B';
  return 'C';
}

// ── Excel helpers ────────────────────────────────────────────────────

function styleHeader(row) {
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  row.alignment = { vertical: 'middle' };
}

function autoWidth(sheet, minWidth = 10, maxWidth = 80) {
  sheet.columns.forEach(col => {
    let max = minWidth;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, maxWidth);
  });
}

const BAND_FILLS = { 'S': 'FFC6EFCE', 'A': 'FFFFEB9C', 'B': 'FFE7E6E6', 'C': 'FFFFC7CE' };

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const flags = parseFlags(process.argv);

  const companyMap = loadCompanyMap();
  const trackMap = parseTrackMappingFromYaml(path.join(__dirname, 'portals.yml'));
  const jobs = parsePipelineMd(path.join(__dirname, 'data/pipeline.md'));
  const history = parseScanHistory(path.join(__dirname, 'data/scan-history.tsv'));

  let cache = {};
  if (!flags.skipEnrich) {
    try {
      cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/job-descriptions-cache.json'), 'utf8'));
    } catch {}
  }

  // Score every job. flatMap because some jobs are dropped entirely:
  //   • intern/internship titles (Will targets mid-level only per D-7).
  //   • jobs with deal_breaker_signal (PhD required, no sponsorship for
  //     remote, in-office 5 days non-Toronto). User opted to drop these
  //     rather than penalize, so the slot doesn't waste manual-review attention.
  let droppedIntern = 0;
  let droppedDealBreaker = 0;
  const jobsScored = jobs.flatMap(job => {
    if (/\b(intern|internship)\b/i.test(job.title)) {
      droppedIntern++;
      return [];
    }
    const signals = cache[job.url]?.extracted_signals;
    if (signals?.deal_breaker_signal) {
      droppedDealBreaker++;
      return [];
    }
    const titleResult = computeTitleScore(job, trackMap, companyMap);
    const descResult = computeDescScore(signals);
    const preScore = titleResult.score + descResult.score;
    const band = computeBand(preScore);
    return [{
      ...job,
      match_track: titleResult.tracks.join(', '),
      title_score: titleResult.score,
      desc_score: descResult.score,
      pre_score: preScore,
      priority_band: band,
      score_notes: `${titleResult.breakdown} | ${descResult.breakdown}`,
    }];
  });
  if (droppedIntern > 0 || droppedDealBreaker > 0) {
    console.log(`Dropped at output: ${droppedIntern} intern, ${droppedDealBreaker} deal-breaker`);
  }

  // Sort: pre_score desc, rank asc, company asc, title asc
  jobsScored.sort((a, b) => {
    if (b.pre_score !== a.pre_score) return b.pre_score - a.pre_score;
    const ra = companyMap.get(a.company)?.rank ?? Infinity;
    const rb = companyMap.get(b.company)?.rank ?? Infinity;
    if (ra !== rb) return ra - rb;
    if (a.company !== b.company) return a.company.localeCompare(b.company);
    return a.title.localeCompare(b.title);
  });

  let filteredJobs = jobsScored;
  if (flags.topN) filteredJobs = jobsScored.slice(0, flags.topN);

  // Cache hit-rate warning
  const cacheHits = jobs.filter(j => cache[j.url]?.extracted_signals).length;
  const hitRate = jobs.length > 0 ? (cacheHits / jobs.length) * 100 : 100;
  if (!flags.skipEnrich && hitRate < flags.cacheWarnThreshold) {
    console.warn(`[WARN] Cache hit rate ${hitRate.toFixed(1)}% < threshold ${flags.cacheWarnThreshold}%. Run 'npm run enrich' to populate.`);
  }

  // Workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'career-ops';
  wb.created = new Date();

  // Sheet 1: Pending Jobs
  const pendingSheet = wb.addWorksheet('Pending Jobs');
  pendingSheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Title', key: 'title', width: 50 },
    { header: 'URL', key: 'url', width: 60 },
    { header: 'Match Track', key: 'match_track', width: 18 },
    { header: 'Title Score', key: 'title_score', width: 11 },
    { header: 'Desc Score', key: 'desc_score', width: 11 },
    { header: 'Pre-Score', key: 'pre_score', width: 11 },
    { header: 'Band', key: 'priority_band', width: 7 },
    { header: 'Score Notes', key: 'score_notes', width: 40 },
  ];
  styleHeader(pendingSheet.getRow(1));
  pendingSheet.views = [{ state: 'frozen', ySplit: 1 }];
  pendingSheet.autoFilter = { from: 'A1', to: 'K1' };

  for (const job of filteredJobs) {
    const meta = companyMap.get(job.company);
    pendingSheet.addRow({
      rank: meta?.rank ?? '',
      company: job.company,
      category: meta?.category ?? '',
      title: job.title,
      url: job.url,
      match_track: job.match_track,
      title_score: job.title_score,
      desc_score: job.desc_score,
      pre_score: job.pre_score,
      priority_band: job.priority_band,
      score_notes: job.score_notes,
    });
  }
  // Per-row band fill
  pendingSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const band = row.getCell('priority_band').value;
    if (BAND_FILLS[band]) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND_FILLS[band] } };
    }
  });
  autoWidth(pendingSheet);

  // Sheet 2: By Company (with pre_score aggregates)
  const byCompanySheet = wb.addWorksheet('By Company');
  byCompanySheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Pending Jobs', key: 'count', width: 14 },
    { header: 'Pre-Score Max', key: 'pre_score_max', width: 14 },
    { header: 'Pre-Score Avg', key: 'pre_score_avg', width: 14 },
    { header: 'S-Tier Count', key: 's_tier_count', width: 13 },
  ];
  styleHeader(byCompanySheet.getRow(1));
  byCompanySheet.views = [{ state: 'frozen', ySplit: 1 }];
  byCompanySheet.autoFilter = { from: 'A1', to: 'G1' };

  // Aggregate per company across ALL scored jobs (not filtered by --top)
  const byCompany = new Map();
  for (const j of jobsScored) {
    if (!byCompany.has(j.company)) byCompany.set(j.company, []);
    byCompany.get(j.company).push(j);
  }
  const byCompanyRows = [...byCompany.entries()]
    .map(([company, list]) => {
      const scores = list.map(x => x.pre_score);
      return {
        rank: companyMap.get(company)?.rank ?? Infinity,
        company,
        category: companyMap.get(company)?.category ?? '',
        count: list.length,
        pre_score_max: Math.max(...scores),
        pre_score_avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        s_tier_count: list.filter(x => x.priority_band === 'S').length,
      };
    })
    .sort((a, b) => {
      if (b.pre_score_max !== a.pre_score_max) return b.pre_score_max - a.pre_score_max;
      return a.rank - b.rank;
    });

  for (const row of byCompanyRows) {
    byCompanySheet.addRow({
      rank: row.rank === Infinity ? '' : row.rank,
      company: row.company,
      category: row.category,
      count: row.count,
      pre_score_max: row.pre_score_max,
      pre_score_avg: row.pre_score_avg,
      s_tier_count: row.s_tier_count,
    });
  }
  autoWidth(byCompanySheet);

  // Sheet 3: Scan History
  const historySheet = wb.addWorksheet('Scan History');
  historySheet.columns = [
    { header: 'URL', key: 'url', width: 60 },
    { header: 'First Seen', key: 'first_seen', width: 14 },
    { header: 'Portal', key: 'portal', width: 16 },
    { header: 'Title', key: 'title', width: 50 },
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  styleHeader(historySheet.getRow(1));
  historySheet.views = [{ state: 'frozen', ySplit: 1 }];
  historySheet.autoFilter = { from: 'A1', to: 'F1' };

  for (const row of history) historySheet.addRow(row);
  autoWidth(historySheet);

  fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const outPath = path.join(__dirname, `output/jobs-${today}.xlsx`);
  await wb.xlsx.writeFile(outPath);

  const bandCounts = { S: 0, A: 0, B: 0, C: 0 };
  for (const j of jobsScored) bandCounts[j.priority_band]++;
  console.log(`Exported ${filteredJobs.length}/${jobsScored.length} pending jobs (${cacheHits} cache hits, ${hitRate.toFixed(1)}%), ${byCompanyRows.length} companies, ${history.length} scan history rows`);
  console.log(`Bands: S=${bandCounts.S} A=${bandCounts.A} B=${bandCounts.B} C=${bandCounts.C}`);
  console.log(`Output: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
