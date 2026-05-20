export type SourceRole =
  | "source_truth"
  | "intent"
  | "oracle"
  | "example"
  | "notes";

export type SourceRef = {
  ref_id: string;
  path: string;
  role: SourceRole;
  summary?: string;
};

export type SourceBundle = {
  bundle_id: string;
  title: string;
  source_summary: string;
  source_refs: SourceRef[];
};

export type WorkspaceIntent = {
  intent_id?: string;
  workspace_title: string;
  global_ambition: string;
  unknowns: string[];
  source_bundle: SourceBundle;
  known_skills: string[];
  desired_outputs: string[];
  horizon: string;
  title?: string;
  goal?: string;
  source_summary?: string;
};

export type LearningNode = {
  node_id: string;
  title: string;
  objective: string;
  source_refs: string[];
  depends_on: string[];
  expected_outcome: string;
};

export type ArtifactTarget = {
  artifact_id: string;
  node_id: string;
  title: string;
  artifact_type: "notes" | "exercise" | "artifact" | "code" | "test";
  source_refs: string[];
  description?: string;
};

export type SessionPlan = {
  session_id: string;
  title: string;
  learning_node_ids: string[];
  artifact_target_ids: string[];
  sequence_position: number;
};

export type Decision = {
  decision: "proceed" | "defer" | "split";
  bounded: boolean;
  rationale: string;
  max_session_nodes?: number;
  max_total_artifacts?: number;
};

export type OpenQuestion = {
  question_id: string;
  prompt: string;
  target_unknowns: string[];
  source_refs: string[];
};

export type WorkspacePlan = {
  plan_id: string;
  title: string;
  goal: string;
  source_summary: string;
  source_bundle: SourceBundle;
  learning_nodes: LearningNode[];
  artifact_targets: ArtifactTarget[];
  first_session: SessionPlan;
  anti_overload_decision: Decision;
  open_questions_for_user: OpenQuestion[];
  unknowns?: string[];
  intent_id?: string;
  sessions?: SessionPlan[];
  open_questions?: OpenQuestion[];
};

export type ValidationIssue = {
  code: string;
  message: string;
  field?: string;
  value?: string;
};

export type WorkspacePlanValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  plan: WorkspacePlan | null;
};
