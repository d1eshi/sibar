# Iteration 03: Swift Bridge Core

## Goal

Copy and adapt the minimum Swift bridge from `sibar-agent` into `/Users/d1eshi/projects/startup/sibar` after the runtime moat audit trimmed the TypeScript command surface.

Swift is a native surface candidate. It is not the v0.1 moat and must not own runtime state.

## Bridge Decision

The bridge is thin:

```text
Swift UI later
  -> Codable command payloads
  -> RuntimeClient process call
  -> TypeScript runtime owns session/question/evidence state
  -> Swift renders returned data only
```

## Source Scope

Use only these source candidates:

1. `sibar-agent/Sources/SibiCore/RuntimeClient.swift`
2. `sibar-agent/Sources/SibiCore/RuntimeModels.swift`
3. `sibar-agent/Tests/SibiCoreTests/RuntimeClientTests.swift`

Everything else remains out of scope for this iteration.

## Implemented Local Scope

Create/adapt only:

1. `Package.swift`
2. `Sources/SibiCore/RuntimeClient.swift`
3. `Sources/SibiCore/RuntimeModels.swift`
4. `Tests/SibiCoreTests/RuntimeClientTests.swift`
5. `.gitignore` entries for SwiftPM build output

## Runtime Commands To Bridge

Expose exactly these Swift methods:

1. `declareIntent` -> `declare_intent`
2. `prepareCodeQuestion` -> `prepare_code_question`
3. `generateQuestions` -> `generate_questions`
4. `answerQuestion` -> `answer_question`
5. `getSessionSummary` -> `get_session_summary`

Do not expose notes, resource capture, reading, code review, shell, UI, or observer commands in `SibiCore`.

## Explicit Exclusions

Do not copy in this iteration:

1. `SibiShell`
2. `SibiShellKit`
3. `ShellView`
4. `OverlayPanelController`
5. `CodeSpotlightController`
6. AppKit shell code
7. SwiftUI shell tests
8. spotlight/OCR behavior
9. app bundle scripts
10. macOS permission flows

These are surface work. They need a separate shell/panel spec because the source shell still depends on notes, reading, and code-review-plan commands that the runtime moat audit removed from the foundation.

## Required Audit Output

Update:

```text
docs/triage/swift-bridge-candidate-audit.md
```

It must capture:

1. what was copied into the local repo
2. which source Swift pieces were kept, adapted, or dropped
3. the exact five-command bridge contract
4. why TypeScript remains the state owner
5. what ShellKit/panel/observer code can be considered later

## Non-Goals

1. No Swift UI.
2. No AppKit app target.
3. No shell launch.
4. No spotlight/OCR.
5. No notes, reading, resource, or code-review-plan bridge.
6. No Swift-side persistence.
7. No Swift-side queues, readiness, memory, concept extraction, or question generation.

Queue, memory, readiness, scheduling, artifact maps, concept extraction, and system state belong in TypeScript or a future Rust runtime.

## Acceptance Criteria

This iteration is complete when:

1. `SibiCore` compiles as a Swift package target.
2. Swift exposes only the five foundation runtime methods.
3. Swift tests prove envelope decoding, runtime error decoding, command strings, path resolution, and model decoding.
4. At least one Swift test calls the real TypeScript runtime through `RuntimeClient`.
5. `npm test` passes.
6. `npm run typecheck` passes.
7. `swift test` passes.
8. `docs/triage/swift-bridge-candidate-audit.md` reflects implementation status and next shell/panel boundaries.
