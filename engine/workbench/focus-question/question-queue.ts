import type {
  BuildQuestionQueueInput,
  Question,
  QuestionQueueProjection,
  QuestionState,
} from "./contracts.ts";
import { QUESTION_QUEUE_SCHEMA } from "./contracts.ts";

function titleForQuestion(question: Question): string {
  const normalizedPrompt = question.prompt.trim().replace(/^\s*\d+\)\s*/,"");
  const firstSentence = normalizedPrompt
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)[0]
    ?.trim();
  const title = (firstSentence && firstSentence.length > 0 ? firstSentence : question.intent).trim();
  return title.length > 140 ? `${title.slice(0, 137).trimEnd()}...` : title;
}

function isAttemptable(question: Question): boolean {
  return question.state !== "blocked" && question.state !== "complete";
}

export function buildQuestionQueueProjection({
  batch,
  activeQuestionId = null,
}: BuildQuestionQueueInput): QuestionQueueProjection {
  const selectedActive =
    batch.questions.find((question) => question.id === activeQuestionId && isAttemptable(question)) ??
    batch.questions.find((question) => question.state === "active" && isAttemptable(question)) ??
    batch.questions.find(isAttemptable) ??
    null;

  const items = batch.questions.map((question, index) => ({
    questionId: question.id,
    focusCandidateId: question.focusCandidateId,
    filePath: question.filePath,
    title: titleForQuestion(question),
    state: selectedActive?.id === question.id && question.state === "pending" ? "active" as QuestionState : question.state,
    orderReason: index === 0 ? "first verified question" : `verified queue item ${index + 1}`,
  }));

  const progress = {
    total: items.length,
    complete: items.filter((item) => item.state === "complete").length,
    attempted: items.filter((item) => item.state === "attempted" || item.state === "repair_needed").length,
    blocked: items.filter((item) => item.state === "blocked").length,
  };

  const firstBlockedDiagnostic = batch.diagnostics.find((diagnostic) => diagnostic.severity === "blocked");
  const blockedState =
    selectedActive == null
      ? {
          code: firstBlockedDiagnostic?.code ?? "question_queue_empty",
          message: firstBlockedDiagnostic?.message ?? "No attemptable question is available.",
          detail: batch.diagnostics.map((diagnostic) => diagnostic.message).join("\n") || undefined,
        }
      : undefined;

  return {
    schema: QUESTION_QUEUE_SCHEMA,
    activeQuestionId: selectedActive?.id ?? null,
    activeFocusCandidateId: selectedActive?.focusCandidateId ?? null,
    items,
    progress,
    blockedState,
  };
}
