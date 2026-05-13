# Sibi v0.1 Build-to-Learn Validation Contract

This contract defines observable behavior for the v0.1 mission. Assertions are
written from the user's and system validator's point of view.

## Artifact And Concept Flow

### `VAL-ART-001` - Artifact sessions are bounded

- **Behavioral description:** A user can create one artifact session with a root, included paths, excluded paths, learning goal, and confidence. Sibi refuses paths outside the declared boundary.
- **Tool:** Runtime test and STDIO smoke.
- **Evidence:** Stored `ArtifactSession` plus rejection output for an outside path.

### `VAL-ART-002` - Artifact sessions are resumable

- **Behavioral description:** A saved artifact session can be loaded later with its boundary, goal, and state intact.
- **Tool:** Runtime test with isolated `SIBI_RUNTIME_HOME`.
- **Evidence:** Reloaded session JSON matches the original declared boundary.

### `VAL-CONCEPT-001` - Concept graph cites artifact evidence

- **Behavioral description:** Sibi builds a small concept graph with human-readable nodes, at least one important flow, and source evidence for every node and edge.
- **Tool:** Runtime test over a fixture repo.
- **Evidence:** `ConceptGraph` contains at least five nodes, one flow edge, and file/range citations.

## Pedagogy Loop

### `VAL-PED-001` - Attempt comes before explanation

- **Behavioral description:** For a selected concept or flow, Sibi asks the user to predict, explain, or trace before providing an explanation.
- **Tool:** Runtime test and dogfood session.
- **Evidence:** `AutopsyStep` contains prompt, bounded evidence, and no answer-first explanation.

### `VAL-PED-002` - Questions are bounded and evidence-backed

- **Behavioral description:** Sibi generates one to three ownership questions, each with target area, why it matters, answer style, and evidence basis.
- **Tool:** Runtime test.
- **Evidence:** Question payloads satisfy count and evidence constraints.

### `VAL-GAP-001` - Gaps require evidence

- **Behavioral description:** A learning gap includes affected concept, observed answer or uncertainty, artifact evidence, suspected misconception, severity, confidence, and repair action.
- **Tool:** Deterministic eval fixture and runtime test.
- **Evidence:** `LearningGap` output for partial, wrong, and "I don't know" answers.

### `VAL-PRACTICE-001` - Practice repairs a known gap

- **Behavioral description:** A practice challenge is tied to one gap and states what the user must produce, what evidence counts, and when to revisit it.
- **Tool:** Runtime test.
- **Evidence:** `PracticeChallenge` references a gap id and expected evidence.

### `VAL-MEMORY-001` - Understanding memory is inspectable

- **Behavioral description:** Resuming a session shows concept states, answers, gaps, challenges, and next review timing.
- **Tool:** Runtime test and dogfood session.
- **Evidence:** Runtime summary includes persisted memory, not only chat history.

### `VAL-READY-001` - Readiness claims cite evidence

- **Behavioral description:** A readiness report lists ready areas, risky areas, open gaps, practice queue, and recommended next action with evidence citations.
- **Tool:** Runtime test.
- **Evidence:** JSON and Markdown report outputs contain evidence index entries for every claim.

## Evals

### `VAL-EVAL-001` - Dataset covers moat scenarios

- **Behavioral description:** The eval dataset includes correct, partial, uncertain, wrong misconception, missing evidence, boundary violation, and overconfident LLM cases.
- **Tool:** Dataset schema validation.
- **Evidence:** Fixture index lists each required case class.

### `VAL-EVAL-002` - Deterministic pedagogy evals run without LLM

- **Behavioral description:** Layer classification, gap detection, challenge generation, memory, and readiness can be evaluated without calling a model.
- **Tool:** Eval command or test suite.
- **Evidence:** Passing eval report with per-case observations.

### `VAL-EVAL-003` - LLM+runtime evals are traceable

- **Behavioral description:** Every model-backed eval records prompt, model, boundary, files read, candidate signals, deterministic validation, and final accepted/rejected signals.
- **Tool:** Eval harness using a fixture model response or configured live runner.
- **Evidence:** `PedagogyTrace` artifact for each eval case.

### `VAL-EVAL-004` - Benchmark dataset size is researched before quality claims

- **Behavioral description:** Sibi does not claim benchmark-quality eval coverage until a worker has researched and justified pilot and scale dataset sizes.
- **Tool:** Research artifact inspection and verifier review.
- **Evidence:** `dataset_sizing_research.md` with methodology, strata, pilot size, scale size, confidence or variance rationale, and cost/runtime tradeoff.

### `VAL-EVAL-005` - Codex model comparison uses identical traces

- **Behavioral description:** LLM trace evals compare Codex `gpt-5.2 medium` and Codex `gpt-5.5 low` on the same dataset, prompt/schema, artifact boundary, and deterministic validator.
- **Tool:** Eval harness or fixture trace comparison.
- **Evidence:** Comparison report showing both model configurations, shared case ids, accepted/rejected signals, citation quality, boundary compliance, and failure modes.

## Agent Boundary

### `VAL-AGENT-001` - Model runner stays inside artifact boundary

- **Behavioral description:** The model runner may read only declared artifact paths and must return citations to allowed files/ranges.
- **Tool:** Runtime test with allowed and disallowed paths.
- **Evidence:** Boundary violation is rejected and traced.

### `VAL-AGENT-002` - LLM cannot decide truth or readiness

- **Behavioral description:** LLM candidate signals are ignored unless deterministic validation confirms evidence, layer, and boundary rules.
- **Tool:** LLM trace eval with overconfident and uncited responses.
- **Evidence:** Rejected candidate signal with validation errors.

## UI

### `VAL-UI-001` - Study panel renders a full session snapshot

- **Behavioral description:** The Swift panel can show artifact boundary, concept graph, active autopsy step, answer composer, evidence drawer, gaps, practice queue, memory, and readiness.
- **Tool:** Swift UI/unit snapshot or manual panel acceptance.
- **Evidence:** `StudyPanelSnapshot` fixture rendered without hidden state.

### `VAL-UI-002` - Swift does not own pedagogy state

- **Behavioral description:** Swift calls runtime commands and renders returned data only; it does not classify layers, generate gaps, persist memory, or evaluate readiness.
- **Tool:** Swift tests and code review.
- **Evidence:** `SibiCore` models map to runtime payloads; no Swift-side pedagogy engine exists.

### `VAL-UI-003` - Standalone app hosts live study snapshots

- **Behavioral description:** A standalone Swift app can load the current or selected artifact session, refresh `StudyPanelSnapshot` data, and submit answers back to the TypeScript runtime.
- **Tool:** Swift build, Swift tests, and runtime regression tests.
- **Evidence:** `SibiStudyApp` executable target, `StudyPanelLiveModel` tests, and passing TypeScript runtime tests.

### `VAL-UI-004` - Study app is a floating panel with graph/code canvas

- **Behavioral description:** The product app opens as an accessory floating `NSPanel`, supports collapse/restore, and opens a separate Graph + Code canvas rendered from runtime snapshot data.
- **Tool:** Swift panel/controller tests, Swift build, and runtime snapshot tests.
- **Evidence:** `SibiStudyShellKit` panel tests plus `StudyPanelSnapshot.active_code_selection` coverage.
