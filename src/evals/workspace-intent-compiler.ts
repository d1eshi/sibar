import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { generateWorkspacePlan as generateFixtureWorkspacePlan } from "../pedagogoai/workspace-intent/adapters/fixture.ts";
import type { ValidationIssue, WorkspacePlan } from "../pedagogoai/workspace-intent/contracts.ts";
import {
  WORKSPACE_INTENT_FIXTURE,
  WORKSPACE_PLAN_FIXTURE,
} from "../pedagogoai/workspace-intent/fixtures.ts";
import { parseModelOutput } from "../pedagogoai/workspace-intent/parse-model-output.ts";
import { validateWorkspacePlan } from "../pedagogoai/workspace-intent/validate.ts";

const WORKSPACE_INTENT_COMPILER_VALIDATION_ID = "VAL-EVAL-009-workspace-intent-compiler";
const DEFAULT_REPORT = "evals/workspace-plan-adapters/reports/VAL-EVAL-009-workspace-intent-compiler.json";
const EVAL_SPEC_PATH = "evals/workspace-plan-adapters/workspace-intent-compiler.eval.json";
export const WORKSPACE_INTENT_COMPILER_EVAL_GENERATED_AT = "2026-05-20T00:00:00.000Z";

type WorkspaceIntentEvalCaseClass =
  | "fixture_adapter"
  | "raw_model_json"
  | "raw_model_markdown"
  | "raw_model_prose"
  | "parse_rejection"
  | "schema_rejection"
  | "pedagogy_rejection";

type WorkspaceIntentEvalExpectation =
  | {
    valid: true;
    parse_error?: never;
    issue_codes?: never;
  }
  | {
    valid: false;
    parse_error: string;
    issue_codes?: never;
  }
  | {
    valid: false;
    parse_error?: never;
    issue_codes: string[];
  };

type WorkspaceIntentEvalCase = {
  id: string;
  title: string;
  case_class: WorkspaceIntentEvalCaseClass;
  raw_output?: string;
  use_fixture_adapter?: boolean;
  expectation: WorkspaceIntentEvalExpectation;
};

export type WorkspaceIntentCompilerCaseResult = {
  id: string;
  title: string;
  case_class: WorkspaceIntentEvalCaseClass;
  passed: boolean;
  observations: {
    model_called: false;
    adapter: "fixture" | "raw-output";
    parsed_json: boolean;
    validation_ok: boolean;
    parse_error: string | null;
    issue_codes: string[];
    warning_codes: string[];
  };
  mismatches: { field: string; expected: unknown; actual: unknown }[];
};

export type WorkspaceIntentCompilerEvalReport = {
  report_id: string;
  generated_at: string;
  validation: typeof WORKSPACE_INTENT_COMPILER_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  no_llm: true;
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    parse_rejection_cases: number;
    schema_rejection_cases: number;
    pedagogy_rejection_cases: number;
    valid_cases: number;
    total_mismatches: number;
  };
  cases: WorkspaceIntentCompilerCaseResult[];
};

export type WorkspaceIntentCompilerEvalOptions = {
  reportPath?: string;
  generatedAt?: string;
  reportId?: string;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function withoutRequiredFieldsPlan(): Record<string, unknown> {
  const plan = clone(WORKSPACE_PLAN_FIXTURE) as Record<string, unknown>;
  delete plan.title;
  delete plan.first_session;
  plan.extra_model_field = "hallucinated field";
  return plan;
}

function unboundedPlan(): WorkspacePlan {
  const plan = clone(WORKSPACE_PLAN_FIXTURE);
  plan.goal = "I want global mastery of the repo";
  plan.anti_overload_decision.bounded = false;
  plan.first_session.learning_node_ids = ["NODE-DOES-NOT-EXIST"];
  plan.learning_nodes[0].source_refs = ["SRC-DOES-NOT-EXIST"];
  plan.open_questions_for_user = [];
  return plan;
}

const EVAL_CASES: WorkspaceIntentEvalCase[] = [
  {
    id: "WI-001-FIXTURE-ADAPTER",
    title: "Fixture adapter produces a valid deterministic WorkspacePlan.",
    case_class: "fixture_adapter",
    use_fixture_adapter: true,
    expectation: { valid: true },
  },
  {
    id: "WI-002-RAW-JSON",
    title: "Plain JSON model output parses and validates.",
    case_class: "raw_model_json",
    raw_output: json(WORKSPACE_PLAN_FIXTURE),
    expectation: { valid: true },
  },
  {
    id: "WI-003-FENCED-JSON",
    title: "Markdown fenced JSON is extracted before validation.",
    case_class: "raw_model_markdown",
    raw_output: `Here is the plan.\n\n\`\`\`json\n${json(WORKSPACE_PLAN_FIXTURE)}\n\`\`\`\n`,
    expectation: { valid: true },
  },
  {
    id: "WI-004-PROSE-WRAPPED-JSON",
    title: "Prose before and after the JSON is tolerated by extraction.",
    case_class: "raw_model_prose",
    raw_output: `The generated plan follows:\n${json(WORKSPACE_PLAN_FIXTURE)}\nEnd of response.`,
    expectation: { valid: true },
  },
  {
    id: "WI-005-INVALID-JSON",
    title: "Invalid model output fails closed before validation.",
    case_class: "parse_rejection",
    raw_output: "I cannot produce JSON, but here is a summary.",
    expectation: { valid: false, parse_error: "model_output_invalid_or_unclosed_json" },
  },
  {
    id: "WI-006-SCHEMA-REJECTION",
    title: "Missing required fields and invented fields are rejected.",
    case_class: "schema_rejection",
    raw_output: json(withoutRequiredFieldsPlan()),
    expectation: {
      valid: false,
      issue_codes: [
        "pedagogy_first_session_empty",
        "schema_first_session_required",
        "schema_first_session_required_fields",
        "schema_required_fields",
        "schema_session_not_object",
        "schema_unknown_fields",
      ],
    },
  },
  {
    id: "WI-007-PEDAGOGY-REJECTION",
    title: "Unbounded whole-repo mastery claims and broken refs are rejected.",
    case_class: "pedagogy_rejection",
    raw_output: json(unboundedPlan()),
    expectation: {
      valid: false,
      issue_codes: [
        "pedagogy_forbidden_mastery_claim",
        "pedagogy_missing_reference",
        "pedagogy_unknown_questions",
        "pedagogy_unbounded",
      ],
    },
  },
];

function issueCodes(issues: ValidationIssue[]): string[] {
  return Array.from(new Set(issues.map((issue) => issue.code))).sort();
}

function runEvalCase(testCase: WorkspaceIntentEvalCase): WorkspaceIntentCompilerCaseResult {
  const mismatches: WorkspaceIntentCompilerCaseResult["mismatches"] = [];
  let plan: WorkspacePlan | null = null;
  let parseError: string | null = null;

  if (testCase.use_fixture_adapter) {
    plan = generateFixtureWorkspacePlan(WORKSPACE_INTENT_FIXTURE);
  } else {
    try {
      plan = parseModelOutput(testCase.raw_output ?? "");
    } catch (error) {
      parseError = error instanceof Error ? error.message : "model_output_parse_error";
    }
  }

  const validation = plan
    ? validateWorkspacePlan(plan, WORKSPACE_INTENT_FIXTURE)
    : { ok: false, issues: [], warnings: [], plan: null };
  const observedIssueCodes = issueCodes(validation.issues);
  const observedWarningCodes = issueCodes(validation.warnings);
  const passedValidPath = testCase.expectation.valid === true && parseError === null && validation.ok;
  const passedParseRejection = testCase.expectation.valid === false
    && testCase.expectation.parse_error !== undefined
    && parseError === testCase.expectation.parse_error;
  const expectedIssueCodes = testCase.expectation.issue_codes
    ? [...testCase.expectation.issue_codes].sort()
    : undefined;
  const passedValidationRejection = testCase.expectation.valid === false
    && expectedIssueCodes !== undefined
    && parseError === null
    && validation.ok === false
    && expectedIssueCodes.length === observedIssueCodes.length
    && expectedIssueCodes.every((code, index) => code === observedIssueCodes[index]);

  if (!(passedValidPath || passedParseRejection || passedValidationRejection)) {
    mismatches.push({
      field: "expectation",
      expected: testCase.expectation,
      actual: {
        parse_error: parseError,
        validation_ok: validation.ok,
        issue_codes: observedIssueCodes,
      },
    });
  }

  return {
    id: testCase.id,
    title: testCase.title,
    case_class: testCase.case_class,
    passed: mismatches.length === 0,
    observations: {
      model_called: false,
      adapter: testCase.use_fixture_adapter ? "fixture" : "raw-output",
      parsed_json: plan !== null,
      validation_ok: validation.ok,
      parse_error: parseError,
      issue_codes: observedIssueCodes,
      warning_codes: observedWarningCodes,
    },
    mismatches,
  };
}

export function runWorkspaceIntentCompilerEval(
  options: WorkspaceIntentCompilerEvalOptions = {},
): WorkspaceIntentCompilerEvalReport {
  const results = EVAL_CASES.map(runEvalCase);
  const generatedAt = options.generatedAt ?? WORKSPACE_INTENT_COMPILER_EVAL_GENERATED_AT;
  const reportId = options.reportId ?? `${WORKSPACE_INTENT_COMPILER_VALIDATION_ID}-${generatedAt}`;
  const report: WorkspaceIntentCompilerEvalReport = {
    report_id: reportId,
    generated_at: generatedAt,
    validation: WORKSPACE_INTENT_COMPILER_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    no_llm: true,
    aggregate: {
      total_cases: results.length,
      passed_cases: results.filter((result) => result.passed).length,
      failed_cases: results.filter((result) => !result.passed).length,
      parse_rejection_cases: results.filter((result) => result.case_class === "parse_rejection").length,
      schema_rejection_cases: results.filter((result) => result.case_class === "schema_rejection").length,
      pedagogy_rejection_cases: results.filter((result) => result.case_class === "pedagogy_rejection").length,
      valid_cases: results.filter((result) => result.observations.validation_ok).length,
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
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="))?.slice("--report=".length);
  const report = runWorkspaceIntentCompilerEval({ reportPath: reportArg });
  process.stdout.write(JSON.stringify(report.aggregate, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT)) || report.aggregate.failed_cases > 0) {
    process.exitCode = 1;
  }
}
