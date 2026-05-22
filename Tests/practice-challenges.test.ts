import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../engine/runtime.ts";
import type { AutopsyStep, LearningGap, PracticeChallenge } from "../engine/runtime-support.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createPracticeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-practice-"));
  const src = join(root, "src");
  const tests = join(root, "Tests");
  mkdirSync(src, { recursive: true });
  mkdirSync(tests);

  writeFileSync(join(src, "runtime.ts"), [
    "import { readState, writeState } from './runtime-state.ts';",
    "export function handleRequest(request: { command: string }) {",
    "  if (request.command === 'answer_question') return writeState(readState());",
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
    "test('practice fixture', () => {});",
  ].join("\n"));

  return root;
}

function preparePracticeGap(answerQuality: "partial" | "gap_confirmed"): {
  artifactSessionID: string;
  gap: LearningGap;
} {
  withTempHome();
  const root = createPracticeFixture();
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Practice challenge fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Generate practice from detected gaps",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: [],
    },
  }));
  const artifactSessionID = created.data.artifact_session.artifact_session_id;

  expectSuccess(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: artifactSessionID },
  }));
  const prepared = expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: {
      artifact_session_id: artifactSessionID,
      concept_id: "runtime-boundary",
    },
  }));
  const answered = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: prepared.data.autopsy_step.session_id,
      question_id: prepared.data.autopsy_step.question_id,
      answer: answerQuality === "gap_confirmed"
        ? "This is display code and has no relationship to runtime state, persistence, or command boundaries."
        : "It handles commands, but I cannot trace the downstream boundary or explain the evidence yet.",
      answer_quality: answerQuality,
    },
  }));

  return {
    artifactSessionID,
    gap: answered.data.learning_gap,
  };
}

function assertPracticeChallenge(challenge: PracticeChallenge, gap: LearningGap): void {
  assert.equal(challenge.artifact_session_id, gap.artifact_session_id);
  assert.equal(challenge.session_id, gap.session_id);
  assert.equal(challenge.concept_id, gap.concept_id);
  assert.equal(challenge.gap_id, gap.id);
  assert.ok(challenge.id.includes(gap.id));
  assert.ok(challenge.prompt.includes(gap.concept_label));
  assert.ok(challenge.expected_evidence.some((entry) => entry === `gap_id=${gap.id}`));
  assert.ok(challenge.expected_evidence.some((entry) => entry === `concept_id=${gap.concept_id}`));
  assert.ok(challenge.expected_evidence.some((entry) => entry.startsWith("counts=must cite artifact evidence")));
  assert.ok(challenge.expected_evidence.some((entry) => entry.startsWith("artifact=")));
  assert.match(challenge.revisit_after, /\d{4}-\d{2}-\d{2}T/);
  assert.equal(challenge.completion_state, "pending");
}

test("generate_practice_challenges creates a persisted repair challenge for a detected gap", () => {
  const fixture = preparePracticeGap("partial");
  const generated = expectSuccess<{ practice_challenges: PracticeChallenge[] }>(handleRequest({
    command: "generate_practice_challenges",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));

  assert.equal(generated.data.practice_challenges.length, 1);
  const challenge = generated.data.practice_challenges[0];
  assertPracticeChallenge(challenge, fixture.gap);
  assert.equal(challenge.due_after, "24h");
  assert.equal(challenge.difficulty, "medium");

  const reloaded = expectSuccess<{ artifact_session: { practice_challenges: PracticeChallenge[] } }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.practice_challenges.length, 1);
  assert.deepEqual(reloaded.data.artifact_session.practice_challenges[0], challenge);
});

test("critical gaps get immediate active-production practice without duplicate persistence", () => {
  const fixture = preparePracticeGap("gap_confirmed");

  const first = expectSuccess<{ practice_challenges: PracticeChallenge[] }>(handleRequest({
    command: "generate_practice_challenges",
    payload: { artifact_session_id: fixture.artifactSessionID, gap_ids: [fixture.gap.id] },
  }));
  const second = expectSuccess<{ practice_challenges: PracticeChallenge[] }>(handleRequest({
    command: "generate_practice_challenges",
    payload: { artifact_session_id: fixture.artifactSessionID, gap_ids: [fixture.gap.id] },
  }));

  const challenge = first.data.practice_challenges[0];
  assertPracticeChallenge(challenge, fixture.gap);
  assert.equal(challenge.due_after, "now");
  assert.equal(challenge.difficulty, "hard");
  assert.match(challenge.prompt, /Trace|Predict|Write|Explain/);
  assert.deepEqual(second.data.practice_challenges, first.data.practice_challenges);

  const reloaded = expectSuccess<{ artifact_session: { practice_challenges: PracticeChallenge[] } }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.practice_challenges.length, 1);
});
