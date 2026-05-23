# 05: Pedagogy Core Slice

## Inventory

Pedagogy-related source currently splits across these areas:

1. `engine/pedagogy-core/index.ts` is the intended shared boundary, but today it
   only re-exports `engine/pedagogy/core/loop` and `engine/pedagogy/core/attempt-evaluation`.
2. `engine/pedagogy/core/attempt-evaluation*` captures user attempts, checks cited
   evidence, classifies gaps, and is already operation/evidence scoped.
3. `engine/pedagogy/core/loop*` owns gap creation, repair actions,
   prerequisite routes, reevaluation prompts, readiness claims, misconception
   memory, and the full attempt-to-readiness loop.
4. `engine/pedagogy/core/evidence-types.ts` and
   `engine/pedagogy/core/loop-types.ts` own the pure contracts for evidence,
   operations, attempts, gaps, repairs, readiness, and loop state.
5. `engine/pedagogy/*` owns the older layer/signal/question pipeline used by
   runtime commands, store types, and `pedagogoai` exports.
6. `engine/pedagogoai/*` is a product/runtime facade: tracks, readiness, gap
   repair, recall, source-to-roadmap, and workspace-intent projection.
7. `engine/workspace/source-mission/*`, `engine/article-workspace*`, and
   `engine/pedagogoai/workspace-intent*` are source/workspace planning adapters,
   not pedagogy core.

## Real Incongruences

1. `pedagogy-core` is named as the core but does not yet export the older
   `engine/pedagogy/*` layer/question policy that still drives
   `runtime-questions`, `runtime-support`, `store`, and the coverage eval.
2. `engine/pedagogy/*` is called "Sibi Pedagogy Layer Module" but mixes generic
   layer detection with runtime-facing `DeclaredWorkIntent`,
   `OwnershipQuestion`, and session summary contracts.
3. The attempt evaluation and loop internals now live under
   `engine/pedagogy/core/`, but `pedagogoai` facades still create additional
   public paths around the same concepts.
4. `pedagogoai/readiness-mastery.ts` and `pedagogoai/gap-repair.ts` re-export
   core loop pieces directly, creating a second public path around the same
   concepts.
5. Source-to-workspace planning is duplicated between
   `engine/workspace/source-mission/contracts.ts` (`MissionPreview`) and
   `pedagogoai/workspace-intent*` (`WorkspacePlan`, `SessionPlan`,
   `EvidencePlan`). That duplication is runtime/product projection, not a
   reason to create another pedagogy taxonomy.

## Decision

`engine/pedagogy-core/` should become the single reusable core boundary. It should
own the mission session attempt/evidence/readiness loop, exposed first by
re-exporting or wrapping existing deterministic modules:

1. attempt capture/evaluation from `engine/pedagogy/core/attempt-evaluation*`,
2. loop orchestration from `engine/pedagogy/core/loop*`,
3. pure deep-ownership evidence/loop/intelligence types needed by those
   modules.

`engine/pedagogy/*` remains legacy layer/question policy initially. It may be
re-exported for compatibility or adapted behind `engine/pedagogy-core/`, but it is
not the primary mission session semantics until its runtime-shaped
`DeclaredWorkIntent`, `OwnershipQuestion`, and session summary types are split
from the layer/question policy.

It should leave outside core:

1. URL fetching, HTML extraction, filesystem, git, shell, Tauri, DOM, stores,
   and model runners,
2. Mission/Track/Session UI projection and source-intent compilation,
3. `pedagogoai` track facades and Rust/compiler adapters,
4. persistence details such as `engine/persistence/signal-store.ts`, `engine/persistence/state.ts`, and
   workspace session commands.

Legacy entrypoints, if reintroduced for compatibility, should remain thin
re-exports until imports and tests move.

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
  source_signal_ids[]
  source_slice_refs[]
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

The planning contract must distinguish `source_signal_ids` from
`source_slice_refs`. Current `ProposedSession.source_slice_refs` is validated as
"source signal refs" in code, so the bridge must normalize that field
explicitly until the contract is corrected. Normalization rules:

1. if a ref resolves to a `SourceSlice.slice_id`, keep it in
   `source_slice_refs`;
2. if a ref resolves to a `SourceSignal.id`, move it to `source_signal_ids` and
   derive or look up the owning slice;
3. if a ref resolves to neither, block session creation with a validation
   issue.

## Mission Session Bridge

Add an executable adapter contract outside core, for example
`MissionSessionBridge`, that maps a reviewed `MissionPreview` and selected
`ProposedSession` into the existing loop objects:

```text
MissionSessionBridgeInput
  mission_preview
  proposed_session
  source_signals[]
  source_slices[]
  source_intake
  user_reason

MissionSessionBridgeOutput
  session_seed
  concept_slice
  user_operation
  thinking_artifacts[1..3]
  evidence_inventory[]
  pedagogy_input
  diagnostics[]
```

Required mappings:

1. `ProposedSession.id` -> stable `session_seed.session_id`,
   `ConceptSlice.id`, `UserOperation.id`, and artifact id prefixes.
2. `ProposedSession.operation` -> `UserOperation.kind`; unsupported mission
   verbs map through an explicit adapter table or block validation.
3. `ProposedSession.recommended_artifacts` -> one to three
   `ThinkingArtifact` records with matching `artifact_ids`.
4. `SourceSlice.excerpt_ref` and resolved `SourceSignal.source_excerpt_ref` ->
   `EvidenceInventoryEntry` records and `EvidenceRef` values.
5. session/artifact `success_criteria` -> `UserOperation.success_criteria` and
   `ThinkingArtifact.success_criteria`; no executable session may omit both.
6. `PedagogyInput` contains the `session_seed`, the later `UserAttempt`, cited
   evidence ids, and optional memory before calling `evaluateAttempt` and
   `attemptToReadiness`.

The executable order is:

```text
MissionPreview + ProposedSession
  -> MissionSessionBridgeOutput
  -> UserAttempt
  -> evaluateAttempt({ attempt, operation, artifact, evidenceInventory })
  -> attemptToReadiness({ attempt, evalOutput, operation, artifact, conceptSlice, evidenceInventory })
```

The bridge is an adapter/compiler contract, not pedagogy core. Core consumes
`UserOperation`, `ThinkingArtifact`, `EvidenceInventoryEntry`, `ConceptSlice`,
and `UserAttempt`; it does not know about source URLs, previews, queue caps, or
mission UI.

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
11. Evidence identity is stable: ids in inventory, artifact refs, attempts,
    checks, gaps, repairs, and readiness must refer to the same evidence across
    the session.
12. Evidence must be inside the declared inventory and artifact boundary; cited
    evidence outside that set blocks readiness or routes to boundary expansion.
13. Anti-overwhelm is split by boundary: compiler/projection owns queue caps and
    visible session selection; pedagogy core owns session, artifact, evidence,
    attempt, gap, repair, and readiness gates.

## Code Slices

1. Spec/contract bridge: add the executable bridge contract and validation from
   `MissionPreview`/`ProposedSession` to `SessionSeed`, `ConceptSlice`,
   `UserOperation`, `ThinkingArtifact`, `EvidenceInventoryEntry`, and
   `PedagogyInput`. Include tests for signal-vs-slice normalization and stable
   evidence ids.
2. Facade cleanup: make `engine/pedagogy-core/index.ts` export the mission
   attempt/evidence/readiness surface from `engine/pedagogy/core/attempt-evaluation`,
   `engine/pedagogy/core/loop`, and pure deep-ownership contracts without moving
   files.
3. Contract split: extract or adapter-wrap runtime-shaped `DeclaredWorkIntent`,
   `OwnershipQuestion`, and session summary types out of `engine/pedagogy/*` or
   keep them as legacy layer/question policy until runtime-shaped types are
   separated.
4. Import migration: move internal imports in runtime and `pedagogoai` facades
   from `engine/pedagogy/core/loop` and `engine/pedagogy/core/attempt-evaluation` to
   `engine/pedagogy-core`; migrate `engine/pedagogy/*` imports only where the legacy
   adapter contract is explicit.
5. Validation gate: add tests/evals that a generic article fixture and the
   frontier-lab fixture both produce sessions through the same contract with no
   URL-specific core branch.
6. Shim retirement: after imports are stable, move pure files under
   `engine/pedagogy-core/` and leave legacy entrypoints as thin re-exports.

Do not schedule UI work before the bridge can produce an executable
`evaluateAttempt` -> `attemptToReadiness` path from a reviewed
`MissionPreview`.

## Files Read

1. `AGENTS.md`
2. `docs/specs/deep-ownership-workspace/README.md`
3. `docs/specs/deep-ownership-workspace/01_source_to_mission_mvp.md`
4. `docs/specs/deep-ownership-workspace/02_runtime_boundary.md`
5. `docs/specs/deep-ownership-workspace/03_validation_and_plan.md`
6. `docs/specs/deep-ownership-workspace/04_shared_core_boundaries.md`
7. `sibi/docs/specs/sibi-ownership-workbench/03_runtime_evidence_contract.md`
8. `engine/pedagogy-core/index.ts`
9. `engine/pedagogy/index.ts`
10. `engine/pedagogy/pipeline.ts`
11. `engine/pedagogy/core/loop.ts`
12. `engine/pedagogy/core/loop/types.ts`
13. `engine/pedagogy/core/loop/pipeline.ts`
14. `engine/pedagogy/core/attempt-evaluation.ts`
15. `engine/runtime-deep-ownership.ts`
16. `engine/workspace/source-mission/contracts.ts`
17. `engine/workspace/source-mission/validate.ts`
18. `engine/workspace/session/contracts.ts`
19. `engine/article-workspace.ts`
20. `engine/article-workspace-server.ts`
21. `engine/pedagogoai/contracts.ts`
22. `engine/pedagogoai/source-to-roadmap-session.ts`
23. `engine/pedagogoai/tracks/deep-ownership.ts`
24. `engine/pedagogoai/workspace-intent.ts`
25. `engine/pedagogoai/workspace-intent-types.ts`
26. `engine/pedagogoai/workspace-intent-runtime.js`
27. `engine/pedagogoai/workspace-intent/contracts.ts`
28. `engine/pedagogoai/workspace-intent/validate.ts`
29. `engine/pedagogoai/workspace-intent/fixtures.ts`
30. `engine/pedagogoai/readiness-mastery.ts`
31. `engine/pedagogoai/gap-repair.ts`
32. `engine/persistence/signal-store.ts`
33. `engine/runtime-support.ts`
34. `engine/runtime-questions.ts`
35. `engine/evals/pedagogy-core-coverage.ts`
36. `engine/evals/pedagogy-coverage.ts`
37. `engine/evals/shared-core-boundaries.ts`

## File Changed

1. `docs/specs/deep-ownership-workspace/05_pedagogy_core_slice.md`
