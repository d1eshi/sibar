import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as ownershipCore from "../src/ownership-core/index.ts";
import * as pedagogyCore from "../src/pedagogy-core/index.ts";
import * as memoryCore from "../src/memory-core/index.ts";

type CoreModulePath = "../src/ownership-core/index.ts" | "../src/pedagogy-core/index.ts" | "../src/memory-core/index.ts";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, "..");

function expectNoSurfaceImports(modulePath: CoreModulePath): void {
  const absolutePath = join(REPO_ROOT, modulePath.replace(/^\.\.\//, ""));
  const source = readFileSync(absolutePath, "utf8");

  assert.doesNotMatch(source, /from\s+["'](?:node:fs|node:child_process|node:worker_threads|fs|child_process)["']/);
  assert.doesNotMatch(source, /from\s+["'][^"']*sibi\//);
  assert.doesNotMatch(source, /from\s+["'][^"']*web\//);
  assert.doesNotMatch(source, /from\s+["'][^"']*apps\/sibar-research-workspace\//);
  assert.doesNotMatch(source, /from\s+["']\.{1,2}\/(?:runtime-state|store|pedagogoai\/workspace-(?:intent|int(?:ent)?-adapter|compiler-runner))/);
  assert.doesNotMatch(source, /from\s+["'][^"']*runtime-workspace-(?:context|session)/);
}

function expectNoSourceMissionPlanningAdapters(modulePath: CoreModulePath): void {
  const absolutePath = join(REPO_ROOT, modulePath.replace(/^\.\.\//, ""));
  const source = readFileSync(absolutePath, "utf8");

  assert.doesNotMatch(source, /from\s+["'][^"']*runtime-source-mission-/);
  assert.doesNotMatch(source, /from\s+["'][^"']*article-workspace/);
  assert.doesNotMatch(source, /from\s+["'][^"']*pedagogoai\/workspace-intent/);
}

test("shared core entrypoints exist and are deterministic boundary facades", () => {
  assert.equal(ownershipCore.OWNERSHIP_CORE_BOUNDARY_VERSION, "0.1.0-slice-2");
  assert.equal(ownershipCore.OWNERSHIP_REVIEW_EXTRACTION_STATE.status, "available");
  assert.match(ownershipCore.OWNERSHIP_REVIEW_EXTRACTION_STATE.ownedBySlice, /slice-4/i);

  assert.equal(pedagogyCore.PEDAGOGY_CORE_BOUNDARY_VERSION, "0.1.0");
  assert.equal(typeof pedagogyCore.evaluateFullLoop, "function");
  assert.equal(typeof pedagogyCore.createReadinessClaim, "function");
  assert.equal(typeof pedagogyCore.createAttempt, "function");
  assert.equal(typeof pedagogyCore.attemptToReadiness, "function");
  assert.equal(typeof pedagogyCore.classifyGapTaxonomy, "function");
  assert.equal(Object.hasOwn(pedagogyCore, "SOURCE_MISSION_TRACE_SCHEMA_VERSION"), false);
  assert.equal(Object.hasOwn(pedagogyCore, "buildSourceMissionTraceRecord"), false);
  assert.ok(pedagogyCore.RECOGNIZED_OPERATION_KINDS.includes("explain"));
  assert.ok(pedagogyCore.RECOGNIZED_OPERATION_KINDS.includes("trace"));
  assert.ok(pedagogyCore.RECOGNIZED_ARTIFACT_KINDS.includes("paper_excerpt"));
  assert.ok(pedagogyCore.RECOGNIZED_ARTIFACT_KINDS.includes("test_oracle"));
  assert.ok(pedagogyCore.RECOGNIZED_EVIDENCE_ROLES.includes("source_truth"));
  assert.ok(pedagogyCore.RECOGNIZED_EVIDENCE_ROLES.includes("counterexample"));

  const attempt = pedagogyCore.createAttempt({
    operation_id: "operation-1",
    answer_text: "I can explain this from the cited source slice.",
    selected_evidence: ["evidence-1"],
    declared_confidence: "medium",
    declared_unknowns: ["implementation detail"],
  });
  assert.equal(attempt.operation_id, "operation-1");
  assert.deepEqual(attempt.selected_evidence, ["evidence-1"]);

  assert.equal(memoryCore.MEMORY_CORE_VERSION, "0.1.0");
  assert.equal(memoryCore.MEMORY_CORE_STORE_VERSION, "memory-core@0.1.0");

  expectNoSurfaceImports("../src/ownership-core/index.ts");
  expectNoSurfaceImports("../src/pedagogy-core/index.ts");
  expectNoSurfaceImports("../src/memory-core/index.ts");
  expectNoSourceMissionPlanningAdapters("../src/pedagogy-core/index.ts");
});

test("memory core starts empty and append helpers are non-mutating", () => {
  const empty = memoryCore.createMemoryStore();
  assert.equal(empty.store_version, "memory-core@0.1.0");
  assert.equal(empty.subjects.length, 0);
  assert.equal(empty.evidence_refs.length, 0);
  assert.equal(empty.attempts.length, 0);
  assert.equal(empty.outcomes.length, 0);
  assert.equal(empty.gaps.length, 0);
  assert.equal(empty.repairs.length, 0);
  assert.equal(empty.misconceptions.length, 0);
  assert.equal(empty.reviews.length, 0);
  assert.equal(empty.transfers.length, 0);
  assert.equal(empty.artifacts.length, 0);
  assert.equal(empty.events.length, 0);

  const withSubject = memoryCore.appendMemorySubject(empty, {
    id: "subject-1",
    kind: "diff",
    label: "diff/core",
    created_at: "2026-05-21T00:00:00.000Z",
  });
  assert.equal(empty.subjects.length, 0);
  assert.equal(withSubject.subjects.length, 1);

  const withEvidence = memoryCore.appendMemoryEvidenceRef(withSubject, {
    id: "ev-1",
    subject_id: "subject-1",
    evidence_id: "e1",
    file_path: "src/foo.ts",
    start_line: 1,
    end_line: 3,
    excerpt: "snippet",
    created_at: "2026-05-21T00:00:01.000Z",
  });
  assert.equal(withSubject.evidence_refs.length, 0);
  assert.equal(withEvidence.evidence_refs.length, 1);

  const withAttempt = memoryCore.appendMemoryAttempt(withEvidence, {
    id: "attempt-1",
    subject_id: "subject-1",
    operation_id: "op-1",
    artifact_id: "art-1",
    answer_text: "ok",
    confidence: "high",
    created_at: "2026-05-21T00:00:02.000Z",
  });
  assert.equal(withEvidence.attempts.length, 0);
  assert.equal(withAttempt.attempts.length, 1);

  const withOutcome = memoryCore.appendMemoryOutcome(withAttempt, {
    id: "out-1",
    attempt_id: "attempt-1",
    subject_id: "subject-1",
    result: "confirmed",
    evidence_id: "e1",
    created_at: "2026-05-21T00:00:03.000Z",
  });
  assert.equal(withAttempt.outcomes.length, 0);
  assert.equal(withOutcome.outcomes.length, 1);

  const withGap = memoryCore.appendMemoryGap(withOutcome, {
    id: "gap-1",
    subject_id: "subject-1",
    attempt_id: "attempt-1",
    kind: "confirmed",
    severity: "important",
    blocks_readiness: true,
    evidence_id: "e1",
    created_at: "2026-05-21T00:00:04.000Z",
  });
  assert.equal(withOutcome.gaps.length, 0);
  assert.equal(withGap.gaps.length, 1);

  const withRepair = memoryCore.appendMemoryRepair(withGap, {
    id: "repair-1",
    subject_id: "subject-1",
    gap_id: "gap-1",
    operation_kind: "trace",
    prompt: "retrace",
    required_evidence: ["e1"],
    created_at: "2026-05-21T00:00:05.000Z",
  });
  assert.equal(withGap.repairs.length, 0);
  assert.equal(withRepair.repairs.length, 1);

  const withMisconception = memoryCore.appendMemoryMisconception(withRepair, {
    id: "mis-1",
    subject_id: "subject-1",
    label: "missing concept",
    severity: "active",
    occurrences: 1,
    created_at: "2026-05-21T00:00:06.000Z",
    updated_at: "2026-05-21T00:00:06.000Z",
  });
  assert.equal(withRepair.misconceptions.length, 0);
  assert.equal(withMisconception.misconceptions.length, 1);

  const withReview = memoryCore.appendMemoryReview(withMisconception, {
    id: "review-1",
    subject_id: "subject-1",
    kind: "confirmation",
    reason: "confirmed",
    created_at: "2026-05-21T00:00:07.000Z",
  });
  assert.equal(withMisconception.reviews.length, 0);
  assert.equal(withReview.reviews.length, 1);

  const withTransfer = memoryCore.appendMemoryTransfer(withReview, {
    id: "transfer-1",
    subject_id: "subject-1",
    from_subject_id: "s1",
    to_subject_id: "s2",
    due_at: "2026-05-22T00:00:00.000Z",
    created_at: "2026-05-21T00:00:08.000Z",
  });
  assert.equal(withReview.transfers.length, 0);
  assert.equal(withTransfer.transfers.length, 1);

  const withArtifact = memoryCore.appendMemoryArtifact(withTransfer, {
    id: "artifact-1",
    subject_id: "subject-1",
    path: "src/bar.ts",
    kind: "code",
    checksum: "abc",
    created_at: "2026-05-21T00:00:09.000Z",
  });
  assert.equal(withTransfer.artifacts.length, 0);
  assert.equal(withArtifact.artifacts.length, 1);

  const withEvent = memoryCore.appendMemoryEvent(withArtifact, {
    id: "event-1",
    subject_id: "subject-1",
    event_type: "custom",
    message: "added",
    metadata: { source: "test" },
    occurred_at: "2026-05-21T00:00:10.000Z",
  });
  assert.equal(withArtifact.events.length, 0);
  assert.equal(withEvent.events.length, 1);
  assert.equal(withArtifact.attempts.length, 1);
  assert.equal(withArtifact.attempts[0]?.id, "attempt-1");
});
