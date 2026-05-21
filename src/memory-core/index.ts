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

export type MemoryStoreProblemCode =
  | "attempt_missing_subject"
  | "outcome_missing_subject"
  | "outcome_missing_attempt"
  | "gap_missing_subject"
  | "gap_missing_attempt"
  | "repair_missing_subject"
  | "repair_missing_gap"
  | "review_missing_subject"
  | "transfer_missing_subject"
  | "transfer_missing_from_subject"
  | "transfer_missing_to_subject"
  | "misconception_missing_subject"
  | "artifact_missing_subject"
  | "event_missing_subject"
  | "evidence_ref_missing_subject";

export type MemoryStoreMissingRefKind = "subject" | "attempt" | "gap";

export type MemoryStoreProblem = {
  code: MemoryStoreProblemCode;
  entity: string;
  entity_id: string;
  missing_ref: {
    kind: MemoryStoreMissingRefKind;
    id: string;
    field: string;
  };
};

export type MemoryStoreValidationResult = {
  ok: boolean;
  problems: readonly MemoryStoreProblem[];
};

export function getMemoryStoreProblems(store: MemoryStore): MemoryStoreProblem[] {
  const problems: MemoryStoreProblem[] = [];
  const subjectIDs = new Set(store.subjects.map((subject) => subject.id));
  const attemptIDs = new Set(store.attempts.map((attempt) => attempt.id));
  const gapIDs = new Set(store.gaps.map((gap) => gap.id));

  for (const attempt of store.attempts) {
    if (!subjectIDs.has(attempt.subject_id)) {
      problems.push({
        code: "attempt_missing_subject",
        entity: "attempt",
        entity_id: attempt.id,
        missing_ref: {
          kind: "subject",
          id: attempt.subject_id,
          field: "subject_id",
        },
      });
    }
  }

  for (const outcome of store.outcomes) {
    if (!subjectIDs.has(outcome.subject_id)) {
      problems.push({
        code: "outcome_missing_subject",
        entity: "outcome",
        entity_id: outcome.id,
        missing_ref: {
          kind: "subject",
          id: outcome.subject_id,
          field: "subject_id",
        },
      });
    }
    if (!attemptIDs.has(outcome.attempt_id)) {
      problems.push({
        code: "outcome_missing_attempt",
        entity: "outcome",
        entity_id: outcome.id,
        missing_ref: {
          kind: "attempt",
          id: outcome.attempt_id,
          field: "attempt_id",
        },
      });
    }
  }

  for (const gap of store.gaps) {
    if (!subjectIDs.has(gap.subject_id)) {
      problems.push({
        code: "gap_missing_subject",
        entity: "gap",
        entity_id: gap.id,
        missing_ref: {
          kind: "subject",
          id: gap.subject_id,
          field: "subject_id",
        },
      });
    }
    if (!attemptIDs.has(gap.attempt_id)) {
      problems.push({
        code: "gap_missing_attempt",
        entity: "gap",
        entity_id: gap.id,
        missing_ref: {
          kind: "attempt",
          id: gap.attempt_id,
          field: "attempt_id",
        },
      });
    }
  }

  for (const repair of store.repairs) {
    if (!subjectIDs.has(repair.subject_id)) {
      problems.push({
        code: "repair_missing_subject",
        entity: "repair",
        entity_id: repair.id,
        missing_ref: {
          kind: "subject",
          id: repair.subject_id,
          field: "subject_id",
        },
      });
    }
    if (!gapIDs.has(repair.gap_id)) {
      problems.push({
        code: "repair_missing_gap",
        entity: "repair",
        entity_id: repair.id,
        missing_ref: {
          kind: "gap",
          id: repair.gap_id,
          field: "gap_id",
        },
      });
    }
  }

  for (const misconception of store.misconceptions) {
    if (!subjectIDs.has(misconception.subject_id)) {
      problems.push({
        code: "misconception_missing_subject",
        entity: "misconception",
        entity_id: misconception.id,
        missing_ref: {
          kind: "subject",
          id: misconception.subject_id,
          field: "subject_id",
        },
      });
    }
  }

  for (const review of store.reviews) {
    if (!subjectIDs.has(review.subject_id)) {
      problems.push({
        code: "review_missing_subject",
        entity: "review",
        entity_id: review.id,
        missing_ref: {
          kind: "subject",
          id: review.subject_id,
          field: "subject_id",
        },
      });
    }
  }

  for (const transfer of store.transfers) {
    if (!subjectIDs.has(transfer.subject_id)) {
      problems.push({
        code: "transfer_missing_subject",
        entity: "transfer",
        entity_id: transfer.id,
        missing_ref: {
          kind: "subject",
          id: transfer.subject_id,
          field: "subject_id",
        },
      });
    }
    if (!subjectIDs.has(transfer.from_subject_id)) {
      problems.push({
        code: "transfer_missing_from_subject",
        entity: "transfer",
        entity_id: transfer.id,
        missing_ref: {
          kind: "subject",
          id: transfer.from_subject_id,
          field: "from_subject_id",
        },
      });
    }
    if (!subjectIDs.has(transfer.to_subject_id)) {
      problems.push({
        code: "transfer_missing_to_subject",
        entity: "transfer",
        entity_id: transfer.id,
        missing_ref: {
          kind: "subject",
          id: transfer.to_subject_id,
          field: "to_subject_id",
        },
      });
    }
  }

  for (const artifact of store.artifacts) {
    if (!subjectIDs.has(artifact.subject_id)) {
      problems.push({
        code: "artifact_missing_subject",
        entity: "artifact",
        entity_id: artifact.id,
        missing_ref: {
          kind: "subject",
          id: artifact.subject_id,
          field: "subject_id",
        },
      });
    }
  }

  for (const event of store.events) {
    if (!subjectIDs.has(event.subject_id)) {
      problems.push({
        code: "event_missing_subject",
        entity: "event",
        entity_id: event.id,
        missing_ref: {
          kind: "subject",
          id: event.subject_id,
          field: "subject_id",
        },
      });
    }
  }

  for (const evidenceRef of store.evidence_refs) {
    if (!subjectIDs.has(evidenceRef.subject_id)) {
      problems.push({
        code: "evidence_ref_missing_subject",
        entity: "evidence_ref",
        entity_id: evidenceRef.id,
        missing_ref: {
          kind: "subject",
          id: evidenceRef.subject_id,
          field: "subject_id",
        },
      });
    }
  }

  return problems;
}

export function validateMemoryStore(store: MemoryStore): MemoryStoreValidationResult {
  const problems = getMemoryStoreProblems(store);
  return { ok: problems.length === 0, problems };
}

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
