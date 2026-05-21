# UI Technology Architecture (Transversal)

## Decision

The Sibar Tauri workspace UI must use **React + TypeScript + Vite** as the
baseline stack.

Rust/Tauri remains the native boundary for process execution, filesystem,
security policy, compiler/runtime invocation, and adapter orchestration.

## Scope of This Spec

1. UI architecture and build choices for the Tauri workspace surface.
2. Component, state, and data-flow rules that make the UI static-first and
   bounded.
3. Explicit boundaries so runtime, runner, and adapter decisions are handed off
   to existing execution specs.

This spec intentionally does not define:

1. Runner selection logic
2. Sidecar protocol internals
3. Rust adapter execution behavior
4. TS runtime strategy outside the UI projection layer
5. Native OS privilege policy

## Technology Baseline

### UI Runtime

- **Framework:** React
- **Language:** TypeScript
- **Build tool:** Vite
- **Delivery:** Tauri WebView (desktop shell)

### Styling

- **Primary:** CSS Modules
- **Design system:** central token source (spacing, typography, color, density,
  and state colors) consumed by modules.
- No framework-level visual system is required at this layer until evidence
  shows repeated copy/paste drift.

### Native Boundary

- Rust/Tauri owns:
  - project/source resolution and metadata
  - shell/process boundaries
  - compiler command orchestration
  - adapter/runner handoff and audit summary
  - persistence of long-lived session/job metadata
- The UI renders the outcome of these boundaries; it does not own or re-execute
  their internals.

## Interaction and State Rules

### 1) Static-first interaction

Each interaction should be satisfiable with a static UI projection first.

Only when a user action requires truth that cannot be represented statically
should the UI ask for a server/API/adapter operation, and only through the
explicit Rust boundary.

- Static response should be immediate, visible, and reversible.
- Dynamic work should expose intent + expected output clearly before submit.
- Progress should be surfaced as UI state transitions, not opaque "loading chaos."

### 2) Bounded state, not blanket hooks

- React is required for structure, not for indiscriminate local state noise.
- Use local state only for:
  - visible ephemeral UI state (selection, open panels, editor input buffer)
  - transient interaction flags that are not canonical product state
- Canonical workspace state must come from the native projection contract.
- Use `useState`/`useEffect` for the narrowest possible scope. If a screen needs
  more than a few flags, prefer reducer-structured state or typed local stores
  with explicit transitions.
- Never mirror the same value in multiple independent hooks.

### 3) Viewport-bounded visual surfaces

Primary Tauri screens must fit inside the native window viewport. They should
not behave like long web pages on desktop.

- Shells, rails, and workspace-level panels should use explicit viewport
  constraints (`height: 100dvh`, `min-height: 0`, fixed grid rows/columns, or
  equivalent).
- Only the content region that naturally grows should scroll. For active node
  sessions, that means the central reader/artifact canvas can scroll while the
  study path rail and guide/readiness rail stay structurally fixed.
- If a component cannot fit at the Tauri minimum window size, it must define a
  responsive fallback where the whole surface becomes scrollable.
- Do not create oversized hero sections inside app workspaces.
- Do not hide essential navigation below the first viewport.

## Section Modularization (Mandatory)

The workspace UI must be composed with these bounded sections:

1. **Workspace Home**
   - Default returning-user entry point.
   - Lists existing workspaces, pending sessions, blocked/draft intents, and a
     compact `New workspace` action.
   - Does not render `Study Path`, `Read / Build / Recall`, tutor, or compiler
     debug state.
2. **Onboarding**
   - Collects intent, source constraints, and first-session expectation.
   - Produces a workspace preview contract only.
3. **Workspace Shell**
   - Topology, shell chrome, rail/navigation scaffolding.
   - Owns global arrangement and mode switching.
4. **Reader / Artifact Renderers**
   - Dedicated renderer host for artifact consumption and reading tasks.
   - Must support multiple modes (at least `paper`, `artifact`, `code`,
     `diagram`, and `log`).
5. **Guide**
   - Compact "what should I do now" guidance and prompts.
   - Must not become a second independent narrative or chat surface.
6. **Evidence / Readiness**
   - Bounded claim rendering.
   - Readiness states are explicit and scoped to the current artifact and action.
7. **Debug Drawers**
   - Operational diagnostics for development and verification only.
   - Never mixed with learning state in normal user mode.

### Reader Renderer Requirement

The reader layer is required to support:

1. **Papers**
   - structured sections, claims, and citation points
2. **Artifacts**
   - structured summaries, metadata, and source mapping
3. **Code**
   - ranged excerpts, file markers, symbol anchors, and copy-ready blocks
4. **General mode**
   - text/markdown/list fallback without claiming unsupported formats

## Boundaries and Handoff (Do Not Invert)

Any real impact on runners, Rust sidecar, or TS runtime must be routed through
the existing adapter/connection specs and implemented as those surfaces only:

- workspace execution and compiler pipeline: `docs/specs/deep-ownership-workspace/17_workspace_execution_pipeline.md`
- adapter contracts and runner handoff: `docs/specs/deep-ownership-workspace/16_llm_adapter_contract.md`
- workspace compiler boundary: `docs/specs/deep-ownership-workspace/15_workspace_intent_compiler.md`

The UI spec layer must never define how those systems execute commands or
handle process lifecycle.

## Component Boundary Rules

Before implementation, each UI spec or iteration must name the component
boundaries it expects. The default boundaries are:

1. `WorkspaceHome`
2. `OnboardingFlow`
3. `WorkspaceShell`
4. `ReaderArtifactHost`
5. `GuidePanel`
6. `EvidenceReadinessPanel`
7. `DebugDrawer`

Renderer-specific components should branch at `ReaderArtifactHost`, not through
recursive wrapper chains. If a renderer needs its own structure, it should own
one clear mode such as `PaperReader`, `CodeReader`, `ArtifactReader`, or
`DiagramReader`.

## Quality Constraints Against "AI Slop"

1. **Bounded components:** each component owns one user intent and one bounded
   output.
2. **Explicit outcome:** every action handler must define a concrete state or
   navigation outcome.
3. **Minimal interaction:** no extra controls unless they reduce ambiguity for
   the next action.
4. **Clear contracts:** props/state are typed and documented enough to infer
   render result without guessing.
5. **No over-abstraction:** component depth is shallow enough to read in one
   pass.

## Structural Limits

- No UI file should exceed **1000 lines**.
- If one component grows past a single clear section responsibility, split it by
  the boundaries above before adding more state.
- Avoid chains of tiny wrapper components when they only re-export props.
  Prefer one bounded component with clear branching over many 3-5 line recursive
  wrappers.
- Do not create a component only to call another component with unchanged props
  unless it names a real product boundary.
- Keep section boundaries explicit in filenames and directory intent.

## Acceptance

1. Workspace UI can be explained from this document without reading app runtime
   code.
2. Section modularization is visible in spec and implementation naming.
3. Renderer layer proves multi-mode output capability by contract.
4. Dynamic behavior is explicitly labeled as boundary calls; static fallback is
   preserved.
5. No UI decision in this spec attempts to define runner internals.
