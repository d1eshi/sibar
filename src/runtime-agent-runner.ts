import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { normalizeCitation } from "./runtime-agent-validation.ts";
import {
  fail,
  type ArtifactSession,
  type ModelSignalCandidate,
} from "./runtime-support.ts";

export type ModelRunnerConfig = {
  command: string | null;
  modelName: string;
  reasoningEffort: string;
  timeoutMs: number;
};

export type ModelRunnerOutput = {
  modelRunner: string;
  modelName: string;
  reasoningEffort: string;
  filesRead: string[];
  candidateSignals: ModelSignalCandidate[];
};

export function resolveModelRunnerConfig(payload: Record<string, unknown>): ModelRunnerConfig {
  const timeoutValue = Number(payload.codex_timeout_ms ?? process.env.SIBI_CODEX_TIMEOUT_MS ?? 30_000);
  return {
    command: String(payload.codex_command ?? process.env.SIBI_CODEX_COMMAND ?? "").trim() || null,
    modelName: String(payload.model_name ?? process.env.SIBI_CODEX_MODEL ?? "codex").trim() || "codex",
    reasoningEffort: String(payload.reasoning_effort ?? process.env.SIBI_CODEX_REASONING ?? "unspecified").trim()
      || "unspecified",
    timeoutMs: Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 30_000,
  };
}

export function loadFixtureModelOutput(
  payload: Record<string, unknown>,
  artifactSession: ArtifactSession,
  config: ModelRunnerConfig,
): ModelRunnerOutput | null {
  const rawFixture = payload.fixture_model_response
    ?? (typeof payload.fixture_model_response_path === "string"
      ? JSON.parse(readFileSync(payload.fixture_model_response_path, "utf8")) as unknown
      : null);
  if (!rawFixture) return null;

  const fixture = rawFixture as {
    model?: unknown;
    model_name?: unknown;
    reasoning_effort?: unknown;
    files_read?: unknown;
    candidate_signals?: unknown;
  };
  return {
    modelRunner: "fixture",
    modelName: String(fixture.model_name ?? fixture.model ?? config.modelName),
    reasoningEffort: String(fixture.reasoning_effort ?? config.reasoningEffort),
    filesRead: Array.isArray(fixture.files_read) ? fixture.files_read.map((entry) => String(entry)) : [],
    candidateSignals: normalizeCandidateSignals(
      fixture.candidate_signals,
      artifactSession,
      String(fixture.model_name ?? fixture.model ?? config.modelName),
    ),
  };
}

export function runConfiguredCodexRunner(
  config: ModelRunnerConfig,
  prompt: string,
  artifactSession: ArtifactSession,
): ModelRunnerOutput {
  if (!config.command) {
    fail(
      "model_runner_not_configured",
      "run_project_learning_agent is blocked until SIBI_CODEX_COMMAND or payload.codex_command is configured.",
    );
  }

  const result = spawnSync(config.command, {
    shell: true,
    input: prompt,
    encoding: "utf8",
    timeout: config.timeoutMs,
    env: {
      ...process.env,
      SIBI_CODEX_MODEL: config.modelName,
      SIBI_CODEX_REASONING: config.reasoningEffort,
    },
  });
  if (result.error) {
    fail("model_runner_failed", result.error.message);
  }
  if (result.status !== 0) {
    fail("model_runner_failed", result.stderr.trim() || `Codex runner exited with status ${result.status}.`);
  }

  const parsed = JSON.parse(result.stdout) as {
    files_read?: unknown;
    candidate_signals?: unknown;
  };
  return {
    modelRunner: config.command,
    modelName: config.modelName,
    reasoningEffort: config.reasoningEffort,
    filesRead: Array.isArray(parsed.files_read) ? parsed.files_read.map((entry) => String(entry)) : [],
    candidateSignals: normalizeCandidateSignals(parsed.candidate_signals, artifactSession, config.modelName),
  };
}

function normalizeCandidateSignals(
  rawCandidates: unknown,
  artifactSession: ArtifactSession,
  modelName: string,
): ModelSignalCandidate[] {
  if (!Array.isArray(rawCandidates)) {
    fail("invalid_model_response", "Model response must contain candidate_signals array.");
  }

  return rawCandidates.map((rawCandidate) => {
    const candidate = rawCandidate as {
      id?: unknown;
      signal_type?: unknown;
      claim?: unknown;
      confidence?: unknown;
      rationale?: unknown;
      citations?: unknown;
      proposed_layer?: unknown;
    };
    const validation_error_hints: string[] = [];
    const citations = Array.isArray(candidate.citations)
      ? candidate.citations.flatMap((citation) => {
        try {
          return [normalizeCitation(citation, artifactSession)];
        } catch {
          validation_error_hints.push("invalid_or_out_of_bound_citation");
          return [];
        }
      })
      : [];
    return {
      id: String(candidate.id ?? randomUUID()),
      artifact_session_id: artifactSession.artifact_session_id,
      model_name: modelName,
      signal_type: String(candidate.signal_type ?? ""),
      claim: String(candidate.claim ?? ""),
      citations,
      confidence: String(candidate.confidence ?? "low"),
      rationale: String(candidate.rationale ?? ""),
      proposed_layer: candidate.proposed_layer === undefined ? undefined : Number(candidate.proposed_layer),
      validation_error_hints,
    };
  });
}
