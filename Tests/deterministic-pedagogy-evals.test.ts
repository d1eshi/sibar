import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  runDeterministicPedagogyEvals,
  type DeterministicPedagogyEvalReport,
} from "../engine/evals/deterministic-pedagogy.ts";
import { materializeFixture } from "../engine/evals/deterministic-pedagogy/fixtures.ts";
import type { EvalCase } from "../engine/evals/deterministic-pedagogy/types.ts";

test("deterministic pedagogy eval runner loads the E01 dataset and writes explicit results", () => {
  const outputDir = mkdtempSync(join(resolve("."), ".sibi-eval-tmp-report-"));
  const reportPath = join(outputDir, "report.json");

  try {
    const report = runDeterministicPedagogyEvals({ reportPath });

    assert.equal(report.validation, "VAL-EVAL-002");
    assert.match(report.dataset.index_path, /evals\/pedagogy-layers\/dataset\/index\.json$/);
    assert.equal(report.no_llm, true);
    assert.equal(report.aggregate.total_cases, 7);
    assert.equal(report.aggregate.passed_cases, 7);
    assert.equal(report.aggregate.failed_cases, 0);
    assert.equal(report.aggregate.total_mismatches, 0);
    assert.equal(report.cases.length, 7);
    assert.equal(report.aggregate.gap_cases, 6);
    assert.equal(report.aggregate.challenge_cases, 6);
    assert.equal(report.aggregate.readiness_cases_with_evidence, 7);
    assert.ok(report.cases.every((entry) => Array.isArray(entry.mismatches)));
    assert.ok(report.cases.every((entry) => entry.passed));
    assert.ok(report.cases.every((entry) => entry.observations.model_called === false));
    assert.ok(existsSync(reportPath));

    const partial = report.cases.find((entry) => entry.id === "E01-PARTIAL-L2-GAP");
    assert.equal(partial?.observations.classified_layer, 2);
    assert.equal(partial?.observations.learning_gap?.observed_layer, 2);
    assert.equal(partial?.observations.challenge?.challenge_type, "trace_path_across_files");

    const boundary = report.cases.find((entry) => entry.id === "E01-BOUNDARY-VIOLATION-L4");
    assert.deepEqual(boundary?.observations.boundary.rejected_paths, ["docs/private-notes.md", "tmp/outside-observation.md"]);
    assert.ok(boundary?.observations.boundary.rejection_reasons.every((reason) => reason === "excluded_path"));
    assert.equal(boundary?.observations.learning_gap?.severity, "critical");

    const llmFixture = report.cases.find((entry) => entry.id === "E01-LLM-OVERCONFIDENT-L5");
    assert.equal(llmFixture?.observations.classified_layer, 5);
    assert.equal(llmFixture?.observations.learning_gap?.observed_layer, 1);
    assert.deepEqual(llmFixture?.observations.boundary.rejected_paths, ["docs/private-notes.md", "<missing citation>"]);
    assert.equal(llmFixture?.observations.challenge?.challenge_type, "risk_analysis");

    const persisted = JSON.parse(readFileSync(reportPath, "utf8")) as DeterministicPedagogyEvalReport;
    assert.deepEqual(persisted.aggregate, report.aggregate);
    assert.equal(persisted.cases[0].observations.model_called, false);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});

test("fixture materialization does not write escaped forbidden paths outside the temp root", () => {
  const escapedPath = `../escaped-fixture-probe-${randomUUID()}/secrets.md`;
  const testCase = {
    id: "E02-ESCAPED-FIXTURE-PATH",
    title: "Escaped fixture path is not materialized",
    case_class: "boundary_violation",
    artifact_boundary: {
      root: "fixtures/sibi-runtime-mini",
      included_paths: ["src/runtime.ts"],
      excluded_paths: [escapedPath],
    },
    learning_goal: "Keep escaped fixture paths outside materialization.",
    concept_under_test: { id: "artifact-boundary", label: "Artifact boundary", layer_target: 4 },
    user_answer: { kind: "answer", text: "Boundary answer.", declared_confidence: "medium" },
    llm_fixture_response: null,
    expected_layer: { level: 4, label: "Applied Reasoning", rationale: "Fixture-only regression." },
    expected_gap: null,
    expected_misconception: null,
    expected_challenge: { should_create: false },
    expected_readiness: { claim: "ready to explain", confidence: "medium", must_cite_evidence: true },
    required_evidence: [{ path: "src/runtime.ts", range: "fixture", expectation: "inside root" }],
    forbidden_evidence: [{ path: escapedPath, reason: "Outside the declared artifact root." }],
    boundary_expectations: {
      accepted_evidence_must_be_inside_boundary: true,
      reject_forbidden_evidence: true,
      expected_rejection_reason: "outside_artifact_boundary",
    },
    gap_readiness_expectations: {
      create_gap: false,
      create_challenge: false,
      persist_declared_uncertainty: false,
      allowed_readiness_claims: ["ready to explain"],
      disallowed_readiness_claims: [],
    },
  } satisfies EvalCase;

  const fixture = materializeFixture(testCase);
  try {
    assert.ok(existsSync(resolve(fixture.root, "src/runtime.ts")));
    assert.equal(existsSync(resolve(fixture.root, escapedPath)), false);
    assert.equal(existsSync(resolve(fixture.cleanupRoot, escapedPath.slice("../".length))), false);
  } finally {
    rmSync(fixture.cleanupRoot, { recursive: true, force: true });
  }
});
