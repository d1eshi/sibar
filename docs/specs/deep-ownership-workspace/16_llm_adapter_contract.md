# 16: LLM Adapter Contract

## Intent

Define an external LLM adapter layer used by Rust to evolve a `WorkspacePlan`
without allowing direct model output to reach runtime state.

The first supported runner is fixture + `codex-exec`. Later runners are additive:
`openai-api`, `opencode`, and local runners.

## Data Contract

### Adapter Input

```text
LLMPlanRequest
  request_id
  model
  schema_version
  system_prompt
  workspace_intent
  source_bundle_fingerprint
  previous_plan? (for diff and continuity)
  ui_constraints { stable_schema=true, max_plan_steps, max_next_actions=3 }
```

### Raw Adapter Output

`LLMOutputRaw` is always treated as untrusted text first.

```text
LLMOutputRaw
  raw_text
  request_id
  run_context { runner, provider, invoked_at, elapsed_ms, warnings[] }
  exit_code
  stderr_summary?
```

### Parsed Output Envelope

`WorkspacePlanCandidate` is the only parsed type accepted after schema validation.

```text
WorkspacePlanCandidate
  schema_version
  plan_delta
  claimed_capabilities
  invariants_checklist[]
  next_actions[2..3]
  evidence_requirements[]
  artifact_requirements[]
  diagnostics_hint[]
  uncertainty_flags[]
```

### Pipeline Result

```text
LLMRunResult
  status: accept | reject | repair
  accepted_plan? : WorkspacePlan
  repair_request? : { missing_inputs[], missing_refs[], user_question, priority }
  rejection? : { reason_code, reason_text, diagnostics[] }
  audit { adapter, request_id, schema_errors[], parse_errors[], run_context }
```

### Runner Matrix

- `fixture`: deterministic JSON fixture path for offline/dev checks.
- `codex-exec`: default first production runner.
- `openai-api`: optional next step when credentials and policy allow.
- `opencode`: optional alt runner for local-first paths.
- `local`: optional offline runner for air-gapped or on-device tests.

## Flow

1. Create `LLMPlanRequest` from `WorkspacePlan` context.
2. Prefer runner:
   - `fixture` when `SIBI_WORKSPACE_FIXTURE_MODEL_RESPONSE_PATH` or config path exists;
   - otherwise `codex-exec`;
   - then fallback to `openai-api`/`opencode`/`local` by config order.
3. Receive `LLMOutputRaw`.
4. Parse JSON from raw text (`strict` mode first, then recoverable fence extraction).
5. Validate against `WorkspacePlanCandidate` schema.
6. Apply pedagogical invariants:
   - artifact has evidence refs,
   - operation exists and maps to `attempt-first` type,
   - next actions are 2–3 and renderable,
   - no model-only claims about whole-repo ownership.
7. Return:
   - `accept` with plan candidate merged into workspace plan,
   - `repair` with targeted question payload,
   - `reject` with diagnostics and hard stop.
8. Persist only `LLMRunResult`, not raw output.

## Invariants

- Raw LLM text must never directly populate runtime state or UI payload.
- Parsing is JSON-first and deterministic; unknown keys are ignored only if whitelisted.
- Any schema violation is failure (`reject`), never silent fallback.
- `repair` cannot require unbounded questions; it must ask at most 3 concrete inputs.
- Adapter response must carry a stable audit record for every run.

## Verification

- Contract tests for:
  - plain text output rejection,
  - valid JSON candidate accept,
  - invalid schema rejection,
  - repair payload shape on missing context.
- Runner tests for:
  - fixture mode is deterministic,
  - `codex-exec` command timeout/retry, and
  - unknown runner type rejection.
- Validation tests for pedagogy invariants (especially attempt-first and evidence grounding).

## Feature Slices

1. Add trait-style adapter interface and runner selection order.
2. Implement fixture runner + parser + schema validator.
3. Add `codex-exec` command path and run context capture.
4. Add OpenAI/OpenCode/local adapters behind feature flags.
