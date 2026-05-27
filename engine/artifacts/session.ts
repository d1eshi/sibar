import { randomUUID } from "node:crypto";
import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { getArtifactSession, readState, writeState } from "../persistence/state.ts";
import {
  fail,
  now,
  toOperationState,
  type ArtifactConfidence,
  type ArtifactSession,
  type RuntimeState,
  type RuntimeSuccess,
} from "../runtime/contracts.ts";

function ensureArtifactSessionMap(state: RuntimeState): Record<string, ArtifactSession> {
  state.artifact_sessions ??= {};
  return state.artifact_sessions;
}

function normalizePathInsideRoot(rawPath: string, rootPath: string, errorCode = "outside_artifact"): string {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) {
    fail("invalid_payload", "Artifact paths must be non-empty strings.");
  }

  const absolutePath = isAbsolute(trimmed) ? resolve(trimmed) : resolve(rootPath, trimmed);
  if (!isAbsolute(trimmed) && !isWithinRoot(absolutePath, rootPath)) {
    fail(errorCode, `Artifact path ${absolutePath} resolves outside root ${rootPath}.`);
  }
  if (!existsSync(absolutePath)) {
    fail("missing_artifact_path", `Artifact path ${absolutePath} does not exist.`);
  }

  const realPath = realpathSync(absolutePath);
  if (!isWithinRoot(realPath, rootPath)) {
    fail(errorCode, `Artifact path ${absolutePath} resolves outside root ${rootPath}.`);
  }

  return realPath;
}

function isWithinRoot(candidatePath: string, rootPath: string): boolean {
  return candidatePath === rootPath || candidatePath.startsWith(rootPath.endsWith("/") ? rootPath : `${rootPath}/`);
}

function asPathArray(value: unknown, fallback: string[]): string[] {
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    fail("invalid_payload", "included_paths and excluded_paths must be arrays.");
  }
  return value.map((entry) => String(entry));
}

function isExcludedByArtifact(path: string, artifactSession: Pick<ArtifactSession, "excluded_paths">): boolean {
  return artifactSession.excluded_paths.some((excludedPath) => isWithinRoot(path, excludedPath));
}

export function assertArtifactAllowsPath(rawPath: string, artifactSession: ArtifactSession): string {
  const realPath = normalizePathInsideRoot(rawPath, artifactSession.root_path);
  if (isExcludedByArtifact(realPath, artifactSession)) {
    fail("excluded_artifact_path", "file_path is excluded from the artifact session.");
  }
  const included = artifactSession.included_paths.some((includedPath) => isWithinRoot(realPath, includedPath));
  if (!included) {
    fail("outside_artifact", "file_path must be inside one of the artifact session included paths.");
  }
  return realPath;
}

export function resolveArtifactSessionFromPayload(payload: Record<string, unknown>): ArtifactSession | null {
  if (typeof payload.artifact_session_id !== "string" || payload.artifact_session_id.trim() === "") {
    return null;
  }

  const state = readState();
  return getArtifactSession(state, payload.artifact_session_id);
}

function normalizeArtifactConfidence(value: unknown): ArtifactConfidence {
  if (value === "low" || value === "medium" || value === "high") return value;
  fail("invalid_payload", "confidence must be one of low, medium, or high.");
}

export function createArtifactSessionCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session: ArtifactSession;
  operation_state: { message: string };
}> {
  const rootInput = String(payload.root_path || "").trim();
  const label = String(payload.label || "").trim();
  const learningGoal = String(payload.learning_goal || "").trim();
  if (!rootInput || !label || !learningGoal) {
    fail("invalid_payload", "create_artifact_session requires label, root_path, and learning_goal.");
  }

  const resolvedRoot = resolve(rootInput);
  if (!existsSync(resolvedRoot)) {
    fail("missing_artifact_root", `Artifact root ${resolvedRoot} does not exist.`);
  }
  if (!statSync(resolvedRoot).isDirectory()) {
    fail("invalid_artifact_root", "root_path must be a directory.");
  }

  const rootPath = realpathSync(resolvedRoot);
  const includedPaths = asPathArray(payload.included_paths, [rootPath])
    .map((entry) => normalizePathInsideRoot(entry, rootPath));
  if (includedPaths.length === 0) {
    fail("invalid_payload", "included_paths must contain at least one path.");
  }

  const excludedPaths = asPathArray(payload.excluded_paths, [])
    .map((entry) => normalizePathInsideRoot(entry, rootPath));
  if (includedPaths.some((includedPath) => isExcludedByArtifact(includedPath, { excluded_paths: excludedPaths }))) {
    fail("excluded_artifact_path", "included_paths cannot be fully excluded.");
  }

  const artifactSession: ArtifactSession = {
    artifact_session_id: randomUUID(),
    label,
    root_path: rootPath,
    source_type: String(payload.source_type || "local_path").trim() || "local_path",
    learning_goal: learningGoal,
    confidence: normalizeArtifactConfidence(payload.confidence),
    included_paths: Array.from(new Set(includedPaths)),
    excluded_paths: Array.from(new Set(excludedPaths)),
    created_at: now(),
  };

  const state = readState();
  ensureArtifactSessionMap(state)[artifactSession.artifact_session_id] = artifactSession;
  state.current_artifact_session_id = artifactSession.artifact_session_id;
  writeState(state);

  return {
    ok: true,
    data: {
      artifact_session: artifactSession,
      operation_state: toOperationState("Artifact session created in TypeScript runtime."),
    },
  };
}

export function getArtifactSessionCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session: ArtifactSession;
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  return {
    ok: true,
    data: {
      artifact_session: artifactSession,
      operation_state: toOperationState("Artifact session loaded from TypeScript runtime."),
    },
  };
}
