# 004 - Decision Brief: First Worker Slice

## Decision Needed

Choose what the first implementation worker should produce after the fifth
concept and manifest location are resolved.

## Option A - Manifest And Mastery-Check Fixtures Only

The first worker creates:

1. concrete self-hosted manifest
2. five mastery checks matching the chosen first-slice concepts
3. no runtime loader
4. no evaluator code
5. no new eval framework

### Benefits

1. Produces MVP artifacts without expanding code.
2. Lets the verifier audit evidence quality before implementation.
3. Keeps product decisions visible and reversible.
4. Matches the orchestrator rule: implementation is delegated, but the first
   delegated implementation is still artifact/spec-level.

### Cost

The manifest/checks are not executable until a later worker implements loading
or evaluation behavior.

### Required Follow-Up If Chosen

1. Create a worker brief with owned scope limited to manifest/check fixture
   files.
2. Create a verifier brief focused on boundary, evidence, and check quality.
3. Only after verifier acceptance, delegate loader/evaluator implementation.

## Option B - Manifest Loader First

The first worker creates:

1. concrete manifest
2. runtime/eval loader support
3. tests for manifest parsing and path validation

### Benefits

1. Makes the manifest executable earlier.
2. Reduces drift between docs and runtime.
3. Forces schema precision.

### Cost

It creates code before mastery checks prove what the manifest must support. It
also risks pulling the orchestrator into implementation review before the
product contract is locked.

### Required Follow-Up If Chosen

1. Worker must own exact runtime/eval files.
2. Verifier must check tests, boundary validation, and no out-of-scope product
   behavior.
3. User must approve code mutation before delegation.

## Recommendation

Choose Option A.

Reason: the next unknown is evidence quality, not loader mechanics. The first
worker should produce manifest and mastery-check fixtures only, then a verifier
should decide whether they are strong enough to implement.

## Decision Status

Accepted: Option A.

The first worker creates manifest and mastery-check fixtures only. No loader,
evaluator, or product code belongs in this first worker slice.
