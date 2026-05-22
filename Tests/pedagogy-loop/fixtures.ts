import type {
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
  UserAttempt,
  UserOperation,
} from "../../engine/runtime-deep-ownership.ts";
import { createAttempt, evaluateAttempt } from "../../engine/pedagogy/core/attempt-evaluation.ts";

export function makeEvidenceRef(overrides?: Partial<EvidenceRef>): EvidenceRef {
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

export function makeEvidenceRef2(): EvidenceRef {
  return makeEvidenceRef({
    evidence_id: "EV-T002",
    file_path: "src/module.ts",
    start_line: 60,
    end_line: 100,
    excerpt: "Helper functions and branching logic",
    role: "implementation",
  });
}

export function makeEvidenceInventory(): EvidenceInventoryEntry[] {
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

export function makeOperation(overrides?: Partial<UserOperation>): UserOperation {
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

export function makeArtifact(overrides?: Partial<ThinkingArtifact>): ThinkingArtifact {
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

export function makeConceptSlice(overrides?: Partial<ConceptSlice>): ConceptSlice {
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

export function makeShallowAttempt(): UserAttempt {
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

export function makeCorrectAttempt(): UserAttempt {
  return createAttempt({
    operation_id: "OP-T001",
    answer_text: "The function traces through three intermediate steps: input validation at line 10-15, branching at line 20-35 with a switch statement that maps quality to severity, and output construction at line 40-50. The branching logic at line 25 determines high severity for critical quality, medium for partial. Changing the input quality from partial to critical would produce high severity output. Evidence: src/module.ts lines 10-50.",
    selected_evidence: ["EV-T001"],
    declared_confidence: "high",
    declared_unknowns: [],
  });
}

export function makeOverconfidentAttempt(): UserAttempt {
  return createAttempt({
    operation_id: "OP-T001",
    answer_text: "This is simple. Everything maps to the same output. There's no branching at all. All qualities produce identical results. I'm completely certain about this.",
    selected_evidence: [],
    declared_confidence: "high",
    declared_unknowns: [],
  });
}

export function evaluateShallowAttempt() {
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

export function evaluateCorrectAttempt() {
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

export function evaluateOverconfidentAttempt() {
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
