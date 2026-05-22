import type {
  MissionPreview,
  ProposedSessionStatus,
  SourceInputKind,
  SourceIntakeDiagnosticSeverity,
  SourceIntakeExtractionStatus,
  SourceIntakeResult,
  ProposedTrackStatus,
  SourceIntentInput,
  SourceSignal,
  SourceSlice,
} from "./runtime-source-mission-contracts.ts";
import { buildMissionUiProjection } from "./runtime-source-mission-ui-projection.ts";
import type {
  FrontierLabMissionCompileDiagnostic,
  FrontierLabMissionCompileResult,
  FrontierLabMissionCompileSuccess,
} from "./runtime-source-mission-frontier-lab-compiler.ts";
import type {
  MissionExecutionJobStatus,
  MissionUiProjection,
} from "./runtime-source-mission-ui-projection.ts";

export const SOURCE_MISSION_TRACE_SCHEMA_VERSION = "0.1.0";
export const SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT = 12;
export const SOURCE_MISSION_TRACE_DIAGNOSTIC_LIMIT = 20;

export type SourceMissionTraceStatus = "completed" | "blocked" | "failed";

export type SourceMissionTraceDiagnostic = {
  code: string;
  message: string;
  severity: SourceIntakeDiagnosticSeverity;
  path?: string;
  source_ref?: string;
};

export type SourceMissionTraceQueueSummary = {
  active_track_id: string;
  active_track_status: ProposedTrackStatus;
  visible_session_ids: string[];
  deferred_session_ids: string[];
  locked_session_ids: string[];
  status_counts: Record<ProposedSessionStatus, number>;
  total_session_count: number;
  omitted_session_id_count: number;
};

export type SourceMissionTraceRecord = {
  schema: "SourceMissionTraceRecord";
  version: typeof SOURCE_MISSION_TRACE_SCHEMA_VERSION;
  id: string;
  status: SourceMissionTraceStatus;
  execution_job_status: MissionExecutionJobStatus;
  intent: {
    id: string;
    source_kind: SourceInputKind;
    source_url: string | null;
    user_reason: string;
    optional_goal: string | null;
  };
  source: {
    source_id: string;
    canonical_url: string | null;
    extraction_status: SourceIntakeExtractionStatus;
  };
  mission: {
    id: string;
    title: string;
  };
  focused_queue: SourceMissionTraceQueueSummary;
  active_session_id: string;
  counts: {
    evidence_source_signal_count: number;
    source_slice_count: number;
    source_map_signal_count: number;
    source_map_slice_count: number;
    artifact_count: number;
    diagnostic_count: number;
    omitted_diagnostic_count: number;
  };
  diagnostics: SourceMissionTraceDiagnostic[];
  reproducibility_hash: string;
};

export type SourceMissionTraceInput = {
  source_intent_input: SourceIntentInput;
  source_intake_result: SourceIntakeResult;
  source_signals: SourceSignal[];
  source_slices: SourceSlice[];
  mission_preview: MissionPreview;
  ui_projection?: MissionUiProjection;
  diagnostics?: SourceMissionTraceDiagnostic[];
};

export type SourceMissionTraceBuildResult =
  | { ok: true; trace: SourceMissionTraceRecord; diagnostics: SourceMissionTraceDiagnostic[] }
  | { ok: false; trace: null; diagnostics: SourceMissionTraceDiagnostic[] };

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sourceUrlFromIntent(input: SourceIntentInput): string | null {
  return input.source_input.kind === "url" ? input.source_input.value : null;
}

function statusFromProjection(projection: MissionUiProjection): SourceMissionTraceStatus {
  if (projection.execution_job.status === "completed") return "completed";
  if (projection.execution_job.status === "failed" || projection.execution_job.status === "cancelled") return "failed";
  return "blocked";
}

function cappedIds(values: string[]): string[] {
  return values.slice(0, SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT);
}

function statusCountsFrom(input: MissionPreview): Record<ProposedSessionStatus, number> {
  const counts: Record<ProposedSessionStatus, number> = {
    now: 0,
    next: 0,
    later: 0,
    locked: 0,
  };

  for (const session of input.first_sessions) {
    counts[session.status] += 1;
  }

  return counts;
}

function diagnosticsFrom(input: SourceMissionTraceInput, projection: MissionUiProjection): SourceMissionTraceDiagnostic[] {
  return [
    ...(input.diagnostics ?? []),
    ...input.source_intake_result.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity,
      source_ref: diagnostic.source_ref,
    })),
    ...projection.active_session.bridge_diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity,
      path: diagnostic.path,
    })),
    ...projection.blocked_state.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity,
      path: diagnostic.path,
    })),
  ];
}

function diagnosticFromUnknownError(error: unknown): SourceMissionTraceDiagnostic {
  return {
    code: "source_mission_trace.ui_projection_failed",
    message: error instanceof Error
      ? `Source mission trace could not build UI projection: ${error.message}`
      : "Source mission trace could not build UI projection.",
    severity: "error",
    path: "ui_projection",
  };
}

function diagnosticFromCompileDiagnostic(
  diagnostic: FrontierLabMissionCompileDiagnostic,
): SourceMissionTraceDiagnostic {
  return {
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    path: diagnostic.path,
  };
}

function traceInputFromCompileSuccess(
  result: FrontierLabMissionCompileSuccess,
): SourceMissionTraceInput {
  return {
    source_intent_input: result.source_intent_input,
    source_intake_result: result.source_intake_result,
    source_signals: result.source_signals,
    source_slices: result.source_slices,
    mission_preview: result.mission_preview,
    ui_projection: result.ui_projection,
    diagnostics: result.diagnostics.map(diagnosticFromCompileDiagnostic),
  };
}

function buildSourceMissionTraceRecordFromProjection(
  input: SourceMissionTraceInput,
  projection: MissionUiProjection,
): SourceMissionTraceRecord {
  const visibleSessionIds = projection.focused_queue.visible_sessions.map((session) => session.id);
  const deferredSessionIds = projection.focused_queue.deferred_sessions.map((session) => session.id);
  const lockedSessionIds = projection.focused_queue.locked_sessions.map((session) => session.id);
  const omittedSessionIdCount =
    Math.max(0, visibleSessionIds.length - SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT)
    + Math.max(0, deferredSessionIds.length - SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT)
    + Math.max(0, lockedSessionIds.length - SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT);
  const diagnostics = diagnosticsFrom(input, projection);
  const cappedDiagnostics = diagnostics.slice(0, SOURCE_MISSION_TRACE_DIAGNOSTIC_LIMIT);

  return {
    schema: "SourceMissionTraceRecord",
    version: SOURCE_MISSION_TRACE_SCHEMA_VERSION,
    id: `TRACE-${stableHash(
      `${input.source_intent_input.id}|${projection.mission_brief.mission_id}|${projection.active_session.id}|${projection.reproducibility_hash}`,
    )}`,
    status: statusFromProjection(projection),
    execution_job_status: projection.execution_job.status,
    intent: {
      id: input.source_intent_input.id,
      source_kind: input.source_intent_input.source_input.kind,
      source_url: sourceUrlFromIntent(input.source_intent_input),
      user_reason: input.source_intent_input.user_reason,
      optional_goal: input.source_intent_input.optional_goal ?? null,
    },
    source: {
      source_id: input.source_intake_result.source_id,
      canonical_url: input.source_intake_result.canonical_url ?? null,
      extraction_status: input.source_intake_result.extraction_status,
    },
    mission: {
      id: projection.mission_brief.mission_id,
      title: projection.mission_brief.title,
    },
    focused_queue: {
      active_track_id: projection.focused_queue.active_track.id,
      active_track_status: projection.focused_queue.active_track.status,
      visible_session_ids: cappedIds(visibleSessionIds),
      deferred_session_ids: cappedIds(deferredSessionIds),
      locked_session_ids: cappedIds(lockedSessionIds),
      status_counts: statusCountsFrom(input.mission_preview),
      total_session_count: input.mission_preview.first_sessions.length,
      omitted_session_id_count: omittedSessionIdCount,
    },
    active_session_id: projection.active_session.id,
    counts: {
      evidence_source_signal_count: input.source_signals.length,
      source_slice_count: input.source_slices.length,
      source_map_signal_count: projection.source_map.signals.length,
      source_map_slice_count: projection.source_map.slices.length,
      artifact_count: projection.active_session.artifacts.length,
      diagnostic_count: diagnostics.length,
      omitted_diagnostic_count: Math.max(0, diagnostics.length - cappedDiagnostics.length),
    },
    diagnostics: cappedDiagnostics,
    reproducibility_hash: projection.reproducibility_hash,
  };
}

export function buildSourceMissionTraceRecord(input: SourceMissionTraceInput): SourceMissionTraceRecord {
  const projection = input.ui_projection ?? buildMissionUiProjection(input);

  return buildSourceMissionTraceRecordFromProjection(input, projection);
}

export function buildSourceMissionTraceRecordResult(
  input: SourceMissionTraceInput,
): SourceMissionTraceBuildResult {
  try {
    const projection = input.ui_projection ?? buildMissionUiProjection(input);
    const diagnostics = diagnosticsFrom(input, projection);
    const trace = buildSourceMissionTraceRecordFromProjection(input, projection);

    return {
      ok: true,
      trace,
      diagnostics,
    };
  } catch (error) {
    return {
      ok: false,
      trace: null,
      diagnostics: [
        ...(input.diagnostics ?? []),
        ...input.source_intake_result.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          message: diagnostic.message,
          severity: diagnostic.severity,
          source_ref: diagnostic.source_ref,
        })),
        diagnosticFromUnknownError(error),
      ],
    };
  }
}

export function buildSourceMissionTraceRecordFromCompileResult(
  result: FrontierLabMissionCompileResult,
): SourceMissionTraceBuildResult {
  const diagnostics = result.diagnostics.map(diagnosticFromCompileDiagnostic);
  if (!result.ok) {
    return {
      ok: false,
      trace: null,
      diagnostics,
    };
  }

  return buildSourceMissionTraceRecordResult(traceInputFromCompileSuccess(result));
}
