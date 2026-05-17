import test from "node:test";
import assert from "node:assert/strict";

import { handleRequest } from "../src/runtime.ts";

type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: { code: string; message: string } };

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | Failure;
  assert.equal(result.ok, true);
  return result as Success<T>;
}

test("get_workspace_snapshot returns WorkspaceSnapshot projection and open-workspace action", () => {
  const result = expectSuccess<{
    snapshot: {
      snapshot_id: string;
      loop_id: string;
      goal: string;
      active_operation: { kind: string; prompt: string } | null;
      readiness: { status: string; scope: string };
      detected_gap: { kind: string; severity: string; blocks_readiness: boolean } | null;
    };
    open_workspace: { label: string; target_url: string };
    operation_state: { message: string };
  }>(handleRequest({
    command: "get_workspace_snapshot",
    payload: {},
  }));

  assert.match(result.data.snapshot.snapshot_id, /^SNAP-/);
  assert.equal(result.data.open_workspace.label, "Open Workspace");
  assert.equal(result.data.open_workspace.target_url, "http://127.0.0.1:4180/workspace.html");
  assert.equal(result.data.operation_state.message, "Workspace snapshot projected from runtime-owned state.");
  assert.ok(result.data.snapshot.goal.length > 10);
});

test("get_workspace_snapshot accepts explicit workspace_url override", () => {
  const result = expectSuccess<{ open_workspace: { target_url: string } }>(handleRequest({
    command: "get_workspace_snapshot",
    payload: { workspace_url: "http://127.0.0.1:4181/workspace.html" },
  }));

  assert.equal(result.data.open_workspace.target_url, "http://127.0.0.1:4181/workspace.html");
});

test("get_workspace_snapshot fails closed when fixture path is invalid", () => {
  const result = handleRequest({
    command: "get_workspace_snapshot",
    payload: { fixture_path: "docs/specs/deep-ownership-workspace/fixtures/missing.json" },
  }) as Failure;

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid_workspace_fixture");
  assert.match(result.error.message, /fixture/i);
});
