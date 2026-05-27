import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildPrerequisiteRoute,
  createOwnershipGap,
  evaluateFullLoop,
} from "../../engine/pedagogy/core/loop.ts";
import { createAttempt, evaluateAttempt } from "../../engine/pedagogy/core/attempt-evaluation.ts";
import type { OwnershipGap } from "../../engine/deep-ownership/index.ts";
import {
  evaluateShallowAttempt,
  makeConceptSlice,
  makeEvidenceRef,
  makeOperation,
  makeArtifact,
} from "./fixtures.ts";

describe("VAL-LOOP-015: Prerequisite routes return to original operation", () => {
  test("prerequisite route references the original operation id", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: operation,
      conceptSlice: makeConceptSlice(),
    });

    assert.equal(route.original_operation_id, operation.id);
  });

  test("prerequisite route has return condition mentioning original operation", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: operation,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(route.return_condition.includes(operation.id));
    assert.ok(route.return_condition.includes(operation.kind));
  });

  test("prerequisite route includes concrete route options", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: operation,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(route.route_options.length > 0);
    for (const option of route.route_options) {
      assert.ok(option.level);
      assert.ok(option.label);
      assert.ok(option.description);
    }
    assert.ok(route.recommended_start);
  });

  test("prerequisite route for false_confidence is not auto-generated", () => {
    const gap: OwnershipGap = {
      id: "GAP-TEST",
      concept_slice_id: "CS-T001",
      kind: "false_confidence",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "critical",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: makeOperation(),
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(route);
    assert.equal(route.original_operation_id, "OP-T001");
  });

  test("prerequisite route preserves return path to original operation in full sequence", () => {
    const operation = makeOperation({ id: "OP-RETURN-001" });
    const artifact = makeArtifact({ user_operation: operation });
    const conceptSlice = makeConceptSlice();

    const attempt = createAttempt({
      operation_id: "OP-RETURN-001",
      answer_text: "I can see there's a function that does the mapping. It uses some branching logic, but I can't trace exactly which line does what.",
      selected_evidence: ["EV-T001"],
      declared_confidence: "medium",
      declared_unknowns: ["Cannot trace specific branching lines"],
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

    assert.ok(result.prerequisiteRoute);
    assert.equal(result.prerequisiteRoute?.original_operation_id, "OP-RETURN-001");
    assert.ok(result.prerequisiteRoute?.return_condition.includes("OP-RETURN-001"));
  });
});
