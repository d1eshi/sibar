# Product Slice: Ownership Workbench MVP

## Outcome

The user can open a bounded repo directory or pasted diff, inspect the touched
code quickly, and complete one attempt-first ownership loop over the riskiest
boundary.

The MVP proves one claim:

```text
After Sibi, the user can explain a real code change better than before.
```

## Primary User Story

```text
As a builder using AI-generated or unfamiliar code,
I want Sibi to show which boundary I do not own yet,
so I can prove, repair, and re-attempt ownership before accepting the work.
```

## First Supported Inputs

1. Pasted git diff or PR text.
2. Local fixture directory for dogfood, initially this repo's runtime surface.
3. Later: local repo path chosen by the user.

Do not start with live GitHub auth, arbitrary cloud repo ingestion, or background
watchers.

## MVP Flow

```text
1. User loads a diff or bounded directory.
2. Sibi builds deterministic context:
   files, line counts, imports/exports, touched paths, tests/docs near the files.
3. Sibi proposes 3-5 changed ownership boundaries.
4. Sibi selects the riskiest boundary by deterministic risk score.
5. Sibi asks the user to prove ownership with one focused prompt.
6. User submits an attempt.
7. Runtime + model judge diagnose gaps against evidence.
8. Sibi emits:
   ownership state,
   gap reason,
   smallest repair,
   return condition,
   debt delta label.
9. User re-attempts or marks unknown.
```

## Product Metrics

These are product labels first, not scientific claims:

- `Ownership Coverage`: changed boundaries with demonstrated ownership divided
  by changed boundaries in scope.
- `Cognitive Debt Delta`: whether the accepted code surface grew faster than
  demonstrated ownership.
- `Time to Ownership`: time until the user produces an acceptable explanation
  for a boundary.
- `Gap Recurrence`: whether the same misunderstanding appears again later.

## Readiness States

- `owned`: user demonstrated the required operation with evidence.
- `partial`: user understands purpose but missed contract, caller, evidence, or
  failure mode.
- `gap`: user answer revealed a specific misconception or missing boundary.
- `blocked`: prerequisite concept or adjacent boundary must be repaired first.
- `questionable`: evidence suggests the code may not be worth preserving.

No `owned` or `ready` state may be produced without a user attempt.

## Non-Goals

1. No answer-first explainer.
2. No whole-codebase ownership claim.
3. No custom multi-language AST.
4. No generic "ask anything" chat.
5. No automatic docs generator as the main product.
6. No team dashboard before the single-user ownership loop works.
7. No background filesystem monitoring.

## Acceptance Gate

The slice is acceptable when a reviewer can use one fixture diff and observe:

1. file tree with ownership states,
2. code or diff view,
3. boundary prompt,
4. user attempt capture,
5. gap diagnosis with evidence,
6. smallest repair,
7. updated ownership state,
8. no explain-first shortcut.
