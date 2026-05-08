#!/usr/bin/env node
// V9 -> V10 deterministic row-level diff for shadow production-filter audit
// workbooks. Mirrors scripts/v8-v9-diff.mjs and encodes V10-specific
// likely-cause inferences:
//   - V10-A1: implicit location-section anchor symmetric gate (Round 6 §V10).
//             V9-2 fired NON_NA implicit anchors via numeric majority without
//             considering NA token presence — V10-1 gates the implicit anchor
//             on either NA-absence or NON_NA strict-majority (>2× NA tokens).
//             Otherwise the implicit anchor is suppressed entirely. Closes 2
//             confirmed Round 6 FPs (GitLab Engineering Manager Workflow
//             Catalog with `Remote, EMEA; Remote, US-Southeast`; ElevenLabs
//             Forward Deployed Engineer with `San Francisco; Brazil; France;
//             India; New York`).
//
// Acts as the regression-baseline gate: every V9→V10 hard_drop status flip
// AND reason-string change is tagged to V10-A1 / OTHER.
//
// Note on V10-A1 also covering side-effect ADDS: when a JD has multiple
// `location`-typed sections (e.g., Cohere with both a canonical `## Location`
// and a company-context offices line), V10-1's gate may now SUPPRESS the
// offices-line anchor (NA-mixed body) while leaving an unrelated NON_NA-only
// section's anchor uncontested. The result is a flip from V9 NA → V10 NON_NA
// (hard_drop_added) — these are still attributed to V10-A1 because they
// causally derive from the symmetric gate. Inspect `Hard Drop Added` sheet
// rows for these multi-section interactions.

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
const DEFAULT_OUTPUT_XLSX = resolve(CAREER_OPS, "output", "production-filter-refinement-v9-v10-diff.xlsx");
const DEFAULT_SUMMARY_JSON = resolve(REPO_ROOT, "docs", "audits", "2026-05-07-shadow-v9-v10-diff-summary.json");

const DEFAULT_VERSIONS = {
  v9: resolve(CAREER_OPS, "output", `production-filter-refinement-review-${DEFAULT_RUN_DATE}-v9.xlsx`),
  v10: resolve(CAREER_OPS, "output", `production-filter-refinement-review-${DEFAULT_RUN_DATE}-v10.xlsx`),
};

const DIFF_FIELDS = [
  "company", "title", "url", "visible_in_baseline_excel", "cache_hit", "old_pre_score", "old_band", "primary_family",
  "shadow_score", "shadow_band", "score_delta", "hard_drop", "hard_drop_reason", "hard_drop_evidence", "decision_confidence",
  "sales_hard_drop", "sales_hard_drop_evidence", "compensation_reason", "compensation_candidate", "yoe_reason", "yoe_years",
  "location_reason", "location_annotations", "source_repair", "source_repair_reason", "source_repair_review",
  "source_repair_evidence", "reviewer_queue", "validation_finding", "validation_details", "annotations", "score_reasons",
  "territory_region", "territory_evidence", "territory_dropped",
];

const SHEET_NAMES = [
  "Diff Manifest",
  "V9 to V10 Changed Rows",
  "Hard Drop Added",
  "Hard Drop Removed",
  "Hard Drop Reason Changed",
  "V10-A1 Symmetric Gate",
  "Score And Band Changes",
  "Signal Changes",
  "Company Role Pivot",
  "Unmatched Rows",
  "Summary Metrics",
];

export function normalizeUrl(url) {
  return String(url || "").trim().replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/$/, "").toLowerCase();
}

function normalizeKeyPart(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function rowKey(row) {
  return [normalizeUrl(row.url), normalizeKeyPart(row.company)].join("\t");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function rel(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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
    else if (arg === "--v9") flags.versions.v9 = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--v10") flags.versions.v10 = resolve(REPO_ROOT, argv[++i]);
    else if (arg === "--allow-overwrite") flags.allowOverwrite = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/v9-v10-diff.mjs [--allow-overwrite] [--v9 PATH] [--v10 PATH]");
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
    "Shadow Decisions", "Hard Drop Review", "Sales Hard Drops", "Comp YoE Location",
    "Validation Findings", "Source Repair Review", "Reviewer Queue",
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
  for (const row of rowsBySheet["Shadow Decisions"]) {
    const key = rowKey(row);
    if (!key) continue;
    if (records.has(key)) {
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

    const record = {
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
      territory_region: row.territory_region || "",
      territory_evidence: row.territory_evidence || "",
      territory_dropped: row.territory_dropped || "",
    };
    records.set(key, record);
  }

  return {
    version, filePath, sha256: sha256(filePath),
    sheetNames: workbook.worksheets.map((sheet) => sheet.name),
    records, warnings,
    counts: {
      shadow_rows: records.size,
      hard_drops: [...records.values()].filter((r) => r.hard_drop === "yes").length,
      reviewer_queue: [...records.values()].filter((r) => r.reviewer_queue === "yes").length,
      source_repair_review_sheet_rows: rowsBySheet["Source Repair Review"].length,
      source_repair_review_shadow_rows: [...records.values()].filter((r) => r.source_repair_review === "yes").length,
      sales_hard_drops: [...records.values()].filter((r) => r.sales_hard_drop === "yes").length,
      validation_findings: [...records.values()].filter((r) => r.validation_finding).length,
      territory_hard_drops: [...records.values()].filter((r) => /non_na_territory/.test(r.hard_drop_reason || "")).length,
      workday_chrome_routes: [...records.values()].filter((r) => /workday_language_switcher_chrome/.test(r.source_repair_reason || "")).length,
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
  return {
    added: [...newTokens].filter((token) => !oldTokens.has(token)),
    removed: [...oldTokens].filter((token) => !newTokens.has(token)),
  };
}

// V10 likely-cause classifier. Inspects reason-token delta + territory_evidence
// and territory_region transitions to tag the responsible V10-Ax change.
//
// V10-A1 (symmetric gate on V9-2 implicit location-section anchor):
//   Closure shape (drop → keep):
//     - V9 dropped on `non_na_territory`, V10 keeps; territory_region
//       transitions NON_NA → UNKNOWN/NA. The V9 evidence contains the
//       `location-section:` marker (V9-2 anchor source) AND the matching JD
//       location body has BOTH NA tokens AND NON_NA tokens (the "gate
//       fall-through" shape — the GitLab Eng Mgr / ElevenLabs FDE root cause).
//   Side-effect-add shape (keep → drop):
//     - V9 kept (territory NA from offices-line anchor outvoting), V10 drops
//       on `non_na_territory`. Multi-section JDs (e.g. Cohere SA/FDE with a
//       `## Location\nJapan` or `## Location\nMiddle East` head section + a
//       `## offices in Toronto, NY, SF, London, Paris` company-context line).
//       Under V9 the offices line fired with NA majority and outvoted the
//       canonical NON_NA section. Under V10-1 the offices line is suppressed
//       (mixed NA/NON_NA tokens, NON_NA not strictly majority), revealing the
//       canonical section's NON_NA dominance. The flip is causally
//       attributable to V10-1.
export function classifyV10Cause(fromRecord, toRecord, changes) {
  const causes = new Set();
  const oldReason = fromRecord?.hard_drop_reason || "";
  const newReason = toRecord?.hard_drop_reason || "";
  const delta = tokenDelta(oldReason, newReason);
  const oldHard = fromRecord?.hard_drop === "yes";
  const newHard = toRecord?.hard_drop === "yes";
  const oldTerrEvidence = fromRecord?.territory_evidence || "";
  const newTerrEvidence = toRecord?.territory_evidence || "";
  const oldTerritory = fromRecord?.territory_region || "";
  const newTerritory = toRecord?.territory_region || "";

  // V10-A1 closure: V9 territory drop, V10 keeps, with territory transition
  // NON_NA → (UNKNOWN | NA). V10-1 is the only territory-affecting V10 change
  // and only loosens the territory gate — by construction every V9→V10
  // closure on non_na_territory is V10-A1 attributable. The
  // `location-section:` evidence marker is preferred when present but
  // production-filter-refinement-audit truncates territory_evidence to
  // top-3 entries (per audit:328) so the marker is often absent in the
  // workbook — fall back to the (territory-flip + reason-flip) signature.
  const v9DroppedTerritory = oldHard && /non_na_territory/.test(oldReason);
  const v10NoLongerTerritory = !/non_na_territory/.test(newReason);
  const oldEvidenceHasLocationAnchor = /\blocation-section:/i.test(oldTerrEvidence);
  const territoryNonNaToNonNa = oldTerritory === "NON_NA" && (newTerritory === "UNKNOWN" || newTerritory === "NA");
  if (v9DroppedTerritory && v10NoLongerTerritory && territoryNonNaToNonNa) {
    causes.add(oldEvidenceHasLocationAnchor
      ? "V10-A1_symmetric_gate_closure"
      : "V10-A1_symmetric_gate_closure_inferred");
  }

  // V10-A1 side-effect add: V9 kept (territory NA from competing
  // location-section anchor), V10 drops on non_na_territory. V9 territory was
  // NA; V10 territory is NON_NA. Multi-section JDs where V10's gate
  // suppresses an NA-anchor-contributing offices line, leaving a NON_NA
  // section uncontested. Same rationale as closure: V10-1 is the only
  // territory-affecting change, so every V9→V10 territory flip is causally
  // V10-A1.
  const v10NewlyTerritory = !oldHard && newHard && delta.added.includes("non_na_territory");
  const territoryNaToNonNa = oldTerritory === "NA" && newTerritory === "NON_NA";
  if (v10NewlyTerritory && territoryNaToNonNa) {
    causes.add("V10-A1_symmetric_gate_side_effect_add");
  }
  // V10-A1 broader: any UNKNOWN → NON_NA flip that newly fires non_na_territory
  // is also V10-A1 (gate behavior change shifted the implicit-anchor outcome
  // for multi-section JDs even when V9 territory wasn't explicitly NA).
  const territoryUnknownToNonNa = oldTerritory === "UNKNOWN" && newTerritory === "NON_NA";
  if (v10NewlyTerritory && territoryUnknownToNonNa) {
    causes.add("V10-A1_symmetric_gate_side_effect_add");
  }

  // OTHER if a status flip occurred but no cause matched.
  if (oldHard !== newHard && causes.size === 0) {
    causes.add("OTHER_review_for_silent_flip");
  }

  return [...causes];
}

function classifyChange(fromRecord, toRecord, changes) {
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
  if (["compensation_reason", "compensation_candidate", "yoe_reason", "yoe_years", "location_reason", "location_annotations", "validation_finding"].some((field) => materialize(fromRecord?.[field]) !== materialize(toRecord?.[field]))) {
    changeTypes.push("signal_changed");
  }
  if ((fromRecord?.territory_region || "") !== (toRecord?.territory_region || "") ||
      (fromRecord?.territory_dropped || "") !== (toRecord?.territory_dropped || "")) {
    changeTypes.push("territory_signal_changed");
  }
  if (!changeTypes.length && changes.length) changeTypes.push("supporting_info_changed");
  const v10Causes = classifyV10Cause(fromRecord, toRecord, changes);
  return {
    change_type: changeTypes.join("; "),
    v10_cause: v10Causes.join("; "),
  };
}

function diffVersions(fromVersion, toVersion) {
  const changedRows = [];
  const unmatchedRows = [];
  const allKeys = new Set([...fromVersion.records.keys(), ...toVersion.records.keys()]);
  for (const key of [...allKeys].sort()) {
    const fromRecord = fromVersion.records.get(key);
    const toRecord = toVersion.records.get(key);
    if (!fromRecord || !toRecord) {
      unmatchedRows.push({
        comparison: "v9_to_v10",
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
    const { change_type, v10_cause } = classifyChange(fromRecord, toRecord, changes);
    const reasonDelta = tokenDelta(fromRecord.hard_drop_reason, toRecord.hard_drop_reason);
    changedRows.push({
      comparison: "v9_to_v10",
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
      old_territory_region: fromRecord.territory_region,
      new_territory_region: toRecord.territory_region,
      old_territory_dropped: fromRecord.territory_dropped,
      new_territory_dropped: toRecord.territory_dropped,
      old_source_repair_reason: fromRecord.source_repair_reason,
      new_source_repair_reason: toRecord.source_repair_reason,
      change_type,
      v10_cause,
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
  sheet.columns = columns.map((key) => ({ header: key.replace(/_/g, " "), key, width: Math.min(70, Math.max(12, key.length + 3)) }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (columns.length) sheet.autoFilter = { from: "A1", to: `${columnLetter(columns.length)}1` };
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
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
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
  return [...groupBy(rows, (r) => r.company).entries()]
    .map(([company, group]) => ({
      company,
      changed_rows: group.length,
      hard_drop_added: countWhere(group, (r) => /hard_drop_added/.test(r.change_type)),
      hard_drop_removed: countWhere(group, (r) => /hard_drop_removed/.test(r.change_type)),
      hard_drop_reason_changed: countWhere(group, (r) => /hard_drop_reason_changed/.test(r.change_type)),
      v10a1_count: countWhere(group, (r) => /V10-A1/.test(r.v10_cause)),
      other_count: countWhere(group, (r) => /OTHER/.test(r.v10_cause)),
      titles: group.map((r) => r.title).join(" | "),
    }))
    .sort((a, b) => b.changed_rows - a.changed_rows || a.company.localeCompare(b.company));
}

function buildSummaryMetrics(v9, v10, diff, unmatchedRows) {
  const changed = diff.changedRows;
  return [
    { metric: "from_shadow_rows", value: v9.counts.shadow_rows },
    { metric: "to_shadow_rows", value: v10.counts.shadow_rows },
    { metric: "shadow_rows_dedup_delta", value: v10.counts.shadow_rows - v9.counts.shadow_rows },
    { metric: "changed_rows_any_material_field", value: changed.length },
    { metric: "hard_drop_added_rows", value: countWhere(changed, (r) => /hard_drop_added/.test(r.change_type)) },
    { metric: "hard_drop_removed_rows", value: countWhere(changed, (r) => /hard_drop_removed/.test(r.change_type)) },
    { metric: "hard_drop_reason_changed_rows", value: countWhere(changed, (r) => /hard_drop_reason_changed/.test(r.change_type)) },
    { metric: "v10_a1_attributed_rows", value: countWhere(changed, (r) => /V10-A1/.test(r.v10_cause)) },
    { metric: "v10_other_unattributed_rows", value: countWhere(changed, (r) => /OTHER/.test(r.v10_cause)) },
    { metric: "territory_signal_changed_rows", value: countWhere(changed, (r) => /territory_signal_changed/.test(r.change_type)) },
    { metric: "review_queue_movement_rows", value: countWhere(changed, (r) => /review_queue_movement/.test(r.change_type)) },
    { metric: "source_repair_movement_rows", value: countWhere(changed, (r) => /source_repair_movement/.test(r.change_type)) },
    { metric: "score_or_band_changed_rows", value: countWhere(changed, (r) => /score_or_band_changed/.test(r.change_type)) },
    { metric: "signal_changed_rows", value: countWhere(changed, (r) => /signal_changed/.test(r.change_type)) },
    { metric: "from_hard_drops", value: v9.counts.hard_drops },
    { metric: "to_hard_drops", value: v10.counts.hard_drops },
    { metric: "net_hard_drop_delta", value: v10.counts.hard_drops - v9.counts.hard_drops },
    { metric: "from_sales_hard_drops", value: v9.counts.sales_hard_drops },
    { metric: "to_sales_hard_drops", value: v10.counts.sales_hard_drops },
    { metric: "from_territory_hard_drops", value: v9.counts.territory_hard_drops },
    { metric: "to_territory_hard_drops", value: v10.counts.territory_hard_drops },
    { metric: "from_validation_findings", value: v9.counts.validation_findings },
    { metric: "to_validation_findings", value: v10.counts.validation_findings },
    { metric: "unmatched_rows", value: unmatchedRows.length },
  ];
}

export async function buildVersionDiff(flags) {
  const versions = {
    v9: await readVersion("v9", flags.versions.v9),
    v10: await readVersion("v10", flags.versions.v10),
  };
  const diff = diffVersions(versions.v9, versions.v10);
  const summaryMetrics = buildSummaryMetrics(versions.v9, versions.v10, diff, diff.unmatchedRows);
  const companyPivot = buildCompanyPivot(diff.changedRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "career-ops shadow v9-v10 diff";
  wb.created = new Date("2026-05-07T00:00:00-04:00");
  wb.modified = wb.created;

  const manifestRows = Object.values(versions).map((v) => ({
    artifact: `${v.version}_workbook`,
    path: rel(v.filePath),
    sha256: v.sha256,
    rows: v.counts.shadow_rows,
    hard_drops: v.counts.hard_drops,
    sales_hard_drops: v.counts.sales_hard_drops,
    territory_hard_drops: v.counts.territory_hard_drops,
    workday_chrome_routes: v.counts.workday_chrome_routes,
    reviewer_queue: v.counts.reviewer_queue,
    source_repair_review: v.counts.source_repair_review_sheet_rows,
    source_repair_review_shadow_rows: v.counts.source_repair_review_shadow_rows,
    validation_findings: v.counts.validation_findings,
    warnings: v.warnings.join(" | "),
  }));

  const changedCols = [
    "comparison", "company", "title", "url", "old_hard_drop", "new_hard_drop",
    "old_hard_drop_reason", "new_hard_drop_reason", "hard_drop_reasons_added", "hard_drop_reasons_removed",
    "old_score", "new_score", "old_band", "new_band", "old_role_family", "new_role_family",
    "old_territory_region", "new_territory_region", "old_territory_dropped", "new_territory_dropped",
    "old_source_repair_reason", "new_source_repair_reason",
    "change_type", "v10_cause",
    "changed_fields", "changed_field_count", "changed_values", "old_evidence", "new_evidence",
  ];

  addSheet(wb, "Diff Manifest", manifestRows, ["artifact", "path", "sha256", "rows", "hard_drops", "sales_hard_drops", "territory_hard_drops", "workday_chrome_routes", "reviewer_queue", "source_repair_review", "source_repair_review_shadow_rows", "validation_findings", "warnings"]);
  addSheet(wb, "V9 to V10 Changed Rows", diff.changedRows, changedCols);
  addSheet(wb, "Hard Drop Added", diff.changedRows.filter((r) => /hard_drop_added/.test(r.change_type)), changedCols);
  addSheet(wb, "Hard Drop Removed", diff.changedRows.filter((r) => /hard_drop_removed/.test(r.change_type)), changedCols);
  addSheet(wb, "Hard Drop Reason Changed", diff.changedRows.filter((r) => /hard_drop_reason_changed/.test(r.change_type)), changedCols);
  addSheet(wb, "V10-A1 Symmetric Gate", diff.changedRows.filter((r) => /V10-A1/.test(r.v10_cause)), changedCols);
  addSheet(wb, "Score And Band Changes", diff.changedRows.filter((r) => /score_or_band_changed/.test(r.change_type)), changedCols);
  addSheet(wb, "Signal Changes", diff.changedRows.filter((r) => /signal_changed/.test(r.change_type)), changedCols);
  addSheet(wb, "Company Role Pivot", companyPivot, ["company", "changed_rows", "hard_drop_added", "hard_drop_removed", "hard_drop_reason_changed", "v10a1_count", "other_count", "titles"]);
  addSheet(wb, "Unmatched Rows", diff.unmatchedRows, ["comparison", "version_present", "company", "title", "url", "reason"]);
  addSheet(wb, "Summary Metrics", summaryMetrics, ["metric", "value"]);

  fs.mkdirSync(dirname(flags.outputXlsx), { recursive: true });
  if (fs.existsSync(flags.outputXlsx) && !flags.allowOverwrite) {
    throw new Error(`Output exists: ${flags.outputXlsx}. Pass --allow-overwrite to replace.`);
  }
  await wb.xlsx.writeFile(flags.outputXlsx);

  const summary = {
    run_date: flags.runDate,
    generated_at: new Date().toISOString(),
    outputs: { workbook: rel(flags.outputXlsx), summary_json: rel(flags.summaryJson) },
    inputs: Object.fromEntries(Object.values(versions).map((v) => [v.version, { path: rel(v.filePath), sha256: v.sha256, counts: v.counts }])),
    counts: Object.fromEntries(summaryMetrics.map((r) => [r.metric, r.value])),
    sheet_names: SHEET_NAMES,
    warnings: [
      ...Object.values(versions).flatMap((v) => v.warnings),
      ...diff.unmatchedRows.map((r) => `${r.comparison}: ${r.reason}: ${r.url}`),
    ],
  };
  fs.mkdirSync(dirname(flags.summaryJson), { recursive: true });
  fs.writeFileSync(flags.summaryJson, JSON.stringify(summary, null, 2) + "\n", "utf8");

  return { versions, diff, summary };
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
