#!/usr/bin/env node

import { parseJdSections, findSectionEvidence, extractRequirementBlocks } from "./lib/jd-sections.mjs";

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

{
  const sections = parseJdSections(`# AI Solutions Architect

## What you'll do
- Deploy AI workflows with customers.

## Requirements
- 3 years of experience with Python and LLMs.

## Compensation
$130K-$180K USD

## Location
Remote - US`);
  assertEq(sections.some((s) => s.type === "responsibilities"), true, "responsibilities heading parsed");
  assertEq(extractRequirementBlocks(sections).length, 1, "requirements block parsed");
  assertEq(findSectionEvidence(sections, "compensation").length, 1, "compensation evidence returned");
  assertEq(findSectionEvidence(sections, "location")[0].snippet.includes("Remote"), true, "location evidence snippet retained");
}

{
  const sections = parseJdSections(`We offer a salary range of $120,000 to $160,000 CAD.
This remote role works with customers to implement agentic AI systems.`);
  assertEq(sections.some((s) => s.type === "compensation"), true, "paragraph compensation classified by hint");
  assertEq(sections.some((s) => s.type === "location"), false, "single mixed paragraph keeps first stronger hint only");
}

{
  const sections = parseJdSections(`About us
We build developer tools.

You have
5+ years of experience shipping products.`);
  assertEq(sections.map((s) => s.type).includes("about_company"), true, "about-company heading parsed");
  assertEq(extractRequirementBlocks(sections)[0].text.includes("5+ years"), true, "alias requirement heading parsed");
}

// V8-A1 — new section aliases under responsibilities canonical type
{
  const sections = parseJdSections(`Your Impact
- Lead enterprise customers from POC to production.

Your Mission
- Deliver AI integrations that ship.

Job Details
- Hybrid in NYC.

The Position
- Forward Deployed Engineer.`);
  const respSections = sections.filter((s) => s.type === "responsibilities");
  assertEq(respSections.length >= 4, true, "V8-A1: Your Impact / Your Mission / Job Details / The Position aliased to responsibilities");
}

// V8-A1 — Day-to-Day, About this Role, What You'll Drive aliases
{
  const sections = parseJdSections(`Day-to-Day
- You will deploy.

About this Role
- This is a customer-facing position.

What You'll Drive
- Strategic AI initiatives.`);
  const respSections = sections.filter((s) => s.type === "responsibilities");
  assertEq(respSections.length >= 3, true, "V8-A1: Day-to-Day / About this Role / What You'll Drive aliased to responsibilities");
}

// V8-A1 — "Where you'll work" aliased to location
{
  const sections = parseJdSections(`Where you'll work
Remote-first with offices in London and Berlin.`);
  assertEq(sections.some((s) => s.type === "location"), true, "V8-A1: Where you'll work aliased to location");
}

// V8-A1 — "What we offer" / "What You'll Get" aliased to compensation
{
  const sections = parseJdSections(`What we offer
Salary range $130K-$180K USD.

What You'll Get
Equity and benefits.`);
  const compSections = sections.filter((s) => s.type === "compensation");
  assertEq(compSections.length >= 2, true, "V8-A1: What we offer / What You'll Get aliased to compensation");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
