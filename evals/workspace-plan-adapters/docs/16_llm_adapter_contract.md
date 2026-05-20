# 16: LLM Adapter Contract

## Intent

Define an external LLM adapter layer used by Rust runtime inside Tauri to evolve a
`WorkspacePlan` without allowing direct model output to reach runtime state.

The UI must not know about adapter internals. It only sees execution outcomes
from Rust.

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

### Adapter Job Status

`LLMRunJob` tracks the async execution lifecycle used by the host:

```text
LLMRunJob
  job_id
  request_id
  runner
  status: queued | running | validating | completed | blocked | failed | cancelled
  started_at
  updated_at
  cancel_requested_at?
  reason_code?
```

### Runner Matrix

- `fixture`: deterministic JSON fixture path for offline/dev checks.
- `codex-exec`: default first production runner.
- `openai-api`: optional next step when credentials and policy allow.
- `opencode`: optional alt runner for local-first paths.
- `local`: optional offline runner for air-gapped or on-device tests.

### `codex-exec` Process Contract

Rust/Tauri owns the local process lifecycle. The web UI never spawns this runner.

```text
codex exec
  stdin: serialized LLMPlanRequest JSON
  output_schema: WorkspacePlanCandidate JSON Schema path
  output_file: temp file owned by the job
  cwd: declared workspace root or explicit safe runner cwd
  sandbox: read-only unless a later feature explicitly requires writes
  approval: never for onboarding compilation
```

The adapter records command metadata and summaries, but raw prompt text,
stderr, and model output are not rendered directly in UI. Stdin is the stable
configuration surface; flags select runner behavior, schema, sandbox, cwd, and
output path.

## Flow

1. Create `LLMPlanRequest` from `WorkspacePlan` context.
2. The host creates a `LLMRunJob` with status `queued`.
3. Prefer runner:
   - `fixture` when `SIBI_WORKSPACE_FIXTURE_MODEL_RESPONSE_PATH` or config path exists;
   - otherwise `codex-exec`;
   - then fallback to `openai-api`/`opencode`/`local` by config order.
4. Rust/Tauri sets `LLMRunJob.status=running` and starts the selected runner as a
   child process:
   - fixture path loaded from configured file path or env var,
   - LLM adapter request serialized deterministically as JSON and sent over
     subprocess `stdin`.
5. Receive `LLMOutputRaw` from runner `stdout` and `stderr`.
6. Set job status to `validating` and parse JSON from raw text
   (`strict` mode first, then recoverable fence extraction).
7. Validate against `WorkspacePlanCandidate` schema.
8. Apply pedagogical invariants:
   - artifact has evidence refs,
   - operation exists and maps to `attempt-first` type,
   - next actions are 2–3 and renderable,
   - no model-only claims about whole-repo ownership.
9. Set final `LLMRunJob` status:
   - `completed` on schema+pedagogy accept,
   - `blocked` on repair,
   - `failed` on schema/parse/transport errors.
10. Return:
   - `accept` with plan candidate merged into workspace plan,
   - `repair` with targeted question payload,
   - `reject` with diagnostics and hard stop.
11. Persist only `LLMRunResult`, not raw output.
12. Cancel behavior:
   - Host sets `cancelled` only on explicit user/requested interruption.
   - No timeout-based runner abort is used as a normal strategy.

## Invariants

- Raw LLM text must never directly populate runtime state or UI payload.
- Parsing is JSON-first and deterministic; unknown keys are ignored only if whitelisted.
- Any schema violation is failure (`reject`), never silent fallback.
- `repair` cannot require unbounded questions; it must ask at most 3 concrete inputs.
- Adapter response must carry a stable audit record for every run.
- Parse and schema invariants are strictly enforced:
  - strict JSON parse first, fence extraction only after strict parse fails,
  - schema mismatch is `failed`, not repair unless missing-context shape is clear.
- Pedagogy invariants are enforced alongside schema checks before merge.

## Verification

- Contract tests for:
  - plain text output rejection,
  - valid JSON candidate accept,
  - invalid schema rejection,
  - repair payload shape on missing context.
- Runner tests for:
  - fixture mode is deterministic,
  - `codex-exec` runner status transitions include queued/running/validating/completed,
  - unknown runner type rejection.
- Validation tests for pedagogy invariants (especially attempt-first and evidence grounding).

## Feature Slices

1. Add trait-style adapter interface and runner selection order.
2. Implement fixture runner + parser + schema validator.
3. Add `codex-exec` command path and run context capture.
4. Add OpenAI/OpenCode/local adapters behind feature flags.
