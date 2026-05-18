import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  type DeepOwnershipFixture,
  type ThinkingArtifact,
  type ConceptSlice,
  type EvidenceInventoryEntry,
} from "../src/runtime-deep-ownership.ts";

import {
  generateCodeSliceArtifact,
  generateDeterministicArtifacts,
  validateArtifactCitations,
} from "../src/runtime-artifact-generation.ts";

const FIXTURE_PATH = "docs/specs/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

function loadFixture(): DeepOwnershipFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

function baseArtifact(
  fixture: DeepOwnershipFixture,
  overrides: Partial<ThinkingArtifact> = {},
): ThinkingArtifact {
  return {
    id: "TA-TEST",
    kind: "code_slice",
    title: "Test Artifact",
    purpose: "Payload-level citation validation test",
    concept_slice_id: fixture.concept_slice.id,
    source_evidence: [
      {
        evidence_id: fixture.evidence_inventory[0].id,
        file_path: fixture.evidence_inventory[0].path,
        start_line: 1,
        end_line: fixture.evidence_inventory[0].line_count ?? 10,
        excerpt: fixture.evidence_inventory[0].excerpt,
        role: fixture.evidence_inventory[0].role,
      },
    ],
    hidden_solution_evidence: [],
    user_operation: {
      id: "OP-TEST",
      kind: "trace",
      prompt: "Trace this behavior with citations.",
      artifact_ids: ["TA-TEST"],
      required_evidence: [fixture.evidence_inventory[0].id],
      allowed_hints: 2,
      blocked_shortcuts: [],
      success_criteria: ["Cite evidence for each important claim."],
    },
    renderer: "code_slice",
    payload: {},
    success_criteria: ["Cite evidence for each important claim."],
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Artifact generation regression coverage", () => {
  test("generateDeterministicArtifacts is byte-stable including created_at", async () => {
    const fixture = loadFixture();
    const run1 = generateDeterministicArtifacts(fixture);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const run2 = generateDeterministicArtifacts(fixture);

    assert.deepEqual(
      run1,
      run2,
      "Deterministic artifact generation should produce identical outputs across repeated runs",
    );
  });

  test("validateArtifactCitations fails when code ranges lack payload-level evidence", () => {
    const fixture = loadFixture();
    const artifact = baseArtifact(fixture, {
      kind: "code_slice",
      renderer: "code_slice",
      payload: {
        file_path: "src/example.ts",
        ranges: [
          {
            start_line: 10,
            end_line: 20,
            label: "Important range with no citation",
          },
        ],
      },
    });

    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
    assert.equal(result.valid, false);
    assert.ok(
      result.uncited_claims.some((claim) => claim.includes("range")),
      "Expected uncited range claim to be reported",
    );
  });

  test("validateArtifactCitations fails when flow nodes lack payload-level evidence", () => {
    const fixture = loadFixture();
    const artifact = baseArtifact(fixture, {
      kind: "flow_diagram",
      renderer: "flow_diagram",
      payload: {
        nodes: [
          {
            id: "N-001",
            label: "Uncited node",
            role: "process",
            evidence: [],
            is_inferred: false,
          },
        ],
        edges: [],
        entry_node: "N-001",
        terminal_nodes: ["N-001"],
      },
    });

    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
    assert.equal(result.valid, false);
    assert.ok(
      result.uncited_claims.some((claim) => claim.includes("node")),
      "Expected uncited node claim to be reported",
    );
  });

  test("validateArtifactCitations fails when flow edges lack payload-level evidence", () => {
    const fixture = loadFixture();
    const artifact = baseArtifact(fixture, {
      kind: "flow_diagram",
      renderer: "flow_diagram",
      payload: {
        nodes: [
          {
            id: "N-001",
            label: "Input",
            role: "input",
            evidence: [fixture.evidence_inventory[0].id],
            is_inferred: false,
          },
          {
            id: "N-002",
            label: "Output",
            role: "output",
            evidence: [fixture.evidence_inventory[0].id],
            is_inferred: false,
          },
        ],
        edges: [
          {
            from: "N-001",
            to: "N-002",
            relation: "produces",
            evidence: [],
            is_inferred: false,
          },
        ],
        entry_node: "N-001",
        terminal_nodes: ["N-002"],
      },
    });

    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
    assert.equal(result.valid, false);
    assert.ok(
      result.uncited_claims.some((claim) => claim.includes("edge")),
      "Expected uncited edge claim to be reported",
    );
  });

  test("validateArtifactCitations fails when payload assertions lack evidence", () => {
    const fixture = loadFixture();
    const artifact = baseArtifact(fixture, {
      payload: {
        assertions: [
          {
            text: "The mechanism always preserves evidence identity",
            evidence: [],
            is_inferred: false,
            is_unknown: false,
          },
        ],
      },
    });

    const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
    assert.equal(result.valid, false);
    assert.ok(
      result.uncited_claims.some((claim) => claim.includes("assertion")),
      "Expected uncited payload assertion to be reported",
    );
  });

  test("code slice purpose never emits EV-EV-* double-prefixed ids", () => {
    const inventory: EvidenceInventoryEntry[] = [
      {
        id: "EV-IMPL",
        path: "src/runtime.ts",
        source_type: "source_truth",
        size_bytes: 2048,
        extension: ".ts",
        role: "implementation",
        content_hash: "sha256:implhash",
        excerpt: "Implementation excerpt",
        status: "inspected",
        line_count: 120,
      },
      {
        id: "EV-DOC",
        path: "docs/runtime.md",
        source_type: "intent",
        size_bytes: 512,
        extension: ".md",
        role: "intent",
        content_hash: "sha256:dochash",
        excerpt: "Docs excerpt",
        status: "inspected",
        line_count: 30,
      },
    ];

    const conceptSlice: ConceptSlice = {
      id: "CS-PREFIX",
      label: "Prefix handling",
      domain: "code",
      operation_target: "trace",
      prerequisite_concepts: [],
      source_evidence: ["EV-IMPL", "EV-DOC"],
      behavior_evidence: [],
      risk_evidence: [],
      expected_user_operations: ["trace"],
    };

    const artifact = generateCodeSliceArtifact(inventory, conceptSlice);
    assert.ok(
      artifact.purpose.includes("(EV-IMPL)"),
      `Expected purpose to include canonical EV id, got: ${artifact.purpose}`,
    );
    assert.ok(
      !artifact.purpose.includes("EV-EV-"),
      `Purpose must not include EV-EV-* double prefix: ${artifact.purpose}`,
    );
  });
});
