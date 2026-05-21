import { URL } from "node:url";

import { SOURCE_MISSION_SCHEMA_VERSION } from "./runtime-source-mission-contracts.ts";
import type {
  MissionPreview,
  ProposedSession,
  ProposedTrack,
  SourceInput,
  SourceInputKind,
  SourceIntakeDiagnostic,
  SourceIntakeDiagnosticSeverity,
  SourceIntakeExtractionStatus,
  SourceIntakeResult,
  SourceIntentInput,
  SourceSignal,
  SourceMissionSchemaVersion,
  SourceMissionValidationIssue,
  SourceMissionValidationResult,
  SourceSignalKind,
  SourceSignalUserRelevance,
  ProposedTrackStatus,
  ProposedSessionStatus,
} from "./runtime-source-mission-contracts.ts";

type RecordInput = Record<string, unknown>;

const SOURCE_INTENT_SCHEMA = "SourceIntentInput";
const SOURCE_INTAKE_SCHEMA = "SourceIntakeResult";
const SOURCE_SIGNAL_SCHEMA = "SourceSignal";
const MISSION_PREVIEW_SCHEMA = "MissionPreview";

const DIAGNOSTIC_SEVERITIES = new Set<SourceIntakeDiagnosticSeverity>(["error", "warning", "info"]);
const SOURCE_INPUT_KINDS = new Set<SourceInputKind>([
  "url",
  "pasted_text",
  "selected_text",
  "file",
]);
const SIGNAL_KINDS = new Set<SourceSignalKind>([
  "goal",
  "resource",
  "exercise",
  "claim",
  "skill_area",
  "output",
  "prerequisite",
]);
const SOURCE_MISSION_CONFIDENCE_VALUES = new Set(["low", "medium", "high"]);
const USER_RELEVANCE_VALUES = new Set<SourceSignalUserRelevance>([
  "explicit",
  "inferred",
  "unknown",
]);
const TRACK_STATUS_VALUES = new Set<ProposedTrackStatus>(["recommended", "optional", "deferred"]);
const SESSION_STATUS_VALUES = new Set<ProposedSessionStatus>(["now", "next", "later", "locked"]);
const EXTRACTION_STATUSES = new Set<SourceIntakeExtractionStatus>([
  "completed",
  "partial",
  "blocked",
  "failed",
]);

const WHOLE_MISSION_CLAIMS = [
  /\bwhole\s+repo\b/i,
  /\bwhole\s+repository\b/i,
  /\bglobal\s+mastery\b/i,
  /\bcomplete\s+(?:mastery|understanding)\b/i,
  /\bwhole\s+mission\s+readiness\b/i,
  /\bmastered?\b/i,
  /\bmastery\s+of\b/i,
  /\bbuild(?:ing)?\s+understand(?:ing)?\s+(?:the\s+)?(?:repo|repository|codebase|project)\b/i,
] as const;

function asRecord(value: unknown): RecordInput | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordInput) : null;
}

function trimValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function addIssue(
  issues: SourceMissionValidationIssue[],
  code: string,
  message: string,
  path?: string,
  value?: string,
): void {
  issues.push({ code, message, path, value });
}

function hasWholeMissionClaim(value: string): boolean {
  return WHOLE_MISSION_CLAIMS.some((pattern) => pattern.test(value));
}

function validateSourceInput(
  raw: unknown,
  issues: SourceMissionValidationIssue[],
  context: string,
): SourceInput | null {
  const payload = asRecord(raw);
  if (!payload) {
    addIssue(issues, `${context}_not_object`, `${context} must be an object.`);
    return null;
  }
  const kind = trimValue(payload.kind);
  const value = trimValue(payload.value);

  if (!SOURCE_INPUT_KINDS.has(kind as SourceInputKind)) {
    addIssue(
      issues,
      `${context}_kind`,
      "source_input.kind must be one of url, pasted_text, selected_text, or file.",
      `${context}.kind`,
      kind,
    );
    return null;
  }
  if (!value) {
    addIssue(
      issues,
      `${context}_value`,
      "source_input.value must be a non-empty string.",
      `${context}.value`,
    );
    return null;
  }
  if (kind === "url" && !isHttpUrl(value)) {
    addIssue(
      issues,
      `${context}_url_invalid`,
      "source_input.value must be a plausible http(s) URL string.",
      `${context}.value`,
      value,
    );
    return null;
  }

  return { kind, value };
}

function validateStringArray(
  raw: unknown,
  issues: SourceMissionValidationIssue[],
  context: string,
  options?: { optional?: boolean },
): string[] {
  if (!Array.isArray(raw)) {
    addIssue(issues, `${context}_not_array`, `${context} must be an array.`);
    return [];
  }
  const items = raw.map((item) => trimValue(item));
  if (!options?.optional && items.length === 0) {
    addIssue(issues, `${context}_empty`, `${context} must be non-empty.`);
  }
  if (items.some((item) => item.length === 0)) {
    addIssue(issues, `${context}_invalid_entries`, `${context} entries must be non-empty strings.`);
  }
  return items.filter(Boolean);
}

function validateConfidence(
  raw: unknown,
  context: string,
  issues: SourceMissionValidationIssue[],
): "low" | "medium" | "high" | null {
  const confidence = trimValue(raw);
  if (!SOURCE_MISSION_CONFIDENCE_VALUES.has(confidence)) {
    addIssue(
      issues,
      `${context}_confidence`,
      `${context} confidence must be low, medium, or high.`,
      context,
      confidence,
    );
    return null;
  }
  return confidence as "low" | "medium" | "high";
}

function validateDiagnosticArray(
  raw: unknown,
  issues: SourceMissionValidationIssue[],
  context: string,
): SourceIntakeDiagnostic[] {
  if (!Array.isArray(raw)) {
    addIssue(issues, `${context}_not_array`, `${context} must be an array.`);
    return [];
  }
  const diagnostics: SourceIntakeDiagnostic[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const issueContext = `${context}[${index}]`;
    const entry = asRecord(raw[index]);
    if (!entry) {
      addIssue(issues, `${context}_item_not_object`, `${issueContext} must be an object.`);
      continue;
    }
    const code = trimValue(entry.code);
    const message = trimValue(entry.message);
    const severity = trimValue(entry.severity) as SourceIntakeDiagnosticSeverity;
    if (!code || !message || !DIAGNOSTIC_SEVERITIES.has(severity)) {
      addIssue(
        issues,
        `${context}_item_invalid`,
        `${issueContext} requires code, message, and severity.`,
        issueContext,
      );
      continue;
    }
    diagnostics.push({
      code,
      message,
      severity,
      ...(trimValue(entry.source_ref) ? { source_ref: trimValue(entry.source_ref) } : {}),
    });
  }
  return diagnostics;
}

function hasErrorDiagnostic(diagnostics: SourceIntakeDiagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}

function validateProposedTrack(
  raw: unknown,
  issues: SourceMissionValidationIssue[],
  index: number,
  existingIds: Set<string>,
): ProposedTrack | null {
  const payload = asRecord(raw);
  if (!payload) {
    addIssue(issues, `proposed_tracks[${index}]_not_object`, `proposed_tracks[${index}] must be an object.`);
    return null;
  }
  const context = `proposed_tracks[${index}]`;
  const id = trimValue(payload.id);
  const title = trimValue(payload.title);
  const rationale = trimValue(payload.rationale);
  const sourceSignalIds = validateStringArray(payload.source_signal_ids, issues, `${context}.source_signal_ids`);
  const status = trimValue(payload.status);

  if (!id) addIssue(issues, `${context}_id`, `${context}.id is required.`, `${context}.id`);
  if (!title) addIssue(issues, `${context}_title`, `${context}.title is required.`, `${context}.title`);
  if (!rationale) addIssue(issues, `${context}_rationale`, `${context}.rationale is required.`, `${context}.rationale`);
  if (hasWholeMissionClaim(rationale)) {
    addIssue(
      issues,
      `${context}_forbidden_readiness_claim`,
      `${context}.rationale contains whole-mission readiness/mastery wording.`,
      `${context}.rationale`,
    );
  }
  if (!TRACK_STATUS_VALUES.has(status as ProposedTrackStatus)) {
    addIssue(
      issues,
      `${context}_status`,
      `${context}.status must be recommended, optional, or deferred.`,
      `${context}.status`,
      status,
    );
  }
  if (sourceSignalIds.length === 0) {
    addIssue(
      issues,
      `${context}_source_signal_ids`,
      `${context}.source_signal_ids must include at least one signal id.`,
      `${context}.source_signal_ids`,
    );
  }
  if (id && existingIds.has(id)) {
    addIssue(issues, `${context}_duplicate_id`, `${context}.id is duplicated: ${id}`, `${context}.id`, id);
  } else if (id) {
    existingIds.add(id);
  }

  return {
    id,
    title,
    rationale,
    source_signal_ids: sourceSignalIds,
    status: status as ProposedTrackStatus,
  };
}

function validateProposedSession(
  raw: unknown,
  issues: SourceMissionValidationIssue[],
  index: number,
  existingIds: Set<string>,
  contextName = "proposed_sessions",
): ProposedSession | null {
  const payload = asRecord(raw);
  if (!payload) {
    addIssue(
      issues,
      `${contextName}[${index}]_not_object`,
      `${contextName}[${index}] must be an object.`,
    );
    return null;
  }
  const context = `${contextName}[${index}]`;
  const id = trimValue(payload.id);
  const trackId = trimValue(payload.track_id);
  const title = trimValue(payload.title);
  const operation = trimValue(payload.operation);
  const sourceSliceRefs = validateStringArray(payload.source_slice_refs, issues, `${context}.source_slice_refs`);
  const recommendedArtifacts = validateStringArray(
    payload.recommended_artifacts,
    issues,
    `${context}.recommended_artifacts`,
    { optional: true },
  );
  const status = trimValue(payload.status);
  const prerequisiteNote = trimValue(payload.prerequisite_note);

  if (!id) addIssue(issues, `${context}_id`, `${context}.id is required.`, `${context}.id`);
  if (!trackId) addIssue(issues, `${context}_track_id`, `${context}.track_id is required.`, `${context}.track_id`);
  if (!title) addIssue(issues, `${context}_title`, `${context}.title is required.`, `${context}.title`);
  if (!operation) {
    addIssue(issues, `${context}_operation`, `${context}.operation is required.`, `${context}.operation`);
  }
  if (hasWholeMissionClaim(operation)) {
    addIssue(
      issues,
      `${context}_forbidden_readiness_claim`,
      `${context}.operation contains whole-mission readiness/mastery wording.`,
      `${context}.operation`,
    );
  }
  if (sourceSliceRefs.length === 0) {
    addIssue(
      issues,
      `${context}_source_slice_refs`,
      `${context}.source_slice_refs must include at least one source signal ref.`,
      `${context}.source_slice_refs`,
    );
  }
  if (!SESSION_STATUS_VALUES.has(status as ProposedSessionStatus)) {
    addIssue(
      issues,
      `${context}_status`,
      `${context}.status must be now, next, later, or locked.`,
      `${context}.status`,
      status,
    );
  }
  if (id && existingIds.has(id)) {
    addIssue(issues, `${context}_duplicate_id`, `${context}.id is duplicated: ${id}`, `${context}.id`, id);
  } else if (id) {
    existingIds.add(id);
  }

  return {
    id,
    track_id: trackId,
    title,
    source_slice_refs: sourceSliceRefs,
    operation,
    recommended_artifacts: recommendedArtifacts,
    status: status as ProposedSessionStatus,
    ...(prerequisiteNote ? { prerequisite_note: prerequisiteNote } : {}),
  };
}

export function validateSourceIntentInput(
  payload: unknown,
): SourceMissionValidationResult<SourceIntentInput> {
  const issues: SourceMissionValidationIssue[] = [];
  const raw = asRecord(payload);
  if (!raw) {
    addIssue(issues, "source_intent_input_not_object", "SourceIntentInput must be an object.");
    return { ok: false, issues, value: null };
  }

  const schema = trimValue(raw.schema);
  const version = trimValue(raw.version);
  const id = trimValue(raw.id);
  const createdAt = trimValue(raw.created_at);
  const userReason = trimValue(raw.user_reason);
  const optionalGoal = trimValue(raw.optional_goal);
  const optionalConstraints = raw.optional_constraints;
  const sourceInput = validateSourceInput(raw.source_input, issues, "source_intent_input.source_input");

  if (schema !== SOURCE_INTENT_SCHEMA) {
    addIssue(issues, "source_intent_input_schema", `schema must be ${SOURCE_INTENT_SCHEMA}.`, "schema");
  }
  if (!version) {
    addIssue(issues, "source_intent_input_version", "version is required.", "version");
  } else if (version !== SOURCE_MISSION_SCHEMA_VERSION) {
    addIssue(
      issues,
      "source_intent_input_version_mismatch",
      "Unsupported SourceIntentInput version.",
      "version",
      version,
    );
  }
  if (!id) addIssue(issues, "source_intent_input_id", "id is required.", "id");
  if (!createdAt) addIssue(issues, "source_intent_input_created_at", "created_at is required.", "created_at");
  if (!userReason) {
    addIssue(issues, "source_intent_input_user_reason", "user_reason is required.", "user_reason");
  } else if (hasWholeMissionClaim(userReason)) {
    addIssue(
      issues,
      "source_intent_input_forbidden_readiness_claim",
      "user_reason contains whole-mission readiness/mastery wording.",
      "user_reason",
    );
  }
  if (optionalGoal && optionalGoal.length > 0 && hasWholeMissionClaim(optionalGoal)) {
    addIssue(
      issues,
      "source_intent_input_optional_goal_readiness_claim",
      "optional_goal contains whole-mission readiness/mastery wording.",
      "optional_goal",
    );
  }
  if (raw.optional_constraints !== undefined) {
    validateStringArray(optionalConstraints, issues, "source_intent_input.optional_constraints", { optional: true });
  }

  if (issues.length > 0 || !sourceInput) {
    return { ok: false, issues, value: null };
  }
  return {
    ok: true,
    issues,
    value: {
      schema: SOURCE_INTENT_SCHEMA,
      version: version as SourceMissionSchemaVersion,
      id,
      created_at: createdAt,
      source_input: sourceInput,
      user_reason: userReason,
      ...(optionalGoal ? { optional_goal: optionalGoal } : {}),
      ...(Array.isArray(optionalConstraints)
        ? { optional_constraints: validateStringArray(optionalConstraints, issues, "source_intent_input.optional_constraints", { optional: true }) }
        : {}),
    },
  };
}

export function validateSourceIntakeResult(
  payload: unknown,
): SourceMissionValidationResult<SourceIntakeResult> {
  const issues: SourceMissionValidationIssue[] = [];
  const raw = asRecord(payload);
  if (!raw) {
    addIssue(issues, "source_intake_not_object", "SourceIntakeResult must be an object.");
    return { ok: false, issues, value: null };
  }

  const schema = trimValue(raw.schema);
  const version = trimValue(raw.version);
  const id = trimValue(raw.id);
  const sourceId = trimValue(raw.source_id);
  const sourceKind = trimValue(raw.source_kind);
  const sourceIntentId = trimValue(raw.source_intent_id);
  const extractionStatus = trimValue(raw.extraction_status) as SourceIntakeExtractionStatus;
  const canonicalUrl = trimValue(raw.canonical_url);
  const title = trimValue(raw.title);
  const author = trimValue(raw.author);
  const publishedAt = trimValue(raw.published_at);
  const fetchedAt = trimValue(raw.fetched_at);
  const rawTextRef = trimValue(raw.raw_text_ref);
  const readableTextRef = trimValue(raw.readable_text_ref);
  const diagnostics = validateDiagnosticArray(raw.diagnostics, issues, "source_intake_result.diagnostics");

  if (schema !== SOURCE_INTAKE_SCHEMA) {
    addIssue(issues, "source_intake_schema", `schema must be ${SOURCE_INTAKE_SCHEMA}.`, "schema");
  }
  if (!version) {
    addIssue(issues, "source_intake_version", "version is required.", "version");
  } else if (version !== SOURCE_MISSION_SCHEMA_VERSION) {
    addIssue(issues, "source_intake_version_mismatch", "Unsupported SourceIntakeResult version.", "version", version);
  }
  if (!id) addIssue(issues, "source_intake_id", "id is required.", "id");
  if (!sourceId) addIssue(issues, "source_intake_source_id", "source_id is required.", "source_id");
  if (!SOURCE_INPUT_KINDS.has(sourceKind as SourceInputKind)) {
    addIssue(
      issues,
      "source_intake_source_kind",
      "source_kind must be one of url, pasted_text, selected_text, or file.",
      "source_kind",
      sourceKind,
    );
  }
  if (Object.prototype.hasOwnProperty.call(raw, "source_intent_id") && !sourceIntentId) {
    addIssue(
      issues,
      "source_intake_source_intent_id",
      "source_intent_id must be a non-empty string.",
      "source_intent_id",
    );
  }
  if (canonicalUrl && !isHttpUrl(canonicalUrl)) {
    addIssue(
      issues,
      "source_intake_canonical_url_invalid",
      "canonical_url must be a plausible http(s) URL string.",
      "canonical_url",
      canonicalUrl,
    );
  }
  if (!rawTextRef) addIssue(issues, "source_intake_raw_text_ref", "raw_text_ref is required.", "raw_text_ref");
  if (!readableTextRef) addIssue(issues, "source_intake_readable_text_ref", "readable_text_ref is required.", "readable_text_ref");
  if (!EXTRACTION_STATUSES.has(extractionStatus)) {
    addIssue(
      issues,
      "source_intake_extraction_status",
      "extraction_status must be completed, partial, blocked, or failed.",
      "extraction_status",
    );
  }
  if (
    (extractionStatus === "blocked" || extractionStatus === "failed")
    && !hasErrorDiagnostic(diagnostics)
  ) {
    addIssue(
      issues,
      "source_intake_status_requires_error_diagnostic",
      `${extractionStatus} extraction_status requires at least one error diagnostic.`,
      "diagnostics",
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues, value: null };
  }
  return {
    ok: true,
    issues,
    value: {
      schema: SOURCE_INTAKE_SCHEMA,
      version: version as SourceMissionSchemaVersion,
      id,
      source_id: sourceId,
      source_kind: sourceKind as SourceInputKind,
      ...(canonicalUrl ? { canonical_url: canonicalUrl } : {}),
      ...(title ? { title } : {}),
      ...(author ? { author } : {}),
      ...(publishedAt ? { published_at: publishedAt } : {}),
      ...(fetchedAt ? { fetched_at: fetchedAt } : {}),
      raw_text_ref: rawTextRef,
      readable_text_ref: readableTextRef,
      extraction_status: extractionStatus,
      ...(sourceIntentId ? { source_intent_id: sourceIntentId } : {}),
      diagnostics,
    },
  };
}

export function validateSourceSignal(payload: unknown): SourceMissionValidationResult<SourceSignal> {
  const issues: SourceMissionValidationIssue[] = [];
  const raw = asRecord(payload);
  if (!raw) {
    addIssue(issues, "source_signal_not_object", "SourceSignal must be an object.");
    return { ok: false, issues, value: null };
  }

  const schema = trimValue(raw.schema);
  const version = trimValue(raw.version);
  const id = trimValue(raw.id);
  const kind = trimValue(raw.kind);
  const label = trimValue(raw.label);
  const sourceExcerptRef = trimValue(raw.source_excerpt_ref);
  const confidence = validateConfidence(raw.confidence, "source_signal", issues);
  const userRelevance = trimValue(raw.user_relevance);

  if (schema !== SOURCE_SIGNAL_SCHEMA) {
    addIssue(issues, "source_signal_schema", `schema must be ${SOURCE_SIGNAL_SCHEMA}.`, "schema");
  }
  if (!version) {
    addIssue(issues, "source_signal_version", "version is required.", "version");
  } else if (version !== SOURCE_MISSION_SCHEMA_VERSION) {
    addIssue(issues, "source_signal_version_mismatch", "Unsupported SourceSignal version.", "version", version);
  }
  if (!id) addIssue(issues, "source_signal_id", "id is required.", "id");
  if (!label) addIssue(issues, "source_signal_label", "label is required.", "label");
  if (!sourceExcerptRef) addIssue(issues, "source_signal_source_excerpt_ref", "source_excerpt_ref is required.", "source_excerpt_ref");
  if (!SIGNAL_KINDS.has(kind as SourceSignalKind)) {
    addIssue(issues, "source_signal_kind", "kind must be goal, resource, exercise, claim, skill_area, output, or prerequisite.");
  }
  if (!USER_RELEVANCE_VALUES.has(userRelevance as SourceSignalUserRelevance)) {
    addIssue(issues, "source_signal_user_relevance", "user_relevance must be explicit, inferred, or unknown.", "user_relevance");
  }
  if (hasWholeMissionClaim(label)) {
    addIssue(
      issues,
      "source_signal_forbidden_readiness_claim",
      "source_signal.label contains whole-mission readiness/mastery wording.",
      "label",
    );
  }

  if (issues.length > 0 || confidence === null) {
    return { ok: false, issues, value: null };
  }
  return {
    ok: true,
    issues,
    value: {
      schema: SOURCE_SIGNAL_SCHEMA,
      version: version as SourceMissionSchemaVersion,
      id,
      kind: kind as SourceSignalKind,
      label,
      source_excerpt_ref: sourceExcerptRef,
      confidence,
      user_relevance: userRelevance as SourceSignalUserRelevance,
    },
  };
}

export function validateSourceSignals(payload: unknown): SourceMissionValidationResult<SourceSignal[]> {
  const issues: SourceMissionValidationIssue[] = [];
  if (!Array.isArray(payload)) {
    addIssue(issues, "source_signals_not_array", "source_signals must be an array.");
    return { ok: false, issues, value: null };
  }
  const signalIds = new Set<string>();
  const signals: SourceSignal[] = [];
  for (let index = 0; index < payload.length; index += 1) {
    const result = validateSourceSignal(payload[index]);
    if (!result.value) {
      issues.push(...result.issues);
      continue;
    }
    if (signalIds.has(result.value.id)) {
      addIssue(issues, "source_signal_duplicate_id", `Duplicate source signal id: ${result.value.id}`, `source_signals[${index}].id`);
      continue;
    }
    signalIds.add(result.value.id);
    signals.push(result.value);
    issues.push(...result.issues);
  }
  if (signals.length === 0) {
    addIssue(issues, "source_signals_empty", "At least one source signal is required.");
  }
  return { ok: issues.length === 0, issues, value: signals.length > 0 ? signals : null };
}

export function validateMissionPreview(
  payload: unknown,
  sourceSignals: SourceSignal[] = [],
): SourceMissionValidationResult<MissionPreview> {
  const issues: SourceMissionValidationIssue[] = [];
  const raw = asRecord(payload);
  if (!raw) {
    addIssue(issues, "mission_preview_not_object", "MissionPreview must be an object.");
    return { ok: false, issues, value: null };
  }

  const schema = trimValue(raw.schema);
  const version = trimValue(raw.version);
  const missionTitle = trimValue(raw.mission_title);
  const missionRationale = trimValue(raw.mission_rationale);
  const userGoal = trimValue(raw.user_goal);
  const sourceSummary = trimValue(raw.source_summary);
  const openQuestions = validateStringArray(raw.open_questions, issues, "mission_preview.open_questions");
  const confidence = validateConfidence(raw.confidence, "mission_preview", issues);

  if (schema !== MISSION_PREVIEW_SCHEMA) {
    addIssue(issues, "mission_preview_schema", `schema must be ${MISSION_PREVIEW_SCHEMA}.`, "schema");
  }
  if (!version) addIssue(issues, "mission_preview_version", "version is required.", "version");
  else if (version !== SOURCE_MISSION_SCHEMA_VERSION) {
    addIssue(issues, "mission_preview_version_mismatch", "Unsupported MissionPreview version.", "version", version);
  }
  if (!missionTitle) addIssue(issues, "mission_preview_mission_title", "mission_title is required.", "mission_title");
  if (!missionRationale) addIssue(issues, "mission_preview_mission_rationale", "mission_rationale is required.", "mission_rationale");
  if (!userGoal) addIssue(issues, "mission_preview_user_goal", "user_goal is required.", "user_goal");
  if (!sourceSummary) addIssue(issues, "mission_preview_source_summary", "source_summary is required.", "source_summary");
  const trackIds = new Set<string>();
  const tracks: ProposedTrack[] = [];
  if (Array.isArray(raw.proposed_tracks)) {
    for (let index = 0; index < raw.proposed_tracks.length; index += 1) {
      const track = validateProposedTrack(raw.proposed_tracks[index], issues, index, trackIds);
      if (track) tracks.push(track);
    }
  } else {
    addIssue(issues, "mission_preview_proposed_tracks_not_array", "proposed_tracks must be an array.");
  }

  const firstSessionIds = new Set<string>();
  const firstSessions: ProposedSession[] = [];
  if (Array.isArray(raw.first_sessions)) {
    for (let index = 0; index < raw.first_sessions.length; index += 1) {
      const session = validateProposedSession(raw.first_sessions[index], issues, index, firstSessionIds, "first_sessions");
      if (session) firstSessions.push(session);
    }
  } else {
    addIssue(issues, "mission_preview_first_sessions_not_array", "first_sessions must be an array.");
  }

  if (firstSessions.length === 0) {
    addIssue(issues, "mission_preview_first_sessions_required", "At least one first session is required.");
  }
  if (firstSessions.length > 5) {
    addIssue(issues, "mission_preview_first_sessions_max", "first_sessions must not exceed 5 entries.");
  }

  if (tracks.length === 0) {
    addIssue(issues, "mission_preview_proposed_tracks_required", "At least one proposed track is required.");
  }

  if (tracks.length === 0) {
    return { ok: false, issues, value: null };
  }

  const knownTrackIds = new Set(tracks.map((track) => track.id));
  const knownSignalIds = new Set(sourceSignals.map((signal) => signal.id));
  const referencedSignalIds = new Set<string>();

  for (const track of tracks) {
    if (!track.id) continue;
    for (const signalId of track.source_signal_ids) {
      if (!knownSignalIds.has(signalId)) {
        addIssue(
          issues,
          "mission_preview_unknown_signal_reference",
          `Track ${track.id} references unknown source signal: ${signalId}`,
          `proposed_tracks[${track.id}].source_signal_ids`,
          signalId,
        );
      } else {
        referencedSignalIds.add(signalId);
      }
    }
  }

  for (const firstSession of firstSessions) {
    if (!knownTrackIds.has(firstSession.track_id)) {
      addIssue(
        issues,
        "mission_preview_unknown_track_reference",
        `first_sessions[${firstSession.id}] references unknown track: ${firstSession.track_id}`,
        "mission_preview.first_sessions",
        firstSession.track_id,
      );
    }
    for (const signalRef of firstSession.source_slice_refs) {
      if (!knownSignalIds.has(signalRef)) {
        addIssue(
          issues,
          "mission_preview_unknown_signal_reference",
          `first_sessions[${firstSession.id}] references unknown source signal: ${signalRef}`,
          `first_sessions[${firstSession.id}].source_slice_refs`,
          signalRef,
        );
      } else {
        referencedSignalIds.add(signalRef);
      }
    }
  }

  if (knownSignalIds.size > 0 && referencedSignalIds.size === 0) {
    addIssue(
      issues,
      "mission_preview_signal_coverage",
      "first sessions and tracks must reference at least one source signal.",
      "mission_preview.first_sessions",
    );
  }
  if (knownSignalIds.size === 0) {
    addIssue(issues, "mission_preview_source_signals_missing", "source_signals is required to validate signal references.");
  }

  if (hasWholeMissionClaim(missionTitle) || hasWholeMissionClaim(missionRationale) || hasWholeMissionClaim(userGoal)
    || hasWholeMissionClaim(sourceSummary)
  ) {
    addIssue(
      issues,
      "mission_preview_forbidden_readiness_claim",
      "Mission preview text contains whole-mission readiness/mastery wording.",
    );
  }

  if (openQuestions.length === 0) {
    addIssue(issues, "mission_preview_open_questions_required", "At least one open_question is recommended for the first-path preview.");
  }

  if (issues.length > 0 || confidence === null) {
    return { ok: false, issues, value: null };
  }
  return {
    ok: true,
    issues,
    value: {
      schema: MISSION_PREVIEW_SCHEMA,
      version: version as SourceMissionSchemaVersion,
      mission_title: missionTitle,
      mission_rationale: missionRationale,
      user_goal: userGoal,
      source_summary: sourceSummary,
      proposed_tracks: tracks,
      first_sessions: firstSessions,
      open_questions: openQuestions,
      confidence,
    },
  };
}

export function validateSourceMissionMVPFlow(
  payload: {
    source_intent_input: unknown;
    source_intake_result: unknown;
    source_signals: unknown;
    mission_preview: unknown;
  },
): SourceMissionValidationResult<{
  source_intent_input: SourceIntentInput;
  source_intake_result: SourceIntakeResult;
  source_signals: SourceSignal[];
  mission_preview: MissionPreview;
}> {
  const issues: SourceMissionValidationIssue[] = [];

  const sourceIntent = validateSourceIntentInput(payload.source_intent_input);
  const sourceIntake = validateSourceIntakeResult(payload.source_intake_result);
  const sourceSignals = validateSourceSignals(payload.source_signals);
  const missionPreview = validateMissionPreview(payload.mission_preview, sourceSignals.value || []);

  issues.push(...sourceIntent.issues, ...sourceIntake.issues, ...sourceSignals.issues, ...missionPreview.issues);
  if (sourceIntent.ok && sourceIntake.ok && sourceSignals.ok && missionPreview.ok && sourceIntake.value && sourceIntent.value && sourceSignals.value && missionPreview.value) {
    if (sourceIntake.value.source_intent_id !== sourceIntent.value.id) {
      addIssue(
        issues,
        "source_mission_flow_intent_link",
        "source_intake_result.source_intent_id must match source_intent_input.id.",
        "source_intake_result.source_intent_id",
      );
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues, value: null };
  }
  if (!sourceIntent.value || !sourceIntake.value || !sourceSignals.value || !missionPreview.value) {
    return { ok: false, issues, value: null };
  }
  return {
    ok: true,
    issues,
    value: {
      source_intent_input: sourceIntent.value,
      source_intake_result: sourceIntake.value,
      source_signals: sourceSignals.value,
      mission_preview: missionPreview.value,
    },
  };
}
