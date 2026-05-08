// scripts/lib/jd-sections.mjs
// Best-effort JD section parser for deterministic filter/scoring audits.

const SECTION_ALIASES = [
  {
    type: "responsibilities",
    confidence: "strong",
    // V8-A1: extended with "Your Impact", "What You'll Drive", "Day-to-Day",
    // "Day in the Life", "About this Role", "Job Details", "The Position",
    // "Your Mission" so role-anchor scans can fire inside these section types.
    re: /^(responsibilities|what you(?:'|’)ll do|what you will do|what you(?:'|’)ll drive|the role|in this role|you will|day to day|day[-\s]?to[-\s]?day|day in the life|about the role|about this role|job details|the position|your mission|your impact)$/i,
  },
  {
    type: "requirements",
    confidence: "strong",
    re: /^(requirements|qualifications|about you|you have|we(?:'|’)re looking for|we are looking for|what you bring|required skills|minimum qualifications|preferred qualifications)$/i,
  },
  {
    type: "compensation",
    confidence: "strong",
    // V8-A1: added "What we offer" and "What You'll Get" as comp aliases.
    re: /^(compensation|salary|salary range|pay range|base pay|base salary|annual salary|rate|pay transparency|what we offer|what you(?:'|’)ll get)$/i,
  },
  {
    type: "location",
    confidence: "strong",
    // V8-A1: added "Where you'll work" so dedicated location sections feed the
    // territory detector via the expanded recognizedTypes set.
    re: /^(location|workplace|work location|office|remote|hybrid|employment location|where you(?:'|’)ll work)$/i,
  },
  {
    type: "benefits",
    confidence: "moderate",
    re: /^(benefits|perks|total rewards)$/i,
  },
  {
    type: "about_company",
    confidence: "moderate",
    re: /^(about us|about the company|company|who we are|our mission)$/i,
  },
];

const INLINE_HINTS = [
  { type: "compensation", re: /\b(compensation|salary|pay range|base pay|base salary|hourly|per hour|\/hr)\b/i },
  { type: "location", re: /\b(remote|hybrid|on[-\s]?site|in[-\s]?office|office[-\s]?based|location)\b/i },
  { type: "requirements", re: /\b(requirements|qualifications|experience required|years of experience|you have|must have)\b/i },
  { type: "responsibilities", re: /\b(responsibilities|you will|build|own|design|deploy|implement|partner with)\b/i },
  { type: "benefits", re: /\b(benefits|perks|insurance|pto|vacation|equity)\b/i },
];

function cleanMarkdown(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeHeading(line) {
  return String(line || "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*{1,2}(.+?)\*{1,2}$/, "$1")
    .replace(/[:\-–—]+$/, "")
    .trim();
}

function detectHeading(line) {
  const normalized = normalizeHeading(line);
  if (!normalized) return null;
  const isMarkdownHeading = /^#{1,6}\s+/.test(line);
  const looksLikeHeading =
    isMarkdownHeading ||
    (/^[A-Z][A-Za-z0-9 &'’/()\-–—]{2,70}$/.test(normalized) && normalized.split(/\s+/).length <= 8);
  if (!looksLikeHeading) return null;
  for (const alias of SECTION_ALIASES) {
    if (alias.re.test(normalized)) {
      return { type: alias.type, heading: normalized, confidence: alias.confidence };
    }
  }
  return isMarkdownHeading ? { type: "unknown", heading: normalized, confidence: "weak" } : null;
}

function classifyBlock(text, current) {
  if (current && current.type !== "unknown") return { type: current.type, confidence: current.confidence, heading: current.heading };
  for (const hint of INLINE_HINTS) {
    if (hint.re.test(text)) return { type: hint.type, confidence: "moderate", heading: "" };
  }
  return { type: current?.type || "unknown", confidence: current?.confidence || "weak", heading: current?.heading || "" };
}

function pushBlock(sections, blockLines, current) {
  const text = blockLines.join("\n").trim();
  if (!text) return;
  const classified = classifyBlock(text, current);
  sections.push({
    type: classified.type,
    heading: classified.heading,
    confidence: classified.confidence,
    text,
    snippet: text.replace(/\s+/g, " ").slice(0, 280),
  });
}

export function parseJdSections(input) {
  const text = cleanMarkdown(input);
  if (!text) return [];

  const sections = [];
  let current = { type: "unknown", heading: "", confidence: "weak" };
  let block = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      pushBlock(sections, block, current);
      block = [];
      continue;
    }

    const heading = detectHeading(line);
    if (heading) {
      pushBlock(sections, block, current);
      block = [];
      current = heading;
      continue;
    }

    block.push(line.replace(/^[-*]\s+/, "").trim());
  }
  pushBlock(sections, block, current);

  return sections.map((section, index) => ({ ...section, index }));
}

export function findSectionEvidence(sections, queryType) {
  const wanted = Array.isArray(queryType) ? new Set(queryType) : new Set([queryType]);
  return (sections || [])
    .filter((section) => wanted.has(section.type))
    .map((section) => ({
      type: section.type,
      confidence: section.confidence,
      heading: section.heading,
      snippet: section.snippet,
      index: section.index,
    }));
}

export function extractRequirementBlocks(sections) {
  return (sections || []).filter((section) => section.type === "requirements");
}

export function sectionText(sections, types) {
  const wanted = new Set(Array.isArray(types) ? types : [types]);
  return (sections || [])
    .filter((section) => wanted.has(section.type))
    .map((section) => section.text)
    .join("\n");
}
