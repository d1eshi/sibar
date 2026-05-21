# Deep Ownership Workspace Spec Pack

## Purpose

This directory defines the next ambitious Sibi product surface:

> Sibi turns real technical artifacts into deep, evidence-backed ownership loops
> that force the user to think, derive, build, test, and remember.

This is not a generic repo chat, a passive explainer, or a cloned editor. It is
a Sibi-native spec pack that captures product, architecture, UI, and validation
detail without depending on an external orchestration format.

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

1. `00_new_app_tauri_workspace.md` is the current source spec for the second Tauri app.
2. `00_north_star.md` explains the product ambition, first user, and moat.
3. `01_deep_ownership_loop.md` defines the core loop and data contract.
4. `02_workspace_architecture.md` defines the headless core, desktop surfaces,
   adapters, storage, and trust boundaries.
5. `03_ui_product_surface.md` defines the Sibi Lens and Sibi Workspace/Lab UI.
6. `04_generated_thinking_artifacts.md` defines artifacts such as code slices,
   diagrams, equation breakdowns, paper excerpts, hypothesis tables, and
   experiments.
7. `05_codebase_and_research_intelligence.md` defines how Sibi reads repos,
   tests, docs, papers, notebooks, and large directories without pretending
   context is infinite.
8. `06_pedagogy_memory_and_readiness.md` defines the attempt-first rules,
   prerequisite ladders, memory, and readiness.
9. `07_commands_workspace_signals_and_mutation.md` defines commands, signals,
   study mutations, and product mutations.
10. `08_validation_contract.md` defines `VAL-*` assertions that implementation
   must satisfy.
11. `09_implementation_plan.md` defines a product implementation sequence.
12. `11_open_decisions.md` lists decisions that remain intentionally open.
13. `12_ui_reference_components.md` extracts reproducible UI components from
    the Sibi Lens + Lab iteration references.
14. `13_tauri_second_app_product_plan.md` is the derived/historical plan for this workspace.
15. `14_workspace_intent_flow.md` defines Workspace Intent as the first
    user-facing create-workspace flow before a pre-filled workspace appears.
16. `15_workspace_intent_compiler.md` defines the Rust `WorkspaceIntentCompiler`
    contract for `user_intent + source_bundle + existing_state -> WorkspacePlan`.
17. `16_llm_adapter_contract.md` defines external LLM adapter behavior:
    fixture first, then `codex-exec`, then `openai-api`/`opencode`/local.
18. `17_workspace_execution_pipeline.md` defines source bundle prep, adapter calls,
    validation/repair/block, and projection emission (`WorkspacePlan` + snapshot).
19. `18_workspace_ui_reproducibility.md` defines stable UI projection fields, 2–3
    visible next actions, evidence/artifact requirements, and locked advanced nodes.
20. `19_workspace_trace_contract_gate.md` is a prerequisite contract gate for
    workspace creation attempts, LLM run traces, session histories, compaction,
    and replay.
21. `20_mission_track_session_model.md` defines mission, track, session, and
    artifact as the product model for goal-driven programs such as frontier lab
    readiness.
22. `21_curated_track_pedagogy_contract.md` separates curated track queues,
    prerequisite routing, artifact recommendation, readiness gates, and path
    mutation from the UI presentation.
23. `22_source_intent_ingestion_mvp.md` defines the first dynamic MVP path for
    URL/pasted-source intake, source signal extraction, mission preview, and
    review-before-create.

## Naming Decision

Use `Deep Ownership Workspace` as the spec-pack name.

Avoid generic orchestration vocabulary in product-facing docs. Sibi's
user-facing concept should be about ownership, research, construction, and
thinking.

Internal terms allowed:

1. `DeepOwnershipLoop`
2. `Sibi Lens`
3. `Sibi Workspace`
4. `Sibi Lab`
5. `ThinkingArtifact`
6. `ArtifactBoundary`
7. `ReadinessState`

Terms to avoid in user-facing UI:

1. `agent orchestration`
2. `knowledge graph` unless the user explicitly needs that level of detail

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

## Runtime Topology for the Workspace Slice

The runtime is always this sequence:

1. UI onboarding captures `WorkspaceIntent` and selected source boundary.
2. Tauri/Rust receives the request and creates an execution job.
3. Rust invokes the adapter (`fixture` or `codex-exec`, then API/local fallback) as a
   controlled child process via `stdin` JSON payload and schema.
4. Rust validates parse/schema/pedagogy and classifies job outcome.
5. Rust emits `WorkspacePlan` + reproducible workspace snapshot to UI.

The UI does not expose a "Run Codex runner" button and does not know adapter
details. It renders job progression via states:

- queued
- running
- validating
- completed
- blocked
- failed
- cancelled

No timeout strategy is defined as the main failure path. Cancellation is explicit
and terminal (`cancelled`) through job control.

## Reproducible Live Workspace Repro

For deterministic developer verification of the live ownership loop (no external LLM call),
use the committed fixture:

- `evals/deep-ownership-workspace/fixtures/live-workspace-session.json`

Native app:

Run:

- `cd /path/to/repo`
- `SIBI_WORKSPACE_FIXTURE_MODEL_RESPONSE_PATH=evals/deep-ownership-workspace/fixtures/live-workspace-session.json swift run SibiStudyApp`

`Start` uses the current working directory as the repo root.

and click `Start`.

`web:dev` is only for smoke/fallback verification and is not the primary execution
path for this architecture.

For direct CLI checks:

- `node --experimental-strip-types src/sibi.ts start-workspace-session --goal "Explain this project A-Z" --root /path/to/repo --fixture-model-response-path evals/deep-ownership-workspace/fixtures/live-workspace-session.json`
- `node --experimental-strip-types src/sibi.ts explain "Explain this project A-Z" --root /path/to/repo --fixture-model-response-path evals/deep-ownership-workspace/fixtures/live-workspace-session.json`

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
