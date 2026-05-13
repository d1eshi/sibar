# Runtime Moat Audit (Iteration 02)

This document is the audit artifact required by `docs/iterations/02_runtime_moat_audit.md`.

## Command classification table

| Runtime command | Classification | Keep for v0.1 foundation? | Why |
|---|---|---:|---|
| `declare_intent` | `foundation` | Yes | Starts a Build-to-Learn session with an explicit uncertainty + expected work area; writes initial evidence into local memory. |
| `prepare_code_question` | `foundation` | Yes | Creates a bounded artifact context (file + line range + excerpt) and forces an attempt-first ownership question. |
| `generate_questions` | `foundation` | Yes | Converts a declared intent + (currently minimal) concept state into ownership questions. |
| `answer_question` | `foundation` | Yes | Captures user answer as evidence and appends a learning signal to the session history. |
| `get_session_summary` | `supporting` | Yes | Needed to render / export the session evidence, but not moat logic by itself. |
| `prepare_reading_question` | `supporting` | No | Same attempt-first loop, but v0.1 foundation is anchored on code artifacts first. |
| `capture_resource` | `later` | No | Useful capture surface, but not required for the golden-path autopsy loop. |
| `prepare_code_review` | `later` | No | Deterministic self-review helper for this repo’s runtime; not part of the user-facing loop. |
| `start_note` | `later` | No | Continuous notes are helpful, but not the comprehension moat for v0.1. |
| `append_note` | `later` | No | Same as above. |
| `get_active_note` | `later` | No | Same as above. |
| `list_notes` | `later` | No | Same as above. |

## Module classification table (file-by-file)

Audit scope list from the iteration spec:

| Module | Classification | Action in foundations slice | Notes |
|---|---|---|---|
| `src/runtime.ts` | `foundation` | Keep, but reduce surface to foundation commands | Central command router + session orchestration.
| `src/runtime-support.ts` | `foundation` | Keep, but delete types only needed by dropped commands | Defines the runtime command envelope + shared types.
| `src/runtime-state.ts` | `supporting` | Keep | Minimal local persistence for sessions.
| `src/runtime-prepared-question.ts` | `foundation` | Keep, but delete reading/review-plan branches | Shared “prepare bounded question session” helper.
| `src/code-selection.ts` | `foundation` | Keep | Enforces bounded code context + safe file reads.
| `src/reading-selection.ts` | `supporting` | Dropped (deleted in foundations trim) | Only used by `prepare_reading_question`. |
| `src/runtime-review-plan.ts` | `later` | Dropped (deleted in foundations trim) | Only used by `prepare_code_review`. |
| `src/pedagogy/` | `foundation` | Keep | The question + layer rubric is the moat substrate. |
| `src/store.ts` | `foundation`/`supporting` | Keep only concept-map + signal-history primitives | Resource + notes storage were removed in the foundations trim. |
| `src/notes.ts` | `later` | Dropped (deleted in foundations trim) | Only used by note commands. |
| `src/sibi.ts` | `supporting` | Keep | Local CLI runner for the runtime.
| `Tests/runtime.test.ts` | `supporting` | Keep only tests that protect foundation commands | Remove tests that only protect dropped surfaces.
| `scripts/sibi-code-question` | `supporting` | Keep, but remove macOS `open` behavior | CLI helper for explicit code selection.

## Foundation command set for v0.1 (recommended)

Keep the runtime surface to:

- `declare_intent`
- `prepare_code_question`
- `generate_questions`
- `answer_question`
- `get_session_summary`

Everything else should be removed from `src/` for the foundation slice.

## Old observer/macOS language to rename later

Not blocking for this iteration, but should be renamed as part of product hard cuts:

- `src/pedagogy/pipeline.ts`: `LearningSignal.source` includes `"observer"` / `"process_inference"` (legacy ambient-observer framing).
- `src/pedagogy/signals.ts`: `EvidenceSource` includes `"observer_query"` and several observer-ish evidence sources.
- `scripts/sibi-code-question`: previously used macOS `open` as an optional side-effect; removed in the foundations trim.

## Tests

### Tests that protect the moat / foundation

Keep (or replace with equivalent coverage):

- session loop: `declare_intent` → `generate_questions` → `answer_question`
- `prepare_code_question` safety envelope (range validation, file safety, bounded context)
- `get_session_summary`
- `scripts/sibi-code-question` prints JSON `ok:true`

### Tests that only protect legacy / non-foundation behavior

Removed in the foundations trim:

- `capture_resource` tests
- notes tests (`append_note`, `start_note`, topic inference)
- `prepare_reading_question` tests
- `prepare_code_review` tests

## Recommended next iteration

`Iteration 03: Foundation memory + readiness skeleton`

Focus:

1. Update concept state when `answer_question` is verified/partial (persist into concept map).
2. Add a minimal `readiness_report` command (even if naive) that renders:
   - concepts touched
   - questions asked + answers
   - what is “ready” vs “needs work”
3. Keep persistence local (`~/.sibar/`).

---

## Foundation implementation status (what exists vs what does not)

This section is a *status snapshot* for v0.1 foundations.

### Implemented (present in `src/`)

- Bounded code selection normalization + safety checks (`src/code-selection.ts`).
- Session creation with explicit intent + uncertainty (`declare_intent`).
- Prepared Socratic ownership question for a code selection (`prepare_code_question`).
- Minimal gap → question generation (currently uses a simplified detected-layer heuristic) (`generate_questions`).
- Answer capture + session evidence append (`answer_question`).
- Local persistence of sessions (`src/runtime-state.ts`) and signal history append (`recordSignal`).
- CLI runner surfaces (`src/runtime.ts` STDIO runner, `src/sibi.ts`, `scripts/sibi-code-question`).

### Not implemented yet (foundation-required, but missing)

- Artifact intake + artifact map generation (golden path step 1–2).
- Concept extraction from the artifact (golden path step 3) — current `concept_map.json` is read, not built.
- Misconception detection beyond a single “answer quality” heuristic.
- Practice challenge assignment (golden path step 7).
- Readiness report output (golden path step 8) beyond `get_session_summary`.
- Memory decay / spaced recall scheduling (`docs/specs/07_understanding_memory.md`).

### Explicitly out-of-scope for foundations (deferred)

- Resource capture.
- Continuous notes.
- Reading-question loop.
- Deterministic code-review plan helper.
- Any macOS ambient observer / capture.
