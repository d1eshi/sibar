/**
 * Demo fixture data traced to self-hosted evaluator and benchmark reports.
 *
 * Every demo fixture entry carries trace fields back to a concrete report
 * so that public demo claims are backed by passing report sections rather
 * than hand-written compatible-looking text (VAL-CROSS-001, VAL-CROSS-002).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One of the five answer states selectable in the public demo. */
export type DemoAnswerState =
  | "grounded"
  | "uncited"
  | "partial"
  | "overconfident_wrong"
  | "design_induced_confusion";

/** A single demo fixture entry with full traceability to evaluator/benchmark reports. */
export type DemoFixtureEntry = {
  /** Human label for the answer state shown in the demo UI. */
  answer_state: DemoAnswerState;

  /** Absolute repo-relative path to the source report this fixture derives from. */
  source_report_path: string;

  /** The case id (e.g. "GC-001") from the source report. */
  case_id: string;

  /** The mastery check id (e.g. "SC-001-artifact-boundary") from the source report. */
  mastery_check_id: string;

  /** The concept id (e.g. "artifact_boundary") from the source report. */
  concept_id: string;

  /** The operation tested (e.g. "trace", "explain", "predict"). */
  operation: string;

  /** The observed finding type from the evaluator report. */
  observed_finding: string;

  /** Whether a gap was detected by the evaluator. */
  gap_present: boolean;

  /** The gap type if gap_present, otherwise null. */
  gap_type: string | null;

  /** The issue candidate type linked to this case. */
  issue_candidate_type: string;

  /** The observed readiness label from the evaluator. */
  readiness: string;

  /** User evidence excerpt from the evaluator finding. */
  user_evidence: string;

  /** Repo evidence citations from the evaluator finding. */
  repo_evidence: Array<{
    path: string;
    rationale: string;
    excerpt: string;
  }>;

  /** Repair task text (null for readiness cases). */
  repair_task: string | null;

  /** Re-evaluation prompt text (null for readiness cases). */
  reevaluation_prompt: string | null;

  /** Whether the source report case passed validation. */
  report_case_passed: boolean;

  /** Whether the demo can claim this behavior (only true if report_case_passed). */
  demo_claimable: boolean;
};

/** Result of tracing a demo fixture back to its source report. */
export type FixtureTraceResult = {
  entry_index: number;
  answer_state: DemoAnswerState;
  source_report_path: string;
  report_exists: boolean;
  case_found_in_report: boolean;
  data_consistent: boolean;
  inconsistencies: string[];
};

/** Summary of demo fixture traceability validation. */
export type TraceabilityReport = {
  total_entries: number;
  all_reports_exist: boolean;
  all_cases_found: boolean;
  all_data_consistent: boolean;
  claimable_entries: number;
  non_claimable_entries: number;
  traces: FixtureTraceResult[];
};

// ---------------------------------------------------------------------------
// Demo fixture data
// ---------------------------------------------------------------------------

const BENCHMARK_REPORT_PATH = "docs/specs/selfhost/pilot/reports/VAL-EVAL-006-selfhost-benchmark.json";

/**
 * Demo fixtures — one per answer state.
 *
 * Each entry is traced to a specific case in the benchmark report
 * (`docs/specs/selfhost/pilot/reports/VAL-EVAL-006-selfhost-benchmark.json`)
 * which in turn embeds the freeform evaluator output and the deterministic
 * pilot validation pass.
 *
 * The data below is extracted from the actual report to ensure it does
 * not contradict evaluator or benchmark output.
 */
export const DEMO_FIXTURES: DemoFixtureEntry[] = [
  // ---- grounded (GC-001) ----
  {
    answer_state: "grounded",
    source_report_path: BENCHMARK_REPORT_PATH,
    case_id: "GC-001",
    mastery_check_id: "SC-001-artifact-boundary",
    concept_id: "artifact_boundary",
    operation: "trace",
    observed_finding: "readiness",
    gap_present: false,
    gap_type: null,
    issue_candidate_type: "none",
    readiness: "ready to modify with guardrails",
    user_evidence:
      "I would trace boundary control in `sibar.selfhost.manifest.json` and `src/runtime-concept-graph.ts`, cite at least one included file path such as `src/runtime-support.ts` and one excluded path in the manifest, and explain that only listed included paths can support artifact evidence.",
    repo_evidence: [
      {
        path: "src/runtime-concept-graph.ts",
        rationale:
          "Boundary traversal logic (included/excluded checks and inventory walk) defines what is in-scope for concept graph evidence.",
        excerpt: "export function buildConceptGraph",
      },
      {
        path: "src/runtime-support.ts",
        rationale:
          "Core types and shared session metadata describe the boundary contract used when reading sessions and sessions' path fields.",
        excerpt: "included_paths: string[];",
      },
      {
        path: "Tests/concept-graph.test.ts",
        rationale:
          "Tests show boundary expectations, especially evidence filtering and exclusion behavior.",
        excerpt:
          '"export type ArtifactSession = { artifact_session_id: string; included_paths: string[]; excluded_paths: string[] };",',
      },
    ],
    repair_task: null,
    reevaluation_prompt: null,
    report_case_passed: true,
    demo_claimable: true,
  },

  // ---- uncited (GC-002) ----
  {
    answer_state: "uncited",
    source_report_path: BENCHMARK_REPORT_PATH,
    case_id: "GC-002",
    mastery_check_id: "SC-001-artifact-boundary",
    concept_id: "artifact_boundary",
    operation: "trace",
    observed_finding: "evidence_gap",
    gap_present: true,
    gap_type: "evidence_gap",
    issue_candidate_type: "LearningGap",
    readiness: "not ready yet",
    user_evidence:
      "Boundary checks are based on manifest paths and should include src and Tests.",
    repo_evidence: [
      {
        path: "src/runtime-concept-graph.ts",
        rationale:
          "Confirms inclusion logic even when answer semantics are otherwise correct.",
        excerpt: "export function buildConceptGraph",
      },
      {
        path: "src/runtime-support.ts",
        rationale: "Confirms metadata contracts for boundary-aware evidence.",
        excerpt: "included_paths: string[];",
      },
      {
        path: "Tests/concept-graph.test.ts",
        rationale: "Confirms exclusion of unbounded paths by test assertions.",
        excerpt: "excluded_paths",
      },
    ],
    repair_task:
      "Restate the same answer with explicit in-boundary file citations and one allowed/blocked path example.",
    reevaluation_prompt:
      "Using the same trace operation, evaluate boundary behavior when only `Tests/` is included and `src/` is excluded; explain how this changes evidence admissibility.",
    report_case_passed: true,
    demo_claimable: true,
  },

  // ---- partial (GC-003) ----
  {
    answer_state: "partial",
    source_report_path: BENCHMARK_REPORT_PATH,
    case_id: "GC-003",
    mastery_check_id: "SC-001-artifact-boundary",
    concept_id: "artifact_boundary",
    operation: "trace",
    observed_finding: "flow_gap",
    gap_present: true,
    gap_type: "flow_gap",
    issue_candidate_type: "LearningGap",
    readiness: "not ready yet",
    user_evidence:
      "I know included paths matter, but I mixed whether the include list is validated during session creation or graph generation, so I cannot explain the full sequence end-to-end.",
    repo_evidence: [
      {
        path: "src/runtime-concept-graph.ts",
        rationale:
          "Boundary traversal logic (included/excluded checks and inventory walk) defines what is in-scope for concept graph evidence.",
        excerpt: "export function buildConceptGraph",
      },
      {
        path: "src/runtime-support.ts",
        rationale:
          "Core types and shared session metadata describe the boundary contract used when reading sessions and sessions' path fields.",
        excerpt: "included_paths: string[];",
      },
      {
        path: "Tests/concept-graph.test.ts",
        rationale:
          "Tests show boundary expectations, especially evidence filtering and exclusion behavior.",
        excerpt: "excluded_paths",
      },
    ],
    repair_task:
      "Trace the boundary sequence end-to-end and connect each phase to repository evidence.",
    reevaluation_prompt:
      "Using the same trace operation, evaluate boundary behavior when only `Tests/` is included and `src/` is excluded; explain how this changes evidence admissibility.",
    report_case_passed: true,
    demo_claimable: true,
  },

  // ---- overconfident_wrong (GC-006) ----
  {
    answer_state: "overconfident_wrong",
    source_report_path: BENCHMARK_REPORT_PATH,
    case_id: "GC-006",
    mastery_check_id: "SC-001-artifact-boundary",
    concept_id: "artifact_boundary",
    operation: "trace",
    observed_finding: "false_confidence_gap",
    gap_present: true,
    gap_type: "false_confidence_gap",
    issue_candidate_type: "LearningGap",
    readiness: "not ready yet",
    user_evidence:
      "I am certain all files under the repo root are in scope unless they are literally impossible to open, so excluded paths do not matter for this slice.",
    repo_evidence: [
      {
        path: "src/runtime-concept-graph.ts",
        rationale:
          "Boundary traversal logic (included/excluded checks and inventory walk) defines what is in-scope for concept graph evidence.",
        excerpt: "export function buildConceptGraph",
      },
      {
        path: "src/runtime-support.ts",
        rationale:
          "Core types and shared session metadata describe the boundary contract used when reading sessions and sessions' path fields.",
        excerpt: "included_paths: string[];",
      },
      {
        path: "Tests/concept-graph.test.ts",
        rationale:
          "Tests show boundary expectations, especially evidence filtering and exclusion behavior.",
        excerpt: "excluded_paths",
      },
    ],
    repair_task:
      "Re-ground the confidence claim by contrasting manifest boundaries with excluded-path behavior.",
    reevaluation_prompt:
      "Using the same trace operation, evaluate boundary behavior when only `Tests/` is included and `src/` is excluded; explain how this changes evidence admissibility.",
    report_case_passed: true,
    demo_claimable: true,
  },

  // ---- design_induced_confusion (GC-008) ----
  {
    answer_state: "design_induced_confusion",
    source_report_path: BENCHMARK_REPORT_PATH,
    case_id: "GC-008",
    mastery_check_id: "SC-001-artifact-boundary",
    concept_id: "artifact_boundary",
    operation: "trace",
    observed_finding: "design_induced_gap",
    gap_present: true,
    gap_type: "design_induced_gap",
    issue_candidate_type: "DesignIssue",
    readiness: "not ready yet",
    user_evidence:
      "The manifest looks like a style document, not an enforcement rule, so I kept adding references from docs and excluded directories to avoid missing anything.",
    repo_evidence: [
      {
        path: "src/runtime-concept-graph.ts",
        rationale:
          "Conflicting expectation that the manifest is only descriptive.",
        excerpt: "export function buildConceptGraph",
      },
      {
        path: "src/runtime-concept-graph.ts",
        rationale: "Shows manifest values are executed as filtering rules.",
        excerpt: "included_paths",
      },
      {
        path: "Tests/concept-graph.test.ts",
        rationale: "Validates actual enforcement behavior from tests.",
        excerpt: "excluded_paths",
      },
    ],
    repair_task:
      "Add product-improvement style repair for interface affordance: make manifest boundary intent and enforcement behavior explicit before re-test.",
    reevaluation_prompt:
      "Using the same trace operation, evaluate boundary behavior when only `Tests/` is included and `src/` is excluded; explain how this changes evidence admissibility.",
    report_case_passed: true,
    demo_claimable: true,
  },
];

// ---------------------------------------------------------------------------
// Traceability helpers
// ---------------------------------------------------------------------------

/**
 * Load the benchmark report from disk, if it exists.
 * Returns null when the report file is missing or unparseable.
 */
export function loadBenchmarkReport(): unknown | null {
  const absPath = resolve(BENCHMARK_REPORT_PATH);
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/**
 * Look up a case in the benchmark report by case_id.
 * Returns the case object or null if not found.
 */
export function findCaseInBenchmarkReport(
  report: Record<string, unknown>,
  caseId: string,
): Record<string, unknown> | null {
  const cases = report["cases"] as Array<Record<string, unknown>> | undefined;
  if (!cases || !Array.isArray(cases)) return null;
  return cases.find((c) => c["case_id"] === caseId) ?? null;
}

/**
 * Check whether all spec 02-04 engineering checks pass by inspecting
 * the most recent benchmark report. Returns true when:
 * - The report exists and is parseable
 * - All 40 cases passed
 * - No mismatches are present
 * - Credibility thresholds are satisfied
 */
export function specs02to04Passed(): boolean {
  const report = loadBenchmarkReport();
  if (!report) return false;

  const r = report as Record<string, unknown>;

  // All cases must pass
  const cases = r["cases"] as Array<Record<string, unknown>> | undefined;
  if (!cases || !Array.isArray(cases)) return false;
  if (cases.length !== 40) return false;
  if (!cases.every((c) => c["passed"] === true)) return false;

  // Aggregate must show zero mismatches
  const agg = r["aggregate"] as Record<string, unknown> | undefined;
  if (!agg) return false;
  if (agg["total_mismatches"] !== 0) return false;
  if (agg["failed_cases"] !== 0) return false;

  // Credibility thresholds must pass
  if (agg["false_confidence_detection_recall"] !== 1) return false;
  if (agg["design_issue_detection_recall"] !== 1) return false;

  return true;
}

/**
 * Validate a single demo fixture entry against its source report.
 */
export function traceFixture(
  entry: DemoFixtureEntry,
  index: number,
): FixtureTraceResult {
  const inconsistencies: string[] = [];
  const absReportPath = resolve(entry.source_report_path);
  const reportExists = existsSync(absReportPath);
  let caseFoundInReport = false;

  if (!reportExists) {
    inconsistencies.push(
      `source report does not exist: ${entry.source_report_path}`,
    );
  }

  if (reportExists) {
    try {
      const raw = JSON.parse(readFileSync(absReportPath, "utf8")) as Record<
        string,
        unknown
      >;
      const reportCase = findCaseInBenchmarkReport(raw, entry.case_id);

      if (!reportCase) {
        inconsistencies.push(
          `case_id "${entry.case_id}" not found in report ${entry.source_report_path}`,
        );
      } else {
        caseFoundInReport = true;

        // Check consistency: observed finding should match
        const reportObservedGapType = reportCase["observed_gap_type"];
        if (entry.gap_type !== null && reportObservedGapType !== entry.gap_type) {
          inconsistencies.push(
            `gap_type mismatch: fixture says "${entry.gap_type}", report says "${String(reportObservedGapType)}"`,
          );
        }

        // Check readiness consistency
        const reportReadiness = reportCase["observed_readiness"];
        if (reportReadiness !== entry.readiness) {
          inconsistencies.push(
            `readiness mismatch: fixture says "${entry.readiness}", report says "${String(reportReadiness)}"`,
          );
        }

        // Check passed status
        const reportPassed = reportCase["passed"];
        if (reportPassed !== true) {
          inconsistencies.push(
            `case ${entry.case_id} did not pass in report but fixture may claim it`,
          );
        }

        // Check issue candidate type consistency
        const reportIssueType = reportCase["observed_issue_candidate_type"];
        if (
          entry.issue_candidate_type !== "none" &&
          reportIssueType !== entry.issue_candidate_type
        ) {
          inconsistencies.push(
            `issue_candidate_type mismatch: fixture says "${entry.issue_candidate_type}", report says "${String(reportIssueType)}"`,
          );
        }
      }
    } catch {
      inconsistencies.push(
        `failed to parse report: ${entry.source_report_path}`,
      );
    }
  }

  return {
    entry_index: index,
    answer_state: entry.answer_state,
    source_report_path: entry.source_report_path,
    report_exists: reportExists,
    case_found_in_report: caseFoundInReport,
    data_consistent: inconsistencies.length === 0,
    inconsistencies,
  };
}

/**
 * Validate all demo fixtures and produce a traceability report.
 */
export function validateDemoFixturesTraceability(): TraceabilityReport {
  const traces = DEMO_FIXTURES.map((entry, i) => traceFixture(entry, i));

  return {
    total_entries: DEMO_FIXTURES.length,
    all_reports_exist: traces.every((t) => t.report_exists),
    all_cases_found: traces.every((t) => t.case_found_in_report),
    all_data_consistent: traces.every((t) => t.data_consistent),
    claimable_entries: DEMO_FIXTURES.filter((e) => e.demo_claimable).length,
    non_claimable_entries: DEMO_FIXTURES.filter((e) => !e.demo_claimable)
      .length,
    traces,
  };
}

/**
 * Returns true when demo claims are properly gated:
 * - Specs 02-04 engineering checks pass
 * - All demo fixtures trace to passing report sections
 * - No unsupported placeholder is presented as accomplished
 */
export function demoClaimsAreGated(): boolean {
  // Gate 1: specs 02-04 must pass
  if (!specs02to04Passed()) return false;

  // Gate 2: all demo fixtures must trace to passing report sections
  const traceability = validateDemoFixturesTraceability();
  if (!traceability.all_data_consistent) return false;

  // Gate 3: no fixture presents itself as claimable when its report case didn't pass
  for (const entry of DEMO_FIXTURES) {
    if (entry.demo_claimable && !entry.report_case_passed) return false;
  }

  return true;
}
