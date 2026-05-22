import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { loadEvalDataset } from "./deterministic-pedagogy/dataset.ts";
import type { EvalCase } from "./deterministic-pedagogy/types.ts";

const PEDAGOGY_COVERAGE_VALIDATION_ID = "VAL-EVAL-012-pedagogy-coverage";
const DEFAULT_INDEX = "evals/pedagogy-layers/dataset/index.json";
const DEFAULT_REPORT = "evals/pedagogy-layers/reports/VAL-EVAL-012-pedagogy-coverage.json";
const EVAL_SPEC_PATH = "evals/pedagogy-layers/eval-suite.json";
export const PEDAGOGY_COVERAGE_EVAL_GENERATED_AT = "2026-05-20T00:00:00.000Z";

function toRepoRelative(filePath: string): string {
  const rel = relative(process.cwd(), resolve(filePath));
  return rel || ".";
}

type CoverageDimension =
  | "layers"
  | "answer_classes"
  | "gap_labels"
  | "operations"
  | "evidence_conditions"
  | "loop_stages";

type CoverageBucket = {
  dimension: CoverageDimension;
  required: string[];
  covered: string[];
  missing: string[];
  coverage_ratio: number;
};

export type PedagogyCoverageReport = {
  report_id: string;
  generated_at: string;
  validation: typeof PEDAGOGY_COVERAGE_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  dataset: {
    id: string;
    version: string;
    index_path: string;
  };
  no_llm: true;
  coverage_passed: boolean;
  policy: {
    fail_closed_dimensions: CoverageDimension[];
    note: string;
  };
  aggregate: {
    total_cases: number;
    dimensions: number;
    dimensions_with_gaps: number;
    total_missing: number;
  };
  dimensions: CoverageBucket[];
  gaps: {
    dimension: CoverageDimension;
    label: string;
    severity: "report_only" | "fail_closed";
  }[];
  cases: {
    id: string;
    case_class: string;
    layers: string[];
    operations: string[];
    evidence_conditions: string[];
    loop_stages: string[];
  }[];
};

export type PedagogyCoverageOptions = {
  indexPath?: string;
  reportPath?: string;
  generatedAt?: string;
  reportId?: string;
  allowCoverageGaps?: boolean;
};

const REQUIRED: Record<CoverageDimension, string[]> = {
  layers: ["L1", "L2", "L3", "L4", "L5"],
  answer_classes: [
    "boundary_violation",
    "correct_answer",
    "declared_uncertainty",
    "missing_evidence",
    "overconfident_llm_output",
    "partial_answer",
    "wrong_misconception",
  ],
  gap_labels: [
    "no_gap",
    "gap_important",
    "gap_critical",
    "gap_confidence_medium",
    "gap_confidence_high",
    "observed_L1_gap",
    "observed_L2_gap",
    "observed_L3_gap",
    "observed_L4_gap",
    "observed_L5_gap",
  ],
  operations: [
    "no_repair_challenge",
    "boundary_explanation",
    "explain_the_flow_without_looking",
    "risk_analysis",
    "trace_path_across_files",
    "write_or_adjust_a_test",
  ],
  evidence_conditions: [
    "required_evidence",
    "forbidden_evidence",
    "no_forbidden_evidence",
    "boundary_rejection",
    "inside_boundary_acceptance",
    "readiness_requires_evidence",
    "model_fixture_signal",
    "missing_or_forbidden_model_citation",
  ],
  loop_stages: [
    "answer_capture",
    "layer_classification",
    "gap_detection",
    "repair_generation",
    "readiness_report",
    "memory_persistence",
    "boundary_enforcement",
    "model_fixture_validation",
  ],
};

const DEFAULT_FAIL_CLOSED_DIMENSIONS: CoverageDimension[] = [
  "layers",
  "operations",
  "gap_labels",
  "evidence_conditions",
  "loop_stages",
  "answer_classes",
];

function add(values: Set<string>, value: string | null | undefined): void {
  if (value) values.add(value);
}

function normalizeOperation(value: string | undefined): string | null {
  if (!value) return null;
  if (value === "trace_a_path_across_files") return "trace_path_across_files";
  return value;
}

function labelsForCase(testCase: EvalCase): PedagogyCoverageReport["cases"][number] {
  const layers = new Set<string>();
  add(layers, `L${testCase.expected_layer.level}`);
  add(layers, `L${testCase.concept_under_test.layer_target}`);
  if (testCase.expected_gap?.observed_layer) {
    add(layers, `L${testCase.expected_gap.observed_layer}`);
  }

  const operations = new Set<string>();
  if (testCase.gap_readiness_expectations.create_challenge) {
    add(operations, normalizeOperation(testCase.expected_challenge.challenge_type));
  } else {
    add(operations, "no_repair_challenge");
  }

  const evidenceConditions = new Set<string>();
  if (testCase.required_evidence.length > 0) add(evidenceConditions, "required_evidence");
  if (testCase.forbidden_evidence.length > 0) add(evidenceConditions, "forbidden_evidence");
  if (testCase.forbidden_evidence.length === 0) add(evidenceConditions, "no_forbidden_evidence");
  if (testCase.boundary_expectations.reject_forbidden_evidence) add(evidenceConditions, "boundary_rejection");
  if (testCase.boundary_expectations.accepted_evidence_must_be_inside_boundary) {
    add(evidenceConditions, "inside_boundary_acceptance");
  }
  if (testCase.expected_readiness.must_cite_evidence) add(evidenceConditions, "readiness_requires_evidence");
  if (testCase.llm_fixture_response) {
    add(evidenceConditions, "model_fixture_signal");
    add(evidenceConditions, "missing_or_forbidden_model_citation");
  }

  const loopStages = new Set<string>([
    "answer_capture",
    "layer_classification",
    "readiness_report",
    "boundary_enforcement",
  ]);
  if (testCase.gap_readiness_expectations.create_gap) add(loopStages, "gap_detection");
  if (testCase.gap_readiness_expectations.create_challenge) add(loopStages, "repair_generation");
  if (
    testCase.gap_readiness_expectations.persist_declared_uncertainty
    || testCase.expected_misconception?.should_create
  ) {
    add(loopStages, "memory_persistence");
  }
  if (testCase.llm_fixture_response) add(loopStages, "model_fixture_validation");

  return {
    id: testCase.id,
    case_class: testCase.case_class,
    layers: Array.from(layers).sort(),
    operations: Array.from(operations).sort(),
    evidence_conditions: Array.from(evidenceConditions).sort(),
    loop_stages: Array.from(loopStages).sort(),
  };
}

function coverageBucket(dimension: CoverageDimension, coveredValues: Iterable<string>): CoverageBucket {
  const required = REQUIRED[dimension];
  const covered = Array.from(new Set(coveredValues)).sort();
  const coveredRequired = required.filter((label) => covered.includes(label));
  const missing = required.filter((label) => !covered.includes(label));
  return {
    dimension,
    required,
    covered,
    missing,
    coverage_ratio: required.length === 0 ? 1 : coveredRequired.length / required.length,
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

export function runPedagogyCoverageEval(options: PedagogyCoverageOptions = {}): PedagogyCoverageReport {
  const indexPath = resolve(options.indexPath ?? DEFAULT_INDEX);
  const { index, cases } = loadEvalDataset(indexPath);
  const caseCoverage = cases.map(labelsForCase);
  const failClosedDimensions = options.allowCoverageGaps ? [] : DEFAULT_FAIL_CLOSED_DIMENSIONS;

  const gapLabels = new Set<string>();
  for (const testCase of cases) {
    if (!testCase.expected_gap?.should_create) {
      add(gapLabels, "no_gap");
      continue;
    }
    add(gapLabels, `gap_${testCase.expected_gap.severity}`);
    add(gapLabels, `gap_confidence_${testCase.expected_gap.confidence}`);
    add(gapLabels, `observed_L${testCase.expected_gap.observed_layer}_gap`);
  }

  const dimensions = [
    coverageBucket("layers", caseCoverage.flatMap((entry) => entry.layers)),
    coverageBucket("answer_classes", cases.map((entry) => entry.case_class)),
    coverageBucket("gap_labels", gapLabels),
    coverageBucket("operations", caseCoverage.flatMap((entry) => entry.operations)),
    coverageBucket("evidence_conditions", caseCoverage.flatMap((entry) => entry.evidence_conditions)),
    coverageBucket("loop_stages", caseCoverage.flatMap((entry) => entry.loop_stages)),
  ];
  const gaps = dimensions.flatMap((dimension) =>
    dimension.missing.map((label) => ({
      dimension: dimension.dimension,
      label,
      severity: failClosedDimensions.includes(dimension.dimension) ? "fail_closed" as const : "report_only" as const,
    }))
  );
  const coveragePassed = gaps.every((gap) => gap.severity !== "fail_closed");
  const generatedAt = options.generatedAt ?? PEDAGOGY_COVERAGE_EVAL_GENERATED_AT;
  const reportId = options.reportId ?? `${PEDAGOGY_COVERAGE_VALIDATION_ID}-${generatedAt}`;
  const report: PedagogyCoverageReport = {
    report_id: reportId,
    generated_at: generatedAt,
    validation: PEDAGOGY_COVERAGE_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    dataset: {
      id: index.dataset_id,
      version: index.version,
      index_path: toRepoRelative(indexPath),
    },
    no_llm: true,
    coverage_passed: coveragePassed,
    policy: {
      fail_closed_dimensions: failClosedDimensions,
      note: options.allowCoverageGaps
        ? "Explicit --allow-coverage-gaps override enabled; missing semantic coverage is reported without fail-closed enforcement."
        : "Missing semantic coverage in critical dimensions is fail-closed by default; use --allow-coverage-gaps for exploration/reporting.",
    },
    aggregate: {
      total_cases: cases.length,
      dimensions: dimensions.length,
      dimensions_with_gaps: dimensions.filter((dimension) => dimension.missing.length > 0).length,
      total_missing: gaps.length,
    },
    dimensions,
    gaps,
    cases: caseCoverage,
  };

  const outputPath = resolve(options.reportPath ?? DEFAULT_REPORT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const indexArg = getFlagValue(process.argv, "index");
  const reportArg = getFlagValue(process.argv, "report");
  const allowCoverageGaps = process.argv.includes("--allow-coverage-gaps");
  const report = runPedagogyCoverageEval({ indexPath: indexArg, reportPath: reportArg, allowCoverageGaps });
  process.stdout.write(JSON.stringify({
    coverage_passed: report.coverage_passed,
    aggregate: report.aggregate,
    gaps: report.gaps,
  }, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT)) || !report.coverage_passed) {
    process.exitCode = 1;
  }
}
