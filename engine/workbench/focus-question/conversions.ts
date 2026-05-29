import type {
  EvidenceRef,
  ThinkingArtifact,
  UserOperation,
} from "../../pedagogy-core/index.ts";
import type {
  EvidenceCitationLike,
  FocusCandidate,
  FocusQuestionOperationSeed,
  Question,
} from "./contracts.ts";

function evidenceRoleForFocus(candidate: FocusCandidate): EvidenceRef["role"] {
  if (candidate.kind === "test") return "behavior_oracle";
  if (candidate.kind === "doc") return "intent";
  if (candidate.kind === "export") return "interface";
  return "implementation";
}

export function citationToEvidenceRef(citation: EvidenceCitationLike, excerpt = "", role: EvidenceRef["role"] = "implementation"): EvidenceRef {
  return {
    evidence_id: citation.evidenceId,
    file_path: citation.filePath,
    start_line: citation.startLine,
    end_line: citation.endLine,
    excerpt,
    role,
  };
}

export function focusCandidateToEvidenceRef(candidate: FocusCandidate): EvidenceRef {
  const citation = candidate.citations[0] ?? {
    evidenceId: candidate.evidenceIds[0] ?? candidate.id,
    filePath: candidate.filePath,
    startLine: candidate.startLine,
    endLine: candidate.endLine,
    symbol: candidate.symbol,
  };
  return citationToEvidenceRef(citation, candidate.excerpt, evidenceRoleForFocus(candidate));
}

export function questionToUserOperation(question: Question): UserOperation {
  return {
    id: `operation:${question.id}`,
    kind: question.operationKind,
    prompt: question.prompt,
    artifact_ids: [`artifact:${question.focusCandidateId}`],
    required_evidence: question.evidenceIds,
    allowed_hints: 3,
    blocked_shortcuts: [
      "cannot_answer_without_visible_focus",
      "cannot_claim_readiness_from_provider_text",
    ],
    success_criteria: [
      "Answers from the highlighted code range",
      "Cites at least one visible evidence id",
      "Names the smallest remaining uncertainty when ownership is incomplete",
    ],
  };
}

export function focusCandidateToThinkingArtifact(candidate: FocusCandidate, question?: Question): ThinkingArtifact {
  const evidenceRef = focusCandidateToEvidenceRef(candidate);
  const operation = question == null ? null : questionToUserOperation(question);
  return {
    id: `artifact:${candidate.id}`,
    kind: "code_slice",
    title: candidate.title,
    purpose: question?.whyThisMatters ?? candidate.ui.reason,
    concept_slice_id: candidate.id,
    source_evidence: [evidenceRef],
    hidden_solution_evidence: [],
    user_operation: operation ?? {
      id: `operation:${candidate.id}`,
      kind: "explain",
      prompt: `Explain ${candidate.title} from ${candidate.filePath}:${candidate.startLine}-${candidate.endLine}.`,
      artifact_ids: [`artifact:${candidate.id}`],
      required_evidence: candidate.evidenceIds,
      allowed_hints: 3,
      blocked_shortcuts: ["cannot_answer_without_visible_focus"],
      success_criteria: ["Explains the highlighted code range using visible evidence"],
    },
    renderer: "code_slice",
    payload: {
      file_path: candidate.filePath,
      ranges: [
        {
          start_line: candidate.startLine,
          end_line: candidate.endLine,
          label: candidate.title,
          role: evidenceRef.role,
          evidence: candidate.evidenceIds,
          is_inferred: candidate.confidence !== "observed",
        },
      ],
      selected_symbols: candidate.symbol == null ? [] : [candidate.symbol],
      prompt_focus: question?.prompt ?? candidate.ui.reason,
    },
    success_criteria: operation?.success_criteria ?? ["Explains the highlighted code range using visible evidence"],
    created_at: new Date(0).toISOString(),
  };
}

export function buildFocusQuestionOperationSeed(candidate: FocusCandidate, question: Question): FocusQuestionOperationSeed {
  return {
    evidenceRef: focusCandidateToEvidenceRef(candidate),
    operation: questionToUserOperation(question),
    artifact: focusCandidateToThinkingArtifact(candidate, question),
  };
}
