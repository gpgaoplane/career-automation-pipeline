#!/usr/bin/env node
// export-jobs.mjs — converts pipeline + scan history to Excel with V10 filter rules
// Reads: data/pipeline.md, data/scan-history.tsv, portals.yml,
//        data/job-descriptions-cache.json (if present)
// Writes: output/jobs-YYYY-MM-DD.xlsx
//
// V10 wire (2026-05-08): scoring is delegated to scripts/lib/job-fit-rules.mjs
// (single source of truth). Source-hygiene gate, hard-drop routing, and
// shadow_score/shadow_band semantics mirror the audit script at
// scripts/production-filter-refinement-audit.mjs. See plan at
// docs/plans/2026-05-08-v10-production-wiring.md.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import ExcelJS from 'exceljs';

import { parseJdSections } from '../scripts/lib/jd-sections.mjs';
import { scoreJob, formatScoreReasons } from '../scripts/lib/job-fit-rules.mjs';
import { detectSourceHygiene } from '../scripts/production-filter-refinement-audit.mjs';

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
  const jobs = parsePipelineMd(path.join(__dirname, 'data/pipeline.md'));
  const history = parseScanHistory(path.join(__dirname, 'data/scan-history.tsv'));

  let cache = {};
  if (!flags.skipEnrich) {
    try {
      cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/job-descriptions-cache.json'), 'utf8'));
    } catch {}
  }

  // Layered scoring loop (V10 wire). flatMap because rows drop entirely on:
  //   • intern title (Will targets mid-level only per D-7)
  //   • signals.deal_breaker_signal (PhD-required, no-sponsorship-remote,
  //     onsite-5-days-non-Toronto, hybrid-non-Toronto). Conservative R2 path
  //     keeps this layer alongside V10 — V10 likely re-catches location-shaped
  //     cases via decideLocation, but PhD-required and no-sponsorship-remote
  //     have no obvious V10 equivalent. Revisit after Will reviews regenerated
  //     workbook.
  //   • V10 hard-drop (territory/sales/yoe/comp/location)
  //   • source-hygiene-invalid OR scoreJob source-repair-route annotation —
  //     routed to Source Repair Review sheet rather than Pending Jobs
  let droppedIntern = 0;
  let droppedDealBreaker = 0;
  const droppedHardByReason = {};   // reason → count (multi-reason rows count in each)
  const droppedHardUrls = new Set();  // url-set for headline row count
  const sourceRepairRows = [];

  const jobsScored = jobs.flatMap(job => {
    if (/\b(intern|internship)\b/i.test(job.title)) {
      droppedIntern++;
      return [];
    }

    const cacheEntry = cache[job.url] || {};
    const rawSignals = cacheEntry.extracted_signals || {};
    const contentText = cacheEntry.content_text || '';

    if (rawSignals.deal_breaker_signal) {
      droppedDealBreaker++;
      return [];
    }

    const sourceHygiene = detectSourceHygiene({ job, cacheEntry, text: contentText });
    const usableText = sourceHygiene.invalid ? '' : contentText;
    const sections = usableText ? parseJdSections(usableText) : [];
    const scoreSignals = sourceHygiene.invalid ? {} : rawSignals;
    const companyMeta = companyMap.get(job.company) || { rank: 9999, category: '' };

    const result = scoreJob({ job, companyMeta, signals: scoreSignals, textSections: sections });

    // Hard-drop routing. Source-hygiene-invalid rows do NOT hard-drop —
    // they route to source-repair (mirrors shadow audit line 348).
    if (!sourceHygiene.invalid && result.hard_drop) {
      const reasons = result.hard_drop_reason.split(';').map(s => s.trim()).filter(Boolean);
      for (const r of reasons) droppedHardByReason[r] = (droppedHardByReason[r] || 0) + 1;
      droppedHardUrls.add(job.url);
      return [];
    }

    // Source-repair routing (mirrors shadow audit line 322).
    const isSourceRepair = sourceHygiene.invalid
      || result.annotations.includes('source_repair_or_cache_miss_review');
    if (isSourceRepair) {
      sourceRepairRows.push({
        company: job.company,
        title: job.title,
        url: job.url,
        cache_hit: cacheEntry?.extracted_signals ? 'yes' : 'no',
        source_repair_reason: sourceHygiene.reason
          || (result.annotations.includes('source_repair_or_cache_miss_review') ? 'cache_miss_or_insufficient_evidence' : ''),
        source_repair_evidence: sourceHygiene.evidence || '',
        primary_family: result.primary_family,
        shadow_score: result.shadow_score,
        shadow_band: result.shadow_band,
        annotations: result.annotations.join('; '),
        score_reasons: formatScoreReasons(result),
      });
      return [];
    }

    // Kept row — V10-native shape.
    return [{
      ...job,
      primary_family: result.primary_family,
      families_str: (result.families || []).map(f => f.family || f).join(', ') || result.primary_family,
      semantic_score: result.semantic.score,
      score_parts: result.score_parts,
      shadow_score: result.shadow_score,
      shadow_band: result.shadow_band,
      annotations_str: result.annotations.join('; '),
      score_reasons: formatScoreReasons(result),
    }];
  });

  const totalReasonHits = Object.values(droppedHardByReason).reduce((a, b) => a + b, 0);
  console.log(
    `Dropped at output: ${droppedIntern} intern, ${droppedDealBreaker} deal-breaker, ` +
    `${droppedHardUrls.size} V10 hard-drops (${totalReasonHits} reason-hits)`
  );
  for (const [reason, count] of Object.entries(droppedHardByReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log(`Source repair review: ${sourceRepairRows.length} rows`);

  // Sort: shadow_score desc, rank asc, company asc, title asc
  jobsScored.sort((a, b) => {
    if (b.shadow_score !== a.shadow_score) return b.shadow_score - a.shadow_score;
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

  // Sheet 1: Pending Jobs (Option B — V10-native columns)
  const pendingSheet = wb.addWorksheet('Pending Jobs');
  pendingSheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Title', key: 'title', width: 50 },
    { header: 'URL', key: 'url', width: 60 },
    { header: 'Primary Family', key: 'primary_family', width: 22 },
    { header: 'Families', key: 'families_str', width: 22 },
    { header: 'Semantic', key: 'semantic_score', width: 10 },
    { header: 'Shadow Score', key: 'shadow_score', width: 13 },
    { header: 'Shadow Band', key: 'shadow_band', width: 12 },
    { header: 'Annotations', key: 'annotations_str', width: 35 },
    { header: 'Score Reasons', key: 'score_reasons', width: 50 },
  ];
  styleHeader(pendingSheet.getRow(1));
  pendingSheet.views = [{ state: 'frozen', ySplit: 1 }];
  pendingSheet.autoFilter = { from: 'A1', to: 'L1' };

  for (const job of filteredJobs) {
    const meta = companyMap.get(job.company);
    pendingSheet.addRow({
      rank: meta?.rank ?? '',
      company: job.company,
      category: meta?.category ?? '',
      title: job.title,
      url: job.url,
      primary_family: job.primary_family,
      families_str: job.families_str,
      semantic_score: job.semantic_score,
      shadow_score: job.shadow_score,
      shadow_band: job.shadow_band,
      annotations_str: job.annotations_str,
      score_reasons: job.score_reasons,
    });
  }
  pendingSheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const band = row.getCell('shadow_band').value;
    if (BAND_FILLS[band]) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND_FILLS[band] } };
    }
  });
  autoWidth(pendingSheet);

  // Sheet 2: By Company (with shadow_score aggregates)
  const byCompanySheet = wb.addWorksheet('By Company');
  byCompanySheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Pending Jobs', key: 'count', width: 14 },
    { header: 'Shadow Score Max', key: 'shadow_score_max', width: 18 },
    { header: 'Shadow Score Avg', key: 'shadow_score_avg', width: 18 },
    { header: 'S-Tier Count', key: 's_tier_count', width: 13 },
  ];
  styleHeader(byCompanySheet.getRow(1));
  byCompanySheet.views = [{ state: 'frozen', ySplit: 1 }];
  byCompanySheet.autoFilter = { from: 'A1', to: 'G1' };

  const byCompany = new Map();
  for (const j of jobsScored) {
    if (!byCompany.has(j.company)) byCompany.set(j.company, []);
    byCompany.get(j.company).push(j);
  }
  const byCompanyRows = [...byCompany.entries()]
    .map(([company, list]) => {
      const scores = list.map(x => x.shadow_score);
      return {
        rank: companyMap.get(company)?.rank ?? Infinity,
        company,
        category: companyMap.get(company)?.category ?? '',
        count: list.length,
        shadow_score_max: Math.max(...scores),
        shadow_score_avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        s_tier_count: list.filter(x => x.shadow_band === 'S').length,
      };
    })
    .sort((a, b) => {
      if (b.shadow_score_max !== a.shadow_score_max) return b.shadow_score_max - a.shadow_score_max;
      return a.rank - b.rank;
    });

  for (const row of byCompanyRows) {
    byCompanySheet.addRow({
      rank: row.rank === Infinity ? '' : row.rank,
      company: row.company,
      category: row.category,
      count: row.count,
      shadow_score_max: row.shadow_score_max,
      shadow_score_avg: row.shadow_score_avg,
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

  // Sheet 4: Source Repair Review (V10 wire — mirrors shadow workbook shape)
  const sourceRepairSheet = wb.addWorksheet('Source Repair Review');
  sourceRepairSheet.columns = [
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Title', key: 'title', width: 50 },
    { header: 'URL', key: 'url', width: 60 },
    { header: 'Cache Hit', key: 'cache_hit', width: 10 },
    { header: 'Source Repair Reason', key: 'source_repair_reason', width: 28 },
    { header: 'Source Repair Evidence', key: 'source_repair_evidence', width: 40 },
    { header: 'Primary Family', key: 'primary_family', width: 22 },
    { header: 'Shadow Score', key: 'shadow_score', width: 13 },
    { header: 'Shadow Band', key: 'shadow_band', width: 12 },
    { header: 'Annotations', key: 'annotations', width: 35 },
    { header: 'Score Reasons', key: 'score_reasons', width: 50 },
  ];
  styleHeader(sourceRepairSheet.getRow(1));
  sourceRepairSheet.views = [{ state: 'frozen', ySplit: 1 }];
  sourceRepairSheet.autoFilter = { from: 'A1', to: 'K1' };
  for (const row of sourceRepairRows) sourceRepairSheet.addRow(row);
  autoWidth(sourceRepairSheet);

  fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const outPath = path.join(__dirname, `output/jobs-${today}.xlsx`);
  await wb.xlsx.writeFile(outPath);

  const bandCounts = { S: 0, A: 0, B: 0, C: 0 };
  for (const j of jobsScored) bandCounts[j.shadow_band]++;
  console.log(`Exported ${filteredJobs.length}/${jobsScored.length} pending jobs (${cacheHits} cache hits, ${hitRate.toFixed(1)}%), ${byCompanyRows.length} companies, ${history.length} scan history rows, ${sourceRepairRows.length} source-repair rows`);
  console.log(`Bands: S=${bandCounts.S} A=${bandCounts.A} B=${bandCounts.B} C=${bandCounts.C}`);
  console.log(`Output: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
