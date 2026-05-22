import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../engine/runtime.ts";
import type { PedagogyTrace } from "../engine/runtime-support.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
  delete process.env.SIBI_CODEX_COMMAND;
  delete process.env.SIBI_CODEX_MODEL;
  delete process.env.SIBI_CODEX_REASONING;
  delete process.env.SIBI_CODEX_TIMEOUT_MS;
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createAgentFixture(): { root: string; src: string; docs: string } {
  const root = mkdtempSync(join(tmpdir(), "sibar-agent-"));
  const src = join(root, "src");
  const docs = join(root, "docs");
  mkdirSync(src);
  mkdirSync(docs);
  writeFileSync(join(src, "runtime.ts"), [
    "export function handleRequest(request: { command: string }) {",
    "  if (request.command === 'run_project_learning_agent') return 'bounded trace';",
    "  return 'unknown';",
    "}",
  ].join("\n"));
  writeFileSync(join(src, "runtime-state.ts"), [
    "export function writeState(value: unknown) {",
    "  return JSON.stringify(value);",
    "}",
  ].join("\n"));
  writeFileSync(join(docs, "private-notes.md"), "Do not cite this excluded file.\n");
  return { root, src, docs };
}

function createArtifactSession(root: string): string {
  const created = expectSuccess<{
    artifact_session: { artifact_session_id: string };
  }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Agent fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Learn bounded agent traces",
      confidence: "medium",
      included_paths: ["src"],
      excluded_paths: ["docs"],
    },
  }));
  return created.data.artifact_session.artifact_session_id;
}

test("run_project_learning_agent records a fixture trace with accepted model candidate signals", () => {
  withTempHome();
  const fixture = createAgentFixture();
  const artifactSessionID = createArtifactSession(fixture.root);
  const result = expectSuccess<{
    status: "completed";
    trace: PedagogyTrace;
  }>(handleRequest({
    command: "run_project_learning_agent",
    payload: {
      artifact_session_id: artifactSessionID,
      model_name: "gpt-5.2",
      reasoning_effort: "medium",
      fixture_model_response: {
        model: "gpt-5.2",
        reasoning_effort: "medium",
        files_read: ["src/runtime.ts"],
        candidate_signals: [{
          signal_type: "concept",
          claim: "Runtime command routing is a central concept for this artifact.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-3" }],
          rationale: "The command branch controls how callers enter behavior.",
          proposed_layer: 3,
        }],
      },
    },
  }));

  assert.equal(result.data.status, "completed");
  assert.equal(result.data.trace.model_runner, "fixture");
  assert.equal(result.data.trace.model_name, "gpt-5.2");
  assert.equal(result.data.trace.reasoning_effort, "medium");
  assert.equal(result.data.trace.accepted_signals.length, 1);
  assert.equal(result.data.trace.rejected_signals.length, 0);
  assert.equal(result.data.trace.final_runtime_output.readiness_decided_by_model, false);

  const reloaded = expectSuccess<{
    artifact_session: { pedagogy_traces?: PedagogyTrace[] };
  }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.pedagogy_traces?.[0].trace_id, result.data.trace.trace_id);
});

test("run_project_learning_agent accepts bounded readiness concept mentions without model decisions", () => {
  withTempHome();
  const fixture = createAgentFixture();
  const artifactSessionID = createArtifactSession(fixture.root);
  const result = expectSuccess<{
    status: "completed";
    trace: PedagogyTrace;
  }>(handleRequest({
    command: "run_project_learning_agent",
    payload: {
      artifact_session_id: artifactSessionID,
      eval_case_id: "F09-READINESS-CONCEPT",
      fixture_model_response: {
        model: "fixture-model",
        reasoning_effort: "fixture",
        files_read: ["src/runtime.ts"],
        candidate_signals: [{
          signal_type: "concept",
          claim: "Readiness evidence collection is a concept bounded by runtime command routing.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-3" }],
          rationale: "The claim mentions readiness as the learning goal topic without deciding learner status.",
          proposed_layer: 3,
        }],
      },
    },
  }));

  assert.equal(result.data.trace.eval_case_id, "F09-READINESS-CONCEPT");
  assert.equal(result.data.trace.accepted_signals.length, 1);
  assert.equal(result.data.trace.rejected_signals.length, 0);
});

test("run_project_learning_agent rejects uncited and out-of-bound model candidate signals", () => {
  withTempHome();
  const fixture = createAgentFixture();
  const artifactSessionID = createArtifactSession(fixture.root);
  const result = expectSuccess<{
    status: "completed";
    trace: PedagogyTrace;
  }>(handleRequest({
    command: "run_project_learning_agent",
    payload: {
      artifact_session_id: artifactSessionID,
      fixture_model_response: {
        model: "fixture-model",
        reasoning_effort: "fixture",
        candidate_signals: [
          {
            signal_type: "concept",
            claim: "Uncited claim should not be accepted.",
            confidence: "high",
            citations: [],
          },
          {
            signal_type: "risk",
            claim: "Excluded notes contain the real risk.",
            confidence: "high",
            citations: [{ path: "docs/private-notes.md", range: "1" }],
          },
          {
            signal_type: "readiness_claim",
            claim: "The learner is ready to own this artifact end to end.",
            confidence: "high",
            citations: [{ path: "src/runtime-state.ts", range: "1-2" }],
          },
        ],
      },
    },
  }));

  const rejectedErrors = result.data.trace.rejected_signals.map((signal) => signal.validation_errors);
  assert.equal(result.data.trace.accepted_signals.length, 0);
  assert.equal(result.data.trace.rejected_signals.length, 3);
  assert.ok(rejectedErrors.some((errors) => errors.includes("missing_citation")));
  assert.ok(rejectedErrors.some((errors) => errors.includes("invalid_or_out_of_bound_citation")));
  assert.ok(rejectedErrors.some((errors) => errors.includes("unsupported_signal_type")));
  assert.ok(rejectedErrors.some((errors) => errors.includes("model_readiness_or_truth_decision")));
});

test("run_project_learning_agent rejects model output with out-of-bound files_read", () => {
  withTempHome();
  const fixture = createAgentFixture();
  const artifactSessionID = createArtifactSession(fixture.root);
  const result = expectSuccess<{
    status: "completed";
    trace: PedagogyTrace;
  }>(handleRequest({
    command: "run_project_learning_agent",
    payload: {
      artifact_session_id: artifactSessionID,
      fixture_model_response: {
        model: "fixture-model",
        reasoning_effort: "fixture",
        files_read: ["src/runtime.ts", "docs/private-notes.md"],
        candidate_signals: [{
          signal_type: "concept",
          claim: "Runtime command routing is a central concept for this artifact.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-3" }],
          rationale: "The command branch controls how callers enter behavior.",
          proposed_layer: 3,
        }],
      },
    },
  }));

  assert.deepEqual(result.data.trace.files_read, ["src/runtime.ts", "docs/private-notes.md"]);
  assert.equal(result.data.trace.accepted_signals.length, 0);
  assert.equal(result.data.trace.rejected_signals.length, 1);
  assert.ok(
    result.data.trace.deterministic_validation.some((validation) =>
      validation.candidate_id.includes("files_read:1:docs/private-notes.md")
      && validation.errors.includes("invalid_or_out_of_bound_file_read")
    ),
  );
  assert.ok(
    result.data.trace.rejected_signals[0].validation_errors.includes("model_files_read_boundary_violation"),
  );
});

test("run_project_learning_agent returns blocked when no fixture or Codex runner is configured", () => {
  withTempHome();
  const fixture = createAgentFixture();
  const artifactSessionID = createArtifactSession(fixture.root);
  const result = expectSuccess<{
    status: "blocked";
    blocked_reason: string;
  }>(handleRequest({
    command: "run_project_learning_agent",
    payload: { artifact_session_id: artifactSessionID },
  }));

  assert.equal(result.data.status, "blocked");
  assert.match(result.data.blocked_reason, /SIBI_CODEX_COMMAND/);
});

test("run_project_learning_agent loads fixture model response from path", () => {
  withTempHome();
  const fixture = createAgentFixture();
  const artifactSessionID = createArtifactSession(fixture.root);
  const fixturePath = join(fixture.root, "model-response.json");
  writeFileSync(fixturePath, JSON.stringify({
    model: "gpt-5.2",
    reasoning_effort: "medium",
    candidate_signals: [{
      signal_type: "flow",
      claim: "The request flow branches on command.",
      confidence: "medium",
      citations: [{ path: "src/runtime.ts", range: "1-2" }],
      rationale: "The command field controls runtime flow.",
    }],
  }));

  const result = expectSuccess<{
    status: "completed";
    trace: PedagogyTrace;
  }>(handleRequest({
    command: "run_project_learning_agent",
    payload: {
      artifact_session_id: artifactSessionID,
      fixture_model_response_path: fixturePath,
    },
  }));

  assert.equal(result.data.trace.accepted_signals[0].signal_type, "flow");
  assert.equal(JSON.parse(readFileSync(fixturePath, "utf8")).model, "gpt-5.2");
});
