# 15: WorkspaceIntentCompiler Contract

## Intent

Define a deterministic compiler that turns:

1. `user_intent`
2. `source_bundle`
3. `existing_state`

into one `WorkspacePlan` JSON object consumed by Rust services and rendered by UI.

This contract follows `14_workspace_intent_flow.md`: the user-facing
`WorkspaceIntent` remains the source of intent, and this compiler is the
Rust-native boundary that turns that intent plus source evidence into a bounded
plan.

The compiler must be usable without LLM execution in first slice (heuristic fallback),
but must emit a model-ready plan request envelope when needed.

## Data Contract

### Input

```text
WorkspaceIntentInput
  user_intent { id, raw_text, learning_goal, preferred_mode?, requested_artifact_kind? }
  source_bundle { id, root_path, included_paths[], excluded_paths[], evidence_inventory[], skip_zones[] }
  existing_state { loop_id?, user_prefs?, prior_readiness[], prior_gaps[], preferred_artifact_count?, locked_nodes[] }
  context_budget { max_nodes, max_evidence_refs, max_plan_steps, max_next_actions=3 }
```

### Output

```text
WorkspacePlan
  plan_id
  version (semver-like)
  generated_by ("workspace-intent-compiler-rs")
  source_bundle_fingerprint
  boundary { root_path, included_paths, excluded_paths, unknown_zones[] }
  concept_slice { id, title, scope, rationale, evidence_refs[] }
  operation { kind, user_prompt, success_criteria[], grader_scope }
  workspace_plan_steps[] { id, title, depends_on[], requires_readiness_gate, expected_artifact_kind }
  evidence_requirements[] {
    id, required_for, min_count, at_least_one_of[], evidence_roles[], urgency
  }
  artifact_requirements[] {
    id, kind, renderer, source_scope, evidence_refs[], locked_advanced_node?
  }
  next_actions[2..3] {
    id, label, action_type, target_node_id, required_evidence_refs[], fallback_if_missing
  }
  ui_contract { snapshot_schema_version, stable_fields[], no_mega_workspace=true }
  diagnostics[] { level, code, message, source }
  repair_candidates[] { question_id, prompt, missing_inputs[], missing_refs[] }
  generated_at
```

### Determinism Rules

- Canonicalize arrays with deterministic sort by `id`.
- Use stable stringification for fingerprints.
- Omit optional arrays when empty; never inject null objects.

## Flow

1. Validate schema requirements for all three inputs.
2. Resolve boundary using `source_bundle` plus `existing_state` to avoid duplicate or invalid paths.
3. Derive up to 3 candidate slices from evidence roles and prior gaps.
4. Pick the highest-priority candidate (bounded by `context_budget`).
5. Generate `WorkspacePlan` fields from deterministic templates.
6. Attach `diagnostics` for every non-empty warning.
7. Return `WorkspacePlan` only if:
   - evidence inventory exists for selected slice,
   - next actions are between 2 and 3,
   - `ui_contract.no_mega_workspace` is true.

Fallback:

If constraints cannot be satisfied deterministically, return a `repair_candidates`
object asking the user for missing boundary, preferred depth, or evidence.

## Invariants

- The compiler never touches user attempt evaluation or readiness scoring.
- `source_bundle_fingerprint` must match a normalized hash of input paths + file metadata.
- Every `concept_slice` references at least one valid evidence ref.
- `next_actions` must be renderable and non-empty at UI time.
- Never emit a plan with artifact count above `context_budget.max_artifact_count`.

## Verification

- Unit tests for:
  - deterministic plan output with identical input,
  - no output mutation when same paths reorder,
  - rejection on missing required fields,
  - `next_actions` cardinality.
- Fixture tests for:
  - low-evidence boundary produces repair candidates,
  - repo-boundary mismatch produces hard diagnostics.
- Manual check:
  - one user intent + same source bundle + same existing state always yields same `WorkspacePlan` `plan_id`.

## Feature Slices

1. Add Rust type + parser for `WorkspaceIntentInput` and `WorkspacePlan`.
2. Add deterministic compiler with budget enforcement and diagnostics.
3. Add repair prompt emission when evidence is insufficient.
4. Add optional model-ready envelope export for adapter handoff.
