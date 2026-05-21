# Deep Ownership Workspace

This directory is intentionally small. It is the current canonical spec set for
Sibi's source-driven deep ownership workspace.

## Current MVP

```text
URL or pasted source + one user reason
  -> explicit source signals
  -> reviewable MissionPreview
  -> Mission Brief
  -> Focused Track Queue
  -> Active Session
  -> Artifact evidence
  -> scoped readiness
```

The product-facing hierarchy is:

```text
Mission
  -> Track
       -> Session
            -> Artifact
```

Internal runtime contracts may still use `Workspace*` names, but the UI must not
present nested workspaces or a documentation tree as the main product model.

## Canonical Files

1. `00_current_north_star.md` defines the product north, non-goals, and current
   authority.
2. `01_source_to_mission_mvp.md` defines source intake, source signals,
   `MissionPreview`, Mission Brief, focused queues, sessions, artifacts, and the
   frontier lab fixture.
3. `02_runtime_boundary.md` defines the minimum internal compiler, adapter,
   execution, projection, and trace contracts needed for the MVP.
4. `03_validation_and_plan.md` defines validation assertions, implementation
   order, accepted decisions, open decisions, and verification gates.
5. `04_shared_core_boundaries.md` defines how ownership, pedagogy, memory,
   adapters, Sibi, and Sibar Workspace share runtime boundaries without
   duplicating contracts.

Historical specs were pruned from this directory. Git history retains the older
exploration, but it is no longer active documentation.

## Current Implementation Order

1. Static frontier lab source fixture.
2. Source intake UI: URL or pasted source plus one user reason.
3. Source signal extraction and reviewable mission preview.
4. Mission Brief -> Focused Track Queue -> Active Session.
5. Deterministic artifact recommendations and scoped readiness gates.
6. Explicit path mutation proposals.
7. LLM-assisted prerequisite/artifact recommendations only after deterministic
   contracts are stable.

## Shared Core Direction

Sibi's first wedge is ownership review for AI-assisted work. Sibar Workspace is
the deeper source/research surface for repairing ownership gaps through missions,
tracks, sessions, and artifacts.

Shared runtime work must preserve these boundaries:

1. `ownership-core` for deterministic ownership review and handoff artifacts,
2. `pedagogy-core` for attempt, evidence, gap, repair, and readiness gates,
3. `memory-core` for durable append-only attempts, outcomes, gaps, repairs,
   reviews, transfers, and projections,
4. adapters and UI surfaces for filesystem, git, runners, Tauri, DOM, and
   mission/session projection.

Core entrypoints should wrap or re-export existing contracts first. Do not
create duplicate gap, readiness, evidence, or artifact taxonomies.

## Non-Goals

1. No full IDE replacement in the MVP.
2. No full source/documentation sidebar as primary navigation.
3. No hidden automatic curriculum from one source.
4. No answer-first tutoring.
5. No claim of whole-mission readiness from one session.
6. No direct Sibi dependency on WorkspaceIntent or PedagogoAI workspace
   adapters.
