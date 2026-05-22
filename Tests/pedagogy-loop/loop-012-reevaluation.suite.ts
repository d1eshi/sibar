import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  createOwnershipGap,
  generateReevaluation,
} from "../../engine/pedagogy/core/loop.ts";
import { evaluateAttempt } from "../../engine/pedagogy/core/attempt-evaluation.ts";
import { RECOGNIZED_OPERATION_KINDS } from "../../engine/runtime-deep-ownership.ts";
import {
  evaluateShallowAttempt,
  makeConceptSlice,
} from "./fixtures.ts";

describe("VAL-LOOP-012: Re-evaluation is nearby, evidence-bound, non-repeating", () => {
  test("re-evaluation uses a different operation kind", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.notEqual(reeval.nearby_operation_kind, operation.kind);
    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(reeval.nearby_operation_kind));
  });

  test("re-evaluation preserves required evidence", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.ok(reeval.required_evidence.length > 0);
    assert.ok(reeval.required_evidence.includes("EV-T001"));
  });

  test("re-evaluation prompt is NOT the same as original", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.notEqual(reeval.prompt, operation.prompt);
    assert.equal(reeval.avoid_repeating_prompt, operation.prompt);
  });

  test("re-evaluation references the original operation and gap", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.equal(reeval.original_operation_id, operation.id);
    assert.equal(reeval.original_gap_id, gap.id);
  });

  test("re-evaluation prompt mentions the gap kind to address", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.ok(reeval.prompt.includes(gap.kind));
  });
});
