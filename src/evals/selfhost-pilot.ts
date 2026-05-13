import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";

const DEFAULT_MANIFEST_PATH = "sibar.selfhost.manifest.json";
const DEFAULT_GOLD_CASE_INDEX = "docs/specs/selfhost/pilot/gold-cases/index.json";
const SELFHOST_VALIDATION_ID = "VAL-EVAL-006-selfhost-pilot";

const FIRST_SLICE_CONCEPT_IDS = [
  "artifact_boundary",
  "concept_graph_generation",
  "gap_detection",
  "repair_practice_generation",
  "readiness_report_generation",
] as const;

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

type FirstSliceConceptId = (typeof FIRST_SLICE_CONCEPT_IDS)[number];
type BenchmarkAnswerClass = (typeof BENCHMARK_ANSWER_CLASSES)[number];
type GapLabel = (typeof GAP_LABELS)[number];

export type SelfhostPilotMismatch = {
  code: string;
  location: string;
  message: string;
  details?: unknown;
};

export type SelfhostPilotAggregate = {
  total_checks: number;
  total_mismatches: number;
  checks_passed: number;
  checks_failed: number;
  cases_checked: number;
  answer_class_distribution: Record<string, number>;
  out_of_scope_required_evidence_paths: number;
};

export type SelfhostPilotEvalReport = {
  generated_at: string;
  validation: string;
  manifest_path: string;
  gold_case_index_path: string;
  mastery_check_index_path: string;
  aggregate: SelfhostPilotAggregate;
  mismatches: SelfhostPilotMismatch[];
};

type SelfhostPilotOptions = {
  manifestPath?: string;
  indexPath?: string;
  reportPath?: string;
};

type ValidationState = {
  checks: number;
  mismatches: SelfhostPilotMismatch[];
  includedPaths: string[];
  masteryCheckIds: Set<string>;
  answerClassDistribution: Record<string, number>;
  outOfScopeEvidencePaths: number;
  casesChecked: number;
};

type RawManifest = {
  included_paths?: unknown;
  concepts?: unknown;
  mastery_check_index?: unknown;
  gold_case_index?: unknown;
};

type RawMasteryIndex = {
  checks?: unknown;
};

type RawGoldCaseIndex = {
  concepts?: unknown;
  answer_classes?: unknown;
  cases?: unknown;
};

type RawCase = Record<string, unknown>;

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function normalizePath(value: string): string {
  return value.split(sep).join("/");
}

function isUnderDocsMissions(path: string): boolean {
  return /(^|\/)docs\/missions(\/|$)/.test(normalizePath(path));
}

function isWithin(parent: string, candidate: string): boolean {
  const normalizedParent = parent.endsWith(sep) ? parent : `${parent}${sep}`;
  return candidate === parent || candidate.startsWith(normalizedParent);
}

function isInsideIncludedPaths(includedPaths: string[], candidate: string): boolean {
  return includedPaths.some((entry) => isWithin(entry, candidate));
}

function resolveRelativeToManifest(manifestPath: string, entry: string): string {
  if (isAbsolute(entry)) return entry;
  return resolve(dirname(manifestPath), entry);
}

function check(state: ValidationState, input: {
  ok: boolean;
  code: string;
  location: string;
  message: string;
  details?: unknown;
}) {
  state.checks += 1;
  if (!input.ok) {
    state.mismatches.push({
      code: input.code,
      location: input.location,
      message: input.message,
      details: input.details,
    });
  }
}

function manifestConcepts(manifestConceptsValue: unknown): string[] {
  if (!Array.isArray(manifestConceptsValue)) return [];
  return manifestConceptsValue.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (isObject(entry) && typeof entry.concept_id === "string") return [entry.concept_id];
    return [];
  });
}

function arraysEqualByValues(actual: string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((value, index) => value === expected[index]);
}

function setEquals(actual: string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const actualSet = new Set(actual);
  return expected.every((value) => actualSet.has(value));
}

function isFirstSliceConceptId(value: string | null): value is FirstSliceConceptId {
  return value !== null && (FIRST_SLICE_CONCEPT_IDS as readonly string[]).includes(value);
}

function isBenchmarkAnswerClass(value: string | null): value is BenchmarkAnswerClass {
  return value !== null && (BENCHMARK_ANSWER_CLASSES as readonly string[]).includes(value);
}

function isGapLabel(value: string | null): value is GapLabel {
  return value !== null && (GAP_LABELS as readonly string[]).includes(value);
}

function addConceptSetDiffState(manifest: RawManifest, state: ValidationState) {
  const conceptIDs = manifestConcepts(manifest.concepts);
  check(state, {
    ok: arraysEqualByValues(conceptIDs, FIRST_SLICE_CONCEPT_IDS),
    code: "manifest_concepts_invalid",
    location: "manifest.concepts",
    message: "Manifest concepts must exactly match the five first-slice concept IDs.",
    details: conceptIDs,
  });
}

function validateManifest(manifestPath: string, state: ValidationState): RawManifest | null {
  if (!existsSync(manifestPath)) {
    check(state, {
      ok: false,
      code: "manifest_missing",
      location: "manifest",
      message: `Manifest file does not exist: ${manifestPath}`,
    });
    return null;
  }

  let manifest: RawManifest;
  try {
    manifest = readJsonFile<RawManifest>(manifestPath);
  } catch (error) {
    check(state, {
      ok: false,
      code: "manifest_parse_error",
      location: "manifest",
      message: `Manifest JSON parse failed: ${(error as Error).message}`,
    });
    return null;
  }

  check(state, {
    ok: Array.isArray(manifest.included_paths),
    code: "manifest_included_paths_invalid",
    location: "manifest.included_paths",
    message: "Manifest must include included_paths as an array.",
  });

  check(state, {
    ok: manifest.concepts !== undefined,
    code: "manifest_concepts_missing",
    location: "manifest.concepts",
    message: "Manifest is missing concepts.",
  });

  check(state, {
    ok: asString(manifest.mastery_check_index) !== null,
    code: "manifest_mastery_check_index_missing",
    location: "manifest.mastery_check_index",
    message: "Manifest is missing mastery_check_index.",
  });

  check(state, {
    ok: asString(manifest.gold_case_index) !== null,
    code: "manifest_gold_case_index_missing",
    location: "manifest.gold_case_index",
    message: "Manifest is missing gold_case_index.",
  });

  addConceptSetDiffState(manifest, state);

  if (Array.isArray(manifest.included_paths)) {
    for (let i = 0; i < manifest.included_paths.length; i += 1) {
      const value = manifest.included_paths[i];
      const location = `manifest.included_paths[${i}]`;
      check(state, {
        ok: typeof value === "string" && value.trim().length > 0,
        code: "manifest_included_path_invalid",
        location,
        message: "Each included path must be a non-empty string.",
      });

      if (typeof value !== "string" || !value.trim()) continue;

      const absolutePath = resolveRelativeToManifest(manifestPath, value);
      check(state, {
        ok: existsSync(absolutePath),
        code: "manifest_included_path_missing",
        location,
        message: "Each manifest included path must exist.",
        details: { path: value, resolved_path: absolutePath },
      });
      if (!existsSync(absolutePath)) continue;

      const normalized = realpathSync(absolutePath);
      if (isUnderDocsMissions(normalized)) {
        check(state, {
          ok: false,
          code: "active_artifact_path_in_docs_missions",
          location,
          message: "No included path should point under docs/missions.",
          details: { path: value, resolved_path: normalized },
        });
        continue;
      }
      if (!state.includedPaths.includes(normalized)) state.includedPaths.push(normalized);
    }
  }

  return manifest;
}

function validateMasteryIndex(manifest: RawManifest, manifestPath: string, state: ValidationState): string {
  const masteryCheckIndex = asString(manifest.mastery_check_index);
  const masteryCheckIndexPath = masteryCheckIndex
    ? resolveRelativeToManifest(manifestPath, masteryCheckIndex)
    : "";

  check(state, {
    ok: masteryCheckIndexPath.length > 0 && existsSync(masteryCheckIndexPath),
    code: "mastery_index_missing",
    location: "manifest.mastery_check_index",
    message: "Mastery check index file must exist.",
    details: { path: masteryCheckIndexPath || "missing" },
  });
  if (!masteryCheckIndexPath || !existsSync(masteryCheckIndexPath)) {
    return masteryCheckIndexPath;
  }

  let payload: RawMasteryIndex;
  try {
    payload = readJsonFile<RawMasteryIndex>(masteryCheckIndexPath);
  } catch (error) {
    check(state, {
      ok: false,
      code: "mastery_index_parse_error",
      location: masteryCheckIndexPath,
      message: `Mastery index JSON parse failed: ${(error as Error).message}`,
    });
    return masteryCheckIndexPath;
  }

  const checks = asArray(payload.checks) ?? [];
  check(state, {
    ok: checks.length === 5,
    code: "mastery_index_check_count_invalid",
    location: "manifest.mastery_check_index.checks",
    message: "Mastery check index must define exactly five checks.",
    details: { count: checks.length },
  });

  for (let i = 0; i < checks.length; i += 1) {
    const entry = checks[i];
    const location = `manifest.mastery_check_index.checks[${i}]`;
    check(state, {
      ok: isObject(entry),
      code: "mastery_check_entry_invalid",
      location,
      message: "Each mastery check must be an object.",
    });
    if (!isObject(entry)) continue;
    const checkId = asString(entry.id);
    const conceptId = asString(entry.concept_id);
    check(state, {
      ok: checkId !== null,
      code: "mastery_check_id_missing",
      location: `${location}.id`,
      message: "Mastery check entry requires id.",
      details: entry,
    });
    if (checkId !== null) {
      state.masteryCheckIds.add(checkId);
    }
    check(state, {
      ok: conceptId !== null,
      code: "mastery_check_concept_missing",
      location: `${location}.concept_id`,
      message: "Mastery check entry requires concept_id.",
      details: entry,
    });
  }

  return masteryCheckIndexPath;
}

function validateGoldCaseIndex(
  manifest: RawManifest,
  manifestPath: string,
  options: SelfhostPilotOptions,
  state: ValidationState,
): string {
  const requestedIndex = options.indexPath ?? asString(manifest.gold_case_index) ?? DEFAULT_GOLD_CASE_INDEX;
  const goldCaseIndexPath = isAbsolute(requestedIndex)
    ? requestedIndex
    : resolve(dirname(manifestPath), requestedIndex);

  check(state, {
    ok: existsSync(goldCaseIndexPath),
    code: "gold_index_missing",
    location: "gold_case_index",
    message: "Gold case index file must exist.",
    details: { path: goldCaseIndexPath },
  });
  if (!existsSync(goldCaseIndexPath)) {
    return goldCaseIndexPath;
  }

  let payload: RawGoldCaseIndex;
  try {
    payload = readJsonFile<RawGoldCaseIndex>(goldCaseIndexPath);
  } catch (error) {
    check(state, {
      ok: false,
      code: "gold_index_parse_error",
      location: goldCaseIndexPath,
      message: `Gold case index JSON parse failed: ${(error as Error).message}`,
    });
    return goldCaseIndexPath;
  }

  const indexConcepts = toArrayValue(payload.concepts);
  check(state, {
    ok: setEquals(indexConcepts, FIRST_SLICE_CONCEPT_IDS),
    code: "gold_index_concepts_invalid",
    location: "gold_cases.concepts",
    message: "Gold index concepts must contain the five first-slice concepts.",
    details: indexConcepts,
  });

  const indexClasses = toArrayValue(payload.answer_classes);
  check(state, {
    ok: setEquals(indexClasses, BENCHMARK_ANSWER_CLASSES),
    code: "gold_index_answer_classes_invalid",
    location: "gold_cases.answer_classes",
    message: "Gold index answer_classes must be the eight benchmark classes.",
    details: indexClasses,
  });

  const cases = asArray(payload.cases);
  check(state, {
    ok: cases !== null,
    code: "gold_cases_missing",
    location: "gold_cases.cases",
    message: "Gold index must contain a cases array.",
  });
  if (cases === null) return goldCaseIndexPath;

  check(state, {
    ok: cases.length === 40,
    code: "gold_cases_count_invalid",
    location: "gold_cases.cases",
    message: "Gold case index must contain exactly 40 cases.",
    details: { count: cases.length },
  });

  for (let i = 0; i < cases.length; i += 1) {
    const caseIndex = cases[i];
    const caseLocation = `gold_cases.cases[${i}]`;
    if (!isObject(caseIndex)) {
      check(state, {
        ok: false,
        code: "gold_case_entry_invalid",
        location: caseLocation,
        message: "Each gold case entry must be an object.",
      });
      continue;
    }

    const casePath = asString(caseIndex.path);
    check(state, {
      ok: casePath !== null && casePath.trim().length > 0,
      code: "gold_case_entry_path_missing",
      location: `${caseLocation}.path`,
      message: "Each gold case entry must include a path.",
      details: caseIndex,
    });
    if (casePath === null) {
      continue;
    }

    const resolvedCasePath = resolve(dirname(goldCaseIndexPath), casePath);
    check(state, {
      ok: existsSync(resolvedCasePath),
      code: "case_file_missing",
      location: `${caseLocation}.path`,
      message: "Case file must exist.",
      details: { path: casePath, resolved_path: resolvedCasePath },
    });
    if (!existsSync(resolvedCasePath)) {
      continue;
    }

    let casePayload: RawCase;
    try {
      casePayload = readJsonFile<RawCase>(resolvedCasePath);
    } catch (error) {
      check(state, {
        ok: false,
        code: "case_parse_error",
        location: `${caseLocation}.path`,
        message: `Case JSON parse failed: ${(error as Error).message}`,
        details: { path: resolvedCasePath },
      });
      continue;
    }

    state.casesChecked += 1;

    const caseId = asString(casePayload.id) ?? `${caseLocation}.id`;
    const requiredFields = [
      "id",
      "mastery_check_id",
      "concept_id",
      "operation",
      "answer_class",
      "declared_confidence",
      "expected_gap_type",
      "expected_layer",
      "expected_severity",
      "expected_confidence",
      "required_repo_evidence",
      "forbidden_claims",
      "acceptable_repair_task",
      "acceptable_issue_candidate_type",
      "expected_readiness",
      "expected_gap_present",
      "notes",
    ] as const;

    for (const field of requiredFields) {
      check(state, {
        ok: field in casePayload,
        code: "case_missing_required_field",
        location: `${caseLocation}.${field}`,
        message: "Case is missing a required field.",
        details: { case_id: caseId, field },
      });
    }

    check(state, {
      ok: !Object.prototype.hasOwnProperty.call(casePayload, "model_signal_validation"),
      code: "case_model_signal_validation_present",
      location: `${caseLocation}.model_signal_validation`,
      message: "Case must not include model_signal_validation in the pilot dataset.",
      details: { case_id: caseId },
    });

    const masteryCheckId = asString(casePayload.mastery_check_id);
    check(state, {
      ok: masteryCheckId !== null && state.masteryCheckIds.has(masteryCheckId),
      code: "case_unknown_mastery_check_id",
      location: `${caseLocation}.mastery_check_id`,
      message: "Case mastery_check_id must reference a known mastery check id.",
      details: { case_id: caseId, value: masteryCheckId },
    });

    const conceptId = asString(casePayload.concept_id);
    check(state, {
      ok: isFirstSliceConceptId(conceptId),
      code: "case_invalid_concept_id",
      location: `${caseLocation}.concept_id`,
      message: "Case concept_id must be one of the first-slice concept IDs.",
      details: { case_id: caseId, value: conceptId },
    });

    const answerClass = asString(casePayload.answer_class);
    check(state, {
      ok: isBenchmarkAnswerClass(answerClass),
      code: "case_answer_class_invalid",
      location: `${caseLocation}.answer_class`,
      message: "Case answer_class must be one of the eight benchmark classes.",
      details: { case_id: caseId, value: answerClass },
    });
    if (answerClass !== null) {
      state.answerClassDistribution[answerClass] = (state.answerClassDistribution[answerClass] ?? 0) + 1;
    }

    const expectedGapPresent = asBoolean(casePayload.expected_gap_present);
    check(state, {
      ok: expectedGapPresent !== null,
      code: "case_expected_gap_present_missing",
      location: `${caseLocation}.expected_gap_present`,
      message: "Case expected_gap_present must be boolean.",
      details: { case_id: caseId, value: casePayload.expected_gap_present },
    });

    const expectedGapType = casePayload.expected_gap_type;
    if (answerClass === "correct_grounded") {
      check(state, {
        ok: expectedGapPresent === false,
        code: "case_gap_present_for_correct_grounded",
        location: `${caseLocation}.expected_gap_present`,
        message: "correct_grounded cases must set expected_gap_present to false.",
        details: { case_id: caseId },
      });
      check(state, {
        ok: expectedGapType === null,
        code: "case_gap_type_for_correct_grounded",
        location: `${caseLocation}.expected_gap_type`,
        message: "correct_grounded cases must set expected_gap_type to null.",
        details: { case_id: caseId, value: expectedGapType },
      });
    } else {
      check(state, {
        ok: expectedGapPresent === true,
        code: "case_gap_present_for_non_correct_grounded",
        location: `${caseLocation}.expected_gap_present`,
        message: "Non-correct_grounded cases must set expected_gap_present to true.",
        details: { case_id: caseId, value: expectedGapPresent },
      });
      check(state, {
        ok: isGapLabel(asString(expectedGapType)),
        code: "case_invalid_gap_type",
        location: `${caseLocation}.expected_gap_type`,
        message: "Non-correct_grounded cases must use a valid contract gap label.",
        details: { case_id: caseId, value: expectedGapType },
      });
    }

    const requiredEvidence = asArray(casePayload.required_repo_evidence);
    check(state, {
      ok: requiredEvidence !== null,
      code: "case_required_repo_evidence_missing",
      location: `${caseLocation}.required_repo_evidence`,
      message: "Case required_repo_evidence must be an array.",
      details: { case_id: caseId },
    });
    if (requiredEvidence === null) {
      continue;
    }

    for (let e = 0; e < requiredEvidence.length; e += 1) {
      const evidence = requiredEvidence[e];
      const evidenceLocation = `${caseLocation}.required_repo_evidence[${e}]`;
      const evidencePathValue = isObject(evidence) ? asString(evidence.path) : null;
      check(state, {
        ok: evidencePathValue !== null && evidencePathValue.length > 0,
        code: "case_required_repo_evidence_path_missing",
        location: evidenceLocation,
        message: "Each required_repo_evidence entry must include a non-empty path.",
        details: { case_id: caseId },
      });
      if (evidencePathValue === null) continue;

      const resolvedEvidencePath = resolveRelativeToManifest(manifestPath, evidencePathValue);
      check(state, {
        ok: existsSync(resolvedEvidencePath),
        code: "case_required_repo_evidence_not_found",
        location: `${evidenceLocation}.path`,
        message: "required_repo_evidence path must exist.",
        details: { case_id: caseId, path: evidencePathValue, resolved_path: resolvedEvidencePath },
      });
      if (!existsSync(resolvedEvidencePath)) continue;

      check(state, {
        ok: isInsideIncludedPaths(state.includedPaths, resolvedEvidencePath),
        code: "case_required_repo_evidence_not_in_manifest_included_paths",
        location: `${evidenceLocation}.path`,
        message: "required_repo_evidence path must be inside manifest included_paths.",
        details: { case_id: caseId, path: evidencePathValue },
      });
      if (isUnderDocsMissions(resolvedEvidencePath)) {
        state.outOfScopeEvidencePaths += 1;
        check(state, {
          ok: false,
          code: "case_required_repo_evidence_in_docs_missions",
          location: `${evidenceLocation}.path`,
          message: "No required_repo_evidence path may point under docs/missions.",
          details: { case_id: caseId, resolved_path: resolvedEvidencePath },
        });
      }
    }
  }

  for (const answerClass of BENCHMARK_ANSWER_CLASSES) {
    check(state, {
      ok: (state.answerClassDistribution[answerClass] ?? 0) === 5,
      code: "answer_class_distribution_invalid",
      location: `gold_cases.answer_classes[${answerClass}]`,
      message: `Answer class ${answerClass} must appear exactly five times.`,
      details: { class: answerClass, count: state.answerClassDistribution[answerClass] ?? 0 },
    });
  }

  return goldCaseIndexPath;
}

export function runSelfhostPilotEval(options: SelfhostPilotOptions = {}): SelfhostPilotEvalReport {
  const manifestPath = resolve(options.manifestPath ?? DEFAULT_MANIFEST_PATH);
  const state: ValidationState = {
    checks: 0,
    mismatches: [],
    includedPaths: [],
    masteryCheckIds: new Set(),
    answerClassDistribution: {},
    outOfScopeEvidencePaths: 0,
    casesChecked: 0,
  };

  const manifest = validateManifest(manifestPath, state);
  let masteryCheckIndexPath = "";
  let goldCaseIndexPath = options.indexPath ?? DEFAULT_GOLD_CASE_INDEX;

  if (manifest) {
    masteryCheckIndexPath = validateMasteryIndex(manifest, manifestPath, state);
    goldCaseIndexPath = validateGoldCaseIndex(manifest, manifestPath, options, state);
  }

  const totalChecks = state.checks;
  const totalMismatches = state.mismatches.length;
  const aggregate: SelfhostPilotAggregate = {
    total_checks: totalChecks,
    total_mismatches: totalMismatches,
    checks_passed: totalChecks - totalMismatches,
    checks_failed: totalMismatches,
    cases_checked: state.casesChecked,
    answer_class_distribution: state.answerClassDistribution,
    out_of_scope_required_evidence_paths: state.outOfScopeEvidencePaths,
  };

  return {
    generated_at: new Date().toISOString(),
    validation: SELFHOST_VALIDATION_ID,
    manifest_path: manifestPath,
    gold_case_index_path: goldCaseIndexPath,
    mastery_check_index_path: masteryCheckIndexPath,
    aggregate,
    mismatches: state.mismatches,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifestArg = process.argv.find((entry) => entry.startsWith("--manifest="))?.slice("--manifest=".length);
  const indexArg = process.argv.find((entry) => entry.startsWith("--index="))?.slice("--index=".length);
  const reportArg = process.argv.find((entry) => entry.startsWith("--report="))?.slice("--report=".length);

  const report = runSelfhostPilotEval({
    manifestPath: manifestArg,
    indexPath: indexArg,
    reportPath: reportArg,
  });

  process.stdout.write(`${JSON.stringify(report.aggregate, null, 2)}\n`);

  if (reportArg) {
    const outputPath = resolve(reportArg);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (report.aggregate.total_mismatches > 0) {
    process.exitCode = 1;
  }
}
