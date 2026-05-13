# Version Control Rules

These rules exist to keep this repository clean when multiple agents or humans
work in the same tree. Follow them before making code, docs, config, or test
changes.

## Before Editing

- Run `git status --short` before changing files.
- Treat every existing change as owned by the user or another agent unless the
  user explicitly says otherwise.
- Do not revert, delete, move, reformat, or reorder changes you did not make.
- If existing changes overlap the requested task, work around them or ask before
  changing them.
- Avoid `git add .` unless every changed file is yours and belongs to the same
  intent.

## While Editing

- Keep each work unit focused on one intent.
- Prefer small, reviewable slices over broad mixed changes.
- Separate documentation, code behavior, tests, and chores when they can stand
  alone.
- For a feature, prefer this order:
  1. minimal working skeleton
  2. behavior
  3. tests
  4. docs or follow-up cleanup
- Do not mix unrelated refactors with features or fixes.
- If a cleanup is needed before a feature, make it a separate `refactor` or
  `chore` change.

## How To Split Changes

- Split by intent first, not by file.
- If one file contains changes for multiple intents, use `git add -p` to stage
  only the hunks that belong together.
- If a hunk is still too broad, split the edit into smaller edits or use a Git UI
  that can stage selected lines.
- Use `git diff` to inspect unstaged changes before staging.
- Use `git diff --cached` to inspect staged changes before any commit.
- Use path-specific staging such as `git add docs/README.md` when only one path
  belongs to the current change.
- If a branch or task has grown too large, group commits by intent before
  opening a PR or handing off.

## Commit Types

Use Conventional Commit-style prefixes when committing:

- `docs`: documentation, specs, notes, README files.
- `feat`: new user-facing or runtime behavior.
- `fix`: bug fix.
- `refactor`: code restructuring with no behavior change.
- `test`: tests only.
- `chore`: tooling, config, dependency, or cleanup work that does not change
  product behavior.

Examples:

- `docs: add v0.1 version control rules`
- `feat(runtime): add artifact session creation`
- `fix(memory): persist answer evidence`
- `refactor(runtime): split question policy helpers`
- `test(runtime): cover declared uncertainty`
- `chore: add package metadata`

If a change fits more than one type, split it when reasonable.

## Before Finishing

- Run `git status --short` again.
- Confirm your final diff contains only files relevant to the requested task.
- Report any pre-existing changes that remain untouched.
- If you changed files and the user has asked for implementation, either commit
  the completed change or clearly state why it is intentionally left uncommitted.
- Do not push, rebase, squash, or amend unless the user explicitly asks.
- Do not create hooks, automation, or repo policy files unless requested.

## Current Repo Note

At the time these rules were created, this repo had no commits yet and already
contained untracked planning files:

- `agent-chat-1.md`
- `agent-chat-2.md`
- `docs/`

Treat those files as existing baseline work, not disposable noise.
