# 12: UI Reference Components

## Goal

Capture the useful UI ideas from `docs/iterations/sibi-ui-lab-lens/` as
reproducible components for future Sibi Workspace and Sibi Lens implementation.

These references are not final product screens. They are a component library
source. A worker should use this file to reproduce the visual and interaction
style without copying the iteration blindly or turning Sibi into a generic IDE.

## Reference Sources

1. `../../iterations/sibi-ui-lab-lens/01-sibi-lens-command.png`
2. `../../iterations/sibi-ui-lab-lens/02-sibi-lens-question.png`
3. `../../iterations/sibi-ui-lab-lens/03-sibi-lab-code-workbench.png`
4. `../../iterations/sibi-ui-lab-lens/04-sibi-lab-derivation.png`
5. `../../iterations/sibi-ui-lab-lens/05-sibi-lab-patch-readiness.png`
6. `../../iterations/sibi-ui-lab-lens/06-sibi-lab-overview-map.png`

## Visual Grammar

The references share one strong product language:

1. warm white application surface
2. restrained teal as the ownership/active-boundary color
3. amber for uncertainty, gaps, warnings, and unknown zones
4. red only for blocked or failed checks
5. thin dividers instead of heavy containers
6. one dominant artifact per screen
7. compact side rails
8. evidence near the bottom or directly adjacent to the artifact
9. readiness shown as scoped state, not global gamification
10. generous whitespace around the central thinking artifact

The UI should feel like a serious research workbench, not a dashboard. Cards are
allowed for evidence items, checks, patch gates, and selectable artifacts, but
page sections should remain structural panes rather than nested card stacks.

## Component: Lens Command Surface

Reference: `01-sibi-lens-command.png`

Purpose:

Let the user capture intent or resume work without opening the full Workspace.

Structure:

1. compact floating panel
2. Sibi mark and `Sibi Lens` title
3. command shortcut chip
4. large intent input
5. four primary actions: open loop, select repo, readiness, ask
6. current repository selector
7. readiness status card
8. last Sibi activity row

Implementation notes:

1. Use this for fast capture, not deep work.
2. Keep the panel single-column after the action grid.
3. The input should be the dominant control.
4. Action tiles should be icon-first and short.
5. The bottom activity row should summarize one recent loop event.

Do not add:

1. file trees
2. long explanations
3. diagrams
4. full memory history

## Component: Lens Question Gate

Reference: `02-sibi-lens-question.png`

Purpose:

Ask one precise thinking checkpoint over the user's current artifact and route
the user into the Lab.

Structure:

1. small macOS-style Lens panel over the user's work
2. repository selector
3. artifact selector
4. active learning-loop status
5. question title
6. operation buttons such as trace, predict, explain
7. primary `Open Lab` action

Implementation notes:

1. The Lens can ask "Why this function?" but should not answer it.
2. Operation buttons should represent what the user must do, not what Sibi will
   do for them.
3. `Open Lab` should preserve repository, artifact, selected operation, and
   current evidence range.

## Component: Lab Shell

References: `03-sibi-lab-code-workbench.png`, `04-sibi-lab-derivation.png`,
`06-sibi-lab-overview-map.png`

Purpose:

Provide a consistent large surface for code, derivations, maps, patch previews,
and experiments.

Structure:

1. top product bar with `Sibi Lab`, workspace breadcrumb, saved state, and
   lightweight utility actions
2. left navigation/source rail
3. central artifact canvas
4. right Sibi Loop rail
5. bottom evidence, command, or run-output rail

Implementation notes:

1. The center must always be the largest region.
2. The right rail should own question, readiness, next action, and memory state.
3. The bottom rail should be collapsible but visible enough to reinforce
   evidence-backed reasoning.
4. The shell should support mode-specific center artifacts without changing the
   overall layout.

## Component: Source And Artifact Rail

References: `03-sibi-lab-code-workbench.png`, `04-sibi-lab-derivation.png`

Purpose:

Show the active boundary, source roles, and saved thinking artifacts.

Variants:

1. repo tree for code artifacts
2. grouped sources for repository, papers, and artifacts
3. compact icon rail for Lab sections

Required elements:

1. repository or source group name
2. branch or source status when available
3. search/filter input for code repos
4. active file or artifact highlight
5. artifact list below source tree
6. count badges for grouped sources

Implementation notes:

The rail must not imply that all files are owned. It should separate active
boundary, available sources, saved artifacts, and unknown zones.

## Component: Code Workbench Artifact

Reference: `03-sibi-lab-code-workbench.png`

Purpose:

Render a read-only code slice with line-level focus, related call/data context,
and a Sibi Loop prompt.

Structure:

1. artifact title row: kind, symbol name, path, line anchor
2. read-only badge
3. language selector or language label
4. code viewer with line numbers
5. active line or range highlight
6. lower call/data diagram
7. evidence strip
8. readiness checklist in the right rail

Implementation notes:

1. The selected code line should visually connect to the active prompt.
2. The call/data diagram should be below code, not replace it.
3. Readiness checks should be operational: purpose clear, inputs/outputs
   identified, dependencies mapped, edge cases considered, tests sufficient,
   operational impact assessed.
4. Failed or incomplete readiness items should be visible without turning into a
   noisy dashboard.

## Component: Call/Data Diagram

Reference: `03-sibi-lab-code-workbench.png`

Purpose:

Show immediate upstream and downstream context for a selected function or code
range.

Structure:

1. selected function as the emphasized center node
2. upstream callers on the left
3. downstream calls or data dependencies on the right/bottom
4. path labels on each node
5. segmented control for `Calls` and `Data`

Implementation notes:

1. The diagram should remain shallow by default.
2. Each node needs an evidence reference.
3. Selecting a node should update the code slice or open a new loop.
4. Unknown or inferred edges must be visually distinct.

## Component: Derivation Ladder Artifact

Reference: `04-sibi-lab-derivation.png`

Purpose:

Represent a mathematical or paper-derived argument as a sequence with a visible
gap that the user must repair.

Structure:

1. title row with artifact mode and autosave status
2. numbered steps
3. equation label per step
4. check state for confirmed steps
5. arrows between steps
6. highlighted gap row with dashed amber boundary
7. missing proof step card
8. future or unconfirmed final step

Implementation notes:

1. This is the strongest pattern for papers, math, RL equations, and derivation
   work.
2. The gap row should be large and explicit.
3. The right rail should frame the current hypothesis and proposed path.
4. Evidence cards should include paper and experiment sources.

## Component: Sibi Loop Rail

References: `03-sibi-lab-code-workbench.png`, `04-sibi-lab-derivation.png`,
`06-sibi-lab-overview-map.png`

Purpose:

Keep the current cognitive operation visible.

Possible sections:

1. question or hypothesis
2. context
3. proposed path
4. operation buttons
5. readiness checklist or meter
6. what's missing
7. next slice
8. memory note

Implementation notes:

1. The rail should be narrow and vertically scannable.
2. It should never become a chat transcript.
3. It should show one current loop, not every possible feature.
4. It can use circular progress, checklists, or gate rows depending on artifact
   type.

## Component: Evidence Strip And Evidence Cards

References: `03-sibi-lab-code-workbench.png`, `04-sibi-lab-derivation.png`,
`06-sibi-lab-overview-map.png`

Purpose:

Make source grounding permanently visible.

Variants:

1. horizontal strip of tests, docs, reviews, and command outputs
2. paper evidence cards
3. experiment result card with small chart
4. recent evidence chips in overview mode

Required fields:

1. evidence role
2. title
3. source path or citation
4. status
5. timestamp when relevant
6. short excerpt or metric

Implementation notes:

Evidence should be visible without overwhelming the artifact. The strip can show
the top items and provide `View all` for deeper inspection.

## Component: Patch Readiness Gate

Reference: `05-sibi-lab-patch-readiness.png`

Purpose:

Show a generated patch preview while blocking product mutation until readiness
criteria pass.

Structure:

1. left navigation rail
2. patch title and generated timestamp
3. original read-only code pane
4. generated patch preview pane
5. change summary row
6. readiness gate rail
7. command/test output bottom strip
8. disabled or guarded `Apply Patch` action

Readiness gate checks:

1. build
2. unit tests
3. static analysis
4. risk review
5. performance

Implementation notes:

1. Patch preview is a study artifact until applied.
2. Risk review can block application even when tests pass.
3. The apply action should explain why it is blocked.
4. The diff should be readable without a full IDE.

## Component: Repo Overview Map

Reference: `06-sibi-lab-overview-map.png`

Purpose:

Show ownership over a large repo progressively.

Structure:

1. repo title and size
2. legend for active boundary, owned, unknown zones, and external regions
3. cluster map with module labels and approximate LOC
4. active boundary highlighted in teal
5. unknown zones in amber dashed regions
6. right rail for next slice, question, readiness, and memory
7. bottom rail for recent evidence and commands

Implementation notes:

1. The map should explicitly reject whole-repo ownership claims.
2. Unknown zones must be visually present.
3. The next slice card should propose a bounded expansion.
4. The question card should ask for a boundary decision, not assume it.

## Component: Memory Card

Reference: `06-sibi-lab-overview-map.png`

Purpose:

Show durable ownership memory as a small, concrete result.

Structure:

1. memory title
2. discovered concept or flow
3. evidence-backed summary
4. optional icon or saved-state marker

Implementation notes:

Memory should not become a motivational badge. It should record what the user
demonstrated or what Sibi discovered with evidence.

## Component: Command Strip

References: `05-sibi-lab-patch-readiness.png`, `06-sibi-lab-overview-map.png`

Purpose:

Expose safe execution as evidence.

Variants:

1. command output strip for a completed command
2. command buttons for explore slice, trace dependencies, run tests

Implementation notes:

1. Commands must show the action before execution.
2. Outputs become evidence.
3. Command controls should stay secondary to the active artifact.

## Artifact Mapping

Map these components to Sibi artifact kinds:

1. `code_slice` -> Code Workbench Artifact
2. `flow_diagram` -> Call/Data Diagram
3. `equation_breakdown` -> Derivation Ladder Artifact
4. `paper_excerpt` -> Derivation Ladder plus Evidence Cards
5. `patch_preview` -> Patch Readiness Gate
6. `risk_map` -> Readiness Gate plus Evidence Strip
7. `memory_review` -> Memory Card
8. `concept_ladder` -> Sibi Loop Rail plus Derivation/Step Ladder
9. `repo_overview` -> Repo Overview Map

## Component Acceptance

A component is ready to reproduce when it defines:

1. purpose
2. source data contract
3. active user operation
4. evidence display
5. hidden answer or gated state
6. readiness or next action
7. empty state
8. blocked state
9. source reference to one of the iteration images

## Anti-Patterns

1. cloning the screenshots without preserving the attempt-first rule
2. turning the Lab into a full IDE
3. replacing evidence with decorative diagrams
4. showing global progress when readiness is scoped
5. hiding unknown zones
6. making the right rail a chat transcript
7. stacking too many panels around a weak center artifact

