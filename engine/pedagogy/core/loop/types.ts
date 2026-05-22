import type {
  EvidenceRef,
  EvidenceCheck,
  OwnershipGap,
  RepairAction,
  ReadinessClaim,
  UserOperationKind,
  UserAttempt,
  UserOperation,
  ThinkingArtifact,
  ConceptSlice,
} from "../loop-types.ts";
import type { EvaluateAttemptOutput } from "../attempt-evaluation.ts";

export type PrerequisiteRouteLevel =
  | "basic"
  | "intermediate"
  | "deep"
  | "construction"
  | "transfer";

export type PrerequisiteRouteOption = {
  level: PrerequisiteRouteLevel;
  label: string;
  description: string;
  suggested_evidence: string[];
};

export type PrerequisiteRoute = {
  id: string;
  original_operation_id: string;
  concept_slice_id: string;
  blocked_operation: UserOperationKind;
  suspected_missing_concepts: string[];
  route_options: PrerequisiteRouteOption[];
  recommended_start: PrerequisiteRouteLevel;
  return_condition: string;
  created_at: string;
};

export type ReevaluationPrompt = {
  id: string;
  original_operation_id: string;
  original_gap_id: string;
  nearby_operation_kind: UserOperationKind;
  prompt: string;
  required_evidence: string[];
  success_criteria: string[];
  avoid_repeating_prompt: string;
  created_at: string;
};

export type MisconceptionStatus =
  | "active"
  | "resolved"
  | "dormant"
  | "monitored";

export type MisconceptionRepairEntry = {
  repair_action_id: string;
  attempted_at: string;
  outcome: "resolved" | "persisted" | "partial";
};

export type MisconceptionMemory = {
  id: string;
  label: string;
  concept_id: string;
  first_seen_at: string;
  repeated_count: number;
  domains_seen: string[];
  evidence: EvidenceRef[];
  repair_history: MisconceptionRepairEntry[];
  current_status: MisconceptionStatus;
  last_seen_at: string;
};

export type MemoryAnswerOutcome =
  | "confirmed"
  | "gap"
  | "partial"
  | "contradiction"
  | "insufficient_evidence";

export type MemoryAnswerEntry = {
  answer_id: string;
  attempt_id: string;
  operation_id: string;
  operation_kind: UserOperationKind;
  concept_slice_id: string;
  answer_text: string;
  outcome: MemoryAnswerOutcome;
  confidence: "low" | "medium" | "high";
  had_declared_uncertainty: boolean;
  created_at: string;
  evidence: EvidenceRef[];
};

export type MemoryOperationEntry = {
  operation_id: string;
  operation_kind: UserOperationKind;
  concept_slice_id: string;
  is_confirmed: boolean;
  attempts_count: number;
  last_attempt_at: string | null;
  last_success_at: string | null;
};

export type MemoryConceptEntry = {
  concept_slice_id: string;
  label: string;
  confirmed_operations: UserOperationKind[];
  open_gaps: string[];
  misconceptions: string[];
  last_successful_attempt_at: string | null;
  retention_due_at: string | null;
  transfer_due_at: string | null;
};

export type DeepOwnershipMemory = {
  id: string;
  loop_id: string;
  generated_at: string;
  concept_entries: MemoryConceptEntry[];
  operation_entries: MemoryOperationEntry[];
  answer_history: MemoryAnswerEntry[];
  open_gaps: OwnershipGap[];
  repair_actions: RepairAction[];
  misconception_memory: MisconceptionMemory[];
  next_review_at: string | null;
};

export type LoopResult = {
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gap: OwnershipGap | null;
  repairAction: RepairAction | null;
  prerequisiteRoute: PrerequisiteRoute | null;
  reevaluationPrompt: ReevaluationPrompt | null;
  readinessClaim: ReadinessClaim;
  misconceptionMemory: MisconceptionMemory[];
  memory: DeepOwnershipMemory;
  memoryAnswerEntry: MemoryAnswerEntry;
};

export type EvaluateFullLoopInput = {
  loopId: string;
  userAttempt: UserAttempt;
  evalOutput: EvaluateAttemptOutput;
  operation: UserOperation;
  artifact: ThinkingArtifact;
  conceptSlice: ConceptSlice;
  existingMisconceptions?: MisconceptionMemory[];
  existingGaps?: OwnershipGap[];
  existingAnswerHistory?: MemoryAnswerEntry[];
};
