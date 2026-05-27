import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../engine/runtime.ts";
import type { RuntimeCodeSelection } from "../engine/code-selection.ts";
import { readState, writeState } from "../engine/persistence/state.ts";
import type {
  AutopsyStep,
  ConceptGraph,
  LearningGap,
  PracticeChallenge,
} from "../engine/runtime/contracts.ts";
import type { StudyPanelSnapshot } from "../engine/study/panel.ts";

type Success<T> = { ok: true; data: T };

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-study-panel-"));
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
    "test('study panel fixture', () => {});",
  ].join("\n"));

  return root;
}

function prepareFixtureSession(): {
  artifactSessionID: string;
  graph: ConceptGraph;
  autopsyStep: AutopsyStep;
  gap: LearningGap;
  challenge: PracticeChallenge;
} {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
  const root = createFixtureRoot();
  const artifactSessionID = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Study panel fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Render a full Build-to-Learn session",
      confidence: "high",
      included_paths: ["src", "Tests"],
      excluded_paths: [],
    },
  })).data.artifact_session.artifact_session_id;
  const graph = expectSuccess<{ concept_graph: ConceptGraph }>(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: artifactSessionID },
  })).data.concept_graph;
  const autopsyStep = expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: { artifact_session_id: artifactSessionID, concept_id: graph.nodes[0].id },
  })).data.autopsy_step;
  const gap = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: autopsyStep.session_id,
      question_id: autopsyStep.question_id,
      answer: "I can name the command boundary, but I cannot yet cite how persisted memory flows into readiness.",
      answer_quality: "partial",
    },
  })).data.learning_gap;
  const challenge = expectSuccess<{ practice_challenges: PracticeChallenge[] }>(handleRequest({
    command: "generate_practice_challenges",
    payload: { artifact_session_id: artifactSessionID, gap_ids: [gap.id] },
  })).data.practice_challenges[0];
  expectSuccess(handleRequest({
    command: "readiness_report",
    payload: { artifact_session_id: artifactSessionID, format: "json" },
  }));

  return { artifactSessionID, graph, autopsyStep, gap, challenge };
}

test("get_study_panel_state returns a complete runtime-owned Build-to-Learn snapshot", () => {
  const fixture = prepareFixtureSession();
  const codeSelection: RuntimeCodeSelection = {
    file_path: fixture.graph.nodes[0].evidence[0].file_path,
    project_path: null,
    language: "typescript",
    start_line: 1,
    end_line: 3,
    selected_text: "export function handleRequest(request: { command: string }) {",
    surrounding_text: "export function handleRequest(request: { command: string }) {\n  if (request.command === 'answer_question') return writeState(readState());\n}",
  };
  const state = readState();
  state.sessions[fixture.autopsyStep.session_id].code_selection = codeSelection;
  writeState(state);

  const snapshot = expectSuccess<StudyPanelSnapshot>(handleRequest({
    command: "get_study_panel_state",
    payload: { artifact_session_id: fixture.artifactSessionID },
  })).data;

  assert.equal(snapshot.artifact_session.artifact_session_id, fixture.artifactSessionID);
  assert.equal(snapshot.concept_graph?.artifact_session_id, fixture.artifactSessionID);
  assert.equal(snapshot.active_autopsy_step?.autopsy_step_id, fixture.autopsyStep.autopsy_step_id);
  assert.equal(snapshot.active_code_selection?.file_path, codeSelection.file_path);
  assert.equal(snapshot.active_code_selection?.selected_text, codeSelection.selected_text);
  assert.equal(snapshot.current_questions[0]?.question_id, fixture.autopsyStep.question_id);
  assert.ok(snapshot.current_questions[0]?.prompt.includes("Before any explanation"));
  assert.ok(snapshot.learning_gaps.some((gap) => gap.id === fixture.gap.id));
  assert.ok(snapshot.practice_challenges.some((challenge) => challenge.id === fixture.challenge.id));
  assert.ok(snapshot.memory_summary.concept_states.length >= fixture.graph.nodes.length);
  assert.ok(snapshot.readiness_report.open_gaps.some((gap) => gap.gap_id === fixture.gap.id));
  assert.ok(snapshot.evidence_index.length > 0);
  assert.match(snapshot.operation_state.message, /runtime-owned state/);
});

test("get_study_panel_state renders explicit empty panel regions before learning steps exist", () => {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-empty-"));
  const root = createFixtureRoot();
  const artifactSessionID = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Empty study panel fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Show empty panel state",
      confidence: "medium",
      included_paths: ["src"],
      excluded_paths: [],
    },
  })).data.artifact_session.artifact_session_id;

  const snapshot = expectSuccess<StudyPanelSnapshot>(handleRequest({
    command: "get_study_panel_state",
    payload: { artifact_session_id: artifactSessionID },
  })).data;

  assert.equal(snapshot.concept_graph, null);
  assert.equal(snapshot.active_autopsy_step, null);
  assert.equal(snapshot.active_code_selection, null);
  assert.deepEqual(snapshot.current_questions, []);
  assert.deepEqual(snapshot.learning_gaps, []);
  assert.deepEqual(snapshot.practice_challenges, []);
  assert.deepEqual(snapshot.memory_summary.concept_states, []);
  assert.equal(snapshot.readiness_report.summary.unsupported, true);
});
