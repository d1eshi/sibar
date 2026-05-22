import type {
  ArtifactBoundary,
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
  SkipRecord,
  ThinkingArtifact,
  UnknownZone,
  UserOperation,
  UserOperationKind,
} from "./evidence-types.ts";
import type {
  BoundaryExpansionRoute,
  OutOfScopeEvidenceRecord,
  ResearchToConstructionBridge,
  WorkspaceSignal,
} from "../../runtime-deep-ownership-intelligence-types.ts";

export type {
  ArtifactBoundary,
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
  SkipRecord,
  ThinkingArtifact,
  UnknownZone,
  UserOperation,
  UserOperationKind,
} from "./evidence-types.ts";

// ── Attempt & Evidence Check ──────────────────────────────────────────

export type UserAttempt = {
  id: string;
  operation_id: string;
  answer_text: string;
  selected_evidence: string[];
  declared_confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
  created_at: string;
};

export type EvidenceCheckResult =
  | "confirmed"
  | "partial"
  | "gap"
  | "contradiction"
  | "insufficient_evidence";

export type EvidenceCheck = {
  id: string;
  attempt_id: string;
  required_claims: string[];
  observed_claims: string[];
  missing_claims: string[];
  contradicted_claims: string[];
  unsupported_claims: string[];
  cited_evidence: EvidenceRef[];
  artifact_counterevidence: EvidenceRef[];
  result: EvidenceCheckResult;
};

// ── Gap, Repair, Readiness ───────────────────────────────────────────

export type OwnershipGapKind =
  | "missing_prerequisite"
  | "wrong_causal_model"
  | "shallow_trace"
  | "unsupported_claim"
  | "false_confidence"
  | "formula_misread"
  | "implementation_misread"
  | "behavior_misread"
  | "transfer_failure"
  | "test_oracle_misread"
  | "vocabulary_only"
  | "memorized_without_mechanism"
  | "wrong_mechanism"
  | "ignored_counterevidence"
  | "passive_agreement";

export type OwnershipGap = {
  id: string;
  concept_slice_id: string;
  kind: OwnershipGapKind;
  user_attempt_ref: string;
  artifact_evidence_refs: EvidenceRef[];
  evidence: string;
  severity: "critical" | "important" | "later";
  blocks_readiness: boolean;
  created_at: string;
};

export type RepairAction = {
  id: string;
  gap_id: string;
  operation_kind: UserOperationKind;
  prompt: string;
  required_evidence: EvidenceRef[];
  source_gap_id: string;
  created_at: string;
};

export type ReadinessStatus = "ready" | "limited" | "blocked" | "unknown";

export type ReadinessClaim = {
  id: string;
  concept_slice_id: string;
  operation_id: string;
  status: ReadinessStatus;
  scope: string;
  ready_to_explain: boolean;
  ready_to_trace: boolean;
  ready_to_derive: boolean;
  ready_to_predict: boolean;
  ready_to_build: boolean;
  ready_to_modify: boolean;
  ready_to_debug: boolean;
  ready_to_transfer: boolean;
  ready_to_teach: boolean;
  blocked_claims: string[];
  supporting_evidence: { evidence_id: string }[];
  blocking_gaps: string[];
  confidence: "low" | "medium" | "high";
  generated_at: string;
};

// ── Loop ──────────────────────────────────────────────────────────────

export type LoopState =
  | "GoalInput"
  | "BoundaryProposal"
  | "BoundaryConfirmed"
  | "EvidenceInventoried"
  | "ConceptSliceSelected"
  | "ArtifactGenerated"
  | "AwaitingAttempt"
  | "AttemptStored"
  | "EvidenceChecked"
  | "GapOrReady"
  | "RepairOrReevaluation"
  | "MemoryUpdated";

export type LoopEntry = {
  id: string;
  current_state: LoopState;
  state_chain: LoopState[];
  boundary_enforced: boolean;
  out_of_bound_accesses: number;
};

export type OperationChoice = {
  selected_kind: UserOperationKind;
  rationale: string;
  chosen_at: string;
};

export type WeakGoalRoute = {
  original_goal: string;
  offered_operations: UserOperationKind[];
  chosen_operation: OperationChoice | null;
  requires_choice: boolean;
};

export type DeepOwnershipLoop = {
  id: string;
  goal: string;
  weak_goal_route: WeakGoalRoute | null;
  artifact_boundary: ArtifactBoundary;
  concept_slice: ConceptSlice | null;
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation | null;
  evidence_inventory: EvidenceInventoryEntry[];
  skip_records: SkipRecord[];
  unknown_zones: UnknownZone[];
  research_bridges?: ResearchToConstructionBridge[];
  workspace_signals?: WorkspaceSignal[];
  out_of_scope_evidence?: OutOfScopeEvidenceRecord[];
  boundary_expansion_routes?: BoundaryExpansionRoute[];
  sample_attempt: UserAttempt | null;
  evidence_check: EvidenceCheck | null;
  detected_gap: OwnershipGap | null;
  repair_action: RepairAction | null;
  readiness_claim: ReadinessClaim;
  loop_entry: LoopEntry;
};

export type WorkspaceSnapshot = {
  snapshot_id: string;
  loop_id: string;
  goal: string;
  weak_goal_route: WeakGoalRoute | null;
  boundary_summary: {
    root_path: string;
    included_count: number;
    excluded_count: number;
  };
  concept_slice: ConceptSlice | null;
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation | null;
  evidence_visible: EvidenceInventoryEntry[];
  unknown_zones: UnknownZone[];
  workspace_signals: WorkspaceSignal[];
  out_of_scope_evidence: OutOfScopeEvidenceRecord[];
  boundary_expansion_routes: BoundaryExpansionRoute[];
  attempt_stored: boolean;
  attempt_result: {
    answer_text: string;
    declared_confidence: string;
    declared_unknowns: string[];
  } | null;
  evidence_check_result: {
    result: EvidenceCheckResult;
    summary: string;
  } | null;
  detected_gap: {
    kind: OwnershipGapKind;
    severity: string;
    blocks_readiness: boolean;
  } | null;
  repair_action: {
    operation_kind: UserOperationKind;
    prompt: string;
  } | null;
  readiness: {
    status: ReadinessStatus;
    scope: string;
    blocked_claims: string[];
  };
  loop_state: LoopState;
  state_chain: LoopState[];
  has_hidden_solution_content: boolean;
  hidden_solution_gated: boolean;
};

export type DeepOwnershipFixture = {
  fixture_id: string;
  generated_at: string;
  goal: string;
  artifact_boundary: ArtifactBoundary;
  evidence_inventory: EvidenceInventoryEntry[];
  skip_records: SkipRecord[];
  unknown_zones: UnknownZone[];
  research_bridges?: ResearchToConstructionBridge[];
  workspace_signals?: WorkspaceSignal[];
  out_of_scope_evidence?: OutOfScopeEvidenceRecord[];
  boundary_expansion_routes?: BoundaryExpansionRoute[];
  out_of_bound_refs: EvidenceRef[];
  concept_slice: ConceptSlice;
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation;
  sample_attempt: UserAttempt;
  evidence_check: EvidenceCheck;
  detected_gap: OwnershipGap;
  repair_action: RepairAction;
  readiness_claim: ReadinessClaim;
  loop_state: LoopEntry;
};

export type ValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  summary: string;
};
