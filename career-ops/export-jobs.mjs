#!/usr/bin/env node
// export-jobs.mjs — converts pipeline + scan history to Excel
// Reads: data/pipeline.md, data/scan-history.tsv, portals.yml
// Writes: output/jobs-YYYY-MM-DD.xlsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadCompanyMap() {
  const raw = fs.readFileSync(path.join(__dirname, 'portals.yml'), 'utf8');
  const parsed = yaml.load(raw);
  const map = new Map();
  for (const c of parsed.tracked_companies || []) {
    map.set(c.name, { rank: c.rank ?? Infinity, category: c.category ?? '' });
  }
  return map;
}

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
      url: parts[0],
      first_seen: parts[1],
      portal: parts[2],
      title: parts[3],
      company: parts[4],
      status: parts[5],
    });
  }
  return rows;
}

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

async function main() {
  const companyMap = loadCompanyMap();
  const jobs = parsePipelineMd(path.join(__dirname, 'data/pipeline.md'));
  const history = parseScanHistory(path.join(__dirname, 'data/scan-history.tsv'));

  jobs.sort((a, b) => {
    const ra = companyMap.get(a.company)?.rank ?? Infinity;
    const rb = companyMap.get(b.company)?.rank ?? Infinity;
    if (ra !== rb) return ra - rb;
    if (a.company !== b.company) return a.company.localeCompare(b.company);
    return a.title.localeCompare(b.title);
  });

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
  ];
  styleHeader(pendingSheet.getRow(1));
  pendingSheet.views = [{ state: 'frozen', ySplit: 1 }];
  pendingSheet.autoFilter = { from: 'A1', to: 'E1' };

  for (const job of jobs) {
    const meta = companyMap.get(job.company);
    pendingSheet.addRow({
      rank: meta?.rank ?? '',
      company: job.company,
      category: meta?.category ?? '',
      title: job.title,
      url: job.url,
    });
  }
  autoWidth(pendingSheet);

  // Sheet 2: By Company
  const byCompanySheet = wb.addWorksheet('By Company');
  byCompanySheet.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Company', key: 'company', width: 30 },
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Pending Jobs', key: 'count', width: 14 },
  ];
  styleHeader(byCompanySheet.getRow(1));
  byCompanySheet.views = [{ state: 'frozen', ySplit: 1 }];
  byCompanySheet.autoFilter = { from: 'A1', to: 'D1' };

  const countMap = new Map();
  for (const job of jobs) {
    countMap.set(job.company, (countMap.get(job.company) ?? 0) + 1);
  }
  const byCompanyRows = [...countMap.entries()]
    .map(([company, count]) => ({
      rank: companyMap.get(company)?.rank ?? Infinity,
      company,
      category: companyMap.get(company)?.category ?? '',
      count,
    }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.company.localeCompare(b.company);
    });

  for (const row of byCompanyRows) {
    byCompanySheet.addRow({
      rank: row.rank === Infinity ? '' : row.rank,
      company: row.company,
      category: row.category,
      count: row.count,
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

  for (const row of history) {
    historySheet.addRow(row);
  }
  autoWidth(historySheet);

  fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const outPath = path.join(__dirname, `output/jobs-${today}.xlsx`);
  await wb.xlsx.writeFile(outPath);

  console.log(`Exported ${jobs.length} pending jobs, ${byCompanyRows.length} companies, ${history.length} scan history rows`);
  console.log(`Output: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
