# UI Spec 07: Source To Mission Intake

## Goal

Define the first MVP UI for creating a mission from a URL or pasted source plus a
short user reason.

This replaces a heavy first-run onboarding form for the source-driven prototype.

## Flow

```text
Home
  -> Source Intake
  -> Mission Preview
  -> Review / Edit
  -> Mission Brief
  -> Focused Track Queue
```

## Source Intake Screen

Required fields:

1. source URL or pasted text,
2. why this source matters to me.

Optional field:

1. what I want to become able to do.

Primary action:

```text
Preview mission
```

The UI should feel like the user is giving Sibi context, not filling out a
formal course builder.

## Mission Preview Screen

The preview must show:

1. inferred mission title,
2. user goal,
3. source summary,
4. extracted source signals,
5. proposed tracks,
6. first 3-5 sessions,
7. deferred items,
8. open questions.

Primary action:

```text
Create mission
```

Secondary actions:

1. edit goal,
2. remove a track,
3. choose a different first session,
4. inspect source map,
5. ask why this was included.

## Source Signals UI

Source signals should be visible before mission creation.

Example for the frontier lab source:

1. `JAX tutorials` - resource
2. `Scaling book` - resource
3. `Code a roughly 10M transformer` - exercise
4. `Derive Chinchilla laws for dense vs MoE` - exercise
5. `Write a Pallas kernel` - exercise
6. `Kernel work` - skill area
7. `Agent work` - skill area

Each signal should show whether it came directly from the source or was inferred
from source plus user reason.

## Review Behavior

The user can edit the preview before creating the mission.

Edits must be stored as user decisions, not overwritten by the next compile.

Examples:

1. User removes `Agent work` from the first MVP path.
2. User makes `JAX foundations` the first track.
3. User marks `Pallas kernel` as later.
4. User changes mission title from `Frontier Lab Readiness` to
   `Build Public Frontier Lab Evidence`.

## Overwhelm Guardrails

1. Do not show the full source map on the first intake screen.
2. Do not create a 30-session path before review.
3. Do not show a nested course tree.
4. Do not use generic artifact buttons before a session is selected.
5. Do not hide uncertain extraction behind a confident-looking plan.

## Acceptance

1. A user can paste a URL and one sentence of reason, then see a mission preview.
2. The preview distinguishes extracted source signals from selected tracks.
3. The user can create a mission without completing the old multi-field
   workspace intent form.
4. The created mission opens to a mission brief, not directly to an active
   session.
5. The full source map remains accessible but secondary.
