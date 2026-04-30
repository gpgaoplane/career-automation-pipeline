#!/usr/bin/env python3
"""
portals-apply-triage-fixes.py — Apply Step 0 triage decisions to portals.yml.

Operates on TEXT level (not YAML parse) to preserve comments and YAML group
headers (per Phase 2.7 sample-script comment-loss pitfall, commit eacb2c3).

For each EDIT entry, finds the `  - name: "<name>"` block and:
  - Updates `careers_url:` line if `url` is set
  - Updates `enabled: true|false` line if `disable=True`
  - Inserts a `note: "<note>"` line after `enabled:` if `note` is set
    (replaces existing note if present)

Run from repo root:
    python scripts/portals-apply-triage-fixes.py [--dry-run]
"""

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PORTALS_YML = REPO_ROOT / "career-ops" / "portals.yml"

# Phase 2.8 Step 0 manual-gate decisions (user-approved 2026-04-29).
# Format: dict per edit. `url` for URL change; `disable=True` to set enabled:false;
# `note` adds/replaces a `note:` line after `enabled:`.

EDITS = [
    # ─── Batch A — UPDATE URL (per user manual edits) ──────────────────────────
    {"name": "Advantest", "url": "https://www.advantest.com/en/about/career-na/jobs/"},
    # NXP Semiconductors: user kept current URL (no change)
    {"name": "Thought Machine", "url": "https://jobs.ashbyhq.com/thought-machine"},
    # Hugging Face: keep URL (no change)

    # ─── Batch A — DROP per user direction (couldn't find / not connecting) ───
    {"name": "PT DCI Indonesia Tbk", "disable": True,
     "note": "no career page found 2026-04-29; revisit"},
    {"name": "Xiaomi", "disable": True,
     "note": "site not connecting 2026-04-29; revisit"},

    # ─── Batch B — DISABLE: ACQUIRED ──────────────────────────────────────────
    {"name": "Adept", "disable": True,
     "note": "acquired by Amazon AGI 2024-06; product team licensed; no standalone hiring"},
    {"name": "Lepton AI", "disable": True,
     "note": "acquired by NVIDIA 2025-Q1; folded into DGX Cloud Lepton; redirected to nvidia.com"},
    {"name": "Abnormal-adjacent: Tessian", "disable": True,
     "note": "acquired by Proofpoint 2024-10; redirected to proofpoint.com"},
    {"name": "Databricks-adjacent: Tecton", "disable": True,
     "note": "acquired by Databricks 2024; redirected to databricks.com"},
    {"name": "Exscientia", "disable": True,
     "note": "acquired by Recursion Pharmaceuticals 2024; redirected to recursion.com"},
    {"name": "Neon", "disable": True,
     "note": "acquired by Databricks 2025-05; redirected to databricks.com"},
    {"name": "OctoAI", "disable": True,
     "note": "acquired by NVIDIA 2024-09; product team folded into NVIDIA inference stack"},

    # ─── Batch C — DISABLE: DEFUNCT ───────────────────────────────────────────
    {"name": "Tome", "disable": True,
     "note": "validated empty 2026-04-29: company likely defunct; URL 404"},

    # ─── Batch D — AUTO-DISABLE per user "approve all" direction ──────────────
    # D.1: 404s where URL likely changed
    {"name": "01.AI", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Augmedics", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Aurascape", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Constellation Software", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Copy.ai", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "DeepL-adjacent: Unbabel", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "DeepSeek", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Fathom", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Figure-adjacent: UBTECH", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "GigaDevice Semiconductor", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Keyence", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "NAURA Technology Group", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "OpenEvidence", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Qdrant", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Safe Superintelligence", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "SenseTime", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "SK Hynix", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Skild AI", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "SMIC", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Thinking Machines Lab", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Tower Semiconductor", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "TSMC", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Unitree Robotics", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "VAST Data", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Zhipu AI", "disable": True, "note": "404 2026-04-29; revisit"},
    {"name": "Cohere-adjacent: Jina AI", "disable": True, "note": "404 2026-04-29; revisit"},
    # D.2: redirect-to-other-company / corporate event
    {"name": "Canon", "disable": True, "note": "redirect-to-root-no-careers 2026-04-29; revisit"},
    {"name": "Grammarly", "disable": True, "note": "redirect-to-superhuman 2026-04-29; Superhuman acquisition; revisit unified careers page"},
    {"name": "Sandisk", "disable": True, "note": "redirect-to-westerndigital 2026-04-29; spun out from WD 2025-02; revisit when separate careers site"},
    {"name": "Galileo AI", "disable": True, "note": "uses-rippling-ats 2026-04-29; future scope: add Rippling adapter (9th provider); revisit"},
]


def apply_edits_to_block(block_text, edit):
    """Apply a single edit to a company block. Returns new block text + list of changes made."""
    changes = []
    new_lines = []
    note_inserted = False
    has_existing_note = "note:" in block_text

    for line in block_text.split("\n"):
        stripped = line.lstrip()
        # Update careers_url if requested
        if "url" in edit and stripped.startswith("careers_url:"):
            new_line = f'    careers_url: "{edit["url"]}"'
            if line != new_line:
                changes.append(f"url: {line.strip()} → {new_line.strip()}")
                new_lines.append(new_line)
                continue
        # Update enabled if requested
        if edit.get("disable") and stripped.startswith("enabled:"):
            new_line = "    enabled: false"
            if line.rstrip() != new_line:
                changes.append(f"enabled: true → false")
            new_lines.append(new_line)
            # If we want to add a note after enabled, do it now
            if "note" in edit:
                if has_existing_note:
                    # The existing note line will come along; we'll replace it below.
                    pass
                else:
                    # Insert new note line after enabled
                    new_lines.append(f'    note: "{edit["note"]}"')
                    note_inserted = True
                    changes.append(f'note added: "{edit["note"]}"')
            continue
        # Replace existing note line if we have a new one
        if "note" in edit and stripped.startswith("note:"):
            new_line = f'    note: "{edit["note"]}"'
            if line != new_line:
                changes.append(f"note replaced: {line.strip()} → {new_line.strip()}")
                new_lines.append(new_line)
                continue
        new_lines.append(line)

    return "\n".join(new_lines), changes


def find_and_modify(text, edit):
    """Find a company entry by name and apply the edit. Returns (new_text, changes, found)."""
    name = edit["name"]
    # Block boundary: starts with `  - name: "<name>"`, ends at next `  - ` or blank line + non-indented
    name_escaped = re.escape(name)
    # Match the block: `  - name: "<X>"` line and following 4-6 indented lines
    # (rank, category, careers_url, enabled, optional note)
    pattern = re.compile(
        r'(  - name: "' + name_escaped + r'"\n'
        r'(?:    [^\n]+\n){2,7}?)'    # 2-7 following indented lines
        r'(?=\n|  - |[a-z])',          # next entry, blank line, or top-level key
        re.MULTILINE
    )
    match = pattern.search(text)
    if not match:
        return text, [], False
    block = match.group(1)
    new_block, changes = apply_edits_to_block(block, edit)
    new_text = text[:match.start(1)] + new_block + text[match.end(1):]
    return new_text, changes, True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    args = parser.parse_args()

    text = PORTALS_YML.read_text(encoding="utf-8")
    original_text = text

    summary = []
    not_found = []

    for edit in EDITS:
        text, changes, found = find_and_modify(text, edit)
        if not found:
            not_found.append(edit["name"])
        else:
            summary.append((edit["name"], changes))

    print(f"=== Triage fixes applied ({len(EDITS)} requested) ===", file=sys.stderr)
    for name, changes in summary:
        if changes:
            print(f"\n{name}:", file=sys.stderr)
            for c in changes:
                print(f"  - {c}", file=sys.stderr)
        else:
            print(f"\n{name}: (no changes — already in target state)", file=sys.stderr)

    if not_found:
        print(f"\n!!! NOT FOUND ({len(not_found)}):", file=sys.stderr)
        for n in not_found:
            print(f"  - {n}", file=sys.stderr)
        print("\nThese names didn't match any block in portals.yml. Check spelling or duplicate entries.", file=sys.stderr)

    if args.dry_run:
        print("\n[DRY RUN — no file written]", file=sys.stderr)
        if text == original_text:
            print("(no changes would be made)", file=sys.stderr)
        else:
            line_diff = sum(1 for a, b in zip(original_text.split("\n"), text.split("\n")) if a != b)
            len_diff = len(text) - len(original_text)
            print(f"Would change ~{line_diff} lines; net char delta {len_diff:+d}", file=sys.stderr)
        return

    if text != original_text:
        PORTALS_YML.write_text(text, encoding="utf-8")
        print(f"\nWrote: {PORTALS_YML}", file=sys.stderr)
    else:
        print("\nNo changes needed (file already in target state)", file=sys.stderr)


if __name__ == "__main__":
    main()
