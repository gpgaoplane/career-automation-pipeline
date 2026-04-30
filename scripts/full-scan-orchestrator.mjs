#!/usr/bin/env node
// scripts/full-scan-orchestrator.mjs
// Phase 2.8 Step 8 — full-scan orchestrator (replaces plain npm chain).
//
// Per implementation plan v2 §6.8 (addresses Codex Issue 3 + Issue 4).
//
// Invokes the 6 pipeline steps in order from career-ops/ cwd. Supports:
//   --dry-run / --list : print plan; do NOT execute
//   (default)          : execute steps sequentially
//   Post-run Layer 3 fallback fan-out: reads
//     career-ops/data/firecrawl-fallback-queue.tsv and invokes
//     custom-scraper if non-empty (per AC-11a wiring)
//
// Run from repo root:
//   node scripts/full-scan-orchestrator.mjs [--dry-run|--list]

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CAREER_OPS = resolve(REPO_ROOT, "career-ops");
const FALLBACK_QUEUE = resolve(CAREER_OPS, "data", "firecrawl-fallback-queue.tsv");

// 6-step pipeline. Each step: { name, command, args, cwd }.
const STEPS = [
  {
    name: "scan (existing GH/Ashby/Lever direct from portals.yml)",
    command: "node",
    args: ["scan.mjs"],
    cwd: CAREER_OPS,
  },
  {
    name: "firecrawl-discover (Layer 1 ATS discovery)",
    command: "node",
    args: ["firecrawl-discover.mjs"],
    cwd: CAREER_OPS,
  },
  {
    name: "ats-adapters (8 sibling adapters: 5 D-15 + 3 cached-discovery)",
    command: "node",
    args: ["../scripts/ats-adapters/run-all.mjs"],
    cwd: CAREER_OPS,
  },
  {
    name: "firecrawl-extract (Layer 2 structured extraction for no-ats-found)",
    command: "node",
    args: ["firecrawl-extract.mjs"],
    cwd: CAREER_OPS,
  },
  {
    name: "enrich (per-JD Firecrawl-first markdown enrichment)",
    command: "node",
    args: ["enrich-jobs.mjs"],
    cwd: CAREER_OPS,
  },
  {
    name: "export (Excel output)",
    command: "node",
    args: ["export-jobs.mjs"],
    cwd: CAREER_OPS,
  },
];

// Layer 3 fallback step (post-run, conditional)
const FALLBACK_STEP = {
  name: "custom-scraper Layer 3 fallback (only if fallback queue non-empty)",
  command: "node",
  args: ["custom-scraper.mjs"],
  cwd: CAREER_OPS,
};

function fallbackQueueSize() {
  if (!existsSync(FALLBACK_QUEUE)) return 0;
  try {
    const text = readFileSync(FALLBACK_QUEUE, "utf-8");
    return text.split("\n").filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

function runStep(step) {
  return new Promise((res, rej) => {
    console.error(`\n=== ${step.name} ===`);
    console.error(`  cmd: ${step.command} ${step.args.join(" ")}  (cwd: ${step.cwd})`);
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", rej);
    child.on("close", (code) => {
      if (code === 0) res({ name: step.name, code: 0 });
      else res({ name: step.name, code }); // resolve even on non-zero — orchestrator decides whether to continue
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("--list");

  console.error(`\n[full-scan-orchestrator] ${dryRun ? "DRY RUN — listing 6 pipeline steps:" : "executing 6 pipeline steps sequentially:"}\n`);

  if (dryRun) {
    STEPS.forEach((s, i) => {
      console.error(`  ${i + 1}. ${s.name}`);
      console.error(`       ${s.command} ${s.args.join(" ")} (cwd: ${s.cwd})`);
    });
    const qsize = fallbackQueueSize();
    console.error(`\n  Layer 3 fallback step (post-run, conditional):`);
    console.error(`       ${FALLBACK_STEP.command} ${FALLBACK_STEP.args.join(" ")}`);
    console.error(`       (current fallback queue size: ${qsize} ${qsize > 0 ? "rows — would invoke" : "rows — no-op"})`);
    console.error();
    return;
  }

  const queueSizeBefore = fallbackQueueSize();
  const results = [];
  for (const step of STEPS) {
    const r = await runStep(step);
    results.push(r);
    if (r.code !== 0) {
      console.error(`  WARNING: step exited with code ${r.code}; continuing chain (each step is independently safe to retry)`);
    }
  }

  // Post-run fallback fan-out (AC-11a wiring)
  const queueSizeAfter = fallbackQueueSize();
  const newRows = queueSizeAfter - queueSizeBefore;
  if (newRows > 0) {
    console.error(`\n[full-scan-orchestrator] fallback queue grew by ${newRows} rows during run`);
    console.error(`  → invoking Layer 3 ${FALLBACK_STEP.name}`);
    const fr = await runStep(FALLBACK_STEP);
    results.push(fr);
  } else {
    console.error(`\n[full-scan-orchestrator] fallback queue unchanged (${queueSizeBefore} rows) — Layer 3 skipped`);
  }

  console.error(`\n=== full-scan summary ===`);
  for (const r of results) {
    console.error(`  ${r.code === 0 ? "✓" : "⚠"} ${r.name} (exit ${r.code})`);
  }
  const failed = results.filter((r) => r.code !== 0).length;
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
