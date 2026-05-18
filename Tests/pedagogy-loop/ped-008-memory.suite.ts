import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildDeepOwnershipMemory,
  evaluateFullLoop,
} from "../../src/runtime-pedagogy-loop.ts";
import { createAttempt, evaluateAttempt } from "../../src/runtime-attempt-evaluation.ts";
import type {
  MemoryAnswerEntry,
} from "../../src/runtime-pedagogy-loop.ts";
import type { OwnershipGap, UserOperationKind } from "../../src/runtime-deep-ownership.ts";
import {
  makeConceptSlice,
  makeEvidenceRef,
  makeOperation,
  makeArtifact,
} from "./fixtures.ts";

describe("VAL-PED-008: Memory tracks demonstrated operations", () => {
  test("memory includes concept entries with confirmed operations", () => {
    const answerHistory: MemoryAnswerEntry[] = [{
      answer_id: "MA-001",
      attempt_id: "ATT-001",
      operation_id: "OP-T001",
      operation_kind: "trace",
      concept_slice_id: "CS-T001",
      answer_text: "Correct trace answer",
      outcome: "confirmed",
      confidence: "high",
      had_declared_uncertainty: false,
      created_at: new Date().toISOString(),
      evidence: [makeEvidenceRef()],
    }];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    assert.equal(memory.concept_entries.length, 1);
    const concept = memory.concept_entries[0];
    assert.equal(concept.concept_slice_id, "CS-T001");
    assert.ok(concept.confirmed_operations.length > 0);
    assert.equal(concept.open_gaps.length, 0);
  });

  test("memory tracks gaps as open", () => {
    const gap: OwnershipGap = {
      id: "GAP-001",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const answerHistory: MemoryAnswerEntry[] = [{
      answer_id: "MA-001",
      attempt_id: "ATT-001",
      operation_id: "OP-T001",
      operation_kind: "trace",
      concept_slice_id: "CS-T001",
      answer_text: "Shallow trace",
      outcome: "gap",
      confidence: "medium",
      had_declared_uncertainty: true,
      created_at: new Date().toISOString(),
      evidence: [],
    }];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [gap],
      repairActions: [],
      misconceptionMemory: [],
    });

    const concept = memory.concept_entries[0];
    assert.equal(concept.open_gaps.length, 1);
    assert.ok(concept.open_gaps.includes("GAP-001"));
    assert.equal(concept.confirmed_operations.length, 0);
  });

  test("memory sets retention and transfer schedule", () => {
    const lastSuccess = new Date().toISOString();
    const answerHistory: MemoryAnswerEntry[] = [{
      answer_id: "MA-001",
      attempt_id: "ATT-001",
      operation_id: "OP-T001",
      operation_kind: "trace",
      concept_slice_id: "CS-T001",
      answer_text: "Correct answer",
      outcome: "confirmed",
      confidence: "high",
      had_declared_uncertainty: false,
      created_at: lastSuccess,
      evidence: [makeEvidenceRef()],
    }];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    const concept = memory.concept_entries[0];
    assert.ok(concept.retention_due_at);
    assert.ok(concept.transfer_due_at);
    assert.ok(new Date(concept.retention_due_at!) > new Date(lastSuccess));
    assert.ok(new Date(concept.transfer_due_at!) > new Date(concept.retention_due_at!));
  });

  test("memory operation entries track per-operation confirmation", () => {
    const answerHistory: MemoryAnswerEntry[] = [
      {
        answer_id: "MA-001",
        attempt_id: "ATT-001",
        operation_id: "OP-T001",
        operation_kind: "trace",
        concept_slice_id: "CS-T001",
        answer_text: "Failed trace",
        outcome: "gap",
        confidence: "low",
        had_declared_uncertainty: true,
        created_at: new Date().toISOString(),
        evidence: [],
      },
      {
        answer_id: "MA-002",
        attempt_id: "ATT-002",
        operation_id: "OP-T001",
        operation_kind: "trace",
        concept_slice_id: "CS-T001",
        answer_text: "Correct trace",
        outcome: "confirmed",
        confidence: "high",
        had_declared_uncertainty: false,
        created_at: new Date().toISOString(),
        evidence: [makeEvidenceRef()],
      },
    ];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    const op = memory.operation_entries[0];
    assert.ok(op.is_confirmed);
    assert.equal(op.attempts_count, 2);
  });

  test("memory preserves the actual operation kind across trace/explain/derive/predict", () => {
    const operationKinds: UserOperationKind[] = ["trace", "explain", "derive", "predict"];

    for (const kind of operationKinds) {
      const operation = makeOperation({
        id: `OP-${kind.toUpperCase()}`,
        kind,
      });
      const artifact = makeArtifact({
        user_operation: operation,
        success_criteria: operation.success_criteria,
      });
      const conceptSlice = makeConceptSlice();
      const attempt = createAttempt({
        operation_id: operation.id,
        answer_text: `I am not yet sure how to ${kind} this artifact and cannot support each claim.`,
        selected_evidence: ["EV-T001"],
        declared_confidence: "medium",
        declared_unknowns: [`Cannot complete ${kind} with confidence yet`],
      });
      const evalOutput = evaluateAttempt({ attempt, operation, artifact });

      const result = evaluateFullLoop({
        loopId: `LOOP-${kind.toUpperCase()}`,
        userAttempt: attempt,
        evalOutput,
        operation,
        artifact,
        conceptSlice,
      });

      const operationEntry = result.memory.operation_entries.find((entry) =>
        entry.operation_id === operation.id,
      );

      assert.ok(operationEntry, `Expected operation entry for ${kind}`);
      assert.equal(operationEntry?.operation_kind, kind);
    }
  });
});
