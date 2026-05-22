import assert from "node:assert/strict";
import test from "node:test";

import * as memoryCore from "../engine/memory-core/index.ts";

const SUBJECT_ID = "subject-1";
const SECOND_SUBJECT_ID = "subject-2";
const ATTEMPT_ID = "attempt-1";
const GAP_ID = "gap-1";

function missingReferenceForCode(
  problems: readonly memoryCore.MemoryStoreProblem[],
  code: memoryCore.MemoryStoreProblemCode,
): memoryCore.MemoryStoreProblem {
  const missing = problems.find((problem) => problem.code === code);
  if (!missing) {
    throw new Error(`expected problem ${code}`);
  }
  return missing;
}

function validBaseStore(): memoryCore.MemoryStore {
  return {
    store_version: memoryCore.MEMORY_CORE_STORE_VERSION,
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
      {
        id: SECOND_SUBJECT_ID,
        kind: "concept",
        label: "Transfer target",
        created_at: "2026-05-21T00:00:01.000Z",
      },
    ],
    evidence_refs: [
      {
        id: "evidence-1",
        subject_id: SUBJECT_ID,
        evidence_id: "e1",
        file_path: "src/file.ts",
        start_line: 1,
        end_line: 2,
        excerpt: "line snippet",
        created_at: "2026-05-21T00:00:02.000Z",
      },
    ],
    attempts: [
      {
        id: ATTEMPT_ID,
        subject_id: SUBJECT_ID,
        operation_id: "operation-1",
        artifact_id: "artifact-1",
        answer_text: "answer",
        confidence: "high",
        created_at: "2026-05-21T00:00:03.000Z",
      },
    ],
    outcomes: [
      {
        id: "outcome-1",
        attempt_id: ATTEMPT_ID,
        subject_id: SUBJECT_ID,
        result: "confirmed",
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:04.000Z",
      },
    ],
    gaps: [
      {
        id: GAP_ID,
        subject_id: SUBJECT_ID,
        attempt_id: ATTEMPT_ID,
        kind: "knowledge",
        severity: "important",
        blocks_readiness: false,
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:05.000Z",
      },
    ],
    repairs: [
      {
        id: "repair-1",
        subject_id: SUBJECT_ID,
        gap_id: GAP_ID,
        operation_kind: "trace",
        prompt: "repair this gap",
        required_evidence: ["e1"],
        created_at: "2026-05-21T00:00:06.000Z",
      },
    ],
    misconceptions: [],
    reviews: [
      {
        id: "review-1",
        subject_id: SUBJECT_ID,
        kind: "confirmation",
        reason: "initial review",
        created_at: "2026-05-21T00:00:07.000Z",
      },
    ],
    transfers: [
      {
        id: "transfer-1",
        subject_id: SUBJECT_ID,
        from_subject_id: SUBJECT_ID,
        to_subject_id: SECOND_SUBJECT_ID,
        due_at: "2026-05-28T00:00:00.000Z",
        created_at: "2026-05-21T00:00:08.000Z",
      },
    ],
    artifacts: [
      {
        id: "artifact-1",
        subject_id: SUBJECT_ID,
        path: "src/file.ts",
        kind: "code",
        checksum: "abc123",
        created_at: "2026-05-21T00:00:09.000Z",
      },
    ],
    events: [
      {
        id: "event-1",
        subject_id: SUBJECT_ID,
        event_type: "attempt",
        message: "attempt recorded",
        metadata: { source: "test" },
        occurred_at: "2026-05-21T00:00:10.000Z",
      },
    ],
  };
}

test("validateMemoryStore reports a clean store on happy path", () => {
  const store = validBaseStore();
  assert.equal(memoryCore.validateMemoryStore(store).ok, true);
  assert.equal(memoryCore.getMemoryStoreProblems(store).length, 0);
});

test("getMemoryStoreProblems reports missing subject references", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [],
    attempts: [
      {
        id: ATTEMPT_ID,
        subject_id: SUBJECT_ID,
        operation_id: "operation-1",
        artifact_id: "artifact-1",
        answer_text: "answer",
        confidence: "medium",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingAttemptSubject = missingReferenceForCode(
    problems,
    "attempt_missing_subject",
  );

  assert.equal(store.subjects.length, 0);
  assert.equal(problems.length, 1);
  assert.equal(missingAttemptSubject?.entity, "attempt");
  assert.equal(missingAttemptSubject?.missing_ref.kind, "subject");
  assert.equal(missingAttemptSubject?.missing_ref.field, "subject_id");
  assert.equal(missingAttemptSubject?.missing_ref.id, SUBJECT_ID);
});

test("getMemoryStoreProblems reports missing attempt references for outcomes", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    outcomes: [
      {
        id: "outcome-1",
        attempt_id: "missing-attempt",
        subject_id: SUBJECT_ID,
        result: "gap",
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingOutcomeAttempt = missingReferenceForCode(problems, "outcome_missing_attempt");
  assert.equal(missingOutcomeAttempt?.missing_ref.kind, "attempt");
  assert.equal(missingOutcomeAttempt?.missing_ref.field, "attempt_id");
  assert.equal(missingOutcomeAttempt?.missing_ref.id, "missing-attempt");
  assert.equal(problems.every((problem) => problem.entity !== "attempt"), true);
});

test("getMemoryStoreProblems reports missing gap references for repairs", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    repairs: [
      {
        id: "repair-1",
        subject_id: SUBJECT_ID,
        gap_id: "missing-gap",
        operation_kind: "trace",
        prompt: "repair",
        required_evidence: ["e1"],
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingRepairGap = missingReferenceForCode(problems, "repair_missing_gap");
  assert.equal(missingRepairGap?.missing_ref.kind, "gap");
  assert.equal(missingRepairGap?.missing_ref.field, "gap_id");
  assert.equal(missingRepairGap?.missing_ref.id, "missing-gap");
});

test("getMemoryStoreProblems reports missing subject references for misconceptions", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    misconceptions: [
      {
        id: "misconception-1",
        subject_id: "missing-subject",
        label: "Misconception",
        severity: "active",
        occurrences: 1,
        created_at: "2026-05-21T00:00:00.000Z",
        updated_at: "2026-05-21T00:00:01.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingMisconceptionSubject = problems.find(
    (problem) => problem.code === "misconception_missing_subject",
  );

  assert.equal(problems.length, 1);
  assert.equal(missingMisconceptionSubject?.entity, "misconception");
  assert.equal(missingMisconceptionSubject?.missing_ref.kind, "subject");
  assert.equal(missingMisconceptionSubject?.missing_ref.field, "subject_id");
  assert.equal(missingMisconceptionSubject?.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing transfer subject endpoints", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    transfers: [
      {
        id: "transfer-1",
        subject_id: SUBJECT_ID,
        from_subject_id: "missing-from",
        to_subject_id: "missing-to",
        due_at: "2026-05-28T00:00:00.000Z",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  assert.equal(problems.some((problem) => problem.code === "transfer_missing_from_subject"), true);
  assert.equal(problems.some((problem) => problem.code === "transfer_missing_to_subject"), true);
  assert.equal(
    missingReferenceForCode(problems, "transfer_missing_from_subject").missing_ref.id,
    "missing-from",
  );
  assert.equal(
    missingReferenceForCode(problems, "transfer_missing_to_subject").missing_ref.id,
    "missing-to",
  );
  assert.equal(
    missingReferenceForCode(problems, "transfer_missing_from_subject").missing_ref.field,
    "from_subject_id",
  );
  assert.equal(
    missingReferenceForCode(problems, "transfer_missing_to_subject").missing_ref.field,
    "to_subject_id",
  );
});

test("getMemoryStoreProblems reports missing subject references for outcomes", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Present attempt",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    attempts: [
      {
        id: ATTEMPT_ID,
        subject_id: SUBJECT_ID,
        operation_id: "operation-1",
        artifact_id: "artifact-1",
        answer_text: "answer",
        confidence: "medium",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    outcomes: [
      {
        id: "outcome-1",
        attempt_id: ATTEMPT_ID,
        subject_id: "missing-subject",
        result: "confirmed",
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingOutcomeSubject = missingReferenceForCode(problems, "outcome_missing_subject");
  assert.equal(problems.length, 1);
  assert.equal(missingOutcomeSubject.missing_ref.kind, "subject");
  assert.equal(missingOutcomeSubject.missing_ref.field, "subject_id");
  assert.equal(missingOutcomeSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing subject references for gaps", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Present subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    attempts: [
      {
        id: ATTEMPT_ID,
        subject_id: SUBJECT_ID,
        operation_id: "operation-1",
        artifact_id: "artifact-1",
        answer_text: "answer",
        confidence: "medium",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    gaps: [
      {
        id: GAP_ID,
        subject_id: "missing-subject",
        attempt_id: ATTEMPT_ID,
        kind: "knowledge",
        severity: "important",
        blocks_readiness: false,
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingGapSubject = missingReferenceForCode(problems, "gap_missing_subject");
  assert.equal(problems.length, 1);
  assert.equal(missingGapSubject.missing_ref.kind, "subject");
  assert.equal(missingGapSubject.missing_ref.field, "subject_id");
  assert.equal(missingGapSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing attempt references for gaps", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    gaps: [
      {
        id: GAP_ID,
        subject_id: SUBJECT_ID,
        attempt_id: "missing-attempt",
        kind: "knowledge",
        severity: "important",
        blocks_readiness: false,
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingGapAttempt = missingReferenceForCode(problems, "gap_missing_attempt");
  assert.equal(problems.length, 1);
  assert.equal(missingGapAttempt.missing_ref.kind, "attempt");
  assert.equal(missingGapAttempt.missing_ref.id, "missing-attempt");
  assert.equal(missingGapAttempt.missing_ref.field, "attempt_id");
});

test("getMemoryStoreProblems reports missing subject references for repairs", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Present subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    gaps: [
      {
        id: GAP_ID,
        subject_id: SUBJECT_ID,
        attempt_id: ATTEMPT_ID,
        kind: "knowledge",
        severity: "important",
        blocks_readiness: false,
        evidence_id: "e1",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    repairs: [
      {
        id: "repair-1",
        subject_id: "missing-subject",
        gap_id: GAP_ID,
        operation_kind: "trace",
        prompt: "repair",
        required_evidence: ["e1"],
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingRepairSubject = missingReferenceForCode(problems, "repair_missing_subject");
  assert.equal(missingRepairSubject.missing_ref.kind, "subject");
  assert.equal(missingRepairSubject.missing_ref.field, "subject_id");
  assert.equal(missingRepairSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing subject references for reviews", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    reviews: [
      {
        id: "review-1",
        subject_id: "missing-subject",
        kind: "confirmation",
        reason: "initial review",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingReviewSubject = missingReferenceForCode(problems, "review_missing_subject");
  assert.equal(missingReviewSubject.missing_ref.kind, "subject");
  assert.equal(missingReviewSubject.missing_ref.field, "subject_id");
  assert.equal(missingReviewSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing transfer root subject reference", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    transfers: [
      {
        id: "transfer-1",
        subject_id: "missing-subject",
        from_subject_id: SUBJECT_ID,
        to_subject_id: SUBJECT_ID,
        due_at: "2026-05-28T00:00:00.000Z",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingTransferSubject = missingReferenceForCode(problems, "transfer_missing_subject");
  assert.equal(problems.length, 1);
  assert.equal(missingTransferSubject.missing_ref.kind, "subject");
  assert.equal(missingTransferSubject.missing_ref.field, "subject_id");
  assert.equal(missingTransferSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing subject references for artifacts", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    artifacts: [
      {
        id: "artifact-1",
        subject_id: "missing-subject",
        path: "src/file.ts",
        kind: "code",
        checksum: "abc123",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingArtifactSubject = missingReferenceForCode(problems, "artifact_missing_subject");
  assert.equal(missingArtifactSubject.missing_ref.kind, "subject");
  assert.equal(missingArtifactSubject.missing_ref.field, "subject_id");
  assert.equal(missingArtifactSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing subject references for events", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    events: [
      {
        id: "event-1",
        subject_id: "missing-subject",
        event_type: "attempt",
        message: "attempt recorded",
        metadata: { source: "test" },
        occurred_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingEventSubject = missingReferenceForCode(problems, "event_missing_subject");
  assert.equal(missingEventSubject.missing_ref.kind, "subject");
  assert.equal(missingEventSubject.missing_ref.field, "subject_id");
  assert.equal(missingEventSubject.missing_ref.id, "missing-subject");
});

test("getMemoryStoreProblems reports missing subject references for evidence refs", () => {
  const store = memoryCore.createMemoryStore({
    subjects: [
      {
        id: SUBJECT_ID,
        kind: "concept",
        label: "Core subject",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
    evidence_refs: [
      {
        id: "evidence-1",
        subject_id: "missing-subject",
        evidence_id: "e1",
        file_path: "src/file.ts",
        start_line: 1,
        end_line: 2,
        excerpt: "line snippet",
        created_at: "2026-05-21T00:00:00.000Z",
      },
    ],
  });

  const problems = memoryCore.getMemoryStoreProblems(store);
  const missingEvidenceSubject = missingReferenceForCode(
    problems,
    "evidence_ref_missing_subject",
  );
  assert.equal(missingEvidenceSubject.missing_ref.kind, "subject");
  assert.equal(missingEvidenceSubject.missing_ref.field, "subject_id");
  assert.equal(missingEvidenceSubject.missing_ref.id, "missing-subject");
});

test("append helpers are append-only and do not mutate previous stores", () => {
  const empty = memoryCore.createMemoryStore();
  const withSubject = memoryCore.appendMemorySubject(empty, {
    id: SUBJECT_ID,
    kind: "session",
    label: "Session subject",
    created_at: "2026-05-21T00:00:00.000Z",
  });
  const withAttempt = memoryCore.appendMemoryAttempt(withSubject, {
    id: ATTEMPT_ID,
    subject_id: SUBJECT_ID,
    operation_id: "operation-1",
    artifact_id: "artifact-1",
    answer_text: "answer",
    confidence: "low",
    created_at: "2026-05-21T00:00:01.000Z",
  });

  assert.equal(empty.subjects.length, 0);
  assert.equal(withSubject.subjects.length, 1);
  assert.equal(withSubject.attempts.length, 0);
  assert.equal(withAttempt.attempts.length, 1);
  assert.equal(withSubject.artifacts.length, 0);
  assert.equal(empty.subjects[0], undefined);
  assert.equal(withAttempt.subjects[0]?.id, SUBJECT_ID);
});
