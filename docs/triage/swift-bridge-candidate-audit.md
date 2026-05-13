# Swift Bridge Candidate Audit

This document is the audit artifact required by `docs/iterations/03_swift_bridge_candidate_audit.md`.

## Source of truth

The runtime moat audit is accepted as the bridge input:

1. TypeScript owns session, question, answer evidence, signal history, and summaries.
2. Swift is a future native surface only.
3. The first bridge must target only the trimmed v0.1 foundation command set.
4. The first Swift copy is limited to `SibiCore`, not shell/UI.

## Current runtime verification

Verified from `/Users/d1eshi/projects/startup/sibar` while writing and implementing this audit:

| Check | Result |
|---|---|
| `git status --short --branch` | Clean `main` before edits. |
| `npm test` | Pass, 5 tests. |
| `npm run typecheck` | Pass. |
| `swift test` | Pass, 12 tests. |
| STDIO smoke | Pass with `SIBI_RUNTIME_HOME=/tmp/sibi-runtime-swift-bridge-audit`. |

STDIO smoke covered:

1. `declare_intent`
2. `prepare_code_question`
3. `generate_questions`
4. `answer_question`
5. `get_session_summary`
6. persisted answer evidence in `runtime-state.json`

## Bridge contract

The bridge should stay thin:

```text
Swift UI later
  -> Codable command payloads
  -> RuntimeClient process call
  -> TypeScript runtime owns session/question/evidence state
  -> Swift renders returned data only
```

Swift must not persist runtime state, infer answer quality, generate questions, mutate concept memory directly, or reimplement command behavior. It sends JSON over stdin and decodes the runtime envelope from stdout.

## Swift-facing command set

The first Swift bridge should expose exactly these public methods:

| Swift method | Runtime command | Classification | Decision |
|---|---|---|---|
| `declareIntent` | `declare_intent` | foundation | Keep. |
| `prepareCodeQuestion` | `prepare_code_question` | foundation | Keep. |
| `generateQuestions` | `generate_questions` | foundation | Keep. |
| `answerQuestion` | `answer_question` | foundation | Keep. |
| `getSessionSummary` | `get_session_summary` | supporting | Keep for rendering/export. |

Explicitly exclude from the first bridge:

1. `captureResource`
2. `prepareReadingQuestion`
3. `prepareCodeReview`
4. `startNote`
5. `appendNote`
6. `getActiveNote`
7. `listNotes`
8. shell, UI, AppKit, overlay, spotlight, OCR, and app bundle behavior

`prepare_reading_question` remains out of the first bridge even though it was previously useful, because the runtime moat audit keeps v0.1 anchored on code artifacts first.

## Candidate file audit

Audited source candidates from `sibar-agent`:

1. `Sources/SibiCore/RuntimeClient.swift`
2. `Sources/SibiCore/RuntimeModels.swift`
3. `Tests/SibiCoreTests/RuntimeClientTests.swift`

| Candidate | Keep | Adapt | Drop |
|---|---|---|---|
| `RuntimeClient.swift` | `ProcessResult`, `ProcessRunning`, `SystemProcessRunner`, runtime envelope send/decode path, runtime path resolution, `RuntimeClientError` | Public method list must shrink to the five foundation commands. Runtime path tests should remove `SibiShell` naming. | `EmptyPayload`, methods for resource capture, notes, reading question, code review. |
| `RuntimeModels.swift` | command envelope, error payload, operation state, declared intent, signal, code selection, foundation payload/result models | `RuntimeQuestion` should include `detected_layer` and `required_layer`; `RuntimeSessionSummary` should remove `reading_selection` and `review_plan` from the first bridge model. | resource, note, reading, review-plan, reviewed-file, highlighted-range, and non-foundation result models. |
| `RuntimeClientTests.swift` | stub runner, success envelope decode, runtime error decode, `prepare_code_question` send/decode shape, runtime path resolution | Add command-string tests for all five foundation methods; update sample payloads to TypeScript/code-artifact examples; remove old shell app path naming. | tests for notes, reading question, code review, resource capture, shell launch, UI, AppKit, overlay, spotlight. |

## Implemented bridge copy

Copied and adapted into `/Users/d1eshi/projects/startup/sibar`:

1. `Package.swift`
2. `Sources/SibiCore/RuntimeClient.swift`
3. `Sources/SibiCore/RuntimeModels.swift`
4. `Tests/SibiCoreTests/RuntimeClientTests.swift`

Implementation decisions:

1. Package name is `sibi`.
2. Only the `SibiCore` library target exists.
3. No executable, shell, AppKit, SwiftUI, overlay, spotlight, OCR, or permission target was copied.
4. `RuntimeClient` exposes only the five foundation runtime methods.
5. `RuntimeModels` includes only foundation payload/result/shared models.
6. `RuntimeQuestion` includes `detected_layer` and `required_layer`, matching the TypeScript runtime.
7. Runtime path resolution remains available through `SIBI_RUNTIME_PATH`, `SIBI_REPO_ROOT`, bundle resources, cwd, or ancestor search for `src/runtime.ts`.
8. Swift tests include a real process call into `src/runtime.ts`, not only stubbed envelope decoding.
9. `.build/` and `.swiftpm/` are ignored in git.

## Model surface for future bridge implementation

The future Swift bridge should model only this surface.

Payloads:

| Payload | Fields |
|---|---|
| `DeclareIntentPayload` | `project_label`, `project_path?`, `statement`, `uncertainty`, `expected_work_area?`, `desired_help` defaulting to `generate_questions`. |
| `PrepareCodeQuestionPayload` | `project_label`, `project_path?`, `file_path`, `start_line`, `end_line?`. |
| `GenerateQuestionsPayload` | `session_id?`. |
| `AnswerQuestionPayload` | `session_id?`, `question_id`, `answer`, `answer_quality?`. |
| `SessionSummaryPayload` | `session_id?`. |

Results:

| Result | Fields |
|---|---|
| `DeclareIntentResult` | `session_id`, `declared_intent`, `operation_state`. |
| `PrepareCodeQuestionResult` | `session_id`, `selection`, `question`, `operation_state`. |
| `GenerateQuestionsResult` | `session_id`, `questions`, `learning_signals`, `operation_state`. |
| `AnswerQuestionResult` | `session_id`, `question`, `session_summary`, `operation_state`. |
| `SessionSummaryResult` | `session_summary`, `operation_state`. |

Shared models to preserve:

1. `RuntimeCommandRequest`
2. `RuntimeEnvelope`
3. `RuntimeErrorPayload`
4. `RuntimeOperationState`
5. `RuntimeDeclaredIntent`
6. `RuntimeSignal`
7. `RuntimeQuestion`
8. `RuntimeCodeSelection`
9. `RuntimeSessionSummary`

`RuntimeQuestion` should preserve `detected_layer` and `required_layer` because the TypeScript foundation runtime returns them and they are useful for later readiness rendering.

## Local files copied for this bridge slice

The bridge slice has now copied and adapted only these local files:

1. `Package.swift`
2. `Sources/SibiCore/RuntimeClient.swift`
3. `Sources/SibiCore/RuntimeModels.swift`
4. `Tests/SibiCoreTests/RuntimeClientTests.swift`

Do not copy `SibiShell`, `SibiShellKit`, `ShellView`, overlay controllers, spotlight controllers, app bundle scripts, AppKit shell code, SwiftUI shell tests, OCR behavior, or permission flows until the shell audit below is satisfied.

## Future Swift tests

The bridge implementation now proves:

1. successful runtime envelope decoding
2. runtime error envelope decoding
3. each of the five foundation methods sends the exact runtime command string
4. `PrepareCodeQuestionResult` decodes `RuntimeCodeSelection` and `RuntimeQuestion`
5. `RuntimeQuestion` decodes `detected_layer` and `required_layer`
6. `AnswerQuestionResult` decodes the answered question and session summary
7. `SessionSummaryResult` decodes `code_selection`
8. runtime path resolves through `SIBI_RUNTIME_PATH`
9. runtime path can resolve repo `src/runtime.ts` without `SibiShell` assumptions

Do not carry forward tests for notes, reading, review plan, resource capture, shell launch, AppKit, overlay, spotlight, or UI into `SibiCore`.

## ShellKit / panel / observer audit

The source shell code is useful, but it is not safe to copy as-is after the runtime trim.

| Source area | Current behavior | Decision |
|---|---|---|
| `ShellViewModel` | Calls notes, reading, code review plan, answer submission, session summary, and spotlight. | Adapt later. Keep only intent/code-question/answer/summary flow first. |
| `ShellView` | Three modes: note, code review, reading. Uses visible text for workflow explanation and old sidecar language. | Adapt later. First panel should be code artifact loop only. |
| `OverlayPanelController` | Creates floating/collapsible panel and separate code review canvas keyed to `RuntimeReviewPlan`. | Partially keep later. Panel mechanics are useful; code review canvas must be rebuilt around `RuntimeCodeSelection` + `RuntimeQuestion`. |
| `CodeSpotlightController` | Performs screen capture + Vision OCR and draws highlight overlay. | Later. This is Swift-owned process/UI inference, but requires permission handling and should not block the first bridge. |
| `AppDelegate` / `SibiShell` | Launches accessory app and shows overlay. | Later. Needed for a native app, not for bridge correctness. |

Next Swift UI slice should copy/adapt `SibiShellKit` only after creating a narrow shell spec. The minimum shell should:

1. render a floating panel
2. call `prepareCodeQuestion`
3. render the returned question and code selection
4. call `answerQuestion`
5. call `getSessionSummary`
6. never implement queues, memory, readiness, question generation, or persistence in Swift

Queue, memory, readiness, scheduling, artifact maps, concept extraction, and system state must remain in TypeScript or a future Rust runtime.

## Decision

`RuntimeClient` can remain a process bridge. It should be smaller, not smarter.

## Standalone App Follow-Up

After the first study panel runtime projection landed, the useful Swift surface
expanded from the five foundation commands to the visible Build-to-Learn loop.
The standalone app slice is captured in `docs/triage/standalone-swift-app-audit.md`.

The bridge decision still holds:

1. Swift owns the window, controls, transient loading/error state, and process calls.
2. TypeScript owns artifact sessions, question/evidence state, gaps, practice,
   memory, readiness, and study panel projection.
3. `SibiStudyApp` may call `get_study_panel_state` and `answer_question`.
4. F12 adapts only AppKit panel mechanics; `SibiShell`, spotlight, OCR, screen
   capture, and AppKit permission flows remain excluded.

The bridge implementation slice is now complete for `SibiCore`. The next Swift slice, if chosen, should:

1. keep F12 panel mechanics tied to `StudyPanelSnapshot`
2. exclude notes, reading, code-review-plan, OCR spotlight, and AppKit permission flows until separately audited
3. keep TypeScript as the state owner
4. run Swift tests without launching UI

The alternative next product slice remains `Foundation memory + readiness skeleton`, as recommended by the runtime moat audit. Choose the Swift bridge implementation only if a native surface is needed immediately.
