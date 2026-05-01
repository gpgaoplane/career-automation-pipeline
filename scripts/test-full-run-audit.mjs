#!/usr/bin/env node
// scripts/test-full-run-audit.mjs
// Unit tests for full-run-audit.mjs — classification logic + AC-3 signal
// computation + cost log filtering. Pure-function tests; no live probes.

import {
  hasRoute,
  computeDescScore,
  computeAc3,
  canonicalProvider,
} from "./full-run-audit.mjs";

// We import classifyCompany via dynamic import because it's also exported.
const { classifyCompany } = await import("./full-run-audit.mjs");

let pass = 0;
let fail = 0;
function assert(label, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label} ${detail}`);
  }
}

console.log("\n=== full-run-audit unit tests ===\n");

// ── classifyCompany ──────────────────────────────────────────────────

console.log("classifyCompany:");

const exportedHealthy = classifyCompany({ hasExports: true, hasRoute: true, probeResult: null });
assert("exported company → no miss reason", exportedHealthy.miss_reason === null);
assert("exported company → source resolved", exportedHealthy.source_resolved === true);
assert("exported company → has raw jobs (implied)", exportedHealthy.has_raw_jobs === true);

const noRoute = classifyCompany({ hasExports: false, hasRoute: false, probeResult: null });
assert("no route + no exports → ROUTE_MISSING", noRoute.miss_reason === "ROUTE_MISSING");
assert("ROUTE_MISSING → not source resolved", noRoute.source_resolved === false);

const brokenSource = classifyCompany({
  hasExports: false,
  hasRoute: true,
  probeResult: { healthy: false, raw_jobs: 0, error: "HTTP 422" },
});
assert("route + probe error → SOURCE_BROKEN", brokenSource.miss_reason === "SOURCE_BROKEN");
assert("SOURCE_BROKEN → resolved but unhealthy", brokenSource.source_resolved === true && brokenSource.source_healthy === false);

const noOpenJobs = classifyCompany({
  hasExports: false,
  hasRoute: true,
  probeResult: { healthy: true, raw_jobs: 0, error: null },
});
assert("route + healthy + 0 raw → NO_OPEN_JOBS", noOpenJobs.miss_reason === "NO_OPEN_JOBS");
assert("NO_OPEN_JOBS → resolved + healthy", noOpenJobs.source_resolved === true && noOpenJobs.source_healthy === true);
assert("NO_OPEN_JOBS → no raw jobs", noOpenJobs.has_raw_jobs === false);

const noRelevantJobs = classifyCompany({
  hasExports: false,
  hasRoute: true,
  probeResult: { healthy: true, raw_jobs: 40, error: null },
});
assert("route + healthy + raw>0 + no exports → NO_RELEVANT_JOBS", noRelevantJobs.miss_reason === "NO_RELEVANT_JOBS");
assert("NO_RELEVANT_JOBS → has raw jobs", noRelevantJobs.has_raw_jobs === true);

// ── hasRoute ─────────────────────────────────────────────────────────

console.log("\nhasRoute:");
assert("null cache entry → no route", hasRoute(null) === false);
assert("undefined cache entry → no route", hasRoute(undefined) === false);
assert("status:no-ats-found → no route", hasRoute({ ats: "ashby", status: "no-ats-found" }) === false);
assert("status:ambiguous → no route", hasRoute({ ats: "workday", status: "ambiguous" }) === false);
assert("ats present + no status → has route", hasRoute({ ats: "ashby", slug: "foo" }) === true);
assert("legacy ats:workday → has route", hasRoute({ ats: "workday", tenant: "x", instance: "wd1" }) === true);
assert("ats:null → no route", hasRoute({ ats: null }) === false);

// ── canonicalProvider ────────────────────────────────────────────────

console.log("\ncanonicalProvider:");
assert("legacy 'workday' → 'workday-cxs'", canonicalProvider("workday") === "workday-cxs");
assert("'workday-cxs' passthrough", canonicalProvider("workday-cxs") === "workday-cxs");
assert("'ashby' passthrough", canonicalProvider("ashby") === "ashby");
assert("null → null", canonicalProvider(null) === null);

// ── computeDescScore — mirror export-jobs.mjs logic ──────────────────

console.log("\ncomputeDescScore (mirrors career-ops/export-jobs.mjs):");

assert("no signals → 0", computeDescScore(null) === 0);
assert("empty signals → 0", computeDescScore({}) === 0);

assert(
  "Toronto location → +2",
  computeDescScore({ location_match: ["Toronto, ON"] }) === 2
);

assert(
  "fully remote US → +4",
  computeDescScore({ location_match: ["fully remote US-based"] }) === 4
);

assert(
  "USD comp $130 (floor=120) → +1",
  computeDescScore({ comp_low_thousands: 130, comp_currency: "USD" }) === 1
);

assert(
  "USD comp $100 (floor=120) → -2",
  computeDescScore({ comp_low_thousands: 100, comp_currency: "USD" }) === -2
);

assert(
  "CAD comp $130 (floor=110) → +2",
  computeDescScore({ comp_low_thousands: 130, comp_currency: "CAD" }) === 2
);

assert(
  "comp_currency unknown → no comp contribution",
  computeDescScore({ comp_low_thousands: 200, comp_currency: "unknown" }) === 0
);

assert(
  "track keywords +3 cap",
  computeDescScore({ track_keywords_matched: ["RAG", "agentic", "LangChain", "fine-tuning"] }) === 3
);

assert(
  "tech stack +2 cap",
  computeDescScore({ tech_stack_matched: ["Python", "PyTorch", "LangChain", "OpenAI API"] }) === 2
);

assert(
  "yoe 3-5 → +1",
  computeDescScore({ yoe_signal: "3-5" }) === 1
);

assert(
  "yoe 6+ → -1",
  computeDescScore({ yoe_signal: "6+" }) === -1
);

assert(
  "deal breaker → -5",
  computeDescScore({ deal_breaker_signal: "in-office 5 days" }) === -5
);

const compoundSignals = {
  location_match: ["Toronto, ON"],
  comp_low_thousands: 140,
  comp_currency: "CAD",
  track_keywords_matched: ["RAG", "agentic"],
  tech_stack_matched: ["Python"],
  yoe_signal: "3-5",
};
assert(
  "compound: Toronto +2, CAD$140 +3, 2 kw +2, 1 tech +1, yoe +1 = 9",
  computeDescScore(compoundSignals) === 9
);

// ── computeAc3 ───────────────────────────────────────────────────────

console.log("\ncomputeAc3:");

const jobs = [
  { url: "https://job1", company: "A", title: "Eng" },
  { url: "https://job2", company: "B", title: "Eng" },
  { url: "https://job3", company: "C", title: "Eng" },
];
const jdCache = {
  "https://job1": {
    extracted_signals: {
      location_match: ["Toronto"],
      location_raw: ["Toronto, ON"],
      comp_low_thousands: 140,
      comp_currency: "CAD",
    },
  },
  "https://job2": {
    extracted_signals: {
      location_match: [],
      location_raw: ["Remote (US)"],
      comp_low_thousands: null,
    },
  },
  // job3 not in cache
};

const ac3 = computeAc3(jobs, jdCache);
assert("AC-3 cache hits = 2", ac3.cache_hits === 2);
assert("AC-3 will_fit_location_hits = 1 (job1 only)", ac3.will_fit_location_hits === 1);
assert("AC-3 raw_location_hits = 2 (job1 + job2)", ac3.raw_location_hits === 2);
assert("AC-3 compensation_hits = 1 (job1 only)", ac3.compensation_hits === 1);
assert("AC-3 raw_or_comp_hits = 2 (job1 + job2)", ac3.raw_or_comp_hits === 2);
assert("AC-3 will_fit_or_comp_hits = 1 (job1)", ac3.will_fit_or_comp_hits === 1);
assert("AC-3 raw_and_comp_hits = 1 (job1)", ac3.raw_and_comp_hits === 1);

console.log(`\n=== Summary: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
