# Iteration 02: Runtime Moat Audit

## Goal

Review only the TypeScript runtime copied in Iteration 01 and decide what belongs in the Sibi v0.1 foundation.

This is a strict audit gate. Do not add new product behavior in this iteration.

## Governing Docs

1. `docs/product/00_foundation.md`
2. `docs/product/01_moat.md`
3. `docs/product/02_v01_scope.md`
4. `docs/specs/README.md`
5. `docs/triage/iteration-spec-adaptation.md`

## Audit Scope

Audit these copied areas:

1. `src/runtime.ts`
2. `src/runtime-support.ts`
3. `src/runtime-state.ts`
4. `src/runtime-prepared-question.ts`
5. `src/code-selection.ts`
6. `src/reading-selection.ts`
7. `src/runtime-review-plan.ts`
8. `src/pedagogy/`
9. `src/store.ts`
10. `src/notes.ts`
11. `src/sibi.ts`
12. `Tests/runtime.test.ts`
13. `scripts/sibi-code-question`

## Classification Rules

Every command and copied file/module must be classified as one of:

1. `foundation` — directly supports the v0.1 Build-to-Learn loop.
2. `supporting` — useful runtime support, but not the moat itself.
3. `later` — useful future surface or integration work, but not needed for v0.1.
4. `drop` — should be removed or rewritten because it carries old product assumptions.

## Required Output

Create or update a review artifact:

```text
docs/triage/runtime-moat-audit.md
```

The artifact must include:

1. command classification table
2. file-by-file module classification table
3. foundation command set for v0.1
4. old observer/macOS language to rename later
5. tests that protect the moat
6. tests that only protect legacy behavior
7. recommended next iteration

## Decision Defaults

Expected starting classification:

| Runtime Piece | Default Classification | Reason |
|---|---|---|
| `prepare_code_question` | `foundation` | Bounded artifact context -> ownership question -> evidence. |
| `answer_question` | `foundation` | Converts user answer into evidence and signal history. |
| `generate_questions` | `foundation` | Existing gap-to-question pipeline. |
| `declare_intent` | `foundation` | Explicit goal and uncertainty. |
| `prepare_reading_question` | `supporting` | Same loop for docs/papers/chats, but code artifact autopsy is first. |
| `get_session_summary` | `supporting` | Needed for review/readiness later. |
| `capture_resource` | `later` | Useful learning input, but not central to artifact autopsy. |
| notes commands | `later` | Useful capture surface, not the core moat. |
| `prepare_code_review` | `later` or `drop` | Useful as a deterministic audit helper, but not core to the user-facing Build-to-Learn loop. |
| `scripts/sibi-code-question` | `supporting` | Helpful CLI bridge for explicit code selection. |

The audit may override these defaults, but must explain why.

## Non-Goals

1. No new runtime commands.
2. No Swift bridge work.
3. No UI work.
4. No SQLite migration.
5. No product renaming implementation.
6. No removal of copied files until the audit is complete.

## Verification

Before and after the audit artifact:

```sh
pnpm test
pnpm run typecheck
```

The runtime must remain executable while the audit is being written.

## Acceptance Criteria

This iteration is complete when:

1. `docs/triage/runtime-moat-audit.md` exists.
2. Every copied runtime command is classified.
3. Every copied runtime module is classified.
4. The next implementation slice is named.
5. `pnpm test` passes.
6. `pnpm run typecheck` passes.
