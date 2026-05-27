import type {
  UserAttempt,
  UserOperation,
  ThinkingArtifact,
  EvidenceCheck,
  OwnershipGapKind,
  EvidenceInventoryEntry,
} from "../loop-types.ts";

export type CreateAttemptInput = {
  operation_id: string;
  answer_text: string;
  selected_evidence: string[];
  declared_confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
};

export type EvaluateAttemptInput = {
  attempt: UserAttempt;
  operation: UserOperation;
  artifact: ThinkingArtifact;
  evidenceInventory?: EvidenceInventoryEntry[];
};

export type EvaluateAttemptOutput = {
  evidenceCheck: EvidenceCheck;
  gapKind: OwnershipGapKind | null;
  isOverconfident: boolean;
  hasDeclaredUncertainty: boolean;
};
