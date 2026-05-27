import type { ValidationIssue, ValidationResult } from "../pedagogy-core/index.ts";

export type WorkspaceIntentSchema =
  | "WorkspaceIntent"
  | "SourceIntake"
  | "WorkspacePlan"
  | "SessionPlan"
  | "EvidencePlan";

export type SourceIntakeKind =
  | "url"
  | "pasted_text"
  | "paper"
  | "repo"
  | "mixed"
  | "unknown";

export type WorkspaceIntentInput = {
  userAmbition?: string;
  workspaceTitle?: string;
  tryingToBuildOrUnderstand?: string;
  sourceInput?: string;
  whyItMatters?: string;
  alreadyKnow?: string | string[];
  notKnowYet?: string | string[];
  desiredOutput?: string | string[];
  createdAt?: string;
};

export type SourceIntakeInput = {
  rawInput?: string;
  title?: string;
  sourceType?: SourceIntakeKind;
  capturedAt?: string;
};

export type SourceIntake = {
  schema: "SourceIntake";
  version: string;
  source_intake_id: string;
  source_type: SourceIntakeKind;
  title: string;
  raw_input: string;
  url: string | null;
  extracted_signals: string[];
  captured_at: string;
};

export type WorkspaceIntent = {
  schema: "WorkspaceIntent";
  version: string;
  intent_id: string;
  user_ambition: string;
  workspace_title: string;
  trying_to_build_or_understand: string;
  source_intake: SourceIntake;
  why_this_matters: string;
  knowns: string[];
  unknowns: string[];
  desired_outputs: string[];
  created_at: string;
};

export type WorkspacePlanNodeResource = {
  kind: string;
  title: string;
  source: string;
  action: string;
};

export type WorkspacePlanMiniNode = {
  id: string;
  title: string;
  goal: string;
  reader_prompt: string;
  resources: WorkspacePlanNodeResource[];
};

export type WorkspacePlanNode = {
  schema: "WorkspaceNodePlan";
  node_id: string;
  title: string;
  focus: string;
  operation_target: "read" | "build" | "explain" | "benchmark" | "publish";
  prerequisite_node_ids: string[];
  session_ids: string[];
  evidence_outputs: string[];
  mini_nodes: WorkspacePlanMiniNode[];
};

export type SessionPlan = {
  schema: "SessionPlan";
  version: string;
  session_id: string;
  workspace_id: string;
  node_id: string;
  title: string;
  focus: string;
  operation_target: "read" | "build" | "explain" | "benchmark" | "publish";
  outputs: string[];
  required_evidence: string[];
  success_criteria: string[];
};

export type EvidenceRequirement = {
  id: string;
  label: string;
  artifact_kind: "repo" | "notes" | "notebook" | "benchmark" | "writeup" | "source";
  acceptance_criteria: string[];
};

export type EvidencePlan = {
  schema: "EvidencePlan";
  version: string;
  evidence_plan_id: string;
  workspace_id: string;
  intent_id: string;
  required_evidence: EvidenceRequirement[];
  minimum_evidence_count: number;
  readiness_checks: string[];
};

export type WorkspacePlan = {
  schema: "WorkspacePlan";
  version: string;
  plan_id: string;
  intent_id: string;
  user_ambition: {
    statement: string;
  };
  workspace: {
    workspace_id: string;
    title: string;
    intent: string;
  };
  source_intake: SourceIntake;
  outputs: string[];
  nodes: WorkspacePlanNode[];
  session_plan: SessionPlan;
  evidence_plan: EvidencePlan;
  generated_at: string;
  compiled_by: "deterministic-builder" | "llm";
};

export type WorkspaceIntentFlow = {
  contract_order: readonly WorkspaceIntentSchema[];
  workspace_intent: WorkspaceIntent;
  source_intake: SourceIntake;
  workspace_plan: WorkspacePlan;
  session_plan: SessionPlan;
  evidence_plan: EvidencePlan;
  validation: ValidationResult;
};

export type WorkspacePlanPreview = {
  proposed_workspace: string;
  outputs: string[];
  first_session: string;
  validation: ValidationResult;
};

export type WorkspaceIntentValidationIssue = ValidationIssue;
export type WorkspaceIntentValidationResult = ValidationResult;
