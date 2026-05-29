import type { EvidencePackLike } from "../focus-question/index.ts";
import type {
  OwnershipPlannerDiagnostic,
  OwnershipQuestionPlan,
  OwnershipQuestionPlanDisposition,
  OwnershipQuestionPlanVerification,
  PlannedOwnershipQuestion,
} from "./contracts.ts";

function normalizePath(path: string): string {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function splitLines(value: string): string[] {
  if (value.length === 0) return [];
  return value.replace(/\r/g, "").split("\n");
}

function isGenericOverview(text: string): boolean {
  return /\b(overall repository|whole project|big picture|project-level|overall project|project overview)\b/i.test(text);
}

function isProjectSignalOnly(text: string): boolean {
  return /\b(project[-\s]level|project level|overall project|project overview|whole project)\b/i.test(text)
    && !/\bline|local file|this file|ownership boundary|selected file|this range|selected range\b/i.test(text);
}

function hasReadinessOrOwnershipClaim(text: string): boolean {
  return /\b(ready|owned|production-ready|production ready|finality|final)\b/i.test(text);
}

function hasRepairOrRefactorSignal(text: string): boolean {
  return /\b(repair|refactor|uncertainty|smallest repair|smallest refactor)\b/i.test(text);
}

function knownEvidenceIds(evidencePack: EvidencePackLike, selectedFilePath: string): Set<string> {
  const normalizedFile = normalizePath(selectedFilePath);
  const known = new Set<string>();
  for (const excerpt of evidencePack.excerpts) {
    if (normalizePath(excerpt.filePath) === normalizedFile) {
      known.add(excerpt.evidenceId);
    }
  }
  for (const symbol of evidencePack.symbols) {
    if (normalizePath(symbol.filePath) === normalizedFile) {
      known.add(symbol.evidenceId);
    }
  }
  return known;
}

function makeDiagnostic(
  code: OwnershipPlannerDiagnostic["code"],
  severity: OwnershipPlannerDiagnostic["severity"],
  message: string,
  question: PlannedOwnershipQuestion,
): OwnershipPlannerDiagnostic {
  return {
    code,
    severity,
    message,
    questionId: question.id,
    focusCandidateId: question.focusCandidateId,
  };
}

function isLineRangeInvalid(citationStart: number, citationEnd: number, lineCount: number): boolean {
  return citationStart < 1 || citationEnd < 1 || citationStart > citationEnd || citationStart > lineCount || citationEnd > lineCount;
}

type VerifyOwnershipQuestionPlanInput = {
  plan: OwnershipQuestionPlan;
  evidencePack: EvidencePackLike;
  fileContents: Record<string, string>;
  maxQuestionBudget?: number;
};

export function verifyOwnershipQuestionPlan(input: VerifyOwnershipQuestionPlanInput): OwnershipQuestionPlanVerification {
  const selectedFilePath = normalizePath(input.plan.selectedFilePath);
  const maxQuestionBudget = input.maxQuestionBudget ?? input.plan.heuristics.maxQuestions;
  const lineCount = splitLines(input.fileContents[selectedFilePath] ?? "").length;
  const knownEvidence = knownEvidenceIds(input.evidencePack, selectedFilePath);
  const largeFileNeedsRepairGate = input.plan.heuristics.isLargeFile && input.plan.heuristics.isComposite;
  const hasRepairGate = input.plan.questions.some((question) => hasRepairOrRefactorSignal(question.questionText) || question.phase === "repair_refactor");

  const acceptedQuestions: PlannedOwnershipQuestion[] = [];
  const rejectedQuestions: PlannedOwnershipQuestion[] = [];
  const blockedQuestionIds: string[] = [];
  const rejectedQuestionIds: string[] = [];
  const diagnostics: OwnershipPlannerDiagnostic[] = [];
  const reasons: string[] = [];

  for (let index = 0; index < input.plan.questions.length; index += 1) {
    const question = input.plan.questions[index];
    const issues: OwnershipPlannerDiagnostic[] = [];

    if (question.citations.length === 0) {
      issues.push(makeDiagnostic("question_missing_citations", "blocked", `Question '${question.id}' has no citations.`, question));
    } else {
      const hasSelectedFileCitation = question.citations.some(
        (citation) => normalizePath(citation.filePath) === selectedFilePath,
      );
      if (!hasSelectedFileCitation) {
        issues.push(makeDiagnostic(
          "question_selected_file_citation_missing",
          "blocked",
          `Question '${question.id}' has no citation from selected file ${selectedFilePath}.`,
          question,
        ));
      }
    }

    for (const citation of question.citations) {
      if (normalizePath(citation.filePath) !== selectedFilePath) {
        issues.push(makeDiagnostic(
          "question_citation_out_of_scope",
          "blocked",
          `Question '${question.id}' cites '${citation.filePath}', which is outside ${selectedFilePath}.`,
          question,
        ));
      }

      if (isLineRangeInvalid(citation.startLine, citation.endLine, lineCount)) {
        issues.push(makeDiagnostic(
          "question_invalid_line_range",
          "blocked",
          `Question '${question.id}' has invalid range ${citation.startLine}-${citation.endLine} for ${citation.filePath}.`,
          question,
        ));
      }
    }

    for (const evidenceId of question.evidenceIds) {
      if (!knownEvidence.has(evidenceId)) {
        issues.push(makeDiagnostic(
          "question_invented_evidence_id",
          "blocked",
          `Question '${question.id}' references invented evidence id '${evidenceId}'.`,
          question,
        ));
      }
    }

    if (isProjectSignalOnly(question.questionText)) {
      issues.push(makeDiagnostic(
        "question_project_signal_only",
        "blocked",
        `Question '${question.id}' relies on project-level signal rather than selected-file evidence.`,
        question,
      ));
    }

    if (isGenericOverview(question.questionText)) {
      issues.push(makeDiagnostic(
        "question_generic_overview",
        "blocked",
        `Question '${question.id}' is a generic overview question instead of local ownership review.`,
        question,
      ));
    }

    if (hasReadinessOrOwnershipClaim(question.questionText)) {
      issues.push(makeDiagnostic(
        "question_readiness_or_ownership_claim",
        "blocked",
        `Question '${question.id}' includes readiness/ownership-finality language.`,
        question,
      ));
    }

    if (index >= maxQuestionBudget) {
      issues.push(makeDiagnostic(
        "question_count_exceeded",
        "warning",
        `Question '${question.id}' exceeds budget ${maxQuestionBudget} and was dropped.`,
        question,
      ));
    }

    if (largeFileNeedsRepairGate && !hasRepairGate) {
      issues.push(makeDiagnostic(
        "missing_repair_refactor_gate",
        "blocked",
        `Question '${question.id}' is missing a repair/refactor or uncertainty gate for a large composite file.`,
        question,
      ));
    }

    if (issues.length === 0) {
      acceptedQuestions.push(question);
      continue;
    }

    rejectedQuestions.push(question);
    rejectedQuestionIds.push(question.id);
    if (issues.some((issue) => issue.severity === "blocked")) {
      blockedQuestionIds.push(question.id);
    }
    diagnostics.push(...issues);
  }

  const hasBlocked = diagnostics.some((issue) => issue.severity === "blocked");
  const hasWarning = diagnostics.some((issue) => issue.severity === "warning");

  let kind: OwnershipQuestionPlanDisposition;
  if (acceptedQuestions.length === 0) {
    kind = hasBlocked || hasWarning ? "rejected" : "rejected";
  } else if (hasBlocked) {
    kind = "accepted_with_questions";
  } else if (hasWarning) {
    kind = "accepted_with_questions";
  } else {
    kind = "accepted";
  }

  reasons.push(...Array.from(new Set(diagnostics.map((entry) => entry.code))));

  return {
    kind,
    acceptedPlan: {
      ...input.plan,
      verifierDisposition: kind,
      diagnostics,
    },
    acceptedQuestions,
    rejectedQuestions,
    blockedQuestionIds,
    rejectedQuestionIds,
    reasons,
    diagnostics,
  };
}
