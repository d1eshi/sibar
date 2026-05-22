import type { EvidenceCheck, OwnershipGapKind, UserAttempt } from "../loop-types.ts";
import { createAttempt } from "./attempt-capture.ts";
import { evaluateAttempt } from "./evaluate-attempt.ts";

export function captureAndEvaluate(input: {
  operation: import("../loop-types.ts").UserOperation;
  artifact: import("../loop-types.ts").ThinkingArtifact;
  answer_text: string;
  selected_evidence: string[];
  declared_confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
  evidenceInventory?: import("../loop-types.ts").EvidenceInventoryEntry[];
}): {
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gapKind: OwnershipGapKind | null;
  isOverconfident: boolean;
  hasDeclaredUncertainty: boolean;
} {
  const attempt = createAttempt({
    operation_id: input.operation.id,
    answer_text: input.answer_text,
    selected_evidence: input.selected_evidence,
    declared_confidence: input.declared_confidence,
    declared_unknowns: input.declared_unknowns,
  });

  const evaluation = evaluateAttempt({
    attempt,
    operation: input.operation,
    artifact: input.artifact,
    evidenceInventory: input.evidenceInventory,
  });

  return {
    attempt,
    ...evaluation,
  };
}
