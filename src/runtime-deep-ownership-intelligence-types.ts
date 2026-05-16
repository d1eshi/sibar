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
