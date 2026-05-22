import type {
  EvidenceRef,
  EscalationReason,
  OwnershipAttemptReadiness,
  OwnershipBoundary,
  OwnershipReviewArtifact,
  OwnershipSessionObservation,
  OwnershipSessionState,
  ReviewQueueItem,
  WorkspaceArtifactSourceKind,
} from "./types";
import type { TransferAttemptRecord } from "./transferVerification";

export type EscalationTrigger = {
  reason: EscalationReason;
  reasonText: string;
  evidenceRefs: EvidenceRef[];
  blockingIds: string[];
};

export type WorkspaceEscalationDecision = {
  isCandidate: boolean;
  primaryReason: EscalationReason | null;
  reasonText: string;
  evidence_refs: EvidenceRef[];
  blocking_ids: string[];
  triggers: EscalationTrigger[];
};

export type WorkspaceEscalationInput = {
  boundary: OwnershipBoundary;
  sessionState: OwnershipSessionState;
  readinessHistory: OwnershipAttemptReadiness[];
  transferHistory: TransferAttemptRecord[];
  reviewQueue: ReviewQueueItem[];
  evidenceRefs: EvidenceRef[];
};

export type BuildReviewArtifactInput = WorkspaceEscalationInput & {
  sourceKind: WorkspaceArtifactSourceKind;
  decision: WorkspaceEscalationDecision;
  goalContext?: string;
  diffTextRef?: string;
  now?: () => number;
};

const LOW_CALIBRATION_THRESHOLD = 0.55;
const LOW_CALIBRATION_REPEAT = 2;

const TRANSFER_FAILURE_SEQUENCE_MIN = 2;
const PREREQUISITE_DEPENDENCY_MIN = 1;
const DEPENDENCY_CHURN_MIN_ATTEMPTS = 2;
const DEPENDENCY_OPEN_QUESTION_MIN = 2;

function nowIso(now: () => number): string {
  return new Date(now()).toISOString();
}

function dedupe<T extends { id: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function dedupeStrings(entries: string[]): string[] {
  return [...new Set(entries.filter((entry) => entry.length > 0))];
}

function evidenceFromBoundary(boundary: OwnershipBoundary): EvidenceRef[] {
  if (boundary.evidence.length > 0) return boundary.evidence;
  return [
    {
      id: `anchor-${boundary.id}`,
      title: "Boundary anchor",
      detail: boundary.title,
      location: `${boundary.filePath}:${boundary.startLine}-${boundary.endLine}`,
      confidence: boundary.confidence,
    },
  ];
}

function evidenceFromObservations(observations: OwnershipSessionObservation[]): EvidenceRef[] {
  const fileToEvidence = new Map<string, EvidenceRef>();
  for (const observation of observations) {
    fileToEvidence.set(observation.filePath, {
      id: `obs-${observation.id}`,
      title: "Session observation",
      detail: observation.note,
      location: observation.filePath,
      confidence: "unverified",
    });
  }
  return [...fileToEvidence.values()];
}

function pickBlockingIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function relationGapRecurrence(
  boundary: OwnershipBoundary,
  sessionState: OwnershipSessionState,
): EscalationTrigger | null {
  const relationGaps = sessionState.observations.filter(
    (entry) => entry.reason === "could not connect caller/test",
  );
  if (relationGaps.length < 2) {
    return null;
  }

  return {
    reason: "relation-gap-recurrence",
    reasonText: "Relation-gap observations have recurred without progress on caller/test linking.",
    evidenceRefs: evidenceFromObservations(relationGaps),
    blockingIds: pickBlockingIds([boundary.id, boundary.filePath, ...relationGaps.map((entry) => entry.id)]),
  };
}

function repeatedLowCalibration(readinessHistory: OwnershipAttemptReadiness[]): EscalationTrigger | null {
  if (readinessHistory.length < LOW_CALIBRATION_REPEAT) {
    return null;
  }

  const tail = readinessHistory.slice(-LOW_CALIBRATION_REPEAT);
  const allLowCalibration = tail.every((entry) => entry.calibration_score < LOW_CALIBRATION_THRESHOLD);
  const allUnready = tail.every((entry) => entry.readiness_gate !== "ready");
  if (!allLowCalibration || !allUnready) {
    return null;
  }

  return {
    reason: "repeated-low-calibration",
    reasonText: `Last ${LOW_CALIBRATION_REPEAT} attempts stayed below calibration threshold (${LOW_CALIBRATION_THRESHOLD}).`,
    evidenceRefs: dedupe(tail.flatMap((entry) => entry.attemptEvidenceRefs)),
    blockingIds: pickBlockingIds(tail.map((entry) => entry.attempt_id)),
  };
}

function transferFailureAfterRepair(
  transferHistory: TransferAttemptRecord[],
): EscalationTrigger | null {
  const transferFailures = transferHistory.filter((attempt) => attempt.outcome === "transfer_fail");
  const latestAttempt = transferHistory.at(-1) ?? null;
  if (transferFailures.length < TRANSFER_FAILURE_SEQUENCE_MIN) {
    return null;
  }

  const lastTwo = transferHistory.slice(-TRANSFER_FAILURE_SEQUENCE_MIN);
  if (!lastTwo.every((attempt) => attempt.outcome === "transfer_fail")) {
    return null;
  }

  if (latestAttempt == null) {
    return null;
  }

  return {
    reason: "transfer-failure-after-repair",
    reasonText:
      "Transfer attempt was retried after repair signal, but failures continued in the latest attempts.",
    evidenceRefs: transferFailures.map((attempt) => ({
      id: attempt.transferId,
      title: `Transfer attempt ${attempt.attemptIndex}`,
      detail: `${attempt.questionId}: ${attempt.attemptTextPreview}`,
      location: `probe attempt ${attempt.attemptIndex}`,
      confidence: "unverified",
    })),
    blockingIds: pickBlockingIds([latestAttempt.transferId, ...transferFailures.map((attempt) => attempt.transferId)]),
  };
}

function prerequisiteChainDependency(
  boundary: OwnershipBoundary,
  reviewQueue: ReviewQueueItem[],
  readinessHistory: OwnershipAttemptReadiness[],
): EscalationTrigger | null {
  const openReadinessExists = readinessHistory.some((entry) => entry.readiness_gate !== "ready");
  const prerequisiteCandidates = reviewQueue.filter((item) => {
    if (item.filePath === boundary.filePath) return false;
    return item.touched === false || item.orderReason.includes("dependency") || item.orderReason.includes("caller");
  });

  if (
    !openReadinessExists ||
    readinessHistory.length < 2 ||
    prerequisiteCandidates.length < PREREQUISITE_DEPENDENCY_MIN ||
    boundary.open_questions.length < 2
  ) {
    return null;
  }

  return {
    reason: "prerequisite-chain-dependency",
    reasonText: "Prerequisite chain is incomplete and still blocking readiness completion.",
    evidenceRefs: dedupe([
      ...boundary.evidence,
      ...prerequisiteCandidates.map((item) => ({
        id: `queue-${item.id}`,
        title: "Review queue prerequisite",
        detail: `${item.boundaryTitle}: ${item.nextStep}`,
        location: item.filePath,
        confidence: "unverified",
      })),
    ]),
    blockingIds: pickBlockingIds([boundary.id, ...prerequisiteCandidates.map((entry) => entry.id)]),
  };
}

function dependencyChurn(
  boundary: OwnershipBoundary,
  readinessHistory: OwnershipAttemptReadiness[],
): EscalationTrigger | null {
  if (readinessHistory.length < DEPENDENCY_CHURN_MIN_ATTEMPTS) {
    return null;
  }

  const lastStates = readinessHistory.slice(-DEPENDENCY_CHURN_MIN_ATTEMPTS).map((entry) => entry.readiness_gate);
  const hasOpenQuestions = boundary.open_questions.length >= DEPENDENCY_OPEN_QUESTION_MIN;
  const noProgress = lastStates.every((state) => state !== "ready");
  const repeatedState = new Set(readinessHistory.slice(-DEPENDENCY_CHURN_MIN_ATTEMPTS).map((entry) => entry.state)).size === 1;
  if (!noProgress || !hasOpenQuestions || !repeatedState) {
    return null;
  }

  return {
    reason: "dependency-churn",
    reasonText: "Readiness retries are not changing dependency evidence state.",
    evidenceRefs: boundary.open_questions.map((question, index) => ({
      id: `${boundary.id}-open-question-${index + 1}`,
      title: "Open question",
      detail: question,
      location: boundary.filePath,
      confidence: "unverified",
    })),
    blockingIds: pickBlockingIds([boundary.filePath, ...boundary.files]),
  };
}

export function evaluateWorkspaceEscalation(input: WorkspaceEscalationInput): WorkspaceEscalationDecision {
  const triggers: EscalationTrigger[] = [];
  const relationGapTrigger = relationGapRecurrence(input.boundary, input.sessionState);
  const lowCalibrationTrigger = repeatedLowCalibration(input.readinessHistory);
  const transferTrigger = transferFailureAfterRepair(input.transferHistory);
  const prerequisiteTrigger = prerequisiteChainDependency(
    input.boundary,
    input.reviewQueue,
    input.readinessHistory,
  );
  const churnTrigger = dependencyChurn(input.boundary, input.readinessHistory);

  if (relationGapTrigger != null) triggers.push(relationGapTrigger);
  if (lowCalibrationTrigger != null) triggers.push(lowCalibrationTrigger);
  if (transferTrigger != null) triggers.push(transferTrigger);
  if (prerequisiteTrigger != null) triggers.push(prerequisiteTrigger);
  if (churnTrigger != null) triggers.push(churnTrigger);

  if (triggers.length === 0) {
    return {
      isCandidate: false,
      primaryReason: null,
      reasonText: "No deterministic escalation reason found from current evidence.",
      evidence_refs: dedupe(input.evidenceRefs),
      blocking_ids: [],
      triggers: [],
    };
  }

  const primary = triggers[0]!;
  const evidence_refs = dedupe(triggers.flatMap((trigger) => trigger.evidenceRefs));
  const fallbackEvidence = evidence_refs.length > 0 ? evidence_refs : evidenceFromBoundary(input.boundary);
  return {
    isCandidate: true,
    primaryReason: primary.reason,
    reasonText: primary.reasonText,
    evidence_refs: dedupe(fallbackEvidence.concat(evidenceFromBoundary(input.boundary))),
    blocking_ids: pickBlockingIds(triggers.flatMap((trigger) => trigger.blockingIds)),
    triggers,
  };
}

export function buildOwnershipReviewArtifact(input: BuildReviewArtifactInput): OwnershipReviewArtifact {
  const now = input.now ?? (() => Date.now());
  const readPath = dedupeStrings([
    input.boundary.filePath,
    ...input.boundary.files,
    ...input.reviewQueue.map((entry) => entry.filePath),
  ]);
  const artifactIdParts = [
    "artifact",
    input.boundary.id,
    input.decision.primaryReason ?? "manual",
    String(input.readinessHistory.length),
  ];

  const blockedReasons = input.decision.triggers.map((trigger) => trigger.reasonText);
  const evidenceSource = dedupe(input.decision.evidence_refs.concat(evidenceFromBoundary(input.boundary)));

  const summaryReason = input.decision.primaryReason == null
    ? "Deterministic escalation requested."
    : input.decision.primaryReason;
  const dependencyTrace = input.boundary.open_questions.length > 0 ? input.boundary.open_questions.join(" | ") : "No open questions";

  return {
    artifact_id: artifactIdParts.join("-"),
    created_at: nowIso(now),
    source_kind: input.sourceKind,
    review: `Escalation reason: ${summaryReason}. ${input.decision.reasonText}`,
    reason: input.decision.primaryReason ?? "manual",
    evidence_refs: evidenceSource,
    blocking_ids: pickBlockingIds(input.decision.blocking_ids),
    diff_text_ref: input.diffTextRef,
    goal_context: input.goalContext,
    areas_touched: dedupe(input.boundary.files),
    required_evidence: evidenceSource,
    read_path: readPath,
    blocked_reasons: blockedReasons,
    suggested_workspace_seed: `Boundary risk ${input.boundary.risk.score}; open questions: ${dependencyTrace}`,
  };
}
