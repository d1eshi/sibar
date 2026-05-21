# 22: Source Intent Ingestion MVP

## Goal

Define the first dynamic MVP path for turning a user-provided source into a
mission, tracks, source map, and initial study sessions.

The MVP should support a user saying:

```text
This blog matters to me. I want to use it to get closer to a frontier lab role.
```

with either:

1. a URL,
2. pasted text,
3. a selected source slice,
4. a short user explanation of why the source matters.

The system should not require a large onboarding form before it can create a
useful preview.

## Product Decision

Replace the heavy first-run intent form with a lightweight source-intent intake
for the first prototype.

The user provides:

```text
source_input: URL or pasted text
user_reason: why this source matters to me
optional_goal: what I want to become able to do
```

Sibi then proposes a mission preview that the user can accept, edit, or reject.

## MVP Flow

```text
User provides URL + reason
  -> Source Intake fetches or stores source text
  -> Source Signal Extractor finds explicit goals, resources, exercises, and claims
  -> Intent Synthesizer combines source signals with user reason
  -> Mission Preview proposes mission, tracks, source map, and first sessions
  -> User reviews/edits
  -> Workspace/Mission is created
```

The system must show the preview before committing to a mission. It should not
silently create a long path from one blog.

## Frontier Lab Blog Example

Input:

```text
source_input: https://vladfeinberg.com/2026/05/10/how-to-land-a-job-at-a-frontier-lab.html
user_reason: I want to use this as a practical plan to become stronger as an
engineer and build evidence toward frontier lab readiness.
```

Source signals that are explicit in the blog:

1. build skill at the edges of the LLM stack,
2. below the stack: kernel and systems work,
3. above the stack: agentic loops and controlled experiments,
4. subject matter: read and understand language model history and theory,
5. practical next steps: JAX tutorials,
6. practical next steps: the JAX scaling book,
7. exercise: code a roughly 10M parameter transformer using JAX, Flax, and Optax
   in free Colab with TPU,
8. exercise: derive Chinchilla laws and compare dense vs MoE architectures,
9. exercise: write a Pallas kernel that beats `jax.lax.ragged_dot` for a
   measurable forward-pass speedup.

The MVP should not infer that the user must do every item immediately. It should
turn these into candidate tracks and sessions, then ask the user to review the
first path.

## Contracts

### SourceIntentInput

```text
SourceIntentInput
  id
  source_input
    kind: url | pasted_text | selected_text | file
    value
  user_reason
  optional_goal
  optional_constraints
  created_at
```

### SourceIntakeResult

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

### SourceSignal

```text
SourceSignal
  id
  kind: goal | resource | exercise | claim | skill_area | output | prerequisite
  label
  source_excerpt_ref
  confidence
  user_relevance: explicit | inferred | unknown
```

Important: a signal is not yet a session. It is a source-backed candidate.

### MissionPreview

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

### ProposedTrack

```text
ProposedTrack
  id
  title
  rationale
  source_signals[]
  status: recommended | optional | deferred
```

### ProposedSession

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

## Signal Extraction Rules

For the first MVP, extraction can be mostly deterministic plus LLM-assisted:

1. detect headings and list items,
2. detect external links and their anchor text,
3. detect imperative verbs such as "go through", "read", "do", "code", "derive",
   "write", "explain",
4. classify resources and exercises,
5. preserve source excerpts,
6. mark uncertain signals as low-confidence instead of pretending certainty.

The extractor should prefer explicit source instructions over broad inferred
curricula.

## Intent Synthesis Rules

Sibi combines:

1. explicit user reason,
2. optional user goal,
3. source signals,
4. prior user memory when available,
5. product constraints from `20_mission_track_session_model.md` and
   `21_curated_track_pedagogy_contract.md`.

It should output a mission preview, not a final path.

If the user reason is missing, Sibi asks one short question:

```text
What do you want this source to help you become able to do?
```

If the source has too many signals, Sibi should choose a small first path and
explain what it deferred.

## Review Before Create

The preview screen must let the user edit:

1. mission title,
2. user goal,
3. selected tracks,
4. first session,
5. deferred tracks,
6. optional source map items.

The default action is:

```text
Create mission from this preview
```

not:

```text
Generate everything
```

## Non-Goals

1. Do not solve full prerequisite detection in this MVP.
2. Do not auto-generate a complete curriculum from one blog.
3. Do not require the old multi-field onboarding flow before URL ingestion.
4. Do not hide uncertainty about whether a source signal is relevant to the
   user's goal.
5. Do not convert every external link into an immediate track.

## Implementation Slices

### Slice 1: Static Frontier Lab Preview

Create a deterministic fixture for the frontier lab blog:

1. source metadata,
2. extracted source signals,
3. mission preview,
4. tracks for JAX foundations, scaling laws, kernel/systems work, and agent work,
5. first 3-5 sessions.

### Slice 2: URL Intake UI

Add a simple entry UI:

```text
URL
Why this matters to me
[Preview mission]
```

No heavy onboarding form.

### Slice 3: Source Text Extraction

Fetch URL content and normalize readable text. Store source text and diagnostics.

### Slice 4: Signal Extraction

Extract headings, links, imperatives, resources, exercises, and source-backed
claims into `SourceSignal` objects.

### Slice 5: Mission Preview Compiler

Compile `SourceIntentInput + SourceSignals + prior state` into `MissionPreview`.

### Slice 6: Review And Create

Let the user edit the preview and create the mission/track/session projection.

### Slice 7: Dynamic Source Map

Render the extracted source map separately from the focused track queue.

## Validation

1. A URL plus one user reason can produce a reviewable mission preview.
2. The preview cites source signals for every proposed track.
3. The first path is limited to a small queue, not the whole source outline.
4. The JAX tutorials, scaling book, and 10M transformer exercise are extracted as
   separate source signals in the frontier lab fixture.
5. User edits to mission title, goal, and first session are preserved in the
   created mission.
6. Low-confidence or ambiguous signals remain visible as open questions.
