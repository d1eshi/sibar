# Agent Rules

Treat this repository as a shared workspace and keep every change intentional.

## Scope

- Prefer acting when the request is clear; ask only when ambiguity blocks safe work.
- Keep scope narrow and solve the requested task before adjacent cleanup.
- Inspect relevant files and existing patterns before editing.
- Choose the smallest reversible change that satisfies the task.
- Prefer Spanish for conversation unless the user, code, or docs call for English.

## Git

- Run `git status --short` before editing and before finishing.
- Treat existing changes as user-owned unless the user says otherwise.
- Do not revert, delete, move, reformat, or reorder work you did not make.
- Avoid `git add .` unless every changed file is yours and one intent.
- Split changes by intent; stage with explicit paths or `git add -p`.
- Inspect `git diff` before staging and `git diff --cached` before committing.
- Use Conventional Commit prefixes: `docs`, `feat`, `fix`, `refactor`, `test`, `chore`.
- Do not push, rebase, squash, or amend unless the user explicitly asks.

## Editing

- Separate behavior, tests, docs, config, and chores when they can stand alone.
- For features, work in order: skeleton, behavior, tests, docs.
- Follow existing project conventions before adding new structure.
- Add abstractions only when they remove real complexity or match local patterns.
- Do not create hooks, automation, policy files, or process files unless requested.

## Agent Harness

- Use a parent/worker/verifier harness when the user asks or the task merits it.
- Confirm harness mode and model mix with the user before switching workflows.
- The parent owns reading, investigating, orchestrating, delegating, reviewing, integrating, staging/committing, and reporting.
- The parent is not allowed to create or edit code/docs/tests/config files directly. If those files need changes, delegate to implementation workers.
- In harness mode, the parent can run read-only inspection, validation, git, staging, and commit/reporting commands.
- Implementation workers own bounded changes and should not revert unrelated user-owned edits.
- Use default model `gpt-5.3-codex-spark` for implementation workers.
- Verification workers check output against task, specs, code, and repo rules.
- Verifier must be `gpt-5.2` with `high` reasoning.
- If the requested model, tool, or role is unavailable, release threads and retry; use a fallback only after explicit user confirmation.
- Repeat implement-verify until no blockers remain, the user stops, or input is needed.

## Changelog

- Update `CHANGELOG.md` when behavior, demos, commands, specs, release readiness, or product narrative changes.
- Skip changelog updates for purely mechanical tests, refactors, or chores.
- Map `feat` to Added or Changed, `fix` to Fixed, `docs` to Docs, and release-relevant internals to Internal.

## Completion

- Run the smallest meaningful verification command available.
- For large implementations touching multiple layers/files/dependencies/tests/docs, split by intent (for example runtime/core, endpoint/adapters, UI, tests, docs/changelog, chores) and avoid monolithic commits.
- Stage paths explicitly per commit and check `git diff --cached` before each commit.
- Do not mix unrelated pre-existing or untracked changes in the same commit.
- Confirm the final diff contains only task-relevant changes.
- Report changed files, verification, remaining uncertainty, and untouched pre-existing changes.
- Commit completed implementation work, or state why it is intentionally uncommitted.
- If paused or blocked, leave a handoff with goal, files, done, remaining, verification, and risks.

## Baseline

- Treat pre-existing planning files such as `agent-chat-*.md` and `docs/` as baseline work.
