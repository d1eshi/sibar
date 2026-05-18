import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  attemptToReadiness,
  evaluateFullLoop,
  validateEvidenceIdentity,
} from "../../src/runtime-pedagogy-loop.ts";
import { evaluateAttempt } from "../../src/runtime-attempt-evaluation.ts";
import { makeArtifact, makeConceptSlice, makeEvidenceInventory, makeEvidenceRef, makeOperation, makeShallowAttempt } from "./fixtures.ts";

describe("VAL-CROSS-009: Evidence identity is stable across the loop", () => {
  test("all loop objects reference evidence IDs from the inventory", () => {
    const inventory = makeEvidenceInventory();
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    const identityCheck = validateEvidenceIdentity({
      evidenceInventory: inventory,
      artifact,
      operation,
      attempt,
      evidenceCheck: result.evidenceCheck,
      gap: result.gap,
      repairAction: result.repairAction,
      readinessClaim: result.readinessClaim,
      prerequisiteRoute: result.prerequisiteRoute,
      reevaluationPrompt: result.reevaluationPrompt,
    });

    assert.equal(identityCheck.stable, true);
  });

  test("evidence IDs persist from artifact through all downstream objects", () => {
    const inventory = [
      {
        id: "EV-T001",
        path: "src/module.ts",
        source_type: "implementation" as const,
        size_bytes: 5000,
        extension: ".ts",
        role: "implementation" as const,
        content_hash: "sha256:abc",
        excerpt: "Core implementation",
        status: "inspected" as const,
      },
    ];

    const operation = makeOperation({ required_evidence: ["EV-T001"] });
    const artifact = makeArtifact({
      source_evidence: [makeEvidenceRef({ evidence_id: "EV-T001" })],
    });
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const conceptSliceEV = makeConceptSlice({ source_evidence: ["EV-T001"] });
    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice: conceptSliceEV,
    });

    const identityCheck = validateEvidenceIdentity({
      evidenceInventory: inventory,
      artifact,
      operation,
      attempt,
      evidenceCheck: result.evidenceCheck,
      gap: result.gap,
      repairAction: result.repairAction,
      readinessClaim: result.readinessClaim,
      prerequisiteRoute: result.prerequisiteRoute,
      reevaluationPrompt: result.reevaluationPrompt,
    });

    assert.equal(identityCheck.stable, true);
  });

  test("attemptToReadiness validates evidence identity", () => {
    const inventory = makeEvidenceInventory();
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    assert.doesNotThrow(() => {
      attemptToReadiness({
        loopId: "LOOP-T001",
        attempt,
        evalOutput,
        operation,
        artifact,
        conceptSlice,
        evidenceInventory: inventory,
      });
    });
  });

  test("attemptToReadiness throws on invalid evidence identity", () => {
    const operation = makeOperation({ required_evidence: ["EV-NONEXISTENT"] });
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const inventory = makeEvidenceInventory();

    assert.throws(
      () => attemptToReadiness({
        loopId: "LOOP-T001",
        attempt,
        evalOutput,
        operation,
        artifact,
        conceptSlice,
        evidenceInventory: inventory,
      }),
      /Evidence identity is NOT stable/,
    );
  });
});
