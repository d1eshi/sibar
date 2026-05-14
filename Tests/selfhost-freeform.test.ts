import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import { evaluateFreeformOwnershipAnswer, runSelfhostFreeformEval } from "../src/evals/selfhost-freeform.ts";

function masteryCheckFixture(overrides: Partial<{
  id: string;
  concept_id: string;
  operation: string;
  prompt: string;
  minimum_readiness: string;
  reevaluation_prompt: string;
  forbidden_claims: string[];
}> = {}) {
  return {
    id: overrides.id ?? "SC-001-artifact-boundary",
    concept_id: overrides.concept_id ?? "artifact_boundary",
    operation: overrides.operation ?? "trace",
    prompt: overrides.prompt ?? "Trace boundary behavior.",
    required_repo_evidence: [{ path: "src/runtime-concept-graph.ts", rationale: "Boundary logic." }],
    minimum_readiness: overrides.minimum_readiness ?? "ready to inspect",
    reevaluation_prompt: overrides.reevaluation_prompt ?? "Retry with explicit citations.",
    forbidden_claims: overrides.forbidden_claims ?? [
      "Claiming full repo ownership from one boundary trace.",
      "Treating excluded paths as legitimate evidence in the same answer.",
    ],
  };
}

function validRepoEvidence() {
  return [{
    path: "src/runtime-concept-graph.ts",
    rationale: "Boundary logic.",
    excerpt: "export function buildConceptGraph",
    exists: true,
  }];
}

test("self-hosted freeform evaluator processes all 40 pilot gold cases", () => {
  const report = runSelfhostFreeformEval();

  assert.equal(report.validation, "VAL-EVAL-008-selfhost-freeform");
  assert.equal(report.aggregate.total_cases, 40);
  assert.equal(report.aggregate.errored_cases, 0);
  assert.ok(report.aggregate.readiness_cases > 0, "should have readiness cases");
  assert.ok(report.aggregate.gap_cases > 0, "should have gap cases");
  assert.ok(report.cases.every((entry) => entry.user_evidence_attached), "all cases must have user evidence");
  assert.ok(report.cases.every((entry) => entry.repo_evidence_attached), "all cases must have repo evidence");
});

test("freeform evaluator detects correct_grounded with citations as readiness (GC-001, GC-009)", () => {
  const report = runSelfhostFreeformEval();
  // GC-001 cites paths explicitly → readiness
  const gc001 = report.cases.find((entry) => entry.case_id === "GC-001");
  assert.ok(gc001, "GC-001 must exist");
  assert.equal(gc001.observed_finding_type, "readiness");
  assert.equal(gc001.finding.gap_present, false);

  // GC-009 cites paths with backticks → readiness
  const gc009 = report.cases.find((entry) => entry.case_id === "GC-009");
  assert.ok(gc009, "GC-009 must exist");
  assert.equal(gc009.observed_finding_type, "readiness");
});

test("freeform evaluator detects evidence_gap for uncited answers (GC-002)", () => {
  const report = runSelfhostFreeformEval();
  const gc002 = report.cases.find((entry) => entry.case_id === "GC-002");
  assert.ok(gc002, "GC-002 must exist");
  assert.equal(gc002.observed_finding_type, "evidence_gap");
  assert.equal(gc002.finding.gap_present, true);
});

test("freeform evaluator detects design_induced_gap (GC-008)", () => {
  const report = runSelfhostFreeformEval();
  const gc008 = report.cases.find((entry) => entry.case_id === "GC-008");
  assert.ok(gc008, "GC-008 must exist");
  assert.equal(gc008.observed_finding_type, "design_induced_gap");
  assert.equal(gc008.observed_issue_candidate_type, "DesignIssue");
});

test("freeform evaluator detects boundary or false_confidence gap for overconfident boundary violation (GC-006)", () => {
  const report = runSelfhostFreeformEval();
  const gc006 = report.cases.find((entry) => entry.case_id === "GC-006");
  assert.ok(gc006, "GC-006 must exist");
  // GC-006 triggers forbidden claims about excluded paths → boundary_gap or false_confidence_gap
  assert.ok(
    gc006.observed_finding_type === "boundary_gap" || gc006.observed_finding_type === "false_confidence_gap",
    `GC-006 observed ${gc006.observed_finding_type}, expected boundary or false confidence gap`
  );
  assert.equal(gc006.finding.gap_present, true);
});

test("freeform evaluator detects surface_gap for declared uncertainty (GC-007)", () => {
  const report = runSelfhostFreeformEval();
  const gc007 = report.cases.find((entry) => entry.case_id === "GC-007");
  assert.ok(gc007, "GC-007 must exist");
  assert.equal(gc007.observed_finding_type, "surface_gap");
});

test("freeform evaluator does not use answer_class as evaluator authority (VAL-EVAL-002)", () => {
  // Even without answer_class, the evaluator derives finding from user answer + evidence
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "Boundary checks start from manifest included_paths and walk through src/runtime-concept-graph.ts to filter what is in scope, then cite evidence from within the boundary.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "readiness");
  assert.equal(finding.user_evidence_attached, true);
  assert.equal(finding.repo_evidence_attached, true);
});

test("freeform evaluator classifies uncited answer as evidence_gap without answer_class", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "Boundary checks are based on manifest paths and the rest of the repository is out of scope.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "evidence_gap");
  assert.equal(finding.user_evidence_attached, true);
  assert.equal(finding.repo_evidence_attached, true);
});

test("freeform evaluator rejects gaps that lack user evidence (VAL-EVAL-003)", () => {
  assert.throws(() => evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "",
    declared_confidence: "low",
    bounded_repo_evidence: validRepoEvidence(),
  }), /invalid_finding_without_user/);
});

test("freeform evaluator rejects gaps that lack repo evidence (VAL-EVAL-003)", () => {
  assert.throws(() => evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "Boundary checks are based on manifest paths.",
    declared_confidence: "medium",
    bounded_repo_evidence: [],
  }), /invalid_finding_without_repo_evidence/);
});

test("freeform evaluator rejects readiness without evidence (VAL-EVAL-003)", () => {
  assert.throws(() => evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "",
    declared_confidence: "high",
    bounded_repo_evidence: [],
  }), /invalid_finding_without_user_and_repo_evidence/);
});

test("freeform evaluator detects forbidden claims and rejects readiness (VAL-EVAL-010)", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({
      forbidden_claims: [
        "Claiming full repo ownership from one boundary trace.",
        "Treating excluded paths as legitimate evidence in the same answer.",
        "Claiming high-confidence wrong answers are acceptable.",
      ],
    }),
    user_answer: "I claim full repo ownership from one boundary trace because I understand how included_paths work and can assert complete understanding.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.notEqual(finding.finding_type, "readiness", "forbidden claim must prevent readiness");
  assert.equal(finding.forbidden_claim_triggered, true);
  assert.equal(finding.gap_present, true);
});

test("freeform evaluator detects generic answers (VAL-EVAL-006)", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "It works.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.generic_answer_detected, true);
  assert.notEqual(finding.finding_type, "readiness", "generic answer must not produce readiness");
});

test("freeform evaluator enforces bounded readiness labels (VAL-EVAL-010)", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({
      minimum_readiness: "ready to explain",
    }),
    user_answer: "I would trace boundary control in sibar.selfhost.manifest.json and src/runtime-concept-graph.ts, citing src/runtime-support.ts as an included path.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "readiness");
  const validLabels = ["ready to inspect", "ready to explain", "ready to modify with guardrails", "ready to own", "not ready yet"];
  assert.ok(validLabels.includes(finding.readiness), `readiness label '${finding.readiness}' must be a bounded label`);
});

test("freeform evaluator correctly classifies wrong responsibility answers (VAL-EVAL-006)", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({ concept_id: "concept_graph_generation", operation: "explain" }),
    user_answer: "Readiness generation is responsible for node and edge construction, so concept graph only needs names and then calls are inferred later.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "responsibility_gap");
  assert.equal(finding.gap_present, true);
});

test("freeform evaluator correctly classifies wrong flow answers", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "The flow is to read excluded paths first, then remove tests, and finally include everything in src because the graph builder always needs all commands.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "flow_gap");
});

test("freeform evaluator correctly classifies surface gap for declared uncertainty", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "I am not fully sure how manifest includes and excludes combine before graph construction, so I cannot give a full boundary walk yet.",
    declared_confidence: "low",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "surface_gap");
});

test("freeform evaluator correctly classifies boundary or false-confidence gap for scope violations", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "All files under the repo root are valid evidence for any claim, and excluded paths can still be cited as authoritative.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  // High confidence + boundary-violating forbidden claim → false_confidence_gap or boundary_gap
  assert.ok(
    finding.finding_type === "boundary_gap" || finding.finding_type === "false_confidence_gap",
    `Expected boundary or false confidence gap, got ${finding.finding_type}`
  );
  assert.equal(finding.gap_present, true);
});

test("freeform evaluator correctly classifies design induced confusion", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "The prompt and the graph output language are overloaded, so I treated concept labels as enough and skipped the explicit evidence-to-relation mapping because the terminology is confusing.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "design_induced_gap");
});

test("freeform evaluator correctly classifies false confidence with high certainty and wrong claims", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({
      concept_id: "gap_detection",
      operation: "debug",
      forbidden_claims: [
        "Claiming high-confidence wrong answers are acceptable.",
        "Ignoring content correctness checks for false confidence.",
      ],
    }),
    user_answer: "I am absolutely sure that wrong answers with gap_confirmed quality are still confirmed if they sound syntactically correct, and I have no doubt about this.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "false_confidence_gap");
});

test("gap label coverage reports all 10 contract labels (VAL-EVAL-005)", () => {
  const report = runSelfhostFreeformEval();

  assert.equal(report.gap_label_coverage.length, 10);
  const allLabels = [
    "surface_gap", "flow_gap", "boundary_gap", "responsibility_gap",
    "evidence_gap", "causal_gap", "test_oracle_gap", "product_gap",
    "false_confidence_gap", "design_induced_gap",
  ];
  for (const label of allLabels) {
    const entry = report.gap_label_coverage.find((e) => e.label === label);
    assert.ok(entry, `gap label '${label}' must be in coverage report`);
    // Each label is either represented (has case_count > 0) or explicitly listed
  }
});

test("eval:selfhost-freeform CLI processes 40 cases and writes report", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-cli-"));
  const reportPath = join(tempDir, "report.json");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-freeform.ts"),
      "--report",
      reportPath,
    ], { encoding: "utf8" });

    // CLI should exit 0 when all 40 cases processed (mismatches are informational)
    assert.equal(result.status, 0, result.stderr || "CLI should exit 0 for complete run");
    const aggregate = JSON.parse(result.stdout || "{}") as { total_cases: number; errored_cases: number };
    assert.equal(aggregate.total_cases, 40);
    assert.equal(aggregate.errored_cases, 0);

    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      cases: unknown[];
      gap_label_coverage: unknown[];
      aggregate: { total_cases: number };
    };
    assert.equal(report.cases.length, 40);
    assert.equal(report.aggregate.total_cases, 40);
    assert.equal(report.gap_label_coverage.length, 10);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("eval:selfhost-freeform CLI fails closed on incomplete runs (VAL-EVAL-008)", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-failclosed-"));
  const indexPath = join(tempDir, "empty-index.json");
  writeFileSync(indexPath, JSON.stringify({ cases: [] }), "utf8");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-freeform.ts"),
      "--index",
      indexPath,
    ], { encoding: "utf8" });

    assert.notEqual(result.status, 0, "CLI must exit nonzero for zero cases");
    assert.match(result.stderr || "", /zero cases|incomplete/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("freeform evaluator attaches read-only answer_class metadata (answer_class is read but not used)", () => {
  // The answer_class is present in report but does not influence the finding
  const report = runSelfhostFreeformEval();
  const gc001 = report.cases.find((entry) => entry.case_id === "GC-001");
  assert.ok(gc001, "GC-001 must exist");
  assert.equal(gc001.answer_class, "correct_grounded");
  // Finding is derived from answer + evidence, not from answer_class
  // GC-001 has proper citations → readiness
  assert.equal(gc001.observed_finding_type, "readiness");
});

test("freeform evaluator emits repair_task for gap cases and null for readiness", () => {
  const report = runSelfhostFreeformEval();
  for (const caseResult of report.cases) {
    if (caseResult.observed_finding_type === "readiness") {
      assert.equal(caseResult.finding.repair_task, null, `readiness case ${caseResult.case_id} must not have repair task`);
    } else {
      assert.notEqual(caseResult.finding.repair_task, null, `gap case ${caseResult.case_id} must have repair task`);
    }
  }
});

test("freeform evaluator emits reevaluation_prompt for gap cases and null for readiness", () => {
  const report = runSelfhostFreeformEval();
  for (const caseResult of report.cases) {
    if (caseResult.observed_finding_type === "readiness") {
      assert.equal(caseResult.finding.reevaluation_prompt, null, `readiness case ${caseResult.case_id} must not have reevaluation prompt`);
    } else {
      assert.notEqual(caseResult.finding.reevaluation_prompt, null, `gap case ${caseResult.case_id} must have reevaluation prompt`);
    }
  }
});

test("freeform evaluator findings have substantive user evidence and repo evidence (VAL-EVAL-009)", () => {
  const report = runSelfhostFreeformEval();
  for (const caseResult of report.cases) {
    assert.ok(caseResult.finding.user_evidence_excerpt.length > 0,
      `case ${caseResult.case_id} must have non-empty user evidence excerpt`);
    assert.ok(caseResult.finding.repo_evidence_citations.length > 0,
      `case ${caseResult.case_id} must have repo evidence citations`);
    for (const citation of caseResult.finding.repo_evidence_citations) {
      assert.ok(citation.exists, `case ${caseResult.case_id} repo evidence must exist: ${citation.path}`);
      assert.ok(citation.excerpt.length > 0, `case ${caseResult.case_id} repo evidence must have excerpt: ${citation.path}`);
      assert.ok(citation.rationale.length > 0, `case ${caseResult.case_id} repo evidence must have rationale: ${citation.path}`);
    }
  }
});
