import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  createOwnershipGap,
  createRepairAction,
} from "../../src/runtime-pedagogy-loop.ts";
import { evaluateAttempt } from "../../src/runtime-attempt-evaluation.ts";
import {
  RECOGNIZED_OPERATION_KINDS,
  type OwnershipGap,
  type OwnershipGapKind,
} from "../../src/runtime-deep-ownership.ts";
import {
  evaluateShallowAttempt,
  makeConceptSlice,
  makeEvidenceRef,
} from "./fixtures.ts";

describe("VAL-PED-002: Repair actions are concrete and evidence-seeking", () => {
  test("repair action specifies a concrete operation kind", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(repair.operation_kind));
    assert.ok(repair.prompt.length > 30);
  });

  test("repair action prompt references specific evidence", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(
      repair.prompt.includes("src/module.ts") || repair.prompt.includes("evidence"),
    );
  });

  test("repair action links back to its source gap", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.equal(repair.source_gap_id, gap.id);
    assert.equal(repair.gap_id, gap.id);
  });

  test("repair action required_evidence is from the gap", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(repair.required_evidence.length > 0);
    for (const ref of repair.required_evidence) {
      assert.ok(ref.evidence_id);
    }
  });

  test("repair for different gap kinds produces appropriate operation kinds", () => {
    const gapKinds: OwnershipGapKind[] = [
      "shallow_trace",
      "vocabulary_only",
      "false_confidence",
      "wrong_mechanism",
      "passive_agreement",
    ];

    for (const kind of gapKinds) {
      const gap: OwnershipGap = {
        id: `GAP-${kind}`,
        concept_slice_id: "CS-T001",
        kind,
        user_attempt_ref: "ATT-001",
        artifact_evidence_refs: [makeEvidenceRef()],
        evidence: `Test gap of kind ${kind}`,
        severity: "important",
        blocks_readiness: true,
        created_at: new Date().toISOString(),
      };

      const repair = createRepairAction({
        gap,
        conceptSlice: makeConceptSlice(),
      });

      assert.ok(RECOGNIZED_OPERATION_KINDS.includes(repair.operation_kind));
      assert.ok(repair.prompt.length > 0);
    }
  });
});
