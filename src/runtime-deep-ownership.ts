/**
 * Deep Ownership Workspace — runtime contracts, schema, and boundary enforcement.
 *
 * This entrypoint now re-exports cohesive modules so runtime contracts,
 * validation, boundary safety, and snapshot projection remain maintainable.
 */

export * from "./runtime-deep-ownership-evidence-types.ts";
export * from "./runtime-deep-ownership-loop-types.ts";

export {
  validateEvidenceRef,
  validateEvidenceId,
  validateEvidenceEntry,
  validateSkipRecord,
  validateUnknownZone,
} from "./runtime-deep-ownership-validation-evidence.ts";

export {
  validateConceptSlice,
  validateThinkingArtifact,
  validateReadinessClaim,
} from "./runtime-deep-ownership-validation-structure.ts";

export {
  validateDeepOwnershipFixture,
  loadAndValidateFixture,
} from "./runtime-deep-ownership-validation-fixture.ts";

export {
  isPathInBoundary,
  validateBoundaryEnforcement,
  checkBoundaryEscape,
} from "./runtime-deep-ownership-boundary.ts";

export {
  detectWeakGoal,
  routeWeakGoal,
  projectWorkspaceSnapshot,
  projectWorkspaceSnapshotFromFixture,
} from "./runtime-deep-ownership-snapshot.ts";
