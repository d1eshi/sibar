import type {
  EvidenceInventoryEntry,
  ThinkingArtifact,
  UserOperation,
  UserAttempt,
  EvidenceCheck,
  OwnershipGap,
  RepairAction,
  ReadinessClaim,
} from "../loop-types.ts";
import type { PrerequisiteRoute, ReevaluationPrompt } from "./types.ts";

export function validateEvidenceIdentity(input: {
  evidenceInventory: EvidenceInventoryEntry[];
  artifact: ThinkingArtifact;
  operation: UserOperation;
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gap: OwnershipGap | null;
  repairAction: RepairAction | null;
  readinessClaim: ReadinessClaim;
  prerequisiteRoute: PrerequisiteRoute | null;
  reevaluationPrompt: ReevaluationPrompt | null;
}): { stable: boolean; issues: string[] } {
  const issues: string[] = [];
  const validIds = new Set(input.evidenceInventory.map((e) => e.id));

  function checkRefs(label: string, refs: { evidence_id: string }[]): void {
    for (const ref of refs) {
      if (!ref.evidence_id) {
        issues.push(`${label}: evidence ref missing evidence_id`);
      } else if (!validIds.has(ref.evidence_id)) {
        issues.push(`${label}: evidence_id '${ref.evidence_id}' not found in inventory`);
      }
    }
  }

  function checkIdRefs(label: string, ids: string[]): void {
    for (const id of ids) {
      if (!validIds.has(id)) {
        issues.push(`${label}: evidence_id '${id}' not found in inventory`);
      }
    }
  }

  checkRefs("artifact.source_evidence", input.artifact.source_evidence);
  checkIdRefs("operation.required_evidence", input.operation.required_evidence);

  for (const evId of input.attempt.selected_evidence) {
    if (!validIds.has(evId)) {
      issues.push(`attempt.selected_evidence: evidence_id '${evId}' not found in inventory`);
    }
  }

  checkRefs("evidenceCheck.cited_evidence", input.evidenceCheck.cited_evidence);

  if (input.gap) {
    checkRefs("gap.artifact_evidence_refs", input.gap.artifact_evidence_refs);
    if (!input.gap.user_attempt_ref || typeof input.gap.user_attempt_ref !== "string") {
      issues.push("gap.user_attempt_ref is missing or invalid");
    }
  }

  if (input.repairAction) {
    checkRefs("repairAction.required_evidence", input.repairAction.required_evidence);
    if (input.gap && input.repairAction.source_gap_id !== input.gap.id) {
      issues.push(`repairAction.source_gap_id '${input.repairAction.source_gap_id}' does not match gap.id '${input.gap?.id}'`);
    }
  }

  for (const ref of input.readinessClaim.supporting_evidence) {
    if (!ref.evidence_id) {
      issues.push("readinessClaim.supporting_evidence: ref missing evidence_id");
    }
  }
  if (
    input.gap
    && input.readinessClaim.blocking_gaps.length > 0
    && !input.readinessClaim.blocking_gaps.includes(input.gap.id)
  ) {
    issues.push(`readinessClaim.blocking_gaps does not include gap.id '${input.gap.id}'`);
  }

  if (input.prerequisiteRoute && input.prerequisiteRoute.original_operation_id !== input.operation.id) {
    issues.push(`prerequisiteRoute.original_operation_id '${input.prerequisiteRoute.original_operation_id}' does not match operation.id '${input.operation.id}'`);
  }

  if (input.reevaluationPrompt) {
    if (input.reevaluationPrompt.original_operation_id !== input.operation.id) {
      issues.push(`reevaluationPrompt.original_operation_id '${input.reevaluationPrompt.original_operation_id}' does not match operation.id '${input.operation.id}'`);
    }
    checkIdRefs("reevaluationPrompt.required_evidence", input.reevaluationPrompt.required_evidence);
  }

  return {
    stable: issues.length === 0,
    issues,
  };
}
