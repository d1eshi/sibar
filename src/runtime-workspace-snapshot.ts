import { projectWorkspaceSnapshotFromFixture } from "./runtime-deep-ownership-snapshot.ts";
import { loadAndValidateFixture } from "./runtime-deep-ownership-validation-fixture.ts";
import { fail, toOperationState, type RuntimeSuccess } from "./runtime-support.ts";

import type { WorkspaceSnapshot } from "./runtime-deep-ownership-loop-types.ts";

export type WorkspaceLensSnapshotState = {
  snapshot: WorkspaceSnapshot;
  open_workspace: {
    label: "Open Workspace";
    target_url: string;
  };
  operation_state: { message: string };
};

export function getWorkspaceSnapshotCommand(
  payload: Record<string, unknown>,
): RuntimeSuccess<WorkspaceLensSnapshotState> {
  const fixturePath = typeof payload.fixture_path === "string"
    ? payload.fixture_path
    : undefined;
  const workspaceURL = typeof payload.workspace_url === "string"
    && payload.workspace_url.trim().length > 0
    ? payload.workspace_url.trim()
    : "http://127.0.0.1:4180/workspace.html";

  const { fixture, validation } = loadAndValidateFixture(fixturePath);
  if (!fixture || !validation.valid) {
    fail(
      "invalid_workspace_fixture",
      `Workspace snapshot fixture is invalid: ${validation.summary}`,
    );
  }

  return {
    ok: true,
    data: {
      snapshot: projectWorkspaceSnapshotFromFixture(fixture),
      open_workspace: {
        label: "Open Workspace",
        target_url: workspaceURL,
      },
      operation_state: toOperationState("Workspace snapshot projected from runtime-owned state."),
    },
  };
}
