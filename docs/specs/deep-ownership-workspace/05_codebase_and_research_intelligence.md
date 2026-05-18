# 05: Codebase And Research Intelligence

## Goal

Define how Sibi reads large codebases and research artifacts without pretending
that context windows are infinite.

This is not "read every line and summarize." The system must build progressive,
evidence-backed projections that can be challenged, reopened, and repaired.

## Source Types

Sibi should eventually support:

1. repos
2. folders
3. file sets
4. papers
5. notebooks
6. docs
7. tests
8. examples
9. command outputs
10. experiment runs
11. generated scratch artifacts

The first implementation can focus on local repos and folders.

## Evidence Roles

Every source should be classified by role:

1. `source_truth`: implementation or authoritative formula
2. `intent`: README, docs, comments, product notes
3. `behavior_oracle`: tests, evals, example outputs
4. `interface`: public APIs, CLI commands, types, schemas
5. `experiment`: notebook run, benchmark, training trace
6. `counterexample`: failing test, negative result, issue reproduction
7. `historical_rationale`: changelog, ADR, migration, issue thread
8. `unknown`: source exists but has not been classified

Tests and docs should be read early when in boundary because they reveal intent,
oracles, and expected behavior. They are part of understanding.

## Progressive Reading Pipeline

```text
Boundary
  -> Inventory
  -> Role Classification
  -> Structural Index
  -> Concept Slice Proposal
  -> Evidence Selection
  -> Thinking Artifact Generation
  -> User Operation
  -> Validation
```

## Inventory

Inventory reads metadata before content.

```text
InventoryEntry
  path
  source_type
  size
  extension
  role_guess
  ignored_reason
  hash
```

Inventory should skip:

1. dependency directories
2. build outputs
3. binary files
4. lockfiles unless dependency behavior is the concept
5. generated assets unless relevant

The system should record skipped areas explicitly.

## Structural Index

For code, build a structural index:

```text
CodeStructure
  files
  symbols
  imports
  exports
  tests
  scripts
  entrypoints
  public_interfaces
```

Initial implementation may be heuristic. Longer-term should use language-aware
parsers such as Tree-sitter where practical.

For papers:

```text
PaperStructure
  title
  sections
  claims
  equations
  figures
  experiments
  references
```

For notebooks:

```text
NotebookStructure
  cells
  imports
  parameters
  outputs
  plots
  errors
```

## Concept Slice Proposal

Sibi should propose small concept slices.

Examples:

1. "How a runtime command becomes a readiness report."
2. "Why PPO clips the ratio instead of using raw policy improvement."
3. "How Rust ownership is preserved around this buffer API."
4. "How attention scores become weighted values."
5. "How a test asserts behavior for this CLI command."

Proposal contract:

```text
ConceptSliceProposal
  label
  why_it_matters
  operation_candidates
  source_evidence
  behavior_evidence
  risk_evidence
  prerequisites
  unknowns
```

## Large Codebase Strategy

For a 200k LOC repo, Sibi must not load everything into one model prompt.

Rules:

1. Start with inventory and role classification.
2. Identify entrypoints and oracles.
3. Ask the user for a goal or propose a first slice.
4. Build a local evidence index.
5. Generate a small artifact for one operation.
6. Store summaries as projections, not truth.
7. Reopen exact evidence when checking claims.
8. Preserve unknown zones.
9. Expand boundary only when the loop requires it.

Unknown zones should be visible:

```text
UnknownZone
  path_or_cluster
  why_unknown
  when_to_open
  risk_if_ignored
```

## Search And Retrieval

Retrieval should be evidence-driven.

Useful signals:

1. file name
2. symbol name
3. import graph
4. tests referencing a symbol
5. docs referencing a term
6. package scripts
7. call-like patterns
8. recent diffs
9. failing outputs
10. user-selected code

The model should not decide truth from retrieved snippets alone. Retrieved
snippets become candidates for evidence checks.

## Research Artifact Strategy

For papers and math-heavy content, Sibi should not simply summarize.

Pipeline:

```text
paper excerpt
  -> claim extraction
  -> unknown term detection
  -> equation or mechanism selection
  -> prediction or derivation prompt
  -> implementation bridge
  -> experiment proposal
```

Example:

```text
User goal: understand PPO enough to implement it.

Sibi selects:
  - clipped objective equation
  - ratio term
  - policy update code from a repo
  - one test or toy environment

Sibi asks:
  - predict what clipping prevents
  - construct a case where unclipped update is unstable
  - implement a tiny clipped objective
```

## Code-To-Research Bridge

Sibi should connect code to concepts:

```text
ResearchBridge
  paper_claim
  equation
  implementation_site
  test_or_experiment
  user_operation
```

This is essential for AI research learning. The user should not only read a
paper or only run a repo. They should connect the idea to implementation and
behavior.

## Signals

Workspace signals are observations that can guide Sibi:

1. files selected by the user
2. test failures
3. command outputs
4. diffs
5. imports
6. TODOs
7. docs/tests mismatch
8. examples that fail
9. training curves
10. benchmark deltas

Signals are not mastery evidence by themselves. They can trigger loops.

## Anti-Patterns

1. summarizing the whole repo as if complete
2. generating a diagram with no citations
3. ignoring tests/docs
4. using comments as truth when tests contradict them
5. treating model confidence as correctness
6. hiding unknown zones
7. letting the user skip attempts
8. claiming readiness from passive reading

