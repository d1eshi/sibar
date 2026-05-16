# Deep Ownership Workspace Spec Pack

## Purpose

This directory defines the next ambitious Sibi product surface:

> Sibi turns real technical artifacts into deep, evidence-backed ownership loops
> that force the user to think, derive, build, test, and remember.

This is not a generic repo chat, a passive explainer, a cloned editor, or a
Factory/Droid mission pack. It is a Sibi-native spec pack that gives an agent
such as Droid enough product, architecture, UI, and validation detail to turn
the vision into an implementation track.

## Why This Exists

The current Sibi foundation already proves the Build-to-Learn loop over bounded
software artifacts:

```text
artifact
  -> concept graph
  -> autopsy
  -> ownership question
  -> gap
  -> repair
  -> readiness
```

The deeper ambition is broader:

```text
hard technical goal
  -> real artifacts from code, papers, tests, notebooks, math, and experiments
  -> generated thinking artifact
  -> user attempt
  -> evidence-backed validation
  -> prerequisite repair
  -> new construction
  -> durable ownership memory
```

The first user is not trying to consume explanations. The first user wants to
become a serious AI researcher and builder. They may need to understand RL,
LLMs, optimization, Rust systems, ML from scratch, papers, math formulas, and
large unfamiliar repos. Sibi should help them build without letting them fake
understanding.

## Directory Reading Order

1. `00_north_star.md` explains the product ambition, first user, and moat.
2. `01_deep_ownership_loop.md` defines the core loop and data contract.
3. `02_workspace_architecture.md` defines the headless core, desktop surfaces,
   adapters, storage, and trust boundaries.
4. `03_ui_product_surface.md` defines the Sibi Lens and Sibi Workspace/Lab UI.
5. `04_generated_thinking_artifacts.md` defines artifacts such as code slices,
   diagrams, equation breakdowns, paper excerpts, hypothesis tables, and
   experiments.
6. `05_codebase_and_research_intelligence.md` defines how Sibi reads repos,
   tests, docs, papers, notebooks, and large directories without pretending
   context is infinite.
7. `06_pedagogy_memory_and_readiness.md` defines the attempt-first rules,
   prerequisite ladders, memory, and readiness.
8. `07_commands_workspace_signals_and_mutation.md` defines commands, signals,
   study mutations, and product mutations.
9. `08_validation_contract.md` defines `VAL-*` assertions that implementation
   must satisfy.
10. `09_implementation_plan.md` defines a Droid-ready implementation sequence.
11. `10_droid_execution_brief.md` gives a concise worker/orchestrator brief.
12. `11_open_decisions.md` lists decisions that remain intentionally open.
13. `12_ui_reference_components.md` extracts reproducible UI components from
    the Sibi Lens + Lab iteration references.
14. `features.json` translates the spec pack into an implementation queue.

## Naming Decision

Use `Deep Ownership Workspace` as the spec-pack name.

Avoid `Mission` as the product name. The system may borrow execution discipline
from Factory/Droid-style work, but Sibi's user-facing concept should be about
ownership, research, construction, and thinking.

Internal terms allowed:

1. `DeepOwnershipLoop`
2. `Sibi Lens`
3. `Sibi Workspace`
4. `Sibi Lab`
5. `ThinkingArtifact`
6. `ArtifactBoundary`
7. `ReadinessState`

Terms to avoid in user-facing UI:

1. `Mission`
2. `Droid`
3. `Factory`
4. `agent orchestration`
5. `knowledge graph` unless the user explicitly needs that level of detail

## Implementation Principle

Do not start by building an editor.

Start with:

```text
headless core
  + artifact workspace UI
  + read-only code/research rendering
  + generated thinking artifacts
  + attempt-first pedagogy
  + evidence-backed readiness
```

Editing integrations should remain adapters. Sibi may open files in VS Code,
Cursor, or another editor, but the moat belongs in the ownership runtime and
workspace memory, not in editor chrome.

## Morning Target

The first morning target is not full mastery of a 200k LOC repo.

The first morning target is:

> Given this Sibi repo directory and a learning goal, Sibi can create a visible
> Deep Ownership Workspace that shows one bounded concept slice, one generated
> thinking artifact, one attempt-first prompt, supporting evidence, and a first
> readiness limitation.

Minimum visible proof:

1. a selected artifact boundary
2. a repo/file evidence inventory
3. one important code slice
4. one visual or structured thinking artifact
5. one user operation prompt
6. one evidence panel
7. one gap or readiness panel
8. one next repair action

## Relationship To Existing Specs

This spec pack extends the existing foundation specs rather than replacing them.

Most existing runtime concepts map directly:

1. `ArtifactSession` remains the bounded evidence container.
2. `ConceptGraph` becomes one graph among several workspace projections.
3. `AutopsyStep` becomes the first form of a user operation prompt.
4. `LearningGap` becomes a typed gap inside a deeper prerequisite ladder.
5. `PracticeChallenge` becomes a repair or construction artifact.
6. `UnderstandingMemory` remains the durable moat.
7. `ReadinessReport` remains the output that decides what the user is ready to
   explain, trace, modify, debug, transfer, or teach.

## Feature Queue

`features.json` is included for an implementation orchestrator. It is not a
separate product spec. It maps the validation contract into small slices that
can be implemented, verified, and handed off independently.

## Non-Goals For This Pack

1. No full IDE replacement in the first implementation slice.
2. No autonomous product-code mutation before readiness.
3. No hidden filesystem scanning outside declared boundaries.
4. No screen capture or OCR as a requirement.
5. No editor-plugin dependency for core behavior.
6. No answer-first tutoring mode.
7. No claim of full repo ownership from a shallow summary.
8. No uncited explanations.
9. No model-only grading.
10. No pretending a generated graph is complete.
