# Workspace Tauri UI Source Map

## Purpose

Track the existing UI specs and reports that feed the Tauri workspace surface,
then reduce them into the canonical specs in this directory.

## Canonical Inputs

1. `docs/specs/deep-ownership-workspace/00_current_north_star.md`
   Source for the current source-driven mission north and product hierarchy.
2. `docs/specs/deep-ownership-workspace/01_source_to_mission_mvp.md`
   Source for source intake, `MissionPreview`, Mission Brief, Focused Track
   Queue, Active Session, Source Map, and artifact recommendations.
3. `docs/specs/deep-ownership-workspace/02_runtime_boundary.md`
   Source for deterministic projection, visible 2-3 next actions, locked
   sessions, execution jobs, adapter boundary, and trace requirements.
4. `docs/specs/deep-ownership-workspace/03_validation_and_plan.md`
   Source for accepted decisions, validation assertions, and implementation
   order.
5. `docs/reports/2026-05-20-sibar-research-workspace-ui-ux-report.md`
   Source for the current static Tauri prototype diagnosis and redesign
   principles.
6. `docs/reports/2026-05-19-sibar-tauri-second-app-plan.md`
   Historical pointer to the second Tauri app plan.
7. `docs/specs/10_study_panel_ui.md`
   Source for the older Swift panel contract. Use only when the Tauri workspace
   needs to align with accessory panel behavior.

## Extracted Decisions

1. The default user-facing surface is `Workspace Home`, not onboarding and not a
   generic dashboard.
2. `Workspace Home` shows existing workspaces, pending sessions, and
   blocked/draft intent attempts so the user can resume or retry real work.
3. Workspace creation is a requested action from home, not the only first
   experience for returning users.
4. Onboarding asks for one bounded intent and source context.
5. The workspace opens into a workspace study-path overview that shows planned
   learning nodes and available sessions before any node is active.
6. Opening a learning node moves into one active session.
7. The active-session viewport prioritizes the current study node, selected material
   mode/surface, evidence, and readiness.
8. Primary follow-up status is readiness-based (including recall/gap follow-up), not
   a user-chosen `Read` / `Build` / `Recall` action set.
9. The guide is bounded by modes. It is not an infinite chat column.
10. Compiler payloads and low-level debug controls stay collapsed unless the
   user is in an implementation/debug surface.
11. Evidence remains visible as proof of mastery, but it does not dominate the
   first view.

## Pending Extraction

1. Convert the canonical source-driven mission flow into concrete Tauri screen
   components only when the current prototype needs them.
2. Add a deterministic `WorkspaceHomeProjection` before relying on hand-authored
   home cards as production resume/history state.
3. Add a deterministic `WorkspaceUiProjection` adapter before relying on the
   current hand-authored session cards as production navigation.
4. Decide whether the older Swift `StudyPanelSnapshot` remains a separate Lens
   surface or is only historical context for Tauri.
