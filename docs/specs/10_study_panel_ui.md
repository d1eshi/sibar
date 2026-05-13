# Spec 10: Study Panel UI

## Goal

Give the user a reusable Swift panel that makes the Build-to-Learn session
visible, then host that panel in a standalone macOS app surface that behaves
like a native study companion.

The panel should show what the user is studying, why Sibi is asking a question,
which evidence is being used, what gap was detected, what practice comes next,
and what the user is ready to do.

## Contract

```text
StudyPanelSnapshot
  artifact_session
  concept_graph
  active_autopsy_step
  active_code_selection
  current_questions
  learning_gaps
  practice_challenges
  memory_summary
  readiness_report
  evidence_index
  operation_state
```

Swift renders `StudyPanelSnapshot`. TypeScript owns the state.

The standalone host may refresh or poll the runtime, but the snapshot remains a
runtime projection.

## Host Behavior

Chosen default: accessory app plus floating nonactivating `NSPanel`.

The previous `WindowGroup` host is acceptable only as development scaffolding.
It is not the product behavior because Sibi should stay near the user's work
without becoming a normal document-style app window.

Options reviewed:

1. accessory `NSPanel`: chosen for v0.1 because it is lightweight, can float
   near code, can collapse, and keeps Swift focused on native surface behavior
2. hybrid debug window: useful later for development, but not implemented in
   the product path
3. normal Dock app with panel: rejected for the first study surface because it
   makes Sibi feel like a separate app instead of an ambient learning surface

Acceptance requires:

1. no primary `WindowGroup` product window
2. app activation policy is accessory
3. expanded study panel is a floating nonactivating `NSPanel`
4. collapsed pill restores the same panel
5. a separate resizable Graph + Code canvas opens only from an explicit action

## Required Behavior

1. The panel shows the artifact boundary and learning goal.
2. The panel shows concept map and selected flow context.
3. The panel shows the active autopsy prompt before any explanation.
4. The panel lets the user submit an answer through the runtime.
5. The panel shows evidence, gaps, repair challenges, memory, and readiness.
6. The panel can render fixture snapshots before live runtime wiring.
7. Swift never implements pedagogy, memory, evals, or readiness logic.
8. The standalone app can load the current or selected artifact session.
9. The standalone app submits answers through `answer_question`, then reloads
   visible state through `get_study_panel_state`.
10. The standalone app opens a Graph + Code canvas from the current runtime
    snapshot.

## First Panel Regions

1. artifact boundary
2. concept map
3. autopsy card
4. answer composer
5. evidence drawer
6. gap and practice queue
7. memory and readiness summary
8. graph and code canvas trigger

## Graph + Code Canvas

The first canvas is a second `NSPanel` that renders data already present in the
runtime snapshot:

1. left side: concept nodes and flow edges from `concept_graph`
2. right side: active `RuntimeCodeSelection` if available
3. fallback: bounded evidence excerpts from the selected concept or edge
4. selecting a concept or edge filters the preview to that item's evidence

The canvas must not use `RuntimeReviewPlan`, OCR, spotlight, screen capture, or
unbounded file reads. If more code context is needed, TypeScript must add it to
`StudyPanelSnapshot`.

## Non-Goals

1. no ambient observer
2. no OCR or spotlight
3. no voice
4. no screen capture
5. no background watcher
6. no Swift-side persistence
7. no Swift-side concept extraction or gap detection
8. no Swift-owned queues, memory, readiness, or practice scheduling
9. no old code-review-plan canvas
10. no Swift-side graph inference

## Verification

The first UI acceptance should prove:

1. a complete dogfood session snapshot renders
2. empty states are explicit
3. mutations call runtime commands
4. Swift tests pass for bridge models
5. code review confirms no Swift-owned pedagogy engine
6. the standalone app target builds
7. the product host is an accessory `NSPanel`, not `WindowGroup`
8. the Graph + Code canvas renders fixture graph and code/evidence data
