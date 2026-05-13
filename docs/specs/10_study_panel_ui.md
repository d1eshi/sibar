# Spec 10: Study Panel UI

## Goal

Give the user a reusable Swift panel that makes the Build-to-Learn session
visible, then host that panel in a standalone macOS app.

The panel should show what the user is studying, why Sibi is asking a question,
which evidence is being used, what gap was detected, what practice comes next,
and what the user is ready to do.

## Contract

```text
StudyPanelSnapshot
  artifact_session
  concept_graph
  active_autopsy_step
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

## First Panel Regions

1. artifact boundary
2. concept map
3. autopsy card
4. answer composer
5. evidence drawer
6. gap and practice queue
7. memory and readiness summary

## Non-Goals

1. no ambient observer
2. no OCR or spotlight
3. no voice
4. no screen capture
5. no background watcher
6. no Swift-side persistence
7. no Swift-side concept extraction or gap detection
8. no Swift-owned queues, memory, readiness, or practice scheduling

## Verification

The first UI acceptance should prove:

1. a complete dogfood session snapshot renders
2. empty states are explicit
3. mutations call runtime commands
4. Swift tests pass for bridge models
5. code review confirms no Swift-owned pedagogy engine
6. the standalone app target builds
