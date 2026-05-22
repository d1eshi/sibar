import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  runSharedCoreBoundariesEval,
  SHARED_CORE_BOUNDARIES_EVAL_GENERATED_AT,
  type SharedCoreBoundariesReport,
} from "../src/evals/shared-core-boundaries.ts";

const VALID_SHARED_CORE_SPEC = `# 04: Shared Core Boundaries

## Global Gates

1. Evidence-grounded: no gap without cited evidence or an explicit unsupported state.
2. Attempt-first: no readiness claim from passive reading or model explanation alone.
3. Operation-scoped: readiness is tied to an operation such as explain, trace, derive, predict, implement, test, benchmark, or modify.
4. Artifact-scoped: claims are tied to a source slice, artifact, diff, PR, or repo area boundary.
5. No whole-mission or whole-repo ownership claim from one session or review.
6. Closed gap taxonomy: new gap kinds require tests and eval coverage.
7. Repair with return condition: every repair must state what original operation it returns to.
8. Misconception memory: repeated gaps accumulate durable evidence instead of being overwritten.
9. Recall and transfer are separate: local success does not imply retained or transferable ownership.
10. Raw model output is untrusted until parsed, schema-checked, evidence-checked, pedagogy-checked, and projected.
`;

function writeFixture(rootDir: string, path: string, content: string): void {
  const absolutePath = join(rootDir, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

test("shared core boundaries eval scans repo boundaries and writes a deterministic report", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-shared-core-boundaries-eval-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runSharedCoreBoundariesEval({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-014-shared-core-boundaries");
    assert.equal(report.eval_spec_path, "evals/shared-core-boundaries/eval-suite.json");
    assert.equal(report.generated_at, SHARED_CORE_BOUNDARIES_EVAL_GENERATED_AT);
    assert.equal(report.no_llm, true);
    assert.equal(report.passed, true);
    assert.equal(report.aggregate.total_cases, 5);
    assert.equal(report.aggregate.failed_cases, 0);
    assert.equal(report.aggregate.expected_gates, 10);
    assert.equal(report.aggregate.declared_gates, 10);

    const coreCases = report.cases.filter((entry) => entry.id.includes("CORE-IMPORTS"));
    assert.equal(coreCases.length, 3);
    assert.ok(coreCases.every((entry) => entry.status !== "failed"));

    const sibiCase = report.cases.find((entry) => entry.id === "SCB-004-SIBI-WORKSPACE-IMPORTS");
    assert.equal(sibiCase?.status, "passed");
    assert.ok((sibiCase?.files_checked ?? 0) > 0);

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as SharedCoreBoundariesReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});

test("shared core boundaries eval fails closed against temp repo violations", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "sibar-shared-core-boundaries-fixture-"));

  try {
    writeFixture(rootDir, "src/ownership-core/index.ts", "import { readFileSync } from 'node:fs';\n");
    writeFixture(rootDir, "src/pedagogy-core/index.ts", "export const ok = true;\n");
    writeFixture(rootDir, "src/memory-core/index.ts", "import '../runtime-state.ts';\n");
    writeFixture(rootDir, "sibi/src/ownershipReview.ts", "import type { WorkspaceIntent } from '../../src/pedagogoai/workspace-intent.ts';\n");
    writeFixture(rootDir, "docs/specs/deep-ownership-workspace/04_shared_core_boundaries.md", "# Missing gates\n");

    const report = runSharedCoreBoundariesEval({ rootDir, reportPath: "reports/shared-core.json" });

    assert.equal(report.passed, false);
    assert.equal(report.aggregate.failed_cases, 4);
    assert.equal(report.aggregate.violations, 14);
    assert.equal(report.aggregate.declared_gates, 0);
    assert.match(
      report.cases.find((entry) => entry.id === "SCB-001-OWNERSHIP-CORE-IMPORTS")?.violations[0]?.reason ?? "",
      /filesystem/,
    );
    assert.match(
      report.cases.find((entry) => entry.id === "SCB-004-SIBI-WORKSPACE-IMPORTS")?.violations[0]?.reason ?? "",
      /Sibi/,
    );
    assert.ok(readFileSync(join(rootDir, "reports/shared-core.json"), "utf8").includes("VAL-EVAL-014"));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("shared core boundaries eval passes clean temp repo fixtures", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "sibar-shared-core-boundaries-clean-"));

  try {
    writeFixture(rootDir, "src/ownership-core/index.ts", "export const ownershipCore = true;\n");
    writeFixture(rootDir, "src/pedagogy-core/index.ts", "export { ownershipCore } from '../ownership-core/index.ts';\n");
    writeFixture(rootDir, "src/memory-core/index.ts", "export type MemoryCoreMarker = { readonly appendOnly: true };\n");
    writeFixture(rootDir, "sibi/src/ownershipReview.ts", "export const reviewOwnership = () => 'ready';\n");
    writeFixture(rootDir, "docs/specs/deep-ownership-workspace/04_shared_core_boundaries.md", VALID_SHARED_CORE_SPEC);

    const report = runSharedCoreBoundariesEval({ rootDir, reportPath: "reports/shared-core.json" });

    assert.equal(report.passed, true);
    assert.equal(report.aggregate.failed_cases, 0);
    assert.equal(report.aggregate.skipped_cases, 0);
    assert.equal(report.aggregate.declared_gates, 10);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
