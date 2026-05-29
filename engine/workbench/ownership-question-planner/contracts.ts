import type {
  EvidenceCitationLike,
  EvidencePackLike,
  FocusCandidate,
  QuestionBatch,
} from "../focus-question/index.ts";

export const OWNERSHIP_QUESTION_PLAN_SCHEMA = "sibi-ownership-question-plan.v1";

export type OwnershipQuestionPlanDisposition = "accepted" | "accepted_with_questions" | "rejected";

export type OwnershipUnitKind =
  | "architecture"
  | "state"
  | "effects_api"
  | "rendering"
  | "boundary"
  | "repair_refactor"
  | "imports"
  | "misc";

export type OwnershipUnit = {
  id: string;
  focusCandidateId: string;
  startLine: number;
  endLine: number;
  kind: OwnershipUnitKind | string;
  citations?: EvidenceCitationLike[];
  evidenceIds?: string[];
};

export type PlannedOwnershipQuestion = {
  id: string;
  batchId: string;
  schema: "sibi-ownership-question.v1";
  focusCandidateId: string;
  phase: string;
  questionText: string;
  filePath: string;
  citations: EvidenceCitationLike[];
  evidenceIds: string[];
  verifierDisposition: "accepted" | "rejected" | "downgraded_to_question";
  whyThisMatters: string;
  answerPlaceholder: string;
  selectedFilePath: string;
};

export type OwnershipPlannerDiagnostic = {
  code:
    | "question_generic_overview"
    | "question_missing_citations"
    | "question_project_signal_only"
    | "question_selected_file_citation_missing"
    | "question_citation_out_of_scope"
    | "question_invalid_line_range"
    | "question_invented_evidence_id"
    | "question_count_exceeded"
    | "question_readiness_or_ownership_claim"
    | "missing_repair_refactor_gate"
    | "unit_backlog"
    | "unit_source_skipped";
  severity: "warning" | "blocked";
  message: string;
  questionId?: string;
  focusCandidateId?: string;
};

export type LargeFileHeuristicResult = {
  selectedFilePath: string;
  lineCount: number;
  isLargeFile: boolean;
  isComposite: boolean;
  focusCandidateCount: number;
  evidenceCount: number;
  hookSignalCount: number;
  effectSignalCount: number;
  apiSignalCount: number;
  importDomainSpread: number;
  mixedKindCount: number;
  maxQuestions: number;
};

export type BuildOwnershipQuestionPlanInput = {
  evidencePack: EvidencePackLike;
  fileContents: Record<string, string>;
  focusCandidates: FocusCandidate[];
  questionBudget?: number;
  providerId?: string;
  generatedAt?: string;
};

export type OwnershipQuestionPlan = {
  schema: typeof OWNERSHIP_QUESTION_PLAN_SCHEMA;
  providerId: string;
  generatedAt: string;
  selectedFilePath: string;
  units: OwnershipUnit[];
  questions: PlannedOwnershipQuestion[];
  heuristics: LargeFileHeuristicResult;
  verifierDisposition: OwnershipQuestionPlanDisposition;
  diagnostics: OwnershipPlannerDiagnostic[];
};

export type OwnershipQuestionPlanVerification = {
  kind: OwnershipQuestionPlanDisposition;
  acceptedPlan: OwnershipQuestionPlan;
  acceptedQuestions: PlannedOwnershipQuestion[];
  rejectedQuestions: PlannedOwnershipQuestion[];
  blockedQuestionIds: string[];
  rejectedQuestionIds: string[];
  reasons: string[];
  diagnostics: OwnershipPlannerDiagnostic[];
};

export type OwnershipQuestionPlanProjectionInput = {
  verification: OwnershipQuestionPlanVerification;
  fallbackQuestionBatch?: QuestionBatch;
};
