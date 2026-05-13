---
intent: spec
status: active
phase: v0.1
summary: "Host the runtime-owned study panel in a standalone SwiftUI app."
head: false
priority: high
instructions: []
implements: ["F11"]
depends_on: ["F10"]
feeds: []
related: ["docs/specs/10_study_panel_ui.md", "docs/missions/sibi-v01-build-to-learn/library/ui-contract.md", "docs/triage/standalone-swift-app-audit.md"]
layers: ["ui", "swift"]
owns: ["Package.swift", "Sources/SibiCore/StudyPanelLiveModel.swift", "Sources/SibiStudyApp", "Tests/SibiCoreTests/StudyPanelTests.swift"]
---

# Iteration 14: Standalone Study App

## Goal

Turn the reusable Swift study panel into a standalone macOS app that can show
runtime-owned artifact sessions and learning state while the user studies.

## Parent Docs

- Mission: `docs/missions/sibi-v01-build-to-learn/mission.md`
- Validation: `VAL-UI-001`, `VAL-UI-002`, `VAL-UI-003`
- UI contract: `docs/missions/sibi-v01-build-to-learn/library/ui-contract.md`
- Product spec: `docs/specs/10_study_panel_ui.md`

## Scope

- Add a Swift executable app target that hosts `StudyPanelView`.
- Add a small live model that calls `get_study_panel_state` and `answer_question`.
- Show the active artifact session id and runtime session/question identity in the panel surface.
- Poll the TypeScript runtime for fresh study panel snapshots.
- Keep TypeScript as the owner of artifact sessions, questions, evidence, gaps,
  memory, readiness, and practice queues.

## Non-Goals

- No Swift-owned queues, memory, readiness, practice scheduling, or pedagogy logic.
- No observer, OCR, screen capture, spotlight, overlay, or AppKit shell in this slice.
- No Swift persistence beyond transient view state.
- No copy of `SibiShell`, `SibiShellKit`, or old shell workflows.

## Expected Behavior

- The app launches as `SibiStudyApp`.
- A blank artifact session field asks the runtime for the current artifact session.
- An explicit artifact session id scopes the runtime snapshot request.
- The app can refresh manually or poll periodically.
- Answer submission calls `answer_question` and reloads the runtime snapshot.
- Swift renders returned data only.
- Runtime process calls run off the main actor so polling does not become
  Swift-owned scheduling or block the UI loop.

## Verification Checklist

- [x] `swift build` passes.
- [x] `swift test` passes.
- [x] `npm test` passes.
- [x] `npm run typecheck` passes.
- [x] Code review confirms Swift remains a process bridge and UI host only.
