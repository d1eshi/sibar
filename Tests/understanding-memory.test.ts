import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../engine/runtime.ts";
import type {
  AutopsyStep,
  ConceptGraph,
  LearningGap,
  PracticeChallenge,
  UnderstandingMemory,
} from "../engine/runtime-support.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): string {
  const runtimeHome = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
  process.env.SIBI_RUNTIME_HOME = runtimeHome;
  return runtimeHome;
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createMemoryFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-memory-"));
  const src = join(root, "src");
  const tests = join(root, "Tests");
  mkdirSync(src, { recursive: true });
  mkdirSync(tests);

  writeFileSync(join(src, "runtime.ts"), [
    "import { readState, writeState } from './runtime-state.ts';",
    "import { generatePractice } from './runtime-practice.ts';",
    "export function handleRequest(request: { command: string }) {",
    "  if (request.command === 'answer_question') return writeState(readState());",
    "  if (request.command === 'generate_practice_challenges') return generatePractice();",
    "  return null;",
    "}",
  ].join("\n"));
  writeFileSync(join(src, "runtime-state.ts"), [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "export function readState() { return JSON.parse(readFileSync('state.json', 'utf8')); }",
    "export function writeState(value: unknown) { return writeFileSync('state.json', JSON.stringify(value)); }",
  ].join("\n"));
  writeFileSync(join(src, "runtime-practice.ts"), [
    "export function generatePractice() { return { due_after: '24h' }; }",
  ].join("\n"));
  writeFileSync(join(tests, "runtime.test.ts"), [
    "import test from 'node:test';",
    "test('memory fixture', () => {});",
  ].join("\n"));

  return root;
}

function prepareAutopsy(artifactSessionID: string, conceptID: string): AutopsyStep {
  const prepared = expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: {
      artifact_session_id: artifactSessionID,
      concept_id: conceptID,
    },
  }));
  return prepared.data.autopsy_step;
}

test("get_understanding_memory reloads artifact-scoped answers, gaps, challenges, and reviews", () => {
  const runtimeHome = withTempHome();
  const root = createMemoryFixture();
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Understanding memory fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Persist inspectable understanding memory",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: [],
    },
  }));
  const artifactSessionID = created.data.artifact_session.artifact_session_id;

  const graphResult = expectSuccess<{ concept_graph: ConceptGraph }>(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: artifactSessionID },
  }));
  const gapConceptID = graphResult.data.concept_graph.nodes[0].id;
  const confirmedConceptID = graphResult.data.concept_graph.nodes.find((node) => node.id !== gapConceptID)?.id;
  assert.ok(confirmedConceptID);

  const gapStep = prepareAutopsy(artifactSessionID, gapConceptID);
  const answeredGap = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: gapStep.session_id,
      question_id: gapStep.question_id,
      answer: "I can name the boundary, but I cannot trace the persisted state or downstream risk from the evidence yet.",
      answer_quality: "partial",
    },
  }));

  const generated = expectSuccess<{ practice_challenges: PracticeChallenge[] }>(handleRequest({
    command: "generate_practice_challenges",
    payload: {
      artifact_session_id: artifactSessionID,
      gap_ids: [answeredGap.data.learning_gap.id],
    },
  }));

  const confirmedStep = prepareAutopsy(artifactSessionID, confirmedConceptID);
  expectSuccess(handleRequest({
    command: "answer_question",
    payload: {
      session_id: confirmedStep.session_id,
      question_id: confirmedStep.question_id,
      answer:
        "This concept owns the runtime state flow because the cited files read, write, and route durable artifact session data. Changing it can break resumed sessions and memory projections.",
      answer_quality: "verified",
    },
  }));

  const memoryResult = expectSuccess<{ understanding_memory: UnderstandingMemory }>(handleRequest({
    command: "get_understanding_memory",
    payload: {
      artifact_session_id: artifactSessionID,
      reference_time: "2999-01-01T00:00:00.000Z",
    },
  }));
  const memory = memoryResult.data.understanding_memory;

  assert.equal(process.env.SIBI_RUNTIME_HOME, runtimeHome);
  assert.equal(memory.artifact_session_id, artifactSessionID);
  assert.equal(memory.gaps.length, 1);
  assert.equal(memory.gaps[0].id, answeredGap.data.learning_gap.id);
  assert.equal(memory.challenges.length, 1);
  assert.equal(memory.challenges[0].id, generated.data.practice_challenges[0].id);
  assert.equal(memory.answer_history.length, 2);
  assert.ok(memory.answer_history.some((answer) => answer.outcome === "gap" && answer.answer.includes("cannot trace")));
  assert.ok(memory.answer_history.some((answer) => answer.outcome === "confirmed" && answer.answer.includes("runtime state flow")));

  const gapConcept = memory.concept_states.find((concept) => concept.concept_id === gapConceptID);
  assert.equal(gapConcept?.status, "gap_open");
  assert.deepEqual(gapConcept?.open_gap_ids, [answeredGap.data.learning_gap.id]);
  assert.deepEqual(gapConcept?.challenge_ids, [generated.data.practice_challenges[0].id]);

  const confirmedConcept = memory.concept_states.find((concept) => concept.concept_id === confirmedConceptID);
  assert.equal(confirmedConcept?.status, "needs_review");
  assert.ok(confirmedConcept?.next_review_at);
  assert.ok(confirmedConcept.evidence.length > 0);

  assert.ok(memory.next_reviews.some((review) =>
    review.reason === "pending_challenge"
      && review.challenge_id === generated.data.practice_challenges[0].id
      && review.gap_id === answeredGap.data.learning_gap.id,
  ));
  assert.ok(memory.next_reviews.some((review) =>
    review.reason === "confirmed_review" && review.concept_id === confirmedConceptID,
  ));
});
