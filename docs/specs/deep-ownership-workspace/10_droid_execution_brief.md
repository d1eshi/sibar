# 10: Droid Execution Brief

## Objective

Implement the first visible Deep Ownership Workspace slice for Sibi.

The implementation must prove that Sibi can turn this repo into a bounded,
evidence-backed, attempt-first ownership loop with a generated thinking
artifact and a scoped readiness result.

## Source Of Truth

Read this directory first:

```text
docs/specs/deep-ownership-workspace/
```

Then read:

1. `docs/product/00_foundation.md`
2. `docs/product/01_moat.md`
3. `docs/specs/README.md`
4. `docs/specs/01_artifact_intake.md`
5. `docs/specs/02_concept_graph.md`
6. `docs/specs/03_learning_autopsy.md`
7. `docs/specs/05_gap_and_misconception_detection.md`
8. `docs/specs/08_readiness_export.md`
9. `docs/specs/10_study_panel_ui.md`

## First Slice

Build the morning slice:

```text
Given this repo and a goal about understanding Sibi's pedagogy runtime,
render a local Workspace prototype that shows:
  - artifact boundary
  - concept slice
  - generated code/flow artifact
  - attempt-first prompt
  - evidence panel
  - sample weak attempt
  - gap/readiness result
  - repair action
```

## In Scope

1. docs/spec fixture
2. local static prototype
3. deterministic fixture data
4. evidence citations from existing repo files
5. attempt-first UI state
6. gap/readiness display
7. manual review note

## Out Of Scope

1. full Tauri app
2. full Swift Lens
3. VS Code extension
4. full repo indexing
5. product-code mutation
6. model runner integration
7. long-term database migration
8. full AI/RL research artifact support

## Recommended Files To Add

```text
docs/specs/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json
docs/specs/deep-ownership-workspace/prototypes/morning-workspace/index.html
docs/specs/deep-ownership-workspace/prototypes/morning-workspace/styles.css
docs/specs/deep-ownership-workspace/prototypes/morning-workspace/app.js
docs/specs/deep-ownership-workspace/prototypes/morning-workspace/fixture.js
docs/specs/deep-ownership-workspace/prototypes/morning-workspace/review-note.md
```

## UX Requirements

The prototype must have:

1. left rail for boundary and concept slices
2. center canvas for code slice and flow artifact
3. right rail for active operation and attempt composer
4. bottom rail for evidence citations
5. result state showing gap/readiness after attempt
6. no answer-first explanation

## Data Requirements

The fixture must include:

1. `DeepOwnershipLoop`
2. `ArtifactBoundary`
3. `ConceptSlice`
4. at least one `ThinkingArtifact`
5. at least one `UserOperation`
6. one sample `UserAttempt`
7. one `EvidenceCheck`
8. one `OwnershipGap`
9. one `RepairAction`
10. one `ReadinessClaim`

## Validation

Fulfill these assertions first:

1. `VAL-DEMO-001`
2. `VAL-DEMO-002`
3. `VAL-UI-001`
4. `VAL-ARTIFACT-001`
5. `VAL-PED-001`
6. `VAL-PED-003`

## Handoff Requirements

The implementation handoff must include:

1. files added or changed
2. how to open the prototype
3. what validation assertions are satisfied
4. what remains unimplemented
5. screenshots or manual observations if UI changed
6. commands run
7. any open decisions discovered

## Quality Bar

The prototype is successful if a human can look at it and understand:

1. what Sibi is helping them own
2. which artifact slice is in scope
3. what operation they must perform
4. what evidence is available
5. why their attempt is partial or blocked
6. what repair action comes next

The prototype fails if it looks like a generic chat UI, a passive explainer, or
a decorative diagram with no evidence.

