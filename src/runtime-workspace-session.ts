import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { createArtifactSessionCommand } from "./runtime-artifact-session.ts";
import { captureAndEvaluate } from "./runtime-attempt-evaluation/capture-and-evaluate.ts";
import type {
  WorkspaceSnapshot,
} from "./runtime-deep-ownership-loop-types.ts";
import { projectWorkspaceSnapshot } from "./runtime-deep-ownership-snapshot.ts";
import { buildWorkspaceInventory } from "./runtime-workspace-context.ts";
import { readState, writeState } from "./runtime-state.ts";
import {
  asStringArray,
  buildGap,
  buildRepair,
  buildRunnerSummary,
  buildWorkspaceLoop,
  makeReadinessClaim,
  resolveDefaultExcludedPaths,
  resolveWorkspaceURL,
} from "./runtime-workspace-session-logic.ts";
import { fail, now, toOperationState, type RuntimeSuccess, type RuntimeWorkspaceSession } from "./runtime-support.ts";
import { runProjectLearningAgentCommand as runAgent } from "./runtime-agent.ts";
import {
  DEFAULT_EXCLUDED_PATHS,
  MAX_GOAL_LABEL_LENGTH,
  WORKSPACE_OPEN_LABEL,
  WORKSPACE_URL_DEFAULT,
} from "./runtime-workspace-session-constants.ts";

type WorkspaceSessionResponse = {
  workspace_session: RuntimeWorkspaceSession;
  snapshot: WorkspaceSnapshot;
  open_workspace: { label: typeof WORKSPACE_OPEN_LABEL; target_url: string };
  operation_state: { message: string };
};

function getWorkspaceSession(workspaceSessionID: unknown): RuntimeWorkspaceSession {
  const id = String(workspaceSessionID || "").trim();
  if (!id) fail("invalid_payload", "workspace_session_id is required.");
  const state = readState();
  const session = state.workspace_sessions?.[id];
  if (!session) fail("missing_workspace_session", `Workspace session ${id} was not found.`);
  return session;
}

export function startWorkspaceSessionCommand(
  payload: Record<string, unknown>,
): RuntimeSuccess<WorkspaceSessionResponse> {
  const goal = String(payload.goal || "").trim();
  const rootPath = resolve(String(payload.root_path || process.cwd()));
  if (!goal) fail("invalid_payload", "start_workspace_session requires goal.");
  if (!existsSync(rootPath)) fail("missing_artifact_root", `Workspace root ${rootPath} does not exist.`);

  const includedPaths = asStringArray(payload.included_paths, ["."]);
  const excludedPaths = asStringArray(
    payload.excluded_paths,
    resolveDefaultExcludedPaths(rootPath, DEFAULT_EXCLUDED_PATHS),
  );
  const created = createArtifactSessionCommand({
    label: String(payload.label || `Workspace: ${goal.slice(0, MAX_GOAL_LABEL_LENGTH)}`),
    root_path: rootPath,
    source_type: "repository",
    learning_goal: goal,
    confidence: "medium",
    included_paths: includedPaths,
    excluded_paths: excludedPaths,
  });
  const artifactSession = created.data.artifact_session;
  const inventory = buildWorkspaceInventory(artifactSession);
  const agentResult = runAgent({
    artifact_session_id: artifactSession.artifact_session_id,
    workspace_context: inventory.context,
    codex_command: payload.codex_command,
    codex_timeout_ms: payload.codex_timeout_ms,
    model_name: payload.model_name,
    reasoning_effort: payload.reasoning_effort,
    fixture_model_response: payload.fixture_model_response,
    fixture_model_response_path: payload.fixture_model_response_path,
  }).data;

  const workspaceSessionID = randomUUID();
  const loop = buildWorkspaceLoop({
    id: `LOOP-${workspaceSessionID.slice(0, 8)}`,
    goal,
    artifactSession,
    inventory,
    agent: agentResult,
  });
  const timestamp = now();
  const workspaceSession: RuntimeWorkspaceSession = {
    workspace_session_id: workspaceSessionID,
    artifact_session_id: artifactSession.artifact_session_id,
    loop,
    runner: buildRunnerSummary(agentResult),
    source_control: inventory.context.source_control,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const state = readState();
  state.workspace_sessions ??= {};
  state.workspace_sessions[workspaceSessionID] = workspaceSession;
  writeState(state);

  return {
    ok: true,
    data: {
      workspace_session: workspaceSession,
      snapshot: projectWorkspaceSnapshot(loop),
      open_workspace: {
        label: WORKSPACE_OPEN_LABEL,
        target_url: resolveWorkspaceURL(payload, WORKSPACE_URL_DEFAULT),
      },
      operation_state: toOperationState("Workspace session started from runtime boundary and LLM runner contract."),
    },
  };
}

export function submitWorkspaceAttemptCommand(
  payload: Record<string, unknown>,
): RuntimeSuccess<WorkspaceSessionResponse> {
  const workspaceSession = getWorkspaceSession(payload.workspace_session_id);
  const loop = workspaceSession.loop;
  const operation = loop.active_operation;
  const artifact = loop.thinking_artifacts[0];
  if (!operation || !artifact || !loop.concept_slice) {
    fail("workspace_not_ready", "Workspace session has no accepted LLM-backed operation to attempt.");
  }

  const answerText = String(payload.answer_text || "").trim();
  if (!answerText) fail("invalid_payload", "submit_workspace_attempt requires answer_text.");
  const selectedEvidence = asStringArray(payload.selected_evidence, []);
  const declaredConfidence = String(payload.declared_confidence || "medium");
  const evaluated = captureAndEvaluate({
    operation,
    artifact,
    answer_text: answerText,
    selected_evidence: selectedEvidence,
    declared_confidence: declaredConfidence === "low" || declaredConfidence === "high" ? declaredConfidence : "medium",
    declared_unknowns: asStringArray(payload.declared_unknowns, []),
    evidenceInventory: loop.evidence_inventory,
  });
  const gap = evaluated.gapKind
    ? buildGap({
      loop,
      attempt: evaluated.attempt,
      evidenceCheck: evaluated.evidenceCheck,
      gapKind: evaluated.gapKind,
    })
    : null;
  const repair = gap ? buildRepair(loop, gap) : null;

  loop.sample_attempt = evaluated.attempt;
  loop.evidence_check = evaluated.evidenceCheck;
  loop.detected_gap = gap;
  loop.repair_action = repair;
  loop.readiness_claim = makeReadinessClaim({
    conceptSliceID: loop.concept_slice.id,
    operationID: operation.id,
    status: evaluated.evidenceCheck.result === "confirmed" && !gap ? "ready" : "blocked",
    scope: "Deterministic readiness derived from evidence-check result for this operation only.",
    blockedClaims: gap ? evaluated.evidenceCheck.missing_claims : [],
    supportingEvidence: evaluated.evidenceCheck.cited_evidence.map((ref) => ref.evidence_id),
    blockingGaps: gap ? [gap.id] : [],
  });
  loop.loop_entry.current_state = "GapOrReady";
  loop.loop_entry.state_chain = Array.from(new Set([...loop.loop_entry.state_chain, "AttemptStored", "EvidenceChecked", "GapOrReady"]));

  workspaceSession.updated_at = now();
  const state = readState();
  state.workspace_sessions ??= {};
  state.workspace_sessions[workspaceSession.workspace_session_id] = workspaceSession;
  writeState(state);

  return {
    ok: true,
    data: {
      workspace_session: workspaceSession,
      snapshot: projectWorkspaceSnapshot(loop),
      open_workspace: {
        label: WORKSPACE_OPEN_LABEL,
        target_url: resolveWorkspaceURL(payload, WORKSPACE_URL_DEFAULT),
      },
      operation_state: toOperationState("Workspace attempt evaluated by deterministic evidence checks."),
    },
  };
}
