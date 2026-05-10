#!/usr/bin/env node
// render-cv-pdf.mjs — tailored CV markdown → HTML (via cv-template.html) → PDF
//
// Usage: node scripts/render-cv-pdf.mjs <input-cv.md> [--output <output.pdf>]
//   Default output: same path as input but with .pdf extension
//   Intermediate .html written next to the .pdf for debugging
//
// Pipeline:
//   markdown sections → mapped to template placeholders →
//   substituted into career-ops/templates/cv-template.html →
//   handed to career-ops/generate-pdf.mjs (Playwright HTML→PDF)
//
// Tailored to Will's CV markdown structure: H1 NAME + 2-line contact rows;
// ## Summary, ## Core Competencies, ## Experience, ## Projects,
// ## Education, ## Skills, ## Languages (optional). Within Experience and
// Projects, ### prefix per item.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CAREER_OPS = path.resolve(REPO_ROOT, 'career-ops');
const TEMPLATE = path.resolve(CAREER_OPS, 'templates/cv-template.html');
const PDF_GEN = path.resolve(CAREER_OPS, 'generate-pdf.mjs');

// ── helpers ────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s) {
  // Order matters: process inline code first to protect content from bold/italic
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic via single asterisk — only when not adjacent to alphanumeric (rough heuristic)
  out = out.replace(/(^|[^A-Za-z0-9_])\*([^*\n]+?)\*(?=[^A-Za-z0-9_]|$)/g, '$1<em>$2</em>');
  return out;
}

function fillTemplate(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

// ── parsers ────────────────────────────────────────────────────────

function splitSections(md) {
  // Returns { headerBlock, sections: { name -> body } }
  const lines = md.split('\n');
  let headerLines = [];
  const sections = {};
  let currentName = null;
  let currentLines = [];
  let inHeader = true;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentName !== null) sections[currentName] = currentLines.join('\n').trim();
      currentName = line.replace(/^##\s+/, '').trim();
      currentLines = [];
      inHeader = false;
      continue;
    }
    if (inHeader) headerLines.push(line);
    else currentLines.push(line);
  }
  if (currentName !== null) sections[currentName] = currentLines.join('\n').trim();
  return { headerBlock: headerLines.join('\n'), sections };
}

function parseHeader(headerBlock) {
  // # Name on first non-empty line
  // Then contact info (1 or 2 lines, pipe-separated)
  const lines = headerBlock.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('---'));
  const name = (lines[0] || '').replace(/^#\s+/, '').trim();
  const contactParts = lines.slice(1).flatMap(l => l.split(' | ').map(p => p.trim())).filter(Boolean);

  const find = (re) => contactParts.find(p => re.test(p)) || '';
  const email = find(/^[^@\s]+@[^\s]+\.[a-z]{2,}$/i);
  const phone = find(/^\+?\d[\d\s().-]{6,}/);
  const linkedinDisp = find(/linkedin\.com\//i);
  const githubDisp = find(/github\.com\//i);
  // Portfolio: short domain that isn't linkedin or github
  const portfolioDisp = contactParts.find(p =>
    /^[a-z][a-z0-9-]*\.[a-z]{2,}$/i.test(p) && !/linkedin|github/i.test(p)
  ) || '';
  // Location: includes a comma + uppercase region word
  const location = find(/^[A-Z][a-z]+,\s*([A-Z][a-z]+|[A-Z]{2})/);

  const ensureUrl = (s) => s ? (s.startsWith('http') ? s : `https://${s}`) : '';

  return {
    name,
    email,
    phone,
    location,
    linkedin_url: ensureUrl(linkedinDisp),
    linkedin_display: linkedinDisp,
    portfolio_url: ensureUrl(portfolioDisp),
    portfolio_display: portfolioDisp,
    github_url: ensureUrl(githubDisp),
    github_display: githubDisp,
  };
}

function renderSummary(text) {
  // Single paragraph (or first paragraph if multiple)
  const first = (text || '').split(/\n\n+/)[0] || '';
  return inline(first.replace(/\n/g, ' ').trim());
}

function renderCompetencies(text) {
  // Inline-list separated by · or by **bold** terms
  // Strip bold markers so each token is plain
  const flat = (text || '').replace(/\n+/g, ' ').replace(/\*\*/g, '').trim();
  const parts = flat.split(/\s*·\s*/).map(s => s.trim()).filter(Boolean);
  return parts.map(p => `<span class="competency-tag">${escapeHtml(p)}</span>`).join('\n      ');
}

function renderExperience(text) {
  if (!text) return '';
  const blocks = text.split(/(?=^### )/m).filter(s => s.trim());
  return blocks.map(block => {
    const lines = block.split('\n');
    const titleLine = lines[0].replace(/^###\s+/, '').trim();
    let company = titleLine, role = '';
    const dashIdx = titleLine.search(/\s+[—–-]\s+/);
    if (dashIdx > -1) {
      company = titleLine.slice(0, dashIdx).trim();
      role = titleLine.slice(dashIdx).replace(/^\s+[—–-]\s+/, '').trim();
    }
    // Optional **Location | Period** line
    let location = '', period = '';
    let bodyStart = 1;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) { bodyStart = i + 1; continue; }
      const m = lines[i].match(/^\*\*\s*(.+?)\s*\|\s*(.+?)\s*\*\*$/);
      if (m) {
        location = m[1].trim();
        period = m[2].trim();
        bodyStart = i + 1;
        break;
      }
      bodyStart = i;
      break;
    }
    const body = lines.slice(bodyStart).join('\n').trim();

    // Body: paragraphs separated by blank lines, bullets prefixed with -
    const paragraphs = [];
    const bullets = [];
    for (const part of body.split(/\n\n+/)) {
      if (!part.trim()) continue;
      if (/^- /m.test(part)) {
        const items = part.split(/\n(?=- )/).map(it => it.replace(/^- /, '').replace(/\n/g, ' ').trim());
        bullets.push(...items);
      } else {
        paragraphs.push(part.replace(/\n/g, ' ').trim());
      }
    }

    let html = `<div class="job">`;
    html += `\n  <div class="job-header">`;
    html += `\n    <span class="job-company">${escapeHtml(company)}</span>`;
    if (period) html += `\n    <span class="job-period">${escapeHtml(period)}</span>`;
    html += `\n  </div>`;
    if (role) html += `\n  <div class="job-role">${escapeHtml(role)}</div>`;
    if (location) html += `\n  <div class="job-location">${escapeHtml(location)}</div>`;
    for (const p of paragraphs) {
      html += `\n  <p style="font-size:10.5px;margin-top:6px;">${inline(p)}</p>`;
    }
    if (bullets.length) {
      html += `\n  <ul>`;
      for (const b of bullets) html += `\n    <li>${inline(b)}</li>`;
      html += `\n  </ul>`;
    }
    html += `\n</div>`;
    return html;
  }).join('\n\n');
}

function renderProjects(text) {
  if (!text) return '';
  const blocks = text.split(/(?=^### )/m).filter(s => s.trim());
  return blocks.map(block => {
    const lines = block.split('\n');
    const titleLine = lines[0].replace(/^###\s+/, '').trim();
    // Optional *(badge)* at end
    let title = titleLine, badge = '';
    const m = titleLine.match(/^(.+?)\s*\*\(([^)]+)\)\*\s*$/);
    if (m) { title = m[1].trim(); badge = m[2].trim(); }
    const body = lines.slice(1).join('\n').trim();
    // Stack line: *Stack: ...*
    const stackMatch = body.match(/\*Stack:\s*([^*]+?)\s*(?:\|\s*([^*]+))?\*/);
    let desc = body, stack = '';
    if (stackMatch) {
      desc = body.replace(stackMatch[0], '').trim();
      stack = stackMatch[1].trim();
      if (stackMatch[2]) stack += ' | ' + stackMatch[2].trim();
    }

    let html = `<div class="project">`;
    html += `\n  <div class="project-title">${escapeHtml(title)}`;
    if (badge) html += ` <span class="project-badge">${escapeHtml(badge)}</span>`;
    html += `</div>`;
    if (desc) html += `\n  <div class="project-desc">${inline(desc.replace(/\n/g, ' '))}</div>`;
    if (stack) html += `\n  <div class="project-tech">${inline(stack)}</div>`;
    html += `\n</div>`;
    return html;
  }).join('\n\n');
}

function renderEducation(text) {
  if (!text) return '';
  // Each item is a paragraph, possibly with **University** — Degree, Date
  const items = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  return items.map(item => `<div class="edu-item">${inline(item.replace(/\n/g, ' '))}</div>`).join('\n');
}

function renderSkills(text) {
  if (!text) return '';
  // Each line: **Category:** items
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => `<div class="skill-line" style="margin-bottom:4px;">${inline(line)}</div>`).join('\n');
}

// ── main ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/render-cv-pdf.mjs <input-cv.md> [--output <output.pdf>] [--keep-html]');
  process.exit(args.length < 1 ? 1 : 0);
}

const inputMd = path.resolve(args[0]);
let outputPdf = inputMd.replace(/\.md$/, '.pdf');
let keepHtml = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--output') outputPdf = path.resolve(args[++i]);
  else if (args[i] === '--keep-html') keepHtml = true;
}

if (!fs.existsSync(inputMd)) {
  console.error(`Input not found: ${inputMd}`);
  process.exit(1);
}

const md = fs.readFileSync(inputMd, 'utf8');
const template = fs.readFileSync(TEMPLATE, 'utf8');

const { headerBlock, sections } = splitSections(md);
const header = parseHeader(headerBlock);

const vars = {
  LANG: 'en',
  PAGE_WIDTH: '8.5in',
  NAME: escapeHtml(header.name),
  EMAIL: escapeHtml(header.email),
  PHONE: escapeHtml(header.phone),
  LOCATION: escapeHtml(header.location),
  LINKEDIN_URL: header.linkedin_url,
  LINKEDIN_DISPLAY: escapeHtml(header.linkedin_display),
  PORTFOLIO_URL: header.portfolio_url,
  PORTFOLIO_DISPLAY: escapeHtml(header.portfolio_display),
  SECTION_SUMMARY: 'Summary',
  SUMMARY_TEXT: renderSummary(sections['Summary']),
  SECTION_COMPETENCIES: 'Core Competencies',
  COMPETENCIES: renderCompetencies(sections['Core Competencies']),
  SECTION_EXPERIENCE: 'Experience',
  EXPERIENCE: renderExperience(sections['Experience']),
  SECTION_PROJECTS: 'Projects',
  PROJECTS: renderProjects(sections['Projects']),
  SECTION_EDUCATION: 'Education',
  EDUCATION: renderEducation(sections['Education']),
  SECTION_CERTIFICATIONS: '',
  CERTIFICATIONS: '',
  SECTION_SKILLS: 'Skills',
  SKILLS: renderSkills(sections['Skills']),
};

const filled = fillTemplate(template, vars);
const tmpHtml = outputPdf.replace(/\.pdf$/, '.html');
fs.writeFileSync(tmpHtml, filled);
console.log(`HTML written: ${tmpHtml}`);

execSync(`node "${PDF_GEN}" "${tmpHtml}" "${outputPdf}" --format=letter`, { stdio: 'inherit' });
console.log(`PDF rendered: ${outputPdf}`);

if (!keepHtml) {
  try { fs.unlinkSync(tmpHtml); } catch {}
}
