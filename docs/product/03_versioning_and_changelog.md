# Versioning And Changelog

## Purpose

Sibi uses version numbers to communicate verified product progress, not commit
volume.

The changelog is the public story of what became true for the user. Source
control remains the audit trail, but the changelog should be curated and
readable by someone following product progress from the web.

## Version Policy

Sibi is pre-1.0, so `0.x.y` means the product is still changing quickly.

Use Git tags like `v0.1.0`. The semantic version itself is `0.1.0`.

### `v0.1.0`

Use `v0.1.0` for the first reproducible v0.1 baseline:

1. the Build-to-Learn golden path is runnable
2. the linked v0.1 specs are represented
3. acceptance criteria are verified
4. the release has a human-readable changelog entry

### Patch: `v0.1.x`

Use a patch bump for compatible improvements inside the same v0.1 promise:

1. bug fixes
2. docs or spec clarification
3. test coverage
4. small runtime improvements that do not change the product promise

Example:

```text
v0.1.0 -> v0.1.1
```

### Minor: `v0.2.0`

Use a minor bump when a new verified product capability lands beyond the current
baseline.

This should usually map to a completed spec or iteration milestone.

Example:

```text
v0.1.3 -> v0.2.0
```

### Major: `v1.0.0`

Do not use `v1.0.0` until Sibi has a stable public product contract that users
can reasonably depend on.

Before `v1.0.0`, breaking changes are allowed, but they must still be named in
the changelog when they affect users, demos, data, commands, or documented
workflows.

## Release Readiness

A release is ready only when all of these are true:

1. linked spec or iteration is complete
2. acceptance criteria are verified
3. version bump type is explicit: patch, minor, or major
4. `CHANGELOG.md` has a human-readable entry
5. any Git tag uses the `vX.Y.Z` form

Conventional Commits are useful for clean history and agent handoffs, but they
do not automatically decide Sibi's public product version.

## Atomic Commit Bridge

Every commit should have one intent. The changelog records only the intents that
matter to product progress.

Update `CHANGELOG.md` in the same commit when a change affects:

1. user-visible behavior
2. a demo or documented workflow
3. a product spec or accepted iteration
4. release readiness or confidence
5. the public product narrative used by the web

Skip `CHANGELOG.md` for purely mechanical internal changes unless they are
important for release confidence.

Use this mapping:

1. `feat` -> `Added` or `Changed`
2. `fix` -> `Fixed`
3. `docs` -> `Docs`
4. release-relevant `test`, `refactor`, or `chore` -> `Internal`

A behavior change that is too large to summarize in one changelog bullet should
be split into smaller commits or attached to a spec/iteration before release.

## Changelog Rules

Keep `CHANGELOG.md` as the source of truth.

Keep `Unreleased` at the top. Move entries into a versioned section only when a
release is accepted.

Use these groups:

1. `Added`
2. `Changed`
3. `Fixed`
4. `Docs`
5. `Internal`

The web can later render `CHANGELOG.md` directly or consume a derived JSON feed.
Do not create release automation until the manual process becomes repetitive.
