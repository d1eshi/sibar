import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { handleRequest } from "../runtime.ts";
import type { ModelSignalCandidate, PedagogyTrace } from "../runtime-support.ts";
import { loadEvalDataset } from "./deterministic-pedagogy/dataset.ts";
import { materializeFixture } from "./deterministic-pedagogy/fixtures.ts";
import type { EvalCase } from "./deterministic-pedagogy/types.ts";

const DEFAULT_INDEX = "docs/missions/sibi-v01-build-to-learn/evals/dataset/index.json";
const DEFAULT_REPORT = "docs/missions/sibi-v01-build-to-learn/evals/reports/VAL-EVAL-003-005-llm-runtime-trace.json";
const DEFAULT_TEMP_PREFIX = ".sibi-llm-trace-eval-runtime-";

type CodexModelConfig = {
  model_name: "gpt-5.2" | "gpt-5.5";
  reasoning_effort: "medium" | "low";
  label: "codex gpt-5.2 medium" | "codex gpt-5.5 low";
};

type FixtureModelResponse = {
  model: string;
  reasoning_effort: string;
  files_read: string[];
  candidate_signals: {
    id: string;
    signal_type: string;
    claim: string;
    confidence: string;
    citations?: { path: string; range: string }[];
    rationale?: string;
    proposed_layer?: number;
  }[];
};

type TraceCaseSummary = {
  case_id: string;
  case_class: string;
  model_label: string;
  trace: PedagogyTrace;
  accepted_signal_ids: string[];
  rejected_signal_ids: string[];
  rejected_signal_reasons: Record<string, string[]>;
  citation_quality: {
    accepted_with_citations: number;
    rejected_missing_citation: number;
    rejected_invalid_or_out_of_bound_citation: number;
  };
  boundary_compliance: {
    invalid_file_reads: string[];
    accepted_out_of_boundary_count: number;
  };
  failure_modes: string[];
};

export type LlmRuntimeTraceEvalReport = {
  report_id: string;
  generated_at: string;
  validations: ["VAL-EVAL-003", "VAL-EVAL-005", "VAL-AGENT-001", "VAL-AGENT-002"];
  dataset: { id: string; version: string; index_path: string; benchmark_quality_claim: false; sizing_note: string };
  model_configurations: CodexModelConfig[];
  shared_case_ids: string[];
  prompt_schema_shared: boolean;
  artifact_boundary_shared_per_case: boolean;
  deterministic_validator: "run_project_learning_agent.validateModelSignalCandidates";
  live_run: { status: "blocked" | "available_not_run"; guidance: string };
  aggregate: {
    total_cases: number;
    traces_recorded: number;
    accepted_signals_by_model: Record<string, number>;
    rejected_signals_by_model: Record<string, number>;
    boundary_violations_rejected: number;
    readiness_or_truth_claims_rejected: number;
    uncited_claims_rejected: number;
  };
  cases: TraceCaseSummary[];
  comparison: {
    case_id: string;
    shared_model_case: true;
    gpt_5_2_medium: { accepted: number; rejected: number; failure_modes: string[] };
    gpt_5_5_low: { accepted: number; rejected: number; failure_modes: string[] };
  }[];
};

export type LlmRuntimeTraceRunOptions = {
  indexPath?: string;
  reportPath?: string;
  runtimeHome?: string;
};

const MODEL_CONFIGS: CodexModelConfig[] = [
  { model_name: "gpt-5.2", reasoning_effort: "medium", label: "codex gpt-5.2 medium" },
  { model_name: "gpt-5.5", reasoning_effort: "low", label: "codex gpt-5.5 low" },
];

function expectSuccess<T>(value: unknown): T {
  const result = value as { ok: true; data: T } | { ok: false; error: { message: string } };
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

function createArtifactSession(testCase: EvalCase, root: string): string {
  const excludedPaths = testCase.artifact_boundary.excluded_paths.filter((entry) => !entry.startsWith("../"));
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: `E03 trace eval ${testCase.id}`,
      root_path: root,
      source_type: "local_path",
      learning_goal: testCase.learning_goal,
      confidence: "medium",
      included_paths: testCase.artifact_boundary.included_paths,
      excluded_paths: excludedPaths,
    },
  }));
  return created.artifact_session.artifact_session_id;
}

function firstRequiredPath(testCase: EvalCase): string {
  return testCase.required_evidence[0]?.path ?? testCase.artifact_boundary.included_paths[0] ?? "src/runtime.ts";
}

function firstForbiddenPath(testCase: EvalCase): string {
  return testCase.forbidden_evidence[0]?.path ?? testCase.artifact_boundary.excluded_paths[0] ?? "../outside.md";
}

function citedSignal(input: {
  id: string;
  type: string;
  claim: string;
  path: string;
  layer: number;
  confidence?: string;
}): FixtureModelResponse["candidate_signals"][number] {
  return {
    id: input.id,
    signal_type: input.type,
    claim: input.claim,
    confidence: input.confidence ?? "medium",
    citations: [{ path: input.path, range: "1" }],
    rationale: "Fixture candidate for deterministic trace validation.",
    proposed_layer: input.layer,
  };
}

function buildFixtureResponse(testCase: EvalCase, config: CodexModelConfig): FixtureModelResponse {
  const allowedPath = firstRequiredPath(testCase);
  const forbiddenPath = firstForbiddenPath(testCase);
  const base: FixtureModelResponse = {
    model: config.model_name,
    reasoning_effort: config.reasoning_effort,
    files_read: [allowedPath],
    candidate_signals: [
      citedSignal({
        id: `${testCase.id}-${config.model_name}-accepted-concept`,
        type: "concept",
        claim: `${testCase.concept_under_test.label} is relevant to ${testCase.learning_goal}`,
        path: allowedPath,
        layer: testCase.expected_layer.level,
      }),
    ],
  };

  if (testCase.case_class === "boundary_violation") {
    base.candidate_signals.push(citedSignal({
      id: `${testCase.id}-${config.model_name}-forbidden-risk`,
      type: "risk",
      claim: "Excluded artifact notes may explain the runtime behavior.",
      path: forbiddenPath,
      layer: testCase.expected_layer.level,
      confidence: "high",
    }));
    if (config.model_name === "gpt-5.5") base.files_read.push(forbiddenPath);
  }

  if (testCase.case_class === "missing_evidence" || testCase.case_class === "partial_answer") {
    base.candidate_signals.push({
      id: `${testCase.id}-${config.model_name}-uncited-gap`,
      signal_type: "gap_candidate",
      claim: "The learner may be missing the evidence chain.",
      confidence: config.model_name === "gpt-5.2" ? "medium" : "high",
      citations: config.model_name === "gpt-5.2" ? [{ path: allowedPath, range: "1" }] : [],
      rationale: "Fixture checks uncited candidate rejection.",
      proposed_layer: testCase.expected_layer.level,
    });
  }

  if (testCase.case_class === "overconfident_llm_output") {
    base.candidate_signals.push({
      id: `${testCase.id}-${config.model_name}-readiness-claim`,
      signal_type: "readiness_claim",
      claim: "The learner is ready to own this artifact end to end.",
      confidence: "high",
      citations: config.model_name === "gpt-5.2" ? [{ path: forbiddenPath, range: "1" }] : [],
      rationale: "Fixture checks that model readiness claims are never accepted directly.",
      proposed_layer: 5,
    });
  }

  return base;
}

function summarizeTrace(testCase: EvalCase, config: CodexModelConfig, trace: PedagogyTrace): TraceCaseSummary {
  const rejectionReasons = Object.fromEntries(
    trace.rejected_signals.map((signal) => [signal.id, signal.validation_errors]),
  );
  const rejectedErrors = trace.rejected_signals.flatMap((signal) => signal.validation_errors);
  const invalidFileReads = trace.deterministic_validation
    .filter((validation) => validation.candidate_id.startsWith("files_read:") && !validation.accepted)
    .map((validation) => validation.candidate_id.replace(/^files_read:\d+:/, ""));
  const failureModes = Array.from(new Set(rejectedErrors));

  return {
    case_id: testCase.id,
    case_class: testCase.case_class,
    model_label: config.label,
    trace,
    accepted_signal_ids: trace.accepted_signals.map((signal) => signal.id),
    rejected_signal_ids: trace.rejected_signals.map((signal) => signal.id),
    rejected_signal_reasons: rejectionReasons,
    citation_quality: {
      accepted_with_citations: trace.accepted_signals.filter((signal) => signal.citations.length > 0).length,
      rejected_missing_citation: rejectedErrors.filter((error) => error === "missing_citation").length,
      rejected_invalid_or_out_of_bound_citation: rejectedErrors
        .filter((error) => error === "invalid_or_out_of_bound_citation").length,
    },
    boundary_compliance: {
      invalid_file_reads: invalidFileReads,
      accepted_out_of_boundary_count: countAcceptedOutOfBoundarySignals(trace.accepted_signals),
    },
    failure_modes: failureModes,
  };
}

function countAcceptedOutOfBoundarySignals(signals: ModelSignalCandidate[]): number {
  return signals.filter((signal) => signal.validation_error_hints?.includes("invalid_or_out_of_bound_citation")).length;
}

function runTraceCase(testCase: EvalCase, config: CodexModelConfig, artifactSessionID: string): TraceCaseSummary {
  const result = expectSuccess<{ status: "completed"; trace: PedagogyTrace }>(handleRequest({
    command: "run_project_learning_agent",
    payload: {
      artifact_session_id: artifactSessionID,
      eval_case_id: testCase.id,
      model_name: config.model_name,
      reasoning_effort: config.reasoning_effort,
      fixture_model_response: buildFixtureResponse(testCase, config),
    },
  }));
  return summarizeTrace(testCase, config, result.trace);
}

function runTraceCasePair(testCase: EvalCase): TraceCaseSummary[] {
  const fixture = materializeFixture(testCase);
  try {
    const artifactSessionID = createArtifactSession(testCase, fixture.root);
    return MODEL_CONFIGS.map((config) => runTraceCase(testCase, config, artifactSessionID));
  } finally {
    rmSync(fixture.cleanupRoot, { recursive: true, force: true });
  }
}

function liveRunStatus(): LlmRuntimeTraceEvalReport["live_run"] {
  if (process.env.SIBI_CODEX_COMMAND?.trim()) {
    return {
      status: "available_not_run",
      guidance: "SIBI_CODEX_COMMAND is configured, but E03 default report uses fixture traces. Run a live batch explicitly after review.",
    };
  }
  return {
    status: "blocked",
    guidance:
      "Live Codex trace evals are skipped because no runner is configured. Set SIBI_CODEX_COMMAND, SIBI_CODEX_MODEL, SIBI_CODEX_REASONING, and SIBI_CODEX_TIMEOUT_MS to enable live runs.",
  };
}

export function runLlmRuntimeTraceEvals(options: LlmRuntimeTraceRunOptions = {}): LlmRuntimeTraceEvalReport {
  const previousRuntimeHome = process.env.SIBI_RUNTIME_HOME;
  const runtimeHome = options.runtimeHome ?? join(resolve("."), `${DEFAULT_TEMP_PREFIX}${randomUUID()}`);
  process.env.SIBI_RUNTIME_HOME = runtimeHome;

  try {
    const indexPath = resolve(options.indexPath ?? DEFAULT_INDEX);
    const { index, cases } = loadEvalDataset(indexPath);
    const summaries = cases.flatMap(runTraceCasePair);
    const acceptedByModel = Object.fromEntries(MODEL_CONFIGS.map((config) => [
      config.label,
      summaries.filter((summary) => summary.model_label === config.label)
        .reduce((sum, summary) => sum + summary.accepted_signal_ids.length, 0),
    ]));
    const rejectedByModel = Object.fromEntries(MODEL_CONFIGS.map((config) => [
      config.label,
      summaries.filter((summary) => summary.model_label === config.label)
        .reduce((sum, summary) => sum + summary.rejected_signal_ids.length, 0),
    ]));
    const report: LlmRuntimeTraceEvalReport = {
      report_id: `VAL-EVAL-003-005-${new Date().toISOString()}`,
      generated_at: new Date().toISOString(),
      validations: ["VAL-EVAL-003", "VAL-EVAL-005", "VAL-AGENT-001", "VAL-AGENT-002"],
      dataset: {
        id: index.dataset_id,
        version: index.version,
        index_path: indexPath,
        benchmark_quality_claim: false,
        sizing_note: "Uses the E01 7-case contract seed only; dataset_sizing_research.md requires 35 pilot and 210 scale cases before benchmark-quality claims.",
      },
      model_configurations: MODEL_CONFIGS,
      shared_case_ids: cases.map((testCase) => testCase.id),
      prompt_schema_shared: true,
      artifact_boundary_shared_per_case: true,
      deterministic_validator: "run_project_learning_agent.validateModelSignalCandidates",
      live_run: liveRunStatus(),
      aggregate: {
        total_cases: cases.length,
        traces_recorded: summaries.length,
        accepted_signals_by_model: acceptedByModel,
        rejected_signals_by_model: rejectedByModel,
        boundary_violations_rejected: summaries
          .flatMap((summary) => Object.values(summary.rejected_signal_reasons).flat())
          .filter((error) =>
            error === "invalid_or_out_of_bound_citation" || error === "model_files_read_boundary_violation"
          ).length,
        readiness_or_truth_claims_rejected: summaries
          .flatMap((summary) => Object.values(summary.rejected_signal_reasons).flat())
          .filter((error) => error === "model_readiness_or_truth_decision").length,
        uncited_claims_rejected: summaries
          .flatMap((summary) => Object.values(summary.rejected_signal_reasons).flat())
          .filter((error) => error === "missing_citation").length,
      },
      cases: summaries,
      comparison: cases.map((testCase) => {
        const gpt52 = summaries.find((summary) =>
          summary.case_id === testCase.id && summary.model_label === "codex gpt-5.2 medium"
        );
        const gpt55 = summaries.find((summary) =>
          summary.case_id === testCase.id && summary.model_label === "codex gpt-5.5 low"
        );
        if (!gpt52 || !gpt55) throw new Error(`Missing paired summaries for ${testCase.id}`);
        return {
          case_id: testCase.id,
          shared_model_case: true,
          gpt_5_2_medium: {
            accepted: gpt52.accepted_signal_ids.length,
            rejected: gpt52.rejected_signal_ids.length,
            failure_modes: gpt52.failure_modes,
          },
          gpt_5_5_low: {
            accepted: gpt55.accepted_signal_ids.length,
            rejected: gpt55.rejected_signal_ids.length,
            failure_modes: gpt55.failure_modes,
          },
        };
      }),
    };

    const outputPath = resolve(options.reportPath ?? DEFAULT_REPORT);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return report;
  } finally {
    rmSync(runtimeHome, { recursive: true, force: true });
    if (previousRuntimeHome === undefined) delete process.env.SIBI_RUNTIME_HOME;
    else process.env.SIBI_RUNTIME_HOME = previousRuntimeHome;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const indexArg = process.argv.find((arg) => arg.startsWith("--index="))?.slice("--index=".length);
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="))?.slice("--report=".length);
  const report = runLlmRuntimeTraceEvals({ indexPath: indexArg, reportPath: reportArg });
  process.stdout.write(JSON.stringify({
    total_cases: report.aggregate.total_cases,
    traces_recorded: report.aggregate.traces_recorded,
    live_run_status: report.live_run.status,
  }, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT))) process.exitCode = 1;
}
