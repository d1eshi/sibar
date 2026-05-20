import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PEDAGOGY_COVERAGE_EVAL_GENERATED_AT,
  runPedagogyCoverageEval,
  type PedagogyCoverageReport,
} from "../src/evals/pedagogy-coverage.ts";

test("pedagogy coverage eval reports semantic dimensions and known missing coverage", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-pedagogy-coverage-eval-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runPedagogyCoverageEval({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-012-pedagogy-coverage");
    assert.equal(report.eval_spec_path, "evals/pedagogy-layers/eval-suite.json");
    assert.equal(report.generated_at, PEDAGOGY_COVERAGE_EVAL_GENERATED_AT);
    assert.equal(report.no_llm, true);
    assert.equal(report.aggregate.total_cases, 7);
    assert.equal(report.dimensions.length, 6);
    assert.equal(report.policy.fail_closed_dimensions.length, 0);
    assert.equal(report.coverage_passed, false);

    const layerCoverage = report.dimensions.find((entry) => entry.dimension === "layers");
    assert.deepEqual(layerCoverage?.missing, []);
    assert.deepEqual(layerCoverage?.required, ["L1", "L2", "L3", "L4", "L5"]);

    const answerClassCoverage = report.dimensions.find((entry) => entry.dimension === "answer_classes");
    assert.deepEqual(answerClassCoverage?.missing, []);

    const gapCoverage = report.dimensions.find((entry) => entry.dimension === "gap_labels");
    assert.ok(gapCoverage?.covered.includes("gap_critical"));
    assert.ok(gapCoverage?.covered.includes("gap_important"));
    assert.ok(gapCoverage?.covered.includes("no_gap"));
    assert.ok(gapCoverage?.missing.includes("observed_L5_gap"));

    const missingLabels = report.gaps.map((entry) => `${entry.dimension}:${entry.label}`);
    assert.ok(missingLabels.includes("gap_labels:observed_L5_gap"));
    assert.ok(report.gaps.every((entry) => entry.severity === "report_only"));

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as PedagogyCoverageReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
