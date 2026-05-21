# 00: Current North Star

## Product North

Sibi turns a source the user cares about into a source-backed mission for deep
technical ownership.

The MVP starts from:

```text
source_input: URL or pasted text
user_reason: why this source matters to me
optional_goal: what I want to become able to do
```

and produces:

```text
SourceSignals
  -> MissionPreview
  -> Mission Brief
  -> Focused Track Queue
  -> Active Session
  -> Artifact evidence
  -> scoped readiness
```

## Product Hierarchy

Use this vocabulary in the product surface:

```text
Mission
  -> Track
       -> Session
            -> Artifact
```

`Workspace*` remains internal vocabulary for runtime contracts only. The product
must not expose "workspace inside workspace" hierarchy.

## What Sibi Is Not

Sibi is not:

1. a course platform,
2. a repo chat,
3. a generic roadmap generator,
4. a passive explainer,
5. a documentation sidebar with a tutor attached,
6. ten separate apps generated from fixture examples.

## UI Posture

The default UI keeps the next operation clear:

1. Mission Brief first.
2. Focused Track Queue by default.
3. Active Session with one source slice and one operation.
4. One to three artifact expectations.
5. Evidence, gaps, and readiness visible.
6. Source Map as an advanced/secondary view.

## Pedagogy Phasing

1. Static fixture first.
2. Deterministic readiness gates and artifact recommendations next.
3. Explicit user-requested path mutation next.
4. LLM-assisted prerequisite and artifact recommendations later.

The MVP must not pretend it has solved prerequisite inference, curriculum
generation, or long-term mastery scoring.

## Authority

Current active specs:

1. `00_current_north_star.md`
2. `01_source_to_mission_mvp.md`
3. `02_runtime_boundary.md`
4. `03_validation_and_plan.md`

When older references in reports or changelog history disagree with these files,
these files win.
