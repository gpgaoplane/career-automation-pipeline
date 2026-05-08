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

// Fixture 7: currency-before annual range
{
  const txt = `Compensation
USD 120,000 to USD 150,000 base salary.
Remote - US.`;
  const s = extractSignals(txt);
  console.log('Fixture 7: currency-before annual range');
  assertEq(s.comp_low_thousands, 120, 'low=120 from USD before number');
  assertEq(s.comp_high_thousands, 150, 'high=150 from USD before number');
  assertEq(s.comp_rate_type, 'annual', 'rate type annual');
  assertEq(s.comp_annualized_high_thousands, 150, 'annualized high=150');
}

// Fixture 8: hourly range annualization
{
  const txt = `Rate: $60-$75/hour USD for this full-time AI trainer role.`;
  const s = extractSignals(txt);
  console.log('Fixture 8: hourly range annualization');
  assertEq(s.comp_rate_type, 'hourly', 'rate type hourly');
  assertEq(s.comp_low_thousands, 125, 'hourly low annualized at 2080h');
  assertEq(s.comp_high_thousands, 156, 'hourly high annualized at 2080h');
  assertEq(s.comp_currency, 'USD', 'hourly currency USD');
}

// Fixture 9: YoE details distinguish 5+ from >5
{
  const txt = `Requirements
5+ years of experience with AI products.`;
  const s = extractSignals(txt);
  console.log('Fixture 9: YoE details');
  assertEq(s.yoe_required_years, 5, 'yoe_required_years=5');
  assertEq(s.yoe_required_min, 5, 'yoe_required_min=5');
  assertEq(s.yoe_required_max, null, 'yoe_required_max=null for open-ended');
  assertEq(s.yoe_confidence, 'strong', 'yoe_confidence strong');
  assertEq(s.yoe_open_ended, true, 'yoe_open_ended true');
}

// Fixture 10: CAD currency-before K range
{
  const txt = `Salary range: CAD 115k to CAD 140k base pay.`;
  const s = extractSignals(txt);
  console.log('Fixture 10: CAD currency-before K range');
  assertEq(s.comp_low_thousands, 115, 'CAD low=115');
  assertEq(s.comp_high_thousands, 140, 'CAD high=140');
  assertEq(s.comp_currency, 'CAD', 'currency CAD');
}

// Fixture 11: CA$ annual range below floor candidate
{
  const txt = `Base pay CA$95,000 - CA$115,000 for Toronto candidates.`;
  const s = extractSignals(txt);
  console.log('Fixture 11: CA$ annual range');
  assertEq(s.comp_low_thousands, 95, 'CA$ low=95');
  assertEq(s.comp_high_thousands, 115, 'CA$ high=115');
  assertEq(s.comp_currency, 'CAD', 'currency CAD from CA$');
}

// Fixture 12: hourly crossing annualized floor
{
  const txt = `Rate: $45-$75/hour USD for full-time remote work.`;
  const s = extractSignals(txt);
  console.log('Fixture 12: hourly crossing floor');
  assertEq(s.comp_rate_type, 'hourly', 'hourly crossing floor rate type');
  assertEq(s.comp_low_thousands, 94, 'hourly low annualized');
  assertEq(s.comp_high_thousands, 156, 'hourly high annualized');
}

// Fixture 13: numeric-only non-compensation should not parse
{
  const txt = `We serve 100,000 users and process 120,000 events per second.`;
  const s = extractSignals(txt);
  console.log('Fixture 13: numeric-only non-compensation');
  assertEq(s.comp_low_thousands, null, 'numeric-only prose is not compensation');
}

// Fixture 14: YoE 3/4/>5 details
{
  console.log('Fixture 14: YoE ladder details');
  assertEq(extractSignals(`Requirements: 3 years of experience.`).yoe_required_min, 3, '3yr min parsed');
  assertEq(extractSignals(`Requirements: 4 years of experience.`).yoe_required_min, 4, '4yr min parsed');
  assertEq(extractSignals(`Requirements: 6+ years of experience.`).yoe_required_min, 6, '6+ min parsed');
}

// Fixture 15: company-history YoE is lower confidence
{
  const s = extractSignals(`Our leadership team has 10+ years of experience building startups.`);
  console.log('Fixture 15: company-history YoE');
  assertEq(s.yoe_required_min, 10, 'generic 10+ detected for review');
  assertEq(s.yoe_confidence, 'moderate', 'generic 10+ is not strong requirement evidence');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
