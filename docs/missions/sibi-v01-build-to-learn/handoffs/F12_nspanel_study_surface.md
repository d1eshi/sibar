# F12 NSPanel Study Surface Handoff

## Summary

Implemented F12 by replacing the product `WindowGroup` path with an accessory
AppKit host, a floating nonactivating study `NSPanel`, a collapsed pill mode,
and a separate resizable Graph + Code canvas panel.

The canvas renders only decoded `StudyPanelSnapshot` data. TypeScript still owns
artifact sessions, concept graph construction, active code selection, questions,
evidence, gaps, practice, memory, readiness, and evals.

Implementation commit: `bf56047` (`feat(ui): add nspanel study surface`)

Repo path: `/Users/d1eshi/projects/startup/sibar`

## Changed Files

- `Sources/SibiStudyApp/SibiStudyApp.swift` - replaced `WindowGroup` with an
  accessory app delegate path.
- `Sources/SibiStudyShellKit/` - added AppKit delegate, panel controller,
  root panel view, collapsed pill, and Graph + Code canvas.
- `src/runtime-study-panel.ts` - added optional `active_code_selection`.
- `Sources/SibiCore/StudyPanelModels.swift` - decoded `active_code_selection`.
- `docs/specs/10_study_panel_ui.md` - made `NSPanel` host behavior and canvas
  acceptance explicit.
- `docs/missions/sibi-v01-build-to-learn/iterations/15_nspanel_study_surface.md`
  - recorded the F12 slice.

## Verification

Commands run:

```text
swift build
swift test
npm test
npm run typecheck
git diff --check
node -e "JSON.parse(require('fs').readFileSync('docs/missions/sibi-v01-build-to-learn/features.json','utf8')); console.log('features.json ok')"
```

Results:

- `swift build`: passed.
- `swift test`: passed, 22 tests.
- `npm test`: passed, 37 tests.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- `features.json` parses.

## Left Undone

- No OCR, spotlight, screen capture, observer, app permissions, notes, reading
  mode, or old `RuntimeReviewPlan` canvas was copied.
- No manual screenshot was recorded in this slice.
- Canvas uses runtime-provided `active_code_selection` when available and
  bounded evidence excerpts otherwise; Swift still does not read files directly.
