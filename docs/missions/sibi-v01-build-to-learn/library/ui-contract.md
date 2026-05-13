# Study Panel UI Contract

## Purpose

The study panel makes the Build-to-Learn loop visible. It should answer:

1. What artifact am I studying?
2. Which concept or flow am I looking at?
3. What evidence is Sibi using?
4. What am I being asked before the explanation?
5. What gap or repair task came from my answer?
6. What am I ready to inspect, explain, modify, or own?

## First Surface

The first UI surface is a Swift panel using `SibiCore`. It is manual and
runtime-driven:

- no observer
- no OCR
- no voice
- no screen capture
- no background filesystem watcher
- no Swift-owned pedagogy state

## Standalone Host

The first standalone host is `SibiStudyApp`. It wraps the reusable
`StudyPanelView` with `StudyPanelLiveModel` and calls the runtime for live data:

- `get_study_panel_state` loads the current or selected artifact session
- `answer_question` persists answer evidence and learning updates
- manual refresh and polling reload returned snapshots
- Swift keeps only transient loading, error, and input state

This host is still not the observer. It does not copy `SibiShell`, overlay,
spotlight, OCR, screen capture, or AppKit permission flows.

## Required Panel Regions

- Artifact boundary: root, includes, excludes, learning goal, confidence.
- Concept map: compact list of concepts and one selected flow.
- Autopsy card: bounded evidence, prompt, answer composer, hint/explanation state.
- Evidence drawer: file/range citations and answer evidence.
- Gap and practice queue: current gaps, suspected misconceptions, repair tasks.
- Memory and readiness: concept states, next review, readiness report summary.

## StudyPanelSnapshot

The runtime should expose a snapshot that the Swift panel can render directly:

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

## Reuse Rules

- Components render data by contract, not by hidden runtime queries.
- Empty states must be explicit and actionable.
- Any action that changes learning state calls a runtime command.
- Panel state must be testable with fixtures before live runtime wiring.
- The standalone app may poll the runtime, but queues, memory, readiness, and
  practice scheduling remain runtime-owned.
