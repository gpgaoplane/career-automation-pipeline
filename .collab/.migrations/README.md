---
status: managed
type: framework-state
owner: shared
last-updated: 2026-05-05T10:55:00-04:00
read-if: "you are inspecting which migrations have already been applied"
skip-if: "always - this is framework runtime state, not user content"
---

# Migration sentinels

Each `<from>-to-<to>.applied` file records that the corresponding migration script in `scripts/migrations/` has already run against this install. The chain runner consults these sentinels to make repeated upgrades safe.

Do not edit by hand. To force re-run of a specific migration, delete its sentinel file and re-run the framework updater.
