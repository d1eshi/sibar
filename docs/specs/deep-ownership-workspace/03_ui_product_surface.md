# 03: UI Product Surface

## Goal

Define the UI that makes deep ownership visible.

The UI is not decoration. Without a strong UI, the runtime becomes invisible and
the user falls back to chat. The surface must help the user think, select
evidence, inspect artifacts, answer prompts, see gaps, and continue building.

## Product Surfaces

Sibi should have two complementary surfaces:

1. `Sibi Lens`: a small, fast, native command/prompt surface.
2. `Sibi Workspace` or `Sibi Lab`: a large artifact workspace for deep work.

## Sibi Lens

The Lens is used when the user is already working elsewhere.

Primary jobs:

1. capture a goal
2. resume the next loop
3. ask one active question
4. show a small evidence excerpt
5. show one readiness or gap state
6. open the full Workspace

Target feel:

1. fast like a launcher
2. native like a macOS utility
3. non-disruptive
4. close to the user's existing work
5. never a long document UI

Reference components:

1. `12_ui_reference_components.md#component-lens-command-surface`
2. `12_ui_reference_components.md#component-lens-question-gate`

Recommended stack:

```text
SwiftUI + NSPanel for macOS Lens
```

Lens layout:

```text
Top: current goal / artifact boundary
Middle: active prompt or next action
Bottom: answer input, hint button, open workspace button
Status: readiness/gap chip with evidence count
```

Lens actions:

1. `Start Loop`
2. `Resume`
3. `Capture Selection`
4. `Open Workspace`
5. `Show Evidence`
6. `Try Again`
7. `Declare I Do Not Know`

Lens anti-patterns:

1. long explanations
2. full repo trees
3. complex diagrams
4. full code browsing
5. hidden grading
6. chat-first interaction

## Sibi Workspace / Lab

The Workspace is the main deep thinking environment.

Target feel:

1. serious research workbench
2. code-aware, but not a full IDE
3. artifact-first, not chat-first
4. evidence-heavy
5. dense but readable
6. optimized for repeated loops

Reference components:

1. `12_ui_reference_components.md#component-lab-shell`
2. `12_ui_reference_components.md#component-source-and-artifact-rail`
3. `12_ui_reference_components.md#component-sibi-loop-rail`
4. `12_ui_reference_components.md#component-evidence-strip-and-evidence-cards`

Recommended stack:

```text
Web UI first
Tauri desktop wrapper next
Rust filesystem/search/indexing bridge later
```

## Workspace Layout

Default layout:

```text
+--------------------+-------------------------------+----------------------+
| Boundary / Sources | Active Artifact Canvas         | Sibi Loop            |
|                    |                               |                      |
| Repo tree          | Code slice / diagram / paper   | Prompt               |
| Concepts           | Equation / experiment / table  | Attempt composer     |
| Flows              |                               | Hints                |
| Unknown zones      |                               | Gap / readiness      |
+--------------------+-------------------------------+----------------------+
| Evidence / Tests / Commands / Experiment Output                            |
+-----------------------------------------------------------------------------+
```

### Left Rail: Boundary And Navigation

The left rail should show:

1. artifact boundary
2. included sources
3. excluded sources
4. evidence roles
5. concept slices
6. flows
7. unknown zones
8. saved artifacts

It should not show a raw giant file tree by default for large repos. The tree
can exist, but the first view should be clustered by ownership relevance:

1. entrypoints
2. source truth
3. tests/oracles
4. docs/intent
5. examples
6. risky or unknown areas

### Center: Active Artifact Canvas

The center is where thinking happens.

Possible modes:

1. `Code Slice`
2. `Flow Diagram`
3. `Equation Breakdown`
4. `Paper Claim`
5. `Experiment Card`
6. `Hypothesis Table`
7. `Ablation Plan`
8. `Minimal Build`
9. `Counterexample`
10. `Memory Review`
11. `Patch Preview`
12. `Repo Overview Map`

The canvas must make the active operation obvious. The user should always know:

1. what artifact they are inspecting
2. what operation they must perform
3. what evidence is available
4. what is intentionally hidden until they attempt

### Right Rail: Sibi Loop

The right rail owns the attempt-first loop.

Sections:

1. active operation
2. answer/attempt composer
3. confidence selector
4. declared unknowns
5. hint ladder
6. gap result
7. repair action
8. readiness state
9. next loop

The right rail must not start with a full answer.

### Bottom Rail: Evidence And Signals

The bottom rail should show:

1. evidence citations
2. related tests
3. command outputs
4. experiment traces
5. file/symbol references
6. counterevidence
7. why a claim was rejected

This rail is crucial. It prevents the UI from becoming a pretty hallucination
surface.

## Code Presentation

Sibi needs code presentation, not a full code editor at first.

Required code viewer capabilities:

1. syntax highlighting
2. line numbers
3. selected ranges
4. citation anchors
5. related tests
6. jump to external editor
7. copy reference
8. collapse irrelevant ranges
9. show hidden context boundaries
10. show whether a range is source truth, intent, oracle, or example

Optional later:

1. inline scratch edits
2. patch preview
3. Monaco/CodeMirror-backed editing
4. LSP hover/go-to-definition
5. apply patch under readiness guardrails

Use `12_ui_reference_components.md#component-code-workbench-artifact` as the
first reproducible code artifact pattern.

## Diagram Presentation

Diagrams should be generated as thinking artifacts, not decorative visuals.

Diagram types:

1. architecture map
2. flow sequence
3. dependency cluster
4. concept ladder
5. causal graph
6. formula dependency graph
7. experiment loop
8. risk map

Diagram requirements:

1. every important node links to evidence
2. uncertain nodes are marked as inferred
3. the user can select a node and get a prompt
4. the diagram can hide the answer until the user attempts
5. the diagram can be regenerated after repair

Use `12_ui_reference_components.md#component-call-data-diagram` for immediate
code context and `12_ui_reference_components.md#component-repo-overview-map` for
large-repo progressive ownership.

## Paper And Math Presentation

Sibi must support non-code artifacts.

Paper UI:

1. excerpt panel
2. claim extraction
3. evidence/citation link
4. unknown term markers
5. implementation target
6. experiment target

Math UI:

1. equation panel
2. variable glossary
3. dependency graph
4. derivation blanks
5. parameter prediction prompt
6. counterexample prompt
7. implementation bridge

Use `12_ui_reference_components.md#component-derivation-ladder-artifact` as the
first reproducible paper/math artifact pattern.

## Patch And Readiness Presentation

Patch preview is a study artifact until the user is ready to mutate product
code.

Patch UI:

1. original read-only code pane
2. generated patch preview pane
3. change summary
4. readiness gate
5. command/test output strip
6. blocked apply state when any required criterion fails

Use `12_ui_reference_components.md#component-patch-readiness-gate` as the first
reproducible patch artifact pattern.

## Overview And Unknown-Zone Presentation

Large repositories need a map that shows what is active, owned, unknown, and
external.

Overview UI:

1. module clusters
2. active boundary
3. owned areas
4. unknown zones
5. external areas
6. next slice card
7. readiness meter
8. memory note

Use `12_ui_reference_components.md#component-repo-overview-map` as the first
reproducible large-repo ownership artifact pattern.

Example:

```text
Equation: G_t = R_{t+1} + gamma R_{t+2} + gamma^2 R_{t+3} + ...

Sibi asks:
If gamma moves closer to 1, what happens to the contribution of delayed
rewards? Do not explain gamma by definition. Predict behavior in an environment.
```

## Workspace Interaction Flow

First-run flow:

```text
1. User chooses source: repo/folder/paper/notebook.
2. User states goal.
3. Sibi proposes a boundary and evidence roles.
4. User confirms boundary.
5. Sibi builds initial evidence inventory.
6. Sibi proposes concept slices.
7. User chooses one slice or accepts the recommended first slice.
8. Sibi generates one thinking artifact.
9. Sibi asks the first operation.
10. User attempts.
11. Sibi checks evidence.
12. Sibi shows gap/readiness and next action.
```

## Morning UI Target

The first visible prototype should not wait for Tauri.

Morning target:

1. repo-owned local web route or static HTML prototype
2. one fixture generated from this repo
3. left rail with boundary and concept slice list
4. center artifact canvas with code slice plus diagram/table
5. right rail with one attempt-first prompt
6. bottom rail with evidence citations
7. readiness/gap result visible from fixture

The prototype can be throwaway, but it must answer:

> Can the user understand what Sibi is asking them to think about, which artifact
> they are using, and why the readiness state is limited?

## UI Acceptance Criteria

The UI is acceptable when:

1. the user can identify the active goal without reading docs
2. the boundary is visible
3. evidence is visible and clickable
4. the full answer is not shown before an attempt
5. code, diagram, or paper artifact is visible in the center
6. gaps are specific and actionable
7. readiness is scoped to an operation
8. the user can continue to a repair action
9. no panel pretends the entire repo is understood
10. external editor opening is available for code ranges
11. UI components map to the reference component catalog when they implement
    Lens, code workbench, derivation, patch readiness, or overview-map behavior
