# Worker Brief Template

Use this template when delegating an implementation slice.

The orchestrator must fill every bracketed field before spawning a worker. The
worker must not make product decisions that are still marked pending in the goal
log.

## Model And Role

```text
model: gpt-5.3-codex-spark
role: worker
```

## Slice Objective

```text
[One concrete outcome the worker must produce.]
```

## Owned Scope

The worker owns only:

```text
[Exact files or directories the worker may create or edit.]
```

The worker must not touch:

```text
[Exact files or directories that are out of scope.]
```

## Source Of Truth

The worker must follow:

1. `AGENTS.md`
2. `docs/specs/README.md`
3. `docs/specs/selfhost/00_spec_audit_matrix.md`
4. `docs/specs/selfhost/01_selfhost_boundary.md`
5. `docs/specs/selfhost/02_evaluation_contract.md`
6. `docs/specs/selfhost/03_product_improvement_loop.md`
7. `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md`
8. `.goals/selfhost-mvp-execution-layer/README.md`
9. `[Any slice-specific goal artifact]`

## Required Output Artifact

The worker must produce:

```text
[manifest | mastery check | dataset | evaluator | benchmark report | readiness evidence]
```

The output must map directly to the MVP loop:

```text
manifest
  -> mastery check
  -> user answer
  -> evidence-backed gap
  -> repair
  -> issue candidate
  -> re-evaluation
  -> readiness report
```

## Constraints

1. Do not revert, delete, reorder, or reformat unrelated work.
2. Do not use `git add .`.
3. Do not change files outside the owned scope.
4. Do not expand the artifact boundary unless the brief explicitly says to.
5. Do not introduce a new eval framework unless the brief explicitly says to.
6. Do not let the model decide mastery, truth, gaps, or readiness.
7. Do not create readiness claims without repo evidence and user evidence.

## Checks To Run

Run only the checks relevant to the slice:

```text
[Exact commands, or "docs-only: no tests required"]
```

If a check cannot be run, report why.

## Final Report Required From Worker

The worker final response must include:

1. files changed
2. artifact produced
3. how the output satisfies the self-hosted MVP gate
4. checks run and result
5. any unresolved assumptions or risks
6. confirmation that no out-of-scope files were changed
