import type {
  UserOperation,
  UserOperationKind,
  OwnershipGap,
  ConceptSlice,
  ThinkingArtifact,
} from "../loop-types.ts";
import type { ReevaluationPrompt } from "./types.ts";
import { now, uniqueId } from "./shared.ts";

const NON_REPEATING_ALTERNATIVES: Record<UserOperationKind, UserOperationKind[]> = {
  explain: ["trace", "teach", "derive"],
  trace: ["explain", "predict", "derive"],
  derive: ["predict", "explain", "trace"],
  predict: ["derive", "trace", "build"],
  build: ["modify", "debug", "predict"],
  modify: ["build", "debug", "transfer"],
  debug: ["trace", "modify", "predict"],
  transfer: ["teach", "build", "explain"],
  teach: ["explain", "trace", "transfer"],
};

function buildReevaluationPrompt(
  originalOp: UserOperation,
  gap: OwnershipGap,
  nearbyKind: UserOperationKind,
): string {
  const operationVerb: Record<UserOperationKind, string> = {
    explain: "Explain",
    trace: "Trace",
    derive: "Derive",
    predict: "Predict",
    build: "Build",
    modify: "Modify",
    debug: "Debug",
    transfer: "Transfer",
    teach: "Teach",
  };

  return `${operationVerb[nearbyKind]} how the gap '${gap.kind}' was resolved using the evidence at ${gap.artifact_evidence_refs.map((r) => `${r.file_path}:${r.start_line}`).join(", ")}. Do NOT repeat your previous answer. Show new understanding that addresses the missing claims: ${gap.evidence.slice(0, 120)}.`;
}

export function generateReevaluation(input: {
  originalOperation: UserOperation;
  gap: OwnershipGap;
  conceptSlice: ConceptSlice;
  artifact: ThinkingArtifact;
}): ReevaluationPrompt {
  const alternatives = NON_REPEATING_ALTERNATIVES[input.originalOperation.kind]
    ?? ["explain", "trace", "predict"];

  const nearbyKind = alternatives.find((k) => k !== input.originalOperation.kind)
    ?? alternatives[0];

  const requiredEvidence = [
    ...new Set([
      ...input.originalOperation.required_evidence,
      ...input.gap.artifact_evidence_refs.map((r) => r.evidence_id),
      ...input.artifact.success_criteria
        .slice(0, 2)
        .map(() => input.gap.artifact_evidence_refs[0]?.evidence_id ?? ""),
    ]),
  ].filter(Boolean).slice(0, 5);

  return {
    id: uniqueId("REV"),
    original_operation_id: input.originalOperation.id,
    original_gap_id: input.gap.id,
    nearby_operation_kind: nearbyKind,
    prompt: buildReevaluationPrompt(input.originalOperation, input.gap, nearbyKind),
    required_evidence: requiredEvidence,
    success_criteria: [
      `Demonstrates understanding of the concept previously gapped as '${input.gap.kind}'`,
      `Cites evidence ${requiredEvidence.join(", ")} correctly`,
      "Shows revised reasoning that addresses the gap",
    ],
    avoid_repeating_prompt: input.originalOperation.prompt,
    created_at: now(),
  };
}
