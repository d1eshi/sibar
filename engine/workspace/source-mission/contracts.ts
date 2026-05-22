export const SOURCE_MISSION_SCHEMA_VERSION = "0.1.0";

export type SourceMissionSchemaVersion = typeof SOURCE_MISSION_SCHEMA_VERSION;

export type SourceInputKind = "url" | "pasted_text" | "selected_text" | "file";

export type SourceInput = {
  kind: SourceInputKind;
  value: string;
};

export type SourceIntentInput = {
  schema: "SourceIntentInput";
  version: SourceMissionSchemaVersion;
  id: string;
  created_at: string;
  source_input: SourceInput;
  user_reason: string;
  optional_goal?: string;
  optional_constraints?: string[];
};

export type SourceIntakeExtractionStatus = "completed" | "partial" | "blocked" | "failed";

export type SourceIntakeDiagnosticSeverity = "error" | "warning" | "info";

export type SourceIntakeDiagnostic = {
  code: string;
  message: string;
  severity: SourceIntakeDiagnosticSeverity;
  source_ref?: string;
};

export type SourceInputReferenceString = string;

export type SourceIntakeSourceKind = SourceInputKind;

export type SourceIntakeResult = {
  schema: "SourceIntakeResult";
  version: SourceMissionSchemaVersion;
  id: string;
  source_id: string;
  source_kind: SourceIntakeSourceKind;
  canonical_url?: SourceInputReferenceString;
  title?: string;
  author?: string;
  published_at?: string;
  fetched_at?: string;
  raw_text_ref: string;
  readable_text_ref: string;
  extraction_status: SourceIntakeExtractionStatus;
  diagnostics: SourceIntakeDiagnostic[];
  source_intent_id?: string;
};

export type SourceSignalConfidence = "low" | "medium" | "high";

export type SourceSignalKind =
  | "goal"
  | "resource"
  | "exercise"
  | "claim"
  | "skill_area"
  | "output"
  | "prerequisite";

export type SourceSignalUserRelevance = "explicit" | "inferred" | "unknown";

export type SourceSignal = {
  schema: "SourceSignal";
  version: SourceMissionSchemaVersion;
  id: string;
  kind: SourceSignalKind;
  label: string;
  source_excerpt_ref: string;
  confidence: SourceSignalConfidence;
  user_relevance: SourceSignalUserRelevance;
};

export type SourceSlice = {
  slice_id: string;
  source_id: string;
  label: string;
  excerpt_ref: string;
  excerpt: string;
  source_signal_ids: string[];
};

export type ProposedTrackStatus = "recommended" | "optional" | "deferred";

export type ProposedTrack = {
  id: string;
  title: string;
  rationale: string;
  source_signal_ids: string[];
  status: ProposedTrackStatus;
};

export type ProposedSessionStatus = "now" | "next" | "later" | "locked";

export type ProposedSession = {
  id: string;
  track_id: string;
  title: string;
  source_slice_refs: string[];
  operation: string;
  recommended_artifacts: string[];
  status: ProposedSessionStatus;
  prerequisite_note?: string;
};

export type MissionPreview = {
  schema: "MissionPreview";
  version: SourceMissionSchemaVersion;
  mission_title: string;
  mission_rationale: string;
  user_goal: string;
  source_summary: string;
  proposed_tracks: ProposedTrack[];
  first_sessions: ProposedSession[];
  open_questions: string[];
  confidence: SourceSignalConfidence;
};

export type SourceMissionValidationIssue = {
  code: string;
  message: string;
  path?: string;
  value?: string;
};

export type SourceMissionValidationResult<T> = {
  ok: boolean;
  issues: SourceMissionValidationIssue[];
  value: T | null;
};

export type SessionSeed = {
  session_id: string;
  track_id: string;
  source_signal_ids: string[];
  source_slice_refs: string[];
  operation: import("../../runtime-deep-ownership-evidence-types.ts").UserOperationKind;
  required_artifacts: string[];
  required_evidence: string[];
  success_criteria: string[];
  prerequisite_note?: string;
  status: ProposedSessionStatus;
};

export type PedagogyInput = {
  session_seed: SessionSeed;
  user_attempt: import("../../runtime-deep-ownership-loop-types.ts").UserAttempt | null;
  cited_evidence: string[];
  existing_memory?: import("../../runtime-pedagogy-loop/types.ts").DeepOwnershipMemory;
};
