import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import { evaluateFreeformOwnershipAnswer, runSelfhostFreeformEval, isRepeatedAnswer, simulateReevaluation } from "../src/evals/selfhost-freeform.ts";
import type {
  FreeformEvaluationFinding,
  IssueCandidate,
  RepairTaskInfo,
  ReevaluationInfo,
  SelfhostFreeformReport,
} from "../src/evals/selfhost-freeform.ts";

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
    reevaluation_prompt: overrides.reevaluation_prompt ?? "Using the same trace operation, retry with explicit file evidence from src/runtime-concept-graph.ts.",
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
      mismatches: unknown[];
      aggregate: { total_cases: number; mismatch_count?: number };
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

test("freeform evaluator detects duplicate/partial case coverage and fails with mismatch report (VAL-EVAL-008)", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-coverage-"));
  const indexPath = join(tempDir, "coverage-index.json");
  const manifestPath = join(tempDir, "manifest.json");

  const duplicateCasePath = resolve("docs/specs/selfhost/pilot/gold-cases/cases/GC-001-artifact-boundary-correct-grounded.json");

  const indexPayload = {
    cases: [
      {
        id: "GC-001",
        path: duplicateCasePath,
        concept_id: "artifact_boundary",
        answer_class: "correct_grounded",
        mastery_check_id: "SC-001-artifact-boundary",
      },
      {
        id: "GC-001",
        path: duplicateCasePath,
        concept_id: "artifact_boundary",
        answer_class: "correct_grounded",
        mastery_check_id: "SC-001-artifact-boundary",
      },
    ],
  };

  const manifestPayload = {
    included_paths: ["src/"],
    excluded_paths: [],
    artifact_id: "sibar.selfhost.coverage",
  };

  writeFileSync(indexPath, JSON.stringify(indexPayload, null, 2), "utf8");
  writeFileSync(manifestPath, JSON.stringify(manifestPayload, null, 2), "utf8");

  try {
    const report = runSelfhostFreeformEval({
      indexPath,
      manifestPath,
    });

    assert.equal(report.aggregate.mismatch_count > 0, true);
    assert.equal(report.aggregate.total_cases, 1);
    assert.equal(
      hasMismatchWithCode(report, "duplicate_case_id"),
      true,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  function hasMismatchWithCode(value: SelfhostFreeformReport, code: string): boolean {
    return value.mismatches.some((entry) => entry.code === code);
  }
});

test("freeform evaluator enforces manifest boundaries for required repo evidence (VAL-EVAL-001)", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-manifest-"));
  const indexPath = join(tempDir, "index.json");
  const manifestPath = join(tempDir, "manifest.json");

  const casePath = resolve("docs/specs/selfhost/pilot/gold-cases/cases/GC-001-artifact-boundary-correct-grounded.json");
  const indexPayload = {
    cases: [
      {
        id: "GC-001",
        path: casePath,
        concept_id: "artifact_boundary",
        answer_class: "correct_grounded",
        mastery_check_id: "SC-001-artifact-boundary",
      },
    ],
  };

  const manifestPayload = {
    included_paths: ["Tests/"],
    excluded_paths: ["node_modules/"],
    artifact_id: "sibar.selfhost.boundary",
  };

  writeFileSync(indexPath, JSON.stringify(indexPayload, null, 2), "utf8");
  writeFileSync(manifestPath, JSON.stringify(manifestPayload, null, 2), "utf8");

  try {
    const report = runSelfhostFreeformEval({
      indexPath,
      manifestPath,
    });

    assert.equal(report.aggregate.mismatch_count > 0, true);
    assert.ok(report.mismatches.some((entry) => entry.code === "repo_evidence_outside_included_paths"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("eval:selfhost-freeform CLI exits nonzero for observed-vs-expected mismatches (VAL-EVAL-008)", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-mismatch-"));
  const reportPath = join(tempDir, "report.json");
  const casePath = join(tempDir, "GC-001-mutated.json");
  const indexPath = join(tempDir, "index.json");
  const originalCase = JSON.parse(readFileSync(resolve("docs/specs/selfhost/pilot/gold-cases/cases/GC-001-artifact-boundary-correct-grounded.json"), "utf8")) as Record<string, unknown>;

  originalCase.expected_gap_present = true;
  originalCase.expected_gap_type = "evidence_gap";
  originalCase.expected_readiness = "not ready yet";
  originalCase.acceptable_issue_candidate_type = "LearningGap";
  writeFileSync(casePath, JSON.stringify(originalCase, null, 2), "utf8");
  writeFileSync(indexPath, JSON.stringify({ cases: [{ id: "GC-001", path: casePath, concept_id: "artifact_boundary", answer_class: "correct_grounded", mastery_check_id: "SC-001-artifact-boundary" }] }, null, 2), "utf8");

  try {
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types",
      resolve("src/evals/selfhost-freeform.ts"),
      "--index",
      indexPath,
      "--report",
      reportPath,
    ], { encoding: "utf8" });

    assert.notEqual(result.status, 0, "CLI must fail closed for mismatched observed vs expected metadata");
    assert.match(result.stderr || "", /mismatches detected|incomplete/);
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as SelfhostFreeformReport;
    assert.ok(report.mismatches.some((entry) => entry.code === "finding_type_mismatch"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("freeform evaluator rejects invalid expected metadata instead of defaulting (VAL-EVAL-008)", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "sibar-selfhost-freeform-invalid-meta-"));
  const casePath = join(tempDir, "GC-001-invalid-meta.json");
  const indexPath = join(tempDir, "index.json");
  const originalCase = JSON.parse(readFileSync(resolve("docs/specs/selfhost/pilot/gold-cases/cases/GC-001-artifact-boundary-correct-grounded.json"), "utf8")) as Record<string, unknown>;

  originalCase.expected_gap_present = true;
  originalCase.expected_gap_type = "not_a_contract_gap";
  writeFileSync(casePath, JSON.stringify(originalCase, null, 2), "utf8");
  writeFileSync(indexPath, JSON.stringify({ cases: [{ id: "GC-001", path: casePath, concept_id: "artifact_boundary", answer_class: "correct_grounded", mastery_check_id: "SC-001-artifact-boundary" }] }, null, 2), "utf8");

  try {
    const report = runSelfhostFreeformEval({ indexPath });

    assert.equal(report.aggregate.mismatch_count > 0, true);
    assert.ok(report.mismatches.some((entry) => entry.message.includes("invalid_case_expected_gap_type")));
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

// --- VAL-LOOP tests ---

test("VAL-LOOP-001: gap findings emit executable issue candidate objects", () => {
  const report = runSelfhostFreeformEval();
  const gapCases = report.cases.filter((c) => c.observed_finding_type !== "readiness");
  assert.ok(gapCases.length > 0, "must have gap cases");

  for (const gapCase of gapCases) {
    const candidate = gapCase.finding.issue_candidate;
    assert.notEqual(candidate, null, `gap case ${gapCase.case_id} must have issue_candidate`);
    if (candidate) {
      assert.ok(candidate.id.startsWith("IC-"), `issue candidate ${candidate.id} must have IC- prefix`);
      assert.notEqual(candidate.type, "none", `issue candidate type must not be 'none' for gap ${gapCase.case_id}`);
      assert.ok(candidate.title.length > 0, `issue candidate must have title for ${gapCase.case_id}`);
      assert.ok(candidate.evidence.length > 0, `issue candidate must have evidence for ${gapCase.case_id}`);
      assert.ok(candidate.why_it_matters.length > 0, `issue candidate must have why_it_matters for ${gapCase.case_id}`);
      assert.ok(candidate.proposed_action.length > 0, `issue candidate must have proposed_action for ${gapCase.case_id}`);
      assert.equal(candidate.readiness_blocking, true, `issue candidate must block readiness for ${gapCase.case_id}`);
      assert.notEqual(candidate.linked_to_gap, null, `issue candidate must link to gap for ${gapCase.case_id}`);
    }
  }
});

test("VAL-LOOP-002: grounded readiness does not fabricate issue candidates", () => {
  const report = runSelfhostFreeformEval();
  const readinessCases = report.cases.filter((c) => c.observed_finding_type === "readiness");
  assert.ok(readinessCases.length > 0, "must have readiness cases");

  for (const readyCase of readinessCases) {
    assert.equal(readyCase.finding.issue_candidate, null,
      `readiness case ${readyCase.case_id} must not have issue candidate`);
    assert.equal(readyCase.issue_candidate_id, null,
      `readiness case ${readyCase.case_id} must not have issue_candidate_id`);
    assert.equal(readyCase.finding.issue_candidate_type, "none",
      `readiness case ${readyCase.case_id} must have issue_candidate_type 'none'`);
  }

  // Also verify aggregate: readiness answers with no candidates
  assert.ok(report.loop_summary.readiness_answers_with_no_candidates >= readinessCases.length);
});

test("VAL-LOOP-003: issue candidate type follows evidence", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "The prompt and the graph output language are overloaded, so I treated concept labels as enough and skipped the explicit evidence-to-relation mapping because the terminology is confusing.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.finding_type, "design_induced_gap");
  assert.notEqual(finding.issue_candidate, null);
  assert.equal(finding.issue_candidate?.type, "DesignIssue");

  // Learning gaps get LearningGap type
  const evidenceGapFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "Boundary checks are based on manifest paths and the rest of the repository is out of scope.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(evidenceGapFinding.finding_type, "evidence_gap");
  assert.notEqual(evidenceGapFinding.issue_candidate, null);
  assert.equal(evidenceGapFinding.issue_candidate?.type, "LearningGap");

  const docsFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "I missed the citation because the documentation is unclear and does not say which file evidence to use for the trace operation.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.notEqual(docsFinding.issue_candidate, null);
  assert.ok(
    docsFinding.issue_candidates.some((candidate) => candidate.type === "DocsIssue"),
    "documentation evidence must emit a DocsIssue candidate",
  );

  const mixedFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "I skipped citations in my answer, and the product UI plus documentation hide which repo evidence file to use for this trace.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  const mixedTypes = mixedFinding.issue_candidates.map((candidate) => candidate.type);
  assert.ok(mixedTypes.includes("LearningGap"), "mixed learner evidence must emit LearningGap");
  assert.ok(mixedTypes.includes("ProductIssue"), "mixed product evidence must emit ProductIssue");
  assert.ok(mixedTypes.includes("DocsIssue"), "mixed docs evidence must emit DocsIssue");
  assert.ok(mixedTypes.length >= 3, "mixed evidence must produce multiple issue candidates");

  // Readiness gets none
  const readinessFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "I would trace boundary control in `sibar.selfhost.manifest.json` and `src/runtime-concept-graph.ts`, citing `src/runtime-support.ts` as included path evidence.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });
  assert.equal(readinessFinding.finding_type, "readiness");
  assert.equal(readinessFinding.issue_candidate, null);
  assert.equal(readinessFinding.issue_candidate_type, "none");
});

test("VAL-LOOP-005: loop fails closed when re-evaluation does not preserve operation", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({
      operation: "trace",
      reevaluation_prompt: "Using repo evidence from src/runtime-concept-graph.ts, explain boundary behavior in a nearby scenario.",
    }),
    user_answer: "Boundary checks are based on manifest paths but I do not cite concrete files.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.reevaluation_info?.preserves_operation, false);
  assert.equal(finding.loop_status, "incomplete_loop");
  assert.match(finding.loop_error ?? "", /does not preserve the original operation/);
  assert.equal(finding.readiness, "not ready yet");
});

test("VAL-LOOP-005: loop fails closed when re-evaluation does not use required evidence", () => {
  const finding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({
      operation: "trace",
      reevaluation_prompt: "Using the same trace operation, retry this nearby scenario in your own words.",
    }),
    user_answer: "Boundary checks are based on manifest paths but I do not cite concrete files.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(finding.reevaluation_info?.uses_required_evidence, false);
  assert.equal(finding.loop_status, "incomplete_loop");
  assert.match(finding.loop_error ?? "", /does not use required repo evidence/);
  assert.equal(finding.readiness, "not ready yet");
});

test("VAL-LOOP-004: repair tasks are narrow and evidence-producing", () => {
  const report = runSelfhostFreeformEval();
  const gapCases = report.cases.filter((c) => c.observed_finding_type !== "readiness");

  for (const gapCase of gapCases) {
    const repairInfo = gapCase.finding.repair_task_info;
    assert.notEqual(repairInfo, null, `gap case ${gapCase.case_id} must have repair_task_info`);

    if (repairInfo) {
      // Repair task must be non-generic
      assert.equal(repairInfo.generic, false, `repair task for ${gapCase.case_id} must not be generic`);
      assert.equal(repairInfo.evidence_producing, true, `repair task for ${gapCase.case_id} must be evidence-producing`);
      assert.ok(repairInfo.description.length >= 20, `repair task description for ${gapCase.case_id} must be substantive (>= 20 chars)`);
      assert.ok(repairInfo.required_evidence.length > 0, `repair task for ${gapCase.case_id} must have required evidence`);
    }
  }

  // Negative test: generic answer is detected by the evaluator
  const genericFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "review docs",
    declared_confidence: "low",
    bounded_repo_evidence: validRepoEvidence(),
  });
  // This is a generic answer → surface_gap, the repair task info should not be generic
  // The repair task for surface_gap is substantive
  if (genericFinding.repair_task_info) {
    assert.equal(genericFinding.repair_task_info.generic, false,
      "repair task for surface_gap must not be generic in standard evaluator");
  }
});

test("VAL-LOOP-005: re-evaluation prompt is nearby but not repeated", () => {
  const report = runSelfhostFreeformEval();
  const gapCases = report.cases.filter((c) => c.observed_finding_type !== "readiness");

  for (const gapCase of gapCases) {
    const reevalInfo = gapCase.finding.reevaluation_info;
    assert.notEqual(reevalInfo, null, `gap case ${gapCase.case_id} must have reevaluation_info`);

    if (reevalInfo) {
      assert.equal(reevalInfo.is_repeat_of_original, false,
        `re-evaluation for ${gapCase.case_id} must not repeat original prompt verbatim`);
      assert.ok(reevalInfo.prompt.length > 0, `re-evaluation for ${gapCase.case_id} must have non-empty prompt`);
      // The preserves_operation and uses_required_evidence are best-effort but reported
    }
  }

  // Check that readiness cases have null reevaluation_info
  const readinessCases = report.cases.filter((c) => c.observed_finding_type === "readiness");
  for (const readyCase of readinessCases) {
    assert.equal(readyCase.finding.reevaluation_info, null,
      `readiness case ${readyCase.case_id} must not have reevaluation_info`);
  }
});

test("VAL-LOOP-006: repeated failed answers do not count as repaired understanding", () => {
  // Test isRepeatedAnswer function
  const originalAnswer = "Boundary checks are based on manifest paths and should include src and Tests.";
  const repeatedAnswer = "Boundary checks are based on manifest paths and should include src and Tests."; // verbatim repeat
  const similarAnswer = "Boundary checks rely on manifest paths and include src and Tests folders.";
  const differentAnswer = "I would trace boundary control in sibar.selfhost.manifest.json, citing src/runtime-concept-graph.ts for include logic and noting that Tests/ is within the manifest included_paths.";

  assert.equal(isRepeatedAnswer(originalAnswer, repeatedAnswer), true,
    "verbatim repeat must be detected");
  assert.equal(isRepeatedAnswer(originalAnswer, similarAnswer), true,
    "very similar answer must be detected as repeat");
  assert.equal(isRepeatedAnswer(originalAnswer, differentAnswer), false,
    "substantially different answer must not be detected as repeat");

  // Test simulateReevaluation with repeated answer
  const gapFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: originalAnswer,
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });
  assert.equal(gapFinding.gap_present, true, "must have gap");

  const repeatedResult = simulateReevaluation(gapFinding, repeatedAnswer, "high");
  assert.equal(repeatedResult.gap_repaired, false, "repeated answer must not repair gap");
  assert.equal(repeatedResult.repeated_answer, true, "must detect repeat");
  assert.equal(repeatedResult.updated_readiness, "not ready yet", "readiness must be not ready yet");

  // Test simulateReevaluation with proper new answer
  const properResult = simulateReevaluation(gapFinding, differentAnswer, "high");
  assert.equal(properResult.gap_repaired, true, "proper new answer must repair gap");
  assert.equal(properResult.repeated_answer, false, "must not detect repeat");
  assert.notEqual(properResult.updated_readiness, "not ready yet", "readiness must advance");
  const boundedLabels = ["ready to inspect", "ready to explain", "ready to modify with guardrails", "ready to own", "not ready yet"];
  assert.ok(boundedLabels.includes(properResult.updated_readiness), "readiness must be bounded label");
});

test("VAL-LOOP-007: end-to-end repair loop is executable in report", () => {
  const report = runSelfhostFreeformEval();
  const gapCases = report.cases.filter((c) => c.observed_finding_type !== "readiness");

  for (const gapCase of gapCases) {
    // Each gap must have: issue_candidate, repair_task_info, reevaluation_info, and loop_status
    assert.notEqual(gapCase.finding.issue_candidate, null,
      `gap case ${gapCase.case_id} must have issue_candidate`);
    assert.notEqual(gapCase.finding.repair_task_info, null,
      `gap case ${gapCase.case_id} must have repair_task_info`);
    assert.notEqual(gapCase.finding.reevaluation_info, null,
      `gap case ${gapCase.case_id} must have reevaluation_info`);

    // Loop status must be "reevaluation_prompted" (full loop) or "incomplete_loop" (fail closed)
    assert.ok(
      gapCase.loop_status === "reevaluation_prompted" || gapCase.loop_status === "incomplete_loop",
      `gap case ${gapCase.case_id} loop_status '${gapCase.loop_status}' must be 'reevaluation_prompted' or 'incomplete_loop'`
    );

    if (gapCase.loop_status === "incomplete_loop") {
      assert.notEqual(gapCase.loop_error, null, `incomplete loop ${gapCase.case_id} must have loop_error`);
    }
  }

  // Check loop_summary in report
  assert.ok(report.loop_summary.gaps_with_full_loop > 0, "must have gaps with full loop");
  assert.equal(report.loop_summary.gaps_failed_closed, report.loop_summary.loop_incomplete_cases.length,
    "failed closed count must match incomplete cases array");
  assert.equal(report.aggregate.full_loop_cases, report.loop_summary.gaps_with_full_loop,
    "aggregate full_loop_cases must match loop_summary");
  assert.equal(report.aggregate.issue_candidate_cases, gapCases.length,
    "all gap cases must have issue candidates");
});

test("VAL-LOOP-008: readiness remains blocked until re-evaluation succeeds", () => {
  // Create a gap finding
  const gapFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture(),
    user_answer: "Boundary checks are based on manifest paths and should include src and Tests.",
    declared_confidence: "high",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(gapFinding.gap_present, true);
  assert.equal(gapFinding.readiness, "not ready yet");

  // Having repair task alone does not change readiness
  assert.notEqual(gapFinding.repair_task, null, "must have repair task");
  assert.equal(gapFinding.readiness, "not ready yet",
    "readiness must remain 'not ready yet' even with repair task present");

  // Failed re-evaluation does not advance readiness
  const failedReeval = simulateReevaluation(gapFinding, "I am not sure about the boundary checks.", "low");
  assert.equal(failedReeval.gap_repaired, false);
  assert.equal(failedReeval.updated_readiness, "not ready yet");

  // Successful re-evaluation advances readiness
  const successReeval = simulateReevaluation(
    gapFinding,
    "I would trace boundary in src/runtime-concept-graph.ts where included_paths are filtered against the manifest, and verify that Tests/concept-graph.test.ts confirms excluded paths are rejected.",
    "high",
  );
  assert.equal(successReeval.gap_repaired, true);
  assert.notEqual(successReeval.updated_readiness, "not ready yet");
});

test("VAL-LOOP-009: successful re-evaluation updates readiness but remains bounded", () => {
  const gapFinding = evaluateFreeformOwnershipAnswer({
    masteryCheck: masteryCheckFixture({
      forbidden_claims: [
        "Claiming full repo ownership from one boundary trace.",
        "Treating excluded paths as legitimate evidence in the same answer.",
      ],
    }),
    user_answer: "Boundary checks start from manifest included_paths but I cannot fully confirm the excluded-path behavior.",
    declared_confidence: "medium",
    bounded_repo_evidence: validRepoEvidence(),
  });

  assert.equal(gapFinding.gap_present, true);

  const result = simulateReevaluation(
    gapFinding,
    "I would trace boundary control using src/runtime-concept-graph.ts and sibar.selfhost.manifest.json, citing included paths and rejecting excluded-path claims. Readiness is bounded to the traced evidence only.",
    "high",
  );

  assert.equal(result.gap_repaired, true);
  // Successful re-evaluation must not claim durable ownership
  assert.notEqual(result.updated_readiness, "ready to own",
    "re-evaluation must not advance to 'ready to own' from one answer");
  assert.notEqual(result.updated_readiness, "not ready yet",
    "successful re-evaluation must advance readiness");

  const boundedLabels = ["ready to inspect", "ready to explain", "ready to modify with guardrails"];
  assert.ok(boundedLabels.includes(result.updated_readiness),
    `re-evaluation readiness '${result.updated_readiness}' must be a bounded label`);
});

test("VAL-LOOP-010: missing loop artifacts fail closed", () => {
  // Test that findings with missing artifacts have incomplete_loop status
  const report = runSelfhostFreeformEval();

  // Check all readiness cases have loop_status "not_applicable"
  for (const c of report.cases.filter((c) => c.observed_finding_type === "readiness")) {
    assert.equal(c.loop_status, "not_applicable",
      `readiness case ${c.case_id} must have loop_status 'not_applicable'`);
  }

  // Check all gap cases have either "reevaluation_prompted" or "incomplete_loop"
  for (const c of report.cases.filter((c) => c.observed_finding_type !== "readiness")) {
    assert.ok(
      c.loop_status === "reevaluation_prompted" || c.loop_status === "incomplete_loop",
      `gap case ${c.case_id} loop_status '${c.loop_status}' must be 'reevaluation_prompted' or 'incomplete_loop'`
    );
    if (c.loop_status === "incomplete_loop") {
      assert.notEqual(c.loop_error, null, `incomplete case ${c.case_id} must have loop_error`);
      assert.match(c.loop_error!, /incomplete loop/i,
        `loop_error for ${c.case_id} must mention 'incomplete loop'`);
    }
  }

  // Also verify that the report exposes structured contract fields for inspection (VAL-EVAL-007)
  assert.ok(report.loop_summary !== undefined, "report must have loop_summary");
  assert.ok(report.aggregate.issue_candidate_cases !== undefined, "aggregate must have issue_candidate_cases");
  assert.ok(report.aggregate.full_loop_cases !== undefined, "aggregate must have full_loop_cases");
  assert.ok(report.aggregate.incomplete_loop_cases !== undefined, "aggregate must have incomplete_loop_cases");

  // Check that at least some cases have the loop fields exposed
  const sampleGapCase = report.cases.find((c) => c.observed_finding_type !== "readiness");
  assert.ok(sampleGapCase, "must have at least one gap case for inspection");
  assert.notEqual(sampleGapCase?.finding.issue_candidate, undefined,
    "finding must expose issue_candidate field");
  assert.notEqual(sampleGapCase?.finding.repair_task_info, undefined,
    "finding must expose repair_task_info field");
  assert.notEqual(sampleGapCase?.finding.reevaluation_info, undefined,
    "finding must expose reevaluation_info field");
  assert.notEqual(sampleGapCase?.finding.loop_status, undefined,
    "finding must expose loop_status field");
});
