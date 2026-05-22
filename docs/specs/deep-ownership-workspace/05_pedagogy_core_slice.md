# 05: Pedagogy Core Slice

## Inventory

Pedagogy-related source currently splits across these areas:

1. `src/pedagogy-core/index.ts` is the intended shared boundary, but today it
   only re-exports `runtime-pedagogy-loop` and `runtime-attempt-evaluation`.
2. `src/runtime-attempt-evaluation*` captures user attempts, checks cited
   evidence, classifies gaps, and is already operation/evidence scoped.
3. `src/runtime-pedagogy-loop*` owns gap creation, repair actions,
   prerequisite routes, reevaluation prompts, readiness claims, misconception
   memory, and the full attempt-to-readiness loop.
4. `src/runtime-deep-ownership-*-types.ts` owns the pure contracts for evidence,
   operations, attempts, gaps, repairs, readiness, and loop state.
5. `src/pedagogy/*` owns the older layer/signal/question pipeline used by
   runtime commands, store types, and `pedagogoai` exports.
6. `src/pedagogoai/*` is a product/runtime facade: tracks, readiness, gap
   repair, recall, source-to-roadmap, and workspace-intent projection.
7. `src/runtime-source-mission-*`, `src/article-workspace*`, and
   `src/pedagogoai/workspace-intent*` are source/workspace planning adapters,
   not pedagogy core.

## Real Incongruences

1. `pedagogy-core` is named as the core but does not yet export the older
   `src/pedagogy/*` layer/question policy that still drives
   `runtime-questions`, `runtime-support`, `store`, and the coverage eval.
2. `src/pedagogy/*` is called "Sibi Pedagogy Layer Module" but mixes generic
   layer detection with runtime-facing `DeclaredWorkIntent`,
   `OwnershipQuestion`, and session summary contracts.
3. `runtime-pedagogy-loop` is a runtime-named module, but its internals are the
   actual deterministic core for attempts, evidence, gaps, repairs, readiness,
   routes, and misconception memory.
4. `pedagogoai/readiness-mastery.ts` and `pedagogoai/gap-repair.ts` re-export
   core loop pieces directly, creating a second public path around the same
   concepts.
5. Source-to-workspace planning is duplicated between
   `runtime-source-mission-contracts.ts` (`MissionPreview`) and
   `pedagogoai/workspace-intent*` (`WorkspacePlan`, `SessionPlan`,
   `EvidencePlan`). That duplication is runtime/product projection, not a
   reason to create another pedagogy taxonomy.

## Decision

`src/pedagogy-core/` should become the single reusable core boundary. It should
absorb by export and then gradual move:

1. attempt capture/evaluation from `src/runtime-attempt-evaluation*`,
2. loop orchestration from `src/runtime-pedagogy-loop*`,
3. pure deep-ownership evidence/loop/intelligence types needed by those
   modules,
4. generic layer/question policy from `src/pedagogy/*`, after renaming its
   runtime-shaped contracts or placing them behind compatibility exports.

It should leave outside core:

1. URL fetching, HTML extraction, filesystem, git, shell, Tauri, DOM, stores,
   and model runners,
2. Mission/Track/Session UI projection and source-intent compilation,
3. `pedagogoai` track facades and Rust/compiler adapters,
4. persistence details such as `src/store.ts`, `src/runtime-state.ts`, and
   workspace session commands.

Legacy entrypoints (`src/runtime-pedagogy-loop.ts`,
`src/runtime-attempt-evaluation.ts`, `src/pedagogy/index.ts`) should remain
compatibility shims until imports and tests move.

## Minimum Blog-To-Session Contract

A URL/blog must enter pedagogy through source-neutral records, not through
hardcoded blog names:

```text
SourceIntake
  source_id
  source_kind
  canonical_url?
  title?
  readable_text_ref
  diagnostics[]

SourceSlice
  slice_id
  source_id
  label
  excerpt_ref
  source_signal_ids[]

SessionSeed
  session_id
  track_id
  source_slice_ids[]
  operation: explain | trace | derive | predict | implement | test | benchmark | modify
  required_artifacts[1..3]
  required_evidence[]
  success_criteria[]
  prerequisite_note?
  status: now | next | later | locked

PedagogyInput
  session_seed
  user_attempt
  cited_evidence[]
  existing_memory?
```

For the frontier-lab blog, JAX tutorials, the scaling book, transformer work,
Chinchilla derivation, and Pallas kernels are just `SourceSignal` and
`SourceSlice` records. The core never branches on that URL; adapters may provide
a fixture that emits those records.

## Global Pedagogy Rules

1. Attempt-first: no readiness from passive reading, source extraction, or model
   explanation alone.
2. Evidence-grounded: every gap, repair, readiness claim, and artifact
   requirement cites source/session evidence or is explicitly unsupported.
3. Operation-scoped: readiness is only for the active operation, never the whole
   blog, mission, repo, or career goal.
4. Artifact-scoped: sessions require one to three concrete artifacts or evidence
   outputs tied to source slices.
5. Anti-overwhelm: primary queue shows current session, one or two next
   sessions, and at most one recovery/prerequisite route.
6. Closed taxonomy: new gap kinds, operations, readiness statuses, or artifact
   kinds require tests/evals and migration notes.
7. Repair with return condition: every repair says which original operation it
   returns to and what evidence clears it.
8. Misconceptions accumulate evidence; repeated gaps are not overwritten.
9. Recall and transfer are separate from local success.
10. Raw model output must pass parse, schema, source/evidence, and pedagogy
    validation before projection.

## Code Slices

1. Facade cleanup: make `src/pedagogy-core/index.ts` export the actual public
   core surface, including layer/question policy, without moving files.
2. Import migration: move internal imports in runtime and `pedagogoai` facades
   from `src/pedagogy/*`, `runtime-pedagogy-loop`, and
   `runtime-attempt-evaluation` to `src/pedagogy-core`.
3. Contract split: extract runtime-shaped `DeclaredWorkIntent`,
   `OwnershipQuestion`, and session summary types out of `src/pedagogy/*` or
   alias them through core compatibility exports.
4. Source bridge: add a mapper from `SourceSignal`/`ProposedSession` or
   `WorkspacePlan` into `SessionSeed`/`PedagogyInput`; keep the mapper in an
   adapter module outside core.
5. Validation gate: add tests/evals that a generic article fixture and the
   frontier-lab fixture both produce sessions through the same contract with no
   URL-specific core branch.
6. Shim retirement: after imports are stable, move pure files under
   `src/pedagogy-core/` and leave legacy entrypoints as thin re-exports.

## Files Read

1. `AGENTS.md`
2. `docs/specs/deep-ownership-workspace/README.md`
3. `docs/specs/deep-ownership-workspace/01_source_to_mission_mvp.md`
4. `docs/specs/deep-ownership-workspace/02_runtime_boundary.md`
5. `docs/specs/deep-ownership-workspace/03_validation_and_plan.md`
6. `docs/specs/deep-ownership-workspace/04_shared_core_boundaries.md`
7. `sibi/docs/specs/sibi-ownership-workbench/03_runtime_evidence_contract.md`
8. `src/pedagogy-core/index.ts`
9. `src/pedagogy/index.ts`
10. `src/pedagogy/pipeline.ts`
11. `src/runtime-pedagogy-loop.ts`
12. `src/runtime-pedagogy-loop/types.ts`
13. `src/runtime-pedagogy-loop/pipeline.ts`
14. `src/runtime-attempt-evaluation.ts`
15. `src/runtime-deep-ownership.ts`
16. `src/runtime-source-mission-contracts.ts`
17. `src/runtime-source-mission-validate.ts`
18. `src/runtime-workspace-session-contracts.ts`
19. `src/article-workspace.ts`
20. `src/article-workspace-server.ts`
21. `src/pedagogoai/contracts.ts`
22. `src/pedagogoai/source-to-roadmap-session.ts`
23. `src/pedagogoai/tracks/deep-ownership.ts`
24. `src/pedagogoai/workspace-intent.ts`
25. `src/pedagogoai/workspace-intent-types.ts`
26. `src/pedagogoai/workspace-intent-runtime.js`
27. `src/pedagogoai/workspace-intent/contracts.ts`
28. `src/pedagogoai/workspace-intent/validate.ts`
29. `src/pedagogoai/workspace-intent/fixtures.ts`
30. `src/pedagogoai/readiness-mastery.ts`
31. `src/pedagogoai/gap-repair.ts`
32. `src/store.ts`
33. `src/runtime-support.ts`
34. `src/runtime-questions.ts`
35. `src/evals/pedagogy-core-coverage.ts`
36. `src/evals/pedagogy-coverage.ts`
37. `src/evals/shared-core-boundaries.ts`

## File Changed

1. `docs/specs/deep-ownership-workspace/05_pedagogy_core_slice.md`
