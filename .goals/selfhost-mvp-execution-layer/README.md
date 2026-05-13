# Self-Hosted MVP Execution Layer Goal

## Objective

Cumplir el Self-Hosted MVP Execution Layer de SIBI/SIBAR paso a paso desde
`docs/specs/README.md`.

El objetivo operativo es demostrar este loop:

```text
manifest
  -> mastery check
  -> user answer
  -> evidence-backed gap
  -> repair
  -> issue candidate
  -> re-evaluation
  -> readiness report
```

## Orchestration Rule

The main assistant is the orchestrator only.

The orchestrator may:

1. read and audit repo state
2. discuss decisions with the user
3. prepare worker and verifier briefs in chat
4. delegate work slices and wait for worker/verifier reports
5. request worker-owned follow-up if a file mutation is required

The orchestrator must not:

1. write files directly (specs, goal artifacts, or any repo files)
2. create product code directly
3. silently expand scope
4. implement slices assigned to workers
5. accept readiness claims without evidence
6. convert an incongruence into a decision without user discussion
7. assume any out-of-scope write is safe because it is "small" or "obvious"

## Agent Protocol

Implementation slices should be delegated to workers using:

```text
model: gpt-5.3-codex-spark
role: worker
```

Each worker brief must include:

1. exact slice objective
2. owned files or directories
3. files/directories not to touch
4. expected output artifact
5. tests or checks to run
6. instruction not to revert or overwrite unrelated work

Use `worker_brief_template.md` for worker delegation.

Each implemented slice should be reviewed by a verifier using:

```text
model: gpt-5.2
reasoning_effort: high
role: verifier
```

Each verifier brief must ask for:

1. contract compliance
2. evidence quality
3. mismatch against self-hosted specs
4. missing tests or benchmark coverage
5. false confidence risks
6. recommendation: accept, revise, or discuss

Use `verifier_brief_template.md` for verifier delegation.

## Active Source Of Truth

The active execution gate is:

1. `docs/specs/README.md`
2. `docs/specs/selfhost/00_spec_audit_matrix.md`
3. `docs/specs/selfhost/01_selfhost_boundary.md`
4. `docs/specs/selfhost/02_evaluation_contract.md`
5. `docs/specs/selfhost/03_product_improvement_loop.md`
6. `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md`

Foundation specs remain valid background, but they do not automatically justify
new work unless the work produces one of the MVP artifacts.

## MVP Artifact Gate

New work must produce at least one of:

1. manifest
2. mastery check
3. dataset
4. evaluator
5. benchmark report
6. readiness evidence

Work that does not produce one of those artifacts is backlog unless the user
explicitly changes the goal.

## Initial Sequential Plan

1. Audit current self-hosted docs against `docs/specs/README.md`. Done in `001_selfhost_spec_audit.md`.
2. Resolve any incongruence with the user. Done: first slice uses `Repair practice generation`; see D003.
3. Create the first manifest spec or concrete `sibar.selfhost.manifest.json`. Done and verifier accepted; see `010_verifier_result_manifest_mastery_fixtures.md`.
4. Create five mastery checks for the initial concepts. Done and verifier accepted; see `010_verifier_result_manifest_mastery_fixtures.md`.
5. Create a 40-case gold dataset plan. Next.
6. Delegate evaluator implementation to a worker.
7. Delegate verifier review for the evaluator slice.
8. Iterate benchmark/report loop.

Completion audit status is tracked in `007_completion_audit.md`.

## Pending Decisions

No open decisions block the first worker brief.

The accepted packet is:

```text
A + root manifest + fixtures first + selfhost-pilot
```

See `006_confirmation_packet.md`.

## Decision Log

### D001 - Keep foundations, add self-hosted execution gate

Decision: Preserve the 10 foundation specs and add a stricter self-hosted MVP
layer under `docs/specs/selfhost/`.

Reason: Existing specs and mission work are useful, but too broad to prove the
current MVP promise by themselves.

### D002 - Orchestrator does not write product code

Decision: The main assistant orchestrates and discusses. Product code slices are
delegated to workers. Verification is delegated separately.

Reason: The goal now requires controlled iteration, explicit ownership, and
independent verification per slice.

### D003 - First slice stays deterministic

Decision: Use `Repair practice generation` as the fifth first-slice concept and
defer `Model signal validation` to a second benchmark wave.

Reason: The MVP must first prove the deterministic user-evidence loop:
gap detection, repair, re-evaluation, and readiness. Model candidate signal
validation is important support behavior, but it should not expand the first
slice before the hard evidence contract is proven.

### D004 - First manifest lives at repo root

Decision: The first concrete manifest should be `sibar.selfhost.manifest.json`
at repo root.

Reason: The manifest is an MVP artifact, not only a docs example. Root placement
makes later runtime/eval loading straightforward.

### D005 - First worker produces fixtures only

Decision: The first worker creates the manifest and mastery-check fixtures only.
No loader, evaluator, or product code belongs in the first worker slice.

Reason: The immediate risk is evidence quality. Loader/evaluator implementation
should wait until a verifier accepts the manifest and checks.

### D006 - Pilot dataset stays separate from missions

Decision: The self-hosted pilot artifacts should live under
`docs/specs/selfhost/pilot/`.

Reason: The user rejected using `docs/missions/` for these artifacts. Keeping
them under `docs/specs/selfhost/pilot/` makes the active MVP evidence visible
next to the governing selfhost specs.

### D007 - Keep docs/missions ignored

Decision: Do not use or unignore `docs/missions/` for selfhost MVP artifacts.

Reason: `docs/missions/` remains scratch/ignored space. Active selfhost MVP
artifacts live in `docs/specs/selfhost/pilot/`.

### D008 - Orchestrator write-protocol correction (2026-05-13)

Decision: From this point forward, the orchestrator may read/audit/chat/spawn/wait
only. All repository writes (goal log, specs, and artifacts) are done only by
workers, then reviewed by a verifier slice before being considered active.

Reason: This enforces non-overlapping ownership and prevents the orchestrator from
creating files directly. Historical direct writes from earlier in this goal
sequence are retained as history and must not be repeated.

### D009 - Defer src/evals defaults (2026-05-13)

Decision: `src/evals/*` defaults under `docs/missions/...` are legacy/current
eval-runner defaults and are intentionally unchanged in this self-hosted MVP slice.

Reason: Those defaults belong to the existing eval runner and are owned by a
future evaluator-integration worker. They are non-selfhost for now and must not
be treated as active self-hosted destination paths.
