/**
 * Attempt capture and evidence-check evaluation core entrypoint.
 *
 * Split into cohesive modules for maintainability while preserving the
 * existing public API surface imported by callers and tests.
 */

export type {
  CreateAttemptInput,
  EvaluateAttemptInput,
  EvaluateAttemptOutput,
} from "./attempt-evaluation/types.ts";

export { createAttempt } from "./attempt-evaluation/attempt-capture.ts";
export { evaluateAttempt } from "./attempt-evaluation/evaluate-attempt.ts";
export { classifyGapTaxonomy } from "./attempt-evaluation/gap-taxonomy.ts";
export { captureAndEvaluate } from "./attempt-evaluation/capture-and-evaluate.ts";
