# 01: Deep Ownership Loop

## Goal

Define the core loop that turns a hard technical artifact into demonstrated
ownership.

This loop generalizes the current Build-to-Learn flow. Code remains a primary
artifact, but the loop must also support papers, formulas, notebooks, tests,
benchmarks, diagrams, and experiments.

## Workspace Intent Entry

The first user-facing flow for Sibar Research Workspace starts with
`WorkspaceIntent`, not global intent. Global ambition is durable context; a
workspace is a bounded program under that ambition.

```text
User Ambition
  -> WorkspaceIntent
  -> WorkspacePlan
  -> SessionPlan
  -> EvidencePlan
  -> DeepOwnershipLoop
```

Example:

```text
Global ambition:
  Convertirme en AI researcher-builder

Workspace intent:
  JAX Transformers from scratch

Session:
  Implement single-head attention in JAX
```

See `14_workspace_intent_flow.md` for the create-workspace UX, contract order,
and the transition from user input to the first session.

## Loop

```text
Declare Goal
  -> Bound Artifact
  -> Select Concept Slice
  -> Generate Thinking Artifact
  -> Ask For User Operation
  -> Capture Attempt
  -> Check Against Evidence
  -> Detect Gap Or Confirm Skill
  -> Offer Prerequisite Repair
  -> Re-Evaluate Nearby
  -> Update Memory
  -> Decide Readiness
```

## Contract

```text
DeepOwnershipLoop
  id
  user_goal
  artifact_boundary
  concept_slice
  generated_artifacts
  active_operation
  user_attempts
  evidence_checks
  detected_gaps
  prerequisite_path
  repair_actions
  reevaluation_prompts
  memory_updates
  readiness_state
  created_at
  updated_at
```

## User Goal

The user goal must be concrete enough to guide artifact selection.

Good examples:

```text
Understand how Sibi turns a partial answer into a readiness limitation.
Understand why PPO clips the policy ratio and implement a toy version.
Understand how this Rust repo manages ownership around memory buffers.
Understand how a Transformer attention block computes and uses attention scores.
```

Weak examples:

```text
Understand this repo.
Teach me RL.
Explain this file.
Make me good at ML.
```

If the goal is weak, Sibi should ask the user to choose an operation:

1. explain
2. trace
3. derive
4. predict
5. build
6. modify
7. debug
8. transfer

## Artifact Boundary

The boundary defines what Sibi is allowed to use as evidence.

```text
ArtifactBoundary
  root_path_or_source
  source_type: repo | folder | file_set | paper | notebook | experiment | mixed
  included_sources
  excluded_sources
  evidence_roles
  entrypoints
  tests_or_oracles
  commands
  declared_unknowns
```

Evidence roles:

1. `source_truth`: implementation, formula, paper claim, or authoritative code
2. `intent`: README, docs, comments, design notes, issue descriptions
3. `behavior_oracle`: tests, evals, examples, expected outputs
4. `experiment`: notebook outputs, training traces, benchmark runs
5. `counterexample`: failure case, adversarial test, negative result
6. `implementation`: code that realizes the concept
7. `interface`: API, CLI, UI, data contract, function signature
8. `historical_rationale`: changelog, design discussion, migration notes

Sibi should read tests and docs by default when they are inside the boundary.
They are not secondary material. They often explain intent and behavior faster
than implementation files.

## Concept Slice

A concept slice is the smallest useful unit of ownership.

```text
ConceptSlice
  id
  label
  domain: code | math | paper | experiment | systems | ml | rl | ui | mixed
  operation_target
  prerequisite_concepts
  source_evidence
  behavior_evidence
  risk_evidence
  expected_user_operations
```

Example:

```text
label: Readiness limitation from a partial answer
domain: mixed
operation_target: trace
prerequisite_concepts:
  - artifact boundary
  - gap finding
  - readiness claims
source_evidence:
  - src/runtime-gap-detection.ts
  - src/runtime-readiness.ts
behavior_evidence:
  - Tests/gap-detection.test.ts
  - Tests/readiness-report.test.ts
```

## User Operation

Sibi should ask the user to do an operation, not merely answer a quiz.

```text
UserOperation
  id
  kind: explain | trace | derive | predict | build | modify | debug | transfer | teach
  prompt
  artifact_ids
  required_evidence
  allowed_hints
  blocked_shortcuts
  success_criteria
```

Examples:

1. Explain: "In your own words, what responsibility does this function own?"
2. Trace: "Walk from this user answer to the readiness summary. Name the files
   and state changes."
3. Derive: "Starting from this equation, justify why this parameter affects the
   result."
4. Predict: "If gamma moves from 0.90 to 0.99, what behavior changes and why?"
5. Build: "Write the smallest version of this update rule without looking at
   the original implementation."
6. Modify: "Propose the smallest safe change and name the test that should
   fail if you are wrong."
7. Debug: "Given this failing output, identify which assumption broke."
8. Transfer: "Apply the same concept to a nearby artifact with different names."

## Attempt Capture

The user's attempt is first-class evidence.

```text
UserAttempt
  id
  operation_id
  answer_text
  selected_evidence
  declared_confidence
  declared_unknowns
  created_at
```

The UI must make it natural for the user to say:

```text
I do not know.
I can trace the first half but not the second.
I think this variable means X, but I cannot justify it yet.
I need a prerequisite ladder before I try again.
```

Declared uncertainty is not failure. False certainty is more dangerous.

## Evidence Check

```text
EvidenceCheck
  id
  attempt_id
  required_claims
  observed_claims
  missing_claims
  contradicted_claims
  unsupported_claims
  cited_evidence
  artifact_counterevidence
  result: confirmed | partial | gap | contradiction | insufficient_evidence
```

Sibi may use a model to propose checks, but deterministic validation must reject:

1. uncited claims
2. out-of-bound evidence
3. model-only readiness
4. answer-first explanations
5. claims that exceed the current concept slice

## Gap Or Confirmation

```text
OwnershipGap
  id
  concept_slice_id
  kind:
    | missing_prerequisite
    | wrong_causal_model
    | shallow_trace
    | unsupported_claim
    | false_confidence
    | formula_misread
    | implementation_misread
    | behavior_misread
    | transfer_failure
  evidence
  user_attempt_evidence
  severity: low | medium | high
  blocks_readiness
```

Confirmation should also be stored:

```text
ConfirmedSkill
  id
  concept_slice_id
  operation_kind
  evidence
  retention_due_at
  transfer_due_at
```

## Prerequisite Repair

When the user cannot solve the active operation, Sibi should offer a ladder
rather than explain the answer.

```text
PrerequisitePath
  id
  blocked_operation_id
  missing_concepts
  levels:
    - basic
    - intermediate
    - deep
    - construction
  recommended_next_artifact
```

Example for RL:

```text
blocked_operation: predict gamma behavior
basic: reward vs return
intermediate: discounted sum
deep: long-horizon credit assignment
construction: implement a two-state environment where gamma changes behavior
```

## Re-Evaluation

Re-evaluation must not repeat the same prompt.

```text
ReevaluationPrompt
  id
  original_operation_id
  nearby_operation_kind
  prompt
  required_evidence
  success_criteria
```

Good re-evaluation:

```text
Original: trace gap detection into readiness.
Nearby: trace practice generation into readiness using the same gap.
```

Bad re-evaluation:

```text
Repeat the same question with different wording.
```

## Readiness

Readiness is scoped and operational.

```text
ReadinessState
  concept_slice_id
  ready_to_explain
  ready_to_trace
  ready_to_derive
  ready_to_predict
  ready_to_build
  ready_to_modify
  ready_to_debug
  ready_to_transfer
  ready_to_teach
  blocked_claims
  evidence
  confidence
```

Sibi should never say:

```text
You understand this repo.
```

Sibi may say:

```text
You are ready to trace how a partial answer becomes a readiness limitation
inside this artifact boundary.
```

or:

```text
You are not ready to modify readiness scoring yet. You skipped the gap evidence
that blocks the claim.
```
