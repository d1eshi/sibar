/**
 * Deterministic Thinking Artifact Generation
 *
 * Split into cohesive modules to keep artifact generation maintainable while
 * preserving the public runtime-artifact-generation API surface.
 */

export type {
  ArtifactClaim,
  CitationValidationResult,
  AuthorityCheckResult,
  GeneratedNode,
  GeneratedEdge,
  ArtifactGenerationOptions,
} from "./runtime-artifact-generation/types.ts";

export {
  AUTHORITY_RANK,
  resolveEvidenceAuthority,
  detectEvidenceRoleConflicts,
} from "./runtime-artifact-generation/authority.ts";

export {
  isClaimUncited,
  markInferred,
  markUnknown,
} from "./runtime-artifact-generation/claim-helpers.ts";

export {
  validateArtifactCitations,
} from "./runtime-artifact-generation/citation-validation.ts";

export {
  generateCodeSliceArtifact,
} from "./runtime-artifact-generation/code-slice.ts";

export {
  generateFlowDiagramArtifact,
} from "./runtime-artifact-generation/flow-diagram.ts";

export {
  generateDeterministicArtifacts,
} from "./runtime-artifact-generation/generate-deterministic-artifacts.ts";
