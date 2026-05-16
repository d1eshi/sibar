# 04: Generated Thinking Artifacts

## Goal

Define the artifacts Sibi can generate to force deep thinking.

Artifacts are not outputs for passive consumption. They are structured objects
that place the user in a technical operation: derive, predict, trace, build,
modify, debug, transfer, or teach.

## Contract

```text
ThinkingArtifact
  id
  loop_id
  concept_slice_id
  kind
  title
  purpose
  source_evidence
  hidden_solution_evidence
  user_operation
  renderer
  payload
  success_criteria
  created_at
```

Kinds:

1. `code_slice`
2. `flow_diagram`
3. `architecture_map`
4. `equation_breakdown`
5. `paper_excerpt`
6. `hypothesis_table`
7. `experiment_card`
8. `ablation_plan`
9. `minimal_build`
10. `counterexample`
11. `concept_ladder`
12. `risk_map`
13. `test_oracle`
14. `patch_preview`
15. `memory_review`

## Artifact Selection Policy

Sibi should choose an artifact based on the operation the user needs.

```text
If the user must trace a runtime flow:
  generate code_slice + flow_diagram.

If the user must derive a formula:
  generate equation_breakdown + variable glossary + prediction prompt.

If the user must implement a paper idea:
  generate paper_excerpt + minimal_build + experiment_card.

If the user must debug a behavior:
  generate risk_map + test_oracle + counterexample.

If the user must transfer a concept:
  generate comparison table + nearby artifact prompt.
```

The model may propose an artifact kind. The runtime should validate that:

1. required evidence exists
2. artifact kind matches the requested operation
3. hidden solution material is not shown before the attempt
4. the artifact can be rendered by the UI

## Code Slice

Purpose:

Show the smallest code region needed for an ownership operation.

Payload:

```text
CodeSliceArtifact
  file_path
  ranges
  collapsed_context
  related_tests
  related_docs
  selected_symbols
  hidden_lines
  prompt_focus
```

Rules:

1. Prefer one function or one small flow over a whole file.
2. Show enough context to avoid misleading the user.
3. Mark hidden solution lines when the operation is to predict behavior.
4. Link to tests and docs when available.
5. Provide `open_in_editor` metadata.

Example operation:

```text
Trace how this answer branch becomes a learning gap. Name the exact condition
that makes the answer partial and the evidence attached to the gap.
```

## Flow Diagram

Purpose:

Represent a causal or procedural path across artifacts.

Payload:

```text
FlowDiagramArtifact
  nodes
  edges
  entry_node
  terminal_nodes
  uncertainty_markers
```

Node fields:

```text
id
label
role
evidence
is_inferred
user_prompt
```

Edge fields:

```text
from
to
relation
evidence
is_inferred
```

Rules:

1. A diagram is a prompt surface, not a final answer.
2. Inferred edges must be visually distinct.
3. A selected node should produce an operation prompt.
4. The user should be able to reveal evidence, not full explanation.

## Equation Breakdown

Purpose:

Help the user justify mathematical structure.

Payload:

```text
EquationBreakdownArtifact
  equation
  variables
  terms
  assumptions
  derivation_steps
  hidden_steps
  prediction_prompts
  implementation_bridge
```

Rules:

1. Do not explain variables by definition only.
2. Ask the user to predict behavior under parameter changes.
3. Ask for a counterexample or boundary condition.
4. Bridge to code or experiment when possible.

Example:

```text
Given a discounted return equation, predict what changes when gamma approaches
1. Then design a two-state environment where that prediction becomes visible.
```

## Paper Excerpt

Purpose:

Turn a paper claim into an operation the user can test or implement.

Payload:

```text
PaperExcerptArtifact
  source_title
  citation
  excerpt
  extracted_claims
  unknown_terms
  implementation_targets
  experiment_targets
```

Rules:

1. The excerpt must be short enough for close reading.
2. Claims must be separated from interpretation.
3. Unknown terms should route into prerequisite ladders.
4. The artifact should connect to code or experiment when possible.

## Hypothesis Table

Purpose:

Make the user generate multiple possible explanations before choosing one.

Payload:

```text
HypothesisTableArtifact
  question
  hypotheses
  required_discriminating_evidence
  experiments
  expected_observations
```

Rules:

1. Require at least two hypotheses for ambiguous behavior.
2. Ask what evidence would distinguish them.
3. Store rejected hypotheses as learning evidence.

Example:

```text
Why did reward improve while evaluation performance stayed flat?

Hypotheses:
  1. reward hacking
  2. evaluation mismatch
  3. environment stochasticity
  4. overfitting to train seeds
```

## Experiment Card

Purpose:

Connect reasoning to an executable or inspectable result.

Payload:

```text
ExperimentCardArtifact
  hypothesis
  minimal_setup
  command
  expected_result
  observed_result
  interpretation_prompt
  safety
```

Rules:

1. Prefer small, cheap experiments.
2. Commands must be explicit and safe.
3. The user predicts before execution.
4. Sibi asks the user to interpret the result before explaining.

## Minimal Build

Purpose:

Make the user construct a small version of the concept.

Payload:

```text
MinimalBuildArtifact
  target_behavior
  starter_code
  blanks
  constraints
  tests
  hints
  solution_hidden
```

Rules:

1. Starter code can be incomplete.
2. Tests should check the concept, not incidental syntax.
3. The solution must remain hidden until attempt or explicit reveal policy.

## Counterexample

Purpose:

Break shallow understanding.

Payload:

```text
CounterexampleArtifact
  user_claim
  challenge_case
  expected_failure
  evidence
  repair_prompt
```

Rules:

1. Use counterexamples for overconfident answers.
2. Ask the user to revise the claim.
3. Store the revised claim as memory evidence.

## Concept Ladder

Purpose:

Route a blocked user to prerequisites without giving the final answer.

Payload:

```text
ConceptLadderArtifact
  blocked_operation
  basic_layer
  intermediate_layer
  deep_layer
  construction_layer
  return_prompt
```

Rules:

1. Each layer must have an operation.
2. The ladder must route back to the original concept.
3. The user can choose a lower layer without being penalized.

## Patch Preview

Purpose:

Let the user reason about a change without mutating product code.

Payload:

```text
PatchPreviewArtifact
  intended_change
  affected_files
  proposed_diff
  expected_tests
  risk_claims
  readiness_required
```

Rules:

1. Patch previews are study mutations until applied.
2. Product mutation requires readiness or explicit override.
3. The user must predict what test or behavior should change.

## Artifact Renderer Requirements

Every artifact renderer must support:

1. title
2. purpose
3. evidence links
4. active operation
5. hidden solution sections
6. attempt capture
7. hint ladder
8. result state
9. readiness criteria

The first UI does not need perfect visual beauty, but it must make the thinking
operation impossible to miss.

