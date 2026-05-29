import {
  checkBoundaryEscape,
  isPathInBoundary,
} from "./boundary.ts";
import type {
  ArtifactBoundary,
  ConceptSlice,
  EvidenceInventoryEntry,
  SkipRecord,
  UnknownZone,
} from "../pedagogy/core/evidence-types.ts";
import type {
  BoundaryExpansionRoute,
  OutOfScopeEvidenceRecord,
  ResearchBridgeMissingSide,
  ResearchToConstructionBridge,
  WorkspaceSignal,
  WorkspaceSignalKind,
} from "./intelligence-types.ts";
import type { ValidationIssue } from "../pedagogy/core/loop-types.ts";

export type ProgressiveInventoryInput = {
  artifact_boundary: ArtifactBoundary;
  evidence_inventory: EvidenceInventoryEntry[];
  skip_records: SkipRecord[];
  unknown_zones: UnknownZone[];
  concept_slice: ConceptSlice;
};

export type ProgressiveInventorySummary = {
  inventory_count: number;
  skipped_zone_count: number;
  unknown_zone_count: number;
  skipped_zones: SkipRecord[];
  unknown_zones: UnknownZone[];
  progressive_mode: boolean;
  complete_repo_summary: boolean;
  bounded_concept_slice: {
    id: string;
    label: string;
    operation_target: ConceptSlice["operation_target"];
    source_evidence_count: number;
    behavior_evidence_count: number;
    risk_evidence_count: number;
    boundary_included_count: number;
    boundary_root_path: string;
  };
};

type ResearchBridgeInput = Omit<
  ResearchToConstructionBridge,
  "missing_sides" | "status"
>;

export type WorkspaceSignalInput = {
  id?: string;
  source: string;
  kind: WorkspaceSignalKind;
  payload: Record<string, unknown>;
  evidence_role: WorkspaceSignal["evidence_role"];
  created_at?: string;
};

export type SignalOwnershipStrength = {
  signal_count: number;
  can_prove_ownership: false;
  reason: string;
};

export type BoundaryExpansionInput = {
  candidate_path: string;
  relevance_reason: string;
  related_operation_id: string | null;
  root_path: string;
  boundary: ArtifactBoundary;
  created_at?: string;
  existing_out_of_scope_count?: number;
  existing_route_count?: number;
};

export type BoundaryExpansionDecision = {
  blocked: boolean;
  evidence_ref_used: false;
  out_of_scope_record: OutOfScopeEvidenceRecord | null;
  boundary_expansion_route: BoundaryExpansionRoute | null;
};

function issue(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}

function nextId(prefix: string, currentCount: number): string {
  return `${prefix}-${String(currentCount + 1).padStart(3, "0")}`;
}

function resolveMissingSides(
  input: Pick<
    ResearchBridgeInput,
    "research_evidence_refs" | "implementation_evidence_refs" | "test_or_experiment_evidence_refs"
  >,
): ResearchBridgeMissingSide[] {
  const missing: ResearchBridgeMissingSide[] = [];
  if (input.research_evidence_refs.length === 0) missing.push("research");
  if (input.implementation_evidence_refs.length === 0) missing.push("implementation");
  if (input.test_or_experiment_evidence_refs.length === 0) missing.push("test_or_experiment");
  return missing;
}

export function summarizeProgressiveInventory(
  input: ProgressiveInventoryInput,
): ProgressiveInventorySummary {
  const inventoryCount = input.evidence_inventory.length;
  const skippedCount = input.skip_records.length;
  const unknownCount = input.unknown_zones.length;
  const progressiveMode = inventoryCount >= 500 || skippedCount > 0 || unknownCount > 0;
  const completeRepoSummary = !progressiveMode;

  return {
    inventory_count: inventoryCount,
    skipped_zone_count: skippedCount,
    unknown_zone_count: unknownCount,
    skipped_zones: input.skip_records,
    unknown_zones: input.unknown_zones,
    progressive_mode: progressiveMode,
    complete_repo_summary: completeRepoSummary,
    bounded_concept_slice: {
      id: input.concept_slice.id,
      label: input.concept_slice.label,
      operation_target: input.concept_slice.operation_target,
      source_evidence_count: input.concept_slice.source_evidence.length,
      behavior_evidence_count: input.concept_slice.behavior_evidence.length,
      risk_evidence_count: input.concept_slice.risk_evidence.length,
      boundary_included_count: input.artifact_boundary.included_sources.length,
      boundary_root_path: input.artifact_boundary.root_path,
    },
  };
}

export function createResearchToConstructionBridge(
  input: ResearchBridgeInput,
): ResearchToConstructionBridge {
  const missingSides = resolveMissingSides(input);
  return {
    ...input,
    missing_sides: missingSides,
    status: missingSides.length === 0 ? "grounded" : "partial",
  };
}

export function validateResearchToConstructionBridge(
  bridge: ResearchToConstructionBridge,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expectedMissing = resolveMissingSides(bridge);
  const expectedMissingSet = new Set(expectedMissing);
  const declaredMissingSet = new Set(bridge.missing_sides);

  for (const side of expectedMissingSet) {
    if (!declaredMissingSet.has(side)) {
      issues.push(issue(
        "research_bridge.missing_sides",
        `Missing evidence side '${side}' must be declared explicitly in missing_sides`,
      ));
    }
  }

  for (const side of declaredMissingSet) {
    if (!expectedMissingSet.has(side)) {
      issues.push(issue(
        "research_bridge.missing_sides",
        `Declared missing side '${side}' is inconsistent with provided evidence refs`,
      ));
    }
  }

  const expectedStatus = expectedMissing.length === 0 ? "grounded" : "partial";
  if (bridge.status !== expectedStatus) {
    issues.push(issue(
      "research_bridge.status",
      `Status '${bridge.status}' is invalid for the provided evidence refs (expected '${expectedStatus}')`,
    ));
  }

  return issues;
}

export function storeWorkspaceSignal(
  existingSignals: WorkspaceSignal[],
  input: WorkspaceSignalInput,
): WorkspaceSignal[] {
  const signal: WorkspaceSignal = {
    id: input.id ?? nextId("SIG", existingSignals.length),
    source: input.source,
    kind: input.kind,
    payload: input.payload,
    evidence_role: input.evidence_role,
    created_at: input.created_at ?? new Date().toISOString(),
  };
  return [...existingSignals, signal];
}

export function evaluateSignalOwnershipStrength(
  signals: WorkspaceSignal[],
): SignalOwnershipStrength {
  return {
    signal_count: signals.length,
    can_prove_ownership: false,
    reason: "Workspace signals can guide loop proposals but cannot independently prove ownership readiness.",
  };
}

export function routeOutOfBoundEvidenceToBoundaryExpansion(
  input: BoundaryExpansionInput,
): BoundaryExpansionDecision {
  const boundaryCheck = checkBoundaryEscape(
    input.candidate_path,
    input.root_path,
    input.boundary,
  );
  const inBoundary = isPathInBoundary(input.candidate_path, {
    ...input.boundary,
    root_path: input.root_path,
  });

  if (!boundaryCheck.blocked && inBoundary) {
    return {
      blocked: false,
      evidence_ref_used: false,
      out_of_scope_record: null,
      boundary_expansion_route: null,
    };
  }

  const createdAt = input.created_at ?? new Date().toISOString();
  const outOfScopeRecord: OutOfScopeEvidenceRecord = {
    id: nextId("OOS", input.existing_out_of_scope_count ?? 0),
    path_or_source: input.candidate_path,
    relevance_reason: input.relevance_reason,
    related_operation_id: input.related_operation_id,
    created_at: createdAt,
  };

  const route: BoundaryExpansionRoute = {
    id: nextId("BER", input.existing_route_count ?? 0),
    requested_path: input.candidate_path,
    relevance_reason: input.relevance_reason,
    related_operation_id: input.related_operation_id,
    proposed_sources: [input.candidate_path],
    status: "proposed",
    created_at: createdAt,
  };

  return {
    blocked: true,
    evidence_ref_used: false,
    out_of_scope_record: outOfScopeRecord,
    boundary_expansion_route: route,
  };
}
