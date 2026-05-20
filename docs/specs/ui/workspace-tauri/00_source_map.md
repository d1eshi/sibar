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
5. `docs/reports/2026-05-20-sibar-research-workspace-ui-ux-report.md`
   Source for the current static Tauri prototype diagnosis and redesign
   principles.
6. `docs/reports/2026-05-19-sibar-tauri-second-app-plan.md`
   Historical pointer to the second Tauri app plan.
7. `docs/specs/10_study_panel_ui.md`
   Source for the older Swift panel contract. Use only when the Tauri workspace
   needs to align with accessory panel behavior.

## Extracted Decisions

1. The first user-facing flow is workspace creation, not a dashboard.
2. Onboarding asks for one bounded intent and source context.
3. The workspace opens into one active session.
4. The first viewport prioritizes the current study node, next action, evidence,
   and readiness.
5. Primary next actions are capped at three: Read, Code, Recall.
6. The guide is bounded by modes. It is not an infinite chat column.
7. Compiler payloads and low-level debug controls stay collapsed unless the
   user is in an implementation/debug surface.
8. Evidence remains visible as proof of mastery, but it does not dominate the
   first view.

## Pending Extraction

1. Convert the Lab component library from `12_ui_reference_components.md` into
   concrete Tauri screen components only when the current prototype needs them.
2. Add a deterministic `WorkspaceUiProjection` adapter before relying on the
   current hand-authored session cards as production navigation.
3. Decide whether the older Swift `StudyPanelSnapshot` remains a separate Lens
   surface or is only historical context for Tauri.
