# 02: Runtime Boundary

## Goal

Define the minimum internal runtime boundary for the source-driven mission MVP.

The UI owns interaction and rendering. Rust/Tauri or other host code owns source
intake jobs, adapter execution, validation, trace persistence, and projection.
The UI must never call an LLM runner directly or expose provider controls as the
primary product action.

## Internal Flow

```text
SourceIntentInput
  -> SourceIntakeResult
  -> SourceSignals
  -> internal WorkspacePlan/MissionPlan candidate
  -> validation
  -> MissionPreview projection
  -> Mission Brief / Focused Queue / Active Session projection
  -> trace records
```

`WorkspacePlan` and `WorkspaceSnapshot` may remain internal names. Product UI
projects them into mission-language objects.

## Execution Job

```text
ExecutionJob
  job_id
  status: queued | running | validating | completed | blocked | failed | cancelled
  runner
  request_id
  created_at
  updated_at
  cancel_requested_at?
```

Status transitions are deterministic:

```text
queued -> running -> validating -> completed | blocked | failed | cancelled
```

Cancellation is explicit and terminal. Timeout is not the canonical failure
strategy.

## Compiler Boundary

The compiler consumes source-intent data and emits a bounded plan candidate:

```text
MissionPlanCandidate
  plan_id
  source_bundle_fingerprint
  mission_preview
  proposed_tracks[]
  proposed_sessions[]
  source_map
  artifact_recommendations[]
  diagnostics[]
  repair_questions[]
```

Invariants:

1. Every proposed track cites source signals.
2. Every proposed session cites source slices.
3. Visible sessions are capped to a small queue.
4. Source signals remain distinct from sessions.
5. The compiler emits repair questions instead of guessing when source or user
   reason is insufficient.

## Adapter Boundary

The first runner is fixture-first. Later runners are additive:

1. fixture,
2. `codex-exec`,
3. OpenAI API,
4. Opencode,
5. local model.

Raw model output is untrusted. Runtime must parse, schema-check, validate
pedagogy invariants, and classify the result before any UI projection consumes
it.

Adapter output can only become state through:

```text
parse -> schema validation -> source/evidence validation -> pedagogy validation -> accept/repair/reject
```

## UI Projection

```text
MissionUiProjection
  ui_schema_version
  generated_at
  source_intake_status
  execution_job { id, status, reason_code? }
  mission_preview?
  mission_brief?
  focused_queue?
  active_session?
  source_map_ref?
  next_actions[2..3]
  blocked_state[]
  reproducibility_hash
```

Projection invariants:

1. `next_actions` has two or three visible actions.
2. Every rendered artifact references source evidence.
3. Locked or deferred sessions include reasons.
4. Source Map is available but not the default navigation.
5. UI never renders raw adapter output.
6. UI never claims whole-mission ownership from one session.

## Trace Boundary

Every source-intent attempt is durable product data, including failures.

```text
WorkspaceTraceStore
  store_version
  intent_attempts[]
  source_intake_results[]
  adapter_runs[]
  compiler_decisions[]
  mission_snapshots[]
  session_events[]
  compaction_events[]
```

Required records:

1. source intent attempt,
2. source intake result,
3. adapter run trace when an adapter runs,
4. compiler decision trace,
5. mission/session projection snapshot,
6. user attempts and repairs,
7. compaction summaries when context is reduced.

Rules:

1. Never discard failed or blocked source-intent attempts.
2. Redact or summarize large pasted source text before indexing.
3. Store enough metadata to replay fixture and validation paths.
4. Do not render raw prompts or raw model output directly in user UI.

## Non-Goals

1. No product source mutation from the execution pipeline.
2. No runner/provider button in the primary UI.
3. No hidden filesystem scanning outside declared boundaries.
4. No full persistence architecture beyond the trace contract required by the
   MVP.
