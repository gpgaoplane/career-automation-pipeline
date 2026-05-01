#!/usr/bin/env node
/**
 * Smoke tests for extractSignals() in enrich-jobs.mjs.
 * Run: node test-enrich-signals.mjs
 */

import { extractSignals } from './enrich-jobs.mjs';

let passed = 0;
let failed = 0;

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  OK: ${msg}`); }
  else { failed++; console.log(`  FAIL: ${msg}\n    expected: ${e}\n    got:      ${a}`); }
}

// Fixture 1: ideal mid-level role hitting most positives
{
  const txt = `We're hiring a mid-level AI Engineer to join our agentic-systems team in Toronto, Canada.
You'll work on RAG pipelines, LangChain orchestration, and production LLM deployments using Python.
3-5 years of experience required.
Compensation: $130,000 - $170,000 CAD.`;
  const s = extractSignals(txt);
  console.log('Fixture 1: ideal mid-level Toronto role');
  assertEq(s.location_match.includes('Toronto'), true, 'Toronto detected');
  assertEq(s.comp_low_thousands, 130, 'comp_low_thousands = 130');
  assertEq(s.comp_high_thousands, 170, 'comp_high_thousands = 170');
  assertEq(s.comp_currency, 'CAD', 'currency = CAD');
  assertEq(s.yoe_signal, '3-5', 'yoe = 3-5');
  assertEq(s.deal_breaker_signal, null, 'no deal breaker');
  assertEq(s.track_keywords_matched.length >= 3, true, 'track_keywords ≥ 3');
  assertEq(s.tech_stack_matched.includes('Python'), true, 'tech_stack has Python');
}

// Fixture 2: senior trap with high YoE
{
  const txt = `Senior AI Engineer — Series C startup. We need someone with 8+ years of experience in distributed systems.
Base salary: $200,000 - $250,000 USD plus equity. Remote US-based only.`;
  const s = extractSignals(txt);
  console.log('Fixture 2: senior trap');
  assertEq(s.yoe_signal, '6+', 'yoe = 6+');
  assertEq(s.comp_low_thousands, 200, 'comp_low = 200');
  assertEq(s.comp_currency, 'USD', 'currency = USD');
  assertEq(s.location_match.includes('Toronto'), false, 'no Toronto');
}

// Fixture 3: location-fail (Europe required, no comp visible)
{
  const txt = `Looking for an applied ML engineer in Berlin, Germany. PhD required. In-office 5 days a week. Visa sponsorship not available for remote.`;
  const s = extractSignals(txt);
  console.log('Fixture 3: deal-breaker (Berlin + PhD + onsite)');
  assertEq(s.location_match, [], 'no Toronto/Canada');
  assertEq(s.comp_low_thousands, null, 'no comp');
  assertEq(s.deal_breaker_signal === 'phd_required' || s.deal_breaker_signal === 'no_sponsorship_remote' || s.deal_breaker_signal === 'onsite_5_days_non_toronto', true, 'a deal-breaker is detected');
}

// Fixture 4: comp range with K notation
{
  const txt = `Mid-level Solutions Architect. Compensation: $130K-$180K USD. Fully remote, North America.`;
  const s = extractSignals(txt);
  console.log('Fixture 4: K-notation comp + fully-remote-US');
  assertEq(s.comp_low_thousands, 130, 'low=130');
  assertEq(s.comp_high_thousands, 180, 'high=180');
  assertEq(s.comp_currency, 'USD', 'currency=USD');
  assertEq(s.location_match.includes('Fully remote US'), true, 'fully-remote-US flagged');
}

// Fixture 5: Firecrawl pay transparency shorthand + generic raw location
{
  const txt = `# Research Engineer

San Francisco

Apply

## Equal Opportunity & Pay Transparency

|     |     |
| --- | --- |
| **Pay Range** | $200-$325k base salary (good-faith estimate for San Francisco Bay Area) |`;
  const s = extractSignals(txt);
  console.log('Fixture 5: Firecrawl markdown pay range + raw location');
  assertEq(s.location_match, [], 'no Will-fit location match');
  assertEq(s.location_raw.includes('San Francisco'), true, 'raw location includes San Francisco');
  assertEq(s.comp_low_thousands, 200, 'low=200 from $200-$325k');
  assertEq(s.comp_high_thousands, 325, 'high=325 from $200-$325k');
  assertEq(s.comp_currency, 'USD', 'currency inferred from San Francisco');
}

// Fixture 6: Ashby-style location heading
{
  const txt = `# Product Manager

## Location

United Kingdom, London

## Employment Type

Full time`;
  const s = extractSignals(txt);
  console.log('Fixture 6: Ashby location heading');
  assertEq(s.location_match, [], 'no Will-fit location match');
  assertEq(s.location_raw.includes('United Kingdom, London'), true, 'raw location includes UK/London');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
