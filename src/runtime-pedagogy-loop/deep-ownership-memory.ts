import type { ConceptSlice, OwnershipGap, RepairAction } from "../runtime-deep-ownership.ts";
import type {
  DeepOwnershipMemory,
  MemoryAnswerEntry,
  MemoryConceptEntry,
  MemoryOperationEntry,
  MisconceptionMemory,
} from "./types.ts";
import { addDays, now, uniqueId } from "./shared.ts";

export function buildDeepOwnershipMemory(input: {
  loopId: string;
  conceptSlice: ConceptSlice;
  answerHistory: MemoryAnswerEntry[];
  gaps: OwnershipGap[];
  repairActions: RepairAction[];
  misconceptionMemory: MisconceptionMemory[];
}): DeepOwnershipMemory {
  const conceptLabel = input.conceptSlice.label;
  const conceptSliceId = input.conceptSlice.id;

  const answersByOp = new Map<string, MemoryAnswerEntry[]>();
  for (const answer of input.answerHistory) {
    const list = answersByOp.get(answer.operation_id) ?? [];
    list.push(answer);
    answersByOp.set(answer.operation_id, list);
  }

  const operationEntries: MemoryOperationEntry[] = [];
  for (const [opId, answers] of answersByOp) {
    const confirmed = answers.some((a) => a.outcome === "confirmed");
    const lastSuccess = [...answers]
      .filter((a) => a.outcome === "confirmed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastAttempt = [...answers]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const operationKind = answers[0]?.operation_kind ?? "explain";

    operationEntries.push({
      operation_id: opId,
      operation_kind: operationKind,
      concept_slice_id: conceptSliceId,
      is_confirmed: confirmed,
      attempts_count: answers.length,
      last_attempt_at: lastAttempt?.created_at ?? null,
      last_success_at: lastSuccess?.created_at ?? null,
    });
  }

  const confirmedOps = operationEntries
    .filter((op) => op.is_confirmed)
    .map((op) => op.operation_kind);
  const lastSuccessAt = operationEntries
    .filter((op) => op.last_success_at)
    .map((op) => op.last_success_at!)
    .sort()
    .pop() ?? null;

  const conceptEntry: MemoryConceptEntry = {
    concept_slice_id: conceptSliceId,
    label: conceptLabel,
    confirmed_operations: [...new Set(confirmedOps)],
    open_gaps: input.gaps.map((g) => g.id),
    misconceptions: input.misconceptionMemory.map((m) => m.id),
    last_successful_attempt_at: lastSuccessAt,
    retention_due_at: lastSuccessAt ? addDays(lastSuccessAt, 7) : null,
    transfer_due_at: lastSuccessAt ? addDays(lastSuccessAt, 14) : null,
  };

  return {
    id: uniqueId("MEM"),
    loop_id: input.loopId,
    generated_at: now(),
    concept_entries: [conceptEntry],
    operation_entries: operationEntries,
    answer_history: input.answerHistory,
    open_gaps: input.gaps,
    repair_actions: input.repairActions,
    misconception_memory: input.misconceptionMemory,
    next_review_at: conceptEntry.retention_due_at,
  };
}
