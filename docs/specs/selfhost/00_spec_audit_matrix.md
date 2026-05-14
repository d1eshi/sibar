# Self-Hosted Spec Audit Matrix

## Goal

Use this matrix to keep the self-hosted MVP focused on executable evidence.

The active MVP promise is:

```text
SIBI verifies local ownership over one concrete SIBAR flow using repo evidence,
user evidence, repair, issue candidates, re-evaluation, and readiness output.
```

The existing 10 specs remain foundation. This audit does not delete or rewrite
them. It decides which parts actively support the self-hosted MVP gate and which
parts should stay documented but inactive for now.

## Decision Rules

1. Keep a foundation spec when it supports the self-hosted loop.
2. Change a spec when it needs a tighter self-hosted contract.
3. Cut from active MVP when it does not produce manifest, mastery check,
   dataset, evaluator, benchmark report, or readiness evidence.
4. Do not count a spec as MVP-critical only because it is implemented.
5. Do not count UI as an MVP blocker unless it produces better evidence for the
   self-hosted evaluation loop.

## Audit Matrix

| Spec | Promise | Current spec coverage | Implementation coverage | Test/eval coverage | Produced evidence | Executable artifact produced | Keep/change/cut decision |
|---|---|---|---|---|---|---|---|
| `01_artifact_intake.md` | A real artifact enters SIBI inside an explicit boundary. | Strong foundation for artifact sessions, included paths, excluded paths, and learning goal. | Runtime artifact sessions exist through the v0.1 mission. | Runtime tests and validation contract cover bounded/resumable sessions. | Stored `ArtifactSession`, boundary rejection output. | Artifact session state. | Keep as foundation; add self-hosted manifest requirement in `01_selfhost_boundary.md`. |
| `02_concept_graph.md` | SIBI maps artifact evidence into concepts and flows. | Strong foundation, but broad enough to accept heuristic maps. | Runtime concept graph exists with evidence-cited nodes and edges. | Tests require graph nodes, flow edge, and citations. | `ConceptGraph` citations. | Concept graph payload. | Keep as foundation; self-hosted benchmark must test causal flow, not just cited nodes. |
| `03_learning_autopsy.md` | User attempts before explanation. | Supports reverse engineering loop. | Runtime autopsy step exists. | Tests cover bounded evidence and attempt-first prompt. | `AutopsyStep` with prompt and evidence. | Active autopsy step. | Keep as foundation; self-hosted checks must bind each prompt to a mastery operation. |
| `04_ownership_question_policy.md` | Questions evaluate ownership, not passive recall. | Supports question shape and evidence basis. | Runtime ownership questions exist. | Tests cover question count and evidence fields. | `RuntimeQuestion` evidence basis. | Ownership questions. | Keep as foundation; change self-hosted layer to require explain/trace/predict/modify/debug/transfer classification. |
| `05_gap_and_misconception_detection.md` | Gaps reflect mismatch between mental model and artifact. | Strong foundation for `LearningGap`; needs stricter user-plus-repo evidence gate. | Runtime gap detection exists. | Deterministic evals cover partial, wrong, uncertainty, boundary, and overconfident cases. | `LearningGap` with artifact and answer evidence. | Gap detection result. | Keep and tighten through `02_evaluation_contract.md`; no gap without both evidence sources. |
| `06_practice_challenges.md` | Gaps become repair practice. | Supports repair tasks and revisit timing. | Runtime practice challenge generation exists. | Tests cover challenge references and expected evidence. | `PracticeChallenge`. | Practice queue. | Keep as foundation; self-hosted layer must require re-evaluation prompt after repair. |
| `07_understanding_memory.md` | SIBI persists concept state, answers, gaps, and repairs. | Supports durable memory beyond chat history. | Runtime memory exists. | Tests cover reload and memory inspection. | Understanding memory state. | Persisted session memory. | Keep as foundation; self-hosted readiness cannot rely on memory without fresh evidence. |
| `08_readiness_export.md` | SIBI reports what the user is ready to inspect, explain, modify, or own. | Strong foundation for evidence-backed readiness. | Runtime readiness report exists. | Tests assert readiness claims cite evidence. | Readiness report and evidence index. | JSON/Markdown readiness report. | Keep as foundation; self-hosted layer constrains readiness to one slice, not whole repo. |
| `09_project_learning_agent.md` | A bounded model runner proposes candidate learning signals. | Correctly limits the model to candidates, not truth. | Runtime trace/eval support exists. | LLM runtime trace evals cover accepted/rejected signals. | `PedagogyTrace`, candidate signal validation. | Model trace report. | Keep as foundation support only; not an active MVP authority. The model cannot decide mastery, truth, gaps, or readiness. |
| `10_study_panel_ui.md` | A Swift study panel renders the Build-to-Learn session. | Useful product surface, but not required to prove self-hosted evaluation. | Swift panel/app work exists in the mission. | Swift tests and runtime snapshot tests exist. | Rendered study snapshot evidence. | Study panel UI. | Keep as foundation; cut from active self-hosted MVP blockers for now. |

## Current Diagnosis

The foundation track is broader than the current MVP objective. The repo already
contains implemented iteration work across runtime, agent, eval, and UI areas,
but implementation breadth is not the same as proof of the product promise.

The active self-hosted MVP should accept only work that strengthens this loop:

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

## Active Gate

New work must produce at least one of:

1. self-hosted manifest
2. mastery check
3. gold dataset case
4. evaluator behavior
5. benchmark report
6. readiness evidence

Work that does not produce one of those artifacts remains foundation or backlog,
even if it is useful later.

## Feature Outcome

This spec gives the team one map of the active MVP gate. A developer or reviewer
should be able to see which foundation specs are active, which executable specs
own each feature outcome, what coverage exists, and which outcome should be
improved next.

## Manual Harness

Use this spec during planning and manual review:

1. Pick one proposed feature or fix.
2. Confirm it strengthens an active self-hosted loop step.
3. Confirm it produces one accepted artifact: manifest, mastery check, gold
   case, evaluator behavior, benchmark report, or readiness evidence.
4. Confirm its iteration notes live in the self-hosted spec that owns the
   outcome.
5. Reject the work as backlog when it does not improve executable evidence.

## Eval Coverage

Current coverage:

1. `pnpm run eval:selfhost-pilot`
2. `pnpm run eval:selfhost-benchmark`
3. `pnpm test -- Tests/selfhost-pilot-evals.test.ts Tests/selfhost-benchmark.test.ts`
4. `pnpm run typecheck`

This spec is not itself an evaluator. It is the audit map that decides whether
new work belongs in the executable MVP gate.

## Iteration Log

### 2026-05-14: SDD living-spec standard

Input used:

- The self-hosted execution-layer handoff.
- The current five self-hosted specs.
- The foundation spec index in `docs/specs/README.md`.

Expected outcome:

- A developer can tell that foundation specs are conceptual contracts and
  self-hosted specs are executable MVP specs.

Actual outcome:

- The SDD routing is documented in the foundation README.
- Each self-hosted spec now owns a feature outcome, harness, coverage, log,
  acceptance gate, and next iteration.

What worked:

- The existing self-hosted specs already map cleanly to the MVP loop.
- No new `selfhost/features` directory was needed.

What failed or remains weak:

- The audit still reports deterministic coverage, not freeform user-answer
  behavior.
- The generic chat baseline is specified but not yet executable.

Coverage added or missing:

- Added documentation coverage for SDD reading and iteration rules.
- Missing automated coverage that enforces presence of living-spec sections.

Decision:

- Keep the five self-hosted specs as the initial executable spec set.
- Add new specs only when a feature has independent outcome, I/O, manual
  harness, and eval gate.

## Acceptance Gate

This audit map is MVP-ready when:

1. every active self-hosted feature maps to one live spec
2. every live spec names its user outcome and next iteration
3. every completed iteration links to eval coverage or explicitly marks the gap
4. no feature work lands only as untracked notes outside self-hosted specs

## Next Iteration

Add a lightweight documentation check that fails when any self-hosted spec lacks
the standard living-spec sections. Keep it docs-only unless the team decides to
enforce the check through `pnpm test`.
