// scripts/lib/job-fit-rules.mjs
// Deterministic, auditable fit rules for the production-filter shadow phase.

import { sectionText } from "./jd-sections.mjs";

export const SHADOW_BANDS = { S: 34, A: 24, B: 14 };

const FAMILY_BASE = {
  SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE: 12,
  AI_ENGINEERING: 10,
  AI_PROGRAM_OPS: 8,
  PRODUCT_AI: 8,
  AI_EVAL: 7,
  CONSULTING_ADVISORY: 8,
  CREATIVE_AI: 5,
  GENERIC_ENGINEERING_REVIEW: 2,
  UNKNOWN: 0,
};

const AI_COMPANY_CATEGORY_RE = /\b(ai|ml|machine learning|foundation model|agents?|agentic|generative|data labeling|llm|robotics|video generation|voice|avatar|coding assistant)\b/i;
const AI_EVIDENCE_RE = /\b(ai|artificial intelligence|ml|machine learning|llm|large language model|generative|genai|gen ai|agentic|agent|rag|retrieval augmented|embedding|vector|rlhf|model evaluation|model training|fine[-\s]?tuning|inference|diffusion|computer vision|multimodal)\b/i;
const TECH_EVIDENCE_RE = /\b(python|typescript|react|node|api|backend|frontend|full[-\s]?stack|platform|infrastructure|distributed systems|cloud|aws|gcp|azure|pytorch|tensorflow|kubernetes|data pipeline)\b/i;
const REMOTE_WORK_RE = /\b(fully remote|100%\s*remote|remote[-\s]?first|remote work|work remotely|remote role|remote position|remote within|remote from|remote candidates? (?:considered|eligible)|remote\s*[-,]?\s*\(?(?:us|u\.s\.|usa|united states|canada|north america|worldwide|uk|united kingdom)\)?|remote\s+(?:los angeles|san francisco|new york|seattle|austin|boston|denver|chicago)|(?:us|u\.s\.|usa|united states|washington,?\s*d\.?c\.?|canada|uk|united kingdom)\s*\(remote\)|(?:us|u\.s\.|usa|united states|canada|uk|united kingdom)[,\s-]+remote|distributed team)/i;
const SIMPLE_REMOTE_LOCATION_RE = /(?:^|\n|\||•|-)\s*(?:location\s*:?\s*)?(?:remote|(?:us|u\.s\.|usa|united states|canada|uk|united kingdom)[,\s-]+remote)(?:\s*[-,]?\s*\(?(?:us|u\.s\.|usa|united states|canada|north america|worldwide|uk|united kingdom)\)?)?\b/i;
const FAKE_REMOTE_RE = /\b(remote control|remote sensing|remote procedure|remote desktop|remote cloud|remote storage|remote access protocol|remote hiring process|remote interview|remote interviews|remote process|remote assessment)\b/i;
const HYBRID_RE = /\bhybrid\b(?!\s+(?:cloud|mesh|fabric|architecture|infrastructure|storage))/i;
const ONSITE_RE = /\b(on[-\s]?site|onsite|in[-\s]?office(?!\s+(?:lunch|lunches|snack|snacks|meal|meals|perk|perks|event|events))|office[-\s]?based|office required|work from (?:our|the) office|come into (?:our|the) office)\b/i;
const TORONTO_RE = /\b(toronto|gta|greater toronto area)\b/i;
const US_RE = /\b(united states|u\.s\.|usa|us-based|new york|san francisco|bay area|california|seattle|austin|boston|washington(?:,\s*d\.?c\.?)?|district of columbia|denver|los angeles|chicago|texas|redwood city|hawthorne|menlo park|mountain view|palo alto)\b/i;
const NON_TORONTO_CANADA_RE = /\b(vancouver|montreal|calgary|ottawa|waterloo|quebec|british columbia|alberta|london,?\s*(?:uk|united kingdom)?|united kingdom|paris|france|berlin|germany)\b/i;
const HIGH_INTENT_TITLE_RE = /\b(ai|artificial intelligence|ml|machine learning|agentic|agent|genai|gen ai|generative ai|llm|rag|forward deployed|solutions? architect|deployment strategist|product builder)\b/i;

export function normalizeTitle(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchSafePhrase(text, phrase) {
  const t = normalizeTitle(text);
  const p = normalizeTitle(phrase);
  if (!t || !p) return false;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i").test(t);
}

function textFrom({ title = "", textSections = [], signals = {} } = {}) {
  const sectionBody = Array.isArray(textSections)
    ? textSections.map((s) => s.text || "").join("\n")
    : String(textSections || "");
  const signalBits = [
    ...(signals.location_match || []),
    ...(signals.location_raw || []),
    ...(signals.track_keywords_matched || []),
    ...(signals.tech_stack_matched || []),
  ].join("\n");
  return `${title}\n${sectionBody}\n${signalBits}`;
}

function snippetFor(re, text) {
  const m = re.exec(text);
  if (!m) return "";
  const start = Math.max(0, m.index - 80);
  const end = Math.min(text.length, m.index + 180);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function hasGenuineRemoteWork(text) {
  for (const re of [REMOTE_WORK_RE, SIMPLE_REMOTE_LOCATION_RE]) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (!m) continue;
    const start = Math.max(0, m.index - 60);
    const end = Math.min(text.length, m.index + m[0].length + 80);
    const snippet = text.slice(start, end);
    if (!FAKE_REMOTE_RE.test(snippet)) return true;
  }
  return false;
}

function companyAiNative(companyMeta = {}) {
  return AI_COMPANY_CATEGORY_RE.test(`${companyMeta.category || ""} ${companyMeta.name || ""} ${companyMeta.company || ""}`);
}

function collectEvidence(patterns, text, value, label) {
  const hits = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (!m) continue;
    hits.push({ label, value, evidence: snippetFor(re, text) || m[0] });
  }
  return hits;
}

// V6 (policy 2): boilerplate OTE-disclosure phrasing. When sales_compensation
// only matches via this disclosure language, it gets a reduced effective
// weight and cannot combine with one moderate signal to clear the threshold.
// Apostrophes in cached JD text vary (straight ' vs curly ’), so accept both.
const SALES_COMP_BOILERPLATE_RE = /(?:for sales roles[\s\S]{0,40}range provided[\s\S]{0,80}on[-\s]?target earnings|OTE Range\s*\(Select Locations\))/i;

// V6 (policy 2): SA/FDE-family titles that get the loosened sales threshold.
// Matches "Solutions Architect", "AI Strategist", "Forward Deployed Engineer",
// "Applied AI Architect", etc. Family check + this title gate together qualify
// the row for the higher (>=5) threshold and the sales_compensation-alone block.
const SAFDE_AI_TITLE_TOKEN_RE = /\b(AI|ML|FDE|Solutions|Architect|Applied|Forward Deployed|Strategist)\b/i;

export function classifySalesRole({ title = "", textSections = [], signals = {}, primary_family = "" } = {}) {
  const nt = normalizeTitle(title);
  const fullText = textFrom({ title, textSections, signals }).replace(/https?:\/\/\S+/gi, " ");
  const responsibilities = sectionText(textSections, ["responsibilities", "requirements"]).replace(/https?:\/\/\S+/gi, " ");
  // V7-A5: Technical Account Manager (TAM) is a kept role at title level
  // regardless of sales-context tokens in the JD. Sales evidence still scores
  // at the content path below — this carve-out only suppresses the title regex.
  // Without this, V7-A1's broadened regex (which adds bare 'account manager')
  // matches "Account Manager" inside "Technical Account Manager".
  const isTechnicalAccountManager = /\btechnical account manager\b/i.test(nt);
  if (isTechnicalAccountManager && !/\b(quota|sales|revenue|prospecting|closing|pipeline)\b/i.test(fullText)) {
    return { hard_drop: false, reason: null, confidence: "none", evidence: "" };
  }
  // V7-A1: broadened sales title regex. Adds Account Manager / AM, Inside/Outside/Enterprise/Territory Sales,
  // BDR/SDR with full-form, and a Pre-Sales family pattern that catches no-hyphen and space-only variants
  // plus Specialist / Technical / Systems / Senior / Associate / Principal modifiers.
  // Matches Round 3 §3-(a) proposal at docs/audits/2026-05-05-round3-comparison-findings.md:149.
  // V8-A2: extended with director-level sales titles (Account Director, Sales
  // Director, Director of Sales, Director, Sales) plus Regional Sales <noun>.
  // Most director-level titles already drop via classifyLevel `senior_title`;
  // this rule REPLACES the drop reason for those rows with the more specific
  // `sales_role_title` and adds the genuinely-new Regional Sales Manager case.
  const hardSalesTitleRe = /\b(account executive|ae[\s,]|account manager|am[\s,]|business development representative|bdr|sales development representative|sdr|inside sales|outside sales|enterprise sales|territory sales|pre[-\s]?sales\b\s+(?:solutions?|technical|systems?|principal|senior|junior|associate)?\s*(?:engineer|architect|consultant|specialist)\b|sales engineer|account director|sales director|director,?\s+sales|director\s+of\s+sales|regional sales(?:\s+(?:manager|director|representative|specialist))?)\b/i;
  if (hardSalesTitleRe.test(nt) && !isTechnicalAccountManager) {
    return {
      hard_drop: true,
      reason: "sales_role_title",
      confidence: "strong",
      evidence: snippetFor(hardSalesTitleRe, title) || title,
    };
  }
  // V8-A3: Customer Success Manager / Director / Lead / Head and Renewals
  // {Manager,Specialist,Director} are sales work by default UNLESS the title
  // also contains an AI / Engineer / Architect / Solutions / Forward Deployed /
  // Technical / Implementation / Onboarding token (carve-out for AI hybrid roles).
  // Note: `Customer Success Engineer` does NOT drop on this rule — the regex
  // requires Manager/Director/Lead/Head as the noun, so Engineer falls through.
  // That's a regex-shape consequence, not an explicit Engineer carve-out.
  const csmRe = /\b(customer success\s+(?:manager|director|lead|head)|renewals?\s+(?:manager|specialist|director))\b/i;
  const csmCarveOutRe = /\b(ai|ml|engineer|engineering|architect|solutions|forward deployed|technical|implementation|onboarding)\b/i;
  if (csmRe.test(nt) && !csmCarveOutRe.test(nt)) {
    return {
      hard_drop: true,
      reason: "sales_role_title",
      confidence: "strong",
      evidence: snippetFor(csmRe, title) || title,
    };
  }

  const body = responsibilities || fullText;
  const rawEvidence = [
    ...collectEvidence([/\bdepartment\b[\s\S]{0,90}\b(?:sales engineering|sales|revenue)\b/i, /\bdepartment\b[\s\S]{0,90}(?:SalesEngineering|SalesSalesEngineering|MarketSales)/i, /SalesSales\s+Engineering/i, /\b(?:^|\n|\||\/)\s*(?:sales engineering|sales)\s*(?:\n|\||\/|$)/i], fullText, 4, "sales_department"),
    ...collectEvidence([/\b(ote|on[-\s]?target earnings|commission|variable compensation)\b/i], fullText, 3, "sales_compensation"),
    ...collectEvidence([/\b(carry quota|quota[-\s]?carrying|quota|revenue target|bookings target|pipeline generation|prospecting|close deals|closing deals)\b/i], body, 4, "quota_closing"),
    ...collectEvidence([/\b(pre[-\s]?sales|sales process|sales cycle|technical win|sales motion)\b/i], body, 2, "sales_process"),
    ...collectEvidence([/\b(account executives?|AEs|sales directors?|sales team|go[-\s]?to[-\s]?market sales|gtm sales)\b/i], body, 2, "sales_counterpart"),
    // V7-A2: replace bare "territory" (false-positive on country dropdowns like
    // "British Indian Ocean Territory") with the literal "sales territory".
    // This does NOT flip Anthropic India/Japan rows; per Round 3 §3-(c) they
    // still drop at AI_ENGINEERING threshold 4. Territory drops are V7-A3's job.
    ...collectEvidence([/\b(book of business|renewals?|expansion opportunities|land and expand|sales territory|account ownership)\b/i], body, 1, "commercial_ownership"),
  ];

  // V6 (policy 2 §1b): tag sales_compensation hits as boilerplate when the
  // ONLY phrasing in the JD is the OTE-disclosure language (no real comp content
  // such as "OTE $X-$Y" or "commission eligible"). Boilerplate-only contributions
  // count as 2 instead of 3.
  const hasBoilerplateOteDisclosure = SALES_COMP_BOILERPLATE_RE.test(fullText);
  const hasNonBoilerplateSalesComp = /\b(on[-\s]?target earnings\s*\$|ote\s*\$|ote\s*[-–—]|commission eligible|variable compensation|sales commission|sales bonus(?!es target))\b/i.test(fullText);
  const evidence = rawEvidence.map((item) => {
    if (item.label === "sales_compensation" && hasBoilerplateOteDisclosure && !hasNonBoilerplateSalesComp) {
      return { ...item, value: 2, boilerplate: true };
    }
    return item;
  });

  // V6 (policy 2 §1c): sales_department alone (no corroborating sales_process /
  // sales_counterpart / quota_closing) contributes 2 instead of 4.
  // Aggregate per-label first (multiple regexes can match the same fact, e.g.,
  // "Department\nSales Engineering" hits two sales_department patterns; we
  // count the strongest single contribution per label, not per-regex hits).
  const corroboratorLabels = new Set(["sales_process", "sales_counterpart", "quota_closing"]);
  const hasCorroborator = evidence.some((item) => corroboratorLabels.has(item.label));
  const perLabelValue = new Map();
  for (const item of evidence) {
    const prev = perLabelValue.get(item.label) ?? 0;
    if (item.value > prev) perLabelValue.set(item.label, item.value);
  }
  let total = 0;
  for (const [label, value] of perLabelValue.entries()) {
    if (label === "sales_department" && !hasCorroborator) {
      total += 2;
    } else {
      total += value;
    }
  }
  const labels = new Set(evidence.map((item) => item.label));
  const weakPartnerOnly = /\b(partner with sales|support sales|work with sales|collaborate with sales|align with sales)\b/i;
  const hasOnlyWeakSalesText = total === 0 && weakPartnerOnly.test(fullText);

  // V6 (policy 2 §1a): SA/FDE family + AI/Solutions title token => threshold 5
  // (otherwise 4). Also require at least one signal beyond sales_compensation
  // (i.e. sales_compensation alone never fires the hard-drop for SA/FDE).
  const isSafdeFamily = primary_family === "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE" && SAFDE_AI_TITLE_TOKEN_RE.test(title);
  const threshold = isSafdeFamily ? 5 : 4;
  const corroborationLabels = labels.size > 0 && !(labels.size === 1 && labels.has("sales_compensation"));
  const safdeBlocksOnSalesCompAlone = isSafdeFamily && !corroborationLabels;

  if (!safdeBlocksOnSalesCompAlone && (total >= threshold || (total >= 3 && !isSafdeFamily && labels.has("sales_department") && hasCorroborator))) {
    return {
      hard_drop: true,
      reason: "sales_role_content",
      confidence: "strong",
      evidence: evidence.map((item) => `${item.label}${item.boilerplate ? "(boilerplate)" : ""}: ${item.evidence}`).slice(0, 3).join(" | "),
    };
  }
  if (hasOnlyWeakSalesText) {
    return {
      hard_drop: false,
      reason: "sales_partner_context_only",
      confidence: "weak",
      evidence: snippetFor(weakPartnerOnly, fullText),
    };
  }
  return { hard_drop: false, reason: null, confidence: "none", evidence: "" };
}

// V7-A3 + V8-A1: territory detection. Returns NA / NON_NA / UNKNOWN with
// evidence and matched tokens.
//
// V8-A1 changes:
// - NON_NA token list expanded with 13 additional countries (vietnam,
//   philippines, thailand, indonesia, malaysia, pakistan, egypt, south africa,
//   qatar, bahrain, peru, chile, colombia) plus major non-NA cities so
//   "Location: London" / "based in our Singapore office" fire correctly.
// - `recognizedTypes` extended to include `location` so dedicated Location
//   sections feed the detector (was previously dead-text).
// - Role-anchor regex layer added: high-confidence patterns ("based in <X>",
//   "located in <X>", "Location: <X>", etc.) that tokenize captured strings
//   and count NA-anchor vs NON_NA-anchor evidence.
// - Body-tie rule (V7=UNKNOWN-on-tie) flipped to default-permissive NA when
//   NA-anchor count >= NON_NA-anchor count. Multi-region listings open to NA
//   ("Toronto, NYC, or London") thus return NA, not UNKNOWN.
//
// Token list policy (cleaned per docs/audits/2026-05-05-v7-plan-review.md §V7-A3):
// - Multi-word region terms preferred over short codes.
// - 2-letter codes (us / eu / uk) require parenthesis or comma/dash/space delimiters.
// - Country names included; nationality adjectives EXCLUDED (collide with
//   "British Indian Ocean Territory", language proficiency mentions, etc.).
// - mexico is NON_NA only (culturally/economically grouped with LATAM).
//
// Detection precedence:
//   1. Title check first (strongest signal — explicit territory tag).
//   2. Section-targeted body check (responsibilities/requirements/location).
//   3. Role-anchor pattern layer over the same recognized sections.
//   4. UNKNOWN if no tokens matched OR no recognized sections (no whole-body scan).

const NA_MULTI_RE = /\b(north america|americas|naam|united states|usa|u\.s\.|u\.s\.a|america|canada|canadian)\b/i;
const NA_CITIES_RE = /\b(toronto|gta|greater toronto|montreal|vancouver|calgary|ottawa|new york|new york city|nyc|nyc metro|sfo|lax|san francisco|bay area|los angeles|seattle|austin|boston|denver|chicago|washington d\.?c\.?|atlanta|dallas|miami|portland|philadelphia|minneapolis|houston|raleigh|durham|phoenix|san diego|menlo park|mountain view|palo alto|redwood city|hawthorne|sunnyvale|san jose|brooklyn|cambridge|waterloo)\b/i;
// Require parens or symmetric dash/comma delimiters around bare "us". A trailing
// space alone (e.g. "us about", "join us today", "tell us") would false-positive
// — see docs/audits/2026-05-05-v7-plan-review.md §V7-A3.
const NA_DELIMITED_US_RE = /(?:\(us\)|[,\-]\s*us\s*[,\-]|[,\-]\s*us\s*\)|\(\s*us\s*[,\-])/i;
// V9-1: bare US-city abbrevs (SF, NY, LA, DC) with strict delimiter guards.
// These are case-sensitive in spirit but the engine runs case-insensitive on
// recognized-section bodies; lowercase-prose risk ("la carte", "DC current",
// "in la mañana") is mitigated by requiring symmetric punctuation context
// (parens, comma-list, brackets, dash-delimited). This mirrors the discipline
// used by NA_DELIMITED_US_RE for bare "us". Word "satisfaction" / "salesforce"
// are unaffected — `\bSF\b` won't match internal "SF". Source: Round 5
// findings (Vercel Pricing PM, Vercel SE AI SDK, XBOW SE AI Systems).
const NA_DELIMITED_CITY_ABBREV_RE = /(?:\((?:sf|ny|la|dc)\)|\((?:sf|ny|la|dc)[,\s]|[,\s]\s*(?:sf|ny|la|dc)\s*[,\)]|[,\-]\s*(?:sf|ny|la|dc)\s*[,\-]|\[(?:sf|ny|la|dc)\])/i;
// V9-1: US coast descriptors. Multi-word phrases — word-boundary matching is
// safe (no lowercase-prose collision risk on "east coast" / "west coast").
const NA_COAST_RE = /\b(?:(?:the\s+|us\s+|u\.?s\.?\s+)?(?:east|west)\s+coast|coastal\s+us)\b/i;

// V8-A1: expanded NON_NA list. Adds 13 country names plus major non-NA cities.
const NON_NA_MULTI_RE = /\b(emea|europe|european|european union|dach|iberia|nordics|mena|apac|asia[-\s]?pacific|asia|southeast asia|india|japan|korea|china|singapore|hong kong|taiwan|australia|new zealand|africa|middle east|gulf|latam|latin america|lac|cala|brazil|argentina|anz|gcc|mexico|vietnam|philippines|thailand|indonesia|malaysia|pakistan|egypt|south africa|qatar|bahrain|peru|chile|colombia|united kingdom|germany|france|spain|italy|netherlands|portugal|ireland|sweden|norway|denmark|finland|poland|israel|uae|saudi arabia)\b/i;
const NON_NA_CITIES_RE = /\b(london|paris|berlin|munich|madrid|barcelona|dublin|amsterdam|tel aviv|sydney|melbourne|tokyo|osaka|seoul|beijing|shanghai|bangalore|mumbai|delhi|lisbon)\b/i;
// Same delimiter discipline as NA_DELIMITED_US_RE — require parens or symmetric
// dash/comma delimiters. Bare " eu " or " uk " would false-positive on
// "EU GDPR", "UK-based", URL fragments.
const NON_NA_DELIMITED_EU_RE = /(?:\(eu\)|[,\-]\s*eu\s*[,\-]|[,\-]\s*eu\s*\)|\(\s*eu\s*[,\-])/i;
const NON_NA_DELIMITED_UK_RE = /(?:\(uk\)|[,\-]\s*uk\s*[,\-]|[,\-]\s*uk\s*\)|\(\s*uk\s*[,\-])/i;

// V8-A1: role-anchor patterns. Each captures a region string from prose like
// "based in our Singapore office" / "Location: London" / "open to candidates in
// Toronto, NYC, or London". The captured group is tokenized and each token is
// classified NA / NON_NA / neither. Each tokenized hit counts as one anchor.
//
// V9-2 additions: markdown `## Location` block matcher (multi-line capture
// until the next `##` heading or a blank line) and role-base "offices" pattern
// (explicit role-attribution to an office list — distinguished from
// company-context "we have offices in {list}" which is NOT a role anchor).
// Source: Round 5 findings (Cohere FDE Infrastructure Specialist —
// `## Location\nJapan; Korea; Singapore`).
const ROLE_ANCHOR_PATTERNS = [
  /\bbased\s+(?:in|out\s+of)\s+(?:our|the)?\s*([\w\s,]{3,40}?)(?:\.|,|;|\n|$)/gi,
  /\b([\w\s]{3,30}?)[-\s]based\s+(?:role|position|opportunity|engineer|architect)\b/gi,
  /\blocated\s+in\s+(?:the\s+)?([\w\s,]{3,40}?)(?:\.|,|;|\n|$)/gi,
  /\boffice:?\s+([\w\s,]{3,30}?)(?:\.|,|;|\n|$)/gi,
  /\bheadquarters?\s+in\s+([\w\s,]{3,40}?)(?:\.|,|;|\n|$)/gi,
  /\bworking\s+from\s+(?:our\s+)?([\w\s,]{3,30}?)\s+office\b/gi,
  /\bopen\s+to\s+candidates?\s+in\s+([\w\s,]{3,80}?)(?:\.|;|\n|$)/gi,
  /\blocation:?\s+([\w\s,]{3,40}?)(?:\.|\n|$)/gi,
  // Section header line patterns (for `location` section type):
  /^\s*location:?\s+([\w\s,]{3,40})\s*$/gim,
  /^\s*office:?\s+([\w\s,]{3,40})\s*$/gim,
  // V9-2: markdown `## Location` block — captures content following the
  // heading until the next `##` heading, blank line, or end. Multi-line.
  /^#{1,3}\s*Location\s*\n+([\s\S]{1,200}?)(?=\n#{1,3}\s|\n\s*\n|$)/gim,
  // V9-2: role-base "offices in {list}" — explicit role-attribution. The
  // company-context shape "we have offices in {list}" is INTENTIONALLY NOT
  // matched here (negative test: F-V9-NEG-1 in test-job-fit-rules.mjs).
  /\b(?:this\s+role|the\s+role|position|opportunity|candidate)\s+(?:can\s+(?:be\s+)?(?:performed|located|done|worked)\s+from|will\s+(?:be\s+)?based\s+(?:in|at)|is\s+based\s+(?:in|at|out\s+of))\s+(?:any\s+of\s+)?(?:our\s+)?(?:offices?\s+(?:in|at)\s+)?([\w\s,]{3,80}?)(?:\.|;|$)/gi,
];

function tokensMatching(re, text, label) {
  const hits = [];
  re.lastIndex = 0;
  // Non-global patterns: use exec once for first hit; build a global variant via flags
  const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m;
  while ((m = globalRe.exec(text)) !== null) {
    const start = Math.max(0, m.index - 30);
    const end = Math.min(text.length, m.index + m[0].length + 20);
    hits.push({ token: m[0], snippet: text.slice(start, end).replace(/\s+/g, " ").trim(), label });
    if (m.index === globalRe.lastIndex) globalRe.lastIndex++;
  }
  return hits;
}

// V8-A1: classify a captured anchor string by tokenizing and counting NA vs
// NON_NA token hits. Returns {naCount, nonNaCount, naTokens, nonNaTokens}.
// Splits on commas, slashes, "or", "and", " - " so "Toronto, NYC, or London"
// becomes three tokens.
function classifyAnchorCapture(captured) {
  const text = String(captured || "");
  if (!text.trim()) return { naCount: 0, nonNaCount: 0, naTokens: [], nonNaTokens: [] };
  // Tokenize on common region-list separators.
  // V9: also split on newlines so markdown `## Location` block content
  // (`Japan\nKorea\nSingapore`) tokenizes correctly. Existing semicolon path
  // (`Japan; Korea; Singapore`) is unaffected.
  const tokens = text
    .split(/[,/;\n]|\s+\bor\b\s+|\s+\band\b\s+|\s-\s/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const naTokens = [];
  const nonNaTokens = [];
  for (const tok of tokens) {
    const padded = ` ${tok} `;
    // V9-1: NA_DELIMITED_CITY_ABBREV_RE and NA_COAST_RE added alongside
    // existing NA tokenizers. Padded context preserves delimiter guards.
    if (NA_MULTI_RE.test(padded) || NA_CITIES_RE.test(padded) ||
        NA_DELIMITED_US_RE.test(padded) || NA_DELIMITED_CITY_ABBREV_RE.test(padded) ||
        NA_COAST_RE.test(padded)) {
      naTokens.push(tok);
      continue;
    }
    if (NON_NA_MULTI_RE.test(padded) || NON_NA_CITIES_RE.test(padded) ||
        NON_NA_DELIMITED_EU_RE.test(padded) || NON_NA_DELIMITED_UK_RE.test(padded)) {
      nonNaTokens.push(tok);
      continue;
    }
  }
  return { naCount: naTokens.length, nonNaCount: nonNaTokens.length, naTokens, nonNaTokens };
}

// V10-1: count NA / NON_NA tokens in a raw section body using the same
// body-level regexes that drive `detectTerritory`'s section-token scan. Used
// to gate the V9-2 implicit location-section anchor: when an NA token is
// present in the same body and NON_NA does not strictly dominate, the
// implicit NON_NA anchor must NOT fire (otherwise multi-region roles that
// explicitly include NA bases — e.g. `Remote, EMEA; Remote, US-Southeast` or
// `San Francisco; Brazil; France; India; New York` — get wrongly hard-dropped
// on `non_na_territory`). Round 6 verification surfaced 2 confirmed FPs of
// this shape.
function countBodyRegionTokens(body) {
  const text = String(body || "");
  const naRegexes = [NA_MULTI_RE, NA_CITIES_RE, NA_DELIMITED_US_RE, NA_DELIMITED_CITY_ABBREV_RE, NA_COAST_RE];
  const nonNaRegexes = [NON_NA_MULTI_RE, NON_NA_CITIES_RE, NON_NA_DELIMITED_EU_RE, NON_NA_DELIMITED_UK_RE];
  let naCount = 0;
  let nonNaCount = 0;
  for (const re of naRegexes) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while (g.exec(text) !== null) naCount++;
  }
  for (const re of nonNaRegexes) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while (g.exec(text) !== null) nonNaCount++;
  }
  return { naCount, nonNaCount };
}

// V8-A1: scan recognized-section text with role-anchor patterns; return
// {naAnchors, nonNaAnchors, naEvidence, nonNaEvidence}.
//
// V9-2: when section list is provided, ALSO treat each `location`-type section
// body (≤120 chars, simple region-list shape) as an implicit anchor capture.
// Rationale: parseJdSections already strips the `## Location` markdown heading
// before reaching this function; by the time the body lands in `sectionBody`,
// the textual cue is gone. The section *type* alone (`location`) is a strong
// role-base signal — Cohere FDE Infrastructure Specialist's
// `## Location\nJapan; Korea; Singapore` block is a canonical example.
//
// V10-1: gate the implicit location-section NON_NA anchor symmetrically with
// V9-1's body-tie default-permissive logic. The implicit anchor fires only
// when EITHER (a) the section body has zero NA tokens (NA-absence — pure
// NON_NA listing) OR (b) NON_NA tokens strictly dominate (`> 2× NA`). When
// the gate fails (NA tokens present and NON_NA not strictly dominant), the
// implicit anchor is SUPPRESSED for that section (no NA or NON_NA anchor
// promotion). The downstream anchor-disambiguation then sees no implicit
// anchor from this section; if no other anchor fires the body-tie default
// resolves to UNKNOWN (no hard-drop on `non_na_territory`), matching the
// role-base intent of multi-region listings that explicitly include NA bases.
//
// Note: NA-promotion was considered to land the gated case as `region: NA`
// rather than `region: UNKNOWN`, but it would clobber multi-section JD shapes
// like Cohere FDE Infrastructure Specialist where the same JD has BOTH a
// canonical NON_NA-only section (`## Location\nJapan; Korea; Singapore`) AND
// a company-context offices line (`🏙 Remote-flexible, offices in Toronto,
// New York, San Francisco, London and Paris`). Suppression-only preserves
// Cohere's NON_NA outcome (JKS section still fires NON_NA anchors uncontested
// while the offices line is now suppressed). Round 6 §V10 — closes 2
// confirmed V9-2 FPs (GitLab Engineering Manager Workflow Catalog with
// `Remote, EMEA; Remote, US-Southeast`; ElevenLabs Forward Deployed Engineer
// with `San Francisco; Brazil; France; India; New York`).
function scanRoleAnchors(sectionBody, sections = []) {
  let naAnchors = 0;
  let nonNaAnchors = 0;
  const naEvidence = [];
  const nonNaEvidence = [];

  // V9-2 + V10-1: implicit anchors from short `location`-typed section bodies.
  // Cap at 120 chars to avoid mistaking a long mixed-content block (e.g.
  // company-context "🏙 Remote-flexible, offices in Toronto, New York, San
  // Francisco, London and Paris...") for a role-base anchor.
  for (const s of Array.isArray(sections) ? sections : []) {
    if (!s || s.type !== "location") continue;
    const body = String(s.text || "").trim();
    if (!body || body.length > 120) continue;
    // V10-1 gate: count body-level NA/NON_NA tokens and decide whether the
    // implicit anchor is safe to fire. NA-absence OR NON_NA strict majority
    // (>2× NA) → fire as V9-2. Else → suppress entirely (no anchor promotion
    // from this section).
    const bodyTokens = countBodyRegionTokens(body);
    const naAbsence = bodyTokens.naCount === 0 && bodyTokens.nonNaCount > 0;
    const nonNaStrictMajority = bodyTokens.nonNaCount > 2 * bodyTokens.naCount;
    if (!(naAbsence || nonNaStrictMajority)) continue;
    const cls = classifyAnchorCapture(body);
    naAnchors += cls.naCount;
    nonNaAnchors += cls.nonNaCount;
    for (const tok of cls.naTokens) naEvidence.push(`anchor:NA ${tok}: location-section: ${body.slice(0, 100)}`);
    for (const tok of cls.nonNaTokens) nonNaEvidence.push(`anchor:NON_NA ${tok}: location-section: ${body.slice(0, 100)}`);
  }

  for (const re of ROLE_ANCHOR_PATTERNS) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = globalRe.exec(sectionBody)) !== null) {
      const captured = m[1] || "";
      const cls = classifyAnchorCapture(captured);
      naAnchors += cls.naCount;
      nonNaAnchors += cls.nonNaCount;
      for (const tok of cls.naTokens) naEvidence.push(`anchor:NA ${tok}: ${m[0].trim().slice(0, 120)}`);
      for (const tok of cls.nonNaTokens) nonNaEvidence.push(`anchor:NON_NA ${tok}: ${m[0].trim().slice(0, 120)}`);
      if (m.index === globalRe.lastIndex) globalRe.lastIndex++;
    }
  }
  return { naAnchors, nonNaAnchors, naEvidence, nonNaEvidence };
}

export function detectTerritory(title = "", textSections = []) {
  const titleStr = String(title || "");

  // 1. Title check first — strongest signal
  const titleNaMulti = tokensMatching(NA_MULTI_RE, titleStr, "title:NA");
  const titleNaCities = tokensMatching(NA_CITIES_RE, titleStr, "title:NA");
  const titleNaDelim = tokensMatching(NA_DELIMITED_US_RE, titleStr, "title:NA");
  // V9-1: bare US-city abbrevs (SF, NY, LA, DC) and coast descriptors.
  const titleNaCityAbbrev = tokensMatching(NA_DELIMITED_CITY_ABBREV_RE, titleStr, "title:NA");
  const titleNaCoast = tokensMatching(NA_COAST_RE, titleStr, "title:NA");
  const titleNonNaMulti = tokensMatching(NON_NA_MULTI_RE, titleStr, "title:NON_NA");
  const titleNonNaCities = tokensMatching(NON_NA_CITIES_RE, titleStr, "title:NON_NA");
  const titleNonNaEu = tokensMatching(NON_NA_DELIMITED_EU_RE, titleStr, "title:NON_NA");
  const titleNonNaUk = tokensMatching(NON_NA_DELIMITED_UK_RE, titleStr, "title:NON_NA");

  const titleNaTokens = [...titleNaMulti, ...titleNaCities, ...titleNaDelim, ...titleNaCityAbbrev, ...titleNaCoast];
  const titleNonNaTokens = [...titleNonNaMulti, ...titleNonNaCities, ...titleNonNaEu, ...titleNonNaUk];

  if (titleNaTokens.length || titleNonNaTokens.length) {
    if (titleNaTokens.length && !titleNonNaTokens.length) {
      return {
        region: "NA",
        evidence: titleNaTokens.map((h) => `${h.label} ${h.token}: ${h.snippet}`),
        tokens_matched: titleNaTokens.map((h) => h.token),
      };
    }
    if (titleNonNaTokens.length && !titleNaTokens.length) {
      return {
        region: "NON_NA",
        evidence: titleNonNaTokens.map((h) => `${h.label} ${h.token}: ${h.snippet}`),
        tokens_matched: titleNonNaTokens.map((h) => h.token),
      };
    }
    // Both present in title — title wins on whichever set has more tokens.
    // V8-A1: tie defaults to NA (default-permissive — multi-region titles
    // open to NA candidates are not drops).
    if (titleNonNaTokens.length > titleNaTokens.length) {
      return {
        region: "NON_NA",
        evidence: titleNonNaTokens.map((h) => `${h.label} ${h.token}: ${h.snippet}`),
        tokens_matched: titleNonNaTokens.map((h) => h.token),
      };
    }
    return {
      region: "NA",
      evidence: titleNaTokens.map((h) => `${h.label} ${h.token}: ${h.snippet}`),
      tokens_matched: titleNaTokens.map((h) => h.token),
    };
  }

  // 2. Section-targeted body check — ONLY recognized sections, never whole body.
  // Critical guard: country dropdown HTML appears outside section headers in many
  // Greenhouse pages. If parseJdSections returned no recognized sections,
  // default to UNKNOWN — never scan whole body.
  // V8-A1: recognizedTypes extended to include `location` so dedicated Location
  // section bodies (and SECTION_ALIASES-mapped "Where you'll work") are scanned.
  const sections = Array.isArray(textSections) ? textSections : [];
  const recognizedTypes = new Set(["responsibilities", "requirements", "location"]);
  const sectionBody = sections
    .filter((s) => s && recognizedTypes.has(s.type))
    .map((s) => s.text || "")
    .join("\n");
  if (!sectionBody.trim()) {
    return { region: "UNKNOWN", evidence: [], tokens_matched: [] };
  }

  const sectionNaMulti = tokensMatching(NA_MULTI_RE, sectionBody, "section:NA");
  const sectionNaCities = tokensMatching(NA_CITIES_RE, sectionBody, "section:NA");
  const sectionNaDelim = tokensMatching(NA_DELIMITED_US_RE, sectionBody, "section:NA");
  // V9-1: bare US-city abbrevs (SF, NY, LA, DC) and coast descriptors.
  const sectionNaCityAbbrev = tokensMatching(NA_DELIMITED_CITY_ABBREV_RE, sectionBody, "section:NA");
  const sectionNaCoast = tokensMatching(NA_COAST_RE, sectionBody, "section:NA");
  const sectionNonNaMulti = tokensMatching(NON_NA_MULTI_RE, sectionBody, "section:NON_NA");
  const sectionNonNaCities = tokensMatching(NON_NA_CITIES_RE, sectionBody, "section:NON_NA");
  const sectionNonNaEu = tokensMatching(NON_NA_DELIMITED_EU_RE, sectionBody, "section:NON_NA");
  const sectionNonNaUk = tokensMatching(NON_NA_DELIMITED_UK_RE, sectionBody, "section:NON_NA");

  const sectionNaTokens = [...sectionNaMulti, ...sectionNaCities, ...sectionNaDelim, ...sectionNaCityAbbrev, ...sectionNaCoast];
  const sectionNonNaTokens = [...sectionNonNaMulti, ...sectionNonNaCities, ...sectionNonNaEu, ...sectionNonNaUk];

  // V8-A1: role-anchor scan (additive — high-confidence shape evidence).
  // Anchor evidence drives V8's strict-NA behaviour:
  //  - When ANY anchor fires, anchor-count majority decides region (tie or NA-majority → NA;
  //    NON_NA-majority → NON_NA). Bare token mentions are still surfaced as evidence.
  //  - When NO anchor fires, fall back to V7 token-only logic (NA-only / NON_NA-only / tie => UNKNOWN).
  //    This preserves the V7 negative test "global team distributed across EMEA, APAC, Americas" → UNKNOWN.
  // V9-2: pass section list so location-typed section bodies serve as
  // implicit role anchors (markdown `## Location\nJapan; Korea; Singapore`).
  const recognizedSections = sections.filter((s) => s && recognizedTypes.has(s.type));
  const anchors = scanRoleAnchors(sectionBody, recognizedSections);
  const anchorAny = anchors.naAnchors > 0 || anchors.nonNaAnchors > 0;

  const totalNa = sectionNaTokens.length + anchors.naAnchors;
  const totalNonNa = sectionNonNaTokens.length + anchors.nonNaAnchors;

  if (!totalNa && !totalNonNa) {
    return { region: "UNKNOWN", evidence: [], tokens_matched: [] };
  }
  if (totalNonNa && !totalNa) {
    return {
      region: "NON_NA",
      evidence: [
        ...sectionNonNaTokens.slice(0, 3).map((h) => `${h.label} ${h.token}: ${h.snippet}`),
        ...anchors.nonNaEvidence.slice(0, 2),
      ],
      tokens_matched: sectionNonNaTokens.map((h) => h.token),
    };
  }
  if (totalNa && !totalNonNa) {
    return {
      region: "NA",
      evidence: [
        ...sectionNaTokens.slice(0, 3).map((h) => `${h.label} ${h.token}: ${h.snippet}`),
        ...anchors.naEvidence.slice(0, 2),
      ],
      tokens_matched: sectionNaTokens.map((h) => h.token),
    };
  }
  // Both present — disambiguate.
  const evidenceJoint = [
    ...sectionNaTokens.slice(0, 2).map((h) => `${h.label} ${h.token}: ${h.snippet}`),
    ...sectionNonNaTokens.slice(0, 2).map((h) => `${h.label} ${h.token}: ${h.snippet}`),
    ...anchors.naEvidence.slice(0, 2),
    ...anchors.nonNaEvidence.slice(0, 2),
  ];
  const tokensJoint = [
    ...sectionNaTokens.map((h) => h.token),
    ...sectionNonNaTokens.map((h) => h.token),
  ];
  if (anchorAny) {
    // V8-A1 disambiguation: count distinct anchor matches. NA-majority or tie → NA;
    // NON_NA-majority → NON_NA. Multi-region "Toronto, NYC, or London" open-to-candidates
    // listing tokenises to 2 NA + 1 NON_NA anchors → NA wins.
    if (anchors.nonNaAnchors > anchors.naAnchors) {
      return { region: "NON_NA", evidence: evidenceJoint, tokens_matched: tokensJoint };
    }
    return { region: "NA", evidence: evidenceJoint, tokens_matched: tokensJoint };
  }
  // No anchors fired — fall back to V7 token-only tie behaviour (UNKNOWN).
  // This preserves "global team distributed across EMEA, APAC, Americas" → UNKNOWN.
  return { region: "UNKNOWN", evidence: evidenceJoint, tokens_matched: tokensJoint };
}

export function classifyLevel({ title = "", textSections = [], signals = {} } = {}) {
  const nt = normalizeTitle(title);
  if (/\b(intern|internship)\b/i.test(nt)) {
    return { hard_drop: true, reason: "intern_title", score: 0, annotations: ["intern_title"], confidence: "strong" };
  }
  if (/\b(vp|vice president|director|head of|chief|cxo|principal|staff|lead)\b/i.test(nt)) {
    return { hard_drop: true, reason: "senior_title", score: 0, annotations: ["senior_title"], confidence: "strong" };
  }
  const annotations = [];
  let score = 0;
  if (/\bassociate\b/i.test(nt)) {
    annotations.push("associate_level");
    score -= 1;
  }
  return { hard_drop: false, reason: null, score, annotations, confidence: annotations.length ? "moderate" : "none" };
}

export function classifyRoleFamily({ title = "", textSections = [], signals = {}, companyMeta = {} } = {}) {
  const nt = normalizeTitle(title);
  const text = textFrom({ title, textSections, signals });
  const aiNative = companyAiNative(companyMeta);
  const hasAiEvidence = AI_EVIDENCE_RE.test(`${title}\n${text}`) || aiNative;
  const hasTechEvidence = TECH_EVIDENCE_RE.test(`${title}\n${text}`);
  const families = [];

  if (/\b(forward deployed|fde|deployment strategist|deployment engineer|solutions? architect|solutions? engineer|solution architect|customer engineer|implementation engineer|technical architect|ai strategist|solutions strategist)\b/i.test(nt)) {
    families.push({ family: "SOLUTIONS_DEPLOYMENT_ARCHITECT_FDE", confidence: "strong", reason: "solutions_deployment_title" });
  }
  if (/\b(ai|ml|machine learning|applied ai|agentic|agent|gen ai|genai|generative ai|llm|rag)\b/i.test(nt) && /\b(engineer|engineering|architect|developer|scientist|builder)\b/i.test(nt)) {
    families.push({ family: "AI_ENGINEERING", confidence: "strong", reason: "ai_engineering_title" });
  }
  if (/\b(full stack|fullstack|software engineer|platform engineer|product engineer|backend engineer|frontend engineer|agent tech engineer)\b/i.test(nt)) {
    if (hasAiEvidence && hasTechEvidence) {
      families.push({ family: "AI_ENGINEERING", confidence: "moderate", reason: "generic_engineering_with_ai_jd_evidence" });
    } else {
      families.push({ family: "GENERIC_ENGINEERING_REVIEW", confidence: "weak", reason: "generic_engineering_needs_ai_evidence" });
    }
  }
  if (/\b(technical program manager|program manager|product operations|ai programs?|programs? analyst|product manager|product builder|product strategy|product ops)\b/i.test(nt)) {
    if (hasAiEvidence || aiNative) {
      families.push({ family: "AI_PROGRAM_OPS", confidence: "moderate", reason: "ai_program_product_ops_guarded" });
    } else {
      families.push({ family: "PRODUCT_AI", confidence: "weak", reason: "program_product_needs_ai_evidence" });
    }
  }
  if (/\b(tutor|evaluator|evaluation|trainer|rlhf|human feedback|model evaluation|data annotation|labeling|labelling)\b/i.test(nt)) {
    families.push({ family: "AI_EVAL", confidence: "strong", reason: "ai_eval_title" });
  }
  if (/\b(creative|content|producer|designer|media|image|video|generative media)\b/i.test(nt)) {
    if (/\b(ai|generative|image|video|media|diffusion|genai|gen ai)\b/i.test(`${title}\n${text}`)) {
      families.push({ family: "CREATIVE_AI", confidence: "moderate", reason: "creative_ai_guarded" });
    } else {
      families.push({ family: "CREATIVE_AI", confidence: "weak", reason: "creative_needs_ai_generative_evidence" });
    }
  }
  if (/\b(consultant|specialist|advisor|advisory|strategist)\b/i.test(nt) && hasAiEvidence) {
    families.push({ family: "CONSULTING_ADVISORY", confidence: "moderate", reason: "consulting_advisory_ai_context" });
  }

  if (families.length === 0) {
    return { primary_family: "UNKNOWN", families: [], base_score: 0, confidence: "none", reason: "no_positive_family" };
  }

  families.sort((a, b) => (FAMILY_BASE[b.family] || 0) - (FAMILY_BASE[a.family] || 0));
  const primary = families[0];
  return {
    primary_family: primary.family,
    families,
    base_score: FAMILY_BASE[primary.family] || 0,
    confidence: primary.confidence,
    reason: primary.reason,
  };
}

export function classifyTitle({ title = "", companyMeta = {} } = {}) {
  const roleFamily = classifyRoleFamily({ title, companyMeta });
  const sales = classifySalesRole({ title, primary_family: roleFamily.primary_family });
  const level = classifyLevel({ title });
  return {
    title,
    hard_drop: Boolean(sales.hard_drop || level.hard_drop),
    hard_drop_reason: [sales.reason, level.reason].filter(Boolean).join("; "),
    primary_family: roleFamily.primary_family,
    families: roleFamily.families,
    confidence: roleFamily.confidence,
    reason: roleFamily.reason,
    annotations: level.annotations || [],
  };
}

function numberToThousands(raw, suffix) {
  let n = parseFloat(String(raw || "").replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  if (/k/i.test(suffix || "")) n *= 1000;
  if (n < 1000 && /k/i.test(suffix || "")) n *= 1000;
  if (n >= 1000) return Math.round(n / 1000);
  return n;
}

function inferCurrency(snippet, fallbackText = "") {
  if (/\b(CAD|CA\$|C\$|Canadian)\b/i.test(snippet)) return "CAD";
  if (/\b(USD|US\$|U\.S\.\s*dollars?|United States)\b/i.test(snippet)) return "USD";
  if (/\b(canada|toronto|ontario|vancouver|montreal)\b/i.test(snippet)) return "CAD";
  if (US_RE.test(snippet)) return "USD";
  // If the salary window itself has no region/currency but the whole JD is
  // clearly tied to a U.S. location, infer USD. Avoid CAD inference from broad
  // application form country lists or compliance boilerplate elsewhere.
  if (US_RE.test(fallbackText) && !/\b(canada|toronto|ontario|vancouver|montreal)\b/i.test(fallbackText.slice(0, 1200))) return "USD";
  return "unknown";
}

export function extractCompensationCandidates(text, sections = []) {
  const fullText = String(text || "");
  const anchorRe = /\b(compensation|salary range|base salary|base pay|annual salary|pay range|pay band|salary band|rate|hourly|estimated annual salary|the salary)\b/ig;
  const corpus = [];
  for (const s of sections || []) {
    if (s.type === "compensation") corpus.push({ source: "compensation", text: s.text || "" });
  }
  for (const m of fullText.matchAll(anchorRe)) {
    const start = Math.max(0, m.index - 80);
    const end = Math.min(fullText.length, m.index + 420);
    corpus.push({ source: "anchored_compensation_window", text: fullText.slice(start, end) });
  }
  // Strong explicit money fallback only. Do not scan arbitrary requirements,
  // location, URL, ARR, travel-percentage, or company-history ranges.
  const explicitMoney = /\$\s?\d[\d,]*(?:\.\d+)?\s*(?:[Kk])?\s*(?:\\?\s*[-–—]|\bto\b)\s*(?:USD|CAD|US\$|CA\$|C\$)?\s*\$?\s?\d[\d,]*(?:\.\d+)?\s*(?:[Kk])?\s*(?:USD|CAD)?/ig;
  for (const m of fullText.matchAll(explicitMoney)) {
    const start = Math.max(0, m.index - 120);
    const end = Math.min(fullText.length, m.index + 220);
    corpus.push({ source: "explicit_money_window", text: fullText.slice(start, end) });
  }
  const candidates = [];
  const rangeRe = /(?:(USD|CAD|US\$|CA\$|C\$)\s*)?(\$)?\s*(\d{2,3}(?:,\d{3})?(?:\.\d+)?|\d{2,3}(?:\.\d+)?)\s*([Kk])?\s*(?:\\?\s*[-–—]|\bto\b)\s*(?:(USD|CAD|US\$|CA\$|C\$)\s*)?(\$)?\s*(\d{2,3}(?:,\d{3})?(?:\.\d+)?|\d{2,3}(?:\.\d+)?)\s*([Kk])?\s*(USD|CAD)?\s*(?:\/\s?(hour|hr)|per hour|hourly|a year|per year|annually|salary|base)?/gi;
  const singleRe = /\b(?:salary|base pay|base salary|pay range|compensation|rate)\b[\s\S]{0,80}?(?:(USD|CAD|US\$|CA\$|C\$)\s*)?\$?\s*(\d{2,3}(?:,\d{3})?(?:\.\d+)?|\d{2,3}(?:\.\d+)?)\s*([Kk])?\s*(?:\/\s?(hour|hr)|per hour|hourly|a year|per year|annually)?/gi;

  for (const block of corpus) {
    for (const re of [rangeRe, singleRe]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(block.text)) !== null) {
        const isRange = re === rangeRe;
        if (!isRange && /(?:-|–|—|\bto\b)\s*(?:(?:USD|CAD|US\$|CA\$|C\$)\s*)?\$?\s*\d/i.test(block.text.slice(m.index + m[0].length, m.index + m[0].length + 20))) {
          continue;
        }
        const lowCurrency = isRange ? m[1] : m[1];
        const lowDollar = isRange ? m[2] : "";
        const lowRaw = isRange ? m[3] : m[2];
        const lowSuffix = isRange ? m[4] : m[3];
        const highCurrency = isRange ? m[5] : "";
        const highDollar = isRange ? m[6] : "";
        const highRaw = isRange ? m[7] : m[2];
        const highSuffix = isRange ? (m[8] || m[4]) : m[3];
        const trailingCurrency = isRange ? m[9] : "";
        const hasMoneyMarker = Boolean(lowCurrency || highCurrency || trailingCurrency || lowDollar || highDollar || lowSuffix || highSuffix);
        if (!hasMoneyMarker) continue;
        let low = numberToThousands(lowRaw, lowSuffix);
        let high = numberToThousands(highRaw, highSuffix);
        if (low == null || high == null) continue;
        if ((low < 1000 || high < 1000) && !/\b(hour|hr|hourly|per hour)\b/i.test(m[0])) {
          if (low < 1000) low *= 1000;
          if (high < 1000) high *= 1000;
          low = Math.round(low / 1000);
          high = Math.round(high / 1000);
        }
        if (low > high) [low, high] = [high, low];
        if (low < 10 || high > 10000) continue;
        const rateType = /\b(hour|hr|hourly|per hour)\b/i.test(m[0]) ? "hourly" : "annual";
        const snippet = block.text.slice(Math.max(0, m.index - 70), Math.min(block.text.length, m.index + m[0].length + 120)).replace(/\s+/g, " ");
        const currency = inferCurrency(`${lowCurrency || ""} ${highCurrency || ""} ${trailingCurrency || ""} ${snippet}`, text);
        const annualizedLow = rateType === "hourly" ? Math.round(low * 2080 / 1000) : low;
        const annualizedHigh = rateType === "hourly" ? Math.round(high * 2080 / 1000) : high;
        candidates.push({
          rate_type: rateType,
          low_thousands: low,
          high_thousands: high,
          annualized_low_thousands: annualizedLow,
          annualized_high_thousands: annualizedHigh,
          currency,
          is_range: isRange,
          source_section: block.source,
          confidence: block.source === "compensation" ? "strong" : "moderate",
          snippet,
        });
      }
    }
  }

  const seen = new Set();
  return candidates.filter((c) => {
    const key = [c.rate_type, c.low_thousands, c.high_thousands, c.currency, c.snippet.slice(0, 60)].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function decideCompensation(signals = {}, textSections = []) {
  const text = textFrom({ textSections, signals });
  const candidates = extractCompensationCandidates(text, textSections);
  if (signals.comp_high_thousands && signals.comp_currency && candidates.length === 0) {
    candidates.unshift({
      rate_type: "annual",
      low_thousands: signals.comp_low_thousands,
      high_thousands: signals.comp_high_thousands,
      annualized_low_thousands: signals.comp_low_thousands,
      annualized_high_thousands: signals.comp_high_thousands,
      currency: signals.comp_currency,
      source_section: "extracted_signals",
      confidence: "weak",
      snippet: "existing extracted_signals compensation",
    });
  }
  const reliableCandidates = candidates.filter((c) => c.currency === "CAD" || c.currency === "USD");
  const rankedCandidates = [...candidates].sort((a, b) => {
    const aAnnual = a.rate_type === "annual" ? 1 : 0;
    const bAnnual = b.rate_type === "annual" ? 1 : 0;
    const aKnown = a.currency === "CAD" || a.currency === "USD" ? 1 : 0;
    const bKnown = b.currency === "CAD" || b.currency === "USD" ? 1 : 0;
    const aRange = a.is_range ? 1 : 0;
    const bRange = b.is_range ? 1 : 0;
    return (
      bAnnual - aAnnual ||
      bKnown - aKnown ||
      bRange - aRange ||
      b.annualized_high_thousands - a.annualized_high_thousands ||
      b.annualized_low_thousands - a.annualized_low_thousands
    );
  });
  const passingFloor = reliableCandidates
    .filter((c) => c.annualized_high_thousands >= 120)
    .sort((a, b) => (
      (b.rate_type === "annual" ? 1 : 0) - (a.rate_type === "annual" ? 1 : 0) ||
      b.annualized_high_thousands - a.annualized_high_thousands
    ))[0];
  const annualBase = passingFloor || rankedCandidates[0];
  if (!annualBase) {
    return { hard_drop: false, reason: null, score: 0, annotations: ["comp_unknown"], candidate: null, candidates };
  }
  const reliableAnnualized = reliableCandidates.filter((c) => c.annualized_high_thousands > 0);
  const hardDropCandidate = reliableAnnualized
    .filter((c) => c.annualized_high_thousands < 120)
    .sort((a, b) => b.annualized_high_thousands - a.annualized_high_thousands)[0];
  if (reliableAnnualized.length > 0 && reliableAnnualized.every((c) => c.annualized_high_thousands < 120)) {
    return { hard_drop: true, reason: `comp_upper_below_120_${hardDropCandidate.currency}`, score: 0, annotations: [], candidate: hardDropCandidate, candidates };
  }
  const low = annualBase.annualized_low_thousands;
  let score = 0;
  const annotations = [];
  if (low >= 180) score = 5;
  else if (low >= 150) score = 3;
  else if (low >= 130) score = 2;
  else if (low >= 120) score = 1;
  else if (annualBase.annualized_high_thousands >= 120) {
    score = -2;
    annotations.push("comp_range_crosses_floor");
  }
  if (annualBase.rate_type === "hourly") annotations.push("hourly_annualized");
  if (annualBase.currency === "unknown") annotations.push("comp_currency_unknown");
  return { hard_drop: false, reason: null, score, annotations, candidate: annualBase, candidates };
}

export function decideYoe(signals = {}, textSections = []) {
  const text = textFrom({ textSections, signals });
  const requirements = sectionText(textSections, ["requirements", "responsibilities"]);
  const preferredText = requirements || text;
  const candidates = [];
  const ignoredContext = /\b(team|company|leadership|founders?|we|our)\s+(?:has|have|brings?|with)\b/i;
  const addCandidate = (m, minIndex, maxIndex = null) => {
    const snippet = m[0];
    if (maxIndex == null && /[-–—]\s*$/.test(preferredText.slice(Math.max(0, m.index - 3), m.index))) return;
    if (maxIndex == null && /\d+\s*[-–—]\s*\d+/.test(snippet)) return;
    if (ignoredContext.test(snippet)) return;
    const min = parseInt(m[minIndex], 10);
    const max = maxIndex && m[maxIndex] ? parseInt(m[maxIndex], 10) : null;
    if (!Number.isFinite(min)) return;
    candidates.push({ min, max, openEnded: /\+/.test(snippet), snippet });
  };
  const rangeRe = /\b(\d+)\s*(?:-|–|—|\bto\b)\s*(\d+)\+?\s*(?:years?|yrs?)\b[\s\S]{0,50}?\b(experience|exp)\b/gi;
  const singleRe = /\b(?:minimum|required|requires?|need|must have|you have|qualified candidates? have|looking for)?[\s\S]{0,35}?(\d+)\s*(\+)?\s*(?:years?|yrs?)\b[\s\S]{0,50}?\b(experience|exp)\b/gi;
  const yearsOfRe = /\b(\d+)\s*(\+)?\s*(?:years?|yrs?)\s+of\s+(?:prior\s+)?(?:post[-\s]?sales|backend|frontend|infrastructure|engineering|management|product|customer|technical|software|data|ml|ai)\b[\s\S]{0,80}/gi;
  let m;
  while ((m = rangeRe.exec(preferredText)) !== null) addCandidate(m, 1, 2);
  while ((m = singleRe.exec(preferredText)) !== null) addCandidate(m, 1);
  while ((m = yearsOfRe.exec(preferredText)) !== null) addCandidate(m, 1);
  if (candidates.length === 0 && preferredText !== text) {
    rangeRe.lastIndex = 0;
    singleRe.lastIndex = 0;
    yearsOfRe.lastIndex = 0;
    while ((m = rangeRe.exec(text)) !== null) addCandidate(m, 1, 2);
    while ((m = singleRe.exec(text)) !== null) addCandidate(m, 1);
    while ((m = yearsOfRe.exec(text)) !== null) addCandidate(m, 1);
  }
  if (candidates.length) {
    const hard = candidates.find((c) => c.min > 5);
    if (hard) return { hard_drop: true, reason: "yoe_required_gt_5", score: 0, years: hard.min, open_ended: hard.openEnded, annotations: [], evidence: hard.snippet };
    const best = candidates.sort((a, b) => a.min - b.min)[0];
    if (best.min <= 2) return { hard_drop: false, reason: null, score: 5, years: best.min, open_ended: best.openEnded, annotations: ["yoe_0_2"], evidence: best.snippet };
    if (best.min === 3) return { hard_drop: false, reason: null, score: 3, years: best.min, open_ended: best.openEnded, annotations: best.openEnded ? ["yoe_open_ended_review"] : [], evidence: best.snippet };
    if (best.min === 4) return { hard_drop: false, reason: null, score: -2, years: best.min, open_ended: best.openEnded, annotations: [], evidence: best.snippet };
    if (best.min === 5) return { hard_drop: false, reason: null, score: -6, years: best.min, open_ended: best.openEnded, annotations: best.openEnded ? ["yoe_5_plus_review"] : [], evidence: best.snippet };
  }
  if (signals.yoe_signal === "6+") return { hard_drop: true, reason: "yoe_required_gt_5", score: 0, years: 6, open_ended: true, annotations: [] };
  if (signals.yoe_signal === "0-2") return { hard_drop: false, reason: null, score: 5, years: 2, open_ended: false, annotations: ["yoe_0_2"] };
  return { hard_drop: false, reason: null, score: 0, years: null, open_ended: false, annotations: ["yoe_unknown"] };
}

export function decideLocation(signals = {}, textSections = [], title = "") {
  const text = textFrom({ title, textSections, signals });
  const locationLines = text
    .split(/\n/)
    .filter((line) => (
      /(location|remote|hybrid|on[-\s]?site|onsite|in[-\s]?office|office[-\s]?based|office required|Austin|New York|NYC|San Francisco|Bay Area|California|Seattle|Boston|Denver|Los Angeles|Chicago|Texas|London|Vancouver|Montreal|Calgary|Ottawa|Waterloo|Redwood City|Hawthorne|Menlo Park|Mountain View|Palo Alto)/i.test(line) &&
      (line.match(/\+\d{1,3}/g) || []).length < 4
    ))
    .join("\n");
  const locationText = `${locationLines}\n${sectionText(textSections, ["location"])}\n${(signals.location_raw || []).join("\n")}\n${(signals.location_match || []).join("\n")}\n${title}`;
  const hasRemote = hasGenuineRemoteWork(locationText);
  const hasHybrid = HYBRID_RE.test(locationText);
  const hasOnsite = ONSITE_RE.test(locationText);
  const hasToronto = TORONTO_RE.test(locationText);
  const hasNonToronto = US_RE.test(locationText) || NON_TORONTO_CANADA_RE.test(locationText);
  const remoteFirstCompanyOnly =
    /\bremote[-\s]?first company\b/i.test(locationText) &&
    !/\b(fully remote|100%\s*remote|remote role|remote position|remote within|remote from|remote,?\s*(?:hybrid|us|u\.s\.|united states|canada|north america|worldwide)|location\s*:?\s*remote)\b/i.test(locationText);
  const annotations = [];

  if (hasRemote && remoteFirstCompanyOnly && (hasHybrid || hasOnsite) && hasNonToronto) {
    return { hard_drop: true, reason: hasHybrid ? "hybrid_non_toronto_no_remote" : "onsite_non_toronto_no_remote", score: 0, annotations: [], confidence: "strong", evidence: snippetFor(hasHybrid ? HYBRID_RE : ONSITE_RE, locationText) || locationText.slice(0, 180) };
  }
  if (hasRemote && (hasHybrid || hasOnsite)) annotations.push("remote_mixed_with_hybrid_onsite");
  if (hasRemote) return { hard_drop: false, reason: null, score: hasHybrid || hasOnsite ? 2 : 3, annotations, confidence: "strong", evidence: snippetFor(REMOTE_WORK_RE, locationText) };
  if (hasToronto && (hasHybrid || hasOnsite)) return { hard_drop: false, reason: null, score: 2, annotations: ["toronto_hybrid_onsite"], confidence: "strong", evidence: snippetFor(TORONTO_RE, locationText) };
  if ((hasHybrid || hasOnsite) && hasNonToronto) {
    return { hard_drop: true, reason: hasHybrid ? "hybrid_non_toronto_no_remote" : "onsite_non_toronto_no_remote", score: 0, annotations: [], confidence: "strong", evidence: snippetFor(hasHybrid ? HYBRID_RE : ONSITE_RE, locationText) || locationText.slice(0, 180) };
  }
  if (hasNonToronto && !hasToronto) {
    return { hard_drop: true, reason: "specific_non_toronto_location_no_remote", score: 0, annotations: [], confidence: "moderate", evidence: snippetFor(US_RE, locationText) || snippetFor(NON_TORONTO_CANADA_RE, locationText) || locationText.slice(0, 180) };
  }
  if (hasHybrid || hasOnsite) {
    return { hard_drop: false, reason: null, score: 0, annotations: ["location_review_hybrid_onsite_without_clear_remote"], confidence: "moderate", evidence: snippetFor(hasHybrid ? HYBRID_RE : ONSITE_RE, locationText) };
  }
  return { hard_drop: false, reason: null, score: 0, annotations: ["location_unknown_or_unrestricted"], confidence: "none", evidence: "" };
}

export function scoreSemanticFit({ title = "", textSections = [], signals = {}, roleFamily } = {}) {
  const requirements = sectionText(textSections, ["requirements", "responsibilities"]);
  const whole = textFrom({ title, textSections, signals });
  const text = requirements || whole;
  const dimensions = [];
  let score = 0;

  const add = (name, value, evidence) => {
    score += value;
    dimensions.push({ name, value, evidence: String(evidence || "").replace(/\s+/g, " ").slice(0, 220) });
  };

  if (/\b(deploy|implementation|customer|client|solution|architect|workflow|integration|post[-\s]?deployment|forward deployed)\b/i.test(text)) add("deployment_customer_impact", 5, snippetFor(/\b(deploy|implementation|customer|client|solution|architect|workflow|integration|post[-\s]?deployment|forward deployed)\b/i, text));
  if (AI_EVIDENCE_RE.test(text)) add("ai_systems_evidence", 5, snippetFor(AI_EVIDENCE_RE, text));
  if (TECH_EVIDENCE_RE.test(text)) add("technical_builder_evidence", 4, snippetFor(TECH_EVIDENCE_RE, text));
  if (/\b(product|roadmap|program|operations|cross[-\s]?functional|stakeholder|launch|strategy)\b/i.test(text)) add("product_program_evidence", 3, snippetFor(/\b(product|roadmap|program|operations|cross[-\s]?functional|stakeholder|launch|strategy)\b/i, text));
  if (/\b(founder|startup|ambiguous|0 to 1|zero to one|scrappy|ownership)\b/i.test(text)) add("founder_operator_evidence", 2, snippetFor(/\b(founder|startup|ambiguous|0 to 1|zero to one|scrappy|ownership)\b/i, text));
  if (roleFamily?.primary_family === "CREATIVE_AI" && /\b(image|video|media|creative|content|generation|diffusion)\b/i.test(text)) add("creative_ai_evidence", 2, snippetFor(/\b(image|video|media|creative|content|generation|diffusion)\b/i, text));

  return {
    score,
    confidence: requirements ? "moderate" : (score > 0 ? "weak" : "insufficient"),
    dimensions,
  };
}

export function computeShadowBand(score) {
  if (score >= SHADOW_BANDS.S) return "S";
  if (score >= SHADOW_BANDS.A) return "A";
  if (score >= SHADOW_BANDS.B) return "B";
  return "C";
}

export function scoreJob({ job = {}, companyMeta = {}, signals = {}, textSections = [] } = {}) {
  const title = job.title || "";
  // Compute role family first so the sales classifier can apply
  // SA/FDE-family-specific thresholds (V6 policy 2).
  const roleFamily = classifyRoleFamily({ title, textSections, signals, companyMeta: { ...companyMeta, company: job.company } });
  const sales = classifySalesRole({ title, textSections, signals, primary_family: roleFamily.primary_family });
  const level = classifyLevel({ title, textSections, signals });
  const comp = decideCompensation(signals, textSections);
  const yoe = decideYoe(signals, textSections);
  const location = decideLocation(signals, textSections, title);
  const semantic = scoreSemanticFit({ title, textSections, signals, roleFamily });

  // V8-A1: strict-NA territory gate. Fires hard-drop whenever role region is
  // NON_NA, regardless of sales-context. Per Will's 2026-05-06 directive,
  // any role rooted in a non-NA market drops (even pure-engineering / FDE
  // remote-eligible roles in regional markets) because Will is Toronto-based
  // and only takes NA-market roles. Reason renamed from
  // `non_na_territory_with_sales_context` (V7) to `non_na_territory` (V8).
  const territory = detectTerritory(title, textSections);
  const territoryHardDrop = territory.region === "NON_NA"
    ? {
        hard_drop: true,
        reason: "non_na_territory",
        confidence: "strong",
        evidence: territory.evidence.slice(0, 3).join(" | "),
      }
    : { hard_drop: false, reason: null, confidence: "none", evidence: "" };

  const hardDrops = [sales, level, comp, yoe, location, territoryHardDrop].filter((x) => x.hard_drop);
  const rank = Number.isFinite(companyMeta.rank) ? companyMeta.rank : 9999;
  const rankScore = rank <= 50 ? 4 : rank <= 150 ? 3 : rank <= 300 ? 2 : 1;
  const categoryScore = companyAiNative({ ...companyMeta, company: job.company }) ? 3 : 0;
  const total =
    roleFamily.base_score +
    semantic.score +
    comp.score +
    yoe.score +
    location.score +
    level.score +
    rankScore +
    categoryScore;

  const annotations = [
    ...level.annotations,
    ...comp.annotations,
    ...yoe.annotations,
    ...location.annotations,
  ];
  if (sales.reason === "sales_partner_context_only") annotations.push("sales_partner_context_only");
  if (roleFamily.primary_family === "UNKNOWN" && HIGH_INTENT_TITLE_RE.test(title) && semantic.confidence === "insufficient") {
    annotations.push("source_repair_or_cache_miss_review");
  }

  return {
    hard_drop: hardDrops.length > 0,
    hard_drop_reason: hardDrops.map((x) => x.reason).filter(Boolean).join("; "),
    hard_drop_evidence: hardDrops.map((x) => x.evidence || x.candidate?.snippet || x.reason).filter(Boolean).join(" | "),
    decision_confidence: hardDrops.some((x) => x.confidence === "strong" || x.reason) ? "strong" : "moderate",
    primary_family: roleFamily.primary_family,
    families: roleFamily.families,
    role_family_reason: roleFamily.reason,
    shadow_score: total,
    shadow_band: computeShadowBand(total),
    score_parts: {
      family: roleFamily.base_score,
      semantic: semantic.score,
      compensation: comp.score,
      yoe: yoe.score,
      location: location.score,
      level: level.score,
      rank: rankScore,
      category: categoryScore,
    },
    semantic,
    sales,
    level,
    compensation: comp,
    yoe,
    location,
    territory,
    territory_dropped: territoryHardDrop.hard_drop,
    annotations,
  };
}

export function formatScoreReasons(scoreResult) {
  const parts = Object.entries(scoreResult.score_parts || {})
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  const notes = [
    `family=${scoreResult.primary_family}`,
    parts,
    scoreResult.annotations?.length ? `annotations=${scoreResult.annotations.join(",")}` : "",
    scoreResult.hard_drop ? `hard_drop=${scoreResult.hard_drop_reason}` : "",
  ].filter(Boolean);
  return notes.join(" | ");
}

export function detectHighSalaryRanges(text) {
  return extractCompensationCandidates(String(text || ""), [])
    .filter((candidate) => candidate.rate_type === "annual" && candidate.annualized_high_thousands >= 120)
    .map((candidate) => ({
      low_thousands: candidate.annualized_low_thousands,
      high_thousands: candidate.annualized_high_thousands,
      currency: candidate.currency,
      snippet: candidate.snippet,
    }));
}
