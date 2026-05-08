---
status: transient
type: upgrade-notes
owner: shared
last-updated: 2026-05-05T10:55:00-04:00
read-if: "you are starting a session and have not yet acked this upgrade"
skip-if: "you already ran collab-update --ack or collab-init --ack-upgrade after reading this"
---

# Upgrade Notes - 0.4.1 -> 0.4.3

Run on 2026-05-05T10:55:00-04:00.

## What changed

>>> Upgrade summary (v0.4.1 -> v0.4.2):
>>>   - Rotation regex now accepts date-only entry headers (`## YYYY-MM-DD ...`). Previously required full datetime with T.
>>>   - `rotate_keep_recent` default changed from 8 to 3 in shipped templates. Existing `.collab/config.yml` files are not auto-modified; this repo preserved its existing value.
>>>   - CLI forwarding fixes for init/join/archive/register flags.
>>>   - Pre-commit hook is self-contained at install time.
>>>   - Restore/diff behavior is safer and migration sentinels make upgrades idempotent.
>>>   - UPGRADE_NOTES archive naming is richer.

>>> Upgrade summary (v0.4.2 -> v0.4.3):
>>>   - New `update` subcommand wraps pre-flight version check, confirmation, migration, and post-flight ack reminder.
>>>   - `update --rollback` cleans up stale migration sentinels for rolled-back migrations.
>>>   - `PROTOCOL.md` vocabulary now references the `update` command directly.
>>>   - Version and migration helper functions were extracted into `scripts/lib/semver.sh` and `scripts/lib/migrations.sh`.
>>>   - No user project state changes were required by the migrations.

## Local execution note

Codex could not execute Bash scripts in this Windows sandbox (`Git Bash` failed with Win32 error 5), so the migration was applied manually from the npm 0.4.3 tarball:

- local framework scripts were installed under `scripts/collab-*.sh`, `scripts/lib/*.sh`, `scripts/migrations/*.sh`, and `templates/`;
- `.collab/VERSION` was updated to `0.4.3`;
- `.collab/.migrations/` sentinels were written for migrations through `0.4.3`;
- `.collab/PROTOCOL.md` was refreshed from the 0.4.3 template;
- current project context, handoff docs, memories, and work logs were preserved.

A preservation zip was created before manual migration at:

`D:/Projects/career ops/.collab-upgrade-backups/pre-framework-upgrade-2026-05-05T10-55-00-04-00.zip`

## Post-upgrade ritual

Before the next substantive write:

1. Re-read `AI_AGENTS.md` `behavioral-rules`.
2. Skim the upgrade summary above.
3. Confirm no local context was lost.
4. After the user approves, archive/ack this note. In this Windows environment, Bash may still be unavailable, so archiving may need to be done manually if `scripts/collab-update.sh --ack` cannot run.
