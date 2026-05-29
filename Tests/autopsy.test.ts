import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../engine/runtime.ts";
import type { AutopsyStep, ConceptGraph, EvidenceCitation } from "../engine/runtime/contracts.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createAutopsyFixture(): { root: string; src: string; tests: string; excluded: string } {
  const root = mkdtempSync(join(tmpdir(), "sibar-autopsy-"));
  const src = join(root, "src");
  const pedagogy = join(src, "pedagogy");
  const tests = join(root, "Tests");
  const excluded = join(src, "generated");
  mkdirSync(pedagogy, { recursive: true });
  mkdirSync(tests);
  mkdirSync(excluded);

  writeFileSync(join(src, "runtime.ts"), [
    "import { readState, writeState } from './runtime-state.ts';",
    "export type RuntimeRequest = { command: string; payload: Record<string, unknown> };",
    "export function handleRequest(request: RuntimeRequest) {",
    "  switch (request.command) {",
    "    case 'build_concept_graph': return writeState(readState());",
    "    default: throw new Error('missing command');",
    "  }",
    "}",
    "export async function runFromSTDIO() { return handleRequest(JSON.parse('{}')); }",
  ].join("\n"));
  writeFileSync(join(src, "runtime-state.ts"), [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "export function readState() { return JSON.parse(readFileSync('state.json', 'utf8')); }",
    "export function writeState(value: unknown) { return writeFileSync('state.json', JSON.stringify(value)); }",
  ].join("\n"));
  writeFileSync(join(src, "runtime-artifact-session.ts"), [
    "export type ArtifactSession = { artifact_session_id: string; included_paths: string[]; excluded_paths: string[] };",
    "export function assertBoundary(path: string) {",
    "  if (path.includes('outside')) fail('outside_artifact', 'outside path');",
    "  return path;",
    "}",
  ].join("\n"));
  writeFileSync(join(pedagogy, "questions.ts"), [
    "export function generateQuestions(gap: unknown) {",
    "  const confidence = 'high';",
    "  return [{ question: 'explain the evidence', confidence, gap }];",
    "}",
  ].join("\n"));
  writeFileSync(join(tests, "runtime.test.ts"), [
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { handleRequest } from '../engine/runtime.ts';",
    "test('runtime command boundary', () => {",
    "  assert.equal(handleRequest({ command: 'build_concept_graph', payload: {} }), undefined);",
    "});",
  ].join("\n"));
  writeFileSync(join(excluded, "Generated.ts"), "fail('outside_artifact', 'excluded evidence');\n");

  return { root, src, tests, excluded };
}

function createGraph(): { artifactSessionID: string; graph: ConceptGraph; allowedRoots: string[]; excludedRoot: string } {
  withTempHome();
  const fixture = createAutopsyFixture();
  const created = expectSuccess<{
    artifact_session: { artifact_session_id: string };
  }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Autopsy fixture",
      root_path: fixture.root,
      source_type: "local_path",
      learning_goal: "Practice attempt-first code autopsy",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: ["src/generated"],
    },
  }));

  const built = expectSuccess<{ concept_graph: ConceptGraph }>(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: created.data.artifact_session.artifact_session_id },
  }));

  return {
    artifactSessionID: created.data.artifact_session.artifact_session_id,
    graph: built.data.concept_graph,
    allowedRoots: [realpathSync(fixture.src), realpathSync(fixture.tests)],
    excludedRoot: realpathSync(fixture.excluded),
  };
}

function citationIsBounded(citation: EvidenceCitation, allowedRoots: string[], excludedRoot: string): boolean {
  return allowedRoots.some((allowedRoot) => citation.file_path.startsWith(`${allowedRoot}/`))
    && !citation.file_path.startsWith(`${excludedRoot}/`)
    && citation.start_line >= 1
    && citation.end_line >= citation.start_line
    && citation.excerpt.length > 0;
}

function assertAttemptFirstStep(step: AutopsyStep, artifactSessionID: string, selectedID: string): void {
  assert.equal(step.artifact_session_id, artifactSessionID);
  assert.equal(step.selected_id, selectedID);
  assert.equal(step.next_action, "collect_user_attempt");
  assert.match(step.prompt, /Before any explanation/);
  assert.match(step.prompt, /\b(predict|explain|trace)\b/i);
  assert.doesNotMatch(step.prompt, /the answer is|here is why|here's why|full explanation|what happens is/i);
  assert.ok(step.session_id.length > 0);
  assert.ok(step.question_id.length > 0);
  assert.ok(step.bounded_evidence.length >= 1);
  assert.ok(step.bounded_evidence.length <= 3);
  assert.equal(step.evidence_basis.length, step.bounded_evidence.length);
}

test("prepare_autopsy_step asks for a concept attempt before explanation and persists it", () => {
  const { artifactSessionID, allowedRoots, excludedRoot } = createGraph();

  const prepared = expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: { artifact_session_id: artifactSessionID, concept_id: "runtime-boundary" },
  }));

  const step = prepared.data.autopsy_step;
  assert.equal(step.target_type, "concept");
  assert.equal(step.concept_id, "runtime-boundary");
  assert.equal(step.edge_id, undefined);
  assertAttemptFirstStep(step, artifactSessionID, "runtime-boundary");
  assert.ok(step.bounded_evidence.every((citation) => citationIsBounded(citation, allowedRoots, excludedRoot)));

  const reloaded = expectSuccess<{
    artifact_session: { active_autopsy_step?: AutopsyStep };
  }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.active_autopsy_step?.autopsy_step_id, step.autopsy_step_id);
  assert.equal(reloaded.data.artifact_session.active_autopsy_step?.concept_id, step.concept_id);
  assert.deepEqual(reloaded.data.artifact_session.active_autopsy_step?.bounded_evidence, step.bounded_evidence);
});

test("prepare_autopsy_step can target a persisted flow edge", () => {
  const { artifactSessionID, graph, allowedRoots, excludedRoot } = createGraph();
  const edgeID = graph.edges.find((edge) => edge.id === "entry-routes-command-boundary")?.id;
  assert.equal(edgeID, "entry-routes-command-boundary");

  const prepared = expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: { artifact_session_id: artifactSessionID, edge_id: edgeID },
  }));

  const step = prepared.data.autopsy_step;
  assert.equal(step.target_type, "edge");
  assert.equal(step.edge_id, edgeID);
  assert.equal(step.concept_id, undefined);
  assertAttemptFirstStep(step, artifactSessionID, edgeID);
  assert.match(step.prompt, /Flow:/);
  assert.ok(step.bounded_evidence.every((citation) => citationIsBounded(citation, allowedRoots, excludedRoot)));
});
