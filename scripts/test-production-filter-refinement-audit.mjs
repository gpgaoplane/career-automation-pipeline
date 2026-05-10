#!/usr/bin/env node

import fs from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

import { buildAudit, REVIEW_SHEETS, sha256, detectSourceHygiene } from "./production-filter-refinement-audit.mjs";

const careerOpsRequire = createRequire(resolve("career-ops", "package.json"));
const ExcelJS = careerOpsRequire("exceljs");

let passed = 0;
let failed = 0;

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  OK: ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL: ${msg}\n    expected: ${e}\n    got:      ${a}`);
  }
}

const baseline = resolve("career-ops", "output", "workbooks", "jobs-2026-05-01.xlsx");
const before = sha256(baseline);
const outputXlsx = resolve("career-ops", "output", "tests", "production-filter-refinement-review-test.xlsx");
const summaryJson = resolve("docs", "audits", "production-filter-refinement-summary-test.json");

const result = await buildAudit({
  runDate: "2026-05-01",
  outputXlsx,
  summaryJson,
  allowOverwrite: true,
});

const after = sha256(baseline);
assertEq(before, after, "baseline jobs-2026-05-01.xlsx SHA unchanged");
assertEq(fs.existsSync(outputXlsx), true, "review workbook written");
assertEq(fs.existsSync(summaryJson), true, "summary JSON written");

for (const p of Object.values(result.summary.outputs.ledgers)) {
  assertEq(fs.existsSync(resolve(p)), true, `ledger exists: ${p}`);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(outputXlsx);
assertEq(wb.worksheets.map((s) => s.name), REVIEW_SHEETS, "workbook sheet names deterministic");
const reviewer = wb.getWorksheet("Reviewer Queue");
const reviewerHeaders = {};
reviewer.getRow(1).eachCell((cell, col) => { reviewerHeaders[String(cell.value).toLowerCase().replace(/ /g, "_")] = col; });
let reviewerHardDrops = 0;
reviewer.eachRow((row, rowNumber) => {
  if (rowNumber === 1) return;
  if (String(row.getCell(reviewerHeaders.hard_drop).value || "") === "yes") reviewerHardDrops++;
});
assertEq(reviewerHardDrops, 0, "reviewer queue excludes already hard-dropped rows");

// V6 (F-002): pipeline rows are deduped by (normalized_company, gh_jid).
// V5 had 956 rows; the listing-page mirror cohort (Scale AI, ElevenLabs,
// Thinking Machines, Accel-portfolio mirrors) collapses to 1 row per gh_jid.
assertEq(result.decisions.length, 933, "all pipeline rows scored after V6 row-identity dedup");
// Confirm Scale AI, ElevenLabs, Thinking Machines no longer have dup rows for the named jobs.
const scaleFdpm = result.decisions.filter((d) => d.company === "Scale AI" && /Forward Deployed Product Manager,\s*Enterprise/i.test(d.title));
assertEq(scaleFdpm.length <= 1, true, "Scale AI Forward Deployed Product Manager Enterprise has at most one row after dedup");
const elevenFde = result.decisions.filter((d) => d.company === "ElevenLabs" && /Forward Deployed Engineer/i.test(d.title));
assertEq(elevenFde.length <= 1, true, "ElevenLabs Forward Deployed Engineer has at most one row after dedup");
const tmlTinker = result.decisions.filter((d) => d.company === "Thinking Machines Lab" && /Forward Deployed Engineer.*Tinker/i.test(d.title));
assertEq(tmlTinker.length <= 1, true, "Thinking Machines Lab Forward Deployed Engineer Tinker has at most one row after dedup");
// V6 (F-003): Atlassian /all-jobs?team= URLs route to Source Repair as generic_careers_index.
const atlAllJobs = result.decisions.find((d) => d.url.includes("atlassian.com/company/careers/all-jobs"));
if (atlAllJobs) {
  assertEq(atlAllJobs.source_repair_reason, "generic_careers_index", "Atlassian /all-jobs?team= routes to generic_careers_index");
}
// V6 (F-004): example.com placeholder routes to placeholder_or_invalid_url.
const exampleCom = result.decisions.find((d) => /^https?:\/\/(?:[\w.-]+\.)?example\.com/i.test(d.url));
if (exampleCom) {
  assertEq(exampleCom.source_repair_reason, "placeholder_or_invalid_url", "example.com URL routes to placeholder_or_invalid_url");
}
assertEq(result.decisions.some((d) => /sales_role/.test(d.hard_drop_reason) && d.hard_drop_evidence), true, "sales hard-drop rows include evidence");
assertEq(result.decisions.some((d) => /comp_upper/.test(d.hard_drop_reason)), true, "comp hard-drop rows use upper-bound rule when present");
assertEq(result.decisions.some((d) => /yoe_required_gt_5/.test(d.hard_drop_reason)), true, "YoE >5 hard-drops when present");
assertEq(result.decisions.some((d) => d.annotations.includes("yoe_0_2") || d.score_reasons.includes("yoe=4")), true, "0-2 YoE scoring path is represented or available");
const glean = result.decisions.find((d) => d.url.includes("gleanwork/jobs/4659409005"));
assertEq(/comp_upper_below_120/.test(glean?.hard_drop_reason || ""), false, "Glean high salary range is not comp hard-dropped");
const spacex = result.decisions.find((d) => d.url.includes("spacex/jobs/8419314002"));
assertEq(/comp_upper_below_120/.test(spacex?.hard_drop_reason || ""), false, "SpaceX multi-level pay range is not comp hard-dropped");
const dbtAustin = result.decisions.find((d) => d.url.includes("dbtlabsinc/jobs/4664399005"));
assertEq(/non_toronto_no_remote/.test(dbtAustin?.hard_drop_reason || ""), true, "dbt Austin hybrid includes location hard-drop reason");
const opaque = result.decisions.find((d) => d.url.includes("opaquesystems/jobs/4093835009"));
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(opaque?.hard_drop_reason || ""), false, "Opaque remote role is not location hard-dropped");
const cresta = result.decisions.find((d) => d.url.includes("cresta/jobs/4093613008"));
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(cresta?.hard_drop_reason || ""), false, "Cresta Canada Remote is not location hard-dropped from benefit text");
const ramp = result.decisions.find((d) => d.url.includes("ramp/51acae48"));
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(ramp?.hard_drop_reason || ""), false, "Ramp Remote US option is not no-remote hard-dropped");
const decagonEast = result.decisions.find((d) => d.url.includes("decagon/6431a6f9"));
assertEq(/sales_role/.test(decagonEast?.hard_drop_reason || ""), true, "Decagon Strategic Solutions Engineer East sales context hard-drops");
const omnea = result.decisions.find((d) => d.url.includes("omnea/84aeafa8"));
assertEq(/sales_role/.test(omnea?.hard_drop_reason || ""), true, "Omnea Sales Engineering context hard-drops");
const character = result.decisions.find((d) => d.url.includes("character/fd023b84"));
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(character?.hard_drop_reason || ""), true, "Character Redwood City hybrid hard-drops");
const expedia = result.decisions.find((d) => d.url.includes("Machine-Learning-Scientist-II---Agentic-Experience"));
assertEq(expedia?.primary_family === "UNKNOWN" && expedia?.shadow_band === "C", false, "Expedia Agentic ML title is not silently UNKNOWN/C");
assertEq(expedia?.source_repair, "yes", "Expedia page-not-found cache routes to Source Repair");
const tempus = result.decisions.find((d) => d.url.includes("GenAI-Product-Builder"));
assertEq(tempus?.primary_family === "UNKNOWN" && tempus?.shadow_band === "C", false, "Tempus GenAI Product Builder is not silently UNKNOWN/C");
assertEq(tempus?.source_repair, "yes", "Tempus page-not-found cache routes to Source Repair");
const snorkelDas = result.decisions.find((d) => d.url.includes("snorkelai/jobs/5811245004"));
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(snorkelDas?.hard_drop_reason || ""), false, "Snorkel United States Remote option is not location hard-dropped");
const snorkelFederal = result.decisions.find((d) => d.url.includes("snorkelai/jobs/5721276004"));
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(snorkelFederal?.hard_drop_reason || ""), false, "Snorkel Federal D.C. Remote option is not location hard-dropped");
const wizRemote = result.decisions.find((d) => d.url.includes("4666764006"));
assertEq(wizRemote?.source_repair, "yes", "Wiz cache-missing remote row routes to Source Repair");
assertEq(/non_toronto_no_remote|specific_non_toronto_location/.test(wizRemote?.hard_drop_reason || ""), false, "Wiz Remote - USA title is not location hard-dropped");
const soundhound = result.decisions.find((d) => d.url.includes("soundhound.com/careers/#open-positions"));
assertEq(soundhound?.source_repair, "yes", "SoundHound generic careers page routes to Source Repair");
assertEq(soundhound?.hard_drop, "no", "SoundHound generic careers page does not hard-drop from generic text");
const samsara = result.decisions.find((d) => d.url.includes("samsara.com/company/careers/roles/product-manager-fleet"));
assertEq(samsara?.source_repair, "yes", "Samsara open-positions index routes to Source Repair");
assertEq(/sales_role/.test(samsara?.hard_drop_reason || ""), false, "Samsara Product Manager is not sales-dropped from neighboring listings");
const salesforceArticle = result.decisions.find((d) => d.url.includes("salesforce.com/blog/salesforce-careers-sales-productivity-agentforce"));
assertEq(salesforceArticle?.source_repair, "yes", "Salesforce article URL routes to Source Repair");
assertEq(salesforceArticle?.hard_drop, "no", "Salesforce article URL is not hard-dropped as a job");
assertEq(
  result.decisions.filter((d) => /comp_upper_below_120/.test(d.hard_drop_reason) && d.high_salary_evidence).length,
  0,
  "no comp hard-drop coexists with high salary evidence",
);
assertEq(result.summary.validation.blocking_findings, 0, "validation gate has zero blocking findings");
assertEq(result.seedRows.length, 14, "known seed rows emitted");
assertEq(result.seedRows.every((r) => r.root_cause_label), true, "every seed has exactly one root-cause label");
assertEq(Number(result.summary.counts.source_repair_review_rows) >= 14, true, "source repair review includes known missing seeds and bad source rows");
assertEq(result.summary.baseline_unchanged, true, "summary records unchanged baseline");
assertEq(
  fs.readFileSync(resolve(result.summary.outputs.ledgers.retainedTitle), "utf8").includes("baseline_retained_only_not_historical_raw_rejects"),
  true,
  "title ledger is explicitly baseline-retained only",
);

// V8-A4: Workday language-switcher chrome routes to source repair.
// Positive case — a Workday URL with a body that's only the localized language list.
const workdayChromeBody = "English - English - العربية - 简体中文 - 繁體中文 - Čeština - Nederlands - Suomi - Français du Canada - French - Español - German - Italian - Japanese - 한국어 - Norsk - Polski - Português - Română - Русский - Slovenčina - Svenska - ภาษาไทย - Türkçe - Tiếng Việt";
const workdayChromeResult = detectSourceHygiene({
  job: { url: "https://expedia.wd108.myworkdayjobs.com/job/Some-Job_R-12345" },
  cacheEntry: { content_text: workdayChromeBody },
  text: workdayChromeBody,
});
assertEq(workdayChromeResult.invalid, true, "V8-A4: Workday language-switcher chrome routes invalid");
assertEq(workdayChromeResult.reason, "workday_language_switcher_chrome",
  "V8-A4: reason is workday_language_switcher_chrome");

// Negative case — Workday URL with a real JD body must NOT trigger this rule.
const workdayRealJd = "About the role\n\nWe're looking for an AI Engineer to join our team. " +
  "You'll build production agentic AI systems with Python, PyTorch, and modern transformer architectures. " +
  "Responsibilities include designing RAG pipelines, deploying inference workloads, and partnering with " +
  "platform engineering on infrastructure. " + "X".repeat(1500);
const workdayRealResult = detectSourceHygiene({
  job: { url: "https://expedia.wd108.myworkdayjobs.com/job/Real-Job_R-99999" },
  cacheEntry: { content_text: workdayRealJd },
  text: workdayRealJd,
});
assertEq(workdayRealResult.reason !== "workday_language_switcher_chrome", true,
  "V8-A4 negative: Workday URL with real JD body does NOT route to workday_language_switcher_chrome");

// Negative — non-Workday URL with similar short body must NOT trigger.
const nonWorkdayChrome = detectSourceHygiene({
  job: { url: "https://greenhouse.io/some-org/jobs/12345" },
  cacheEntry: { content_text: workdayChromeBody },
  text: workdayChromeBody,
});
assertEq(nonWorkdayChrome.reason !== "workday_language_switcher_chrome", true,
  "V8-A4 negative: non-Workday URL with same short body does NOT route to workday_language_switcher_chrome");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
