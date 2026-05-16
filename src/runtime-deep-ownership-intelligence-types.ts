import type {
  EvidenceRef,
  EvidenceRole,
  UserOperation,
} from "./runtime-deep-ownership-evidence-types.ts";

export type ResearchBridgeMissingSide =
  | "research"
  | "implementation"
  | "test_or_experiment";

export type ResearchBridgeStatus = "grounded" | "partial";

export type ResearchToConstructionBridge = {
  id: string;
  paper_claim: string;
  equation: string;
  implementation_site: string;
  test_or_experiment: string;
  user_operation: UserOperation;
  research_evidence_refs: EvidenceRef[];
  implementation_evidence_refs: EvidenceRef[];
  test_or_experiment_evidence_refs: EvidenceRef[];
  missing_sides: ResearchBridgeMissingSide[];
  status: ResearchBridgeStatus;
  created_at: string;
};

export type WorkspaceSignalKind =
  | "file_selection"
  | "code_range_selection"
  | "diff"
  | "notebook_output"
  | "experiment_metric"
  | "runtime_trace"
  | "benchmark_result"
  | "error_log";

export type WorkspaceSignal = {
  id: string;
  source: string;
  kind: WorkspaceSignalKind;
  payload: Record<string, unknown>;
  evidence_role: EvidenceRole;
  created_at: string;
};

export type WorkspaceCommandSafetyLevel =
  | "read_only"
  | "study_write"
  | "product_write"
  | "destructive";

export type WorkspaceCommandWriteScope =
  | "none"
  | "study_artifacts_only"
  | "product_workspace"
  | "unknown";

export type WorkspaceCommandBoundaryStatus = "in_scope" | "out_of_scope";

export type WorkspaceCommandPreview = {
  id: string;
  command: string;
  cwd: string;
  safety_level: WorkspaceCommandSafetyLevel;
  expected_outputs: string[];
  write_scope: WorkspaceCommandWriteScope;
  requires_confirmation: boolean;
  boundary_status: WorkspaceCommandBoundaryStatus;
  blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
};

export type CommandOutputRef = {
  id: string;
  stream: "stdout" | "stderr";
  excerpt: string;
  byte_length: number;
  content_hash: string;
};

export type ReadOnlyCommandMutationAssessment = {
  violated: boolean;
  blocked: boolean;
  mutated_paths: string[];
  reason: string | null;
};

export type ReadOnlyCommandEvidenceRecord = {
  id: string;
  command: string;
  cwd: string;
  timestamp: string;
  exit_status: number;
  stdout_summary: string;
  stderr_summary: string;
  output_refs: CommandOutputRef[];
  evidence_role: EvidenceRole;
  accepted_as_read_only_evidence: boolean;
  safety_violation_reason: string | null;
};

export type StudyArtifactRecord = {
  id: string;
  relative_path: string;
  canonical_path: string;
  study_directory: string;
  study_only: true;
  source_evidence: EvidenceRef[];
  cited_evidence_ids: string[];
  created_at: string;
};

export type StudyArtifactWriteResult = {
  blocked: boolean;
  violation_reason: string | null;
  record: StudyArtifactRecord | null;
};

export type OutOfScopeEvidenceRecord = {
  id: string;
  path_or_source: string;
  relevance_reason: string;
  related_operation_id: string | null;
  created_at: string;
};

export type BoundaryExpansionRouteStatus = "proposed" | "approved" | "rejected";

export type BoundaryExpansionRoute = {
  id: string;
  requested_path: string;
  relevance_reason: string;
  related_operation_id: string | null;
  proposed_sources: string[];
  status: BoundaryExpansionRouteStatus;
  created_at: string;
};
