import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildDeepOwnershipMemory,
  buildPrerequisiteRoute,
  createReadinessClaim,
  createRepairAction,
} from "../../engine/runtime-pedagogy-loop.ts";
import type { OwnershipGap, OwnershipGapKind } from "../../engine/runtime-deep-ownership.ts";
import { makeConceptSlice, makeEvidenceRef, makeOperation } from "./fixtures.ts";

describe("Edge cases", () => {
  test("buildPrerequisiteRoute handles all gap kinds", () => {
    const allKinds: OwnershipGapKind[] = [
      "missing_prerequisite",
      "wrong_causal_model",
      "shallow_trace",
      "unsupported_claim",
      "false_confidence",
      "formula_misread",
      "implementation_misread",
      "behavior_misread",
      "transfer_failure",
      "test_oracle_misread",
      "vocabulary_only",
      "memorized_without_mechanism",
      "wrong_mechanism",
      "ignored_counterevidence",
      "passive_agreement",
    ];

    for (const kind of allKinds) {
      const gap: OwnershipGap = {
        id: `GAP-${kind}`,
        concept_slice_id: "CS-T001",
        kind,
        user_attempt_ref: "ATT-001",
        artifact_evidence_refs: [makeEvidenceRef()],
        evidence: "Test gap",
        severity: "important",
        blocks_readiness: true,
        created_at: new Date().toISOString(),
      };

      const route = buildPrerequisiteRoute({
        gap,
        originalOperation: makeOperation(),
        conceptSlice: makeConceptSlice(),
      });

      assert.ok(route);
      assert.ok(route.suspected_missing_concepts.length > 0);
      assert.ok(route.route_options.length > 0);
    }
  });

  test("createRepairAction produces prompt for all gap kinds", () => {
    const allKinds: OwnershipGapKind[] = [
      "missing_prerequisite",
      "wrong_causal_model",
      "shallow_trace",
      "unsupported_claim",
      "false_confidence",
      "formula_misread",
      "implementation_misread",
      "behavior_misread",
      "transfer_failure",
      "test_oracle_misread",
      "vocabulary_only",
      "memorized_without_mechanism",
      "wrong_mechanism",
      "ignored_counterevidence",
      "passive_agreement",
    ];

    for (const kind of allKinds) {
      const gap: OwnershipGap = {
        id: `GAP-${kind}`,
        concept_slice_id: "CS-T001",
        kind,
        user_attempt_ref: "ATT-001",
        artifact_evidence_refs: [makeEvidenceRef()],
        evidence: "Test gap",
        severity: "important",
        blocks_readiness: true,
        created_at: new Date().toISOString(),
      };

      assert.doesNotThrow(() => {
        const repair = createRepairAction({
          gap,
          conceptSlice: makeConceptSlice(),
        });
        assert.ok(repair.prompt.length > 0);
      });
    }
  });

  test("readiness for unknown status has no ready flags", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
    });

    assert.equal(claim.status, "unknown");
    assert.equal(claim.confidence, "low");
  });

  test("deep ownership memory handles empty answer history", () => {
    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory: [],
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    assert.equal(memory.concept_entries.length, 1);
    assert.equal(memory.answer_history.length, 0);
    assert.equal(memory.operation_entries.length, 0);
    assert.equal(memory.open_gaps.length, 0);
  });
});
