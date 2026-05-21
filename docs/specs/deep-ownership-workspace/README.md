# Deep Ownership Workspace Spec Pack

## Purpose

This directory defines Sibi's deep technical ownership product surface:

> Sibi turns real technical artifacts into deep, evidence-backed ownership loops
> that force the user to think, derive, build, test, and remember.

The current product north is source-driven mission creation:

```text
URL or pasted source + one user reason
  -> explicit source signals
  -> reviewable MissionPreview
  -> Mission Brief
  -> Focused Track Queue
  -> Active Session
  -> Artifact evidence
```

This is not a generic repo chat, a passive explainer, a cloned editor, or ten
separate apps. It is one Sibi-native product direction with historical reference
material below it.

## Current Authority

When docs conflict, use this authority order:

1. `00_current_north_star.md`
2. `22_source_intent_ingestion_mvp.md`
3. `20_mission_track_session_model.md`
4. `21_curated_track_pedagogy_contract.md`
5. `08_validation_contract.md`
6. `09_implementation_plan.md`
7. `11_open_decisions.md`

Product-facing hierarchy is:

```text
Mission
  -> Track
       -> Session
            -> Artifact
```

Internal contracts may still use `Workspace*` names where existing runtime code
or schemas require them. Do not expose "workspace inside workspace" as product
language.

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

## Current MVP Reading Path

Read these first if you are implementing or reviewing the current product slice:

1. `00_current_north_star.md` defines the current source-driven MVP and resolves
   product hierarchy.
2. `22_source_intent_ingestion_mvp.md` defines URL/pasted-source intake, source
   signal extraction, `MissionPreview`, and review-before-create.
3. `20_mission_track_session_model.md` defines `Mission -> Track -> Session ->
   Artifact`.
4. `21_curated_track_pedagogy_contract.md` defines focused queues, Source Map
   separation, readiness gates, artifact recommendations, and path mutation.
5. `08_validation_contract.md` defines `VAL-*` assertions that current and future
   implementation must satisfy.
6. `09_implementation_plan.md` defines the current implementation sequence.
7. `11_open_decisions.md` records accepted decisions and remaining open questions.

## Runtime Contract Path

Read these when implementing the compiler, adapter, execution, projection, or
trace layer. They are still useful, but they use internal `Workspace*` vocabulary:

1. `15_workspace_intent_compiler.md`
2. `16_llm_adapter_contract.md`
3. `17_workspace_execution_pipeline.md`
4. `18_workspace_ui_reproducibility.md`
5. `19_workspace_trace_contract_gate.md`

Map internal `WorkspacePlan`/`WorkspaceSnapshot` outputs to mission-language UI
objects before presenting them to users.

## Foundation Reference Path

These specs define the broader deep-ownership foundation. They are reference
material, not the shortest path for the current MVP:

1. `00_north_star.md`
2. `01_deep_ownership_loop.md`
3. `02_workspace_architecture.md`
4. `03_ui_product_surface.md`
5. `04_generated_thinking_artifacts.md`
6. `05_codebase_and_research_intelligence.md`
7. `06_pedagogy_memory_and_readiness.md`
8. `07_commands_workspace_signals_and_mutation.md`
9. `12_ui_reference_components.md`

## Historical Or Superseded Product Notes

These files record prior exploration and should not be read as current MVP
authority:

1. `00_new_app_tauri_workspace.md` is a historical conversation-derived app
   sketch. Use only for product texture and UI instincts.
2. `13_tauri_second_app_product_plan.md` is a derived/historical Tauri plan. Use
   for UI motifs only after checking current MVP authority.
3. `14_workspace_intent_flow.md` captures the earlier heavy Workspace Intent
   flow. It is superseded for first-run intake by
   `22_source_intent_ingestion_mvp.md`, but remains background for internal
   compiler naming.

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
source intake
  + source signal extraction
  + reviewable mission preview
  + focused track queue
  + active session
  + artifact evidence
  + scoped readiness
```

Editing integrations should remain adapters. Sibi may open files in VS Code,
Cursor, or another editor, but the moat belongs in the ownership runtime and
workspace memory, not in editor chrome.

## Current MVP Target

The current MVP target is not full mastery of a 200k LOC repo or a complete
curriculum from one article.

The current MVP target is:

> Given a URL or pasted source plus one sentence explaining why it matters, Sibi
> can extract explicit source signals, show a reviewable `MissionPreview`, create
> a mission brief, open a focused track queue, and start one active session with
> source-backed artifact expectations.

Minimum visible proof:

1. source intake accepts URL or pasted text plus user reason
2. extracted source signals remain distinct from sessions
3. mission preview appears before create
4. mission brief uses `Mission -> Track -> Session -> Artifact`
5. focused queue shows only a small next path
6. Source Map exists as secondary/advanced navigation
7. active session has one source slice and one required operation
8. recommended artifacts and readiness scope are visible

## Runtime Topology For The Current Slice

The runtime is always this sequence:

1. UI captures `SourceIntentInput`: URL or pasted source plus user reason.
2. Tauri/Rust receives the request and creates an execution job.
3. Source intake fetches or stores readable source text with diagnostics.
4. Source signal extraction identifies explicit goals, resources, exercises,
   claims, and prerequisites.
5. Rust invokes a fixture or adapter only behind the host boundary.
6. Rust validates parse/schema/pedagogy and classifies job outcome.
7. Rust emits internal `WorkspacePlan`/snapshot data projected to mission UI:
   `MissionPreview`, mission brief, focused queue, and active session.

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

## Legacy Live Workspace Repro

The committed live workspace fixture remains useful for internal regression
checks, but it is not the current product-facing MVP path.

For deterministic developer verification of the legacy ownership loop (no
external LLM call), use the committed fixture:

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
