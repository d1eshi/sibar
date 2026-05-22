import type {
  EvidenceCheck,
  ReadinessClaim,
  ReadinessStatus,
  UserAttempt,
  ConceptSlice,
  UserOperation,
} from "../loop-types.ts";
import type { MemoryAnswerEntry } from "./types.ts";
import { now, uniqueId } from "./shared.ts";

function normalizeAnswerText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createReadinessClaim(input: {
  conceptSlice: ConceptSlice;
  operation: UserOperation;
  status?: ReadinessStatus;
  blockingGaps?: string[];
  supportingEvidence?: { evidence_id: string }[];
  confidence?: "low" | "medium" | "high";
}): ReadinessClaim {
  const status = input.status ?? "unknown";
  const blockingGaps = input.blockingGaps ?? [];
  const scope = `Operation '${input.operation.kind}' on concept slice '${input.conceptSlice.label}' within the declared artifact boundary`;

  return {
    id: uniqueId("RC"),
    concept_slice_id: input.conceptSlice.id,
    operation_id: input.operation.id,
    status,
    scope,
    ready_to_explain: status === "ready",
    ready_to_trace: status === "ready",
    ready_to_derive: status === "ready",
    ready_to_predict: status === "ready",
    ready_to_build: false,
    ready_to_modify: false,
    ready_to_debug: false,
    ready_to_transfer: false,
    ready_to_teach: false,
    blocked_claims: blockingGaps.length > 0
      ? blockingGaps.map((g) => `Blocked by gap: ${g}`)
      : [],
    supporting_evidence: input.supportingEvidence ?? [],
    blocking_gaps: blockingGaps,
    confidence: input.confidence ?? "low",
    generated_at: now(),
  };
}

export function isRepeatedUnsupportedAnswer(input: {
  successfulAttempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  previousAnswerHistory: MemoryAnswerEntry[];
}): boolean {
  if (
    input.evidenceCheck.result === "confirmed"
    || input.evidenceCheck.unsupported_claims.length === 0
  ) {
    return false;
  }

  const normalized = normalizeAnswerText(input.successfulAttempt.answer_text);
  if (!normalized) {
    return false;
  }

  return input.previousAnswerHistory.some((entry) =>
    entry.operation_id === input.successfulAttempt.operation_id
    && entry.outcome !== "confirmed"
    && normalizeAnswerText(entry.answer_text) === normalized
  );
}

export function advanceReadinessAfterReevaluation(input: {
  currentClaim: ReadinessClaim;
  reevaluationSucceeded: boolean;
  resolvedGapIds: string[];
  successfulAttempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  previousAnswerHistory?: MemoryAnswerEntry[];
}): ReadinessClaim {
  const previousAnswerHistory = input.previousAnswerHistory ?? [];
  const repeatedUnsupported = isRepeatedUnsupportedAnswer({
    successfulAttempt: input.successfulAttempt,
    evidenceCheck: input.evidenceCheck,
    previousAnswerHistory,
  });
  const criteriaSatisfied = input.evidenceCheck.result === "confirmed";
  const canAdvance = input.reevaluationSucceeded && criteriaSatisfied && !repeatedUnsupported;

  if (!canAdvance) {
    const guardMessages = [
      !input.reevaluationSucceeded
        ? "Readiness blocked: re-evaluation did not succeed."
        : null,
      repeatedUnsupported
        ? "Readiness blocked: repeated unsupported answer; provide a genuinely new criteria-satisfying attempt."
        : null,
      input.reevaluationSucceeded && !criteriaSatisfied
        ? "Readiness blocked: re-evaluation did not satisfy required evidence criteria."
        : null,
    ].filter((value): value is string => Boolean(value));

    return {
      ...input.currentClaim,
      status: input.currentClaim.status === "ready" ? "limited" : input.currentClaim.status,
      blocked_claims: [...new Set([...input.currentClaim.blocked_claims, ...guardMessages])],
      generated_at: now(),
    };
  }

  const remainingBlockingGaps = input.currentClaim.blocking_gaps
    .filter((g) => !input.resolvedGapIds.includes(g));

  const newStatus: ReadinessStatus = remainingBlockingGaps.length === 0
    ? "ready"
    : "limited";

  return {
    ...input.currentClaim,
    id: uniqueId("RC"),
    status: newStatus,
    blocked_claims: remainingBlockingGaps.length > 0
      ? remainingBlockingGaps.map((g) => `Remaining gap: ${g}`)
      : [],
    blocking_gaps: remainingBlockingGaps,
    confidence: "high",
    supporting_evidence: [
      ...input.currentClaim.supporting_evidence,
      { evidence_id: input.successfulAttempt.id },
    ],
    ready_to_explain: newStatus === "ready",
    ready_to_trace: newStatus === "ready",
    ready_to_derive: newStatus === "ready",
    ready_to_predict: newStatus === "ready",
    generated_at: now(),
  };
}
