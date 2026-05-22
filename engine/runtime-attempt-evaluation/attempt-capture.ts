import { randomUUID } from "node:crypto";

import type { UserAttempt } from "../runtime-deep-ownership.ts";
import type { CreateAttemptInput } from "./types.ts";

export function createAttempt(input: CreateAttemptInput): UserAttempt {
  if (!input.operation_id || typeof input.operation_id !== "string") {
    throw new Error("operation_id is required");
  }
  if (typeof input.answer_text !== "string") {
    throw new Error("answer_text must be a string");
  }
  if (!["low", "medium", "high"].includes(input.declared_confidence)) {
    throw new Error(`Invalid declared_confidence: ${input.declared_confidence}`);
  }

  return {
    id: `ATT-${randomUUID().slice(0, 8)}`,
    operation_id: input.operation_id,
    answer_text: input.answer_text,
    selected_evidence: Array.isArray(input.selected_evidence) ? input.selected_evidence : [],
    declared_confidence: input.declared_confidence,
    declared_unknowns: Array.isArray(input.declared_unknowns) ? input.declared_unknowns : [],
    created_at: new Date().toISOString(),
  };
}
