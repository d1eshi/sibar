# 01: Source To Mission MVP

## Goal

Define the MVP that turns a user-provided source into a reviewable mission and a
small first path.

The user can provide:

1. a URL,
2. pasted text,
3. selected source text,
4. one sentence explaining why the source matters.

Sibi must not require a heavy onboarding form before creating a useful preview.

## Flow

```text
User provides URL/pasted source + reason
  -> Source Intake stores source text and diagnostics
  -> Source Signal Extractor finds explicit goals, resources, exercises, claims
  -> Intent Synthesizer combines signals with user reason
  -> MissionPreview proposes mission, tracks, source map, and first sessions
  -> User reviews/edits
  -> Mission Brief is created
  -> Focused Track Queue opens
  -> Active Session starts
```

The system shows `MissionPreview` before creating a mission. It does not silently
generate a long curriculum from one source.

## Contracts

```text
SourceIntentInput
  id
  source_input { kind: url | pasted_text | selected_text | file, value }
  user_reason
  optional_goal
  optional_constraints
  created_at
```

```text
SourceIntakeResult
  source_id
  source_kind
  canonical_url?
  title?
  author?
  published_at?
  fetched_at?
  raw_text_ref
  readable_text_ref
  extraction_status: completed | partial | blocked | failed
  diagnostics[]
```

```text
SourceSignal
  id
  kind: goal | resource | exercise | claim | skill_area | output | prerequisite
  label
  source_excerpt_ref
  confidence
  user_relevance: explicit | inferred | unknown
```

A `SourceSignal` is not yet a session. It is a source-backed candidate.

```text
MissionPreview
  mission_title
  mission_rationale
  user_goal
  source_summary
  proposed_tracks[]
  source_map
  first_sessions[]
  open_questions[]
  confidence
```

```text
ProposedTrack
  id
  title
  rationale
  source_signals[]
  status: recommended | optional | deferred
```

```text
ProposedSession
  id
  track_id
  title
  source_slice_refs[]
  operation
  recommended_artifacts[]
  prerequisite_note?
  status: now | next | later | locked
```

## Mission Model

A mission is a durable goal with source-backed context and a visible reason for
existing.

A track is a bounded path under a mission. It is not a copied source outline.

A session is the smallest focused learning unit the user can enter. Every
session has:

1. a source slice,
2. an operation the user must perform,
3. one to three expected artifacts,
4. evidence requirements,
5. a completion or return condition,
6. a readiness scope.

An artifact is durable evidence of user or Sibi-assisted work. Allowed artifact
kinds include technical notes, source claim maps, evidence tables, systems
diagrams, code probes, benchmark reports, derivations, recall cards,
implementation sketches, and transfer exercises.

## Focused Queue

The UI shows a curated queue, not a full documentation sidebar.

```text
CuratedTrackQueue
  mission_id
  track_id
  visible_sessions
  deferred_sessions
  locked_sessions
  source_map_ref
  rationale
```

Visible sessions should usually be limited to:

1. current session,
2. one or two next sessions,
3. one recovery or prerequisite option when relevant,
4. one later target for orientation.

The full source outline belongs in Source Map as an advanced/secondary view.

## Artifact Recommendations

Recommended artifacts are operation-scoped:

1. conceptual source slice -> technical note + recall card,
2. system mechanism -> systems diagram + technical note,
3. performance claim -> code probe + benchmark report,
4. mathematical claim -> derivation + check questions,
5. research paper claim -> claim map + evidence table,
6. implementation readiness -> code probe + transfer exercise.

The primary UI should show recommended artifacts first. Freeform artifact
creation is secondary and must explain why a type is recommended, optional, or
not useful for the current operation.

## Readiness And Path Mutation

Readiness is scoped to the session operation and artifact evidence. It never
claims the user owns a whole mission.

Supported user-initiated mutations:

1. "This is too easy."
2. "This is too hard."
3. "I do not understand this selected paragraph."
4. "Create a session only for this source slice."
5. "I want to prove this with code."
6. "I only want the conceptual version first."

Mutation produces a bounded proposal with rationale, risk, return condition, and
confirmation. It must not silently rewrite the mission.

## Frontier Lab Fixture

The first fixture is the frontier lab blog source-intent path. It is not a set of
separate apps.

Required explicit source signals:

1. JAX tutorials,
2. the JAX scaling book,
3. a roughly 10M parameter transformer in JAX, Flax, and Optax,
4. Chinchilla dense-vs-MoE derivation,
5. Pallas kernel work.

The MVP may propose tracks such as JAX foundations, scaling laws, kernel/systems
work, and agent work, but it must defer most work and ask the user to review the
first path.

## MVP Slices

1. Static frontier lab preview fixture.
2. URL/pasted-source intake UI.
3. Source text extraction and diagnostics.
4. Source signal extraction.
5. Mission preview compiler.
6. Review and create.
7. Source Map as secondary/advanced view.
