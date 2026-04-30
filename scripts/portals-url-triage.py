#!/usr/bin/env python3
"""
portals.yml URL triage — Step 0 of Phase 2.8 Firecrawl-pivot implementation.

Classifies all enabled URLs in career-ops/portals.yml into 4 buckets:
- direct-ATS:<provider>  — URL matches a known direct-ATS pattern (8 providers)
- branded-page-OK        — HTTP 200, not direct-ATS, hostname agrees with company name
- dead                   — 404 / timeout / connection error / parked / 4xx /5xx
- wrong-company-suspect  — HTTP 200 but final hostname doesn't agree with company name

Method: HEAD-first, GET fallback on 405/403/timeout/no-Content-Length (per Codex review Q2).
Concurrency: configurable (default 5); courtesy 200ms delay between starts.

Run from repo root:
    python scripts/portals-url-triage.py [--concurrency 5] [--timeout 10]

Output:
    scripts/portals-url-triage-report.tsv  (columns: company, careers_url, final_url,
                                             bucket, status_code, error)

The user manual gate (per implementation plan §6.0) reviews the TSV and
fixes obvious dead/wrong-company rows in portals.yml directly.
"""

import argparse
import csv
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import yaml
import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
PORTALS_YML = REPO_ROOT / "career-ops" / "portals.yml"
OUTPUT_TSV = REPO_ROOT / "scripts" / "portals-url-triage-report.tsv"

# If primary output is locked (e.g., open in Excel), fall back to a v2 filename
import os
if OUTPUT_TSV.exists():
    try:
        with open(OUTPUT_TSV, "a"):
            pass
    except PermissionError:
        OUTPUT_TSV = REPO_ROOT / "scripts" / "portals-url-triage-report-v2.tsv"

# 8-provider direct-ATS detection patterns (matches design v2 §4.1.1 + D-15).
ATS_PATTERNS = {
    "greenhouse": [
        r"boards\.greenhouse\.io",
        r"job-boards\.greenhouse\.io",
        r"boards-api\.greenhouse\.io",
    ],
    "ashby": [
        r"jobs\.ashbyhq\.com",
        r"api\.ashbyhq\.com",
    ],
    "lever": [
        r"jobs\.lever\.co",
        r"api\.lever\.co",
    ],
    "workday-cxs": [
        r"\.myworkdayjobs\.com",
    ],
    "smartrecruiters": [
        r"careers\.smartrecruiters\.com",
        r"api\.smartrecruiters\.com",
        r"jobs\.smartrecruiters\.com",
    ],
    "personio": [
        r"\.jobs\.personio\.(de|com)",
    ],
    "recruitee": [
        r"\.recruitee\.com",
    ],
    "workable": [
        r"apply\.workable\.com",
        r"www\.workable\.com/connect",
    ],
}

USER_AGENT = (
    "career-ops-triage/1.0 "
    "(+phase 2.8 url triage; HEAD+GET fallback)"
)


def detect_direct_ats(url):
    """Return ATS provider name if URL matches one of 8 patterns, else None."""
    for ats, patterns in ATS_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, url, re.IGNORECASE):
                return ats
    return None


def normalize_company_name(name):
    """Lowercase, strip common suffixes, remove non-alphanumerics."""
    s = name.lower()
    # Strip "Runway-adjacent:" prefix used for some duplicates
    if ":" in s:
        s = s.split(":", 1)[1].strip()
    suffixes = [
        " inc", " inc.", ", inc", ", inc.",
        " corp", " corp.", " corporation",
        " llc", " ltd", " ltd.", " limited",
        " labs", " labs.",
        " ai", " .ai",
        " technologies", " technology", " tech",
        " co", " co.", " company",
        " group", " holdings",
    ]
    changed = True
    while changed:
        changed = False
        for suffix in suffixes:
            if s.endswith(suffix):
                s = s[: -len(suffix)].strip()
                changed = True
    return re.sub(r"[^a-z0-9]", "", s)


def hostname_company_agreement(company_name, final_url):
    """
    Heuristic: does the final URL's hostname share a meaningful fragment with
    the normalized company name? Avoids silently flagging short or token-overlap
    matches as wrong-company.
    """
    norm = normalize_company_name(company_name)
    if len(norm) < 3:
        return True  # too short to meaningfully check; pass

    parsed = urlparse(final_url)
    host = parsed.netloc.lower()

    # Strip common subdomain prefixes
    for prefix in ["www.", "careers.", "jobs.", "boards.", "apply.", "join.", "hire.", "work.", "team."]:
        if host.startswith(prefix):
            host = host[len(prefix):]

    # Drop TLD chunk
    parts = host.split(".")
    host_main = ".".join(parts[:-1]) if len(parts) >= 2 else host
    host_norm = re.sub(r"[^a-z0-9]", "", host_main)

    # Strong-agreement checks (any one passes):
    # 1. Normalized company name is contained in or contains hostname
    if norm in host_norm or host_norm in norm:
        return True
    # 2. First 4 chars of company name appear in hostname (catches Anthropic→anthropic.com)
    if len(norm) >= 4 and norm[:4] in host_norm:
        return True
    # 3. First 4 chars of hostname appear in company name (catches edge cases)
    if len(host_norm) >= 4 and host_norm[:4] in norm:
        return True
    return False


def probe_url(company_name, url, timeout):
    """
    HTTP HEAD with GET fallback. Returns (bucket, status_code, final_url, error).

    Bucket values:
      - "direct-ATS:<provider>"
      - "branded-page-OK"
      - "dead"
      - "wrong-company-suspect"
    """
    headers = {"User-Agent": USER_AGENT}
    final_url = url
    status = None

    # First try HEAD
    head_failed = False
    head_error = None
    try:
        r = requests.head(url, headers=headers, timeout=timeout, allow_redirects=True)
        status = r.status_code
        final_url = r.url
        # 405/403 may indicate HEAD-rejection; 5xx is likely transient — fall through to GET
        if status in (403, 405) or status >= 500:
            head_failed = True
            head_error = f"head-status-{status}"
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
            requests.exceptions.RequestException) as e:
        head_failed = True
        head_error = f"head-{type(e).__name__}"

    # GET fallback if HEAD failed
    if head_failed:
        try:
            r = requests.get(url, headers=headers, timeout=timeout,
                             allow_redirects=True, stream=True)
            status = r.status_code
            final_url = r.url
            r.close()
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError,
                requests.exceptions.RequestException) as e2:
            err_msg = f"{type(e2).__name__}: {str(e2)[:80]}"
            return ("dead", None, url, err_msg)

    if status is None:
        return ("dead", None, final_url, "no-status")

    # Classify by status
    if status == 404:
        return ("dead", status, final_url, "404")
    if status >= 400 and status < 500:
        # 4xx other than 200 = unreachable for our purposes (we already retried 403/405 via GET)
        return ("dead", status, final_url, f"http-{status}")
    if status >= 500:
        return ("dead", status, final_url, f"http-{status}")

    # 2xx (or 3xx-resolved-to-2xx after redirect): check direct-ATS first
    ats = detect_direct_ats(final_url)
    if ats:
        return (f"direct-ATS:{ats}", status, final_url, "")

    # Then check hostname-company agreement
    if not hostname_company_agreement(company_name, final_url):
        return ("wrong-company-suspect", status, final_url, "hostname-mismatch")

    return ("branded-page-OK", status, final_url, "")


def main():
    parser = argparse.ArgumentParser(description="Triage portals.yml URLs into 4 buckets.")
    parser.add_argument("--concurrency", type=int, default=5,
                        help="Number of concurrent HTTP probes (default: 5)")
    parser.add_argument("--timeout", type=int, default=10,
                        help="Per-request timeout in seconds (default: 10)")
    args = parser.parse_args()

    if not PORTALS_YML.exists():
        print(f"ERROR: portals.yml not found at {PORTALS_YML}", file=sys.stderr)
        sys.exit(1)

    with open(PORTALS_YML, "r", encoding="utf-8") as f:
        portals = yaml.safe_load(f)

    tracked = portals.get("tracked_companies") or []
    enabled = [
        (entry.get("name", ""), entry.get("careers_url", ""))
        for entry in tracked
        if entry.get("enabled", False) and entry.get("careers_url")
    ]

    print(f"Probing {len(enabled)} enabled portals (concurrency={args.concurrency}, "
          f"timeout={args.timeout}s)...", file=sys.stderr)

    results = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as exe:
        futures = {
            exe.submit(probe_url, name, url, args.timeout): (name, url)
            for name, url in enabled
        }
        done = 0
        for fut in as_completed(futures):
            name, url = futures[fut]
            try:
                bucket, status, final_url, error = fut.result()
            except Exception as e:
                bucket, status, final_url, error = "dead", None, url, f"exception: {e}"
            results.append((name, url, final_url, bucket, status if status is not None else "", error))
            done += 1
            if done % 50 == 0 or done == len(enabled):
                print(f"  {done}/{len(enabled)} probes complete", file=sys.stderr)

    results.sort(key=lambda r: r[0].lower())

    OUTPUT_TSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_TSV, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL)
        w.writerow(["company", "careers_url", "final_url", "bucket", "status_code", "error"])
        for row in results:
            w.writerow(row)

    bucket_counts = {}
    for r in results:
        b = r[3]
        if b.startswith("direct-ATS:"):
            b = "direct-ATS"
        bucket_counts[b] = bucket_counts.get(b, 0) + 1

    print(f"\n=== Bucket counts (total: {len(results)}) ===", file=sys.stderr)
    for bucket, count in sorted(bucket_counts.items(), key=lambda x: -x[1]):
        pct = 100.0 * count / max(len(results), 1)
        print(f"  {bucket:30s} {count:5d}  ({pct:5.1f}%)", file=sys.stderr)
    print(f"\nReport: {OUTPUT_TSV}", file=sys.stderr)


if __name__ == "__main__":
    main()
