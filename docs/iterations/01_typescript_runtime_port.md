# Iteration 01: TypeScript Runtime Port

## Goal

Copy the working TypeScript runtime from `sibar-agent` into `/Users/d1eshi/projects/startup/sibar` as the first executable foundation for v0.1.

The goal is not to redesign behavior. The goal is to preserve a tested runtime seed that already supports:

```text
declared intent
  -> bounded code or reading question
  -> answer capture
  -> learning signals
  -> session summary
```

## Governing Specs

Primary:

1. `docs/specs/01_artifact_intake.md`
2. `docs/specs/03_learning_autopsy.md`
3. `docs/specs/04_ownership_question_policy.md`
4. `docs/specs/05_gap_and_misconception_detection.md`
5. `docs/specs/07_understanding_memory.md`

Supporting:

1. `docs/specs/08_readiness_export.md`
2. `docs/triage/iteration-spec-adaptation.md`

## Source References

Port from `sibar-agent`:

1. `src/`
2. `Tests/runtime.test.ts`
3. `package.json`
4. `tsconfig.json`
5. `scripts/sibi-code-question`

Relevant source specs:

1. `sibar-agent/docs/iterations/report/2026-05-08-pedagogy-iteration.md`
2. `sibar-agent/docs/iterations/16_concept_layer_map_schema.md`
3. `sibar-agent/docs/iterations/27_code_range_question_core.md`
4. `sibar-agent/docs/iterations/30_reading_selection_questions.md`
5. `sibar-agent/docs/missions/sibar-agent-pedagogy-runtime/iterations/07_export_contract_alignment_mapping.md`

## Scope

1. Create a runnable Node/TypeScript package in `/Users/d1eshi/projects/startup/sibar`.
2. Copy the existing `src/` runtime.
3. Copy or adapt runtime tests.
4. Rewrite `tsconfig.json` so it is self-contained and does not depend on parent repo config.
5. Keep runtime storage local and explicit through `SIBI_RUNTIME_HOME`.
6. Preserve existing passing behavior before adding new product behavior.

## Non-Goals

1. No Swift shell.
2. No macOS observer.
3. No voice.
4. No OCR/screen capture.
5. No editor bridge.
6. No workspace/API sync.
7. No SQLite migration in this slice.
8. No new LLM dependency.

## Acceptance Criteria

From `/Users/d1eshi/projects/startup/sibar`:

1. `pnpm test` passes.
2. `pnpm run typecheck` passes.
3. `node --experimental-strip-types src/runtime.ts` accepts a `declare_intent` request over stdin.
4. A temporary-file `prepare_code_question` request succeeds and returns one question.
5. `answer_question` persists evidence into the selected `SIBI_RUNTIME_HOME`.
6. No command needs files outside `/Users/d1eshi/projects/startup/sibar` except the user-selected artifact path.

## Verification Commands

```sh
pnpm install
pnpm test
pnpm run typecheck
printf '%s' '{"command":"declare_intent","payload":{"project_label":"sibi","statement":"Validate the TypeScript runtime boundary.","uncertainty":"Need to prove STDIO command execution works."}}' \
  | SIBI_RUNTIME_HOME=/tmp/sibi-runtime-port node --experimental-strip-types src/runtime.ts
```

## Implementation Result

Completed in this slice:

1. Copied `src/`, `Tests/runtime.test.ts`, `scripts/sibi-code-question`, `package.json`, and `tsconfig.json`.
2. Rewrote `package.json` for the clean `sibi` package name and self-contained runtime/test/typecheck scripts.
3. Rewrote `tsconfig.json` so it no longer extends the source repository config.
4. Adapted `prepare_code_review` to review the copied TypeScript runtime boundary instead of old shell/sidecar files.
5. Adapted `scripts/sibi-code-question` so JSON stdout works without requiring a native shell target.
6. Removed `swift-shell` from runtime session tool metadata.
7. Created `pnpm-lock.yaml` through `pnpm install`.

## Verification Log

Passed from `/Users/d1eshi/projects/startup/sibar`:

1. `pnpm install`
2. `pnpm test`
3. `pnpm run typecheck`
4. STDIO smoke with `SIBI_RUNTIME_HOME=/tmp/sibi-runtime-port`

Smoke coverage:

1. `declare_intent` created a session.
2. `generate_questions` returned one ownership question.
3. `prepare_code_question` worked against a temporary TypeScript file.
4. `answer_question` persisted answer evidence into `/tmp/sibi-runtime-port/runtime-state.json`.
5. `prepare_reading_question` kept the Socratic reading loop working.
6. `get_session_summary` returned `ready_for_review`.

## Expected Follow-Up

After the port passes, the next iteration should audit product naming and session language from `sibar-agent`/observer terms into Build-to-Learn terms:

1. `ArtifactSession`
2. `AutopsyStep`
3. `LearningGap`
4. `PracticeChallenge`
5. `ReadinessReport`

Do not rename everything during the port. First make it run.
