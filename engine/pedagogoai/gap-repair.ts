export type { GapDetectionResult } from "../study/gap-detection.ts";
export type {
  MisconceptionMemory,
  OwnershipGap,
  PrerequisiteRoute,
  RepairAction,
  UserAttempt,
} from "../pedagogy/core/loop.ts";
export type {
  CreateAttemptInput,
  EvaluateAttemptInput,
  EvaluateAttemptOutput,
} from "../pedagogy/core/attempt-evaluation.ts";

export {
  buildPrerequisiteRoute,
  createOwnershipGap,
  createRepairAction,
  evaluateFullLoop,
  generateReevaluation,
  trackMisconception,
} from "../pedagogy/core/loop.ts";
export {
  detectLearningGapFromAnswer,
  persistGapDetectionResult,
} from "../study/gap-detection.ts";
export {
  captureAndEvaluate,
  classifyGapTaxonomy,
  createAttempt,
  evaluateAttempt,
} from "../pedagogy/core/attempt-evaluation.ts";
