# F10 Study Panel UI Handoff

## Summary

Implemented F10 as a runtime-owned `StudyPanelSnapshot` projection plus a Swift
bridge and reusable SwiftUI study panel surface. Swift decodes and renders
runtime data only; pedagogy, memory, practice, and readiness decisions remain in
TypeScript runtime modules.

Implementation commit: `6909674` (`feat(ui): add study panel snapshot bridge`)

Repo path: `/Users/d1eshi/projects/startup/sibar`

## Changed Files

- `src/runtime-study-panel.ts` - new `getStudyPanelStateCommand` projection for artifact boundary, concept graph, active autopsy step, current question, gaps, practice, memory, readiness, and evidence drawer data.
- `src/runtime.ts` - registered `get_study_panel_state`.
- `src/runtime-support.ts` - added command name to runtime command union.
- `src/runtime-readiness.ts` - exported existing readiness builder so the study panel can project readiness without duplicating logic.
- `Sources/SibiCore/RuntimeModels.swift` - added `StudyPanelStatePayload`.
- `Sources/SibiCore/RuntimeClient.swift` - added `getStudyPanelState`.
- `Sources/SibiCore/StudyPanelModels.swift` - added Codable snapshot bridge models.
- `Sources/SibiCore/StudyPanelView.swift` - added reusable SwiftUI panel and render model.
- `Tests/study-panel.test.ts` - added runtime snapshot tests for full and empty panel states.
- `Tests/SibiCoreTests/StudyPanelTests.swift` - added Swift decode/client/render model tests.
- `Package.swift` - included new Swift source and test files.

## Line Counts

```text
384 src/runtime.ts
373 src/runtime-support.ts
118 src/runtime-study-panel.ts
355 src/runtime-readiness.ts
154 Tests/study-panel.test.ts
232 Sources/SibiCore/RuntimeModels.swift
220 Sources/SibiCore/RuntimeClient.swift
280 Sources/SibiCore/StudyPanelModels.swift
185 Sources/SibiCore/StudyPanelView.swift
261 Tests/SibiCoreTests/RuntimeClientTests.swift
287 Tests/SibiCoreTests/StudyPanelTests.swift
31 Package.swift
```

## Verification

Commands run:

```text
node --test --experimental-strip-types Tests/study-panel.test.ts
swift test --filter StudyPanelTests
wc -l src/runtime.ts src/runtime-support.ts src/runtime-study-panel.ts src/runtime-readiness.ts Tests/study-panel.test.ts Sources/SibiCore/RuntimeModels.swift Sources/SibiCore/RuntimeClient.swift Sources/SibiCore/StudyPanelModels.swift Sources/SibiCore/StudyPanelView.swift Tests/SibiCoreTests/RuntimeClientTests.swift Tests/SibiCoreTests/StudyPanelTests.swift Package.swift
npm test
npm run typecheck
swift test
git diff --check
```

Results:

- Focused runtime study panel tests: passed, 2 tests.
- Focused Swift study panel tests: passed, 2 tests.
- `npm test`: passed, 37 tests.
- `npm run typecheck`: passed.
- `swift test`: passed, 14 tests.
- `git diff --check`: passed.

## Fixture And Manual Evidence

Fixture evidence:

- Runtime fixture creates a bounded artifact session, concept graph, active
  autopsy step, answer-derived gap, practice challenge, readiness report, and
  verifies `get_study_panel_state` returns every required panel region.
- Empty fixture verifies explicit empty states for concept graph, autopsy step,
  questions, gaps, practice, and memory.
- Swift fixture decodes a complete `StudyPanelSnapshot` and verifies the render
  model exposes all required regions: artifact boundary, concept map, autopsy,
  evidence, gaps/practice, and memory/readiness.

Manual evidence gap:

- No standalone app target or AppKit host exists in this package, so no manual
  window screenshot was recorded. The reusable SwiftUI `StudyPanelView` compiles
  in `SibiCore`, and fixture render model tests cover the panel surface without
  hidden runtime state.

## Left Undone

- No changes to `features.json`, per instruction.
- No live macOS panel host, screenshot harness, or app integration was added.
- No changelog update; this slice is mission-internal and the required narrative
  evidence is this handoff.
