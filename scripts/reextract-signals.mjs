#!/usr/bin/env node
// scripts/reextract-signals.mjs
// One-shot post-processor: re-runs extractSignals() on every cached JD's
// stored content_text, writes the updated signals back to
// career-ops/data/job-descriptions-cache.json. No Firecrawl calls, no JD
// re-fetches — pure regex pass on already-cached text.
//
// Use whenever signal-extraction logic in enrich-jobs.mjs changes (new
// regex patterns, new dealbreakers, etc.) and you want existing cache
// entries to reflect the updated logic without spending credits on a
// full re-enrichment.
//
// Run from repo root:
//   node scripts/reextract-signals.mjs                   # dry-run, prints diff summary
//   node scripts/reextract-signals.mjs --apply           # writes updated cache
//   node scripts/reextract-signals.mjs --apply --report  # writes + prints per-field changes

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CACHE_PATH = resolve(REPO_ROOT, "career-ops", "data", "job-descriptions-cache.json");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const report = args.includes("--report");

if (!existsSync(CACHE_PATH)) {
  console.error(`cache not found at ${CACHE_PATH}`);
  process.exit(1);
}

const enrichUrl = pathToFileURL(resolve(REPO_ROOT, "career-ops", "enrich-jobs.mjs")).href;
const { extractSignals } = await import(enrichUrl);

const cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
let updated = 0;
let unchanged = 0;
let noText = 0;
const fieldDiffs = {};

function bumpFieldDiff(field, oldVal, newVal) {
  if (!fieldDiffs[field]) fieldDiffs[field] = { gained: 0, lost: 0, changed: 0 };
  const oldEmpty = oldVal === null || oldVal === undefined || (Array.isArray(oldVal) && oldVal.length === 0);
  const newEmpty = newVal === null || newVal === undefined || (Array.isArray(newVal) && newVal.length === 0);
  if (oldEmpty && !newEmpty) fieldDiffs[field].gained++;
  else if (!oldEmpty && newEmpty) fieldDiffs[field].lost++;
  else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) fieldDiffs[field].changed++;
}

for (const [url, entry] of Object.entries(cache)) {
  if (!entry || !entry.content_text) {
    noText++;
    continue;
  }
  const newSignals = extractSignals(entry.content_text);
  const oldSignals = entry.extracted_signals || {};
  if (JSON.stringify(newSignals) !== JSON.stringify(oldSignals)) {
    for (const k of new Set([...Object.keys(oldSignals), ...Object.keys(newSignals)])) {
      bumpFieldDiff(k, oldSignals[k], newSignals[k]);
    }
    if (apply) entry.extracted_signals = newSignals;
    updated++;
  } else {
    unchanged++;
  }
}

console.log(`re-extract pass — ${apply ? "APPLY" : "DRY RUN"}:`);
console.log(`  total entries:        ${Object.keys(cache).length}`);
console.log(`  signals would update: ${updated}`);
console.log(`  signals unchanged:    ${unchanged}`);
console.log(`  no content_text:      ${noText}`);
console.log();
console.log("per-field changes (gained = was empty, now has value; lost = vice versa; changed = both populated, different):");
for (const [field, diff] of Object.entries(fieldDiffs).sort()) {
  const total = diff.gained + diff.lost + diff.changed;
  if (total === 0) continue;
  console.log(`  ${field.padEnd(28)}: gained=${diff.gained.toString().padStart(4)}  lost=${diff.lost.toString().padStart(4)}  changed=${diff.changed.toString().padStart(4)}`);
}

if (apply) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`\ncache rewritten → ${CACHE_PATH}`);
} else {
  console.log(`\nDRY RUN — pass --apply to write changes.`);
}
