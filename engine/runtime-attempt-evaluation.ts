/**
 * Attempt capture and evidence-check evaluation entrypoint.
 *
 * Split into cohesive modules for maintainability while preserving the
 * existing public API surface imported by runtime and tests.
 */

export type {
  CreateAttemptInput,
  EvaluateAttemptInput,
  EvaluateAttemptOutput,
} from "./runtime-attempt-evaluation/types.ts";

export { createAttempt } from "./runtime-attempt-evaluation/attempt-capture.ts";
export { evaluateAttempt } from "./runtime-attempt-evaluation/evaluate-attempt.ts";
export { classifyGapTaxonomy } from "./runtime-attempt-evaluation/gap-taxonomy.ts";
export { captureAndEvaluate } from "./runtime-attempt-evaluation/capture-and-evaluate.ts";
