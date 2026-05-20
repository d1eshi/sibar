# Sibar UI Specs

This directory is the single UI spec home for the Tauri workspace prototype.
It owns product-facing screen decisions for the desktop surface. Runtime,
pedagogy, compiler, and readiness contracts remain in their existing specs.

## Active Screens

1. `01_onboarding_workspace_intent.md`
2. `02_workspace_study_surface.md`

## Principles

1. The app must feel like a native workspace, not a web page inside a window.
2. Onboarding asks for one bounded study/build intent and source context.
3. The workspace shows one active session, one study path, and one bounded guide.
4. The user should see at most three next actions: Read, Build, Recall.
5. Evidence is visible as proof of learning, but it must not dominate the first
   view.
6. Advanced compiler/debug controls can exist, but they stay subordinate to the
   active session.

## Visual References

- `assets/onboarding-native-reference.png`
- `assets/workspace-path-reference.png`
- `assets/workspace-source-reference.png`

These are generated UI references, not implementation screenshots. The
prototype should borrow their structure and restraint, not their sample content.
