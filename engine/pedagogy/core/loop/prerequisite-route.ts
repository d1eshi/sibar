import type {
  OwnershipGap,
  OwnershipGapKind,
  ConceptSlice,
  UserOperation,
} from "../loop-types.ts";
import type {
  PrerequisiteRoute,
  PrerequisiteRouteOption,
  PrerequisiteRouteLevel,
} from "./types.ts";
import { now, uniqueId } from "./shared.ts";

const PREREQUISITE_TEMPLATES: Record<OwnershipGapKind, {
  missing_concepts: string[];
  route_options: PrerequisiteRouteOption[];
  recommended_start: PrerequisiteRouteLevel;
}> = {
  missing_prerequisite: {
    missing_concepts: ["Fundamental vocabulary", "Core mechanism intuition"],
    route_options: [
      { level: "basic", label: "Vocabulary & minimal intuition", description: "Define the key terms and trace the simplest example", suggested_evidence: [] },
      { level: "intermediate", label: "Mechanism & examples", description: "Trace the mechanism with a concrete worked example", suggested_evidence: [] },
    ],
    recommended_start: "basic",
  },
  shallow_trace: {
    missing_concepts: ["Cross-file trace ability", "Evidence-to-claim mapping"],
    route_options: [
      { level: "intermediate", label: "Evidence tracing", description: "Trace each claim back to its source evidence line", suggested_evidence: [] },
      { level: "deep", label: "Full causal trace", description: "Derive the full path from input to output", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
  vocabulary_only: {
    missing_concepts: ["Mechanism explanation", "Causal reasoning"],
    route_options: [
      { level: "basic", label: "Term definitions with evidence", description: "Define each term and cite the evidence where it appears", suggested_evidence: [] },
      { level: "intermediate", label: "Mechanism walkthrough", description: "Walk through the mechanism step by step", suggested_evidence: [] },
      { level: "construction", label: "Minimal reconstruction", description: "Rebuild the simplest version from scratch", suggested_evidence: [] },
    ],
    recommended_start: "basic",
  },
  memorized_without_mechanism: {
    missing_concepts: ["Causal reasoning", "How/why explanation"],
    route_options: [
      { level: "intermediate", label: "Causal explanation", description: "Explain why each step happens, not just what happens", suggested_evidence: [] },
      { level: "construction", label: "Build from scratch", description: "Implement the minimal version without looking at the original", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
  wrong_mechanism: {
    missing_concepts: ["Correct causal model", "Evidence-based reasoning"],
    route_options: [
      { level: "deep", label: "Derivation from evidence", description: "Derive the correct mechanism from source evidence", suggested_evidence: [] },
      { level: "transfer", label: "Apply to nearby artifact", description: "Apply the corrected mechanism to a different artifact", suggested_evidence: [] },
    ],
    recommended_start: "deep",
  },
  wrong_causal_model: {
    missing_concepts: ["Correct causal model", "Evidence-based reasoning"],
    route_options: [
      { level: "deep", label: "Evidence-based model", description: "Rebuild the causal model from source evidence", suggested_evidence: [] },
      { level: "construction", label: "Experiment design", description: "Design an experiment that would disprove the wrong model", suggested_evidence: [] },
    ],
    recommended_start: "deep",
  },
  test_oracle_misread: {
    missing_concepts: ["Test-as-oracle interpretation", "Test intent vs behavior"],
    route_options: [
      { level: "intermediate", label: "Test intent analysis", description: "Read the test for intent, then compare to implementation", suggested_evidence: [] },
      { level: "deep", label: "Oracle-design exercise", description: "Design a test that would catch the misinterpretation", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
  ignored_counterevidence: {
    missing_concepts: ["Counterevidence awareness", "Claim-evidence reconciliation"],
    route_options: [
      { level: "intermediate", label: "Evidence reconciliation", description: "Compare your claim against the counterevidence line by line", suggested_evidence: [] },
      { level: "deep", label: "Contradiction resolution", description: "Resolve the contradiction with a revised model", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
  false_confidence: {
    missing_concepts: ["Calibration", "Evidence-based confidence", "Unknowns acknowledgment"],
    route_options: [
      { level: "basic", label: "Calibration exercise", description: "Rate confidence for each claim, then check against evidence", suggested_evidence: [] },
      { level: "deep", label: "Full evidence re-trace", description: "Re-trace every claim with line-level evidence before assigning confidence", suggested_evidence: [] },
    ],
    recommended_start: "basic",
  },
  passive_agreement: {
    missing_concepts: ["Active construction", "Original reasoning", "Evidence articulation"],
    route_options: [
      { level: "construction", label: "Build your own answer", description: "Construct the answer from scratch using only the evidence", suggested_evidence: [] },
      { level: "transfer", label: "Teach-back exercise", description: "Explain the concept in your own words with citations", suggested_evidence: [] },
    ],
    recommended_start: "construction",
  },
  unsupported_claim: {
    missing_concepts: ["Evidence citation", "Claim grounding"],
    route_options: [
      { level: "intermediate", label: "Evidence-citation drill", description: "Cite the exact evidence line for each claim", suggested_evidence: [] },
      { level: "construction", label: "Claim-to-evidence mapping", description: "Build a table mapping each claim to its source evidence", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
  formula_misread: {
    missing_concepts: ["Formula interpretation", "Term-by-term reading"],
    route_options: [
      { level: "basic", label: "Term-by-term reading", description: "Read each term in the formula and define it", suggested_evidence: [] },
      { level: "intermediate", label: "Derivation walkthrough", description: "Derive the formula step by step from first principles", suggested_evidence: [] },
    ],
    recommended_start: "basic",
  },
  implementation_misread: {
    missing_concepts: ["Code-to-behavior mapping", "Implementation intent"],
    route_options: [
      { level: "basic", label: "Line-by-line trace", description: "Trace each line and state what it does with evidence", suggested_evidence: [] },
      { level: "intermediate", label: "Behavior prediction", description: "Predict the behavior change if one line were modified", suggested_evidence: [] },
    ],
    recommended_start: "basic",
  },
  behavior_misread: {
    missing_concepts: ["Behavioral evidence interpretation", "Test oracle reading"],
    route_options: [
      { level: "intermediate", label: "Behavior re-trace", description: "Re-trace the behavior from test output to implementation", suggested_evidence: [] },
      { level: "construction", label: "Minimal reproduction", description: "Build a minimal reproduction of the observed behavior", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
  transfer_failure: {
    missing_concepts: ["Transfer ability", "Pattern abstraction"],
    route_options: [
      { level: "intermediate", label: "Pattern extraction", description: "Extract the abstract pattern from the current artifact", suggested_evidence: [] },
      { level: "transfer", label: "Transfer exercise", description: "Apply the pattern to a simpler artifact first", suggested_evidence: [] },
    ],
    recommended_start: "intermediate",
  },
};

export function buildPrerequisiteRoute(input: {
  gap: OwnershipGap;
  originalOperation: UserOperation;
  conceptSlice: ConceptSlice;
}): PrerequisiteRoute {
  const template = PREREQUISITE_TEMPLATES[input.gap.kind]
    ?? PREREQUISITE_TEMPLATES.missing_prerequisite;

  const routeOptions = template.route_options.map((option) => ({
    ...option,
    suggested_evidence: input.gap.artifact_evidence_refs
      .slice(0, 3)
      .map((ref) => ref.evidence_id),
  }));

  return {
    id: uniqueId("PRQ"),
    original_operation_id: input.originalOperation.id,
    concept_slice_id: input.conceptSlice.id,
    blocked_operation: input.originalOperation.kind,
    suspected_missing_concepts: template.missing_concepts,
    route_options: routeOptions,
    recommended_start: template.recommended_start,
    return_condition: `Return to operation '${input.originalOperation.id}' (${input.originalOperation.kind}) on concept slice '${input.conceptSlice.id}' after completing the recommended prerequisite route.`,
    created_at: now(),
  };
}
