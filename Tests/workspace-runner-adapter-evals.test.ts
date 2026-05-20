import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  runWorkspaceRunnerAdapterEval,
  type WorkspaceRunnerAdapterEvalReport,
  WORKSPACE_RUNNER_ADAPTER_EVAL_GENERATED_AT,
} from "../src/evals/workspace-runner-adapter.ts";

test("Workspace runner adapter eval covers Rust fixture and offline Codex runner paths", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-workspace-runner-adapter-eval-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runWorkspaceRunnerAdapterEval({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-010-workspace-runner-adapter");
    assert.equal(report.eval_spec_path, "docs/specs/selfhost/pilot/evals/workspace-runner-adapter.eval.json");
    assert.equal(report.generated_at, WORKSPACE_RUNNER_ADAPTER_EVAL_GENERATED_AT);
    assert.equal(report.report_id, `VAL-EVAL-010-workspace-runner-adapter-${WORKSPACE_RUNNER_ADAPTER_EVAL_GENERATED_AT}`);
    assert.equal(report.no_llm, true);
    assert.equal(report.aggregate.total_cases, 3);
    assert.equal(report.aggregate.passed_cases, 3);
    assert.equal(report.aggregate.failed_cases, 0);
    assert.equal(report.aggregate.completed_runner_cases, 1);
    assert.equal(report.aggregate.failed_runner_cases, 1);
    assert.equal(report.aggregate.blocked_runner_cases, 1);
    assert.equal(report.aggregate.rust_fixture_cases, 2);
    assert.equal(report.aggregate.codex_exec_cases, 1);
    assert.equal(report.aggregate.total_mismatches, 0);

    const completed = report.cases.find((entry) => entry.id === "WRA-001-RUST-FIXTURE-COMPLETED");
    assert.equal(completed?.observations.runner_status, "completed");
    assert.equal(completed?.observations.adapter, "fixture");
    assert.equal(completed?.observations.rust_plan_present, true);
    assert.equal(completed?.observations.compiled_by, "llm");

    const codex = report.cases.find((entry) => entry.id === "WRA-003-CODEX-EXEC-BLOCKED");
    assert.equal(codex?.observations.runner_status, "blocked");
    assert.equal(codex?.observations.adapter, "codex-exec");
    assert.match(codex?.observations.command ?? "", /--adapter codex-exec/);

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as WorkspaceRunnerAdapterEvalReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
