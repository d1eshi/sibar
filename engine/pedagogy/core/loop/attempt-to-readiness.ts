import type {
  EvidenceInventoryEntry,
  ThinkingArtifact,
  UserAttempt,
  UserOperation,
  ConceptSlice,
} from "../loop-types.ts";
import type { EvaluateAttemptOutput } from "../attempt-evaluation.ts";
import type { LoopResult, MemoryAnswerEntry, MisconceptionMemory } from "./types.ts";
import { evaluateFullLoop } from "./pipeline.ts";
import { validateEvidenceIdentity } from "./evidence-identity.ts";

export function attemptToReadiness(input: {
  loopId: string;
  attempt: UserAttempt;
  evalOutput: EvaluateAttemptOutput;
  operation: UserOperation;
  artifact: ThinkingArtifact;
  conceptSlice: ConceptSlice;
  evidenceInventory: EvidenceInventoryEntry[];
  existingMisconceptions?: MisconceptionMemory[];
  existingGaps?: import("../loop-types.ts").OwnershipGap[];
  existingAnswerHistory?: MemoryAnswerEntry[];
}): LoopResult & { evidenceStable: boolean; evidenceIssues: string[] } {
  const result = evaluateFullLoop({
    loopId: input.loopId,
    userAttempt: input.attempt,
    evalOutput: input.evalOutput,
    operation: input.operation,
    artifact: input.artifact,
    conceptSlice: input.conceptSlice,
    existingMisconceptions: input.existingMisconceptions,
    existingGaps: input.existingGaps,
    existingAnswerHistory: input.existingAnswerHistory,
  });

  const identityCheck = validateEvidenceIdentity({
    evidenceInventory: input.evidenceInventory,
    artifact: input.artifact,
    operation: input.operation,
    attempt: input.attempt,
    evidenceCheck: result.evidenceCheck,
    gap: result.gap,
    repairAction: result.repairAction,
    readinessClaim: result.readinessClaim,
    prerequisiteRoute: result.prerequisiteRoute,
    reevaluationPrompt: result.reevaluationPrompt,
  });

  if (!identityCheck.stable) {
    throw new Error(
      `Evidence identity is NOT stable: ${identityCheck.issues.join("; ")}`,
    );
  }

  return { ...result, evidenceStable: true, evidenceIssues: [] };
}
