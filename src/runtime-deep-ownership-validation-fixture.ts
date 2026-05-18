import { existsSync, readFileSync } from "node:fs";

import { RECOGNIZED_OPERATION_KINDS } from "./runtime-deep-ownership-evidence-types.ts";
import type {
  DeepOwnershipFixture,
  ValidationIssue,
  ValidationResult,
} from "./runtime-deep-ownership-loop-types.ts";
import { validateBoundaryEnforcement } from "./runtime-deep-ownership-boundary.ts";
import {
  issue,
  validateEvidenceEntry,
  validateEvidenceRef,
  validateSkipRecord,
  validateUnknownZone,
  warning,
} from "./runtime-deep-ownership-validation-evidence.ts";
import {
  validateConceptSlice,
  validateReadinessClaim,
  validateThinkingArtifact,
} from "./runtime-deep-ownership-validation-structure.ts";

/**
 * Comprehensive fixture validation.
 */
export function validateDeepOwnershipFixture(
  fixture: unknown,
  rootPath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const f = fixture as DeepOwnershipFixture;

  if (!f || typeof f !== "object") {
    return { valid: false, issues: [issue("fixture", "Fixture is not a valid object")], summary: "Invalid fixture" };
  }

  if (!f.goal || typeof f.goal !== "string" || f.goal.trim().length < 10) {
    issues.push(issue("goal", "Fixture must have a concrete goal (minimum 10 characters)"));
  }

  const weakGoalPatterns = [
    /^(understand|teach|learn|explain|study) (this|the) (repo|repository|project|codebase)[.]?$/i,
    /^teach me/i,
    /^make me (good|better|an expert)/i,
  ];
  if (f.goal) {
    for (const pattern of weakGoalPatterns) {
      if (pattern.test(f.goal.trim())) {
        issues.push(warning("goal", `Goal '${f.goal}' may be too weak. Consider a concrete operation-scoped goal.`));
        break;
      }
    }
  }

  if (!f.artifact_boundary) {
    issues.push(issue("artifact_boundary", "Missing artifact boundary"));
  } else {
    if (!f.artifact_boundary.root_path) {
      issues.push(issue("artifact_boundary.root_path", "Missing root_path"));
    }
    if (!f.artifact_boundary.included_sources || f.artifact_boundary.included_sources.length === 0) {
      issues.push(issue("artifact_boundary.included_sources", "Boundary must include at least one source"));
    }
  }

  if (!f.evidence_inventory || !Array.isArray(f.evidence_inventory)) {
    issues.push(issue("evidence_inventory", "Missing evidence inventory"));
  } else if (f.evidence_inventory.length === 0) {
    issues.push(issue("evidence_inventory", "Evidence inventory must have at least one entry"));
  } else {
    for (let i = 0; i < f.evidence_inventory.length; i++) {
      issues.push(...validateEvidenceEntry(f.evidence_inventory[i], i));
    }

    const ids = f.evidence_inventory.map((entry) => entry.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    for (const duplicateId of [...new Set(dupes)]) {
      issues.push(issue("evidence_inventory", `Duplicate evidence ID: ${duplicateId}`));
    }

    const roles = new Set(f.evidence_inventory.map((entry) => entry.role));
    if (!roles.has("implementation")) {
      issues.push(warning("evidence_inventory", "No evidence entries have 'implementation' role"));
    }
    if (!roles.has("behavior_oracle")) {
      issues.push(warning("evidence_inventory", "No evidence entries have 'behavior_oracle' role"));
    }
  }

  if (f.skip_records && Array.isArray(f.skip_records)) {
    for (let i = 0; i < f.skip_records.length; i++) {
      issues.push(...validateSkipRecord(f.skip_records[i], i));
    }
  }

  if (!f.unknown_zones || !Array.isArray(f.unknown_zones)) {
    issues.push(issue("unknown_zones", "Missing unknown zones"));
  } else {
    for (let i = 0; i < f.unknown_zones.length; i++) {
      issues.push(...validateUnknownZone(f.unknown_zones[i], i));
    }
  }

  if (!f.concept_slice) {
    issues.push(issue("concept_slice", "Missing concept slice"));
  } else {
    issues.push(...validateConceptSlice(f.concept_slice));
  }

  if (!f.thinking_artifacts || !Array.isArray(f.thinking_artifacts)) {
    issues.push(issue("thinking_artifacts", "Missing thinking artifacts"));
  } else if (f.thinking_artifacts.length === 0) {
    issues.push(issue("thinking_artifacts", "Must have at least one thinking artifact"));
  } else {
    for (let i = 0; i < f.thinking_artifacts.length; i++) {
      issues.push(...validateThinkingArtifact(f.thinking_artifacts[i], i));
      const artifact = f.thinking_artifacts[i];
      if (Array.isArray(artifact.source_evidence)) {
        for (let j = 0; j < artifact.source_evidence.length; j++) {
          issues.push(...validateEvidenceRef(artifact.source_evidence[j], `thinking_artifacts[${i}].source_evidence[${j}]`));
        }
      }
      if (Array.isArray(artifact.hidden_solution_evidence)) {
        for (let j = 0; j < artifact.hidden_solution_evidence.length; j++) {
          issues.push(...validateEvidenceRef(artifact.hidden_solution_evidence[j], `thinking_artifacts[${i}].hidden_solution_evidence[${j}]`));
        }
      }
    }
    const hasOperation = f.thinking_artifacts.some(
      (artifact) => artifact.user_operation && artifact.user_operation.kind && artifact.user_operation.prompt,
    );
    if (!hasOperation) {
      issues.push(issue("thinking_artifacts", "At least one thinking artifact must have an operation-bearing user operation"));
    }
  }

  if (!f.active_operation) {
    issues.push(issue("active_operation", "Missing active operation"));
  } else if (!f.active_operation.kind || !RECOGNIZED_OPERATION_KINDS.includes(f.active_operation.kind)) {
    issues.push(issue("active_operation.kind", `Unrecognized operation kind '${f.active_operation.kind}'`));
  }

  if (!f.sample_attempt) {
    issues.push(issue("sample_attempt", "Missing sample attempt"));
  } else {
    if (!f.sample_attempt.answer_text || typeof f.sample_attempt.answer_text !== "string") {
      issues.push(issue("sample_attempt.answer_text", "Missing answer text"));
    }
    if (f.sample_attempt.declared_confidence && !["low", "medium", "high"].includes(f.sample_attempt.declared_confidence)) {
      issues.push(issue("sample_attempt.declared_confidence", `Invalid declared_confidence '${f.sample_attempt.declared_confidence}'`));
    }
  }

  if (!f.evidence_check) {
    issues.push(issue("evidence_check", "Missing evidence check"));
  } else {
    const evidenceCheck = f.evidence_check;
    if (Array.isArray(evidenceCheck.cited_evidence)) {
      for (let i = 0; i < evidenceCheck.cited_evidence.length; i++) {
        issues.push(...validateEvidenceRef(evidenceCheck.cited_evidence[i], `evidence_check.cited_evidence[${i}]`));
      }
    }
    if (Array.isArray(evidenceCheck.artifact_counterevidence)) {
      for (let i = 0; i < evidenceCheck.artifact_counterevidence.length; i++) {
        issues.push(...validateEvidenceRef(evidenceCheck.artifact_counterevidence[i], `evidence_check.artifact_counterevidence[${i}]`));
      }
    }
  }

  if (!f.detected_gap) {
    issues.push(issue("detected_gap", "Missing detected gap"));
  } else if (f.detected_gap.severity && !["critical", "important", "later"].includes(f.detected_gap.severity)) {
    issues.push(issue("detected_gap.severity", `Invalid severity '${f.detected_gap.severity}'`));
  }
  if (f.detected_gap && Array.isArray(f.detected_gap.artifact_evidence_refs)) {
    for (let i = 0; i < f.detected_gap.artifact_evidence_refs.length; i++) {
      issues.push(...validateEvidenceRef(f.detected_gap.artifact_evidence_refs[i], `detected_gap.artifact_evidence_refs[${i}]`));
    }
  }

  if (!f.repair_action) {
    issues.push(issue("repair_action", "Missing repair action"));
  }
  if (f.repair_action && Array.isArray(f.repair_action.required_evidence)) {
    for (let i = 0; i < f.repair_action.required_evidence.length; i++) {
      issues.push(...validateEvidenceRef(f.repair_action.required_evidence[i], `repair_action.required_evidence[${i}]`));
    }
  }

  if (!f.readiness_claim) {
    issues.push(issue("readiness_claim", "Missing readiness claim"));
  } else {
    issues.push(...validateReadinessClaim(f.readiness_claim));
  }

  if (f.artifact_boundary) {
    issues.push(...validateBoundaryEnforcement(f, rootPath));
  }

  if (Array.isArray(f.out_of_bound_refs)) {
    for (let i = 0; i < f.out_of_bound_refs.length; i++) {
      issues.push(...validateEvidenceRef(f.out_of_bound_refs[i], `out_of_bound_refs[${i}]`));
    }
  }

  if (!f.loop_state) {
    issues.push(issue("loop_state", "Missing loop state"));
  }

  const errors = issues.filter((entry) => entry.severity === "error");
  const warnings = issues.filter((entry) => entry.severity === "warning");

  return {
    valid: errors.length === 0,
    issues,
    summary: errors.length === 0
      ? `Valid fixture with ${warnings.length} warning(s)`
      : `Invalid fixture with ${errors.length} error(s) and ${warnings.length} warning(s)`,
  };
}

/**
 * Load and validate the deterministic fixture from its expected path.
 */
export function loadAndValidateFixture(fixturePath?: string): {
  fixture: DeepOwnershipFixture | null;
  validation: ValidationResult;
} {
  const path = fixturePath ?? "docs/specs/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";
  if (!existsSync(path)) {
    return {
      fixture: null,
      validation: {
        valid: false,
        issues: [issue("fixture", `Fixture file not found at ${path}`)],
        summary: "Fixture file missing",
      },
    };
  }

  let fixture: unknown;
  try {
    fixture = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    return {
      fixture: null,
      validation: {
        valid: false,
        issues: [issue("fixture", `Failed to parse fixture JSON: ${String(err)}`)],
        summary: "Fixture JSON parse error",
      },
    };
  }

  const validation = validateDeepOwnershipFixture(fixture, process.cwd());
  return { fixture: fixture as DeepOwnershipFixture | null, validation };
}
