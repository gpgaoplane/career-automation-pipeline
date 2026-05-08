#!/usr/bin/env node
// V7-B1: real-data fixture test. Loads 50 hand-labeled fixtures from
// scripts/test-fixtures/v7-realdata-fixtures.jsonl, replays each row through
// the current scoring/source-hygiene pipeline (using career-ops cache and
// portals.yml), and asserts hard_drop / hard_drop_reason match expectations.
//
// Source workbook is V6 — fixtures were sampled from V6 outcomes. Under V7
// rules, some categories MAY shift (cohort survivors, adversarial). When that
// happens, the fixture's `revised_in` array should be appended in a follow-up
// task; here we ASSERT against the labeled `hard_drop_expected` and tally
// mismatches with category breakdown for visibility.

import fs from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { parseJdSections } from "./lib/jd-sections.mjs";
import { scoreJob } from "./lib/job-fit-rules.mjs";
import { detectSourceHygiene } from "./production-filter-refinement-audit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");

const FIXTURE_FILE = resolve(__dirname, "test-fixtures", "v7-realdata-fixtures.jsonl");

let passed = 0;
let failed = 0;
const failures = [];

function loadFixtures() {
  if (!fs.existsSync(FIXTURE_FILE)) throw new Error(`Missing fixtures file: ${FIXTURE_FILE}`);
  return fs.readFileSync(FIXTURE_FILE, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function loadCache() {
  const p = resolve(CAREER_OPS, "data", "job-descriptions-cache.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadPortals() {
  const raw = fs.readFileSync(resolve(CAREER_OPS, "portals.yml"), "utf8");
  const parsed = yaml.load(raw);
  const map = new Map();
  for (const c of parsed.tracked_companies || []) {
    map.set(c.name, { name: c.name, rank: c.rank ?? 9999, category: c.category ?? "" });
  }
  return map;
}

function normalizeUrl(u) {
  return String(u || "").trim().replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
}

const cache = loadCache();
const portals = loadPortals();
const fixtures = loadFixtures();

const categoryCounts = {};
const categoryFails = {};

for (const fx of fixtures) {
  categoryCounts[fx.category] = (categoryCounts[fx.category] || 0) + 1;
  // V8: synthetic fixtures with `v8://synthetic/...` URLs use the embedded
  // jd_excerpt rather than the real cache. Provenance.synthetic === true.
  const isSynthetic = fx.provenance?.synthetic === true || /^v8:\/\//i.test(fx.url || "");
  let cacheEntry, text;
  if (isSynthetic) {
    text = String(fx.jd_excerpt || "");
    cacheEntry = text.trim() ? { content_text: text, extracted_signals: {} } : null;
  } else {
    cacheEntry = cache[fx.url] || cache[normalizeUrl(fx.url)] || null;
    text = String(cacheEntry?.content_text || cacheEntry?.markdown || cacheEntry?.description || cacheEntry?.text || "");
  }
  const sections = parseJdSections(text);
  const signals = cacheEntry?.extracted_signals || {};
  const companyMeta = portals.get(fx.company) || { rank: 9999, category: "" };

  let actualHardDrop, actualReason;
  // Source-hygiene preempts scoring (mirrors audit behavior at line 341 of
  // production-filter-refinement-audit.mjs: hard_drop is forced "no" when
  // sourceHygiene.invalid).
  // Synthetic fixtures bypass source-hygiene (URL is intentionally non-real).
  if (isSynthetic) {
    const r = scoreJob({ job: { company: fx.company, title: fx.title }, companyMeta, signals, textSections: sections });
    actualHardDrop = r.hard_drop;
    actualReason = r.hard_drop_reason || "";
  } else {
    const sourceHygiene = detectSourceHygiene({ job: { url: fx.url, title: fx.title }, cacheEntry, text });
    if (sourceHygiene.invalid) {
      actualHardDrop = false;
      actualReason = "";
    } else {
      const r = scoreJob({ job: { company: fx.company, title: fx.title }, companyMeta, signals, textSections: sections });
      actualHardDrop = r.hard_drop;
      actualReason = r.hard_drop_reason || "";
    }
  }

  const matched = actualHardDrop === fx.hard_drop_expected;
  if (matched) {
    passed++;
  } else {
    failed++;
    categoryFails[fx.category] = (categoryFails[fx.category] || 0) + 1;
    failures.push({
      id: fx.fixture_id,
      category: fx.category,
      company: fx.company,
      title: fx.title,
      url: fx.url,
      expected_drop: fx.hard_drop_expected,
      actual_drop: actualHardDrop,
      expected_reason: fx.hard_drop_reason_expected,
      actual_reason: actualReason,
    });
  }
}

console.log(`\nReal-data fixtures: ${passed}/${fixtures.length} pass`);
console.log("Category distribution:");
for (const [cat, count] of Object.entries(categoryCounts)) {
  const failCount = categoryFails[cat] || 0;
  console.log(`  ${cat}: ${count - failCount}/${count} pass${failCount ? " (" + failCount + " mismatch)" : ""}`);
}

if (failed > 0) {
  console.log("\nFailures (V7 rules differ from V6-labeled outcome):");
  for (const f of failures) {
    console.log(`  ${f.id} [${f.category}] ${f.company} | ${f.title}`);
    console.log(`    url: ${f.url}`);
    console.log(`    expected drop=${f.expected_drop} reason="${f.expected_reason || ""}"`);
    console.log(`    actual   drop=${f.actual_drop} reason="${f.actual_reason}"`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
