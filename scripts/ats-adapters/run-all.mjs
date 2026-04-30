#!/usr/bin/env node
// run-all.mjs — orchestrator that fans out to all 5 sibling adapters
// sequentially (per design v2 §5.4 — sequential default until Step 9 manual
// rate-cap verification).
//
// Run from repo root:
//   node scripts/ats-adapters/run-all.mjs [--dry-run]

import { run as runWorkday } from "./workday-cxs.mjs";
import { run as runSmartrecruiters } from "./smartrecruiters.mjs";
import { run as runPersonio } from "./personio.mjs";
import { run as runRecruitee } from "./recruitee.mjs";
import { run as runWorkable } from "./workable.mjs";
import { run as runGreenhouseCached } from "./greenhouse-cached.mjs";
import { run as runAshbyCached } from "./ashby-cached.mjs";
import { run as runLeverCached } from "./lever-cached.mjs";

const ADAPTERS = [
  // 5 NEW providers per D-15: handle BOTH portals.yml direct-ATS + cache discoveries
  { name: "workday-cxs", run: runWorkday },
  { name: "smartrecruiters", run: runSmartrecruiters },
  { name: "personio", run: runPersonio },
  { name: "recruitee", run: runRecruitee },
  { name: "workable", run: runWorkable },
  // 3 EXISTING providers (scan.mjs handles portals.yml; these handle cache discoveries only)
  { name: "greenhouse-cached", run: runGreenhouseCached },
  { name: "ashby-cached", run: runAshbyCached },
  { name: "lever-cached", run: runLeverCached },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.error(`\n[ats-adapters] running 5 sibling adapters sequentially${dryRun ? " (DRY RUN)" : ""}\n`);

  const results = [];
  for (const a of ADAPTERS) {
    try {
      const r = await a.run({ dryRun });
      results.push(r);
    } catch (e) {
      console.error(`[${a.name}] FATAL: ${e.message}`);
      results.push({ provider: a.name, attempted: 0, added: 0, errors: [{ fatal: e.message }] });
    }
  }

  // Summary
  console.error("\n=== ats-adapters summary ===");
  let totalAdded = 0;
  let totalErrors = 0;
  for (const r of results) {
    console.error(
      `  ${r.provider.padEnd(18)} attempted=${String(r.attempted).padStart(3)}  ` +
      `added=${String(r.added).padStart(4)}  errors=${r.errors.length}`
    );
    totalAdded += r.added;
    totalErrors += r.errors.length;
  }
  console.error(`  ${"TOTAL".padEnd(18)} ${"".padStart(13)}  added=${String(totalAdded).padStart(4)}  errors=${totalErrors}`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
