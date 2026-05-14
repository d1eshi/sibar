import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import { evaluateFreeformOwnershipAnswer, runSelfhostFreeformEval } from "../src/evals/selfhost-freeform.ts";

test("self-hosted freeform first slice evaluates five manual answer shapes", () => {
  const report = runSelfhostFreeformEval();

  assert.equal(report.validation, "VAL-EVAL-008-selfhost-freeform-first-slice");
  assert.equal(report.aggregate.total_cases, 5);
  assert.equal(report.aggregate.passed_cases, 5);
  assert.equal(report.aggregate.failed_cases, 0);
  assert.deepEqual(
    report.cases.map((entry) => [entry.case_id, entry.observed_finding_type]),
    [
      ["GC-001", "readiness"],
      ["GC-002", "evidence_gap"],
      ["GC-003", "flow_gap"],
      ["GC-006", "false_confidence_gap"],
      ["GC-008", "design_induced_gap"],
    ],
  );
  assert.ok(report.cases.every((entry) => entry.user_evidence_attached));
  assert.ok(report.cases.every((entry) => entry.repo_evidence_attached));
});

test("freeform evaluator does not need answer_class to classify uncited answers", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: {
      id: "SC-001-artifact-boundary",
      concept_id: "artifact_boundary",
      operation: "trace",
      prompt: "Trace boundary behavior.",
      required_repo_evidence: [{ path: "src/runtime-concept-graph.ts", rationale: "Boundary logic." }],
      minimum_readiness: "ready to inspect",
      reevaluation_prompt: "Retry with explicit citations.",
    },
    user_answer: "Boundary checks are based on manifest paths and the rest of the repository is out of scope.",
    declared_confidence: "high",
    bounded_repo_evidence: [{
      path: "src/runtime-concept-graph.ts",
      rationale: "Boundary logic.",
      excerpt: "export function buildConceptGraph",
      exists: true,
    }],
  });

  assert.equal(finding.finding_type, "evidence_gap");
  assert.equal(finding.user_evidence_attached, true);
  assert.equal(finding.repo_evidence_attached, true);
  assert.equal(finding.repair_task !== null, true);
});

test("freeform evaluator rejects gaps that lack user or repo evidence", () => {
  assert.throws(() => evaluateFreeformOwnershipAnswer({
    masteryCheck: {
      id: "SC-001-artifact-boundary",
      concept_id: "artifact_boundary",
      operation: "trace",
      prompt: "Trace boundary behavior.",
      required_repo_evidence: [{ path: "src/runtime-concept-graph.ts", rationale: "Boundary logic." }],
      minimum_readiness: "ready to inspect",
      reevaluation_prompt: "Retry with explicit citations.",
    },
    user_answer: "",
    declared_confidence: "low",
    bounded_repo_evidence: [{
      path: "src/runtime-concept-graph.ts",
      rationale: "Boundary logic.",
      excerpt: "export function buildConceptGraph",
      exists: true,
    }],
  }), /invalid_gap_without_user_and_repo_evidence/);

  assert.throws(() => evaluateFreeformOwnershipAnswer({
    masteryCheck: {
      id: "SC-001-artifact-boundary",
      concept_id: "artifact_boundary",
      operation: "trace",
      prompt: "Trace boundary behavior.",
      required_repo_evidence: [{ path: "src/runtime-concept-graph.ts", rationale: "Boundary logic." }],
      minimum_readiness: "ready to inspect",
      reevaluation_prompt: "Retry with explicit citations.",
    },
    user_answer: "Boundary checks are based on manifest paths.",
    declared_confidence: "medium",
    bounded_repo_evidence: [],
  }), /invalid_gap_without_user_and_repo_evidence/);
});

test("freeform CLI writes a report and exits cleanly", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-cli-"));
  const reportPath = join(tempDir, "report.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-freeform.ts"),
      "--report",
      reportPath,
    ], { encoding: "utf8" });

    assert.equal(result.status, 0, result.stderr);
    const aggregate = JSON.parse(result.stdout || "{}") as { total_cases: number; failed_cases: number };
    assert.equal(aggregate.total_cases, 5);
    assert.equal(aggregate.failed_cases, 0);

    const report = JSON.parse(readFileSync(reportPath, "utf8")) as { cases: unknown[] };
    assert.equal(report.cases.length, 5);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
