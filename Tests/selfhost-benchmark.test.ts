import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import { runSelfhostBenchmark } from "../src/evals/selfhost-benchmark.ts";

const DEFAULT_MANIFEST_PATH = "sibar.selfhost.manifest.json";
const DEFAULT_GOLD_CASE_INDEX = "docs/specs/selfhost/pilot/gold-cases/index.json";

function withMutatedGoldIndex(
  mutator: (args: {
    index: {
      cases: Array<Record<string, unknown>>;
    };
    tempDir: string;
    getCasePath: (relativeCasePath: string) => string;
  }) => void,
) {
  const rootIndex = JSON.parse(readFileSync(DEFAULT_GOLD_CASE_INDEX, "utf8")) as {
    cases: Array<Record<string, unknown>>;
  };
  const workingIndex = structuredClone(rootIndex);
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-benchmark-"));
  const casesSource = resolve("docs/specs/selfhost/pilot/gold-cases/cases");
  const casesDestination = join(tempDir, "cases");
  cpSync(casesSource, casesDestination, { recursive: true });
  const tempPath = join(tempDir, "index.json");
  writeFileSync(tempPath, `${JSON.stringify(workingIndex, null, 2)}\n`, "utf8");

  const getCasePath = (relativeCasePath: string) => join(tempDir, relativeCasePath);

  try {
    mutator({ index: workingIndex, tempDir, getCasePath });
    writeFileSync(tempPath, `${JSON.stringify(workingIndex, null, 2)}\n`, "utf8");
    return { tempPath, tempDir };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

test("self-hosted benchmark passes all gold cases with no mismatches", () => {
  const report = runSelfhostBenchmark();

  assert.equal(report.validation, "VAL-EVAL-007-selfhost-benchmark");
  assert.equal(report.aggregate.total_cases, 40);
  assert.equal(report.aggregate.passed_cases, 40);
  assert.equal(report.aggregate.failed_cases, 0);
  assert.equal(report.aggregate.total_mismatches, 0);
  assert.equal(report.aggregate.pilot_validation_mismatch_count, 0);
  assert.equal(report.aggregate.gap_precision, 1);
  assert.equal(report.aggregate.gap_recall, 1);
  assert.equal(report.aggregate.gap_type_accuracy, 1);
  assert.equal(report.aggregate.false_confidence_detection_count, 5);
  assert.equal(report.aggregate.design_issue_detection_count, 5);
  assert.equal(report.pilot_validation.aggregate.total_mismatches, 0);
  assert.equal(report.cases.length, 40);
  assert.ok(report.cases.every((entry) => entry.passed));
});

test("benchmark flags mismatch when a non-grounded case has an invalid expected_gap_type", () => {
  const { tempPath, tempDir } = withMutatedGoldIndex(({ index, getCasePath }) => {
    const casePath = getCasePath(index.cases[1]?.path as string);
    const payload = JSON.parse(readFileSync(casePath, "utf8")) as {
      expected_gap_type?: unknown;
    };
    payload.expected_gap_type = "bogus-gap";
    writeFileSync(casePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  });

  try {
    const report = runSelfhostBenchmark({ manifestPath: DEFAULT_MANIFEST_PATH, indexPath: tempPath });
    assert.equal(report.aggregate.total_mismatches > 0, true);
    assert.equal(report.aggregate.pilot_validation_mismatch_count > 0, true);
    assert.equal(report.pilot_validation.aggregate.total_mismatches > 0, true);
    assert.ok(
      report.pilot_validation.mismatches.some((entry) =>
        entry.code === "case_invalid_gap_type",
      ),
      "pilot should report invalid gap type",
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("benchmark flags mismatch when correct_grounded case has expected_gap_present true", () => {
  const { tempPath, tempDir } = withMutatedGoldIndex(({ index, getCasePath }) => {
    const casePath = getCasePath(index.cases[0]?.path as string);
    const payload = JSON.parse(readFileSync(casePath, "utf8")) as {
      expected_gap_present?: unknown;
    };
    payload.expected_gap_present = true;
    writeFileSync(casePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  });

  try {
    const report = runSelfhostBenchmark({ manifestPath: DEFAULT_MANIFEST_PATH, indexPath: tempPath });
    assert.equal(report.aggregate.total_mismatches > 0, true);
    assert.ok(
      report.pilot_validation.mismatches.some((entry) =>
        entry.code === "case_gap_present_for_correct_grounded",
      ),
      "pilot should enforce correct_grounded gap presence",
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI writes benchmark report with space-separated report flag", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-benchmark-cli-"));
  const reportPath = join(tempDir, "report.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-benchmark.ts"),
      "--report",
      reportPath,
    ], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0);
    const aggregate = JSON.parse(result.stdout || "{}") as { total_mismatches: number };
    assert.equal(aggregate.total_mismatches, 0);
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as { aggregate: { total_mismatches: number } };
    assert.equal(report.aggregate.total_mismatches, 0);
    assert.ok(existsSync(reportPath));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI exits nonzero for temp index mutation", () => {
  const { tempPath, tempDir } = withMutatedGoldIndex(({ index, getCasePath }) => {
    const casePath = getCasePath(index.cases[2]?.path as string);
    const payload = JSON.parse(readFileSync(casePath, "utf8")) as {
      expected_gap_present?: unknown;
    };
    payload.expected_gap_present = "not-a-boolean";
    writeFileSync(casePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  });

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-benchmark.ts"),
      "--index",
      tempPath,
    ], {
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    const aggregate = JSON.parse(result.stdout || "{}") as { total_mismatches: number };
    assert.equal(aggregate.total_mismatches > 0, true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
