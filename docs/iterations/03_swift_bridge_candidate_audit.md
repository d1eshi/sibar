# Iteration 03: Swift Bridge Candidate Audit

## Goal

Evaluate the minimum Swift bridge needed later, without copying Swift code in this iteration.

Swift is a native surface candidate. It is not the v0.1 moat.

## Bridge Decision

The desired bridge is thin:

```text
Swift UI later
  -> Codable command payloads
  -> RuntimeClient process call
  -> TypeScript runtime owns session/question/evidence state
  -> Swift renders returned data only
```

## Candidate Scope

Only these source files may be considered for a future port:

1. `sibar-agent/Sources/SibiCore/RuntimeClient.swift`
2. `sibar-agent/Sources/SibiCore/RuntimeModels.swift`
3. `sibar-agent/Tests/SibiCoreTests/RuntimeClientTests.swift`

Everything else is out of scope until after the TS runtime passes the moat audit.

## Explicit Exclusions

Do not copy or audit for implementation yet:

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

These may be useful later, but they are surface work, not the first bridge.

## Required Output

Create a bridge review artifact:

```text
docs/triage/swift-bridge-candidate-audit.md
```

It must answer:

1. Which TS runtime commands need Swift payload/result models for v0.1?
2. Which current Swift models are still aligned with the copied runtime?
3. Which current Swift models are old observer/shell baggage?
4. Can `RuntimeClient` remain a process bridge, or does it need a smaller interface?
5. What exact files should be copied if/when Swift bridge work starts?
6. What tests would prove the bridge without launching a UI?

## Default Candidate Commands

For the first Swift bridge, prefer only:

1. `declare_intent`
2. `prepare_code_question`
3. `answer_question`
4. `get_session_summary`

Add `prepare_reading_question` only if the runtime moat audit keeps it as supporting/foundation.

Do not include notes, capture resource, code review, or shell commands in the first Swift bridge unless the audit proves they are needed.

## Non-Goals

1. No Swift code copy.
2. No Package.swift creation.
3. No UI.
4. No `swift build`.
5. No app bundle.
6. No runtime protocol redesign beyond audit recommendations.

## Acceptance Criteria

This iteration is complete when:

1. `docs/triage/swift-bridge-candidate-audit.md` exists.
2. It names the exact Swift files allowed for the later bridge slice.
3. It names the exact runtime commands to bridge.
4. It explicitly keeps TypeScript as the state owner.
5. It excludes shell/UI until after the runtime moat audit.

