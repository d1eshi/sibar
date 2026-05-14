import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DEFAULT_GOLD_CASE_INDEX = "docs/specs/selfhost/pilot/gold-cases/index.json";
const DEFAULT_MASTERY_CHECK_DIR = "docs/specs/selfhost/pilot/mastery-checks";
const FREEFORM_VALIDATION_ID = "VAL-EVAL-008-selfhost-freeform-first-slice";

const FIRST_SLICE_CASE_IDS = ["GC-001", "GC-002", "GC-003", "GC-006", "GC-008"] as const;

type FreeformFindingType = "readiness" | "evidence_gap" | "flow_gap" | "false_confidence_gap" | "design_induced_gap";
type IssueCandidateType = "none" | "LearningGap" | "DesignIssue";

type RawCaseIndex = {
  cases?: unknown;
};

type RawCaseEntry = {
  id?: unknown;
  path?: unknown;
  mastery_check_id?: unknown;
};

type RawGoldCase = {
  id?: unknown;
  mastery_check_id?: unknown;
  concept_id?: unknown;
  operation?: unknown;
  simulated_user_answer?: unknown;
  declared_confidence?: unknown;
  expected_gap_type?: unknown;
  expected_gap_present?: unknown;
  acceptable_issue_candidate_type?: unknown;
  expected_readiness?: unknown;
};

type RawMasteryCheck = {
  id?: unknown;
  concept_id?: unknown;
  operation?: unknown;
  prompt?: unknown;
  required_repo_evidence?: unknown;
  minimum_readiness?: unknown;
  repair_when_failed?: unknown;
  reevaluation_prompt?: unknown;
};

type RepoEvidenceInput = {
  path: string;
  rationale: string;
};

export type FreeformRepoEvidence = RepoEvidenceInput & {
  excerpt: string;
  exists: boolean;
};

export type FreeformEvaluationInput = {
  masteryCheck: {
    id: string;
    concept_id: string;
    operation: string;
    prompt: string;
    required_repo_evidence: RepoEvidenceInput[];
    minimum_readiness: string;
    reevaluation_prompt: string;
  };
  user_answer: string;
  declared_confidence?: string;
  bounded_repo_evidence: FreeformRepoEvidence[];
};

export type FreeformEvaluationFinding = {
  finding_type: FreeformFindingType;
  gap_present: boolean;
  concept_id: string;
  operation: string;
  readiness: string;
  issue_candidate_type: IssueCandidateType;
  user_evidence_excerpt: string;
  repo_evidence_citations: FreeformRepoEvidence[];
  user_evidence_attached: boolean;
  repo_evidence_attached: boolean;
  contradiction_or_insufficiency: string;
  missing_reasoning_step: string;
  repair_task: string | null;
  reevaluation_prompt: string | null;
};

export type SelfhostFreeformCaseResult = {
  case_id: string;
  mastery_check_id: string;
  expected_finding_type: FreeformFindingType;
  observed_finding_type: FreeformFindingType;
  expected_issue_candidate_type: IssueCandidateType;
  observed_issue_candidate_type: IssueCandidateType;
  user_evidence_attached: boolean;
  repo_evidence_attached: boolean;
  passed: boolean;
  finding: FreeformEvaluationFinding;
};

export type SelfhostFreeformReport = {
  generated_at: string;
  validation: string;
  gold_case_index_path: string;
  cases: SelfhostFreeformCaseResult[];
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    user_evidence_attached_cases: number;
    repo_evidence_attached_cases: number;
  };
};

type SelfhostFreeformOptions = {
  indexPath?: string;
  masteryCheckDir?: string;
  reportPath?: string;
};

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);

  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[spacedIndex + 1];

  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function normalizeRequiredEvidence(value: unknown): RepoEvidenceInput[] {
  return asArray(value).map((entry) => {
    const object = asObject(entry);
    return {
      path: asString(object?.path) ?? "",
      rationale: asString(object?.rationale) ?? "",
    };
  }).filter((entry) => entry.path.length > 0);
}

function selectRepoExcerpt(fileContents: string): string {
  const lines = fileContents.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  return lines.find((line) => /included_paths|excluded_paths|isExcluded|isIncluded|bounded_evidence|artifact_boundary|citationIsInside/.test(line))
    ?? lines[0]
    ?? "";
}

function loadRepoEvidence(requiredEvidence: RepoEvidenceInput[]): FreeformRepoEvidence[] {
  return requiredEvidence.map((entry) => {
    const absolutePath = resolve(entry.path);
    const exists = existsSync(absolutePath);
    const excerpt = exists ? selectRepoExcerpt(readFileSync(absolutePath, "utf8")) : "";

    return { ...entry, excerpt, exists };
  });
}

function firstSentence(answer: string): string {
  return answer.split(/(?<=[.!?])\s+/)[0]?.trim() || answer.trim();
}

function answerMentionsRequiredPath(answer: string, evidence: FreeformRepoEvidence[]): boolean {
  return evidence.some((entry) => entry.path.length > 0 && answer.includes(entry.path));
}

function repairTaskFor(findingType: FreeformFindingType): string | null {
  switch (findingType) {
    case "readiness":
      return null;
    case "evidence_gap":
      return "Restate the same answer with explicit in-boundary file citations and one allowed/blocked path example.";
    case "flow_gap":
      return "Trace the boundary sequence end-to-end and connect each phase to repository evidence.";
    case "false_confidence_gap":
      return "Re-ground the confidence claim by contrasting manifest boundaries with excluded-path behavior.";
    case "design_induced_gap":
      return "Clarify the product affordance that makes manifest enforcement visible, then retry the boundary trace.";
  }
}

function insufficiencyFor(findingType: FreeformFindingType): string {
  switch (findingType) {
    case "readiness":
      return "No gap: the answer cites in-boundary repo paths and gives bounded readiness only.";
    case "evidence_gap":
      return "The answer may be semantically plausible, but it does not cite concrete in-boundary repo evidence.";
    case "flow_gap":
      return "The answer names boundary concepts but cannot trace the full sequence across the slice.";
    case "false_confidence_gap":
      return "The answer is high-confidence while contradicting the boundary rule that exclusions matter.";
    case "design_induced_gap":
      return "The answer treats the manifest as unclear product affordance rather than executed boundary policy.";
  }
}

function missingStepFor(findingType: FreeformFindingType): string {
  switch (findingType) {
    case "readiness":
      return "No missing step for this bounded check.";
    case "evidence_gap":
      return "Attach path-specific repo citations to the conceptual explanation.";
    case "flow_gap":
      return "Connect session setup, graph generation, filtering, and citation emission in order.";
    case "false_confidence_gap":
      return "Check the confidence claim against manifest include/exclude evidence before asserting scope.";
    case "design_induced_gap":
      return "Separate product wording confusion from the executable enforcement behavior.";
  }
}

export function evaluateFreeformOwnershipAnswer(input: FreeformEvaluationInput): FreeformEvaluationFinding {
  const answer = input.user_answer.trim();
  const lower = answer.toLowerCase();
  const confidence = input.declared_confidence?.toLowerCase() ?? "";
  const hasRepoCitation = answerMentionsRequiredPath(answer, input.bounded_repo_evidence);
  const repoEvidence = input.bounded_repo_evidence.filter((entry) => entry.exists && entry.excerpt.length > 0).slice(0, 3);

  let findingType: FreeformFindingType;
  if ((confidence === "high" || lower.includes("certain")) && (lower.includes("all files under the repo root") || lower.includes("excluded paths do not matter"))) {
    findingType = "false_confidence_gap";
  } else if ((lower.includes("style document") || lower.includes("not an enforcement rule")) && (lower.includes("excluded") || lower.includes("docs"))) {
    findingType = "design_induced_gap";
  } else if (lower.includes("mixed") || lower.includes("cannot explain") || lower.includes("full sequence")) {
    findingType = "flow_gap";
  } else if (!hasRepoCitation) {
    findingType = "evidence_gap";
  } else {
    findingType = "readiness";
  }

  const gapPresent = findingType !== "readiness";
  const hasUserEvidence = answer.length > 0;
  const hasRepoEvidence = repoEvidence.length > 0;
  if (gapPresent && (!hasUserEvidence || !hasRepoEvidence)) {
    throw new Error("invalid_gap_without_user_and_repo_evidence");
  }
  if (!gapPresent && (!hasUserEvidence || !hasRepoEvidence)) {
    throw new Error("invalid_readiness_without_user_and_repo_evidence");
  }

  const issueCandidateType: IssueCandidateType = findingType === "readiness"
    ? "none"
    : findingType === "design_induced_gap"
      ? "DesignIssue"
      : "LearningGap";

  return {
    finding_type: findingType,
    gap_present: gapPresent,
    concept_id: input.masteryCheck.concept_id,
    operation: input.masteryCheck.operation,
    readiness: gapPresent ? "not ready yet" : "ready to modify with guardrails",
    issue_candidate_type: issueCandidateType,
    user_evidence_excerpt: firstSentence(answer),
    repo_evidence_citations: repoEvidence,
    user_evidence_attached: hasUserEvidence,
    repo_evidence_attached: hasRepoEvidence,
    contradiction_or_insufficiency: insufficiencyFor(findingType),
    missing_reasoning_step: missingStepFor(findingType),
    repair_task: repairTaskFor(findingType),
    reevaluation_prompt: gapPresent ? input.masteryCheck.reevaluation_prompt : null,
  };
}

function expectedFindingType(goldCase: RawGoldCase): FreeformFindingType {
  const expectedGapType = asString(goldCase.expected_gap_type);
  if (expectedGapType === null && goldCase.expected_gap_present === false) return "readiness";
  if (expectedGapType === "evidence_gap" || expectedGapType === "flow_gap" || expectedGapType === "false_confidence_gap" || expectedGapType === "design_induced_gap") {
    return expectedGapType;
  }
  return "flow_gap";
}

function loadMasteryCheck(masteryCheckDir: string, masteryCheckID: string): FreeformEvaluationInput["masteryCheck"] {
  const payload = readJsonFile<RawMasteryCheck>(resolve(masteryCheckDir, `${masteryCheckID}.json`));
  return {
    id: asString(payload.id) ?? masteryCheckID,
    concept_id: asString(payload.concept_id) ?? "",
    operation: asString(payload.operation) ?? "",
    prompt: asString(payload.prompt) ?? "",
    required_repo_evidence: normalizeRequiredEvidence(payload.required_repo_evidence),
    minimum_readiness: asString(payload.minimum_readiness) ?? "not ready yet",
    reevaluation_prompt: asString(payload.reevaluation_prompt) ?? "",
  };
}

export function runSelfhostFreeformEval(options: SelfhostFreeformOptions = {}): SelfhostFreeformReport {
  const goldCaseIndexPath = resolve(options.indexPath ?? DEFAULT_GOLD_CASE_INDEX);
  const masteryCheckDir = resolve(options.masteryCheckDir ?? DEFAULT_MASTERY_CHECK_DIR);
  const indexPayload = readJsonFile<RawCaseIndex>(goldCaseIndexPath);
  const caseEntries = asArray(indexPayload.cases)
    .map((entry) => asObject(entry) as RawCaseEntry | null)
    .filter((entry): entry is RawCaseEntry => entry !== null && FIRST_SLICE_CASE_IDS.includes(asString(entry.id) as typeof FIRST_SLICE_CASE_IDS[number]));

  const cases = caseEntries.map((entry) => {
    const relativeCasePath = asString(entry.path) ?? "";
    const casePayload = readJsonFile<RawGoldCase>(resolve(dirname(goldCaseIndexPath), relativeCasePath));
    const masteryCheckID = asString(casePayload.mastery_check_id) ?? asString(entry.mastery_check_id) ?? "";
    const masteryCheck = loadMasteryCheck(masteryCheckDir, masteryCheckID);
    const finding = evaluateFreeformOwnershipAnswer({
      masteryCheck,
      user_answer: asString(casePayload.simulated_user_answer) ?? "",
      declared_confidence: asString(casePayload.declared_confidence) ?? undefined,
      bounded_repo_evidence: loadRepoEvidence(masteryCheck.required_repo_evidence),
    });
    const expectedType = expectedFindingType(casePayload);
    const expectedIssueType = (asString(casePayload.acceptable_issue_candidate_type) ?? "LearningGap") as IssueCandidateType;
    const passed = finding.finding_type === expectedType
      && finding.issue_candidate_type === expectedIssueType
      && finding.user_evidence_attached
      && finding.repo_evidence_attached;

    return {
      case_id: asString(casePayload.id) ?? asString(entry.id) ?? "",
      mastery_check_id: masteryCheckID,
      expected_finding_type: expectedType,
      observed_finding_type: finding.finding_type,
      expected_issue_candidate_type: expectedIssueType,
      observed_issue_candidate_type: finding.issue_candidate_type,
      user_evidence_attached: finding.user_evidence_attached,
      repo_evidence_attached: finding.repo_evidence_attached,
      passed,
      finding,
    };
  });

  const report: SelfhostFreeformReport = {
    generated_at: new Date().toISOString(),
    validation: FREEFORM_VALIDATION_ID,
    gold_case_index_path: goldCaseIndexPath,
    cases,
    aggregate: {
      total_cases: cases.length,
      passed_cases: cases.filter((entry) => entry.passed).length,
      failed_cases: cases.filter((entry) => !entry.passed).length,
      user_evidence_attached_cases: cases.filter((entry) => entry.user_evidence_attached).length,
      repo_evidence_attached_cases: cases.filter((entry) => entry.repo_evidence_attached).length,
    },
  };

  if (options.reportPath) {
    const reportPath = resolve(options.reportPath);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const indexArg = getFlagValue(process.argv, "index");
  const reportArg = getFlagValue(process.argv, "report");
  const report = runSelfhostFreeformEval({ indexPath: indexArg, reportPath: reportArg });

  process.stdout.write(`${JSON.stringify(report.aggregate, null, 2)}\n`);
  if (report.aggregate.failed_cases > 0) process.exitCode = 1;
}
