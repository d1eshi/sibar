import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import { validateEvalCatalog } from "../src/evals/catalog.ts";

test("eval catalog declares discoverable suites with valid commands and paths", () => {
  const validation = validateEvalCatalog();

  assert.deepEqual(validation.problems, []);
  assert.equal(validation.valid, true);
  assert.deepEqual(
    validation.suites.map((suite) => suite.suiteId),
    ["attempt-readiness", "workspace-plan-adapters"],
  );

  for (const suite of validation.suites) {
    assert.ok(suite.title.length > 0);
    assert.ok(suite.purpose.length > 0);
    assert.ok(suite.protects.length > 0);
    assert.ok(suite.artifacts.length > 0);
    assert.ok(suite.evaluations.length > 0);
    for (const evaluation of suite.evaluations) {
      assert.match(evaluation.command, /^pnpm eval:/);
      assert.ok(evaluation.inputs.every((inputPath) => inputPath.startsWith("evals/") || inputPath.startsWith("src/")));
      assert.ok(evaluation.reports.every((reportPath) => reportPath.startsWith(`evals/${suite.suiteId}/reports/`)));
    }
  }
});

test("eval:catalog prints the repo eval suites", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", resolve("src/evals/catalog.ts")],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /attempt-readiness: Attempt readiness loop evals/);
  assert.match(result.stdout, /workspace-plan-adapters: WorkspacePlan adapter evals/);
  assert.match(result.stdout, /rust-fixture: evals\/workspace-plan-adapters\/fixtures\/rust_workspace_plan_fixture\.json/);
  assert.match(result.stdout, /VAL-EVAL-010-workspace-runner-adapter: pnpm eval:workspace-runner-adapter/);
});
