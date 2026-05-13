# Spec 08: Readiness And Export

## Goal

Produce a reviewable readiness report at the end of a Build-to-Learn session.

The report should say what the user is ready to change, what remains risky, and what evidence supports that claim.

## Contract

```text
ReadinessReport
  artifact_session_id
  summary
  ready_areas
  risky_areas
  verified_concepts
  open_gaps
  practice_queue
  recommended_next_action
  evidence_index
```

## Readiness Language

Use bounded claims:

1. ready to inspect
2. ready to explain
3. ready to modify with guardrails
4. ready to own
5. not ready yet

Do not claim total mastery.

## Required Behavior

1. Every readiness claim cites evidence.
2. The report distinguishes confidence from proof.
3. The report lists unresolved gaps.
4. The report recommends the next small action.
5. The report can be exported as Markdown or JSON.

## Future Integration

The export can later feed:

1. SIBAR study workspace
2. agent-evaluator validation flows
3. team onboarding paths
4. Complete/Cyber shared understanding memory

v0.1 only needs a local reviewable export.

## Verification

A valid report should let the user answer:

1. what do I own now?
2. what should I not touch yet?
3. what evidence proves that?
4. what do I practice next?

