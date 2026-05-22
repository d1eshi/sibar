import type {
  CodeEvidence,
  OwnershipBoundary,
  ReviewQueueItem,
} from "./types";
import type { OwnershipMemoryEvent, OwnershipMemoryExportBundle } from "./ownershipMemory";
import type { OwnershipAttemptReadiness } from "./types";
import type { TransferAttemptRecord } from "./transferVerification";

type AttemptRecordSource = {
  attemptIds: string[];
  evidenceRefIds: string[];
};

export type CognitiveMetricSourceInputs = AttemptRecordSource & {
  transferAttemptIds?: string[];
};

export type CognitiveDebtMetric = {
  artifactScope: string;
  boundaryId: string;
  boundary_gap_density: number;
  readiness_debt: number;
  calibration_gap: number;
  attempt_variance: number;
  lastComputedAt: string;
  source_inputs: CognitiveMetricSourceInputs;
};

export type CognitiveLoadMetric = {
  boundaryId: string;
  boundary_fanout: number;
  dependency_depth: number;
  repair_retry_count: number;
  churn_weight: number;
  lastComputedAt: string;
  source_inputs: CognitiveMetricSourceInputs;
};

export type ReadoutTransferResult = "pass" | "fail" | "skipped";

export type DailyReadoutTransferSummary = {
  boundaryId: string;
  result: ReadoutTransferResult;
  attemptId?: string;
  reason?: string;
};

export type DailyCognitiveReadout = {
  date: string;
  ready_count: number;
  outstanding_gaps: string[];
  transfer_summary: DailyReadoutTransferSummary[];
  load_hotspots: string[];
  top_3_follow_up_actions: string[];
  cognitive_debt_metric: CognitiveDebtMetric;
  cognitive_load_metric: CognitiveLoadMetric;
};

type BoundaryCognitiveInput = {
  boundary: OwnershipBoundary;
  memoryExport: OwnershipMemoryExportBundle;
  reviewQueue?: ReviewQueueItem[];
  codeEvidence?: CodeEvidence[];
  now?: () => number;
};

export function buildCognitiveDebtMetric(input: BoundaryCognitiveInput): CognitiveDebtMetric {
  const now = resolveMetricTimestamp(input.memoryExport, input.now);
  const memoryEvents = input.memoryExport.events;
  const readinessEvents = memoryEvents.filter(
    (event): event is Extract<OwnershipMemoryEvent, { event_type: "readiness_attempt" }> =>
      event.event_type === "readiness_attempt" && event.boundary_id === input.boundary.id,
  );
  const transferEvents = memoryEvents.filter(
    (event): event is Extract<OwnershipMemoryEvent, { event_type: "transfer_attempt" }> =>
      event.event_type === "transfer_attempt" && event.boundary_id === input.boundary.id,
  );
  const guidedEvents = memoryEvents.filter(
    (event): event is Extract<OwnershipMemoryEvent, { event_type: "guided_observation" }> =>
      event.event_type === "guided_observation" && event.boundary_id === input.boundary.id,
  );

  const readinessAttempts = readinessEvents.map((event) => event.payload.readiness);
  const readinessSignal = readinessAttempts.length === 0
    ? 0
    : readinessAttempts.reduce((total, attempt) => {
      const signal = attempt.readiness_gate === "ready" ? 1 : attempt.readiness_gate === "repair-needed" ? 0.56 : 0.2;
      return total + signal;
    }, 0) / readinessAttempts.length;

  const calibrationGap = readinessAttempts.length === 0
    ? 1
    : average(readinessAttempts.map((attempt) => clamp01(Math.abs(attempt.self_confidence - attempt.evidence_fit))));
  const relationGapCount = countRelationGapSignals({
    boundaryId: input.boundary.id,
    readinessEvents,
    guidedEvents,
    recurringGaps: input.memoryExport.recurring_gaps,
  });
  const candidateRelationItems = deriveCandidateRelationItems(input.boundary, input.reviewQueue, input.codeEvidence);
  const boundaryGapDensity = computeBoundaryGapDensity(relationGapCount, candidateRelationItems.length);
  const attemptVariance = computeAttemptVariance(readinessAttempts);
  const attemptIds = readinessAttempts.map((entry) => entry.attempt_id);
  const evidenceRefIds = collectMetricEvidenceRefIds({
    readinessEvents,
    guidedEvents,
    transferEvents,
    recurringGaps: input.memoryExport.recurring_gaps,
    boundaryHistory: input.memoryExport.boundary_history,
  });

  return {
    artifactScope: "ownership-memory",
    boundaryId: input.boundary.id,
    boundary_gap_density: boundaryGapDensity,
    readiness_debt: clamp01(1 - readinessSignal),
    calibration_gap: calibrationGap,
    attempt_variance: attemptVariance,
    lastComputedAt: toIso(now),
    source_inputs: {
      attemptIds,
      evidenceRefIds,
      transferAttemptIds: transferEvents.map((event) => event.payload.transfer.transferId),
    },
  };
}

export function buildCognitiveLoadMetric(input: BoundaryCognitiveInput): CognitiveLoadMetric {
  const now = resolveMetricTimestamp(input.memoryExport, input.now);
  const memoryEvents = input.memoryExport.events;
  const readinessEvents = memoryEvents.filter(
    (event): event is Extract<OwnershipMemoryEvent, { event_type: "readiness_attempt" }> =>
      event.event_type === "readiness_attempt" && event.boundary_id === input.boundary.id,
  );
  const transferEvents = memoryEvents.filter(
    (event): event is Extract<OwnershipMemoryEvent, { event_type: "transfer_attempt" }> =>
      event.event_type === "transfer_attempt" && event.boundary_id === input.boundary.id,
  );

  const readinessAttempts = readinessEvents.map((event) => event.payload.readiness);
  const transferAttempts = transferEvents.map((event) => event.payload.transfer);
  const relationCandidates = deriveCandidateRelationItems(input.boundary, input.reviewQueue, input.codeEvidence);
  const fanoutCount = relationCandidates.length > 0 ? relationCandidates.length : 1;
  const dependencyDepth = computeDependencyDepth(input.boundary, input.reviewQueue, transferAttempts, relationCandidates);
  const failedTransfers = transferAttempts.filter((attempt) => attempt.outcome === "transfer_fail").length;
  const readinessRetrys = Math.max(0, readinessAttempts.length - 1);
  const repairRetryCount = failedTransfers + readinessRetrys;
  const churnWeight = clamp01(
    0.5 * normalizeToRange(repairRetryCount, 0, 8)
    + 0.35 * normalizeToRange(attemptsVarianceBucket(readinessAttempts), 0, 100)
    + 0.15 * computeGapPenalty(input.memoryExport.recurring_gaps),
  );

  const attemptIds = readinessAttempts.map((entry) => entry.attempt_id);
  const evidenceRefIds = collectMetricEvidenceRefIds({
    readinessEvents,
    guidedEvents: [],
    transferEvents,
    recurringGaps: input.memoryExport.recurring_gaps,
    boundaryHistory: input.memoryExport.boundary_history,
  });

  return {
    boundaryId: input.boundary.id,
    boundary_fanout: fanoutCount,
    dependency_depth: dependencyDepth,
    repair_retry_count: repairRetryCount,
    churn_weight: churnWeight,
    lastComputedAt: toIso(now),
    source_inputs: {
      attemptIds,
      evidenceRefIds,
      transferAttemptIds: transferAttempts.map((entry) => entry.transferId),
    },
  };
}

export function buildDailyCognitiveReadout(input: BoundaryCognitiveInput): DailyCognitiveReadout {
  const debtMetric = buildCognitiveDebtMetric(input);
  const loadMetric = buildCognitiveLoadMetric(input);
  const now = resolveMetricTimestamp(input.memoryExport, input.now);
  const nowIso = toIso(now);
  const memoryEvents = input.memoryExport.events;
  const readinessAttempts = memoryEvents
    .filter(
      (event): event is Extract<OwnershipMemoryEvent, { event_type: "readiness_attempt" }> =>
        event.event_type === "readiness_attempt" && event.boundary_id === input.boundary.id,
    )
    .map((event) => event.payload.readiness);

  const transferEvents = memoryEvents
    .filter(
      (event): event is Extract<OwnershipMemoryEvent, { event_type: "transfer_attempt" }> =>
        event.event_type === "transfer_attempt" && event.boundary_id === input.boundary.id,
    )
    .map((event) => event.payload.transfer);

  const readyCount = readinessAttempts.filter((attempt) => attempt.readiness_gate === "ready").length;
  const outstandingGaps = collectOutstandingGaps({
    boundaryId: input.boundary.id,
    readinessAttempts,
    events: memoryEvents,
    recurringGaps: input.memoryExport.recurring_gaps,
  });
  const transferSummary = transferEvents.map((attempt) => ({
    boundaryId: input.boundary.id,
    attemptId: attempt.transferId,
    result: attempt.outcome === "transfer_pass"
      ? "pass"
      : attempt.outcome === "transfer_skip"
        ? "skipped"
        : "fail",
    reason: `${attempt.questionId}: ${attempt.attemptTextPreview}`,
  }));

  return {
    date: nowIso.split("T")[0] ?? nowIso,
    ready_count: readyCount,
    outstanding_gaps: outstandingGaps.slice(0, 6),
    transfer_summary: transferSummary.slice(-8),
    load_hotspots: [
      `boundary=${input.boundary.id}: fanout=${loadMetric.boundary_fanout}, depth=${loadMetric.dependency_depth}, retries=${loadMetric.repair_retry_count}`,
      `boundary=${input.boundary.id}: readiness_debt=${debtMetric.readiness_debt.toFixed(2)}, calibration_gap=${debtMetric.calibration_gap.toFixed(2)}`,
    ],
    top_3_follow_up_actions: buildFollowUpActions({
      debtMetric,
      loadMetric,
      outstandingGaps,
      transferSummary,
    }),
    cognitive_debt_metric: debtMetric,
    cognitive_load_metric: loadMetric,
  };
}

function deriveCandidateRelationItems(
  boundary: OwnershipBoundary,
  reviewQueue: ReviewQueueItem[] = [],
  codeEvidence: CodeEvidence[] = [],
): string[] {
  const candidates = new Set<string>();

  for (const filePath of boundary.files) {
    if (filePath !== boundary.filePath) {
      candidates.add(filePath);
    }
  }

  for (const item of reviewQueue) {
    if (item.filePath !== boundary.filePath) {
      candidates.add(item.filePath);
    }
  }

  for (const evidence of codeEvidence) {
    candidates.add(evidence.selectedFile);
    for (const candidate of evidence.relationCandidates) {
      if (candidate.path.includes("missing")) continue;
      candidates.add(candidate.path);
    }
    for (const gap of evidence.relationGaps) {
      candidates.add(`gap:${gap.id}`);
    }
  }

  return [...candidates];
}

function countRelationGapSignals(args: {
  boundaryId: string;
  readinessEvents: Array<Extract<OwnershipMemoryEvent, { event_type: "readiness_attempt" }>>;
  guidedEvents: Array<Extract<OwnershipMemoryEvent, { event_type: "guided_observation" }>>;
  recurringGaps: Array<{ gap_key: string }>;
}): number {
  const signals = new Set<string>();

  for (const event of args.guidedEvents) {
    if (event.boundary_id !== args.boundaryId) continue;
    if (event.payload.observation.reason === "could not connect caller/test") {
      signals.add(`guided:${event.payload.observation.id}`);
    }
  }

  for (const event of args.readinessEvents) {
    if (event.boundary_id !== args.boundaryId) continue;
    const gapReason = (event.payload.readiness.gapReason ?? "").toLowerCase();
    const isRelationRelevant =
      gapReason.includes("caller") || gapReason.includes("relation") || gapReason.includes("test") || gapReason.includes("gap");
    if (event.payload.readiness.readiness_gate !== "ready" && isRelationRelevant) {
      signals.add(`readiness:${event.event_id}`);
    }
  }

  for (const gap of args.recurringGaps) {
    if (gap.gap_key.startsWith("relation-gap:")) {
      signals.add(`recurring:${gap.gap_key}`);
    }
  }

  return signals.size;
}

function computeBoundaryGapDensity(confirmedCount: number, candidateRelationCount: number): number {
  const denominator = Math.max(1, candidateRelationCount);
  return clamp01(confirmedCount / denominator);
}

function computeAttemptVariance(attempts: OwnershipAttemptReadiness[]): number {
  if (attempts.length < 2) return 0;

  const confidence = attempts.map((entry) => clamp01(entry.self_confidence));
  const evidenceFit = attempts.map((entry) => clamp01(entry.evidence_fit));
  const elapsed = attempts.map((entry) => Math.min(1, entry.elapsedMs / 60_000));
  const confidenceVariance = populationStd(confidence);
  const evidenceVariance = populationStd(evidenceFit);
  const elapsedVariance = populationStd(elapsed);

  return clamp01(0.45 * confidenceVariance + 0.35 * evidenceVariance + 0.2 * elapsedVariance);
}

function attemptsVarianceBucket(attempts: OwnershipAttemptReadiness[]): number {
  return Math.round(computeAttemptVariance(attempts) * 100);
}

function computeDependencyDepth(
  boundary: OwnershipBoundary,
  reviewQueue: ReviewQueueItem[] = [],
  transferAttempts: TransferAttemptRecord[] = [],
  candidateRelationItems: string[] = [],
): number {
  let depth = 1;
  const nonBoundaryRelations = candidateRelationItems.filter((entry) => !entry.startsWith(`${boundary.filePath}:`));
  const hasTest = reviewQueue.some((item) => /\.test\./.test(item.filePath));
  const hasRuntime = reviewQueue.some((item) => /\/runtime\//.test(item.filePath));

  if (hasTest) depth += 1;
  if (hasRuntime) depth += 1;
  if (nonBoundaryRelations.length > 2) depth += 1;
  if (transferAttempts.some((attempt) => attempt.outcome === "transfer_fail")) depth += 1;
  if (transferAttempts.some((attempt) => attempt.outcome === "transfer_pass")) depth = Math.max(depth, 2);

  return clampToRange(Math.round(depth), 1, 6);
}

function computeGapPenalty(recurringGaps: Array<{ gap_key: string }>): number {
  return clamp01(
    recurringGaps.reduce((sum, gap) => {
      if (gap.gap_key.startsWith("readiness-gap:")) return sum + 0.08;
      if (gap.gap_key.startsWith("transfer-gap:")) return sum + 0.12;
      if (gap.gap_key.startsWith("relation-gap:")) return sum + 0.1;
      return sum + 0.02;
    }, 0),
  );
}

function buildFollowUpActions(args: {
  debtMetric: CognitiveDebtMetric;
  loadMetric: CognitiveLoadMetric;
  outstandingGaps: string[];
  transferSummary: DailyReadoutTransferSummary[];
}): string[] {
  const actions: string[] = [];

  if (args.outstandingGaps.length > 0) {
    actions.push(`Resolve the first unresolved gap first: ${args.outstandingGaps[0]}.`);
  }

  if (args.transferSummary.some((entry) => entry.result === "fail")) {
    actions.push("Retry transfer using one invariant and one guard phrase from the related boundary.");
  }

  if (args.debtMetric.readiness_debt > 0.3) {
    actions.push("Run one bounded follow-up readiness attempt with the same evidence set and reduced confidence.");
  }

  if (args.debtMetric.calibration_gap > 0.4) {
    actions.push("Anchor calibration by quoting explicit evidence refs on the next attempt text.");
  }

  if (args.loadMetric.repair_retry_count > 1) {
    actions.push(
      `Control repair pressure before advancing: ${args.loadMetric.repair_retry_count} retry cycles are recorded for this boundary.`,
    );
  }

  if (actions.length < 3 && args.loadMetric.churn_weight > 0.5) {
    actions.push("Use a deterministic local follow-up and avoid changing interpretation between retries.");
  }

  return actions.slice(0, 3);
}

function collectOutstandingGaps(args: {
  boundaryId: string;
  readinessAttempts: OwnershipAttemptReadiness[];
  events: OwnershipMemoryEvent[];
  recurringGaps: Array<{ gap_key: string }>;
}): string[] {
  const gaps = new Set<string>();

  for (const attempt of args.readinessAttempts) {
    if (attempt.readiness_gate === "ready") continue;
    gaps.add(`ready-${attempt.readiness_gate}:${attempt.gapReason ?? attempt.attempt_id}`);
  }

  for (const event of args.events) {
    if (event.boundary_id !== args.boundaryId) continue;
    if (event.event_type === "guided_observation") {
      gaps.add(`guided:${event.payload.observation.id}`);
    }
    if (event.event_type === "transfer_attempt" && event.payload.transfer.outcome !== "transfer_pass") {
      gaps.add(`${event.payload.transfer.outcome}:${event.payload.transfer.transferId}`);
    }
  }

  for (const gap of args.recurringGaps) {
    if (gap.gap_key.startsWith("relation-gap:") || gap.gap_key.startsWith("readiness-gap")) {
      gaps.add(`recurring:${gap.gap_key}`);
    }
  }

  return [...gaps];
}

function collectMetricEvidenceRefIds(args: {
  readinessEvents: Array<Extract<OwnershipMemoryEvent, { event_type: "readiness_attempt" }>>;
  guidedEvents: Array<Extract<OwnershipMemoryEvent, { event_type: "guided_observation" }>>;
  transferEvents: Array<Extract<OwnershipMemoryEvent, { event_type: "transfer_attempt" }>>;
  recurringGaps: Array<{ evidence_refs: { id: string }[] }>;
  boundaryHistory: Array<{ evidence_refs: { id: string }[] }>;
}): string[] {
  return unique([
    ...args.readinessEvents.flatMap((event) => [
      ...event.evidence_refs.map((entry) => entry.id),
      ...event.payload.readiness.attemptEvidenceRefs.map((entry) => entry.id),
    ]),
    ...args.guidedEvents.flatMap((event) => event.evidence_refs.map((entry) => entry.id)),
    ...args.transferEvents.flatMap((event) => event.evidence_refs.map((entry) => entry.id)),
    ...args.recurringGaps.flatMap((gap) => gap.evidence_refs.map((entry) => entry.id)),
    ...args.boundaryHistory.flatMap((entry) => entry.evidence_refs.map((entry) => entry.id)),
  ]);
}

function resolveMetricTimestamp(
  memoryExport: OwnershipMemoryExportBundle,
  now?: () => number,
): number {
  if (now != null) return now();

  let latest = Number.NEGATIVE_INFINITY;
  for (const event of memoryExport.events) {
    const occurred = Date.parse(event.occurred_at);
    if (Number.isFinite(occurred)) {
      latest = Math.max(latest, occurred);
    }
  }

  if (Number.isFinite(latest)) {
    return latest;
  }

  const exportedAt = Date.parse(memoryExport.exported_at);
  if (Number.isFinite(exportedAt)) {
    return exportedAt;
  }

  const boundaryLatest = memoryExport.boundary_history.reduce((current, entry) => {
    const occurred = Date.parse(entry.occurred_at);
    if (!Number.isFinite(occurred)) return current;
    return Math.max(current, occurred);
  }, Number.NEGATIVE_INFINITY);
  if (Number.isFinite(boundaryLatest)) return boundaryLatest;

  return 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + clamp01(value), 0);
  return total / values.length;
}

function populationStd(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
