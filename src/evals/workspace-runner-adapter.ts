import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  runRustWorkspaceCompiler,
  type WorkspaceCompilerRunnerAdapter,
  type WorkspaceCompilerRunnerResult,
} from "../pedagogoai/workspace-compiler-runner.ts";
import { buildWorkspaceIntent, type WorkspaceIntent } from "../pedagogoai/workspace-intent.ts";

const WORKSPACE_RUNNER_ADAPTER_VALIDATION_ID = "VAL-EVAL-010-workspace-runner-adapter";
const DEFAULT_REPORT = "evals/workspace-plan-adapters/reports/VAL-EVAL-010-workspace-runner-adapter.json";
const EVAL_SPEC_PATH = "evals/workspace-plan-adapters/workspace-runner-adapter.eval.json";
const RUST_FIXTURE_PATH = "evals/workspace-plan-adapters/fixtures/rust_workspace_plan_fixture.json";
export const WORKSPACE_RUNNER_ADAPTER_EVAL_GENERATED_AT = "2026-05-20T00:00:00.000Z";

type WorkspaceRunnerAdapterCaseClass =
  | "rust_fixture_completed"
  | "rust_fixture_missing"
  | "codex_exec_blocked";

type WorkspaceRunnerAdapterExpectation = {
  runner_status: "completed" | "failed" | "blocked";
  adapter: WorkspaceCompilerRunnerAdapter;
  validation_valid: boolean;
  compiled_by: "llm" | "deterministic-builder";
  rust_plan_present: boolean;
  command_includes: string[];
  blocked_reason_includes?: string;
};

type WorkspaceRunnerAdapterEvalCase = {
  id: string;
  title: string;
  case_class: WorkspaceRunnerAdapterCaseClass;
  adapter: WorkspaceCompilerRunnerAdapter;
  fixture: "valid" | "missing" | null;
  run_codex: boolean;
  expectation: WorkspaceRunnerAdapterExpectation;
};

export type WorkspaceRunnerAdapterCaseResult = {
  id: string;
  title: string;
  case_class: WorkspaceRunnerAdapterCaseClass;
  passed: boolean;
  observations: {
    adapter: WorkspaceCompilerRunnerAdapter;
    runner_status: "completed" | "failed" | "blocked";
    command: string;
    exit_code: number | null;
    blocked_reason: string | null;
    rust_plan_present: boolean;
    rust_intent_evidence_count: number;
    validation_valid: boolean;
    compiled_by: string;
  };
  mismatches: { field: string; expected: unknown; actual: unknown }[];
};

export type WorkspaceRunnerAdapterEvalReport = {
  report_id: string;
  generated_at: string;
  validation: typeof WORKSPACE_RUNNER_ADAPTER_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  no_llm: true;
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    completed_runner_cases: number;
    blocked_runner_cases: number;
    failed_runner_cases: number;
    rust_fixture_cases: number;
    codex_exec_cases: number;
    total_mismatches: number;
  };
  cases: WorkspaceRunnerAdapterCaseResult[];
};

export type WorkspaceRunnerAdapterEvalOptions = {
  reportPath?: string;
  generatedAt?: string;
  reportId?: string;
};

const SAMPLE_INPUT = {
  userAmbition: "Entender de forma acotada el flujo de arranque del runtime.",
  workspaceTitle: "Runtime Compiler Eval",
  tryingToBuildOrUnderstand: "Entender cómo arranca la ejecución de una petición.",
  sourceInput: "src/runtime.ts",
  whyItMatters: "Quiero practicar sin inventar contexto.",
  alreadyKnow: "TypeScript, CLI commands",
  notKnowYet: "runtime boundaries, compiler runner behavior",
  desiredOutput: "bounded session plan with evidence requirements",
};

const EVAL_CASES: WorkspaceRunnerAdapterEvalCase[] = [
  {
    id: "WRA-001-RUST-FIXTURE-COMPLETED",
    title: "Rust fixture adapter executes and maps a compiler plan into Pedagogo WorkspacePlan.",
    case_class: "rust_fixture_completed",
    adapter: "fixture",
    fixture: "valid",
    run_codex: false,
    expectation: {
      runner_status: "completed",
      adapter: "fixture",
      validation_valid: true,
      compiled_by: "llm",
      rust_plan_present: true,
      command_includes: ["sibi-workspace-compiler", "--adapter", "fixture"],
    },
  },
  {
    id: "WRA-002-RUST-FIXTURE-MISSING",
    title: "Missing Rust fixture path fails as an auditable adapter result with deterministic fallback.",
    case_class: "rust_fixture_missing",
    adapter: "fixture",
    fixture: "missing",
    run_codex: false,
    expectation: {
      runner_status: "failed",
      adapter: "fixture",
      validation_valid: true,
      compiled_by: "deterministic-builder",
      rust_plan_present: false,
      command_includes: ["sibi-workspace-compiler", "--adapter", "fixture"],
      blocked_reason_includes: "fixture adapter requires --fixture path",
    },
  },
  {
    id: "WRA-003-CODEX-EXEC-BLOCKED",
    title: "Codex runner adapter exposes command metadata but stays disabled for offline evals.",
    case_class: "codex_exec_blocked",
    adapter: "codex-exec",
    fixture: null,
    run_codex: false,
    expectation: {
      runner_status: "blocked",
      adapter: "codex-exec",
      validation_valid: true,
      compiled_by: "deterministic-builder",
      rust_plan_present: false,
      command_includes: ["sibi-workspace-compiler", "--adapter", "codex-exec"],
      blocked_reason_includes: "codex-exec execution is disabled",
    },
  },
];

function buildSampleWorkspaceIntent(): WorkspaceIntent {
  return buildWorkspaceIntent(SAMPLE_INPUT);
}

function runCase(testCase: WorkspaceRunnerAdapterEvalCase): WorkspaceRunnerAdapterCaseResult {
  const workspaceIntent = buildSampleWorkspaceIntent();
  const mismatches: WorkspaceRunnerAdapterCaseResult["mismatches"] = [];

  const result = runRustWorkspaceCompiler(workspaceIntent, {
    adapter: testCase.adapter,
    fixturePath: testCase.fixture === "valid" ? RUST_FIXTURE_PATH : undefined,
    runCodex: testCase.run_codex,
  });

  const observations = observationsFromResult(result);
  compare("runner_status", observations.runner_status, testCase.expectation.runner_status, mismatches);
  compare("adapter", observations.adapter, testCase.expectation.adapter, mismatches);
  compare("validation_valid", observations.validation_valid, testCase.expectation.validation_valid, mismatches);
  compare("compiled_by", observations.compiled_by, testCase.expectation.compiled_by, mismatches);
  compare("rust_plan_present", observations.rust_plan_present, testCase.expectation.rust_plan_present, mismatches);

  for (const expectedCommandPart of testCase.expectation.command_includes) {
    if (!observations.command.includes(expectedCommandPart)) {
      mismatches.push({
        field: "command",
        expected: `includes ${expectedCommandPart}`,
        actual: observations.command,
      });
    }
  }

  if (
    testCase.expectation.blocked_reason_includes
    && !String(observations.blocked_reason ?? "").includes(testCase.expectation.blocked_reason_includes)
  ) {
    mismatches.push({
      field: "blocked_reason",
      expected: `includes ${testCase.expectation.blocked_reason_includes}`,
      actual: observations.blocked_reason,
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

function toRepoStableCommand(command: string): string {
  const repoRoot = resolve(process.cwd());
  return command
    .split(`${repoRoot}/`).join("")
    .split(repoRoot).join(".");
}

function observationsFromResult(result: WorkspaceCompilerRunnerResult): WorkspaceRunnerAdapterCaseResult["observations"] {
  return {
    adapter: result.runner.adapter,
    runner_status: result.runner.status,
    command: toRepoStableCommand(result.runner.command),
    exit_code: result.runner.exit_code ?? null,
    blocked_reason: result.runner.blocked_reason ?? null,
    rust_plan_present: result.rust_workspace_plan !== null,
    rust_intent_evidence_count: result.rust_intent.source_bundle.evidence.length,
    validation_valid: result.validation.valid,
    compiled_by: result.workspace_plan.compiled_by,
  };
}

function compare(
  field: string,
  actual: unknown,
  expected: unknown,
  mismatches: WorkspaceRunnerAdapterCaseResult["mismatches"],
) {
  if (actual !== expected) {
    mismatches.push({ field, expected, actual });
  }
}

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);
  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[spacedIndex + 1];
  return undefined;
}

export function runWorkspaceRunnerAdapterEval(
  options: WorkspaceRunnerAdapterEvalOptions = {},
): WorkspaceRunnerAdapterEvalReport {
  const results = EVAL_CASES.map(runCase);
  const generatedAt = options.generatedAt ?? WORKSPACE_RUNNER_ADAPTER_EVAL_GENERATED_AT;
  const reportId = options.reportId ?? `${WORKSPACE_RUNNER_ADAPTER_VALIDATION_ID}-${generatedAt}`;
  const report: WorkspaceRunnerAdapterEvalReport = {
    report_id: reportId,
    generated_at: generatedAt,
    validation: WORKSPACE_RUNNER_ADAPTER_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    no_llm: true,
    aggregate: {
      total_cases: results.length,
      passed_cases: results.filter((result) => result.passed).length,
      failed_cases: results.filter((result) => !result.passed).length,
      completed_runner_cases: results.filter((result) => result.observations.runner_status === "completed").length,
      blocked_runner_cases: results.filter((result) => result.observations.runner_status === "blocked").length,
      failed_runner_cases: results.filter((result) => result.observations.runner_status === "failed").length,
      rust_fixture_cases: results.filter((result) => result.observations.adapter === "fixture").length,
      codex_exec_cases: results.filter((result) => result.observations.adapter === "codex-exec").length,
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
  const report = runWorkspaceRunnerAdapterEval({ reportPath: reportArg });
  process.stdout.write(JSON.stringify(report.aggregate, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT)) || report.aggregate.failed_cases > 0) {
    process.exitCode = 1;
  }
}
