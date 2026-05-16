import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { evaluateFullLoop } from "../../src/runtime-pedagogy-loop.ts";
import { createAttempt, evaluateAttempt } from "../../src/runtime-attempt-evaluation.ts";
import {
  makeShallowAttempt,
  makeOperation,
  makeArtifact,
  makeConceptSlice,
  makeOverconfidentAttempt,
} from "./fixtures.ts";

describe("VAL-CROSS-006: Attempt evaluation feeds readiness and repair", () => {
  test("full loop links attempt → evidence check → gap → repair → readiness", () => {
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

    assert.equal(result.attempt.id, attempt.id);
    assert.equal(result.evidenceCheck.attempt_id, attempt.id);
    assert.ok(result.gap);
    assert.equal(result.gap.user_attempt_ref, attempt.id);
    assert.ok(result.repairAction);
    assert.equal(result.repairAction.source_gap_id, result.gap.id);
    assert.equal(result.repairAction.gap_id, result.gap.id);
    assert.equal(result.readinessClaim.status, "blocked");
    assert.ok(result.readinessClaim.blocking_gaps.includes(result.gap.id));
  });

  test("full loop for correct attempt produces no gap and ready status", () => {
    const operation = makeOperation({
      success_criteria: [
        "Names at least one intermediate step",
        "Cites evidence",
      ],
    });
    const artifact = makeArtifact({
      success_criteria: operation.success_criteria,
      user_operation: operation,
    });
    const conceptSlice = makeConceptSlice();
    const attempt = createAttempt({
      operation_id: operation.id,
      answer_text: "The function traces through intermediate steps including input validation and branching. Evidence: src/module.ts lines 10-50.",
      selected_evidence: ["EV-T001"],
      declared_confidence: "high",
      declared_unknowns: [],
    });
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    assert.equal(result.gap, null);
    assert.equal(result.repairAction, null);
    assert.equal(result.readinessClaim.status, "ready");
  });

  test("full loop for overconfident attempt produces critical gap", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeOverconfidentAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result.gap);
    assert.equal(result.gap.severity, "critical");
    assert.equal(result.gap.blocks_readiness, true);
    assert.equal(result.readinessClaim.status, "blocked");
  });
});
