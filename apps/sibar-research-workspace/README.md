# Sibar Research Workspace (Tauri second app)

This is a static second-app product slice intended to run as a desktop shell
workspace for the Deep Ownership flow.

## React migration slice 0 (static)

- Start the React shell from repository root:
  - `pnpm workspace:dev`
- Build the static React entry:
  - `pnpm workspace:build`
- Optional preview from build output:
  - `pnpm workspace:preview`

This slice renders the onboarding prototype screen only: native style topbar, intent
fields, and static preview column. It does not connect to Rust, runners, or the
compiler path.

## React migration slice 1 (interactive onboarding)

- Converted the onboarding screen to controlled form fields for intent, source,
  constraint, and optional background fields.
- `Review workspace plan` now computes a deterministic local workspace preview from
  the current intent/source payload and enables the next workspace action.
- In this slice, the first-session action updated local flow state and surfaced a
  local "First session ready" status before workspace navigation was introduced.
- No fetch calls, Tauri invoke calls, or Rust/compiler execution is performed in
  this step.

## React migration slice 2 (workspace shell, overview, and first session)

- Added the dedicated `WorkspaceShell` boundary so onboarding renders inside a
  reusable native-style container.
- `OnboardingFlow` now emits an `onOpenWorkspace` callback from `Open workspace`
  after local preview generation.
- Added a workspace overview screen that shows planned learning nodes and the
  available first-session entry point before opening an active node session.
- Added a static first-session workspace surface with reducer-backed selection state:
  - study path rail
  - session workbench
  - active action row (`Read` / `Build` / `Recall`)
  - compact readiness/source panel
- No fetch calls, Tauri invoke calls, compiler integration, runner sidecar, or
  external execution calls were added in this slice.

## Tauri shell

- The app shell scaffold is in `src-tauri/`.
- `src-tauri/tauri.conf.json` uses the Vite workspace dev/build flow:
  `beforeDevCommand` runs `pnpm workspace:dev`, `beforeBuildCommand` runs
  `pnpm workspace:build`, and `frontendDist` is set to `dist`.
- `src-tauri/Cargo.toml` and `src-tauri/src/main.rs` define a minimal, standard
  launch path.

This implementation does not require crates to be downloaded for validation tests.
If you do want to run locally, install a compatible Tauri toolchain first and
then run the conventional Tauri command from this folder.

## Product surface checks in this slice

- Native-style topbar and prototype onboarding viewport.
- Intent input fields (`What are you trying to build...`, source, constraint and
  optional background/outputs).
- Static proposed plan preview column with first-session outcome and disabled first
  action.
