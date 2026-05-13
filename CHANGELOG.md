# Changelog

All notable product changes for Sibi should be recorded here.

This changelog is written for humans first. It follows the spirit of Keep a
Changelog and uses SemVer-style versions, but Sibi version bumps are decided by
accepted specs and iterations, not by raw commit count.

## Unreleased

Use this section for changes that have landed but are not part of a tagged
release yet.

Each changelog-worthy change should be updated in the same commit as the work it
describes. Skip this file only when the commit is purely mechanical and does not
change product behavior, product docs, release readiness, or the public product
story.

### Added

- Spec-based versioning policy for deciding when Sibi moves between pre-1.0
  versions.
- Changelog source of truth for future web-facing product progress updates.

### Changed

- Nothing yet.

### Fixed

- Nothing yet.

### Docs

- Added release readiness rules tied to completed specs, verified acceptance
  criteria, and explicit version bump decisions.
- Added the atomic commit to changelog bridge so agents know when a commit must
  update `CHANGELOG.md`.
- Added the Swift bridge candidate audit, narrowing the future native bridge to
  the five foundation runtime commands and keeping TypeScript as state owner.

### Internal

- Nothing yet.

## Release Format

Each release should use this shape:

```md
## v0.1.0 - YYYY-MM-DD

Short product narrative: what became true for the user in this release.

### Added

- New user-facing capabilities.

### Changed

- Changes to existing behavior.

### Fixed

- Bug fixes.

### Docs

- Product, spec, or README changes.

### Internal

- Tooling, tests, refactors, and maintenance work.
```

Do not invent release dates. Move entries from `Unreleased` into a versioned
section only when that version is accepted and tagged.
