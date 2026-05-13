# 002 - Decision Brief: Fifth First-Slice Concept

## Decision Needed

Choose the fifth concept for the first self-hosted MVP slice.

This decision must be resolved before creating the concrete manifest, mastery
checks, dataset plan, or worker brief.

## Current Incongruence

`docs/specs/selfhost/01_selfhost_boundary.md` names:

```text
Repair practice generation
```

`docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md` names:

```text
Model signal validation
```

These cannot both be the fifth first-slice concept unless the boundary expands.

## Option A - Deterministic Learning Loop

Use these five first-slice concepts:

1. Artifact boundary
2. Concept graph generation
3. Gap detection
4. Repair practice generation
5. Readiness report generation

### Boundary Impact

Keep the current boundary focused on:

1. runtime concept graph
2. runtime gap detection
3. runtime practice repair
4. runtime memory/readiness
5. associated deterministic tests

### Benefits

1. Proves the hard contract before model behavior enters the benchmark.
2. Keeps the first manifest small and inspectable.
3. Directly matches the README execution loop.
4. Avoids allowing model candidate traces to obscure weak user-evidence logic.

### Cost

Model signal validation moves to a second wave.

### Required Follow-Up If Chosen

1. Update `04_selfhost_gap_detection_benchmark.md` to replace `Model signal
   validation` with `Repair practice generation`.
2. Keep model signal validation documented as later scope.
3. Create the first worker brief for manifest and mastery-check fixtures only.

## Option B - Include Model Signal Validation

Use these five first-slice concepts:

1. Artifact boundary
2. Concept graph generation
3. Gap detection
4. Readiness report generation
5. Model signal validation

### Boundary Impact

Expand the manifest boundary to include at least:

1. `src/runtime-agent-validation.ts`
2. `src/runtime-agent.ts`
3. `src/runtime-agent-runner.ts`
4. `src/evals/llm-runtime-trace.ts`
5. `Tests/llm-runtime-trace-evals.test.ts`
6. `docs/specs/09_project_learning_agent.md`

### Benefits

1. Tests the self-hosted claim against the model-assisted part of SIBI.
2. Exercises the "LLM cannot decide truth/readiness" moat early.
3. Uses existing trace/eval work instead of postponing it.

### Cost

The first slice becomes broader and less deterministic. It risks proving model
trace validation before proving user-evidence gap detection.

### Required Follow-Up If Chosen

1. Update `01_selfhost_boundary.md` to include model validation files.
2. Update the first manifest and mastery checks to include model signal
   validation.
3. Require verifier focus on boundary leakage and model-only readiness claims.

## Recommendation

Choose Option A.

Reason: the active MVP gate is about verifying ownership through user evidence,
repo evidence, repair, issue candidate, re-evaluation, and readiness. Model
signal validation is important, but it is a support layer. It should not be part
of the first slice until the deterministic evaluation loop is proven.

## Decision Status

Accepted: Option A.

The first slice uses `Repair practice generation` and moves `Model signal
validation` to a second benchmark wave.
