# Sibi Eval Dataset Schema

This directory contains the canonical E01 eval dataset contract. The JSON files
are intentionally small and manually inspectable. E02 and later eval runners can
load `index.json`, then load each case listed in `cases`.

Paths declared inside `index.json`, including `schema` and each case `file`,
are resolved relative to the directory containing `index.json`.

## Index Contract

```text
EvalDatasetIndex
  dataset_id
  version
  mission
  feature
  validation
  schema
  required_case_classes
  cases[]
    id
    case_class
    layer
    file
    validations
```

## Case Contract

```text
EvalCase
  id
  title
  case_class
  artifact_fixture
  artifact_boundary
    root
    included_paths
    excluded_paths
  learning_goal
  concept_under_test
    id
    label
    layer_target
  user_answer
    kind
    text
    declared_confidence
  llm_fixture_response
  expected_layer
    level
    label
    rationale
  expected_gap
  expected_misconception
  expected_challenge
  expected_readiness
  required_evidence[]
  forbidden_evidence[]
  boundary_expectations
  gap_readiness_expectations
  validation_notes
```

## Field Rules

- `case_class` must be one of the E01 required classes.
- `schema` and each case `file` in `index.json` must be a path relative to the
  directory that contains `index.json`.
- `expected_layer.level` must be an integer from 1 to 5.
- `required_evidence` must explain which allowed citations must be accepted or
  present in the deterministic outcome.
- `forbidden_evidence` must exist for every case. It may be empty only when the
  case is not testing rejection of evidence.
- `boundary_expectations` must state whether all accepted evidence must remain
  inside the artifact boundary and whether any fixture evidence must be rejected.
- `gap_readiness_expectations` must say whether to create a gap, create a
  challenge, persist uncertainty or misconception, and what readiness language is
  allowed.
- LLM cases must be offline-replayable through `llm_fixture_response`.

## Required Case Classes

- `correct_answer`
- `partial_answer`
- `declared_uncertainty`
- `wrong_misconception`
- `missing_evidence`
- `boundary_violation`
- `overconfident_llm_output`
