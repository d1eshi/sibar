# 18: Workspace UI Reproducibility Contract

## Intent

Make every `Workspace` render deterministic and testable for Rust-native runtime,
with constrained visibility and explicit pedagogy-safe actions.

The UI must avoid mega-workspace behavior and expose a repeatable contract for
next actions, evidence/artifact requirements, and locked advanced nodes.

## Data Contract

```text
WorkspaceUiProjection
  ui_schema_version
  generated_at
  snapshot_id
  plan_id
  source_bundle_id
  execution_job { id, status, reason_code? }
  reproducibility_hash
  loop_summary { goal, boundary_label, scope, readiness_scope }
  active_slice { id, path, slice_title, confidence_band }
  artifact_slots {
    primary_artifact { id, kind, renderer_payload_ref, evidence_refs[] }
    secondary_artifacts[0..2] { id, kind, renderer_payload_ref, evidence_refs[] }
  }
  evidence_artifacts [] {
    id, evidence_kind, path, line_start, line_end, excerpt, evidence_role, support_state
  }
  next_actions[2..3] {
    id, label, action_type, target_node_id, required_evidence_count, required_artifacts_count
  }
  requirements {
    global_minimum_evidence_per_artifact
    required_artifact_kinds[]
    readiness_gate
    locked_advanced_nodes[]
  }
  blocked_state [] { id, reason, unlock_conditions }
  next_attempt_hint {
    prompt_id
    operation_kind
    required_inputs[]
  }
  command_state? { safe_commands[], last_command?, command_output_ref? }
```

## Flow

1. Build projection only from `WorkspaceSnapshot` + `WorkspacePlan`.
2. Resolve all references through stable IDs and canonical sort.
3. Compute `reproducibility_hash` from `plan_id`, `snapshot_id`, evidence IDs,
   and sorted actions.
4. Render constraints:
   - if no lock conditions are met, keep nodes in `blocked_state`,
   - if required evidence is missing, keep action disabled with hint.
5. Include execution state:
   - pass `execution_job.status` in projection order-independent.
   - keep adapter runner internals out of the payload.
   - do not render a `Run Codex runner` or provider-specific action.
   - show clear blocked/failed/cancelled messaging through `blocked_state`.
6. Return projection with explicit failure state instead of silent omission.

## Invariants

- `next_actions` is always present and 2–3 items in stable order.
- Every rendered artifact references at least one evidence item.
- Advanced nodes marked `locked` must include explicit unlock criteria.
- No mega-workspace:
  - one primary artifact,
  - max 2 secondary artifacts,
  - max 80 evidence rows visible by default.
- Snapshot is stable across rerenders with same plan/evidence IDs.
- UI must not render unsafely inferred claims without support markers.
- UI render contract never includes raw adapter output or command stderr content.
- Execution status in projection is constrained to:
  queued, running, validating, completed, blocked, failed, cancelled.

## Verification

- Snapshot tests for:
  - stable field ordering,
  - identical `reproducibility_hash` across reruns.
- Rendering checks for:
  - visible next actions count (2–3),
  - disabled locked nodes with reasons,
  - evidence/artifact requirements list shown before action submission.
- Contract checks for:
  - no whole-repo ownership statement in boundary summaries,
  - no overflow: unknown zones are visible when boundary is partial.

## Feature Slices

1. Implement minimal projection adapter for current prototype/state shape.
2. Add explicit `next_actions` and `locked_advanced_nodes`.
3. Add visible artifact/evidence requirements panel and reproducibility metadata.
4. Add regression fixtures for stable rendering across runs.
