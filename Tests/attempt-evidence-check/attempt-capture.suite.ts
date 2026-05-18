import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { createAttempt } from "../../src/runtime-attempt-evaluation.ts";

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
