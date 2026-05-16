import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ArtifactBoundary } from "./runtime-deep-ownership-evidence-types.ts";
import type { DeepOwnershipFixture } from "./runtime-deep-ownership-loop-types.ts";
import { checkBoundaryEscape, isPathInBoundary } from "./runtime-deep-ownership-boundary.ts";
import { projectWorkspaceSnapshotFromFixture } from "./runtime-deep-ownership-snapshot.ts";

const DESKTOP_SHELL_PATH = "dow-desktop-shell-path" as const;
const DESKTOP_ASSERTION_ID = "VAL-DESKTOP-001" as const;

export type DesktopShellContract = {
  shell_path: typeof DESKTOP_SHELL_PATH;
  assertion_id: typeof DESKTOP_ASSERTION_ID;
  fixture_id: string;
  loop_id: string;
  snapshot_id: string;
  filesystem_mode: "bounded_read_only";
  mutation_allowed: false;
  editor_plugin_required: false;
};

export type DesktopShellReadFileSuccess = {
  ok: true;
  blocked: false;
  requested_path: string;
  absolute_path: string;
  content: string;
};

export type DesktopShellReadFileFailure = {
  ok: false;
  blocked: boolean;
  requested_path: string;
  reason: string;
};

export type DesktopShellReadFileResult =
  | DesktopShellReadFileSuccess
  | DesktopShellReadFileFailure;

export type DesktopShellBlockedAction = {
  ok: false;
  blocked: true;
  reason: string;
};

export type DesktopShellFsBridge = {
  mode: "bounded_read_only";
  mutation_allowed: false;
  editor_plugin_required: false;
  readTextFile: (requestedPath: string) => DesktopShellReadFileResult;
  requestProductMutation: () => DesktopShellBlockedAction;
  requireEditorPlugin: () => DesktopShellBlockedAction;
};

export type DesktopShellFsBridgeInput = {
  root_path: string;
  artifact_boundary: ArtifactBoundary;
  read_text_file?: (absolutePath: string) => string;
};

function normalizeRequestedPath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function blockedRead(requestedPath: string, reason: string): DesktopShellReadFileFailure {
  return {
    ok: false,
    blocked: true,
    requested_path: requestedPath,
    reason,
  };
}

/**
 * Build the desktop-shell contract from the same fixture used by the web
 * workspace path, preserving fixture and snapshot identities.
 */
export function createDesktopShellContractFromFixture(
  fixture: DeepOwnershipFixture,
): DesktopShellContract {
  const snapshot = projectWorkspaceSnapshotFromFixture(fixture);
  return {
    shell_path: DESKTOP_SHELL_PATH,
    assertion_id: DESKTOP_ASSERTION_ID,
    fixture_id: fixture.fixture_id,
    loop_id: snapshot.loop_id,
    snapshot_id: snapshot.snapshot_id,
    filesystem_mode: "bounded_read_only",
    mutation_allowed: false,
    editor_plugin_required: false,
  };
}

/**
 * Create a bounded read-only filesystem adapter for desktop shell prototype
 * paths. Reads are allowed only when the path remains inside the declared
 * boundary and included sources.
 */
export function createDesktopShellFsBridge(input: DesktopShellFsBridgeInput): DesktopShellFsBridge {
  const resolvedRoot = resolve(input.root_path);
  const boundary: ArtifactBoundary = {
    ...input.artifact_boundary,
    root_path: resolvedRoot,
  };
  const readTextFile = input.read_text_file
    ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));

  return {
    mode: "bounded_read_only",
    mutation_allowed: false,
    editor_plugin_required: false,
    readTextFile(requestedPath: string): DesktopShellReadFileResult {
      const normalizedPath = normalizeRequestedPath(String(requestedPath ?? ""));

      if (normalizedPath.length === 0) {
        return blockedRead(normalizedPath, "Desktop shell read path is required.");
      }

      const boundaryEscape = checkBoundaryEscape(normalizedPath, resolvedRoot, boundary);
      if (boundaryEscape.blocked) {
        return blockedRead(normalizedPath, boundaryEscape.reason ?? "Desktop shell read blocked by boundary.");
      }

      const absolutePath = resolve(resolvedRoot, normalizedPath);
      if (!isPathInBoundary(absolutePath, boundary)) {
        return blockedRead(
          normalizedPath,
          `Path '${normalizedPath}' is outside desktop shell included_sources boundary.`,
        );
      }

      try {
        return {
          ok: true,
          blocked: false,
          requested_path: normalizedPath,
          absolute_path: absolutePath,
          content: readTextFile(absolutePath),
        };
      } catch (error) {
        return {
          ok: false,
          blocked: false,
          requested_path: normalizedPath,
          reason: error instanceof Error ? error.message : "Desktop shell read failed.",
        };
      }
    },
    requestProductMutation(): DesktopShellBlockedAction {
      return {
        ok: false,
        blocked: true,
        reason: "Product mutation is blocked in desktop shell prototype path.",
      };
    },
    requireEditorPlugin(): DesktopShellBlockedAction {
      return {
        ok: false,
        blocked: true,
        reason: "Desktop shell path is editor-plugin independent.",
      };
    },
  };
}
