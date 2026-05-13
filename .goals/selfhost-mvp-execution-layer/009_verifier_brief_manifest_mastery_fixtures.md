# 009 - Verifier Brief: Manifest And Mastery-Check Fixtures

## Model And Role

```text
model: gpt-5.2
reasoning_effort: high
role: verifier
```

## Verification Objective

Verify whether Worker 1 produced a valid self-hosted root manifest and five
mastery-check fixtures without expanding scope or creating product code.

## Inputs To Review

Review:

1. Worker 1 final report
2. `sibar.selfhost.manifest.json`
3. `docs/specs/selfhost/pilot/`
4. `docs/specs/selfhost/01_selfhost_boundary.md`
5. `docs/specs/selfhost/02_evaluation_contract.md`
6. `docs/specs/selfhost/03_product_improvement_loop.md`
7. `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md`
8. `.goals/selfhost-mvp-execution-layer/008_worker_brief_manifest_mastery_fixtures.md`

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
9. `.goals/selfhost-mvp-execution-layer/008_worker_brief_manifest_mastery_fixtures.md`

## Verification Checklist

The verifier must answer:

1. Does `sibar.selfhost.manifest.json` exist at repo root?
2. Does the manifest include `artifact_id`, `label`, `owner_intent`,
   `included_paths`, `excluded_paths`, `entrypoints`, `concepts`,
   `test_commands`, `out_of_scope`, and `mastery_check_index`?
3. Do all manifest `included_paths` exist?
4. Does the manifest avoid model signal validation in the first slice?
5. Does the selfhost pilot directory exist?
6. Are there exactly five mastery-check fixture files?
7. Does each first-slice concept have exactly one mastery check?
8. Does every check include the required fields from the worker brief?
9. Does every check require repo evidence inside the manifest boundary?
10. Are prompts specific enough to distinguish grounded answers from generic
    answers?
11. Does each check include repair and re-evaluation fields?
12. Are issue candidate types compatible with
    `03_product_improvement_loop.md`?
13. Did Worker 1 avoid all out-of-scope files?
14. Did Worker 1 avoid product code, loaders, evaluators, tests, or new eval
    framework?
15. Are there false confidence or readiness-overclaim risks?

## Recommendation Format

End with exactly one recommendation:

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

Use `DISCUSS` only for product decisions or spec conflicts. Use `REVISE` for
fixable artifact quality or scope issues.

## Final Report Required From Verifier

The verifier final response must include:

1. recommendation
2. blocking findings
3. non-blocking findings
4. evidence references
5. missing or weak verification
6. suggested next orchestration step
