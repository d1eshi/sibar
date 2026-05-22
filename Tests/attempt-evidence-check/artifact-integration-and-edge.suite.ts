import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  captureAndEvaluate,
  createAttempt,
  evaluateAttempt,
} from "../../engine/runtime-attempt-evaluation.ts";
import { makeArtifact, makeEvidenceInventory, makeEvidenceRef, makeOperation } from "./fixtures.ts";

describe("VAL-CROSS-005: Artifact Feeds Attempt Evaluation", () => {
  test("evaluateAttempt uses artifact's success criteria for evaluation", () => {
    const artifact = makeArtifact({
      success_criteria: [
        "Custom criterion: traces the full flow",
        "Custom criterion: identifies all helper functions",
      ],
    });
    const operation = makeOperation({
      success_criteria: artifact.success_criteria,
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "I traced the full flow through the helper functions.",
        selected_evidence: ["EV-001"],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.deepEqual(result.evidenceCheck.required_claims, artifact.success_criteria);
  });

  test("evaluateAttempt uses artifact's source_evidence for citation validation", () => {
    const reference = makeEvidenceRef({ evidence_id: "EV-CUSTOM", file_path: "src/custom.ts" });
    const artifact = makeArtifact({
      source_evidence: [reference],
    });
    const operation = makeOperation({
      required_evidence: ["EV-CUSTOM"],
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "Custom trace using the evidence.",
        selected_evidence: ["EV-CUSTOM"],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(
      result.evidenceCheck.cited_evidence.some((ref) => ref.evidence_id === "EV-CUSTOM"),
    );
  });

  test("evaluateAttempt uses artifact's hidden_solution_evidence for contradiction detection", () => {
    const operation = makeOperation();
    const hiddenRef = makeEvidenceRef({
      evidence_id: "EV-HIDDEN-CUSTOM",
      file_path: "src/secret.ts",
      start_line: 1,
      end_line: 10,
      excerpt: "The actual answer is that severityFor branches on answer quality using a switch statement",
    });
    const artifact = makeArtifact({
      hidden_solution_evidence: [hiddenRef],
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The severityFor function does not branch at all. It always returns the same severity. There is no switch statement and no quality-based logic.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(result.evidenceCheck.artifact_counterevidence.length > 0);
  });

  test("captureAndEvaluate provides full pipeline with consistent linking", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = captureAndEvaluate({
      operation,
      artifact,
      answer_text: "I partially traced the gap detection. I can name severityFor and confidenceFor but cannot trace confidenceFor branching.",
      selected_evidence: ["EV-001"],
      declared_confidence: "medium",
      declared_unknowns: ["Cannot trace confidenceFor branching"],
    });

    assert.equal(result.evidenceCheck.attempt_id, result.attempt.id);
    assert.equal(result.attempt.operation_id, operation.id);
    assert.ok(result.evidenceCheck.id.startsWith("EC-"));
    assert.ok(result.attempt.id.startsWith("ATT-"));
  });
});

describe("Edge Cases and Robustness", () => {
  test("evaluateAttempt handles empty answer text gracefully", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "",
        selected_evidence: [],
        declared_confidence: "low",
        declared_unknowns: ["Cannot answer at all"],
      }),
      operation,
      artifact,
    });

    assert.equal(result.hasDeclaredUncertainty, true);
    assert.equal(result.isOverconfident, false);
    assert.equal(result.evidenceCheck.result, "insufficient_evidence");
  });

  test("evaluateAttempt handles no selected evidence", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection maps qualities. I think severityFor returns different values. It probably handles gap_confirmed somehow.",
        selected_evidence: [],
        declared_confidence: "low",
        declared_unknowns: ["Not sure about any of this"],
      }),
      operation,
      artifact,
    });

    assert.equal(result.evidenceCheck.cited_evidence.length, 0);
    assert.ok(
      result.evidenceCheck.unsupported_claims.length > 0
      || result.evidenceCheck.missing_claims.length > 0,
    );
  });

  test("evaluateAttempt with evidenceInventory validates evidence IDs", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();
    const inventory = makeEvidenceInventory();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "Gap detection uses behavior oracles to verify correctness.",
        selected_evidence: ["EV-001", "EV-002", "EV-999"],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
      evidenceInventory: inventory,
    });

    assert.ok(result.evidenceCheck.cited_evidence.some((ref) => ref.evidence_id === "EV-001"));
    assert.ok(
      result.evidenceCheck.unsupported_claims.some((claim) => claim.includes("EV-999")),
    );
  });
});
