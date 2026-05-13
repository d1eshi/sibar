# 006 - Confirmation Packet

## Purpose

Collect the pending decisions into one confirmation packet so the next
orchestration step can proceed without hidden assumptions.

Protocol note (2026-05-13): this packet predates the worker-only write
correction. Active execution now requires that every file mutation comes from a
worker, then reviewed by a verifier; the orchestrator coordinates in chat only.

No decision in this packet is active until the user confirms it.

## Recommended Confirmation

```text
A + root manifest + fixtures first + selfhost-pilot
```

## What This Means

### A - Fifth Concept

Decision:

```text
Use `Repair practice generation` as the fifth first-slice concept.
Move `Model signal validation` to a second wave.
```

Files affected after confirmation:

1. `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md`
2. `.goals/selfhost-mvp-execution-layer/README.md`

Reason:

The first slice should prove the deterministic user-evidence loop before adding
model signal validation.

### root manifest

Decision:

```text
Create the first concrete manifest at repo root:
`sibar.selfhost.manifest.json`
```

Files affected after confirmation:

1. `sibar.selfhost.manifest.json`
2. worker brief for the manifest/mastery-check fixture slice

Reason:

The active MVP gate asks for a real manifest artifact, not only a docs example.

### fixtures first

Decision:

```text
The first worker creates manifest and mastery-check fixtures only.
No loader, evaluator, or product code in the first worker slice.
```

Files affected after confirmation:

1. worker brief for the first slice
2. verifier brief for the first slice

Reason:

The next risk is evidence quality. Loader/evaluator code should wait until the
manifest and checks are verified.

### selfhost-pilot

Decision:

```text
Create the pilot artifacts under:
`docs/specs/selfhost/pilot/`
```

Files affected after confirmation:

1. future dataset worker brief
2. future verifier brief
3. later integration plan if the pilot is accepted

Reason:

This keeps pilot benchmark evidence near the selfhost specs and outside the
ignored `docs/missions/` tree.

## Next Step After Confirmation

If the user confirms the recommended packet, the orchestrator should request a
worker-owned follow-up to perform the changes:

1. a worker updates `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md` to
   align the fifth concept with the boundary
2. a worker records the decisions in
   `.goals/selfhost-mvp-execution-layer/README.md`
3. a worker creates the first manifest and mastery-check fixture brief
4. only then spawn or assign a verifier for the delegated slice, if the user asks
   to proceed with delegation

## If User Rejects The Packet

If the user chooses a different path, update the relevant decision brief before
creating worker instructions.

Do not create manifest, mastery checks, dataset, or code until the affected
decision has been recorded.
