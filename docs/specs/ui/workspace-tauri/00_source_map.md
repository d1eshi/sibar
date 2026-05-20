# Workspace Tauri UI Source Map

## Purpose

Track the existing UI specs and reports that feed the Tauri workspace surface,
then reduce them into the canonical specs in this directory.

## Canonical Inputs

1. `docs/specs/deep-ownership-workspace/03_ui_product_surface.md`
   Source for the workspace-as-lab model: left boundary/source rail, central
   artifact canvas, right loop rail, bottom evidence rail.
2. `docs/specs/deep-ownership-workspace/12_ui_reference_components.md`
   Source for visual grammar and reusable shell components.
3. `docs/specs/deep-ownership-workspace/14_workspace_intent_flow.md`
   Source for create-workspace onboarding and the `WorkspaceIntent ->
   WorkspacePlan -> SessionPlan -> EvidencePlan` sequence.
4. `docs/specs/deep-ownership-workspace/18_workspace_ui_reproducibility.md`
   Source for deterministic projection, visible 2-3 next actions, locked nodes,
   and evidence requirements.
5. `docs/specs/deep-ownership-workspace/19_workspace_trace_contract_gate.md`
   Source for workspace history, intent attempts, failed/blocked creation
   traces, resume behavior, and the durable state that `Workspace Home`
   summarizes.
6. `docs/reports/2026-05-20-sibar-research-workspace-ui-ux-report.md`
   Source for the current static Tauri prototype diagnosis and redesign
   principles.
7. `docs/reports/2026-05-19-sibar-tauri-second-app-plan.md`
   Historical pointer to the second Tauri app plan.
8. `docs/specs/10_study_panel_ui.md`
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
7. The active-session viewport prioritizes the current study node, next action,
   evidence, and readiness.
8. Primary next actions are capped at three: Read, Build, Recall.
9. The guide is bounded by modes. It is not an infinite chat column.
10. Compiler payloads and low-level debug controls stay collapsed unless the
   user is in an implementation/debug surface.
11. Evidence remains visible as proof of mastery, but it does not dominate the
   first view.

## Pending Extraction

1. Convert the Lab component library from `12_ui_reference_components.md` into
   concrete Tauri screen components only when the current prototype needs them.
2. Add a deterministic `WorkspaceHomeProjection` before relying on hand-authored
   home cards as production resume/history state.
3. Add a deterministic `WorkspaceUiProjection` adapter before relying on the
   current hand-authored session cards as production navigation.
4. Decide whether the older Swift `StudyPanelSnapshot` remains a separate Lens
   surface or is only historical context for Tauri.
