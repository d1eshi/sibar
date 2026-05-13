# Standalone Swift App Audit

## Source of Truth

This audit extends the Swift bridge audit after the runtime grew from the five
foundation commands into the current Build-to-Learn study loop.

The moat remains the TypeScript runtime:

1. artifact sessions
2. bounded evidence and code selections
3. attempt-first questions
4. answer evidence
5. gaps and misconceptions
6. practice challenges
7. understanding memory
8. readiness reports
9. study panel snapshot projection

Swift is valuable as the native surface. It should host the study loop, call the
runtime, and render data. It should not own runtime state.

## Current Runtime Contract

The standalone app needs only two live commands for this slice:

| Swift action | Runtime command | State owner |
|---|---|---|
| Load or refresh the study panel | `get_study_panel_state` | TypeScript |
| Submit an answer | `answer_question` | TypeScript |

Answer submission does not return a `StudyPanelSnapshot`. The app submits the
answer through `answer_question`, then asks `get_study_panel_state` for the next
visible snapshot.

The existing Swift bridge already supports the earlier foundation commands:

1. `declare_intent`
2. `prepare_code_question`
3. `generate_questions`
4. `answer_question`
5. `get_session_summary`

The study panel command is the product-facing projection that lets Swift render
artifact, session, question, evidence, gap, memory, practice, and readiness state
without reimplementing any of it.

## Swift Source Audit

| Area | Decision | Reason |
|---|---|---|
| `SibiCore/RuntimeClient.swift` | Keep | Process bridge, envelope decoding, runtime path resolution, and command dispatch are still the right boundary. |
| `SibiCore/RuntimeModels.swift` | Adapt | Models must track the current runtime payloads, including `RuntimeQuestion.max_followups`. |
| `SibiCore/StudyPanelModels.swift` | Keep | Codable snapshot models are the UI contract for the current moat. |
| `SibiCore/StudyPanelView.swift` | Adapt | The reusable panel is correct, but the standalone app needs visible artifact/session/question identity. |
| `StudyPanelLiveModel.swift` | Add | This is the smallest bridge between the runtime process and a live SwiftUI window. |
| `SibiStudyApp` | Add | The app host is necessary to move from test/render model evidence to an actual user surface. |
| `SibiShell`, `SibiShellKit`, overlay, spotlight, AppKit shell | Later | Useful native mechanics, but they add observer and permission scope before the study loop is stable. |

## Copy / Adapt Decision

Copied or added now:

1. `Package.swift` executable product and target.
2. `Sources/SibiCore/StudyPanelLiveModel.swift`.
3. `Sources/SibiStudyApp/SibiStudyApp.swift`.
4. Tests for live refresh and answer submission through injected runtime actions.

Adapted now:

1. `RuntimeQuestion` decodes `max_followups`.
2. `StudyPanelRenderModel` exposes artifact session id, runtime session id, and
   question id in the rendered rows.

Not copied now:

1. `SibiShell`
2. `SibiShellKit`
3. overlay controllers
4. spotlight controllers
5. OCR or screen capture code
6. AppKit accessory app behavior
7. old notes, reading, review-plan, or shell-specific workflows

## Boundary Rule

Swift may own:

1. window lifecycle
2. controls and layout
3. transient loading/error UI state
4. runtime process calls
5. decoded render data
6. simple refresh polling as a UI concern, with runtime calls off the main actor

Swift must not own:

1. artifact session storage
2. question generation
3. answer quality inference
4. learning gap detection
5. practice queue scheduling
6. understanding memory
7. readiness evaluation
8. model trace validation

Queues, memory, readiness, and system state remain TypeScript runtime concerns,
or future Rust runtime concerns if the runtime is split later.

## Verification

Completed checks:

```text
swift build
swift test
npm test
npm run typecheck
```

Acceptance evidence:

1. `SibiStudyApp` builds as a standalone executable.
2. `StudyPanelLiveModel` requests snapshots through `get_study_panel_state`.
3. `StudyPanelLiveModel` submits answers through `answer_question`.
4. Swift tests prove payload trimming, refresh after answer, and runtime-owned
   snapshot loading through injected actions.
5. Runtime process calls are dispatched off the main actor.
6. TypeScript tests still pass, proving the UI slice did not move or duplicate
   runtime behavior.
