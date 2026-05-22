# Workspace Tauri React Migration Plan

## Goal

Translate the current static Tauri workspace prototype from HTML, CSS, and
browser-wired JavaScript into the UI architecture defined in
`../01_ui_technology_architecture.md`.

This is a UI migration plan. It does not change runner selection, Rust command
execution, sidecar lifecycle, or TS runtime ownership. Any required integration
work must be handed off to the deep-ownership adapter and execution specs.

## Current Source

Legacy prototype files:

1. `apps/sibar-research-workspace/index.html`
2. `apps/sibar-research-workspace/styles/tokens.css`
3. `apps/sibar-research-workspace/styles/base.css`
4. `apps/sibar-research-workspace/styles/workspace.css`
5. `apps/sibar-research-workspace/legacy/vanilla-workspace/scripts/research-workspace.js`
6. `apps/sibar-research-workspace/legacy/vanilla-workspace/scripts/workspace-app.js`
7. `apps/sibar-research-workspace/legacy/vanilla-workspace/scripts/workspace-render.js`
8. `apps/sibar-research-workspace/legacy/vanilla-workspace/scripts/workspace-session.js`
9. `apps/sibar-research-workspace/legacy/vanilla-workspace/scripts/workspace-intent-adapter.js`

The migration should preserve fixture behavior while replacing DOM mutation with
typed React components, reducers, and explicit UI projections.

## Target Stack

1. React + TypeScript + Vite
2. Tauri WebView delivery
3. CSS Modules for component styling
4. Shared design tokens for color, spacing, typography, density, and state
5. Vitest/Testing Library for component flow tests
6. Playwright or browser screenshots for visual checks after each slice

## Target UI Boundaries

The first React implementation should keep these boundaries visible in
directory and component names:

```text
src/
  main.tsx
  App.tsx
  styles/
    tokens.css
    global.css
  bridge/
    workspaceCommands.ts
  state/
    workspaceReducer.ts
    workspaceProjection.ts
  flows/
    home/
      WorkspaceHome.tsx
      WorkspaceCard.tsx
      home.module.css
    onboarding/
      OnboardingFlow.tsx
      WorkspacePlanPreview.tsx
      onboarding.module.css
    workspace/
      WorkspaceShell.tsx
      StudyPathRail.tsx
      SessionWorkbench.tsx
      workspace.module.css
  renderers/
    ReaderArtifactHost.tsx
    PaperReader.tsx
    CodeReader.tsx
    ArtifactReader.tsx
    DiagramReader.tsx
    FallbackReader.tsx
  guide/
    GuidePanel.tsx
    guide.module.css
  evidence/
    EvidenceReadinessPanel.tsx
    evidence.module.css
  debug/
    DebugDrawer.tsx
```

This tree is a boundary guide, not permission to create empty files. Add a file
only when the migration slice needs it.

## Migration Slices

### Slice 0: React Shell, Static Fixture

Outcome:

1. Vite boots inside the Tauri app folder.
2. `index.html` contains only the React mount and static metadata.
3. Static fixture data renders the same first screen without calling Rust.
4. Existing Tauri config still loads the app.

Do not wire runners or compiler commands in this slice.

### Slice 1: Workspace Home And Flow Routing

Translate the default `/` screen first if it does not exist yet:

1. workspace list from a static `WorkspaceHomeProjection`
2. pending session / continue queue
3. draft or blocked intent attempts
4. compact `New workspace` action
5. navigation outcomes for `Open`, `Resume`, and `New workspace`

State rule:

Use a reducer or explicit screen state for `home -> createWorkspace ->
workspaceOverview -> activeSession`. Do not overload one `overview` state to
mean both the global home and the selected workspace overview.

Static-first rule:

Home must render from deterministic fixture data before any trace store,
persistence, or Rust command is connected.

### Slice 2: Onboarding Flow

Translate:

1. workspace intent fields
2. optional background drawer
3. workspace plan preview
4. disabled/enabled transition to workspace study-path overview

State rule:

Use local state for text inputs and drawer open/closed state. Use a reducer for
the preview/open-session transition if the flow grows beyond simple input state.

Static-first rule:

The flow must render a deterministic local preview before any Rust compiler
call is considered.

### Slice 3: Workspace Shell, Overview, And Active Session

Translate:

1. native top bar
2. workspace study-path overview with learning nodes and available session
   entry points
3. study path rail for the active-session screen only
4. material/source tree for the selected learning node
5. central active material reader/artifact canvas
6. static material-mode contract in projection
7. viewport-bounded desktop layout with scroll scoped to the reader canvas
8. responsive ordering where session appears before the tree on narrow layouts

State rule:

Use a `workspaceReducer` for selected node, selected mini-node, selected source,
material-render mode (via selected source), and drawer visibility. The overview may
select a node, but it
must not imply the user is already inside the active study session. The global
home must not share this reducer unless it consumes the same projection through
an explicit boundary. Do not mirror the same value in multiple hooks.

### Slice 4: Reader / Artifact Host

Translate the reader area into `ReaderArtifactHost`.

Supported render modes:

1. `paper`
2. `artifact`
3. `note`
4. `code`
5. `equation`
6. `fallback`

Each renderer owns one mode. The host chooses the renderer from typed projection
data. It must not recurse through generic wrappers to discover what to render.

### Slice 5: Guide, Attempt, Evidence, Readiness

Translate:

1. guide modes
2. attempt composer
3. hint/retry feedback
4. evidence checklist
5. readiness/gap/repair state

State rule:

Attempt text may be local input state. Submitted attempt results, readiness, and
repair state must come from a projection or explicit boundary response.

### Slice 6: Debug Drawers

Translate:

1. compiler drawer
2. contract payload viewer
3. source card diagnostics
4. mode action log

Debug UI must stay visually and structurally separate from learner-facing state.
It should be removable without breaking the primary workspace.

### Slice 7: Legacy Removal

Only after parity is verified:

1. remove unused DOM-rendering scripts
2. remove unreferenced legacy CSS
3. keep deterministic fixture helpers only if tests still need them
4. update README run instructions

## Boundary Handoff

If a migration slice needs live compiler, Rust command, runner, sidecar, or TS
runtime behavior, stop and create or update the appropriate non-UI spec:

1. `docs/specs/deep-ownership-workspace/02_runtime_boundary.md`
2. `docs/specs/deep-ownership-workspace/03_validation_and_plan.md`

The UI migration may define the shape of a consumed projection, but it must not
define command execution or runner lifecycle.

## Anti-Slop Rules For Implementation Workers

1. Implement one migration slice at a time.
2. Preserve current visible behavior before adding new behavior.
3. Prefer static fixture rendering before bridge calls.
4. Keep each UI file below 1000 lines.
5. Do not create wrapper-only components that forward unchanged props.
6. Name components after product boundaries, not implementation trivia.
7. Every action handler must have an explicit state or navigation outcome.
8. Every dynamic call must identify the Rust/API boundary it crosses.
9. Do not introduce global state until local reducer boundaries are insufficient.

## Verification Per Slice

Each slice must include the smallest meaningful check:

1. typecheck or build when the React toolchain exists
2. component test for state transitions when the slice owns state
3. screenshot comparison for workspace home, onboarding, and workspace first
   viewport
4. `git diff --check`

Record any visual screenshot under `docs/specs/ui/workspace-tauri/assets/` only
when it documents a meaningful iteration state.

## Acceptance

1. The app can be migrated to React without changing runner semantics.
2. The first React pass can render workspace home, onboarding, workspace
   overview, and active session from static data.
3. Component boundaries match `01_ui_technology_architecture.md`.
4. Reader/artifact rendering supports multiple modes by contract.
5. Legacy JS/HTML/CSS is removed only after parity and verification.
