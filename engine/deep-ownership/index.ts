/**
 * Deep Ownership Workspace — contracts, schema, and boundary enforcement.
 *
 * This entrypoint re-exports cohesive modules so contracts,
 * validation, boundary safety, and snapshot projection remain maintainable.
 */

export * from "../pedagogy/core/evidence-types.ts";
export * from "./intelligence-types.ts";
export * from "../pedagogy/core/loop-types.ts";

export {
  validateEvidenceRef,
  validateEvidenceId,
  validateEvidenceEntry,
  validateSkipRecord,
  validateUnknownZone,
} from "./validation-evidence.ts";

export {
  validateConceptSlice,
  validateThinkingArtifact,
  validateReadinessClaim,
} from "./validation-structure.ts";

export {
  validateDeepOwnershipFixture,
  loadAndValidateFixture,
} from "./validation-fixture.ts";

export {
  isPathInBoundary,
  validateBoundaryEnforcement,
  checkBoundaryEscape,
} from "./boundary.ts";

export {
  detectWeakGoal,
  routeWeakGoal,
  projectWorkspaceSnapshot,
  projectWorkspaceSnapshotFromFixture,
} from "./snapshot.ts";

export {
  summarizeProgressiveInventory,
  createResearchToConstructionBridge,
  validateResearchToConstructionBridge,
  storeWorkspaceSignal,
  evaluateSignalOwnershipStrength,
  routeOutOfBoundEvidenceToBoundaryExpansion,
} from "./intelligence.ts";

export {
  previewWorkspaceCommand,
  assessReadOnlyCommandMutation,
  createReadOnlyCommandEvidence,
  writeStudyArtifact,
  createProductMutationGate,
  createOpenInEditorCitationPayload,
} from "./command-safety.ts";
