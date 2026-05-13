import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runLlmRuntimeTraceEvals } from "../src/evals/llm-runtime-trace.ts";

test("LLM runtime trace evals compare required Codex configs over identical fixture cases", () => {
  const previousCommand = process.env.SIBI_CODEX_COMMAND;
  delete process.env.SIBI_CODEX_COMMAND;
  const runtimeHome = mkdtempSync(join(tmpdir(), "sibar-e03-runtime-"));
  const reportPath = join(mkdtempSync(join(tmpdir(), "sibar-e03-report-")), "report.json");

  try {
    const report = runLlmRuntimeTraceEvals({ runtimeHome, reportPath });

    assert.deepEqual(report.validations, ["VAL-EVAL-003", "VAL-EVAL-005", "VAL-AGENT-001", "VAL-AGENT-002"]);
    assert.deepEqual(
      report.model_configurations.map((config) => config.label),
      ["codex gpt-5.2 medium", "codex gpt-5.5 low"],
    );
    assert.equal(report.shared_case_ids.length, 7);
    assert.equal(report.aggregate.total_cases, 7);
    assert.equal(report.aggregate.traces_recorded, 14);
    assert.equal(report.prompt_schema_shared, true);
    assert.equal(report.artifact_boundary_shared_per_case, true);
    assert.equal(report.live_run.status, "blocked");
    assert.match(report.live_run.guidance, /SIBI_CODEX_COMMAND/);
    assert.equal(report.dataset.benchmark_quality_claim, false);

    for (const caseID of report.shared_case_ids) {
      const paired = report.cases.filter((entry) => entry.case_id === caseID);
      assert.equal(paired.length, 2);
      assert.ok(paired.every((entry) => entry.trace.eval_case_id === caseID));
      assert.deepEqual(
        paired.map((entry) => entry.model_label).sort(),
        ["codex gpt-5.2 medium", "codex gpt-5.5 low"],
      );
      assert.ok(paired.every((entry) => entry.trace.prompt.includes("sibi_project_learning_agent")));
      assert.equal(paired[0].trace.prompt, paired[1].trace.prompt);
      assert.deepEqual(paired[0].trace.artifact_boundary, paired[1].trace.artifact_boundary);
      assert.ok(paired.every((entry) => entry.trace.final_runtime_output.readiness_decided_by_model === false));
    }

    assert.ok(report.aggregate.boundary_violations_rejected > 0);
    assert.ok(report.aggregate.readiness_or_truth_claims_rejected > 0);
    assert.ok(report.aggregate.uncited_claims_rejected > 0);
    assert.ok(
      report.cases.some((entry) =>
        Object.values(entry.rejected_signal_reasons).some((errors) =>
          errors.includes("model_readiness_or_truth_decision")
        )
      ),
    );
    assert.ok(
      report.cases.some((entry) =>
        entry.case_id === "E01-MISSING-EVIDENCE-L3"
        && entry.accepted_signal_ids.some((id) => id.endsWith("-accepted-concept"))
        && !Object.values(entry.rejected_signal_reasons).some((errors) =>
          errors.includes("model_readiness_or_truth_decision")
        )
      ),
    );
    assert.equal(JSON.parse(readFileSync(reportPath, "utf8")).aggregate.traces_recorded, 14);
  } finally {
    if (previousCommand === undefined) delete process.env.SIBI_CODEX_COMMAND;
    else process.env.SIBI_CODEX_COMMAND = previousCommand;
  }
});
