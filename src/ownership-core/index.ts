/**
 * Ownership Core boundary facade.
 *
 * Slice 2 introduces the boundary only; deterministic review extraction remains owned
 * by a later slice and is intentionally not implemented yet.
 */

export const OWNERSHIP_CORE_BOUNDARY_VERSION = "0.1.0-slice-2";

export const OWNERSHIP_REVIEW_EXTRACTION_STATE = {
  status: "pending",
  ownedBySlice: "slice-3-or-later",
  message: "Diff/PR/agent-output review extraction is planned for a later slice.",
} as const;

export type OwnershipReviewDiffSourceKind = "diff" | "pr" | "agent_output" | "code_selection";

export type OwnershipReviewArtifact = {
  artifact_id: string;
  created_at: string;
  source_kind: OwnershipReviewDiffSourceKind;
  review: string;
  diff_text_ref?: string;
  goal_context?: string;
  areas_touched: string[];
  required_evidence: string[];
  read_path: string[];
  blocked_reasons: string[];
  suggested_workspace_seed?: string;
};

export type OwnershipReviewMeta = {
  schema: "OwnershipReviewArtifact";
  version: typeof OWNERSHIP_CORE_BOUNDARY_VERSION;
};

export type OwnershipReviewContract = OwnershipReviewMeta & OwnershipReviewArtifact;

export function makeOwnershipReviewPlaceholder(input: {
  artifactId: string;
  sourceKind: OwnershipReviewDiffSourceKind;
  review: string;
  createdAt: string;
  areasTouched?: string[];
  requiredEvidence?: string[];
  readPath?: string[];
  blockedReasons?: string[];
  goalContext?: string;
  diffTextRef?: string;
}): OwnershipReviewContract {
  return {
    schema: "OwnershipReviewArtifact",
    version: OWNERSHIP_CORE_BOUNDARY_VERSION,
    artifact_id: input.artifactId,
    created_at: input.createdAt,
    source_kind: input.sourceKind,
    review: input.review,
    diff_text_ref: input.diffTextRef,
    goal_context: input.goalContext,
    areas_touched: input.areasTouched ?? [],
    required_evidence: input.requiredEvidence ?? [],
    read_path: input.readPath ?? [],
    blocked_reasons: input.blockedReasons ?? [],
  };
}
