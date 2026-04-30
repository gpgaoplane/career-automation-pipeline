// career-ops/lib/ats-clients.mjs
// Phase 2.8 Step 2 — 8-provider direct-API library.
//
// Per implementation plan v2 §6.2 + D-15: provides documented-JSON fetchers
// for the 8-provider direct-API tier. Greenhouse/Ashby/Lever logic is
// DUPLICATED from scan.mjs (NOT extracted) — preserves D-3 invariant.
// Workday CXS, SmartRecruiters, Personio, Recruitee, Workable are NEW
// (per D-15 verified-no-auth ATS expansion).
//
// All fetch* functions return normalized:
//   { jobs: [{ title, location, url, department?, description?, raw }], provider }
// Listings only — per-job description fetching happens at enrichment time.

const UA = "career-ops-ats-clients/1.0 (+phase 2.8)";
const COURTESY_DELAY_MS = 250; // between paginated requests; per design v2 §5.4

async function _get(url, opts = {}) {
  const resp = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": UA, Accept: "application/json,text/xml,*/*", ...(opts.headers || {}) },
    ...opts,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`GET ${url} → ${resp.status}: ${text.slice(0, 200)}`);
  }
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return resp.json();
  if (ct.includes("xml") || ct.includes("text/xml")) return resp.text();
  return resp.text();
}

async function _post(url, body, opts = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`POST ${url} → ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ────────────────────────────────────────────────────────────────────────
// Greenhouse — public Job Board API (no auth)
// Endpoint: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
// Per verification doc Q10: no auth, no published throttle.
// ────────────────────────────────────────────────────────────────────────

export async function fetchGreenhouse(slug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const data = await _get(url);
  const jobs = (data.jobs || []).map((j) => ({
    title: j.title || "",
    location: j.location?.name || "",
    url: j.absolute_url || "",
    department: (j.departments || []).map((d) => d.name).join(", "),
    raw: j,
  }));
  return { provider: "greenhouse", slug, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Ashby — public Posting API (no auth)
// Endpoint: GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
// ────────────────────────────────────────────────────────────────────────

export async function fetchAshby(slug) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;
  const data = await _get(url);
  const jobs = (data.jobs || []).map((j) => ({
    title: j.title || "",
    location: j.locationName || j.address?.postalAddress?.addressLocality || "",
    url: j.jobUrl || j.applyUrl || "",
    department: j.departmentName || j.teamName || "",
    raw: j,
  }));
  return { provider: "ashby", slug, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Lever — public Postings API (no auth)
// Endpoint: GET https://api.lever.co/v0/postings/{slug}?mode=json
// ────────────────────────────────────────────────────────────────────────

export async function fetchLever(slug) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const data = await _get(url);
  const jobs = (Array.isArray(data) ? data : []).map((j) => ({
    title: j.text || "",
    location: j.categories?.location || "",
    url: j.hostedUrl || j.applyUrl || "",
    department: j.categories?.team || j.categories?.department || "",
    raw: j,
  }));
  return { provider: "lever", slug, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Workday CXS — de-facto-public no-auth endpoint (per verification doc Q8)
// Endpoint: POST https://{host}/wday/cxs/{tenant}/{site}/jobs
//   where {host} is e.g. "fis.wd5.myworkdayjobs.com",
//         {tenant} is the path component (extracted from host or passed),
//         {site}  is the site identifier (e.g. "SearchJobs", "External").
// Body: {appliedFacets:{}, limit, offset, searchText:""}
// Paginated. Per Codex O2 verification gate: test pagination explicitly.
// ────────────────────────────────────────────────────────────────────────

export async function fetchWorkdayCxs({ host, tenant, site, maxJobs = 200 }) {
  // Heuristic for tenant: usually first dotted-component of host (e.g. "fis" from fis.wd5.myworkdayjobs.com)
  const inferredTenant = tenant || host.split(".")[0];
  const baseUrl = `https://${host}/wday/cxs/${inferredTenant}/${site}/jobs`;
  const limit = 20;
  let offset = 0;
  let total = Infinity;
  const seenPaths = new Set();
  const jobs = [];

  while (offset < total && jobs.length < maxJobs) {
    const data = await _post(baseUrl, {
      appliedFacets: {},
      limit,
      offset,
      searchText: "",
    });
    total = data.total ?? data.jobPostings?.length ?? 0;
    const page = data.jobPostings || [];
    for (const j of page) {
      const externalPath = j.externalPath || j.bulletFields?.[0] || "";
      if (externalPath && seenPaths.has(externalPath)) continue;
      if (externalPath) seenPaths.add(externalPath);
      jobs.push({
        title: j.title || "",
        location: j.locationsText || j.locations || "",
        url: externalPath ? `https://${host}${externalPath}` : "",
        department: j.bulletFields?.[1] || "",
        raw: j,
      });
    }
    if (page.length < limit) break;
    offset += limit;
    await sleep(COURTESY_DELAY_MS);
  }

  return { provider: "workday-cxs", host, tenant: inferredTenant, site, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// SmartRecruiters — public Posting API (no auth, per verification doc Q9)
// Endpoint: GET https://api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings
// Paginated via offset/limit; default limit 100.
// ────────────────────────────────────────────────────────────────────────

export async function fetchSmartrecruiters(companyId, { maxJobs = 200 } = {}) {
  const limit = 100;
  let offset = 0;
  const jobs = [];
  while (jobs.length < maxJobs) {
    const url =
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyId)}/postings` +
      `?limit=${limit}&offset=${offset}`;
    const data = await _get(url);
    const content = data.content || [];
    for (const j of content) {
      jobs.push({
        title: j.name || "",
        location: [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(", "),
        url: j.ref ? j.ref.replace(/\/postings\/.*$/, `/postings/${j.id}`) : "",
        department: j.department?.label || "",
        raw: j,
      });
    }
    if (content.length < limit) break;
    offset += limit;
    await sleep(COURTESY_DELAY_MS);
  }
  return { provider: "smartrecruiters", companyId, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Personio — public XML feed (no auth, per verification doc Q9)
// Endpoint: GET https://{slug}.jobs.personio.de/xml?language=en
// Returns XML; we parse with a minimal regex-based extractor (no XML lib dep).
// ────────────────────────────────────────────────────────────────────────

export async function fetchPersonio(slug, { language = "en", host } = {}) {
  const target = host || `${slug}.jobs.personio.de`;
  const url = `https://${target}/xml?language=${language}`;
  const xml = await _get(url);
  if (typeof xml !== "string") {
    throw new Error(`fetchPersonio: expected XML text, got ${typeof xml}`);
  }
  // Minimal XML parsing — avoid pulling in xml2js dep
  const positions = [...xml.matchAll(/<position[\s\S]*?<\/position>/gi)].map((m) => m[0]);
  const jobs = positions.map((pos) => {
    const get = (tag) => {
      const m = pos.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
      if (!m) return "";
      // Strip CDATA + decode common entities
      return m[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };
    return {
      title: get("name"),
      location: get("office"),
      url: get("url"),
      department: get("department") || get("recruitingCategory"),
      raw: { _xmlExcerpt: pos.slice(0, 1000) },
    };
  });
  return { provider: "personio", slug, host: target, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Recruitee — public Offers API (no auth, per verification doc Q9)
// URL pattern is tenant-specific. We support the JSON Offers endpoint:
//   GET https://{tenant}.recruitee.com/api/offers/
// Caller passes the full base URL to handle redirected/canonical hosts.
// ────────────────────────────────────────────────────────────────────────

export async function fetchRecruitee(baseUrl) {
  // Normalize: ensure /api/offers/ suffix
  let api = baseUrl;
  if (!api.includes("/api/offers")) {
    api = api.replace(/\/+$/, "") + "/api/offers/";
  }
  const data = await _get(api);
  const offers = data.offers || [];
  const jobs = offers.map((o) => ({
    title: o.title || "",
    location: [o.city, o.country].filter(Boolean).join(", "),
    url: o.careers_url || o.url || "",
    department: o.department || "",
    raw: o,
  }));
  return { provider: "recruitee", baseUrl: api, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Workable — public Widget API (no auth, per verification doc Q9)
// Primary: GET https://apply.workable.com/api/v1/widget/accounts/{slug}
// Legacy fallback: GET https://www.workable.com/api/accounts/{slug}?details=true
// ────────────────────────────────────────────────────────────────────────

export async function fetchWorkable(slug) {
  const primary = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`;
  let data;
  try {
    data = await _get(primary);
  } catch (e) {
    // Try legacy fallback
    const legacy = `https://www.workable.com/api/accounts/${encodeURIComponent(slug)}?details=true`;
    data = await _get(legacy);
  }
  const jobs = (data.jobs || []).map((j) => ({
    title: j.title || "",
    location: j.location?.location_str || [j.location?.city, j.location?.country].filter(Boolean).join(", "),
    url: j.url || j.apply_url || "",
    department: j.department || "",
    raw: j,
  }));
  return { provider: "workable", slug, jobs };
}

// ────────────────────────────────────────────────────────────────────────
// Provider dispatch map for use by orchestrator scripts.
// Keys match the detection signal returned by Layer 1 firecrawl-discover.mjs.
// ────────────────────────────────────────────────────────────────────────

export const PROVIDERS = {
  greenhouse: fetchGreenhouse,
  ashby: fetchAshby,
  lever: fetchLever,
  "workday-cxs": fetchWorkdayCxs,
  smartrecruiters: fetchSmartrecruiters,
  personio: fetchPersonio,
  recruitee: fetchRecruitee,
  workable: fetchWorkable,
};
