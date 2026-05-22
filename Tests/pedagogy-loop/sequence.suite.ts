import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  advanceReadinessAfterReevaluation,
  buildDeepOwnershipMemory,
  evaluateFullLoop,
  validateEvidenceIdentity,
} from "../../engine/runtime-pedagogy-loop.ts";
import { createAttempt, evaluateAttempt } from "../../engine/runtime-attempt-evaluation.ts";
import {
  makeConceptSlice,
  makeEvidenceInventory,
  makeOperation,
  makeArtifact,
  makeShallowAttempt,
} from "./fixtures.ts";

describe("Sequence: Gap → Repair → Re-Evaluation → Readiness → Memory", () => {
  test("complete sequence for a shallow trace gap", () => {
    const inventory = makeEvidenceInventory();
    const operation = makeOperation({
      success_criteria: ["Cites evidence"],
    });
    const artifact = makeArtifact({
      user_operation: operation,
      success_criteria: operation.success_criteria,
    });
    const conceptSlice = makeConceptSlice();

    const attempt1 = makeShallowAttempt();
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });

    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result1.gap);
    assert.ok(
      ["shallow_trace", "ignored_counterevidence", "missing_prerequisite"].includes(result1.gap.kind),
    );
    assert.ok(result1.repairAction);
    assert.ok(result1.reevaluationPrompt);
    assert.equal(result1.readinessClaim.status, "blocked");

    const attempt2 = createAttempt({
      operation_id: operation.id,
      answer_text: "Cites evidence from src/module.ts lines 10-50.",
      selected_evidence: ["EV-T001"],
      declared_confidence: "medium",
      declared_unknowns: [],
    });
    const eval2 = evaluateAttempt({ attempt: attempt2, operation, artifact });
    assert.equal(eval2.evidenceCheck.result, "confirmed");

    const advancedReadiness = advanceReadinessAfterReevaluation({
      currentClaim: result1.readinessClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: [result1.gap.id],
      successfulAttempt: attempt2,
      evidenceCheck: eval2.evidenceCheck,
      previousAnswerHistory: [result1.memoryAnswerEntry],
    });

    assert.equal(advancedReadiness.status, "ready");
    assert.equal(advancedReadiness.blocking_gaps.length, 0);

    const fullMemory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice,
      answerHistory: [
        result1.memoryAnswerEntry,
        {
          answer_id: "MA-002",
          attempt_id: attempt2.id,
          operation_id: operation.id,
          operation_kind: operation.kind,
          concept_slice_id: conceptSlice.id,
          answer_text: attempt2.answer_text,
          outcome: "confirmed",
          confidence: attempt2.declared_confidence,
          had_declared_uncertainty: false,
          created_at: attempt2.created_at,
          evidence: eval2.evidenceCheck.cited_evidence,
        },
      ],
      gaps: result1.gap ? [result1.gap] : [],
      repairActions: result1.repairAction ? [result1.repairAction] : [],
      misconceptionMemory: result1.misconceptionMemory,
    });

    assert.ok(fullMemory.answer_history.length >= 2);
    assert.ok(fullMemory.operation_entries[0]?.is_confirmed);

    const identityCheck = validateEvidenceIdentity({
      evidenceInventory: inventory,
      artifact,
      operation,
      attempt: attempt2,
      evidenceCheck: eval2.evidenceCheck,
      gap: result1.gap,
      repairAction: result1.repairAction,
      readinessClaim: advancedReadiness,
      prerequisiteRoute: result1.prerequisiteRoute,
      reevaluationPrompt: result1.reevaluationPrompt,
    });

    assert.equal(identityCheck.stable, true);
  });

  test("memory accumulates misconceptions across repeated gaps", () => {
    const conceptSlice = makeConceptSlice();
    const artifact = makeArtifact();
    const operation = makeOperation();

    const attempt1 = makeShallowAttempt();
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });
    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.equal(result1.misconceptionMemory.length, 1);
    assert.equal(result1.misconceptionMemory[0].repeated_count, 1);
    assert.equal(result1.misconceptionMemory[0].current_status, "active");

    const attempt2 = makeShallowAttempt();
    const eval2 = evaluateAttempt({ attempt: attempt2, operation, artifact });
    const result2 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt2,
      evalOutput: eval2,
      operation,
      artifact,
      conceptSlice,
      existingMisconceptions: result1.misconceptionMemory,
      existingGaps: result1.gap ? [result1.gap] : [],
      existingAnswerHistory: [result1.memoryAnswerEntry],
    });

    assert.equal(result2.misconceptionMemory.length, 1);
    assert.equal(result2.misconceptionMemory[0].repeated_count, 2);
    assert.equal(result2.misconceptionMemory[0].repair_history.length, 2);
  });

  test("re-evaluation prompt is non-repeating in sequence", () => {
    const operation = makeOperation({ kind: "trace" });
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();

    const attempt1 = makeShallowAttempt();
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });
    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result1.reevaluationPrompt);
    assert.notEqual(result1.reevaluationPrompt?.prompt, operation.prompt);
    assert.notEqual(result1.reevaluationPrompt?.nearby_operation_kind, operation.kind);
  });
});
