# Spec 06: Practice Challenges

## Goal

Turn gaps into proof-producing practice.

Reading is not enough. The user should produce evidence that they can explain, modify, recall, or transfer the concept.

## Challenge Types

1. explain the flow without looking
2. trace a path across files
3. predict a side effect
4. make a small modification
5. write or adjust a test
6. compare two design alternatives
7. rebuild a smaller version
8. transfer the concept to a second artifact

## Contract

```text
PracticeChallenge
  id
  concept_id
  gap_id
  challenge_type
  prompt
  expected_evidence
  difficulty
  due_after: now | 24h | 7d
  completion_state
```

## Required Behavior

1. Critical gaps get immediate repair challenges.
2. Important gaps get one bounded challenge.
3. Later gaps go to the review queue.
4. At least one challenge should require active production, not only reading.
5. Delayed recall should exist for concepts that matter.

## Non-Goals

1. no gamified streak system
2. no course platform
3. no large curriculum generation before the first autopsy works
4. no automatic code edits by Sibi in v0.1

## Verification

A challenge is valid only if it states:

1. what the user must produce
2. which concept it repairs
3. what evidence counts
4. when to revisit it

