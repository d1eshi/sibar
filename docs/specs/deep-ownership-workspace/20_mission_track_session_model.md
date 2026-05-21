# 20: Mission, Track, Session, And Artifact Model

## Goal

Define the product model for goal-driven study programs such as:

```text
Land a Frontier Lab Job
  -> Kernel / systems work
  -> JAX foundations
  -> JAX memories and host offloading
  -> benchmark note, code probe, diagram, or derivation artifact
```

The model must prevent two bad outcomes:

1. a generic "workspace inside workspace" hierarchy that users cannot reason
   about,
2. a documentation-style tree with dozens of visible topics that overwhelms the
   user before they understand the next action.

## Naming Decision

Use these product-facing names:

```text
Mission
  Track
    Session
      Artifact
```

Avoid user-facing labels such as:

1. nested workspace
2. workspace inside workspace
3. full course tree
4. documentation sidebar
5. freeform artifact generator

Internal runtime objects may keep existing `Workspace*` names while the UI
projection uses mission language.

## Mission

A mission is a durable goal with source-backed context and a visible reason for
existing.

Example:

```text
Mission: Land a Frontier Lab Job
Primary source: How to Land a Frontier Lab Job, Vlad Feinberg, 2026-05-10
User goal: become a stronger engineer and build credible evidence for frontier
lab readiness.
```

The mission must show:

1. why the mission exists,
2. which source or conversation created it,
3. what the user is trying to become able to do,
4. which tracks Sibi selected and why,
5. which artifacts count as progress evidence.

The mission does not open directly into an active study session. It opens into a
mission brief first.

## Track

A track is a bounded path under a mission. It is not a copied source outline.

Examples:

1. Kernel / systems work
2. Agent work
3. Subject matter
4. Practical next steps
5. JAX foundations

Tracks may be nested in the underlying plan, but the UI should not present them
as a deeply nested workspace tree. If one track supports another, the UI should
show that as a dependency or prerequisite relationship.

## Session

A session is the smallest focused learning unit that the user can enter.

Examples:

1. How to think in JAX
2. JAX arrays and immutability
3. JAX memories and host offloading
4. Benchmarking a small forward pass
5. Deriving a dense vs MoE scaling-law comparison

Every session must have:

1. a source slice,
2. an operation the user must perform,
3. 1-3 expected artifacts,
4. evidence requirements,
5. a completion or return condition,
6. a readiness scope.

## Artifact

An artifact is a durable piece of user or Sibi-assisted work that can be used as
evidence.

Allowed artifact kinds include:

1. technical note
2. source claim map
3. evidence table
4. systems diagram
5. code probe
6. benchmark report
7. derivation
8. recall card
9. implementation sketch
10. transfer exercise

Artifacts are not generic document types. They are chosen because a session
requires a specific kind of demonstrated operation.

## Frontier Lab Mission Example

The Vlad Feinberg source produces a mission because the article connects a broad
career goal to concrete skill evidence:

1. work at the edges of the LLM stack,
2. build kernel and systems judgment,
3. understand agent experiments rigorously,
4. build subject-matter literacy,
5. complete practical JAX and scaling exercises,
6. produce public evidence of ability.

The JAX docs source becomes a track or source bundle under the mission, not a
separate top-level mission unless the user's goal is only "learn JAX".

## Product Invariants

1. A mission can contain multiple tracks.
2. A track can contain many possible sessions, but the UI shows only a curated
   queue by default.
3. A session owns the current source slice and artifact requirements.
4. Artifact choice is constrained by the session operation.
5. A source documentation outline is an advanced source map, not the primary
   study path.
6. Readiness is scoped to the session operation and artifact evidence, never to
   the whole mission.

## Non-Goals

1. Do not build a general learning management system.
2. Do not mirror every heading from external docs into the primary UI.
3. Do not let the user spawn arbitrary artifact types from the main path before
   the system can explain why they are useful.
4. Do not claim Sibi can automatically know every prerequisite from text alone.
   Prerequisite routing is a separate system feature defined in
   `21_curated_track_pedagogy_contract.md`.
