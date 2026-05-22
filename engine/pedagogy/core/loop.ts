/**
 * Pedagogy loop core entrypoint.
 *
 * This module is intentionally small and re-exports cohesive implementations
 * from ./loop/* to keep the codebase maintainable.
 */

export type {
  PrerequisiteRouteLevel,
  PrerequisiteRouteOption,
  PrerequisiteRoute,
  ReevaluationPrompt,
  MisconceptionStatus,
  MisconceptionRepairEntry,
  MisconceptionMemory,
  MemoryAnswerOutcome,
  MemoryAnswerEntry,
  MemoryOperationEntry,
  MemoryConceptEntry,
  DeepOwnershipMemory,
  LoopResult,
  EvaluateFullLoopInput,
} from "./loop/types.ts";

export { buildPrerequisiteRoute } from "./loop/prerequisite-route.ts";
export { createOwnershipGap } from "./loop/ownership-gap.ts";
export { createRepairAction } from "./loop/repair-action.ts";
export { generateReevaluation } from "./loop/reevaluation.ts";
export {
  createReadinessClaim,
  isRepeatedUnsupportedAnswer,
  advanceReadinessAfterReevaluation,
} from "./loop/readiness.ts";
export { trackMisconception } from "./loop/misconception-memory.ts";
export { buildDeepOwnershipMemory } from "./loop/deep-ownership-memory.ts";
export { evaluateFullLoop } from "./loop/pipeline.ts";
export { validateEvidenceIdentity } from "./loop/evidence-identity.ts";
export { attemptToReadiness } from "./loop/attempt-to-readiness.ts";
