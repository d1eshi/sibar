# Spec 03: Learning Autopsy

## Goal

Define the guided reverse-engineering loop that makes Sibi different from repo chat.

Sibi should not begin by explaining. It should first ask the user to predict, explain, or trace.

## Loop

```text
Look
  -> Predict
  -> Explain
  -> Run or Inspect Evidence
  -> Compare
  -> Repair
  -> Recall
```

## Required Behavior

For each selected concept or flow:

1. show a bounded artifact excerpt or map section
2. ask what the user thinks it does
3. collect the answer
4. compare the answer against the artifact evidence
5. identify missing or confused concepts
6. give a hint before a full explanation
7. ask for a retry or a transfer task

## Session Shape

```text
AutopsyStep
  id
  artifact_session_id
  concept_id
  prompt
  user_answer
  evidence_basis
  detected_gap_ids
  next_action
```

## Non-Goals

1. no answer-first explanation mode as the default
2. no long passive tutorial
3. no unbounded chat
4. no automatic pass/fail grading

## Verification

The first autopsy should produce at least:

1. one user prediction
2. one answer comparison
3. one detected gap or confirmed concept
4. one next action

