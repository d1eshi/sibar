import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { trackMisconception } from "../../src/runtime-pedagogy-loop.ts";
import type { MisconceptionMemory } from "../../src/runtime-pedagogy-loop.ts";
import type { OwnershipGap } from "../../src/runtime-deep-ownership.ts";
import { makeEvidenceRef } from "./fixtures.ts";

describe("VAL-PED-009: Misconception memory is durable", () => {
  test("first misconception creates a new entry", () => {
    const gap: OwnershipGap = {
      id: "GAP-001",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: [],
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-001",
    });

    assert.equal(updated.length, 1);
    assert.equal(updated[0].repeated_count, 1);
    assert.equal(updated[0].current_status, "active");
    assert.ok(updated[0].repair_history.length === 1);
  });

  test("repeated misconception updates count and repair history", () => {
    const existing: MisconceptionMemory[] = [{
      id: "MIS-001",
      label: "Test Concept: shallow_trace",
      concept_id: "CS-T001",
      first_seen_at: new Date(Date.now() - 86400000).toISOString(),
      repeated_count: 1,
      domains_seen: ["CS-T001"],
      evidence: [makeEvidenceRef()],
      repair_history: [{
        repair_action_id: "REP-001",
        attempted_at: new Date(Date.now() - 86400000).toISOString(),
        outcome: "persisted",
      }],
      current_status: "active",
      last_seen_at: new Date(Date.now() - 86400000).toISOString(),
    }];

    const gap: OwnershipGap = {
      id: "GAP-002",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-002",
      artifact_evidence_refs: [makeEvidenceRef({ evidence_id: "EV-T002" })],
      evidence: "Repeated gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: existing,
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef({ evidence_id: "EV-T002" })],
      repairActionId: "REP-002",
    });

    assert.equal(updated.length, 1);
    assert.equal(updated[0].repeated_count, 2);
    assert.equal(updated[0].repair_history.length, 2);
  });

  test("third repetition transitions to monitored status", () => {
    const existing: MisconceptionMemory[] = [{
      id: "MIS-001",
      label: "Test Concept: shallow_trace",
      concept_id: "CS-T001",
      first_seen_at: new Date(Date.now() - 172800000).toISOString(),
      repeated_count: 2,
      domains_seen: ["CS-T001"],
      evidence: [makeEvidenceRef()],
      repair_history: [
        { repair_action_id: "REP-001", attempted_at: new Date().toISOString(), outcome: "persisted" },
        { repair_action_id: "REP-002", attempted_at: new Date().toISOString(), outcome: "persisted" },
      ],
      current_status: "active",
      last_seen_at: new Date(Date.now() - 86400000).toISOString(),
    }];

    const gap: OwnershipGap = {
      id: "GAP-003",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-003",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Third gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: existing,
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-003",
    });

    assert.equal(updated[0].repeated_count, 3);
    assert.equal(updated[0].current_status, "monitored");
  });

  test("different concept produces separate misconception entry", () => {
    const gap: OwnershipGap = {
      id: "GAP-001",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: [],
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-001",
    });

    const gap2: OwnershipGap = {
      id: "GAP-002",
      concept_slice_id: "CS-T002",
      kind: "vocabulary_only",
      user_attempt_ref: "ATT-002",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Different gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated2 = trackMisconception({
      existingMisconceptions: updated,
      gap: gap2,
      conceptSliceId: "CS-T002",
      conceptLabel: "Different Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-002",
    });

    assert.equal(updated2.length, 2);
  });
});
