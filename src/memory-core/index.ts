/**
 * Shared memory core boundary types and append-only helpers.
 */

export const MEMORY_CORE_VERSION = "0.1.0";
export const MEMORY_CORE_STORE_VERSION = `memory-core@${MEMORY_CORE_VERSION}`;

export type MemoryStoreVersion = typeof MEMORY_CORE_STORE_VERSION;

export type MemorySubjectKind =
  | "concept"
  | "source_slice"
  | "session"
  | "diff"
  | "pr"
  | "repo_area"
  | "operation"
  | "artifact";

export type MemorySubject = {
  id: string;
  kind: MemorySubjectKind;
  label: string;
  created_at: string;
};

export type MemoryEvidenceRef = {
  id: string;
  subject_id: string;
  evidence_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
  created_at: string;
};

export type MemoryAttempt = {
  id: string;
  subject_id: string;
  operation_id: string;
  artifact_id: string;
  answer_text: string;
  confidence: "low" | "medium" | "high";
  created_at: string;
};

export type MemoryOutcome = {
  id: string;
  attempt_id: string;
  subject_id: string;
  result: "confirmed" | "gap" | "partial" | "contradiction" | "insufficient_evidence";
  evidence_id: string;
  created_at: string;
};

export type MemoryGap = {
  id: string;
  subject_id: string;
  attempt_id: string;
  kind: string;
  severity: "critical" | "important" | "later";
  blocks_readiness: boolean;
  evidence_id: string;
  created_at: string;
};

export type MemoryRepair = {
  id: string;
  subject_id: string;
  gap_id: string;
  operation_kind: "explain" | "trace" | "derive" | "predict" | "build" | "modify" | "debug" | "transfer" | "teach";
  prompt: string;
  required_evidence: string[];
  created_at: string;
};

export type MemoryReview = {
  id: string;
  subject_id: string;
  kind: "session" | "transfer" | "confirmation" | "gap_repair";
  reason: string;
  created_at: string;
};

export type MemoryTransfer = {
  id: string;
  subject_id: string;
  from_subject_id: string;
  to_subject_id: string;
  due_at: string;
  created_at: string;
};

export type MemoryArtifact = {
  id: string;
  subject_id: string;
  path: string;
  kind: "code" | "paper" | "experiment" | "notebook";
  checksum: string;
  created_at: string;
};

export type MemoryEvent = {
  id: string;
  subject_id: string;
  event_type: "attempt" | "gap" | "repair" | "review" | "transfer" | "artifact" | "custom";
  message: string;
  metadata: Record<string, string | number | boolean>;
  occurred_at: string;
};

export type MisconceptionRecord = {
  id: string;
  subject_id: string;
  label: string;
  severity: "active" | "resolved" | "dormant" | "monitored";
  occurrences: number;
  created_at: string;
  updated_at: string;
};

export type MemoryStore = {
  store_version: MemoryStoreVersion;
  subjects: readonly MemorySubject[];
  evidence_refs: readonly MemoryEvidenceRef[];
  attempts: readonly MemoryAttempt[];
  outcomes: readonly MemoryOutcome[];
  gaps: readonly MemoryGap[];
  repairs: readonly MemoryRepair[];
  misconceptions: readonly MisconceptionRecord[];
  reviews: readonly MemoryReview[];
  transfers: readonly MemoryTransfer[];
  artifacts: readonly MemoryArtifact[];
  events: readonly MemoryEvent[];
};

function append<T>(list: readonly T[], item: T): readonly T[] {
  return [...list, item];
}

export function createMemoryStore(overrides: Partial<MemoryStore> = {}): MemoryStore {
  return {
    store_version: MEMORY_CORE_STORE_VERSION,
    subjects: [],
    evidence_refs: [],
    attempts: [],
    outcomes: [],
    gaps: [],
    repairs: [],
    misconceptions: [],
    reviews: [],
    transfers: [],
    artifacts: [],
    events: [],
    ...overrides,
  };
}

export function appendMemorySubject(store: MemoryStore, subject: MemorySubject): MemoryStore {
  return {
    ...store,
    subjects: append(store.subjects, subject),
  };
}

export function appendMemoryEvidenceRef(
  store: MemoryStore,
  evidenceRef: MemoryEvidenceRef,
): MemoryStore {
  return {
    ...store,
    evidence_refs: append(store.evidence_refs, evidenceRef),
  };
}

export function appendMemoryAttempt(store: MemoryStore, attempt: MemoryAttempt): MemoryStore {
  return {
    ...store,
    attempts: append(store.attempts, attempt),
  };
}

export function appendMemoryOutcome(store: MemoryStore, outcome: MemoryOutcome): MemoryStore {
  return {
    ...store,
    outcomes: append(store.outcomes, outcome),
  };
}

export function appendMemoryGap(store: MemoryStore, gap: MemoryGap): MemoryStore {
  return {
    ...store,
    gaps: append(store.gaps, gap),
  };
}

export function appendMemoryRepair(store: MemoryStore, repair: MemoryRepair): MemoryStore {
  return {
    ...store,
    repairs: append(store.repairs, repair),
  };
}

export function appendMemoryMisconception(
  store: MemoryStore,
  misconception: MisconceptionRecord,
): MemoryStore {
  return {
    ...store,
    misconceptions: append(store.misconceptions, misconception),
  };
}

export function appendMemoryReview(store: MemoryStore, review: MemoryReview): MemoryStore {
  return {
    ...store,
    reviews: append(store.reviews, review),
  };
}

export function appendMemoryTransfer(store: MemoryStore, transfer: MemoryTransfer): MemoryStore {
  return {
    ...store,
    transfers: append(store.transfers, transfer),
  };
}

export function appendMemoryArtifact(store: MemoryStore, artifact: MemoryArtifact): MemoryStore {
  return {
    ...store,
    artifacts: append(store.artifacts, artifact),
  };
}

export function appendMemoryEvent(store: MemoryStore, event: MemoryEvent): MemoryStore {
  return {
    ...store,
    events: append(store.events, event),
  };
}
