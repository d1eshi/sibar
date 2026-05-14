# Self-Hosted Gap Detection Benchmark

## Goal

Measure whether SIBI detects real gaps in understanding SIBAR better than a
generic chat using the same codebase evidence.

This document defines the benchmark. It does not implement the benchmark.

## Benchmark Question

```text
Can SIBI identify evidence-backed user gaps, false confidence, and product-side
issues over a bounded SIBAR slice better than a generic chat baseline?
```

## Concepts

The first benchmark uses five real SIBAR concepts:

1. Artifact boundary
2. Concept graph generation
3. Gap detection
4. Repair practice generation
5. Readiness report generation

Each concept must map to at least one included source path and one test or eval
artifact when available.

Model signal validation is intentionally deferred to a second benchmark wave.
The first pilot must prove the deterministic user-evidence loop before adding
model candidate signal behavior.

## Answer Classes

For each concept, create eight simulated answers:

1. `correct_grounded`
2. `correct_uncited`
3. `partial`
4. `wrong_responsibility`
5. `wrong_flow`
6. `overconfident_wrong`
7. `declared_uncertainty`
8. `design_induced_confusion`

The pilot dataset therefore has 40 cases.

## Gold Labels

Each case must define:

```text
concept_id
operation
answer_class
expected_gap_present
expected_gap_type
expected_layer
expected_severity
expected_confidence
required_repo_evidence
forbidden_claims
acceptable_repair_task
acceptable_issue_candidate_type
expected_readiness
```

Use `expected_gap_present: false` with `expected_gap_type: null` for no-gap
`correct_grounded` cases. All gap-bearing cases use
`expected_gap_present: true` and one of the contract gap labels.

## Baselines

Run the same cases through:

1. SIBI with deterministic evaluator and no live model
2. SIBI with bounded model candidate signals plus deterministic validation
3. generic chat with the same files and no evaluation contract
4. generic chat with the same prompt but no enforced evidence schema

The generic chat baseline is allowed to be fluent. SIBI wins only when it is
more grounded, more precise, and better at repair.

## Metrics

Primary metrics:

1. gap precision
2. gap recall
3. gap type accuracy
4. evidence quality
5. false confidence detection recall
6. repair usefulness

Secondary metrics:

1. time-to-clarity
2. design issue detection accuracy
3. unsupported claim rate
4. boundary violation rejection rate
5. readiness calibration

## Evidence Quality Score

Use a 0 to 3 score:

```text
0 = no evidence
1 = evidence exists but is irrelevant or out of boundary
2 = evidence is relevant but incomplete
3 = evidence is exact and connects user answer to artifact behavior
```

## Pass Criteria

The pilot benchmark passes when:

1. SIBI produces zero readiness claims without evidence
2. SIBI rejects all out-of-bound evidence
3. SIBI beats generic chat on evidence quality
4. SIBI beats generic chat on false confidence detection
5. SIBI produces acceptable repair tasks for at least 80 percent of real gaps
6. SIBI does not classify every design-induced confusion as only user failure

## Failure Criteria

The benchmark fails when:

1. SIBI produces generic feedback without cited repo evidence
2. SIBI overclaims whole-repo readiness
3. SIBI cannot explain why a gap was detected
4. SIBI cannot produce a re-evaluation prompt
5. SIBI is not meaningfully better than generic chat on grounding

## Future Implementation

The benchmark should later become executable through the existing eval tooling
under `src/evals` after a worker-owned integration slice, while active pilot
artifacts remain in `docs/specs/selfhost/pilot/`.

Do not add a new eval framework until the pilot dataset proves that the
self-hosted contract needs behavior not supported by the current eval runner.

## Feature Outcome

The team receives a repeatable benchmark that proves whether SIBI is more
grounded, more precise, and more useful than generic chat for the bounded
self-hosted MVP slice.

This spec owns three feature outcomes:

1. executable eval harness
2. benchmark reports
3. generic chat baseline comparison

## Manual Harness

Use the current report at
`docs/specs/selfhost/pilot/reports/VAL-EVAL-006-selfhost-benchmark.json` and
confirm:

1. all 40 cases load
2. every answer class appears exactly five times
3. every gap-bearing case has repair and re-evaluation presence
4. false-confidence cases are detected
5. design-induced cases produce design issues
6. evidence quality is visible in the aggregate

For the future generic chat baseline, run the same mastery check and answer
against:

1. SIBI with the evaluation contract
2. a generic chat prompt with the same files
3. a generic chat prompt without enforced evidence schema

Record unsupported claims, evidence quality, false-confidence handling, and
repair usefulness.

## Eval Coverage

Current coverage:

1. `pnpm run eval:selfhost-benchmark`
2. `Tests/selfhost-benchmark.test.ts`
3. generated benchmark report with 40/40 passing cases
4. aggregate metrics for precision, recall, type accuracy, evidence quality,
   false-confidence recall, and design-issue recall

Missing coverage:

1. generic chat baseline execution
2. freeform answer evaluation from answer text
3. repair usefulness scoring
4. unsupported claim rate
5. readiness calibration after re-evaluation

## Iteration Log

### 2026-05-14: Living benchmark spec

Input used:

- current deterministic benchmark implementation
- generated self-hosted benchmark report
- pilot gold case dataset

Expected outcome:

- Make the benchmark spec explicit about what is already executable and what is
  still only specified.

Actual outcome:

- The spec now separates current deterministic harness coverage from missing
  freeform and generic-chat baseline coverage.

What worked:

- The benchmark is executable and returns stable aggregate metrics.
- It catches malformed labels, invalid gap types, and load mismatches.

What failed or remains weak:

- Observed behavior is still tied to expected labels.
- The benchmark cannot yet prove superiority over generic chat.

Coverage added or missing:

- Added documentation coverage for benchmark manual review and baseline intent.
- Missing generic chat and freeform evaluator execution.

Decision:

- Extend the current harness before introducing a new eval framework.

## Acceptance Gate

This feature is MVP-ready when:

1. benchmark cases can run through freeform answer evaluation
2. SIBI reports evidence quality from actual attached evidence
3. the generic chat baseline runs over the same cases
4. SIBI beats generic chat on evidence quality and false-confidence detection
5. repair usefulness passes for at least 80 percent of real gap cases
6. unsupported readiness claims are counted and fail the benchmark

## Next Iteration

Add a small freeform benchmark mode with five cases first. After that passes,
add generic chat baseline comparison without changing the current deterministic
40-case harness.
