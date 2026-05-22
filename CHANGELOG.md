# Changelog

All notable product changes for Sibi should be recorded here.

This changelog is written for humans first. It follows the spirit of Keep a
Changelog and uses SemVer-style versions, but Sibi version bumps are decided by
accepted specs and iterations, not by raw commit count.

## Unreleased

Use this section for changes that have landed but are not part of a tagged
release yet.

### Docs - Attempt Readiness Prototype Pruning

- Removed obsolete attempt-readiness prototype artifacts and generated visual
  assets so future worktree creation does not need to carry stale binary deletes.

### Changed - Public Web Landing

- Reworked the public index into a two-section editorial manifesto poster:
  hero plus ownership artifacts, matching the paper/rules/red-annotation
  direction for Sibi cognitive debt.
- Added three Sibi landing prototypes (`html`, `html2`, `html3`) exploring a
  direct diff interaction, an editorial cognitive-debt ledger, and a dark
  ownership ceremony flow.
- Renamed the landing stylesheet from `reader.css` to `main.css` and made the
  public index use the product-interaction prototype direction.
- Reframed the public landing around Sibi as an ownership engine for
  AI-generated software, centered on cognitive debt, demonstrated ownership, and
  the Diff Ownership Review wedge.
- Replaced workspace-oriented copy and preview with a manifest, ownership
  boundary map, diff evidence surface, attempt diagnosis loop, and ownership
  quality metrics.

### Docs - Deep Ownership Workspace North Star

- Added a current north-star entrypoint for the source-driven MVP:
  URL/pasted source plus one user reason -> source signals -> MissionPreview ->
  Mission Brief -> Focused Track Queue -> Active Session.
- Reorganized the deep ownership spec README into current MVP, runtime contract,
  foundation reference, and historical/superseded reading paths.
- Marked older broad Tauri/workspace-intent notes as historical/reference so
  they do not compete with `Mission -> Track -> Session -> Artifact` product
  hierarchy.
- Updated open decisions and implementation plan to make the frontier lab
  source fixture the first MVP path and keep Sibi-repo ownership as internal
  regression context.

### Added - Slice Final Sibi Ownership-Review Wedge

- Converted `sibi/src/ownershipReview.ts` into a direct re-export shim of
  `src/ownership-core/diff-review.ts` to keep Sibi and core review contracts in
  parity by default.
- Updated `sibi/README.md` and added `sibi/docs/ownership-wedge.md` to document
  the wedge flow (input, goal, gaps, evidence/tests, read path, status),
  added explicit LLM/runtime split, and specified the future claim-verifier
  contract direction.
- Clarified that this slice still avoids any direct `WorkspaceIntent` /
  PedagogoAI adapter dependency and intentionally does not wire
  `Open Sibar session`.

### Docs - Deep Ownership Workspace Pruning

- Pruned `docs/specs/deep-ownership-workspace/` from the pre-consolidation spec
  pack to the canonical spec set anchored by README, current north star,
  source-to-mission MVP, runtime boundary, and validation/plan.
- Consolidated mission/track/session/artifact, source-intent ingestion, focused
  queues, runtime boundaries, trace requirements, validation assertions, and
  implementation order into the new canonical docs.
- Updated UI specs, reports, and tests to point at the canonical docs instead of
  deleted pre-consolidation specs.

### Docs - Shared Core Boundaries

- Added a shared core boundary spec for separating Sibi ownership review, Sibar
  Workspace, ownership-core, pedagogy-core, memory-core, adapters, and surfaces.
- Documented global gates for ownership, pedagogy, readiness, repair, memory,
  and model-output validation so new features do not bypass the core.
- Added a sequential implementation plan that starts with entrypoint wrappers
  and shims before any destructive poda or duplicate taxonomy.
- Added a deterministic shared core boundary eval that guards core imports,
  Sibi workspace separation, and required global gate declarations.

### Added - Slice 2 Shared Core Entrypoints

- Added `src/ownership-core/index.ts` as a minimal ownership boundary shim with
  copyable contract types and explicit extraction-ownership metadata.
- Added `src/pedagogy-core/index.ts` as a deterministic facade over existing
  pedagogy runtime contracts and functions.
- Added `src/memory-core/index.ts` with an append-only `MemoryStore`, subject and
  evidence/attempt/gap/repair/review/transfer/artifact/event structures, and pure
  helper functions for immutable updates.
- Added `Tests/shared-core-entrypoints.test.ts` to validate entrypoint availability,
  append-only behavior for memory helpers, and boundary-surface independence.

### Added - Slice 3 Memory Core Invariants

- Added pure consistency checks for `MemoryStore` in `src/memory-core/index.ts`
  (`getMemoryStoreProblems` + `validateMemoryStore`), including subject,
  attempt, gap, and transfer reference invariants.
- Added `Tests/memory-core.test.ts` with happy-path, missing-subject, missing-
  attempt, missing-gap, missing-transfer-subject, and append-only behavior coverage.
- Kept `memory-core` append helpers pure and unchanged at API boundaries while adding
  explicit traceability validation before persistence or runtime-store integration.

### Added - Slice 4 Ownership Review Deterministic Core Extraction

- Extracted `sibi/src/ownershipReview.ts` heuristics into
  `src/ownership-core/diff-review.ts` as a deterministic, import-safe core module
  with unchanged `reviewOwnership` behavior and typed outputs.
- Added ownership review exports to `src/ownership-core/index.ts` and updated
  `OWNERSHIP_REVIEW_EXTRACTION_STATE.status` to `available`, with `ownedBySlice`
  set to `slice-4`.
- Added `Tests/ownership-core.test.ts` and updated `Tests/sibi-ownership-review.test.ts`
  for direct core coverage plus core/Sibi review parity on representative diffs.

### Docs - Tauri Workspace UI Specs

- Added mission-track study specs for the frontier lab readiness flow, including
  `Mission -> Track -> Session -> Artifact` vocabulary, focused track queues,
  source-map separation, prerequisite routing, artifact recommendation, and
  explicit path mutation proposals.
- Added source-intent ingestion MVP specs for creating a mission preview from a
  URL or pasted source plus one user reason, including source signal extraction,
  review-before-create, and source-to-mission UI behavior.
- Split `docs/specs/ui/` into `web/` and `workspace-tauri/` as the UI source of
  truth for public web surfaces and the direct Tauri workspace prototype.
- Added `Workspace Home` as the canonical default Tauri entry screen so existing
  workspaces, pending sessions, blocked intents, and resume paths are visible
  before creating more work.
- Updated the workspace UI flow to separate global home, create-workspace
  onboarding, workspace study-path overview, and active learning node actions.
- Added source maps that extract dispersed UI decisions from older specs,
  reports, product docs, and prototypes.
- Moved generated workspace UI references under
  `docs/specs/ui/workspace-tauri/assets/`.

### Changed - Public Web Landing

- Refined the public landing visual system toward a premium, minimal research
  workspace feel, with a more neutral palette, compact hero instrumentation,
  polished static workspace preview, and clearer generated-artifact narrative.
- Replaced the public `web/` first page with a one-page creative landing that
  embeds a three-panel Sibar workspace demo, a strong product headline, and a
  simplified early access form.
- Moved the landing interaction to `web/scripts/landing.js`, including clickable
  demo states, a simulated workspace loop, answer-state transitions, and reuse
  of the existing early access API.
- Added local dev-server routing for the early access API so the public landing
  form can be exercised during web development.
- Reframed the landing copy around cognitive debt, durable technical
  understanding, and applying/repeating knowledge across generated or unfamiliar
  software.
- Replaced the explanatory interactive demo block with a static embedded
  workspace preview based on the Tauri research workspace surface.
- Compressed the landing hero into a horizontal cognitive-debt statement so the
  workspace preview appears sooner.
- Reframed the public hero around the current research workspace wedge:
  converting papers and technical research into evidence, artifacts, code,
  formulas, and durable understanding.

### Docs - UI Technology Architecture (Tauri Workspace)

- Added `docs/specs/ui/01_ui_technology_architecture.md` as a transversal UI
  architecture spec for the Tauri workspace.
- Added `docs/specs/ui/workspace-tauri/04_react_migration_plan.md` to translate
  the static Tauri prototype into React by flow slices.
- Declared React + TypeScript + Vite as the UI baseline with CSS Modules plus
  tokens as the initial styling strategy.
- Clarified the Rust/Tauri native boundary and that runner/sidecar/runtime
  effects are out-of-scope for UI specs (handoff to deep-ownership execution and
  adapter specs).
- Added static-first, bounded-state, and component-boundary constraints to avoid
  "AI slop," including file-size limits and component-boundary rules.

### Changed - Tauri Workspace UI Prototype

- Refined the static Tauri workspace prototype toward a native two-surface flow:
  compact workspace-intent onboarding followed by a focused study workspace.
- Removed user-facing `Read / Build / Recall` choice buttons from the active
  session flow. Workspace overview now uses a single selected-node/session open
  action, and active session renders the selected node material surface directly
  by typed render mode.
- Added typed material-mode projection for active node views (`paper`, `note`,
  `artifact`, `code`, `equation`, `math`, and `fallback`) and surfaced recall as
  a guidance/review status instead of a primary action.
- Implemented the runtime entry as `Workspace Home` (static first), with simple
  fixtures for existing workspaces (`Embeddings`, `RAG`, `JAX`) and action routing:
  `New workspace`, `Open`, and `Resume` to either study-path overview or active
  learning-material session.
- Reworked the workspace home layout to fit the Tauri desktop viewport as a
  single-screen workspace surface, with compact header and side-by-side resume
  panels instead of a long scrolling page.
- Matched the workspace home to the generated visual reference with a dedicated
  continue column, compact workspace rows, readiness meters, and local-data
  footer treatment.
- Reworked the active node session into a viewport-bounded reader layout:
  study path rail, material/source tree, central scrollable reader canvas, and
  compact guide/readiness rail.

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

### Added - Source Mission Runtime Contracts (MVP)

- Added source-to-mission contract definitions in
  `src/runtime-source-mission-contracts.ts`:
  `SourceIntentInput`, `SourceIntakeResult`, `SourceSignal`, `MissionPreview`,
  `ProposedTrack`, and `ProposedSession`.
- Added pure validators in `src/runtime-source-mission-validate.ts` for the same
  contract chain: source intent/input kinds, intake status/diagnostics, signal
  integrity, and mission preview invariants (`first_sessions` cap, track/session
  references, and source-backed references).
- Added `Tests/source-mission-contracts.test.ts` covering frontier-lab valid payload,
  missing `user_reason`, bad URL, non-referenced sessions/tracks, unknown track
  IDs, first-session cap, and blocked-source diagnostics.

- Corrected the MVP contract shape to match the canonical source-driven boundary:
  signal and mission confidence became categorical (`low|medium|high`), `SourceIntakeResult`
  now exposes canonical fields directly (`source_id`, `source_kind`, text refs),
  and `MissionPreview.first_sessions` now carries session objects.

### Added - Sibi Ownership Review Wedge

- Added `sibi/`, a Vite/React app for pasted AI-generated diffs, PR text, or
  agent output that returns a deterministic `OwnershipReview` before merge.
- Added local heuristics for touched files, additions/deletions, risky areas,
  missing evidence, ownership questions, suggested tests, minimum read path, and
  `blocked | limited | ready` merge posture.
- Added root `sibi:dev` and `sibi:build` scripts plus unit coverage for the
  deterministic review logic.

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
- Added a root-level Workspace Plan Adapter eval catalog that groups eval
  intent, fixtures, and generated reports by the WorkspacePlan adapter boundary,
  identifying Workspace Intent, Rust fixture, and `codex-exec` adapter coverage.
- Moved attempt-readiness eval manifests, gold cases, mastery checks, generated
  reports, and prototypes out of the legacy self-host docs spec tree into `evals/` and
  `prototypes/` so the self-hosted pilot docs stay Markdown-only.
- Added a declarative `evals/index.json` and per-suite `eval-suite.json`
  manifests plus `pnpm eval:catalog` so agents can discover eval purpose,
  fixtures, commands, and generated reports from the repo root.
- Added `VAL-EVAL-010-workspace-runner-adapter` for offline runner adapter
  checks across Rust fixture execution, missing-fixture fallback, and blocked
  Codex command metadata.
- Added `VAL-EVAL-011-workspace-model-io-boundary` for provider-neutral
  CandidatePlan parsing across direct JSON, envelopes, logged stdout,
  malformed output, invalid candidates, and unknown adapter rejection.
- Added `evals/pedagogy-layers/` with the migrated deterministic pedagogy
  dataset, report outputs, and `VAL-EVAL-012-pedagogy-coverage` for semantic
  coverage across L1-L5, answer classes, gap labels, operations, evidence
  conditions, and loop stages.
- Added `VAL-EVAL-013-pedagogy-core-coverage` to directly exercise the real
  `src/pedagogy` layer, question, signal, and pipeline modules without LLM
  calls.
- Moved deep ownership workspace fixtures and pedagogy eval docs under `evals/`
  so `docs/` no longer owns operational eval, fixture, or report paths.
- Documented that `pnpm eval:pedagogy-coverage` is fail-closed by default and
  requires `--allow-coverage-gaps` for exploratory report-only runs.

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

### Added - Workspace React Slice 0

- Added a React + TypeScript + Vite bootstrap for the Tauri workspace app in
  `apps/sibar-research-workspace` with `workspace:dev`, `workspace:build`, and
  `workspace:preview` scripts.
- Replaced the legacy HTML monolith with a React mount and a static onboarding
  screen (native topbar, intent fields, preview rail/column) rendered from
  `apps/sibar-research-workspace/src/main.tsx` and `src/App.tsx`.
- Added global style entry and CSS module styles for the slice-0 viewport while
  keeping legacy scripts/CSS untouched for later migration slices.

### Changed - Tauri Workspace Onboarding (Slice 1)

- Reworked the React onboarding screen into an interactive flow with controlled
  intent/source/constraint inputs and optional background fields.
- Added local deterministic preview generation on `Review workspace plan` from the
  current inputs, and a clear local transition state when `Open workspace`
  is pressed.

### Changed - Tauri Workspace Shell (Slice 2)

- Extracted the native topbar into a dedicated `WorkspaceShell` boundary.

### Changed - Tauri Workspace Active Session

- Aligned the React `Active Node Session` screen with the Workspace Overview /
  Study Path visual language, including the editorial study panel, path rail,
  Read / Build / Recall action cards, source evidence, and guide/readiness rail.
- Promoted shared workspace color, typography, radius, and shadow values into
  reusable CSS tokens for the onboarding, overview, and session surfaces.
- Added reducer-backed workspace session UI state for selected node, mini-node,
  source, and active action (`Read`/`Build`/`Recall`) with a compact
  readiness panel visibility flag.
- Reworked the workspace overview between onboarding and the active session into
  the study-path reference layout: left learning rail, current-study center,
  source evidence, tutor guidance, and readiness before entering a node.
- Added the static active-session workspace view composed of `WorkspaceShell`,
  `StudyPathRail`, and `SessionWorkbench`.
- Hooked onboarding to open the workspace overview after local preview
  generation, with no fetch/Tauri/runner integrations in this slice.

### Changed - Tauri Workspace Onboarding Layout

- Reworked the onboarding surface to run full-width/full-height instead of inside
  a centered fake desktop window.
- Removed the fake macOS chrome and top toolbar from the Tauri workspace shell.
- Simplified the onboarding preview title so user intent stays inside the plan
  body instead of becoming an oversized, wrapping headline.

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
- Updated tests and spec pack references for the then-current Tauri workspace
  source docs; those pre-consolidation specs were later pruned into the canonical
  deep ownership spec set.

### Internal - Deep Ownership Workspace Modularization

- Refactored the monolithic `research-workspace.js` into focused modules
  (`workspace-data`, `workspace-utils`, `workspace-study-plans`,
  `workspace-contract`, `workspace-session`, `workspace-render`, and
  `workspace-app`) while keeping the facade API and behavior stable.

### Docs - Deep Ownership Workspace Rust Execution Specs

- Added lightweight pre-consolidation Rust-native Deep Ownership Workspace specs
  for compiler, adapter, execution, and reproducibility behavior. These were
  later consolidated into the canonical runtime boundary doc.
- Updated the deep ownership README reading order to reference the then-current
  spec sequence and ensure stable implementation handoff.

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
  `evals/deep-ownership-workspace/fixtures/live-workspace-session.json`
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
- Mapped all six major UI regions to the then-current reference component
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

- Treated the pre-consolidation deep ownership workspace notes as the source
  specs for the second sibling Sibar app in Tauri (`workspace investigador`),
  including:
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
