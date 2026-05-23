import test, { describe } from "node:test";
import assert from "node:assert/strict";

import type { EvidenceInventoryEntry } from "../../engine/runtime-deep-ownership.ts";
import {
  AUTHORITY_RANK,
  generateCodeSliceArtifact,
  generateDeterministicArtifacts,
  generateFlowDiagramArtifact,
  resolveEvidenceAuthority,
  validateArtifactCitations,
  type GeneratedNode,
} from "../../engine/artifacts/generation.ts";
import { loadFixture, makeConceptSlice, makeEvidenceEntry } from "./helpers.ts";

describe("VAL-INTEL-004: Source Authority Handling", () => {
  test("resolveEvidenceAuthority prioritizes implementation and behavior_oracle over intent", () => {
    const implOverIntent = resolveEvidenceAuthority("implementation", "intent");
    assert.equal(implOverIntent.authoritative_source, "implementation");
    assert.equal(implOverIntent.conflict, true);

    const behaviorOverIntent = resolveEvidenceAuthority("behavior_oracle", "intent");
    assert.equal(behaviorOverIntent.authoritative_source, "behavior_oracle");
    assert.equal(behaviorOverIntent.conflict, true);
  });

  test("resolveEvidenceAuthority handles equal and identical roles", () => {
    const equalDifferent = resolveEvidenceAuthority("intent", "historical_rationale");
    assert.ok(equalDifferent.authoritative_source === "unknown" || equalDifferent.conflict === true);

    const identical = resolveEvidenceAuthority("implementation", "implementation");
    assert.equal(identical.conflict, false);
    assert.equal(identical.authoritative_source, "implementation");
  });

  test("AUTHORITY_RANK ordering keeps high-authority evidence above docs", () => {
    assert.ok(AUTHORITY_RANK.source_truth > AUTHORITY_RANK.intent);
    assert.ok(AUTHORITY_RANK.implementation > AUTHORITY_RANK.intent);
    assert.ok(AUTHORITY_RANK.behavior_oracle > AUTHORITY_RANK.intent);
    assert.ok(AUTHORITY_RANK.counterexample > AUTHORITY_RANK.intent);
    assert.ok(AUTHORITY_RANK.unknown < AUTHORITY_RANK.implementation);
  });

  test("generated flow diagram marks non-authoritative nodes inferred under conflict", () => {
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
    const docsNode = nodes.find((node) => node.evidence?.includes("EV-DOCS"));

    assert.ok(docsNode, "Expected docs node to exist");
    assert.equal(docsNode?.is_inferred, true, "Conflicting lower-authority node should be inferred");
  });

  test("generated artifacts do not promote lower-authority evidence as definitive", () => {
    const fixture = loadFixture();
    const artifacts = generateDeterministicArtifacts(fixture);

    for (const artifact of artifacts) {
      const result = validateArtifactCitations(artifact, fixture.evidence_inventory);
      for (const issue of result.issues) {
        assert.ok(!issue.includes("definitive") || issue.includes("unknown"));
      }
    }
  });

  test("code slice over conflicting evidence exposes conflict markers", () => {
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

    const slice = makeConceptSlice({ source_evidence: ["EV-CODE", "EV-README"] });
    const codeSlice = generateCodeSliceArtifact(conflictingInventory, slice);
    const purpose = codeSlice.purpose.toLowerCase();
    const mentionsConflict =
      purpose.includes("conflict") ||
      purpose.includes("unknown") ||
      purpose.includes("inferred");

    assert.ok(mentionsConflict, `Expected conflict marker in purpose: ${codeSlice.purpose}`);
  });
});
