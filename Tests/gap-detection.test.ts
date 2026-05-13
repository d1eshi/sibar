import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../src/runtime.ts";
import type { AutopsyStep, ConceptUnderstandingState, LearningGap } from "../src/runtime-support.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createGapFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-gap-detection-"));
  const src = join(root, "src");
  const tests = join(root, "Tests");
  mkdirSync(src, { recursive: true });
  mkdirSync(tests);

  writeFileSync(join(src, "runtime.ts"), [
    "import { readState, writeState } from './runtime-state.ts';",
    "import { generateQuestions } from './pedagogy/questions.ts';",
    "export function handleRequest(request: { command: string }) {",
    "  if (request.command === 'answer_question') return writeState(readState());",
    "  if (request.command === 'generate_questions') return generateQuestions([]);",
    "  return null;",
    "}",
  ].join("\n"));
  writeFileSync(join(src, "runtime-state.ts"), [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "export function readState() { return JSON.parse(readFileSync('state.json', 'utf8')); }",
    "export function writeState(value: unknown) { return writeFileSync('state.json', JSON.stringify(value)); }",
  ].join("\n"));
  writeFileSync(join(tests, "runtime.test.ts"), [
    "import test from 'node:test';",
    "test('gap detection fixture', () => {});",
  ].join("\n"));

  return root;
}

function prepareGapQuestion(): {
  artifactSessionID: string;
  sessionID: string;
  questionID: string;
  autopsyStep: AutopsyStep;
} {
  withTempHome();
  const root = createGapFixture();
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Gap detection fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Detect learning gaps from answer evidence",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: [],
    },
  }));

  expectSuccess(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: created.data.artifact_session.artifact_session_id },
  }));
  const prepared = expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: {
      artifact_session_id: created.data.artifact_session.artifact_session_id,
      concept_id: "runtime-boundary",
    },
  }));

  return {
    artifactSessionID: created.data.artifact_session.artifact_session_id,
    sessionID: prepared.data.autopsy_step.session_id,
    questionID: prepared.data.autopsy_step.question_id,
    autopsyStep: prepared.data.autopsy_step,
  };
}

function assertLearningGap(gap: LearningGap, expected: {
  artifactSessionID: string;
  sessionID: string;
  questionID: string;
  severity: "critical" | "important" | "later";
  confidence: "low" | "medium" | "high";
}): void {
  assert.equal(gap.artifact_session_id, expected.artifactSessionID);
  assert.equal(gap.session_id, expected.sessionID);
  assert.equal(gap.question_id, expected.questionID);
  assert.equal(gap.concept_id, "runtime-boundary");
  assert.ok(gap.concept_label.trim().length > 0);
  assert.equal(gap.expected_layer, 4);
  assert.ok(gap.observed_layer >= 1);
  assert.ok(gap.observed_answer_or_uncertainty.trim().length > 0);
  assert.ok(gap.artifact_evidence.length >= 1);
  assert.ok(gap.artifact_evidence.every((entry) => entry.file_path !== "question_evidence"));
  assert.ok(gap.answer_evidence.some((entry) => entry.startsWith("answer=")));
  assert.ok(gap.suspected_misconception.trim().length > 0);
  assert.equal(gap.severity, expected.severity);
  assert.equal(gap.confidence, expected.confidence);
  assert.ok(gap.repair_action.trim().length > 0);
}

test("answer_question emits and persists a partial-answer learning gap", () => {
  const fixture = prepareGapQuestion();
  const answered = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: fixture.sessionID,
      question_id: fixture.questionID,
      answer: "It handles runtime commands, but I cannot trace the boundary or the downstream risk from the evidence yet.",
      answer_quality: "partial",
    },
  }));

  assertLearningGap(answered.data.learning_gap, {
    artifactSessionID: fixture.artifactSessionID,
    sessionID: fixture.sessionID,
    questionID: fixture.questionID,
    severity: "important",
    confidence: "medium",
  });

  const reloaded = expectSuccess<{ artifact_session: { learning_gaps: LearningGap[] } }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.learning_gaps.length, 1);
  assert.equal(reloaded.data.artifact_session.learning_gaps[0].id, answered.data.learning_gap.id);
});

test("answer_question emits a high-confidence misconception gap for wrong answers", () => {
  const fixture = prepareGapQuestion();
  const answered = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: fixture.sessionID,
      question_id: fixture.questionID,
      answer: "This is only display code and it has nothing to do with runtime state, persistence, or command boundaries.",
      answer_quality: "gap_confirmed",
    },
  }));

  assertLearningGap(answered.data.learning_gap, {
    artifactSessionID: fixture.artifactSessionID,
    sessionID: fixture.sessionID,
    questionID: fixture.questionID,
    severity: "critical",
    confidence: "high",
  });
  assert.match(answered.data.learning_gap.suspected_misconception, /wrong responsibility|artifact evidence/);
});

test("answer_question treats declared uncertainty as evidence for a repairable gap", () => {
  const fixture = prepareGapQuestion();
  const answered = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: fixture.sessionID,
      question_id: fixture.questionID,
      answer: "I don't know how to connect this evidence to the runtime boundary.",
    },
  }));

  assertLearningGap(answered.data.learning_gap, {
    artifactSessionID: fixture.artifactSessionID,
    sessionID: fixture.sessionID,
    questionID: fixture.questionID,
    severity: "important",
    confidence: "medium",
  });
  assert.match(answered.data.learning_gap.suspected_misconception, /declared uncertainty/i);
});

test("answer_question emits and persists confirmed concept state for verified answers", () => {
  const fixture = prepareGapQuestion();
  const answered = expectSuccess<{ confirmed_concept_state: ConceptUnderstandingState }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: fixture.sessionID,
      question_id: fixture.questionID,
      answer:
        "The runtime boundary owns command routing because handleRequest maps commands to stateful modules. The cited evidence matters because changing that flow could break persisted artifact sessions and question answers.",
      answer_quality: "verified",
    },
  }));

  assert.equal(answered.data.confirmed_concept_state.concept_id, "runtime-boundary");
  assert.equal(answered.data.confirmed_concept_state.status, "confirmed");
  assert.equal(answered.data.confirmed_concept_state.expected_layer, 4);
  assert.ok(answered.data.confirmed_concept_state.observed_layer >= 4);
  assert.equal(answered.data.confirmed_concept_state.confidence, "high");
  assert.ok(answered.data.confirmed_concept_state.evidence.length >= 1);
  assert.match(answered.data.confirmed_concept_state.repair_action, /spaced review|full readiness/);

  const reloaded = expectSuccess<{
    artifact_session: { concept_states: Record<string, ConceptUnderstandingState>; learning_gaps?: LearningGap[] };
  }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.concept_states["runtime-boundary"].status, "confirmed");
  assert.equal(reloaded.data.artifact_session.learning_gaps ?? undefined, undefined);
});
