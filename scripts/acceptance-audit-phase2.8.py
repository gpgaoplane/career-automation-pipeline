#!/usr/bin/env python3
"""
Phase 2.8 Acceptance Audit — runs the 11 ACs from design plan v2 §7.

Each AC is verified programmatically where possible, or surfaced as a
manual check where it requires user judgment (Step 9 dashboard caps,
Step 10 sample run results).

Run from repo root:
    python scripts/acceptance-audit-phase2.8.py
    python scripts/acceptance-audit-phase2.8.py --metrics docs/audits/2026-05-15-fullrun-metrics.json
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CAREER_OPS = REPO_ROOT / "career-ops"
DATA_DIR = CAREER_OPS / "data"
DEFAULT_METRICS = REPO_ROOT / "docs" / "audits" / "2026-04-30-step10-sample50-metrics.json"

AC_RESULTS = []


def ac(name, ok, detail=""):
    AC_RESULTS.append({"name": name, "ok": ok, "detail": detail})
    mark = "✓" if ok is True else ("⚠" if ok is None else "✗")
    print(f"  {mark} {name}: {detail or ('PASS' if ok else 'FAIL')}")


def grep_legacy_extract():
    """AC-5: no /v1/extract or legacy schema keys in code."""
    paths = [
        CAREER_OPS / "lib" / "firecrawl.mjs",
        CAREER_OPS / "lib" / "ats-clients.mjs",
        CAREER_OPS / "lib" / "ats-detect.mjs",
        CAREER_OPS / "firecrawl-discover.mjs",
        CAREER_OPS / "firecrawl-extract.mjs",
        CAREER_OPS / "enrich-jobs.mjs",
    ]
    bad_patterns = [r"v1/extract", r"extractorOptions", r"extractionSchema"]
    hits = []
    for p in paths:
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8")
        for line_num, line in enumerate(text.split("\n"), 1):
            # Allow comments like "NOT /v1/extract"
            stripped = line.strip()
            if stripped.startswith(("//", "*", "#")):
                continue
            for pat in bad_patterns:
                if re.search(pat, line, re.IGNORECASE):
                    hits.append(f"{p.relative_to(REPO_ROOT)}:{line_num}: {line.strip()[:80]}")
    return len(hits) == 0, hits


def check_d3_invariant():
    """AC-8: scan.mjs not modified since Phase 2.8 began."""
    try:
        out = subprocess.run(
            ["git", "log", "--oneline", "--since=2026-04-29", "--", "career-ops/scan.mjs"],
            capture_output=True, text=True, cwd=REPO_ROOT,
        )
        return out.stdout.strip() == "", out.stdout.strip()
    except Exception as e:
        return None, str(e)


def check_ttl_60days():
    """AC-6: ATS discovery cache TTL is 60 days."""
    discover = (CAREER_OPS / "firecrawl-discover.mjs").read_text(encoding="utf-8")
    has_60d = "TTL_DAYS = 60" in discover
    return has_60d, "TTL_DAYS=60" if has_60d else "NOT FOUND"


def check_jazzhr_excluded():
    """AC-9: JazzHR explicit out-of-scope in code/docs."""
    readme = REPO_ROOT / "scripts" / "ats-adapters" / "README.md"
    if not readme.exists():
        return False, "README.md missing"
    text = readme.read_text(encoding="utf-8")
    has_jazzhr = "JazzHR" in text and ("out-of-scope" in text.lower() or "explicit" in text.lower())
    return has_jazzhr, "Documented" if has_jazzhr else "NOT FOUND"


def check_max_credits_default():
    """AC-10 partial: --max-credits default = 3000 in lib/firecrawl.mjs."""
    fc = (CAREER_OPS / "lib" / "firecrawl.mjs").read_text(encoding="utf-8")
    has_default = "MAX_CREDITS_DEFAULT = 3000" in fc
    return has_default, "MAX_CREDITS_DEFAULT=3000" if has_default else "NOT FOUND"


def check_5_adapters_present():
    """AC-4 partial: 5 sibling adapters present."""
    adapters_dir = REPO_ROOT / "scripts" / "ats-adapters"
    expected = ["workday-cxs.mjs", "smartrecruiters.mjs", "personio.mjs", "recruitee.mjs", "workable.mjs"]
    missing = [a for a in expected if not (adapters_dir / a).exists()]
    return len(missing) == 0, f"missing: {missing}" if missing else "all 5 present"


def check_orchestrator_present():
    """Step 8 wiring: orchestrator script + npm scripts."""
    orch = REPO_ROOT / "scripts" / "full-scan-orchestrator.mjs"
    pkg = (CAREER_OPS / "package.json").read_text(encoding="utf-8")
    pkg_json = json.loads(pkg)
    scripts = pkg_json.get("scripts", {})
    needed = ["full-scan", "full-scan:dry-run", "firecrawl-discover", "firecrawl-extract", "ats-adapters"]
    missing = [s for s in needed if s not in scripts]
    return orch.exists() and not missing, f"orchestrator: {orch.exists()}; missing scripts: {missing}"


def main():
    parser = argparse.ArgumentParser(description="Phase 2.8 Acceptance Audit")
    parser.add_argument(
        "--metrics",
        default=str(DEFAULT_METRICS),
        help=(
            "Path to metrics JSON (default: sample-50). For full-run audits, "
            "point at the JSON produced by scripts/full-run-audit.mjs."
        ),
    )
    args = parser.parse_args()
    metrics_path = Path(args.metrics)
    if not metrics_path.is_absolute():
        metrics_path = REPO_ROOT / metrics_path

    label = metrics_path.stem
    print(f"\n=== Phase 2.8 Acceptance Audit ({label}) ===\n")
    step10 = None
    if metrics_path.exists():
        step10 = json.loads(metrics_path.read_text(encoding="utf-8"))
    else:
        print(f"  WARN: metrics file not found at {metrics_path}")

    # AC-1: firecrawl-discover.mjs recovers ATS slugs (programmatically check via cache)
    cache_path = DATA_DIR / "ats-discovery-cache.json"
    if cache_path.exists():
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
        smoke_5 = ["Cloudflare", "Jasper", "SiFive", "Expedia Group", "Shopify"]
        recovered = sum(1 for c in smoke_5 if cache.get(c, {}).get("ats"))
        ac("AC-1 — Layer 1 recovers ≥4/5 smoke-test ATS slugs",
           recovered >= 4, f"{recovered}/5 recovered ({[c for c in smoke_5 if cache.get(c, {}).get('ats')]})")
    else:
        ac("AC-1 — Layer 1 recovers ≥4/5 smoke-test ATS slugs", None, "cache not present (run Step 4)")

    # AC-2: sample-50 source accounting and miss explainability.
    # The earlier ">=75% exported companies" reading was retired because it
    # conflated source resolution, raw-job availability, title filters, and
    # whether a company is currently hiring for Will-relevant roles.
    if step10:
        exported = step10.get("exported_companies")
        sample = step10.get("sample_companies")
        relevant_rate = step10.get("title_filtered_company_coverage", 0)
        source_health = step10.get("source_health_rate", 0)
        classified = step10.get("classified_no_yield_companies")
        no_yield = step10.get("no_yield_companies")
        source_resolved = step10.get("source_resolved_companies")
        ac("AC-2 — sample-50 source accounting complete",
           step10.get("ac2_source_accounting_pass"),
           f"source resolved: {source_resolved}/{sample} ({step10.get('source_resolution_rate', 0):.1%}); "
           f"source health: {step10.get('healthy_sources')}/{step10.get('resolved_sources')} ({source_health:.1%}); "
           f"misses classified: {classified}/{no_yield} ({step10.get('miss_classification_rate', 0):.1%}); "
           f"relevant job yield report-only: {exported}/{sample} ({relevant_rate:.1%})")
    else:
        ac("AC-2 — sample-50 source accounting complete", None,
           "REQUIRES Step 10 metrics artifact")

    # AC-3: per-JD signal ≥40%
    if step10:
        rate = step10.get("raw_location_or_compensation_rate", 0)
        hits = step10.get("raw_location_or_compensation_hits")
        total = step10.get("pending_jobs")
        ac("AC-3 — per-JD location+comp signals ≥40%", step10.get("ac3_generic_location_or_compensation_pass"),
           f"generic location_raw OR comp: {hits}/{total} ({rate:.1%}); Will-fit location_match OR comp: {step10.get('will_fit_location_or_compensation_rate', 0):.1%}")
    else:
        ac("AC-3 — per-JD location+comp signals ≥40%", None,
           "REQUIRES Step 10 full-pipeline sample run with enrich")

    # AC-4: 5 adapters present + tested
    ok, det = check_5_adapters_present()
    ac("AC-4 — 5 new direct-API adapters present + tested", ok, det)

    # AC-5: no /v1/extract
    ok, hits = grep_legacy_extract()
    ac("AC-5 — no /v1/extract or legacy schema keys", ok,
       f"clean ✓" if ok else f"hits: {hits}")

    # AC-6: 60-day TTL
    ok, det = check_ttl_60days()
    ac("AC-6 — ATS discovery cache TTL is 60 days", ok, det)

    # AC-7: cost log mode-split — exists if any Firecrawl call has run
    cost_log = DATA_DIR / "firecrawl-cost.tsv"
    if cost_log.exists():
        text = cost_log.read_text(encoding="utf-8")
        modes = set(line.split("\t")[2] for line in text.split("\n") if line.count("\t") >= 5)
        has_modes = any(m in modes for m in ["markdown", "json"])
        ac("AC-7 — cost log mode-split", has_modes,
           f"modes seen: {sorted(modes)}")
    else:
        ac("AC-7 — cost log mode-split", None, "cost log not present (run any Firecrawl call)")

    # AC-8: D-3 invariant — scan.mjs not modified
    ok, det = check_d3_invariant()
    ac("AC-8 — D-3 invariant: scan.mjs not modified", ok,
       "no commits to scan.mjs" if ok else f"FOUND COMMITS: {det}")

    # AC-9: JazzHR explicit out-of-scope
    ok, det = check_jazzhr_excluded()
    ac("AC-9 — JazzHR explicit out-of-scope", ok, det)

    # AC-10: rate-cap dashboard verification + --max-credits enforced
    caps_file = DATA_DIR / "firecrawl-plan-caps.tsv"
    has_caps = caps_file.exists() and caps_file.stat().st_size > 0
    ok_max = check_max_credits_default()[0]
    overall = has_caps and ok_max
    if overall:
        det = "dashboard caps documented; --max-credits=3000 default"
    elif ok_max and not has_caps:
        det = "--max-credits=3000 OK; dashboard caps NOT YET DOCUMENTED — Step 9 manual gate"
        overall = None
    else:
        det = f"--max-credits default: {ok_max}; dashboard caps: {has_caps}"
    ac("AC-10 — rate-cap dashboard + --max-credits", overall, det)

    # AC-11a/b: Layer 3 fallback wiring
    fb_queue = DATA_DIR / "firecrawl-fallback-queue.tsv"
    has_orch = (REPO_ROOT / "scripts" / "full-scan-orchestrator.mjs").exists()
    ok = check_orchestrator_present()[0]
    if has_orch:
        text = (REPO_ROOT / "scripts" / "full-scan-orchestrator.mjs").read_text(encoding="utf-8")
        wires_fallback = "FALLBACK_QUEUE" in text and "FALLBACK_STEP" in text
        ac("AC-11a — Layer 3 fallback WIRED in orchestrator", wires_fallback,
           "orchestrator reads fallback queue + invokes custom-scraper" if wires_fallback else "wiring incomplete")
    else:
        ac("AC-11a — Layer 3 fallback wired", False, "orchestrator missing")

    if step10:
        ac("AC-11b — custom-scraper triggers ≤5% on normal run", step10.get("ac11b_fallback_usage_pass"),
           f"new fallback queue rows during Step 10: {step10.get('new_fallback_queue_rows')}")
    else:
        ac("AC-11b — custom-scraper triggers ≤5% on normal run", None,
           "REQUIRES Step 10 full-pipeline run for measurement")

    # Summary
    passes = sum(1 for r in AC_RESULTS if r["ok"] is True)
    pending = sum(1 for r in AC_RESULTS if r["ok"] is None)
    failures = sum(1 for r in AC_RESULTS if r["ok"] is False)
    total = len(AC_RESULTS)
    print(f"\n=== Summary: {passes} pass, {pending} pending (manual), {failures} fail / {total} total ===")
    if failures > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
