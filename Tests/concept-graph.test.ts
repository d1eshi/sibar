import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../src/runtime.ts";
import type { ConceptGraph, EvidenceCitation } from "../src/runtime-support.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createConceptGraphFixture(): { root: string; src: string; tests: string; excluded: string } {
  const root = mkdtempSync(join(tmpdir(), "sibar-concept-graph-"));
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
    "import { handleRequest } from '../src/runtime.ts';",
    "test('runtime command boundary', () => {",
    "  assert.equal(handleRequest({ command: 'build_concept_graph', payload: {} }), undefined);",
    "});",
  ].join("\n"));
  writeFileSync(join(excluded, "Generated.ts"), [
    "export function generated() {",
    "  fail('outside_artifact', 'this excluded evidence must not appear');",
    "}",
  ].join("\n"));

  return { root, src, tests, excluded };
}

function citationIsInside(citation: EvidenceCitation, allowedRoots: string[], excludedRoot: string): boolean {
  return allowedRoots.some((allowedRoot) => citation.file_path.startsWith(`${allowedRoot}/`))
    && !citation.file_path.startsWith(`${excludedRoot}/`)
    && citation.start_line >= 1
    && citation.end_line >= citation.start_line
    && citation.excerpt.length > 0;
}

test("build_concept_graph creates an evidence-cited graph from an artifact session", () => {
  withTempHome();
  const fixture = createConceptGraphFixture();

  const created = expectSuccess<{
    artifact_session: { artifact_session_id: string };
  }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Concept graph fixture",
      root_path: fixture.root,
      source_type: "local_path",
      learning_goal: "Understand runtime command flow",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: ["src/generated"],
    },
  }));

  const built = expectSuccess<{
    concept_graph: ConceptGraph;
  }>(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: created.data.artifact_session.artifact_session_id },
  }));

  const graph = built.data.concept_graph;
  const allowedRoots = [realpathSync(fixture.src), realpathSync(fixture.tests)];
  const excludedRoot = realpathSync(fixture.excluded);
  assert.equal(graph.artifact_session_id, created.data.artifact_session.artifact_session_id);
  assert.ok(graph.nodes.length >= 5);
  assert.ok(graph.edges.some((edge) => edge.relation === "calls" && edge.from === "entry-point"));
  assert.ok(graph.nodes.every((node) => node.label.length > 0 && node.why_it_matters.length > 0));
  assert.ok(graph.nodes.every((node) => node.evidence.every((citation) => citationIsInside(citation, allowedRoots, excludedRoot))));
  assert.ok(graph.edges.every((edge) => edge.evidence.every((citation) => citationIsInside(citation, allowedRoots, excludedRoot))));

  const reloaded = expectSuccess<{
    artifact_session: { concept_graph?: ConceptGraph };
  }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: created.data.artifact_session.artifact_session_id },
  }));
  assert.deepEqual(reloaded.data.artifact_session.concept_graph, graph);
});
