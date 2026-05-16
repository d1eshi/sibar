import { randomUUID } from "node:crypto";

import type {
  EvidenceRef,
  EvidenceCheck,
  EvidenceCheckResult,
  EvidenceInventoryEntry,
  OwnershipGap,
  OwnershipGapKind,
  RepairAction,
  ReadinessClaim,
  ReadinessStatus,
  UserOperationKind,
  UserAttempt,
  UserOperation,
  ThinkingArtifact,
  ConceptSlice,
  LoopState,
  RECOGNIZED_EVIDENCE_ROLES,
  RECOGNIZED_OPERATION_KINDS,
} from "./runtime-deep-ownership.ts";

import type { EvaluateAttemptOutput } from "./runtime-attempt-evaluation.ts";

// ── Prerequisite Route ───────────────────────────────────────────────

export type PrerequisiteRouteLevel =
  | "basic"
  | "intermediate"
  | "deep"
  | "construction"
  | "transfer";

export type PrerequisiteRouteOption = {
  level: PrerequisiteRouteLevel;
  label: string;
  description: string;
  suggested_evidence: string[];
};

export type PrerequisiteRoute = {
  id: string;
  original_operation_id: string;
  concept_slice_id: string;
  blocked_operation: UserOperationKind;
  suspected_missing_concepts: string[];
  route_options: PrerequisiteRouteOption[];
  recommended_start: PrerequisiteRouteLevel;
  return_condition: string;
  created_at: string;
};

// ── Re-evaluation ────────────────────────────────────────────────────

export type ReevaluationPrompt = {
  id: string;
  original_operation_id: string;
  original_gap_id: string;
  nearby_operation_kind: UserOperationKind;
  prompt: string;
  required_evidence: string[];
  success_criteria: string[];
  avoid_repeating_prompt: string;
  created_at: string;
};

// ── Misconception Memory ─────────────────────────────────────────────

export type MisconceptionStatus =
  | "active"
  | "resolved"
  | "dormant"
  | "monitored";

export type MisconceptionRepairEntry = {
  repair_action_id: string;
  attempted_at: string;
  outcome: "resolved" | "persisted" | "partial";
};

export type MisconceptionMemory = {
  id: string;
  label: string;
  concept_id: string;
  first_seen_at: string;
  repeated_count: number;
  domains_seen: string[];
  evidence: EvidenceRef[];
  repair_history: MisconceptionRepairEntry[];
  current_status: MisconceptionStatus;
  last_seen_at: string;
};

// ── Deep Ownership Memory ────────────────────────────────────────────

export type MemoryAnswerOutcome =
  | "confirmed"
  | "gap"
  | "partial"
  | "contradiction"
  | "insufficient_evidence";

export type MemoryAnswerEntry = {
  answer_id: string;
  attempt_id: string;
  operation_id: string;
  concept_slice_id: string;
  answer_text: string;
  outcome: MemoryAnswerOutcome;
  confidence: "low" | "medium" | "high";
  had_declared_uncertainty: boolean;
  created_at: string;
  evidence: EvidenceRef[];
};

export type MemoryOperationEntry = {
  operation_id: string;
  operation_kind: UserOperationKind;
  concept_slice_id: string;
  is_confirmed: boolean;
  attempts_count: number;
  last_attempt_at: string | null;
  last_success_at: string | null;
};

export type MemoryConceptEntry = {
  concept_slice_id: string;
  label: string;
  confirmed_operations: UserOperationKind[];
  open_gaps: string[];
  misconceptions: string[];
  last_successful_attempt_at: string | null;
  retention_due_at: string | null;
  transfer_due_at: string | null;
};

export type DeepOwnershipMemory = {
  id: string;
  loop_id: string;
  generated_at: string;
  concept_entries: MemoryConceptEntry[];
  operation_entries: MemoryOperationEntry[];
  answer_history: MemoryAnswerEntry[];
  open_gaps: OwnershipGap[];
  repair_actions: RepairAction[];
  misconception_memory: MisconceptionMemory[];
  next_review_at: string | null;
};

// ── Builder Helpers ──────────────────────────────────────────────────

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

function now(): string {
  return new Date().toISOString();
}

function addDays(timestamp: string, days: number): string {
  return new Date(new Date(timestamp).getTime() + days * 86400000).toISOString();
}

const NON_REPEATING_ALTERNATIVES: Record<UserOperationKind, UserOperationKind[]> = {
  explain: ["trace", "teach", "derive"],
  trace: ["explain", "predict", "derive"],
  derive: ["predict", "explain", "trace"],
  predict: ["derive", "trace", "build"],
  build: ["modify", "debug", "predict"],
  modify: ["build", "debug", "transfer"],
  debug: ["trace", "modify", "predict"],
  transfer: ["teach", "build", "explain"],
  teach: ["explain", "trace", "transfer"],
};

// ── Prerequisite Route Builder ───────────────────────────────────────

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

/**
 * Build a prerequisite route that returns the user to the original operation
 * after completing the missing concept ladder. The route is constructed from
 * the gap kind and references the original operation and evidence.
 *
 * Satisfies VAL-LOOP-015: prerequisite routes return to original operation.
 */
export function buildPrerequisiteRoute(input: {
  gap: OwnershipGap;
  originalOperation: UserOperation;
  conceptSlice: ConceptSlice;
  evidenceInventory?: EvidenceInventoryEntry[];
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
    id: `PRQ-${randomUUID().slice(0, 8)}`,
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

// ── Ownership Gap Builder ────────────────────────────────────────────

const DEFAULT_GAP_SEVERITY: Record<string, "critical" | "important" | "later"> = {
  false_confidence: "critical",
  ignored_counterevidence: "critical",
  wrong_causal_model: "critical",
  wrong_mechanism: "important",
  test_oracle_misread: "important",
  implementation_misread: "important",
  behavior_misread: "important",
  shallow_trace: "important",
  missing_prerequisite: "important",
  vocabulary_only: "important",
  memorized_without_mechanism: "important",
  transfer_failure: "later",
  formula_misread: "later",
  unsupported_claim: "later",
  passive_agreement: "later",
};

/**
 * Create an OwnershipGap that cites both user attempt and artifact evidence.
 * Every gap requires a user_attempt_ref and at least one artifact_evidence_refs
 * entry. Gaps without both sides fail closed.
 *
 * Satisfies VAL-PED-001: gaps require both user and artifact evidence.
 */
export function createOwnershipGap(input: {
  evalOutput: EvaluateAttemptOutput;
  conceptSliceId: string;
  userAttempt: UserAttempt;
  artifact: ThinkingArtifact;
}): OwnershipGap | null {
  const { evidenceCheck, gapKind } = input.evalOutput;

  if (!gapKind || evidenceCheck.result === "confirmed") {
    return null;
  }

  const artifactEvidence = evidenceCheck.cited_evidence.length > 0
    ? evidenceCheck.cited_evidence
    : input.artifact.source_evidence.slice(0, 3);

  if (artifactEvidence.length === 0) {
    // Fail closed: can't create gap without both user attempt and artifact evidence
    return null;
  }

  const severity = DEFAULT_GAP_SEVERITY[gapKind] ?? "important";
  const evidenceDescription = buildGapEvidence(evidenceCheck, gapKind);

  return {
    id: `GAP-${randomUUID().slice(0, 8)}`,
    concept_slice_id: input.conceptSliceId,
    kind: gapKind,
    user_attempt_ref: input.userAttempt.id,
    artifact_evidence_refs: artifactEvidence.slice(0, 5),
    evidence: evidenceDescription,
    severity,
    blocks_readiness: severity === "critical" || severity === "important",
    created_at: now(),
  };
}

function buildGapEvidence(ec: EvidenceCheck, gapKind: OwnershipGapKind): string {
  const parts: string[] = [];

  if (ec.observed_claims.length > 0) {
    parts.push(`Observed: ${ec.observed_claims.join("; ")}`);
  }
  if (ec.missing_claims.length > 0) {
    parts.push(`Missing: ${ec.missing_claims.slice(0, 3).join("; ")}`);
  }
  if (ec.contradicted_claims.length > 0) {
    parts.push(`Contradicted: ${ec.contradicted_claims.slice(0, 3).join("; ")}`);
  }
  if (ec.unsupported_claims.length > 0) {
    parts.push(`Unsupported: ${ec.unsupported_claims.slice(0, 3).join("; ")}`);
  }

  parts.push(`Gap kind: ${gapKind}`);

  return parts.join(". ");
}

// ── Repair Action Builder ─────────────────────────────────────────────

const REPAIR_TEMPLATES: Record<OwnershipGapKind, {
  operation_kind: UserOperationKind;
  promptTemplate: (gap: OwnershipGap) => string;
}> = {
  shallow_trace: {
    operation_kind: "trace",
    promptTemplate: (gap) =>
      `Trace the full flow from the cited evidence (${gap.artifact_evidence_refs.map((r) => `${r.file_path}:${r.start_line}-${r.end_line}`).join(", ")}) to each claim you made. Show every intermediate step and name the file/line that supports each transition.`,
  },
  missing_prerequisite: {
    operation_kind: "explain",
    promptTemplate: (gap) =>
      `Start from the fundamentals. Define each key term using the cited evidence, then explain how they connect.`,
  },
  vocabulary_only: {
    operation_kind: "explain",
    promptTemplate: (gap) =>
      `Go beyond terminology. Explain the mechanism in your own words, tracing why and how it works, using the cited evidence at ${gap.artifact_evidence_refs[0]?.file_path ?? "the source"}.`,
  },
  memorized_without_mechanism: {
    operation_kind: "trace",
    promptTemplate: (gap) =>
      `Trace the causal chain through the cited evidence. For each step, explain why it happens (not just what), citing the specific line that shows the mechanism.`,
  },
  wrong_mechanism: {
    operation_kind: "derive",
    promptTemplate: (gap) =>
      `Re-derive the mechanism from the cited evidence. Compare your derivation to the original and identify exactly where your previous reasoning diverged.`,
  },
  wrong_causal_model: {
    operation_kind: "derive",
    promptTemplate: (gap) =>
      `Build the correct causal model from the cited evidence. Map each input-to-output relationship and verify against the source.`,
  },
  test_oracle_misread: {
    operation_kind: "explain",
    promptTemplate: (gap) =>
      `Re-read the test evidence. State what the test intends to verify (not what you assumed it verifies). Compare to the implementation evidence.`,
  },
  ignored_counterevidence: {
    operation_kind: "trace",
    promptTemplate: (gap) =>
      `Reconcile your claims with the counterevidence at ${gap.artifact_evidence_refs.map((r) => `${r.file_path}:${r.start_line}`).join(", ")}. Trace where your claim and the evidence disagree, and revise.`,
  },
  false_confidence: {
    operation_kind: "trace",
    promptTemplate: (gap) =>
      `Re-trace every claim at line-level granularity against the cited evidence before assigning confidence. Flag any claim you cannot verify with exact evidence.`,
  },
  passive_agreement: {
    operation_kind: "explain",
    promptTemplate: (gap) =>
      `Construct your own answer using only the cited evidence. Do not agree or disagree — build the explanation from scratch with citations.`,
  },
  unsupported_claim: {
    operation_kind: "explain",
    promptTemplate: (gap) =>
      `Cite the exact evidence (file, line range, excerpt) for each claim. Build a table mapping claims to evidence.`,
  },
  formula_misread: {
    operation_kind: "derive",
    promptTemplate: (gap) =>
      `Derive each term in the formula from the cited evidence. Show the step-by-step derivation with evidence citations.`,
  },
  implementation_misread: {
    operation_kind: "trace",
    promptTemplate: (gap) =>
      `Line-by-line trace through the implementation. For each line, state what it does and cite the evidence that confirms your reading.`,
  },
  behavior_misread: {
    operation_kind: "predict",
    promptTemplate: (gap) =>
      `Predict the output for a specific input, then verify against the test evidence. Identify where your prediction differed.`,
  },
  transfer_failure: {
    operation_kind: "transfer",
    promptTemplate: (gap) =>
      `Apply the same pattern to a nearby but different artifact. Show your work and cite where the pattern appears in the original evidence.`,
  },
};

/**
 * Create a concrete, evidence-seeking repair action linked to a detected gap.
 * The repair action specifies an operation kind, a prompt that asks the user
 * to perform a concrete operation, and required evidence from the gap.
 *
 * Satisfies VAL-PED-002: repair actions are concrete and evidence-seeking.
 */
export function createRepairAction(input: {
  gap: OwnershipGap;
  conceptSlice: ConceptSlice;
}): RepairAction {
  const template = REPAIR_TEMPLATES[input.gap.kind]
    ?? REPAIR_TEMPLATES.shallow_trace;

  return {
    id: `REP-${randomUUID().slice(0, 8)}`,
    gap_id: input.gap.id,
    operation_kind: template.operation_kind,
    prompt: template.promptTemplate(input.gap),
    required_evidence: input.gap.artifact_evidence_refs.slice(0, 3),
    source_gap_id: input.gap.id,
    created_at: now(),
  };
}

// ── Re-evaluation Generation ─────────────────────────────────────────

/**
 * Generate a re-evaluation prompt that is nearby (same concept slice, same
 * required evidence), uses a different operation kind to avoid repeating the
 * exact same prompt, and preserves all required evidence from the original gap.
 *
 * "Nearby" means: same concept slice, same required evidence, but a
 * non-repeating prompt using a nearby operation kind. The re-evaluation
 * prompt must not be the same as the original operation prompt.
 *
 * Satisfies VAL-LOOP-012: re-evaluation is nearby, evidence-bound, and non-repeating.
 */
export function generateReevaluation(input: {
  originalOperation: UserOperation;
  gap: OwnershipGap;
  conceptSlice: ConceptSlice;
  artifact: ThinkingArtifact;
}): ReevaluationPrompt {
  const alternatives = NON_REPEATING_ALTERNATIVES[input.originalOperation.kind]
    ?? ["explain", "trace", "predict"];

  const nearbyKind = alternatives.find((k) => k !== input.originalOperation.kind)
    ?? alternatives[0];

  const requiredEvidence = [
    ...new Set([
      ...input.originalOperation.required_evidence,
      ...input.gap.artifact_evidence_refs.map((r) => r.evidence_id),
      ...input.artifact.success_criteria.slice(0, 2).map(() => input.gap.artifact_evidence_refs[0]?.evidence_id ?? ""),
    ]),
  ].filter(Boolean).slice(0, 5);

  return {
    id: `REV-${randomUUID().slice(0, 8)}`,
    original_operation_id: input.originalOperation.id,
    original_gap_id: input.gap.id,
    nearby_operation_kind: nearbyKind,
    prompt: buildReevaluationPrompt(input.originalOperation, input.gap, nearbyKind),
    required_evidence: requiredEvidence,
    success_criteria: [
      `Demonstrates understanding of the concept previously gapped as '${input.gap.kind}'`,
      `Cites evidence ${requiredEvidence.join(", ")} correctly`,
      `Shows revised reasoning that addresses the gap`,
    ],
    avoid_repeating_prompt: input.originalOperation.prompt,
    created_at: now(),
  };
}

function buildReevaluationPrompt(
  originalOp: UserOperation,
  gap: OwnershipGap,
  nearbyKind: UserOperationKind,
): string {
  const operationVerb: Record<UserOperationKind, string> = {
    explain: "Explain",
    trace: "Trace",
    derive: "Derive",
    predict: "Predict",
    build: "Build",
    modify: "Modify",
    debug: "Debug",
    transfer: "Transfer",
    teach: "Teach",
  };

  return `${operationVerb[nearbyKind]} how the gap '${gap.kind}' was resolved using the evidence at ${gap.artifact_evidence_refs.map((r) => `${r.file_path}:${r.start_line}`).join(", ")}. Do NOT repeat your previous answer. Show new understanding that addresses the missing claims: ${gap.evidence.slice(0, 120)}.`;
}

// ── Readiness Claim Builder ──────────────────────────────────────────

/**
 * Create a scoped readiness claim tied to a specific operation and concept slice.
 * Readiness never claims whole-repo, unrelated-file, or model-explanation-based mastery.
 *
 * Satisfies VAL-PED-003: readiness is scoped to one operation and concept slice.
 */
export function createReadinessClaim(input: {
  conceptSlice: ConceptSlice;
  operation: UserOperation;
  status?: ReadinessStatus;
  blockingGaps?: string[];
  supportingEvidence?: { evidence_id: string }[];
  confidence?: "low" | "medium" | "high";
}): ReadinessClaim {
  const status = input.status ?? "unknown";
  const blockingGaps = input.blockingGaps ?? [];
  const scope = `Operation '${input.operation.kind}' on concept slice '${input.conceptSlice.label}' within the declared artifact boundary`;

  return {
    id: `RC-${randomUUID().slice(0, 8)}`,
    concept_slice_id: input.conceptSlice.id,
    operation_id: input.operation.id,
    status,
    scope,
    ready_to_explain: status === "ready",
    ready_to_trace: status === "ready",
    ready_to_derive: status === "ready",
    ready_to_predict: status === "ready",
    ready_to_build: false, // Always false unless explicitly tested
    ready_to_modify: false,
    ready_to_debug: false,
    ready_to_transfer: false,
    ready_to_teach: false,
    blocked_claims: blockingGaps.length > 0
      ? blockingGaps.map((g) => `Blocked by gap: ${g}`)
      : [],
    supporting_evidence: input.supportingEvidence ?? [],
    blocking_gaps: blockingGaps,
    confidence: input.confidence ?? "low",
    generated_at: now(),
  };
}

/**
 * Advance readiness ONLY after a successful attempt or re-evaluation.
 * Readiness does not advance from hints, prerequisites, repair actions,
 * commands, or passive signals alone.
 *
 * Satisfies VAL-PED-007: readiness waits for successful re-evaluation.
 */
export function advanceReadinessAfterReevaluation(input: {
  currentClaim: ReadinessClaim;
  reevaluationSucceeded: boolean;
  resolvedGapIds: string[];
  successfulAttempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
}): ReadinessClaim {
  if (!input.reevaluationSucceeded) {
    // Readiness does NOT advance
    return {
      ...input.currentClaim,
      generated_at: now(),
      // Keep existing blocked state
    };
  }

  // Only advance to "ready" for explain/trace/derive/predict
  // Build/modify/debug/transfer/teach require separate explicit testing
  const remainingBlockingGaps = input.currentClaim.blocking_gaps
    .filter((g) => !input.resolvedGapIds.includes(g));

  const newStatus: ReadinessStatus = remainingBlockingGaps.length === 0
    ? "ready"
    : "limited";

  return {
    ...input.currentClaim,
    id: `RC-${randomUUID().slice(0, 8)}`,
    status: newStatus,
    blocked_claims: remainingBlockingGaps.length > 0
      ? remainingBlockingGaps.map((g) => `Remaining gap: ${g}`)
      : [],
    blocking_gaps: remainingBlockingGaps,
    confidence: input.evidenceCheck.result === "confirmed" ? "high" : "medium",
    supporting_evidence: [
      ...input.currentClaim.supporting_evidence,
      { evidence_id: input.successfulAttempt.id },
    ],
    ready_to_explain: newStatus === "ready",
    ready_to_trace: newStatus === "ready",
    ready_to_derive: newStatus === "ready",
    ready_to_predict: newStatus === "ready",
    generated_at: now(),
  };
}

// ── Misconception Memory ──────────────────────────────────────────────

/**
 * Track a misconception across multiple attempts. If the same misconception
 * appears again, update its repeat count and repair history rather than
 * treating it as a new, isolated event.
 *
 * Satisfies VAL-PED-009: misconception memory is durable.
 */
export function trackMisconception(input: {
  existingMisconceptions: MisconceptionMemory[];
  gap: OwnershipGap;
  conceptSliceId: string;
  conceptLabel: string;
  evidenceRefs: EvidenceRef[];
  repairActionId: string;
}): MisconceptionMemory[] {
  const updated = [...input.existingMisconceptions];
  const label = `${input.conceptLabel}: ${input.gap.kind}`;
  const existing = updated.find((m) =>
    m.label === label && m.concept_id === input.conceptSliceId,
  );

  if (existing) {
    // Update durable misconception
    existing.repeated_count += 1;
    existing.last_seen_at = now();
    existing.domains_seen = [
      ...new Set([...existing.domains_seen, input.conceptSliceId]),
    ];
    existing.evidence = [
      ...existing.evidence,
      ...input.evidenceRefs.filter(
        (ref) => !existing.evidence.some((e) => e.evidence_id === ref.evidence_id),
      ),
    ];
    existing.repair_history.push({
      repair_action_id: input.repairActionId,
      attempted_at: now(),
      outcome: "persisted",
    });

    if (existing.repeated_count >= 3 && existing.current_status === "active") {
      existing.current_status = "monitored";
    }
  } else {
    // Create new misconception memory entry
    updated.push({
      id: `MIS-${randomUUID().slice(0, 8)}`,
      label,
      concept_id: input.conceptSliceId,
      first_seen_at: now(),
      repeated_count: 1,
      domains_seen: [input.conceptSliceId],
      evidence: input.evidenceRefs,
      repair_history: [{
        repair_action_id: input.repairActionId,
        attempted_at: now(),
        outcome: "persisted",
      }],
      current_status: "active",
      last_seen_at: now(),
    });
  }

  return updated;
}

// ── Deep Ownership Memory Builder ─────────────────────────────────────

/**
 * Build a DeepOwnershipMemory record that tracks demonstrated operations
 * at concept/operation granularity. Confirmed traces do not imply modify,
 * build, teach, transfer, or whole-repo readiness.
 *
 * Satisfies VAL-PED-008: memory tracks demonstrated operations.
 */
export function buildDeepOwnershipMemory(input: {
  loopId: string;
  conceptSlice: ConceptSlice;
  answerHistory: MemoryAnswerEntry[];
  gaps: OwnershipGap[];
  repairActions: RepairAction[];
  misconceptionMemory: MisconceptionMemory[];
}): DeepOwnershipMemory {
  const conceptLabel = input.conceptSlice.label;
  const conceptSliceId = input.conceptSlice.id;

  // Group answers by operation
  const answersByOp = new Map<string, MemoryAnswerEntry[]>();
  for (const answer of input.answerHistory) {
    const list = answersByOp.get(answer.operation_id) ?? [];
    list.push(answer);
    answersByOp.set(answer.operation_id, list);
  }

  // Build operation entries
  const operationEntries: MemoryOperationEntry[] = [];
  for (const [opId, answers] of answersByOp) {
    const confirmed = answers.some((a) => a.outcome === "confirmed");
    const lastSuccess = answers
      .filter((a) => a.outcome === "confirmed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastAttempt = answers
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    operationEntries.push({
      operation_id: opId,
      operation_kind: answers[0]?.outcome === "gap" ? "trace" : "explain",
      concept_slice_id: conceptSliceId,
      is_confirmed: confirmed,
      attempts_count: answers.length,
      last_attempt_at: lastAttempt?.created_at ?? null,
      last_success_at: lastSuccess?.created_at ?? null,
    });
  }

  // Build concept entry
  const confirmedOps = operationEntries
    .filter((op) => op.is_confirmed)
    .map((op) => op.operation_kind);
  const lastSuccessAt = operationEntries
    .filter((op) => op.last_success_at)
    .map((op) => op.last_success_at!)
    .sort()
    .pop() ?? null;

  const conceptEntry: MemoryConceptEntry = {
    concept_slice_id: conceptSliceId,
    label: conceptLabel,
    confirmed_operations: [...new Set(confirmedOps)],
    open_gaps: input.gaps.map((g) => g.id),
    misconceptions: input.misconceptionMemory.map((m) => m.id),
    last_successful_attempt_at: lastSuccessAt,
    retention_due_at: lastSuccessAt ? addDays(lastSuccessAt, 7) : null,
    transfer_due_at: lastSuccessAt ? addDays(lastSuccessAt, 14) : null,
  };

  return {
    id: `MEM-${randomUUID().slice(0, 8)}`,
    loop_id: input.loopId,
    generated_at: now(),
    concept_entries: [conceptEntry],
    operation_entries: operationEntries,
    answer_history: input.answerHistory,
    open_gaps: input.gaps,
    repair_actions: input.repairActions,
    misconception_memory: input.misconceptionMemory,
    next_review_at: conceptEntry.retention_due_at,
  };
}

// ── Full Pipeline ────────────────────────────────────────────────────

export type LoopResult = {
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gap: OwnershipGap | null;
  repairAction: RepairAction | null;
  prerequisiteRoute: PrerequisiteRoute | null;
  reevaluationPrompt: ReevaluationPrompt | null;
  readinessClaim: ReadinessClaim;
  misconceptionMemory: MisconceptionMemory[];
  memory: DeepOwnershipMemory;
  memoryAnswerEntry: MemoryAnswerEntry;
};

/**
 * Full pipeline: attempt → evidence check → gap → repair → readiness → memory.
 * Uses pre-evaluated evidence check results (from evaluateAttempt) to produce
 * all downstream loop objects with stable evidence identity.
 *
 * Satisfies VAL-CROSS-006: attempt evaluation feeds readiness and repair.
 */
export function evaluateFullLoop(input: {
  loopId: string;
  userAttempt: UserAttempt;
  evalOutput: EvaluateAttemptOutput;
  operation: UserOperation;
  artifact: ThinkingArtifact;
  conceptSlice: ConceptSlice;
  existingMisconceptions?: MisconceptionMemory[];
  existingGaps?: OwnershipGap[];
  existingAnswerHistory?: MemoryAnswerEntry[];
}): LoopResult {
  const { evidenceCheck, gapKind, isOverconfident, hasDeclaredUncertainty } = input.evalOutput;

  // Step 1: Create gap (if any)
  const gap = createOwnershipGap({
    evalOutput: input.evalOutput,
    conceptSliceId: input.conceptSlice.id,
    userAttempt: input.userAttempt,
    artifact: input.artifact,
  });

  // Step 2: Create repair action (if gap exists)
  const repairAction = gap
    ? createRepairAction({ gap, conceptSlice: input.conceptSlice })
    : null;

  // Step 3: Build prerequisite route (if gap exists and not false_confidence)
  const prerequisiteRoute = gap && gap.kind !== "false_confidence"
    ? buildPrerequisiteRoute({
        gap,
        originalOperation: input.operation,
        conceptSlice: input.conceptSlice,
      })
    : null;

  // Step 4: Generate re-evaluation prompt (if gap exists)
  const reevaluationPrompt = gap
    ? generateReevaluation({
        originalOperation: input.operation,
        gap,
        conceptSlice: input.conceptSlice,
        artifact: input.artifact,
      })
    : null;

  // Step 5: Create readiness claim
  const readinessClaim = createReadinessClaim({
    conceptSlice: input.conceptSlice,
    operation: input.operation,
    status: gap ? (gap.blocks_readiness ? "blocked" : "limited") : "ready",
    blockingGaps: gap ? [gap.id] : [],
    supportingEvidence: [
      ...(gap ? gap.artifact_evidence_refs.map((r) => ({ evidence_id: r.evidence_id })) : []),
      { evidence_id: input.userAttempt.id },
    ],
    confidence: gap && isOverconfident
      ? "low"
      : gap
        ? "medium"
        : "high",
  });

  // Step 6: Track misconceptions
  const misconceptionMemory = gap
    ? trackMisconception({
        existingMisconceptions: input.existingMisconceptions ?? [],
        gap,
        conceptSliceId: input.conceptSlice.id,
        conceptLabel: input.conceptSlice.label,
        evidenceRefs: gap.artifact_evidence_refs,
        repairActionId: repairAction?.id ?? "no-repair",
      })
    : (input.existingMisconceptions ?? []);

  // Step 7: Build memory answer entry
  const memoryAnswerEntry: MemoryAnswerEntry = {
    answer_id: `MA-${randomUUID().slice(0, 8)}`,
    attempt_id: input.userAttempt.id,
    operation_id: input.operation.id,
    concept_slice_id: input.conceptSlice.id,
    answer_text: input.userAttempt.answer_text,
    outcome: evidenceCheck.result === "confirmed"
      ? "confirmed"
      : evidenceCheck.result === "partial"
        ? "partial"
        : evidenceCheck.result === "contradiction"
          ? "contradiction"
          : evidenceCheck.result === "insufficient_evidence"
            ? "insufficient_evidence"
            : "gap",
    confidence: input.userAttempt.declared_confidence,
    had_declared_uncertainty: hasDeclaredUncertainty,
    created_at: input.userAttempt.created_at,
    evidence: evidenceCheck.cited_evidence,
  };

  // Step 8: Build memory
  const memory = buildDeepOwnershipMemory({
    loopId: input.loopId,
    conceptSlice: input.conceptSlice,
    answerHistory: [...(input.existingAnswerHistory ?? []), memoryAnswerEntry],
    gaps: [...(input.existingGaps ?? []), ...(gap ? [gap] : [])],
    repairActions: repairAction ? [repairAction] : [],
    misconceptionMemory,
  });

  return {
    attempt: input.userAttempt,
    evidenceCheck,
    gap,
    repairAction,
    prerequisiteRoute,
    reevaluationPrompt,
    readinessClaim,
    misconceptionMemory,
    memory,
    memoryAnswerEntry,
  };
}

// ── Evidence Identity Validation ─────────────────────────────────────

/**
 * Validate that evidence IDs remain stable and consistent across all loop objects:
 * fixture → artifact → operation → attempt → evidence check → gap → repair → readiness → memory.
 *
 * Returns a list of issues where evidence refs are missing, inconsistent, or
 * reference IDs not present in the inventory.
 *
 * Satisfies VAL-CROSS-009: evidence identity is stable across the loop.
 */
export function validateEvidenceIdentity(input: {
  evidenceInventory: EvidenceInventoryEntry[];
  artifact: ThinkingArtifact;
  operation: UserOperation;
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gap: OwnershipGap | null;
  repairAction: RepairAction | null;
  readinessClaim: ReadinessClaim;
  prerequisiteRoute: PrerequisiteRoute | null;
  reevaluationPrompt: ReevaluationPrompt | null;
}): { stable: boolean; issues: string[] } {
  const issues: string[] = [];
  const validIds = new Set(input.evidenceInventory.map((e) => e.id));

  function checkRefs(label: string, refs: { evidence_id: string }[]): void {
    for (const ref of refs) {
      if (!ref.evidence_id) {
        issues.push(`${label}: evidence ref missing evidence_id`);
      } else if (!validIds.has(ref.evidence_id)) {
        issues.push(`${label}: evidence_id '${ref.evidence_id}' not found in inventory`);
      }
    }
  }

  function checkIdRefs(label: string, ids: string[]): void {
    for (const id of ids) {
      if (!validIds.has(id)) {
        issues.push(`${label}: evidence_id '${id}' not found in inventory`);
      }
    }
  }

  // Check artifact source evidence
  checkRefs("artifact.source_evidence", input.artifact.source_evidence);

  // Check operation required evidence
  checkIdRefs("operation.required_evidence", input.operation.required_evidence);

  // Check attempt selected evidence
  for (const evId of input.attempt.selected_evidence) {
    if (!validIds.has(evId)) {
      issues.push(`attempt.selected_evidence: evidence_id '${evId}' not found in inventory`);
    }
  }

  // Check evidence check cited evidence
  checkRefs("evidenceCheck.cited_evidence", input.evidenceCheck.cited_evidence);
  // artifact_counterevidence may reference hidden_solution_evidence refs which
  // are deliberately not in the public evidence inventory (they're hidden).
  // Only check that they have a valid structure, not that they're in inventory.

  // Check gap artifact evidence refs
  if (input.gap) {
    checkRefs("gap.artifact_evidence_refs", input.gap.artifact_evidence_refs);
    // Verify gap references a user attempt (it may be a previous attempt,
    // not necessarily the one passed to this validation)
    if (!input.gap.user_attempt_ref || typeof input.gap.user_attempt_ref !== "string") {
      issues.push("gap.user_attempt_ref is missing or invalid");
    }
  }

  // Check repair action required evidence
  if (input.repairAction) {
    checkRefs("repairAction.required_evidence", input.repairAction.required_evidence);
    // Verify repair references the gap
    if (input.gap && input.repairAction.source_gap_id !== input.gap.id) {
      issues.push(`repairAction.source_gap_id '${input.repairAction.source_gap_id}' does not match gap.id '${input.gap?.id}'`);
    }
  }

  // Check readiness supporting evidence — only check evidence format,
  // not whether they're in inventory (they may include attempt IDs which
  // are user evidence, not file evidence)
  for (const ref of input.readinessClaim.supporting_evidence) {
    if (!ref.evidence_id) {
      issues.push("readinessClaim.supporting_evidence: ref missing evidence_id");
    }
  }
  // Verify readiness blocking gaps match
  if (input.gap && input.readinessClaim.blocking_gaps.length > 0
    && !input.readinessClaim.blocking_gaps.includes(input.gap.id)) {
    issues.push(`readinessClaim.blocking_gaps does not include gap.id '${input.gap.id}'`);
  }

  // Check prerequisite route references original operation
  if (input.prerequisiteRoute && input.operation) {
    if (input.prerequisiteRoute.original_operation_id !== input.operation.id) {
      issues.push(`prerequisiteRoute.original_operation_id '${input.prerequisiteRoute.original_operation_id}' does not match operation.id '${input.operation.id}'`);
    }
  }

  // Check re-evaluation references original operation
  if (input.reevaluationPrompt && input.operation) {
    if (input.reevaluationPrompt.original_operation_id !== input.operation.id) {
      issues.push(`reevaluationPrompt.original_operation_id '${input.reevaluationPrompt.original_operation_id}' does not match operation.id '${input.operation.id}'`);
    }
    checkIdRefs("reevaluationPrompt.required_evidence", input.reevaluationPrompt.required_evidence);
  }

  return {
    stable: issues.length === 0,
    issues,
  };
}

// ── Convenience: Attempt → Readiness Pipeline ─────────────────────────

/**
 * Convenience wrapper that runs the full pipeline and validates evidence
 * identity stability at the end. Throws if evidence identity breaks.
 */
export function attemptToReadiness(input: {
  loopId: string;
  attempt: UserAttempt;
  evalOutput: EvaluateAttemptOutput;
  operation: UserOperation;
  artifact: ThinkingArtifact;
  conceptSlice: ConceptSlice;
  evidenceInventory: EvidenceInventoryEntry[];
  existingMisconceptions?: MisconceptionMemory[];
  existingGaps?: OwnershipGap[];
  existingAnswerHistory?: MemoryAnswerEntry[];
}): LoopResult & { evidenceStable: boolean; evidenceIssues: string[] } {
  const result = evaluateFullLoop({
    loopId: input.loopId,
    userAttempt: input.attempt,
    evalOutput: input.evalOutput,
    operation: input.operation,
    artifact: input.artifact,
    conceptSlice: input.conceptSlice,
    existingMisconceptions: input.existingMisconceptions,
    existingGaps: input.existingGaps,
    existingAnswerHistory: input.existingAnswerHistory,
  });

  const identityCheck = validateEvidenceIdentity({
    evidenceInventory: input.evidenceInventory,
    artifact: input.artifact,
    operation: input.operation,
    attempt: input.attempt,
    evidenceCheck: result.evidenceCheck,
    gap: result.gap,
    repairAction: result.repairAction,
    readinessClaim: result.readinessClaim,
    prerequisiteRoute: result.prerequisiteRoute,
    reevaluationPrompt: result.reevaluationPrompt,
  });

  if (!identityCheck.stable) {
    throw new Error(
      `Evidence identity is NOT stable: ${identityCheck.issues.join("; ")}`,
    );
  }

  return { ...result, evidenceStable: true, evidenceIssues: [] };
}
