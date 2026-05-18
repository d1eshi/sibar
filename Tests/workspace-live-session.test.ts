import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

import { handleRequest } from "../src/runtime.ts";
import { resolveModelRunnerConfig } from "../src/runtime-agent-runner.ts";
import type { RuntimeWorkspaceSession } from "../src/runtime-support.ts";
import type {
  AttemptEvaluationContract,
  WorkspaceSessionContract,
} from "../src/runtime-workspace-session-contracts.ts";

type Success<T> = { ok: true; data: T };

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
  delete process.env.SIBI_CODEX_COMMAND;
}

function createRepoFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-live-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "runtime.ts"), [
    "export function handleRequest(request: { command: string }) {",
    "  return request.command;",
    "}",
  ].join("\n"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture" }));
  spawnSync("git", ["init"], { cwd: root, stdio: "ignore" });
  return root;
}

test("start_workspace_session inventories repo evidence but does not invent a slice when runner is blocked", () => {
  withTempHome();
  const root = createRepoFixture();
  const result = expectSuccess<{
    workspace_session: RuntimeWorkspaceSession;
    snapshot: { concept_slice: unknown; active_operation: unknown; loop_state: string };
  }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
    },
  }));

  assert.equal(result.data.workspace_session.runner.status, "blocked");
  assert.match(result.data.workspace_session.runner.blocked_reason ?? "", /SIBI_CODEX_COMMAND/);
  assert.equal(result.data.workspace_session.loop.concept_slice, null);
  assert.equal(result.data.workspace_session.loop.active_operation, null);
  assert.equal(result.data.snapshot.loop_state, "EvidenceInventoried");
  assert.ok(result.data.workspace_session.loop.evidence_inventory.some((entry) => entry.path === "src/runtime.ts"));
  assert.equal(result.data.workspace_session.source_control.available, true);
});

test("start_workspace_session turns accepted cited LLM signals into an attemptable workspace operation", () => {
  withTempHome();
  const root = createRepoFixture();
  const started = expectSuccess<{
    workspace_session: RuntimeWorkspaceSession;
    snapshot: { loop_state: string; hidden_solution_gated: boolean };
  }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      fixture_model_response: {
        model: "fixture-model",
        reasoning_effort: "fixture",
        files_read: ["src/runtime.ts"],
        candidate_signals: [{
          signal_type: "flow",
          claim: "The runtime entrypoint returns the requested command value.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-2" }],
          rationale: "The cited function exposes the command-return behavior.",
          proposed_layer: 3,
        }],
      },
    },
  }));

  const live = started.data.workspace_session;
  assert.equal(live.runner.status, "completed");
  assert.equal(live.runner.accepted_signal_count, 1);
  assert.equal(live.loop.concept_slice?.label, "The runtime entrypoint returns the requested command value.");
  assert.equal(live.loop.thinking_artifacts.length, 1);
  assert.equal(started.data.snapshot.loop_state, "AwaitingAttempt");
  assert.equal(started.data.snapshot.hidden_solution_gated, true);
  assert.ok(live.loop.thinking_artifacts[0].payload.lines);
});

test("start_workspace_session can use an external command runner contract", () => {
  withTempHome();
  const root = createRepoFixture();
  const runnerPath = join(root, "runner.mjs");
  writeFileSync(runnerPath, [
    "process.stdin.resume();",
    "process.stdin.on('end', () => {",
    "  console.log(JSON.stringify({",
    "    files_read: ['src/runtime.ts'],",
    "    candidate_signals: [{",
    "      signal_type: 'concept',",
    "      claim: 'The runtime command value is returned by handleRequest.',",
    "      confidence: 'medium',",
    "      citations: [{ path: 'src/runtime.ts', range: '1-2' }],",
    "      rationale: 'The cited function uses request.command as its return value.'",
    "    }]",
    "  }));",
    "});",
  ].join("\n"));

  const started = expectSuccess<{ workspace_session: RuntimeWorkspaceSession }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      codex_command: `${process.execPath} ${runnerPath}`,
    },
  }));

  assert.equal(started.data.workspace_session.runner.status, "completed");
  assert.equal(started.data.workspace_session.runner.accepted_signal_count, 1);
  assert.match(started.data.workspace_session.runner.model_runner ?? "", /runner\.mjs/);
});

test("submit_workspace_attempt evaluates attempts against runtime evidence", () => {
  withTempHome();
  const root = createRepoFixture();
  const started = expectSuccess<{ workspace_session: RuntimeWorkspaceSession }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      fixture_model_response: {
        candidate_signals: [{
          signal_type: "concept",
          claim: "The runtime command is read from the request object.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-2" }],
          rationale: "The function accesses request.command.",
        }],
      },
    },
  }));
  const requiredEvidence = started.data.workspace_session.loop.active_operation?.required_evidence ?? [];
  const submitted = expectSuccess<{
    workspace_session: RuntimeWorkspaceSession;
    snapshot: { attempt_stored: boolean; evidence_check_result: { result: string } | null };
  }>(handleRequest({
    command: "submit_workspace_attempt",
    payload: {
      workspace_session_id: started.data.workspace_session.workspace_session_id,
      answer_text: "The runtime command is read from the request object and returned by handleRequest.",
      selected_evidence: requiredEvidence,
      declared_confidence: "medium",
      declared_unknowns: [],
    },
  }));

  assert.equal(submitted.data.snapshot.attempt_stored, true);
  assert.ok(submitted.data.snapshot.evidence_check_result);
  assert.equal(submitted.data.workspace_session.loop.loop_entry.current_state, "GapOrReady");
});

test("submit_workspace_attempt default action is submit even with declared_unknowns", () => {
  withTempHome();
  const root = createRepoFixture();
  const started = expectSuccess<{ workspace_session: RuntimeWorkspaceSession }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      fixture_model_response: {
        candidate_signals: [{
          signal_type: "concept",
          claim: "The runtime command is read from the request object.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-2" }],
          rationale: "The function accesses request.command.",
        }],
      },
    },
  }));
  const requiredEvidence = started.data.workspace_session.loop.active_operation?.required_evidence ?? [];
  const submitted = expectSuccess<{
    workspace_session: {
      live_workspace?: WorkspaceSessionContract;
    };
  }>(handleRequest({
    command: "submit_workspace_attempt",
    payload: {
      workspace_session_id: started.data.workspace_session.workspace_session_id,
      answer_text: "The runtime command is read from the request object and returned by handleRequest.",
      selected_evidence: requiredEvidence,
      declared_confidence: "medium",
      declared_unknowns: ["I am not sure."],
    },
  }));

  const liveAttempt = submitted.data.workspace_session.live_workspace?.submitted_attempt;
  assert.equal(liveAttempt?.action, "submit");
});

test("submit_workspace_attempt accepts explicit i_do_not_know action", () => {
  withTempHome();
  const root = createRepoFixture();
  const started = expectSuccess<{ workspace_session: RuntimeWorkspaceSession }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      fixture_model_response: {
        candidate_signals: [{
          signal_type: "concept",
          claim: "The runtime command is read from the request object.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-2" }],
          rationale: "The function accesses request.command.",
        }],
      },
    },
  }));
  const requiredEvidence = started.data.workspace_session.loop.active_operation?.required_evidence ?? [];
  const submitted = expectSuccess<{
    workspace_session: {
      live_workspace?: WorkspaceSessionContract;
    };
  }>(handleRequest({
    command: "submit_workspace_attempt",
    payload: {
      workspace_session_id: started.data.workspace_session.workspace_session_id,
      answer_text: "I intentionally do not know this.",
      selected_evidence: requiredEvidence,
      declared_confidence: "medium",
      declared_unknowns: [],
      action: "i_do_not_know",
    },
  }));

  const liveAttempt = submitted.data.workspace_session.live_workspace?.submitted_attempt;
  assert.equal(liveAttempt?.action, "i_do_not_know");
});

test("start_workspace_session returns live workspace render contract fields", () => {
  withTempHome();
  const root = createRepoFixture();
  const started = expectSuccess<{
    workspace_session: {
      workspace_session_id: string;
      live_workspace?: WorkspaceSessionContract;
    };
  }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      fixture_model_response: {
        model: "fixture-model",
        reasoning_effort: "fixture",
        files_read: ["src/runtime.ts"],
        candidate_signals: [{
          signal_type: "flow",
          claim: "The runtime entrypoint returns command.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-2" }],
          rationale: "The cited function routes command.",
          proposed_layer: 3,
        }],
      },
    },
  }));

  const live = started.data.workspace_session.live_workspace;
  assert.equal(live?.session_id, started.data.workspace_session.workspace_session_id);
  assert.equal(live?.phase, "AwaitingAttempt");
  assert.equal(live?.project_label, "Workspace: Explain this project A-Z");
  assert.equal(live?.artifact_previews.length > 0, true);
  assert.equal(live?.submitted_attempt, undefined);
  assert.equal(live?.artifact_tree.paths.every((path) => !path.includes("Evidence slice")), true);
  assert.equal(live?.worktree.paths.includes("src/runtime.ts"), true);
  assert.equal(live?.ui_reproduction?.test_path, "Tests/workspace-live-session.test.ts");
  assert.equal(live?.ui_reproduction?.fixture_path, null);
});

test("submit_workspace_attempt returns attempt evaluation contract and can be serialized", () => {
  withTempHome();
  const root = createRepoFixture();
  const started = expectSuccess<{
    workspace_session: {
      workspace_session_id: string;
      loop?: { active_operation?: { required_evidence: string[] } };
      live_workspace?: WorkspaceSessionContract;
    };
  }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
      fixture_model_response: {
        candidate_signals: [{
          signal_type: "concept",
          claim: "The runtime routes command names through request.command.",
          confidence: "medium",
          citations: [{ path: "src/runtime.ts", range: "1-2" }],
          rationale: "The cited function dispatches by command.",
        }],
      },
    },
  }));
  const requiredEvidence = started.data.workspace_session.loop?.active_operation?.required_evidence ?? [];
  const submitted = expectSuccess<{
    workspace_session: {
      live_workspace?: WorkspaceSessionContract;
      loop?: { sample_attempt?: { id: string } };
    };
    snapshot: { attempt_stored: boolean; evidence_check_result: { result: string } | null };
  }>(handleRequest({
    command: "submit_workspace_attempt",
    payload: {
      workspace_session_id: started.data.workspace_session.workspace_session_id,
      answer_text: "The runtime returns command from request.",
      selected_evidence: requiredEvidence,
      declared_confidence: "medium",
      declared_unknowns: [],
    },
  }));

  const live = started.data.workspace_session.live_workspace;
  assert.equal(live?.last_attempt_evaluation === undefined, true, "start response should not include last attempt evaluation");
  assert.equal(live?.submitted_attempt === undefined, true);
  assert.equal(live?.project_label, submitted.data.workspace_session.live_workspace?.project_label);

  const submittedEval = submitted.data.workspace_session.live_workspace?.last_attempt_evaluation;
  assert.ok(submittedEval);
  const serialized = JSON.stringify(submittedEval);
  const parsed = JSON.parse(serialized) as AttemptEvaluationContract;
  const submittedLive = submitted.data.workspace_session.live_workspace;
  const submittedAttempt = submittedLive?.submitted_attempt;
  assert.ok(submittedAttempt);

  assert.equal(parsed.attempt_id, submitted.data.workspace_session.loop?.sample_attempt?.id);
  assert.equal(parsed.evidence_check.result, "confirmed");
  assert.equal(parsed.missing_evidence.length <= requiredEvidence.length, true);
  assert.ok(parsed.scoped_readiness.status === "blocked" || parsed.scoped_readiness.status === "ready");
  assert.equal(submittedAttempt?.operation_id, submittedLive?.active_operation?.operation_id);
  assert.equal(submittedAttempt?.action, "submit");
  assert.deepEqual(submittedAttempt?.selected_evidence_ids, requiredEvidence);
});

test("codex auto runner is selectable without making blocked sessions invent project facts", () => {
  withTempHome();
  const config = resolveModelRunnerConfig({
    codex_command: "auto",
    model_name: "gpt-5.2",
    reasoning_effort: "high",
  });

  assert.equal(config.command, "__sibi_codex_cli_auto__");
  assert.equal(config.modelName, "gpt-5.2");
  assert.equal(config.reasoningEffort, "high");
});

test("workspace evidence inventory is deterministic across identical runs", () => {
  withTempHome();
  const root = createRepoFixture();
  writeFileSync(join(root, "src", "alpha.ts"), "export const alpha = true;\n");
  writeFileSync(join(root, "src", "beta.ts"), "export const beta = true;\n");

  const first = expectSuccess<{ workspace_session: RuntimeWorkspaceSession }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
    },
  }));
  const second = expectSuccess<{ workspace_session: RuntimeWorkspaceSession }>(handleRequest({
    command: "start_workspace_session",
    payload: {
      root_path: root,
      goal: "Explain this project A-Z",
    },
  }));

  assert.deepEqual(
    first.data.workspace_session.loop.evidence_inventory.map((entry) => [entry.id, entry.path]),
    second.data.workspace_session.loop.evidence_inventory.map((entry) => [entry.id, entry.path]),
  );
});

function writeFakeCodexCommand(binDir: string, filesRead: string[]): string {
  const codexPath = join(binDir, "codex");
  const fakeResponse = JSON.stringify({
    files_read: filesRead,
    candidate_signals: [{
      signal_type: "flow",
      claim: "This repository has a TypeScript runtime boundary command dispatcher.",
      confidence: "medium",
      citations: [{
        path: "src/runtime.ts",
        range: "1-1",
      }],
      rationale: "The cited code routes commands into the TypeScript runtime.",
    }],
  });
  const script = [
    "#!/usr/bin/env node",
    "const fs = require('fs');",
    "const args = process.argv.slice(2);",
    "const outputIndex = args.indexOf('--output-last-message');",
    "if (outputIndex !== -1 && args[outputIndex + 1]) {",
    `  fs.writeFileSync(args[outputIndex + 1], ${JSON.stringify(fakeResponse)});`,
    "}",
  ].join("\n");
  writeFileSync(codexPath, `${script}\n`);
  chmodSync(codexPath, 0o755);
  return codexPath;
}

test("start-workspace-session CLI starts a live workspace session and outputs JSON fields", () => {
  withTempHome();
  const root = createRepoFixture();
  const runnerDir = mkdtempSync(join(tmpdir(), "sibar-fake-codex-"));
  writeFakeCodexCommand(runnerDir, ["src/runtime.ts"]);

  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve("src/sibi.ts"),
      "start-workspace-session",
      "--goal",
      "Explain this project A-Z",
      "--root",
      root,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        SIBI_RUNTIME_HOME: process.env.SIBI_RUNTIME_HOME,
        PATH: `${runnerDir}${delimiter}${process.env.PATH}`,
      },
      cwd: resolve("."),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const response = JSON.parse(result.stdout.trim()) as {
    workspace_session_id: string;
    runner_status: string;
    runner: { status: "completed" | "blocked" };
    snapshot: { loop_state: string };
  };
  assert.ok(response.workspace_session_id.length > 10);
  assert.equal(response.runner.status, "completed");
  assert.equal(response.runner_status, "completed");
  assert.equal(response.snapshot.loop_state, "AwaitingAttempt");
});

test("explain CLI starts a live workspace session from a positional goal", () => {
  withTempHome();
  const root = createRepoFixture();
  const runnerDir = mkdtempSync(join(tmpdir(), "sibar-fake-codex-"));
  writeFakeCodexCommand(runnerDir, ["src/runtime.ts"]);

  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve("src/sibi.ts"),
      "explain",
      "Explain this project A-Z",
      "--root",
      root,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        SIBI_RUNTIME_HOME: process.env.SIBI_RUNTIME_HOME,
        PATH: `${runnerDir}${delimiter}${process.env.PATH}`,
      },
      cwd: resolve("."),
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const response = JSON.parse(result.stdout.trim()) as {
    runner_status: string;
    snapshot: { loop_state: string };
  };
  assert.equal(response.runner_status, "completed");
  assert.equal(response.snapshot.loop_state, "AwaitingAttempt");
});

test("start-workspace-session CLI requires goal", () => {
  withTempHome();
  const root = createRepoFixture();
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      resolve("src/sibi.ts"),
      "start-workspace-session",
      "--root",
      root,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        SIBI_RUNTIME_HOME: process.env.SIBI_RUNTIME_HOME,
      },
      cwd: resolve("."),
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--goal is required/);
});
