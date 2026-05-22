import assert from "node:assert/strict";
import test from "node:test";

import type { SourceIntentInput } from "../engine/runtime-source-mission-contracts.ts";
import {
  SOURCE_MISSION_SCHEMA_VERSION,
} from "../engine/runtime-source-mission-contracts.ts";
import {
  compileFrontierLabMissionFromIntent,
} from "../engine/runtime-source-mission-frontier-lab-compiler.ts";
import type { FrontierLabMissionCompileResult } from "../engine/runtime-source-mission-frontier-lab-compiler.ts";
import {
  FRONTIER_LAB_BLOG_URL,
  frontierLabSourceIntent,
} from "../engine/runtime-source-mission-frontier-lab-fixture.ts";
import {
  buildSourceMissionTraceRecordFromCompileResult,
} from "../engine/runtime-source-mission-trace.ts";
import {
  appendSourceMissionCompileTrace,
  createWorkspaceTraceStore,
} from "../engine/runtime-source-mission-trace-store.ts";
import type { WorkspaceTraceStore } from "../engine/runtime-source-mission-trace-store.ts";

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeIntent(overrides: Partial<SourceIntentInput> = {}): SourceIntentInput {
  return {
    ...frontierLabSourceIntent,
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-TEST",
    created_at: "2026-05-22T12:30:00.000Z",
    user_reason: "Persist this source-intent attempt as durable workspace trace data.",
    optional_goal: "Keep the trace store bounded and replayable.",
    optional_constraints: ["append-only", "no raw source payloads"],
    ...overrides,
  };
}

function compileOrThrow(intent = makeIntent()) {
  const compiled = compileFrontierLabMissionFromIntent(intent);
  if (!compiled.ok) throw new Error(compiled.diagnostics.map((diagnostic) => diagnostic.code).join(", "));

  return compiled;
}

function stringifyStore(store: WorkspaceTraceStore): string {
  return JSON.stringify(store);
}

test("happy path frontier-lab append records attempt, intake, compiler decision, and mission snapshot", () => {
  const input = makeIntent();
  const compiled = compileOrThrow(input);
  const traceResult = buildSourceMissionTraceRecordFromCompileResult(compiled);
  const store = appendSourceMissionCompileTrace(createWorkspaceTraceStore(), input, compiled, traceResult);

  assert.equal(store.store_version, "0.1.0");
  assert.equal(store.intent_attempts.length, 1);
  assert.equal(store.source_intake_results.length, 1);
  assert.equal(store.compiler_decisions.length, 1);
  assert.equal(store.mission_snapshots.length, 1);
  assert.equal(store.adapter_runs.length, 0);
  assert.equal(store.session_events.length, 0);
  assert.equal(store.compaction_events.length, 0);

  assert.equal(store.intent_attempts[0].source_intent_id, input.id);
  assert.equal(store.intent_attempts[0].status, "completed");
  assert.equal(store.intent_attempts[0].created_at, input.created_at);
  assert.equal(store.intent_attempts[0].canonical_url, FRONTIER_LAB_BLOG_URL);
  assert.equal(store.source_intake_results[0].canonical_url, FRONTIER_LAB_BLOG_URL);
  assert.equal(store.compiler_decisions[0].status, "accepted");
  assert.equal(store.compiler_decisions[0].trace_id, traceResult.ok ? traceResult.trace.id : null);
  assert.equal(store.compiler_decisions[0].reproducibility_hash, traceResult.ok ? traceResult.trace.reproducibility_hash : null);
  assert.equal(store.compiler_decisions[0].diagnostic_codes.includes("frontier_lab.static_adapter"), true);
  assert.equal(store.mission_snapshots[0].trace_id, traceResult.ok ? traceResult.trace.id : "");
  assert.equal(store.mission_snapshots[0].reproducibility_hash.length > 0, true);
  assert.equal(store.mission_snapshots[0].counts.source_map_signal_count, 5);
});

test("unsupported URL failure is preserved as an attempt and rejected compiler decision without snapshot", () => {
  const input = makeIntent({
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-UNSUPPORTED",
    source_input: {
      kind: "url",
      value: "https://example.com/not-supported",
    },
  });
  const compiled = compileFrontierLabMissionFromIntent(input);
  const store = appendSourceMissionCompileTrace(createWorkspaceTraceStore(), input, compiled);

  assert.equal(compiled.ok, false);
  assert.equal(store.intent_attempts.length, 1);
  assert.equal(store.intent_attempts[0].status, "failed");
  assert.equal(store.intent_attempts[0].source.url, "https://example.com/not-supported");
  assert.equal(store.intent_attempts[0].canonical_url, "https://example.com/not-supported");
  assert.equal(store.intent_attempts[0].diagnostic_codes.includes("frontier_lab.unsupported_url"), true);
  assert.equal(store.source_intake_results.length, 0);
  assert.equal(store.compiler_decisions.length, 1);
  assert.equal(store.compiler_decisions[0].status, "rejected");
  assert.equal(store.compiler_decisions[0].reason, "compile_failed");
  assert.equal(store.compiler_decisions[0].trace_id, null);
  assert.equal(store.compiler_decisions[0].mission_id, null);
  assert.equal(store.compiler_decisions[0].reproducibility_hash, null);
  assert.equal(store.mission_snapshots.length, 0);
});

test("trace build failure after compile success is retained as blocked rejected decision without throwing", () => {
  const input = makeIntent({
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-BLOCKED",
  });
  const compiled = compileOrThrow(input);
  const compileResult: FrontierLabMissionCompileResult = {
    ok: true,
    diagnostics: compiled.diagnostics,
    source_intent_input: compiled.source_intent_input,
    source_intake_result: compiled.source_intake_result,
    source_signals: compiled.source_signals,
    source_slices: compiled.source_slices,
    mission_preview: {
      ...compiled.mission_preview,
      first_sessions: [
        {
          ...compiled.mission_preview.first_sessions[0],
          source_slice_refs: ["UNKNOWN-SOURCE-REF"],
        },
        ...compiled.mission_preview.first_sessions.slice(1),
      ],
    },
  };

  assert.doesNotThrow(() => appendSourceMissionCompileTrace(createWorkspaceTraceStore(), input, compileResult));
  const store = appendSourceMissionCompileTrace(createWorkspaceTraceStore(), input, compileResult);

  assert.equal(store.intent_attempts.length, 1);
  assert.equal(store.intent_attempts[0].status, "blocked");
  assert.equal(store.source_intake_results.length, 1);
  assert.equal(store.compiler_decisions.length, 1);
  assert.equal(store.compiler_decisions[0].status, "rejected");
  assert.equal(store.compiler_decisions[0].reason, "trace_build_failed");
  assert.equal(
    store.compiler_decisions[0].diagnostic_codes.includes("source_mission_trace.ui_projection_failed"),
    true,
  );
  assert.equal(store.compiler_decisions[0].trace_id, null);
  assert.equal(store.mission_snapshots.length, 0);
});

test("append helpers are non-mutating and preserve repeated attempts append-only", () => {
  const input = makeIntent({
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-IMMUTABLE",
  });
  const compiled = compileOrThrow(input);
  const retryInput = {
    ...input,
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-IMMUTABLE-RETRY",
    created_at: "2026-05-22T12:31:00.000Z",
  };
  const retryCompiled = compileOrThrow(retryInput);
  const baseStore = createWorkspaceTraceStore();
  const baseSnapshot = cloneData(baseStore);
  const first = appendSourceMissionCompileTrace(baseStore, input, compiled);
  const second = appendSourceMissionCompileTrace(first, retryInput, retryCompiled);

  assert.deepEqual(baseStore, baseSnapshot);
  assert.notEqual(first, baseStore);
  assert.notEqual(second, first);
  assert.equal(first.intent_attempts.length, 1);
  assert.equal(second.intent_attempts.length, 2);
  assert.deepEqual(first.intent_attempts.map((attempt) => attempt.id), ["ATTEMPT-INTENT-FRONTIER-LAB-TRACE-STORE-IMMUTABLE"]);
  assert.deepEqual(second.intent_attempts.map((attempt) => attempt.id), [
    "ATTEMPT-INTENT-FRONTIER-LAB-TRACE-STORE-IMMUTABLE",
    "ATTEMPT-INTENT-FRONTIER-LAB-TRACE-STORE-IMMUTABLE-RETRY",
  ]);
});

test("store primary records omit raw source excerpts, pasted source text, and source_map payloads", () => {
  const rawSourceText = "RAW PASTED SOURCE TEXT THAT MUST NOT BE STORED";
  const failedInput = makeIntent({
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-RAW-SOURCE",
    source_input: {
      kind: "pasted_text",
      value: rawSourceText,
    },
  });
  const failedCompile = compileFrontierLabMissionFromIntent(failedInput);
  const failedStore = appendSourceMissionCompileTrace(createWorkspaceTraceStore(), failedInput, failedCompile);

  assert.equal(failedStore.intent_attempts[0].source.url, null);
  assert.equal(failedStore.intent_attempts[0].source.redacted_text_character_count, rawSourceText.length);
  assert.equal(stringifyStore(failedStore).includes(rawSourceText), false);

  const compiled = compileOrThrow(makeIntent({
    id: "INTENT-FRONTIER-LAB-TRACE-STORE-NO-SOURCE-MAP",
  }));
  const store = appendSourceMissionCompileTrace(createWorkspaceTraceStore(), compiled.source_intent_input, compiled);
  const serialized = stringifyStore(store);

  assert.equal(serialized.includes("\"source_map\":"), false);
  assert.equal(serialized.includes("source_excerpt_ref"), false);
  assert.equal(serialized.includes("The Practical Next Steps section points readers first"), false);
  assert.equal(Object.hasOwn(store.mission_snapshots[0], "source_map"), false);
});
