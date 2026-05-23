import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  createAttempt,
  evaluateAttempt,
  classifyGapTaxonomy,
} from "../../engine/pedagogy/core/attempt-evaluation.ts";
import type { EvidenceCheck, UserAttempt } from "../../engine/deep-ownership/index.ts";
import { makeArtifact, makeEvidenceRef, makeOperation } from "./fixtures.ts";

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

    assert.equal(result.gapKind, "vocabulary_only");
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

    assert.equal(result.gapKind, "memorized_without_mechanism");
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

    assert.equal(result.gapKind, "test_oracle_misread");
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

    assert.ok(
      result.gapKind === "wrong_mechanism"
      || result.gapKind === "false_confidence"
      || result.gapKind === "unsupported_claim",
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

    if (result.evidenceCheck.contradicted_claims.length > 0) {
      assert.equal(result.gapKind, "ignored_counterevidence");
    } else {
      assert.equal(result.gapKind, "false_confidence");
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

    assert.equal(result.gapKind, "passive_agreement");
  });

  test("gap taxonomy returns null for confirmed attempt", () => {
    const evidenceCheck: EvidenceCheck = {
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

    const gapKind = classifyGapTaxonomy(attempt, evidenceCheck);
    assert.equal(gapKind, null);
  });
});
