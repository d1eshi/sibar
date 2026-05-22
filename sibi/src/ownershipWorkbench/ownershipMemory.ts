import type {
  BoundaryState,
  EvidenceRef,
  OwnershipAttemptReadiness,
  OwnershipBoundary,
  OwnershipReviewArtifact,
  OwnershipSessionObservation,
} from "./types";
import type { TransferAttemptRecord } from "./transferVerification";

export type OwnershipMemoryEventType =
  | "guided_observation"
  | "readiness_attempt"
  | "transfer_attempt"
  | "handoff_artifact";

export type OwnershipMemoryEvent = {
  event_id: string;
  event_type: OwnershipMemoryEventType;
  boundary_id: string;
  boundary_file: string;
  occurred_at: string;
  evidence_refs: EvidenceRef[];
  payload:
    | { observation: OwnershipSessionObservation }
    | { readiness: OwnershipAttemptReadiness; boundary_state: BoundaryState }
    | { transfer: TransferAttemptRecord }
    | { artifact: OwnershipReviewArtifact };
};

export type OwnershipMemoryState = {
  schema: "ownership-memory.v1";
  events: OwnershipMemoryEvent[];
};

export type BoundaryStateHistoryRecord = {
  record_id: string;
  boundary_id: string;
  boundary_file: string;
  state: BoundaryState;
  source_event_id: string;
  occurred_at: string;
  summary: string;
  evidence_refs: EvidenceRef[];
};

export type RecurringGapRecord = {
  gap_id: string;
  gap_key: string;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  source_event_ids: string[];
  evidence_refs: EvidenceRef[];
};

export type OwnershipRevisitLabel =
  | "revisit-transfer"
  | "revisit-calibration"
  | "revisit-relation-gap"
  | "stable";

export type OwnershipMemoryProjection = {
  event_count: number;
  boundary_history: BoundaryStateHistoryRecord[];
  recurring_gaps: RecurringGapRecord[];
  revisit_labels: OwnershipRevisitLabel[];
};

export type OwnershipMemoryCompactionMode = "manual" | "daily";

export type OwnershipMemoryExportBundle = OwnershipMemoryProjection & {
  export_id: string;
  exported_at: string;
  compaction: {
    mode: OwnershipMemoryCompactionMode;
    compacted_event_count: number;
    retained_event_count: number;
    daily_cutoff_at?: string;
  };
  events: OwnershipMemoryEvent[];
};

type AppendBaseInput = {
  memory: OwnershipMemoryState;
  boundary: OwnershipBoundary;
  occurredAt?: number;
  now?: () => number;
};

type AppendObservationInput = AppendBaseInput & {
  observation: OwnershipSessionObservation;
};

type AppendReadinessInput = AppendBaseInput & {
  readiness: OwnershipAttemptReadiness;
  effectiveBoundaryState?: BoundaryState;
};

type AppendTransferInput = AppendBaseInput & {
  transfer: TransferAttemptRecord;
};

type AppendHandoffInput = AppendBaseInput & {
  artifact: OwnershipReviewArtifact;
};

type ExportInput = {
  memory: OwnershipMemoryState;
  mode: OwnershipMemoryCompactionMode;
  boundaryId?: string;
  exportedAt?: number;
  now?: () => number;
};

type ProjectionInput = {
  boundaryId?: string;
};

export function createOwnershipMemoryState(): OwnershipMemoryState {
  return {
    schema: "ownership-memory.v1",
    events: [],
  };
}

export function appendGuidedObservation(input: AppendObservationInput): OwnershipMemoryState {
  const occurredAt = resolveOccurredAt(input);
  return appendMemoryEvent(input.memory, {
    event_id: `memory-${input.boundary.id}-observation-${input.observation.id}`,
    event_type: "guided_observation",
    boundary_id: input.boundary.id,
    boundary_file: input.boundary.filePath,
    occurred_at: toIso(occurredAt),
    evidence_refs: evidenceForObservation(input.observation),
    payload: { observation: input.observation },
  });
}

export function appendReadinessAttempt(input: AppendReadinessInput): OwnershipMemoryState {
  return appendMemoryEvent(input.memory, {
    event_id: `memory-${input.boundary.id}-readiness-${input.readiness.attempt_id}`,
    event_type: "readiness_attempt",
    boundary_id: input.boundary.id,
    boundary_file: input.boundary.filePath,
    occurred_at: toIso(input.readiness.submittedAt),
    evidence_refs: evidenceForReadiness(input.boundary, input.readiness),
    payload: {
      readiness: input.readiness,
      boundary_state: input.effectiveBoundaryState ?? input.readiness.state,
    },
  });
}

export function appendTransferAttempt(input: AppendTransferInput): OwnershipMemoryState {
  return appendMemoryEvent(input.memory, {
    event_id: `memory-${input.boundary.id}-transfer-${input.transfer.transferId}`,
    event_type: "transfer_attempt",
    boundary_id: input.boundary.id,
    boundary_file: input.boundary.filePath,
    occurred_at: toIso(input.transfer.submittedAt),
    evidence_refs: evidenceForTransfer(input.transfer),
    payload: { transfer: input.transfer },
  });
}

export function appendHandoffArtifact(input: AppendHandoffInput): OwnershipMemoryState {
  return appendMemoryEvent(input.memory, {
    event_id: `memory-${input.boundary.id}-handoff-${input.artifact.artifact_id}`,
    event_type: "handoff_artifact",
    boundary_id: input.boundary.id,
    boundary_file: input.boundary.filePath,
    occurred_at: input.artifact.created_at,
    evidence_refs: ensureEvidenceRefs(input.artifact.evidence_refs, [fallbackBoundaryEvidence(input.boundary)]),
    payload: { artifact: input.artifact },
  });
}

export function buildOwnershipMemoryProjection(
  memory: OwnershipMemoryState,
  input: ProjectionInput = {},
): OwnershipMemoryProjection {
  const orderedEvents = sortEvents(filterEventsForBoundary(memory.events, input.boundaryId));
  const boundaryHistory = orderedEvents.map(projectBoundaryState).filter((record): record is BoundaryStateHistoryRecord => record != null);
  const recurringGaps = projectRecurringGaps(orderedEvents);

  return {
    event_count: orderedEvents.length,
    boundary_history: boundaryHistory,
    recurring_gaps: recurringGaps,
    revisit_labels: deriveRevisitLabels(orderedEvents, recurringGaps, boundaryHistory),
  };
}

export function buildOwnershipMemoryExportBundle(input: ExportInput): OwnershipMemoryExportBundle {
  const now = input.now ?? (() => Date.now());
  const exportedAt = input.exportedAt ?? now();
  const exportedAtIso = toIso(exportedAt);
  const orderedEvents = sortEvents(filterEventsForBoundary(input.memory.events, input.boundaryId));
  const projection = buildOwnershipMemoryProjection(input.memory, { boundaryId: input.boundaryId });
  const dailyCutoff = startOfUtcDay(exportedAt);
  const compactedEventCount =
    input.mode === "daily"
      ? orderedEvents.filter((event) => Date.parse(event.occurred_at) < dailyCutoff).length
      : orderedEvents.length;
  const retainedEventCount = input.mode === "daily" ? orderedEvents.length - compactedEventCount : orderedEvents.length;

  return {
    export_id: `ownership-memory-export-${input.mode}-${exportedAt}`,
    exported_at: exportedAtIso,
    compaction: {
      mode: input.mode,
      compacted_event_count: compactedEventCount,
      retained_event_count: retainedEventCount,
      ...(input.mode === "daily" ? { daily_cutoff_at: toIso(dailyCutoff) } : {}),
    },
    events: orderedEvents,
    ...projection,
  };
}

function appendMemoryEvent(memory: OwnershipMemoryState, event: OwnershipMemoryEvent): OwnershipMemoryState {
  return {
    schema: memory.schema,
    events: [...memory.events, event],
  };
}

function resolveOccurredAt(input: AppendBaseInput): number {
  if (input.occurredAt != null) return input.occurredAt;
  const now = input.now ?? (() => Date.now());
  return now();
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function sortEvents(events: OwnershipMemoryEvent[]): OwnershipMemoryEvent[] {
  return [...events].sort((left, right) => {
    const timeDiff = Date.parse(left.occurred_at) - Date.parse(right.occurred_at);
    return timeDiff === 0 ? left.event_id.localeCompare(right.event_id) : timeDiff;
  });
}

function filterEventsForBoundary(events: OwnershipMemoryEvent[], boundaryId?: string): OwnershipMemoryEvent[] {
  if (boundaryId == null) {
    return events;
  }
  return events.filter((event) => event.boundary_id === boundaryId);
}

function dedupeEvidenceRefs(entries: EvidenceRef[]): EvidenceRef[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function ensureEvidenceRefs(primary: EvidenceRef[], fallback: EvidenceRef[]): EvidenceRef[] {
  const evidenceRefs = dedupeEvidenceRefs(primary);
  return evidenceRefs.length > 0 ? evidenceRefs : dedupeEvidenceRefs(fallback);
}

function fallbackBoundaryEvidence(boundary: OwnershipBoundary): EvidenceRef {
  return {
    id: `memory-anchor-${boundary.id}`,
    title: "Boundary memory anchor",
    detail: boundary.title,
    location: `${boundary.filePath}:${boundary.startLine}-${boundary.endLine}`,
    confidence: boundary.confidence,
  };
}

function evidenceForObservation(observation: OwnershipSessionObservation): EvidenceRef[] {
  return [
    {
      id: `memory-${observation.id}`,
      title: "Guided observation",
      detail: observation.note,
      location: observation.filePath,
      confidence: "unverified",
    },
  ];
}

function evidenceForReadiness(boundary: OwnershipBoundary, readiness: OwnershipAttemptReadiness): EvidenceRef[] {
  return ensureEvidenceRefs(
    [
      ...readiness.attemptEvidenceRefs,
      ...readiness.gapDiagnoses.flatMap((gap) => gap.evidenceRefs),
    ],
    [fallbackBoundaryEvidence(boundary)],
  );
}

function evidenceForTransfer(transfer: TransferAttemptRecord): EvidenceRef[] {
  return [
    {
      id: transfer.transferId,
      title: `Transfer ${transfer.outcome}`,
      detail: `${transfer.questionId}: ${transfer.attemptTextPreview}`,
      location: transfer.probeId,
      confidence: transfer.outcome === "transfer_pass" ? "observed" : "unverified",
    },
  ];
}

function projectBoundaryState(event: OwnershipMemoryEvent): BoundaryStateHistoryRecord | null {
  if (event.event_type === "guided_observation" && "observation" in event.payload) {
    return makeBoundaryHistoryRecord(event, "gap", event.payload.observation.note);
  }

  if (event.event_type === "readiness_attempt" && "readiness" in event.payload) {
    return makeBoundaryHistoryRecord(event, event.payload.boundary_state, event.payload.readiness.summary);
  }

  if (event.event_type === "transfer_attempt" && "transfer" in event.payload) {
    const transfer = event.payload.transfer;
    const state: BoundaryState = transfer.outcome === "transfer_pass" ? "owned" : "partial";
    return makeBoundaryHistoryRecord(event, state, `${transfer.outcome}: ${transfer.attemptTextPreview}`);
  }

  if (event.event_type === "handoff_artifact" && "artifact" in event.payload) {
    return makeBoundaryHistoryRecord(event, "blocked", event.payload.artifact.review);
  }

  return null;
}

function makeBoundaryHistoryRecord(
  event: OwnershipMemoryEvent,
  state: BoundaryState,
  summary: string,
): BoundaryStateHistoryRecord {
  return {
    record_id: `boundary-state-${event.event_id}`,
    boundary_id: event.boundary_id,
    boundary_file: event.boundary_file,
    state,
    source_event_id: event.event_id,
    occurred_at: event.occurred_at,
    summary,
    evidence_refs: ensureEvidenceRefs(event.evidence_refs, [
      {
        id: `memory-event-${event.event_id}`,
        title: "Ownership memory event",
        detail: event.event_type,
        location: event.boundary_file,
        confidence: "unverified",
      },
    ]),
  };
}

function projectRecurringGaps(events: OwnershipMemoryEvent[]): RecurringGapRecord[] {
  const recordsByKey = new Map<string, RecurringGapRecord>();
  for (const event of events) {
    const gapKey = gapKeyForEvent(event);
    if (gapKey == null) continue;

    const existing = recordsByKey.get(gapKey);
    if (existing == null) {
      recordsByKey.set(gapKey, {
        gap_id: `recurring-${gapKey}`,
        gap_key: gapKey,
        count: 1,
        first_seen_at: event.occurred_at,
        last_seen_at: event.occurred_at,
        source_event_ids: [event.event_id],
        evidence_refs: ensureEvidenceRefs(event.evidence_refs, []),
      });
      continue;
    }

    recordsByKey.set(gapKey, {
      ...existing,
      count: existing.count + 1,
      last_seen_at: event.occurred_at,
      source_event_ids: [...existing.source_event_ids, event.event_id],
      evidence_refs: dedupeEvidenceRefs(existing.evidence_refs.concat(event.evidence_refs)),
    });
  }

  return [...recordsByKey.values()]
    .filter((record) => record.count >= 2)
    .sort((left, right) => left.gap_key.localeCompare(right.gap_key));
}

function gapKeyForEvent(event: OwnershipMemoryEvent): string | null {
  if (event.event_type === "guided_observation" && "observation" in event.payload) {
    const reason = event.payload.observation.reason;
    return reason === "could not connect caller/test" ? "relation-gap:caller-test" : `guided-gap:${reason}`;
  }

  if (event.event_type === "readiness_attempt" && "readiness" in event.payload) {
    const readiness = event.payload.readiness;
    if (readiness.readiness_gate === "ready") return null;
    if (readiness.calibration_score < 0.55) return "readiness-gap:low-calibration";
    return `readiness-gap:${readiness.gapReason ?? readiness.readiness_gate}`;
  }

  if (event.event_type === "transfer_attempt" && "transfer" in event.payload) {
    const outcome = event.payload.transfer.outcome;
    return outcome === "transfer_pass" ? null : `transfer-gap:${outcome}`;
  }

  return null;
}

function deriveRevisitLabels(
  events: OwnershipMemoryEvent[],
  recurringGaps: RecurringGapRecord[],
  boundaryHistory: BoundaryStateHistoryRecord[],
): OwnershipRevisitLabel[] {
  const labels: OwnershipRevisitLabel[] = [];
  const latestTransfer = [...events]
    .reverse()
    .find((event) => event.event_type === "transfer_attempt" && "transfer" in event.payload);

  if (
    recurringGaps.some((gap) => gap.gap_key.startsWith("transfer-gap:")) ||
    (latestTransfer != null &&
      "transfer" in latestTransfer.payload &&
      latestTransfer.payload.transfer.outcome !== "transfer_pass")
  ) {
    labels.push("revisit-transfer");
  }

  if (recurringGaps.some((gap) => gap.gap_key === "readiness-gap:low-calibration")) {
    labels.push("revisit-calibration");
  }

  if (recurringGaps.some((gap) => gap.gap_key === "relation-gap:caller-test")) {
    labels.push("revisit-relation-gap");
  }

  const latestState = boundaryHistory.at(-1)?.state ?? "unvisited";
  if (labels.length === 0 && (latestState === "owned" || latestState === "partial")) {
    labels.push("stable");
  }

  return labels.length > 0 ? labels : ["stable"];
}
