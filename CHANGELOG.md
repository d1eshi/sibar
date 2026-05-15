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
- Swift `SibiCore` process bridge for the five foundation TypeScript runtime
  commands, with tests and no shell/UI state ownership.
- F06 runtime `generate_practice_challenges` command that turns detected learning
  gaps into evidence-backed repair practice with revisit timing.
- F08 runtime `readiness_report` command that exports evidence-backed readiness
  reports as JSON and Markdown.
- Standalone SwiftUI `SibiStudyApp` host for live runtime-owned study panel
  snapshots and answer submission.
- Floating `NSPanel` study surface with collapsible mode and Graph + Code canvas
  rendered from runtime-owned snapshots.
- Local article workspace prototype for URL-based reader extraction, atomic
  highlight capture, and per-article notes stored in the browser.
- First self-hosted freeform evaluator slice for artifact-boundary ownership
  answers, with CLI/report output for readiness, evidence, flow, false-confidence,
  and design-induced findings.

### Changed

- Article workspace note capture now uses tab-style note kinds and supports
  keyboard capture with Tab and Command/Control+Enter.
- Article workspace URL reads now use server-side cache, public URL validation,
  request limits, fetch timeouts, and bounded response size for public launch.
- Article workspace now opens repeated article URLs from local storage with a
  visible saved-state flash before making another server request.
- Article workspace now includes a local recent-reading drawer for reopening the
  last articles and their saved notes.

### Fixed

- Article workspace history now excludes local demo articles and prunes any
  previously saved non-web entries.

### Docs

- Added the self-hosted SDD loop, clarifying foundation specs, executable MVP
  specs, harness artifacts, living-spec sections, and the first freeform answer
  evaluator iteration target.
- Added release readiness rules tied to completed specs, verified acceptance
  criteria, and explicit version bump decisions.
- Added the atomic commit to changelog bridge so agents know when a commit must
  update `CHANGELOG.md`.
- Added the Swift bridge candidate audit, narrowing the future native bridge to
  the five foundation runtime commands and keeping TypeScript as state owner.
- Mission docs: added the v0.1 Build-to-Learn mission pack covering specs 01-10, internal
  pedagogy evals, bounded LLM signal generation, and the Swift study panel UI.
- Mission docs: added mission orchestration rules for implementation/verifier agents, Codex
  model comparison evals, and dataset sizing research gates.
- Mission docs: added the standalone Swift app audit, iteration, and validation
  contract for the live study panel host.
- Mission docs: updated Study Panel UI to require an accessory `NSPanel` host
  and explicit Graph + Code canvas behavior.
- Updated the self-hosted evaluation contract with first freeform evaluator slice
  results, coverage status, and the next expansion target.

### Internal

- Added regression coverage and a saved report for the first five self-hosted
  freeform evaluator cases.

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
