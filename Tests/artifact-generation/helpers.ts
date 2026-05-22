import { readFileSync } from "node:fs";

import type {
  DeepOwnershipFixture,
  EvidenceInventoryEntry,
  ConceptSlice,
} from "../../engine/runtime-deep-ownership.ts";

const FIXTURE_PATH = "evals/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";

export function loadFixture(): DeepOwnershipFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as DeepOwnershipFixture;
}

export function makeEvidenceEntry(
  overrides: Partial<EvidenceInventoryEntry> = {},
): EvidenceInventoryEntry {
  return {
    id: "EV-TEST",
    path: "src/test-module.ts",
    source_type: "source_truth",
    size_bytes: 1000,
    extension: ".ts",
    role: "implementation",
    content_hash: "sha256:abcdef01",
    excerpt: "Test module excerpt",
    status: "inspected",
    line_count: 50,
    ...overrides,
  };
}

export function makeConceptSlice(overrides: Partial<ConceptSlice> = {}): ConceptSlice {
  return {
    id: "CS-001",
    label: "Test concept",
    domain: "code",
    operation_target: "trace",
    prerequisite_concepts: [],
    source_evidence: ["EV-001"],
    behavior_evidence: ["EV-007"],
    risk_evidence: [],
    expected_user_operations: ["trace", "explain"],
    ...overrides,
  };
}
