import type {
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
  ThinkingArtifactKind,
  UserOperationKind,
} from "../../runtime-deep-ownership.ts";
import { buildMissionSessionBridge } from "./bridge.ts";
import type { MissionSessionBridgeDiagnostic, MissionSessionBridgeOutput } from "./bridge.ts";
import type {
  MissionPreview,
  ProposedSession,
  ProposedSessionStatus,
  ProposedTrackStatus,
  SourceIntentInput,
  SourceIntakeDiagnostic,
  SourceIntakeExtractionStatus,
  SourceIntakeResult,
  SourceInputKind,
  SourceSignal,
  SourceSignalConfidence,
  SourceSignalKind,
  SourceSignalUserRelevance,
  SourceSlice,
} from "./contracts.ts";

export const MISSION_UI_PROJECTION_SCHEMA_VERSION = "0.1.0";
export const MISSION_EXECUTION_JOB_STATUSES = [
  "queued",
  "running",
  "validating",
  "completed",
  "blocked",
  "failed",
  "cancelled",
] as const;

export type MissionExecutionJobStatus = (typeof MISSION_EXECUTION_JOB_STATUSES)[number];

export type MissionUiProjectionInput = {
  source_intent_input: SourceIntentInput;
  source_intake_result: SourceIntakeResult;
  source_signals: SourceSignal[];
  source_slices: SourceSlice[];
  mission_preview: MissionPreview;
  active_session_id?: string;
};

export type MissionBriefProjection = {
  mission_id: string;
  title: string;
  rationale: string;
  user_goal: string;
  source_context: {
    source_id: string;
    source_kind: SourceInputKind;
    title: string | null;
    canonical_url: string | null;
    author: string | null;
    published_at: string | null;
    fetched_at: string | null;
    summary: string;
    user_reason: string;
    extraction_status: SourceIntakeExtractionStatus;
    diagnostics: SourceIntakeDiagnostic[];
  };
  tracks: MissionTrackProjection[];
  open_questions: string[];
  confidence: SourceSignalConfidence;
};

export type MissionTrackProjection = {
  id: string;
  title: string;
  rationale: string;
  status: ProposedTrackStatus;
  source_signal_ids: string[];
  session_ids: string[];
};

export type FocusedQueueProjection = {
  mission_id: string;
  active_track: {
    id: string;
    title: string;
    rationale: string;
    status: ProposedTrackStatus;
  };
  queue_scope: "mission_curated" | "track_local";
  visible_sessions: MissionQueueSessionProjection[];
  deferred_sessions: MissionQueueSessionProjection[];
  locked_sessions: MissionQueueSessionProjection[];
  source_map_ref: string;
  rationale: string;
};

export type MissionQueueSessionProjection = {
  id: string;
  track_id: string;
  title: string;
  status: ProposedSessionStatus;
  operation_kind: UserOperationKind;
  operation_label: string;
  artifact_kinds: ThinkingArtifactKind[];
  artifacts: {
    id: string;
    title: string;
  }[];
  source_slice_refs: string[];
  source_signal_ids: string[];
  prerequisite_note: string | null;
  reason: string;
};

export type ActiveSessionProjection = {
  id: string;
  track_id: string;
  title: string;
  status: ProposedSessionStatus;
  operation: {
    id: string;
    kind: UserOperationKind;
    prompt: string;
    required_evidence: string[];
    success_criteria: string[];
  };
  readiness_scope: {
    scope: "active_session_operation";
    label: string;
    required_evidence: string[];
    required_artifacts: string[];
  };
  source_signal_ids: string[];
  source_slice_refs: string[];
  required_evidence: string[];
  evidence_refs: EvidenceRef[];
  evidence_inventory: EvidenceInventoryEntry[];
  artifacts: MissionArtifactProjection[];
  bridge_diagnostics: MissionSessionBridgeDiagnostic[];
};

export type MissionArtifactProjection = {
  id: string;
  kind: ThinkingArtifactKind;
  title: string;
  purpose: string;
  required_evidence: string[];
  evidence_refs: EvidenceRef[];
  success_criteria: string[];
};

export type MissionSourceMapProjection = {
  ref: string;
  role: "secondary_advanced";
  source_id: string;
  source_title: string | null;
  signals: MissionSourceSignalProjection[];
  slices: MissionSourceSliceProjection[];
};

export type MissionSourceSignalProjection = {
  id: string;
  kind: SourceSignalKind;
  label: string;
  source_excerpt_ref: string;
  confidence: SourceSignalConfidence;
  user_relevance: SourceSignalUserRelevance;
};

export type MissionSourceSliceProjection = {
  id: string;
  label: string;
  excerpt_ref: string;
  source_signal_ids: string[];
};

export type MissionNextActionProjection = {
  id: string;
  label: string;
  target: "active_session" | "artifact" | "source_map";
  session_id: string;
  artifact_id?: string;
  priority: "primary" | "secondary" | "advanced";
};

export type MissionUiProjection = {
  ui_schema_version: typeof MISSION_UI_PROJECTION_SCHEMA_VERSION;
  generated_at: string;
  execution_job: {
    id: string;
    status: MissionExecutionJobStatus;
    reason_code?: string;
  };
  source_intake_status: SourceIntakeExtractionStatus;
  mission_preview: {
    title: string;
    rationale: string;
    confidence: SourceSignalConfidence;
  };
  mission_brief: MissionBriefProjection;
  focused_queue: FocusedQueueProjection;
  active_session: ActiveSessionProjection;
  source_map_ref: string;
  source_map: MissionSourceMapProjection;
  next_actions: MissionNextActionProjection[];
  blocked_state: MissionSessionBridgeDiagnostic[];
  reproducibility_hash: string;
};

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function missionIdFor(input: MissionUiProjectionInput): string {
  return `MIS-${stableHash(`${input.source_intake_result.source_id}|${input.mission_preview.mission_title}`)}`;
}

function sourceMapRefFor(input: MissionUiProjectionInput): string {
  return `source-map:${input.source_intake_result.source_id}:${stableHash(
    `${input.source_signals.map((signal) => signal.id).join("|")}|${input.source_slices
      .map((slice) => slice.slice_id)
      .join("|")}`,
  )}`;
}

function buildSessionBridge(input: MissionUiProjectionInput, proposedSession: ProposedSession): MissionSessionBridgeOutput {
  const bridge = buildMissionSessionBridge({
    mission_preview: input.mission_preview,
    proposed_session: proposedSession,
    source_signals: input.source_signals,
    source_slices: input.source_slices,
    source_intake: input.source_intake_result,
    user_reason: input.source_intent_input.user_reason,
  });

  if (!bridge.ok) {
    throw new Error(`Mission UI projection bridge failed: ${bridge.diagnostics.map((entry) => entry.code).join(", ")}`);
  }

  return bridge.value;
}

function nonEmptyText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function queueReasonFrom(session: ProposedSession): string {
  if (session.status === "now") return "Active source-backed session";
  if (session.status === "next") return nonEmptyText(session.prerequisite_note, "Next focused session");
  if (session.status === "later") return nonEmptyText(session.prerequisite_note, "Deferred orientation target");
  return nonEmptyText(session.prerequisite_note, "Locked until prior evidence is complete");
}

function operationLabelFrom(prompt: string): string {
  return prompt.split("\n")[0]?.trim() || "Source-backed operation";
}

function queueArtifactsFrom(artifacts: ThinkingArtifact[]): MissionQueueSessionProjection["artifacts"] {
  return artifacts.slice(0, 3).map((artifact) => ({
    id: artifact.id,
    title: artifact.title,
  }));
}

function queueSessionFrom(input: MissionUiProjectionInput, session: ProposedSession): MissionQueueSessionProjection {
  const bridge = buildSessionBridge(input, session);
  const artifacts = bridge.thinking_artifacts.slice(0, 3);

  return {
    id: session.id,
    track_id: session.track_id,
    title: session.title,
    status: session.status,
    operation_kind: bridge.user_operation.kind,
    operation_label: operationLabelFrom(bridge.user_operation.prompt),
    artifact_kinds: artifacts.map((artifact) => artifact.kind),
    artifacts: queueArtifactsFrom(artifacts),
    source_slice_refs: [...bridge.session_seed.source_slice_refs],
    source_signal_ids: [...bridge.session_seed.source_signal_ids],
    prerequisite_note: session.prerequisite_note ?? null,
    reason: queueReasonFrom(session),
  };
}

function evidenceRefFromEntry(entry: EvidenceInventoryEntry): EvidenceRef {
  return {
    evidence_id: entry.id,
    file_path: entry.path,
    start_line: 1,
    end_line: entry.line_count ?? 1,
    excerpt: entry.excerpt,
    role: entry.role,
  };
}

function buildMissionBrief(
  input: MissionUiProjectionInput,
  mission_id: string,
): MissionBriefProjection {
  const sessionIdsByTrack = new Map<string, string[]>();
  for (const session of input.mission_preview.first_sessions) {
    sessionIdsByTrack.set(session.track_id, [...(sessionIdsByTrack.get(session.track_id) ?? []), session.id]);
  }

  return {
    mission_id,
    title: input.mission_preview.mission_title,
    rationale: input.mission_preview.mission_rationale,
    user_goal: input.mission_preview.user_goal,
    source_context: {
      source_id: input.source_intake_result.source_id,
      source_kind: input.source_intake_result.source_kind,
      title: input.source_intake_result.title ?? null,
      canonical_url: input.source_intake_result.canonical_url ?? null,
      author: input.source_intake_result.author ?? null,
      published_at: input.source_intake_result.published_at ?? null,
      fetched_at: input.source_intake_result.fetched_at ?? null,
      summary: input.mission_preview.source_summary,
      user_reason: input.source_intent_input.user_reason,
      extraction_status: input.source_intake_result.extraction_status,
      diagnostics: input.source_intake_result.diagnostics,
    },
    tracks: input.mission_preview.proposed_tracks.map((track) => ({
      id: track.id,
      title: track.title,
      rationale: track.rationale,
      status: track.status,
      source_signal_ids: [...track.source_signal_ids],
      session_ids: sessionIdsByTrack.get(track.id) ?? [],
    })),
    open_questions: input.mission_preview.open_questions,
    confidence: input.mission_preview.confidence,
  };
}

function selectActiveSession(input: MissionUiProjectionInput): ProposedSession {
  const requested = input.active_session_id
    ? input.mission_preview.first_sessions.find((session) => session.id === input.active_session_id)
    : null;
  const active = requested ?? input.mission_preview.first_sessions.find((session) => session.status === "now")
    ?? input.mission_preview.first_sessions[0];

  if (!active) {
    throw new Error("Mission UI projection requires at least one proposed session.");
  }

  return active;
}

function buildFocusedQueue(input: MissionUiProjectionInput, mission_id: string, source_map_ref: string): FocusedQueueProjection {
  const activeSession = selectActiveSession(input);
  const activeTrack =
    input.mission_preview.proposed_tracks.find((track) => track.id === activeSession.track_id)
    ?? input.mission_preview.proposed_tracks[0];

  if (!activeTrack) {
    throw new Error("Mission UI projection requires at least one proposed track.");
  }

  const sessions = input.mission_preview.first_sessions;
  const nextSession = sessions.find((session) => session.id !== activeSession.id && session.status === "next");
  const laterSession = sessions.find((session) => session.id !== activeSession.id && session.status === "later");
  const visibleSource = [activeSession, nextSession, laterSession].filter(
    (session): session is ProposedSession => Boolean(session),
  );
  const visibleSessions = visibleSource.slice(0, 3).map((session) => queueSessionFrom(input, session));
  const visibleIds = new Set(visibleSessions.map((session) => session.id));

  return {
    mission_id,
    active_track: {
      id: activeTrack.id,
      title: activeTrack.title,
      rationale: activeTrack.rationale,
      status: activeTrack.status,
    },
    queue_scope: "mission_curated",
    visible_sessions: visibleSessions,
    deferred_sessions: sessions
      .filter((session) => !visibleIds.has(session.id) && session.status !== "locked")
      .map((session) => queueSessionFrom(input, session)),
    locked_sessions: sessions.filter((session) => session.status === "locked").map((session) => queueSessionFrom(input, session)),
    source_map_ref,
    rationale: activeTrack.rationale,
  };
}

function buildActiveSession(input: MissionUiProjectionInput): ActiveSessionProjection {
  const proposedSession = selectActiveSession(input);
  const bridge = buildSessionBridge(input, proposedSession);

  const evidenceRefs = bridge.evidence_inventory.map(evidenceRefFromEntry);

  return {
    id: proposedSession.id,
    track_id: proposedSession.track_id,
    title: proposedSession.title,
    status: proposedSession.status,
    operation: {
      id: bridge.user_operation.id,
      kind: bridge.user_operation.kind,
      prompt: bridge.user_operation.prompt,
      required_evidence: [...bridge.user_operation.required_evidence],
      success_criteria: [...bridge.user_operation.success_criteria],
    },
    readiness_scope: {
      scope: "active_session_operation",
      label: `${proposedSession.title}: ${bridge.user_operation.kind}`,
      required_evidence: [...bridge.session_seed.required_evidence],
      required_artifacts: [...bridge.session_seed.required_artifacts],
    },
    source_signal_ids: [...bridge.session_seed.source_signal_ids],
    source_slice_refs: [...bridge.session_seed.source_slice_refs],
    required_evidence: [...bridge.session_seed.required_evidence],
    evidence_refs: evidenceRefs,
    evidence_inventory: bridge.evidence_inventory,
    artifacts: bridge.thinking_artifacts.slice(0, 3).map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      title: artifact.title,
      purpose: artifact.purpose,
      required_evidence: [...artifact.user_operation.required_evidence],
      evidence_refs: artifact.source_evidence,
      success_criteria: [...artifact.success_criteria],
    })),
    bridge_diagnostics: bridge.diagnostics,
  };
}

function buildSourceMap(input: MissionUiProjectionInput, source_map_ref: string): MissionSourceMapProjection {
  return {
    ref: source_map_ref,
    role: "secondary_advanced",
    source_id: input.source_intake_result.source_id,
    source_title: input.source_intake_result.title ?? null,
    signals: input.source_signals.map((signal) => ({
      id: signal.id,
      kind: signal.kind,
      label: signal.label,
      source_excerpt_ref: signal.source_excerpt_ref,
      confidence: signal.confidence,
      user_relevance: signal.user_relevance,
    })),
    slices: input.source_slices.map((slice) => ({
      id: slice.slice_id,
      label: slice.label,
      excerpt_ref: slice.excerpt_ref,
      source_signal_ids: [...slice.source_signal_ids],
    })),
  };
}

function buildNextActions(activeSession: ActiveSessionProjection, source_map_ref: string): MissionNextActionProjection[] {
  const firstArtifact = activeSession.artifacts[0];
  const actions: MissionNextActionProjection[] = [
    {
      id: `${activeSession.id}:continue`,
      label: "Continue active Session",
      target: "active_session",
      session_id: activeSession.id,
      priority: "primary",
    },
  ];

  if (firstArtifact) {
    actions.push({
      id: `${firstArtifact.id}:artifact`,
      label: `Draft ${firstArtifact.title}`,
      target: "artifact",
      session_id: activeSession.id,
      artifact_id: firstArtifact.id,
      priority: "secondary",
    });
  }

  actions.push({
    id: `${source_map_ref}:open`,
    label: "Open Source Map",
    target: "source_map",
    session_id: activeSession.id,
    priority: "advanced",
  });

  return actions.slice(0, 3);
}

function reproducibilityHashFor(input: MissionUiProjectionInput, activeSessionId: string): string {
  return stableHash(
    stableStringify({
      active_session_id: activeSessionId,
      mission_preview: input.mission_preview,
      source_intent_input: input.source_intent_input,
      source_intake_result: input.source_intake_result,
      source_signals: input.source_signals,
      source_slices: input.source_slices,
      ui_schema_version: MISSION_UI_PROJECTION_SCHEMA_VERSION,
    }),
  );
}

export function buildMissionUiProjection(input: MissionUiProjectionInput): MissionUiProjection {
  const mission_id = missionIdFor(input);
  const source_map_ref = sourceMapRefFor(input);
  const mission_brief = buildMissionBrief(input, mission_id);
  const active_session = buildActiveSession(input);
  const focused_queue = buildFocusedQueue(input, mission_id, source_map_ref);
  const source_map = buildSourceMap(input, source_map_ref);
  const next_actions = buildNextActions(active_session, source_map_ref);

  return {
    ui_schema_version: MISSION_UI_PROJECTION_SCHEMA_VERSION,
    generated_at: input.source_intake_result.fetched_at ?? input.source_intent_input.created_at,
    execution_job: {
      id: `JOB-${reproducibilityHashFor(input, active_session.id)}`,
      status: "completed",
    },
    source_intake_status: input.source_intake_result.extraction_status,
    mission_preview: {
      title: input.mission_preview.mission_title,
      rationale: input.mission_preview.mission_rationale,
      confidence: input.mission_preview.confidence,
    },
    mission_brief,
    focused_queue,
    active_session,
    source_map_ref,
    source_map,
    next_actions,
    blocked_state: active_session.bridge_diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    reproducibility_hash: reproducibilityHashFor(input, active_session.id),
  };
}
