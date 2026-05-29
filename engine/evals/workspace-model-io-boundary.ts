import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  parseRustWorkspacePlan,
  runRustWorkspaceCompiler,
  type RustWorkspacePlan,
} from "../pedagogoai/workspace-compiler-runner.ts";
import { buildWorkspaceIntent } from "../pedagogoai/workspace-intent.ts";

const WORKSPACE_MODEL_IO_BOUNDARY_VALIDATION_ID = "VAL-EVAL-011-workspace-model-io-boundary";
const DEFAULT_REPORT = "evals/workspace-plan-adapters/reports/VAL-EVAL-011-workspace-model-io-boundary.json";
const EVAL_SPEC_PATH = "evals/workspace-plan-adapters/workspace-model-io-boundary.eval.json";
export const WORKSPACE_MODEL_IO_BOUNDARY_EVAL_GENERATED_AT = "2026-05-20T00:00:00.000Z";

type WorkspaceModelIOCaseClass =
  | "direct_json_valid"
  | "candidate_plan_envelope_valid"
  | "stdout_contaminated_valid"
  | "malformed_output_rejected"
  | "invalid_candidate_plan_rejected"
  | "unknown_adapter_rejected";

type WorkspaceModelIOCase = {
  id: string;
  title: string;
  case_class: WorkspaceModelIOCaseClass;
  expected: {
    accepted: boolean;
    objective?: string;
    error_includes?: string;
    adapter?: string;
    runner_status?: "completed" | "failed" | "blocked";
  };
  execute: () => {
    accepted: boolean;
    objective: string | null;
    error: string | null;
    adapter: string | null;
    runner_status: "completed" | "failed" | "blocked" | null;
    compiled_by: string | null;
  };
};

export type WorkspaceModelIOCaseResult = {
  id: string;
  title: string;
  case_class: WorkspaceModelIOCaseClass;
  passed: boolean;
  observations: ReturnType<WorkspaceModelIOCase["execute"]>;
  mismatches: { field: string; expected: unknown; actual: unknown }[];
};

export type WorkspaceModelIOBoundaryEvalReport = {
  report_id: string;
  generated_at: string;
  validation: typeof WORKSPACE_MODEL_IO_BOUNDARY_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  no_llm: true;
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    accepted_parse_cases: number;
    rejected_parse_cases: number;
    rejected_adapter_cases: number;
    total_mismatches: number;
  };
  cases: WorkspaceModelIOCaseResult[];
};

export type WorkspaceModelIOBoundaryEvalOptions = {
  reportPath?: string;
  generatedAt?: string;
  reportId?: string;
};

const VALID_PLAN: RustWorkspacePlan = {
  objective: "Normalize provider output into a bounded workspace plan.",
  bounded_objective: true,
  nodes: [{
    id: "node-provider-output",
    title: "Inspect provider output",
    prerequisites: [],
    concepts: ["adapter boundary", "json normalization"],
    source_links: [{ evidence_id: "evidence-provider-output" }],
    artifact_requirement: {
      id: "artifact-provider-output",
      path: "evals/workspace-plan-adapters/workspace-model-io-boundary.eval.json",
      requires: "Provider-neutral model output evidence",
    },
    is_advanced: false,
  }],
  next_actions: [{
    label: "Validate provider output",
    target_node_id: "node-provider-output",
    visible: true,
  }],
  artifact_requirements: [{
    id: "artifact-provider-output",
    path: "evals/workspace-plan-adapters/workspace-model-io-boundary.eval.json",
    requires: "Provider-neutral model output evidence",
  }],
  questions_if_blocked: [],
};

const SAMPLE_INPUT = buildWorkspaceIntent({
  userAmbition: "Validar salidas de modelos sin acoplarlas a un proveedor.",
  workspaceTitle: "Provider Neutral Workspace Model IO",
  tryingToBuildOrUnderstand: "Normalizar CandidatePlan antes de crear WorkspacePlan.",
  sourceInput: "evals/workspace-plan-adapters/workspace-model-io-boundary.eval.json",
  whyItMatters: "Evita fallback silencioso a fixtures cuando el adapter no existe.",
  alreadyKnow: "WorkspacePlan contract",
  notKnowYet: "Provider output boundary",
  desiredOutput: "auditable parser and adapter rejection report",
});

function parseOutput(rawOutput: string) {
  try {
    const plan = parseRustWorkspacePlan(rawOutput);
    return {
      accepted: true,
      objective: plan.objective,
      error: null,
      adapter: null,
      runner_status: null,
      compiled_by: null,
    };
  } catch (error) {
    return {
      accepted: false,
      objective: null,
      error: error instanceof Error ? error.message : "Unknown parse error.",
      adapter: null,
      runner_status: null,
      compiled_by: null,
    };
  }
}

function unknownAdapterOutput() {
  const result = runRustWorkspaceCompiler(SAMPLE_INPUT, {
    adapter: "future-provider" as never,
    fixturePath: "evals/workspace-plan-adapters/fixtures/rust_workspace_plan_fixture.json",
  });
  return {
    accepted: false,
    objective: result.rust_workspace_plan?.objective ?? null,
    error: result.runner.blocked_reason ?? null,
    adapter: result.runner.adapter,
    runner_status: result.runner.status,
    compiled_by: result.workspace_plan.compiled_by,
  };
}

const EVAL_CASES: WorkspaceModelIOCase[] = [
  {
    id: "WMIO-001-DIRECT-JSON-VALID",
    title: "Direct provider JSON parses as a valid candidate plan.",
    case_class: "direct_json_valid",
    expected: {
      accepted: true,
      objective: VALID_PLAN.objective,
    },
    execute: () => parseOutput(JSON.stringify(VALID_PLAN)),
  },
  {
    id: "WMIO-002-CANDIDATE-PLAN-ENVELOPE",
    title: "Provider envelope with candidate_plan parses to the nested plan.",
    case_class: "candidate_plan_envelope_valid",
    expected: {
      accepted: true,
      objective: VALID_PLAN.objective,
    },
    execute: () => parseOutput(JSON.stringify({ candidate_plan: VALID_PLAN })),
  },
  {
    id: "WMIO-003-STDOUT-CONTAMINATED",
    title: "Provider stdout with logs around JSON still extracts the candidate plan.",
    case_class: "stdout_contaminated_valid",
    expected: {
      accepted: true,
      objective: VALID_PLAN.objective,
    },
    execute: () => parseOutput([
      "provider log: starting workspace plan run",
      JSON.stringify({ candidate_plan: VALID_PLAN }),
      "provider log: completed workspace plan run",
    ].join("\n")),
  },
  {
    id: "WMIO-004-MALFORMED-OUTPUT",
    title: "Malformed provider output is rejected before plan projection.",
    case_class: "malformed_output_rejected",
    expected: {
      accepted: false,
      error_includes: "does not contain valid JSON",
    },
    execute: () => parseOutput("provider log\n{not valid json\n"),
  },
  {
    id: "WMIO-005-INVALID-CANDIDATE-PLAN",
    title: "Invalid candidate_plan envelope is rejected before WorkspacePlan state.",
    case_class: "invalid_candidate_plan_rejected",
    expected: {
      accepted: false,
      error_includes: "not a valid WorkspacePlan",
    },
    execute: () => parseOutput(JSON.stringify({ candidate_plan: { objective: "missing required fields" } })),
  },
  {
    id: "WMIO-006-UNKNOWN-ADAPTER",
    title: "Unknown adapter is rejected explicitly without falling back to fixture.",
    case_class: "unknown_adapter_rejected",
    expected: {
      accepted: false,
      adapter: "future-provider",
      runner_status: "failed",
      error_includes: "Unknown workspace compiler adapter",
    },
    execute: unknownAdapterOutput,
  },
];

function compare(
  field: string,
  actual: unknown,
  expected: unknown,
  mismatches: WorkspaceModelIOCaseResult["mismatches"],
) {
  if (actual !== expected) {
    mismatches.push({ field, expected, actual });
  }
}

function runCase(testCase: WorkspaceModelIOCase): WorkspaceModelIOCaseResult {
  const observations = testCase.execute();
  const mismatches: WorkspaceModelIOCaseResult["mismatches"] = [];
  compare("accepted", observations.accepted, testCase.expected.accepted, mismatches);
  if (testCase.expected.objective) {
    compare("objective", observations.objective, testCase.expected.objective, mismatches);
  }
  if (testCase.expected.adapter) {
    compare("adapter", observations.adapter, testCase.expected.adapter, mismatches);
  }
  if (testCase.expected.runner_status) {
    compare("runner_status", observations.runner_status, testCase.expected.runner_status, mismatches);
  }
  if (
    testCase.expected.error_includes
    && !String(observations.error ?? "").includes(testCase.expected.error_includes)
  ) {
    mismatches.push({
      field: "error",
      expected: `includes ${testCase.expected.error_includes}`,
      actual: observations.error,
    });
  }

  return {
    id: testCase.id,
    title: testCase.title,
    case_class: testCase.case_class,
    passed: mismatches.length === 0,
    observations,
    mismatches,
  };
}

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);
  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[spacedIndex + 1];
  return undefined;
}

export function runWorkspaceModelIOBoundaryEval(
  options: WorkspaceModelIOBoundaryEvalOptions = {},
): WorkspaceModelIOBoundaryEvalReport {
  const results = EVAL_CASES.map(runCase);
  const generatedAt = options.generatedAt ?? WORKSPACE_MODEL_IO_BOUNDARY_EVAL_GENERATED_AT;
  const reportId = options.reportId ?? `${WORKSPACE_MODEL_IO_BOUNDARY_VALIDATION_ID}-${generatedAt}`;
  const report: WorkspaceModelIOBoundaryEvalReport = {
    report_id: reportId,
    generated_at: generatedAt,
    validation: WORKSPACE_MODEL_IO_BOUNDARY_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    no_llm: true,
    aggregate: {
      total_cases: results.length,
      passed_cases: results.filter((result) => result.passed).length,
      failed_cases: results.filter((result) => !result.passed).length,
      accepted_parse_cases: results.filter((result) => result.observations.accepted).length,
      rejected_parse_cases: results.filter((result) =>
        !result.observations.accepted && result.observations.runner_status === null
      ).length,
      rejected_adapter_cases: results.filter((result) =>
        result.case_class === "unknown_adapter_rejected" && result.observations.runner_status === "failed"
      ).length,
      total_mismatches: results.reduce((sum, result) => sum + result.mismatches.length, 0),
    },
    cases: results,
  };

  const outputPath = resolve(options.reportPath ?? DEFAULT_REPORT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportArg = getFlagValue(process.argv, "report");
  const report = runWorkspaceModelIOBoundaryEval({ reportPath: reportArg });
  process.stdout.write(JSON.stringify(report.aggregate, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT)) || report.aggregate.failed_cases > 0) {
    process.exitCode = 1;
  }
}
