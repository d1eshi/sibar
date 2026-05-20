import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT,
  runPedagogyCoreCoverageEval,
  type PedagogyCoreCoverageReport,
} from "../src/evals/pedagogy-core-coverage.ts";

test("pedagogy core coverage eval exercises layers, questions, signals, and pipeline directly", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-pedagogy-core-coverage-eval-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runPedagogyCoreCoverageEval({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-013-pedagogy-core-coverage");
    assert.equal(report.eval_spec_path, "evals/pedagogy-layers/eval-suite.json");
    assert.equal(report.generated_at, PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT);
    assert.equal(report.no_llm, true);
    assert.equal(report.coverage_passed, true);
    assert.deepEqual(report.aggregate.covered_modules, ["index", "layers", "pipeline", "questions", "signals"]);
    assert.equal(report.aggregate.total_cases, 5);
    assert.equal(report.aggregate.detected_gaps, 3);
    assert.equal(report.aggregate.generated_questions, 3);

    assert.deepEqual(report.observations.layers.all_layers, [1, 2, 3, 4, 5]);
    assert.equal(report.observations.layers.task_minimums["review-architecture"], 5);
    assert.equal(report.observations.layers.signal_type_mapping.application, 4);

    assert.deepEqual(report.observations.signals.catalog_layers, [1, 2, 3, 4, 5]);
    assert.equal(report.observations.signals.detected_layers.l3_prefers_high_over_lower, 3);
    assert.equal(report.observations.signals.detected_layers.ignores_low_only, null);
    assert.equal(report.observations.signals.lookup_signal, "S4.1");

    assert.equal(report.observations.questions.depths_by_layer.L4, "challenging");
    assert.equal(report.observations.questions.answer_styles_by_layer.L3, "risk_analysis");
    assert.deepEqual(report.observations.questions.severity_examples, {
      critical: "critical",
      important: "important",
      later: "later",
    });
    assert.equal(report.observations.questions.uncertainty_detected, true);
    assert.equal(report.observations.questions.adaptation.timing, "deferred");

    assert.equal(report.observations.pipeline.observation_tool_count, 1);
    assert.equal(report.observations.pipeline.deliveries.filter((delivery) => delivery === "immediate").length, 1);
    assert.ok(report.observations.pipeline.gap_order[0].endsWith(":critical"));
    assert.ok(report.observations.pipeline.gap_order.some((entry) => entry.endsWith(":later")));
    assert.ok(report.observations.pipeline.prompts.some((prompt) => prompt.includes("walk me through")));
    assert.deepEqual(report.observations.pipeline.verification_actions, [
      "advance",
      "connect",
      "drop_and_orient",
      "respect_boundary",
    ]);
    assert.equal(report.observations.pipeline.run_pipeline_question_count, 3);

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as PedagogyCoreCoverageReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
    assert.equal(persisted.coverage_passed, true);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
