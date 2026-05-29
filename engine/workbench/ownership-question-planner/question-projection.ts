import {
  QUESTION_BATCH_SCHEMA,
} from "../focus-question/contracts.ts";
import type {
  Question,
  QuestionBatch,
  QuestionBatchDiagnostic,
  QuestionIntent,
  QuestionState,
} from "../focus-question/contracts.ts";
import type { AnswerStyle } from "../../pedagogy/questions.ts";
import type { UserOperationKind } from "../../pedagogy-core/index.ts";
import type { OwnershipQuestionPlanVerification, PlannedOwnershipQuestion } from "./contracts.ts";

function sanitizeQuestionText(text: string): string {
  return text
    .replace(/^\s*\d+\)\s*/, "")
    .replace(/^\s*[0-9]+\.\s*/, "")
    .trim();
}

function inferIntent(questionText: string): QuestionIntent {
  const lower = questionText.toLowerCase();
  if (/\b(trace|walk|flow|sequence|through)\b/.test(lower)) return "trace";
  if (/\b(predict|risk|edge|if .* changed|if .* removed|what if)\b/.test(lower)) return "predict_change";
  if (/\b(gap|uncertain|missing|what else|i don't know|don't know)\b/.test(lower)) return "find_gap";
  if (/\b(relation|connect|depends|owned|boundary|owned by)\b/.test(lower)) return "connect_relation";
  return "explain";
}

function answerStyleFromIntent(intent: QuestionIntent): AnswerStyle {
  if (intent === "trace") return "system_walkthrough";
  if (intent === "predict_change") return "risk_analysis";
  if (intent === "find_gap") return "study_request";
  if (intent === "connect_relation") return "boundary_explanation";
  return "short_explanation";
}

function operationKindFromIntent(intent: QuestionIntent): UserOperationKind {
  if (intent === "trace") return "trace";
  if (intent === "predict_change") return "predict";
  if (intent === "connect_relation") return "transfer";
  return "explain";
}

function uniqueEvidenceIds(question: PlannedOwnershipQuestion): string[] {
  return question.evidenceIds.filter((value, index, values) => values.indexOf(value) === index);
}

function mapQuestionToUi(question: PlannedOwnershipQuestion, state: QuestionState): Question {
  const intent = inferIntent(question.questionText);
  return {
    schema: "sibi-ui-question.v1",
    id: question.id,
    batchId: question.batchId,
    focusCandidateId: question.focusCandidateId,
    filePath: question.filePath,
    prompt: sanitizeQuestionText(question.questionText),
    intent,
    operationKind: operationKindFromIntent(intent),
    answerStyle: answerStyleFromIntent(intent),
    citations: question.citations,
    evidenceIds: uniqueEvidenceIds(question),
    whyThisMatters: question.whyThisMatters,
    answerPlaceholder: question.answerPlaceholder,
    state,
    verifierDisposition: question.verifierDisposition,
  };
}

export function projectOwnershipQuestionPlanToQuestions(
  input: OwnershipQuestionPlanVerification,
): Question[] {
  return input.acceptedQuestions.map((question, index) =>
    mapQuestionToUi(question, index === 0 ? "active" : "pending"),
  );
}

export function projectOwnershipQuestionPlanToQuestionBatch(
  input: { verification: OwnershipQuestionPlanVerification; fallbackQuestionBatch?: QuestionBatch },
): QuestionBatch {
  if (input.verification.kind === "rejected" && input.verification.acceptedQuestions.length === 0) {
    return input.fallbackQuestionBatch ?? {
      schema: QUESTION_BATCH_SCHEMA,
      id: `question-batch:${input.verification.acceptedPlan.providerId}:fallback`,
      providerId: input.verification.acceptedPlan.providerId,
      generatedAt: input.verification.acceptedPlan.generatedAt,
      selectedFiles: [input.verification.acceptedPlan.selectedFilePath],
      questions: [],
      verifierDisposition: "rejected",
      rejectedQuestionIds: input.verification.rejectedQuestions.map((question) => question.id),
      diagnostics: [{
        code: "question_batch_empty",
        severity: "blocked",
        message: "All planned ownership questions were rejected.",
      }],
    };
  }

  const questions = projectOwnershipQuestionPlanToQuestions(input.verification);
  const diagnostics: QuestionBatchDiagnostic[] = input.verification.diagnostics.map((entry) => ({
    code: "provider_schema_invalid",
    severity: entry.severity,
    message: entry.message,
    questionId: entry.questionId,
    focusCandidateId: entry.focusCandidateId,
  }));

  return {
    schema: QUESTION_BATCH_SCHEMA,
    id: `question-batch:${input.verification.acceptedPlan.providerId}:${input.verification.acceptedPlan.generatedAt}`,
    providerId: input.verification.acceptedPlan.providerId,
    generatedAt: input.verification.acceptedPlan.generatedAt,
    selectedFiles: [...new Set(questions.map((question) => question.filePath))],
    questions,
    verifierDisposition: input.verification.kind === "accepted" ? "accepted" : "accepted_with_questions",
    rejectedQuestionIds: input.verification.rejectedQuestions.map((question) => question.id),
    diagnostics,
  };
}
