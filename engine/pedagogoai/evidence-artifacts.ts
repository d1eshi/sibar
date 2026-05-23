export type {
  ArtifactClaim,
  ArtifactGenerationOptions,
  AuthorityCheckResult,
  CitationValidationResult,
  GeneratedEdge,
  GeneratedNode,
} from "../artifacts/generation.ts";
export type {
  EvidenceInventoryEntry,
  EvidenceRef,
  EvidenceRole,
  ThinkingArtifact,
} from "../runtime-deep-ownership.ts";
export type {
  ArtifactPreviewContract,
  EvidenceContract,
  WorkspaceArtifactKind,
} from "../workspace/session/contracts.ts";

export {
  AUTHORITY_RANK,
  detectEvidenceRoleConflicts,
  generateCodeSliceArtifact,
  generateDeterministicArtifacts,
  generateFlowDiagramArtifact,
  isClaimUncited,
  markInferred,
  markUnknown,
  resolveEvidenceAuthority,
  validateArtifactCitations,
} from "../artifacts/generation.ts";
export {
  validateEvidenceEntry,
  validateEvidenceId,
  validateEvidenceRef,
  validateSkipRecord,
  validateUnknownZone,
} from "../runtime-deep-ownership.ts";
