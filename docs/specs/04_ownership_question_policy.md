# Spec 04: Ownership Question Policy

## Goal

Define the question policy that verifies ownership without becoming punitive or noisy.

The question should test the user's mental model, not trivia.

## Question Types

1. short explanation
2. system walkthrough
3. boundary explanation
4. risk analysis
5. modification prediction
6. study request
7. transfer prompt

## Contract

```text
OwnershipQuestion
  id
  artifact_session_id
  concept_id
  prompt
  target_area
  why_it_matters
  evidence_basis
  answer_style
  max_followups
```

## Rules

1. Generate 1 to 3 questions at a time.
2. Every question needs evidence.
3. Ask for the user's model before giving an answer.
4. Prefer "walk me through" over "do you know".
5. If the answer is weak, respond with a hint or narrower question.
6. If the user says "I don't know", store uncertainty as evidence, not failure.
7. Never use process or activity metadata as proof of understanding.

## Non-Goals

1. no quiz scoreboard
2. no adversarial interrogation
3. no broad generic question bank as the primary system
4. no more than 3 immediate questions in v0.1

## Verification

Given a selected concept and artifact evidence, Sibi should produce one question that:

1. names the target area
2. explains why it matters
3. cites evidence
4. asks for reasoning, not recall only

