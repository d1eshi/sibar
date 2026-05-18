import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  type ThinkingArtifact,
  RECOGNIZED_EVIDENCE_ROLES,
  RECOGNIZED_OPERATION_KINDS,
} from "../../src/runtime-deep-ownership.ts";

import {
  generateCodeSliceArtifact,
  generateFlowDiagramArtifact,
  validateArtifactCitations,
  isClaimUncited,
  markInferred,
  type ArtifactClaim,
  type GeneratedNode,
  type GeneratedEdge,
} from "../../src/runtime-artifact-generation.ts";
import { loadFixture } from "./helpers.ts";

describe("VAL-ARTIFACT-002: Artifact Citation Grounding", () => {
  test("generateCodeSliceArtifact produces a valid ThinkingArtifact with cited evidence", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
      { artifactIdPrefix: "TA-GEN" },
    );

    assert.ok(artifact);
    assert.equal(artifact.kind, "code_slice");
    assert.ok(artifact.id.startsWith("TA-GEN"));
    assert.ok(artifact.title.length > 0);
    assert.ok(artifact.purpose.length > 0);
    assert.ok(artifact.source_evidence.length > 0);
    assert.ok(artifact.success_criteria.length > 0);
    assert.ok(artifact.user_operation.kind);
    assert.ok(artifact.user_operation.prompt.length > 0);
    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(artifact.user_operation.kind));
  });

  test("generateCodeSliceArtifact payload includes file path and line ranges", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const payload = artifact.payload as Record<string, unknown>;

    assert.ok(typeof payload.file_path === "string");
    assert.ok(Array.isArray(payload.ranges));
    assert.ok((payload.ranges as unknown[]).length > 0);

    const firstRange = (payload.ranges as Record<string, unknown>[])[0];
    assert.ok(typeof firstRange.start_line === "number");
    assert.ok(typeof firstRange.end_line === "number");
    assert.ok(typeof firstRange.label === "string");
  });

  test("every source_evidence ref in generated artifact cites real evidence entries", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const evidenceIds = new Set(fixture.evidence_inventory.map((entry) => entry.id));

    for (const ref of artifact.source_evidence) {
      assert.ok(evidenceIds.has(ref.evidence_id));
      assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0);
      assert.ok(typeof ref.start_line === "number");
      assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line);
      assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0);
      assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role));
    }
  });

  test("artifact claims without evidence citations are marked inferred or unknown", () => {
    const claim: ArtifactClaim = {
      text: "This module connects to the database",
      cited_evidence: [],
      is_inferred: false,
      is_unknown: false,
    };

    assert.equal(isClaimUncited(claim), true);
    const marked = markInferred(claim);
    assert.equal(marked.is_inferred, true);
    assert.equal(isClaimUncited(marked), false);
  });

  test("isClaimUncited handles cited, inferred, and unknown claims", () => {
    const cited: ArtifactClaim = {
      text: "Cited",
      cited_evidence: ["EV-001"],
      is_inferred: false,
      is_unknown: false,
    };
    const inferred: ArtifactClaim = {
      text: "Inferred",
      cited_evidence: [],
      is_inferred: true,
      is_unknown: false,
    };
    const unknown: ArtifactClaim = {
      text: "Unknown",
      cited_evidence: [],
      is_inferred: false,
      is_unknown: true,
    };

    assert.equal(isClaimUncited(cited), false);
    assert.equal(isClaimUncited(inferred), false);
    assert.equal(isClaimUncited(unknown), false);
  });

  test("validateArtifactCitations rejects artifact with uncited claims", () => {
    const artifact: ThinkingArtifact = {
      id: "TA-TEST-UNCITED",
      kind: "code_slice",
      title: "Uncited Artifact",
      purpose: "This artifact contains an uncited claim about the codebase",
      concept_slice_id: "CS-001",
      source_evidence: [],
      hidden_solution_evidence: [],
      user_operation: {
        id: "OP-TEST",
        kind: "trace",
        prompt: "Trace something",
        artifact_ids: ["TA-TEST-UNCITED"],
        required_evidence: [],
        allowed_hints: 1,
        blocked_shortcuts: [],
        success_criteria: ["Complete the trace"],
      },
      renderer: "code_slice",
      payload: { file_path: "src/nonexistent.ts" },
      success_criteria: ["Complete the trace"],
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const fixture = loadFixture();
    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
    assert.equal(result.valid, false);
    assert.ok(result.uncited_claims.length > 0);
  });

  test("validateArtifactCitations passes for well-cited artifact", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);

    assert.equal(result.valid, true, result.summary);
    assert.equal(result.uncited_claims.length, 0);
  });

  test("validateArtifactCitations marks orphaned evidence refs", () => {
    const artifact: ThinkingArtifact = {
      id: "TA-TEST-ORPHAN",
      kind: "code_slice",
      title: "Orphan Ref Artifact",
      purpose: "Tests orphaned evidence refs",
      concept_slice_id: "CS-001",
      source_evidence: [
        {
          evidence_id: "EV-999",
          file_path: "src/ghost.ts",
          start_line: 1,
          end_line: 10,
          excerpt: "Ghost evidence",
          role: "implementation",
        },
      ],
      hidden_solution_evidence: [],
      user_operation: {
        id: "OP-TEST",
        kind: "trace",
        prompt: "Trace something",
        artifact_ids: ["TA-TEST-ORPHAN"],
        required_evidence: ["EV-999"],
        allowed_hints: 1,
        blocked_shortcuts: [],
        success_criteria: ["Complete"],
      },
      renderer: "code_slice",
      payload: {},
      success_criteria: ["Complete"],
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const fixture = loadFixture();
    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);

    assert.equal(result.valid, false);
    assert.ok(result.orphaned_refs.length > 0);
    assert.ok(result.orphaned_refs.some((ref) => ref.evidence_id === "EV-999"));
  });

  test("generated flow diagram nodes and edges cite evidence or are inferred", () => {
    const fixture = loadFixture();
    const artifact = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const payload = artifact.payload as Record<string, unknown>;
    const nodes = payload.nodes as GeneratedNode[];
    const edges = payload.edges as GeneratedEdge[];

    assert.ok(Array.isArray(nodes) && nodes.length > 0);
    assert.ok(Array.isArray(edges) && edges.length > 0);

    for (const node of nodes) {
      const hasEvidence = Array.isArray(node.evidence) && node.evidence.length > 0;
      assert.ok(hasEvidence || node.is_inferred === true);
    }

    for (const edge of edges) {
      const hasEvidence = Array.isArray(edge.evidence) && edge.evidence.length > 0;
      assert.ok(hasEvidence || edge.is_inferred === true);
    }
  });
});
