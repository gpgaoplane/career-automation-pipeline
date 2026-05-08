#!/usr/bin/env node
// Unit and offline integration tests for scripts/fullrun-calibration-workbook.mjs.

import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SHEET_NAMES,
  SEED_JOBS,
  buildCalibration,
  canonicalizeJobUrl,
  classifyVisibleLocationRisk,
  makeEvidence,
  makeOutputDrops,
  makeSeedTraces,
  makeStageReconciliation,
  parseExcelPendingJobs,
  parsePipelineMd,
  safeTitleMatches,
  sha256,
  simulateDealbreaker,
} from "./fullrun-calibration-workbook.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
const careerOpsRequire = createRequire(resolve(CAREER_OPS, "package.json"));
const ExcelJS = careerOpsRequire("exceljs");

const BASELINE_XLSX = resolve(CAREER_OPS, "output", "jobs-2026-05-01.xlsx");
const TMP_DIR = resolve(CAREER_OPS, "output", ".calibration-test");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("Ashby URL canonicalization strips query params", () => {
  const id = canonicalizeJobUrl("https://jobs.ashbyhq.com/elevenlabs/a3097257-a07a-4a7e-b9fe-b8555c1a0fa7?locationId=x");
  assert.equal(id.canonical_job_id, "ashby:elevenlabs:a3097257-a07a-4a7e-b9fe-b8555c1a0fa7");
  assert.equal(id.normalized_url.includes("?"), false);
});

test("Greenhouse job ID canonicalization works", () => {
  const id = canonicalizeJobUrl("https://job-boards.greenhouse.io/xai/jobs/5047544007?gh_jid=5047544007");
  assert.equal(id.canonical_job_id, "greenhouse:xai:5047544007");
});

test("Lever and Workday fallbacks are stable", () => {
  const lever = canonicalizeJobUrl("https://jobs.lever.co/acme/12345678-1234-1234-1234-123456789abc");
  assert.equal(lever.canonical_job_id, "lever:12345678-1234-1234-1234-123456789abc");

  const workday = canonicalizeJobUrl("https://acme.wd5.myworkdayjobs.com/en-US/jobs/job/Toronto/JR-12345");
  assert.equal(workday.canonical_job_id, "workday:JR-12345");

  const fallbackA = canonicalizeJobUrl("https://jobs.lever.co/acme", { company: "Acme", title: "AI PM" });
  const fallbackB = canonicalizeJobUrl("https://jobs.lever.co/acme", { company: "Acme", title: "AI PM" });
  assert.equal(fallbackA.canonical_job_id, fallbackB.canonical_job_id);
});

test("Atlassian details and Surge slug canonicalization work", () => {
  assert.equal(canonicalizeJobUrl("https://www.atlassian.com/company/careers/details/24843").canonical_job_id, "atlassian:24843");
  assert.equal(canonicalizeJobUrl("https://surgehq.ai/careers/product-operations-manager").canonical_job_id, "surge:product-operations-manager");
});

test("Collision groups are reported for company/title fallback duplicates", () => {
  const evidence = makeEvidence({
    scanRows: [],
    pipelineRows: [
      { company: "Acme AI", title: "Program Manager", url: "https://acme.example/jobs/one" },
      { company: "Acme AI", title: "Program Manager", url: "https://acme.example/jobs/two" },
    ],
    excelRows: [],
    jdCache: {},
  });
  assert.equal(evidence.collisions.size, 2);
  assert.ok(evidence.pipeline.every((row) => row.collision_group_id.startsWith("collision:fallback:")));
});

test("JD cache-only rows are excluded from full-run evidence", () => {
  const evidence = makeEvidence({
    scanRows: [],
    pipelineRows: [],
    excelRows: [],
    jdCache: {
      "https://jobs.ashbyhq.com/example/11111111-1111-1111-1111-111111111111": {
        extracted_signals: { deal_breaker_signal: "hybrid_non_toronto" },
      },
    },
  });
  assert.equal(evidence.cacheOnlyExclusions, 1);
  assert.equal(evidence.jdByCanonical.size, 0);
});

test("JD cache normalized URL aliases attach to fallback rows", () => {
  const evidence = makeEvidence({
    scanRows: [],
    pipelineRows: [{ company: "Generic AI", title: "AI Program Manager", url: "https://generic.example/careers/job?source=fullrun" }],
    excelRows: [],
    jdCache: {
      "https://generic.example/careers/job": {
        extracted_signals: { deal_breaker_signal: "hybrid_non_toronto" },
      },
    },
  });
  const drops = makeOutputDrops(evidence);
  assert.equal(evidence.cacheOnlyExclusions, 0);
  assert.equal(drops[0]["Dealbreaker Signal"], "hybrid_non_toronto");
});


test("Excel parser reads only Pending Jobs", async () => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const file = resolve(TMP_DIR, "pending-only.xlsx");
  const workbook = new ExcelJS.Workbook();
  const pending = workbook.addWorksheet("Pending Jobs");
  pending.addRow(["Company", "Title", "URL", "Match Track", "Title Score", "Desc Score", "Pre-Score", "Band", "Score Notes"]);
  pending.addRow(["Acme", "AI PM", "https://acme.example/jobs/1", "PM", 3, 2, 8, "A", "ok"]);
  const ignored = workbook.addWorksheet("Ignored");
  ignored.addRow(["Company", "Title", "URL", "Match Track", "Title Score", "Desc Score", "Pre-Score", "Band", "Score Notes"]);
  ignored.addRow(["Wrong", "Wrong", "https://wrong.example/jobs/1", "PM", 3, 2, 8, "A", "wrong"]);
  await workbook.xlsx.writeFile(file);

  const rows = await parseExcelPendingJobs(file);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].company, "Acme");
});

test("Pipeline parser reads only ## Pendientes", () => {
  const rows = parsePipelineMd(`# Pipeline

## Done
- [ ] https://ignored.example | Ignored | Wrong

## Pendientes
- [ ] https://one.example | One | AI PM
- [ ] https://two.example | Two | SA

## Other
- [ ] https://ignored2.example | Ignored | Wrong
`);
  assert.deepEqual(rows.map((row) => row.company), ["One", "Two"]);
});

test("Count reconciliation detects expected counts", () => {
  const reconciliation = makeStageReconciliation({
    scanRows: [{ company: "A", url: "https://a.example/1" }],
    pipelineRows: [{ company: "A", title: "AI PM", url: "https://a.example/1" }],
    excelRows: [],
    outputDrops: [{ Company: "A", "Canonical Job ID": "fallback:a:ai pm:1" }],
  });
  assert.equal(reconciliation[0].Rows, 1);
  assert.equal(reconciliation[1].Rows, 1);
  assert.equal(reconciliation[2].Rows, 0);
  assert.equal(reconciliation[3].Rows, 1);
});

test("RAG does not match Storage in safe simulation", () => {
  assert.equal(safeTitleMatches("Principal Storage Architect", "RAG"), false);
  assert.equal(safeTitleMatches("RAG Engineer", "RAG"), true);
});

test("Technical Account does not match Technical Accounting in safe simulation", () => {
  assert.equal(safeTitleMatches("Technical Accounting Manager", "Technical Account"), false);
  assert.equal(safeTitleMatches("Technical Account Manager", "Technical Account"), true);
});

test("U.S. hybrid/on-site hard-drop detection works", () => {
  const hybrid = simulateDealbreaker("This role is hybrid in San Francisco, United States.");
  assert.equal(hybrid.decision, "hard_drop");
  assert.equal(hybrid.simulated_signal, "hybrid_non_toronto");

  const onsite = simulateDealbreaker("This position is on-site in New York.");
  assert.equal(onsite.decision, "hard_drop");
  assert.equal(onsite.simulated_signal, "onsite_non_toronto");
});

test("Ambiguous hybrid/on-site goes to review, not hard drop", () => {
  assert.equal(simulateDealbreaker("This role follows a hybrid work model.").decision, "review");
  assert.equal(simulateDealbreaker("This role is office based.").decision, "review");
});

test("Toronto hybrid is allowed", () => {
  const result = simulateDealbreaker("Work style: hybrid, based in Toronto.");
  assert.equal(result.decision, "allow");
});

test("Fully remote U.S. is allowed", () => {
  const result = simulateDealbreaker("This role is fully remote in the United States.");
  assert.equal(result.decision, "allow");
});

test("Hybrid cloud/mesh/fabric are not work-mode signals", () => {
  assert.equal(simulateDealbreaker("Build hybrid cloud systems in San Francisco.").decision, "review");
  assert.equal(simulateDealbreaker("Develop hybrid mesh networking software.").decision, "allow");
  assert.equal(simulateDealbreaker("Design hybrid fabric architecture.").decision, "allow");
});

test("Missing JD does not silently pass as safe", () => {
  const risk = classifyVisibleLocationRisk(
    { title: "Solutions Architect", url: "https://example.com/job" },
    null,
  );
  assert.equal(risk.classification, "no_description_or_no_location_signal");
  assert.equal(risk.highRisk, true);
});

test("Full generator produces deterministic workbook and preserves baseline", async () => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const outputXlsx = resolve(TMP_DIR, "fullrun-calibration-test.xlsx");
  const summaryJson = resolve(TMP_DIR, "fullrun-calibration-test-summary.json");
  const before = sha256(BASELINE_XLSX);
  const result = await buildCalibration({ runDate: "2026-05-01", outputXlsx, summaryJson });
  const after = sha256(BASELINE_XLSX);
  assert.equal(before, after);

  assert.equal(result.summary.counts.scan_history_rows, 1671);
  assert.equal(result.summary.counts.pipeline_rows, 956);
  assert.equal(result.summary.counts.excel_rows, 613);
  assert.equal(result.summary.counts.pipeline_to_excel_drops, 343);
  assert.equal(result.summary.counts.unique_excel_urls, 581);
  assert.ok(result.summary.warnings.some((warning) => warning.type === "count_mismatch" && warning.artifact === "baseline_excel_unique_urls"));
  await assert.rejects(
    () => buildCalibration({ runDate: "2026-05-01", outputXlsx: resolve(TMP_DIR, "strict-fail.xlsx"), summaryJson: resolve(TMP_DIR, "strict-fail-summary.json"), strict: true }),
    /Strict manifest validation failed/,
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputXlsx);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), SHEET_NAMES);

  const seedRows = result.sheetRows.get("Seed Traces");
  assert.equal(seedRows.length, SEED_JOBS.length);
  assert.ok(seedRows.every((row) => row["Seed URL"] || row["Collision Group ID"]));

  const outputDrops = result.sheetRows.get("Output Drops Review");
  assert.equal(outputDrops.length, makeOutputDrops({
    pipeline: result.sheetRows.get("Output Drops Review").map((row) => ({ canonical_job_id: row["Canonical Job ID"] })),
    idSets: { excelIds: new Set() },
    jdByCanonical: new Map(),
  }).length);
  assert.equal(outputDrops.length, 343);

  assert.ok(result.sheetRows.get("Current Board Non-Baseline").every((row) => row["Evidence Label"] === "seed_current_board_non_baseline"));
  assert.equal(result.sheetRows.get("Visible Location Risk").length, 613);
  assert.ok(result.sheetRows.get("Visible Location Risk").every((row) => row["Risk Classification"]));
  assert.ok(result.sheetRows.get("Missing Job Root Cause").every((row) => row["Root Cause Layer"] && row["Evidence Label"] === "seed_current_board_non_baseline"));
  assert.ok(result.sheetRows.get("Filter Robustness Metrics").some((row) => row.Metric === "missing_seed_explainability_rate" && row.Status === "pass"));

  const titleFilter = { positive: [{ match: "AI" }], negative: [] };
  const traces = makeSeedTraces(SEED_JOBS.slice(0, 1), {
    indexes: {
      scan: { byCanonical: new Map(), byFallback: new Map() },
      pipeline: { byCanonical: new Map(), byFallback: new Map() },
      excel: { byCanonical: new Map(), byFallback: new Map() },
    },
    collisions: new Map(),
  }, titleFilter);
  assert.equal(traces.length, 1);
  assert.equal(traces[0]["Full Run Status"], "seed_current_board_non_baseline");
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed++;
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message || error);
  }
}

if (failed) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}

console.log(`${tests.length} test(s) passed`);
