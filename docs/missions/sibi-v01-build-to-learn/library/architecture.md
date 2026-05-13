# Architecture

## Ownership Boundaries

TypeScript owns:

- artifact sessions
- concept graph construction
- autopsy steps
- question generation
- gap and misconception detection
- practice challenge creation
- understanding memory
- readiness reports
- eval harnesses and traces
- LLM candidate validation

Swift owns:

- process bridge payloads in `SibiCore`
- rendering a study panel from runtime snapshots
- AppKit window/panel behavior for the floating study surface
- Graph + Code canvas rendering from decoded snapshot data
- user input collection for explicit artifact paths, selected concepts, and answers

The Codex model runner owns nothing durable. It returns candidate signals only.

## Runtime Data Flow

```text
User selects artifact
  -> TypeScript create_artifact_session
  -> TypeScript build_concept_graph
  -> TypeScript prepare_autopsy_step
  -> User answers
  -> TypeScript detects gaps and challenges
  -> TypeScript updates memory
  -> TypeScript exports readiness
  -> Swift panel and canvas render StudyPanelSnapshot
```

## Model-Assisted Data Flow

```text
ArtifactSession boundary
  -> ModelRunner prompt with allowed paths and requested output schema
  -> ModelSignalCandidate[]
  -> deterministic boundary/evidence/layer validation
  -> accepted candidates feed concept graph or gap proposals
  -> rejected candidates remain in PedagogyTrace
```

## Invariants

- All evidence must cite allowed artifact files or user answers.
- Model output is advisory until deterministic validation accepts it.
- Readiness claims must cite stored evidence, not model confidence.
- UI state is a projection of runtime state.
- Swift panels may arrange and filter decoded snapshot data, but may not infer
  graph concepts or read files directly for the canvas.
- Evals must be runnable without a live model through fixture responses.

## Planned Runtime Commands

- `create_artifact_session`
- `build_concept_graph`
- `prepare_autopsy_step`
- `generate_practice_challenges`
- `readiness_report`
- `run_project_learning_agent`
- `get_study_panel_state`

Existing commands remain valid until superseded:

- `declare_intent`
- `prepare_code_question`
- `generate_questions`
- `answer_question`
- `get_session_summary`
