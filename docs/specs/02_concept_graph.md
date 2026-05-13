# Spec 02: Concept Graph

## Goal

Turn artifact structure into a concept graph the user can study and challenge.

The graph is not only files. It should connect files to concepts, responsibilities, flows, and risk areas.

## Contract

```text
ConceptNode
  id
  label
  kind: architecture | runtime | data_flow | algorithm | framework | testing | risk | domain
  source_paths
  why_it_matters
  prerequisite_concepts

ConceptEdge
  from
  to
  relation: calls | configures | persists | renders | tests | depends_on | explains | risks
  evidence
```

## Required Behavior

1. Sibi creates a small initial concept graph for the artifact.
2. Every concept must cite source evidence.
3. Concepts should be human-readable, not just file names.
4. The graph should identify at least one important flow.
5. The graph should identify concepts that are likely hard or risky.

## First Useful Concepts

For a code artifact, prioritize:

1. entry point
2. runtime boundary
3. state or persistence
4. data flow
5. core algorithm or policy
6. tests
7. failure modes

## Non-Goals

1. no full static-analysis engine
2. no perfect dependency graph
3. no claim that the graph is complete
4. no hidden mastery judgment

## Verification

A user should be able to point at a concept and answer:

1. where does this appear?
2. why does it matter?
3. what depends on it?
4. what would break if it changed?

