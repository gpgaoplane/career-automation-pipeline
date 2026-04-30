// career-ops/lib/ats-detect.mjs
// Shared ATS-provider URL detection patterns.
//
// Used by:
//   - career-ops/firecrawl-discover.mjs (Layer 1 — scans HTML + links for these patterns)
//   - scripts/ats-adapters/_lib.mjs (routes portals.yml entries to direct-API adapters)
//
// One canonical source of truth for the 8-provider URL detection (D-15).

// URL patterns. First capture group is the slug (or tenant for Workday).
// Workday additionally captures instance digits + site path.
export const PROVIDER_PATTERNS = {
  greenhouse: /(?:boards|job-boards|boards-api)\.greenhouse\.io\/([^/?#"'\s]+)/i,
  ashby: /jobs\.ashbyhq\.com\/([^/?#"'\s]+)/i,
  lever: /jobs\.lever\.co\/([^/?#"'\s]+)/i,
  // Workday: {tenant}.wd{N}.myworkdayjobs.com/[locale/]{site}
  // Captures: [1]=tenant, [2]=instance digits, [3]=site (skipping optional locale prefix like "en-US")
  "workday-cxs": /([\w-]+)\.wd(\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?([\w-]+)/i,
  smartrecruiters: /(?:careers|jobs)\.smartrecruiters\.com\/([^/?#"'\s]+)/i,
  personio: /([\w-]+)\.jobs\.personio\.(?:de|com)/i,
  recruitee: /([\w-]+)\.recruitee\.com/i,
  workable: /apply\.workable\.com\/([^/?#"'\s]+)/i,
};

/**
 * Detect which provider a URL belongs to. First-match wins.
 * Returns:
 *   - { provider: "workday-cxs", host, site }
 *   - { provider: <other>, slug }
 *   - null if no match
 */
export function detectProvider(url) {
  if (!url) return null;
  for (const [provider, pat] of Object.entries(PROVIDER_PATTERNS)) {
    const m = url.match(pat);
    if (m) {
      if (provider === "workday-cxs") {
        const tenant = m[1];
        const instance = m[2];
        const site = m[3];
        return {
          provider,
          host: `${tenant}.wd${instance}.myworkdayjobs.com`,
          site,
        };
      }
      return { provider, slug: m[1] };
    }
  }
  return null;
}

/**
 * Scan a body of text (HTML or markdown) for ALL occurrences of any
 * provider pattern. Returns an array of { provider, slug?, host?, site?,
 * matchedAt } in document order. Used by Layer 1 discovery to find
 * embedded ATS hostnames in branded careers pages.
 *
 * @param {string} text
 * @returns {Array<{provider, slug?, host?, site?, matchedAt: number}>}
 */
export function detectAllInText(text) {
  if (!text) return [];
  const found = [];
  for (const [provider, pat] of Object.entries(PROVIDER_PATTERNS)) {
    const re = new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : pat.flags + "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      const entry = { provider, matchedAt: m.index };
      if (provider === "workday-cxs") {
        entry.host = `${m[1]}.wd${m[2]}.myworkdayjobs.com`;
        entry.site = m[3];
      } else {
        entry.slug = m[1];
      }
      found.push(entry);
    }
  }
  found.sort((a, b) => a.matchedAt - b.matchedAt);
  return found;
}
