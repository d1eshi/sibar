import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { createAttempt, evaluateAttempt } from "../../src/runtime-attempt-evaluation.ts";
import { makeArtifact, makeEvidenceInventory, makeEvidenceRef, makeOperation } from "./fixtures.ts";

describe("VAL-PED-004: Evidence Check Evaluation", () => {
  test("evaluateAttempt identifies partial attempt with some claims met", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "I can see severityFor returns different severities based on answer quality. The function is in src/runtime-gap-detection.ts. But I cannot trace confidenceFor or predict gap_confirmed behavior.",
        selected_evidence: ["EV-001"],
        declared_confidence: "medium",
        declared_unknowns: ["Cannot trace confidenceFor branching"],
      }),
      operation,
      artifact,
    });

    assert.equal(result.evidenceCheck.result, "partial");
    assert.ok(result.evidenceCheck.observed_claims.length > 0, "Should have some observed claims");
    assert.ok(result.evidenceCheck.missing_claims.length > 0, "Should have some missing claims");
    assert.equal(result.evidenceCheck.contradicted_claims.length, 0);
    assert.equal(result.isOverconfident, false);
    assert.equal(result.hasDeclaredUncertainty, true);
  });

  test("evaluateAttempt detects contradicted claims when answer opposes counterevidence", () => {
    const operation = makeOperation();
    const artifact = makeArtifact({
      hidden_solution_evidence: [
        makeEvidenceRef({
          evidence_id: "EV-HIDDEN-001",
          start_line: 120,
          end_line: 180,
          excerpt: "detectLearningGapFromAnswer uses severityFor which returns critical for gap_confirmed quality at line 86. confidenceFor returns high for gap_confirmed at line 95. The LearningGap is constructed with critical severity and high confidence.",
        }),
      ],
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap_confirmed quality maps to important severity, not critical. The confidenceFor function returns low confidence for all gap cases.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.evidenceCheck.result, "contradiction");
    assert.ok(
      result.evidenceCheck.contradicted_claims.length > 0,
      "Should have contradicted claims when answer opposes counterevidence",
    );
  });

  test("evaluateAttempt rejects out-of-bound evidence citations", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();
    const inventory = makeEvidenceInventory();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection works by checking quality.",
        selected_evidence: ["EV-999", "EV-OUTOFBOUND"],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
      evidenceInventory: inventory,
    });

    assert.ok(
      result.evidenceCheck.unsupported_claims.some((claim) => claim.includes("out-of-bound") || claim.includes("EV-999")),
      "Should report out-of-bound evidence citations",
    );
  });

  test("evaluateAttempt detects over-scope claims with terminology outside artifact", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The authentication middleware intercepts requests and the database transaction manager coordinates the distributed cache invalidation. The gap detection is part of this pipeline.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(
      result.evidenceCheck.unsupported_claims.some((claim) =>
        claim.toLowerCase().includes("outside") || claim.toLowerCase().includes("scope") || claim.toLowerCase().includes("over-scope"),
      ) || result.evidenceCheck.unsupported_claims.length > 0,
      "Should flag over-scope terminology",
    );
  });

  test("evaluateAttempt produces insufficient_evidence for all-unknowns attempt", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "?",
        selected_evidence: [],
        declared_confidence: "low",
        declared_unknowns: ["Everything about gap detection is unclear to me"],
      }),
      operation,
      artifact,
    });

    assert.equal(result.evidenceCheck.result, "insufficient_evidence");
    assert.equal(result.hasDeclaredUncertainty, true);
  });

  test("evaluateAttempt validates attempt belongs to the correct operation", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    assert.throws(
      () => evaluateAttempt({
        attempt: createAttempt({
          operation_id: "OP-WRONG-ID",
          answer_text: "Test answer",
          selected_evidence: [],
          declared_confidence: "low",
          declared_unknowns: [],
        }),
        operation,
        artifact,
      }),
      /does not match operation/,
    );
  });

  test("evaluateAttempt classifies fully correct attempt as confirmed", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection has five fields: id, concept_slice_id, kind, evidence, severity. The severityFor function branches: gap_confirmed → critical, partial → important, uncertainty_declared → important. The confidenceFor function returns: verified → high, gap_confirmed → high, partial → medium. For gap_confirmed quality, the detection returns a LearningGap with critical severity, high confidence, and a repair action. All in src/runtime-gap-detection.ts lines 84-180.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.evidenceCheck.result, "confirmed");
  });

  test("evaluateAttempt fails closed when success criteria are empty", () => {
    const operation = makeOperation({ success_criteria: [] });
    const artifact = makeArtifact({
      user_operation: operation,
      success_criteria: [],
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "Any answer should not pass without defined criteria.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.notEqual(result.evidenceCheck.result, "confirmed");
    assert.equal(result.evidenceCheck.result, "insufficient_evidence");
  });

  test("evaluateAttempt blocks confirmed when out-of-bound citations are present", () => {
    const operation = makeOperation({
      success_criteria: ["Explains severityFor branching from answer quality"],
    });
    const artifact = makeArtifact({
      user_operation: operation,
      success_criteria: operation.success_criteria,
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The severityFor branching maps answer quality to severity values.",
        selected_evidence: ["EV-001", "EV-OUT-OF-BOUND-999"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(
      result.evidenceCheck.unsupported_claims.some((claim) => claim.includes("Out-of-bound evidence cited")),
      "Expected unsupported out-of-bound finding",
    );
    assert.notEqual(result.evidenceCheck.result, "confirmed");
  });

  test("evaluateAttempt blocks confirmed when over-scope findings are present", () => {
    const operation = makeOperation({
      success_criteria: ["Explains severityFor branching from answer quality"],
    });
    const artifact = makeArtifact({
      user_operation: operation,
      success_criteria: operation.success_criteria,
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "SeverityFor branches by quality, while authentication middleware database transaction coordinator handles distributed cache invalidation in microservice orchestration.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(
      result.evidenceCheck.unsupported_claims.some((claim) => claim.includes("outside the artifact scope")),
      "Expected over-scope unsupported finding",
    );
    assert.notEqual(result.evidenceCheck.result, "confirmed");
  });
});
