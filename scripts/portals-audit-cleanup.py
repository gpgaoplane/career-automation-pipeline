#!/usr/bin/env python3
"""
One-shot Step 1 audit cleanup for career-ops/portals.yml.

HISTORICAL SCRIPT: this enforces the 2026-04-29 Phase 2.7 cleanup state
of 448 total / 428 enabled / 20 disabled. The current live roster after
the 2026-04-30 Step 0 disabled-company re-audit is 448 total / 397
enabled / 51 disabled.

Do not rerun this script for normal maintenance. It is retained only to
reproduce the historical Phase 2.7 cleanup state. Use current
career-ops/portals.yml plus
docs/audits/2026-04-30-step0-disabled-company-audit.md as the source of
truth.

Per design plan §4.1-§4.4:
- Re-enable 14 mis-drops (set enabled: true, no note).
- Add `note:` to 18 already-disabled entries (16 dup + 2 universal exclusions).
- Disable 2 inversions in enabled set (Foxconn rank 65, Skydio rank 437) with note.

Final state: 448 / 428 / 20 / 0 missing notes.

Operates on raw lines (regex) so YAML comments are preserved.
"""
import argparse
import re
import sys
from pathlib import Path

SRC = Path('career-ops/portals.yml')

parser = argparse.ArgumentParser()
parser.add_argument(
    "--allow-historical-phase27",
    action="store_true",
    help="Required guard: replay the superseded Phase 2.7 428/20 cleanup."
)
args = parser.parse_args()

if not args.allow_historical_phase27:
    print(
        "Refusing to run: scripts/portals-audit-cleanup.py would replay the "
        "superseded Phase 2.7 428-enabled roster. Current source of truth is "
        "career-ops/portals.yml plus docs/audits/2026-04-30-step0-disabled-company-audit.md. "
        "Pass --allow-historical-phase27 only if you intentionally need to reproduce "
        "the old state.",
        file=sys.stderr,
    )
    raise SystemExit(2)

# Companies to re-enable: identified by (name, rank) tuple
RE_ENABLE = {
    ('Sierra', 234),
    ('Tempus AI', 239),
    ('Databricks-adjacent: Fivetran', 255),
    ('Pigment', 302),
    ('Descript', 325),
    ('Tome', 344),
    ('AI coding: Tabnine', 350),
    ('Scale AI-adjacent: Labelbox', 366),
    ('Twelve Labs', 377),
    ('Runway-adjacent: Genmo', 387),
    ('Nomic AI', 390),
    ('Inworld AI', 423),
    ('Anysphere (Cursor)', 141),
    ('Nscale', 217),
}

# Companies to keep disabled, with note text (key by name+rank)
KEEP_DISABLED_NOTES = {
    ('Runway-adjacent: Lumen Orbis', 376): 'duplicate-of: Runway',
    ('Runway-adjacent: Kling AI', 178): 'duplicate-of: Runway',
    ('xAI/Grok', 446): 'duplicate-of: xAI',
    ('xAI Colossus', 445): 'duplicate-of: xAI',
    ('Foxconn-adjacent: Nebius', 164): 'duplicate-of: Nebius Group',
    ('Vercel-adjacent: Lovable', 443): 'duplicate-of: Lovable',
    ('Writer-adjacent: Anthropic Claude Code', 444): 'duplicate-of: Anthropic',
    ('Cohere-adjacent: Voyage AI', 405): 'duplicate-of: Cohere',
    ('Ramp AI', 223): 'duplicate-of: Ramp',
    ('Foxconn / Hon Hai', 88): 'duplicate-of: Foxconn',
    ('Stripe AI', 81): 'duplicate-of: Stripe',
    ('Runway-adjacent: HeyGen', 365): 'duplicate-of: HeyGen',
    ('Pika', 275): 'duplicate-of: Pika Labs',
    ('Anduril-adjacent: Skydio', 287): 'duplicate-of: Skydio',
    ('Databricks-adjacent: Snowflake AI', 75): 'duplicate-of: Snowflake',
    ('Adept AI', 314): 'duplicate-of: Adept',
    ('NVIDIA', 1): 'excluded:HW supply chain',
    ('Shield AI-adjacent: Saronic', 284): 'excluded:defense drones / maritime',
}

# Inversions: currently enabled, must be disabled with note
INVERT_TO_DISABLE = {
    ('Foxconn', 65): 'excluded:HW supply chain',
    ('Skydio', 437): 'excluded:defense drones / maritime',
}

text = SRC.read_text(encoding='utf-8')
lines = text.split('\n')

# Walk entries; an entry starts with `  - name: "..."` and runs until the next
# blank line OR next entry start. Within each entry, we know the layout:
#   - name: "..."
#     rank: NNN
#     category: "..."
#     careers_url: "..."
#     enabled: true|false
# We rewrite enabled: line in place; if a note is needed, we insert one line
# after enabled:.

NAME_RE = re.compile(r'^  - name:\s*"([^"]+)"\s*$')
RANK_RE = re.compile(r'^    rank:\s*(\d+)\s*$')
ENABLED_RE = re.compile(r'^(    enabled:\s*)(true|false)\s*$')

out = []
i = 0
re_enabled_count = 0
kept_with_note_count = 0
inverted_count = 0
seen_re_enable = set()
seen_keep_disabled = set()
seen_invert = set()

while i < len(lines):
    line = lines[i]
    m = NAME_RE.match(line)
    if not m:
        out.append(line)
        i += 1
        continue

    name = m.group(1)
    # Find rank (must be next 1-3 lines)
    rank = None
    for j in range(i + 1, min(i + 5, len(lines))):
        rm = RANK_RE.match(lines[j])
        if rm:
            rank = int(rm.group(1))
            break
    if rank is None:
        out.append(line)
        i += 1
        continue

    key = (name, rank)
    # Find enabled: line within this entry block (next blank line or next entry)
    enabled_idx = None
    block_end = i + 1
    for j in range(i + 1, len(lines)):
        if lines[j].strip() == '' or NAME_RE.match(lines[j]):
            block_end = j
            break
        if ENABLED_RE.match(lines[j]):
            enabled_idx = j

    # Emit name line
    out.append(line)

    # Emit lines from i+1 up to (but not including) enabled_idx
    if enabled_idx is None:
        # No enabled line found — emit unchanged
        for j in range(i + 1, block_end):
            out.append(lines[j])
        i = block_end
        continue

    for j in range(i + 1, enabled_idx):
        out.append(lines[j])

    # Now decide what to do with the enabled line and what comes after.
    em = ENABLED_RE.match(lines[enabled_idx])
    indent = em.group(1)
    cur_state = em.group(2)

    if key in RE_ENABLE:
        if cur_state != 'false':
            raise SystemExit(f'ERROR: {key} expected to be disabled, found enabled={cur_state}')
        out.append(f'{indent}true')
        re_enabled_count += 1
        seen_re_enable.add(key)
    elif key in KEEP_DISABLED_NOTES:
        if cur_state != 'false':
            raise SystemExit(f'ERROR: {key} expected disabled, found enabled={cur_state}')
        out.append(lines[enabled_idx])  # keep `enabled: false`
        # add note
        out.append(f'    note: "{KEEP_DISABLED_NOTES[key]}"')
        kept_with_note_count += 1
        seen_keep_disabled.add(key)
    elif key in INVERT_TO_DISABLE:
        if cur_state != 'true':
            raise SystemExit(f'ERROR: {key} expected enabled, found enabled={cur_state}')
        out.append(f'{indent}false')
        out.append(f'    note: "{INVERT_TO_DISABLE[key]}"')
        inverted_count += 1
        seen_invert.add(key)
    else:
        # Untouched — emit as-is
        out.append(lines[enabled_idx])

    # Emit remaining lines in block (after enabled_idx)
    for j in range(enabled_idx + 1, block_end):
        out.append(lines[j])
    i = block_end

# Sanity checks
missing_re_enable = set(RE_ENABLE) - seen_re_enable
missing_keep_disabled = set(KEEP_DISABLED_NOTES) - seen_keep_disabled
missing_invert = set(INVERT_TO_DISABLE) - seen_invert

if missing_re_enable:
    raise SystemExit(f'ERROR: re-enable entries not found in file: {missing_re_enable}')
if missing_keep_disabled:
    raise SystemExit(f'ERROR: keep-disabled entries not found in file: {missing_keep_disabled}')
if missing_invert:
    raise SystemExit(f'ERROR: invert entries not found in file: {missing_invert}')

if re_enabled_count != 14:
    raise SystemExit(f'ERROR: re-enabled {re_enabled_count}, expected 14')
if kept_with_note_count != 18:
    raise SystemExit(f'ERROR: kept-with-note {kept_with_note_count}, expected 18')
if inverted_count != 2:
    raise SystemExit(f'ERROR: inverted {inverted_count}, expected 2')

SRC.write_text('\n'.join(out), encoding='utf-8')
print(f'OK: re-enabled={re_enabled_count}, kept-with-note={kept_with_note_count}, inverted={inverted_count}')
print(f'Final: {18+2} disabled with note, {14} mis-drops re-enabled.')
