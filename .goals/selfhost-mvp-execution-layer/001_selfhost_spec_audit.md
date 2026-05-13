# 001 - Self-Hosted Spec Audit

## Purpose

Audit the current self-hosted docs against `docs/specs/README.md` and the active
MVP execution gate.

This is an orchestration artifact only. It does not implement product code.

## Source Files Reviewed

1. `docs/specs/README.md`
2. `docs/specs/selfhost/00_spec_audit_matrix.md`
3. `docs/specs/selfhost/01_selfhost_boundary.md`
4. `docs/specs/selfhost/02_evaluation_contract.md`
5. `docs/specs/selfhost/03_product_improvement_loop.md`
6. `docs/specs/selfhost/04_selfhost_gap_detection_benchmark.md`
7. `.goals/selfhost-mvp-execution-layer/README.md`

## Gate Check

The README defines the active MVP loop:

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

The self-hosted specs cover the loop at the contract level:

| Gate item | Current coverage | Status |
|---|---|---|
| manifest | `01_selfhost_boundary.md` requires `sibar.selfhost.manifest.json` | covered as spec, not created |
| mastery check | `02_evaluation_contract.md` defines `MasteryCheck` | covered as spec, no checks created |
| user answer | `02_evaluation_contract.md` requires user evidence | covered as spec |
| evidence-backed gap | `02_evaluation_contract.md` defines `GapFinding` hard rule | covered as spec |
| repair | `02_evaluation_contract.md` and `03_product_improvement_loop.md` define repair task | covered as spec |
| issue candidate | `03_product_improvement_loop.md` defines issue candidate types | covered as spec |
| re-evaluation | `02_evaluation_contract.md` and `03_product_improvement_loop.md` require reevaluation prompt | covered as spec |
| readiness report | README and evaluation contract constrain readiness | covered as spec |

## Verified Repo Facts

The boundary paths declared in `01_selfhost_boundary.md` currently exist:

1. `src/runtime-concept-graph.ts`
2. `src/runtime-gap-detection.ts`
3. `src/runtime-readiness.ts`
4. `src/runtime-practice.ts`
5. `src/runtime-memory.ts`
6. `src/runtime-support.ts`
7. `Tests/concept-graph.test.ts`
8. `Tests/gap-detection.test.ts`
9. `Tests/readiness-report.test.ts`
10. `Tests/practice-challenges.test.ts`

The repo also has model signal validation artifacts outside the current
self-hosted boundary:

1. `src/runtime-agent-validation.ts`
2. `src/runtime-agent.ts`
3. `src/runtime-agent-runner.ts`
4. `src/evals/llm-runtime-trace.ts`
5. `Tests/llm-runtime-trace-evals.test.ts`
6. `docs/specs/09_project_learning_agent.md`

## Findings

### F001 - Benchmark concept mismatch

`01_selfhost_boundary.md` lists the initial concepts as:

1. Artifact boundary
2. Concept graph generation
3. Gap detection
4. Repair practice generation
5. Readiness report generation

`04_selfhost_gap_detection_benchmark.md` lists the benchmark concepts as:

1. Artifact boundary
2. Concept graph generation
3. Gap detection
4. Readiness report generation
5. Model signal validation

This is an actual inconsistency. The fifth concept differs.

Impact: A worker could build mastery checks for repair practice while another
builds benchmark cases for model signal validation. That would fragment the
first MVP slice.

Recommended discussion: choose one first-slice fifth concept.

### F002 - Model signal validation is outside the declared boundary

If the fifth benchmark concept remains `Model signal validation`, the boundary
must include agent validation files and LLM trace tests. Today it does not.

Impact: The benchmark would require evidence from files the manifest would not
allow. That violates the self-hosted boundary rule.

Recommended discussion: either include model validation paths in the boundary or
move model signal validation to a later benchmark.

### F003 - Manifest location remains undecided

The goal log still has this pending decision:

```text
Whether `sibar.selfhost.manifest.json` should live at repo root or under
`docs/specs/selfhost/` until it becomes executable.
```

Impact: The first worker brief cannot be decision-complete until this is locked.

Recommended default: put the first concrete manifest at repo root if it will be
loaded by runtime/eval code; put draft examples under `docs/specs/selfhost/` only
if they are non-executable documentation.

### F004 - First worker slice is not yet decision-complete

The goal log still leaves open whether the first worker should:

1. implement a manifest loader, or
2. create manifest and mastery-check fixtures only.

Impact: Delegating now would either violate the orchestrator rule or force the
worker to make product decisions.

Recommended default: first worker should create manifest and mastery-check
fixtures only, then verifier audits evidence quality before code loaders are
introduced.

### F005 - Dataset placement remains undecided

The goal log still leaves open whether benchmark cases extend the existing
mission eval dataset or start as a separate self-hosted pilot dataset.

Impact: The dataset worker would not know whether to modify existing eval
contracts or isolate a pilot.

Recommended default: start as a separate self-hosted pilot dataset until the 40
cases prove the contract. Integrate with the existing mission eval framework only
after verifier acceptance.

## Proposed Next Decision

Resolve F001/F002 first because they determine the manifest boundary.

Options:

1. Keep the first slice focused on the deterministic learning loop:
   `artifact boundary`, `concept graph generation`, `gap detection`,
   `repair practice generation`, `readiness report generation`.
2. Expand the first slice to include model signal validation and add agent/LLM
   trace files to the manifest boundary.

Recommended option: 1.

Reason: It keeps the first MVP slice aligned with the hard evaluation loop and
avoids pulling model runner behavior into the first benchmark before the
deterministic user-evidence contract is proven.

## Status

Audit step is complete, but the goal should not advance to worker delegation
until the fifth concept/boundary decision is resolved with the user.
