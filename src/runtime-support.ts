import type {
  AgentWorkSessionSummary,
  AnswerQuality,
  DeclaredWorkIntent,
  LearningSignal,
  OwnershipQuestion,
  TaskType,
} from "./pedagogy/index.ts";
import type { RuntimeCodeSelection } from "./code-selection.ts";

export type RuntimeCommand =
  | "create_artifact_session"
  | "get_artifact_session"
  | "build_concept_graph"
  | "prepare_autopsy_step"
  | "get_understanding_memory"
  | "readiness_report"
  | "generate_practice_challenges"
  | "run_project_learning_agent"
  | "declare_intent"
  | "prepare_code_question"
  | "generate_questions"
  | "answer_question"
  | "get_session_summary";

export type RuntimeRequest = {
  command: RuntimeCommand;
  payload: Record<string, unknown>;
};

export type RuntimeSuccess<T> = { ok: true; data: T };
export type RuntimeFailure = { ok: false; error: { code: string; message: string } };
export type RuntimeResponse<T> = RuntimeSuccess<T> | RuntimeFailure;

export type RuntimeQuestion = OwnershipQuestion & {
  detected_layer: number;
  required_layer: number;
  max_followups: number;
  answer?: string;
  answer_quality?: AnswerQuality;
};

export type RuntimeSession = {
  session_id: string;
  project_label: string;
  started_at: string;
  ended_at?: string | null;
  declared_intent: DeclaredWorkIntent | null;
  observed_tools: string[];
  learning_signals: LearningSignal[];
  ownership_questions: RuntimeQuestion[];
  export_state: AgentWorkSessionSummary["export_state"];
  task_type: TaskType;
  code_selection?: RuntimeCodeSelection;
};

export type ArtifactSourceType = "local_path" | "repository" | "archive" | "manual";

export type ArtifactConfidence = "low" | "medium" | "high";

export type EvidenceCitation = {
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
};

export type ConceptNodeKind =
  | "architecture"
  | "runtime"
  | "data_flow"
  | "algorithm"
  | "framework"
  | "testing"
  | "risk"
  | "domain";

export type ConceptEdgeRelation =
  | "calls"
  | "configures"
  | "persists"
  | "renders"
  | "tests"
  | "depends_on"
  | "explains"
  | "risks";

export type ConceptNode = {
  id: string;
  label: string;
  kind: ConceptNodeKind;
  source_paths: string[];
  why_it_matters: string;
  prerequisite_concepts: string[];
  evidence: EvidenceCitation[];
};

export type ConceptEdge = {
  id: string;
  from: string;
  to: string;
  relation: ConceptEdgeRelation;
  label: string;
  evidence: EvidenceCitation[];
};

export type ConceptGraph = {
  artifact_session_id: string;
  generated_at: string;
  scope: {
    root_path: string;
    included_paths: string[];
    excluded_paths: string[];
  };
  nodes: ConceptNode[];
  edges: ConceptEdge[];
};

export type AutopsyTargetType = "concept" | "edge";

export type AutopsyStep = {
  autopsy_step_id: string;
  artifact_session_id: string;
  session_id: string;
  question_id: string;
  target_type: AutopsyTargetType;
  selected_id: string;
  concept_id?: string;
  edge_id?: string;
  prompt: string;
  bounded_evidence: EvidenceCitation[];
  evidence_basis: string[];
  next_action: "collect_user_attempt";
  created_at: string;
};

export type LearningGapSeverity = "critical" | "important" | "later";

export type LearningGapConfidence = "low" | "medium" | "high";

export type LearningGap = {
  id: string;
  artifact_session_id?: string;
  session_id: string;
  question_id: string;
  concept_id: string;
  concept_label: string;
  expected_layer: number;
  observed_layer: number;
  observed_answer_or_uncertainty: string;
  artifact_evidence: EvidenceCitation[];
  answer_evidence: string[];
  suspected_misconception: string;
  severity: LearningGapSeverity;
  confidence: LearningGapConfidence;
  repair_action: string;
  created_at: string;
};

export type ConceptUnderstandingState = {
  concept_id: string;
  concept_label: string;
  session_id: string;
  question_id: string;
  status: "confirmed";
  expected_layer: number;
  observed_layer: number;
  confidence: LearningGapConfidence;
  evidence: EvidenceCitation[];
  answer_evidence: string[];
  repair_action: string;
  updated_at: string;
};

export type PracticeChallengeType =
  | "explain_flow_without_looking"
  | "trace_path_across_files"
  | "predict_side_effect"
  | "small_modification"
  | "write_or_adjust_test"
  | "compare_design_alternatives"
  | "rebuild_smaller_version"
  | "transfer_to_second_artifact";

export type PracticeChallengeDifficulty = "easy" | "medium" | "hard";

export type PracticeChallengeDueAfter = "now" | "24h" | "7d";

export type PracticeChallengeCompletionState = "pending" | "completed" | "skipped";

export type PracticeChallenge = {
  id: string;
  artifact_session_id: string;
  session_id: string;
  concept_id: string;
  gap_id: string;
  challenge_type: PracticeChallengeType;
  prompt: string;
  expected_evidence: string[];
  difficulty: PracticeChallengeDifficulty;
  due_after: PracticeChallengeDueAfter;
  revisit_after: string;
  completion_state: PracticeChallengeCompletionState;
  created_at: string;
};

export type ModelSignalType =
  | "concept"
  | "flow"
  | "risk"
  | "gap_candidate"
  | "misconception_candidate"
  | "practice_candidate";

export type ModelSignalCandidate = {
  id: string;
  artifact_session_id: string;
  model_name: string;
  signal_type: ModelSignalType | string;
  claim: string;
  citations: EvidenceCitation[];
  confidence: LearningGapConfidence | string;
  rationale: string;
  proposed_layer?: number;
  validation_error_hints?: string[];
};

export type ModelSignalValidation = {
  candidate_id: string;
  accepted: boolean;
  errors: string[];
};

export type RejectedModelSignal = ModelSignalCandidate & {
  validation_errors: string[];
};

export type PedagogyTrace = {
  trace_id: string;
  artifact_session_id: string;
  model_runner: string;
  model_name: string;
  reasoning_effort: string;
  prompt: string;
  artifact_boundary: {
    root_path: string;
    included_paths: string[];
    excluded_paths: string[];
  };
  files_read: string[];
  candidate_signals: ModelSignalCandidate[];
  deterministic_validation: ModelSignalValidation[];
  accepted_signals: ModelSignalCandidate[];
  rejected_signals: RejectedModelSignal[];
  final_runtime_output: {
    accepted_signal_count: number;
    rejected_signal_count: number;
    readiness_decided_by_model: false;
  };
  created_at: string;
};

export type ArtifactSession = {
  artifact_session_id: string;
  label: string;
  root_path: string;
  source_type: ArtifactSourceType | string;
  learning_goal: string;
  confidence: ArtifactConfidence;
  included_paths: string[];
  excluded_paths: string[];
  created_at: string;
  concept_graph?: ConceptGraph;
  active_autopsy_step?: AutopsyStep;
  learning_gaps?: LearningGap[];
  practice_challenges?: PracticeChallenge[];
  concept_states?: Record<string, ConceptUnderstandingState>;
  readiness_reports?: import("./runtime-readiness.ts").ReadinessReport[];
  pedagogy_traces?: PedagogyTrace[];
};

export type UnderstandingMemoryConceptStatus =
  | "unseen"
  | "gap_open"
  | "confirmed"
  | "needs_review";

export type UnderstandingMemoryConcept = {
  concept_id: string;
  concept_label: string;
  status: UnderstandingMemoryConceptStatus;
  confidence?: LearningGapConfidence;
  expected_layer?: number;
  observed_layer?: number;
  evidence: EvidenceCitation[];
  last_answered_at?: string;
  next_review_at?: string;
  open_gap_ids: string[];
  challenge_ids: string[];
};

export type UnderstandingMemoryAnswer = {
  answer_id: string;
  session_id: string;
  question_id: string;
  concept_id: string;
  concept_label: string;
  answer: string;
  outcome: "gap" | "confirmed";
  confidence: LearningGapConfidence;
  created_at: string;
  evidence: EvidenceCitation[];
};

export type UnderstandingMemoryReview = {
  concept_id: string;
  concept_label: string;
  next_review_at: string;
  reason: "pending_challenge" | "confirmed_review" | "gap_repair";
  challenge_id?: string;
  gap_id?: string;
};

export type UnderstandingMemory = {
  artifact_session_id: string;
  label: string;
  root_path: string;
  generated_at: string;
  concept_states: UnderstandingMemoryConcept[];
  answer_history: UnderstandingMemoryAnswer[];
  gaps: LearningGap[];
  challenges: PracticeChallenge[];
  next_reviews: UnderstandingMemoryReview[];
};

export type RuntimeState = {
  current_session_id?: string;
  current_artifact_session_id?: string;
  sessions: Record<string, RuntimeSession>;
  artifact_sessions?: Record<string, ArtifactSession>;
};

export type RuntimeSessionSummary = AgentWorkSessionSummary & {
  code_selection?: RuntimeCodeSelection;
};

export class RuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function fail(code: string, message: string): never {
  throw new RuntimeError(code, message);
}

export function now(): string {
  return new Date().toISOString();
}

export function excerptPrefix(value: string, maxLength = 180): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

export function toOperationState(message: string): { message: string } {
  return { message };
}
