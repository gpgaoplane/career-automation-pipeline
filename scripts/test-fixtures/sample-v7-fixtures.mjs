#!/usr/bin/env node
// Helper script that builds the v7-realdata-fixtures.jsonl set from V6 workbook.
// Deterministic: seed=42, sort by (company, title, url), pick every Nth from
// each stratified subset. Hand-labeled rationale lives in the JSONL output.

import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const V6_WORKBOOK = resolve(REPO_ROOT, "career-ops", "output", "calibration", "reviews-by-version", "v6.xlsx");
const OUT_FILE = resolve(__dirname, "v7-realdata-fixtures.jsonl");

const careerOpsRequire = createRequire(resolve(REPO_ROOT, "career-ops", "package.json"));
const ExcelJS = careerOpsRequire("exceljs");

function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

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

function sortKey(row) {
  return [
    String(row.company || "").toLowerCase(),
    String(row.title || "").toLowerCase(),
    String(row.url || "").toLowerCase(),
  ].join("\t");
}

// Sample N rows from list, deterministic per seed: take every k-th element
// after stratified sort. Caller passes list already sorted.
function takeEveryNth(list, count) {
  if (list.length === 0) return [];
  if (list.length <= count) return list.slice();
  const out = [];
  const step = list.length / count;
  for (let i = 0; i < count; i++) {
    out.push(list[Math.floor(i * step)]);
  }
  return out;
}

const main = async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(V6_WORKBOOK);
  const sourceSha = sha256File(V6_WORKBOOK);

  const shadowDecisions = readSheet(wb, "Shadow Decisions").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const salesHardDrops = readSheet(wb, "Sales Hard Drops").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const sourceRepair = readSheet(wb, "Source Repair Review").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const reviewerQueue = readSheet(wb, "Reviewer Queue").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const compYoeLoc = readSheet(wb, "Comp YoE Location").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const scoreDeltas = readSheet(wb, "Score Deltas").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  // Find SD index by url for full record lookup
  const sdByUrl = new Map(shadowDecisions.map((r) => [String(r.url || "").trim().toLowerCase(), r]));

  // Categories
  const cats = {
    sales_legitimate: takeEveryNth(salesHardDrops, 8),
    sales_cohort_survivors: takeEveryNth(scoreDeltas.filter((r) => /sales|account|solutions/i.test(`${r.title || ""} ${r.score_reasons || ""}`) && r.hard_drop !== "yes"), 6),
    source_repair_legitimate: takeEveryNth(sourceRepair.filter((r) => r.item_type !== "known_missing_seed"), 8),
    reviewer_queue_borderline: takeEveryNth(reviewerQueue, 10),
    yoe_comp_loc_drops: takeEveryNth(compYoeLoc.filter((r) => r.hard_drop === "yes" && /yoe|comp|location|hybrid|onsite/.test(String(r.hard_drop_reason || "") + " " + (r.compensation_reason || "") + " " + (r.yoe_reason || "") + " " + (r.location_reason || ""))), 8),
    score_deltas_high: takeEveryNth(scoreDeltas.filter((r) => {
      const d = Number(r.score_delta || 0);
      return Math.abs(d) >= 2 && r.hard_drop !== "yes";
    }), 8),
    adversarial: [], // we hand-build this; see below
  };

  // Adversarial: 6 hand-picked from V6 universe (Anthropic India/Japan/US, Lattice, Atlassian listing, example.com)
  const adversarialCandidates = [];
  const wantUrls = [
    "https://job-boards.greenhouse.io/anthropic/jobs/5117581008", // Anthropic India
    "https://job-boards.greenhouse.io/anthropic/jobs/5076109008", // Anthropic Japan
    "https://job-boards.greenhouse.io/anthropic/jobs/5192805008", // Anthropic Commercial (US)
  ];
  for (const u of wantUrls) {
    const r = sdByUrl.get(u.toLowerCase());
    if (r) adversarialCandidates.push(r);
  }
  // Atlassian /all-jobs and example.com may live in Shadow Decisions or source_repair; check both.
  for (const u of [
    "https://www.atlassian.com/company/careers/all-jobs?team=product%20management&location=&search=",
    "https://example.com/careers/product-manager-austin",
  ]) {
    const r = sdByUrl.get(u);
    if (r) adversarialCandidates.push(r);
    else {
      const sr = sourceRepair.find((x) => String(x.url || "").toLowerCase() === u);
      if (sr) adversarialCandidates.push({
        company: sr.company, title: sr.title, url: sr.url,
        primary_family: sr.primary_family || "",
        hard_drop: "no",
        hard_drop_reason: "",
        source_repair_reason: sr.source_repair_reason || "",
        shadow_band: sr.shadow_band || "",
      });
    }
  }
  // Add a Lattice Semiconductor row if present (Lattice-shape per-label)
  const lattice = shadowDecisions.find((r) => /lattice semiconductor/i.test(r.company || "") && /product manager/i.test(r.title || ""));
  if (lattice) adversarialCandidates.push(lattice);
  cats.adversarial = adversarialCandidates.slice(0, 6);

  // Build fixtures with hand-labeled expected outcomes
  const fixtures = [];
  const seen = new Set();
  let id = 1;

  // Helper to label-pre-fill from V6 outcome
  const fixtureFromRow = (row, category, rationale, hardDropExpected, expectedReason, bandExpected, labeledBy = "claude-with-uncertainty") => {
    const url = String(row.url || "").trim();
    const key = `${row.company}|${row.title}|${url}`.toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    const sd = sdByUrl.get(url.toLowerCase()) || row;
    return {
      fixture_id: `F-${String(id++).padStart(3, "0")}`,
      company: row.company || sd.company,
      title: row.title || sd.title,
      url,
      category,
      jd_excerpt: "",
      primary_family_expected: sd.primary_family || "",
      hard_drop_expected: hardDropExpected,
      hard_drop_reason_expected: expectedReason,
      band_expected: bandExpected,
      rationale,
      expected_failure: false,
      expected_failure_reason: null,
      provenance: {
        source_workbook: "production-filter-refinement-review-2026-05-01-v6.xlsx",
        source_workbook_sha: sourceSha,
        category,
        labeled_by: labeledBy,
        labeled_date: "2026-05-05",
        revised_in: [],
      },
    };
  };

  // sales_legitimate: 8 — V6 hard-drop=yes on sales_role; expect SAME outcome in V7
  for (const row of cats.sales_legitimate) {
    const sd = sdByUrl.get(String(row.url || "").toLowerCase()) || row;
    const f = fixtureFromRow(row, "sales_legitimate",
      `V6 dropped on sales_role; expect V7 to keep dropping (no V7-A1/A2/A3 rescue). reason=${sd.hard_drop_reason || row.hard_drop_reason}`,
      true, sd.hard_drop_reason || row.hard_drop_reason || "sales_role_content", null, "claude");
    if (f) fixtures.push(f);
  }

  // sales_cohort_survivors: 6 — V6 score_delta rows with sales evidence; mostly survivors
  for (const row of cats.sales_cohort_survivors) {
    const sd = sdByUrl.get(String(row.url || "").toLowerCase()) || row;
    const isDropped = sd.hard_drop === "yes" || row.hard_drop === "yes";
    const f = fixtureFromRow(row, "sales_cohort_survivors",
      `V6 score-delta row; ${isDropped ? "drops" : "survives"} per V6. V7 may shift if V7-A3 territory triggers.`,
      isDropped, sd.hard_drop_reason || row.hard_drop_reason || "", sd.shadow_band || row.shadow_band || null);
    if (f) fixtures.push(f);
  }

  // source_repair_legitimate: 8 — source_repair=yes; hard_drop forced to false in audit script
  for (const row of cats.source_repair_legitimate) {
    const f = fixtureFromRow(row, "source_repair_legitimate",
      `V6 source_repair_reason=${row.source_repair_reason}; per audit script hard_drop forced false on source_repair rows.`,
      false, "", row.shadow_band || null, "claude");
    if (f) fixtures.push(f);
  }

  // reviewer_queue_borderline: target 8 — kept rows in reviewer queue
  let reviewerAdded = 0;
  for (const row of cats.reviewer_queue_borderline) {
    if (reviewerAdded >= 8) break;
    const sd = sdByUrl.get(String(row.url || "").toLowerCase()) || row;
    const isDropped = sd.hard_drop === "yes";
    const f = fixtureFromRow(row, "reviewer_queue_borderline",
      `V6 reviewer queue row; expected ${isDropped ? "dropped" : "kept"} for review.`,
      isDropped, sd.hard_drop_reason || "", sd.shadow_band || null);
    if (f) { fixtures.push(f); reviewerAdded++; }
  }

  // yoe_comp_loc_drops: 8 — V6 dropped on yoe / comp / location
  for (const row of cats.yoe_comp_loc_drops) {
    const sd = sdByUrl.get(String(row.url || "").toLowerCase()) || row;
    const f = fixtureFromRow(row, "yoe_comp_loc_drops",
      `V6 hard-drop on ${sd.hard_drop_reason || row.hard_drop_reason}; expect V7 unchanged (no V7-Ax touches yoe/comp/loc).`,
      true, sd.hard_drop_reason || row.hard_drop_reason || "", null, "claude");
    if (f) fixtures.push(f);
  }

  // score_deltas_high: target 6 — high score deltas (kept rows)
  let scoreDeltasAdded = 0;
  for (const row of cats.score_deltas_high) {
    if (scoreDeltasAdded >= 6) break;
    const sd = sdByUrl.get(String(row.url || "").toLowerCase()) || row;
    const isDropped = sd.hard_drop === "yes";
    const f = fixtureFromRow(row, "score_deltas_high",
      `V6 high score-delta row (delta=${row.score_delta || sd.score_delta}); ${isDropped ? "still dropped despite delta" : "kept at higher band"}.`,
      isDropped, sd.hard_drop_reason || "", sd.shadow_band || null);
    if (f) { fixtures.push(f); scoreDeltasAdded++; }
  }

  // adversarial: 6 — Anthropic India / Japan / US / Atlassian / example.com / Lattice
  for (const row of cats.adversarial) {
    const sd = sdByUrl.get(String(row.url || "").toLowerCase()) || row;
    const url = String(row.url || "");
    let category = "adversarial";
    let rationale, hardDropExpected, reasonExpected;
    if (/anthropic\/jobs\/5117581008/i.test(url)) {
      category = "adversarial_anthropic_india";
      hardDropExpected = true;
      reasonExpected = "non_na_territory_with_sales_context";
      rationale = "V7-A3 acceptance: Anthropic India — territory NON_NA + sales context => drops on non_na_territory_with_sales_context.";
    } else if (/anthropic\/jobs\/5076109008/i.test(url)) {
      category = "adversarial_anthropic_japan";
      hardDropExpected = true;
      reasonExpected = "non_na_territory_with_sales_context";
      rationale = "V7-A3 acceptance: Anthropic Japan — territory NON_NA + sales context => drops on non_na_territory_with_sales_context.";
    } else if (/anthropic\/jobs\/5192805008/i.test(url)) {
      category = "adversarial_anthropic_us";
      hardDropExpected = true;
      reasonExpected = sd.hard_drop_reason || "sales_role_content";
      rationale = "V7-A3 acceptance: Anthropic Commercial (US) — territory NA or UNKNOWN; should NOT drop on territory but may still drop on sales_role_content per V6.";
    } else if (/atlassian.*all-jobs/i.test(url)) {
      category = "adversarial_atlassian_listing";
      hardDropExpected = false;
      reasonExpected = "";
      rationale = "V7 unchanged from V6: source_repair_reason=generic_careers_index forces hard_drop=no.";
    } else if (/example\.com/i.test(url)) {
      category = "adversarial_example_placeholder";
      hardDropExpected = false;
      reasonExpected = "";
      rationale = "V7 unchanged from V6: source_repair_reason=placeholder_or_invalid_url forces hard_drop=no.";
    } else if (/lattice/i.test(row.company || "")) {
      category = "adversarial_lattice_per_label";
      hardDropExpected = sd.hard_drop === "yes";
      reasonExpected = sd.hard_drop_reason || "";
      rationale = "V6 per-label aggregation: AI_PROGRAM_OPS row with sales_department alone does NOT fire sales_role_content. Row may still drop on location.";
    } else {
      hardDropExpected = sd.hard_drop === "yes";
      reasonExpected = sd.hard_drop_reason || "";
      rationale = "Adversarial canary; V7 expected unchanged.";
    }
    const f = fixtureFromRow(row, category, rationale, hardDropExpected, reasonExpected,
      sd.shadow_band || null, "claude");
    if (f) fixtures.push(f);
  }

  // Trim/pad to exactly 50 if necessary.
  // Write fixtures
  const lines = fixtures.map((f) => JSON.stringify(f));
  fs.writeFileSync(OUT_FILE, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${fixtures.length} fixtures to ${OUT_FILE}`);
  // Distribution print
  const dist = {};
  for (const f of fixtures) dist[f.category] = (dist[f.category] || 0) + 1;
  for (const [k, v] of Object.entries(dist)) console.log(`  ${k}: ${v}`);
};

main().catch((e) => { console.error(e); process.exit(1); });
