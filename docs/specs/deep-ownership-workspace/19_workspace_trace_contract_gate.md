# 19: Workspace Trace Contract Gate

## Intent

Define the persistence gate that any future implementation touching workspace
creation, LLM runs, learning sessions, node attempts, retries, or compaction must
satisfy before it ships.

This is not a standalone implementation spec and not a work queue. It is the
contract entry point for durable trace behavior across the rest of the
workspace system.

Sibi must remember more than the latest generated plan:

```text
user intent
  -> compiler job
  -> LLM run trace
  -> accepted / blocked / failed decision
  -> workspace, session, nodes
  -> attempts, repairs, compactions, resumes
```

If the user tried to learn a topic and Sibi failed to create a usable
workspace, that failure is still product data. It must remain available for
retry, diagnosis, UX improvement, and future personalization.

## Product Problem

Without trace persistence, Sibi cannot answer basic product questions:

1. What did the user try to learn?
2. Did the compiler run, fallback, block, fail validation, or ask for context?
3. Which model and adapter produced the plan?
4. Which nodes were proposed, accepted, locked, or discarded?
5. What did compaction remove from the active context?
6. Did a later session resume from real history or from a fresh guess?

This matters because Sibi is not a normal chat product. The user does not manage
model context directly. The system owns context curation, compaction, trace
replay, and workspace memory.

## Gate Scope

Any future implementation that touches one of these surfaces must satisfy this
gate:

1. workspace creation attempts,
2. LLM adapter runs,
3. compiler decisions,
4. workspace/session/node snapshots,
5. user attempts and repair loops,
6. failed and blocked onboarding flows,
7. compaction summaries and dropped-context manifests,
8. replay/debug metadata for developers.

This gate does not define:

1. long-term concept mastery scoring beyond references into
   `UnderstandingMemory`,
2. product source mutation history,
3. billing or analytics aggregation,
4. cloud sync,
5. multi-device conflict resolution.

## Storage Contract

The first store should be local-first and append-oriented.

```text
WorkspaceTraceStore
  store_version
  root_path
  workspaces[]
  intent_attempts[]
  llm_runs[]
  compiler_decisions[]
  session_events[]
  compaction_events[]
  indexes
```

Suggested local layout:

```text
.sibar/
  traces/
    workspace-index.json
    intents/
      <intent_id>.jsonl
    llm-runs/
      <run_id>.json
    workspaces/
      <workspace_id>/
        workspace.json
        sessions.jsonl
        nodes.jsonl
        attempts.jsonl
        compactions.jsonl
```

The layout can change later, but the first version must be deterministic,
inspectable, and easy to replay in tests.

## Required Records

### WorkspaceIntentAttempt

```text
WorkspaceIntentAttempt
  intent_attempt_id
  created_at
  user_id?
  raw_user_text
  normalized_intent
  source_input_summary
  desired_output
  existing_state_ref?
  status: created | compiled | blocked | failed | superseded
  resulting_workspace_id?
  latest_decision_id?
```

Rules:

1. Record every `Generate workspace` attempt, even if the native runner is
   unavailable.
2. Never discard failed attempts.
3. Redact or summarize large pasted source text before indexing.

### LLMRunTrace

```text
LLMRunTrace
  run_id
  adapter: fixture | codex-exec | openai-api | opencode | local
  model
  reasoning_effort
  command_summary
  cwd
  sandbox
  approval_policy
  input_schema_version
  output_schema_version
  input_ref
  output_ref?
  started_at
  completed_at?
  status: queued | running | validating | completed | blocked | failed | cancelled
  validation_errors[]
  stderr_summary?
  token_usage?
```

Rules:

1. Store command metadata and compact diagnostics.
2. Do not render raw prompts or raw model output directly in UI.
3. Store enough references to reproduce or inspect a run locally.
4. Failed validation is a first-class trace, not an invisible fallback.

### CompilerDecisionTrace

```text
CompilerDecisionTrace
  decision_id
  intent_attempt_id
  run_id?
  decision: accepted | deterministic_fallback | need_context | rejected | failed
  reason_code
  reason_text
  accepted_plan_ref?
  fallback_plan_ref?
  blocked_questions[]
  invariant_results[]
```

Rules:

1. If fallback is used, record both the failed reason and the fallback plan ref.
2. If the model asks for missing context, preserve the missing fields.
3. The UI must be able to show whether the plan came from Codex, fixture, or
   fallback.

### WorkspaceSessionTrace

```text
WorkspaceSessionTrace
  workspace_id
  session_id
  selected_node_id
  opened_at
  closed_at?
  events[]
  attempts[]
  evidence_refs[]
  readiness_refs[]
  repair_refs[]
```

Rules:

1. A workspace can have many sessions.
2. Sessions must reference the plan/node version they were opened from.
3. User attempts belong to sessions, not to model runs.

### CompactionTrace

```text
CompactionTrace
  compaction_id
  workspace_id
  session_id?
  created_at
  reason: context_limit | user_resume | manual_cleanup | model_handoff
  kept_refs[]
  dropped_refs[]
  summary
  risks[]
  next_rehydrate_refs[]
```

Rules:

1. Compaction is a product event, not an implementation accident.
2. Every compaction must say what was kept, what was dropped, and what risk
   remains.
3. Rehydration must use stored refs instead of asking the model to infer
   history.

## Resume And Replay

The store must support:

1. reopen last workspace,
2. list all intent attempts for a topic,
3. retry a failed onboarding attempt with more context,
4. replay a compiler decision from stored refs,
5. resume a session after compaction,
6. inspect why a plan used fallback instead of a model-generated result.

Minimum API shape:

```text
record_intent_attempt(input) -> WorkspaceIntentAttempt
record_llm_run(trace) -> LLMRunTrace
record_compiler_decision(decision) -> CompilerDecisionTrace
record_session_event(event) -> WorkspaceSessionTrace
record_compaction(event) -> CompactionTrace
load_workspace_history(workspace_id) -> WorkspaceHistory
list_intent_attempts(query) -> WorkspaceIntentAttempt[]
```

## UI Requirements

The first UI does not need a full history browser. It must show enough state to
avoid invisible failures:

1. current compiler status,
2. whether result came from model, fixture, or fallback,
3. last failure/block reason,
4. retry action when context is missing,
5. resume action for an existing workspace,
6. optional developer trace id in debug mode.

No user-facing surface should expose raw model prompts by default.

## Required Checks

Any future implementation spec that touches this gate must prove:

1. every workspace creation attempt is persisted,
2. failed or blocked model runs are inspectable and replayable,
3. session events and user attempts survive app restart,
4. compaction records kept/dropped refs and rehydration risks.

Minimum tests:

1. create workspace with accepted model plan -> trace records exist,
2. create workspace with failed model plan -> failed run plus fallback decision
   exist,
3. restart app/runtime -> workspace history can be loaded,
4. compact session -> `CompactionTrace` records kept/dropped refs,
5. replay stored fixture/model output -> same decision fingerprint.

## Before Future Implementation

Before implementing any persistence-adjacent spec, answer:

1. which trace records are created,
2. which record owns each user-visible status,
3. how failed attempts are retained,
4. how raw prompts and raw model outputs are redacted or referenced,
5. how compaction can be replayed,
6. how the UI distinguishes model, fixture, and fallback results.

## Pending Decisions

1. Whether the first store is JSONL-only or SQLite-backed.
2. How much raw prompt/model output can be retained locally before redaction.
3. Whether user-facing history is per workspace, per topic, or global.
4. How cloud sync later handles private repo paths and pasted source.
5. How trace retention policies interact with study privacy.
