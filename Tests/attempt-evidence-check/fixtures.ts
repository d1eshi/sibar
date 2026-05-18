import type {
  UserOperation,
  ThinkingArtifact,
  EvidenceRef,
  EvidenceInventoryEntry,
} from "../../src/runtime-deep-ownership.ts";

export function makeOperation(overrides?: Partial<UserOperation>): UserOperation {
  return {
    id: "OP-TEST-001",
    kind: "trace",
    prompt: "Trace how detectLearningGapFromAnswer maps answer quality to gap fields. Name the files and line ranges.",
    artifact_ids: ["ART-TEST-001"],
    required_evidence: ["EV-001"],
    allowed_hints: 3,
    blocked_shortcuts: ["read the full solution", "ask AI to explain"],
    success_criteria: [
      "Names at least five gap fields with their source line ranges",
      "Explains severityFor branching from answer_quality to severity",
      "Explains confidenceFor branching from answer_quality to confidence",
      "Predicts correct behavior for gap_confirmed quality",
      "Cites specific file:line evidence for each claim",
    ],
    ...overrides,
  };
}

export function makeEvidenceRef(overrides?: Partial<EvidenceRef>): EvidenceRef {
  return {
    evidence_id: "EV-001",
    file_path: "src/runtime-gap-detection.ts",
    start_line: 84,
    end_line: 112,
    excerpt: "severityFor and confidenceFor branching logic",
    role: "implementation",
    ...overrides,
  };
}

export function makeArtifact(overrides?: Partial<ThinkingArtifact>): ThinkingArtifact {
  const reference = makeEvidenceRef();
  const hiddenReference = makeEvidenceRef({
    evidence_id: "EV-HIDDEN-001",
    start_line: 120,
    end_line: 180,
    excerpt: "detectLearningGapFromAnswer constructs LearningGap from severity, confidence, misconception, and repair action",
  });

  return {
    id: "ART-TEST-001",
    kind: "code_slice",
    title: "Gap Detection Code Slice",
    purpose: "Understand how gap detection maps answer quality to gap fields",
    concept_slice_id: "CS-TEST-001",
    source_evidence: [reference],
    hidden_solution_evidence: [hiddenReference],
    user_operation: makeOperation(),
    renderer: "code_slice",
    payload: {},
    success_criteria: [
      "Names at least five gap fields with their source line ranges",
      "Explains severityFor branching from answer_quality to severity",
      "Explains confidenceFor branching from answer_quality to confidence",
      "Predicts correct behavior for gap_confirmed quality",
      "Cites specific file:line evidence for each claim",
    ],
    created_at: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

export function makeEvidenceInventory(): EvidenceInventoryEntry[] {
  return [
    {
      id: "EV-001",
      path: "src/runtime-gap-detection.ts",
      source_type: "implementation",
      size_bytes: 5000,
      extension: ".ts",
      role: "implementation",
      content_hash: "abc123",
      excerpt: "Gap detection runtime module",
      status: "inspected",
    },
    {
      id: "EV-002",
      path: "Tests/gap-detection.test.ts",
      source_type: "behavior_oracle",
      size_bytes: 3000,
      extension: ".ts",
      role: "behavior_oracle",
      content_hash: "def456",
      excerpt: "Gap detection test cases",
      status: "inspected",
    },
  ];
}
