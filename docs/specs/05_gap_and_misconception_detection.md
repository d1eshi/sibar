# Spec 05: Gap And Misconception Detection

## Goal

Detect the difference between the artifact's real behavior and the user's current mental model.

The output is a learning signal, not a judgment.

## Layer Model

Use five concept-level layers:

1. L1 Surface Recognition
2. L2 Isolated Explanation
3. L3 Contextual Connection
4. L4 Applied Reasoning
5. L5 Fluent Ownership

Sibi tracks concepts separately. A user can be L4 on code reading and L1 on architecture.

## Contract

```text
LearningGap
  id
  concept_id
  expected_layer
  observed_layer
  severity: critical | important | later
  confidence: low | medium | high
  evidence
  suspected_misconception
  repair_action
```

## Misconception Examples

1. reward vs loss
2. adapter vs service
3. local state vs persisted state
4. runtime lifecycle vs request lifecycle
5. framework convention vs product logic
6. test coverage vs behavior proof
7. generated code working vs understood code

## Rules

1. A gap requires evidence from an answer, artifact trace, or declared uncertainty.
2. Confidence must stay low when evidence is thin.
3. Process/tool metadata can provide context but not mastery proof.
4. Overconfidence is a signal only when the answer contradicts artifact evidence.
5. The system must preserve why it detected the gap.

## Verification

A valid detected gap must answer:

1. what concept is affected?
2. what did the user say or do?
3. what does the artifact show?
4. what is the likely misconception?
5. what repair action comes next?

