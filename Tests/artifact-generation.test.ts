import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  type DeepOwnershipFixture,
  type ThinkingArtifact,
  type EvidenceRef,
  type EvidenceInventoryEntry,
  type ConceptSlice,
  RECOGNIZED_EVIDENCE_ROLES,
  RECOGNIZED_ARTIFACT_KINDS,
  RECOGNIZED_OPERATION_KINDS,
} from "../src/runtime-deep-ownership.ts";

import {
  generateCodeSliceArtifact,
  generateFlowDiagramArtifact,
  validateArtifactCitations,
  resolveEvidenceAuthority,
  generateDeterministicArtifacts,
  isClaimUncited,
  markInferred,
  type ArtifactClaim,
  type CitationValidationResult,
  type AuthorityCheckResult,
  type GeneratedNode,
  type GeneratedEdge,
  AUTHORITY_RANK,
} from "../src/runtime-artifact-generation.ts";

// ── Helpers ───────────────────────────────────────────────────────────

const FIXTURE_PATH = "docs/specs/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

function loadFixture(): DeepOwnershipFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

function makeEvidenceEntry(overrides: Partial<EvidenceInventoryEntry> = {}): EvidenceInventoryEntry {
  return {
    id: "EV-TEST",
    path: "src/test-module.ts",
    source_type: "source_truth",
    size_bytes: 1000,
    extension: ".ts",
    role: "implementation",
    content_hash: "sha256:abcdef01",
    excerpt: "Test module excerpt",
    status: "inspected",
    line_count: 50,
    ...overrides,
  };
}

function makeConceptSlice(overrides: Partial<ConceptSlice> = {}): ConceptSlice {
  return {
    id: "CS-001",
    label: "Test concept",
    domain: "code",
    operation_target: "trace",
    prerequisite_concepts: [],
    source_evidence: ["EV-001"],
    behavior_evidence: ["EV-007"],
    risk_evidence: [],
    expected_user_operations: ["trace", "explain"],
    ...overrides,
  };
}

// ── VAL-ARTIFACT-002: Artifacts Are Grounded ──────────────────────────

describe("VAL-ARTIFACT-002: Artifact Citation Grounding", () => {
  test("generateCodeSliceArtifact produces a valid ThinkingArtifact with cited evidence", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
      { artifactIdPrefix: "TA-GEN" },
    );

    assert.ok(artifact, "Should produce an artifact");
    assert.equal(artifact.kind, "code_slice");
    assert.ok(artifact.id.startsWith("TA-GEN"), `Artifact ID should have prefix: ${artifact.id}`);
    assert.ok(artifact.title.length > 0, "Artifact must have a title");
    assert.ok(artifact.purpose.length > 0, "Artifact must have a purpose");
    assert.ok(artifact.source_evidence.length > 0, "Artifact must have source evidence");
    assert.ok(artifact.success_criteria.length > 0, "Artifact must have success criteria");
    assert.ok(artifact.user_operation.kind, "Artifact must have an operation");
    assert.ok(artifact.user_operation.prompt.length > 0, "Artifact must have an operation prompt");
    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(artifact.user_operation.kind));
  });

  test("generateCodeSliceArtifact payload includes file path and line ranges", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const payload = artifact.payload as Record<string, unknown>;
    assert.ok(typeof payload.file_path === "string", "Payload must have file_path");
    assert.ok(Array.isArray(payload.ranges), "Payload must have ranges array");
    assert.ok((payload.ranges as unknown[]).length > 0, "Payload must have at least one range");
    const firstRange = (payload.ranges as Record<string, unknown>[])[0];
    assert.ok(typeof firstRange.start_line === "number", "Range must have start_line");
    assert.ok(typeof firstRange.end_line === "number", "Range must have end_line");
    assert.ok(typeof firstRange.label === "string", "Range must have label");
  });

  test("every source_evidence ref in generated artifact cites real evidence entries", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const evidenceIds = new Set(fixture.evidence_inventory.map((e) => e.id));
    for (const ref of artifact.source_evidence) {
      assert.ok(
        evidenceIds.has(ref.evidence_id),
        `Evidence ref ${ref.evidence_id} in artifact source_evidence must reference a real evidence entry`,
      );
      assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0);
      assert.ok(typeof ref.start_line === "number");
      assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line);
      assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0);
      assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role));
    }
  });

  test("artifact claims without evidence citations are marked inferred or unknown", () => {
    // A claim is a statement in the artifact (e.g., a node label, a purpose line)
    // that asserts something about the codebase. If it cannot cite evidence,
    // it must be marked as inferred or unknown — not silently accepted.

    const claim: ArtifactClaim = {
      text: "This module connects to the database",
      cited_evidence: [],  // No evidence cited
      is_inferred: false,
      is_unknown: false,
    };

    assert.equal(isClaimUncited(claim), true, "Claim with no evidence should be detected as uncited");

    const marked = markInferred(claim);
    assert.equal(marked.is_inferred, true, "Uncited claim should be marked inferred after marking");
    assert.equal(isClaimUncited(marked), false, "Inferred-marked claim should no longer be uncited");
  });

  test("isClaimUncited returns false for claims with cited evidence", () => {
    const claim: ArtifactClaim = {
      text: "This module connects to the database",
      cited_evidence: ["EV-001"],
      is_inferred: false,
      is_unknown: false,
    };
    assert.equal(isClaimUncited(claim), false, "Claim with evidence should not be uncited");
  });

  test("isClaimUncited returns false for claims explicitly marked inferred", () => {
    const claim: ArtifactClaim = {
      text: "This module probably connects to the database",
      cited_evidence: [],
      is_inferred: true,  // Explicitly marked as inference
      is_unknown: false,
    };
    assert.equal(isClaimUncited(claim), false, "Explicitly inferred claims should be treated as cited");
  });

  test("isClaimUncited returns false for claims explicitly marked unknown", () => {
    const claim: ArtifactClaim = {
      text: "We do not know what this module does",
      cited_evidence: [],
      is_inferred: false,
      is_unknown: true,  // Explicitly marked unknown
    };
    assert.equal(isClaimUncited(claim), false, "Explicitly unknown claims should be treated as cited");
  });

  test("validateArtifactCitations rejects artifact with uncited claims", () => {
    const artifact: ThinkingArtifact = {
      id: "TA-TEST-UNCITED",
      kind: "code_slice",
      title: "Uncited Artifact",
      purpose: "This artifact contains an uncited claim about the codebase",
      concept_slice_id: "CS-001",
      source_evidence: [], // Empty! The purpose string makes a claim but cites nothing
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
      created_at: new Date().toISOString(),
    };

    const inventory = loadFixture().evidence_inventory;
    const result = validateArtifactCitations(artifact, inventory);

    assert.equal(result.valid, false, "Artifact with no source evidence should fail citation validation");
    assert.ok(result.uncited_claims.length > 0, "Should detect uncited claims");
    assert.ok(
      result.summary.includes("uncited") || result.summary.includes("no source evidence"),
      `Summary should mention uncited: ${result.summary}`,
    );
  });

  test("validateArtifactCitations passes for well-cited artifact", () => {
    const fixture = loadFixture();
    const artifact = generateCodeSliceArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
    assert.equal(result.valid, true, `Well-cited artifact should pass validation: ${result.summary}`);
    assert.equal(result.uncited_claims.length, 0, "Should have zero uncited claims");
  });

  test("validateArtifactCitations marks orphaned evidence refs (refs to non-existent evidence)", () => {
    const artifact: ThinkingArtifact = {
      id: "TA-TEST-ORPHAN",
      kind: "code_slice",
      title: "Orphan Ref Artifact",
      purpose: "Tests orphaned evidence refs",
      concept_slice_id: "CS-001",
      source_evidence: [
        {
          evidence_id: "EV-999", // Doesn't exist in inventory
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
      created_at: new Date().toISOString(),
    };

    const inventory = loadFixture().evidence_inventory;
    const result = validateArtifactCitations(artifact, inventory);

    assert.equal(result.valid, false, "Artifact citing non-existent evidence should fail");
    assert.ok(
      result.orphaned_refs.length > 0,
      "Should detect orphaned evidence refs",
    );
    assert.ok(
      result.orphaned_refs.some((r) => r.evidence_id === "EV-999"),
      "Should detect EV-999 as orphaned",
    );
  });

  test("generated flow diagram nodes cite evidence or are marked inferred", () => {
    const fixture = loadFixture();
    const artifact = generateFlowDiagramArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const payload = artifact.payload as Record<string, unknown>;
    const nodes = payload.nodes as GeneratedNode[];
    assert.ok(Array.isArray(nodes) && nodes.length > 0, "Flow diagram must have nodes");

    for (const node of nodes) {
      // Every node must either cite evidence or be marked inferred
      const hasEvidence = Array.isArray(node.evidence) && node.evidence.length > 0;
      const isMarkedInferred = node.is_inferred === true;

      assert.ok(
        hasEvidence || isMarkedInferred,
        `Node "${node.label}" has no evidence and is not marked inferred. ` +
        `Every important node must cite evidence or be explicitly marked inferred/unknown.`,
      );

      if (hasEvidence) {
        for (const evId of node.evidence) {
          const exists = fixture.evidence_inventory.some((e) => e.id === evId);
          assert.ok(exists, `Node "${node.label}" cites evidence "${evId}" which does not exist in inventory`);
        }
      }
    }
  });

  test("generated flow diagram edges cite evidence or are marked inferred", () => {
    const fixture = loadFixture();
    const artifact = generateFlowDiagramArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const payload = artifact.payload as Record<string, unknown>;
    const edges = payload.edges as GeneratedEdge[];
    assert.ok(Array.isArray(edges) && edges.length > 0, "Flow diagram must have edges");

    for (const edge of edges) {
      const hasEvidence = Array.isArray(edge.evidence) && edge.evidence.length > 0;
      const isMarkedInferred = edge.is_inferred === true;

      assert.ok(
        hasEvidence || isMarkedInferred,
        `Edge from "${edge.from}" to "${edge.to}" has no evidence and is not marked inferred. ` +
        `Every important edge must cite evidence or be explicitly marked inferred.`,
      );

      if (hasEvidence) {
        for (const evId of edge.evidence) {
          const exists = fixture.evidence_inventory.some((e) => e.id === evId);
          assert.ok(exists, `Edge ${edge.from}→${edge.to} cites evidence "${evId}" which does not exist`);
        }
      }
    }
  });
});

// ── VAL-ARTIFACT-005: Code Slice and Flow Diagram Same Evidence Contract

describe("VAL-ARTIFACT-005: Shared Evidence Contract", () => {
  test("code slice and flow diagram artifacts conform to the same ThinkingArtifact schema", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    // Both must have the same required fields from ThinkingArtifact
    const requiredFields = [
      "id", "kind", "title", "purpose", "concept_slice_id",
      "source_evidence", "hidden_solution_evidence", "user_operation",
      "renderer", "payload", "success_criteria", "created_at",
    ];

    for (const artifact of [codeSlice, flowDiagram]) {
      for (const field of requiredFields) {
        assert.ok(
          field in artifact,
          `${artifact.kind} artifact missing required field: ${field}`,
        );
      }
      assert.ok(RECOGNIZED_ARTIFACT_KINDS.includes(artifact.kind));
    }
  });

  test("both code slice and flow diagram cite source evidence with full EvidenceRef contract", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      for (const ref of artifact.source_evidence) {
        assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0,
          `${artifact.kind}: evidence_id required`);
        assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0,
          `${artifact.kind}: file_path required`);
        assert.ok(typeof ref.start_line === "number" && ref.start_line >= 0,
          `${artifact.kind}: start_line required`);
        assert.ok(typeof ref.end_line === "number" && ref.end_line > (ref.start_line as number),
          `${artifact.kind}: end_line must be > start_line`);
        assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0,
          `${artifact.kind}: non-empty excerpt required`);
        assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role),
          `${artifact.kind}: recognized role required, got '${ref.role}'`);
      }
    }
  });

  test("both artifact kinds include success criteria", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      assert.ok(
        Array.isArray(artifact.success_criteria) && artifact.success_criteria.length > 0,
        `${artifact.kind}: must have non-empty success_criteria`,
      );
      for (const criterion of artifact.success_criteria) {
        assert.ok(typeof criterion === "string" && criterion.trim().length > 0,
          `${artifact.kind}: each success criterion must be non-empty string`);
      }
    }
  });

  test("both artifact kinds have an operation-bearing user_operation", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      assert.ok(artifact.user_operation, `${artifact.kind}: must have user_operation`);
      assert.ok(
        RECOGNIZED_OPERATION_KINDS.includes(artifact.user_operation.kind),
        `${artifact.kind}: must have recognized operation kind`,
      );
      assert.ok(
        artifact.user_operation.prompt.length > 0,
        `${artifact.kind}: operation prompt required`,
      );
      assert.ok(
        Array.isArray(artifact.user_operation.required_evidence) &&
          artifact.user_operation.required_evidence.length > 0,
        `${artifact.kind}: operation must require evidence`,
      );
    }
  });

  test("both artifact kinds preserve hidden solution evidence boundaries", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    for (const artifact of [codeSlice, flowDiagram]) {
      assert.ok(
        Array.isArray(artifact.hidden_solution_evidence),
        `${artifact.kind}: hidden_solution_evidence must be an array`,
      );

      // Hidden solution evidence refs, if present, must conform to EvidenceRef contract
      for (const ref of artifact.hidden_solution_evidence) {
        assert.ok(typeof ref.evidence_id === "string" && ref.evidence_id.length > 0);
        assert.ok(typeof ref.file_path === "string" && ref.file_path.length > 0);
        assert.ok(typeof ref.start_line === "number");
        assert.ok(typeof ref.end_line === "number" && ref.end_line > ref.start_line);
        assert.ok(typeof ref.excerpt === "string" && ref.excerpt.trim().length > 0);
        assert.ok(RECOGNIZED_EVIDENCE_ROLES.includes(ref.role));
      }

      // Source evidence must remain accessible independent of hidden evidence
      assert.ok(artifact.source_evidence.length > 0,
        `${artifact.kind}: source_evidence should remain accessible even when hidden evidence exists`);
    }
  });

  test("generated artifacts can be validated by the fixture validation schema", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(fixture.evidence_inventory, fixture.concept_slice);
    const flowDiagram = generateFlowDiagramArtifact(fixture.evidence_inventory, fixture.concept_slice);

    // Manually validate that each generated artifact passes basic checks
    for (const artifact of [codeSlice, flowDiagram]) {
      assert.ok(RECOGNIZED_ARTIFACT_KINDS.includes(artifact.kind));
      assert.ok(artifact.id.length > 0);
      assert.ok(artifact.title.length > 0);
      assert.ok(artifact.purpose.length > 0);
      assert.ok(artifact.source_evidence.length > 0);
      assert.ok(artifact.success_criteria.length > 0);
      assert.ok(artifact.user_operation.kind.length > 0);
      assert.ok(artifact.user_operation.prompt.length > 0);
      assert.ok(artifact.user_operation.required_evidence.length > 0);
      assert.ok(artifact.user_operation.success_criteria.length > 0);
    }
  });

  test("generateDeterministicArtifacts produces code_slice and flow_diagram for concept slice", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    assert.ok(Array.isArray(artifacts), "Should return an array of artifacts");
    assert.ok(artifacts.length >= 2, "Should produce at least 2 artifacts (code_slice + flow_diagram)");

    const kinds = artifacts.map((a) => a.kind);
    assert.ok(kinds.includes("code_slice"), "Must produce a code_slice artifact");
    assert.ok(kinds.includes("flow_diagram"), "Must produce a flow_diagram artifact");

    // Each artifact must have valid citations
    for (const artifact of artifacts) {
      const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
      assert.equal(result.valid, true,
        `Generated artifact ${artifact.id} failed citation validation: ${result.summary}`);
    }
  });
});

// ── VAL-INTEL-004: Evidence Roles Control Claim Strength ──────────────

describe("VAL-INTEL-004: Source Authority Handling", () => {
  test("resolveEvidenceAuthority returns implementation as highest authority", () => {
    const result = resolveEvidenceAuthority(
      "implementation",
      "intent", // Docs/spec claiming something
    );
    assert.equal(result.authoritative_source, "implementation",
      "Implementation should win over intent/docs when they conflict");
    assert.equal(result.conflict, true);
    assert.ok(result.resolution.includes("implementation"), "Resolution should mention implementation wins");
  });

  test("resolveEvidenceAuthority returns behavior_oracle as higher authority than intent", () => {
    const result = resolveEvidenceAuthority(
      "behavior_oracle", // Test showing behavior
      "intent", // Docs claiming something else
    );
    assert.equal(result.authoritative_source, "behavior_oracle",
      "Behavior oracle (tests) should win over intent/docs");
    assert.equal(result.conflict, true);
  });

  test("resolveEvidenceAuthority marks unknown when roles are equal and conflict", () => {
    const result = resolveEvidenceAuthority(
      "intent",
      "historical_rationale",
    );
    // Both are lower-authority; resolution should mark unknown or note both equal
    assert.ok(
      result.authoritative_source === "unknown" || result.conflict === true,
      "Equal low-authority roles should produce unknown or conflict marker",
    );
  });

  test("resolveEvidenceAuthority returns no conflict for identical roles", () => {
    const result = resolveEvidenceAuthority("implementation", "implementation");
    assert.equal(result.conflict, false, "Identical roles should not conflict");
    assert.equal(result.authoritative_source, "implementation");
  });

  test("resolveEvidenceAuthority treats source_truth equal to implementation", () => {
    const result = resolveEvidenceAuthority("source_truth", "intent");
    assert.equal(result.authoritative_source, "source_truth",
      "Source truth is equal to implementation in authority");
    assert.equal(result.conflict, true);
  });

  test("AUTHORITY_RANK orders roles correctly", () => {
    // Higher rank = more authoritative
    assert.ok(AUTHORITY_RANK["source_truth"] > AUTHORITY_RANK["intent"],
      "source_truth should rank above intent");
    assert.ok(AUTHORITY_RANK["implementation"] > AUTHORITY_RANK["intent"],
      "implementation should rank above intent");
    assert.ok(AUTHORITY_RANK["implementation"] > AUTHORITY_RANK["historical_rationale"],
      "implementation should rank above historical rationale");
    assert.ok(AUTHORITY_RANK["behavior_oracle"] > AUTHORITY_RANK["intent"],
      "behavior_oracle (tests) should rank above intent/docs");
    assert.ok(AUTHORITY_RANK["counterexample"] > AUTHORITY_RANK["intent"],
      "counterexample should rank above intent");
    assert.ok(AUTHORITY_RANK["unknown"] < AUTHORITY_RANK["implementation"],
      "unknown should rank below implementation");
  });

  test("generated flow diagram produces unknown marker for nodes with conflicting evidence roles", () => {
    // Create evidence inventory with conflicting roles
    const conflictingInventory: EvidenceInventoryEntry[] = [
      makeEvidenceEntry({
        id: "EV-IMPL",
        path: "src/module.ts",
        role: "implementation",
        excerpt: "Implementation says X",
      }),
      makeEvidenceEntry({
        id: "EV-DOCS",
        path: "docs/readme.md",
        role: "intent",
        excerpt: "Docs say Y (opposite of X)",
        extension: ".md",
        source_type: "intent",
      }),
      makeEvidenceEntry({
        id: "EV-TEST",
        path: "Tests/module.test.ts",
        role: "behavior_oracle",
        excerpt: "Tests confirm implementation behavior X",
        source_type: "behavior_oracle",
        extension: ".test.ts",
      }),
    ];

    const conceptSlice = makeConceptSlice({
      id: "CS-CONFLICT",
      source_evidence: ["EV-IMPL", "EV-DOCS", "EV-TEST"],
      behavior_evidence: ["EV-TEST"],
    });

    const flowDiagram = generateFlowDiagramArtifact(conflictingInventory, conceptSlice);
    const payload = flowDiagram.payload as Record<string, unknown>;
    const nodes = payload.nodes as GeneratedNode[];

    // Find or verify that nodes with evidence from conflicting roles produce markers
    const docNode = nodes.find((n) => n.evidence?.includes("EV-DOCS"));
    if (docNode && docNode.evidence && docNode.evidence.includes("EV-IMPL")) {
      // Node cites both implementation and docs — should have some conflict marker
      assert.ok(
        docNode.is_inferred === true || docNode.role === "unknown",
        `Node with conflicting evidence roles should be marked inferred or unknown, got is_inferred=${docNode.is_inferred}, role=${docNode.role}`,
      );
    }
  });

  test("generated artifacts do not treat lower-authority evidence as definitive", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      const result = validateArtifactCitations(artifact, fixture.evidence_inventory);

      // Any claim that relies only on intent/unknown evidence should be marked
      for (const issue of result.issues) {
        assert.ok(
          !issue.includes("definitive") || issue.includes("unknown"),
          "Should not have unmarked definitive claims from lower authority evidence",
        );
      }
    }
  });

  test("contradicting evidence roles in code slice produce unknown/explicit markers", () => {
    // Code slice over conflicting implementation vs docs evidence should mark ambiguity
    const conflictingInventory: EvidenceInventoryEntry[] = [
      makeEvidenceEntry({
        id: "EV-CODE",
        path: "src/module.ts",
        role: "implementation",
        excerpt: "Implementation does A",
      }),
      makeEvidenceEntry({
        id: "EV-README",
        path: "README.md",
        role: "intent",
        excerpt: "README says module does B",
        extension: ".md",
        source_type: "intent",
      }),
    ];

    const slice = makeConceptSlice({
      source_evidence: ["EV-CODE", "EV-README"],
    });

    const codeSlice = generateCodeSliceArtifact(conflictingInventory, slice);

    // The purpose or payload should acknowledge the conflict, not silently pick one
    const purpose = codeSlice.purpose.toLowerCase();
    // Either mentions both evidence sources, or marks uncertainty
    const purposeHasBoth = purpose.includes("ev-code") && purpose.includes("ev-readme");
    const purposeHasUncertainty =
      purpose.includes("conflict") ||
      purpose.includes("ambiguous") ||
      purpose.includes("unknown") ||
      purpose.includes("inferred");

    assert.ok(
      purposeHasBoth || purposeHasUncertainty,
      `Purpose should acknowledge conflicting evidence: "${codeSlice.purpose}"`,
    );
  });
});

// ── Hidden Solution & Fail-Closed ─────────────────────────────────────

describe("Hidden Solution & Fail-Closed Behavior", () => {
  test("generated artifacts preserve hidden_solution_evidence as array", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      assert.ok(Array.isArray(artifact.hidden_solution_evidence),
        `Artifact ${artifact.id}: hidden_solution_evidence must be an array`);
      // Hidden evidence is allowed in full artifact; pre-attempt snapshot strips it
    }
  });

  test("hidden_solution_evidence refs in generated artifacts reference real evidence entries", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    const evidenceIds = new Set(fixture.evidence_inventory.map((e) => e.id));
    for (const artifact of artifacts) {
      for (const ref of artifact.hidden_solution_evidence) {
        assert.ok(
          evidenceIds.has(ref.evidence_id),
          `Hidden evidence ref ${ref.evidence_id} must reference a real evidence entry`,
        );
      }
    }
  });

  test("generation fails closed when given empty evidence inventory", () => {
    assert.throws(
      () => {
        generateCodeSliceArtifact([], makeConceptSlice());
      },
      (err: Error) => {
        return err.message.includes("evidence") || err.message.includes("inventory");
      },
      "Should fail closed when evidence inventory is empty",
    );
  });

  test("generation fails closed when concept slice has no source evidence", () => {
    const inventory = [makeEvidenceEntry()];
    const emptySlice = makeConceptSlice({ source_evidence: [] });

    assert.throws(
      () => {
        generateCodeSliceArtifact(inventory, emptySlice);
      },
      (err: Error) => {
        return err.message.includes("source evidence") || err.message.includes("concept slice");
      },
      "Should fail closed when concept slice has no source evidence",
    );
  });

  test("generation fails closed when no evidence matches concept slice requirements", () => {
    const inventory = [makeEvidenceEntry({ id: "EV-OTHER" })];
    const slice = makeConceptSlice({
      source_evidence: ["EV-001"], // Doesn't exist in inventory
    });

    assert.throws(
      () => {
        generateFlowDiagramArtifact(inventory, slice);
      },
      (err: Error) => {
        return err.message.includes("evidence") ||
          err.message.includes("no matching") ||
          err.message.includes("cannot generate");
      },
      "Should fail closed when concept slice evidence not in inventory",
    );
  });

  test("validateArtifactCitations fails closed on completely empty artifact", () => {
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
    assert.equal(result.valid, false, "Empty artifact must fail validation");
  });
});

// ── Deterministic Generation ─────────────────────────────────────────

describe("Deterministic Artifact Generation", () => {
  test("generateDeterministicArtifacts is deterministic with same inputs", () => {
    const fixture = loadFixture();
    const run1 = generateDeterministicArtifacts(fixture);
    const run2 = generateDeterministicArtifacts(fixture);

    assert.equal(run1.length, run2.length, "Same number of artifacts each run");
    for (let i = 0; i < run1.length; i++) {
      assert.equal(run1[i].kind, run2[i].kind, `Artifact ${i}: same kind`);
      assert.equal(run1[i].title, run2[i].title, `Artifact ${i}: same title`);
      assert.equal(run1[i].purpose, run2[i].purpose, `Artifact ${i}: same purpose`);
      assert.equal(
        run1[i].source_evidence.length,
        run2[i].source_evidence.length,
        `Artifact ${i}: same number of source evidence refs`,
      );
      assert.equal(
        run1[i].user_operation.kind,
        run2[i].user_operation.kind,
        `Artifact ${i}: same operation kind`,
      );
    }
  });

  test("generated artifacts from real fixture are citation-valid", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
      assert.equal(
        result.valid,
        true,
        `Generated artifact ${artifact.id} (${artifact.kind}) should pass citation validation: ${result.summary}`,
      );
    }
  });

  test("generated flow diagram has entry_node and terminal_nodes", () => {
    const fixture = loadFixture();
    const flowDiagram = generateFlowDiagramArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const payload = flowDiagram.payload as Record<string, unknown>;
    assert.ok(typeof payload.entry_node === "string", "Flow diagram must have entry_node");
    assert.ok(Array.isArray(payload.terminal_nodes), "Flow diagram must have terminal_nodes array");
    assert.ok((payload.terminal_nodes as string[]).length > 0, "Must have at least one terminal node");

    // Entry node must exist in nodes
    const nodes = payload.nodes as GeneratedNode[];
    const nodeIds = new Set(nodes.map((n) => n.id));
    assert.ok(nodeIds.has(payload.entry_node as string),
      `Entry node "${payload.entry_node}" must exist in nodes`);
    for (const termId of payload.terminal_nodes as string[]) {
      assert.ok(nodeIds.has(termId), `Terminal node "${termId}" must exist in nodes`);
    }
  });

  test("generated flow diagram has no orphan edges", () => {
    const fixture = loadFixture();
    const flowDiagram = generateFlowDiagramArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const payload = flowDiagram.payload as Record<string, unknown>;
    const nodes = payload.nodes as GeneratedNode[];
    const edges = payload.edges as GeneratedEdge[];
    const nodeIds = new Set(nodes.map((n) => n.id));

    for (const edge of edges) {
      assert.ok(nodeIds.has(edge.from), `Edge from "${edge.from}" must reference an existing node`);
      assert.ok(nodeIds.has(edge.to), `Edge to "${edge.to}" must reference an existing node`);
    }
  });

  test("generated code slice includes related test references when available", () => {
    const fixture = loadFixture();
    const codeSlice = generateCodeSliceArtifact(
      fixture.evidence_inventory,
      fixture.concept_slice,
    );

    const payload = codeSlice.payload as Record<string, unknown>;

    // If behavior_oracle evidence exists (tests), they should be referenced
    const testEvidence = fixture.evidence_inventory.filter(
      (e) => e.role === "behavior_oracle",
    );

    if (testEvidence.length > 0 && Array.isArray(payload.related_tests)) {
      const relatedTests = payload.related_tests as Record<string, unknown>[];
      assert.ok(relatedTests.length > 0,
        "Code slice should reference related tests when behavior oracle evidence exists");
    }
  });
});

// ── Evidence Identity Stability ──────────────────────────────────────

describe("Evidence Identity Stability Through Generation", () => {
  test("evidence refs in generated artifacts preserve stable ids from inventory", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);
    const inventoryIds = new Set(fixture.evidence_inventory.map((e) => e.id));

    for (const artifact of artifacts) {
      for (const ref of artifact.source_evidence) {
        assert.ok(inventoryIds.has(ref.evidence_id),
          `Evidence ref ${ref.evidence_id} must match an inventory entry`);
      }
    }
  });

  test("evidence refs preserve role from inventory", () => {
    const fixture = loadFixture();
    const roleMap = new Map(fixture.evidence_inventory.map((e) => [e.id, e.role]));
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      for (const ref of artifact.source_evidence) {
        const inventoryRole = roleMap.get(ref.evidence_id);
        if (inventoryRole) {
          assert.equal(ref.role, inventoryRole,
            `Evidence ref ${ref.evidence_id} role '${ref.role}' should match inventory role '${inventoryRole}'`);
        }
      }
    }
  });
});
