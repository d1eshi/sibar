import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { generateDeterministicArtifacts } from "../../engine/runtime-artifact-generation.ts";
import { loadFixture } from "./helpers.ts";

describe("Evidence Identity Stability Through Generation", () => {
  test("evidence refs in generated artifacts preserve stable ids from inventory", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);
    const inventoryIds = new Set(fixture.evidence_inventory.map((entry) => entry.id));

    for (const artifact of artifacts) {
      for (const ref of artifact.source_evidence) {
        assert.ok(inventoryIds.has(ref.evidence_id));
      }
    }
  });

  test("evidence refs preserve role from inventory", () => {
    const fixture = loadFixture();
    const roleById = new Map(fixture.evidence_inventory.map((entry) => [entry.id, entry.role]));
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      for (const ref of artifact.source_evidence) {
        const expectedRole = roleById.get(ref.evidence_id);
        if (expectedRole) {
          assert.equal(ref.role, expectedRole);
        }
      }
    }
  });
});
