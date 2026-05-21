# v0.1 Iteration Queue

The active implementation contract now lives under `docs/specs/selfhost/` for self-hosted
MVP execution.

This file remains historical context for the cleanup and early runtime/Swift
bridge slices.

This queue originally turned the first 8 foundation specs into a launchable
v0.1. The mission pack extends that queue with evals, a bounded
project-learning agent, and the Swift study panel. Active self-hosted MVP
docs now route to `docs/specs/selfhost/`, while eval assets route to
`evals/attempt-readiness/` and review prototypes route to
`prototypes/attempt-readiness/`.

The queue is intentionally small. Do not add surface integrations before the Build-to-Learn loop works.

## Iteration 0: Clean Foundation

Status: complete in this cleanup pass.

Output:

1. product foundation
2. moat statement
3. v0.1 scope
4. 8 foundation specs
5. source triage

## Iteration 1: TypeScript Runtime Port

Status: complete.

Specs: 01, 03, 04, 05, 07

Port the working TypeScript runtime from `sibar-agent/src` as a runnable, tested seed before changing behavior.

Spec:

`01_typescript_runtime_port.md`

Verification:

1. `pnpm test` passes
2. `pnpm run typecheck` passes
3. runtime stdin command works for `declare_intent`
4. temporary-file `prepare_code_question` works

## Iteration 2: Runtime Moat Audit

Specs: 01, 03, 04, 05, 07, 08

Review the copied TypeScript runtime against the moat before adding new behavior.

Spec:

`02_runtime_moat_audit.md`

Verification:

1. every copied command is classified as `foundation`, `supporting`, `later`, or `drop`
2. every copied module is classified
3. `pnpm test` passes
4. `pnpm run typecheck` passes

## Iteration 3: Swift Bridge Core

Status: complete.

Specs: 03, 04, 07

Copy and adapt only the minimum `SibiCore` process bridge after the TS runtime audit.

Spec:

`03_swift_bridge_candidate_audit.md`

Verification:

1. `SibiCore` exposes only the five foundation commands
2. Swift tests call the real TypeScript runtime once
3. `swift test` passes
4. shell/UI/AppKit are explicitly excluded

## Iteration 4: Artifact Session Prototype

Status: blocked until Iteration 2 finishes.

Specs: 01

Build the minimum flow to create an artifact session with a label, goal, root path, included paths, and excluded paths.

Verification:

1. create one session
2. inspect stored session
3. confirm path boundary is respected

## Iteration 5: Concept Graph Seed

Specs: 02

Create a small human-readable concept graph from the chosen artifact.

Verification:

1. at least 5 concept nodes
2. at least 1 important flow
3. every node cites source evidence

## Iteration 6: Autopsy Step

Specs: 03, 04

Run one guided reverse-engineering step where the user predicts before Sibi explains.

Verification:

1. show bounded evidence
2. ask one ownership question
3. store answer
4. produce next action

## Iteration 7: Gap Detection

Specs: 05

Compare the user's answer to artifact evidence and produce one learning gap or confirmed concept state.

Verification:

1. detected gap includes concept, severity, confidence, evidence, and repair action
2. "I don't know" becomes uncertainty evidence, not failure

## Iteration 8: Challenge And Memory

Specs: 06, 07

Create one practice challenge and persist understanding memory across session resume.

Verification:

1. challenge is tied to a gap
2. memory shows answer history and next review
3. resumed session can continue from prior state

## Iteration 9: Readiness Report

Specs: 08

Generate a local readiness report with evidence-backed claims.

Verification:

1. report lists ready areas and risky areas
2. every claim cites evidence
3. report exports to Markdown or JSON

## Later Queue

Only after Iteration 9:

1. macOS observer shell
2. code range selection UI
3. reading fragment mode
4. editor bridge
5. voice capture
6. team onboarding
7. workspace/API sync
