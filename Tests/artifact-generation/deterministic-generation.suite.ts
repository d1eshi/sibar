import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  generateCodeSliceArtifact,
  generateDeterministicArtifacts,
  generateFlowDiagramArtifact,
  validateArtifactCitations,
  type GeneratedEdge,
  type GeneratedNode,
} from "../../engine/artifacts/generation.ts";
import { loadFixture } from "./helpers.ts";

describe("Deterministic Artifact Generation", () => {
  test("generateDeterministicArtifacts is deterministic with same inputs", () => {
    const fixture = loadFixture();
    const run1 = generateDeterministicArtifacts(fixture);
    const run2 = generateDeterministicArtifacts(fixture);

    assert.deepEqual(run1, run2);
  });

  test("generated artifacts from real fixture are citation-valid", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
      assert.equal(result.valid, true, `${artifact.id} should pass citation validation`);
    }
  });

  test("generated flow diagram has entry/terminal nodes and no orphan edges", () => {
    const fixture = loadFixture();
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const payload = flowDiagram.payload as Record<string, unknown>;
    const nodes = payload.nodes as GeneratedNode[];
    const edges = payload.edges as GeneratedEdge[];
    const nodeIds = new Set(nodes.map((node) => node.id));

    assert.ok(typeof payload.entry_node === "string");
    assert.ok(Array.isArray(payload.terminal_nodes));
    assert.ok((payload.terminal_nodes as string[]).length > 0);
    assert.ok(nodeIds.has(payload.entry_node as string));

    for (const terminalNode of payload.terminal_nodes as string[]) {
      assert.ok(nodeIds.has(terminalNode));
    }

    for (const edge of edges) {
      assert.ok(nodeIds.has(edge.from));
      assert.ok(nodeIds.has(edge.to));
    }
  });

  test("generated code slice includes related test references when available", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const payload = codeSlice.payload as Record<string, unknown>;
    const testEvidence = fixture.evidence_inventory.filter((entry) => entry.role === "behavior_oracle");

    if (testEvidence.length > 0) {
      assert.ok(Array.isArray(payload.related_tests));
      assert.ok((payload.related_tests as unknown[]).length > 0);
    }
  });
});
