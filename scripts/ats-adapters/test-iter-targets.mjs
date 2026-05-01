// scripts/ats-adapters/test-iter-targets.mjs
// Regression tests for cached-discovery adapter target iteration.
//
// Run from repo root:
//   node scripts/ats-adapters/test-iter-targets.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { iterTargets } from "./_lib.mjs";

test("iterTargets filters discovery-cache entries to current enabled portals.yml companies", () => {
  const portals = {
    tracked_companies: [
      { name: "A", enabled: true },
      { name: "C", enabled: false },
    ],
  };
  const cache = {
    A: { ats: "ashby", slug: "a" },
    B: { ats: "ashby", slug: "b" },
    C: { ats: "ashby", slug: "c" },
  };

  const targets = [...iterTargets(portals, cache, "ashby", { includePortals: false })];
  assert.deepEqual(
    targets.map((target) => target.companyName),
    ["A"]
  );
  assert.equal(targets[0].fetchArgs, "a");
});
