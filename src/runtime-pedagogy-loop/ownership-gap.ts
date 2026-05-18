import type {
  EvidenceCheck,
  OwnershipGap,
  OwnershipGapKind,
  ThinkingArtifact,
  UserAttempt,
} from "../runtime-deep-ownership.ts";
import type { EvaluateAttemptOutput } from "../runtime-attempt-evaluation.ts";
import { now, uniqueId } from "./shared.ts";

const DEFAULT_GAP_SEVERITY: Record<string, "critical" | "important" | "later"> = {
  false_confidence: "critical",
  ignored_counterevidence: "critical",
  wrong_causal_model: "critical",
  wrong_mechanism: "important",
  test_oracle_misread: "important",
  implementation_misread: "important",
  behavior_misread: "important",
  shallow_trace: "important",
  missing_prerequisite: "important",
  vocabulary_only: "important",
  memorized_without_mechanism: "important",
  transfer_failure: "later",
  formula_misread: "later",
  unsupported_claim: "later",
  passive_agreement: "later",
};

function buildGapEvidence(ec: EvidenceCheck, gapKind: OwnershipGapKind): string {
  const parts: string[] = [];

  if (ec.observed_claims.length > 0) {
    parts.push(`Observed: ${ec.observed_claims.join("; ")}`);
  }
  if (ec.missing_claims.length > 0) {
    parts.push(`Missing: ${ec.missing_claims.slice(0, 3).join("; ")}`);
  }
  if (ec.contradicted_claims.length > 0) {
    parts.push(`Contradicted: ${ec.contradicted_claims.slice(0, 3).join("; ")}`);
  }
  if (ec.unsupported_claims.length > 0) {
    parts.push(`Unsupported: ${ec.unsupported_claims.slice(0, 3).join("; ")}`);
  }

  parts.push(`Gap kind: ${gapKind}`);

  return parts.join(". ");
}

export function createOwnershipGap(input: {
  evalOutput: EvaluateAttemptOutput;
  conceptSliceId: string;
  userAttempt: UserAttempt;
  artifact: ThinkingArtifact;
}): OwnershipGap | null {
  const { evidenceCheck, gapKind } = input.evalOutput;

  if (!gapKind || evidenceCheck.result === "confirmed") {
    return null;
  }

  const artifactEvidence = evidenceCheck.cited_evidence.length > 0
    ? evidenceCheck.cited_evidence
    : input.artifact.source_evidence.slice(0, 3);

  if (artifactEvidence.length === 0) {
    return null;
  }

  const severity = DEFAULT_GAP_SEVERITY[gapKind] ?? "important";
  const evidenceDescription = buildGapEvidence(evidenceCheck, gapKind);

  return {
    id: uniqueId("GAP"),
    concept_slice_id: input.conceptSliceId,
    kind: gapKind,
    user_attempt_ref: input.userAttempt.id,
    artifact_evidence_refs: artifactEvidence.slice(0, 5),
    evidence: evidenceDescription,
    severity,
    blocks_readiness: severity === "critical" || severity === "important",
    created_at: now(),
  };
}
