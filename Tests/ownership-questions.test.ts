import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../engine/runtime.ts";
import type { AutopsyStep, RuntimeQuestion } from "../engine/runtime/contracts.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function assertQuestionPolicy(questions: RuntimeQuestion[]): void {
  assert.ok(questions.length >= 1);
  assert.ok(questions.length <= 3);

  for (const question of questions) {
    assert.ok(question.target_area.trim().length > 0);
    assert.ok(question.why_it_matters.trim().length > 0);
    assert.ok(question.answer_style.trim().length > 0);
    assert.ok(question.evidence_basis.length >= 1);
    assert.ok(question.evidence_basis.length <= 3);
    assert.ok(question.evidence_basis.every((entry) => entry.trim().length > 0));
    assert.ok(question.max_followups >= 0);
    assert.ok(question.max_followups <= 2);
  }
}

function createQuestionFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-question-policy-"));
  const src = join(root, "src");
  const pedagogy = join(src, "pedagogy");
  const tests = join(root, "Tests");
  mkdirSync(pedagogy, { recursive: true });
  mkdirSync(tests);

  writeFileSync(join(src, "runtime.ts"), [
    "import { readState, writeState } from './runtime-state.ts';",
    "export function handleRequest(request: { command: string }) {",
    "  if (request.command === 'generate_questions') return writeState(readState());",
    "  return null;",
    "}",
  ].join("\n"));
  writeFileSync(join(src, "runtime-state.ts"), [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "export function readState() { return JSON.parse(readFileSync('state.json', 'utf8')); }",
    "export function writeState(value: unknown) { return writeFileSync('state.json', JSON.stringify(value)); }",
  ].join("\n"));
  writeFileSync(join(pedagogy, "questions.ts"), [
    "export function generateQuestions(gap: unknown) {",
    "  return [{ question: 'walk through evidence', gap }];",
    "}",
  ].join("\n"));
  writeFileSync(join(tests, "runtime.test.ts"), [
    "import test from 'node:test';",
    "test('runtime policy fixture', () => {});",
  ].join("\n"));

  return root;
}

test("generate_questions keeps legacy declared-intent questions bounded and evidence-backed", () => {
  withTempHome();
  const declared = expectSuccess<{ session_id: string }>(handleRequest({
    command: "declare_intent",
    payload: {
      project_label: "demo",
      statement: "I am changing the runtime question policy.",
      uncertainty: "I need evidence-backed questions, not generic quizzes.",
      expected_work_area: "ownership question policy",
      desired_help: "generate_questions",
    },
  }));

  const generated = expectSuccess<{ questions: RuntimeQuestion[] }>(handleRequest({
    command: "generate_questions",
    payload: { session_id: declared.data.session_id },
  }));

  assertQuestionPolicy(generated.data.questions);
});

test("generate_questions uses persisted autopsy evidence when artifact context is supplied", () => {
  withTempHome();
  const root = createQuestionFixture();
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Question policy fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Ask bounded ownership questions",
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

  const generated = expectSuccess<{ questions: RuntimeQuestion[] }>(handleRequest({
    command: "generate_questions",
    payload: {
      artifact_session_id: created.data.artifact_session.artifact_session_id,
      unbounded_text: "THIS SHOULD NOT BECOME QUESTION EVIDENCE",
    },
  }));

  assertQuestionPolicy(generated.data.questions);
  assert.deepEqual(generated.data.questions[0].evidence_basis, prepared.data.autopsy_step.evidence_basis);
  assert.ok(generated.data.questions[0].evidence_basis.every((entry) => !entry.includes("THIS SHOULD NOT")));
});

test("generate_questions can create a concept-graph question without active autopsy context", () => {
  withTempHome();
  const root = createQuestionFixture();
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Concept graph fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Generate from persisted graph",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: [],
    },
  }));

  expectSuccess(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: created.data.artifact_session.artifact_session_id },
  }));
  const generated = expectSuccess<{ questions: RuntimeQuestion[] }>(handleRequest({
    command: "generate_questions",
    payload: {
      artifact_session_id: created.data.artifact_session.artifact_session_id,
      concept_id: "runtime-boundary",
    },
  }));

  assertQuestionPolicy(generated.data.questions);
  assert.match(generated.data.questions[0].prompt, /Before any explanation/);
});
