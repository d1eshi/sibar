---
intent: spec
status: active
phase: v0.1
summary: "Replace the study app WindowGroup with an NSPanel surface and Graph + Code canvas."
head: false
priority: high
instructions: []
implements: ["F12"]
depends_on: ["F11"]
feeds: []
related: ["docs/specs/10_study_panel_ui.md", "docs/missions/sibi-v01-build-to-learn/library/ui-contract.md"]
layers: ["ui", "swift"]
owns: ["Package.swift", "src/runtime-study-panel.ts", "Sources/SibiCore", "Sources/SibiStudyApp", "Sources/SibiStudyShellKit", "Tests/SibiCoreTests", "Tests/SibiStudyShellKitTests", "Tests/study-panel.test.ts"]
---

# Iteration 15: NSPanel Study Surface

## Goal

Make the product app behave like a native floating study companion instead of a
normal SwiftUI `WindowGroup` app.

## Scope

- Replace the product `WindowGroup` with an accessory AppKit host.
- Add a floating nonactivating study `NSPanel`.
- Add a collapsible pill state using the same panel.
- Add a separate resizable Graph + Code canvas `NSPanel`.
- Extend `StudyPanelSnapshot` with optional `active_code_selection` only as a
  render aid from TypeScript-owned runtime state.

## Non-Goals

- No observer.
- No OCR, spotlight, screen capture, or permission flows.
- No old `RuntimeReviewPlan`.
- No Swift-side graph inference, file reading, queueing, memory, readiness, or
  pedagogy logic.
- No hybrid debug window in the product path.

## Expected Behavior

- `swift run SibiStudyApp` launches an accessory app and opens one floating
  study panel.
- The study panel can refresh, pause/live poll, submit answers, and open Canvas.
- `Command-M` collapses/restores the panel without minimizing to Dock.
- Canvas shows concept graph nodes/edges and a code/evidence preview from the
  current `StudyPanelSnapshot`.
- Swift decodes and renders runtime data only.

## Verification Checklist

- [ ] `swift build` passes.
- [ ] `swift test` passes.
- [ ] `npm test` passes.
- [ ] `npm run typecheck` passes.
- [ ] Panel controller tests cover NSPanel configuration, reuse, collapse, and canvas.
- [ ] Runtime tests cover `active_code_selection` present and absent.
