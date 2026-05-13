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
