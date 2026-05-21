# 09: Implementation Plan

## Goal

Define a concrete implementation sequence for the Deep Ownership Workspace.

The plan favors a visible morning prototype and a real architecture path.

## Guiding Principle

Build the smallest real loop that proves the product:

```text
this repo
  -> bounded concept slice
  -> generated thinking artifact
  -> attempt-first UI
  -> evidence-backed gap/readiness
```

Do not start with:

1. a full IDE
2. a full Tauri app
3. a full VS Code extension
4. a whole-repo mastery claim
5. a general tutoring platform

## Phase 0: Spec Acceptance

Outcome:

The spec pack exists and can be used as a persistent implementation source.

Tasks:

1. Review this directory.
2. Decide whether `Deep Ownership Workspace` is the accepted internal name.
3. Decide whether the first UI label is `Sibi Workspace` or `Sibi Lab`.
4. Decide whether the first implementation is a repo-owned web prototype.

Verification:

1. spec files exist
2. open decisions are listed
3. implementation slices can be derived from `08_validation_contract.md`

## Phase 1: Deep Ownership Fixture

Outcome:

A deterministic fixture describes one loop over this Sibi repo.

Recommended path:

```text
evals/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json
```

Fixture content:

1. user goal
2. artifact boundary
3. evidence inventory
4. concept slice
5. code slice artifact
6. flow diagram artifact
7. active operation
8. sample weak attempt
9. evidence check
10. detected gap
11. repair action
12. readiness state

First concept slice:

```text
Trace how Sibi converts a partial user answer into a learning gap and readiness
limitation.
```

Likely evidence:

1. `src/runtime-gap-detection.ts`
2. `src/runtime-readiness.ts`
3. `src/runtime-practice.ts`
4. `src/runtime-memory.ts`
5. `Tests/gap-detection.test.ts`
6. `Tests/readiness-report.test.ts`

Verification:

1. fixture validates against a lightweight schema
2. every artifact evidence ref has path and line/excerpt
3. readiness is scoped

## Phase 2: Local Workspace Prototype

Outcome:

A local web prototype renders the fixture.

Recommended path:

```text
docs/specs/deep-ownership-workspace/prototypes/morning-workspace/
```

Files:

1. `index.html`
2. `styles.css`
3. `app.js`
4. `fixture.js`
5. optional screenshot

UI requirements:

1. left boundary/concepts rail
2. center artifact canvas
3. right attempt-first loop panel
4. bottom evidence panel
5. hidden solution state
6. gap/readiness state after sample attempt

Verification:

1. open `index.html` locally
2. inspect UI at desktop width
3. optional screenshot under prototype folder
4. no package dependency needed

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

## Morning Build Order

If the goal is to have something visible by morning:

1. Create fixture.
2. Create static Workspace prototype.
3. Render one code slice and one diagram/table.
4. Add attempt-first interaction.
5. Add sample gap/readiness result.
6. Write a manual review note.

This is more valuable than starting a desktop shell first.
