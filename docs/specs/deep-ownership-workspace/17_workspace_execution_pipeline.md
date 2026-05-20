# 17: Workspace Execution Pipeline

## Intent

Define the end-to-end Rust execution flow for producing a UI-ready workspace
from user request to snapshot, including repair loops and context-question prompts.

The pipeline must be robust to missing source data, schema drift, and LLM uncertainty,
while preserving a clean audit trail and deterministic outputs for UI.

## Data Contract

```text
ExecutionRequest
  request_id
  user_intent_id
  source_bundle_id
  existing_state_id
  execution_mode { fixture_first, normal }
  ui_constraints { max_next_actions=3, include_evidence_metadata=true }

PreparedSourceBundle
  bundle_id
  root_path
  manifest_path
  files[]
  evidence_inventory[]
  unknown_zones[]
  boundary_guard
  bundle_fingerprint

ExecutionDecision
  status: need_context | plan_ready | blocked
  reason_code
  plan_snapshot? : WorkspacePlan
  workspace_snapshot? : WorkspaceSnapshot
  question_prompt? : { id, message, asked_fields[] }
  next_actions? : WorkspaceAction[]

WorkspaceSnapshot
  snapshot_id
  plan_id
  loop_state { goal, boundary, concept_slice_id, current_step_id }
  artifacts[] { id, kind, label, renderer, evidence_refs[], render_status }
  evidence_inventory_summary { total, covered_by_artifacts, missing_required }
  next_actions[2..3]
  blocked_actions[]
  readiness_scope
  locked_advanced_nodes[]
  evidence_artifact_requirements[]
  reproducibility_meta { ui_schema_version, snapshot_version, generated_at, plan_fingerprint }
```

## Flow

1. **Prepare bundle**
   - validate repo/source path and boundary from request,
   - run deterministic file discovery and metadata indexing,
   - build manifest + evidence inventory + `bundle_fingerprint`.
2. **Compile plan intent**
   - pass intent/bundle/state to `WorkspaceIntentCompiler`.
3. **Call adapter**
   - if plan compiles without model step and confidence is high, skip call,
   - otherwise invoke `LLM Adapter` with `WorkspacePlan` context.
4. **Validate and classify**
   - parse + schema + invariants.
   - `accept`: merge candidate and continue.
   - `repair`: emit `ExecutionDecision.need_context` and stop.
   - `reject`: emit `ExecutionDecision.blocked`.
5. **Emit UI objects**
   - generate `WorkspaceSnapshot` from merged plan + evidence,
   - emit `WorkspacePlan` for execution runtime and UI.
6. **Persist minimal trace**
   - store decision, fingerprints, diagnostics, and repair history.

## Invariants

- `prepare` never dereferences files outside declared boundary.
- Every execution produces either `need_context` or `plan_ready` or `blocked`.
- `workspace_snapshot` is never emitted if invariant checks are incomplete.
- Evidence used by artifacts must be stable and point to paths in `manifest_path`.
- No hidden mutation of product source from execution pipeline.

## Verification

- `bundle` verification:
  - deterministic manifest fingerprint for same bundle,
  - unsupported paths rejected.
- `pipeline` verification:
  - fixture mode -> deterministic snapshot hash,
  - `accept` path produces both `WorkspacePlan` and `WorkspaceSnapshot`,
  - `repair` path emits user question before any mutation attempt,
  - `reject` path contains reason code and diagnostics.
- `UX` verification:
  - no mega-workspace from large boundary (visible cap respected),
  - no direct answer leakage in `workspace_snapshot`.

## Feature Slices

1. `execution/prepare`: source bundle assembler + manifest fingerprint.
2. `execution/compile`: compiler + adapter bridge.
3. `execution/snapshot`: deterministic UI projection mapping.
4. `execution/repair`: context-question UX and audit persistence.
