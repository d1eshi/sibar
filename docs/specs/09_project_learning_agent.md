# Spec 09: Project Learning Agent

## Goal

Let Sibi use a configured Codex model runner to inspect a bounded artifact and
propose learning signals, while deterministic pedagogy rules remain the source
of truth.

This spec closes the v0.1 loop: the agent can help discover what the artifact
contains and where the learner may have gaps, but it cannot decide mastery,
truth, readiness, or final learning state by itself.

## Contract

```text
ModelSignalCandidate
  id
  artifact_session_id
  model_name
  signal_type: concept | flow | risk | gap_candidate | misconception_candidate | practice_candidate
  claim
  citations
  confidence
  rationale

PedagogyTrace
  trace_id
  artifact_session_id
  model_runner
  model_name
  prompt
  artifact_boundary
  files_read
  candidate_signals
  deterministic_validation
  accepted_signals
  rejected_signals
  final_runtime_output
```

## Required Behavior

1. The model runner receives only the declared artifact boundary and allowed evidence.
2. The model returns candidate signals with citations to allowed files or ranges.
3. Sibi records a trace for every model-backed run.
4. Deterministic validation rejects uncited, out-of-bound, or readiness-deciding claims.
5. Accepted candidates can inform concept graph, gap proposals, or practice proposals, but never skip the user's attempt-first loop.
6. The system can run fixture model responses for evals without a live model.
7. Model evals use Codex `gpt-5.2 medium` first and compare against Codex `gpt-5.5 low`.

## Pedagogy Rules

1. L1-L5 layer decisions are validated by deterministic rules and stored evidence.
2. A model can suggest a likely misconception, but the runtime must preserve the evidence and confidence.
3. A model can suggest questions or challenges, but the ownership question policy still enforces count, evidence, and answer style.
4. A model can summarize artifact evidence, but readiness requires stored user evidence.

## Non-Goals

1. no workspace mutation
2. no full-machine filesystem reading
3. no hidden background scan
4. no non-Codex provider abstraction work in v0.1
5. no model-only grading
6. no autonomous agent orchestration in v0.1

## Verification

A valid model-assisted run must show:

1. the artifact boundary sent to the model
2. files or excerpts read
3. candidate signals returned
4. accepted and rejected candidate signals
5. validation errors for rejected candidates
6. final runtime output governed by deterministic pedagogy
7. model comparison traces when running E03 evals
