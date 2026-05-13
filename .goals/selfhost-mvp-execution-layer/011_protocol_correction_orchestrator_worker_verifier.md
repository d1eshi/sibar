# 011 - Protocol Correction: Orchestrator Read-Only, Workers Own Writes

## Purpose

The user clarified that the main/orchestrator assistant should not write files
directly in this goal log or repository. This artifact documents the corrected
execution model for all future slices.

## Protocol Correction (As of 2026-05-13)

1. The orchestrator may read and audit repo state.
2. The orchestrator may discuss decisions and tradeoffs with the user in chat.
3. The orchestrator may spawn/send worker and verifier briefs.
4. The orchestrator may wait for and integrate worker/verifier reports.
5. All repository writes are performed by worker slices.
6. Every implementation slice requires verifier review before being treated as
   accepted.

This correction is not a functional rewrite of prior decisions; it is a process
rule update for all future steps.

## Historical Context

Earlier direct orchestrator edits to goal/spec artifacts were performed before this
rule clarification. Those artifacts are preserved as historical context and must not
be used as a precedent to repeat direct file writes.

## Required Next-State Wording

Any active next-step text should now say:

> The orchestrator prepares the brief in chat and delegates to workers; workers
> create the artifact files, then verifiers review the slice before the gate advances.

## Validation References

- `.goals/selfhost-mvp-execution-layer/README.md`
- `.goals/selfhost-mvp-execution-layer/007_completion_audit.md`
- `.goals/selfhost-mvp-execution-layer/010_verifier_result_manifest_mastery_fixtures.md`
