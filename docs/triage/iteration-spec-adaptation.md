# Iteration Spec Adaptation

This pass maps the useful specs from `sibar-agent` into the cleaned Sibi v0.1 moat.

Requested source path note: `sibar-agent/docs/plans/iterations` does not exist in the inspected worktree. The closest active sources are:

1. `sibar-agent/docs/iterations/`
2. `sibar-agent/docs/iterations/report/`
3. `sibar-agent/docs/missions/sibar-agent-pedagogy-runtime/iterations/`

## Decision Filter

A source spec survives only if it helps the v0.1 wedge:

```text
real artifact
  -> explicit bounded context
  -> user predicts/explains first
  -> Sibi detects gap/misconception
  -> Sibi stores evidence
  -> Sibi emits practice/readiness
```

Specs that mainly improve ambient observation, desktop feel, voice, editor automation, or sync are parked until the loop above works.

## Keep And Adapt

| Source | Useful Signal | Adapted Destination | Decision |
|---|---|---|---|
| `docs/iterations/10_instructions_goal.md` | Cognitive debt framing, selection-aware review, Socratic non-answer, guided code reading, explanation capture, knowledge profile | Specs 01-08 | Extract product logic. Do not copy the full mini-IDE, voice-first scope, or sync ambition into v0.1. |
| `docs/iterations/report/2026-05-08-pedagogy-iteration.md` | Existing TS pedagogy layer, gap detection, answer verification, local store, commands | Specs 04, 05, 07 | Strongest implementation seed. Port the TS runtime and tests first. |
| `docs/iterations/15_declared_work_intent_capture.md` | Explicit user intent and uncertainty are first-class evidence | Specs 01, 03, 05 | Keep as artifact-session intent, not as macOS observer UI requirement. |
| `docs/iterations/16_concept_layer_map_schema.md` | L1-L5 concept state and signal history | Spec 07 | Keep the model. Start with TS JSON/JSONL store; defer SQLite schema until the runtime loop works. |
| `docs/iterations/27_code_range_question_core.md` | Bounded source selection -> one ownership question -> answer -> evidence | Specs 01, 03, 04, 05 | Directly aligned with moat. This is the best concrete primitive for v0.1. |
| `docs/iterations/30_reading_selection_questions.md` | Bounded reading fragment -> Socratic question -> answer evidence | Specs 03, 04, 07 | Keep as secondary mode. Useful for docs/papers/chats, but code artifact autopsy stays first. |
| `docs/missions/sibar-agent-pedagogy-runtime/iterations/07_export_contract_alignment_mapping.md` | Keep local export stable and map to reviewable contracts | Spec 08 | Keep the principle: local review first, bridge later. |
| `docs/missions/sibar-agent-pedagogy-runtime/iterations/08c_smooth_overlay_interaction_prototype.md` | One question at a time, explicit context, evidence behind "why this question?" | Specs 03, 04 | Keep UX principle. Do not build overlay/UI yet. |

## Keep As Supporting Background

| Source | Use Later For | Decision |
|---|---|---|
| `docs/iterations/17_package_core_shell_boundary.md` | Separating core runtime from UI shell | Useful engineering boundary. For now, port TS runtime as core-only. |
| `docs/iterations/25_shell_overlay_note_widget.md` and `docs/iterations/ui/26_liquid_glass_notes_widget.md` | Notes capture and small surface feel | The TS notes runtime can come along because it already exists, but notes are support, not the moat. |
| `docs/iterations/07_data_persistence_contract.md` | Future persistence hardening | Do not start with SQLite migration. Keep runtime portable first. |
| `docs/missions/sibar-agent-pedagogy-runtime/validation-contract.md` | Validation language: evidence-backed questions, local-only export, signals are candidates | Reuse assertions conceptually, not the whole mission pack. |

## Park For Later

| Source | Why Parked |
|---|---|
| `docs/iterations/06_observer_architecture.md` | macOS observer shell is not needed to prove Build-to-Learn. |
| `docs/iterations/08_capture_surface_spec.md` | UI surface spec, not core moat. |
| `docs/iterations/11_manual_resource_capture_observer.md` | Capturing links/resources is useful later, but artifact autopsy is sharper. |
| `docs/iterations/12_process_metadata_snapshot.md` | Process metadata cannot prove understanding. |
| `docs/iterations/13_process_signature_classifier.md` | Agent/tool detection is context only, not v0.1 foundation. |
| `docs/iterations/14_work_session_inference.md` | Work-session inference is useful later; v0.1 can use explicit artifact sessions. |
| `docs/iterations/18-22_shell_panel_open_safety*.md` | Shell QA, parked until UI returns. |
| `docs/iterations/23_voice_shell_and_permission_flow.md` | Voice lowers friction, but not needed before the evidence loop works. |
| `docs/iterations/24_voice_transcription_and_persistence.md` | Same as voice capture. |
| `docs/iterations/28_editor_spotlight_overlay.md` | OCR/screen spotlight adds permission complexity. |
| `docs/iterations/29_vim_neovim_selection_bridge.md` | Editor bridge comes after explicit path/range flow. |
| mission GUI validation iterations | Heavy GUI evidence workflow; not needed for TS runtime seed. |

## Runtime Port Candidate

The current TS runtime should be moved as the first code seed because it already implements the core evidence loop.

Port:

1. `src/`
2. `Tests/runtime.test.ts`
3. `package.json`
4. `tsconfig.json`, but rewrite it to be local to `/Users/d1eshi/projects/startup/sibar`
5. `scripts/sibi-code-question` only if keeping the current runtime test unchanged

Do not port first:

1. `Sources/`
2. Swift shell code
3. Swift tests
4. app bundle scripts except as later UI background

## Current Runtime Capabilities

Verified in source worktree:

1. `npm test` passes: 16 tests.
2. `npm run typecheck` passes.
3. Runtime command `declare_intent` returns a valid session.

Implemented commands include:

1. `declare_intent`
2. `generate_questions`
3. `answer_question`
4. `prepare_code_question`
5. `prepare_code_review`
6. `prepare_reading_question`
7. `capture_resource`
8. `get_session_summary`
9. `start_note`
10. `append_note`
11. `get_active_note`
12. `list_notes`

## Port Risks

1. `tsconfig.json` currently extends `../tsconfig.base.json`; that parent file should not be required in the clean repo.
2. `tsconfig.json` includes `tests/**/*.ts`, but the actual folder is `Tests/`; the port should include `Tests/**/*.ts` too.
3. `prepare_code_review` is currently tailored to the Swift/TypeScript sidecar bridge and hardcoded source paths. Keep it as a supported legacy command or mark it later.
4. `src/store.ts` is JSON/JSONL-based, not SQLite. That is acceptable for v0.1 seed but should be named honestly.
5. The runtime defaults to `~/.sibar`; port tests and docs should prefer `SIBI_RUNTIME_HOME` to avoid mutating personal state.
6. The runtime relies on Node's `--experimental-strip-types`; the clean repo should document the required Node version and command.

## Adapted Product Meaning

The runtime should no longer be framed as a macOS observer sidecar.

In `/startup/sibar`, it becomes:

> the local Build-to-Learn runtime that prepares artifact questions, stores answers as evidence, detects gaps, and exposes session summaries.

The first copied runtime does not need to be perfect. It only needs to preserve the working loop and become testable in the clean repo.

