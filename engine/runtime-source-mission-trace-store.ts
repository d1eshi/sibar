import type {
  SourceInputKind,
  SourceIntakeDiagnostic,
  SourceIntakeExtractionStatus,
  SourceIntakeResult,
  SourceIntentInput,
} from "./runtime-source-mission-contracts.ts";
import type {
  FrontierLabMissionCompileDiagnostic,
  FrontierLabMissionCompileResult,
} from "./runtime-source-mission-frontier-lab-compiler.ts";
import {
  buildSourceMissionTraceRecordFromCompileResult,
} from "./runtime-source-mission-trace.ts";
import type {
  SourceMissionTraceBuildResult,
  SourceMissionTraceDiagnostic,
  SourceMissionTraceRecord,
  SourceMissionTraceStatus,
} from "./runtime-source-mission-trace.ts";

export const WORKSPACE_TRACE_STORE_VERSION = "0.1.0";

export type WorkspaceTraceStoreVersion = typeof WORKSPACE_TRACE_STORE_VERSION;

export type WorkspaceTraceSourceRef = {
  kind: SourceInputKind;
  url: string | null;
  redacted_text_character_count: number | null;
};

export type WorkspaceTraceDiagnostic = {
  code: string;
  message: string;
  severity: SourceIntakeDiagnostic["severity"];
  path?: string;
  source_ref?: string;
};

export type SourceIntentAttemptTrace = {
  schema: "SourceIntentAttemptTrace";
  id: string;
  source_intent_id: string;
  created_at: string;
  status: SourceMissionTraceStatus;
  source: WorkspaceTraceSourceRef;
  user_reason: string;
  optional_goal: string | null;
  optional_constraints: string[];
  canonical_url: string | null;
  diagnostic_codes: string[];
};

export type SourceIntakeResultTrace = {
  schema: "SourceIntakeResultTrace";
  id: string;
  source_intent_id: string | null;
  recorded_at: string;
  source_id: string;
  source_kind: SourceInputKind;
  canonical_url: string | null;
  title: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string | null;
  raw_text_ref: string;
  readable_text_ref: string;
  extraction_status: SourceIntakeExtractionStatus;
  diagnostics: WorkspaceTraceDiagnostic[];
};

export type AdapterRunTrace = {
  schema: "AdapterRunTrace";
  id: string;
  source_intent_id: string;
  adapter_kind: "fixture" | "codex-exec" | "openai-api" | "opencode" | "local-model" | "unknown";
  status: "completed" | "blocked" | "failed";
  started_at: string;
  completed_at: string | null;
  diagnostic_codes: string[];
};

export type CompilerDecisionTrace = {
  schema: "CompilerDecisionTrace";
  id: string;
  source_intent_id: string;
  decided_at: string;
  status: "accepted" | "rejected";
  reason: "compiled" | "compile_failed" | "trace_build_failed";
  diagnostic_codes: string[];
  trace_id: string | null;
  mission_id: string | null;
  reproducibility_hash: string | null;
};

export type MissionSnapshotTrace = {
  schema: "MissionSnapshotTrace";
  id: string;
  source_intent_id: string;
  trace_id: string;
  created_at: string;
  status: SourceMissionTraceStatus;
  mission_id: string;
  mission_title: string;
  active_session_id: string;
  reproducibility_hash: string;
  focused_queue: SourceMissionTraceRecord["focused_queue"];
  counts: SourceMissionTraceRecord["counts"];
  diagnostics: SourceMissionTraceDiagnostic[];
};

export type SessionEventTrace = {
  schema: "SessionEventTrace";
  id: string;
  session_id: string;
  event_type: string;
  occurred_at: string;
  diagnostic_codes: string[];
};

export type CompactionEventTrace = {
  schema: "CompactionEventTrace";
  id: string;
  occurred_at: string;
  source_record_count: number;
  summary_ref: string;
  diagnostic_codes: string[];
};

export type WorkspaceTraceStore = {
  schema: "WorkspaceTraceStore";
  store_version: WorkspaceTraceStoreVersion;
  intent_attempts: SourceIntentAttemptTrace[];
  source_intake_results: SourceIntakeResultTrace[];
  adapter_runs: AdapterRunTrace[];
  compiler_decisions: CompilerDecisionTrace[];
  mission_snapshots: MissionSnapshotTrace[];
  session_events: SessionEventTrace[];
  compaction_events: CompactionEventTrace[];
};

function sourceUrlFromIntent(input: SourceIntentInput): string | null {
  return input.source_input.kind === "url" ? input.source_input.value : null;
}

function redactedCharacterCountFromIntent(input: SourceIntentInput): number | null {
  if (input.source_input.kind !== "pasted_text" && input.source_input.kind !== "selected_text") return null;

  return input.source_input.value.length;
}

function diagnosticsFromCompile(
  diagnostics: FrontierLabMissionCompileDiagnostic[],
): WorkspaceTraceDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    path: diagnostic.path,
  }));
}

function diagnosticsFromTrace(
  diagnostics: SourceMissionTraceDiagnostic[],
): WorkspaceTraceDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    path: diagnostic.path,
    source_ref: diagnostic.source_ref,
  }));
}

function diagnosticCodes(diagnostics: Array<{ code: string }>): string[] {
  return diagnostics.map((diagnostic) => diagnostic.code);
}

function canonicalUrlFromResult(
  input: SourceIntentInput,
  compileResult: FrontierLabMissionCompileResult,
  traceResult: SourceMissionTraceBuildResult,
): string | null {
  if (traceResult.ok) return traceResult.trace.source.canonical_url;
  if (compileResult.ok) return compileResult.source_intake_result.canonical_url ?? null;

  return sourceUrlFromIntent(input);
}

function attemptStatusFrom(
  compileResult: FrontierLabMissionCompileResult,
  traceResult: SourceMissionTraceBuildResult,
): SourceMissionTraceStatus {
  if (!compileResult.ok) return "failed";
  if (!traceResult.ok) return "blocked";

  return traceResult.trace.status;
}

function sourceIntakeTraceFrom(result: SourceIntakeResult, recordedAt: string): SourceIntakeResultTrace {
  return {
    schema: "SourceIntakeResultTrace",
    id: result.id,
    source_intent_id: result.source_intent_id ?? null,
    recorded_at: result.fetched_at ?? recordedAt,
    source_id: result.source_id,
    source_kind: result.source_kind,
    canonical_url: result.canonical_url ?? null,
    title: result.title ?? null,
    author: result.author ?? null,
    published_at: result.published_at ?? null,
    fetched_at: result.fetched_at ?? null,
    raw_text_ref: result.raw_text_ref,
    readable_text_ref: result.readable_text_ref,
    extraction_status: result.extraction_status,
    diagnostics: result.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity,
      source_ref: diagnostic.source_ref,
    })),
  };
}

function compilerDecisionFrom(
  input: SourceIntentInput,
  compileResult: FrontierLabMissionCompileResult,
  traceResult: SourceMissionTraceBuildResult,
): CompilerDecisionTrace {
  const trace = traceResult.ok ? traceResult.trace : null;

  return {
    schema: "CompilerDecisionTrace",
    id: `DECISION-${input.id}`,
    source_intent_id: input.id,
    decided_at: input.created_at,
    status: compileResult.ok && traceResult.ok ? "accepted" : "rejected",
    reason: compileResult.ok ? (traceResult.ok ? "compiled" : "trace_build_failed") : "compile_failed",
    diagnostic_codes: [
      ...diagnosticCodes(compileResult.diagnostics),
      ...diagnosticCodes(traceResult.diagnostics),
    ],
    trace_id: trace?.id ?? null,
    mission_id: trace?.mission.id ?? null,
    reproducibility_hash: trace?.reproducibility_hash ?? null,
  };
}

function missionSnapshotFrom(input: SourceIntentInput, trace: SourceMissionTraceRecord): MissionSnapshotTrace {
  return {
    schema: "MissionSnapshotTrace",
    id: `SNAPSHOT-${trace.id}`,
    source_intent_id: input.id,
    trace_id: trace.id,
    created_at: input.created_at,
    status: trace.status,
    mission_id: trace.mission.id,
    mission_title: trace.mission.title,
    active_session_id: trace.active_session_id,
    reproducibility_hash: trace.reproducibility_hash,
    focused_queue: trace.focused_queue,
    counts: trace.counts,
    diagnostics: trace.diagnostics,
  };
}

export function createWorkspaceTraceStore(): WorkspaceTraceStore {
  return {
    schema: "WorkspaceTraceStore",
    store_version: WORKSPACE_TRACE_STORE_VERSION,
    intent_attempts: [],
    source_intake_results: [],
    adapter_runs: [],
    compiler_decisions: [],
    mission_snapshots: [],
    session_events: [],
    compaction_events: [],
  };
}

export function appendSourceMissionCompileTrace(
  store: WorkspaceTraceStore,
  input: SourceIntentInput,
  compileResult: FrontierLabMissionCompileResult,
  traceResult: SourceMissionTraceBuildResult = buildSourceMissionTraceRecordFromCompileResult(compileResult),
): WorkspaceTraceStore {
  const status = attemptStatusFrom(compileResult, traceResult);
  const diagnostics = [
    ...diagnosticsFromCompile(compileResult.diagnostics),
    ...diagnosticsFromTrace(traceResult.diagnostics),
  ];
  const attempt: SourceIntentAttemptTrace = {
    schema: "SourceIntentAttemptTrace",
    id: `ATTEMPT-${input.id}`,
    source_intent_id: input.id,
    created_at: input.created_at,
    status,
    source: {
      kind: input.source_input.kind,
      url: sourceUrlFromIntent(input),
      redacted_text_character_count: redactedCharacterCountFromIntent(input),
    },
    user_reason: input.user_reason,
    optional_goal: input.optional_goal ?? null,
    optional_constraints: input.optional_constraints ?? [],
    canonical_url: canonicalUrlFromResult(input, compileResult, traceResult),
    diagnostic_codes: diagnosticCodes(diagnostics),
  };
  const sourceIntakeResults = compileResult.ok
    ? [...store.source_intake_results, sourceIntakeTraceFrom(compileResult.source_intake_result, input.created_at)]
    : store.source_intake_results;
  const missionSnapshots = traceResult.ok
    ? [...store.mission_snapshots, missionSnapshotFrom(input, traceResult.trace)]
    : store.mission_snapshots;

  return {
    ...store,
    intent_attempts: [...store.intent_attempts, attempt],
    source_intake_results: sourceIntakeResults,
    compiler_decisions: [
      ...store.compiler_decisions,
      compilerDecisionFrom(input, compileResult, traceResult),
    ],
    mission_snapshots: missionSnapshots,
  };
}
