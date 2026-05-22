import assert from "node:assert/strict";
import test from "node:test";

import type { SourceIntentInput } from "../engine/runtime-source-mission-contracts.ts";
import { SOURCE_MISSION_SCHEMA_VERSION } from "../engine/runtime-source-mission-contracts.ts";
import {
  compileFrontierLabMissionFromIntent,
} from "../engine/runtime-source-mission-frontier-lab-compiler.ts";
import type { FrontierLabMissionCompileResult } from "../engine/runtime-source-mission-frontier-lab-compiler.ts";
import {
  FRONTIER_LAB_BLOG_URL,
  frontierLabMissionPreview,
  frontierLabSourceIntent,
} from "../engine/runtime-source-mission-frontier-lab-fixture.ts";
import {
  buildSourceMissionTraceRecord,
  buildSourceMissionTraceRecordFromCompileResult,
  buildSourceMissionTraceRecordResult,
  SOURCE_MISSION_TRACE_DIAGNOSTIC_LIMIT,
  SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT,
} from "../engine/runtime-source-mission-trace.ts";
import type { SourceMissionTraceBuildResult, SourceMissionTraceInput } from "../engine/runtime-source-mission-trace.ts";

function makeIntent(overrides: Partial<SourceIntentInput> = {}): SourceIntentInput {
  return {
    ...frontierLabSourceIntent,
    id: "INTENT-FRONTIER-LAB-TRACE-TEST",
    created_at: "2026-05-22T12:00:00.000Z",
    user_reason: "Trace the blog into a reproducible source-backed mission.",
    optional_goal: "Keep the first trace bounded to JAX and scaling foundations.",
    optional_constraints: ["preserve source evidence", "summarize primary trace fields"],
    ...overrides,
  };
}

function compileTrace(intent = makeIntent()) {
  const compiled = compileFrontierLabMissionFromIntent(intent);
  const traceResult = buildSourceMissionTraceRecordFromCompileResult(compiled);

  return { compiled, traceResult };
}

function traceInputFromCompiled(): SourceMissionTraceInput {
  const compiled = compileFrontierLabMissionFromIntent(makeIntent());
  if (!compiled.ok) throw new Error(compiled.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  return {
    source_intent_input: compiled.source_intent_input,
    source_intake_result: compiled.source_intake_result,
    source_signals: compiled.source_signals,
    source_slices: compiled.source_slices,
    mission_preview: compiled.mission_preview,
    ui_projection: compiled.ui_projection,
    diagnostics: compiled.diagnostics,
  };
}

function unwrapTrace(result: SourceMissionTraceBuildResult) {
  if (!result.ok) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));
  }

  return result.trace;
}

test("frontier-lab blog intent produces a stable executable trace summary", () => {
  const { compiled, traceResult } = compileTrace();
  const trace = unwrapTrace(traceResult);

  assert.equal(compiled.ok, true);
  assert.equal(trace.status, "completed");
  assert.equal(trace.intent.id, "INTENT-FRONTIER-LAB-TRACE-TEST");
  assert.equal(trace.intent.source_url, FRONTIER_LAB_BLOG_URL);
  assert.equal(trace.source.canonical_url, FRONTIER_LAB_BLOG_URL);
  assert.equal(trace.mission.title, frontierLabMissionPreview.mission_title);
  assert.equal(trace.focused_queue.visible_session_ids.length, 3);
  assert.equal(trace.active_session_id, frontierLabMissionPreview.first_sessions[0].id);
  assert.equal(trace.counts.evidence_source_signal_count, 5);
  assert.equal(trace.counts.source_slice_count, 4);
  assert.equal(trace.counts.artifact_count >= 1, true);
  assert.equal(trace.reproducibility_hash.length > 0, true);
  assert.equal(trace.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.static_adapter"), true);
});

test("unsupported URL returns diagnostics without creating a trace", () => {
  const compiled = compileFrontierLabMissionFromIntent(makeIntent({
    source_input: {
      kind: "url",
      value: "https://example.com/not-the-frontier-lab-blog",
    },
  }));
  const traceResult = buildSourceMissionTraceRecordFromCompileResult(compiled);

  assert.equal(compiled.ok, false);
  assert.equal(traceResult.ok, false);
  assert.equal(traceResult.trace, null);
  assert.equal(traceResult.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.unsupported_url"), true);
});

test("custom reason and optional goal are preserved in trace intent fields", () => {
  const userReason = "I need this exact post turned into an interview-prep trace.";
  const optionalGoal = "Only preserve the first two resource signals.";
  const { traceResult } = compileTrace(makeIntent({
    user_reason: userReason,
    optional_goal: optionalGoal,
  }));
  const trace = unwrapTrace(traceResult);

  assert.equal(trace.intent.user_reason, userReason);
  assert.equal(trace.intent.optional_goal, optionalGoal);
});

test("trace identity and reproducibility hash are stable between equivalent calls", () => {
  const first = compileTrace();
  const second = compileTrace();
  const firstTrace = unwrapTrace(first.traceResult);
  const secondTrace = unwrapTrace(second.traceResult);

  assert.equal(firstTrace.id, secondTrace.id);
  assert.equal(firstTrace.reproducibility_hash, secondTrace.reproducibility_hash);
  assert.deepEqual(firstTrace.focused_queue, secondTrace.focused_queue);
});

test("trace caps primary queue ids and does not expose raw source map payloads", () => {
  const compiled = compileFrontierLabMissionFromIntent(makeIntent({
    id: "INTENT-FRONTIER-LAB-TRACE-LARGE-QUEUE",
    version: SOURCE_MISSION_SCHEMA_VERSION,
  }));

  if (!compiled.ok) throw new Error(compiled.diagnostics.map((diagnostic) => diagnostic.code).join(", "));
  assert.equal(compiled.ok, true);

  const extraSessions = Array.from({ length: 100 }, (_, index) => ({
    id: `SES-FRONTIER-EXTRA-${String(index).padStart(3, "0")}`,
    track_id: "TRK-FRONTIER-DEFERRED-SYSTEMS",
    title: `Extra deferred source check ${index}`,
    source_slice_refs: ["SIG-FRONTIER-PALLAS-KERNEL"],
    operation: "Explain the deferred Pallas source target with cited source evidence.",
    recommended_artifacts: ["technical note"],
    status: "later" as const,
    prerequisite_note: "Synthetic queue pressure fixture.",
  }));
  const trace = buildSourceMissionTraceRecord({
    source_intent_input: compiled.source_intent_input,
    source_intake_result: compiled.source_intake_result,
    source_signals: compiled.source_signals,
    source_slices: compiled.source_slices,
    mission_preview: {
      ...compiled.mission_preview,
      first_sessions: [...compiled.mission_preview.first_sessions, ...extraSessions],
    },
    diagnostics: compiled.diagnostics,
  });

  assert.equal(trace.focused_queue.total_session_count, 103);
  assert.equal(trace.focused_queue.visible_session_ids.length <= SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT, true);
  assert.equal(trace.focused_queue.deferred_session_ids.length <= SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT, true);
  assert.equal(trace.focused_queue.locked_session_ids.length <= SOURCE_MISSION_TRACE_QUEUE_ID_LIMIT, true);
  assert.equal(trace.focused_queue.omitted_session_id_count > 0, true);
  assert.equal(Object.hasOwn(trace, "source_map"), false);
  assert.equal(Object.hasOwn(trace, "source_signals"), false);
  assert.equal(Object.hasOwn(trace, "source_slices"), false);
  assert.equal(JSON.stringify(trace).includes("The Practical Next Steps section points readers first"), false);
});

test("trace caps primary diagnostics while retaining total diagnostic count", () => {
  const input = traceInputFromCompiled();
  const syntheticDiagnostics = Array.from({ length: SOURCE_MISSION_TRACE_DIAGNOSTIC_LIMIT + 7 }, (_, index) => ({
    code: `trace.synthetic.${index}`,
    message: `Synthetic trace diagnostic ${index}`,
    severity: "info" as const,
    path: `synthetic.${index}`,
  }));
  const trace = buildSourceMissionTraceRecord({
    ...input,
    diagnostics: syntheticDiagnostics,
  });

  assert.equal(trace.diagnostics.length, SOURCE_MISSION_TRACE_DIAGNOSTIC_LIMIT);
  assert.equal(trace.counts.diagnostic_count > trace.diagnostics.length, true);
  assert.equal(
    trace.counts.omitted_diagnostic_count,
    trace.counts.diagnostic_count - SOURCE_MISSION_TRACE_DIAGNOSTIC_LIMIT,
  );
});

test("manual trace build result fails closed when projection bridge rejects invalid source refs", () => {
  const input = traceInputFromCompiled();
  const result = buildSourceMissionTraceRecordResult({
    ...input,
    ui_projection: undefined,
    mission_preview: {
      ...input.mission_preview,
      first_sessions: [
        {
          ...input.mission_preview.first_sessions[0],
          source_slice_refs: ["UNKNOWN-SOURCE-REF"],
        },
        ...input.mission_preview.first_sessions.slice(1),
      ],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.trace, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "source_mission_trace.ui_projection_failed"),
    true,
  );
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.message.includes("unknown_source_ref")),
    true,
  );
});

test("compile trace path fails closed when successful compile output lacks a valid projection", () => {
  const input = traceInputFromCompiled();
  const compileResult: FrontierLabMissionCompileResult = {
    ok: true,
    diagnostics: [],
    source_intent_input: input.source_intent_input,
    source_intake_result: input.source_intake_result,
    source_signals: input.source_signals,
    source_slices: input.source_slices,
    mission_preview: {
      ...input.mission_preview,
      first_sessions: [
        {
          ...input.mission_preview.first_sessions[0],
          operation: "Perform a totally unmapped source operation.",
        },
        ...input.mission_preview.first_sessions.slice(1),
      ],
    },
  };

  const result = buildSourceMissionTraceRecordFromCompileResult(compileResult);

  assert.equal(result.ok, false);
  assert.equal(result.trace, null);
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "source_mission_trace.ui_projection_failed"),
    true,
  );
  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.message.includes("unsupported_operation")),
    true,
  );
});
