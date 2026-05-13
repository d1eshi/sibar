# Self-Hosted Evaluation Contract

## Goal

Define how SIBI decides whether the user understands a bounded SIBAR concept.

The contract is stricter than chat feedback. SIBI may not declare a gap,
misconception, or readiness claim without both user evidence and repo evidence.

## Hard Rule

```text
No gap without user evidence plus repo evidence.
```

User evidence is what the user answered, predicted, omitted, contradicted, or
declared uncertain.

Repo evidence is an accepted citation from inside the self-hosted artifact
boundary.

## Expected Operations

Every mastery check must evaluate exactly one primary operation:

1. `explain`: describe responsibility and why it exists
2. `trace`: walk a flow across files or functions
3. `predict`: state what should happen for a concrete input or change
4. `modify`: describe a safe bounded change and its guardrails
5. `debug`: identify likely failure mode and evidence
6. `transfer`: apply the same concept to a nearby concept or flow

## Contract Types

```text
MasteryCheck
  id
  concept_id
  operation
  prompt
  expected_answer_shape
  required_repo_evidence
  forbidden_claims
  minimum_readiness
  repair_when_failed
  reevaluation_prompt
```

```text
GapFinding
  id
  mastery_check_id
  concept_id
  operation
  user_evidence
  repo_evidence
  contradiction_or_insufficiency
  missing_reasoning_step
  gap_type
  severity
  confidence
  repair_task_id
  issue_candidate_ids
```

```text
RepairTask
  id
  gap_finding_id
  concept_id
  task_type
  prompt
  expected_output
  required_repo_evidence
  due_after
```

```text
ReevaluationPrompt
  id
  repair_task_id
  concept_id
  operation
  prompt
  required_repo_evidence
  must_not_repeat_original_answer
```

## Readiness Constraints

Readiness claims are bounded to the manifest scope and use only these labels:

1. ready to inspect
2. ready to explain
3. ready to modify with guardrails
4. ready to own
5. not ready yet

SIBI must not claim whole-repo mastery from one slice.

SIBI must not infer durable ownership from one correct answer. Durable ownership
requires at least one repaired or transferred check.

## Gap Types

The self-hosted evaluator must support these gap labels:

1. `surface_gap`
2. `flow_gap`
3. `boundary_gap`
4. `responsibility_gap`
5. `evidence_gap`
6. `causal_gap`
7. `test_oracle_gap`
8. `product_gap`
9. `false_confidence_gap`
10. `design_induced_gap`

## Valid Gap Checklist

A valid `GapFinding` must answer:

1. what concept was evaluated?
2. what operation was expected?
3. what did the user say or fail to say?
4. what does the repo show?
5. where is the contradiction or insufficiency?
6. what reasoning step is missing?
7. what repair task comes next?
8. what re-evaluation prompt will test the repaired skill?

## Invalid Findings

The evaluator must reject:

1. gaps based only on model opinion
2. gaps based only on repo evidence with no user answer
3. gaps based only on user uncertainty with no concept evidence
4. readiness claims without citations
5. claims using evidence outside the artifact boundary
6. "you understand this" claims that skip re-evaluation

## Verification

This contract is proven when deterministic cases show:

1. correct grounded answers can produce bounded readiness
2. correct but uncited answers produce evidence gaps
3. partial answers produce flow or causal gaps
4. wrong responsibility answers produce responsibility gaps
5. overconfident wrong answers produce false confidence gaps
6. plausible confusion can become a product/design issue instead of a user gap
