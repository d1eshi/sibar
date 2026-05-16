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

### Product Presentation Releases

These are preview-oriented product slices, not tagged SemVer releases yet. They
exist to make the public reader story reviewable before production promotion.

#### Presentation Slice 2 - Focused Reader Visual Iteration

- Moved the chosen source-ingestion direction into the real `/web` product
  surface instead of leaving it only in docs prototypes.
- Made `/` the final product route, with `/article-workspace.html` kept only as a
  compatibility redirect.
- Split the deploy surface into static HTML, CSS, and modular browser JavaScript
  so the reader can keep iterating without React, SSR, or a build step.
- Reframed the demo copy as a Sibar manifesto for deep knowledge, source contact,
  and resisting fully summarized consumption.
- Added demo-only color marks for highlight, question, and idea so the first read
  shows the capture language without creating saved notes.
- Refined saved-note UX with a header count, temporary save toast, slide-out
  drawer, click-outside dismissal, reader scroll lock, and shortcut hint.

#### Presentation Slice 1 - Public Reader Foundation

- Created the isolated `/web` deploy surface for the article reader, including
  static HTML and the self-contained `/api/read` Vercel Function.
- Added public URL extraction with validation, private-network blocking,
  bounded fetch behavior, response limits, and short server cache controls.
- Added browser-local reader persistence for notes and recent reading history
  without login or profile-backed storage.
- Added aggregate-only Vercel Web Analytics boundaries for the public reader.
- Added regression coverage for the web deploy surface, reader UI contracts,
  duplicate URL recovery, history filtering, analytics privacy, and API guards.

### Added

- Browser early access signup for the public reader, backed by a server-side
  waitlist endpoint that collects only email plus optional X handle without
  exposing Supabase secrets to the client.
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
- Isolated `/web` deploy surface for the article workspace, with static HTML and
  a self-contained Vercel `/api/read` function.
- Vercel Web Analytics page-view tracking for the article workspace, limited to
  aggregate page analytics.
- First self-hosted freeform evaluator slice for artifact-boundary ownership
  answers, with CLI/report output for readiness, evidence, flow, false-confidence,
  and design-induced findings.

### Changed

- Article workspace note capture now uses tab-style note kinds and supports
  keyboard capture with Tab and Command/Control+Enter.
- Article workspace URL reads now use server-side cache, public URL validation,
  request limits, fetch timeouts, and bounded response size for public launch.
- Article workspace now opens repeated article URLs from local browser state with a
  visible saved-state flash before making another server request.
- Article workspace now includes a local recent-reading drawer for reopening the
  last articles and their saved notes.
- Article workspace reader state is now browser-local for the public demo:
  `localStorage` persistence, no export button, and a capped Learning Log.
- Article workspace now opens with a clearer reader presentation around
  evidence-first learning and atomic notes.
- Article workspace demo files moved from `docs/demo` into root-level `/web`
  so the public reader can deploy without the TypeScript runtime or sidecar.
- Web reader now serves from `/` in the deploy surface, with the public HTML,
  styles, and browser behavior split across `web/index.html`, `web/styles`, and
  `web/scripts` for product iteration.
- Web reader now applies the focused source-ingestion visual direction to the
  real `/web` product surface instead of leaving it only in docs prototypes.

### Fixed

- Article workspace presentation copy now lives outside the selectable reader
  article, so only article text participates in highlight capture.
- Article workspace desktop layout now keeps the reader, session drawer, and
  Learning Log as independent scroll areas.
- Article workspace history now excludes local demo articles and prunes any
  previously saved non-web entries.

### Docs

- Added the web reader source-ingestion iteration with focused-reader mockups
  and a functional coded prototype for first open, loading, reading, and saved
  states.
- Added the self-hosted SDD loop, clarifying foundation specs, executable MVP
  specs, harness artifacts, living-spec sections, and the first freeform answer
  evaluator iteration target.
- Replaced the external prototype review-tooling standard with a repo-owned
  prototype rule for local routes, product UI, fixtures, and static captures.
- Added the public demo prototype spec that packages the self-hosted execution
  layer into a fixture-based web demo for external feedback.
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
- Documented article reader persistence sequencing: use browser-local notes
  first, treat `localStorage` as a bridge, and wait for profiles before
  durable cross-device note memory.
- Added article reader analytics research covering Vercel Analytics, cookie
  expectations, consent boundaries, and future observer events.

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
