export type BoundaryState = "unvisited" | "attempted" | "owned" | "partial" | "gap" | "blocked" | "questionable";

export type TreeKind = "file" | "directory";

export type EvidenceConfidence = "observed" | "inferred" | "unverified" | "conflict";

export type ViewMode = "code" | "diff";

export type WorkbenchSurfaceMode = "default" | "lab";

export type ReadinessGate = "ready" | "repair-needed" | "blocked";

export type EscalationReason =
  | "relation-gap-recurrence"
  | "repeated-low-calibration"
  | "transfer-failure-after-repair"
  | "prerequisite-chain-dependency"
  | "dependency-churn";

export type WorkspaceArtifactSourceKind = "diff" | "pr" | "agent_output" | "code_selection";

export type OwnershipReviewArtifact = {
  artifact_id: string;
  created_at: string;
  source_kind: WorkspaceArtifactSourceKind;
  review: string;
  reason: EscalationReason | "manual";
  evidence_refs: EvidenceRef[];
  blocking_ids: string[];
  diff_text_ref?: string;
  goal_context?: string;
  areas_touched: string[];
  required_evidence: EvidenceRef[];
  read_path: string[];
  blocked_reasons: string[];
  suggested_workspace_seed?: string;
};

export type EvidenceRef = {
  id: string;
  title: string;
  detail: string;
  location: string;
  confidence: EvidenceConfidence;
};

export type RelationEvidenceSource = "queue" | "evidence" | "fixture" | "fallback";

export type RelationEvidenceCategory = "test" | "caller" | "doc" | "runtime-contract";

export type RelationEvidenceKind = EvidenceConfidence;

export type RelationEvidenceDowngrade = {
  from: RelationEvidenceKind;
  to: RelationEvidenceKind;
  reason: string;
};

export type RelationGapReason = "missing caller" | "missing test path" | "missing runtime contract";

export type RelationGap = {
  id: string;
  type: RelationGapReason;
  sourceIds: string[];
  evidenceKind: RelationEvidenceKind;
  confidence: RelationEvidenceKind;
  downgrade?: RelationEvidenceDowngrade;
  candidateReason: string;
};

export type RelationLineKind = "import" | "export" | "symbol";

export type RelationTextEvidence = {
  id: string;
  kind: RelationLineKind;
  line: number;
  text: string;
  evidenceKind: RelationEvidenceKind;
};

export type RelationEvidenceCandidate = {
  id: string;
  kind: RelationEvidenceCategory;
  path: string;
  label: string;
  evidenceKind: RelationEvidenceKind;
  source: RelationEvidenceSource;
  sourceIds: string[];
  downgrade?: RelationEvidenceDowngrade;
};

export type CodeEvidence = {
  selectedFile: string;
  imports: RelationTextEvidence[];
  exports: RelationTextEvidence[];
  symbols: RelationTextEvidence[];
  relationCandidates: RelationEvidenceCandidate[];
  relationGaps: RelationGap[];
  evidenceKindCounts: Record<RelationEvidenceKind, number>;
};

export type WorkbenchLineKind = "ownership-boundary" | "evidence";

export type WorkbenchLineMetadata = {
  kind: WorkbenchLineKind;
  label: string;
  detail: string;
};

export type OwnershipBoundaryRiskProfile = {
  score: number;
  relationWeight: number;
  missingCallerPenalty: number;
  missingDeletionPenalty: number;
  blockedPenalty: number;
  questionablePenalty: number;
};

export type OwnershipBoundary = {
  id: string;
  files: string[];
  responsibility_claim: string;
  evidence: EvidenceRef[];
  open_questions: string[];
  risk: OwnershipBoundaryRiskProfile;
  confidence: EvidenceConfidence;
  state_reason_hints?: Record<string, string>;
  title: string;
  filePath: string;
  startLine: number;
  endLine: number;
  whyMatters: string;
  prompt: string[];
  returnCondition: string;
};

export type ReviewQueueItem = {
  id: string;
  filePath: string;
  boundaryTitle: string;
  priority: 1 | 2 | 3 | 4 | 5;
  touched: boolean;
  orderReason: string;
  nextStep: string;
  state: BoundaryState;
};

export type OwnershipSessionGapReason = "no answer" | "inconclusive" | "could not connect caller/test";

export type OwnershipSessionObservation = {
  id: string;
  filePath: string;
  reason: OwnershipSessionGapReason;
  note: string;
};

export type OwnershipAttemptGap = {
  reason: string;
  evidenceRefs: EvidenceRef[];
  smallestRepair: string;
};

export type OwnershipAttemptReadiness = {
  attempt_id: string;
  self_confidence: number;
  evidence_fit: number;
  calibration_score: number;
  readiness_gate: ReadinessGate;
  state: BoundaryState;
  summary: string;
  gapReason?: string;
  gapDiagnoses: OwnershipAttemptGap[];
  smallestRepair: string;
  returnCondition: string;
  attemptEvidenceRefs: EvidenceRef[];
  startedAt: number;
  submittedAt: number;
  elapsedMs: number;
  transfer?: {
    required: boolean;
    transferOutcome: "transfer_pass" | "transfer_fail" | "transfer_skip" | null;
    transferAttemptCount: number;
    transferRecurrenceTags: string[];
    transferFollowUpTasks: string[];
    transferEscalationCandidate: boolean;
    readinessContinuity: number;
    debtSignal: number;
    transferred: boolean;
    probe: {
      id: string;
      sourceBoundaryFile: string;
      sourceBoundaryTitle: string;
      relatedBoundaryFile: string;
      relatedBoundaryTitle: string;
      question: string;
    };
  };
};

export type OwnershipSessionQuestion = {
  id: string;
  filePath: string;
  title: string;
  prompt: string;
  intent: string;
  hintLadder: string[];
};

export type OwnershipSessionState = {
  currentIndex: number;
  isComplete: boolean;
  weakAttemptStreak: number;
  observations: OwnershipSessionObservation[];
  lastFeedback: string | null;
  showHintLadder: boolean;
};

export type OwnershipSessionAdvance =
  | {
      kind: "advanced";
      state: OwnershipSessionState;
      observation?: OwnershipSessionObservation;
    }
  | {
      kind: "complete";
      state: OwnershipSessionState;
      feedback: string;
      observation?: OwnershipSessionObservation;
    };

export type LineSelection = {
  startLine: number;
  endLine: number;
  startSide?: "additions" | "deletions";
  endSide?: "additions" | "deletions";
};

export type TreeNode = {
  id: string;
  path: string;
  name: string;
  kind: TreeKind;
  state: BoundaryState;
  reason?: string;
  changes?: number;
  evidenceDensity?: number;
  children?: TreeNode[];
};

export type AttemptResult = {
  state: BoundaryState;
  summary: string;
  gapReason?: string;
  smallestRepair: string;
  returnCondition: string;
};

export type EvidenceByConfidence = Record<EvidenceConfidence, EvidenceRef[]>;
