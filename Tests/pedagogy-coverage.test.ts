import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PEDAGOGY_COVERAGE_EVAL_GENERATED_AT,
  runPedagogyCoverageEval,
  type PedagogyCoverageReport,
} from "../engine/evals/pedagogy-coverage.ts";

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
    assert.deepEqual(report.policy.fail_closed_dimensions, [
      "layers",
      "operations",
      "gap_labels",
      "evidence_conditions",
      "loop_stages",
      "answer_classes",
    ]);
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
    assert.ok(report.gaps.every((entry) => entry.severity === "fail_closed"));

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as PedagogyCoverageReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});

test("pedagogy coverage CLI fails closed by default when semantic coverage is missing", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-pedagogy-coverage-cli-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      "engine/evals/pedagogy-coverage.ts",
      "--report",
      reportPath,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.equal(result.error, undefined);
    const summary = JSON.parse(result.stdout) as Pick<PedagogyCoverageReport, "coverage_passed" | "aggregate" | "gaps">;
    assert.equal(summary.coverage_passed, false);
    assert.ok(summary.gaps.every((entry) => entry.severity === "fail_closed"));

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as PedagogyCoverageReport;
    assert.equal(persisted.coverage_passed, false);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});

test("pedagogy coverage CLI allows explicit reporting override", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-pedagogy-coverage-cli-override-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      "engine/evals/pedagogy-coverage.ts",
      "--report",
      reportPath,
      "--allow-coverage-gaps",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    assert.equal(result.error, undefined);
    const summary = JSON.parse(result.stdout) as Pick<PedagogyCoverageReport, "coverage_passed" | "aggregate" | "gaps">;
    assert.equal(summary.coverage_passed, true);
    assert.ok(summary.gaps.length > 0);
    assert.ok(summary.gaps.every((entry) => entry.severity === "report_only"));

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as PedagogyCoverageReport;
    assert.deepEqual(persisted.policy.fail_closed_dimensions, []);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
