import test, { describe } from "node:test";
import assert from "node:assert/strict";

import type { ThinkingArtifact } from "../../engine/runtime-deep-ownership.ts";
import {
  generateCodeSliceArtifact,
  generateDeterministicArtifacts,
  generateFlowDiagramArtifact,
  validateArtifactCitations,
} from "../../engine/artifacts/generation.ts";
import { loadFixture, makeConceptSlice, makeEvidenceEntry } from "./helpers.ts";

describe("Hidden Solution & Fail-Closed Behavior", () => {
  test("generated artifacts preserve hidden_solution_evidence refs", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);
    const evidenceIds = new Set(fixture.evidence_inventory.map((entry) => entry.id));

    for (const artifact of artifacts) {
      assert.ok(Array.isArray(artifact.hidden_solution_evidence));
      for (const ref of artifact.hidden_solution_evidence) {
        assert.ok(evidenceIds.has(ref.evidence_id));
      }
    }
  });

  test("generation fails closed for empty inventory and empty source evidence", () => {
    assert.throws(() => generateCodeSliceArtifact([], makeConceptSlice()), /inventory|evidence/i);

    const inventory = [makeEvidenceEntry()];
    const emptySlice = makeConceptSlice({ source_evidence: [] });
    assert.throws(() => generateCodeSliceArtifact(inventory, emptySlice), /source evidence|concept slice/i);
  });

  test("flow diagram generation fails when concept evidence is absent from inventory", () => {
    const inventory = [makeEvidenceEntry({ id: "EV-OTHER" })];
    const slice = makeConceptSlice({ source_evidence: ["EV-001"] });

    assert.throws(
      () => generateFlowDiagramArtifact(inventory, slice),
      /evidence|cannot generate/i,
    );
  });

  test("validateArtifactCitations fails closed on empty artifact shape", () => {
    const emptyArtifact: ThinkingArtifact = {
      id: "",
      kind: "code_slice",
      title: "",
      purpose: "",
      concept_slice_id: "",
      source_evidence: [],
      hidden_solution_evidence: [],
      user_operation: {
        id: "",
        kind: "trace",
        prompt: "",
        artifact_ids: [],
        required_evidence: [],
        allowed_hints: 0,
        blocked_shortcuts: [],
        success_criteria: [],
      },
      renderer: "code_slice",
      payload: {},
      success_criteria: [],
      created_at: "",
    };

    const result = validateArtifactCitations(emptyArtifact, loadFixture().evidence_inventory);
    assert.equal(result.valid, false);
  });
});
