#!/usr/bin/env node
// V7-B3: property tests. Picks 100 random rows from the V7 workbook
// (deterministic seed=42) and replays scoreJob, asserting type / range /
// implication / set-membership / determinism / source-repair-contract /
// family-base-correspondence invariants.
//
// Plan: docs/plans/2026-05-05-v7-consolidated-plan.md §V7-B3.

import fs from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { parseJdSections } from "./lib/jd-sections.mjs";
import { scoreJob } from "./lib/job-fit-rules.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");

const careerOpsRequire = createRequire(resolve(CAREER_OPS, "package.json"));
const ExcelJS = careerOpsRequire("exceljs");

// V10: workbook reference updated from V9 → V10 (V10 is the working baseline now).
const V7_WORKBOOK = resolve(CAREER_OPS, "output", "production-filter-refinement-review-2026-05-01-v10.xlsx");

// Reproduce FAMILY_BASE values from job-fit-rules.mjs:8-18 for the
// family-base-correspondence invariant.
const FAMILY_BASE = {
  SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE: 12,
  AI_ENGINEERING: 10,
  AI_PROGRAM_OPS: 8,
  PRODUCT_AI: 8,
  AI_EVAL: 7,
  CONSULTING_ADVISORY: 8,
  CREATIVE_AI: 5,
  GENERIC_ENGINEERING_REVIEW: 2,
  UNKNOWN: 0,
};

const VALID_FAMILIES = new Set(Object.keys(FAMILY_BASE));
const VALID_BANDS = new Set(["S", "A", "B", "C", "REVIEW", null]);
// V8-B3: replaced `non_na_territory_with_sales_context` (V7) with `non_na_territory` (V8).
const VALID_HARD_DROP_REASONS = new Set([
  "sales_role_title",
  "sales_role_content",
  "yoe_required_gt_5",
  "compensation_below_floor",
  "comp_upper_below_120_USD",
  "comp_upper_below_120_CAD",
  "hybrid_non_toronto_no_remote",
  "onsite_non_toronto_no_remote",
  "specific_non_toronto_location_no_remote",
  "non_na_territory",
  "senior_title",
  "junior_title",
  "associate_level",
  "intern_title",
]);

// Mulberry32 deterministic PRNG, seed=42.
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function readSheet(workbook, sheetName) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return [];
  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  });
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const out = {};
    for (let i = 1; i < headers.length; i++) {
      if (!headers[i]) continue;
      let val = row.getCell(i).value;
      if (val && typeof val === "object") {
        if (val.text) val = val.text;
        else if (val.hyperlink) val = val.hyperlink;
        else if (val.richText) val = val.richText.map((p) => p.text || "").join("");
        else if (val.result != null) val = val.result;
        else val = JSON.stringify(val);
      }
      out[headers[i]] = String(val ?? "");
    }
    if (Object.values(out).some((v) => String(v || "").trim())) rows.push(out);
  });
  return rows;
}

function loadCache() {
  return JSON.parse(fs.readFileSync(resolve(CAREER_OPS, "data", "job-descriptions-cache.json"), "utf8"));
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

function isPlaceholderUrl(url) {
  return /^https?:\/\/(?:[\w.-]+\.)?(?:example\.(?:com|org|net)|test\.example|localhost|127\.0\.0\.|0\.0\.0\.0)/i.test(url);
}

function isAtlassianListing(url) {
  return /\/all-jobs\?/i.test(url) || /\?team=[^&]+(?:&location=|&search=)/i.test(url);
}

let assertionsPassed = 0;
let assertionsFailed = 0;
const failures = [];

function assert(cond, msg, context) {
  if (cond) {
    assertionsPassed++;
  } else {
    assertionsFailed++;
    failures.push({ msg, context });
  }
}

const main = async () => {
  if (!fs.existsSync(V7_WORKBOOK)) {
    console.error(`V7 workbook not found at ${V7_WORKBOOK}. Run audit first.`);
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(V7_WORKBOOK);
  const allRows = readSheet(wb, "Shadow Decisions");
  if (allRows.length === 0) throw new Error("V7 workbook has no Shadow Decisions rows");

  const sortedRows = [...allRows].sort((a, b) => {
    const k1 = `${a.company || ""}\t${a.title || ""}\t${a.url || ""}`.toLowerCase();
    const k2 = `${b.company || ""}\t${b.title || ""}\t${b.url || ""}`.toLowerCase();
    return k1.localeCompare(k2);
  });

  const rng = mulberry32(42);
  const sample = [];
  const sampleSize = Math.min(100, sortedRows.length);
  const usedIdx = new Set();
  while (sample.length < sampleSize) {
    const idx = Math.floor(rng() * sortedRows.length);
    if (usedIdx.has(idx)) continue;
    usedIdx.add(idx);
    sample.push(sortedRows[idx]);
  }

  const cache = loadCache();
  const portals = loadPortals();

  for (const row of sample) {
    const url = String(row.url || "");
    const cacheEntry = cache[url] || cache[normalizeUrl(url)] || null;
    const text = String(cacheEntry?.content_text || cacheEntry?.markdown || cacheEntry?.description || cacheEntry?.text || "");
    const sections = parseJdSections(text);
    const signals = cacheEntry?.extracted_signals || {};
    const companyMeta = portals.get(row.company) || { rank: 9999, category: "" };

    // Source-hygiene preempt: if invalid, audit forces hard_drop=no, so skip
    // scoreJob-level invariants for those rows but keep workbook-level invariants.
    const isInvalid = isPlaceholderUrl(url) || isAtlassianListing(url) || !cacheEntry || !text.trim();

    let result = null;
    if (!isInvalid) {
      result = scoreJob({ job: { company: row.company, title: row.title }, companyMeta, signals, textSections: sections });

      // Type invariants
      assert(typeof result.hard_drop === "boolean", "hard_drop is boolean", { url, got: typeof result.hard_drop });
      assert(typeof result.shadow_score === "number", "shadow_score is numeric", { url, got: typeof result.shadow_score });
      assert(Number.isFinite(result.shadow_score), "shadow_score is finite", { url, got: result.shadow_score });

      // Range invariants
      assert(result.shadow_score >= -10 && result.shadow_score <= 100, "shadow_score in [-10, 100]", { url, got: result.shadow_score });

      // Implication: hard_drop=true ⇒ hard_drop_reason exists
      if (result.hard_drop) {
        assert(result.hard_drop_reason && result.hard_drop_reason.length > 0,
          "hard_drop=true ⇒ hard_drop_reason non-empty", { url, got: result.hard_drop_reason });
      }

      // Family-base correspondence
      if (result.primary_family !== "UNKNOWN") {
        assert(result.score_parts.family === FAMILY_BASE[result.primary_family],
          `family score matches FAMILY_BASE for ${result.primary_family}`,
          { url, expected: FAMILY_BASE[result.primary_family], got: result.score_parts.family });
      }

      // Set-membership invariants
      assert(VALID_FAMILIES.has(result.primary_family), "primary_family in known set",
        { url, got: result.primary_family });
      assert(VALID_BANDS.has(result.shadow_band), "shadow_band in known set",
        { url, got: result.shadow_band });

      // Hard-drop-reasons via split-and-every (NOT substring-some — would accept typos)
      const reasons = String(result.hard_drop_reason || "").split(";").map((s) => s.trim()).filter(Boolean);
      assert(reasons.every((r) => VALID_HARD_DROP_REASONS.has(r)),
        `all hard_drop_reasons in known set: ${JSON.stringify(reasons)}`,
        { url, reasons });

      // Determinism: same input → same output (deep-equal JSON)
      const result2 = scoreJob({ job: { company: row.company, title: row.title }, companyMeta, signals, textSections: sections });
      assert(JSON.stringify(result) === JSON.stringify(result2),
        "scoreJob is deterministic for same input", { url });
    }

    // Source-repair contract: source_repair=yes ⇒ hard_drop=false (workbook-level)
    if (row.source_repair === "yes") {
      assert(row.hard_drop !== "yes",
        "source_repair=yes ⇒ hard_drop=no", { url, got: row.hard_drop });
    }

    // V8-B3 NEW INVARIANT: territory_region === "NON_NA" ⇒ hard_drop === "yes"
    // AND hard_drop_reason includes "non_na_territory". Codifies the strict-NA gate.
    // Skip for source_repair rows (audit forces hard_drop=no for those).
    if (!isInvalid && row.territory_region === "NON_NA" && row.source_repair !== "yes") {
      assert(row.hard_drop === "yes",
        "V8-B3: territory_region=NON_NA ⇒ hard_drop=yes (strict-NA gate)",
        { url, got: row.hard_drop, territory: row.territory_region });
      assert(/non_na_territory/.test(row.hard_drop_reason || ""),
        "V8-B3: territory_region=NON_NA ⇒ hard_drop_reason includes non_na_territory",
        { url, got: row.hard_drop_reason });
    }
  }

  console.log(`\nProperty assertions: ${assertionsPassed}/${assertionsPassed + assertionsFailed} pass over ${sample.length} rows`);
  if (assertionsFailed > 0) {
    console.log("Failed assertions:");
    for (const f of failures.slice(0, 20)) {
      console.log(`  - ${f.msg} :: ${JSON.stringify(f.context)}`);
    }
    if (failures.length > 20) console.log(`  ...and ${failures.length - 20} more`);
  }
  console.log(`\n${assertionsPassed} passed, ${assertionsFailed} failed`);
  process.exit(assertionsFailed === 0 ? 0 : 1);
};

main().catch((e) => { console.error(e.stack || e); process.exit(1); });
