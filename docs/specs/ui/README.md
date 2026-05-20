# Sibar UI Specs

This directory is the source of truth for product UI iteration. It collects the
UI decisions that were previously spread across foundation specs, reports,
iteration notes, and prototypes.

## Surfaces

### Transversal UI Specs

- `01_ui_technology_architecture.md` - cross-cutting UI technology and boundary
  architecture for the Tauri desktop workspace.

1. `web/`
   Public web surface: landing, public demo, reader/source-ingestion moments,
   and deployable narrative prototypes.
2. `workspace-tauri/`
   Direct Tauri workspace surface: workspace home, workspace-intent onboarding,
   study-path overview, active learning node, bounded guide, evidence ledger,
   and visual iteration references.

## Rules

1. New UI iteration starts here before touching app code.
2. Specs in this directory describe screen flow and product behavior, not
   runtime pedagogy internals.
3. Historical docs may stay where they are, but each active UI decision should
   be summarized or linked from one of these surface directories.
4. Generated mockups and screenshots are references, not final truth. The spec
   text owns the intended flow.
5. Keep the first viewport focused. Sibar should not introduce feature overload
   just because the runtime can produce more state.

## Current Canonical Flow

```text
web
  -> explain Sibar publicly
  -> show one fixture-backed demo
  -> collect feedback

workspace-tauri
  -> show existing workspaces, pending sessions, and blocked/draft intents
  -> create a new bounded workspace from intent when requested
  -> open the selected workspace study path
  -> enter one active learning node material surface
  -> migrate the static prototype to React by flow slices
  -> guide readiness and follow-up status
  -> show evidence and readiness quietly
```

## Source Map

Use the per-surface source maps when extracting older UI notes:

- `web/00_source_map.md`
- `workspace-tauri/00_source_map.md`
