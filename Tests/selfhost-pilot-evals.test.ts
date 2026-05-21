import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { runSelfhostPilotEval } from "../src/evals/selfhost-pilot.ts";

const DEFAULT_MANIFEST_PATH = "evals/attempt-readiness/manifest.json";
const DEFAULT_GOLD_CASE_INDEX = "evals/attempt-readiness/gold-cases/index.json";
const BENCHMARK_ANSWER_CLASSES = [
  "correct_grounded",
  "correct_uncited",
  "partial",
  "wrong_responsibility",
  "wrong_flow",
  "overconfident_wrong",
  "declared_uncertainty",
  "design_induced_confusion",
] as const;

function withMutatedGoldIndex(
  mutator: (args: {
    index: {
      cases: Array<Record<string, unknown>>;
    };
    tempDir: string;
  }) => void,
) {
  const rootIndex = JSON.parse(readFileSync(DEFAULT_GOLD_CASE_INDEX, "utf8")) as {
    cases: Array<Record<string, unknown>>;
  };
  const workingIndex = structuredClone(rootIndex);
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-pilot-"));
  const casesSource = join(dirname(DEFAULT_GOLD_CASE_INDEX), "cases");
  const casesDestination = join(tempDir, "cases");
  cpSync(casesSource, casesDestination, { recursive: true });
  const tempPath = join(tempDir, "index.json");
  writeFileSync(tempPath, JSON.stringify(workingIndex, null, 2) + "\n", "utf8");

  try {
    mutator({ index: workingIndex, tempDir });
    writeFileSync(tempPath, `${JSON.stringify(workingIndex, null, 2)}\n`, "utf8");
    return { tempPath, tempDir };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

test("self-hosted pilot validator passes the current repo artifacts", () => {
  const report = runSelfhostPilotEval();

  assert.equal(report.aggregate.total_mismatches, 0);
  assert.equal(report.aggregate.cases_checked, 40);
  assert.equal(report.aggregate.out_of_scope_required_evidence_paths, 0);
  assert.equal(report.aggregate.total_checks > 0, true);
  for (const answerClass of BENCHMARK_ANSWER_CLASSES) {
    assert.equal(report.aggregate.answer_class_distribution[answerClass], 5);
  }
});

test("validator fails when a correct_grounded case uses a non-null gap label", () => {
  const { tempPath, tempDir } = withMutatedGoldIndex(({ index, tempDir }) => {
    const firstCase = index.cases[0] as { path?: unknown };
    const casePath = firstCase.path as string;
    const workingCasePayloadPath = join(tempDir, casePath);
    const workingCasePayload = JSON.parse(readFileSync(workingCasePayloadPath, "utf8")) as {
      expected_gap_type: unknown;
    };
    workingCasePayload.expected_gap_type = "none";
    writeFileSync(workingCasePayloadPath, `${JSON.stringify(workingCasePayload, null, 2)}\n`, "utf8");
  });

  try {
    const report = runSelfhostPilotEval({ manifestPath: DEFAULT_MANIFEST_PATH, indexPath: tempPath });

    assert.ok(report.aggregate.total_mismatches > 0);
    assert.ok(report.mismatches.some((entry) =>
      entry.code === "case_gap_type_for_correct_grounded" || entry.code === "case_invalid_gap_type",
    ));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("validator fails when required_repo_evidence points outside manifest included_paths", () => {
  const { tempPath, tempDir } = withMutatedGoldIndex(({ index, tempDir }) => {
    const firstCase = index.cases[1] as { path?: unknown; required_repo_evidence?: Array<Record<string, unknown>> };
    const casePath = firstCase.path as string;
    const workingCasePayloadPath = join(tempDir, casePath);
    const workingCasePayload = JSON.parse(readFileSync(workingCasePayloadPath, "utf8")) as {
      required_repo_evidence?: Array<Record<string, unknown>>;
    };
    const evidences = workingCasePayload.required_repo_evidence;
    if (Array.isArray(evidences) && evidences[0] && typeof evidences[0] === "object") {
      evidences[0].path = "package.json";
      writeFileSync(workingCasePayloadPath, `${JSON.stringify(workingCasePayload, null, 2)}\n`, "utf8");
    }
  });

  try {
    const report = runSelfhostPilotEval({ manifestPath: DEFAULT_MANIFEST_PATH, indexPath: tempPath });

    assert.equal(report.aggregate.total_mismatches > 0, true);
    assert.ok(report.mismatches.some((entry) => entry.code === "case_required_repo_evidence_not_in_manifest_included_paths"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runSelfhostPilotEval writes report when reportPath is provided", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-pilot-report-"));
  const reportPath = join(tempDir, "report.json");

  try {
    const report = runSelfhostPilotEval({ reportPath });
    assert.equal(report.aggregate.total_mismatches, 0);
    const written = JSON.parse(readFileSync(reportPath, "utf8")) as {
      validation: string;
      mismatches: unknown[];
    };
    assert.equal(written.validation, report.validation);
    assert.equal(written.mismatches.length, report.mismatches.length);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI accepts space-separated report flag and writes report file", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-pilot-cli-report-"));
  const reportPath = join(tempDir, "cli-report.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-pilot.ts"),
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
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI accepts space-separated index flag and honors provided index path", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-pilot-cli-index-"));
  const missingIndexPath = join(tempDir, "missing-index.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-pilot.ts"),
      "--index",
      missingIndexPath,
    ], {
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    const aggregate = JSON.parse(result.stdout || "{}") as { total_mismatches: number };
    assert.equal(typeof aggregate.total_mismatches, "number");
    assert.equal(aggregate.total_mismatches > 0, true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI accepts space-separated manifest flag and exits nonzero for missing manifest", () => {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    resolve("src/evals/selfhost-pilot.ts"),
    "--manifest",
    "does-not-exist.json",
  ], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  const aggregate = JSON.parse(result.stdout || "{}") as { total_mismatches: number };
  assert.equal(typeof aggregate.total_mismatches, "number");
  assert.equal(aggregate.total_mismatches > 0, true);
});
