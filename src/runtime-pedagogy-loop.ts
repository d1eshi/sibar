/**
 * Pedagogy loop runtime entrypoint.
 *
 * This module is intentionally small and re-exports cohesive implementations
 * from ./runtime-pedagogy-loop/* to keep the codebase maintainable.
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
} from "./runtime-pedagogy-loop/types.ts";

export { buildPrerequisiteRoute } from "./runtime-pedagogy-loop/prerequisite-route.ts";
export { createOwnershipGap } from "./runtime-pedagogy-loop/ownership-gap.ts";
export { createRepairAction } from "./runtime-pedagogy-loop/repair-action.ts";
export { generateReevaluation } from "./runtime-pedagogy-loop/reevaluation.ts";
export {
  createReadinessClaim,
  isRepeatedUnsupportedAnswer,
  advanceReadinessAfterReevaluation,
} from "./runtime-pedagogy-loop/readiness.ts";
export { trackMisconception } from "./runtime-pedagogy-loop/misconception-memory.ts";
export { buildDeepOwnershipMemory } from "./runtime-pedagogy-loop/deep-ownership-memory.ts";
export { evaluateFullLoop } from "./runtime-pedagogy-loop/pipeline.ts";
export { validateEvidenceIdentity } from "./runtime-pedagogy-loop/evidence-identity.ts";
export { attemptToReadiness } from "./runtime-pedagogy-loop/attempt-to-readiness.ts";
