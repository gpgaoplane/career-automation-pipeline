#!/usr/bin/env python3
"""
sample-portals-50-v2.py — Phase 2.8 Step 5 sample-50 generator.

Generates a transient portals.yml restricted to 50 random enabled companies
(seed-stable). Uses ruamel.yaml to preserve YAML comment groups (# ── AI Engineering ──
etc.) which the title-track parser in export-jobs.mjs depends on.

This is the v2 fix for Phase 2.7's sample-portals-50.py bug (commit eacb2c3)
where pyyaml.dump dropped comment groups, causing trackMap to be empty and
suppressing S-tier emergence.

Run from repo root:
    python scripts/sample-portals-50-v2.py [--seed 42] [--n 50] [--out <path>]

Default output: scripts/sample-50.yml
"""

import argparse
import random
import sys
from pathlib import Path

from ruamel.yaml import YAML

REPO_ROOT = Path(__file__).resolve().parent.parent
PORTALS_YML = REPO_ROOT / "career-ops" / "portals.yml"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--n", type=int, default=50)
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "scripts" / "sample-50.yml")
    args = parser.parse_args()

    yaml = YAML()
    yaml.preserve_quotes = True
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.width = 1000  # don't wrap long URLs

    with open(PORTALS_YML, "r", encoding="utf-8") as f:
        data = yaml.load(f)

    tracked = data.get("tracked_companies", [])
    enabled = [(i, e) for i, e in enumerate(tracked) if e.get("enabled")]

    if len(enabled) < args.n:
        print(f"WARNING: only {len(enabled)} enabled companies; sampling all", file=sys.stderr)
        chosen_indices = set(i for i, _ in enabled)
    else:
        rng = random.Random(args.seed)
        chosen = rng.sample(enabled, args.n)
        chosen_indices = set(i for i, _ in chosen)

    # Build the new tracked_companies list:
    # - Keep entries whose index is in chosen_indices
    # - Disable all others (set enabled: false)
    # - Preserve comment groups by mutating in place rather than rebuilding
    for i, entry in enumerate(tracked):
        if i not in chosen_indices and entry.get("enabled"):
            entry["enabled"] = False
            # Preserve original note if present, else add sample-disable marker
            if "note" not in entry:
                entry["note"] = f"sample-disabled (seed={args.seed})"

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    enabled_after = sum(1 for e in tracked if e.get("enabled"))
    disabled_after = sum(1 for e in tracked if not e.get("enabled"))
    print(f"Sampled {len(chosen_indices)} of {len(enabled)} enabled rows", file=sys.stderr)
    print(f"Result: {enabled_after} enabled, {disabled_after} disabled", file=sys.stderr)
    print(f"Wrote: {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
