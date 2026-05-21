# UI Spec 05: Workspace Home

## Goal

Render the default returning-user entry point for the Tauri workspace.

`/` is not onboarding, not a study path, and not an active session. It is the
place where the user understands what already exists, what can be resumed, what
failed or needs more context, and how to create the next bounded workspace.

## Moat Alignment

The product moat is durable technical understanding, not workspace generation by
itself. A technical workspace only helps if the user can see continuity:

1. what they started,
2. what was completed,
3. what is pending,
4. what evidence exists,
5. what needs repair or more context,
6. what can be resumed next.

The home screen must therefore expose tracking without becoming a generic
analytics dashboard. It should summarize the understanding memory and trace
state that matter for the next decision.

## Required Flow

1. The app opens to `Workspace Home`.
2. Existing workspaces are listed with progress, source boundary, next session,
   and last meaningful status.
3. Pending sessions can be resumed directly.
4. Draft, blocked, or failed workspace intents are visible enough to retry or
   dismiss later.
5. `New workspace` opens the workspace-intent creation flow.
6. Selecting a workspace opens the workspace study-path overview.
7. Resuming a specific session opens the active learning node.

## UI Contract

The first viewport should prioritize:

1. **Continue** - one or two pending sessions with explicit next actions.
2. **Workspaces** - persistent workspace objects such as `RAG`,
   `JAX tutorials`, or `Embeddings`.
3. **Needs context / drafts** - failed or blocked intent attempts when present.
4. **New workspace** - a compact entry point into the intent flow.

Each workspace item should show:

1. title,
2. short objective,
3. source or artifact boundary,
4. progress such as `2 of 5 nodes`,
5. next node or session,
6. last evidence/readiness status,
7. primary action: `Resume` or `Open`.

## What Does Not Belong Here

1. No `Study Path` rail.
2. No `Read / Build / Recall` action row.
3. No tutor rail.
4. No raw compiler payloads.
5. No broad marketing hero.
6. No dashboard metric grid.
7. No full workspace tree unless the user opens a workspace.

## Empty State

If there are no workspaces, `/` still renders `Workspace Home`. The empty state
explains that no bounded workspaces exist yet and offers `New workspace`.

The app must not silently skip to onboarding unless a future product decision
explicitly makes first-run onboarding a separate mode.

## Static-First Projection

The first implementation may use a local fixture:

```text
WorkspaceHomeProjection
  workspaces[]
  pending_sessions[]
  intent_attempts[]
  last_opened_workspace_id?
```

Later, the projection should be loaded from the trace and workspace history
contracts. The UI may consume the projection, but it must not define persistence
or runner behavior.

Relevant non-UI contracts:

1. `docs/specs/deep-ownership-workspace/02_runtime_boundary.md`
2. `docs/specs/deep-ownership-workspace/03_validation_and_plan.md`

## Acceptance

1. Opening the app with existing workspaces answers "where do I continue?"
   before asking the user to create another workspace.
2. Creating a workspace is visible but not the only first action.
3. Existing workspaces look persistent, not like generated cards with no memory.
4. Failed or blocked intent attempts are not hidden.
5. The screen reinforces the Build-to-Learn moat: durable understanding,
   evidence, pending repair, and readiness over generic productivity metrics.
