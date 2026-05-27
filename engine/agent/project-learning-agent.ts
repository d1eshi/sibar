import { randomUUID } from "node:crypto";

import {
  loadFixtureModelOutput,
  resolveModelRunnerConfig,
  runConfiguredCodexRunner,
} from "./runner.ts";
import { validateModelSignalCandidates } from "./validation.ts";
import { getArtifactSession, readState, writeState } from "../persistence/state.ts";
import {
  now,
  toOperationState,
  type ArtifactSession,
  type PedagogyTrace,
  type RuntimeSuccess,
} from "../runtime/contracts.ts";

export type ProjectLearningAgentResult = {
  status: "completed" | "blocked";
  blocked_reason?: string;
  trace?: PedagogyTrace;
  operation_state: { message: string };
};

function buildAgentPrompt(artifactSession: ArtifactSession, workspaceContext: unknown): string {
  return JSON.stringify({
    role: "sibi_project_learning_agent",
    instruction:
      "Return candidate learning signals only. Do not decide truth, learner mastery, readiness, or final grades.",
    rules: [
      "Only claim facts supported by cited files inside the artifact boundary.",
      "Use source_control and file_inventory as orientation, not as proof for uncited project facts.",
      "Every candidate_signal must include at least one citation to an allowed file.",
      "If evidence is insufficient, return fewer candidate_signals instead of guessing.",
    ],
    output_schema: {
      files_read: ["path inside artifact boundary"],
      candidate_signals: [{
        signal_type: "concept | flow | risk | gap_candidate | misconception_candidate | practice_candidate",
        claim: "bounded claim",
        confidence: "low | medium | high",
        citations: [{ path: "allowed file path", range: "line or line range" }],
        rationale: "why this may help learning",
        proposed_layer: "optional integer 1-5",
      }],
    },
    workspace_context: workspaceContext ?? null,
    artifact_boundary: {
      artifact_session_id: artifactSession.artifact_session_id,
      root_path: artifactSession.root_path,
      included_paths: artifactSession.included_paths,
      excluded_paths: artifactSession.excluded_paths,
      learning_goal: artifactSession.learning_goal,
    },
  }, null, 2);
}

export function runProjectLearningAgentCommand(payload: Record<string, unknown>): RuntimeSuccess<ProjectLearningAgentResult> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const config = resolveModelRunnerConfig(payload);
  const fixtureOutput = loadFixtureModelOutput(payload, artifactSession, config);
  if (!fixtureOutput && !config.command) {
    return {
      ok: true,
      data: {
        status: "blocked",
        blocked_reason:
          "Codex runner is not configured. Set SIBI_CODEX_COMMAND or pass fixture_model_response for offline evals.",
        operation_state: toOperationState("Project learning agent blocked: no Codex runner configured."),
      },
    };
  }

  const prompt = buildAgentPrompt(artifactSession, payload.workspace_context ?? null);
  const runnerOutput = fixtureOutput ?? runConfiguredCodexRunner(config, prompt, artifactSession);
  const validation = validateModelSignalCandidates(
    runnerOutput.candidateSignals,
    artifactSession,
    runnerOutput.filesRead,
  );
  const trace: PedagogyTrace = {
    trace_id: randomUUID(),
    artifact_session_id: artifactSession.artifact_session_id,
    ...(typeof payload.eval_case_id === "string" && payload.eval_case_id.trim()
      ? { eval_case_id: payload.eval_case_id.trim() }
      : {}),
    model_runner: runnerOutput.modelRunner,
    model_name: runnerOutput.modelName,
    reasoning_effort: runnerOutput.reasoningEffort,
    prompt,
    artifact_boundary: {
      root_path: artifactSession.root_path,
      included_paths: artifactSession.included_paths,
      excluded_paths: artifactSession.excluded_paths,
    },
    files_read: runnerOutput.filesRead,
    candidate_signals: runnerOutput.candidateSignals,
    deterministic_validation: validation.validations,
    accepted_signals: validation.acceptedSignals,
    rejected_signals: validation.rejectedSignals,
    final_runtime_output: {
      accepted_signal_count: validation.acceptedSignals.length,
      rejected_signal_count: validation.rejectedSignals.length,
      readiness_decided_by_model: false,
    },
    created_at: now(),
  };

  artifactSession.pedagogy_traces = [...(artifactSession.pedagogy_traces ?? []), trace];
  writeState(state);

  return {
    ok: true,
    data: {
      status: "completed",
      trace,
      operation_state: toOperationState("Project learning agent trace recorded with deterministic validation."),
    },
  };
}
