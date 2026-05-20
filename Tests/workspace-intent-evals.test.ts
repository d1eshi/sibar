import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  runWorkspaceIntentCompilerEval,
  type WorkspaceIntentCompilerEvalReport,
  WORKSPACE_INTENT_COMPILER_EVAL_GENERATED_AT,
} from "../src/evals/workspace-intent-compiler.ts";

test("WorkspaceIntent compiler eval runs deterministic golden cases without an LLM", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "sibar-workspace-intent-eval-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runWorkspaceIntentCompilerEval({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-009-workspace-intent-compiler");
    assert.equal(report.generated_at, WORKSPACE_INTENT_COMPILER_EVAL_GENERATED_AT);
    assert.equal(report.report_id, `VAL-EVAL-009-workspace-intent-compiler-${WORKSPACE_INTENT_COMPILER_EVAL_GENERATED_AT}`);
    assert.equal(report.no_llm, true);
    assert.equal(report.aggregate.total_cases, 7);
    assert.equal(report.aggregate.passed_cases, 7);
    assert.equal(report.aggregate.failed_cases, 0);
    assert.equal(report.aggregate.total_mismatches, 0);
    assert.equal(report.aggregate.parse_rejection_cases, 1);
    assert.equal(report.aggregate.schema_rejection_cases, 1);
    assert.equal(report.aggregate.pedagogy_rejection_cases, 1);
    assert.equal(report.aggregate.valid_cases, 4);
    assert.ok(report.cases.every((entry) => entry.observations.model_called === false));

    const parseRejection = report.cases.find((entry) => entry.id === "WI-005-INVALID-JSON");
    assert.equal(parseRejection?.observations.parse_error, "model_output_invalid_or_unclosed_json");
    assert.equal(parseRejection?.observations.parsed_json, false);

    const schemaRejection = report.cases.find((entry) => entry.id === "WI-006-SCHEMA-REJECTION");
    assert.deepEqual(
      schemaRejection?.observations.issue_codes,
      [
        "pedagogy_first_session_empty",
        "schema_first_session_required",
        "schema_first_session_required_fields",
        "schema_required_fields",
        "schema_session_not_object",
        "schema_unknown_fields",
      ],
    );

    const pedagogyRejection = report.cases.find((entry) => entry.id === "WI-007-PEDAGOGY-REJECTION");
    assert.deepEqual(
      pedagogyRejection?.observations.issue_codes,
      [
        "pedagogy_forbidden_mastery_claim",
        "pedagogy_missing_reference",
        "pedagogy_unbounded",
        "pedagogy_unknown_questions",
      ],
    );

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as WorkspaceIntentCompilerEvalReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
