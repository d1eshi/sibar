# 00: Current North Star

## Current Product North

Sibi turns a source the user cares about into a source-backed mission for deep
technical ownership.

The current MVP is not a course app, repo chat, generic roadmap generator, or a
workspace that contains more workspaces. It is a focused loop:

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

The user-facing hierarchy is:

```text
Mission
  -> Track
       -> Session
            -> Artifact
```

Internal runtime objects may still use `Workspace*` names where contracts already
exist, but the product surface should not expose nested workspace language.

## First MVP Input

The first dynamic input is intentionally small:

```text
source_input: URL or pasted text
user_reason: why this source matters to me
optional_goal: what I want to become able to do
```

Sibi must show a preview before creating the mission. The preview should make
source grounding, uncertainty, deferred work, and the first recommended path
visible.

## Frontier Lab Fixture Meaning

The frontier lab blog example is the first fixture and source-driven product
example, not a bundle of separate applications.

The source signals include:

1. JAX tutorials,
2. the JAX scaling book,
3. a roughly 10M parameter transformer in JAX, Flax, and Optax,
4. a Chinchilla dense-vs-MoE derivation,
5. Pallas kernel work.

These are extracted source signals. Sibi may propose tracks or sessions from
them, but it must not turn every signal into an immediate path or imply the user
must complete everything at once.

## UI Posture

The default UI should keep the next operation clear:

1. Mission brief first, not an overwhelming source tree.
2. Focused track queue by default.
3. Active session with one source slice, one operation, and 1-3 artifact
   expectations.
4. Source Map as an advanced or secondary view, not primary navigation.
5. Evidence, gaps, and readiness visible without answer-first tutoring.

## Pedagogy Phasing

Pedagogy intelligence is phased:

1. static fixture first,
2. deterministic readiness gates and artifact recommendations next,
3. explicit user-requested path mutation next,
4. LLM-assisted prerequisite and artifact recommendations later.

The MVP should not pretend it has solved prerequisite inference, curriculum
generation, or long-term mastery scoring.

## Current Authority

Read these docs first for current MVP authority:

1. `00_current_north_star.md`
2. `22_source_intent_ingestion_mvp.md`
3. `20_mission_track_session_model.md`
4. `21_curated_track_pedagogy_contract.md`
5. `08_validation_contract.md`
6. `09_implementation_plan.md`
7. `11_open_decisions.md`

Older specs remain useful as reference, but when they conflict with this current
north, this document and the source-intent MVP docs win.

## Non-Goals For The Current MVP

1. Do not build ten apps from the fixture examples.
2. Do not expose a full documentation/source sidebar as the primary UI.
3. Do not require a heavy multi-field onboarding form before source ingestion.
4. Do not silently generate a full curriculum from one source.
5. Do not position Sibi as an answer-first explainer.
6. Do not claim whole-mission readiness from one session.
