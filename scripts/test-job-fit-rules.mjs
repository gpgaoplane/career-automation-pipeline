#!/usr/bin/env node

import { parseJdSections } from "./lib/jd-sections.mjs";
import {
  matchSafePhrase,
  classifySalesRole,
  classifyLevel,
  classifyRoleFamily,
  decideCompensation,
  decideYoe,
  decideLocation,
  scoreJob,
  detectHighSalaryRanges,
  detectTerritory,
} from "./lib/job-fit-rules.mjs";

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

const aiMeta = { rank: 12, category: "AI Agents" };

assertEq(matchSafePhrase("Storage Engineer", "RAG"), false, "RAG does not match Storage");
assertEq(matchSafePhrase("Technical Accounting Manager", "Technical Account"), false, "Technical Account does not match Technical Accounting");

assertEq(classifySalesRole({ title: "Enterprise Account Executive" }).hard_drop, true, "Account Executive hard-drops");
assertEq(classifySalesRole({ title: "AE, Strategic Accounts" }).hard_drop, true, "AE variant hard-drops");
assertEq(
  classifySalesRole({
    title: "Solutions Engineer",
    textSections: parseJdSections("Responsibilities\nCarry quota, build pipeline generation, and close deals."),
  }).hard_drop,
  true,
  "Sales Engineer / sales evidence hard-drops",
);
assertEq(classifySalesRole({ title: "Technical Account Manager" }).hard_drop, false, "Technical Account Manager not dropped from Account alone");
assertEq(
  classifySalesRole({
    title: "Product Manager",
    textSections: parseJdSections("Responsibilities\nCollaborate with sales and customer success on launch feedback."),
  }).hard_drop,
  false,
  "isolated collaborate-with-sales wording does not hard-drop",
);
assertEq(
  classifySalesRole({
    title: "Strategic Solutions Engineer",
    textSections: parseJdSections("Department\nSales Engineering\nCompensation\nOTE and commission eligible.\nResponsibilities\nRun pre-sales discovery with Account Executives and support the sales process."),
  }).hard_drop,
  true,
  "sales engineering department plus OTE/pre-sales evidence hard-drops",
);

// V6 policy 2 (F-001): SA/FDE family with single OTE-disclosure boilerplate
// should NOT hard-drop. Anthropic Applied AI Architect-style JDs use this exact
// disclosure language; they previously tripped sales_compensation=3 alone.
assertEq(
  classifySalesRole({
    title: "Applied AI Architect, Commercial",
    textSections: parseJdSections("Responsibilities\nWork with enterprise customers as a technical advisor.\nCompensation\nFor sales roles, the range provided is the role's On Target Earnings (\"OTE\") range, meaning that the range includes both the sales commissions/sales bonuses target and annual base salary for the role. Annual Salary: $240,000 - $315,000 USD."),
    primary_family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE",
  }).hard_drop,
  false,
  "V6: SA/FDE family with OTE-disclosure boilerplate alone does not hard-drop",
);

// V6 policy 2: SA/FDE family with OTE boilerplate + ONE other moderate signal
// should NOT hard-drop (was previously dropped at total=4 under old threshold).
assertEq(
  classifySalesRole({
    title: "Forward Deployed Engineer",
    textSections: parseJdSections("Responsibilities\nPartner with account executives on enterprise integration.\nCompensation\nFor sales roles, the range provided is the role's On Target Earnings (\"OTE\") range, meaning that the range includes both the sales commissions/sales bonuses target and annual base salary."),
    primary_family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE",
  }).hard_drop,
  false,
  "V6: SA/FDE family with boilerplate OTE + sales_counterpart only does not hard-drop",
);

// V6 policy 2: SA/FDE family with OTE + two other moderate signals SHOULD still
// hard-drop (total >= 5 with corroboration beyond sales_compensation).
assertEq(
  classifySalesRole({
    title: "Solutions Architect",
    textSections: parseJdSections("Responsibilities\nLead pre-sales discovery with Account Executives and drive the sales process for enterprise deals.\nCompensation\nFor sales roles, the range provided is the role's On Target Earnings (\"OTE\") range."),
    primary_family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE",
  }).hard_drop,
  true,
  "V6: SA/FDE family with boilerplate OTE + pre-sales + AEs still hard-drops",
);

// V6 policy 2: non-SA/FDE family keeps the existing >=4 threshold.
// "Account Executive" still hits hard_sales_title; check a content-only case.
assertEq(
  classifySalesRole({
    title: "Customer Success Manager",
    textSections: parseJdSections("Compensation\nOTE based comp with commission eligible.\nResponsibilities\nPartner with account executives on renewals."),
    primary_family: "UNKNOWN",
  }).hard_drop,
  true,
  "V6: non-SA/FDE family with OTE + AEs + renewals still drops at threshold 4",
);

// V6 policy 2 (F-008): sales_department alone (no corroborator) should NOT
// hard-drop. Previously sales_department=4 was sufficient on its own.
assertEq(
  classifySalesRole({
    title: "Solutions Architect",
    textSections: parseJdSections("Department\nSales Engineering\nResponsibilities\nDesign customer architectures."),
  }).hard_drop,
  false,
  "V6: sales_department alone (no corroborator) does not hard-drop",
);

// V6 policy 2: sales_department WITH corroborator still drops as before.
assertEq(
  classifySalesRole({
    title: "Solutions Engineer",
    textSections: parseJdSections("Department\nSales Engineering\nResponsibilities\nRun pre-sales discovery and partner with account executives."),
    primary_family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE",
  }).hard_drop,
  true,
  "V6: sales_department + sales_process + sales_counterpart still hard-drops for SA/FDE family",
);

const associate = classifyLevel({ title: "Associate AI Engineer" });
assertEq(associate.hard_drop, false, "Associate does not hard-drop");
assertEq(associate.annotations.includes("associate_level"), true, "Associate receives annotation");

assertEq(
  classifyRoleFamily({ title: "Solutions Architect", companyMeta: aiMeta }).primary_family,
  "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE",
  "Solutions Architect maps to highest family",
);

assertEq(
  classifyRoleFamily({
    title: "Full Stack Engineer",
    companyMeta: aiMeta,
    textSections: parseJdSections("Requirements\nBuild LLM products with RAG, Python APIs, and agentic workflows."),
  }).primary_family,
  "AI_ENGINEERING",
  "Full Stack Engineer with AI evidence maps to AI engineering",
);
assertEq(
  classifyRoleFamily({
    title: "Full Stack Engineer",
    companyMeta: { rank: 300, category: "SaaS" },
    textSections: parseJdSections("Requirements\nBuild billing dashboards with React."),
  }).primary_family,
  "GENERIC_ENGINEERING_REVIEW",
  "Full Stack Engineer without AI evidence stays review/generic",
);

assertEq(
  classifyRoleFamily({
    title: "Program Manager",
    companyMeta: aiMeta,
    textSections: parseJdSections("Responsibilities\nRun AI data programs and model evaluation operations."),
  }).primary_family,
  "AI_PROGRAM_OPS",
  "AI-native Program Manager with evidence maps to program ops",
);
assertEq(classifyRoleFamily({ title: "AI Tutor - Chinese", companyMeta: aiMeta }).primary_family, "AI_EVAL", "AI Tutor maps to eval family");
assertEq(
  classifyRoleFamily({ title: "Content Producer", textSections: parseJdSections("Write blog posts."), companyMeta: { category: "SaaS" } }).confidence,
  "weak",
  "Content without technical/generative evidence stays weak/review",
);

assertEq(
  decideCompensation({}, parseJdSections("Compensation\nBase salary $90K-$110K USD.")).hard_drop,
  true,
  "USD upper bound below 120 hard-drops",
);
assertEq(
  decideCompensation({}, parseJdSections("Compensation\nBase salary C$100,000 to C$119,000 CAD.")).hard_drop,
  true,
  "CAD upper bound below 120 hard-drops",
);
assertEq(
  decideCompensation({}, parseJdSections("Compensation\nRate $70-$80/hour USD for a full-time role.")).candidate.annualized_high_thousands,
  166,
  "Hourly annualization reflected",
);

assertEq(decideYoe({}, parseJdSections("Requirements\n0-2 years of experience.")).score, 5, "0-2 YoE scores +5");
assertEq(decideYoe({}, parseJdSections("Requirements\n3+ years of experience.")).score, 3, "3+ YoE lower bound scores +3");
assertEq(decideYoe({}, parseJdSections("Requirements\n4 years of experience.")).score, -2, "4 YoE scores -2");
assertEq(decideYoe({}, parseJdSections("Requirements\n5 years of experience.")).score, -6, "5 YoE scores -6");
assertEq(decideYoe({}, parseJdSections("Requirements\n5+ years of experience.")).hard_drop, false, "5+ YoE does not hard-drop");
assertEq(decideYoe({}, parseJdSections("Requirements\n6+ years of experience.")).hard_drop, true, "6+ YoE hard-drops");
assertEq(decideYoe({}, parseJdSections("Requirements\n0-10 years of experience.")).score, 5, "0-10 YoE uses lower bound");
assertEq(decideYoe({}, parseJdSections("Requirements\n6-8 years of experience.")).hard_drop, true, "6-8 YoE hard-drops from lower bound >5");
assertEq(
  decideYoe({}, parseJdSections("Requirements\n3+ years experience in people management of high performing engineering teams.\n7+ years experience on backend infrastructure with a focus on storage systems.")).hard_drop,
  true,
  "any specific 7+ requirement hard-drops",
);
assertEq(
  decideYoe({}, parseJdSections("Requirements\n10 years of prior post-sales customer relationship management.")).hard_drop,
  true,
  "10 years of prior post-sales requirement hard-drops",
);

assertEq(
  decideCompensation({}, parseJdSections("Responsibilities\nTravel approximately 30-40% to support partner planning.")).hard_drop,
  false,
  "travel percentage is not compensation",
);
assertEq(
  decideCompensation({}, parseJdSections("About us\nWe raised $100M and serve 5,400 customers.")).hard_drop,
  false,
  "funding/customer metrics are not compensation",
);
assertEq(
  decideCompensation({}, parseJdSections("Compensation\n$216,000 \\- $270,000USD")).candidate.high_thousands,
  270,
  "escaped Greenhouse salary range parses high bound",
);
const gleanComp = decideCompensation({}, parseJdSections("Compensation\nThis role requires travel 25-50%.\nThe standard compensation range for this position is $170,000-$280,000 annually plus equity."));
assertEq(gleanComp.hard_drop, false, "Glean-like travel percentage does not override high salary range");
assertEq(gleanComp.candidate.high_thousands, 280, "Glean-like salary range chooses high bound");
const spacexComp = decideCompensation({}, parseJdSections("Compensation\nLevel I: $100,000-$115,000/per year\nLevel II: $110,000-$135,000/per year"));
assertEq(spacexComp.hard_drop, false, "SpaceX-like multi-level salary keeps when one level crosses floor");
assertEq(spacexComp.candidate.high_thousands, 135, "SpaceX-like multi-level salary chooses passing level");
assertEq(detectHighSalaryRanges("Compensation\n$170,000-$280,000 annually plus equity").length > 0, true, "high salary contradiction detector sees annual salary range");

assertEq(
  decideLocation({}, parseJdSections("Location\nRemote, Hybrid - San Francisco"), "AI Engineer").hard_drop,
  false,
  "Remote plus hybrid keeps with annotation",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nHybrid - San Francisco"), "AI Engineer").hard_drop,
  true,
  "Non-Toronto hybrid without remote hard-drops",
);
assertEq(
  decideLocation({ location_raw: ["San Francisco, CA"] }, [], "AI Engineer").hard_drop,
  true,
  "specific non-Toronto location without remote hard-drops in shadow",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nHybrid cloud engineering team in Toronto"), "AI Engineer").hard_drop,
  false,
  "Hybrid cloud is not work-mode hybrid",
);
assertEq(
  decideLocation({ location_raw: ["Remote Hiring Process"] }, parseJdSections("Location\nAustin, Texas (Hybrid)\nThis role is in office 2 days per week."), "Customer Solutions Architect").hard_drop,
  true,
  "remote hiring process does not mask Austin hybrid hard-drop",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nAustin, Texas (Hybrid)\nWe are a remote first company, but this person will be based in Austin and in office 2 days per week."), "Customer Solutions Architect").hard_drop,
  true,
  "remote-first company text does not override role-specific Austin office requirement",
);
assertEq(
  decideLocation({ location_raw: ["Remote"] }, parseJdSections("Location\nRemote"), "Account Executive").hard_drop,
  false,
  "genuine remote is not location-dropped",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nUnited States Remote - Bay Area Preferred"), "Field Engineer").hard_drop,
  false,
  "United States Remote overrides Bay Area preference",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nCanada Remote\nBenefits\nWeekly in-office lunches and snacks."), "Machine Learning Engineer").hard_drop,
  false,
  "Canada Remote is not overridden by in-office lunch benefits",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nRedwood City, CA Hybrid"), "Technical Program Manager").hard_drop,
  true,
  "Redwood City hybrid without remote hard-drops",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nLondon, United Kingdom Full-time"), "Cloud Solutions Architect").hard_drop,
  true,
  "plain non-Toronto location without remote hard-drops",
);
assertEq(
  decideLocation({}, parseJdSections("Location\nHybrid Paris / London"), "AI Developer Advocate").hard_drop,
  true,
  "Paris/London hybrid without remote hard-drops",
);

const scored = scoreJob({
  job: { company: "Example AI", title: "Solutions Architect" },
  companyMeta: aiMeta,
  textSections: parseJdSections("Responsibilities\nDeploy agentic AI workflows with enterprise customers.\nRequirements\n3 years of Python experience.\nLocation\nRemote - US\nCompensation\n$150K-$190K USD"),
});
assertEq(scored.primary_family, "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE", "scoreJob keeps primary family");
assertEq(scored.hard_drop, false, "good remote SA job is kept");
assertEq(scored.shadow_score >= 34, true, "good SA job reaches S shadow band");

// ---------------------------------------------------------------------------
// V7 unit tests
// ---------------------------------------------------------------------------

// V7-A1: Pre-Sales title regex broadened. Source: plan §V7-A1; Round 3 §3-(a)
// at docs/audits/2026-05-05-round3-comparison-findings.md:149.
assertEq(classifySalesRole({ title: "Pre-Sales Solutions Engineer" }).hard_drop, true,
  "V7-A1: Pre-Sales Solutions Engineer drops at title (Deepgram canonical)");
assertEq(classifySalesRole({ title: "Presales Engineer" }).hard_drop, true,
  "V7-A1: Presales Engineer (no hyphen) drops at title");
assertEq(classifySalesRole({ title: "Pre Sales Architect" }).hard_drop, true,
  "V7-A1: Pre Sales Architect (space-only) drops at title");
assertEq(classifySalesRole({ title: "Pre-Sales Specialist" }).hard_drop, true,
  "V7-A1: Pre-Sales Specialist drops at title");
assertEq(classifySalesRole({ title: "Pre-Sales Technical Engineer" }).hard_drop, true,
  "V7-A1: Pre-Sales Technical Engineer drops at title");
assertEq(classifySalesRole({ title: "Pre-Sales Consultant" }).hard_drop, true,
  "V7-A1: Pre-Sales Consultant drops at title");
// Negative: Sales Engineering Manager — bare 'sales engineer' with 'engineering'
// trailing should NOT match because \b after `engineer` requires a non-word
// boundary, but `i` in `engineering` is a word char. Defense-in-depth.
assertEq(classifySalesRole({ title: "Sales Engineering Manager" }).hard_drop, false,
  "V7-A1: Sales Engineering Manager does NOT drop at title (defense-in-depth)");

// V7-A2: commercial_ownership regex tightened — bare 'territory' replaced with
// 'sales territory'. Country-dropdown body alone must NOT trip commercial_ownership.
// Source: plan §V7-A2; Round 3 §3-(c).
const v7a2CountryDropdown = classifySalesRole({
  title: "Applied AI Architect, Commercial",
  textSections: parseJdSections("Country *Afghanistan+93 - British Indian Ocean Territory+246 - British Virgin Islands+1 - Brunei+673 - Bulgaria+359 - Burkina Faso+226 - Cambodia+855"),
  primary_family: "AI_ENGINEERING",
});
assertEq(v7a2CountryDropdown.hard_drop, false,
  "V7-A2: country dropdown alone does NOT trip sales_role_content (no commercial_ownership FP)");

// V7-A2: 'sales territory' (the modifier-required form) DOES still fire.
const v7a2SalesTerritory = classifySalesRole({
  title: "Solutions Architect",
  textSections: parseJdSections("Responsibilities\nYou will own a sales territory and grow your book of business across enterprise customers, partner with account executives on the sales process."),
  primary_family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE",
});
assertEq(v7a2SalesTerritory.hard_drop, true,
  "V7-A2: 'sales territory' + book of business + AEs + sales process still drops");

// V7-A3: territory detection.
// NON_NA from title suffix.
assertEq(detectTerritory("Solutions Architect, EMEA", []).region, "NON_NA",
  "V7-A3: title 'Solutions Architect, EMEA' detects NON_NA");
assertEq(detectTerritory("AI Engineer", []).region, "UNKNOWN",
  "V7-A3: bare 'AI Engineer' (no tokens, no sections) returns UNKNOWN");

// NON_NA from section body.
const v7a3NonNaSection = detectTerritory("Solutions Engineer", parseJdSections(
  "About the role\nLead pre-sales engagements across India and the Asia-Pacific region.\nResponsibilities\nPartner with account executives on enterprise deals."
));
assertEq(v7a3NonNaSection.region, "NON_NA",
  "V7-A3: section body with India + APAC tokens returns NON_NA");

// NA from title.
assertEq(detectTerritory("Solutions Engineer, North America", []).region, "NA",
  "V7-A3: title with 'North America' returns NA");
assertEq(detectTerritory("AI Engineer", parseJdSections(
  "Responsibilities\nWork on Claude API for customers across the United States and Canada."
)).region, "NA",
  "V7-A3: section body 'United States' + 'Canada' returns NA");

// Section-failure fallback (V7-B2 case #18): JD with no recognized sections
// should return UNKNOWN, NOT scan whole body.
const v7a3NoSections = detectTerritory("AI Engineer", parseJdSections(
  "this jd has no recognized headings just a free-form paragraph mentioning India"
));
assertEq(v7a3NoSections.region === "UNKNOWN" || v7a3NoSections.region === "NON_NA", true,
  "V7-A3: parseJdSections may classify as inline-hint or unknown — accept either");
// Stronger guard: ensure pure-unknown body sections don't fire NON_NA.
const v7a3UnknownSections = detectTerritory("AI Engineer",
  [{ type: "unknown", text: "Some body text mentioning India without a recognized heading", confidence: "weak" }]
);
assertEq(v7a3UnknownSections.region, "UNKNOWN",
  "V7-A3: only-unknown sections (no responsibilities/requirements) return UNKNOWN");

// V7-A3 country-dropdown negative test — body contains 'British Indian Ocean
// Territory' but no recognized sections. Must return UNKNOWN.
const v7a3CountryDropdownOnly = detectTerritory("Applied AI Architect, Commercial",
  parseJdSections("Country *Afghanistan+93 - British Indian Ocean Territory+246 - British Virgin Islands+1")
);
assertEq(v7a3CountryDropdownOnly.region, "UNKNOWN",
  "V7-A3: country dropdown without role-content sections returns UNKNOWN");

// Bare 'us' must NOT trigger NA.
assertEq(detectTerritory("Engineer", parseJdSections("Responsibilities\nJoin us today and tell us about your experience.")).region, "UNKNOWN",
  "V7-A3: bare 'us' in 'join us' / 'tell us' does NOT trigger NA");

// Nationality adjectives must NOT trigger NON_NA on their own.
assertEq(detectTerritory("AI Tutor", parseJdSections(
  "Requirements\nMandarin Chinese language proficiency required."
)).region, "UNKNOWN",
  "V7-A3: 'Chinese' as language proficiency does NOT trigger NON_NA");

// V7-A3: scoreJob integration — territory hard-drop fires for NON_NA + sales context.
const v7a3IntegrationDrop = scoreJob({
  job: { company: "Anthropic", title: "Applied AI Architect, Commercial" },
  companyMeta: { rank: 1, category: "AI" },
  textSections: parseJdSections(
    "About the role\nAs an Applied AI team member at Anthropic India, you will be a Pre-Sales architect across India and the Asia-Pacific region.\n" +
    "Responsibilities\nPartner with account executives on enterprise sales process. Drive customer adoption."
  ),
});
assertEq(v7a3IntegrationDrop.hard_drop, true,
  "V7-A3: Anthropic India + sales context drops");
// V8-A1: reason renamed from `non_na_territory_with_sales_context` to `non_na_territory`.
assertEq(/non_na_territory/.test(v7a3IntegrationDrop.hard_drop_reason), true,
  "V8-A1: hard_drop_reason includes non_na_territory (renamed from non_na_territory_with_sales_context)");
assertEq(v7a3IntegrationDrop.territory.region, "NON_NA",
  "V7-A3: territory.region is NON_NA on India sales role");

// V7-A3: scoreJob integration — pure global-team AI Engineer with no sales: NO drop on territory.
const v7a3IntegrationNoDrop = scoreJob({
  job: { company: "Example", title: "AI Engineer" },
  companyMeta: { rank: 50, category: "AI" },
  textSections: parseJdSections(
    "About the role\nJoin our distributed team across EMEA, APAC, and the Americas building agentic AI systems.\n" +
    "Responsibilities\nBuild RAG pipelines with Python and pytorch.\nLocation\nFully remote."
  ),
});
// territory.region may be NON_NA (EMEA + APAC tokens), but no sales gate => no territory drop.
assertEq(/non_na_territory/.test(v7a3IntegrationNoDrop.hard_drop_reason), false,
  "V7-A3: pure-engineering global-team role does NOT drop on territory");

// V7-A5: AE/AM regression tests (per plan §V7-A5).
assertEq(classifySalesRole({ title: "Account Executive" }).hard_drop, true,
  "V7-A5: bare 'Account Executive' drops");
assertEq(classifySalesRole({ title: "Enterprise Account Executive - AI Platform" }).hard_drop, true,
  "V7-A5: 'Enterprise AE - AI Platform' drops");
assertEq(classifySalesRole({ title: "Account Manager" }).hard_drop, true,
  "V7-A5: bare 'Account Manager' drops");
assertEq(classifySalesRole({ title: "Strategic Account Manager - Generative AI" }).hard_drop, true,
  "V7-A5: 'Strategic Account Manager' drops (AM token catches before adjective wrapper)");
// Technical Account Manager — no quota content => keep at title level.
assertEq(classifySalesRole({ title: "Technical Account Manager" }).hard_drop, false,
  "V7-A5: TAM (no quota content) does NOT drop at title level");
// Account Coordinator — different role family.
assertEq(classifySalesRole({ title: "Account Coordinator" }).hard_drop, false,
  "V7-A5: Account Coordinator does NOT drop");
// V8-A3: Customer Success Manager DROPS on V8 CSM rule (with carve-out for AI hybrids).
// V7 kept this row; V8 reverses the policy.
assertEq(classifySalesRole({ title: "Customer Success Manager" }).hard_drop, true,
  "V8-A3: Customer Success Manager (title only) drops on sales_role_title");
// AE under SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE family STILL drops.
assertEq(classifySalesRole({ title: "Account Executive", primary_family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE" }).hard_drop, true,
  "V7-A5: AE under SA/FDE family STILL drops (loosening only applies to SA titles)");
// AM under AI_ENGINEERING family STILL drops.
assertEq(classifySalesRole({ title: "Account Manager", primary_family: "AI_ENGINEERING" }).hard_drop, true,
  "V7-A5: AM under AI_ENGINEERING family STILL drops");

// V7-B2 adversarial fixtures (per plan §V7-B2 table)
// #1 commercial_ownership country-dropdown: covered by v7a2CountryDropdown above.
// #2 sales_compensation evidence on OTE-disclosure boilerplate alone: SA/FDE
// family with boilerplate alone keeps (per V6 policy 2 already tested).
// #3 sales_department alone (no corroborator) does NOT fire hard_drop.
const v7b2DeptAlone = classifySalesRole({
  title: "Product Manager",
  textSections: parseJdSections("Department\nSales Engineering\nResponsibilities\nLead AI products."),
  primary_family: "AI_PROGRAM_OPS",
});
assertEq(v7b2DeptAlone.hard_drop, false,
  "V7-B2 #3: sales_department alone (no corroborator) does NOT fire sales_role_content");

// #15 Lattice-shape per-label aggregation: AI_PROGRAM_OPS with sales_department alone.
const v7b2Lattice = classifySalesRole({
  title: "Product Manager",
  textSections: parseJdSections("Department\nSales Engineering\nResponsibilities\nDrive product roadmap."),
  primary_family: "AI_PROGRAM_OPS",
});
assertEq(v7b2Lattice.hard_drop, false,
  "V7-B2 #15: Lattice-shape AI_PROGRAM_OPS with sales_department alone does NOT fire sales_role_content");

// #16 Anthropic India role with sales context drops on territory reason.
// (Covered by v7a3IntegrationDrop above — assert the full row drops with the reason.)
assertEq(v7a3IntegrationDrop.hard_drop, true, "V7-B2 #16: Anthropic India + sales context drops");

// #17 Anthropic Commercial (US) role does NOT drop on territory.
const v7b2AnthropicUS = scoreJob({
  job: { company: "Anthropic", title: "Applied AI Architect, Commercial" },
  companyMeta: { rank: 1, category: "AI" },
  textSections: parseJdSections(
    "About the role\nWork with enterprise customers across the United States and Canada.\n" +
    "Responsibilities\nPartner with account executives on enterprise sales process. Drive customer adoption."
  ),
});
assertEq(/non_na_territory/.test(v7b2AnthropicUS.hard_drop_reason || ""), false,
  "V7-B2 #17: Anthropic Commercial (US/Canada) does NOT drop on territory (NA region)");

// ---------------------------------------------------------------------------
// V8 unit tests
// ---------------------------------------------------------------------------

// V8-A1: strict-NA gate — drop on NON_NA without requiring sales context.
// Plan §V8-A1 acceptance: Cohere Singapore drops on `non_na_territory`.
const v8CohereSg = scoreJob({
  job: { company: "Cohere", title: "Applied AI Engineer - Agentic Workflows" },
  companyMeta: { rank: 14, category: "AI" },
  textSections: parseJdSections(
    "About the role\nApplied AI engineering for our Singapore office.\n" +
    "Responsibilities\nBuild RAG pipelines with Python and pytorch. Based in our Singapore office."
  ),
});
assertEq(v8CohereSg.hard_drop, true, "V8-A1: Cohere Singapore drops");
assertEq(/non_na_territory/.test(v8CohereSg.hard_drop_reason), true,
  "V8-A1: Cohere Singapore drops on non_na_territory (strict-NA, no sales-context requirement)");

// V8-A1: Anthropic India still drops with reason `non_na_territory` (was
// `non_na_territory_with_sales_context` in V7).
assertEq(v7a3IntegrationDrop.hard_drop_reason.includes("non_na_territory"), true,
  "V8-A1: Anthropic India hard_drop_reason includes non_na_territory");
assertEq(v7a3IntegrationDrop.hard_drop_reason.includes("non_na_territory_with_sales_context"), false,
  "V8-A1: Anthropic India hard_drop_reason does NOT include the V7 string");

// V8-A1 negative: country-dropdown literal text outside role-content sections → UNKNOWN.
const v8CountryDropdown = detectTerritory("Applied AI Architect, Commercial",
  parseJdSections("Country *Afghanistan+93 - British Indian Ocean Territory+246 - British Virgin Islands+1")
);
assertEq(v8CountryDropdown.region, "UNKNOWN",
  "V8-A1: country dropdown without role-content sections returns UNKNOWN");

// V8-A1 negative: US JD with global team mention in About Us section.
// About Us is NOT in recognizedTypes — bare global mention there must NOT trigger NON_NA.
const v8UsRoleGlobalAbout = detectTerritory("AI Engineer",
  parseJdSections("About us\nWe have offices in San Francisco, NYC, London, and Tokyo.")
);
assertEq(v8UsRoleGlobalAbout.region === "UNKNOWN" || v8UsRoleGlobalAbout.region === "NA", true,
  "V8-A1: 'we have offices in SF, NYC, London, Tokyo' in About Us → UNKNOWN or NA, no drop");

// V8-A1: multi-region open-to-candidates resolves NA via anchor majority (2 NA + 1 NON_NA → NA wins).
const v8MultiRegion = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nBuild RAG pipelines.\nLocation\nOpen to candidates in Toronto, NYC, or London.")
);
assertEq(v8MultiRegion.region, "NA",
  "V8-A1: 'Open to candidates in Toronto, NYC, or London' → NA (anchor majority)");

// V8-A1: bare token tie WITHOUT role-anchor still returns UNKNOWN (V7 behavior preserved).
const v8GlobalTeam = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nJoin our distributed team across EMEA, APAC, and the Americas.")
);
assertEq(v8GlobalTeam.region, "UNKNOWN",
  "V8-A1: bare token tie 'EMEA, APAC, Americas' (no role-anchor) → UNKNOWN");

// V8-A1: 'Location: London' section header drops on territory via location section.
const v8LocationLondon = detectTerritory("Senior Product Manager",
  parseJdSections("Responsibilities\nLead product strategy.\nLocation\nLondon")
);
assertEq(v8LocationLondon.region, "NON_NA",
  "V8-A1: 'Location\\nLondon' resolves NON_NA via location section");

// V8-A1: 'based out of London office, with quarterly travel to NYC' → NON_NA (London is base).
const v8BasedOutOf = detectTerritory("Solutions Architect",
  parseJdSections("Responsibilities\nThis role is based out of our London office, with quarterly travel to NYC.")
);
assertEq(v8BasedOutOf.region, "NON_NA",
  "V8-A1: 'based out of London office, with quarterly travel to NYC' → NON_NA");

// V8-A1: 'Hybrid: Toronto, Canada' → NA.
const v8HybridToronto = detectTerritory("AI Engineer",
  parseJdSections("Location\nHybrid: Toronto, Canada")
);
assertEq(v8HybridToronto.region, "NA",
  "V8-A1: 'Hybrid: Toronto, Canada' → NA");

// V8-A1: Anthropic SF role with title 'Applied AI Architect, Americas' → NA from title.
assertEq(detectTerritory("Applied AI Architect, Americas", []).region, "NA",
  "V8-A1: title 'Applied AI Architect, Americas' → NA");

// V8-A2: Director-level sales titles drop with reason sales_role_title.
// Note: Account Director also drops on classifyLevel (senior_title); test that
// reason string includes sales_role_title (not equality — multiple reasons join with "; ").
const v8AccountDirector = scoreJob({
  job: { company: "Example", title: "Account Director" },
  companyMeta: { rank: 50, category: "AI" },
  textSections: parseJdSections("Responsibilities\nDrive sales."),
});
assertEq(v8AccountDirector.hard_drop, true, "V8-A2: Account Director drops");
assertEq(v8AccountDirector.hard_drop_reason.includes("sales_role_title"), true,
  "V8-A2: Account Director drops with sales_role_title reason");

const v8StrategicAcctDir = classifySalesRole({ title: "Strategic Account Director - AI Platform" });
assertEq(v8StrategicAcctDir.hard_drop, true, "V8-A2: Strategic Account Director drops");
assertEq(v8StrategicAcctDir.reason, "sales_role_title", "V8-A2: reason is sales_role_title");

const v8DirectorSales = classifySalesRole({ title: "Director, Sales" });
assertEq(v8DirectorSales.hard_drop, true, "V8-A2: 'Director, Sales' drops");
assertEq(v8DirectorSales.reason, "sales_role_title", "V8-A2: reason is sales_role_title");

const v8DirOfSales = classifySalesRole({ title: "Director of Sales" });
assertEq(v8DirOfSales.hard_drop, true, "V8-A2: 'Director of Sales' drops");
assertEq(v8DirOfSales.reason, "sales_role_title", "V8-A2: reason is sales_role_title");

const v8SalesDirEnt = classifySalesRole({ title: "Sales Director, Enterprise" });
assertEq(v8SalesDirEnt.hard_drop, true, "V8-A2: 'Sales Director, Enterprise' drops");
assertEq(v8SalesDirEnt.reason, "sales_role_title", "V8-A2: reason is sales_role_title");

// V8-A2 GENUINELY NEW: Regional Sales Manager (no Director/VP, was kept under V7).
const v8RegSalesMgr = classifySalesRole({ title: "Regional Sales Manager" });
assertEq(v8RegSalesMgr.hard_drop, true, "V8-A2: 'Regional Sales Manager' drops (genuinely new)");
assertEq(v8RegSalesMgr.reason, "sales_role_title", "V8-A2: 'Regional Sales Manager' reason is sales_role_title");

// V8-A2 NEGATIVE: Engineering Director must NOT match V8 sales regex.
// (It will still drop on senior_title — that's classifyLevel, not classifySalesRole.)
assertEq(classifySalesRole({ title: "Engineering Director" }).hard_drop, false,
  "V8-A2 negative: 'Engineering Director' does NOT match V8 sales regex");

// V8-A2 NEGATIVE: Director of Marketing must NOT match V8 sales regex.
assertEq(classifySalesRole({ title: "Director of Marketing" }).hard_drop, false,
  "V8-A2 negative: 'Director of Marketing' does NOT match V8 sales regex");

// V8-A3: Customer Success Manager drops on sales_role_title.
const v8Csm = classifySalesRole({ title: "Customer Success Manager" });
assertEq(v8Csm.hard_drop, true, "V8-A3: Customer Success Manager drops");
assertEq(v8Csm.reason, "sales_role_title", "V8-A3: CSM reason is sales_role_title");

// V8-A3 carve-out: 'Customer Success Manager, AI Platform' → keeps (AI carve-out).
const v8CsmAi = classifySalesRole({ title: "Customer Success Manager, AI Platform" });
assertEq(v8CsmAi.hard_drop, false,
  "V8-A3 carve-out: 'Customer Success Manager, AI Platform' does NOT drop on CSM rule");

// V8-A3 carve-out: 'Customer Success Manager, AI Strategy' → keeps.
assertEq(classifySalesRole({ title: "Customer Success Manager, AI Strategy" }).hard_drop, false,
  "V8-A3 carve-out: 'Customer Success Manager, AI Strategy' does NOT drop");

// V8-A3 carve-out: 'Customer Success Manager, AI Implementation' → keeps.
assertEq(classifySalesRole({ title: "Customer Success Manager, AI Implementation" }).hard_drop, false,
  "V8-A3 carve-out: 'Customer Success Manager, AI Implementation' does NOT drop");

// V8-A3 regex shape: 'Customer Success Engineer' does NOT match the CSM regex
// (regex requires noun=Manager/Director/Lead/Head). It's a regex-shape consequence,
// not an explicit Engineer carve-out.
assertEq(classifySalesRole({ title: "Customer Success Engineer" }).hard_drop, false,
  "V8-A3 regex shape: 'Customer Success Engineer' does NOT match CSM regex");

// V8-A3: Renewals Manager drops.
assertEq(classifySalesRole({ title: "Renewals Manager" }).hard_drop, true,
  "V8-A3: Renewals Manager drops");
assertEq(classifySalesRole({ title: "Renewals Manager" }).reason, "sales_role_title",
  "V8-A3: Renewals Manager reason is sales_role_title");

// V8-A3: Customer Onboarding Manager does NOT match (different noun, no 'success'/'renewal').
assertEq(classifySalesRole({ title: "Customer Onboarding Manager" }).hard_drop, false,
  "V8-A3: 'Customer Onboarding Manager' does NOT drop on CSM rule");

// V8-A3: 'Senior Customer Success Manager' — the literal "senior" token is NOT
// in classifyLevel's senior_title regex (which catches vp/director/principal/staff/lead/etc).
// So Senior CSM drops only on sales_role_title (CSM rule, no AI carve-out token).
const v8SeniorCsm = scoreJob({
  job: { company: "Example", title: "Senior Customer Success Manager" },
  companyMeta: { rank: 50 },
  textSections: parseJdSections("Responsibilities\nManage accounts."),
});
assertEq(v8SeniorCsm.hard_drop, true, "V8-A3: Senior Customer Success Manager drops");
assertEq(v8SeniorCsm.hard_drop_reason.includes("sales_role_title"), true,
  "V8-A3: Senior CSM reason includes sales_role_title (CSM rule)");

// V8-B2 #19-#26 adversarial fixtures (per plan §V8-B2 expanded table).

// #19: Country-dropdown literal in role-content section header → still UNKNOWN.
const v8b2CountryDropdownInSection = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nBuild AI systems.\nCountry *Afghanistan+93 - British Indian Ocean Territory+246")
);
assertEq(v8b2CountryDropdownInSection.region === "UNKNOWN" || v8b2CountryDropdownInSection.region === "NA", true,
  "V8-B2 #19: country dropdown text in section header → UNKNOWN/NA (not NON_NA)");

// #20: Country-dropdown literal text outside role-content sections → UNKNOWN.
// (Already covered by v8CountryDropdown above.)

// #21: US JD with 'we have offices in London and Tokyo' in About Us section → NOT NON_NA.
const v8b2OfficesInAbout = detectTerritory("AI Engineer",
  parseJdSections("About us\nWe have offices in London and Tokyo.\nResponsibilities\nBuild AI in San Francisco.")
);
assertEq(v8b2OfficesInAbout.region === "NA" || v8b2OfficesInAbout.region === "UNKNOWN", true,
  "V8-B2 #21: US role with London/Tokyo mentions only in About Us → NA or UNKNOWN");

// #22: 'Distributed remote team with members across Europe and Asia' in About → UNKNOWN.
const v8b2DistAbout = detectTerritory("AI Engineer",
  parseJdSections("About us\nDistributed remote team with members across Europe and Asia.")
);
assertEq(v8b2DistAbout.region === "UNKNOWN" || v8b2DistAbout.region === "NA", true,
  "V8-B2 #22: distributed remote team in About Us → UNKNOWN/NA");

// #23: 'Role is based out of London office, with quarterly travel to NYC' → NON_NA.
// (Already covered by v8BasedOutOf above.)

// #24: 'Hybrid: Toronto, Canada' → NA. (Already covered by v8HybridToronto above.)

// #25: Location: London section header (positive). (Already covered by v8LocationLondon.)

// #26: Multi-region body-tie: Toronto, NYC, or London → NA.
// (Already covered by v8MultiRegion above.)

// #27: Anthropic SF role with title 'Applied AI Architect, Americas' → NA.
// (Already covered above.)

// #28: Cohere Singapore JD — already covered by v8CohereSg.

// #29: Account Director — already covered.
// #30: Account Director, AI Platform → drops on sales_role_title (no AE/AM carve-out).
const v8b2AcctDirAi = classifySalesRole({ title: "Account Director, AI Platform" });
assertEq(v8b2AcctDirAi.hard_drop, true,
  "V8-B2 #30: Account Director, AI Platform drops (no AE/AM carve-out)");
assertEq(v8b2AcctDirAi.reason, "sales_role_title",
  "V8-B2 #30: reason is sales_role_title");

// #31-#33: CSM cases — already covered.
// #34: Director of Marketing → does NOT drop on V8 sales regex.
// (Already covered.)

// #35: Regional Sales Manager — already covered.

// =============================================================================
// V9-1 / V9-2 tests — Round 5 false-positive closure
// =============================================================================
// Source: docs/audits/2026-05-06-round5-verification-findings.md
// V9-1: NA_CITIES_RE expanded with bare US-city abbrevs (SF/NY/LA/DC) +
//       coast descriptors (us east coast, us west coast, coastal us).
// V9-2: ROLE_ANCHOR_PATTERNS extended with markdown `## Location` block and
//       role-base "offices" pattern. `location`-typed sections also serve as
//       implicit anchors when ≤120 chars.
//
// The 3 confirmed Round 5 FPs all share root cause: bare `SF`/`NY` in
// parenthesized multi-region lists `(SF, NY, London, or Berlin)` resolved
// NON_NA because SF/NY weren't tokenized as NA. After V9-1, they DO tokenize.
// The 1 confirmed cohort miss (Cohere FDE Infrastructure Specialist) had a
// `## Location\nJapan; Korea; Singapore` markdown block that didn't fire any
// anchor — V9-2 promotes location-typed section bodies to anchor evidence.

// V9-1 positive: Vercel-shape multi-region (SF, NY, London, or Berlin) → not NON_NA.
const v9VercelMultiRegion = detectTerritory("Pricing Product Manager",
  parseJdSections("Responsibilities\nLead pricing strategy.\nLocation\nIf you're based within commuting distance of one of our offices (SF, NY, London, or Berlin), the role includes anchor days.")
);
assertEq(v9VercelMultiRegion.region !== "NON_NA", true,
  "V9-1: '(SF, NY, London, or Berlin)' multi-region → not NON_NA (no territory drop)");

// V9-1 positive: XBOW-shape coast descriptor "Europe (Remote); US East Coast" → not NON_NA.
const v9XbowCoast = detectTerritory("Software Engineer - AI Systems",
  parseJdSections("Responsibilities\nBuild systems.\nLocation\nEurope (Remote); US East Coast")
);
assertEq(v9XbowCoast.region !== "NON_NA", true,
  "V9-1: 'Europe (Remote); US East Coast' → not NON_NA (US East Coast counts as NA)");

// V9-1 positive: bare "in NYC" full-name path remains NA (covered already, sanity).
assertEq(detectTerritory("AI Engineer",
  parseJdSections("Location\nin NYC")).region !== "NON_NA", true,
  "V9-1: 'in NYC' → NA (or UNKNOWN), not NON_NA");

// V9-1 positive: coast descriptor alone in role section.
const v9EastCoast = detectTerritory("AI Engineer",
  parseJdSections("Location\nbased out of US East Coast")
);
assertEq(v9EastCoast.region, "NA",
  "V9-1: 'based out of US East Coast' → NA (coast descriptor)");

// V9-1 NEGATIVE: lowercase prose must NOT match bare SF/NY/LA/DC tokens.
// "user satisfaction" — `\bsf\b` does not match (internal letters).
const v9NegSatisfaction = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nDeliver user satisfaction across the team.")
);
assertEq(v9NegSatisfaction.region !== "NA", true,
  "V9-1 negative: 'user satisfaction' does NOT false-positive on SF token");

// "salesforce" — internal "sf"; word-boundary protects.
const v9NegSalesforce = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nIntegrate with salesforce APIs.")
);
assertEq(v9NegSalesforce.region !== "NA", true,
  "V9-1 negative: 'salesforce' does NOT false-positive on SF token");

// "satisfaction guaranteed" — same as above.
const v9NegGuaranteed = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nWork on satisfaction guaranteed contracts.")
);
assertEq(v9NegGuaranteed.region !== "NA", true,
  "V9-1 negative: 'satisfaction guaranteed' does NOT false-positive");

// "à la carte" / "la mañana" — bare "la" in lowercase prose; delimiter guard
// requires symmetric punctuation context, not bare-word context.
const v9NegLaCarte = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nBuild à la carte pricing tiers for tomorrow morning.")
);
assertEq(v9NegLaCarte.region !== "NA", true,
  "V9-1 negative: 'à la carte' does NOT false-positive on bare LA");

// "DC current" — bare "dc" in technical prose.
const v9NegDcCurrent = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nDesign DC current power systems for data centers.")
);
assertEq(v9NegDcCurrent.region !== "NA", true,
  "V9-1 negative: 'DC current' does NOT false-positive on bare DC");

// V9-2 positive: `## Location\nJapan; Korea; Singapore` markdown block → NON_NA.
const v9CohereLocation = detectTerritory("Forward Deployed Engineer, Infrastructure Specialist",
  parseJdSections("## Location\n\nJapan; Korea; Singapore\n\n## Department\n\nAgentic Platform")
);
assertEq(v9CohereLocation.region, "NON_NA",
  "V9-2: '## Location\\nJapan; Korea; Singapore' markdown block → NON_NA via location-section anchor");

// V9-2 NEGATIVE: company-context "we have offices in {list}" alone does NOT
// fire role anchor. Existing V8 behaviour preserved (this test guards against
// the V9-2 role-base offices pattern accidentally widening into company context).
const v9NegCompanyOffices = detectTerritory("AI Engineer",
  parseJdSections("Responsibilities\nWork on RAG.\nAbout us\nWe have offices in Toronto, NY, SF, London, Paris.")
);
// "About us" is not a recognized section type; the offices line should be
// excluded. Without recognized sections AND without anchor firing, region is
// UNKNOWN. (Tokens that DO appear in recognized-section bodies are scanned;
// "RAG" alone has no tokens.)
assertEq(v9NegCompanyOffices.region !== "NON_NA", true,
  "V9-2 negative: 'we have offices in Toronto, NY, SF, London, Paris' (company context, About Us) does NOT fire role anchor → not NON_NA");

// V9-2 positive: role-base "offices in" pattern — explicit role-attribution.
const v9RoleBaseOffices = detectTerritory("Solutions Engineer",
  parseJdSections("Responsibilities\nThis role can be performed from any of our offices in Toronto or Vancouver.")
);
assertEq(v9RoleBaseOffices.region, "NA",
  "V9-2: 'this role can be performed from any of our offices in Toronto or Vancouver' → NA");

// =============================================================================
// V10-1 tests — symmetric gate on V9-2 implicit location-section anchor
// =============================================================================
// Source: docs/audits/2026-05-06-round6-verification-findings.md
// Round 6 verified 2 confirmed FPs from V9-2's implicit location-section
// anchor:
//   1. GitLab Engineering Manager AI Engineering: Workflow Catalog
//      (`Remote, EMEA; Remote, US-Southeast`) — wrongly hard-dropped on
//      `non_na_territory` despite explicit US-Southeast remote acceptance.
//   2. ElevenLabs Forward Deployed Engineer
//      (`San Francisco; Brazil; France; India; New York`) — wrongly
//      hard-dropped despite SF + NY explicit role bases.
// Root cause: V9-2 promoted NON_NA anchors via numeric-majority without
// considering NA token presence. V10-1 gates the implicit anchor on either
// NA-absence or NON_NA strict-majority (>2× NA). Otherwise it suppresses
// the NON_NA anchor and promotes NA anchors, letting the existing anchor-tie
// disambiguation (NA wins on tie/majority) resolve to NA.

// V10-1 positive: multi-region location section with NA token (US-Southeast)
// present must NOT fire NON_NA. Body NA=1 (`, US-`), NON_NA=1 (EMEA) — fall
// through gate → suppress implicit anchor entirely → no anchor fires →
// body-tie default resolves UNKNOWN → no hard-drop. The binding contract is
// "doesn't fire NON_NA → doesn't hard-drop on territory"; UNKNOWN and NA
// both deliver the no-drop semantic.
{
  const result = detectTerritory("Engineering Manager",
    parseJdSections("## Location\nRemote, EMEA; Remote, US-Southeast")
  );
  assertEq(result.region !== "NON_NA", true,
    "V10-1: multi-region with US-Southeast present does NOT fire NON_NA (gate suppresses implicit anchor)");
}

// V10-1 positive: multi-region with multiple NA tokens (SF + NY) and NON_NA
// not strictly dominant must NOT fire NON_NA. Body NA=2 (San Francisco,
// New York), NON_NA=3 (Brazil, France, India). 3 NOT > 2*2 → fall through
// gate → suppress implicit anchor → UNKNOWN/no-drop.
{
  const result = detectTerritory("Forward Deployed Engineer",
    parseJdSections("## Location\nSan Francisco; Brazil; France; India; New York")
  );
  assertEq(result.region !== "NON_NA", true,
    "V10-1: NON_NA not strictly-majority over NA when NA tokens present (gate suppresses)");
}

// V10-1 preserved: NA-absence still fires NON_NA (Cohere FDE Infrastructure
// Specialist named-cohort recovery preserved). Body NA=0, NON_NA=3 →
// NA-absence branch → fire as V9-2.
{
  const result = detectTerritory("Forward Deployed Engineer, Infrastructure Specialist",
    parseJdSections("## Location\nJapan; Korea; Singapore")
  );
  assertEq(result.region, "NON_NA",
    "V10-1: NA-absence preserves NON_NA firing (Cohere named-cohort recovery)");
}

// V10-1 preserved: NON_NA strict-majority (>2× NA) still fires NON_NA. Body
// NA=1 (New York), NON_NA=5 (London/Paris/Berlin/Tokyo/Mumbai). 5 > 2*1 →
// strict-majority branch → fire as V9-2.
{
  const result = detectTerritory("Solutions Engineer",
    parseJdSections("## Location\nLondon; Paris; Berlin; Tokyo; Mumbai; New York")
  );
  assertEq(result.region, "NON_NA",
    "V10-1: NON_NA strict majority (>2× NA) still fires NON_NA");
}

// V10-1 preserved: legitimate single-region NON_NA-only roles still drop.
// Bangalore-only (GitLab AI Engineer) and India-only (OpenAI AI Deployment
// Engineer Startups) — both NA-absence cases.
{
  const result = detectTerritory("AI Engineer",
    parseJdSections("## Location\nRemote, Bangalore")
  );
  assertEq(result.region, "NON_NA",
    "V10-1: GitLab Bangalore-only role still NON_NA (preserved V9-A2 capture)");
}
{
  const result = detectTerritory("AI Deployment Engineer",
    parseJdSections("## Location\nIndia - Remote")
  );
  assertEq(result.region, "NON_NA",
    "V10-1: OpenAI India-only role still NON_NA (preserved V9-A2 capture)");
}

// V10-1 negative-regression: "global team distributed across EMEA, APAC,
// Americas" (V7 negative test) is NOT in a `location`-typed section so the
// implicit-anchor block does not fire; UNKNOWN preserved.
{
  const result = detectTerritory("Engineer",
    parseJdSections("Responsibilities\nGlobal team distributed across EMEA, APAC, Americas.")
  );
  assertEq(result.region, "UNKNOWN",
    "V10-1 negative: V7 'global team distributed' → UNKNOWN preserved");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
