import type {
  BuildQuestionBatchInput,
  EvidenceCitationLike,
  FocusCandidate,
  Question,
  QuestionBatch,
  QuestionBatchDiagnostic,
  QuestionIntent,
  VerifiedClaimLike,
} from "./contracts.ts";
import { QUESTION_BATCH_SCHEMA } from "./contracts.ts";
import { findFocusCandidateForCitation, stableFocusQuestionHash } from "./focus-candidates.ts";
import type { AnswerStyle } from "../../pedagogy/questions.ts";
import type { UserOperationKind } from "../../pedagogy-core/index.ts";

function normalizePath(path: string): string {
  return String(path ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

function collapseWhitespace(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, limit = 220): string {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function firstSentence(value: string, limit = 160): string {
  const normalized = collapseWhitespace(value);
  if (normalized.length === 0) return "";

  const match = normalized.match(/^[^.!?]+[.!?]?/);
  const sentence = match?.[0]?.trim() ?? normalized;

  return truncateText(sentence, limit);
}

function promptFromClaimContext(claim: VerifiedClaimLike, candidate: FocusCandidate, repairHints: string[]): string {
  const blockTitle = candidate.symbol == null || candidate.symbol.trim().length === 0 ? candidate.title : candidate.symbol;
  const subject = `the selected ${candidate.kind} "${blockTitle}"`;
  const questionSignal = claim.kind === "question" ? firstSentence(claim.text, 140) : "";
  const repairClause =
    repairHints.length === 0
      ? "If ownership is uncertain, call out exactly what local evidence is missing."
      : `If ownership is uncertain, call out the smallest separation/refactor candidate first: ${repairHints.join(" | ")}.`;
  const signalClause =
    questionSignal.length > 0 ? `Provider signal: "${questionSignal}"` : "";

  return [
    `In ${candidate.filePath} at ${candidate.ui.displayRangeLabel}, explain why ${subject} belongs in this ownership boundary using visible local evidence.`,
    signalClause,
    repairClause,
  ]
    .filter(Boolean)
    .join(" ");
}

function whyThisMattersFromCandidate(candidate: FocusCandidate, repairHints: string[]): string {
  const repairClause =
    repairHints.length === 0
      ? "This also reduces false ownership claims where interpretation is uncertain."
      : "This also checks whether a small refactor/decoupling is the next ownership-safe step if the block is too coupled.";
  return `Validate ownership of ${candidate.title} in ${candidate.filePath} using local evidence: start from architecture, then file-level responsibility, then the focused range, and then any minimal repair/refactor candidate. ${repairClause}`;
}

function answerPlaceholderFromCandidate(candidate: FocusCandidate, repairHints: string[]): string {
  const repairClause =
    repairHints.length === 0
      ? "If this is a complex range, point out what local evidence would justify treating it as multiple responsibilities."
      : "If this is a complex range, include the smallest refactor/split you would attempt first and the evidence that would justify it.";
  return `Walk through project structure first, then describe ${candidate.filePath} ownership, then explain ${candidate.ui.displayRangeLabel}. ${repairClause}`;
}

function isQuestionAttemptableClaim(claim: VerifiedClaimLike): boolean {
  return claim.kind === "attempt_prompt" || claim.kind === "question";
}

function inferIntent(claim: { text: string }): QuestionIntent {
  const text = claim.text.toLowerCase();
  if (/\b(trace|walk.*through|flow|from .* to )\b/.test(text)) return "trace";
  if (/\b(change|break|risk|if .* removed|predict)\b/.test(text)) return "predict_change";
  if (/\b(gap|missing|unknown|need to learn)\b/.test(text)) return "find_gap";
  if (/\b(depends|caller|relation|boundary|connect|owned by)\b/.test(text)) return "connect_relation";
  return "explain";
}

function operationKindForIntent(intent: QuestionIntent): UserOperationKind {
  if (intent === "trace") return "trace";
  if (intent === "predict_change") return "predict";
  if (intent === "connect_relation") return "transfer";
  return "explain";
}

function answerStyleForIntent(intent: QuestionIntent): AnswerStyle {
  if (intent === "trace") return "system_walkthrough";
  if (intent === "predict_change") return "risk_analysis";
  if (intent === "find_gap") return "study_request";
  if (intent === "connect_relation") return "boundary_explanation";
  return "short_explanation";
}

function claimsForQuestions(input: {
  acceptedClaims: VerifiedClaimLike[];
  questions: VerifiedClaimLike[];
}): VerifiedClaimLike[] {
  return [...input.acceptedClaims, ...input.questions].filter(
    (claim) => claim.kind === "attempt_prompt" || claim.kind === "question",
  );
}

function isRepairOrGap(claim: VerifiedClaimLike): boolean {
  return claim.kind === "smallest_repair" || claim.kind === "gap_label";
}

function collectRepairHintsByCandidate(
  claims: VerifiedClaimLike[],
  candidates: FocusCandidate[],
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const claim of claims.filter(isRepairOrGap)) {
    const mapped = claim.citations
      .map((citation) => findFocusCandidateForCitation(candidates, citation))
      .find((candidate) => candidate != null);

    if (mapped == null) continue;

    const current = grouped.get(mapped.id) ?? [];
    const label = claim.kind === "smallest_repair" ? "smallest_repair" : "gap_label";
    const hint = truncateText(`${label}: ${claim.text}`, 180);
    const merged = [...current, hint].filter((value, index, values) => values.indexOf(value) === index);
    grouped.set(mapped.id, merged);
  }

  return grouped;
}

function batchIdFor(proposal: BuildQuestionBatchInput["proposal"], claims: VerifiedClaimLike[]): string {
  const seed = [
    proposal?.providerId ?? "provider-unavailable",
    proposal?.generatedAt ?? "",
    proposal?.selectedFilePath ?? "",
    ...claims.map((claim) => `${claim.id}:${claim.text}`),
  ].join("|");
  return `question-batch:${stableFocusQuestionHash(seed)}`;
}

function uniqueEvidenceIds(citations: EvidenceCitationLike[]): string[] {
  return citations
    .map((citation) => citation.evidenceId)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function makeQuestion(input: {
  batchId: string;
  claim: VerifiedClaimLike;
  focusCandidate: FocusCandidate;
  repairHints: string[];
  isActive: boolean;
}): Question {
  const intent = inferIntent(input.claim);
  return {
    schema: "sibi-ui-question.v1",
    id: `question:${stableFocusQuestionHash(`${input.batchId}|${input.claim.id}|${input.focusCandidate.id}`)}`,
    batchId: input.batchId,
    focusCandidateId: input.focusCandidate.id,
    filePath: input.focusCandidate.filePath,
    prompt: promptFromClaimContext(input.claim, input.focusCandidate, input.repairHints),
    intent,
    operationKind: operationKindForIntent(intent),
    answerStyle: answerStyleForIntent(intent),
    citations: input.focusCandidate.citations,
    evidenceIds: input.focusCandidate.evidenceIds.length > 0
      ? input.focusCandidate.evidenceIds
      : uniqueEvidenceIds(input.focusCandidate.citations),
    whyThisMatters: whyThisMattersFromCandidate(input.focusCandidate, input.repairHints),
    answerPlaceholder: answerPlaceholderFromCandidate(input.focusCandidate, input.repairHints),
    state: input.isActive ? "active" : "pending",
    verifierDisposition: input.claim.disposition,
  };
}

function dedupePromptKey(input: { focusCandidateId: string; prompt: string }): string {
  return `${input.focusCandidateId}|${collapseWhitespace(input.prompt).toLowerCase()}`;
}

export function buildQuestionBatchFromLanguageProposal({
  proposal,
  verification,
  focusCandidates,
}: BuildQuestionBatchInput): QuestionBatch {
  if (verification == null || verification.kind === "blocked_llm_unavailable" || proposal == null) {
    return {
      schema: QUESTION_BATCH_SCHEMA,
      id: batchIdFor(proposal, []),
      providerId: proposal?.providerId ?? "unavailable",
      model: proposal?.runtimeTrace?.model,
      generatedAt: proposal?.generatedAt ?? new Date(0).toISOString(),
      selectedFiles: [],
      questions: [],
      verifierDisposition: "rejected",
      rejectedQuestionIds: [],
      diagnostics: [
        {
          code: "provider_unavailable",
          severity: "blocked",
          message:
            verification?.kind === "blocked_llm_unavailable"
              ? verification.reason
              : "Question batch cannot be built before provider verification.",
        },
      ],
    };
  }

  const claims = claimsForQuestions(verification);
  const batchId = batchIdFor(proposal, claims);
  const diagnostics: QuestionBatchDiagnostic[] = [];
  const rejectedQuestionIds = verification.rejectedClaims
    .filter(isQuestionAttemptableClaim)
    .map((claim) => claim.id);
  const questions: Question[] = [];
  const visibleQuestionPromptKeys = new Set<string>();
  const repairHintsByCandidateId = collectRepairHintsByCandidate(
    [...verification.acceptedClaims, ...verification.questions],
    focusCandidates,
  );

  if (verification.kind === "rejected") {
    diagnostics.push({
      code: "provider_schema_invalid",
      severity: "blocked",
      message: "Verified language proposal was rejected before question batch projection.",
    });
    return {
      schema: QUESTION_BATCH_SCHEMA,
      id: batchId,
      providerId: proposal.providerId,
      model: proposal.runtimeTrace?.model,
      generatedAt: proposal.generatedAt,
      selectedFiles: [],
      questions: [],
      verifierDisposition: "rejected",
      rejectedQuestionIds: [...new Set(rejectedQuestionIds)],
      diagnostics,
    };
  }

  for (const claim of claims) {
    const focusCandidate =
      claim.citations
        .map((citation) => findFocusCandidateForCitation(focusCandidates, citation))
        .find((candidate) => candidate != null) ?? null;

    if (focusCandidate == null) {
      diagnostics.push({
        code: "question_without_focus",
        severity: "blocked",
        message: `Question claim '${claim.id}' does not map to a verified focus candidate.`,
        questionId: claim.id,
      });
      rejectedQuestionIds.push(claim.id);
      continue;
    }

    const question = makeQuestion({
      batchId,
      claim,
      focusCandidate,
      repairHints: repairHintsByCandidateId.get(focusCandidate.id) ?? [],
      isActive: questions.length === 0,
    });
    const dedupeKey = dedupePromptKey({
      focusCandidateId: focusCandidate.id,
      prompt: question.prompt,
    });

    if (visibleQuestionPromptKeys.has(dedupeKey)) {
      rejectedQuestionIds.push(claim.id);
      continue;
    }

    visibleQuestionPromptKeys.add(dedupeKey);
    questions.push(question);
  }

  if (questions.length === 0) {
    diagnostics.push({
      code: "question_batch_empty",
      severity: "blocked",
      message: "No verified questions are available for the ownership queue.",
    });
  }

  return {
    schema: QUESTION_BATCH_SCHEMA,
    id: batchId,
    providerId: proposal.providerId,
    model: proposal.runtimeTrace?.model,
    generatedAt: proposal.generatedAt,
    selectedFiles: [...new Set(questions.map((question) => normalizePath(question.filePath)))],
    questions,
    verifierDisposition: verification.kind,
    rejectedQuestionIds: [...new Set(rejectedQuestionIds)],
    diagnostics,
  };
}
