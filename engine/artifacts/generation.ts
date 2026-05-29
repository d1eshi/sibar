/**
 * Deterministic Thinking Artifact Generation
 *
 * Split into cohesive modules to keep artifact generation maintainable while
 * preserving the public artifacts/generation API surface.
 */

export type {
  ArtifactClaim,
  CitationValidationResult,
  AuthorityCheckResult,
  GeneratedNode,
  GeneratedEdge,
  ArtifactGenerationOptions,
} from "./generation/types.ts";

export {
  AUTHORITY_RANK,
  resolveEvidenceAuthority,
  detectEvidenceRoleConflicts,
} from "./generation/authority.ts";

export {
  isClaimUncited,
  markInferred,
  markUnknown,
} from "./generation/claim-helpers.ts";

export {
  validateArtifactCitations,
} from "./generation/citation-validation.ts";

export {
  generateCodeSliceArtifact,
} from "./generation/code-slice.ts";

export {
  generateFlowDiagramArtifact,
} from "./generation/flow-diagram.ts";

export {
  generateDeterministicArtifacts,
} from "./generation/generate-deterministic-artifacts.ts";
