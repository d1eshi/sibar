import type {
  EvidenceRef,
  ThinkingArtifact,
  UserOperation,
  UserOperationKind,
} from "../../pedagogy-core/index.ts";
import type { AnswerStyle } from "../../pedagogy/questions.ts";

export const FOCUS_CANDIDATES_SCHEMA = "sibi-focus-candidates.v1";
export const QUESTION_BATCH_SCHEMA = "sibi-question-batch.v1";
export const QUESTION_QUEUE_SCHEMA = "sibi-question-queue.v1";

export type EvidenceConfidence = "observed" | "inferred" | "unverified" | "conflict";

export type EvidenceCitationLike = {
  evidenceId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  symbol?: string;
};

export type EvidenceExcerptLike = EvidenceCitationLike & {
  text: string;
};

export type EvidenceSymbolLike = EvidenceCitationLike & {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "let" | "var" | "enum";
  text: string;
  confidence: EvidenceConfidence;
};

export type EvidencePackLike = {
  selectedFilePath: string;
  userIntent: string;
  excerpts: EvidenceExcerptLike[];
  symbols: EvidenceSymbolLike[];
};

export type FocusCandidateKind =
  | "function"
  | "component"
  | "hook_state"
  | "api_call"
  | "route_handler"
  | "export"
  | "test"
  | "doc"
  | "unknown";

export type FocusCandidateSource =
  | "cheap_scanner"
  | "engine_code_selection"
  | "repo_search"
  | "manual_selection";

export type FocusCandidate = {
  schema: "sibi-ui-focus-candidate.v1";
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  kind: FocusCandidateKind;
  symbol?: string;
  title: string;
  excerpt: string;
  surroundingContext?: string;
  deterministicSignals: string[];
  evidenceIds: string[];
  citations: EvidenceCitationLike[];
  confidence: EvidenceConfidence;
  source: FocusCandidateSource;
  ui: {
    priority: number;
    displayRangeLabel: string;
    reason: string;
    isDefaultFocus?: boolean;
  };
};

export type UiFocusCandidate = FocusCandidate;

export type FocusCandidateDiagnostic = {
  code: "focus_candidate_too_large" | "focus_candidate_duplicate" | "focus_candidate_missing_text";
  severity: "info" | "warning";
  message: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
};

export type FocusCandidateResult = {
  schema: typeof FOCUS_CANDIDATES_SCHEMA;
  selectedFilePath: string;
  candidates: FocusCandidate[];
  diagnostics: FocusCandidateDiagnostic[];
};

export type BuildFocusCandidatesInput = {
  evidencePack: EvidencePackLike;
  fileContents: Record<string, string>;
  maxCandidates?: number;
};

export type LanguageProposalClaimKind =
  | "boundary_candidate"
  | "review_queue_copy"
  | "attempt_prompt"
  | "gap_label"
  | "smallest_repair"
  | "question"
  | "readiness";

export type VerifiedClaimLike = {
  id: string;
  kind: LanguageProposalClaimKind;
  text: string;
  confidence: EvidenceConfidence;
  citations: EvidenceCitationLike[];
  disposition: "accepted" | "downgraded_to_question" | "rejected";
  reasons: string[];
};

export type ProposalLike = {
  providerId: string;
  generatedAt: string;
  selectedFilePath: string;
  runtimeTrace?: {
    model?: string;
  };
};

export type ProposalVerificationLike =
  | {
      kind: "accepted" | "accepted_with_questions" | "rejected";
      acceptedClaims: VerifiedClaimLike[];
      questions: VerifiedClaimLike[];
      rejectedClaims: VerifiedClaimLike[];
      reasons: string[];
    }
  | {
      kind: "blocked_llm_unavailable";
      reason: string;
    };

export type QuestionIntent = "explain" | "trace" | "predict_change" | "find_gap" | "connect_relation";

export type QuestionState = "pending" | "active" | "attempted" | "repair_needed" | "blocked" | "complete";

export type Question = {
  schema: "sibi-ui-question.v1";
  id: string;
  batchId: string;
  focusCandidateId: string;
  filePath: string;
  prompt: string;
  intent: QuestionIntent;
  operationKind: UserOperationKind;
  answerStyle: AnswerStyle;
  citations: EvidenceCitationLike[];
  evidenceIds: string[];
  whyThisMatters: string;
  answerPlaceholder: string;
  state: QuestionState;
  verifierDisposition: "accepted" | "downgraded_to_question" | "rejected";
  expectedVisibleConcepts?: string[];
};

export type UiQuestion = Question;

export type QuestionBatchDiagnostic = {
  code: "provider_unavailable" | "provider_schema_invalid" | "question_without_focus" | "question_batch_empty";
  severity: "warning" | "blocked";
  message: string;
  questionId?: string;
  focusCandidateId?: string;
};

export type QuestionBatch = {
  schema: typeof QUESTION_BATCH_SCHEMA;
  id: string;
  providerId: string;
  model?: string;
  generatedAt: string;
  selectedFiles: string[];
  questions: Question[];
  verifierDisposition: "accepted" | "accepted_with_questions" | "rejected";
  rejectedQuestionIds: string[];
  diagnostics: QuestionBatchDiagnostic[];
};

export type UiQuestionBatch = QuestionBatch;

export type BuildQuestionBatchInput = {
  proposal: ProposalLike | null;
  verification: ProposalVerificationLike | null;
  focusCandidates: FocusCandidate[];
};

export type QuestionQueueItem = {
  questionId: string;
  focusCandidateId: string;
  filePath: string;
  title: string;
  state: QuestionState;
  orderReason: string;
};

export type UiQuestionQueueItem = QuestionQueueItem;

export type QuestionQueueProjection = {
  schema: typeof QUESTION_QUEUE_SCHEMA;
  activeQuestionId: string | null;
  activeFocusCandidateId: string | null;
  items: QuestionQueueItem[];
  progress: {
    total: number;
    complete: number;
    attempted: number;
    blocked: number;
  };
  blockedState?: {
    code: string;
    message: string;
    detail?: string;
  };
};

export type UiQuestionQueueProjection = QuestionQueueProjection;

export type BuildQuestionQueueInput = {
  batch: QuestionBatch;
  activeQuestionId?: string | null;
};

export type FocusQuestionOperationSeed = {
  evidenceRef: EvidenceRef;
  operation: UserOperation;
  artifact: ThinkingArtifact;
};
