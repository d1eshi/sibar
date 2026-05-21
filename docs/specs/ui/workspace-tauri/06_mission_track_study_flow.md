# UI Spec 06: Mission Track Study Flow

## Goal

Define the Tauri UI flow for mission-based study without exposing a long
documentation sidebar as the primary navigation.

This spec applies to the frontier lab readiness use case:

```text
Home
  -> Mission Brief
  -> Focused Track Queue
  -> Active Session
  -> Artifact Evidence
```

## Product Principle

The UI should not ask the user to choose from a hundred documentation topics.

It should show:

1. why this mission exists,
2. what the next focused session is,
3. what source slice supports it,
4. what artifact the session expects,
5. what unlocks the next step.

The complete source outline is available as a secondary `Source Map`, not as the
main study path.

## Entry Flow

The app opens to `Workspace Home`.

For the frontier lab mission, the home card should show:

1. mission title,
2. source origin,
3. user goal,
4. next session,
5. readiness status,
6. primary action: `Review mission`.

Selecting the mission opens a `Mission Brief`, not an active session.

## Mission Brief Screen

The brief answers:

1. "Why am I seeing this?"
2. "What did Sibi infer from the source and conversation?"
3. "What am I trying to become able to do?"
4. "What tracks exist?"
5. "What artifacts will count as progress?"

Required regions:

1. mission context,
2. source origin,
3. selected tracks,
4. next recommended track,
5. artifact expectations,
6. open action: `Open track`.

No left study rail is required on this screen.

## Focused Track Queue

A track screen shows only a small queue.

Recommended sections:

1. `Now`
2. `Next`
3. `Later`
4. `Locked / prerequisite`

The screen must not render a full source topic tree by default.

Each visible session should show:

1. title,
2. source slice,
3. operation,
4. recommended artifact,
5. unlock or return condition,
6. status.

The primary action opens the current session.

## Source Map

The source map is an advanced view for reviewing the underlying source
structure.

It may show many topics from docs such as JAX resources, guides, and references,
but it must be visually and behaviorally distinct from the focused track queue.

Source map actions:

1. inspect source topic,
2. request a new session from a selected source slice,
3. compare source topic to current track,
4. return to focused queue.

The source map does not decide readiness by itself.

## Active Session Screen

The active session is focused on one operation.

Required regions:

1. session header with why-this-matters copy,
2. source slice reader,
3. expected artifact area,
4. attempt-first prompt,
5. evidence/readiness status,
6. path mutation actions.

Path mutation actions:

1. `Too easy`
2. `Too hard`
3. `Make a session from selection`
4. `Change artifact`

These actions do not instantly rewrite the track. They open a bounded proposal
state governed by `21_curated_track_pedagogy_contract.md`.

## Artifact Choice UI

The primary UI should show the recommended artifact for the session.

Secondary action:

```text
Add artifact
```

When opened, the choice UI must group artifact types:

1. recommended,
2. optional,
3. not useful for this session.

Each option needs a one-line reason. The UI should avoid a generic grid of
document types.

## Overwhelm Guardrails

1. No persistent 100-topic sidebar in the default track screen.
2. No full source map until the user requests it.
3. No unrestricted artifact generator as a primary action.
4. No mission-to-session skip without a mission brief.
5. No readiness claim without a scoped operation and evidence.
6. No silent path rewrite after user feedback.

## Acceptance

1. The user can understand why the frontier lab mission exists before entering a
   session.
2. The JAX docs source can contain many topics while the visible track queue
   remains small.
3. `JAX memories and host offloading` can be opened as one focused session with
   a recommended artifact.
4. The user can request a smaller prerequisite session from a confusing source
   slice.
5. The UI explains whether a proposed artifact is recommended, optional, or not
   useful.
6. Advanced source exploration does not replace the curated queue.
