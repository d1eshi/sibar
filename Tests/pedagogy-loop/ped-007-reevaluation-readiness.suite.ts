import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  advanceReadinessAfterReevaluation,
  createReadinessClaim,
} from "../../engine/pedagogy/core/loop.ts";
import { createAttempt, evaluateAttempt } from "../../engine/pedagogy/core/attempt-evaluation.ts";
import { makeArtifact, makeConceptSlice, makeOperation } from "./fixtures.ts";

function makeCriteriaSatisfyingAttempt() {
  const operation = makeOperation({
    success_criteria: ["Cites evidence"],
  });
  const artifact = makeArtifact({
    user_operation: operation,
    success_criteria: operation.success_criteria,
  });
  const attempt = createAttempt({
    operation_id: operation.id,
    answer_text: "Cites evidence from src/module.ts lines 10-50.",
    selected_evidence: ["EV-T001"],
    declared_confidence: "medium",
    declared_unknowns: [],
  });
  const { evidenceCheck } = evaluateAttempt({
    attempt,
    operation,
    artifact,
  });

  assert.equal(
    evidenceCheck.result,
    "confirmed",
    "Test fixture must produce a criteria-satisfying confirmed attempt",
  );

  return { attempt, evidenceCheck };
}

describe("VAL-PED-007: Readiness waits for successful re-evaluation", () => {
  test("readiness does NOT advance when re-evaluation fails", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
    });

    const { attempt: successfulAttempt, evidenceCheck } = makeCriteriaSatisfyingAttempt();

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: false,
      resolvedGapIds: [],
      successfulAttempt,
      evidenceCheck,
    });

    assert.equal(updated.status, "blocked");
  });

  test("readiness advances to ready when re-evaluation succeeds and all gaps resolved", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
    });

    const { attempt: successfulAttempt, evidenceCheck } = makeCriteriaSatisfyingAttempt();

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt,
      evidenceCheck,
    });

    assert.equal(updated.status, "ready");
    assert.equal(updated.blocking_gaps.length, 0);
    assert.equal(updated.ready_to_explain, true);
    assert.equal(updated.ready_to_trace, true);
  });

  test("readiness stays limited when some gaps remain unresolved", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001", "GAP-002"],
    });

    const { attempt: successfulAttempt, evidenceCheck } = makeCriteriaSatisfyingAttempt();

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt,
      evidenceCheck,
    });

    assert.equal(updated.status, "limited");
    assert.equal(updated.blocking_gaps.length, 1);
    assert.ok(updated.blocking_gaps.includes("GAP-002"));
  });

  test("readiness advance preserves supporting evidence from original", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
      supportingEvidence: [{ evidence_id: "EV-T001" }],
    });

    const { attempt: successfulAttempt, evidenceCheck } = makeCriteriaSatisfyingAttempt();

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt,
      evidenceCheck,
    });

    assert.ok(updated.supporting_evidence.some((e) => e.evidence_id === "EV-T001"));
    assert.ok(updated.supporting_evidence.some((e) => e.evidence_id === successfulAttempt.id));
  });

  test("repeated unsupported re-evaluation answer does not advance readiness", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
      supportingEvidence: [{ evidence_id: "EV-T001" }],
    });

    const repeatedUnsupportedAttempt = createAttempt({
      operation_id: "OP-T001",
      answer_text: "It probably works somehow, but I can't point to concrete lines and I still do not have evidence for the claim.",
      selected_evidence: [],
      declared_confidence: "high",
      declared_unknowns: [],
    });
    const unsupportedCheck = evaluateAttempt({
      attempt: repeatedUnsupportedAttempt,
      operation: makeOperation(),
      artifact: makeArtifact(),
    });

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt: repeatedUnsupportedAttempt,
      evidenceCheck: unsupportedCheck.evidenceCheck,
      previousAnswerHistory: [{
        answer_id: "MA-001",
        attempt_id: "ATT-001",
        operation_id: "OP-T001",
        operation_kind: "trace",
        concept_slice_id: "CS-T001",
        answer_text: repeatedUnsupportedAttempt.answer_text,
        outcome: "gap",
        confidence: "high",
        had_declared_uncertainty: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        evidence: [],
      }],
    });

    assert.equal(updated.status, "blocked");
    assert.ok(updated.blocking_gaps.includes("GAP-001"));
  });

  test("new criteria-satisfying re-evaluation can advance after earlier unsupported answer", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
      supportingEvidence: [{ evidence_id: "EV-T001" }],
    });

    const { attempt: successfulAttempt, evidenceCheck } = makeCriteriaSatisfyingAttempt();

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt,
      evidenceCheck,
      previousAnswerHistory: [{
        answer_id: "MA-001",
        attempt_id: "ATT-001",
        operation_id: "OP-T001",
        operation_kind: "trace",
        concept_slice_id: "CS-T001",
        answer_text: "It probably works somehow, but I can't cite the real mechanism yet.",
        outcome: "gap",
        confidence: "high",
        had_declared_uncertainty: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        evidence: [],
      }],
    });

    assert.equal(updated.status, "ready");
    assert.equal(updated.blocking_gaps.length, 0);
  });
});
