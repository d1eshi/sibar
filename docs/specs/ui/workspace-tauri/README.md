# Workspace Tauri UI

This directory owns the direct Tauri workspace prototype UI.

Its implementation direction is governed by the cross-cutting UI technology
architecture in `../01_ui_technology_architecture.md` (React + TypeScript + Vite,
Rust/Tauri native boundary, CSS Modules + tokens, static-first behavior).

The active product goal is not a web dashboard in a desktop frame. It is a
native-feeling workspace home that gives the user continuity, then opens into a
bounded create flow, study-path overview, and focused active learning node.

## Canonical Specs

1. `00_source_map.md`
2. `05_workspace_home.md`
3. `01_onboarding_workspace_intent.md`
4. `02_workspace_study_surface.md`
5. `03_iteration_flow.md`
6. `04_react_migration_plan.md`

## Current Prototype

Code:

- `apps/sibar-research-workspace/index.html`
- `apps/sibar-research-workspace/styles/base.css`
- `apps/sibar-research-workspace/styles/workspace.css`

Reference captures:

- `assets/prototype-onboarding-current.png`
- `assets/prototype-workspace-current.png`

Generated references:

- `assets/onboarding-native-reference.png`
- `assets/workspace-path-reference.png`
- `assets/workspace-source-reference.png`
