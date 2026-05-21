# 09: Implementation Plan

## Goal

Define a concrete implementation sequence for the current Deep Ownership
Workspace MVP.

The plan favors a source-driven visible prototype and a real architecture path.

## Guiding Principle

Build the smallest real loop that proves the product:

```text
URL or pasted source + one user reason
  -> explicit source signals
  -> reviewable MissionPreview
  -> Mission Brief
  -> Focused Track Queue
  -> Active Session
  -> artifact evidence
  -> scoped readiness
```

Do not start with:

1. a full IDE
2. a full Tauri app
3. a full VS Code extension
4. a whole-repo mastery claim
5. a general tutoring platform
6. a full documentation/source sidebar as primary navigation
7. fully automatic curriculum generation from one source

## Phase 0: Spec Acceptance

Outcome:

The spec pack exists and can be used as a persistent implementation source.

Tasks:

1. Review this directory.
2. Decide whether `Deep Ownership Workspace` is the accepted internal name.
3. Accept `Mission -> Track -> Session -> Artifact` as the product-facing
   hierarchy for the current MVP.
4. Accept URL/pasted source plus one user reason as the first intake shape.
5. Keep older broad workspace docs as reference, not current MVP authority.

Verification:

1. spec files exist
2. open decisions are listed
3. implementation slices can be derived from `08_validation_contract.md`

## Phase 1: Source-Driven Mission Fixture

Outcome:

A deterministic fixture describes the frontier lab source-intent path without
external LLM execution.

Recommended path:

```text
evals/deep-ownership-workspace/fixtures/frontier-lab-mission-preview.json
```

Fixture content:

1. `SourceIntentInput`
2. source metadata and readable text reference
3. extracted `SourceSignal` records
4. `MissionPreview`
5. proposed tracks
6. first 3-5 sessions
7. recommended artifacts per first session
8. open questions and deferred signals

Required frontier lab source signals:

```text
JAX tutorials
JAX scaling book
roughly 10M parameter transformer in JAX/Flax/Optax
Chinchilla dense-vs-MoE derivation
Pallas kernel work
```

Verification:

1. fixture validates against a lightweight schema
2. every proposed track cites source signals
3. source signals remain distinct from sessions
4. first path is small and reviewable
5. deferred signals remain visible

Legacy note:

The older Sibi-repo ownership fixture remains useful for internal loop
regression, but it is no longer the product-facing first MVP path.

## Phase 2: Source Intake And Mission Preview Prototype

Outcome:

A local UI renders source intake and review-before-create from the fixture.

Recommended path:

```text
apps/sibar-research-workspace/
```

UI requirements:

1. URL or pasted text input
2. one short `why this matters` input
3. `Preview mission` action
4. mission preview with source-backed tracks
5. create action that opens Mission Brief
6. Mission Brief -> Focused Track Queue -> Active Session
7. Source Map available as secondary/advanced view, not the default surface

Verification:

1. UI can render the static frontier lab preview
2. create flow preserves reviewed mission title, user goal, selected track, and
   first session
3. active session shows one operation and artifact expectations
4. no primary documentation sidebar overwhelms the first path

## Phase 3: Runtime Contracts

Outcome:

The TypeScript runtime can produce the first `WorkspaceSnapshot` projection from
existing state or a fixture.

New or extended contracts:

1. `DeepOwnershipLoop`
2. `ThinkingArtifact`
3. `WorkspaceSnapshot`
4. `EvidenceRole`
5. `UserOperation`
6. `ReadinessClaim`

Likely files:

1. `src/runtime-support.ts`
2. `src/runtime-artifact-session.ts`
3. `src/runtime-concept-graph.ts`
4. `src/runtime-study-panel.ts`
5. new `src/runtime-deep-ownership.ts`
6. new tests under `Tests/`

Verification:

1. typecheck
2. runtime tests
3. fixture snapshot test

## Phase 4: Artifact Generator

Outcome:

Sibi can generate at least one code slice artifact and one flow diagram artifact
from a bounded repo slice.

Initial deterministic generation is acceptable. Model-assisted proposals can
come later.

Generator rules:

1. every artifact has evidence
2. hidden solution is separate from visible prompt
3. operation kind is explicit
4. renderer payload is stable

Verification:

1. generated artifact test
2. evidence citation test
3. hidden solution gate test

## Phase 5: Attempt-First Evaluation

Outcome:

The user can submit an attempt against a thinking artifact and receive a typed
gap or scoped readiness result.

Likely reuse:

1. existing gap detection
2. existing readiness report
3. existing practice generation
4. existing memory builder

Needed tightening:

1. user attempt object
2. operation-specific success criteria
3. evidence check result
4. prerequisite route

Verification:

1. freeform answer tests
2. partial/wrong/uncertain/overconfident cases
3. readiness scope tests

## Phase 6: Sibi Workspace App Path

Outcome:

The prototype can graduate into the app surface.

Recommended sequence:

1. Add a static source-intent fixture for the frontier lab readiness example.
2. Render `Home -> Source Intake -> Mission Preview -> Mission Brief`.
3. Render `Mission Brief -> Focused Track Queue -> Active Session`.
4. Keep the full source outline behind an advanced Source Map.
5. Add deterministic readiness gates for the first sessions.
6. Add deterministic artifact recommendations from operation and source type.
7. Add explicit path mutation proposals for "too hard", "too easy", and
   "create a session from this selection".
8. Only then allow model-assisted prerequisite and artifact recommendations.

App graduation sequence:

1. keep web prototype until interaction is clear
2. wrap with Tauri
3. add filesystem bridge
4. add local storage bridge
5. add command bridge for read-only commands
6. keep TypeScript pedagogy authority unless there is a clear reason to move

Verification:

1. app opens local workspace
2. fixture renders
3. local repo can be selected
4. no product mutation occurs

## Phase 7: Sibi Lens

Outcome:

The Swift Lens can show the active loop and open the Workspace.

Likely files:

1. `Sources/SibiStudyShellKit/`
2. `Sources/SibiCore/`

Behavior:

1. show current goal
2. show active operation
3. collect quick attempt
4. show readiness/gap chip
5. open Workspace

Verification:

1. Swift tests
2. fixture snapshot
3. manual panel check

## Phase 8: Editor Adapter

Outcome:

Sibi can open files in the user's existing editor and optionally receive active
selections.

Initial behavior:

1. open file at line
2. copy citation
3. import selected file/range manually

Later:

1. VS Code extension
2. Cursor-compatible path if practical
3. active selection bridge
4. diff bridge

Verification:

1. open-in-editor action payload
2. manual editor launch
3. no dependency on editor for core loop

## Current MVP Build Order

If the goal is to have something visible quickly:

1. Create the static frontier lab source fixture.
2. Render source intake with URL/pasted source plus user reason.
3. Render source signals and mission preview before create.
4. Render Mission Brief -> Focused Track Queue -> Active Session.
5. Show artifact recommendations and readiness scope for the active session.
6. Keep Source Map secondary.
7. Write a manual review note.

This is more valuable than starting a desktop shell first.
