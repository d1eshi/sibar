# 008 - Worker Brief: Manifest And Mastery-Check Fixtures

## Model And Role

```text
model: gpt-5.3-codex-spark
role: worker
```

## Slice Objective

Create the first self-hosted MVP artifacts:

1. a concrete root manifest
2. five mastery-check fixtures for the deterministic first slice

Do not create runtime code, evaluator code, loaders, tests, or a new eval
framework.

## Owned Scope

The worker owns only:

```text
sibar.selfhost.manifest.json
docs/specs/selfhost/pilot/
```

The worker must not touch:

```text
src/
Tests/
Sources/
Package.swift
package.json
package-lock.json
docs/specs/README.md
docs/specs/01_artifact_intake.md
docs/specs/02_concept_graph.md
docs/specs/03_learning_autopsy.md
docs/specs/04_ownership_question_policy.md
docs/specs/05_gap_and_misconception_detection.md
docs/specs/06_practice_challenges.md
docs/specs/07_understanding_memory.md
docs/specs/08_readiness_export.md
docs/specs/09_project_learning_agent.md
docs/specs/10_study_panel_ui.md
docs/product/
.goals/
docs/missions/
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
9. `.goals/selfhost-mvp-execution-layer/008_worker_brief_manifest_mastery_fixtures.md`

## Required Output Artifacts

Create:

```text
sibar.selfhost.manifest.json
docs/specs/selfhost/pilot/README.md
docs/specs/selfhost/pilot/mastery-checks/index.json
docs/specs/selfhost/pilot/mastery-checks/*.json
```

The exact mastery-check filenames are worker-chosen, but there must be exactly
five check files, one per first-slice concept.

## First-Slice Concepts

The worker must create one mastery check for each concept:

1. `artifact_boundary`
2. `concept_graph_generation`
3. `gap_detection`
4. `repair_practice_generation`
5. `readiness_report_generation`

Do not include `model_signal_validation` in this slice.

## Manifest Requirements

The manifest must include at least:

```text
artifact_id
label
owner_intent
included_paths
excluded_paths
entrypoints
concepts
test_commands
out_of_scope
mastery_check_index
```

Use the deterministic boundary from `01_selfhost_boundary.md`.

All included paths must currently exist.

## Mastery Check Requirements

Each mastery check must include:

```text
id
concept_id
concept_label
operation
prompt
expected_answer_shape
required_repo_evidence
forbidden_claims
minimum_readiness
repair_when_failed
reevaluation_prompt
acceptable_issue_candidate_types
```

Allowed operations:

```text
explain
trace
predict
modify
debug
transfer
```

Each check must require repo evidence from inside the manifest boundary.

Each check must be specific enough that a verifier can determine whether a
future user answer is grounded or generic.

## Constraints

1. Do not revert, delete, reorder, or reformat unrelated work.
2. Do not use `git add .`.
3. Do not change files outside the owned scope.
4. Do not expand the artifact boundary.
5. Do not introduce a new eval framework.
6. Do not create product code.
7. Do not include model signal validation in the first slice.
8. Do not create readiness claims without both repo evidence and user evidence.

## Checks To Run

Run:

```text
git status --short
```

No test suite is required because this is an artifact/fixture-only slice.

If possible, also manually verify that every `included_paths` and every
`required_repo_evidence[].path` exists.

## Final Report Required From Worker

The worker final response must include:

1. files changed
2. artifact produced
3. how the output satisfies the self-hosted MVP gate
4. checks run and result
5. any unresolved assumptions or risks
6. confirmation that no out-of-scope files were changed
