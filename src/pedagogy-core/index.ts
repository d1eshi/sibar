/**
 * Pedagogy Core boundary facade over existing deterministic pedagogy logic.
 */

export const PEDAGOGY_CORE_BOUNDARY_VERSION = "0.1.0";

export * from "../runtime-pedagogy-loop.ts";
export * from "../runtime-attempt-evaluation.ts";

export {
  RECOGNIZED_ARTIFACT_KINDS,
  RECOGNIZED_EVIDENCE_ROLES,
  RECOGNIZED_OPERATION_KINDS,
} from "../runtime-deep-ownership-evidence-types.ts";

export type {
  ArtifactBoundary,
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
  EvidenceRole,
  EvidenceSourceType,
  EvidenceStatus,
  SkipReason,
  SkipRecord,
  SkipRisk,
  ThinkingArtifact,
  ThinkingArtifactKind,
  UnknownZone,
  UserOperation,
  UserOperationKind,
} from "../runtime-deep-ownership-evidence-types.ts";

export type {
  DeepOwnershipFixture,
  DeepOwnershipLoop,
  EvidenceCheck,
  EvidenceCheckResult,
  LoopEntry,
  LoopState,
  OperationChoice,
  OwnershipGap,
  OwnershipGapKind,
  ReadinessClaim,
  ReadinessStatus,
  RepairAction,
  UserAttempt,
  ValidationIssue,
  ValidationResult,
  WeakGoalRoute,
  WorkspaceSnapshot,
} from "../runtime-deep-ownership-loop-types.ts";
