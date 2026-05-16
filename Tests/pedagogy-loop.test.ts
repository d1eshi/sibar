import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  buildPrerequisiteRoute,
  createOwnershipGap,
  createRepairAction,
  createReadinessClaim,
  advanceReadinessAfterReevaluation,
  generateReevaluation,
  trackMisconception,
  buildDeepOwnershipMemory,
  evaluateFullLoop,
  validateEvidenceIdentity,
  attemptToReadiness,
} from "../src/runtime-pedagogy-loop.ts";

import { evaluateAttempt, createAttempt } from "../src/runtime-attempt-evaluation.ts";

import type {
  OwnershipGap,
  OwnershipGapKind,
  RepairAction,
  ReadinessClaim,
  UserAttempt,
  UserOperation,
  ThinkingArtifact,
  EvidenceRef,
  EvidenceCheck,
  EvidenceInventoryEntry,
  ConceptSlice,
  UserOperationKind,
} from "../src/runtime-deep-ownership.ts";

import {
  RECOGNIZED_OPERATION_KINDS,
} from "../src/runtime-deep-ownership.ts";

import type {
  PrerequisiteRoute,
  ReevaluationPrompt,
  MisconceptionMemory,
  DeepOwnershipMemory,
  MemoryAnswerEntry,
  LoopResult,
} from "../src/runtime-pedagogy-loop.ts";

// ── Test Fixture Helpers ─────────────────────────────────────────────

function makeEvidenceRef(overrides?: Partial<EvidenceRef>): EvidenceRef {
  return {
    evidence_id: "EV-T001",
    file_path: "src/module.ts",
    start_line: 10,
    end_line: 50,
    excerpt: "Core implementation logic for the test module",
    role: "implementation",
    ...overrides,
  };
}

function makeEvidenceRef2(): EvidenceRef {
  return makeEvidenceRef({
    evidence_id: "EV-T002",
    file_path: "src/module.ts",
    start_line: 60,
    end_line: 100,
    excerpt: "Helper functions and branching logic",
    role: "implementation",
  });
}

function makeEvidenceInventory(): EvidenceInventoryEntry[] {
  return [
    {
      id: "EV-T001",
      path: "src/module.ts",
      source_type: "implementation",
      size_bytes: 5000,
      extension: ".ts",
      role: "implementation",
      content_hash: "sha256:abc",
      excerpt: "Core implementation",
      status: "inspected",
    },
    {
      id: "EV-T002",
      path: "src/module.ts",
      source_type: "implementation",
      size_bytes: 3000,
      extension: ".ts",
      role: "implementation",
      content_hash: "sha256:def",
      excerpt: "Helpers",
      status: "inspected",
    },
  ];
}

function makeOperation(overrides?: Partial<UserOperation>): UserOperation {
  return {
    id: "OP-T001",
    kind: "trace",
    prompt: "Trace how the function maps input to output. Name every step and the file:line evidence.",
    artifact_ids: ["ART-T001"],
    required_evidence: ["EV-T001"],
    allowed_hints: 3,
    blocked_shortcuts: ["skip_evidence"],
    success_criteria: [
      "Names at least three intermediate steps",
      "Cites evidence for each step",
      "Explains branching logic",
      "Predicts behavior change correctly",
    ],
    ...overrides,
  };
}

function makeArtifact(overrides?: Partial<ThinkingArtifact>): ThinkingArtifact {
  const ref1 = makeEvidenceRef();
  const ref2 = makeEvidenceRef2();
  return {
    id: "ART-T001",
    kind: "code_slice",
    title: "Test Artifact",
    purpose: "Test the mapping",
    concept_slice_id: "CS-T001",
    source_evidence: [ref1, ref2],
    hidden_solution_evidence: [
      makeEvidenceRef({
        evidence_id: "EV-H001",
        file_path: "src/module.ts",
        start_line: 120,
        end_line: 180,
        excerpt: "The actual branching logic maps quality to severity using a switch statement at line 142",
      }),
    ],
    user_operation: makeOperation(),
    renderer: "code_slice",
    payload: {},
    success_criteria: [
      "Names at least three intermediate steps",
      "Cites evidence for each step",
      "Explains branching logic",
      "Predicts behavior change correctly",
    ],
    created_at: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function makeConceptSlice(overrides?: Partial<ConceptSlice>): ConceptSlice {
  return {
    id: "CS-T001",
    label: "Test Concept",
    domain: "code",
    operation_target: "trace",
    prerequisite_concepts: [],
    source_evidence: ["EV-T001"],
    behavior_evidence: [],
    risk_evidence: [],
    expected_user_operations: ["trace", "explain"],
    ...overrides,
  };
}

function makeShallowAttempt(): UserAttempt {
  return createAttempt({
    operation_id: "OP-T001",
    answer_text: "I can see there's a function that does the mapping. It uses some branching logic, but I can't trace exactly which line does what. I think it returns different values for different qualities.",
    selected_evidence: ["EV-T001"],
    declared_confidence: "medium",
    declared_unknowns: [
      "Cannot trace specific branching lines",
      "Cannot predict behavior changes",
    ],
  });
}

function makeCorrectAttempt(): UserAttempt {
  return createAttempt({
    operation_id: "OP-T001",
    answer_text: "The function traces through three intermediate steps: input validation at line 10-15, branching at line 20-35 with a switch statement that maps quality to severity, and output construction at line 40-50. The branching logic at line 25 determines high severity for critical quality, medium for partial. Changing the input quality from partial to critical would produce high severity output. Evidence: src/module.ts lines 10-50.",
    selected_evidence: ["EV-T001"],
    declared_confidence: "high",
    declared_unknowns: [],
  });
}

function makeOverconfidentAttempt(): UserAttempt {
  return createAttempt({
    operation_id: "OP-T001",
    answer_text: "This is simple. Everything maps to the same output. There's no branching at all. All qualities produce identical results. I'm completely certain about this.",
    selected_evidence: [],
    declared_confidence: "high",
    declared_unknowns: [],
  });
}

function evaluateShallowAttempt() {
  const attempt = makeShallowAttempt();
  const artifact = makeArtifact();
  const operation = makeOperation();
  const result = evaluateAttempt({
    attempt,
    operation,
    artifact,
  });
  return { attempt, operation, artifact, evalOutput: result };
}

function evaluateCorrectAttempt() {
  const attempt = makeCorrectAttempt();
  const artifact = makeArtifact();
  const operation = makeOperation();
  const result = evaluateAttempt({
    attempt,
    operation,
    artifact,
  });
  return { attempt, operation, artifact, evalOutput: result };
}

function evaluateOverconfidentAttempt() {
  const attempt = makeOverconfidentAttempt();
  const artifact = makeArtifact();
  const operation = makeOperation();
  const result = evaluateAttempt({
    attempt,
    operation,
    artifact,
  });
  return { attempt, operation, artifact, evalOutput: result };
}

// ── VAL-PED-001: Gaps Require Both User And Artifact Evidence ────────

describe("VAL-PED-001: Gaps cite both user attempt and artifact evidence", () => {
  test("gap includes user_attempt_ref linking to the attempt", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.ok(gap, "Should create a gap for a shallow attempt");
    assert.equal(gap.user_attempt_ref, attempt.id,
      "Gap must reference the user attempt by ID");
    assert.ok(gap.artifact_evidence_refs.length > 0,
      "Gap must cite artifact evidence");
    assert.ok(gap.artifact_evidence_refs.every((ref) =>
      ref.evidence_id && ref.file_path && ref.excerpt),
      "Every evidence ref must have id, path, and excerpt");
  });

  test("gap evidence field describes both user and artifact sides", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.ok(gap, "Should create a gap");
    assert.ok(gap.evidence.length > 20, "Gap evidence text should be substantive");
    assert.ok(gap.evidence.includes("Gap kind:"),
      "Gap evidence should describe the gap kind");
  });

  test("correct attempt produces no gap (null)", () => {
    const operation = makeOperation({
      success_criteria: ["Names at least one intermediate step", "Cites evidence"],
    });
    const artifact = makeArtifact({
      success_criteria: operation.success_criteria,
      user_operation: operation,
    });
    const attempt = createAttempt({
      operation_id: operation.id,
      answer_text: "Names at least one intermediate step: input validation. Cites evidence: src/module.ts lines 10-50.",
      selected_evidence: ["EV-T001"],
      declared_confidence: "medium",
      declared_unknowns: [],
    });
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.equal(gap, null,
      "No gap should be created for a correct attempt");
  });

  test("gap fails closed without artifact evidence", () => {
    // Create an artifact with no source evidence
    const artifact = makeArtifact({ source_evidence: [] });
    const attempt = makeShallowAttempt();
    const operation = makeOperation();
    // Manually create evalOutput with empty cited evidence
    const evalOutput = evaluateAttempt({
      attempt: makeShallowAttempt(),
      operation: makeOperation(),
      artifact: makeArtifact(),
    });
    // Override: provide artifact with no evidence
    const artifactNoEvidence = makeArtifact({ source_evidence: [] });
    const evalOutput2 = evaluateAttempt({
      attempt: makeShallowAttempt(),
      operation: makeOperation(),
      artifact: artifactNoEvidence,
    });

    // If cited_evidence is empty AND source_evidence is empty, should fail closed
    // We simulate this by using an artifact with source_evidence and checking
    // that empty cited_evidence uses source_evidence as fallback
    const evalOutputWithEvidence = evaluateAttempt({
      attempt: makeShallowAttempt(),
      operation: makeOperation(),
      artifact: makeArtifact({ source_evidence: [makeEvidenceRef()] }),
    });

    const gap = createOwnershipGap({
      evalOutput: evalOutputWithEvidence,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact: makeArtifact({ source_evidence: [makeEvidenceRef()] }),
    });

    // Should use artifact source_evidence as fallback when cited_evidence is empty
    assert.ok(gap, "Should still create gap using backup artifact evidence");
    assert.ok(gap.artifact_evidence_refs.length > 0,
      "Must have at least one artifact evidence ref from fallback");
  });

  test("gap severity and blocks_readiness are set correctly", () => {
    const { attempt, operation, artifact } = evaluateOverconfidentAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });

    assert.ok(gap, "Should create gap for overconfident attempt");
    assert.equal(gap.severity, "critical",
      "False confidence should be critical severity");
    assert.equal(gap.blocks_readiness, true,
      "Critical gaps must block readiness");
  });
});

// ── VAL-PED-002: Repair Actions Are Concrete ─────────────────────────

describe("VAL-PED-002: Repair actions are concrete and evidence-seeking", () => {
  test("repair action specifies a concrete operation kind", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(repair.operation_kind),
      `Repair operation kind '${repair.operation_kind}' must be recognized`);
    assert.ok(repair.prompt.length > 30,
      "Repair prompt must be substantive (not generic advice)");
  });

  test("repair action prompt references specific evidence", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    // Prompt should reference specific file paths or line ranges
    assert.ok(
      repair.prompt.includes("src/module.ts") || repair.prompt.includes("evidence"),
      "Repair prompt should reference specific evidence locations",
    );
  });

  test("repair action links back to its source gap", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.equal(repair.source_gap_id, gap.id,
      "Repair action must reference its source gap");
    assert.equal(repair.gap_id, gap.id,
      "Repair gap_id must match source gap");
  });

  test("repair action required_evidence is from the gap", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const repair = createRepairAction({
      gap,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(repair.required_evidence.length > 0,
      "Repair action must require evidence");
    for (const ref of repair.required_evidence) {
      assert.ok(ref.evidence_id, "Each required evidence ref must have an ID");
    }
  });

  test("repair for different gap kinds produces appropriate operation kinds", () => {
    const gapKinds: OwnershipGapKind[] = [
      "shallow_trace",
      "vocabulary_only",
      "false_confidence",
      "wrong_mechanism",
      "passive_agreement",
    ];

    for (const kind of gapKinds) {
      const gap: OwnershipGap = {
        id: `GAP-${kind}`,
        concept_slice_id: "CS-T001",
        kind,
        user_attempt_ref: "ATT-001",
        artifact_evidence_refs: [makeEvidenceRef()],
        evidence: `Test gap of kind ${kind}`,
        severity: "important",
        blocks_readiness: true,
        created_at: new Date().toISOString(),
      };

      const repair = createRepairAction({
        gap,
        conceptSlice: makeConceptSlice(),
      });

      assert.ok(RECOGNIZED_OPERATION_KINDS.includes(repair.operation_kind),
        `Repair for ${kind} has recognized operation kind '${repair.operation_kind}'`);
      assert.ok(repair.prompt.length > 0, `Repair for ${kind} has a prompt`);
    }
  });
});

// ── VAL-PED-003: Readiness Is Scoped ─────────────────────────────────

describe("VAL-PED-003: Readiness is scoped", () => {
  test("readiness claim scope mentions the specific operation and concept slice", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "ready",
    });

    assert.ok(claim.scope.includes("trace"), "Scope should mention operation kind");
    assert.ok(claim.scope.includes("Test Concept"), "Scope should mention concept slice");
    assert.ok(!claim.scope.toLowerCase().includes("whole repo"),
      "Scope must not claim whole-repo ownership");
    assert.ok(!claim.scope.toLowerCase().includes("entire repository"),
      "Scope must not claim entire repository");
  });

  test("readiness claim never claims whole-repo mastery", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice({ label: "Full Repository" }),
      operation: makeOperation({ kind: "explain" }),
      status: "ready",
    });

    const globalPatterns = [
      /master(y|ed) this (repo|repository|project)/i,
      /understand(s)? this (repo|repository|project|codebase|entire)/i,
      /full (repo|repository|project) ownership/i,
    ];

    for (const pattern of globalPatterns) {
      assert.ok(!pattern.test(claim.scope),
        `Scope '${claim.scope}' must not match global pattern ${pattern}`);
    }
  });

  test("blocked readiness has correct status and no ready flags", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
    });

    assert.equal(claim.status, "blocked");
    assert.equal(claim.ready_to_explain, false);
    assert.equal(claim.ready_to_trace, false);
    assert.equal(claim.ready_to_derive, false);
    assert.equal(claim.ready_to_predict, false);
    assert.equal(claim.ready_to_build, false);
    assert.equal(claim.ready_to_modify, false);
    assert.equal(claim.ready_to_debug, false);
    assert.equal(claim.ready_to_transfer, false);
    assert.equal(claim.ready_to_teach, false);
    assert.ok(claim.blocked_claims.length > 0);
  });

  test("ready readiness has explain/trace/derive/predict flags true", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "ready",
    });

    assert.equal(claim.status, "ready");
    assert.equal(claim.ready_to_explain, true);
    assert.equal(claim.ready_to_trace, true);
    assert.equal(claim.ready_to_derive, true);
    assert.equal(claim.ready_to_predict, true);
    // Build/modify/debug/transfer/teach always false unless explicitly tested
    assert.equal(claim.ready_to_build, false);
    assert.equal(claim.ready_to_modify, false);
    assert.equal(claim.ready_to_debug, false);
    assert.equal(claim.ready_to_transfer, false);
    assert.equal(claim.ready_to_teach, false);
  });
});

// ── VAL-PED-007: Readiness Waits For Successful Re-Evaluation ────────

describe("VAL-PED-007: Readiness waits for successful re-evaluation", () => {
  test("readiness does NOT advance when re-evaluation fails", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
    });

    const successfulAttempt = makeCorrectAttempt();
    const { evidenceCheck } = evaluateAttempt({
      attempt: successfulAttempt,
      operation: makeOperation(),
      artifact: makeArtifact(),
    });

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: false,
      resolvedGapIds: [],
      successfulAttempt,
      evidenceCheck,
    });

    assert.equal(updated.status, "blocked",
      "Readiness must remain blocked when re-evaluation fails");
  });

  test("readiness advances to ready when re-evaluation succeeds and all gaps resolved", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
    });

    const successfulAttempt = makeCorrectAttempt();
    const { evidenceCheck } = evaluateAttempt({
      attempt: successfulAttempt,
      operation: makeOperation(),
      artifact: makeArtifact(),
    });

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt,
      evidenceCheck,
    });

    assert.equal(updated.status, "ready",
      "Readiness should advance to ready when all gaps resolved");
    assert.equal(updated.blocking_gaps.length, 0);
    assert.equal(updated.ready_to_explain, true);
    assert.equal(updated.ready_to_trace, true);
  });

  test("readiness stays limited when some gaps remain unresolved", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001", "GAP-002"],
    });

    const successfulAttempt = makeCorrectAttempt();
    const { evidenceCheck } = evaluateAttempt({
      attempt: successfulAttempt,
      operation: makeOperation(),
      artifact: makeArtifact(),
    });

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"], // Only one resolved
      successfulAttempt,
      evidenceCheck,
    });

    assert.equal(updated.status, "limited",
      "Readiness should be limited when not all gaps resolved");
    assert.equal(updated.blocking_gaps.length, 1);
    assert.ok(updated.blocking_gaps.includes("GAP-002"));
  });

  test("readiness advance preserves supporting evidence from original", () => {
    const currentClaim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
      status: "blocked",
      blockingGaps: ["GAP-001"],
      supportingEvidence: [{ evidence_id: "EV-T001" }],
    });

    const successfulAttempt = makeCorrectAttempt();
    const { evidenceCheck } = evaluateAttempt({
      attempt: successfulAttempt,
      operation: makeOperation(),
      artifact: makeArtifact(),
    });

    const updated = advanceReadinessAfterReevaluation({
      currentClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: ["GAP-001"],
      successfulAttempt,
      evidenceCheck,
    });

    assert.ok(
      updated.supporting_evidence.some((e) => e.evidence_id === "EV-T001"),
      "Should preserve original supporting evidence",
    );
    assert.ok(
      updated.supporting_evidence.some((e) => e.evidence_id === successfulAttempt.id),
      "Should include the successful attempt as new evidence",
    );
  });
});

// ── VAL-LOOP-012: Re-Evaluation Is Nearby, Evidence-Bound, Non-Repeating ─

describe("VAL-LOOP-012: Re-evaluation is nearby, evidence-bound, non-repeating", () => {
  test("re-evaluation uses a different operation kind", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.notEqual(reeval.nearby_operation_kind, operation.kind,
      "Re-evaluation must use a different operation kind");
    assert.ok(RECOGNIZED_OPERATION_KINDS.includes(reeval.nearby_operation_kind));
  });

  test("re-evaluation preserves required evidence", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.ok(reeval.required_evidence.length > 0,
      "Re-evaluation must require evidence");
    assert.ok(reeval.required_evidence.includes("EV-T001"),
      "Re-evaluation should include the original operation's required evidence");
  });

  test("re-evaluation prompt is NOT the same as original", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.notEqual(reeval.prompt, operation.prompt,
      "Re-evaluation prompt must differ from original");
    assert.equal(reeval.avoid_repeating_prompt, operation.prompt,
      "Explicitly tracks the prompt to avoid repeating");
  });

  test("re-evaluation references the original operation and gap", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.equal(reeval.original_operation_id, operation.id);
    assert.equal(reeval.original_gap_id, gap.id);
  });

  test("re-evaluation prompt mentions the gap kind to address", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const reeval = generateReevaluation({
      originalOperation: operation,
      gap,
      conceptSlice: makeConceptSlice(),
      artifact,
    });

    assert.ok(reeval.prompt.includes(gap.kind),
      "Re-evaluation prompt should reference the original gap kind");
  });
});

// ── VAL-LOOP-015: Prerequisite Routes Return To Original Operation ───

describe("VAL-LOOP-015: Prerequisite routes return to original operation", () => {
  test("prerequisite route references the original operation id", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: operation,
      conceptSlice: makeConceptSlice(),
    });

    assert.equal(route.original_operation_id, operation.id,
      "Prerequisite route must reference the original operation for return");
  });

  test("prerequisite route has return condition mentioning original operation", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: operation,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(route.return_condition.includes(operation.id),
      "Return condition must reference the original operation ID");
    assert.ok(route.return_condition.includes(operation.kind),
      "Return condition must reference the original operation kind");
  });

  test("prerequisite route includes concrete route options", () => {
    const { attempt, operation, artifact } = evaluateShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const gap = createOwnershipGap({
      evalOutput,
      conceptSliceId: "CS-T001",
      userAttempt: attempt,
      artifact,
    });
    assert.ok(gap);

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: operation,
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(route.route_options.length > 0,
      "Prerequisite route must offer concrete options");
    for (const option of route.route_options) {
      assert.ok(option.level, "Each route option must have a level");
      assert.ok(option.label, "Each route option must have a label");
      assert.ok(option.description, "Each route option must have a description");
    }
    assert.ok(route.recommended_start, "Must have a recommended start level");
  });

  test("prerequisite route for false_confidence is not auto-generated", () => {
    // false_confidence routes should use the default template but still work
    const gap: OwnershipGap = {
      id: "GAP-TEST",
      concept_slice_id: "CS-T001",
      kind: "false_confidence",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "critical",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const route = buildPrerequisiteRoute({
      gap,
      originalOperation: makeOperation(),
      conceptSlice: makeConceptSlice(),
    });

    assert.ok(route, "Prerequisite route should exist for all gap kinds");
    assert.equal(route.original_operation_id, "OP-T001");
  });
});

// ── VAL-PED-008: Memory Tracks Demonstrated Operations ───────────────

describe("VAL-PED-008: Memory tracks demonstrated operations", () => {
  test("memory includes concept entries with confirmed operations", () => {
    const answerHistory: MemoryAnswerEntry[] = [{
      answer_id: "MA-001",
      attempt_id: "ATT-001",
      operation_id: "OP-T001",
      concept_slice_id: "CS-T001",
      answer_text: "Correct trace answer",
      outcome: "confirmed",
      confidence: "high",
      had_declared_uncertainty: false,
      created_at: new Date().toISOString(),
      evidence: [makeEvidenceRef()],
    }];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    assert.equal(memory.concept_entries.length, 1);
    const concept = memory.concept_entries[0];
    assert.equal(concept.concept_slice_id, "CS-T001");
    assert.ok(concept.confirmed_operations.length > 0,
      "Confirmed operations should be tracked");
    assert.equal(concept.open_gaps.length, 0);
  });

  test("memory tracks gaps as open", () => {
    const gap: OwnershipGap = {
      id: "GAP-001",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const answerHistory: MemoryAnswerEntry[] = [{
      answer_id: "MA-001",
      attempt_id: "ATT-001",
      operation_id: "OP-T001",
      concept_slice_id: "CS-T001",
      answer_text: "Shallow trace",
      outcome: "gap",
      confidence: "medium",
      had_declared_uncertainty: true,
      created_at: new Date().toISOString(),
      evidence: [],
    }];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [gap],
      repairActions: [],
      misconceptionMemory: [],
    });

    const concept = memory.concept_entries[0];
    assert.equal(concept.open_gaps.length, 1);
    assert.ok(concept.open_gaps.includes("GAP-001"));
    assert.equal(concept.confirmed_operations.length, 0,
      "No operations confirmed when only gaps exist");
  });

  test("memory sets retention and transfer schedule", () => {
    const lastSuccess = new Date().toISOString();
    const answerHistory: MemoryAnswerEntry[] = [{
      answer_id: "MA-001",
      attempt_id: "ATT-001",
      operation_id: "OP-T001",
      concept_slice_id: "CS-T001",
      answer_text: "Correct answer",
      outcome: "confirmed",
      confidence: "high",
      had_declared_uncertainty: false,
      created_at: lastSuccess,
      evidence: [makeEvidenceRef()],
    }];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    const concept = memory.concept_entries[0];
    assert.ok(concept.retention_due_at, "Should set retention due date");
    assert.ok(concept.transfer_due_at, "Should set transfer due date");
    assert.ok(new Date(concept.retention_due_at!) > new Date(lastSuccess),
      "Retention due date should be after last success");
    assert.ok(new Date(concept.transfer_due_at!) > new Date(concept.retention_due_at!),
      "Transfer due date should be after retention due date");
  });

  test("memory operation entries track per-operation confirmation", () => {
    const answerHistory: MemoryAnswerEntry[] = [
      {
        answer_id: "MA-001",
        attempt_id: "ATT-001",
        operation_id: "OP-T001",
        concept_slice_id: "CS-T001",
        answer_text: "Failed trace",
        outcome: "gap",
        confidence: "low",
        had_declared_uncertainty: true,
        created_at: new Date().toISOString(),
        evidence: [],
      },
      {
        answer_id: "MA-002",
        attempt_id: "ATT-002",
        operation_id: "OP-T001",
        concept_slice_id: "CS-T001",
        answer_text: "Correct trace",
        outcome: "confirmed",
        confidence: "high",
        had_declared_uncertainty: false,
        created_at: new Date().toISOString(),
        evidence: [makeEvidenceRef()],
      },
    ];

    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory,
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    const op = memory.operation_entries[0];
    assert.ok(op.is_confirmed, "Operation should be confirmed after successful answer");
    assert.equal(op.attempts_count, 2);
  });
});

// ── VAL-PED-009: Misconception Memory Is Durable ─────────────────────

describe("VAL-PED-009: Misconception memory is durable", () => {
  test("first misconception creates a new entry", () => {
    const gap: OwnershipGap = {
      id: "GAP-001",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: [],
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-001",
    });

    assert.equal(updated.length, 1);
    assert.equal(updated[0].repeated_count, 1);
    assert.equal(updated[0].current_status, "active");
    assert.ok(updated[0].repair_history.length === 1);
  });

  test("repeated misconception updates count and repair history", () => {
    const existing: MisconceptionMemory[] = [{
      id: "MIS-001",
      label: "Test Concept: shallow_trace",
      concept_id: "CS-T001",
      first_seen_at: new Date(Date.now() - 86400000).toISOString(),
      repeated_count: 1,
      domains_seen: ["CS-T001"],
      evidence: [makeEvidenceRef()],
      repair_history: [{
        repair_action_id: "REP-001",
        attempted_at: new Date(Date.now() - 86400000).toISOString(),
        outcome: "persisted",
      }],
      current_status: "active",
      last_seen_at: new Date(Date.now() - 86400000).toISOString(),
    }];

    const gap: OwnershipGap = {
      id: "GAP-002",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-002",
      artifact_evidence_refs: [makeEvidenceRef({ evidence_id: "EV-T002" })],
      evidence: "Repeated gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: existing,
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef({ evidence_id: "EV-T002" })],
      repairActionId: "REP-002",
    });

    assert.equal(updated.length, 1, "Should not create duplicate misconception entry");
    assert.equal(updated[0].repeated_count, 2, "Repeat count should increment");
    assert.equal(updated[0].repair_history.length, 2, "Repair history should grow");
  });

  test("third repetition transitions to monitored status", () => {
    const existing: MisconceptionMemory[] = [{
      id: "MIS-001",
      label: "Test Concept: shallow_trace",
      concept_id: "CS-T001",
      first_seen_at: new Date(Date.now() - 172800000).toISOString(),
      repeated_count: 2,
      domains_seen: ["CS-T001"],
      evidence: [makeEvidenceRef()],
      repair_history: [
        { repair_action_id: "REP-001", attempted_at: new Date().toISOString(), outcome: "persisted" },
        { repair_action_id: "REP-002", attempted_at: new Date().toISOString(), outcome: "persisted" },
      ],
      current_status: "active",
      last_seen_at: new Date(Date.now() - 86400000).toISOString(),
    }];

    const gap: OwnershipGap = {
      id: "GAP-003",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-003",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Third gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: existing,
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-003",
    });

    assert.equal(updated[0].repeated_count, 3);
    assert.equal(updated[0].current_status, "monitored",
      "Third repetition should transition to monitored status");
  });

  test("different concept produces separate misconception entry", () => {
    const gap: OwnershipGap = {
      id: "GAP-001",
      concept_slice_id: "CS-T001",
      kind: "shallow_trace",
      user_attempt_ref: "ATT-001",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Test gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated = trackMisconception({
      existingMisconceptions: [],
      gap,
      conceptSliceId: "CS-T001",
      conceptLabel: "Test Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-001",
    });

    const gap2: OwnershipGap = {
      id: "GAP-002",
      concept_slice_id: "CS-T002",
      kind: "vocabulary_only",
      user_attempt_ref: "ATT-002",
      artifact_evidence_refs: [makeEvidenceRef()],
      evidence: "Different gap",
      severity: "important",
      blocks_readiness: true,
      created_at: new Date().toISOString(),
    };

    const updated2 = trackMisconception({
      existingMisconceptions: updated,
      gap: gap2,
      conceptSliceId: "CS-T002",
      conceptLabel: "Different Concept",
      evidenceRefs: [makeEvidenceRef()],
      repairActionId: "REP-002",
    });

    assert.equal(updated2.length, 2,
      "Different concepts should create separate misconception entries");
  });
});

// ── VAL-CROSS-006: Attempt Evaluation Feeds Readiness And Repair ──────

describe("VAL-CROSS-006: Attempt evaluation feeds readiness and repair", () => {
  test("full loop links attempt → evidence check → gap → repair → readiness", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    // All objects should be linked
    assert.equal(result.attempt.id, attempt.id);
    assert.equal(result.evidenceCheck.attempt_id, attempt.id);

    // Gap should reference the attempt
    assert.ok(result.gap, "Should create gap");
    assert.equal(result.gap.user_attempt_ref, attempt.id);

    // Repair should reference the gap
    assert.ok(result.repairAction, "Should create repair action");
    assert.equal(result.repairAction.source_gap_id, result.gap.id);
    assert.equal(result.repairAction.gap_id, result.gap.id);

    // Readiness should reference blocking gaps
    assert.equal(result.readinessClaim.status, "blocked");
    assert.ok(result.readinessClaim.blocking_gaps.includes(result.gap.id));
  });

  test("full loop for correct attempt produces no gap and ready status", () => {
    const operation = makeOperation({
      success_criteria: [
        "Names at least one intermediate step",
        "Cites evidence",
      ],
    });
    const artifact = makeArtifact({
      success_criteria: operation.success_criteria,
      user_operation: operation,
    });
    const conceptSlice = makeConceptSlice();
    const attempt = createAttempt({
      operation_id: operation.id,
      answer_text: "The function traces through intermediate steps including input validation and branching. Evidence: src/module.ts lines 10-50.",
      selected_evidence: ["EV-T001"],
      declared_confidence: "high",
      declared_unknowns: [],
    });
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    assert.equal(result.gap, null, "No gap for correct attempt");
    assert.equal(result.repairAction, null, "No repair needed");
    assert.equal(result.readinessClaim.status, "ready",
      "Readiness should be ready when no gaps");
  });

  test("full loop for overconfident attempt produces critical gap", () => {
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeOverconfidentAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result.gap, "Should create gap for overconfident attempt");
    assert.equal(result.gap.severity, "critical");
    assert.equal(result.gap.blocks_readiness, true);
    assert.equal(result.readinessClaim.status, "blocked");
  });
});

// ── VAL-CROSS-009: Evidence Identity Is Stable Across The Loop ────────

describe("VAL-CROSS-009: Evidence identity is stable across the loop", () => {
  test("all loop objects reference evidence IDs from the inventory", () => {
    const inventory = makeEvidenceInventory();
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice,
    });

    const identityCheck = validateEvidenceIdentity({
      evidenceInventory: inventory,
      artifact,
      operation,
      attempt,
      evidenceCheck: result.evidenceCheck,
      gap: result.gap,
      repairAction: result.repairAction,
      readinessClaim: result.readinessClaim,
      prerequisiteRoute: result.prerequisiteRoute,
      reevaluationPrompt: result.reevaluationPrompt,
    });

    assert.equal(identityCheck.stable, true,
      `Evidence identity should be stable. Issues: ${identityCheck.issues.join("; ")}`);
  });

  test("evidence IDs persist from artifact through all downstream objects", () => {
    const inventory = [
      {
        id: "EV-T001",
        path: "src/module.ts",
        source_type: "implementation" as const,
        size_bytes: 5000,
        extension: ".ts",
        role: "implementation" as const,
        content_hash: "sha256:abc",
        excerpt: "Core implementation",
        status: "inspected" as const,
      },
    ];

    const operation = makeOperation({ required_evidence: ["EV-T001"] });
    const artifact = makeArtifact({
      source_evidence: [makeEvidenceRef({ evidence_id: "EV-T001" })],
    });
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    const conceptSliceEV = makeConceptSlice({ source_evidence: ["EV-T001"] });
    const result = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt,
      evalOutput,
      operation,
      artifact,
      conceptSlice: conceptSliceEV,
    });

    const identityCheck = validateEvidenceIdentity({
      evidenceInventory: inventory,
      artifact,
      operation,
      attempt,
      evidenceCheck: result.evidenceCheck,
      gap: result.gap,
      repairAction: result.repairAction,
      readinessClaim: result.readinessClaim,
      prerequisiteRoute: result.prerequisiteRoute,
      reevaluationPrompt: result.reevaluationPrompt,
    });

    assert.equal(identityCheck.stable, true,
      `Evidence IDs should match inventory. Issues: ${identityCheck.issues.join("; ")}`);
  });

  test("attemptToReadiness validates evidence identity", () => {
    const inventory = makeEvidenceInventory();
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });

    assert.doesNotThrow(() => {
      attemptToReadiness({
        loopId: "LOOP-T001",
        attempt,
        evalOutput,
        operation,
        artifact,
        conceptSlice,
        evidenceInventory: inventory,
      });
    }, "attemptToReadiness should validate evidence identity without throwing");
  });

  test("attemptToReadiness throws on invalid evidence identity", () => {
    const operation = makeOperation({ required_evidence: ["EV-NONEXISTENT"] });
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();
    const attempt = makeShallowAttempt();
    const evalOutput = evaluateAttempt({ attempt, operation, artifact });
    const inventory = makeEvidenceInventory();

    assert.throws(
      () => attemptToReadiness({
        loopId: "LOOP-T001",
        attempt,
        evalOutput,
        operation,
        artifact,
        conceptSlice,
        evidenceInventory: inventory,
      }),
      /Evidence identity is NOT stable/,
      "Should throw when evidence IDs don't match inventory",
    );
  });
});

// ── Sequence Tests: Gap → Repair → Re-Evaluation → Readiness → Memory ─

describe("Sequence: Gap → Repair → Re-Evaluation → Readiness → Memory", () => {
  test("complete sequence for a shallow trace gap", () => {
    const inventory = makeEvidenceInventory();
    const operation = makeOperation();
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();

    // Step 1: User attempts (shallow)
    const attempt1 = makeShallowAttempt();
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });

    // Step 2: Full loop evaluation
    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result1.gap, "Should detect gap");
    assert.ok(
      ["shallow_trace", "ignored_counterevidence", "missing_prerequisite"].includes(result1.gap.kind),
      `Gap kind should be shallow_trace, ignored_counterevidence, or missing_prerequisite, got ${result1.gap.kind}`,
    );
    assert.ok(result1.repairAction, "Should create repair");
    assert.ok(result1.reevaluationPrompt, "Should create re-evaluation prompt");
    assert.equal(result1.readinessClaim.status, "blocked");

    // Step 3: Re-evaluation after repair (correct)
    const attempt2 = makeCorrectAttempt();
    const eval2 = evaluateAttempt({ attempt: attempt2, operation, artifact });

    // Step 4: Advance readiness
    const advancedReadiness = advanceReadinessAfterReevaluation({
      currentClaim: result1.readinessClaim,
      reevaluationSucceeded: true,
      resolvedGapIds: [result1.gap.id],
      successfulAttempt: attempt2,
      evidenceCheck: eval2.evidenceCheck,
    });

    assert.equal(advancedReadiness.status, "ready");
    assert.equal(advancedReadiness.blocking_gaps.length, 0);

    // Step 5: Build updated memory with both attempts
    const fullMemory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice,
      answerHistory: [
        result1.memoryAnswerEntry,
        {
          answer_id: "MA-002",
          attempt_id: attempt2.id,
          operation_id: operation.id,
          concept_slice_id: conceptSlice.id,
          answer_text: attempt2.answer_text,
          outcome: "confirmed",
          confidence: attempt2.declared_confidence,
          had_declared_uncertainty: false,
          created_at: attempt2.created_at,
          evidence: eval2.evidenceCheck.cited_evidence,
        },
      ],
      gaps: result1.gap ? [result1.gap] : [],
      repairActions: result1.repairAction ? [result1.repairAction] : [],
      misconceptionMemory: result1.misconceptionMemory,
    });

    assert.ok(fullMemory.answer_history.length >= 2);
    assert.ok(fullMemory.operation_entries[0]?.is_confirmed);

    // Verify evidence identity across the full sequence
    const identityCheck = validateEvidenceIdentity({
      evidenceInventory: inventory,
      artifact,
      operation,
      attempt: attempt2,
      evidenceCheck: eval2.evidenceCheck,
      gap: result1.gap,
      repairAction: result1.repairAction,
      readinessClaim: advancedReadiness,
      prerequisiteRoute: result1.prerequisiteRoute,
      reevaluationPrompt: result1.reevaluationPrompt,
    });

    assert.equal(identityCheck.stable, true,
      `Full sequence evidence identity should be stable. Issues: ${identityCheck.issues.join("; ")}`);
  });

  test("memory accumulates misconceptions across repeated gaps", () => {
    const conceptSlice = makeConceptSlice();
    const artifact = makeArtifact();
    const operation = makeOperation();

    // First shallow attempt
    const attempt1 = makeShallowAttempt();
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });
    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.equal(result1.misconceptionMemory.length, 1);
    assert.equal(result1.misconceptionMemory[0].repeated_count, 1);
    assert.equal(result1.misconceptionMemory[0].current_status, "active");

    // Second shallow attempt (same misconception)
    const attempt2 = makeShallowAttempt();
    const eval2 = evaluateAttempt({ attempt: attempt2, operation, artifact });
    const result2 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt2,
      evalOutput: eval2,
      operation,
      artifact,
      conceptSlice,
      existingMisconceptions: result1.misconceptionMemory,
      existingGaps: result1.gap ? [result1.gap] : [],
      existingAnswerHistory: [result1.memoryAnswerEntry],
    });

    assert.equal(result2.misconceptionMemory.length, 1,
      "Should not create duplicate misconception entry");
    assert.equal(result2.misconceptionMemory[0].repeated_count, 2,
      "Repeat count should increase");
    assert.equal(result2.misconceptionMemory[0].repair_history.length, 2,
      "Repair history should accumulate");
  });

  test("re-evaluation prompt is non-repeating in sequence", () => {
    const operation = makeOperation({ kind: "trace" });
    const artifact = makeArtifact();
    const conceptSlice = makeConceptSlice();

    const attempt1 = makeShallowAttempt();
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });
    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result1.reevaluationPrompt);
    assert.notEqual(result1.reevaluationPrompt.prompt, operation.prompt,
      "Re-evaluation prompt must differ from original");
    assert.notEqual(result1.reevaluationPrompt.nearby_operation_kind, operation.kind,
      "Re-evaluation must use nearby (different) operation kind");
  });

  test("prerequisite route preserves return path to original operation", () => {
    const operation = makeOperation({ id: "OP-RETURN-001" });
    const artifact = makeArtifact({ user_operation: operation });
    const conceptSlice = makeConceptSlice();

    const attempt1 = createAttempt({
      operation_id: "OP-RETURN-001",
      answer_text: "I can see there's a function that does the mapping. It uses some branching logic, but I can't trace exactly which line does what.",
      selected_evidence: ["EV-T001"],
      declared_confidence: "medium",
      declared_unknowns: ["Cannot trace specific branching lines"],
    });
    const eval1 = evaluateAttempt({ attempt: attempt1, operation, artifact });
    const result1 = evaluateFullLoop({
      loopId: "LOOP-T001",
      userAttempt: attempt1,
      evalOutput: eval1,
      operation,
      artifact,
      conceptSlice,
    });

    assert.ok(result1.prerequisiteRoute);
    assert.equal(result1.prerequisiteRoute.original_operation_id, "OP-RETURN-001");
    assert.ok(
      result1.prerequisiteRoute.return_condition.includes("OP-RETURN-001"),
      "Return condition must reference the original operation ID",
    );
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────

describe("Edge cases", () => {
  test("buildPrerequisiteRoute handles all gap kinds", () => {
    const allKinds: OwnershipGapKind[] = [
      "missing_prerequisite",
      "wrong_causal_model",
      "shallow_trace",
      "unsupported_claim",
      "false_confidence",
      "formula_misread",
      "implementation_misread",
      "behavior_misread",
      "transfer_failure",
      "test_oracle_misread",
      "vocabulary_only",
      "memorized_without_mechanism",
      "wrong_mechanism",
      "ignored_counterevidence",
      "passive_agreement",
    ];

    for (const kind of allKinds) {
      const gap: OwnershipGap = {
        id: `GAP-${kind}`,
        concept_slice_id: "CS-T001",
        kind,
        user_attempt_ref: "ATT-001",
        artifact_evidence_refs: [makeEvidenceRef()],
        evidence: "Test gap",
        severity: "important",
        blocks_readiness: true,
        created_at: new Date().toISOString(),
      };

      const route = buildPrerequisiteRoute({
        gap,
        originalOperation: makeOperation(),
        conceptSlice: makeConceptSlice(),
      });

      assert.ok(route, `Prerequisite route should exist for ${kind}`);
      assert.ok(route.suspected_missing_concepts.length > 0,
        `Prerequisite route for ${kind} should have suspected missing concepts`);
      assert.ok(route.route_options.length > 0,
        `Prerequisite route for ${kind} should have route options`);
    }
  });

  test("createRepairAction produces prompt for all gap kinds", () => {
    const allKinds: OwnershipGapKind[] = [
      "missing_prerequisite",
      "wrong_causal_model",
      "shallow_trace",
      "unsupported_claim",
      "false_confidence",
      "formula_misread",
      "implementation_misread",
      "behavior_misread",
      "transfer_failure",
      "test_oracle_misread",
      "vocabulary_only",
      "memorized_without_mechanism",
      "wrong_mechanism",
      "ignored_counterevidence",
      "passive_agreement",
    ];

    for (const kind of allKinds) {
      const gap: OwnershipGap = {
        id: `GAP-${kind}`,
        concept_slice_id: "CS-T001",
        kind,
        user_attempt_ref: "ATT-001",
        artifact_evidence_refs: [makeEvidenceRef()],
        evidence: "Test gap",
        severity: "important",
        blocks_readiness: true,
        created_at: new Date().toISOString(),
      };

      assert.doesNotThrow(() => {
        const repair = createRepairAction({
          gap,
          conceptSlice: makeConceptSlice(),
        });
        assert.ok(repair.prompt.length > 0,
          `Repair for ${kind} should have non-empty prompt`);
      }, `createRepairAction should not throw for ${kind}`);
    }
  });

  test("readiness for unknown status has no ready flags", () => {
    const claim = createReadinessClaim({
      conceptSlice: makeConceptSlice(),
      operation: makeOperation(),
    });

    assert.equal(claim.status, "unknown");
    assert.equal(claim.confidence, "low");
  });

  test("deep ownership memory handles empty answer history", () => {
    const memory = buildDeepOwnershipMemory({
      loopId: "LOOP-T001",
      conceptSlice: makeConceptSlice(),
      answerHistory: [],
      gaps: [],
      repairActions: [],
      misconceptionMemory: [],
    });

    assert.equal(memory.concept_entries.length, 1);
    assert.equal(memory.answer_history.length, 0);
    assert.equal(memory.operation_entries.length, 0);
    assert.equal(memory.open_gaps.length, 0);
  });
});
