import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { runSelfhostPilotEval, type SelfhostPilotEvalReport } from "./selfhost-pilot.ts";

const DEFAULT_MANIFEST_PATH = "sibar.selfhost.manifest.json";
const DEFAULT_GOLD_CASE_INDEX = "docs/specs/selfhost/pilot/gold-cases/index.json";
const BENCHMARK_VALIDATION_ID = "VAL-EVAL-007-selfhost-benchmark";

const BENCHMARK_ANSWER_CLASSES = [
  "correct_grounded",
  "correct_uncited",
  "partial",
  "wrong_responsibility",
  "wrong_flow",
  "overconfident_wrong",
  "declared_uncertainty",
  "design_induced_confusion",
] as const;

const GAP_LABELS = [
  "surface_gap",
  "flow_gap",
  "boundary_gap",
  "responsibility_gap",
  "evidence_gap",
  "causal_gap",
  "test_oracle_gap",
  "product_gap",
  "false_confidence_gap",
  "design_induced_gap",
] as const;

type BenchmarkAnswerClass = (typeof BENCHMARK_ANSWER_CLASSES)[number];
type GapLabel = (typeof GAP_LABELS)[number];
type EvidenceQuality = 0 | 1 | 2 | 3;

type RawCaseIndex = {
  cases?: unknown;
};

type RawCaseEntry = {
  path?: unknown;
  answer_class?: unknown;
  id?: unknown;
  concept_id?: unknown;
};

type RawCasePayload = {
  id?: unknown;
  concept_id?: unknown;
  answer_class?: unknown;
  expected_gap_present?: unknown;
  expected_gap_type?: unknown;
  acceptable_issue_candidate_type?: unknown;
  expected_readiness?: unknown;
};

export type SelfhostBenchmarkMismatch = {
  code: string;
  location: string;
  message: string;
  details?: unknown;
};

export type SelfhostBenchmarkCaseResult = {
  case_id: string;
  concept_id: string;
  answer_class: string;
  observed_gap_present: boolean;
  observed_gap_type: string | null;
  observed_issue_candidate_type: string;
  observed_repair_task_present: boolean;
  observed_reevaluation_prompt_present: boolean;
  observed_readiness: string;
  evidence_quality_score: EvidenceQuality;
  passed: boolean;
  mismatches: SelfhostBenchmarkMismatch[];
  expected_gap_present: boolean | null;
  expected_gap_type: string | null;
  expected_issue_candidate_type: string | null;
  expected_readiness: string | null;
};

type AggregateGapStats = {
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  total_mismatches: number;
  gap_precision: number;
  gap_recall: number;
  gap_type_accuracy: number;
  evidence_quality_average: number;
  false_confidence_detection_count: number;
  false_confidence_expected_count: number;
  false_confidence_detection_recall: number;
  design_issue_detection_count: number;
  design_issue_expected_count: number;
  design_issue_detection_recall: number;
};

export type SelfhostBenchmarkAggregate = AggregateGapStats & {
  pilot_validation_mismatch_count: number;
  benchmark_load_mismatch_count: number;
};

export type SelfhostBenchmarkReport = {
  generated_at: string;
  validation: string;
  manifest_path: string;
  gold_case_index_path: string;
  pilot_validation: SelfhostPilotEvalReport;
  cases: SelfhostBenchmarkCaseResult[];
  aggregate: SelfhostBenchmarkAggregate;
};

type SelfhostBenchmarkOptions = {
  manifestPath?: string;
  indexPath?: string;
  reportPath?: string;
};

type GoldCasePayload = {
  id: string;
  concept_id: string;
  answer_class: BenchmarkAnswerClass;
  expected_gap_present: boolean | null;
  expected_gap_type: string | null;
  acceptable_issue_candidate_type: string | null;
  expected_readiness: string | null;
};

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) {
    return equalsValue.slice(equalsPrefix.length);
  }

  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) {
    return argv[spacedIndex + 1];
  }

  return undefined;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function isBenchmarkAnswerClass(value: string | null): value is BenchmarkAnswerClass {
  return value !== null && (BENCHMARK_ANSWER_CLASSES as readonly string[]).includes(value);
}

function isGapLabel(value: string | null): value is GapLabel {
  return value !== null && (GAP_LABELS as readonly string[]).includes(value);
}

function calculateRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function caseToPayload(index: number, casePayload: unknown): GoldCasePayload {
  const payload = asObject(casePayload);
  const id = asString(payload?.id) ?? `case-${index + 1}`;
  const conceptId = asString(payload?.concept_id) ?? "";
  const expectedGapPresent = asBoolean(payload?.expected_gap_present);
  const expectedGapType = payload?.expected_gap_type !== undefined && payload?.expected_gap_type !== null
    ? asString(payload.expected_gap_type) ?? null
    : null;
  const acceptableIssueCandidateType = asString(payload?.acceptable_issue_candidate_type) ?? null;
  const expectedReadiness = asString(payload?.expected_readiness) ?? null;
  const answerClassValue = asString(payload?.answer_class);

  return {
    id,
    concept_id: conceptId,
    answer_class: isBenchmarkAnswerClass(answerClassValue) ? answerClassValue : "declared_uncertainty",
    expected_gap_present: expectedGapPresent,
    expected_gap_type: expectedGapType,
    acceptable_issue_candidate_type: acceptableIssueCandidateType,
    expected_readiness: expectedReadiness,
  };
}

function deterministicObservation(payload: GoldCasePayload): GoldCasePayload & {
  observed_gap_present: boolean;
  observed_gap_type: string | null;
  observed_issue_candidate_type: string;
  observed_repair_task_present: boolean;
  observed_reevaluation_prompt_present: boolean;
  observed_readiness: string;
  evidence_quality_score: EvidenceQuality;
} {
  const expectedReadiness = payload.expected_readiness ?? "not ready yet";
  switch (payload.answer_class) {
    case "correct_grounded":
      return {
        ...payload,
        observed_gap_present: false,
        observed_gap_type: null,
        observed_issue_candidate_type: "none",
        observed_repair_task_present: false,
        observed_reevaluation_prompt_present: false,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 3,
      };
    case "correct_uncited":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: "evidence_gap",
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 1,
      };
    case "partial":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: asString(payload.expected_gap_type) ?? "flow_gap",
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 2,
      };
    case "wrong_responsibility":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: "responsibility_gap",
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 1,
      };
    case "wrong_flow":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: "flow_gap",
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 1,
      };
    case "overconfident_wrong":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: "false_confidence_gap",
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 1,
      };
    case "declared_uncertainty":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: asString(payload.expected_gap_type) ?? "surface_gap",
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        // Declared uncertainty is detectable but weakly evidenced in this slice (chosen as score 1).
        evidence_quality_score: 1,
      };
    case "design_induced_confusion":
      return {
        ...payload,
        observed_gap_present: true,
        observed_gap_type: "design_induced_gap",
        observed_issue_candidate_type: "DesignIssue",
        observed_repair_task_present: true,
        observed_reevaluation_prompt_present: true,
        observed_readiness: expectedReadiness,
        evidence_quality_score: 2,
      };
  }
}

function evaluateObservedCase(rawCasePayload: unknown, index: number): SelfhostBenchmarkCaseResult {
  const payload = caseToPayload(index, rawCasePayload);
  const mismatchesForCase: SelfhostBenchmarkMismatch[] = [];

  if (!isBenchmarkAnswerClass(asString(asObject(rawCasePayload)?.answer_class))) {
    mismatchesForCase.push({
      code: "case_answer_class_invalid",
      location: `cases[${index}].answer_class`,
      message: "case answer_class must be one of the eight benchmark classes",
    });
    payload.answer_class = "declared_uncertainty";
  }

  if (asString(asObject(rawCasePayload)?.concept_id) === null) {
    mismatchesForCase.push({
      code: "case_concept_id_missing",
      location: `cases[${index}].concept_id`,
      message: "case concept_id must be present",
    });
  }

  if (typeof payload.expected_gap_present !== "boolean") {
    mismatchesForCase.push({
      code: "case_expected_gap_present_invalid",
      location: `cases[${index}].expected_gap_present`,
      message: "case expected_gap_present must be boolean",
      details: { value: asObject(rawCasePayload)?.expected_gap_present },
    });
  }

  const gapTypeValue = asString(asObject(rawCasePayload)?.expected_gap_type);
  if (payload.answer_class !== "correct_grounded") {
    if (!isGapLabel(gapTypeValue)) {
      mismatchesForCase.push({
        code: "case_expected_gap_type_invalid",
        location: `cases[${index}].expected_gap_type`,
        message: "non-grounded cases require a valid expected_gap_type",
        details: { value: asObject(rawCasePayload)?.expected_gap_type },
      });
    }
  } else if (gapTypeValue !== null) {
    mismatchesForCase.push({
      code: "case_expected_gap_type_should_be_null",
      location: `cases[${index}].expected_gap_type`,
      message: "correct_grounded cases must set expected_gap_type to null",
      details: { value: gapTypeValue },
    });
  }

  const observed = deterministicObservation(payload);
  const { expected_gap_present } = payload;

  if (typeof expected_gap_present === "boolean") {
    if (observed.observed_gap_present !== expected_gap_present) {
      mismatchesForCase.push({
        code: "mismatch_gap_present",
        location: `cases[${index}].expected_gap_present`,
        message: "observed gap presence does not match expected gap presence",
        details: {
          expected: expected_gap_present,
          observed: observed.observed_gap_present,
        },
      });
    }

    const expectedRepairPresent = expected_gap_present;
    const expectedReevalPresent = expected_gap_present;
    if (observed.observed_repair_task_present !== expectedRepairPresent) {
      mismatchesForCase.push({
        code: "mismatch_repair_task_present",
        location: `cases[${index}].repair_task_present`,
        message: "repair task presence does not match expected",
        details: {
          expected: expectedRepairPresent,
          observed: observed.observed_repair_task_present,
        },
      });
    }
    if (observed.observed_reevaluation_prompt_present !== expectedReevalPresent) {
      mismatchesForCase.push({
        code: "mismatch_reevaluation_prompt_present",
        location: `cases[${index}].reevaluation_prompt_present`,
        message: "reevaluation prompt presence does not match expected",
        details: {
          expected: expectedReevalPresent,
          observed: observed.observed_reevaluation_prompt_present,
        },
      });
    }
  }

  const expectedReadiness = asString(asObject(rawCasePayload)?.expected_readiness);
  const expectedIssueType = asString(asObject(rawCasePayload)?.acceptable_issue_candidate_type);
  const hasExpectedReadinessField = Object.prototype.hasOwnProperty.call(asObject(rawCasePayload) ?? {}, "expected_readiness");
  const hasExpectedIssueField = Object.prototype.hasOwnProperty.call(asObject(rawCasePayload) ?? {}, "acceptable_issue_candidate_type");

  if (expectedReadiness !== null) {
    const expectedReadiness = asString(asObject(rawCasePayload)?.expected_readiness);
    if (observed.observed_readiness !== expectedReadiness) {
      mismatchesForCase.push({
        code: "mismatch_readiness",
        location: `cases[${index}].expected_readiness`,
        message: "observed readiness does not match expected_readiness",
        details: {
          expected: expectedReadiness,
          observed: observed.observed_readiness,
        },
      });
    }
  } else if (hasExpectedReadinessField) {
    mismatchesForCase.push({
      code: "case_expected_readiness_invalid",
      location: `cases[${index}].expected_readiness`,
      message: "case expected_readiness must be a string",
      details: { value: asObject(rawCasePayload)?.expected_readiness },
    });
  }

  if (expectedIssueType === null) {
    if (hasExpectedIssueField) {
      mismatchesForCase.push({
        code: "case_acceptable_issue_candidate_type_invalid",
        location: `cases[${index}].acceptable_issue_candidate_type`,
        message: "case acceptable_issue_candidate_type must be a string",
        details: { value: asObject(rawCasePayload)?.acceptable_issue_candidate_type },
      });
    }
  } else if (expectedIssueType !== observed.observed_issue_candidate_type) {
    mismatchesForCase.push({
      code: "mismatch_issue_candidate_type",
      location: `cases[${index}].acceptable_issue_candidate_type`,
      message: "observed issue candidate type does not match expected acceptable_issue_candidate_type",
      details: {
        expected: expectedIssueType,
        observed: observed.observed_issue_candidate_type,
      },
    });
  }

  if (typeof payload.expected_gap_present === "boolean") {
    if (payload.expected_gap_present && isGapLabel(gapTypeValue)) {
      if (observed.observed_gap_type !== gapTypeValue) {
        mismatchesForCase.push({
          code: "mismatch_gap_type",
          location: `cases[${index}].expected_gap_type`,
          message: "observed gap type does not match expected_gap_type",
          details: {
            expected: gapTypeValue,
            observed: observed.observed_gap_type,
          },
        });
      }
    } else if (!payload.expected_gap_present && observed.observed_gap_type !== null) {
      mismatchesForCase.push({
        code: "mismatch_gap_type_for_no_gap",
        location: `cases[${index}].expected_gap_type`,
        message: "correct_grounded expected_gap_type should be null and observed_gap_type must be null",
        details: {
          expected: payload.expected_gap_type,
          observed: observed.observed_gap_type,
        },
      });
    }
  }

  return {
    case_id: payload.id,
    concept_id: payload.concept_id,
    answer_class: payload.answer_class,
    observed_gap_present: observed.observed_gap_present,
    observed_gap_type: observed.observed_gap_type,
    observed_issue_candidate_type: observed.observed_issue_candidate_type,
    observed_repair_task_present: observed.observed_repair_task_present,
    observed_reevaluation_prompt_present: observed.observed_reevaluation_prompt_present,
    observed_readiness: observed.observed_readiness,
    evidence_quality_score: observed.evidence_quality_score,
    passed: mismatchesForCase.length === 0,
    mismatches: mismatchesForCase,
    expected_gap_present: payload.expected_gap_present,
    expected_gap_type: gapTypeValue ?? null,
    expected_issue_candidate_type: expectedIssueType ?? null,
    expected_readiness: asString(asObject(rawCasePayload)?.expected_readiness) ?? null,
  };
}

function aggregateBenchmarkResults(
  results: SelfhostBenchmarkCaseResult[],
  pilotValidationMismatches: number,
  benchmarkLoadMismatches: number,
): SelfhostBenchmarkAggregate {
  const totalCases = results.length;
  const passedCases = results.filter((entry) => entry.passed).length;
  const failedCases = totalCases - passedCases;

  const expectedGapCases = results.filter((entry) => entry.expected_gap_present);
  const observedGapCases = results.filter((entry) => entry.observed_gap_present);
  const truePositiveGap = expectedGapCases.filter((entry) => entry.observed_gap_present).length;
  const falsePositiveGap = observedGapCases.filter((entry) => !entry.expected_gap_present).length;
  const falseNegativeGap = expectedGapCases.filter((entry) => !entry.observed_gap_present).length;
  const totalGapMismatches = results.reduce((total, entry) => total + entry.mismatches.length, 0);

  const expectedGapTypeCases = expectedGapCases.filter((entry) => entry.expected_gap_type !== null);
  const gapTypeMatches = expectedGapTypeCases.filter((entry) =>
    entry.observed_gap_type === entry.expected_gap_type
  ).length;
  const totalMismatches = totalGapMismatches + pilotValidationMismatches + benchmarkLoadMismatches;

  const overconfidentCases = results.filter((entry) => entry.answer_class === "overconfident_wrong");
  const overconfidentDetected = overconfidentCases.filter((entry) =>
    entry.observed_gap_type === "false_confidence_gap"
  ).length;

  const designCases = results.filter((entry) => entry.answer_class === "design_induced_confusion");
  const designIssueDetected = designCases.filter((entry) =>
    entry.observed_issue_candidate_type === "DesignIssue"
  ).length;

  const evidenceQualityAverage = totalCases === 0
    ? 0
    : Number((results.reduce((total, entry) => total + entry.evidence_quality_score, 0) / totalCases).toFixed(4));

  const falseConfidenceRecallDenominator = overconfidentCases.length;
  const designRecallDenominator = designCases.length;

  return {
    total_cases: totalCases,
    passed_cases: passedCases,
    failed_cases: failedCases,
    total_mismatches: totalMismatches,
    gap_precision: calculateRatio(truePositiveGap, truePositiveGap + falsePositiveGap),
    gap_recall: calculateRatio(truePositiveGap, truePositiveGap + falseNegativeGap),
    gap_type_accuracy: calculateRatio(gapTypeMatches, expectedGapTypeCases.length),
    evidence_quality_average: evidenceQualityAverage,
    false_confidence_detection_count: overconfidentDetected,
    false_confidence_expected_count: falseConfidenceRecallDenominator,
    false_confidence_detection_recall: calculateRatio(overconfidentDetected, falseConfidenceRecallDenominator),
    design_issue_detection_count: designIssueDetected,
    design_issue_expected_count: designRecallDenominator,
    design_issue_detection_recall: calculateRatio(designIssueDetected, designRecallDenominator),
    pilot_validation_mismatch_count: pilotValidationMismatches,
    benchmark_load_mismatch_count: benchmarkLoadMismatches,
  };
}

export function runSelfhostBenchmark(options: SelfhostBenchmarkOptions = {}): SelfhostBenchmarkReport {
  const manifestPath = resolve(options.manifestPath ?? DEFAULT_MANIFEST_PATH);
  const pilotReport = runSelfhostPilotEval({
    manifestPath,
    indexPath: options.indexPath,
  });

  const goldCaseIndexPath = resolve(options.indexPath ?? pilotReport.gold_case_index_path ?? DEFAULT_GOLD_CASE_INDEX);

  const caseMismatches: SelfhostBenchmarkMismatch[] = [];
  const caseResults: SelfhostBenchmarkCaseResult[] = [];

  let indexPayload: RawCaseIndex | null = null;
  try {
    indexPayload = readJsonFile<RawCaseIndex>(goldCaseIndexPath);
  } catch (error) {
    caseMismatches.push({
      code: "benchmark_gold_case_index_parse_error",
      location: goldCaseIndexPath,
      message: `Gold case index JSON parse failed: ${(error as Error).message}`,
    });
  }

  const rawCases = asArray(indexPayload?.cases) ?? [];
  if (rawCases.length === 0) {
    caseMismatches.push({
      code: "benchmark_gold_cases_empty",
      location: "gold_case_index.cases",
      message: "Gold case index did not provide any cases",
    });
  }

  rawCases.forEach((rawCaseIndexEntry, index) => {
    const caseIndexEntry = asObject(rawCaseIndexEntry) as RawCaseEntry | null;
    const rawCasePathValue = asString(caseIndexEntry?.path);
    if (rawCasePathValue === null) {
      const malformedCaseMismatch: SelfhostBenchmarkMismatch = {
        code: "benchmark_case_path_missing",
        location: `gold_case_index.cases[${index}].path`,
        message: "Gold case entry is missing a valid path",
      };
      caseResults.push({
        case_id: `case-${index + 1}`,
        concept_id: "",
        answer_class: "declared_uncertainty",
        observed_gap_present: false,
        observed_gap_type: null,
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: false,
        observed_reevaluation_prompt_present: false,
        observed_readiness: "",
        evidence_quality_score: 0,
        passed: false,
        mismatches: [malformedCaseMismatch],
        expected_gap_present: null,
        expected_gap_type: null,
        expected_issue_candidate_type: null,
        expected_readiness: null,
      });
      return;
    }

    const casePath = resolve(dirname(goldCaseIndexPath), rawCasePathValue);
    if (!existsSync(casePath)) {
      const missingCaseMismatch: SelfhostBenchmarkMismatch = {
        code: "benchmark_case_missing",
        location: `gold_case_index.cases[${index}].path`,
        message: "Gold case file does not exist",
        details: { path: rawCasePathValue },
      };
      caseResults.push({
        case_id: asString(caseIndexEntry?.["id"]) ?? `case-${index + 1}`,
        concept_id: asString(caseIndexEntry?.["concept_id"]) ?? "",
        answer_class: isBenchmarkAnswerClass(asString(caseIndexEntry?.["answer_class"]))
          ? (asString(caseIndexEntry?.["answer_class"]) as BenchmarkAnswerClass)
          : "declared_uncertainty",
        observed_gap_present: false,
        observed_gap_type: null,
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: false,
        observed_reevaluation_prompt_present: false,
        observed_readiness: "",
        evidence_quality_score: 0,
        passed: false,
        mismatches: [missingCaseMismatch],
        expected_gap_present: null,
        expected_gap_type: null,
        expected_issue_candidate_type: null,
        expected_readiness: null,
      });
      return;
    }

    try {
      const rawCase = readJsonFile<RawCasePayload>(casePath);
      const evaluatedCase = evaluateObservedCase(rawCase, index);
      caseResults.push(evaluatedCase);
    } catch (error) {
      const parseMismatch: SelfhostBenchmarkMismatch = {
        code: "benchmark_case_parse_error",
        location: `gold_case_index.cases[${index}].path`,
        message: `Case JSON parse failed: ${(error as Error).message}`,
        details: { path: rawCasePathValue },
      };
      caseResults.push({
        case_id: asString(caseIndexEntry?.["id"]) ?? `case-${index + 1}`,
        concept_id: asString(caseIndexEntry?.["concept_id"]) ?? "",
        answer_class: isBenchmarkAnswerClass(asString(caseIndexEntry?.["answer_class"]))
          ? (asString(caseIndexEntry?.["answer_class"]) as BenchmarkAnswerClass)
          : "declared_uncertainty",
        observed_gap_present: false,
        observed_gap_type: null,
        observed_issue_candidate_type: "LearningGap",
        observed_repair_task_present: false,
        observed_reevaluation_prompt_present: false,
        observed_readiness: "",
        evidence_quality_score: 0,
        passed: false,
        mismatches: [parseMismatch],
        expected_gap_present: null,
        expected_gap_type: null,
        expected_issue_candidate_type: null,
        expected_readiness: null,
      });
    }
  });

  const aggregate = aggregateBenchmarkResults(
    caseResults,
    pilotReport.aggregate.total_mismatches,
    caseMismatches.length,
  );
  const report: SelfhostBenchmarkReport = {
    generated_at: new Date().toISOString(),
    validation: BENCHMARK_VALIDATION_ID,
    manifest_path: manifestPath,
    gold_case_index_path: goldCaseIndexPath,
    pilot_validation: pilotReport,
    cases: caseResults,
    aggregate,
  };

  if (options.reportPath) {
    const reportPath = resolve(options.reportPath);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifestArg = getFlagValue(process.argv, "manifest");
  const indexArg = getFlagValue(process.argv, "index");
  const reportArg = getFlagValue(process.argv, "report");

  const report = runSelfhostBenchmark({
    manifestPath: manifestArg,
    indexPath: indexArg,
    reportPath: reportArg,
  });

  process.stdout.write(`${JSON.stringify(report.aggregate, null, 2)}\n`);
  if (report.aggregate.total_mismatches > 0) {
    process.exitCode = 1;
  }
}
