// scripts/ats-adapters/direct-core-v1.mjs
// Gated direct Greenhouse/Ashby/Lever wrapper for future scans.
// This intentionally does not write pipeline/history unless callers pass
// explicit allow-write flags. It also does not edit vendored scan.mjs.

import fs from "node:fs";
import { dirname, resolve } from "node:path";

import { fetchAshby, fetchGreenhouse, fetchLever } from "../../career-ops/lib/ats-clients.mjs";
import { detectProvider, loadPortals, REPO_ROOT } from "./_lib.mjs";
import { classifyLevel, classifyRoleFamily, classifySalesRole } from "../lib/job-fit-rules.mjs";

const FETCHERS = {
  greenhouse: fetchGreenhouse,
  ashby: fetchAshby,
  lever: fetchLever,
};

export function directAtsTargets({ company = null } = {}) {
  const portals = loadPortals();
  const wanted = company ? company.toLowerCase() : null;
  const targets = [];
  for (const entry of portals.tracked_companies || []) {
    if (!entry?.enabled || !entry.careers_url) continue;
    if (wanted && entry.name.toLowerCase() !== wanted) continue;
    const detected = detectProvider(entry.careers_url);
    if (!detected || !FETCHERS[detected.provider]) continue;
    targets.push({
      company: entry.name,
      category: entry.category || "",
      rank: entry.rank ?? 9999,
      provider: detected.provider,
      fetchArgs: detected.slug,
      careers_url: entry.careers_url,
    });
  }
  return targets;
}

export function titleDecision(job, companyMeta) {
  const title = job.title || "";
  const sales = classifySalesRole({ title });
  const level = classifyLevel({ title });
  const family = classifyRoleFamily({ title, companyMeta });
  if (sales.hard_drop) return { decision: "drop", reason: sales.reason, family: "SALES" };
  if (level.hard_drop) return { decision: "drop", reason: level.reason, family: family.primary_family };
  if (family.primary_family === "UNKNOWN") return { decision: "reject_title", reason: family.reason, family: family.primary_family };
  if (family.primary_family === "GENERIC_ENGINEERING_REVIEW" || family.confidence === "weak") {
    return { decision: "pre_pipeline_candidate", reason: family.reason, family: family.primary_family };
  }
  return { decision: "pass_title", reason: family.reason, family: family.primary_family };
}

function writeTsv(filePath, rows) {
  fs.mkdirSync(dirname(filePath), { recursive: true });
  const columns = ["company", "provider", "title", "url", "location", "decision", "reason", "family"];
  const body = [
    columns.join("\t"),
    ...rows.map((row) => columns.map((c) => String(row[c] ?? "").replace(/\r?\n/g, " ").replace(/\t/g, " ")).join("\t")),
  ].join("\n") + "\n";
  fs.writeFileSync(filePath, body, "utf8");
}

export async function runDirectCoreV1({
  runDate = new Date().toISOString().slice(0, 10),
  company = null,
  dryRun = true,
  allowNetwork = false,
  outputDir = resolve(REPO_ROOT, "career-ops", "output", "checkpoints", runDate),
} = {}) {
  const targets = directAtsTargets({ company });
  const rows = [];
  const errors = [];

  if (!allowNetwork) {
    for (const target of targets) {
      rows.push({
        company: target.company,
        provider: target.provider,
        title: "",
        url: target.careers_url,
        location: "",
        decision: "target_only_no_network",
        reason: dryRun ? "dry_run_default" : "allow_network_required",
        family: "",
      });
    }
    const ledger = resolve(outputDir, "direct-ats-v1-title-ledger.tsv");
    writeTsv(ledger, rows);
    return { attempted: targets.length, fetched: 0, rows, errors, ledger };
  }

  for (const target of targets) {
    try {
      const fetcher = FETCHERS[target.provider];
      const result = await fetcher(target.fetchArgs);
      for (const job of result.jobs || []) {
        const decision = titleDecision(job, target);
        rows.push({
          company: target.company,
          provider: target.provider,
          title: job.title || "",
          url: job.url || "",
          location: job.location || "",
          decision: decision.decision,
          reason: decision.reason,
          family: decision.family,
        });
      }
    } catch (e) {
      errors.push({ company: target.company, provider: target.provider, error: e.message });
    }
  }

  const ledger = resolve(outputDir, "direct-ats-v1-title-ledger.tsv");
  writeTsv(ledger, rows);
  return { attempted: targets.length, fetched: targets.length - errors.length, rows, errors, ledger };
}
