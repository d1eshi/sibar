import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";

import {
  buildFocusCandidates,
  type EvidenceCitationLike,
  type EvidencePackLike,
  type FocusCandidate,
  type QuestionBatchDiagnostic,
  type QuestionBatch,
} from "../workbench/focus-question/index.ts";
import {
  buildOwnershipQuestionPlan,
  projectOwnershipQuestionPlanToQuestionBatch,
  type OwnershipPlannerDiagnostic,
  type OwnershipQuestionPlan,
  type OwnershipQuestionPlanDisposition,
  type OwnershipQuestionPlanProjectionInput,
  type OwnershipQuestionPlanVerification,
  type PlannedOwnershipQuestion,
  verifyOwnershipQuestionPlan,
} from "../workbench/ownership-question-planner/index.ts";

const EVAL_VALIDATION_ID = "VAL-EVAL-015-ownership-question-planner";
const EVAL_SPEC_PATH = "evals/ownership-question-planner/eval-suite.json";
const DEFAULT_REPORT = "evals/ownership-question-planner/reports/VAL-EVAL-015-ownership-question-planner.json";
const DEFAULT_LARGE_FIXTURE = "evals/ownership-question-planner/fixtures/large-react-workbench.fixture.json";
const DEFAULT_SMALL_FIXTURE = "evals/ownership-question-planner/fixtures/small-react-workbench.fixture.json";
const GENERATED_AT = "2026-05-28T00:00:00.000Z";

type FixtureMarker = {
  id: string;
  token: string;
  span_before?: number;
  span_after?: number;
};

type FixtureSpec = {
  fixture_id: string;
  label?: string;
  selected_file_path: string;
  provider_id?: string;
  question_budget?: number;
  generated_from?: string;
  source_lines?: string[];
  append_repeat_count?: number;
  append_block?: string[];
  evidence_markers?: FixtureMarker[];
  user_intent?: string;
};

type LoadedFixture = {
  fixtureSpec: FixtureSpec;
  filePath: string;
  fileLines: string[];
  evidencePack: EvidencePackLike;
  focusCandidates: FocusCandidate[];
  fileContents: Record<string, string>;
};

type CaseObservation = {
  fixture_id: string;
  selected_file_path: string;
  baseline_planner_disposition?: OwnershipQuestionPlanDisposition;
  baseline_unit_count?: number;
  baseline_question_count?: number;
  baseline_plan_heuristics?: {
    isLargeFile: boolean;
    isComposite: boolean;
    lineCount: number;
  };
  mutated_question_id?: string | null;
  observed_verification_kind?: OwnershipQuestionPlanDisposition;
  batch_disposition?: QuestionBatch["verifierDisposition"];
  batch_question_count?: number;
  batch_question_ids?: string[];
  batch_diagnostics?: QuestionBatchDiagnostic[];
  batch_codes?: string[];
  question_reject_count?: number;
  diagnostic_codes?: string[];
  diagnostics_by_severity?: Record<string, number>;
};

type CaseResult = {
  id: string;
  title: string;
  case_class: string;
  passed: boolean;
  observations: CaseObservation;
  mismatches: Array<{
    field: string;
    expected: unknown;
    actual: unknown;
  }>;
};

type EvalCase = {
  id: string;
  title: string;
  case_class: string;
  fixturePath: string;
  run: (
    fixture: LoadedFixture,
  ) => { observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">; mismatches: CaseResult["mismatches"] };
};

type EvalReport = {
  report_id: string;
  generated_at: string;
  validation: typeof EVAL_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  no_llm: true;
  command: {
    script: string;
    executed_with: string;
    executed_at: string;
    report_path: string;
  };
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    blocked_verification_cases: number;
    accepted_with_questions_cases: number;
    rejected_cases: number;
    projection_batch_cases: number;
    projection_fallback_cases: number;
  };
  cases: CaseResult[];
};

type CliOptions = {
  reportPath?: string;
  largeFixturePath?: string;
  smallFixturePath?: string;
  generatedAt?: string;
  reportId?: string;
};

function normalizePath(path: string): string {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function splitLines(value: string): string[] {
  return value.length === 0 ? [] : value.replace(/\r/g, "").split("\n");
}

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);
  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[1 + spacedIndex] !== undefined
    ? argv[spacedIndex + 1]
    : undefined;
  return undefined;
}

function toRepoRelative(filePath: string): string {
  return relative(process.cwd(), resolve(filePath)) || ".";
}

function safeReadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}


function fixtureSourceLines(spec: FixtureSpec): string[] {
  if (spec.source_lines !== undefined) return spec.source_lines;
  if (!spec.generated_from) return [];

  const generatedFrom = resolve(spec.generated_from);
  if (!existsSync(generatedFrom)) {
    throw new Error(`fixture missing generated_from source: ${spec.generated_from}`);
  }

  return splitLines(readFileSync(generatedFrom, "utf8"));
}

function findLineIndex(lines: string[], token: string): number {
  const hit = lines.findIndex((line) => line.includes(token));
  if (hit >= 0) return hit + 1;
  return 1;
}

function clampLine(lines: string[], line: number): number {
  if (line < 1) return 1;
  if (line > lines.length) return lines.length;
  return line;
}

function buildEvidenceFromFixture(spec: FixtureSpec, fileLines: string[], selectedFilePath: string): EvidencePackLike {
  const excerpts: EvidencePackLike["excerpts"] = [];
  const symbols: EvidencePackLike["symbols"] = [];

  for (const marker of spec.evidence_markers ?? []) {
    const line = findLineIndex(fileLines, marker.token);
    const start = clampLine(fileLines, line - Math.max(0, marker.span_before ?? 0));
    const end = clampLine(fileLines, line + Math.max(0, marker.span_after ?? 0));
    const snippet = fileLines.slice(start - 1, end).join("\n");
    excerpts.push({
      evidenceId: marker.id,
      filePath: selectedFilePath,
      startLine: start,
      endLine: end,
      text: snippet,
    });
  }

  const symbolKinds = new Map<string, EvidencePackLike["symbols"][number]["kind"]>([
    ["function", "function"],
    ["const", "const"],
    ["let", "let"],
    ["var", "var"],
    ["class", "class"],
    ["interface", "interface"],
    ["type", "type"],
    ["enum", "enum"],
  ]);
  const symbolRegex = /^(?:\s*export\s+)?(?:(?:\b(?:async)\s+)?(function|class|interface|type|enum|const|let|var))\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/;
  const used = new Set<string>();

  for (let index = 0; index < fileLines.length; index += 1) {
    const line = fileLines[index];
    const match = symbolRegex.exec(line.trim());
    if (match == null || match.length < 3) continue;
    const [, kind, symbol] = match;
    if (!symbol || kind == null) continue;
    const mappedKind = symbolKinds.get(kind);
    if (!mappedKind) continue;
    const evidenceId = `symbol-${symbol}-${index + 1}`;
    if (used.has(evidenceId)) continue;
    used.add(evidenceId);
    symbols.push({
      evidenceId,
      filePath: selectedFilePath,
      startLine: index + 1,
      endLine: index + 1,
      name: symbol,
      kind: mappedKind,
      confidence: "observed",
      symbol,
      text: line.trim(),
    });
    if (used.size >= 12) break;
  }

  if (symbols.length === 0) {
    symbols.push({
      evidenceId: "symbol-default-1",
      filePath: selectedFilePath,
      startLine: 1,
      endLine: 1,
      name: "defaultSymbol",
      kind: "const",
      confidence: "observed",
      text: fileLines[0] ?? "",
      symbol: "defaultSymbol",
    });
  }

  return {
    selectedFilePath,
    userIntent: spec.user_intent ?? "Assess local ownership boundaries",
    excerpts,
    symbols,
  };
}

function buildFixture(specPath: string): LoadedFixture {
  const fixtureSpec = safeReadJson<FixtureSpec>(specPath);
  const selectedFilePath = normalizePath(fixtureSpec.selected_file_path);
  const sourceLines = fixtureSourceLines(fixtureSpec);
  if (sourceLines.length === 0) {
    throw new Error(`fixture has no source lines: ${fixtureSpec.fixture_id}`);
  }

  const appended = [...sourceLines];
  const repeatCount = fixtureSpec.append_repeat_count ?? 0;
  const block = fixtureSpec.append_block ?? [];
  for (let index = 0; index < repeatCount; index += 1) {
    for (const line of block) {
      appended.push(line);
    }
  }

  const fileLines = appended;
  const fileContents = { [selectedFilePath]: fileLines.join("\n") };
  const evidencePack = buildEvidenceFromFixture(fixtureSpec, fileLines, selectedFilePath);
  const focusResult = buildFocusCandidates({
    evidencePack,
    fileContents,
    maxCandidates: 48,
  });

  return {
    fixtureSpec,
    filePath: selectedFilePath,
    fileLines,
    evidencePack,
    focusCandidates: focusResult.candidates,
    fileContents,
  };
}

function diagnosticsCodes(diagnostics: OwnershipPlannerDiagnostic[]): string[] {
  return diagnostics.map((entry) => entry.code);
}

function countsBySeverity(diagnostics: OwnershipPlannerDiagnostic[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const diagnostic of diagnostics) {
    counts[diagnostic.severity] = (counts[diagnostic.severity] ?? 0) + 1;
  }
  return counts;
}

function projectBatch(verification: OwnershipQuestionPlanVerification): QuestionBatch {
  const input: OwnershipQuestionPlanProjectionInput = {
    verification,
    fallbackQuestionBatch: {
      schema: "sibi-question-batch.v1",
      id: "question-batch:fallback-review",
      providerId: verification.acceptedPlan.providerId,
      generatedAt: verification.acceptedPlan.generatedAt,
      selectedFiles: [verification.acceptedPlan.selectedFilePath],
      questions: [],
      verifierDisposition: "rejected",
      rejectedQuestionIds: [],
      diagnostics: [
        {
          code: "question_batch_empty",
          severity: "blocked",
          message: "fallback batch for deterministic evals",
        },
      ],
    },
  };
  return projectOwnershipQuestionPlanToQuestionBatch(input);
}

function planAndVerification(
  fixture: LoadedFixture,
): {
  plan: OwnershipQuestionPlan;
  verification: OwnershipQuestionPlanVerification;
  batch: QuestionBatch;
} {
  const plan = buildOwnershipQuestionPlan({
    evidencePack: fixture.evidencePack,
    fileContents: fixture.fileContents,
    focusCandidates: fixture.focusCandidates,
    questionBudget: fixture.fixtureSpec.question_budget,
    providerId: fixture.fixtureSpec.provider_id,
    generatedAt: GENERATED_AT,
  });
  const verification = verifyOwnershipQuestionPlan({
    plan,
    evidencePack: fixture.evidencePack,
    fileContents: fixture.fileContents,
    maxQuestionBudget: fixture.fixtureSpec.question_budget,
  });
  const batch = projectBatch(verification);
  return { plan, verification, batch };
}

function clonePlan(plan: OwnershipQuestionPlan): OwnershipQuestionPlan {
  return JSON.parse(JSON.stringify(plan)) as OwnershipQuestionPlan;
}

function mutatePlanWithGenericOverview(plan: OwnershipQuestionPlan): void {
  const first = plan.questions[0];
  if (!first) return;
  first.questionText = "Can you give me an overall repository overview and explain how everything fits together?";
}

function mutatePlanWithMissingCitations(plan: OwnershipQuestionPlan): void {
  const first = plan.questions[0];
  if (!first) return;
  first.citations = [];
  first.evidenceIds = [];
}

function mutatePlanWithProjectSignalAndOutOfScope(plan: OwnershipQuestionPlan): void {
  const first = plan.questions[0];
  if (!first) return;
  if (first.citations[0] != null) {
    first.citations[0] = {
      ...first.citations[0],
      filePath: `${normalizePath(plan.selectedFilePath)}-external.tsx`,
    };
  }
  first.questionText = "This project level signal is the only confidence we have for this local component boundary.";
}

function mutatePlanWithInventedEvidence(plan: OwnershipQuestionPlan): void {
  const first = plan.questions[0];
  if (!first) return;
  first.evidenceIds = [...new Set([...(first.evidenceIds ?? []), "invented-evidence-id-7f8e9d"])];
}

function mutatePlanWithReadinessClaim(plan: OwnershipQuestionPlan): void {
  const first = plan.questions[0];
  if (!first) return;
  first.questionText = "This component is fully owned, production-ready, and ready to ship without changes.";
}

function removeRepairRefactorSignalFromPlan(plan: OwnershipQuestionPlan): void {
  for (const question of plan.questions) {
    question.phase = "components_rendering";
    question.questionText = "What is the ownership boundary for this selected local window?";
  }
}

function verifyMutatedPlan(
  fixture: LoadedFixture,
  basePlan: OwnershipQuestionPlan,
  mutate: (plan: OwnershipQuestionPlan) => void,
  maxQuestionBudget?: number,
): OwnershipQuestionPlanVerification {
  const mutatedPlan = clonePlan(basePlan);
  mutate(mutatedPlan);
  return verifyOwnershipQuestionPlan({
    plan: mutatedPlan,
    evidencePack: fixture.evidencePack,
    fileContents: fixture.fileContents,
    maxQuestionBudget: maxQuestionBudget ?? fixture.fixtureSpec.question_budget,
  });
}

function evidenceByLineIndex(question: PlannedOwnershipQuestion): EvidenceCitationLike[] {
  return question.citations.slice().sort((left, right) =>
    left.startLine - right.startLine || left.endLine - right.endLine || left.filePath.localeCompare(right.filePath)
  );
}

function buildCaseObservations(
  basePlan: OwnershipQuestionPlan,
  baseVerification: OwnershipQuestionPlanVerification,
  mutatedVerification: OwnershipQuestionPlanVerification | null,
  batch: QuestionBatch,
): CaseObservation {
  const active = mutatedVerification ?? baseVerification;
  const codes = diagnosticsCodes(active.diagnostics);
  return {
    baseline_planner_disposition: basePlan.verifierDisposition,
    baseline_unit_count: basePlan.units.length,
    baseline_question_count: basePlan.questions.length,
    baseline_plan_heuristics: {
      isLargeFile: basePlan.heuristics.isLargeFile,
      isComposite: basePlan.heuristics.isComposite,
      lineCount: basePlan.heuristics.lineCount,
    },
    observed_verification_kind: active.kind,
    question_reject_count: active.rejectedQuestions.length,
    diagnostic_codes: codes,
    diagnostics_by_severity: countsBySeverity(active.diagnostics),
    batch_disposition: batch.verifierDisposition,
    batch_question_count: batch.questions.length,
    batch_question_ids: batch.questions.map((question) => question.id),
    batch_diagnostics: batch.diagnostics,
    batch_codes: batch.diagnostics.map((entry) => entry.code),
  };
}

function checkCase(
  basePlan: OwnershipQuestionPlan,
  baseVerification: OwnershipQuestionPlanVerification,
  mutatedVerification: OwnershipQuestionPlanVerification | null,
  extra: {
    mustHaveCodes?: string[];
    mustNotHaveCodes?: string[];
    expectKind?: OwnershipQuestionPlanDisposition;
    disallowRejected?: boolean;
    expectPlanLargeFile?: boolean;
    expectPlanSmallFile?: boolean;
    expectedUnitMax?: number;
    expectedUnitMin?: number;
    expectedAcceptedQuestionsMin?: number;
    expectedAcceptedQuestionsMax?: number;
    expectProjectionQuestions?: number;
    projectionCanBeEmpty?: boolean;
  },
): { mismatches: CaseResult["mismatches"]; observation: CaseObservation } {
  const active = mutatedVerification ?? baseVerification;
  const batch = active.kind === "accepted_with_questions" || active.kind === "accepted"
    ? projectOwnershipQuestionPlanToQuestionBatch({ verification: active })
    : projectBatch(active);
  const observation = buildCaseObservations(basePlan, baseVerification, active, batch);
  const mismatches: CaseResult["mismatches"] = [];

  const activeCodes = diagnosticsCodes(active.diagnostics);
  for (const expected of extra.mustHaveCodes ?? []) {
    if (!activeCodes.includes(expected)) {
      mismatches.push({
        field: "diagnostics",
        expected: `contains ${expected}`,
        actual: activeCodes,
      });
    }
  }
  for (const banned of extra.mustNotHaveCodes ?? []) {
    if (activeCodes.includes(banned)) {
      mismatches.push({
        field: "diagnostics",
        expected: `does not contain ${banned}`,
        actual: activeCodes,
      });
    }
  }

  if (extra.expectKind !== undefined && active.kind !== extra.expectKind) {
    mismatches.push({
      field: "verification_kind",
      expected: extra.expectKind,
      actual: active.kind,
    });
  }
  if (extra.disallowRejected && active.kind === "rejected") {
    mismatches.push({
      field: "verification_kind",
      expected: "not rejected",
      actual: active.kind,
    });
  }
  if (extra.expectPlanLargeFile === true && !basePlan.heuristics.isLargeFile) {
    mismatches.push({
      field: "isLargeFile",
      expected: true,
      actual: basePlan.heuristics.isLargeFile,
    });
  }
  if (extra.expectPlanSmallFile === true && basePlan.heuristics.isLargeFile) {
    mismatches.push({
      field: "isLargeFile",
      expected: false,
      actual: basePlan.heuristics.isLargeFile,
    });
  }
  if (extra.expectedUnitMax !== undefined && basePlan.units.length > extra.expectedUnitMax) {
    mismatches.push({
      field: "unit_count_max",
      expected: `<= ${extra.expectedUnitMax}`,
      actual: basePlan.units.length,
    });
  }
  if (extra.expectedUnitMin !== undefined && basePlan.units.length < extra.expectedUnitMin) {
    mismatches.push({
      field: "unit_count_min",
      expected: `>= ${extra.expectedUnitMin}`,
      actual: basePlan.units.length,
    });
  }
  if (extra.expectedAcceptedQuestionsMin !== undefined && active.acceptedQuestions.length < extra.expectedAcceptedQuestionsMin) {
    mismatches.push({
      field: "accepted_questions_min",
      expected: `>= ${extra.expectedAcceptedQuestionsMin}`,
      actual: active.acceptedQuestions.length,
    });
  }
  if (extra.expectedAcceptedQuestionsMax !== undefined && active.acceptedQuestions.length > extra.expectedAcceptedQuestionsMax) {
    mismatches.push({
      field: "accepted_questions_max",
      expected: `<= ${extra.expectedAcceptedQuestionsMax}`,
      actual: active.acceptedQuestions.length,
    });
  }
  if (extra.expectProjectionQuestions === undefined) {
    // no-op
  } else if (extra.expectProjectionQuestions >= 0 && batch.questions.length !== extra.expectProjectionQuestions) {
    mismatches.push({
      field: "batch_question_count",
      expected: extra.expectProjectionQuestions,
      actual: batch.questions.length,
    });
  }
  if (extra.projectionCanBeEmpty === false && batch.questions.length === 0) {
    mismatches.push({
      field: "batch_question_count",
      expected: "non-empty",
      actual: 0,
    });
  }

  // Stabilize the evidence order for readability and avoid opaque diff noise.
  for (const question of active.acceptedQuestions) {
    question.citations = evidenceByLineIndex(question);
  }

  return { mismatches, observation };
}

function runLargeMultiUnitCase(fixture: LoadedFixture): { observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">; mismatches: CaseResult["mismatches"] } {
  const { plan, verification } = planAndVerification(fixture);
  const { mismatches, observation } = checkCase(plan, verification, null, {
    expectPlanLargeFile: true,
    disallowRejected: true,
    expectedUnitMin: 4,
    expectedAcceptedQuestionsMin: 2,
    mustNotHaveCodes: ["question_generic_overview", "question_readiness_or_ownership_claim", "question_project_signal_only"],
    projectionCanBeEmpty: false,
  });
  const extra = observation.batch_question_count ?? 0;
  if (extra > 0 && observation.batch_disposition === "rejected") {
    mismatches.push({
      field: "batch_disposition",
      expected: "non-rejected",
      actual: observation.batch_disposition,
    });
  }
  return { observations: observation, mismatches };
}

function runSmallCompactCase(fixture: LoadedFixture): { observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">; mismatches: CaseResult["mismatches"] } {
  const { plan, verification } = planAndVerification(fixture);
  const { mismatches, observation } = checkCase(plan, verification, null, {
    expectPlanSmallFile: true,
    disallowRejected: true,
    expectedUnitMax: 8,
    expectedAcceptedQuestionsMax: 6,
    projectionCanBeEmpty: false,
  });
  return { observations: observation, mismatches };
}

function runInvalidGenericOverviewCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, mutatePlanWithGenericOverview);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    expectKind: "accepted_with_questions",
    mustHaveCodes: ["question_generic_overview"],
  });
  return { observations: observation, mismatches };
}

function runInvalidMissingCitationsCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, mutatePlanWithMissingCitations);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    expectKind: "accepted_with_questions",
    mustHaveCodes: ["question_missing_citations"],
  });
  return { observations: observation, mismatches };
}

function runInvalidProjectSignalOrScopeCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, mutatePlanWithProjectSignalAndOutOfScope);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    mustHaveCodes: ["question_project_signal_only", "question_citation_out_of_scope"],
    expectKind: "accepted_with_questions",
  });
  return { observations: observation, mismatches };
}

function runInvalidOverBudgetCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, (reorderedPlan) => {
    reorderedPlan.questions = [...reorderedPlan.questions];
    const first = reorderedPlan.questions[0];
    if (!first) return;
    first.phase = "repair_refactor";
    if (!/repair|refactor/i.test(first.questionText)) {
      first.questionText = `${first.questionText} What is the smallest repair path before declaring ownership?`;
    }
  }, 1);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    mustHaveCodes: ["question_count_exceeded"],
    expectedAcceptedQuestionsMax: 1,
    expectKind: "accepted_with_questions",
  });
  return { observations: observation, mismatches };
}

function runInvalidInventedEvidenceCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, mutatePlanWithInventedEvidence);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    expectKind: "accepted_with_questions",
    mustHaveCodes: ["question_invented_evidence_id"],
  });
  return { observations: observation, mismatches };
}

function runInvalidReadinessClaimCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, mutatePlanWithReadinessClaim);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    expectKind: "accepted_with_questions",
    mustHaveCodes: ["question_readiness_or_ownership_claim"],
  });
  return { observations: observation, mismatches };
}

function runInvalidMissingRepairGateCase(fixture: LoadedFixture): {
  observations: Omit<CaseObservation, "fixture_id" | "selected_file_path">;
  mismatches: CaseResult["mismatches"];
} {
  const { plan, verification } = planAndVerification(fixture);
  const active = verifyMutatedPlan(fixture, plan, removeRepairRefactorSignalFromPlan);
  const { mismatches, observation } = checkCase(plan, verification, active, {
    expectKind: "rejected",
    mustHaveCodes: ["missing_repair_refactor_gate"],
  });
  return { observations: observation, mismatches };
}

function runCase(definition: EvalCase, fixture: LoadedFixture): CaseResult {
  const { observations, mismatches } = definition.run(fixture);
  return {
    id: definition.id,
    title: definition.title,
    case_class: definition.case_class,
    passed: mismatches.length === 0,
    observations: {
      fixture_id: fixture.fixtureSpec.fixture_id,
      selected_file_path: fixture.filePath,
      ...observations,
    },
    mismatches,
  };
}

const EVAL_CASES: EvalCase[] = [
  {
    id: "OQP-001-LARGE-MULTI-UNITS",
    title: "Large React workbench file creates multiple ownership units and accepted local questions.",
    case_class: "large-file-multi-unit",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runLargeMultiUnitCase,
  },
  {
    id: "OQP-002-SMALL-COMPACT-FILE",
    title: "Small React workbench fixture stays compact and stays within a small question budget.",
    case_class: "small-file-compact",
    fixturePath: DEFAULT_SMALL_FIXTURE,
    run: runSmallCompactCase,
  },
  {
    id: "OQP-003-INVALID-GENERIC-OVERVIEW",
    title: "Generic overview question text is rejected.",
    case_class: "invalid-generic-overview",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidGenericOverviewCase,
  },
  {
    id: "OQP-004-INVALID-MISSING-CITATIONS",
    title: "Question without citations is rejected with missing-citations diagnostics.",
    case_class: "invalid-missing-citations",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidMissingCitationsCase,
  },
  {
    id: "OQP-005-INVALID-SCOPE-AND-SIGNAL",
    title: "Project-level signal wording and out-of-file citation are rejected.",
    case_class: "invalid-project-signal-or-out-of-scope-citation",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidProjectSignalOrScopeCase,
  },
  {
    id: "OQP-006-INVALID-OVER-BUDGET",
    title: "Over-budget questions are retained as partial plan and reported as exceeded.",
    case_class: "invalid-over-budget",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidOverBudgetCase,
  },
  {
    id: "OQP-007-INVALID-EVIDENCE-ID",
    title: "Invented evidence id is rejected as non-local evidence.",
    case_class: "invalid-invented-evidence-id",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidInventedEvidenceCase,
  },
  {
    id: "OQP-008-INVALID-READINESS-CLAIM",
    title: "Readiness/finality claims are rejected.",
    case_class: "invalid-readiness-claim",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidReadinessClaimCase,
  },
  {
    id: "OQP-009-INVALID-MISSING-REPAIR-GATE",
    title: "Missing repair/refactor gating for large/composite files is rejected.",
    case_class: "invalid-missing-repair-gate",
    fixturePath: DEFAULT_LARGE_FIXTURE,
    run: runInvalidMissingRepairGateCase,
  },
];

export function runOwnershipQuestionPlannerEval(
  options: CliOptions = {},
): EvalReport {
  const largeFixture = buildFixture(options.largeFixturePath ?? DEFAULT_LARGE_FIXTURE);
  const smallFixture = buildFixture(options.smallFixturePath ?? DEFAULT_SMALL_FIXTURE);
  const fixtureByPath = new Map<string, LoadedFixture>([
    [DEFAULT_LARGE_FIXTURE, largeFixture],
    [DEFAULT_SMALL_FIXTURE, smallFixture],
  ]);
  const cases: CaseResult[] = [];

  for (const definition of EVAL_CASES) {
    const fixture = fixtureByPath.get(definition.fixturePath);
    if (!fixture) {
      cases.push({
        id: definition.id,
        title: definition.title,
        case_class: definition.case_class,
        passed: false,
        observations: {
          fixture_id: "missing-fixture",
          selected_file_path: definition.fixturePath,
        },
        mismatches: [{
          field: "fixture",
          expected: `loadable fixture at ${definition.fixturePath}`,
          actual: "missing",
        }],
      });
      continue;
    }
    cases.push(runCase(definition, fixture));
  }

  const outputPath = resolve(options.reportPath ?? DEFAULT_REPORT);
  const aggregate = {
    total_cases: cases.length,
    passed_cases: cases.filter((entry) => entry.passed).length,
    failed_cases: cases.filter((entry) => !entry.passed).length,
    blocked_verification_cases: cases.filter(
      (entry) => entry.observations.observed_verification_kind === "rejected",
    ).length,
    accepted_with_questions_cases: cases.filter(
      (entry) => entry.observations.observed_verification_kind === "accepted_with_questions",
    ).length,
    rejected_cases: cases.filter((entry) => entry.observations.observed_verification_kind === "rejected").length,
    projection_batch_cases: cases.filter((entry) => entry.observations.batch_disposition !== undefined).length,
    projection_fallback_cases: cases.filter(
      (entry) => entry.observations.batch_codes?.includes("question_batch_empty"),
    ).length,
  };
  const generatedAt = options.generatedAt ?? GENERATED_AT;
  const report: EvalReport = {
    report_id: options.reportId ?? `${EVAL_VALIDATION_ID}-${generatedAt}`,
    generated_at: generatedAt,
    validation: EVAL_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    no_llm: true,
    command: {
      script: "pnpm eval:ownership-question-planner",
      executed_with: process.version,
      executed_at: new Date().toISOString(),
      report_path: toRepoRelative(outputPath),
    },
    aggregate,
    cases,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportArg = getFlagValue(process.argv, "report");
  const report = runOwnershipQuestionPlannerEval({
    reportPath: reportArg,
    largeFixturePath: getFlagValue(process.argv, "largeFixture"),
    smallFixturePath: getFlagValue(process.argv, "smallFixture"),
  });
  process.stdout.write(`${JSON.stringify(report.aggregate, null, 2)}\n`);
  if (report.aggregate.failed_cases > 0) {
    process.exitCode = 1;
  }
}
