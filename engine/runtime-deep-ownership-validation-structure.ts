import {
  RECOGNIZED_ARTIFACT_KINDS,
  RECOGNIZED_OPERATION_KINDS,
  type ConceptSlice,
  type ThinkingArtifact,
} from "./pedagogy/core/evidence-types.ts";
import type { ReadinessClaim, ValidationIssue } from "./pedagogy/core/loop-types.ts";
import { issue, warning } from "./runtime-deep-ownership-validation-evidence.ts";

/**
 * Validate the concept slice has operation-bearing structure.
 */
export function validateConceptSlice(slice: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const s = slice as ConceptSlice;
  if (!s || typeof s !== "object") {
    issues.push(issue("concept_slice", "Concept slice is not an object"));
    return issues;
  }

  if (!s.id || typeof s.id !== "string") {
    issues.push(issue("concept_slice.id", "Missing concept slice ID"));
  }

  if (!s.operation_target || !RECOGNIZED_OPERATION_KINDS.includes(s.operation_target)) {
    issues.push(issue("concept_slice.operation_target", `Unrecognized operation_target '${s.operation_target}'`));
  }

  if (!s.source_evidence || s.source_evidence.length === 0) {
    issues.push(issue("concept_slice.source_evidence", "Concept slice must reference source evidence"));
  }

  return issues;
}

/**
 * Validate that a thinking artifact has an operation and source evidence.
 */
export function validateThinkingArtifact(artifact: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const a = artifact as ThinkingArtifact;
  if (!a || typeof a !== "object") {
    issues.push(issue(`thinking_artifacts[${index}]`, "Thinking artifact is not an object"));
    return issues;
  }

  if (!a.id || typeof a.id !== "string") {
    issues.push(issue(`thinking_artifacts[${index}].id`, "Missing artifact ID"));
  }

  if (!a.kind || !RECOGNIZED_ARTIFACT_KINDS.includes(a.kind)) {
    issues.push(issue(`thinking_artifacts[${index}].kind`, `Unrecognized artifact kind '${a.kind}'`));
  }

  if (!a.source_evidence || a.source_evidence.length === 0) {
    issues.push(issue(`thinking_artifacts[${index}].source_evidence`, "Thinking artifact must have source evidence"));
  }

  if (!a.user_operation || !a.user_operation.kind) {
    issues.push(issue(`thinking_artifacts[${index}].user_operation`, "Thinking artifact must have a user operation"));
  }

  if (!a.success_criteria || a.success_criteria.length === 0) {
    issues.push(issue(`thinking_artifacts[${index}].success_criteria`, "Thinking artifact must have success criteria"));
  }

  return issues;
}

/**
 * Validate the readiness claim is scoped and does not claim whole-repo ownership.
 */
export function validateReadinessClaim(claim: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = claim as ReadinessClaim;
  if (!r || typeof r !== "object") {
    issues.push(issue("readiness_claim", "Readiness claim is not an object"));
    return issues;
  }

  if (!r.scope || typeof r.scope !== "string") {
    issues.push(issue("readiness_claim.scope", "Missing scope in readiness claim"));
  } else {
    const wholeRepoPatterns = [
      /understand(s)? this (repo|repository|project|codebase|entire)/i,
      /master(y|ed) this/i,
      /full (repo|repository|project) (ownership|knowledge|mastery)/i,
      /complete understanding of this/i,
    ];
    for (const pattern of wholeRepoPatterns) {
      if (pattern.test(r.scope)) {
        issues.push(issue("readiness_claim.scope", `Scope '${r.scope}' appears to claim whole-repo ownership`));
        break;
      }
    }
  }

  if (r.blocking_gaps && r.blocking_gaps.length > 0 && r.status !== "blocked") {
    issues.push(issue(
      "readiness_claim.status",
      `Readiness has blocking gaps but status is '${r.status}' (should be 'blocked')`,
    ));
  }

  if (r.status === "blocked") {
    const readyFlags = [
      r.ready_to_explain,
      r.ready_to_trace,
      r.ready_to_derive,
      r.ready_to_predict,
      r.ready_to_build,
      r.ready_to_modify,
      r.ready_to_debug,
      r.ready_to_transfer,
      r.ready_to_teach,
    ];
    if (readyFlags.some(Boolean)) {
      issues.push(warning(
        "readiness_claim",
        "Readiness is blocked but some operation readiness flags are true",
      ));
    }
  }

  return issues;
}
