# 06: Pedagogy, Memory, And Readiness

## Goal

Define the cognitive rules that make Sibi different from repo chat, tutorials,
and coding agents.

Sibi must make the user think. The product should be rigorous enough for a user
trying to become a serious AI researcher or systems builder.

## Attempt-First Rule

Default behavior:

```text
Sibi asks before explaining.
```

The user must attempt the operation before seeing the full explanation.

Allowed before attempt:

1. bounded artifact excerpt
2. problem statement
3. variable glossary without final reasoning
4. hints
5. prerequisite options
6. clarifying questions
7. evidence list

Blocked before attempt:

1. final explanation
2. final derivation
3. completed solution
4. model answer
5. readiness upgrade

## Hint Ladder

Hints should deepen thinking without giving away the answer.

```text
HintLevel
  1: orient attention
  2: name relevant evidence
  3: ask a smaller sub-question
  4: expose prerequisite
  5: offer a minimal example
  6: allow full explanation only after attempt or explicit override
```

Example for code:

1. "Focus on the branch that creates the gap object."
2. "The relevant evidence is in `runtime-gap-detection` and its test."
3. "What field links the user's answer to the artifact evidence?"
4. "Review the difference between answer quality and readiness."
5. "Try tracing the same pattern with a simpler two-step flow."

Example for RL:

1. "Focus on delayed rewards."
2. "Write the first three terms of the discounted return."
3. "What changes faster: immediate or delayed reward contribution?"
4. "Review reward vs return."
5. "Use a two-state environment."

## Prerequisite Routing

Sibi should not punish the user for missing fundamentals. It should route them.

```text
PrerequisiteRoute
  blocked_operation
  suspected_missing_concepts
  route_options
  recommended_start
  return_condition
```

Route options:

1. `basic`: vocabulary and minimal intuition
2. `intermediate`: mechanism and examples
3. `deep`: derivation, proof, or causal model
4. `construction`: build a minimal implementation or experiment
5. `transfer`: apply to a new artifact

The route must return to the original goal.

## Gap Taxonomy

```text
GapKind
  missing_prerequisite
  wrong_causal_model
  shallow_trace
  unsupported_claim
  formula_misread
  implementation_misread
  behavior_misread
  test_oracle_misread
  false_confidence
  transfer_failure
  vocabulary_only
  memorized_without_mechanism
```

The most dangerous gaps:

1. false confidence
2. vocabulary-only answers
3. correct conclusion with wrong mechanism
4. claims that ignore counterevidence
5. passive agreement without construction

## Memory Model

Memory must track demonstrated operations, not generic familiarity.

```text
UnderstandingMemory
  user_id
  artifacts
  concepts
  operations
  attempts
  gaps
  repairs
  confirmed_skills
  misconceptions
  retention_schedule
  transfer_history
```

Concept memory:

```text
ConceptMemory
  concept_id
  label
  domains
  confirmed_operations
  open_gaps
  recurring_misconceptions
  last_successful_attempt
  retention_due_at
  transfer_due_at
```

Confirmed operations are granular:

```text
ready_to_explain != ready_to_modify
ready_to_trace != ready_to_derive
ready_to_build != ready_to_teach
```

## Misconception Memory

Misconceptions are durable assets.

Examples:

1. reward vs return
2. loss vs reward
3. runtime boundary vs persistence boundary
4. tests as behavior oracle vs tests as implementation
5. parameter definition vs parameter effect
6. architecture diagram vs proven execution flow
7. model confidence vs cited evidence

Contract:

```text
MisconceptionMemory
  id
  label
  first_seen_at
  repeated_count
  domains_seen
  evidence
  repair_history
  current_status
```

## Readiness Model

Readiness must be scoped.

Allowed readiness claims:

1. ready to explain this concept slice
2. ready to trace this flow
3. ready to derive this equation component
4. ready to predict this parameter change
5. ready to build a minimal version
6. ready to modify with guardrails
7. ready to debug this failure class
8. ready to transfer to a nearby artifact
9. ready to teach with citations

Blocked readiness claims:

1. ready to own the whole repo
2. ready to change unrelated files
3. ready because Sibi explained it
4. ready because the model says so
5. ready without user attempt evidence

## Readiness Contract

```text
ReadinessClaim
  id
  scope
  operation
  status: ready | limited | blocked | unknown
  claim
  supporting_user_evidence
  supporting_artifact_evidence
  blocking_gaps
  required_next_action
  confidence
```

## Repair Actions

Repair actions must be concrete.

Valid repair actions:

1. trace a flow across cited files
2. derive a missing formula step
3. implement a minimal version
4. design an experiment
5. predict output before running a command
6. compare two hypotheses
7. identify the test that protects a behavior
8. revise an unsupported claim
9. explain a counterexample

Invalid repair actions:

1. review the docs
2. study RL
3. ask Sibi for the answer
4. reread the file
5. watch a tutorial
6. trust the generated diagram

## Creative Construction

Sibi should not stop the user from building.

When the user wants to build while they are not ready for product mutation,
Sibi should route to:

1. scratch implementation
2. toy experiment
3. patch preview
4. failing test design
5. hypothesis table
6. pseudo-code
7. minimal reproduction

This preserves momentum while protecting the real project.

