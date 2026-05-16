import type { EvaluateFullLoopInput, LoopResult, MemoryAnswerEntry } from "./types.ts";
import { createOwnershipGap } from "./ownership-gap.ts";
import { createRepairAction } from "./repair-action.ts";
import { buildPrerequisiteRoute } from "./prerequisite-route.ts";
import { generateReevaluation } from "./reevaluation.ts";
import { createReadinessClaim } from "./readiness.ts";
import { trackMisconception } from "./misconception-memory.ts";
import { buildDeepOwnershipMemory } from "./deep-ownership-memory.ts";
import { uniqueId } from "./shared.ts";

function toMemoryOutcome(result: LoopResult["evidenceCheck"]["result"]): MemoryAnswerEntry["outcome"] {
  if (result === "confirmed") return "confirmed";
  if (result === "partial") return "partial";
  if (result === "contradiction") return "contradiction";
  if (result === "insufficient_evidence") return "insufficient_evidence";
  return "gap";
}

export function evaluateFullLoop(input: EvaluateFullLoopInput): LoopResult {
  const { evidenceCheck, isOverconfident, hasDeclaredUncertainty } = input.evalOutput;

  const gap = createOwnershipGap({
    evalOutput: input.evalOutput,
    conceptSliceId: input.conceptSlice.id,
    userAttempt: input.userAttempt,
    artifact: input.artifact,
  });

  const repairAction = gap
    ? createRepairAction({ gap, conceptSlice: input.conceptSlice })
    : null;

  const prerequisiteRoute = gap && gap.kind !== "false_confidence"
    ? buildPrerequisiteRoute({
        gap,
        originalOperation: input.operation,
        conceptSlice: input.conceptSlice,
      })
    : null;

  const reevaluationPrompt = gap
    ? generateReevaluation({
        originalOperation: input.operation,
        gap,
        conceptSlice: input.conceptSlice,
        artifact: input.artifact,
      })
    : null;

  const readinessClaim = createReadinessClaim({
    conceptSlice: input.conceptSlice,
    operation: input.operation,
    status: gap ? (gap.blocks_readiness ? "blocked" : "limited") : "ready",
    blockingGaps: gap ? [gap.id] : [],
    supportingEvidence: [
      ...(gap ? gap.artifact_evidence_refs.map((r) => ({ evidence_id: r.evidence_id })) : []),
      { evidence_id: input.userAttempt.id },
    ],
    confidence: gap && isOverconfident
      ? "low"
      : gap
        ? "medium"
        : "high",
  });

  const misconceptionMemory = gap
    ? trackMisconception({
        existingMisconceptions: input.existingMisconceptions ?? [],
        gap,
        conceptSliceId: input.conceptSlice.id,
        conceptLabel: input.conceptSlice.label,
        evidenceRefs: gap.artifact_evidence_refs,
        repairActionId: repairAction?.id ?? "no-repair",
      })
    : (input.existingMisconceptions ?? []);

  const memoryAnswerEntry: MemoryAnswerEntry = {
    answer_id: uniqueId("MA"),
    attempt_id: input.userAttempt.id,
    operation_id: input.operation.id,
    operation_kind: input.operation.kind,
    concept_slice_id: input.conceptSlice.id,
    answer_text: input.userAttempt.answer_text,
    outcome: toMemoryOutcome(evidenceCheck.result),
    confidence: input.userAttempt.declared_confidence,
    had_declared_uncertainty: hasDeclaredUncertainty,
    created_at: input.userAttempt.created_at,
    evidence: evidenceCheck.cited_evidence,
  };

  const memory = buildDeepOwnershipMemory({
    loopId: input.loopId,
    conceptSlice: input.conceptSlice,
    answerHistory: [...(input.existingAnswerHistory ?? []), memoryAnswerEntry],
    gaps: [...(input.existingGaps ?? []), ...(gap ? [gap] : [])],
    repairActions: repairAction ? [repairAction] : [],
    misconceptionMemory,
  });

  return {
    attempt: input.userAttempt,
    evidenceCheck,
    gap,
    repairAction,
    prerequisiteRoute,
    reevaluationPrompt,
    readinessClaim,
    misconceptionMemory,
    memory,
    memoryAnswerEntry,
  };
}
