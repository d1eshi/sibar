// ── Evidence ──────────────────────────────────────────────────────────

export type EvidenceRole =
  | "source_truth"
  | "intent"
  | "behavior_oracle"
  | "implementation"
  | "interface"
  | "experiment"
  | "counterexample"
  | "historical_rationale"
  | "unknown";

export const RECOGNIZED_EVIDENCE_ROLES: readonly EvidenceRole[] = [
  "source_truth",
  "intent",
  "behavior_oracle",
  "implementation",
  "interface",
  "experiment",
  "counterexample",
  "historical_rationale",
  "unknown",
];

export type EvidenceSourceType =
  | "source_truth"
  | "intent"
  | "behavior_oracle"
  | "implementation"
  | "interface"
  | "experiment"
  | "counterexample"
  | "historical_rationale";

export type EvidenceStatus = "inspected" | "partial" | "skipped" | "unknown";

export type EvidenceInventoryEntry = {
  id: string;
  path: string;
  source_type: EvidenceSourceType;
  size_bytes: number;
  extension: string;
  role: EvidenceRole;
  content_hash: string;
  excerpt: string;
  status: EvidenceStatus;
  line_count?: number;
};

export type EvidenceRef = {
  evidence_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
  role: EvidenceRole;
};

// ── Skip Records ──────────────────────────────────────────────────────

export type SkipReason =
  | "dependency_directory"
  | "build_output"
  | "version_control"
  | "lockfile"
  | "binary_asset"
  | "generated_asset"
  | "evaluation_infrastructure"
  | "upstream_dependency_outside_slice"
  | "ui_surface_outside_slice"
  | "swift_lens_outside_slice"
  | "out_of_boundary";

export type SkipRisk = "none" | "low" | "medium" | "high";

export type SkipRecord = {
  id: string;
  path: string;
  reason: SkipReason;
  risk_if_ignored: SkipRisk;
};

// ── Unknown Zones ─────────────────────────────────────────────────────

export type UnknownZone = {
  id: string;
  path: string;
  reason: string;
  risk_if_ignored: string;
  when_to_open: string;
};

// ── Artifact Boundary ────────────────────────────────────────────────

export type ArtifactBoundary = {
  root_path: string;
  source_type: "repository" | "folder" | "file_set" | "paper" | "notebook" | "experiment" | "mixed";
  included_sources: string[];
  excluded_sources: string[];
  evidence_roles: EvidenceRole[];
  entrypoints: string[];
  tests_as_oracles: string[];
};

// ── User Operation ───────────────────────────────────────────────────

export type UserOperationKind =
  | "explain"
  | "trace"
  | "derive"
  | "predict"
  | "build"
  | "modify"
  | "debug"
  | "transfer"
  | "teach";

export const RECOGNIZED_OPERATION_KINDS: readonly UserOperationKind[] = [
  "explain",
  "trace",
  "derive",
  "predict",
  "build",
  "modify",
  "debug",
  "transfer",
  "teach",
];

// ── Concept Slice ─────────────────────────────────────────────────────

export type ConceptSlice = {
  id: string;
  label: string;
  domain: "code" | "math" | "paper" | "experiment" | "systems" | "ml" | "rl" | "ui" | "mixed";
  operation_target: UserOperationKind;
  prerequisite_concepts: string[];
  source_evidence: string[];
  behavior_evidence: string[];
  risk_evidence: string[];
  expected_user_operations: UserOperationKind[];
};

export type UserOperation = {
  id: string;
  kind: UserOperationKind;
  prompt: string;
  artifact_ids: string[];
  required_evidence: string[];
  allowed_hints: number;
  blocked_shortcuts: string[];
  success_criteria: string[];
};

// ── Thinking Artifact ────────────────────────────────────────────────

export type ThinkingArtifactKind =
  | "code_slice"
  | "flow_diagram"
  | "architecture_map"
  | "equation_breakdown"
  | "paper_excerpt"
  | "hypothesis_table"
  | "experiment_card"
  | "ablation_plan"
  | "minimal_build"
  | "counterexample"
  | "concept_ladder"
  | "risk_map"
  | "test_oracle"
  | "patch_preview"
  | "memory_review";

export const RECOGNIZED_ARTIFACT_KINDS: readonly ThinkingArtifactKind[] = [
  "code_slice",
  "flow_diagram",
  "architecture_map",
  "equation_breakdown",
  "paper_excerpt",
  "hypothesis_table",
  "experiment_card",
  "ablation_plan",
  "minimal_build",
  "counterexample",
  "concept_ladder",
  "risk_map",
  "test_oracle",
  "patch_preview",
  "memory_review",
];

export type ThinkingArtifact = {
  id: string;
  kind: ThinkingArtifactKind;
  title: string;
  purpose: string;
  concept_slice_id: string;
  source_evidence: EvidenceRef[];
  hidden_solution_evidence: EvidenceRef[];
  user_operation: UserOperation;
  renderer: ThinkingArtifactKind;
  payload: Record<string, unknown>;
  success_criteria: string[];
  created_at: string;
};
