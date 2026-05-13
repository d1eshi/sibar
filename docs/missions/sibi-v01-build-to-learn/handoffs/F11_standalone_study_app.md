# F11 Standalone Study App Handoff

## Summary

Implemented the first standalone SwiftUI app host for the Build-to-Learn study
panel. The app renders `StudyPanelSnapshot` data from the TypeScript runtime,
refreshes live, and submits answers back through `answer_question` before
reloading visible state through `get_study_panel_state`.

Swift remains a thin native surface. TypeScript still owns artifact sessions,
questions, answer evidence, gaps, memory, practice, readiness, and study panel
projection.

Implementation commit: `20694c3` (`feat(ui): add standalone study app`)

Repo path: `/Users/d1eshi/projects/startup/sibar`

## Changed Files

- `Package.swift` - added the `SibiStudyApp` executable product and target.
- `Sources/SibiCore/RuntimeModels.swift` - added `RuntimeQuestion.max_followups`.
- `Sources/SibiCore/StudyPanelLiveModel.swift` - added the live runtime-backed panel model.
- `Sources/SibiCore/StudyPanelView.swift` - exposed artifact/session/question identity in rendered sections.
- `Sources/SibiStudyApp/SibiStudyApp.swift` - added the standalone SwiftUI app shell.
- `Tests/SibiCoreTests/StudyPanelTests.swift` - covered live refresh and answer submission.
- `docs/missions/sibi-v01-build-to-learn/iterations/14_standalone_study_app.md` - documented the slice.
- `docs/triage/standalone-swift-app-audit.md` - recorded the copy/adapt/drop audit.
- `docs/missions/sibi-v01-build-to-learn/features.json` - added F11.
- `docs/missions/sibi-v01-build-to-learn/validation-contract.md` - added `VAL-UI-003`.
- `docs/missions/sibi-v01-build-to-learn/library/ui-contract.md` - updated the standalone host contract.
- `docs/specs/10_study_panel_ui.md` - updated required behavior for the standalone live host.
- `CHANGELOG.md` - recorded the user-visible app host.

## Verification

Commands run:

```text
swift build
swift test
npm test
npm run typecheck
git diff --check
```

Results:

- `swift build`: passed.
- `swift test`: passed, 16 tests.
- `npm test`: passed, 37 tests.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- External review: no hard moat-boundary violations found; wording around
  answer reloads and main-actor runtime calls was corrected before commit.

## Left Undone

- No observer, OCR, spotlight, overlay, AppKit accessory shell, or screen capture
  code was copied.
- No Swift-side queues, memory, readiness, practice scheduling, or pedagogy logic
  was added.
- No manual app screenshot was recorded in this slice; the executable builds and
  the live model is covered by unit tests.
