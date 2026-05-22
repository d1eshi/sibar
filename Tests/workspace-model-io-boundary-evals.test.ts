import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  runWorkspaceModelIOBoundaryEval,
  type WorkspaceModelIOBoundaryEvalReport,
  WORKSPACE_MODEL_IO_BOUNDARY_EVAL_GENERATED_AT,
} from "../src/evals/workspace-model-io-boundary.ts";

test("Workspace model IO boundary eval covers provider-neutral parser and adapter rejection", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-workspace-model-io-boundary-eval-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runWorkspaceModelIOBoundaryEval({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-011-workspace-model-io-boundary");
    assert.equal(report.eval_spec_path, "evals/workspace-plan-adapters/workspace-model-io-boundary.eval.json");
    assert.equal(report.generated_at, WORKSPACE_MODEL_IO_BOUNDARY_EVAL_GENERATED_AT);
    assert.equal(report.no_llm, true);
    assert.equal(report.aggregate.total_cases, 6);
    assert.equal(report.aggregate.passed_cases, 6);
    assert.equal(report.aggregate.failed_cases, 0);
    assert.equal(report.aggregate.accepted_parse_cases, 3);
    assert.equal(report.aggregate.rejected_parse_cases, 2);
    assert.equal(report.aggregate.rejected_adapter_cases, 1);
    assert.equal(report.aggregate.total_mismatches, 0);

    const noisy = report.cases.find((entry) => entry.id === "WMIO-003-STDOUT-CONTAMINATED");
    assert.equal(noisy?.observations.accepted, true);

    const unknownAdapter = report.cases.find((entry) => entry.id === "WMIO-006-UNKNOWN-ADAPTER");
    assert.equal(unknownAdapter?.observations.runner_status, "failed");
    assert.equal(unknownAdapter?.observations.adapter, "future-provider");
    assert.match(unknownAdapter?.observations.error ?? "", /Unknown workspace compiler adapter/);

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as WorkspaceModelIOBoundaryEvalReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
