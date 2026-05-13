# Verifier Brief Template

Use this template after a worker completes an implementation slice.

The verifier reviews the worker output. The verifier does not implement fixes
unless explicitly assigned a separate worker slice later.

## Model And Role

```text
model: gpt-5.2
reasoning_effort: high
role: verifier
```

## Verification Objective

```text
[Verify whether the worker output satisfies the slice contract and self-hosted
MVP gate.]
```

## Inputs To Review

Review:

```text
[Worker final report]
[Changed files or directories]
[Relevant self-hosted specs]
[Relevant goal artifacts]
[Test or command output]
```

## Source Of Truth

The verifier must check against:

1. `AGENTS.md`
2. `docs/specs/README.md`
3. `docs/specs/selfhost/00_spec_audit_matrix.md`
4. `docs/specs/selfhost/01_selfhost_boundary.md`
5. `docs/specs/selfhost/02_evaluation_contract.md`
6. `docs/specs/selfhost/03_product_improvement_loop.md`
7. `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md`
8. `.goals/selfhost-mvp-execution-layer/README.md`
9. `[Any slice-specific goal artifact]`

## Verification Checklist

The verifier must answer:

1. Does the output produce one required MVP artifact?
2. Is the artifact inside the assigned scope?
3. Does it preserve the declared artifact boundary?
4. Does it require user evidence plus repo evidence for gap/readiness claims?
5. Does it avoid model-only mastery, truth, gap, or readiness decisions?
6. Does it include repair and re-evaluation when a gap is created?
7. Does it avoid generic feedback not grounded in repo evidence?
8. Are tests/checks sufficient for the slice?
9. Are there false confidence risks?
10. Are there incongruences that need user discussion before acceptance?

## Recommendation Format

The verifier must end with exactly one recommendation:

```text
ACCEPT
```

or:

```text
REVISE
```

or:

```text
DISCUSS
```

Use `DISCUSS` when the issue is a product decision, scope conflict, or spec
incongruence rather than a straightforward implementation defect.

## Final Report Required From Verifier

The verifier final response must include:

1. recommendation
2. blocking findings
3. non-blocking findings
4. evidence references
5. missing or weak verification
6. suggested next orchestration step
