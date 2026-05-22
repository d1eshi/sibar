import type { OwnershipAttemptReadiness, OwnershipBoundary, ReadinessGate } from "./types";
import type { ReviewQueueItem } from "./types";

export type TransferOutcome = "transfer_pass" | "transfer_fail" | "transfer_skip";

export type TransferQuestionId = "transfer_to_related_file" | "transfer_unknown";

export type TransferProbe = {
  id: string;
  required: boolean;
  sourceBoundaryFile: string;
  sourceBoundaryTitle: string;
  relatedBoundaryFile: string;
  relatedBoundaryTitle: string;
  question: string;
};

export type TransferAttemptRecord = {
  transferId: string;
  probeId: string;
  attemptIndex: number;
  attemptTextPreview: string;
  startedAt: number;
  submittedAt: number;
  outcome: TransferOutcome;
  questionId: TransferQuestionId;
  recurrenceTags: string[];
  followUpTasks: string[];
  escalationCandidate: boolean;
};

export type TransferReadinessState = {
  required: boolean;
  probe: TransferProbe;
  transferOutcome: TransferOutcome | null;
  transferAttemptCount: number;
  transferRecurrenceTags: string[];
  transferFollowUpTasks: string[];
  transferEscalationCandidate: boolean;
  readinessContinuity: number;
  debtSignal: number;
  transferred: boolean;
};

export type TransferStateForReadiness = OwnershipAttemptReadiness & {
  transfer: TransferReadinessState;
};

type ReadinessInput = {
  boundary: OwnershipBoundary;
  reviewQueue: ReviewQueueItem[];
  readiness: OwnershipAttemptReadiness;
  transferHistory: TransferAttemptRecord[];
};

type EvaluateAttemptInput = {
  attemptText: string;
  attemptIndex: number;
  probe: TransferProbe;
  transferHistory: TransferAttemptRecord[];
  startedAt: number;
  submittedAt?: number;
  now?: () => number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function extractNameFromPath(path: string): string {
  const file = path.split("/").at(-1) ?? path;
  return file.replace(/\.[tj]sx?$/, "");
}

function attemptTextPreview(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length <= 90 ? normalized : `${normalized.slice(0, 87)}...`;
}

function sanitizeToken(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, " ").trim();
}

function chooseRelatedBoundaryPath(
  boundary: OwnershipBoundary,
  reviewQueue: ReviewQueueItem[],
): string {
  const relatedCandidates = boundary.files.filter((path) => path !== boundary.filePath);
  if (relatedCandidates.length === 0) {
    return boundary.filePath;
  }

  const byQueuePriority = new Map<string, number>();
  for (const [index, item] of reviewQueue.entries()) {
    byQueuePriority.set(item.filePath, index + 1);
  }

  const sorted = [...relatedCandidates].sort((left, right) => {
    const leftIsRuntime = /\/runtime\//.test(left);
    const rightIsRuntime = /\/runtime\//.test(right);
    if (leftIsRuntime !== rightIsRuntime) {
      return leftIsRuntime ? -1 : 1;
    }

    const leftIsTest = /\.test\./.test(left);
    const rightIsTest = /\.test\./.test(right);
    if (leftIsTest !== rightIsTest) {
      return leftIsTest ? 1 : -1;
    }

    const leftPriority = byQueuePriority.get(left) ?? Number.POSITIVE_INFINITY;
    const rightPriority = byQueuePriority.get(right) ?? Number.POSITIVE_INFINITY;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });

  return sorted[0]!;
}

function titleForBoundary(path: string, reviewQueue: ReviewQueueItem[]): string {
  const directMatch = reviewQueue.find((item) => item.filePath === path)?.boundaryTitle;
  if (directMatch != null) {
    return directMatch;
  }
  return `${extractNameFromPath(path)} boundary`;
}

function buildRecurrenceTags(history: TransferAttemptRecord[], outcome?: TransferOutcome): { escalationCandidate: boolean; recurrenceTags: string[] } {
  const historyFailureCount = history.filter((attempt) => attempt.outcome === "transfer_fail").length;
  const effectiveFailureCount =
    outcome === "transfer_fail" ? historyFailureCount + 1 : historyFailureCount;

  const recurrenceTags = ["transfer-attempt"];
  if (effectiveFailureCount > 0) {
    recurrenceTags.push(`transfer-recurrence-${effectiveFailureCount}`);
    recurrenceTags.push("transfer-retry");
  }

  return { escalationCandidate: effectiveFailureCount >= 2, recurrenceTags };
}

function makeFollowUpTasks(history: TransferAttemptRecord[], outcome: TransferOutcome): string[] {
  if (outcome === "transfer_pass") {
    return ["Transfer proof passed. No immediate follow-up needed for local ownership continuity."];
  }

  if (outcome === "transfer_skip") {
    return [
      "Add a bounded follow-up task in the next pass to compare one invariant between source and related boundary.",
      "Mark this as a local follow-up before ownership is consolidated.",
    ];
  }

  const priorFailCount = history.filter((attempt) => attempt.outcome === "transfer_fail").length;
  return [
    "Name one concrete invariant that must hold in the related boundary file.",
    "Anchor the answer to a guard/branch phrase (`if (!...)`) to prevent over-general claims.",
    ...(priorFailCount >= 1
      ? [
          "Escalation candidate: transfer failed repeatedly. Queue a recovery task bundle before final handoff.",
        ]
      : []),
  ];
}

function makeTransferAttemptId(
  boundaryFile: string,
  attemptIndex: number,
  submittedAt: number,
): string {
  return `transfer-${sanitizeToken(boundaryFile)}-${String(Math.max(1, attemptIndex)).padStart(2, "0")}-${submittedAt}`;
}

function hasTransferSignal(normalizedAttempt: string, sourceToken: string, targetToken: string): boolean {
  const transferSignals = [
    "transfer",
    "apply",
    "carry",
    "reuse",
    "same",
    "analogous",
    "equivalent",
    "as if",
  ];

  const hasSource = normalizedAttempt.includes(sourceToken) || normalizedAttempt.includes("source");
  const hasTarget = normalizedAttempt.includes(targetToken) || normalizedAttempt.includes("related");
  const hasContract = normalizedAttempt.includes("null") || normalizedAttempt.includes("session");
  const hasCaller = normalizedAttempt.includes("caller") || normalizedAttempt.includes("consumer") || normalizedAttempt.includes("if");
  const hasTransferVerb = transferSignals.some((token) => normalizedAttempt.includes(token));

  return hasSource && hasTarget && hasContract && hasCaller && hasTransferVerb;
}

function deriveContinuity(gate: ReadinessGate, transferOutcome: TransferOutcome | null): number {
  const base = gate === "ready" ? 0.52 : 0.18;
  if (transferOutcome === "transfer_pass") {
    return clamp01(base + 0.35);
  }
  if (transferOutcome === "transfer_fail") {
    return clamp01(base - 0.05);
  }
  if (transferOutcome === "transfer_skip") {
    return clamp01(base - 0.18);
  }
  return base;
}

function deriveDebtSignal(readinessContinuity: number): number {
  return clamp01(1 - readinessContinuity);
}

export function makeTransferProbe(
  boundary: OwnershipBoundary,
  reviewQueue: ReviewQueueItem[],
): TransferProbe {
  const relatedBoundary = chooseRelatedBoundaryPath(boundary, reviewQueue);
  return {
    id: `probe-${boundary.id}-${sanitizeToken(boundary.filePath)}`,
    required: boundary.files.some((path) => path !== boundary.filePath),
    sourceBoundaryFile: boundary.filePath,
    sourceBoundaryTitle: boundary.title,
    relatedBoundaryFile: relatedBoundary,
    relatedBoundaryTitle: titleForBoundary(relatedBoundary, reviewQueue),
    question:
      `Transfer this boundary contract from ${extractNameFromPath(boundary.filePath)} to ${extractNameFromPath(relatedBoundary)}. ` +
      "Name one invariant that must hold in both locations and one guard phrase that keeps behavior safe.",
  };
}

export function evaluateTransferAttempt(input: EvaluateAttemptInput): TransferAttemptRecord {
  const now = input.now ?? (() => Date.now());
  const submittedAt = input.submittedAt ?? now();
  const sourceToken = sanitizeToken(extractNameFromPath(input.probe.sourceBoundaryFile)).toLowerCase();
  const targetToken = sanitizeToken(extractNameFromPath(input.probe.relatedBoundaryFile)).toLowerCase();
  const normalizedAttempt = normalizeText(input.attemptText);
  const outcome = hasTransferSignal(normalizedAttempt, sourceToken, targetToken)
    ? "transfer_pass"
    : "transfer_fail";
  const { escalationCandidate, recurrenceTags } = buildRecurrenceTags(input.transferHistory, outcome);
  const followUpTasks = makeFollowUpTasks(input.transferHistory, outcome);

  return {
    probeId: input.probe.id,
    transferId: makeTransferAttemptId(input.probe.sourceBoundaryFile, input.attemptIndex, submittedAt),
    attemptIndex: input.attemptIndex,
    attemptTextPreview: attemptTextPreview(input.attemptText),
    startedAt: input.startedAt,
    submittedAt,
    outcome,
    questionId: "transfer_to_related_file",
    recurrenceTags,
    followUpTasks,
    escalationCandidate: outcome === "transfer_fail" && escalationCandidate,
  };
}

export function makeTransferSkip(
  input: Omit<EvaluateAttemptInput, "attemptText" | "transferHistory"> & {
    attemptText: string;
    attemptIndex: number;
    transferHistory: TransferAttemptRecord[];
  },
): TransferAttemptRecord {
  const now = input.now ?? (() => Date.now());
  const submittedAt = input.submittedAt ?? now();
  const { recurrenceTags } = buildRecurrenceTags(input.transferHistory);
  const outcome: TransferOutcome = "transfer_skip";
  const followUpTasks = makeFollowUpTasks(input.transferHistory, outcome);

  return {
    probeId: input.probe.id,
    transferId: makeTransferAttemptId(input.probe.sourceBoundaryFile, input.attemptIndex, submittedAt),
    attemptIndex: input.attemptIndex,
    attemptTextPreview: input.attemptText.trim().length > 0 ? attemptTextPreview(input.attemptText) : "skipped",
    startedAt: input.startedAt,
    submittedAt,
    outcome,
    questionId: "transfer_unknown",
    recurrenceTags,
    followUpTasks,
    escalationCandidate: false,
  };
}

export function integrateTransferReadinessState(input: ReadinessInput): TransferStateForReadiness {
  const latestAttempt = input.transferHistory.at(-1) ?? null;
  const transferOutcome = latestAttempt?.outcome ?? null;
  const readinessContinuity = deriveContinuity(input.readiness.readiness_gate, transferOutcome);
  const debtSignal = deriveDebtSignal(readinessContinuity);
  const probe = makeTransferProbe(input.boundary, input.reviewQueue);

  return {
    ...input.readiness,
    transfer: {
      required: probe.required,
      probe,
      transferOutcome,
      transferAttemptCount: input.transferHistory.length,
      transferRecurrenceTags: latestAttempt?.recurrenceTags ?? [],
      transferFollowUpTasks: latestAttempt?.followUpTasks ?? [
        "Answer the transfer probe to prove one invariant across the related boundary.",
      ],
      transferEscalationCandidate: latestAttempt?.escalationCandidate ?? false,
      readinessContinuity,
      debtSignal,
      transferred: latestAttempt?.outcome === "transfer_pass",
    },
  };
}
