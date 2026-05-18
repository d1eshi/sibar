import type {
  OwnershipGap,
  OwnershipGapKind,
  RepairAction,
  UserOperationKind,
  ConceptSlice,
} from "../runtime-deep-ownership.ts";
import { now, uniqueId } from "./shared.ts";

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
    promptTemplate: () =>
      "Start from the fundamentals. Define each key term using the cited evidence, then explain how they connect.",
  },
  vocabulary_only: {
    operation_kind: "explain",
    promptTemplate: (gap) =>
      `Go beyond terminology. Explain the mechanism in your own words, tracing why and how it works, using the cited evidence at ${gap.artifact_evidence_refs[0]?.file_path ?? "the source"}.`,
  },
  memorized_without_mechanism: {
    operation_kind: "trace",
    promptTemplate: () =>
      "Trace the causal chain through the cited evidence. For each step, explain why it happens (not just what), citing the specific line that shows the mechanism.",
  },
  wrong_mechanism: {
    operation_kind: "derive",
    promptTemplate: () =>
      "Re-derive the mechanism from the cited evidence. Compare your derivation to the original and identify exactly where your previous reasoning diverged.",
  },
  wrong_causal_model: {
    operation_kind: "derive",
    promptTemplate: () =>
      "Build the correct causal model from the cited evidence. Map each input-to-output relationship and verify against the source.",
  },
  test_oracle_misread: {
    operation_kind: "explain",
    promptTemplate: () =>
      "Re-read the test evidence. State what the test intends to verify (not what you assumed it verifies). Compare to the implementation evidence.",
  },
  ignored_counterevidence: {
    operation_kind: "trace",
    promptTemplate: (gap) =>
      `Reconcile your claims with the counterevidence at ${gap.artifact_evidence_refs.map((r) => `${r.file_path}:${r.start_line}`).join(", ")}. Trace where your claim and the evidence disagree, and revise.`,
  },
  false_confidence: {
    operation_kind: "trace",
    promptTemplate: () =>
      "Re-trace every claim at line-level granularity against the cited evidence before assigning confidence. Flag any claim you cannot verify with exact evidence.",
  },
  passive_agreement: {
    operation_kind: "explain",
    promptTemplate: () =>
      "Construct your own answer using only the cited evidence. Do not agree or disagree — build the explanation from scratch with citations.",
  },
  unsupported_claim: {
    operation_kind: "explain",
    promptTemplate: () =>
      "Cite the exact evidence (file, line range, excerpt) for each claim. Build a table mapping claims to evidence.",
  },
  formula_misread: {
    operation_kind: "derive",
    promptTemplate: () =>
      "Derive each term in the formula from the cited evidence. Show the step-by-step derivation with evidence citations.",
  },
  implementation_misread: {
    operation_kind: "trace",
    promptTemplate: () =>
      "Line-by-line trace through the implementation. For each line, state what it does and cite the evidence that confirms your reading.",
  },
  behavior_misread: {
    operation_kind: "predict",
    promptTemplate: () =>
      "Predict the output for a specific input, then verify against the test evidence. Identify where your prediction differed.",
  },
  transfer_failure: {
    operation_kind: "transfer",
    promptTemplate: () =>
      "Apply the same pattern to a nearby but different artifact. Show your work and cite where the pattern appears in the original evidence.",
  },
};

export function createRepairAction(input: {
  gap: OwnershipGap;
  conceptSlice: ConceptSlice;
}): RepairAction {
  const template = REPAIR_TEMPLATES[input.gap.kind]
    ?? REPAIR_TEMPLATES.shallow_trace;

  return {
    id: uniqueId("REP"),
    gap_id: input.gap.id,
    operation_kind: template.operation_kind,
    prompt: template.promptTemplate(input.gap),
    required_evidence: input.gap.artifact_evidence_refs.slice(0, 3),
    source_gap_id: input.gap.id,
    created_at: now(),
  };
}
