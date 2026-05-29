import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { createAttempt, evaluateAttempt } from "../../engine/pedagogy/core/attempt-evaluation.ts";
import { makeArtifact, makeEvidenceRef, makeOperation } from "./fixtures.ts";

describe("VAL-PED-005: Declared Uncertainty Handling", () => {
  test("declared uncertainty is stored as evidence, not discarded", () => {
    const attempt = createAttempt({
      operation_id: "OP-TEST-001",
      answer_text: "I do not know.",
      selected_evidence: [],
      declared_confidence: "low",
      declared_unknowns: [
        "Cannot trace severityFor branching",
        "Cannot name gap fields",
      ],
    });

    assert.equal(attempt.declared_unknowns.length, 2);
    assert.equal(attempt.answer_text, "I do not know.");
    assert.ok(attempt.id);
    assert.ok(attempt.created_at);
  });

  test("evaluateAttempt does not invent false misconception for declared uncertainty", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "I do not know.",
        selected_evidence: [],
        declared_confidence: "low",
        declared_unknowns: ["Cannot trace any part of gap detection"],
      }),
      operation,
      artifact,
    });

    if (result.gapKind) {
      assert.ok(
        ["shallow_trace", "missing_prerequisite"].includes(result.gapKind),
        `Gap kind for declared uncertainty should be shallow_trace or missing_prerequisite, got '${result.gapKind}'`,
      );
    }
    assert.equal(result.isOverconfident, false);
    assert.equal(result.hasDeclaredUncertainty, true);
  });

  test("declared uncertainty with partial trace produces a gap without invented misconception", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "I can trace severityFor but not confidenceFor.",
        selected_evidence: ["EV-001"],
        declared_confidence: "low",
        declared_unknowns: [
          "Cannot trace confidenceFor",
          "Cannot predict gap_confirmed behavior",
        ],
      }),
      operation,
      artifact,
    });

    assert.equal(result.hasDeclaredUncertainty, true);
    if (result.gapKind) {
      assert.notEqual(result.gapKind, "false_confidence");
      assert.notEqual(result.gapKind, "wrong_mechanism");
    }
  });
});

describe("VAL-PED-006: False Confidence Detection", () => {
  test("high confidence with unsupported claims is overconfident", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection is simple. All qualities map to the same severity. Everything works the same way.",
        selected_evidence: [],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.isOverconfident, true);
    assert.equal(result.gapKind, "false_confidence");
  });

  test("high confidence with contradicted claims is overconfident", () => {
    const operation = makeOperation();
    const artifact = makeArtifact({
      hidden_solution_evidence: [
        makeEvidenceRef({
          evidence_id: "EV-HIDDEN-001",
          start_line: 120,
          end_line: 180,
          excerpt: "detectLearningGapFromAnswer uses severityFor which returns critical for gap_confirmed quality at line 86. confidenceFor returns high for gap_confirmed at line 95.",
        }),
      ],
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "I'm certain that gap_confirmed maps to important severity, not critical. The confidenceFor returns low for everything.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.isOverconfident, true);
    assert.ok(
      result.gapKind === "false_confidence" || result.gapKind === "ignored_counterevidence",
      `Expected false_confidence or ignored_counterevidence, got ${result.gapKind}`,
    );
  });

  test("low confidence with incorrect answer is not overconfident", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "I'm not sure but I think gap_confirmed maps to important severity.",
        selected_evidence: ["EV-001"],
        declared_confidence: "low",
        declared_unknowns: ["Not sure about the severity mapping"],
      }),
      operation,
      artifact,
    });

    assert.equal(result.isOverconfident, false);
    assert.notEqual(result.gapKind, "false_confidence");
  });

  test("high confidence with correct, evidence-backed answer is NOT overconfident", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The severityFor function returns critical for gap_confirmed at line 86, important for partial at line 87, important for uncertainty_declared at line 88. The confidenceFor returns high for verified at line 94, high for gap_confirmed at line 95, medium for partial at line 96, medium for uncertainty_declared at line 97. These functions are at src/runtime-gap-detection.ts lines 84-112.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.isOverconfident, false);
    if (result.gapKind) {
      assert.notEqual(result.gapKind, "false_confidence");
    }
  });
});
