#!/usr/bin/env node
// Deterministic row-level diff for shadow production-filter audit workbooks.
// Reads generated V3/V4/V5 artifacts only. No network, no production mutation.

import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
const careerOpsRequire = createRequire(resolve(CAREER_OPS, "package.json"));

let ExcelJS;
try {
  ExcelJS = careerOpsRequire("exceljs");
} catch {
  throw new Error("Missing exceljs. Run `npm install` inside career-ops/.");
}

const DEFAULT_RUN_DATE = "2026-05-01";
const DEFAULT_OUTPUT_XLSX = resolve(CAREER_OPS, "output", "production-filter-refinement-v3-v4-v5-diff.xlsx");
const DEFAULT_SUMMARY_JSON = resolve(REPO_ROOT, "docs", "audits", "2026-05-05-shadow-version-diff-summary.json");

const DEFAULT_VERSIONS = {
  v3: resolve(CAREER_OPS, "output", `production-filter-refinement-review-${DEFAULT_RUN_DATE}-v3.xlsx`),
  v4: resolve(CAREER_OPS, "output", `production-filter-refinement-review-${DEFAULT_RUN_DATE}-v4.xlsx`),
  v5: resolve(CAREER_OPS, "output", `production-filter-refinement-review-${DEFAULT_RUN_DATE}-v5.xlsx`),
};

const DIFF_FIELDS = [
  "company",
  "title",
  "url",
  "visible_in_baseline_excel",
  "cache_hit",
  "old_pre_score",
  "old_band",
  "primary_family",
  "shadow_score",
  "shadow_band",
  "score_delta",
  "hard_drop",
  "hard_drop_reason",
  "hard_drop_evidence",
  "decision_confidence",
  "sales_hard_drop",
  "sales_hard_drop_evidence",
  "compensation_reason",
  "compensation_candidate",
  "yoe_reason",
  "yoe_years",
  "location_reason",
  "location_annotations",
  "source_repair",
  "source_repair_reason",
  "source_repair_review",
  "source_repair_evidence",
  "reviewer_queue",
  "validation_finding",
  "validation_details",
  "annotations",
  "score_reasons",
];

const SHEET_NAMES = [
  "Diff Manifest",
  "V3 to V4 Changed Rows",
  "V4 to V5 Changed Rows",
  "Hard Drop Added",
  "Hard Drop Removed",
  "Hard Drop Reason Changed",
  "Review Queue Movement",
  "Source Repair Movement",
  "Score And Band Changes",
  "Signal Changes",
  "Company Role Pivot",
  "Unmatched Rows",
  "Summary Metrics",
];

export function normalizeUrl(url) {
  return String(url || "")
    .trim()
    .replace(/#.*$/, "")
    .replace(/\?.*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function rowKey(row) {
  return [
    normalizeUrl(row.url),
    normalizeKeyPart(row.company),
    normalizeKeyPart(row.title),
  ].join("\t");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function rel(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCell(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value.text) return String(value.text);
    if (value.hyperlink) return String(value.hyperlink);
    if (value.richText) return value.richText.map((part) => part.text || "").join("");
    if (value.result != null) return String(value.result);
    return JSON.stringify(value);
  }
  return String(value);
}

function materialize(value) {
  return normalizeCell(value).replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function truthyYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

export function parseArgs(argv) {
  const flags = {
    runDate: DEFAULT_RUN_DATE,
    outputXlsx: DEFAULT_OUTPUT_XLSX,
    summaryJson: DEFAULT_SUMMARY_JSON,
    allowOverwrite: false,
    versions: { ...DEFAULT_VERSIONS },
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run-date") flags.runDate = argv[++i];
    else if (arg === "--output-xlsx") flags.outputXlsx = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--summary-json") flags.summaryJson = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--v3") flags.versions.v3 = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--v4") flags.versions.v4 = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--v5") flags.versions.v5 = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--allow-overwrite") flags.allowOverwrite = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/shadow-version-diff.mjs [--allow-overwrite]");
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return flags;
}

async function readSheet(workbook, sheetName) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return [];
  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = normalizeHeader(cell.value);
  });
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const out = {};
    for (let i = 1; i < headers.length; i++) {
      if (!headers[i]) continue;
      out[headers[i]] = materialize(row.getCell(i).value);
    }
    if (Object.values(out).some((v) => String(v || "").trim())) rows.push(out);
  });
  return rows;
}

function indexByUrl(rows, version, sheetName, warnings) {
  const map = new Map();
  for (const row of rows) {
    const key = rowKey(row);
    if (!key) continue;
    if (map.has(key)) {
      warnings.push(`${version} ${sheetName} duplicate row key: ${key.replace(/\t/g, " | ")}`);
      continue;
    }
    map.set(key, row);
  }
  return map;
}

function joinText(...values) {
  return values.filter((v) => String(v || "").trim()).join(" | ");
}

async function readVersion(version, filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing workbook for ${version}: ${filePath}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const warnings = [];
  const rowsBySheet = {};
  for (const sheet of [
    "Shadow Decisions",
    "Hard Drop Review",
    "Sales Hard Drops",
    "Comp YoE Location",
    "Validation Findings",
    "Source Repair Review",
    "Reviewer Queue",
  ]) {
    rowsBySheet[sheet] = await readSheet(workbook, sheet);
  }

  const hardDrop = indexByUrl(rowsBySheet["Hard Drop Review"], version, "Hard Drop Review", warnings);
  const sales = indexByUrl(rowsBySheet["Sales Hard Drops"], version, "Sales Hard Drops", warnings);
  const compYoeLocation = indexByUrl(rowsBySheet["Comp YoE Location"], version, "Comp YoE Location", warnings);
  const validation = indexByUrl(rowsBySheet["Validation Findings"], version, "Validation Findings", warnings);
  const sourceRepair = indexByUrl(rowsBySheet["Source Repair Review"], version, "Source Repair Review", warnings);
  const reviewerQueue = indexByUrl(rowsBySheet["Reviewer Queue"], version, "Reviewer Queue", warnings);

  const records = new Map();
  const duplicateRows = [];
  for (const row of rowsBySheet["Shadow Decisions"]) {
    const key = rowKey(row);
    if (!key) continue;
    if (records.has(key)) {
      duplicateRows.push({ version, key, company: row.company, title: row.title, url: row.url });
      warnings.push(`${version} Shadow Decisions duplicate row key: ${key.replace(/\t/g, " | ")}`);
      continue;
    }

    const hd = hardDrop.get(key) || {};
    const salesRow = sales.get(key) || {};
    const cyl = compYoeLocation.get(key) || {};
    const val = validation.get(key) || {};
    const repair = sourceRepair.get(key) || {};
    const rq = reviewerQueue.get(key) || {};

    const sourceRepairReason = row.source_repair_reason || repair.source_repair_reason || "";
    const sourceRepairFlag = row.source_repair || (repair.url ? "yes" : "no");

    records.set(key, {
      key,
      company: row.company || hd.company || cyl.company || repair.company || rq.company || "",
      title: row.title || hd.title || cyl.title || repair.title || rq.title || "",
      url: row.url || hd.url || cyl.url || repair.url || rq.url || "",
      visible_in_baseline_excel: row.visible_in_baseline_excel || hd.visible_in_baseline_excel || "",
      cache_hit: row.cache_hit || repair.cache_hit || "",
      old_pre_score: row.old_pre_score || "",
      old_band: row.old_band || "",
      primary_family: row.primary_family || repair.primary_family || rq.primary_family || "",
      shadow_score: row.shadow_score || repair.shadow_score || rq.shadow_score || "",
      shadow_band: row.shadow_band || repair.shadow_band || rq.shadow_band || "",
      score_delta: row.score_delta || "",
      hard_drop: row.hard_drop || (hd.url ? "yes" : "no"),
      hard_drop_reason: row.hard_drop_reason || hd.hard_drop_reason || "",
      hard_drop_evidence: hd.hard_drop_evidence || salesRow.hard_drop_evidence || "",
      decision_confidence: hd.decision_confidence || "",
      sales_hard_drop: salesRow.url ? "yes" : "no",
      sales_hard_drop_evidence: salesRow.hard_drop_evidence || "",
      compensation_reason: cyl.compensation_reason || "",
      compensation_candidate: cyl.compensation_candidate || "",
      yoe_reason: cyl.yoe_reason || "",
      yoe_years: cyl.yoe_years || "",
      location_reason: cyl.location_reason || "",
      location_annotations: cyl.location_annotations || "",
      source_repair: sourceRepairFlag,
      source_repair_reason: sourceRepairReason,
      source_repair_review: repair.url ? "yes" : "no",
      source_repair_evidence: repair.source_repair_evidence || "",
      reviewer_queue: rq.url ? "yes" : "no",
      validation_finding: val.finding_type || "",
      validation_details: val.details || "",
      annotations: row.annotations || repair.annotations || rq.annotations || "",
      score_reasons: row.score_reasons || repair.score_reasons || "",
    });
  }

  return {
    version,
    filePath,
    sha256: sha256(filePath),
    sheetNames: workbook.worksheets.map((sheet) => sheet.name),
    records,
    duplicateRows,
    warnings,
    counts: {
      shadow_rows: records.size,
      hard_drops: [...records.values()].filter((r) => r.hard_drop === "yes").length,
      reviewer_queue: [...records.values()].filter((r) => r.reviewer_queue === "yes").length,
      source_repair_review_sheet_rows: rowsBySheet["Source Repair Review"].length,
      source_repair_review_shadow_rows: [...records.values()].filter((r) => r.source_repair_review === "yes").length,
      sales_hard_drops: [...records.values()].filter((r) => r.sales_hard_drop === "yes").length,
      validation_findings: [...records.values()].filter((r) => r.validation_finding).length,
    },
  };
}

function fieldChanges(fromRecord, toRecord) {
  const changes = [];
  for (const field of DIFF_FIELDS) {
    const oldValue = materialize(fromRecord?.[field] || "");
    const newValue = materialize(toRecord?.[field] || "");
    if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
  }
  return changes;
}

function reasonTokens(reason) {
  return new Set(String(reason || "").split(";").map((part) => part.trim()).filter(Boolean));
}

function tokenDelta(oldReason, newReason) {
  const oldTokens = reasonTokens(oldReason);
  const newTokens = reasonTokens(newReason);
  const added = [...newTokens].filter((token) => !oldTokens.has(token));
  const removed = [...oldTokens].filter((token) => !newTokens.has(token));
  return { added, removed };
}

function classifyChange(fromRecord, toRecord, changes, pairLabel) {
  const changeTypes = [];
  const oldHard = fromRecord?.hard_drop === "yes";
  const newHard = toRecord?.hard_drop === "yes";
  if (!oldHard && newHard) changeTypes.push("hard_drop_added");
  if (oldHard && !newHard) changeTypes.push("hard_drop_removed");
  if (oldHard && newHard && fromRecord.hard_drop_reason !== toRecord.hard_drop_reason) changeTypes.push("hard_drop_reason_changed");
  if ((fromRecord?.reviewer_queue || "no") !== (toRecord?.reviewer_queue || "no")) changeTypes.push("review_queue_movement");
  if ((fromRecord?.source_repair_review || "no") !== (toRecord?.source_repair_review || "no") || (fromRecord?.source_repair_reason || "") !== (toRecord?.source_repair_reason || "")) {
    changeTypes.push("source_repair_movement");
  }
  if (["shadow_score", "shadow_band", "score_delta", "primary_family"].some((field) => materialize(fromRecord?.[field]) !== materialize(toRecord?.[field]))) {
    changeTypes.push("score_or_band_changed");
  }
  if (["compensation_reason", "compensation_candidate", "yoe_reason", "yoe_years", "location_reason", "location_annotations", "sales_hard_drop", "validation_finding"].some((field) => materialize(fromRecord?.[field]) !== materialize(toRecord?.[field]))) {
    changeTypes.push("signal_changed");
  }
  if (!changeTypes.length && changes.length) changeTypes.push("supporting_info_changed");

  const likely = inferLikelyCause(fromRecord, toRecord, pairLabel);
  return {
    change_type: changeTypes.join("; "),
    likely_cause: likely.join("; "),
  };
}

function inferLikelyCause(fromRecord, toRecord, pairLabel) {
  const causes = new Set();
  const oldReason = fromRecord?.hard_drop_reason || "";
  const newReason = toRecord?.hard_drop_reason || "";
  const reasonText = `${oldReason} ${newReason}`;
  const delta = tokenDelta(oldReason, newReason);
  const oldHard = fromRecord?.hard_drop === "yes";
  const newHard = toRecord?.hard_drop === "yes";

  if (pairLabel === "v3_to_v4") {
    if (/non_toronto|hybrid|onsite|remote|location/.test(reasonText) || /location/.test(joinText(...delta.added, ...delta.removed))) {
      causes.add(oldHard && !newHard ? "remote_location_parser_refinement_recovered_row" : "location_reason_coverage_change");
    }
    if (/sales_role/.test(reasonText) || fromRecord?.sales_hard_drop !== toRecord?.sales_hard_drop) {
      causes.add(!oldHard && newHard ? "sales_classifier_expansion" : "sales_classifier_refinement");
    }
    if ((fromRecord?.primary_family || "") !== (toRecord?.primary_family || "")) causes.add("title_family_expansion_or_reclassification");
    if ((fromRecord?.shadow_score || "") !== (toRecord?.shadow_score || "") || (fromRecord?.shadow_band || "") !== (toRecord?.shadow_band || "")) {
      causes.add("semantic_score_refinement");
    }
    if (fromRecord?.reviewer_queue !== toRecord?.reviewer_queue) causes.add("review_queue_cleanup");
  } else if (pairLabel === "v4_to_v5") {
    if (toRecord?.source_repair_review === "yes" || toRecord?.source_repair === "yes" || toRecord?.source_repair_reason) {
      causes.add("source_hygiene_gate_added");
      if (/missing_jd_cache/.test(toRecord.source_repair_reason || "")) causes.add("missing_jd_cache_routed_to_source_repair");
      if (/page_not_found|closed/.test(toRecord.source_repair_reason || "")) causes.add("page_not_found_or_closed_suppressed");
      if (/generic_careers|listing|index/.test(toRecord.source_repair_reason || "")) causes.add("generic_or_listing_page_suppressed");
      if (/not_a_job_page/.test(toRecord.source_repair_reason || "")) causes.add("not_a_job_page_suppressed");
    }
    if (/non_toronto|hybrid|onsite/.test(reasonText) && oldHard && !newHard) causes.add("invalid_source_location_hard_drop_removed");
    if (/sales_role/.test(reasonText) && oldHard && !newHard) causes.add("invalid_source_sales_hard_drop_removed");
    if (/yoe_required/.test(reasonText) && oldHard && !newHard) causes.add("invalid_source_yoe_hard_drop_removed");
    if (/United States \(Remote\)|Remote - USA|Washington.*Remote/i.test(joinText(toRecord?.location_annotations, toRecord?.score_reasons, toRecord?.annotations))) {
      causes.add("remote_region_recognition_fixed");
    }
  }
  if (!causes.size) causes.add("material_field_changed");
  return [...causes];
}

function diffVersions(fromVersion, toVersion, pairLabel) {
  const allKeys = new Set([...fromVersion.records.keys(), ...toVersion.records.keys()]);
  const changedRows = [];
  const unmatchedRows = [];
  for (const key of [...allKeys].sort()) {
    const fromRecord = fromVersion.records.get(key);
    const toRecord = toVersion.records.get(key);
    if (!fromRecord || !toRecord) {
      unmatchedRows.push({
        comparison: pairLabel,
        version_present: fromRecord ? fromVersion.version : toVersion.version,
        company: (fromRecord || toRecord).company,
        title: (fromRecord || toRecord).title,
        url: (fromRecord || toRecord).url,
        reason: fromRecord ? `missing in ${toVersion.version}` : `missing in ${fromVersion.version}`,
      });
      continue;
    }
    const changes = fieldChanges(fromRecord, toRecord);
    if (!changes.length) continue;
    const { change_type, likely_cause } = classifyChange(fromRecord, toRecord, changes, pairLabel);
    const reasonDelta = tokenDelta(fromRecord.hard_drop_reason, toRecord.hard_drop_reason);
    changedRows.push({
      comparison: pairLabel,
      version_from: fromVersion.version,
      version_to: toVersion.version,
      company: toRecord.company || fromRecord.company,
      title: toRecord.title || fromRecord.title,
      url: toRecord.url || fromRecord.url,
      old_hard_drop: fromRecord.hard_drop,
      new_hard_drop: toRecord.hard_drop,
      old_hard_drop_reason: fromRecord.hard_drop_reason,
      new_hard_drop_reason: toRecord.hard_drop_reason,
      hard_drop_reasons_added: reasonDelta.added.join("; "),
      hard_drop_reasons_removed: reasonDelta.removed.join("; "),
      old_score: fromRecord.shadow_score,
      new_score: toRecord.shadow_score,
      old_band: fromRecord.shadow_band,
      new_band: toRecord.shadow_band,
      old_role_family: fromRecord.primary_family,
      new_role_family: toRecord.primary_family,
      old_reviewer_queue: fromRecord.reviewer_queue,
      new_reviewer_queue: toRecord.reviewer_queue,
      old_source_repair: fromRecord.source_repair_review,
      new_source_repair: toRecord.source_repair_review,
      old_source_repair_reason: fromRecord.source_repair_reason,
      new_source_repair_reason: toRecord.source_repair_reason,
      old_sales_hard_drop: fromRecord.sales_hard_drop,
      new_sales_hard_drop: toRecord.sales_hard_drop,
      old_compensation_reason: fromRecord.compensation_reason,
      new_compensation_reason: toRecord.compensation_reason,
      old_yoe_reason: fromRecord.yoe_reason,
      new_yoe_reason: toRecord.yoe_reason,
      old_location_reason: fromRecord.location_reason,
      new_location_reason: toRecord.location_reason,
      change_type,
      likely_cause,
      changed_fields: changes.map((c) => c.field).join("; "),
      changed_field_count: changes.length,
      changed_values: changes.map((c) => `${c.field}: "${c.oldValue}" -> "${c.newValue}"`).join(" || "),
      old_evidence: joinText(fromRecord.hard_drop_evidence, fromRecord.source_repair_evidence, fromRecord.validation_details).slice(0, 1000),
      new_evidence: joinText(toRecord.hard_drop_evidence, toRecord.source_repair_evidence, toRecord.validation_details).slice(0, 1000),
    });
  }
  return { changedRows, unmatchedRows };
}

function addSheet(workbook, name, rows, columns) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((key) => ({
    header: key.replace(/_/g, " "),
    key,
    width: Math.min(70, Math.max(12, key.length + 3)),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (columns.length) {
    sheet.autoFilter = { from: "A1", to: `${columnLetter(columns.length)}1` };
  }
  for (const row of rows) sheet.addRow(row);
  for (const col of sheet.columns) {
    let width = Math.max(12, String(col.header || "").length + 2);
    col.eachCell({ includeEmpty: false }, (cell) => {
      width = Math.max(width, Math.min(90, String(cell.value ?? "").length + 2));
    });
    col.width = Math.min(80, width);
  }
}

function columnLetter(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function countWhere(rows, predicate) {
  return rows.filter(predicate).length;
}

function buildCompanyPivot(rows) {
  return [...groupBy(rows, (r) => `${r.comparison}\t${r.company}`).entries()]
    .map(([key, group]) => {
      const [comparison, company] = key.split("\t");
      return {
        comparison,
        company,
        changed_rows: group.length,
        hard_drop_added: countWhere(group, (r) => /hard_drop_added/.test(r.change_type)),
        hard_drop_removed: countWhere(group, (r) => /hard_drop_removed/.test(r.change_type)),
        hard_drop_reason_changed: countWhere(group, (r) => /hard_drop_reason_changed/.test(r.change_type)),
        review_queue_movement: countWhere(group, (r) => /review_queue_movement/.test(r.change_type)),
        source_repair_movement: countWhere(group, (r) => /source_repair_movement/.test(r.change_type)),
        score_or_band_changed: countWhere(group, (r) => /score_or_band_changed/.test(r.change_type)),
        titles: group.map((r) => r.title).join(" | "),
      };
    })
    .sort((a, b) => a.comparison.localeCompare(b.comparison) || b.changed_rows - a.changed_rows || a.company.localeCompare(b.company));
}

function buildSummaryMetrics(v3, v4, v5, v3v4, v4v5, unmatchedRows) {
  const comparisons = [
    ["v3_to_v4", v3, v4, v3v4.changedRows],
    ["v4_to_v5", v4, v5, v4v5.changedRows],
  ];
  const rows = [];
  for (const [comparison, from, to, changed] of comparisons) {
    rows.push(
      { comparison, metric: "from_shadow_rows", value: from.counts.shadow_rows },
      { comparison, metric: "to_shadow_rows", value: to.counts.shadow_rows },
      { comparison, metric: "changed_rows_any_material_field", value: changed.length },
      { comparison, metric: "hard_drop_added_rows", value: countWhere(changed, (r) => /hard_drop_added/.test(r.change_type)) },
      { comparison, metric: "hard_drop_removed_rows", value: countWhere(changed, (r) => /hard_drop_removed/.test(r.change_type)) },
      { comparison, metric: "hard_drop_reason_changed_rows", value: countWhere(changed, (r) => /hard_drop_reason_changed/.test(r.change_type)) },
      { comparison, metric: "review_queue_movement_rows", value: countWhere(changed, (r) => /review_queue_movement/.test(r.change_type)) },
      { comparison, metric: "source_repair_movement_rows", value: countWhere(changed, (r) => /source_repair_movement/.test(r.change_type)) },
      { comparison, metric: "score_or_band_changed_rows", value: countWhere(changed, (r) => /score_or_band_changed/.test(r.change_type)) },
      { comparison, metric: "signal_changed_rows", value: countWhere(changed, (r) => /signal_changed/.test(r.change_type)) },
      { comparison, metric: "from_hard_drops", value: from.counts.hard_drops },
      { comparison, metric: "to_hard_drops", value: to.counts.hard_drops },
      { comparison, metric: "net_hard_drop_delta", value: to.counts.hard_drops - from.counts.hard_drops },
      { comparison, metric: "unmatched_rows", value: countWhere(unmatchedRows, (r) => r.comparison === comparison) },
    );
  }
  return rows;
}

export async function buildVersionDiff(flags) {
  const versions = {
    v3: await readVersion("v3", flags.versions.v3),
    v4: await readVersion("v4", flags.versions.v4),
    v5: await readVersion("v5", flags.versions.v5),
  };
  const v3v4 = diffVersions(versions.v3, versions.v4, "v3_to_v4");
  const v4v5 = diffVersions(versions.v4, versions.v5, "v4_to_v5");
  const changedRows = [...v3v4.changedRows, ...v4v5.changedRows];
  const unmatchedRows = [...v3v4.unmatchedRows, ...v4v5.unmatchedRows];
  const manifestRows = Object.values(versions).flatMap((v) => [
    {
      artifact: `${v.version}_workbook`,
      path: rel(v.filePath),
      sha256: v.sha256,
      rows: v.counts.shadow_rows,
      hard_drops: v.counts.hard_drops,
      reviewer_queue: v.counts.reviewer_queue,
      source_repair_review: v.counts.source_repair_review_sheet_rows,
      source_repair_review_shadow_rows: v.counts.source_repair_review_shadow_rows,
      warnings: v.warnings.join(" | "),
    },
  ]);
  const summaryMetrics = buildSummaryMetrics(versions.v3, versions.v4, versions.v5, v3v4, v4v5, unmatchedRows);
  const companyPivot = buildCompanyPivot(changedRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "career-ops shadow diff";
  wb.created = new Date("2026-05-05T00:00:00-04:00");
  wb.modified = wb.created;

  const changedCols = [
    "comparison", "company", "title", "url", "old_hard_drop", "new_hard_drop", "old_hard_drop_reason", "new_hard_drop_reason",
    "hard_drop_reasons_added", "hard_drop_reasons_removed", "old_score", "new_score", "old_band", "new_band", "old_role_family",
    "new_role_family", "old_reviewer_queue", "new_reviewer_queue", "old_source_repair", "new_source_repair", "old_source_repair_reason",
    "new_source_repair_reason", "old_sales_hard_drop", "new_sales_hard_drop", "old_compensation_reason", "new_compensation_reason",
    "old_yoe_reason", "new_yoe_reason", "old_location_reason", "new_location_reason", "change_type", "likely_cause",
    "changed_fields", "changed_field_count", "changed_values", "old_evidence", "new_evidence",
  ];

  addSheet(wb, "Diff Manifest", manifestRows, ["artifact", "path", "sha256", "rows", "hard_drops", "reviewer_queue", "source_repair_review", "source_repair_review_shadow_rows", "warnings"]);
  addSheet(wb, "V3 to V4 Changed Rows", v3v4.changedRows, changedCols);
  addSheet(wb, "V4 to V5 Changed Rows", v4v5.changedRows, changedCols);
  addSheet(wb, "Hard Drop Added", changedRows.filter((r) => /hard_drop_added/.test(r.change_type)), changedCols);
  addSheet(wb, "Hard Drop Removed", changedRows.filter((r) => /hard_drop_removed/.test(r.change_type)), changedCols);
  addSheet(wb, "Hard Drop Reason Changed", changedRows.filter((r) => /hard_drop_reason_changed/.test(r.change_type)), changedCols);
  addSheet(wb, "Review Queue Movement", changedRows.filter((r) => /review_queue_movement/.test(r.change_type)), changedCols);
  addSheet(wb, "Source Repair Movement", changedRows.filter((r) => /source_repair_movement/.test(r.change_type)), changedCols);
  addSheet(wb, "Score And Band Changes", changedRows.filter((r) => /score_or_band_changed/.test(r.change_type)), changedCols);
  addSheet(wb, "Signal Changes", changedRows.filter((r) => /signal_changed/.test(r.change_type)), changedCols);
  addSheet(wb, "Company Role Pivot", companyPivot, ["comparison", "company", "changed_rows", "hard_drop_added", "hard_drop_removed", "hard_drop_reason_changed", "review_queue_movement", "source_repair_movement", "score_or_band_changed", "titles"]);
  addSheet(wb, "Unmatched Rows", unmatchedRows, ["comparison", "version_present", "company", "title", "url", "reason"]);
  addSheet(wb, "Summary Metrics", summaryMetrics, ["comparison", "metric", "value"]);

  fs.mkdirSync(dirname(flags.outputXlsx), { recursive: true });
  if (fs.existsSync(flags.outputXlsx) && !flags.allowOverwrite) {
    throw new Error(`Output exists: ${flags.outputXlsx}. Pass --allow-overwrite to replace.`);
  }
  await wb.xlsx.writeFile(flags.outputXlsx);

  const summary = {
    run_date: flags.runDate,
    generated_at: new Date().toISOString(),
    outputs: {
      workbook: rel(flags.outputXlsx),
      summary_json: rel(flags.summaryJson),
    },
    inputs: Object.fromEntries(Object.values(versions).map((v) => [v.version, { path: rel(v.filePath), sha256: v.sha256, counts: v.counts }])),
    counts: Object.fromEntries(summaryMetrics.map((r) => [`${r.comparison}.${r.metric}`, r.value])),
    sheet_names: SHEET_NAMES,
    warnings: [
      ...Object.values(versions).flatMap((v) => v.warnings),
      ...unmatchedRows.map((r) => `${r.comparison}: ${r.reason}: ${r.url}`),
    ],
  };
  fs.mkdirSync(dirname(flags.summaryJson), { recursive: true });
  fs.writeFileSync(flags.summaryJson, JSON.stringify(summary, null, 2) + "\n", "utf8");

  return { versions, v3v4, v4v5, changedRows, unmatchedRows, summary };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildVersionDiff(parseArgs(process.argv)).then(({ summary }) => {
    console.log(`Wrote ${summary.outputs.workbook}`);
    console.log(`Wrote ${summary.outputs.summary_json}`);
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
