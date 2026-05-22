export type { GapDetectionResult } from "../runtime-gap-detection.ts";
export type {
  MisconceptionMemory,
  OwnershipGap,
  PrerequisiteRoute,
  RepairAction,
  UserAttempt,
} from "../runtime-pedagogy-loop.ts";
export type {
  CreateAttemptInput,
  EvaluateAttemptInput,
  EvaluateAttemptOutput,
} from "../runtime-attempt-evaluation.ts";

export {
  buildPrerequisiteRoute,
  createOwnershipGap,
  createRepairAction,
  evaluateFullLoop,
  generateReevaluation,
  trackMisconception,
} from "../runtime-pedagogy-loop.ts";
export {
  detectLearningGapFromAnswer,
  persistGapDetectionResult,
} from "../runtime-gap-detection.ts";
export {
  captureAndEvaluate,
  classifyGapTaxonomy,
  createAttempt,
  evaluateAttempt,
} from "../runtime-attempt-evaluation.ts";
