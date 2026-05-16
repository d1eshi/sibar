import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  createAttempt,
  evaluateAttempt,
  captureAndEvaluate,
  classifyGapTaxonomy,
} from "../src/runtime-attempt-evaluation.ts";
import type {
  UserAttempt,
  UserOperation,
  ThinkingArtifact,
  EvidenceCheck,
  EvidenceCheckResult,
  EvidenceRef,
  OwnershipGapKind,
  EvidenceInventoryEntry,
} from "../src/runtime-deep-ownership.ts";

// ── Test Fixtures ────────────────────────────────────────────────────

function makeOperation(overrides?: Partial<UserOperation>): UserOperation {
  return {
    id: "OP-TEST-001",
    kind: "trace",
    prompt: "Trace how detectLearningGapFromAnswer maps answer quality to gap fields. Name the files and line ranges.",
    artifact_ids: ["ART-TEST-001"],
    required_evidence: ["EV-001"],
    allowed_hints: 3,
    blocked_shortcuts: ["read the full solution", "ask AI to explain"],
    success_criteria: [
      "Names at least five gap fields with their source line ranges",
      "Explains severityFor branching from answer_quality to severity",
      "Explains confidenceFor branching from answer_quality to confidence",
      "Predicts correct behavior for gap_confirmed quality",
      "Cites specific file:line evidence for each claim",
    ],
    ...overrides,
  };
}

function makeEvidenceRef(overrides?: Partial<EvidenceRef>): EvidenceRef {
  return {
    evidence_id: "EV-001",
    file_path: "src/runtime-gap-detection.ts",
    start_line: 84,
    end_line: 112,
    excerpt: "severityFor and confidenceFor branching logic",
    role: "implementation",
    ...overrides,
  };
}

function makeArtifact(overrides?: Partial<ThinkingArtifact>): ThinkingArtifact {
  const ref1 = makeEvidenceRef();
  const hiddenRef = makeEvidenceRef({
    evidence_id: "EV-HIDDEN-001",
    start_line: 120,
    end_line: 180,
    excerpt: "detectLearningGapFromAnswer constructs LearningGap from severity, confidence, misconception, and repair action",
  });

  return {
    id: "ART-TEST-001",
    kind: "code_slice",
    title: "Gap Detection Code Slice",
    purpose: "Understand how gap detection maps answer quality to gap fields",
    concept_slice_id: "CS-TEST-001",
    source_evidence: [ref1],
    hidden_solution_evidence: [hiddenRef],
    user_operation: makeOperation(),
    renderer: "code_slice",
    payload: {},
    success_criteria: [
      "Names at least five gap fields with their source line ranges",
      "Explains severityFor branching from answer_quality to severity",
      "Explains confidenceFor branching from answer_quality to confidence",
      "Predicts correct behavior for gap_confirmed quality",
      "Cites specific file:line evidence for each claim",
    ],
    created_at: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function makeEvidenceInventory(): EvidenceInventoryEntry[] {
  return [
    {
      id: "EV-001",
      path: "src/runtime-gap-detection.ts",
      source_type: "implementation",
      size_bytes: 5000,
      extension: ".ts",
      role: "implementation",
      content_hash: "abc123",
      excerpt: "Gap detection runtime module",
      status: "inspected",
    },
    {
      id: "EV-002",
      path: "Tests/gap-detection.test.ts",
      source_type: "behavior_oracle",
      size_bytes: 3000,
      extension: ".ts",
      role: "behavior_oracle",
      content_hash: "def456",
      excerpt: "Gap detection test cases",
      status: "inspected",
    },
  ];
}

// ── VAL-LOOP-003: User Attempts Are Stored As Evidence ────────────────

describe("VAL-LOOP-003: Attempt Capture", () => {
  test("createAttempt stores all required fields", () => {
    const attempt = createAttempt({
      operation_id: "OP-TEST-001",
      answer_text: "I traced severityFor from answer_quality to severity. gap_confirmed → critical, partial → important.",
      selected_evidence: ["EV-001", "EV-002"],
      declared_confidence: "medium",
      declared_unknowns: ["Cannot trace confidenceFor branching fully"],
    });

    assert.ok(attempt.id.startsWith("ATT-"), "Attempt ID should have ATT- prefix");
    assert.equal(attempt.operation_id, "OP-TEST-001");
    assert.ok(attempt.answer_text.length > 0, "Answer text should not be empty");
    assert.deepEqual(attempt.selected_evidence, ["EV-001", "EV-002"]);
    assert.equal(attempt.declared_confidence, "medium");
    assert.deepEqual(attempt.declared_unknowns, ["Cannot trace confidenceFor branching fully"]);
    assert.ok(typeof attempt.created_at === "string", "created_at must be a string timestamp");
    assert.ok(Date.parse(attempt.created_at) > 0, "created_at must be a valid ISO timestamp");
  });

  test("createAttempt accepts low confidence with multiple unknowns", () => {
    const attempt = createAttempt({
      operation_id: "OP-TEST-001",
      answer_text: "I can see the functions but I cannot trace the flow.",
      selected_evidence: [],
      declared_confidence: "low",
      declared_unknowns: [
        "Cannot trace severityFor branching",
        "Cannot name gap fields",
        "Cannot predict behavior changes",
      ],
    });

    assert.equal(attempt.declared_confidence, "low");
    assert.equal(attempt.declared_unknowns.length, 3);
  });

  test("createAttempt accepts 'I do not know' as valid attempt", () => {
    const attempt = createAttempt({
      operation_id: "OP-TEST-001",
      answer_text: "I do not know.",
      selected_evidence: [],
      declared_confidence: "low",
      declared_unknowns: [
        "Cannot trace severityFor",
        "Cannot name the exact line that assigns suspected_misconception",
      ],
    });

    assert.equal(attempt.answer_text, "I do not know.");
    assert.equal(attempt.declared_confidence, "low");
    assert.ok(attempt.declared_unknowns.length > 0, "Declared unknowns should be preserved");
    assert.ok(attempt.id, "Attempt should have an ID even for 'I do not know'");
    // "I do not know" attempts are stored as uncertainty evidence, not discarded
    assert.ok(attempt.created_at, "Timestamp should be present");
  });

  test("createAttempt validates operation_id is required", () => {
    assert.throws(
      () => createAttempt({
        operation_id: "",
        answer_text: "Some answer",
        selected_evidence: [],
        declared_confidence: "low",
        declared_unknowns: [],
      }),
      /operation_id is required/,
    );
  });

  test("createAttempt validates declared_confidence is valid", () => {
    assert.throws(
      () => createAttempt({
        operation_id: "OP-TEST-001",
        answer_text: "Some answer",
        selected_evidence: [],
        declared_confidence: "extreme" as "low",
        declared_unknowns: [],
      }),
      /Invalid declared_confidence/,
    );
  });

  test("createAttempt stores timestamp in ISO format", () => {
    const attempt = createAttempt({
      operation_id: "OP-TEST-001",
      answer_text: "Test answer",
      selected_evidence: [],
      declared_confidence: "low",
      declared_unknowns: [],
    });

    const parsed = new Date(attempt.created_at);
    assert.ok(!isNaN(parsed.getTime()), "Timestamp must be parseable");
    assert.ok(attempt.created_at.endsWith("Z") || attempt.created_at.includes("+") || attempt.created_at.includes("-"), "Timestamp should be ISO 8601");
  });
});

// ── VAL-PED-004: Evidence Checks Reject Unsupported, Out-Of-Bound, Over-Scope ──

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

    // Should detect the contradiction with the hidden solution evidence
    // which says gap_confirmed → critical severity and high confidence
    assert.equal(result.evidenceCheck.result, "contradiction");
    assert.ok(result.evidenceCheck.contradicted_claims.length > 0,
      "Should have contradicted claims when answer opposes counterevidence");
  });

  test("evaluateAttempt creates EvidenceCheck with all required fields", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The severityFor function maps gap_confirmed quality to critical, partial to important, and uncertainty_declared to important. The confidenceFor function maps verified to high, gap_confirmed to high, partial to medium. Both are in src/runtime-gap-detection.ts lines 84-112.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    const ec = result.evidenceCheck;
    assert.ok(ec.id.startsWith("EC-"), "EvidenceCheck should have EC- prefix ID");
    assert.equal(ec.attempt_id, result.evidenceCheck.attempt_id);
    assert.ok(Array.isArray(ec.required_claims), "required_claims must be an array");
    assert.ok(Array.isArray(ec.observed_claims), "observed_claims must be an array");
    assert.ok(Array.isArray(ec.missing_claims), "missing_claims must be an array");
    assert.ok(Array.isArray(ec.contradicted_claims), "contradicted_claims must be an array");
    assert.ok(Array.isArray(ec.unsupported_claims), "unsupported_claims must be an array");
    assert.ok(Array.isArray(ec.cited_evidence), "cited_evidence must be an array");
    assert.ok(Array.isArray(ec.artifact_counterevidence), "artifact_counterevidence must be an array");
    assert.ok(
      ["confirmed", "partial", "gap", "contradiction", "insufficient_evidence"].includes(ec.result),
      `Result must be a valid EvidenceCheckResult, got '${ec.result}'`,
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

    // Out-of-bound evidence should appear in unsupported_claims
    assert.ok(
      result.evidenceCheck.unsupported_claims.some((c) => c.includes("out-of-bound") || c.includes("EV-999")),
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

    // Terms like "authentication", "middleware", "database", "transaction", "distributed", "cache"
    // should not be in the artifact's scope
    assert.ok(
      result.evidenceCheck.unsupported_claims.some((c) =>
        c.toLowerCase().includes("outside") || c.toLowerCase().includes("scope") || c.toLowerCase().includes("over-scope"),
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

    // Answer addresses all success criteria with evidence
    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection has five fields: id, concept_slice_id, kind, evidence, severity. The severityFor function branches: gap_confirmed → critical, partial → important, uncertainty_declared → important. The confidenceFor function returns: verified → high, gap_confirmed → high, partial → medium, uncertainty_declared → medium. For gap_confirmed quality, the detection returns a LearningGap with critical severity, high confidence, and a repair action. All in src/runtime-gap-detection.ts lines 84-180.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(
      ["confirmed", "partial"].includes(result.evidenceCheck.result),
      "A thorough answer should be confirmed or partial, not gap",
    );
  });
});

// ── VAL-PED-005: Declared Uncertainty Produces Repairable Gap ─────────

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

    // The attempt is stored with its unknowns — it's evidence of uncertainty
    assert.equal(attempt.declared_unknowns.length, 2);
    assert.equal(attempt.answer_text, "I do not know.");
    // It's not discarded; it has an ID, timestamp, and all fields
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

    // Gap kind for pure "I don't know" should be shallow_trace or missing_prerequisite
    // — not a strong misconception like wrong_causal_model or false_confidence
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

    // Should have declared uncertainty
    assert.equal(result.hasDeclaredUncertainty, true);

    // Should NOT produce a gap if it's purely about declared uncertainty
    // The gap should be based on what's actually missing, not invented
    if (result.gapKind) {
      assert.notEqual(result.gapKind, "false_confidence",
        "Should not be false_confidence when user admits uncertainty");
      assert.notEqual(result.gapKind, "wrong_mechanism",
        "Should not invent wrong mechanism when user admits uncertainty");
    }
  });
});

// ── VAL-PED-006: False Confidence Blocks Readiness ────────────────────

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
    assert.equal(result.gapKind, "false_confidence",
      "High confidence with unsupported claims should be false_confidence");
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
    // When contradicted claims exist, ignored_counterevidence is the primary gap
    // (more specific than false_confidence)
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
    assert.notEqual(result.gapKind, "false_confidence",
      "Low confidence wrong answer should not be false_confidence");
  });

  test("high confidence with correct, evidence-backed answer is NOT overconfident", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The severityFor function returns critical for gap_confirmed at line 86, important for partial at line 87, important for uncertainty_declared at line 88. The confidenceFor returns high for verified at line 94, high for gap_confirmed at line 95, medium for partial at line 96, medium for uncertainty_declared at line 97. These functions are at src/runtime-gap-detection.ts lines 84-112. For gap_confirmed the detection creates a LearningGap with critical severity, high confidence, and a concrete repair action at lines 120-180.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    // A correct, thorough answer with high confidence should not be overconfident
    assert.equal(result.isOverconfident, false);
    if (result.gapKind) {
      assert.notEqual(result.gapKind, "false_confidence");
    }
  });
});

// ── VAL-PED-010: Gap Taxonomy Handles Dangerous Partial Understanding ─

describe("VAL-PED-010: Gap Taxonomy", () => {
  test("vocabulary_only: uses correct terms but no mechanism", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection module uses severity and confidence. It maps answer quality to gap fields. It's in the runtime.",
        selected_evidence: [],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.gapKind, "vocabulary_only",
      "Using correct terminology without mechanism should be vocabulary_only");
  });

  test("memorized_without_mechanism: recites facts without explaining how/why", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection module contains functions. It has observedLayer, severityFor, and confidenceFor. The gap object includes fields like id, concept_id, severity, and confidence. These components are part of the runtime system. Different qualities produce different severities.",
        selected_evidence: ["EV-001"],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.gapKind, "memorized_without_mechanism",
      "Reciting facts without causal explanation should be memorized_without_mechanism");
  });

  test("test_oracle_misread: misinterprets test behavior", () => {
    const operation = makeOperation({
      success_criteria: [
        "Explains what the gap detection test proves about behavior",
        "Cites test evidence correctly",
      ],
    });
    const artifact = makeArtifact({
      user_operation: operation,
      success_criteria: operation.success_criteria,
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The test shows that gap detection is wrong. The asserts prove the function returns incorrect severity values. The test output matches the expected behavior incorrectly. The module implementation is broken.",
        selected_evidence: [],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    // Should detect test oracle misread
    assert.equal(result.gapKind, "test_oracle_misread",
      "Misinterpreting test behavior should be test_oracle_misread");
  });

  test("wrong_mechanism: correct conclusion, wrong reasoning", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection returns critical for gap_confirmed because the system wants to scare the user. The severity is high because the code implementation reads from a database that stores severity levels.",
        selected_evidence: ["EV-001"],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    // Should detect wrong mechanism (uses "because" with wrong reasoning)
    assert.ok(
      result.gapKind === "wrong_mechanism" || result.gapKind === "false_confidence" || result.gapKind === "unsupported_claim",
      `Expected wrong_mechanism, got ${result.gapKind}`,
    );
  });

  test("ignored_counterevidence: contradicts artifact counterevidence", () => {
    const operation = makeOperation();
    const artifact = makeArtifact({
      hidden_solution_evidence: [
        makeEvidenceRef({
          evidence_id: "EV-HIDDEN-001",
          start_line: 84,
          end_line: 112,
          excerpt: "severityFor branching logic classifies answer quality into critical, important, or later severity levels. The function uses a switch or if-else chain to determine the correct classification.",
        }),
      ],
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection simply stores all answers in a flat list without any severity classification. There is no branching logic in severityFor.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    // Answer contradicts the hidden solution evidence which describes severityFor branching
    if (result.evidenceCheck.contradicted_claims.length > 0) {
      assert.equal(result.gapKind, "ignored_counterevidence",
        "Contradicting artifact evidence should be ignored_counterevidence");
    } else {
      assert.equal(result.gapKind, "false_confidence",
        "If no explicit contradiction detected, should still be false_confidence for wrong high-confidence claim");
    }
  });

  test("passive_agreement: agrees without constructing", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "Yes, that makes sense. I agree with this analysis.",
        selected_evidence: [],
        declared_confidence: "medium",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.gapKind, "passive_agreement",
      "Agreeing without constructing should be passive_agreement");
  });

  test("passive_agreement with 'sounds right' is detected", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "Sounds right. Good point.",
        selected_evidence: [],
        declared_confidence: "low",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.equal(result.gapKind, "passive_agreement");
  });

  test("gap taxonomy returns null for confirmed attempt", () => {
    const ec: EvidenceCheck = {
      id: "EC-TEST-001",
      attempt_id: "ATT-TEST-001",
      required_claims: ["Claim 1"],
      observed_claims: ["Claim 1"],
      missing_claims: [],
      contradicted_claims: [],
      unsupported_claims: [],
      cited_evidence: [makeEvidenceRef()],
      artifact_counterevidence: [],
      result: "confirmed",
    };

    const attempt: UserAttempt = {
      id: "ATT-TEST-001",
      operation_id: "OP-TEST-001",
      answer_text: "Correct answer with evidence",
      selected_evidence: ["EV-001"],
      declared_confidence: "medium",
      declared_unknowns: [],
      created_at: new Date().toISOString(),
    };

    const gapKind = classifyGapTaxonomy(attempt, ec);
    assert.equal(gapKind, null, "Confirmed attempt should have no gap taxonomy");
  });
});

// ── VAL-CROSS-005: Artifact Generation Feeds Attempt Evaluation ───────

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

    // The required_claims in the EvidenceCheck should match the artifact/operation criteria
    assert.deepEqual(
      result.evidenceCheck.required_claims,
      artifact.success_criteria,
      "EvidenceCheck required_claims should come from the artifact/operation",
    );
  });

  test("evaluateAttempt uses artifact's source_evidence for citation validation", () => {
    const ref1 = makeEvidenceRef({ evidence_id: "EV-CUSTOM", file_path: "src/custom.ts" });
    const artifact = makeArtifact({
      source_evidence: [ref1],
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
      "Cited evidence should include matches from artifact source_evidence",
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

    // Contradiction should be detected from the hidden solution evidence
    assert.ok(
      result.evidenceCheck.artifact_counterevidence.length > 0,
      "artifact_counterevidence should include hidden solution evidence refs",
    );
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

    // Attempt and EvidenceCheck should be linked
    assert.equal(result.evidenceCheck.attempt_id, result.attempt.id);
    assert.equal(result.attempt.operation_id, operation.id);
    assert.ok(result.evidenceCheck.id.startsWith("EC-"));
    assert.ok(result.attempt.id.startsWith("ATT-"));
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────

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

    // Without evidence, claims should be unsupported
    assert.equal(result.evidenceCheck.cited_evidence.length, 0);
    assert.ok(
      result.evidenceCheck.unsupported_claims.length > 0
      || result.evidenceCheck.missing_claims.length > 0,
      "Without evidence, claims should be unsupported or missing",
    );
  });

  test("evaluateAttempt with evidenceInventory validates evidence IDs", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();
    const inventory = makeEvidenceInventory();

    // EV-002 is in inventory, EV-999 is not
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

    // Should cite in-bound evidence
    assert.ok(
      result.evidenceCheck.cited_evidence.some((ref) => ref.evidence_id === "EV-001"),
      "EV-001 should be cited (in artifact source_evidence)",
    );

    // EV-999 should be flagged as out-of-bound
    assert.ok(
      result.evidenceCheck.unsupported_claims.some((c) => c.includes("EV-999")),
      "Out-of-bound EV-999 should be flagged in unsupported_claims",
    );
  });

  test("evaluateAttempt handles attempt with all evidence matched", () => {
    const operation = makeOperation({
      success_criteria: ["Cites evidence EV-001 correctly"],
    });
    const artifact = makeArtifact({
      success_criteria: ["Cites evidence EV-001 correctly"],
      user_operation: operation,
    });

    const result = evaluateAttempt({
      attempt: createAttempt({
        operation_id: operation.id,
        answer_text: "The gap detection module cites evidence EV-001 correctly at src/runtime-gap-detection.ts lines 84-112. The evidence shows severityFor and confidenceFor branching logic.",
        selected_evidence: ["EV-001"],
        declared_confidence: "high",
        declared_unknowns: [],
      }),
      operation,
      artifact,
    });

    assert.ok(result.evidenceCheck.observed_claims.length > 0);
    assert.ok(result.evidenceCheck.cited_evidence.length > 0);
  });
});
