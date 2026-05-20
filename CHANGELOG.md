# Changelog

All notable product changes for Sibi should be recorded here.

This changelog is written for humans first. It follows the spirit of Keep a
Changelog and uses SemVer-style versions, but Sibi version bumps are decided by
accepted specs and iterations, not by raw commit count.

## Unreleased

Use this section for changes that have landed but are not part of a tagged
release yet.

### Added - Workspace Intent First Flow

- Added the Workspace Intent spec as the first user-facing Sibar Research
  Workspace flow, distinguishing global ambition from a bounded workspace and
  documenting the transition from `WorkspaceIntent` to `WorkspacePlan`,
  `SessionPlan`, and `EvidencePlan`.
- Added PedagogoAI Workspace Intent contracts, deterministic builders, and
  validators under `src/pedagogoai`.
- Added a minimal `Create Workspace` UI entry in the Sibar research workspace
  app that compiles the intent through the core contract layer before opening
  the first session.

### Added - Workspace Rust Compiler Bridge

- Added a new PedagogoAI bridge module for invoking the Rust
  `sibi-workspace-compiler` via `cargo run --quiet -p sibi-workspace-compiler`.
- Added Rust plan intent normalization (`user_intent`, `source_bundle`, `evidence`,
  `root_path`) and a pure codex adapter argument builder so adapter mode selection
  can be tested without live execution.
- Added Rust→Pedagogo plan projection that preserves required `WorkspacePlan`
  fields (`nodes`, `outputs`, `session_plan`, `evidence_plan`) and marks
  `compiled_by` as `llm` when a runner plan is successfully applied.
- Added tests that verify fixture execution path, mapped audit payload, and
  `trying_to_build_or_understand` + evidence inclusion in the generated Rust intent.
- Added a root-level declarative selfhost pilot eval catalog that separates eval
  intent and fixtures from generated documentation reports, identifying
  Workspace Intent, Rust fixture, and `codex-exec` adapter coverage.
- Added `VAL-EVAL-010-workspace-runner-adapter` for offline runner adapter
  checks across Rust fixture execution, missing-fixture fallback, and blocked
  Codex command metadata.

### Changed - Workspace Intent Onboarding Compiler

- Added a local Sibar Research Workspace dev server route for running the Rust
  workspace compiler from the browser and rendering the returned workspace plan.
- Updated the normal `Generate workspace` onboarding action to compile the user's
  first-step intent through the Rust/Codex runner when available, with local
  deterministic fallback instead of a separate developer runner button.
- Added inline source evidence fallback for runner intents that use pasted source
  text instead of repository file paths.
- Updated the deterministic Workspace Intent compiler so fallback nodes, outputs,
  and the first session are derived from the user's topic, including the
  embeddings onboarding case, instead of defaulting to the JAX transformer path.
- Updated the Workspace Intent execution specs in-place so the canonical path is
  UI onboarding -> Tauri/Rust async job -> adapter -> parse/schema/pedagogy
  validation -> reproducible UI projection, without adding new spec files.
- Added a native Tauri `compile_workspace_intent` command that builds the Rust
  `WorkspaceIntent`, runs the workspace compiler adapter, and returns job,
  runner, Rust intent, and Rust plan data to the UI.
- Updated the research workspace UI adapter to prefer the native Tauri compiler
  bridge when available, falling back to the local dev endpoint or deterministic
  compiler outside the desktop host.
- Tightened the native compiler bridge after verifier review: fixture paths are
  forwarded when configured, static HTML no longer attempts the web compiler by
  default, Tauri runs the compiler on a blocking worker, and Rust validates the
  2-3 `next_actions` UI contract.
- Added visible native compiler progress for the onboarding flow and configured
  the Codex runner to use `gpt-5.4` with medium reasoning, terminal logs, and a
  stricter no-tool prompt for first workspace generation.
- Added a pending Workspace Trace contract gate for durable intent attempts, LLM
  run traces, session history, compaction, replay, and failed workspace creation
  diagnostics.

### Fixed - Codex Workspace Output Schema Strictness

- Updated the Rust workspace plan JSON Schema and Codex prompt constraints so
  `codex exec --output-schema` accepts the contract in strict mode and returns
  node plans with evidence links, prerequisites, concepts, and artifacts.
- Added a Rust regression test that verifies every object property in the static
  output schema is listed as required, matching Codex structured output rules.

### Changed - Sibar Research Workspace Visual Direction

- Added an image-first UI/UX report and mockup reference for the Sibar research
  workspace direction.
- Reworked the static research workspace variation around a macOS-like shell,
  left learning tree, focused Backpropagation session, contextual Discussion
  panel, and a warmer artifact/evidence strip.
- Wired the three visible next actions to observable workspace actions: Read,
  Code, and Explain.

### Internal - PedagogoAI Layer Boundary

- Added a declarative `src/pedagogoai` architecture layer that maps learning
  workspace contracts, pedagogy policy, evidence/artifacts, readiness/mastery,
  gap repair, recall/review, source-to-session compilation, and track
  specialization into explicit domain entrypoints.
- Reframed Explain A-Z as a PedagogoAI track alongside Deep Ownership, while
  preserving existing runtime imports through adapter reexports.

### Fixed - Live Workspace Preview and Evidence Ranges

- Updated live workspace contract generation so `artifact_previews` render text from
  `payload.lines` when `excerpt` is not provided, while preserving preview
  `line_start` and `line_end`.
- Updated `evidence` contract `line_range` to use cited `start_line`/`end_line`
  from `source_evidence` when available, with payload line metadata as fallback.
- Updated artifact type inference for PDF/paper handling, including `.pdf` path
  detection and clearer `preview_fallback_reason` messages when no renderable
  snippet exists for non-text previews.

### Fixed - Deep Ownership Workspace Tree Selection State

- Fixed roadmap tree selection in the second Tauri workspace so container nodes
  still control expand/collapse while node and mini-node selections no longer
  collapse their children unexpectedly.
- Fixed roadmap source-node selection so source clicks now drive reader/LM
  context consistently (`activeSourceSelection`, `activeNodeSource`,
  `lmReaderMove`) and log the selection action.
- Fixed applied roadmap artifacts so imported `mini_nodes`, `sources`,
  prerequisites, and reader guidance survive into the roadmap tree and reader
  instead of falling back to generic node defaults.
- Updated tests and spec pack references so the live spec source is read from
  `00_new_app_tauri_workspace.md` and the README identifies
  `13_tauri_second_app_product_plan.md` as derived/historical context.

### Internal - Deep Ownership Workspace Modularization

- Refactored the monolithic `research-workspace.js` into focused modules
  (`workspace-data`, `workspace-utils`, `workspace-study-plans`,
  `workspace-contract`, `workspace-session`, `workspace-render`, and
  `workspace-app`) while keeping the facade API and behavior stable.

### Docs - Deep Ownership Workspace Rust Execution Specs

- Added new lightweight spec docs for the Rust-native Deep Ownership Workspace path:
  `15_workspace_intent_compiler.md`, `16_llm_adapter_contract.md`,
  `17_workspace_execution_pipeline.md`, and `18_workspace_ui_reproducibility.md`.
- Updated `docs/specs/deep-ownership-workspace/README.md` reading order to
  reference the new spec sequence and ensure stable implementation handoff.

### Added - WorkspaceIntent Compiler Module

- Added `src/pedagogoai/workspace-intent/contracts.ts` with public plan types:
  `WorkspaceIntent`, `WorkspacePlan`, `SourceBundle`, `LearningNode`,
  `ArtifactTarget`, `SessionPlan`, and `Decision`.
- Added deterministic parsing and validation for raw model outputs:
  `src/pedagogoai/workspace-intent/parse-model-output.ts` and
  `src/pedagogoai/workspace-intent/validate.ts`.
- Added fixtures and prompt contracts for deterministic intent-to-plan generation:
  `src/pedagogoai/workspace-intent/prompts.ts`,
  `src/pedagogoai/workspace-intent/fixtures.ts`,
  `src/pedagogoai/workspace-intent/adapters/fixture.ts`.
- Added optional `codex exec` adapter at
  `src/pedagogoai/workspace-intent/adapters/codex-exec.ts` behind explicit
  invocation.
- Added `Tests/workspace-intent-contract.test.ts` to cover schema, parser, and
  pedagogy invariants.
- Added deterministic WorkspaceIntent compiler evals in
  `src/evals/workspace-intent-compiler.ts`, covered by
  `Tests/workspace-intent-evals.test.ts` and runnable with
  `pnpm eval:workspace-intent`.
- Refined the public contract to keep compatibility with the requested API shape:
  `WorkspaceIntent` now exposes `global_ambition`, `workspace_title`,
  `source_bundle`, `known_skills`, `unknowns`, `desired_outputs`, `horizon`;
  `WorkspacePlan` now exposes `first_session` and
  `open_questions_for_user` as required contract fields.

### Added - Native Explain A-Z Attempt Bridge

- Added the native Swift live-loop attempt bridge for `Explain this project A-Z`:
  the study panel can now submit workspace attempts to `submit_workspace_attempt`
  with selected evidence, declared confidence, and unknowns.
- The Swift panel now renders the attempt composer, locked required evidence,
  deterministic evidence-check results, detected gaps, repair actions, and
  scoped readiness without opening a browser workspace.

### Added - Native Live Workspace Repro Path

- Extended `StartWorkspaceSessionPayload` with optional
  `fixture_model_response_path`, encoded as `fixture_model_response_path` only
  when provided.
- Updated native live workspace startup to read
  `SIBI_WORKSPACE_FIXTURE_MODEL_RESPONSE_PATH` and pass it through to the
  `start_workspace_session` payload, with a lightweight injectable environment
  hook for tests.

### Added - Live Workspace Evaluation Visibility

- Extended `LiveWorkspaceRenderModel` with explicit evidence/evaluation fields:
  selected/cited/missing evidence IDs and normalized attempt-evaluation data
  (observed/missing/unsupported/contradicted claims, detected gap, repair action,
  reattempt prompt, and scoped readiness).
- Updated the native live-workspace center/right panel rendering to surface those
  deterministic fields as explicit sections and to mark artifact code lines by
  active range, cited evidence, selected evidence, and missing evidence.
- Added focused tests for submit-time evidence defaults and evaluation payload
  rendering in `Tests/SibiCoreTests/StudyPanelTests.swift`.

### Added - Deterministic Live Workspace Repro Path

- Added a committed fixture at
  `docs/specs/deep-ownership-workspace/fixtures/live-workspace-session.json`
  and wired `start_workspace_session` to expose it in `live_workspace.ui_reproduction.fixture_path`.
- Extended `start-workspace-session` and `explain` CLI commands with
  `--fixture-model-response-path` for deterministic dev/runtime checks.
- Added runtime and CLI tests in `Tests/workspace-live-session.test.ts`
  proving `start` + `submit` paths return attempt evaluation, submitted attempt,
  readiness, and deterministic reproduction metadata without requiring a live model runner.

### Added - Deep Ownership Workspace Attempt-First UI Flow

- Implemented the attempt-first UI flow in the static Workspace prototype with
  hidden answer gating (`aria-hidden`), evidence selection checkboxes, confidence
  controls, declared unknowns input, progressive hint ladder (no solution leakage),
  prerequisite route display, retry/repair controls, and full demo chain observability
  via console logs and state chain progress indicator.
- Post-attempt state shows evidence check (observed/missing/unsupported claims with
  counterevidence), detected gap with user and artifact evidence refs, concrete
  repair action with required evidence, and scoped readiness claim that explicitly
  rejects whole-repo mastery.
- Added `assertHiddenAnswerGated()` runtime check verifying no hidden solution
  content leaks into DOM or accessibility text before attempt submission.

### Added - Live Workspace Render Model for 3-Panel Shell

- Added `LiveWorkspaceRenderModel` for `LiveWorkspaceSessionView` as a deterministic
  source of left/center/right panel data from `StartWorkspaceSessionResult`, and
  added `StudyPanelTests` coverage for start/submit fixtures (requested artifact,
  evidence, next action, excluded/unknown scope, and readiness when available).

### Added - Reference Component Contracts, Accessibility, and Setup Flow

- Implemented a 7-step first-run setup wizard (goal, boundary, evidence roles,
  boundary confirmation, evidence inventory, concept slice, active operation)
  that gates the main Workspace until the user confirms the loop boundaries.
- Mapped all six major UI regions to `12_ui_reference_components.md` component
  contracts via `data-component` attributes: Lab Shell, Source & Artifact Rail,
  Code Workbench Artifact, Call/Data Diagram, Sibi Loop Rail, Evidence Strip.
- Added keyboard accessibility: skip navigation links for all three regions,
  `focus-visible` outline styles on all controls, `tabindex` and Enter/Space
  handlers on code lines and evidence cards, ARIA labels on answer input,
  confidence selector, and declared unknowns input.
- Added code workbench line selection: clicking a code line highlights it,
  updates evidence references, and logs the selection with related evidence ids.
- Added small-laptop responsive layout for 1366x768 and below with compressed
  grid columns, reduced padding/font sizes, and collapsible evidence rail.
- Added runtime error monitoring: `window.onerror` and `unhandledrejection`
  handlers with a visible error counter badge in the bottom-right corner.
- Added `recordBlockedValidation()` for recording browser validation failures
  with URL, tool, failure description, timestamp, affected assertions, and
  next action as a blocked-validation record.
- Added CSS classes for empty states and blocked states with amber-themed
  dashed borders, icons, titles, reasons, and suggested actions.

- Created the first deterministic Deep Ownership fixture (`sibi-pedagogy-loop.json`)
  describing one scoped loop over the Sibi pedagogy runtime: gap detection,
  practice generation, memory, and readiness.
- Added runtime type contracts and schema validation (`src/runtime-deep-ownership.ts`)
  for evidence identity, role classification, boundary enforcement, unknown zones,
  skip records, thinking artifacts, and scoped readiness claims.
- Added focused fixture/schema tests (`Tests/deep-ownership-fixture.test.ts`)
  verifying evidence ID stability, role classification of source/tests/docs,
  unknown zone presence, boundary enforcement against out-of-bound paths,
  and readiness scope without whole-repo ownership claims.

### Fixed - Live Workspace Submission Action

- Routed submit action from the live workspace attempt composer to `SubmitWorkspaceAttemptPayload`,
  so normal submit uses `.submit` and the "I do not know" button sends `.i_do_not_know`.
- Updated `StudyPanelLiveModel.submitWorkspaceAttempt` to accept an optional action
  argument (defaulting to `.submit`) and forward it unchanged to runtime payloads.

### Changed - Native Live Workspace Preview and Composer Submit Behavior

- The native live workspace now lets users select among left panel artifact previews; the
  center preview updates from runtime-provided options to match the selected artifact.
- During attempt submission, the composer now visibly disables controls until the submit
  resolves, preventing duplicate interactions while preserving selection state.

### Docs - Tauri Second App Workspace Spec

- Treat `docs/specs/deep-ownership-workspace/00_new_app_tauri_workspace.md`
  as the current source spec for the second sibling Sibar app in Tauri
  (`workspace investigador`), with
  `docs/specs/deep-ownership-workspace/13_tauri_second_app_product_plan.md`
  retained as a derived implementation plan, including:
  - conceptual stack (Goal → Roadmap → Node → Session → Artifact → Evidence → Recall),
  - first-screen UX (`Today`) requirements,
  - bounded LM tool mode,
  - no-goals and acceptance gates,
  - concrete criteria to decide whether Swift or Tauri continues as the main
    native shell.
  - implemented static/Tauri slice in `apps/sibar-research-workspace/` with:
    - Today-first workspace entry and source-to-roadmap screen,
    - bounded LM modes with the attempt/evidence/readiness loop,
    - source-to-roadmap + attempt, evidence, and readiness flow contracts,
    - selectable roadmap nodes that expand the reader into five mini-node
      study paths with paper/direct-reading resources,
    - contextual LM guidance that tracks the active node, selected mini-node,
      and "No entiendo este concepto" repair path,
    - focused tests over the implemented workspace behavior and static Tauri
      scaffold.

### Added - Tauri Research Workspace Contract Work

- Reworked the static roadmap pane into an expandable hierarchy (Goal → Arc → Track →
  Node → Mini-node → Source) with expansion state persisted in UI state and active
  selection tied into reader/LM updates.
- Added exported contract helpers for the static artifact flow:
  `buildRoadmapCompilerRequest`, `buildRoadmapArtifactFromRequest`,
  `validateRoadmapArtifact`, `importRoadmapArtifact`, and `applyRoadmapArtifact`,
  enabling validate/import loops without external APIs.
- Extended node coverage beyond Backprop-only fallbacks by adding explicit mini-node
  plans for `tokenization`, `transformer`, and `scaling` with dedicated reader paths.
- Added anti-overload behavior in contract decisions and session state (`max
  active sessions: 1`, `max visible choices: 3`, locked reasons/prerequisites,
  recommended next node plus alternatives and why-not rationale).
- Added UI controls to generate a contract payload and apply generated or validated
  sample artifacts directly in the session panel; `todayMission`/`todayArc` now
  update from applied artifact metadata.

Each changelog-worthy change should be updated in the same commit as the work it
describes. Skip this file only when the commit is purely mechanical and does not
change product behavior, product docs, release readiness, or the public product
story.

### Product Presentation Releases

These are preview-oriented product slices, not tagged SemVer releases yet. They
exist to make the public reader story reviewable before production promotion.

#### Presentation Slice 2 - Focused Reader Visual Iteration

- Moved the chosen source-ingestion direction into the real `/web` product
  surface instead of leaving it only in docs prototypes.
- Made `/` the final product route, with `/article-workspace.html` kept only as a
  compatibility redirect.
- Split the deploy surface into static HTML, CSS, and modular browser JavaScript
  so the reader can keep iterating without React, SSR, or a build step.
- Reframed the demo copy as a Sibar manifesto for deep knowledge, source contact,
  and resisting fully summarized consumption.
- Added demo-only color marks for highlight, question, and idea so the first read
  shows the capture language without creating saved notes.
- Refined saved-note UX with a header count, temporary save toast, slide-out
  drawer, click-outside dismissal, reader scroll lock, and shortcut hint.

#### Presentation Slice 1 - Public Reader Foundation

- Created the isolated `/web` deploy surface for the article reader, including
  static HTML and the self-contained `/api/read` Vercel Function.
- Added public URL extraction with validation, private-network blocking,
  bounded fetch behavior, response limits, and short server cache controls.
- Added browser-local reader persistence for notes and recent reading history
  without login or profile-backed storage.
- Added aggregate-only Vercel Web Analytics boundaries for the public reader.
- Added regression coverage for the web deploy surface, reader UI contracts,
  duplicate URL recovery, history filtering, analytics privacy, and API guards.

### Added

- Added typed live workspace contracts in the current runtime/Swift slice:
  `live_workspace` render contracts for start/submit, the submitted attempt
  contract, attempt evaluation contract, and `ui_reproduction` contract, including
  Swift decoding plus contract tests for round-trip validation.
- Live Deep Ownership Workspace sessions that inventory repo evidence, include
  source-control context, run the project-learning agent through Codex CLI
  `auto`, and expose a `sibi explain` command for starting the A-Z project
  explanation flow.
- Local workspace sidecar endpoints and UI controls for starting a live session,
  rendering LLM-cited concepts/artifacts, and submitting attempts back to the
  runtime instead of hardcoded browser fixtures.
- Browser early access signup for the public reader, backed by a server-side
  waitlist endpoint that collects only email plus optional X handle without
  exposing Supabase secrets to the client.
- Spec-based versioning policy for deciding when Sibi moves between pre-1.0
  versions.
- Changelog source of truth for future web-facing product progress updates.
- Swift `SibiCore` process bridge for the five foundation TypeScript runtime
  commands, with tests and no shell/UI state ownership.
- F06 runtime `generate_practice_challenges` command that turns detected learning
  gaps into evidence-backed repair practice with revisit timing.
- F08 runtime `readiness_report` command that exports evidence-backed readiness
  reports as JSON and Markdown.
- Standalone SwiftUI `SibiStudyApp` host for live runtime-owned study panel
  snapshots and answer submission.
- Floating `NSPanel` study surface with collapsible mode and Graph + Code canvas
  rendered from runtime-owned snapshots.
- Local article workspace prototype for URL-based reader extraction, atomic
  highlight capture, and per-article notes stored in the browser.
- Isolated `/web` deploy surface for the article workspace, with static HTML and
  a self-contained Vercel `/api/read` function.
- Vercel Web Analytics page-view tracking for the article workspace, limited to
  aggregate page analytics.
- First self-hosted freeform evaluator slice for artifact-boundary ownership
  answers, with CLI/report output for readiness, evidence, flow, false-confidence,
  and design-induced findings.

### Changed

- Article workspace note capture now uses tab-style note kinds and supports
  keyboard capture with Tab and Command/Control+Enter.
- Article workspace URL reads now use server-side cache, public URL validation,
  request limits, fetch timeouts, and bounded response size for public launch.
- Article workspace now opens repeated article URLs from local browser state with a
  visible saved-state flash before making another server request.
- Article workspace now includes a local recent-reading drawer for reopening the
  last articles and their saved notes.
- Article workspace reader state is now browser-local for the public demo:
  `localStorage` persistence, no export button, and a capped Learning Log.
- Article workspace now opens with a clearer reader presentation around
  evidence-first learning and atomic notes.
- Article workspace demo files moved from `docs/demo` into root-level `/web`
  so the public reader can deploy without the TypeScript runtime or sidecar.
- Web reader now serves from `/` in the deploy surface, with the public HTML,
  styles, and browser behavior split across `web/index.html`, `web/styles`, and
  `web/scripts` for product iteration.
- Web reader now applies the focused source-ingestion visual direction to the
  real `/web` product surface instead of leaving it only in docs prototypes.

### Fixed

- Article workspace presentation copy now lives outside the selectable reader
  article, so only article text participates in highlight capture.
- Article workspace desktop layout now keeps the reader, session drawer, and
  Learning Log as independent scroll areas.
- Article workspace history now excludes local demo articles and prunes any
  previously saved non-web entries.
- StudyShell now treats an active live workspace session as the exclusive panel
  surface so `StudyPanelView` and the “No Study Session” fallback do not render
  underneath it.

### Docs

- Added the Deep Ownership Workspace spec pack, including UI component
  references for Sibi Lens, Sibi Lab, code workbench, derivation, patch
  readiness, and repo overview artifacts.
- Added the Sibi Lens and Sibi Lab UI iteration with minimalist surface
  variations for command capture, artifact work, derivation, patch readiness,
  and repo ownership overview.
- Added the web reader source-ingestion iteration with focused-reader mockups
  and a functional coded prototype for first open, loading, reading, and saved
  states.
- Added the self-hosted SDD loop, clarifying foundation specs, executable MVP
  specs, harness artifacts, living-spec sections, and the first freeform answer
  evaluator iteration target.
- Replaced the external prototype review-tooling standard with a repo-owned
  prototype rule for local routes, product UI, fixtures, and static captures.
- Added the public demo prototype spec that packages the self-hosted execution
  layer into a fixture-based web demo for external feedback.
- Added release readiness rules tied to completed specs, verified acceptance
  criteria, and explicit version bump decisions.
- Added the atomic commit to changelog bridge so agents know when a commit must
  update `CHANGELOG.md`.
- Added the Swift bridge candidate audit, narrowing the future native bridge to
  the five foundation runtime commands and keeping TypeScript as state owner.
- Updated the self-hosted evaluation contract with first freeform evaluator slice
  results, coverage status, and the next expansion target.
- Documented article reader persistence sequencing: use browser-local notes
  first, treat `localStorage` as a bridge, and wait for profiles before
  durable cross-device note memory.
- Added article reader analytics research covering Vercel Analytics, cookie
  expectations, consent boundaries, and future observer events.

### Internal

- Added regression coverage and a saved report for the first five self-hosted
  freeform evaluator cases.

## Release Format

Each release should use this shape:

```md
## v0.1.0 - YYYY-MM-DD

Short product narrative: what became true for the user in this release.

### Added

- New user-facing capabilities.

### Changed

- Changes to existing behavior.

### Fixed

- Bug fixes.

### Docs

- Product, spec, or README changes.

### Internal

- Tooling, tests, refactors, and maintenance work.
```

Do not invent release dates. Move entries from `Unreleased` into a versioned
section only when that version is accepted and tagged.
