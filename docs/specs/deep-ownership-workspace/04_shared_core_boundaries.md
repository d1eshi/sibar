# 04: Shared Core Boundaries

## Goal

Define how Sibi and Sibar Workspace share ownership, pedagogy, and memory
without turning the source-driven mission MVP into multiple competing products.

The product split is:

```text
Sibi
  -> ownership review wedge for AI-assisted technical work

Sibar Workspace
  -> source/research surface for repairing ownership gaps through missions,
     tracks, sessions, and artifacts

Shared core
  -> deterministic contracts, gates, and memory used by both surfaces
```

`Cognitive debt` remains an internal thesis. The product-facing unit is an
ownership gap with evidence, scope, and a next action.

## Boundary Rules

1. Core modules are deterministic and do not import UI, DOM, Tauri, filesystem,
   git, shell execution, model runners, or app state.
2. Surfaces may import core. Core must not import surfaces.
3. Sibi may import ownership-core and later memory projections. Sibi must not
   import WorkspaceIntent, PedagogoAI workspace adapters, or research workspace
   UI code.
4. Sibar Workspace may consume ownership, pedagogy, and memory cores through
   adapters that project them into Mission, Track, Session, and Artifact UI.
5. Existing `runtime-*` entrypoints remain compatibility shims until imports and
   tests have moved. No destructive rename is allowed before a shim exists.
6. New core entrypoints should re-export or wrap existing contracts first. Do
   not create a second gap, readiness, evidence, or artifact taxonomy.

## Ownership Core

Ownership core answers:

```text
Given this AI-assisted change or technical artifact,
what does the human need to understand, verify, and prove before accepting it?
```

Initial scope:

1. deterministic diff, PR, or agent-output review,
2. touched areas and risk classification,
3. missing evidence and suggested tests,
4. ownership questions,
5. minimum read path,
6. status: `blocked | limited | ready`,
7. optional handoff artifact for opening a Workspace repair session.

Current source of truth to promote first:

1. `sibi/src/ownershipReview.ts`
2. `sibi/Tests/sibi-ownership-review.test.ts`

The first extraction should move this deterministic review logic into
`src/ownership-core/` and leave `sibi/src/ownershipReview.ts` as a shim. Do not
merge it immediately with deep-ownership `EvidenceRef` or `ArtifactBoundary`;
those contracts belong to the deeper loop and can be bridged later.

## Pedagogy Core

Pedagogy core answers:

```text
Given an operation, evidence, and a user attempt,
what gap exists, what repair is appropriate, and what readiness claim is valid?
```

It owns:

1. attempt-first behavior,
2. operation-scoped readiness,
3. artifact/source-scoped evidence checks,
4. gap taxonomy,
5. repair actions with return conditions,
6. misconception memory signals,
7. recall, retention, and transfer scheduling rules,
8. deterministic prerequisite routing when evidence is sufficient.

Current code already contains most of this logic:

1. `engine/pedagogy/*`
2. `engine/pedagogy/core/attempt-evaluation/*`
3. `engine/pedagogy/core/loop/*`
4. pure deep-ownership contracts in
   `engine/pedagogy/core/evidence-types.ts`,
   `engine/pedagogy/core/loop-types.ts`,
   `engine/runtime-deep-ownership-boundary.ts`, and
   `engine/runtime-deep-ownership-intelligence.ts`

The first implementation should create `engine/pedagogy-core/` as an API boundary
over existing logic. It should not introduce new versions of gap kinds,
readiness claims, evidence refs, or repair actions.

## Memory Core

Memory core answers:

```text
What has the human attempted, proven, missed, repaired, retained, and
transferred over time?
```

Unlike ownership and pedagogy, this durable store does not yet exist as a single
core. Current memory is split across runtime state, snapshots, projections, and
small append-only stores.

The target durable model is append-only:

```text
MemoryStore
  store_version
  subjects[]
  evidence_refs[]
  attempts[]
  outcomes[]
  gaps[]
  repairs[]
  misconceptions[]
  reviews[]
  transfers[]
  artifacts[]
  events[]
```

Rules:

1. Every attempt, outcome, gap, repair, misconception, review, and transfer
   references a subject.
2. Subjects are surface-neutral: concept, source slice, session, diff, PR,
   repo area, operation, or artifact.
3. Attempts and events are append-only.
4. Context snapshots and UI projections are derived read models, not durable
   truth.
5. Readiness and ownership claims must cite evidence or be marked unsupported.
6. Reviews and transfer checks are derived from confirmed outcomes and schedule
   policy, not from a global mastery score.

Initial implementation should add types and mappers only. Public commands should
continue to behave through existing runtime state until the store has passing
round-trip tests.

## Surfaces And Adapters

Surface-owned:

1. `sibi/`
2. `apps/sibar-research-workspace/`
3. `web/`

Adapter-owned:

1. filesystem and git inventory,
2. Tauri and DOM integration,
3. model runner execution,
4. Rust compiler bridge,
5. JSON state persistence,
6. mission/session UI projection.

Known adapter-heavy modules:

1. `engine/workspace/session/context.ts`
2. `engine/workspace/session/*`
3. `engine/persistence/state.ts`
4. `engine/persistence/signal-store.ts`
5. `engine/runtime-deep-ownership-study-artifacts.ts`
6. `engine/pedagogoai/workspace-compiler-runner.ts`
7. `apps/sibar-research-workspace/scripts/workspace-intent-adapter.js`

These modules may consume core, but they must not define the shared core
taxonomy.

## Handoff Contract

Sibi should hand off to Sibar Workspace through a neutral artifact, not through a
WorkspaceIntent import.

```text
OwnershipReviewArtifact
  artifact_id
  created_at
  source_kind: diff | pr | agent_output | code_selection
  review
  diff_text_ref?
  goal_context?
  areas_touched[]
  required_evidence[]
  read_path[]
  blocked_reasons[]
  suggested_workspace_seed?
```

Workspace adapters may transform this artifact into source-intent or mission
seed data. Sibi should remain usable without the Workspace surface.

## Global Gates

Every new feature that emits ownership, pedagogy, readiness, repair, or memory
output must preserve these gates:

1. Evidence-grounded: no gap, readiness claim, repair, artifact requirement, or
   challenge without cited evidence or an explicit unsupported state.
2. Attempt-first: no readiness claim from passive reading or model explanation
   alone.
3. Operation-scoped: readiness is tied to an operation such as explain, trace,
   derive, predict, implement, test, benchmark, or modify.
4. Artifact-scoped: claims are tied to a source slice, artifact, diff, PR, or
   repo area boundary.
5. No whole-mission or whole-repo ownership claim from one session or review.
6. Closed gap taxonomy: new gap kinds require tests and eval coverage.
7. Repair with return condition: every repair must state what original operation
   it returns to.
8. Misconception memory: repeated gaps accumulate durable evidence instead of
   being overwritten.
9. Recall and transfer are separate: local success does not imply retained or
   transferable ownership.
10. Raw model output is untrusted until parsed, schema-checked, evidence-checked,
    pedagogy-checked, and projected.

## Implementation Sequence

### Slice 1: Entry Boundaries

Create core entrypoints as wrappers or re-exports:

1. `src/ownership-core/index.ts`
2. `engine/pedagogy-core/index.ts`

Do not move logic yet. Do not delete legacy runtime entrypoints.

Verification:

```text
git diff --check
pnpm typecheck
pnpm test -- Tests/pedagogoai-architecture.test.ts
```

Add a small import-boundary test before relying on the new entrypoints.

### Slice 2: Ownership Review Extraction

Move deterministic Sibi ownership review logic into `src/ownership-core/` and
leave `sibi/src/ownershipReview.ts` as a compatibility shim.

Coordinate this slice with any active agent touching `sibi/`.

Verification:

```text
pnpm test -- sibi/Tests/sibi-ownership-review.test.ts
pnpm run sibi:build
```

### Slice 3: Pedagogy Core Facade

Promote existing deterministic pedagogy modules behind `engine/pedagogy-core/`.
Prefer aliases and re-exports before moving files.

Verification:

```text
pnpm test -- Tests/attempt-evidence-check/*.suite.ts
pnpm test -- Tests/pedagogy-loop/*.suite.ts
pnpm eval:pedagogy-core-coverage
```

### Slice 4: Memory Core Contract

Add `src/memory-core/` with event types, append helpers, and mappers from current
runtime structures. Do not change public commands in this slice.

Verification:

```text
pnpm test -- Tests/understanding-memory.test.ts
pnpm test -- Tests/readiness-report.test.ts
pnpm test -- Tests/workspace-snapshot.test.ts
```

Add a new round-trip test for events -> projection -> scoped readiness.

### Slice 5: Adapter Separation

Move host execution and persistence concerns behind adapter boundaries without
changing product behavior.

Verification:

```text
pnpm test -- Tests/pedagogoai-workspace-compiler-runner.test.ts
pnpm test -- Tests/sibar-research-workspace.test.ts
pnpm test -- Tests/source-mission-contracts.test.ts
```

## What Not To Prune Yet

Do not prune these until the corresponding core entrypoint, shim, and tests are
stable:

1. `engine/runtime-deep-ownership.ts`
2. `engine/pedagogy/core/loop.ts`
3. `engine/pedagogy/core/attempt-evaluation.ts`
4. `engine/memory/understanding-memory.ts`
5. `engine/persistence/state.ts`
6. `engine/persistence/signal-store.ts`
7. `engine/pedagogoai/index.ts`
8. `apps/sibar-research-workspace/scripts/workspace-intent-adapter.js`

The first goal is to make ownership, pedagogy, and memory boundaries explicit.
Poda comes after imports prove the boundaries are real.
