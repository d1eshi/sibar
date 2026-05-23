import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  RECOGNIZED_ARTIFACT_KINDS,
  RECOGNIZED_EVIDENCE_ROLES,
  RECOGNIZED_OPERATION_KINDS,
} from "../../engine/runtime-deep-ownership.ts";
import {
  generateCodeSliceArtifact,
  generateDeterministicArtifacts,
  generateFlowDiagramArtifact,
  validateArtifactCitations,
} from "../../engine/artifacts/generation.ts";
import { loadFixture } from "./helpers.ts";

describe("VAL-ARTIFACT-005: Shared Evidence Contract", () => {
  test("code slice and flow diagram conform to ThinkingArtifact schema", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    const requiredFields = [
      "id",
      "kind",
      "title",
      "purpose",
      "concept_slice_id",
      "source_evidence",
      "hidden_solution_evidence",
      "user_operation",
      "renderer",
      "payload",
      "success_criteria",
      "created_at",
    ];

    for (const artifact of [codeSlice, flowDiagram]) {
      for (const field of requiredFields) {
        assert.ok(field in artifact, `${artifact.kind} artifact missing required field: ${field}`);
      }
      assert.ok(RECOGNIZED_ARTIFACT_KINDS.includes(artifact.kind));
    }
  });

  test("both artifact kinds cite source evidence with full EvidenceRef contract", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      for (const ref of artifact.source_evidence) {
        assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0);
        assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0);
        assert.ok(typeof ref.start_line === "number" && ref.start_line >= 0);
        assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line);
        assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0);
        assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role));
      }
    }
  });

  test("both artifact kinds include success criteria and operation-bearing user_operation", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      assert.ok(Array.isArray(artifact.success_criteria) && artifact.success_criteria.length > 0);
      for (const criterion of artifact.success_criteria) {
        assert.ok(typeof criterion === "string" && criterion.trim().length > 0);
      }

      assert.ok(RECOGNIZED_OPERATION_KINDS.includes(artifact.user_operation.kind));
      assert.ok(artifact.user_operation.prompt.length > 0);
      assert.ok(Array.isArray(artifact.user_operation.required_evidence));
      assert.ok(artifact.user_operation.required_evidence.length > 0);
    }
  });

  test("both artifact kinds preserve hidden solution boundaries", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      assert.ok(Array.isArray(artifact.hidden_solution_evidence));
      for (const ref of artifact.hidden_solution_evidence) {
        assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0);
        assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0);
        assert.ok(typeof ref.start_line === "number");
        assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line);
        assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0);
        assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role));
      }
      assert.ok(artifact.source_evidence.length > 0);
    }
  });

  test("generated artifacts are citation-valid and include expected kinds", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);
    const kinds = artifacts.map((artifact) => artifact.kind);

    assert.ok(kinds.includes("code_slice"));
    assert.ok(kinds.includes("flow_diagram"));

    for (const artifact of artifacts) {
      const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
      assert.equal(result.valid, true, `${artifact.id}: ${result.summary}`);
    }
  });
});
