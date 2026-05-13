# Spec 07: Understanding Memory

## Goal

Persist the user's understanding state over time.

Sibi should not remember only chats. It should remember evidence of comprehension, misconceptions, repairs, and decay.

## Contract

```text
UnderstandingMemory
  learner_id
  artifact_session_id
  concept_states
  answer_history
  gap_history
  challenge_history
  readiness_history
```

```text
ConceptState
  concept_id
  current_layer
  confidence
  verified
  evidence_ids
  recurring_misconceptions
  last_reviewed_at
  next_review_at
```

## Required Behavior

1. Store concept state per artifact and learner.
2. Store answers as evidence, not as disposable chat.
3. Track recurring misconceptions.
4. Track review and recall timing.
5. Make all memory inspectable by the user.
6. Keep memory local or explicitly exportable in v0.1.

## Decay

Concepts should become stale over time unless the user recalls, applies, or transfers them.

v0.1 can use a simple rule:

1. recently verified concepts stay fresh
2. unreviewed concepts become needs_review
3. critical concepts need delayed recall

## Non-Goals

1. no hidden profile
2. no opaque mastery score
3. no team memory in v0.1
4. no vector database requirement
5. no external sync by default

## Verification

A resumed session should show:

1. what concepts were seen
2. what the user answered
3. what gaps were detected
4. what needs review next

