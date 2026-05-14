# Self-Hosted MVP Boundary

## Goal

Define the exact SIBAR slice that SIBI must understand and evaluate first.

SIBI is not evaluating all of SIBAR in the MVP. It is evaluating whether the user
can own one concrete flow inside SIBAR with repo evidence and re-evaluation.

## MVP Flow

The self-hosted slice is:

```text
artifact intake
  -> concept graph
  -> ownership question
  -> user answer
  -> gap/readiness
  -> issue candidate
  -> repair
  -> re-evaluation
```

## Required Manifest

The first implementation artifact should be:

```text
sibar.selfhost.manifest.json
```

The manifest must declare:

```text
included_paths
excluded_paths
entrypoints
concepts
test_commands
owner_intent
out_of_scope
```

## Initial Boundary

The first self-hosted boundary should focus on the runtime learning loop:

```text
included_paths:
  - src/runtime-concept-graph.ts
  - src/runtime-gap-detection.ts
  - src/runtime-readiness.ts
  - src/runtime-practice.ts
  - src/runtime-memory.ts
  - src/runtime-support.ts
  - Tests/concept-graph.test.ts
  - Tests/gap-detection.test.ts
  - Tests/readiness-report.test.ts
  - Tests/practice-challenges.test.ts

excluded_paths:
  - node_modules/
  - .build/
  - docs/missions/*/handoffs/
  - Sources/
```

This boundary can be revised later, but the first benchmark must not expand
scope while the evaluation contract is still being proven.

## Initial Concepts

The first five self-hosted concepts are:

1. Artifact boundary
2. Concept graph generation
3. Gap detection
4. Repair practice generation
5. Readiness report generation

Each concept must have at least one mastery check and at least one required
repo citation before it can be evaluated.

## Owner Intent

The owner intent for the first self-hosted run is:

```text
Verify that the user can trace how SIBI converts bounded repo evidence and a
user answer into a learning gap, repair task, and readiness limitation.
```

## Out Of Scope

The first self-hosted MVP does not evaluate:

1. the full Swift study panel
2. the standalone app window or NSPanel behavior
3. full codebase-wide understanding
4. agent-driven workspace mutation
5. project generation
6. voice, screen capture, editor plugins, or ambient observation
7. multi-user dashboards

## Verification

This boundary is valid only when:

1. every included path exists
2. excluded paths cannot be cited as accepted evidence
3. every concept maps to at least one included path
4. every mastery check states its required evidence
5. readiness claims are limited to this boundary

## Feature Outcome

The user receives a visible, bounded artifact session for the self-hosted MVP.
SIBI can say which files are in scope, which files are out of scope, which
concepts are being evaluated, and which readiness claims are forbidden because
they exceed the manifest boundary.

## Manual Harness

Manual testers should use `sibar.selfhost.manifest.json` and inspect:

1. `included_paths` contain only the first runtime learning-loop slice.
2. `excluded_paths` block `Sources/`, build artifacts, mission handoffs, and
   dependencies.
3. every concept maps to an included source or test path.
4. a proposed readiness claim can be rejected when it cites an excluded path.
5. a proposed feature can be rejected when it tries to evaluate the whole repo.

Expected manual outcome:

```text
SIBI evaluates only the declared self-hosted slice and cannot use out-of-bound
evidence to support gaps or readiness.
```

## Eval Coverage

Current coverage:

1. `pnpm run eval:selfhost-pilot` checks manifest existence, included-path
   existence, concept set, mastery check index, gold case index, and out-of-scope
   required evidence paths.
2. `Tests/selfhost-pilot-evals.test.ts` mutates gold cases to prove out-of-bound
   required evidence is rejected.
3. Runtime artifact boundary behavior is also covered by `Tests/runtime.test.ts`.

Missing coverage:

1. manual freeform answers are not yet evaluated against boundary leakage.
2. readiness reports are not yet benchmarked against adversarial excluded-path
   citations in this self-hosted harness.

## Iteration Log

### 2026-05-14: Living boundary spec

Input used:

- `sibar.selfhost.manifest.json`
- the five first-slice concepts
- current self-hosted pilot validator behavior

Expected outcome:

- Boundary becomes the first executable feature gate, not only manifest metadata.

Actual outcome:

- The spec now states what the user receives, how to manually test boundary
  behavior, and which coverage protects it.

What worked:

- The manifest already contains the paths, concepts, test commands, and
  out-of-scope list needed for manual review.

What failed or remains weak:

- Boundary is enforced for fixtures and manifest validation, but not yet shown
  through a freeform user-answer session.

Coverage added or missing:

- Added documentation coverage for manual boundary testing.
- Missing adversarial freeform boundary cases.

Decision:

- Keep boundary work in this spec. Do not split it into a separate feature spec.

## Acceptance Gate

This feature is MVP-ready when:

1. every self-hosted answer, gap, repair, and readiness claim can be traced back
   to manifest-allowed evidence
2. excluded paths are rejected in both fixtures and freeform answer evaluation
3. manual testers can reproduce one accepted in-bound claim and one rejected
   out-of-bound claim

## Next Iteration

Add freeform boundary-leak cases to the first freeform answer evaluator slice:
one answer should cite only included paths, one should cite an excluded path, and
one should mix included and excluded evidence.
