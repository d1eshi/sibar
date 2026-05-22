import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { createOwnershipGap } from "../../engine/runtime-pedagogy-loop.ts";
import { evaluateAttempt } from "../../engine/runtime-attempt-evaluation.ts";
import {
  evaluateOverconfidentAttempt,
  evaluateShallowAttempt,
  makeArtifact,
  makeEvidenceRef,
  makeOperation,
  makeShallowAttempt,
} from "./fixtures.ts";

describe("VAL-PED-001: Gaps cite both user attempt and artifact evidence", () => {
  test("gap includes user_attempt_ref linking to the attempt", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.ok(gap, "Should create a gap for a shallow attempt");
    assert.equal(gap.user_attempt_ref, attempt.id);
    assert.ok(gap.artifact_evidence_refs.length > 0);
    assert.ok(gap.artifact_evidence_refs.every((ref) =>
      ref.evidence_id && ref.file_path && ref.excerpt));
  });

  test("gap evidence field describes both user and artifact sides", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.ok(gap);
    assert.ok(gap.evidence.length > 20);
    assert.ok(gap.evidence.includes("Gap kind:"));
  });

  test("correct attempt produces no gap (null)", () => {
    const operation = makeOperation({
      success_criteria: ["Names at least one intermediate step", "Cites evidence"],
    });
    const artifact = makeArtifact({
      success_criteria: operation.success_criteria,
      user_operation: operation,
    });
    const attempt = makeShallowAttempt();
    attempt.answer_text = "Names at least one intermediate step: input validation. Cites evidence: src/module.ts lines 10-50.";
    attempt.declared_unknowns = [];
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.equal(gap, null);
  });

  test("gap fails closed without artifact evidence", () => {
    const attempt = makeShallowAttempt();
    const evalOutputWithEvidence = evaluateAttempt({
      attempt: makeShallowAttempt(),
      operation: makeOperation(),
      artifact: makeArtifact({ source_evidence: [makeEvidenceRef()] }),
    });

    const gap = createOwnershipGap({
      evalOutput: evalOutputWithEvidence,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact: makeArtifact({ source_evidence: [makeEvidenceRef()] }),
    });

    assert.ok(gap);
    assert.ok(gap.artifact_evidence_refs.length > 0);
  });

  test("gap severity and blocks_readiness are set correctly", () => {
    const { attempt, operation, artifact } = evaluateOverconfidentAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.ok(gap);
    assert.equal(gap.severity, "critical");
    assert.equal(gap.blocks_readiness, true);
  });
});
