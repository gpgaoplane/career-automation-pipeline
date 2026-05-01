// career-ops/lib/firecrawl.mjs
// Phase 2.8 Step 1 — Firecrawl SDK wrapper.
//
// Exports: scrape, scrapeJson, JOB_LISTING_SCHEMA_V1, MAX_CREDITS_DEFAULT,
//          setMaxCredits, getCreditsSpent, resetCostTracking,
//          FirecrawlError, CreditCapExhaustedError.
//
// CRITICAL: NO extract() wrapper exists. Per docs/design/2026-04-29-firecrawl-ats-verification.md
// Q1+Q4, /v1/extract is on a separate token-billed pool. We use /v1/scrape
// with formats:["json"] + jsonOptions:{schema, prompt} for JSON-mode extraction
// (5 credits/page) and formats:["markdown"|"html"|"links"] for normal scraping
// (1 credit/page).
//
// Layer 3 fallback wiring: hard-stop conditions (5xx after retries / 4xx /
// network error / --max-credits exhaustion) append a row to
// data/firecrawl-fallback-queue.tsv that scripts/full-scan-orchestrator.mjs
// consumes post-chain to invoke custom-scraper for queued companies.
// Per implementation plan v2 §6.1 + AC-11a/b.

import { readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CAREER_OPS = resolve(__dirname, "..");
const DATA_DIR = resolve(CAREER_OPS, "data");

const FIRECRAWL_BASE = "https://api.firecrawl.dev";
const COST_LOG = resolve(DATA_DIR, "firecrawl-cost.tsv");
const FALLBACK_QUEUE = resolve(DATA_DIR, "firecrawl-fallback-queue.tsv");
const KEY_FILE = resolve(REPO_ROOT, ".firecrawl-key");

export const MAX_CREDITS_DEFAULT = 5000;

// JSON Schema for Layer 2 structured listing extraction. Reserved name
// JOB_LISTING_SCHEMA_V1 — version-bumped on schema changes so cache invalidation
// can key off it. Per implementation plan v2 §6.6 QI-4.
export const JOB_LISTING_SCHEMA_V1 = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          location: { type: "string" },
          url: { type: "string" },
          department: { type: "string" },
        },
        required: ["title", "url"],
      },
    },
  },
  required: ["jobs"],
};

// API key resolution: env var first, then .firecrawl-key file at repo root.
// Key file may be either raw (`fc-...`) or dotenv format (`FIRECRAWL_API_KEY=fc-...`).
function getApiKey() {
  if (process.env.FIRECRAWL_API_KEY) return process.env.FIRECRAWL_API_KEY.trim();
  if (existsSync(KEY_FILE)) {
    const raw = readFileSync(KEY_FILE, "utf8").trim();
    // Strip dotenv-style prefix if present (FIRECRAWL_API_KEY=fc-...)
    const m = raw.match(/^FIRECRAWL_API_KEY\s*=\s*(.+)$/m);
    return (m ? m[1] : raw).trim();
  }
  throw new Error(
    "FIRECRAWL_API_KEY not set in env and no .firecrawl-key file found at repo root"
  );
}

// Cost tracking — accumulator for current Node process
let _runCreditsSpent = 0;
let _maxCredits = MAX_CREDITS_DEFAULT;

export function setMaxCredits(n) {
  if (typeof n !== "number" || n < 0) throw new Error(`setMaxCredits: invalid n=${n}`);
  _maxCredits = n;
}

export function getCreditsSpent() {
  return _runCreditsSpent;
}

export function resetCostTracking() {
  _runCreditsSpent = 0;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function logCost({ url, mode, credits, statusCode, durationMs }) {
  ensureDataDir();
  const ts = new Date().toISOString();
  const row = [ts, url, mode, credits, statusCode ?? "", durationMs].join("\t") + "\n";
  try {
    appendFileSync(COST_LOG, row, "utf8");
  } catch (e) {
    // Don't crash the call on log-write failure
    console.error(`[firecrawl] cost log append failed: ${e.message}`);
  }
}

function appendFallbackQueue({ company, url, layer, reason }) {
  ensureDataDir();
  const ts = new Date().toISOString();
  const row = [ts, company ?? "", url, layer, reason].join("\t") + "\n";
  try {
    appendFileSync(FALLBACK_QUEUE, row, "utf8");
  } catch (e) {
    console.error(`[firecrawl] fallback queue append failed: ${e.message}`);
  }
}

export class CreditCapExhaustedError extends Error {
  constructor(message) {
    super(message);
    this.name = "CreditCapExhaustedError";
    this.code = "CREDIT_CAP_EXHAUSTED";
  }
}

export class FirecrawlError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "FirecrawlError";
    this.statusCode = statusCode;
  }
}

const RETRY_BACKOFFS_MS = [1000, 2000, 4000];

async function _request({ endpoint, body, layer, company, mode, expectedCost }) {
  // Cost cap check BEFORE making request
  if (_runCreditsSpent + expectedCost > _maxCredits) {
    appendFallbackQueue({
      company,
      url: body.url,
      layer,
      reason: `max-credits-exhausted (spent=${_runCreditsSpent}, would-need=${_runCreditsSpent + expectedCost}, cap=${_maxCredits})`,
    });
    throw new CreditCapExhaustedError(
      `Credit cap exceeded: spent=${_runCreditsSpent}, would-need=${_runCreditsSpent + expectedCost}, cap=${_maxCredits}`
    );
  }

  const apiKey = getApiKey();
  const url = `${FIRECRAWL_BASE}${endpoint}`;

  let lastError = null;
  let lastStatus = null;

  for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
    const start = Date.now();
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const durationMs = Date.now() - start;
      lastStatus = resp.status;

      if (resp.status >= 500) {
        // Transient — retry if budget remains
        if (attempt < RETRY_BACKOFFS_MS.length) {
          await new Promise((r) => setTimeout(r, RETRY_BACKOFFS_MS[attempt]));
          continue;
        }
        // Out of retries
        const text = await resp.text().catch(() => "");
        appendFallbackQueue({
          company,
          url: body.url,
          layer,
          reason: `firecrawl-5xx-retries-exhausted (status=${resp.status})`,
        });
        throw new FirecrawlError(
          `Firecrawl ${resp.status} after ${RETRY_BACKOFFS_MS.length} retries: ${text.slice(0, 200)}`,
          resp.status
        );
      }

      if (resp.status >= 400) {
        // Fail-fast on 4xx
        const text = await resp.text().catch(() => "");
        appendFallbackQueue({
          company,
          url: body.url,
          layer,
          reason: `firecrawl-${resp.status} (no-retry-4xx)`,
        });
        throw new FirecrawlError(
          `Firecrawl ${resp.status}: ${text.slice(0, 200)}`,
          resp.status
        );
      }

      // Success — accumulate cost + log + return
      _runCreditsSpent += expectedCost;
      logCost({ url: body.url, mode, credits: expectedCost, statusCode: resp.status, durationMs });
      return await resp.json();
    } catch (err) {
      if (err instanceof FirecrawlError) throw err;
      if (err instanceof CreditCapExhaustedError) throw err;
      // Network error — retry if budget remains
      lastError = err;
      if (attempt < RETRY_BACKOFFS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFFS_MS[attempt]));
        continue;
      }
      // Out of retries
      appendFallbackQueue({
        company,
        url: body.url,
        layer,
        reason: `network-error: ${err.message?.slice(0, 100)}`,
      });
      throw new FirecrawlError(
        `Network error after ${RETRY_BACKOFFS_MS.length} retries: ${err.message}`,
        null
      );
    }
  }
  // Unreachable
  throw new FirecrawlError(`Unreachable retry exit: ${lastError?.message}`, lastStatus);
}

/**
 * Scrape a URL via /v1/scrape. Markdown mode by default (1 credit/page).
 *
 * @param {string} url - target URL
 * @param {object} [opts]
 * @param {string[]} [opts.formats=["markdown"]] - any of markdown/html/links/screenshot
 * @param {object[]} [opts.actions] - click/wait/scroll/scrape (combined wait capped at 60s per Firecrawl)
 * @param {boolean} [opts.onlyMainContent] - strip nav/footer/sidebars (markdown mode)
 * @param {number} [opts.timeout] - per-request timeout in ms
 * @param {string} [opts.layer="1"] - "1" / "2" / "enrich" — Layer label for fallback queue
 * @param {string} [opts.company] - company name for fallback queue context
 * @returns {Promise<{markdown?, html?, links?, metadata, _cost: {credits: 1, mode: "markdown"}}>}
 */
export async function scrape(url, opts = {}) {
  const formats = opts.formats || ["markdown"];
  const body = { url, formats };
  if (opts.actions) body.actions = opts.actions;
  if (opts.onlyMainContent !== undefined) body.onlyMainContent = opts.onlyMainContent;
  if (opts.timeout) body.timeout = opts.timeout;

  const result = await _request({
    endpoint: "/v1/scrape",
    body,
    layer: opts.layer || "1",
    company: opts.company,
    mode: "markdown",
    expectedCost: 1,
  });

  return {
    ...(result.data || result),
    _cost: { credits: 1, mode: "markdown" },
  };
}

/**
 * Scrape with JSON-mode extraction. Per verification doc Q1+Q4: uses
 * /v1/scrape with formats:["json"] + jsonOptions:{schema, prompt}.
 * Costs 5 credits/page (1 base + 4 surcharge). NOT /v1/extract.
 *
 * @param {string} url
 * @param {object} schema - inline JSON Schema
 * @param {string} [prompt] - optional extraction guidance
 * @param {object} [opts] - same shape as scrape() (actions/timeout/layer/company)
 * @returns {Promise<{json: object, _cost: {credits: 5, mode: "json"}}>}
 */
export async function scrapeJson(url, schema, prompt, opts = {}) {
  if (!schema || typeof schema !== "object") {
    throw new Error("scrapeJson: schema is required (inline JSON Schema object)");
  }
  const body = {
    url,
    formats: ["json"],
    jsonOptions: { schema },
  };
  if (prompt) body.jsonOptions.prompt = prompt;
  if (opts.actions) body.actions = opts.actions;
  if (opts.timeout) body.timeout = opts.timeout;

  const result = await _request({
    endpoint: "/v1/scrape",
    body,
    layer: opts.layer || "2",
    company: opts.company,
    mode: "json",
    expectedCost: 5,
  });

  const data = result.data || result;
  return {
    json: data.json || data,
    _cost: { credits: 5, mode: "json" },
  };
}
